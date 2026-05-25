from __future__ import annotations

import csv
import hashlib
import random
import re
import sys
import importlib
from datetime import date, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
PACKAGE_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PACKAGE_ROOT))

from logshield_ai.schema import CANONICAL_COLUMNS

try:
    openpyxl = importlib.import_module("openpyxl")
except Exception as exc:  
    raise SystemExit("openpyxl is required. Install it with 'pip install openpyxl' or run inside the bundled Codex Python runtime.") from exc

DOWNLOADS = Path(r"C:\Users\Ferro Arka\Downloads")
OUTPUT_DIR = ROOT / "dataset" / "Gunung-Meletus"
SOURCE_SNAPSHOT_CSV = OUTPUT_DIR / "gunung_meletus_pengungsi.csv"
CANONICAL_CSV = OUTPUT_DIR / "logshield_gunung_meletus.csv"

KIB_BY_EVENT = {
    "lewotobi": "BNC-2024-GM-LEWOTOBI",
    "gunung_ibu": "BNC-2025-GM-IBU",
    "gunung_ruang": "BNC-2024-GM-RUANG",
}

VOLCANO_ITEMS = [
    # category, item, unit, per-person/day, vulnerable multipliers
    ("perbekalan_pangan", "beras", "kg", 0.40, 0.00),
    ("perbekalan_pangan", "mie_instan", "bungkus", 1.50, 0.05),
    ("perbekalan_pangan", "protein_kaleng", "kaleng", 0.30, 0.04),
    ("air_sanitasi", "air_minum", "liter", 2.50, 0.10),
    ("air_sanitasi", "air_bersih", "liter", 15.00, 0.12),
    ("kesehatan", "masker", "pcs", 2.00, 0.20),
    ("kesehatan", "obat_ispa", "paket", 0.04, 0.30),
    ("shelter", "selimut", "unit", 0.08, 0.20),
    ("shelter", "tikar", "unit", 0.06, 0.10),
    ("kebersihan", "hygiene_kit", "paket", 0.05, 0.15),
    ("kebersihan", "popok_bayi", "pcs", 0.00, 3.00),
    ("kebersihan", "pembalut", "pcs", 0.12, 0.00),
]


def clean_text(value: object, fallback: str = "") -> str:
    text = str(value or fallback).strip()
    text = re.sub(r"\s+", " ", text)
    return text


def to_int(value: object) -> int:
    if value is None or value == "":
        return 0
    try:
        return int(round(float(value)))
    except (TypeError, ValueError):
        return 0


def stable_id(prefix: str, *parts: str) -> str:
    digest = hashlib.sha1("|".join(parts).encode("utf-8")).hexdigest()[:8].upper()
    return f"{prefix}-{digest}"


def base_snapshot(event: str, snapshot_date: date) -> dict[str, object]:
    return {
        "event": event,
        "snapshot_date": snapshot_date.isoformat(),
        "kib_bencana_id": KIB_BY_EVENT[event],
        "disaster_type": "gunung_meletus",
        "province": "",
        "city": "",
        "district": "",
        "village": "",
        "posko_id": "",
        "posko_name": "",
        "total_pengungsi": 0,
        "total_kk": 0,
        "bayi": 0,
        "balita": 0,
        "anak": 0,
        "remaja": 0,
        "dewasa": 0,
        "lansia": 0,
        "ibu_hamil": 0,
        "ibu_menyusui": 0,
        "disabilitas": 0,
        "source_file": "",
    }


def header_map(headers: tuple[object, ...]) -> dict[str, int]:
    return {clean_text(value).upper(): index for index, value in enumerate(headers) if value}


def value(row: tuple[object, ...], mapping: dict[str, int], name: str) -> object:
    index = mapping.get(name)
    if index is None or index >= len(row):
        return None
    return row[index]


def load_lewotobi() -> list[dict[str, object]]:
    files = [
        ("20241107_data-sementara-pengungsi-erupsi-gunung-lewotobi.xlsx", date(2024, 11, 7)),
        ("20241108_data-sementara-pengungsi-erupsi-gunung-lewotobi.xlsx", date(2024, 11, 8)),
        ("20241122_data-sementara-pengungsi-erupsi-gunung-lewotobi.xlsx", date(2024, 11, 22)),
        ("20241127_data-sementara-pengungsi-erupsi-gunung-lewotobi.xlsx", date(2024, 11, 27)),
    ]
    snapshots: list[dict[str, object]] = []
    for filename, snapshot_date in files:
        workbook = openpyxl.load_workbook(DOWNLOADS / filename, read_only=True, data_only=True)
        sheet = workbook.worksheets[0]
        rows = sheet.iter_rows(values_only=True)
        headers = next(rows)
        mapping = header_map(headers)
        for row in rows:
            posko_name = clean_text(value(row, mapping, "TITIK LOKASI PENGUNGSIAN"))
            total = to_int(value(row, mapping, "JIWA (TOTAL)"))
            if not posko_name or total <= 0:
                continue
            district = clean_text(value(row, mapping, "WILAYAH POS PENGUNGSIAN")).replace("KEC. ", "")
            snap = base_snapshot("lewotobi", snapshot_date)
            snap.update(
                {
                    "province": "Nusa Tenggara Timur",
                    "city": clean_text(value(row, mapping, "KABUPATEN")).title(),
                    "district": district.title(),
                    "village": posko_name.title(),
                    "posko_id": stable_id("POSKO", KIB_BY_EVENT["lewotobi"], district, posko_name),
                    "posko_name": posko_name.title(),
                    "total_pengungsi": total,
                    "total_kk": to_int(value(row, mapping, "KK (TOTAL)")),
                    "bayi": to_int(value(row, mapping, "BAYI (TOTAL)")),
                    "balita": to_int(value(row, mapping, "BALITA (TOTAL)")),
                    "anak": to_int(value(row, mapping, "SD (TOTAL)")),
                    "remaja": to_int(value(row, mapping, "SMP (TOTAL)")) + to_int(value(row, mapping, "SMA (TOTAL)")),
                    "lansia": to_int(value(row, mapping, "LANSIA (TOTAL)")),
                    "ibu_hamil": to_int(value(row, mapping, "IBU HAMIL")),
                    "ibu_menyusui": to_int(value(row, mapping, "IBU MENYUSUI")),
                    "disabilitas": to_int(value(row, mapping, "DISABILITAS (TOTAL)")),
                    "source_file": filename,
                }
            )
            snap["dewasa"] = max(total - int(snap["bayi"]) - int(snap["balita"]) - int(snap["anak"]) - int(snap["remaja"]) - int(snap["lansia"]), 0)
            snapshots.append(snap)
    return snapshots


def load_gunung_ibu() -> list[dict[str, object]]:
    files = [
        ("data-pengungsi-gunung-ibu-18-januari-2025.xlsx", date(2025, 1, 18)),
        ("data-pengungsi-gunung-ibu-19-januari-2025.xlsx", date(2025, 1, 19)),
    ]
    snapshots: list[dict[str, object]] = []
    for filename, snapshot_date in files:
        workbook = openpyxl.load_workbook(DOWNLOADS / filename, read_only=True, data_only=True)
        sheet = workbook.worksheets[0]
        rows = sheet.iter_rows(values_only=True)
        headers = next(rows)
        mapping = header_map(headers)
        for row in rows:
            posko_name = clean_text(value(row, mapping, "POS PENGUNGSIAN"))
            total = to_int(value(row, mapping, "TOTAL PENGUNSGSI"))
            if not posko_name or total <= 0:
                continue
            village = clean_text(value(row, mapping, "ASAL PENGUNGSI"))
            bayi = to_int(value(row, mapping, "BAYI PEREMPUAN")) + to_int(value(row, mapping, "BAYI LAKI-LAKI"))
            balita = to_int(value(row, mapping, "BALITA PEREMPUAN")) + to_int(value(row, mapping, "BALITA LAKI-LAKI"))
            lansia = to_int(value(row, mapping, "LANSIA PEREMPUAN")) + to_int(value(row, mapping, "LANSIA LAKI-LAKI"))
            disabilitas = to_int(value(row, mapping, "DISABILITAS PEREMPUAN")) + to_int(value(row, mapping, "DISABILITAS LAKI-LAKI"))
            snap = base_snapshot("gunung_ibu", snapshot_date)
            snap.update(
                {
                    "province": "Maluku Utara",
                    "city": "Kab. Halmahera Barat",
                    "district": "Ibu",
                    "village": village.title(),
                    "posko_id": stable_id("POSKO", KIB_BY_EVENT["gunung_ibu"], village, posko_name),
                    "posko_name": posko_name.title(),
                    "total_pengungsi": total,
                    "total_kk": to_int(value(row, mapping, "KK PENGUNGSI")),
                    "bayi": bayi,
                    "balita": balita,
                    "anak": max(round(total * 0.16), 0),
                    "remaja": max(round(total * 0.10), 0),
                    "lansia": lansia,
                    "ibu_hamil": to_int(value(row, mapping, "IBU HAMIL")),
                    "ibu_menyusui": to_int(value(row, mapping, "IBU MENYUSUI")),
                    "disabilitas": disabilitas,
                    "source_file": filename,
                }
            )
            snap["dewasa"] = max(total - int(snap["bayi"]) - int(snap["balita"]) - int(snap["anak"]) - int(snap["remaja"]) - int(snap["lansia"]), 0)
            snapshots.append(snap)
    return snapshots


def load_gunung_ruang() -> list[dict[str, object]]:
    path = DOWNLOADS / "data_pengungsi_gunung_ruang.csv"
    snapshots: list[dict[str, object]] = []
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            total = to_int(row.get("Jiwa Mengungsi"))
            village = clean_text(row.get("Nama Kampung")).title()
            if not village or total <= 0:
                continue
            snap = base_snapshot("gunung_ruang", date(2024, 4, 20))
            snap.update(
                {
                    "province": "Sulawesi Utara",
                    "city": "Kab. Kepulauan Siau Tagulandang Biaro",
                    "district": "Tagulandang",
                    "village": village,
                    "posko_id": stable_id("POSKO", KIB_BY_EVENT["gunung_ruang"], village),
                    "posko_name": f"Posko {village}",
                    "total_pengungsi": total,
                    "total_kk": to_int(row.get("Jml KK")),
                    "bayi": to_int(row.get("Bayi")),
                    "balita": to_int(row.get("Balita")),
                    "anak": to_int(row.get("Anak-anak")),
                    "remaja": to_int(row.get("Remaja")),
                    "dewasa": to_int(row.get("Dewasa")),
                    "lansia": to_int(row.get("Lansia")),
                    "ibu_hamil": to_int(row.get("Ibu Hamil")),
                    "ibu_menyusui": to_int(row.get("Ibu Menyusui")),
                    "disabilitas": to_int(row.get("Disabilitas")),
                    "source_file": path.name,
                }
            )
            snapshots.append(snap)
    return snapshots


def write_snapshot_sources(snapshots: list[dict[str, object]]) -> None:
    fields = list(snapshots[0].keys())
    with SOURCE_SNAPSHOT_CSV.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        writer.writerows(snapshots)


def nearest_snapshot(snapshots: list[dict[str, object]], current_day: date) -> dict[str, object]:
    return min(snapshots, key=lambda row: abs((date.fromisoformat(str(row["snapshot_date"])) - current_day).days))


def event_phase_multiplier(event: str, day_idx: int) -> float:
    if event == "lewotobi":
        return 1.30 if day_idx < 6 else 1.08 if day_idx < 24 else 0.92
    if event == "gunung_ibu":
        return 1.22 if day_idx < 5 else 1.02 if day_idx < 18 else 0.90
    return 1.35 if day_idx < 8 else 1.10 if day_idx < 22 else 0.88


def target_need(item_name: str, total: int, bayi: int, balita: int, lansia: int, ibu_hamil: int, ibu_menyusui: int, disabilitas: int, base_rate: float, vuln_rate: float) -> float:
    vulnerable = bayi + balita + lansia + ibu_hamil + ibu_menyusui + disabilitas
    if item_name == "popok_bayi":
        return max((bayi + balita) * vuln_rate, 0.0)
    return max(total * base_rate + vulnerable * vuln_rate, 0.0)


def build_canonical_rows(snapshots: list[dict[str, object]], days: int = 45) -> list[dict[str, object]]:
    rng = random.Random(20260514)
    by_posko: dict[str, list[dict[str, object]]] = {}
    for snapshot in snapshots:
        by_posko.setdefault(str(snapshot["posko_id"]), []).append(snapshot)

    rows: list[dict[str, object]] = []
    for posko_id, posko_snapshots in by_posko.items():
        posko_snapshots.sort(key=lambda row: str(row["snapshot_date"]))
        start_day = date.fromisoformat(str(posko_snapshots[0]["snapshot_date"]))
        event = str(posko_snapshots[0]["event"])
        stock_state = {item_name: 0.0 for _, item_name, _, _, _ in VOLCANO_ITEMS}

        for day_idx in range(days):
            current_day = start_day + timedelta(days=day_idx)
            snap = nearest_snapshot(posko_snapshots, current_day)
            phase = event_phase_multiplier(event, day_idx)
            ash_factor = 1.35 if day_idx in {0, 1, 2, 8, 9, 20} else 1.0
            weekly = 1.0 + 0.06 * ((day_idx % 7) in {0, 1}) - 0.03 * ((day_idx % 7) in {5, 6})

            for category, item_name, unit, base_rate, vuln_rate in VOLCANO_ITEMS:
                total = int(snap["total_pengungsi"])
                need = target_need(
                    item_name,
                    total,
                    int(snap["bayi"]),
                    int(snap["balita"]),
                    int(snap["lansia"]),
                    int(snap["ibu_hamil"]),
                    int(snap["ibu_menyusui"]),
                    int(snap["disabilitas"]),
                    base_rate,
                    vuln_rate,
                )
                if item_name in {"masker", "obat_ispa"}:
                    need *= ash_factor
                need *= phase * weekly * rng.uniform(0.92, 1.10)
                requested = need * rng.uniform(0.96, 1.18)
                if stock_state[item_name] < need * 1.6 or day_idx % 5 == 0:
                    stock_in = need * rng.uniform(2.2, 4.8)
                else:
                    stock_in = 0.0
                distributed = min(requested * rng.uniform(0.82, 1.05), stock_state[item_name] + stock_in)
                stock_state[item_name] = max(stock_state[item_name] + stock_in - distributed, 0.0)

                row = {column: "" for column in CANONICAL_COLUMNS}
                row.update(
                    {
                        "date": current_day.isoformat(),
                        "kib_bencana_id": snap["kib_bencana_id"],
                        "disaster_type": "gunung_meletus",
                        "province": snap["province"],
                        "city": snap["city"],
                        "district": snap["district"],
                        "village": snap["village"],
                        "posko_id": posko_id,
                        "posko_name": snap["posko_name"],
                        "item_category": category,
                        "item_name": item_name,
                        "unit": unit,
                        "total_pengungsi": snap["total_pengungsi"],
                        "total_kk": snap["total_kk"],
                        "bayi": snap["bayi"],
                        "balita": snap["balita"],
                        "anak": snap["anak"],
                        "remaja": snap["remaja"],
                        "dewasa": snap["dewasa"],
                        "lansia": snap["lansia"],
                        "ibu_hamil": snap["ibu_hamil"],
                        "ibu_menyusui": snap["ibu_menyusui"],
                        "disabilitas": snap["disabilitas"],
                        "stock_in_qty": round(stock_in, 2),
                        "distributed_qty": round(distributed, 2),
                        "requested_qty": round(requested, 2),
                        "current_stock_qty": round(stock_state[item_name], 2),
                        "target_need_qty": round(need, 2),
                        "critical_stock_threshold": round(max(need * 1.8, 1.0), 2),
                        "source_dataset": f"Gunung-Meletus/{snap['source_file']}",
                    }
                )
                rows.append(row)
    return rows


def write_canonical(rows: list[dict[str, object]]) -> None:
    with CANONICAL_CSV.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=CANONICAL_COLUMNS)
        writer.writeheader()
        for row in sorted(rows, key=lambda item: (item["date"], item["kib_bencana_id"], item["posko_id"], item["item_name"])):
            writer.writerow({column: row.get(column, "") for column in CANONICAL_COLUMNS})


def main() -> int:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    snapshots = load_lewotobi() + load_gunung_ibu() + load_gunung_ruang()
    write_snapshot_sources(snapshots)
    rows = build_canonical_rows(snapshots)
    write_canonical(rows)
    poskos = {row["posko_id"] for row in rows}
    events = {row["kib_bencana_id"] for row in rows}
    print(
        {
            "snapshot_rows": len(snapshots),
            "canonical_rows": len(rows),
            "events": len(events),
            "poskos": len(poskos),
            "output": str(CANONICAL_CSV.relative_to(ROOT)),
        }
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
