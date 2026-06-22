const LESSON_NUM = new URLSearchParams(window.location.search).get("lesson") || "1";

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
  lessonTabs: document.querySelector("#lessonTabs"),
  stepList: document.querySelector("#stepList"),
  stepId: document.querySelector("#stepId"),
  stepTitle: document.querySelector("#stepTitle"),
  concepts: document.querySelector("#concepts"),
  explanation: document.querySelector("#explanation"),
  missionText: document.querySelector("#missionText"),
  codeInput: document.querySelector("#codeInput"),
  codeGhost: document.querySelector("#codeGhost"),
  lineNumbers: document.querySelector("#lineNumbers"),
  lessonEyebrow: document.querySelector("#lessonEyebrow"),
  courseHeading: document.querySelector("#courseHeading"),
  loginEyebrow: document.querySelector("#loginEyebrow"),
  completionTitle: document.querySelector("#completionTitle"),
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
  hintBox: document.querySelector("#hintBox"),
  hintCode: document.querySelector("#hintCode"),
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
  els.loginEyebrow.textContent = `Lesson ${LESSON_NUM}`;
  try {
    const raw = localStorage.getItem("python_lecture_user");
    if (raw) {
      const { userName, userEmail } = JSON.parse(raw);
      if (userName && userEmail) {
        state.userName = userName;
        state.userEmail = userEmail;
        const saved = loadProgress(userEmail);
        // 레슨 탭으로 이동해 온 경우 재개 화면 없이 바로 진입한다
        if (sessionStorage.getItem("skip_resume")) {
          sessionStorage.removeItem("skip_resume");
          startLesson(saved || null);
          return;
        }
        if (saved && saved.completed && saved.completed.length > 0) {
          els.resumeGreet.textContent = `반가워요, ${userName}님!`;
          els.resumeDesc.textContent = `${saved.completed.length}단계까지 완료했어요. 이어서 할까요?`;
          els.loginScreen.hidden = true;
          els.resumeScreen.hidden = false;
          els.loginModal.hidden = false;
        } else {
          startLesson(null);
        }
        return;
      }
    }
  } catch {}
  els.loginModal.hidden = false;
  els.inputName.focus();
}

async function startLesson(savedData) {
  // 로그인된 사용자가 레슨으로 진입하는 경로이므로, 비동기 작업 전에 모달을 즉시 숨겨 깜빡임을 막는다
  els.loginModal.hidden = true;
  try {
    const response = await fetch(`learning_steps_lesson${LESSON_NUM}.json`, { cache: "no-store" });
    state.data = await response.json();
  } catch {
    els.loginModal.hidden = true;
    setResult("error", "학습 데이터를 불러오지 못했어요", "로컬 서버로 lec_calc.html을 열어야 JSON 파일을 읽을 수 있습니다.");
    return;
  }

  // 잠긴 레슨에 직접 접근한 경우 갈 수 있는 레슨으로 되돌린다
  if (!(await enforceLessonLock())) return;

  if (savedData) {
    state.completed = new Set(savedData.completed);
    state.currentIndex = Math.min(savedData.currentIndex ?? 0, state.data.steps.length - 1);
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
  buildLessonTabs();
  startHeartbeat();
  reportProgress();
}

// 존재하는 레슨 파일을 탐색하고 각 레슨의 완료 여부까지 묶어서 돌려준다(캐시)
async function probeLessons() {
  if (state.lessonsCache) return state.lessonsCache;
  const lessons = [];
  for (let n = 1; n <= 20; n++) {
    try {
      const res = await fetch(`learning_steps_lesson${n}.json`, { cache: "no-store" });
      if (!res.ok) break;
      const data = await res.json();
      const stepCount = data.steps?.length ?? 0;
      const prog = loadProgressFor(n, state.userEmail);
      const completed = !!(prog && stepCount > 0 && (prog.completed?.length ?? 0) >= stepCount);
      lessons.push({ n, title: data.lesson?.title || `Lesson ${n}`, stepCount, completed });
    } catch {
      break;
    }
  }
  state.lessonsCache = lessons;
  return lessons;
}

// 레슨 잠금 해제 규칙: 1번은 항상 열림, 그 외에는 직전 레슨을 완료했거나 이미 끝낸 레슨이면 열림
function computeUnlocked(lessons) {
  const map = new Map();
  let prevCompleted = true;
  lessons.forEach(({ n, completed }) => {
    map.set(n, n === 1 || prevCompleted || completed);
    prevCompleted = completed;
  });
  return map;
}

// 잠긴 레슨에 직접 접근하면 갈 수 있는 가장 높은 레슨으로 되돌린다. 진입 허용 시 true 반환.
async function enforceLessonLock() {
  const lessons = await probeLessons();
  if (!lessons.length) return true;
  const unlockedMap = computeUnlocked(lessons);
  const curN = parseInt(LESSON_NUM);
  if (!unlockedMap.has(curN) || unlockedMap.get(curN)) return true;

  let target = 1;
  unlockedMap.forEach((ok, n) => {
    if (ok) target = Math.max(target, n);
  });
  sessionStorage.setItem("skip_resume", "1");
  window.location.replace(`lec_calc.html?lesson=${target}`);
  return false;
}

// 사용 가능한 레슨을 찾아 레슨 이동 탭을 만든다(이전 레슨 완료 전까지는 잠금)
async function buildLessonTabs() {
  if (!els.lessonTabs) return;
  const lessons = await probeLessons();
  const unlockedMap = computeUnlocked(lessons);

  els.lessonTabs.innerHTML = "";
  lessons.forEach(({ n, title, completed }) => {
    const unlocked = unlockedMap.get(n);
    const isCurrent = String(n) === String(LESSON_NUM);

    const button = document.createElement("button");
    button.type = "button";
    button.className = "lesson-tab";
    button.textContent = unlocked ? `L${n}` : `🔒 L${n}`;
    button.title = unlocked
      ? `Lesson ${n} · ${title}`
      : `Lesson ${n} · 이전 레슨을 완료하면 열려요`;
    if (isCurrent) button.classList.add("active");
    if (completed) button.classList.add("done");
    if (!unlocked) {
      button.classList.add("locked");
      button.disabled = true;
    }

    button.addEventListener("click", () => {
      if (isCurrent || !unlocked) return;
      saveProgress();
      if (state.userEmail) {
        localStorage.setItem("python_lecture_user", JSON.stringify({ userName: state.userName, userEmail: state.userEmail }));
      }
      sessionStorage.setItem("skip_resume", "1");
      window.location.href = `lec_calc.html?lesson=${n}`;
    });

    els.lessonTabs.append(button);
  });
}

// 이메일별 단일 저장소 키. 한 사람의 모든 레슨 진행상황을 이 안에 모아둔다.
const progressKey = (email) => `python_lecture_progress_${email}`;

function readUserStore(email) {
  if (!email) return null;
  try {
    const raw = localStorage.getItem(progressKey(email));
    if (raw) return JSON.parse(raw);
  } catch {}
  // 예전 방식(레슨별 키)으로 저장된 데이터가 있으면 한 번에 합쳐서 옮긴다
  return migrateLegacyProgress(email);
}

function writeUserStore(email, store) {
  localStorage.setItem(progressKey(email), JSON.stringify(store));
}

function migrateLegacyProgress(email) {
  const lessons = {};
  let userName = "";
  let found = false;
  for (let n = 1; n <= 20; n++) {
    const legacyKey = `python_lecture_${n}_${email}`;
    const raw = localStorage.getItem(legacyKey);
    if (!raw) continue;
    try {
      const data = JSON.parse(raw);
      lessons[n] = data;
      if (data.userName) userName = data.userName;
      found = true;
    } catch {}
  }
  if (!found) return null;
  const store = { userName, lessons };
  writeUserStore(email, store);
  for (let n = 1; n <= 20; n++) localStorage.removeItem(`python_lecture_${n}_${email}`);
  return store;
}

function saveProgress() {
  if (!state.userEmail) return;
  const store = readUserStore(state.userEmail) || { userName: state.userName, lessons: {} };
  store.userName = state.userName;
  if (!store.lessons) store.lessons = {};
  store.lessons[LESSON_NUM] = {
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
  writeUserStore(state.userEmail, store);
  localStorage.setItem("python_lecture_user", JSON.stringify({ userName: state.userName, userEmail: state.userEmail }));
  reportProgress();
}

// ---- 서버로 진행상황/접속 신호 보고 (실패해도 학습에는 지장 없음) ----
function postJson(path, body) {
  return fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    keepalive: true
  }).catch(() => {});
}

function reportProgress() {
  if (!state.userEmail || !state.data) return;
  postJson("/progress", {
    name: state.userName,
    email: state.userEmail,
    lesson: LESSON_NUM,
    completedCount: state.completed.size,
    totalSteps: state.data.steps.length,
    currentIndex: state.currentIndex,
    badges: state.badges.size,
    elapsedMs: Date.now() - state.startTime
  });
}

function sendHeartbeat() {
  if (!state.userEmail) return;
  postJson("/heartbeat", {
    name: state.userName,
    email: state.userEmail,
    lesson: LESSON_NUM
  });
}

function startHeartbeat() {
  if (state.heartbeatId) clearInterval(state.heartbeatId);
  sendHeartbeat();
  state.heartbeatId = setInterval(sendHeartbeat, 30000);
}

function loadProgress(email) {
  return loadProgressFor(LESSON_NUM, email);
}

function loadProgressFor(lessonNum, email) {
  const store = readUserStore(email);
  return store?.lessons?.[lessonNum] || null;
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
  els.lessonEyebrow.textContent = `Lesson ${LESSON_NUM}`;
  els.courseHeading.textContent = state.data.lesson.title || state.data.courseTitle;
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
  updateLineNumbers();
  els.nextBtn.disabled = !state.completed.has(step.id);
  const mascotSrc = getAllowedMascotSrc(step.mascot);
  if (mascotSrc) {
    els.mascotImg.src = mascotSrc;
    els.mascotImg.alt = "고드래곤";
    els.mascotBubble.textContent = step.mascotSpeech || "";
    els.mascotImg.closest(".mascot-wrap").hidden = false;
  } else {
    els.mascotImg.closest(".mascot-wrap").hidden = true;
  }
  setResult("idle", "준비 완료", "설명을 읽고 코드를 직접 입력한 뒤 실행해보세요.");
  setConsole("", "");
  els.hintBox.hidden = true;
  els.hintBtn.textContent = "힌트 보기";

  [...els.stepList.querySelectorAll("button")].forEach((button, buttonIndex) => {
    const targetStep = state.data.steps[buttonIndex];
    button.classList.toggle("active", buttonIndex === index);
    button.classList.toggle("done", state.completed.has(targetStep.id));
    button.disabled = buttonIndex > state.completed.size;
  });

  els.codeInput.focus();
  updateStats();
}

function getAllowedMascotSrc(src) {
  if (!src) return "";
  const normalized = src.replace(/\\/g, "/");
  const filename = normalized.split("/").pop();
  if (!/^(고드래곤|기본버전)_\d{2}_.+\.(png|jpe?g|gif)$/i.test(filename)) return "";
  return `mascot/${filename}`;
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
    els.hintBox.hidden = true;
    els.hintBtn.textContent = "힌트 보기";
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
    return { ok: true, message: "현재 서버가 Python 실행 기능을 제공하지 않아요. `lec_calc_server.py`로 실행해야 실제 Tk 창이 열립니다." };
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

// 두 줄의 유사도(0~1): 공통 접두사+접미사 길이를 더 긴 줄 길이로 나눈 값.
// 들여쓰기 차이는 무시하려고 trim 후 비교한다. 한 줄을 고친 경우 점수가 높게 나온다.
function lineSimilarity(a, b) {
  const x = a.trim();
  const y = b.trim();
  if (!x || !y) return 0;
  const max = Math.max(x.length, y.length);
  let p = 0;
  while (p < x.length && p < y.length && x[p] === y[p]) p++;
  let s = 0;
  while (s < x.length - p && s < y.length - p
    && x[x.length - 1 - s] === y[y.length - 1 - s]) s++;
  return (p + s) / max;
}

// 원본에서 연속됐던 줄끼리 한 단락으로 묶고, 떨어져 있던 단락 사이에는 빈 줄을 넣는다.
// items: [{ line, idx }] (idx = expectedCode에서의 원래 줄 번호, 오름차순)
function groupIntoBlocks(items) {
  const blocks = [];
  let current = null;
  let prevIdx = -2;
  items.forEach(({ line, idx }) => {
    if (current && idx === prevIdx + 1) {
      current.push(line);
    } else {
      current = [line];
      blocks.push(current);
    }
    prevIdx = idx;
  });
  return blocks.map((block) => block.join("\n")).join("\n\n");
}

// expectedCode의 각 줄을 prevCode와 비교해 분류한다(힌트·에디터 prefill·고스트가 공유).
// 반환:
//   classified: expectedCode 줄 순서대로 [{ type, line, idx, prevLine? }]
//     - "existing": 이전에도 있던 줄
//     - "added":    완전히 새로 추가된 줄
//     - "modified": 기존 줄을 고친 줄 (prevLine = 고치기 전 줄)
//   unmatchedDeleted: 새 줄과 짝지어지지 않고 사라진 줄(순수 삭제)
function classifyExpectedLines(prevCode, expectedCode) {
  const isNewExp = computeNewLineFlags(prevCode, expectedCode);
  const isDelPrev = computeNewLineFlags(expectedCode, prevCode);
  const expArr = expectedCode.replace(/\r/g, "").split("\n");
  const prevArr = prevCode.replace(/\r/g, "").split("\n");

  const deleted = [];
  prevArr.forEach((l, i) => { if (isDelPrev[i] && l.trim()) deleted.push(l); });
  const usedDel = new Array(deleted.length).fill(false);

  const newIdxs = [];
  expArr.forEach((l, i) => { if (isNewExp[i] && l.trim()) newIdxs.push(i); });
  const pairedPrev = new Map(); // expIdx -> prevLine (modified로 확정된 새 줄)

  // 1차: 내용(공백 제거)이 똑같은 '사라진 줄'을 먼저 짝짓는다(들여쓰기만 바뀐 수정).
  // 유사도 짝짓기가 옛 줄을 엉뚱한 새 줄에 가로채지 못하도록 먼저 확정해 둔다.
  // (예: L2 buttonClick 본문의 key 줄이 L3 else로 이동 → result 줄이 아니라 그 key 줄과 짝지어야 함)
  newIdxs.forEach((idx) => {
    const t = expArr[idx].trim();
    const k = deleted.findIndex((d, j) => !usedDel[j] && d.trim() === t);
    if (k >= 0) { usedDel[k] = true; pairedPrev.set(idx, deleted[k]); }
  });

  // 2차: 남은 새 줄을 가장 비슷한(임계 0.5) 남은 사라진 줄과 짝짓는다.
  newIdxs.forEach((idx) => {
    if (pairedPrev.has(idx)) return;
    const line = expArr[idx];
    let best = -1;
    let bestScore = 0;
    deleted.forEach((d, k) => {
      if (usedDel[k]) return;
      const score = lineSimilarity(line, d);
      if (score > bestScore) { bestScore = score; best = k; }
    });
    if (best >= 0 && bestScore >= 0.5) { usedDel[best] = true; pairedPrev.set(idx, deleted[best]); }
  });

  const classified = expArr.map((line, idx) => {
    if (!(isNewExp[idx] && line.trim())) return { type: "existing", line, idx };
    if (pairedPrev.has(idx)) return { type: "modified", line, idx, prevLine: pairedPrev.get(idx) };
    return { type: "added", line, idx };
  });
  const unmatchedDeleted = deleted.filter((_, k) => !usedDel[k]);
  return { classified, unmatchedDeleted };
}

function getNewLinesForHint(index) {
  const step = state.data.steps[index];
  const expectedCode = step.expectedCode;
  if (index <= 0 && !step.validation?.prevCode) return expectedCode;
  const prevCode = step.validation?.prevCode
    || (index > 0 ? state.data.steps[index - 1].expectedCode : "");

  if (isEditStep(step)) {
    const { classified, unmatchedDeleted } = classifyExpectedLines(prevCode, expectedCode);

    if (step.validation.editMode === "delete") {
      return unmatchedDeleted.length > 0
        ? `[삭제할 줄]\n${unmatchedDeleted.join("\n")}`
        : "(삭제할 줄 없음)";
    }
    if (step.validation.editMode === "modify") {
      // 떨어져 있던 줄끼리는 빈 줄로 단락을 나눈다(groupIntoBlocks).
      const added = classified.filter((c) => c.type === "added");
      const changed = classified.filter((c) => c.type === "modified");
      const parts = [];
      if (added.length > 0) parts.push(`[추가할 줄]\n${groupIntoBlocks(added)}`);
      if (changed.length > 0) parts.push(`[바꿀 줄]\n${groupIntoBlocks(changed)}`);
      if (unmatchedDeleted.length > 0) parts.push(`[삭제할 줄]\n${unmatchedDeleted.join("\n")}`);
      return parts.join("\n\n") || expectedCode;
    }
  }

  const isNew = computeNewLineFlags(prevCode, expectedCode);
  return expectedCode
    .replace(/\r/g, "")
    .split("\n")
    .filter((line, idx) => isNew[idx] && line.trim())
    .join("\n")
    .trim();
}

function showHint() {
  if (els.hintBox.hidden) {
    els.hintCode.textContent = getNewLinesForHint(state.currentIndex);
    els.hintBox.hidden = false;
    els.hintBtn.textContent = "힌트 닫기";
  } else {
    els.hintBox.hidden = true;
    els.hintBtn.textContent = "힌트 보기";
  }
}

async function nextStep() {
  fetch("/stop", { method: "POST" }).catch(() => {});
  const nextIndex = state.currentIndex + 1;
  if (nextIndex >= state.data.steps.length) {
    const nextLesson = parseInt(LESSON_NUM) + 1;
    if (state.userEmail) {
      localStorage.setItem("python_lecture_user", JSON.stringify({ userName: state.userName, userEmail: state.userEmail }));
    }
    const hasNext = await fetch(`learning_steps_lesson${nextLesson}.json`, { method: "HEAD", cache: "no-store" })
      .then((r) => r.ok)
      .catch(() => false);
    if (hasNext) {
      window.location.href = `lec_calc.html?lesson=${nextLesson}`;
    } else {
      showCompletion();
    }
    return;
  }
  renderStep(nextIndex);
  saveProgress();
}

function resetStep() {
  const step = getCurrentStep();
  if (isFullProgramMode()) {
    if (isEditStep(step) && !isModifyStep(step)) {
      const prevCode = resolvePrevCode(state.currentIndex);
      els.codeInput.value = prevCode ? `${prevCode}\n` : "";
    } else {
      const prefill = computeFullProgramPrefill(state.currentIndex);
      els.codeInput.value = prefill ? `${prefill}\n` : "";
    }
  } else {
    els.codeInput.value = step.validation?.type === "standalone" ? "" : getPrefixBefore(state.currentIndex);
  }
  updateCodeGhost();
  updateLineNumbers();
  setConsole("", "");
  setResult("idle", "다시 입력", "천천히 한 글자씩 입력해보세요. 오타가 나도 괜찮습니다.");
  els.codeInput.focus();
}

function getCurrentStep() {
  return state.data.steps[state.currentIndex];
}

function isEditStep(step) {
  const mode = step.validation?.editMode;
  return mode === "modify" || mode === "delete";
}

function normalizeLineSpaces(line) {
  let result = "";
  let i = 0;
  while (i < line.length) {
    const ch = line[i];
    if (ch === '"' || ch === "'") {
      const quote = ch;
      result += ch;
      i++;
      while (i < line.length) {
        if (line[i] === "\\" && i + 1 < line.length) {
          result += line[i] + line[i + 1];
          i += 2;
        } else if (line[i] === quote) {
          result += line[i++];
          break;
        } else {
          result += line[i++];
        }
      }
    } else if (ch === " " || ch === "\t") {
      let j = i + 1;
      while (j < line.length && (line[j] === " " || line[j] === "\t")) j++;
      const prevCh = result.length > 0 ? result[result.length - 1] : "";
      const nextCh = j < line.length ? line[j] : "";
      if (/\w/.test(prevCh) && /\w/.test(nextCh)) result += " ";
      i = j;
    } else {
      result += ch;
      i++;
    }
  }
  return result;
}

function normalizeCodeBlock(code) {
  return code
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => normalizeLineSpaces(line.trim()))
    .filter((line) => line.length > 0 && !line.startsWith("#"))
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

// 단계가 기준으로 삼는 '이전 코드'. validation.prevCode가 있으면 우선 사용하고,
// 없으면 직전 단계의 expectedCode를 쓴다.
function resolvePrevCode(index) {
  if (index < 0) return "";
  const step = state.data.steps[index];
  return step?.validation?.prevCode
    || (index > 0 ? state.data.steps[index - 1].expectedCode : "");
}

// modify 단계인지(추가/수정 줄을 prefill+고스트로 안내). delete 단계는 제외.
function isModifyStep(step) {
  return step?.validation?.editMode === "modify";
}

// LCS(최장 공통 부분수열)로 prevCode와 expectedCode를 줄 단위 정렬해,
// expectedCode의 각 줄이 '새로 추가된 줄'인지(true) '이전부터 있던 줄'인지(false) 표시한다.
// 단순 Set 비교와 달리, 같은 내용의 줄이 반복돼도 순서·개수를 지켜 올바르게 구분한다.
function computeNewLineFlags(prevCode, expectedCode) {
  const prev = prevCode.replace(/\r/g, "").split("\n");
  const expected = expectedCode.replace(/\r/g, "").split("\n");
  const m = prev.length;
  const n = expected.length;

  const dp = Array.from({ length: m + 1 }, () => new Int32Array(n + 1));
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      dp[i][j] = prev[i] === expected[j]
        ? dp[i + 1][j + 1] + 1
        : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const isNew = new Array(n).fill(true);
  let i = 0;
  let j = 0;
  while (i < m && j < n) {
    if (prev[i] === expected[j]) {
      isNew[j] = false; // LCS에 포함 = 이전부터 있던 줄
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      i++;
    } else {
      j++;
    }
  }
  return isNew;
}

// 에디터 prefill(expectedCode와 줄 수가 같음):
//   - added(완전 신규)   → 빈 줄 (학생이 회색 고스트를 보고 입력)
//   - modified(고칠 줄)  → 고치기 전 줄(흰색 편집 텍스트, 그 자리에서 수정)
//   - existing(그대로)   → 그대로 둠
function computeFullProgramPrefill(index) {
  const prevCode = resolvePrevCode(index);
  if (!prevCode) return "";
  const expectedCode = state.data.steps[index].expectedCode;
  const { classified } = classifyExpectedLines(prevCode, expectedCode);
  return classified
    .map((c) => {
      if (c.type === "added") return "";
      if (c.type === "modified") return c.prevLine;
      return c.line;
    })
    .join("\n");
}

// 고스트 HTML(줄 단위): 아직 '비어 있는 추가할 줄'에만 회색 힌트를 보여준다.
// 그 줄을 채우면 그 줄 힌트만 사라지고, 바꿀 줄/기존 줄을 편집해도 다른 줄 힌트는 그대로 남는다.
// existing·modified 줄과 이미 입력된 줄은 흰색 에디터 글씨가 덮도록 투명(ghost-prefix) 처리.
function buildFullProgramGhostHtml(index, editorValue) {
  const prevCode = resolvePrevCode(index);
  const expectedCode = state.data.steps[index].expectedCode;
  const { classified } = classifyExpectedLines(prevCode, expectedCode);
  const editorLines = editorValue.replace(/\r/g, "").replace(/\n$/, "").split("\n");
  return classified
    .map((c, i) => {
      const editorLine = editorLines[i] ?? "";
      if (c.type === "added" && c.line.trim() && !editorLine.trim()) {
        return escapeHtml(c.line);
      }
      return `<span class="ghost-prefix">${escapeHtml(editorLine)}</span>`;
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
    // delete 단계는 이전 코드 전체를 그대로 채워 학생이 줄을 지우게 한다.
    // modify 단계는 prefill+고스트 경로(추가할 줄=빈칸+회색, 바꿀 줄=이전 줄 흰색).
    if (isEditStep(step) && !isModifyStep(step)) {
      const prevCode = resolvePrevCode(index);
      return prevCode ? `${prevCode}\n` : "";
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
  if (!state.data) return;
  const step = getCurrentStep();

  if (isFullProgramMode()) {
    if (state.completed.has(step.id)) {
      els.codeGhost.innerHTML = "";
      return;
    }
    if (isEditStep(step) && !isModifyStep(step)) {
      els.codeGhost.innerHTML = "";
      return;
    }
    // 줄 단위로 '아직 비어 있는 추가할 줄'에만 회색 힌트를 그린다.
    els.codeGhost.innerHTML = buildFullProgramGhostHtml(state.currentIndex, els.codeInput.value);
    syncGhostScroll();
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
  syncGhostScroll();
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

// Normalize code into comparable lines (trim, collapse inner spaces, drop blanks/comments).
function normalizeForSearch(code) {
  return code
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => normalizeLineSpaces(line.trim()))
    .filter((line) => line.length > 0 && !line.startsWith("#"))
    .join("\n");
}

function findCommonError(step, rawCode) {
  if (!step.commonErrors) return null;
  const haystack = normalizeForSearch(rawCode);
  return step.commonErrors.find((error) => {
    const needle = normalizeForSearch(error.pattern);
    return needle && haystack.includes(needle);
  }) || null;
}

// Find the first line where the student's code diverges from the expected code.
function firstDiffLine(userBlock, expectedBlock) {
  const u = userBlock ? userBlock.split("\n") : [];
  const e = expectedBlock ? expectedBlock.split("\n") : [];
  const count = Math.max(u.length, e.length);
  for (let i = 0; i < count; i++) {
    if (u[i] !== e[i]) {
      return { expected: e[i] ?? null, got: u[i] ?? null };
    }
  }
  return null;
}

function buildGenericError(step) {
  const expected = normalizeCodeBlock(getExpectedCodeThrough(state.currentIndex));
  const user = normalizeCodeBlock(els.codeInput.value);
  const diff = firstDiffLine(user, expected);

  let detail;
  if (diff && diff.expected && diff.got) {
    detail = `이 줄을 확인해보세요 —\n  내가 쓴 줄: ${diff.got}\n  정답 모양: ${diff.expected}`;
  } else if (diff && diff.expected) {
    detail = `이 줄이 아직 빠졌어요 —\n  ${diff.expected}`;
  } else if (diff && diff.got) {
    detail = `이 줄은 이번 단계에 필요 없어요 —\n  ${diff.got}`;
  } else {
    detail = "거의 다 왔어요! 들여쓰기나 공백을 다시 확인해보세요.";
  }

  return `코드가 이번 단계 정답과 조금 달라요.\n${detail}\n\n'힌트 보기'를 누르면 이번 단계에 입력할 줄 전체를 볼 수 있어요.`;
}

function awardSuccessBadges() {
  (state.data.gameRules?.successStreakMilestones ?? []).forEach((count) => {
    if (state.currentSuccessStreak >= count) {
      state.badges.add(`${count}회 연속 성공`);
    }
  });
}

function awardTypoBadges() {
  (state.data.gameRules?.typoBadgeMilestones ?? []).forEach((rule) => {
    if (state.typoCount >= rule.count) {
      state.badges.add(rule.badge);
    }
  });
}

const BADGE_CONFIG = {
  "첫 성공":         "badges/badge_first_success.svg",
  "3회 연속 성공":   "badges/badge_streak_3.svg",
  "5회 연속 성공":   "badges/badge_streak_5.svg",
  "7회 연속 성공":   "badges/badge_streak_7.svg",
  "불굴의 의지 I":   "badges/badge_iron_will_1.svg",
  "불굴의 의지 II":  "badges/badge_iron_will_2.svg",
  "불굴의 의지 III": "badges/badge_iron_will_3.svg",
  "첫 창 완성":      "badges/badge_first_window.svg",
  "Lesson 1 완성자": "badges/badge_lesson1_complete.svg",
  "Lesson 2 완성자": "badges/badge_lesson2_complete.svg",
  "Lesson 3 완성자": "badges/badge_lesson3_complete.svg",
  "Lesson 4 완성자": "badges/badge_lesson4_complete.svg",
};

function renderBadges() {
  if (state.badges.size === 0) {
    els.badges.innerHTML = '<span class="no-badge">아직 없어요</span>';
    return;
  }
  els.badges.innerHTML = [...state.badges].map((name) => {
    const src = BADGE_CONFIG[name];
    const imgHtml = src
      ? `<img class="badge-img" src="${src}" alt="${escapeHtml(name)}">`
      : `<div class="badge-circle" style="background:linear-gradient(145deg,#9ca3af,#4b5563)">🏅</div>`;
    return `<div class="badge-token" title="${escapeHtml(name)}">
      ${imgHtml}
      <span class="badge-label">${escapeHtml(name)}</span>
    </div>`;
  }).join("");
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
  const template = state.data.lessonCompletion?.summaryTemplate
    || state.data.lessonCompletion?.summary
    || "";
  const summary = template
    .replace("{elapsedTime}", formatElapsed(Date.now() - state.startTime))
    .replace("{runCount}", state.runCount)
    .replace("{typoCount}", state.typoCount)
    .replace("{bestSuccessStreak}", state.bestSuccessStreak);
  els.completionTitle.textContent = state.data.lessonCompletion?.title || `Lesson ${LESSON_NUM} 완성!`;
  els.completionSummary.textContent = summary;
  els.completionModal.hidden = false;

  // 방금 레슨을 끝냈으니 탭을 새로 그려 다음 레슨 잠금을 해제한다
  state.lessonsCache = null;
  buildLessonTabs();
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
  return text
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
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
  const store = readUserStore(state.userEmail);
  if (store?.lessons) {
    delete store.lessons[LESSON_NUM];
    writeUserStore(state.userEmail, store);
  }
  startLesson(null);
});
els.closeCompletionBtn.addEventListener("click", () => {
  els.completionModal.hidden = true;
});
els.codeInput.addEventListener("input", () => {
  updateCodeGhost();
  updateLineNumbers();
});
els.codeInput.addEventListener("scroll", syncGhostScroll);
els.codeInput.addEventListener("keydown", handleEditorTab);

function handleEditorTab(event) {
  if (event.key !== "Tab") return;
  event.preventDefault();
  const input = els.codeInput;
  const start = input.selectionStart;
  const end = input.selectionEnd;
  input.value = `${input.value.slice(0, start)}    ${input.value.slice(end)}`;
  input.selectionStart = input.selectionEnd = start + 4;
  updateCodeGhost();
  updateLineNumbers();
}

function updateLineNumbers() {
  if (!els.lineNumbers) return;
  const lineCount = els.codeInput.value.split("\n").length;
  let text = "";
  for (let i = 1; i <= lineCount; i++) {
    text += `${i}\n`;
  }
  els.lineNumbers.textContent = text;
  syncGhostScroll();
}

function syncGhostScroll() {
  const { scrollLeft, scrollTop } = els.codeInput;
  els.codeGhost.style.transform = `translate(${-scrollLeft}px, ${-scrollTop}px)`;
  if (els.lineNumbers) els.lineNumbers.style.transform = `translateY(${-scrollTop}px)`;
}

init();
