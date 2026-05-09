/**
 * 데이터 로더 모듈
 * 로또 데이터 로드 및 캐싱 관리
 */

/**
 * LocalStorage 캐시 키
 */
const CACHE_KEYS = {
    LOTTO645: 'LOTTO645_DATA_CACHE_V2',
    LOTTO023: 'LOTTO023_DATA_CACHE_V2',
    METADATA: 'LOTTO_METADATA_CACHE_V2'
};

/**
 * LocalStorage에서 데이터 가져오기
 * @param {string} key - 캐시 키
 * @returns {*|null} 캐시된 데이터 또는 null
 */
function getFromCache(key) {
    try {
        const cached = localStorage.getItem(key);
        if (cached) {
            return JSON.parse(cached);
        }
    } catch (error) {
        console.error(`캐시 읽기 오류 [${key}]:`, error);
    }
    return null;
}

/**
 * LocalStorage에 데이터 저장
 * @param {string} key - 캐시 키
 * @param {*} data - 저장할 데이터
 * @returns {boolean} 성공 여부
 */
function saveToCache(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
        return true;
    } catch (error) {
        console.error(`캐시 저장 오류 [${key}]:`, error);
        // LocalStorage 용량 초과 시 오래된 캐시 삭제
        if (error.name === 'QuotaExceededError') {
            clearOldCache();
            try {
                localStorage.setItem(key, JSON.stringify(data));
                return true;
            } catch (retryError) {
                console.error('재시도 실패:', retryError);
            }
        }
    }
    return false;
}

/**
 * 오래된 캐시 삭제
 */
function clearOldCache() {
    try {
        // 메타데이터 제외하고 모든 캐시 삭제
        Object.values(CACHE_KEYS).forEach(key => {
            if (key !== CACHE_KEYS.METADATA) {
                localStorage.removeItem(key);
            }
        });
    } catch (error) {
        console.error('캐시 정리 오류:', error);
    }
}

/**
 * JSON 파일 로드
 * @param {string} url - JSON 파일 URL
 * @returns {Promise<Array>} 로드된 데이터
 */
async function loadJSON(url, fetchInit) {
    try {
        const timestamp = Date.now();
        const sep = url.indexOf('?') >= 0 ? '&' : '?';
        const response = await fetch(`${url}${sep}t=${timestamp}`, fetchInit || {});

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        return Array.isArray(data) ? data : [];
    } catch (error) {
        console.error(`JSON 로드 오류 [${url}]:`, error);
        throw error;
    }
}

/**
 * XLSX 파일 로드 (SheetJS 사용)
 * @param {string} url - XLSX 파일 URL
 * @param {RequestInit} [fetchInit] - fetch 옵션 (예: Lotto023 재출력 시 cache: 'no-store')
 * @returns {Promise<Array>} 파싱된 데이터
 */
async function loadXLSX(url, fetchInit) {
    try {
        if (typeof XLSX === 'undefined') {
            throw new Error('XLSX 라이브러리가 로드되지 않았습니다.');
        }

        const timestamp = Date.now();
        const sep = url.indexOf('?') >= 0 ? '&' : '?';
        const response = await fetch(`${url}${sep}t=${timestamp}`, fetchInit || {});

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];

        if (!firstSheetName) {
            throw new Error('XLSX 파일에 시트가 없습니다.');
        }

        const sheet = workbook.Sheets[firstSheetName];
        const data = XLSX.utils.sheet_to_json(sheet, { defval: '' });

        return data;
    } catch (error) {
        console.error(`XLSX 로드 오류 [${url}]:`, error);
        throw error;
    }
}

/**
 * 데이터 정규화 (필드명 통합)
 * @param {Array} data - 원본 데이터
 * @returns {Array} 정규화된 데이터
 */
function normalizeLottoData(data) {
    if (!Array.isArray(data)) return [];

    return data.map(item => {
        // 이미 정규화되어 있으면 그대로 반환 (date가 없으면 날짜에서 복사)
        if (item.round !== undefined && Array.isArray(item.numbers)) {
            if (item.date === undefined && item['날짜'] !== undefined) {
                item.date = item['날짜'];
            }
            return item;
        }

        const normalized = { ...item };

        // 1. 회차 -> round
        if (item['회차'] !== undefined) {
            normalized.round = Number(item['회차']);
        }

        // 1-1. 날짜 -> date
        if (item['날짜'] !== undefined && item['날짜'] !== null && item['날짜'] !== '') {
            normalized.date = item['날짜'];
        }

        // 2. 번호1~6 또는 선택1~6 -> numbers 배열
        if (!Array.isArray(item.numbers)) {
            const numbers = [];
            for (let i = 1; i <= 6; i++) {
                let num = item[`번호${i}`];
                if (num === undefined || num === '') {
                    num = item[`선택${i}`];
                }
                if (num !== undefined && num !== '') {
                    numbers.push(Number(num));
                }
            }
            if (numbers.length === 6) {
                normalized.numbers = numbers;
                const ok = numbers.every(n => Number.isFinite(n) && n >= 1 && n <= 45) && new Set(numbers).size === 6;
                if (!ok) normalized.invalidLottoPick = true;
            }
        }

        // 3. 보너스번호 -> bonus
        if (item['보너스번호'] !== undefined) {
            normalized.bonus = Number(item['보너스번호']);
        }

        // 4. 세트 -> set
        if (item['세트'] !== undefined) {
            normalized.set = Number(item['세트']);
        }

        // 5. 게임 -> game
        if (item['게임'] !== undefined) {
            normalized.game = Number(item['게임']);
        }

        // 6. 홀짝 -> oddEven (null/빈값이면 번호에서 계산)
        if (item['홀짝'] != null && item['홀짝'] !== '') {
            normalized.oddEven = Number(item['홀짝']);
        } else if (normalized.numbers && normalized.numbers.length === 6) {
            normalized.oddEven = normalized.numbers.filter(n => n % 2 === 1).length;
        }

        // 7. 연속 -> sequence (null/빈값이면 번호에서 계산)
        if (item['연속'] != null && item['연속'] !== '') {
            normalized.sequence = Number(item['연속']);
        } else if (normalized.numbers && normalized.numbers.length === 6) {
            const s = [...normalized.numbers].sort((a, b) => a - b);
            let cnt = 0;
            for (let i = 1; i < s.length; i++) { if (s[i] - s[i - 1] === 1) cnt++; }
            normalized.sequence = cnt;
        }

        // 8. 핫콜 -> hotCold (null/빈값은 렌더링 시 계산)
        if (item['핫콜'] != null && item['핫콜'] !== '') {
            normalized.hotCold = Number(item['핫콜']);
        }

        // 9. 게임선택 -> gameMode
        if (item['게임선택'] !== undefined) {
            normalized.gameMode = item['게임선택'];
        }

        // 10. 선택합계 -> pickSum (없으면 번호 6개 합)
        if (item['선택합계'] != null && item['선택합계'] !== '') {
            normalized.pickSum = Number(item['선택합계']);
        } else if (normalized.numbers && normalized.numbers.length === 6) {
            normalized.pickSum = normalized.numbers.reduce((a, b) => a + b, 0);
        }

        // 11. B of B 순위 열 Perfect순위 (Lotto023.xlsx 마지막 열)
        if (item['Perfect순위'] != null && String(item['Perfect순위']).trim() !== '') {
            const pr = parseInt(String(item['Perfect순위']).trim(), 10);
            if (!Number.isNaN(pr) && pr > 0) normalized.perfectRank = pr;
        }

        delete normalized['조회시작'];
        delete normalized['조회종료'];

        return normalized;
    });
}

/**
 * Lotto645 데이터 로드 (캐시 우선)
 * @param {string} basePath - 기본 경로
 * @param {{ bypassCache?: boolean }} [opts] - bypassCache=true면 서버 동기화 직후 등 강제 네트워크 재로드
 * @returns {Promise<Array>} 로또 데이터
 */
async function loadLotto645Data(basePath = '', opts) {
    const bypassCache = opts && opts.bypassCache === true;
    console.time('LoadLotto645');

    // 1. 캐시 확인 (서버가 xlsx/json 갱신한 뒤에는 무조건 네트워크에서 다시 받아야 함)
    if (!bypassCache) {
        const cached = getFromCache(CACHE_KEYS.LOTTO645);
        if (cached && Array.isArray(cached) && cached.length > 0) {
            console.timeEnd('LoadLotto645');
            return cached.sort((a, b) => b.round - a.round);
        }
    }

    // 2. JSON 로드 시도 (CDN/브라우저 캐시 회피: 항상 no-store)
    const noStore = { cache: 'no-store' };
    try {
        const jsonUrl = `${basePath}.source/Lotto645.json`;
        const data = await loadJSON(jsonUrl, noStore);

        if (data.length > 0) {
            const normalized = normalizeLottoData(data);
            const sorted = normalized.sort((a, b) => b.round - a.round);
            saveToCache(CACHE_KEYS.LOTTO645, sorted);
            console.timeEnd('LoadLotto645');
            return sorted;
        }
    } catch (error) {
        console.warn('JSON 로드 실패, XLSX 시도:', error);
    }

    // 3. XLSX 로드 (fallback)
    try {
        const xlsxUrl = `${basePath}.source/Lotto645.xlsx`;
        const data = await loadXLSX(xlsxUrl, noStore);

        if (data.length > 0) {
            const normalized = normalizeLottoData(data);
            const sorted = normalized.sort((a, b) => b.round - a.round);
            saveToCache(CACHE_KEYS.LOTTO645, sorted);
            console.timeEnd('LoadLotto645');
            return sorted;
        }
    } catch (error) {
        console.error('XLSX 로드 실패:', error);
    }

    console.timeEnd('LoadLotto645');
    return [];
}

/**
 * Lotto023 행에서 세트·게임 번호 (서버 xlsx 처리와 동일한 기본값 규칙)
 * @param {object} g - normalizeLottoData 한 행
 */
function lotto023ResolvedSetGameLocal(g) {
    const sRaw = g.set !== undefined && g.set !== null && g.set !== '' ? g.set : g['세트'];
    const gRaw = g.game !== undefined && g.game !== null && g.game !== '' ? g.game : g['게임'];
    const setNum = parseInt(String(sRaw != null ? sRaw : ''), 10);
    const gameNum = parseInt(String(gRaw != null ? gRaw : ''), 10);
    return {
        setNum: !Number.isNaN(setNum) && setNum > 0 ? setNum : 1,
        gameNum: !Number.isNaN(gameNum) && gameNum > 0 ? gameNum : 1
    };
}

/**
 * 삭제 체크박스 데이터와 Lotto023 행 매칭 (세트·게임은 lotto023ResolvedSetGameLocal 기준 숫자 비교)
 */
function lotto023DeleteItemMatches(item, g) {
    if (String(item.round) !== String(g.round ?? g['회차'] ?? '')) return false;
    const sg = lotto023ResolvedSetGameLocal(g);
    const ig = parseInt(String(item.game != null ? item.game : ''), 10);
    if (Number.isNaN(ig) || ig !== sg.gameNum) return false;
    const isetRaw = item.set != null && String(item.set).trim() !== '' ? parseInt(String(item.set), 10) : NaN;
    const iset = Number.isNaN(isetRaw) ? sg.setNum : isetRaw;
    return iset === sg.setNum;
}

/**
 * Lotto023: localStorage 에서 항목 제거 후 저장 (API 미사용)
 * @param {Array<{round: string, set?: string, game: string}>} itemsToDelete
 */
async function removeLotto023ItemsFromLocal(itemsToDelete) {
    if (!itemsToDelete || itemsToDelete.length === 0) return;
    const existing = await loadLotto023Data('');
    const filtered = existing.filter(function (g) {
        return !itemsToDelete.some(function (item) { return lotto023DeleteItemMatches(item, g); });
    });
    saveToCache(CACHE_KEYS.LOTTO023, filtered);
}

/**
 * Lotto023: 신규 게임을 로컬 목록에 붙임 (세트/게임 규칙은 서버 save-lotto023 와 동일)
 * @param {Array<object>} gamesPayload - saveGamesToCSV 가 만든 한글 키 객체 배열
 */
async function appendLotto023GamesToLocal(gamesPayload) {
    if (!gamesPayload || gamesPayload.length === 0) return;
    const list = JSON.parse(JSON.stringify(await loadLotto023Data('')));

    for (let gi = 0; gi < gamesPayload.length; gi++) {
        const g = gamesPayload[gi];
        const rawRound = g['회차'];
        if (rawRound === undefined || rawRound === null || rawRound === '') continue;
        let target_round = parseInt(String(rawRound), 10);
        if (Number.isNaN(target_round)) continue;

        const round_data = list.filter(function (x) {
            const xr = Number(x.round);
            return !Number.isNaN(xr) && xr === target_round;
        });

        let next_set, next_game;
        if (round_data.length === 0) {
            next_set = 1;
            next_game = 1;
        } else {
            round_data.sort(function (x, y) {
                const sx = lotto023ResolvedSetGameLocal(x);
                const sy = lotto023ResolvedSetGameLocal(y);
                if (sx.setNum !== sy.setNum) return sx.setNum - sy.setNum;
                return sx.gameNum - sy.gameNum;
            });
            const lastRow = round_data[round_data.length - 1];
            const last = lotto023ResolvedSetGameLocal(lastRow);
            const last_set = last.setNum;
            const last_game = last.gameNum;
            if (last_game >= 5) {
                next_set = last_set + 1;
                next_game = 1;
            } else {
                next_set = last_set;
                next_game = last_game + 1;
            }
        }

        const newObj = Object.assign({}, g, {
            '회차': String(target_round),
            '세트': String(next_set),
            '게임': String(next_game)
        });
        const normalizedRow = normalizeLottoData([newObj])[0];
        list.push(normalizedRow);
    }

    list.sort(function (a, b) {
        const ra = Number(a.round);
        const rb = Number(b.round);
        if (rb !== ra) return rb - ra;
        const sa = lotto023ResolvedSetGameLocal(a);
        const sb = lotto023ResolvedSetGameLocal(b);
        if (sa.setNum !== sb.setNum) return sa.setNum - sb.setNum;
        return sa.gameNum - sb.gameNum;
    });

    saveToCache(CACHE_KEYS.LOTTO023, list);
}

/**
 * Lotto023 데이터 로드
 * - 사용자 저장·삭제는 localStorage(CACHE_KEYS.LOTTO023)만 사용.
 * - 키가 없을 때만 `.source/Lotto023.xlsx` 로 최초 시드(전체 삭제 후 `[]` 가 저장된 경우는 재시드 안 함).
 * @param {string} basePath - 기본 경로
 * @returns {Promise<Array>} 로또 데이터
 */
async function loadLotto023Data(basePath = '') {
    console.time('LoadLotto023');

    try {
        const raw = localStorage.getItem(CACHE_KEYS.LOTTO023);
        if (raw !== null) {
            const cached = JSON.parse(raw);
            if (Array.isArray(cached)) {
                console.timeEnd('LoadLotto023');
                return cached;
            }
        }
    } catch (error) {
        console.error('Lotto023 캐시 읽기 오류:', error);
    }

    try {
        const xlsxUrl = `${basePath}.source/Lotto023.xlsx`;
        const data = await loadXLSX(xlsxUrl, { cache: 'no-store' });

        if (data.length > 0) {
            const normalized = normalizeLottoData(data);
            saveToCache(CACHE_KEYS.LOTTO023, normalized);
            console.timeEnd('LoadLotto023');
            return normalized;
        }
    } catch (error) {
        console.error('Lotto023 XLSX 로드 실패:', error);
    }

    console.timeEnd('LoadLotto023');
    return [];
}

/**
 * API에서 최신 회차 정보 가져오기
 * @param {string} apiUrl - API URL
 * @returns {Promise<Object|null>} 최신 회차 데이터
 */
async function fetchLatestRound(apiUrl) {
    try {
        const response = await fetch(apiUrl);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('최신 회차 조회 오류:', error);
        return null;
    }
}

// 전역으로 export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        CACHE_KEYS,
        getFromCache,
        saveToCache,
        clearOldCache,
        loadJSON,
        loadXLSX,
        loadLotto645Data,
        loadLotto023Data,
        fetchLatestRound,
    };
}


async function loadAndDisplayResults() {
    const resultContainer = document.getElementById('resultContainer');
    if (!resultContainer) return;

    try {
        const lotto023Data = await loadLotto023Data();

        if (!lotto023Data || lotto023Data.length === 0) {
            resultContainer.innerHTML = '<p style="text-align: center; color: ' + SHAREHARMONY_PALETTE.textSecondary + '; font-size: 0.9rem;">저장된 결과가 없습니다.</p>';
            const summaryContainer = document.getElementById('resultSummary');
            if (summaryContainer) {
                summaryContainer.innerHTML = '';
                summaryContainer.classList.remove('result-summary-left--pending', 'result-summary-left--filtered-round');
            }
            const selectAll = document.getElementById('selectAllDeleteCheckbox');
            if (selectAll) { selectAll.checked = false; selectAll.indeterminate = false; }
            AppState.resultListRoundFilter = null;
            AppState.resultListScopeFilter = null;
            AppState._savedListLotto023 = [];
            updateSaveBoxState();
            return;
        }

        AppState._savedListLotto023 = lotto023Data;

        if (AppState.resultListScopeFilter !== 'pending_only' && AppState.resultListScopeFilter !== 'drawn_only') {
            AppState.resultListScopeFilter = 'pending_only';
        }

        let displayData = lotto023Data;
        if (AppState.resultListScopeFilter === 'pending_only') {
            displayData = lotto023Data.filter(function (g) { return !isLotto645RoundDrawn(Number(g.round)); });
            if (displayData.length === 0 && lotto023Data.some(function (g) { return isLotto645RoundDrawn(Number(g.round)); })) {
                AppState.resultListScopeFilter = 'drawn_only';
                displayData = lotto023Data.filter(function (g) { return isLotto645RoundDrawn(Number(g.round)); });
                AppState.resultListRoundFilter = null;
            } else {
                const pendingRounds = [...new Set(displayData.map(function (g) { return Number(g.round); }))]
                    .filter(function (r) { return !Number.isNaN(r) && r > 0 && !isLotto645RoundDrawn(r); });
                AppState.resultListRoundFilter = pendingRounds.length ? Math.max.apply(null, pendingRounds) : null;
            }
        } else if (AppState.resultListScopeFilter === 'drawn_only') {
            displayData = lotto023Data.filter(function (g) { return isLotto645RoundDrawn(Number(g.round)); });
            AppState.resultListRoundFilter = null;
        } else {
            AppState.resultListRoundFilter = null;
        }

        if (!displayData || displayData.length === 0) {
            resultContainer.innerHTML = '<p style="text-align: center; color: ' + SHAREHARMONY_PALETTE.textSecondary + '; font-size: 0.9rem;">저장된 결과가 없습니다.</p>';
            const summaryContainer = document.getElementById('resultSummary');
            if (summaryContainer) {
                summaryContainer.innerHTML = '';
                summaryContainer.classList.remove('result-summary-left--pending', 'result-summary-left--filtered-round');
            }
            const selectAll = document.getElementById('selectAllDeleteCheckbox');
            if (selectAll) { selectAll.checked = false; selectAll.indeterminate = false; }
            updateSaveBoxState();
            return;
        }

        // 회차별로 그룹화
        const grouped = {};
        displayData.forEach(item => {
            const key = `${item.round}`;
            if (!grouped[key]) {
                grouped[key] = [];
            }
            grouped[key].push(item);
        });

        // 최신 순으로 정렬 (회차 내림차순)
        const sortedGroups = Object.entries(grouped).sort((a, b) => Number(b[0]) - Number(a[0]));

        const scopePending = AppState.resultListScopeFilter === 'pending_only';
        const scopeDrawn = AppState.resultListScopeFilter === 'drawn_only';
        const filterRActive = AppState.resultListRoundFilter != null && !Number.isNaN(Number(AppState.resultListRoundFilter));
        const filteredRoundNum = filterRActive ? Number(AppState.resultListRoundFilter) : null;
        const selectedRoundIsDrawn = filteredRoundNum != null && isLotto645RoundDrawn(filteredRoundNum);

        const summary = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, total: 0 };
        if (filterRActive && selectedRoundIsDrawn) {
            const gamesForFilterRound = displayData.filter(function (g) { return Number(g.round) === filteredRoundNum; });
            summary.total = gamesForFilterRound.length;
            gamesForFilterRound.forEach(function (game) {
                const winRound = (AppState.allLotto645Data || []).find(function (r) { return Number(r.round) === Number(game.round); });
                if (winRound && winRound.numbers && game.numbers) {
                    const res = getLottoRank(game.numbers, winRound.numbers, winRound.bonus);
                    if (res.rank > 0) summary[res.rank]++;
                }
            });
        } else if (filterRActive && !selectedRoundIsDrawn) {
            summary.total = displayData.filter(function (g) { return Number(g.round) === filteredRoundNum; }).length;
        }

        /* 어두운 요약 바: 회차 · 등위 · 게임수 */
        let barRound = null;
        let barGameCount = 0;
        let barResultStats = '';
        let barPending = false;
        let barBubbleClick = false;

        if (displayData.length > 0 && sortedGroups.length > 0) {
            const drawnKeysInDisplay = Object.keys(grouped).filter(function (k) { return isLotto645RoundDrawn(Number(k)); });
            if (scopePending) {
                const pr = [...new Set(displayData.map(function (g) { return Number(g.round); }))]
                    .filter(function (r) { return !Number.isNaN(r) && r > 0; });
                barRound = pr.length ? Math.max.apply(null, pr) : Number(sortedGroups[0][0]);
                const barRoundGamesPending = displayData.filter(function (g) { return Number(g.round) === barRound; });
                barGameCount = barRoundGamesPending.length;
                barPending = true;
                barResultStats = '미추첨';
                barBubbleClick = false;
            } else if (scopeDrawn) {
                const dr = [...new Set(displayData.map(function (g) { return Number(g.round); }))]
                    .filter(function (r) { return !Number.isNaN(r) && isLotto645RoundDrawn(r); });
                barRound = dr.length ? Math.max.apply(null, dr) : Number(sortedGroups[0][0]);
                const barRoundGamesDrawn = displayData.filter(function (g) { return Number(g.round) === barRound; });
                barGameCount = barRoundGamesDrawn.length;
                barPending = false;
                const winBar = (AppState.allLotto645Data || []).find(function (r) { return Number(r.round) === barRound; });
                barResultStats = formatResultStatsHumanReadable(computeRankSummaryForRoundGames(barRoundGamesDrawn, winBar));
                barBubbleClick = isLotto645RoundDrawn(barRound);
            } else if (filterRActive) {
                barRound = filteredRoundNum;
                const barRoundGamesFiltered = displayData.filter(function (g) { return Number(g.round) === barRound; });
                barGameCount = barRoundGamesFiltered.length;
                barPending = !selectedRoundIsDrawn;
                if (selectedRoundIsDrawn) {
                    barResultStats = formatResultStatsHumanReadable(summary);
                    barBubbleClick = true;
                } else {
                    barResultStats = '미추첨';
                }
            } else {
                const fr0 = Number(sortedGroups[0][0]);
                const fg0 = sortedGroups[0][1];
                const wr0 = AppState.allLotto645Data && AppState.allLotto645Data.find(function (r) { return r.round === fr0; });
                barRound = fr0;
                barGameCount = fg0.length;
                barPending = !wr0 || !wr0.numbers;
                if (barPending) {
                    barResultStats = '미추첨';
                } else {
                    barResultStats = formatResultStatsHumanReadable(computeRankSummaryForRoundGames(fg0, wr0));
                    barBubbleClick = true;
                }
            }
        }

        /* 추첨 완료 회차가 맨 위 그룹이면 헤더 [회차] = 테이블 첫 행 회차(목록과 동일 기준) */
        let roundForHeaderButton = barRound;
        if (displayData.length > 0 && sortedGroups.length > 0 && sortedGroups[0][1] && sortedGroups[0][1].length > 0) {
            const topRound = Number(sortedGroups[0][0]);
            if (!Number.isNaN(topRound) && topRound > 0 && isLotto645RoundDrawn(topRound)) {
                roundForHeaderButton = topRound;
            }
        }

        const isPendingRoundSummary = barPending;
        const summaryContainer = document.getElementById('resultSummary');
        if (summaryContainer) {
            const showResultSummaryBar = lotto023Data.length > 0 && displayData.length > 0;
            if (!showResultSummaryBar || barRound == null || Number.isNaN(Number(barRound))) {
                summaryContainer.innerHTML = '';
                summaryContainer.classList.remove('result-summary-left--pending', 'result-summary-left--filtered-round');
                summaryContainer.onclick = null;
                summaryContainer.style.cursor = 'default';
                summaryContainer.removeAttribute('title');
            } else {
                const roundTabActive = ' result-header-tab--active';
                const roundScopeTip = scopeDrawn
                    ? '현재: 추첨 완료 저장만 표시. 클릭하면 미추첨 저장만 표시합니다.'
                    : '현재: 미추첨 저장만 표시(기본). 클릭하면 추첨 완료 저장만 표시합니다.';
                const statsExtraClass = barBubbleClick ? ' result-summary-drawn-main' : '';
                const roundTabLabel = '[' + roundForHeaderButton + ']';
                summaryContainer.innerHTML = `
                    <button type="button" id="resultHeaderRoundBtn" class="result-header-tab result-header-tab--round${roundTabActive}" aria-label="${roundForHeaderButton}회. ${roundScopeTip}" title="${roundScopeTip}">${roundTabLabel}</button>
                    <div class="result-summary-cell-mid" role="group" aria-label="당첨 등위">
                        <div class="result-summary-mid-slot result-summary-mid-slot--rank">
                            <span class="result-summary-hcol result-summary-hcol--rank" title="당첨 등수">등위</span>
                        </div>
                    </div>
                    <div class="result-summary-main result-summary-stats-cell${statsExtraClass}">
                        <span class="result-summary-game-n">게임수:${barGameCount}게임</span>
                    </div>`;
                summaryContainer.classList.toggle('result-summary-left--pending', isPendingRoundSummary);
                summaryContainer.classList.toggle('result-summary-left--filtered-round', true);
                summaryContainer.removeAttribute('title');
                const roundBtn = summaryContainer.querySelector('#resultHeaderRoundBtn');
                if (roundBtn) {
                    roundBtn.addEventListener('click', function () {
                        AppState.resultListScopeFilter = AppState.resultListScopeFilter === 'pending_only' ? 'drawn_only' : 'pending_only';
                        loadAndDisplayResults();
                    });
                }

                if (barBubbleClick) {
                    summaryContainer.style.cursor = 'default';
                    summaryContainer.title = '게임수 영역 클릭: 회차별 분석 말풍선';
                    summaryContainer.onclick = function (ev) {
                        if (ev.target.closest('.result-summary-main')) {
                            showResultAnalysisBubble(summary, displayData, sortedGroups);
                        }
                    };
                } else {
                    summaryContainer.style.cursor = 'default';
                    summaryContainer.onclick = null;
                }
            }
        }

        resultContainer.innerHTML = ''; // 기존 요약 박스 제거 후 초기화
        const selectAll = document.getElementById('selectAllDeleteCheckbox');
        if (selectAll) { selectAll.checked = false; selectAll.indeterminate = false; }

        // 각 그룹별로 결과 표시
        sortedGroups.forEach(([roundStr, games]) => {
            const round = Number(roundStr);

            // 해당 회차의 당첨번호 찾기
            const winRound = (AppState.allLotto645Data || []).find(function (r) { return Number(r.round) === round; });
            const winningNumbers = winRound && winRound.numbers ? new Set(winRound.numbers) : null;
            const isPendingRound = !winRound || !winRound.numbers;

            if (isPendingRound) {
                games.sort(function (a, b) { return compareSavedResultRowsPending(a, b); });
            } else {
                games.sort(function (a, b) { return compareSavedResultRowsDrawn(a, b, winRound); });
            }

            games.forEach((game, gameIdx) => {
                const resultLine = document.createElement('div');
                resultLine.className = 'result-saved-line';

                let matchNumsSet = new Set();
                let winRankBadge = null;
                if (winRound && winRound.numbers && game.numbers) {
                    const result = getLottoRank(game.numbers, winRound.numbers, winRound.bonus);
                    if (result.rank > 0) {
                        const rankColors = { 1: '#FBC400', 2: '#69C8F2', 3: '#FF7272', 4: '#AAAAAA', 5: '#B0D840' };
                        winRankBadge = document.createElement('span');
                        winRankBadge.className = 'result-win-rank-badge';
                        winRankBadge.style.backgroundColor = rankColors[result.rank] || '#ccc';
                        winRankBadge.textContent = `${result.rank}등`;
                    }
                    matchNumsSet = new Set(game.numbers.filter(n => winRound.numbers.includes(n)));
                    if (result.isBonusMatch) matchNumsSet.add(winRound.bonus);
                }

                const midCol = document.createElement('div');
                midCol.className = 'result-col-mid';

                const midSlotRank = document.createElement('div');
                midSlotRank.className = 'result-col-mid-slot result-col-mid-slot--rank';

                if (winRankBadge) midSlotRank.appendChild(winRankBadge);

                midCol.appendChild(midSlotRank);

                const parts = getSavedGameRowSummaryParts(game);
                const detailLineText = parts.detailLineText;
                const numsSorted = parts.numsSorted;
                const numsComma = numsSorted.length === 6 ? numsSorted.join(', ') : '—';

                const mainRow = document.createElement('div');
                mainRow.className = 'result-saved-main';
                mainRow.style.flex = '1';
                mainRow.style.minWidth = '0';

                const roundSpan = document.createElement('span');
                roundSpan.className = 'result-col-round';
                roundSpan.textContent = `[${parts.roundNum}]`;

                const detailWrap = document.createElement('span');
                detailWrap.className = 'result-saved-detail';

                const detailPrefixSpan = document.createElement('span');
                detailPrefixSpan.className = 'result-saved-detail-lead';
                detailPrefixSpan.textContent = parts.detailGamePrefix;

                const detailStatsSpan = document.createElement('span');
                detailStatsSpan.className = 'result-saved-detail-stats';
                detailStatsSpan.textContent = parts.detailStats;

                const detailAcSpan = document.createElement('span');
                detailAcSpan.className = 'result-saved-detail-ac';
                detailAcSpan.textContent = parts.detailAc;

                const modeSpan = document.createElement('span');
                modeSpan.className = 'result-saved-mode';
                modeSpan.textContent = parts.modeLabel;

                const detailTailSpan = document.createElement('span');
                detailTailSpan.className = 'result-saved-detail-tail';
                detailTailSpan.textContent = (parts.detailTail && parts.detailTail.length) ? (' ' + parts.detailTail) : parts.detailTail;

                detailWrap.appendChild(detailPrefixSpan);
                detailWrap.appendChild(detailStatsSpan);
                detailWrap.appendChild(detailAcSpan);
                detailWrap.appendChild(modeSpan);
                detailWrap.appendChild(detailTailSpan);

                mainRow.appendChild(roundSpan);
                mainRow.appendChild(midCol);
                mainRow.appendChild(detailWrap);
                mainRow.title = `[${parts.roundNum}] · ${detailLineText}${numsSorted.length === 6 ? ' · 번호 ' + numsComma : ''}`;

                const ballsCap = document.createElement('div');
                ballsCap.className = 'result-saved-balls-cap';

                const seqTouchPending = isPendingRound ? sequentialPairTouchSet(game.numbers) : new Set();

                // 결과공 생성 (6개) — 너비는 CSS에서 번호저장+선택삭제 캡과 동일
                if (game.numbers && Array.isArray(game.numbers)) {
                    game.numbers.slice(0, 6).forEach(num => {
                        const ball = createStatBall(num, 22, '0.8rem');

                        // [수정] 사용자의 요청: 저장공은 기본 흰색, 당첨 회차와 일치하는 번호만 컬러 적용
                        if (winningNumbers) {
                            if (!winningNumbers.has(num)) {
                                // 미당첨 번호: 화이트 스타일 강제 적용
                                ball.classList.add('saved-white');
                                ball.classList.remove(getBallColorClass(num));
                                ball.style.opacity = '0.6';
                            } else {
                                // 당첨된 공: 컬러 유지 + 검정 테두리(보너스 공과 통일)
                                ball.classList.add('result-saved-ball-match-draw');
                                ball.style.boxShadow = '0 0 8px rgba(0,0,0,0.4)';
                                ball.style.fontWeight = 'bold';
                            }
                        } else {
                            // 당첨 데이터가 없는 경우 (미래 회차): 기본 흰색
                            ball.classList.add('saved-white');
                            ball.classList.remove(getBallColorClass(num));
                            if (seqTouchPending.has(Number(num))) {
                                ball.classList.add('result-saved-ball-consecutive-pending');
                            }
                        }
                        ballsCap.appendChild(ball);
                    });
                }

                const resultBallsContainer = document.createElement('div');
                resultBallsContainer.className = 'result-saved-balls-row';

                // 슬롯 7: 고정 폭 — '+' 는 좌우 2px 마진만 (스페이서로 한쪽 치우침 방지)
                const slot7 = document.createElement('div');
                slot7.className = 'result-saved-slot7';

                const plusEl = document.createElement('span');
                plusEl.className = 'result-saved-slot7-plus';

                const bonusHost = document.createElement('div');
                bonusHost.className = 'result-saved-slot7-ball';

                if (winRound && winRound.bonus) {
                    plusEl.textContent = '+';
                    const bonusBall = createStatBall(winRound.bonus, 22, '0.8rem');

                    // [수정] 보너스 번호 일치 여부 확인 (2등 여부와 관련)
                    if (game.numbers && game.numbers.includes(winRound.bonus)) {
                        bonusBall.classList.add('result-saved-ball-match-draw');
                        bonusBall.style.boxShadow = '0 0 5px rgba(0,0,0,0.3)';
                        bonusBall.style.fontWeight = 'bold';
                    } else {
                        bonusBall.style.opacity = '0.6';
                        bonusBall.style.backgroundColor = SHAREHARMONY_PALETTE.white;
                        bonusBall.style.color = SHAREHARMONY_PALETTE.black;
                        bonusBall.classList.add('result-saved-ball-match-draw');
                    }
                    bonusHost.appendChild(bonusBall);
                } else if (isPendingRound) {
                    plusEl.textContent = '+';
                    const emptyBonus = document.createElement('div');
                    emptyBonus.className = 'stat-ball stat-ball--sm result-saved-bonus-empty';
                    emptyBonus.title = '미추첨 — 보너스 번호 없음';
                    bonusHost.appendChild(emptyBonus);
                }

                slot7.appendChild(plusEl);
                slot7.appendChild(bonusHost);

                // 삭제용 체크박스 생성
                const deleteCheckbox = document.createElement('input');
                deleteCheckbox.type = 'checkbox';
                deleteCheckbox.className = 'result-delete-checkbox';

                const sgChk = lotto023ResolvedSetGameLocal(game);
                deleteCheckbox.dataset.round = String(game.round ?? game['회차'] ?? '');
                deleteCheckbox.dataset.set = String(sgChk.setNum);
                deleteCheckbox.dataset.game = String(sgChk.gameNum);

                resultBallsContainer.appendChild(ballsCap);
                resultBallsContainer.appendChild(slot7);

                mainRow.appendChild(resultBallsContainer);

                resultLine.appendChild(mainRow);
                resultLine.appendChild(deleteCheckbox);

                resultLine.style.cursor = 'pointer';
                resultLine.addEventListener('click', (e) => {
                    if (e.target.type === 'checkbox') return;
                    showGameAnalysisBubble(game, winRound);
                });

                resultContainer.appendChild(resultLine);
            });
        });
        updateSaveBoxState();
    } catch (error) {
        console.error(error);
        resultContainer.innerHTML = '<p style="text-align: center; color: #f00; font-size: 0.9rem;">결과를 로드할 수 없습니다.</p>';
    }
}

/** 같은 오리진이면 상대 경로만 쓰면 안전(fetch URL 오타·혼합 콘텐츠 회피). GitHub Pages 프로젝트는 /api가 아니라 /저장소명/api. */
function resolveApiPath(path) {
    const p = path.charAt(0) === '/' ? path : '/' + path;
    let prefix = '';
    if (typeof getSameOriginApiPathPrefix === 'function') {
        prefix = String(getSameOriginApiPathPrefix() || '').replace(/\/$/, '');
    }
    if (typeof getApiBaseUrl !== 'function') return prefix + p;
    const base = String(getApiBaseUrl()).replace(/\/$/, '');
    const origin = (typeof window !== 'undefined' && window.location && window.location.origin)
        ? window.location.origin.replace(/\/$/, '') : '';
    if (base && base !== origin) return base + p;
    return prefix + p;
}

async function fetchWithRetry(url, init, retries) {
    const n = retries == null ? 2 : retries;
    let lastErr;
    for (let i = 0; i <= n; i++) {
        try {
            return await fetch(url, init);
        } catch (e) {
            lastErr = e;
            if (i < n) {
                await new Promise(function (r) { setTimeout(r, 1200 * (i + 1)); });
            }
        }
    }
    throw lastErr;
}

async function fetchLatestWinningNumbers() {
    const navBtn = document.getElementById('navFetchLatest');
    if (navBtn) {
        navBtn.style.pointerEvents = 'none';
        navBtn.textContent = '조회중...';
    }

    try {
        const reqInit = { cache: 'no-store' };
        // 1) force=0: 서버 판단으로 로컬 JSON만으로도 빠르게 응답(Railway→동행복권 매번 호출 회피)
        let latestRes = await fetchWithRetry(resolveApiPath('/api/lotto-latest?force=0'), reqInit, 2);
        let latestData = await latestRes.json().catch(function () { return {}; });
        if (latestData.returnValue !== 'success' || latestData.drwNo == null) {
            if (navBtn) navBtn.textContent = '강제 조회중...';
            latestRes = await fetchWithRetry(resolveApiPath('/api/lotto-latest?force=1'), reqInit, 2);
            latestData = await latestRes.json().catch(function () { return {}; });
        }
        if (latestData.returnValue !== 'success' || latestData.drwNo == null) {
            alert('동행복권 최신 회차 정보를 가져오지 못했습니다. (클라우드 IP 차단 시 USE_PLAYWRIGHT·프록시 등 서버 설정을 확인하세요.)');
            return;
        }

        const apiLatestRound = latestData.drwNo;
        const localEndRound = AppState.endRound || 0;

        if (apiLatestRound <= localEndRound) {
            showNavBubble(navBtn, `이미 최신 상태입니다. (${localEndRound}회)`);
            return;
        }

        const missingCount = apiLatestRound - localEndRound;
        if (navBtn) navBtn.textContent = `${missingCount}회 취득중...`;

        if (missingCount <= 100) {
            const missingRounds = [];
            for (let r = localEndRound + 1; r <= apiLatestRound; r++) missingRounds.push(r);
            await fetchWithRetry(
                resolveApiPath('/api/fetch-missing-rounds?rounds=' + missingRounds.join(',')),
                reqInit,
                1
            );
        }

        const syncRes = await fetchWithRetry(resolveApiPath('/api/sync-lotto645'), { method: 'POST', cache: 'no-store' }, 1);
        const syncData = await syncRes.json().catch(() => ({}));

        if (syncData.returnValue === 'fail' && syncData.error) {
            alert('회차 추가 실패: ' + syncData.error + '\nExcel에서 Lotto645.xlsx를 닫고 다시 시도하세요.');
            return;
        }

        const loadFunc = (typeof window !== 'undefined' && window.loadLotto645Data)
            ? window.loadLotto645Data
            : (typeof loadLotto645Data !== 'undefined' ? loadLotto645Data : null);

        if (!loadFunc) {
            alert('데이터 로드 함수를 찾을 수 없습니다. 페이지를 새로고침하세요.');
            return;
        }

        const newData = await loadFunc('', { bypassCache: true });
        if (newData && newData.length > 0) {
            await initializeStats(newData);

            AppState.latestRoundApi = apiLatestRound;
            AppState.latestRoundDateApi = latestData.drwNoDate || '';

            const endInput = document.getElementById('endDate');
            if (endInput && latestData.drwNoDate) {
                const apiDateObj = parseDate(String(latestData.drwNoDate).trim());
                if (apiDateObj instanceof Date && !isNaN(apiDateObj.getTime())) {
                    endInput.value = formatDateYYMMDD(apiDateObj);
                }
            }

            if (typeof updateRoundRangeDisplay === 'function') updateRoundRangeDisplay();
            if (typeof renderStats === 'function') renderStats(newData);

            // 중앙 패널 게임 초기화: 공 비우고 합계 000으로 리셋
            AppState.setSelectedBalls = Array.from({ length: 5 }, () => []);
            for (let i = 1; i <= 5; i++) {
                const ballsContainer = document.getElementById(`gameBalls${i}`);
                if (ballsContainer) ballsContainer.innerHTML = '';
                const modeBtn = document.getElementById(`modeBtn${i}`);
                if (modeBtn) {
                    modeBtn.dataset.mode = 'manual';
                    modeBtn.textContent = '수동';
                }
                const cb = document.getElementById(`gameCheckbox${i}`);
                if (cb) cb.checked = false;
                updateGameSum(i, []);
            }

            // 우측 패널 합계값: 기본 0(필터 없음)
            const sumValEl = document.getElementById('resultSumValue');
            if (sumValEl) {
                sumValEl.value = '0';
                if (!AppState.resultFilters) AppState.resultFilters = {};
                AppState.resultFilters.sumValue = null;
                if (AppState.currentViewNumbersBaseData) {
                    renderViewNumbersList(AppState.currentViewNumbersBaseData);
                }
            }

            AppState.previousDataCount = newData.length;
            let maxR = 0;
            for (let i = 0; i < newData.length; i++) {
                const r = Number(newData[i].round);
                if (!Number.isNaN(r) && r > maxR) maxR = r;
            }
            const serverRows = syncData.totalRounds != null ? Number(syncData.totalRounds) : null;
            let msg = `${localEndRound + 1}회 ~ ${apiLatestRound}회 (${missingCount}회차) 추가 완료!\n`;
            msg += `불러온 데이터 ${newData.length}건 (최고 ${maxR}회)`;
            if (serverRows != null && !Number.isNaN(serverRows)) {
                msg += `\n서버 Lotto645.xlsx ${serverRows}행`;
                if (serverRows !== newData.length) {
                    msg += `\n※ 건수가 다르면 강력 새로고침 후 다시 확인하세요.`;
                }
            }
            alert(msg);
        } else {
            alert('데이터를 다시 불러오지 못했습니다. 페이지를 새로고침하세요.');
        }
    } catch (e) {
        console.error('[최근당첨번호] 오류:', e);
        const msg = (e && e.message) ? e.message : String(e);
        const hint = /failed to fetch|networkerror|load failed/i.test(msg)
            ? '\n\n네트워크 또는 서버 응답이 없습니다. 잠시 후 다시 시도하거나 Railway 로그·재배포를 확인하세요. 해외 IP 차단이면 .env 프록시 설정이 필요할 수 있습니다.'
            : '';
        alert('최근당첨번호 조회 중 오류가 발생했습니다: ' + msg + hint);
    } finally {
        if (navBtn) {
            navBtn.style.pointerEvents = '';
            navBtn.textContent = '최근당첨번호';
        }
    }
}

if (typeof window !== "undefined") {
    window.loadAndDisplayResults = loadAndDisplayResults;
    window.fetchLatestWinningNumbers = fetchLatestWinningNumbers;
}


async function saveGamesToCSV() {
    // [추가] 1. 삭제 대상 확인 (저장공 우측 체크박스)
    const deleteCheckboxes = document.querySelectorAll('.result-delete-checkbox:checked');
    let deleteCount = 0;

    if (deleteCheckboxes.length > 0) {
        if (confirm(`${deleteCheckboxes.length}개의 저장된 기록을 삭제하시겠습니까?`)) {
            const itemsToDelete = Array.from(deleteCheckboxes).map(cb => ({
                round: cb.dataset.round,
                set: cb.dataset.set,
                game: cb.dataset.game
            }));

            try {
                await removeLotto023ItemsFromLocal(itemsToDelete);
                await loadAndDisplayResults();
                deleteCount = itemsToDelete.length;
            } catch (err) {
                console.error('삭제 실패:', err);
                alert('삭제 중 오류가 발생했습니다.');
            }
        }
    }

    // 2. 새 게임 저장 로직
    const saveRound = document.getElementById('saveRound');
    if (!saveRound) {
        if (deleteCount > 0) {
            updateSaveBoxState();
            alert(`선택한 ${deleteCount}개의 기록이 삭제되었습니다.`);
        }
        return;
    }

    // 체크된 새 게임들 확인
    const gamesToSave = [];
    const oddEvenFilter = document.getElementById('filterOddEven')?.value || 'none';
    const sequenceFilter = document.getElementById('filterConsecutive')?.value || 'none';
    const hotColdFilter = document.getElementById('filterHotCold')?.value || 'none';

    const mapRatioToNumber = (value) => {
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

    const mapSequenceToNumber = (value) => {
        if (value === 'none') return -1;
        const n = parseInt(value, 10);
        return Number.isNaN(n) ? -1 : n;
    };

    const oddEvenValue = mapRatioToNumber(oddEvenFilter);
    const sequenceValue = mapSequenceToNumber(sequenceFilter);
    const hotColdValue = mapRatioToNumber(hotColdFilter);

    let roundNum = NaN;
    let newSaveRoundReady = false;

    for (let i = 1; i <= 5; i++) {
        const checkbox = document.getElementById(`gameCheckbox${i}`);
        if (checkbox && checkbox.checked) {
            const numbers = AppState.setSelectedBalls[i - 1] || [];
            const validNumbers = numbers.filter(n => n && n >= 1 && n <= 45);
            const modeBtn = document.getElementById(`modeBtn${i}`);
            const dsMode = modeBtn ? modeBtn.dataset.mode : '';

            if (validNumbers.length === 6) {
                if (!newSaveRoundReady) {
                    if (!validateNewSaveRoundContext()) return;
                    roundNum = getEffectiveSaveRound();
                    newSaveRoundReady = true;
                }
                let gameMode = '수동';
                if (modeBtn) {
                    if (modeBtn.dataset.mode === 'lucky') gameMode = '행운';
                    else if (modeBtn.dataset.mode === 'auto') gameMode = 'AI추천';
                    else if (modeBtn.dataset.mode === 'semi-auto') gameMode = '반자동';
                    else if (modeBtn.dataset.mode === 'bob') gameMode = 'BoB';
                    else if (modeBtn.dataset.mode === 'manual') gameMode = '수동';
                }
                const sorted = validNumbers.sort((a, b) => a - b);

                const actualOdd = sorted.filter(n => n % 2 === 1).length;
                const actualSeq = (() => {
                    let cnt = 0;
                    for (let j = 1; j < sorted.length; j++) { if (sorted[j] - sorted[j - 1] === 1) cnt++; }
                    return cnt;
                })();
                const actualHot = (() => {
                    const { hot } = getHotColdNumbersBeforeRound(roundNum);
                    const hotSet = new Set(hot);
                    return sorted.filter(n => hotSet.has(n)).length;
                })();

                const pickSum = sorted.reduce((a, b) => a + b, 0);

                gamesToSave.push({
                    '회차': roundNum.toString(),
                    '세트': '',
                    '게임': i.toString(),
                    '홀짝': (oddEvenValue === -1 ? actualOdd : oddEvenValue).toString(),
                    '연속': (sequenceValue === -1 ? actualSeq : sequenceValue).toString(),
                    '핫콜': (hotColdValue === -1 ? actualHot : hotColdValue).toString(),
                    '게임선택': gameMode,
                    '선택합계': String(pickSum),
                    '선택1': sorted[0].toString(),
                    '선택2': sorted[1].toString(),
                    '선택3': sorted[2].toString(),
                    '선택4': sorted[3].toString(),
                    '선택5': sorted[4].toString(),
                    '선택6': sorted[5].toString(),
                    'Perfect순위': ''
                });
            }
        }
    }

    const needNewSavePayload = gamesToSave.length > 0;

    if (!needNewSavePayload) {
        if (deleteCount > 0) {
            updateSaveBoxState();
            alert(`선택한 ${deleteCount}개의 기록이 삭제되었습니다.`);
        } else {
            alert('저장할 게임이나 삭제할 기록이 선택되지 않았습니다.');
        }
        return;
    }

    if (!newSaveRoundReady && gamesToSave.length > 0) {
        if (!validateNewSaveRoundContext()) return;
        roundNum = getEffectiveSaveRound();
        newSaveRoundReady = true;
    }

    const gamesPayload = gamesToSave;

    // Lotto023: 로컬(localStorage)에만 저장 (세트/게임 규칙은 appendLotto023GamesToLocal)
    try {
        await appendLotto023GamesToLocal(gamesPayload);

        AppState.setSelectedBalls = Array.from({ length: 5 }, () => []);
        for (let i = 1; i <= 5; i++) {
            const cb = document.getElementById(`gameCheckbox${i}`);
            if (cb) { cb.checked = false; cb.disabled = true; }
            const modeBtn = document.getElementById(`modeBtn${i}`);
            if (modeBtn) {
                modeBtn.dataset.mode = 'manual';
                modeBtn.textContent = '수동';
                delete modeBtn.dataset.semiFrom;
                delete modeBtn.dataset.diversifyOffset;
                modeBtn.title = '';
            }
        }
        /* 조회구간 통계 → 옵션필터·합계·핫콜 기준을 먼저 맞춘 뒤 저장공을 그려야 BoB·행 메타와 번호생성·신뢰도가 같은 전제를 씀 */
        try {
            const listData = AppState.currentViewNumbersBaseData || AppState.currentStatsRounds || AppState.allLotto645Data;
            if (listData && listData.length > 0 && typeof extractAndApplyFilters === 'function') {
                extractAndApplyFilters(listData);
            }
            if (AppState.optionFilters) {
                AppState.optionFilters.oddEven = document.getElementById('filterOddEven')?.value || 'none';
                AppState.optionFilters.hotCold = document.getElementById('filterHotCold')?.value || 'none';
                AppState.optionFilters.consecutive = document.getElementById('filterConsecutive')?.value || 'none';
            }
        } catch (saveFilterErr) {
            console.error('[저장 후] 조회구간 필터 반영 실패:', saveFilterErr);
        }
        /* 로컬 캐시 반영분으로 저장 목록(resultContainer) 재출력 */
        await loadAndDisplayResults();
        await generateAllGames(); /* generateAllGames는 async (자동/lucky 슬롯 풀 기반 보충) */
        updateSaveBoxState();

        const msg = deleteCount > 0 ? `새 게임이 저장되고 ${deleteCount}개의 기록이 삭제되었습니다.` : '저장 완료!';
        alert(msg);
    } catch (error) {
        console.error('저장 오류:', error);
        alert('저장 중 오류가 발생했습니다: ' + error.message);
    }
}

if (typeof window !== "undefined") {
    window.saveGamesToCSV = saveGamesToCSV;
    window.removeLotto023ItemsFromLocal = removeLotto023ItemsFromLocal;
}
