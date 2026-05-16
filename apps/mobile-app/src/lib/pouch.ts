import PouchDB from "pouchdb";
import PouchDBFind from "pouchdb-find";
import type { SyncStatus } from "@log-shield/shared-types";
import { useAuthStore } from "../store/authStore";
import { useSyncStore } from "../store/syncStore";

PouchDB.plugin(PouchDBFind);

const LOCAL_DB_NAME = "logshield_field_local";

export interface ReplicationHandle {
  cancel: () => void;
}

export function createLocalDb() {
  return new PouchDB(LOCAL_DB_NAME);
}

function couchRemoteOptions() {
  const authState = useAuthStore.getState();
  const couch = authState.couchdb;
  if (couch?.username && couch?.password) {
    return {
      skip_setup: true,
      auth: { username: couch.username, password: couch.password },
    };
  }
  const user = import.meta.env.VITE_COUCHDB_USER;
  const pass = import.meta.env.VITE_COUCHDB_PASSWORD;
  const auth = user && pass ? { username: user, password: pass } : undefined;
  return { skip_setup: true, auth };
}

function mapActivityToStatus(active: boolean, err?: Error | null): SyncStatus {
  if (err) return "error";
  if (active) return "syncing";
  return "paused";
}

export function startCouchReplication(
  local: ReturnType<typeof createLocalDb>,
  remoteUrl: string
): ReplicationHandle {
  const set = useSyncStore.getState().setFromReplication;

  const remote = new PouchDB(remoteUrl, couchRemoteOptions());

  const sync = local.sync(remote, {
    live: true,
    retry: true,
  });

  set({
    status: "syncing",
    detail: "Menyinkronkan dengan server…",
    lastError: null,
  });

  sync
    .on("change", () => {
      set({ status: "syncing", detail: "Menerima atau mengirim perubahan…" });
    })
    .on("paused", () => {
      set({
        status: "paused",
        detail:
          "Sinkron jeda (offline atau tidak ada perubahan). Data lokal tetap aman.",
      });
    })
    .on("active", () => {
      set({
        status: "syncing",
        detail: "Koneksi aktif — menyinkronkan…",
        lastError: null,
      });
    })
    .on("denied", (err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      set({
        status: "error",
        lastError: message,
        detail: "Sinkron ditolak — periksa hak akses CouchDB.",
      });
    })
    .on("error", (err: unknown) => {
      const e = err instanceof Error ? err : new Error(String(err));
      set({
        status: mapActivityToStatus(false, e),
        lastError: e.message,
        detail:
          "Gangguan sinkron. Akan dicoba lagi saat jaringan pulih (mode offline tetap aktif).",
      });
    });

  return sync as ReplicationHandle;
}
