from __future__ import annotations

import json
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[3]
INPUT_JSONL = ROOT / "data" / "processed" / "logshield_tinytimemixer_windows.jsonl"
OUTPUT_DIR = ROOT / "data" / "tinytimemixer"
ARRAYS_NPZ = OUTPUT_DIR / "logshield_ttm_arrays.npz"
METADATA_JSON = OUTPUT_DIR / "logshield_ttm_arrays_metadata.json"

CHANNELS = [
    "past_target_need_qty",
    "past_current_stock_qty",
    "past_distributed_qty",
    "past_requested_qty",
]


def split_name(index: int, total: int) -> str:
    train_end = int(total * 0.7)
    validation_end = int(total * 0.85)
    if index < train_end:
        return "train"
    if index < validation_end:
        return "validation"
    return "test"


def main() -> int:
    if not INPUT_JSONL.exists():
        print(f"Missing TTM windows: {INPUT_JSONL.relative_to(ROOT)}")
        return 1

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    windows: list[dict[str, object]] = []
    with INPUT_JSONL.open("r", encoding="utf-8") as handle:
        for line in handle:
            windows.append(json.loads(line))
    windows.sort(key=lambda row: (str(row["target_end"]), str(row["unique_id"])))

    total = len(windows)
    if total == 0:
        print("No TTM windows available.")
        return 1

    x = np.array(
        [
            [[float(value) for value in window[channel]] for channel in CHANNELS]
            for window in windows
        ],
        dtype=np.float32,
    )
    x = np.transpose(x, (0, 2, 1))
    y = np.array(
        [[float(value) for value in window["future_target_need_qty"]] for window in windows],
        dtype=np.float32,
    )

    split_labels = np.array([split_name(index, total) for index in range(total)])
    train_idx = np.where(split_labels == "train")[0]
    validation_idx = np.where(split_labels == "validation")[0]
    test_idx = np.where(split_labels == "test")[0]

    np.savez_compressed(
        ARRAYS_NPZ,
        x_train=x[train_idx],
        y_train=y[train_idx],
        x_validation=x[validation_idx],
        y_validation=y[validation_idx],
        x_test=x[test_idx],
        y_test=y[test_idx],
    )

    metadata = {
        "input": str(INPUT_JSONL.relative_to(ROOT)),
        "output": str(ARRAYS_NPZ.relative_to(ROOT)),
        "windows": total,
        "channels": CHANNELS,
        "context_length": int(x.shape[1]),
        "input_channels": int(x.shape[2]),
        "horizon": int(y.shape[1]),
        "splits": {
            "train": int(len(train_idx)),
            "validation": int(len(validation_idx)),
            "test": int(len(test_idx)),
        },
        "model_target": "IBM Granite TinyTimeMixer / TTM",
        "recommended_epochs": 10,
        "early_stopping_patience": 3,
    }
    METADATA_JSON.write_text(json.dumps(metadata, indent=2, ensure_ascii=False), encoding="utf-8")
    print(json.dumps(metadata, indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
