/**
 * modules/harmonyPool.js
 * 행운번호·Perfect BoB 공통 핵심 유틸리티 — DOM 의존 없는 순수 계산 함수
 */

/**
 * UI 스레드에 짧게 넘겨 스피너·응답 없음 완화
 */
function yieldToMainThread() {
    return new Promise(function (resolve) { setTimeout(resolve, 0); });
}

function getStatFilterTrustScoreTooltip() {
    return '신뢰도는 실제 당첨 확률이 아니라, 합계 구간·홀짝·핫콜·연속·AC 기준으로 이 조합이 얼마나 맞는지를 0~100으로 나타낸 지표입니다. 배점은 합계 최대 25점, 홀짝 20점, 핫콜 20점, 연속 15점, AC 20점이며, none인 항목은 만점으로 반영됩니다.';
}

/** `.stat-filter-trust-tip-host`용 `data-trust-tooltip` 설정(CSS ::after 말풍선) */
function applyStatFilterTrustTooltip(el) {
    if (!el || el.nodeType !== 1) return;
    if (typeof getStatFilterTrustScoreTooltip !== 'function') {
        el.removeAttribute('data-trust-tooltip');
        return;
    }
    const tip = getStatFilterTrustScoreTooltip();
    if (tip == null || String(tip).trim() === '') {
        el.removeAttribute('data-trust-tooltip');
        return;
    }
    el.setAttribute('data-trust-tooltip', String(tip));
}

function escapeHtmlAttribute(str) {
    if (str == null) return '';
    return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;');
}

function calculateStatFilterTrustScore(sorted, ctx) {
    if (!ctx || !sorted || sorted.length !== 6) return 0;
    let score = 0;
    const sumRange = ctx.sumRange || { start: 21, end: 255 };
    const sum = sorted.reduce((a, b) => a + b, 0);
    if (sum >= sumRange.start && sum <= sumRange.end) score += 25;
    else if (sum >= sumRange.start - 20 && sum <= sumRange.end + 20) score += 12;

    const oddCount = sorted.filter(n => n % 2 !== 0).length;
    const oeFilter = ctx.oddEven || 'none';
    if (oeFilter !== 'none') {
        const targetOdd = parseInt(oeFilter.split('-')[0], 10);
        if (!isNaN(targetOdd)) {
            if (oddCount === targetOdd) score += 20;
            else if (Math.abs(oddCount - targetOdd) === 1) score += 10;
        }
    } else score += 20;

    const hcFilter = ctx.hotCold || 'none';
    if (hcFilter !== 'none') {
        const parts = hcFilter.split('-');
        const targetHot = parseInt(parts[0], 10);
        const targetCold = parseInt(parts[1], 10);
        if (!isNaN(targetHot) && !isNaN(targetCold)) {
            const hotSet = new Set(ctx.hot || []);
            const coldSet = new Set(ctx.cold || []);
            const hotCnt = sorted.filter(n => hotSet.has(n)).length;
            const coldCnt = sorted.filter(n => coldSet.has(n)).length;
            if (hotCnt === targetHot && coldCnt === targetCold) score += 20;
            else if (Math.abs(hotCnt - targetHot) === 1 && Math.abs(coldCnt - targetCold) === 1) score += 10;
        }
    } else score += 20;

    let seqCount = 0;
    for (let i = 0; i < sorted.length - 1; i++) {
        if (sorted[i + 1] === sorted[i] + 1) seqCount++;
    }
    const seqFilter = ctx.consecutive || 'none';
    if (seqFilter !== 'none') {
        const targetSeq = parseInt(seqFilter, 10);
        if (targetSeq === 3 ? seqCount >= 3 : seqCount === targetSeq) score += 15;
    } else score += 15;

    const ac = typeof calculateAC === 'function' ? calculateAC(sorted) : null;
    const acFilter = ctx.ac || 'none';
    if (acFilter !== 'none' && ac !== null) {
        const targetAC = parseInt(acFilter, 10);
        if (!isNaN(targetAC)) {
            if (ac === targetAC) score += 20;
            else if (Math.abs(ac - targetAC) === 1) score += 10;
        }
    } else score += 20;
    return Math.min(score, 100);
}

function pickFiveFromHarmonySortedEntries(sortedEntries) {
    const usedCombos = new Set();
    const usedSums = new Set();
    const chosenSlots = [];
    const validatedSlots = [];
    function pushChoice(p) {
        const vs = p.validatedForSlot != null && p.validatedForSlot >= 1 && p.validatedForSlot <= 5
            ? Math.floor(Number(p.validatedForSlot))
            : null;
        chosenSlots.push(p.numbers);
        validatedSlots.push(vs);
    }
    for (let s = 0; s < sortedEntries.length && chosenSlots.length < 5; s++) {
        const p = sortedEntries[s];
        if (usedCombos.has(p.key)) continue;
        const sumSix = p.numbers.reduce((a, b) => a + b, 0);
        if (usedSums.has(sumSix)) continue;
        usedCombos.add(p.key);
        usedSums.add(sumSix);
        pushChoice(p);
    }
    if (chosenSlots.length < 5) {
        for (let s = 0; s < sortedEntries.length && chosenSlots.length < 5; s++) {
            const p = sortedEntries[s];
            if (usedCombos.has(p.key)) continue;
            usedCombos.add(p.key);
            pushChoice(p);
        }
    }
    return { chosenSlots, usedCombos, validatedSlots };
}

function scorePendingLuckyPerfectKey(numbers, ctx) {
    const nums = (numbers || []).map(Number).filter(n => !isNaN(n)).sort((a, b) => a - b);
    const valid = nums.length === 6 && new Set(nums).size === 6 && nums.every(n => n >= 1 && n <= 45);
    const gameSum = valid ? nums.reduce((s, n) => s + n, 0) : 99999;
    const matchScore = valid ? nums.filter(n => ctx.hotSet.has(n)).length : 0;
    const sumDist = valid ? Math.abs(gameSum - ctx.refAvgSum) : 999999;
    return { matchScore, sumDist };
}

/** 워커·칩·모달 공통: 풀 수집 직전 빌드한 슬롯 ctx 깊은 복사(합구간·핫콜 목표 불변) */
function cloneHarmonySlotTrustCtxs(src) {
    const out = {};
    if (!src || typeof src !== 'object') return out;
    for (let i = 1; i <= 5; i++) {
        const c = src[i] || src[String(i)];
        if (!c) continue;
        out[i] = {
            sumRange: (c.sumRange != null && c.sumRange.start != null && c.sumRange.end != null)
                ? { start: Number(c.sumRange.start), end: Number(c.sumRange.end) }
                : { start: 21, end: 255 },
            oddEven: c.oddEven != null ? c.oddEven : 'none',
            hotCold: c.hotCold != null ? c.hotCold : 'none',
            consecutive: c.consecutive != null ? c.consecutive : 'none',
            ac: c.ac != null ? c.ac : 'none',
            hot: Array.isArray(c.hot) ? c.hot.slice() : [],
            cold: Array.isArray(c.cold) ? c.cold.slice() : []
        };
    }
    return out;
}

/** 워커 풀(단일 인스턴스 재사용) — 잦은 호출 시 워커 부팅 비용 절감. 사용 중이면 임시 워커 생성 후 즉시 terminate. */
let __harmonyWorker = null;
let __harmonyWorkerBusy = false;

function collectTrust100HarmonyPoolAsync(opts) {
    return new Promise((resolve, reject) => {
        if (!__harmonyWorker) __harmonyWorker = new Worker('modules/worker.js');
        const useShared = !__harmonyWorkerBusy;
        const worker = useShared ? __harmonyWorker : new Worker('modules/worker.js');
        if (useShared) __harmonyWorkerBusy = true;
        const cleanup = function () {
            if (useShared) {
                __harmonyWorkerBusy = false;
                worker.onmessage = null;
                worker.onerror = null;
            } else {
                try { worker.terminate(); } catch (_) { /* ignore */ }
            }
        };
        const onProgress = typeof opts.onProgress === 'function' ? opts.onProgress : null;
        const roundNum = opts.roundNum;
        const diversifyRunOffset = opts.diversifyRunOffset != null ? Math.floor(Number(opts.diversifyRunOffset)) || 0 : Math.floor(Math.random() * 17);
        const trustCtxBase = buildStatFilterTrustContextFromDom();
        const luckySortCtx = buildLuckyPendingPerfectSortContext(roundNum);
        const slotTrustCtxs = {};
        for (let i = 1; i <= 5; i++) slotTrustCtxs[i] = buildStatFilterTrustContextForGameSlot(i, diversifyRunOffset);
        const globalFilters = {
            excludeNumbers: (document.getElementById('filterExclude') && document.getElementById('filterExclude').value) 
                ? document.getElementById('filterExclude').value.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n) && n >= 1 && n <= 45)
                : []
        };
        const pastCombosSet = (AppState.allLotto645Data || []).map(row => [row.n1, row.n2, row.n3, row.n4, row.n5, row.n6].sort((a, b) => a - b).join(','));
        worker.onmessage = e => {
            const { type, payload } = e.data;
            if (type === 'COLLECT_POOL_DONE') {
                cleanup();
                resolve({
                    entries: payload.entries,
                    trustCtx: trustCtxBase,
                    diversifyRunOffset: payload.diversifyRunOffset,
                    slotTrustCtxs: cloneHarmonySlotTrustCtxs(slotTrustCtxs)
                });
            } else if (type === 'COLLECT_POOL_PROGRESS') {
                if (onProgress) {
                    try { onProgress(payload); } catch (_) { /* ignore */ }
                }
            } else if (type === 'ERROR') {
                cleanup();
                reject(new Error(payload));
            }
        };
        worker.onerror = err => { cleanup(); reject(err); };
        try {
            worker.postMessage({
                type: 'COLLECT_POOL',
                payload: {
                    targetCount: opts.targetCount,
                    maxAttempts: opts.maxAttempts,
                    roundNum: roundNum,
                    deadlineMs: opts.deadlineMs || 0,
                    stagnationLimit: opts.stagnationAttempts || 0,
                    diversifyRunOffset: diversifyRunOffset,
                    trustCtxBase,
                    luckySortCtx: { hotSet: Array.from(luckySortCtx.hotSet), refAvgSum: luckySortCtx.refAvgSum },
                    slotTrustCtxs,
                    allPastCombosSet: pastCombosSet,
                    globalFilters
                }
            });
        } catch (postErr) {
            cleanup();
            reject(postErr instanceof Error ? postErr : new Error(String(postErr)));
        }
    });
}

/**
 * 한 슬롯의 신뢰도 100% 조합 시도(비동기·협력적).
 *  1) `tries`회 시도 → 신뢰도 100% 발견 시 채택
 *  2) 일반 호출 1회
 *  3) 옵션필터 무시(skipOpt=true) 1회
 *  4) 그래도 실패 시 무작위 6개
 * 결과 배열에 비공개 `__fallback` 속성 부착(`'ok'|'filtered'|'skipOpt'|'random'`).
 * app.js의 `tryFillSlotWithTrust100Sync`(동기)와 의도적으로 같은 형태로 정렬됨.
 */
async function tryFillSlotWithTrust100Async(slot, diversifyRunOffset, otherCombos, opts) {
    const o = opts || {};
    const HPC = (typeof HARMONY_POOL_CONSTANTS !== 'undefined') ? HARMONY_POOL_CONSTANTS : {};
    const tries = o.tries || HPC.TRUST100_TRIES_ASYNC || 200;
    const yieldEvery = o.yieldEvery || HPC.TRUST100_YIELD_EVERY || 24;
    const skipOpt = !!o.skipOpt;
    const avoidExt = !!o.avoidExt;
    const tag = o.logTag || '[tryFillSlotWithTrust100Async]';
    const ctx = buildStatFilterTrustContextForGameSlot(slot, diversifyRunOffset);
    let numbers = null;
    let fallback = 'ok';
    for (let t = 0; t < tries; t++) {
        if (t > 0 && t % yieldEvery === 0) await yieldToMainThread();
        const candidate = await generateNumbersWithFiltersCooperative([], false, otherCombos, skipOpt, avoidExt, slot, diversifyRunOffset);
        if (candidate && calculateAIProbability(candidate, ctx) >= 100) { numbers = candidate; break; }
    }
    if (!numbers) {
        numbers = await generateNumbersWithFiltersCooperative([], false, otherCombos, skipOpt, avoidExt, slot, diversifyRunOffset);
        if (numbers && numbers.length === 6) fallback = 'filtered';
    }
    if (!numbers || numbers.length !== 6) {
        numbers = await generateNumbersWithFiltersCooperative([], false, otherCombos, true, avoidExt, slot, diversifyRunOffset);
        if (numbers && numbers.length === 6) fallback = 'skipOpt';
    }
    if (!numbers || numbers.length !== 6) {
        console.warn(tag + ' 협력 생성이 조건을 만족하지 못해 무작위 6개로 대체합니다.');
        numbers = pickSix([]);
        fallback = 'random';
    }
    try { Object.defineProperty(numbers, '__fallback', { value: fallback, enumerable: false }); } catch (_) { /* ignore */ }
    return numbers;
}

async function ensureFiveLuckySlotsWithFallbackAsync(chosenSlots, usedCombos, diversifyRunOffset, logTag, validatedSlots) {
    const tag = logTag || '[ensureFiveLuckySlotsWithFallbackAsync]';
    const off = diversifyRunOffset != null ? Math.floor(Number(diversifyRunOffset)) || 0 : 0;
    const out = chosenSlots.slice();
    while (out.length < 5) out.push(null);
    const vs = (validatedSlots && validatedSlots.slice) ? validatedSlots.slice() : [];
    while (vs.length < 5) vs.push(null);
    for (let i = 1; i <= 5; i++) {
        let numbers = out[i - 1];
        if (!numbers) {
            numbers = await tryFillSlotWithTrust100Async(i, off, usedCombos, { logTag: tag });
            usedCombos.add([...numbers].sort((a, b) => a - b).join(','));
            vs[i - 1] = i;
        } else {
            const v = vs[i - 1];
            if (v == null || v < 1 || v > 5) vs[i - 1] = i;
        }
        out[i - 1] = numbers;
    }
    return { finalFive: out, trustSlotByGame: vs };
}

/**
 * 풀 기반 5게임 생성 공통 워크플로우 (행운번호·Perfect BoB 공유)
 * @param {object} snap                  옵션필터 스냅샷 (마지막에 복원)
 * @param {object} cfg                   모드별 설정
 * @param {string} cfg.modeKey           'lucky' | 'bob'
 * @param {string} cfg.modeLabel         '행운' | 'BoB'
 * @param {() => number} cfg.getRoundNum 회차 결정 함수
 * @param {() => boolean} [cfg.preValidate]            사전 검증(false시 바로 종료)
 * @param {boolean} [cfg.requireValidRound]            roundNum이 양수가 아니면 alert+종료
 * @param {object} cfg.poolOpts          collectTrust100HarmonyPoolAsync 옵션 (roundNum 제외)
 * @param {boolean} [cfg.allowEmptyPool] 풀 비어도 진행할지 (기본 true)
 * @param {boolean} [cfg.poolUnderAlert] 풀이 targetCount에 미치지 못하면 alert
 * @param {(raw, roundNum) => Promise<void>} [cfg.persistPool]  풀 영구 저장 훅
 * @param {(finalFive, raw, off) => any} [cfg.beforeAssign]      슬롯 채우기 직전 메타 계산
 * @param {boolean} [cfg.clearSemiFrom]  modeBtn dataset.semiFrom 삭제
 * @param {(raw) => string} [cfg.titleFn]               modeBtn title 설정
 * @param {(numbers) => boolean} [cfg.checkedFn]        체크박스 checked 결정 (기본 true)
 * @param {boolean} [cfg.yieldEachSlot]  슬롯마다 yieldToMainThread
 * @param {(raw, extraMeta) => void} [cfg.showAnalysis] 분석 패널 표시
 * @param {() => void} [cfg.afterRestore]               필터 복원 직후 후처리
 * @param {string} [cfg.logTag]
 */
async function runHarmonyPoolGames(snap, cfg) {
    if (typeof AppState !== 'undefined') {
        AppState._harmonyTrustCtxBySlot = null;
        AppState._harmonyTrustSlotByGame = null;
    }
    applyReceiveLuckyNumbersEnvironment();
    await yieldToMainThread();

    /* 모드별 통계 기준 명시: 'lucky' = 1~최신회 / 'bob' = 사용자 설정 그대로 */
    if (typeof applyStatBasisForMode === 'function') applyStatBasisForMode(cfg.modeKey);

    if (cfg.preValidate && !cfg.preValidate()) {
        if (typeof restoreOptionFilters === 'function') restoreOptionFilters(snap);
        return;
    }

    const roundNum = cfg.getRoundNum();
    if (cfg.requireValidRound && (Number.isNaN(roundNum) || roundNum < 1)) {
        alert('저장할 회차를 확인할 수 없습니다.');
        if (typeof restoreOptionFilters === 'function') restoreOptionFilters(snap);
        return;
    }

    /* 진행률 표시(.lucky-numbers-loading-text 갱신). cfg.progressLabel이 있으면 prefix로 표시. */
    const loadingTextEl = document.querySelector('.lucky-numbers-loading-text');
    const loadingPrefix = cfg.progressLabel || (cfg.modeKey === 'bob' ? 'Perfect BoB' : '행운번호');
    const onProgress = function (p) {
        if (!loadingTextEl) return;
        const elapsedSec = Math.floor((p.elapsedMs || 0) / 1000);
        loadingTextEl.textContent = loadingPrefix + ': ' + p.collected + ' / ' + p.targetCount + ' 게임 수집 중… (' + elapsedSec + 's)';
    };
    const pool = await collectTrust100HarmonyPoolAsync(Object.assign({}, cfg.poolOpts, { roundNum: roundNum, onProgress: onProgress }));
    const trustCtx = pool.trustCtx;
    const diversifyRunOffset = pool.diversifyRunOffset != null ? pool.diversifyRunOffset : 0;
    AppState._luckyStatTrustContext = trustCtx;
    const raw = pool.entries;

    if (raw.length === 0 && cfg.allowEmptyPool === false) {
        alert('조건을 만족하는 조합을 수집하지 못했습니다. 합계 구간·필터를 완화해 보세요.');
        AppState._luckyStatTrustContext = null;
        AppState._harmonyTrustCtxBySlot = null;
        AppState._harmonyTrustSlotByGame = null;
        if (typeof restoreOptionFilters === 'function') restoreOptionFilters(snap);
        return;
    }

    if (cfg.persistPool) {
        await cfg.persistPool(raw, roundNum);
    }
    if (cfg.poolUnderAlert && raw.length < cfg.poolOpts.targetCount) {
        alert('조건을 만족하는 고유 조합이 ' + cfg.poolOpts.targetCount + '개에 미치지 못했습니다. (수집 ' + raw.length + '개)');
    }

    /* 워커 100점 기준 ctx: pick·beforeAssign 이전에 고정(합밴드 등은 updateGameSet 전 값과 동일) */
    const snapSlotsEarly = pool.slotTrustCtxs && typeof pool.slotTrustCtxs === 'object'
        ? cloneHarmonySlotTrustCtxs(pool.slotTrustCtxs)
        : null;
    if (snapSlotsEarly && Object.keys(snapSlotsEarly).length > 0) {
        AppState._harmonyTrustCtxBySlot = snapSlotsEarly;
    } else {
        const offSnap0 = diversifyRunOffset != null ? diversifyRunOffset : 0;
        if (typeof buildStatFilterTrustContextForGameSlot === 'function') {
            AppState._harmonyTrustCtxBySlot = {};
            for (let gi = 1; gi <= 5; gi++) {
                AppState._harmonyTrustCtxBySlot[gi] = buildStatFilterTrustContextForGameSlot(gi, offSnap0);
            }
        } else {
            AppState._harmonyTrustCtxBySlot = null;
        }
    }

    const pick = pickFiveFromHarmonySortedEntries(raw);
    const ensured = await ensureFiveLuckySlotsWithFallbackAsync(
        pick.chosenSlots,
        pick.usedCombos,
        diversifyRunOffset,
        cfg.logTag || '[runHarmonyPoolGames]',
        pick.validatedSlots
    );
    const finalFive = ensured.finalFive;
    AppState._harmonyTrustSlotByGame = ensured.trustSlotByGame;

    const extraMeta = cfg.beforeAssign ? cfg.beforeAssign(finalFive, raw, diversifyRunOffset) : null;

    if (!AppState.setSelectedBalls) AppState.setSelectedBalls = Array.from({ length: 5 }, () => []);
    for (let i = 1; i <= 5; i++) {
        const numbers = finalFive[i - 1] || [];
        AppState.setSelectedBalls[i - 1] = numbers.slice ? numbers.slice() : numbers;
        const modeBtn = document.getElementById('modeBtn' + i);
        const cb = document.getElementById('gameCheckbox' + i);
        if (modeBtn) {
            modeBtn.dataset.diversifyOffset = String(diversifyRunOffset);
            modeBtn.dataset.mode = cfg.modeKey;
            modeBtn.textContent = cfg.modeLabel;
            if (cfg.clearSemiFrom) delete modeBtn.dataset.semiFrom;
            const baseTitle = cfg.titleFn ? cfg.titleFn(raw) : '';
            const seedTag = ' (seed:' + diversifyRunOffset + ')';
            modeBtn.title = baseTitle ? (baseTitle + seedTag) : ('분산 시드:' + diversifyRunOffset);
        }
        if (cb) {
            cb.disabled = false;
            cb.checked = cfg.checkedFn ? cfg.checkedFn(numbers) : true;
        }
        /* fallback 표시: cfg.titleFn이 설정한 title은 유지하고, 보충된 슬롯만 추가 표기 */
        if (typeof annotateGameModeBtnFallback === 'function' && numbers && numbers.__fallback && numbers.__fallback !== 'ok') {
            annotateGameModeBtnFallback(i, numbers.__fallback);
        }
        /* 슬롯 DOM은 generateGame 이 async 이므로 반드시 await (미대기 시 후속 showAnalysis/필터복원과 레이스 가능) */
        await Promise.resolve(updateGameSet(i, cfg.modeKey));
        if (cfg.yieldEachSlot) await yieldToMainThread();
    }
    updateSaveBoxState();

    if (cfg.modeKey === 'lucky') {
        AppState._luckyDiversifyRunOffset = diversifyRunOffset;
    }

    if (cfg.showAnalysis) cfg.showAnalysis(raw, extraMeta);
    if (typeof restoreOptionFilters === 'function') restoreOptionFilters(snap);
    if (cfg.afterRestore) cfg.afterRestore();
    if (AppState._harmonyTrustCtxBySlot && typeof updateGameProbability === 'function') {
        for (let gi = 1; gi <= 5; gi++) {
            updateGameProbability(gi, (AppState.setSelectedBalls && AppState.setSelectedBalls[gi - 1]) || []);
        }
    }
}

async function runGoldenAiGamesWork(luckySnap) {
    return runHarmonyPoolGames(luckySnap, {
        modeKey: 'lucky',
        modeLabel: '행운',
        getRoundNum: getLuckyStatRankTargetRound,
        poolOpts: { targetCount: 60, maxAttempts: 200, yieldInterval: 20, deadlineMs: 8000, stagnationAttempts: 400 },
        /* 빈 풀이면 fallback 무작위 6개를 5번 채우게 되어 의미 없음 → 안내 후 종료 */
        allowEmptyPool: false,
        yieldEachSlot: true,
        showAnalysis: function () { showGoldenAiAnalysis(); },
        logTag: '[runGoldenAiGamesWork]'
    });
}

async function runPerfectBobGamesWork(filterSnap) {
    const TARGET = 100;
    return runHarmonyPoolGames(filterSnap, {
        modeKey: 'bob',
        modeLabel: 'BoB',
        getRoundNum: getEffectiveSaveRound,
        preValidate: function () { return validateNewSaveRoundContext(); },
        requireValidRound: true,
        poolOpts: { targetCount: TARGET, maxAttempts: 500, yieldInterval: 20, deadlineMs: 30000, stagnationAttempts: 1000 },
        allowEmptyPool: false,
        poolUnderAlert: true,
        clearSemiFrom: true,
        titleFn: function (raw) { return 'Perfect 풀(' + raw.length + '게임)'; },
        checkedFn: function (numbers) { return (numbers || []).length === 6; },
        logTag: '[runPerfectBobGamesWork]',
        persistPool: async function (raw, roundNum) {
            const gamesJson = [];
            for (let i = 0; i < raw.length; i++) {
                const sorted = [...raw[i].numbers].sort((a, b) => a - b);
                const row = buildLottoBobJsonGameRow(roundNum, 1, i + 1, sorted, i + 1);
                if (row) gamesJson.push(row);
            }
            try {
                const res = await fetch(resolveApiPath('/api/save-lotto-bob'), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ games: gamesJson })
                });
                const jr = await parseFetchJsonResponse(res);
                if (!res.ok || jr.returnValue !== 'success') throw new Error(jr.error || 'LottoBoB 저장 실패');
            } catch (e) {
                console.error('[Perfect BoB]', e);
                alert('LottoBoB.json 저장에 실패했습니다: ' + (e.message || String(e)));
            }
        },
        beforeAssign: function (finalFive, raw, diversifyRunOffset) {
            const meta = [];
            const tmap = AppState._harmonyTrustSlotByGame;
            for (let i = 0; i < 5; i++) {
                const numbers = finalFive[i];
                if (!numbers || numbers.length !== 6) { meta.push({ numbers: [], trust: 0, poolRank: 0 }); continue; }
                const ck = [...numbers].sort((a, b) => a - b).join(',');
                let idx = -1;
                for (let j = 0; j < raw.length; j++) { if (raw[j].key === ck) { idx = j; break; } }
                const slotTrust = (tmap && tmap[i] >= 1 && tmap[i] <= 5) ? tmap[i] : (i + 1);
                const ctxGame = (AppState._harmonyTrustCtxBySlot && AppState._harmonyTrustCtxBySlot[slotTrust])
                    ? AppState._harmonyTrustCtxBySlot[slotTrust]
                    : buildStatFilterTrustContextForGameSlot(slotTrust, diversifyRunOffset);
                meta.push({ numbers: numbers.slice(), trust: calculateAIProbability(numbers, ctxGame), poolRank: idx >= 0 ? idx + 1 : 0 });
            }
            return meta;
        },
        showAnalysis: function (raw, meta) { showPerfectBobAnalysis(raw.length, meta); },
        afterRestore: function () {
            AppState._luckyStatTrustContext = null;
        }
    });
}

function generateGoldenAiGames() {
    if (AppState._goldenAiBusy || AppState._perfectBobBusy) {
        alert('다른 번호 생성(행운번호 또는 Perfect top 5)이 이미 진행 중입니다. 완료된 뒤 다시 눌러 주세요.');
        return;
    }
    AppState._goldenAiBusy = true;
    const btn = document.getElementById('masterGenerateBtn') || document.getElementById('goldenAiBtnHeader');
    const navLucky = document.getElementById('navLuckyNumbers');
    const luckySnap = typeof snapshotOptionFiltersForRestore === 'function' ? snapshotOptionFiltersForRestore() : null;
    if (btn) { btn.disabled = true; btn.innerHTML = '✨ 생성 중…'; }
    if (navLucky) navLucky.classList.add('lucky-nav-busy');
    setLuckyNumbersLoadingUi(true);
    requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(() => {
        runGoldenAiGamesWork(luckySnap)
            .catch(err => {
                console.error('[행운번호]', err);
                alert('행운번호 생성 중 오류가 났습니다: ' + (err && err.message ? err.message : String(err)) + '\n브라우저 콘솔(F12)에서 자세한 로그를 확인해 주세요.');
            })
            .finally(() => {
                AppState._goldenAiBusy = false;
                setLuckyNumbersLoadingUi(false);
                if (navLucky) navLucky.classList.remove('lucky-nav-busy');
                if (btn) { btn.disabled = false; btn.innerHTML = '행운번호 받기 ✓'; setTimeout(() => btn.innerHTML = '행운번호 받기', 2500); }
            });
    }, 0)));
}

function generatePerfectBobGames() {
    if (AppState._perfectBobBusy || AppState._goldenAiBusy) {
        alert('다른 번호 생성이 진행 중입니다. 완료 후 다시 시도해 주세요.');
        return;
    }
    AppState._perfectBobBusy = true;
    const navPb = document.getElementById('navPerfectBob'), navLucky = document.getElementById('navLuckyNumbers');
    const filterSnap = typeof snapshotOptionFiltersForRestore === 'function' ? snapshotOptionFiltersForRestore() : null;
    if (navPb) navPb.classList.add('lucky-nav-busy');
    if (navLucky) navLucky.classList.add('lucky-nav-busy');
    setLuckyNumbersLoadingUi(true);
    const loadingText = document.querySelector('.lucky-numbers-loading-text');
    const prevLoadText = loadingText ? loadingText.textContent : '';
    if (loadingText) loadingText.textContent = 'Perfect BoB: 100게임 수집·신뢰도 정렬 중…';
    requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(() => {
        runPerfectBobGamesWork(filterSnap)
            .catch(err => {
                console.error('[Perfect BoB]', err);
                alert('Perfect top 5 처리 중 오류: ' + (err && err.message ? err.message : String(err)));
            })
            .finally(() => {
                AppState._perfectBobBusy = false;
                setLuckyNumbersLoadingUi(false);
                if (navPb) navPb.classList.remove('lucky-nav-busy');
                if (navLucky) navLucky.classList.remove('lucky-nav-busy');
                if (loadingText && prevLoadText) loadingText.textContent = prevLoadText;
            });
    }, 0)));
}

if (typeof window !== 'undefined') {
    window.yieldToMainThread = yieldToMainThread;
    window.getStatFilterTrustScoreTooltip = getStatFilterTrustScoreTooltip;
    window.applyStatFilterTrustTooltip = applyStatFilterTrustTooltip;
    window.escapeHtmlAttribute = escapeHtmlAttribute;
    window.calculateStatFilterTrustScore = calculateStatFilterTrustScore;
    window.pickFiveFromHarmonySortedEntries = pickFiveFromHarmonySortedEntries;
    window.scorePendingLuckyPerfectKey = scorePendingLuckyPerfectKey;
    window.collectTrust100HarmonyPoolAsync = collectTrust100HarmonyPoolAsync;
    window.tryFillSlotWithTrust100Async = tryFillSlotWithTrust100Async;
    window.ensureFiveLuckySlotsWithFallbackAsync = ensureFiveLuckySlotsWithFallbackAsync;
    window.runHarmonyPoolGames = runHarmonyPoolGames;
    window.runGoldenAiGamesWork = runGoldenAiGamesWork;
    window.runPerfectBobGamesWork = runPerfectBobGamesWork;
    window.generateGoldenAiGames = generateGoldenAiGames;
    window.generatePerfectBobGames = generatePerfectBobGames;
}
