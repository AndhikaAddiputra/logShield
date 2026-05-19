from __future__ import annotations

import json
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
PACKAGE_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PACKAGE_ROOT))

from logshield_ai.features import (
    build_statsforecast_rows,
    build_training_rows,
    build_ttm_windows,
    load_canonical_groups,
    statsforecast_fieldnames,
    training_fieldnames,
    write_csv,
    write_jsonl,
)
from logshield_ai.model_schema import TTM_CONTEXT_LENGTH, TTM_HORIZON

INPUT_CSV = ROOT / "data" / "processed" / "logshield_timeseries.csv"
OUTPUT_DIR = ROOT / "data" / "processed"
TRAINING_CSV = OUTPUT_DIR / "logshield_training_dataset.csv"
STATSFORECAST_CSV = OUTPUT_DIR / "logshield_statsforecast_dataset.csv"
TTM_WINDOWS_JSONL = OUTPUT_DIR / "logshield_tinytimemixer_windows.jsonl"
SUMMARY_JSON = OUTPUT_DIR / "logshield_training_dataset_report.json"


def summarize(training_rows: list[dict[str, object]], ttm_windows_count: int) -> dict[str, object]:
    dates = [str(row["date"]) for row in training_rows]
    risk_counts = Counter(str(row["risk_label"]) for row in training_rows)
    disaster_counts = Counter(str(row["disaster_type"]) for row in training_rows)
    synthetic_counts = Counter(str(row["is_synthetic"]) for row in training_rows)
    unique_series = {
        (str(row["kib_bencana_id"]), str(row["posko_id"]), str(row["item_name"]))
        for row in training_rows
    }
    return {
        "input": str(INPUT_CSV.relative_to(ROOT)),
        "outputs": {
            "training_dataset": str(TRAINING_CSV.relative_to(ROOT)),
            "statsforecast_dataset": str(STATSFORECAST_CSV.relative_to(ROOT)),
            "tinytimemixer_windows": str(TTM_WINDOWS_JSONL.relative_to(ROOT)),
        },
        "rows": len(training_rows),
        "series": len(unique_series),
        "dates": len(set(dates)),
        "date_min": min(dates) if dates else None,
        "date_max": max(dates) if dates else None,
        "risk_counts": dict(sorted(risk_counts.items())),
        "disaster_counts": dict(sorted(disaster_counts.items())),
        "synthetic_counts": dict(sorted(synthetic_counts.items())),
        "tinytimemixer": {
            "context_length": TTM_CONTEXT_LENGTH,
            "horizon": TTM_HORIZON,
            "windows": ttm_windows_count,
        },
    }


def main() -> int:
    if not INPUT_CSV.exists():
        print(f"Missing canonical dataset: {INPUT_CSV.relative_to(ROOT)}", file=sys.stderr)
        return 1

    groups = load_canonical_groups(INPUT_CSV)
    training_rows = build_training_rows(groups)
    statsforecast_rows = build_statsforecast_rows(training_rows)
    ttm_windows = build_ttm_windows(groups)

    write_csv(TRAINING_CSV, training_rows, training_fieldnames())
    write_csv(STATSFORECAST_CSV, statsforecast_rows, statsforecast_fieldnames())
    write_jsonl(TTM_WINDOWS_JSONL, ttm_windows)

    summary = summarize(training_rows, len(ttm_windows))
    SUMMARY_JSON.write_text(json.dumps(summary, indent=2, ensure_ascii=False), encoding="utf-8")
    print(json.dumps(summary, indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
