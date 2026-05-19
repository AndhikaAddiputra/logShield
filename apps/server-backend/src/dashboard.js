import { findDocuments } from "./couchdb.js";

export async function getDashboardOverview() {
  const [poskos, assets, requests, aiSummaries] = await Promise.all([
    getDocs({ type: "posko" }, 5000),
    getDocs({ type: "asset" }, 5000),
    getDocs({ type: "request" }, 5000),
    getDocs({ type: "ai_run_summary" }, 50),
  ]);

  const totalPosko = poskos.length;
  const criticalItems = assets.filter((a) => a.quantity_available < a.min_threshold);
  const criticalUnits = criticalItems.reduce((sum, a) => sum + (Number(a.quantity_available) || 0), 0);

  const pendingRequests = requests.filter(
    (r) => r.status === "mendesak" || r.status === "menunggu"
  ).length;

  const latestAi = aiSummaries.sort((a, b) => new Date(b.synced_at || 0) - new Date(a.synced_at || 0))[0];
  const aiHealth = latestAi?.status === "healthy" ? "Stable" : "Degraded";
  const aiStatus = latestAi?.status || "unknown";

  const timestamps = [
    ...poskos.map((d) => d.updated_at || d.created_at),
    ...assets.map((d) => d.updated_at || d.created_at),
    ...requests.map((d) => d.updated_at || d.created_at),
    latestAi?.synced_at,
  ].filter(Boolean).sort().reverse();

  return {
    ok: true,
    cards: {
      total_posko: totalPosko,
      critical_items: criticalItems.length,
      critical_units: criticalUnits,
      pending_requests: pendingRequests,
      ai_health: aiHealth,
      ai_status: aiStatus,
    },
    updated_at: timestamps[0] || new Date().toISOString(),
  };
}

const CATEGORY_LABELS = {
  sandang: "Sandang",
  pangan: "Pangan",
  papan: "Papan",
  lainnya: "Lainnya",
};

export async function getStockWeight({ category, commodity, days: daysParam } = {}) {
  const safeDays = Math.max(1, Math.min(Number(daysParam) || 7, 31));
  const now = new Date();
  const dayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const buckets = createDayBuckets(safeDays, dayStart);
  const startDate = buckets.days[0].date;

  const [assets, movements, distributions] = await Promise.all([
    getDocs({ type: "asset" }, 5000),
    getDocs({ type: "stock_movement" }, 5000),
    getDocs({ type: "distribution" }, 5000),
  ]);

  const catCommodities = buildCategoryCommodities(assets);

  let filteredMovements = movements;
  let filteredDistributions = distributions;
  if (category && category !== "all") {
    const catAssets = assets.filter((a) => a.category === category);
    const commodities = new Set(catAssets.map((a) => a.commodity));
    filteredMovements = movements.filter((m) => { const c = m.commodity; return commodities.has(c) || false; });
    filteredDistributions = distributions.filter((d) => { const c = d.commodity; return commodities.has(c) || false; });
    if (commodity && commodity !== "all") {
      filteredMovements = filteredMovements.filter((m) => m.commodity === commodity);
      filteredDistributions = filteredDistributions.filter((d) => d.commodity === commodity);
    }
  }

  const catFiltered = category && category !== "all" ? [category] : Object.keys(CATEGORY_LABELS);

  const persediaanByDate = new Map();
  for (const asset of assets) {
    const qty = Number(asset.quantity_available) || 0;
    const date = isoDate(new Date(asset.updated_at || asset.created_at));
    if (date >= startDate) {
      persediaanByDate.set(date, (persediaanByDate.get(date) || 0) + qty);
    }
  }

  for (const movement of filteredMovements) {
    const date = isoDate(new Date(movement.created_at));
    if (date < startDate || !buckets.byDate.has(date)) continue;
    if (movement.movement_type === "in") {
      buckets.byDate.get(date).persediaan += movement.quantity;
    }
  }

  for (const distribution of filteredDistributions) {
    const date = isoDate(new Date(distribution.created_at));
    if (date < startDate || !buckets.byDate.has(date)) continue;
    buckets.byDate.get(date).kebutuhan += distribution.quantity;
  }

  for (const [date, qty] of persediaanByDate) {
    if (buckets.byDate.has(date)) {
      buckets.byDate.get(date).persediaan += qty;
    }
  }

  return {
    ok: true,
    filter: { category: category || "all", commodity: commodity || "all" },
    options: catCommodities.filter((opt) =>
      catFiltered.includes(opt.category)
    ),
    days: buckets.days,
  };
}

export async function getRegionalHeatmap(limit = 7) {
  const safeLimit = Math.max(1, Math.min(Number(limit) || 7, 20));
  const [poskos, requests] = await Promise.all([
    getDocs({ type: "posko" }, safeLimit),
    getDocs({ type: "request" }, 5000),
  ]);

  const columns = poskos.slice(0, safeLimit);
  const catValues = new Map();
  for (const req of requests) {
    const poskoIdx = columns.findIndex((p) => p._id === req.posko_id);
    if (poskoIdx < 0) continue;
    const items = req.items || [];
    for (const item of items) {
      const cat = item.category || "lainnya";
      const key = cat;
      if (!catValues.has(key)) catValues.set(key, new Map());
      const poskoMap = catValues.get(key);
      poskoMap.set(req.posko_id, (poskoMap.get(req.posko_id) || 0) + (Number(item.quantity) || 0));
    }
  }

  const categoryOrder = ["pangan", "sandang", "papan", "lainnya"];
  const maxValue = Math.max(1, ...Array.from(catValues.values()).flatMap(
    (m) => Array.from(m.values())
  ));

  const rows = categoryOrder
    .filter((cat) => columns.some((c) => catValues.has(cat) ? true : true))
    .map((cat) => {
      const poskoMap = catValues.get(cat) || new Map();
      return {
        category: cat,
        label: CATEGORY_LABELS[cat] || cat,
        values: columns.map((col) => {
          const value = poskoMap.get(col._id) || 0;
          return {
            posko_id: col._id,
            value,
            intensity: Math.round((value / maxValue) * 100),
          };
        }),
      };
    });

  return {
    ok: true,
    columns: columns.map((p) => ({
      posko_id: p._id,
      name: p.name,
      district: p.district,
      province: p.province,
    })),
    rows,
  };
}

const VULNERABLE_GROUPS = [
  { key: "balita", label: "Balita", field: "count_balita" },
  { key: "lansia", label: "Lansia", field: "count_lansia" },
  { key: "ibu_hamil", label: "Ibu Hamil", field: null },
  { key: "disabilitas", label: "Disabilitas", field: "count_disabilitas" },
];

export async function getVulnerableFulfillment() {
  const [poskos, distributions] = await Promise.all([
    getDocs({ type: "posko" }, 5000),
    getDocs({ type: "distribution" }, 5000),
  ]);

  const totalWomen = poskos.reduce((s, p) => s + (Number(p.count_perempuan) || 0), 0);

  const targets = {
    balita: poskos.reduce((s, p) => s + (Number(p.count_balita) || 0), 0),
    lansia: poskos.reduce((s, p) => s + (Number(p.count_lansia) || 0), 0),
    ibu_hamil: Math.round(totalWomen * 0.1),
    disabilitas: poskos.reduce((s, p) => s + (Number(p.count_disabilitas) || 0), 0),
  };

  const fulfilled = { balita: 0, lansia: 0, ibu_hamil: 0, disabilitas: 0 };
  for (const dist of distributions) {
    const group = dist.vulnerable_group;
    const qty = Number(dist.quantity) || 0;
    if (group && group in fulfilled) {
      fulfilled[group] += qty;
    }
  }

  const groups = VULNERABLE_GROUPS.map((g) => {
    const target = targets[g.key] || 1;
    const fulfilledCount = Math.min(fulfilled[g.key], target);
    return {
      key: g.key,
      label: g.label,
      fulfilled: fulfilledCount,
      target: targets[g.key] || 0,
      percentage: Math.round((fulfilledCount / target) * 100),
    };
  });

  return { ok: true, groups };
}

export async function searchDashboard(q, limit = 10) {
  const safeLimit = Math.max(1, Math.min(Number(limit) || 10, 50));
  if (!q || !q.trim()) {
    return { ok: true, query: q || "", results: [] };
  }
  const term = q.trim().toLowerCase();

  const [poskos, assets, requests] = await Promise.all([
    getDocs({ type: "posko" }, 5000),
    getDocs({ type: "asset" }, 5000),
    getDocs({ type: "request" }, 5000),
  ]);

  const results = [];

  for (const p of poskos) {
    if (matchAny(term, [p.name, p.kib_16, p.district, p.province, p.address])) {
      results.push({ type: "posko", id: p._id, title: p.name, subtitle: `${p.district}, ${p.province}` });
    }
  }

  for (const a of assets) {
    if (matchAny(term, [a.commodity, a.category, a.warehouse_id])) {
      results.push({ type: "asset", id: a._id, title: a.commodity, subtitle: `${a.quantity_available} ${a.unit} - ${CATEGORY_LABELS[a.category] || a.category}` });
    }
  }

  for (const r of requests) {
    const itemsText = (r.items || []).map((i) => `${i.commodity} ${i.note || ""}`).join(" ");
    if (matchAny(term, [r.request_code, r.status, r.priority, itemsText])) {
      results.push({ type: "request", id: r._id, title: `Request ${r.request_code}`, subtitle: `${r.status} - ${r.priority}` });
    }
  }

  return {
    ok: true,
    query: q,
    results: results.slice(0, safeLimit),
  };
}

export async function getNotifications() {
  const [criticalAssets, urgentRequests, anomalies] = await Promise.all([
    getDocs({ type: "asset" }, 100),
    getDocs({ type: "request" }, 100),
    getDocs({ type: "ai_anomaly" }, 20, "date", "desc"),
  ]);

  const notifications = [];

  for (const asset of criticalAssets) {
    if (asset.quantity_available < asset.min_threshold) {
      notifications.push({
        type: "critical_stock",
        severity: "high",
        title: "Stok kritis",
        message: `${asset.commodity} di ${asset.warehouse_id} berada di bawah ambang minimum.`,
        created_at: asset.updated_at || asset.created_at,
      });
    }
  }

  for (const req of urgentRequests) {
    if (req.status === "mendesak" || req.priority === "critical" || req.priority === "high") {
      notifications.push({
        type: "urgent_request",
        severity: req.priority === "critical" ? "critical" : "high",
        title: `Request ${req.status === "mendesak" ? "mendesak" : "urgent"}`,
        message: `${req.request_code} - ${(req.items || []).map((i) => i.commodity).join(", ")}`,
        created_at: req.created_at,
      });
    }
  }

  for (const anomaly of anomalies) {
    notifications.push({
      type: "ai_anomaly",
      severity: anomaly.severity || "medium",
      title: anomaly.anomaly_type || "Anomali",
      message: anomaly.message || `Terdeteksi anomali di ${anomaly.posko_name || anomaly.posko_id}`,
      created_at: anomaly.date || anomaly.synced_at,
    });
  }

  notifications.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return {
    ok: true,
    unread_count: notifications.length,
    notifications: notifications.slice(0, 20),
  };
}

async function getDocs(selector, limit) {
  const result = await findDocuments(selector, { limit });
  return result.docs || [];
}

function createDayBuckets(days, dayStart) {
  const result = [];
  const byDate = new Map();
  for (let index = days - 1; index >= 0; index -= 1) {
    const dateObj = new Date(dayStart);
    dateObj.setUTCDate(dayStart.getUTCDate() - index);
    const date = isoDate(dateObj);
    const bucket = {
      date,
      label: dateObj.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" }),
      kebutuhan: 0,
      persediaan: 0,
    };
    result.push(bucket);
    byDate.set(date, bucket);
  }
  return { days: result, byDate };
}

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function buildCategoryCommodities(assets) {
  const byCat = new Map();
  for (const asset of assets) {
    const cat = asset.category || "lainnya";
    if (!byCat.has(cat)) byCat.set(cat, new Set());
    byCat.get(cat).add(asset.commodity);
  }
  return Array.from(byCat.entries()).map(([cat, commodities]) => ({
    category: cat,
    label: CATEGORY_LABELS[cat] || cat,
    commodities: Array.from(commodities).sort(),
  }));
}

function matchAny(term, fields) {
  return fields.some((f) => f && String(f).toLowerCase().includes(term));
}
