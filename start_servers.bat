@echo off
title Hospitrack Service Launcher
echo ============================================================
echo   HOSPITRACK PLATFORM — PRODUCTION SERVICE LAUNCHER
echo ============================================================
echo.
echo [1/2] Starting Spring Boot API Backend on Port 8080...
start "Hospitrack Backend API (Port 8080)" java -jar backend\target\hospitrack-backend-1.0.0.jar
echo [2/2] Starting Node.js Frontend Web Server on Port 8000...
start "Hospitrack Frontend Web Server (Port 8000)" node server.js
echo.
echo ============================================================
echo   Both services are starting!
echo   Frontend Application: http://localhost:8000
echo   Backend API Endpoint: http://localhost:8080/api
echo ============================================================
echo.
pause

