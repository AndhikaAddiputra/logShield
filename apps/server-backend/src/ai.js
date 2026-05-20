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

export function normalizeAiDashboardResponse(dashboard) {
  return {
    ...dashboard,
    recommendations: {
      ...(dashboard?.recommendations || {}),
      top_critical: (dashboard?.recommendations?.top_critical || []).map(normalizeRecommendationRow),
    },
    anomalies: {
      ...(dashboard?.anomalies || {}),
      recent: (dashboard?.anomalies?.recent || []).map(normalizeAnomalyRow),
    },
  };
}

export function normalizeAiListResponse(response) {
  return {
    ...response,
    rows: (response?.rows || []).map(normalizeRecommendationRow),
  };
}

export function normalizeAiAnomalyListResponse(response) {
  return {
    ...response,
    rows: (response?.rows || []).map(normalizeAnomalyRow),
  };
}

export function normalizeAiNeedResponse(response) {
  return {
    ...response,
    forecast: (response?.forecast || []).map((row) => ({
      ...row,
      forecast_target_need_qty: numberValue(row.forecast_target_need_qty),
    })),
    prediction_documents: normalizePredictionDocuments(response?.prediction_documents),
  };
}

export function normalizeAiRecommendationResponse(response) {
  return {
    ...response,
    current_stock_qty: numberValue(response?.current_stock_qty),
    critical_stock_threshold: numberValue(response?.critical_stock_threshold),
    daily_recommendations: (response?.daily_recommendations || []).map(normalizeRecommendationRow),
    top_recommendation: response?.top_recommendation
      ? normalizeRecommendationRow(response.top_recommendation)
      : null,
    prediction_documents: normalizePredictionDocuments(response?.prediction_documents),
    explainability: response?.explainability || null,
  };
}

export async function syncAiDashboard({ limit = 50 } = {}) {
  const dashboard = normalizeAiDashboardResponse(
    await aiRequest(`/summary/dashboard?limit=${encodeURIComponent(limit)}`)
  );
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
    model_version: dashboard.model_version || dashboard.forecasting?.model_version || null,
    inference_mode: dashboard.inference_mode || null,
    explainability: dashboard.explainability || null,
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
    rationale_chips: parseRationale(row.rationale_chips).slice(0, 3),
    rationale_chip_details: parseRationaleDetails(row.rationale_chip_details),
    model_version: row.model_version || null,
    inference_mode: row.inference_mode || null,
    explainability: row.explainability || null,
    prediction_documents: normalizePredictionDocuments(row.prediction_documents),
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
  if (Array.isArray(value)) {
    return value
      .map((chip) => {
        if (typeof chip === "string") return chip;
        if (chip && typeof chip === "object") {
          return String(chip.narrative ?? chip.feature ?? "").trim();
        }
        return String(chip ?? "").trim();
      })
      .filter(Boolean);
  }
  return String(value)
    .split(/[|;,]/)
    .map((chip) => chip.trim())
    .filter(Boolean);
}

function parseRationaleDetails(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((chip) => chip && typeof chip === "object")
    .map((chip) => ({
      feature: String(chip.feature ?? "unknown"),
      narrative: String(chip.narrative ?? chip.feature ?? ""),
      attribution_value: numberValue(chip.attribution_value ?? chip.shap_value),
    }))
    .filter((chip) => chip.narrative);
}

function normalizeRecommendationRow(row) {
  const rationaleDetails = parseRationaleDetails(row?.rationale_chip_details);
  const rationaleChips = parseRationale(row?.rationale_chips).slice(0, 3);
  return {
    ...row,
    forecast_target_need_qty: numberValue(row?.forecast_target_need_qty),
    recommended_qty: numberValue(row?.recommended_qty),
    shortage_qty: numberValue(row?.shortage_qty),
    coverage_days: numberValue(row?.coverage_days),
    priority_score: numberValue(row?.priority_score),
    trust_score: numberValue(row?.trust_score),
    rationale_chips: rationaleChips,
    rationale_chip_details: rationaleDetails,
  };
}

function normalizeAnomalyRow(row) {
  return {
    ...row,
    score: numberValue(row?.score),
  };
}

function normalizePredictionDocuments(value) {
  if (!Array.isArray(value)) return [];
  return value.map((doc) => ({
    ...doc,
    predicted_qty: numberValue(doc.predicted_qty),
    predicted_kg: doc.predicted_kg === null ? null : numberValue(doc.predicted_kg),
    confidence_low: numberValue(doc.confidence_low),
    confidence_high: numberValue(doc.confidence_high),
    mae_last_7d: doc.mae_last_7d === null ? null : numberValue(doc.mae_last_7d),
    attribution_values: doc.attribution_values || doc.shap_values || {},
    rationale_chips: parseRationaleDetails(doc.rationale_chips),
  }));
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
