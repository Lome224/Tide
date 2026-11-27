// Tide: the page. Connects the controls in index.html to the state and the sound engine.

import { PHONE, VOICES, NOTES, COLOURS, SCALES, COLOUR_MENU, PRESETS, WAIT0, DIV_HINT, TEST_SECTIONS } from './config.js';
import { state, save, gather, tonicOffset, allChannels } from './state.js';
import * as engine from './engine.js';
import { multislider, tabs } from './multislider.js';
import { picture } from './picture.js';
import { lines } from './lines.js';
import { CONTROLLER } from './markup.js';

const $ = id => document.getElementById(id);
// the controller's parts are written into the page first, so everything below can find them
if ($('controllerBody')) $('controllerBody').innerHTML = CONTROLLER;
const put = (id, text) => { if ($(id)) $(id).textContent = text; };   // for parts not every page has
const voiceNames = VOICES.map(v => v[0]);
let piece = 'tide', playing = false, timer = null, t0 = 0, lastBits = 0;

// When Tide is shown inside another site (<html data-tide-embed>), it leaves the page's
// address alone, and the host can quiet it (window.Tide.quiet) while its own audio plays.
const EMBED = document.documentElement.hasAttribute('data-tide-embed');
let quiet = false;
// The light engine (no binaural processing at all, about a third of the work) is chosen when a
// performance starts with binaural off. Turning binaural on then needs a fresh start.
let lite = 0;
const sendVol = () => engine.send('vol', quiet ? 0 : state.vol);

/* ---------- changes waiting to be heard ----------
   Controls marked "next phrase" are read by a voice when its phrase begins, so a change
   stays pending (yellow) until that voice's button lights up again. */
const pending = { act: new Set(), div: new Set(), wait: new Set() };
const isPending = (kind, v) => playing && pending[kind].has(v);

function showPending() {
  const names = set => [...set].map(v => voiceNames[v]).join(', ');
  put('pendAct', playing && pending.act.size ? `Waiting for the next phrase of: ${names(pending.act)}` : '');
  put('pendDiv', isPending('div', state.divVoice) ? `${voiceNames[state.divVoice]} will play this from its next phrase` : '');
  put('pendWait', isPending('wait', state.waitVoice) ? `${voiceNames[state.waitVoice]} will use this from its next phrase` : '');
  // for the chosen voices: say that a change is waiting, since it is not heard at once
  put('pendTxt', playing && [...chosen].some(v => pending.act.has(v) || pending.div.has(v) || pending.wait.has(v)) ? 'heard from the next phrase' : '');
  drawAct(); drawDiv(); drawWait();
}

// root and harmony: ask every voice to stop after its phrase, so the piece can begin again
function askGather() {
  if (!playing) return;   // not playing: the new values are simply used at the start
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
  if (playing && lite && state.bin) stop().then(start);
});

function applyPreset(i) {
  const p = PRESETS[i], pairChanged = state.colA !== p.pair[0] || state.colB !== p.pair[1];
  Object.assign(state, { preset: i, colA: p.pair[0], colB: p.pair[1], room: p.room, on: p.on.map((x, v) => PHONE && v >= 5 ? 0 : x),   // phones: no shimmer or flyer
    act: VOICES.map(() => p.act),
    // every rest longer by `slower`; a WAIT bar stays a WAIT bar
    waits: WAIT0.map(row => row.map(x => x >= 0.95 ? x : Math.min(0.9, x + p.slower))) });
  VOICES.forEach((_, v) => { pending.act.add(v); pending.wait.add(v); });
  const ch = allChannels();
  for (const k in ch) if (k !== 'gather' && k !== 'vol') engine.send(k, ch[k]);
  if (pairChanged) askGather();
  showAll(); save();
}
const drawPresets = tabs($('presets'), PRESETS.map(p => p.name), () => state.preset, applyPreset);
[...$('presets').children].forEach((b, i) => { b.title = PRESETS[i].title; });

/* ---------- controller: voices ---------- */
const togBtns = VOICES.map(([name, short], v) => {
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'vbtn';
  b.innerHTML = `<span class="long">${name}</span><span class="short">${short}</span>`;
  b.setAttribute('aria-label', name.toLowerCase());
  b.addEventListener('click', () => {
    state.on[v] = state.on[v] ? 0 : 1; state.preset = -1;
    engine.send('on' + v, state.on[v]); showVoices(); drawPresets(); save();
  });
  if ($('toggles')) $('toggles').appendChild(b);
  return b;
});

// level is a volume: gain = (2 × value)², shown in decibels
const dB = v => v <= 0 ? 'off' : (v === 0.5 ? '0' : (v > 0.5 ? '+' : '') + Math.round(40 * Math.log10(2 * v)));

const drawAct = !$('msAct') ? () => {} : multislider($('msAct'), { arr: () => state.act, min: 0, max: 1, step: 0.01,
  fmt: v => Math.round(v * 100), name: v => voiceNames[v].toLowerCase() + ' activity', foot: VOICES.map(v => v[1]),
  dim: v => !state.on[v], pend: v => isPending('act', v),
  onChange: (v, x) => { engine.send('act' + v, x); pending.act.add(v); showPending(); save(); } });
const drawLvl = !$('msLvl') ? () => {} : multislider($('msLvl'), { arr: () => state.lvl, min: 0, max: 1, step: 0.01,
  fmt: dB, name: v => voiceNames[v].toLowerCase() + ' level', dim: v => !state.on[v], reset: 0.5,
  onChange: (v, x) => { engine.send('lvl' + v, x); save(); } });
function showVoices() {
  togBtns.forEach((b, v) => b.setAttribute('aria-pressed', state.on[v] ? 'true' : 'false'));
  drawAct(); drawLvl();
  if ($('density')) $('density').value = state.act.reduce((a, x) => a + x, 0) / state.act.length;
}
// density: one control that raises or lowers every voice's activity together
if ($('density')) $('density').addEventListener('input', e => {
  // every voice moves by the same amount, so differences made voice by voice are kept
  const by = +e.target.value - state.act.reduce((a, x) => a + x, 0) / state.act.length;
  VOICES.forEach((_, v) => {
    state.act[v] = Math.max(0, Math.min(1, Math.round((state.act[v] + by) * 100) / 100));
    engine.send('act' + v, state.act[v]); pending.act.add(v);
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
$('tonic').addEventListener('change', e => { state.tonic = +e.target.value; engine.send('tonic', tonicOffset()); askGather(); save(); });
['room', 'drift'].forEach(k => $(k).addEventListener('input', e => { state[k] = +e.target.value; engine.send(k, state[k]); showEditor(); save(); }));

/* ---------- controller: rhythm and breath, one row per voice ---------- */
const chosen = new Set([state.divVoice]);
const drawDiv = multislider($('msDiv'), { arr: () => state.divs[state.divVoice], min: 0, max: 4, step: 1,
  fmt: v => v ? v : '—', name: i => 'beat ' + (i + 1), foot: true, pend: () => isPending('div', state.divVoice),
  onChange: (i, x) => { chosen.forEach(v => { state.divs[v][i] = x; engine.send(`div${v}_${i}`, x); pending.div.add(v); }); showPending(); save(); } });
// The chosen voices. The rows show the first of them; a change to notes, rhythm or rests is
// written to every one, so several voices can be shaped in one move.
function selectVoice(v, add) {
  if (!add) { chosen.clear(); chosen.add(v); }
  else if (chosen.has(v) && chosen.size > 1) chosen.delete(v);
  else chosen.add(v);
  state.divVoice = state.waitVoice = Math.min(...chosen);
  showRhythm(); drawWaitTabs(); save();
}
const drawDivTabs = $('divTabs') ? tabs($('divTabs'), voiceNames, () => state.divVoice, v => selectVoice(v)) : () => {};
// what the page shows about the chosen voices (where it has these parts)
function showEditor() {
  const v = state.divVoice;
  put('selTxt', chosen.size === VOICES.length ? 'ALL VOICES' : [...chosen].sort().map(x => voiceNames[x]).join(' + '));
  const same = f => [...chosen].every(x => JSON.stringify(f(x)) === JSON.stringify(f(v)));
  put('mixTxt', same(x => [state.act[x], state.divs[x], state.waits[x]]) ? '' : 'mixed');
  put('phraseTxt', (chosen.size === 1 ? VOICES[v][2] + ' · ' : '') + `phrase ${Math.round(13 + 2.4 * state.drift * v)} beats`);   // the same sum as in csound/machines.inc
  if ($('notes')) $('notes').value = state.act[v];
}
if ($('notes')) $('notes').addEventListener('input', e => {
  chosen.forEach(v => { state.act[v] = +e.target.value; engine.send('act' + v, state.act[v]); pending.act.add(v); });
  showVoices(); showPending(); save();
});
if ($('selAll')) $('selAll').addEventListener('click', () => {
  VOICES.forEach((_, v) => chosen.add(v));
  state.divVoice = state.waitVoice = 0; showRhythm(); drawWaitTabs(); save();
});
function showRhythm() {
  drawDivTabs(); showPending(); showEditor();
  const hint = '8 beats, played twice in each phrase, left to right. ' + DIV_HINT[state.divVoice];
  put('divHint', hint); if ($('divLab')) $('divLab').title = hint;
}

const drawWait = multislider($('msWait'), { arr: () => state.waits[state.waitVoice], min: 0, max: 1, step: 0.01,
  fmt: v => v >= 0.95 ? 'WAIT' : Math.round(1 + 9 * v) + ' s', name: i => 'rest after phrase ' + (i + 1), foot: true,
  pend: () => isPending('wait', state.waitVoice),
  onChange: (i, x) => { chosen.forEach(v => { state.waits[v][i] = x; engine.send(`wait${v}_${i}`, x); pending.wait.add(v); }); showPending(); save(); } });
const drawWaitTabs = $('waitTabs') ? tabs($('waitTabs'), voiceNames, () => state.waitVoice, v => selectVoice(v)) : () => {};

function showAll() {
  showVol(); showBin(); showVoices(); drawPresets(); showRhythm(); drawWaitTabs();
  $('room').value = state.room; $('drift').value = state.drift; $('tonic').value = state.tonic; $('colA').value = state.colA; $('colB').value = state.colB;
}
showAll();

/* ---------- the controller opens from the front page ---------- */
function showController(open) {
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
// full controller is. The piece here is paused first, so two of them are never heard at once.
if (EMBED && $('moreBtn')) {
  $('moreBtn').textContent = 'MORE ↗';
  $('moreBtn').title = 'Open the full controller on Tide\'s own page';
  $('moreBtn').addEventListener('click', () => { if (playing) stop(); window.open(new URL('../#controller', import.meta.url).href, '_blank', 'noopener'); });
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
const drawLines = $('lines') ? lines($('lines'), {
  names: VOICES.map(v => v[1]), on: v => state.on[v], lvl: v => state.lvl[v], chosen: v => chosen.has(v), dB,
  about: v => `${voiceNames[v]}: ${VOICES[v][2]}.\nClick the name: on or off. Click the line: choose it (shift-click: several). Drag: level.`,
  toggle: v => togBtns[v].click(), choose: selectVoice,
  level: (v, x) => { state.lvl[v] = x; engine.send('lvl' + v, x); drawLvl(); save(); } }) : () => {};

// twelve keys: the lit ones are the scale sounding now, the dot is the note it is on,
// and a click chooses the home note
const keys = $('keys') ? NOTES.map((name, i) => {
  const b = document.createElement('button');
  b.type = 'button'; b.textContent = name; b.className = name.length > 1 ? 'black' : '';
  b.addEventListener('click', () => { $('tonic').value = i; $('tonic').dispatchEvent(new Event('change')); showKeys(); });
  return $('keys').appendChild(b);
}) : [];
let nowNote = -1, nowScale = -1;
function showKeys(note = nowNote, scale = nowScale) {
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

/* ---------- play / pause ---------- */
function setStatus(html) { $('status').innerHTML = html; }

async function start() {
  $('play').disabled = true; setStatus('starting…');
  try {
    lite = state.bin ? 0 : 1;
    await engine.start(piece, { ...allChannels(), lite, vol: quiet ? 0 : state.vol });
    for (const k in pending) pending[k].clear();   // everything is read fresh at the start
    playing = true; t0 = performance.now(); lastBits = 0; gather.waiting = false; gather.section = -1;
    $('play').textContent = 'PAUSE';
    timer = setInterval(tick, 150); tick();
  } catch (e) {
    console.error('Tide:', e);
    setStatus('Sound could not start in this browser (' + e.message + ').');
  }
  $('play').disabled = false;
}

async function stop() {
  clearInterval(timer); timer = null; playing = false;
  $('play').textContent = 'PLAY'; $('meter').style.width = '0'; $('now').textContent = '';
  togBtns.forEach(b => b.classList.remove('run'));
  put('keyBox', ''); drawLines(0); showKeys(-1, -1);
  for (const k in pending) pending[k].clear();
  showPending();
  await engine.stop();
  setStatus('Paused. PLAY starts a new performance.');
}
$('play').addEventListener('click', () => playing ? stop() : start());

// for a host page
window.Tide = {
  start: () => playing ? Promise.resolve() : start(),
  stop: () => playing ? stop() : Promise.resolve(),
  quiet: q => { quiet = !!q; sendVol(); },
  controller: open => showController(open === undefined ? $('controller').hidden : open),
  isPlaying: () => playing };
window.dispatchEvent(new Event('tide-ready'));

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
  if (!values || !playing) return;
  const [level, bitsF, colour, tonic, section] = values, bits = Math.round(bitsF);
  $('meter').style.width = Math.min(100, level * 400) + '%';
  togBtns.forEach((b, v) => b.classList.toggle('run', !!(bits & (1 << v))));

  // a voice that has just begun a phrase has read its controls: nothing of its is pending now
  const begun = bits & ~lastBits; lastBits = bits;
  let cleared = false, heard = false;
  VOICES.forEach((_, v) => { if (begun & (1 << v)) for (const k in pending) if (pending[k].delete(v)) { cleared = true; heard = heard || chosen.has(v); } });
  if (cleared) showPending();
  if (heard) { put('pendTxt', 'playing it now'); setTimeout(showPending, 2500); }
  if ($('keys')) $('keys').classList.toggle('wait', gather.waiting);

  // a new section answers a root or harmony change
  if (gather.section < 0) gather.section = section;
  if (section !== gather.section) { gather.section = section; gather.waiting = false; }

  const colourName = COLOURS[Math.round(colour)] || '', note = NOTES[(((Math.round(tonic) + 2) % 12) + 12) % 12];
  put('keyBox', note); drawLines(bits);
  showKeys((((Math.round(tonic) + 2) % 12) + 12) % 12, Math.round(colour));
  const key = `<b>${colourName}</b> on <b>${note}</b>`;
  $('now').innerHTML = gather.waiting
    ? key + ' · <span style="color:var(--glow)">change requested: the voices are finishing their phrases, then it begins again</span>'
    : key + ((bits & 7) === 0 && t > 3 ? ' · counter, bass and chords are silent' : '');
}

/* ---------- binaural test and code view (only on Tide's own page) ---------- */
function selectPiece(p) {
  piece = p;
  $('pTest').setAttribute('aria-pressed', p === 'test');
  $('pTest').textContent = p === 'test' ? 'BACK TO TIDE' : 'BINAURAL TEST';
  $('bin').disabled = p === 'test';
  if ($('code') && $('code').style.display === 'block') renderCode();
  if (playing) stop().then(start);
  else setStatus(p === 'test' ? 'Binaural test: one source, four ways, about 50 s. Press PLAY.' : 'Starts quietly and fades in. Headphones recommended.');
}
if ($('pTest')) $('pTest').addEventListener('click', () => selectPiece(piece === 'test' ? 'tide' : 'test'));

const esc = s => s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
async function renderCode() {
  const text = await engine.getSource(piece);
  $('code').innerHTML = text.split('\n').map(l => {
    const i = l.indexOf(';');
    return i < 0 ? esc(l) : esc(l.slice(0, i)) + '<span class="c">' + esc(l.slice(i)) + '</span>';
  }).join('\n');
}
if ($('codeBtn')) $('codeBtn').addEventListener('click', async () => {
  const open = $('code').style.display !== 'block';
  if (open) await renderCode();
  $('code').style.display = open ? 'block' : 'none';
  $('codeBtn').textContent = open ? 'HIDE CODE' : 'CODE';
});
