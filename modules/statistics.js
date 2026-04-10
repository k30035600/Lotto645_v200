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
