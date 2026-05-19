from __future__ import annotations

import csv
import json
from collections import defaultdict
from datetime import datetime
from pathlib import Path
from statistics import mean
from typing import Iterable

from logshield_ai.model_schema import (
    STATSFORECAST_COLUMNS,
    TRAINING_COLUMNS,
    TTM_CONTEXT_LENGTH,
    TTM_HORIZON,
)

NUMERIC_INPUT_COLUMNS = [
    "total_pengungsi",
    "total_kk",
    "bayi",
    "balita",
    "anak",
    "remaja",
    "dewasa",
    "lansia",
    "ibu_hamil",
    "ibu_menyusui",
    "disabilitas",
    "stock_in_qty",
    "distributed_qty",
    "requested_qty",
    "current_stock_qty",
    "target_need_qty",
    "critical_stock_threshold",
]


def to_float(value: object) -> float:
    if value in {None, ""}:
        return 0.0
    return float(value)


def round_value(value: float) -> float:
    return round(value, 4)


def series_key(row: dict[str, str]) -> tuple[str, str, str]:
    return (row["kib_bencana_id"], row["posko_id"], row["item_name"])


def unique_id(row: dict[str, str]) -> str:
    return "::".join(series_key(row))


def load_canonical_groups(path: Path) -> dict[tuple[str, str, str], list[dict[str, str]]]:
    groups: dict[tuple[str, str, str], list[dict[str, str]]] = defaultdict(list)
    with path.open("r", encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            groups[series_key(row)].append(row)
    for rows in groups.values():
        rows.sort(key=lambda item: item["date"])
    return groups


def risk_label(target_need_qty: float, current_stock_qty: float, critical_stock_threshold: float) -> str:
    if target_need_qty <= 0:
        return "aman"
    required_qty = target_need_qty + critical_stock_threshold
    shortage_ratio = max(required_qty - current_stock_qty, 0.0) / max(required_qty, 1.0)
    coverage_days = current_stock_qty / max(target_need_qty, 1.0)
    if shortage_ratio >= 0.5 or coverage_days < 1.0:
        return "kritis"
    if shortage_ratio > 0 or coverage_days < 2.0:
        return "waspada"
    return "aman"


def lag(values: list[float], index: int, periods: int) -> float:
    source_index = index - periods
    return values[source_index] if source_index >= 0 else 0.0


def rolling_mean(values: list[float], index: int, window: int) -> float:
    start = max(0, index - window)
    window_values = values[start:index]
    return mean(window_values) if window_values else 0.0


def build_training_rows(groups: dict[tuple[str, str, str], list[dict[str, str]]]) -> list[dict[str, object]]:
    rows_out: list[dict[str, object]] = []
    for rows in groups.values():
        disaster_start = datetime.strptime(rows[0]["date"], "%Y-%m-%d").date()
        need_values = [to_float(row["target_need_qty"]) for row in rows]
        distributed_values = [to_float(row["distributed_qty"]) for row in rows]
        stock_values = [to_float(row["current_stock_qty"]) for row in rows]

        for index, row in enumerate(rows):
            current_date = datetime.strptime(row["date"], "%Y-%m-%d").date()
            total_pengungsi = to_float(row["total_pengungsi"])
            vulnerable_count = sum(
                to_float(row[column])
                for column in ("bayi", "balita", "anak", "lansia", "ibu_hamil", "ibu_menyusui", "disabilitas")
            )
            target_need_qty = to_float(row["target_need_qty"])
            current_stock_qty = to_float(row["current_stock_qty"])
            critical_stock_threshold = to_float(row["critical_stock_threshold"])

            rows_out.append(
                {
                    "date": row["date"],
                    "kib_bencana_id": row["kib_bencana_id"],
                    "posko_id": row["posko_id"],
                    "item_name": row["item_name"],
                    "disaster_type": row["disaster_type"],
                    "province": row["province"],
                    "city": row["city"],
                    "district": row["district"],
                    "village": row["village"],
                    "posko_name": row["posko_name"],
                    "item_category": row["item_category"],
                    "unit": row["unit"],
                    "source_dataset": row["source_dataset"],
                    "is_synthetic": row["is_synthetic"],
                    "day_since_disaster": (current_date - disaster_start).days,
                    "day_of_week": current_date.weekday(),
                    "month": current_date.month,
                    "is_weekend": 1 if current_date.weekday() >= 5 else 0,
                    "total_pengungsi": round_value(total_pengungsi),
                    "total_kk": round_value(to_float(row["total_kk"])),
                    "bayi": round_value(to_float(row["bayi"])),
                    "balita": round_value(to_float(row["balita"])),
                    "anak": round_value(to_float(row["anak"])),
                    "remaja": round_value(to_float(row["remaja"])),
                    "dewasa": round_value(to_float(row["dewasa"])),
                    "lansia": round_value(to_float(row["lansia"])),
                    "ibu_hamil": round_value(to_float(row["ibu_hamil"])),
                    "ibu_menyusui": round_value(to_float(row["ibu_menyusui"])),
                    "disabilitas": round_value(to_float(row["disabilitas"])),
                    "vulnerable_count": round_value(vulnerable_count),
                    "vulnerable_ratio": round_value(vulnerable_count / max(total_pengungsi, 1.0)),
                    "stock_in_qty": round_value(to_float(row["stock_in_qty"])),
                    "distributed_qty": round_value(to_float(row["distributed_qty"])),
                    "requested_qty": round_value(to_float(row["requested_qty"])),
                    "current_stock_qty": round_value(current_stock_qty),
                    "critical_stock_threshold": round_value(critical_stock_threshold),
                    "stock_coverage_days": round_value(current_stock_qty / max(target_need_qty, 1.0)),
                    "need_qty_lag_1": round_value(lag(need_values, index, 1)),
                    "need_qty_lag_3": round_value(lag(need_values, index, 3)),
                    "need_qty_lag_7": round_value(lag(need_values, index, 7)),
                    "distributed_qty_lag_1": round_value(lag(distributed_values, index, 1)),
                    "distributed_qty_lag_3": round_value(lag(distributed_values, index, 3)),
                    "stock_qty_lag_1": round_value(lag(stock_values, index, 1)),
                    "rolling_need_mean_3": round_value(rolling_mean(need_values, index, 3)),
                    "rolling_need_mean_7": round_value(rolling_mean(need_values, index, 7)),
                    "rolling_distributed_mean_7": round_value(rolling_mean(distributed_values, index, 7)),
                    "rolling_stock_mean_7": round_value(rolling_mean(stock_values, index, 7)),
                    "target_need_qty": round_value(target_need_qty),
                    "risk_label": risk_label(target_need_qty, current_stock_qty, critical_stock_threshold),
                }
            )
    return rows_out


def build_statsforecast_rows(training_rows: Iterable[dict[str, object]]) -> list[dict[str, object]]:
    rows_out: list[dict[str, object]] = []
    for row in training_rows:
        rows_out.append(
            {
                "unique_id": f"{row['kib_bencana_id']}::{row['posko_id']}::{row['item_name']}",
                "ds": row["date"],
                "y": row["target_need_qty"],
                "kib_bencana_id": row["kib_bencana_id"],
                "posko_id": row["posko_id"],
                "item_name": row["item_name"],
                "disaster_type": row["disaster_type"],
                "item_category": row["item_category"],
                "unit": row["unit"],
                "is_synthetic": row["is_synthetic"],
            }
        )
    return rows_out


def build_ttm_windows(groups: dict[tuple[str, str, str], list[dict[str, str]]], context_length: int = TTM_CONTEXT_LENGTH, horizon: int = TTM_HORIZON) -> list[dict[str, object]]:
    windows: list[dict[str, object]] = []
    for rows in groups.values():
        if len(rows) < context_length + horizon:
            continue
        target_values = [round_value(to_float(row["target_need_qty"])) for row in rows]
        stock_values = [round_value(to_float(row["current_stock_qty"])) for row in rows]
        distributed_values = [round_value(to_float(row["distributed_qty"])) for row in rows]
        requested_values = [round_value(to_float(row["requested_qty"])) for row in rows]

        for start in range(0, len(rows) - context_length - horizon + 1):
            context_rows = rows[start : start + context_length]
            future_rows = rows[start + context_length : start + context_length + horizon]
            meta = context_rows[-1]
            windows.append(
                {
                    "unique_id": unique_id(meta),
                    "context_start": context_rows[0]["date"],
                    "context_end": context_rows[-1]["date"],
                    "target_start": future_rows[0]["date"],
                    "target_end": future_rows[-1]["date"],
                    "context_length": context_length,
                    "horizon": horizon,
                    "kib_bencana_id": meta["kib_bencana_id"],
                    "posko_id": meta["posko_id"],
                    "item_name": meta["item_name"],
                    "disaster_type": meta["disaster_type"],
                    "item_category": meta["item_category"],
                    "unit": meta["unit"],
                    "is_synthetic": meta["is_synthetic"],
                    "past_target_need_qty": target_values[start : start + context_length],
                    "past_current_stock_qty": stock_values[start : start + context_length],
                    "past_distributed_qty": distributed_values[start : start + context_length],
                    "past_requested_qty": requested_values[start : start + context_length],
                    "future_target_need_qty": target_values[start + context_length : start + context_length + horizon],
                }
            )
    return windows


def write_csv(path: Path, rows: list[dict[str, object]], fieldnames: list[str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def write_jsonl(path: Path, rows: Iterable[dict[str, object]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as handle:
        for row in rows:
            handle.write(json.dumps(row, ensure_ascii=False) + "\n")


def training_fieldnames() -> list[str]:
    return TRAINING_COLUMNS


def statsforecast_fieldnames() -> list[str]:
    return STATSFORECAST_COLUMNS
