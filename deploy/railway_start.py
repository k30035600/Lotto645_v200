#!/usr/bin/env python3
"""gunicorn 기동 전 시드. server.py 임포트 시에도 동일 모듈이 호출됨."""
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from utils.railway_source_seed import ensure_dot_source_seeded


def main():
    ensure_dot_source_seeded(ROOT)
    port = os.environ.get("PORT", "5000")
    os.execvp(
        "gunicorn",
        [
            "gunicorn",
            "server:app",
            "--bind",
            f"0.0.0.0:{port}",
            "--timeout",
            "120",
            "--graceful-timeout",
            "30",
        ],
    )


if __name__ == "__main__":
    main()
