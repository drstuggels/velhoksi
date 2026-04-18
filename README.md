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
- [ ] more stylized fonts for each language
    - japanese retro
    - greek, arabic, hebrew ancient
    - handwriting
    - corporate bulbous
- [ ] morse
- [ ] "mastery mode"
    - demand consistent time sub few seconds
    - demand streak of 2-3 rounds
    - green bubble that fills up
