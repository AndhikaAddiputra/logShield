from __future__ import annotations

import re
from dataclasses import dataclass
from math import log1p

COMMODITY_CLASSES = {
    "konsumsi_harian": {"display_unit": "/hari"},
    "konsumsi_berkala": {"display_unit": "/hari"},
    "perlengkapan_tahan_lama": {"display_unit": ""},
    "elektronik_logistik": {"display_unit": ""},
}

COMMODITY_SPECS = {
    "air_bersih":    {"qty": 20.0,  "unit": "liter", "period_days": 1,   "class": "konsumsi_harian",         "category": "pangan"},
    "air_minum":     {"qty": 4.0,   "unit": "liter", "period_days": 1,   "class": "konsumsi_harian",         "category": "pangan"},
    "beras":         {"qty": 0.4,   "unit": "kg",    "period_days": 1,   "class": "konsumsi_harian",         "category": "pangan"},
    "mie_instan":    {"qty": 2.0,   "unit": "pcs",   "period_days": 1,   "class": "konsumsi_harian",         "category": "pangan"},
    "minyak_goreng": {"qty": 0.03,  "unit": "liter", "period_days": 1,   "class": "konsumsi_harian",         "category": "pangan"},
    "protein":       {"qty": 0.05,  "unit": "kg",    "period_days": 1,   "class": "konsumsi_harian",         "category": "pangan"},
    "mpasi":         {"qty": 0.2,   "unit": "kg",    "period_days": 1,   "class": "konsumsi_harian",         "category": "pangan"},
    "obat_obatan":   {"qty": 0.05,  "unit": "pcs",   "period_days": 1,   "class": "konsumsi_harian",         "category": "sandang"},
    "masker":        {"qty": 1.0,   "unit": "pcs",   "period_days": 1,   "class": "konsumsi_harian",         "category": "sandang"},

    "pembalut":      {"qty": 8.0,   "unit": "pcs",   "period_days": 28,  "class": "konsumsi_berkala",        "category": "sandang"},
    "popok_bayi":    {"qty": 30.0,  "unit": "pcs",   "period_days": 14,  "class": "konsumsi_berkala",        "category": "sandang"},
    "hygiene_kit":   {"qty": 1.0,   "unit": "kit",   "period_days": 30,  "class": "konsumsi_berkala",        "category": "sandang"},
    "baterai":       {"qty": 4.0,   "unit": "pcs",   "period_days": 30,  "class": "konsumsi_berkala",        "category": "lainnya"},

    "selimut":       {"qty": 1.0,   "unit": "pcs",   "period_days": 365, "class": "perlengkapan_tahan_lama", "category": "sandang"},
    "matras":        {"qty": 1.0,   "unit": "pcs",   "period_days": 365, "class": "perlengkapan_tahan_lama", "category": "sandang"},

    "radio_ht":      {"qty": 2.0,   "unit": "unit",  "period_days": 730, "class": "elektronik_logistik",     "category": "lainnya"},
}

NAME_ALIASES = {
    "radio": "radio_ht",
    "popok": "popok_bayi",
    "hygiene": "hygiene_kit",
    "obat": "obat_obatan",
    "pembalut_wanita": "pembalut",
    "masker": "masker",
    "minyak": "minyak_goreng",
}

CONSUMABLE_CLASSES = {"konsumsi_harian", "konsumsi_berkala"}


@dataclass(frozen=True)
class Recommendation:
    recommended_qty: float
    shortage_qty: float
    coverage_days: float
    risk_level: str
    priority_score: float
    trust_score: float
    rationale_chips: list[str]


def risk_level(coverage_days: float, shortage_qty: float) -> str:
    if shortage_qty <= 0 and coverage_days >= 3:
        return "aman"
    if coverage_days < 1 or shortage_qty > 0:
        return "kritis"
    if coverage_days < 3:
        return "waspada"
    return "aman"


def trust_score(series_length: int, model_mape: float | None) -> float:
    score = 0.55
    if series_length >= 30:
        score += 0.18
    elif series_length >= 21:
        score += 0.10
    if model_mape is not None:
        if model_mape <= 10:
            score += 0.18
        elif model_mape <= 20:
            score += 0.10
    return round(min(max(score, 0.0), 0.98), 2)


def priority_score(risk: str, shortage_qty: float, forecast_qty: float, coverage_days: float, vulnerable_count: int, total_pengungsi: int, trust: float) -> float:
    risk_weight = {"kritis": 42.0, "waspada": 26.0, "aman": 6.0}.get(risk, 0.0)
    shortage_ratio = shortage_qty / max(forecast_qty, 1.0)
    shortage_ratio_weight = min(shortage_ratio * 18.0, 18.0)
    absolute_shortage_weight = min(log1p(shortage_qty) / log1p(30000.0) * 18.0, 18.0)
    coverage_weight = 0.0
    if coverage_days < 1:
        coverage_weight = 12.0
    elif coverage_days < 3:
        coverage_weight = 7.0
    vulnerable_ratio = vulnerable_count / max(total_pengungsi, 1)
    vulnerable_weight = min(vulnerable_ratio * 14.0, 8.0)
    trust_weight = trust * 2.0
    return round(
        min(
            risk_weight
            + shortage_ratio_weight
            + absolute_shortage_weight
            + coverage_weight
            + vulnerable_weight
            + trust_weight,
            100.0,
        ),
        2,
    )


def normalize_item_name(name: str) -> str:
    raw = name.strip().lower().replace(" ", "_").replace("-", "_")
    raw = re.sub(r"[^a-z0-9_]", "", raw)
    return NAME_ALIASES.get(raw, raw)


def get_commodity_class(item_name: str) -> str | None:
    key = normalize_item_name(item_name)
    spec = COMMODITY_SPECS.get(key)
    return spec["class"] if spec else None


def build_rationale(
    item_name: str,
    forecast_qty: float,
    current_stock_qty: float,
    safety_stock_qty: float,
    shortage_qty: float,
    coverage_days: float,
    risk: str,
    vulnerable_count: int,
    total_pengungsi: int = 0,
) -> list[str]:
    chips: list[str] = []
    name = item_name.capitalize()
    comm_class = get_commodity_class(item_name)
    is_consumable = comm_class in CONSUMABLE_CLASSES

    if shortage_qty > 0:
        chips.append(f"{name} kekurangan {shortage_qty:.1f} unit dari total kebutuhan.")
    elif coverage_days >= 7:
        chips.append(f"Stok {name} aman untuk {coverage_days:.0f} hari ke depan.")
    else:
        chips.append(f"Stok {name} mencukupi kebutuhan saat ini.")

    if coverage_days < 1:
        chips.append(f"Stok {name} hanya cukup untuk <1 hari — distribusi darurat.")
    elif coverage_days < 3:
        chips.append(f"Stok {name} cukup {coverage_days:.0f} hari — perlu segera distribusi.")

    if comm_class == "perlengkapan_tahan_lama":
        chips.append(f"{name} adalah perlengkapan tahan lama — distribusi 1x, bukan konsumsi harian.")
    elif comm_class == "elektronik_logistik":
        chips.append(f"{name} adalah perlengkapan logistik — alokasi terbatas per posko.")
    elif comm_class == "konsumsi_berkala":
        chips.append(f"{name} dikonsumsi berkala — kebutuhan harian terhitung dari siklus pemakaian.")
    elif is_consumable and forecast_qty > 0 and total_pengungsi > 0:
        chips.append(f"Konsumsi {forecast_qty:.1f} unit/hari untuk {total_pengungsi} jiwa.")

    if vulnerable_count > 0 and total_pengungsi > 0:
        ratio = vulnerable_count / max(total_pengungsi, 1)
        if ratio > 0.15:
            chips.append(f"{vulnerable_count} jiwa rentan ({ratio * 100:.0f}% dari total) meningkatkan prioritas.")

    return chips[:3]


def recommend_distribution(
    item_name: str,
    forecast_qty: float,
    current_stock_qty: float,
    critical_stock_threshold: float,
    total_pengungsi: int,
    vulnerable_count: int,
    series_length: int,
    model_mape: float | None,
) -> Recommendation:
    base_safety_stock = max(forecast_qty * 0.35, critical_stock_threshold)
    vulnerable_boost = 1.0 + min(vulnerable_count / max(total_pengungsi, 1), 0.35)
    safety_stock_qty = base_safety_stock * vulnerable_boost
    required_qty = forecast_qty + safety_stock_qty
    shortage_qty = max(required_qty - current_stock_qty, 0.0)
    recommended_qty = round(shortage_qty, 2)
    coverage_days = current_stock_qty / forecast_qty if forecast_qty > 0 else 99.0
    risk = risk_level(coverage_days, shortage_qty)
    trust = trust_score(series_length, model_mape)

    return Recommendation(
        recommended_qty=recommended_qty,
        shortage_qty=round(shortage_qty, 2),
        coverage_days=round(coverage_days, 2),
        risk_level=risk,
        priority_score=priority_score(risk, shortage_qty, forecast_qty, coverage_days, vulnerable_count, total_pengungsi, trust),
        trust_score=trust,
        rationale_chips=build_rationale(
            item_name=item_name,
            forecast_qty=forecast_qty,
            current_stock_qty=current_stock_qty,
            safety_stock_qty=safety_stock_qty,
            shortage_qty=shortage_qty,
            coverage_days=coverage_days,
            risk=risk,
            vulnerable_count=vulnerable_count,
            total_pengungsi=total_pengungsi,
        ),
    )
