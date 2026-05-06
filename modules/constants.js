/**
 * 로또 애플리케이션 상수 정의
 * 매직 넘버 제거 및 중앙 관리
 */

/**
 * 로또 게임 관련 상수
 */
const LOTTO_CONSTANTS = {
    // 번호 범위
    MIN_NUMBER: 1,
    MAX_NUMBER: 45,
    TOTAL_NUMBERS: 45,

    // 세트 구성
    SET_SIZE: 6,
    DEFAULT_SET_COUNT: 5,
    /** 게임1~5 슬롯 수(합 밴드·분산 필터·워커 풀 수집에 공통). app.js SUM_BAND_SLOT_COUNT 와 동일 값. */
    SUM_BAND_SLOT_COUNT: 5,

    // 합계 범위
    MIN_SUM: 21,   // 1+2+3+4+5+6
    MAX_SUM: 255,  // 40+41+42+43+44+45
    AVG_SUM: 138,  // (21+255)/2

    // 보너스
    HAS_BONUS: true
};

/**
 * 추첨 일정 상수
 */
const DRAW_SCHEDULE = {
    DAY_OF_WEEK: 5,      // 토요일 (0=일요일, 6=토요일)
    DRAW_HOUR: 20,       // 20시
    DRAW_MINUTE: 45,     // 45분
    SALES_CLOSE_HOUR: 20,
    SALES_CLOSE_MINUTE: 0
};

/**
 * 필터 타입 상수
 */
const FILTER_TYPES = {
    STAT: {
        NONE: 'none',
        COUNT_DESC: 'count-desc',
        COUNT_ASC: 'count-asc',
        PERCENTAGE_DESC: 'percentage-desc',
        PERCENTAGE_ASC: 'percentage-asc'
    },
    SEQUENCE: {
        NONE: 'none',
        ZERO: '0',
        ONE: '1',
        TWO: '2',
        THREE: '3'
    },
    ODD_EVEN: {
        NONE: 'none',
        ODD: 'odd',
        EVEN: 'even',
        BALANCED: 'balanced'
    },
    HOT_COLD: {
        NONE: 'none',
        HOT: 'hot',
        COLD: 'cold',
        MIXED: 'mixed'
    }
};

/**
 * 홀짝 비율 맵
 */
const ODD_EVEN_RATIO_MAP = {
    'odd': { odd: 4, even: 2 },
    'even': { odd: 2, even: 4 },
    'balanced': { odd: 3, even: 3 }
};

/**
 * 핫/콜드 비율 맵
 */
const HOT_COLD_RATIO_MAP = {
    'hot': { hot: 4, cold: 2 },
    'cold': { hot: 2, cold: 4 },
    'mixed': { hot: 3, cold: 3 }
};

/**
 * UI 관련 상수
 */
const UI_CONSTANTS = {
    // 애니메이션 시간 (ms)
    TOAST_DURATION: 3000,
    LOADING_MIN_DURATION: 500,
    FADE_DURATION: 300,

    // 크기
    BALL_SIZE_NORMAL: 40,
    BALL_SIZE_SMALL: 30,
    BALL_SIZE_LARGE: 50,

    // 색상 (CSS 변수 사용 권장)
    BALL_COLORS: {
        1: '#fbc400',   // 노란색 (1-10)
        11: '#69c8f2',  // 파란색 (11-20)
        21: '#ff7272',  // 빨간색 (21-30)
        31: '#aaa',     // 회색 (31-40)
        41: '#b0d840'   // 초록색 (41-45)
    }
};

/**
 * 캐시 관련 상수
 */
const CACHE_CONSTANTS = {
    // LocalStorage 키
    KEYS: {
        LOTTO645: 'LOTTO645_DATA_CACHE',
        LOTTO023: 'LOTTO023_DATA_CACHE',
        METADATA: 'LOTTO_METADATA_CACHE',
        USER_PREFERENCES: 'USER_PREFERENCES'
    },

    // 캐시 유효 기간 (ms)
    TTL: {
        DATA: 24 * 60 * 60 * 1000,      // 24시간
        STATS: 60 * 60 * 1000,          // 1시간
        UI_STATE: 7 * 24 * 60 * 60 * 1000  // 7일
    },

    // 최대 크기
    MAX_SIZE: 5 * 1024 * 1024  // 5MB
};

/**
 * API 관련 상수
 */
const API_CONSTANTS = {
    // 엔드포인트
    ENDPOINTS: {
        LATEST: '/api/lotto-latest',
        HISTORY: '/api/lotto-history',
        AI_CHAT: '/api/ai-chat'
    },

    // 타임아웃 (ms)
    TIMEOUT: {
        DEFAULT: 10000,
        AI: 30000
    },

    // 재시도
    RETRY: {
        MAX_ATTEMPTS: 3,
        DELAY: 1000
    }
};

/**
 * 에러 메시지
 */
const ERROR_MESSAGES = {
    NETWORK: '네트워크 오류가 발생했습니다.',
    DATA_LOAD: '데이터를 불러오는데 실패했습니다.',
    GENERATION: '번호 생성에 실패했습니다.',
    INVALID_INPUT: '잘못된 입력입니다.',
    API_KEY_MISSING: 'API 키가 설정되지 않았습니다.',
    CACHE_FULL: '저장 공간이 부족합니다.'
};

/**
 * 성공 메시지
 */
const SUCCESS_MESSAGES = {
    DATA_LOADED: '데이터를 성공적으로 불러왔습니다.',
    GENERATED: '번호가 생성되었습니다.',
    SAVED: '저장되었습니다.',
    COPIED: '클립보드에 복사되었습니다.'
};

/**
 * 개발 모드 플래그
 */
const DEV_MODE = {
    ENABLED: false,  // 프로덕션에서는 false
    LOG_LEVEL: 'info',  // 'debug', 'info', 'warn', 'error'
    SHOW_PERFORMANCE: false
};

/**
 * 신뢰도 100% 조합 시도 정책 상수
 *  - SYNC: app.js의 generateGame(auto/lucky) 단일 슬롯 시도 횟수
 *  - ASYNC: harmonyPool.js의 풀 보충 슬롯 시도 횟수(협력적/비동기)
 *  - YIELD_EVERY: ASYNC 시도 N회마다 setTimeout(0) 양보
 */
const HARMONY_POOL_CONSTANTS = {
    TRUST100_TRIES_SYNC: 100,
    TRUST100_TRIES_ASYNC: 200,
    TRUST100_YIELD_EVERY: 24,
    /** 정렬 보조용 평균합(`scorePendingLuckyPerfectKey`의 sumDist 기준값) */
    REF_AVG_SUM: 138
};

const DEFAULT_SET_COUNT = LOTTO_CONSTANTS.DEFAULT_SET_COUNT;

/** ShareHarmony · MyRisk 팔레트 (동행볼 제외, UI 일관용) — Common 기준 */
const SHAREHARMONY_PALETTE = {
    /* Brand / Navigation */
    primary: '#263238',
    primaryNavy: '#263238',
    primaryDark: '#1B2631',
    accent: '#5A6E7A',
    accentDark: '#37474F',
    accentLight: '#B0BEC5',
    /* 입금 / 출금 */
    income: '#1565C0',
    expense: '#C62828',
    incomeLight: '#90CAF5',
    expenseLight: '#EF9A9A',
    /* 텍스트 / 배경 */
    textPrimary: '#1A1A1A',
    textSecondary: '#334155',
    textMuted: '#5A6872',
    textDisabled: '#B5A5A8',
    pageBg: '#F0F2F5',
    white: '#FFFFFF',
    black: '#000000',
    bgLight: '#F0F2F5',
    bgLighter: '#E2E6EA',
    /* 테이블 기본값 */
    tableHeader: '#455A64',
    tableStripe: '#F7F8FA',
    tableHover: '#D8EAFE',
    tableSumRow: '#E2E8F0',
    /* 바디 / 상태 */
    border: '#D5DAE0',
    borderLight: '#E2E6EA',
    warning: '#E67E22',
    golden: '#F39C12',
    goldenLight: '#FDEBD0',
    goldenDark: '#D4860B',
    goldenTicket: '#D4AF37',
    error: '#C62828',
    /* 기본 3색 */
    myBankBlue: '#1565C0',
    myBankDark: '#0A3D91',
    myCardPurple: '#6A1B9A',
    myCardDark: '#38006B',
    myCashOrange: '#E65100',
    /* 호환 별칭 */
    greenAccent: '#5A6E7A',
    greenBtn: '#1565C0',
    greenBtnDark: '#0A3D91',
    aiOrange: '#E65100',
    aiOrangeBorder: '#BF360C',
    selectionBorder: '#1565C0'
};

// 브라우저 전역 객체에 할당 (일반 스크립트 호환)
if (typeof window !== 'undefined') {
    window.LOTTO_CONSTANTS = LOTTO_CONSTANTS;
    window.DRAW_SCHEDULE = DRAW_SCHEDULE;
    window.FILTER_TYPES = FILTER_TYPES;
    window.ODD_EVEN_RATIO_MAP = ODD_EVEN_RATIO_MAP;
    window.HOT_COLD_RATIO_MAP = HOT_COLD_RATIO_MAP;
    window.UI_CONSTANTS = UI_CONSTANTS;
    window.CACHE_CONSTANTS = CACHE_CONSTANTS;
    window.API_CONSTANTS = API_CONSTANTS;
    window.ERROR_MESSAGES = ERROR_MESSAGES;
    window.SUCCESS_MESSAGES = SUCCESS_MESSAGES;
    window.DEV_MODE = DEV_MODE;
    window.DEFAULT_SET_COUNT = DEFAULT_SET_COUNT;
    window.SHAREHARMONY_PALETTE = SHAREHARMONY_PALETTE;
    window.HARMONY_POOL_CONSTANTS = HARMONY_POOL_CONSTANTS;
}

// 전역으로 export (CommonJS 호환)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        LOTTO_CONSTANTS,
        DRAW_SCHEDULE,
        FILTER_TYPES,
        ODD_EVEN_RATIO_MAP,
        HOT_COLD_RATIO_MAP,
        UI_CONSTANTS,
        CACHE_CONSTANTS,
        API_CONSTANTS,
        ERROR_MESSAGES,
        SUCCESS_MESSAGES,
        DEV_MODE,
        DEFAULT_SET_COUNT,
        SHAREHARMONY_PALETTE,
        HARMONY_POOL_CONSTANTS
    };
}
