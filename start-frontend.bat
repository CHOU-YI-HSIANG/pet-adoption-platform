@echo off
chcp 65001 >nul
title Pet Adoption Platform - Frontend
echo ========================================
echo Starting Frontend Application...
echo ========================================
cd frontend
if not exist node_modules (
    echo [WARN] Dependencies not found, installing...
    call npm install
)
echo.
echo Frontend will start on http://localhost:3000
echo.
npm start
