import { randomUUID } from "node:crypto";
import { config } from "./config.js";
import { bulkDocuments } from "./couchdb.js";
import { validateLogShieldDocument } from "./document-schema.js";

export async function aiRequest(path, options = {}) {
  const headers = {
    accept: "application/json",
    ...(options.headers || {}),
  };
  const body = options.body === undefined
    ? undefined
    : typeof options.body === "string"
      ? options.body
      : JSON.stringify(options.body);
  if (body && !headers["content-type"] && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${config.aiEngineUrl}${path}`, {
    method: options.method || "GET",
    headers,
    body,
  });
  const text = await response.text();
  const responseBody = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const message = responseBody?.detail || responseBody?.message || response.statusText;
    throw new AiEngineError(message, response.status, responseBody);
  }
  return responseBody;
}

export async function syncAiDashboard({ limit = 50 } = {}) {
  const dashboard = await aiRequest(`/summary/dashboard?limit=${encodeURIComponent(limit)}`);
  const now = new Date();
  const syncedAt = now.toISOString();
  const runId = `${now.getTime()}::${randomUUID()}`;

  const docs = [
    createAiRunSummaryDoc({ dashboard, runId, syncedAt }),
    ...dashboard.recommendations.top_critical.map((row, index) =>
      createAiRecommendationDoc({ row, index, runId, syncedAt })
    ),
    ...dashboard.anomalies.recent.map((row, index) =>
      createAiAnomalyDoc({ row, index, runId, syncedAt })
    ),
  ];

  docs.forEach(validateLogShieldDocument);
  const result = await bulkDocuments(docs);
  return {
    ok: true,
    run_id: runId,
    synced_at: syncedAt,
    counts: {
      docs: docs.length,
      recommendations: dashboard.recommendations.top_critical.length,
      anomalies: dashboard.anomalies.recent.length,
    },
    result,
  };
}

function createAiRunSummaryDoc({ dashboard, runId, syncedAt }) {
  return {
    _id: `ai_run_summary::${runId}`,
    type: "ai_run_summary",
    status: dashboard.status || "unknown",
    dataset: dashboard.dataset || {},
    forecasting: dashboard.forecasting || {},
    recommendation_counts: dashboard.recommendations?.risk_counts || {},
    anomaly_counts: dashboard.anomalies?.severity_counts || {},
    synced_at: syncedAt,
  };
}

function createAiRecommendationDoc({ row, index, runId, syncedAt }) {
  return {
    _id: `ai_recommendation::${runId}::${String(index).padStart(4, "0")}`,
    type: "ai_recommendation",
    run_id: runId,
    forecast_date: row.forecast_date,
    kib_bencana_id: row.kib_bencana_id,
    disaster_type: row.disaster_type,
    posko_id: row.posko_id,
    posko_name: row.posko_name,
    item_name: row.item_name,
    unit: row.unit,
    recommended_qty: numberValue(row.recommended_qty),
    shortage_qty: numberValue(row.shortage_qty),
    coverage_days: numberValue(row.coverage_days),
    risk_level: row.risk_level,
    priority_score: numberValue(row.priority_score),
    trust_score: numberValue(row.trust_score),
    rationale_chips: parseRationale(row.rationale_chips),
    synced_at: syncedAt,
  };
}

function createAiAnomalyDoc({ row, index, runId, syncedAt }) {
  return {
    _id: `ai_anomaly::${runId}::${String(index).padStart(4, "0")}`,
    type: "ai_anomaly",
    run_id: runId,
    date: row.date,
    kib_bencana_id: row.kib_bencana_id,
    disaster_type: row.disaster_type,
    posko_id: row.posko_id,
    posko_name: row.posko_name,
    item_name: row.item_name,
    unit: row.unit,
    anomaly_type: row.anomaly_type,
    severity: row.severity,
    score: numberValue(row.score),
    message: row.message,
    action_suggestion: row.action_suggestion,
    synced_at: syncedAt,
  };
}

function parseRationale(value) {
  if (!value) return [];
  return String(value)
    .split(" | ")
    .map((chip) => chip.trim())
    .filter(Boolean);
}

function numberValue(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

export class AiEngineError extends Error {
  constructor(message, statusCode, body) {
    super(message);
    this.name = "AiEngineError";
    this.statusCode = statusCode;
    this.body = body;
  }
}
