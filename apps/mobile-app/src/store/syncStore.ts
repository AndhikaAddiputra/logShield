import { create } from "zustand";
import type { SyncStatus } from "@log-shield/shared-types";

export interface SyncState {
  status: SyncStatus;
  lastError: string | null;
  /** Human-readable detail for trauma-aware UI */
  detail: string;
  pendingOutbox: number;
  failedOutbox: number;
  setFromReplication: (partial: {
    status: SyncStatus;
    lastError?: string | null;
    detail?: string;
  }) => void;
  setOutboxStats: (stats: { pending?: number; failed?: number }) => void;
}

export const useSyncStore = create<SyncState>((set) => ({
  status: "idle",
  lastError: null,
  detail: "Belum sinkron.",
  pendingOutbox: 0,
  failedOutbox: 0,
  setFromReplication: (partial) =>
    set((s) => ({
      ...s,
      status: partial.status,
      lastError:
        partial.lastError === undefined ? s.lastError : partial.lastError,
      detail: partial.detail ?? s.detail,
    })),
  setOutboxStats: (stats) =>
    set((s) => ({
      ...s,
      pendingOutbox: stats.pending ?? s.pendingOutbox,
      failedOutbox: stats.failed ?? s.failedOutbox,
    })),
}));
