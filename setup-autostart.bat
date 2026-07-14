@echo off
title ContentFlow - Setup Auto-Start
cd /d "C:\Users\Administrator\Downloads\contentflow"

echo ========================================
echo   ContentFlow Auto-Start Setup
echo   flowcontent.my.id
echo ========================================
echo.

:: Check if running as admin
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [WARN] Not running as Administrator!
    echo [WARN] Task Scheduler install requires admin rights.
    echo.
    echo Right-click this file and select "Run as administrator"
    echo.
    pause
    exit /b 1
)

echo [1/2] Installing Windows Scheduled Task...
powershell -ExecutionPolicy Bypass -File "start.ps1" -Install

echo.
echo [2/2] Starting service now...
schtasks /run /tn "ContentFlow"

echo.
echo ========================================
echo   Setup Complete!
echo ========================================
echo.
echo  Your service is now running.
echo  Log file: data\service.log
echo.
echo  To stop:   schtasks /end /tn "ContentFlow"
echo  To remove: setup-remove.bat
echo.
pause
