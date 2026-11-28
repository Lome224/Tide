// Tide: playing. Starts and stops the piece, shows what it is doing several times a second,
// and offers a host page a few commands (window.Tide). The controls themselves are in controls.js.

import { VOICES, NOTES, COLOURS, TEST_SECTIONS } from './config.js';
import { state, gather, allChannels, live } from './state.js';
import * as engine from './engine.js';
import { $, put, hooks, pending, chosen, showPending, showController, showKeys, drawLines, sendVol, showHome } from './controls.js';

let piece = 'tide', timer = null, t0 = 0, lastBits = 0;
// An audio output opened inside a click (window.Tide.unlock). A host page calls that from its
// own ENTER button, so the sound may begin later, once everything has loaded.
let unlocked = null;
hooks.restart = () => stop().then(start);
hooks.leave = url => { const go = () => { location.href = url; }; live.playing ? stop().then(go, go) : go(); };

/* ---------- play / pause ---------- */
function setStatus(html) { $('status').innerHTML = html; }

async function start() {
  $('play').disabled = true; setStatus('starting…');
  try {
    live.lite = state.bin ? 0 : 1;
    // the unlocked output is used once; later starts come from a click on PLAY and open their own
    const output = unlocked && unlocked.state !== 'closed' ? unlocked : null; unlocked = null;
    await engine.start(piece, { ...allChannels(), lite: live.lite, vol: live.quiet ? 0 : state.vol }, output);
    for (const k in pending) pending[k].clear();   // everything is read fresh at the start
    live.playing = true; t0 = performance.now(); lastBits = 0; gather.waiting = false; gather.section = -1;
    $('play').textContent = 'PAUSE';
    timer = setInterval(tick, 150); tick();
  } catch (e) {
    console.error('Tide:', e);
    setStatus('Sound could not start in this browser (' + e.message + ').');
  }
  $('play').disabled = false;
}

async function stop() {
  clearInterval(timer); timer = null; live.playing = false;
  $('play').textContent = 'PLAY'; $('meter').style.width = '0'; $('now').textContent = ''; said.until = 0;
  showHome(); drawLines(0); showKeys(-1, -1);
  for (const k in pending) pending[k].clear();
  showPending();
  await engine.stop();
  setStatus('Paused. PLAY starts a new performance.');
}
$('play').addEventListener('click', () => live.playing ? stop() : start());

// Leaving the page by any other way (a link, the back button): stop as well. Some browsers keep
// a page in memory and bring it back as it was; a Csound left running comes back as noise.
window.addEventListener('pagehide', () => { if (live.playing) stop(); });
window.addEventListener('pageshow', e => { if (e.persisted && (live.playing || engine.isRunning())) stop(); });

// for a host page
window.Tide = {
  start: () => live.playing ? Promise.resolve() : start(),
  stop: () => live.playing ? stop() : Promise.resolve(),
  quiet: q => { live.quiet = !!q; sendVol(); },
  unlock: () => { try { unlocked = unlocked || new AudioContext(); unlocked.resume(); } catch (e) { unlocked = null; } },
  loaded: false,   // true once Csound, the piece and its data have arrived
  controller: open => showController(open === undefined ? $('controller').hidden : open),
  isPlaying: () => live.playing };
window.dispatchEvent(new Event('tide-ready'));
engine.loaded.then(() => { window.Tide.loaded = true; window.dispatchEvent(new Event('tide-loaded')); }, () => {});

// a passing message, and how long any of them stays (milliseconds)
const STAY = 6000, said = { text: '', amber: false, until: 0 };
function say(text, amber = false) {
  if (text !== said.text && performance.now() < said.until) return;   // the one on screen is not replaced early
  said.text = text; said.amber = amber; said.until = performance.now() + STAY;
}

// several times a second: show what the piece is doing
async function tick() {
  const t = (performance.now() - t0) / 1000;
  if (piece === 'test') {
    let label = TEST_SECTIONS[0][1];
    for (const [s, l] of TEST_SECTIONS) if (t >= s) label = l;
    setStatus(`<b>${label}</b> · ${Math.floor(t)} s`);
    if (t > 51) { await stop(); setStatus('Test finished. Press PLAY to hear it again.'); }
    return;
  }
  // iPhones: the switch on the side silences web pages, which looks like a broken site
  const hush = /iPhone|iPad/.test(navigator.userAgent) && t < 15 ? ' · no sound? check the silent switch' : '';
  setStatus(`<b>playing</b> · ${state.bin ? 'binaural' : 'stereo'} · ${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}${hush}`);
  const values = await engine.read(['level', 'runbits', 'colour_now', 'tonic_now', 'section_now']);
  if (!values || !live.playing) return;
  const [level, bitsF, colour, tonic, section] = values, bits = Math.round(bitsF);
  $('meter').style.width = Math.min(100, level * 400) + '%';

  // a voice that has just begun a phrase has read its controls: nothing of its is pending now
  const begun = bits & ~lastBits; lastBits = bits;
  let cleared = false, heard = false;
  VOICES.forEach((_, v) => { if (begun & (1 << v)) for (const k in pending) if (pending[k].delete(v)) { cleared = true; heard = heard || chosen.has(v); } });
  if (cleared) showPending();
  if (heard) { put('pendTxt', 'rests: in use'); setTimeout(showPending, STAY); }
  if ($('keys')) $('keys').classList.toggle('wait', gather.waiting);

  // a new section answers a root or harmony change
  if (gather.section < 0) gather.section = section;
  if (section !== gather.section) { gather.section = section; gather.waiting = false; }

  const colourName = COLOURS[Math.round(colour)] || '', note = NOTES[(((Math.round(tonic) + 2) % 12) + 12) % 12];
  put('keyBox', note); drawLines(bits);
  showKeys((((Math.round(tonic) + 2) % 12) + 12) % 12, Math.round(colour));
  const key = `<b>${colourName}</b> on <b>${note}</b>`;
  // A passing message stays on screen for at least STAY, so that it can be read.
  if (gather.waiting) say('changing: voices restart', true);
  else if ((bits & 7) === 0 && t > 3) say('shared silence: the scale changes');
  const msg = performance.now() < said.until ? ` · <span${said.amber ? ' style="color:var(--glow)"' : ''}>${said.text}</span>` : '';
  $('now').innerHTML = key + msg;
}

/* ---------- binaural test (only on Tide's own page) ---------- */
function selectPiece(p) {
  piece = p;
  $('pTest').setAttribute('aria-pressed', p === 'test');
  $('pTest').textContent = p === 'test' ? 'BACK TO TIDE' : 'BINAURAL TEST';
  $('bin').disabled = p === 'test';
  if (live.playing) stop().then(start);
  else setStatus(p === 'test' ? 'Binaural test: one source, four ways, about 50 s. Press PLAY.' : 'Headphones recommended.');
}
if ($('pTest')) $('pTest').addEventListener('click', () => selectPiece(piece === 'test' ? 'tide' : 'test'));
