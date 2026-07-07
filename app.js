const STORAGE_KEY = "schulte-grid-state-v1";

const els = {
  board: document.querySelector("#board"),
  timer: document.querySelector("#timer"),
  nextTarget: document.querySelector("#next-target"),
  mistakes: document.querySelector("#mistakes"),
  ratingTitle: document.querySelector("#rating-title"),
  ratingText: document.querySelector("#rating-text"),
  restartBtn: document.querySelector("#restart-btn"),
  shuffleBtn: document.querySelector("#shuffle-btn"),
  sizeSelect: document.querySelector("#size-select"),
  themeSelect: document.querySelector("#theme-select"),
  checkinBtn: document.querySelector("#checkin-btn"),
  todayStatus: document.querySelector("#today-status"),
  streakCount: document.querySelector("#streak-count"),
  bestTime: document.querySelector("#best-time"),
  historyList: document.querySelector("#history-list"),
  clearDataBtn: document.querySelector("#clear-data-btn"),
  sizeButtons: [...document.querySelectorAll("[data-size]")],
};

const defaultStore = {
  theme: "mint",
  size: 4,
  checkins: [],
  records: [],
};

let store = loadStore();
let state = {
  size: store.size || 4,
  numbers: [],
  next: 1,
  mistakes: 0,
  startAt: 0,
  elapsed: 0,
  running: false,
  finished: false,
  frameId: 0,
  lastResult: null,
};

function loadStore() {
  try {
    return { ...defaultStore, ...JSON.parse(localStorage.getItem(STORAGE_KEY)) };
  } catch {
    return { ...defaultStore };
  }
}

function saveStore() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function todayKey() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatTime(seconds) {
  return `${seconds.toFixed(2)}s`;
}

function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function setTheme(theme) {
  document.body.classList.remove("theme-sky", "theme-peach");
  if (theme !== "mint") {
    document.body.classList.add(`theme-${theme}`);
  }
  els.themeSelect.value = theme;
  store.theme = theme;
  saveStore();
}

function buildBoard(keepRating = false) {
  cancelAnimationFrame(state.frameId);
  const max = state.size * state.size;
  state = {
    ...state,
    numbers: shuffle(Array.from({ length: max }, (_, index) => index + 1)),
    next: 1,
    mistakes: 0,
    startAt: 0,
    elapsed: 0,
    running: false,
    finished: false,
    frameId: 0,
    lastResult: null,
  };

  els.board.style.setProperty("--grid-size", state.size);
  els.board.innerHTML = "";

  state.numbers.forEach((number) => {
    const tile = document.createElement("button");
    tile.className = "tile";
    tile.type = "button";
    tile.dataset.value = String(number);
    tile.setAttribute("role", "gridcell");
    tile.setAttribute("aria-label", `数字 ${number}`);
    tile.textContent = number;
    els.board.append(tile);
  });

  syncSizeControls();
  updateStatus();
  if (!keepRating) {
    setResult("准备开始", "点击数字 1 后自动计时。完成后会根据用时和失误给出评价。");
  }
  els.checkinBtn.disabled = true;
}

function syncSizeControls() {
  els.sizeSelect.value = String(state.size);
  els.sizeButtons.forEach((button) => {
    button.classList.toggle("active", Number(button.dataset.size) === state.size);
  });
}

function updateStatus() {
  els.timer.textContent = formatTime(state.elapsed);
  els.nextTarget.textContent = state.finished ? "完成" : state.next;
  els.mistakes.textContent = state.mistakes;

  document.querySelectorAll(".tile").forEach((tile) => {
    const value = Number(tile.dataset.value);
    tile.classList.toggle("done", value < state.next);
    tile.classList.toggle("next", value === state.next && !state.finished);
    tile.disabled = state.finished || value < state.next;
  });
}

function startTimer() {
  state.running = true;
  state.startAt = performance.now() - state.elapsed * 1000;
  tick();
}

function tick() {
  if (!state.running) return;
  state.elapsed = (performance.now() - state.startAt) / 1000;
  els.timer.textContent = formatTime(state.elapsed);
  state.frameId = requestAnimationFrame(tick);
}

function finishGame() {
  state.running = false;
  state.finished = true;
  cancelAnimationFrame(state.frameId);

  const result = evaluateResult(state.size, state.elapsed, state.mistakes);
  state.lastResult = {
    date: todayKey(),
    size: state.size,
    seconds: state.elapsed,
    mistakes: state.mistakes,
    rating: result.title,
  };

  store.records = [state.lastResult, ...store.records].slice(0, 20);
  saveStore();
  setResult(result.title, result.text);
  els.checkinBtn.disabled = hasCheckedInToday();
  updateStatus();
  renderCheckins();
}

function evaluateResult(size, seconds, mistakes) {
  const excellent = { 3: 7, 4: 17, 5: 35 };
  const good = { 3: 11, 4: 25, 5: 50 };
  const steady = { 3: 16, 4: 36, 5: 70 };
  const penalty = mistakes * 1.5;
  const scoreSeconds = seconds + penalty;
  const mistakeText = mistakes ? `，失误 ${mistakes} 次` : "，无失误";

  if (scoreSeconds <= excellent[size]) {
    return {
      title: "非常敏锐",
      text: `完成用时 ${formatTime(seconds)}${mistakeText}。视觉搜索节奏很干净，可以挑战更大的方格。`,
    };
  }
  if (scoreSeconds <= good[size]) {
    return {
      title: "表现良好",
      text: `完成用时 ${formatTime(seconds)}${mistakeText}。注意力保持得不错，继续练会更稳。`,
    };
  }
  if (scoreSeconds <= steady[size]) {
    return {
      title: "稳定完成",
      text: `完成用时 ${formatTime(seconds)}${mistakeText}。可以先放慢前半段，减少回看和跳扫。`,
    };
  }
  return {
    title: "继续热身",
    text: `完成用时 ${formatTime(seconds)}${mistakeText}。建议从 3 × 3 开始，先练顺序感和视野扩展。`,
  };
}

function setResult(title, text) {
  els.ratingTitle.textContent = title;
  els.ratingText.textContent = text;
}

function handleTileClick(event) {
  const tile = event.target.closest(".tile");
  if (!tile || state.finished) return;

  const value = Number(tile.dataset.value);
  if (!state.running && value === 1) {
    startTimer();
  }

  if (value === state.next) {
    tile.classList.remove("pop");
    void tile.offsetWidth;
    tile.classList.add("pop");
    state.next += 1;
    if (state.next > state.size * state.size) {
      finishGame();
    } else {
      updateStatus();
    }
    return;
  }

  if (state.running) {
    state.mistakes += 1;
    tile.classList.remove("error");
    void tile.offsetWidth;
    tile.classList.add("error");
    updateStatus();
  }
}

function hasCheckedInToday() {
  return store.checkins.some((item) => item.date === todayKey());
}

function checkIn() {
  if (!state.lastResult || hasCheckedInToday()) return;
  store.checkins = [
    {
      date: todayKey(),
      seconds: state.lastResult.seconds,
      size: state.lastResult.size,
      rating: state.lastResult.rating,
    },
    ...store.checkins.filter((item) => item.date !== todayKey()),
  ].slice(0, 120);
  saveStore();
  els.checkinBtn.disabled = true;
  renderCheckins();
}

function getStreak() {
  const checked = new Set(store.checkins.map((item) => item.date));
  let streak = 0;
  const cursor = new Date();
  while (checked.has(toDateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function renderCheckins() {
  const checkedToday = hasCheckedInToday();
  els.todayStatus.textContent = checkedToday ? "今日已完成" : "今日未完成";
  els.streakCount.textContent = `${getStreak()} 天`;

  const best = store.records.reduce((winner, record) => {
    if (!winner || record.seconds < winner.seconds) return record;
    return winner;
  }, null);
  els.bestTime.textContent = best ? `${formatTime(best.seconds)} · ${best.size}×${best.size}` : "--";

  const history = store.records.slice(0, 6);
  els.historyList.innerHTML = "";
  if (!history.length) {
    const empty = document.createElement("li");
    empty.innerHTML = "<span>还没有练习记录</span><strong>--</strong>";
    els.historyList.append(empty);
    return;
  }

  history.forEach((record) => {
    const item = document.createElement("li");
    item.innerHTML = `
      <span>${record.date} · ${record.size}×${record.size}</span>
      <strong>${formatTime(record.seconds)}</strong>
    `;
    els.historyList.append(item);
  });
}

function clearData() {
  const confirmed = window.confirm("确定清空本地练习记录和打卡数据吗？");
  if (!confirmed) return;
  store.checkins = [];
  store.records = [];
  saveStore();
  renderCheckins();
  els.checkinBtn.disabled = !state.lastResult;
}

els.board.addEventListener("click", handleTileClick);
els.restartBtn.addEventListener("click", () => buildBoard());
els.shuffleBtn.addEventListener("click", () => buildBoard(true));
els.checkinBtn.addEventListener("click", checkIn);
els.clearDataBtn.addEventListener("click", clearData);

els.sizeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    state.size = Number(button.dataset.size);
    store.size = state.size;
    saveStore();
    buildBoard();
  });
});

els.sizeSelect.addEventListener("change", (event) => {
  state.size = Number(event.target.value);
  store.size = state.size;
  saveStore();
  buildBoard();
});

els.themeSelect.addEventListener("change", (event) => {
  setTheme(event.target.value);
});

setTheme(store.theme || "mint");
buildBoard();
renderCheckins();
