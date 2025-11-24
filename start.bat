@echo off
chcp 65001 >nul
cls
echo ========================================
echo Pet Adoption Platform - Start Script
echo ========================================
echo.

echo [INFO] Checking Node.js installation...
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not found. Please install from: https://nodejs.org/
    pause
    exit /b 1
)
echo [OK] Node.js detected
echo.

echo [1/4] Checking backend dependencies...
cd backend
if not exist node_modules (
    echo Installing backend packages...
    call npm install
    if errorlevel 1 (
        echo [ERROR] Backend installation failed
        cd ..
        pause
        exit /b 1
    )
) else (
    echo [OK] Backend dependencies already installed
)

echo [2/4] Checking environment configuration...
if not exist .env (
    echo Creating .env file from template...
    if exist .env.example (
        copy .env.example .env >nul
        echo [WARN] Please edit backend\.env to configure database
    ) else (
        echo [WARN] .env.example not found, skipping
    )
) else (
    echo [OK] Environment file exists
)

echo [3/4] Checking frontend dependencies...
cd ..\frontend
if not exist node_modules (
    echo Installing frontend packages...
    call npm install
    if errorlevel 1 (
        echo [ERROR] Frontend installation failed
        cd ..
        pause
        exit /b 1
    )
) else (
    echo [OK] Frontend dependencies already installed
)

echo [4/4] Starting servers...
echo.
cd ..\backend
echo Starting backend server on port 5000...
start "Pet Adoption Backend" cmd /k "node server.js"

timeout /t 3 /nobreak >nul

cd ..\frontend
echo Starting frontend application on port 3000...
start "Pet Adoption Frontend" cmd /k "npm start"

cd ..
echo.
echo ========================================
echo Startup Complete!
echo ========================================
echo Backend API:  http://localhost:5000
echo Frontend App: http://localhost:3000
echo API Docs:     http://localhost:5000/api-docs
echo ========================================
echo.
echo Browser should open automatically
echo If not, navigate to: http://localhost:3000
echo.
echo NOTE: First startup may take 1-2 minutes
echo Press any key to close this window...
pause >nul