import test from "node:test";
import assert from "node:assert/strict";
import {
  startTestServer,
  stopTestServer,
  createTestToken,
  authHeader,
} from "./helpers/setup.js";

let server, baseUrl, token;

test.before(async () => {
  const s = await startTestServer();
  server = s.server;
  baseUrl = s.baseUrl;
  token = createTestToken();
});

test.after(async () => {
  if (server) await stopTestServer(server);
});

test("GET /api/stocks/summary returns stock overview", async () => {
  const res = await fetch(`${baseUrl}/api/stocks/summary`, {
    headers: authHeader(token),
  });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.ok, true);
  assert.ok("total_item" in body);
});

test("GET /api/stocks/categories returns categories", async () => {
  const res = await fetch(`${baseUrl}/api/stocks/categories`, {
    headers: authHeader(token),
  });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.ok, true);
  assert.ok(Array.isArray(body.categories));
});

test("POST /api/stock-readings without auth creates reading", async () => {
  const payload = {
    warehouse_id: "test-warehouse-001",
    commodity: "beras",
    weight_g: 50000,
    weight_delta_g: 0,
    rssi: -70,
    uptime_s: 86400,
    battery_mv: 3700,
    node_id: "node-001",
    sample_count: 3,
  };
  const res = await fetch(`${baseUrl}/api/stock-readings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  assert.equal(res.status, 201);
  const body = await res.json();
  assert.equal(body.ok, true);
  assert.ok(body.ids.stock_reading);
  assert.ok(body.ids.asset);
  assert.ok(body.ids.audit_log);
});

test("POST /api/audit-logs without auth creates audit log", async () => {
  const payload = {
    action: "test_integration",
    actor: "test::integration::runner",
    target_type: "test",
    target_id: "test::integration::entry",
    status: "sukses",
    details: "Integration test audit entry",
    ip_address: "127.0.0.1",
  };
  const res = await fetch(`${baseUrl}/api/audit-logs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  assert.equal(res.status, 201);
  const body = await res.json();
  assert.equal(body.ok, true);
  assert.ok(body.id);
});
