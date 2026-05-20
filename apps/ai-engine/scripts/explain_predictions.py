from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
PACKAGE_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PACKAGE_ROOT))

from logshield_ai.shap_explainer import NUMERIC_EXPLANATION_FEATURES, shap_chip

INPUT_CSV = ROOT / "data" / "processed" / "logshield_training_dataset.csv"
OUTPUT_DIR = ROOT / "data" / "explainability"
SHAP_REPORT_JSON = OUTPUT_DIR / "shap_report.json"
SHAP_BACKGROUND_CSV = OUTPUT_DIR / "shap_background.csv"

TRAIN_SAMPLE_SIZE = 12000
EXPLAIN_SAMPLE_SIZE = 1500
RANDOM_STATE = 42


def require_dependencies() -> tuple[object, object, object]:
    try:
        import pandas as pd
        import shap
        from sklearn.ensemble import RandomForestRegressor
    except ModuleNotFoundError as error:
        missing = error.name or "unknown"
        message = {
            "status": "missing_dependency",
            "missing": missing,
            "install": "pip install -r apps/ai-engine/requirements.txt",
        }
        print(json.dumps(message, indent=2), file=sys.stderr)
        raise
    return pd, shap, RandomForestRegressor


def main() -> int:
    if not INPUT_CSV.exists():
        print(f"Missing training dataset: {INPUT_CSV.relative_to(ROOT)}", file=sys.stderr)
        return 1

    try:
        pd, shap, RandomForestRegressor = require_dependencies()
    except ModuleNotFoundError:
        return 1

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    df = pd.read_csv(INPUT_CSV)
    available_features = [feature for feature in NUMERIC_EXPLANATION_FEATURES if feature in df.columns]
    sample_size = min(TRAIN_SAMPLE_SIZE, len(df))
    explain_size = min(EXPLAIN_SAMPLE_SIZE, sample_size)
    sample = df.sample(n=sample_size, random_state=RANDOM_STATE)
    explain_sample = sample.sample(n=explain_size, random_state=RANDOM_STATE)

    x_train = sample[available_features].fillna(0)
    y_train = sample["target_need_qty"].fillna(0)
    x_explain = explain_sample[available_features].fillna(0)

    surrogate = RandomForestRegressor(
        n_estimators=60,
        max_depth=10,
        min_samples_leaf=5,
        random_state=RANDOM_STATE,
        n_jobs=-1,
    )
    surrogate.fit(x_train, y_train)
    explainer = shap.TreeExplainer(surrogate)
    shap_values = explainer.shap_values(x_explain)
    mean_abs = abs(shap_values).mean(axis=0)
    ranked = sorted(
        (
            {
                "feature": feature,
                "mean_abs_shap": round(float(score), 6),
                "rationale_chip": shap_chip(feature),
            }
            for feature, score in zip(available_features, mean_abs)
        ),
        key=lambda item: item["mean_abs_shap"],
        reverse=True,
    )

    x_explain.head(200).to_csv(SHAP_BACKGROUND_CSV, index=False)
    report = {
        "input": str(INPUT_CSV.relative_to(ROOT)),
        "method": "shap_tree_surrogate",
        "note": "SHAP explains a RandomForest surrogate trained on engineered LogShield features; it is an explainability layer, not the active forecasting model.",
        "target": "target_need_qty",
        "train_sample_size": sample_size,
        "explain_sample_size": explain_size,
        "features": available_features,
        "top_features": ranked[:15],
        "outputs": {
            "report": str(SHAP_REPORT_JSON.relative_to(ROOT)),
            "background": str(SHAP_BACKGROUND_CSV.relative_to(ROOT)),
        },
    }
    SHAP_REPORT_JSON.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    print(json.dumps(report, indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
