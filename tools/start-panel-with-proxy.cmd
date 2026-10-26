@echo off
rem ---------------------------------------------------------------
rem  Local Arena launcher that gives the panel a proxy it can actually
rem  use.  The panel's HTTP client (reqwest) only reads the
rem  HTTP_PROXY / HTTPS_PROXY environment variables - it ignores the
rem  WinINET "system proxy" switch, so the built-in online update fails
rem  with "Cannot contact GitHub update service" whenever no proxy env
rem  var is present.
rem
rem  Order of preference:
rem    1. the Windows system proxy, when the switch is on
rem    2. any listening local proxy port (7890/7891/7897/1080/10808/2080),
rem       which covers Clash / Mihomo running in TUN mode with the system
rem       proxy switch off
rem    3. no proxy at all
rem ---------------------------------------------------------------
setlocal
set "PSCMD=powershell -NoProfile -ExecutionPolicy Bypass -Command"
%PSCMD% "$px=$null; try { $r=Get-ItemProperty 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Internet Settings'; if([int]$r.ProxyEnable -eq 1 -and $r.ProxyServer){ $px=[string]$r.ProxyServer } } catch {}; if(-not $px){ foreach($port in 7890,7891,7897,1080,10808,2080){ $c=New-Object System.Net.Sockets.TcpClient; try { $null=$c.ConnectAsync('127.0.0.1',$port).Wait(150); if($c.Connected){ $px=('127.0.0.1:'+$port); break } } catch {} finally { if($c){ $c.Dispose() } } } }; if($px){ $env:HTTP_PROXY=('http://'+$px); $env:HTTPS_PROXY=('http://'+$px); $env:ALL_PROXY=('http://'+$px); Write-Host ('[local-arena] proxy ' + $px) } else { Write-Host '[local-arena] no local proxy found, launching direct' }; Start-Process -FilePath '%~dp0LocalArena.exe' -WorkingDirectory '%~dp0'"
endlocal
