"""로컬 .source 내용을 deploy/source_seed에 맞춰 복사합니다. Lotto645 데이터 갱신 후 커밋 전에 실행."""
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / ".source"
DST = ROOT / "deploy" / "source_seed"


def main():
    if not SRC.is_dir():
        raise SystemExit(f"missing: {SRC}")
    DST.mkdir(parents=True, exist_ok=True)
    for item in SRC.iterdir():
        if item.name.startswith("."):
            continue
        dest = DST / item.name
        if item.is_dir():
            if dest.exists():
                shutil.rmtree(dest)
            shutil.copytree(item, dest)
        else:
            shutil.copy2(item, dest)
    print(f"OK: {SRC} -> {DST}")


if __name__ == "__main__":
    main()
