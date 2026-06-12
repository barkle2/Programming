from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
import subprocess
import sys
import tempfile
from pathlib import Path


ROOT = Path(__file__).resolve().parent
HOST = "localhost"
PORT = 8767


RUNNER_SUFFIX = r'''

# --- Prototype helper: keep a Tk window visible before mainloop lessons. ---
try:
    import tkinter as _prototype_tk
    _roots = [
        _value for _value in list(globals().values())
        if isinstance(_value, _prototype_tk.Tk)
    ]
    if _roots and "mainloop()" not in __USER_CODE__:
        _root = _roots[0]
        _root.mainloop()
except Exception:
    raise
'''


_current_proc = None


class PrototypeHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_POST(self):
        if self.path == "/run":
            self._handle_run()
        elif self.path == "/stop":
            self._handle_stop()
        else:
            self.send_error(404)

    def _handle_run(self):
        global _current_proc
        self._kill_current_proc()

        content_length = int(self.headers.get("Content-Length", "0"))
        raw_body = self.rfile.read(content_length)

        try:
            payload = json.loads(raw_body.decode("utf-8"))
            user_code = str(payload["code"])
        except Exception:
            self._send_json(400, {
                "ok": False,
                "message": "실행할 코드를 읽지 못했어요."
            })
            return

        script_path = self._write_script(user_code)

        try:
            _current_proc = subprocess.Popen(
                [sys.executable, str(script_path)],
                cwd=str(ROOT),
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
            )
        except Exception as exc:
            self._send_json(500, {
                "ok": False,
                "message": f"Python 실행을 시작하지 못했어요: {exc}"
            })
            return

        try:
            stdout, stderr = _current_proc.communicate(timeout=2)
            if _current_proc.returncode != 0:
                self._send_json(200, {
                    "ok": False,
                    "message": "Python 실행 중 오류가 발생했어요.",
                    "stderr": stderr.decode("utf-8", errors="replace").strip()
                })
            else:
                self._send_json(200, {
                    "ok": True,
                    "message": "Python 프로그램을 실행했어요.",
                    "stdout": stdout.decode("utf-8", errors="replace").strip()
                })
        except subprocess.TimeoutExpired:
            self._send_json(200, {
                "ok": True,
                "message": "Python 프로그램을 실행했어요."
            })

    def _handle_stop(self):
        self._kill_current_proc()
        self._send_json(200, {"ok": True, "message": "창을 닫았어요."})

    def _kill_current_proc(self):
        global _current_proc
        if _current_proc and _current_proc.poll() is None:
            _current_proc.terminate()
            try:
                _current_proc.wait(timeout=2)
            except subprocess.TimeoutExpired:
                _current_proc.kill()
                try:
                    _current_proc.wait(timeout=1)
                except subprocess.TimeoutExpired:
                    pass
        if _current_proc:
            for pipe in (_current_proc.stdout, _current_proc.stderr):
                if pipe:
                    try:
                        pipe.close()
                    except Exception:
                        pass
        _current_proc = None

    def _write_script(self, user_code):
        temp_dir = Path(tempfile.gettempdir()) / "calculator_learning_runs"
        temp_dir.mkdir(parents=True, exist_ok=True)
        script_path = temp_dir / "current_lesson_run.py"
        suffix = RUNNER_SUFFIX.replace("__USER_CODE__", repr(user_code))
        script_path.write_text(user_code + suffix, encoding="utf-8")
        return script_path

    def _send_json(self, status, payload):
        encoded = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(encoded)))
        self.end_headers()
        self.wfile.write(encoded)


if __name__ == "__main__":
    server = ThreadingHTTPServer((HOST, PORT), PrototypeHandler)
    print(f"Serving calculator prototype at http://{HOST}:{PORT}/prototype.html")
    server.serve_forever()
