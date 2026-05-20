from __future__ import annotations

SERIES_KEY_COLUMNS = [
    "kib_bencana_id",
    "posko_id",
    "item_name",
]

SERIES_META_COLUMNS = [
    "disaster_type",
    "province",
    "city",
    "district",
    "village",
    "posko_name",
    "item_category",
    "unit",
    "source_dataset",
    "is_synthetic",
]

TRAINING_FEATURE_COLUMNS = [
    "day_since_disaster",
    "day_of_week",
    "month",
    "is_weekend",
    "total_pengungsi",
    "total_kk",
    "bayi",
    "balita",
    "anak",
    "remaja",
    "dewasa",
    "lansia",
    "ibu_hamil",
    "ibu_menyusui",
    "disabilitas",
    "vulnerable_count",
    "vulnerable_ratio",
    "stock_in_qty",
    "distributed_qty",
    "requested_qty",
    "current_stock_qty",
    "critical_stock_threshold",
    "stock_coverage_days",
    "need_qty_lag_1",
    "need_qty_lag_3",
    "need_qty_lag_7",
    "distributed_qty_lag_1",
    "distributed_qty_lag_3",
    "stock_qty_lag_1",
    "rolling_need_mean_3",
    "rolling_need_mean_7",
    "rolling_distributed_mean_7",
    "rolling_stock_mean_7",
]

TRAINING_TARGET_COLUMNS = [
    "target_need_qty",
    "risk_label",
]

TRAINING_COLUMNS = [
    "date",
    *SERIES_KEY_COLUMNS,
    *SERIES_META_COLUMNS,
    *TRAINING_FEATURE_COLUMNS,
    *TRAINING_TARGET_COLUMNS,
]

STATSFORECAST_COLUMNS = [
    "unique_id",
    "ds",
    "y",
    "kib_bencana_id",
    "posko_id",
    "item_name",
    "disaster_type",
    "item_category",
    "unit",
    "is_synthetic",
]

TTM_CONTEXT_LENGTH = 30
TTM_HORIZON = 7
