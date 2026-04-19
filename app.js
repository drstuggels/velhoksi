const STORAGE_KEYS = {
  theme: "velhoksi.theme",
  alphabet: "velhoksi.alphabet",
  direction: "velhoksi.direction",
  enabledMap: "velhoksi.enabledMap",
  musicPitchRangeMap: "velhoksi.musicPitchRangeMap",
  caseModeMap: "velhoksi.caseModeMap",
  statsMap: "velhoksi.statsMap",
  missesMap: "velhoksi.missesMap",
  missedFocusMap: "velhoksi.missedFocusMap",
  feedbackDuration: "velhoksi.feedbackDuration",
  feedbackMode: "velhoksi.feedbackMode",
  cyrillicVariant: "velhoksi.cyrillicVariant",
  promptFontMap: "velhoksi.promptFontMap",
  randomFontMap: "velhoksi.randomFontMap",
  practiceModeMap: "velhoksi.practiceModeMap",
};

const BASE_ALPHABETS = [
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
      ["յ", "y"], ["ն", "n"], ["շ", "sh"], ["ո", "o"], ["չ", "ch'"],
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
      ["ح", "h"], ["خ", "kh"], ["د", "d"], ["ذ", "dh"], ["ر", "r"],
      ["ز", "z"], ["س", "s"], ["ش", "sh"], ["ص", "s2"], ["ض", "d2"],
      ["ط", "t2"], ["ظ", "z2"], ["ع", "ayn"], ["غ", "gh"], ["ف", "f"],
      ["ق", "q"], ["ك", "k"], ["ل", "l"], ["م", "m"], ["ن", "n"],
      ["ه", "h"], ["و", "w"], ["ي", "y"],
    ],
  },
  {
    id: "hebrew",
    label: "hebrew",
    symbols: [
      ["א", "alef"], ["ב", "b"], ["ג", "g"], ["ד", "d"], ["ה", "h"],
      ["ו", "v"], ["ז", "z"], ["ח", "kh"], ["ט", "t2"], ["י", "y"],
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
      ["ܘ", "w"], ["ܙ", "z"], ["ܚ", "h2"], ["ܛ", "t2"], ["ܝ", "y"],
      ["ܟ", "k"], ["ܠ", "l"], ["ܡ", "m"], ["ܢ", "n"], ["ܣ", "s"],
      ["ܥ", "ayn"], ["ܦ", "p"], ["ܨ", "s2"], ["ܩ", "q"], ["ܪ", "r"],
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
      ["і", "i"], ["ї", "yi"], ["є", "ye"], ["ґ", "g"], ["ў", "w"],
      ["ј", "j"], ["љ", "lj"], ["њ", "nj"], ["ђ", "dj"], ["ћ", "c"],
      ["џ", "dzh"], ["ѕ", "dz"], ["ѓ", "gj"], ["ќ", "kj"],
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
];

function getAbcjs() {
  return typeof window !== "undefined" ? window.ABCJS : null;
}

function normalizeBaseAlphabets(alphabets) {
  return alphabets.map((alphabet) => ({
    ...alphabet,
    symbols: alphabet.symbols.map(([foreign, latin], index) => ({
      id: `${alphabet.id}-${index}`,
      foreign,
      latin,
      enabledByDefault: true,
    })),
  }));
}

function createMusicAlphabet() {
  const id = "music-notes";
  const label = "music notes";
  const preview = "𝄞 ♩ ♪ ♫ ♬ 𝄢 ♯ ♭ ♮";

  const nameByPitchClass = {
    0: { sharp: "c", flat: "c" },
    1: { sharp: "c#", flat: "db" },
    2: { sharp: "d", flat: "d" },
    3: { sharp: "d#", flat: "eb" },
    4: { sharp: "e", flat: "e" },
    5: { sharp: "f", flat: "f" },
    6: { sharp: "f#", flat: "gb" },
    7: { sharp: "g", flat: "g" },
    8: { sharp: "g#", flat: "ab" },
    9: { sharp: "a", flat: "a" },
    10: { sharp: "a#", flat: "bb" },
    11: { sharp: "b", flat: "b" },
  };

  function pitchClassToAnswers(pitchClass) {
    const entry = nameByPitchClass[pitchClass];
    const answers = new Set([entry.sharp, entry.flat]);
    return [...answers];
  }

  const letterToIndex = { c: 0, d: 1, e: 2, f: 3, g: 4, a: 5, b: 6 };
  const indexToLetter = ["c", "d", "e", "f", "g", "a", "b"];
  const naturalPitchClassByLetter = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };

  function staffStepsForClef(clef, letter, octave) {
    // Steps are diatonic steps from the bottom staff line.
    // Treble bottom line: E4. Bass bottom line: G2.
    const ref = clef === "treble" ? { letter: "e", octave: 4 } : { letter: "g", octave: 2 };
    return diatonicAbs(letter, octave) - diatonicAbs(ref.letter, ref.octave);
  }

  function diatonicAbs(letter, octave) {
    return octave * 7 + letterToIndex[letter];
  }

  function toAbcPitch(letter, accidental, octave) {
    const acc = accidental === "#" ? "^" : accidental === "b" ? "_" : "";
    const upper = letter.toUpperCase();
    if (octave === 4) {
      return `${acc}${upper}`;
    }
    if (octave > 4) {
      const lower = letter.toLowerCase();
      const marks = "'".repeat(Math.max(0, octave - 5));
      return `${acc}${lower}${marks}`;
    }
    const commas = ",".repeat(4 - octave);
    return `${acc}${upper}${commas}`;
  }

  function makeSymbol({ clef, letter, accidental, octave, pitchClass, index }) {
    const display = accidental ? `${letter}${accidental}` : letter;
    const abcPitch = toAbcPitch(letter, accidental, octave);
    const abc = `L:1/4\nK:C clef=${clef}\n${abcPitch}\n`;
    const midi = (octave + 1) * 12 + pitchClass;
    return {
      id: `${id}-${index}`,
      baseId: `${id}-${index}`,
      foreign: "♪",
      latin: display,
      acceptedAnswers: pitchClassToAnswers(pitchClass),
      enabledByDefault: true,
      music: { clef, abc, midi },
      foreignMarkup: "",
    };
  }

  const notePool = [];
  const symbolById = {};
  let index = 0;
  let minMidi = Number.POSITIVE_INFINITY;
  let maxMidi = Number.NEGATIVE_INFINITY;
  for (const clef of ["treble", "bass"]) {
    for (let staffSteps = -6; staffSteps <= 14; staffSteps += 1) {
      const ref = clef === "treble" ? { letter: "e", octave: 4 } : { letter: "g", octave: 2 };
      const abs = diatonicAbs(ref.letter, ref.octave) + staffSteps;
      const octave = Math.floor(abs / 7);
      const letterIndex = abs - octave * 7;
      const letter = indexToLetter[letterIndex];
      const naturalPitchClass = naturalPitchClassByLetter[letter];

      const natural = makeSymbol({
        clef,
        letter,
        accidental: "",
        octave,
        pitchClass: naturalPitchClass,
        index,
      });
      notePool.push(natural);
      symbolById[natural.id] = natural;
      minMidi = Math.min(minMidi, natural.music.midi);
      maxMidi = Math.max(maxMidi, natural.music.midi);
      index += 1;

      const useSharp = [0, 2, 5, 7, 9].includes(naturalPitchClass);
      const accidental = useSharp ? "#" : "b";
      const accidentalPitchClass = useSharp
        ? (naturalPitchClass + 1) % 12
        : (naturalPitchClass + 11) % 12;
      const altered = makeSymbol({
        clef,
        letter,
        accidental,
        octave,
        pitchClass: accidentalPitchClass,
        index,
      });
      notePool.push(altered);
      symbolById[altered.id] = altered;
      minMidi = Math.min(minMidi, altered.music.midi);
      maxMidi = Math.max(maxMidi, altered.music.midi);
      index += 1;
    }
  }

  return {
    id,
    label,
    oneWay: true,
    preview,
    symbolById,
    musicMeta: { minMidi, maxMidi },
    symbols: notePool,
  };
}

const ALPHABETS = [...normalizeBaseAlphabets(BASE_ALPHABETS), createMusicAlphabet()];

const alphabetById = Object.fromEntries(ALPHABETS.map((alphabet) => [alphabet.id, alphabet]));
const CYRILLIC_VARIANTS = ["russian", "ukrainian", "belarusian", "bulgarian", "serbian", "macedonian"];

const PRACTICE_MODE_SYMBOLS = "symbols";
const PRACTICE_MODE_SYLLABLES = "syllables";
const PRACTICE_MODE_WORDS = "words";

const EMPTY_WORD_LISTS = {
  version: "empty",
  byAlphabet: {
    hiragana: [],
    katakana: [],
    armenian: [],
    hangul: [],
    arabic: [],
    hebrew: [],
    syriac: [],
    cherokee: [],
    greek: [],
    georgian: [],
    cyrillic: {
      russian: [],
      ukrainian: [],
      belarusian: [],
      bulgarian: [],
      serbian: [],
      macedonian: [],
    },
  },
};

const FONT_OPTION_DEFAULT_ID = "default";

const HANGUL = {
  base: 0xac00,
  lCount: 19,
  vCount: 21,
  tCount: 28,
  nCount: 21 * 28,
};

const HANGUL_L_INDEX_BY_JAMO = {
  "ㄱ": 0,
  "ㄴ": 2,
  "ㄷ": 3,
  "ㄹ": 5,
  "ㅁ": 6,
  "ㅂ": 7,
  "ㅅ": 9,
  "ㅇ": 11,
  "ㅈ": 12,
  "ㅊ": 14,
  "ㅋ": 15,
  "ㅌ": 16,
  "ㅍ": 17,
  "ㅎ": 18,
};

const HANGUL_V_INDEX_BY_JAMO = {
  "ㅏ": 0,
  "ㅑ": 2,
  "ㅓ": 4,
  "ㅕ": 6,
  "ㅗ": 8,
  "ㅛ": 12,
  "ㅜ": 13,
  "ㅠ": 17,
  "ㅡ": 18,
  "ㅣ": 20,
};

const HANGUL_T_INDEX_BY_JAMO = {
  "": 0,
  "ㄱ": 1,
  "ㄴ": 4,
  "ㄷ": 7,
  "ㄹ": 8,
  "ㅁ": 16,
  "ㅂ": 17,
  "ㅅ": 19,
  "ㅇ": 21,
  "ㅈ": 22,
  "ㅊ": 23,
  "ㅋ": 24,
  "ㅌ": 25,
  "ㅍ": 26,
  "ㅎ": 27,
};

const HANGUL_JAMO_TO_LATIN = {
  "ㄱ": "g",
  "ㄴ": "n",
  "ㄷ": "d",
  "ㄹ": "r",
  "ㅁ": "m",
  "ㅂ": "b",
  "ㅅ": "s",
  "ㅇ": "ng",
  "ㅈ": "j",
  "ㅊ": "ch",
  "ㅋ": "k",
  "ㅌ": "t",
  "ㅍ": "p",
  "ㅎ": "h",
  "ㅏ": "a",
  "ㅑ": "ya",
  "ㅓ": "eo",
  "ㅕ": "yeo",
  "ㅗ": "o",
  "ㅛ": "yo",
  "ㅜ": "u",
  "ㅠ": "yu",
  "ㅡ": "eu",
  "ㅣ": "i",
};

const HANGUL_CODA_JAMO_TO_LATIN = {
  "": "",
  "ㄱ": "k",
  "ㄴ": "n",
  "ㄷ": "t",
  "ㄹ": "l",
  "ㅁ": "m",
  "ㅂ": "p",
  "ㅅ": "t",
  "ㅇ": "ng",
  "ㅈ": "t",
  "ㅊ": "t",
  "ㅋ": "k",
  "ㅌ": "t",
  "ㅍ": "p",
  "ㅎ": "t",
};

const HANGUL_PRACTICE_CONSONANTS = ["ㄱ", "ㄴ", "ㄷ", "ㄹ", "ㅁ", "ㅂ", "ㅅ", "ㅇ", "ㅈ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"];
const HANGUL_PRACTICE_VOWELS = ["ㅏ", "ㅑ", "ㅓ", "ㅕ", "ㅗ", "ㅛ", "ㅜ", "ㅠ", "ㅡ", "ㅣ"];

let hangulSyllableCacheKey = "";
let hangulSyllableCache = [];

const PROMPT_FONT_OPTIONS = {
  hiragana: [
    { id: FONT_OPTION_DEFAULT_ID, label: "default" },
    { id: "noto-sans-jp", label: "paperback (noto sans jp)", family: "'Noto Sans JP', sans-serif" },
    { id: "noto-serif-jp", label: "classic print (noto serif jp)", family: "'Noto Serif JP', serif" },
    { id: "dotgothic16", label: "pixel manga (dotgothic16)", family: "'DotGothic16', sans-serif" },
    { id: "rampart-one", label: "festival sign (rampart one)", family: "'Rampart One', sans-serif" },
    { id: "yusei-magic", label: "marker note (yusei magic)", family: "'Yusei Magic', sans-serif" },
    { id: "zen-maru-gothic", label: "round retro (zen maru gothic)", family: "'Zen Maru Gothic', sans-serif" },
    { id: "kaisei-decol", label: "vintage headline (kaisei decol)", family: "'Kaisei Decol', serif" },
    { id: "rocknroll-one", label: "street poster (rocknroll one)", family: "'RocknRoll One', sans-serif" },
  ],
  katakana: [
    { id: FONT_OPTION_DEFAULT_ID, label: "default" },
    { id: "noto-sans-jp", label: "paperback (noto sans jp)", family: "'Noto Sans JP', sans-serif" },
    { id: "noto-serif-jp", label: "classic print (noto serif jp)", family: "'Noto Serif JP', serif" },
    { id: "dotgothic16", label: "pixel manga (dotgothic16)", family: "'DotGothic16', sans-serif" },
    { id: "rampart-one", label: "festival sign (rampart one)", family: "'Rampart One', sans-serif" },
    { id: "yusei-magic", label: "marker note (yusei magic)", family: "'Yusei Magic', sans-serif" },
    { id: "zen-maru-gothic", label: "round retro (zen maru gothic)", family: "'Zen Maru Gothic', sans-serif" },
    { id: "kaisei-decol", label: "vintage headline (kaisei decol)", family: "'Kaisei Decol', serif" },
    { id: "rocknroll-one", label: "street poster (rocknroll one)", family: "'RocknRoll One', sans-serif" },
  ],
  armenian: [
    { id: FONT_OPTION_DEFAULT_ID, label: "default" },
    { id: "noto-sans-armenian", label: "textbook sans (noto sans armenian)", family: "'Noto Sans Armenian', sans-serif" },
    { id: "noto-serif-armenian", label: "inscription serif (noto serif armenian)", family: "'Noto Serif Armenian', serif" },
    { id: "google-sans", label: "metro ui (google sans)", family: "'Google Sans', sans-serif" },
    { id: "handjet", label: "wireframe display (handjet)", family: "'Handjet', sans-serif" },
  ],
  hangul: [
    { id: FONT_OPTION_DEFAULT_ID, label: "default" },
    { id: "noto-sans-kr", label: "modern sans (noto sans kr)", family: "'Noto Sans KR', sans-serif" },
    { id: "noto-serif-kr", label: "book serif (noto serif kr)", family: "'Noto Serif KR', serif" },
    { id: "black-han-sans", label: "poster block (black han sans)", family: "'Black Han Sans', sans-serif" },
    { id: "gowun-dodum", label: "clean signage (gowun dodum)", family: "'Gowun Dodum', sans-serif" },
    { id: "nanum-brush-script", label: "brush pen (nanum brush script)", family: "'Nanum Brush Script', cursive" },
    { id: "gaegu", label: "playful hand (gaegu)", family: "'Gaegu', cursive" },
    { id: "gugi", label: "comic sign (gugi)", family: "'Gugi', sans-serif" },
    { id: "dokdo", label: "chalk graffiti (dokdo)", family: "'Dokdo', cursive" },
    { id: "single-day", label: "casual note (single day)", family: "'Single Day', cursive" },
  ],
  arabic: [
    { id: FONT_OPTION_DEFAULT_ID, label: "default" },
    { id: "noto-naskh-arabic", label: "book naskh (noto naskh arabic)", family: "'Noto Naskh Arabic', serif" },
    { id: "noto-kufi-arabic", label: "square kufi (noto kufi arabic)", family: "'Noto Kufi Arabic', sans-serif" },
    { id: "noto-sans-arabic", label: "modern sans (noto sans arabic)", family: "'Noto Sans Arabic', sans-serif" },
    { id: "amiri", label: "classical manuscript (amiri)", family: "'Amiri', serif" },
    { id: "aref-ruqaa", label: "ruqaa hand (aref ruqaa)", family: "'Aref Ruqaa', serif" },
    { id: "aref-ruqaa-ink", label: "ink ruqaa (aref ruqaa ink)", family: "'Aref Ruqaa Ink', serif" },
    { id: "reem-kufi-fun", label: "fun kufi (reem kufi fun)", family: "'Reem Kufi Fun', sans-serif" },
    { id: "reem-kufi-ink", label: "ink kufi (reem kufi ink)", family: "'Reem Kufi Ink', sans-serif" },
    { id: "cairo-play", label: "display cairo (cairo play)", family: "'Cairo Play', sans-serif" },
    { id: "noto-nastaliq-urdu", label: "nastaliq flow (noto nastaliq urdu)", family: "'Noto Nastaliq Urdu', serif" },
  ],
  hebrew: [
    { id: FONT_OPTION_DEFAULT_ID, label: "default" },
    { id: "noto-sans-hebrew", label: "clean sans (noto sans hebrew)", family: "'Noto Sans Hebrew', sans-serif" },
    { id: "frank-ruhl-libre", label: "press serif (frank ruhl libre)", family: "'Frank Ruhl Libre', serif" },
    { id: "noto-rashi-hebrew", label: "rashi script (noto rashi hebrew)", family: "'Noto Rashi Hebrew', serif" },
    { id: "heebo", label: "modern web (heebo)", family: "'Heebo', sans-serif" },
    { id: "assistant", label: "editorial sans (assistant)", family: "'Assistant', sans-serif" },
    { id: "david-libre", label: "tanakh serif (david libre)", family: "'David Libre', serif" },
    { id: "suez-one", label: "headline serif (suez one)", family: "'Suez One', serif" },
    { id: "secular-one", label: "billboard sans (secular one)", family: "'Secular One', sans-serif" },
    { id: "playpen-sans-hebrew", label: "playpen hand (playpen sans hebrew)", family: "'Playpen Sans Hebrew', cursive" },
  ],
  syriac: [
    { id: FONT_OPTION_DEFAULT_ID, label: "default" },
    { id: "noto-syriac", label: "estrangelo (noto syriac)", family: "'Noto Sans Syriac', serif" },
    { id: "noto-syriac-eastern", label: "eastern church (noto syriac eastern)", family: "'Noto Sans Syriac Eastern', 'Noto Sans Syriac', serif" },
    { id: "noto-syriac-western", label: "western church (noto syriac western)", family: "'Noto Sans Syriac Western', 'Noto Sans Syriac', serif" },
    { id: "idiqlat", label: "modern manuscript (idiqlat)", family: "'Idiqlat', serif" },
    { id: "ramsina", label: "angular inscription (ramsina)", family: "'Ramsina', serif" },
  ],
  cherokee: [
    { id: FONT_OPTION_DEFAULT_ID, label: "default" },
    { id: "noto-sans-cherokee", label: "learning sans (noto sans cherokee)", family: "'Noto Sans Cherokee', sans-serif" },
    { id: "explora", label: "light script (explora)", family: "'Explora', cursive" },
    { id: "genos", label: "neo sans (genos)", family: "'Genos', sans-serif" },
  ],
  greek: [
    { id: FONT_OPTION_DEFAULT_ID, label: "default" },
    { id: "noto-sans", label: "humanist sans (noto sans)", family: "'Noto Sans', sans-serif" },
    { id: "noto-serif", label: "classical serif (noto serif)", family: "'Noto Serif', serif" },
    { id: "gfs-didot", label: "hellenic didot (gfs didot)", family: "'GFS Didot', serif" },
    { id: "gfs-neohellenic", label: "neohellenic text (gfs neohellenic)", family: "'GFS Neohellenic', sans-serif" },
    { id: "alegreya", label: "bookish serif (alegreya)", family: "'Alegreya', serif" },
    { id: "google-sans", label: "square modern (google sans)", family: "'Google Sans', sans-serif" },
    { id: "handjet", label: "wireframe display (handjet)", family: "'Handjet', sans-serif" },
  ],
  cyrillic: [
    { id: FONT_OPTION_DEFAULT_ID, label: "default" },
    { id: "noto-sans", label: "humanist sans (noto sans)", family: "'Noto Sans', sans-serif" },
    { id: "noto-serif", label: "literary serif (noto serif)", family: "'Noto Serif', serif" },
    { id: "russo-one", label: "street stencil (russo one)", family: "'Russo One', sans-serif" },
    { id: "marck-script", label: "shop script (marck script)", family: "'Marck Script', cursive" },
    { id: "rubik-bubbles", label: "bulb sign (rubik bubbles)", family: "'Rubik Bubbles', sans-serif" },
    { id: "lobster", label: "retro ad (lobster)", family: "'Lobster', cursive" },
    { id: "alegreya", label: "book serif (alegreya)", family: "'Alegreya', serif" },
    { id: "cormorant-garamond", label: "newspaper serif (cormorant garamond)", family: "'Cormorant Garamond', serif" },
    { id: "google-sans", label: "ui modern (google sans)", family: "'Google Sans', sans-serif" },
    { id: "handjet", label: "wireframe display (handjet)", family: "'Handjet', sans-serif" },
  ],
  georgian: [
    { id: FONT_OPTION_DEFAULT_ID, label: "default" },
    { id: "noto-sans-georgian", label: "street sans (noto sans georgian)", family: "'Noto Sans Georgian', sans-serif" },
    { id: "noto-serif-georgian", label: "classic serif (noto serif georgian)", family: "'Noto Serif Georgian', serif" },
    { id: "google-sans", label: "metro ui (google sans)", family: "'Google Sans', sans-serif" },
  ],
};

const SYMBOL_NOTES = {
  hiragana: {
    "し": "usually romanized as shi, not si.",
    "ち": "usually romanized as chi, not ti.",
    "つ": "usually romanized as tsu, not tu.",
    "ふ": "usually romanized as fu, not hu."
  },
  katakana: {
    "シ": "usually romanized as shi, not si.",
    "チ": "usually romanized as chi, not ti.",
    "ツ": "usually romanized as tsu, not tu.",
    "フ": "usually romanized as fu, not hu."
  },
  armenian: {
    "է": "marked here as ee to keep it distinct from ե.",
    "ը": "uh is a neutral central vowel, not a full english u.",
    "ռ": "rr marks a stronger rolled r than ր.",
    "թ": "apostrophes mark aspirated or ejective-like contrasts in this set.",
    "ց": "apostrophes mark aspirated or ejective-like contrasts in this set.",
    "փ": "apostrophes mark aspirated or ejective-like contrasts in this set.",
    "ք": "apostrophes mark aspirated or ejective-like contrasts in this set."
  },
  hangul: {
    "ㅇ": "silent at the start of a syllable block, ng at the end. here it is shown with its final-sound value.",
    "ㄹ": "in syllable/word mode, ㄹ is r at the start of a syllable and l at the end (e.g. 라=ra, 을=eul). answers accept either r or l.",
    "ㄱ": "in syllable/word mode, final ㄱ is written as k, but before a vowel it can sound/appear like g (e.g. 각=gak, 먹어=meogeo).",
    "ㄷ": "in syllable/word mode, final ㄷ is written as t, but before a vowel it can sound/appear like d (e.g. 닫=dat, 닫아=dada).",
    "ㅂ": "in syllable/word mode, final ㅂ is written as p, but before a vowel it can sound/appear like b (e.g. 밥=bap, 밥을=babeul).",
    "ㅅ": "in syllable/word mode, final ㅅ is written as t, but before a vowel it can sound/appear like s (e.g. 옷=ot, 옷이=osi).",
    "ㅈ": "in syllable/word mode, final ㅈ is written as t, but before a vowel it can sound/appear like j (e.g. 찾=chat, 찾을=chajeul).",
    "ㅊ": "in syllable/word mode, final ㅊ is written as t, but before a vowel it can sound/appear like ch (e.g. 꽃=kkot, 꽃이=kkochi).",
    "ㅎ": "in syllable/word mode, final ㅎ is written as t, but before a vowel it can sound/appear like h (e.g. 좋=jot, 좋아=joha). it can also surface from final ㄶ/ㅀ before vowels (e.g. 많은=manheun).",
    "ㅓ": "eo is the standard romanization; it is not english eo literally.",
    "ㅕ": "yeo is the standard romanization; it is not english yeo literally.",
    "ㅡ": "eu is the standard romanization for this vowel."
  },
  arabic: {
    "ص": "the 2 marks an emphatic consonant kept separate from plain s.",
    "ض": "the 2 marks an emphatic consonant kept separate from plain d.",
    "ط": "the 2 marks an emphatic consonant kept separate from plain t.",
    "ظ": "the 2 marks an emphatic consonant kept separate from plain z.",
    "ع": "ayn is a conventional transliteration name for this consonant."
  },
  hebrew: {
    "ט": "t2 keeps this letter distinct from ת in this drill set.",
    "א": "alef is often a carrier for vowels or a glottal stop depending on context.",
    "ע": "ayn is a conventional transliteration name for this consonant."
  },
  syriac: {
    "ܚ": "h2 keeps this stronger h-like consonant distinct from ܗ.",
    "ܛ": "t2 keeps this emphatic t-like consonant distinct from ܬ.",
    "ܨ": "s2 keeps this emphatic s-like consonant distinct from ܣ.",
    "ܥ": "ayn is a conventional transliteration name for this consonant."
  },
  greek: {
    "η": "shown as ee to keep it distinct from ε in this simple drill set.",
    "ω": "shown as oo to keep it distinct from ο in this simple drill set.",
    "χ": "kh marks a rougher sound than plain k."
  },
  cyrillic: {
    "ъ": "hard is a mnemonic label for the hard sign, not a standalone vowel sound.",
    "ь": "soft is a mnemonic label for the soft sign, not a standalone vowel sound.",
    "щ": "shown as shch here to keep it distinct from ш."
  },
  georgian: {
    "კ": "apostrophes mark ejective consonants in this set.",
    "პ": "apostrophes mark ejective consonants in this set.",
    "ყ": "apostrophes mark ejective consonants in this set.",
    "წ": "apostrophes mark ejective consonants in this set.",
    "ჭ": "apostrophes mark ejective consonants in this set."
  },
  cherokee: {
    "Ꭵ": "v is a nasal vowel in cherokee romanization, not the english consonant v.",
    "Ꭼ": "gv uses the same nasal-v value as Ꭵ.",
    "Ꮂ": "hv uses the same nasal-v value as Ꭵ.",
    "Ꮈ": "lv uses the same nasal-v value as Ꭵ.",
    "Ꮕ": "nv uses the same nasal-v value as Ꭵ.",
    "Ꮛ": "quv uses the same nasal-v value as Ꭵ.",
    "Ꮢ": "sv uses the same nasal-v value as Ꭵ.",
    "Ꮫ": "dv uses the same nasal-v value as Ꭵ.",
    "Ꮲ": "tlv uses the same nasal-v value as Ꭵ.",
    "Ꮸ": "tsv uses the same nasal-v value as Ꭵ.",
    "Ꮾ": "wv uses the same nasal-v value as Ꭵ.",
    "Ᏼ": "yv uses the same nasal-v value as Ꭵ."
  }
};

const state = {
  theme: loadTheme(),
  selectedAlphabet: localStorage.getItem(STORAGE_KEYS.alphabet) || null,
  bootLoading: true,
  direction: localStorage.getItem(STORAGE_KEYS.direction) || "foreignToLatin",
  cyrillicVariant: loadCyrillicVariant(),
  enabledMap: loadEnabledMap(),
  musicPitchRangeMap: loadMusicPitchRangeMap(),
  caseModeMap: loadCaseModeMap(),
  statsMap: loadStatsMap(),
  missesMap: loadMissesMap(),
  missedFocusMap: loadMissedFocusMap(),
  feedbackDuration: loadFeedbackDuration(),
  feedbackMode: loadFeedbackMode(),
  promptFontMap: loadPromptFontMap(),
  randomFontMap: loadRandomFontMap(),
  cheatFontMap: {},
  practiceModeMap: loadPracticeModeMap(),
  wordLists: EMPTY_WORD_LISTS,
  currentPromptId: null,
  currentPromptFontId: FONT_OPTION_DEFAULT_ID,
  lastPromptId: null,
  promptQueue: [],
  feedbackTimeoutId: null,
  successFeedbackTimeoutId: null,
  awaitingManualContinue: false,
  selectedWrongSymbolId: null,
  revealedCorrectSymbolId: null,
};

const refs = {
  body: document.body,
  root: document.documentElement,
  brandHome: document.querySelector("#brand-home"),
  pickerView: document.querySelector("#picker-view"),
  gameView: document.querySelector("#game-view"),
  switchAlphabet: document.querySelector("#switch-alphabet"),
  themeToggle: document.querySelector("#theme-toggle"),
  shortcutsToggle: document.querySelector("#shortcuts-toggle"),
  shortcutsDialog: document.querySelector("#shortcuts-dialog"),
  closeShortcuts: document.querySelector("#close-shortcuts"),
  themeColorMeta: document.querySelector("#theme-color-meta"),
  alphabetTitle: document.querySelector("#alphabet-title"),
  alphabetPicker: document.querySelector("#alphabet-picker"),
  directionToggle: document.querySelector("#direction-toggle"),
  settingsToggle: document.querySelector("#settings-toggle"),
  settingsDialog: document.querySelector("#settings-dialog"),
  closeSettings: document.querySelector("#close-settings"),
  settingsPanel: document.querySelector("#settings-panel"),
  cyrillicVariantSettings: document.querySelector("#cyrillic-variant-settings"),
  cyrillicVariant: document.querySelector("#cyrillic-variant"),
  practiceModeSettings: document.querySelector("#practice-mode-settings"),
  practiceModeCopy: document.querySelector("#practice-mode-copy"),
  practiceModeOptions: [...document.querySelectorAll(".practice-mode-option")],
  settingsList: document.querySelector("#settings-list"),
  settingsEmpty: document.querySelector("#settings-empty"),
  allOnButton: document.querySelector("#all-on-button"),
  allOffButton: document.querySelector("#all-off-button"),
  missedFocusToggle: document.querySelector("#missed-focus-toggle"),
  feedbackDurationControl: document.querySelector("#feedback-duration-control"),
  feedbackSettingsCopy: document.querySelector("#feedback-settings-copy"),
  caseSettings: document.querySelector("#case-settings"),
  caseOptions: [...document.querySelectorAll(".case-option")],
  promptFontSettings: document.querySelector("#prompt-font-settings"),
  promptFontCopy: document.querySelector("#prompt-font-copy"),
  promptFontSelect: document.querySelector("#prompt-font-select"),
  randomFontToggle: document.querySelector("#random-font-toggle"),
  manualResetButton: document.querySelector("#manual-reset-button"),
  manualResetStatus: document.querySelector("#manual-reset-status"),
  feedbackDuration: document.querySelector("#feedback-duration"),
  feedbackMode: document.querySelector("#feedback-mode"),
  cheatToggle: document.querySelector("#cheat-toggle"),
  cheatDialog: document.querySelector("#cheat-dialog"),
  closeCheat: document.querySelector("#close-cheat"),
  cheatTitle: document.querySelector("#cheat-title"),
  cheatFontControl: document.querySelector("#cheat-font-control"),
  cheatFontSelect: document.querySelector("#cheat-font-select"),
  cheatGrid: document.querySelector("#cheat-grid"),
  cheatTooltip: document.querySelector("#cheat-tooltip"),
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

let musicRenderHost = null;
let musicHydrationScheduled = false;
const MUSIC_RENDER_VERSION = 3;

init();

async function init() {
  applyTheme(state.theme);
  render();
  state.wordLists = await loadWordLists();
  ensureEnabledMapShape();
  ensureMusicPitchRangeMapShape();
  ensurePromptFontMapsShape();
  ensurePracticeModeMapShape();
  state.bootLoading = false;
  bindEvents();
  render();
}

function bindEvents() {
  if (refs.brandHome) {
    refs.brandHome.addEventListener("click", () => {
      goToStartMenu();
    });

    const prefersReducedMotion = Boolean(
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches
    );

    const updateBrandPointer = (event) => {
      const rect = refs.brandHome.getBoundingClientRect();
      const px = rect.width ? (event.clientX - rect.left) / rect.width : 0.5;
      const py = rect.height ? (event.clientY - rect.top) / rect.height : 0.5;
      const x = `${Math.max(0, Math.min(1, px)) * 100}%`;
      const y = `${Math.max(0, Math.min(1, py)) * 100}%`;
      refs.brandHome.style.setProperty("--brand-mx", x);
      refs.brandHome.style.setProperty("--brand-my", y);
    };

    refs.brandHome.addEventListener("pointerenter", (event) => updateBrandPointer(event));
    if (!prefersReducedMotion) {
      refs.brandHome.addEventListener("pointermove", (event) => updateBrandPointer(event));
    }
    refs.brandHome.addEventListener("pointerleave", () => {
      refs.brandHome.style.setProperty("--brand-mx", "50%");
      refs.brandHome.style.setProperty("--brand-my", "50%");
    });
  }

  refs.themeToggle.addEventListener("click", () => {
    state.theme = state.theme === "dark" ? "light" : "dark";
    saveTheme();
    applyTheme(state.theme);
  });

  if (refs.cyrillicVariant) {
    refs.cyrillicVariant.addEventListener("change", () => {
      const next = refs.cyrillicVariant.value;
      if (!isValidCyrillicVariant(next)) {
        return;
      }
      state.cyrillicVariant = next;
      localStorage.setItem(STORAGE_KEYS.cyrillicVariant, next);
      state.enabledMap.cyrillic = getDefaultEnabledCyrillicIds(next);
      saveEnabledMap();
      clearPendingWrongState();
      reshufflePromptCollection();
      setFeedback("");
      render();
    });
  }

  refs.switchAlphabet.addEventListener("click", () => {
    goToStartMenu();
  });

  refs.directionToggle.addEventListener("click", () => {
    const alphabet = getSelectedAlphabet();
    if (!alphabet || alphabet.oneWay || isWordPracticeModeForAlphabet(alphabet) || isSyllablePracticeModeForAlphabet(alphabet)) {
      return;
    }
    state.direction =
      state.direction === "foreignToLatin" ? "latinToForeign" : "foreignToLatin";
    localStorage.setItem(STORAGE_KEYS.direction, state.direction);
    reshufflePromptCollection();
    setFeedback("");
    render();
  });

  refs.settingsToggle.addEventListener("click", () => {
    toggleSettingsDialog();
  });

  refs.closeSettings?.addEventListener("click", () => {
    refs.settingsDialog?.close();
    render();
  });

  refs.settingsDialog?.addEventListener("click", (event) => {
    const card = refs.settingsDialog.querySelector(".dialog-card");
    if (!card?.contains(event.target)) {
      refs.settingsDialog.close();
      render();
    }
  });

  refs.settingsDialog?.addEventListener("close", () => {
    render();
  });

  refs.cheatToggle.addEventListener("click", () => {
    toggleCheatDialog();
  });

  refs.shortcutsToggle?.addEventListener("click", () => {
    toggleShortcutsDialog();
  });

  refs.closeCheat.addEventListener("click", () => refs.cheatDialog.close());
  refs.closeShortcuts?.addEventListener("click", () => refs.shortcutsDialog?.close());

  const isFinePointer = window.matchMedia?.("(hover: hover) and (pointer: fine)")?.matches;

  function hideCheatTooltip() {
    if (!refs.cheatTooltip) {
      return;
    }
    refs.cheatTooltip.classList.add("hidden");
    refs.cheatTooltip.textContent = "";
    refs.cheatTooltip.removeAttribute("data-placement");
    refs.cheatTooltip.style.left = "";
    refs.cheatTooltip.style.top = "";
  }

  function showCheatTooltip(trigger) {
    if (!refs.cheatTooltip || !isFinePointer) {
      return;
    }

    const note = trigger?.getAttribute("data-note") || "";
    if (!note) {
      hideCheatTooltip();
      return;
    }

    refs.cheatTooltip.textContent = note;
    refs.cheatTooltip.classList.remove("hidden");

    // Measure after un-hiding so we can clamp within viewport.
    const triggerRect = trigger.getBoundingClientRect();
    const tooltipRect = refs.cheatTooltip.getBoundingClientRect();
    const margin = 12;
    const gap = 10;

    let left = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
    left = Math.max(margin, Math.min(left, window.innerWidth - margin - tooltipRect.width));

    let top = triggerRect.bottom + gap;
    let placement = "bottom";
    if (top + tooltipRect.height + margin > window.innerHeight) {
      top = triggerRect.top - gap - tooltipRect.height;
      placement = "top";
    }
    top = Math.max(margin, Math.min(top, window.innerHeight - margin - tooltipRect.height));

    refs.cheatTooltip.setAttribute("data-placement", placement);
    refs.cheatTooltip.style.left = `${Math.round(left)}px`;
    refs.cheatTooltip.style.top = `${Math.round(top)}px`;
  }

  if (refs.cheatDialog) {
    refs.cheatDialog.addEventListener("mouseover", (event) => {
      const trigger = event.target.closest?.(".cheat-note-trigger");
      if (trigger) {
        showCheatTooltip(trigger);
      }
    });

    refs.cheatDialog.addEventListener("mousemove", (event) => {
      const trigger = event.target.closest?.(".cheat-note-trigger");
      if (trigger) {
        showCheatTooltip(trigger);
      }
    });

    refs.cheatDialog.addEventListener("mouseout", (event) => {
      if (!isFinePointer) {
        return;
      }
      const fromTrigger = event.target.closest?.(".cheat-note-trigger");
      const toTrigger = event.relatedTarget?.closest?.(".cheat-note-trigger");
      if (fromTrigger && !toTrigger) {
        hideCheatTooltip();
      }
    });

    refs.cheatDialog.addEventListener("focusin", (event) => {
      const trigger = event.target.closest?.(".cheat-note-trigger");
      if (trigger) {
        showCheatTooltip(trigger);
      }
    });

    refs.cheatDialog.addEventListener("focusout", (event) => {
      if (!isFinePointer) {
        return;
      }
      const fromTrigger = event.target.closest?.(".cheat-note-trigger");
      const toTrigger = event.relatedTarget?.closest?.(".cheat-note-trigger");
      if (fromTrigger && !toTrigger) {
        hideCheatTooltip();
      }
    });

    refs.cheatDialog.addEventListener("scroll", hideCheatTooltip, { passive: true });
    refs.cheatDialog.addEventListener("close", hideCheatTooltip);
  }

  refs.cheatDialog.addEventListener("click", (event) => {
    const noteTrigger = event.target.closest(".cheat-note-trigger");
    if (noteTrigger) {
      const noteItem = noteTrigger.closest(".cheat-item");
      const isActive = noteTrigger.classList.contains("active");
      refs.cheatGrid
        .querySelectorAll(".cheat-note-trigger.active")
        .forEach((button) => {
          button.classList.remove("active");
          button.setAttribute("aria-expanded", "false");
        });
      refs.cheatGrid
        .querySelectorAll(".cheat-item.note-open")
        .forEach((item) => item.classList.remove("note-open"));
      if (!isActive) {
        noteTrigger.classList.add("active");
        noteTrigger.setAttribute("aria-expanded", "true");
        noteItem?.classList.add("note-open");
      }
      showCheatTooltip(noteTrigger);
      return;
    }

    const card = refs.cheatDialog.querySelector(".dialog-card");
    if (!card.contains(event.target)) {
      refs.cheatDialog.close();
      return;
    }

    refs.cheatGrid
      .querySelectorAll(".cheat-note-trigger.active")
      .forEach((button) => {
        button.classList.remove("active");
        button.setAttribute("aria-expanded", "false");
      });
    refs.cheatGrid
      .querySelectorAll(".cheat-item.note-open")
      .forEach((item) => item.classList.remove("note-open"));
    hideCheatTooltip();
  });

  refs.shortcutsDialog?.addEventListener("click", (event) => {
    const card = refs.shortcutsDialog.querySelector(".dialog-card");
    if (!card?.contains(event.target)) {
      refs.shortcutsDialog.close();
      render();
    }
  });

  refs.shortcutsDialog?.addEventListener("close", () => {
    render();
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
    // Defer auto-submit to the next frame so the latest keystroke is fully committed.
    window.requestAnimationFrame(() => {
      if (state.awaitingManualContinue || state.feedbackTimeoutId !== null) {
        return;
      }
      submitLatinAnswer(false);
    });
  });

  refs.resetStats.addEventListener("click", () => {
    resetStatsState();
    reshufflePromptCollection();
    renderStats();
    setFeedback("stats reset.", "success");
    render();
  });

  refs.allOffButton.addEventListener("click", () => {
    const alphabet = getSelectedAlphabet();
    if (!alphabet) {
      return;
    }
    state.enabledMap[alphabet.id] = [];
    saveEnabledMap();
    clearPendingWrongState();
    reshufflePromptCollection();
    setFeedback("");
    render();
  });

  refs.allOnButton.addEventListener("click", () => {
    const alphabet = getSelectedAlphabet();
    if (!alphabet) {
      return;
    }
    state.enabledMap[alphabet.id] = alphabet.symbols.map((symbol) => symbol.id);
    saveEnabledMap();
    clearPendingWrongState();
    reshufflePromptCollection();
    setFeedback("");
    render();
  });

  refs.missedFocusToggle.addEventListener("change", () => {
    const alphabet = getSelectedAlphabet();
    if (!alphabet) {
      return;
    }
    state.missedFocusMap[alphabet.id] = refs.missedFocusToggle.checked;
    saveMissedFocusMap();
    reshufflePromptCollection();
    setFeedback("");
    render();
  });

  refs.feedbackDuration.addEventListener("change", () => {
    state.feedbackDuration = Number(refs.feedbackDuration.value);
    saveFeedbackDuration();
    reshufflePromptCollection();
    render();
  });

  refs.feedbackMode.addEventListener("change", () => {
    state.feedbackMode = refs.feedbackMode.value === "manual" ? "manual" : "timed";
    saveFeedbackMode();
    reshufflePromptCollection();
    render();
  });

  if (refs.promptFontSelect) {
    refs.promptFontSelect.addEventListener("change", () => {
      const alphabet = getSelectedAlphabet();
      if (!alphabet || !supportsPromptFontSettings(alphabet)) {
        return;
      }
      const options = getPromptFontOptionsForAlphabet(alphabet);
      const nextId = refs.promptFontSelect.value;
      if (!options.some((option) => option.id === nextId)) {
        return;
      }
      state.promptFontMap[alphabet.id] = nextId;
      savePromptFontMap();
      clearPendingWrongState();
      reshufflePromptCollection();
      setFeedback("");
      render();
    });
  }

  if (refs.randomFontToggle) {
    refs.randomFontToggle.addEventListener("change", () => {
      const alphabet = getSelectedAlphabet();
      if (!alphabet || !supportsPromptFontSettings(alphabet)) {
        return;
      }
      state.randomFontMap[alphabet.id] = refs.randomFontToggle.checked;
      saveRandomFontMap();
      if (!state.randomFontMap[alphabet.id]) {
        delete state.cheatFontMap[alphabet.id];
      }
      clearPendingWrongState();
      reshufflePromptCollection();
      setFeedback("");
      render();
    });
  }

  if (refs.cheatFontSelect) {
    refs.cheatFontSelect.addEventListener("change", () => {
      const alphabet = getSelectedAlphabet();
      if (!alphabet || !supportsPromptFontSettings(alphabet)) {
        return;
      }
      const options = getPromptFontOptionsForAlphabet(alphabet);
      const nextId = refs.cheatFontSelect.value;
      if (!options.some((option) => option.id === nextId)) {
        return;
      }
      if (getRandomFontForAlphabet(alphabet)) {
        state.cheatFontMap[alphabet.id] = nextId;
        render();
        return;
      } else {
        state.promptFontMap[alphabet.id] = nextId;
        savePromptFontMap();
      }
      clearPendingWrongState();
      reshufflePromptCollection();
      setFeedback("");
      render();
    });
  }

  refs.manualResetButton?.addEventListener("click", () => {
    runManualResetFlow();
  });

  for (const button of refs.practiceModeOptions) {
    button.addEventListener("click", () => {
      const alphabet = getSelectedAlphabet();
      const nextMode = button.dataset.practiceMode;
      if (!alphabet || !isValidPracticeMode(nextMode)) {
        return;
      }
      if (nextMode === PRACTICE_MODE_WORDS && !isWordModeSupported(alphabet)) {
        return;
      }
      if (nextMode === PRACTICE_MODE_SYLLABLES && !isSyllableModeSupported(alphabet)) {
        return;
      }
      state.practiceModeMap[alphabet.id] = nextMode;
      savePracticeModeMap();
      if ((nextMode === PRACTICE_MODE_WORDS || nextMode === PRACTICE_MODE_SYLLABLES) && state.direction !== "foreignToLatin") {
        state.direction = "foreignToLatin";
        localStorage.setItem(STORAGE_KEYS.direction, state.direction);
      }
      clearPendingWrongState();
      reshufflePromptCollection();
      setFeedback("");
      render();
    });
  }

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
      reshufflePromptCollection();
      setFeedback("");
      render();
    });
  }

  refs.continueButton.addEventListener("click", () => {
    continueAfterReveal();
  });

  document.addEventListener("keydown", (event) => {
    if (handleGlobalShortcut(event)) {
      return;
    }
    if (event.key !== "Enter" || isAnyDialogOpen()) {
      return;
    }
    if (isTypingTarget(event.target)) {
      return;
    }

    if (state.awaitingManualContinue) {
      event.preventDefault();
      continueAfterReveal();
      return;
    }

    if (state.direction === "foreignToLatin" && state.feedbackTimeoutId === null) {
      const prompt = getCurrentPrompt();
      if (!prompt) {
        return;
      }
      event.preventDefault();
      submitLatinAnswer(true);
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

function goToStartMenu() {
  if (refs.cheatDialog?.open) {
    refs.cheatDialog.close();
  }
  if (refs.settingsDialog?.open) {
    refs.settingsDialog.close();
  }
  if (refs.shortcutsDialog?.open) {
    refs.shortcutsDialog.close();
  }
  clearPendingWrongState();
  clearSuccessFeedbackTimer();
  state.selectedAlphabet = null;
  state.currentPromptId = null;
  state.currentPromptFontId = FONT_OPTION_DEFAULT_ID;
  state.lastPromptId = null;
  localStorage.removeItem(STORAGE_KEYS.alphabet);
  setFeedback("");
  render();
  refs.pickerView?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function render() {
  if (state.bootLoading) {
    const selectedAlphabet = getSelectedAlphabet();
    if (selectedAlphabet) {
      refs.pickerView.classList.add("hidden");
      refs.gameView.classList.remove("hidden");
      refs.switchAlphabet.classList.remove("hidden");
      refs.alphabetTitle.textContent = `${selectedAlphabet.label},`;
      refs.cheatToggle.disabled = true;
      refs.settingsToggle.disabled = true;
      refs.directionToggle.disabled = true;
      refs.promptCard.classList.remove("success-flash", "failure-flash", "flash");
      refs.promptValue.classList.remove("graphic", "symbol-font");
      refs.promptValue.style.removeProperty("--prompt-symbol-font");
      refs.promptValue.textContent = "...";
      refs.promptHint.textContent = "loading alphabet data";
      refs.latinForm.classList.add("hidden");
      refs.symbolAnswer.classList.add("hidden");
      refs.continueButton.classList.add("hidden");
      refs.feedback.textContent = "";
      renderStats();
      return;
    }

    refs.pickerView.classList.remove("hidden");
    refs.gameView.classList.add("hidden");
    refs.switchAlphabet.classList.add("hidden");
    refs.alphabetTitle.textContent = "loading,";
    refs.cheatToggle.disabled = true;
    refs.settingsToggle.disabled = true;
    refs.directionToggle.disabled = true;
    refs.shortcutsToggle?.setAttribute("aria-expanded", String(Boolean(refs.shortcutsDialog?.open)));
    renderAlphabetPicker();
    return;
  }

  const alphabet = getSelectedAlphabet();
  const caseMode = alphabet ? getCaseModeForAlphabet(alphabet) : "lower";
  const practiceMode = alphabet ? getPracticeModeForAlphabet(alphabet) : PRACTICE_MODE_SYMBOLS;
  const enforceForeignToLatin = Boolean(
    alphabet?.oneWay || practiceMode === PRACTICE_MODE_WORDS || practiceMode === PRACTICE_MODE_SYLLABLES
  );
  if (enforceForeignToLatin && state.direction !== "foreignToLatin") {
    state.direction = "foreignToLatin";
    localStorage.setItem(STORAGE_KEYS.direction, state.direction);
  }
  refs.pickerView.classList.toggle("hidden", Boolean(alphabet));
  refs.gameView.classList.toggle("hidden", !alphabet);
  refs.switchAlphabet.classList.toggle("hidden", !alphabet);
  refs.alphabetTitle.textContent = alphabet ? `${alphabet.label},` : `nothing,`;
  if (!alphabet && refs.settingsDialog?.open) {
    refs.settingsDialog.close();
  }
  refs.cyrillicVariantSettings?.classList.toggle("hidden", alphabet?.id !== "cyrillic");
  if (alphabet?.id === "cyrillic" && refs.cyrillicVariant) {
    refs.cyrillicVariant.value = state.cyrillicVariant;
  }
  refs.settingsToggle.setAttribute("aria-expanded", String(Boolean(alphabet && refs.settingsDialog?.open)));
  refs.cheatToggle.disabled = !alphabet;
  refs.settingsToggle.disabled = !alphabet;
  refs.directionToggle.disabled = !alphabet || enforceForeignToLatin;
  refs.shortcutsToggle?.setAttribute("aria-expanded", String(Boolean(refs.shortcutsDialog?.open)));
  refs.feedbackDuration.value = String(state.feedbackDuration);
  refs.feedbackMode.value = state.feedbackMode;
  refs.feedbackDurationControl.classList.toggle("hidden", state.feedbackMode === "manual");
  refs.feedbackSettingsCopy.textContent =
    state.feedbackMode === "manual"
      ? "what happens after a wrong answer."
      : "how long the correct answer stays visible before the next prompt.";
  refs.missedFocusToggle.checked = alphabet ? getMissedFocusForAlphabet(alphabet) : false;
  refs.caseSettings.classList.toggle("hidden", !alphabet || !alphabet.hasCase);
  for (const button of refs.caseOptions) {
    const active = button.dataset.caseMode === caseMode;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  }
  renderPracticeModeSettings(alphabet);
  renderPromptFontSettings(alphabet);
  refs.continueButton.classList.toggle("hidden", !state.awaitingManualContinue);
  refs.latinInput.placeholder = getLatinInputPlaceholder(alphabet);
  refs.latinInput.maxLength = getLatinInputMaxLength(alphabet);
  renderAlphabetPicker();
  renderStats();
  renderSettings();
  renderCheatSheet();

  if (alphabet && state.currentPromptId === null && !getCurrentPrompt()) {
    nextPrompt();
  }

  renderPrompt();
  renderAnswerArea();
}

function getLatinInputPlaceholder(alphabet) {
  if (alphabet && isWordPracticeModeForAlphabet(alphabet)) {
    return "type the latin transliteration";
  }
  if (alphabet && isSyllablePracticeModeForAlphabet(alphabet)) {
    return "type the latin syllable";
  }
  if (alphabet?.id === "music-notes") {
    return "type the note name (c, c#, db, bb)";
  }
  return "type the latin reading";
}

function getLatinInputMaxLength(alphabet) {
  if (alphabet && isWordPracticeModeForAlphabet(alphabet)) {
    return 48;
  }
  if (alphabet && isSyllablePracticeModeForAlphabet(alphabet)) {
    return 16;
  }
  return 6;
}

function renderPracticeModeSettings(alphabet) {
  if (!refs.practiceModeSettings || !refs.practiceModeCopy || !Array.isArray(refs.practiceModeOptions)) {
    return;
  }

  const show = Boolean(alphabet && !alphabet.oneWay);
  refs.practiceModeSettings.classList.toggle("hidden", !show);
  if (!show) {
    return;
  }

  const supportsWords = isWordModeSupported(alphabet);
  const supportsSyllables = isSyllableModeSupported(alphabet);
  const currentMode = getPracticeModeForAlphabet(alphabet);
  if (supportsSyllables) {
    refs.practiceModeCopy.textContent = supportsWords
      ? "switch between symbol, syllable, and word drills."
      : "switch between symbol drills and syllable drills.";
  } else {
    refs.practiceModeCopy.textContent = supportsWords
      ? "switch between symbol drills and word drills."
      : "word mode is not available for this alphabet.";
  }

  for (const button of refs.practiceModeOptions) {
    const mode = button.dataset.practiceMode;
    const active = mode === currentMode;
    const disabled =
      (mode === PRACTICE_MODE_WORDS && !supportsWords) ||
      (mode === PRACTICE_MODE_SYLLABLES && !supportsSyllables);
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
    button.disabled = disabled;
    button.classList.toggle("hidden", mode === PRACTICE_MODE_SYLLABLES && !supportsSyllables);
  }
}

function getMusicPitchRangeForAlphabet(alphabet) {
  const meta = alphabet?.musicMeta;
  const fallback = { minMidi: 0, maxMidi: 127 };
  if (!meta || typeof meta.minMidi !== "number" || typeof meta.maxMidi !== "number") {
    return fallback;
  }
  const stored = state.musicPitchRangeMap?.[alphabet.id];
  if (!stored || typeof stored.minMidi !== "number" || typeof stored.maxMidi !== "number") {
    return { minMidi: meta.minMidi, maxMidi: meta.maxMidi };
  }
  const minMidi = Math.max(meta.minMidi, Math.min(stored.minMidi, meta.maxMidi));
  const maxMidi = Math.max(meta.minMidi, Math.min(stored.maxMidi, meta.maxMidi));
  return minMidi <= maxMidi ? { minMidi, maxMidi } : { minMidi: meta.minMidi, maxMidi: meta.maxMidi };
}

function supportsPromptFontSettings(alphabet) {
  if (!alphabet || alphabet.id === "music-notes") {
    return false;
  }
  const options = PROMPT_FONT_OPTIONS[alphabet.id];
  return Array.isArray(options) && options.length > 0;
}

function getPromptFontOptionsForAlphabet(alphabet) {
  if (!supportsPromptFontSettings(alphabet)) {
    return [{ id: FONT_OPTION_DEFAULT_ID, label: "default" }];
  }
  return PROMPT_FONT_OPTIONS[alphabet.id];
}

function getPromptFontIdForAlphabet(alphabet) {
  const options = getPromptFontOptionsForAlphabet(alphabet);
  const stored = state.promptFontMap?.[alphabet?.id];
  if (options.some((option) => option.id === stored)) {
    return stored;
  }
  return FONT_OPTION_DEFAULT_ID;
}

function getPromptFontOptionById(alphabet, fontId) {
  const options = getPromptFontOptionsForAlphabet(alphabet);
  return options.find((option) => option.id === fontId) || options[0] || { id: FONT_OPTION_DEFAULT_ID, label: "default" };
}

function getRandomFontForAlphabet(alphabet) {
  if (!supportsPromptFontSettings(alphabet)) {
    return false;
  }
  return Boolean(state.randomFontMap?.[alphabet.id]);
}

function getCheatFontIdForAlphabet(alphabet) {
  if (!supportsPromptFontSettings(alphabet)) {
    return FONT_OPTION_DEFAULT_ID;
  }
  if (getRandomFontForAlphabet(alphabet)) {
    const override = state.cheatFontMap?.[alphabet.id];
    const options = getPromptFontOptionsForAlphabet(alphabet);
    if (options.some((option) => option.id === override)) {
      return override;
    }
    if (options.some((option) => option.id === state.currentPromptFontId)) {
      return state.currentPromptFontId;
    }
  }
  return getPromptFontIdForAlphabet(alphabet);
}

function pickRandomPromptFontId(alphabet) {
  const options = getPromptFontOptionsForAlphabet(alphabet);
  const pool = options.filter((option) => option.id !== FONT_OPTION_DEFAULT_ID);
  const source = pool.length > 0 ? pool : options;
  if (source.length === 0) {
    return FONT_OPTION_DEFAULT_ID;
  }

  const current = state.currentPromptFontId;
  if (source.length === 1) {
    return source[0].id;
  }

  const filtered = source.filter((option) => option.id !== current);
  const pickable = filtered.length > 0 ? filtered : source;
  const index = Math.floor(Math.random() * pickable.length);
  return pickable[index].id;
}

function pickPromptFontIdForAlphabet(alphabet) {
  if (!supportsPromptFontSettings(alphabet)) {
    return FONT_OPTION_DEFAULT_ID;
  }
  if (getRandomFontForAlphabet(alphabet)) {
    return pickRandomPromptFontId(alphabet);
  }
  return getPromptFontIdForAlphabet(alphabet);
}

function renderPromptFontSettings(alphabet) {
  if (!refs.promptFontSettings || !refs.promptFontSelect || !refs.randomFontToggle || !refs.promptFontCopy) {
    return;
  }

  const show = supportsPromptFontSettings(alphabet);
  refs.promptFontSettings.classList.toggle("hidden", !show);
  if (!show) {
    refs.promptFontSelect.innerHTML = "";
    refs.randomFontToggle.checked = false;
    refs.promptFontSelect.disabled = true;
    return;
  }

  const options = getPromptFontOptionsForAlphabet(alphabet);
  refs.promptFontSelect.innerHTML = "";
  for (const option of options) {
    const node = document.createElement("option");
    node.value = option.id;
    node.textContent = option.label;
    refs.promptFontSelect.appendChild(node);
  }

  refs.promptFontSelect.value = getPromptFontIdForAlphabet(alphabet);
  const randomEnabled = getRandomFontForAlphabet(alphabet);
  refs.randomFontToggle.checked = randomEnabled;
  refs.promptFontSelect.disabled = false;
  refs.promptFontCopy.textContent = randomEnabled
    ? "random mode changes prompt font every card. cheat sheet defaults to the current prompt font."
    : "switch symbol styles to get used to different writing forms.";
}

function renderCheatFontControl(alphabet) {
  if (!refs.cheatFontControl || !refs.cheatFontSelect) {
    return;
  }

  const show = supportsPromptFontSettings(alphabet);
  refs.cheatFontControl.classList.toggle("hidden", !show);
  if (!show) {
    refs.cheatFontSelect.innerHTML = "";
    refs.cheatFontSelect.disabled = true;
    return;
  }

  refs.cheatFontSelect.disabled = false;
  refs.cheatFontSelect.innerHTML = "";
  const options = getPromptFontOptionsForAlphabet(alphabet);
  for (const option of options) {
    const node = document.createElement("option");
    node.value = option.id;
    node.textContent = option.label;
    refs.cheatFontSelect.appendChild(node);
  }
  refs.cheatFontSelect.value = getCheatFontIdForAlphabet(alphabet);
}

function applyPromptFont(prompt, alphabet, useGraphic) {
  refs.promptValue.classList.remove("symbol-font");
  refs.promptValue.style.removeProperty("--prompt-symbol-font");

  const shouldApply =
    Boolean(prompt) &&
    Boolean(alphabet) &&
    state.direction === "foreignToLatin" &&
    !useGraphic &&
    supportsPromptFontSettings(alphabet);
  if (!shouldApply) {
    return;
  }

  const option = getPromptFontOptionById(alphabet, state.currentPromptFontId);
  if (!option?.family) {
    return;
  }
  refs.promptValue.classList.add("symbol-font");
  refs.promptValue.style.setProperty("--prompt-symbol-font", option.family);
}

function applyCheatSheetFont(alphabet) {
  if (!refs.cheatGrid) {
    return;
  }
  refs.cheatGrid.style.removeProperty("--cheat-symbol-font");

  if (!supportsPromptFontSettings(alphabet)) {
    return;
  }

  const option = getPromptFontOptionById(alphabet, getCheatFontIdForAlphabet(alphabet));
  if (!option?.family) {
    return;
  }
  refs.cheatGrid.style.setProperty("--cheat-symbol-font", option.family);
}

function setManualResetStatus(message, tone) {
  if (!refs.manualResetStatus) {
    return;
  }
  refs.manualResetStatus.textContent = message || "";
  refs.manualResetStatus.classList.remove("hidden", "status-error", "status-success");
  if (!message) {
    refs.manualResetStatus.classList.add("hidden");
    return;
  }
  if (tone === "error") {
    refs.manualResetStatus.classList.add("status-error");
  } else if (tone === "success") {
    refs.manualResetStatus.classList.add("status-success");
  }
}

async function runManualResetFlow() {
  const trigger = refs.manualResetButton;
  if (!trigger) {
    return;
  }

  trigger.disabled = true;
  setManualResetStatus("resetting app data and caches...", "");

  try {
    if ("serviceWorker" in navigator && typeof navigator.serviceWorker.getRegistrations === "function") {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(
        registrations.map((registration) =>
          registration.unregister().catch(() => false)
        )
      );
    }

    if ("caches" in window && typeof caches.keys === "function") {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key).catch(() => false)));
    }

    localStorage.clear();
    state.theme = "dark";
    setManualResetStatus("reset complete. reloading...", "success");
    window.setTimeout(() => {
      const url = new URL(window.location.href);
      url.searchParams.set("reset", String(Date.now()));
      window.location.replace(url.toString());
    }, 220);
  } catch {
    setManualResetStatus("reset failed. try again while online.", "error");
    trigger.disabled = false;
  }
}

function renderAlphabetPicker() {
  refs.alphabetPicker.innerHTML = "";
  refs.alphabetPicker.classList.toggle("loading", state.bootLoading);

  if (state.bootLoading) {
    const loading = document.createElement("div");
    loading.className = "alphabet-loading-dots";
    loading.setAttribute("role", "status");
    loading.setAttribute("aria-live", "polite");

    const label = document.createElement("span");
    label.className = "visually-hidden";
    label.textContent = "loading alphabets";

    for (let index = 0; index < 5; index += 1) {
      const dot = document.createElement("span");
      dot.className = "alphabet-loading-dot";
      dot.setAttribute("aria-hidden", "true");
      dot.style.setProperty("--dot-delay", `${index * 120}ms`);
      loading.appendChild(dot);
    }
    loading.appendChild(label);
    refs.alphabetPicker.appendChild(loading);
    return;
  }

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
    const previewText = alphabet.preview || alphabet.symbols.map((symbol) => symbol.foreign).join("   ");
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
      state.currentPromptFontId = FONT_OPTION_DEFAULT_ID;
      state.lastPromptId = null;
      setFeedback("");
      render();
    });
    refs.alphabetPicker.appendChild(button);
  }
}

function renderPrompt() {
  const prompt = getCurrentPrompt();
  const alphabet = getSelectedAlphabet();
  const isWordMode = Boolean(alphabet && isWordPracticeModeForAlphabet(alphabet));
  const sourceLabel = alphabet ? alphabet.label : "foreign";
  const leftLabel =
    state.direction === "foreignToLatin"
      ? isWordMode
        ? `${sourceLabel} words`
        : sourceLabel
      : "latin";
  const rightLabel = state.direction === "foreignToLatin" ? "latin" : sourceLabel;
  const directionKey = `${leftLabel}::${rightLabel}`;
  if (refs.directionToggle.dataset.directionKey !== directionKey) {
    refs.directionToggle.dataset.directionKey = directionKey;
    refs.directionToggle.textContent = "";
    refs.directionToggle.append(document.createTextNode(`${leftLabel} `));
    const arrow = document.createElement("span");
    arrow.className = "direction-arrow";
    arrow.setAttribute("aria-hidden", "true");
    arrow.textContent = "→";
    refs.directionToggle.append(arrow);
    refs.directionToggle.append(document.createTextNode(` ${rightLabel}`));
  }

  if (!prompt) {
    refs.promptCard.classList.remove("success-flash", "failure-flash");
    refs.promptValue.textContent = "-";
    refs.promptValue.classList.remove("graphic");
    applyPromptFont(null, alphabet, false);
    refs.promptHint.textContent = getSelectedAlphabet()
      ? isWordMode
        ? "no words available with current settings"
        : "no symbols enabled"
      : "choose an alphabet";
    refs.promptCard.dataset.promptId = "";
    return;
  }

  if (refs.promptCard.dataset.promptId !== prompt.id) {
    refs.promptCard.classList.remove("success-flash", "failure-flash");
    refs.promptCard.classList.remove("flash");
    void refs.promptCard.offsetWidth;
    refs.promptCard.classList.add("flash");
    refs.promptCard.dataset.promptId = prompt.id;
  }

  const useGraphic = Boolean(state.direction === "foreignToLatin" && (prompt.music || prompt.foreignMarkup));
  refs.promptValue.classList.toggle("graphic", useGraphic);
  applyPromptFont(prompt, alphabet, useGraphic);
  if (useGraphic && state.direction === "foreignToLatin") {
    if (prompt.music) {
      refs.promptValue.innerHTML = ensureMusicMarkup(prompt);
    } else {
      refs.promptValue.innerHTML = prompt.foreignMarkup;
    }
  } else {
    refs.promptValue.textContent = state.direction === "foreignToLatin" ? prompt.foreign : prompt.latin;
  }
  refs.promptHint.textContent = getPromptHint(prompt, alphabet);
}

function renderAnswerArea() {
  const prompt = getCurrentPrompt();
  const alphabet = getSelectedAlphabet();
  const forceLatinInput = Boolean(alphabet && isWordPracticeModeForAlphabet(alphabet));
  const useLatinInput = forceLatinInput || state.direction === "foreignToLatin";
  const showManualContinue = useLatinInput && state.awaitingManualContinue;

  const mainPanel = refs.gameView.querySelector(".floating-main");
  mainPanel?.classList.toggle("latin-mode", useLatinInput);
  mainPanel?.classList.toggle("symbol-mode", !useLatinInput);

  refs.latinInput.placeholder = getLatinInputPlaceholder(alphabet);
  refs.latinInput.maxLength = getLatinInputMaxLength(alphabet);
  refs.latinForm.classList.toggle("hidden", !useLatinInput || (!prompt && !showManualContinue));
  refs.symbolAnswer.classList.toggle("hidden", useLatinInput || !prompt || forceLatinInput);

  if (!prompt && !showManualContinue) {
    refs.symbolGrid.innerHTML = "";
    refs.latinInput.value = "";
    refs.latinInput.disabled = true;
    refs.latinInput.readOnly = false;
    refs.continueButton.classList.add("hidden");
    return;
  }

  refs.latinInput.disabled = !useLatinInput;
  refs.latinInput.readOnly = useLatinInput && state.awaitingManualContinue;

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
  const settingsOpen = Boolean(refs.settingsDialog?.open || refs.settingsDialog?.hasAttribute("open"));

  if (!alphabet) {
    return;
  }
  if (alphabet.id === "music-notes" && !settingsOpen) {
    return;
  }

  const enabledSet = new Set(state.enabledMap[alphabet.id]);
  const enabledCount = enabledSet.size;

  refs.settingsEmpty.classList.toggle("hidden", enabledCount > 0);

  if (alphabet.id === "music-notes") {
    const { minMidi, maxMidi } = getMusicPitchRangeForAlphabet(alphabet);
    const wrap = document.createElement("div");
    wrap.className = "music-range";

    const label = document.createElement("div");
    label.className = "music-range-label";
    label.textContent = `pitch range: ${midiToLabel(minMidi)} to ${midiToLabel(maxMidi)}`;

    const sliders = document.createElement("div");
    sliders.className = "music-range-sliders";

    const minInput = document.createElement("input");
    minInput.type = "range";
    minInput.min = String(alphabet.musicMeta.minMidi);
    minInput.max = String(alphabet.musicMeta.maxMidi);
    minInput.step = "1";
    minInput.value = String(minMidi);
    minInput.setAttribute("aria-label", "minimum pitch");

    const maxInput = document.createElement("input");
    maxInput.type = "range";
    maxInput.min = String(alphabet.musicMeta.minMidi);
    maxInput.max = String(alphabet.musicMeta.maxMidi);
    maxInput.step = "1";
    maxInput.value = String(maxMidi);
    maxInput.setAttribute("aria-label", "maximum pitch");

    const setRange = (nextMin, nextMax) => {
      const clampedMin = Math.max(alphabet.musicMeta.minMidi, Math.min(nextMin, alphabet.musicMeta.maxMidi));
      const clampedMax = Math.max(alphabet.musicMeta.minMidi, Math.min(nextMax, alphabet.musicMeta.maxMidi));
      const fixedMin = Math.min(clampedMin, clampedMax);
      const fixedMax = Math.max(clampedMin, clampedMax);
      state.musicPitchRangeMap[alphabet.id] = { minMidi: fixedMin, maxMidi: fixedMax };
      saveMusicPitchRangeMap();
      label.textContent = `pitch range: ${midiToLabel(fixedMin)} to ${midiToLabel(fixedMax)}`;
    };

    const syncInputs = () => {
      const rawMin = Number(minInput.value);
      const rawMax = Number(maxInput.value);
      const clampedMin = Math.max(alphabet.musicMeta.minMidi, Math.min(rawMin, alphabet.musicMeta.maxMidi));
      const clampedMax = Math.max(alphabet.musicMeta.minMidi, Math.min(rawMax, alphabet.musicMeta.maxMidi));
      const fixedMin = Math.min(clampedMin, clampedMax);
      const fixedMax = Math.max(clampedMin, clampedMax);
      minInput.value = String(fixedMin);
      maxInput.value = String(fixedMax);
      setRange(fixedMin, fixedMax);
      return { minMidi: fixedMin, maxMidi: fixedMax };
    };

    minInput.addEventListener("input", syncInputs);
    maxInput.addEventListener("input", syncInputs);

    const commit = () => {
      syncInputs();
      reshufflePromptCollection();
      render();
    };

    minInput.addEventListener("change", commit);
    maxInput.addEventListener("change", commit);

    sliders.append(minInput, maxInput);
    wrap.append(label, sliders);
    refs.settingsList.appendChild(wrap);
  }

  for (const symbol of alphabet.symbols) {
    if (alphabet.id === "music-notes") {
      const { minMidi, maxMidi } = getMusicPitchRangeForAlphabet(alphabet);
      const midi = symbol.music?.midi;
      if (typeof midi === "number" && (midi < minMidi || midi > maxMidi)) {
        continue;
      }
    }
    const item = document.createElement("label");
    item.className = "setting-item";

    const symbolWrap = document.createElement("span");
    symbolWrap.className = "setting-symbol";
    symbolWrap.innerHTML = getSettingSymbolMarkup(symbol, alphabet);

    const toggle = document.createElement("input");
    toggle.type = "checkbox";
    toggle.className = "toggle";
    toggle.checked = enabledSet.has(symbol.id);
    toggle.addEventListener("change", () => {
      updateEnabledSymbol(symbol.id, toggle.checked);
    });

    item.append(symbolWrap, toggle);
    refs.settingsList.appendChild(item);
  }
}

function getSettingSymbolMarkup(symbol, alphabet) {
  if (alphabet?.id === "music-notes" && symbol.music) {
    const clefLabel = symbol.music.clef === "treble" ? "treble" : "bass";
    return `<strong>${symbol.latin}</strong><span class="setting-clef">${clefLabel}</span>`;
  }
  return `<strong>${symbol.foreign}</strong><span>${symbol.latin}</span>`;
}

function renderCheatSheet() {
  const alphabet = getSelectedAlphabet();

  if (!alphabet) {
    refs.cheatGrid.innerHTML = "";
    renderCheatFontControl(null);
    applyCheatSheetFont(null);
    refs.cheatTitle.textContent = "cheat sheet";
    return;
  }

  refs.cheatTitle.textContent = `${alphabet.label} cheat sheet`;
  renderCheatFontControl(alphabet);

  const cheatOpen = Boolean(refs.cheatDialog?.open || refs.cheatDialog?.hasAttribute("open"));
  if (alphabet.id === "music-notes" && !cheatOpen) {
    // Avoid expensive DOM work unless the dialog is actually open.
    return;
  }

  refs.cheatGrid.innerHTML = "";
  applyCheatSheetFont(alphabet);

  const enabledSet = new Set(state.enabledMap[alphabet.id]);
  const caseMode = getCaseModeForAlphabet(alphabet);
  const range = alphabet.id === "music-notes" ? getMusicPitchRangeForAlphabet(alphabet) : null;

  for (const symbol of alphabet.symbols) {
    if (range) {
      const midi = symbol.music?.midi;
      if (typeof midi === "number" && (midi < range.minMidi || midi > range.maxMidi)) {
        continue;
      }
    }
    const item = document.createElement("article");
    item.className = "cheat-item";
    if (!enabledSet.has(symbol.id)) {
      item.classList.add("disabled");
    }
    item.innerHTML = getCheatSheetMarkup(symbol, alphabet, caseMode);
    refs.cheatGrid.appendChild(item);
  }

  scheduleMusicPreviewHydration();
}

function isAnyDialogOpen() {
  return Boolean(refs.cheatDialog?.open || refs.settingsDialog?.open || refs.shortcutsDialog?.open);
}

function isTypingTarget(target) {
  if (!target || !(target instanceof Element)) {
    return false;
  }
  if (target.closest("input, textarea, select")) {
    return true;
  }
  const editable = target.closest("[contenteditable]");
  return Boolean(editable && editable.getAttribute("contenteditable") !== "false");
}

function toggleDialog(dialog) {
  if (!dialog) {
    return false;
  }
  if (dialog.open) {
    dialog.close();
    return true;
  }
  closeOtherDialogs(dialog);
  if (typeof dialog.showModal === "function") {
    dialog.showModal();
  } else {
    dialog.setAttribute("open", "open");
  }
  return true;
}

function closeOtherDialogs(exceptDialog) {
  const dialogs = [refs.cheatDialog, refs.settingsDialog, refs.shortcutsDialog];
  for (const dialog of dialogs) {
    if (!dialog || dialog === exceptDialog) {
      continue;
    }
    if (dialog.open) {
      dialog.close();
    }
  }
}

function toggleSettingsDialog() {
  if (!getSelectedAlphabet()) {
    return;
  }
  if (toggleDialog(refs.settingsDialog)) {
    render();
  }
}

function toggleCheatDialog() {
  const alphabet = getSelectedAlphabet();
  if (!alphabet) {
    return;
  }
  const wasOpen = Boolean(refs.cheatDialog?.open);
  if (!toggleDialog(refs.cheatDialog)) {
    return;
  }
  if (!wasOpen) {
    if (supportsPromptFontSettings(alphabet) && getRandomFontForAlphabet(alphabet)) {
      delete state.cheatFontMap[alphabet.id];
    }
    renderCheatSheet();
    scheduleMusicPreviewHydration();
    if (refs.closeCheat) {
      const isCoarsePointer = Boolean(
        window.matchMedia?.("(pointer: coarse)")?.matches
      );
      if (isCoarsePointer) {
        window.requestAnimationFrame(() => {
          refs.closeCheat?.focus?.({ preventScroll: true });
        });
      }
    }
  }
  render();
}

function toggleShortcutsDialog() {
  if (toggleDialog(refs.shortcutsDialog)) {
    render();
  }
}

function togglePracticeModeShortcut() {
  const alphabet = getSelectedAlphabet();
  if (!alphabet || alphabet.oneWay) {
    return;
  }
  const currentMode = getPracticeModeForAlphabet(alphabet);
  const supportsWords = isWordModeSupported(alphabet);
  const supportsSyllables = isSyllableModeSupported(alphabet);
  const modes = [PRACTICE_MODE_SYMBOLS];
  if (supportsSyllables) {
    modes.push(PRACTICE_MODE_SYLLABLES);
  }
  if (supportsWords) {
    modes.push(PRACTICE_MODE_WORDS);
  }
  const currentIndex = Math.max(0, modes.indexOf(currentMode));
  const nextMode = modes[(currentIndex + 1) % modes.length];
  if (nextMode === currentMode) {
    return;
  }
  state.practiceModeMap[alphabet.id] = nextMode;
  savePracticeModeMap();
  if ((nextMode === PRACTICE_MODE_WORDS || nextMode === PRACTICE_MODE_SYLLABLES) && state.direction !== "foreignToLatin") {
    state.direction = "foreignToLatin";
    localStorage.setItem(STORAGE_KEYS.direction, state.direction);
  }
  clearPendingWrongState();
  reshufflePromptCollection();
  setFeedback("");
  render();
}

function toggleDirectionShortcut() {
  const alphabet = getSelectedAlphabet();
  if (!alphabet || alphabet.oneWay || isWordPracticeModeForAlphabet(alphabet) || isSyllablePracticeModeForAlphabet(alphabet)) {
    return;
  }
  state.direction =
    state.direction === "foreignToLatin" ? "latinToForeign" : "foreignToLatin";
  localStorage.setItem(STORAGE_KEYS.direction, state.direction);
  reshufflePromptCollection();
  setFeedback("");
  render();
}

function handleGlobalShortcut(event) {
  if (event.defaultPrevented) {
    return false;
  }

  const hasAltLikeModifier = Boolean(event.altKey || event.getModifierState?.("AltGraph"));
  if (!hasAltLikeModifier) {
    return false;
  }

  const code = String(event.code || "");
  const isShortcutsToggle = code === "KeyH";

  if (isShortcutsToggle) {
    event.preventDefault();
    toggleShortcutsDialog();
    return true;
  }

  if (event.shiftKey) {
    return false;
  }

  if (code === "KeyS") {
    event.preventDefault();
    toggleSettingsDialog();
    return true;
  }
  if (code === "KeyC") {
    event.preventDefault();
    toggleCheatDialog();
    return true;
  }
  if (code === "KeyD") {
    event.preventDefault();
    toggleDirectionShortcut();
    return true;
  }
  if (code === "KeyM") {
    event.preventDefault();
    togglePracticeModeShortcut();
    return true;
  }
  if (code === "KeyR") {
    if (!getSelectedAlphabet()) {
      return false;
    }
    event.preventDefault();
    resetStatsState();
    reshufflePromptCollection();
    renderStats();
    setFeedback("stats reset.", "success");
    render();
    return true;
  }
  if (code === "KeyL") {
    if (!getSelectedAlphabet()) {
      return false;
    }
    event.preventDefault();
    goToStartMenu();
    return true;
  }
  if (code === "KeyT") {
    event.preventDefault();
    state.theme = state.theme === "dark" ? "light" : "dark";
    saveTheme();
    applyTheme(state.theme);
    return true;
  }

  return false;
}

function getCheatSheetMarkup(symbol, alphabet, caseMode) {
  const note = getSymbolNote(alphabet.id, symbol.foreign);
  const noteButton = note
    ? `<button type="button" class="cheat-note-trigger" aria-label="note about ${symbol.foreign}" aria-expanded="false" data-note="${escapeHtml(note)}">?</button>`
    : "";
  const noteBlock = note ? `<div class="cheat-note-inline">${escapeHtml(note)}</div>` : "";

  if (alphabet?.id === "music-notes" && symbol.music) {
    return `<div class="cheat-item-head"><span class="cheat-symbol-preview music-preview" data-music-id="${symbol.id}" aria-hidden="true"></span>${noteButton}</div><span>${symbol.latin}</span>${noteBlock}`;
  }

  if (!alphabet.hasCase) {
    return `<div class="cheat-item-head"><strong>${symbol.foreign}</strong>${noteButton}</div><span>${symbol.latin}</span>${noteBlock}`;
  }

  // Always show both cases in cheat sheet regardless of settings
  return `<div class="cheat-item-head"><strong>${symbol.foreign}</strong>${noteButton}</div><span class="cheat-case">${toUpperVariant(symbol.foreign)}</span><span>${symbol.latin}</span>${noteBlock}`;
}

function getSymbolNote(alphabetId, foreign) {
  return SYMBOL_NOTES[alphabetId]?.[foreign] || "";
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("\"", "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function renderStats() {
  const { right, wrong } = getCurrentStats();
  const total = right + wrong;
  const percent = total === 0 ? 0 : Math.round((right / total) * 100);

  refs.statRight.textContent = String(right);
  refs.statWrong.textContent = String(wrong);
  refs.statPercent.textContent = `${percent}%`;
}

function nextPrompt() {
  const alphabet = getSelectedAlphabet();
  if (!alphabet) {
    state.currentPromptId = null;
    state.currentPromptFontId = FONT_OPTION_DEFAULT_ID;
    return;
  }

  const symbols = getPromptPool();
  if (symbols.length === 0) {
    state.currentPromptId = null;
    state.currentPromptFontId = FONT_OPTION_DEFAULT_ID;
    return;
  }

  const validIds = new Set(symbols.map((symbol) => symbol.id));
  state.promptQueue = Array.isArray(state.promptQueue)
    ? state.promptQueue.filter((id) => validIds.has(id))
    : [];

  if (state.promptQueue.length === 0) {
    state.promptQueue = buildPromptQueue(symbols);
  }

  const nextId = state.promptQueue.shift();
  if (!nextId) {
    state.currentPromptId = null;
    state.currentPromptFontId = FONT_OPTION_DEFAULT_ID;
    return;
  }
  state.lastPromptId = nextId;
  state.currentPromptId = nextId;
  state.currentPromptFontId = pickPromptFontIdForAlphabet(alphabet);
}

function buildPromptQueue(symbols) {
  const weightedPool = getWeightedPromptPool(symbols);
  const ids = weightedPool.map((symbol) => symbol.id);
  shuffleInPlace(ids);

  const queue = [];
  const remaining = [...ids];
  let last = state.lastPromptId || null;

  while (remaining.length > 0) {
    const candidateIndexes = [];
    for (let index = 0; index < remaining.length; index += 1) {
      if (remaining[index] !== last) {
        candidateIndexes.push(index);
      }
    }

    const pickIndex =
      candidateIndexes.length === 0
        ? 0
        : candidateIndexes[Math.floor(Math.random() * candidateIndexes.length)];
    const [picked] = remaining.splice(pickIndex, 1);
    queue.push(picked);
    last = picked;
  }

  return queue;
}

function shuffleInPlace(array) {
  for (let index = array.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    const temp = array[index];
    array[index] = array[swapIndex];
    array[swapIndex] = temp;
  }
  return array;
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
  const base = alphabet.symbols.filter((symbol) => enabledSet.has(symbol.id));
  if (alphabet.id !== "music-notes") {
    return base;
  }
  const range = getMusicPitchRangeForAlphabet(alphabet);
  return base.filter((symbol) => {
    const midi = symbol.music?.midi;
    return typeof midi === "number" && midi >= range.minMidi && midi <= range.maxMidi;
  });
}

function getPromptPool() {
  const alphabet = getSelectedAlphabet();
  if (alphabet) {
    if (isWordPracticeModeForAlphabet(alphabet)) {
      return getCaseAwareSymbols(getEnabledWords());
    }
    if (isSyllablePracticeModeForAlphabet(alphabet)) {
      return getCaseAwareSymbols(getEnabledSyllables());
    }
  }
  return getCaseAwareSymbols(getEnabledSymbols());
}

function getAnswerSymbols() {
  const alphabet = getSelectedAlphabet();
  if (alphabet && (isWordPracticeModeForAlphabet(alphabet) || isSyllablePracticeModeForAlphabet(alphabet))) {
    return [];
  }
  return getCaseAwareSymbols(getEnabledSymbols());
}

function composeHangulSyllable(initialJamo, vowelJamo, finalJamo) {
  const lIndex = HANGUL_L_INDEX_BY_JAMO[initialJamo];
  const vIndex = HANGUL_V_INDEX_BY_JAMO[vowelJamo];
  const tIndex = HANGUL_T_INDEX_BY_JAMO[finalJamo];
  if (typeof lIndex !== "number" || typeof vIndex !== "number" || typeof tIndex !== "number") {
    return "";
  }
  const code = HANGUL.base + (lIndex * HANGUL.nCount + vIndex * HANGUL.tCount + tIndex);
  return String.fromCharCode(code);
}

function hangulSyllableToLatin(initialJamo, vowelJamo, finalJamo) {
  const initial = initialJamo === "ㅇ" ? "" : (HANGUL_JAMO_TO_LATIN[initialJamo] || "");
  const vowel = HANGUL_JAMO_TO_LATIN[vowelJamo] || "";
  const final = finalJamo ? (HANGUL_CODA_JAMO_TO_LATIN[finalJamo] || "") : "";
  return `${initial}${vowel}${final}`;
}

function normalizeHangulLatinAnswer(raw) {
  return String(raw || "")
    .trim()
    .toLowerCase()
    .replaceAll(/\s+/g, "")
    // Hangul ㄹ is often taught as r/l depending on position. We accept either.
    .replaceAll("l", "r");
}

function getEnabledSyllables() {
  const alphabet = getSelectedAlphabet();
  if (!alphabet || alphabet.id !== "hangul" || !isSyllablePracticeModeForAlphabet(alphabet)) {
    return [];
  }

  const enabledForeign = new Set(getEnabledSymbols().map((symbol) => symbol.foreign));
  const enabledConsonants = HANGUL_PRACTICE_CONSONANTS.filter((jamo) => enabledForeign.has(jamo));
  const enabledVowels = HANGUL_PRACTICE_VOWELS.filter((jamo) => enabledForeign.has(jamo));
  const finals = ["", ...enabledConsonants];

  const key = `c:${enabledConsonants.join("")}|v:${enabledVowels.join("")}|f:${finals.join("")}`;
  if (key === hangulSyllableCacheKey && Array.isArray(hangulSyllableCache)) {
    return hangulSyllableCache;
  }

  const pool = [];
  for (const initialJamo of enabledConsonants) {
    for (const vowelJamo of enabledVowels) {
      for (const finalJamo of finals) {
        const foreign = composeHangulSyllable(initialJamo, vowelJamo, finalJamo);
        if (!foreign) {
          continue;
        }
        const latin = hangulSyllableToLatin(initialJamo, vowelJamo, finalJamo).toLowerCase();
        if (!latin) {
          continue;
        }
        const hex = foreign.codePointAt(0).toString(16);
        const baseId = `syllable:hangul:${hex}`;
        pool.push({
          id: baseId,
          baseId,
          foreign,
          latin,
          source: "generated",
        });
      }
    }
  }

  hangulSyllableCacheKey = key;
  hangulSyllableCache = pool;
  return pool;
}

function getEnabledWords() {
  const alphabet = getSelectedAlphabet();
  if (!alphabet || !isWordPracticeModeForAlphabet(alphabet)) {
    return [];
  }

  const rows = getWordRowsForAlphabet(alphabet);
  if (!Array.isArray(rows) || rows.length === 0) {
    return [];
  }

  if (alphabet.id === "hangul") {
    return rows.map((row) => {
      const foreign = String(row.foreign || "");
      const source = String(row.source || "");
      const idSource = source.replace(/[^a-z0-9-]/gi, "-");
      const idForeign = foreign.replace(/\s+/g, "");
      const baseId = `word:${alphabet.id}:${idSource}:${idForeign}`;
      const latin = String(row.latin || "").toLowerCase();
      return {
        id: baseId,
        baseId,
        foreign,
        latin,
        source,
      };
    });
  }

  const enabledSymbolIds = new Set(state.enabledMap[alphabet.id] || []);
  const enabledLetters = new Set(
    alphabet.symbols
      .filter((symbol) => enabledSymbolIds.has(symbol.id))
      .map((symbol) => symbol.foreign)
  );

  return rows
    .filter((row) => {
      const foreign = String(row.foreign || "");
      if (!foreign) {
        return false;
      }
      for (const ch of foreign) {
        if (!enabledLetters.has(ch)) {
          return false;
        }
      }
      return true;
    })
    .map((row) => {
      const foreign = String(row.foreign || "");
      const source = String(row.source || "");
      const idSource = source.replace(/[^a-z0-9-]/gi, "-");
      const idForeign = foreign.replace(/\s+/g, "");
      const baseId = `word:${alphabet.id}:${idSource}:${idForeign}`;
      return {
        id: baseId,
        baseId,
        foreign,
        latin: String(row.latin || ""),
        source,
      };
    });
}

function getWordRowsForAlphabet(alphabet) {
  if (!alphabet) {
    return [];
  }
  const byAlphabet = state.wordLists?.byAlphabet || {};

  if (alphabet.id === "cyrillic") {
    const cyr = byAlphabet.cyrillic || {};
    if (state.cyrillicVariant === "all") {
      const merged = [];
      const seen = new Set();
      for (const variant of CYRILLIC_VARIANTS) {
        const rows = Array.isArray(cyr[variant]) ? cyr[variant] : [];
        for (const row of rows) {
          const foreign = String(row?.foreign || "");
          if (!foreign || seen.has(foreign)) {
            continue;
          }
          seen.add(foreign);
          merged.push(row);
        }
      }
      return merged;
    }
    return Array.isArray(cyr[state.cyrillicVariant]) ? cyr[state.cyrillicVariant] : [];
  }

  return Array.isArray(byAlphabet[alphabet.id]) ? byAlphabet[alphabet.id] : [];
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

  if (caseMode === "both") {
    shuffleInPlace(variants);
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

function isValidPracticeMode(value) {
  return value === PRACTICE_MODE_SYMBOLS || value === PRACTICE_MODE_SYLLABLES || value === PRACTICE_MODE_WORDS;
}

function isWordModeSupported(alphabet) {
  if (!alphabet) {
    return false;
  }
  if (alphabet.id === "music-notes") {
    return false;
  }
  return getWordRowsForAlphabet(alphabet).length > 0;
}

function isSyllableModeSupported(alphabet) {
  return Boolean(alphabet && alphabet.id === "hangul");
}

function getPracticeModeForAlphabet(alphabet) {
  if (!alphabet) {
    return PRACTICE_MODE_SYMBOLS;
  }
  const stored = state.practiceModeMap?.[alphabet.id];
  if (stored === PRACTICE_MODE_WORDS && isWordModeSupported(alphabet)) {
    return PRACTICE_MODE_WORDS;
  }
  if (stored === PRACTICE_MODE_SYLLABLES && isSyllableModeSupported(alphabet)) {
    return PRACTICE_MODE_SYLLABLES;
  }
  return PRACTICE_MODE_SYMBOLS;
}

function isWordPracticeModeForAlphabet(alphabet) {
  return getPracticeModeForAlphabet(alphabet) === PRACTICE_MODE_WORDS;
}

function isSyllablePracticeModeForAlphabet(alphabet) {
  return getPracticeModeForAlphabet(alphabet) === PRACTICE_MODE_SYLLABLES;
}

function isWordPrompt(prompt) {
  const id = String(prompt?.baseId || prompt?.id || "");
  return id.startsWith("word:");
}

function getCurrentPracticeModeNamespace() {
  const alphabet = getSelectedAlphabet();
  if (isWordPracticeModeForAlphabet(alphabet)) {
    return PRACTICE_MODE_WORDS;
  }
  if (isSyllablePracticeModeForAlphabet(alphabet)) {
    return PRACTICE_MODE_SYLLABLES;
  }
  return PRACTICE_MODE_SYMBOLS;
}

function toUpperVariant(value) {
  return value.toLocaleUpperCase();
}

function updateEnabledSymbol(symbolId, enabled) {
  const alphabet = getSelectedAlphabet();
  if (!alphabet) {
    return;
  }

  const nextSet = new Set(state.enabledMap[alphabet.id]);
  if (enabled) {
    nextSet.add(symbolId);
  } else {
    nextSet.delete(symbolId);
  }

  state.enabledMap[alphabet.id] = [...nextSet];
  saveEnabledMap();

  reshufflePromptCollection();

  render();
}

function submitResult(correct, expectedAnswer) {
  clearFeedbackTimer();
  clearSuccessFeedbackTimer();
  state.awaitingManualContinue = false;

  if (correct) {
    state.selectedWrongSymbolId = null;
    const stats = getCurrentStats();
    stats.right += 1;
    setCurrentStats(stats);
    setFeedback("right", "success");
    flashPromptSuccess();
    renderStats();
    state.currentPromptId = null;
    scheduleNextPrompt(220);
    scheduleSuccessFeedbackClear(2400);
  } else {
    const stats = getCurrentStats();
    stats.wrong += 1;
    setCurrentStats(stats);
    bumpMissForCurrentPrompt();
    flashPromptFailure();
    state.revealedCorrectSymbolId =
      state.direction === "latinToForeign" && getCurrentPrompt() ? getCurrentPrompt().id : null;
    setFeedback(`correct answer: ${expectedAnswer}`, "error");
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

  const rawAnswer = refs.latinInput.value.trim().toLowerCase();
  const answer = Array.isArray(prompt.acceptedAnswers) ? normalizeNoteAnswer(rawAnswer) : rawAnswer;
  const shouldForceSubmit = forceSubmit || shouldAutoSubmitByLength(prompt, answer);

  if (!answer && !shouldForceSubmit) {
    return;
  }

  if (isAcceptedLatinAnswer(prompt, answer)) {
    submitResult(true, prompt.latin);
    return;
  }

  if (shouldForceSubmit) {
    submitResult(false, getExpectedLatinAnswer(prompt));
  }
}

function shouldAutoSubmitByLength(prompt, answer) {
  if (!answer) {
    return false;
  }
  const targetLength = getAutoSubmitTargetLength(prompt);
  if (!Number.isFinite(targetLength) || targetLength <= 0) {
    return false;
  }
  return answer.length >= targetLength;
}

function getAutoSubmitTargetLength(prompt) {
  if (Array.isArray(prompt.acceptedAnswers) && prompt.acceptedAnswers.length > 0) {
    const normalized = prompt.acceptedAnswers
      .map((entry) => normalizeNoteAnswer(entry))
      .filter(Boolean);
    if (normalized.length === 0) {
      return 0;
    }
    return Math.min(...normalized.map((entry) => entry.length));
  }
  return String(prompt.latin || "")
    .trim()
    .toLowerCase().length;
}

function reshufflePromptCollection() {
  state.promptQueue = [];
  state.currentPromptId = null;
  state.currentPromptFontId = FONT_OPTION_DEFAULT_ID;
  state.lastPromptId = null;
  nextPrompt();
}

function normalizeNoteAnswer(raw) {
  return raw
    .trim()
    .toLowerCase()
    .replaceAll("♯", "#")
    .replaceAll("♭", "b")
    .replaceAll("♮", "n")
    .replaceAll(/\s+/g, "")
    .replaceAll(/[0-9]/g, "");
}

function noteNameToPitchClass(raw) {
  const value = normalizeNoteAnswer(raw);
  // Accept German-style H as B.
  // Supported forms: c, c#, db, bb, b#, cb, h, hb, etc.
  const match = value.match(/^([a-gh])([#bn]|b)?$/);
  if (!match) {
    return null;
  }

  const letter = match[1];
  const accidental = match[2] || "";
  const baseByLetter = {
    c: 0,
    d: 2,
    e: 4,
    f: 5,
    g: 7,
    a: 9,
    b: 11,
    h: 11,
  };
  const base = baseByLetter[letter];
  if (typeof base !== "number") {
    return null;
  }

  const delta = accidental === "#" ? 1 : accidental === "b" ? -1 : 0;
  return (base + delta + 12) % 12;
}

function isAcceptedLatinAnswer(prompt, answer) {
  if (!answer) {
    return false;
  }
  const baseId = String(prompt?.baseId || prompt?.id || "");
  if (baseId.startsWith("word:hangul:") || baseId.startsWith("syllable:hangul:")) {
    return normalizeHangulLatinAnswer(answer) === normalizeHangulLatinAnswer(prompt.latin);
  }
  if (Array.isArray(prompt.acceptedAnswers) && prompt.acceptedAnswers.length > 0) {
    const answerPitchClass = noteNameToPitchClass(answer);
    if (typeof answerPitchClass === "number") {
      for (const entry of prompt.acceptedAnswers) {
        const pitchClass = noteNameToPitchClass(entry);
        if (pitchClass === answerPitchClass) {
          return true;
        }
      }
    }
    const normalizedAccepted = prompt.acceptedAnswers.map((entry) => normalizeNoteAnswer(entry));
    return normalizedAccepted.includes(normalizeNoteAnswer(answer));
  }
  return answer === prompt.latin;
}

function getExpectedLatinAnswer(prompt) {
  if (Array.isArray(prompt.acceptedAnswers) && prompt.acceptedAnswers.length > 0) {
    return prompt.acceptedAnswers.join(" or ");
  }
  if (isWordPrompt(prompt) && prompt.caseMode === "upper") {
    return toUpperVariant(String(prompt.latin || ""));
  }
  return String(prompt.latin || "");
}

function ensureMusicMarkup(symbol) {
  if (!symbol?.music) {
    return "";
  }
  if (symbol.foreignMarkup && symbol.musicRenderVersion === MUSIC_RENDER_VERSION) {
    return symbol.foreignMarkup;
  }
  symbol.musicRenderVersion = MUSIC_RENDER_VERSION;
  const abcjs = getAbcjs();
  if (!abcjs || typeof abcjs.renderAbc !== "function") {
    symbol.foreignMarkup = `<span>${escapeHtml(symbol.latin)}</span>`;
    return symbol.foreignMarkup;
  }

  if (!musicRenderHost) {
    musicRenderHost = document.createElement("div");
    musicRenderHost.style.position = "absolute";
    musicRenderHost.style.left = "-9999px";
    musicRenderHost.style.top = "-9999px";
    musicRenderHost.style.width = "1px";
    musicRenderHost.style.height = "1px";
    musicRenderHost.style.overflow = "hidden";
    document.body.appendChild(musicRenderHost);
  }

  musicRenderHost.innerHTML = "";
  try {
    abcjs.renderAbc(musicRenderHost, symbol.music.abc, {
      add_classes: false,
      staffwidth: 170,
      scale: 0.9,
      paddingleft: 0,
      paddingright: 0,
      paddingtop: 0,
      paddingbottom: 0,
      responsive: "resize",
    });
  } catch {
    symbol.foreignMarkup = `<span>${escapeHtml(symbol.latin)}</span>`;
    return symbol.foreignMarkup;
  }

  const svg = musicRenderHost.querySelector("svg");
  if (!svg) {
    symbol.foreignMarkup = `<span>${escapeHtml(symbol.latin)}</span>`;
    return symbol.foreignMarkup;
  }
  svg.classList.add("note-svg");
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", "musical note");
  // Let ABCJS manage its own viewBox/metrics; we size with CSS for stability.
  // Nudge content horizontally so it *looks* centered (ABCJS can leave asymmetric whitespace).
  try {
    const viewBox = svg.getAttribute("viewBox");
    const contentGroup = svg.querySelector("g");
    if (viewBox && contentGroup) {
      const [vbX, vbY, vbW] = viewBox.split(/\s+/).map((value) => Number(value));
      if (Number.isFinite(vbX) && Number.isFinite(vbY) && Number.isFinite(vbW) && vbW > 0) {
        const bbox = contentGroup.getBBox();
        if (bbox.width > 0) {
          const targetCenter = vbX + vbW / 2;
          const contentCenter = bbox.x + bbox.width / 2;
          let dx = targetCenter - contentCenter;
          dx = Math.max(-80, Math.min(80, dx));
          if (Math.abs(dx) > 0.5) {
            const existing = contentGroup.getAttribute("transform") || "";
            contentGroup.setAttribute("transform", `translate(${dx.toFixed(2)} 0) ${existing}`.trim());
          }
        }
      }
    }
  } catch {
    // Ignore bbox/measurement failures.
  }
  svg.removeAttribute("width");
  svg.removeAttribute("height");
  svg.setAttribute("style", "display:block;margin:0 auto;");
  symbol.foreignMarkup = `<div class="music-svg-wrap">${svg.outerHTML}</div>`;
  return symbol.foreignMarkup;
}

function scheduleMusicPreviewHydration() {
  const alphabet = getSelectedAlphabet();
  if (alphabet?.id !== "music-notes") {
    return;
  }

  // Only hydrate when the relevant UI is visible; rendering dozens of SVGs can hang slower devices.
  const cheatOpen = Boolean(refs.cheatDialog?.open || refs.cheatDialog?.hasAttribute("open"));
  const settingsOpen = Boolean(refs.settingsDialog?.open || refs.settingsDialog?.hasAttribute("open"));
  if (!settingsOpen && !cheatOpen) {
    return;
  }

  if (musicHydrationScheduled) {
    return;
  }
  musicHydrationScheduled = true;
  const idle = window.requestIdleCallback || ((cb) => window.setTimeout(() => cb({ timeRemaining: () => 0 }), 30));
  idle(() => {
    musicHydrationScheduled = false;
    try {
      const remaining = hydrateMusicPreviews(10);
      if (remaining > 0) {
        scheduleMusicPreviewHydration();
      }
    } catch {
      // Never let preview hydration crash the app.
    }
  });
}

function hydrateMusicPreviews(batchSize) {
  const alphabet = getSelectedAlphabet();
  if (alphabet?.id !== "music-notes" || !alphabet.symbolById) {
    return 0;
  }
  const placeholders = [...document.querySelectorAll(".music-preview")].filter((el) => el.childNodes.length === 0);
  for (const el of placeholders.slice(0, batchSize)) {
    const symbolId = el.getAttribute("data-music-id");
    const symbol = alphabet.symbolById[symbolId];
    if (!symbol) {
      continue;
    }
    el.innerHTML = ensureMusicMarkup(symbol);
  }
  return Math.max(0, placeholders.length - batchSize);
}

function focusLatinInput() {
  window.requestAnimationFrame(() => {
    refs.latinInput.focus();
    if (state.awaitingManualContinue) {
      refs.latinInput.setSelectionRange(0, refs.latinInput.value.length);
    } else {
      refs.latinInput.select();
    }
  });
}

function midiToLabel(midi) {
  const names = ["c", "c#", "d", "d#", "e", "f", "f#", "g", "g#", "a", "a#", "b"];
  const pitchClass = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;
  return `${names[pitchClass]}${octave}`;
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
    if (!Array.isArray(state.enabledMap[alphabet.id])) {
      if (alphabet.id === "cyrillic") {
        state.enabledMap[alphabet.id] = getDefaultEnabledCyrillicIds(state.cyrillicVariant);
      } else {
        state.enabledMap[alphabet.id] = alphabet.symbols
          .filter((symbol) => symbol.enabledByDefault)
          .map((symbol) => symbol.id);
      }
    } else {
      const validIds = new Set(alphabet.symbols.map((symbol) => symbol.id));
      state.enabledMap[alphabet.id] = state.enabledMap[alphabet.id].filter((id) => validIds.has(id));
    }
  }

  saveEnabledMap();
}

function ensureMusicPitchRangeMapShape() {
  if (!state.musicPitchRangeMap || typeof state.musicPitchRangeMap !== "object") {
    state.musicPitchRangeMap = {};
  }
  const music = alphabetById["music-notes"];
  if (!music?.musicMeta) {
    return;
  }
  const next = getMusicPitchRangeForAlphabet(music);
  state.musicPitchRangeMap[music.id] = next;
  saveMusicPitchRangeMap();
}

function ensurePromptFontMapsShape() {
  if (!state.promptFontMap || typeof state.promptFontMap !== "object") {
    state.promptFontMap = {};
  }
  if (!state.randomFontMap || typeof state.randomFontMap !== "object") {
    state.randomFontMap = {};
  }

  for (const alphabet of ALPHABETS) {
    if (!supportsPromptFontSettings(alphabet)) {
      continue;
    }
    const options = getPromptFontOptionsForAlphabet(alphabet);
    const storedFontId = state.promptFontMap[alphabet.id];
    if (!options.some((option) => option.id === storedFontId)) {
      state.promptFontMap[alphabet.id] = FONT_OPTION_DEFAULT_ID;
    }
    state.randomFontMap[alphabet.id] = Boolean(state.randomFontMap[alphabet.id]);
  }

  savePromptFontMap();
  saveRandomFontMap();
}

function ensurePracticeModeMapShape() {
  if (!state.practiceModeMap || typeof state.practiceModeMap !== "object") {
    state.practiceModeMap = {};
  }

  for (const alphabet of ALPHABETS) {
    const stored = state.practiceModeMap[alphabet.id];
    const canUseWords = isWordModeSupported(alphabet);
    const canUseSyllables = isSyllableModeSupported(alphabet);
    if (stored === PRACTICE_MODE_WORDS && canUseWords) {
      continue;
    }
    if (stored === PRACTICE_MODE_SYLLABLES && canUseSyllables) {
      continue;
    }
    state.practiceModeMap[alphabet.id] = PRACTICE_MODE_SYMBOLS;
  }

  savePracticeModeMap();
}

function getPromptHint(prompt, alphabet) {
  if (alphabet && isWordPracticeModeForAlphabet(alphabet)) {
    return "type the latin transliteration";
  }
  if (alphabet && isSyllablePracticeModeForAlphabet(alphabet)) {
    return "type the latin syllable";
  }
  if (state.direction === "foreignToLatin") {
    if (alphabet?.id === "music-notes") {
      return "type the note name (c, c#, db, bb)";
    }
    return "type the latin reading below";
  }

  if (alphabet?.hasCase && prompt?.caseLabel) {
    return `pick the matching ${prompt.caseLabel} symbol`;
  }

  return "pick the matching symbol";
}

function getCurrentStats() {
  const alphabet = getSelectedAlphabet();
  if (!alphabet) {
    return { right: 0, wrong: 0 };
  }
  const mode = getCurrentPracticeModeNamespace();
  return state.statsMap?.[mode]?.[alphabet.id] || { right: 0, wrong: 0 };
}

function setCurrentStats(stats) {
  const alphabet = getSelectedAlphabet();
  if (!alphabet) {
    return;
  }
  const mode = getCurrentPracticeModeNamespace();
  if (!state.statsMap[mode]) {
    state.statsMap[mode] = {};
  }
  state.statsMap[mode][alphabet.id] = stats;
  saveStatsMap();
}

function getMissedFocusForAlphabet(alphabet) {
  return Boolean(state.missedFocusMap[alphabet.id]);
}

function getMissCountForBaseId(baseId) {
  const alphabet = getSelectedAlphabet();
  if (!alphabet) {
    return 0;
  }
  const mode = getCurrentPracticeModeNamespace();
  return state.missesMap?.[mode]?.[alphabet.id]?.[baseId] || 0;
}

function bumpMissForCurrentPrompt() {
  const alphabet = getSelectedAlphabet();
  const prompt = getCurrentPrompt();
  if (!alphabet || !prompt) {
    return;
  }
  const mode = getCurrentPracticeModeNamespace();
  const baseId = prompt.baseId || prompt.id;
  if (!state.missesMap[mode]) {
    state.missesMap[mode] = {};
  }
  if (!state.missesMap[mode][alphabet.id]) {
    state.missesMap[mode][alphabet.id] = {};
  }
  state.missesMap[mode][alphabet.id][baseId] = (state.missesMap[mode][alphabet.id][baseId] || 0) + 1;
  saveMissesMap();
}

function getWeightedPromptPool(pool) {
  const alphabet = getSelectedAlphabet();
  if (!alphabet || !getMissedFocusForAlphabet(alphabet)) {
    return pool;
  }

  const weighted = [];
  for (const symbol of pool) {
    weighted.push(symbol);
    const missCount = Math.min(2, getMissCountForBaseId(symbol.baseId || symbol.id));
    for (let index = 0; index < missCount; index += 1) {
      weighted.push(symbol);
    }
  }
  return weighted;
}

function applyTheme(theme) {
  refs.root.dataset.theme = theme;
  refs.body.dataset.theme = theme;
  if (refs.themeColorMeta) {
    refs.themeColorMeta.setAttribute("content", theme === "dark" ? "#17284b" : "#efe6d4");
  }
  refs.themeToggle.textContent =
    theme === "dark"
      ? "dark, but you can switch"
      : "light, but you can switch";
}

async function loadWordLists() {
  try {
    const response = await fetch("./data/word-lists.json");
    if (!response.ok) {
      return EMPTY_WORD_LISTS;
    }
    const parsed = await response.json();
    return normalizeWordLists(parsed);
  } catch {
    return EMPTY_WORD_LISTS;
  }
}

function normalizeWordLists(payload) {
  if (!payload || typeof payload !== "object") {
    return EMPTY_WORD_LISTS;
  }
  const byAlphabet = payload.byAlphabet && typeof payload.byAlphabet === "object"
    ? payload.byAlphabet
    : {};
  const normalized = {
    version: EMPTY_WORD_LISTS.version,
    byAlphabet: {
      hiragana: [],
      katakana: [],
      armenian: [],
      hangul: [],
      arabic: [],
      hebrew: [],
      syriac: [],
      cherokee: [],
      greek: [],
      georgian: [],
      cyrillic: {
        russian: [],
        ukrainian: [],
        belarusian: [],
        bulgarian: [],
        serbian: [],
        macedonian: [],
      },
    },
  };
  normalized.version = String(payload.version || EMPTY_WORD_LISTS.version);

  for (const alphabetId of Object.keys(normalized.byAlphabet)) {
    if (alphabetId === "cyrillic") {
      const source = byAlphabet.cyrillic && typeof byAlphabet.cyrillic === "object" ? byAlphabet.cyrillic : {};
      for (const variant of CYRILLIC_VARIANTS) {
        normalized.byAlphabet.cyrillic[variant] = normalizeWordRows(source[variant]);
      }
      continue;
    }
    normalized.byAlphabet[alphabetId] = normalizeWordRows(byAlphabet[alphabetId]);
  }
  return normalized;
}

function normalizeWordRows(rows) {
  if (!Array.isArray(rows)) {
    return [];
  }
  return rows
    .map((row) => ({
      foreign: String(row?.foreign || "").trim(),
      latin: String(row?.latin || "").trim().toLocaleLowerCase(),
      source: String(row?.source || ""),
    }))
    .filter((row) => row.foreign && row.latin);
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

function loadCyrillicVariant() {
  const stored = localStorage.getItem(STORAGE_KEYS.cyrillicVariant);
  return isValidCyrillicVariant(stored) ? stored : "russian";
}

function isValidCyrillicVariant(value) {
  return (
    value === "russian" ||
    value === "ukrainian" ||
    value === "belarusian" ||
    value === "bulgarian" ||
    value === "serbian" ||
    value === "macedonian" ||
    value === "all"
  );
}

function getDefaultEnabledCyrillicIds(variant) {
  const alphabet = alphabetById.cyrillic;
  if (!alphabet || !Array.isArray(alphabet.symbols)) {
    return [];
  }
  if (variant === "all") {
    return alphabet.symbols.map((symbol) => symbol.id);
  }

  const letters = new Set();
  if (variant === "russian") {
    "абвгдеёжзийклмнопрстуфхцчшщъыьэюя".split("").forEach((letter) => letters.add(letter));
  } else if (variant === "ukrainian") {
    "абвгґдеєжзиіїйклмнопрстуфхцчшщьюя".split("").forEach((letter) => letters.add(letter));
  } else if (variant === "belarusian") {
    "абвгдеёжзійклмнопрстуўфхцчшыьэюя".split("").forEach((letter) => letters.add(letter));
  } else if (variant === "bulgarian") {
    "абвгдежзийклмнопрстуфхцчшщъьюя".split("").forEach((letter) => letters.add(letter));
  } else if (variant === "serbian") {
    "абвгдђежзијклљмнњопрстћуфхцчџш".split("").forEach((letter) => letters.add(letter));
  } else if (variant === "macedonian") {
    "абвгдѓежзѕијклљмнњопрстќуфхцчџш".split("").forEach((letter) => letters.add(letter));
  }

  return alphabet.symbols
    .filter((symbol) => letters.has(symbol.foreign))
    .map((symbol) => symbol.id);
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

function loadMusicPitchRangeMap() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEYS.musicPitchRangeMap) || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveMusicPitchRangeMap() {
  try {
    localStorage.setItem(STORAGE_KEYS.musicPitchRangeMap, JSON.stringify(state.musicPitchRangeMap));
  } catch {
    // ignore
  }
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

function loadPromptFontMap() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEYS.promptFontMap) || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function savePromptFontMap() {
  localStorage.setItem(STORAGE_KEYS.promptFontMap, JSON.stringify(state.promptFontMap));
}

function loadRandomFontMap() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEYS.randomFontMap) || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveRandomFontMap() {
  localStorage.setItem(STORAGE_KEYS.randomFontMap, JSON.stringify(state.randomFontMap));
}

function loadPracticeModeMap() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEYS.practiceModeMap) || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function savePracticeModeMap() {
  localStorage.setItem(STORAGE_KEYS.practiceModeMap, JSON.stringify(state.practiceModeMap));
}

function loadStatsMap() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEYS.statsMap) || "{}");
    const legacy = parsed && typeof parsed === "object" ? parsed : {};
    const namespaced = {
      [PRACTICE_MODE_SYMBOLS]: {},
      [PRACTICE_MODE_SYLLABLES]: {},
      [PRACTICE_MODE_WORDS]: {},
    };

    const hasNamespacedShape =
      legacy &&
      typeof legacy[PRACTICE_MODE_SYMBOLS] === "object" &&
      typeof legacy[PRACTICE_MODE_WORDS] === "object";

    for (const alphabet of ALPHABETS) {
      const symbolItem = hasNamespacedShape
        ? legacy[PRACTICE_MODE_SYMBOLS]?.[alphabet.id] || {}
        : legacy[alphabet.id] || {};
      const syllableItem = hasNamespacedShape
        ? legacy[PRACTICE_MODE_SYLLABLES]?.[alphabet.id] || {}
        : {};
      const wordItem = hasNamespacedShape
        ? legacy[PRACTICE_MODE_WORDS]?.[alphabet.id] || {}
        : {};
      namespaced[PRACTICE_MODE_SYMBOLS][alphabet.id] = {
        right: Number.isFinite(symbolItem.right) ? symbolItem.right : 0,
        wrong: Number.isFinite(symbolItem.wrong) ? symbolItem.wrong : 0,
      };
      namespaced[PRACTICE_MODE_SYLLABLES][alphabet.id] = {
        right: Number.isFinite(syllableItem.right) ? syllableItem.right : 0,
        wrong: Number.isFinite(syllableItem.wrong) ? syllableItem.wrong : 0,
      };
      namespaced[PRACTICE_MODE_WORDS][alphabet.id] = {
        right: Number.isFinite(wordItem.right) ? wordItem.right : 0,
        wrong: Number.isFinite(wordItem.wrong) ? wordItem.wrong : 0,
      };
    }
    return namespaced;
  } catch {
    return {
      [PRACTICE_MODE_SYMBOLS]: {},
      [PRACTICE_MODE_SYLLABLES]: {},
      [PRACTICE_MODE_WORDS]: {},
    };
  }
}

function saveStatsMap() {
  localStorage.setItem(STORAGE_KEYS.statsMap, JSON.stringify(state.statsMap));
}

function resetStatsState() {
  const alphabet = getSelectedAlphabet();
  if (!alphabet) {
    return;
  }
  const mode = getCurrentPracticeModeNamespace();
  if (!state.statsMap[mode]) {
    state.statsMap[mode] = {};
  }
  if (!state.missesMap[mode]) {
    state.missesMap[mode] = {};
  }
  state.statsMap[mode][alphabet.id] = { right: 0, wrong: 0 };
  state.missesMap[mode][alphabet.id] = {};
  saveStatsMap();
  saveMissesMap();
}

function loadMissesMap() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEYS.missesMap) || "{}");
    const legacy = parsed && typeof parsed === "object" ? parsed : {};
    const namespaced = {
      [PRACTICE_MODE_SYMBOLS]: {},
      [PRACTICE_MODE_SYLLABLES]: {},
      [PRACTICE_MODE_WORDS]: {},
    };
    const hasNamespacedShape =
      legacy &&
      typeof legacy[PRACTICE_MODE_SYMBOLS] === "object" &&
      typeof legacy[PRACTICE_MODE_WORDS] === "object";

    for (const alphabet of ALPHABETS) {
      namespaced[PRACTICE_MODE_SYMBOLS][alphabet.id] = hasNamespacedShape
        ? { ...(legacy[PRACTICE_MODE_SYMBOLS]?.[alphabet.id] || {}) }
        : { ...(legacy[alphabet.id] || {}) };
      namespaced[PRACTICE_MODE_SYLLABLES][alphabet.id] = hasNamespacedShape
        ? { ...(legacy[PRACTICE_MODE_SYLLABLES]?.[alphabet.id] || {}) }
        : {};
      namespaced[PRACTICE_MODE_WORDS][alphabet.id] = hasNamespacedShape
        ? { ...(legacy[PRACTICE_MODE_WORDS]?.[alphabet.id] || {}) }
        : {};
    }
    return namespaced;
  } catch {
    return {
      [PRACTICE_MODE_SYMBOLS]: {},
      [PRACTICE_MODE_SYLLABLES]: {},
      [PRACTICE_MODE_WORDS]: {},
    };
  }
}

function saveMissesMap() {
  localStorage.setItem(STORAGE_KEYS.missesMap, JSON.stringify(state.missesMap));
}

function loadMissedFocusMap() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.missedFocusMap) || "{}");
  } catch {
    return {};
  }
}

function saveMissedFocusMap() {
  localStorage.setItem(STORAGE_KEYS.missedFocusMap, JSON.stringify(state.missedFocusMap));
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
