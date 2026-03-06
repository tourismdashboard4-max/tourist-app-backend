@echo off
cd /d %~dp0
cd server
echo 🚀 Starting Tourist App Server...
echo 📁 Working directory: %cd%
echo.
node server.js
pause