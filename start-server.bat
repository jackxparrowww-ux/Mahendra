@echo off
title Mahendra Real Estate - Local Server
cls

echo ===================================================
echo       Mahendra Real Estate - Local Server
echo ===================================================
echo.

:: Navigate to project directory
if exist "%~dp0mahendra-real-estate\package.json" (
    cd /d "%~dp0mahendra-real-estate"
) else (
    cd /d "%~dp0"
)

:: Verify Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not found in your PATH.
    echo Please install Node.js from https://nodejs.org
    echo.
    pause
    exit /b 1
)

echo Localhost Link: http://localhost:5173
echo.
echo Opening browser in 3 seconds...
start "" /b cmd /c "timeout /t 3 /nobreak >nul & start http://localhost:5173"

echo Starting server with 'npm run dev'...
echo Press Ctrl + C to stop the server anytime.
echo ===================================================
echo.

call npm run dev

if %errorlevel% neq 0 (
    echo.
    echo Server exited. Press any key to close this window.
    pause >nul
)
