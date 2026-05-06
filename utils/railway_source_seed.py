"""Railway 볼륨 등으로 .source 가 비었을 때 이미지 내 시드에서 채움."""
import logging
import shutil
from pathlib import Path
from typing import Optional

log = logging.getLogger(__name__)


def ensure_dot_source_seeded(base_dir: Path) -> None:
    base_dir = base_dir.resolve()
    target = base_dir / ".source"
    marker = target / "Lotto645.xlsx"
    if marker.is_file():
        return

    candidates = [
        base_dir / "deploy" / "source_seed",
        base_dir / ".source_seed",
    ]
    seed: Optional[Path] = None
    for d in candidates:
        if (d / "Lotto645.xlsx").is_file():
            seed = d
            break
    if seed is None:
        log.warning(
            "Lotto645.xlsx 시드 없음: deploy/source_seed 또는 .source_seed 를 확인하세요."
        )
        return

    log.info("Seeding .source from %s", seed.relative_to(base_dir))
    target.mkdir(parents=True, exist_ok=True)
    for item in seed.iterdir():
        if item.name.startswith("."):
            continue
        dest = target / item.name
        if item.is_dir():
            shutil.copytree(item, dest, dirs_exist_ok=True)
        else:
            shutil.copy2(item, dest)
