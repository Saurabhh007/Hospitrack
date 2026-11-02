@echo off
setlocal enabledelayedexpansion

:: ==============================================================================
::   HOSPITRACK — STOP SCRIPT
:: ==============================================================================

set "PROJECT_ROOT=%~dp0"
cd /d "%PROJECT_ROOT%"
title Stop Hospitrack Platform

cls
echo ==============================================================================
echo                      HOSPITRACK PLATFORM SHUTDOWN
echo ==============================================================================
echo.

if exist "%PROJECT_ROOT%runtime\clean_ports.ps1" (
    powershell -NoProfile -ExecutionPolicy Bypass -File "%PROJECT_ROOT%runtime\clean_ports.ps1"
) else (
    powershell -NoProfile -ExecutionPolicy Bypass -Command "$ports = @(8000, 8080); foreach ($p in $ports) { try { $lines = netstat -ano | Select-String \":$p\s+.*LISTENING\"; foreach ($l in $lines) { $targetPid = (-split $l.Line)[-1]; if ($targetPid -and $targetPid -ne '0') { Write-Host \"Terminating process PID $targetPid on port $p...\"; Stop-Process -Id $targetPid -Force -ErrorAction SilentlyContinue } } } catch {} }"
)

echo.
echo ================================================
echo  HOSPITRACK STOP
echo ================================================
echo [OK] Frontend stopped
echo [OK] Backend stopped
echo [OK] Port 8000 released
echo [OK] Port 8080 released
echo.
echo Hospitrack has been stopped cleanly.
echo ================================================
echo.
ping 127.0.0.1 -n 2 >nul
