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
  // --- patterns of the new destinations (hazards stay 55-70 units into the pattern like the others, so spacing and fairness rules hold)
  // coastWave (Sunset Coast): a safe sprint, no hazard at all: coins rolling from side to side like a wave
  coastWave: [['coin', 0, -1], ['coin', 18, -0.7], ['coin', 36, -0.3], ['coin', 54, 0.2], ['coin', 72, 0.6], ['coin', 90, 1], ['coin', 108, 0.6], ['coin', 126, 0.2]],
  // coastDunes: a long straight of coins in the middle and one low barrier (a driftwood log) to hop over
  coastDunes: [['coin', 0, 0], ['coin', 22, 0], ['coin', 44, 0], ['barrier', 62, 0], ['coin', 62, 0, 28], ['coin', 84, 0], ['coin', 106, 0], ['coin', 128, 0]],
  // collapsedArch (Mossy Ruins): a fallen wall right across the road: the three lanes are blocked at once, so it has to be jumped; coins arc over it
  collapsedArch: [['coin', 14, 0, 12], ['coin', 32, 0, 24], ['barrier', 62, -1], ['barrier', 62, 0], ['barrier', 62, 1], ['coin', 62, -1, 38], ['coin', 62, 0, 40], ['coin', 62, 1, 38], ['coin', 92, 0, 24], ['coin', 110, 0, 12]],
  // ruinSteps: broken columns in a staggered line (lanes -1, then +1, 7 units later) with the middle lane clear, and coins in it
  ruinSteps: [['coin', 20, 0], ['coin', 40, 0], ['crate', 56, -1], ['crate', 63, 1], ['coin', 56, 0], ['coin', 63, 0], ['coin', 84, 0], ['coin', 104, 0]],
  // neonGantry (Neon District): two light gantries close together (slide under both with one slide), coins at slide height between them
  neonGantry: [['coin', 20, 0, 6], ['coin', 40, 0, 6], ['over', 56, 0], ['coin', 63, 0, 6], ['over', 70, 0], ['coin', 90, 0, 6], ['coin', 110, 0, 6]],
  // neonStrobe: crates alternate sides at the same 55-70 window: left, right, left (7 units apart), the centre lane stays open with a coin line through it
  neonStrobe: [['coin', 10, 0], ['coin', 30, 0], ['crate', 55, -1], ['crate', 62, 1], ['crate', 69, -1], ['coin', 55, 0], ['coin', 69, 0], ['coin', 90, 0], ['coin', 110, 0]],
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
    // the NEON QUARTER: a night district of the city. `district` (a distance in units) makes the world fade the atmosphere, road palette and scenery into this biome over its first
    // and last `district` units (see World.bandsAt), so it is entered and left smoothly however long the segment is; 5000 units = 500 m = about 15 s.
    // the run opens in the quarter: `opening` = no fade-in (it is already night at distance 0); it fades back to the sunset city over its last 1200 units
    neonStart: { name: 'NEON QUARTER',  biome: 'neon',   length: 4000, curve: 0,    first: 420, spacing: 210, district: 1200, opening: true, calmStart: true,
                 patterns: ['line', 'crateJump', 'hurdle', 'slideGate', 'trailR', 'dodgeL', 'risky', 'zig'] },
    neonRun:   { name: 'NEON QUARTER',  biome: 'neon',   length: 5000, curve: -0.8, first: 140, spacing: 210, district: 1200,
                 patterns: ['line', 'trailR', 'crateJump', 'dodgeL', 'hurdle', 'risky', 'slideGate', 'zig'] },
    // the TRAM STREET: a Brussels street at sunset (low sun ahead, tram rails in the cobbles, overhead wires); a district like the neon quarter, fading in and out over 120 m
    tramRun:   { name: 'SAINT-GILLES',   biome: 'tram',   length: 4500, curve: 0.6,  first: 140, spacing: 210, district: 1200, grade: 0.07,   // grade: the street runs downhill (7 %), like in the photos
                 patterns: ['line', 'hurdle', 'trailL', 'crateJump', 'dodgeR', 'risky', 'slideGate', 'zig', 'trailR'] },
    // second variants of the repeating pieces (same biomes and names, a different bend, length and pattern mix) so each lap along the loop is not a copy of the last
    cityRunB:  { name: 'OLD TOWN',      biome: 'city',   length: 1150, curve: -1.0, first: 90,  spacing: 210,
                 patterns: ['trailR', 'crateJump', 'dodgeR', 'risky', 'line', 'hurdle', 'slideGate', 'rowL', 'trailL', 'zig'] },
    plazaB:    { name: 'OLD TOWN',      biome: 'city',   length: 900,  curve: 0.8,  first: 120, spacing: 210,
                 patterns: ['hurdle', 'line', 'dodgeL', 'rowR', 'slideGate', 'trailR'] },
    forestB:   { name: 'GREENWOOD',     biome: 'forest', curve: 1.0, first: 100, spacing: 210,
                 patterns: ['twin', 'dodgeL', 'slideGate', 'zig', 'trailR', 'hurdle', 'risky', 'dodgeR', 'line'] },
    detourB:   { name: 'MARKET DETOUR', biome: 'market', curve: -0.9, first: 100, spacing: 210,
                 patterns: ['rowR', 'line', 'slideGate', 'trailL', 'crateJump', 'rowL', 'hurdle', 'trailR'] },
    // ---- the three new destinations (fork branches; each has a variant B so the second visit is not a copy)
    // SUNSET COAST: a warm seaside road, a safe sprint: coin waves and straights, almost no hazard
    coastRun:   { name: 'SUNSET COAST',  biome: 'coast',  curve: -0.8, first: 80,  spacing: 210,
                  patterns: ['coastWave', 'coastDunes', 'line', 'coastWave', 'trailR', 'coastDunes', 'trailL', 'hurdle', 'coastWave'] },
    coastRunB:  { name: 'SUNSET COAST',  biome: 'coast',  curve: 0.9,  first: 100, spacing: 210,
                  patterns: ['coastDunes', 'coastWave', 'trailL', 'line', 'coastDunes', 'coastWave', 'trailR', 'crateJump'] },
    // MOSSY RUINS: stone, moss and green light; the signature moment is the fallen wall that has to be jumped
    ruinsRun:   { name: 'MOSSY RUINS',   biome: 'ruins',  curve: 1.1,  first: 80,  spacing: 210,
                  patterns: ['collapsedArch', 'ruinSteps', 'dodgeL', 'collapsedArch', 'twin', 'slideGate', 'ruinSteps', 'zig', 'dodgeR'] },
    ruinsRunB:  { name: 'MOSSY RUINS',   biome: 'ruins',  curve: -1.0, first: 100, spacing: 210,
                  patterns: ['ruinSteps', 'collapsedArch', 'dodgeR', 'hurdle', 'collapsedArch', 'twin', 'crateJump', 'dodgeL'] },
    // NEON DISTRICT: a compact lit neighbourhood: light gantries to slide under and strobing crates
    neonBranch:  { name: 'NEON DISTRICT', biome: 'neon',   curve: 0.8,  first: 80,  spacing: 210,
                   patterns: ['neonGantry', 'neonStrobe', 'zig', 'neonGantry', 'dodgeR', 'neonStrobe', 'slideGate', 'twin', 'line'] },
    neonBranchB: { name: 'NEON DISTRICT', biome: 'neon',   curve: -0.9, first: 100, spacing: 210,
                   patterns: ['neonStrobe', 'neonGantry', 'dodgeL', 'neonStrobe', 'zig', 'neonGantry', 'rowR', 'line'] },
  },
  forks: {
    gate: { zone: 440, branchLen: 1300, merge: 360, blend: 40,    // blend: extra distance after the diverge zone before a branch is fully its own biome
            left:  { route: 'forest', sign: 'signForest' },
            right: { route: 'detour', sign: 'signMarket' } },
    // the same choice (Greenwood left, Market Detour right) on the second lap, with different timings and the variant branches
    gate2: { zone: 480, branchLen: 1500, merge: 380, blend: 40,
            left:  { route: 'forestB', sign: 'signForest' },
            right: { route: 'detourB', sign: 'signMarket' } },
    // the new pairs. Same timing as gate / gate2
    gate3:  { zone: 440, branchLen: 1300, merge: 360, blend: 40, left: { route: 'coastRun', sign: 'signCoast' },  right: { route: 'ruinsRun', sign: 'signRuins' } },
    gate4:  { zone: 440, branchLen: 1300, merge: 360, blend: 40, left: { route: 'neonBranch', sign: 'signNeon' }, right: { route: 'forest', sign: 'signForest' } },
    gate3B: { zone: 480, branchLen: 1500, merge: 380, blend: 40, left: { route: 'coastRunB', sign: 'signCoast' }, right: { route: 'neonBranchB', sign: 'signNeon' } },
    gate4B: { zone: 480, branchLen: 1500, merge: 380, blend: 40, left: { route: 'ruinsRunB', sign: 'signRuins' }, right: { route: 'detourB', sign: 'signMarket' } },
  },
  // Every route choice is a fork with a signpost on each side. The two fork slots of a lap (A and B) pick one of three pairs each (see `picks`), so the destinations come in a different order
  // from lap to lap and, in a real run, from run to run (World.seed). Between them the five destinations (forest, market, coast, ruins, neon district) are all reachable.
  base: 'city',          // the biome every segment's palette blends from (the "unblended" look); NOT the biome of the first piece, which is the neon quarter
  sequence: [{ seg: 'neonStart' }, { seg: 'cityRun' }, { pick: 'A' }, { seg: 'plaza' }, { seg: 'neonRun' }, { seg: 'cityRunB' }, { seg: 'tramRun' }, { pick: 'B' }, { seg: 'plazaB' }],
  picks: { A: ['gate', 'gate3', 'gate4'], B: ['gate2', 'gate3B', 'gate4B'] },       // the fork pairs a `pick` slot chooses from (the first lap, with seed 0, takes the first: forest / market)
  loopFrom: 1,
};
