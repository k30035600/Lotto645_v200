# Lotto645 배포

**이 저장소(Lotto645)만** 배포합니다. — Flask 로또 앱 (동행복권 결과 파싱, 회차별 당첨번호 등)

---

## Git · GitHub · 배포

| 문서 | 내용 |
|------|------|
| **[GIT_GITHUB_DEPLOY.md](GIT_GITHUB_DEPLOY.md)** | Git → GitHub 푸시 → 배포(Railway/Render) 한 흐름 (Lotto645만) |
| **[DEPLOY_RAILWAY.md](DEPLOY_RAILWAY.md)** | Railway 대시보드·CLI 배포 (권장) |
| **[DEPLOY_ALTERNATIVES.md](DEPLOY_ALTERNATIVES.md)** | Render, Fly.io 대안 |

---

## 요약

| 구분 | 저장소 / 경로 | 배포 |
|------|----------------|------|
| **Lotto645** | 이 저장소 루트 | Railway / Render Web Service |

---

## 참고 (배포용 파일)

| 파일 | 역할 |
|------|------|
| `Procfile` | `web: gunicorn server:app --bind 0.0.0.0:$PORT` |
| `nixpacks.toml` | Railway 빌드 설정 |
| `runtime.txt` | Python 버전 (선택) |
