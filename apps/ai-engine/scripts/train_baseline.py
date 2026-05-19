from __future__ import annotations

import csv
import json
import sys
from collections import defaultdict
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
PACKAGE_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PACKAGE_ROOT))

from logshield_ai.baseline import evaluate_baselines, forecast_with_model, next_dates, select_best

INPUT_CSV = ROOT / "data" / "processed" / "logshield_timeseries.csv"
OUTPUT_DIR = ROOT / "data" / "forecasting"
METRICS_CSV = OUTPUT_DIR / "baseline_metrics.csv"
FORECAST_CSV = OUTPUT_DIR / "baseline_forecast_7d.csv"
SUMMARY_JSON = OUTPUT_DIR / "baseline_summary.json"

TARGET_COLUMN = "target_need_qty"
HORIZON = 7
MIN_SERIES_LENGTH = 14


def to_float(value: str) -> float:
    if value is None or value == "":
        return 0.0
    return float(value)


def summarize_metrics(rows: list[dict[str, object]]) -> dict[str, dict[str, float | int | None]]:
    summary: dict[str, dict[str, float | int | None]] = {}
    for source in ("false", "true", "mixed"):
        source_rows = [row for row in rows if str(row["is_synthetic_series"]) == source]
        mae_values = [float(row["mae"]) for row in source_rows]
        mape_values = [float(row["mape"]) for row in source_rows]
        label = {"false": "real", "true": "synthetic", "mixed": "mixed"}[source]
        summary[label] = {
            "series": len(source_rows),
            "average_mae": round(sum(mae_values) / len(mae_values), 4) if mae_values else None,
            "average_mape": round(sum(mape_values) / len(mape_values), 4) if mape_values else None,
        }
    return summary


def load_series() -> dict[tuple[str, str, str], list[dict[str, str]]]:
    groups: dict[tuple[str, str, str], list[dict[str, str]]] = defaultdict(list)
    with INPUT_CSV.open("r", encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            key = (row["kib_bencana_id"], row["posko_id"], row["item_name"])
            groups[key].append(row)
    for rows in groups.values():
        rows.sort(key=lambda item: item["date"])
    return groups


def write_metrics(rows: list[dict[str, object]]) -> None:
    fields = [
        "kib_bencana_id",
        "disaster_type",
        "posko_id",
        "posko_name",
        "item_category",
        "item_name",
        "unit",
        "series_length",
        "train_until",
        "test_start",
        "test_end",
        "best_model",
        "mae",
        "mape",
        "is_synthetic_series",
    ]
    with METRICS_CSV.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)


def write_forecasts(rows: list[dict[str, object]]) -> None:
    fields = [
        "forecast_date",
        "kib_bencana_id",
        "disaster_type",
        "posko_id",
        "posko_name",
        "item_category",
        "item_name",
        "unit",
        "model_name",
        "forecast_target_need_qty",
        "last_observed_date",
        "series_length",
        "is_synthetic_series",
    ]
    with FORECAST_CSV.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)


def main() -> int:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    groups = load_series()
    metrics_rows: list[dict[str, object]] = []
    forecast_rows: list[dict[str, object]] = []
    skipped_short = 0

    for (_kib, _posko_id, _item_name), rows in groups.items():
        if len(rows) < MIN_SERIES_LENGTH:
            skipped_short += 1
            continue

        values = [to_float(row[TARGET_COLUMN]) for row in rows]
        results = evaluate_baselines(values, HORIZON)
        best = select_best(results)
        meta = rows[-1]
        test_rows = rows[-HORIZON:]
        train_until = rows[-HORIZON - 1]["date"] if len(rows) > HORIZON else rows[0]["date"]
        is_synthetic_series = "mixed" if len({row["is_synthetic"] for row in rows}) > 1 else rows[-1]["is_synthetic"]

        metrics_rows.append(
            {
                "kib_bencana_id": meta["kib_bencana_id"],
                "disaster_type": meta["disaster_type"],
                "posko_id": meta["posko_id"],
                "posko_name": meta["posko_name"],
                "item_category": meta["item_category"],
                "item_name": meta["item_name"],
                "unit": meta["unit"],
                "series_length": len(rows),
                "train_until": train_until,
                "test_start": test_rows[0]["date"],
                "test_end": test_rows[-1]["date"],
                "best_model": best.model_name,
                "mae": round(best.mae, 4),
                "mape": round(best.mape, 4),
                "is_synthetic_series": is_synthetic_series,
            }
        )

        future_values = forecast_with_model(best.model_name, values, HORIZON)
        last_date = datetime.strptime(rows[-1]["date"], "%Y-%m-%d").date()
        for forecast_date, forecast_value in zip(next_dates(last_date, HORIZON), future_values):
            forecast_rows.append(
                {
                    "forecast_date": forecast_date,
                    "kib_bencana_id": meta["kib_bencana_id"],
                    "disaster_type": meta["disaster_type"],
                    "posko_id": meta["posko_id"],
                    "posko_name": meta["posko_name"],
                    "item_category": meta["item_category"],
                    "item_name": meta["item_name"],
                    "unit": meta["unit"],
                    "model_name": best.model_name,
                    "forecast_target_need_qty": round(max(forecast_value, 0.0), 2),
                    "last_observed_date": rows[-1]["date"],
                    "series_length": len(rows),
                    "is_synthetic_series": is_synthetic_series,
                }
            )

    write_metrics(metrics_rows)
    write_forecasts(forecast_rows)

    mae_values = [float(row["mae"]) for row in metrics_rows]
    mape_values = [float(row["mape"]) for row in metrics_rows]
    model_counts: dict[str, int] = defaultdict(int)
    disaster_counts: dict[str, int] = defaultdict(int)
    for row in metrics_rows:
        model_counts[str(row["best_model"])] += 1
        disaster_counts[str(row["disaster_type"])] += 1

    summary = {
        "input": str(INPUT_CSV.relative_to(ROOT)),
        "target_column": TARGET_COLUMN,
        "horizon_days": HORIZON,
        "min_series_length": MIN_SERIES_LENGTH,
        "evaluated_series": len(metrics_rows),
        "skipped_short_series": skipped_short,
        "forecast_rows": len(forecast_rows),
        "average_mae": round(sum(mae_values) / len(mae_values), 4) if mae_values else None,
        "average_mape": round(sum(mape_values) / len(mape_values), 4) if mape_values else None,
        "metric_breakdown": summarize_metrics(metrics_rows),
        "model_counts": dict(sorted(model_counts.items())),
        "disaster_counts": dict(sorted(disaster_counts.items())),
        "outputs": {
            "metrics": str(METRICS_CSV.relative_to(ROOT)),
            "forecast": str(FORECAST_CSV.relative_to(ROOT)),
        },
    }
    SUMMARY_JSON.write_text(json.dumps(summary, indent=2, ensure_ascii=False), encoding="utf-8")
    print(json.dumps(summary, indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
