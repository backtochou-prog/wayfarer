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
  // lane trails: a line of coins hugging one lane edge, rewarding the player who commits to that lane
  trailL:    [['coin', 0, -1], ['coin', 18, -1], ['coin', 36, -1], ['coin', 54, -1], ['coin', 72, -1], ['coin', 90, -1], ['coin', 108, -1]],
  trailR:    [['coin', 0, 1], ['coin', 18, 1], ['coin', 36, 1], ['coin', 54, 1], ['coin', 72, 1], ['coin', 90, 1], ['coin', 108, 1]],
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
    cityStart: { name: 'OLD TOWN',      biome: 'city',   length: 900,  curve: 0,    first: 420, spacing: 210, calmStart: true,   // calmStart: the run always opens with the first (hazard-free) pattern
                 patterns: ['line', 'crateJump', 'hurdle', 'slideGate'] },
    cityRun:   { name: 'OLD TOWN',      biome: 'city',   length: 1000, curve: 1.1,  first: 60,  spacing: 210,
                 patterns: ['rowR', 'hurdle', 'trailL', 'crateJump', 'slideGate', 'dodgeL', 'risky', 'trailR', 'line'] },
    forest:    { name: 'GREENWOOD',     biome: 'forest', curve: -1.2, first: 80, spacing: 210,
                 patterns: ['dodgeR', 'zig', 'twin', 'hurdle', 'trailL', 'dodgeL', 'slideGate', 'risky', 'zig'] },
    detour:    { name: 'MARKET DETOUR', biome: 'market', curve: 1.0,  first: 80, spacing: 210,
                 patterns: ['rowL', 'slideGate', 'line', 'crateJump', 'rowR', 'hurdle', 'trailR', 'slideGate', 'line'] },
    plaza:     { name: 'OLD TOWN',      biome: 'city',   length: 800,  curve: -0.9, first: 100, spacing: 210,
                 patterns: ['line', 'dodgeR', 'hurdle', 'rowL', 'risky'] },
    // the NEON QUARTER: a night district of the city. `district` makes the world fade the atmosphere, road palette and scenery into this biome over the first
    // and last 30 % of the segment (see World.bandsAt), so it is entered and left smoothly.
    neonRun:   { name: 'NEON QUARTER',  biome: 'neon',   length: 1100, curve: -0.8, first: 140, spacing: 210, district: true,
                 patterns: ['line', 'trailR', 'crateJump', 'dodgeL', 'hurdle', 'risky', 'slideGate', 'zig'] },
    // second variants of the repeating pieces (same biomes and names, a different bend, length and pattern mix) so each lap along the loop is not a copy of the last
    cityRunB:  { name: 'OLD TOWN',      biome: 'city',   length: 1150, curve: -1.0, first: 90,  spacing: 210,
                 patterns: ['trailR', 'crateJump', 'dodgeR', 'risky', 'line', 'hurdle', 'slideGate', 'rowL', 'trailL', 'zig'] },
    plazaB:    { name: 'OLD TOWN',      biome: 'city',   length: 900,  curve: 0.8,  first: 120, spacing: 210,
                 patterns: ['hurdle', 'line', 'dodgeL', 'rowR', 'slideGate', 'trailR'] },
    forestB:   { name: 'GREENWOOD',     biome: 'forest', curve: 1.0, first: 100, spacing: 210,
                 patterns: ['twin', 'dodgeL', 'slideGate', 'zig', 'trailR', 'hurdle', 'risky', 'dodgeR', 'line'] },
    detourB:   { name: 'MARKET DETOUR', biome: 'market', curve: -0.9, first: 100, spacing: 210,
                 patterns: ['rowR', 'line', 'slideGate', 'trailL', 'crateJump', 'rowL', 'hurdle', 'trailR'] },
  },
  forks: {
    gate: { zone: 440, branchLen: 1300, merge: 360, blend: 40,    // blend: extra distance after the diverge zone before a branch is fully its own biome
            left:  { route: 'forest', sign: 'signForest' },
            right: { route: 'detour', sign: 'signMarket' } },
    // the same choice (Greenwood left, Market Detour right) on the second lap, with different timings and the variant branches
    gate2: { zone: 480, branchLen: 1500, merge: 380, blend: 40,
            left:  { route: 'forestB', sign: 'signForest' },
            right: { route: 'detourB', sign: 'signMarket' } },
  },
  sequence: [{ seg: 'cityStart' }, { seg: 'cityRun' }, { fork: 'gate' }, { seg: 'plaza' }, { seg: 'neonRun' }, { seg: 'cityRunB' }, { fork: 'gate2' }, { seg: 'plazaB' }],
  loopFrom: 1,
};
