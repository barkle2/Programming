@echo off
cd /d "%~dp0"
start http://localhost:8767/prototype.html
python prototype_server.py
pause
