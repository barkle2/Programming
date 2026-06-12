from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
HOST = "localhost"
PORT = 8768


class EditorHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_POST(self):
        if self.path == "/save-lesson":
            self._handle_save_lesson()
        else:
            self.send_error(404)

    def _handle_save_lesson(self):
        content_length = int(self.headers.get("Content-Length", "0"))
        raw_body = self.rfile.read(content_length)
        try:
            data = json.loads(raw_body.decode("utf-8"))
        except Exception:
            self._send_json(400, {"ok": False, "message": "JSON 파싱 실패"})
            return
        json_path = ROOT / "learning_steps_lesson1.json"
        json_path.write_text(
            json.dumps(data, ensure_ascii=False, indent=2),
            encoding="utf-8"
        )
        self._send_json(200, {"ok": True, "message": "저장됐어요."})

    def _send_json(self, status, payload):
        encoded = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(encoded)))
        self.end_headers()
        self.wfile.write(encoded)

    def log_message(self, format, *args):
        print(f"[Editor] {self.address_string()} - {format % args}")


if __name__ == "__main__":
    server = ThreadingHTTPServer((HOST, PORT), EditorHandler)
    print(f"강의 편집기: http://{HOST}:{PORT}/editor.html")
    server.serve_forever()
