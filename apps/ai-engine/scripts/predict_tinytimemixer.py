from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
import torch
from tsfm_public import TinyTimeMixerForPrediction


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run TinyTimeMixer inference for one LogShield 14-day window.")
    parser.add_argument("--model-dir", required=True, help="Path to saved TinyTimeMixer model directory.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    payload = json.loads(input())
    history = payload.get("history", [])
    x = np.array(
        [
            [
                float(point.get("target_need_qty", 0)),
                float(point.get("current_stock_qty", 0)),
                float(point.get("distributed_qty", 0)),
                float(point.get("requested_qty", 0)),
            ]
            for point in history
        ],
        dtype=np.float32,
    )
    x = np.log1p(x)
    past_values = torch.tensor(x, dtype=torch.float32).unsqueeze(0)
    model = TinyTimeMixerForPrediction.from_pretrained(Path(args.model_dir))
    model.eval()
    with torch.no_grad():
        output = model(past_values=past_values, return_loss=False)
    forecast = torch.expm1(output.prediction_outputs[0, :, 0]).clamp(min=0).cpu().numpy().tolist()
    print(json.dumps({"forecast": [round(float(value), 2) for value in forecast]}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
