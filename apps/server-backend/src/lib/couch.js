import nano from "nano";

const COUCHDB_URL = process.env.COUCHDB_URL || "http://localhost:5984";
const COUCHDB_USER = process.env.COUCHDB_USER || "admin";
const COUCHDB_PASSWORD = process.env.COUCHDB_PASSWORD || "";

let server;
let db;

export function getServer() {
  if (!server) {
    server = nano(COUCHDB_URL);
    if (COUCHDB_USER) {
      server.auth(COUCHDB_USER, COUCHDB_PASSWORD);
    }
  }
  return server;
}

export async function getDb() {
  if (!db) {
    server = getServer();
    try {
      db = await server.use("logshield");
      await db.info();
    } catch {
      await server.db.create("logshield");
      db = server.use("logshield");
    }
  }
  return db;
}

export async function findDocByField(field, value) {
  const d = await getDb();
  const result = await d.find({
    selector: { [field]: value },
    limit: 1,
  });
  return result.docs[0] || null;
}
