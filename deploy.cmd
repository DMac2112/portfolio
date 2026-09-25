@echo off
rem Publishes the whole site (portfolio + OS + games + Frostbyte) to dmac2112.github.io.
rem Usage: just run  deploy  from this folder. Live ~1-2 min after it finishes.
rem Uses the portable Node 20 if present (same as npm20.cmd), otherwise the Node on PATH.
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
node "%~dp0scripts\deploy.mjs" %*
endlocal
