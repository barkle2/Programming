from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
import sqlite3
import subprocess
import sys
import tempfile
import threading
import time
import urllib.parse
from pathlib import Path


ROOT = Path(__file__).resolve().parent
# 내부망의 다른 PC에서도 접속할 수 있도록 모든 인터페이스에 바인딩한다.
# (혼자 로컬에서만 쓸 거라면 "localhost"로 바꾸면 된다.)
HOST = "0.0.0.0"
PORT = 8767

# ---- 진행상황 추적 설정 ----
DB_PATH = ROOT / "progress.db"
# 관리자 대시보드(admin.html) 접근용 토큰. 운영 전에 반드시 바꾸세요.
ADMIN_TOKEN = "wlsmdwjdqhghk"
# 마지막 신호가 이 시간(초) 이내면 '접속 중'으로 본다. 클라이언트 heartbeat 주기보다 길게 잡는다.
ACTIVE_WINDOW_SEC = 90

_db_lock = threading.Lock()


def init_db():
    conn = sqlite3.connect(DB_PATH)
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS progress (
            email           TEXT NOT NULL,
            lesson          TEXT NOT NULL,
            name            TEXT,
            completed_count INTEGER DEFAULT 0,
            total_steps     INTEGER DEFAULT 0,
            current_index   INTEGER DEFAULT 0,
            badges          INTEGER DEFAULT 0,
            elapsed_ms      INTEGER DEFAULT 0,
            updated_at      INTEGER DEFAULT 0,
            last_seen       INTEGER DEFAULT 0,
            PRIMARY KEY (email, lesson)
        )
        """
    )
    conn.commit()
    conn.close()


def db_connect():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


RUNNER_SUFFIX = '''

# ---- lesson runner helper ----
try:
    import tkinter as _tk_ref
    _tk_roots = [v for v in globals().values() if isinstance(v, _tk_ref.Tk)]
    if _tk_roots and not _LESSON_HAS_MAINLOOP_:
        _tk_roots[0].mainloop()
except Exception:
    raise
'''


_current_proc = None


class LecCalcHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/admin/data":
            self._handle_admin_data(parsed)
            return
        super().do_GET()

    def do_POST(self):
        if self.path == "/run":
            self._handle_run()
        elif self.path == "/stop":
            self._handle_stop()
        elif self.path == "/progress":
            self._handle_progress()
        elif self.path == "/heartbeat":
            self._handle_heartbeat()
        else:
            self.send_error(404)

    # ---- 진행상황 추적 ----

    def _read_json_body(self):
        try:
            length = int(self.headers.get("Content-Length", "0"))
            raw = self.rfile.read(length)
            return json.loads(raw.decode("utf-8"))
        except Exception:
            self._send_json(400, {"ok": False, "message": "잘못된 요청 본문입니다."})
            return None

    def _handle_progress(self):
        data = self._read_json_body()
        if data is None:
            return
        email = str(data.get("email") or "").strip().lower()
        lesson = str(data.get("lesson") or "").strip()
        if not email or not lesson:
            self._send_json(400, {"ok": False, "message": "email/lesson이 필요합니다."})
            return
        now = int(time.time() * 1000)
        with _db_lock:
            conn = db_connect()
            conn.execute(
                """
                INSERT INTO progress
                    (email, lesson, name, completed_count, total_steps,
                     current_index, badges, elapsed_ms, updated_at, last_seen)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(email, lesson) DO UPDATE SET
                    name            = excluded.name,
                    completed_count = excluded.completed_count,
                    total_steps     = excluded.total_steps,
                    current_index   = excluded.current_index,
                    badges          = excluded.badges,
                    elapsed_ms      = excluded.elapsed_ms,
                    updated_at      = excluded.updated_at,
                    last_seen       = excluded.last_seen
                """,
                (
                    email,
                    lesson,
                    str(data.get("name") or ""),
                    int(data.get("completedCount") or 0),
                    int(data.get("totalSteps") or 0),
                    int(data.get("currentIndex") or 0),
                    int(data.get("badges") or 0),
                    int(data.get("elapsedMs") or 0),
                    now,
                    now,
                ),
            )
            conn.commit()
            conn.close()
        self._send_json(200, {"ok": True})

    def _handle_heartbeat(self):
        data = self._read_json_body()
        if data is None:
            return
        email = str(data.get("email") or "").strip().lower()
        lesson = str(data.get("lesson") or "").strip()
        if not email or not lesson:
            self._send_json(400, {"ok": False, "message": "email/lesson이 필요합니다."})
            return
        now = int(time.time() * 1000)
        with _db_lock:
            conn = db_connect()
            # 진행상황 숫자는 건드리지 않고 last_seen만 갱신한다
            conn.execute(
                """
                INSERT INTO progress (email, lesson, name, last_seen, updated_at)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(email, lesson) DO UPDATE SET
                    last_seen = excluded.last_seen,
                    name      = excluded.name
                """,
                (email, lesson, str(data.get("name") or ""), now, now),
            )
            conn.commit()
            conn.close()
        self._send_json(200, {"ok": True})

    def _check_token(self, parsed):
        query = urllib.parse.parse_qs(parsed.query)
        token = (query.get("token") or [""])[0]
        return token == ADMIN_TOKEN

    def _handle_admin_data(self, parsed):
        if not self._check_token(parsed):
            self._send_json(403, {"ok": False, "message": "토큰이 올바르지 않습니다."})
            return

        now = int(time.time() * 1000)
        window_ms = ACTIVE_WINDOW_SEC * 1000

        with _db_lock:
            conn = db_connect()
            rows = conn.execute("SELECT * FROM progress").fetchall()
            conn.close()

        # 이메일 단위로 묶어서 '현재 위치 + 완료 레슨 수'를 만든다
        by_email = {}
        for r in rows:
            rec = by_email.setdefault(
                r["email"],
                {"name": "", "last_seen": 0, "latest": None, "lessons_completed": 0},
            )
            if r["name"]:
                rec["name"] = r["name"]
            if r["total_steps"] > 0 and r["completed_count"] >= r["total_steps"]:
                rec["lessons_completed"] += 1
            if r["last_seen"] >= rec["last_seen"]:
                rec["last_seen"] = r["last_seen"]
                rec["latest"] = r

        users = []
        per_lesson = {}
        active_users = 0
        for email, rec in by_email.items():
            latest = rec["latest"]
            online = (now - rec["last_seen"]) <= window_ms
            if online:
                active_users += 1
            lesson = latest["lesson"] if latest else ""
            per_lesson[lesson] = per_lesson.get(lesson, 0) + 1
            users.append(
                {
                    "email": email,
                    "name": rec["name"],
                    "currentLesson": lesson,
                    "completedCount": latest["completed_count"] if latest else 0,
                    "totalSteps": latest["total_steps"] if latest else 0,
                    "currentIndex": latest["current_index"] if latest else 0,
                    "lessonsCompleted": rec["lessons_completed"],
                    "lastSeen": rec["last_seen"],
                    "online": online,
                }
            )

        users.sort(key=lambda u: u["lastSeen"], reverse=True)
        self._send_json(
            200,
            {
                "ok": True,
                "now": now,
                "activeWindowSec": ACTIVE_WINDOW_SEC,
                "summary": {
                    "totalUsers": len(users),
                    "activeUsers": active_users,
                    "perLesson": per_lesson,
                },
                "users": users,
            },
        )

    # ---- Python 실행 ----

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
        has_mainloop = "mainloop()" in user_code
        content = (
            "# -*- coding: utf-8 -*-\n"
            + user_code
            + f"\n_LESSON_HAS_MAINLOOP_ = {has_mainloop}\n"
            + RUNNER_SUFFIX
        )
        script_path.write_text(content, encoding="utf-8")
        return script_path

    def _send_json(self, status, payload):
        encoded = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(encoded)))
        self.end_headers()
        self.wfile.write(encoded)


if __name__ == "__main__":
    init_db()
    server = ThreadingHTTPServer((HOST, PORT), LecCalcHandler)
    print(f"Serving calculator at http://{HOST}:{PORT}/lec_calc.html")
    print(f"Admin dashboard at http://{HOST}:{PORT}/admin.html  (token: {ADMIN_TOKEN})")
    server.serve_forever()
