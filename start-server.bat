@echo off
chcp 65001 >nul
cd /d "%~dp0"
REM PATH에 Python이 없을 수 있으므로 설치 경로 직접 사용
set PY_EXE=
where python >nul 2>&1 && set PY_EXE=python
if not defined PY_EXE where py >nul 2>&1 && set PY_EXE=py
if not defined PY_EXE if exist "C:\Python314\python.exe" set PY_EXE=C:\Python314\python.exe
if not defined PY_EXE (
    echo Python을 찾을 수 없습니다. PATH에 추가했으면 새 터미널을 열어 주세요.
    pause
    exit /b 1
)
"%PY_EXE%" server.py
pause
