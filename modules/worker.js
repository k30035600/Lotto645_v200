/**
 * modules/worker.js
 * 로또 번호 생성의 CPU 집약적 작업을 처리하는 웹 워커.
 */

try {
    importScripts('constants.js');
    importScripts('utils/lottoUtils.js');
    importScripts('generator.js');
    importScripts('filters.js');
    importScripts('harmonyPool.js');
} catch (e) {
    // Worker environment might not support relative paths in some cases
    // but usually this works if called from the same folder context.
    console.error('[Worker] Script import failed:', e);
}

// 워커 내 전역 객체 모킹
if (typeof window === 'undefined') { self.window = self; }

// Dummy yieldToMainThread for worker (not needed here)
self.yieldToMainThread = function() { return Promise.resolve(); };

self.onmessage = async function(e) {
    const { type, payload } = e.data;
    if (type === 'COLLECT_POOL') {
        try {
            const result = await collectPoolInWorker(payload);
            self.postMessage({ type: 'COLLECT_POOL_DONE', payload: result });
        } catch (err) {
            console.error('[Worker] Error:', err);
            self.postMessage({ type: 'ERROR', payload: err.message });
        }
    }
};

async function collectPoolInWorker(opts) {
    const { 
        targetCount, maxAttempts, roundNum, 
        deadlineMs, stagnationLimit, diversifyRunOffset,
        slotTrustCtxs,
        allPastCombosSet,
        luckySortCtx,
        globalFilters
    } = opts;

    // 객체 변환 (통신을 위해 Array로 왔던 것들 복구)
    const pastCombosSetObj = new Set(allPastCombosSet || []);
    const REF_AVG_SUM = (self.HARMONY_POOL_CONSTANTS && self.HARMONY_POOL_CONSTANTS.REF_AVG_SUM)
        || (self.LOTTO_CONSTANTS && self.LOTTO_CONSTANTS.AVG_SUM)
        || 138;
    const luckySortCtxObj = {
        hotSet: new Set(luckySortCtx.hotSet || []),
        refAvgSum: luckySortCtx.refAvgSum || REF_AVG_SUM
    };

    const seenPool = new Set();
    const entries = [];
    const t0 = Date.now();
    let sinceLastAdd = 0;
    let lastProgressAt = 0;
    const PROGRESS_THROTTLE_MS = 250;

    for (let t = 0; t < maxAttempts && entries.length < targetCount; t++) {
        if (deadlineMs > 0 && Date.now() - t0 >= deadlineMs) break;
        if (stagnationLimit > 0 && sinceLastAdd >= stagnationLimit) break;

        /* 진행률 보고 (250ms 스로틀) */
        const now = Date.now();
        if (now - lastProgressAt >= PROGRESS_THROTTLE_MS) {
            lastProgressAt = now;
            try {
                self.postMessage({
                    type: 'COLLECT_POOL_PROGRESS',
                    payload: {
                        collected: entries.length,
                        targetCount: targetCount,
                        attempts: t,
                        maxAttempts: maxAttempts,
                        elapsedMs: now - t0,
                        deadlineMs: deadlineMs
                    }
                });
            } catch (_) { /* ignore */ }
        }
        
        const slotN = (typeof LOTTO_CONSTANTS !== 'undefined' && LOTTO_CONSTANTS.SUM_BAND_SLOT_COUNT != null)
            ? LOTTO_CONSTANTS.SUM_BAND_SLOT_COUNT
            : 5;
        const slot = (t % slotN) + 1;
        /* postMessage 직렬화 후 키가 문자열일 수 있음. DOM 없음: 메인이 보낸 slotTrustCtxs 로만 분산 필터 구성 */
        const slotTrustCtx = slotTrustCtxs[slot] || slotTrustCtxs[String(slot)];
        if (!slotTrustCtx) {
            sinceLastAdd++;
            continue;
        }
        const divTc = {
            oddEven: slotTrustCtx.oddEven || 'none',
            consecutive: slotTrustCtx.consecutive || 'none',
            hotCold: slotTrustCtx.hotCold || 'none',
            ac: slotTrustCtx.ac || 'none'
        };
        
        // 핫콜 컨텍스트 수동 구성 (워커에는 getHotColdSetsForOptionFilter가 없으므로)
        const hcCtx = {
            hotSet: new Set(slotTrustCtx.hot || []),
            coldSet: new Set(slotTrustCtx.cold || []),
            targetHot: parseInt(String(divTc.hotCold).split('-')[0], 10),
            targetCold: parseInt(String(divTc.hotCold).split('-')[1], 10)
        };

        // generator.js의 pickSixWithFiltersCooperative 호출
        const candidate = await pickSixWithFiltersCooperative(
            divTc.oddEven, 
            divTc.consecutive, 
            divTc.hotCold, 
            [], 
            divTc.ac, 
            globalFilters.excludeNumbers,
            pastCombosSetObj,
            seenPool,
            hcCtx
        );
        
        if (!candidate || candidate.length !== 6) {
            sinceLastAdd++;
            continue;
        }

        const ck = [...candidate].sort((a, b) => a - b).join(',');
        if (seenPool.has(ck)) {
            sinceLastAdd++;
            continue;
        }

        // 신뢰도 체크
        const tr = calculateStatFilterTrustScore(candidate, slotTrustCtx);
        if (tr < 100) {
            sinceLastAdd++;
            continue;
        }

        seenPool.add(ck);
        sinceLastAdd = 0;
        
        const k = scorePendingLuckyPerfectKey(candidate, luckySortCtxObj);
        const sum = candidate.reduce((a, b) => a + b, 0);
        
        entries.push({
            numbers: candidate.slice(),
            key: ck,
            trust: tr,
            matchScore: k.matchScore,
            sumDist: k.sumDist,
            sum: sum,
            /* 메인 UI 게임 칸과 워커 회전 슬롯(1~5) 매칭: 신뢰도 100 판정에 쓴 ctx 슬롯 */
            validatedForSlot: slot
        });
    }

    entries.sort((a, b) => {
        if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
        return a.sumDist - b.sumDist;
    });

    return { entries, diversifyRunOffset };
}
