// Track data. Lengths are world units; obstacle/coin patterns are [kind, dz, lane(-1..1), height].
const LANE_W = 0.62;   // lane -1..1 -> lateral units
const FORK_C = 2.4;    // lateral centre of each branch once the fork has fully opened

// Obstacle collision boxes: half-width (lateral units) and vertical span above ground.
// Heights are checked against the player's body: standing 0-24, sliding 0-8, jumping rises to ~40.
const OBST = {
  crate:   { hw: 0.17, y0: 0,  y1: 14 },  // wooden crate: jump over (or steer around)
  barrier: { hw: 0.39, y0: 0,  y1: 9 },   // low barrier / fallen branch: jump over
  over:    { hw: 0.55, y0: 14, y1: 48 },  // banner / hanging vines: slide under
};

const PATTERNS = {
  line:      [['coin', 0, 0], ['coin', 26, 0], ['coin', 52, 0], ['coin', 78, 0], ['coin', 104, 0]],
  crateJump: [['coin', 20, 0, 14], ['coin', 40, 0, 28], ['crate', 62, 0], ['coin', 62, 0, 38], ['coin', 84, 0, 28], ['coin', 104, 0, 14]],
  slideGate: [['coin', 40, 0, 6], ['coin', 60, 0, 6], ['over', 70, 0], ['coin', 80, 0, 6], ['coin', 100, 0, 6]],
  dodgeL:    [['coin', 20, 1], ['coin', 45, 1], ['crate', 60, -1], ['coin', 70, 1], ['coin', 95, 1]],
  dodgeR:    [['coin', 20, -1], ['coin', 45, -1], ['crate', 60, 1], ['coin', 70, -1], ['coin', 95, -1]],
  rowL:      [['coin', 30, 1], ['crate', 55, -1], ['crate', 55, 0], ['coin', 55, 1], ['coin', 80, 1]],
  rowR:      [['coin', 30, -1], ['crate', 55, 1], ['crate', 55, 0], ['coin', 55, -1], ['coin', 80, -1]],
  zig:       [['coin', 10, -1], ['coin', 35, -0.5], ['coin', 60, 0], ['coin', 85, 0.5], ['coin', 110, 1], ['crate', 60, 1]],
  hurdle:    [['coin', 30, 0, 12], ['barrier', 62, 0], ['coin', 62, 0, 26], ['coin', 94, 0, 12]],
  // riskier: free coins on the safe edge, but a high coin hangs over the crates and needs a well-timed jump
  risky:     [['coin', 20, 1], ['crate', 55, -1], ['crate', 55, 0], ['coin', 55, 0, 38], ['coin', 55, 1], ['coin', 90, 1]],
  twin:      [['crate', 60, -1], ['crate', 60, 1], ['coin', 30, 0], ['coin', 60, 0], ['coin', 90, 0]],
};

// Track = a sequence of pieces. A piece is a segment ({seg}) or a junction ({fork}).
//  segment.curve : lateral bump (world units) the road swings through, returning to centre at both ends
//  fork          : zone (roads diverge) + branchLen (two parallel roads) + merge (roads rejoin)
// The sequence repeats from `loopFrom` so the run is endless but fully deterministic.
const TRACK = {
  segments: {
    cityStart: { name: 'OLD TOWN',      biome: 'city',   length: 900,  curve: 0,    first: 420, spacing: 210,
                 patterns: ['line', 'crateJump', 'hurdle', 'slideGate'] },
    cityRun:   { name: 'OLD TOWN',      biome: 'city',   length: 1000, curve: 1.1,  first: 60,  spacing: 210,
                 patterns: ['rowR', 'hurdle', 'crateJump', 'slideGate', 'dodgeL', 'risky', 'line'] },
    forest:    { name: 'GREENWOOD',     biome: 'forest', curve: -1.2, first: 80, spacing: 210,
                 patterns: ['dodgeR', 'zig', 'twin', 'hurdle', 'dodgeL', 'slideGate', 'risky', 'zig'] },
    detour:    { name: 'MARKET DETOUR', biome: 'market', curve: 1.0,  first: 80, spacing: 210,
                 patterns: ['rowL', 'slideGate', 'line', 'crateJump', 'rowR', 'hurdle', 'slideGate', 'line'] },
    plaza:     { name: 'OLD TOWN',      biome: 'city',   length: 800,  curve: -0.9, first: 100, spacing: 210,
                 patterns: ['line', 'dodgeR', 'hurdle', 'rowL', 'risky'] },
  },
  forks: {
    gate: { zone: 440, branchLen: 1300, merge: 360, blend: 450,
            left:  { route: 'forest', sign: 'signForest' },
            right: { route: 'detour', sign: 'signMarket' } },
  },
  sequence: [{ seg: 'cityStart' }, { seg: 'cityRun' }, { fork: 'gate' }, { seg: 'plaza' }],
  loopFrom: 1,
};
