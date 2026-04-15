import { create } from "zustand";
import type { SyncStatus } from "@log-shield/shared-types";

export interface SyncState {
  status: SyncStatus;
  lastError: string | null;
  /** Human-readable detail for trauma-aware UI */
  detail: string;
  setFromReplication: (partial: {
    status: SyncStatus;
    lastError?: string | null;
    detail?: string;
  }) => void;
}

export const useSyncStore = create<SyncState>((set) => ({
  status: "idle",
  lastError: null,
  detail: "Belum sinkron.",
  setFromReplication: (partial) =>
    set((s) => ({
      ...s,
      status: partial.status,
      lastError:
        partial.lastError === undefined ? s.lastError : partial.lastError,
      detail: partial.detail ?? s.detail,
    })),
}));
