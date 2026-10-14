@echo off
setlocal
"%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\setup-windows.ps1" %*
if errorlevel 1 (
    echo.
    echo Startup failed. Please copy the error above for troubleshooting.
    pause
    exit /b 1
)
endlocal
