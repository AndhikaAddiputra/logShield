import test from "node:test";
import assert from "node:assert/strict";
import {
  COMMODITY_SPECS,
  NAME_ALIASES,
  normalizeItemName,
  getCommoditySpec,
  recalcForecastQty,
  buildRecommendationChips,
  computeTrendAnalysis,
  computeDataAttribution,
  round2,
} from "../src/ai.js";

test("COMMODITY_SPECS has all expected commodities", () => {
  assert.ok(COMMODITY_SPECS.air_bersih);
  assert.ok(COMMODITY_SPECS.air_minum);
  assert.ok(COMMODITY_SPECS.beras);
  assert.ok(COMMODITY_SPECS.mie_instan);
  assert.ok(COMMODITY_SPECS.minyak_goreng);
  assert.ok(COMMODITY_SPECS.protein);
  assert.ok(COMMODITY_SPECS.mpasi);
  assert.ok(COMMODITY_SPECS.obat_obatan);
  assert.ok(COMMODITY_SPECS.masker);
  assert.ok(COMMODITY_SPECS.pembalut);
  assert.ok(COMMODITY_SPECS.popok_bayi);
  assert.ok(COMMODITY_SPECS.hygiene_kit);
  assert.ok(COMMODITY_SPECS.baterai);
  assert.ok(COMMODITY_SPECS.selimut);
  assert.ok(COMMODITY_SPECS.matras);
  assert.ok(COMMODITY_SPECS.radio_ht);
  assert.equal(Object.keys(COMMODITY_SPECS).length, 16);
});

test("COMMODITY_SPECS has valid class values", () => {
  for (const [key, spec] of Object.entries(COMMODITY_SPECS)) {
    assert.ok(["konsumsi_harian", "konsumsi_berkala", "perlengkapan_tahan_lama", "elektronik_logistik"].includes(spec.class),
      `${key} has invalid class: ${spec.class}`);
  }
});

test("COMMODITY_SPECS has valid category values", () => {
  for (const [key, spec] of Object.entries(COMMODITY_SPECS)) {
    assert.ok(["pangan", "sandang", "papan", "lainnya"].includes(spec.category),
      `${key} has invalid category: ${spec.category}`);
  }
});

test("COMMODITY_SPECS has positive qty for all items", () => {
  for (const [key, spec] of Object.entries(COMMODITY_SPECS)) {
    assert.ok(spec.qty > 0, `${key} has non-positive qty: ${spec.qty}`);
  }
});

test("COMMODITY_SPECS has valid unit for all items", () => {
  for (const [key, spec] of Object.entries(COMMODITY_SPECS)) {
    assert.ok(spec.unit, `${key} has no unit`);
    assert.equal(typeof spec.unit, "string");
  }
});

test("konsumsi_berkala items have period_days", () => {
  for (const [key, spec] of Object.entries(COMMODITY_SPECS)) {
    if (spec.class === "konsumsi_berkala") {
      assert.ok(spec.period_days > 0, `${key} has no period_days`);
    }
  }
});

test("NAME_ALIASES maps all expected aliases", () => {
  assert.equal(NAME_ALIASES.radio, "radio_ht");
  assert.equal(normalizeItemName("radio ht"), "radio_ht");
  assert.equal(NAME_ALIASES.popok, "popok_bayi");
  assert.equal(normalizeItemName("popok bayi"), "popok_bayi");
  assert.equal(NAME_ALIASES.air, "air_bersih");
  assert.equal(normalizeItemName("air bersih"), "air_bersih");
  assert.equal(normalizeItemName("air minum"), "air_minum");
  assert.equal(normalizeItemName("mie instan"), "mie_instan");
  assert.equal(NAME_ALIASES.minyak, "minyak_goreng");
  assert.equal(normalizeItemName("minyak goreng"), "minyak_goreng");
  assert.equal(NAME_ALIASES.hygiene, "hygiene_kit");
  assert.equal(normalizeItemName("hygiene kit"), "hygiene_kit");
});

test("normalizeItemName handles direct commodity names", () => {
  assert.equal(normalizeItemName("beras"), "beras");
  assert.equal(normalizeItemName("Beras"), "beras");
  assert.equal(normalizeItemName("MIE INSTAN"), "mie_instan");
  assert.equal(normalizeItemName("Selimut"), "selimut");
});

test("normalizeItemName resolves aliases", () => {
  assert.equal(normalizeItemName("Radio"), "radio_ht");
  assert.equal(normalizeItemName("Popok Bayi"), "popok_bayi");
  assert.equal(normalizeItemName("Air Mineral"), "air_mineral");
  assert.equal(normalizeItemName("Mie Instan"), "mie_instan");
});

test("normalizeItemName handles unknown commodities gracefully", () => {
  assert.equal(normalizeItemName("Some Unknown Item"), "some_unknown_item");
});

test("normalizeItemName normalizes spaces and case", () => {
  assert.equal(normalizeItemName("  Beras  "), "beras");
  assert.equal(normalizeItemName("MIE   INSTAN"), "mie_instan");
});

test("getCommoditySpec returns spec for known commodity", () => {
  const spec = getCommoditySpec("beras");
  assert.ok(spec);
  assert.equal(spec.class, "konsumsi_harian");
  assert.equal(spec.category, "pangan");
  assert.equal(spec.unit, "kg");
  assert.equal(spec.qty, 0.4);
});

test("getCommoditySpec resolves aliases", () => {
  const spec = getCommoditySpec("Radio");
  assert.ok(spec);
  assert.equal(spec.class, "elektronik_logistik");
  assert.equal(spec.category, "lainnya");
});

test("getCommoditySpec returns null for unknown commodity", () => {
  assert.equal(getCommoditySpec("unknown_item"), null);
});

test("recalcForecastQty: konsumsi_harian uses pengungsi * qty + vulnerable bonus", () => {
  const qty = recalcForecastQty("beras", 100, 20, 0, 0);
  const base = 100 * 0.4;
  const bonus = base * (1 + Math.min(20 / 100, 0.35));
  assert.equal(qty, round2(bonus));
});

test("recalcForecastQty: konsumsi_harian with high vulnerability is capped", () => {
  const qty = recalcForecastQty("beras", 100, 80, 0, 0);
  assert.ok(qty > 0);
  const base = 100 * 0.4;
  const bonus = base * (1 + Math.min(80 / 100, 0.35));
  assert.equal(qty, round2(bonus));
});

test("recalcForecastQty: konsumsi_berkala divides by period_days", () => {
  const spec = COMMODITY_SPECS.pembalut;
  assert.equal(spec.class, "konsumsi_berkala");
  const qty = recalcForecastQty("pembalut", 100, 0, 0, 0);
  const expected = round2(100 * spec.qty / spec.period_days);
  assert.equal(qty, expected);
});

test("recalcForecastQty: perlengkapan_tahan_lama uses ceil(pengungsi * qty) / 7", () => {
  const spec = COMMODITY_SPECS.selimut;
  assert.equal(spec.class, "perlengkapan_tahan_lama");
  const qty = recalcForecastQty("selimut", 100, 0, 0, 0);
  const expected = round2(Math.ceil(100 * spec.qty) / 7);
  assert.equal(qty, expected);
});

test("recalcForecastQty: elektronik_logistik returns fixed qty per posko", () => {
  const spec = COMMODITY_SPECS.radio_ht;
  assert.equal(spec.class, "elektronik_logistik");
  const qty = recalcForecastQty("radio_ht", 100, 0, 0, 0);
  assert.equal(qty, spec.qty);
});

test("recalcForecastQty: elektronik_logistik ignores population size", () => {
  const qtySmall = recalcForecastQty("radio_ht", 10, 0, 0, 0);
  const qtyLarge = recalcForecastQty("radio_ht", 1000, 0, 0, 0);
  assert.equal(qtySmall, qtyLarge);
});

test("recalcForecastQty: respects requestedQty when it exceeds base", () => {
  const qty = recalcForecastQty("beras", 10, 0, 100, 0);
  const base = 10 * 0.4;
  assert.ok(qty > base, "qty should be boosted by requestedQty");
});

test("recalcForecastQty: respects criticalThreshold when it exceeds others", () => {
  const qty = recalcForecastQty("beras", 10, 0, 0, 200);
  assert.ok(qty > 0, "qty should be positive from threshold");
});

test("recalcForecastQty: returns at least 0 (no negative)", () => {
  const qty = recalcForecastQty("beras", 0, 0, 0, 0);
  assert.ok(qty >= 0);
});

test("recalcForecastQty: handles zero pengungsi gracefully", () => {
  const qty = recalcForecastQty("beras", 0, 10, 0, 0);
  assert.ok(qty >= 0);
});

test("computeTrendAnalysis: detects rising trend", () => {
  const today = new Date();
  const requests = [
    { posko_id: "posko::abc", created_at: new Date(today.getTime() - 1 * 86400000).toISOString(), items: [{ commodity: "beras", quantity: 50 }] },
    { posko_id: "posko::abc", created_at: new Date(today.getTime() - 3 * 86400000).toISOString(), items: [{ commodity: "beras", quantity: 30 }] },
    { posko_id: "posko::abc", created_at: new Date(today.getTime() - 14 * 86400000).toISOString(), items: [{ commodity: "beras", quantity: 10 }] },
    { posko_id: "posko::abc", created_at: new Date(today.getTime() - 21 * 86400000).toISOString(), items: [{ commodity: "beras", quantity: 5 }] },
  ];
  const trend = computeTrendAnalysis(requests, "posko::abc", "beras");
  assert.equal(trend.direction, "rising");
  assert.ok(trend.pct7d > 20);
});

test("computeTrendAnalysis: detects falling trend", () => {
  const today = new Date();
  const requests = [
    { posko_id: "posko::abc", created_at: new Date(today.getTime() - 1 * 86400000).toISOString(), items: [{ commodity: "beras", quantity: 5 }] },
    { posko_id: "posko::abc", created_at: new Date(today.getTime() - 3 * 86400000).toISOString(), items: [{ commodity: "beras", quantity: 10 }] },
    { posko_id: "posko::abc", created_at: new Date(today.getTime() - 14 * 86400000).toISOString(), items: [{ commodity: "beras", quantity: 50 }] },
    { posko_id: "posko::abc", created_at: new Date(today.getTime() - 21 * 86400000).toISOString(), items: [{ commodity: "beras", quantity: 40 }] },
  ];
  const trend = computeTrendAnalysis(requests, "posko::abc", "beras");
  assert.equal(trend.direction, "falling");
  assert.ok(trend.pct7d < -20);
});

test("computeTrendAnalysis: returns stable when change is within 20%", () => {
  const today = new Date();
  const requests = [
    { posko_id: "posko::abc", created_at: new Date(today.getTime() - 1 * 86400000).toISOString(), items: [{ commodity: "beras", quantity: 25 }] },
    { posko_id: "posko::abc", created_at: new Date(today.getTime() - 14 * 86400000).toISOString(), items: [{ commodity: "beras", quantity: 22 }] },
  ];
  const trend = computeTrendAnalysis(requests, "posko::abc", "beras");
  assert.equal(trend.direction, "stable");
});

test("computeTrendAnalysis: handles no request data", () => {
  const trend = computeTrendAnalysis([], "posko::abc", "beras");
  assert.equal(trend.direction, "stable");
  assert.equal(trend.pct7d, 0);
  assert.equal(trend.pct30d, 0);
  assert.equal(trend.recent7, 0);
  assert.equal(trend.prior7, 0);
});

test("computeTrendAnalysis: filters by posko_id", () => {
  const today = new Date();
  const requests = [
    { posko_id: "posko::abc", created_at: new Date(today.getTime() - 1 * 86400000).toISOString(), items: [{ commodity: "beras", quantity: 100 }] },
    { posko_id: "posko::other", created_at: new Date(today.getTime() - 1 * 86400000).toISOString(), items: [{ commodity: "beras", quantity: 999 }] },
  ];
  const trend = computeTrendAnalysis(requests, "posko::abc", "beras");
  assert.equal(trend.recent7, 100);
});

test("computeTrendAnalysis: only counts matching commodity via normalizeItemName", () => {
  const today = new Date();
  const requests = [
    { posko_id: "posko::abc", created_at: new Date(today.getTime() - 1 * 86400000).toISOString(), items: [
      { commodity: "Beras", quantity: 30 },
      { commodity: "Mie Instan", quantity: 50 },
    ]},
  ];
  const trend = computeTrendAnalysis(requests, "posko::abc", "beras");
  assert.equal(trend.recent7, 30);
});

test("computeDataAttribution: returns normalized values summing to 1", () => {
  const attribution = computeDataAttribution({
    trend: { direction: "rising", pct7d: 50, pct30d: 80, recent7: 100, prior7: 50 },
    vulnerableRatio: 0.3,
    coverageDays: 0.5,
    shortage: 100,
    forecastQty: 200,
    criticalThreshold: 50,
    currentStock: 10,
  });
  const total = Object.values(attribution).reduce((s, v) => s + v, 0);
  assert.equal(round2(total), 1);
});

test("computeDataAttribution: all keys present", () => {
  const attribution = computeDataAttribution({
    trend: { direction: "stable", pct7d: 0, pct30d: 0, recent7: 0, prior7: 0 },
    vulnerableRatio: 0,
    coverageDays: 99,
    shortage: 0,
    forecastQty: 10,
    criticalThreshold: 10,
    currentStock: 20,
  });
  assert.ok("trend_request_change" in attribution);
  assert.ok("coverage_risk" in attribution);
  assert.ok("vulnerable_impact" in attribution);
  assert.ok("stock_depletion_risk" in attribution);
  assert.ok("threshold_gap" in attribution);
});

test("computeDataAttribution: high shortage and low coverage increase depletion risk", () => {
  const critical = computeDataAttribution({
    trend: { direction: "rising", pct7d: 100, pct30d: 100, recent7: 100, prior7: 0 },
    vulnerableRatio: 0.5,
    coverageDays: 0.2,
    shortage: 500,
    forecastQty: 300,
    criticalThreshold: 200,
    currentStock: 5,
  });
  const stable = computeDataAttribution({
    trend: { direction: "stable", pct7d: 0, pct30d: 0, recent7: 10, prior7: 10 },
    vulnerableRatio: 0,
    coverageDays: 30,
    shortage: 0,
    forecastQty: 10,
    criticalThreshold: 200,
    currentStock: 300,
  });
  assert.ok(critical.stock_depletion_risk > stable.stock_depletion_risk);
  assert.ok(critical.trend_request_change > stable.trend_request_change);
});

test("buildRecommendationChips: returns chips for shortage scenario", () => {
  const chips = buildRecommendationChips({
    commodity: "beras",
    spec: COMMODITY_SPECS.beras,
    forecastQty: 50,
    safetyStock: 20,
    shortage: 30,
    coverageDays: 0.5,
    risk: "kritis",
    vulnerableCount: 10,
    totalPengungsi: 100,
    currentStock: 20,
    unit: "kg",
  });
  assert.ok(chips.length > 0);
  assert.ok(chips.some((c) => c.includes("kekurangan")));
});

test("buildRecommendationChips: returns chips for sufficient stock", () => {
  const chips = buildRecommendationChips({
    commodity: "beras",
    spec: COMMODITY_SPECS.beras,
    forecastQty: 10,
    safetyStock: 5,
    shortage: 0,
    coverageDays: 14,
    risk: "aman",
    vulnerableCount: 0,
    totalPengungsi: 10,
    currentStock: 140,
    unit: "kg",
  });
  assert.ok(chips.some((c) => c.includes("aman")));
});

test("buildRecommendationChips: includes class-based chip for konsumsi_berkala", () => {
  const chips = buildRecommendationChips({
    commodity: "pembalut",
    spec: COMMODITY_SPECS.pembalut,
    forecastQty: 5,
    safetyStock: 2,
    shortage: 0,
    coverageDays: 10,
    risk: "aman",
    vulnerableCount: 0,
    totalPengungsi: 100,
    currentStock: 50,
    unit: "pcs",
  });
  assert.ok(chips.some((c) => c.includes("berkala")));
});

test("buildRecommendationChips: includes class-based chip for perlengkapan_tahan_lama", () => {
  const chips = buildRecommendationChips({
    commodity: "selimut",
    spec: COMMODITY_SPECS.selimut,
    forecastQty: 15,
    safetyStock: 5,
    shortage: 0,
    coverageDays: 30,
    risk: "aman",
    vulnerableCount: 0,
    totalPengungsi: 100,
    currentStock: 450,
    unit: "pcs",
  });
  assert.ok(chips.some((c) => c.includes("tahan lama")));
});

test("buildRecommendationChips: includes vulnerable ratio chip when >15%", () => {
  const chips = buildRecommendationChips({
    commodity: "beras",
    spec: COMMODITY_SPECS.beras,
    forecastQty: 50,
    safetyStock: 20,
    shortage: 0,
    coverageDays: 10,
    risk: "aman",
    vulnerableCount: 30,
    totalPengungsi: 100,
    currentStock: 500,
    unit: "kg",
  });
  assert.ok(chips.some((c) => c.includes("rentan")));
});

test("buildRecommendationChips: returns max 3 chips", () => {
  const chips = buildRecommendationChips({
    commodity: "beras",
    spec: COMMODITY_SPECS.beras,
    forecastQty: 50,
    safetyStock: 20,
    shortage: 30,
    coverageDays: 0.3,
    risk: "kritis",
    vulnerableCount: 40,
    totalPengungsi: 100,
    currentStock: 20,
    unit: "kg",
    trend: { direction: "rising", pct7d: 100, pct30d: 200, recent7: 50, prior7: 10 },
  });
  assert.ok(chips.length <= 3);
});

test("buildRecommendationChips: includes trend chip when rising above 30%", () => {
  const chips = buildRecommendationChips({
    commodity: "beras",
    spec: COMMODITY_SPECS.beras,
    forecastQty: 50,
    safetyStock: 20,
    shortage: 0,
    coverageDays: 10,
    risk: "aman",
    vulnerableCount: 0,
    totalPengungsi: 100,
    currentStock: 500,
    unit: "kg",
    trend: { direction: "rising", pct7d: 50, pct30d: 100, recent7: 30, prior7: 15 },
  });
  assert.ok(chips.some((c) => c.includes("naik")));
});

test("buildRecommendationChips: includes trend chip when falling above 30%", () => {
  const chips = buildRecommendationChips({
    commodity: "beras",
    spec: COMMODITY_SPECS.beras,
    forecastQty: 50,
    safetyStock: 20,
    shortage: 0,
    coverageDays: 10,
    risk: "aman",
    vulnerableCount: 0,
    totalPengungsi: 100,
    currentStock: 500,
    unit: "kg",
    trend: { direction: "falling", pct7d: -50, pct30d: -40, recent7: 10, prior7: 20 },
  });
  assert.ok(chips.some((c) => c.includes("turun")));
});
