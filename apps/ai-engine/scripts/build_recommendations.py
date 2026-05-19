from __future__ import annotations

import csv
import json
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
PACKAGE_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PACKAGE_ROOT))

from logshield_ai.recommendation import recommend_distribution

TIMESERIES_CSV = ROOT / "data" / "processed" / "logshield_timeseries.csv"
METRICS_CSV = ROOT / "data" / "forecasting" / "baseline_metrics.csv"
FORECAST_CSV = ROOT / "data" / "forecasting" / "baseline_forecast_7d.csv"
OUTPUT_DIR = ROOT / "data" / "recommendations"
RECOMMENDATION_CSV = OUTPUT_DIR / "distribution_recommendations.csv"
SUMMARY_JSON = OUTPUT_DIR / "recommendation_summary.json"


def to_float(value: str | None) -> float:
    if value is None or value == "":
        return 0.0
    return float(value)


def to_int(value: str | None) -> int:
    return int(round(to_float(value)))


def series_key(row: dict[str, str]) -> tuple[str, str, str]:
    return row["kib_bencana_id"], row["posko_id"], row["item_name"]


def load_latest_state() -> dict[tuple[str, str, str], dict[str, str]]:
    latest: dict[tuple[str, str, str], dict[str, str]] = {}
    with TIMESERIES_CSV.open("r", encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            key = series_key(row)
            if key not in latest or row["date"] > latest[key]["date"]:
                latest[key] = row
    return latest


def load_metrics() -> dict[tuple[str, str, str], dict[str, str]]:
    metrics: dict[tuple[str, str, str], dict[str, str]] = {}
    with METRICS_CSV.open("r", encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            metrics[series_key(row)] = row
    return metrics


def build_recommendations() -> list[dict[str, object]]:
    latest_state = load_latest_state()
    metrics = load_metrics()
    rows: list[dict[str, object]] = []

    with FORECAST_CSV.open("r", encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle)
        for forecast in reader:
            key = series_key(forecast)
            state = latest_state.get(key)
            metric = metrics.get(key)
            if not state or not metric:
                continue

            vulnerable_count = (
                to_int(state["bayi"])
                + to_int(state["balita"])
                + to_int(state["lansia"])
                + to_int(state["ibu_hamil"])
                + to_int(state["ibu_menyusui"])
                + to_int(state["disabilitas"])
            )
            rec = recommend_distribution(
                item_name=forecast["item_name"],
                forecast_qty=to_float(forecast["forecast_target_need_qty"]),
                current_stock_qty=to_float(state["current_stock_qty"]),
                critical_stock_threshold=to_float(state["critical_stock_threshold"]),
                total_pengungsi=to_int(state["total_pengungsi"]),
                vulnerable_count=vulnerable_count,
                series_length=to_int(forecast["series_length"]),
                is_synthetic_series=forecast["is_synthetic_series"],
                model_mape=to_float(metric["mape"]),
            )
            rows.append(
                {
                    "forecast_date": forecast["forecast_date"],
                    "kib_bencana_id": forecast["kib_bencana_id"],
                    "disaster_type": forecast["disaster_type"],
                    "province": state["province"],
                    "city": state["city"],
                    "district": state["district"],
                    "village": state["village"],
                    "posko_id": forecast["posko_id"],
                    "posko_name": forecast["posko_name"],
                    "item_category": forecast["item_category"],
                    "item_name": forecast["item_name"],
                    "unit": forecast["unit"],
                    "forecast_target_need_qty": forecast["forecast_target_need_qty"],
                    "current_stock_qty": state["current_stock_qty"],
                    "critical_stock_threshold": state["critical_stock_threshold"],
                    "recommended_qty": rec.recommended_qty,
                    "shortage_qty": rec.shortage_qty,
                    "coverage_days": rec.coverage_days,
                    "risk_level": rec.risk_level,
                    "priority_score": rec.priority_score,
                    "trust_score": rec.trust_score,
                    "model_name": forecast["model_name"],
                    "model_mape": metric["mape"],
                    "total_pengungsi": state["total_pengungsi"],
                    "vulnerable_count": vulnerable_count,
                    "rationale_chips": " | ".join(rec.rationale_chips),
                }
            )
    return rows


def write_recommendations(rows: list[dict[str, object]]) -> None:
    fields = [
        "forecast_date",
        "kib_bencana_id",
        "disaster_type",
        "province",
        "city",
        "district",
        "village",
        "posko_id",
        "posko_name",
        "item_category",
        "item_name",
        "unit",
        "forecast_target_need_qty",
        "current_stock_qty",
        "critical_stock_threshold",
        "recommended_qty",
        "shortage_qty",
        "coverage_days",
        "risk_level",
        "priority_score",
        "trust_score",
        "model_name",
        "model_mape",
        "total_pengungsi",
        "vulnerable_count",
        "rationale_chips",
    ]
    with RECOMMENDATION_CSV.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)


def main() -> int:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    rows = build_recommendations()
    write_recommendations(rows)

    risk_counts = Counter(str(row["risk_level"]) for row in rows)
    disaster_counts = Counter(str(row["disaster_type"]) for row in rows)
    total_recommended = sum(float(row["recommended_qty"]) for row in rows)
    top_priority = sorted(rows, key=lambda row: float(row["priority_score"]), reverse=True)[:10]
    summary = {
        "input_forecast": str(FORECAST_CSV.relative_to(ROOT)),
        "input_latest_state": str(TIMESERIES_CSV.relative_to(ROOT)),
        "recommendation_rows": len(rows),
        "total_recommended_qty": round(total_recommended, 2),
        "risk_counts": dict(sorted(risk_counts.items())),
        "disaster_counts": dict(sorted(disaster_counts.items())),
        "top_priority": [
            {
                "forecast_date": row["forecast_date"],
                "kib_bencana_id": row["kib_bencana_id"],
                "posko_name": row["posko_name"],
                "item_name": row["item_name"],
                "risk_level": row["risk_level"],
                "priority_score": row["priority_score"],
                "recommended_qty": row["recommended_qty"],
            }
            for row in top_priority
        ],
        "output": str(RECOMMENDATION_CSV.relative_to(ROOT)),
    }
    SUMMARY_JSON.write_text(json.dumps(summary, indent=2, ensure_ascii=False), encoding="utf-8")
    print(json.dumps(summary, indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
