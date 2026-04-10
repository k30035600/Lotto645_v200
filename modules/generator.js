/**
 * 로또 번호 생성 모듈
 * 다양한 필터와 제약조건을 적용한 번호 생성 로직
 */

/**
 * 번호 풀 섞기 (Fisher-Yates 알고리즘)
 * @param {Array<number>} numbers - 섞을 번호 배열
 * @returns {Array<number>} 섞인 번호 배열
 */
function shuffleArray(numbers) {
    const shuffled = [...numbers];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

/**
 * 연속 번호 체크
 * @param {Array<number>} sorted - 정렬된 번호 배열
 * @returns {boolean} 연속 번호 존재 여부
 */
function hasSequential(sorted) {
    for (let i = 1; i < sorted.length; i++) {
        if (sorted[i] === sorted[i - 1] + 1) {
            return true;
        }
    }
    return false;
}

/**
 * 연속 번호 쌍 개수 세기
 * @param {Array<number>} sorted - 정렬된 번호 배열
 * @returns {number} 연속 번호 쌍 개수
 */
function countSequentialPairs(sorted) {
    let count = 0;
    for (let i = 1; i < sorted.length; i++) {
        if (sorted[i] === sorted[i - 1] + 1) {
            count++;
        }
    }
    return count;
}

/**
 * 홀짝 비율 체크
 * @param {Array<number>} numbers - 번호 배열
 * @param {Object} targetRatio - 목표 비율 {odd: 수, even: 수}
 * @returns {boolean} 비율 일치 여부
 */
function checkOddEvenRatio(numbers, targetRatio) {
    if (!targetRatio) return true;

    const oddCount = numbers.filter(n => n % 2 === 1).length;
    const evenCount = numbers.filter(n => n % 2 === 0).length;

    return oddCount === targetRatio.odd && evenCount === targetRatio.even;
}

/**
 * 연속 번호 조건 체크
 * @param {Array<number>} sorted - 정렬된 번호 배열
 * @param {string|number} sequenceFilter - 연속 번호 필터 ('none' 또는 숫자)
 * @returns {boolean} 조건 만족 여부
 */
function checkSequence(sorted, sequenceFilter) {
    if (!sequenceFilter || sequenceFilter === "none") {
        // 기본: 연속 번호 없어야 함
        return !hasSequential(sorted);
    }

    const sequentialCount = countSequentialPairs(sorted);
    const requiredCount = parseInt(sequenceFilter) || 0;
    return sequentialCount === requiredCount;
}

/**
 * 핫/콜드 비율 체크
 * @param {Array<number>} numbers - 번호 배열
 * @param {Array<number>} hotNumbers - 핫 번호 배열
 * @param {Array<number>} coldNumbers - 콜드 번호 배열
 * @param {Object} targetRatio - 목표 비율 {hot: 수, cold: 수}
 * @returns {boolean} 비율 일치 여부
 */
function checkHotColdRatio(numbers, hotNumbers, coldNumbers, targetRatio) {
    if (!targetRatio) return true;

    const hotSet = new Set(hotNumbers);
    const coldSet = new Set(coldNumbers);

    const hotCount = numbers.filter(n => hotSet.has(n)).length;
    const coldCount = numbers.filter(n => coldSet.has(n)).length;

    return hotCount === targetRatio.hot && coldCount === targetRatio.cold;
}

/**
 * 번호 합계 범위 체크
 * @param {Array<number>} numbers - 번호 배열
 * @param {number} minSum - 최소 합계
 * @param {number} maxSum - 최대 합계
 * @returns {boolean} 범위 내 여부
 */
function checkSumRange(numbers, minSum, maxSum) {
    const sum = numbers.reduce((a, b) => a + b, 0);
    return sum >= minSum && sum <= maxSum;
}

/**
 * 모든 제약조건 체크
 * @param {Array<number>} numbers - 번호 배열
 * @param {Object} constraints - 제약조건 객체
 * @returns {boolean} 모든 조건 만족 여부
 */
function passesAllConstraints(numbers, constraints = {}) {
    const sorted = [...numbers].sort((a, b) => a - b);

    // 연속 번호 체크
    if (constraints.sequence !== undefined) {
        if (!checkSequence(sorted, constraints.sequence)) {
            return false;
        }
    }

    // 홀짝 비율 체크
    if (constraints.oddEvenRatio) {
        if (!checkOddEvenRatio(numbers, constraints.oddEvenRatio)) {
            return false;
        }
    }

    // 핫/콜드 비율 체크
    if (constraints.hotColdRatio && constraints.hotNumbers && constraints.coldNumbers) {
        if (!checkHotColdRatio(numbers, constraints.hotNumbers, constraints.coldNumbers, constraints.hotColdRatio)) {
            return false;
        }
    }

    // 합계 범위 체크
    if (constraints.minSum !== undefined && constraints.maxSum !== undefined) {
        if (!checkSumRange(numbers, constraints.minSum, constraints.maxSum)) {
            return false;
        }
    }

    // 선호 번호 포함 체크
    if (constraints.preferredNumbers && constraints.preferredNumbers.length > 0) {
        const preferredSet = new Set(constraints.preferredNumbers);
        const hasAllPreferred = constraints.preferredNumbers.every(n => numbers.includes(n));
        if (!hasAllPreferred) {
            return false;
        }
    }

    return true;
}

/**
 * 로또 번호 생성 (제약조건 적용)
 * @param {Object} options - 생성 옵션
 * @param {number} options.count - 생성할 번호 개수 (기본값: 6)
 * @param {number} options.minNumber - 최소 번호 (기본값: 1)
 * @param {number} options.maxNumber - 최대 번호 (기본값: 45)
 * @param {Array<number>} options.pool - 번호 풀 (없으면 자동 생성)
 * @param {Array<number>} options.exclude - 제외할 번호
 * @param {Array<number>} options.preferredNumbers - 반드시 포함할 번호
 * @param {Object} options.constraints - 제약조건
 * @param {number} options.maxAttempts - 최대 시도 횟수 (기본값: 1000)
 * @returns {Array<number>|null} 생성된 번호 배열 또는 null
 */
function generateLottoNumbers(options = {}) {
    const {
        count = 6,
        minNumber = 1,
        maxNumber = 45,
        pool = null,
        exclude = [],
        preferredNumbers = [],
        constraints = {},
        maxAttempts = 1000
    } = options;

    // 번호 풀 생성
    let numberPool = pool;
    if (!numberPool) {
        numberPool = [];
        for (let i = minNumber; i <= maxNumber; i++) {
            numberPool.push(i);
        }
    }

    // 제외 번호 필터링
    if (exclude.length > 0) {
        const excludeSet = new Set(exclude);
        numberPool = numberPool.filter(n => !excludeSet.has(n));
    }

    // 선호 번호 검증
    if (preferredNumbers.length > count) {
        console.error('선호 번호가 생성할 번호 개수보다 많습니다.');
        return null;
    }

    // 선호 번호가 풀에 있는지 확인
    const poolSet = new Set(numberPool);
    if (!preferredNumbers.every(n => poolSet.has(n))) {
        console.error('선호 번호 중 일부가 번호 풀에 없습니다.');
        return null;
    }

    // 번호 생성 시도
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        let selected = [...preferredNumbers];
        const remaining = numberPool.filter(n => !preferredNumbers.includes(n));
        const shuffled = shuffleArray(remaining);

        // 나머지 번호 선택
        for (let i = 0; i < shuffled.length && selected.length < count; i++) {
            selected.push(shuffled[i]);
        }

        // 제약조건 체크
        if (passesAllConstraints(selected, constraints)) {
            return selected.sort((a, b) => a - b);
        }
    }

    // 최대 시도 횟수 초과
    console.warn(`${maxAttempts}번 시도 후에도 조건을 만족하는 번호를 생성하지 못했습니다.`);
    return null;
}

/**
 * 여러 세트 생성
 * @param {number} setCount - 생성할 세트 수
 * @param {Object} options - generateLottoNumbers 옵션
 * @returns {Array<Array<number>>} 생성된 번호 세트 배열
 */
function generateMultipleSets(setCount, options = {}) {
    const sets = [];
    const usedSets = new Set();

    for (let i = 0; i < setCount; i++) {
        let numbers = null;
        let attempts = 0;
        const maxSetAttempts = 100;

        // 중복 세트 방지
        while (attempts < maxSetAttempts) {
            numbers = generateLottoNumbers(options);
            if (numbers) {
                const key = numbers.join(',');
                if (!usedSets.has(key)) {
                    usedSets.add(key);
                    break;
                }
            }
            attempts++;
        }

        if (numbers) {
            sets.push(numbers);
        } else {
            console.warn(`세트 ${i + 1} 생성 실패`);
        }
    }

    return sets;
}

// 전역으로 export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        shuffleArray,
        hasSequential,
        countSequentialPairs,
        checkOddEvenRatio,
        checkSequence,
        checkHotColdRatio,
        checkSumRange,
        passesAllConstraints,
        generateLottoNumbers,
        generateMultipleSets
    };
}
