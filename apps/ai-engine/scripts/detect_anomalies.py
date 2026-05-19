from __future__ import annotations

import csv
import json
import sys
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
PACKAGE_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PACKAGE_ROOT))

from logshield_ai.anomaly import detect_row_anomalies

TIMESERIES_CSV = ROOT / "data" / "processed" / "logshield_timeseries.csv"
OUTPUT_DIR = ROOT / "data" / "anomalies"
ANOMALY_CSV = OUTPUT_DIR / "anomaly_events.csv"
SUMMARY_JSON = OUTPUT_DIR / "anomaly_summary.json"


def to_float(value: str | None) -> float:
    if value is None or value == "":
        return 0.0
    return float(value)


def series_key(row: dict[str, str]) -> tuple[str, str, str]:
    return row["kib_bencana_id"], row["posko_id"], row["item_name"]


def load_groups() -> dict[tuple[str, str, str], list[dict[str, str]]]:
    groups: dict[tuple[str, str, str], list[dict[str, str]]] = defaultdict(list)
    with TIMESERIES_CSV.open("r", encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            groups[series_key(row)].append(row)
    for rows in groups.values():
        rows.sort(key=lambda row: row["date"])
    return groups


def detect_anomalies() -> list[dict[str, object]]:
    events: list[dict[str, object]] = []
    groups = load_groups()

    for rows in groups.values():
        need_history: list[float] = []
        previous_stock: float | None = None
        for row in rows:
            current_need = to_float(row["target_need_qty"])
            current_stock = to_float(row["current_stock_qty"])
            detected = detect_row_anomalies(
                current_need=current_need,
                current_stock=current_stock,
                critical_threshold=to_float(row["critical_stock_threshold"]),
                requested_qty=to_float(row["requested_qty"]),
                distributed_qty=to_float(row["distributed_qty"]),
                stock_in_qty=to_float(row["stock_in_qty"]),
                need_history=need_history,
                previous_stock=previous_stock,
            )
            for event in detected:
                events.append(
                    {
                        "date": row["date"],
                        "kib_bencana_id": row["kib_bencana_id"],
                        "disaster_type": row["disaster_type"],
                        "province": row["province"],
                        "city": row["city"],
                        "district": row["district"],
                        "village": row["village"],
                        "posko_id": row["posko_id"],
                        "posko_name": row["posko_name"],
                        "item_category": row["item_category"],
                        "item_name": row["item_name"],
                        "unit": row["unit"],
                        "anomaly_type": event.anomaly_type,
                        "severity": event.severity,
                        "score": event.score,
                        "target_need_qty": row["target_need_qty"],
                        "current_stock_qty": row["current_stock_qty"],
                        "requested_qty": row["requested_qty"],
                        "distributed_qty": row["distributed_qty"],
                        "message": event.message,
                        "action_suggestion": event.action_suggestion,
                        "is_synthetic": row["is_synthetic"],
                    }
                )
            need_history.append(current_need)
            previous_stock = current_stock

    return events


def write_events(events: list[dict[str, object]]) -> None:
    fields = [
        "date",
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
        "anomaly_type",
        "severity",
        "score",
        "target_need_qty",
        "current_stock_qty",
        "requested_qty",
        "distributed_qty",
        "message",
        "action_suggestion",
        "is_synthetic",
    ]
    with ANOMALY_CSV.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        writer.writerows(events)


def main() -> int:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    events = detect_anomalies()
    write_events(events)

    type_counts = Counter(str(event["anomaly_type"]) for event in events)
    severity_counts = Counter(str(event["severity"]) for event in events)
    disaster_counts = Counter(str(event["disaster_type"]) for event in events)
    summary = {
        "input": str(TIMESERIES_CSV.relative_to(ROOT)),
        "anomaly_events": len(events),
        "type_counts": dict(sorted(type_counts.items())),
        "severity_counts": dict(sorted(severity_counts.items())),
        "disaster_counts": dict(sorted(disaster_counts.items())),
        "output": str(ANOMALY_CSV.relative_to(ROOT)),
    }
    SUMMARY_JSON.write_text(json.dumps(summary, indent=2, ensure_ascii=False), encoding="utf-8")
    print(json.dumps(summary, indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
