#!/usr/bin/env python3
"""
Railway: /app/.source 볼륨이 비어 있으면 빌드 단계에서 둔 .source_seed 를 복사한 뒤 gunicorn 기동.
(볼륨이 이미지의 .source 를 가리므로 런타임에 시드 경로는 반드시 마운트 밖이어야 함.)
"""
import os
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SEED = ROOT / ".source_seed"
TARGET = ROOT / ".source"
MARKER = TARGET / "Lotto645.xlsx"


def _seed_if_needed():
    if MARKER.is_file():
        return
    seed_xlsx = SEED / "Lotto645.xlsx"
    if not seed_xlsx.is_file():
        return
    print("[railway_start] Seeding .source from .source_seed (empty or missing Lotto645.xlsx)", flush=True)
    TARGET.mkdir(parents=True, exist_ok=True)
    for item in SEED.iterdir():
        if item.name.startswith("."):
            continue
        dest = TARGET / item.name
        if item.is_dir():
            shutil.copytree(item, dest, dirs_exist_ok=True)
        else:
            shutil.copy2(item, dest)


def main():
    _seed_if_needed()
    port = os.environ.get("PORT", "5000")
    args = [
        "gunicorn",
        "server:app",
        "--bind",
        f"0.0.0.0:{port}",
        "--timeout",
        "120",
        "--graceful-timeout",
        "30",
    ]
    os.execvp("gunicorn", args)


if __name__ == "__main__":
    main()
