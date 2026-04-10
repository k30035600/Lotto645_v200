# Git · GitHub · 배포 가이드 (Lotto645만)

**이 저장소(Lotto645)만** Git · GitHub · 배포하는 흐름입니다. (금융거래 통합정보 등 다른 repo 제외)

---

## 1. Git (로컬)

### 1-1. 초기 설정 (최초 1회)

```powershell
cd "d:\OneDrive\Cursor_AI_Project\Lotto_v200"

# 사용자 정보 (전역)
git config --global user.name "Your Name"
git config --global user.email "your@email.com"

# 저장소 초기화 (이미 .git 있으면 생략)
git init
```

### 1-2. 원격 저장소 연결

```powershell
# GitHub 저장소가 이미 있으면
git remote add origin https://github.com/YOUR_USERNAME/Lotto_v200.git

# 연결 확인
git remote -v
```

### 1-3. 일상 작업 (커밋 · 푸시)

```powershell
# 상태 확인
git status

# 변경 파일 스테이징
git add .
# 또는 특정 파일만
git add server.py index.html

# 커밋 (PowerShell에서는 따옴표로 한 줄)
git commit -m "동행복권 우회 로직 추가"

# GitHub로 푸시 (main 브랜치)
git push -u origin main
```

### 1-4. 브랜치

```powershell
# 새 브랜치 생성 후 이동
git checkout -b feature-xyz

# 작업 후 main에 합치기
git checkout main
git merge feature-xyz
git push origin main
```

### 1-5. 제외 파일 (.gitignore)

다음은 이미 `.gitignore`에 포함되어 커밋되지 않습니다.

- `.env` (비밀번호·프록시 등)
- `node_modules/`, `*.log`, `.vscode/` 등

**주의**: `.env`는 절대 푸시하지 마세요. 배포 시에는 Railway/Render **환경변수**로 설정합니다.

---

## 2. GitHub (원격)

### 2-1. 저장소 만들기

1. [GitHub](https://github.com) 로그인
2. **New repository** → 이름 예: `Lotto_v200`
3. **Create repository** 후 나오는 URL 복사 (예: `https://github.com/YOUR_USERNAME/Lotto_v200.git`)

### 2-2. 푸시

```powershell
git push -u origin main
```

이후에는 `git push` 만 해도 됩니다.

### 2-3. GitHub와 배포 서비스 연동

- **Railway / Render** 등에서 **Deploy from GitHub repo** 선택 후 이 저장소를 연결하면, **푸시할 때마다 자동 배포**됩니다.

---

## 3. 배포

### 3-1. 배포 문서 위치

| 문서 | 내용 |
|------|------|
| **[DEPLOY.md](DEPLOY.md)** | Lotto645 배포 개요 |
| **[DEPLOY_RAILWAY.md](DEPLOY_RAILWAY.md)** | Railway 대시보드·CLI 배포 (권장) |
| **[DEPLOY_ALTERNATIVES.md](DEPLOY_ALTERNATIVES.md)** | Render, Fly.io 대안 |

### 3-2. Railway 배포 (Lotto645만)

1. [railway.com](https://railway.com) 로그인 (GitHub 연동)
2. **Deploy from GitHub repo** → **이 저장소(Lotto_v200)** 선택
3. 배포 완료 후: 해당 **서비스** → **Settings** → **Networking** → **Generate Domain**
4. URL 예: `https://lotto645-production-xxxx.up.railway.app`

**CLI로 배포** (이미 `railway login` 한 경우):

```powershell
cd "d:\OneDrive\Cursor_AI_Project\Lotto_v200"
.\deploy-railway.ps1
```

(`deploy-railway.ps1`은 **이 저장소(Lotto645)만** 배포합니다.)

### 3-3. Render 배포 (요약)

- 이 저장소에는 **render.yaml** 이 있습니다.
- [Render](https://render.com) 로그인 → **New** → **Web Service** → GitHub에서 이 저장소 연결
- Render가 `render.yaml` 을 읽어 서비스를 생성합니다. (`buildCommand`, `startCommand` 등)

### 3-4. 배포 시 환경변수 (동행복권 우회)

클라우드에서는 동행복권 IP 차단으로 **껍데기 페이지**만 받을 수 있습니다. 배포 플랫폼에서 다음을 설정하세요.

| 변수 | 설명 |
|------|------|
| `DHLOTTERY_PROXY` | Residential Proxy URL (한국 주거용 IP 권장) |
| `DHLOTTERY_PROXY_USER` | (선택) 프록시 인증 아이디 |
| `DHLOTTERY_PROXY_PASS` | (선택) 프록시 인증 비밀번호 |
| `USE_PLAYWRIGHT` | `1`(기본) 또는 `0`(urllib만) |

- **Railway**: 서비스 → **Variables** 탭에서 추가
- **Render**: 서비스 → **Environment** 에서 추가

`.env`는 Git에 넣지 말고, 위처럼 **플랫폼 환경변수**로만 설정합니다.

---

## 4. 한 번에 정리 (Git → GitHub → 배포)

```powershell
# 1) 프로젝트 폴더로 이동
cd "d:\OneDrive\Cursor_AI_Project\Lotto_v200"

# 2) 변경 사항 스테이징 · 커밋
git add .
git commit -m "작업 내용 요약"

# 3) GitHub로 푸시 (연동된 Railway/Render는 자동 배포)
git push origin main

# 4) 배포 URL에서 동작 확인 (Railway/Render 대시보드에서 URL 확인)
```

---

## 5. 자주 쓰는 명령어

| 목적 | 명령어 (PowerShell) |
|------|----------------------|
| 상태 확인 | `git status` |
| 최근 커밋 보기 | `git log -3` |
| 원격 URL 확인 | `git remote -v` |
| pull 후 푸시 | `git pull; git push` |
| 커밋 메시지 수정 (직전 1개) | `git commit --amend -m "새 메시지"` |

PowerShell에서는 여러 명령을 한 줄에 쓸 때 `&&` 대신 **`;`** 를 사용합니다.
