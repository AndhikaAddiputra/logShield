from __future__ import annotations

import csv
import json
import sys
from collections import Counter
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
PACKAGE_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PACKAGE_ROOT))

from logshield_ai.schema import CANONICAL_COLUMNS, IDENTITY_COLUMNS, NUMERIC_COLUMNS

DATASET_PATH = ROOT / "data" / "processed" / "logshield_timeseries.csv"


def to_float(value: str) -> float:
    return float(value) if value not in {"", None} else 0.0


def main() -> int:
    errors: list[str] = []
    with DATASET_PATH.open("r", encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle)
        if reader.fieldnames != CANONICAL_COLUMNS:
            errors.append("CSV columns do not match canonical schema")
        rows = list(reader)

    keys = Counter()
    dates = set()
    poskos = set()
    items = set()
    for index, row in enumerate(rows, start=2):
        for column in IDENTITY_COLUMNS:
            if not row.get(column):
                errors.append(f"row {index}: empty {column}")
        for column in NUMERIC_COLUMNS:
            try:
                value = to_float(row[column])
            except ValueError:
                errors.append(f"row {index}: invalid numeric {column}")
                continue
            if value < 0:
                errors.append(f"row {index}: negative {column}")
        try:
            datetime.strptime(row["date"], "%Y-%m-%d")
        except ValueError:
            errors.append(f"row {index}: invalid date")
        keys[tuple(row[column] for column in IDENTITY_COLUMNS)] += 1
        dates.add(row["date"])
        poskos.add(row["posko_id"])
        items.add(row["item_name"])

    duplicate_count = sum(1 for count in keys.values() if count > 1)
    if duplicate_count:
        errors.append(f"duplicate identity keys: {duplicate_count}")

    report = {
        "dataset": str(DATASET_PATH.relative_to(ROOT)),
        "rows": len(rows),
        "dates": len(dates),
        "date_min": min(dates) if dates else None,
        "date_max": max(dates) if dates else None,
        "poskos": len(poskos),
        "items": len(items),
        "errors": errors[:50],
        "error_count": len(errors),
    }
    print(json.dumps(report, indent=2, ensure_ascii=False))
    return 1 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
