#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Lotto645 당첨 6개 번호의 합(회차별)에 대해,
회차 오름차순으로 **바로 이웃한 두 회차**끼리의 합 차이 절댓값을 구한 뒤 전체 평균.

예) 정렬 후 합이 [172, 142, 125, ...] 이면
    |142-172|=30, |125-142|=17, ... 의 평균.

데이터: .source/Lotto645.json

사용:
  python utils/avg_consecutive_round_win_sum_abs_diff.py
"""

from __future__ import annotations

import io
import json
import sys
from pathlib import Path

if sys.stdout.encoding and sys.stdout.encoding.lower() not in ('utf-8', 'utf8'):
    try:
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    except Exception:
        pass

BASE_DIR = Path(__file__).resolve().parent.parent
PATH_645 = BASE_DIR / '.source' / 'Lotto645.json'


def six_sum_from_row(item: dict) -> tuple[int, int] | None:
    """(회차, 당첨6합) 또는 None."""
    try:
        r = int(item.get('회차'))
    except (TypeError, ValueError):
        return None
    nums = []
    for i in range(1, 7):
        k = f'번호{i}'
        if k not in item or item[k] is None or str(item[k]).strip() == '':
            return None
        try:
            n = int(item[k])
        except (ValueError, TypeError):
            return None
        nums.append(n)
    if len(set(nums)) != 6 or any(n < 1 or n > 45 for n in nums):
        return None
    return r, sum(nums)


def main() -> int:
    if not PATH_645.is_file():
        print(f'파일 없음: {PATH_645}')
        return 1

    with open(PATH_645, 'r', encoding='utf-8') as f:
        data = json.load(f)

    pairs: list[tuple[int, int]] = []
    for item in data:
        if not isinstance(item, dict):
            continue
        t = six_sum_from_row(item)
        if t:
            pairs.append(t)

    pairs.sort(key=lambda x: x[0])
    if len(pairs) < 2:
        print('회차가 2개 미만이라 인접 차이를 계산할 수 없습니다.')
        return 1

    diffs: list[int] = []
    round_gaps: list[int] = []
    for i in range(len(pairs) - 1):
        r0, s0 = pairs[i]
        r1, s1 = pairs[i + 1]
        diffs.append(abs(s1 - s0))
        round_gaps.append(r1 - r0)

    n = len(diffs)
    mean_diff = sum(diffs) / n
    print('=== Lotto645: 인접 회차(데이터 순) 당첨6합 절대차 평균 ===\n')
    print(f'유효 회차 행 수: {len(pairs)}')
    print(f'회차 범위: {pairs[0][0]}회 ~ {pairs[-1][0]}회')
    print(f'인접 쌍 개수: {n}')
    print(f'|다음회 합 - 이전회 합| 의 평균: {mean_diff:.4f}')
    print(f'최소 절대차: {min(diffs)}  최대 절대차: {max(diffs)}')

    non_consecutive = sum(1 for g in round_gaps if g != 1)
    if non_consecutive:
        print(f'\n※ 회차 번호가 1씩 증가하지 않는 쌍: {non_consecutive}개 (중간 회차 누락 등).')
        print('  위 평균은 "데이터에서 바로 다음에 오는 회차"와의 차이입니다.')
    else:
        print('\n※ 모든 인접 쌍이 회차 번호도 연속(차이 1)입니다.')

    # 참고: 회차 번호가 정확히 연속인 쌍만 따로
    strict = [d for d, g in zip(diffs, round_gaps) if g == 1]
    if strict and len(strict) != len(diffs):
        m2 = sum(strict) / len(strict)
        print(f'회차번호 연속( n+1 )인 쌍만 평균: {m2:.4f} (n={len(strict)})')

    return 0


if __name__ == '__main__':
    raise SystemExit(main())
