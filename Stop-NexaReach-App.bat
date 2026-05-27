@echo off
title Stop NexaReach Global AI
color 0C

echo ==========================================
echo       Stopping NexaReach Global AI
echo ==========================================
echo.

echo Closing NexaReach Chrome app window...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-Process chrome -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -like '*NexaReach*' -or $_.MainWindowTitle -like '*localhost*' } | Stop-Process -Force"

echo.
echo Stopping backend on port 5000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5000') do (
  taskkill /PID %%a /F >nul 2>&1
)

echo.
echo Stopping frontend on port 5173...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5173') do (
  taskkill /PID %%a /F >nul 2>&1
)

echo.
echo Stopping frontend on port 5179...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5179') do (
  taskkill /PID %%a /F >nul 2>&1
)

echo.
echo Stopping extra Vite ports if any...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5174') do (
  taskkill /PID %%a /F >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5175') do (
  taskkill /PID %%a /F >nul 2>&1
)

echo.
echo NexaReach Global AI stopped.
echo.
pause