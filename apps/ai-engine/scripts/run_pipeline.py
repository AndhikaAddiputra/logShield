from __future__ import annotations

import json
import subprocess
import sys
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
SCRIPT_DIR = Path(__file__).resolve().parent
SUMMARY_PATH = ROOT / "data" / "pipeline_summary.json"

STEPS = [
    ("volcano_dataset", "prepare_gunung_meletus_data.py", ROOT / "dataset" / "Gunung-Meletus" / "logshield_gunung_meletus.csv"),
    ("prepare_data", "prepare_data.py", None),
    ("validate_data", "validate_data.py", None),
    ("forecasting", "train_baseline.py", None),
    ("recommendations", "build_recommendations.py", None),
    ("anomalies", "detect_anomalies.py", None),
    ("artifact_smoke_test", "smoke_test_artifacts.py", None),
]

def run_step(name: str, script_name: str, existing_artifact: Path | None = None) -> dict[str, object]:
    if existing_artifact and existing_artifact.exists():
        result = {
            "name": name,
            "script": script_name,
            "returncode": 0,
            "duration_seconds": 0.0,
            "stdout_tail": [f"Skipped; existing artifact found: {existing_artifact.relative_to(ROOT)}"],
            "stderr_tail": [],
            "skipped": True,
        }
        print(f"[{name}] skipped existing_artifact={existing_artifact.relative_to(ROOT)}")
        return result

    started = datetime.now()
    completed = subprocess.run(
        [sys.executable, str(SCRIPT_DIR / script_name)],
        cwd=ROOT,
        capture_output=True,
        text=True,
    )
    ended = datetime.now()
    result = {
        "name": name,
        "script": script_name,
        "returncode": completed.returncode,
        "duration_seconds": round((ended - started).total_seconds(), 2),
        "stdout_tail": completed.stdout.strip().splitlines()[-20:],
        "stderr_tail": completed.stderr.strip().splitlines()[-20:],
    }
    print(f"[{name}] returncode={completed.returncode} duration={result['duration_seconds']}s")
    if completed.stdout.strip():
        print(completed.stdout.strip())
    if completed.stderr.strip():
        print(completed.stderr.strip(), file=sys.stderr)
    return result


def main() -> int:
    started_at = datetime.now().isoformat(timespec="seconds")
    results: list[dict[str, object]] = []
    status = "success"

    for name, script_name, existing_artifact in STEPS:
        result = run_step(name, script_name, existing_artifact)
        results.append(result)
        if result["returncode"] != 0:
            status = "failed"
            break

    summary = {
        "status": status,
        "started_at": started_at,
        "finished_at": datetime.now().isoformat(timespec="seconds"),
        "steps": results,
    }
    SUMMARY_PATH.write_text(json.dumps(summary, indent=2, ensure_ascii=False), encoding="utf-8")
    print(json.dumps({"status": status, "summary": str(SUMMARY_PATH.relative_to(ROOT))}, indent=2))
    return 0 if status == "success" else 1


if __name__ == "__main__":
    raise SystemExit(main())
