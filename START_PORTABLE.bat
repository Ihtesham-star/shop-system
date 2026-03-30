@echo off
setlocal enabledelayedexpansion
title Shop System - Portable Launcher
color 0A

echo ===============================================
echo   Starting Shop System (Portable Mode)
echo ===============================================
echo.

:: Get the directory where this batch file is located
set ROOT_DIR=%~dp0
cd /d "%ROOT_DIR%"

:: Copy portable .env if exists
if exist "%ROOT_DIR%backend\.env.portable" (
    copy /Y "%ROOT_DIR%backend\.env.portable" "%ROOT_DIR%backend\.env" >nul 2>&1
)

:: -----------------------------------------------
:: [1/5] Start PostgreSQL if not already running
:: -----------------------------------------------
echo [1/5] Checking PostgreSQL service...
"%ROOT_DIR%pgsql\bin\pg_isready.exe" -U postgres -p 5434 >nul 2>&1
if "%ERRORLEVEL%"=="0" (
    echo    PostgreSQL is already running
) else (
    echo    Starting PostgreSQL server...
    start /B "" "%ROOT_DIR%pgsql\bin\pg_ctl.exe" -D "%ROOT_DIR%pgsql\data" -l "%ROOT_DIR%pgsql\data\logfile" start >nul 2>&1

    :: Wait until PostgreSQL is actually ready (up to 30 seconds)
    echo    Waiting for PostgreSQL to be ready...
    set PG_READY=0
    for /L %%i in (1,1,15) do (
        if "!PG_READY!"=="0" (
            "%ROOT_DIR%pgsql\bin\pg_isready.exe" -U postgres -p 5434 >nul 2>&1
            if "!ERRORLEVEL!"=="0" (
                set PG_READY=1
                echo    PostgreSQL is ready
            ) else (
                timeout /t 2 >nul
            )
        )
    )
    if "!PG_READY!"=="0" (
        echo    ERROR: PostgreSQL did not start in time. Check pgsql\data\logfile for details.
        pause
        exit /b 1
    )
)

:: -----------------------------------------------
:: [2/5] First-time database setup
:: -----------------------------------------------
echo.
echo [2/5] Checking database setup...
"%ROOT_DIR%pgsql\bin\psql.exe" -U postgres -p 5434 -lqt 2>nul | findstr /C:"shop_system" >nul
if errorlevel 1 (
    echo    First-time setup: creating database and tables...
    "%ROOT_DIR%pgsql\bin\createdb.exe" -U postgres -p 5434 shop_system >nul 2>&1
    "%ROOT_DIR%pgsql\bin\psql.exe" -U postgres -p 5434 -d shop_system -f "%ROOT_DIR%backend\database\schema.sql" >nul 2>&1
    echo    Database created successfully
) else (
    echo    Database already exists, applying any pending migrations...
    "%ROOT_DIR%pgsql\bin\psql.exe" -U postgres -p 5434 -d shop_system -f "%ROOT_DIR%backend\database\schema.sql" >nul 2>&1
    echo    Done
)

:: -----------------------------------------------
:: [3/5] Start backend
:: -----------------------------------------------
echo.
echo [3/5] Starting backend server...
cd "%ROOT_DIR%backend"
start "Shop System - Backend" cmd /k "set PATH=%ROOT_DIR%node-v22.21.1-win-x64;%PATH% && npm run dev"

echo    Waiting for backend to initialize...
timeout /t 5 >nul

:: -----------------------------------------------
:: [4/5] Start frontend
:: -----------------------------------------------
echo.
echo [4/5] Starting frontend application...
cd "%ROOT_DIR%frontend"
start "Shop System - Frontend" cmd /k "set PATH=%ROOT_DIR%node-v22.21.1-win-x64;%%PATH%% && cd "%ROOT_DIR%frontend" && npm start"

:: -----------------------------------------------
:: [5/5] Open browser
:: -----------------------------------------------
echo.
echo [5/5] Opening browser...
timeout /t 10 >nul
start http://localhost:3001

echo.
echo ===============================================
echo   Shop System Started Successfully!
echo ===============================================
echo.
echo Backend API: http://localhost:3000
echo Frontend UI: http://localhost:3001
echo.
echo Login: admin / admin123
echo (You will be asked to set a new password on first login)
echo.
echo To stop: run STOP_PORTABLE.bat
echo.
echo Press any key to minimize this window...
pause >nul

exit
