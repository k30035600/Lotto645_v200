/**
 * 통계 계산 모듈 (Web Worker)
 * 로또 번호 통계 분석을 Web Worker에 위임하여 메인 스레드 차단을 방지합니다.
 */

/**
 * 통계 데이터 초기화 및 계산 (Web Worker 사용)
 * @param {Array} lottoData - 로또 데이터 배열
 * @param {number} maxNumber - 최대 번호 (기본값: 45)
 * @returns {Promise<Object>} 계산된 모든 통계를 담은 Promise
 */
function initializeStatistics(lottoData, maxNumber = 45) {
    return new Promise((resolve, reject) => {
        // 'worker.js' 경로가 올바른지 확인해야 합니다.
        // 이 파일은 프로젝트 루트에 있다고 가정합니다.
        const worker = new Worker('worker.js');

        worker.onmessage = function(e) {
            const { type, payload } = e.data;

            if (type === 'SUCCESS') {
                // Worker에서 직렬화된 데이터를 다시 Map 객체로 변환
                const statistics = {
                    ...payload,
                    winStatsMap: new Map(payload.winStatsMap),
                    appearanceStatsMap: new Map(payload.appearanceStatsMap),
                    winPercentageMap: new Map(payload.winPercentageMap),
                    appearancePercentageMap: new Map(payload.appearancePercentageMap),
                };
                resolve(statistics);
            } else if (type === 'ERROR') {
                console.error("Web Worker error:", payload);
                reject(new Error(`Worker error: ${payload.message}`));
            }

            // 작업 완료 후 Worker 종료
            worker.terminate();
        };

        worker.onerror = function(error) {
            console.error("Worker instantiation error:", error);
            reject(new Error(`Worker error: ${error.message}`));
            worker.terminate();
        };

        // Worker에 데이터 전송
        worker.postMessage({
            lottoData,
            maxNumber
        });
    });
}

// 전역으로 export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initializeStatistics
    };
}


function computeConsecutiveStats(rounds, type) {
    if (!rounds || rounds.length === 0) return [];
    const map = new Map();
    rounds.forEach(r => {
        const nums = (r.numbers || []).map(n => parseInt(n, 10)).filter(n => !isNaN(n)).sort((a, b) => a - b);
        if (nums.length < 2) return;
        if (type === 1) {
            const pairs = getConsecutivePairs(nums);
            pairs.forEach(pair => {
                const key = pair.join(',');
                if (!map.has(key)) map.set(key, { numbers: pair, count: 0, rounds: [] });
                const entry = map.get(key);
                entry.count++;
                entry.rounds.push(r.round);
            });
        } else if (type === 2) {
            const runs3Plus = getConsecutiveRuns(nums, 3);
            runs3Plus.forEach(run => {
                for (let start = 0; start + 3 <= run.length; start++) {
                    const sub = run.slice(start, start + 3);
                    const key = sub.join(',');
                    if (!map.has(key)) map.set(key, { numbers: sub, count: 0, rounds: [] });
                    const entry = map.get(key);
                    entry.count++;
                    entry.rounds.push(r.round);
                }
            });
            const pairs = getConsecutivePairs(nums);
            if (pairs.length >= 2) {
                for (let i = 0; i < pairs.length; i++) {
                    for (let j = i + 1; j < pairs.length; j++) {
                        const p1 = pairs[i], p2 = pairs[j];
                        if (p1[1] >= p2[0] && p2[1] >= p1[0]) continue;
                        const key = p1[0] < p2[0] ? p1.join(',') + ' / ' + p2.join(',') : p2.join(',') + ' / ' + p1.join(',');
                        const numsArr = p1[0] < p2[0] ? [...p1, ...p2] : [...p2, ...p1];
                        if (!map.has(key)) map.set(key, { numbers: numsArr, display: p1.join(',') + ' / ' + p2.join(','), count: 0, rounds: [] });
                        const entry = map.get(key);
                        entry.count++;
                        entry.rounds.push(r.round);
                    }
                }
            }
            const runs3Only = runs3Plus.filter(run => run.length === 3);
            if (runs3Only.length >= 3) {
                for (let i = 0; i < runs3Only.length; i++) {
                    for (let j = i + 1; j < runs3Only.length; j++) {
                        for (let k = j + 1; k < runs3Only.length; k++) {
                            const arr = [runs3Only[i], runs3Only[j], runs3Only[k]].sort((a, b) => a[0] - b[0]);
                            const display = arr.map(r => r.join(',')).join(' / ');
                            const key = display;
                            const numsArr = arr.flat();
                            if (!map.has(key)) map.set(key, { numbers: numsArr, display: display, count: 0, rounds: [] });
                            const entry = map.get(key);
                            entry.count++;
                            entry.rounds.push(r.round);
                        }
                    }
                }
            }
        } else {
            const runs4Plus = getConsecutiveRuns(nums, 4);
            runs4Plus.forEach(run => {
                const key = run.join(',');
                if (!map.has(key)) map.set(key, { numbers: run, count: 0, rounds: [] });
                const entry = map.get(key);
                entry.count++;
                entry.rounds.push(r.round);
            });
            const pairs = getConsecutivePairs(nums);
            if (pairs.length >= 3) {
                for (let i = 0; i < pairs.length; i++) {
                    for (let j = i + 1; j < pairs.length; j++) {
                        for (let k = j + 1; k < pairs.length; k++) {
                            const sel = [pairs[i], pairs[j], pairs[k]];
                            const flat = sel.flat();
                            const sorted = [...new Set(flat)].sort((a, b) => a - b);
                            let isSingleRun = true;
                            for (let t = 1; t < sorted.length; t++) {
                                if (sorted[t] !== sorted[t - 1] + 1) { isSingleRun = false; break; }
                            }
                            if (isSingleRun && sorted.length >= 4) continue;
                            const runs = [];
                            const used = new Set();
                            sel.forEach(p => {
                                if (used.has(p[0] + ',' + p[1])) return;
                                const run = [p[0], p[1]];
                                used.add(p[0] + ',' + p[1]);
                                let changed = true;
                                while (changed) {
                                    changed = false;
                                    sel.forEach(q => {
                                        if (used.has(q[0] + ',' + q[1])) return;
                                        if (q[0] === run[run.length - 1]) {
                                            run.push(q[1]);
                                            used.add(q[0] + ',' + q[1]);
                                            changed = true;
                                        } else if (q[1] === run[0]) {
                                            run.unshift(q[0]);
                                            used.add(q[0] + ',' + q[1]);
                                            changed = true;
                                        }
                                    });
                                }
                                runs.push(run);
                            });
                            runs.sort((a, b) => a[0] - b[0]);
                            const display = runs.map(r => r.join(',')).join(' / ');
                            const numsArr = runs.flat();
                            const key = display;
                            if (!map.has(key)) map.set(key, { numbers: numsArr, display: display, count: 0, rounds: [] });
                            const entry = map.get(key);
                            entry.count++;
                            entry.rounds.push(r.round);
                        }
                    }
                }
            }
        }
    });
    return Array.from(map.entries()).map(([key, v]) => ({ key, ...v }));
}

if (typeof window !== "undefined") {
    window.computeConsecutiveStats = computeConsecutiveStats;
}
