from __future__ import annotations

import json
import sys
from pathlib import Path

PACKAGE_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PACKAGE_ROOT))

from logshield_ai.artifacts import anomalies, artifact_summary, forecasts, recommendations


def main() -> int:
    summary = artifact_summary()
    result = {
        "status": summary.get("status"),
        "dataset_rows": summary.get("dataset", {}).get("row_count"),
        "forecast_sample": len(forecasts(limit=3)),
        "recommendation_sample": len(recommendations(limit=3, risk_level="kritis")),
        "anomaly_sample": len(anomalies(limit=3, severity="high")),
    }
    print(json.dumps(result, indent=2, ensure_ascii=False))
    if result["status"] != "ready":
        return 1
    if min(result["forecast_sample"], result["recommendation_sample"], result["anomaly_sample"]) <= 0:
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

