/**
 * modules/eventHandlers.js
 * 이벤트 리스너 등록 및 바인딩 관련 함수들
 */



function initializeGameBox() {
    const gameSetsContainer = document.getElementById('gameSetsContainer');
    if (!gameSetsContainer) return;

    for (let i = 1; i <= 5; i++) {
        const gameSet = document.createElement('div');
        gameSet.id = `gameSet${i}`;
        gameSet.className = 'game-set-row';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `gameCheckbox${i}`;
        checkbox.dataset.gameIndex = i;
        checkbox.disabled = true;
        checkbox.style.width = '14px';
        checkbox.style.height = '14px';
        checkbox.addEventListener('change', async function () {
            const gameIndex = parseInt(this.dataset.gameIndex);
            const modeBtn = document.getElementById(`modeBtn${gameIndex}`);
            const currentMode = modeBtn ? modeBtn.dataset.mode : 'manual';

            if (this.checked) {
                let numbers = AppState.setSelectedBalls[gameIndex - 1] || [];
                let validNumbers = numbers.filter(n => n && n >= 1 && n <= 45);

                if (currentMode === 'manual' || currentMode === 'auto') {
                    if (validNumbers.length !== 6) {
                        alert('6개의 번호를 모두 선택해주세요.');
                        this.checked = false;
                        return;
                    }
                } else if (currentMode === 'semi-auto') {
                    if (validNumbers.length >= 1 && validNumbers.length <= 5) {
                        const fullNumbers = generateNumbersWithFilters(validNumbers, true);
                        if (!fullNumbers || fullNumbers.length !== 6) {
                            alert('설정한 옵션필터를 만족하는 나머지 번호를 찾지 못했습니다. 필터를 완화한 뒤 다시 시도해 주세요.');
                            this.checked = false;
                            return;
                        }
                        const newNumbers = fullNumbers.filter(n => !validNumbers.includes(n));
                        const allNumbers = [...validNumbers, ...newNumbers].slice(0, 6).sort((a, b) => a - b);
                        AppState.setSelectedBalls[gameIndex - 1] = allNumbers;
                        updateGameSet(gameIndex, 'semi-auto');
                    } else if (validNumbers.length === 6) {
                        // 6개 완료 — 그대로 유지
                    } else if (validNumbers.length === 0) {
                        alert('반자동 모드는 1개 이상의 번호를 선택해야 합니다.');
                        this.checked = false;
                        return;
                    }
                }

                // 동일 회차·세트/게임이 있으면 저장 시 서버가 세트+1·게임 1부터 부여하므로 경고 없음
            }
            updateSaveBoxState();
        });

        const modeBtn = document.createElement('button');
        modeBtn.id = `modeBtn${i}`;
        modeBtn.className = 'filter-btn game-mode-btn';
        modeBtn.textContent = '수동';
        modeBtn.dataset.gameIndex = i;
        modeBtn.dataset.gameLabel = `G${i}`;
        modeBtn.dataset.mode = 'manual';
        modeBtn.addEventListener('click', function () {
            const gameIdx = parseInt(this.dataset.gameIndex, 10);
            const cb = document.getElementById(`gameCheckbox${gameIdx}`);
            if (cb && cb.checked) {
                alert('게임모드를 변경하려면 체크박스를 해제한 후 진행해 주세요.');
                return;
            }
            const currentMode = this.dataset.mode;
            const semiFrom = this.dataset.semiFrom || '';
            let newMode, newText;
            // 행운 순환: 행운 ⇄ 반자동 (선택필터 초기화)
            if (currentMode === 'lucky') {
                newMode = 'semi-auto';
                newText = '반자동';
                this.dataset.semiFrom = 'lucky';
            } else if (currentMode === 'semi-auto' && semiFrom === 'lucky') {
                newMode = 'lucky';
                newText = '행운';
                delete this.dataset.semiFrom;
            } else if (currentMode === 'semi-auto' && semiFrom === 'ai') {
                newMode = 'manual';
                newText = '수동';
                delete this.dataset.semiFrom;
            } else if (currentMode === 'manual') {
                newMode = 'auto';
                newText = 'AI추천';
            } else if (currentMode === 'auto') {
                /* 게임공에서 B of B 모드 제거: AI추천 다음은 반자동(AI 경로) */
                newMode = 'semi-auto';
                newText = '반자동';
                this.dataset.semiFrom = 'ai';
            } else if (currentMode === 'bob') {
                newMode = 'manual';
                newText = '수동';
                delete this.dataset.semiFrom;
            } else {
                newMode = 'manual';
                newText = '수동';
            }

            this.dataset.mode = newMode;
            this.textContent = newText;
            if (newMode === 'manual' || newMode === 'semi-auto') {
                delete this.dataset.diversifyOffset;
            }

            // 행운 모드: 1회~최신회 통계로 옵션필터 반영
            if (newMode === 'lucky' && typeof applyLuckyNumbersStatBasisToDom === 'function') {
                applyLuckyNumbersStatBasisToDom();
            }

            if (newMode === 'manual') {
                if (!AppState.setSelectedBalls) AppState.setSelectedBalls = Array.from({ length: 5 }, () => []);
                AppState.setSelectedBalls[i - 1] = [];
                if (cb) cb.checked = false;
                this.title = '';
            } else if (newMode === 'auto' || newMode === 'lucky' || newMode === 'bob') {
                if (cb) cb.checked = true;
            } else if (newMode === 'semi-auto') {
                if (cb) cb.checked = false;
            }
            updateGameSet(i, newMode, true);
        });

        const ballsContainer = document.createElement('div');
        ballsContainer.id = `gameBalls${i}`;
        ballsContainer.className = 'game-balls-wrap';

        const sumDisplay = document.createElement('span');
        sumDisplay.id = `gameSum${i}`;
        sumDisplay.className = 'game-sum';
        sumDisplay.textContent = '0';

        const probDisplay = document.createElement('div');
        probDisplay.id = `gameProb${i}`;
        probDisplay.className = 'game-prob stat-filter-trust-tip-host';
        probDisplay.textContent = '0%';

        const rightGroup = document.createElement('div');
        rightGroup.className = 'game-right-group';
        rightGroup.appendChild(sumDisplay);

        /* 6공+합계를 한 덩어리로: 저장공 행의 슬롯7·줄 gap·체크박스만큼 우측 여백을 맞춰 세로 열 정렬 */
        const gameRowTail = document.createElement('div');
        gameRowTail.className = 'game-row-tail';
        gameRowTail.appendChild(ballsContainer);
        gameRowTail.appendChild(rightGroup);

        gameSet.appendChild(checkbox);
        gameSet.appendChild(modeBtn);
        gameSet.appendChild(probDisplay);
        gameSet.appendChild(gameRowTail);

        gameSetsContainer.appendChild(gameSet);
    }

    generateAllGames();
}

function setupSortButtons() {
    const sortNumberBtn = document.getElementById('sortNumber');
    const sortWinBtn = document.getElementById('sortWin');
    const sortAppearanceBtn = document.getElementById('sortAppearance');

    if (sortNumberBtn) {
        sortNumberBtn.addEventListener('click', () => {
            AppState.selectedSeqRounds = null;
            const seqFilterEl = document.getElementById('seqFilter');
            if (seqFilterEl) seqFilterEl.value = 'none';
            AppState.seqFilterType = null;
            if (AppState.currentSort === 'number-desc') {
                AppState.currentSort = 'number-asc';
                sortNumberBtn.textContent = '번호순▲';
            } else {
                AppState.currentSort = 'number-desc';
                sortNumberBtn.textContent = '번호순▼';
            }
            updateSortButtons('number');
            renderStatsList();
            renderNumberGrid();
            if (AppState.currentViewNumbersBaseData && typeof renderViewNumbersList === 'function') {
                renderViewNumbersList(AppState.currentViewNumbersBaseData);
            }
            if (typeof syncBottomChartsToSortState === 'function') syncBottomChartsToSortState();
        });
    }

    if (sortWinBtn) {
        sortWinBtn.addEventListener('click', () => {
            AppState.selectedSeqRounds = null;
            const seqFilterEl = document.getElementById('seqFilter');
            if (seqFilterEl) seqFilterEl.value = 'none';
            AppState.seqFilterType = null;
            if (AppState.currentSort === 'win-desc') {
                AppState.currentSort = 'win-asc';
                sortWinBtn.textContent = '당첨순▲';
            } else {
                AppState.currentSort = 'win-desc';
                sortWinBtn.textContent = '당첨순▼';
            }
            updateSortButtons('win');
            renderStatsList();
            renderNumberGrid();
            if (AppState.currentViewNumbersBaseData && typeof renderViewNumbersList === 'function') {
                renderViewNumbersList(AppState.currentViewNumbersBaseData);
            }
            if (typeof syncBottomChartsToSortState === 'function') syncBottomChartsToSortState();
        });
    }

    if (sortAppearanceBtn) {
        sortAppearanceBtn.addEventListener('click', () => {
            AppState.selectedSeqRounds = null;
            const seqFilterEl = document.getElementById('seqFilter');
            if (seqFilterEl) seqFilterEl.value = 'none';
            AppState.seqFilterType = null;
            if (AppState.currentSort === 'appearance-desc') {
                AppState.currentSort = 'appearance-asc';
                sortAppearanceBtn.textContent = '출현순▲';
            } else {
                AppState.currentSort = 'appearance-desc';
                sortAppearanceBtn.textContent = '출현순▼';
            }
            updateSortButtons('appearance');
            renderStatsList();
            renderNumberGrid();
            if (AppState.currentViewNumbersBaseData && typeof renderViewNumbersList === 'function') {
                renderViewNumbersList(AppState.currentViewNumbersBaseData);
            }
            if (typeof syncBottomChartsToSortState === 'function') syncBottomChartsToSortState();
        });
    }
    const seqFilterEl = document.getElementById('seqFilter');
    if (seqFilterEl) {
        seqFilterEl.addEventListener('change', () => {
            const val = seqFilterEl.value;
            if (val === 'none') {
                AppState.seqFilterType = null;
                AppState.currentSort = 'consecutive-asc';
                AppState.selectedSeqRounds = null;
                updateSortButtons('seq');
                if (AppState.currentViewNumbersBaseData && typeof renderViewNumbersList === 'function') {
                    renderViewNumbersList(AppState.currentViewNumbersBaseData);
                }
            } else {
                AppState.seqFilterType = parseInt(val, 10);
                AppState.currentSort = 'seq';
                updateSortButtons('seq');
            }
            renderStatsList();
            renderNumberGrid();
            if (typeof syncBottomChartsToSortState === 'function') syncBottomChartsToSortState();
        });
    }
}

function setupFilterListeners() {
    if (!AppState.optionFilters) {
        AppState.optionFilters = { oddEven: 'none', hotCold: 'none', consecutive: 'none', avgLow: null, avgHigh: null };
    }

    const ids = [
        { el: 'filterOddEven', key: 'oddEven' },
        { el: 'filterHotCold', key: 'hotCold' },
        { el: 'filterConsecutive', key: 'consecutive' },
        { el: 'filterAC', key: 'ac' }
    ];
    ids.forEach(function (item) {
        const el = document.getElementById(item.el);
        if (el) {
            el.addEventListener('change', function () {
                AppState.optionFilters[item.key] = this.value;
                generateAllGames();
            });
        }
    });

    ['filterAvgLow', 'filterAvgHigh'].forEach(function (id) {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('change', function () {
                const v = parseFloat(this.value);
                if (id === 'filterAvgLow' && !Number.isNaN(v)) AppState.sumRangeStart = v;
                if (id === 'filterAvgHigh' && !Number.isNaN(v)) AppState.sumRangeEnd = v;
                syncOptionFiltersAppStateFromDom();
                generateAllGames();
            });
        }
    });

    const excludeEl = document.getElementById('filterExclude');
    const clearExcludeBtn = document.getElementById('clearExcludeBtn');

    if (excludeEl) {
        const updateClearBtnState = () => {
            if (clearExcludeBtn) {
                clearExcludeBtn.style.display = excludeEl.value.trim().length > 0 ? 'block' : 'none';
            }
        };
        
        // 초기 상태 설정
        updateClearBtnState();
        
        if (clearExcludeBtn) {
            clearExcludeBtn.addEventListener('click', function() {
                excludeEl.value = '';
                updateClearBtnState();
                generateAllGames();
                excludeEl.focus();
            });
        }

        // 1. 실시간 입력 제어: 숫자, 콤마, 공백만 허용 (그 외 자동 삭제)
        excludeEl.addEventListener('input', function() {
            const raw = this.value;
            const clean = raw.replace(/[^0-9,\s]/g, '');
            if (raw !== clean) {
                this.value = clean;
            }
            updateClearBtnState();
        });

        // 2. 입력 완료 시 논리 검증: 1~45 범위 및 포맷팅
        excludeEl.addEventListener('change', function() {
            const parts = this.value.split(',');
            const validSet = new Set();
            let hasRangeError = false;

            parts.forEach(p => {
                const n = parseInt(p.trim(), 10);
                if (!isNaN(n)) {
                    if (n >= 1 && n <= 45) validSet.add(n);
                    else hasRangeError = true;
                }
            });

            if (hasRangeError) alert('제외수는 1~45 사이의 숫자여야 합니다.\n범위를 벗어난 숫자는 제외되었습니다.');
            
            this.value = Array.from(validSet).sort((a, b) => a - b).join(', ');
            updateClearBtnState();
            generateAllGames();
        });
    }
}

function bindApologyBubblePersistDrag(overlay) {
    if (!overlay) return;
    requestAnimationFrame(function () {
        overlay.classList.add('show');
        var b = overlay.querySelector('.apology-bubble');
        if (!b) return;
        b.dataset.bubblePosKey = 'apology-bubble';
        if (applySavedBubblePosition(b, 'apology-bubble')) {
            b.style.animation = 'none';
            b.style.transform = 'none';
        }
        attachDraggableBubble(b);
    });
}

function setupSaveButton() {
    const saveBtn = document.getElementById('saveBtn');
    if (!saveBtn) return;

    saveBtn.addEventListener('click', async () => {
        await saveGamesToCSV();
    });
}

function setupDeleteSelectedButton() {
    const deleteSelectedBtn = document.getElementById('deleteSelectedBtn');
    const selectAllCheckbox = document.getElementById('selectAllDeleteCheckbox');
    const resultContainer = document.getElementById('resultContainer');
    if (!deleteSelectedBtn || !resultContainer) return;

    // 전체선택 체크박스 상태 갱신 (일부 선택 = indeterminate)
    const updateSelectAllState = () => {
        if (!selectAllCheckbox) return;
        const all = document.querySelectorAll('.result-delete-checkbox');
        const checked = document.querySelectorAll('.result-delete-checkbox:checked');
        if (all.length === 0) {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = false;
        } else if (checked.length === 0) {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = false;
        } else if (checked.length === all.length) {
            selectAllCheckbox.checked = true;
            selectAllCheckbox.indeterminate = false;
        } else {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = true;
        }
    };

    // 체크박스 상태 변경을 감지하기 위한 함수
    const updateDeleteBtnState = () => {
        const checkedBoxes = document.querySelectorAll('.result-delete-checkbox:checked');
        if (checkedBoxes.length > 0) {
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
        updateSelectAllState();
        updateSaveBoxState(); // 선택 상태에 따라 저장 버튼 활성/비활성 업데이트
    };

    // 전체선택 체크박스 클릭: 모든 삭제 체크박스 일괄 선택/해제
    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', () => {
            const checked = selectAllCheckbox.checked;
            document.querySelectorAll('.result-delete-checkbox').forEach(cb => {
                cb.checked = checked;
            });
            updateDeleteBtnState();
        });
    }

    // 정적인 이벤트뿐만 아니라 렌더링 후 동적으로 붙은 체크박스 이벤트 처리를 위해 이벤트 위임 사용
    resultContainer.addEventListener('change', (e) => {
        if (e.target && e.target.classList.contains('result-delete-checkbox')) {
            updateDeleteBtnState();
        }
    });

    deleteSelectedBtn.addEventListener('click', async () => {
        const checkedBoxes = document.querySelectorAll('.result-delete-checkbox:checked');

        if (checkedBoxes.length > 0) {
            // 선택삭제 수행
            if (confirm(`선택한 ${checkedBoxes.length}개의 기록을 삭제하시겠습니까?`)) {
                const itemsToDel = [];
                checkedBoxes.forEach(box => {
                    itemsToDel.push({
                        round: box.dataset.round,
                        set: box.dataset.set || '',
                        game: box.dataset.game
                    });
                });

                try {
                    const baseUrl = getApiBaseUrl();
                    const response = await fetch(`${baseUrl}/api/delete-lotto023`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ items: itemsToDel })
                    });

                    if (response.ok) {
                        const result = await response.json();
                        if (result.returnValue === 'success') {
                            if (typeof CACHE_KEYS !== 'undefined' && CACHE_KEYS.LOTTO023) {
                                localStorage.removeItem(CACHE_KEYS.LOTTO023);
                            } else {
                                localStorage.removeItem('LOTTO023_DATA_CACHE_V2');
                            }
                            await loadAndDisplayResults();
                            updateSaveBoxState();
                            alert(`선택한 ${checkedBoxes.length}개의 기록이 삭제되었습니다.`);
                        } else {
                            throw new Error(result.error || '알 수 없는 오류');
                        }
                    } else {
                        throw new Error('서버 응답 오류');
                    }
                } catch (err) {
                    console.error('선택 삭제 실패:', err);
                    alert('삭제 중 오류가 발생했습니다: ' + err.message);
                }
            }
        } else {
            alert('삭제할 기록의 체크박스를 선택해주세요.');
        }
    });
}

function setupRangeTypeSelectors() {
    const roundRadio = document.getElementById('rangeTypeRound');
    const dateRadio = document.getElementById('rangeTypeDate');
    const startRound = document.getElementById('startRound');
    const endRound = document.getElementById('endRound');
    const startDate = document.getElementById('startDate');
    const endDate = document.getElementById('endDate');
    const startRoundDateSpan = document.getElementById('startRoundDate');
    const endRoundDateSpan = document.getElementById('endRoundDate');
    if (!roundRadio || !dateRadio) return;

    function syncFields() {
        if (roundRadio.checked) {
            if (startDate) startDate.value = '';
            if (endDate) endDate.value = '';
            if (startRoundDateSpan) {
                const d = convertRoundToDate(startRound.value);
                startRoundDateSpan.textContent = d ? '(' + d + ')' : '';
            }
            if (endRoundDateSpan) {
                const d = convertRoundToDate(endRound.value);
                endRoundDateSpan.textContent = d ? '(' + d + ')' : '';
            }
        } else {
            if (startRound) startRound.value = '';
            if (endRound) endRound.value = '';
            if (startRoundDateSpan) startRoundDateSpan.textContent = '';
            if (endRoundDateSpan) endRoundDateSpan.textContent = '';
        }
    }

    roundRadio.addEventListener('change', syncFields);
    dateRadio.addEventListener('change', syncFields);
}

function setupFooterToggle() {
    const footer = document.getElementById('mainFooter');
    const bottomArea = document.getElementById('bottomArea');
    const dragHandle = document.getElementById('bottomDragHandle');
    const navLuckyNumbers = document.getElementById('navLuckyNumbers');
    if (!footer || !bottomArea) return;

    if (navLuckyNumbers) {
        navLuckyNumbers.addEventListener('click', (e) => {
            e.preventDefault();
            const gameBox = document.getElementById('gameBox');
            if (gameBox) gameBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
            if (typeof generateGoldenAiGames === 'function') generateGoldenAiGames();
        });
    }
    const navPerfectBob = document.getElementById('navPerfectBob');
    if (navPerfectBob) {
        navPerfectBob.addEventListener('click', (e) => {
            e.preventDefault();
            const gameBox = document.getElementById('gameBox');
            if (gameBox) gameBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
            if (typeof generatePerfectBobGames === 'function') generatePerfectBobGames();
        });
    }

    // 하단 합계 차트 영역 상하 드래그로 위치 조절
    if (dragHandle) {
        let isDragging = false;
        let startY, startBottom;

        dragHandle.addEventListener('mousedown', e => {
            isDragging = true;
            startY = e.clientY;
            // 현재 bottom 값 가져오기 (없으면 50px)
            const style = window.getComputedStyle(bottomArea);
            startBottom = parseInt(style.bottom, 10) || 50;

            bottomArea.style.transition = 'none'; // 드래그 시 애니메이션 방지
            document.body.style.cursor = 'ns-resize';
            e.preventDefault();
        });

        document.addEventListener('mousemove', e => {
            if (!isDragging) return;

            const deltaY = startY - e.clientY; // 위로 드래그하면 양수
            let newBottom = startBottom + deltaY;

            // 경계 제한: 헤더(100px)와 푸터(50px)를 침범하지 않도록 설정
            const minBottom = 50; // 푸터 높이
            const headerHeight = 100; // 헤더 높이
            const maxBottom = window.innerHeight - headerHeight - bottomArea.offsetHeight;

            if (newBottom < minBottom) newBottom = minBottom;
            if (newBottom > maxBottom) newBottom = maxBottom;

            bottomArea.style.bottom = newBottom + 'px';
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                bottomArea.style.transition = '';
                document.body.style.cursor = '';
            }
        });
    }
}

function setupFullscreenButton() {
    const btn = document.getElementById('fullscreenBtn');
    if (!btn) return;
    function updateLabel() {
        btn.textContent = document.fullscreenElement ? '창모드' : '전체화면';
    }
    document.addEventListener('fullscreenchange', updateLabel);
    updateLabel();
    btn.addEventListener('click', function () {
        if (!document.documentElement.requestFullscreen) return;
        if (document.fullscreenElement) {
            document.exitFullscreen().catch(function () {});
        } else {
            document.documentElement.requestFullscreen().catch(function () {});
        }
    });
}

function setupResultFilterListeners() {
    if (!AppState.resultFilters) {
        AppState.resultFilters = {};
    }
    AppState.resultFilters = Object.assign(
        { sumValue: null, sortOrder: 'desc' },
        AppState.resultFilters
    );
    var sumVal = document.getElementById('resultSumValue');
    var sortOrder = document.getElementById('resultSortOrder');

    if (sumVal) {
        var iv = parseInt(String(sumVal.value).trim(), 10);
        AppState.resultFilters.sumValue = (Number.isNaN(iv) || iv <= 0) ? null : iv;
        sumVal.addEventListener('change', function () {
            var v = parseInt(String(this.value).trim(), 10);
            AppState.resultFilters.sumValue = (Number.isNaN(v) || v <= 0) ? null : v;
            if (AppState.currentViewNumbersBaseData) {
                renderViewNumbersList(AppState.currentViewNumbersBaseData);
            }
        });
    }
    if (sortOrder) sortOrder.addEventListener('change', function () {
        AppState.resultFilters.sortOrder = this.value;
        if (AppState.currentViewNumbersBaseData) {
            renderViewNumbersList(AppState.currentViewNumbersBaseData);
        }
    });

}

function setupPanelLabelToggle() {
    const map = {
        stats: '.panel-box-stats',
        game: '.panel-box-game',
        win: '.panel-box-win'
    };
    document.querySelectorAll('.panel-toggle-btn').forEach(btn => {
        btn.classList.add('active');
        btn.addEventListener('click', () => {
            const panelBox = document.querySelector(map[btn.dataset.panel]);
            if (!panelBox) return;
            panelBox.classList.toggle('collapsed');
            btn.classList.toggle('active', !panelBox.classList.contains('collapsed'));
        });
    });
}

function setupScrollToTopButton() {
    const topBtn = document.getElementById('scrollToTopBtn');
    if (!topBtn) return;

    // 스크롤 가능한 메인 패널 3개
    const scrollContainers = [
        document.querySelector('.panel-box-stats .panel-inner'),
        document.querySelector('.panel-box-game .panel-inner'),
        document.querySelector('.panel-box-win .panel-inner')
    ].filter(el => el); // null인 경우 제외

    if (scrollContainers.length === 0) return;

    // 스크롤 위치를 감지하여 버튼 표시/숨김
    const checkScroll = () => {
        // 3개 패널 중 하나라도 200px 이상 스크롤되면 버튼 표시
        const shouldShow = scrollContainers.some(container => container.scrollTop > 200);
        topBtn.classList.toggle('show', shouldShow);
    };

    // 각 패널에 스크롤 이벤트 리스너 추가
    scrollContainers.forEach(container => {
        container.addEventListener('scroll', checkScroll);
    });

    // 버튼 클릭 시, 현재 가장 많이 스크롤된 패널을 최상단으로 이동
    topBtn.addEventListener('click', () => {
        const mostScrolledContainer = scrollContainers.reduce((prev, current) => {
            return (prev.scrollTop > current.scrollTop) ? prev : current;
        });

        if (mostScrolledContainer) {
            mostScrolledContainer.scrollTo({ top: 0, behavior: 'smooth' });
        }
    });
}

if (typeof window !== "undefined") {
    window.initializeGameBox = initializeGameBox;
    window.setupSortButtons = setupSortButtons;
    window.setupFilterListeners = setupFilterListeners;
    window.bindApologyBubblePersistDrag = bindApologyBubblePersistDrag;
    window.setupSaveButton = setupSaveButton;
    window.setupDeleteSelectedButton = setupDeleteSelectedButton;
    window.setupRangeTypeSelectors = setupRangeTypeSelectors;
    window.setupFooterToggle = setupFooterToggle;
    window.setupFullscreenButton = setupFullscreenButton;
    window.setupResultFilterListeners = setupResultFilterListeners;
    window.setupPanelLabelToggle = setupPanelLabelToggle;
    window.setupScrollToTopButton = setupScrollToTopButton;
}
