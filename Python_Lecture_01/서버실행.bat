@echo off
cd /d "%~dp0"
start http://localhost:8767/lec_calc.html
python lec_calc_server.py
pause
