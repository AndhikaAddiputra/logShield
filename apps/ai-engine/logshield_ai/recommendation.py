from __future__ import annotations

from dataclasses import dataclass
from math import log1p


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


def trust_score(series_length: int, is_synthetic_series: str, model_mape: float | None) -> float:
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
    if is_synthetic_series == "true":
        score -= 0.08
    if is_synthetic_series == "mixed":
        score -= 0.04
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


def build_rationale(
    item_name: str,
    forecast_qty: float,
    current_stock_qty: float,
    safety_stock_qty: float,
    shortage_qty: float,
    coverage_days: float,
    risk: str,
    vulnerable_count: int,
) -> list[str]:
    chips: list[str] = []
    if shortage_qty > 0:
        chips.append(f"Stok {item_name} kurang {shortage_qty:.2f} unit dari kebutuhan dan safety stock.")
    else:
        chips.append(f"Stok {item_name} masih menutup kebutuhan forecast terdekat.")

    if coverage_days < 1:
        chips.append("Coverage stok kurang dari 1 hari sehingga perlu prioritas distribusi.")
    elif coverage_days < 3:
        chips.append("Coverage stok kurang dari 3 hari sehingga perlu dipantau.")

    if vulnerable_count > 0:
        chips.append(f"Ada {vulnerable_count} pengungsi rentan yang menaikkan prioritas bantuan.")

    if risk == "aman":
        chips.append("Risiko operasional rendah berdasarkan stok terakhir dan forecast.")
    elif forecast_qty > 0 and safety_stock_qty / forecast_qty >= 0.75:
        chips.append("Safety stock diperbesar karena kebutuhan forecast relatif tinggi.")

    return chips[:3]


def recommend_distribution(
    item_name: str,
    forecast_qty: float,
    current_stock_qty: float,
    critical_stock_threshold: float,
    total_pengungsi: int,
    vulnerable_count: int,
    series_length: int,
    is_synthetic_series: str,
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
    trust = trust_score(series_length, is_synthetic_series, model_mape)

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
        ),
    )
