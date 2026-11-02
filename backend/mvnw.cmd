@echo off
set "WRAPPER_DIR=%~dp0"

if not exist "%WRAPPER_DIR%.mvn\apache-maven-3.9.6\boot\plexus-classworlds-*.jar" (
    if exist "%WRAPPER_DIR%.mvn\apache-maven-3.9.6-bin.zip" (
        echo [INFO] Restoring Apache Maven 3.9.6 from local archive...
        tar -xf "%WRAPPER_DIR%.mvn\apache-maven-3.9.6-bin.zip" -C "%WRAPPER_DIR%.mvn"
    )
)

if exist "%WRAPPER_DIR%.mvn\apache-maven-3.9.6\bin\mvn.cmd" (
    call "%WRAPPER_DIR%.mvn\apache-maven-3.9.6\bin\mvn.cmd" %*
) else (
    where mvn >nul 2>nul
    if %errorlevel% equ 0 (
        mvn %*
    ) else (
        echo [ERROR] Maven not found.
        exit /b 1
    )
)

