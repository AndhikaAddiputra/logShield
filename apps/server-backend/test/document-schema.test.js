import test from "node:test";
import assert from "node:assert/strict";
import {
  createAuditLogDoc,
  createPoskoDoc,
  createRequestDoc,
  createStockMovementDoc,
  createStockReadingDoc,
  validateLogShieldDocument,
} from "../src/document-schema.js";

const POSKO_ID = "posko::550e8400-e29b-41d4-a716-446655440000";

test("validates a PDF-aligned user document", () => {
  const doc = {
    _id: "user::550e8400-e29b-41d4-a716-446655440000",
    type: "user",
    email: "athar@athar.com",
    name: "Athar",
    nik: "encrypted-nik-value",
    kib_bencana_id: "BNC-2026-JK-0001",
    role: "lapangan",
    posko_id: POSKO_ID,
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
    _id: POSKO_ID,
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

test("creates posko documents with generated ids and repeatable KIB", () => {
  const input = {
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
  };

  const first = createPoskoDoc(input, new Date("2026-05-14T10:00:00.000Z"));
  const second = createPoskoDoc(input, new Date("2026-05-14T10:00:00.000Z"));

  assert.match(first._id, /^posko::[0-9a-f-]{36}$/);
  assert.match(second._id, /^posko::[0-9a-f-]{36}$/);
  assert.notEqual(first._id, second._id);
  assert.equal(first.kib_16, second.kib_16);
  assert.equal(validateLogShieldDocument(first), first);
  assert.equal(validateLogShieldDocument(second), second);
});

test("validates signup_request, auth_credential, and email_outbox documents", () => {
  const signup = {
    _id: "signup_request::abc",
    type: "signup_request",
    email: "athar@athar.com",
    name: "Athar",
    nik: "encrypted-nik",
    nik_lookup_hash: "hash",
    phone: "081234567890",
    status: "pending",
    reviewed_by: null,
    reviewed_at: null,
    rejection_reason: null,
    created_at: "2026-05-14T10:00:00.000Z",
    updated_at: "2026-05-14T10:00:00.000Z",
  };
  const credential = {
    _id: "auth_credential::user::abc",
    type: "auth_credential",
    user_id: "user::abc",
    email: "athar@athar.com",
    nik: "encrypted-nik",
    nik_lookup_hash: "hash",
    password_hash: "$2a$12$hashed",
    status: "active",
    couch_username: "athar@athar.com",
    couch_password_enc: "encrypted-password",
    created_at: "2026-05-14T10:00:00.000Z",
    updated_at: "2026-05-14T10:00:00.000Z",
  };
  const outbox = {
    _id: "email_outbox::1778752800000::abc",
    type: "email_outbox",
    to: "athar@athar.com",
    subject: "Approved",
    body: "Your account is approved.",
    status: "queued",
    related_signup_id: "signup_request::abc",
    related_user_id: "user::abc",
    created_at: "2026-05-14T10:00:00.000Z",
    sent_at: null,
  };

  assert.equal(validateLogShieldDocument(signup), signup);
  assert.equal(validateLogShieldDocument(credential), credential);
  assert.equal(validateLogShieldDocument(outbox), outbox);
});

test("rejects invalid posko KIB", () => {
  assert.throws(
    () =>
      validateLogShieldDocument({
        _id: POSKO_ID,
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
    /kib_16 has invalid format/
  );
});

test("rejects invalid posko status", () => {
  assert.throws(
    () =>
      validateLogShieldDocument({
        _id: POSKO_ID,
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

test("creates and validates a logistics request document", () => {
  const doc = createRequestDoc(
    {
      request_code: "REQ-20260515-001",
      posko_id: POSKO_ID,
      submitted_by: "user::athar",
      status: "mendesak",
      priority: "critical",
      items: [
        {
          commodity: "Beras",
          quantity: 500,
          unit: "kg",
          note: "Stok +-3 hari",
        },
      ],
    },
    new Date("2026-05-15T13:32:00.000Z")
  );

  assert.equal(doc._id, "request::REQ-20260515-001");
  assert.equal(doc.processed_by, null);
  assert.equal(doc.processed_at, null);
  assert.equal(validateLogShieldDocument(doc), doc);
});

test("rejects invalid request fields", () => {
  assert.throws(
    () =>
      createRequestDoc(
        {
          request_code: "REG-20260515-001",
          posko_id: POSKO_ID,
          submitted_by: "user::athar",
          items: [],
          status: "open",
          priority: "urgent",
        },
        new Date("2026-05-15T13:32:00.000Z")
      ),
    /_id has invalid format|items must be a non-empty array|status must be one of|priority must be one of/
  );
});

test("accepts prediction ID with posko document id inside it", () => {
  const doc = {
    _id: `prediction::${POSKO_ID}::beras::2026-05-15`,
    type: "prediction",
    posko_id: POSKO_ID,
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

test("validates synced AI recommendation and anomaly documents", () => {
  const recommendation = {
    _id: "ai_recommendation::1778752800000::abc::0001",
    type: "ai_recommendation",
    run_id: "1778752800000::abc",
    forecast_date: "2026-05-15",
    kib_bencana_id: "BNC-2026-JK-0001",
    disaster_type: "banjir_longsor",
    posko_id: "POSKO-001",
    posko_name: "Posko Utama",
    item_name: "beras",
    unit: "kg",
    recommended_qty: 120,
    shortage_qty: 100,
    coverage_days: 0.8,
    risk_level: "kritis",
    priority_score: 92.5,
    trust_score: 0.82,
    rationale_chips: ["Coverage stok kurang dari 1 hari."],
    synced_at: "2026-05-14T10:00:00.000Z",
  };
  const anomaly = {
    _id: "ai_anomaly::1778752800000::abc::0001",
    type: "ai_anomaly",
    run_id: "1778752800000::abc",
    date: "2026-05-15",
    kib_bencana_id: "BNC-2026-JK-0001",
    disaster_type: "banjir_longsor",
    posko_id: "POSKO-001",
    posko_name: "Posko Utama",
    item_name: "beras",
    unit: "kg",
    anomaly_type: "critical_stock",
    severity: "high",
    score: 0.95,
    message: "Stok kritis.",
    action_suggestion: "Restock segera.",
    synced_at: "2026-05-14T10:00:00.000Z",
  };

  assert.equal(validateLogShieldDocument(recommendation), recommendation);
  assert.equal(validateLogShieldDocument(anomaly), anomaly);
});

test("validates synced AI run summary document", () => {
  const doc = {
    _id: "ai_run_summary::1778752800000::abc",
    type: "ai_run_summary",
    status: "ready",
    dataset: { rows: 195337 },
    forecasting: { evaluated_series: 4321 },
    recommendation_counts: { kritis: 10 },
    anomaly_counts: { high: 5 },
    synced_at: "2026-05-14T10:00:00.000Z",
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

test("creates append-only stock_movement document shape", () => {
  const doc = createStockMovementDoc(
    {
      warehouse_id: "WH-JKT-001",
      commodity: "beras",
      category: "pangan",
      quantity: 500,
      unit: "kg",
      movement_type: "in",
      source: "manual",
      created_by: "user::athar",
    },
    new Date("2026-05-14T10:00:00.000Z")
  );

  assert.match(doc._id, /^stock_movement::1778752800000::/);
  assert.equal(validateLogShieldDocument(doc), doc);
});
