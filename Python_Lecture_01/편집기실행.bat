@echo off
chcp 65001 > nul
echo 강의 편집기 서버를 시작합니다...
start "" "http://localhost:8768/editor.html"
python "%~dp0json_edit_server.py"
pause
