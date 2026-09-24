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

Practice all 118 elements: symbol → element name, or name → symbol. Names and symbols follow the [IUPAC periodic table](https://iupac.org/what-we-do/periodic-table-of-elements/). Common spelling variants aluminum, cesium, and sulphur are also accepted.

Both directions use typed, case-insensitive answers by default. In settings, name → symbol can use symbol buttons instead. Individual elements can be enabled or disabled; the existing cheat sheet, scoring, and missed-symbol practice also apply.

The optional **show atom facts** setting is off by default and saved locally. It shows atomic number, period, and group (or lanthanide/actinide series), and enables atomic numbers on symbol buttons.

Choose **English** (default) or **Suomi (Finnish)** under **element name language** in settings. The saved selection applies to both directions, accepted answers, the cheat sheet, and element-selection labels. Progress and enabled elements are shared across languages. Finnish names follow the [Kemianseurat terminology appendix](https://kemianseurat.fi/wp-content/uploads/2013/08/ESEKPS2.pdf), with newer names checked against [Finnish exam-board material](https://info.ylioppilastutkinto.fi/hvp/final/2020_k_ke.pdf) and [Kemia’s naming report](https://www.kemiamedia.fi/wp-content/uploads/2013/02/kemia_uut_2011_15.pdf). Finnish also accepts “niobi” for niobium; accents such as the ö in “röntgenium” are preserved.
