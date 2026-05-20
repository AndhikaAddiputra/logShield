import { randomUUID } from "node:crypto";
import { config } from "./config.js";
import { bulkDocuments, findDocuments, getDocument } from "./couchdb.js";
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

export async function inferRecommendation(payload) {
  const raw = await aiRequest("/infer/recommendation", {
    method: "POST",
    body: payload,
  });
  return normalizeAiRecommendationResponse(raw);
}

export async function inferNeed(payload) {
  const raw = await aiRequest("/infer/need", {
    method: "POST",
    body: payload,
  });
  return normalizeAiNeedResponse(raw);
}

const COMMODITY_SPECS = {
  "air_bersih":    { qty: 20.0,  unit: "liter", period_days: 1,   class: "konsumsi_harian",         category: "pangan" },
  "air_minum":     { qty: 4.0,   unit: "liter", period_days: 1,   class: "konsumsi_harian",         category: "pangan" },
  "beras":         { qty: 0.4,   unit: "kg",    period_days: 1,   class: "konsumsi_harian",         category: "pangan" },
  "mie_instan":    { qty: 2.0,   unit: "pcs",   period_days: 1,   class: "konsumsi_harian",         category: "pangan" },
  "minyak_goreng": { qty: 0.03,  unit: "liter", period_days: 1,   class: "konsumsi_harian",         category: "pangan" },
  "protein":       { qty: 0.05,  unit: "kg",    period_days: 1,   class: "konsumsi_harian",         category: "pangan" },
  "mpasi":         { qty: 0.2,   unit: "kg",    period_days: 1,   class: "konsumsi_harian",         category: "pangan" },
  "obat_obatan":   { qty: 0.05,  unit: "pcs",   period_days: 1,   class: "konsumsi_harian",         category: "sandang" },
  "masker":        { qty: 1.0,   unit: "pcs",   period_days: 1,   class: "konsumsi_harian",         category: "sandang" },

  "pembalut":      { qty: 8.0,   unit: "pcs",   period_days: 28,  class: "konsumsi_berkala",        category: "sandang" },
  "popok_bayi":    { qty: 30.0,  unit: "pcs",   period_days: 14,  class: "konsumsi_berkala",        category: "sandang" },
  "hygiene_kit":   { qty: 1.0,   unit: "kit",   period_days: 30,  class: "konsumsi_berkala",        category: "sandang" },
  "baterai":       { qty: 4.0,   unit: "pcs",   period_days: 30,  class: "konsumsi_berkala",        category: "lainnya" },

  "selimut":       { qty: 1.0,   unit: "pcs",   period_days: 365, class: "perlengkapan_tahan_lama", category: "sandang" },
  "matras":        { qty: 1.0,   unit: "pcs",   period_days: 365, class: "perlengkapan_tahan_lama", category: "sandang" },

  "radio_ht":      { qty: 2.0,   unit: "unit",  period_days: 730, class: "elektronik_logistik",     category: "lainnya" },
};

export async function inferPoskoCommodities(poskoId) {
  const posko = await getDocument(poskoId);
  const assetSelector = { type: "asset" };
  const assetResult = await findDocuments(assetSelector, { limit: 500 });
  const assets = assetResult.docs || [];

  const requestResult = await findDocuments(
    { type: "request", posko_id: poskoId },
    { limit: 500 }
  );
  const requests = (requestResult.docs || []).filter((r) => r.posko_id === poskoId);

  const movementResult = await findDocuments(
    { type: "stock_movement" },
    { limit: 1000 }
  );
  const movements = (movementResult.docs || []).filter(
    (m) => m.posko_id === poskoId || m.warehouse_id === poskoId
  );

  const commodityGroups = groupRequestsByCommodity(requests, movements);

  const assetCommodities = {};
  const normalizedAssetKeys = new Set();
  for (const a of assets) {
    const key = a.commodity || a.name || "unknown";
    normalizedAssetKeys.add(normalizeItemName(key));
    if (!assetCommodities[key]) {
      assetCommodities[key] = { category: a.category || "lainnya", unit: a.unit || "unit", stock: a.quantity_available || 0, threshold: a.min_threshold || 0 };
    }
  }
  for (const [commName, spec] of Object.entries(COMMODITY_SPECS)) {
    if (normalizedAssetKeys.has(commName)) continue;
    assetCommodities[commName] = {
      category: spec.category,
      unit: spec.unit,
      stock: 0,
      threshold: 0,
    };
  }

  if (Object.keys(commodityGroups).length === 0) {
    for (const [commodity, info] of Object.entries(assetCommodities)) {
      commodityGroups[commodity] = { totalRequested: 0, dailyHistory: [], assetInfo: info };
    }
  } else {
    for (const [commodity, info] of Object.entries(assetCommodities)) {
      if (!commodityGroups[commodity]) {
        commodityGroups[commodity] = { totalRequested: 0, dailyHistory: [], assetInfo: info };
      }
    }
  }
  const kibBencanaId = posko.kib_bencana_id || posko.kib_16 || poskoId;
  const disasterType = inferDisasterType(kibBencanaId);

  const vulnerableCount =
    (posko.count_balita || 0) +
    (posko.count_lansia || 0) +
    (posko.count_disabilitas || 0);

  const results = [];

  for (const [commodity, group] of Object.entries(commodityGroups)) {
    const asset = assets.find((a) => a.commodity === commodity) || group.assetInfo || {};
    const history = group.dailyHistory.slice(-30);

    const payload = {
      kib_bencana_id: kibBencanaId,
      disaster_type: disasterType,
      posko_id: poskoId,
      posko_name: posko.name || poskoId,
      item_name: commodity,
      item_category: asset?.category || "lainnya",
      unit: asset?.unit || "unit",
      total_pengungsi: posko.total_pengungsi || 0,
      vulnerable_count: vulnerableCount,
      current_stock_qty: asset?.quantity_available || 0,
      requested_qty: group.totalRequested || 0,
      critical_stock_threshold: asset?.min_threshold || 0,
      history,
    };

    let recommendation = null;
    let error = null;
    try {
      recommendation = await inferRecommendation(payload);
    } catch (err) {
      error = err.message || String(err);
    }

    results.push({
      commodity,
      category: asset?.category || "lainnya",
      unit: asset?.unit || "unit",
      current_stock: asset?.quantity_available || 0,
      critical_threshold: asset?.min_threshold || 0,
      history_days: history.length,
      history,
      recommendation,
      error,
    });
  }

  const docsToStore = results
    .filter((r) => r.recommendation?.prediction_documents)
    .flatMap((r) => r.recommendation.prediction_documents)
    .map((doc) => {
      validateLogShieldDocument(doc);
      return doc;
    });

  if (docsToStore.length > 0) {
    await bulkDocuments(docsToStore);
  }

  return {
    ok: true,
    posko_id: poskoId,
    posko_name: posko.name,
    kib_bencana_id: kibBencanaId,
    disaster_type: disasterType,
    total_pengungsi: posko.total_pengungsi,
    vulnerable_count: vulnerableCount,
    items_analyzed: results.length,
    items: results,
    results: results.map((r) => ({
      item_name: r.commodity,
      item_category: r.category,
      unit: r.unit,
      current_stock_qty: r.current_stock,
      critical_stock_threshold: r.critical_threshold,
      history_days: r.history_days,
      forecast_qty: r.recommendation?.top_recommendation?.forecast_target_need_qty || recalcForecastQty(r.commodity, totalPengungsi || 0, vulnerableCount || 0, 0, r.critical_threshold || 0),
      risk_level: r.recommendation?.top_recommendation?.risk_level || null,
      recommended_qty: r.recommendation?.top_recommendation?.recommended_qty || 0,
      shortage_qty: r.recommendation?.top_recommendation?.shortage_qty || 0,
      coverage_days: r.recommendation?.top_recommendation?.coverage_days || 0,
      priority_score: r.recommendation?.top_recommendation?.priority_score || 0,
      trust_score: r.recommendation?.top_recommendation?.trust_score || 0,
      inference_mode: r.recommendation?.inference_mode || "cold_start",
      commodity_class: getCommoditySpec(r.commodity)?.class || null,
      rationale_chips: r.recommendation?.top_recommendation?.rationale_chips || [],
      daily_recommendations: r.recommendation?.daily_recommendations || [],
      error: r.error || null,
    })),
    stored_predictions: docsToStore.length,
  };
}

function groupRequestsByCommodity(requests, movements) {
  const groups = {};
  const dateMap = {};

  for (const req of requests) {
    const date = (req.created_at || "").slice(0, 10);
    if (!date) continue;
    for (const item of req.items || []) {
      const commodity = item.commodity || item.name || "unknown";
      if (!groups[commodity]) groups[commodity] = { totalRequested: 0, dailyHistory: [] };
      if (!dateMap[commodity]) dateMap[commodity] = {};
      if (!dateMap[commodity][date]) dateMap[commodity][date] = { target_need_qty: 0, current_stock_qty: 0, distributed_qty: 0, requested_qty: 0 };
      dateMap[commodity][date].requested_qty += Number(item.quantity || item.qty || 0);
      dateMap[commodity][date].target_need_qty += Number(item.quantity || item.qty || 0);
      groups[commodity].totalRequested += Number(item.quantity || item.qty || 0);
    }
  }

  for (const mov of movements) {
    const date = (mov.created_at || "").slice(0, 10);
    if (!date) continue;
    const commodity = mov.commodity || "unknown";
    if (!groups[commodity]) groups[commodity] = { totalRequested: 0, dailyHistory: [] };
    if (!dateMap[commodity]) dateMap[commodity] = {};
    if (!dateMap[commodity][date]) dateMap[commodity][date] = { target_need_qty: 0, current_stock_qty: 0, distributed_qty: 0, requested_qty: 0 };
    if (mov.movement_type === "keluar" || mov.type === "distribution") {
      dateMap[commodity][date].distributed_qty += Number(mov.quantity || 0);
    } else {
      dateMap[commodity][date].current_stock_qty += Number(mov.quantity || 0);
    }
  }

  for (const [commodity, dates] of Object.entries(dateMap)) {
    groups[commodity].dailyHistory = Object.entries(dates)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, values]) => ({
        date,
        target_need_qty: values.target_need_qty || 0,
        current_stock_qty: values.current_stock_qty || 0,
        distributed_qty: values.distributed_qty || 0,
        requested_qty: values.requested_qty || 0,
      }));
  }

  return groups;
}

function inferDisasterType(kibBencanaId) {
  if (!kibBencanaId) return "unknown";
  const upper = kibBencanaId.toUpperCase();
  if (upper.includes("GM")) return "gunung_meletus";
  if (upper.includes("BL") || upper.includes("LS")) return "banjir_longsor";
  if (upper.includes("GB") || upper.includes("TS")) return "gempa_bumi_tsunami";
  return "unknown";
}

function buildRecommendationChips({ commodity, spec, forecastQty, safetyStock, shortage, coverageDays, risk, vulnerableCount, totalPengungsi, currentStock, unit }) {
  const chips = [];
  const comm = commodity.charAt(0).toUpperCase() + commodity.slice(1);
  const className = spec?.class;
  const vRatio = vulnerableCount / Math.max(totalPengungsi, 1);

  if (shortage > 0) {
    chips.push(`${comm} mengalami kekurangan ${shortage.toFixed(1)} ${unit} dari total kebutuhan.`);
  }

  if (coverageDays < 1) {
    chips.push(`Stok ${comm} hanya cukup untuk <1 hari — prioritas distribusi darurat.`);
  } else if (coverageDays < 3) {
    chips.push(`Stok ${comm} cukup ${coverageDays.toFixed(0)} hari — perlu segera distribusi.`);
  } else if (shortage <= 0 && coverageDays >= 7) {
    chips.push(`Stok ${comm} aman untuk ${coverageDays.toFixed(0)} hari ke depan.`);
  }

  if (className === "perlengkapan_tahan_lama") {
    chips.push(`${comm} adalah perlengkapan tahan lama — distribusi 1x, bukan konsumsi harian.`);
  } else if (className === "elektronik_logistik") {
    chips.push(`${comm} adalah perlengkapan logistik — alokasi ${spec?.qty || 2} unit per posko saja.`);
  } else if (className === "konsumsi_berkala") {
    chips.push(`${comm} dikonsumsi berkala (${spec?.period_days || 30} hari per siklus) — kebutuhan ${forecastQty.toFixed(1)} ${unit}/hari setara.`);
  } else if (className === "konsumsi_harian") {
    if (forecastQty > 0) {
      chips.push(`Konsumsi harian ${forecastQty.toFixed(1)} ${unit}/hari untuk ${totalPengungsi} jiwa.`);
    }
  }

  if (vulnerableCount > 0 && vRatio > 0.15) {
    chips.push(`${vulnerableCount} jiwa rentan (${(vRatio * 100).toFixed(0)}% dari total) meningkatkan prioritas.`);
  }

  return chips.slice(0, 3);
}

const NAME_ALIASES = {
  "radio": "radio_ht",
  "radio_ht": "radio_ht",
  "popok": "popok_bayi",
  "popok_bayi": "popok_bayi",
  "hygiene_kit": "hygiene_kit",
  "hygiene": "hygiene_kit",
  "obat": "obat_obatan",
  "obat_obatan": "obat_obatan",
  "pembalut": "pembalut",
  "pembalut_wanita": "pembalut",
  "masker": "masker",
  "air": "air_bersih",
  "air_bersih": "air_bersih",
  "air_minum": "air_minum",
  "beras": "beras",
  "mie_instan": "mie_instan",
  "minyak_goreng": "minyak_goreng",
  "minyak": "minyak_goreng",
  "protein": "protein",
  "mpasi": "mpasi",
  "selimut": "selimut",
  "matras": "matras",
  "baterai": "baterai",
  "battery": "baterai",
};

function normalizeItemName(name) {
  const raw = String(name).trim().toLowerCase().replace(/[-\s]/g, "_").replace(/[^a-z0-9_]/g, "");
  return NAME_ALIASES[raw] || raw;
}

function getCommoditySpec(commodity) {
  return COMMODITY_SPECS[normalizeItemName(commodity)];
}

function recalcForecastQty(commodity, totalPengungsi, vulnerableCount, requestedQty = 0, criticalThreshold = 0) {
  const spec = getCommoditySpec(commodity);
  const vulnerableRatio = vulnerableCount / Math.max(totalPengungsi, 1);
  const vulnerableMultiplier = 1.0 + Math.min(vulnerableRatio, 0.35);

  let baseForecast;
  if (!spec) {
    baseForecast = Math.max(totalPengungsi, 1);
  } else {
    switch (spec.class) {
      case "konsumsi_harian":
        baseForecast = Math.max(totalPengungsi, 1) * spec.qty;
        break;
      case "konsumsi_berkala":
        baseForecast = (Math.max(totalPengungsi, 1) * spec.qty) / spec.period_days;
        break;
      case "perlengkapan_tahan_lama": {
        const totalNeeded = Math.ceil(Math.max(totalPengungsi, 1) * spec.qty);
        baseForecast = Math.max(totalNeeded, 1) / 7;
        break;
      }
      case "elektronik_logistik":
        baseForecast = spec.qty;
        break;
      default:
        baseForecast = Math.max(totalPengungsi, 1) * (spec.qty || 1.0);
    }
  }

  const finalNeed = Math.max(baseForecast, requestedQty, criticalThreshold * 0.35);
  return round2(Math.max(finalNeed * vulnerableMultiplier, 0));
}

export async function getRecommendationsFromDb({ limit = 25, posko_id = "", risk_level = "" } = {}) {
  const predResult = await findDocuments({ type: "prediction" }, { limit: 500 });
  const predictions = predResult.docs || [];

  const assetResult = await findDocuments({ type: "asset" }, { limit: 500 });
  const assets = assetResult.docs || [];

  const poskoResult = await findDocuments({ type: "posko" }, { limit: 500 });
  const poskoMap = {};
  for (const p of poskoResult.docs || []) {
    poskoMap[p._id] = p;
  }

  const grouped = {};
  for (const pred of predictions) {
    const key = `${pred.posko_id}::${pred.commodity}`;
    if (!grouped[key] || pred.prediction_date > grouped[key].prediction_date) {
      grouped[key] = pred;
    }
  }
  if (posko_id) {
    const existingCommodityKeys = new Set(
      Object.values(grouped).map((pred) => normalizeItemName(pred.commodity))
    );
    const today = new Date().toISOString().slice(0, 10);
    for (const [commKey, spec] of Object.entries(COMMODITY_SPECS)) {
      if (existingCommodityKeys.has(commKey)) continue;
      grouped[`${posko_id}::${commKey}`] = {
        type: "prediction",
        posko_id,
        commodity: commKey,
        prediction_date: today,
        unit: spec.unit,
        item_category: spec.category,
        attribution_method: "cold_start_fallback",
        attribution_values: {
          requested_qty: 0,
          current_stock_qty: 0,
          vulnerable_count: 0,
        },
      };
      existingCommodityKeys.add(commKey);
    }
  }

  const rows = [];
  for (const [key, pred] of Object.entries(grouped)) {
    const posko = poskoMap[pred.posko_id] || {};
    const asset = assets.find((a) => normalizeItemName(a.commodity) === normalizeItemName(pred.commodity)) || {};
    const spec = getCommoditySpec(pred.commodity);
    const currentStock = asset.quantity_available || 0;
    const vulnerabilityCount = (posko.count_balita || 0) + (posko.count_lansia || 0) + (posko.count_disabilitas || 0);
    const totalPengungsi = posko.total_pengungsi || 1;
    const requestedQty = pred.attribution_values?.requested_qty || 0;
    const criticalThreshold = asset.min_threshold || 0;
    const unit = pred.unit || asset.unit || spec?.unit || "unit";

    const forecastQty = recalcForecastQty(pred.commodity, totalPengungsi, vulnerabilityCount, requestedQty, criticalThreshold);
    const vulnerableRatio = vulnerabilityCount / Math.max(totalPengungsi, 1);
    const safetyStock = Math.max(forecastQty * 0.35, criticalThreshold) * (1 + Math.min(vulnerableRatio, 0.35));
    const shortage = Math.max(forecastQty + safetyStock - currentStock, 0);
    const coverageDays = forecastQty > 0 ? currentStock / forecastQty : 99;
    const risk = shortage > 0 ? (coverageDays < 1 ? "kritis" : "waspada") : "aman";
    const trust = 0.55;
    const priority = Math.min(
      (risk === "kritis" ? 35 : risk === "waspada" ? 20 : 5) +
      Math.min(vulnerableRatio * 25, 20) +
      Math.min(totalPengungsi / 100 * 3, 15) +
      trust * 2 +
      Math.min(forecastQty / 50, 10),
      100
    );

    const chips = buildRecommendationChips({
      commodity: pred.commodity,
      spec,
      forecastQty,
      safetyStock,
      shortage,
      coverageDays,
      risk,
      vulnerableCount: vulnerabilityCount,
      totalPengungsi,
      currentStock,
      unit,
    });

    if (posko_id && pred.posko_id !== posko_id) continue;
    if (risk_level && risk !== risk_level) continue;

    rows.push({
      forecast_date: pred.prediction_date,
      posko_id: pred.posko_id,
      posko_name: posko.name || pred.posko_id,
      item_name: pred.commodity,
      unit,
      forecast_qty: round2(forecastQty),
      recommended_qty: round2(Math.max(forecastQty + safetyStock - currentStock, 0)),
      current_stock_qty: currentStock,
      shortage_qty: round2(shortage),
      coverage_days: round2(coverageDays),
      risk_level: risk,
      priority_score: round2(priority),
      trust_score: trust,
      inference_mode: pred.attribution_method?.includes("cold_start") ? "cold_start" : "time_series",
      rationale_chips: chips,
      critical_stock_threshold: criticalThreshold,
      item_category: pred.item_category || asset.category || spec?.category || "lainnya",
      commodity_class: spec?.class || null,
      total_pengungsi: totalPengungsi,
      vulnerable_count: vulnerabilityCount,
    });
  }

  rows.sort((a, b) => (b.priority_score || 0) - (a.priority_score || 0));
  return { count: rows.length, rows: rows.slice(0, limit) };
}

function round2(v) {
  return Math.round(v * 100) / 100;
}
