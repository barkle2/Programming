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
  timerId: null,
  userName: "",
  userEmail: ""
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
  mascotImg: document.querySelector("#mascotImg"),
  mascotBubble: document.querySelector("#mascotBubble"),
  resetStepBtn: document.querySelector("#resetStepBtn"),
  runBtn: document.querySelector("#runBtn"),
  hintBtn: document.querySelector("#hintBtn"),
  nextBtn: document.querySelector("#nextBtn"),
  resultBox: document.querySelector("#resultBox"),
  resultTitle: document.querySelector("#resultTitle"),
  resultMessage: document.querySelector("#resultMessage"),
  badges: document.querySelector("#badges"),
  consoleWrap: document.querySelector("#consoleWrap"),
  consoleOutput: document.querySelector("#consoleOutput"),
  consoleClearBtn: document.querySelector("#consoleClearBtn"),
  completionModal: document.querySelector("#completionModal"),
  completionSummary: document.querySelector("#completionSummary"),
  closeCompletionBtn: document.querySelector("#closeCompletionBtn"),
  loginModal: document.querySelector("#loginModal"),
  loginScreen: document.querySelector("#loginScreen"),
  resumeScreen: document.querySelector("#resumeScreen"),
  resumeGreet: document.querySelector("#resumeGreet"),
  resumeDesc: document.querySelector("#resumeDesc"),
  inputName: document.querySelector("#inputName"),
  inputEmail: document.querySelector("#inputEmail"),
  loginBtn: document.querySelector("#loginBtn"),
  resumeBtn: document.querySelector("#resumeBtn"),
  restartBtn: document.querySelector("#restartBtn")
};

function init() {
  els.inputName.focus();
}

async function startLesson(savedData) {
  try {
    const response = await fetch("learning_steps_lesson1.json", { cache: "no-store" });
    state.data = await response.json();
  } catch {
    els.loginModal.hidden = true;
    setResult("error", "학습 데이터를 불러오지 못했어요", "로컬 서버로 prototype.html을 열어야 JSON 파일을 읽을 수 있습니다.");
    return;
  }

  if (savedData) {
    state.completed = new Set(savedData.completed);
    state.currentIndex = savedData.currentIndex;
    state.runCount = savedData.runCount ?? 0;
    state.successCount = savedData.successCount ?? 0;
    state.failureCount = savedData.failureCount ?? 0;
    state.typoCount = savedData.typoCount ?? 0;
    state.currentSuccessStreak = savedData.currentSuccessStreak ?? 0;
    state.bestSuccessStreak = savedData.bestSuccessStreak ?? 0;
    state.badges = new Set(savedData.badges ?? []);
    state.startTime = Date.now() - (savedData.elapsedMs ?? 0);
  }

  renderLesson();
  renderStep(state.currentIndex);
  renderBadges();
  startTimer();
  els.loginModal.hidden = true;
}

function saveProgress() {
  if (!state.userEmail) return;
  const data = {
    userName: state.userName,
    currentIndex: state.currentIndex,
    completed: [...state.completed],
    runCount: state.runCount,
    successCount: state.successCount,
    failureCount: state.failureCount,
    typoCount: state.typoCount,
    currentSuccessStreak: state.currentSuccessStreak,
    bestSuccessStreak: state.bestSuccessStreak,
    badges: [...state.badges],
    elapsedMs: Date.now() - state.startTime
  };
  localStorage.setItem(`python_lecture_1_${state.userEmail}`, JSON.stringify(data));
}

function loadProgress(email) {
  try {
    const raw = localStorage.getItem(`python_lecture_1_${email}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function handleLogin() {
  const name = els.inputName.value.trim();
  const email = els.inputEmail.value.trim();
  if (!name || !email) return;

  state.userName = name;
  state.userEmail = email;

  const saved = loadProgress(email);
  if (saved && saved.completed && saved.completed.length > 0) {
    els.resumeGreet.textContent = `반가워요, ${name}님!`;
    els.resumeDesc.textContent = `${saved.completed.length}단계까지 완료했어요. 이어서 할까요?`;
    els.loginScreen.hidden = true;
    els.resumeScreen.hidden = false;
  } else {
    startLesson(null);
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
  if (step.mascot) {
    els.mascotImg.src = step.mascot;
    els.mascotImg.alt = "고드래곤";
    els.mascotBubble.textContent = step.mascotSpeech || "";
    els.mascotImg.closest(".mascot-wrap").hidden = false;
  } else {
    els.mascotImg.closest(".mascot-wrap").hidden = true;
  }
  setResult("idle", "준비 완료", "설명을 읽고 코드를 직접 입력한 뒤 실행해보세요.");
  setConsole("", "");

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

  const launchResult = await launchPython(els.codeInput.value);

  if (!launchResult.ok) {
    setResult("error", "Python 오류", launchResult.explanation || "아래 오류 내용을 살펴보세요.");
    state.failureCount += 1;
    state.currentSuccessStreak = 0;
  } else if (stepMatches(step, userCode)) {
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
    setResult("success", "실행 성공", `${step.successMessage} ${launchResult.message}`);
    els.nextBtn.disabled = false;
    saveProgress();
    if (state.completed.size === state.data.steps.length) {
      showCompletion();
    }
  } else {
    state.failureCount += 1;
    state.currentSuccessStreak = 0;
    state.typoCount += looksLikeTypo(userCode, expectedCode) ? 1 : 0;
    awardTypoBadges();
    const matchedError = findCommonError(step, els.codeInput.value.trim());
    const message = matchedError ? matchedError.message : buildGenericError(step);
    setResult("error", matchedError ? matchedError.type : "다시 확인해보기", message);
  }

  updateStats();
  renderBadges();
  renderStepListState();
}

async function launchPython(code) {
  try {
    const response = await fetch("/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code })
    });
    const result = await response.json();
    if (!result.ok && result.stderr) {
      setConsole("error", result.stderr);
      return { ok: false, explanation: explainPythonError(result.stderr) };
    }
    setConsole("output", result.stdout || "");
    return { ok: true, message: result.message || "Python 실행 요청을 보냈어요." };
  } catch {
    return { ok: true, message: "현재 서버가 Python 실행 기능을 제공하지 않아요. `prototype_server.py`로 실행해야 실제 Tk 창이 열립니다." };
  }
}

function setConsole(stateName, text) {
  els.consoleWrap.dataset.state = stateName || "idle";
  els.consoleOutput.textContent = text || "";
}

function explainPythonError(stderr) {
  const errorLine = stderr.trim().split('\n').at(-1);
  const typeMatch = errorLine.match(/^(\w+Error|\w+Exception):/);
  if (!typeMatch) return null;

  const errorType = typeMatch[1];
  const q = [...errorLine.matchAll(/'([^']+)'/g)].map((m) => m[1]);

  const handlers = {
    AttributeError:     (q) => q.length >= 2 ? `'${q[0]}'에는 '${q[1]}'라는 기능이 없어요. 이름의 대소문자가 맞는지 확인해보세요.` : `잘못된 속성 이름이에요. 대소문자를 확인해보세요.`,
    NameError:          (q) => q[0] ? `'${q[0]}'이라는 이름을 찾을 수 없어요. 오타가 없는지, 먼저 정의했는지 확인해보세요.` : null,
    ModuleNotFoundError:(q) => q[0] ? `'${q[0]}' 모듈을 찾을 수 없어요.` : null,
    ImportError:        (q) => q.length >= 2 ? `'${q[1]}'에서 '${q[0]}'을 가져올 수 없어요. 이름이 올바른지 확인해보세요.` : null,
    SyntaxError:        ()  => `문법 오류예요. 괄호·따옴표·콜론이 빠진 곳이 없는지 확인해보세요.`,
    IndentationError:   ()  => `들여쓰기 오류예요. 줄 앞의 공백이 맞는지 확인해보세요.`,
    TypeError:          ()  => `타입 오류예요. 변수의 종류가 올바른지 확인해보세요.`,
    ZeroDivisionError:  ()  => `0으로 나눌 수 없어요.`,
    FileNotFoundError:  (q) => q[0] ? `'${q[0]}' 파일을 찾을 수 없어요.` : null,
  };

  const handler = handlers[errorType];
  return handler ? (handler(q) ?? null) : null;
}

function showHint() {
  const step = getCurrentStep();
  setResult("hint", "힌트", `이번 단계의 정답은 ${step.expectedCode.length}글자입니다. 핵심 단어는 \`${step.expectedCode.split(" ")[0]}\`입니다.`);
}

async function nextStep() {
  try { await fetch("/stop", { method: "POST" }); } catch (_) {}
  const nextIndex = Math.min(state.currentIndex + 1, state.data.steps.length - 1);
  renderStep(nextIndex);
  saveProgress();
}

function resetStep() {
  const step = getCurrentStep();
  if (isFullProgramMode()) {
    const prefill = computeFullProgramPrefill(state.currentIndex);
    els.codeInput.value = prefill ? `${prefill}\n` : "";
  } else {
    els.codeInput.value = step.validation?.type === "standalone" ? "" : getPrefixBefore(state.currentIndex);
  }
  updateCodeGhost();
  setConsole("", "");
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

function getBaseCode() {
  return state.data?.lesson?.baseCode || "";
}

function buildReplaceMap(upToIndex) {
  const map = new Map();
  state.data.steps.slice(0, upToIndex + 1).forEach((step) => {
    if (step.replaces) map.set(step.replaces, step);
  });
  return map;
}

function isFullProgramMode() {
  return state.data?.lesson?.mode === "full-program";
}

function getExpectedCodeThrough(index) {
  if (isFullProgramMode()) {
    return state.data.steps[index].expectedCode;
  }
  const base = getBaseCode();
  const replaceMap = buildReplaceMap(index);
  const stepCodes = [];
  state.data.steps.slice(0, index + 1).forEach((step) => {
    if (step.validation?.type === "standalone") return;
    if (step.replaces) return;
    const replacement = replaceMap.get(step.id);
    stepCodes.push(replacement ? replacement.expectedCode : step.expectedCode);
  });
  return [base, ...stepCodes].filter(Boolean).join("\n");
}

function getPrefixBefore(index) {
  if (isFullProgramMode()) return "";
  const base = getBaseCode();
  const currentStep = state.data.steps[index];
  const replaceMap = buildReplaceMap(index - 1);
  const stepCodes = [];
  state.data.steps.slice(0, index).forEach((step) => {
    if (!state.completed.has(step.id)) return;
    if (step.validation?.type === "standalone") return;
    if (step.replaces) return;
    if (currentStep.replaces && step.id === currentStep.replaces) return;
    const replacement = replaceMap.get(step.id);
    stepCodes.push(replacement ? replacement.expectedCode : step.expectedCode);
  });
  const prefix = [base, ...stepCodes].filter(Boolean).join("\n");
  return prefix ? `${prefix}\n` : "";
}

function getPrevStepCode(index) {
  if (index <= 0) return "";
  return state.data.steps[index - 1].expectedCode;
}

// Returns expectedCode with new lines replaced by blank lines,
// so the editor pre-fill has the same line count as expectedCode.
function computeFullProgramPrefill(index) {
  if (index <= 0) return "";
  const prevCode = state.data.steps[index - 1].expectedCode;
  const expectedCode = state.data.steps[index].expectedCode;
  const prevLineSet = new Set(
    prevCode.split("\n").map((l) => l.trim()).filter(Boolean)
  );
  return expectedCode
    .split("\n")
    .map((line) => (prevLineSet.has(line.trim()) ? line : ""))
    .join("\n");
}

// Returns ghost HTML: ghost-prefix spans for existing lines, plain text for new lines.
function buildFullProgramGhostHtml(index) {
  const prevCode = index > 0 ? state.data.steps[index - 1].expectedCode : "";
  const expectedCode = state.data.steps[index].expectedCode;
  const prevLineSet = new Set(
    prevCode.split("\n").map((l) => l.trim()).filter(Boolean)
  );
  return expectedCode
    .split("\n")
    .map((line) => {
      const isExisting = !line.trim() || prevLineSet.has(line.trim());
      return isExisting
        ? `<span class="ghost-prefix">${escapeHtml(line)}</span>`
        : escapeHtml(line);
    })
    .join("\n");
}

function getCodeForEditor(index) {
  const step = state.data.steps[index];
  if (step.validation?.type === "standalone") {
    return state.completed.has(step.id) ? `${step.expectedCode}\n` : "";
  }
  if (isFullProgramMode()) {
    if (state.completed.has(step.id)) {
      return `${step.expectedCode}\n`;
    }
    const prefill = computeFullProgramPrefill(index);
    return prefill ? `${prefill}\n` : "";
  }
  if (state.completed.has(step.id)) {
    return `${getExpectedCodeThrough(index)}\n`;
  }
  return getPrefixBefore(index);
}

function updateCodeGhost() {
  const step = getCurrentStep();

  if (isFullProgramMode()) {
    if (state.completed.has(step.id)) {
      els.codeGhost.innerHTML = "";
      return;
    }
    const prevCode = getPrevStepCode(state.currentIndex);
    const editorContent = els.codeInput.value.replace(/\n$/, "");
    const isUnmodified = normalizeCodeBlock(editorContent) === normalizeCodeBlock(prevCode);
    if (!isUnmodified) {
      els.codeGhost.innerHTML = "";
      return;
    }
    els.codeGhost.innerHTML = buildFullProgramGhostHtml(state.currentIndex);
    return;
  }

  const isStandalone = step.validation?.type === "standalone";
  const prefix = isStandalone ? "" : getPrefixBefore(state.currentIndex);
  const typedCurrentPart = els.codeInput.value.startsWith(prefix)
    ? els.codeInput.value.slice(prefix.length)
    : els.codeInput.value;

  if (state.completed.has(step.id) || typedCurrentPart.trim().length > 0) {
    els.codeGhost.innerHTML = "";
    return;
  }

  els.codeGhost.innerHTML = `<span class="ghost-prefix">${escapeHtml(prefix)}</span>${escapeHtml(step.expectedCode)}`;
}

function stepMatches(step, userCode) {
  if (step.validation?.type === "regex") {
    const prefix = normalizeCodeBlock(getPrefixBefore(state.currentIndex));
    const currentLine = prefix
      ? (userCode.startsWith(prefix) ? userCode.slice(prefix.length).trim() : null)
      : userCode;
    if (currentLine === null) return false;
    return new RegExp(step.validation.pattern).test(currentLine);
  }
  if (step.validation?.type === "standalone") {
    return normalizeCodeBlock(step.expectedCode) === userCode;
  }
  return userCode === normalizeCodeBlock(getExpectedCodeThrough(state.currentIndex));
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
els.consoleClearBtn.addEventListener("click", () => setConsole("", ""));
els.loginBtn.addEventListener("click", handleLogin);
els.inputEmail.addEventListener("keydown", (e) => { if (e.key === "Enter") handleLogin(); });
els.inputName.addEventListener("keydown", (e) => { if (e.key === "Enter") els.inputEmail.focus(); });
els.resumeBtn.addEventListener("click", () => startLesson(loadProgress(state.userEmail)));
els.restartBtn.addEventListener("click", () => {
  localStorage.removeItem(`python_lecture_1_${state.userEmail}`);
  startLesson(null);
});
els.closeCompletionBtn.addEventListener("click", () => {
  els.completionModal.hidden = true;
});
els.codeInput.addEventListener("input", updateCodeGhost);
els.codeInput.addEventListener("scroll", () => {
  els.codeGhost.scrollTop = els.codeInput.scrollTop;
  els.codeGhost.scrollLeft = els.codeInput.scrollLeft;
});

init();
