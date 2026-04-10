# Railway 배포 — Lotto645만

**이 저장소(Lotto645)만** Railway로 배포하는 방법입니다. (금융거래 통합정보 등 다른 repo는 배포하지 않음)

---

## Lotto645만 수행 (요약)

**방법 A: 웹 대시보드 (CLI 로그인 없이)**  
1. 브라우저에서 [railway.com/new/github](https://railway.com/new/github) 열기  
2. GitHub 로그인 → **Deploy from GitHub repo** → **이 저장소(Lotto_v200 또는 Lotto645)** 선택 → Deploy  
3. 배포 완료 후: **서비스 클릭** → **Settings** → **Networking** → **Generate Domain**  
4. 생성된 URL로 접속 (예: `https://lotto645-production-xxxx.up.railway.app`)

**방법 B: CLI**  
1. 터미널에서 **한 번** 로그인: `railway login` (브라우저에서 로그인 완료)  
2. 프로젝트 폴더에서 배포: `cd "d:\OneDrive\Cursor_AI_Project\Lotto_v200"` → `.\deploy-railway.ps1`  
   - 처음이면 `railway link`로 새 프로젝트/서비스 연결 후 `railway up`  
3. 대시보드에서 **Generate Domain** 생성

---

## 지금 순서대로 하기 (웹 대시보드)

브라우저에서 **https://railway.com/new/github** 가 열려 있으면 아래 순서대로 진행하세요.

### 1단계: Lotto645 배포

| # | 할 일 | 확인 |
|---|--------|------|
| 1 | Railway 로그인 (GitHub로 로그인) | ☐ |
| 2 | **Deploy from GitHub repo** 선택 | ☐ |
| 3 | 저장소 목록에서 **Lotto645** 선택 → Deploy | ☐ |
| 4 | 배포 완료 후: 해당 **서비스 클릭** → **Settings** 탭 → **Networking** → **Public Networking** 섹션 → **Generate Domain** 버튼 | ☐ |
| 5 | 생성된 URL 복사 (예: `https://lotto645-production-xxxx.up.railway.app`) | ☐ |

**Generate Domain이 안 보일 때** → 아래 [도메인 생성 위치 / 안 보일 때](#도메인-생성-위치--안-보일-때) 참고.

### 2단계: 금융거래 통합정보 배포

| # | 할 일 | 확인 |
|---|--------|------|
| 1 | 같은 프로젝트에서 **New** → **GitHub Repo** (또는 **New Project** 후 GitHub Repo) | ☐ |
| 2 | 저장소 **financial-info** 선택 → Deploy | ☐ |
| 3 | **Settings** → **Networking** → **Public Networking** → **Generate Domain** | ☐ |
| 4 | 금융거래 URL 복사 (예: `https://financial-info-production-xxxx.up.railway.app`) | ☐ |

### 3단계: Lotto645에 금융거래 링크 넣기

금융거래 통합정보 Railway URL을 알게 되면:

1. **Lotto_v200/index.html** 134번째 줄 근처에서 `id="financial-info-link"`인 `<a>` 찾기.
2. **data-url**과 **href** 값을 금융거래 Railway URL로 변경.
3. 저장 후 `git add index.html` → `git commit -m "Link financial-info Railway URL"` → `git push` (Railway가 GitHub 연동이면 자동 재배포).

---

### Railway 프로젝트 이름 구분하기 (lovely-purpose, noble-bravery 등)

Railway는 새 프로젝트에 **자동 이름**(lovely-purpose, protective-tenderness, noble-bravery, hearty-grace 등)을 붙입니다. 뭐가 Lotto645이고 뭐가 금융거래 통합정보인지 구분하려면:

**1) 프로젝트를 클릭해서 안을 봅니다.**

- 프로젝트 이름(예: lovely-purpose)을 **클릭**해서 캔버스로 들어갑니다.
- 캔버스에 **서비스 카드**가 보입니다. 그 카드에 **연결된 GitHub 저장소 이름** 또는 **서비스 이름**이 표시됩니다.
  - **Lotto645** 저장소가 연결된 서비스가 있으면 → 그 프로젝트가 **Lotto645**용입니다.
  - **financial-info** 저장소가 연결된 서비스가 있으면 → 그 프로젝트가 **금융거래 통합정보**용입니다.
- 서비스 카드를 클릭한 뒤 **Settings** → **Source** 또는 **연결된 저장소**를 보면 `k30035600/Lotto645`, `k30035600/financial-info` 처럼 저장소 이름으로 확인할 수 있습니다.

**2) 프로젝트 이름을 바꿉니다 (선택).**

- 대시보드에서 해당 **프로젝트**를 연 다음, **Project Settings**(프로젝트 이름 옆 톱니바퀴 또는 메뉴)로 들어갑니다.
- **General** 또는 **Project name** 에서 이름을 **Lotto645**, **financial-info** 처럼 구분되게 바꾼 뒤 저장합니다.
- 이렇게 하면 나중에 목록에서 바로 구분할 수 있습니다.

**3) 불필요한 프로젝트 삭제 (hearty-grace, noble-bravery 등 제거).**

- [railway.com/dashboard](https://railway.com/dashboard) 에서 삭제할 **프로젝트**(예: hearty-grace, noble-bravery)를 **클릭**해서 들어갑니다.
- **Project Settings**로 이동합니다. (프로젝트 이름 옆 톱니바퀴 또는 상단/왼쪽 메뉴에서 **Settings**.)
- 맨 아래 **Danger** 탭(또는 섹션)을 엽니다.
- **Delete Project** (또는 "프로젝트 삭제") 버튼을 누르고, 확인 시 프로젝트 이름을 입력한 뒤 삭제합니다.
- **hearty-grace**, **noble-bravery** 각각에 대해 위 단계를 반복하면 두 프로젝트가 제거됩니다.

---

### 도메인 생성 위치 / 안 보일 때

**중요: Project Settings가 아닙니다.**  
Project Settings(일반, usage, members 등)에는 Networking이 없습니다. **서비스(Service) 설정**에 있습니다.

**정확한 위치**

1. **프로젝트 캔버스**에서 **배포한 서비스 카드**(예: Lotto645, financial-info 이름이 적힌 박스)를 **클릭**합니다.  
   → 상단/왼쪽에 프로젝트 이름이 아니라 **서비스 이름**이 보이는 화면이 됩니다.
2. 그 서비스 화면에서 **Settings** 탭(또는 톱니바퀴/설정 메뉴)을 선택합니다.  
   → 여기에는 **Networking**, Variables 등이 보입니다 (general, usage, members가 아님).
3. **Networking** 섹션을 펼칩니다.
4. 그 안에 **Public Networking** 이 있고, 그 안에 **Generate Domain** 버튼이 있습니다.  
   (UI에 따라 **Networking** 아래에 **Generate Domain** 이 바로 보이거나, **Public Networking** 블록 안에 있을 수 있습니다.)

**다른 위치에서 보일 수 있음**

- **캔버스의 서비스 타일**: 배포가 끝나고 앱이 포트를 잘 리스닝하면, 서비스 카드에 “도메인 생성” 또는 “Generate Domain” 안내가 뜨는 경우가 있습니다. 그 안내를 따라가도 됩니다.
- **서비스 패널**: 서비스를 클릭했을 때 열리는 패널 상단/중간에 도메인 생성 프롬프트가 나올 수 있습니다.

**Generate Domain 버튼이 전혀 안 보일 때**

- **TCP Proxy가 켜져 있으면** HTTP 도메인 생성이 숨겨집니다.  
  **Settings** → **Networking** (또는 **Public Networking**) 에서 **TCP Proxy** 가 있으면 **휴지통 아이콘**으로 제거한 뒤, 다시 **Generate Domain** 이 보이는지 확인하세요.
- **배포가 아직 진행 중**이면 도메인 메뉴가 비활성화되어 있을 수 있습니다. 빌드/배포가 완료된 뒤 다시 확인하세요.

공식 문서: [Public Networking - Railway Docs](https://docs.railway.com/guides/public-networking)

---

## 방법 1: Railway 웹 대시보드 (권장)

### Lotto645

1. [railway.com](https://railway.com) 로그인 (GitHub 연동).
2. **New Project** → **Deploy from GitHub repo**.
3. **Lotto645** 저장소 선택 → 배포 자동 시작.
4. 배포 완료 후: 해당 **서비스 클릭** → **Settings** 탭 → **Networking** → **Public Networking** → **Generate Domain**.
5. 접속: `https://생성된도메인.up.railway.app`

### 금융거래 통합정보

1. **New Project** (또는 같은 프로젝트에서 **New** → **GitHub Repo**).
2. **financial-info** 저장소 선택 → 배포 자동 시작.
3. **Settings** → **Networking** → **Public Networking** → **Generate Domain**.
4. 접속: `https://생성된도메인.up.railway.app`

---

## 방법 2: Railway CLI

CLI는 한 번 로그인·연결 후 `railway up`으로 배포할 수 있습니다.

### 1) 로그인 (최초 1회, 터미널에서 직접 실행)

```powershell
railway login
```

브라우저가 열리면 로그인을 완료하세요.

### 2) Lotto645 배포

```powershell
cd "d:\OneDrive\Cursor_AI_Project\Lotto_v200"
railway link
```

- **Create new project** 선택 후 프로젝트 이름 입력 (예: Lotto645).
- 서비스가 생성되면:

```powershell
railway up
```

- 도메인 생성: Railway 대시보드에서 해당 서비스 → **Settings** → **Networking** → **Generate Domain**.

### 3) 금융거래 통합정보 배포

```powershell
cd "d:\OneDrive\Cursor_AI_Project\financial-info"
railway link
```

- **Create new project** 또는 기존 프로젝트 선택.
- 서비스 연결 후:

```powershell
railway up
```

- 도메인 생성: 대시보드에서 **Generate Domain**.

### 4) 이후 재배포

두 저장소 모두 코드 수정 후:

```powershell
# Lotto645
cd "d:\OneDrive\Cursor_AI_Project\Lotto_v200"
git add . ; git commit -m "update" ; git push
railway up

# 금융거래 통합정보
cd "d:\OneDrive\Cursor_AI_Project\financial-info"
git add . ; git commit -m "update" ; git push
railway up
```

GitHub에 푸시한 뒤 Railway 대시보드에서 **Deploy from GitHub**로 연결해 두었다면, 푸시만 해도 자동 재배포됩니다.

---

## 배포 후: Lotto645에 금융거래 링크 넣기

금융거래 통합정보 Railway URL을 알게 되면:

1. **Lotto_v200/index.html**에서 `id="financial-info-link"`인 `<a>` 찾기.
2. **data-url**에 금융거래 URL 넣기.  
   예: `data-url="https://financial-info-production-xxxx.up.railway.app"`
3. 저장 후 커밋·푸시하면 Lotto645 배포에 반영됩니다.
