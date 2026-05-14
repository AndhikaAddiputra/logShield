import test from "node:test";
import assert from "node:assert/strict";
import {
  createAuditLogDoc,
  createStockReadingDoc,
  validateLogShieldDocument,
} from "../src/document-schema.js";

test("validates a PDF-aligned user document", () => {
  const doc = {
    _id: "user::550e8400-e29b-41d4-a716-446655440000",
    type: "user",
    email: "athar@athar.com",
    name: "Athar",
    nik: "encrypted-nik-value",
    kib_bencana_id: "BNC-2026-JK-0001",
    role: "lapangan",
    posko_id: "posko::1234567890123456",
    phone: "081234567890",
    avatar_url: "https://example.com/avatar.png",
    created_at: "2026-05-14T10:00:00.000Z",
    updated_at: "2026-05-14T10:00:00.000Z",
  };

  assert.equal(validateLogShieldDocument(doc), doc);
});

test("rejects raw NIK in user document", () => {
  assert.throws(
    () =>
      validateLogShieldDocument({
        _id: "user::abc",
        type: "user",
        email: "athar@athar.com",
        name: "Athar",
        nik: "1234123412341234",
        kib_bencana_id: "BNC-2026-JK-0001",
        role: "lapangan",
        posko_id: null,
        phone: "081234567890",
        created_at: "2026-05-14T10:00:00.000Z",
        updated_at: "2026-05-14T10:00:00.000Z",
      }),
    /encrypted/
  );
});

test("rejects invalid user role", () => {
  assert.throws(
    () =>
      validateLogShieldDocument({
        _id: "user::abc",
        type: "user",
        email: "athar@athar.com",
        name: "Athar",
        nik: "encrypted-nik-value",
        kib_bencana_id: "BNC-2026-JK-0001",
        role: "field",
        posko_id: null,
        phone: "081234567890",
        created_at: "2026-05-14T10:00:00.000Z",
        updated_at: "2026-05-14T10:00:00.000Z",
      }),
    /role must be one of/
  );
});

test("validates a PDF-aligned posko document", () => {
  const doc = {
    _id: "posko::1234567890123456",
    type: "posko",
    kib_16: "1234567890123456",
    name: "Posko Evakuasi Rajeg",
    address: "Jl. Raya Rajeg",
    province: "Banten",
    district: "Kabupaten Tangerang",
    total_pengungsi: 100,
    count_balita: 10,
    count_lansia: 12,
    count_perempuan: 45,
    count_pria: 43,
    count_disabilitas: 3,
    pj_name: "Athar",
    pj_phone: "081234567890",
    status: "active",
    created_at: "2026-05-14T10:00:00.000Z",
    updated_at: "2026-05-14T10:00:00.000Z",
  };

  assert.equal(validateLogShieldDocument(doc), doc);
});

test("rejects invalid posko KIB", () => {
  assert.throws(
    () =>
      validateLogShieldDocument({
        _id: "posko::123",
        type: "posko",
        kib_16: "123",
        name: "Posko",
        address: "Alamat",
        province: "Banten",
        district: "Tangerang",
        total_pengungsi: 0,
        count_balita: 0,
        count_lansia: 0,
        count_perempuan: 0,
        count_pria: 0,
        count_disabilitas: 0,
        pj_name: "Athar",
        pj_phone: "081234567890",
        status: "active",
        created_at: "2026-05-14T10:00:00.000Z",
        updated_at: "2026-05-14T10:00:00.000Z",
      }),
    /_id has invalid format/
  );
});

test("rejects invalid posko status", () => {
  assert.throws(
    () =>
      validateLogShieldDocument({
        _id: "posko::1234567890123456",
        type: "posko",
        kib_16: "1234567890123456",
        name: "Posko",
        address: "Alamat",
        province: "Banten",
        district: "Tangerang",
        total_pengungsi: 0,
        count_balita: 0,
        count_lansia: 0,
        count_perempuan: 0,
        count_pria: 0,
        count_disabilitas: 0,
        pj_name: "Athar",
        pj_phone: "081234567890",
        status: "open",
        created_at: "2026-05-14T10:00:00.000Z",
        updated_at: "2026-05-14T10:00:00.000Z",
      }),
    /status must be one of/
  );
});

test("validates a PDF-aligned distribution document", () => {
  const doc = {
    _id: "distribution::1234567890123456::550e8400-e29b-41d4-a716-446655440000",
    type: "distribution",
    kib_16: "1234567890123456",
    posko_id: "posko::JKT-001",
    officer_id: "user::OFF-001",
    commodity: "beras",
    quantity: 10,
    unit: "kg",
    recipient_kib: "encrypted-value",
    vulnerable_group: "umum",
    notes: "prioritas keluarga",
    synced: false,
    created_at: "2026-05-14T10:00:00.000Z",
    synced_at: null,
  };

  assert.equal(validateLogShieldDocument(doc), doc);
});

test("rejects invalid distribution unit", () => {
  assert.throws(
    () =>
      validateLogShieldDocument({
        _id: "distribution::1234567890123456::abc",
        type: "distribution",
        kib_16: "1234567890123456",
        posko_id: "posko::JKT-001",
        officer_id: "user::OFF-001",
        commodity: "beras",
        quantity: 10,
        unit: "box",
        recipient_kib: "encrypted-value",
        vulnerable_group: null,
        synced: false,
        created_at: "2026-05-14T10:00:00.000Z",
        synced_at: null,
      }),
    /unit must be one of/
  );
});

test("creates stock_reading with default sample_count", () => {
  const doc = createStockReadingDoc(
    {
      warehouse_id: "WH-JKT-001",
      node_id: "NODE-07",
      commodity: "beras",
      weight_g: 12000,
      weight_delta_g: -250,
      rssi: -62,
      uptime_s: 3600,
      battery_mv: null,
      timestamp: "2026-05-14T10:00:00.000Z",
    },
    new Date("2026-05-14T10:00:05.000Z")
  );

  assert.equal(doc.sample_count, 15);
  assert.equal(doc._id, "stock_reading::WH-JKT-001::NODE-07::1778752800000");
  assert.equal(validateLogShieldDocument(doc), doc);
});

test("rejects prediction outside confidence interval", () => {
  assert.throws(
    () =>
      validateLogShieldDocument({
        _id: "prediction::posko::beras::2026-05-15",
        type: "prediction",
        posko_id: "posko",
        commodity: "beras",
        prediction_date: "2026-05-15",
        predicted_kg: 100,
        confidence_low: 120,
        confidence_high: 150,
        mae_last_7d: 12,
        shap_values: { recent_distribution: 0.7 },
        rationale_chips: [
          {
            feature: "recent_distribution",
            narrative: "Distribusi naik",
            shap_value: 0.7,
          },
        ],
        model_version: "v1",
        created_at: "2026-05-14T10:00:00.000Z",
      }),
    /predicted_kg/
  );
});

test("accepts prediction ID with posko document id inside it", () => {
  const doc = {
    _id: "prediction::posko::1234567890123456::beras::2026-05-15",
    type: "prediction",
    posko_id: "posko::1234567890123456",
    commodity: "beras",
    prediction_date: "2026-05-15",
    predicted_kg: 100,
    confidence_low: 80,
    confidence_high: 120,
    mae_last_7d: 12,
    shap_values: { recent_distribution: 0.7 },
    rationale_chips: [
      {
        feature: "recent_distribution",
        narrative: "Distribusi naik",
        shap_value: 0.7,
      },
    ],
    model_version: "v1",
    created_at: "2026-05-14T10:00:00.000Z",
  };

  assert.equal(validateLogShieldDocument(doc), doc);
});

test("creates append-only audit_log document shape", () => {
  const doc = createAuditLogDoc(
    {
      user_id: null,
      action: "create_distribution",
      target_type: "distribution",
      target_id: "distribution::1234567890123456::abc",
      old_values: null,
      new_values: { type: "distribution" },
      ip_address: "127.0.0.1",
      status: "sukses",
    },
    new Date("2026-05-14T10:00:00.000Z")
  );

  assert.match(doc._id, /^audit_log::1778752800000::/);
  assert.equal(validateLogShieldDocument(doc), doc);
});
