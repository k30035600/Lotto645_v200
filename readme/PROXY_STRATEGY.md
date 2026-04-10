# 동행복권 접속 제한 우회 전략 (Akamai 등 보안 솔루션 대응)

동행복권 사이트가 클라우드 IP·자동화 요청을 감지해 "서비스 접근 대기" 또는 "차단" 페이지를 반복 보여주는 것은 **보안 솔루션(Akamai 등)** 때문입니다. 단순 요청에서 **실제 사용자 행동을 모방**하는 방식으로 전환해야 합니다.

---

## 0. 껍데기 페이지 현상 (lotto_ok.html 분석)

수신한 HTML 파일 크기가 수백 KB로 커도 **당첨 정보(.result-txt, .result-ball)가 비어 있거나 서버 스크립트로 가려진 경우**가 있습니다.

- **원인**: 클라우드 환경(AWS, GCP 등)에서 urllib 등으로 요청 시, 동행복권 보안 솔루션이 해당 요청을 **비정상 봇**으로 간주합니다.
- **결과**: 실제 당첨 데이터 대신 **UI 레이아웃만 있는 대기/껍데기 페이지**가 응답으로 옵니다.
- **대응**: IP 평판을 우회하기 위해 **Residential Proxy(한국 주거용 IP)** 도입이 가장 효과적입니다. 단순 헤더 수정만으로는 한계가 있습니다.

| 구분 | 설명 |
|------|------|
| 데이터센터 IP 차단 | AWS·GCP 등 클라우드 IP 대역은 블랙리스트에 있어 접근이 즉시 제한됩니다. |
| 주거용 IP 위장 | 프록시를 통해 **한국 내 일반 가정집·모바일망 IP**로 우회하면, 보안 솔루션이 '실제 사용자'로 인식합니다. |
| 대기열 회피 | 신뢰할 수 있는 IP로 접속하면 "서비스 접근 대기" 없이 바로 데이터를 받을 확률이 높아집니다. |

---

## 1. 접속 차단 우회 전략 (Step-by-Step, 영문 기술명)

| 단계 | 영문 기술명 | 설명 | 코드 반영 |
|------|-------------|------|------------|
| 1 | **Browser Fingerprinting 위장** | navigator.webdriver·폰트·해상도 등 봇 흔적 제거 | ✅ Stealth 플러그인 (playwright-stealth) |
| 2 | **Residential Proxy** | 데이터센터 IP 대신 가정용(ISP) IP 경유 | ✅ DHLOTTERY_PROXY |
| 3 | **Request Throttling** | 페이지 접속 후 2~5초 랜덤 대기, 비정상 트래픽 패턴 완화 | ✅ PLAYWRIGHT_THROTTLE_MIN/MAX |
| 4 | **Cookies 유지** | 메인 페이지(index/메인) 선방문 → 세션 쿠키 생성 후 결과 페이지 이동 | ✅ DHLOTTERY_MAIN_URL 선방문 |
| 5 | **Exponential Backoff** | 대기 페이지 감지 시 재시도 대기 시간을 지수적으로 증가 (4→8→16→32초) | ✅ FETCH_RETRY_WAIT_BASE * 2^(attempt-1) |

---

## 2. 적용 중인 전략 요약

| 전략 | 설명 | 적용 |
|------|------|------|
| HTTP 헤더 위장 | User-Agent·Referer·Accept 등 브라우저형 헤더 | ✅ |
| 대기/차단 + Exponential Backoff | 대기 페이지 감지 시 4→8→16→32초 재시도 (상한 60초) | ✅ |
| Request Throttling | 첫 요청 전 1~3초, Playwright 메인→결과 사이 2~5초 랜덤 대기 | ✅ |
| Headless + Stealth | Playwright + playwright-stealth (Browser Fingerprinting 위장) | ✅ |
| Cookies 유지 | 메인 페이지 선방문 후 결과 페이지 이동 | ✅ |
| **Residential Proxy** | **주거용 IP 경유** | ✅ |

---

## 3. 기술적 체크리스트

- [x] **Stealth 적용**: playwright-stealth로 stealth 모드 활성화
- [ ] **IP 위치**: 요청 IP가 해외인지 확인 (동행복권은 해외 IP 차단 엄격) → 해외면 Residential Proxy 권장
- [x] **Cookies 유지**: 메인 페이지 선방문 후 당첨 결과 페이지 이동
- [x] **Retry Logic**: 대기 페이지 감지 시 Exponential Backoff로 재시도

**실행 환경**: AWS/GCP 등 클라우드면 `DHLOTTERY_PROXY`(Residential Proxy) 설정이 가장 효과적입니다. 로컬 PC(가정용 IP)에서는 위 설정만으로 동작할 수 있습니다.

---

## 4. Residential Proxy(주거용 IP) 전략

### 목적

- 클라우드 서버(AWS, GCP, Azure 등) IP는 동행복권에서 차단될 수 있음.
- **일반 가정용 IP**를 쓰는 프록시를 경유하면, 동행복권 입장에서는 일반 사용자 PC 접속과 구분이 어렵게 됨.

### 환경변수

| 변수 | 필수 | 설명 |
|------|------|------|
| `DHLOTTERY_PROXY` | 예 | 프록시 URL. 예: `http://proxy.example.com:8080` 또는 `http://user:pass@host:port` |
| `DHLOTTERY_PROXY_USER` | 아니오 | 인증 아이디 (URL에 포함해도 됨) |
| `DHLOTTERY_PROXY_PASS` | 아니오 | 인증 비밀번호 |

### 적용 경로

- **Playwright**: `browser.new_context(proxy={ server, username?, password? })` 로 해당 프록시 경유.
- **urllib (폴백)**: `ProxyHandler({'http': url, 'https': url})` 로 동일 프록시 경유.

### 사용 예

```bash
# 인증 없음
export DHLOTTERY_PROXY=http://residential-proxy.example.com:8080

# 인증 (URL에 포함)
export DHLOTTERY_PROXY=http://myuser:mypass@residential-proxy.example.com:8080

# 인증 (별도 변수)
export DHLOTTERY_PROXY=http://residential-proxy.example.com:8080
export DHLOTTERY_PROXY_USER=myuser
export DHLOTTERY_PROXY_PASS=mypass
```

### 프록시 유형 선택 (어떤 프록시를 쓰느냐가 성공의 대부분을 결정)

| 유형 | 설명 | 추천 여부 |
|------|------|-----------|
| Public Proxy | 무료 공개 프록시 | 비추천 (속도 느림, 대부분 이미 차단됨) |
| Datacenter Proxy | 다른 클라우드의 IP | 보통 (저렴하지만 동행복권에서 막힐 가능성 있음) |
| **Residential Proxy** | **실제 한국 가정집 IP** | **강력 추천** (차단 우회 성공률 가장 높음) |

### 서비스 예 (참고)

- Residential Proxy를 제공하는 업체: Bright Data, Oxylabs, Smartproxy, IPRoyal 등 (유료).
- 선택 시 **한국/아시아 리전·주거용 IP** 옵션이 있으면 동행복권 접속에 유리할 수 있음.

### 프록시 도입 체크리스트

- [ ] **한국 IP 여부**: 프록시 서버 위치가 **대한민국(South Korea)**이어야 합니다. (해외 IP는 대부분 차단됨)
- [ ] **HTTP/HTTPS 지원**: 동행복권은 HTTPS를 사용하므로 보안 프로토콜을 지원하는 프록시여야 합니다.
- [ ] **세션 유지**: 첫 페이지(메인) 접속 시 받은 쿠키를 다음 요청에도 사용하도록 **CookieJar**가 코드에 적용되어 있는지 확인합니다. (본 프로젝트 `server.py`의 urllib 경로에는 `http.cookiejar` + 메인 페이지 선방문이 적용되어 있습니다.)

---

## 5. 동작 순서

1. `USE_PLAYWRIGHT=1`(기본): Playwright+Stealth 시도 → **프록시 설정 시 동일 프록시 사용**.
2. 실패/미설치/대기 페이지: urllib + 헤더·재시도 → **프록시 설정 시 동일 프록시 사용**.
3. `USE_PLAYWRIGHT=0`: 처음부터 urllib만 사용 (프록시 설정 시 적용).

---

## 5-1. 수행 방법 (전략 실행 절차)

아래 순서대로 진행하면 PROXY_STRATEGY 전략이 코드에서 실행됩니다.

### 1) 환경 준비

```powershell
# 프로젝트 폴더로 이동
cd d:\OneDrive\Cursor_AI_Project\Lotto_v200

# 의존성 설치 (Playwright 사용 시)
pip install -r requirements.txt
playwright install chromium
```

### 2) 환경변수 설정 (선택)

- **로컬(가정용 IP)**: 설정 없이 진행 가능.
- **클라우드 또는 차단 시**: `.env`에 Residential Proxy 설정.

```powershell
# .env 파일에 추가 (한국 주거용 프록시 강력 추천)
DHLOTTERY_PROXY=http://kr.residential-proxy.example.com:8080
DHLOTTERY_PROXY_USER=your_user
DHLOTTERY_PROXY_PASS=your_pass
```

### 3) 서버 실행

```powershell
python server.py
```

- 기본 포트 8000. 브라우저에서 `http://localhost:8000` 접속.

### 4) 전략 수행 (당첨번호 조회 트리거)

- 화면에서 **「회차별 당첨번호」** 클릭 → `/api/lotto-latest` 호출 → Playwright 또는 urllib로 동행복권 접속·파싱.
- 또는 직접 호출:

```powershell
curl http://localhost:8000/api/lotto-latest
```

- 수신 HTML은 `lotto_ok.html`에 저장됨. `.result-txt`, `.result-ball`이 채워져 있으면 정상 수신.

### 5) 결과 확인

- API 응답에 `drwNo`, `drwtNo1`~`drwtNo6`, `bnusNo` 등이 있으면 **전략 수행 성공**.
- `lotto_ok.html`이 껍데기만 있으면 클라우드 IP일 가능성 큼 → **DHLOTTERY_PROXY(한국 Residential)** 설정 후 재시도.

---

## 6. 동행복권 로그인 (선택)

로그인 후 파싱하면 차단·대기 페이지를 덜 받을 수 있습니다. **Playwright 사용 시에만** 적용됩니다.

1. 프로젝트 루트에 `.env` 파일을 만들고 (`.env.example`을 복사해 사용 가능)
2. 다음 변수만 설정합니다. **실제 비밀번호는 .env에만 넣고, Git에 커밋하지 마세요.**

```bash
DHLOTTERY_USER=동행복권_아이디
DHLOTTERY_PASSWORD=동행복권_비밀번호
```

3. 서버 실행 전에 `.env`를 로드해야 합니다.
   - Windows: `set DHLOTTERY_USER=아이디` 등으로 수동 설정하거나, `python-dotenv` 사용 시 앱이 자동 로드.
   - `python-dotenv`를 쓰려면: `pip install python-dotenv`, `server.py` 상단에 `from dotenv import load_dotenv; load_dotenv()` 추가.

---

## 6-1. 동행복권 로그인 불가 이유

환경변수 `DHLOTTERY_USER` / `DHLOTTERY_PASSWORD`를 설정해도 **로그인이 되지 않는** 경우가 있습니다. 주요 원인은 아래와 같습니다.

### 1) RSA 암호화 (가장 큰 원인)

동행복권 로그인 페이지는 **비밀번호를 RSA로 암호화**한 뒤 전송합니다.

- **서버**: RSA 공개키를 페이지(JavaScript)로 내려보내고, 개인키는 세션에 보관.
- **브라우저**: 사용자가 입력한 ID·비밀번호를 **RSA 공개키로 암호화**해 hidden 필드 등에 넣고 전송.
- **현재 코드**: `page.fill('input[name="password"]', dhl_pass)` 로 **평문 비밀번호**만 입력하고 제출합니다. 서버는 **암호화된 값**을 기대하므로 복호화 실패·로그인 거부가 발생합니다.

즉, **평문을 그대로 보내면 서버가 받아들이지 않습니다.** 페이지에 로드된 RSA 스크립트(`rsa.js`, `jsbn.js` 등)를 실행해 암호화한 값을 넣어야 합니다.

### 2) 폼 구조·필드명 차이

- 실제 로그인 폼은 `encryptedPwd` 또는 비밀번호 암호문을 넣는 **hidden input**을 사용할 수 있습니다.
- 제출 시 **평문 password 필드는 비우고**, 암호화된 값만 보내는 구조일 수 있어, 단순 `fill` + `click submit`으로는 통과하지 못합니다.

### 3) 로그인 URL·리다이렉트

- 코드는 `user.do?method=login&returnUrl=` 로 접속합니다.
- 사이트에 따라 **`/login`** 등으로 리다이렉트되거나, 모바일 전용 경로(`method=loginm`)가 따로 있을 수 있습니다. 이때 폼 셀렉터(`input[name="userId"]` 등)가 달라질 수 있습니다.

### 4) 기타 가능성

- **캡차(CAPTCHA)** 또는 휴대폰 인증이 로그인 전/후에 있을 수 있음.
- **쿠키·세션**: RSA 공개키가 세션과 묶여 있어, 로그인 페이지 진입 전에 다른 페이지를 먼저 거쳐야 할 수 있음.

### 대응 방향

| 대응 | 설명 |
|------|------|
| **로그인 없이 사용** | 당첨 결과 페이지는 **비로그인**으로도 열립니다. **Residential Proxy(한국 주거용 IP)** 만으로도 껍데기 페이지를 피하고 데이터를 받는 것이 우선입니다. |
| **RSA 적용 (추후)** | Playwright에서 로그인 페이지 로드 후, **페이지 내 RSA 스크립트를 실행**해 비밀번호를 암호화하고, 그 결과를 hidden 필드에 넣은 뒤 제출하도록 코드를 수정해야 합니다. |
| **수동 쿠키** | 브라우저에서 직접 로그인한 뒤 **쿠키를 복사**해 `DHLOTTERY_COOKIE` 환경변수에 넣는 방식은, urllib/Playwright 요청에 해당 쿠키를 실어 보내는 용도로만 사용 가능합니다. (세션 만료 시 다시 복사 필요) |

**정리**: 현재 구현은 **RSA 암호화를 수행하지 않아** 동행복권 자동 로그인이 되지 않습니다. 당첨번호 조회만 필요하다면 **로그인 없이 프록시만** 사용하는 것을 권장합니다.

---

## 7. 체크리스트

- [ ] 개인 PC(가정용 IP)에서 프록시 없이 동작 여부 확인.
- [ ] 클라우드(AWS Lambda, GitHub Actions, GCP 등)에서 차단되면 `DHLOTTERY_PROXY` 로 **Residential Proxy** 설정. (클라우드 환경에서는 프록시 도입이 유일한 해결책일 수 있음)
- [ ] 인증 필요 시 `DHLOTTERY_PROXY_USER` / `DHLOTTERY_PROXY_PASS` 또는 URL 내 `user:pass@` 사용.
- [ ] **한국 IP**: 프록시 업체에서 **대한민국(South Korea)·주거용** IP 옵션 확인.
- [ ] **세션 유지**: urllib 사용 시 CookieJar + 메인 페이지 선방문이 적용되어 있는지 확인 (본 프로젝트는 적용됨).
