# Railway CLI 배포 스크립트 (Lotto645만)
# 사용 전 터미널에서 한 번 실행: railway login

$ErrorActionPreference = "Stop"
$projectDir = "d:\OneDrive\Cursor_AI_Project\Lotto_v200"

Write-Host "=== Railway deploy (Lotto645만) ===" -ForegroundColor Cyan
Write-Host ""

# 로그인 확인
$whoami = railway whoami 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Railway not logged in. Run this in your terminal first:" -ForegroundColor Yellow
    Write-Host "  railway login" -ForegroundColor White
    Write-Host ""
    exit 1
}
Write-Host "Logged in: $whoami" -ForegroundColor Green
Write-Host ""

Set-Location $projectDir
if (-not (Test-Path ".railway")) {
    Write-Host "Not linked. Run: railway link" -ForegroundColor Yellow
    railway link
}
railway up
if ($LASTEXITCODE -ne 0) { Write-Host "Lotto645 deploy failed." -ForegroundColor Red; exit 1 }
Write-Host "Lotto645 deploy done." -ForegroundColor Green
Write-Host ""
Write-Host "Done. Create domain in Railway dashboard: Settings -> Networking -> Generate Domain" -ForegroundColor Cyan
