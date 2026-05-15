from __future__ import annotations

from dataclasses import dataclass
from datetime import date, timedelta
from statistics import mean


@dataclass(frozen=True)
class ForecastResult:
    model_name: str
    mae: float
    mape: float
    predictions: list[float]


def mae(actual: list[float], predicted: list[float]) -> float:
    if not actual:
        return 0.0
    return sum(abs(a - p) for a, p in zip(actual, predicted)) / len(actual)


def mape(actual: list[float], predicted: list[float]) -> float:
    valid = [(a, p) for a, p in zip(actual, predicted) if abs(a) > 1e-9]
    if not valid:
        return 0.0
    return sum(abs((a - p) / a) for a, p in valid) / len(valid) * 100


def naive_last(train: list[float], horizon: int) -> list[float]:
    value = train[-1] if train else 0.0
    return [value for _ in range(horizon)]


def moving_average(train: list[float], horizon: int, window: int = 7) -> list[float]:
    if not train:
        return [0.0 for _ in range(horizon)]
    value = mean(train[-window:])
    return [value for _ in range(horizon)]


def seasonal_naive(train: list[float], horizon: int, season_length: int = 7) -> list[float]:
    if not train:
        return [0.0 for _ in range(horizon)]
    if len(train) < season_length:
        return naive_last(train, horizon)
    season = train[-season_length:]
    return [season[index % season_length] for index in range(horizon)]


def evaluate_baselines(values: list[float], horizon: int = 7) -> list[ForecastResult]:
    if len(values) <= horizon:
        train = values
        actual = values[-horizon:] if values else []
    else:
        train = values[:-horizon]
        actual = values[-horizon:]

    models = {
        "naive_last": naive_last(train, len(actual)),
        "moving_average_7": moving_average(train, len(actual), 7),
        "seasonal_naive_7": seasonal_naive(train, len(actual), 7),
    }
    return [
        ForecastResult(
            model_name=name,
            mae=mae(actual, predictions),
            mape=mape(actual, predictions),
            predictions=predictions,
        )
        for name, predictions in models.items()
    ]


def select_best(results: list[ForecastResult]) -> ForecastResult:
    return min(results, key=lambda item: (item.mae, item.mape, item.model_name))


def forecast_with_model(model_name: str, values: list[float], horizon: int = 7) -> list[float]:
    if model_name == "moving_average_7":
        return moving_average(values, horizon, 7)
    if model_name == "seasonal_naive_7":
        return seasonal_naive(values, horizon, 7)
    return naive_last(values, horizon)


def next_dates(last_date: date, horizon: int) -> list[str]:
    return [(last_date + timedelta(days=index)).isoformat() for index in range(1, horizon + 1)]

