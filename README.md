# velhoksi

Static HTML/CSS/JS site for Cloudflare Pages.

## Cloudflare Pages settings

- Framework preset: `None`
- Build command: leave blank
- Build output directory: `/`
- Root directory: `/`

This repo deploys directly because `index.html`, `styles.css`, and `app.js` are already at the project root.

## Word mode data

- Generated asset: `data/word-lists.json`
- Generator script: `scripts/generate_word_lists.py`
- Regenerate with:

```bash
python3 scripts/generate_word_lists.py
```

## Production domain

- `velhoksi.click`

## Todo

- [x] manual refresh in settings
- [x] switch fonts in cheat sheet also
- [x] loading animation
- [x] settings modal like cheat sheet
- [x] keyboard shortcuts
- [x] more stylized fonts for each language
- [x] setting line between close and first setting
- [x] make cheat sheet font match the previous prompt font by default if on random mode
- [x] upper case / lower case words should have correct answer in lower case / upper case
- [x] hovering greek -> latin should flip the arrow
- [x] fix sw not caching html
- [x] responsiveness (stats overflow, / separated menu, don't display shortcuts on mobile)
- [x] hangul grapheme->syllable->word mode
- [ ] morse
- [ ] "mastery mode"
    - demand consistent time sub few seconds
    - demand streak of 2-3 rounds
    - green bubble that fills up

for more fonts:
https://typeface.ge/en
https://www.freejapanesefont.com/category/handwriting/

## Periodic elements

Practice all 118 elements: symbol → English name, or name → symbol. Names and symbols follow the [IUPAC periodic table](https://iupac.org/what-we-do/periodic-table-of-elements/). Common spelling variants aluminum, cesium, and sulphur are also accepted.

Both directions use typed, case-insensitive answers by default. In settings, name → symbol can use symbol buttons instead. Individual elements can be enabled or disabled; the existing cheat sheet, scoring, and missed-symbol practice also apply.

The optional **show atom facts** setting is off by default and saved locally. It shows atomic number, period, and group (or lanthanide/actinide series), and enables atomic numbers on symbol buttons.
