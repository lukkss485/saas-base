@echo off
setlocal
title NT-life Launcher
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -STA -File "%~dp0NT-life-Launcher.ps1"
if errorlevel 1 (
  echo.
  echo O launcher foi encerrado com erro. Leia a mensagem acima.
  pause
)
endlocal