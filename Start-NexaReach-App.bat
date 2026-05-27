@echo off
title NexaReach Global AI Launcher
color 0A

echo ==========================================
echo       Starting NexaReach Global AI
echo ==========================================
echo.

if not exist "D:\NexaReachData" mkdir "D:\NexaReachData"

echo Starting backend on http://localhost:5000 ...
start "NexaReach Backend" cmd /k "cd /d D:\ShazeeProjects\nexareach-ai\backend && npm run dev"

timeout /t 6 /nobreak >nul

echo Starting frontend...
start "NexaReach Frontend" cmd /k "cd /d D:\ShazeeProjects\nexareach-ai\frontend && npm run dev"

timeout /t 8 /nobreak >nul

echo Opening NexaReach as desktop-style app...

start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --app=http://localhost:5173 --window-size=1400,900

echo.
echo Keep backend/frontend windows open while using the app.
pause