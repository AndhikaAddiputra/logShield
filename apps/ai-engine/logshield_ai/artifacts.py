from __future__ import annotations

import csv
import json
from functools import lru_cache
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[3]
DATA_DIR = ROOT / "data"
PROCESSED_DIR = DATA_DIR / "processed"
FORECASTING_DIR = DATA_DIR / "forecasting"
RECOMMENDATIONS_DIR = DATA_DIR / "recommendations"
ANOMALIES_DIR = DATA_DIR / "anomalies"


def read_json(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))


def read_csv_rows(path: Path, limit: int = 100, filters: dict[str, str] | None = None) -> list[dict[str, str]]:
    if not path.exists():
        return []
    filters = filters or {}
    rows: list[dict[str, str]] = []
    with path.open("r", encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            if all(str(row.get(key, "")) == str(value) for key, value in filters.items() if value):
                rows.append(row)
                if len(rows) >= limit:
                    break
    return rows


def read_filtered_csv_rows(path: Path, filters: dict[str, str] | None = None) -> list[dict[str, str]]:
    if not path.exists():
        return []
    filters = filters or {}
    rows: list[dict[str, str]] = []
    with path.open("r", encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            if all(str(row.get(key, "")) == str(value) for key, value in filters.items() if value):
                rows.append(row)
    return rows


def to_float(value: str | None) -> float:
    if value is None or value == "":
        return 0.0
    return float(value)


@lru_cache(maxsize=1)
def artifact_summary() -> dict[str, Any]:
    dataset_report = read_json(PROCESSED_DIR / "logshield_dataset_report.json")
    forecast_summary = read_json(FORECASTING_DIR / "baseline_summary.json")
    recommendation_summary = read_json(RECOMMENDATIONS_DIR / "recommendation_summary.json")
    anomaly_summary = read_json(ANOMALIES_DIR / "anomaly_summary.json")
    return {
        "status": "ready",
        "dataset": dataset_report,
        "forecasting": forecast_summary,
        "recommendations": recommendation_summary,
        "anomalies": anomaly_summary,
    }


def clear_artifact_cache() -> None:
    artifact_summary.cache_clear()


def forecasts(limit: int = 100, **filters: str) -> list[dict[str, str]]:
    return read_csv_rows(FORECASTING_DIR / "baseline_forecast_7d.csv", limit=limit, filters=filters)


def recommendations(limit: int = 100, **filters: str) -> list[dict[str, str]]:
    return read_csv_rows(RECOMMENDATIONS_DIR / "distribution_recommendations.csv", limit=limit, filters=filters)


def anomalies(limit: int = 100, **filters: str) -> list[dict[str, str]]:
    return read_csv_rows(ANOMALIES_DIR / "anomaly_events.csv", limit=limit, filters=filters)


def top_critical_recommendations(limit: int = 25, **filters: str) -> list[dict[str, str]]:
    rows = read_filtered_csv_rows(
        RECOMMENDATIONS_DIR / "distribution_recommendations.csv",
        filters={**filters, "risk_level": "kritis"},
    )
    rows.sort(
        key=lambda row: (
            to_float(row.get("priority_score")),
            to_float(row.get("recommended_qty")),
            to_float(row.get("shortage_qty")),
        ),
        reverse=True,
    )
    return rows[:limit]


def recent_anomalies(limit: int = 25, **filters: str) -> list[dict[str, str]]:
    rows = read_filtered_csv_rows(ANOMALIES_DIR / "anomaly_events.csv", filters=filters)
    severity_rank = {"high": 2, "medium": 1, "low": 0}
    rows.sort(
        key=lambda row: (
            row.get("date", ""),
            severity_rank.get(row.get("severity", ""), 0),
            to_float(row.get("score")),
        ),
        reverse=True,
    )
    return rows[:limit]


def dashboard_summary(limit: int = 10) -> dict[str, Any]:
    summary = artifact_summary()
    return {
        "status": summary.get("status"),
        "dataset": {
            "rows": summary.get("dataset", {}).get("row_count"),
            "date_min": summary.get("dataset", {}).get("date_min"),
            "date_max": summary.get("dataset", {}).get("date_max"),
            "poskos": summary.get("dataset", {}).get("posko_count"),
            "items": summary.get("dataset", {}).get("item_count"),
        },
        "forecasting": {
            "evaluated_series": summary.get("forecasting", {}).get("evaluated_series"),
            "forecast_rows": summary.get("forecasting", {}).get("forecast_rows"),
            "metric_breakdown": summary.get("forecasting", {}).get("metric_breakdown"),
        },
        "recommendations": {
            "rows": summary.get("recommendations", {}).get("recommendation_rows"),
            "risk_counts": summary.get("recommendations", {}).get("risk_counts"),
            "top_critical": top_critical_recommendations(limit=limit),
        },
        "anomalies": {
            "rows": summary.get("anomalies", {}).get("anomaly_events"),
            "severity_counts": summary.get("anomalies", {}).get("severity_counts"),
            "recent": recent_anomalies(limit=limit),
        },
    }
