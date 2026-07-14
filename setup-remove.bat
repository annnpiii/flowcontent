@echo off
title ContentFlow - Remove Auto-Start
cd /d "C:\Users\Administrator\Downloads\contentflow"

echo ========================================
echo   ContentFlow - Remove Auto-Start
echo ========================================
echo.

net session >nul 2>&1
if %errorLevel% neq 0 (
    echo Run as Administrator first.
    pause
    exit /b 1
)

echo Removing scheduled task and stopping services...
powershell -ExecutionPolicy Bypass -File "start.ps1" -Uninstall

echo.
echo Done.
pause
