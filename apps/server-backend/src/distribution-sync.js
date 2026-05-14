import { bulkDocuments, findDocuments } from "./couchdb.js";

const SYNC_MARK_INTERVAL_MS = 30_000;

export function startDistributionSyncMarker() {
  const timer = setInterval(() => {
    markSyncedDistributions().catch((error) => {
      console.error("Distribution sync marker failed", error);
    });
  }, SYNC_MARK_INTERVAL_MS);

  markSyncedDistributions().catch((error) => {
    if (error.statusCode !== 404) {
      console.error("Initial distribution sync marker failed", error);
    }
  });

  return timer;
}

export async function markSyncedDistributions(now = new Date()) {
  const result = await findDocuments(
    {
      type: "distribution",
      synced: false,
    },
    { limit: 100 }
  );

  const docs = (result.docs || []).map((doc) => ({
    ...doc,
    synced: true,
    synced_at: now.toISOString(),
  }));

  if (docs.length === 0) {
    return { ok: true, updated: 0 };
  }

  const updateResult = await bulkDocuments(docs);
  return {
    ok: true,
    updated: updateResult.filter((row) => row.ok).length,
    errors: updateResult.filter((row) => !row.ok),
  };
}
