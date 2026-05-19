from __future__ import annotations

import csv
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
PROCESSED_DIR = ROOT / "data" / "processed"
TRAINING_CSV = PROCESSED_DIR / "logshield_training_dataset.csv"
STATSFORECAST_CSV = PROCESSED_DIR / "logshield_statsforecast_dataset.csv"
TTM_WINDOWS_JSONL = PROCESSED_DIR / "logshield_tinytimemixer_windows.jsonl"
SUMMARY_JSON = PROCESSED_DIR / "logshield_training_dataset_report.json"

REQUIRED_TRAINING_COLUMNS = {
    "date",
    "kib_bencana_id",
    "posko_id",
    "item_name",
    "day_since_disaster",
    "target_need_qty",
    "risk_label",
}

REQUIRED_STATSFORECAST_COLUMNS = {"unique_id", "ds", "y"}
REQUIRED_TTM_KEYS = {
    "unique_id",
    "context_start",
    "context_end",
    "target_start",
    "target_end",
    "past_target_need_qty",
    "future_target_need_qty",
}


def read_first_csv_row(path: Path) -> tuple[list[str], dict[str, str] | None]:
    with path.open("r", encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle)
        return reader.fieldnames or [], next(reader, None)


def main() -> int:
    errors: list[str] = []
    for path in (TRAINING_CSV, STATSFORECAST_CSV, TTM_WINDOWS_JSONL, SUMMARY_JSON):
        if not path.exists():
            errors.append(f"missing {path.relative_to(ROOT)}")

    if TRAINING_CSV.exists():
        fields, first_row = read_first_csv_row(TRAINING_CSV)
        missing = REQUIRED_TRAINING_COLUMNS - set(fields)
        if missing:
            errors.append(f"training dataset missing columns: {sorted(missing)}")
        if not first_row:
            errors.append("training dataset has no rows")

    if STATSFORECAST_CSV.exists():
        fields, first_row = read_first_csv_row(STATSFORECAST_CSV)
        missing = REQUIRED_STATSFORECAST_COLUMNS - set(fields)
        if missing:
            errors.append(f"statsforecast dataset missing columns: {sorted(missing)}")
        if not first_row:
            errors.append("statsforecast dataset has no rows")

    if TTM_WINDOWS_JSONL.exists():
        first_line = TTM_WINDOWS_JSONL.open("r", encoding="utf-8").readline()
        if not first_line:
            errors.append("tinytimemixer window dataset has no rows")
        else:
            first_window = json.loads(first_line)
            missing = REQUIRED_TTM_KEYS - set(first_window)
            if missing:
                errors.append(f"tinytimemixer window missing keys: {sorted(missing)}")
            if len(first_window.get("past_target_need_qty", [])) != first_window.get("context_length"):
                errors.append("tinytimemixer context length does not match past target length")
            if len(first_window.get("future_target_need_qty", [])) != first_window.get("horizon"):
                errors.append("tinytimemixer horizon does not match future target length")

    result = {
        "status": "failed" if errors else "ok",
        "errors": errors,
        "checked": [
            str(TRAINING_CSV.relative_to(ROOT)),
            str(STATSFORECAST_CSV.relative_to(ROOT)),
            str(TTM_WINDOWS_JSONL.relative_to(ROOT)),
            str(SUMMARY_JSON.relative_to(ROOT)),
        ],
    }
    print(json.dumps(result, indent=2, ensure_ascii=False))
    return 1 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
