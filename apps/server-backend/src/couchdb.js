import { config } from "./config.js";
import { INDEX_FIELDS } from "./document-schema.js";

export async function couchRequest(path, options = {}) {
  const headers = new Headers(options.headers || {});
  headers.set("Authorization", basicAuth());
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${config.couchUrl}${path}`, {
    ...options,
    headers,
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const message = body?.reason || body?.error || response.statusText;
    throw new CouchError(message, response.status, body);
  }
  return body;
}

export async function dbRequest(path = "", options = {}) {
  return couchRequest(`/${encodeURIComponent(config.couchDbName)}${path}`, options);
}

export async function checkCouchHealth() {
  return couchRequest("/_up");
}

export async function bootstrapDatabase() {
  await ensureDatabase("_users");
  await ensureDatabase("_replicator");
  const created = await ensureDatabase(config.couchDbName);

  const cors = await configureCors();
  const auth = await configureDatabaseAuth();
  const indexes = [];
  for (const field of INDEX_FIELDS) {
    indexes.push(
      await dbRequest("/_index", {
        method: "POST",
        body: JSON.stringify({
          index: { fields: [field] },
          name: `idx_${field}`,
          type: "json",
        }),
      })
    );
  }

  return {
    ok: true,
    database: config.couchDbName,
    created,
    cors,
    auth,
    indexes: indexes.map((index) => ({
      id: index.id,
      name: index.name,
      result: index.result,
    })),
  };
}

async function ensureDatabase(name) {
  try {
    await couchRequest(`/${encodeURIComponent(name)}`, {
      method: "HEAD",
    });
    return false;
  } catch (error) {
    if (error instanceof CouchError && error.statusCode === 404) {
      await couchRequest(`/${encodeURIComponent(name)}`, {
        method: "PUT",
      });
      return true;
    }
    throw error;
  }
}

export async function configureDatabaseAuth() {
  await ensureCouchUser({
    username: config.devLogin.username,
    password: config.devLogin.password,
    roles: [config.devLogin.couchRole],
  });

  await dbRequest("/_security", {
    method: "PUT",
    body: JSON.stringify({
      admins: {
        names: [],
        roles: ["_admin"],
      },
      members: {
        names: [config.devLogin.username],
        roles: [config.devLogin.couchRole],
      },
    }),
  });

  return {
    ok: true,
    user: config.devLogin.username,
    roles: [config.devLogin.couchRole],
  };
}

export async function ensureCouchUser({ username, password, roles }) {
  const id = `org.couchdb.user:${username}`;
  let existing = null;
  try {
    existing = await couchRequest(`/_users/${encodeURIComponent(id)}`);
  } catch (error) {
    if (error.statusCode !== 404) throw error;
  }

  const doc = {
    ...(existing?._rev ? { _rev: existing._rev } : {}),
    _id: id,
    name: username,
    type: "user",
    roles,
    password,
  };

  return couchRequest(`/_users/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(doc),
  });
}

export async function configureCors() {
  const settings = [
    ["/_node/_local/_config/chttpd/enable_cors", "true"],
    ["/_node/_local/_config/cors/origins", "http://localhost:5173,http://localhost:5174"],
    ["/_node/_local/_config/cors/credentials", "true"],
    ["/_node/_local/_config/cors/methods", "GET, PUT, POST, HEAD, DELETE"],
    ["/_node/_local/_config/cors/headers", "accept, authorization, content-type, origin, referer"],
  ];

  const results = [];
  for (const [path, value] of settings) {
    results.push(await couchRequest(path, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(value),
    }));
  }
  return { ok: true, updated: results.length };
}

export async function findDocuments(selector, options = {}) {
  return dbRequest("/_find", {
    method: "POST",
    body: JSON.stringify({
      selector,
      limit: options.limit || 100,
      sort: options.sort,
    }),
  });
}

export async function bulkDocuments(docs) {
  return dbRequest("/_bulk_docs", {
    method: "POST",
    body: JSON.stringify({ docs }),
  });
}

export async function putDocument(doc) {
  return dbRequest(`/${encodeURIComponent(doc._id)}`, {
    method: "PUT",
    body: JSON.stringify(doc),
  });
}

export async function getDocument(id) {
  return dbRequest(`/${encodeURIComponent(id)}`);
}

export async function putExistingDocument(doc) {
  return putDocument(doc);
}

function basicAuth() {
  const token = Buffer.from(`${config.couchUser}:${config.couchPassword}`).toString("base64");
  return `Basic ${token}`;
}

export class CouchError extends Error {
  constructor(message, statusCode, body) {
    super(message);
    this.name = "CouchError";
    this.statusCode = statusCode;
    this.body = body;
  }
}
