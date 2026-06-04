@echo off
echo ========================================================
echo Starting Smart Project Tracker Multi-Agent System...
echo ========================================================

:: Check python is available
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed or not in PATH!
    pause
    exit /b
)

:: Check npm is available
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node/NPM is not installed or not in PATH!
    pause
    exit /b
)

:: Launch FastAPI backend
echo Launching Backend FastAPI Server (Port 8000)...
start "SmartTracker-Backend" cmd /c "python -m uvicorn backend.app:app --reload --host 127.0.0.1 --port 8000"

:: Launch Vite frontend
echo Launching Frontend Vite Dev Server (Port 5173)...
start "SmartTracker-Frontend" cmd /c "cd frontend && npm run dev"

echo ========================================================
echo Startup commands issued!
echo Backend API URL: http://127.0.0.1:8000
echo Frontend Dev URL: http://localhost:5173
echo ========================================================
echo Keep this window open or press any key to close this launcher.
pause
