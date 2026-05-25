from __future__ import annotations

import csv
import hashlib
import json
import math
import random
import sys
from collections import Counter, defaultdict
from datetime import date, datetime, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
PACKAGE_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PACKAGE_ROOT))

from logshield_ai.schema import CANONICAL_COLUMNS, IDENTITY_COLUMNS, NUMERIC_COLUMNS

SOURCE_DIR = ROOT / "dataset"
OUTPUT_DIR = ROOT / "data" / "processed"
OUTPUT_CSV = OUTPUT_DIR / "logshield_timeseries.csv"
REPORT_JSON = OUTPUT_DIR / "logshield_dataset_report.json"

KIB_BANJIR_LONGSOR = "BNC-2025-BL-0001"
KIB_GEMPA_TSUNAMI = "BNC-2025-GT-0001"

TARGET_ITEM_MAP = {
    "target_beras_kg_hari": ("perbekalan_pangan", "beras", "kg"),
    "target_mie_instan_bks_hari": ("perbekalan_pangan", "mie_instan", "bungkus"),
    "target_minyak_kg_hari": ("perbekalan_pangan", "minyak", "kg"),
    "target_protein_kg_hari": ("perbekalan_pangan", "protein", "kg"),
    "target_mpasi_pkt_hari": ("perbekalan_pangan", "mpasi", "paket"),
    "target_air_bersih_ltr_hari": ("air_sanitasi", "air_bersih", "liter"),
    "target_air_minum_ltr_hari": ("air_sanitasi", "air_minum", "liter"),
    "target_air_botol600ml_hari": ("air_sanitasi", "air_botol_600ml", "botol"),
    "target_alas_tidur": ("shelter", "alas_tidur", "unit"),
    "target_jamban": ("air_sanitasi", "jamban", "unit"),
    "target_sabun_mandi_bln": ("kebersihan", "sabun_mandi", "unit_bulan"),
    "target_sabun_cuci_bln": ("kebersihan", "sabun_cuci", "unit_bulan"),
    "target_pembalut_bln": ("kebersihan", "pembalut", "unit_bulan"),
    "target_popok_bayi_bln": ("kebersihan", "popok_bayi", "unit_bulan"),
    "target_sikat_pasta_gigi_bln": ("kebersihan", "sikat_pasta_gigi", "unit_bulan"),
}


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        sample = handle.read(4096)
        handle.seek(0)
        dialect = csv.Sniffer().sniff(sample, delimiters=",;\t|")
        return list(csv.DictReader(handle, dialect=dialect))


def read_canonical_csv(path: Path) -> list[dict[str, object]]:
    if not path.exists():
        return []
    rows = read_csv(path)
    return [{column: row.get(column, "") for column in CANONICAL_COLUMNS} for row in rows]


def slug(value: str, fallback: str) -> str:
    cleaned = "".join(ch.lower() if ch.isalnum() else "-" for ch in (value or fallback))
    cleaned = "-".join(part for part in cleaned.split("-") if part)
    return cleaned[:48] or fallback


def stable_id(prefix: str, *parts: str) -> str:
    raw = "|".join(parts)
    digest = hashlib.sha1(raw.encode("utf-8")).hexdigest()[:8].upper()
    return f"{prefix}-{digest}"


def to_float(value: str | int | float | None, default: float = 0.0) -> float:
    if value is None:
        return default
    text = str(value).strip()
    if not text or text.upper() == "NULL":
        return default
    text = text.replace(".", "").replace(",", ".") if "," in text else text
    try:
        return float(text)
    except ValueError:
        return default


def to_int(value: str | int | float | None, default: int = 0) -> int:
    return int(round(to_float(value, default)))


def parse_distribution_date(value: str) -> date:
    raw = (value or "").split(",")[0].strip()
    return datetime.strptime(raw, "%d/%m/%Y").date()


def base_row() -> dict[str, object]:
    return {column: "" for column in CANONICAL_COLUMNS}


def normalize_category(value: str) -> str:
    raw = (value or "").strip().lower()
    if "obat" in raw:
        return "medis"
    if "non" in raw or "peralatan" in raw:
        return "non_pangan"
    return "perbekalan_pangan"


def load_banjir_pengungsi() -> dict[str, dict[str, str]]:
    path = SOURCE_DIR / "Banjir-Longsor" / "data_pengungsi_bnpb_final.csv"
    rows = read_csv(path)
    by_province: dict[str, list[dict[str, str]]] = defaultdict(list)
    for row in rows:
        by_province[row["Provinsi"].upper()].append(row)
    selected: dict[str, dict[str, str]] = {}
    for province, poskos in by_province.items():
        selected[province] = max(poskos, key=lambda row: to_int(row["Grand Total Pengungsi"]))
    return selected


def build_distribution_rows() -> list[dict[str, object]]:
    path = SOURCE_DIR / "Banjir-Longsor" / "data_distribusi_final.csv"
    rows = read_csv(path)
    posko_by_province = load_banjir_pengungsi()
    grouped: dict[tuple[str, str, str, str], dict[str, object]] = {}

    for row in rows:
        try:
            day = parse_distribution_date(row["Tanggal"])
        except ValueError:
            continue
        province = (row.get("Provinsi") or "UNKNOWN").upper()
        posko = posko_by_province.get(province) or next(iter(posko_by_province.values()))
        item_name = slug(row.get("NamaBarang", ""), "barang")
        category = normalize_category(row.get("Kategori", ""))
        key = (day.isoformat(), province, posko["Nama Pos"], item_name)
        if key not in grouped:
            canonical = base_row()
            canonical.update(
                {
                    "date": day.isoformat(),
                    "kib_bencana_id": KIB_BANJIR_LONGSOR,
                    "disaster_type": "banjir_longsor",
                    "province": posko["Provinsi"],
                    "city": posko["Kab/Kot"],
                    "district": posko["Kecamatan"],
                    "village": posko["Desa/Kel"],
                    "posko_id": stable_id(
                        "POSKO",
                        KIB_BANJIR_LONGSOR,
                        posko["Provinsi"],
                        posko["Kab/Kot"],
                        posko["Kecamatan"],
                        posko["Desa/Kel"],
                        posko["Nama Pos"],
                    ),
                    "posko_name": posko["Nama Pos"],
                    "item_category": category,
                    "item_name": item_name,
                    "unit": row.get("Satuan") or "unit",
                    "total_pengungsi": to_int(posko["Grand Total Pengungsi"]),
                    "total_kk": to_int(posko["Total KK"]),
                    "bayi": to_int(posko["Total Bayi"]),
                    "balita": to_int(posko["Total Balita"]),
                    "anak": to_int(posko["Total Anak"]),
                    "remaja": to_int(posko["Total Remaja"]),
                    "dewasa": to_int(posko["Total Dewasa"]),
                    "lansia": to_int(posko["Total Lansia"]),
                    "ibu_hamil": 0,
                    "ibu_menyusui": 0,
                    "disabilitas": 0,
                    "stock_in_qty": 0.0,
                    "distributed_qty": 0.0,
                    "requested_qty": 0.0,
                    "current_stock_qty": 0.0,
                    "target_need_qty": 0.0,
                    "critical_stock_threshold": 0.0,
                    "source_dataset": "Banjir-Longsor/data_distribusi_final",
                }
            )
            grouped[key] = canonical
        grouped[key]["stock_in_qty"] = float(grouped[key]["stock_in_qty"]) + to_float(row.get("Masuk"))
        grouped[key]["distributed_qty"] = float(grouped[key]["distributed_qty"]) + to_float(row.get("Keluar"))

    for row in grouped.values():
        distributed = float(row["distributed_qty"])
        stock_in = float(row["stock_in_qty"])
        row["requested_qty"] = round(max(distributed, stock_in * 0.35), 2)
        row["target_need_qty"] = round(max(row["requested_qty"], distributed), 2)
        row["critical_stock_threshold"] = round(max(row["target_need_qty"], 1.0) * 2, 2)
        row["current_stock_qty"] = round(max(stock_in - distributed, 0.0), 2)

    return list(grouped.values())


def joined_gempa_rows() -> list[tuple[dict[str, str], dict[str, str]]]:
    features = read_csv(SOURCE_DIR / "GempaBumi-tsunami" / "features_demografi.csv")
    targets = read_csv(SOURCE_DIR / "GempaBumi-tsunami" / "targets_logistik.csv")
    target_by_key = {
        (row["Kecamatan"], row["Desa"], row["Pos Pengungsi"]): row
        for row in targets
    }
    pairs = []
    seen = set()
    for feature in features:
        key = (feature["Kecamatan"], feature["Desa"], feature["Pos Pengungsi"])
        if key in seen:
            continue
        target = target_by_key.get(key)
        if target:
            seen.add(key)
            pairs.append((feature, target))
    return pairs


def build_gempa_rows(days: int = 45) -> list[dict[str, object]]:
    rng = random.Random(20260514)
    start = date(2025, 11, 1)
    rows: list[dict[str, object]] = []

    for feature, target in joined_gempa_rows():
        posko_name = feature["Pos Pengungsi"]
        posko_id = stable_id("POSKO", KIB_GEMPA_TSUNAMI, feature["Kecamatan"], feature["Desa"], posko_name)
        total_pengungsi = to_int(feature["total_pengungsi"])
        base_demographic_pressure = 1.0 + to_float(feature["rasio_anak"]) * 0.18 + to_float(feature["rasio_lansia"]) * 0.12

        stock_state: dict[str, float] = {}
        for target_column, (_, item_name, _) in TARGET_ITEM_MAP.items():
            daily_target = to_float(target.get(target_column))
            stock_state[item_name] = max(daily_target * rng.uniform(2.5, 4.5), 1.0)

        for day_idx in range(days):
            current_day = start + timedelta(days=day_idx)
            response_phase = 1.22 if day_idx < 7 else 1.0 if day_idx < 24 else 0.88
            weekly_cycle = 1.0 + 0.08 * math.sin((day_idx % 7) / 7 * 2 * math.pi)
            shock = 1.0
            if day_idx in {9, 10, 11, 26}:
                shock += rng.uniform(0.18, 0.35)

            for target_column, (category, item_name, unit) in TARGET_ITEM_MAP.items():
                daily_target = to_float(target.get(target_column))
                if daily_target <= 0:
                    continue

                noise = rng.uniform(0.86, 1.16)
                target_need = daily_target * response_phase * weekly_cycle * shock * base_demographic_pressure
                requested = target_need * rng.uniform(0.92, 1.15)
                distributed = min(requested * rng.uniform(0.78, 1.08), stock_state[item_name] + daily_target * 0.35)
                stock_in = 0.0
                if stock_state[item_name] < daily_target * 1.8 or day_idx % 6 == 0:
                    stock_in = daily_target * rng.uniform(2.0, 5.0) * noise
                stock_state[item_name] = max(stock_state[item_name] + stock_in - distributed, 0.0)

                canonical = base_row()
                canonical.update(
                    {
                        "date": current_day.isoformat(),
                        "kib_bencana_id": KIB_GEMPA_TSUNAMI,
                        "disaster_type": "gempa_bumi_tsunami",
                        "province": "Jawa Barat",
                        "city": "Kab. Cianjur",
                        "district": feature["Kecamatan"],
                        "village": feature["Desa"],
                        "posko_id": posko_id,
                        "posko_name": posko_name,
                        "item_category": category,
                        "item_name": item_name,
                        "unit": unit,
                        "total_pengungsi": total_pengungsi,
                        "total_kk": to_int(feature["jumlah_kk"]),
                        "bayi": to_int(feature["balita_bawah_1th"]),
                        "balita": to_int(feature["balita_1_5th"]),
                        "anak": to_int(feature["anak_6_12th"]),
                        "remaja": to_int(feature["remaja"]),
                        "dewasa": to_int(feature["dewasa"]),
                        "lansia": to_int(feature["lansia"]),
                        "ibu_hamil": to_int(feature["ibu_hamil"]),
                        "ibu_menyusui": to_int(feature["ibu_menyusui"]),
                        "disabilitas": to_int(feature["disabilitas"]),
                        "stock_in_qty": round(stock_in, 2),
                        "distributed_qty": round(distributed, 2),
                        "requested_qty": round(requested, 2),
                        "current_stock_qty": round(stock_state[item_name], 2),
                        "target_need_qty": round(target_need, 2),
                        "critical_stock_threshold": round(daily_target * 2.0, 2),
                        "source_dataset": "GempaBumi-tsunami/features_demografi+targets_logistik",
                    }
                )
                rows.append(canonical)

    return rows


def validate_rows(rows: list[dict[str, object]]) -> dict[str, object]:
    errors: list[str] = []
    duplicate_keys: Counter[tuple[object, ...]] = Counter()
    dates = set()
    poskos = set()
    items = set()

    for index, row in enumerate(rows, start=2):
        for column in CANONICAL_COLUMNS:
            if column not in row:
                errors.append(f"row {index}: missing column {column}")
        for column in IDENTITY_COLUMNS:
            if not row.get(column):
                errors.append(f"row {index}: empty identity column {column}")
        for column in NUMERIC_COLUMNS:
            value = to_float(row.get(column))
            if value < 0:
                errors.append(f"row {index}: negative value in {column}")
        try:
            datetime.strptime(str(row["date"]), "%Y-%m-%d")
        except ValueError:
            errors.append(f"row {index}: invalid date {row.get('date')}")

        duplicate_keys[tuple(row[col] for col in IDENTITY_COLUMNS)] += 1
        dates.add(row["date"])
        poskos.add(row["posko_id"])
        items.add(row["item_name"])

    duplicated = [key for key, count in duplicate_keys.items() if count > 1]
    if duplicated:
        errors.append(f"duplicate identity keys: {len(duplicated)}")

    return {
        "row_count": len(rows),
        "date_count": len(dates),
        "date_min": min(dates) if dates else None,
        "date_max": max(dates) if dates else None,
        "posko_count": len(poskos),
        "item_count": len(items),
        "errors": errors[:50],
        "error_count": len(errors),
    }


def collapse_duplicate_rows(rows: list[dict[str, object]]) -> list[dict[str, object]]:
    collapsed: dict[tuple[object, ...], dict[str, object]] = {}
    additive_columns = ["stock_in_qty", "distributed_qty", "requested_qty", "target_need_qty"]
    max_columns = ["current_stock_qty", "critical_stock_threshold"]

    for row in rows:
        key = tuple(row[column] for column in IDENTITY_COLUMNS)
        if key not in collapsed:
            collapsed[key] = dict(row)
            continue

        current = collapsed[key]
        for column in additive_columns:
            current[column] = round(to_float(current.get(column)) + to_float(row.get(column)), 2)
        for column in max_columns:
            current[column] = round(max(to_float(current.get(column)), to_float(row.get(column))), 2)
        if current.get("unit") != row.get("unit"):
            units = sorted(set(str(current.get("unit", "")).split("|") + [str(row.get("unit", ""))]))
            current["unit"] = "|".join(unit for unit in units if unit)
        current["source_dataset"] = str(current["source_dataset"])

    return list(collapsed.values())


def write_outputs(rows: list[dict[str, object]], report: dict[str, object]) -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    with OUTPUT_CSV.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=CANONICAL_COLUMNS)
        writer.writeheader()
        for row in rows:
            writer.writerow({column: row.get(column, "") for column in CANONICAL_COLUMNS})
    REPORT_JSON.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")


def main() -> int:
    distribution_rows = build_distribution_rows()
    gempa_rows = build_gempa_rows()
    volcano_rows = read_canonical_csv(SOURCE_DIR / "Gunung-Meletus" / "logshield_gunung_meletus.csv")
    raw_rows = distribution_rows + gempa_rows + volcano_rows
    rows = collapse_duplicate_rows(raw_rows)
    rows = sorted(rows, key=lambda row: (row["date"], row["kib_bencana_id"], row["posko_id"], row["item_name"]))
    report = validate_rows(rows)
    report["raw_row_count_before_collapse"] = len(raw_rows)
    report["collapsed_duplicate_rows"] = len(raw_rows) - len(rows)
    report["source_files"] = [
        "dataset/Banjir-Longsor/data_distribusi_final.csv",
        "dataset/Banjir-Longsor/data_pengungsi_bnpb_final.csv",
        "dataset/GempaBumi-tsunami/features_demografi.csv",
        "dataset/GempaBumi-tsunami/targets_logistik.csv",
        "dataset/Gunung-Meletus/logshield_gunung_meletus.csv",
    ]
    report["output_csv"] = str(OUTPUT_CSV.relative_to(ROOT))
    write_outputs(rows, report)
    print(json.dumps(report, indent=2, ensure_ascii=False))
    return 1 if report["error_count"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
