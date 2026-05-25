from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
import torch
from tsfm_public import TinyTimeMixerForPrediction

CHANNEL_NAMES = [
    "past_target_need_qty",
    "past_current_stock_qty",
    "past_distributed_qty",
    "past_requested_qty",
]


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
    past_values.requires_grad_(True)
    output = model(past_values=past_values, return_loss=False)
    objective = output.prediction_outputs[0, :, 0].sum()
    objective.backward()
    forecast = torch.expm1(output.prediction_outputs[0, :, 0]).clamp(min=0).detach().cpu().numpy().tolist()
    raw_attr = (past_values.grad * past_values).abs().sum(dim=1).squeeze(0)
    total_attr = float(raw_attr.sum().detach().cpu()) or 1.0
    attribution = {
        name: round(float(value.detach().cpu()) / total_attr, 6)
        for name, value in zip(CHANNEL_NAMES, raw_attr)
    }
    print(
        json.dumps(
            {
                "forecast": [round(float(value), 2) for value in forecast],
                "attribution": attribution,
            }
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
