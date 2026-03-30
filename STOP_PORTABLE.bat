@echo off
title Shop System - Shutdown
color 0C

echo ===============================================
echo   Stopping Shop System
echo ===============================================
echo.

:: Get the directory where this batch file is located
set ROOT_DIR=%~dp0
cd /d "%ROOT_DIR%"

echo [1/3] Stopping frontend application...
taskkill /FI "WINDOWTITLE eq Shop System - Frontend*" /F >nul 2>&1
if "%ERRORLEVEL%"=="0" (
    echo    Frontend stopped
) else (
    echo    Frontend was not running
)

echo.
echo [2/3] Stopping backend server...
taskkill /FI "WINDOWTITLE eq Shop System - Backend*" /F >nul 2>&1
if "%ERRORLEVEL%"=="0" (
    echo    Backend stopped
) else (
    echo    Backend was not running
)

echo.
echo [3/3] Stopping PostgreSQL server...
tasklist /FI "IMAGENAME eq postgres.exe" 2>NUL | find /I /N "postgres.exe">NUL
if "%ERRORLEVEL%"=="0" (
    "%ROOT_DIR%pgsql\bin\pg_ctl.exe" -D "%ROOT_DIR%pgsql\data" stop
    timeout /t 2 >nul
    echo    PostgreSQL stopped
) else (
    echo    PostgreSQL was not running
)

echo.
echo ===============================================
echo   Shop System Stopped Successfully!
echo ===============================================
echo.
echo Press any key to close this window...
pause >nul
