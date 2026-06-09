const state = {
  data: null,
  currentIndex: 0,
  completed: new Set(),
  runCount: 0,
  successCount: 0,
  failureCount: 0,
  typoCount: 0,
  currentSuccessStreak: 0,
  bestSuccessStreak: 0,
  badges: new Set(),
  startTime: Date.now(),
  timerId: null
};

const els = {
  progressText: document.querySelector("#progressText"),
  streakText: document.querySelector("#streakText"),
  timerText: document.querySelector("#timerText"),
  lessonGoal: document.querySelector("#lessonGoal"),
  stepList: document.querySelector("#stepList"),
  stepId: document.querySelector("#stepId"),
  stepTitle: document.querySelector("#stepTitle"),
  concepts: document.querySelector("#concepts"),
  explanation: document.querySelector("#explanation"),
  missionText: document.querySelector("#missionText"),
  codeInput: document.querySelector("#codeInput"),
  codeGhost: document.querySelector("#codeGhost"),
  resetStepBtn: document.querySelector("#resetStepBtn"),
  runBtn: document.querySelector("#runBtn"),
  hintBtn: document.querySelector("#hintBtn"),
  nextBtn: document.querySelector("#nextBtn"),
  resultBox: document.querySelector("#resultBox"),
  resultTitle: document.querySelector("#resultTitle"),
  resultMessage: document.querySelector("#resultMessage"),
  badges: document.querySelector("#badges"),
  completionModal: document.querySelector("#completionModal"),
  completionSummary: document.querySelector("#completionSummary"),
  closeCompletionBtn: document.querySelector("#closeCompletionBtn")
};

async function init() {
  try {
    const response = await fetch("learning_steps_lesson1.json", { cache: "no-store" });
    state.data = await response.json();
    renderLesson();
    renderStep(0);
    startTimer();
  } catch (error) {
    setResult("error", "학습 데이터를 불러오지 못했어요", "로컬 서버로 prototype.html을 열어야 JSON 파일을 읽을 수 있습니다.");
  }
}

function renderLesson() {
  document.title = state.data.courseTitle;
  els.lessonGoal.textContent = state.data.lesson.goal;
  els.stepList.innerHTML = "";

  state.data.steps.forEach((step, index) => {
    const li = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = `${step.id} · ${step.title}`;
    button.addEventListener("click", () => {
      if (!button.disabled) renderStep(index);
    });
    li.append(button);
    els.stepList.append(li);
  });

  updateStats();
}

function renderStep(index) {
  state.currentIndex = index;
  const step = getCurrentStep();
  els.stepId.textContent = step.id;
  els.stepTitle.textContent = step.title;
  els.concepts.innerHTML = step.concepts.map((concept) => `<span>${escapeHtml(concept)}</span>`).join("");
  els.explanation.innerHTML = formatExplanation(step.explanation);
  els.missionText.textContent = step.mission;
  els.codeInput.value = getCodeForEditor(index);
  updateCodeGhost();
  els.nextBtn.disabled = !state.completed.has(step.id);
  setResult("idle", "준비 완료", "설명을 읽고 코드를 직접 입력한 뒤 실행해보세요.");

  [...els.stepList.querySelectorAll("button")].forEach((button, buttonIndex) => {
    const targetStep = state.data.steps[buttonIndex];
    button.classList.toggle("active", buttonIndex === index);
    button.classList.toggle("done", state.completed.has(targetStep.id));
    button.disabled = buttonIndex > state.completed.size;
  });

  els.codeInput.focus();
  updateStats();
}

async function runCurrentStep() {
  const step = getCurrentStep();
  const userCode = normalizeCodeBlock(els.codeInput.value);
  const expectedCode = normalizeCodeBlock(getExpectedCodeThrough(state.currentIndex));
  state.runCount += 1;

  if (userCode === expectedCode) {
    const launchResult = await launchPython(els.codeInput.value);
    state.completed.add(step.id);
    state.successCount += 1;
    state.currentSuccessStreak += 1;
    state.bestSuccessStreak = Math.max(state.bestSuccessStreak, state.currentSuccessStreak);
    awardSuccessBadges();
    if (state.successCount === 1) {
      state.badges.add("첫 성공");
    }
    if (step.completionBadges) {
      step.completionBadges.forEach((badge) => state.badges.add(badge));
    }
    setResult("success", "실행 성공", `${step.successMessage} ${launchResult}`);
    els.nextBtn.disabled = false;
    updateStats();
    renderBadges();
    renderStepListState();
    if (state.completed.size === state.data.steps.length) {
      showCompletion();
    }
    return;
  }

  state.failureCount += 1;
  state.currentSuccessStreak = 0;
  state.typoCount += looksLikeTypo(userCode, expectedCode) ? 1 : 0;
  awardTypoBadges();
  const matchedError = findCommonError(step, els.codeInput.value.trim());
  const message = matchedError ? matchedError.message : buildGenericError(step);
  setResult("error", matchedError ? matchedError.type : "다시 확인해보기", message);
  updateStats();
  renderBadges();
}

async function launchPython(code) {
  try {
    const response = await fetch("/run", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ code })
    });
    const result = await response.json();
    return result.message || "Python 실행 요청을 보냈어요.";
  } catch (error) {
    return "현재 서버가 Python 실행 기능을 제공하지 않아요. `prototype_server.py`로 실행해야 실제 Tk 창이 열립니다.";
  }
}

function showHint() {
  const step = getCurrentStep();
  setResult("hint", "힌트", `이번 단계의 정답은 ${step.expectedCode.length}글자입니다. 핵심 단어는 \`${step.expectedCode.split(" ")[0]}\`입니다.`);
}

function nextStep() {
  const nextIndex = Math.min(state.currentIndex + 1, state.data.steps.length - 1);
  renderStep(nextIndex);
}

function resetStep() {
  els.codeInput.value = getPrefixBefore(state.currentIndex);
  updateCodeGhost();
  setResult("idle", "다시 입력", "천천히 한 글자씩 입력해보세요. 오타가 나도 괜찮습니다.");
  els.codeInput.focus();
}

function getCurrentStep() {
  return state.data.steps[state.currentIndex];
}

function normalizeCode(code) {
  return code.replace(/\r/g, "").trim().replace(/[ \t]+/g, " ");
}

function normalizeCodeBlock(code) {
  return code
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim().replace(/[ \t]+/g, " "))
    .filter((line) => line.length > 0)
    .join("\n");
}

function getExpectedCodeThrough(index) {
  return state.data.steps
    .slice(0, index + 1)
    .map((step) => step.expectedCode)
    .join("\n");
}

function getPrefixBefore(index) {
  const prefix = state.data.steps
    .slice(0, index)
    .filter((step) => state.completed.has(step.id))
    .map((step) => step.expectedCode)
    .join("\n");
  return prefix ? `${prefix}\n` : "";
}

function getCodeForEditor(index) {
  if (state.completed.has(state.data.steps[index].id)) {
    return `${getExpectedCodeThrough(index)}\n`;
  }
  return getPrefixBefore(index);
}

function updateCodeGhost() {
  const step = getCurrentStep();
  const prefix = getPrefixBefore(state.currentIndex);
  const typedCurrentPart = els.codeInput.value.startsWith(prefix)
    ? els.codeInput.value.slice(prefix.length)
    : els.codeInput.value;

  if (state.completed.has(step.id) || typedCurrentPart.trim().length > 0) {
    els.codeGhost.innerHTML = "";
    return;
  }

  els.codeGhost.innerHTML = `<span class="ghost-prefix">${escapeHtml(prefix)}</span>${escapeHtml(step.expectedCode)}`;
}

function looksLikeTypo(userCode, expectedCode) {
  if (!userCode) return false;
  return Math.abs(userCode.length - expectedCode.length) <= 3 || userCode.split(" ")[0] !== expectedCode.split(" ")[0];
}

function findCommonError(step, rawCode) {
  const prefix = getPrefixBefore(state.currentIndex);
  const currentPart = rawCode.startsWith(prefix) ? rawCode.slice(prefix.length) : rawCode;
  return step.commonErrors.find((error) => normalizeCode(error.pattern) === normalizeCode(currentPart.trim()));
}

function buildGenericError(step) {
  return `코드 전체가 이번 단계까지의 모양과 조금 달라요. 새로 입력할 줄은 \`${step.expectedCode}\`입니다. 이전 단계 코드가 지워지지 않았는지, 대소문자, 따옴표, 괄호, 점(.)을 차례로 확인해보세요.`;
}

function awardSuccessBadges() {
  state.data.gameRules.successStreakMilestones.forEach((count) => {
    if (state.currentSuccessStreak >= count) {
      state.badges.add(`${count}회 연속 성공`);
    }
  });
}

function awardTypoBadges() {
  state.data.gameRules.typoBadgeMilestones.forEach((rule) => {
    if (state.typoCount >= rule.count) {
      state.badges.add(rule.badge);
    }
  });
}

function renderBadges() {
  if (state.badges.size === 0) {
    els.badges.innerHTML = "<span>아직 배지가 없어요</span>";
    return;
  }
  els.badges.innerHTML = [...state.badges].map((badge) => `<span>${escapeHtml(badge)}</span>`).join("");
}

function renderStepListState() {
  [...els.stepList.querySelectorAll("button")].forEach((button, index) => {
    const step = state.data.steps[index];
    button.classList.toggle("done", state.completed.has(step.id));
    button.disabled = index > state.completed.size;
  });
}

function updateStats() {
  if (!state.data) return;
  els.progressText.textContent = `${state.completed.size} / ${state.data.steps.length}`;
  els.streakText.textContent = state.currentSuccessStreak;
}

function startTimer() {
  state.timerId = window.setInterval(() => {
    els.timerText.textContent = formatElapsed(Date.now() - state.startTime);
  }, 500);
}

function formatElapsed(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function showCompletion() {
  const summary = state.data.lessonCompletion.summaryTemplate
    .replace("{elapsedTime}", formatElapsed(Date.now() - state.startTime))
    .replace("{runCount}", state.runCount)
    .replace("{typoCount}", state.typoCount)
    .replace("{bestSuccessStreak}", state.bestSuccessStreak);
  els.completionSummary.textContent = summary;
  els.completionModal.hidden = false;
}

function setResult(stateName, title, message) {
  els.resultBox.dataset.state = stateName;
  els.resultTitle.textContent = title;
  els.resultMessage.textContent = message;
}

function formatExplanation(text) {
  return text
    .split(/\n\s*\n/)
    .map((paragraph) => `<p>${formatInlineCode(escapeHtml(paragraph))}</p>`)
    .join("");
}

function formatInlineCode(text) {
  return text.replace(/`([^`]+)`/g, "<code>$1</code>");
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

els.runBtn.addEventListener("click", runCurrentStep);
els.hintBtn.addEventListener("click", showHint);
els.nextBtn.addEventListener("click", nextStep);
els.resetStepBtn.addEventListener("click", resetStep);
els.closeCompletionBtn.addEventListener("click", () => {
  els.completionModal.hidden = true;
});
els.codeInput.addEventListener("input", updateCodeGhost);
els.codeInput.addEventListener("scroll", () => {
  els.codeGhost.scrollTop = els.codeInput.scrollTop;
  els.codeGhost.scrollLeft = els.codeInput.scrollLeft;
});

init();
