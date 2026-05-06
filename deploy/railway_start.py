#!/usr/bin/env python3
"""gunicorn 기동 전 시드. 실패해도 기동은 계속(서버 import 시 한 번 더 시도)."""
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from utils.railway_source_seed import ensure_dot_source_seeded


def main():
    try:
        ensure_dot_source_seeded(ROOT)
    except Exception as exc:
        print(f"[railway_start] seed skipped: {exc}", flush=True)

    port = os.environ.get("PORT", "5000")
    os.execvp(
        sys.executable,
        [
            sys.executable,
            "-m",
            "gunicorn",
            "server:app",
            "--bind",
            f"0.0.0.0:{port}",
            "--workers",
            "1",
            "--timeout",
            "120",
            "--graceful-timeout",
            "30",
        ],
    )


if __name__ == "__main__":
    main()
