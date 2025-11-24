@echo off
chcp 65001 >nul
title Pet Adoption Platform - Frontend Fix
cls
echo ========================================
echo Frontend Tailwind CSS Fix Script
echo ========================================
echo.

cd frontend

echo [1/4] Clearing cache...
if exist node_modules (
    echo Removing node_modules folder...
    rmdir /s /q node_modules
)

if exist package-lock.json (
    echo Removing package-lock.json...
    del package-lock.json
)

if exist .next (
    echo Clearing .next cache...
    rmdir /s /q .next
)

if exist build (
    echo Clearing build folder...
    rmdir /s /q build
)

echo [2/4] Reinstalling dependencies...
call npm cache clean --force
call npm install
if errorlevel 1 (
    echo [ERROR] Installation failed
    pause
    exit /b 1
)

echo [3/4] Checking Tailwind CSS configuration...
echo.
echo Checking postcss.config.js:
if exist postcss.config.js (
    type postcss.config.js
) else (
    echo [WARN] postcss.config.js not found
)

echo.
echo Checking tailwind.config.js:
if exist tailwind.config.js (
    type tailwind.config.js
) else (
    echo [WARN] tailwind.config.js not found
)

echo.
echo [4/4] Testing Tailwind CSS compilation...
npx tailwindcss -i ./src/index.css -o ./temp-output.css >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Tailwind CSS compilation failed
) else (
    echo [OK] Tailwind CSS compilation successful
    del temp-output.css >nul 2>&1
)

echo.
echo ========================================
echo Fix Complete!
echo ========================================
echo You can now start the frontend:
echo   npm start
echo.
pause