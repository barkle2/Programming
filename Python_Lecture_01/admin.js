const els = {
  gate: document.querySelector("#gate"),
  gateErr: document.querySelector("#gateErr"),
  tokenInput: document.querySelector("#tokenInput"),
  tokenBtn: document.querySelector("#tokenBtn"),
  dashboard: document.querySelector("#dashboard"),
  refreshNote: document.querySelector("#refreshNote"),
  logoutBtn: document.querySelector("#logoutBtn"),
  totalUsers: document.querySelector("#totalUsers"),
  activeUsers: document.querySelector("#activeUsers"),
  activeNote: document.querySelector("#activeNote"),
  lessonsDone: document.querySelector("#lessonsDone"),
  lessonChips: document.querySelector("#lessonChips"),
  userRows: document.querySelector("#userRows"),
  emptyMsg: document.querySelector("#emptyMsg")
};

let token = localStorage.getItem("admin_token") || "";
let timerId = null;

function showGate(message) {
  if (timerId) clearInterval(timerId);
  timerId = null;
  els.dashboard.hidden = true;
  els.gate.hidden = false;
  els.gateErr.textContent = message || "";
  els.tokenInput.value = "";
  els.tokenInput.focus();
}

function startDashboard() {
  els.gate.hidden = true;
  els.dashboard.hidden = false;
  refresh();
  if (timerId) clearInterval(timerId);
  timerId = setInterval(refresh, 5000);
}

async function refresh() {
  let data;
  try {
    const res = await fetch(`/admin/data?token=${encodeURIComponent(token)}`, { cache: "no-store" });
    if (res.status === 403) {
      localStorage.removeItem("admin_token");
      showGate("토큰이 올바르지 않습니다.");
      return;
    }
    data = await res.json();
  } catch {
    els.refreshNote.textContent = "서버에 연결할 수 없습니다.";
    return;
  }
  if (!data || !data.ok) return;
  render(data);
}

function render(data) {
  const { summary, users, activeWindowSec, now } = data;
  els.totalUsers.textContent = summary.totalUsers;
  els.activeUsers.textContent = summary.activeUsers;
  els.activeNote.textContent = `최근 ${activeWindowSec}초 이내 활동`;

  const lessonsDoneTotal = users.reduce((sum, u) => sum + (u.lessonsCompleted || 0), 0);
  els.lessonsDone.textContent = lessonsDoneTotal;

  const perLesson = summary.perLesson || {};
  const lessonKeys = Object.keys(perLesson).sort((a, b) => Number(a) - Number(b));
  els.lessonChips.innerHTML = lessonKeys.length
    ? lessonKeys.map((k) => `<span class="lesson-chip">L${escapeHtml(k)} · ${perLesson[k]}명</span>`).join("")
    : '<span class="lesson-chip" style="background:#eee;color:#888">없음</span>';

  els.emptyMsg.hidden = users.length > 0;
  els.userRows.innerHTML = users.map((u) => {
    const pct = u.totalSteps > 0 ? Math.round((u.completedCount / u.totalSteps) * 100) : 0;
    return `<tr>
      <td><span class="dot ${u.online ? "online" : ""}"></span>${u.online ? "접속중" : "오프라인"}</td>
      <td>${escapeHtml(u.name || "-")}</td>
      <td>${escapeHtml(u.email)}</td>
      <td>L${escapeHtml(String(u.currentLesson || "-"))}</td>
      <td><span class="bar"><i style="width:${pct}%"></i></span><span class="prog-text">${u.completedCount}/${u.totalSteps} (${pct}%)</span></td>
      <td>${u.lessonsCompleted}</td>
      <td>${formatAgo(now - u.lastSeen)}</td>
    </tr>`;
  }).join("");

  els.refreshNote.textContent = `자동 새로고침 중 · ${new Date().toLocaleTimeString()}`;
}

function formatAgo(ms) {
  if (!ms || ms < 0) return "방금";
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec}초 전`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  return `${Math.floor(hr / 24)}일 전`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function submitToken() {
  const value = els.tokenInput.value.trim();
  if (!value) return;
  token = value;
  localStorage.setItem("admin_token", token);
  startDashboard();
}

els.tokenBtn.addEventListener("click", submitToken);
els.tokenInput.addEventListener("keydown", (e) => { if (e.key === "Enter") submitToken(); });
els.logoutBtn.addEventListener("click", () => {
  localStorage.removeItem("admin_token");
  token = "";
  showGate("");
});

if (token) startDashboard();
else showGate("");
