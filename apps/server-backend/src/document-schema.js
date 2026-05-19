import { randomUUID } from "node:crypto";

export const INDEX_FIELDS = [
  "type",
  "kib_16",
  "posko_id",
  "warehouse_id",
  "node_id",
  "commodity",
  "request_code",
  "status",
  "priority",
  "created_at",
  "updated_at",
  "timestamp",
  "prediction_date",
  "target_type",
  "target_id",
  "user_id",
  "submitted_by",
  "processed_by",
  "email",
  "nik",
  "role",
  "kib_bencana_id",
  "province",
  "district",
  "nik_lookup_hash",
  "reviewed_by",
  "movement_type",
  "source",
  "run_id",
  "risk_level",
  "severity",
  "anomaly_type",
  "forecast_date",
  "date",
  "notifications",
];

const userRoles = ["admin", "koordinator", "lapangan"];
const poskoStatuses = ["active", "inactive", "closed"];
const signupRequestStatuses = ["pending", "approved", "rejected"];
const authCredentialStatuses = ["active", "inactive"];
const emailOutboxStatuses = ["queued", "sent", "failed"];
const distributionUnits = ["kg", "liter", "pcs", "karton", "kit"];
const assetUnits = ["kg", "pcs", "karton", "unit"];
const vulnerableGroups = ["umum", "balita", "lansia", "ibu_hamil", "disabilitas"];
const requestStatuses = ["mendesak", "menunggu", "diproses", "selesai"];
const requestPriorities = ["critical", "high", "normal", "low"];
const assetCategories = ["sandang", "pangan", "papan", "lainnya"];
const auditStatuses = ["sukses", "ditolak", "timeout", "error"];
const stockMovementTypes = ["in", "out"];
const stockMovementSources = ["manual", "distribution", "sensor"];

export function validateLogShieldDocument(doc) {
  assertObject(doc, "document");
  switch (doc.type) {
    case "user":
      return validateUser(doc);
    case "posko":
      return validatePosko(doc);
    case "signup_request":
      return validateSignupRequest(doc);
    case "auth_credential":
      return validateAuthCredential(doc);
    case "email_outbox":
      return validateEmailOutbox(doc);
    case "user_settings":
      return validateUserSettings(doc);
    case "distribution":
      return validateDistribution(doc);
    case "stock_reading":
      return validateStockReading(doc);
    case "prediction":
      return validatePrediction(doc);
    case "ai_run_summary":
      return validateAiRunSummary(doc);
    case "ai_recommendation":
      return validateAiRecommendation(doc);
    case "ai_anomaly":
      return validateAiAnomaly(doc);
    case "request":
      return validateRequest(doc);
    case "asset":
      return validateAsset(doc);
    case "stock_movement":
      return validateStockMovement(doc);
    case "audit_log":
      return validateAuditLog(doc);
    default:
      throw new ValidationError("type must be a supported LogShield document type");
  }
}

export function createStockReadingDoc(payload, now = new Date()) {
  assertObject(payload, "payload");
  const timestamp = optionalString(payload.timestamp) || now.toISOString();
  const timestampMs = Date.parse(timestamp);
  if (Number.isNaN(timestampMs)) {
    throw new ValidationError("timestamp must be an ISO 8601 timestamp");
  }

  const doc = {
    _id: `stock_reading::${requiredString(payload.warehouse_id, "warehouse_id")}::${requiredString(payload.node_id, "node_id")}::${timestampMs}`,
    type: "stock_reading",
    warehouse_id: payload.warehouse_id,
    node_id: payload.node_id,
    commodity: requiredString(payload.commodity, "commodity"),
    weight_g: requiredNumber(payload.weight_g, "weight_g"),
    weight_delta_g: requiredNumber(payload.weight_delta_g, "weight_delta_g"),
    sample_count: payload.sample_count === undefined ? 15 : requiredNumber(payload.sample_count, "sample_count"),
    rssi: requiredNumber(payload.rssi, "rssi"),
    uptime_s: requiredNumber(payload.uptime_s, "uptime_s"),
    battery_mv: nullableNumber(payload.battery_mv, "battery_mv"),
    timestamp,
    created_at: now.toISOString(),
  };
  validateStockReading(doc);
  return doc;
}

export function createAuditLogDoc(
  {
    user_id = null,
    action,
    target_type,
    target_id = null,
    old_values = null,
    new_values = null,
    ip_address,
    status,
  },
  now = new Date()
) {
  const doc = {
    _id: `audit_log::${now.getTime()}::${randomUUID()}`,
    type: "audit_log",
    user_id,
    action,
    target_type,
    target_id,
    old_values,
    new_values,
    ip_address,
    status,
    created_at: now.toISOString(),
  };
  validateAuditLog(doc);
  return doc;
}

export function applySensorReadingToAsset(asset, reading, now = new Date()) {
  const next = {
    ...(asset || {
      _id: `asset::${reading.warehouse_id}::${reading.commodity}`,
      type: "asset",
      warehouse_id: reading.warehouse_id,
      commodity: reading.commodity,
      category: "lainnya",
      quantity_available: 0,
      unit: "kg",
      min_threshold: 0,
      last_sensor_weight_g: null,
      last_sensor_update: null,
      created_at: now.toISOString(),
    }),
    last_sensor_weight_g: reading.weight_g,
    last_sensor_update: reading.timestamp,
    updated_at: now.toISOString(),
  };
  validateAsset(next);
  return next;
}

export function createPoskoDoc(payload, now = new Date()) {
  assertObject(payload, "payload");
  const doc = {
    _id: `posko::${randomUUID()}`,
    type: "posko",
    kib_16: requiredString(payload.kib_16, "kib_16"),
    name: requiredString(payload.name, "name"),
    address: requiredString(payload.address, "address"),
    province: requiredString(payload.province, "province"),
    district: requiredString(payload.district, "district"),
    total_pengungsi: requiredNumber(payload.total_pengungsi, "total_pengungsi"),
    count_balita: requiredNumber(payload.count_balita, "count_balita"),
    count_lansia: requiredNumber(payload.count_lansia, "count_lansia"),
    count_perempuan: requiredNumber(payload.count_perempuan, "count_perempuan"),
    count_pria: requiredNumber(payload.count_pria, "count_pria"),
    count_disabilitas: requiredNumber(payload.count_disabilitas, "count_disabilitas"),
    pj_name: requiredString(payload.pj_name, "pj_name"),
    pj_phone: requiredString(payload.pj_phone, "pj_phone"),
    status: payload.status || "active",
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  };
  validatePosko(doc);
  return doc;
}

export function createStockMovementDoc(
  {
    warehouse_id,
    commodity,
    category,
    quantity,
    unit,
    movement_type,
    source,
    created_by,
  },
  now = new Date()
) {
  const doc = {
    _id: `stock_movement::${now.getTime()}::${randomUUID()}`,
    type: "stock_movement",
    warehouse_id,
    commodity,
    category,
    quantity,
    unit,
    movement_type,
    source,
    created_by,
    created_at: now.toISOString(),
  };
  validateStockMovement(doc);
  return doc;
}

export function createRequestDoc(
  {
    request_code,
    posko_id,
    submitted_by,
    items,
    status = "menunggu",
    priority = "normal",
  },
  now = new Date()
) {
  const doc = {
    _id: `request::${request_code}`,
    type: "request",
    request_code,
    posko_id,
    submitted_by,
    items,
    status,
    priority,
    processed_by: null,
    processed_at: null,
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  };
  validateRequest(doc);
  return doc;
}

export function validateSignupInput({ email: emailValue, name, nik, password, phone, avatar_url }) {
  email(emailValue, "email");
  requiredString(name, "name");
  match(nik, /^\d{16}$/, "nik");
  passwordValue(password, "password");
  requiredString(phone, "phone");
  optionalString(avatar_url, "avatar_url");
}

export function validateApprovalInput({ role, kib_bencana_id, posko_id, email: emailValue, name, phone, avatar_url }) {
  enumValue(role, userRoles, "role");
  match(kib_bencana_id, /^BNC-\d{4}-[A-Z0-9]{2}-\d{4}$/, "kib_bencana_id");
  nullablePoskoId(posko_id, "posko_id");
  if (emailValue !== undefined) email(emailValue, "email");
  optionalString(name, "name");
  optionalString(phone, "phone");
  optionalString(avatar_url, "avatar_url");
}

function validateUser(doc) {
  requireId(doc, /^user::[^:]+$/);
  exact(doc.type, "user", "type");
  email(doc.email, "email");
  requiredString(doc.name, "name");
  encryptedNik(doc.nik, "nik");
  match(doc.kib_bencana_id, /^BNC-\d{4}-[A-Z0-9]{2}-\d{4}$/, "kib_bencana_id");
  enumValue(doc.role, userRoles, "role");
  nullablePoskoId(doc.posko_id, "posko_id");
  requiredString(doc.phone, "phone");
  optionalString(doc.avatar_url, "avatar_url");
  isoTimestamp(doc.created_at, "created_at");
  isoTimestamp(doc.updated_at, "updated_at");
  return doc;
}

function validatePosko(doc) {
  requireId(doc, /^posko::[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  exact(doc.type, "posko", "type");
  match(doc.kib_16, /^\d{16}$/, "kib_16");
  requiredString(doc.name, "name");
  requiredString(doc.address, "address");
  requiredString(doc.province, "province");
  requiredString(doc.district, "district");
  requiredNumber(doc.total_pengungsi, "total_pengungsi");
  requiredNumber(doc.count_balita, "count_balita");
  requiredNumber(doc.count_lansia, "count_lansia");
  requiredNumber(doc.count_perempuan, "count_perempuan");
  requiredNumber(doc.count_pria, "count_pria");
  requiredNumber(doc.count_disabilitas, "count_disabilitas");
  requiredString(doc.pj_name, "pj_name");
  requiredString(doc.pj_phone, "pj_phone");
  enumValue(doc.status, poskoStatuses, "status");
  isoTimestamp(doc.created_at, "created_at");
  isoTimestamp(doc.updated_at, "updated_at");
  return doc;
}

function validateSignupRequest(doc) {
  requireId(doc, /^signup_request::[^:]+$/);
  exact(doc.type, "signup_request", "type");
  email(doc.email, "email");
  requiredString(doc.name, "name");
  encryptedNik(doc.nik, "nik");
  requiredString(doc.nik_lookup_hash, "nik_lookup_hash");
  requiredString(doc.phone, "phone");
  optionalString(doc.avatar_url, "avatar_url");
  enumValue(doc.status, signupRequestStatuses, "status");
  nullableString(doc.reviewed_by, "reviewed_by");
  nullableIsoTimestamp(doc.reviewed_at, "reviewed_at");
  nullableString(doc.rejection_reason, "rejection_reason");
  isoTimestamp(doc.created_at, "created_at");
  isoTimestamp(doc.updated_at, "updated_at");
  return doc;
}

function validateAuthCredential(doc) {
  requireId(doc, /^auth_credential::user::[^:]+$/);
  exact(doc.type, "auth_credential", "type");
  match(doc.user_id, /^user::[^:]+$/, "user_id");
  email(doc.email, "email");
  encryptedNik(doc.nik, "nik");
  requiredString(doc.nik_lookup_hash, "nik_lookup_hash");
  requiredString(doc.password_hash, "password_hash");
  enumValue(doc.status, authCredentialStatuses, "status");
  requiredString(doc.couch_username, "couch_username");
  requiredString(doc.couch_password_enc, "couch_password_enc");
  isoTimestamp(doc.created_at, "created_at");
  isoTimestamp(doc.updated_at, "updated_at");
  return doc;
}

function validateEmailOutbox(doc) {
  requireId(doc, /^email_outbox::\d+::[^:]+$/);
  exact(doc.type, "email_outbox", "type");
  email(doc.to, "to");
  requiredString(doc.subject, "subject");
  requiredString(doc.body, "body");
  enumValue(doc.status, emailOutboxStatuses, "status");
  nullableString(doc.related_signup_id, "related_signup_id");
  nullableString(doc.related_user_id, "related_user_id");
  isoTimestamp(doc.created_at, "created_at");
  nullableIsoTimestamp(doc.sent_at, "sent_at");
  return doc;
}

function validateUserSettings(doc) {
  requireId(doc, /^user_settings::user::[^:]+$/);
  exact(doc.type, "user_settings", "type");
  match(doc.user_id, /^user::[^:]+$/, "user_id");
  assertObject(doc.notifications, "notifications");
  requiredBoolean(doc.notifications.email, "notifications.email");
  requiredBoolean(doc.notifications.app, "notifications.app");
  requiredBoolean(doc.notifications.sms, "notifications.sms");
  isoTimestamp(doc.created_at, "created_at");
  isoTimestamp(doc.updated_at, "updated_at");
  return doc;
}

function validateDistribution(doc) {
  requireId(doc, /^distribution::\d{16}::[^:]+$/);
  exact(doc.type, "distribution", "type");
  match(doc.kib_16, /^\d{16}$/, "kib_16");
  requiredString(doc.posko_id, "posko_id");
  requiredString(doc.officer_id, "officer_id");
  requiredString(doc.commodity, "commodity");
  requiredNumber(doc.quantity, "quantity");
  enumValue(doc.unit, distributionUnits, "unit");
  requiredString(doc.recipient_kib, "recipient_kib");
  nullableEnum(doc.vulnerable_group, vulnerableGroups, "vulnerable_group");
  optionalString(doc.notes, "notes");
  requiredBoolean(doc.synced, "synced");
  isoTimestamp(doc.created_at, "created_at");
  nullableIsoTimestamp(doc.synced_at, "synced_at");
  return doc;
}

function validateStockReading(doc) {
  requireId(doc, /^stock_reading::[^:]+::[^:]+::\d+$/);
  exact(doc.type, "stock_reading", "type");
  requiredString(doc.warehouse_id, "warehouse_id");
  requiredString(doc.node_id, "node_id");
  requiredString(doc.commodity, "commodity");
  requiredNumber(doc.weight_g, "weight_g");
  requiredNumber(doc.weight_delta_g, "weight_delta_g");
  requiredNumber(doc.sample_count, "sample_count");
  requiredNumber(doc.rssi, "rssi");
  requiredNumber(doc.uptime_s, "uptime_s");
  nullableNumber(doc.battery_mv, "battery_mv");
  isoTimestamp(doc.timestamp, "timestamp");
  isoTimestamp(doc.created_at, "created_at");
  return doc;
}

function validatePrediction(doc) {
  requireId(doc, /^prediction::.+::[^:]+::\d{4}-\d{2}-\d{2}$/);
  exact(doc.type, "prediction", "type");
  requiredString(doc.posko_id, "posko_id");
  requiredString(doc.commodity, "commodity");
  isoDate(doc.prediction_date, "prediction_date");
  requiredNumber(doc.predicted_kg, "predicted_kg");
  requiredNumber(doc.confidence_low, "confidence_low");
  requiredNumber(doc.confidence_high, "confidence_high");
  if (doc.confidence_low > doc.predicted_kg || doc.predicted_kg > doc.confidence_high) {
    throw new ValidationError("predicted_kg must be within confidence_low and confidence_high");
  }
  requiredNumber(doc.mae_last_7d, "mae_last_7d");
  assertObject(doc.shap_values, "shap_values");
  for (const [key, value] of Object.entries(doc.shap_values)) {
    requiredNumber(value, `shap_values.${key}`);
  }
  if (!Array.isArray(doc.rationale_chips)) {
    throw new ValidationError("rationale_chips must be an array");
  }
  doc.rationale_chips.forEach((chip, index) => {
    assertObject(chip, `rationale_chips.${index}`);
    requiredString(chip.feature, `rationale_chips.${index}.feature`);
    requiredString(chip.narrative, `rationale_chips.${index}.narrative`);
    requiredNumber(chip.shap_value, `rationale_chips.${index}.shap_value`);
  });
  requiredString(doc.model_version, "model_version");
  isoTimestamp(doc.created_at, "created_at");
  return doc;
}

function validateAiRunSummary(doc) {
  requireId(doc, /^ai_run_summary::\d+::[^:]+$/);
  exact(doc.type, "ai_run_summary", "type");
  requiredString(doc.status, "status");
  assertObject(doc.dataset, "dataset");
  assertObject(doc.forecasting, "forecasting");
  assertObject(doc.recommendation_counts, "recommendation_counts");
  assertObject(doc.anomaly_counts, "anomaly_counts");
  isoTimestamp(doc.synced_at, "synced_at");
  return doc;
}

function validateAiRecommendation(doc) {
  requireId(doc, /^ai_recommendation::\d+::[^:]+::\d{4}$/);
  exact(doc.type, "ai_recommendation", "type");
  requiredString(doc.run_id, "run_id");
  isoDate(doc.forecast_date, "forecast_date");
  requiredString(doc.kib_bencana_id, "kib_bencana_id");
  requiredString(doc.disaster_type, "disaster_type");
  requiredString(doc.posko_id, "posko_id");
  requiredString(doc.posko_name, "posko_name");
  requiredString(doc.item_name, "item_name");
  requiredString(doc.unit, "unit");
  requiredNumber(doc.recommended_qty, "recommended_qty");
  requiredNumber(doc.shortage_qty, "shortage_qty");
  requiredNumber(doc.coverage_days, "coverage_days");
  enumValue(doc.risk_level, ["aman", "waspada", "kritis"], "risk_level");
  requiredNumber(doc.priority_score, "priority_score");
  requiredNumber(doc.trust_score, "trust_score");
  stringArray(doc.rationale_chips, "rationale_chips");
  isoTimestamp(doc.synced_at, "synced_at");
  return doc;
}

function validateAiAnomaly(doc) {
  requireId(doc, /^ai_anomaly::\d+::[^:]+::\d{4}$/);
  exact(doc.type, "ai_anomaly", "type");
  requiredString(doc.run_id, "run_id");
  isoDate(doc.date, "date");
  requiredString(doc.kib_bencana_id, "kib_bencana_id");
  requiredString(doc.disaster_type, "disaster_type");
  requiredString(doc.posko_id, "posko_id");
  requiredString(doc.posko_name, "posko_name");
  requiredString(doc.item_name, "item_name");
  requiredString(doc.unit, "unit");
  requiredString(doc.anomaly_type, "anomaly_type");
  enumValue(doc.severity, ["low", "medium", "high"], "severity");
  requiredNumber(doc.score, "score");
  requiredString(doc.message, "message");
  requiredString(doc.action_suggestion, "action_suggestion");
  isoTimestamp(doc.synced_at, "synced_at");
  return doc;
}

function validateRequest(doc) {
  requireId(doc, /^request::REQ-\d{8}-\d{3}$/);
  exact(doc.type, "request", "type");
  match(doc.request_code, /^REQ-\d{8}-\d{3}$/, "request_code");
  requiredString(doc.posko_id, "posko_id");
  requiredString(doc.submitted_by, "submitted_by");
  if (!Array.isArray(doc.items) || doc.items.length === 0) {
    throw new ValidationError("items must be a non-empty array");
  }
  doc.items.forEach((item, index) => {
    assertObject(item, `items.${index}`);
    requiredString(item.commodity, `items.${index}.commodity`);
    requiredNumber(item.quantity, `items.${index}.quantity`);
    enumValue(item.unit, [...new Set([...distributionUnits, ...assetUnits])], `items.${index}.unit`);
    optionalString(item.note, `items.${index}.note`);
  });
  enumValue(doc.status, requestStatuses, "status");
  enumValue(doc.priority, requestPriorities, "priority");
  nullableString(doc.processed_by, "processed_by");
  nullableIsoTimestamp(doc.processed_at, "processed_at");
  isoTimestamp(doc.created_at, "created_at");
  isoTimestamp(doc.updated_at, "updated_at");
  return doc;
}

function validateAsset(doc) {
  requireId(doc, /^asset::[^:]+::[^:]+$/);
  exact(doc.type, "asset", "type");
  requiredString(doc.warehouse_id, "warehouse_id");
  requiredString(doc.commodity, "commodity");
  enumValue(doc.category, assetCategories, "category");
  requiredNumber(doc.quantity_available, "quantity_available");
  enumValue(doc.unit, assetUnits, "unit");
  requiredNumber(doc.min_threshold, "min_threshold");
  nullableNumber(doc.last_sensor_weight_g, "last_sensor_weight_g");
  nullableIsoTimestamp(doc.last_sensor_update, "last_sensor_update");
  isoTimestamp(doc.created_at, "created_at");
  isoTimestamp(doc.updated_at, "updated_at");
  return doc;
}

function validateStockMovement(doc) {
  requireId(doc, /^stock_movement::\d+::[^:]+$/);
  exact(doc.type, "stock_movement", "type");
  requiredString(doc.warehouse_id, "warehouse_id");
  requiredString(doc.commodity, "commodity");
  enumValue(doc.category, assetCategories, "category");
  requiredNumber(doc.quantity, "quantity");
  enumValue(doc.unit, assetUnits, "unit");
  enumValue(doc.movement_type, stockMovementTypes, "movement_type");
  enumValue(doc.source, stockMovementSources, "source");
  requiredString(doc.created_by, "created_by");
  isoTimestamp(doc.created_at, "created_at");
  return doc;
}

function validateAuditLog(doc) {
  requireId(doc, /^audit_log::\d+::[^:]+$/);
  exact(doc.type, "audit_log", "type");
  nullableString(doc.user_id, "user_id");
  requiredString(doc.action, "action");
  requiredString(doc.target_type, "target_type");
  nullableString(doc.target_id, "target_id");
  nullableObject(doc.old_values, "old_values");
  nullableObject(doc.new_values, "new_values");
  requiredString(doc.ip_address, "ip_address");
  enumValue(doc.status, auditStatuses, "status");
  isoTimestamp(doc.created_at, "created_at");
  return doc;
}

function email(value, field) {
  requiredString(value, field);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    throw new ValidationError(`${field} must be a valid email`);
  }
}

function encryptedNik(value, field) {
  requiredString(value, field);
  if (/^\d{16}$/.test(value)) {
    throw new ValidationError(`${field} must be AES-256 encrypted, not raw 16-digit NIK`);
  }
}

function passwordValue(value, field) {
  requiredString(value, field);
  if (value.length < 8) {
    throw new ValidationError(`${field} must be at least 8 characters`);
  }
}

function nullablePoskoId(value, field) {
  if (value === null) return null;
  requiredString(value, field);
  if (!/^posko::[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
    throw new ValidationError(`${field} must be null or posko::{uuid}`);
  }
}

function requireId(doc, pattern) {
  requiredString(doc._id, "_id");
  if (!pattern.test(doc._id)) {
    throw new ValidationError(`_id has invalid format for ${doc.type}`);
  }
}

function exact(value, expected, field) {
  if (value !== expected) {
    throw new ValidationError(`${field} must be ${expected}`);
  }
}

function match(value, pattern, field) {
  requiredString(value, field);
  if (!pattern.test(value)) {
    throw new ValidationError(`${field} has invalid format`);
  }
}

function requiredString(value, field) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new ValidationError(`${field} must be a non-empty string`);
  }
  return value;
}

function optionalString(value, field = "value") {
  if (value === undefined) return undefined;
  if (typeof value !== "string") {
    throw new ValidationError(`${field} must be a string`);
  }
  return value;
}

function nullableString(value, field) {
  if (value === null) return null;
  return requiredString(value, field);
}

function requiredBoolean(value, field) {
  if (typeof value !== "boolean") {
    throw new ValidationError(`${field} must be a boolean`);
  }
  return value;
}

function requiredNumber(value, field) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new ValidationError(`${field} must be a finite number`);
  }
  return value;
}

function nullableNumber(value, field) {
  if (value === null) return null;
  return requiredNumber(value, field);
}

function enumValue(value, values, field) {
  if (!values.includes(value)) {
    throw new ValidationError(`${field} must be one of: ${values.join(", ")}`);
  }
}

function nullableEnum(value, values, field) {
  if (value === null) return null;
  enumValue(value, values, field);
}

function assertObject(value, field) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ValidationError(`${field} must be an object`);
  }
}

function nullableObject(value, field) {
  if (value === null) return null;
  assertObject(value, field);
}

function stringArray(value, field) {
  if (!Array.isArray(value)) {
    throw new ValidationError(`${field} must be an array`);
  }
  value.forEach((item, index) => requiredString(item, `${field}.${index}`));
  return value;
}

function isoDate(value, field) {
  requiredString(value, field);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00.000Z`))) {
    throw new ValidationError(`${field} must be an ISO 8601 date`);
  }
}

function isoTimestamp(value, field) {
  requiredString(value, field);
  if (Number.isNaN(Date.parse(value))) {
    throw new ValidationError(`${field} must be an ISO 8601 timestamp`);
  }
}

function nullableIsoTimestamp(value, field) {
  if (value === null) return null;
  isoTimestamp(value, field);
}

export class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "ValidationError";
    this.statusCode = 400;
  }
}
