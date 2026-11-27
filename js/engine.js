// Tide: the sound engine. Loads Csound, the piece and the HRTF data; starts and stops it;
// passes numbers in and out. Knows nothing about the page.

import { PIECES } from './config.js';

const RATES = [44100, 48000, 96000];

// Tide's own files are found relative to this script, so the piece also works when the
// page that shows it lives on another site.
const BASE = new URL('..', import.meta.url).href;
// Csound itself is kept with Tide (vendor/csound.js), so nothing is fetched from anyone else's server
const CSOUND_URL = BASE + 'vendor/csound.js';

const fetchText = url => fetch(BASE + url).then(r => { if (!r.ok) throw new Error(url); return r.text(); });

// The piece is one .csd that #includes its parts. They are fetched and joined here, so
// Csound in the browser receives a single text.
const sources = {};
export function getSource(piece) {
  return sources[piece] ??= (async () => {
    const url = PIECES[piece], dir = url.slice(0, url.lastIndexOf('/') + 1);
    let text = await fetchText(url);
    const names = [...text.matchAll(/^#include "([^"]+)"$/gm)].map(m => m[1]);
    const parts = await Promise.all(names.map(n => fetchText(dir + n)));
    names.forEach((n, i) => { text = text.replace(`#include "${n}"`, () => parts[i]); });
    return text;
  })();
}

const hrtf = {};
function getHrtf(rate) {
  return hrtf[rate] ??= Promise.all(['left', 'right'].map(ear => {
    const f = `hrtf-${rate}-${ear}.dat`;
    return fetch(BASE + 'media/hrtf/' + f).then(r => { if (!r.ok) throw new Error(f); return r.arrayBuffer(); })
      .then(b => [f, new Uint8Array(b)]);
  }));
}

// Start loading early, so PLAY is quick: Csound, the piece, and the HRTF data for the most
// common sample rate (another rate's data is fetched at the start, if it is needed).
const modP = import(CSOUND_URL);
export const loaded = Promise.all([modP, getSource('tide'), getHrtf(48000)]);
loaded.catch(() => {});

let cs = null;
export const isRunning = () => cs !== null;

// Start a piece with every control already set. Throws if the browser cannot play it.
// audioContext: optional; one the page opened during a click, so the browser lets it sound.
export async function start(piece, channels, audioContext) {
  const mod = await modP;
  const text = await getSource(piece);
  const make = async opts => {
    const c = await mod.Csound(opts);
    if (await c.compileCsdText(text) !== 0) throw new Error('compile failed');
    const rate = Math.round(await c.getSr());
    if (!RATES.includes(rate)) throw new Error('no HRTF data for ' + rate + ' Hz');
    for (const [f, data] of await getHrtf(rate)) await c.fs.writeFile(f, data);
    for (const k in channels) await c.setControlChannel(k, channels[k]);
    await c.setControlChannel('ui', 1);  // from now on the piece follows the page's controls
    await c.start();
    return c;
  };
  const own = audioContext ? { audioContext } : {};
  try { cs = await make(own); }
  catch (e) { console.warn('Tide: retrying with ScriptProcessor', e); cs = await make({ ...own, useSPN: true }); }
}

export async function stop() {
  const c = cs; cs = null;
  if (c) { try { await c.stop(); await c.destroy(); } catch (e) {} }
}

// set one control; ignored when nothing is playing
export function send(name, value) { if (cs) cs.setControlChannel(name, value).catch(() => {}); }

// read several values back from the piece; null if it stopped meanwhile
export async function read(names) {
  const c = cs;
  if (!c) return null;
  try {
    const values = await Promise.all(names.map(n => c.getControlChannel(n)));
    return cs === c ? values : null;
  } catch (e) { return null; }
}
