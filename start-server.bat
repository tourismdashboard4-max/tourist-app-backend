@echo off
title Tourist App Server
color 0A

echo ========================================
echo    🚀 TOURIST APP SERVER LAUNCHER
echo ========================================
echo.

:: Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed!
    pause
    exit /b 1
)

:: Check Node.js version
for /f "tokens=*" %%i in ('node -v') do set NODE_VERSION=%%i
echo ✅ Node.js version: %NODE_VERSION%
echo.

:: Check if .env file exists
if not exist .env (
    echo ⚠️  .env file not found! Creating from template...
    copy .env.example .env
    echo ✅ .env file created successfully!
    echo.
)

:: Install dependencies if needed
if not exist node_modules (
    echo 📦 Installing dependencies...
    call npm install
    if %errorlevel% neq 0 (
        echo ❌ Failed to install dependencies!
        pause
        exit /b 1
    )
    echo ✅ Dependencies installed successfully!
    echo.
)

:: Clear screen
cls

echo ========================================
echo    🚀 STARTING TOURIST APP SERVER
echo ========================================
echo.
echo 📁 Directory: %cd%
echo 🔧 Port: 5002
echo 📦 Type: ES Modules
echo.
echo ========================================
echo.

:: Start the server
npm run dev