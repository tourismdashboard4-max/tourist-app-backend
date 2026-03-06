@echo off
title Tourist App Server
color 0A

echo ========================================
echo    🚀 TOURIST APP SERVER LAUNCHER
echo ========================================
echo.

echo 📂 Current Directory: %cd%
echo.

:: Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed!
    echo Please install Node.js from https://nodejs.org/
    echo.
    pause
    exit /b 1
)

:: Check Node.js version
for /f "tokens=*" %%i in ('node -v') do set NODE_VERSION=%%i
echo ✅ Node.js version: %NODE_VERSION%
echo.

:: Check if MongoDB is running
echo 🔍 Checking MongoDB connection...
timeout /t 2 /nobreak >nul

:: Check if .env file exists
if not exist .env (
    echo ⚠️  .env file not found!
    echo Creating .env file from template...
    
    (
        echo PORT=5002
        echo NODE_ENV=development
        echo MONGODB_URI=mongodb://localhost:27017/tourist_app
        echo JWT_SECRET=TouristApp2026_SuperSecretKey_!@#$%%^7890
        echo JWT_EXPIRES_IN=7d
        echo EMAIL_USER=tourism.dashboard4@gmail.com
        echo EMAIL_PASSWORD=your-app-password
        echo FRONTEND_URL=http://localhost:5173
    ) > .env
    
    echo ✅ .env file created successfully!
    echo ⚠️  Please update EMAIL_PASSWORD in .env file
    echo.
)

:: Check if node_modules exists
if not exist node_modules (
    echo 📦 Installing dependencies...
    echo This may take a few minutes...
    echo.
    call npm install
    if %errorlevel% neq 0 (
        echo ❌ Failed to install dependencies!
        pause
        exit /b 1
    )
    echo ✅ Dependencies installed successfully!
    echo.
) else (
    echo ✅ Dependencies are already installed
    echo.
)

:: Clear screen
cls

echo ========================================
echo    🚀 STARTING TOURIST APP SERVER
echo ========================================
echo.
echo 📁 Working Directory: %cd%
echo 🔧 Port: 5002
echo 📊 Environment: development
echo 🔌 WebSocket: Enabled
echo 📧 Email: tourism.dashboard4@gmail.com
echo.
echo ========================================
echo.

:: Start the server
npm run dev

:: If server stops, pause to see error
if %errorlevel% neq 0 (
    echo.
    echo ❌ Server stopped with error code %errorlevel%
    echo.
    pause
)