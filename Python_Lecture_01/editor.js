let data = null;
let currentIndex = null;

const el = (id) => document.getElementById(id);

async function init() {
  try {
    const res = await fetch("learning_steps_lesson1.json", { cache: "no-store" });
    data = await res.json();
  } catch {
    alert("서버가 실행 중인지 확인해주세요. prototype_server.py로 실행해야 합니다.");
    return;
  }
  el("fCourseTitle").value = data.courseTitle || "";
  el("fLessonGoal").value = data.lesson?.goal || "";
  renderStepList();
  if (data.steps.length > 0) selectStep(0);
}

function renderStepList() {
  const list = el("stepList");
  list.innerHTML = "";
  data.steps.forEach((step, i) => {
    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = `${step.id} · ${step.title}`;
    btn.classList.toggle("active", i === currentIndex);
    btn.addEventListener("click", () => selectStep(i));
    li.appendChild(btn);
    list.appendChild(li);
  });
}

function selectStep(index) {
  if (currentIndex !== null) saveFormToData();
  currentIndex = index;
  populateForm(data.steps[index]);
  renderStepList();
}

function populateForm(step) {
  el("stepForm").hidden = false;
  el("editorPanel").querySelector(".empty-state").hidden = true;
  el("formStepId").textContent = step.id;
  el("fId").value = step.id || "";
  el("fTitle").value = step.title || "";
  el("fConcepts").value = (step.concepts || []).join(", ");
  el("fExplanation").value = step.explanation || "";
  el("fMission").value = step.mission || "";
  el("fExpectedCode").value = step.expectedCode || "";
  el("fSuccessMessage").value = step.successMessage || "";
  el("fMascot").value = step.mascot || "";
  el("fMascotSpeech").value = step.mascotSpeech || "";
  el("fCompletionBadges").value = (step.completionBadges || []).join(", ");
  updateMascotPreview(step.mascot || "");
  renderErrorList(step.commonErrors || []);
  document.querySelectorAll(".auto-resize").forEach(autoResize);
}

function saveFormToData() {
  if (currentIndex === null) return;
  const step = data.steps[currentIndex];
  step.id = el("fId").value.trim();
  step.title = el("fTitle").value.trim();
  step.concepts = el("fConcepts").value.split(",").map(s => s.trim()).filter(Boolean);
  step.explanation = el("fExplanation").value;
  step.mission = el("fMission").value.trim();
  step.expectedCode = el("fExpectedCode").value.trim();
  step.successMessage = el("fSuccessMessage").value.trim();
  const mascot = el("fMascot").value;
  step.mascot = mascot || undefined;
  const speech = el("fMascotSpeech").value.trim();
  step.mascotSpeech = speech || undefined;
  const badges = el("fCompletionBadges").value.split(",").map(s => s.trim()).filter(Boolean);
  step.completionBadges = badges.length > 0 ? badges : undefined;
  step.commonErrors = collectErrors();
}

function renderErrorList(errors) {
  const container = el("errorList");
  container.innerHTML = "";
  errors.forEach((err, i) => container.appendChild(createErrorCard(err, i)));
}

function createErrorCard(err, index) {
  const card = document.createElement("div");
  card.className = "error-card";
  card.innerHTML = `
    <div class="error-card-head">
      <span>실수 패턴 ${index + 1}</span>
      <button type="button">삭제</button>
    </div>
    <label>패턴 (오타 코드)
      <textarea class="err-pattern code-textarea auto-resize" rows="1" spellcheck="false">${escHtml(err.pattern || "")}</textarea>
    </label>
    <label>유형
      <input class="err-type" value="${escAttr(err.type || "")}">
    </label>
    <label>학생에게 보여줄 메시지
      <textarea class="err-message auto-resize" rows="2">${escHtml(err.message || "")}</textarea>
    </label>`;
  card.querySelector(".error-card-head button").addEventListener("click", () => card.remove());
  card.querySelectorAll(".auto-resize").forEach(autoResize);
  return card;
}

function collectErrors() {
  return [...document.querySelectorAll(".error-card")].map(card => ({
    pattern: card.querySelector(".err-pattern").value,
    type: card.querySelector(".err-type").value,
    message: card.querySelector(".err-message").value
  })).filter(e => e.pattern.trim());
}

async function saveLesson() {
  saveFormToData();
  data.courseTitle = el("fCourseTitle").value.trim();
  if (data.lesson) data.lesson.goal = el("fLessonGoal").value.trim();

  try {
    const res = await fetch("/save-lesson", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data, null, 2)
    });
    const result = await res.json();
    showStatus(result.ok ? "저장됐어요!" : "저장 실패: " + result.message, result.ok);
  } catch {
    showStatus("서버에 연결할 수 없어요.", false);
  }
}

function showStatus(msg, ok) {
  const s = el("saveStatus");
  s.textContent = msg;
  s.style.color = ok ? "var(--ok)" : "var(--danger)";
  setTimeout(() => { s.textContent = ""; }, 3000);
}

function updateMascotPreview(filename) {
  const img = el("mascotPreview");
  if (filename) {
    img.src = filename;
    img.style.display = "block";
  } else {
    img.src = "";
    img.style.display = "none";
  }
}

function autoResize(el) {
  el.style.height = "auto";
  el.style.height = el.scrollHeight + "px";
}

function escHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escAttr(s) {
  return String(s).replace(/"/g, "&quot;");
}

el("saveBtn").addEventListener("click", saveLesson);

el("addStepBtn").addEventListener("click", () => {
  if (currentIndex !== null) saveFormToData();
  const num = data.steps.length + 1;
  data.steps.push({
    id: `L1-${String(num).padStart(2, "0")}`,
    title: "새 단계",
    concepts: [],
    explanation: "",
    mission: "",
    expectedCode: "",
    validation: { type: "single-line-exact", allowTrim: true, allowExtraBlankLines: true },
    commonErrors: [],
    successMessage: ""
  });
  renderStepList();
  selectStep(data.steps.length - 1);
});

el("deleteStepBtn").addEventListener("click", () => {
  if (currentIndex === null) return;
  const step = data.steps[currentIndex];
  if (!confirm(`'${step.id} · ${step.title}' 단계를 삭제할까요?`)) return;
  data.steps.splice(currentIndex, 1);
  const nextIndex = Math.min(currentIndex, data.steps.length - 1);
  currentIndex = null;
  renderStepList();
  if (data.steps.length > 0) {
    selectStep(nextIndex);
  } else {
    el("stepForm").hidden = true;
    el("editorPanel").querySelector(".empty-state").hidden = false;
  }
});

el("addErrorBtn").addEventListener("click", () => {
  const container = el("errorList");
  const count = container.querySelectorAll(".error-card").length;
  container.appendChild(createErrorCard({ pattern: "", type: "", message: "" }, count));
});

el("fMascot").addEventListener("change", (e) => updateMascotPreview(e.target.value));

document.addEventListener("input", (e) => {
  if (e.target.classList.contains("auto-resize")) autoResize(e.target);
});

init();
