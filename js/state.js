// Tide: what the controls are set to, kept between visits, and how it is sent to Csound.

import { DEFAULTS, VOICES, PHONE } from './config.js';

const KEY = 'tideState11';

export const state = structuredClone(DEFAULTS);
// a first visit on a phone: plain stereo (which runs the light engine) and no shimmer or flyer
if (PHONE) { state.bin = 0; state.on[5] = state.on[6] = 0; }
// Settings are kept between visits on Tide's own page. Inside another site (data-tide-embed)
// every visit begins with the TIDE sound; only the volume and the binaural switch are kept.
try {
  const kept = JSON.parse(localStorage.getItem(KEY) || '{}');
  if (document.documentElement.hasAttribute('data-tide-embed')) { if ('vol' in kept) state.vol = kept.vol; if ('bin' in kept) state.bin = kept.bin; }
  else Object.assign(state, kept);
} catch (e) {}
export function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }

// What is happening now (not saved). quiet: a host page has asked for silence. lite: the light
// engine (no binaural processing, about a third of the work) is running; it is chosen when a
// performance starts with binaural off, so turning binaural on then needs a fresh start.
export const live = { playing: false, quiet: false, lite: 0 };

// Root and harmony are read by the piece at a shared silence. The page asks for one by
// raising this number; `waiting` is true until the piece answers with a new section.
export const gather = { sent: 0, section: -1, waiting: false };

// The piece counts its tonic in semitones away from D, kept within -5..+6.
export const tonicOffset = () => ((state.tonic - 2 + 5 + 12) % 12) - 5;

// Every control as a Csound channel: name -> number.
export function allChannels() {
  const ch = { vol: state.vol, bin: state.bin, room: state.room, drift: state.drift, cut: 3750,
    tonic: tonicOffset(), colA: state.colA, colB: state.colB, side: 0, gather: gather.sent };
  VOICES.forEach((_, v) => {
    ch['on' + v] = state.on[v]; ch['act' + v] = state.act[v]; ch['lvl' + v] = state.lvl[v];
    for (let i = 0; i < 8; i++) { ch[`div${v}_${i}`] = state.divs[v][i]; ch[`wait${v}_${i}`] = state.waits[v][i]; }
  });
  return ch;
}
