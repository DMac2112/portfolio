@echo off
rem Local test of the WHOLE site exactly as deploy.cmd would publish it, without publishing.
rem Usage: .\preview.cmd   then it opens http://localhost:4321/  (Ctrl+C to stop)
setlocal enabledelayedexpansion
cd /d "%~dp0"
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
echo [1/3] Rebuilding DominikOS...
call npm --prefix dominikos\os run build || exit /b 1
echo [2/3] Copying OS + Frostbyte + game1 into the site...
node dominikos\os\scripts\deploy-rework.mjs || exit /b 1
echo [3/3] Building the site...
call npm run build || exit /b 1
echo.
echo Site:      http://localhost:4321/
echo Frostbyte: http://localhost:4321/frostbyte/
echo DominikOS: http://localhost:4321/os/
echo Press Ctrl+C to stop.
call npx astro preview --open
endlocal