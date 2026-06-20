@echo off
cd /d %~dp0
call .venv\Scripts\activate.bat
uvicorn api.main:app --host 0.0.0.0 --port 3000 --reload
