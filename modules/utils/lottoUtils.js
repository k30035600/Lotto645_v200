/**
 * modules/utils/lottoUtils.js
 * 로또 관련 유틸리티 및 데이터 처리 함수들
 */



function computeRankSummaryForRoundGames(games, winRound) {
    const summary = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, total: (games && games.length) || 0 };
    if (!games || !winRound || !winRound.numbers) return summary;
    games.forEach(function (game) {
        if (!game.numbers) return;
        const res = getLottoRank(game.numbers, winRound.numbers, winRound.bonus);
        if (res.rank > 0 && res.rank <= 5) summary[res.rank]++;
    });
    return summary;
}

function computeRankSummaryForCrossRoundGames(games) {
    const summary = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, total: games ? games.length : 0 };
    if (!games) return summary;
    games.forEach(function (game) {
        const r = Number(game.round);
        if (Number.isNaN(r) || !isLotto645RoundDrawn(r) || !game.numbers) return;
        const winRound = (AppState.allLotto645Data || []).find(function (w) { return w.round === r; });
        if (!winRound || !winRound.numbers) return;
        const res = getLottoRank(game.numbers, winRound.numbers, winRound.bonus);
        if (res.rank > 0 && res.rank <= 5) summary[res.rank]++;
    });
    return summary;
}

function getHotColdNumbersBeforeRound(targetRound) {
    if (!AppState.allLotto645Data || AppState.allLotto645Data.length === 0) {
        return { hot: [], cold: [] };
    }
    var filtered = AppState.allLotto645Data.filter(r => r.round < targetRound);
    if (filtered.length === 0) return { hot: [], cold: [] };
    var winMap = calculateWinStats(filtered);
    var appMap = calculateAppearanceStats(filtered);
    var seqMap = calculateConsecutiveStats(filtered);
    return sortAndSplitHotCold(winMap, appMap, seqMap);
}

function resolveRoundsForModalTrustBasis() {
    if (AppState.optionHotColdBasisRounds && AppState.optionHotColdBasisRounds.length > 0) {
        return AppState.optionHotColdBasisRounds;
    }
    if (AppState.currentStatsRounds && AppState.currentStatsRounds.length > 0) {
        return AppState.currentStatsRounds;
    }
    return AppState.allLotto645Data || [];
}

function computeModalOptionPatternFromRounds(filteredData) {
    if (!filteredData || filteredData.length === 0) return null;

    const oddEvenCounts = {};
    const sequenceCounts = {};
    const hotColdCounts = {};
    const acCounts = {};

    const hcResult = sortAndSplitHotCold(
        calculateWinStats(filteredData),
        calculateAppearanceStats(filteredData),
        calculateConsecutiveStats(filteredData)
    );
    const hotSet = new Set(hcResult.hot);

    filteredData.forEach(function (round) {
        const nums = round.numbers;
        if (!nums || nums.length !== 6) return;

        let oddCount = 0;
        nums.forEach(function (n) { if (n % 2 !== 0) oddCount++; });
        const oeKey = oddCount + '-' + (6 - oddCount);
        oddEvenCounts[oeKey] = (oddEvenCounts[oeKey] || 0) + 1;

        const sorted = [...nums].sort(function (a, b) { return a - b; });
        let seqPairCount = 0;
        for (let i = 0; i < sorted.length - 1; i++) {
            if (sorted[i + 1] === sorted[i] + 1) seqPairCount++;
        }
        const seqKey = seqPairCount === 0 ? '0' : (seqPairCount >= 3 ? '3' : String(seqPairCount));
        sequenceCounts[seqKey] = (sequenceCounts[seqKey] || 0) + 1;

        let hotCount = 0;
        nums.forEach(function (n) { if (hotSet.has(parseInt(n, 10))) hotCount++; });
        const hcKey = hotCount + '-' + (6 - hotCount);
        hotColdCounts[hcKey] = (hotColdCounts[hcKey] || 0) + 1;

        const ac = calculateAC(sorted);
        const acKey = ac.toString();
        acCounts[acKey] = (acCounts[acKey] || 0) + 1;
    });

    const getMode = function (counts) {
        let mode = 'none';
        let maxFreq = -1;
        for (const key in counts) {
            if (counts[key] > maxFreq) {
                maxFreq = counts[key];
                mode = key;
            }
        }
        return mode;
    };

    return {
        bestOE: getMode(oddEvenCounts),
        bestSeq: getMode(sequenceCounts),
        bestHC: getMode(hotColdCounts),
        bestAC: getMode(acCounts),
        hot: hcResult.hot || [],
        cold: hcResult.cold || []
    };
}

function getLuckyStatRankTargetRound() {
    const rn = getEffectiveSaveRound();
    if (!Number.isNaN(rn) && rn >= 1) return rn;
    if (AppState.allLotto645Data && AppState.allLotto645Data.length > 0) {
        return AppState.allLotto645Data[0].round + 1;
    }
    return NaN;
}

function collectSixSumsFromRounds(rounds) {
    const sums = [];
    (rounds || []).forEach(function (round) {
        const nums = round && Array.isArray(round.numbers) ? round.numbers : [];
        if (nums.length !== 6) return;
        const s = nums.reduce(function (a, b) { return a + (Number(b) || 0); }, 0);
        if (s >= 21 && s <= 255) sums.push(s);
    });
    return sums;
}

function computeSumPercentileBandFromRounds(rounds, lowPct, highPct) {
    const sums = collectSixSumsFromRounds(rounds);
    if (sums.length === 0) return null;
    const sorted = sums.slice().sort(function (a, b) { return a - b; });
    const avr = sums.reduce(function (a, b) { return a + b; }, 0) / sums.length;
    let min = percentileLinearSorted(sorted, lowPct);
    let max = percentileLinearSorted(sorted, highPct);
    if (min > max) {
        const t = min;
        min = max;
        max = t;
    }
    min = Math.max(21, Math.min(255, min));
    max = Math.max(21, Math.min(255, max));
    if (min > max) max = min;
    return { min: min, max: max, avr: avr };
}

function computeSumPercentileSubBandsFromRounds(rounds, outerLowPct, outerHighPct, numSlots) {
    const sums = collectSixSumsFromRounds(rounds);
    if (sums.length === 0) return null;
    const sorted = sums.slice().sort(function (a, b) { return a - b; });
    const span = outerHighPct - outerLowPct;
    if (span <= 0 || numSlots < 1) return null;
    const out = [];
    for (let k = 0; k < numSlots; k++) {
        const pLo = outerLowPct + (span * k) / numSlots;
        const pHi = outerLowPct + (span * (k + 1)) / numSlots;
        let start = percentileLinearSorted(sorted, pLo);
        let end = percentileLinearSorted(sorted, pHi);
        if (start > end) {
            const t = start;
            start = end;
            end = t;
        }
        start = Math.max(21, Math.min(255, start));
        end = Math.max(21, Math.min(255, end));
        if (start > end) end = start;
        out.push({ start: start, end: end });
    }
    return out;
}

function computeSumMeanBandFromRounds(rounds) {
    const sums = collectSixSumsFromRounds(rounds);
    if (sums.length === 0) return null;
    const avr = sums.reduce(function (a, b) { return a + b; }, 0) / sums.length;
    const lower = sums.filter(function (x) { return x <= avr; });
    const upper = sums.filter(function (x) { return x >= avr; });
    const minMean = lower.length ? lower.reduce(function (a, b) { return a + b; }, 0) / lower.length : avr;
    const maxMean = upper.length ? upper.reduce(function (a, b) { return a + b; }, 0) / upper.length : avr;
    return { min: minMean, avr: avr, max: maxMean };
}

function meanSixNumberSumForRounds(rounds) {
    const sums = (rounds || []).map(r => {
        const n = r && r.numbers;
        if (!Array.isArray(n) || n.length < 6) return null;
        return n.slice(0, 6).reduce((s, x) => s + (Number(x) || 0), 0);
    }).filter(s => s != null && !Number.isNaN(s));
    if (sums.length === 0) return 138;
    return sums.reduce((a, b) => a + b, 0) / sums.length;
}

function isLotto645RoundDrawn(roundNum) {
    const n = Number(roundNum);
    const wr = (AppState.allLotto645Data || []).find(r => Number(r.round) === n);
    return !!(wr && Array.isArray(wr.numbers) && wr.numbers.length >= 6);
}

function getSeoulDateYmdToday() {
    try {
        return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul' }).format(new Date());
    } catch (e) {
        const d = new Date();
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    }
}

function lotto645RoundDrawYmdSeoul(roundNum) {
    const wr = (AppState.allLotto645Data || []).find(r => Number(r.round) === Number(roundNum));
    if (!wr || wr.date == null || wr.date === '') return null;
    if (typeof wr.date === 'number' && !Number.isNaN(wr.date)) {
        const utcMs = (wr.date - 25569) * 86400 * 1000;
        try {
            return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul' }).format(new Date(utcMs));
        } catch (e) {
            return null;
        }
    }
    const s = String(wr.date).trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
        return s.slice(0, 10);
    }
    const parsed = parseDate(s);
    if (!parsed || !(parsed instanceof Date) || Number.isNaN(parsed.getTime())) return null;
    try {
        return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul' }).format(parsed);
    } catch (e) {
        return formatDate(parsed);
    }
}

function isLotto645DrawDateTodaySeoul(roundNum) {
    if (!isLotto645RoundDrawn(roundNum)) return false;
    const ymd = lotto645RoundDrawYmdSeoul(roundNum);
    const today = getSeoulDateYmdToday();
    return ymd != null && today !== '' && ymd === today;
}

function getNextUndrawnLotto645Round() {
    const data = AppState.allLotto645Data;
    if (!data || !data.length) return NaN;
    const latest = Number(data[0].round);
    if (Number.isNaN(latest) || latest < 1) return NaN;
    return latest + 1;
}

function getSaveTargetPendingRound() {
    const fr = AppState.resultListRoundFilter;
    if (fr != null && fr !== '' && !Number.isNaN(Number(fr))) {
        const n = Number(fr);
        if (n >= 1) {
            if (!isLotto645RoundDrawn(n)) return n;
            if (isLotto645DrawDateTodaySeoul(n)) return n;
        }
    }
    const data = AppState.allLotto645Data;
    if (data && data.length > 0) {
        const latestR = Number(data[0].round);
        if (!Number.isNaN(latestR) && latestR >= 1 && isLotto645RoundDrawn(latestR) && isLotto645DrawDateTodaySeoul(latestR)) {
            return latestR;
        }
    }
    const nextR = getNextUndrawnLotto645Round();
    if (!Number.isNaN(nextR) && nextR >= 1 && !isLotto645RoundDrawn(nextR)) return nextR;
    return null;
}

function isPendingSaveRoundFilterActive() {
    return getSaveTargetPendingRound() != null;
}

function getEffectiveSaveRound() {
    const p = getSaveTargetPendingRound();
    if (p != null) return p;
    const el = document.getElementById('saveRound');
    if (!el || el.value === '' || el.value == null) return NaN;
    const n = parseInt(String(el.value), 10);
    return Number.isNaN(n) ? NaN : n;
}

function validateNewSaveRoundContext() {
    if (!isPendingSaveRoundFilterActive()) {
        alert('번호저장: 미추첨 회차를 정할 수 없습니다. 당첨 번호 데이터를 먼저 조회한 뒤 다시 시도해 주세요.');
        return false;
    }
    const rn = getEffectiveSaveRound();
    if (Number.isNaN(rn) || rn < 1) {
        alert('저장할 회차를 확인할 수 없습니다. 당첨 데이터 조회 후 다시 시도해 주세요.');
        return false;
    }
    if (isLotto645RoundDrawn(rn) && !isLotto645DrawDateTodaySeoul(rn)) {
        alert('이미 추첨 번호가 등록된 회차에는 신규 번호저장을 할 수 없습니다. (당일 추첨 회차는 같은 날 안에는 저장할 수 있습니다.)');
        return false;
    }
    return true;
}

function isRoundInput(value) {
    const trimmed = value.trim();
    // 1~4자리 숫자만 (0000 이상)
    if (!/^\d{1,4}$/.test(trimmed)) {
        return false;
    }
    const round = parseInt(trimmed);
    // 0000 이상이어야 함 (0은 허용하지 않음, 0001 이상)
    return round >= 1;
}

function convertRoundToDate(roundNumber) {
    // Lotto645.csv 데이터가 없으면 null 반환
    if (!AppState || !AppState.allLotto645Data || AppState.allLotto645Data.length === 0) {
        return null;
    }

    const round = parseInt(roundNumber);
    // 0001 이상이어야 함 (1회차 이상)
    if (isNaN(round) || round < 1) {
        return null;
    }

    // Lotto645.csv 데이터에서 회차 찾기 (타입 안전 비교)
    const lotto645Data = AppState.allLotto645Data;

    // 회차 검색 (더 안전한 비교)
    const roundData = lotto645Data.find(r => {
        // 다양한 타입과 형식 처리
        let rRound;
        if (typeof r.round === 'string') {
            rRound = parseInt(r.round.trim());
        } else if (typeof r.round === 'number') {
            rRound = Math.floor(r.round);
        } else {
            rRound = parseInt(String(r.round));
        }

        // NaN 체크
        if (isNaN(rRound)) {
            return false;
        }

        return rRound === round;
    });

    if (!roundData) {
        return null;
    }

    if (!roundData.date) {
        return null;
    }

    // 날짜를 yy/mm/dd 형식으로 변환
    const date = parseDate(roundData.date);
    if (!date || date === '000000' || date === '999999' || !(date instanceof Date)) {
        return null;
    }

    return formatDateYYMMDD(date);
}

function convertDateToRoundDate(dateInput, isStartDate) {
    if (!AppState || !AppState.allLotto645Data) return null;

    // 6자리 날짜 파싱
    const date = parseDate(dateInput);
    if (!date || date === '000000' || date === '999999') return null;

    if (isStartDate) {
        // 시작일: 시작일 포함 이후 첫 회차 찾기
        for (let i = AppState.allLotto645Data.length - 1; i >= 0; i--) {
            const roundDate = parseDate(AppState.allLotto645Data[i].date);
            if (roundDate && roundDate >= date) {
                return formatDateYYMMDD(roundDate);
            }
        }
    } else {
        // 종료일: 종료일 포함 이전 마지막 회차 찾기
        for (let i = 0; i < AppState.allLotto645Data.length; i++) {
            const roundDate = parseDate(AppState.allLotto645Data[i].date);
            if (roundDate && roundDate <= date) {
                return formatDateYYMMDD(roundDate);
            }
        }
    }

    return null;
}

function parseDate(dateString) {
    if (!dateString) return null;

    // 공백 제거
    dateString = dateString.trim();

    // 4자리 이내 숫자는 회차로 처리하지 않음 (parseDate는 날짜만 파싱)
    // 회차 처리는 별도 함수에서 처리

    // 000000 형식 처리 (예: 240101 -> 24/01/01, 000000은 첫회, 999999는 최종회)
    if (/^\d{6}$/.test(dateString)) {
        // 000000 또는 999999는 특별 처리
        if (dateString === '000000' || dateString === '999999') {
            return dateString; // 특별값으로 반환
        }

        const year = parseInt(dateString.substring(0, 2));
        const month = parseInt(dateString.substring(2, 4));
        const day = parseInt(dateString.substring(4, 6));

        if (month < 1 || month > 12 || day < 1 || day > 31) {
            return null;
        }

        const fullYear = year >= 50 ? 1900 + year : 2000 + year;
        return new Date(fullYear, month - 1, day);
    }

    // yy/mm/dd 형식 처리
    if (dateString.includes('/')) {
        const parts = dateString.split('/');
        if (parts.length !== 3) return null;
        let year = parseInt(parts[0]);
        const month = parseInt(parts[1]);
        const day = parseInt(parts[2]);

        // yy 형식이면 2000년대 또는 1900년대로 해석
        if (year < 100) {
            year = year >= 50 ? 1900 + year : 2000 + year;
        }

        return new Date(year, month - 1, day);
    }

    // YYYY-MM-DD 형식 처리
    const parts = dateString.split('-');
    if (parts.length !== 3) return null;
    return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
}

function formatDate(date) {
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function formatDateYYMMDD(date) {
    if (!date) return '';
    const year = String(date.getFullYear()).substring(2);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}/${month}/${day}`;
}

function validateYYMMDDInput(str) {
    if (!str || !str.trim()) return { valid: true };
    const value = str.trim();
    if (!/^\d{2}\/\d{2}\/\d{2}$/.test(value)) {
        return { valid: false, message: '조회기간은 yy/mm/dd 형식으로 입력해 주세요. (예: 26/03/09)' };
    }
    if (value === '00/00/00') return { valid: true };
    const date = parseDate(value);
    if (!date || date === '000000' || date === '999999') {
        return { valid: false, message: '유효한 날짜가 아닙니다. (yy/mm/dd)' };
    }
    if (isNaN(date.getTime())) {
        return { valid: false, message: '유효한 날짜가 아닙니다.' };
    }
    const [, mm, dd] = value.split('/').map(Number);
    if (mm < 1 || mm > 12 || dd < 1 || dd > 31) {
        return { valid: false, message: '월(01-12), 일(01-31)을 확인해 주세요.' };
    }
    return { valid: true };
}

function calculateRoundRange(lotto645Data, startDateStr, endDateStr) {
    if (!startDateStr || !endDateStr || !lotto645Data || lotto645Data.length === 0) {
        return null;
    }

    const startDate = parseDate(startDateStr);
    const endDate = parseDate(endDateStr);

    if (!startDate || !endDate) {
        return null;
    }

    // 필터링된 데이터를 가져옴
    const filteredData = filterDataByDateRange(
        lotto645Data,
        convertFromYYMMDD(startDateStr),
        convertFromYYMMDD(endDateStr)
    );

    if (filteredData.length === 0) {
        return null;
    }

    // 필터링된 데이터에서 최소/최대 회차 찾기
    let minRound = filteredData[0].round;
    let maxRound = filteredData[0].round;

    filteredData.forEach(round => {
        if (round.round < minRound) {
            minRound = round.round;
        }
        if (round.round > maxRound) {
            maxRound = round.round;
        }
    });

    return { min: minRound, max: maxRound };
}

function findRoundFromDateInput(dateInput, isStartDate) {
    // Lotto645.csv 데이터가 없으면 null 반환
    if (!AppState || !AppState.allLotto645Data || AppState.allLotto645Data.length === 0) {
        return null;
    }

    if (!dateInput) return null;

    const value = dateInput.trim();
    if (!value) return null;

    // Lotto645.csv 데이터 사용 (필터링되지 않은 원본 데이터)
    const lotto645Data = AppState.allLotto645Data;

    // 4자리 이내 숫자는 회차로 처리
    if (isRoundInput(value)) {
        const round = parseInt(value);
        // Lotto645.csv에서 해당 회차가 존재하는지 확인 (타입 안전 비교)
        const roundData = lotto645Data.find(r => {
            // 다양한 타입과 형식 처리
            let rRound;
            if (typeof r.round === 'string') {
                rRound = parseInt(r.round.trim());
            } else if (typeof r.round === 'number') {
                rRound = Math.floor(r.round);
            } else {
                rRound = parseInt(String(r.round));
            }

            // NaN 체크
            if (isNaN(rRound)) {
                return false;
            }

            return rRound === round;
        });
        return roundData ? round : null;
    }

    // 날짜 형식 처리 (6자리 숫자 또는 yy/mm/dd 형식)
    if (/^\d{6}$/.test(value) || value.includes('/') || value.includes('-')) {
        // 특수값 000000, 00/00/00 또는 999999 처리
        if (value === '000000' || value === '00/00/00') {
            // 첫회차 (Lotto645.csv에서 가장 오래된 회차)
            if (lotto645Data.length > 0) {
                const firstRound = lotto645Data[lotto645Data.length - 1];
                return typeof firstRound.round === 'string' ? parseInt(firstRound.round) : firstRound.round;
            }
            return null;
        } else if (value === '999999') {
            // 최종회차 (Lotto645.csv에서 가장 최신 회차)
            if (lotto645Data.length > 0) {
                const lastRound = lotto645Data[0];
                return typeof lastRound.round === 'string' ? parseInt(lastRound.round) : lastRound.round;
            }
            return null;
        }

        const date = parseDate(value);
        if (!date || date === '000000' || date === '999999' || !(date instanceof Date)) {
            return null;
        }

        // 날짜로부터 회차 찾기 (Lotto645.csv 데이터 기준)
        if (isStartDate) {
            // 시작일: 시작일 포함 이후 첫 회차 찾기 (오래된 것부터 검색)
            for (let i = lotto645Data.length - 1; i >= 0; i--) {
                const roundItem = lotto645Data[i];
                const roundDate = parseDate(roundItem.date);
                if (roundDate && roundDate instanceof Date && roundDate >= date) {
                    return typeof roundItem.round === 'string' ? parseInt(roundItem.round) : roundItem.round;
                }
            }
        } else {
            // 종료일: 종료일 포함 이전 마지막 회차 찾기 (최신 것부터 검색)
            for (let i = 0; i < lotto645Data.length; i++) {
                const roundItem = lotto645Data[i];
                const roundDate = parseDate(roundItem.date);
                if (roundDate && roundDate instanceof Date && roundDate <= date) {
                    return typeof roundItem.round === 'string' ? parseInt(roundItem.round) : roundItem.round;
                }
            }
        }
    }

    return null;
}

function validateDateRange() {
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');

    if (!startDateInput || !endDateInput) {
        return true; // 입력 필드가 없으면 검증 건너뛰기
    }

    const startValue = startDateInput.value.trim();
    const endValue = endDateInput.value.trim();

    if (!startValue || !endValue) {
        return true; // 값이 없으면 검증 건너뛰기
    }

    // 시작일 회차/날짜 찾기
    let startRound = null;
    let startDate = null;

    if (isRoundInput(startValue)) {
        // 회차로 입력한 경우, 날짜로 변환해서 비교
        const dateStr = convertRoundToDate(startValue);
        if (dateStr) {
            const parsedDate = parseDate(dateStr);
            if (parsedDate && parsedDate instanceof Date) {
                startDate = parsedDate;
                startRound = parseInt(startValue);
            }
        }
    } else {
        // 날짜로 입력한 경우
        const parsedDate = parseDate(startValue);
        if (parsedDate && parsedDate instanceof Date) {
            startDate = parsedDate;
            startRound = findRoundFromDateInput(startValue, true);
        }
    }

    // 종료일 회차/날짜 찾기
    let endRound = null;
    let endDate = null;

    if (isRoundInput(endValue)) {
        // 회차로 입력한 경우, 날짜로 변환해서 비교
        const dateStr = convertRoundToDate(endValue);
        if (dateStr) {
            const parsedDate = parseDate(dateStr);
            if (parsedDate && parsedDate instanceof Date) {
                endDate = parsedDate;
                endRound = parseInt(endValue);
            }
        }
    } else {
        // 날짜로 입력한 경우
        const parsedDate = parseDate(endValue);
        if (parsedDate && parsedDate instanceof Date) {
            endDate = parsedDate;
            endRound = findRoundFromDateInput(endValue, false);
        }
    }

    // 회차로 비교 가능한 경우
    if (startRound !== null && endRound !== null) {
        if (endRound <= startRound) {
            alert(`종료일(회차 ${endRound})은 시작일(회차 ${startRound})보다 커야 합니다.`);
            return false;
        }
        return true;
    }

    // 날짜로 비교 가능한 경우
    if (startDate && endDate && startDate instanceof Date && endDate instanceof Date) {
        if (endDate <= startDate) {
            const startDateStr = formatDateYYMMDD(startDate);
            const endDateStr = formatDateYYMMDD(endDate);
            alert(`종료일(${endDateStr})은 시작일(${startDateStr})보다 커야 합니다.`);
            return false;
        }
        return true;
    }

    return true; // 비교 불가능한 경우는 통과
}

function findRoundByDate(dateStr, isStart) {
    if (!AppState.allLotto645Data) return null;
    const res = parseDate(dateStr);
    if (!res) return null;

    let targetDate;
    if (res === '000000') {
        // 아주 과거 날짜 (1회차 이전)
        targetDate = new Date(2002, 0, 1);
    } else if (res === '999999') {
        // 아주 미래 날짜
        targetDate = new Date(2999, 11, 31);
    } else if (res instanceof Date && !isNaN(res)) {
        targetDate = res;
    } else {
        return null; // 알 수 없는 형식
    }

    targetDate.setHours(0, 0, 0, 0);

    let bestMatch = null;

    // 데이터는 회차 내림차순 (최신 -> 과거)
    for (const round of AppState.allLotto645Data) {
        const rDate = parseDate(round.date);
        if (!rDate) continue;
        rDate.setHours(0, 0, 0, 0);

        if (isStart) {
            // 시작일 이후(포함)의 첫 회차
            if (rDate >= targetDate) bestMatch = round.round;
            else break;
        } else {
            // 종료일 이전(포함)의 첫 회차
            if (rDate <= targetDate) return round.round;
        }
    }
    return bestMatch;
}

function findDateByRound(roundNo) {
    if (!AppState.allLotto645Data) return null;
    const round = AppState.allLotto645Data.find(r => r.round === parseInt(roundNo));
    return round ? round.date : null;
}

function syncRoundToDate() {
    const targetRoundInput = document.getElementById('targetRound');
    if (!targetRoundInput) return;
    // 이제 단일 필드이므로 이전의 복잡한 동기화 로직은 무시하거나 간소화
}

function syncDateToRound() {
    // 이제 단일 필드이므로 이전의 동기화 로직 무시
}

function filterDataByDateRange(lotto645Data, startDate, endDate) {
    if (!startDate || !endDate || !lotto645Data || lotto645Data.length === 0) return [];

    let start, end;
    if (startDate === '000000') start = null;
    else {
        start = parseDate(startDate);
        if (!start) return [];
        start.setHours(0, 0, 0, 0);
    }

    if (endDate === '999999') end = null;
    else {
        end = parseDate(endDate);
        if (!end) return [];
        end.setHours(23, 59, 59, 999);
    }

    const oldestRoundDate = parseDate(lotto645Data[lotto645Data.length - 1].date);
    const newestRoundDate = parseDate(lotto645Data[0].date);

    if (!oldestRoundDate || !newestRoundDate) return [];

    if (start === null) {
        start = oldestRoundDate;
        start.setHours(0, 0, 0, 0);
    }
    if (end === null) {
        end = newestRoundDate;
        end.setHours(23, 59, 59, 999);
    }

    if (start > newestRoundDate || end < oldestRoundDate) return [];

    let startIndex = -1;
    for (let i = lotto645Data.length - 1; i >= 0; i--) {
        const roundDate = parseDate(lotto645Data[i].date);
        if (roundDate && roundDate >= start) {
            startIndex = i;
            break;
        }
    }

    let endIndex = -1;
    for (let i = 0; i < lotto645Data.length; i++) {
        const roundDate = parseDate(lotto645Data[i].date);
        if (roundDate && roundDate <= end) {
            endIndex = i;
            break;
        }
    }

    if (startIndex === -1 || endIndex === -1 || startIndex < endIndex) return [];

    return lotto645Data.slice(endIndex, startIndex + 1);
}

function filterLotto645ByRoundInclusive(allData, startRound, endRound) {
    if (!allData || allData.length === 0) return [];
    const lo = Math.min(startRound, endRound);
    const hi = Math.max(startRound, endRound);
    return allData.filter(function (r) {
        return r && r.round != null && r.round >= lo && r.round <= hi;
    });
}

function getAiRecommendEndRoundForFilters() {
    if (AppState.currentStatsRounds && AppState.currentStatsRounds.length > 0) {
        return AppState.currentStatsRounds[0].round;
    }
    if (AppState.allLotto645Data && AppState.allLotto645Data.length > 0) {
        return AppState.allLotto645Data[0].round;
    }
    return null;
}

function applyAiRecommendFiltersForEndRound(endRound) {
    if (endRound == null || endRound === '' || Number.isNaN(Number(endRound))) return;
    const data = AppState.allLotto645Data;
    if (!data || !data.length) return;
    const maxR = data[0].round;
    const hi = Math.min(Number(endRound), maxR);
    const lo = Math.max(1, hi - 99);
    const slice = filterLotto645ByRoundInclusive(data, lo, hi);
    if (!slice.length) return;
    extractAndApplyFilters(slice);
    AppState.aiRecommendWindowStart = lo;
    AppState.aiRecommendWindowEnd = hi;
}

async function loadAndShowLottoRound(roundNo, targetElement) {
    showRoundInfoBubble('<div style="text-align:center; padding:20px;"><p>데이터를 불러오는 중입니다...</p></div>', targetElement);

    try {
        const baseUrl = (typeof getApiBaseUrl === 'function') ? getApiBaseUrl() : '';
        const url = roundNo ? `${baseUrl}/api/lotto-round/${roundNo}` : `${baseUrl}/api/lotto-latest`;

        const res = await fetch(url);
        const data = await res.json().catch(() => ({ returnValue: 'fail' }));

        if (data.returnValue !== 'success' || data.drwNo == null) {
            const errHtml = `<div style="text-align:center; padding:20px;"><p class="error-msg">${data.error || '정보를 가져오지 못했습니다.'}</p></div>`;
            showRoundInfoBubble(errHtml, targetElement);
            return;
        }


        const drwNo = data.drwNo;
        let dateStr = data.drwNoDate || '';

        // 날짜 포맷팅
        if (typeof parseDate === 'function' && typeof formatDateYYMMDD === 'function' && data.drwNoDate) {
            const dateObj = parseDate(String(data.drwNoDate).trim());
            if (dateObj instanceof Date && !isNaN(dateObj)) dateStr = formatDateYYMMDD(dateObj);
        }

        const nums = [data.drwtNo1, data.drwtNo2, data.drwtNo3, data.drwtNo4, data.drwtNo5, data.drwtNo6]
            .filter(n => n != null);
        const bnus = data.bnusNo;

        const makeBall = (n) => {
            const cls = typeof getBallColorClass === 'function' ? getBallColorClass(Number(n)) : '';
            return `<span class="stat-ball stat-ball--sm ${cls}" style="margin:0 2px;">${n}</span>`;
        };

        const numbersRowHtml = nums.map(makeBall).join('')
            + (bnus != null ? `<span style="margin:0 4px;font-weight:700;color:var(--color-text-muted,#5A6872);">+</span>${makeBall(bnus)}` : '');

        const fmtAmt = (v) => (v && v !== '(없음)') ? v + '원' : (v || '(없음)');

        let tableHtml = `
            <table class="lotto-round-detail-table">
                <tbody>
                    <tr><th>당첨회차</th><td>${drwNo}회</td></tr>
                    <tr><th>추첨일</th><td>${dateStr}</td></tr>
                    <tr><th>당첨번호</th><td><div class="round-info-balls-row">${numbersRowHtml}</div></td></tr>
                    <tr><th>1등 당첨금액</th><td>${data.firstWinamntFmt || '(없음)'}</td></tr>
                    <tr><th>1등 당첨자 수</th><td>${data.firstPrzwnerCoFmt || '(없음)'}</td></tr>
                    <tr><th>1등 총당첨금액</th><td>${data.firstAccumamntFmt || '(없음)'}</td></tr>
                    <tr><th>전체 판매금액</th><td>${data.totSellamntFmt || '(없음)'}</td></tr>
                </tbody>
            </table>
        `;

        const source = data.source || '동행복권';
        tableHtml += `<p class="latest-draw-source" style="text-align:right; font-size:0.8rem; color:#666; margin-top:10px;">출처: ${source}</p>`;

        const parsedSix = nums.map(function (n) { return parseInt(n, 10); }).filter(function (n) { return !isNaN(n) && n >= 1 && n <= 45; });
        if (parsedSix.length === 6 && new Set(parsedSix).size === 6) {
            const sortedSix = parsedSix.slice().sort(function (a, b) { return a - b; });
            tableHtml += typeof buildLottoRoundStatsCompareHtml === 'function' ? buildLottoRoundStatsCompareHtml(drwNo, sortedSix) : '';
        }

        showRoundInfoBubble(tableHtml, targetElement);

    } catch (e) {
        showRoundInfoBubble(`<div style="text-align:center; padding:20px;"><p class="error-msg">요청 실패: ${e.message || String(e)}</p></div>`, targetElement);
    }
}

function getRoundSum(r) {
    if (!r.numbers || r.numbers.length === 0) return 0;
    return r.numbers.reduce((acc, num) => acc + (num || 0), 0);
}

function aggregateStatsForPriorRounds(priorRounds) {
    let n = 0;
    let sumS = 0;
    let sumOdd = 0;
    let sumSeq = 0;
    let sumAc = 0;
    (priorRounds || []).forEach(function (r) {
        const raw = r && r.numbers;
        if (!Array.isArray(raw) || raw.length < 6) return;
        const nums = raw.slice(0, 6).map(function (x) { return Number(x); }).filter(function (x) { return !isNaN(x); });
        if (nums.length !== 6 || new Set(nums).size !== 6) return;
        const sorted = nums.slice().sort(function (a, b) { return a - b; });
        if (sorted.some(function (x) { return x < 1 || x > 45; })) return;
        sumS += sorted.reduce(function (a, b) { return a + b; }, 0);
        sumOdd += sorted.filter(function (x) { return x % 2 === 1; }).length;
        sumSeq += countSequentialPairs(sorted);
        sumAc += calculateAC(sorted);
        n++;
    });
    if (n === 0) return null;
    return {
        count: n,
        avgSum: sumS / n,
        avgOdd: sumOdd / n,
        avgSeq: sumSeq / n,
        avgAc: sumAc / n
    };
}

function buildLottoRoundStatsCompareHtml(drwNo, sortedSix) {
    if (!sortedSix || sortedSix.length !== 6 || new Set(sortedSix).size !== 6) return '';
    const rno = parseInt(drwNo, 10);
    if (isNaN(rno) || rno < 1) return '';
    const prior = (AppState.allLotto645Data || []).filter(function (r) {
        return r && typeof r.round === 'number' && r.round < rno;
    });
    const agg = aggregateStatsForPriorRounds(prior);
    const odd = sortedSix.filter(function (n) { return n % 2 === 1; }).length;
    const even = 6 - odd;
    const seqPairs = countSequentialPairs(sortedSix);
    const ac = calculateAC(sortedSix);
    const sumSix = sortedSix.reduce(function (a, b) { return a + b; }, 0);

    var hotCount = null;
    var coldCount = null;
    try {
        var hc = typeof getHotColdNumbersBeforeRound === 'function' ? getHotColdNumbersBeforeRound(rno) : { hot: [], cold: [] };
        var hotSet = new Set(hc.hot || []);
        var coldSet = new Set(hc.cold || []);
        hotCount = sortedSix.filter(function (n) { return hotSet.has(n); }).length;
        coldCount = sortedSix.filter(function (n) { return coldSet.has(n); }).length;
    } catch (e) { }

    const fmt1 = function (x) { return (Math.round(x * 100) / 100).toFixed(2).replace(/\.?0+$/, '').replace(/\.$/, ''); };

    let rows = '';
    rows += `<tr><th>홀·짝</th><td><b>${odd}</b>·<b>${even}</b></td>`;
    if (agg) {
        rows += `<td>평균 홀 <b>${fmt1(agg.avgOdd)}</b>개 (짝 ${fmt1(6 - agg.avgOdd)}개)</td></tr>`;
    } else {
        rows += `<td>—</td></tr>`;
    }

    rows += `<tr><th>핫·콜</th><td>`;
    if (hotCount != null && coldCount != null) {
        rows += `<b>${hotCount}</b>·<b>${coldCount}</b> <span class="bubble-compare-muted">(직전 <b>${rno - 1}회</b>까지 누적)</span>`;
    } else {
        rows += '—';
    }
    rows += `</td><td><span class="bubble-compare-muted">비교 구간은 1~<b>${rno - 1}회</b>와 동일. 핫·콜은 회차마다 집합이 달라 <b>개수 평균은 미표시</b>.</span></td></tr>`;

    rows += `<tr><th>연속 쌍</th><td><b>${seqPairs}</b>쌍</td>`;
    rows += agg ? `<td>평균 <b>${fmt1(agg.avgSeq)}</b>쌍</td></tr>` : `<td>—</td></tr>`;

    rows += `<tr><th>AC값</th><td><b>${String(ac).padStart(2, '0')}</b></td>`;
    rows += agg ? `<td>평균 <b>${fmt1(agg.avgAc)}</b></td></tr>` : `<td>—</td></tr>`;

    rows += `<tr><th>6개 합계</th><td><b>${sumSix}</b></td>`;
    if (agg) {
        const diff = sumSix - agg.avgSum;
        const diffStr = diff > 0 ? `+${fmt1(diff)}` : diff < 0 ? `${fmt1(diff)}` : '0';
        rows += `<td>평균 <b>${fmt1(agg.avgSum)}</b> <span class="bubble-compare-accent">(차 ${diffStr})</span></td></tr>`;
    } else {
        rows += `<td>—</td></tr>`;
    }

    const subTitle = agg
        ? `이번 당첨 6개 vs <b>직전 회차(${rno - 1}회)까지</b> <b>${agg.count}회</b> 평균`
        : `이번 당첨 6개 (비교용 로컬 데이터 없음)`;

    return `
        <div class="bubble-compare-block">
            <p class="bubble-compare-title">${subTitle}</p>
            <p class="bubble-compare-note">핫·콜은 <b>${rno}회</b> 당첨 번호에 대해, 앱과 동일하게 <b>직전 회차(${rno - 1}회)까지</b> 누적한 당첨·출현·연속 통계로 나눈 상위 22·하위 23입니다. (<b>${rno}회 미포함</b>·보너스 제외)</p>
            <table class="bubble-compare-table">
                <thead>
                    <tr>
                        <th>구분</th>
                        <th class="bubble-compare-th-num">이번 당첨</th>
                        <th class="bubble-compare-th-num">직전회차까지 비교</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        </div>`;
}

function getRoundDateObject(round) {
    if (!round.date) return null;
    const strVal = String(round.date).trim();
    if (typeof round.date === 'number' || /^\d{5,}$/.test(strVal)) {
        const serial = typeof round.date === 'number' ? round.date : parseInt(strVal, 10);
        if (!isNaN(serial) && serial >= 1) {
            const utcMs = (serial - 25569) * 86400 * 1000;
            return new Date(utcMs);
        }
    }
    return parseDate(strVal);
}

if (typeof window !== "undefined") {
    window.computeRankSummaryForRoundGames = computeRankSummaryForRoundGames;
    window.computeRankSummaryForCrossRoundGames = computeRankSummaryForCrossRoundGames;
    window.getHotColdNumbersBeforeRound = getHotColdNumbersBeforeRound;
    window.resolveRoundsForModalTrustBasis = resolveRoundsForModalTrustBasis;
    window.computeModalOptionPatternFromRounds = computeModalOptionPatternFromRounds;
    window.getLuckyStatRankTargetRound = getLuckyStatRankTargetRound;
    window.collectSixSumsFromRounds = collectSixSumsFromRounds;
    window.computeSumPercentileBandFromRounds = computeSumPercentileBandFromRounds;
    window.computeSumPercentileSubBandsFromRounds = computeSumPercentileSubBandsFromRounds;
    window.computeSumMeanBandFromRounds = computeSumMeanBandFromRounds;
    window.meanSixNumberSumForRounds = meanSixNumberSumForRounds;
    window.isLotto645RoundDrawn = isLotto645RoundDrawn;
    window.getSeoulDateYmdToday = getSeoulDateYmdToday;
    window.lotto645RoundDrawYmdSeoul = lotto645RoundDrawYmdSeoul;
    window.isLotto645DrawDateTodaySeoul = isLotto645DrawDateTodaySeoul;
    window.getNextUndrawnLotto645Round = getNextUndrawnLotto645Round;
    window.getSaveTargetPendingRound = getSaveTargetPendingRound;
    window.isPendingSaveRoundFilterActive = isPendingSaveRoundFilterActive;
    window.getEffectiveSaveRound = getEffectiveSaveRound;
    window.validateNewSaveRoundContext = validateNewSaveRoundContext;
    window.isRoundInput = isRoundInput;
    window.convertRoundToDate = convertRoundToDate;
    window.convertDateToRoundDate = convertDateToRoundDate;
    window.parseDate = parseDate;
    window.formatDate = formatDate;
    window.formatDateYYMMDD = formatDateYYMMDD;
    window.validateYYMMDDInput = validateYYMMDDInput;
    window.calculateRoundRange = calculateRoundRange;
    window.findRoundFromDateInput = findRoundFromDateInput;
    window.validateDateRange = validateDateRange;
    window.findRoundByDate = findRoundByDate;
    window.findDateByRound = findDateByRound;
    window.syncRoundToDate = syncRoundToDate;
    window.syncDateToRound = syncDateToRound;
    window.filterDataByDateRange = filterDataByDateRange;
    window.filterLotto645ByRoundInclusive = filterLotto645ByRoundInclusive;
    window.getAiRecommendEndRoundForFilters = getAiRecommendEndRoundForFilters;
    window.applyAiRecommendFiltersForEndRound = applyAiRecommendFiltersForEndRound;
    window.loadAndShowLottoRound = loadAndShowLottoRound;
    window.getRoundSum = getRoundSum;
    window.aggregateStatsForPriorRounds = aggregateStatsForPriorRounds;
    window.buildLottoRoundStatsCompareHtml = buildLottoRoundStatsCompareHtml;
    window.getRoundDateObject = getRoundDateObject;
}


/** 통계공 정렬 필터(count/percentage) — `app.js`·워커(generator→pickSix) 공용 */
function isCountFilter(statFilter) {
    return statFilter === 'count-desc' || statFilter === 'count-asc';
}
function isPercentageFilter(statFilter) {
    return statFilter === 'percentage-desc' || statFilter === 'percentage-asc';
}
function isStatFilter(statFilter) {
    return isCountFilter(statFilter) || isPercentageFilter(statFilter);
}

function getAllNumbers() {
    return Array.from({ length: LOTTO_CONSTANTS.MAX_NUMBER }, (_, i) => i + 1);
}

function pickSix(excludeNumbers = []) {
    const pool = shuffledPool(false, false);
    const poolSet = new Set(pool);
    let filteredPool = pool;

    if (excludeNumbers.length > 0) {
        const exSet = new Set(excludeNumbers);
        filteredPool = filteredPool.filter(n => !exSet.has(n));
    }

    /* 워커에는 AppState·getFilteredNumbersByCount 등이 없을 수 있음 — 부분만 생략하고 무작위 풀 기반 선택 */
    const af = (typeof AppState !== 'undefined' && AppState && AppState.activeFilters)
        ? AppState.activeFilters
        : { statFilter: 'none', hotCold: 'none' };

    if (isStatFilter(af.statFilter) && typeof getFilteredNumbersByCount === 'function') {
        const highCountNumbers = new Set(getFilteredNumbersByCount(true));
        filteredPool = filteredPool.filter(n => highCountNumbers.has(n));
    }

    // 핫콜 필터: 수동선택 또는 자동선택 모드에서만 적용
    if (typeof canApplyHotColdFilter === 'function' && canApplyHotColdFilter(af.statFilter)) {
        filteredPool = applyHotColdFilter(filteredPool, af.hotCold);
    }

    const filteredPoolSet = new Set(filteredPool);
    const prefSrc = typeof getPreferredNumbers === 'function' ? getPreferredNumbers() : [];
    const preferred = prefSrc.filter(n => poolSet.has(n) && filteredPoolSet.has(n));

    // 홀짝 비율에 맞춰 번호 선택
    const result = selectNumbersWithOddEvenRatio(filteredPool, preferred, LOTTO_CONSTANTS.SET_SIZE);

    return result.slice(0, LOTTO_CONSTANTS.SET_SIZE);
}

function calculateAC(numbers) {
    const diffs = new Set();
    for (let i = 0; i < numbers.length; i++) {
        for (let j = i + 1; j < numbers.length; j++) {
            diffs.add(Math.abs(numbers[j] - numbers[i]));
        }
    }
    return diffs.size - 5;
}

if (typeof window !== "undefined") {
    window.getAllNumbers = getAllNumbers;
    window.pickSix = pickSix;
    window.calculateAC = calculateAC;
    window.isCountFilter = isCountFilter;
    window.isPercentageFilter = isPercentageFilter;
    window.isStatFilter = isStatFilter;
}


function getSumRangeForGameSlot(gameSlot1to5) {
    const slot = Number(gameSlot1to5);
    const bands = AppState.sumBandPerGame;
    if (bands && slot >= 1 && slot <= bands.length) {
        const b = bands[slot - 1];
        if (b && b.start != null && b.end != null) {
            let start = Math.max(21, Math.min(255, Number(b.start)));
            let end = Math.max(21, Math.min(255, Number(b.end)));
            if (start > end) {
                const t = start;
                start = end;
                end = t;
            }
            return { start: start, end: end };
        }
    }
    return getSumRange();
}

function getFunDiversifyFilterTargetsForSlot(slot1to5, runOffset) {
    const bandSlots = (typeof LOTTO_CONSTANTS !== 'undefined' && LOTTO_CONSTANTS.SUM_BAND_SLOT_COUNT != null)
        ? LOTTO_CONSTANTS.SUM_BAND_SLOT_COUNT
        : (typeof SUM_BAND_SLOT_COUNT !== 'undefined' ? SUM_BAND_SLOT_COUNT : 5);
    const slot = Math.max(1, Math.min(bandSlots, Number(slot1to5) || 1));
    const rot = Math.abs(Math.floor(Number(runOffset) || 0)) % 997;
    const base = buildStatFilterTrustContextFromDom();

    function rotatedPick(selectId, baseVal) {
        const opts = getFunDiversifySelectOptionValues(selectId);
        if (opts.length === 0) return baseVal || 'none';
        let start = opts.indexOf(baseVal);
        if (start < 0) start = 0;
        const idx = (start + (slot - 1) + rot) % opts.length;
        return opts[idx];
    }

    return {
        oddEven: rotatedPick('filterOddEven', base.oddEven),
        consecutive: rotatedPick('filterConsecutive', base.consecutive),
        hotCold: rotatedPick('filterHotCold', base.hotCold),
        ac: rotatedPick('filterAC', base.ac)
    };
}

if (typeof window !== "undefined") {
    window.getSumRangeForGameSlot = getSumRangeForGameSlot;
    window.getFunDiversifyFilterTargetsForSlot = getFunDiversifyFilterTargetsForSlot;
}


function shuffledPool(filterOdd = false, filterEven = false) {
    let numbers = getAllNumbers();

    const oddEvenFilter = filterOdd ? "odd" : (filterEven ? "even" : "none");
    numbers = applyOddEvenFilter(numbers, oddEvenFilter);

    for (let i = numbers.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
    }
    return numbers;
}

function isExtremeCombination(numbers) {
    if (!numbers || numbers.length !== 6) return false;
    const oddCount = numbers.filter(function (n) { return n % 2 === 1; }).length;
    if (oddCount <= 1 || oddCount >= 5) return true;
    try {
        var hc = typeof getOverallHotColdNumbers === 'function' ? getOverallHotColdNumbers() : { hot: [], cold: [] };
        var hot = hc.hot || [];
        var cold = hc.cold || [];
        if (hot.length > 0 && cold.length > 0) {
            var hotSet = new Set(hot);
            var coldSet = new Set(cold);
            var hotCount = numbers.filter(function (n) { return hotSet.has(n); }).length;
            var coldCount = numbers.filter(function (n) { return coldSet.has(n); }).length;
            if (hotCount >= 5 || coldCount >= 5) return true;
        }
    } catch (e) { }
    return false;
}

function isPastWinningCombo(numbers) {
    if (!AppState.allLotto645Data || AppState.allLotto645Data.length === 0) return false;
    var key = [...numbers].sort(function (a, b) { return a - b; }).join(',');
    if (!AppState._pastWinKeySet) {
        AppState._pastWinKeySet = new Set();
        AppState.allLotto645Data.forEach(function (r) {
            if (r.numbers && r.numbers.length === 6) {
                AppState._pastWinKeySet.add([...r.numbers].sort(function (a, b) { return a - b; }).join(','));
            }
        });
    }
    return AppState._pastWinKeySet.has(key);
}

if (typeof window !== "undefined") {
    window.shuffledPool = shuffledPool;
    window.isExtremeCombination = isExtremeCombination;
    window.isPastWinningCombo = isPastWinningCombo;
}
