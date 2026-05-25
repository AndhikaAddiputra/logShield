import {
  createStockMovementDoc,
  validateLogShieldDocument,
  ValidationError,
} from "./document-schema.js";
import { bulkDocuments, findDocuments, getDocument, putExistingDocument } from "./couchdb.js";
import { normalizeItemName } from "./ai.js";

const CATEGORY_META = {
  sandang: {
    title: "Sandang",
    subtitle: "Pakaian & Kebutuhan Berpakaian",
  },
  pangan: {
    title: "Pangan",
    subtitle: "Kebutuhan Pangan & Nutrisi",
  },
  papan: {
    title: "Papan",
    subtitle: "Material Shelter & Bangunan",
  },
  lainnya: {
    title: "Lainnya",
    subtitle: "Kebutuhan Lainnya",
  },
};

export async function getStockSummary(now = new Date()) {
  const [assets, distributions, poskos] = await Promise.all([
    getDocs({ type: "asset" }, 1000),
    getDocs({ type: "distribution" }, 1000),
    getDocs({ type: "posko" }, 1000),
  ]);

  const today = isoDate(now);
  const todayDistributions = distributions.filter((doc) => isoDate(new Date(doc.created_at)) === today);
  const servedPoskos = new Set(todayDistributions.map((doc) => doc.posko_id).filter(Boolean));
  const updatedAt = latestTimestamp([
    ...assets.map((doc) => doc.updated_at || doc.created_at),
    ...distributions.map((doc) => doc.created_at),
    ...poskos.map((doc) => doc.updated_at || doc.created_at),
  ]) || now.toISOString();

  return {
    ok: true,
    updated_at: updatedAt,
    total_item: sum(assets, "quantity_available"),
    critical_count: assets.filter(isCritical).length,
    distribution_today: sum(todayDistributions, "quantity"),
    posko_served: servedPoskos.size,
    active_posko_count: poskos.filter((doc) => doc.status === "active").length,
  };
}

export async function getStockCategories() {
  const assets = await getDocs({ type: "asset" }, 1000);
  return {
    ok: true,
    categories: Object.entries(CATEGORY_META).map(([category, meta]) => {
      const items = assets
        .filter((asset) => asset.category === category)
        .sort((a, b) => a.commodity.localeCompare(b.commodity))
        .map(toCategoryItem);
      return {
        category,
        ...meta,
        item_count: items.length,
        items,
      };
    }),
  };
}

export async function getStockTrend(days = 7, now = new Date()) {
  const safeDays = Math.max(1, Math.min(Number(days) || 7, 31));
  const buckets = createDayBuckets(safeDays, now);
  const startDate = buckets.days[0].date;

  const [movements, distributions] = await Promise.all([
    getDocs({ type: "stock_movement" }, 1000),
    getDocs({ type: "distribution" }, 1000),
  ]);

  for (const movement of movements) {
    const date = isoDate(new Date(movement.created_at));
    if (date < startDate || !buckets.byDate.has(date)) continue;
    if (movement.movement_type === "in") {
      buckets.byDate.get(date).masuk += movement.quantity;
    }
  }

  for (const distribution of distributions) {
    const date = isoDate(new Date(distribution.created_at));
    if (date < startDate || !buckets.byDate.has(date)) continue;
    buckets.byDate.get(date).keluar += distribution.quantity;
  }

  return {
    ok: true,
    days: buckets.days.map(({ date, label, masuk, keluar }) => ({
      date,
      label,
      masuk,
      keluar,
    })),
  };
}

export async function addStock(input, actor, now = new Date()) {
  const payload = normalizeAddStockInput(input);
  const assetId = `asset::${payload.warehouse_id}::${payload.commodity}`;
  let existingAsset = null;
  try {
    existingAsset = await getDocument(assetId);
  } catch (error) {
    if (error.statusCode !== 404) throw error;
  }

  const asset = {
    ...(existingAsset || {
      _id: assetId,
      type: "asset",
      warehouse_id: payload.warehouse_id,
      commodity: payload.commodity,
      last_sensor_weight_g: null,
      last_sensor_update: null,
      created_at: now.toISOString(),
    }),
    category: payload.category,
    quantity_available: (existingAsset?.quantity_available || 0) + payload.quantity,
    unit: payload.unit,
    min_threshold: payload.min_threshold ?? existingAsset?.min_threshold ?? 0,
    updated_at: now.toISOString(),
  };

  validateLogShieldDocument(asset);
  const movement = createStockMovementDoc({
    warehouse_id: payload.warehouse_id,
    commodity: payload.commodity,
    category: payload.category,
    quantity: payload.quantity,
    unit: payload.unit,
    movement_type: "in",
    source: "manual",
    created_by: actor.user_id,
  }, now);

  const result = await bulkDocuments([asset, movement]);
  const failed = result.find((row) => !row.ok);
  if (failed) {
    throw new ValidationError(failed.reason || failed.error || "Failed to add stock");
  }

  return {
    ok: true,
    asset: { ...asset, _rev: result[0].rev },
    movement: { ...movement, _rev: result[1].rev },
  };
}

async function getDocs(selector, limit) {
  const result = await findDocuments(selector, { limit });
  return result.docs || [];
}

function normalizeAddStockInput(input = {}) {
  return {
    warehouse_id: requiredString(input.warehouse_id, "warehouse_id"),
    commodity: normalizeItemName(requiredString(input.commodity, "commodity")),
    category: requiredString(input.category, "category"),
    quantity: positiveNumber(input.quantity, "quantity"),
    unit: requiredString(input.unit, "unit"),
    min_threshold: input.min_threshold === undefined
      ? undefined
      : nonNegativeNumber(input.min_threshold, "min_threshold"),
  };
}

function toCategoryItem(asset) {
  return {
    _id: asset._id,
    commodity: asset.commodity,
    quantity_available: asset.quantity_available,
    unit: asset.unit,
    min_threshold: asset.min_threshold,
    is_critical: isCritical(asset),
    progress: stockProgress(asset),
  };
}

export async function deleteAsset(id) {
  let doc;
  try {
    doc = await getDocument(id);
  } catch (error) {
    if (error.statusCode === 404) {
      throw new ValidationError(`Asset tidak ditemukan: ${id}`);
    }
    throw error;
  }
  if (doc.type !== "asset") {
    throw new ValidationError("Document is not an asset");
  }
  await putExistingDocument({ ...doc, _deleted: true });
  return { ok: true };
}

function isCritical(asset) {
  return asset.quantity_available < asset.min_threshold;
}

function stockProgress(asset) {
  const target = Math.max(asset.min_threshold * 2, asset.quantity_available, 1);
  return Math.min(100, Math.round((asset.quantity_available / target) * 100));
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
      label: dateObj.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" }),
      masuk: 0,
      keluar: 0,
    };
    result.push(bucket);
    byDate.set(date, bucket);
  }
  return { days: result, byDate };
}

function latestTimestamp(values) {
  return values
    .filter(Boolean)
    .sort((a, b) => Date.parse(b) - Date.parse(a))[0] || null;
}

export async function updateAsset(id, input = {}, now = new Date()) {
  const doc = await getDocument(id);
  if (doc.type !== "asset") {
    throw new ValidationError("Document is not an asset");
  }
  if (shouldSkipStaleClientUpdate(doc, input.client_updated_at)) {
    return {
      ok: true,
      skipped: true,
      conflict_resolution: "last_write_wins",
      asset: doc,
    };
  }

  const ALLOWED_FIELDS = ["category", "commodity", "unit", "min_threshold"];
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined || value === null) continue;
    if (!ALLOWED_FIELDS.includes(key)) continue;
    if (key === "min_threshold") {
      doc[key] = Number(value);
    } else if (key === "commodity") {
      doc[key] = normalizeItemName(value);
    } else {
      doc[key] = String(value);
    }
  }

  doc.updated_at = input.client_updated_at || now.toISOString();
  applySyncMetadata(doc, input);
  validateLogShieldDocument(doc);
  const result = await putExistingDocument(doc);
  return {
    ok: true,
    asset: { ...doc, _rev: result.rev },
  };
}

function applySyncMetadata(doc, input = {}) {
  if (typeof input.client_mutation_id === "string" && input.client_mutation_id.trim()) {
    doc.client_mutation_id = input.client_mutation_id.trim();
  }
  if (typeof input.client_updated_at === "string" && input.client_updated_at.trim()) {
    doc.client_updated_at = input.client_updated_at.trim();
  }
  if (typeof input.sync_source === "string" && input.sync_source.trim()) {
    doc.sync_source = input.sync_source.trim();
  }
}

function shouldSkipStaleClientUpdate(doc, clientUpdatedAt) {
  if (!clientUpdatedAt) return false;
  const clientTime = Date.parse(clientUpdatedAt);
  const serverTime = Date.parse(doc.updated_at || doc.created_at || 0);
  return Number.isFinite(clientTime) && Number.isFinite(serverTime) && clientTime < serverTime;
}

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function sum(docs, field) {
  return docs.reduce((total, doc) => total + (Number(doc[field]) || 0), 0);
}

function requiredString(value, field) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new ValidationError(`${field} must be a non-empty string`);
  }
  return value.trim();
}

function positiveNumber(value, field) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) {
    throw new ValidationError(`${field} must be a positive number`);
  }
  return number;
}

function nonNegativeNumber(value, field) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) {
    throw new ValidationError(`${field} must be a non-negative number`);
  }
  return number;
}
