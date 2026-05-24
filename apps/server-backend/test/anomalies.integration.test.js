import test from "node:test";
import assert from "node:assert/strict";
import {
  startTestServer,
  stopTestServer,
  createTestToken,
  authHeader,
} from "./helpers/setup.js";

let server, baseUrl;
let token;

test.before(async () => {
  const s = await startTestServer();
  server = s.server;
  baseUrl = s.baseUrl;
  token = createTestToken();
});

test.after(async () => {
  if (server) await stopTestServer(server);
});

test("POST /api/anomalies without auth returns 401", async () => {
  const res = await fetch(`${baseUrl}/api/anomalies`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ commodity: "beras", posko_id: "test::posko" }),
  });
  assert.equal(res.status, 401);
  const body = await res.json();
  assert.equal(body.ok, false);
});

test("GET /api/anomalies without auth returns 401", async () => {
  const res = await fetch(`${baseUrl}/api/anomalies`);
  assert.equal(res.status, 401);
});

test("POST /api/anomalies creates a new anomaly report", async () => {
  const payload = {
    posko_id: "test::posko::001",
    commodity: "beras",
    severity: "high",
    description: "Stok beras menipis drastis",
    location: "Gudang Utama",
  };
  const res = await fetch(`${baseUrl}/api/anomalies`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader(token) },
    body: JSON.stringify(payload),
  });
  assert.equal(res.status, 201);
  const body = await res.json();
  assert.equal(body.ok, true);
  assert.ok(body.report._id);
  assert.ok(body.report._rev);
  assert.equal(body.report.commodity, "beras");
  assert.equal(body.report.severity, "high");
  assert.equal(body.report.status, "reported");
  assert.equal(body.report.description, "Stok beras menipis drastis");
  assert.equal(body.report.location, "Gudang Utama");
});

test("POST /api/anomalies uses default severity medium", async () => {
  const payload = {
    posko_id: "test::posko::002",
    commodity: "mie_instan",
  };
  const res = await fetch(`${baseUrl}/api/anomalies`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader(token) },
    body: JSON.stringify(payload),
  });
  assert.equal(res.status, 201);
  const body = await res.json();
  assert.equal(body.report.severity, "medium");
});

test("GET /api/anomalies lists anomaly reports", async () => {
  const res = await fetch(`${baseUrl}/api/anomalies`, {
    headers: authHeader(token),
  });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.ok(Array.isArray(body.rows));
  assert.ok(body.count >= 2);
});

test("GET /api/anomalies filters by severity", async () => {
  const res = await fetch(`${baseUrl}/api/anomalies?severity=high`, {
    headers: authHeader(token),
  });
  assert.equal(res.status, 200);
  const body = await res.json();
  for (const row of body.rows) {
    assert.equal(row.severity, "high");
  }
});

test("GET /api/anomalies/:id returns specific report", async () => {
  const createRes = await fetch(`${baseUrl}/api/anomalies`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader(token) },
    body: JSON.stringify({ posko_id: "test::posko::003", commodity: "selimut" }),
  });
  const created = await createRes.json();
  const reportId = created.report._id;

  const res = await fetch(`${baseUrl}/api/anomalies/${encodeURIComponent(reportId)}`, {
    headers: authHeader(token),
  });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body._id, reportId);
  assert.equal(body.commodity, "selimut");
});

test("GET /api/anomalies/:id returns 404 for non-existent id", async () => {
  const res = await fetch(`${baseUrl}/api/anomalies/nonexistent_id`, {
    headers: authHeader(token),
  });
  assert.equal(res.status, 404);
});

test("PATCH /api/anomalies/:id/status updates to investigating", async () => {
  const createRes = await fetch(`${baseUrl}/api/anomalies`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader(token) },
    body: JSON.stringify({ posko_id: "test::posko::004", commodity: "air_minum" }),
  });
  const created = await createRes.json();
  const reportId = created.report._id;

  const res = await fetch(`${baseUrl}/api/anomalies/${encodeURIComponent(reportId)}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeader(token) },
    body: JSON.stringify({ status: "investigating" }),
  });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.ok, true);
  assert.equal(body.report.status, "investigating");
});

test("PATCH /api/anomalies/:id/status rejects invalid status", async () => {
  const createRes = await fetch(`${baseUrl}/api/anomalies`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader(token) },
    body: JSON.stringify({ posko_id: "test::posko::005", commodity: "beras" }),
  });
  const created = await createRes.json();
  const reportId = created.report._id;

  const res = await fetch(`${baseUrl}/api/anomalies/${encodeURIComponent(reportId)}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeader(token) },
    body: JSON.stringify({ status: "invalid_status" }),
  });
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(body.ok, false);
});

test("PATCH /api/anomalies/:id/status full lifecycle: reported -> investigating -> resolved", async () => {
  const createRes = await fetch(`${baseUrl}/api/anomalies`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader(token) },
    body: JSON.stringify({ posko_id: "test::posko::006", commodity: "obat_obatan", severity: "critical" }),
  });
  const created = await createRes.json();
  const reportId = created.report._id;

  const investRes = await fetch(`${baseUrl}/api/anomalies/${encodeURIComponent(reportId)}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeader(token) },
    body: JSON.stringify({ status: "investigating" }),
  });
  assert.equal(investRes.status, 200);
  const invested = await investRes.json();
  assert.equal(invested.report.status, "investigating");

  const resolveRes = await fetch(`${baseUrl}/api/anomalies/${encodeURIComponent(reportId)}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeader(token) },
    body: JSON.stringify({ status: "resolved" }),
  });
  assert.equal(resolveRes.status, 200);
  const resolved = await resolveRes.json();
  assert.equal(resolved.report.status, "resolved");
});

test("POST /api/anomalies rejects request without posko_id", async () => {
  const res = await fetch(`${baseUrl}/api/anomalies`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader(token) },
    body: JSON.stringify({ commodity: "beras" }),
  });
  assert.equal(res.status, 400);
});
