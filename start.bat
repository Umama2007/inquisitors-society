@echo off
REM Inquisitors Society Platform — Start Script (Windows)
REM Run this from the project root directory.

echo ============================================
echo  Inquisitors Society Platform
echo ============================================
echo.

REM Check for .env
if not exist ".env" (
    echo [!] .env file not found. Copying from .env.example...
    copy ".env.example" ".env"
    echo [!] Please edit .env with your actual values before continuing.
    pause
    exit /b 1
)

echo Syncing .env to backend and frontend...
copy ".env" "backend\.env" >nul
copy ".env" "frontend\.env" >nul

REM Start backend
echo [1/2] Starting backend server...
start "Inquisitors Backend" cmd /k "cd backend && npm install && npm run dev"

REM Wait for backend to be ready
echo Waiting for backend (5s)...
timeout /t 5 /nobreak >nul

REM Start frontend
echo [2/2] Starting Next.js frontend...
start "Inquisitors Frontend" cmd /k "cd frontend && npm install && npm run dev"

echo.
echo Both servers are starting:
echo   Backend:  http://localhost:5000
echo   Frontend: http://localhost:3000
echo.

echo Opening frontend in browser...
start http://localhost:3000

echo Press any key to exit this window (servers keep running).
pause >nul
