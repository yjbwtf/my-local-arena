@echo off
rem ---------------------------------------------------------------
rem  Local Arena launcher that passes the Windows system proxy to the
rem  panel through the HTTP_PROXY / HTTPS_PROXY environment variables.
rem  The panel's HTTP client (reqwest) only reads those variables and
rem  ignores the WinINET system proxy, so the built-in online update
rem  fails with "Cannot contact GitHub update service" without this.
rem ---------------------------------------------------------------
setlocal
set "PX="
for /f "tokens=2,*" %%A in ('reg query "HKCU\Software\Microsoft\Windows\CurrentVersion\Internet Settings" /v ProxyServer 2^>nul ^| findstr /i ProxyServer') do set "PX=%%B"
for /f "tokens=2,*" %%A in ('reg query "HKCU\Software\Microsoft\Windows\CurrentVersion\Internet Settings" /v ProxyEnable 2^>nul ^| findstr /i ProxyEnable') do set "PE=%%B"

if not defined PX goto noproxy
if not "%PE%"=="0x1" goto noproxy

set "HTTP_PROXY=http://%PX%"
set "HTTPS_PROXY=http://%PX%"
set "ALL_PROXY=http://%PX%"
echo [local-arena] using proxy %PX%
goto launch

:noproxy
echo [local-arena] no system proxy detected, launching without one

:launch
start "" "%~dp0LocalArena.exe"
endlocal
