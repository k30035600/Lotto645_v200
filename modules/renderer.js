/**
 * modules/renderer.js
 * 화면 렌더링 및 UI 컴포넌트 생성 관련 함수들
 */

/** 공 색상 가져오기 */
function getBallColorClass(num) {
    if (!num) return "";
    if (num <= 10) return "color-yellow";
    if (num <= 20) return "color-blue";
    if (num <= 30) return "color-red";
    if (num <= 40) return "color-gray";
    return "color-green";
}

/** 통계 공 생성 */
function createStatBall(num, size = 22, fontSize = "0.8rem", isNonMatching = false) {
    const ball = document.createElement("div");

    // 기본 클래스: 가변 크기(CSS --ball-size). 작은 공은 stat-ball--sm
    const isSmall = size <= 28;
    ball.className = "stat-ball " + getBallColorClass(num) + (isSmall ? " stat-ball--sm" : "");

    if (isNonMatching) {
        ball.style.backgroundColor = (typeof SHAREHARMONY_PALETTE !== 'undefined') ? SHAREHARMONY_PALETTE.primaryNavy : '#263238';
        ball.style.color = (typeof SHAREHARMONY_PALETTE !== 'undefined') ? SHAREHARMONY_PALETTE.white : '#FFFFFF';
    } else {
        if (typeof AppState !== 'undefined' && AppState.goldenNumbers && AppState.goldenNumbers.has(num)) {
            ball.classList.add('golden');
        }
    }

    ball.textContent = num;
    return ball;
}

/** 플러스 기호 생성 */
function createPlusSign(style = "color: " + ((typeof SHAREHARMONY_PALETTE !== 'undefined') ? SHAREHARMONY_PALETTE.golden : '#F39C12') + "; font-weight: bold; margin: 0 2px;") {
    const plus = document.createElement("span");
    plus.style.cssText = style;
    plus.textContent = "+";
    return plus;
}

// 브라우저 환경에서 전역으로 노출
if (typeof window !== 'undefined') {
    window.getBallColorClass = getBallColorClass;
    window.createStatBall = createStatBall;
    window.createPlusSign = createPlusSign;
}


function renderMonthlyAverageChart(currentData) {
    const ctx = document.getElementById('averageSumChart');
    // 전체 범위를 알기 위해 AppState.allLotto645Data가 필수입니다.
    if (!ctx || !AppState.allLotto645Data || AppState.allLotto645Data.length === 0) return;

    // 1. 전체 데이터 가공: 최근회차 -> 과거회차 순 (좌측=최근, 우측=과거)
    const fullData = [...AppState.allLotto645Data].sort((a, b) => b.round - a.round);

    // 현재 표시해야 할 데이터 (필터링된 데이터)
    const displayData = currentData || AppState.currentStatsRounds || AppState.allLotto645Data;
    const filterSet = new Set(displayData.map(r => r.round));

    const labels = fullData.map(r => `${r.round}회`);
    const roundSums = fullData.map(r => {
        if (filterSet.has(r.round)) {
            return (r.numbers || []).reduce((acc, num) => acc + (num || 0), 0);
        }
        return null; // 선택되지 않은 회차는 그리지 않음
    });

    // 2. 회차별 누적 평균: 1회 ~ 당 회차까지의 평균 (파란 점선·툴팁용)
    const cumulativeAverages = [];
    const n = fullData.length;
    for (let i = 0; i < n; i++) {
        const R = fullData[i].round;
        const startIdx = Math.max(0, n - R);
        let sum = 0;
        let count = 0;
        for (let j = startIdx; j < n; j++) {
            if (roundSums[j] !== null) {
                sum += roundSums[j];
                count += 1;
            }
        }
        cumulativeAverages.push(count > 0 ? parseFloat((sum / count).toFixed(1)) : null);
    }

    // 2-1. Max(파란 평균보다 큰 회차들의 평균) / Min(파란 평균보다 작은 회차들의 평균)
    const maxLine = [];
    const minLine = [];
    for (let i = 0; i < n; i++) {
        const R = fullData[i].round;
        const startIdx = Math.max(0, n - R);
        const blueVal = cumulativeAverages[i];
        let aboveSum = 0, aboveCount = 0, belowSum = 0, belowCount = 0;
        for (let j = startIdx; j < n; j++) {
            if (roundSums[j] === null) continue;
            if (roundSums[j] > blueVal) {
                aboveSum += roundSums[j];
                aboveCount += 1;
            } else if (roundSums[j] < blueVal) {
                belowSum += roundSums[j];
                belowCount += 1;
            }
        }
        maxLine.push(aboveCount > 0 ? parseFloat((aboveSum / aboveCount).toFixed(1)) : null);
        minLine.push(belowCount > 0 ? parseFloat((belowSum / belowCount).toFixed(1)) : null);
    }

    // 전체 회차별 min/avg/max 맵 저장
    const chartRoundMap = {};
    for (let i = 0; i < n; i++) {
        chartRoundMap[fullData[i].round] = {
            min: minLine[i],
            avg: cumulativeAverages[i],
            max: maxLine[i]
        };
    }
    AppState.chartRoundValuesMap = chartRoundMap;

    // 종료회차(endRound)에 해당하는 그래프 값을 AppState에 저장
    const endRound = AppState.endRound || (fullData.length > 0 ? fullData[0].round : 0);
    const endIdx = fullData.findIndex(r => r.round === endRound);
    if (endIdx >= 0) {
        AppState.chartEndRoundValues = {
            min: minLine[endIdx],
            avg: cumulativeAverages[endIdx],
            max: maxLine[endIdx]
        };
    } else if (fullData.length > 0) {
        AppState.chartEndRoundValues = {
            min: minLine[0],
            avg: cumulativeAverages[0],
            max: maxLine[0]
        };
    }
    updateResultFilterAvg();

    // 3. 차트 너비 계산 및 스크롤바 설정을 위한 wrapper 처리
    const chartWrapper = document.getElementById('chartWrapper');
    const chartYAxisFixed = document.getElementById('chartYAxisFixed');
    const bottomUnifiedContent = document.getElementById('bottomUnifiedContent');
    if (chartWrapper) {
        // 회차당 고정 6px 유지
        const fixedBarWidth = 6;
        const calculatedWidth = labels.length * fixedBarWidth;
        chartWrapper.style.width = calculatedWidth + 'px';

        // 캔버스 크기 강제 동기화
        ctx.width = calculatedWidth;
        ctx.height = chartWrapper.offsetHeight;

        // 좌측=최근이므로 기본은 스크롤 0(최근이 보이도록)
        setTimeout(() => {
            if (bottomUnifiedContent) {
                bottomUnifiedContent.scrollLeft = 0;
            }
        }, 100);
    }

    // 4. Y축 고정 (이론적 최소 21 ~ 최대 255, 로또 6개 번호 합 범위)
    const yMin = 21;
    const yMax = 255;
    const yStep = 10;

    // 고정 Y축 눈금 렌더 (스크롤 시 사라지지 않음, 차트와 동일 21~250 step 10)
    if (chartYAxisFixed) {
        chartYAxisFixed.innerHTML = '';
        const yTicks = [];
        for (let v = 250; v > yMin; v -= yStep) yTicks.push(v);
        yTicks.push(yMin);
        yTicks.forEach(function (v) {
            const span = document.createElement('span');
            span.textContent = String(v);
            span.setAttribute('role', 'presentation');
            chartYAxisFixed.appendChild(span);
        });
    }

    // 4. 기존 차트가 있으면 파괴
    if (window.lottoAverageChart) {
        window.lottoAverageChart.destroy();
    }

    // 5. 차트 생성
    window.lottoAverageChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: '회차별 합계',
                    data: roundSums,
                    backgroundColor: '#69C8F2', // 공식 파란색 (11-20번 색상 활용)
                    borderColor: '#1b2f89', // 공식 딥 블루
                    borderWidth: 1,
                    hoverBackgroundColor: '#1b2f89',
                    hoverBorderColor: '#1b2f89',
                    barPercentage: 1.0,
                    categoryPercentage: 1.0,
                    zIndex: 1
                },
                {
                    label: '선택 평균 (1회~당 회차)',
                    type: 'line',
                    data: cumulativeAverages,
                    borderColor: '#69C8F2',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    pointRadius: 0,
                    fill: false,
                    zIndex: 2
                },
                {
                    label: 'Max (평균보다 큰 회차 평균)',
                    type: 'line',
                    data: maxLine,
                    borderColor: SHAREHARMONY_PALETTE.error,
                    borderWidth: 2,
                    borderDash: [5, 5],
                    pointRadius: 0,
                    fill: false,
                    zIndex: 3
                },
                {
                    label: 'Min (평균보다 작은 회차 평균)',
                    type: 'line',
                    data: minLine,
                    borderColor: '#000000',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    pointRadius: 0,
                    fill: false,
                    zIndex: 3
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: 0
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: function () { return null; },
                        afterBody: function (context) {
                            const idx = (context[0] && context[0].dataIndex != null) ? context[0].dataIndex : -1;
                            const tot = idx >= 0 && roundSums[idx] != null ? roundSums[idx] : '-';
                            const maxVal = idx >= 0 && maxLine[idx] != null ? maxLine[idx] : '-';
                            const avrVal = idx >= 0 && cumulativeAverages[idx] != null ? cumulativeAverages[idx] : '-';
                            const minVal = idx >= 0 && minLine[idx] != null ? minLine[idx] : '-';

                            const label = (context[0] && context[0].label) ? context[0].label : '';
                            const roundNum = parseInt(String(label).replace(/회$/, ''), 10);

                            const lines = [];
                            lines.push('TOT: ' + tot);
                            lines.push('Max: ' + maxVal);
                            lines.push('Avr.: ' + avrVal + '(1회~' + (isNaN(roundNum) ? '?' : roundNum) + '회)');
                            lines.push('Min: ' + minVal);

                            if (!isNaN(roundNum) && AppState.allLotto645Data) {
                                const roundData = AppState.allLotto645Data.find(function (r) { return r.round === roundNum; });
                                if (roundData) {
                                    const nums = (roundData.numbers || []).slice(0, 6).map(function (n) { return Number(n); }).filter(function (n) { return !isNaN(n); }).sort(function (a, b) { return a - b; });
                                    const bonus = roundData.bonus != null ? String(roundData.bonus).trim() : '';
                                    const bonusStr = bonus ? ' + ' + bonus : '';
                                    lines.push('Number: ' + nums.join(', ') + bonusStr);
                                }
                            }
                            return lines;
                        }
                    }
                }
            },
            scales: {
                x: {
                    display: true,
                    grid: { display: false },
                    ticks: {
                        callback: function (value) {
                            const label = this.getLabelForValue(value);
                            const roundNum = parseInt(label);
                            return (roundNum % 50 === 0) ? label : '';
                        },
                        autoSkip: false,
                        maxRotation: 0,
                        font: { size: 10 },
                        color: SHAREHARMONY_PALETTE.textSecondary
                    }
                },
                y: {
                    min: yMin,
                    max: yMax,
                    beginAtZero: false,
                    display: false,
                    ticks: {
                        stepSize: yStep,
                        font: { size: 10 }
                    },
                    grid: { color: SHAREHARMONY_PALETTE.bgLighter }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index',
                axis: 'x'
            }
        }
    });
}

function renderWinFrequencyChart(currentData) {
    const ctx = document.getElementById('winFrequencyChart');
    if (!ctx) return;

    const displayData = currentData || AppState.currentStatsRounds || AppState.allLotto645Data;
    if (!displayData || displayData.length === 0) return;

    // 1~45 번호별 당첨회수 (메인번호 + 보너스번호 포함)
    const freq = new Array(45).fill(0);
    displayData.forEach(r => {
        if (r.numbers) {
            r.numbers.forEach(n => {
                const num = parseInt(n, 10);
                if (num >= 1 && num <= 45) freq[num - 1]++;
            });
        }
        if (r.bonus) {
            const bn = parseInt(r.bonus, 10);
            if (bn >= 1 && bn <= 45) freq[bn - 1]++;
        }
    });

    const labels = [];
    for (let i = 1; i <= 45; i++) labels.push(String(i));

    const bgColors = labels.map((_, i) => {
        const n = i + 1;
        if (n <= 10) return 'var(--lotto-yellow)';
        if (n <= 20) return 'var(--lotto-blue)';
        if (n <= 30) return 'var(--lotto-red)';
        if (n <= 40) return 'var(--lotto-gray)';
        return 'var(--lotto-green)';
    });

    const rootStyle = getComputedStyle(document.documentElement);
    const resolveColor = (v) => {
        const match = v.match(/var\((--[^)]+)\)/);
        return match ? rootStyle.getPropertyValue(match[1]).trim() : v;
    };
    const resolvedBg = bgColors.map(resolveColor);

    const maxFreq = Math.max(...freq);
    const avgFreq = freq.reduce((a, b) => a + b, 0) / 45;

    if (window.winFreqChart) {
        window.winFreqChart.destroy();
    }

    window.winFreqChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: '당첨회수',
                    data: freq,
                    backgroundColor: resolvedBg,
                    borderColor: resolvedBg.map(c => c),
                    borderWidth: 1,
                    barPercentage: 0.85,
                    categoryPercentage: 0.9
                },
                {
                    label: '평균',
                    data: new Array(45).fill(parseFloat(avgFreq.toFixed(1))),
                    type: 'line',
                    borderColor: '#D96E64',
                    borderWidth: 2,
                    borderDash: [6, 3],
                    pointRadius: 0,
                    fill: false,
                    order: 0
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        title: function (items) {
                            return items[0].label + '번';
                        },
                        label: function () { return null; },
                        afterBody: function (items) {
                            const idx = items[0].dataIndex;
                            const count = freq[idx];
                            const totalCount = freq.reduce((a, b) => a + b, 0);
                            const pct = totalCount > 0 ? (count / totalCount * 100).toFixed(2) : '0.00';
                            return [
                                '출현: ' + count + '회 (보너스공 포함)',
                                '평균: ' + avgFreq.toFixed(2),
                                '비율: ' + pct + '%'
                            ];
                        }
                    }
                }
            },
            scales: {
                x: {
                    display: true,
                    grid: { display: false },
                    ticks: {
                        font: { size: 11 },
                        color: SHAREHARMONY_PALETTE.textSecondary
                    }
                },
                y: {
                    display: true,
                    beginAtZero: true,
                    grid: { color: SHAREHARMONY_PALETTE.bgLighter },
                    ticks: {
                        font: { size: 10 },
                        stepSize: Math.ceil(maxFreq / 10)
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index',
                axis: 'x'
            }
        }
    });
}

function renderNumberFrequencyChart(currentData) {
    const ctx = document.getElementById('numberFrequencyChart');
    if (!ctx) return;

    const displayData = currentData || AppState.currentStatsRounds || AppState.allLotto645Data;
    if (!displayData || displayData.length === 0) return;

    // 1~45 번호별 출현횟수 집계
    const freq = new Array(45).fill(0);
    displayData.forEach(r => {
        if (!r.numbers) return;
        r.numbers.forEach(n => {
            const num = parseInt(n, 10);
            if (num >= 1 && num <= 45) freq[num - 1]++;
        });
    });

    const labels = [];
    for (let i = 1; i <= 45; i++) labels.push(String(i));

    // 동행복권 색상 매핑
    const bgColors = labels.map((_, i) => {
        const n = i + 1;
        if (n <= 10) return 'var(--lotto-yellow)';
        if (n <= 20) return 'var(--lotto-blue)';
        if (n <= 30) return 'var(--lotto-red)';
        if (n <= 40) return 'var(--lotto-gray)';
        return 'var(--lotto-green)';
    });

    // CSS 변수를 실제 색상으로 변환
    const rootStyle = getComputedStyle(document.documentElement);
    const resolveColor = (v) => {
        const match = v.match(/var\((--[^)]+)\)/);
        return match ? rootStyle.getPropertyValue(match[1]).trim() : v;
    };
    const resolvedBg = bgColors.map(resolveColor);

    const maxFreq = Math.max(...freq);
    const avgFreq = freq.reduce((a, b) => a + b, 0) / 45;

    if (window.numberFreqChart) {
        window.numberFreqChart.destroy();
    }

    window.numberFreqChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: '출현횟수',
                    data: freq,
                    backgroundColor: resolvedBg,
                    borderColor: resolvedBg.map(c => c),
                    borderWidth: 1,
                    barPercentage: 0.85,
                    categoryPercentage: 0.9
                },
                {
                    label: '평균',
                    data: new Array(45).fill(parseFloat(avgFreq.toFixed(1))),
                    type: 'line',
                    borderColor: '#4A90D9',
                    borderWidth: 2,
                    borderDash: [6, 3],
                    pointRadius: 0,
                    fill: false,
                    order: 0
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        title: function (items) {
                            return items[0].label + '번';
                        },
                        label: function () { return null; },
                        afterBody: function (items) {
                            const idx = items[0].dataIndex;
                            const count = freq[idx];
                            const totalCount = freq.reduce((a, b) => a + b, 0);
                            const pct = totalCount > 0 ? (count / totalCount * 100).toFixed(2) : '0.00';
                            return [
                                '출현: ' + count + '회',
                                '평균: ' + avgFreq.toFixed(2),
                                '비율: ' + pct + '%'
                            ];
                        }
                    }
                }
            },
            scales: {
                x: {
                    display: true,
                    grid: { display: false },
                    ticks: {
                        font: { size: 11 },
                        color: SHAREHARMONY_PALETTE.textSecondary
                    }
                },
                y: {
                    display: true,
                    beginAtZero: true,
                    grid: { color: SHAREHARMONY_PALETTE.bgLighter },
                    ticks: {
                        font: { size: 10 },
                        stepSize: Math.ceil(maxFreq / 10)
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index',
                axis: 'x'
            }
        }
    });
}

if (typeof window !== "undefined") {
    window.renderMonthlyAverageChart = renderMonthlyAverageChart;
    window.renderWinFrequencyChart = renderWinFrequencyChart;
    window.renderNumberFrequencyChart = renderNumberFrequencyChart;
}


function showResultAnalysisBubble(summaryData, allGames, sortedGroups) {
    const existing = document.querySelector('.apology-overlay');
    if (existing) existing.remove();

    let latestRound = null, latestGames = [], latestWinRound = null;
    for (const [roundStr, games] of sortedGroups) {
        const round = Number(roundStr);
        const wr = AppState.allLotto645Data.find(r => r.round === round);
        if (wr && wr.numbers) { latestRound = round; latestGames = games; latestWinRound = wr; break; }
    }
    /* 미추첨 전용 요약 말풍선 제거(요약 줄 클릭은 추첨 완료 회차에서만 연결) */
    if (!latestRound || !latestWinRound) {
        return;
    }

    const rs = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    latestGames.forEach(g => {
        if (g.numbers) { const r = getLottoRank(g.numbers, latestWinRound.numbers, latestWinRound.bonus); if (r.rank > 0) rs[r.rank]++; }
    });

    const totalGames = latestGames.length;
    const investment = totalGames * 1000;
    const returns = rs[5] * 5000 + rs[4] * 50000;
    const hasHighRank = rs[1] > 0 || rs[2] > 0 || rs[3] > 0;
    const profit = returns - investment;
    const fmt = n => n.toLocaleString();
    const nextRound = latestRound + 1;
    const today = new Date();
    const dateStr = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;

    // 저장 게임 선택 합계(선택1~6 합) 요약
    const pickSums = latestGames.map(g => getGamePickSum(g)).filter(s => s != null && !Number.isNaN(s));
    const pickSumSummaryStr = pickSums.length > 0
        ? `선택 합계: 최소 <b>${Math.min(...pickSums)}</b> ~ 최대 <b>${Math.max(...pickSums)}</b> (평균 <b>${Math.round(pickSums.reduce((a, b) => a + b, 0) / pickSums.length)}</b>)`
        : '';

    const numFreq = {};
    latestGames.forEach(g => { if (g.numbers) g.numbers.forEach(n => { numFreq[n] = (numFreq[n] || 0) + 1; }); });
    const sortedNums = Object.entries(numFreq).sort((a, b) => b[1] - a[1]);
    const topNums = sortedNums.slice(0, 3).map(([n, c]) => `<b>${n}번(${c}/${totalGames}게임)</b>`).join(', ');

    const winNums = [...latestWinRound.numbers].sort((a, b) => a - b);
    const winNumsStr = winNums.join(', ');
    const missedNums = winNums.filter(n => !numFreq[n] || numFreq[n] <= Math.floor(totalGames * 0.1));
    const missedStr = missedNums.map(n => `<b>${n}번(${numFreq[n] || 0}/${totalGames}게임)</b>`).join(', ');

    // 당첨번호 통계 분석
    const winOddCount = winNums.filter(n => n % 2 === 1).length;
    const winEvenCount = 6 - winOddCount;
    const winSeqPairs = countSequentialPairs(winNums);
    const winAC = calculateAC(winNums);
    const { hot: hotNums, cold: coldNums } = getHotColdNumbers();
    const hotSet = new Set(hotNums);
    const winHotCount = winNums.filter(n => hotSet.has(n)).length;
    const winColdCount = 6 - winHotCount;

    // 저장 게임들의 주요 필터 분포 (가장 많이 사용한 홀짝/연속/핫콜/AC)
    const gameOE = {}, gameSeq = {}, gameHC = {}, gameAC = {};
    latestGames.forEach(g => {
        if (!g.numbers) return;
        const s = [...g.numbers].sort((a, b) => a - b);
        const o = s.filter(n => n % 2 === 1).length;
        const oeKey = `홀${o}:짝${6 - o}`;
        gameOE[oeKey] = (gameOE[oeKey] || 0) + 1;
        const sq = countSequentialPairs(s);
        gameSeq[sq] = (gameSeq[sq] || 0) + 1;
        const hc = s.filter(n => hotSet.has(n)).length;
        const hcKey = `핫${hc}:콜${6 - hc}`;
        gameHC[hcKey] = (gameHC[hcKey] || 0) + 1;
        const ac = calculateAC(s);
        gameAC[ac] = (gameAC[ac] || 0) + 1;
    });
    const topOE = Object.entries(gameOE).sort((a, b) => b[1] - a[1])[0];
    const topSeq = Object.entries(gameSeq).sort((a, b) => b[1] - a[1])[0];
    const topHC = Object.entries(gameHC).sort((a, b) => b[1] - a[1])[0];
    const topAC = Object.entries(gameAC).sort((a, b) => b[1] - a[1])[0];

    const resultParts = [];
    for (let r = 1; r <= 5; r++) { if (rs[r] > 0) resultParts.push(`${r}등 ${rs[r]}건`); }
    const resultText = resultParts.length > 0 ? resultParts.join(', ') : '당첨 없음';

    const jst = 'text-align:justify;word-break:keep-all;';

    const overlay = document.createElement('div');
    overlay.className = 'apology-overlay';

    if (hasHighRank) {
        const bestRank = rs[1] > 0 ? 1 : rs[2] > 0 ? 2 : 3;
        overlay.innerHTML = `
        <div class="apology-bubble">
            <button type="button" class="bubble-close-x" aria-label="닫기" onclick="this.closest('.apology-overlay').remove()">×</button>
            <div class="apology-icon">🎉</div>
            <h3>축하드립니다!</h3>
            <p style="${jst}">${latestRound}회 ${totalGames}게임에서 <b>${resultText}</b>!</p>
            ${pickSumSummaryStr ? '<p style="' + jst + 'font-size:var(--bubble-fs-sm);color:var(--color-income,#1565C0);margin:4px 0 6px;font-weight:600;">' + pickSumSummaryStr + '</p>' : ''}
            <p style="${jst}">
                당첨번호 <b>${winNumsStr} + ${latestWinRound.bonus}</b>의 패턴을
                정확히 읽어낸 분석이 빛을 발했습니다.
            </p>
            <p style="${jst}">
                앞으로도 더 정밀한 패턴 분석과 데이터 기반 예측으로
                사용자님의 행운을 지속적으로 이어가겠습니다!
            </p>
            <p style="${jst}font-weight:700;color:var(--color-income,#1565C0);margin-top:14px;">
                ${nextRound}회에서도 좋은 결과 기대해주세요! 🍀
            </p>
            <div class="apology-sign">AI 예측 시스템 올림<br>${dateStr}</div>
            <button type="button" class="apology-close" style="background:linear-gradient(135deg,#1565C0,#42A5F5);" onclick="this.closest('.apology-overlay').remove()">
                고마워, 계속 잘 부탁해! 🍀
            </button>
        </div>`;
    } else {
        // 모드별 게임 수 집계
        const modeCounts = {};
        latestGames.forEach(g => {
            const m = g.gameMode || g['게임선택'] || '기타';
            modeCounts[m] = (modeCounts[m] || 0) + 1;
        });
        const aiCount = (modeCounts['AI추천'] || 0) + (modeCounts['자동'] || 0) + (modeCounts['행운'] || 0) + (modeCounts['BOB'] || 0); /* BOB: 구 기록 집계용 */
        const manualCount = (modeCounts['수동'] || 0);
        const semiCount = (modeCounts['반자동'] || 0);
        const isAllUserPick = aiCount === 0 && totalGames > 0;

        // 모드별 당첨 성적
        const modeRanks = {};
        latestGames.forEach(g => {
            if (!g.numbers) return;
            const m = g.gameMode || g['게임선택'] || '기타';
            if (!modeRanks[m]) modeRanks[m] = { total: 0, wins: { 4: 0, 5: 0 } };
            modeRanks[m].total++;
            const r = getLottoRank(g.numbers, latestWinRound.numbers, latestWinRound.bonus);
            if (r.rank === 4 || r.rank === 5) modeRanks[m].wins[r.rank]++;
        });

        const compTbl = `
            <p style="font-weight:600;margin-top:10px;margin-bottom:4px;font-size:var(--bubble-fs);">📊 당첨조합 vs 선택 비교</p>
            <table class="bubble-data-table">
                <tr>
                    <td>항목</td>
                    <td style="text-align:center;">실제 당첨</td>
                    <td style="text-align:center;">선택 최다</td>
                </tr>
                <tr>
                    <td>홀짝</td>
                    <td style="text-align:center;font-weight:700;">홀${winOddCount}:짝${winEvenCount}</td>
                    <td style="text-align:center;">${topOE ? topOE[0] + '(' + topOE[1] + '회)' : '-'}</td>
                </tr>
                <tr>
                    <td>핫콜</td>
                    <td style="text-align:center;font-weight:700;">핫${winHotCount}:콜${winColdCount}</td>
                    <td style="text-align:center;">${topHC ? topHC[0] + '(' + topHC[1] + '회)' : '-'}</td>
                </tr>
                <tr>
                    <td>연속</td>
                    <td style="text-align:center;font-weight:700;">${winSeqPairs}쌍</td>
                    <td style="text-align:center;">${topSeq ? topSeq[0] + '쌍(' + topSeq[1] + '회)' : '-'}</td>
                </tr>
                <tr>
                    <td>AC값</td>
                    <td style="text-align:center;font-weight:700;">${winAC}</td>
                    <td style="text-align:center;">${topAC ? topAC[0] + '(' + topAC[1] + '회)' : '-'}</td>
                </tr>
            </table>`;

        if (isAllUserPick) {
            // 반자동/수동 전용: 아쉬움 인사 + 선택 결과 분석
            const modeBreakdown = Object.entries(modeCounts)
                .map(([m, c]) => `${m} ${c}게임`).join(', ');
            const modeResultRows = Object.entries(modeRanks).map(([m, d]) => {
                const winParts = [];
                if (d.wins[4] > 0) winParts.push(`4등 ${d.wins[4]}건`);
                if (d.wins[5] > 0) winParts.push(`5등 ${d.wins[5]}건`);
                return `<tr>
                    <td style="font-weight:700;">${m}</td>
                    <td style="text-align:center;">${d.total}게임</td>
                    <td style="text-align:center;">${winParts.length > 0 ? winParts.join(', ') : '-'}</td>
                </tr>`;
            }).join('');

            overlay.innerHTML = `
            <div class="apology-bubble">
                <button type="button" class="bubble-close-x" aria-label="닫기" onclick="this.closest('.apology-overlay').remove()">×</button>
                <div class="apology-icon">😔</div>
                <h3>아쉬운 결과입니다</h3>
                <p style="${jst}">
                    ${latestRound}회에 <b>${modeBreakdown}</b>으로
                    직접 선택하신 ${totalGames}게임의 결과는
                    <b>${resultText}</b>${returns > 0 ? '(당첨금 ' + fmt(returns) + '원)' : ''}이었습니다.
                </p>
                <p style="font-weight:600;margin-top:10px;margin-bottom:4px;font-size:var(--bubble-fs);">🎯 모드별 선택 결과${pickSumSummaryStr ? ' <span style="font-weight:500;font-size:var(--bubble-fs-sm);color:var(--color-income,#1565C0);">' + pickSumSummaryStr + '</span>' : ''}</p>
                <table class="bubble-data-table">
                    <tr>
                        <td>모드</td>
                        <td style="text-align:center;">게임 수</td>
                        <td style="text-align:center;">당첨</td>
                    </tr>
                    ${modeResultRows}
                </table>
                <p style="${jst}">
                    ${totalGames}게임에서 가장 많이 선택하신 번호는
                    ${topNums}이었으나,
                    ${missedStr ? '실제 당첨번호 중 ' + missedStr + '은(는) 거의 선택되지 않았습니다.' : '당첨번호 ' + winNumsStr + '과의 접점이 부족했습니다.'}
                </p>
                ${compTbl}
                <p style="${jst};font-size:var(--bubble-fs-sm);color:var(--color-text-secondary,#334155);">
                    실제 당첨조합은 <b>홀${winOddCount}:짝${winEvenCount}</b>, <b>핫${winHotCount}:콜${winColdCount}</b>,
                    연속 <b>${winSeqPairs}쌍</b>, AC <b>${winAC}</b>였습니다.
                    다음에는 이 패턴을 참고하시면 더 좋은 결과가 있을 것입니다.
                </p>
                <p style="font-weight:600;margin-top:10px;margin-bottom:4px;font-size:var(--bubble-fs);">💡 다음 회차 참고 사항</p>
                <p style="${jst}">
                    ${nextRound}회에서는 홀짝·핫콜 비율과
                    AC값 분포를 참고하시고,
                    AI추천이나 행운모드와 병행하시면
                    더 다양한 조합을 확보하실 수 있습니다.
                </p>
                <p style="${jst}font-weight:700;color:var(--color-accent,#5A6E7A);margin-top:14px;">
                    다음 ${nextRound}회에서는 행운이 함께하길! 🍀
                </p>
                <div class="apology-sign">AI 예측 시스템 올림<br>${dateStr}</div>
                <button type="button" class="apology-close" style="background:linear-gradient(135deg,#5A6E7A,#90A4AE);" onclick="this.closest('.apology-overlay').remove()">
                    알겠어, 다음엔 꼭! 💪
                </button>
            </div>`;
        } else {
            // AI추천/행운 포함: 사과문
            const aiModeParts = [];
            if (modeCounts['AI추천'] || modeCounts['자동']) aiModeParts.push(`AI추천 ${(modeCounts['AI추천'] || 0) + (modeCounts['자동'] || 0)}게임`);
            if (modeCounts['행운']) aiModeParts.push(`행운 ${modeCounts['행운']}게임`);
            if (semiCount > 0) aiModeParts.push(`반자동 ${semiCount}게임`);
            if (manualCount > 0) aiModeParts.push(`수동 ${manualCount}게임`);
            const modeDesc = aiModeParts.join(' · ');

            overlay.innerHTML = `
            <div class="apology-bubble">
                <button type="button" class="bubble-close-x" aria-label="닫기" onclick="this.closest('.apology-overlay').remove()">×</button>
                <div class="apology-icon">🙇</div>
                <h3>사용자님께 진심으로 사과드립니다</h3>
                <p style="${jst}">
                    ${latestRound}회 ${totalGames}게임(${modeDesc})에서
                    <b>${resultText || '당첨 없음'}</b>${returns > 0 ? '(당첨금 ' + fmt(returns) + '원)' : ''}이라는
                    아쉬운 결과를 만들어 드려 정말 죄송합니다.
                </p>
                <p style="font-weight:600;margin-top:10px;margin-bottom:4px;font-size:var(--bubble-fs);">📋 분석 착오 원인${pickSumSummaryStr ? ' <span style="font-weight:500;font-size:var(--bubble-fs-sm);color:var(--color-income,#1565C0);">' + pickSumSummaryStr + '</span>' : ''}</p>
                <p style="${jst}">
                    ${totalGames}게임에서 ${topNums}에 편중 배치한 반면,
                    ${missedStr ? '정작 당첨된 ' + missedStr + '은(는) 거의 선택하지 못한 것은' : '당첨번호 ' + winNumsStr + '의 출현 흐름을 놓친 것은'}
                    저의 명백한 판단 착오였습니다.
                </p>
                ${compTbl}
                <p style="${jst};font-size:var(--bubble-fs-sm);color:var(--color-text-secondary,#334155);">
                    실제 당첨조합은 <b>홀${winOddCount}:짝${winEvenCount}</b>, <b>핫${winHotCount}:콜${winColdCount}</b>,
                    연속 <b>${winSeqPairs}쌍</b>, AC <b>${winAC}</b>였으나,
                    예측에서는 ${topOE ? '<b>' + topOE[0] + '</b>' : ''}${topHC ? ', <b>' + topHC[0] + '</b>' : ''} 조합에
                    집중하여 실제 패턴과의 괴리가 발생했습니다.
                </p>
                <p style="font-weight:600;margin-top:10px;margin-bottom:4px;">📌 앞으로의 계획</p>
                <p style="${jst}">
                    ${nextRound}회에서는 홀짝·핫콜 편향을 줄이고,
                    연속번호와 AC값 분포까지 종합적으로 반영하여
                    보다 균형 잡힌 번호 조합을 제공하겠습니다.
                </p>
                <p style="${jst}font-weight:700;color:#c0392b;margin-top:14px;">
                    다음 ${nextRound}회에는 반드시 설욕하겠습니다! 🔥
                </p>
                <div class="apology-sign">AI 예측 시스템 올림<br>${dateStr}</div>
                <button type="button" class="apology-close" onclick="this.closest('.apology-overlay').remove()">
                    알겠어, 다음엔 잘해 👊
                </button>
            </div>`;
        }
    }

    document.body.appendChild(overlay);
    bindApologyBubblePersistDrag(overlay);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
}

function showGameAnalysisBubble(game, winRound) {
    const existing = document.querySelector('.apology-overlay');
    if (existing) existing.remove();

    const jst = 'text-align:justify;word-break:keep-all;';
    const mode = (game.gameMode === '자동' ? 'AI추천' : game.gameMode) || '기타';
    const setVal = game.set !== undefined ? game.set : game['세트'];
    const setDisp = setVal ? `${setVal}세트 ` : '';
    const nums = game.numbers ? [...game.numbers].sort((a, b) => a - b) : [];
    const numsStr = nums.join(', ');
    const gamePickSum = getGamePickSum(game);
    const pickSumModeSuffix = gamePickSum != null && !Number.isNaN(gamePickSum) ? ` · 선택 합계 <b>${gamePickSum}</b>` : '';

    const overlay = document.createElement('div');
    overlay.className = 'apology-overlay';

    if (!winRound || !winRound.numbers) {
        const pending = buildPendingGameOptionsAndChoiceReason(game);
        const sumParts = getSavedGameRowSummaryParts(game);
        const ballsRowHtml = formatSavedBallsInlineHtml(sumParts.numsSorted);
        const escAttr = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
        overlay.innerHTML = `
        <div class="apology-bubble apology-bubble-pending">
            <button type="button" class="bubble-close-x" aria-label="닫기" onclick="this.closest('.apology-overlay').remove()">×</button>
            <div class="apology-icon" style="text-align:center;">⏳</div>
            <div class="bubble-pending-bar">
                <span class="bubble-pending-round">${sumParts.roundNum} 회</span>
                <span class="bubble-pending-detail" title="${escAttr(sumParts.detailLineText)}">${sumParts.detailLineText}</span>
                <span class="bubble-balls-inline" style="flex-shrink:0;">${ballsRowHtml}</span>
            </div>
            <p style="${jst}margin:0 0 10px;">아직 추첨이 진행되지 않았습니다. 아래는 저장된 <b>회차·옵션</b>과 <b>이번 게임</b>에 대한 설명입니다.</p>
            <div style="background:var(--color-bg-light,#F0F2F5);border-radius:8px;padding:8px 10px;border:1px solid var(--color-border,#D5DAE0);">
                <p style="margin:0 0 6px;font-weight:700;font-size:var(--bubble-fs-title);color:var(--color-text-primary,#1A1A1A);">저장 옵션</p>
                ${pending.optionsTable}
            </div>
            <div style="background:var(--color-bg-light,#F0F2F5);border-radius:8px;padding:8px 10px;border:1px solid var(--color-border,#D5DAE0);margin-top:8px;">
                ${pending.choiceReasonHtml}
            </div>
            <p style="${jst}font-weight:700;color:var(--color-income,#1565C0);margin-top:12px;">행운을 빕니다! 🍀</p>
            <div style="display:flex;justify-content:center;">
            <button type="button" class="apology-close" onclick="this.closest('.apology-overlay').remove()">확인 👍</button>
            </div>
        </div>`;
        document.body.appendChild(overlay);
        bindApologyBubblePersistDrag(overlay);
        overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
        return;
    }

    const winNums = [...winRound.numbers].sort((a, b) => a - b);
    const bonus = winRound.bonus;
    const result = getLottoRank(nums, winNums, bonus);
    const matchCount = result.matchCount;
    const rank = result.rank;
    const isBonusMatch = result.isBonusMatch;

    const matched = nums.filter(n => winNums.includes(n));
    const missed = nums.filter(n => !winNums.includes(n));
    const notPicked = winNums.filter(n => !nums.includes(n));

    const gameOdd = nums.filter(n => n % 2 === 1).length;
    const gameEven = 6 - gameOdd;
    const winOdd = winNums.filter(n => n % 2 === 1).length;
    const winEven = 6 - winOdd;
    const gameSeq = countSequentialPairs(nums);
    const winSeq = countSequentialPairs(winNums);
    const gameAC = calculateAC(nums);
    const winAC = calculateAC(winNums);
    const { hot: hotNums } = getHotColdNumbers();
    const hotSet = new Set(hotNums);
    const gameHot = nums.filter(n => hotSet.has(n)).length;
    const gameCold = 6 - gameHot;
    const winHot = winNums.filter(n => hotSet.has(n)).length;
    const winCold = 6 - winHot;

    const gameNumSum = nums.length ? nums.reduce((a, n) => a + n, 0) : 0;
    const winNumSum = winNums.length ? winNums.reduce((a, n) => a + n, 0) : 0;

    const compTbl = `
        <table class="bubble-data-table">
            <tr>
                <td>항목</td>
                <td style="text-align:center;">내 선택</td>
                <td style="text-align:center;">당첨번호</td>
            </tr>
            <tr>
                <td>홀짝</td>
                <td style="text-align:center;font-weight:700;">홀${gameOdd}:짝${gameEven}</td>
                <td style="text-align:center;">홀${winOdd}:짝${winEven}</td>
            </tr>
            <tr>
                <td>핫콜</td>
                <td style="text-align:center;font-weight:700;">핫${gameHot}:콜${gameCold}</td>
                <td style="text-align:center;">핫${winHot}:콜${winCold}</td>
            </tr>
            <tr>
                <td>연속</td>
                <td style="text-align:center;font-weight:700;">${gameSeq}쌍</td>
                <td style="text-align:center;">${winSeq}쌍</td>
            </tr>
            <tr>
                <td>AC값</td>
                <td style="text-align:center;font-weight:700;">${gameAC}</td>
                <td style="text-align:center;">${winAC}</td>
            </tr>
            <tr>
                <td>번호합계</td>
                <td style="text-align:center;font-weight:700;">${gameNumSum}</td>
                <td style="text-align:center;">${winNumSum}</td>
            </tr>
        </table>`;

    const rankColors = { 1: '#FBC400', 2: '#69C8F2', 3: '#FF7272', 4: '#AAAAAA', 5: '#B0D840' };
    const rankNames = { 1: '1등', 2: '2등', 3: '3등', 4: '4등', 5: '5등' };
    const prizeMap = { 1: '1등 당첨!', 2: '2등 당첨!', 3: '3등 당첨!', 4: '4등 (50,000원)', 5: '5등 (5,000원)' };
    const isWin = rank >= 1 && rank <= 5;
    const isHighWin = rank >= 1 && rank <= 3;

    let icon, title, titleColor, btnStyle, btnText;
    if (isHighWin) {
        icon = '🎉'; title = `축하합니다! ${rankNames[rank]}!`; titleColor = rankColors[rank];
        btnStyle = `background:linear-gradient(135deg,${rankColors[rank]},#FFD54F);`;
        btnText = '감사합니다! 🎊';
    } else if (isWin) {
        icon = '🎯'; title = `${rankNames[rank]} 당첨!`; titleColor = rankColors[rank];
        btnStyle = 'background:linear-gradient(135deg,#66BB6A,#A5D6A7);';
        btnText = '다음엔 더 높이! 💪';
    } else {
        icon = '📊'; title = '결과 분석'; titleColor = '#3a4a6a';
        btnStyle = 'background:linear-gradient(135deg,#78909C,#B0BEC5);';
        btnText = '다음 기회에! 🍀';
    }

    const winDrawBallsRow = formatWinningDrawBallsRowHtml(winNums, bonus);

    let matchedBalls = '';
    if (nums.length > 0 && winNums.length > 0) {
        matchedBalls = nums.map(n => {
            const isMatch = winNums.includes(n);
            const cls = getBallColorClass(n);
            const hitCls = isMatch ? ' bubble-ball-draw-border' : ' bubble-ball-miss';
            return `<span class="stat-ball stat-ball--sm ${cls}${hitCls}" style="margin:0 2px;">${n}</span>`;
        }).join('');
        if (isBonusMatch) {
            const b = Number(bonus);
            const bCls = getBallColorClass(b);
            matchedBalls += `<span style="margin:0 2px;font-size:var(--bubble-fs-sm);color:var(--color-text-muted,#5A6872);">+</span>`;
            matchedBalls += `<span class="stat-ball stat-ball--sm ${bCls} bubble-ball-draw-border" style="margin:0 2px;">${b}</span>`;
        }
    }

    let resultSection = '';
    if (isHighWin) {
        resultSection = `
            <p style="${jst}">
                ${game.round}회 추첨 <b>당첨번호</b>(위 표시)와 숫자 <b>${matchCount}개</b>가 일치하여 <b style="color:${rankColors[rank]};">${prizeMap[rank]}</b>
            </p>
            <p style="${jst}">
                <b>${mode}</b> 모드${pickSumModeSuffix}의 분석이
                빛을 발한 결과입니다. 앞으로도 이 패턴 분석을 더욱 발전시켜
                꾸준한 행운을 이어가겠습니다!
            </p>`;
    } else if (isWin) {
        resultSection = `
            <p style="${jst}">
                ${game.round}회 추첨 <b>당첨번호</b>(위 표시)와 숫자 <b>${matchCount}개</b>가 일치하여 <b style="color:${rankColors[rank]};">${prizeMap[rank]}</b>
            </p>
            <p style="${jst}">
                축하합니다! 일치한 번호 <b>${matched.join(', ')}</b>를 잘 짚어냈습니다.
                ${notPicked.length > 0 ? '아쉽게 놓친 <b>' + notPicked.join(', ') + '</b>까지 맞췄다면 더 높은 등수였을 겁니다.' : ''}
            </p>`;
    } else {
        resultSection = `
            <p style="${jst}">
                ${game.round}회 추첨 <b>당첨번호</b>(위 표시)와 숫자 <b>${matchCount}개</b> 일치${matchCount > 0 ? ' (번호: <b>' + matched.join(', ') + '</b>)' : ''}로
                아쉽게 당첨되지 못했습니다.
            </p>
            <p style="${jst}">
                ${missed.length > 0 ? '선택한 <b>' + missed.join(', ') + '</b>이(가) 벗어났고, ' : ''}당첨번호
                중 <b>${notPicked.join(', ')}</b>을(를) 포함하지 못했습니다.
            </p>`;
    }

    overlay.innerHTML = `
    <div class="apology-bubble">
        <button type="button" class="bubble-close-x" aria-label="닫기" onclick="this.closest('.apology-overlay').remove()">×</button>
        <div class="apology-icon">${icon}</div>
        <h3 style="color:${titleColor};">${title}</h3>
        <p style="${jst}font-size:var(--bubble-fs-sm);color:var(--color-text-muted,#5A6872);margin:2px 0 8px;">
            ${game.round}회 ${setDisp}${game.game}게임 · <b>${mode}</b>
        </p>
        <p style="${jst}font-size:var(--bubble-fs-sm);font-weight:600;color:var(--color-text-secondary,#334155);margin:0 0 4px;">선택번호</p>
        <div style="text-align:center;margin:8px 0 6px;line-height:2;display:flex;flex-wrap:wrap;justify-content:center;align-items:center;">${matchedBalls}</div>
        <p style="${jst}font-size:var(--bubble-fs-sm);font-weight:600;color:var(--color-text-secondary,#334155);margin:0 0 4px;">당첨번호</p>
        <div style="text-align:center;margin:0 0 12px;line-height:2;display:flex;flex-wrap:wrap;justify-content:center;align-items:center;">${winDrawBallsRow}</div>
        ${resultSection}
        <p style="font-weight:600;margin-top:10px;margin-bottom:2px;">📊 내 선택 vs 당첨번호</p>
        ${compTbl}
        <button type="button" class="apology-close" style="${btnStyle}" onclick="this.closest('.apology-overlay').remove()">
            ${btnText}
        </button>
    </div>`;

    document.body.appendChild(overlay);
    bindApologyBubblePersistDrag(overlay);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
}

function showGoldenAiAnalysis() {
    const existing = document.querySelector('.golden-analysis-overlay');
    if (existing) existing.remove();

    const jst = 'text-align:justify;word-break:keep-all;';
    const nextRound = (AppState && AppState.allLotto645Data && AppState.allLotto645Data[0])
        ? AppState.allLotto645Data[0].round + 1 : '??';
    let nextDrawDate = '';
    let nextDrawDateFull = '';
    if (AppState && AppState.allLotto645Data && AppState.allLotto645Data[0] && AppState.allLotto645Data[0].date) {
        const lastDate = typeof AppState.allLotto645Data[0].date === 'string'
            ? new Date(AppState.allLotto645Data[0].date)
            : new Date((AppState.allLotto645Data[0].date - 25569) * 86400000);
        if (!isNaN(lastDate.getTime())) {
            lastDate.setDate(lastDate.getDate() + 7);
            const yyyy = lastDate.getFullYear();
            const mm = String(lastDate.getMonth() + 1).padStart(2, '0');
            const dd = String(lastDate.getDate()).padStart(2, '0');
            nextDrawDate = `${yyyy}-${mm}-${dd}`;
            nextDrawDateFull = nextDrawDate;
        }
    }
    const baseTc = typeof buildStatFilterTrustContextFromDom === 'function' ? buildStatFilterTrustContextFromDom() : null;
    const tc = AppState._luckyStatTrustContext;
    const sumRange = baseTc ? baseTc.sumRange : getSumRange();
    const hotForMeta = (baseTc && baseTc.hot && baseTc.hot.length)
        ? baseTc.hot
        : (typeof getHotColdSetsForOptionFilter === 'function' ? getHotColdSetsForOptionFilter().hot : []);
    const hotSet = new Set(hotForMeta);
    const trustTipEsc = escapeHtmlAttribute(getStatFilterTrustScoreTooltip());
    const divOffGolden = AppState._luckyDiversifyRunOffset != null ? AppState._luckyDiversifyRunOffset : 0;

    let gamesHtml = '';

    let displayIdx = 0;
    for (let i = 0; i < 5; i++) {
        const nums = (AppState.setSelectedBalls && AppState.setSelectedBalls[i]) || [];
        if (nums.length !== 6) continue;
        const sorted = [...nums].sort((a, b) => a - b);
        const slot1 = i + 1;
        const tmapG = AppState._harmonyTrustSlotByGame;
        const trustSlot = (tmapG && tmapG[slot1 - 1] >= 1 && tmapG[slot1 - 1] <= 5)
            ? tmapG[slot1 - 1]
            : slot1;
        /* 행운번호 칩과 동일: 풀 검증 슬롯에 맞는 ctx(게임 칸 번호와 다를 수 있음) */
        let ctxI = (AppState._harmonyTrustCtxBySlot && AppState._harmonyTrustCtxBySlot[trustSlot])
            ? AppState._harmonyTrustCtxBySlot[trustSlot]
            : null;
        if (!ctxI && typeof buildStatFilterTrustContextForGameSlot === 'function') {
            const modeBtnS = document.getElementById('modeBtn' + slot1);
            const offRaw = modeBtnS && modeBtnS.dataset.diversifyOffset != null ? parseInt(modeBtnS.dataset.diversifyOffset, 10) : NaN;
            const off = Number.isNaN(offRaw) ? divOffGolden : offRaw;
            ctxI = buildStatFilterTrustContextForGameSlot(slot1, off);
        } else if (!ctxI) {
            ctxI = tc;
        }
        const score = ctxI ? calculateStatFilterTrustScore(sorted, ctxI) : calculateAIProbability(sorted);

        displayIdx++;
        const sum = sorted.reduce((a, b) => a + b, 0);
        const oddCnt = sorted.filter(n => n % 2 !== 0).length;
        const hotCnt = sorted.filter(n => hotSet.has(n)).length;
        const seqPairs = countSequentialPairs(sorted);
        const ac = calculateAC(sorted);

        const ballsHtml = sorted.map(n =>
            `<span class="stat-ball stat-ball--sm ${getBallColorClass(n)}" style="margin:0 2px;">${n}</span>`
        ).join('');

        gamesHtml += `
            <div class="golden-game-row">
                <div class="golden-game-row-grid">
                    <span class="golden-game-label" style="font-weight:700;color:var(--color-text-primary,#1A1A1A);white-space:nowrap;font-size:var(--bubble-fs-sm);">GAME ${displayIdx}</span>
                    <div class="golden-game-right">
                        <div class="golden-game-topline">
                            <span class="golden-game-balls-wrap" style="flex:1;min-width:0;">${ballsHtml}</span>
                            <span class="stat-filter-trust-tip-host" style="font-size:var(--bubble-fs-sm);font-weight:700;color:var(--color-text-secondary,#334155);white-space:nowrap;flex-shrink:0;" data-trust-tooltip="${trustTipEsc}">${score}%</span>
                        </div>
                        <div class="golden-game-meta golden-game-meta-stats">
                            <span>합계 ${sum}</span><span class="golden-game-meta-sep" aria-hidden="true"></span>
                            <span>홀짝 ${oddCnt}:${6 - oddCnt}</span><span class="golden-game-meta-sep" aria-hidden="true"></span>
                            <span>핫콜 ${hotCnt}:${6 - hotCnt}</span><span class="golden-game-meta-sep" aria-hidden="true"></span>
                            <span>연속 ${seqPairs}</span><span class="golden-game-meta-sep" aria-hidden="true"></span>
                            <span>AC ${ac}</span>
                        </div>
                    </div>
                </div>
            </div>`;

    }
    if (displayIdx === 0) {
        gamesHtml = `<div style="${jst}padding:16px;color:var(--color-text-muted,#5A6872);font-size:var(--bubble-fs);">100% 신뢰도 조합이 없습니다.</div>`;
    }

    const overlay = document.createElement('div');
    overlay.className = 'golden-analysis-overlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:10000;display:flex;align-items:center;justify-content:center;';
    overlay.innerHTML = `
        <div class="golden-analysis-panel">
            <button type="button" class="bubble-close-x" aria-label="닫기" onclick="this.closest('.golden-analysis-overlay').remove()">×</button>
            <div class="golden-analysis-title">
                ✨ AI 추천 번호 분석 제${nextRound}회${nextDrawDate ? `&nbsp;&nbsp;<span class="golden-analysis-date-bracket">[&nbsp;<span style="color:var(--color-expense,#C62828);">${nextDrawDateFull}</span> <span style="font-weight:400;color:var(--color-text-secondary,#334155);">추첨 예정</span>&nbsp;]</span>` : ''}
            </div>
            ${gamesHtml}
            <div class="golden-analysis-foot golden-analysis-foot-inline" aria-label="분석 항목 안내">
                <span class="golden-foot-inline-line">
                    <span aria-hidden="true">📖</span>
                    합계<span class="golden-foot-em">${sumRange.start}~${sumRange.end}</span>·6개합
                    <span class="golden-foot-sep">|</span>홀짝·핫콜<span class="golden-foot-muted">(통계)</span>
                    <span class="golden-foot-sep">|</span>연속<span class="golden-foot-muted">(연번)</span>
                    <span class="golden-foot-sep">|</span>AC<span class="golden-foot-muted">(0~10)</span>
                    <span class="golden-foot-sep">|</span><span class="stat-filter-trust-tip-host golden-foot-trust-lbl" data-trust-tooltip="${trustTipEsc}">신뢰도·칸별</span>
                </span>
            </div>
            <div class="golden-actions">
                <button type="button" id="goldenSaveImageBtn">📋 이미지 복사</button>
                <button type="button" id="goldenClosePanelBtn" class="golden-close-panel-btn">창 닫기</button>
            </div>
        </div>`;

    document.body.appendChild(overlay);

    const goldenPanel = overlay.querySelector('.golden-analysis-panel');
    if (goldenPanel) {
        goldenPanel.dataset.bubblePosKey = 'golden-analysis-panel';
        requestAnimationFrame(function () {
            if (applySavedBubblePosition(goldenPanel, 'golden-analysis-panel')) {
                goldenPanel.style.margin = '0';
            }
            attachDraggableBubble(goldenPanel);
        });
    }

    const goldenClosePanelBtn = overlay.querySelector('#goldenClosePanelBtn');
    if (goldenClosePanelBtn) {
        goldenClosePanelBtn.addEventListener('click', function () {
            overlay.remove();
        });
    }

    const goldenSaveImageBtn = overlay.querySelector('#goldenSaveImageBtn');
    if (goldenSaveImageBtn) goldenSaveImageBtn.addEventListener('click', function () {
        const contentEl = overlay.querySelector('.golden-analysis-panel');
        if (!contentEl) return;
        const runCapture = function () {
            if (typeof captureAndSave !== 'function') {
                alert('이미지 복사를 사용할 수 없습니다. 페이지를 새로고침 후 다시 시도하세요.');
                return;
            }
            captureAndSave(contentEl);
        };
        import('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js').catch(function () {}).then(function () {
            if (typeof html2canvas === 'undefined') {
                const script = document.createElement('script');
                script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
                script.onload = runCapture;
                document.head.appendChild(script);
            } else {
                runCapture();
            }
        });
    });

    AppState._luckyStatTrustContext = null;
}

function showPerfectBobAnalysis(totalCollected, topFive) {
    const existing = document.querySelector('.perfect-bob-analysis-overlay');
    if (existing) existing.remove();
    const nextRound = (AppState && AppState.allLotto645Data && AppState.allLotto645Data[0])
        ? AppState.allLotto645Data[0].round + 1 : '??';
    const tc = AppState._luckyStatTrustContext;
    const trustTipEsc = escapeHtmlAttribute(getStatFilterTrustScoreTooltip());
    let rowsHtml = '';
    for (let i = 0; i < topFive.length; i++) {
        const item = topFive[i];
        const sorted = [...item.numbers].sort(function (a, b) { return a - b; });
        const ballsHtml = sorted.map(function (n) {
            return `<span class="stat-ball stat-ball--sm ${getBallColorClass(n)}" style="margin:0 2px;">${n}</span>`;
        }).join('');
        rowsHtml += `
            <div class="golden-game-row">
                <div class="golden-game-row-grid">
                    <span class="golden-game-label" style="font-weight:700;color:var(--color-text-primary,#1A1A1A);white-space:nowrap;font-size:var(--bubble-fs-sm);">G${i + 1}</span>
                    <div class="golden-game-right">
                        <div class="golden-game-topline">
                            <span class="golden-game-balls-wrap" style="flex:1;min-width:0;">${ballsHtml}</span>
                            <span class="stat-filter-trust-tip-host" style="font-size:var(--bubble-fs-sm);font-weight:700;color:var(--color-text-secondary,#334155);white-space:nowrap;flex-shrink:0;" data-trust-tooltip="${trustTipEsc}">${item.trust}%</span>
                        </div>
                        <div class="golden-game-meta" style="font-size:0.65rem;color:var(--color-text-muted,#5A6872);">풀 내 순위 ${item.poolRank}위 / 수집 ${totalCollected}게임</div>
                    </div>
                </div>
            </div>`;
    }
    const overlay = document.createElement('div');
    overlay.className = 'perfect-bob-analysis-overlay golden-analysis-overlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:10000;display:flex;align-items:center;justify-content:center;';
    overlay.innerHTML = `
        <div class="golden-analysis-panel">
            <button type="button" class="bubble-close-x" aria-label="닫기" onclick="this.closest('.perfect-bob-analysis-overlay').remove()">×</button>
            <div class="golden-analysis-title" style="font-size:1rem;">
                Perfect · BoB <span style="font-weight:600;color:var(--color-text-secondary,#334155);">제${nextRound}회</span>
            </div>
            <p style="margin:10px 0 14px;font-size:var(--bubble-fs-sm);line-height:1.5;color:var(--color-text-primary,#1A1A1A);">
                행운번호와 동일한 생성·필터·신뢰도 100% 게이트·핫/평균합(harmony) 정렬로 <b>${totalCollected}게임</b>을 뽑아 <code style="font-size:0.85em;">LottoBoB.json</code>에 저장했습니다.
                행운번호와 같이 <b>합 중복 회피 후 상위 5</b>를 고르고, 부족 시 협력 생성으로 보충해 1~5게임에 반영했습니다. 게임모드는 <b>BoB</b>입니다.
            </p>
            ${rowsHtml}
            <div class="golden-analysis-foot" style="margin-top:12px;font-size:var(--bubble-fs-sm);color:var(--color-text-muted,#5A6872);">
                번호저장 시 기존과 같이 <b>Lotto023</b>에만 기록됩니다.
            </div>
            <div class="golden-actions">
                <button type="button" id="perfectBobSaveImageBtn">📋 이미지 복사</button>
                <button type="button" id="perfectBobClosePanelBtn" class="golden-close-panel-btn">창 닫기</button>
            </div>
        </div>`;
    document.body.appendChild(overlay);
    const perfectBobClosePanelBtn = overlay.querySelector('#perfectBobClosePanelBtn');
    if (perfectBobClosePanelBtn) {
        perfectBobClosePanelBtn.addEventListener('click', function () {
            overlay.remove();
        });
    }
    const perfectBobSaveImageBtn = overlay.querySelector('#perfectBobSaveImageBtn');
    if (perfectBobSaveImageBtn) {
        perfectBobSaveImageBtn.addEventListener('click', function () {
            const contentEl = overlay.querySelector('.golden-analysis-panel');
            if (!contentEl) return;
            const runCapture = function () {
                if (typeof captureAndSave !== 'function') {
                    alert('이미지 복사를 사용할 수 없습니다. 페이지를 새로고침 후 다시 시도하세요.');
                    return;
                }
                captureAndSave(contentEl);
            };
            import('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js').catch(function () {}).then(function () {
                if (typeof html2canvas === 'undefined') {
                    const script = document.createElement('script');
                    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
                    script.onload = runCapture;
                    document.head.appendChild(script);
                } else {
                    runCapture();
                }
            });
        });
    }
    overlay.querySelectorAll('.stat-filter-trust-tip-host').forEach(function (el) {
        if (typeof applyStatFilterTrustTooltip === 'function') applyStatFilterTrustTooltip(el);
    });
    const panel = overlay.querySelector('.golden-analysis-panel');
    if (panel && typeof applySavedBubblePosition === 'function') {
        panel.dataset.bubblePosKey = 'perfect-bob-analysis-panel';
        requestAnimationFrame(function () {
            if (applySavedBubblePosition(panel, 'perfect-bob-analysis-panel')) panel.style.margin = '0';
            if (typeof attachDraggableBubble === 'function') attachDraggableBubble(panel);
        });
    }

}

function showRoundInfoBubble(htmlContent, targetElement) {
    // 기존 말풍선 제거
    const existingBubble = document.querySelector('.round-info-bubble');
    if (existingBubble) {
        existingBubble.remove();
    }

    const bubble = document.createElement('div');
    bubble.className = 'round-info-bubble';
    bubble.dataset.bubblePosKey = 'round-info-bubble';
    bubble.innerHTML = htmlContent;

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'bubble-close-x';
    closeBtn.setAttribute('aria-label', '닫기');
    closeBtn.innerHTML = '×';
    closeBtn.onclick = () => bubble.remove();
    bubble.prepend(closeBtn);

    document.body.appendChild(bubble);

    // 위치 계산
    const rect = targetElement.getBoundingClientRect();
    const bubbleRect = bubble.getBoundingClientRect();

    if (!applySavedBubblePosition(bubble, 'round-info-bubble')) {
        // 화면 오른쪽을 벗어나는지 확인
        let left = window.scrollX + rect.left - bubbleRect.width - 15;
        if (left < 0) {
            left = window.scrollX + rect.right + 15;
            bubble.classList.add('arrow-right');
        }

        let top = window.scrollY + rect.top + (rect.height / 2) - (bubbleRect.height / 2);
        if (top < 0) top = 10;

        if (top + bubbleRect.height > window.innerHeight) {
            top = window.innerHeight - bubbleRect.height - 10;
        }

        bubble.style.left = `${left}px`;
        bubble.style.top = `${top}px`;
    }

    bubble.style.opacity = '1';
    attachDraggableBubble(bubble);

    // 외부 클릭 시 닫기
    const closeOnOutsideClick = (e) => {
        if (!bubble.contains(e.target) && e.target !== targetElement) {
            bubble.remove();
            document.removeEventListener('click', closeOnOutsideClick, true);
        }
    };

    setTimeout(() => {
        document.addEventListener('click', closeOnOutsideClick, true);
    }, 100);
}

function showAnalysisBubble(gameIndex, numbers, score, event) {
    // 기존 말풍선 제거
    const existing = document.querySelector('.analysis-bubble');
    if (existing) existing.remove();

    const bubble = document.createElement('div');
    bubble.className = 'analysis-bubble';
    bubble.dataset.bubblePosKey = 'analysis-bubble';

    const anchorRect = event.currentTarget.getBoundingClientRect();
    bubble.style.width = 'clamp(260px, 70vw, 320px)';

    const sorted = [...numbers].sort((a, b) => a - b);
    const sum = sorted.reduce((a, b) => a + b, 0);
    const odd = sorted.filter(n => n % 2 !== 0).length;
    const ac = calculateAC(sorted);
    let seqPairs = 0;
    for (let i = 0; i < sorted.length - 1; i++) { if (sorted[i + 1] === sorted[i] + 1) seqPairs++; }
    let hotCnt = 0;
    if (AppState && AppState.allLotto645Data) {
        const freq = {};
        AppState.allLotto645Data.slice(0, 20).forEach(r => r.numbers.forEach(n => { freq[n] = (freq[n] || 0) + 1; }));
        const entries = Object.entries(freq).sort((a, b) => b[1] - a[1]);
        const hotSet = new Set(entries.slice(0, LOTTO645_HOT_COUNT).map(e => parseInt(e[0])));
        hotCnt = sorted.filter(n => hotSet.has(n)).length;
    }
    const nextRound = (AppState && AppState.allLotto645Data) ? AppState.allLotto645Data[0].round + 1 : '??';

    let analysisText = `✨ 추천번호: ${sorted.join(', ')}\n`;
    analysisText += `합계 ${sum} | 홀짝 ${odd}:${6 - odd} | 핫콜 ${hotCnt}:${6 - hotCnt} | 연속 ${seqPairs} | AC ${ac}\n`;
    analysisText += `🏆 AI 분석 신뢰도: ${score}%`;

    const modeBtn = document.getElementById(`modeBtn${gameIndex}`);
    const modeTag = modeBtn ? modeBtn.dataset.mode : '';
    const isAiMode = modeTag === 'auto';
    const isLuckyStyleBubble = modeTag === 'lucky';

    let ticketImageHtml = '';
    // 티켓 이미지 또는 번호 리스트 HTML 생성
    if (isAiMode && score >= 90) { // AI추천이면서 90점 이상일 때만 티켓 렌더링
        drawPremiumTicket(numbers);
        const canvas = document.getElementById('premiumTicketCanvas');
        if (canvas) {
            const ticketImgData = canvas.toDataURL('image/png');
            ticketImageHtml = `
                <div style="margin: 0 0 10px 0; text-align: center; overflow:hidden; border-radius:8px;">
                    <img src="${ticketImgData}" style="width: 100%; display:block; box-shadow: 0 2px 8px rgba(0,0,0,0.08);" alt="Lucky Ticket">
                </div>`;
        }
    } else {
        ticketImageHtml = `
            <div class="ab-ticket-row">
                ${numbers.sort((a, b) => a - b).map(n => `<span class="stat-ball stat-ball--sm ${getBallColorClass(n)}" style="margin:0 3px;">${n}</span>`).join('')}
            </div>
        `;
    }

    // 팝업 내부 HTML (말풍선 통일 스타일)
    bubble.innerHTML = `
        <button type="button" class="bubble-close-x" aria-label="닫기" onclick="this.closest('.analysis-bubble').remove()">×</button>
        <div class="ab-header">
            <div class="ab-title">
                ${isAiMode ? '✨ AI 정밀 분석' : (isLuckyStyleBubble ? '📊 번호 상세 분석 (행운)' : '📊 번호 상세 분석')}
            </div>
        </div>
        <div class="ab-content">
            ${ticketImageHtml}
            <div class="ab-score-area stat-filter-trust-tip-host">
                <span class="ab-score-label">AI 분석 신뢰도</span>
                <div style="display:flex; align-items:center; gap:8px; margin-top:4px;">
                    <div style="width:80px; height:6px; background:var(--color-border, #D5DAE0); border-radius:3px; overflow:hidden;">
                        <div style="width:${score}%; height:100%; background:var(--color-table-header, #455A64); border-radius:3px;"></div>
                    </div>
                    <span class="ab-score-val">${score}%</span>
                </div>
            </div>
            <div class="ab-grid">
                <div class="ab-stat-item"><span class="ab-stat-label">합계</span> <span class="ab-stat-val">${sum}</span></div>
                <div class="ab-stat-item"><span class="ab-stat-label">홀:짝</span> <span class="ab-stat-val">${odd}:${6 - odd}</span></div>
                <div class="ab-stat-item"><span class="ab-stat-label">핫:콜</span> <span class="ab-stat-val">${hotCnt}:${6 - hotCnt}</span></div>
                <div class="ab-stat-item"><span class="ab-stat-label">연속쌍</span> <span class="ab-stat-val">${seqPairs}</span></div>
                <div class="ab-stat-item"><span class="ab-stat-label">복잡도(AC)</span> <span class="ab-stat-val">${ac}</span></div>
                <div class="ab-stat-item ab-stat-item--accent"><span class="ab-stat-label">구간진입</span> <span class="ab-stat-val">적정</span></div>
            </div>
        </div>
        <div class="ab-footer">
            <button type="button" id="copyBubbleBtn" class="ab-btn">결과 공유하기 📤</button>
        </div>
    `;

    document.body.appendChild(bubble);
    var abScoreHost = bubble.querySelector('.stat-filter-trust-tip-host');
    applyStatFilterTrustTooltip(abScoreHost);
    requestAnimationFrame(function () {
        if (!applySavedBubblePosition(bubble, 'analysis-bubble')) {
            bubble.style.position = 'absolute';
            bubble.style.left = (window.scrollX + anchorRect.left - 150) + 'px';
            bubble.style.top = (window.scrollY + anchorRect.top - 320) + 'px';
        }
        attachDraggableBubble(bubble);
    });

    const copyBtn = bubble.querySelector('#copyBubbleBtn');
    copyBtn.onclick = () => {
        navigator.clipboard.writeText(analysisText).then(() => {
            alert('분석 결과가 복사되었습니다!\n카톡이나 문자에 붙여넣어 공유해보세요. 🍀');
            bubble.remove();
        });
    };

    // 외부 클릭 시 닫기
    const closeOnOutside = (e) => {
        if (!bubble.contains(e.target) && e.target !== event.currentTarget) {
            bubble.remove();
            document.removeEventListener('click', closeOnOutside);
        }
    };
    setTimeout(() => document.addEventListener('click', closeOnOutside), 10);
}

function showNavBubble(anchor, message, duration = 3000) {
    const existing = document.getElementById('navBubbleTooltip');
    if (existing) existing.remove();

    const bubble = document.createElement('div');
    bubble.id = 'navBubbleTooltip';
    bubble.dataset.bubblePosKey = 'nav-bubble-tooltip';
    bubble.textContent = message;
    Object.assign(bubble.style, {
        position: 'fixed',
        background: SHAREHARMONY_PALETTE.primaryNavy,
        color: '#fff',
        padding: '6px 12px',
        borderRadius: '6px',
        fontSize: '0.78rem',
        fontWeight: '600',
        whiteSpace: 'nowrap',
        zIndex: '9999',
        boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
        opacity: '0',
        transition: 'opacity 0.2s ease',
        pointerEvents: 'auto',
        cursor: 'grab'
    });
    document.body.appendChild(bubble);

    requestAnimationFrame(function () {
        const rect = anchor.getBoundingClientRect();
        if (!applySavedBubblePosition(bubble, 'nav-bubble-tooltip')) {
            bubble.style.left = `${rect.left + rect.width / 2 - bubble.offsetWidth / 2}px`;
            bubble.style.top = `${rect.bottom + 6}px`;
        }
        attachDraggableBubble(bubble);
        bubble.style.opacity = '1';
    });

    setTimeout(() => {
        bubble.style.opacity = '0';
        setTimeout(() => bubble.remove(), 200);
    }, duration);
}

if (typeof window !== "undefined") {
    window.showResultAnalysisBubble = showResultAnalysisBubble;
    window.showGameAnalysisBubble = showGameAnalysisBubble;
    window.showGoldenAiAnalysis = showGoldenAiAnalysis;
    window.showPerfectBobAnalysis = showPerfectBobAnalysis;
    window.showRoundInfoBubble = showRoundInfoBubble;
    window.showAnalysisBubble = showAnalysisBubble;
    window.showNavBubble = showNavBubble;
}


function renderNumberGrid() {
    const centerPanel = document.querySelector('.center-panel');
    if (!centerPanel || !AppState || !AppState.winStats || AppState.winStats.length === 0) {
        return;
    }

    // 현재 정렬 방식에 따라 데이터 정렬
    let sortedStats = [...AppState.winStats];

    // 통계공의 정렬 방식에 따라 선택공 그리드 정렬
    const appMap = AppState.appearanceStatsMap || new Map();
    const winMap = AppState.winStatsMap || new Map();
    const seqMap = AppState.consecutiveStatsMap || new Map();
    if (AppState.currentSort === 'win-desc') {
        sortedStats.sort((a, b) => (b.count - a.count) || ((appMap.get(b.number) || 0) - (appMap.get(a.number) || 0)) || ((seqMap.get(b.number) || 0) - (seqMap.get(a.number) || 0)) || (b.number - a.number));
    } else if (AppState.currentSort === 'win-asc') {
        sortedStats.sort((a, b) => (a.count - b.count) || ((appMap.get(a.number) || 0) - (appMap.get(b.number) || 0)) || ((seqMap.get(a.number) || 0) - (seqMap.get(b.number) || 0)) || (a.number - b.number));
    } else if (AppState.currentSort === 'appearance-desc') {
        sortedStats = Array.from(appMap.entries())
            .map(([number, count]) => ({ number, count }))
            .sort((a, b) => (b.count - a.count) || ((winMap.get(b.number) || 0) - (winMap.get(a.number) || 0)) || ((seqMap.get(b.number) || 0) - (seqMap.get(a.number) || 0)) || (b.number - a.number));
    } else if (AppState.currentSort === 'appearance-asc') {
        sortedStats = Array.from(appMap.entries())
            .map(([number, count]) => ({ number, count }))
            .sort((a, b) => (a.count - b.count) || ((winMap.get(a.number) || 0) - (winMap.get(b.number) || 0)) || ((seqMap.get(a.number) || 0) - (seqMap.get(b.number) || 0)) || (a.number - b.number));
    } else if (AppState.currentSort === 'number-desc') {
        sortedStats.sort((a, b) => b.number - a.number);
    } else if (AppState.currentSort === 'number-asc') {
        sortedStats.sort((a, b) => a.number - b.number);
    } else if (AppState.currentSort === 'seq') {
        sortedStats.sort((a, b) => a.number - b.number);
    } else {
        sortedStats.sort((a, b) => a.number - b.number);
    }

    let sectionBox = document.getElementById('numberGridSection');
    if (!sectionBox) {
        sectionBox = document.createElement('div');
        sectionBox.id = 'numberGridSection';
        sectionBox.className = 'stats-box';
        const row = document.getElementById('gridGameRow');
        if (row) {
            row.insertBefore(sectionBox, row.firstChild);
        } else {
            const inner = centerPanel.querySelector('.panel-inner') || centerPanel;
            const optFilter = inner.querySelector('#optionFilterBox');
            inner.insertBefore(sectionBox, optFilter ? optFilter.nextSibling : inner.firstChild);
        }
    }

    // 선택공 라벨 제거: 헤더 컨테이너 미사용 (기존에 있으면 제거)
    const existingHeader = document.getElementById('numberGridHeaderContainer');
    if (existingHeader) existingHeader.remove();

    let gridContainer = sectionBox.querySelector('.number-grid-container');
    if (!gridContainer) {
        gridContainer = document.createElement('div');
        gridContainer.className = 'number-grid-container';
        sectionBox.appendChild(gridContainer);
    } else {
        gridContainer.innerHTML = '';
    }

    // 테두리 표시 대상 번호 결정
    let highlightNumbers;
    const isNumberSort = AppState.currentSort === 'number-asc' || AppState.currentSort === 'number-desc';
    const isConsecutiveAsc = AppState.currentSort === 'consecutive-asc';
    if (isNumberSort) {
        const latestRound = (AppState.allLotto645Data && AppState.allLotto645Data.length > 0)
            ? AppState.allLotto645Data.reduce((max, r) => r.round > max.round ? r : max, AppState.allLotto645Data[0])
            : null;
        highlightNumbers = latestRound
            ? new Set(latestRound.numbers.map(n => parseInt(n, 10)))
            : new Set();
    } else if (isConsecutiveAsc) {
        highlightNumbers = new Set(sortedStats.slice(0, 6).map(s => s.number));
    } else {
        const appMapForTop6 = AppState.appearanceStatsMap || new Map();
        const seqMapForTop6 = AppState.consecutiveStatsMap || new Map();
        const sortedByWin = [...sortedStats].sort((a, b) =>
            (b.count - a.count) || ((appMapForTop6.get(b.number) || 0) - (appMapForTop6.get(a.number) || 0)) || ((seqMapForTop6.get(b.number) || 0) - (seqMapForTop6.get(a.number) || 0)) || (b.number - a.number)
        );
        highlightNumbers = new Set(sortedByWin.slice(0, 6).map(s => s.number));
    }

    // 정렬된 순서대로 선택공 그리드에 배치
    // 모든 번호(1~45)가 포함되도록 보장
    const allNumbersSet = new Set(Array.from({ length: 45 }, (_, i) => i + 1));
    const sortedNumbers = sortedStats.map(s => s.number);

    // 정렬된 번호에 없는 번호들 추가 (통계가 0인 경우)
    allNumbersSet.forEach(num => {
        if (!sortedNumbers.includes(num)) {
            sortedNumbers.push(num);
        }
    });

    // 정렬된 순서대로 그리드에 배치
    sortedNumbers.forEach((number) => {
        // 해당 번호의 통계 정보 찾기
        const stat = sortedStats.find(s => s.number === number) || { number, count: 0 };

        const ball = createStatBall(stat.number, 22, '0.8rem');
        ball.style.cursor = 'pointer';
        ball.style.transition = 'transform 0.2s ease, box-shadow 0.2s ease, border 0.2s ease';

        if (highlightNumbers.has(stat.number)) {
            ball.style.border = '0.2px solid ' + SHAREHARMONY_PALETTE.black;
            ball.style.boxShadow = '0 0 0 1px rgba(0, 0, 0, 0.1)';
        }

        // 공 클릭 이벤트 추가
        ball.addEventListener('click', () => {
            if (currentSelectingGameIndex !== null && currentSelectingBallIndex !== null) {
                // 수동 모드 선택 중이면 번호 할당
                handleSelectBallClick(stat.number);
            } else {
                handleBallClick(stat.number);
            }
        });

        ball.addEventListener('mouseenter', () => {
            ball.style.transform = 'scale(1.1)';
            ball.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';
        });
        ball.addEventListener('mouseleave', () => {
            ball.style.transform = 'scale(1)';
            if (highlightNumbers.has(stat.number)) {
                ball.style.boxShadow = '0 0 0 1px rgba(0, 0, 0, 0.1)';
            } else {
                ball.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.1)';
            }
        });
        gridContainer.appendChild(ball);
    });
}

function renderStatsList() {
    const statsList = document.getElementById('statsList');
    if (!statsList || !AppState) return;
    const seqType = AppState.seqFilterType;
    const isSeqMode = seqType != null && (seqType === 1 || seqType === 2 || seqType === 3);
    if (isSeqMode) {
        const rounds = AppState.currentStatsRounds || AppState.allLotto645Data || [];
        if (!rounds || rounds.length === 0) {
            statsList.innerHTML = '<p>데이터가 없습니다.</p>';
            return;
        }
        const seqStats = computeConsecutiveStats(rounds, seqType);
        if (seqStats.length === 0) {
            statsList.innerHTML = '<p>해당 조건의 연속 번호가 없습니다.</p>';
            return;
        }
        seqStats.sort((a, b) => {
            const na = a.numbers || [], nb = b.numbers || [];
            for (let i = 0; i < Math.min(na.length, nb.length); i++) {
                if (na[i] !== nb[i]) return na[i] - nb[i];
            }
            return na.length - nb.length;
        });
        const totalRounds = rounds.length;
        statsList.innerHTML = '';
        seqStats.forEach(entry => {
            const statLine = document.createElement('div');
            statLine.className = 'stat-line stat-line-seq';
            statLine.style.display = 'flex';
            statLine.style.alignItems = 'center';
            statLine.style.justifyContent = 'space-between';
            statLine.style.gap = '8px';
            statLine.style.padding = '0 8px';
            statLine.style.height = '24px';
            statLine.style.minHeight = '24px';
            statLine.style.boxSizing = 'border-box';
            statLine.style.cursor = 'pointer';
            statLine.title = '클릭 시 해당 회차를 우측 패널에 표시';
            const leftPart = document.createElement('div');
            leftPart.style.display = 'flex';
            leftPart.style.alignItems = 'center';
            leftPart.style.flex = '1';
            leftPart.style.minWidth = '0';
            leftPart.style.overflow = 'hidden';
            leftPart.style.gap = '4px';
            (entry.numbers || []).forEach(n => {
                const ball = createStatBall(n, 22, '0.8rem');
                leftPart.appendChild(ball);
            });
            const rightPart = document.createElement('div');
            rightPart.style.display = 'flex';
            rightPart.style.alignItems = 'center';
            rightPart.style.gap = '4px';
            rightPart.style.flexShrink = '0';
            const pct = totalRounds > 0 ? ((entry.count / totalRounds) * 100).toFixed(1) : '0.0';
            rightPart.innerHTML = '<span style="font-weight:700;">' + entry.count + '</span><span>회</span> <span style="color:' + SHAREHARMONY_PALETTE.textSecondary + ';">(' + pct + '%)</span>';
            statLine.appendChild(leftPart);
            statLine.appendChild(rightPart);
            statLine.addEventListener('click', () => {
                AppState.selectedSeqRounds = entry.rounds;
                renderViewNumbersFromSelectedRounds(entry.rounds);
            });
            statsList.appendChild(statLine);
        });
        return;
    }
    if (!AppState.winStats || AppState.winStats.length === 0) return;

    // 현재 정렬 방식에 따라 데이터 정렬
    let sortedStats = [...AppState.winStats];
    let percentageMap = AppState.winPercentageCache || new Map();

    const slAppMap = AppState.appearanceStatsMap || new Map();
    const slWinMap = AppState.winStatsMap || new Map();
    const slSeqMap = AppState.consecutiveStatsMap || calculateConsecutiveStats(AppState.currentStatsRounds || AppState.allLotto645Data);
    if (AppState.currentSort === 'win-desc') {
        sortedStats.sort((a, b) => (b.count - a.count) || ((slAppMap.get(b.number) || 0) - (slAppMap.get(a.number) || 0)) || ((slSeqMap.get(b.number) || 0) - (slSeqMap.get(a.number) || 0)) || (b.number - a.number));
        percentageMap = AppState.winPercentageCache || new Map();
    } else if (AppState.currentSort === 'win-asc') {
        sortedStats.sort((a, b) => (a.count - b.count) || ((slAppMap.get(a.number) || 0) - (slAppMap.get(b.number) || 0)) || ((slSeqMap.get(a.number) || 0) - (slSeqMap.get(b.number) || 0)) || (a.number - b.number));
        percentageMap = AppState.winPercentageCache || new Map();
    } else if (AppState.currentSort === 'appearance-desc') {
        sortedStats = Array.from(slAppMap.entries())
            .map(([number, count]) => ({ number, count }))
            .sort((a, b) => (b.count - a.count) || ((slWinMap.get(b.number) || 0) - (slWinMap.get(a.number) || 0)) || ((slSeqMap.get(b.number) || 0) - (slSeqMap.get(a.number) || 0)) || (b.number - a.number));
        percentageMap = AppState.appearancePercentageCache || new Map();
    } else if (AppState.currentSort === 'appearance-asc') {
        sortedStats = Array.from(slAppMap.entries())
            .map(([number, count]) => ({ number, count }))
            .sort((a, b) => (a.count - b.count) || ((slWinMap.get(a.number) || 0) - (slWinMap.get(b.number) || 0)) || ((slSeqMap.get(a.number) || 0) - (slSeqMap.get(b.number) || 0)) || (a.number - b.number));
        percentageMap = AppState.appearancePercentageCache || new Map();
    } else if (AppState.currentSort === 'number-desc') {
        sortedStats.sort((a, b) => b.number - a.number);
        percentageMap = AppState.winPercentageCache || new Map();
    } else if (AppState.currentSort === 'number-asc') {
        sortedStats.sort((a, b) => a.number - b.number);
        percentageMap = AppState.winPercentageCache || new Map();
    } else if (AppState.currentSort === 'consecutive-asc') {
        const rounds = AppState.currentStatsRounds || AppState.allLotto645Data || [];
        const totalRounds = rounds.length;
        sortedStats = Array.from({ length: 45 }, (_, i) => i + 1)
            .map(number => ({ number, count: slSeqMap.get(number) || 0 }))
            .sort((a, b) => (b.count - a.count) || (a.number - b.number));
        percentageMap = new Map(sortedStats.map(s => [s.number, totalRounds > 0 ? (s.count / totalRounds * 100) : 0]));
    } else {
        sortedStats.sort((a, b) => b.number - a.number);
        percentageMap = AppState.winPercentageCache || new Map();
    }

    // 리스트 렌더링
    statsList.innerHTML = '';
    sortedStats.forEach(stat => {
        const statLine = document.createElement('div');
        statLine.className = 'stat-line';
        statLine.style.display = 'flex';
        statLine.style.alignItems = 'center';
        statLine.style.gap = '8px';
        statLine.style.padding = '0 8px';
        statLine.style.height = '24px';
        statLine.style.minHeight = '24px';
        statLine.style.boxSizing = 'border-box';

        // 공
        const ball = createStatBall(stat.number, 22, '0.8rem');

        // 통계 정보 (우측 정렬)
        const statInfo = document.createElement('div');
        statInfo.style.marginLeft = 'auto';
        statInfo.style.display = 'flex';
        statInfo.style.alignItems = 'center';
        statInfo.style.gap = '8px';
        statInfo.style.fontSize = '0.9em';

        const count = document.createElement('span');
        count.style.color = SHAREHARMONY_PALETTE.textPrimary;
        count.textContent = `${stat.count}`;

        const countUnit = document.createElement('span');
        countUnit.style.color = SHAREHARMONY_PALETTE.textPrimary;
        countUnit.style.fontWeight = '700';
        countUnit.textContent = '회';

        const percentage = percentageMap.get(stat.number) || 0;
        const percent = document.createElement('span');
        percent.style.color = SHAREHARMONY_PALETTE.textSecondary;
        percent.textContent = `(${percentage.toFixed(2)}%)`;

        statInfo.appendChild(count);
        statInfo.appendChild(countUnit);
        statInfo.appendChild(percent);

        statLine.appendChild(ball);
        statLine.appendChild(statInfo);
        statsList.appendChild(statLine);
    });
}

function renderViewNumbersList(baseData) {
    if (!AppState) AppState = {};
    AppState.currentViewNumbersBaseData = baseData;
    const viewNumbersList = document.getElementById('viewNumbersList');
    if (!viewNumbersList) return;

    let listData = baseData || AppState.currentStatsRounds || AppState.allLotto645Data;

    if (!listData || listData.length === 0) {
        viewNumbersList.innerHTML = '<p>데이터가 없습니다.</p>';
        updateAverageSumDisplay([]);
        return;
    }

    viewNumbersList.innerHTML = '';

    const INITIAL_DISPLAY_COUNT = 50;

    // 합계값 필터: 1 이상일 때만 적용(0·비움 = 전체)
    const rawSum = AppState.resultFilters && AppState.resultFilters.sumValue;
    const sumFilter = (rawSum != null && rawSum > 0) ? rawSum : null;
    let filtered = listData;
    if (sumFilter != null) {
        filtered = filtered.filter(r => getRoundSum(r) === sumFilter);
    }

    const sortOrder = (AppState.resultFilters && AppState.resultFilters.sortOrder) || 'desc';
    let sortedRounds;
    if (sortOrder === 'asc') {
        sortedRounds = [...filtered].sort((a, b) => a.round - b.round);
    } else {
        sortedRounds = [...filtered].sort((a, b) => b.round - a.round);
    }

    AppState.currentViewRounds = sortedRounds;

    if (sortedRounds.length === 0) {
        viewNumbersList.innerHTML = '<p>필터 조건에 해당하는 회차가 없습니다.</p>';
        updateAverageSumDisplay(listData);
        return;
    }

    // 초기 렌더링 (최대 50개)
    const initialBatch = sortedRounds.slice(0, INITIAL_DISPLAY_COUNT);
    initialBatch.forEach(round => {
        viewNumbersList.appendChild(createRoundLineElement(round));
    });

    // 나머지 데이터는 백그라운드(requestAnimationFrame)에서 점진적 렌더링
    if (sortedRounds.length > INITIAL_DISPLAY_COUNT) {
        let currentIndex = INITIAL_DISPLAY_COUNT;
        const CHUNK_SIZE = 30; // 30개씩 끊어서 렌더링

        function renderNextChunk() {
            if (currentIndex >= sortedRounds.length) return;

            const fragment = document.createDocumentFragment();
            const nextIndex = Math.min(currentIndex + CHUNK_SIZE, sortedRounds.length);

            for (let i = currentIndex; i < nextIndex; i++) {
                fragment.appendChild(createRoundLineElement(sortedRounds[i]));
            }
            viewNumbersList.appendChild(fragment);
            currentIndex = nextIndex;

            if (currentIndex < sortedRounds.length) {
                // 다음 프레임에 계속 렌더링 (UI 블로킹 방지)
                requestAnimationFrame(renderNextChunk);
            }
        }

        // 초기 렌더링 직후 살짝 지연 후 백그라운드 렌더링 시작
        setTimeout(() => requestAnimationFrame(renderNextChunk), 50);
    }

    updateAverageSumDisplay(listData);
}

function renderStats(lotto645Data) {
    const statsList = document.getElementById('statsList');
    const viewNumbersList = document.getElementById('viewNumbersList');

    if (!statsList || !viewNumbersList) {
        return;
    }

    // renderStats는 초기 렌더링용으로 전체 원본 데이터 사용
    // 날짜 필터링은 updateStatsByDateRange 함수에서만 적용
    // 중요: 원본 데이터(AppState.allLotto645Data)는 절대 변경하지 않음

    if (!AppState || !AppState.winStats || AppState.winStats.length === 0) {
        statsList.innerHTML = '<p>통계 데이터가 없습니다.</p>';
        return;
    }

    // 통계 리스트 렌더링
    renderStatsList();

    // 선택공 그리드 렌더링
    renderNumberGrid();

    // 회차 정보 표시 (원본 데이터 기준)
    const roundStatsList = document.getElementById('roundStatsList');
    if (roundStatsList && AppState.allLotto645Data && AppState.allLotto645Data.length > 0) {
        const originalData = AppState.allLotto645Data;
        const minRound = 1;
        const maxRound = AppState.latestRoundApi != null ? AppState.latestRoundApi : originalData[0].round;
        const rangeLabel = AppState.latestRoundApi != null ? ' (동행복권 최신)' : '';
        roundStatsList.innerHTML = `
            <div class="stats-box">
                <div class="stats-section">
                    <div class="stat-label">회차 범위</div>
                    <div class="stat-value">${minRound}회 ~ ${maxRound}회${rangeLabel}</div>
                </div>
                <div class="stats-section" style="margin-top: 8px;">
                    <div class="stat-label">총 회차</div>
                    <div class="stat-value">${originalData.length}회</div>
                </div>
            </div>
        `;
    }

    // 회차별 당첨번호: Lotto645.xlsx에서만 읽은 데이터만 표시 (sumFilterRound 적용)
    const displayData = AppState.allLotto645Data || lotto645Data;
    renderViewNumbersList(displayData);

    // 중앙 패널 업데이트: 선택공 그리드 렌더링
    renderNumberGrid();
}

function updateStatsByDateRange() {
    // console.log('[updateStatsByDateRange] Called');

    const rangeType = document.querySelector('input[name="rangeType"]:checked')?.value || 'round';

    let startRound, endRound;

    if (rangeType === 'round') {
        const startInput = document.getElementById('startRound');
        const endInput = document.getElementById('endRound');

        if (!startInput || !endInput) return;

        const sVal = startInput.value.trim();
        const eVal = endInput.value.trim();

        if (!sVal || !eVal) {
            alert('조회할 회차 범위를 입력해주세요.');
            return;
        }

        startRound = parseInt(sVal, 10);
        endRound = parseInt(eVal, 10);

        if (isNaN(startRound) || isNaN(endRound)) {
            alert('회차는 숫자로 입력해주세요.');
            return;
        }

    } else { // date — 조회기간 yy/mm/dd 검증
        const startDateInput = document.getElementById('startDate');
        const endDateInput = document.getElementById('endDate');

        if (!startDateInput || !endDateInput) return;

        let startDateValue = startDateInput.value.trim();
        let endDateValue = endDateInput.value.trim();

        if (!startDateValue || !endDateValue) {
            alert('조회할 기간을 입력해주세요.');
            return;
        }

        // 8자리, 00000000, yyyy-mm-dd, yyyy/mm/dd → yy/mm/dd 치환
        const normStart = normalizeToYYMMDD(startDateValue);
        if (normStart !== null) {
            startDateInput.value = normStart;
            startDateValue = normStart;
        }
        const normEnd = normalizeToYYMMDD(endDateValue);
        if (normEnd !== null) {
            endDateInput.value = normEnd;
            endDateValue = normEnd;
        }

        const startCheck = validateYYMMDDInput(startDateValue);
        if (!startCheck.valid) {
            alert(startCheck.message || '시작일을 yy/mm/dd 형식으로 입력해 주세요.');
            return;
        }
        const endCheck = validateYYMMDDInput(endDateValue);
        if (!endCheck.valid) {
            alert(endCheck.message || '종료일을 yy/mm/dd 형식으로 입력해 주세요.');
            return;
        }

        startRound = findRoundFromDateInput(startDateValue, true);
        endRound = findRoundFromDateInput(endDateValue, false);

        if (startRound === null || endRound === null) {
            alert('입력한 기간에 해당하는 회차를 찾을 수 없습니다.');
            return;
        }
    }


    if (startRound > endRound) {
        alert('시작회차가 종료회차보다 클 수 없습니다.');
        return;
    }

    let filteredData = [];
    // 회차 범위 필터링
    filteredData = AppState.allLotto645Data.filter(r => r.round >= startRound && r.round <= endRound);

    if (filteredData.length === 0) {
        console.warn('[Lotto] No data found for the given range.');
        alert('해당 조건의 데이터가 없습니다.');
        // 빈 데이터로 갱신
        AppState.currentStatsRounds = [];
        updateCurrentStats(); // 통계 초기화
        renderStatsList();
        renderNumberGrid();
        renderViewNumbersList([]);
        updateRoundRangeDisplay();
        if (typeof applySumMeanBandToFilterInputs === 'function') applySumMeanBandToFilterInputs([]);
        return;
    }

    // 상태 업데이트
    AppState.selectedSeqRounds = null;
    const seqFilterEl = document.getElementById('seqFilter');
    if (seqFilterEl) seqFilterEl.value = 'none';
    AppState.seqFilterType = null;
    if (AppState.currentSort === 'seq') {
        AppState.currentSort = 'consecutive-asc';
        if (typeof updateSortButtons === 'function') updateSortButtons('seq');
    }

    AppState.currentStatsRounds = filteredData;

    // 통계 재계산
    AppState.winStatsMap = calculateWinStats(filteredData);
    AppState.winStats = Array.from(AppState.winStatsMap.entries())
        .map(([number, count]) => ({ number, count }))
        .sort((a, b) => a.number - b.number);

    AppState.appearanceStatsMap = calculateAppearanceStats(filteredData);
    AppState.consecutiveStatsMap = calculateConsecutiveStats(filteredData);

    const winPercentageMap = calculatePercentageStats(AppState.winStatsMap, filteredData.length);
    AppState.winPercentageCache = winPercentageMap;

    const appearancePercentageMap = calculatePercentageStats(AppState.appearanceStatsMap, filteredData.length);
    AppState.appearancePercentageCache = appearancePercentageMap;

    AppState.avgPercentageCache = winPercentageMap;

    const avgCount = filteredData.length > 0
        ? filteredData.reduce((sum, round) => sum + round.numbers.length, 0) / (filteredData.length * 6)
        : 0;
    AppState.avgCountCache = avgCount;

    // UI 업데이트
    updateCurrentStats();
    renderStatsList();
    renderNumberGrid();
    renderViewNumbersList(filteredData);
    updateRoundRangeDisplay();

    // 옵션필터: 조회한 회차 구간(시작~종료) 통계 반영 (100회 슬라이스는 AI추천 생성 시에만 적용)
    extractAndApplyFilters(filteredData);

    // 차트 업데이트: 필터링된 데이터 기반으로 렌더링
    if (typeof renderMonthlyAverageChart === 'function') {
        renderMonthlyAverageChart(filteredData);
    }
    if (typeof renderNumberFrequencyChart === 'function') {
        renderNumberFrequencyChart(filteredData);
    }
    if (typeof renderWinFrequencyChart === 'function') {
        renderWinFrequencyChart(filteredData);
    }

    // 우측 패널 합계값: 기본 0(필터 없음). 최신 회차 합으로 자동 채우지 않음.
    if (filteredData.length > 0) {
        const sumValEl = document.getElementById('resultSumValue');
        if (sumValEl) {
            if (!AppState.resultFilters) AppState.resultFilters = {};
            const v = parseInt(String(sumValEl.value).trim(), 10);
            AppState.resultFilters.sumValue = (Number.isNaN(v) || v <= 0) ? null : v;
            renderViewNumbersList(filteredData);
        }
    }
}

function updateRoundDisplay() {
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    const startRoundInput = document.getElementById('startRound');
    const endRoundInput = document.getElementById('endRound');
    const startRoundDateSpan = document.getElementById('startRoundDate');
    const endRoundDateSpan = document.getElementById('endRoundDate');

    if (!startDateInput || !endDateInput || !startRoundInput || !endRoundInput) {
        return;
    }

    // Sync from date to round
    if (document.activeElement === startDateInput || document.activeElement === endDateInput) {
        const startRound = findRoundFromDateInput(startDateInput.value, true);
        if (startRound) startRoundInput.value = startRound;

        const endRound = findRoundFromDateInput(endDateInput.value, false);
        if (endRound) endRoundInput.value = endRound;
    }

    // Sync from round to date
    if (document.activeElement === startRoundInput || document.activeElement === endRoundInput) {
        const startDate = convertRoundToDate(startRoundInput.value);
        if (startDate) startDateInput.value = startDate;

        const endDate = convertRoundToDate(endRoundInput.value);
        if (endDate) endDateInput.value = endDate;
    }

    // Update date spans for rounds
    const startDateForRound = convertRoundToDate(startRoundInput.value);
    if (startRoundDateSpan) startRoundDateSpan.textContent = startDateForRound ? `(${startDateForRound})` : '';

    const endDateForRound = convertRoundToDate(endRoundInput.value);
    if (endRoundDateSpan) endRoundDateSpan.textContent = endDateForRound ? `(${endDateForRound})` : '';
}

function updateRoundRangeDisplay() {
    updateRoundDisplay();
    const roundStatsList = document.getElementById('roundStatsList');
    const data = AppState.currentStatsRounds || AppState.allLotto645Data;

    if (roundStatsList && data && data.length > 0 && AppState.allLotto645Data) {
        const minRound = data[data.length - 1].round;
        const maxRound = data[0].round;
        const total = data.length;
        const latest = AppState.allLotto645Data[0].round;
        const rangeLabel = (maxRound === latest) ? ' (최신)' : '';

        roundStatsList.innerHTML = `
            <div class="stats-box">
                <div class="stats-section">
                    <div class="stat-label">선택 범위</div>
                    <div class="stat-value">${minRound}회 ~ ${maxRound}회${rangeLabel}</div>
                </div>
                <div class="stats-section" style="margin-top: 8px;">
                    <div class="stat-label">선택 회차수</div>
                    <div class="stat-value">${total}회</div>
                </div>
            </div>
        `;
    }
}

function updateResultFilterAvg() {
    var vals = AppState.chartEndRoundValues;
    if (!vals) return;

    var listData = AppState.currentViewNumbersBaseData || AppState.currentStatsRounds || AppState.allLotto645Data;
    updateAverageSumDisplay(listData);
    if (listData && listData.length > 0 && typeof extractAndApplyFilters === 'function') {
        extractAndApplyFilters(listData);
    }
}

function createRoundLineElement(round) {
    const roundLine = document.createElement('div');
    roundLine.className = 'round-number-line';
    roundLine.style.display = 'flex';
    roundLine.style.alignItems = 'center';
    roundLine.style.justifyContent = 'space-between';
    roundLine.style.gap = '8px';
    roundLine.style.marginBottom = '0';
    roundLine.style.padding = '0 8px';
    roundLine.style.height = '24px';
    roundLine.style.minHeight = '24px';
    roundLine.style.boxSizing = 'border-box';
    const roundInfo = document.createElement('span');
    roundInfo.style.fontWeight = '400';
    roundInfo.style.fontSize = '0.85em';
    roundInfo.style.minWidth = '100px';
    roundInfo.style.color = SHAREHARMONY_PALETTE.textPrimary;
    roundInfo.style.opacity = '1';
    roundInfo.style.display = 'flex';
    roundInfo.style.alignItems = 'center';
    roundInfo.style.gap = '4px';
    roundInfo.style.flexShrink = '0';
    roundInfo.style.whiteSpace = 'nowrap';
    const roundNumber = document.createElement('span');
    roundNumber.textContent = String(round.round).padStart(4, '0');
    const roundUnit = document.createElement('span');
    roundUnit.style.fontWeight = '700';
    roundUnit.textContent = '회';
    let formattedDate = '';
    if (round.date != null && round.date !== '') {
        let dateObj = null;
        const strVal = String(round.date).trim();
        if (typeof round.date === 'number' || /^\d{5,}$/.test(strVal)) {
            const serial = typeof round.date === 'number' ? round.date : parseInt(strVal, 10);
            if (!isNaN(serial) && serial >= 1) {
                const utcMs = (serial - 25569) * 86400 * 1000;
                dateObj = new Date(utcMs);
            }
        } else {
            dateObj = parseDate(strVal);
        }
        if (dateObj && dateObj instanceof Date && !isNaN(dateObj.getTime())) {
            formattedDate = formatDateYYMMDD(dateObj);
        } else {
            const str = String(round.date);
            const dateParts = str.split('-');
            if (dateParts.length === 3) {
                const y = dateParts[0].length >= 2 ? dateParts[0].slice(-2) : dateParts[0];
                const m = dateParts[1].padStart(2, '0');
                const d = dateParts[2].padStart(2, '0');
                formattedDate = `${y}/${m}/${d}`;
            } else {
                formattedDate = str;
            }
        }
    }
    const sum = round.numbers.reduce((acc, num) => acc + (num || 0), 0);
    const sumDisplay = document.createElement('span');
    sumDisplay.className = 'round-sum-display';
    sumDisplay.textContent = `[ ${sum.toString().padStart(3, '0')} ] `;
    sumDisplay.style.fontSize = '0.85em';
    sumDisplay.style.color = SHAREHARMONY_PALETTE.error;
    sumDisplay.style.fontWeight = 'bold';
    const dateSpan = document.createElement('span');
    dateSpan.className = 'round-date-display';
    dateSpan.textContent = formattedDate;
    const minMaxSpan = document.createElement('span');
    minMaxSpan.className = 'round-minmax-display';
    minMaxSpan.style.fontSize = '0.78em';
    minMaxSpan.style.color = SHAREHARMONY_PALETTE.textPrimary;
    minMaxSpan.style.fontFamily = "'Courier New', Courier, monospace";
    minMaxSpan.style.whiteSpace = 'nowrap';
    const rv = AppState.chartRoundValuesMap && AppState.chartRoundValuesMap[round.round];
    if (rv) {
        const mn = rv.min != null ? (rv.min).toFixed(1) : '-';
        const av = rv.avg != null ? (rv.avg).toFixed(1) : '-';
        const mx = rv.max != null ? (rv.max).toFixed(1) : '-';
        minMaxSpan.textContent = `(${mn}/${av}/${mx})`;
    }

    roundInfo.appendChild(roundNumber);
    roundInfo.appendChild(roundUnit);
    roundInfo.appendChild(dateSpan);
    roundInfo.appendChild(minMaxSpan);
    roundInfo.appendChild(sumDisplay);
    const ballsRow = document.createElement('div');
    ballsRow.className = 'round-line-balls-row';
    const ballsCap = document.createElement('div');
    ballsCap.className = 'round-line-balls-cap';
    const nums = (round.numbers || []).map(n => parseInt(n, 10)).filter(n => !isNaN(n)).sort((a, b) => a - b);
    const runs = getConsecutiveRuns(nums, 2);
    const seqSet = new Set(runs.flat());
    round.numbers.forEach(num => {
        const ball = createStatBall(num, 22, '0.8rem');
        if (seqSet.has(parseInt(num, 10))) {
            ball.classList.add('ball-seq3');
        }
        ballsCap.appendChild(ball);
    });
    ballsRow.appendChild(ballsCap);
    const slot7 = document.createElement('div');
    slot7.className = 'round-line-slot7';
    if (round.bonus && round.bonus > 0) {
        const plusEl = document.createElement('span');
        plusEl.className = 'round-line-slot7-plus';
        plusEl.textContent = '+';
        const bonusHost = document.createElement('div');
        bonusHost.className = 'round-line-slot7-ball';
        const bonusBall = createStatBall(round.bonus, 22, '0.8rem');
        bonusHost.appendChild(bonusBall);
        slot7.appendChild(plusEl);
        slot7.appendChild(bonusHost);
    } else {
        slot7.classList.add('round-line-slot7--empty');
        slot7.setAttribute('aria-hidden', 'true');
    }
    ballsRow.appendChild(slot7);
    roundLine.appendChild(roundInfo);
    roundLine.appendChild(ballsRow);

    // 클릭 시 상세 정보 모달 표시
    roundLine.style.cursor = 'pointer';
    roundLine.addEventListener('click', function (event) {
        if (typeof loadAndShowLottoRound === 'function') {
            loadAndShowLottoRound(round.round, event.currentTarget);
        }
    });

    return roundLine;
}

if (typeof window !== "undefined") {
    window.renderNumberGrid = renderNumberGrid;
    window.renderStatsList = renderStatsList;
    window.renderViewNumbersList = renderViewNumbersList;
    window.renderStats = renderStats;
    window.updateStatsByDateRange = updateStatsByDateRange;
    window.updateRoundDisplay = updateRoundDisplay;
    window.updateRoundRangeDisplay = updateRoundRangeDisplay;
    window.updateResultFilterAvg = updateResultFilterAvg;
    window.createRoundLineElement = createRoundLineElement;
}


function updateCurrentStats() {
    if (!AppState.winStats || AppState.winStats.length === 0) {
        AppState.currentStats = [];
        return;
    }

    AppState.currentStats = AppState.winStats.map(stat => ({
        number: stat.number,
        count: stat.count,
        percentage: AppState.avgPercentageCache
            ? (AppState.avgPercentageCache.get(stat.number) || 0)
            : 0
    }));
}

function renderViewNumbersFromSelectedRounds(roundNumbers) {
    const viewNumbersList = document.getElementById('viewNumbersList');
    const allData = AppState.allLotto645Data || [];
    if (!viewNumbersList || !allData.length) return;
    const roundSet = new Set(roundNumbers);
    const roundData = allData.filter(r => roundSet.has(r.round));
    const sortOrder = (AppState.resultFilters && AppState.resultFilters.sortOrder) || 'desc';
    const sorted = sortOrder === 'asc'
        ? [...roundData].sort((a, b) => a.round - b.round)
        : [...roundData].sort((a, b) => b.round - a.round);
    viewNumbersList.innerHTML = '';
    if (sorted.length === 0) {
        viewNumbersList.innerHTML = '<p>선택한 회차가 없습니다.</p>';
        updateAverageSumDisplay([]);
        return;
    }
    sorted.forEach(round => viewNumbersList.appendChild(createRoundLineElement(round)));
    updateAverageSumDisplay(sorted);
}

function updateSortButtons(activeType) {
    const sortNumberBtn = document.getElementById('sortNumber');
    const sortWinBtn = document.getElementById('sortWin');
    const sortAppearanceBtn = document.getElementById('sortAppearance');
    const seqFilterEl = document.getElementById('seqFilter');

    [sortNumberBtn, sortWinBtn, sortAppearanceBtn].forEach(btn => {
        if (btn) btn.classList.remove('active');
    });
    if (seqFilterEl) seqFilterEl.classList.remove('active');

    if (activeType === 'number' && sortNumberBtn) {
        sortNumberBtn.classList.add('active');
    } else if (activeType === 'win' && sortWinBtn) {
        sortWinBtn.classList.add('active');
    } else if (activeType === 'appearance' && sortAppearanceBtn) {
        sortAppearanceBtn.classList.add('active');
    } else if (activeType === 'seq' && seqFilterEl) {
        seqFilterEl.classList.add('active');
    }
}

function updateGameSum(gameIndex, numbers) {
    const sumDisplay = document.getElementById(`gameSum${gameIndex}`);
    if (!sumDisplay) return;

    // 유효한 번호만 필터링하여 합계 계산
    const validNumbers = (numbers || []).filter(n => n && n >= 1 && n <= 45);
    const sum = validNumbers.reduce((acc, num) => acc + num, 0);

    sumDisplay.textContent = `[${sum.toString().padStart(3, '0')}]`;

    // AI 당첨 확률 업데이트
    updateGameProbability(gameIndex, validNumbers);
}

function updateGameProbability(gameIndex, numbers) {
    const probDisplay = document.getElementById(`gameProb${gameIndex}`);
    if (!probDisplay) return;

    if (numbers.length < 6) {
        probDisplay.style.visibility = 'hidden';
        probDisplay.onclick = null;
        probDisplay.style.cursor = 'default';
        probDisplay.removeAttribute('title');
        probDisplay.removeAttribute('data-trust-tooltip');
        return;
    }

    probDisplay.style.visibility = 'visible';
    probDisplay.style.cursor = 'pointer';
    const modeBtn = document.getElementById('modeBtn' + gameIndex);
    const modeTag = modeBtn ? modeBtn.dataset.mode : '';
    let score;
    const tmap = typeof AppState !== 'undefined' && AppState._harmonyTrustSlotByGame ? AppState._harmonyTrustSlotByGame : null;
    const trustSlot = (tmap && tmap[gameIndex - 1] >= 1 && tmap[gameIndex - 1] <= 5)
        ? tmap[gameIndex - 1]
        : gameIndex;
    const snapCtx = typeof AppState !== 'undefined' && AppState._harmonyTrustCtxBySlot
        ? AppState._harmonyTrustCtxBySlot[trustSlot]
        : null;
    if ((modeTag === 'lucky' || modeTag === 'bob') && snapCtx) {
        score = calculateAIProbability(numbers, snapCtx);
    } else if ((modeTag === 'auto' || modeTag === 'lucky' || modeTag === 'bob') && modeBtn && modeBtn.dataset.diversifyOffset !== undefined) {
        const off = parseInt(modeBtn.dataset.diversifyOffset, 10);
        score = calculateAIProbability(numbers, buildStatFilterTrustContextForGameSlot(gameIndex, Number.isNaN(off) ? 0 : off));
    } else {
        score = calculateAIProbability(numbers);
    }
    probDisplay.textContent = `${score}%`;
    applyStatFilterTrustTooltip(probDisplay);

    // 점수에 따른 색상 변경 (동행볼 색은 70~89 구간만 유지)
    if (score >= 90) {
        probDisplay.style.backgroundColor = SHAREHARMONY_PALETTE.golden;
        probDisplay.style.color = SHAREHARMONY_PALETTE.black;
    } else if (score >= 70) {
        probDisplay.style.backgroundColor = SHAREHARMONY_PALETTE.accent;
        probDisplay.style.color = SHAREHARMONY_PALETTE.white;
    } else {
        probDisplay.style.backgroundColor = SHAREHARMONY_PALETTE.textMuted;
        probDisplay.style.color = SHAREHARMONY_PALETTE.white;
    }

    // 클릭 시 상세 분석 말풍선 표시
    probDisplay.onclick = (e) => {
        e.stopPropagation();
        showAnalysisBubble(gameIndex, numbers, score, e);
    };
}

function drawPremiumTicket(numbers) {
    const canvas = document.getElementById('premiumTicketCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const sorted = [...numbers].sort((a, b) => a - b);
    const nextRound = (AppState && AppState.allLotto645Data && AppState.allLotto645Data[0]) ? AppState.allLotto645Data[0].round + 1 : '행운';

    // 1. 배경 그리기 (고급스러운 골드/화이트 톤)
    const grad = ctx.createLinearGradient(0, 0, 400, 280);
    grad.addColorStop(0, '#fffcf0');
    grad.addColorStop(1, '#f9f2d1');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(2, 2, 396, 276, 10) : ctx.rect(2, 2, 396, 276);
    ctx.fill();
    ctx.strokeStyle = SHAREHARMONY_PALETTE.goldenTicket;
    ctx.lineWidth = 4;
    ctx.stroke();

    // 2. 헤더 디자인
    ctx.fillStyle = SHAREHARMONY_PALETTE.goldenDark;
    ctx.font = 'bold 20px "Malgun Gothic", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('✨ AI PREMIUM LUCKY TICKET ✨', 200, 40);

    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(50, 50);
    ctx.lineTo(350, 50);
    ctx.stroke();

    // 3. 회차 및 설명
    ctx.fillStyle = SHAREHARMONY_PALETTE.textSecondary;
    ctx.font = '14px "Malgun Gothic"';
    ctx.fillText(`${nextRound}회차 당첨 기원 분석 조합`, 200, 75);

    // 4. 번호 출력 (로또 공 스타일)
    const colors = ['#fbc400', '#69c8f2', '#ff7272', '#aaaaaa', '#b0d840'];
    sorted.forEach((num, i) => {
        const x = 70 + (i * 52);
        const y = 130;

        // 그림자
        ctx.shadowBlur = 5;
        ctx.shadowColor = 'rgba(0,0,0,0.2)';
        ctx.shadowOffsetY = 2;

        // 공 원형
        ctx.beginPath();
        let ballColor = colors[Math.floor((num - 1) / 10)];
        ctx.fillStyle = ballColor;
        ctx.arc(x, y, 22, 0, Math.PI * 2);
        ctx.fill();

        // 번호
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;
        ctx.fillStyle = SHAREHARMONY_PALETTE.white;
        ctx.font = 'bold 18px Arial';
        ctx.fillText(num, x, y + 6);
    });

    // 5. 분석 데이터 요약
    const sum = sorted.reduce((a, b) => a + b, 0);
    const score = calculateAIProbability(sorted);

    ctx.fillStyle = SHAREHARMONY_PALETTE.textPrimary;
    ctx.font = 'bold 13px "Malgun Gothic"';
    ctx.textAlign = 'left';
    ctx.fillText(`📊 분석 리포트`, 55, 190);
    ctx.font = '12px "Malgun Gothic"';
    ctx.fillStyle = SHAREHARMONY_PALETTE.textSecondary;
    ctx.fillText(`• 분석 스코어: ${score}%  • 합계: ${sum}  • 검증: AC ${calculateAC(sorted)}`, 55, 210);
    ctx.fillText(`• 로직: 통계 가중치 기반 다차원 필터링 최적화 조합`, 55, 228);

    // 6. 하단 푸터 및 워터마크
    ctx.fillStyle = SHAREHARMONY_PALETTE.goldenTicket;
    ctx.font = 'italic bold 14px serif';
    ctx.textAlign = 'center';
    ctx.fillText('Dedicated to your Luck & Happiness', 200, 260);

    // 다운로드 버튼 연결
    const downBtn = document.getElementById('downloadTicketBtn');
    if (downBtn) {
        downBtn.onclick = () => {
            const imgData = canvas.toDataURL('image/png');

            fetch(resolveApiPath('/api/save-ticket-desktop'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: imgData, round: nextRound })
            })
                .then(res => res.json())
                .then(data => {
                    if (data.returnValue === 'success') {
                        alert(`행운 티켓이 바탕화면에 저장되었습니다! 🎫\n(저장 경로: ${data.path})`);
                    } else {
                        alert('저장에 실패했습니다: ' + data.error);
                    }
                })
                .catch(err => {
                    console.error('바탕화면 저장 오류:', err);
                    alert('바탕화면에 저장하는 중 오류가 발생했습니다.');
                });
        };
    }
}

/**
 * 한 게임 슬롯 갱신 (async pass-through)
 *  - generateGame은 async지만, sync 모드(manual/semi-auto/bob)는 즉시 끝나므로
 *    호출자에서 `await` 없이 fire-and-forget으로 호출해도 무방.
 *  - 자동/lucky 모드를 await하려는 호출자는 반환 Promise를 직접 await.
 */
function updateGameSet(gameIndex, mode, isModeChange = false) {
    return generateGame(gameIndex, mode, isModeChange);
}

function updateSaveBoxState() {
    const saveRound = document.getElementById('saveRound');
    const saveBtn = document.getElementById('saveBtn');
    const deleteSelectedBtn = document.getElementById('deleteSelectedBtn');

    if (!saveRound || !saveBtn) return;

    // 1~5개 게임 중 하나라도 6개 번호가 완성되었고 체크되어 있는지 확인
    let hasValidGame = false;
    for (let i = 1; i <= 5; i++) {
        const checkbox = document.getElementById(`gameCheckbox${i}`);
        if (checkbox && checkbox.checked) {
            const numbers = AppState.setSelectedBalls[i - 1] || [];
            const validNumbers = numbers.filter(n => n && n >= 1 && n <= 45);
            if (validNumbers.length === 6) {
                hasValidGame = true;
                break;
            }
        }
    }

    const checkedDeleteBoxes = document.querySelectorAll('.result-delete-checkbox:checked');
    const hasCheckboxSelected = checkedDeleteBoxes.length > 0;

    const pendingRound = getSaveTargetPendingRound();
    if (pendingRound != null) {
        saveRound.value = String(pendingRound);
    } else {
        saveRound.value = '';
    }

    const canSaveNumbers = hasValidGame && pendingRound != null;

    if (hasCheckboxSelected) {
        saveBtn.disabled = true;
    } else {
        saveBtn.disabled = !canSaveNumbers;
    }

    if (deleteSelectedBtn) {
        if (canSaveNumbers && !hasCheckboxSelected) {
            deleteSelectedBtn.disabled = true;
            deleteSelectedBtn.style.color = SHAREHARMONY_PALETTE.textMuted;
            deleteSelectedBtn.style.borderColor = SHAREHARMONY_PALETTE.textMuted;
            deleteSelectedBtn.style.cursor = 'default';
        } else if (hasCheckboxSelected) {
            deleteSelectedBtn.disabled = false;
            deleteSelectedBtn.style.color = SHAREHARMONY_PALETTE.aiOrange;
            deleteSelectedBtn.style.borderColor = SHAREHARMONY_PALETTE.aiOrange;
            deleteSelectedBtn.style.cursor = 'pointer';
        } else {
            deleteSelectedBtn.disabled = true;
            deleteSelectedBtn.style.color = SHAREHARMONY_PALETTE.textMuted;
            deleteSelectedBtn.style.borderColor = SHAREHARMONY_PALETTE.textMuted;
            deleteSelectedBtn.style.cursor = 'default';
        }
    }

    updateAiDashboard(hasValidGame);
}

function updateAiDashboard(hasValidGame) { }

function renderAiStats(games, activeTab, tabArea) { }

function updateAverageSumDisplay(data) {
    const el = document.getElementById('resultRoundRange');
    if (!el) return;

    if (!data || data.length === 0) {
        el.textContent = '[ 0000 ~ 0000, 000회 ]';
        el.removeAttribute('title');
        el.classList.remove('result-round-range--warn');
        return;
    }

    const rounds = data.map(r => Number(r.round)).filter(r => !isNaN(r));
    if (rounds.length === 0) {
        el.textContent = '[ 회차 필드 오류 ]';
        el.setAttribute('title', '로드된 데이터에 유효한 회차 번호가 없습니다.');
        el.classList.add('result-round-range--warn');
        return;
    }

    const startRound = Math.min(...rounds);
    const endRound = Math.max(...rounds);
    const count = data.length;
    const spanInclusive = endRound - startRound + 1;
    const uniqueRounds = new Set(rounds).size;

    const startStr = startRound.toString().padStart(4, '0');
    const endStr = endRound.toString().padStart(4, '0');
    const countStr = count.toString().padStart(3, '0');

    let suffix = '';
    let tip = '';
    if (uniqueRounds !== count) {
        suffix = ` · 행중복 ${count - uniqueRounds}`;
        tip = '회차 번호가 같은 행이 둘 이상 있습니다. Lotto645.xlsx·json을 확인하세요.';
    } else if (uniqueRounds < spanInclusive) {
        const missing = spanInclusive - uniqueRounds;
        suffix = ` · 누락 ${missing}`;
        tip = '시작~끝 회차 사이에 빈 회차가 있습니다. 배포 서버의 .source 동기화·/api/deploy-info·누락 회차 보강을 확인하세요.';
    }

    el.textContent = `[ ${startStr} ~ ${endStr}, ${countStr}회 ]${suffix}`;
    if (tip) {
        el.setAttribute('title', tip);
        el.classList.add('result-round-range--warn');
    } else {
        el.removeAttribute('title');
        el.classList.remove('result-round-range--warn');
    }
}

function showHelpModal() {
    let modal = document.getElementById('helpModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'helpModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width:min(640px,92vw);width:100%;max-height:min(88vh,760px);display:flex;flex-direction:column;box-sizing:border-box;padding:16px 18px;">
                <div class="help-modal-scroll" style="flex:1;overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch;font-size:0.88rem;line-height:1.75;color:var(--color-text-primary);padding-right:6px;">
                </div>
                <div style="flex-shrink:0;text-align:right;margin-top:14px;padding-top:10px;border-top:1px solid var(--color-harmony-border);">
                    <button type="button" class="help-modal-close-btn"
                        style="padding:8px 20px;background:var(--color-primary);color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:700;">닫기</button>
                </div>
            </div>`;
        document.body.appendChild(modal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.classList.remove('show');
        });
        modal.querySelector('.help-modal-close-btn').addEventListener('click', () => {
            modal.classList.remove('show');
        });
    }
    const scrollEl = modal.querySelector('.help-modal-scroll');
    if (scrollEl) scrollEl.innerHTML = getHelpModalBodyHtml();
    modal.classList.add('show');
}

if (typeof window !== "undefined") {
    window.updateCurrentStats = updateCurrentStats;
    window.renderViewNumbersFromSelectedRounds = renderViewNumbersFromSelectedRounds;
    window.updateSortButtons = updateSortButtons;
    window.updateGameSum = updateGameSum;
    window.updateGameProbability = updateGameProbability;
    window.drawPremiumTicket = drawPremiumTicket;
    window.updateGameSet = updateGameSet;
    window.updateSaveBoxState = updateSaveBoxState;
    window.updateAiDashboard = updateAiDashboard;
    window.renderAiStats = renderAiStats;
    window.updateRoundRangeDisplay = updateRoundRangeDisplay;
    window.updateAverageSumDisplay = updateAverageSumDisplay;
    window.showHelpModal = showHelpModal;
}


function buildPendingGameOptionsAndChoiceReason(game) {
    const mode = (game.gameMode === '자동' ? 'AI추천' : game.gameMode) || '기타';
    const setVal = game.set !== undefined ? game.set : game['세트'];
    const setDisp = setVal !== undefined && setVal !== null && setVal !== '' ? `${setVal}세트 ` : '';
    const nums = game.numbers ? [...game.numbers].sort((a, b) => a - b) : [];
    const pickSumDisp = getGamePickSum(game);
    const pickSumRow = pickSumDisp != null && !Number.isNaN(pickSumDisp)
        ? `<b>${pickSumDisp}</b> <span style="color:#888;font-weight:normal;">(선택1~6 합)</span>`
        : '—';

    const oeRaw = game.oddEven;
    const seqRaw = game.sequence;
    const hcRaw = game.hotCold;

    const oeDisp = (oeRaw != null && oeRaw !== '' && !Number.isNaN(Number(oeRaw)))
        ? `홀 ${Number(oeRaw)}개 (짝 ${6 - Number(oeRaw)}개)`
        : '— <span style="color:#888;font-weight:normal;">(목표 미기록)</span>';
    const seqDisp = (seqRaw != null && seqRaw !== '' && !Number.isNaN(Number(seqRaw)))
        ? `연속 수 쌍 ${Number(seqRaw)}개`
        : '— <span style="color:#888;font-weight:normal;">(목표 미기록)</span>';
    const hcDisp = (hcRaw != null && hcRaw !== '' && !Number.isNaN(Number(hcRaw)))
        ? `핫 번호 ${Number(hcRaw)}개 (콜 ${6 - Number(hcRaw)}개)`
        : '— <span style="color:#888;font-weight:normal;">(목표 미기록)</span>';

    const roundNum = Number(game.round);

    let acRowDisp = '— <span style="color:#888;font-weight:normal;">(번호 6개 실측 시)</span>';
    if (nums.length === 6 && new Set(nums).size === 6 && !nums.some(n => n < 1 || n > 45)) {
        acRowDisp = `<b>AC${String(calculateAC(nums)).padStart(2, '0')}</b> <span style="color:#888;font-weight:normal;">(실측)</span>`;
    }

    const probResult = countCombinationsMatchingSavedTargets(roundNum, oeRaw, seqRaw, hcRaw);
    let probDisp;
    if (probResult.count === null) {
        probDisp = `<span style="color:#888;">${probResult.note || '계산 불가'}</span>`;
    } else if (probResult.noTargets) {
        const c = probResult.count;
        const t = probResult.total;
        probDisp =
            `<span style="font-size:0.95em;"><b>${c.toLocaleString()}</b>/<b>${t.toLocaleString()}</b></span>` +
            ` <span style="color:#1565C0;font-size:0.95em;">(1/1)</span><br>` +
            '<span style="color:#555;font-size:0.9em;">저장된 홀·연속·핫 <b>목표가 없어</b> 좁힘 없음 · 당첨 1등은 여전히 <b>1</b>/<b>8,145,060</b></span>';
    } else {
        const c = probResult.count;
        const t = probResult.total;
        const narrow = c > 0 ? Math.max(1, Math.round(t / c)) : t;
        probDisp =
            `<span style="font-size:0.95em;"><b>${c.toLocaleString()}</b>/<b>${t.toLocaleString()}</b></span>` +
            ` <span style="color:#1565C0;font-size:0.95em;">(1/${narrow.toLocaleString()})</span><br>` +
            `<span style="color:#888;font-size:0.85em;">앞은 <b>목표 충족 조합 수/전체 조합 수</b>, 괄호는 무작위 1장이 그 목표에 맞을 <b>대략 역수(확률 분모)</b> · 전체 대비 약 <b>${narrow.toLocaleString()}</b>배 좁힘 · <b>선택 합계·AC</b>는 목표에 없어 미반영 · 당첨(1등) <b>1</b>/<b>${t.toLocaleString()}</b>와 별개</span>`;
    }

    const optRow = (label, val) =>
        `<tr><td style="padding:4px 8px;border:1px solid #dde;color:#555;vertical-align:top;white-space:nowrap;">${label}</td>` +
        `<td style="padding:4px 8px;border:1px solid #dde;">${val}</td></tr>`;

    const optionsTable = `
        <table style="width:100%;border-collapse:collapse;font-size:0.82rem;margin:6px 0;">
            <tbody>
                ${optRow('회차', `<b>${game.round}회</b>`)}
                ${optRow('세트 · 게임', `<b>${setDisp}${game.game}게임</b>`)}
                ${optRow('게임 모드', `<b>${mode}</b>`)}
                ${optRow('홀짝(저장)', oeDisp)}
                ${optRow('연속(저장)', seqDisp)}
                ${optRow('핫/콜(저장)', hcDisp)}
                ${optRow('AC값', acRowDisp)}
                ${optRow('선택 합계', pickSumRow)}
                ${optRow('확률(저장 목표)', probDisp)}
            </tbody>
        </table>`;
    const { hot } = getHotColdNumbersBeforeRound(roundNum);
    const hotSet = new Set(hot);
    const actualOdd = nums.length === 6 ? nums.filter(n => n % 2 === 1).length : 0;
    const actualEven = nums.length === 6 ? 6 - actualOdd : 0;
    const actualSeq = nums.length === 6 ? countSequentialPairs(nums) : 0;
    const actualHot = nums.length === 6 ? nums.filter(n => hotSet.has(n)).length : 0;
    const actualCold = nums.length === 6 ? 6 - actualHot : 0;

    const introParas = [];
    const parasFacts = [];
    let showHopeBlock = false;

    if (mode === '행운') {
        introParas.push('이 조합은 <b>행운</b> 모드로 만들어졌습니다. 홀·짝·연속·핫 등 <b>옵션 필터를 맞추려는 의도 없이</b>, AI가 자동으로 여섯 수를 배합한 결과입니다.');
    } else if (mode === 'BOB') {
        introParas.push('이 조합은 과거 데이터에 <b>BOB</b>로 기록된 행입니다. 현재 앱에서는 BOB 전용 기능을 쓰지 않으며, 표시만 유지됩니다.');
    } else if (mode === 'AI추천' || mode === '자동') {
        introParas.push('이 조합은 <b>AI추천</b> 흐름으로 생성되었습니다. 당시 화면에서 고른 <b>옵션 필터</b>(홀·짝, 연속, 핫/콜 등)에 따라 <b>의도한 조건</b>을 반영해, 그 범위를 만족하는 후보 가운데에서 조합된 번호입니다.');
    } else if (mode === '반자동') {
        introParas.push('이 조합은 <b>반자동</b>으로 저장되었습니다. 직접 고른 수와 함께, <b>사용자의 의도</b>에 맞추어 옵션·필터·남은 칸을 채우는 흐름으로 완성된 결과입니다.');
    } else if (mode === '수동') {
        introParas.push('이 조합은 <b>수동</b>으로 저장되었습니다. 여섯 수 모두 <b>사용자의 의도대로</b> 직접 고른 것이며, 함께 기록된 옵션 값은 당시 설정을 남긴 참고·일관 표시입니다.');
    } else {
        introParas.push(`이 조합은 <b>${mode}</b> 방식으로 저장되었습니다. 아래 저장 옵션과 함께 기록된 설정을 참고하면 당시 의도를 짐작할 수 있습니다.`);
    }

    const numsValidFacts = nums.length === 6 && new Set(nums).size === 6 && !nums.some(function (n) { return n < 1 || n > 45; });

    if (numsValidFacts) {
        const sumSix = nums.reduce(function (s, n) { return s + n; }, 0);
        const ac = calculateAC(nums);
        const acDisp = String(ac).padStart(2, '0');
        const pickHas = pickSumDisp != null && !Number.isNaN(Number(pickSumDisp));
        const pickNum = pickHas ? Number(pickSumDisp) : NaN;
        const samePickAndSix = pickHas && pickNum === sumSix;

        let one = '';
        if (pickHas && samePickAndSix) {
            one += `그날 마음에 새겨 두신 <b>선택 합계</b>와 여섯 수의 합은 <b>${sumSix}</b>로 같으며, `;
        } else if (pickHas) {
            one += `그날 마음에 새겨 두신 <b>선택 합계</b>는 <b>${pickNum}</b>이고 여섯 수의 합은 <b>${sumSix}</b>이며, `;
        }

        one += `여섯 수는 <b>홀 ${actualOdd}개·짝 ${actualEven}개</b>이고 <b>연속 ${actualSeq}쌍</b>이며, `;
        if (hot.length > 0) {
            one += `<b>${roundNum}회</b>를 앞두고 모은 기록의 <b>핫 번호</b> 기준으로 <b>${actualHot}개</b>는 뜨거운 흐름 쪽·<b>${actualCold}개</b>는 고요한 쪽에 서 있고, `;
        } else {
            one += `${roundNum}회 이전 당첨 데이터가 충분하지 않아 핫·콜 비교는 생략한 채, `;
        }
        if (pickHas) {
            one += `퍼짐 성격을 짚는 <b>AC값은 ${acDisp}</b>입니다.`;
        } else {
            one += `여섯 수를 한데 더한 <b>합계는 ${sumSix}</b>, 퍼짐 성격을 짚는 <b>AC값은 ${acDisp}</b>입니다.`;
        }
        parasFacts.push(one);
        showHopeBlock = true;
    } else if (pickSumDisp != null && !Number.isNaN(pickSumDisp)) {
        parasFacts.push(`그날 마음에 새겨 두신 <b>선택 합계</b>는 <b>${pickSumDisp}</b>에 이르지만, 저장된 번호가 여섯 개가 아니거나 형식이 맞지 않아 홀짝·연속·합·AC를 한 문장으로 묶어 말하기는 어렵습니다.`);
        showHopeBlock = true;
    } else {
        parasFacts.push('저장된 번호가 여섯 개가 아니거나 형식이 맞지 않아, 조합 패턴(홀짝·연속 등)을 한 문장으로 요약하기 어렵습니다.');
    }

    let sumSixForHope = 0;
    let acForHope = 0;
    if (numsValidFacts) {
        sumSixForHope = nums.reduce(function (s, n) { return s + n; }, 0);
        acForHope = calculateAC(nums);
    }

    const hopeBlock = showHopeBlock
        ? `<p style="margin:0 0 10px;">${pickPendingHopeParagraph({
            roundNum: roundNum,
            mode: mode,
            pickSumDisp: pickSumDisp,
            numsValid: numsValidFacts,
            sortedSix: nums,
            sumSix: sumSixForHope,
            ac: acForHope,
            actualOdd: actualOdd,
            actualEven: actualEven,
            actualSeq: actualSeq,
            actualHot: actualHot
        })}</p>`
        : '';

    const choiceReasonHtml = `
        <div style="font-size:0.86rem;line-height:1.65;color:#334854;text-align:justify;word-break:keep-all;">
            <p style="font-weight:700;margin:0 0 8px;color:#2c3e6b;">이번 게임은</p>
            ${introParas.map(p => `<p style="margin:0 0 10px;">${p}</p>`).join('')}
            ${parasFacts.map(p => `<p style="margin:0 0 10px;">${p}</p>`).join('')}
            ${hopeBlock}
        </div>`;

    return { optionsTable, choiceReasonHtml };
}

if (typeof window !== "undefined") {
    window.buildPendingGameOptionsAndChoiceReason = buildPendingGameOptionsAndChoiceReason;
}
