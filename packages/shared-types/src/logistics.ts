import type { Kib16 } from "./kib.js";

export type SyncStatus = "idle" | "syncing" | "paused" | "error";

export type DistributionUnit = "kg" | "liter" | "pcs" | "karton" | "kit";
export type AssetUnit = "kg" | "pcs" | "karton" | "unit";
export type VulnerableGroup =
  | "umum"
  | "balita"
  | "lansia"
  | "ibu_hamil"
  | "disabilitas";
export type RequestStatus = "mendesak" | "menunggu" | "diproses" | "selesai";
export type RequestPriority = "critical" | "high" | "normal" | "low";
export type AssetCategory = "sandang" | "pangan" | "papan" | "lainnya";
export type AuditStatus = "sukses" | "ditolak" | "timeout" | "error";
export type UserRole = "admin" | "koordinator" | "lapangan";
export type PoskoStatus = "active" | "inactive" | "closed";
export type SignupRequestStatus = "pending" | "approved" | "rejected";
export type AuthCredentialStatus = "active" | "inactive";
export type EmailOutboxStatus = "queued" | "sent" | "failed";
export type AiRiskLevel = "aman" | "waspada" | "kritis";
export type AiAnomalySeverity = "low" | "medium" | "high";

export type LogShieldDocumentType =
  | "user"
  | "posko"
  | "signup_request"
  | "auth_credential"
  | "email_outbox"
  | "distribution"
  | "stock_reading"
  | "prediction"
  | "ai_run_summary"
  | "ai_recommendation"
  | "ai_anomaly"
  | "request"
  | "asset"
  | "stock_movement"
  | "audit_log";

export interface CouchDocumentBase {
  _id: string;
  _rev?: string;
  type: LogShieldDocumentType;
}

export interface UserDoc extends CouchDocumentBase {
  _id: `user::${string}`;
  type: "user";
  email: string;
  name: string;
  /** AES-256 encrypted 16-digit NIK. */
  nik: string;
  kib_bencana_id: string;
  role: UserRole;
  posko_id: `posko::${string}` | null;
  phone: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface PoskoDoc extends CouchDocumentBase {
  _id: `posko::${string}`;
  type: "posko";
  kib_16: Kib16;
  name: string;
  address: string;
  province: string;
  district: string;
  total_pengungsi: number;
  count_balita: number;
  count_lansia: number;
  count_perempuan: number;
  count_pria: number;
  count_disabilitas: number;
  pj_name: string;
  pj_phone: string;
  status: PoskoStatus;
  created_at: string;
  updated_at: string;
}

export interface SignupRequestDoc extends CouchDocumentBase {
  _id: `signup_request::${string}`;
  type: "signup_request";
  email: string;
  name: string;
  nik: string;
  nik_lookup_hash: string;
  phone: string;
  avatar_url?: string;
  status: SignupRequestStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuthCredentialDoc extends CouchDocumentBase {
  _id: `auth_credential::${string}`;
  type: "auth_credential";
  user_id: `user::${string}`;
  email: string;
  nik: string;
  nik_lookup_hash: string;
  password_hash: string;
  status: AuthCredentialStatus;
  couch_username: string;
  couch_password_enc: string;
  created_at: string;
  updated_at: string;
}

export interface EmailOutboxDoc extends CouchDocumentBase {
  _id: `email_outbox::${string}::${string}`;
  type: "email_outbox";
  to: string;
  subject: string;
  body: string;
  status: EmailOutboxStatus;
  related_signup_id: string | null;
  related_user_id: string | null;
  created_at: string;
  sent_at: string | null;
}

export interface DistributionDoc extends CouchDocumentBase {
  _id: `distribution::${string}::${string}`;
  type: "distribution";
  kib_16: Kib16;
  posko_id: string;
  officer_id: string;
  commodity: string;
  quantity: number;
  unit: DistributionUnit;
  /** AES-256 encrypted KIB pengungsi penerima. */
  recipient_kib: string;
  vulnerable_group: VulnerableGroup | null;
  notes?: string;
  synced: boolean;
  created_at: string;
  synced_at: string | null;
}

export interface StockReadingDoc extends CouchDocumentBase {
  _id: `stock_reading::${string}::${string}::${string}`;
  type: "stock_reading";
  warehouse_id: string;
  node_id: string;
  commodity: string;
  weight_g: number;
  weight_delta_g: number;
  sample_count: number;
  rssi: number;
  uptime_s: number;
  battery_mv: number | null;
  timestamp: string;
  created_at: string;
}

export interface PredictionRationaleChip {
  feature: string;
  narrative: string;
  shap_value: number;
}

export interface PredictionDoc extends CouchDocumentBase {
  _id: `prediction::${string}::${string}::${string}`;
  type: "prediction";
  posko_id: string;
  commodity: string;
  prediction_date: string;
  predicted_kg: number;
  confidence_low: number;
  confidence_high: number;
  mae_last_7d: number;
  shap_values: Record<string, number>;
  rationale_chips: PredictionRationaleChip[];
  model_version: string;
  created_at: string;
}

export interface AiRunSummaryDoc extends CouchDocumentBase {
  _id: `ai_run_summary::${string}::${string}`;
  type: "ai_run_summary";
  status: string;
  dataset: Record<string, unknown>;
  forecasting: Record<string, unknown>;
  recommendation_counts: Record<string, unknown>;
  anomaly_counts: Record<string, unknown>;
  synced_at: string;
}

export interface AiRecommendationDoc extends CouchDocumentBase {
  _id: `ai_recommendation::${string}::${string}::${string}`;
  type: "ai_recommendation";
  run_id: string;
  forecast_date: string;
  kib_bencana_id: string;
  disaster_type: string;
  posko_id: string;
  posko_name: string;
  item_name: string;
  unit: string;
  recommended_qty: number;
  shortage_qty: number;
  coverage_days: number;
  risk_level: AiRiskLevel;
  priority_score: number;
  trust_score: number;
  rationale_chips: string[];
  synced_at: string;
}

export interface AiAnomalyDoc extends CouchDocumentBase {
  _id: `ai_anomaly::${string}::${string}::${string}`;
  type: "ai_anomaly";
  run_id: string;
  date: string;
  kib_bencana_id: string;
  disaster_type: string;
  posko_id: string;
  posko_name: string;
  item_name: string;
  unit: string;
  anomaly_type: string;
  severity: AiAnomalySeverity;
  score: number;
  message: string;
  action_suggestion: string;
  synced_at: string;
}

export interface RequestItem {
  commodity: string;
  quantity: number;
  unit: DistributionUnit | AssetUnit;
  note?: string;
}

export interface RequestDoc extends CouchDocumentBase {
  _id: `request::${string}`;
  type: "request";
  request_code: string;
  posko_id: string;
  submitted_by: string;
  items: RequestItem[];
  status: RequestStatus;
  priority: RequestPriority;
  processed_by: string | null;
  processed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AssetDoc extends CouchDocumentBase {
  _id: `asset::${string}::${string}`;
  type: "asset";
  warehouse_id: string;
  commodity: string;
  category: AssetCategory;
  quantity_available: number;
  unit: AssetUnit;
  min_threshold: number;
  last_sensor_weight_g: number | null;
  last_sensor_update: string | null;
  created_at: string;
  updated_at: string;
}

export interface StockMovementDoc extends CouchDocumentBase {
  _id: `stock_movement::${string}::${string}`;
  type: "stock_movement";
  warehouse_id: string;
  commodity: string;
  category: AssetCategory;
  quantity: number;
  unit: AssetUnit;
  movement_type: "in" | "out";
  source: "manual" | "distribution" | "sensor";
  created_by: string;
  created_at: string;
}

export interface AuditLogDoc extends CouchDocumentBase {
  _id: `audit_log::${string}::${string}`;
  type: "audit_log";
  user_id: string | null;
  action: string;
  target_type: LogShieldDocumentType | string;
  target_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  ip_address: string;
  status: AuditStatus;
  created_at: string;
}

export type LogShieldDocument =
  | UserDoc
  | PoskoDoc
  | SignupRequestDoc
  | AuthCredentialDoc
  | EmailOutboxDoc
  | DistributionDoc
  | StockReadingDoc
  | PredictionDoc
  | AiRunSummaryDoc
  | AiRecommendationDoc
  | AiAnomalyDoc
  | RequestDoc
  | AssetDoc
  | StockMovementDoc
  | AuditLogDoc;

export const LOGSHIELD_INDEX_FIELDS = [
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
] as const;

export function makeUserId(uuid: string) {
  return `user::${uuid}` as const;
}

export function makePoskoId(uuid: string) {
  return `posko::${uuid}` as const;
}

export function makeSignupRequestId(uuid: string) {
  return `signup_request::${uuid}` as const;
}

export function makeAuthCredentialId(userId: string) {
  return `auth_credential::${userId}` as const;
}

export function makeEmailOutboxId(timestampMs: number | string, uuid: string) {
  return `email_outbox::${timestampMs}::${uuid}` as const;
}

export function makeDistributionId(kib: Kib16, uuid: string) {
  return `distribution::${kib}::${uuid}` as const;
}

export function makeStockReadingId(
  warehouseId: string,
  nodeId: string,
  timestampMs: number | string
) {
  return `stock_reading::${warehouseId}::${nodeId}::${timestampMs}` as const;
}

export function makePredictionId(
  poskoId: string,
  commodity: string,
  predictionDate: string
) {
  return `prediction::${poskoId}::${commodity}::${predictionDate}` as const;
}

export function makeRequestId(requestCode: string) {
  return `request::${requestCode}` as const;
}

export function makeAssetId(warehouseId: string, commodity: string) {
  return `asset::${warehouseId}::${commodity}` as const;
}

export function makeStockMovementId(timestampMs: number | string, uuid: string) {
  return `stock_movement::${timestampMs}::${uuid}` as const;
}

export function makeAuditLogId(timestampMs: number | string, uuid: string) {
  return `audit_log::${timestampMs}::${uuid}` as const;
}
