import test from "node:test";
import assert from "node:assert/strict";
import {
  createAnomalyReportDoc,
  validateLogShieldDocument,
} from "../src/document-schema.js";

const VALID_PAYLOAD = {
  posko_id: "posko::550e8400-e29b-41d4-a716-446655440000",
  commodity: "Beras",
  severity: "high",
  status: "reported",
  reported_by: "user::athar",
  description: "Beras basah terkena air hujan",
  location: "Gudang A, Rak 3",
};

test("creates anomaly report with generated UUID id", () => {
  const doc = createAnomalyReportDoc(VALID_PAYLOAD, new Date("2026-05-14T10:00:00.000Z"));

  assert.match(doc._id, /^anomaly_report::/);
  assert.equal(doc.type, "anomaly_report");
  assert.equal(doc.posko_id, VALID_PAYLOAD.posko_id);
  assert.equal(doc.commodity, VALID_PAYLOAD.commodity);
  assert.equal(doc.severity, "high");
  assert.equal(doc.status, "reported");
  assert.equal(doc.reported_by, VALID_PAYLOAD.reported_by);
  assert.equal(doc.description, VALID_PAYLOAD.description);
  assert.equal(doc.location, VALID_PAYLOAD.location);
  assert.equal(doc.created_at, "2026-05-14T10:00:00.000Z");
  assert.equal(doc.updated_at, "2026-05-14T10:00:00.000Z");
});

test("creates anomaly report with default severity medium when omitted", () => {
  const doc = createAnomalyReportDoc(
    { ...VALID_PAYLOAD, severity: undefined },
    new Date("2026-05-14T10:00:00.000Z")
  );

  assert.equal(doc.severity, "medium");
});

test("creates anomaly report with default status reported when omitted", () => {
  const doc = createAnomalyReportDoc(
    { ...VALID_PAYLOAD, status: undefined },
    new Date("2026-05-14T10:00:00.000Z")
  );

  assert.equal(doc.status, "reported");
});

test("validates a complete anomaly report document", () => {
  const doc = createAnomalyReportDoc(VALID_PAYLOAD);
  assert.equal(validateLogShieldDocument(doc), doc);
});

test("rejects anomaly report with invalid severity", () => {
  assert.throws(
    () =>
      validateLogShieldDocument({
        _id: "anomaly_report::abc",
        type: "anomaly_report",
        posko_id: "posko::abc",
        commodity: "Beras",
        severity: "extreme",
        status: "reported",
        reported_by: "user::athar",
        created_at: "2026-05-14T10:00:00.000Z",
        updated_at: "2026-05-14T10:00:00.000Z",
      }),
    /severity must be one of/
  );
});

test("rejects anomaly report with invalid status", () => {
  assert.throws(
    () =>
      validateLogShieldDocument({
        _id: "anomaly_report::abc",
        type: "anomaly_report",
        posko_id: "posko::abc",
        commodity: "Beras",
        severity: "medium",
        status: "deleted",
        reported_by: "user::athar",
        created_at: "2026-05-14T10:00:00.000Z",
        updated_at: "2026-05-14T10:00:00.000Z",
      }),
    /status must be one of/
  );
});

test("rejects anomaly report missing required fields", () => {
  assert.throws(
    () =>
      validateLogShieldDocument({
        _id: "anomaly_report::abc",
        type: "anomaly_report",
        created_at: "2026-05-14T10:00:00.000Z",
        updated_at: "2026-05-14T10:00:00.000Z",
      }),
    /posko_id/
  );
});

test("accepts anomaly report without optional description and location", () => {
  const doc = createAnomalyReportDoc(
    {
      posko_id: "posko::abc",
      commodity: "Terpal",
      severity: "low",
      reported_by: "user::athar",
    },
    new Date("2026-05-14T10:00:00.000Z")
  );

  assert.equal(doc.description, "");
  assert.equal(doc.location, "");
  assert.equal(validateLogShieldDocument(doc), doc);
});

test("accepts all valid severity values", () => {
  for (const severity of ["low", "medium", "high", "critical"]) {
    const doc = createAnomalyReportDoc(
      { ...VALID_PAYLOAD, severity },
      new Date("2026-05-14T10:00:00.000Z")
    );
    assert.equal(doc.severity, severity);
    assert.equal(validateLogShieldDocument(doc), doc);
  }
});

test("accepts all valid status values", () => {
  for (const status of ["reported", "investigating", "resolved"]) {
    const doc = createAnomalyReportDoc(
      { ...VALID_PAYLOAD, status },
      new Date("2026-05-14T10:00:00.000Z")
    );
    assert.equal(doc.status, status);
    assert.equal(validateLogShieldDocument(doc), doc);
  }
});
