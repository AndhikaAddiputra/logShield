import test from "node:test";
import assert from "node:assert/strict";
import { startTestServer, stopTestServer } from "./helpers/setup.js";

let server, baseUrl;

test.before(async () => {
  const s = await startTestServer();
  server = s.server;
  baseUrl = s.baseUrl;
});

test.after(async () => {
  if (server) await stopTestServer(server);
});

test("GET /api/health returns service info", async () => {
  const res = await fetch(`${baseUrl}/api/health`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.ok, true);
  assert.equal(body.service, "logshield-backend");
  assert.ok(body.port > 0);
  assert.ok(body.database);
});

test("GET /api/couchdb/health returns couchdb status", async () => {
  const res = await fetch(`${baseUrl}/api/couchdb/health`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.ok, true);
  assert.ok(body.couchdb);
});

test("POST /api/auth/login with missing credentials returns 401", async () => {
  const res = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  assert.equal(res.status, 401);
  const body = await res.json();
  assert.equal(body.ok, false);
});
