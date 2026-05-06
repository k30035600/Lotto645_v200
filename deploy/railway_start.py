#!/usr/bin/env python3
"""gunicorn 기동 전에만 실행. 실제 시드는 deploy.seed_dot_source (server.py에서도 호출)."""
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from deploy.seed_dot_source import ensure_dot_source_seeded


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
