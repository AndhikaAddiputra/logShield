import { aiRequest } from "./ai.js";
import { findDocuments } from "./couchdb.js";

const CATEGORIES = ["sandang", "pangan", "papan", "lainnya"];
const CATEGORY_LABELS = {
  sandang: "Sandang",
  pangan: "Pangan",
  papan: "Papan",
  lainnya: "Lainnya",
};

const COMMODITY_CATEGORY_HINTS = [
  { category: "pangan", pattern: /beras|mie|instan|air|mineral|susu|formula|makanan|pangan|nutrisi|kaleng/i },
  { category: "sandang", pattern: /pakaian|selimut|alas kaki|sandang|baju|kaos|sarung|hygiene|sanitasi/i },
  { category: "papan", pattern: /kayu|triplek|paku|baut|tenda|terpal|shelter|papan|bangunan/i },
];

const VULNERABLE_GROUPS = [
  { key: "balita", label: "Balita", poskoField: "count_balita" },
  { key: "lansia", label: "Lansia", poskoField: "count_lansia" },
  { key: "ibu_hamil", label: "Ibu Hamil", poskoField: null },
  { key: "disabilitas", label: "Disabilitas", poskoField: "count_disabilitas" },
];

export async function getDashboardOverview() {
  const [poskos, assets, requests, aiHealth] = await Promise.all([
    getDocs({ type: "posko" }, 5000),
    getDocs({ type: "asset" }, 5000),
    getDocs({ type: "request" }, 5000),
    getAiHealth(),
  ]);

  const pendingRequests = requests.filter((doc) => ["mendesak", "menunggu"].includes(doc.status));
  const criticalAssets = assets.filter((asset) => numberValue(asset.quantity_available) < numberValue(asset.min_threshold));

  return {
    ok: true,
    cards: {
      total_posko: poskos.length,
      critical_items: criticalAssets.length,
      critical_units: sum(criticalAssets, "quantity_available"),
      pending_requests: pendingRequests.length,
      ai_health: aiHealth.label,
      ai_status: aiHealth.status,
    },
    updated_at: latestTimestamp([
      ...poskos.map((doc) => doc.updated_at || doc.created_at),
      ...assets.map((doc) => doc.updated_at || doc.created_at),
      ...requests.map((doc) => doc.updated_at || doc.created_at),
    ]) || new Date().toISOString(),
  };
}

export async function getDashboardStockWeight(query = {}, now = new Date()) {
  const days = clampNumber(query.days, 7, 1, 31);
  const category = normalizeCategory(query.category);
  const commodity = optionalLower(query.commodity);
  const buckets = createDayBuckets(days, now);
  const [assets, readings, requests, distributions] = await Promise.all([
    getDocs({ type: "asset" }, 5000),
    getDocs({ type: "stock_reading" }, 5000),
    getDocs({ type: "request" }, 5000),
    getDocs({ type: "distribution" }, 5000),
  ]);
  const categoryByCommodity = makeCategoryResolver(assets);

  for (const reading of readings) {
    if (!matchesCategoryAndCommodity(reading.commodity, category, commodity, categoryByCommodity)) continue;
    const date = isoDate(new Date(reading.timestamp || reading.created_at));
    const bucket = buckets.byDate.get(date);
    if (!bucket) continue;
    bucket.persediaan += gramsToKg(reading.weight_g);
    bucket.samples += 1;
  }

  for (const asset of assets) {
    if (!matchesCategoryAndCommodity(asset.commodity, category, commodity, categoryByCommodity)) continue;
    const date = isoDate(new Date(asset.updated_at || asset.created_at));
    const bucket = buckets.byDate.get(date);
    if (!bucket) continue;
    bucket.persediaan += numberValue(asset.quantity_available);
  }

  for (const request of requests) {
    const date = isoDate(new Date(request.created_at));
    const bucket = buckets.byDate.get(date);
    if (!bucket) continue;
    for (const item of request.items || []) {
      if (!matchesCategoryAndCommodity(item.commodity, category, commodity, categoryByCommodity)) continue;
      bucket.kebutuhan += numberValue(item.quantity);
    }
  }

  for (const distribution of distributions) {
    const date = isoDate(new Date(distribution.created_at));
    const bucket = buckets.byDate.get(date);
    if (!bucket) continue;
    if (!matchesCategoryAndCommodity(distribution.commodity, category, commodity, categoryByCommodity)) continue;
    bucket.kebutuhan += numberValue(distribution.quantity);
  }

  const options = buildStockFilterOptions(assets);
  return {
    ok: true,
    filter: {
      category: category || "all",
      commodity: commodity || "all",
    },
    options,
    days: buckets.days.map((bucket) => ({
      date: bucket.date,
      label: bucket.label,
      kebutuhan: round(bucket.kebutuhan),
      persediaan: round(bucket.persediaan),
    })),
  };
}

export async function getDashboardRegionalHeatmap(query = {}) {
  const limit = clampNumber(query.limit, 7, 1, 20);
  const [poskos, assets, requests] = await Promise.all([
    getDocs({ type: "posko" }, 5000),
    getDocs({ type: "asset" }, 5000),
    getDocs({ type: "request" }, 5000),
  ]);
  const categoryByCommodity = makeCategoryResolver(assets);
  const selectedPoskos = poskos
    .filter((posko) => posko.status !== "closed")
    .sort((a, b) => numberValue(b.total_pengungsi) - numberValue(a.total_pengungsi))
    .slice(0, limit);
  const selectedIds = new Set(selectedPoskos.map((posko) => posko._id));
  const totals = new Map();

  for (const request of requests) {
    if (!selectedIds.has(request.posko_id)) continue;
    for (const item of request.items || []) {
      const category = categoryByCommodity(item.commodity);
      const key = `${category}::${request.posko_id}`;
      totals.set(key, (totals.get(key) || 0) + numberValue(item.quantity));
    }
  }

  const maxValue = Math.max(1, ...totals.values());
  return {
    ok: true,
    columns: selectedPoskos.map((posko) => ({
      posko_id: posko._id,
      name: posko.name,
      district: posko.district,
      province: posko.province,
    })),
    rows: CATEGORIES.map((category) => ({
      category,
      label: CATEGORY_LABELS[category],
      values: selectedPoskos.map((posko) => {
        const value = totals.get(`${category}::${posko._id}`) || 0;
        return {
          posko_id: posko._id,
          value,
          intensity: Math.round((value / maxValue) * 100),
        };
      }),
    })),
  };
}

export async function getDashboardVulnerableFulfillment() {
  const [poskos, distributions, completedRequests] = await Promise.all([
    getDocs({ type: "posko" }, 5000),
    getDocs({ type: "distribution" }, 5000),
    getDocs({ type: "request", status: "selesai" }, 5000),
  ]);

  const poskoMap = new Map(poskos.map((p) => [p._id, p]));

  return {
    ok: true,
    groups: VULNERABLE_GROUPS.map((group) => {
      let fulfilled = sum(distributions.filter((doc) => doc.vulnerable_group === group.key), "quantity");

      for (const req of completedRequests) {
        const posko = poskoMap.get(req.posko_id);
        if (!posko) continue;
        const totalWarga = numberValue(posko.total_pengungsi) || 1;
        const reqTotal = (req.items || []).reduce((s, item) => s + numberValue(item.quantity), 0);
        let groupCount = 0;
        if (group.poskoField) {
          groupCount = numberValue(posko[group.poskoField]);
        } else if (group.key === "ibu_hamil") {
          groupCount = numberValue(posko.count_perempuan) * 0.05;
        }
        fulfilled += (groupCount / totalWarga) * reqTotal;
      }

      const target = group.poskoField
        ? sum(poskos, group.poskoField)
        : Math.max(fulfilled, sum(poskos, "count_perempuan") * 0.05);
      return {
        key: group.key,
        label: group.label,
        fulfilled: round(fulfilled),
        target: round(target),
        percentage: target > 0 ? Math.min(100, Math.round((fulfilled / target) * 100)) : 0,
      };
    }),
  };
}

export async function searchDashboard(query = {}) {
  const term = String(query.q || query.search || "").trim().toLowerCase();
  if (!term) {
    return { ok: true, query: "", results: [] };
  }

  const [poskos, assets, requests] = await Promise.all([
    getDocs({ type: "posko" }, 5000),
    getDocs({ type: "asset" }, 5000),
    getDocs({ type: "request" }, 5000),
  ]);

  const results = [
    ...poskos
      .filter((posko) => matchesAny(posko, term, ["name", "kib_16", "district", "province", "address"]))
      .map((posko) => ({
        type: "posko",
        id: posko._id,
        title: posko.name,
        subtitle: [posko.district, posko.province].filter(Boolean).join(", "),
      })),
    ...assets
      .filter((asset) => matchesAny(asset, term, ["commodity", "category", "warehouse_id"]))
      .map((asset) => ({
        type: "asset",
        id: asset._id,
        title: asset.commodity,
        subtitle: `${asset.quantity_available} ${asset.unit} - ${CATEGORY_LABELS[asset.category] || asset.category}`,
      })),
    ...requests
      .filter((request) =>
        matchesAny(request, term, ["request_code", "status", "priority"]) ||
        (request.items || []).some((item) => matchesAny(item, term, ["commodity", "note"]))
      )
      .map((request) => ({
        type: "request",
        id: request._id,
        title: request.request_code,
        subtitle: `${request.status} - ${request.items?.length || 0} item`,
      })),
  ].slice(0, clampNumber(query.limit, 10, 1, 50));

  return { ok: true, query: term, results };
}

export async function getDashboardNotifications() {
  const [assets, requests, aiAnomalies] = await Promise.all([
    getDocs({ type: "asset" }, 5000),
    getDocs({ type: "request" }, 5000),
    getDocs({ type: "ai_anomaly" }, 5000),
  ]);

  const notifications = [
    ...assets
      .filter((asset) => numberValue(asset.quantity_available) < numberValue(asset.min_threshold))
      .map((asset) => ({
        type: "critical_stock",
        severity: "high",
        title: "Stok kritis",
        message: `${asset.commodity} di ${asset.warehouse_id} berada di bawah ambang minimum.`,
        created_at: asset.updated_at || asset.created_at,
      })),
    ...requests
      .filter((request) => request.status === "mendesak")
      .map((request) => ({
        type: "urgent_request",
        severity: "high",
        title: "Request mendesak",
        message: `${request.request_code} menunggu proses.`,
        created_at: request.created_at,
      })),
    ...aiAnomalies.map((anomaly) => ({
      type: "ai_anomaly",
      severity: anomaly.severity,
      title: anomaly.anomaly_type,
      message: anomaly.message,
      created_at: anomaly.synced_at || anomaly.date,
    })),
  ]
    .sort((a, b) => Date.parse(b.created_at || 0) - Date.parse(a.created_at || 0))
    .slice(0, 20);

  return {
    ok: true,
    unread_count: notifications.length,
    notifications,
  };
}

async function getDocs(selector, limit) {
  const result = await findDocuments(selector, { limit });
  return result.docs || [];
}

async function getAiHealth() {
  try {
    const health = await aiRequest("/health");
    const status = health?.status || "stable";
    return {
      status,
      label: status === "healthy" || status === "stable" || status === "ok" ? "Stable" : "Degraded",
    };
  } catch {
    return { status: "unreachable", label: "Degraded" };
  }
}

function makeCategoryResolver(assets) {
  const byCommodity = new Map(
    assets.map((asset) => [String(asset.commodity || "").toLowerCase(), asset.category])
  );
  return (commodity) => {
    const key = String(commodity || "").toLowerCase();
    if (byCommodity.has(key)) return byCommodity.get(key);
    const hint = COMMODITY_CATEGORY_HINTS.find((entry) => entry.pattern.test(key));
    return hint?.category || "lainnya";
  };
}

function matchesCategoryAndCommodity(commodityValue, category, commodity, categoryByCommodity) {
  const normalizedCommodity = String(commodityValue || "").toLowerCase();
  if (commodity && normalizedCommodity !== commodity) return false;
  if (category && categoryByCommodity(normalizedCommodity) !== category) return false;
  return true;
}

function buildStockFilterOptions(assets) {
  const byCategory = new Map(CATEGORIES.map((category) => [category, new Set()]));
  for (const asset of assets) {
    const category = CATEGORIES.includes(asset.category) ? asset.category : "lainnya";
    byCategory.get(category).add(asset.commodity);
  }
  return [...byCategory.entries()].map(([category, commodities]) => ({
    category,
    label: CATEGORY_LABELS[category],
    commodities: [...commodities].sort(),
  }));
}

function createDayBuckets(days, now) {
  const dayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const result = [];
  const byDate = new Map();
  for (let index = days - 1; index >= 0; index -= 1) {
    const dateObj = new Date(dayStart);
    dateObj.setUTCDate(dayStart.getUTCDate() - index);
    const date = isoDate(dateObj);
    const bucket = {
      date,
      label: dateObj.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" }).toUpperCase(),
      kebutuhan: 0,
      persediaan: 0,
      samples: 0,
    };
    result.push(bucket);
    byDate.set(date, bucket);
  }
  return { days: result, byDate };
}

function normalizeCategory(value) {
  const category = String(value || "").toLowerCase();
  return CATEGORIES.includes(category) ? category : null;
}

function optionalLower(value) {
  const text = String(value || "").trim().toLowerCase();
  return text && text !== "all" ? text : null;
}

function matchesAny(doc, term, fields) {
  return fields.some((field) => String(doc[field] || "").toLowerCase().includes(term));
}

function latestTimestamp(values) {
  return values
    .filter(Boolean)
    .sort((a, b) => Date.parse(b) - Date.parse(a))[0] || null;
}

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function sum(docs, field) {
  return docs.reduce((total, doc) => total + numberValue(doc[field]), 0);
}

function numberValue(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function gramsToKg(value) {
  return numberValue(value) / 1000;
}

function round(value) {
  return Math.round(numberValue(value) * 100) / 100;
}

function clampNumber(value, defaultValue, min, max) {
  const number = Number(value ?? defaultValue);
  if (!Number.isFinite(number)) return defaultValue;
  return Math.max(min, Math.min(Math.trunc(number), max));
}
