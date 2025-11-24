@echo off
chcp 65001 >nul
title Pet Adoption Frontend

echo ========================================
echo Starting Frontend Application
echo ========================================
echo.

set SKIP_PREFLIGHT_CHECK=true
set DISABLE_ESLINT_PLUGIN=true
set BROWSER=none
set DANGEROUSLY_DISABLE_HOST_CHECK=true
set WDS_SOCKET_PORT=0

echo Configuration set, starting React app...
echo.

npm start
