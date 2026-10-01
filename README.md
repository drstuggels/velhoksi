# velhoksi

Static HTML/CSS/JS site for Cloudflare Pages.

## Cloudflare Pages settings

- Framework preset: `None`
- Build command: leave blank
- Build output directory: `/`
- Root directory: `/`

This repo deploys directly because `index.html`, `styles.css`, and `app.js` are already at the project root.

## Ear training

Choose **ear training** in the main picker, or open `/?mode=ear-training`. Breadcrumbs navigate back through the practice menus. Piano is the default answer method; saved choices remain available after the one-time default migration.
The secondary menu offers **intervals**, followed by four challenge levels and **custom**. Select a card to reveal its answer methods and clickable interval set. Each card keeps its own choices while comparing challenges; compound intervals are available under “extend beyond an octave.” Use **start** on that card to begin, or **more settings** to bring those choices into custom setup. Open the **cheat sheet** to explore intervals and play a reference drone.

Check **save exercise** beside **start quiz** to keep a custom setup in **saved exercises**. A name field appears; leave it blank for an automatic name. Choose **save now** to save and keep editing, or **save and start quiz** to save and begin. Both save the full exercise and sound settings. When editing a saved exercise, checking save updates it; **save as new** keeps a variation. Leaving save unchecked starts the quiz without overwriting the saved version. Removed exercises can be restored with **undo**.

1. **First intervals:** ascending pairs; minor/major thirds, fourths and fifths.
2. **Both directions:** ascending or descending pairs; all simple intervals and gently varying dynamics.
3. **Hear together:** simultaneous pairs; all simple intervals, varying dynamics and an assisted separate-note replay.
4. **Chains & stacks:** 3–4 notes, mixed playback, alternating piano/Rhodes/guitar recordings and gently varying dynamics.

**Custom** puts answer method, listening help, sound, instrument pool, dynamic variation and exercise constraints in a setup screen before starting. Presets leave the saved custom setup intact; **edit challenge** opens the current exercise as a custom setup. The quiz has one answer surface and no setup selectors. **Back to quiz** in settings preserves the current question and answer when exercise constraints are unchanged; changing those constraints generates a compatible question. Cheat-sheet sound choices do not change the active exercise. Instrument and velocity are chosen once per question and retained for replays, hints and comparisons. **Different instrument per note** assigns successive notes to the selected instrument pool; this works for melodic chains and simultaneous stacks, preserving the assignment on replay. Alternating instruments use their shared native pitch range; dynamic changes are limited to eight velocity steps between questions. Outgoing notes fade over 120 ms, with the existing reverb tail preserved through replay, grading and the next question.

- Ascending/descending chains of 2–8 notes, harmonic stacks of 2–6 pitches, alternating melodic directions, or mixed playback.
- Fixed or variable note counts, selected simple/compound intervals, pitch range, fixed/random reference, duration, and gap.
- Interval buttons/typing, piano, standard guitar fretboard, and note-name answers. Piano/fretboard/note entry supplies a reference. `m3` and `M3` stay distinct; enharmonic pitches are equivalent.
- Results show full interval names and pitches in a compact panel. Piano, fretboard, and interval buttons remain playable after grading without changing the submitted answer or score. Note-name answers reveal a playable piano. Green markers show target notes; red markers show missed selections.
- Hover or focus a note mention to highlight matching pitches across the active view, including piano keys, equivalent fretboard positions, references, answers, and held drone notes. Matching includes the octave; octave-navigation labels are excluded. Offscreen instrument positions scroll into view without playing or selecting notes.
- The quiz piano covers the instrument's native range independently of the question range, with horizontal wheel/touch scrolling and arrow controls. Short viewports can scroll to the result and next-question controls.
- Per-answer feedback, per-relationship scoring, comparison playback, hints, replay counts, and local missed-interval weighting. Assisted answers are counted explicitly. No microphone, account, or MIDI device is required.
- Note length is adjustable from 0.2 to 12 seconds in challenge settings. The cheat sheet has an independent length control, initially set to 12 seconds, used by interval playback and piano audition.
- Cheat sheet: all 24 intervals, an instrument palette grouped by family, separate reference/upper-note instruments, a multi-note drone, and repeat. Piano modes set the reference, audition notes, or toggle held drone notes. Starting a drone holds the selected interval and switches the piano to drone-note entry. Held-note buttons remove individual pitches; clear removes the whole set. Interval/reference changes update the interval pair while preserving extra held notes, without struck-note previews. Stop/start retains the chosen notes, and the main transport and Space control the drone while it is active or in drone-note mode. Keys light on the audio clock; sustained keys and the drone indicator follow the drone state and measured signal level. Note names fit inside the keys; full names remain in accessible labels and tooltips.
- Piano shortcuts: `A W S E D F T G Y H U J K O L P` play/select chromatic notes starting at the labelled C; `Z`/`X` shift the keyboard octave and piano view; controls stop at the playable range. Shortcuts use letters and number-row positions without punctuation dependencies. Interval shortcuts: `1`–`9`, `0`, `Q`, `R` select 1–12 semitones; hold Shift for 13–24. Shortcuts appear on keys/buttons and in the shortcuts dialog. They are ignored while editing text or form controls.

### Sound and provenance

The native Web Audio multisampler loads **1,210 locally hosted lossless recordings** (~434.5 MiB across the whole collection) on demand. Only the samples needed for the current notes and dynamics are fetched; choosing an instrument does not download its whole bank.

| Instrument | Presets and source details | License |
| --- | --- | --- |
| Salamander Grand Piano V3 | Alexander Holm; 68 original 48 kHz/24-bit stereo recordings, four selected dynamics. Mapping by kinwie, retuning by Markus Fiedler. | CC BY 3.0 |
| Wurlitzer EP200 | Greg Sullivan; 37 original recordings, four dynamics, original sustain loops. Mapping by kinwie. | CC BY 3.0 |
| Shinyguitar | D. Smolken / Karoryfer Samples; separate electric pickup and acoustic microphone presets, four dynamics, four alternate takes, and recorded release noises. | CC0 1.0 |
| Vibraphone | Versilian Community Sample Library (VCSL); soft mallets, hard mallets, and bowed presets. Struck versions retain both recorded dynamics. | CC0 1.0 |
| Marimba | VCSL; three recorded dynamics with the source mapping’s velocity crossfades. | CC0 1.0 |
| Renaissance organ | VCSL; 8′ and full registrations. | CC0 1.0 |
| Pipe organ | VCSL; quiet and full registrations. Recorded by Simon Dalzell / Ivy Audio. | CC0 1.0 |
| Yamaha TX81Z | VCSL; FM Piano, Clavisynth and Piano 1, recorded from the original FM hardware. | CC0 1.0 |
| Concert harp | VCSL; original velocity crossfades, tuning and natural decays. | CC0 1.0 |
| Kalimba | VCSL; Kenya and Tanzania presets with the authored tuning and alternate-key mappings. | CC0 1.0 |
| jRhodes3d | Jeffrey Learman’s 1977 Rhodes Mark I Stage 73; full-length mono recordings with up to five dynamics and the original EQ. | **CC BY-NC 4.0 for the samples** |

The Rhodes recordings are included for this **noncommercial app** with attribution and the author’s current license. Its control files are CC0; that does not change the sample license. Full licenses live alongside each bank and credits/source links are collected in the footer’s credits modal. Original recordings remain unmodified in PCM content. Additional WAV sources are losslessly packed into FLAC, preserving sample rate, channels and bit depth. A few TX81Z WAVs have malformed trailing metadata; their containers are repaired without changing PCM. Adapted playback mappings are documented in the manifest and the original SFZ files are retained next to the banks.

VCSL recordings and mappings come from release `v1.2.2-RC`, including the SFZ’s numeric pitch roots, gain, tuning and onset offsets. Filename octave conventions are not used to guess pitches. Questions stay within each preset’s mapped range, capped to the app’s C2–C6 range. Every fret remains available as an answer; auditioning or comparing an answer beyond an instrument’s mapped range transposes its closest recorded region.

The drone uses a single quiet pipe-organ registration, independently of the interval instrument. Its held recordings get phase-matched, raised-cosine loop crossfades up to 500 ms long, DC removal, and RMS/peak normalization. Each pitch has a persistent voice: adding or removing a sustained note preserves the reference and its level. New notes fade in over 2.4 seconds; removed notes ease out over 1.2 seconds to exact silence, including the last held note. Removing notes does not reload or reconstruct the remaining voices. Very slow, shallow brightness and amplitude movement adds breath without detuning; unchanged settings do not interrupt the entrance. Interval and reference changes while sustaining do not add a separate struck-note preview; free audition remains available through play-notes mode. The indicator reads the audio analyser. Only the quiet pipe-organ bank is needed for an offline drone.

Organ sustain uses a crossfaded held section built in memory from each recording; these loops are adapted for Velhoksi, not claimed as original authored loops. Wurlitzer retains its original authored loops. Guitar attacks rotate between recorded takes and trigger quiet recorded release noises. Harp and marimba blend their authored velocity layers. The grand piano has no added gain attack: a cached, stereo-aware search selects a quiet onset within the 2 ms before the mapped offset, without trimming the hammer transient. The startup output gate completes before notes start. Other instruments retain their authored attack envelopes. Gain envelopes, polyphony limiting, headroom and a compressor are part of the sample engine; the compressor is not a true-peak brickwall limiter.

**DattorroReverbNode**, by khoin, is a vendored AudioWorklet implementation of Jon Dattorro’s reverb topology. Studio, room, hall and dry settings; no dry-path pitch modulation. Local changes add a tank-reset message, remove zero-input allocations and use 32-bit tap indices. Replay replaces notes while preserving the room tail; explicit stop and mode changes clear it. The reverb source is public domain with its no-liability notice preserved. No affiliation or endorsement is implied.

`audio/samples/manifest.json` records pinned revisions, source URLs, sizes, SHA-256 hashes and playback metadata. Reproduce all banks with `python3 scripts/prepare_ear_samples.py`, or extend an existing piano/Wurlitzer bank with `python3 scripts/prepare_extra_samples.py`. The additional importer requires the `flac` command-line encoder and also generates `ear-training/instruments.mjs`. The app itself has no build step. See `vendor/dattorro/SOURCE.txt` for the pinned reverb revision.

Decoded and regular sustain buffers share a 96 MiB LRU budget (active voices and in-flight decodes can temporarily exceed that). Drone loops have a separate 32 MiB LRU budget, reuse file/rate/region entries across source-buffer eviction, and do not retain original recordings. These cache limits exclude live voices, in-flight decodes, and browser overhead; they are not a tab RAM ceiling. At most three sample fetch/decode jobs run concurrently, obsolete queued requests skip loading, ended sources clear their buffers and handlers, and unchanged audio parameters do not accumulate automation. Offline downloads stream directly to disk cache without materializing or decoding an entire bank. Lossless recordings are cached separately from the app shell. The footer’s preferences panel offers full-instrument offline downloads, including release recordings, per-bank storage status, cancellation/resume, and deletion; first uncached playback requires a connection. For drones, also download the quiet pipe-organ bank. Playback needs a current browser with FLAC decoding and AudioWorklet support, over HTTPS or localhost. Audio starts only after an interaction and stops on mode changes, hidden pages and interruptions.

### Development and validation

The production app has no package/runtime dependencies or required bundler. Development-only tests use jsdom for simulated DOM interaction; they do not replace a real browser/headphone audition.

```sh
npm install
npm test
npm run check
npm run dev
```

The existing Cloudflare Pages root deployment is unchanged; no build step is required. Tests cover exercise constraints, grading, input surfaces, cancellation, sample hashes and complete region coverage, and finite stereo reverb tails/reset at 44.1/48/96 kHz. Real-device latency, mobile interruptions, and subjective listening quality still require browser/device audition.

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
- [ ] finish ear training
    - [x] try mobile
    - [ ] harmonics view finetune
    - [ ] chords
    - [ ] progressions
    - [ ] scale degree
    - [ ] real world scenarios? for example, what is bass doing what is piano doing... is there some db that isn't too difficult...?

for more fonts:
https://typeface.ge/en
https://www.freejapanesefont.com/category/handwriting/

## Periodic elements

Practice all 118 elements: symbol → element name, or name → symbol. Names and symbols follow the [IUPAC periodic table](https://iupac.org/what-we-do/periodic-table-of-elements/). Common spelling variants aluminum, cesium, and sulphur are also accepted.

Both directions use typed, case-insensitive answers by default. In settings, name → symbol can use symbol buttons instead. Individual elements can be enabled or disabled; the existing cheat sheet, scoring, and missed-symbol practice also apply.

The optional **show atom facts** setting is off by default and saved locally. It shows atomic number, period, and group (or lanthanide/actinide series), and enables atomic numbers on symbol buttons.

Choose **English** (default) or **Suomi (Finnish)** under **element name language** in settings. The saved selection applies to both directions, accepted answers, the cheat sheet, and element-selection labels. Progress and enabled elements are shared across languages. Finnish names follow the [Kemianseurat terminology appendix](https://kemianseurat.fi/wp-content/uploads/2013/08/ESEKPS2.pdf), with newer names checked against [Finnish exam-board material](https://info.ylioppilastutkinto.fi/hvp/final/2020_k_ke.pdf) and [Kemia’s naming report](https://www.kemiamedia.fi/wp-content/uploads/2013/02/kemia_uut_2011_15.pdf). Finnish also accepts “niobi” for niobium; accents such as the ö in “röntgenium” are preserved.


### Cheat-sheet interval analysis

The strip below the cheat sheet retains the latest selected/played pitch set and names every chromatic interval present, grouping repeated intervals with a count. Free piano audition includes overlapping notes and the held drone. Sequential interval playback keeps both notes in the relationship view, labelled “sequence”; it is not presented as simultaneous audio. Duplicate MIDI pitches are merged; octave doublings remain distinct. Names follow chromatic distance, not score-aware enharmonic spelling.

“Interval map & harmonics” expands every pair (36 per page), pair audition, linked pitch highlights, contextual listening observations, and an SVG plot of the first eight ideal harmonics on a logarithmic frequency axis. Pair audition preserves the original analysis so another pair can be compared immediately. The harmonic plot is a model, not a measured spectrum, and does not represent recorded overtone amplitudes. Nearby-harmonic comparisons report mathematical frequency differences, not a dissonance score. No FFT, extra audio nodes, audio-buffer copies, history accumulation, or new animation loop is added. The SVG and pair table exist only while expanded; analysis is cached for the current note set. The existing playback animation only refreshes analysis highlights when the set of active pitches changes.

Listening observations distinguish stacked thirds from doubled chord thirds. Major/minor readings use a complete three-pitch-class triad and do not assume the bass is the root. Doubling a third is contextual, not inherently unpleasant. Sources informing these observations and the model:

- [Open Music Theory: chords in SATB style](https://viva.pressbooks.pub/openmusictheory/chapter/chords-in-satb-style/)
- [Puget Sound: voice leading first-inversion triads](https://musictheory.pugetsound.edu/mt21c/VoiceLeadingFirstInversionTriads.html)
- [UNSW: how harmonic are harmonics?](https://newt.phys.unsw.edu.au/jw/harmonics.html)
- [Lavengood: timbre analysis, beating and harmonicity](https://www.mtosmt.org/issues/mto.20.26.3/mto.20.26.3.lavengood.html)


Quiz feedback grades successive interval relationships separately from exact pitch positions. A later correct interval receives partial credit even if an earlier wrong note shifted the following pitches. Results show each target interval and direction beside the submitted relationship; correct sizes in the wrong direction are identified explicitly. Simultaneous answers reserve exact matches before pairing unmatched pitches, so missing a lower voice does not erase credit for an upper voice. Full-question success still requires reproducing the complete answer.


### App preferences and credits

The footer opens **preferences** and **credits** from any practice mode. Preferences contains global volume, symbol/word answer-reveal timing, instrument downloads, cache status, and the existing app-reset control. Exercise settings contain only exercise-specific choices. Volume is shared across challenges and saved exercises, migrating the previous ear-training volume when available. Downloads continue when the modal closes or the practice mode changes; compressed recordings go straight to the shared sample cache without decoding or opening another audio context.

Credits brings together recording authors and licenses, abcjs and reverb software, adapted word-list sources, element-name data sources, and all Google Fonts families used by the app. Local license notices are cached with the app shell.
