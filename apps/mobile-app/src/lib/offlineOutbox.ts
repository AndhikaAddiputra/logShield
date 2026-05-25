import { API_BASE_URL, getAuthHeaders } from "./api";
import { createLocalDb } from "./pouch";
import { useSyncStore } from "../store/syncStore";

type OutboxStatus = "pending" | "syncing" | "synced" | "failed";
type HttpMethod = "POST" | "PATCH";
type PouchRow = { doc?: unknown };

interface CacheDoc {
  _id: string;
  _rev?: string;
  type: "cache";
  key: string;
  value: unknown;
  updated_at: string;
}

interface OutboxDoc {
  _id: string;
  _rev?: string;
  type: "outbox";
  client_mutation_id: string;
  method: HttpMethod;
  endpoint: string;
  payload: Record<string, unknown>;
  created_at: string;
  status: OutboxStatus;
  attempt_count: number;
  last_error: string | null;
  local_doc_id?: string;
}

interface LocalRequestDoc {
  _id: string;
  _rev?: string;
  type: "local_request";
  client_mutation_id: string;
  posko_id: string;
  request_code: string;
  status_label: string;
  status_color: string;
  created_at: string;
  updated_at: string;
  date: string;
  time: string;
  sync_status: OutboxStatus;
  items: Array<{ name: string; quantity: string; keterangan: string }>;
}

interface SendJsonOptions {
  method: HttpMethod;
  endpoint: string;
  payload: Record<string, unknown>;
  localRequest?: {
    posko_id: string;
    items: Array<{ commodity: string; quantity: number; unit: string; note?: string }>;
  };
}

const OUTBOX_PREFIX = "outbox::";
const LOCAL_REQUEST_PREFIX = "local_request::";
const CACHE_PREFIX = "cache::";
const OFFLINE_UNTIL_KEY = "logshield_network_offline_until";

export function isOfflineMode(): boolean {
  if (typeof navigator !== "undefined" && !navigator.onLine) return true;
  const until = Number(localStorage.getItem(OFFLINE_UNTIL_KEY) || 0);
  return Number.isFinite(until) && Date.now() < until;
}

export function noteNetworkFailure(): void {
  localStorage.setItem(OFFLINE_UNTIL_KEY, String(Date.now() + 30000));
  window.dispatchEvent(new Event("logshield-network-status"));
}

export function noteNetworkSuccess(): void {
  localStorage.removeItem(OFFLINE_UNTIL_KEY);
  window.dispatchEvent(new Event("logshield-network-status"));
}

export async function cacheValue(key: string, value: unknown): Promise<void> {
  const db = createLocalDb();
  const id = `${CACHE_PREFIX}${key}`;
  let previous: CacheDoc | null = null;
  try {
    previous = await db.get(id) as CacheDoc;
  } catch {}
  await db.put({
    ...(previous?._rev ? { _rev: previous._rev } : {}),
    _id: id,
    type: "cache",
    key,
    value,
    updated_at: new Date().toISOString(),
  });
}

export async function getCachedValue<T>(key: string): Promise<T | null> {
  const db = createLocalDb();
  try {
    const doc = await db.get(`${CACHE_PREFIX}${key}`) as CacheDoc;
    return doc.value as T;
  } catch {
    return null;
  }
}

export async function sendJsonWithOfflineFallback({
  method,
  endpoint,
  payload,
  localRequest,
}: SendJsonOptions): Promise<{ queued: boolean; data?: unknown; mutation: OutboxDoc }> {
  const now = new Date();
  const clientMutationId = createClientMutationId();
  const enrichedPayload = {
    ...payload,
    client_mutation_id: clientMutationId,
    client_updated_at: now.toISOString(),
    sync_source: "mobile_outbox",
  };
  const mutation = createOutboxDoc({
    method,
    endpoint,
    payload: enrichedPayload,
    now,
    clientMutationId,
    localRequest,
  });

  if (isOfflineMode()) {
    await queueMutation(mutation, localRequest);
    return { queued: true, mutation };
  }

  try {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      method,
      headers: getAuthHeaders(),
      body: JSON.stringify(enrichedPayload),
    });
    const data = await safeJson(res);
    if (!res.ok) {
      throw new Error((data as { message?: string })?.message || "Gagal mengirim data");
    }
    noteNetworkSuccess();
    return { queued: false, data, mutation };
  } catch (error) {
    if (!isNetworkError(error)) throw error;
    noteNetworkFailure();
    await queueMutation(mutation, localRequest);
    return { queued: true, mutation };
  }
}

export async function listLocalRequestCards(poskoId: string): Promise<LocalRequestDoc[]> {
  const db = createLocalDb();
  const result = await db.allDocs({
    include_docs: true,
    startkey: LOCAL_REQUEST_PREFIX,
    endkey: `${LOCAL_REQUEST_PREFIX}\uffff`,
  });
  return result.rows
    .map((row: PouchRow) => row.doc as LocalRequestDoc | undefined)
    .filter((doc: LocalRequestDoc | undefined): doc is LocalRequestDoc => {
      return Boolean(doc && doc.type === "local_request" && doc.posko_id === poskoId && doc.sync_status !== "synced");
    })
    .sort((a: LocalRequestDoc, b: LocalRequestDoc) => Date.parse(b.created_at) - Date.parse(a.created_at));
}

export async function replayOutbox(): Promise<void> {
  const db = createLocalDb();
  await refreshOutboxStats(db);
  if (isOfflineMode()) return;

  const result = await db.allDocs({
    include_docs: true,
    startkey: OUTBOX_PREFIX,
    endkey: `${OUTBOX_PREFIX}\uffff`,
  });
  const pending = result.rows
    .map((row: PouchRow) => row.doc as OutboxDoc | undefined)
    .filter((doc: OutboxDoc | undefined): doc is OutboxDoc => Boolean(doc && doc.type === "outbox" && doc.status === "pending"))
    .sort((a: OutboxDoc, b: OutboxDoc) => Date.parse(a.created_at) - Date.parse(b.created_at));

  for (const doc of pending) {
    await replayOne(db, doc);
  }
  await refreshOutboxStats(db);
}

export async function retryFailedOutbox(): Promise<void> {
  const db = createLocalDb();
  const result = await db.allDocs({
    include_docs: true,
    startkey: OUTBOX_PREFIX,
    endkey: `${OUTBOX_PREFIX}\uffff`,
  });
  const failed = result.rows
    .map((row: PouchRow) => row.doc as OutboxDoc | undefined)
    .filter((doc: OutboxDoc | undefined): doc is OutboxDoc => Boolean(doc && doc.type === "outbox" && doc.status === "failed"));

  await Promise.all(
    failed.map((doc: OutboxDoc) =>
      db.put({
        ...doc,
        status: "pending",
        last_error: null,
      })
    )
  );
  await replayOutbox();
}

export function startOutboxReplay(): { cancel: () => void } {
  const run = () => {
    void replayOutbox();
  };
  run();
  window.addEventListener("online", run);
  const interval = window.setInterval(run, 15000);
  return {
    cancel: () => {
      window.removeEventListener("online", run);
      window.clearInterval(interval);
    },
  };
}

async function queueMutation(
  mutation: OutboxDoc,
  localRequest?: SendJsonOptions["localRequest"]
): Promise<void> {
  const db = createLocalDb();
  await db.put(mutation);
  if (localRequest && mutation.local_doc_id) {
    await db.put(createLocalRequestDoc(mutation, localRequest));
  }
  await refreshOutboxStats(db);
}

async function replayOne(db: ReturnType<typeof createLocalDb>, doc: OutboxDoc): Promise<void> {
  const syncing = {
    ...doc,
    status: "syncing" as const,
    attempt_count: doc.attempt_count + 1,
    last_error: null,
  };
  await db.put(syncing);
  await markLocalRequest(db, syncing, "syncing");

  try {
    const res = await fetch(`${API_BASE_URL}${doc.endpoint}`, {
      method: doc.method,
      headers: getAuthHeaders(),
      body: JSON.stringify(doc.payload),
    });
    const data = await safeJson(res);
    if (!res.ok) {
      throw new Error((data as { message?: string })?.message || "Sinkron gagal");
    }
    const latest = await db.get(doc._id) as OutboxDoc;
    await db.put({
      ...latest,
      status: "synced",
      last_error: null,
    });
    await markLocalRequest(db, latest, "synced");
  } catch (error) {
    const latest = await db.get(doc._id) as OutboxDoc;
    const message = error instanceof Error ? error.message : String(error);
    await db.put({
      ...latest,
      status: isNetworkError(error) ? "pending" : "failed",
      last_error: message,
    });
    await markLocalRequest(db, latest, isNetworkError(error) ? "pending" : "failed");
  }
}

async function markLocalRequest(
  db: ReturnType<typeof createLocalDb>,
  mutation: OutboxDoc,
  status: OutboxStatus
): Promise<void> {
  if (!mutation.local_doc_id) return;
  try {
    const doc = await db.get(mutation.local_doc_id) as LocalRequestDoc;
    await db.put({
      ...doc,
      sync_status: status,
      status_label: status === "failed" ? "Gagal Sinkron" : status === "synced" ? "Tersinkron" : "Menunggu Sinkron",
      status_color: status === "failed" ? "danger" : "warning",
      updated_at: new Date().toISOString(),
    });
  } catch {
    // Local display docs are best-effort; the outbox remains the source of truth.
  }
}

async function refreshOutboxStats(db = createLocalDb()): Promise<void> {
  const result = await db.allDocs({
    include_docs: true,
    startkey: OUTBOX_PREFIX,
    endkey: `${OUTBOX_PREFIX}\uffff`,
  });
  const docs = result.rows
    .map((row: PouchRow) => row.doc as OutboxDoc | undefined)
    .filter((doc: OutboxDoc | undefined): doc is OutboxDoc => Boolean(doc && doc.type === "outbox"));
  useSyncStore.getState().setOutboxStats({
    pending: docs.filter((doc: OutboxDoc) => doc.status === "pending" || doc.status === "syncing").length,
    failed: docs.filter((doc: OutboxDoc) => doc.status === "failed").length,
  });
}

function createOutboxDoc({
  method,
  endpoint,
  payload,
  now,
  clientMutationId,
  localRequest,
}: {
  method: HttpMethod;
  endpoint: string;
  payload: Record<string, unknown>;
  now: Date;
  clientMutationId: string;
  localRequest?: SendJsonOptions["localRequest"];
}): OutboxDoc {
  return {
    _id: `${OUTBOX_PREFIX}${clientMutationId}`,
    type: "outbox",
    client_mutation_id: clientMutationId,
    method,
    endpoint,
    payload,
    created_at: now.toISOString(),
    status: "pending",
    attempt_count: 0,
    last_error: null,
    ...(localRequest ? { local_doc_id: `${LOCAL_REQUEST_PREFIX}${clientMutationId}` } : {}),
  };
}

function createLocalRequestDoc(mutation: OutboxDoc, request: NonNullable<SendJsonOptions["localRequest"]>): LocalRequestDoc {
  const createdAt = new Date(mutation.created_at);
  return {
    _id: mutation.local_doc_id || `${LOCAL_REQUEST_PREFIX}${mutation.client_mutation_id}`,
    type: "local_request",
    client_mutation_id: mutation.client_mutation_id,
    posko_id: request.posko_id,
    request_code: "Menunggu sinkron",
    status_label: "Menunggu Sinkron",
    status_color: "warning",
    created_at: mutation.created_at,
    updated_at: mutation.created_at,
    date: createdAt.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" }),
    time: `${createdAt.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WIB`,
    sync_status: "pending",
    items: request.items.map((item) => ({
      name: item.commodity,
      quantity: `${item.quantity} ${item.unit}`,
      keterangan: item.note || "-",
    })),
  };
}

async function safeJson(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function createClientMutationId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function isNetworkError(error: unknown): boolean {
  if (isOfflineMode()) return true;
  return error instanceof TypeError;
}
