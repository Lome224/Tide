// Tide: the fixed data. Names, presets and starting values; no behaviour.

// a phone: a touch screen that is also small. Phones start with the light engine and fewer voices.
export const PHONE = typeof matchMedia === 'function' && matchMedia('(pointer:coarse) and (max-width:820px)').matches;

export const PIECES = { tide: 'csound/tide.csd', test: 'lab/binaural-test-web.csd' };

// each voice: its name, a short name, and what it sounds like
export const VOICES = [
  ['COUNTER', 'CNTR', 'a bowed string playing a slow melody'],
  ['BASS', 'BASS', 'a plucked string holding a low note'],
  ['CHORDS', 'CHRD', 'an aeolian harp: strings sounded by wind'],
  ['DROPS', 'DROP', 'water dripping onto glazed porcelain'],
  ['WAVES', 'WAVE', 'surf: slow swells of filtered noise'],
  ['SHIMMER', 'SHIM', 'porcelain shards touching, high and bright'],
  ['FLYER', 'FLY', 'a sound that passes close by and away']];
export const NOTES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
// The ten scales, in the order csound/harmony.inc numbers them: name, and notes in semitones
// above the root. Two are chosen and the piece alternates between them.
export const COLOURS = ['whole-tone', 'Gong 宫', 'octatonic', 'Dorian', 'Phrygian', 'Lydian', 'Yu 羽', 'Jue 角', 'Iwato 岩戸', 'Hirajoshi 平調子'];
export const SCALES = [[1, 3, 5, 7, 9, 11], [0, 2, 4, 7, 9], [0, 1, 3, 4, 6, 7, 9, 10], [0, 2, 3, 5, 7, 9, 10], [0, 1, 3, 5, 7, 8, 10],
  [0, 2, 4, 6, 7, 9, 11], [0, 3, 5, 7, 10], [0, 3, 5, 8, 10], [0, 1, 5, 6, 10], [0, 2, 3, 7, 8]];
// the order they are offered in: modes, symmetric scales, Chinese, Japanese
export const COLOUR_MENU = [3, 4, 5, 2, 0, 1, 6, 7, 8, 9];

// Rhythm rows (notes in each of 8 beats) and breath rows (rest after each of 8 phrases).
// The same numbers are the defaults in csound/harmony.inc.
export const DIV0 = [[0, 1, 0, 0, 1, 0, 0, 0], [1, 0, 0, 0, 0, 0, 0, 0], [1, 0, 0, 0, 0, 0, 0, 0],
  [1, 0, 2, 0, 0, 1, 0, 0], [1, 1, 2, 2, 3, 2, 1, 1], [0, 0, 0, 0, 1, 0, 0, 0], [0, 0, 0, 0, 0, 0, 1, 0]];
export const WAIT0 = [[0.4, 0.3, 0.6, 0.4, 0.3, 0.5, 0.4, 1],
  [0.2, 0.2, 0.4, 0.2, 0.2, 0.3, 0.2, 1], [0.2, 0.2, 0.3, 0.2, 0.2, 0.3, 0.2, 1],
  [0.3, 0.5, 0.3, 0.8, 0.3, 0.5, 0.3, 0.6], [0.2, 0.2, 0.3, 0.2, 0.2, 0.3, 0.2, 0.4],
  [0.8, 0.5, 0.9, 0.6, 0.8, 0.5, 0.9, 0.7], [0.9, 0.8, 0.9, 0.9, 0.7, 0.9, 0.9, 0.9]];

// The five sounds. pair: the two scales it alternates. act: activity of every voice.
// slower: added to every rest (0 = as written above). on: which voices sound, in the order
//                                                              counter bass chords drops waves shimmer flyer
export const PRESETS = [
  { name: 'TIDE',  pair: [1, 0], room: 0.5,  act: 0.5,  slower: 0,   on: [1, 1, 1, 1, 1, 1, 1], title: 'Gong and whole-tone: bright, then unanchored. All seven voices' },
  { name: 'CALM',  pair: [5, 1], room: 0.6,  act: 0.25, slower: 0.3, on: [1, 1, 1, 1, 1, 0, 0], title: 'Lydian and Gong: two bright scales, a gentle change. Fewer notes, longer rests' },
  { name: 'DARK',  pair: [2, 8], room: 0.3,  act: 0.5,  slower: 0,   on: [1, 1, 1, 0, 1, 0, 1], title: 'Octatonic polychords and Iwato; no drops or shimmer; drier' },
  { name: 'BARE',  pair: [6, 9], room: 0.35, act: 0.5,  slower: 0,   on: [1, 1, 0, 1, 0, 0, 0], title: 'Yu and Hirajoshi, on bowed string, plucked bass and porcelain drops only' },
  { name: 'WATER', pair: [5, 0], room: 0.6,  act: 0.5,  slower: 0,   on: [0, 0, 0, 1, 1, 1, 1], title: 'Lydian and whole-tone on drops, waves, shimmer and flyer; no pitched voices' }];

export const DEFAULTS = { vol: 0.35, bin: 1, room: 0.5, drift: 0.5, tonic: 2, colA: 1, colB: 0, preset: 0,
  on: VOICES.map(() => 1), act: VOICES.map(() => 0.5), lvl: VOICES.map(() => 0.5),
  divs: DIV0.map(r => r.slice()), waits: WAIT0.map(r => r.slice()), divVoice: 0 };

export const DIV_HINT = [
  'Counter: the rhythm of its motif. 1 to 4 = that many notes in the beat; — at the start is silence, later it holds the note before.',
  'Bass: where the bass plucks its pedal note.',
  'Chords: where the chord is struck; each new entry moves the whole shape.',
  'Drops: where drops fall.',
  'Waves: the swell. Each bar is how high the water rises on that beat (— = drawn back, 4 = a full wave).',
  'Shimmer: where a sparkle starts circling your head.',
  'Flyer: where a fly-by may start (activity sets how likely).'];

export const TEST_SECTIONS = [[0, 'A · plain stereo pan (reference)'], [13, 'B · binaural, dry'],
  [26, 'C · binaural + room'], [40, 'D · flyer with Doppler'], [49, 'end of test']];
