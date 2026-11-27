# Tide · binaural

A generative soundscape, synthesised live in the browser with Csound. Listen at **https://tide.salomezhang.com**.

Tide is seven voices, each with its own cycle: a phrase, a rest, and again. The cycles are slightly different lengths, so the voices start together, drift apart, and now and then gather in a shared silence before starting again in a new key.

The harmony alternates between two scales, changing only in a shared silence. You choose the two from ten: the Dorian, Phrygian and Lydian modes, the whole-tone and octatonic scales, the Chinese pentatonic modes gong 宫, yu 羽 and jue 角, and the Japanese iwato 岩戸 and hirajoshi 平調子. In the octatonic scale the chords are polychords (a major triad set over a root and fifth a tritone or a sixth away) moved as a constant structure, down a minor third each time. In every scale, home moves from note to note, the bass holds a pedal, and phrases end unresolved.

The pitched voices are physical models: a bowed string, a plucked string and an aeolian harp. Drops are water landing on glazed porcelain, shimmer is shards touching, the waves are filtered noise, and a flyer passes close with Doppler. With binaural on, each voice is placed around your head inside a binaural room.

It extends the system of *The Blue Left Spinning*: each voice stands where a sculpture will.

## What's here

**The page**

| File | What it does |
| --- | --- |
| `index.html` | The page's contents only: front page (play, volume, binaural) and an empty place for the controller. |
| `style.css` | How Tide's own page looks. |
| `controller.css` | How the controller looks. Also used by any site that shows Tide. |
| `js/config.js` | Fixed data: voice names, presets, starting rhythm and breath rows. Edit presets here. |
| `js/state.js` | What the controls are set to, saved between visits, and the list of Csound channels. |
| `vendor/csound.js` | Csound for the browser: `@csound/browser` 6.18.7, unchanged, from the Csound developers (LGPL 2.1). Kept here so Tide loads nothing from other servers. |
| `js/engine.js` | The sound engine: loads Csound, the piece and the HRTF data; start, stop, send, read. |
| `js/multislider.js` | The multislider and the rows of buttons. |
| `js/markup.js` | The controller's parts, as HTML. Written into the page by `main.js`. |
| `js/picture.js` | The pad: density, drift and room as one picture you can drag. |
| `js/lines.js` | The voices as lines: on/off, level, and choosing which voices to edit. |
| `js/main.js` | Connects the controls to the state and the engine. |

**The piece** (`csound/`; run it on its own with `csound tide.csd` from that folder)

| File | What it holds |
| --- | --- |
| `tide.csd` | The main file: options, the seven includes, and the score that starts everything. |
| `space.inc` | The binaural space: HRTF data, the room buses. |
| `controls.inc` | Reading the page's controls, voice gain, placing a sound around the head. |
| `harmony.inc` | The shared harmony: the three colours, chord shapes, the motif, sections, the Markov table, default rhythm and breath rows. |
| `machines.inc` | The conductor, and the machine that gives each voice its phrases and rests. |
| `voices-pitched.inc` | Chords, bass, counter. |
| `voices-texture.inc` | Drops, waves, shimmer, flyer. |
| `output.inc` | The binaural room and the master output. |

**Other**

| Path | What it is |
| --- | --- |
| `lab/binaural-test-web.csd`, `lab/binaural-test.csd` | The isolated binaural A/B test (browser version, and a self-contained version with HRTF data embedded) |
| `media/hrtf/` | Csound's measured HRTF data (44.1, 48, 96 kHz) |

The current piece lives in `csound/`. The `lab/` folder contains only the two binaural tests. Older experimental snapshots remain in Git history rather than alongside the current source; use `git log --all -- lab/` to find them.

In the browser, `js/engine.js` fetches `tide.csd` and its parts and joins them before handing the text to Csound.

## How the piece works

Seven voices: counter (bowed string, `wgbow`), bass (plucked string, `wgpluck2`), chords (aeolian harp, `noise` → `wguide1`), drops (water on porcelain: a wet tick into four damped `mode` resonators), waves (filtered `noise`), shimmer (`dust2` → `mode`), flyer (pings with `vdelay3` Doppler). All are placed with `hrtfmove2` in an `hrtfearly` + `hrtfreverb` room.

- **Each voice has its own machine** (`instr 10`, one instance per voice): a phrase, a rest, and again. A phrase is two passes of the voice's 8-beat rhythm row. This instrument stands where a sculpture will.
- **Phasing:** each voice's phrase is a little longer than the one before (DRIFT), so they start together and drift apart.
- **Breath:** each voice's breath row sets its rest after each of 8 phrases. A full bar means wait: the voice stays silent until counter, bass and chords are all waiting.
- **Harmony:** everything is in one scale at a time. Two scales are chosen from ten (`colA`, `colB`) and the piece alternates between them. Chords are one shape moved in parallel.
- **Octatonic chords** (after Berklee *Harmony 4*, parts 5 and 6): polychords, root and fifth below, a close major triad above, on the tritone or the sixth. They move as a constant structure, down a minor third each time; the octatonic scale is the same at every minor third, so the chord scale stays constant. The pattern is broken on the last chord before a shared silence.
- **Sections:** only when the three pitched voices are all waiting does the harmony change to the other of its two scales, in a new key, and everyone begins again together. Changing the root or harmony on the page asks every voice to stop after its current phrase, so that silence comes within about 20 seconds; the chosen root is then used exactly.
- **Home:** within a section, home moves when the counter starts a phrase. The move (step up, step down, skip up) is drawn from a Markov chain on the previous move (`giMarkov`). In dark mode a step is a minor third and a skip a tritone. The bass holds a pedal; phrases end on the 2nd or the note below home.
- **Motif:** there is no melody. The counter plays an 8-note motif (upside down) that changes a little between phrases.
- **Frozen inputs:** a voice reads its rhythm row, breath row and activity when its phrase begins. On the page a changed bar stays yellow until then.

## Channels

| Channel | Meaning |
| --- | --- |
| `on<v>`, `act<v>`, `lvl<v>` | voice on/off, activity (how many of its row's notes it plays), level (gain = (2 × value)²) |
| `div<v>_<beat>` | rhythm row: notes in each of 8 beats (waves: swell height) |
| `wait<v>_<phrase>` | breath row: rest after each of 8 phrases, 1 = wait for everyone |
| `tonic`, `colA`, `colB`, `gather` | root (semitones from D), and the two scales the piece alternates (0 to 9, numbered in `csound/harmony.inc`); the page raises `gather` by one when any of them changes |
| `drift`, `room`, `bin`, `vol` | phase drift, room amount, binaural, volume |
| `runbits`, `colour_now`, `tonic_now`, `section_now`, `level` | sent back to the page: which machines are running, the current colour, key and section, output level |

Voices `<v>`: 0 counter, 1 bass, 2 chords, 3 drops, 4 waves, 5 shimmer, 6 flyer.

## Run locally

```
python3 -m http.server
```

then open http://localhost:8000 (it must be served; opening the file directly can't load the scripts, the piece or the HRTF files).

## Host

Any static host works (GitHub Pages, Netlify, Cloudflare Pages): upload the folder as is.
