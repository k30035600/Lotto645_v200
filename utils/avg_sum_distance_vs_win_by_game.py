#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Lotto023 저장 번호 vs 해당 회차 Lotto645 당첨 6개 합(당첨합)의 거리 |게임합 - 당첨합| 을
'게임' 열(1~5 등)별로 집계·평균.

사용:
  python utils/avg_sum_distance_vs_win_by_game.py

데이터:
  .source/Lotto645.json (또는 동일 형식)
  .source/Lotto023.xlsx
"""

from __future__ import annotations

import io
import json
import sys
from collections import defaultdict
from pathlib import Path

# Windows 콘솔 UTF-8
if sys.stdout.encoding and sys.stdout.encoding.lower() not in ('utf-8', 'utf8'):
    try:
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    except Exception:
        pass

BASE_DIR = Path(__file__).resolve().parent.parent
SOURCE = BASE_DIR / '.source'
PATH_645 = SOURCE / 'Lotto645.json'
PATH_023 = SOURCE / 'Lotto023.xlsx'


def _six_ints_from_645_row(item: dict) -> list[int] | None:
    nums = []
    for i in range(1, 7):
        k = f'번호{i}'
        if k not in item or item[k] is None or str(item[k]).strip() == '':
            return None
        try:
            nums.append(int(item[k]))
        except (ValueError, TypeError):
            return None
    if len(set(nums)) != 6 or any(n < 1 or n > 45 for n in nums):
        return None
    return nums


def load_win_sum_by_round(path: Path) -> dict[int, int]:
    if not path.is_file():
        raise FileNotFoundError(f'Lotto645 없음: {path}')
    with open(path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    out: dict[int, int] = {}
    for item in data:
        if not isinstance(item, dict):
            continue
        try:
            r = int(item.get('회차'))
        except (TypeError, ValueError):
            continue
        nums = _six_ints_from_645_row(item)
        if nums:
            out[r] = sum(nums)
    return out


def pick_sum_from_023_row(headers: list[str], row: tuple) -> tuple[int | None, int | None]:
    """(회차, |게임합-당첨합|에 쓸 pick_sum) — 유효하지 않으면 (None, None)."""
    d = {}
    for i, h in enumerate(headers):
        if h:
            d[h] = row[i] if i < len(row) else None
    try:
        r = int(d.get('회차'))
    except (TypeError, ValueError):
        return None, None
    try:
        g = int(d.get('게임'))
    except (TypeError, ValueError):
        return None, None
    if g < 1:
        return None, None

    raw_sum = d.get('선택합계')
    pick_sum = None
    if raw_sum is not None and str(raw_sum).strip() != '':
        try:
            pick_sum = int(str(raw_sum).strip())
        except (ValueError, TypeError):
            pick_sum = None
    if pick_sum is None:
        picks = []
        for j in range(1, 7):
            v = d.get(f'선택{j}')
            if v is None or str(v).strip() == '':
                return None, None
            try:
                picks.append(int(str(v).strip()))
            except (ValueError, TypeError):
                return None, None
        if len(set(picks)) != 6 or any(n < 1 or n > 45 for n in picks):
            return None, None
        pick_sum = sum(picks)
    return r, pick_sum


def main() -> int:
    try:
        import openpyxl
    except ImportError:
        print('openpyxl 필요: pip install openpyxl')
        return 1

    if not PATH_023.is_file():
        print(f'Lotto023 없음: {PATH_023}')
        return 1

    win_sum = load_win_sum_by_round(PATH_645)
    if not win_sum:
        print('Lotto645에서 당첨 6개 합을 읽지 못했습니다.')
        return 1

    wb = openpyxl.load_workbook(PATH_023, read_only=True, data_only=True)
    ws = wb.active
    rows = list(ws.iter_rows(values_only=True))
    wb.close()
    if len(rows) < 2:
        print('Lotto023 시트에 데이터가 없습니다.')
        return 1

    headers = [str(h).strip() if h is not None else '' for h in rows[0]]
    if '회차' not in headers or '게임' not in headers:
        print('Lotto023 헤더에 회차·게임이 필요합니다.')
        return 1

    # 게임 슬롯 g -> 거리 목록
    dist_by_game: dict[int, list[int]] = defaultdict(list)
    all_dist: list[int] = []
    skipped_no_win = 0
    skipped_bad_row = 0
    rounds_seen: set[int] = set()

    for row in rows[1:]:
        r, pick_sum = pick_sum_from_023_row(headers, row)
        if r is None:
            skipped_bad_row += 1
            continue
        wsum = win_sum.get(r)
        if wsum is None:
            skipped_no_win += 1
            continue
        try:
            g = int(row[headers.index('게임')])
        except (ValueError, TypeError, IndexError):
            skipped_bad_row += 1
            continue
        if g < 1:
            skipped_bad_row += 1
            continue
        d0 = abs(pick_sum - wsum)
        dist_by_game[g].append(d0)
        all_dist.append(d0)
        rounds_seen.add(r)

    print('=== 저장합 vs 당첨합 거리 |게임합 - 당첨합| (Lotto023 × Lotto645) ===\n')
    print(f'Lotto645 회차 수(당첨합 있음): {len(win_sum)}')
    print(f'분석에 사용한 저장 행 수: {len(all_dist)}')
    print(f'포함된 서로 다른 회차 수: {len(rounds_seen)}')
    print(f'건너뜀(해당 회차 당첨 없음): {skipped_no_win}')
    print(f'건너뜀(회차·게임·번호·합 불완): {skipped_bad_row}\n')

    if not all_dist:
        print('집계할 유효 행이 없습니다.')
        return 0

    def avg(xs: list[int]) -> float:
        return sum(xs) / len(xs)

    print('--- 게임 열(슬롯)별 평균 거리 ---')
    for g in sorted(dist_by_game.keys()):
        xs = dist_by_game[g]
        print(f'  게임 {g}: n={len(xs):5d}  평균={avg(xs):.2f}  최소={min(xs)}  최대={max(xs)}')
    print(f'\n전체(모든 슬롯 합침): n={len(all_dist):5d}  평균={avg(all_dist):.2f}  최소={min(all_dist)}  최대={max(all_dist)}')
    print('\n※ 해석: 평균이 클수록 그 슬롯 저장합이 당첨합에서 더 멀리 떨어진 경우가 많다는 뜻입니다.')
    print('※ 여러 세트가 있으면 같은 "게임" 번호는 세트와 무관하게 한 그룹으로 묶입니다.')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
