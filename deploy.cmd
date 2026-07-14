@echo off
rem Publishes the whole site (portfolio + OS + games + Frostbyte) to dmac2112.github.io.
rem Usage: just run  deploy  from this folder. Live ~1-2 min after it finishes.
rem Uses the portable Node 20, same as npm20.cmd (system Node 16 stays untouched).
setlocal enabledelayedexpansion
set "NODEDIR="
for /d %%i in ("C:\Users\domin\.tools\node-v20*-win-x64") do set "NODEDIR=%%i"
if not defined NODEDIR (
  echo Portable Node 20 not found under C:\Users\domin\.tools\
  exit /b 1
)
set "PATH=!NODEDIR!;%PATH%"
node "%~dp0scripts\deploy.mjs" %*
endlocal
