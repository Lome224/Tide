// Tide: the controls. Writes the controller into the page and connects every control to the
// state and the sound engine. Playing, pausing and the running display are in main.js.

import { PHONE, VOICES, NOTES, COLOURS, SCALES, COLOUR_MENU, PRESETS, WAIT0, DIV_HINT } from './config.js';
import { state, save, gather, tonicOffset, allChannels, live } from './state.js';
import * as engine from './engine.js';
import { multislider, tabs } from './multislider.js';
import { picture } from './picture.js';
import { lines } from './lines.js';
import { CONTROLLER } from './markup.js';

// one thing only main.js can do; it fills this in
export const hooks = { restart() {} };

export const $ = id => document.getElementById(id);
// the controller's parts are written into the page first, so everything below can find them
if ($('controllerBody')) $('controllerBody').innerHTML = CONTROLLER;
export const put = (id, text) => { if ($(id)) $(id).textContent = text; };   // for parts not every page has
const voiceNames = VOICES.map(v => v[0]);

// When Tide is shown inside another site (<html data-tide-embed>), it leaves the page's
// address alone, and the host can quiet it (window.Tide.quiet) while its own audio plays.
export const EMBED = document.documentElement.hasAttribute('data-tide-embed');
export const sendVol = () => engine.send('vol', live.quiet ? 0 : state.vol);

/* ---------- changes waiting to be heard ----------
   Density and rhythm are heard from the next beat. A voice's rests are read when its phrase
   begins, so a change there stays pending (yellow) until that voice's next phrase. */
export const pending = { wait: new Set() };
const isPending = (kind, v) => live.playing && pending[kind].has(v);

export function showPending() {
  // for the chosen voices: say that a change is waiting, since it is not heard at once
  put('pendTxt', live.playing && [...chosen].some(v => pending.wait.has(v)) ? 'rests: next phrase' : '');
  drawDiv(); drawWait();
}

// root and harmony: ask every voice to stop after its phrase, so the piece can begin again
function askGather() {
  if (!live.playing) return;   // not playing: the new values are simply used at the start
  gather.sent++; gather.waiting = true;
  engine.send('gather', gather.sent);
}

/* ---------- front page ---------- */
function showVol() { $('vol').value = state.vol; $('volOut').textContent = Math.round(state.vol * 100) + '%'; }
$('vol').addEventListener('input', e => { state.vol = +e.target.value; showVol(); sendVol(); save(); });

function showBin() {
  $('binTxt').textContent = state.bin ? 'BINAURAL ON' : 'BINAURAL OFF';
  $('bin').setAttribute('aria-pressed', state.bin ? 'true' : 'false');
}
$('bin').addEventListener('click', () => {
  state.bin = state.bin ? 0 : 1; showBin(); engine.send('bin', state.bin); save();
  if (live.playing && live.lite && state.bin) hooks.restart();
});

function applyPreset(i) {
  const p = PRESETS[i], pairChanged = state.colA !== p.pair[0] || state.colB !== p.pair[1];
  Object.assign(state, { preset: i, colA: p.pair[0], colB: p.pair[1], room: p.room, on: p.on.map((x, v) => PHONE && v >= 5 ? 0 : x),   // phones: no shimmer or flyer
    act: VOICES.map(() => p.act),
    // every rest longer by `slower`; a WAIT bar stays a WAIT bar
    waits: WAIT0.map(row => row.map(x => x >= 0.95 ? x : Math.min(0.9, x + p.slower))) });
  VOICES.forEach((_, v) => pending.wait.add(v));
  const ch = allChannels();
  for (const k in ch) if (k !== 'gather' && k !== 'vol') engine.send(k, ch[k]);
  if (pairChanged) askGather();
  showAll(); save();
}
const drawPresets = tabs($('presets'), PRESETS.map(p => p.name), () => state.preset, applyPreset);
[...$('presets').children].forEach((b, i) => { b.title = PRESETS[i].title; });

/* ---------- controller: voices ---------- */
function toggleVoice(v) {
  state.on[v] = state.on[v] ? 0 : 1; state.preset = -1;
  engine.send('on' + v, state.on[v]); showVoices(); drawPresets(); save();
}

// level is a volume: gain = (2 × value)², shown in decibels
const dB = v => v <= 0 ? 'off' : (v === 0.5 ? '0' : (v > 0.5 ? '+' : '') + Math.round(40 * Math.log10(2 * v)));

function showVoices() {
  $('density').value = state.act.reduce((a, x) => a + x, 0) / state.act.length;
}
// density: one control that raises or lowers every voice's activity together
$('density').addEventListener('input', e => {
  // every voice moves by the same amount, so differences made voice by voice are kept
  const by = +e.target.value - state.act.reduce((a, x) => a + x, 0) / state.act.length;
  VOICES.forEach((_, v) => {
    state.act[v] = Math.max(0, Math.min(1, Math.round((state.act[v] + by) * 100) / 100));
    engine.send('act' + v, state.act[v]);
  });
  showPending(); showEditor(); save();
});

/* ---------- controller: shared settings ---------- */
NOTES.forEach((name, i) => $('tonic').add(new Option(name, i)));
// the two scales the piece alternates between
['colA', 'colB'].forEach(k => {
  COLOUR_MENU.forEach(i => $(k).add(new Option(COLOURS[i], i)));
  $(k).addEventListener('change', e => { state[k] = +e.target.value; state.preset = -1; engine.send(k, state[k]); askGather(); drawPresets(); save(); });
});
$('tonic').addEventListener('change', e => { state.tonic = +e.target.value; engine.send('tonic', tonicOffset()); askGather(); showHome(); save(); });
// while nothing is playing, the NOW ON box shows the home note: where the piece will begin
export function showHome() { if (!live.playing) put('keyBox', NOTES[state.tonic]); }
['room', 'drift'].forEach(k => $(k).addEventListener('input', e => { state[k] = +e.target.value; engine.send(k, state[k]); showEditor(); save(); }));

/* ---------- controller: rhythm and breath, one row per voice ---------- */
export const chosen = new Set([state.divVoice]);
const drawDiv = multislider($('msDiv'), { arr: () => state.divs[state.divVoice], min: 0, max: 4, step: 1,
  fmt: v => v ? v : '—', name: i => 'beat ' + (i + 1), foot: true,
  onChange: (i, x) => { chosen.forEach(v => { state.divs[v][i] = x; engine.send(`div${v}_${i}`, x); }); save(); } });
// The chosen voices. The rows show the first of them; a change to notes, rhythm or rests is
// written to every one, so several voices can be shaped in one move.
function selectVoice(v, add) {
  if (!add) { chosen.clear(); chosen.add(v); }
  else if (chosen.has(v) && chosen.size > 1) chosen.delete(v);
  else chosen.add(v);
  state.divVoice = Math.min(...chosen);
  showRhythm(); save();
}
// what the page shows about the chosen voices
function showEditor() {
  const v = state.divVoice;
  put('selTxt', chosen.size === VOICES.length ? 'ALL VOICES' : [...chosen].sort().map(x => voiceNames[x]).join(' + '));
  const same = f => [...chosen].every(x => JSON.stringify(f(x)) === JSON.stringify(f(v)));
  put('mixTxt', same(x => [state.act[x], state.divs[x], state.waits[x]]) ? '' : 'mixed');
  put('phraseTxt', (chosen.size === 1 ? VOICES[v][2] + ' · ' : '') + `phrase ${Math.round(13 + 2.4 * state.drift * v)} beats`);   // the same sum as in csound/machines.inc
  $('notes').value = state.act[v];
}
$('notes').addEventListener('input', e => {
  chosen.forEach(v => { state.act[v] = +e.target.value; engine.send('act' + v, state.act[v]); });
  showVoices(); showPending(); save();
});
$('selAll').addEventListener('click', () => {
  VOICES.forEach((_, v) => chosen.add(v));
  state.divVoice = 0; showRhythm(); save();
});
function showRhythm() {
  showPending(); showEditor();
  $('divLab').title = '8 beats, played twice in each phrase, left to right. ' + DIV_HINT[state.divVoice];
}

const drawWait = multislider($('msWait'), { arr: () => state.waits[state.divVoice], min: 0, max: 1, step: 0.01,
  fmt: v => v >= 0.95 ? 'WAIT' : Math.round(1 + 9 * v) + ' s', name: i => 'rest after phrase ' + (i + 1), foot: true,
  pend: () => isPending('wait', state.divVoice),
  onChange: (i, x) => { chosen.forEach(v => { state.waits[v][i] = x; engine.send(`wait${v}_${i}`, x); pending.wait.add(v); }); showPending(); save(); } });

function showAll() {
  showVol(); showBin(); showVoices(); drawPresets(); showRhythm(); showHome();
  $('room').value = state.room; $('drift').value = state.drift; $('tonic').value = state.tonic; $('colA').value = state.colA; $('colB').value = state.colB;
}
showAll();

/* ---------- the controller opens from the front page ---------- */
export function showController(open) {
  $('controller').hidden = !open; $('controller').style.display = open ? 'flex' : 'none';
  if ($('ctlBtn')) {
    $('ctlBtn').textContent = open ? 'CLOSE CONTROLLER' : 'OPEN CONTROLLER';
    $('ctlBtn').setAttribute('aria-expanded', open ? 'true' : 'false');
  }
  if (!EMBED) history.replaceState(null, '', open ? '#controller' : location.pathname + location.search);
}
if ($('ctlBtn')) $('ctlBtn').addEventListener('click', () => showController($('controller').hidden));
// knobs: a dial drawn over a slider. Drag up or down, or scroll; a chosen sound turns them too
document.querySelectorAll('#controller label.knob').forEach(k => {
  const inp = k.querySelector('input');
  let from = null;
  const show = () => { k.style.setProperty('--a', (-135 + 270 * inp.value) + 'deg'); k.querySelector('output').textContent = (+inp.value).toFixed(2); };
  const set = v => { inp.value = Math.max(0, Math.min(1, v)); inp.dispatchEvent(new Event('input', { bubbles: true })); };
  k.addEventListener('pointerdown', e => { from = { y: e.clientY, v: +inp.value }; k.setPointerCapture(e.pointerId); inp.focus(); e.preventDefault(); });
  k.addEventListener('pointermove', e => { if (from) set(from.v + (from.y - e.clientY) / 140); });
  k.addEventListener('pointerup', () => { from = null; });
  k.addEventListener('pointercancel', () => { from = null; });
  k.addEventListener('wheel', e => { e.preventDefault(); set(+inp.value - e.deltaY / 1000); }, { passive: false });
  inp.addEventListener('input', show);
  setInterval(show, 250);
});

// MORE shows one tab at a time
if ($('moreTabs')) {
  const showTab = name => {
    document.querySelectorAll('#more [data-tab]').forEach(x => { x.hidden = x.dataset.tab !== name; });
    [...$('moreTabs').children].forEach(b => b.setAttribute('aria-pressed', b.dataset.show === name ? 'true' : 'false'));
  };
  $('moreTabs').addEventListener('click', e => { const b = e.target.closest('button'); if (b) showTab(b.dataset.show); });
  showTab('voices');
}

// the detailed controls can sit behind a MORE button
// Inside another site only the simple part is shown: MORE leads to Tide's own page, where the
// full controller is. It opens in the same tab, so the browser's back button returns to the site.
if (EMBED && $('moreBtn')) {
  $('moreBtn').textContent = 'MORE →';
  $('moreBtn').title = 'Open the full controller on Tide\'s own page';
  $('moreBtn').addEventListener('click', () => { location.href = new URL('../#controller', import.meta.url).href; });
} else if ($('moreBtn')) $('moreBtn').addEventListener('click', () => {
  const open = $('more').hidden;
  $('more').hidden = !open; $('moreBtn').setAttribute('aria-expanded', open ? 'true' : 'false');
  $('moreBtn').textContent = open ? 'LESS' : 'MORE';
  showAll();
});

/* ---------- the pad: density, drift and room as one picture (where the page has one) ---------- */
if ($('picture')) picture($('picture'), {
  get: () => ({ density: state.act.reduce((a, x) => a + x, 0) / state.act.length, drift: state.drift, room: state.room }),
  // the pad moves the page's own controls, so everything stays in one place
  set: (name, v) => { if (+$(name).value !== v) { $(name).value = v; $(name).dispatchEvent(new Event('input')); } } }, VOICES.length);
/* ---------- the voices as lines, and the harmony as a keyboard (where the page has them) ---------- */
export const drawLines = $('lines') ? lines($('lines'), {
  names: VOICES.map(v => v[1]), on: v => state.on[v], lvl: v => state.lvl[v], chosen: v => chosen.has(v), dB,
  about: v => `${voiceNames[v]}: ${VOICES[v][2]}.\nClick the name: on or off. Click the line: choose it (shift-click: several). Drag: level.`,
  toggle: toggleVoice, choose: selectVoice,
  level: (v, x) => { state.lvl[v] = x; engine.send('lvl' + v, x); save(); } }) : () => {};

// twelve keys: the lit ones are the scale sounding now, the dot is the note it is on,
// and a click chooses the home note
const keys = $('keys') ? NOTES.map((name, i) => {
  const b = document.createElement('button');
  b.type = 'button'; b.textContent = name; b.className = name.length > 1 ? 'black' : '';
  b.addEventListener('click', () => { $('tonic').value = i; $('tonic').dispatchEvent(new Event('change')); showKeys(); });
  return $('keys').appendChild(b);
}) : [];
let nowNote = -1, nowScale = -1;
export function showKeys(note = nowNote, scale = nowScale) {
  nowNote = note; nowScale = scale;
  keys.forEach((b, i) => {
    b.classList.toggle('in', note >= 0 && SCALES[scale].includes((i - note + 12) % 12));
    b.classList.toggle('now', i === note);
    b.setAttribute('aria-pressed', i === state.tonic ? 'true' : 'false');
  });
  put('scaleTxt', note < 0 ? '' : `now ${COLOURS[scale]} on ${NOTES[note]}`);
  // the menu of the scale that is sounding is the bright one
  ['colA', 'colB'].forEach(k => $(k).classList.toggle('on', note >= 0 && state[k] === scale));
}
showKeys();

showController(!EMBED && location.hash === '#controller');
// arriving from another site's MORE: show everything
if (!EMBED && location.hash === '#controller' && $('moreBtn')) $('moreBtn').click();
