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

// ---- the SKILL patterns of the 3D build (World.extras only: the classic 2D game never gets them). Same format as PATTERNS, plus:
//   intro : the distance (units) from which the pattern can appear, so they come in gradually (a 90 s run is about 25 000 units)
//   last  : the z of the pattern's last hazard. The next pattern is pushed back so that its first hazard (55 units into it) is at least 195 units after this one, the gap every other pattern keeps
//   combo : the number of hazards of a sequence worth a small skill bonus when all of them are passed without a hit (Game.step)
// Every hazard sits where one jump, one slide or one lane change gets past it with room to spare at the top speed (tests/qa3d_perks.js plays them all at 340 units/s and with the dash).
const PATTERNS_X = {
  // a crate, then a low barrier 40 units later: ONE jump clears both, from a take-off range that stays at least 55 units wide (0.25 s) at every speed of the run, counting the 8-unit collision zone around each hazard
  crateBarrier: { intro: 2200, last: 95, combo: 2, items: [['coin', 15, 0, 12], ['coin', 36, 0, 26], ['crate', 55, 0], ['coin', 55, 0, 38], ['coin', 75, 0, 36], ['barrier', 95, 0], ['coin', 95, 0, 26], ['coin', 118, 0, 12]] },
  // a gate, then a trail of coins at sliding height that drifts to the right-hand lane: slide, stay low, then reposition
  gateTrail: { intro: 1800, last: 55, items: [['coin', 20, 0, 6], ['over', 55, 0], ['coin', 80, 0, 6], ['coin', 100, 0.25, 6], ['coin', 120, 0.55, 6], ['coin', 140, 0.85, 6], ['coin', 160, 1, 6]] },
  // crates staggered across the three lanes, 100 units apart: no lane stays free, the line has to be changed once
  stagger: { intro: 4200, last: 255, combo: 3, items: [['coin', 20, 1], ['crate', 55, -1], ['coin', 95, 1], ['crate', 155, 0], ['coin', 195, 1], ['crate', 255, 1], ['coin', 215, -0.5], ['coin', 275, -1]] },
  // a gate, then a barrier 130 units later: slide, then jump once the gate is behind (a jump ends a slide at once)
  slideJump: { intro: 5600, last: 185, combo: 2, items: [['coin', 20, 0, 6], ['over', 55, 0], ['coin', 75, 0, 6], ['coin', 140, 0, 14], ['barrier', 185, 0], ['coin', 185, 0, 26], ['coin', 210, 0, 12]] },
  // a barrier in the middle (jump), then two crates on the outer lanes (the middle one is free): land in the middle and run straight through
  hopWeave: { intro: 7200, last: 125, combo: 2, items: [['coin', 20, 0, 12], ['barrier', 55, 0], ['coin', 55, 0, 26], ['coin', 90, 0], ['crate', 125, -1], ['crate', 125, 1], ['coin', 125, 0], ['coin', 150, 0]] },
};
// the three Golden Waymark spots: each needs a deliberate move to reach (a high jump over a crate or a wall, a slide under a gate, or the one free lane), placed once on every fork branch (see `waymark` on the routes)
const WAYMARKS = {
  jump:  { last: 60, items: [['coin', 20, 0, 12], ['coin', 40, 0, 26], ['crate', 60, 0], ['waymark', 60, 0, 52], ['coin', 85, 0, 26], ['coin', 105, 0, 12]] },
  wall:  { last: 60, items: [['coin', 14, 0, 12], ['coin', 32, 0, 24], ['barrier', 60, -1], ['barrier', 60, 0], ['barrier', 60, 1], ['waymark', 60, 0, 46], ['coin', 92, 0, 24], ['coin', 110, 0, 12]] },
  slide: { last: 60, items: [['coin', 30, 0, 6], ['over', 60, 0], ['waymark', 60, 0, 5], ['coin', 90, 0, 6], ['coin', 110, 0, 6]] },
  lane:  { last: 60, items: [['coin', 20, -1], ['crate', 60, 0], ['crate', 60, 1], ['waymark', 60, -1, 12], ['coin', 90, -1], ['coin', 110, -1]] },
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
                 patterns: ['rowR', 'hurdle', 'trailL', 'crateJump', 'slideGate', 'dodgeL', 'risky', 'trailR', 'line'], extra: ['crateBarrier', 'gateTrail', 'stagger'] },
    forest:    { name: 'GREENWOOD',     biome: 'forest', curve: -1.2, first: 80, spacing: 210,
                 patterns: ['dodgeR', 'zig', 'twin', 'hurdle', 'trailL', 'dodgeL', 'slideGate', 'risky', 'zig'], extra: ['slideJump', 'stagger', 'gateTrail'], waymark: 'slide' },
    detour:    { name: 'MARKET DETOUR', biome: 'market', curve: 1.0,  first: 80, spacing: 210,
                 patterns: ['rowL', 'slideGate', 'line', 'crateJump', 'rowR', 'hurdle', 'trailR', 'slideGate', 'line'], extra: ['crateBarrier', 'gateTrail', 'hopWeave'], waymark: 'jump' },
    plaza:     { name: 'OLD TOWN',      biome: 'city',   length: 800,  curve: -0.9, first: 100, spacing: 210,
                 patterns: ['line', 'dodgeR', 'hurdle', 'rowL', 'risky'], extra: ['gateTrail', 'crateBarrier'] },
    // the NEON QUARTER: a night district of the city. `district` (a distance in units) makes the world fade the atmosphere, road palette and scenery into this biome over its first
    // and last `district` units (see World.bandsAt), so it is entered and left smoothly however long the segment is; 5000 units = 500 m = about 15 s.
    // the run opens in the quarter: `opening` = no fade-in (it is already night at distance 0); it fades back to the sunset city over its last 1200 units
    neonStart: { name: 'NEON QUARTER',  biome: 'neon',   length: 4000, curve: 0,    first: 420, spacing: 210, district: 1200, opening: true, calmStart: true,
                 patterns: ['line', 'crateJump', 'hurdle', 'slideGate', 'trailR', 'dodgeL', 'risky', 'zig'] },
    neonRun:   { name: 'NEON QUARTER',  biome: 'neon',   length: 5000, curve: -0.8, first: 140, spacing: 210, district: 1200,
                 patterns: ['line', 'trailR', 'crateJump', 'dodgeL', 'hurdle', 'risky', 'slideGate', 'zig'], extra: ['gateTrail', 'slideJump', 'stagger'] },
    // the TRAM STREET: a Brussels street at sunset (low sun ahead, tram rails in the cobbles, overhead wires); a district like the neon quarter, fading in and out over 120 m
    tramRun:   { name: 'SAINT-GILLES',   biome: 'tram',   length: 4500, curve: 0.6,  first: 140, spacing: 210, district: 1200, stay: true, grade: 0.07,   // grade: the street runs downhill (7 %), like in the photos
                 patterns: ['line', 'hurdle', 'trailL', 'crateJump', 'dodgeR', 'risky', 'slideGate', 'zig', 'trailR'], extra: ['crateBarrier', 'gateTrail', 'hopWeave'] },
    // the GARE DU MIDI: where Saint-Gilles ends. Saint-Gilles (`tramRun`, `stay`: it does not fade out) runs into the station (a district fully in at its start); coins on the way in, then at `scene.at` the
    // run hands over to the cutscene (Game.beginScene): the runner carries on by itself for `scene.run` units to the platform door at lateral `scene.x` and boards the train, which leaves; the
    // run resumes 100 units further on, while the station fades out and the fork after it (the next zone) comes up. `itemsEnd`: no coins or hazards after that point; `props`: world props (z from the start).
    gareMidi:  { name: 'GARE DU MIDI',  biome: 'gare',   length: 1300, curve: 0,    first: 100, spacing: 210, district: 700, opening: true, stay: true, calmStart: true, itemsEnd: 440,
                 patterns: ['line', 'coastWave'], scene: { at: 500, run: 400, x: 2.82 },
                 props: [{ spr: 'gareHall', dz: 900, x: 4.5 }, { spr: 'tourMidi', dz: 1180, x: 6.4 }] },
    // UTRECHT, the zone the train goes to: the run is on the water of the canals, on a surfboard (Game.surf), at blue hour. Three stretches of one atmosphere (BIOMES `atmo`): the basin in front of
    // Utrecht Centraal (open, calm), the canal under Hoog Catharijne (a covered gallery: gates to slide under) and the Oudegracht (two levels of quays, houses, bridges, the Dom). The station
    // ends 300 units after the point where the cutscene resumes the run (the door is 400 units before its end); `opening` + `stay` = fully in from the first unit to the last, only the Oudegracht
    // fades back out over its last 700 units before the next junction. Straight (curve 0): the water is drawn as one strip along the road (Road3D). The Dom is a fixed prop of the Oudegracht.
    utrechtA:  { name: 'UTRECHT CENTRAAL', biome: 'utrechtA', length: 2200, curve: 0, first: 300, spacing: 210, district: 600, opening: true, stay: true, calmStart: true,
                 patterns: ['line', 'coastWave', 'trailL', 'hurdle', 'trailR', 'line'], extra: ['crateBarrier'] },
    utrechtB:  { name: 'HOOG CATHARIJNE',  biome: 'utrechtB', length: 1800, curve: 0, first: 160, spacing: 210, district: 600, opening: true, stay: true,
                 patterns: ['slideGate', 'line', 'neonGantry', 'trailL', 'slideGate', 'trailR'], extra: ['gateTrail', 'slideJump'] },
    utrechtC:  { name: 'OUDEGRACHT',       biome: 'utrecht',  length: 5200, curve: 0, first: 160, spacing: 210, district: 700, opening: true,
                 patterns: ['line', 'crateJump', 'hurdle', 'slideGate', 'dodgeL', 'dodgeR', 'risky', 'zig', 'twin', 'trailL', 'trailR', 'rowL'], extra: ['crateBarrier', 'gateTrail', 'stagger', 'slideJump', 'hopWeave'],
                 props: [{ spr: 'utDom', dz: 3600, x: -9 }] },
    // THE COASTAL ZONE, on the main circuit (after the first plaza of every lap), one of four pieces by turns (`pickSegs.C`): the same safe sprint of coin waves, dunes and a few barriers, on a 420 m
    // coast road, under four lights: the sunset (the look of the coast branches of the junctions), the morning haze, the midday sun and the blue hour. A district fading in and out over 90 m.
    coastMorning:  { name: 'MORNING COAST',   biome: 'coastMorning', length: 4200, curve: -0.8, first: 220, spacing: 210, district: 900, stay: true, calmStart: true,
                     patterns: ['coastWave', 'coastDunes', 'line', 'coastWave', 'trailR', 'coastDunes', 'trailL', 'hurdle', 'coastWave', 'crateJump'], extra: ['crateBarrier', 'hopWeave'] },
    coastMidday:   { name: 'MIDDAY COAST',    biome: 'coastNoon',    length: 4200, curve: -0.8, first: 220, spacing: 210, district: 900, stay: true, calmStart: true,
                     patterns: ['coastWave', 'coastDunes', 'line', 'coastWave', 'trailR', 'coastDunes', 'trailL', 'hurdle', 'coastWave', 'crateJump'], extra: ['crateBarrier', 'hopWeave'] },
    coastSunset:   { name: 'SUNSET COAST',    biome: 'coast',        length: 4200, curve: -0.8, first: 220, spacing: 210, district: 900, stay: true, calmStart: true,
                     patterns: ['coastWave', 'coastDunes', 'line', 'coastWave', 'trailR', 'coastDunes', 'trailL', 'hurdle', 'coastWave', 'crateJump'], extra: ['crateBarrier', 'hopWeave'] },
    coastBlueHour: { name: 'BLUE HOUR COAST', biome: 'coastBlue',    length: 4200, curve: -0.8, first: 220, spacing: 210, district: 900, stay: true, calmStart: true,
                     patterns: ['coastWave', 'coastDunes', 'line', 'coastWave', 'trailR', 'coastDunes', 'trailL', 'hurdle', 'coastWave', 'crateJump'], extra: ['crateBarrier', 'hopWeave'] },
    // THE COASTAL TOWN, now a small ISLAND next to the coast, reached by an OPTIONAL passage: the junction after the coastal piece (`pick: 'E'`, `pickForks.E`: one of four forks by turns, in the same light as
    // the coastal piece before it) offers LEFT the coast road going on (`coastWalk*`: chalets, dunes) or RIGHT the island, by an aquarium tunnel under the sea (`island*`: the painted towers, the clubs, the roundabouts, the landing pad
    // and its saucer, src3d/env_town.js). Both are the beach zone (no door) and come back to one road before Saint-Gilles.
    coastWalkSunset: { name: 'SUNSET COAST', biome: 'coast', curve: -0.5, first: 120, spacing: 210,
                   patterns: ['coastWave', 'coastDunes', 'line', 'coastWave', 'trailR', 'coastDunes', 'trailL', 'hurdle', 'coastWave', 'crateJump'], extra: ['crateBarrier', 'hopWeave'], waymark: 'lane' },
    coastWalkMidday: { name: 'MIDDAY COAST', biome: 'coastNoon', curve: -0.5, first: 120, spacing: 210,
                   patterns: ['coastWave', 'coastDunes', 'line', 'coastWave', 'trailR', 'coastDunes', 'trailL', 'hurdle', 'coastWave', 'crateJump'], extra: ['crateBarrier', 'hopWeave'], waymark: 'lane' },
    coastWalkBlue: { name: 'BLUE HOUR COAST', biome: 'coastBlue', curve: -0.5, first: 120, spacing: 210,
                   patterns: ['coastWave', 'coastDunes', 'line', 'coastWave', 'trailR', 'coastDunes', 'trailL', 'hurdle', 'coastWave', 'crateJump'], extra: ['crateBarrier', 'hopWeave'], waymark: 'lane' },
    coastWalkMorning: { name: 'MORNING COAST', biome: 'coastMorning', curve: -0.5, first: 120, spacing: 210,
                   patterns: ['coastWave', 'coastDunes', 'line', 'coastWave', 'trailR', 'coastDunes', 'trailL', 'hurdle', 'coastWave', 'crateJump'], extra: ['crateBarrier', 'hopWeave'], waymark: 'lane' },
    islandSunset: { name: 'SUNSET ISLAND', biome: 'coastTown', curve: 0.7, first: 140, spacing: 210,
                patterns: ['coastWave', 'line', 'coastDunes', 'trailL', 'coastWave', 'hurdle', 'trailR', 'crateJump', 'coastWave', 'rowL'], extra: ['crateBarrier', 'hopWeave'], waymark: 'lane' },
    islandMidday: { name: 'MIDDAY ISLAND', biome: 'coastTownNoon', curve: 0.7, first: 140, spacing: 210,
                patterns: ['coastWave', 'line', 'coastDunes', 'trailL', 'coastWave', 'hurdle', 'trailR', 'crateJump', 'coastWave', 'rowL'], extra: ['crateBarrier', 'hopWeave'], waymark: 'lane' },
    islandBlue: { name: 'BLUE HOUR ISLAND', biome: 'coastTownBlue', curve: 0.7, first: 140, spacing: 210,
                patterns: ['coastWave', 'line', 'coastDunes', 'trailL', 'coastWave', 'hurdle', 'trailR', 'crateJump', 'coastWave', 'rowL'], extra: ['crateBarrier', 'hopWeave'], waymark: 'lane' },
    islandMorning: { name: 'MORNING ISLAND', biome: 'coastTownMorning', curve: 0.7, first: 140, spacing: 210,
                patterns: ['coastWave', 'line', 'coastDunes', 'trailL', 'coastWave', 'hurdle', 'trailR', 'crateJump', 'coastWave', 'rowL'], extra: ['crateBarrier', 'hopWeave'], waymark: 'lane' },
    // second variants of the repeating pieces (same biomes and names, a different bend, length and pattern mix) so each lap along the loop is not a copy of the last
    cityRunB:  { name: 'OLD TOWN',      biome: 'city',   length: 1150, curve: -1.0, first: 90,  spacing: 210,
                 patterns: ['trailR', 'crateJump', 'dodgeR', 'risky', 'line', 'hurdle', 'slideGate', 'rowL', 'trailL', 'zig'], extra: ['crateBarrier', 'gateTrail', 'hopWeave'] },
    plazaB:    { name: 'OLD TOWN',      biome: 'city',   length: 900,  curve: 0.8,  first: 120, spacing: 210,
                 patterns: ['hurdle', 'line', 'dodgeL', 'rowR', 'slideGate', 'trailR'], extra: ['crateBarrier', 'stagger'] },
    forestB:   { name: 'GREENWOOD',     biome: 'forest', curve: 1.0, first: 100, spacing: 210,
                 patterns: ['twin', 'dodgeL', 'slideGate', 'zig', 'trailR', 'hurdle', 'risky', 'dodgeR', 'line'], extra: ['stagger', 'slideJump'], waymark: 'slide' },
    detourB:   { name: 'MARKET DETOUR', biome: 'market', curve: -0.9, first: 100, spacing: 210,
                 patterns: ['rowR', 'line', 'slideGate', 'trailL', 'crateJump', 'rowL', 'hurdle', 'trailR'], extra: ['crateBarrier', 'hopWeave'], waymark: 'jump' },
    // ---- the three new destinations (fork branches; each has a variant B so the second visit is not a copy)
    // SUNSET COAST: a warm seaside road, a safe sprint: coin waves and straights, almost no hazard
    coastRun:   { name: 'SUNSET COAST',  biome: 'coast',  curve: -0.8, first: 80,  spacing: 210,
                  patterns: ['coastWave', 'coastDunes', 'line', 'coastWave', 'trailR', 'coastDunes', 'trailL', 'hurdle', 'coastWave'], extra: ['crateBarrier'], waymark: 'lane' },
    coastRunB:  { name: 'SUNSET COAST',  biome: 'coast',  curve: 0.9,  first: 100, spacing: 210,
                  patterns: ['coastDunes', 'coastWave', 'trailL', 'line', 'coastDunes', 'coastWave', 'trailR', 'crateJump'], extra: ['crateBarrier', 'hopWeave'], waymark: 'lane' },
    // MOSSY RUINS: stone, moss and green light; the signature moment is the fallen wall that has to be jumped
    ruinsRun:   { name: 'MOSSY RUINS',   biome: 'ruins',  curve: 1.1,  first: 80,  spacing: 210,
                  patterns: ['collapsedArch', 'ruinSteps', 'dodgeL', 'collapsedArch', 'twin', 'slideGate', 'ruinSteps', 'zig', 'dodgeR'], extra: ['stagger', 'crateBarrier'], waymark: 'wall' },
    ruinsRunB:  { name: 'MOSSY RUINS',   biome: 'ruins',  curve: -1.0, first: 100, spacing: 210,
                  patterns: ['ruinSteps', 'collapsedArch', 'dodgeR', 'hurdle', 'collapsedArch', 'twin', 'crateJump', 'dodgeL'], extra: ['stagger', 'crateBarrier', 'hopWeave'], waymark: 'wall' },
    // NEON DISTRICT: a compact lit neighbourhood: light gantries to slide under and strobing crates
    neonBranch:  { name: 'NEON DISTRICT', biome: 'neon',   curve: 0.8,  first: 80,  spacing: 210,
                   patterns: ['neonGantry', 'neonStrobe', 'zig', 'neonGantry', 'dodgeR', 'neonStrobe', 'slideGate', 'twin', 'line'], extra: ['gateTrail', 'slideJump'], waymark: 'slide' },
    neonBranchB: { name: 'NEON DISTRICT', biome: 'neon',   curve: -0.9, first: 100, spacing: 210,
                   patterns: ['neonStrobe', 'neonGantry', 'dodgeL', 'neonStrobe', 'zig', 'neonGantry', 'rowR', 'line'], extra: ['gateTrail', 'slideJump', 'stagger'], waymark: 'slide' },
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
    // the island junction, in the four lights (the passage to the island is optional: LEFT the coast goes on, RIGHT the way to the island, which goes UNDER THE SEA: `tube`, from the user's sketch of an aquarium-style trajectory: the right road keeps the coast's look (`pre`) while the two roads part, then runs 700 m through the glass tunnel (`biome`, ENV3D.coastAqua: long enough to play and enjoy it, about 25 s), then comes up on the 300 m island, the only place of the afro-Mediterranean music; `hold`: the beach look goes through the junction, it does not fade in)
    gateIslandSunset: { zone: 480, branchLen: 10000, merge: 380, blend: 40, hold: true, tube: { pre: 'coast', biome: 'coastAqua', len: 7000 }, left: { route: 'coastWalkSunset', sign: 'signCoast' }, right: { route: 'islandSunset', sign: 'signIsland' } },
    gateIslandMidday: { zone: 480, branchLen: 10000, merge: 380, blend: 40, hold: true, tube: { pre: 'coastNoon', biome: 'coastAqua', len: 7000 }, left: { route: 'coastWalkMidday', sign: 'signCoast' }, right: { route: 'islandMidday', sign: 'signIsland' } },
    gateIslandBlue: { zone: 480, branchLen: 10000, merge: 380, blend: 40, hold: true, tube: { pre: 'coastBlue', biome: 'coastAqua', len: 7000 }, left: { route: 'coastWalkBlue', sign: 'signCoast' }, right: { route: 'islandBlue', sign: 'signIsland' } },
    gateIslandMorning: { zone: 480, branchLen: 10000, merge: 380, blend: 40, hold: true, tube: { pre: 'coastMorning', biome: 'coastAqua', len: 7000 }, left: { route: 'coastWalkMorning', sign: 'signCoast' }, right: { route: 'islandMorning', sign: 'signIsland' } },
    // THE JUNCTIONS OF THE CIRCUIT. The coast and the neon quarter are zones of their own now (Neon > Beach > Saint-Gilles > Utrecht), so the pairs the junction of Saint-Gilles takes (picks.A) offer only the
    // detours that stay in its neighbourhood: forest, market, ruins. The pairs above that lead to the coast or the neon quarter (gate3, gate4, gate2, gate3B, gate4B) are no longer on the circuit.
    gate5: { zone: 440, branchLen: 1300, merge: 360, blend: 40, left: { route: 'ruinsRun', sign: 'signRuins' }, right: { route: 'detourB', sign: 'signMarket' } },
    gate6: { zone: 480, branchLen: 1500, merge: 380, blend: 40, left: { route: 'forestB', sign: 'signForest' }, right: { route: 'ruinsRunB', sign: 'signRuins' } },
  },
  // Every route choice is a fork with a signpost on each side. The two fork slots of a lap (A and B) pick one of three pairs each (see `picks`), so the destinations come in a different order
  // from lap to lap and, in a real run, from run to run (World.seed). Between them the five destinations (forest, market, coast, ruins, neon district) are all reachable.
  base: 'city',          // the biome every segment's palette blends from (the "unblended" look); NOT the biome of the first piece, which is the neon quarter
  // THE ZONES IN ORDER: Neon > Beach (the coast, in the four lights by turns, then the island junction: the coast goes on or an optional bridge leads to the coastal town on its island) > Saint-Gilles (the street, a junction with forest / market / ruins detours, the tram street, the Gare du Midi) > Utrecht (by train) >
  // Neon again, and so on: one door between each zone and the next (Saint-Gilles to Utrecht is the train, not a door). The run starts in the neon quarter (neonStart); the loop starts at the beach.
  sequence: [{ seg: 'neonStart' }, { pick: 'C' }, { pick: 'E' }, { seg: 'cityRun' }, { pick: 'A' }, { seg: 'plaza' }, { seg: 'cityRunB' }, { seg: 'tramRun' }, { seg: 'gareMidi' }, { seg: 'utrechtA' }, { seg: 'utrechtB' }, { seg: 'utrechtC' }, { seg: 'neonRun' }],
  // a `pick` slot of `pickSegs` chooses a SEGMENT instead of a fork pair: one after the other at each passage (the first one with seed 0, a seeded starting point for a real run), so every ambiance of the coastal zone is met in turn
  pickSegs: { C: ['coastSunset', 'coastMidday', 'coastBlueHour', 'coastMorning'] },
  pickForks: { E: ['gateIslandSunset', 'gateIslandMidday', 'gateIslandBlue', 'gateIslandMorning'] },       // a `pick` slot of `pickForks` chooses a FORK by turns, like `pickSegs` a segment
  pickSalt: { E: 'C' },         // the island junction takes its light from the same turn as the coastal piece before it (the same seeded start)
  picks: { A: ['gate', 'gate5', 'gate6'], B: ['gate2', 'gate3B', 'gate4B'] },       // the fork pairs a `pick` slot chooses from (the first lap, with seed 0, takes the first: forest / market); B is not on the circuit any more
  loopFrom: 1,
};
