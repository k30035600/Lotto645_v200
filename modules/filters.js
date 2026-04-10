/**
 * 필터 모듈
 * 로또 번호 필터링 로직
 */

/**
 * 필터 타입 정의
 */
// FILTER_TYPES는 constants.js에서 전역으로 정의됨

/**
 * 홀수/짝수 번호 분리
 * @param {number} maxNumber - 최대 번호 (기본값: 45)
 * @returns {Object} {odd: 홀수 배열, even: 짝수 배열}
 */
function separateOddEven(maxNumber = 45) {
    const odd = [];
    const even = [];

    for (let i = 1; i <= maxNumber; i++) {
        if (i % 2 === 0) {
            even.push(i);
        } else {
            odd.push(i);
        }
    }

    return { odd, even };
}

/**
 * 홀짝 필터 적용
 * @param {Array<number>} numbers - 필터링할 번호 배열
 * @param {string} filter - 필터 타입 ('odd'|'even'|'balanced'|'none')
 * @returns {Array<number>} 필터링된 번호 배열
 */
function applyOddEvenFilter(numbers, filter) {
    if (!filter || filter === 'none') {
        return numbers;
    }

    const { odd, even } = separateOddEven();
    const oddSet = new Set(odd);
    const evenSet = new Set(even);

    switch (filter) {
        case 'odd':
            return numbers.filter(n => oddSet.has(n));
        case 'even':
            return numbers.filter(n => evenSet.has(n));
        case 'balanced':
            // 홀짝 모두 포함 (기본 동작)
            return numbers;
        default:
            return numbers;
    }
}

/**
 * 핫/콜드 필터 적용
 * @param {Array<number>} numbers - 필터링할 번호 배열
 * @param {Array<number>} hotNumbers - 핫 번호 배열
 * @param {Array<number>} coldNumbers - 콜드 번호 배열
 * @param {string} filter - 필터 타입 ('hot'|'cold'|'mixed'|'none')
 * @returns {Array<number>} 필터링된 번호 배열
 */
function applyHotColdFilter(numbers, hotNumbers, coldNumbers, filter) {
    if (!filter || filter === 'none') {
        return numbers;
    }

    const hotSet = new Set(hotNumbers);
    const coldSet = new Set(coldNumbers);

    switch (filter) {
        case 'hot':
            return numbers.filter(n => hotSet.has(n));
        case 'cold':
            return numbers.filter(n => coldSet.has(n));
        case 'mixed':
            return numbers.filter(n => hotSet.has(n) || coldSet.has(n));
        default:
            return numbers;
    }
}

/**
 * 통계 필터 적용
 * @param {Array<number>} numbers - 필터링할 번호 배열
 * @param {Map<number, number>} statsMap - 번호별 통계 맵
 * @param {string} filter - 필터 타입
 * @param {number} threshold - 상위/하위 기준 (기본값: 50%)
 * @returns {Array<number>} 필터링된 번호 배열
 */
function applyStatFilter(numbers, statsMap, filter, threshold = 0.5) {
    if (!filter || filter === 'none' || !statsMap) {
        return numbers;
    }

    // 통계 기준 정렬
    const sorted = [...numbers].sort((a, b) => {
        const countA = statsMap.get(a) || 0;
        const countB = statsMap.get(b) || 0;

        if (filter.includes('desc')) {
            return countB - countA;  // 내림차순
        } else {
            return countA - countB;  // 오름차순
        }
    });

    // 상위/하위 threshold% 선택
    const cutoff = Math.ceil(sorted.length * threshold);
    return sorted.slice(0, cutoff);
}

/**
 * 범위 필터 적용
 * @param {Array<number>} numbers - 필터링할 번호 배열
 * @param {number} min - 최소값
 * @param {number} max - 최대값
 * @returns {Array<number>} 필터링된 번호 배열
 */
function applyRangeFilter(numbers, min, max) {
    return numbers.filter(n => n >= min && n <= max);
}

/**
 * 제외 번호 필터 적용
 * @param {Array<number>} numbers - 필터링할 번호 배열
 * @param {Array<number>} excludeNumbers - 제외할 번호 배열
 * @returns {Array<number>} 필터링된 번호 배열
 */
function applyExcludeFilter(numbers, excludeNumbers) {
    if (!excludeNumbers || excludeNumbers.length === 0) {
        return numbers;
    }

    const excludeSet = new Set(excludeNumbers);
    return numbers.filter(n => !excludeSet.has(n));
}

/**
 * 복합 필터 적용
 * @param {Array<number>} numbers - 필터링할 번호 배열
 * @param {Object} filters - 필터 옵션
 * @returns {Array<number>} 필터링된 번호 배열
 */
function applyMultipleFilters(numbers, filters = {}) {
    let filtered = [...numbers];

    // 1. 범위 필터
    if (filters.minNumber !== undefined && filters.maxNumber !== undefined) {
        filtered = applyRangeFilter(filtered, filters.minNumber, filters.maxNumber);
    }

    // 2. 제외 번호
    if (filters.exclude) {
        filtered = applyExcludeFilter(filtered, filters.exclude);
    }

    // 3. 홀짝 필터
    if (filters.oddEven) {
        filtered = applyOddEvenFilter(filtered, filters.oddEven);
    }

    // 4. 핫/콜드 필터
    if (filters.hotCold && filters.hotNumbers && filters.coldNumbers) {
        filtered = applyHotColdFilter(
            filtered,
            filters.hotNumbers,
            filters.coldNumbers,
            filters.hotCold
        );
    }

    // 5. 통계 필터
    if (filters.stat && filters.statsMap) {
        filtered = applyStatFilter(
            filtered,
            filters.statsMap,
            filters.stat,
            filters.threshold
        );
    }

    return filtered;
}

/**
 * 필터 유효성 검증
 * @param {string} filterType - 필터 타입
 * @param {string} filterValue - 필터 값
 * @returns {boolean} 유효성 여부
 */
function validateFilter(filterType, filterValue) {
    const validValues = FILTER_TYPES[filterType];
    return validValues ? validValues.includes(filterValue) : false;
}

/**
 * 필터 상태 생성
 * @returns {Object} 초기 필터 상태
 */
function createFilterState() {
    return {
        statFilter: 'none',
        sequence: 'none',
        oddEven: 'none',
        hotCold: 'none'
    };
}

/**
 * 필터 상태 업데이트
 * @param {Object} currentState - 현재 필터 상태
 * @param {string} filterType - 업데이트할 필터 타입
 * @param {string} filterValue - 새 필터 값
 * @returns {Object} 업데이트된 필터 상태
 */
function updateFilterState(currentState, filterType, filterValue) {
    if (!validateFilter(filterType, filterValue)) {
        console.warn(`Invalid filter: ${filterType} = ${filterValue}`);
        return currentState;
    }

    return {
        ...currentState,
        [filterType]: filterValue
    };
}

/**
 * 활성 필터 개수 계산
 * @param {Object} filterState - 필터 상태
 * @returns {number} 활성 필터 개수
 */
function countActiveFilters(filterState) {
    return Object.values(filterState).filter(v => v !== 'none').length;
}

/**
 * 필터 초기화
 * @param {Object} filterState - 필터 상태
 * @returns {Object} 초기화된 필터 상태
 */
function resetFilters(filterState) {
    return createFilterState();
}

// 전역으로 export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        FILTER_TYPES,
        separateOddEven,
        applyOddEvenFilter,
        applyHotColdFilter,
        applyStatFilter,
        applyRangeFilter,
        applyExcludeFilter,
        applyMultipleFilters,
        validateFilter,
        createFilterState,
        updateFilterState,
        countActiveFilters,
        resetFilters
    };
}
