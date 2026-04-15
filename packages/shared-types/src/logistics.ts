import type { Kib16 } from "./kib.js";

/**
 * All operational documents are keyed by disaster instance via `kib`.
 * `_id` must be unique per document; recommended pattern: `${kib}::<type>::<suffix>`.
 */
export function makeDocumentId(
  kib: Kib16,
  docType: string,
  suffix: string
): string {
  return `${kib}::${docType}::${suffix}`;
}

export interface KibDocumentBase {
  _id: string;
  kib: Kib16;
  _rev?: string;
  createdAt: string;
  updatedAt: string;
}

export type SyncStatus = "idle" | "syncing" | "paused" | "error";

export interface SyncMetaDoc extends KibDocumentBase {
  type: "sync_meta";
  /** One meta doc per KIB / device if needed */
  lastSeq?: string;
  lastError?: string;
  status: SyncStatus;
}

export interface LogisticsStockDoc extends KibDocumentBase {
  type: "logistics_stock";
  itemCode: string;
  quantity: number;
  unit: string;
  warehouseId: string;
  notes?: string;
}

export interface DistributionEventDoc extends KibDocumentBase {
  type: "distribution_event";
  beneficiaryCount: number;
  goodsSummary: string;
  distributedAt: string;
  officerId: string;
}

/** Cached AI output replicated to mobile for offline display */
export interface ForecastSnapshotDoc extends KibDocumentBase {
  type: "forecast_snapshot";
  predictedDemand: number;
  modelVersion: string;
  generatedAt: string;
  maeEstimate?: number;
  rationaleHints?: string[];
}

export type LogShieldDocument =
  | LogisticsStockDoc
  | DistributionEventDoc
  | ForecastSnapshotDoc
  | SyncMetaDoc;
