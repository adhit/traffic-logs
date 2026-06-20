@echo off
:: Requires Administrator privileges for port 53
cd /d %~dp0
call .venv\Scripts\activate.bat
python -m dns_proxy.proxy
