const STORAGE_KEYS = {
  theme: "velhoksi.theme",
  alphabet: "velhoksi.alphabet",
  direction: "velhoksi.direction",
  enabledMap: "velhoksi.enabledMap",
  stats: "velhoksi.stats",
  feedbackDuration: "velhoksi.feedbackDuration",
  feedbackMode: "velhoksi.feedbackMode",
};

const ALPHABETS = [
  {
    id: "hiragana",
    label: "hiragana",
    symbols: [
      ["あ", "a"], ["い", "i"], ["う", "u"], ["え", "e"], ["お", "o"],
      ["か", "ka"], ["き", "ki"], ["く", "ku"], ["け", "ke"], ["こ", "ko"],
      ["さ", "sa"], ["し", "shi"], ["す", "su"], ["せ", "se"], ["そ", "so"],
      ["た", "ta"], ["ち", "chi"], ["つ", "tsu"], ["て", "te"], ["と", "to"],
      ["な", "na"], ["に", "ni"], ["ぬ", "nu"], ["ね", "ne"], ["の", "no"],
      ["は", "ha"], ["ひ", "hi"], ["ふ", "fu"], ["へ", "he"], ["ほ", "ho"],
      ["ま", "ma"], ["み", "mi"], ["む", "mu"], ["め", "me"], ["も", "mo"],
      ["や", "ya"], ["ゆ", "yu"], ["よ", "yo"],
      ["ら", "ra"], ["り", "ri"], ["る", "ru"], ["れ", "re"], ["ろ", "ro"],
      ["わ", "wa"], ["を", "wo"], ["ん", "n"],
    ],
  },
  {
    id: "katakana",
    label: "katakana",
    symbols: [
      ["ア", "a"], ["イ", "i"], ["ウ", "u"], ["エ", "e"], ["オ", "o"],
      ["カ", "ka"], ["キ", "ki"], ["ク", "ku"], ["ケ", "ke"], ["コ", "ko"],
      ["サ", "sa"], ["シ", "shi"], ["ス", "su"], ["セ", "se"], ["ソ", "so"],
      ["タ", "ta"], ["チ", "chi"], ["ツ", "tsu"], ["テ", "te"], ["ト", "to"],
      ["ナ", "na"], ["ニ", "ni"], ["ヌ", "nu"], ["ネ", "ne"], ["ノ", "no"],
      ["ハ", "ha"], ["ヒ", "hi"], ["フ", "fu"], ["ヘ", "he"], ["ホ", "ho"],
      ["マ", "ma"], ["ミ", "mi"], ["ム", "mu"], ["メ", "me"], ["モ", "mo"],
      ["ヤ", "ya"], ["ユ", "yu"], ["ヨ", "yo"],
      ["ラ", "ra"], ["リ", "ri"], ["ル", "ru"], ["レ", "re"], ["ロ", "ro"],
      ["ワ", "wa"], ["ヲ", "wo"], ["ン", "n"],
    ],
  },
  {
    id: "greek",
    label: "greek",
    symbols: [
      ["α", "a"], ["β", "b"], ["γ", "g"], ["δ", "d"], ["ε", "e"],
      ["ζ", "z"], ["η", "ee"], ["θ", "th"], ["ι", "i"], ["κ", "k"],
      ["λ", "l"], ["μ", "m"], ["ν", "n"], ["ξ", "x"], ["ο", "o"],
      ["π", "p"], ["ρ", "r"], ["σ", "s"], ["τ", "t"], ["υ", "u"],
      ["φ", "f"], ["χ", "kh"], ["ψ", "ps"], ["ω", "oo"],
    ],
  },
  {
    id: "cyrillic",
    label: "cyrillic",
    symbols: [
      ["а", "a"], ["б", "b"], ["в", "v"], ["г", "g"], ["д", "d"],
      ["е", "e"], ["ё", "yo"], ["ж", "zh"], ["з", "z"], ["и", "i"],
      ["й", "j"], ["к", "k"], ["л", "l"], ["м", "m"], ["н", "n"],
      ["о", "o"], ["п", "p"], ["р", "r"], ["с", "s"], ["т", "t"],
      ["у", "u"], ["ф", "f"], ["х", "kh"], ["ц", "ts"], ["ч", "ch"],
      ["ш", "sh"], ["щ", "shch"], ["ъ", "hard"], ["ы", "y"], ["ь", "soft"],
      ["э", "eh"], ["ю", "yu"], ["я", "ya"],
    ],
  },
  {
    id: "georgian",
    label: "georgian",
    symbols: [
      ["ა", "a"], ["ბ", "b"], ["გ", "g"], ["დ", "d"], ["ე", "e"],
      ["ვ", "v"], ["ზ", "z"], ["თ", "th"], ["ი", "i"], ["კ", "k'"],
      ["ლ", "l"], ["მ", "m"], ["ნ", "n"], ["ო", "o"], ["პ", "p'"],
      ["ჟ", "zh"], ["რ", "r"], ["ს", "s"], ["ტ", "t"], ["უ", "u"],
      ["ფ", "p"], ["ქ", "k"], ["ღ", "gh"], ["ყ", "q'"], ["შ", "sh"],
      ["ჩ", "ch"], ["ც", "ts"], ["ძ", "dz"], ["წ", "ts'"], ["ჭ", "ch'"],
      ["ხ", "kh"], ["ჯ", "j"], ["ჰ", "h"],
    ],
  },
].map((alphabet) => ({
  ...alphabet,
  symbols: alphabet.symbols.map(([foreign, latin], index) => ({
    id: `${alphabet.id}-${index}`,
    foreign,
    latin,
    enabledByDefault: true,
  })),
}));

const alphabetById = Object.fromEntries(ALPHABETS.map((alphabet) => [alphabet.id, alphabet]));

const state = {
  theme: loadTheme(),
  selectedAlphabet: localStorage.getItem(STORAGE_KEYS.alphabet) || null,
  direction: localStorage.getItem(STORAGE_KEYS.direction) || "foreignToLatin",
  enabledMap: loadEnabledMap(),
  stats: loadStats(),
  feedbackDuration: loadFeedbackDuration(),
  feedbackMode: loadFeedbackMode(),
  currentPromptId: null,
  lastPromptId: null,
  settingsOpen: false,
  feedbackTimeoutId: null,
  awaitingManualContinue: false,
};

const refs = {
  body: document.body,
  pickerView: document.querySelector("#picker-view"),
  gameView: document.querySelector("#game-view"),
  switchAlphabet: document.querySelector("#switch-alphabet"),
  themeToggle: document.querySelector("#theme-toggle"),
  alphabetTitle: document.querySelector("#alphabet-title"),
  alphabetPicker: document.querySelector("#alphabet-picker"),
  directionToggle: document.querySelector("#direction-toggle"),
  settingsToggle: document.querySelector("#settings-toggle"),
  settingsPanel: document.querySelector("#settings-panel"),
  settingsList: document.querySelector("#settings-list"),
  feedbackDuration: document.querySelector("#feedback-duration"),
  feedbackMode: document.querySelector("#feedback-mode"),
  cheatToggle: document.querySelector("#cheat-toggle"),
  cheatDialog: document.querySelector("#cheat-dialog"),
  closeCheat: document.querySelector("#close-cheat"),
  cheatTitle: document.querySelector("#cheat-title"),
  cheatGrid: document.querySelector("#cheat-grid"),
  promptCard: document.querySelector("#prompt-card"),
  promptValue: document.querySelector("#prompt-value"),
  promptHint: document.querySelector("#prompt-hint"),
  latinForm: document.querySelector("#latin-form"),
  latinInput: document.querySelector("#latin-input"),
  symbolAnswer: document.querySelector("#symbol-answer"),
  symbolGrid: document.querySelector("#symbol-grid"),
  feedback: document.querySelector("#feedback"),
  continueButton: document.querySelector("#continue-button"),
  statRight: document.querySelector("#stat-right"),
  statWrong: document.querySelector("#stat-wrong"),
  statPercent: document.querySelector("#stat-percent"),
  resetStats: document.querySelector("#reset-stats"),
};

init();

function init() {
  applyTheme(state.theme);
  ensureEnabledMapShape();
  bindEvents();
  render();
}

function bindEvents() {
  refs.themeToggle.addEventListener("click", () => {
    state.theme = state.theme === "dark" ? "light" : "dark";
    saveTheme();
    applyTheme(state.theme);
  });

  refs.switchAlphabet.addEventListener("click", () => {
    clearPendingWrongState();
    state.selectedAlphabet = null;
    state.currentPromptId = null;
    state.lastPromptId = null;
    state.settingsOpen = false;
    localStorage.removeItem(STORAGE_KEYS.alphabet);
    setFeedback("");
    render();
  });

  refs.directionToggle.addEventListener("click", () => {
    if (!getSelectedAlphabet()) {
      return;
    }
    state.direction =
      state.direction === "foreignToLatin" ? "latinToForeign" : "foreignToLatin";
    localStorage.setItem(STORAGE_KEYS.direction, state.direction);
    state.currentPromptId = null;
    setFeedback("");
    nextPrompt();
    render();
  });

  refs.settingsToggle.addEventListener("click", () => {
    if (!getSelectedAlphabet()) {
      return;
    }
    state.settingsOpen = !state.settingsOpen;
    render();
  });

  refs.cheatToggle.addEventListener("click", () => {
    if (!getSelectedAlphabet()) {
      return;
    }
    renderCheatSheet();
    if (typeof refs.cheatDialog.showModal === "function") {
      refs.cheatDialog.showModal();
    } else {
      refs.cheatDialog.setAttribute("open", "open");
    }
  });

  refs.closeCheat.addEventListener("click", () => refs.cheatDialog.close());

  refs.cheatDialog.addEventListener("click", (event) => {
    const card = refs.cheatDialog.querySelector(".dialog-card");
    if (!card.contains(event.target)) {
      refs.cheatDialog.close();
    }
  });

  refs.latinForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (state.awaitingManualContinue) {
      continueAfterReveal();
      return;
    }
    submitLatinAnswer(true);
  });

  refs.latinInput.addEventListener("input", () => {
    submitLatinAnswer(false);
  });

  refs.resetStats.addEventListener("click", () => {
    resetStatsState();
    renderStats();
    setFeedback("stats reset.", "success");
  });

  refs.feedbackDuration.addEventListener("change", () => {
    state.feedbackDuration = Number(refs.feedbackDuration.value);
    saveFeedbackDuration();
  });

  refs.feedbackMode.addEventListener("change", () => {
    state.feedbackMode = refs.feedbackMode.value === "manual" ? "manual" : "timed";
    saveFeedbackMode();
  });

  refs.continueButton.addEventListener("click", () => {
    continueAfterReveal();
  });
}

function render() {
  const alphabet = getSelectedAlphabet();
  refs.pickerView.classList.toggle("hidden", Boolean(alphabet));
  refs.gameView.classList.toggle("hidden", !alphabet);
  refs.switchAlphabet.classList.toggle("hidden", !alphabet);
  refs.alphabetTitle.textContent = alphabet ? `${alphabet.label},` : `nothing,`;
  refs.settingsPanel.classList.toggle("hidden", !alphabet || !state.settingsOpen);
  refs.settingsToggle.setAttribute("aria-expanded", String(Boolean(alphabet && state.settingsOpen)));
  refs.cheatToggle.disabled = !alphabet;
  refs.settingsToggle.disabled = !alphabet;
  refs.directionToggle.disabled = !alphabet;
  refs.feedbackDuration.value = String(state.feedbackDuration);
  refs.feedbackMode.value = state.feedbackMode;
  refs.continueButton.classList.toggle("hidden", !state.awaitingManualContinue);
  renderAlphabetPicker();
  renderStats();
  renderSettings();
  renderCheatSheet();

  if (alphabet && !getCurrentPrompt()) {
    nextPrompt();
  }

  renderPrompt();
  renderAnswerArea();
}

function renderAlphabetPicker() {
  refs.alphabetPicker.innerHTML = "";

  for (const alphabet of ALPHABETS) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "alphabet-button";
    button.textContent = alphabet.label;
    if (alphabet.id === state.selectedAlphabet) {
      button.classList.add("active");
    }
    button.addEventListener("click", () => {
      clearPendingWrongState();
      state.selectedAlphabet = alphabet.id;
      localStorage.setItem(STORAGE_KEYS.alphabet, state.selectedAlphabet);
      state.currentPromptId = null;
      state.lastPromptId = null;
      state.settingsOpen = false;
      resetStatsState();
      setFeedback("");
      render();
    });
    refs.alphabetPicker.appendChild(button);
  }
}

function renderPrompt() {
  const prompt = getCurrentPrompt();
  const alphabet = getSelectedAlphabet();
  const sourceLabel = alphabet ? alphabet.label : "foreign";
  refs.directionToggle.textContent =
    state.direction === "foreignToLatin" ? `${sourceLabel} -> latin` : `latin -> ${sourceLabel}`;

  if (!prompt) {
    refs.promptValue.textContent = "-";
    refs.promptHint.textContent = getSelectedAlphabet() ? "no symbols enabled" : "choose an alphabet";
    refs.promptCard.dataset.promptId = "";
    return;
  }

  if (refs.promptCard.dataset.promptId !== prompt.id) {
    refs.promptCard.classList.remove("flash");
    void refs.promptCard.offsetWidth;
    refs.promptCard.classList.add("flash");
    refs.promptCard.dataset.promptId = prompt.id;
  }

  refs.promptValue.textContent =
    state.direction === "foreignToLatin" ? prompt.foreign : prompt.latin;
  refs.promptHint.textContent =
    state.direction === "foreignToLatin"
      ? "type the latin reading below"
      : "pick the matching symbol";
}

function renderAnswerArea() {
  const prompt = getCurrentPrompt();
  const useLatinInput = state.direction === "foreignToLatin";

  refs.latinForm.classList.toggle("hidden", !useLatinInput || !prompt);
  refs.symbolAnswer.classList.toggle("hidden", useLatinInput || !prompt);

  if (!prompt) {
    refs.symbolGrid.innerHTML = "";
    refs.latinInput.value = "";
    refs.latinInput.disabled = true;
    refs.continueButton.classList.add("hidden");
    return;
  }

  refs.latinInput.disabled = !useLatinInput || state.awaitingManualContinue;

  if (useLatinInput) {
    if (!state.awaitingManualContinue) {
      refs.latinInput.value = "";
      focusLatinInput();
    }
    return;
  }

  renderSymbolGrid();
}

function renderSymbolGrid() {
  refs.symbolGrid.innerHTML = "";

  for (const symbol of getEnabledSymbols()) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "symbol-key";
    button.textContent = symbol.foreign;
    button.setAttribute("aria-label", `${symbol.foreign} for ${symbol.latin}`);
    button.addEventListener("click", () => {
      const prompt = getCurrentPrompt();
      if (!prompt) {
        return;
      }
      submitResult(symbol.id === prompt.id, prompt.foreign);
    });
    refs.symbolGrid.appendChild(button);
  }
}

function renderSettings() {
  const alphabet = getSelectedAlphabet();
  refs.settingsList.innerHTML = "";

  if (!alphabet) {
    return;
  }

  const enabledSet = new Set(state.enabledMap[alphabet.id]);
  const enabledCount = enabledSet.size;

  for (const symbol of alphabet.symbols) {
    const item = document.createElement("label");
    item.className = "setting-item";

    const symbolWrap = document.createElement("span");
    symbolWrap.className = "setting-symbol";
    symbolWrap.innerHTML = `<strong>${symbol.foreign}</strong><span>${symbol.latin}</span>`;

    const toggle = document.createElement("input");
    toggle.type = "checkbox";
    toggle.className = "toggle";
    toggle.checked = enabledSet.has(symbol.id);
    toggle.disabled = toggle.checked && enabledCount === 1;
    toggle.addEventListener("change", () => {
      updateEnabledSymbol(symbol.id, toggle.checked);
    });

    item.append(symbolWrap, toggle);
    refs.settingsList.appendChild(item);
  }
}

function renderCheatSheet() {
  const alphabet = getSelectedAlphabet();
  refs.cheatGrid.innerHTML = "";

  if (!alphabet) {
    refs.cheatTitle.textContent = "cheat sheet";
    return;
  }

  refs.cheatTitle.textContent = `${alphabet.label} cheat sheet`;
  const enabledSet = new Set(state.enabledMap[alphabet.id]);

  for (const symbol of alphabet.symbols) {
    const item = document.createElement("article");
    item.className = "cheat-item";
    if (!enabledSet.has(symbol.id)) {
      item.classList.add("disabled");
    }
    item.innerHTML = `<strong>${symbol.foreign}</strong><span>${symbol.latin}</span>`;
    refs.cheatGrid.appendChild(item);
  }
}

function renderStats() {
  const { right, wrong } = state.stats;
  const total = right + wrong;
  const percent = total === 0 ? 0 : Math.round((right / total) * 100);

  refs.statRight.textContent = String(right);
  refs.statWrong.textContent = String(wrong);
  refs.statPercent.textContent = `${percent}%`;
}

function nextPrompt() {
  const symbols = getEnabledSymbols();
  if (symbols.length === 0) {
    state.currentPromptId = null;
    return;
  }

  const pool =
    symbols.length > 1
      ? symbols.filter((symbol) => symbol.id !== state.lastPromptId)
      : symbols;

  const next = pool[Math.floor(Math.random() * pool.length)];
  state.lastPromptId = next.id;
  state.currentPromptId = next.id;
}

function getCurrentPrompt() {
  return getEnabledSymbols().find((symbol) => symbol.id === state.currentPromptId) || null;
}

function getSelectedAlphabet() {
  return alphabetById[state.selectedAlphabet] || null;
}

function getEnabledSymbols() {
  const alphabet = getSelectedAlphabet();
  if (!alphabet) {
    return [];
  }

  const enabledSet = new Set(state.enabledMap[alphabet.id]);
  return alphabet.symbols.filter((symbol) => enabledSet.has(symbol.id));
}

function updateEnabledSymbol(symbolId, enabled) {
  const alphabet = getSelectedAlphabet();
  if (!alphabet) {
    return;
  }

  const nextSet = new Set(state.enabledMap[alphabet.id]);
  if (enabled) {
    nextSet.add(symbolId);
  } else if (nextSet.size > 1) {
    nextSet.delete(symbolId);
  }

  state.enabledMap[alphabet.id] = [...nextSet];
  saveEnabledMap();

  if (!nextSet.has(state.currentPromptId)) {
    state.currentPromptId = null;
    nextPrompt();
  }

  render();
}

function submitResult(correct, expectedAnswer) {
  clearFeedbackTimer();
  state.awaitingManualContinue = false;

  if (correct) {
    state.stats.right += 1;
    setFeedback("right", "success");
    saveStats();
    renderStats();
    state.currentPromptId = null;
    scheduleNextPrompt(220);
  } else {
    state.stats.wrong += 1;
    setFeedback(`correct answer: ${expectedAnswer}`, "error");
    saveStats();
    renderStats();
    state.currentPromptId = null;
    if (state.feedbackMode === "manual") {
      state.awaitingManualContinue = true;
      renderAnswerArea();
      refs.continueButton.classList.remove("hidden");
      if (state.direction === "foreignToLatin") {
        focusLatinInput();
      } else {
        refs.continueButton.focus();
      }
    } else {
      scheduleNextPrompt(state.feedbackDuration);
    }
  }
}

function submitLatinAnswer(forceSubmit) {
  const prompt = getCurrentPrompt();
  if (!prompt || state.direction !== "foreignToLatin") {
    return;
  }

  const answer = refs.latinInput.value.trim().toLowerCase();
  if (!answer && !forceSubmit) {
    return;
  }

  if (answer === prompt.latin) {
    submitResult(true, prompt.latin);
    return;
  }

  if (forceSubmit) {
    submitResult(false, prompt.latin);
  }
}

function focusLatinInput() {
  window.requestAnimationFrame(() => {
    refs.latinInput.focus();
    refs.latinInput.select();
  });
}

function scheduleNextPrompt(delay) {
  state.feedbackTimeoutId = window.setTimeout(() => {
    continueAfterReveal();
    state.feedbackTimeoutId = null;
  }, delay);
}

function clearFeedbackTimer() {
  if (state.feedbackTimeoutId !== null) {
    window.clearTimeout(state.feedbackTimeoutId);
    state.feedbackTimeoutId = null;
  }
}

function setFeedback(message, tone) {
  refs.feedback.textContent = message;
  refs.feedback.className = "feedback";
  if (tone) {
    refs.feedback.classList.add(tone);
  }
}

function continueAfterReveal() {
  if (!state.awaitingManualContinue && state.feedbackTimeoutId === null && refs.feedback.textContent === "") {
    return;
  }
  clearPendingWrongState();
  nextPrompt();
  setFeedback("");
  renderPrompt();
  renderAnswerArea();
}

function clearPendingWrongState() {
  clearFeedbackTimer();
  state.awaitingManualContinue = false;
  refs.continueButton.classList.add("hidden");
}

function ensureEnabledMapShape() {
  for (const alphabet of ALPHABETS) {
    if (!Array.isArray(state.enabledMap[alphabet.id]) || state.enabledMap[alphabet.id].length === 0) {
      state.enabledMap[alphabet.id] = alphabet.symbols
        .filter((symbol) => symbol.enabledByDefault)
        .map((symbol) => symbol.id);
    } else {
      const validIds = new Set(alphabet.symbols.map((symbol) => symbol.id));
      state.enabledMap[alphabet.id] = state.enabledMap[alphabet.id].filter((id) => validIds.has(id));
      if (state.enabledMap[alphabet.id].length === 0) {
        state.enabledMap[alphabet.id] = alphabet.symbols.map((symbol) => symbol.id);
      }
    }
  }

  saveEnabledMap();
}

function applyTheme(theme) {
  refs.body.dataset.theme = theme;
  refs.themeToggle.textContent =
    theme === "dark"
      ? "current mode is dark, but you can switch"
      : "current mode is light, but you can switch";
}

function loadTheme() {
  const storedTheme = localStorage.getItem(STORAGE_KEYS.theme);
  if (storedTheme === "light" || storedTheme === "dark") {
    return storedTheme;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function saveTheme() {
  localStorage.setItem(STORAGE_KEYS.theme, state.theme);
}

function loadEnabledMap() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.enabledMap) || "{}");
  } catch {
    return {};
  }
}

function saveEnabledMap() {
  localStorage.setItem(STORAGE_KEYS.enabledMap, JSON.stringify(state.enabledMap));
}

function loadStats() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEYS.stats) || "{}");
    return {
      right: Number.isFinite(parsed.right) ? parsed.right : 0,
      wrong: Number.isFinite(parsed.wrong) ? parsed.wrong : 0,
    };
  } catch {
    return { right: 0, wrong: 0 };
  }
}

function saveStats() {
  localStorage.setItem(STORAGE_KEYS.stats, JSON.stringify(state.stats));
}

function resetStatsState() {
  state.stats = { right: 0, wrong: 0 };
  saveStats();
}

function loadFeedbackDuration() {
  const raw = Number(localStorage.getItem(STORAGE_KEYS.feedbackDuration));
  return [1500, 2500, 3500, 5000].includes(raw) ? raw : 3500;
}

function saveFeedbackDuration() {
  localStorage.setItem(STORAGE_KEYS.feedbackDuration, String(state.feedbackDuration));
}

function loadFeedbackMode() {
  return localStorage.getItem(STORAGE_KEYS.feedbackMode) === "manual" ? "manual" : "timed";
}

function saveFeedbackMode() {
  localStorage.setItem(STORAGE_KEYS.feedbackMode, state.feedbackMode);
}
