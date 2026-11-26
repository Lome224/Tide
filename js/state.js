// Tide: what the controls are set to, kept between visits, and how it is sent to Csound.

import { DEFAULTS, VOICES } from './config.js';

const KEY = 'tideState10';

export const state = structuredClone(DEFAULTS);
try { Object.assign(state, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) {}
export function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }

// Root and harmony are read by the piece at a shared silence. The page asks for one by
// raising this number; `waiting` is true until the piece answers with a new section.
export const gather = { sent: 0, section: -1, waiting: false };

// The piece counts its tonic in semitones away from D, kept within -5..+6.
export const tonicOffset = () => ((state.tonic - 2 + 5 + 12) % 12) - 5;

// Every control as a Csound channel: name -> number.
export function allChannels() {
  const ch = { vol: state.vol, bin: state.bin, room: state.room, drift: state.drift, cut: 3750,
    tonic: tonicOffset(), mood: state.mood, gather: gather.sent };
  VOICES.forEach((_, v) => {
    ch['on' + v] = state.on[v]; ch['act' + v] = state.act[v]; ch['lvl' + v] = state.lvl[v];
    for (let i = 0; i < 8; i++) { ch[`div${v}_${i}`] = state.divs[v][i]; ch[`wait${v}_${i}`] = state.waits[v][i]; }
  });
  return ch;
}
