// Tide: the page. Connects the controls in index.html to the state and the sound engine.

import { VOICES, NOTES, COLOURS, MOODS, PRESETS, WAIT0, DIV_HINT, TEST_SECTIONS } from './config.js';
import { state, save, gather, tonicOffset, allChannels } from './state.js';
import * as engine from './engine.js';
import { multislider, tabs } from './multislider.js';

const $ = id => document.getElementById(id);
const voiceNames = VOICES.map(v => v[0]);
let piece = 'tide', playing = false, timer = null, t0 = 0, lastBits = 0;

// When Tide is shown inside another site (<html data-tide-embed>), it leaves the page's
// address alone, and the host can quiet it (window.Tide.quiet) while its own audio plays.
const EMBED = document.documentElement.hasAttribute('data-tide-embed');
let quiet = false;
const sendVol = () => engine.send('vol', quiet ? 0 : state.vol);

/* ---------- changes waiting to be heard ----------
   Controls marked "next phrase" are read by a voice when its phrase begins, so a change
   stays pending (yellow) until that voice's button lights up again. */
const pending = { act: new Set(), div: new Set(), wait: new Set() };
const isPending = (kind, v) => playing && pending[kind].has(v);

function showPending() {
  const names = set => [...set].map(v => voiceNames[v]).join(', ');
  $('pendAct').textContent = playing && pending.act.size ? `Waiting for the next phrase of: ${names(pending.act)}` : '';
  $('pendDiv').textContent = isPending('div', state.divVoice) ? `${voiceNames[state.divVoice]} will play this from its next phrase` : '';
  $('pendWait').textContent = isPending('wait', state.waitVoice) ? `${voiceNames[state.waitVoice]} will use this from its next phrase` : '';
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
$('bin').addEventListener('click', () => { state.bin = state.bin ? 0 : 1; showBin(); engine.send('bin', state.bin); save(); });

function applyPreset(i) {
  const p = PRESETS[i], moodChanged = state.mood !== p.mood;
  Object.assign(state, { preset: i, mood: p.mood, room: p.room, on: p.on.slice(),
    act: VOICES.map(() => p.act),
    // every rest longer by `slower`; a WAIT bar stays a WAIT bar
    waits: WAIT0.map(row => row.map(x => x >= 0.95 ? x : Math.min(0.9, x + p.slower))) });
  VOICES.forEach((_, v) => { pending.act.add(v); pending.wait.add(v); });
  const ch = allChannels();
  for (const k in ch) if (k !== 'gather' && k !== 'vol') engine.send(k, ch[k]);
  if (moodChanged) askGather();
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
  $('toggles').appendChild(b);
  return b;
});

// level is a volume: gain = (2 × value)², shown in decibels
const dB = v => v <= 0 ? 'off' : (v === 0.5 ? '0' : (v > 0.5 ? '+' : '') + Math.round(40 * Math.log10(2 * v)));

const drawAct = multislider($('msAct'), { arr: () => state.act, min: 0, max: 1, step: 0.01,
  fmt: v => Math.round(v * 100), name: v => voiceNames[v].toLowerCase() + ' activity',
  dim: v => !state.on[v], pend: v => isPending('act', v),
  onChange: (v, x) => { engine.send('act' + v, x); pending.act.add(v); showPending(); save(); } });
const drawLvl = multislider($('msLvl'), { arr: () => state.lvl, min: 0, max: 1, step: 0.01,
  fmt: dB, name: v => voiceNames[v].toLowerCase() + ' level', dim: v => !state.on[v],
  onChange: (v, x) => { engine.send('lvl' + v, x); save(); } });
function showVoices() {
  togBtns.forEach((b, v) => b.setAttribute('aria-pressed', state.on[v] ? 'true' : 'false'));
  drawAct(); drawLvl();
}

/* ---------- controller: shared settings ---------- */
NOTES.forEach((name, i) => $('tonic').add(new Option(name, i)));
MOODS.forEach((name, i) => $('mood').add(new Option(name, i)));
$('tonic').addEventListener('change', e => { state.tonic = +e.target.value; engine.send('tonic', tonicOffset()); askGather(); save(); });
$('mood').addEventListener('change', e => { state.mood = +e.target.value; state.preset = -1; engine.send('mood', state.mood); askGather(); drawPresets(); save(); });
['room', 'drift'].forEach(k => $(k).addEventListener('input', e => { state[k] = +e.target.value; engine.send(k, state[k]); save(); }));

/* ---------- controller: rhythm and breath, one row per voice ---------- */
const drawDiv = multislider($('msDiv'), { arr: () => state.divs[state.divVoice], min: 0, max: 4, step: 1,
  fmt: v => v ? v : '—', name: i => 'beat ' + (i + 1), foot: true, pend: () => isPending('div', state.divVoice),
  onChange: (i, x) => { engine.send(`div${state.divVoice}_${i}`, x); pending.div.add(state.divVoice); showPending(); save(); } });
const drawDivTabs = tabs($('divTabs'), voiceNames, () => state.divVoice, v => { state.divVoice = v; showRhythm(); save(); });
function showRhythm() {
  drawDivTabs(); showPending();
  $('divHint').textContent = '8 beats, played twice in each phrase, left to right. ' + DIV_HINT[state.divVoice];
}

const drawWait = multislider($('msWait'), { arr: () => state.waits[state.waitVoice], min: 0, max: 1, step: 0.01,
  fmt: v => v >= 0.95 ? 'WAIT' : Math.round(1 + 9 * v) + ' s', name: i => 'rest after phrase ' + (i + 1), foot: true,
  pend: () => isPending('wait', state.waitVoice),
  onChange: (i, x) => { engine.send(`wait${state.waitVoice}_${i}`, x); pending.wait.add(state.waitVoice); showPending(); save(); } });
const drawWaitTabs = tabs($('waitTabs'), voiceNames, () => state.waitVoice, v => { state.waitVoice = v; drawWaitTabs(); showPending(); save(); });

function showAll() {
  showVol(); showBin(); showVoices(); drawPresets(); showRhythm(); drawWaitTabs();
  $('room').value = state.room; $('drift').value = state.drift; $('tonic').value = state.tonic; $('mood').value = state.mood;
}
showAll();

/* ---------- the controller opens from the front page ---------- */
function showController(open) {
  $('controller').hidden = !open; $('controller').style.display = open ? 'flex' : 'none';
  $('ctlBtn').textContent = open ? 'CLOSE CONTROLLER' : 'OPEN CONTROLLER';
  $('ctlBtn').setAttribute('aria-expanded', open ? 'true' : 'false');
  if (!EMBED) history.replaceState(null, '', open ? '#controller' : location.pathname + location.search);
}
$('ctlBtn').addEventListener('click', () => showController($('controller').hidden));
showController(!EMBED && location.hash === '#controller');

/* ---------- play / pause ---------- */
function setStatus(html) { $('status').innerHTML = html; }

async function start() {
  $('play').disabled = true; setStatus('starting…');
  try {
    await engine.start(piece, { ...allChannels(), vol: quiet ? 0 : state.vol });
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
  setStatus(`<b>playing</b> · ${state.bin ? 'binaural' : 'stereo'} · ${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`);
  const values = await engine.read(['level', 'runbits', 'colour_now', 'tonic_now', 'section_now']);
  if (!values || !playing) return;
  const [level, bitsF, colour, tonic, section] = values, bits = Math.round(bitsF);
  $('meter').style.width = Math.min(100, level * 400) + '%';
  togBtns.forEach((b, v) => b.classList.toggle('run', !!(bits & (1 << v))));

  // a voice that has just begun a phrase has read its controls: nothing of its is pending now
  const begun = bits & ~lastBits; lastBits = bits;
  let cleared = false;
  VOICES.forEach((_, v) => { if (begun & (1 << v)) for (const k in pending) cleared = pending[k].delete(v) || cleared; });
  if (cleared) showPending();

  // a new section answers a root or harmony change
  if (gather.section < 0) gather.section = section;
  if (section !== gather.section) { gather.section = section; gather.waiting = false; }

  const key = `<b>${COLOURS[Math.round(colour)] || ''}</b> on <b>${NOTES[(((Math.round(tonic) + 2) % 12) + 12) % 12]}</b>`;
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
