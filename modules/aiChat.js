function initAIChat() {
    const chatBtn = document.getElementById('aiChatButton');
    const chatModal = document.getElementById('aiChatModal');
    const closeBtn = document.getElementById('aiChatClose');
    const sendBtn = document.getElementById('aiChatSend');
    const input = document.getElementById('aiChatInput');
    const chatBody = document.getElementById('aiChatBody');

    if (!chatBtn || !chatModal) return;

    // 1. 모달 열기/닫기
    chatBtn.addEventListener('click', () => {
        const isHidden = chatModal.style.display === 'none' || chatModal.style.display === '';

        if (isHidden) {
            // 저장된 위치 확인
            const savedPosition = localStorage.getItem('aiChatModalPosition');
            if (savedPosition) {
                try {
                    const { top, left } = JSON.parse(savedPosition);
                    chatModal.style.top = top;
                    chatModal.style.left = left;
                    // CSS fixed 위치 간섭 제거
                    chatModal.style.right = 'auto';
                    chatModal.style.bottom = 'auto';
                } catch (e) {
                    console.error("Failed to parse saved chat position:", e);
                    localStorage.removeItem('aiChatModalPosition'); // 잘못된 데이터 삭제
                }
            } else if (!chatModal.style.left || !chatModal.style.top) {
                const statsPanel = document.getElementById('statsPanel');
                const anchorEl = (statsPanel && statsPanel.getBoundingClientRect().width > 2)
                    ? statsPanel
                    : (document.getElementById('centerNavBar') || document.querySelector('.game-panel'));
                if (anchorEl) {
                    const rect = anchorEl.getBoundingClientRect();
                    const modalWidth = chatModal.offsetWidth || 350;

                    let calcLeft = rect.left + (rect.width - modalWidth) / 2;
                    if (calcLeft < 10) calcLeft = 10;

                    let calcTop = 200;
                    const sortBox = statsPanel && statsPanel.querySelector('.stats-sort');
                    if (sortBox && sortBox.offsetParent !== null) {
                        calcTop = sortBox.getBoundingClientRect().bottom + 10;
                    } else {
                        const dateBox = statsPanel && statsPanel.querySelector('#dateRangeBox');
                        if (dateBox && dateBox.offsetParent !== null) {
                            calcTop = dateBox.getBoundingClientRect().bottom + 50;
                        } else {
                            calcTop = rect.bottom + 10;
                        }
                    }

                    chatModal.style.left = calcLeft + 'px';
                    chatModal.style.top = calcTop + 'px';

                    chatModal.style.right = 'auto';
                    chatModal.style.bottom = 'auto';
                }
            }
            chatModal.style.display = 'flex';
            chatBtn.dataset.state = 'on'; // Set active state

            // 안내 메시지 업데이트
            const targetRound = document.getElementById('targetRound')?.value;
            const systemMsg = chatBody.querySelector('.ai-message.system');
            if (systemMsg) {
                if (targetRound) {
                    systemMsg.innerHTML = `안녕하세요! 현재 설정된 <b>${targetRound}회</b>까지의 데이터를 기반으로 로또 번호를 분석해 드립니다.<br>궁금한 점을 물어보세요.`;
                } else if (AppState.currentViewRounds && AppState.currentViewRounds.length > 0) {
                    const count = AppState.currentViewRounds.length;
                    const displayCount = count > 30 ? 30 : count;
                    systemMsg.innerHTML = `안녕하세요! 우측 패널에 조회된 데이터를 기반으로(최신 ${displayCount}회차 참고) 로또 번호를 분석해 드립니다.<br>궁금한 점을 물어보세요.`;
                } else {
                    systemMsg.innerHTML = `안녕하세요! 데이터를 기반으로 로또 번호를 분석해 드립니다.<br>궁금한 점을 물어보세요.`;
                }
            }

            input.focus();
        } else {
            chatModal.style.display = 'none';
            chatBtn.dataset.state = 'off'; // Set inactive state
        }
    });

    closeBtn.addEventListener('click', () => {
        chatModal.style.display = 'none';
        chatBtn.dataset.state = 'off'; // Set inactive state
    });

    // 2. 메시지 전송
    async function sendMessage() {
        const text = input.value.trim();
        if (!text) return;

        // 사용자 메시지 표시
        addMessage(text, 'user');
        input.value = '';

        // 로딩 표시
        const loadingId = addMessage('분석 중입니다...', 'loading');

        // 현재 설정된 회차 가져오기
        const startRoundInput = document.getElementById('startRound');
        const endRoundInput = document.getElementById('endRound');

        try {
            const response = await fetch('/api/ask-gemini', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    question: text,
                    startRound: startRoundInput ? startRoundInput.value : null,
                    endRound: endRoundInput ? endRoundInput.value : null,
                    targetRounds: AppState.currentViewRounds ? AppState.currentViewRounds.map(r => r.round) : null
                })
            });
            const data = await response.json();

            // 로딩 제거
            removeMessage(loadingId);

            if (data.returnValue === 'success') {
                addMessage(data.answer, 'system');
            } else {
                addMessage('오류가 발생했습니다: ' + (data.error || '알 수 없는 오류'), 'system');
            }
        } catch (e) {
            removeMessage(loadingId);
            addMessage('서버 통신 오류: ' + e.message, 'system');
        }
    }

    sendBtn.addEventListener('click', sendMessage);
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });

    function addMessage(text, type) {
        const div = document.createElement('div');
        div.className = `ai-message ${type}`;
        div.textContent = text;
        div.id = 'msg-' + Date.now();
        chatBody.appendChild(div);
        chatBody.scrollTop = chatBody.scrollHeight;
        return div.id;
    }

    function removeMessage(id) {
        const el = document.getElementById(id);
        if (el) el.remove();
    }

    // 3. 드래그 기능 (헤더 잡고 이동)
    const header = document.getElementById('aiChatHeader');
    let isDragging = false;
    let offsetX, offsetY;

    header.addEventListener('mousedown', (e) => {
        isDragging = true;
        offsetX = e.clientX - chatModal.getBoundingClientRect().left;
        offsetY = e.clientY - chatModal.getBoundingClientRect().top;
        chatModal.style.transition = 'none'; // 드래그 중엔 부드러운 효과 끔
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;

        let newX = e.clientX - offsetX;
        let newY = e.clientY - offsetY;

        // 화면 밖으로 나가지 않게 제한 (선택사항)
        const maxX = window.innerWidth - chatModal.offsetWidth;
        const maxY = window.innerHeight - chatModal.offsetHeight;

        if (newX < 0) newX = 0;
        if (newY < 0) newY = 0;
        if (newX > maxX) newX = maxX;
        if (newY > maxY) newY = maxY;

        chatModal.style.left = newX + 'px';
        chatModal.style.top = newY + 'px';

        // bottom, right 속성 해제 (left, top으로 제어하기 위함)
        chatModal.style.bottom = 'auto';
        chatModal.style.right = 'auto';
    });

    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            chatModal.style.transition = ''; // 드래그 끝나면 다시 효과 켬
            // 위치 저장
            localStorage.setItem('aiChatModalPosition', JSON.stringify({ top: chatModal.style.top, left: chatModal.style.left }));
        }
    });
}

if (typeof window !== "undefined") {
    window.initAIChat = initAIChat;
}
