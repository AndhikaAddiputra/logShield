from __future__ import annotations

import json
import math
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
ARRAYS_NPZ = ROOT / "data" / "tinytimemixer" / "logshield_ttm_arrays.npz"
METADATA_JSON = ROOT / "data" / "tinytimemixer" / "logshield_ttm_arrays_metadata.json"
OUTPUT_DIR = ROOT / "apps" / "ai-engine" / "models" / "tinytimemixer"
METRICS_JSON = ROOT / "data" / "tinytimemixer" / "tinytimemixer_metrics.json"

EPOCHS = int(os.environ.get("TTM_EPOCHS", "10"))
BATCH_SIZE = int(os.environ.get("TTM_BATCH_SIZE", "256"))
LEARNING_RATE = float(os.environ.get("TTM_LEARNING_RATE", "0.0001"))
PATIENCE = int(os.environ.get("TTM_EARLY_STOPPING_PATIENCE", "3"))
RANDOM_SEED = int(os.environ.get("TTM_RANDOM_SEED", "42"))


def require_dependencies() -> tuple[object, object, object, object, object]:
    if sys.version_info >= (3, 13):
        print(
            json.dumps(
                {
                    "status": "blocked",
                    "reason": "IBM granite-tsfm currently requires Python >=3.9,<3.13.",
                    "current_python": sys.version.split()[0],
                    "recommended_python": "3.11 or 3.12",
                },
                indent=2,
            ),
            file=sys.stderr,
        )
        raise RuntimeError("incompatible python")
    try:
        import numpy as np
        import torch
        from torch.utils.data import DataLoader, TensorDataset
        from tsfm_public import TinyTimeMixerForPrediction
        from tsfm_public.models.tinytimemixer.configuration_tinytimemixer import TinyTimeMixerConfig
    except ModuleNotFoundError as error:
        print(
            json.dumps(
                {
                    "status": "missing_dependency",
                    "missing": error.name,
                    "install": "pip install -r apps/ai-engine/requirements-ttm.txt",
                },
                indent=2,
            ),
            file=sys.stderr,
        )
        raise
    return np, torch, DataLoader, TensorDataset, (TinyTimeMixerConfig, TinyTimeMixerForPrediction)


def make_loader(torch: object, DataLoader: object, TensorDataset: object, x: object, y: object, shuffle: bool) -> object:
    dataset = TensorDataset(torch.tensor(x, dtype=torch.float32), torch.tensor(y, dtype=torch.float32))
    return DataLoader(dataset, batch_size=BATCH_SIZE, shuffle=shuffle)


def evaluate(np: object, torch: object, model: object, loader: object, device: object) -> dict[str, float]:
    model.eval()
    total_loss = 0.0
    total_count = 0
    predictions = []
    actuals = []
    with torch.no_grad():
        for past_values, target_values in loader:
            past_values = past_values.to(device)
            target_values = target_values.to(device)
            output = model(past_values=past_values, return_loss=False)
            prediction = output.prediction_outputs[:, :, 0]
            loss = torch.nn.functional.mse_loss(prediction, target_values, reduction="sum")
            total_loss += float(loss.item())
            total_count += int(target_values.numel())
            predictions.append(torch.expm1(prediction).clamp(min=0).cpu().numpy())
            actuals.append(torch.expm1(target_values).cpu().numpy())

    predicted = np.concatenate(predictions).reshape(-1)
    actual = np.concatenate(actuals).reshape(-1)
    absolute_error = np.abs(actual - predicted)
    return {
        "loss": round(total_loss / max(total_count, 1), 6),
        "mae": round(float(absolute_error.mean()), 4),
        "rmse": round(float(math.sqrt(((actual - predicted) ** 2).mean())), 4),
        "mape": round(float((absolute_error / np.maximum(actual, 1.0)).mean()), 4),
    }


def main() -> int:
    if not ARRAYS_NPZ.exists():
        print(
            json.dumps(
                {
                    "status": "missing_arrays",
                    "missing": str(ARRAYS_NPZ.relative_to(ROOT)),
                    "build": "python apps/ai-engine/scripts/build_tinytimemixer_arrays.py",
                },
                indent=2,
            ),
            file=sys.stderr,
        )
        return 1

    try:
        np, torch, DataLoader, TensorDataset, model_classes = require_dependencies()
    except (ModuleNotFoundError, RuntimeError):
        return 1
    TinyTimeMixerConfig, TinyTimeMixerForPrediction = model_classes

    torch.manual_seed(RANDOM_SEED)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    METRICS_JSON.parent.mkdir(parents=True, exist_ok=True)

    arrays = np.load(ARRAYS_NPZ)
    x_train = np.log1p(arrays["x_train"])
    y_train = np.log1p(arrays["y_train"])
    x_validation = np.log1p(arrays["x_validation"])
    y_validation = np.log1p(arrays["y_validation"])
    x_test = np.log1p(arrays["x_test"])
    y_test = np.log1p(arrays["y_test"])

    context_length = int(x_train.shape[1])
    input_channels = int(x_train.shape[2])
    horizon = int(y_train.shape[1])
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    train_loader = make_loader(torch, DataLoader, TensorDataset, x_train, y_train, shuffle=True)
    validation_loader = make_loader(torch, DataLoader, TensorDataset, x_validation, y_validation, shuffle=False)
    test_loader = make_loader(torch, DataLoader, TensorDataset, x_test, y_test, shuffle=False)

    config = TinyTimeMixerConfig(
        context_length=context_length,
        prediction_length=horizon,
        prediction_filter_length=horizon,
        num_input_channels=input_channels,
        patch_length=2,
        patch_stride=2,
        d_model=32,
        decoder_d_model=16,
        dropout=0.1,
        head_dropout=0.1,
        loss="mse",
    )
    model = TinyTimeMixerForPrediction(config).to(device)
    optimizer = torch.optim.AdamW(model.parameters(), lr=LEARNING_RATE)

    history: list[dict[str, float | int]] = []
    best_validation_loss = float("inf")
    best_epoch = 0
    epochs_without_improvement = 0

    for epoch in range(1, EPOCHS + 1):
        model.train()
        train_loss = 0.0
        train_count = 0
        for past_values, target_values in train_loader:
            past_values = past_values.to(device)
            target_values = target_values.to(device)
            optimizer.zero_grad(set_to_none=True)
            output = model(past_values=past_values, return_loss=False)
            prediction = output.prediction_outputs[:, :, 0]
            loss = torch.nn.functional.mse_loss(prediction, target_values)
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
            optimizer.step()
            train_loss += float(loss.item()) * int(target_values.numel())
            train_count += int(target_values.numel())

        validation = evaluate(np, torch, model, validation_loader, device)
        epoch_result = {
            "epoch": epoch,
            "train_loss": round(train_loss / max(train_count, 1), 6),
            "validation_loss": validation["loss"],
            "validation_mae": validation["mae"],
            "validation_mape": validation["mape"],
        }
        history.append(epoch_result)
        print(json.dumps(epoch_result, ensure_ascii=False))

        if validation["loss"] < best_validation_loss:
            best_validation_loss = float(validation["loss"])
            best_epoch = epoch
            epochs_without_improvement = 0
            model.save_pretrained(OUTPUT_DIR)
        else:
            epochs_without_improvement += 1
            if epochs_without_improvement >= PATIENCE:
                break

    best_model = TinyTimeMixerForPrediction.from_pretrained(OUTPUT_DIR).to(device)
    validation_metrics = evaluate(np, torch, best_model, validation_loader, device)
    test_metrics = evaluate(np, torch, best_model, test_loader, device)
    metadata = json.loads(METADATA_JSON.read_text(encoding="utf-8")) if METADATA_JSON.exists() else {}
    report = {
        "status": "success",
        "model_backend": "tinytimemixer",
        "training_mode": "logshield_from_scratch_ttm_architecture",
        "note": "Uses IBM Granite TinyTimeMixer architecture with LogShield-specific context/horizon. Pretrained r2 checkpoint was not reused because its native patch/context shape is incompatible with the current LogShield context length.",
        "epochs_requested": EPOCHS,
        "epochs_completed": len(history),
        "best_epoch": best_epoch,
        "early_stopping_patience": PATIENCE,
        "batch_size": BATCH_SIZE,
        "learning_rate": LEARNING_RATE,
        "device": str(device),
        "metadata": metadata,
        "history": history,
        "validation": validation_metrics,
        "test": test_metrics,
        "outputs": {
            "model": str(OUTPUT_DIR.relative_to(ROOT)),
            "metrics": str(METRICS_JSON.relative_to(ROOT)),
        },
    }
    METRICS_JSON.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    print(json.dumps(report, indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
