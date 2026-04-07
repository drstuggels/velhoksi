const STORAGE_KEYS = {
  theme: "velhoksi.theme",
  alphabet: "velhoksi.alphabet",
  direction: "velhoksi.direction",
  enabledMap: "velhoksi.enabledMap",
  caseModeMap: "velhoksi.caseModeMap",
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
    id: "armenian",
    label: "armenian",
    hasCase: true,
    symbols: [
      ["ա", "a"], ["բ", "b"], ["գ", "g"], ["դ", "d"], ["ե", "e"],
      ["զ", "z"], ["է", "ee"], ["ը", "uh"], ["թ", "t'"], ["ժ", "zh"],
      ["ի", "i"], ["լ", "l"], ["խ", "kh"], ["ծ", "ts"], ["կ", "k"],
      ["հ", "h"], ["ձ", "dz"], ["ղ", "gh"], ["ճ", "ch"], ["մ", "m"],
      ["յ", "y"], ["ն", "n"], ["շ", "sh"], ["ո", "vo"], ["չ", "ch'"],
      ["պ", "p"], ["ջ", "j"], ["ռ", "rr"], ["ս", "s"], ["վ", "v"],
      ["տ", "t"], ["ր", "r"], ["ց", "ts'"], ["ւ", "w"], ["փ", "p'"],
      ["ք", "k'"], ["օ", "o"], ["ֆ", "f"],
    ],
  },
  {
    id: "hangul",
    label: "hangul",
    symbols: [
      ["ㄱ", "g"], ["ㄴ", "n"], ["ㄷ", "d"], ["ㄹ", "r"], ["ㅁ", "m"],
      ["ㅂ", "b"], ["ㅅ", "s"], ["ㅇ", "ng"], ["ㅈ", "j"], ["ㅊ", "ch"],
      ["ㅋ", "k"], ["ㅌ", "t"], ["ㅍ", "p"], ["ㅎ", "h"], ["ㅏ", "a"],
      ["ㅑ", "ya"], ["ㅓ", "eo"], ["ㅕ", "yeo"], ["ㅗ", "o"], ["ㅛ", "yo"],
      ["ㅜ", "u"], ["ㅠ", "yu"], ["ㅡ", "eu"], ["ㅣ", "i"],
    ],
  },
  {
    id: "arabic",
    label: "arabic",
    symbols: [
      ["ا", "a"], ["ب", "b"], ["ت", "t"], ["ث", "th"], ["ج", "j"],
      ["ح", "hh"], ["خ", "kh"], ["د", "d"], ["ذ", "dh"], ["ر", "r"],
      ["ز", "z"], ["س", "s"], ["ش", "sh"], ["ص", "ss"], ["ض", "dd"],
      ["ط", "tt"], ["ظ", "zz"], ["ع", "ayn"], ["غ", "gh"], ["ف", "f"],
      ["ق", "q"], ["ك", "k"], ["ل", "l"], ["م", "m"], ["ن", "n"],
      ["ه", "h"], ["و", "w"], ["ي", "y"],
    ],
  },
  {
    id: "hebrew",
    label: "hebrew",
    symbols: [
      ["א", "alef"], ["ב", "b"], ["ג", "g"], ["ד", "d"], ["ה", "h"],
      ["ו", "v"], ["ז", "z"], ["ח", "kh"], ["ט", "t'"], ["י", "y"],
      ["כ", "k"], ["ל", "l"], ["מ", "m"], ["נ", "n"], ["ס", "s"],
      ["ע", "ayn"], ["פ", "p"], ["צ", "ts"], ["ק", "q"], ["ר", "r"],
      ["ש", "sh"], ["ת", "t"],
    ],
  },
  {
    id: "syriac",
    label: "syriac",
    symbols: [
      ["ܐ", "a"], ["ܒ", "b"], ["ܓ", "g"], ["ܕ", "d"], ["ܗ", "h"],
      ["ܘ", "w"], ["ܙ", "z"], ["ܚ", "hh"], ["ܛ", "tt"], ["ܝ", "y"],
      ["ܟ", "k"], ["ܠ", "l"], ["ܡ", "m"], ["ܢ", "n"], ["ܣ", "s"],
      ["ܥ", "ayn"], ["ܦ", "p"], ["ܨ", "ss"], ["ܩ", "q"], ["ܪ", "r"],
      ["ܫ", "sh"], ["ܬ", "t"],
    ],
  },
  {
    id: "cherokee",
    label: "cherokee",
    symbols: [
      ["Ꭰ", "a"], ["Ꭱ", "e"], ["Ꭲ", "i"], ["Ꭳ", "o"], ["Ꭴ", "u"], ["Ꭵ", "v"],
      ["Ꭶ", "ga"], ["Ꭷ", "ka"], ["Ꭸ", "ge"], ["Ꭹ", "gi"], ["Ꭺ", "go"], ["Ꭻ", "gu"], ["Ꭼ", "gv"],
      ["Ꭽ", "ha"], ["Ꭾ", "he"], ["Ꭿ", "hi"], ["Ꮀ", "ho"], ["Ꮁ", "hu"], ["Ꮂ", "hv"],
      ["Ꮃ", "la"], ["Ꮄ", "le"], ["Ꮅ", "li"], ["Ꮆ", "lo"], ["Ꮇ", "lu"], ["Ꮈ", "lv"],
      ["Ꮉ", "ma"], ["Ꮊ", "me"], ["Ꮋ", "mi"], ["Ꮌ", "mo"], ["Ꮍ", "mu"],
      ["Ꮎ", "na"], ["Ꮏ", "hna"], ["Ꮐ", "nah"], ["Ꮑ", "ne"], ["Ꮒ", "ni"], ["Ꮓ", "no"], ["Ꮔ", "nu"], ["Ꮕ", "nv"],
      ["Ꮖ", "qua"], ["Ꮗ", "que"], ["Ꮘ", "qui"], ["Ꮙ", "quo"], ["Ꮚ", "quu"], ["Ꮛ", "quv"],
      ["Ꮜ", "sa"], ["Ꮝ", "s"], ["Ꮞ", "se"], ["Ꮟ", "si"], ["Ꮠ", "so"], ["Ꮡ", "su"], ["Ꮢ", "sv"],
      ["Ꮣ", "da"], ["Ꮤ", "ta"], ["Ꮥ", "de"], ["Ꮦ", "te"], ["Ꮧ", "di"], ["Ꮨ", "ti"], ["Ꮩ", "do"], ["Ꮪ", "du"], ["Ꮫ", "dv"],
      ["Ꮬ", "dla"], ["Ꮭ", "tla"], ["Ꮮ", "tle"], ["Ꮯ", "tli"], ["Ꮰ", "tlo"], ["Ꮱ", "tlu"], ["Ꮲ", "tlv"],
      ["Ꮳ", "tsa"], ["Ꮴ", "tse"], ["Ꮵ", "tsi"], ["Ꮶ", "tso"], ["Ꮷ", "tsu"], ["Ꮸ", "tsv"],
      ["Ꮹ", "wa"], ["Ꮺ", "we"], ["Ꮻ", "wi"], ["Ꮼ", "wo"], ["Ꮽ", "wu"], ["Ꮾ", "wv"],
      ["Ꮿ", "ya"], ["Ᏸ", "ye"], ["Ᏹ", "yi"], ["Ᏺ", "yo"], ["Ᏻ", "yu"], ["Ᏼ", "yv"],
    ],
  },
  {
    id: "greek",
    label: "greek",
    hasCase: true,
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
    hasCase: true,
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
  caseModeMap: loadCaseModeMap(),
  stats: loadStats(),
  feedbackDuration: loadFeedbackDuration(),
  feedbackMode: loadFeedbackMode(),
  currentPromptId: null,
  lastPromptId: null,
  settingsOpen: false,
  feedbackTimeoutId: null,
  successFeedbackTimeoutId: null,
  awaitingManualContinue: false,
  selectedWrongSymbolId: null,
  revealedCorrectSymbolId: null,
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
  caseSettings: document.querySelector("#case-settings"),
  caseOptions: [...document.querySelectorAll(".case-option")],
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
    if (state.settingsOpen) {
      window.requestAnimationFrame(() => {
        refs.settingsPanel.scrollTop = 0;
        refs.settingsPanel.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
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
    if (state.awaitingManualContinue || state.feedbackTimeoutId !== null) {
      return;
    }
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

  for (const button of refs.caseOptions) {
    button.addEventListener("click", () => {
      const alphabet = getSelectedAlphabet();
      const nextMode = button.dataset.caseMode;
      if (!alphabet || !alphabet.hasCase || !isValidCaseMode(nextMode)) {
        return;
      }
      state.caseModeMap[alphabet.id] = nextMode;
      saveCaseModeMap();
      clearPendingWrongState();
      state.currentPromptId = null;
      setFeedback("");
      nextPrompt();
      render();
    });
  }

  refs.continueButton.addEventListener("click", () => {
    continueAfterReveal();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" || refs.cheatDialog.open) {
      return;
    }

    if (state.awaitingManualContinue) {
      event.preventDefault();
      continueAfterReveal();
      return;
    }

    if (state.direction === "latinToForeign" && state.feedbackTimeoutId === null) {
      const prompt = getCurrentPrompt();
      if (!prompt) {
        return;
      }
      event.preventDefault();
      submitResult(false, prompt.foreign);
    }
  });
}

function render() {
  const alphabet = getSelectedAlphabet();
  const caseMode = alphabet ? getCaseModeForAlphabet(alphabet) : "lower";
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
  refs.caseSettings.classList.toggle("hidden", !alphabet || !alphabet.hasCase);
  for (const button of refs.caseOptions) {
    const active = button.dataset.caseMode === caseMode;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  }
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
    const label = document.createElement("span");
    label.className = "alphabet-button-label";
    label.textContent = alphabet.label;

    const preview = document.createElement("span");
    preview.className = "alphabet-button-preview";

    const track = document.createElement("span");
    track.className = "alphabet-button-preview-track";
    const previewText = alphabet.symbols.map((symbol) => symbol.foreign).join("   ");
    track.textContent = `${previewText}   ${previewText}`;

    preview.append(track);
    button.append(label, preview);
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
  refs.promptHint.textContent = getPromptHint(prompt, alphabet);
}

function renderAnswerArea() {
  const prompt = getCurrentPrompt();
  const useLatinInput = state.direction === "foreignToLatin";
  const showManualContinue = useLatinInput && state.awaitingManualContinue;

  const mainPanel = refs.gameView.querySelector(".floating-main");
  mainPanel?.classList.toggle("latin-mode", useLatinInput);
  mainPanel?.classList.toggle("symbol-mode", !useLatinInput);

  refs.latinForm.classList.toggle("hidden", !useLatinInput || (!prompt && !showManualContinue));
  refs.symbolAnswer.classList.toggle("hidden", useLatinInput || !prompt);

  if (!prompt && !showManualContinue) {
    refs.symbolGrid.innerHTML = "";
    refs.latinInput.value = "";
    refs.latinInput.disabled = true;
    refs.continueButton.classList.add("hidden");
    return;
  }

  refs.latinInput.disabled = !useLatinInput;

  if (useLatinInput) {
    if (!state.awaitingManualContinue) {
      refs.latinInput.value = "";
    }
    focusLatinInput();
    return;
  }

  renderSymbolGrid();
}

function renderSymbolGrid() {
  refs.symbolGrid.innerHTML = "";

  for (const symbol of getAnswerSymbols()) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "symbol-key";
    if (state.selectedWrongSymbolId === symbol.id) {
      button.classList.add("selected-wrong");
    }
    if (state.revealedCorrectSymbolId === symbol.id) {
      button.classList.add("selected-correct");
    }
    button.textContent = symbol.foreign;
    button.setAttribute("aria-label", `${symbol.foreign} for ${symbol.latin}${symbol.caseLabel ? `, ${symbol.caseLabel}` : ""}`);
    button.addEventListener("click", () => {
      if (state.awaitingManualContinue || state.feedbackTimeoutId !== null) {
        return;
      }
      const prompt = getCurrentPrompt();
      if (!prompt) {
        return;
      }
      state.selectedWrongSymbolId = symbol.id === prompt.id ? null : symbol.id;
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
  const caseMode = getCaseModeForAlphabet(alphabet);

  for (const symbol of alphabet.symbols) {
    const item = document.createElement("article");
    item.className = "cheat-item";
    if (!enabledSet.has(symbol.id)) {
      item.classList.add("disabled");
    }
    item.innerHTML = getCheatSheetMarkup(symbol, alphabet, caseMode);
    refs.cheatGrid.appendChild(item);
  }
}

function getCheatSheetMarkup(symbol, alphabet, caseMode) {
  if (!alphabet.hasCase || caseMode === "lower") {
    return `<strong>${symbol.foreign}</strong><span>${symbol.latin}</span>`;
  }

  if (caseMode === "upper") {
    return `<strong>${toUpperVariant(symbol.foreign)}</strong><span>${symbol.latin}</span>`;
  }

  return `<strong>${symbol.foreign}</strong><span class="cheat-case">${toUpperVariant(symbol.foreign)}</span><span>${symbol.latin}</span>`;
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
  const symbols = getPromptPool();
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
  return getPromptPool().find((symbol) => symbol.id === state.currentPromptId) || null;
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

function getPromptPool() {
  return getCaseAwareSymbols(getEnabledSymbols());
}

function getAnswerSymbols() {
  return getCaseAwareSymbols(getEnabledSymbols());
}

function getCaseAwareSymbols(symbols) {
  const alphabet = getSelectedAlphabet();
  if (!alphabet?.hasCase) {
    return symbols.map((symbol) => ({
      ...symbol,
      baseId: symbol.id,
      caseMode: "lower",
      caseLabel: "",
    }));
  }

  const caseMode = getCaseModeForAlphabet(alphabet);
  const variants = [];

  for (const symbol of symbols) {
    if (caseMode === "lower" || caseMode === "both") {
      variants.push({
        ...symbol,
        id: `${symbol.id}::lower`,
        baseId: symbol.id,
        caseMode: "lower",
        caseLabel: "lowercase",
      });
    }
    if (caseMode === "upper" || caseMode === "both") {
      variants.push({
        ...symbol,
        id: `${symbol.id}::upper`,
        baseId: symbol.id,
        foreign: toUpperVariant(symbol.foreign),
        caseMode: "upper",
        caseLabel: "uppercase",
      });
    }
  }

  return variants;
}

function getCaseModeForAlphabet(alphabet) {
  if (!alphabet?.hasCase) {
    return "lower";
  }

  const stored = state.caseModeMap[alphabet.id];
  return isValidCaseMode(stored) ? stored : "lower";
}

function isValidCaseMode(value) {
  return value === "lower" || value === "upper" || value === "both";
}

function toUpperVariant(value) {
  return value.toLocaleUpperCase();
}

function updateEnabledSymbol(symbolId, enabled) {
  const alphabet = getSelectedAlphabet();
  if (!alphabet) {
    return;
  }

  const currentPrompt = getCurrentPrompt();

  const nextSet = new Set(state.enabledMap[alphabet.id]);
  if (enabled) {
    nextSet.add(symbolId);
  } else if (nextSet.size > 1) {
    nextSet.delete(symbolId);
  }

  state.enabledMap[alphabet.id] = [...nextSet];
  saveEnabledMap();

  if (currentPrompt && !nextSet.has(currentPrompt.baseId || currentPrompt.id)) {
    state.currentPromptId = null;
    nextPrompt();
  }

  render();
}

function submitResult(correct, expectedAnswer) {
  clearFeedbackTimer();
  clearSuccessFeedbackTimer();
  state.awaitingManualContinue = false;

  if (correct) {
    state.selectedWrongSymbolId = null;
    state.stats.right += 1;
    setFeedback("right", "success");
    flashPromptSuccess();
    saveStats();
    renderStats();
    state.currentPromptId = null;
    scheduleNextPrompt(220);
    scheduleSuccessFeedbackClear(2400);
  } else {
    state.stats.wrong += 1;
    flashPromptFailure();
    state.revealedCorrectSymbolId =
      state.direction === "latinToForeign" && getCurrentPrompt() ? getCurrentPrompt().id : null;
    setFeedback(`correct answer: ${expectedAnswer}`, "error");
    saveStats();
    renderStats();
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

function clearSuccessFeedbackTimer() {
  if (state.successFeedbackTimeoutId !== null) {
    window.clearTimeout(state.successFeedbackTimeoutId);
    state.successFeedbackTimeoutId = null;
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
  if (!refs.feedback.classList.contains("success")) {
    setFeedback("");
  }
  state.currentPromptId = null;
  nextPrompt();
  renderPrompt();
  renderAnswerArea();
  scrollPromptIntoViewIfMobile();
}

function clearPendingWrongState() {
  clearFeedbackTimer();
  state.awaitingManualContinue = false;
  state.selectedWrongSymbolId = null;
  state.revealedCorrectSymbolId = null;
  refs.continueButton.classList.add("hidden");
}

function scheduleSuccessFeedbackClear(delay) {
  state.successFeedbackTimeoutId = window.setTimeout(() => {
    if (refs.feedback.classList.contains("success")) {
      refs.feedback.classList.add("fading");
      window.setTimeout(() => {
        if (refs.feedback.classList.contains("success")) {
          setFeedback("");
        }
      }, 420);
    }
    state.successFeedbackTimeoutId = null;
  }, delay);
}

function flashPromptSuccess() {
  refs.promptCard.classList.remove("failure-flash");
  refs.promptCard.classList.remove("success-flash");
  void refs.promptCard.offsetWidth;
  refs.promptCard.classList.add("success-flash");
}

function flashPromptFailure() {
  refs.promptCard.classList.remove("success-flash");
  refs.promptCard.classList.remove("failure-flash");
  void refs.promptCard.offsetWidth;
  refs.promptCard.classList.add("failure-flash");
}

function scrollPromptIntoViewIfMobile() {
  if (window.matchMedia("(max-width: 760px)").matches) {
    window.requestAnimationFrame(() => {
      refs.promptCard.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }
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

function getPromptHint(prompt, alphabet) {
  if (state.direction === "foreignToLatin") {
    return "type the latin reading below";
  }

  if (alphabet?.hasCase && prompt?.caseLabel) {
    return `pick the matching ${prompt.caseLabel} symbol`;
  }

  return "pick the matching symbol";
}

function applyTheme(theme) {
  refs.body.dataset.theme = theme;
  refs.themeToggle.textContent =
    theme === "dark"
      ? "dark, but you can switch"
      : "light, but you can switch";
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

function loadCaseModeMap() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.caseModeMap) || "{}");
  } catch {
    return {};
  }
}

function saveCaseModeMap() {
  localStorage.setItem(STORAGE_KEYS.caseModeMap, JSON.stringify(state.caseModeMap));
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
  const stored = localStorage.getItem(STORAGE_KEYS.feedbackMode);
  if (stored === "timed" || stored === "manual") {
    return stored;
  }
  return "manual";
}

function saveFeedbackMode() {
  localStorage.setItem(STORAGE_KEYS.feedbackMode, state.feedbackMode);
}
