import {
  createRequestDoc,
  createStockMovementDoc,
  validateLogShieldDocument,
  ValidationError,
} from "./document-schema.js";
import { bulkDocuments, findDocuments, getDocument, putDocument, putExistingDocument } from "./couchdb.js";
import { normalizeItemName } from "./ai.js";

const REQUEST_STATUSES = ["mendesak", "menunggu", "diproses", "selesai"];
const REQUEST_PRIORITIES = ["critical", "high", "normal", "low"];
const REQUEST_UNITS = ["kg", "liter", "pcs", "karton", "kit", "unit"];

const STATUS_META = {
  mendesak: {
    label: "Mendesak",
    color: "danger",
    action_label: "Proses Request",
    action_disabled: false,
  },
  menunggu: {
    label: "Menunggu",
    color: "warning",
    action_label: "Proses Request",
    action_disabled: false,
  },
  diproses: {
    label: "Diproses",
    color: "success",
    action_label: "Selesaikan",
    action_disabled: false,
  },
  selesai: {
    label: "Selesai",
    color: "info",
    action_label: "Selesai",
    action_disabled: true,
  },
};

export class RequestError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = "RequestError";
    this.statusCode = statusCode;
  }
}

export async function listRequests(query = {}) {
  const limit = clampLimit(query.limit, 100, 500);
  const docs = await getRequestDocs();
  const poskos = await getPoskoMap(docs.map((doc) => doc.posko_id));
  const rows = docs
    .filter((doc) => matchesFilters(doc, poskos.get(doc.posko_id), query))
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
    .slice(0, limit)
    .map((doc) => toRequestCard(doc, poskos.get(doc.posko_id)));

  return {
    ok: true,
    rows,
  };
}

export async function getRequestById(id) {
  const doc = await getRequestDocument(id);
  const posko = await getOptionalPosko(doc.posko_id);
  return {
    ok: true,
    request: doc,
    card: toRequestCard(doc, posko),
  };
}

export async function createRequest(input, actor, now = new Date()) {
  const payload = normalizeCreateInput(input);
  const existing = await findExistingByClientMutation(payload.client_mutation_id);
  if (existing) {
    const posko = await getOptionalPosko(existing.posko_id);
    return {
      ok: true,
      idempotent: true,
      request: existing,
      card: toRequestCard(existing, posko),
    };
  }
  await assertPoskoExists(payload.posko_id);
  const requestCode = await nextRequestCode(now);
  const doc = createRequestDoc({
    request_code: requestCode,
    posko_id: payload.posko_id,
    submitted_by: actor.user_id,
    items: payload.items,
    status: payload.status,
    priority: payload.priority,
  }, now);
  applySyncMetadata(doc, payload);

  const result = await putDocument(doc);
  const saved = { ...doc, _rev: result.rev };
  const posko = await getOptionalPosko(saved.posko_id);
  return {
    ok: true,
    request: saved,
    card: toRequestCard(saved, posko),
  };
}

export async function processRequest(id, actor, now = new Date()) {
  const doc = await getRequestDocument(id);
  if (!["mendesak", "menunggu"].includes(doc.status)) {
    throw new RequestError("Only mendesak or menunggu requests can be processed", 409);
  }
  const next = {
    ...doc,
    status: "diproses",
    processed_by: actor.user_id,
    processed_at: now.toISOString(),
    updated_at: now.toISOString(),
  };
  return saveRequest(next);
}

export async function completeRequest(id, actor, now = new Date()) {
  const doc = await getRequestDocument(id);
  if (doc.status !== "diproses") {
    throw new RequestError("Only diproses requests can be completed", 409);
  }

  const assetIds = doc.items
    .filter((item) => item.commodity)
    .map((item) => ({ commodity: normalizeItemName(item.commodity), quantity: item.quantity }));

  const distinctCommodities = [...new Set(assetIds.map((a) => a.commodity))];
  const assetResult = await findDocuments({ type: "asset" }, { limit: 500 });
  const allAssets = assetResult.docs || [];

  const bulk = [];
  const movements = [];

  for (const commodity of distinctCommodities) {
    const totalQty = assetIds
      .filter((a) => normalizeItemName(a.commodity) === commodity)
      .reduce((sum, a) => sum + a.quantity, 0);

    const matchingAssets = allAssets
      .filter((a) => a.commodity === commodity)
      .sort((a, b) => (b.quantity_available || 0) - (a.quantity_available || 0));

    if (matchingAssets.length === 0) {
      throw new RequestError(
        `No asset found for commodity "${commodity}". Cannot complete request.`,
        400
      );
    }

    let remaining = totalQty;
    for (const asset of matchingAssets) {
      if (remaining <= 0) break;
      const available = asset.quantity_available || 0;
      const deduct = Math.min(available, remaining);
      if (deduct <= 0) continue;

      remaining -= deduct;
      asset.quantity_available = available - deduct;
      asset.updated_at = now.toISOString();
      bulk.push(asset);

      movements.push(
        createStockMovementDoc(
          {
            warehouse_id: asset.warehouse_id || "gudang_pusat",
            commodity: asset.commodity,
            category: asset.category || "lainnya",
            quantity: deduct,
            unit: asset.unit || "unit",
            movement_type: "out",
            source: "request_completion",
            created_by: actor.user_id,
          },
          now
        )
      );
    }

    if (remaining > 0) {
      throw new RequestError(
        `Insufficient stock for "${commodity}": need ${totalQty}, only ${totalQty - remaining} available. Cannot complete request.`,
        400
      );
    }
  }

  const next = {
    ...doc,
    status: "selesai",
    updated_at: now.toISOString(),
  };

  bulk.push(next);
  bulk.push(...movements);

  const result = await bulkDocuments(bulk);
  const failed = result.find((row) => !row.ok);
  if (failed) {
    throw new ValidationError(
      failed.reason || failed.error || "Failed to complete request"
    );
  }

  return {
    ok: true,
    request: { ...next, _rev: result[bulk.indexOf(next)].rev },
    asset_changes: distinctCommodities.length,
    movement_count: movements.length,
  };
}

export async function patchRequest(id, input, actor, now = new Date()) {
  const doc = await getRequestDocument(id);
  if (doc.status === "selesai") {
    throw new RequestError("Completed requests cannot be updated", 409);
  }
  if (shouldSkipStaleClientUpdate(doc, input.client_updated_at)) {
    const posko = await getOptionalPosko(doc.posko_id);
    return {
      ok: true,
      skipped: true,
      conflict_resolution: "last_write_wins",
      request: doc,
      card: toRequestCard(doc, posko),
    };
  }

  const next = {
    ...doc,
    updated_at: input.client_updated_at || now.toISOString(),
  };
  applySyncMetadata(next, input);

  if (input.status !== undefined) {
    next.status = enumString(input.status, REQUEST_STATUSES, "status");
    if (next.status === "diproses" && !next.processed_by) {
      next.processed_by = actor.user_id;
      next.processed_at = now.toISOString();
    }
    if (["mendesak", "menunggu"].includes(next.status)) {
      next.processed_by = null;
      next.processed_at = null;
    }
  }
  if (input.priority !== undefined) {
    next.priority = enumString(input.priority, REQUEST_PRIORITIES, "priority");
  }
  if (input.items !== undefined) {
    next.items = normalizeItems(input.items);
  }

  return saveRequest(next);
}

async function saveRequest(doc) {
  validateLogShieldDocument(doc);
  const result = await putExistingDocument(doc);
  const saved = { ...doc, _rev: result.rev };
  const posko = await getOptionalPosko(saved.posko_id);
  return {
    ok: true,
    request: saved,
    card: toRequestCard(saved, posko),
  };
}

async function nextRequestCode(now) {
  const datePart = jakartaDatePart(now);
  const prefix = `REQ-${datePart}-`;
  const result = await findDocuments({ type: "request" }, { limit: 1000 });
  const maxSequence = (result.docs || [])
    .map((doc) => doc.request_code)
    .filter((code) => typeof code === "string" && code.startsWith(prefix))
    .map((code) => Number(code.slice(prefix.length)))
    .filter(Number.isFinite)
    .reduce((max, value) => Math.max(max, value), 0);
  return `${prefix}${String(maxSequence + 1).padStart(3, "0")}`;
}

async function getRequestDocs() {
  const result = await findDocuments({ type: "request" }, { limit: 1000 });
  return result.docs || [];
}

async function getRequestDocument(id) {
  const doc = await getDocument(id);
  if (doc.type !== "request") {
    throw new RequestError("Request not found", 404);
  }
  return doc;
}

async function assertPoskoExists(poskoId) {
  const posko = await getOptionalPosko(poskoId);
  if (!posko) {
    throw new RequestError("posko_id must reference an existing posko", 400);
  }
}

async function getPoskoMap(poskoIds) {
  const uniqueIds = [...new Set(poskoIds.filter(Boolean))];
  const entries = await Promise.all(uniqueIds.map(async (id) => [id, await getOptionalPosko(id)]));
  return new Map(entries.filter(([, posko]) => posko));
}

async function getOptionalPosko(id) {
  if (!id) return null;
  try {
    const doc = await getDocument(id);
    return doc.type === "posko" ? doc : null;
  } catch (error) {
    if (error.statusCode === 404) return null;
    throw error;
  }
}

function normalizeCreateInput(input = {}) {
  const status = input.status === undefined
    ? "menunggu"
    : enumString(input.status, ["mendesak", "menunggu"], "status");
  return {
    posko_id: requiredString(input.posko_id, "posko_id"),
    items: normalizeItems(input.items),
    status,
    priority: input.priority === undefined
      ? "normal"
      : enumString(input.priority, REQUEST_PRIORITIES, "priority"),
    client_mutation_id: optionalStringValue(input.client_mutation_id),
    client_updated_at: optionalIsoString(input.client_updated_at, "client_updated_at"),
    sync_source: optionalStringValue(input.sync_source),
  };
}

function normalizeItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new ValidationError("items must be a non-empty array");
  }
  return items.map((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new ValidationError(`items.${index} must be an object`);
    }
    return {
      commodity: normalizeItemName(requiredString(item.commodity, `items.${index}.commodity`)),
      quantity: positiveNumber(item.quantity, `items.${index}.quantity`),
      unit: enumString(item.unit, REQUEST_UNITS, `items.${index}.unit`),
      ...(item.note === undefined ? {} : { note: optionalString(item.note, `items.${index}.note`) }),
    };
  });
}

function matchesFilters(doc, posko, query) {
  if (query.status && doc.status !== query.status) return false;
  if (query.posko_id && doc.posko_id !== query.posko_id) return false;
  if (query.commodity && !doc.items.some((item) => includesText(item.commodity, query.commodity))) return false;
  if (query.date_from && doc.created_at.slice(0, 10) < query.date_from) return false;
  if (query.date_to && doc.created_at.slice(0, 10) > query.date_to) return false;
  if (query.search) {
    const searchable = [
      doc.request_code,
      doc.status,
      doc.priority,
      posko?.name,
      posko?.district,
      posko?.province,
      ...doc.items.flatMap((item) => [item.commodity, item.note]),
    ];
    if (!searchable.some((value) => includesText(value, query.search))) return false;
  }
  return true;
}

function toRequestCard(doc, posko) {
  const meta = STATUS_META[doc.status] || STATUS_META.menunggu;
  return {
    id: doc._id,
    request_code: doc.request_code,
    title: posko?.name || doc.posko_id,
    location: [posko?.district, posko?.province].filter(Boolean).join(", "),
    status: doc.status,
    status_label: meta.label,
    status_color: meta.color,
    priority: doc.priority,
    date: formatDateWib(doc.created_at),
    time: formatTimeWib(doc.created_at),
    created_at: doc.created_at,
    updated_at: doc.updated_at,
    processed_by: doc.processed_by,
    processed_at: doc.processed_at,
    submitted_by: doc.submitted_by,
    posko_id: doc.posko_id,
    items: doc.items.map(toCardItem),
    action_label: meta.action_label,
    action_disabled: meta.action_disabled,
  };
}

function toCardItem(item) {
  return {
    name: item.commodity,
    quantity: `${item.quantity} ${item.unit}`,
    keterangan: item.note || "-",
  };
}

function jakartaDatePart(date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${byType.year}${byType.month}${byType.day}`;
}

function formatDateWib(value) {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

function formatTimeWib(value) {
  return `${new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value))} WIB`;
}

function clampLimit(value, defaultValue, maxValue) {
  const number = Number(value || defaultValue);
  if (!Number.isFinite(number) || number < 1) return defaultValue;
  return Math.min(Math.trunc(number), maxValue);
}

function includesText(value, query) {
  return String(value || "").toLowerCase().includes(String(query || "").toLowerCase());
}

function requiredString(value, field) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new ValidationError(`${field} must be a non-empty string`);
  }
  return value.trim();
}

function optionalString(value, field) {
  if (typeof value !== "string") {
    throw new ValidationError(`${field} must be a string`);
  }
  return value.trim();
}

function optionalStringValue(value) {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") {
    throw new ValidationError("client metadata must be a string");
  }
  return value.trim();
}

function optionalIsoString(value, field) {
  if (value === undefined || value === null || value === "") return undefined;
  const text = optionalString(value, field);
  if (Number.isNaN(Date.parse(text))) {
    throw new ValidationError(`${field} must be an ISO timestamp`);
  }
  return text;
}

function applySyncMetadata(doc, input = {}) {
  if (input.client_mutation_id) doc.client_mutation_id = input.client_mutation_id;
  if (input.client_updated_at) {
    doc.client_updated_at = input.client_updated_at;
    doc.updated_at = input.client_updated_at;
  }
  if (input.sync_source) doc.sync_source = input.sync_source;
}

async function findExistingByClientMutation(clientMutationId) {
  if (!clientMutationId) return null;
  const result = await findDocuments(
    { type: "request", client_mutation_id: clientMutationId },
    { limit: 1 }
  );
  return result.docs?.[0] || null;
}

function shouldSkipStaleClientUpdate(doc, clientUpdatedAt) {
  if (!clientUpdatedAt) return false;
  const clientTime = Date.parse(clientUpdatedAt);
  const serverTime = Date.parse(doc.updated_at || doc.created_at || 0);
  return Number.isFinite(clientTime) && Number.isFinite(serverTime) && clientTime < serverTime;
}

function enumString(value, values, field) {
  const text = requiredString(value, field);
  if (!values.includes(text)) {
    throw new ValidationError(`${field} must be one of: ${values.join(", ")}`);
  }
  return text;
}

function positiveNumber(value, field) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) {
    throw new ValidationError(`${field} must be a positive number`);
  }
  return number;
}
