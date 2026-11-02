@echo off
setlocal enabledelayedexpansion

:: ==============================================================================
::   HOSPITRACK — HOSPITAL REFERRAL & PATIENT RECORD MANAGEMENT SYSTEM
::   MASTER PLATFORM LAUNCHER
:: ==============================================================================

set "PROJECT_ROOT=%~dp0"
cd /d "%PROJECT_ROOT%"
title Hospitrack Master Platform

cls
echo ==============================================================================
echo                 HOSPITRACK — LOCAL SYSTEM LAUNCHER
echo ==============================================================================
echo Project Directory: %PROJECT_ROOT%
echo.

:: Ensure runtime directory exists
if not exist "%PROJECT_ROOT%runtime" (
    mkdir "%PROJECT_ROOT%runtime" >nul 2>nul
)

:: [1/7] Verify Project Structure
echo [1/7] Verifying Hospitrack Project Structure...
if not exist "%PROJECT_ROOT%backend" (
    echo [ERROR] backend\ directory not found.
    pause
    exit /b 1
)
if not exist "%PROJECT_ROOT%index.html" (
    echo [ERROR] index.html not found.
    pause
    exit /b 1
)
if not exist "%PROJECT_ROOT%server.js" (
    echo [ERROR] server.js not found.
    pause
    exit /b 1
)
echo       Project structure verified ............................. [PASS]

:: [2/7] Check Java Environment
echo [2/7] Checking Java 17+ Runtime...
where java >nul 2>nul
if %errorlevel% neq 0 (
    echo.
    echo ==============================================================================
    echo [ERROR] Java is not detected in your system PATH.
    echo Hospitrack Spring Boot backend requires Java 17 or newer.
    echo ==============================================================================
    pause
    exit /b 1
)
echo       Java Runtime detected .................................. [PASS]

:: [3/7] Check Node.js Environment
echo [3/7] Checking Node.js Environment...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo.
    echo ==============================================================================
    echo [ERROR] Node.js is not detected in your system PATH.
    echo Hospitrack frontend server requires Node.js.
    echo ==============================================================================
    pause
    exit /b 1
)
echo       Node.js Runtime detected ............................... [PASS]

:: [4/7] Clean Local Ports (8000 & 8080)
echo [4/7] Cleaning Ports 8000 and 8080...
powershell -NoProfile -ExecutionPolicy Bypass -File "%PROJECT_ROOT%runtime\clean_ports.ps1" >nul 2>nul
echo       Ports 8000 and 8080 cleared ............................ [PASS]

:: [5/7] Start Spring Boot Backend
echo [5/7] Starting Hospitrack Spring Boot Backend on port 8080...
del /f /q "%PROJECT_ROOT%runtime\backend.log" >nul 2>nul

start "Hospitrack Backend" /min cmd /c ""%PROJECT_ROOT%runtime\start_backend.bat" > "%PROJECT_ROOT%runtime\backend.log" 2>&1"

:: Wait for Backend Health Endpoint
echo       Waiting for Backend Health (http://localhost:8080/api/health)...
set "BACKEND_UP=0"
for /L %%i in (1,1,40) do (
    if !BACKEND_UP! equ 0 (
        powershell -NoProfile -ExecutionPolicy Bypass -Command "try { $r = Invoke-WebRequest -Uri 'http://localhost:8080/api/health' -UseBasicParsing -TimeoutSec 1; if ($r.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>nul
        if !errorlevel! equ 0 (
            set "BACKEND_UP=1"
        ) else (
            <nul set /p=.
            ping 127.0.0.1 -n 2 >nul
        )
    )
)
echo.

if !BACKEND_UP! equ 0 (
    echo.
    echo ==============================================================================
    echo [ERROR] Spring Boot backend did not become ready within 40 seconds.
    echo Check logs at: %PROJECT_ROOT%runtime\backend.log
    echo ==============================================================================
    if exist "%PROJECT_ROOT%runtime\backend.log" (
        echo --- Last 15 log lines ---
        powershell -NoProfile -Command "Get-Content '%PROJECT_ROOT%runtime\backend.log' -Tail 15"
        echo -------------------------
    )
    echo.
    pause
    exit /b 1
)
echo       Backend REST Services are UP & HEALTHY ................. [PASS]

:: [6/7] Start Frontend Web Server
echo [6/7] Starting Frontend Web Server on port 8000...
del /f /q "%PROJECT_ROOT%runtime\frontend.log" >nul 2>nul

start "Hospitrack Frontend" /min cmd /c ""%PROJECT_ROOT%runtime\start_frontend.bat" > "%PROJECT_ROOT%runtime\frontend.log" 2>&1"

:: Wait for Frontend Readiness
set "FRONTEND_UP=0"
for /L %%i in (1,1,10) do (
    if !FRONTEND_UP! equ 0 (
        powershell -NoProfile -ExecutionPolicy Bypass -Command "try { $r = Invoke-WebRequest -Uri 'http://localhost:8000' -UseBasicParsing -TimeoutSec 1; if ($r.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>nul
        if !errorlevel! equ 0 (
            set "FRONTEND_UP=1"
        ) else (
            ping 127.0.0.1 -n 2 >nul
        )
    )
)

if !FRONTEND_UP! equ 0 (
    echo [ERROR] Frontend failed to start on port 8000.
    echo Check logs at: %PROJECT_ROOT%runtime\frontend.log
    pause
    exit /b 1
)
echo       Frontend Interface is UP & HEALTHY ..................... [PASS]

:: [7/7] Launch Browser
echo.
echo ==============================================================================
echo                 HOSPITRACK PLATFORM IS RUNNING SAFELY
echo ==============================================================================
echo.
echo   Frontend Web App : http://localhost:8000
echo   Backend REST API : http://localhost:8080
echo   Health Check URL : http://localhost:8080/api/health
echo.
echo   To stop Hospitrack cleanly, run: stop-hospitrack.bat
echo ==============================================================================
echo.
echo [OK] Opening default web browser to http://localhost:8000...
start "" "http://localhost:8000"

echo.
echo Hospitrack is active. You may minimize this terminal or close it when finished.
pause
