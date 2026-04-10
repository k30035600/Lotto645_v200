# ShareHarmony 팔레트 전수 조사 보고서

## 1. 정의된 팔레트 (:root, styles.css)

| 용도 | 변수명 | HEX | 비고 |
|------|--------|-----|------|
| **ShareHarmony 공식** | | | |
| Main Background | `--color-bg-white` | #FFFFFF | |
| Primary (Deep Navy) | `--panel-left-accent` | #2C3E50 | |
| Primary Muted | `--color-primary` | #3C4B5A | |
| Growth Accent (Emerald) | `--panel-mid-accent`, `--panel-right-accent` | #27AE60 | |
| Synergy (Yellow Green) | `--filter-box-border` | #A9DFBF | |
| Golden | `--color-golden` | #EBC658 | (주석: #F1C40F) |
| Body Text | `--color-text-primary` | #34495E | |
| **나눔과어울림 고유** | `--color-harmony-bg`, `--color-harmony-border` | #E8F2EC, #66B084 | |
| **동행복권(차분)** | `--lotto-yellow` ~ `--lotto-green` | #EBC658 등 | |

---

## 2. styles.css 내 하드코딩 색상 (팔레트 미반영)

| 라인 | 현재 값 | 권장 치환 | 비고 |
|------|---------|-----------|------|
| 143-144 | `rgba(44, 62, 80, 0.02)` | `rgba(44, 62, 80, 0.02)` 유지 또는 `--panel-left-accent` 기반 | 그리드 라인 |
| 178, 222 | `#FFFFFF` / `white` | `var(--color-bg-white)` | 헤더/푸터 텍스트 |
| 400 | `#808080` | `var(--input-border)` 또는 `var(--color-border)` | 입력 테두리 |
| 446 | `#c00` | `var(--color-error)` 신규 추가 후 사용 | .load-error |
| 516 | `#ffffff` | `var(--color-bg-white)` | |
| 520 | `#e0e0e0` | `var(--input-border)` | |
| 532, 554, 569, 597 | `#000000` | `var(--color-text-primary)` | 텍스트 |
| 570, 578 | `rgba(66, 133, 244, …)` | 팔레트 외(포커스 블루) — 유지 또는 `--input-focus` 계열 변수 추가 | |
| 576 | `#ffffff` | `var(--color-bg-white)` | |
| 616 | `#1a237e` | 팔레트 외(인디고) — 유지 또는 `--color-link` 추가 | |
| 777 | `#666` | `var(--color-text-secondary)` | .range-date-hint |
| 781 | `#aaa` | `var(--color-text-muted)` 신규 또는 `--color-text-secondary` | .range-sep |
| 865 | `#bdc3c7` | `var(--lotto-gray)` | .ball 기본 |
| 913 | `#ffecb3` | `var(--color-golden-light)` 신규 | 골든 그라데이션 끝 |
| 944 | `#f0f0f0` | `var(--color-border)` 또는 `--color-bg-lighter` | |
| 953 | `#f1f8f4` | `var(--dropdown-active)` 또는 `var(--panel-mid-box)` | 호버 배경 |
| 963 | `#8E8E8E` | `var(--color-text-secondary)` | .round-date-display |
| 972 | `#34495e` | `var(--color-primary)` | CTA 그라데이션 |
| 994 | `#2ecc71` | `var(--panel-mid-accent)` (비슷) | CTA 호버 |

---

## 3. app.js 내 하드코딩 색상

### 3.1 동행복권 공식 볼 색 (의도적 상이 가능)
- `#FBC400`, `#69C8F2`, `#FF7272`, `#AAAAAA`, `#B0D840` — CSS의 `--lotto-*`(차분 버전)와 다름.  
  **권장:** 유지하되, 한 곳에서 상수로 관리하고 필요 시 `--lotto-*`와 매핑 옵션 검토.

### 3.2 팔레트로 통일 권장
| 용도 | 현재 값 | 권장 |
|------|---------|------|
| 비매칭 볼 배경 | `#2C3E50` | Deep Navy → `--panel-left-accent`와 동일, JS 상수로 정의 후 사용 |
| 흰/검정 텍스트 | `#ffffff`, `#000000` | 공통 상수(예: palette.white, palette.textPrimary) |
| 플러스 기호 | `#ffd54f` | `--color-golden` 계열 상수 |
| 합계 강조 | `#ff0000` | `--lotto-red` 또는 `--color-accent` 계열 |
| 퍼센트/보조 텍스트 | `#666`, `#999`, `#ccc` | `--color-text-secondary` / muted 상수 |
| 선택 테두리 | `#0066ff` | 링크/선택용 변수 추가 검토 |
| 티켓/버튼 골드 | `#FFD700`, `#d4af37`, `#b8860b` | `--color-golden` 계열 상수 |
| 복사 버튼 그라데이션 | `#34a853`, `#2d8a46` | `--panel-mid-accent` 계열 |
| 삭제 버튼 | `#ff9800` | `--ai-color` 계열 |

---

## 4. index.html 인라인 스타일

| 위치 | 현재 | 권장 |
|------|------|------|
| 헤더 로고 그라데이션 | `#2ecc71` | `var(--color-accent)` 또는 `var(--panel-mid-accent)` |
| 제목/링크 흰색 | `#ffffff`, `white`, `rgba(255,255,255,0.7)` | `var(--color-bg-white)` / 투명도만 인라인 |
| AI 버블 테두리/강조 | `#FFD700`, `#FBBC05`, `#D4961A` | `var(--color-golden)` 계열 |
| AI 입력 영역 | `#f8f9fa`, `#eee`, `#ddd`, `#333`, `#999`, `#ccc` | `var(--color-body)`, `var(--color-border)`, `var(--color-text-primary)` 등 |
| 전송 버튼 | `var(--color-accent)` | ✅ 이미 반영 |

---

## 5. 요약 및 권장 조치

### 반영 잘 된 부분
- 패널 제목/배경: `--color-harmony-bg`, `--color-harmony-border`
- 헤더/푸터: `--color-primary`, `--color-accent`
- 패널 좌/중/우: `--panel-*-accent`, `--panel-*-border`, `--panel-*-box`
- 통계 리스트/정렬/입력: `--panel-left-*`, `--input-*`
- 당첨공/히스토리: `--panel-right-*`
- 볼 클래스: `.ball-yellow` 등 CSS에서 `var(--lotto-*)` 사용

### 보완 권장
1. **:root에 추가:** `--color-error`, `--color-text-muted`, `--color-golden-light` (필요 시)
2. **styles.css:** 위 표 기준으로 하드코딩 HEX → `var(...)` 치환
3. **app.js:** 색상 상수 객체 도입(팔레트 HEX 매핑), 인라인 색상 치환
4. **index.html:** 인라인 색상을 가능한 한 `var(--...)` 로 교체

이 보고서는 Lotto_v200 프로젝트 루트의 `styles.css`, `app.js`, `index.html` 기준으로 작성됨.

---

## 6. 조치 완료 사항 (전수 조사 후 반영)

- **:root 추가:** `--color-golden-light`, `--color-text-muted`, `--color-error`
- **styles.css 치환:** `#FFFFFF`/`#ffffff` → `var(--color-bg-white)`, `#000000` → `var(--color-text-primary)`, `#c00` → `var(--color-error)`, `#808080` → `var(--input-border)`, `#666`/`#aaa` → `var(--color-text-secondary)`/`var(--color-text-muted)`, `#bdc3c7` → `var(--lotto-gray)`, `#ffecb3` → `var(--color-golden-light)`, `#f0f0f0`/`#f1f8f4`/`#8E8E8E` → 팔레트 변수, CTA 그라데이션 `#34495e`/`#2ecc71` → `var(--color-border-dark)`/`var(--panel-mid-accent)`, `.stat-ball.saved-white` 및 기타 흰/검정/회색 → 변수 사용
- **app.js:** 동행볼(번호별 5색·등수 배지·차트 막대·티켓 캔버스 공 색)은 제외하고, `SHAREHARMONY_PALETTE` 상수 도입 후 나머지 UI 색상(텍스트·테두리·버튼·에러·골드·요약 등)을 팔레트로 치환 완료.
- **index.html:** 인라인 색상은 필요 시 `var(--...)` 또는 JS 팔레트 참조로 추가 치환 가능.
