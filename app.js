/** 
 * ShareHarmony · MyRisk 팔레트 (동행볼 제외, UI 일관용) — Common 기준 
 * -> SHAREHARMONY_PALETTE 는 modules/constants.js 로 이동되었습니다.
 */

/** API 서버 베이스 URL 가져오기 (Flask server.py). Live Server 등으로 HTML만 열면 origin이 5500 등이라 /api/* 가 없음 → meta 또는 8000 포트 보정 */
function getApiBaseUrl() {
    try {
        const meta = document.querySelector('meta[name="lotto-api-base"]');
        if (meta) {
            const c = (meta.getAttribute('content') || '').trim();
            if (c) return c.replace(/\/$/, '');
        }
    } catch (e) { /* ignore */ }

    if (window.location.protocol === 'file:') {
        return 'http://localhost:8000';
    }

    const host = window.location.hostname || 'localhost';
    const port = window.location.port || '';

    const staticOnlyPorts = new Set(['5500', '5501', '8080', '5173', '3000', '4200', '8888']);
    if (port && staticOnlyPorts.has(port)) {
        return 'http://' + host + ':8000';
    }

    return (window.location.origin || ('http://' + host + ':8000')).replace(/\/$/, '');
}

/**
 * fetch 응답 본문을 JSON으로 파싱. HTML이 오면(404/SPA 폴백·구버전 서버 등) 원인 안내.
 * @param {Response} response
 * @returns {Promise<object>}
 */
async function parseFetchJsonResponse(response) {
    const text = await response.text();
    const trimmed = text.trim();
    if (!trimmed) {
        throw new Error('서버 응답이 비어 있습니다. (HTTP ' + response.status + ')');
    }
    if (trimmed.charAt(0) === '<') {
        const hint405 =
            response.status === 405
                ? ' HTTP 405는 보통 실행 중인 Flask가 BoB 라우트 없는 구버전이라 POST가 정적 경로에만 맞을 때 납니다. 터미널에서 서버를 끄고 최신 server.py로 다시 실행하세요.'
                : '';
        throw new Error(
            'API 대신 HTML이 반환되었습니다. (HTTP ' + response.status + ')' + hint405 + ' ' +
            '같은 호스트에서 서버를 띄웠는지, Live Server 등은 meta name="lotto-api-base"에 Flask 주소를 넣었는지 확인하세요.'
        );
    }
    try {
        return JSON.parse(trimmed);
    } catch (e) {
        throw new Error('JSON 파싱 실패: ' + (e.message || String(e)));
    }
}

/** 당첨 통계 기준 핫/콜 분할: 상위 N개 = 핫, 나머지 45−N = 콜 */
const LOTTO645_HOT_COUNT = 22;

/** Lotto023 저장 게임: 선택1~6 합계 (pickSum / 선택합계 / 번호 합) */
function getGamePickSum(game) {
    if (!game) return null;
    if (game.pickSum != null && game.pickSum !== '' && !Number.isNaN(Number(game.pickSum))) return Number(game.pickSum);
    const raw = game['선택합계'];
    if (raw != null && raw !== '' && !Number.isNaN(Number(raw))) return Number(raw);
    if (game.numbers && game.numbers.length === 6) return game.numbers.reduce((a, b) => a + b, 0);
    return null;
}

/**
 * 저장 목록·말풍선용: SS-GG게임/홀/핫/연/AC(두 자리)/모드[합] (회차는 별도 표시, 합계 앞 슬래시 없음)
 * @returns {{ detailLineText: string, detailLead: string, detailGamePrefix: string, detailStats: string, detailAc: string, detailTail: string, modeLabel: string, numsSorted: number[], roundNum: number }}
 */
function getSavedGameRowSummaryParts(game) {
    const oe = (game.oddEven != null && game.oddEven !== '') ? game.oddEven : '-';
    const seq = (game.sequence != null && game.sequence !== '') ? game.sequence : '-';
    const hc = (game.hotCold != null && game.hotCold !== '') ? game.hotCold : '-';
    const mode = (game.gameMode === '자동' ? 'AI추천' : game.gameMode) || '-';
    const setRaw = game.set !== undefined && game.set !== null && game.set !== '' ? game.set : game['세트'];
    const sNum = (setRaw !== undefined && setRaw !== null && setRaw !== '')
        ? parseInt(String(setRaw), 10)
        : 0;
    const gRaw = game.game !== undefined && game.game !== null && game.game !== '' ? game.game : game['게임'];
    const gNum = parseInt(String(gRaw != null ? gRaw : ''), 10);
    const setPadded = String(Number.isNaN(sNum) ? 0 : sNum).padStart(2, '0');
    const gamePadded = String(Number.isNaN(gNum) ? 0 : gNum).padStart(2, '0');
    const setGameStr = `${setPadded}-${gamePadded}게임`;
    const pickSumVal = getGamePickSum(game);
    const numsSorted = (game.numbers && Array.isArray(game.numbers))
        ? [...game.numbers].sort((a, b) => a - b)
        : [];
    let acDisp = '—';
    if (numsSorted.length === 6) acDisp = String(calculateAC(numsSorted)).padStart(2, '0');
    const sumBracket = (pickSumVal != null && !Number.isNaN(pickSumVal)) ? `[${pickSumVal}]` : '[—]';
    const detailGamePrefix = `${setGameStr}/`;
    const detailStats = `홀${oe}/핫${hc}/연${seq}/`;
    const detailAc = `AC${acDisp}/`;
    const detailLead = `${detailGamePrefix}${detailStats}${detailAc}`;
    const detailTail = sumBracket;
    const detailLineText = `${detailLead}${mode} ${detailTail}`;
    return {
        detailLineText,
        detailLead,
        detailGamePrefix,
        detailStats,
        detailAc,
        detailTail,
        modeLabel: mode,
        numsSorted,
        roundNum: Number(game.round)
    };
}

/**
 * 해당 회차 저장 게임들의 1~5등 건수 집계(추첨 완료 회차 전용)
 */
// computeRankSummaryForRoundGames → modules/utils/lottoUtils.js 로 이동되었습니다.

/** 여러 회차에 걸친 저장 게임의 1~5등 건수(표시 목록용) */
// computeRankSummaryForCrossRoundGames → modules/utils/lottoUtils.js 로 이동되었습니다.

/** 요약 바·말풍선용: 결과통계 문구 (예: 5등 4게임 · 4등 1게임) */
function formatResultStatsHumanReadable(rankSummary) {
    if (!rankSummary) return '—';
    const parts = [];
    for (let r = 1; r <= 5; r++) {
        const c = rankSummary[r];
        if (c > 0) parts.push(r + '등 ' + c + '게임');
    }
    if (parts.length === 0) return '낙첨';
    return parts.join(' · ');
}

/** 미추첨 말풍선용: 저장공 미니 HTML (말풍선 공·색 통일) */
function formatSavedBallsInlineHtml(nums) {
    if (!nums || nums.length === 0) return '';
    return nums.slice(0, 6).map(function (n) {
        const cls = typeof getBallColorClass === 'function' ? getBallColorClass(n) : '';
        return `<span class="stat-ball stat-ball--sm ${cls}" style="margin:0 2px;">${n}</span>`;
    }).join('');
}

function shutdownServer() {
    if (!confirm('서버를 종료하시겠습니까?')) return;
    fetch(getApiBaseUrl() + '/api/shutdown', { method: 'POST' })
        .then(() => {
            document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;font-size:1.2rem;color:#334155;">서버가 종료되었습니다. 이 탭을 닫아주세요.</div>';
        })
        .catch(() => {
            document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;font-size:1.2rem;color:#334155;">서버가 종료되었습니다. 이 탭을 닫아주세요.</div>';
        });
}

// constants.js에서 로드된 전역 변수들이 사용됩니다.
// DEFAULT_SET_COUNT: 기본 세트 수
// LOTTO_CONSTANTS: 로또 관련 상수
// HOT_COLD_RATIO_MAP: 핫/콜 비율 맵
// ODD_EVEN_RATIO_MAP: 홀/짝 비율 맵

/** 전역 상태 관리 모듈 */
// AppState는 modules/state.js에서 로드됩니다.

// Removed redundant: let activeFilters = AppState.activeFilters;
// Use AppState.activeFilters directly instead

// loadLotto645Data, loadLotto023Data 및 관련 유틸리티는 dataLoader.js에서 로드됩니다.

// getAllNumbers, sortNumbers, getOddEvenNumbers 등은 generator.js 또는 statistics.js의 기능을 사용하거나, 
// app.js 내부에서 필요한 최소한의 유틸리티만 남겨둡니다. 
// (주의: generator.js의 함수들은 전역으로 노출되지 않았을 수 있으므로 확인 필요. 
// 하지만 현재 구조상 script 태그로 로드하므로 전역에 있을 가능성이 높음.
// 안전을 위해, app.js에서 *내부적으로만* 쓰이는 간단한 유틸리티는 남겨두거나, 
// generator.js가 전역으로 노출하는 함수명과 겹치지 않게 주의해야 함.
// 여기서는 `calculateWinStats` 등 statistics.js와 명확히 겹치는 함수들을 제거합니다.)
// → 단, updateStatsByDateRange 등에서 동기적으로 호출하므로 아래에 직접 구현합니다.

/**
 * 당첨번호(보너스 제외) 기준 번호별 출현 횟수 Map 반환
 */
function calculateWinStats(rounds) {
    const map = new Map();
    for (let i = 1; i <= 45; i++) map.set(i, 0);
    (rounds || []).forEach(r => {
        (r.numbers || []).forEach(n => {
            const num = parseInt(n, 10);
            if (num >= 1 && num <= 45) map.set(num, (map.get(num) || 0) + 1);
        });
    });
    return map;
}

/**
 * 보너스 포함 전체 출현 횟수 Map 반환
 */
function calculateAppearanceStats(rounds) {
    const map = new Map();
    for (let i = 1; i <= 45; i++) map.set(i, 0);
    (rounds || []).forEach(r => {
        (r.numbers || []).forEach(n => {
            const num = parseInt(n, 10);
            if (num >= 1 && num <= 45) map.set(num, (map.get(num) || 0) + 1);
        });
        if (r.bonus) {
            const b = parseInt(r.bonus, 10);
            if (b >= 1 && b <= 45) map.set(b, (map.get(b) || 0) + 1);
        }
    });
    return map;
}

/**
 * 출현 횟수 Map → 백분율 Map 반환
 */
function calculatePercentageStats(statsMap, totalRounds) {
    const map = new Map();
    let totalCount = 0;
    statsMap.forEach((count) => { totalCount += count; });
    if (totalCount === 0) return map;
    statsMap.forEach((count, num) => {
        map.set(num, (count / totalCount) * 100);
    });
    return map;
}

/**
 * 통계 데이터 초기화
 * @param {Array} lottoData - 로또 데이터 배열
 */
async function initializeStats(lottoData) {
    if (!lottoData) return;

    // 당첨공(회차별 당첨번호)은 이 데이터만 사용 (Lotto645.xlsx 전용, API 병합 없음)
    AppState.allLotto645Data = lottoData;
    AppState._pastWinKeySet = null;
    AppState.currentStatsRounds = lottoData || [];

    // 회차 및 합계 범위 설정
    if (lottoData.length > 0) {
        const rounds = lottoData.map(r => r && r.round ? Number(r.round) : NaN).filter(n => !isNaN(n));
        if (rounds.length > 0) {
            AppState.startRound = Math.min(...rounds);
            AppState.endRound = Math.max(...rounds);
        }

        const band0 = computeSumPercentileBandFromRounds(lottoData, SUM_BAND_PERCENTILE_LOW, SUM_BAND_PERCENTILE_HIGH);
        if (band0) {
            AppState.sumRangeStart = band0.min;
            AppState.sumRangeEnd = band0.max;
            const sub0 = computeSumPercentileSubBandsFromRounds(lottoData, SUM_BAND_PERCENTILE_LOW, SUM_BAND_PERCENTILE_HIGH, SUM_BAND_SLOT_COUNT);
            AppState.sumBandPerGame = (sub0 && sub0.length === SUM_BAND_SLOT_COUNT)
                ? sub0
                : Array.from({ length: SUM_BAND_SLOT_COUNT }, function () { return { start: band0.min, end: band0.max }; });
        } else {
            AppState.sumBandPerGame = null;
        }
    } else {
        AppState.sumBandPerGame = null;
    }

    // statistics.js의 initializeStatistics 함수를 사용하여 통계 계산 (Web Worker)
    if (typeof initializeStatistics === 'function') {
        try {
            const stats = await initializeStatistics(lottoData, LOTTO_CONSTANTS.MAX_NUMBER);

            // AppState 업데이트
            AppState.winStatsMap = stats.winStatsMap;
            AppState.appearanceStatsMap = stats.appearanceStatsMap;
            AppState.consecutiveStatsMap = calculateConsecutiveStats(lottoData);
            AppState.winPercentageCache = stats.winPercentageMap;
            AppState.appearancePercentageCache = stats.appearancePercentageMap;
            AppState.overallHotColdCache = stats.hotCold;

            // winStats 배열 생성 (정렬)
            AppState.winStats = Array.from(AppState.winStatsMap.entries())
                .map(([number, count]) => ({ number, count }))
                .sort((a, b) => a.number - b.number);

            // 기존 호환성을 위해 avgPercentageCache 설정
            AppState.avgPercentageCache = stats.winPercentageMap;
        } catch (error) {
            console.error('Error initializing statistics with Web Worker:', error);
            alert('통계 데이터를 계산하는 중 오류가 발생했습니다. 일부 기능이 제대로 동작하지 않을 수 있습니다.');
            // 실패 시에도 기본적인 AppState는 유지되도록 수동으로 초기화
            AppState.winStatsMap = new Map();
            AppState.appearanceStatsMap = new Map();
            // ... 등등
        }
    } else {
        console.error('initializeStatistics function not found in statistics.js');
    }

    // 평균 횟수 캐시 계산
    const avgCount = lottoData.length > 0
        ? lottoData.reduce((sum, round) => sum + (round.numbers ? round.numbers.length : 0), 0) / (lottoData.length * LOTTO_CONSTANTS.SET_SIZE)
        : 0;
    AppState.avgCountCache = avgCount;

    // 현재 통계 업데이트
    updateCurrentStats();

    // 월별 평균 차트 렌더링 추가
    if (typeof renderMonthlyAverageChart === 'function') {
        renderMonthlyAverageChart(lottoData);
    }
    if (typeof extractAndApplyFilters === 'function' && lottoData && lottoData.length > 0) {
        extractAndApplyFilters(lottoData);
    }
}

/**
 * 현재 통계 업데이트
 */
// updateCurrentStats → modules/renderer.js 로 이동되었습니다.

/**
 * 통계 기준으로 정렬
 * @param {Array} numbers - 정렬할 번호 배열
 * @param {boolean} byCount - true면 횟수로, false면 비율로 정렬
 * @param {boolean} descending - true면 내림차순, false면 오름차순
 * @returns {Array<number>} 정렬된 번호 배열
 */
function sortByStat(numbers, byCount = true, descending = true) {
    if (!AppState.winStatsMap || AppState.winStatsMap.size === 0) {
        return numbers;
    }

    const percentageMap = AppState.avgPercentageCache || new Map();

    return numbers.slice().sort((a, b) => {
        let valueA, valueB;

        if (byCount) {
            valueA = AppState.winStatsMap.get(a) || 0;
            valueB = AppState.winStatsMap.get(b) || 0;
        } else {
            valueA = percentageMap.get(a) || 0;
            valueB = percentageMap.get(b) || 0;
        }

        if (descending) {
            return valueB - valueA;
        } else {
            return valueA - valueB;
        }
    });
}

/**
 * 모든 로또 번호 (1~45) 배열 반환
 * @returns {Array} 1부터 45까지의 숫자 배열
 */
// getAllNumbers → modules/utils/lottoUtils.js 로 이동되었습니다.

/**
 * 통계 기준으로 필터링된 번호 반환
 * @param {boolean} highCount - true면 높은 순위, false면 낮은 순위
 * @returns {Array<number>} 필터링된 번호 배열
 */
function getFilteredNumbersByCount(highCount = true) {
    if (!AppState.winStats || AppState.winStats.length === 0) {
        return getAllNumbers();
    }

    const sortedStats = AppState.winStats.slice().sort((a, b) => {
        if (highCount) {
            return b.count - a.count;
        } else {
            return a.count - b.count;
        }
    });

    // 상위/하위 절반 반환
    const halfLength = Math.ceil(sortedStats.length / 2);
    return sortedStats.slice(0, halfLength).map(stat => stat.number);
}

/**
 * 핫/콜 번호 정렬 및 분류
 * 정렬 기준: 1) 당첨횟수(보너스 제외) 내림차순, 2) 출현횟수(보너스 포함) 내림차순, 3) 번호 오름차순
 * 핫: 상위 22개 (최다빈도순), 콜: 하위 23개 (최소빈도순)
 */
/**
 * 번호별 연속 출현 횟수 Map 반환 (각 번호가 연속쌍의 일부로 등장한 횟수)
 */
function calculateConsecutiveStats(rounds) {
    const map = new Map();
    for (let i = 1; i <= 45; i++) map.set(i, 0);
    (rounds || []).forEach(r => {
        const nums = (r.numbers || []).map(n => parseInt(n, 10)).filter(n => !isNaN(n)).sort((a, b) => a - b);
        for (let j = 0; j < nums.length - 1; j++) {
            if (nums[j + 1] === nums[j] + 1) {
                map.set(nums[j], (map.get(nums[j]) || 0) + 1);
                map.set(nums[j + 1], (map.get(nums[j + 1]) || 0) + 1);
            }
        }
    });
    return map;
}

function sortAndSplitHotCold(winStatsMap, appearanceStatsMap, consecutiveStatsMap) {
    var seqMap = consecutiveStatsMap || new Map();
    var sorted = Array.from(winStatsMap.entries())
        .map(function (e) {
            return { number: e[0], count: e[1], appCount: (appearanceStatsMap && appearanceStatsMap.get(e[0])) || 0, seqCount: seqMap.get(e[0]) || 0 };
        })
        .sort(function (a, b) {
            if (b.count !== a.count) return b.count - a.count;
            if (b.appCount !== a.appCount) return b.appCount - a.appCount;
            if (b.seqCount !== a.seqCount) return b.seqCount - a.seqCount;
            return b.number - a.number;
        });
    var hot = sorted.slice(0, LOTTO645_HOT_COUNT).map(function (s) { return s.number; });
    var cold = sorted.slice(LOTTO645_HOT_COUNT).reverse().map(function (s) { return s.number; });
    return { hot: hot, cold: cold };
}

/**
 * 전체 데이터를 기준으로 한 핫/콜 번호 계산 및 반환
 */
function getOverallHotColdNumbers() {
    if (!AppState.allLotto645Data || AppState.allLotto645Data.length === 0) {
        return { hot: [], cold: [] };
    }
    if (AppState.overallHotColdCache) return AppState.overallHotColdCache;

    var winMap = calculateWinStats(AppState.allLotto645Data);
    var appMap = calculateAppearanceStats(AppState.allLotto645Data);
    var seqMap = calculateConsecutiveStats(AppState.allLotto645Data);
    AppState.overallHotColdCache = sortAndSplitHotCold(winMap, appMap, seqMap);
    return AppState.overallHotColdCache;
}

/**
 * 옵션필터(홀짝·핫콜 비율 등)에서 핫/콜 집합: 통계 구간(AppState.optionHotColdBasisRounds)이 있으면 그 구간, 없으면 전체 데이터
 */
function getHotColdSetsForOptionFilter() {
    const basis = AppState.optionHotColdBasisRounds;
    if (basis && basis.length > 0) {
        const winMap = calculateWinStats(basis);
        const appMap = calculateAppearanceStats(basis);
        const seqMap = calculateConsecutiveStats(basis);
        return sortAndSplitHotCold(winMap, appMap, seqMap);
    }
    return getOverallHotColdNumbers();
}

/**
 * 1회 ~ targetRound 직전까지의 데이터로 핫/콜 번호 계산
 */
// getHotColdNumbersBeforeRound → modules/utils/lottoUtils.js 로 이동되었습니다.

/**
 * 현재 조회 범위 데이터를 기준으로 한 핫/콜 번호 계산 및 반환
 */
function getHotColdNumbers() {
    var data = AppState.currentStatsRounds || AppState.allLotto645Data;
    if (!data || data.length === 0) {
        return { hot: [], cold: [] };
    }
    var winMap = calculateWinStats(data);
    var appMap = calculateAppearanceStats(data);
    var seqMap = calculateConsecutiveStats(data);
    return sortAndSplitHotCold(winMap, appMap, seqMap);
}

/**
 * 선호 번호 가져오기 (현재는 선택된 선호 번호 반환)
 * @returns {Array<number>} 선호 번호 배열
 */
function getPreferredNumbers() {
    return AppState.selectedPreferredNumbers || [];
}

// shuffledPool → modules/utils/lottoUtils.js 로 이동되었습니다.

// hasSequential, countSequentialPairs → generator.js 로 이동되었습니다.

// countSequentialPairs -> generator.js 로 이동되었습니다.

/** 로또 6/45 전체 조합 수 (고정) */
const LOTTO_645_TOTAL_COMBOS = 8145060;

/** 저장 목표(홀·연속·핫)별 유효 조합 수 캐시 — 미추첨 말풍선 반복 열기 완화 */
const _savedTargetComboCountMemo = new Map();

/**
 * 저장된 홀/연속/핫 목표를 동시에 만족하는 6개 조합 개수 (전수, 최대 8,145,060회).
 * @returns {{ count: number, total: number } | { count: null, total: number, note: string }}
 */
function countCombinationsMatchingSavedTargets(roundNum, oeRaw, seqRaw, hcRaw) {
    const needOe = oeRaw != null && String(oeRaw).trim() !== '' && !Number.isNaN(Number(oeRaw));
    const needSeq = seqRaw != null && String(seqRaw).trim() !== '' && !Number.isNaN(Number(seqRaw));
    const needHc = hcRaw != null && String(hcRaw).trim() !== '' && !Number.isNaN(Number(hcRaw));

    if (!needOe && !needSeq && !needHc) {
        return { count: LOTTO_645_TOTAL_COMBOS, total: LOTTO_645_TOTAL_COMBOS, noTargets: true };
    }

    if (needHc) {
        const { hot } = getHotColdNumbersBeforeRound(roundNum);
        if (!hot || hot.length === 0) {
            return { count: null, total: LOTTO_645_TOTAL_COMBOS, note: '해당 회차 이전 핫 데이터 없음' };
        }
    }

    const memoKey = `${roundNum}|${needOe ? Number(oeRaw) : ''}|${needSeq ? Number(seqRaw) : ''}|${needHc ? Number(hcRaw) : ''}`;
    if (_savedTargetComboCountMemo.has(memoKey)) {
        return _savedTargetComboCountMemo.get(memoKey);
    }

    const targetOe = needOe ? Number(oeRaw) : null;
    const targetSeq = needSeq ? Number(seqRaw) : null;
    const targetHc = needHc ? Number(hcRaw) : null;
    const { hot } = getHotColdNumbersBeforeRound(roundNum);
    const hotSet = new Set(hot || []);

    let cnt = 0;
    for (let a = 1; a <= 40; a++) {
        for (let b = a + 1; b <= 41; b++) {
            for (let c = b + 1; c <= 42; c++) {
                for (let d = c + 1; d <= 43; d++) {
                    for (let e = d + 1; e <= 44; e++) {
                        for (let f = e + 1; f <= 45; f++) {
                            if (needOe) {
                                let odd = 0;
                                if (a % 2) odd++;
                                if (b % 2) odd++;
                                if (c % 2) odd++;
                                if (d % 2) odd++;
                                if (e % 2) odd++;
                                if (f % 2) odd++;
                                if (odd !== targetOe) continue;
                            }
                            if (needSeq) {
                                const seq = countSequentialPairs([a, b, c, d, e, f]);
                                if (seq !== targetSeq) continue;
                            }
                            if (needHc) {
                                let h = 0;
                                if (hotSet.has(a)) h++;
                                if (hotSet.has(b)) h++;
                                if (hotSet.has(c)) h++;
                                if (hotSet.has(d)) h++;
                                if (hotSet.has(e)) h++;
                                if (hotSet.has(f)) h++;
                                if (h !== targetHc) continue;
                            }
                            cnt++;
                        }
                    }
                }
            }
        }
    }

    const out = { count: cnt, total: LOTTO_645_TOTAL_COMBOS };
    _savedTargetComboCountMemo.set(memoKey, out);
    return out;
}

// checkOddEvenRatio → generator.js 로 이동되었습니다.

function checkStatFilter(sorted, statFilter) {
    if (!isStatFilter(statFilter)) {
        return true;
    }
    const highCountNumbers = new Set(getFilteredNumbersByCount(true));
    return sorted.every(n => highCountNumbers.has(n));
}

// checkSequence → generator.js 로 이동되었습니다.

function checkHotCold(sorted, hotColdFilter, statFilter) {
    if (!canApplyHotColdFilter(statFilter) || !hotColdFilter || hotColdFilter === "none") {
        return true;
    }

    const { hot, cold } = getHotColdNumbers();
    const hotSet = new Set(hot);
    const coldSet = new Set(cold);

    const hotCount = sorted.filter(n => hotSet.has(n)).length;
    const coldCount = sorted.filter(n => coldSet.has(n)).length;

    const targetRatio = HOT_COLD_RATIO_MAP[hotColdFilter];
    return targetRatio ? hotCount === targetRatio.hot && coldCount === targetRatio.cold : true;
}

function passesConstraints(nums, filters) {
    const sorted = sortNumbers(nums);

    const statFilterCheck = checkStatFilter(sorted, filters.statFilter);
    const sequenceCheck = checkSequence(sorted, filters.sequence);
    const hotColdCheck = checkHotCold(sorted, filters.hotCold, filters.statFilter);
    const oddEvenCheck = checkOddEvenRatio(sorted, filters.oddEven);

    return statFilterCheck && sequenceCheck && hotColdCheck && oddEvenCheck;
}

function getFilteredPool() {
    const pool = getAllNumbers();
    let filteredPool = pool;

    const isCount = isCountFilter(AppState.activeFilters.statFilter);
    const isPercentage = isPercentageFilter(AppState.activeFilters.statFilter);

    if (isCount || isPercentage) {
        const highCountNumbers = new Set(getFilteredNumbersByCount(true));
        filteredPool = filteredPool.filter(n => highCountNumbers.has(n));
        if (isCount) {
            const descending = AppState.activeFilters.statFilter === "count-desc";
            sortByStat(filteredPool, true, descending);
        } else {
            const descending = AppState.activeFilters.statFilter === "percentage-desc";
            sortByStat(filteredPool, false, descending);
        }
    }

    filteredPool = applyOddEvenFilter(filteredPool, AppState.activeFilters.oddEven);
    if (canApplyHotColdFilter(AppState.activeFilters.statFilter)) {
        filteredPool = applyHotColdFilter(filteredPool, AppState.activeFilters.hotCold);
    }

    return filteredPool;
}

// selectNumbersWithOddEvenRatio는 modules/generator.js (getOddEvenTargetCounts 동반)

function getOddEvenNumbers() {
    const odd = [];
    const even = [];
    for (let i = 1; i <= 45; i++) {
        if (i % 2 === 0) even.push(i);
        else odd.push(i);
    }
    return { odd, even };
}

function applyOddEvenFilter(numbers, oddEvenFilter) {
    if (numbers.length === 0 || oddEvenFilter === "none") {
        return numbers;
    }

    const { odd, even } = getOddEvenNumbers();
    const oddSet = new Set(odd);
    const evenSet = new Set(even);

    if (oddEvenFilter === "odd" || oddEvenFilter === "even" || oddEvenFilter === "balanced") {
        return numbers.filter(n => oddSet.has(n) || evenSet.has(n));
    }
    return numbers;
}

function applyHotColdFilter(numbers, hotColdFilter) {
    if (numbers.length === 0 || hotColdFilter === "none") {
        return numbers;
    }

    const { hot, cold } = getHotColdNumbers();
    const hotSet = new Set(hot);
    const coldSet = new Set(cold);

    if (hotColdFilter === "hot" || hotColdFilter === "cold" || hotColdFilter === "mixed") {
        return numbers.filter(n => hotSet.has(n) || coldSet.has(n));
    }
    return numbers;
}

function canApplyHotColdFilter(statFilter) {
    if (statFilter === 'none') {
        return false;
    }
    return isCountFilter(AppState.activeFilters.statFilter);
}

/**
 * 게임 로직 모듈
 * 번호 생성, 필터링, 제약 조건 체크 등의 게임 로직을 담당합니다.
 */

/**
 * 홀짝 비율에 맞춰 번호 선택
 */
// selectNumbersWithOddEvenRatio → modules/generator.js 로 이동되었습니다.

/**
 * 6개 번호 선택 (기본)
 */
// pickSix → modules/utils/lottoUtils.js 로 이동되었습니다.

/**
 * 연속된 번호 쌍 찾기
 */
function findSequentialPairs(numbers) {
    const sorted = sortNumbers(numbers);
    const pairs = [];
    for (let i = 1; i < sorted.length; i++) {
        if (sorted[i] === sorted[i - 1] + 1) {
            pairs.push([sorted[i - 1], sorted[i]]);
        }
    }
    return pairs;
}

/**
 * UI 헬퍼 함수 모듈
 * UI 렌더링에 사용되는 유틸리티 함수들
 */

/**
 * 번호에 따른 공 클래스 반환 (동행복권 색상)
 */
function getBallClass(num) {
    if (num <= 10) return "ball-yellow";    // 1-10: 노란색 (#FBC400)
    if (num <= 20) return "ball-blue";      // 11-20: 파란색 (#69C8F2)
    if (num <= 30) return "ball-red";       // 21-30: 빨간색 (#FF7272)
    if (num <= 40) return "ball-gray";      // 31-40: 회색 (#AAAAAA)
    return "ball-green";                    // 41-45: 녹색 (#B0D840)
}

/**
 * RGB를 보색으로 변환
 */
function getComplementaryColor(hex) {
    // # 제거
    hex = hex.replace('#', '');

    // RGB 추출
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);

    // 보색 계산 (255에서 각 값을 빼기)
    const compR = 255 - r;
    const compG = 255 - g;
    const compB = 255 - b;

    // 밝기 계산 (상대적 밝기)
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;

    // 밝은 배경이면 어두운 글자, 어두운 배경이면 밝은 글자
    if (brightness > 128) {
        return SHAREHARMONY_PALETTE.black;
    } else {
        return SHAREHARMONY_PALETTE.white;
    }
}

/**
 * 통계용/게임용 공 생성 (ShareHarmony 스타일 적용)
 */
/**
 * 번호에 따른 동행복권 컬러 클래스 반환
 */
// getBallColorClass, createStatBall, createPlusSign → modules/renderer.js 로 이동되었습니다.

/**
 * 애플리케이션 초기화 함수
 */
async function initializeApp() {
    const statsListEl = document.getElementById('statsList');
    const viewNumbersListEl = document.getElementById('viewNumbersList');
    const setLoadError = (msg) => {
        if (statsListEl) statsListEl.innerHTML = '<p class="load-error">' + msg + '</p>';
        if (viewNumbersListEl) viewNumbersListEl.innerHTML = '<p class="load-error">' + msg + '</p>';
    };

    try {
        if (typeof XLSX === 'undefined') {
            setLoadError('XLSX 라이브러리를 불러올 수 없습니다. 인터넷 연결과 스크립트를 확인해 주세요.');
            alert('SheetJS(XLSX) 라이브러리가 로드되지 않았습니다. 페이지를 새로고침하거나 인터넷 연결을 확인해 주세요.');
            return;
        }

        // 함수 참조 가져오기 (window 객체 또는 전역 스코프)
        const loadFunc = (typeof window !== 'undefined' && window.loadLotto645Data)
            ? window.loadLotto645Data
            : (typeof loadLotto645Data !== 'undefined' ? loadLotto645Data : null);

        if (!loadFunc || typeof loadFunc !== 'function') {
            throw new Error('loadLotto645Data 함수에 접근할 수 없습니다.');
        }

        // 회차별 당첨번호는 항상 Lotto645.xlsx만 사용. localStorage에 캐시된 과거 데이터가 있으면
        // Excel(예: 최종 1200회)과 달리 1201~1209회가 보일 수 있으므로, 로드 시 Lotto645 관련
        // localStorage 키를 제거해 두어 항상 서버의 Lotto645.xlsx만 읽어오도록 함.
        try {
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && /lotto645|Lotto645|allLotto645|회차별당첨/i.test(key)) keysToRemove.push(key);
            }
            keysToRemove.forEach(k => { localStorage.removeItem(k); });
            if (keysToRemove.length > 0) { /* Lotto645 관련 localStorage 키 제거 */ }
        } catch (e) { /* localStorage 비활성화 등 무시 */ }

        /** 먼저 메타 호출 → 서버가 Lotto645.json을 xlsx와 동기화한 뒤 로드(Railway 등 JSON만 늦게 갱신된 경우 방지) */
        let meta = {};
        try {
            const metaRes = await fetch(getApiBaseUrl() + '/api/lotto645-meta', { cache: 'no-store' });
            meta = await metaRes.json().catch(() => ({}));
        } catch (e) { /* 메타 조회 실패 시 무시 */ }

        let lotto645Data = await loadFunc();
        if (meta.dataRows != null && meta.dataRows !== lotto645Data.length) {
            try { localStorage.removeItem('LOTTO645_DATA_CACHE_V2'); } catch (e2) { /* ignore */ }
            lotto645Data = await loadFunc();
        }
        AppState.previousDataCount = lotto645Data ? lotto645Data.length : 0;
        if (meta.dataRows != null && meta.dataRows !== lotto645Data.length) {
            alert('회차별 당첨번호가 서버 데이터와 다릅니다.\n서버(xlsx 기준): ' + meta.dataRows + '건, 수신: ' + lotto645Data.length + '건\n캐시를 비우고 강력 새로고침(Ctrl+Shift+R) 해 주세요. 문제가 계속되면 서버에서 Lotto645.xlsx와 .json을 확인하세요.');
        }
        if (lotto645Data.length === 0) {
            const errMsg = 'XLSX 파일을 불러올 수 없습니다. 서버를 실행한 뒤 접속해 주세요. (start-server.bat 또는 python server.py)';
            setLoadError(errMsg);
            alert(errMsg);
            return;
        }

        // 통계 초기화 (AppState.startRound, endRound 설정 포함)
        await initializeStats(lotto645Data);

        // [Fix] 초기 화면 렌더링 (로딩 메시지 제거)
        if (typeof renderStats === 'function') renderStats(lotto645Data);
        if (typeof updateRoundRangeDisplay === 'function') updateRoundRangeDisplay();
        // 동행복권 최신 추첨정보
        try {
            const latestRes = await fetch(getApiBaseUrl() + '/api/lotto-latest', { cache: 'no-store' });
            const latestData = await latestRes.json().catch(() => ({}));
            if (latestData.returnValue === 'success' && latestData.drwNo != null) {
                AppState.latestRoundApi = latestData.drwNo;
                AppState.latestRoundDateApi = latestData.drwNoDate || '';
            }
        } catch (e) { /* 무시 */ }
        // Lotto645.xlsx 1회~동행복권 최신회차 검증, 누락 회차 있으면 서버에서 Excel 보완 (sync-lotto645)
        if (lotto645Data.length > 0 && AppState.latestRoundApi != null && AppState.endRound != null && AppState.latestRoundApi > AppState.endRound) {
            const missingCount = AppState.latestRoundApi - AppState.endRound;
            const base = getApiBaseUrl();
            try {
                // 누락이 소수(예: 9회)일 때만 fetch-missing-rounds 호출. 대량(예: 1200회)이면 URL/부하 방지를 위해 생략하고 sync만 호출
                if (missingCount > 0 && missingCount <= 100) {
                    const missingRounds = [];
                    for (let r = AppState.endRound + 1; r <= AppState.latestRoundApi; r++) missingRounds.push(r);
                    await fetch(base + '/api/fetch-missing-rounds?rounds=' + missingRounds.join(','), { cache: 'no-store' });
                }
                const syncRes = await fetch(base + '/api/sync-lotto645', { method: 'POST', cache: 'no-store' });
                const syncData = await syncRes.json().catch(() => ({}));
                if (syncData.returnValue === 'success' && syncData.added > 0) {
                    const newData = await loadFunc('', { bypassCache: true });
                    if (newData && newData.length > 0) {
                        initializeStats(newData);
                        const endInput = document.getElementById('endDate');
                        if (endInput && AppState.latestRoundDateApi) {
                            const apiDateObj = parseDate(String(AppState.latestRoundDateApi).trim());
                            if (apiDateObj && apiDateObj instanceof Date && !isNaN(apiDateObj.getTime())) {
                                endInput.value = formatDateYYMMDD(apiDateObj);
                            }
                        }
                        if (typeof updateRoundRangeDisplay === 'function') updateRoundRangeDisplay();
                        if (typeof renderStats === 'function') renderStats(newData);
                    }
                } else if (syncData.returnValue === 'fail' && syncData.error) {
                    alert('회차 추가 실패: ' + syncData.error + '\nExcel에서 Lotto645.xlsx를 닫고 새로고침 후 다시 시도하세요.');
                }
            } catch (syncErr) { /* 누락 회차 조회/동기화 실패 시 무시 */ }
        }

        // 날짜 입력 필드 초기값: 시작 1회(또는 Excel 첫 회차), 종료 동행복권 최신 당첨회차
        const startDateInput = document.getElementById('startDate');
        const endDateInput = document.getElementById('endDate');
        const selectBtn = document.getElementById('selectDateRangeBtn');

        if (startDateInput && endDateInput && lotto645Data.length > 0) {
            // 시작일: 1회차 날짜 (Excel에 1회 있으면 사용, 없으면 가장 오래된 회차)
            const firstRound = lotto645Data[lotto645Data.length - 1];
            if (firstRound && firstRound.date) {
                const firstDate = parseDate(firstRound.date);
                startDateInput.value = formatDateYYMMDD(firstDate);
            }
            // 종료일: 동행복권 최신 당첨회차 날짜 (API 있으면 사용, 없으면 Excel 최신)
            if (AppState.latestRoundDateApi) {
                const apiDateObj = parseDate(String(AppState.latestRoundDateApi).trim());
                if (apiDateObj && apiDateObj instanceof Date && !isNaN(apiDateObj.getTime())) {
                    endDateInput.value = formatDateYYMMDD(apiDateObj);
                } else {
                    endDateInput.value = String(AppState.latestRoundDateApi).slice(0, 10).replace(/(\d{4})-(\d{2})-(\d{2})/, (_, y, m, d) => `${y}/${m}/${d}`);
                }
            } else {
                const lastRound = lotto645Data[0];
                if (lastRound && lastRound.date) {
                    const lastDate = parseDate(lastRound.date);
                    endDateInput.value = formatDateYYMMDD(lastDate);
                } else {
                    const today = new Date();
                    endDateInput.value = formatDateYYMMDD(today);
                }
            }

            // 날짜 입력 필드 포맷 자동 정리 (blur 시): 조회기간 yy/mm/dd 검증 및 치환
            startDateInput.addEventListener('blur', function () {
                let value = this.value.trim();
                if (!value) {
                    updateRoundDisplay();
                    return;
                }

                // 8자리, 00000000, yyyy-mm-dd, yyyy/mm/dd → yy/mm/dd 치환
                const normalized = normalizeToYYMMDD(value);
                if (normalized !== null) {
                    this.value = normalized;
                    value = normalized;
                }

                // 4자리 이내 숫자는 회차로 처리
                if (isRoundInput(value)) {
                    const roundNum = parseInt(value);
                    const dateStr = convertRoundToDate(value);
                    if (dateStr) {
                        this.value = dateStr;
                        updateRoundDisplay();
                        updateRoundRangeDisplay();
                        // 종료일과 비교 검증
                        if (!validateDateRange()) {
                            this.value = '';
                            updateRoundDisplay();
                            return;
                        }
                    } else {
                        // 실제 회차 번호로 에러 메시지 표시 (앞의 0 제거된 숫자)
                        alert(`회차 ${roundNum}에 해당하는 데이터가 없습니다.`);
                        this.value = '';
                        updateRoundDisplay();
                    }
                    return;
                }

                // 6자리 숫자는 날짜로 처리 → 해당 날짜를 포함하는 회차의 날짜로 변환
                if (/^\d{6}$/.test(value)) {
                    const isStartDate = this.id === 'startDate';
                    const roundDate = convertDateToRoundDate(value, isStartDate);
                    if (roundDate) {
                        this.value = roundDate;
                        updateRoundDisplay();
                        updateRoundRangeDisplay();
                        // 종료일과 비교 검증
                        if (!validateDateRange()) {
                            this.value = '';
                            updateRoundDisplay();
                            return;
                        }
                    } else {
                        alert(`${isStartDate ? '시작일' : '종료일'}에 해당하는 회차를 찾을 수 없습니다.`);
                        this.value = '';
                        updateRoundDisplay();
                    }
                    return;
                }

                // yy/mm/dd 형식인 경우: 검증 후 정규화
                const yymmddCheck = validateYYMMDDInput(value);
                if (!yymmddCheck.valid) {
                    if (value.includes('/') || /^\d{6,8}$/.test(value.replace(/\D/g, ''))) {
                        alert(yymmddCheck.message || '조회기간은 yy/mm/dd 형식으로 입력해 주세요.');
                        this.value = '';
                        updateRoundDisplay();
                        return;
                    }
                }
                const date = parseDate(value);
                if (date && date !== '000000' && date !== '999999') {
                    this.value = formatDateYYMMDD(date);
                    updateRoundDisplay();
                    updateRoundRangeDisplay();
                    if (!validateDateRange()) {
                        this.value = '';
                        updateRoundDisplay();
                        return;
                    }
                } else {
                    alert('날짜 또는 회차 형식이 올바르지 않습니다. (조회기간: yy/mm/dd)');
                    this.value = '';
                    updateRoundDisplay();
                }
            });

            endDateInput.addEventListener('blur', function () {
                let value = this.value.trim();
                if (!value) {
                    updateRoundDisplay();
                    return;
                }

                // 8자리, 00000000, yyyy-mm-dd, yyyy/mm/dd → yy/mm/dd 치환
                const normalized = normalizeToYYMMDD(value);
                if (normalized !== null) {
                    this.value = normalized;
                    value = normalized;
                }

                // 4자리 이내 숫자는 회차로 처리
                if (isRoundInput(value)) {
                    const roundNum = parseInt(value);
                    const dateStr = convertRoundToDate(value);
                    if (dateStr) {
                        this.value = dateStr;
                        updateRoundDisplay();
                        updateRoundRangeDisplay();
                        // 시작일과 비교 검증
                        if (!validateDateRange()) {
                            this.value = '';
                            updateRoundDisplay();
                            return;
                        }
                    } else {
                        // 실제 회차 번호로 에러 메시지 표시 (앞의 0 제거된 숫자)
                        alert(`회차 ${roundNum}에 해당하는 데이터가 없습니다.`);
                        this.value = '';
                        updateRoundDisplay();
                    }
                    return;
                }

                // 6자리 숫자는 날짜로 처리 → 해당 날짜를 포함하는 회차의 날짜로 변환
                if (/^\d{6}$/.test(value)) {
                    const isStartDate = this.id === 'startDate';
                    const roundDate = convertDateToRoundDate(value, isStartDate);
                    if (roundDate) {
                        this.value = roundDate;
                        updateRoundDisplay();
                        updateRoundRangeDisplay();
                        // 시작일과 비교 검증
                        if (!validateDateRange()) {
                            this.value = '';
                            updateRoundDisplay();
                            return;
                        }
                    } else {
                        alert(`${isStartDate ? '시작일' : '종료일'}에 해당하는 회차를 찾을 수 없습니다.`);
                        this.value = '';
                        updateRoundDisplay();
                    }
                    return;
                }

                // yy/mm/dd 형식인 경우: 검증 후 정규화
                const yymmddCheckEnd = validateYYMMDDInput(value);
                if (!yymmddCheckEnd.valid) {
                    if (value.includes('/') || /^\d{6,8}$/.test(value.replace(/\D/g, ''))) {
                        alert(yymmddCheckEnd.message || '조회기간은 yy/mm/dd 형식으로 입력해 주세요.');
                        this.value = '';
                        updateRoundDisplay();
                        return;
                    }
                }
                const date = parseDate(value);
                if (date && date !== '000000' && date !== '999999') {
                    this.value = formatDateYYMMDD(date);
                    updateRoundDisplay();
                    updateRoundRangeDisplay();
                    if (!validateDateRange()) {
                        this.value = '';
                        updateRoundDisplay();
                        return;
                    }
                } else {
                    alert('날짜 또는 회차 형식이 올바르지 않습니다. (조회기간: yy/mm/dd)');
                    this.value = '';
                    updateRoundDisplay();
                }
            });

            // 입력 중 실시간 변환: 8자리, 00000000, yyyy-mm-dd, yyyy/mm/dd → yy/mm/dd 치환
            function applyDateInputFormat(el) {
                const value = el.value.trim();
                const normalized = normalizeToYYMMDD(value);
                if (normalized !== null && normalized !== value) {
                    el.value = normalized;
                    updateRoundRangeDisplay();
                }
            }

            startDateInput.addEventListener('input', function () {
                applyDateInputFormat(this);
                const value = this.value.trim();

                // 4자리 이내 숫자 입력 완료 시 회차로 변환
                if (isRoundInput(value)) {
                    const dateStr = convertRoundToDate(value);
                    if (dateStr) {
                        setTimeout(() => {
                            if (this.value.trim() === value) {
                                this.value = dateStr;
                                updateRoundRangeDisplay();
                            }
                        }, 500);
                    }
                    return;
                }

                // 6자리 숫자 입력 완료 시 날짜로 변환 → 해당 날짜를 포함하는 회차의 날짜로 변환
                if (/^\d{6}$/.test(value)) {
                    const isStartDate = this.id === 'startDate';
                    const roundDate = convertDateToRoundDate(value, isStartDate);
                    if (roundDate) {
                        setTimeout(() => {
                            if (this.value.trim() === value) {
                                this.value = roundDate;
                                updateRoundRangeDisplay();
                            }
                        }, 500);
                    }
                    return;
                }

                updateRoundDisplay();
                updateRoundRangeDisplay();
            });

            endDateInput.addEventListener('input', function () {
                applyDateInputFormat(this);
                const value = this.value.trim();

                // 4자리 이내 숫자 입력 완료 시 회차로 변환
                if (isRoundInput(value)) {
                    const dateStr = convertRoundToDate(value);
                    if (dateStr) {
                        setTimeout(() => {
                            if (this.value.trim() === value) {
                                this.value = dateStr;
                                updateRoundDisplay();
                                updateRoundRangeDisplay();
                            }
                        }, 500);
                    }
                    return;
                }

                // 6자리 숫자 입력 완료 시 날짜로 변환
                if (/^\d{6}$/.test(value)) {
                    const isStartDate = this.id === 'startDate';
                    const roundDate = convertDateToRoundDate(value, isStartDate);
                    if (roundDate) {
                        setTimeout(() => {
                            if (this.value.trim() === value) {
                                this.value = roundDate;
                                updateRoundDisplay();
                                updateRoundRangeDisplay();
                            }
                        }, 500);
                    }
                    return;
                }

                updateRoundDisplay();
                updateRoundRangeDisplay();
            });


            // 초기 회차 범위 표시
            updateRoundDisplay();
            updateRoundRangeDisplay();

            // 선택 버튼 클릭 시 날짜 필터링 적용
            // 선택 버튼 클릭 시 날짜 필터링 적용
            const selectBtnTag = document.getElementById('selectDateRangeBtn');
            if (selectBtnTag) {
                // console.log('[App] Attaching click event to selectDateRangeBtn');
                selectBtnTag.addEventListener('click', updateStatsByDateRange);
            } else {
                console.error('[App] selectDateRangeBtn not found!');
            }


        }

        // 기본값 설정 (1회차 ~ 최신 회차)
        if (lotto645Data.length > 0) {
            const startRoundInput = document.getElementById('startRound');
            const endRoundInput = document.getElementById('endRound');
            const maxRound = lotto645Data[0].round;
            if (startRoundInput) startRoundInput.value = 1;
            if (endRoundInput) endRoundInput.value = maxRound;

            // 날짜 입력칸 동기화
            updateRoundDisplay();

            // 전체 범위로 필터링하여 렌더링
            setTimeout(() => {
                updateStatsByDateRange();
            }, 100);
        } else {
            renderStats(lotto645Data);
        }

        // 기본: 연속빈도(연속쌍 출현 횟수 내림차순)
        AppState.seqFilterType = null;
        AppState.currentSort = 'consecutive-asc';
        updateSortButtons('seq');

        // 필터 이벤트 리스너 설정
        setupFilterListeners();

        // [ShareHarmony] 마스터 생성 버튼 리스너 추가
        const masterGenBtn = document.getElementById('masterGenerateBtn');
        if (masterGenBtn) {
            masterGenBtn.addEventListener('click', generateGoldenAiGames);
        }

        // 게임박스 초기화
        initializeGameBox();
        const saveRoundEl = document.getElementById('saveRound');
        if (saveRoundEl) saveRoundEl.value = '';

        // 정렬 버튼 설정
        setupSortButtons();

        // 초기 정렬 상태 반영
        renderStatsList();
        renderNumberGrid();

        // 필터 이벤트 리스너 설정
        setupFilterListeners();

        // 저장 버튼 이벤트 리스너 설정
        setupSaveButton();

        sanitizeOptionFilterSelectValues();

        // 결과박스 초기 로드
        await loadAndDisplayResults();

        if (typeof syncBottomChartsToSortState === 'function') syncBottomChartsToSortState();

        // 선택삭제 버튼 설정
        setupDeleteSelectedButton();

        // 애플리케이션 초기화 완료 이벤트 발생 (다른 스크립트에서 사용 가능)
        if (typeof window.onAppInitialized === 'function') {
            window.onAppInitialized();
        }

    } catch (error) {
        alert('애플리케이션 초기화 중 오류가 발생했습니다: ' + error.message);
    }
}

/**
 * 선택공 그리드 렌더링 함수 (정렬에 따라)
 */
// renderNumberGrid → modules/renderer.js 로 이동되었습니다.

/**
 * 한 라운드에서 연속 번호 쌍(2개) 추출
 */
function getConsecutivePairs(nums) {
    const pairs = [];
    for (let i = 0; i < nums.length - 1; i++) {
        if (nums[i + 1] === nums[i] + 1) {
            pairs.push([nums[i], nums[i + 1]]);
        }
    }
    return pairs;
}

/**
 * 한 라운드에서 minLen개 이상 연속 run 추출
 */
function getConsecutiveRuns(nums, minLen) {
    const runs = [];
    let i = 0;
    while (i < nums.length) {
        const run = [nums[i]];
        while (i + 1 < nums.length && nums[i + 1] === nums[i] + 1) {
            i++;
            run.push(nums[i]);
        }
        if (run.length >= minLen) runs.push(run);
        i++;
    }
    return runs;
}

/**
 * 연속 번호 통계 계산
 * 연속 1회: 2개 연속 쌍 (1,2), (5,6) 등
 * 연속 2회: 3개 연속 run (1,2,3) + 2쌍 조합 (1,2 / 10,11)
 * 연속 3회: 3개 이상 연속 run (1,2,3), (1,2,3,4), (1,2,3,4,5) 등 + 3쌍 조합
 */
// computeConsecutiveStats → modules/statistics.js 로 이동되었습니다.

/**
 * 연속 1회+2회+3회 통합
 */
function computeAllConsecutiveStats(rounds) {
    const s1 = computeConsecutiveStats(rounds, 1).map(e => ({ ...e, seqType: 1 }));
    const s2 = computeConsecutiveStats(rounds, 2).map(e => ({ ...e, seqType: 2 }));
    const s3 = computeConsecutiveStats(rounds, 3).map(e => ({ ...e, seqType: 3 }));
    return [...s1, ...s2, ...s3].sort((a, b) => b.count - a.count);
}

/**
 * 선택한 연속 행의 회차를 회차별 당첨번호에 출력 (당첨번호 내림차순)
 */
// renderViewNumbersFromSelectedRounds → modules/renderer.js 로 이동되었습니다.

/**
 * 통계 리스트 렌더링 함수
 */
// renderStatsList → modules/renderer.js 로 이동되었습니다.

/**
 * 게임공(게임박스) 초기화
 */
// initializeGameBox → modules/eventHandlers.js 로 이동되었습니다.

/**
 * 정렬 버튼 설정
 */
// setupSortButtons → modules/eventHandlers.js 로 이동되었습니다.

/**
 * 정렬 버튼 활성화 상태 업데이트
 */
// updateSortButtons → modules/renderer.js 로 이동되었습니다.

/** 옵션 필터 DOM → AppState.optionFilters 동기화 */
function syncOptionFiltersAppStateFromDom() {
    if (!AppState.optionFilters) {
        AppState.optionFilters = { oddEven: 'none', hotCold: 'none', consecutive: 'none', avgLow: null, avgHigh: null };
    }
    const oe = document.getElementById('filterOddEven');
    const hc = document.getElementById('filterHotCold');
    const sq = document.getElementById('filterConsecutive');
    if (oe) AppState.optionFilters.oddEven = oe.value;
    if (hc) AppState.optionFilters.hotCold = hc.value;
    if (sq) AppState.optionFilters.consecutive = sq.value;
    const low = document.getElementById('filterAvgLow');
    const high = document.getElementById('filterAvgHigh');
    if (low && low.value !== '') {
        const v = parseFloat(low.value);
        if (!Number.isNaN(v)) AppState.optionFilters.avgLow = v;
    }
    if (high && high.value !== '') {
        const v = parseFloat(high.value);
        if (!Number.isNaN(v)) AppState.optionFilters.avgHigh = v;
    }
}

/** UI에서 뺀 극한 옵션 값이 남아 있으면 맞춤(구버전·붙여넣기 대비). AC 기본 8 */
function sanitizeOptionFilterSelectValues() {
    const bad = {
        filterOddEven: ['6-0', '0-6'],
        filterHotCold: ['6-0', '0-6'],
        filterConsecutive: ['0'],
        filterAC: ['0', '1', '2', '3', '4', '5']
    };
    Object.keys(bad).forEach(function (id) {
        const el = document.getElementById(id);
        if (!el || bad[id].indexOf(el.value) < 0) return;
        el.value = id === 'filterAC' ? '8' : 'none';
    });
    if (AppState.optionFilters) {
        const oe = document.getElementById('filterOddEven');
        const hc = document.getElementById('filterHotCold');
        const sq = document.getElementById('filterConsecutive');
        const ac = document.getElementById('filterAC');
        if (oe) AppState.optionFilters.oddEven = oe.value;
        if (hc) AppState.optionFilters.hotCold = hc.value;
        if (sq) AppState.optionFilters.consecutive = sq.value;
        if (ac) AppState.optionFilters.ac = ac.value;
    }
}

/**
 * 필터 리스너 설정
 */
// setupFilterListeners → modules/eventHandlers.js 로 이동되었습니다.

/**
 * 공 클릭 핸들러 (선택공 그리드) — 모드선택 제거로 그리드 단독 클릭은 미사용, 수동 시 게임공 클릭으로 처리
 */
function handleBallClick(number) {
    // 수동 모드에서는 게임공 클릭으로 번호 선택/교체 처리
}

/**
 * 현재 선택 중인 게임 인덱스와 공 인덱스
 */
let currentSelectingGameIndex = null;
let currentSelectingBallIndex = null;

/**
 * 수동 모드 게임공 클릭 핸들러
 */
function handleManualBallClick(gameIndex, ballIndex) {
    const modeBtn = document.getElementById('modeBtn' + gameIndex);
    if (!modeBtn || modeBtn.dataset.mode !== 'manual') return;

    // 이미 번호가 있으면 삭제
    if (!AppState.setSelectedBalls) {
        AppState.setSelectedBalls = Array.from({ length: 5 }, () => []);
    }
    if (!AppState.setSelectedBalls[gameIndex - 1]) {
        AppState.setSelectedBalls[gameIndex - 1] = [];
    }

    if (AppState.setSelectedBalls[gameIndex - 1][ballIndex]) {
        // 번호 삭제
        AppState.setSelectedBalls[gameIndex - 1][ballIndex] = undefined;
        // 배열 정리
        AppState.setSelectedBalls[gameIndex - 1] = AppState.setSelectedBalls[gameIndex - 1].filter(n => n);
        const modeBtn = document.getElementById(`modeBtn${gameIndex}`);
        const currentMode = modeBtn ? modeBtn.dataset.mode : 'manual';
        const numbers = AppState.setSelectedBalls[gameIndex - 1] || [];
        updateGameSet(gameIndex, currentMode);
        // 합계 업데이트 (updateGameSet 내부에서도 하지만, 여기서도 명시적으로)
        updateGameSum(gameIndex, numbers);

        // 체크박스 상태 업데이트
        const checkbox = document.getElementById(`gameCheckbox${gameIndex}`);
        if (checkbox) {
            const validNumbers = numbers.filter(n => n && n >= 1 && n <= 45);
            if (validNumbers.length < 6) {
                checkbox.checked = false;
                checkbox.disabled = true;
            }
        }
        updateSaveBoxState();
        return;
    }

    // 선택 모드일 때 게임공 클릭 시 선택 대기 상태로 설정
    currentSelectingGameIndex = gameIndex;
    currentSelectingBallIndex = ballIndex;

    // 선택공 그리드의 공에 선택 가능 표시
    const gridBalls = document.querySelectorAll('.number-grid-container .stat-ball');
    gridBalls.forEach(ball => {
        ball.style.opacity = '1';
        ball.style.cursor = 'pointer';
        ball.style.transform = 'scale(1)';
    });

    // 선택 중인 게임공 하이라이트
    const selectingBall = document.querySelector(`#gameBalls${gameIndex} > div:nth-child(${ballIndex + 1})`);
    if (selectingBall) {
        selectingBall.style.border = '2px solid ' + SHAREHARMONY_PALETTE.selectionBorder;
        selectingBall.style.boxShadow = '0 0 8px rgba(0, 102, 255, 0.5)';
    }
}

/**
 * 선택공 그리드의 공 클릭 핸들러 (수동/반자동 모드용)
 */
function handleSelectBallClick(number) {
    if (currentSelectingGameIndex === null || currentSelectingBallIndex === null) {
        return;
    }

    // 같은 게임에 이미 선택된 번호인지 확인
    if (!AppState.setSelectedBalls) {
        AppState.setSelectedBalls = Array.from({ length: 5 }, () => []);
    }
    if (!AppState.setSelectedBalls[currentSelectingGameIndex - 1]) {
        AppState.setSelectedBalls[currentSelectingGameIndex - 1] = [];
    }

    const currentNumbers = AppState.setSelectedBalls[currentSelectingGameIndex - 1] || [];
    // 이미 선택된 번호면 다른 위치에 있는 경우에만 교체 불가 (중복 방지)
    if (currentNumbers.includes(number) && currentNumbers[currentSelectingBallIndex] !== number) {
        alert('이미 선택된 번호입니다.');
        return;
    }

    AppState.setSelectedBalls[currentSelectingGameIndex - 1][currentSelectingBallIndex] = number;

    // 모드 버튼 확인하여 모드 결정
    const modeBtn = document.getElementById(`modeBtn${currentSelectingGameIndex}`);
    const currentMode = modeBtn ? modeBtn.dataset.mode : 'manual';

    // 반자동 모드인 경우 선택공으로 교체
    if (currentMode === 'semi-auto') {
        const selectingBallElement = document.querySelector(`#gameBalls${currentSelectingGameIndex} > div[data-ball-index="${currentSelectingBallIndex}"]`);
        if (selectingBallElement) {
            // 선택공으로 교체
            const newBall = createStatBall(number, 22, '0.8rem');
            newBall.style.cursor = 'pointer';
            newBall.dataset.gameIndex = currentSelectingGameIndex;
            newBall.dataset.ballIndex = currentSelectingBallIndex;
            newBall.dataset.isSelected = 'true';

            newBall.addEventListener('click', () => {
                const cb = document.getElementById(`gameCheckbox${currentSelectingGameIndex}`);
                if (cb && cb.checked) return; // 체크된 상태에서는 교체 불가

                // 하이라이트 초기화 (다른 모든 게임공의 하이라이트 제거)
                const allGameBalls = document.querySelectorAll('[id^="gameBalls"] > div');
                allGameBalls.forEach(b => {
                    if (b.dataset.isSelected === 'true') {
                        const bNum = parseInt(b.textContent);
                        const bClass = getBallColorClass(bNum);
                        const bgColors = {
                            'color-yellow': '#FBC400',
                            'color-blue': '#69C8F2',
                            'color-red': '#FF7272',
                            'color-gray': '#AAAAAA',
                            'color-green': '#B0D840'
                        };
                        b.style.backgroundColor = bgColors[bClass] || '#808080';
                        b.style.color = '#333';
                        b.style.border = 'none';
                    } else {
                        b.style.border = '';
                        b.style.boxShadow = '';
                    }
                });

                const ballClass = getBallColorClass(number);
                const bgColors = {
                    'color-yellow': '#FBC400',
                    'color-blue': '#69C8F2',
                    'color-red': '#FF7272',
                    'color-gray': '#AAAAAA',
                    'color-green': '#B0D840'
                };
                const bgColor = bgColors[ballClass] || '#808080';
                const compHex = getComplementaryColor(bgColor);

                newBall.style.backgroundColor = compHex;
                newBall.style.color = bgColor; // 글자색은 배경색으로 (보색 대비)
                newBall.style.border = `2px solid ${bgColor}`;

                // 선택 대기 상태로 설정
                currentSelectingGameIndex = parseInt(newBall.dataset.gameIndex);
                currentSelectingBallIndex = parseInt(newBall.dataset.ballIndex);
            });
            selectingBallElement.replaceWith(newBall);
        }
        // 반자동 모드 합계 업데이트
        const numbers = AppState.setSelectedBalls[currentSelectingGameIndex - 1] || [];
        updateGameSum(currentSelectingGameIndex, numbers);

        // 반자동 모드에서 6개 선택되면 체크박스 활성화
        const checkbox = document.getElementById(`gameCheckbox${currentSelectingGameIndex}`);
        if (checkbox) {
            const validNumbers = numbers.filter(n => n && n >= 1 && n <= 45);
            checkbox.disabled = validNumbers.length !== 6;
        }

    } else { // manual mode
        // 수동 모드 설정 반영
        AppState.setSelectedBalls[currentSelectingGameIndex - 1] = AppState.setSelectedBalls[currentSelectingGameIndex - 1].sort((a, b) => a - b);
        updateGameSet(currentSelectingGameIndex, currentMode);

        let numbers = AppState.setSelectedBalls[currentSelectingGameIndex - 1] || [];
        updateGameSum(currentSelectingGameIndex, numbers);

        const validNumbers = numbers.filter(n => n && n >= 1 && n <= 45);

        // 수동 모드에서 6개 선택되면 체크박스 활성화 및 선택 종료
        const checkbox = document.getElementById(`gameCheckbox${currentSelectingGameIndex}`);
        if (checkbox) {
            checkbox.disabled = validNumbers.length !== 6;
        }

        // 6개가 안 찼으면 다음 빈 공으로 자동 이동
        if (validNumbers.length < 6) {
            let nextEmptyIndex = -1;
            // 이미 0~5번째 인덱스를 순회하며 빈 곳을 찾음 (배열의 length 확인 혹은 undefined 확인)
            for (let i = 0; i < 6; i++) {
                if (!AppState.setSelectedBalls[currentSelectingGameIndex - 1][i]) {
                    nextEmptyIndex = i;
                    break;
                }
            }

            if (nextEmptyIndex !== -1) {
                // 선택 상태 초기화 후 바로 이어갈 수 있게 재설정
                currentSelectingBallIndex = nextEmptyIndex;

                // 하이라이트 재설정
                const allGameBalls = document.querySelectorAll('[id^="gameBalls"] > div');
                allGameBalls.forEach(ball => {
                    ball.style.border = '';
                    ball.style.boxShadow = '';
                });

                // 선택공 그리드의 공에 선택 가능 표시
                const gridBalls = document.querySelectorAll('.number-grid-container .stat-ball');
                gridBalls.forEach(ball => {
                    ball.style.opacity = '1';
                    ball.style.cursor = 'pointer';
                    ball.style.transform = 'scale(1)';
                });

                // 선택 중인 게임공 하이라이트 (방금 업데이트 된 DOM)
                const selectingBall = document.querySelector(`#gameBalls${currentSelectingGameIndex} > div:nth-child(${nextEmptyIndex + 1})`);
                if (selectingBall) {
                    selectingBall.style.border = '2px solid ' + SHAREHARMONY_PALETTE.selectionBorder;
                    selectingBall.style.boxShadow = '0 0 8px rgba(0, 102, 255, 0.5)';
                }

                // 함수 종료 방지, 다음 선택 대기
                return;
            }
        }
    }

    // 완전히 선택 종료되었을 경우 상태 초기화
    currentSelectingGameIndex = null;
    currentSelectingBallIndex = null;

    // 하이라이트 제거
    const allGameBalls = document.querySelectorAll('[id^="gameBalls"] > div');
    allGameBalls.forEach(ball => {
        ball.style.border = '';
        ball.style.boxShadow = '';
    });
}

/**
 * 게임공 생성 (필터 적용) — async
 *  - 자동/lucky 슬롯은 풀 기반 비동기 헬퍼(tryFillSlotWithTrust100Async)를 사용
 *  - 연속 호출 race 방지: __generateAllGamesGen 토큰 (새 호출이 들어오면 이전 호출 중단)
 */
let __generateAllGamesGen = 0;
async function generateAllGames() {
    const gen = ++__generateAllGamesGen;
    for (let i = 1; i <= 5; i++) {
        if (gen !== __generateAllGamesGen) return; /* 새 호출이 들어왔으면 즉시 중단 */
        const modeBtn = document.getElementById(`modeBtn${i}`);
        if (!modeBtn) continue;
        let mode = modeBtn.dataset.mode || 'manual';
        /* 게임공 B of B 모드 제거 후 잔여 data-mode=perfect 는 AI추천으로 표시 정리 */
        if (mode === 'perfect') {
            modeBtn.dataset.mode = 'auto';
            modeBtn.textContent = 'AI추천';
            mode = 'auto';
        }
        await generateGame(i, mode);
    }
}

function getOtherGameCombos(currentGameIndex) {
    var combos = new Set();
    if (!AppState.setSelectedBalls) return combos;
    for (var g = 0; g < 5; g++) {
        if (g === currentGameIndex - 1) continue;
        var nums = AppState.setSelectedBalls[g];
        if (nums && nums.length === 6) {
            combos.add([...nums].sort(function (a, b) { return a - b; }).join(','));
        }
    }
    return combos;
}

/**
 * 모드별 통계 기준을 DOM 옵션필터에 반영 (디스패처)
 *  - 'auto'        : 종료회차 ±100회 통계 → 옵션필터 갱신
 *  - 'lucky'/'bob' : 1회~최신회 전체 통계 → 옵션필터 갱신 (idempotent: 풀 호출 전후 두 번 불려도 결과 동일)
 *  - 'manual' / 'semi-auto' : noop (사용자 직접 선택)
 */
function applyStatBasisForMode(mode) {
    if (mode === 'auto' && typeof applyAiRecommendFiltersForEndRound === 'function') {
        const er = typeof getAiRecommendEndRoundForFilters === 'function' ? getAiRecommendEndRoundForFilters() : null;
        if (er != null) applyAiRecommendFiltersForEndRound(er);
    } else if ((mode === 'lucky' || mode === 'bob') && typeof applyLuckyNumbersStatBasisToDom === 'function') {
        applyLuckyNumbersStatBasisToDom();
    }
    /* 'manual' / 'semi-auto' = noop */
}

/**
 * 한 슬롯의 신뢰도 100% 조합 시도(동기).
 *  1) `tries`회 시도 → 신뢰도 100% 발견 시 채택
 *  2) 일반 호출(필터 적용) 1회 시도
 *  3) 옵션필터 무시(skipOpt=true)로 한 번 더 시도 — 합계 구간만 유지
 *  4) 그래도 실패 시 무작위 6개 (사용자에게 인지 가능하도록 fallback 플래그 반환)
 *
 * @returns {number[]} numbers (fallback 정보는 `numbers.__fallback` 속성에 함께 부착)
 */
function tryFillSlotWithTrust100Sync(gameIndex, diversifyRunOffset, otherCombos, skipOpt = false, avoidExt = false, tries) {
    if (tries == null) {
        tries = (typeof HARMONY_POOL_CONSTANTS !== 'undefined' && HARMONY_POOL_CONSTANTS.TRUST100_TRIES_SYNC) || 100;
    }
    const trustCtx = buildStatFilterTrustContextForGameSlot(gameIndex, diversifyRunOffset);
    let numbers = null;
    let fallback = 'ok';
    for (let t = 0; t < tries; t++) {
        const candidate = generateNumbersWithFilters([], false, otherCombos, skipOpt, avoidExt, gameIndex, diversifyRunOffset);
        if (candidate && calculateAIProbability(candidate, trustCtx) >= 100) { numbers = candidate; break; }
    }
    if (!numbers) {
        numbers = generateNumbersWithFilters([], false, otherCombos, skipOpt, avoidExt, gameIndex, diversifyRunOffset);
        if (numbers && numbers.length === 6) fallback = 'filtered';
    }
    if (!numbers || numbers.length !== 6) {
        /* 옵션필터 너무 엄격 — 옵션 무시(skipOpt=true) 한 번 더 시도. 합계 구간은 유지. */
        numbers = generateNumbersWithFilters([], false, otherCombos, true, avoidExt, gameIndex, diversifyRunOffset);
        if (numbers && numbers.length === 6) fallback = 'skipOpt';
    }
    if (!numbers || numbers.length !== 6) {
        console.warn('[tryFillSlotWithTrust100Sync] 필터·합계·신뢰도 조건을 동시에 만족하는 조합을 찾지 못해 무작위 6개로 대체합니다.');
        numbers = pickSix([]);
        fallback = 'random';
    }
    try { Object.defineProperty(numbers, '__fallback', { value: fallback, enumerable: false }); } catch (_) { /* ignore */ }
    return numbers;
}

/** 모드 버튼에 fallback 단계를 시각/툴팁으로 표시 (Step 2 헬퍼) */
function annotateGameModeBtnFallback(gameIndex, fallback) {
    const btn = document.getElementById('modeBtn' + gameIndex);
    if (!btn) return;
    if (!fallback || fallback === 'ok') {
        btn.removeAttribute('data-fallback');
        if (btn.title && /\(필터 일부 무시|\(무작위|\(신뢰도 100% 미달/.test(btn.title)) btn.title = '';
        return;
    }
    btn.dataset.fallback = fallback;
    if (fallback === 'filtered') btn.title = '신뢰도 100% 미달 — 필터만 만족하는 조합으로 채움';
    else if (fallback === 'skipOpt') btn.title = '필터 일부 무시로 채움 — 옵션필터 완화 권장';
    else if (fallback === 'random') btn.title = '무작위로 채움 — 옵션필터·합계 구간 완화 권장';
}

if (typeof window !== 'undefined') {
    window.annotateGameModeBtnFallback = annotateGameModeBtnFallback;
    window.applyStatBasisForMode = applyStatBasisForMode;
    window.tryFillSlotWithTrust100Sync = tryFillSlotWithTrust100Sync;
}

/**
 * 개별 게임공 생성 (async)
 *  - auto/lucky 모드: 풀 기반과 동일한 비동기 슬롯 보충 헬퍼(tryFillSlotWithTrust100Async)를 사용해 일관화
 *  - bob/semi-auto/manual 모드: sync 동작(즉시 반환), await 호출자도 부담 없음
 *  - 슬롯별 generation guard: 같은 슬롯에 새 호출이 들어오면 이전 호출은 dom을 갱신하지 않음(stale 방지)
 */
const __generateGameSlotGen = [0, 0, 0, 0, 0, 0]; /* 1..5 사용, 0은 미사용 */
async function generateGame(gameIndex, mode, isModeChange = false) {
    const myGen = ++__generateGameSlotGen[gameIndex];
    const ballsContainer = document.getElementById(`gameBalls${gameIndex}`);
    if (!ballsContainer) return;

    ballsContainer.innerHTML = '';

    if (mode === 'perfect') mode = 'auto';

    if (mode === 'auto' || mode === 'lucky') {
        applyStatBasisForMode(mode);

        const checkbox = document.getElementById(`gameCheckbox${gameIndex}`);
        const modeBtnForDiv = document.getElementById('modeBtn' + gameIndex);

        const existing = (AppState.setSelectedBalls && AppState.setSelectedBalls[gameIndex - 1]) || [];
        const needRegenerate = isModeChange || existing.length !== 6;

        let numbers;
        if (needRegenerate) {
            if (mode === 'lucky' && AppState._harmonyTrustSlotByGame) {
                AppState._harmonyTrustSlotByGame[gameIndex - 1] = gameIndex;
            }
            const diversifyRunOffset = Math.floor(Math.random() * 19);
            if (modeBtnForDiv) {
                modeBtnForDiv.dataset.diversifyOffset = String(diversifyRunOffset);
                /* fallback annotation이 title을 덮어쓰지 않을 때만 seed 표시 */
                if (!modeBtnForDiv.dataset.fallback) modeBtnForDiv.title = '분산 시드:' + diversifyRunOffset;
            }
            const otherCombos = getOtherGameCombos(gameIndex);
            /* 풀 기반(async) 헬퍼로 통합 — sync 동등 비용(tries=TRUST100_TRIES_SYNC)으로 시도, 단 yield로 UI 응답성 보존 */
            if (typeof tryFillSlotWithTrust100Async === 'function') {
                const HPC = (typeof HARMONY_POOL_CONSTANTS !== 'undefined') ? HARMONY_POOL_CONSTANTS : {};
                const triesForSlot = HPC.TRUST100_TRIES_SYNC || 100;
                numbers = await tryFillSlotWithTrust100Async(gameIndex, diversifyRunOffset, otherCombos, {
                    logTag: '[generateGame:' + mode + ']',
                    tries: triesForSlot
                });
            } else {
                /* 호환성 폴백: harmonyPool.js 미로드 시 sync 헬퍼 사용 */
                numbers = tryFillSlotWithTrust100Sync(gameIndex, diversifyRunOffset, otherCombos);
            }
            /* 같은 슬롯에 새 호출이 들어왔다면 stale 결과는 dom 반영하지 않음 */
            if (myGen !== __generateGameSlotGen[gameIndex]) return;
            annotateGameModeBtnFallback(gameIndex, numbers && numbers.__fallback);
            if (!AppState.setSelectedBalls) AppState.setSelectedBalls = Array.from({ length: 5 }, () => []);
            AppState.setSelectedBalls[gameIndex - 1] = numbers;
        } else {
            numbers = existing; /* 기존 6개를 유지(diversifyOffset은 modeBtn dataset에 그대로 남아있음) */
        }

        // 게임공 표시
        numbers.forEach(num => {
            const ball = createStatBall(num, 22, '0.8rem');
            ballsContainer.appendChild(ball);
        });

        if (checkbox) {
            checkbox.disabled = false;
            checkbox.checked = true; // AI추천일 경우 저장공에 자동 출력(체크)
        }
        updateSaveBoxState(); // 저장 버튼/회차 입력 활성화

        // 게임공 비활성화 (클릭 불가)
        const gameBalls = ballsContainer.querySelectorAll('.stat-ball');
        gameBalls.forEach(ball => {
            ball.style.pointerEvents = 'none';
            ball.style.cursor = 'default';
        });

        // 합계 업데이트
        updateGameSum(gameIndex, numbers);
    } else if (mode === 'bob') {
        if (!AppState.setSelectedBalls) AppState.setSelectedBalls = Array.from({ length: 5 }, () => []);
        const numbers = AppState.setSelectedBalls[gameIndex - 1] || [];
        const checkbox = document.getElementById(`gameCheckbox${gameIndex}`);
        numbers.forEach(num => {
            const ball = createStatBall(num, 22, '0.8rem');
            ballsContainer.appendChild(ball);
        });
        if (checkbox) {
            checkbox.disabled = false;
            checkbox.checked = numbers.length === 6;
        }
        updateSaveBoxState();
        ballsContainer.querySelectorAll('.stat-ball').forEach(ball => {
            ball.style.pointerEvents = 'none';
            ball.style.cursor = 'default';
        });
        updateGameSum(gameIndex, numbers);
    } else if (mode === 'semi-auto') {
        if (!AppState.setSelectedBalls) {
            AppState.setSelectedBalls = Array.from({ length: 5 }, () => []);
        }
        let numbers = AppState.setSelectedBalls[gameIndex - 1] || [];
        const validNumbers = numbers.filter(n => n && n >= 1 && n <= 45);

        const checkbox = document.getElementById(`gameCheckbox${gameIndex}`);
        if (checkbox) {
            checkbox.disabled = validNumbers.length !== 6;
        }

        // 게임공 표시
        for (let i = 0; i < 6; i++) {
            if (numbers[i]) {
                const num = numbers[i];
                const ballElement = createStatBall(num, 22, '0.8rem');
                ballElement.style.cursor = 'pointer';
                ballElement.dataset.gameIndex = gameIndex;
                ballElement.dataset.ballIndex = i;
                ballElement.dataset.isSelected = 'true';

                ballElement.addEventListener('click', () => {
                    const cb = document.getElementById(`gameCheckbox${gameIndex}`);
                    if (cb && cb.checked) return; // 체크된 상태에서는 교체 불가

                    // 하이라이트 초기화 (다른 모든 게임공의 하이라이트 제거)
                    const allGameBalls = document.querySelectorAll('[id^="gameBalls"] > div');
                    allGameBalls.forEach(b => {
                        if (b.dataset.isSelected === 'true') {
                            const bNum = parseInt(b.textContent);
                            const bClass = getBallColorClass(bNum);
                            const bgColors = {
                                'color-yellow': '#FBC400',
                                'color-blue': '#69C8F2',
                                'color-red': '#FF7272',
                                'color-gray': '#AAAAAA',
                                'color-green': '#B0D840'
                            };
                            b.style.backgroundColor = bgColors[bClass] || '#808080';
                            b.style.color = '#333';
                            b.style.border = 'none';
                        } else {
                            b.style.border = '';
                            b.style.boxShadow = '';
                        }
                    });

                    const ballClass = getBallColorClass(num);
                    const bgColors = {
                        'color-yellow': '#FBC400',
                        'color-blue': '#69C8F2',
                        'color-red': '#FF7272',
                        'color-gray': '#AAAAAA',
                        'color-green': '#B0D840'
                    };
                    const bgColor = bgColors[ballClass] || '#808080';
                    const compHex = getComplementaryColor(bgColor);

                    ballElement.style.backgroundColor = compHex;
                    ballElement.style.color = bgColor; // 글자색은 배경색으로 (보색 대비)
                    ballElement.style.border = `2px solid ${bgColor}`;

                    // 선택 대기 상태로 설정
                    currentSelectingGameIndex = gameIndex;
                    currentSelectingBallIndex = i;
                });
                ballsContainer.appendChild(ballElement);
            } else {
                const ball = document.createElement('div');
                ball.className = 'stat-ball stat-ball--sm';
                ball.style.backgroundColor = SHAREHARMONY_PALETTE.border;
                ball.style.color = SHAREHARMONY_PALETTE.textSecondary;
                ball.style.cursor = 'pointer';
                ball.style.border = '0.2px solid ' + SHAREHARMONY_PALETTE.border;
                ball.textContent = '?';
                ball.dataset.gameIndex = gameIndex;
                ball.dataset.ballIndex = i;
                ball.dataset.isSelected = 'false';
                ball.addEventListener('click', () => {
                    handleManualBallClick(gameIndex, i);
                });
                ballsContainer.appendChild(ball);
            }
        }

        // 합계 업데이트
        updateGameSum(gameIndex, numbers);
    } else if (mode === 'manual') {
        // 수동 모드: 검정바탕 흰색 폰트 공 표시
        if (!AppState.setSelectedBalls) {
            AppState.setSelectedBalls = Array.from({ length: 5 }, () => []);
        }
        const currentNumbers = AppState.setSelectedBalls[gameIndex - 1] || [];
        for (let i = 0; i < 6; i++) {
            let ball;

            if (currentNumbers[i]) {
                // 선택된 번호가 있으면 색상 공 생성
                ball = createStatBall(currentNumbers[i], 22, '0.8rem');
                ball.style.cursor = 'pointer';
                ball.dataset.gameIndex = gameIndex;
                ball.dataset.ballIndex = i;
            } else {
                // 선택되지 않았으면 기존 흑백 원형 버튼 생성
                ball = document.createElement('div');
                ball.className = 'stat-ball stat-ball--sm';
                ball.style.backgroundColor = SHAREHARMONY_PALETTE.black;
                ball.style.color = SHAREHARMONY_PALETTE.white;
                ball.style.cursor = 'pointer';
                ball.style.border = '0.2px solid ' + SHAREHARMONY_PALETTE.black;
                ball.textContent = '?';

                ball.dataset.gameIndex = gameIndex;
                ball.dataset.ballIndex = i;
            }

            // 게임공 클릭 시 번호 선택 (선택 모드일 때만)
            ball.addEventListener('click', () => {
                const cb = document.getElementById(`gameCheckbox${gameIndex}`);
                if (cb && cb.checked) return; // 체크된 상태에서는 수정 불가

                // 이전 선택 하이라이트 제거 (빈 공은 검정 배경으로 복원)
                const allBalls = ballsContainer.querySelectorAll('.stat-ball');
                allBalls.forEach((b, idx) => {
                    b.style.border = '0.2px solid ' + SHAREHARMONY_PALETTE.black;
                    b.style.boxShadow = 'none';
                    if (b.textContent === '?' || !currentNumbers[idx]) {
                        b.style.backgroundColor = SHAREHARMONY_PALETTE.black;
                        b.style.color = SHAREHARMONY_PALETTE.white;
                    }
                });

                // 현재 선택공 하이라이트
                ball.style.border = '2px solid ' + SHAREHARMONY_PALETTE.selectionBorder;
                ball.style.boxShadow = '0 0 8px rgba(0, 102, 255, 0.5)';
                // 수동 모드에서 첫 번째 공 선택 시(빈 칸일 때) 바탕색 흰색
                if (i === 0 && ball.textContent === '?') {
                    ball.style.backgroundColor = '#fff';
                    ball.style.color = '#333';
                }

                currentSelectingGameIndex = gameIndex;
                currentSelectingBallIndex = i;
            });

            ballsContainer.appendChild(ball);
        }

        // 합계 업데이트
        updateGameSum(gameIndex, currentNumbers);
    }
}

/** 
 * 수동 모드에서 그리드 공 클릭 시 처리하는 함수가 있다면 수정 필요 
 * (기존 handleManualBallClick 대신 인라인 혹은 다른 함수 사용 중일 수 있음)
 */

/**
 * 게임 합계 업데이트
 */
// updateGameSum → modules/renderer.js 로 이동되었습니다.

/**
 * AI 당첨 확률 업데이트
 */
// updateGameProbability → modules/renderer.js 로 이동되었습니다.

/** 말풍선 최종 좌표 저장 (브라우저 localStorage — 사용자 환경에 준하는 영속 저장) */
var BUBBLE_POS_STORAGE_KEY = 'lotto_bubble_positions_v1';

function loadBubblePositionsMap() {
    try {
        var raw = localStorage.getItem(BUBBLE_POS_STORAGE_KEY);
        if (!raw) return {};
        var o = JSON.parse(raw);
        return (o && typeof o === 'object') ? o : {};
    } catch (e) {
        return {};
    }
}

function saveBubblePosition(bubbleKey, left, top) {
    if (!bubbleKey) return;
    var map = loadBubblePositionsMap();
    map[bubbleKey] = { left: Math.round(left), top: Math.round(top) };
    try {
        localStorage.setItem(BUBBLE_POS_STORAGE_KEY, JSON.stringify(map));
    } catch (e) { /* 할당량 등 */ }
}

function getSavedBubblePosition(bubbleKey) {
    var map = loadBubblePositionsMap();
    var p = map[bubbleKey];
    if (!p || typeof p.left !== 'number' || typeof p.top !== 'number') return null;
    return p;
}

function clampBubbleToViewport(el, left, top) {
    var w = el.offsetWidth || 280;
    var h = el.offsetHeight || 120;
    var pad = 6;
    var nl = Math.max(pad, Math.min(window.innerWidth - w - pad, left));
    var nt = Math.max(pad, Math.min(window.innerHeight - h - pad, top));
    return { left: nl, top: nt };
}

/**
 * 저장된 좌표가 있으면 position:fixed 로 적용. 성공 시 true
 */
function applySavedBubblePosition(bubbleEl, bubbleKey) {
    if (!bubbleEl || !bubbleKey) return false;
    var p = getSavedBubblePosition(bubbleKey);
    if (!p) return false;
    bubbleEl.style.position = 'fixed';
    var c = clampBubbleToViewport(bubbleEl, p.left, p.top);
    bubbleEl.style.left = c.left + 'px';
    bubbleEl.style.top = c.top + 'px';
    bubbleEl.style.right = 'auto';
    bubbleEl.style.bottom = 'auto';
    bubbleEl.style.margin = '0';
    return true;
}

/**
 * 말풍선을 마우스로 끌어 이동 (버튼·닫기·링크·입력 제외). 드래그 종료 시 dataset.bubblePosKey 로 localStorage 저장
 */
function attachDraggableBubble(bubbleEl) {
    if (!bubbleEl || bubbleEl.dataset.bubbleDragBound === '1') return;
    bubbleEl.dataset.bubbleDragBound = '1';
    bubbleEl.style.touchAction = 'none';

    function isDragExcludedTarget(t) {
        return !!(t && t.closest && t.closest(
            'button, a, input, textarea, select, label, .bubble-close-x, .apology-close, .bubble-close, .ab-btn, .golden-actions'
        ));
    }

    var posKey = bubbleEl.dataset.bubblePosKey || null;

    bubbleEl.addEventListener('mousedown', function onBubbleMouseDown(e) {
        if (e.button !== 0) return;
        if (isDragExcludedTarget(e.target)) return;
        e.preventDefault();
        const rect = bubbleEl.getBoundingClientRect();
        bubbleEl.style.position = 'fixed';
        bubbleEl.style.left = rect.left + 'px';
        bubbleEl.style.top = rect.top + 'px';
        bubbleEl.style.right = 'auto';
        bubbleEl.style.bottom = 'auto';
        bubbleEl.style.margin = '0';
        const zParsed = parseInt(window.getComputedStyle(bubbleEl).zIndex, 10);
        bubbleEl.style.zIndex = String(Math.max(Number.isNaN(zParsed) ? 0 : zParsed, 9998) + 2);

        const startX = e.clientX;
        const startY = e.clientY;
        const origL = rect.left;
        const origT = rect.top;
        document.body.style.userSelect = 'none';
        bubbleEl.classList.add('bubble-dragging');

        function onMove(ev) {
            let nl = origL + (ev.clientX - startX);
            let nt = origT + (ev.clientY - startY);
            const w = bubbleEl.offsetWidth;
            const h = bubbleEl.offsetHeight;
            const pad = 6;
            nl = Math.max(pad, Math.min(window.innerWidth - w - pad, nl));
            nt = Math.max(pad, Math.min(window.innerHeight - h - pad, nt));
            bubbleEl.style.left = nl + 'px';
            bubbleEl.style.top = nt + 'px';
        }
        function onUp() {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            document.body.style.userSelect = '';
            bubbleEl.classList.remove('bubble-dragging');
            var k = bubbleEl.dataset.bubblePosKey || posKey;
            if (k) {
                var l = parseFloat(bubbleEl.style.left);
                var t = parseFloat(bubbleEl.style.top);
                if (!Number.isNaN(l) && !Number.isNaN(t)) saveBubblePosition(k, l, t);
            }
        }
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    });
}

/** 사과/분석 오버레이 내 .apology-bubble — 표시 후 저장 좌표 복원 + 드래그 */
// bindApologyBubblePersistDrag → modules/eventHandlers.js 로 이동되었습니다.

/**
 * 분석 상세 말풍선 표시
 */
// showAnalysisBubble → modules/renderer.js 로 이동되었습니다.

/**
 * 신뢰도 목표 구간: 마지막 `extractAndApplyFilters` 기준(optionHotColdBasisRounds) → 없으면 조회구간 → 전체.
 */
// resolveRoundsForModalTrustBasis → modules/utils/lottoUtils.js 로 이동되었습니다.

/**
 * 당첨 구간에서 홀짝·연속쌍·핫콜비율·AC의 최빈값 + 그 구간 핫/콜 집합 (`extractAndApplyFilters`와 동일 산출).
 * @returns {{ bestOE: string, bestSeq: string, bestHC: string, bestAC: string, hot: number[], cold: number[] }|null}
 */
// computeModalOptionPatternFromRounds → modules/utils/lottoUtils.js 로 이동되었습니다.

/**
 * 통계 옵션 신뢰도용 컨텍스트.
 * 홀짝·핫콜·연속·AC 목표는 `resolveRoundsForModalTrustBasis` 구간에서 산출하며, select에 없는 값은 none/8로 완화.
 * 합계 구간은 `getSumRange()`(화면/AppState 밴드).
 */
function buildStatFilterTrustContextFromDom() {
    const sr = getSumRange();
    const rounds = resolveRoundsForModalTrustBasis();
    const modal = computeModalOptionPatternFromRounds(rounds);

    const oeEl = document.getElementById('filterOddEven');
    const seqEl = document.getElementById('filterConsecutive');
    const hcEl = document.getElementById('filterHotCold');
    const acEl = document.getElementById('filterAC');

    let oddEven = 'none';
    let consecutive = 'none';
    let hotCold = 'none';
    let ac = 'none';
    let hot = [];
    let cold = [];

    if (modal) {
        oddEven = modal.bestOE;
        if (oeEl && ![...oeEl.options].some(function (opt) { return opt.value === oddEven; })) oddEven = 'none';
        consecutive = modal.bestSeq;
        if (seqEl && ![...seqEl.options].some(function (opt) { return opt.value === consecutive; })) consecutive = 'none';
        hotCold = modal.bestHC;
        if (hcEl && ![...hcEl.options].some(function (opt) { return opt.value === hotCold; })) hotCold = 'none';
        ac = modal.bestAC;
        if (acEl && ![...acEl.options].some(function (opt) { return opt.value === ac; })) ac = '8';
        hot = (modal.hot || []).slice();
        cold = (modal.cold || []).slice();
    } else {
        oddEven = oeEl?.value || 'none';
        hotCold = hcEl?.value || 'none';
        consecutive = seqEl?.value || 'none';
        ac = acEl?.value || 'none';
        const hc = typeof getHotColdSetsForOptionFilter === 'function'
            ? getHotColdSetsForOptionFilter()
            : { hot: [], cold: [] };
        hot = (hc.hot || []).slice();
        cold = (hc.cold || []).slice();
    }

    return {
        sumRange: { start: sr.start, end: sr.end },
        oddEven: oddEven,
        hotCold: hotCold,
        consecutive: consecutive,
        ac: ac,
        hot: hot,
        cold: cold
    };
}

// ── calculateStatFilterTrustScore / escapeHtmlAttribute / getStatFilterTrustScoreTooltip
// ── yieldToMainThread
// → modules/harmonyPool.js 에서 정의됨 (app.js 이전 로드)

/**
 * AI 분석 신뢰도(0~100). trustCtx 생략 시 `buildStatFilterTrustContextFromDom()` 스냅샷 사용.
 * @param {number[]} numbers
 * @param {object} [trustCtx]
 */
function calculateAIProbability(numbers, trustCtx) {
    const sorted = [...numbers].sort((a, b) => a - b);
    if (sorted.length !== 6) return 0;
    const ctx = trustCtx || buildStatFilterTrustContextFromDom();
    return calculateStatFilterTrustScore(sorted, ctx);
}

/**
 * 행운번호 후보 정렬용 저장 회차.
 * `computePerfectSortKey(..., roundNum, ...)` 의 statRounds 필터 `round < roundNum` 과 동일.
 */
// getLuckyStatRankTargetRound → modules/utils/lottoUtils.js 로 이동되었습니다.

function setLuckyNumbersLoadingUi(visible) {
    var bar = document.getElementById('luckyNumbersLoadingBar');
    var filters = document.getElementById('optionFilterBox');
    if (bar) {
        bar.classList.toggle('lucky-numbers-loading--visible', !!visible);
        bar.setAttribute('aria-hidden', visible ? 'false' : 'true');
    }
    if (filters) {
        if (visible) filters.setAttribute('aria-busy', 'true');
        else filters.removeAttribute('aria-busy');
    }
}

/**
 * 행운번호 받기·Perfect BoB 공통: 협력 생성으로 신뢰도 100% 후보만 모은 뒤
 * `scorePendingLuckyPerfectKey`(핫 겹침·평균합 거리)와 동일 기준으로 정렬한 풀.
 * @param {{ targetCount: number, maxAttempts: number, roundNum: number, yieldInterval?: number, deadlineMs?: number, stagnationAttempts?: number }} opts
 * @param opts.deadlineMs - 경과 시 수집 중단(0/생략 = 미사용). 무한에 가깝게 느껴지는 장시간 블록 방지.
 * @param opts.stagnationAttempts - 신규 항목 추가 없이 이 횟수만큼 시도하면 중단(0/생략 = 미사용).
 * @returns {Promise<{ entries: Array<{numbers:number[], key:string, trust:number, matchScore:number, sumDist:number, sum:number}>, trustCtx, diversifyRunOffset:number }>}
 */
// collectTrust100HarmonyPoolAsync → modules/harmonyPool.js 로 이동되었습니다.

// pickFiveFromHarmonySortedEntries → modules/harmonyPool.js 에서 정의됨

/**
 * 풀에서 5칸이 안 채워지면 협력 생성으로 보충(행운번호·BoB 동일).
 * diversifyRunOffset: collectTrust100HarmonyPoolAsync와 동일해야 슬롯별 신뢰도 100% 게이트가 맞는다.
 */
// ensureFiveLuckySlotsWithFallbackAsync → modules/harmonyPool.js 로 이동되었습니다.

/**
 * AI 골든 조합 (5게임) 본작업 — async로 루프마다 양보해 브라우저가 멈춘 것처럼 보이는 현상 완화
 */
// runGoldenAiGamesWork → modules/harmonyPool.js 로 이동되었습니다.

/**
 * LottoBoB.json / Lotto023과 동일 키의 게임 객체 1건 (행운번호 직후 DOM 필터 기준)
 */
function buildLottoBobJsonGameRow(roundNum, setNum, gameNum, sortedSix, perfectRank) {
    const sorted = sortedSix;
    if (!sorted || sorted.length !== 6) return null;
    const oddEvenFilter = document.getElementById('filterOddEven')?.value || 'none';
    const sequenceFilter = document.getElementById('filterConsecutive')?.value || 'none';
    const hotColdFilter = document.getElementById('filterHotCold')?.value || 'none';
    const mapRatioToNumber = function (value) {
        if (value === 'none') return -1;
        if (value === '0-6') return 0;
        if (value === '1-5') return 1;
        if (value === '2-4') return 2;
        if (value === '3-3') return 3;
        if (value === '4-2') return 4;
        if (value === '5-1') return 5;
        if (value === '6-0') return 6;
        return -1;
    };
    const mapSequenceToNumber = function (value) {
        if (value === 'none') return -1;
        const n = parseInt(value, 10);
        return Number.isNaN(n) ? -1 : n;
    };
    const oddEvenValue = mapRatioToNumber(oddEvenFilter);
    const sequenceValue = mapSequenceToNumber(sequenceFilter);
    const hotColdValue = mapRatioToNumber(hotColdFilter);
    const actualOdd = sorted.filter(function (n) { return n % 2 === 1; }).length;
    let actualSeq = 0;
    for (let j = 1; j < sorted.length; j++) { if (sorted[j] - sorted[j - 1] === 1) actualSeq++; }
    const actualHot = (function () {
        const split = getHotColdNumbersBeforeRound(roundNum);
        const hotSet = new Set(split.hot || []);
        return sorted.filter(function (n) { return hotSet.has(n); }).length;
    })();
    const pickSum = sorted.reduce(function (a, b) { return a + b; }, 0);
    return {
        '회차': String(roundNum),
        '세트': String(setNum),
        '게임': String(gameNum),
        '홀짝': (oddEvenValue === -1 ? actualOdd : oddEvenValue).toString(),
        '연속': (sequenceValue === -1 ? actualSeq : sequenceValue).toString(),
        '핫콜': (hotColdValue === -1 ? actualHot : hotColdValue).toString(),
        '게임선택': 'BoB',
        '선택합계': String(pickSum),
        '선택1': String(sorted[0]),
        '선택2': String(sorted[1]),
        '선택3': String(sorted[2]),
        '선택4': String(sorted[3]),
        '선택5': String(sorted[4]),
        '선택6': String(sorted[5]),
        'Perfect순위': String(perfectRank)
    };
}

/**
 * Perfect top 5: 100개 풀·신뢰도 상위 5 안내 말풍선
 */
// showPerfectBobAnalysis → modules/renderer.js 로 이동되었습니다.

/**
 * Perfect top 5: 행운번호와 동일 파이프라인(collectTrust100HarmonyPoolAsync → pickFive → 보충)으로 100게임 수집 → LottoBoB.json → 상위 5·BoB
 */
// runPerfectBobGamesWork → modules/harmonyPool.js 로 이동되었습니다.

// generatePerfectBobGames → modules/harmonyPool.js 로 이동되었습니다.

/**
 * AI 골든 조합 (5게임) 자동 생성
 * `computePerfectSortKey` 미추첨과 동일(조회구간 핫·평균합)으로 후보 풀을 정렬해 상위 5개 선택.
 */
// generateGoldenAiGames → modules/harmonyPool.js 로 이동되었습니다.

// showGoldenAiAnalysis → modules/renderer.js 로 이동되었습니다.

/**
 * 행운번호 받기: 제1회~최신회 통계로 옵션필터 반영 + 황금번호(동일 구간 출현 상위 10)
 */
function applyReceiveLuckyNumbersEnvironment() {
    applyLuckyNumbersStatBasisToDom();
    AppState.goldenNumbers = new Set();
    const data = AppState.allLotto645Data;
    if (!data || !data.length) return;
    const latest = Number(data[0].round);
    if (Number.isNaN(latest)) return;
    const slice = filterLotto645ByRoundInclusive(data, 1, latest);
    if (!slice.length) return;
    const winMap = calculateWinStats(slice);
    const topNumbers = [...winMap.entries()]
        .map(function (e) { return { number: e[0], count: e[1] }; })
        .sort(function (a, b) { return b.count - a.count; })
        .slice(0, 10)
        .map(function (s) { return s.number; });
    AppState.goldenNumbers = new Set(topNumbers);
}

function captureAndSave(el, btns, closeBtn, overlay) {
    html2canvas(el, { backgroundColor: '#fff', scale: 2 }).then(canvas => {
        if (btns) btns.style.display = '';
        if (closeBtn) closeBtn.style.display = '';
        canvas.toBlob(function (blob) {
            if (!blob) { alert('이미지 생성에 실패했습니다.'); return; }
            if (navigator.clipboard && typeof ClipboardItem !== 'undefined') {
                navigator.clipboard.write([
                    new ClipboardItem({ 'image/png': blob })
                ]).then(() => {
                    alert('이미지가 클립보드에 복사되었습니다! 📋\n카톡이나 메신저에 Ctrl+V로 붙여넣으세요.');
                }).catch(() => {
                    fallbackDownload(canvas);
                });
            } else {
                fallbackDownload(canvas);
            }
        }, 'image/png');
    }).catch(() => {
        if (btns) btns.style.display = '';
        if (closeBtn) closeBtn.style.display = '';
        alert('이미지 생성에 실패했습니다.');
    });
}

function fallbackDownload(canvas) {
    const link = document.createElement('a');
    link.download = 'AI_추천번호_분석.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
    alert('클립보드 복사가 지원되지 않아 파일로 저장했습니다.');
}

/**
* 프리미엄 행운 티켓 이미지 생성 (Canvas)
*/
// drawPremiumTicket → modules/renderer.js 로 이동되었습니다.

/** AC값 계산 유틸리티 */
// calculateAC → modules/utils/lottoUtils.js 로 이동되었습니다.

/**
 * 프리미엄 AI 분석 토글 버튼
 */
function togglePremiumAiBox(btn) {
    const premiumBox = document.getElementById('premiumAiBox');
    const wrapper = document.getElementById('premiumToggleArea');

    // btn이 없으면(닫기 버튼) premiumAiToggleBtn에서 찾아옴
    if (!btn || !btn.dataset) {
        btn = document.getElementById('premiumAiToggleBtn');
    }

    // 현재 상태 확인
    const isOn = premiumBox && premiumBox.style.display !== 'none';

    if (isOn) {
        // ON → OFF: premiumAiBox 숨김
        if (btn) {
            btn.dataset.state = 'off';
            btn.textContent = '✨ 프리미엄 AI';
            btn.style.background = 'transparent';
            btn.style.border = '1px solid ' + SHAREHARMONY_PALETTE.aiOrangeBorder;
            btn.style.color = SHAREHARMONY_PALETTE.aiOrangeBorder;
        }
        if (premiumBox) premiumBox.style.display = 'none';

        if (wrapper) wrapper.style.minHeight = '0px';
    } else {
        // OFF → ON: premiumAiBox 표시
        if (btn) {
            btn.dataset.state = 'on';
            btn.textContent = '✨ 프리미엄 ON';
            btn.style.background = 'linear-gradient(135deg, ' + SHAREHARMONY_PALETTE.golden + ', #FFA500)';
            btn.style.border = '1px solid ' + SHAREHARMONY_PALETTE.golden;
            btn.style.color = SHAREHARMONY_PALETTE.black;
        }
        if (premiumBox) {
            premiumBox.style.display = 'block';

            // 신규 프리미엄 1게임 생성 (AI 최적화)
            let bestNumbers = [];
            let maxScore = 0;
            for (let attempt = 0; attempt < 100; attempt++) {
                const candidate = [];
                while (candidate.length < 6) {
                    const n = Math.floor(Math.random() * 45) + 1;
                    if (!candidate.includes(n)) candidate.push(n);
                }
                const currentScore = calculateAIProbability(candidate);
                if (currentScore > maxScore) {
                    maxScore = currentScore;
                    bestNumbers = candidate;
                }
                if (maxScore >= 95) break;
            }

            // 프리미엄 게임 표시 (내용물 채우기)
            setPremiumAiDisplay(bestNumbers);
            drawPremiumTicket(bestNumbers);

            // saveBox는 필터 행으로 이동됨

            // 렌더링 후 실제 높이 측정
            requestAnimationFrame(() => {
                if (wrapper && premiumBox.offsetHeight > 0) {
                    wrapper.style.minHeight = premiumBox.offsetHeight + 'px';
                }
            });
        }
    }
}

/**
 * 프리미엄 AI 단 한 게임 UI 표시
 */
function setPremiumAiDisplay(numbers) {
    const box = document.getElementById('premiumAiBox');
    const analysis = document.getElementById('premiumAnalysis');
    const copyBtn = document.getElementById('copySnsBtn');
    if (!box || !analysis) return;

    box.style.display = 'block';

    // 번호 표시 (최종 정렬)
    const sorted = [...numbers].sort((a, b) => a - b);

    const sum = sorted.reduce((a, b) => a + b, 0);
    const odd = sorted.filter(n => n % 2 !== 0).length;
    const even = 6 - odd;

    // AC 값 계산 (수학적 복잡도)
    const diffs = new Set();
    for (let i = 0; i < sorted.length; i++) {
        for (let j = i + 1; j < sorted.length; j++) {
            diffs.add(sorted[j] - sorted[i]);
        }
    }
    const acValue = diffs.size - 5;
    const score = calculateAIProbability(sorted);

    analysis.innerHTML = `
        <div style="line-height: 1.8; font-size: 0.85rem;">
            📍 <b>합계 분석:</b> ${sum} (최빈 당첨 구간 진입 완료)<br>
            ⚖️ <b>홀짝 균형:</b> ${odd}:${even} (황금 비율 매칭)<br>
            📐 <b>수학적 안정성(AC):</b> ${acValue} (무작위성 검증 필)<br>
            🏆 <b>AI 분석 신뢰도:</b> <span class="premium-ai-trust-pct stat-filter-trust-tip-host" style="color: ${SHAREHARMONY_PALETTE.goldenTicket}; font-weight: bold;">${score}%</span> (프리미엄 등급)
        </div>
    `;

    var premTrust = analysis.querySelector('.premium-ai-trust-pct');
    applyStatFilterTrustTooltip(premTrust);

    // SNS 복사 버튼 설정
    copyBtn.onclick = () => {
        const nextRound = (AppState && AppState.allLotto645Data && AppState.allLotto645Data[0]) ? AppState.allLotto645Data[0].round + 1 : '당첨';
        const msg = `
[🍀 AI 프리미엄 로또 추천 - ${nextRound}회]

지인분께만 조심스럽게 추천드리는 
AI 최적화 분석 번호입니다. 

📌 추천 번호: ${sorted.join(', ')}

📊 분석 근거:
- 합계: ${sum} (통계적 최빈 구간)
- 홀짝: ${odd}:${even} (균형 배정)
- 안정성: AC ${acValue} (수학적 복잡도 검증)
- 분석 신뢰도: ${score}%

행운을 빕니다! 꼭 당첨되시길 바랍니다! ✨
`.trim();

        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(msg).then(() => {
                alert('메시지가 복사되었습니다. 카톡이나 SNS에 붙여넣어 공유하세요!');
            });
        } else {
            // 구형 브라우저 대응
            const textArea = document.createElement("textarea");
            textArea.value = msg;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            alert('메시지가 복사되었습니다.');
        }
    };
}

/** 조회 구간 당첨 6합 필터 하한·상한용 백분위 (중간 80% 띠, 행운번호·AI추천 후보 확대) */
const SUM_BAND_PERCENTILE_LOW = 10;
const SUM_BAND_PERCENTILE_HIGH = 90;
/** 게임1~5 슬롯별로 위 띠(p10~p90)를 나누는 구간 수 (`LOTTO_CONSTANTS`와 동일, 워커·lottoUtils와 공유) */
const SUM_BAND_SLOT_COUNT = LOTTO_CONSTANTS.SUM_BAND_SLOT_COUNT;

/**
 * 조회 회차에서 유효한 당첨 6개 합 목록 (21~255)
 */
// collectSixSumsFromRounds → modules/utils/lottoUtils.js 로 이동되었습니다.

/**
 * 오름차순 배열에 대한 선형 보간 백분위 (0~100)
 */
function percentileLinearSorted(sorted, p) {
    const n = sorted.length;
    if (n === 0) return NaN;
    if (n === 1) return sorted[0];
    const clamped = Math.max(0, Math.min(100, p));
    const pos = (clamped / 100) * (n - 1);
    const lo = Math.floor(pos);
    const hi = Math.ceil(pos);
    if (lo === hi) return sorted[lo];
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

/**
 * 조회 구간 당첨 6합의 백분위 띠 + 산술평균(중앙 표시용 avr).
 * @param {Array} rounds - Lotto645 회차 객체 목록
 * @param {number} lowPct - 하한 백분위 (예: 10)
 * @param {number} highPct - 상한 백분위 (예: 90)
 */
// computeSumPercentileBandFromRounds → modules/utils/lottoUtils.js 로 이동되었습니다.

/**
 * p10~p90(outer) 구간을 numSlots개의 백분위 띠로 분할해 게임 슬롯별 합 허용구간을 만든다.
 * @returns {Array<{start:number,end:number}>|null}
 */
// computeSumPercentileSubBandsFromRounds → modules/utils/lottoUtils.js 로 이동되었습니다.

/**
 * 조회 회차 기준 6개 번호 합: 전체 평균 avr, 평균 이하(≤) 회차 합의 평균 min, 평균 이상(≥) 회차 합의 평균 max
 * (레거시·참고: 구간이 좁음. UI 합계 필터는 computeSumPercentileBandFromRounds 사용.)
 */
// computeSumMeanBandFromRounds → modules/utils/lottoUtils.js 로 이동되었습니다.

/**
 * 합계 min·avr·max 박스 및 AppState.sumRange(생성 구간) 반영.
 * min/max는 조회 구간 당첨 6합의 백분위 띠(SUM_BAND_PERCENTILE_LOW~HIGH).
 */
function applySumMeanBandToFilterInputs(rounds) {
    const band = computeSumPercentileBandFromRounds(rounds, SUM_BAND_PERCENTILE_LOW, SUM_BAND_PERCENTILE_HIGH);
    const lowEl = document.getElementById('filterAvgLow');
    const midEl = document.getElementById('filterAvgMid');
    const highEl = document.getElementById('filterAvgHigh');
    if (!band) {
        if (lowEl) lowEl.value = '';
        if (midEl) midEl.value = '';
        if (highEl) highEl.value = '';
        AppState.sumBandPerGame = null;
        return;
    }
    if (lowEl) lowEl.value = formatFilterAvgLowDisplay(band.min);
    if (midEl) midEl.value = formatFilterAvgLowDisplay(band.avr);
    if (highEl) highEl.value = formatFilterAvgLowDisplay(band.max);
    AppState.sumRangeStart = band.min;
    AppState.sumRangeEnd = band.max;
    const sub = computeSumPercentileSubBandsFromRounds(rounds, SUM_BAND_PERCENTILE_LOW, SUM_BAND_PERCENTILE_HIGH, SUM_BAND_SLOT_COUNT);
    if (sub && sub.length === SUM_BAND_SLOT_COUNT) {
        AppState.sumBandPerGame = sub;
    } else {
        AppState.sumBandPerGame = Array.from({ length: SUM_BAND_SLOT_COUNT }, function () {
            return { start: band.min, end: band.max };
        });
    }
}

/**
 * 필터를 적용하여 번호 생성
 */
/** 구간 min(filterAvgLow) 표시: 소수점 1자리 (max와 형식 맞춤) */
function formatFilterAvgLowDisplay(n) {
    if (n == null || n === '') return '';
    const x = Number(n);
    if (Number.isNaN(x)) return '';
    return x.toFixed(1);
}

/** 구간선택(시작~종료) 값 반환. 입력값 없으면 AppState 또는 21/255 사용 */
function getSumRange() {
    const startEl = document.getElementById('filterAvgLow');
    const endEl = document.getElementById('filterAvgHigh');
    let start = startEl && startEl.value !== '' ? parseFloat(startEl.value) : (AppState.sumRangeStart != null ? AppState.sumRangeStart : 21);
    let end = endEl && endEl.value !== '' ? parseFloat(endEl.value) : (AppState.sumRangeEnd != null ? AppState.sumRangeEnd : 255);
    if (isNaN(start) || start < 21) start = 21;
    if (isNaN(end) || end > 255) end = 255;
    if (start > end) start = end;
    return { start: start, end: end };
}

/** 게임 슬롯(1~5)별 합 허용구간. sumBandPerGame 없으면 getSumRange()와 동일 */
// getSumRangeForGameSlot → modules/utils/lottoUtils.js 로 이동되었습니다.

/** 재미·분산: select의 유효 값 목록(none 포함) */
function getFunDiversifySelectOptionValues(selectId) {
    const el = document.getElementById(selectId);
    if (!el || !el.options) return [];
    const out = [];
    for (let i = 0; i < el.options.length; i++) {
        const v = el.options[i].value;
        if (v === '' || v == null) continue;
        out.push(v);
    }
    return out;
}

/**
 * 재미·분산: 통계 기준(base) 패턴을 유지하면서 슬롯마다 홀짝·연속·핫콜·AC 목표를 달리 쓴다.
 * runOffset으로 회차/실행마다 시작 위치를 바꿔 매번 다른 조합 경향(재미).
 */
// getFunDiversifyFilterTargetsForSlot → modules/utils/lottoUtils.js 로 이동되었습니다.

/** 슬롯별 합구간 + 분산된 옵션필터 목표(신뢰도 산출용) */
function buildStatFilterTrustContextForGameSlot(slot1to5, runOffset) {
    const base = buildStatFilterTrustContextFromDom();
    const t = getFunDiversifyFilterTargetsForSlot(slot1to5, runOffset);
    return {
        sumRange: getSumRangeForGameSlot(slot1to5),
        oddEven: t.oddEven,
        hotCold: t.hotCold,
        consecutive: t.consecutive,
        ac: t.ac,
        hot: (base.hot || []).slice(),
        cold: (base.cold || []).slice()
    };
}

// isPastWinningCombo → modules/utils/lottoUtils.js 로 이동되었습니다.

/**
 * 극한 조합 여부 (행운 모드 회피 대상)
 * - 홀·짝: 한쪽으로 치우침 — 홀 5~6개 또는 짝 5~6개(홀 0~1개)
 * - 핫·콜: 전체 데이터 기준 핫22/콜23로 — 핫 5~6개 또는 콜 5~6개
 */
// isExtremeCombination → modules/utils/lottoUtils.js 로 이동되었습니다.

function generateNumbersWithFilters(existingNumbers = [], skipSumRange, excludeCombos, skipOptionFilters = false, avoidExtremes = false, gameSlotForSum = null, diversifyRunOffset = 0) {
    var sumRange = skipSumRange
        ? null
        : (gameSlotForSum != null && gameSlotForSum >= 1 && gameSlotForSum <= SUM_BAND_SLOT_COUNT
            ? getSumRangeForGameSlot(gameSlotForSum)
            : getSumRange());
    var maxAttempts = avoidExtremes ? 1200 : 800;
    let oddEvenFilter = skipOptionFilters ? 'none' : (document.getElementById('filterOddEven')?.value || 'none');
    let sequenceFilter = skipOptionFilters ? 'none' : (document.getElementById('filterConsecutive')?.value || 'none');
    let hotColdFilter = skipOptionFilters ? 'none' : (document.getElementById('filterHotCold')?.value || 'none');
    let acFilter = skipOptionFilters ? 'none' : (document.getElementById('filterAC')?.value || 'none');
    if (!skipOptionFilters && gameSlotForSum != null && gameSlotForSum >= 1 && gameSlotForSum <= SUM_BAND_SLOT_COUNT) {
        const divT = getFunDiversifyFilterTargetsForSlot(gameSlotForSum, diversifyRunOffset);
        oddEvenFilter = divT.oddEven;
        sequenceFilter = divT.consecutive;
        hotColdFilter = divT.hotCold;
        acFilter = divT.ac;
    }
    if (acFilter && acFilter !== 'none') {
        maxAttempts = avoidExtremes ? 2200 : 1800;
    }
    /* 합계 구간까지 만족해야 할 때 시도 횟수 상향 — 조건 생략 폴백 제거에 대비 */
    if (sumRange && !skipSumRange) {
        maxAttempts = Math.round(maxAttempts * 1.75);
    }

    // 제외수 파싱
    const excludeEl = document.getElementById('filterExclude');
    let excludeNumbers = [];
    if (excludeEl && excludeEl.value.trim() !== '') {
        excludeNumbers = excludeEl.value.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n) && n >= 1 && n <= 45);
    }

    function tryAccept(candidate) {
        if (!candidate || candidate.length !== 6) return false;
        if (sumRange) {
            var sum = candidate.reduce(function (a, b) { return a + b; }, 0);
            if (sum < sumRange.start || sum > sumRange.end) return false;
        }
        if (isPastWinningCombo(candidate)) return false;
        if (excludeCombos && excludeCombos.size > 0) {
            var comboKey = [...candidate].sort(function (a, b) { return a - b; }).join(',');
            if (excludeCombos.has(comboKey)) return false;
        }
        if (avoidExtremes && isExtremeCombination(candidate)) return false;
        return true;
    }

    for (var attempt = 0; attempt < maxAttempts; attempt++) {
        var candidate = pickSixWithFilters(oddEvenFilter, sequenceFilter, hotColdFilter, existingNumbers, acFilter, excludeNumbers);

        if (tryAccept(candidate)) return candidate;
    }
    /* 옵션필터·합계·과거당첨·제외조합을 모두 통과한 조합만 반환(마지막에 조건 생략하지 않음) */
    return null;
}

/**
 * 필터를 적용한 번호 선택
 */
// pickSixWithFilters → modules/generator.js 로 이동되었습니다.

/** `pickSixWithFilters`와 동일 로직 + 루프마다 메인 스레드 양보(응답 없음 완화) */
// pickSixWithFiltersCooperative → modules/generator.js 로 이동되었습니다.

/** `generateNumbersWithFilters`와 동일 + 협력적 양보(행운번호 대량 생성 전용) */
async function generateNumbersWithFiltersCooperative(existingNumbers, skipSumRange, excludeCombos, skipOptionFilters, avoidExtremes, gameSlotForSum = null, diversifyRunOffset = 0) {
    var exNums = existingNumbers || [];
    var sumRange = skipSumRange
        ? null
        : (gameSlotForSum != null && gameSlotForSum >= 1 && gameSlotForSum <= SUM_BAND_SLOT_COUNT
            ? getSumRangeForGameSlot(gameSlotForSum)
            : getSumRange());
    var maxAttempts = avoidExtremes ? 1200 : 800;
    var oddEvenFilter = skipOptionFilters ? 'none' : (document.getElementById('filterOddEven') && document.getElementById('filterOddEven').value) || 'none';
    var sequenceFilter = skipOptionFilters ? 'none' : (document.getElementById('filterConsecutive') && document.getElementById('filterConsecutive').value) || 'none';
    var hotColdFilter = skipOptionFilters ? 'none' : (document.getElementById('filterHotCold') && document.getElementById('filterHotCold').value) || 'none';
    var acFilter = skipOptionFilters ? 'none' : (document.getElementById('filterAC') && document.getElementById('filterAC').value) || 'none';
    if (!skipOptionFilters && gameSlotForSum != null && gameSlotForSum >= 1 && gameSlotForSum <= SUM_BAND_SLOT_COUNT) {
        var divTc = getFunDiversifyFilterTargetsForSlot(gameSlotForSum, diversifyRunOffset);
        oddEvenFilter = divTc.oddEven;
        sequenceFilter = divTc.consecutive;
        hotColdFilter = divTc.hotCold;
        acFilter = divTc.ac;
    }
    if (acFilter && acFilter !== 'none') {
        maxAttempts = avoidExtremes ? 2200 : 1800;
    }
    if (sumRange && !skipSumRange) {
        maxAttempts = Math.round(maxAttempts * 1.75);
    }

    var excludeEl = document.getElementById('filterExclude');
    var excludeNumbers = [];
    if (excludeEl && excludeEl.value.trim() !== '') {
        excludeNumbers = excludeEl.value.split(',').map(function (s) { return parseInt(s.trim(), 10); }).filter(function (n) { return !isNaN(n) && n >= 1 && n <= 45; });
    }

    function tryAccept(candidate) {
        if (!candidate || candidate.length !== 6) return false;
        if (sumRange) {
            var sm = candidate.reduce(function (a, b) { return a + b; }, 0);
            if (sm < sumRange.start || sm > sumRange.end) return false;
        }
        if (isPastWinningCombo(candidate)) return false;
        if (excludeCombos && excludeCombos.size > 0) {
            var comboKey = candidate.slice().sort(function (a, b) { return a - b; }).join(',');
            if (excludeCombos.has(comboKey)) return false;
        }
        if (avoidExtremes && isExtremeCombination(candidate)) return false;
        return true;
    }

    for (var attempt = 0; attempt < maxAttempts; attempt++) {
        if (attempt > 0 && attempt % 200 === 0) await yieldToMainThread();
        var candidate = await pickSixWithFiltersCooperative(oddEvenFilter, sequenceFilter, hotColdFilter, exNums, acFilter, excludeNumbers);
        if (tryAccept(candidate)) return candidate;
    }
    return null;
}

/** 정렬 기준 연속쌍(n, n+1)에 포함된 번호 — 미추첨 저장공 테두리 강조용 */
function sequentialPairTouchSet(sixNumbers) {
    const nums = (sixNumbers || []).map(function (n) { return Number(n); }).filter(function (n) { return !Number.isNaN(n) && n >= 1 && n <= 45; });
    if (nums.length !== 6 || new Set(nums).size !== 6) return new Set();
    const sorted = nums.slice().sort(function (a, b) { return a - b; });
    const touch = new Set();
    for (let i = 1; i < sorted.length; i++) {
        if (sorted[i] === sorted[i - 1] + 1) {
            touch.add(sorted[i - 1]);
            touch.add(sorted[i]);
        }
    }
    return touch;
}

/**
 * 게임 세트 업데이트
 */
// updateGameSet → modules/renderer.js 로 이동되었습니다.

/**
 * 저장박스 활성화 상태 업데이트
 */
// updateSaveBoxState → modules/renderer.js 로 이동되었습니다.

/**
 * AI 분석 대시보드 실시간 업데이트
 */
// [제거] 불필요해진 분석 대시보드 로직
// updateAiDashboard → modules/renderer.js 로 이동되었습니다.
// renderAiStats → modules/renderer.js 로 이동되었습니다.

/**
 * 저장 버튼 이벤트 리스너 설정
 */
// setupSaveButton → modules/eventHandlers.js 로 이동되었습니다.

/**
 * 게임을 CSV 파일에 저장
 */
// saveGamesToCSV → modules/dataLoader.js 로 이동되었습니다.

/**
 * 선택삭제 버튼 설정 + 전체선택 체크박스
 */
// setupDeleteSelectedButton → modules/eventHandlers.js 로 이동되었습니다.

/**
 * 모든 저장된 결과 삭제
 */
async function deleteAllResults() {
    try {
        const baseUrl = getApiBaseUrl();
        const response = await fetch(`${baseUrl}/api/delete-all-lotto023`, {
            method: 'POST'
        });

        if (response.ok) {
            const result = await response.json();
            if (result.returnValue === 'success') {
                // 캐시 삭제 및 새로고침
                if (typeof CACHE_KEYS !== 'undefined' && CACHE_KEYS.LOTTO023) {
                    localStorage.removeItem(CACHE_KEYS.LOTTO023);
                } else {
                    localStorage.removeItem('LOTTO023_DATA_CACHE_V2');
                }
                await loadAndDisplayResults();
                alert('모든 기록이 삭제되었습니다.');
            }
        }
    } catch (err) {
        console.error('전체 삭제 실패:', err);
        alert('삭제 중 오류가 발생했습니다.');
    }
}

/**
 * 로또 당첨 순위 계산
 * @param {number[]} selectedNumbers 선택한 6개 번호
 * @param {number[]} winningNumbers 당첨된 6개 번호
 * @param {number} bonusNumber 보너스 번호
 * @returns {Object} { rank, matchCount, isBonusMatch }
 */
function getLottoRank(selectedNumbers, winningNumbers, bonusNumber) {
    if (!selectedNumbers || !winningNumbers) return { rank: 0, matchCount: 0, isBonusMatch: false };

    const selectedSet = new Set(selectedNumbers);
    const winningSet = new Set(winningNumbers);

    let matchCount = 0;
    selectedNumbers.forEach(num => {
        if (winningSet.has(num)) matchCount++;
    });

    const isBonusMatch = selectedSet.has(bonusNumber);

    let rank = 0;
    if (matchCount === 6) rank = 1;
    else if (matchCount === 5 && isBonusMatch) rank = 2;
    else if (matchCount === 5) rank = 3;
    else if (matchCount === 4) rank = 4;
    else if (matchCount === 3) rank = 5;

    return { rank, matchCount, isBonusMatch };
}

/** 회차별 6개 당첨번호 합의 평균 (행운번호 후보 점수용 stat 구간) */
// meanSixNumberSumForRounds → modules/utils/lottoUtils.js 로 이동되었습니다.

/**
 * 통계 기반 점수 키 (행운번호 후보 선별 등에 사용)
 * - 추첨 완료: 당첨 6개 일치 ↑, |게임합−당첨합| ↓
 * - 미추첨: 항상 `computeBobHarmonyKey`와 동일 — 조회구간(`currentStatsRounds`) 우선, 비면 전체 데이터 폴백
 */
function computePerfectSortKey(game, roundNum, winRound, isPending) {
    const raw = game.numbers ? game.numbers.map(n => Number(n)).filter(n => !Number.isNaN(n)) : [];
    const nums = [...raw].sort((a, b) => a - b);
    const valid = nums.length === 6 && new Set(nums).size === 6 && nums.every(n => n >= 1 && n <= 45);
    const gameSum = valid ? nums.reduce((s, n) => s + n, 0) : 99999;

    if (!isPending && winRound && Array.isArray(winRound.numbers) && winRound.numbers.length >= 6) {
        const winNums = winRound.numbers.slice(0, 6).map(n => Number(n));
        const winSet = new Set(winNums);
        const matchScore = valid ? nums.filter(n => winSet.has(n)).length : 0;
        const winSum = winNums.reduce((s, n) => s + n, 0);
        const sumDist = valid ? Math.abs(gameSum - winSum) : 999999;
        return { matchScore, sumDist };
    }

    const base = AppState.currentStatsRounds || AppState.allLotto645Data || [];
    let statRounds = base.filter(r => r && r.round < roundNum && Array.isArray(r.numbers) && r.numbers.length >= 6);
    if (statRounds.length === 0) {
        statRounds = (AppState.allLotto645Data || []).filter(r => r && r.round < roundNum && Array.isArray(r.numbers) && r.numbers.length >= 6);
    }

    const winMap = calculateWinStats(statRounds);
    const appMap = calculateAppearanceStats(statRounds);
    const seqMap = calculateConsecutiveStats(statRounds);
    const { hot } = sortAndSplitHotCold(winMap, appMap, seqMap);
    const hotSet = new Set(hot);
    const matchScore = valid ? nums.filter(n => hotSet.has(n)).length : 0;

    const refAvgSum = meanSixNumberSumForRounds(statRounds);
    const sumDist = valid ? Math.abs(gameSum - refAvgSum) : 999999;

    return { matchScore, sumDist };
}

/**
 * 행운번호 후보 루프용: `computePerfectSortKey` 미추첨 분기와 동일한 statRounds/핫/평균합을 roundNum당 1회만 계산.
 */
function buildLuckyPendingPerfectSortContext(roundNum) {
    const base = AppState.currentStatsRounds || AppState.allLotto645Data || [];
    let statRounds = base.filter(function (r) {
        return r && r.round < roundNum && Array.isArray(r.numbers) && r.numbers.length >= 6;
    });
    if (statRounds.length === 0) {
        statRounds = (AppState.allLotto645Data || []).filter(function (r) {
            return r && r.round < roundNum && Array.isArray(r.numbers) && r.numbers.length >= 6;
        });
    }
    const winMap = calculateWinStats(statRounds);
    const appMap = calculateAppearanceStats(statRounds);
    const seqMap = calculateConsecutiveStats(statRounds);
    var split = sortAndSplitHotCold(winMap, appMap, seqMap);
    return {
        hotSet: new Set(split.hot || []),
        refAvgSum: meanSixNumberSumForRounds(statRounds)
    };
}

// scorePendingLuckyPerfectKey → modules/harmonyPool.js 에서 정의됨

/** BoB 정렬용: 상세 문자열(가나다 동률 처리) */
function savedRowBobTiebreakText(game) {
    try {
        return getSavedGameRowSummaryParts(game).detailLineText || '';
    } catch (e) {
        return '';
    }
}

/**
 * BoB·정합도(정성도) 키
 * - 추첨 완료: 해당 회차 당첨 6개와의 일치 수↑, |게임합−당첨합|↓
 * - 미추첨: 화면 조회구간(`currentStatsRounds`) 통계(핫 22·구간 평균합) 기준, `round < 저장회차`만 사용
 */
function computeBobHarmonyKey(game, roundNum, winRound, isPending) {
    const raw = game.numbers ? game.numbers.map(n => Number(n)).filter(n => !Number.isNaN(n)) : [];
    const nums = [...raw].sort((a, b) => a - b);
    const valid = nums.length === 6 && new Set(nums).size === 6 && nums.every(n => n >= 1 && n <= 45);
    const gameSum = valid ? nums.reduce((s, n) => s + n, 0) : 99999;

    if (!isPending && winRound && Array.isArray(winRound.numbers) && winRound.numbers.length >= 6) {
        const winNums = winRound.numbers.slice(0, 6).map(n => Number(n));
        const winSet = new Set(winNums);
        const matchScore = valid ? nums.filter(n => winSet.has(n)).length : 0;
        const winSum = winNums.reduce((s, n) => s + n, 0);
        const sumDist = valid ? Math.abs(gameSum - winSum) : 999999;
        return { matchScore, sumDist };
    }

    const base = AppState.currentStatsRounds || AppState.allLotto645Data || [];
    let statRounds = base.filter(r => r && r.round < roundNum && Array.isArray(r.numbers) && r.numbers.length >= 6);
    if (statRounds.length === 0) {
        statRounds = (AppState.allLotto645Data || []).filter(r => r && r.round < roundNum && Array.isArray(r.numbers) && r.numbers.length >= 6);
    }
    const winMap = calculateWinStats(statRounds);
    const appMap = calculateAppearanceStats(statRounds);
    const seqMap = calculateConsecutiveStats(statRounds);
    const { hot } = sortAndSplitHotCold(winMap, appMap, seqMap);
    const hotSet = new Set(hot);
    const matchScore = valid ? nums.filter(n => hotSet.has(n)).length : 0;
    const refAvgSum = meanSixNumberSumForRounds(statRounds);
    const sumDist = valid ? Math.abs(gameSum - refAvgSum) : 999999;
    return { matchScore, sumDist };
}

/**
 * BoB 정성도 점수(큰값이 더 좋음) — 저장 목록 정렬용.
 * - 미추첨: `computeBobHarmonyKey`만(조회구간 핫·평균합). 신뢰도%는 쓰지 않음 — 수집은 행운·BoB 모두 100% 게이트로 통일했으나 동률 다수 시 harmony로 순위 구분.
 * - 추첨완료: `computeBobHarmonyKey`(당첨 일치·합 차), 시트 Perfect순위 있으면 가중.
 */
function bobQualityScore(game, roundNum, winRound, isPending) {
    if (isPending) {
        const k = computeBobHarmonyKey(game, roundNum, winRound, true);
        const distTie = Math.max(0, 600 - Math.min(k.sumDist, 600));
        return k.matchScore * 1e9 + distTie;
    }
    const prRaw = game.perfectRank != null && Number(game.perfectRank) > 0 ? Number(game.perfectRank) : null;
    const k = computeBobHarmonyKey(game, roundNum, winRound, false);
    const rankPart = prRaw != null ? (10000 - prRaw) : 0;
    const matchPart = k.matchScore * 500;
    const distPart = Math.max(0, 600 - Math.min(k.sumDist, 600));
    return rankPart * 1e9 + matchPart * 1e6 + distPart;
}

/**
 * BoB 정렬 직후 목록에 표시할 순위(1…n).
 * `games`는 이미 BoB 비교기준으로 정렬된 배열이어야 하며, 호출마다 처음부터 1부터 다시 부여한다.
 */
function computeBobCompetitionRanks(games) {
    if (!games || games.length === 0) return [];
    return games.map(function (_, i) { return i + 1; });
}

/** BoB 정렬 동점 시: 모드 문자열 제외(행운/BoB가 동점 구간에서 다시 뭉치지 않도록) */
function bobNumbersTiebreakKey(game) {
    const raw = game.numbers ? game.numbers.map(function (n) { return Number(n); }).filter(function (n) { return !Number.isNaN(n); }) : [];
    const s = raw.slice().sort(function (x, y) { return x - y; });
    return s.join(',');
}

/**
 * BoB 정렬: `bobQualityScore` 내림차순 → 동률 처리(미추첨: 번호·세트·게임)
 */
function compareSavedResultRowsBob(a, b, roundNum, winRound, isPending) {
    const da = bobQualityScore(a, roundNum, winRound, isPending);
    const db = bobQualityScore(b, roundNum, winRound, isPending);
    if (db !== da) return db - da;
    if (isPending) {
        const ka = bobNumbersTiebreakKey(a);
        const kb = bobNumbersTiebreakKey(b);
        if (ka !== kb) return ka < kb ? -1 : 1;
        const sa = lotto023ResolvedSetGame(a);
        const sb = lotto023ResolvedSetGame(b);
        if (sa.setNum !== sb.setNum) return sb.setNum - sa.setNum;
        return sa.gameNum - sb.gameNum;
    }
    return savedRowBobTiebreakText(a).localeCompare(savedRowBobTiebreakText(b), 'ko', { sensitivity: 'base' });
}

/** 미추첨 회차: 세트 내림차순, 게임 오름차순 */
function compareSavedResultRowsPending(a, b) {
    const sa = lotto023ResolvedSetGame(a);
    const sb = lotto023ResolvedSetGame(b);
    if (sa.setNum !== sb.setNum) return sb.setNum - sa.setNum;
    return sa.gameNum - sb.gameNum;
}

/** Lotto023 행이 BoB(Perfect top 5) 모드인지 */
function isSavedGameBobMode(game) {
    if (!game) return false;
    const m = (game.gameMode != null && game.gameMode !== '') ? String(game.gameMode).trim() : '';
    if (m === 'BoB' || m === 'Bob') return true;
    const sheet = game['게임선택'];
    if (sheet != null && sheet !== '') {
        const s = String(sheet).trim();
        if (s === 'BoB' || s === 'Bob') return true;
    }
    return false;
}

/** 추첨 완료 회차: 일치 수·보너스·합 차이·세트·게임 순 */
function compareSavedResultRowsDrawn(a, b, winRound) {
    const winNums = winRound && Array.isArray(winRound.numbers) ? winRound.numbers : null;
    if (!winNums || winNums.length < 6) return compareSavedResultRowsPending(a, b);

    const bonus = winRound.bonus;
    const winSum = winNums.slice(0, 6).reduce((s, n) => s + (Number(n) || 0), 0);

    function rowKey(g) {
        const raw = g.numbers ? g.numbers.map(n => Number(n)).filter(n => !Number.isNaN(n)) : [];
        const nums = [...raw].sort((x, y) => x - y);
        const sg = lotto023ResolvedSetGame(g);
        const valid = nums.length === 6 && new Set(nums).size === 6;
        if (!valid) {
            return { valid: false, setNum: sg.setNum, gameNum: sg.gameNum };
        }
        const res = getLottoRank(nums, winNums, bonus);
        const gameSum = nums.reduce((s, n) => s + n, 0);
        return {
            valid: true,
            matchCount: res.matchCount,
            bonusInc: res.isBonusMatch ? 1 : 0,
            sumDist: Math.abs(gameSum - winSum),
            setNum: sg.setNum,
            gameNum: sg.gameNum
        };
    }

    const ka = rowKey(a);
    const kb = rowKey(b);
    if (!ka.valid && !kb.valid) {
        if (ka.setNum !== kb.setNum) return kb.setNum - ka.setNum;
        return ka.gameNum - kb.gameNum;
    }
    if (!ka.valid) return 1;
    if (!kb.valid) return -1;
    if (ka.matchCount !== kb.matchCount) return kb.matchCount - ka.matchCount;
    if (ka.bonusInc !== kb.bonusInc) return kb.bonusInc - ka.bonusInc;
    if (ka.sumDist !== kb.sumDist) return ka.sumDist - kb.sumDist;
    if (ka.setNum !== kb.setNum) return kb.setNum - ka.setNum;
    return ka.gameNum - kb.gameNum;
}

/** Lotto023 게임에서 현재 세트·게임 번호 (파일/정규화 공통) */
function lotto023ResolvedSetGame(g) {
    const sRaw = g.set !== undefined && g.set !== null && g.set !== '' ? g.set : g['세트'];
    const gRaw = g.game !== undefined && g.game !== null && g.game !== '' ? g.game : g['게임'];
    const setNum = parseInt(String(sRaw != null ? sRaw : ''), 10);
    const gameNum = parseInt(String(gRaw != null ? gRaw : ''), 10);
    return {
        setNum: !Number.isNaN(setNum) && setNum > 0 ? setNum : 1,
        gameNum: !Number.isNaN(gameNum) && gameNum > 0 ? gameNum : 1
    };
}

/** Lotto645 기준 해당 회차 추첨 번호가 있으면 true (미추첨·미래 회차는 false) */
// isLotto645RoundDrawn → modules/utils/lottoUtils.js 로 이동되었습니다.

/** KST 기준 오늘 날짜 YYYY-MM-DD (추첨일·당일 저장 판별) */
// getSeoulDateYmdToday → modules/utils/lottoUtils.js 로 이동되었습니다.

/** Lotto645 한 행의 추첨일을 KST 달력 기준 YYYY-MM-DD */
// lotto645RoundDrawYmdSeoul → modules/utils/lottoUtils.js 로 이동되었습니다.

/** 추첨이 끝난 회차라도, 동행복권 추첨일(KST)이 오늘(KST)이면 당일 저장 허용 대상 */
// isLotto645DrawDateTodaySeoul → modules/utils/lottoUtils.js 로 이동되었습니다.

/** 최신 당첨 회차 + 1 (당첨 데이터 없음·비정상이면 NaN) */
// getNextUndrawnLotto645Round → modules/utils/lottoUtils.js 로 이동되었습니다.

/**
 * 신규 번호저장 대상 회차.
 * - 목록 필터 회차: 미추첨이면 그 회차 / 당일 추첨 완료(KST)면 그 회차도 허용.
 * - 당일 추첨 직후: Lotto645 최신 행이 오늘(KST) 추첨이면 그 회차(아직 다음 회차로 넘기지 않음).
 * - 그 외: 최신 당첨의 다음 미추첨 회차.
 */
// getSaveTargetPendingRound → modules/utils/lottoUtils.js 로 이동되었습니다.

/** 번호저장 버튼: 미추첨 저장 회차를 쓸 수 있는지(목록 필터 또는 다음 회차) */
// isPendingSaveRoundFilterActive → modules/utils/lottoUtils.js 로 이동되었습니다.

/** 저장 대상 회차: `getSaveTargetPendingRound`와 히든 필드 폴백 */
// getEffectiveSaveRound → modules/utils/lottoUtils.js 로 이동되었습니다.

/** 번호저장(신규) 직전 검증: 미추첨 대상 회차 확정 */
// validateNewSaveRoundContext → modules/utils/lottoUtils.js 로 이동되었습니다.

/**
 * 저장된 결과 로드 및 표시
 */
// loadAndDisplayResults → modules/dataLoader.js 로 이동되었습니다.

/**
 * 날짜 문자열을 Date 객체로 변환 (YYYY-MM-DD, yy/mm/dd, 또는 000000 형식 지원)
 */
/**
 * 입력값을 회차 번호로 변환하는지 확인 (4자리 이내 숫자, 0000 이상)
 */
// isRoundInput → modules/utils/lottoUtils.js 로 이동되었습니다.

/**
 * 회차 번호를 해당 회차의 날짜(yy/mm/dd)로 변환 (Lotto645.csv 데이터 기준)
 */
// convertRoundToDate → modules/utils/lottoUtils.js 로 이동되었습니다.

/**
 * 6자리 날짜 입력 시 해당 날짜를 포함하는 회차 찾기
 * @param {string} dateInput - 6자리 날짜 (yyyymmdd 또는 yymmdd)
 * @param {boolean} isStartDate - 시작일인지 여부 (true: 이후 첫 회차, false: 이전 마지막 회차)
 * @returns {string} 해당 회차의 날짜 (yy/mm/dd) 또는 null
 */
// convertDateToRoundDate → modules/utils/lottoUtils.js 로 이동되었습니다.

// parseDate → modules/utils/lottoUtils.js 로 이동되었습니다.

/**
 * 날짜를 YYYY-MM-DD 형식 문자열로 변환
 */
// formatDate → modules/utils/lottoUtils.js 로 이동되었습니다.

/**
 * 날짜를 yy/mm/dd 형식 문자열로 변환
 */
// formatDateYYMMDD → modules/utils/lottoUtils.js 로 이동되었습니다.

/**
 * 8자리 숫자를 yy/mm/dd 형식으로 치환 (조회기간 검증용)
 * - 19xx/20xx 시작 시 YYYYMMDD → yy/mm/dd
 * - 00000000 → 00/00/00
 * - 그 외 8자리 시 YYMMDDxx → yy/mm/dd (앞 6자리 사용)
 */
function formatEightDigitsToYYMMDD(str) {
    if (!str || typeof str !== 'string') return '';
    const digits = str.replace(/\D/g, '');
    if (digits.length !== 8) return '';
    const a = digits.substring(0, 2);
    let yy, mm, dd;
    if (a === '19' || a === '20') {
        yy = digits.substring(2, 4);
        mm = digits.substring(4, 6);
        dd = digits.substring(6, 8);
    } else {
        yy = digits.substring(0, 2);
        mm = digits.substring(2, 4);
        dd = digits.substring(4, 6);
    }
    return yy + '/' + mm + '/' + dd;
}

/**
 * 조회기간 입력을 yy/mm/dd 형식으로 통일
 * - 8자리 숫자, 00000000 → yy/mm/dd
 * - 999999, 99999999 → 당일(yy/mm/dd)
 * - yyyy-mm-dd, yyyy/mm/dd → yy/mm/dd
 * @returns {string|null} yy/mm/dd 문자열 또는 변환 불가 시 null
 */
function normalizeToYYMMDD(value) {
    if (!value || typeof value !== 'string') return null;
    const trimmed = value.trim();
    if (!trimmed) return null;

    const digitsOnly = trimmed.replace(/\D/g, '');

    // 999999 또는 99999999 → 당일
    if (digitsOnly === '999999' || digitsOnly === '99999999') {
        return formatDateYYMMDD(new Date());
    }

    // 8자리 숫자 (00000000 포함)
    if (digitsOnly.length === 8) {
        const formatted = formatEightDigitsToYYMMDD(digitsOnly);
        return formatted || null;
    }

    // yyyy-mm-dd
    const dashMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (dashMatch) {
        const yy = dashMatch[1].substring(2);
        return `${yy}/${dashMatch[2]}/${dashMatch[3]}`;
    }

    // yyyy/mm/dd
    const slashMatch = trimmed.match(/^(\d{4})\/(\d{2})\/(\d{2})$/);
    if (slashMatch) {
        const yy = slashMatch[1].substring(2);
        return `${yy}/${slashMatch[2]}/${slashMatch[3]}`;
    }

    // 이미 yy/mm/dd 형식 (2자리/2자리/2자리)
    if (/^\d{2}\/\d{2}\/\d{2}$/.test(trimmed)) {
        return trimmed;
    }

    return null;
}

/**
 * 조회기간 yy/mm/dd 형식 검증 (유효한 날짜인지 확인)
 * 00/00/00(00000000 치환)은 전체 구간용으로 허용
 * @returns {{ valid: boolean, message?: string }}
 */
// validateYYMMDDInput → modules/utils/lottoUtils.js 로 이동되었습니다.

/**
 * YYYY-MM-DD 형식을 yy/mm/dd 형식으로 변환
 */
function convertToYYMMDD(dateString) {
    if (!dateString) return '';
    const date = parseDate(dateString);
    if (!date) return dateString;
    return formatDateYYMMDD(date);
}

/**
 * yy/mm/dd 형식을 YYYY-MM-DD 형식으로 변환 (000000/999999/00/00/00 특수 처리)
 */
function convertFromYYMMDD(dateString) {
    if (!dateString) return '';
    const trimmed = dateString.trim();
    if (trimmed === '000000' || trimmed === '999999' || trimmed === '00/00/00') {
        return trimmed === '00/00/00' ? '000000' : trimmed;
    }
    const date = parseDate(dateString);
    if (!date) return dateString;
    return formatDate(date);
}

/**
 * 시작일과 종료일 사이의 회차 범위 계산
 * 시작일을 포함한 이후 첫 회차 ~ 종료일을 포함한 이전 회차
 */
// calculateRoundRange → modules/utils/lottoUtils.js 로 이동되었습니다.

/**
 * 날짜 입력에서 해당 회차 번호 찾기 (Lotto645.csv 데이터 기준)
 * @param {string} dateInput - 날짜 입력 (회차 또는 날짜)
 * @param {boolean} isStartDate - 시작일인지 여부
 * @returns {number|null} 회차 번호 또는 null
 */
// findRoundFromDateInput → modules/utils/lottoUtils.js 로 이동되었습니다.

/**
 * 시작일/종료일 회차 표시 업데이트 (Lotto645.csv 데이터 기준)
 * 시작일/종료일 입력값을 바탕으로 Lotto645.csv에서 해당 회차를 찾아 표시
 */
// updateRoundDisplay → modules/renderer.js 로 이동되었습니다.

/**
 * 회차 범위 표시 업데이트
 */
// updateRoundRangeDisplay → modules/renderer.js 로 이동되었습니다.

/**
 * 시작일과 종료일 비교 검증 (종료일이 시작일보다 커야 함)
 * @returns {boolean} 검증 통과 여부
 */
// validateDateRange → modules/utils/lottoUtils.js 로 이동되었습니다.

/**
 * 날짜로 회차 찾기 (closest: true면 근접 회차 반환)
 */
// findRoundByDate → modules/utils/lottoUtils.js 로 이동되었습니다.

// findDateByRound → modules/utils/lottoUtils.js 로 이동되었습니다.

function getRangeType() {
    const radio = document.querySelector('input[name="rangeType"]:checked');
    return radio ? radio.value : 'round';
}

/**
 * 회차 입력 -> 날짜 자동 계산
 */
// syncRoundToDate → modules/utils/lottoUtils.js 로 이동되었습니다.

/**
 * 날짜 입력 -> 회차 자동 계산
 */
// syncDateToRound → modules/utils/lottoUtils.js 로 이동되었습니다.


// setupRangeTypeSelectors → modules/eventHandlers.js 로 이동되었습니다.



/**
 * 선택된 기간에 해당하는 데이터 필터링 (기간 모드용)
 */
// filterDataByDateRange → modules/utils/lottoUtils.js 로 이동되었습니다.

/**
 * 당첨 데이터에서 회차 범위(포함)만 잘라 반환. 배열은 최신→과거 순이어도 무방.
 */
// filterLotto645ByRoundInclusive → modules/utils/lottoUtils.js 로 이동되었습니다.

/**
 * AI추천 전용: 종료회차 기준 최근 100회(종료−99~종료)만 잘라 extractAndApplyFilters.
 * 조회 버튼·초기 로드에서는 호출하지 않음(그때는 조회 구간 또는 전체 데이터로 extract).
 */
// getAiRecommendEndRoundForFilters → modules/utils/lottoUtils.js 로 이동되었습니다.

/**
 * AI추천용: 조회 종료회차 기준 최근 100회(종료−99~종료) 통계로 옵션필터·합계구간·핫콜판정구간 반영
 */
// applyAiRecommendFiltersForEndRound → modules/utils/lottoUtils.js 로 이동되었습니다.

/**
 * 행운번호용: 제1회~데이터 최신회 전체 통계로 옵션필터 반영
 */
function applyLuckyNumbersStatBasisToDom() {
    const data = AppState.allLotto645Data;
    if (!data || !data.length) return;
    const latest = Number(data[0].round);
    if (Number.isNaN(latest)) return;
    const slice = filterLotto645ByRoundInclusive(data, 1, latest);
    if (!slice.length) return;
    extractAndApplyFilters(slice);
}

function snapshotOptionFiltersForRestore() {
    return {
        filterAvgLow: document.getElementById('filterAvgLow')?.value ?? '',
        filterAvgMid: document.getElementById('filterAvgMid')?.value ?? '',
        filterAvgHigh: document.getElementById('filterAvgHigh')?.value ?? '',
        filterOddEven: document.getElementById('filterOddEven')?.value ?? 'none',
        filterHotCold: document.getElementById('filterHotCold')?.value ?? 'none',
        filterConsecutive: document.getElementById('filterConsecutive')?.value ?? 'none',
        filterAC: document.getElementById('filterAC')?.value ?? '8',
        sumRangeStart: AppState.sumRangeStart,
        sumRangeEnd: AppState.sumRangeEnd,
        sumBandPerGame: AppState.sumBandPerGame
            ? AppState.sumBandPerGame.map(function (b) { return { start: b.start, end: b.end }; })
            : null,
        optionHotColdBasisRounds: AppState.optionHotColdBasisRounds ? AppState.optionHotColdBasisRounds.slice() : null,
        aiRecommendWindowStart: AppState.aiRecommendWindowStart,
        aiRecommendWindowEnd: AppState.aiRecommendWindowEnd
    };
}

function restoreOptionFilters(snap) {
    if (!snap) return;
    const low = document.getElementById('filterAvgLow');
    const mid = document.getElementById('filterAvgMid');
    const high = document.getElementById('filterAvgHigh');
    if (low) low.value = snap.filterAvgLow;
    if (mid) mid.value = snap.filterAvgMid;
    if (high) high.value = snap.filterAvgHigh;
    const oe = document.getElementById('filterOddEven');
    const hc = document.getElementById('filterHotCold');
    const sq = document.getElementById('filterConsecutive');
    const ac = document.getElementById('filterAC');
    if (oe && [...oe.options].some(function (o) { return o.value === snap.filterOddEven; })) oe.value = snap.filterOddEven;
    if (hc && [...hc.options].some(function (o) { return o.value === snap.filterHotCold; })) hc.value = snap.filterHotCold;
    if (sq) {
        var snapSeq = snap.filterConsecutive === '0' ? 'none' : snap.filterConsecutive;
        if ([...sq.options].some(function (o) { return o.value === snapSeq; })) sq.value = snapSeq;
    }
    if (ac && [...ac.options].some(function (o) { return o.value === snap.filterAC; })) ac.value = snap.filterAC;
    AppState.sumRangeStart = snap.sumRangeStart;
    AppState.sumRangeEnd = snap.sumRangeEnd;
    AppState.sumBandPerGame = snap.sumBandPerGame && snap.sumBandPerGame.length
        ? snap.sumBandPerGame.map(function (b) { return { start: Number(b.start), end: Number(b.end) }; })
        : null;
    AppState.optionHotColdBasisRounds = snap.optionHotColdBasisRounds ? snap.optionHotColdBasisRounds.slice() : null;
    AppState.aiRecommendWindowStart = snap.aiRecommendWindowStart;
    AppState.aiRecommendWindowEnd = snap.aiRecommendWindowEnd;
    syncOptionFiltersAppStateFromDom();
}

/**
 * 시작회차부터 종료회차까지 출현되는 홀짝비율, 연속회수, 핫콜비율 등을 추출하여 옵션필터에 적용.
 * 합계 min~avr~max: AC 필터가 특정 값이면 그 AC와 동일한 당첨 회차만으로 밴드 계산(137·139 등 구간이 AC와 함께 의미 있게 맞음). AC none이면 전체 구간.
 */
function extractAndApplyFilters(filteredData) {
    if (!filteredData || filteredData.length === 0) return;

    const modal = computeModalOptionPatternFromRounds(filteredData);
    if (!modal) return;

    const bestOE = modal.bestOE;
    const bestSeq = modal.bestSeq;
    const bestHC = modal.bestHC;
    const bestAC = modal.bestAC;

    // 게임공(가운데) 패널 필터에 적용
    const oeEl = document.getElementById('filterOddEven');
    const seqEl = document.getElementById('filterConsecutive');
    const hcEl = document.getElementById('filterHotCold');
    const acEl = document.getElementById('filterAC');
    if (oeEl) {
        if ([...oeEl.options].some(opt => opt.value === bestOE)) oeEl.value = bestOE;
        else oeEl.value = 'none';
    }
    if (seqEl) {
        if ([...seqEl.options].some(opt => opt.value === bestSeq)) seqEl.value = bestSeq;
        else seqEl.value = 'none';
    }
    if (hcEl) {
        if ([...hcEl.options].some(opt => opt.value === bestHC)) hcEl.value = bestHC;
        else hcEl.value = 'none';
    }
    if (acEl) {
        if ([...acEl.options].some(opt => opt.value === bestAC)) acEl.value = bestAC;
        else acEl.value = '8';
    }
    var sumBandRounds = filteredData;
    var acValForBand = acEl ? acEl.value : 'none';
    if (acValForBand && acValForBand !== 'none') {
        var acNumBand = parseInt(acValForBand, 10);
        if (!Number.isNaN(acNumBand)) {
            var byAc = filteredData.filter(function (round) {
                var nums = round.numbers;
                if (!nums || nums.length !== 6) return false;
                var sorted = [...nums].map(Number).sort(function (a, b) { return a - b; });
                return calculateAC(sorted) === acNumBand;
            });
            if (byAc.length > 0) sumBandRounds = byAc;
        }
    }
    applySumMeanBandToFilterInputs(sumBandRounds);
    AppState.optionHotColdBasisRounds = filteredData && filteredData.length ? filteredData.slice() : null;
    syncOptionFiltersAppStateFromDom();
}

/**
 * 날짜 범위 또는 회차 범위 변경 시 통계 및 회차별 당첨번호 업데이트
 */
// updateStatsByDateRange → modules/renderer.js 로 이동되었습니다.

/**
 * 회차 범위 표시 업데이트 (기존 함수 재구현)
 */
// updateRoundRangeDisplay → modules/renderer.js 로 이동되었습니다.

/**
 * 통계공 렌더링 (전체 데이터 표시)
 * 중요: AppState.allLotto645Data (원본 Lotto645.csv 데이터)를 기준으로 표시
 */
// renderStats → modules/renderer.js 로 이동되었습니다.

// updateAverageSumDisplay → modules/renderer.js 로 이동되었습니다.

/**
 * 회차 라인 DOM 생성 (회차별 당첨번호용)
 */
// createRoundLineElement → modules/renderer.js 로 이동되었습니다.

/**
 * 당첨공(회차별 당첨번호) 목록 렌더링
 * data 인자가 없으면 전체 데이터 사용
 */
// showRoundInfoBubble → modules/renderer.js 로 이동되었습니다.

/**
 * 특정 회차(또는 최신) 로또 정보 모달 표시
 * roundNo가 없거나 null이면 최신 회차 조회
 */
// loadAndShowLottoRound → modules/utils/lottoUtils.js 로 이동되었습니다.

// getRoundSum → modules/utils/lottoUtils.js 로 이동되었습니다.

/**
 * 1~(당첨회차-1)회까지 당첨 6개 기준 집계(평균 합·평균 홀 개수·평균 연속 쌍·평균 AC)
 */
// aggregateStatsForPriorRounds → modules/utils/lottoUtils.js 로 이동되었습니다.

/**
 * 당첨 말풍선용: 이번 6개 vs 전회까지 평균 비교 HTML
 */
// buildLottoRoundStatsCompareHtml → modules/utils/lottoUtils.js 로 이동되었습니다.
/**
 * 회차별 당첨번호 목록 렌더링
 * 000=회차 올림차순, 999=회차 내림차순, 777=당첨합계 올림차순, 888=당첨합계 내림차순, 21~255=동일당첨합계
 */
// renderViewNumbersList → modules/renderer.js 로 이동되었습니다.

// 당첨회차 말풍선은 우측 패널 결과박스의 회차 클릭에서만 표시
// (헤더 제목 클릭 → 최신회차 말풍선 제거)

/**
 * 좌측 정렬과 하단 차트 연동: 번호순▼·당첨순▼·출현순▼일 때만 해당 패널 펼침(▲이면 접힘).
 * 합계 그래프↔번호순, 번호통계↔당첨순, 출현통계↔출현순.
 */
function syncBottomChartsToSortState() {
    const cs = AppState.currentSort;
    const sumPanel = document.getElementById('bottomArea');
    const winFreqPanel = document.getElementById('bottomAreaWin');
    const numFreqPanel = document.getElementById('bottomAreaNumber');
    const data = AppState.currentStatsRounds || AppState.allLotto645Data;

    if (sumPanel) {
        const show = cs === 'number-desc';
        sumPanel.classList.toggle('visible', show);
        if (show && data && data.length && typeof renderMonthlyAverageChart === 'function') {
            renderMonthlyAverageChart(data);
        }
    }
    if (numFreqPanel) {
        const show = cs === 'win-desc';
        numFreqPanel.classList.toggle('visible', show);
        if (show && data && data.length && typeof renderNumberFrequencyChart === 'function') {
            renderNumberFrequencyChart(data);
        }
    }
    if (winFreqPanel) {
        const show = cs === 'appearance-desc';
        winFreqPanel.classList.toggle('visible', show);
        if (show && data && data.length && typeof renderWinFrequencyChart === 'function') {
            renderWinFrequencyChart(data);
        }
    }
}

// setupFooterToggle → modules/eventHandlers.js 로 이동되었습니다.

// 전체화면 버튼: 클릭 시 토글, fullscreenchange 시 버튼 텍스트 갱신
// setupFullscreenButton → modules/eventHandlers.js 로 이동되었습니다.

// setupResultFilterListeners → modules/eventHandlers.js 로 이동되었습니다.

// updateResultFilterAvg → modules/renderer.js 로 이동되었습니다.

// showNavBubble → modules/renderer.js 로 이동되었습니다.

// fetchLatestWinningNumbers → modules/dataLoader.js 로 이동되었습니다.

// setupPanelLabelToggle → modules/eventHandlers.js 로 이동되었습니다.

/**
 * 뷰포트 900px 이하·전체 레이아웃: 세 패널 가로 레일 스크롤 시 중앙(게임) 패널이 보이도록 맞춤.
 */
function setupHandheldThreePanelRail() {
    if (setupHandheldThreePanelRail._done) return;
    setupHandheldThreePanelRail._done = true;
    try {
        const mq = typeof window.matchMedia === 'function' ? window.matchMedia('(max-width: 900px)') : null;
        const main = document.querySelector('.main-container');
        const gameBox = document.querySelector('.panel-box-game');

        function isRailActive() {
            return !!(mq && mq.matches);
        }

        function alignGamePanelIntoView() {
            if (!main || !gameBox) return;
            if (!isRailActive()) {
                main.scrollLeft = 0;
                return;
            }
            const w = gameBox.getBoundingClientRect().width;
            let target = gameBox.offsetLeft - (main.clientWidth - w) / 2;
            const maxScroll = Math.max(0, main.scrollWidth - main.clientWidth);
            target = Math.max(0, Math.min(maxScroll, Math.round(target)));
            main.scrollLeft = target;
        }

        let debounceT = null;
        function scheduleAlign() {
            clearTimeout(debounceT);
            debounceT = setTimeout(function () {
                requestAnimationFrame(function () {
                    requestAnimationFrame(alignGamePanelIntoView);
                });
            }, 80);
        }

        const onMq = function () {
            scheduleAlign();
        };
        if (mq && typeof mq.addEventListener === 'function') mq.addEventListener('change', onMq);
        else if (mq && typeof mq.addListener === 'function') mq.addListener(onMq);
        window.addEventListener('resize', scheduleAlign);
        window.addEventListener('orientationchange', scheduleAlign);

        if (typeof ResizeObserver === 'function' && main && gameBox) {
            try {
                const ro = new ResizeObserver(scheduleAlign);
                ro.observe(main);
                ro.observe(gameBox);
            } catch (e) {
                /* ignore */
            }
        }

        scheduleAlign();
    } catch (e) {
        console.warn('[로또] setupHandheldThreePanelRail 예외:', e);
    }
}

window.addEventListener('load', () => {
    setTimeout(function () {
        try {
            initializeApp();
            initAIChat();
            setupRangeTypeSelectors();
            setupFooterToggle();
            setupPanelLabelToggle();
            setupResultFilterListeners();
            const navFetchBtn = document.getElementById('navFetchLatest');
            setupScrollToTopButton();
            if (navFetchBtn) {
                navFetchBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    fetchLatestWinningNumbers();
                });
            }
            // 전체화면은 헤더 '전체화면' 버튼으로만 전환 (첫 로드 시 자동 전체화면 없음)
            setupFullscreenButton();
            setupHandheldThreePanelRail();
            // showApologyBubble() — 콘솔에서 수동 호출 가능
        } catch (e) {
            console.error('[로또] initializeApp 예외:', e);
        }
    }, 100);
});

// --- AI 챗봇 기능 ---
// initAIChat → modules/aiChat.js 로 이동되었습니다.


/**
 * 회차별 당첨 합계 막대그래프 렌더링
 */
// renderMonthlyAverageChart → modules/renderer.js 로 이동되었습니다.

/**
 * 번호통계 차트: X축 1~45, Y축 출현횟수
 */
/**
 * 출현통계 차트: X축 1~45, Y축 당첨회수 (해당 번호가 당첨번호에 포함된 회차 수)
 */
// renderWinFrequencyChart → modules/renderer.js 로 이동되었습니다.

// renderNumberFrequencyChart → modules/renderer.js 로 이동되었습니다.

/** 회차 데이터로부터 Date 객체 추출 유틸리티 */
// getRoundDateObject → modules/utils/lottoUtils.js 로 이동되었습니다.

/**
 * 화면 우측 하단 'TOP' 버튼 기능 설정
 */
// setupScrollToTopButton → modules/eventHandlers.js 로 이동되었습니다.

if (document.readyState === 'complete') {
    setTimeout(initializeApp, 200);
}

/**
 * 미추첨 말풍선 「기대」 문단: 같은 마음이지만 번호·패턴·회차·모드에 따라 결정적으로 다른 문장을 고릅니다.
 */
function pickPendingHopeParagraph(p) {
    const roundNum = p.roundNum;
    const mode = p.mode || '';
    const pickSumDisp = p.pickSumDisp;
    const numsValid = p.numsValid;
    const sortedSix = p.sortedSix || [];
    const sumSix = p.sumSix | 0;
    const ac = p.ac | 0;
    const actualOdd = p.actualOdd | 0;
    const actualEven = p.actualEven | 0;
    const actualSeq = p.actualSeq | 0;
    const actualHot = p.actualHot | 0;

    const HOPE_VARIANTS = [
        '숫자 하나에 모인 설렘이 곧 좋은 소식으로 이어지고, 저장해 둔 균형이 추첨 무대에서 고운 울림으로 남으며, 의도하신 간격이 다음에도 빛나길 응원합니다. 숫자 너머 어느 결과에든 희망이 번지고, 당첨 발표를 향한 마음이 가득 차기를 바랍니다.',
        '여섯 수에 실린 마음이 차분히 이어져, 기록해 둔 리듬이 추첨 날에도 부드럽게 울리길 바랍니다. 이웃한 간격과 넓은 간격이 모두 이야기가 되고, 열리는 결과마다 따뜻한 기대가 더해지길 응원합니다.',
        '오늘 고른 조합이 당신만의 악보처럼 남아, 추첨의 순간에도 그 선율이 흐트러지지 않길 바랍니다. 홀과 짝, 핫과 콜이 어우러진 그림이 어떤 결말로 닿든 마음은 가볍게 빛나길 응원합니다.',
        '저장해 둔 숫자들이 조용한 다짐처럼 곁에 머물다, 발표가 열리는 날에는 좋은 소식으로 되돌아오길 바랍니다. 통계의 흐름과도 닿아 있고, 그 너머로는 언제나 새로운 가능이 열리길 기대합니다.',
        '합과 간격, 그리고 스스로 정한 조건이 한데 어울려 지금 이 한 줄을 만들었습니다. 그 의도가 추첨 무대에서도 존중받는 느낌으로 이어지고, 결과가 열릴 때마다 마음에 여유가 스미길 바랍니다.',
        '연속으로 붙은 숫자든 한 칸씩 벌어진 숫자든, 모두 당신이 고른 호흡입니다. 그 호흡이 다음 장에서도 자연스럽게 이어지고, 당첨 발표를 앞두고 설렘과 안심이 함께 머무르길 응원합니다.',
        '핫의 기운과 콜의 고요가 한 조합 안에서 만나, 당신만의 균형을 이루고 있습니다. 그 균형이 발표 순간에도 흔들리지 않고, 어떤 번호가 열리든 희망이 길게 남길 바랍니다.',
        '선택 합계에 담긴 무게만큼이나, 여섯 수에 실린 바람도 분명합니다. 그 바람이 추첨의 공기와 맞닿을 때 좋은 방향으로 흘러가고, 발표 후에도 마음이 한결 가벼워지길 바랍니다.',
        '기록은 과거의 말이고, 추첨은 아직 열리지 않은 문입니다. 그 문 너머로 어떤 그림이 펼쳐지든 지금 이 선택을 소중히 여기는 마음만은 변치 않길, 당첨 소식이 가까이 스칠 수 있기를 응원합니다.',
        '모드와 필터, 숫자의 배열까지 모두 그날의 선택입니다. 그 선택이 통계와 우연 사이에서 고운 길을 찾아가고, 발표의 순간에도 당신의 의도가 빛으로 남기를 바랍니다.'
    ];

    let seed = 0;
    const mix = function (v) {
        seed = ((seed * 33) ^ (v | 0)) | 0;
    };
    if (roundNum != null && !Number.isNaN(Number(roundNum))) mix((Number(roundNum) | 0) * 2654435761);
    for (let i = 0; i < mode.length; i++) mix(mode.charCodeAt(i) * (i + 3));
    if (pickSumDisp != null && !Number.isNaN(Number(pickSumDisp))) mix(Math.floor(Number(pickSumDisp)) | 0);
    if (numsValid && sortedSix.length === 6) {
        mix(sumSix);
        mix(ac * 19349663);
        mix(actualOdd * 83492791 + actualEven * 50331653);
        mix(actualSeq * 100663319);
        mix(actualHot * 2246822519);
        for (let j = 0; j < 6; j++) mix((sortedSix[j] | 0) * (j * 7 + 1));
    }

    const idx = Math.abs(seed) % HOPE_VARIANTS.length;
    return HOPE_VARIANTS[idx];
}

/**
 * 미추첨 저장 게임: 저장된 회차·옵션 표 + 「이번 게임은」설명(검증 표 없음)
 * @returns {{ optionsTable: string, choiceReasonHtml: string }}
 */
// buildPendingGameOptionsAndChoiceReason → modules/renderer.js 로 이동되었습니다.

/** 추첨 결과 말풍선: 당첨 6개+보너스 공(전부 검정 테두리 클래스는 호출부에서 부여) */
function formatWinningDrawBallsRowHtml(winNumsSorted, bonus) {
    const nums = winNumsSorted || [];
    let html = nums.map(function (n) {
        return `<span class="stat-ball stat-ball--sm ${getBallColorClass(n)} bubble-ball-draw-border" style="margin:0 2px;">${n}</span>`;
    }).join('');
    if (bonus != null && bonus !== '' && !Number.isNaN(Number(bonus))) {
        const b = Number(bonus);
        html += `<span style="margin:0 4px;font-size:var(--bubble-fs-sm);color:var(--color-text-muted,#5A6872);">+</span>`;
        html += `<span class="stat-ball stat-ball--sm ${getBallColorClass(b)} bubble-ball-draw-border" style="margin:0 2px;">${b}</span>`;
    }
    return html;
}

// showGameAnalysisBubble → modules/renderer.js 로 이동되었습니다.

// showResultAnalysisBubble → modules/renderer.js 로 이동되었습니다.

/** 도움말 본문(버튼 제외) — 열 때마다 주입해 내용 갱신이 반영되도록 함 */
function getHelpModalBodyHtml() {
    return `
                    <h2 style="margin:0 0 14px;font-size:1.2rem;color:var(--color-primary);">ShareHarmony Lotto 도움말</h2>
                    <p style="margin:0 0 14px;font-size:0.82rem;color:var(--color-text-secondary);">
                        이 앱은 <b>통계·기록을 바탕으로 번호를 고르고 저장하는 도구</b>입니다. 아래는 화면 설명과 함께, 기능을 쓸 때 알아 두면 좋은 <b>제작 측 의견</b>을 담았습니다.
                    </p>

                    <h3 style="margin:18px 0 8px;font-size:0.95rem;color:var(--color-primary);border-bottom:1px solid var(--color-harmony-border);padding-bottom:4px;">화면 구성</h3>
                    <p><b>좌측 패널</b>. 조회 기간 또는 회차 범위를 정한 뒤 <b>[조회]</b>로 통계에 쓸 데이터 범위를 바꿉니다. 여기서 좁힌 구간은 <b>핫/콜·출현 그래프</b> 등에 반영됩니다.</p>
                    <p><b>중앙 패널</b>. 옵션 필터(홀짝, 연속, 핫/콜 등)를 두고 <b>행운 · AI추천 · 반자동 · 수동</b>으로 번호를 만듭니다.</p>
                    <p><b>우측 패널</b>. 회차별 당첨 번호를 합계 등으로 찾아볼 수 있습니다.</p>
                    <p><b>저장공(결과 영역)</b>. 저장한 게임이 회차별로 나열됩니다. 체크 후 저장 흐름에서 삭제하거나, 새로 만든 번호를 같은 회차로 저장할 수 있습니다.</p>
                    <p><b>좌측 번호순·당첨순·출현순</b>. ▼이면 해당 하단 차트를 펼치고, ▲이면 접습니다. (합계·번호·출현 그래프)</p>
                    <p><b>최근당첨번호</b>. 동행복권 쪽 최신 정보를 가져와 데이터를 맞추려는 기능입니다. 네트워크·API 상황에 따라 실패할 수 있습니다.</p>
                    <p><b>하단 차트</b>. 좌측 정렬 버튼(▼)과 연동되어 표시됩니다.</p>

                    <h3 style="margin:18px 0 8px;font-size:0.95rem;color:var(--color-primary);border-bottom:1px solid var(--color-harmony-border);padding-bottom:4px;">게임 모드에 대한 의견</h3>
                    <p><b>행운</b>. 필터를 <b>맞추려는 목적 없이</b> 흐름에 맡긴 자동 배합에 가깝게 두었습니다. “내가 조건을 걸었다”는 느낌보다 <b>가볍게 한 줄 받는 용도</b>로 보시면 됩니다. 내부적으로 <b>홀·짝·핫·콜이 한쪽으로 5~6개 몰린 조합</b>(전체 데이터 기준 핫22/콜23)은 다시 뽑아 <b>극한 회피</b>합니다.</p>
                    <p><b>AI추천</b>. 화면에서 고른 <b>옵션 필터</b>를 반영해, 그 조건을 만족하는 쪽으로 조합하려는 <b>의도</b>가 있다고 보시면 됩니다.</p>
                    <p><b>반자동·수동</b>. 직접 고른 수와 저장 시점의 옵션이 <b>사용자 의도</b>를 드러냅니다. AI·행운과 달리 “내가 정한 선택”의 비중이 큽니다.</p>
                    <p style="font-size:0.84rem;color:var(--color-text-secondary);">위 구분은 <b>설명과 기록의 일관성</b>을 위한 것이며, 어떤 모드가 당첨에 유리하다는 뜻은 아닙니다.</p>

                    <h3 style="margin:18px 0 8px;font-size:0.95rem;color:var(--color-primary);border-bottom:1px solid var(--color-harmony-border);padding-bottom:4px;">통계·AI 표현에 대한 의견</h3>
                    <p>출현이 많은 번호를 <b>핫</b>이라 부르고, 적은 쪽을 <b>콜</b>에 가깝게 둘 수 있습니다. 이는 <b>지금까지의 기록을 요약한 라벨</b>일 뿐, “다음 회차에 꼭 나온다/안 나온다”를 약속하지 않습니다.</p>
                    <p><b>AI</b>라는 이름은 “사람이 일일이 다 고르지 않고, 필터와 규칙에 따라 조합을 채워 준다”는 수준의 의미로 쓰였습니다. <b>당첨을 예측하는 인공지능</b>이라고 이해하시면 오해가 생기기 쉽습니다.</p>
                    <p>과거 구간을 어떻게 조회하느냐에 따라 핫·그래프·일부 설명 숫자가 달라질 수 있습니다. <b>조회 범위를 바꿔 보며</b> 자신에게 맞는 참고만 쓰시길 권합니다.</p>

                    <h3 style="margin:18px 0 8px;font-size:0.95rem;color:var(--color-primary);border-bottom:1px solid var(--color-harmony-border);padding-bottom:4px;">책임 한계·건전한 이용(의견)</h3>
                    <p>이 소프트웨어와 그 안의 숫자·문구는 <b>참고용</b>입니다. <b>실제 복권 구매·당첨·세금·법적 분쟁</b>에 대한 책임은 <b>사용자 본인과 복권 발행·판매 주체</b>에 있습니다.</p>
                    <p>로또는 <b>소액·여가</b>로 즐기는 것이 좋습니다. 통계나 순위에 과도하게 의존하거나, 손실을 만회하려고 구매를 늘리는 것은 바람직하지 않다고 봅니다.</p>

                    <h3 style="margin:18px 0 8px;font-size:0.95rem;color:var(--color-primary);border-bottom:1px solid var(--color-harmony-border);padding-bottom:4px;">개발·분석 참고(원하실 때만)</h3>
                    <p style="font-size:0.84rem;color:var(--color-text-secondary);margin-bottom:0;">
                        무작위 기준선·롤링 방식의 <b>숫자 리포트</b>는 저장소의
                        <code style="font-size:0.78em;word-break:break-all;">utils/quality_report_rolling.py</code> ·
                        <code style="font-size:0.78em;word-break:break-all;">docs/QUALITY_REPORT_ROLLING.md</code> ·
                        <code style="font-size:0.78em;word-break:break-all;">docs/PERFECT_AND_QUALITY.md</code>
                        를 보시면 됩니다. 일반 이용에 필수는 아닙니다.
                    </p>`;
}

// showHelpModal → modules/renderer.js 로 이동되었습니다.
