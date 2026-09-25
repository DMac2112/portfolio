@echo off
rem Runs npm with the portable Node 20 if present, otherwise the Node already on PATH.
rem Usage: npm20 install | npm20 run dev | npm20 run build
setlocal enabledelayedexpansion
set "NODEDIR="
for /d %%i in ("%USERPROFILE%\.tools\node-v20*-win-x64") do set "NODEDIR=%%i"
if defined NODEDIR (
  set "PATH=!NODEDIR!;%PATH%"
) else (
  where node >nul 2>nul || (
    echo No Node found: install Node or extract node-v20.x-win-x64 into %USERPROFILE%\.tools\
    exit /b 1
  )
)
npm %*
endlocal
