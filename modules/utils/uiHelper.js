/**
 * UI 헬퍼 유틸리티
 * DOM 조작 및 UI 업데이트 공통 함수
 */

/**
 * 요소 표시/숨김
 * @param {HTMLElement} element - 대상 요소
 * @param {boolean} show - 표시 여부
 */
function toggleElement(element, show) {
    if (!element) return;
    element.style.display = show ? '' : 'none';
}

/**
 * 클래스 토글
 * @param {HTMLElement} element - 대상 요소
 * @param {string} className - 클래스명
 * @param {boolean} [force] - 강제 추가/제거
 */
function toggleClass(element, className, force) {
    if (!element) return;

    if (force !== undefined) {
        element.classList.toggle(className, force);
    } else {
        element.classList.toggle(className);
    }
}

/**
 * 여러 요소에 클래스 추가
 * @param {Array<HTMLElement>} elements - 요소 배열
 * @param {string} className - 클래스명
 */
function addClassToAll(elements, className) {
    elements.forEach(el => el && el.classList.add(className));
}

/**
 * 여러 요소에서 클래스 제거
 * @param {Array<HTMLElement>} elements - 요소 배열
 * @param {string} className - 클래스명
 */
function removeClassFromAll(elements, className) {
    elements.forEach(el => el && el.classList.remove(className));
}

/**
 * 요소 내용 비우기
 * @param {HTMLElement} element - 대상 요소
 */
function clearElement(element) {
    if (!element) return;
    element.innerHTML = '';
}

/**
 * 요소 생성 헬퍼
 * @param {string} tag - 태그명
 * @param {Object} options - 옵션
 * @returns {HTMLElement} 생성된 요소
 */
function createElement(tag, options = {}) {
    const element = document.createElement(tag);

    if (options.className) {
        element.className = options.className;
    }

    if (options.id) {
        element.id = options.id;
    }

    if (options.text) {
        element.textContent = options.text;
    }

    if (options.html) {
        element.innerHTML = options.html;
    }

    if (options.attributes) {
        Object.entries(options.attributes).forEach(([key, value]) => {
            element.setAttribute(key, value);
        });
    }

    if (options.styles) {
        Object.entries(options.styles).forEach(([key, value]) => {
            element.style[key] = value;
        });
    }

    if (options.events) {
        Object.entries(options.events).forEach(([event, handler]) => {
            element.addEventListener(event, handler);
        });
    }

    if (options.children) {
        options.children.forEach(child => {
            if (child) element.appendChild(child);
        });
    }

    return element;
}

/**
 * 번호 볼 요소 생성 (ShareHarmony 스타일 통합)
 * @param {number} number - 번호
 * @param {Object} options - 옵션
 * @returns {HTMLElement} 볼 요소
 */
function createBallElement(number, options = {}) {
    const {
        selected = false,
        disabled = false,
        size = 'normal',
        onClick = null
    } = options;

    const ball = createElement('div', {
        className: 'stat-ball', // 통합된 클래스 사용
        text: number,
        attributes: {
            'data-number': number
        }
    });

    // ShareHarmony: 'golden' 하이라이트 적용
    if (typeof AppState !== 'undefined' && AppState.goldenNumbers && AppState.goldenNumbers.has(number)) {
        ball.classList.add('golden');
    }

    if (size === 'small') {
        ball.style.width = '24px';
        ball.style.height = '24px';
        ball.style.fontSize = '0.8rem';
    } else if (size === 'large') {
        ball.style.width = '42px';
        ball.style.height = '42px';
        ball.style.fontSize = '1.2rem';
    }

    if (selected) {
        ball.classList.add('selected');
        // 선택된 경우 Deep Navy 스타일 등으로 변형 가능
    }

    if (disabled) {
        ball.style.opacity = '0.5';
        ball.style.cursor = 'not-allowed';
    }

    if (onClick && !disabled) {
        ball.addEventListener('click', () => onClick(number));
        ball.style.cursor = 'pointer';
    }

    return ball;
}

/**
 * 로딩 스피너 표시/숨김
 * @param {boolean} show - 표시 여부
 * @param {string} [message] - 로딩 메시지
 */
function toggleLoadingSpinner(show, message = '로딩 중...') {
    let spinner = document.getElementById('loadingSpinner');

    if (show) {
        if (!spinner) {
            spinner = createElement('div', {
                id: 'loadingSpinner',
                className: 'loading-spinner',
                html: `
                    <div class="spinner-icon"></div>
                    <div class="spinner-text">${message}</div>
                `,
                styles: {
                    position: 'fixed',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    background: 'rgba(0,0,0,0.8)',
                    color: 'white',
                    padding: '20px',
                    borderRadius: '8px',
                    zIndex: '9999',
                    textAlign: 'center'
                }
            });
            document.body.appendChild(spinner);
        }
        spinner.style.display = 'block';
    } else {
        if (spinner) {
            spinner.style.display = 'none';
        }
    }
}

/**
 * 토스트 알림 표시
 * @param {string} message - 메시지
 * @param {string} type - 타입 ('success'|'error'|'info'|'warning')
 * @param {number} duration - 표시 시간 (ms)
 */
function showToast(message, type = 'info', duration = 3000) {
    const toast = createElement('div', {
        className: `toast toast-${type}`,
        text: message,
        styles: {
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            background: type === 'error' ? '#ff4444' :
                type === 'success' ? '#44ff44' :
                    type === 'warning' ? '#ffaa44' : '#4444ff',
            color: 'white',
            padding: '15px 20px',
            borderRadius: '6px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            zIndex: '10000',
            animation: 'slideInRight 0.3s ease-out'
        }
    });

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

/**
 * 확인 다이얼로그
 * @param {string} message - 메시지
 * @param {Function} onConfirm - 확인 콜백
 * @param {Function} onCancel - 취소 콜백
 */
function showConfirmDialog(message, onConfirm, onCancel) {
    const overlay = createElement('div', {
        className: 'dialog-overlay',
        styles: {
            position: 'fixed',
            top: '0',
            left: '0',
            right: '0',
            bottom: '0',
            background: 'rgba(0,0,0,0.5)',
            zIndex: '9998',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        }
    });

    const dialog = createElement('div', {
        className: 'confirm-dialog',
        styles: {
            background: 'white',
            padding: '20px',
            borderRadius: '8px',
            maxWidth: '400px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
        },
        children: [
            createElement('p', { text: message, styles: { marginBottom: '20px' } }),
            createElement('div', {
                styles: { display: 'flex', gap: '10px', justifyContent: 'flex-end' },
                children: [
                    createElement('button', {
                        text: '취소',
                        events: {
                            click: () => {
                                overlay.remove();
                                if (onCancel) onCancel();
                            }
                        }
                    }),
                    createElement('button', {
                        text: '확인',
                        className: 'primary',
                        events: {
                            click: () => {
                                overlay.remove();
                                if (onConfirm) onConfirm();
                            }
                        }
                    })
                ]
            })
        ]
    });

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
}

/**
 * 애니메이션 CSS 추가
 */
function addAnimationStyles() {
    if (document.getElementById('uiHelperStyles')) return;

    const style = createElement('style', {
        id: 'uiHelperStyles',
        html: `
            @keyframes slideInRight {
                from { transform: translateX(400px); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOutRight {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(400px); opacity: 0; }
            }
            .spinner-icon {
                width: 40px;
                height: 40px;
                border: 4px solid rgba(255,255,255,0.3);
                border-top-color: white;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin: 0 auto 10px;
            }
            @keyframes spin {
                to { transform: rotate(360deg); }
            }
        `
    });

    document.head.appendChild(style);
}

// 초기화
if (typeof document !== 'undefined') {
    addAnimationStyles();
}

// 전역으로 export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        toggleElement,
        toggleClass,
        addClassToAll,
        removeClassFromAll,
        clearElement,
        createElement,
        createBallElement,
        toggleLoadingSpinner,
        showToast,
        showConfirmDialog
    };
}
