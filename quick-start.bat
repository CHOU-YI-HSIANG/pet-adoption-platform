@echo off
chcp 65001 >nul
cls

echo ========================================
echo Pet Adoption Platform - Quick Start
echo ========================================
echo.

REM Stop any running Node processes
echo Stopping existing processes...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 /nobreak >nul

REM Start Backend
echo Starting Backend Server...
cd backend
start "Pet Adoption Backend" cmd /k "npm run dev"
cd ..

REM Wait for backend to start
timeout /t 5 /nobreak >nul

REM Start Frontend
echo Starting Frontend Application...
cd frontend
start "Pet Adoption Frontend" cmd /k "npm start"
cd ..

echo.
echo ========================================
echo Servers Starting!
echo ========================================
echo Backend:  http://localhost:5000
echo Frontend: http://localhost:3000
echo API Docs: http://localhost:5000/api-docs
echo ========================================
echo.
echo Wait 30-60 seconds for frontend to fully start
echo Browser will open automatically
echo.
pause
