# 로또 애플리케이션 모듈 통합 가이드

## 📚 목차

1. [모듈 개요](#모듈-개요)
2. [사용 방법](#사용-방법)
3. [API 레퍼런스](#api-레퍼런스)
4. [예제 코드](#예제-코드)
5. [마이그레이션 가이드](#마이그레이션-가이드)

---

## 모듈 개요

### 전체 구조

```
modules/
├── utils/              # 유틸리티 모듈
│   ├── dom.js         # DOM 캐싱 (4개 함수)
│   ├── cache.js       # 캐시 관리 (6개 함수)
│   ├── errorHandler.js # 에러 핸들링 (4개 함수)
│   └── uiHelper.js    # UI 헬퍼 (10개 함수)
├── state.js           # 상태 관리 (3개 함수)
├── statistics.js      # 통계 계산 (8개 함수)
├── generator.js       # 번호 생성 (10개 함수)
├── dataLoader.js      # 데이터 로더 (11개 함수)
└── filters.js         # 필터 (13개 함수)

총 9개 모듈, 69개 함수
```

---

## 사용 방법

### 1. 기본 설정

**index.html에 모듈 로드:**

```html
<!-- 유틸리티 모듈 -->
<script src="modules/utils/dom.js"></script>
<script src="modules/utils/cache.js"></script>
<script src="modules/utils/errorHandler.js"></script>
<script src="modules/utils/uiHelper.js"></script>

<!-- 핵심 모듈 -->
<script src="modules/state.js"></script>
<script src="modules/statistics.js"></script>
<script src="modules/generator.js"></script>
<script src="modules/dataLoader.js"></script>
<script src="modules/filters.js"></script>

<!-- 메인 애플리케이션 -->
<script src="app.js"></script>
```

---

## API 레퍼런스

### 📦 utils/dom.js - DOM 캐싱

#### `DOM.get(id)`

ID로 요소 가져오기 (캐싱)

```javascript
const button = DOM.get('saveBtn');
const input = DOM.get('roundInput');
```

#### `DOM.getMultiple(ids)`

여러 요소 한번에 가져오기

```javascript
const elements = DOM.getMultiple(['btn1', 'btn2', 'input1']);
// { btn1: HTMLElement, btn2: HTMLElement, input1: HTMLElement }
```

#### `DOM.invalidate(id)`

캐시 무효화

```javascript
DOM.invalidate('dynamicElement');  // 특정 요소
DOM.invalidate();                   // 전체 캐시
```

---

### 📦 utils/cache.js - 캐시 관리

#### `CacheManager.get(key)`

캐시 값 가져오기

```javascript
const stats = CacheManager.get('avgCount');
```

#### `CacheManager.set(key, value)`

캐시 값 설정

```javascript
CacheManager.set('avgCount', 15.5);
```

#### `CacheManager.invalidate(key)`

캐시 무효화

```javascript
CacheManager.invalidate('avgCount');  // 특정 키
CacheManager.invalidate();            // 전체
```

#### `CacheManager.onDataChange()`

데이터 변경 시 호출

```javascript
// 로또 데이터 업데이트 후
CacheManager.onDataChange();
```

---

### 📦 utils/errorHandler.js - 에러 핸들링

#### `safeExecute(fn, fallback, context)`

안전한 함수 실행

```javascript
const result = safeExecute(
    () => riskyOperation(),
    defaultValue,
    'riskyOperation'
);
```

#### `safeExecuteAsync(fn, fallback, context)`

안전한 비동기 함수 실행

```javascript
const data = await safeExecuteAsync(
    async () => await fetchData(),
    [],
    'fetchData'
);
```

#### `showErrorNotification(message)`

에러 알림 표시

```javascript
showErrorNotification('데이터 로드 실패');
```

---

### 📦 utils/uiHelper.js - UI 헬퍼

#### `createElement(tag, options)`

요소 생성

```javascript
const button = createElement('button', {
    className: 'primary-btn',
    text: '생성',
    events: {
        click: () => handleClick()
    },
    styles: {
        padding: '10px 20px'
    }
});
```

#### `createBallElement(number, options)`

번호 볼 생성

```javascript
const ball = createBallElement(7, {
    selected: true,
    onClick: (num) => console.log(num)
});
```

#### `showToast(message, type, duration)`

토스트 알림

```javascript
showToast('저장 완료!', 'success', 3000);
showToast('오류 발생', 'error', 5000);
```

#### `toggleLoadingSpinner(show, message)`

로딩 스피너

```javascript
toggleLoadingSpinner(true, '데이터 로딩 중...');
// ... 작업 수행
toggleLoadingSpinner(false);
```

---

### 📦 state.js - 상태 관리

#### `AppState`

전역 상태 객체

```javascript
// 상태 접근
AppState.currentSets
AppState.allLotto645Data
AppState.activeFilters

// 상태 초기화
AppState.reset();

// 캐시 무효화
AppState.invalidateCache();

// 디버깅용 스냅샷
console.log(AppState.snapshot());
```

---

### 📦 statistics.js - 통계 계산

#### `calculateWinStats(lottoData, maxNumber)`

당첨 횟수 계산 (보너스 제외)

```javascript
const winStats = calculateWinStats(data, 45);
// Map { 1 => 150, 2 => 145, ... }
```

#### `calculateAppearanceStats(lottoData, maxNumber)`

출현 횟수 계산 (보너스 포함)

```javascript
const appearanceStats = calculateAppearanceStats(data, 45);
```

#### `initializeStatistics(lottoData, maxNumber)`

통합 통계 초기화

```javascript
const stats = initializeStatistics(data, 45);
/*
{
    winStatsMap: Map,
    appearanceStatsMap: Map,
    winPercentageMap: Map,
    appearancePercentageMap: Map,
    hotCold: { hot: [...], cold: [...] },
    oddEven: { odd: 52.3, even: 47.7 },
    consecutive: { hasConsecutive: 850, noConsecutive: 350, percentage: 70.8 },
    sumRange: { min: 21, max: 255, avg: 138 },
    totalRounds: 1200
}
*/
```

---

### 📦 generator.js - 번호 생성

#### `generateLottoNumbers(options)`

로또 번호 생성

```javascript
const numbers = generateLottoNumbers({
    count: 6,
    minNumber: 1,
    maxNumber: 45,
    preferredNumbers: [7, 13],
    exclude: [26, 39],
    constraints: {
        sequence: 'none',
        oddEvenRatio: { odd: 3, even: 3 },
        minSum: 100,
        maxSum: 150
    },
    maxAttempts: 1000
});
// [7, 13, 18, 25, 32, 41]
```

#### `generateMultipleSets(setCount, options)`

여러 세트 생성

```javascript
const sets = generateMultipleSets(5, {
    preferredNumbers: [7],
    constraints: {
        oddEvenRatio: { odd: 3, even: 3 }
    }
});
// [[7, 12, 18, 23, 35, 41], [...], ...]
```

---

### 📦 dataLoader.js - 데이터 로더

#### `loadLotto645Data(basePath)`

Lotto645 데이터 로드

```javascript
const data = await loadLotto645Data('');
// 3단계 전략: 캐시 → JSON → XLSX
```

#### `loadLotto023Data(basePath)`

Lotto023 데이터 로드

```javascript
const data = await loadLotto023Data('');
```

#### `invalidateCache(key)`

캐시 무효화

```javascript
invalidateCache(CACHE_KEYS.LOTTO645);  // 특정 캐시
invalidateCache();                      // 전체 캐시
```

---

### 📦 filters.js - 필터

#### `applyMultipleFilters(numbers, filters)`

복합 필터 적용

```javascript
const filtered = applyMultipleFilters(numbers, {
    minNumber: 1,
    maxNumber: 45,
    exclude: [13, 26],
    oddEven: 'balanced',
    hotCold: 'hot',
    hotNumbers: [1, 2, 3, 7, 10],
    coldNumbers: [40, 41, 42, 43, 44, 45],
    stat: 'count-desc',
    statsMap: winStatsMap,
    threshold: 0.5
});
```

#### `createFilterState()`

필터 상태 생성

```javascript
const filters = createFilterState();
// { statFilter: 'none', sequence: 'none', oddEven: 'none', hotCold: 'none' }
```

#### `updateFilterState(currentState, filterType, filterValue)`

필터 상태 업데이트

```javascript
const newState = updateFilterState(filters, 'oddEven', 'balanced');
```

---

## 예제 코드

### 예제 1: 기본 번호 생성

```javascript
// 1. 데이터 로드
const data = await loadLotto645Data('');

// 2. 통계 계산
const stats = initializeStatistics(data, 45);

// 3. 번호 생성
const numbers = generateLottoNumbers({
    count: 6,
    constraints: {
        oddEvenRatio: { odd: 3, even: 3 }
    }
});

// 4. UI 업데이트
const ball = createBallElement(numbers[0], {
    selected: true
});
document.body.appendChild(ball);

// 5. 알림
showToast('번호 생성 완료!', 'success');
```

---

### 예제 2: 필터 적용 번호 생성

```javascript
// 1. 통계 기반 필터 적용
const filtered = applyMultipleFilters([...Array(45)].map((_, i) => i + 1), {
    oddEven: 'balanced',
    hotCold: 'hot',
    hotNumbers: stats.hotCold.hot,
    coldNumbers: stats.hotCold.cold,
    stat: 'count-desc',
    statsMap: stats.winStatsMap,
    threshold: 0.5
});

// 2. 필터링된 풀에서 번호 생성
const numbers = generateLottoNumbers({
    pool: filtered,
    count: 6,
    preferredNumbers: [7]
});
```

---

### 예제 3: 에러 처리

```javascript
// 안전한 데이터 로드
const data = await safeExecuteAsync(
    async () => await loadLotto645Data(''),
    [],  // fallback
    'loadLotto645Data'
);

if (data.length === 0) {
    showErrorNotification('데이터 로드 실패');
    return;
}

// 안전한 통계 계산
const stats = safeExecute(
    () => initializeStatistics(data, 45),
    null,
    'initializeStatistics'
);
```

---

### 예제 4: 캐시 활용

```javascript
// 캐시 확인
if (!CacheManager.has('winStats')) {
    // 캐시 없으면 계산
    const stats = calculateWinStats(data, 45);
    CacheManager.set('winStats', stats);
}

// 캐시에서 가져오기
const winStats = CacheManager.get('winStats');

// 데이터 변경 시 캐시 무효화
function updateData(newData) {
    AppState.allLotto645Data = newData;
    CacheManager.onDataChange();  // 모든 캐시 무효화
}
```

---

## 마이그레이션 가이드

### app.js에서 모듈로 마이그레이션

#### Before (app.js 내부)

```javascript
// 직접 DOM 조회
const button = document.getElementById('saveBtn');

// 수동 에러 처리
try {
    const result = riskyOperation();
} catch (error) {
    console.error(error);
}

// 장황한 요소 생성
const ball = document.createElement('div');
ball.className = 'ball';
ball.textContent = number;
ball.addEventListener('click', handler);
```

#### After (모듈 사용)

```javascript
// DOM 캐싱
const button = DOM.get('saveBtn');

// 안전한 실행
const result = safeExecute(() => riskyOperation(), null, 'riskyOperation');

// 간결한 요소 생성
const ball = createBallElement(number, { onClick: handler });
```

---

### 체크리스트

- [ ] `document.getElementById` → `DOM.get()`
- [ ] 수동 try-catch → `safeExecute()`
- [ ] 직접 DOM 생성 → `createElement()`
- [ ] alert() → `showToast()`
- [ ] 분산된 필터 → `applyMultipleFilters()`
- [ ] 중복 통계 계산 → `CacheManager` 사용

---

## 성능 최적화 팁

### 1. DOM 캐싱 활용

```javascript
// ❌ 나쁨: 매번 조회
for (let i = 0; i < 100; i++) {
    document.getElementById('container').appendChild(item);
}

// ✅ 좋음: 한번만 조회
const container = DOM.get('container');
for (let i = 0; i < 100; i++) {
    container.appendChild(item);
}
```

### 2. 캐시 활용

```javascript
// ❌ 나쁨: 매번 계산
function getStats() {
    return calculateWinStats(data, 45);  // 느림
}

// ✅ 좋음: 캐시 사용
function getStats() {
    if (!CacheManager.has('winStats')) {
        CacheManager.set('winStats', calculateWinStats(data, 45));
    }
    return CacheManager.get('winStats');
}
```

### 3. 배치 DOM 업데이트

```javascript
// ❌ 나쁨: 개별 추가
numbers.forEach(num => {
    container.appendChild(createBallElement(num));
});

// ✅ 좋음: DocumentFragment 사용
const fragment = document.createDocumentFragment();
numbers.forEach(num => {
    fragment.appendChild(createBallElement(num));
});
container.appendChild(fragment);
```

---

## 문제 해결

### Q: 모듈이 로드되지 않습니다

**A:** index.html에서 모듈 로드 순서 확인

- utils 모듈이 먼저
- 핵심 모듈이 다음
- app.js가 마지막

### Q: 캐시가 업데이트되지 않습니다

**A:** 데이터 변경 후 `CacheManager.onDataChange()` 호출

### Q: 필터가 작동하지 않습니다

**A:** `validateFilter(type, value)`로 필터 값 검증

---

**작성일**: 2026-02-11  
**버전**: v2.3  
**문서 버전**: 1.0
