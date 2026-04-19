#!/usr/bin/env python3
"""
Generate script-safe word lists for velhoksi word mode.

Outputs:
  data/word-lists.json
"""

from __future__ import annotations

import argparse
import json
import re
import unicodedata
import urllib.request
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Iterable, Iterator, List, Optional, Set, Tuple


APP_ROOT = Path(__file__).resolve().parents[1]
OUTPUT_PATH = APP_ROOT / "data" / "word-lists.json"
TARGET_SIZE = 500


CYRILLIC_VARIANT_LETTERS: Dict[str, str] = {
    "russian": "абвгдеёжзийклмнопрстуфхцчшщъыьэюя",
    "ukrainian": "абвгґдеєжзиіїйклмнопрстуфхцчшщьюя",
    "belarusian": "абвгдеёжзійклмнопрстуўфхцчшыьэюя",
    "bulgarian": "абвгдежзийклмнопрстуфхцчшщъьюя",
    "serbian": "абвгдђежзијклљмнњопрстћуфхцчџш",
    "macedonian": "абвгдѓежзѕијклљмнњопрстќуфхцчџш",
}


SYMBOL_MAPS: Dict[str, Dict[str, str]] = {
    "hiragana": {
        "あ": "a", "い": "i", "う": "u", "え": "e", "お": "o",
        "か": "ka", "き": "ki", "く": "ku", "け": "ke", "こ": "ko",
        "さ": "sa", "し": "shi", "す": "su", "せ": "se", "そ": "so",
        "た": "ta", "ち": "chi", "つ": "tsu", "て": "te", "と": "to",
        "な": "na", "に": "ni", "ぬ": "nu", "ね": "ne", "の": "no",
        "は": "ha", "ひ": "hi", "ふ": "fu", "へ": "he", "ほ": "ho",
        "ま": "ma", "み": "mi", "む": "mu", "め": "me", "も": "mo",
        "や": "ya", "ゆ": "yu", "よ": "yo",
        "ら": "ra", "り": "ri", "る": "ru", "れ": "re", "ろ": "ro",
        "わ": "wa", "を": "wo", "ん": "n",
    },
    "katakana": {
        "ア": "a", "イ": "i", "ウ": "u", "エ": "e", "オ": "o",
        "カ": "ka", "キ": "ki", "ク": "ku", "ケ": "ke", "コ": "ko",
        "サ": "sa", "シ": "shi", "ス": "su", "セ": "se", "ソ": "so",
        "タ": "ta", "チ": "chi", "ツ": "tsu", "テ": "te", "ト": "to",
        "ナ": "na", "ニ": "ni", "ヌ": "nu", "ネ": "ne", "ノ": "no",
        "ハ": "ha", "ヒ": "hi", "フ": "fu", "ヘ": "he", "ホ": "ho",
        "マ": "ma", "ミ": "mi", "ム": "mu", "メ": "me", "モ": "mo",
        "ヤ": "ya", "ユ": "yu", "ヨ": "yo",
        "ラ": "ra", "リ": "ri", "ル": "ru", "レ": "re", "ロ": "ro",
        "ワ": "wa", "ヲ": "wo", "ン": "n",
    },
    "armenian": {
        "ա": "a", "բ": "b", "գ": "g", "դ": "d", "ե": "e",
        "զ": "z", "է": "ee", "ը": "uh", "թ": "t'", "ժ": "zh",
        "ի": "i", "լ": "l", "խ": "kh", "ծ": "ts", "կ": "k",
        "հ": "h", "ձ": "dz", "ղ": "gh", "ճ": "ch", "մ": "m",
        "յ": "y", "ն": "n", "շ": "sh", "ո": "o", "չ": "ch'",
        "պ": "p", "ջ": "j", "ռ": "rr", "ս": "s", "վ": "v",
        "տ": "t", "ր": "r", "ց": "ts'", "ւ": "w", "փ": "p'",
        "ք": "k'", "օ": "o", "ֆ": "f",
    },
    "arabic": {
        "ا": "a", "ب": "b", "ت": "t", "ث": "th", "ج": "j",
        "ح": "h", "خ": "kh", "د": "d", "ذ": "dh", "ر": "r",
        "ز": "z", "س": "s", "ش": "sh", "ص": "s2", "ض": "d2",
        "ط": "t2", "ظ": "z2", "ع": "ayn", "غ": "gh", "ف": "f",
        "ق": "q", "ك": "k", "ل": "l", "م": "m", "ن": "n",
        "ه": "h", "و": "w", "ي": "y",
    },
    "hebrew": {
        "א": "alef", "ב": "b", "ג": "g", "ד": "d", "ה": "h",
        "ו": "v", "ז": "z", "ח": "kh", "ט": "t2", "י": "y",
        "כ": "k", "ל": "l", "מ": "m", "נ": "n", "ס": "s",
        "ע": "ayn", "פ": "p", "צ": "ts", "ק": "q", "ר": "r",
        "ש": "sh", "ת": "t",
    },
    "syriac": {
        "ܐ": "a", "ܒ": "b", "ܓ": "g", "ܕ": "d", "ܗ": "h",
        "ܘ": "w", "ܙ": "z", "ܚ": "h2", "ܛ": "t2", "ܝ": "y",
        "ܟ": "k", "ܠ": "l", "ܡ": "m", "ܢ": "n", "ܣ": "s",
        "ܥ": "ayn", "ܦ": "p", "ܨ": "s2", "ܩ": "q", "ܪ": "r",
        "ܫ": "sh", "ܬ": "t",
    },
    "cherokee": {
        "Ꭰ": "a", "Ꭱ": "e", "Ꭲ": "i", "Ꭳ": "o", "Ꭴ": "u", "Ꭵ": "v",
        "Ꭶ": "ga", "Ꭷ": "ka", "Ꭸ": "ge", "Ꭹ": "gi", "Ꭺ": "go", "Ꭻ": "gu", "Ꭼ": "gv",
        "Ꭽ": "ha", "Ꭾ": "he", "Ꭿ": "hi", "Ꮀ": "ho", "Ꮁ": "hu", "Ꮂ": "hv",
        "Ꮃ": "la", "Ꮄ": "le", "Ꮅ": "li", "Ꮆ": "lo", "Ꮇ": "lu", "Ꮈ": "lv",
        "Ꮉ": "ma", "Ꮊ": "me", "Ꮋ": "mi", "Ꮌ": "mo", "Ꮍ": "mu",
        "Ꮎ": "na", "Ꮏ": "hna", "Ꮐ": "nah", "Ꮑ": "ne", "Ꮒ": "ni", "Ꮓ": "no", "Ꮔ": "nu", "Ꮕ": "nv",
        "Ꮖ": "qua", "Ꮗ": "que", "Ꮘ": "qui", "Ꮙ": "quo", "Ꮚ": "quu", "Ꮛ": "quv",
        "Ꮜ": "sa", "Ꮝ": "s", "Ꮞ": "se", "Ꮟ": "si", "Ꮠ": "so", "Ꮡ": "su", "Ꮢ": "sv",
        "Ꮣ": "da", "Ꮤ": "ta", "Ꮥ": "de", "Ꮦ": "te", "Ꮧ": "di", "Ꮨ": "ti", "Ꮩ": "do", "Ꮪ": "du", "Ꮫ": "dv",
        "Ꮬ": "dla", "Ꮭ": "tla", "Ꮮ": "tle", "Ꮯ": "tli", "Ꮰ": "tlo", "Ꮱ": "tlu", "Ꮲ": "tlv",
        "Ꮳ": "tsa", "Ꮴ": "tse", "Ꮵ": "tsi", "Ꮶ": "tso", "Ꮷ": "tsu", "Ꮸ": "tsv",
        "Ꮹ": "wa", "Ꮺ": "we", "Ꮻ": "wi", "Ꮼ": "wo", "Ꮽ": "wu", "Ꮾ": "wv",
        "Ꮿ": "ya", "Ᏸ": "ye", "Ᏹ": "yi", "Ᏺ": "yo", "Ᏻ": "yu", "Ᏼ": "yv",
    },
    "greek": {
        "α": "a", "β": "b", "γ": "g", "δ": "d", "ε": "e",
        "ζ": "z", "η": "ee", "θ": "th", "ι": "i", "κ": "k",
        "λ": "l", "μ": "m", "ν": "n", "ξ": "x", "ο": "o",
        "π": "p", "ρ": "r", "σ": "s", "τ": "t", "υ": "u",
        "φ": "f", "χ": "kh", "ψ": "ps", "ω": "oo",
    },
    "georgian": {
        "ა": "a", "ბ": "b", "გ": "g", "დ": "d", "ე": "e",
        "ვ": "v", "ზ": "z", "თ": "th", "ი": "i", "კ": "k'",
        "ლ": "l", "მ": "m", "ნ": "n", "ო": "o", "პ": "p'",
        "ჟ": "zh", "რ": "r", "ს": "s", "ტ": "t", "უ": "u",
        "ფ": "p", "ქ": "k", "ღ": "gh", "ყ": "q'", "შ": "sh",
        "ჩ": "ch", "ც": "ts", "ძ": "dz", "წ": "ts'", "ჭ": "ch'",
        "ხ": "kh", "ჯ": "j", "ჰ": "h",
    },
}

SYMBOL_MAPS["cyrillic"] = {
    "а": "a", "б": "b", "в": "v", "г": "g", "д": "d",
    "е": "e", "ё": "yo", "ж": "zh", "з": "z", "и": "i",
    "й": "j", "к": "k", "л": "l", "м": "m", "н": "n",
    "о": "o", "п": "p", "р": "r", "с": "s", "т": "t",
    "у": "u", "ф": "f", "х": "kh", "ц": "ts", "ч": "ch",
    "ш": "sh", "щ": "shch", "ъ": "hard", "ы": "y", "ь": "soft",
    "э": "eh", "ю": "yu", "я": "ya",
    "і": "i", "ї": "yi", "є": "ye", "ґ": "g", "ў": "w",
    "ј": "j", "љ": "lj", "њ": "nj", "ђ": "dj", "ћ": "c",
    "џ": "dzh", "ѕ": "dz", "ѓ": "gj", "ќ": "kj",
}

CASED_ALPHABETS = {"armenian", "greek", "cyrillic"}
SYLLABARY_ALPHABETS = {"hiragana", "katakana", "cherokee", "syriac"}
ALPHABETS_MIN_LEN = {
    "default_alpha": 3,
    "default_syllabary": 2,
}

HANGUL_BASE = 0xAC00
HANGUL_LAST = 0xD7A3
HANGUL_L_COUNT = 19
HANGUL_V_COUNT = 21
HANGUL_T_COUNT = 28
HANGUL_N_COUNT = HANGUL_V_COUNT * HANGUL_T_COUNT
HANGUL_S_COUNT = HANGUL_L_COUNT * HANGUL_N_COUNT

# velhoksi-style hangul romanization:
# - designed to be easy to type, without diacritics
# - roughly follows common RR shapes, but keeps ㄹ as "r" and simple consonant mnemonics
HANGUL_INITIAL_ROMA = [
    "g", "kk", "n", "d", "tt", "r", "m", "b", "pp", "s", "ss", "", "j", "jj", "ch", "k", "t", "p", "h"
]
HANGUL_VOWEL_ROMA = [
    "a", "ae", "ya", "yae", "eo", "e", "yeo", "ye", "o", "wa", "wae", "oe", "yo",
    "u", "wo", "we", "wi", "yu", "eu", "ui", "i"
]
# Coda (받침) collapse (RR-ish). Used when no vowel-initial liaison applies.
HANGUL_CODA_ROMA = [
    "",    # (none)
    "k",   # ㄱ
    "k",   # ㄲ
    "k",   # ㄳ
    "n",   # ㄴ
    "n",   # ㄵ
    "n",   # ㄶ
    "t",   # ㄷ
    "l",   # ㄹ
    "k",   # ㄺ
    "m",   # ㄻ
    "p",   # ㄼ
    "t",   # ㄽ
    "t",   # ㄾ
    "p",   # ㄿ
    "l",   # ㅀ
    "m",   # ㅁ
    "p",   # ㅂ
    "p",   # ㅄ
    "t",   # ㅅ
    "t",   # ㅆ
    "ng",  # ㅇ
    "t",   # ㅈ
    "t",   # ㅊ
    "k",   # ㅋ
    "t",   # ㅌ
    "p",   # ㅍ
    "t",   # ㅎ
]

# Vowel-initial liaison when the next syllable starts with ㅇ.
HANGUL_LIAISON_ONSET_BY_T_INDEX = {
    1: "g",   # ㄱ
    2: "kk",  # ㄲ
    4: "n",   # ㄴ
    7: "d",   # ㄷ
    8: "r",   # ㄹ
    16: "m",  # ㅁ
    17: "b",  # ㅂ
    19: "s",  # ㅅ
    20: "ss", # ㅆ
    22: "j",  # ㅈ
    23: "ch", # ㅊ
    24: "k",  # ㅋ
    25: "t",  # ㅌ
    26: "p",  # ㅍ
    27: "h",  # ㅎ
}

# Composite codas: keep the first part as coda, move the second part to the next onset.
# A pragmatic subset for common learner words (e.g. 앉아=anja, 읽어=ilgeo, 없어=eopseo, 많은=manheun).
HANGUL_LIAISON_COMPOSITE: Dict[int, Tuple[str, str]] = {
    3: ("k", "s"),    # ㄳ
    5: ("n", "j"),    # ㄵ
    6: ("n", "h"),    # ㄶ
    9: ("l", "g"),    # ㄺ
    10: ("l", "m"),   # ㄻ
    11: ("l", "b"),   # ㄼ
    12: ("l", "s"),   # ㄽ
    13: ("l", "t"),   # ㄾ
    14: ("l", "p"),   # ㄿ
    15: ("l", "h"),   # ㅀ
    18: ("p", "s"),   # ㅄ
}

KAIKKI_PROPER_TAG_RE = re.compile(
    r"(proper|name|given-name|surname|abbrev|abbreviation|initialism|acronym)",
    re.IGNORECASE,
)
LONG_REPEAT_RE = re.compile(r"(.)\1{2,}")
GEORGIAN_VOWELS = set("აეიოუ")


@dataclass(frozen=True)
class SourceSpec:
    alphabet_id: str
    source_name: str
    kind: str  # frequency|kaikki
    url: str
    cyrillic_variant: Optional[str] = None


SOURCE_SPECS: List[SourceSpec] = [
    SourceSpec("hiragana", "frequencywords:ja_full", "frequency", "https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/ja/ja_full.txt"),
    SourceSpec("katakana", "frequencywords:ja_full", "frequency", "https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/ja/ja_full.txt"),
    SourceSpec("armenian", "frequencywords:hy_full", "frequency", "https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/hy/hy_full.txt"),
    SourceSpec("greek", "frequencywords:el_50k", "frequency", "https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/el/el_50k.txt"),
    SourceSpec("hangul", "frequencywords:ko_50k", "frequency", "https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/ko/ko_50k.txt"),
    SourceSpec("arabic", "frequencywords:ar_50k", "frequency", "https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/ar/ar_50k.txt"),
    SourceSpec("hebrew", "frequencywords:he_50k", "frequency", "https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/he/he_50k.txt"),
    SourceSpec("georgian", "kaikki:georgian", "kaikki", "https://kaikki.org/dictionary/Georgian/kaikki.org-dictionary-Georgian.jsonl"),
    SourceSpec("cherokee", "kaikki:cherokee", "kaikki", "https://kaikki.org/dictionary/Cherokee/kaikki.org-dictionary-Cherokee.jsonl"),
    SourceSpec("syriac", "kaikki:classical-syriac", "kaikki", "https://kaikki.org/dictionary/Classical%20Syriac/kaikki.org-dictionary-ClassicalSyriac.jsonl"),
    SourceSpec("cyrillic", "frequencywords:ru_50k", "frequency", "https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/ru/ru_50k.txt", cyrillic_variant="russian"),
    SourceSpec("cyrillic", "frequencywords:uk_50k", "frequency", "https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/uk/uk_50k.txt", cyrillic_variant="ukrainian"),
    SourceSpec("cyrillic", "kaikki:belarusian", "kaikki", "https://kaikki.org/dictionary/Belarusian/kaikki.org-dictionary-Belarusian.jsonl", cyrillic_variant="belarusian"),
    SourceSpec("cyrillic", "frequencywords:bg_50k", "frequency", "https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/bg/bg_50k.txt", cyrillic_variant="bulgarian"),
    SourceSpec("cyrillic", "kaikki:serbo-croatian", "kaikki", "https://kaikki.org/dictionary/Serbo-Croatian/kaikki.org-dictionary-SerboCroatian.jsonl", cyrillic_variant="serbian"),
    SourceSpec("cyrillic", "frequencywords:mk_50k", "frequency", "https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/mk/mk_50k.txt", cyrillic_variant="macedonian"),
]


def normalize_token(token: str, *, lower: bool) -> str:
    value = token.strip()
    if lower:
        value = value.lower()
    value = unicodedata.normalize("NFD", value)
    value = "".join(ch for ch in value if unicodedata.category(ch) != "Mn")
    return unicodedata.normalize("NFC", value)


def is_strict_script_word(token: str, alphabet_chars: Set[str], min_len: int) -> bool:
    if len(token) < min_len:
        return False
    if any(ch.isspace() for ch in token):
        return False
    if any(ch.isdigit() for ch in token):
        return False
    return all(ch in alphabet_chars for ch in token)


def transliterate(token: str, symbol_map: Dict[str, str]) -> Optional[str]:
    parts: List[str] = []
    for ch in token:
        latin = symbol_map.get(ch)
        if not latin:
            return None
        parts.append(latin)
    return "".join(parts)


def is_noisy_repetition(token: str) -> bool:
    if not token:
        return True
    if len(set(token)) == 1:
        return True
    if LONG_REPEAT_RE.search(token):
        return True
    return False


def has_usable_latin_shape(latin: str, alphabet_id: str) -> bool:
    if not latin:
        return False
    if len(latin) < 2:
        return False
    # For abjads/abugida-like drill sets in this app, a transliteration with no vowels
    # becomes too opaque to type reliably from memory.
    if alphabet_id in {"arabic", "hebrew", "syriac"}:
        if not re.search(r"[aeiou]", latin):
            return False
    return True


def has_required_script_signals(token: str, alphabet_id: str) -> bool:
    if alphabet_id == "georgian":
        vowel_count = sum(1 for ch in token if ch in GEORGIAN_VOWELS)
        if vowel_count == 0:
            return False
        # Georgian subtitle frequency data can contain OCR/noise-like consonant clusters.
        # Require a minimum vowel ratio to keep practical learner words.
        return (vowel_count / len(token)) >= 0.25
    return True


def iter_frequency_words(url: str) -> Iterator[str]:
    with urllib.request.urlopen(url, timeout=120) as resp:
        for raw in resp:
            line = raw.decode("utf-8", errors="ignore").strip()
            if not line:
                continue
            token = line.split(" ", 1)[0]
            if token:
                yield token


def is_kaikki_name_like(entry: dict) -> bool:
    pos = str(entry.get("pos") or "")
    if KAIKKI_PROPER_TAG_RE.search(pos):
        return True

    for field in ("tags", "raw_tags"):
        values = entry.get(field)
        if isinstance(values, list):
            text = " ".join(str(item) for item in values)
            if KAIKKI_PROPER_TAG_RE.search(text):
                return True

    categories = entry.get("categories")
    if isinstance(categories, list):
        for cat in categories:
            if isinstance(cat, dict):
                name = str(cat.get("name") or "")
            else:
                name = str(cat)
            if KAIKKI_PROPER_TAG_RE.search(name):
                return True
    return False


def iter_kaikki_words(url: str) -> Iterator[Tuple[str, dict]]:
    with urllib.request.urlopen(url, timeout=180) as resp:
        for raw in resp:
            try:
                obj = json.loads(raw)
            except json.JSONDecodeError:
                continue
            word = obj.get("word")
            if isinstance(word, str) and word.strip():
                yield word, obj


def min_len_for_alphabet(alphabet_id: str) -> int:
    if alphabet_id == "hangul":
        return 2
    if alphabet_id in SYLLABARY_ALPHABETS:
        return ALPHABETS_MIN_LEN["default_syllabary"]
    return ALPHABETS_MIN_LEN["default_alpha"]


def is_hangul_syllable(ch: str) -> bool:
    if len(ch) != 1:
        return False
    code = ord(ch)
    return HANGUL_BASE <= code <= HANGUL_LAST


def iter_hangul_syllables() -> Iterator[str]:
    for code in range(HANGUL_BASE, HANGUL_LAST + 1):
        yield chr(code)


def get_alphabet_charset(alphabet_id: str, cyrillic_variant: Optional[str]) -> Set[str]:
    if alphabet_id == "cyrillic":
        if not cyrillic_variant:
            raise ValueError("cyrillic variant required")
        return set(CYRILLIC_VARIANT_LETTERS[cyrillic_variant])
    if alphabet_id == "hangul":
        return set(iter_hangul_syllables())
    return set(SYMBOL_MAPS[alphabet_id].keys())


def transliterate_hangul(token: str) -> Optional[str]:
    syllables: List[Tuple[int, int, int]] = []
    for ch in token:
        if not is_hangul_syllable(ch):
            return None
        s_index = ord(ch) - HANGUL_BASE
        if s_index < 0 or s_index >= HANGUL_S_COUNT:
            return None
        l_index = s_index // HANGUL_N_COUNT
        v_index = (s_index % HANGUL_N_COUNT) // HANGUL_T_COUNT
        t_index = s_index % HANGUL_T_COUNT
        syllables.append((l_index, v_index, t_index))

    parts: List[str] = []
    pending_onset = ""
    for idx, (l_index, v_index, t_index) in enumerate(syllables):
        onset = pending_onset
        pending_onset = ""
        if not onset:
            onset = HANGUL_INITIAL_ROMA[l_index]

        vowel = HANGUL_VOWEL_ROMA[v_index]

        next_starts_with_ieung = False
        if idx + 1 < len(syllables):
            next_l, _, _ = syllables[idx + 1]
            next_starts_with_ieung = next_l == 11  # ㅇ

        if t_index != 0 and next_starts_with_ieung:
            composite = HANGUL_LIAISON_COMPOSITE.get(t_index)
            if composite:
                keep_coda, moved_onset = composite
                parts.append(f"{onset}{vowel}{keep_coda}")
                pending_onset = moved_onset
                continue
            moved = HANGUL_LIAISON_ONSET_BY_T_INDEX.get(t_index)
            if moved:
                parts.append(f"{onset}{vowel}")
                pending_onset = moved
                continue

        coda = HANGUL_CODA_ROMA[t_index]
        parts.append(f"{onset}{vowel}{coda}")
    return "".join(parts)


def collect_from_source(spec: SourceSpec) -> List[dict]:
    alphabet_id = spec.alphabet_id
    lower = alphabet_id in CASED_ALPHABETS or alphabet_id == "cyrillic"
    symbol_map = None
    if alphabet_id not in {"hangul"}:
        symbol_map = SYMBOL_MAPS["cyrillic"] if alphabet_id == "cyrillic" else SYMBOL_MAPS[alphabet_id]
    charset = get_alphabet_charset(alphabet_id, spec.cyrillic_variant)
    min_len = min_len_for_alphabet(alphabet_id)

    seen: Set[str] = set()
    result: List[dict] = []

    if spec.kind == "frequency":
        iterator: Iterable = ((token, None) for token in iter_frequency_words(spec.url))
    elif spec.kind == "kaikki":
        iterator = iter_kaikki_words(spec.url)
    else:
        raise ValueError(f"unsupported source kind: {spec.kind}")

    for raw_word, metadata in iterator:
        normalized = normalize_token(raw_word, lower=lower)
        if not is_strict_script_word(normalized, charset, min_len):
            continue
        if is_noisy_repetition(normalized):
            continue
        if not has_required_script_signals(normalized, alphabet_id):
            continue
        if metadata is not None and is_kaikki_name_like(metadata):
            continue
        if normalized in seen:
            continue

        if alphabet_id == "hangul":
            latin = transliterate_hangul(normalized)
        else:
            assert symbol_map is not None
            latin = transliterate(normalized, symbol_map)
        if not latin:
            continue
        if not has_usable_latin_shape(latin, alphabet_id):
            continue

        seen.add(normalized)
        row = {
            "foreign": normalized,
            "latin": latin,
            "source": spec.source_name,
        }
        result.append(row)
        if len(result) >= TARGET_SIZE:
            break
    return result


def collect_all() -> dict:
    by_alphabet: Dict[str, object] = {}
    cyrillic_lists: Dict[str, List[dict]] = {}

    for spec in SOURCE_SPECS:
        rows = collect_from_source(spec)
        if spec.alphabet_id == "cyrillic":
            assert spec.cyrillic_variant is not None
            cyrillic_lists[spec.cyrillic_variant] = rows
        else:
            by_alphabet[spec.alphabet_id] = rows

    for variant in CYRILLIC_VARIANT_LETTERS:
        cyrillic_lists.setdefault(variant, [])
    by_alphabet["cyrillic"] = cyrillic_lists

    payload = {
        "version": "word-mode-v1",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "sources": {
            "kaikki": "https://kaikki.org/dictionary/",
            "frequencyWords": "https://github.com/hermitdave/FrequencyWords",
        },
        "licenses": {
            "kaikki": "CC-BY-SA + GFDL (Wiktionary-derived)",
            "frequencyWords": "CC-BY-SA-4.0 (content), MIT (code)",
        },
        "byAlphabet": by_alphabet,
    }
    validate_payload(payload)
    return payload


def validate_payload(payload: dict) -> None:
    by_alphabet = payload["byAlphabet"]
    for alphabet_id, data in by_alphabet.items():
        if alphabet_id == "cyrillic":
            for variant, rows in data.items():
                validate_rows(alphabet_id, rows, cyrillic_variant=variant)
        else:
            validate_rows(alphabet_id, data, cyrillic_variant=None)


def validate_rows(alphabet_id: str, rows: List[dict], cyrillic_variant: Optional[str]) -> None:
    if len(rows) > TARGET_SIZE:
        raise ValueError(f"{alphabet_id}/{cyrillic_variant or '-'} over cap: {len(rows)}")

    lower = alphabet_id in CASED_ALPHABETS or alphabet_id == "cyrillic"
    charset = get_alphabet_charset(alphabet_id, cyrillic_variant)
    symbol_map = None
    if alphabet_id not in {"hangul"}:
        symbol_map = SYMBOL_MAPS["cyrillic"] if alphabet_id == "cyrillic" else SYMBOL_MAPS[alphabet_id]
    min_len = min_len_for_alphabet(alphabet_id)

    seen: Set[str] = set()
    for row in rows:
        foreign = normalize_token(str(row.get("foreign", "")), lower=lower)
        if foreign in seen:
            raise ValueError(f"duplicate word in {alphabet_id}/{cyrillic_variant or '-'}: {foreign}")
        seen.add(foreign)
        if not is_strict_script_word(foreign, charset, min_len):
            raise ValueError(f"invalid chars/len in {alphabet_id}/{cyrillic_variant or '-'}: {foreign}")
        if is_noisy_repetition(foreign):
            raise ValueError(f"noisy repetition in {alphabet_id}/{cyrillic_variant or '-'}: {foreign}")
        if not has_required_script_signals(foreign, alphabet_id):
            raise ValueError(f"missing script signal in {alphabet_id}/{cyrillic_variant or '-'}: {foreign}")
        if alphabet_id == "hangul":
            expected = transliterate_hangul(foreign)
        else:
            assert symbol_map is not None
            expected = transliterate(foreign, symbol_map)
        if not expected:
            raise ValueError(f"failed translit for {alphabet_id}/{cyrillic_variant or '-'}: {foreign}")
        if row.get("latin") != expected:
            raise ValueError(
                f"latin mismatch in {alphabet_id}/{cyrillic_variant or '-'}: {foreign} -> {row.get('latin')} (expected {expected})"
            )
        if not has_usable_latin_shape(expected, alphabet_id):
            raise ValueError(f"opaque latin in {alphabet_id}/{cyrillic_variant or '-'}: {foreign} -> {expected}")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", default=str(OUTPUT_PATH))
    args = parser.parse_args()

    payload = collect_all()
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    print(f"wrote {output_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
