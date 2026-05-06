#!/usr/bin/env python3
"""
Railway: /app/.source 볼륨이 비었으면 이미지에 포함된 시드를 복사한 뒤 gunicorn 기동.

시드 경로(우선순위):
  1) deploy/source_seed — 저장소에 포함(점(.) 없음, 빌드에서 누락되기 어려움)
  2) .source_seed — Nixpacks 빌드 단계에서 .source 복사 산출물

.source 갱신 후에는 deploy/sync_seed_from_dot_source.py 를 실행해 source_seed를 맞춘 뒤 커밋하세요.
"""
import os
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TARGET = ROOT / ".source"
MARKER = TARGET / "Lotto645.xlsx"


def _resolve_seed_dir():
    candidates = [
        ROOT / "deploy" / "source_seed",
        ROOT / ".source_seed",
    ]
    for d in candidates:
        if (d / "Lotto645.xlsx").is_file():
            return d
    return None


def _seed_if_needed():
    if MARKER.is_file():
        return
    seed = _resolve_seed_dir()
    if seed is None:
        print(
            "[railway_start] No seed: add deploy/source_seed (run deploy/sync_seed_from_dot_source.py) "
            "or fix Nixpacks .source_seed build.",
            flush=True,
        )
        return
    print(f"[railway_start] Seeding .source from {seed.relative_to(ROOT)}", flush=True)
    TARGET.mkdir(parents=True, exist_ok=True)
    for item in seed.iterdir():
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
