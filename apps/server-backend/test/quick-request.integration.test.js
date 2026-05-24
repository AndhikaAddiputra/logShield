import test from "node:test";
import assert from "node:assert/strict";
import {
  startTestServer,
  stopTestServer,
  createTestToken,
  authHeader,
} from "./helpers/setup.js";

let server, baseUrl, token, testPoskoId;

test.before(async () => {
  const s = await startTestServer();
  server = s.server;
  baseUrl = s.baseUrl;
  token = createTestToken();

  const poskoRes = await fetch(`${baseUrl}/api/poskos`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader(token) },
    body: JSON.stringify({
      kib_16: "1234567890123456",
      name: "Test Posko INT",
      address: "Jl. Testing No.1",
      district: "Test District",
      province: "Test Province",
      total_pengungsi: 100,
      count_balita: 15,
      count_lansia: 10,
      count_perempuan: 45,
      count_pria: 55,
      count_disabilitas: 3,
      pj_phone: "081234567890",
      pj_name: "Test PJ",
    }),
  });
  const poskoBody = await poskoRes.json();
  testPoskoId = poskoBody.posko._id;
});

test.after(async () => {
  if (server) await stopTestServer(server);
});

test("POST /api/ai/quick-request without auth returns 401", async () => {
  const res = await fetch(`${baseUrl}/api/ai/quick-request`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      posko_id: testPoskoId,
      commodity: "beras",
      quantity: "50",
      unit: "kg",
    }),
  });
  assert.equal(res.status, 401);
});

test("POST /api/ai/quick-request rejects missing fields", async () => {
  const res = await fetch(`${baseUrl}/api/ai/quick-request`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader(token) },
    body: JSON.stringify({ posko_id: testPoskoId, commodity: "beras" }),
  });
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(body.ok, false);
});

test("POST /api/ai/quick-request creates a request", async () => {
  const res = await fetch(`${baseUrl}/api/ai/quick-request`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader(token) },
    body: JSON.stringify({
      posko_id: testPoskoId,
      commodity: "beras",
      quantity: "50",
      unit: "kg",
      priority: "high",
      note: "Test quick request",
    }),
  });
  assert.equal(res.status, 201);
  const body = await res.json();
  assert.equal(body.ok, true);
  assert.ok(body.request);
  assert.equal(body.request.status, "menunggu");
  assert.equal(body.request.priority, "high");
  assert.equal(body.request.items[0].commodity, "beras");
  assert.equal(body.request.items[0].quantity, 50);
  assert.equal(body.request.items[0].unit, "kg");
});

test("POST /api/ai/quick-request creates with default priority", async () => {
  const res = await fetch(`${baseUrl}/api/ai/quick-request`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader(token) },
    body: JSON.stringify({
      posko_id: testPoskoId,
      commodity: "mie_instan",
      quantity: "100",
      unit: "pcs",
    }),
  });
  assert.equal(res.status, 201);
  const body = await res.json();
  assert.equal(body.request.priority, "normal");
});

test("POST /api/ai/quick-request rejects invalid posko_id", async () => {
  const res = await fetch(`${baseUrl}/api/ai/quick-request`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader(token) },
    body: JSON.stringify({
      posko_id: "posko::nonexistent",
      commodity: "beras",
      quantity: "10",
      unit: "kg",
    }),
  });
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(body.ok, false);
});
