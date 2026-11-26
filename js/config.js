// Tide: the fixed data. Names, presets and starting values; no behaviour.

export const PIECES = { tide: 'csound/tide.csd', test: 'lab/binaural-test-web.csd' };

export const VOICES = [['COUNTER', 'CNTR'], ['BASS', 'BASS'], ['CHORDS', 'CHRD'],
  ['DROPS', 'DROP'], ['WAVES', 'WAVE'], ['SHIMMER', 'SHIM'], ['FLYER', 'FLY']];
export const NOTES = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
export const COLOURS = ['whole-tone', 'pentatonic', 'half-whole (dark)'];
export const MOODS = ['Debussy', 'Dark'];

// Rhythm rows (notes in each of 8 beats) and breath rows (rest after each of 8 phrases).
// The same numbers are the defaults in csound/harmony.inc.
export const DIV0 = [[0, 1, 0, 0, 1, 0, 0, 0], [1, 0, 0, 0, 0, 0, 0, 0], [1, 0, 0, 0, 0, 0, 0, 0],
  [1, 0, 2, 0, 0, 1, 0, 0], [1, 1, 2, 2, 3, 2, 1, 1], [0, 0, 0, 0, 1, 0, 0, 0], [0, 0, 0, 0, 0, 0, 1, 0]];
export const WAIT0 = [[0.4, 0.3, 0.6, 0.4, 0.3, 0.5, 0.4, 1],
  [0.2, 0.2, 0.4, 0.2, 0.2, 0.3, 0.2, 1], [0.2, 0.2, 0.3, 0.2, 0.2, 0.3, 0.2, 1],
  [0.3, 0.5, 0.3, 0.8, 0.3, 0.5, 0.3, 0.6], [0.2, 0.2, 0.3, 0.2, 0.2, 0.3, 0.2, 0.4],
  [0.8, 0.5, 0.9, 0.6, 0.8, 0.5, 0.9, 0.7], [0.9, 0.8, 0.9, 0.9, 0.7, 0.9, 0.9, 0.9]];

// Front-page choices. mood: 0 Debussy, 1 dark. act: activity of every voice.
// slower: added to every rest (0 = as written above). on: which voices sound, in the order
//                                                              counter bass chords drops waves shimmer flyer
export const PRESETS = [
  { name: 'TIDE',  mood: 0, room: 0.5,  act: 0.5,  slower: 0,   on: [1, 1, 1, 1, 1, 1, 1], title: 'Debussy harmony, all seven voices' },
  { name: 'CALM',  mood: 0, room: 0.6,  act: 0.25, slower: 0.3, on: [1, 1, 1, 1, 1, 0, 0], title: 'Fewer notes and longer rests; no shimmer or flyer' },
  { name: 'DARK',  mood: 1, room: 0.3,  act: 0.5,  slower: 0,   on: [1, 1, 1, 0, 1, 0, 1], title: 'Polychords in the half-whole scale; no drops or shimmer; drier' },
  { name: 'BARE',  mood: 0, room: 0.35, act: 0.5,  slower: 0,   on: [1, 1, 0, 1, 0, 0, 0], title: 'Bowed string, plucked bass and porcelain drops only' },
  { name: 'WATER', mood: 0, room: 0.6,  act: 0.5,  slower: 0,   on: [0, 0, 0, 1, 1, 1, 1], title: 'No pitched voices: drops, waves, shimmer and flyer' }];

export const DEFAULTS = { vol: 0.35, bin: 1, room: 0.5, drift: 0.5, tonic: 2, mood: 0, preset: 0,
  on: VOICES.map(() => 1), act: VOICES.map(() => 0.5), lvl: VOICES.map(() => 0.5),
  divs: DIV0.map(r => r.slice()), waits: WAIT0.map(r => r.slice()), divVoice: 0, waitVoice: 0 };

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
