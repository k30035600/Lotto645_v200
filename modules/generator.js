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
 * @param {Array<number>} sorted - 정렬된 번호 배열
 * @param {string} oddEvenFilter - 홀짝 필터 ('none' 또는 비율)
 * @returns {boolean} 조건 만족 여부
 */
function checkOddEvenRatio(sorted, oddEvenFilter) {
    if (!oddEvenFilter || oddEvenFilter === "none") {
        return true;
    }

    const oddCount = sorted.filter(n => n % 2 !== 0).length;
    const evenCount = sorted.length - oddCount;

    // window.ODD_EVEN_RATIO_MAP 에서 가져오거나 로컬 사용
    const ratioMap = (typeof ODD_EVEN_RATIO_MAP !== 'undefined') ? ODD_EVEN_RATIO_MAP : null;
    if (!ratioMap) return true;
    
    const targetRatio = ratioMap[oddEvenFilter];
    return targetRatio ? oddCount === targetRatio.odd && evenCount === targetRatio.even : true;
}

/**
 * 연속 번호 조건 체크
 * @param {Array<number>} sorted - 정렬된 번호 배열
 * @param {string|number} sequenceFilter - 연속 번호 필터 ('none' 또는 숫자)
 * @returns {boolean} 조건 만족 여부
 */
function checkSequence(sorted, sequenceFilter) {
    if (!sequenceFilter || sequenceFilter === "none") {
        return true;
    }
    const sequentialCount = countSequentialPairs(sorted);
    const requiredCount = parseInt(sequenceFilter, 10);
    if (Number.isNaN(requiredCount)) return true;
    if (requiredCount === 3) {
        return sequentialCount >= 3;
    }
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


function pickSixWithFilters(oddEvenFilter, sequenceFilter, hotColdFilter, existingNumbers = [], acFilter, excludeNumbers = []) {
    var maxAttempts = 500;
    if (acFilter && acFilter !== 'none') {
        maxAttempts = 900;
    }

    var hotColdCtx = null;
    if (hotColdFilter !== 'none' && typeof getHotColdSetsForOptionFilter === 'function') {
        var hcSplit = getHotColdSetsForOptionFilter();
        hotColdCtx = {
            hotSet: new Set(hcSplit.hot || []),
            coldSet: new Set(hcSplit.cold || []),
            targetHot: parseInt(hotColdFilter.split('-')[0], 10),
            targetCold: parseInt(hotColdFilter.split('-')[1], 10)
        };
    }

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        // 기존 번호가 있으면 그것을 포함하여 선택
        let selected;
        if (existingNumbers.length > 0) {
            const remaining = 6 - existingNumbers.length;
            let pool = getAllNumbers().filter(n => !existingNumbers.includes(n));
            if (excludeNumbers.length > 0) {
                const exSet = new Set(excludeNumbers);
                pool = pool.filter(n => !exSet.has(n));
            }
            const shuffled = [...pool].sort(() => Math.random() - 0.5);
            selected = [...existingNumbers, ...shuffled.slice(0, remaining)];
        } else {
            selected = pickSix(excludeNumbers);
        }

        selected = selected.sort((a, b) => a - b);

        // 중복 제거 (기존 번호와 새 번호에 중복이 있을 수 있음)
        selected = [...new Set(selected)];
        if (selected.length < 6) {
            let pool = getAllNumbers().filter(n => !selected.includes(n));
            if (excludeNumbers.length > 0) {
                const exSet = new Set(excludeNumbers);
                pool = pool.filter(n => !exSet.has(n));
            }
            const shuffled = [...pool].sort(() => Math.random() - 0.5);
            selected = [...selected, ...shuffled.slice(0, 6 - selected.length)].slice(0, 6);
            selected = selected.sort((a, b) => a - b);
        }

        /* 옵션필터 검사 순서: 구조(홀짝·연속·AC) → 통계(핫콜). 합계·과거당첨은 generateNumbersWithFilters.tryAccept */
        if (oddEvenFilter !== 'none') {
            const [targetOdd, targetEven] = oddEvenFilter.split('-').map(Number);
            const oddCount = selected.filter(n => n % 2 === 1).length;
            const evenCount = selected.filter(n => n % 2 === 0).length;

            if (oddCount !== targetOdd || evenCount !== targetEven) {
                continue;
            }
        }

        if (sequenceFilter !== 'none') {
            const target = parseInt(sequenceFilter, 10);
            const pairs = countSequentialPairs(selected);
            if (target === 0) {
                if (pairs !== 0) continue;
            } else if (target === 3) {
                if (pairs < 3) continue;
            } else {
                if (pairs !== target) continue;
            }
        }

        if (acFilter && acFilter !== 'none') {
            const targetAC = parseInt(acFilter, 10);
            if (!Number.isNaN(targetAC) && calculateAC(selected) !== targetAC) {
                continue;
            }
        }

        if (hotColdCtx && !Number.isNaN(hotColdCtx.targetHot) && !Number.isNaN(hotColdCtx.targetCold)) {
            const hotCount = selected.filter(n => hotColdCtx.hotSet.has(n)).length;
            const coldCount = selected.filter(n => hotColdCtx.coldSet.has(n)).length;
            if (hotCount !== hotColdCtx.targetHot || coldCount !== hotColdCtx.targetCold) {
                continue;
            }
        }

        return selected;
    }

    return null;
}

async function pickSixWithFiltersCooperative(oddEvenFilter, sequenceFilter, hotColdFilter, existingNumbers, acFilter, excludeNumbers, pastCombosSet = null, excludeCombosSet = null, hcCtx = null) {
    var ex = existingNumbers || [];
    var exNum = excludeNumbers || [];
    var maxAttempts = 500;
    if (acFilter && acFilter !== 'none') {
        maxAttempts = 900;
    }

    var hotColdCtxC = hcCtx;
    if (!hotColdCtxC && hotColdFilter !== 'none' && typeof getHotColdSetsForOptionFilter === 'function') {
        var hcSplitC = getHotColdSetsForOptionFilter();
        hotColdCtxC = {
            hotSet: new Set(hcSplitC.hot || []),
            coldSet: new Set(hcSplitC.cold || []),
            targetHot: parseInt(String(hotColdFilter).split('-')[0], 10),
            targetCold: parseInt(String(hotColdFilter).split('-')[1], 10)
        };
    }

    for (var attempt = 0; attempt < maxAttempts; attempt++) {
        if (attempt > 0 && attempt % 100 === 0 && typeof yieldToMainThread === 'function') {
            await yieldToMainThread();
        }
        var selected;
        if (ex.length > 0) {
            var remaining = 6 - ex.length;
            var pool = getAllNumbers().filter(function (n) { return ex.indexOf(n) === -1; });
            if (exNum.length > 0) {
                var exSet0 = new Set(exNum);
                pool = pool.filter(function (n) { return !exSet0.has(n); });
            }
            var shuffled = pool.slice().sort(function () { return Math.random() - 0.5; });
            selected = ex.slice().concat(shuffled.slice(0, remaining));
        } else {
            selected = pickSix(exNum);
        }

        selected = selected.sort(function (a, b) { return a - b; });
        selected = Array.from(new Set(selected));
        if (selected.length < 6) {
            var pool2 = getAllNumbers().filter(function (n) { return selected.indexOf(n) === -1; });
            if (exNum.length > 0) {
                var exSet1 = new Set(exNum);
                pool2 = pool2.filter(function (n) { return !exSet1.has(n); });
            }
            var shuffled2 = pool2.slice().sort(function () { return Math.random() - 0.5; });
            selected = selected.concat(shuffled2.slice(0, 6 - selected.length)).slice(0, 6);
            selected = selected.sort(function (a, b) { return a - b; });
        }

        // 과거 당첨 조합 체크
        if (pastCombosSet) {
            const ck = selected.join(',');
            if (pastCombosSet.has(ck)) continue;
        } else if (typeof isPastWinningCombo === 'function') {
            if (isPastWinningCombo(selected)) continue;
        }

        // 제외 조합 체크
        if (excludeCombosSet) {
            const ck = selected.join(',');
            if (excludeCombosSet.has(ck)) continue;
        }

        if (oddEvenFilter !== 'none') {
            var parts = oddEvenFilter.split('-').map(Number);
            var targetOdd = parts[0];
            var targetEven = parts[1];
            var oddCount = selected.filter(function (n) { return n % 2 === 1; }).length;
            var evenCount = selected.filter(function (n) { return n % 2 === 0; }).length;
            if (oddCount !== targetOdd || evenCount !== targetEven) {
                continue;
            }
        }

        if (sequenceFilter !== 'none') {
            var targetSeq = parseInt(sequenceFilter, 10);
            var pairs = countSequentialPairs(selected);
            if (targetSeq === 0) {
                if (pairs !== 0) continue;
            } else if (targetSeq === 3) {
                if (pairs < 3) continue;
            } else {
                if (pairs !== targetSeq) continue;
            }
        }

        if (acFilter && acFilter !== 'none') {
            var targetAC = parseInt(acFilter, 10);
            if (!isNaN(targetAC) && calculateAC(selected) !== targetAC) {
                continue;
            }
        }

        if (hotColdCtxC && !isNaN(hotColdCtxC.targetHot) && !isNaN(hotColdCtxC.targetCold)) {
            var hotCountC = selected.filter(function (n) { return hotColdCtxC.hotSet.has(n); }).length;
            var coldCountC = selected.filter(function (n) { return hotColdCtxC.coldSet.has(n); }).length;
            if (hotCountC !== hotColdCtxC.targetHot || coldCountC !== hotColdCtxC.targetCold) {
                continue;
            }
        }

        return selected;
    }

    return null;
}

/**
 * UI 홀짝 필터 → 목표 개수. 워커에는 AppState 없음 → null(비율 무관 무작위).
 * `selectNumbersWithOddEvenRatio` 전용.
 */
function getOddEvenTargetCounts() {
    const oe = (typeof AppState !== 'undefined' && AppState && AppState.activeFilters)
        ? AppState.activeFilters.oddEven
        : 'none';
    if (oe === 'odd') return { oddCount: 4, evenCount: 2 };
    if (oe === 'even') return { oddCount: 2, evenCount: 4 };
    if (oe === 'balanced') return { oddCount: 3, evenCount: 3 };
    if (typeof oe === 'string' && oe.includes('-')) {
        const parts = oe.split('-');
        if (parts.length === 2) {
            const odd = parseInt(parts[0], 10);
            const even = parseInt(parts[1], 10);
            if (!isNaN(odd) && !isNaN(even)) return { oddCount: odd, evenCount: even };
        }
    }
    return null;
}

function selectNumbersWithOddEvenRatio(pool, existingNumbers, totalNeeded) {
    const targetCounts = getOddEvenTargetCounts();

    // 홀짝 비율 제한이 없으면 랜덤으로 선택
    if (!targetCounts) {
        const result = [...existingNumbers];
        const resultSet = new Set(result);
        const availablePool = pool.filter(n => !resultSet.has(n));
        const shuffled = [...availablePool].sort(() => Math.random() - 0.5);

        for (let i = 0; i < shuffled.length && result.length < totalNeeded; i++) {
            result.push(shuffled[i]);
        }

        return result.slice(0, totalNeeded);
    }

    const { oddCount: targetOdd, evenCount: targetEven } = targetCounts;

    // 기존 번호에서 홀수/짝수 개수 계산
    let currentOdd = existingNumbers.filter(n => n % 2 === 1).length;
    let currentEven = existingNumbers.filter(n => n % 2 === 0).length;

    const result = [...existingNumbers];
    const resultSet = new Set(result);

    // 풀에서 홀수/짝수 분리
    const oddPool = pool.filter(n => n % 2 === 1 && !resultSet.has(n));
    const evenPool = pool.filter(n => n % 2 === 0 && !resultSet.has(n));

    // 셔플
    const shuffledOdd = [...oddPool].sort(() => Math.random() - 0.5);
    const shuffledEven = [...evenPool].sort(() => Math.random() - 0.5);

    // 목표 비율에 맞춰 정확히 선택
    const needOdd = Math.max(0, targetOdd - currentOdd);
    const needEven = Math.max(0, targetEven - currentEven);
    const remaining = totalNeeded - result.length;

    // 목표 비율에 맞춰 홀수/짝수 선택
    let oddSelected = 0;
    let evenSelected = 0;

    // 우선순위: 목표 비율에 맞춰 선택
    while (result.length < totalNeeded) {
        const needOddNow = needOdd - oddSelected;
        const needEvenNow = needEven - evenSelected;
        const remainingSlots = totalNeeded - result.length;

        // 목표 비율을 우선적으로 맞춤
        if (needOddNow > 0 && oddSelected < shuffledOdd.length && oddSelected < needOdd) {
            result.push(shuffledOdd[oddSelected]);
            resultSet.add(shuffledOdd[oddSelected]);
            oddSelected++;
        } else if (needEvenNow > 0 && evenSelected < shuffledEven.length && evenSelected < needEven) {
            result.push(shuffledEven[evenSelected]);
            resultSet.add(shuffledEven[evenSelected]);
            evenSelected++;
        } else {
            // 목표 비율 달성 후 남은 자리 채우기
            if (oddSelected < shuffledOdd.length && (evenSelected >= shuffledEven.length || Math.random() < 0.5)) {
                result.push(shuffledOdd[oddSelected]);
                resultSet.add(shuffledOdd[oddSelected]);
                oddSelected++;
            } else if (evenSelected < shuffledEven.length) {
                result.push(shuffledEven[evenSelected]);
                resultSet.add(shuffledEven[evenSelected]);
                evenSelected++;
            } else {
                // 풀에 더 이상 번호가 없으면 중단
                break;
            }
        }
    }

    // 최종 결과의 홀짝 비율 확인 및 조정
    const finalOdd = result.filter(n => n % 2 === 1).length;
    const finalEven = result.filter(n => n % 2 === 0).length;

    // 목표 비율과 다르면 간단한 재시도 (성능 최적화)
    if (finalOdd !== targetOdd || finalEven !== targetEven) {
        // 풀에 충분한 홀수/짝수가 있는지 확인
        if (oddPool.length >= targetOdd && evenPool.length >= targetEven) {
            // 간단한 재시도: 목표 비율에 정확히 맞춤
            const retryResult = [...existingNumbers];
            const retrySet = new Set(retryResult);
            const retryOddPool = pool.filter(n => n % 2 === 1 && !retrySet.has(n));
            const retryEvenPool = pool.filter(n => n % 2 === 0 && !retrySet.has(n));

            // 재시도 시 기존 번호의 홀짝 개수 다시 계산
            const retryCurrentOdd = retryResult.filter(n => n % 2 === 1).length;
            const retryCurrentEven = retryResult.filter(n => n % 2 === 0).length;
            const retryNeedOdd = Math.max(0, targetOdd - retryCurrentOdd);
            const retryNeedEven = Math.max(0, targetEven - retryCurrentEven);

            const retryShuffledOdd = [...retryOddPool].sort(() => Math.random() - 0.5);
            const retryShuffledEven = [...retryEvenPool].sort(() => Math.random() - 0.5);

            // 목표 비율에 정확히 맞춰 선택
            for (let i = 0; i < retryNeedOdd && retryResult.length < totalNeeded && i < retryShuffledOdd.length; i++) {
                retryResult.push(retryShuffledOdd[i]);
            }
            for (let i = 0; i < retryNeedEven && retryResult.length < totalNeeded && i < retryShuffledEven.length; i++) {
                retryResult.push(retryShuffledEven[i]);
            }

            // 목표 비율이 맞는지 확인
            const finalRetryOdd = retryResult.filter(n => n % 2 === 1).length;
            const finalRetryEven = retryResult.filter(n => n % 2 === 0).length;

            if (finalRetryOdd === targetOdd && finalRetryEven === targetEven && retryResult.length === totalNeeded) {
                return retryResult.slice(0, totalNeeded);
            }
        }
    }

    return result.slice(0, totalNeeded);
}

if (typeof window !== "undefined") {
    window.pickSixWithFilters = pickSixWithFilters;
    window.pickSixWithFiltersCooperative = pickSixWithFiltersCooperative;
    window.selectNumbersWithOddEvenRatio = selectNumbersWithOddEvenRatio;
}
