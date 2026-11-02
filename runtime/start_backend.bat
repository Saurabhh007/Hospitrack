@echo off
set "PROJECT_ROOT=%~dp0.."
cd /d "%PROJECT_ROOT%\backend"

if exist "%PROJECT_ROOT%\backend\target\hospitrack-backend-1.0.0.jar" (
    java -jar "%PROJECT_ROOT%\backend\target\hospitrack-backend-1.0.0.jar"
) else (
    call mvnw.cmd spring-boot:run
)
