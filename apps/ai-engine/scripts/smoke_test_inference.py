from __future__ import annotations

import csv
import json
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
PACKAGE_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PACKAGE_ROOT))

from logshield_ai.inference import CONTEXT_LENGTH, infer_recommendation, model_status

TRAINING_CSV = ROOT / "data" / "processed" / "logshield_training_dataset.csv"


def load_sample_payload() -> dict[str, object]:
    groups: dict[tuple[str, str, str], list[dict[str, str]]] = defaultdict(list)
    with TRAINING_CSV.open("r", encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            key = (row["kib_bencana_id"], row["posko_id"], row["item_name"])
            groups[key].append(row)

    rows = next(rows for rows in groups.values() if len(rows) >= CONTEXT_LENGTH)
    rows = sorted(rows, key=lambda row: row["date"])[-CONTEXT_LENGTH:]
    meta = rows[-1]
    vulnerable_count = sum(
        int(float(meta[column]))
        for column in ("bayi", "balita", "anak", "lansia", "ibu_hamil", "ibu_menyusui", "disabilitas")
    )
    return {
        "kib_bencana_id": meta["kib_bencana_id"],
        "disaster_type": meta["disaster_type"],
        "posko_id": meta["posko_id"],
        "posko_name": meta["posko_name"],
        "item_name": meta["item_name"],
        "item_category": meta["item_category"],
        "unit": meta["unit"],
        "total_pengungsi": int(float(meta["total_pengungsi"])),
        "vulnerable_count": vulnerable_count,
        "current_stock_qty": float(meta["current_stock_qty"]),
        "critical_stock_threshold": float(meta["critical_stock_threshold"]),
        "history": [
            {
                "date": row["date"],
                "target_need_qty": float(row["target_need_qty"]),
                "current_stock_qty": float(row["current_stock_qty"]),
                "distributed_qty": float(row["distributed_qty"]),
                "requested_qty": float(row["requested_qty"]),
            }
            for row in rows
        ],
    }


def load_cold_start_payload() -> dict[str, object]:
    payload = load_sample_payload()
    payload["history"] = []
    payload["current_stock_qty"] = 0
    payload["requested_qty"] = 30000
    return payload


def main() -> int:
    if not TRAINING_CSV.exists():
        print(f"Missing training dataset: {TRAINING_CSV.relative_to(ROOT)}", file=sys.stderr)
        return 1

    payload = load_sample_payload()
    response = infer_recommendation(payload)
    cold_start_response = infer_recommendation(load_cold_start_payload())
    errors: list[str] = []
    if response.get("model_backend") != "tinytimemixer":
        errors.append("unexpected model backend")
    if response.get("inference_mode") != "time_series":
        errors.append("expected full-history sample to use time_series mode")
    if len(response.get("daily_recommendations", [])) != 7:
        errors.append("daily recommendation horizon is not 7")
    if "top_recommendation" not in response:
        errors.append("missing top_recommendation")
    prediction_documents = response.get("prediction_documents", [])
    if len(prediction_documents) != 7:
        errors.append("prediction document horizon is not 7")
    else:
        first_prediction = prediction_documents[0]
        if first_prediction.get("type") != "prediction":
            errors.append("prediction document has unexpected type")
        if first_prediction.get("attribution_method") != "ttm_gradient_x_input":
            errors.append("prediction document is missing live TTM attribution method")
        if not first_prediction.get("attribution_values"):
            errors.append("prediction document is missing attribution_values")
        if not first_prediction.get("rationale_chips"):
            errors.append("prediction document is missing attribution rationale chips")
        if "confidence_low" not in first_prediction or "confidence_high" not in first_prediction:
            errors.append("prediction document is missing confidence interval")
    top_details = response.get("top_recommendation", {}).get("rationale_chip_details", [])
    if not top_details:
        errors.append("top recommendation is missing structured rationale_chip_details")
    if cold_start_response.get("inference_mode") != "cold_start":
        errors.append("expected empty-history sample to use cold_start mode")
    if len(cold_start_response.get("daily_recommendations", [])) != 7:
        errors.append("cold start recommendation horizon is not 7")
    cold_start_chips = cold_start_response.get("top_recommendation", {}).get("rationale_chips", [])
    if not any("riwayat posko belum mencapai 30 hari" in chip for chip in cold_start_chips):
        errors.append("cold start response is missing fallback rationale")

    result = {
        "status": "failed" if errors else "ok",
        "errors": errors,
        "model": model_status(),
        "sample": {
            "kib_bencana_id": response.get("kib_bencana_id"),
            "posko_id": response.get("posko_id"),
            "item_name": response.get("item_name"),
            "top_recommendation": response.get("top_recommendation"),
            "prediction_document": response.get("prediction_documents", [None])[0],
            "explainability": response.get("explainability"),
        },
        "cold_start_sample": {
            "inference_mode": cold_start_response.get("inference_mode"),
            "top_recommendation": cold_start_response.get("top_recommendation"),
        },
    }
    print(json.dumps(result, indent=2, ensure_ascii=False))
    return 1 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
