@echo off
rem Runs npm with the portable Node 20 (system Node 16 stays untouched).
rem Usage: npm20 install | npm20 run dev | npm20 run build
setlocal enabledelayedexpansion
set "NODEDIR="
for /d %%i in ("C:\Users\domin\.tools\node-v20*-win-x64") do set "NODEDIR=%%i"
if not defined NODEDIR (
  echo Portable Node 20 not found under C:\Users\domin\.tools\
  echo Download node-v20.x-win-x64.zip from nodejs.org/dist and extract it there.
  exit /b 1
)
set "PATH=!NODEDIR!;%PATH%"
npm %*
endlocal
