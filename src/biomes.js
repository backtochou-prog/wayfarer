// Shared colour constants and biome definitions. Add a biome by adding an entry here
// (plus scenery/prop sprites in sprites.js and a segment in track.js).
const C = {
  ink: '#1b1420', plum: '#2e2233',
  burg: '#6b2737', burgD: '#4a1a2b', burgL: '#8e3a4a',
  amber: '#e8a33d', amberL: '#f3cf7a', amberD: '#b87a2a',
  teal: '#2b7a78', tealD: '#17484f', tealL: '#7fc4b8',
  forest: '#2f6b3a', forestD: '#1d4a2c', moss: '#5d8a3c', mossL: '#8aab4e',
  earth: '#8a6a4a', earthD: '#5a4232', sand: '#c9a979', sandD: '#b3935f', sandL: '#e3cfa0',
  terra: '#a5533d', terraD: '#7d3a2e', terraL: '#c46a47',
  stone: '#8d8478', stoneD: '#675f58', stoneL: '#b3aa9b', bone: '#efe3c8',
};

const BIOMES = {
  city: {
    name: 'OLD TOWN', skyline: 'city', props: 'city', density: 0.3, margin: 0.5,
    sky: ['#22434f', '#2f5e66', '#5f9c98', '#e0aa5c'],
    ground: ['#6a5444', '#725b49'],
    road: ['#8d8478', '#80776c'],
    curb: [C.sand, C.sandD],
    line: C.amber,
    layers: ['#52304a', '#8a4636', '#5a2a30'], detail: 'cobble',
    scenery: ['homeA', 'homeB', 'lamp', 'homeA', 'fenceC', 'homeB', 'shopSign', 'tower', 'lamp', 'fenceC'],
  },
  forest: {
    name: 'GREENWOOD', skyline: 'forest', props: 'forest', density: 0.08, margin: 0.3, deep: true,
    sky: ['#17353a', '#25504c', '#4f8c74', '#c2c075'],
    ground: ['#3a6a32', '#336030'],
    road: ['#8a6a4a', '#7d6044'],
    curb: [C.moss, '#4f7a34'],
    line: '#8a6a4a',
    layers: ['#1f4a45', '#1d4a2c', '#153a25'], detail: 'dirt',
    scenery: ['conifer', 'pine', 'conifer', 'rock', 'broad', 'fenceW', 'pine', 'bush', 'fenceW', 'conifer'],
  },
  // warm, busy city detour: more buildings, lamps and market furniture
  market: {
    name: 'MARKET', skyline: 'city', props: 'city', density: 0.15, margin: 0.4,
    sky: ['#3b2f4f', '#7c3f50', '#c9704a', '#f2b862'],
    ground: ['#7a5a46', '#84634c'],
    road: ['#a08c74', '#948068'],
    curb: [C.sandL, C.sand],
    line: C.amberL,
    layers: ['#52304a', '#8a4636', '#5a2a30'], detail: 'cobble',
    scenery: ['homeB', 'stall', 'lamp', 'homeA', 'shopSign', 'stall', 'bench', 'lamp', 'homeB', 'fenceC'],
  },
};

// night neon quarter (the 3D build's NEON QUARTER district; the 2D game just gets a dark palette so the shared track works)
BIOMES.neon = {
  name: 'NEON QUARTER', skyline: 'city', props: 'city', density: 0.2, margin: 0.4,
  sky: ['#05060f', '#120a2a', '#2a1250', '#5a1c6a'],
  ground: ['#0e1424', '#0b1020'],
  road: ['#1a2238', '#141c30'],
  curb: ['#2a1a4a', '#241540'],
  line: '#ff2fd0',
  layers: ['#1a1030', '#2a1448', '#14102a'], detail: 'cobble',
  scenery: ['homeB', 'lamp', 'tower', 'shopSign', 'lamp', 'homeA', 'tower', 'lamp', 'shopSign', 'homeB'],
};

// sunset tram street (the 3D build's TRAM STREET district; the 2D game just gets a warm dusk palette so the shared track works)
BIOMES.tram = {
  name: 'TRAM STREET', skyline: 'city', props: 'city', density: 0.25, margin: 0.4,
  sky: ['#7b8fa6', '#b8a898', '#e8b080', '#f6c48c'],
  ground: ['#5a3c36', '#52362f'],
  road: ['#6a4a46', '#5e4140'],
  curb: ['#a89484', '#9c8878'],
  line: '#cfc7c0',
  layers: ['#4a2f38', '#7a4a3e', '#5a3036'], detail: 'cobble',
  scenery: ['homeA', 'lamp', 'homeB', 'shopSign', 'lamp', 'homeA', 'fenceC', 'homeB', 'lamp', 'tower'],
};

const _rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
function lerpHex(a, b, t) {
  if (t <= 0) return a;
  const A = _rgb(a), B = _rgb(b);
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('');
}
function lerpPalette(a, b, t) {
  const o = { line: lerpHex(a.line, b.line, t) };
  for (const k of ['sky', 'ground', 'road', 'curb']) o[k] = a[k].map((c, i) => lerpHex(c, b[k][i], t));
  return o;
}
// Palette between the opening biome and `toId`, quantised to 8 steps so the shift reads as pixel bands.
const _palCache = new Map();
function paletteFor(toId, t) {
  const q = Math.round(t * 8), key = toId + q;
  if (!_palCache.has(key)) _palCache.set(key, lerpPalette(BIOMES[TRACK.base || TRACK.segments[TRACK.sequence[0].seg].biome], BIOMES[toId], q / 8));
  return _palCache.get(key);
}
