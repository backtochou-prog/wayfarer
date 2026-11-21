// Track data. Lengths are world units; obstacle/coin patterns are [kind, dz, lane(-1..1), height].
const LANE_W = 0.62;   // lane -1..1 -> lateral units
const FORK_C = 2.4;    // lateral centre of each branch once the fork has fully opened

// Obstacle collision boxes: half-width (lateral units) and vertical span above ground.
// Heights are checked against the player's body: standing 0-24, sliding 0-8, jumping rises to ~40.
const OBST = {
  crate:   { hw: 0.17, y0: 0,  y1: 14 },  // wooden crate: jump over (or steer around)
  barrier: { hw: 0.39, y0: 0,  y1: 9 },   // low barrier / fallen branch: jump over
  over:    { hw: 0.55, y0: 14, y1: 48 },  // banner / hanging vines: slide under
  // VIC (the narrow streets): obstacles that stand against ONE wall, half the street wide: the free half is the way round, and the café terraces of the user's photo are the models
  vicLow:  { hw: 0.3, y0: 0,  y1: 9 },    // a terrace set (tables, folding chairs, a planter): jump over it, or go to the other side
  vicBarrel: { hw: 0.3, y0: 0, y1: 14 }, // two oak wine barrels, a zinc bucket of flowers on one: jump over (the user's photo)
  vicChairs: { hw: 0.3, y0: 0, y1: 11 },  // two wooden armchairs of the street furniture, facing each other: jump over (the user's photo)
  vicPot: { hw: 0.3, y0: 0, y1: 14 },    // two big terracotta flower pots with shrubs (the street's planters): jump over
  // VIC, THE ALLEY (one place only, wall to wall): a low hazard is jumped, a hanging one is slid under, there is no room to go round
  vicMJump:  { hw: 0.5, y0: 0,  y1: 11 },  // THE PINK ALLEY: big blue tapered planters with shrubs across it (the user's photo): jump over
  vicMSlide: { hw: 0.5, y0: 14, y1: 48 },  // THE PINK ALLEY: a carved wooden awning across it (the user's photo): slide under
  vicAJump:  { hw: 0.5, y0: 0,  y1: 11 },  // baskets, crates and flower pots across the alley: jump over it
  vicASlide: { hw: 0.5, y0: 14, y1: 48 },  // a washing line across the alley with sheets and clothes: slide under it
  vicHigh: { hw: 0.3, y0: 0,  y1: 48 },   // a patio heater, a planter and stacked chairs: too tall to jump, only the other side
  vicHang: { hw: 0.3, y0: 14, y1: 48 },   // a big parasol over the wall side: slide under it, or the other side
};

const PATTERNS = {
  // VIC: lanes +-0.45 are the two halves of the street (0.31 lane units from its axis, the obstacle half a street wide against its wall); a low one is jumped or avoided, a tall one only avoided, a hanging one slid under
  vicLowL:  [['coin', 20, 0.45], ['vicLow', 60, -0.45], ['coin', 60, 0.45], ['coin', 100, 0.45]],
  vicLowR:  [['coin', 20, -0.45], ['vicLow', 60, 0.45], ['coin', 60, -0.45], ['coin', 100, -0.45]],
  vicHighL: [['coin', 20, 0.45], ['vicHigh', 60, -0.45], ['coin', 70, 0.45], ['coin', 110, 0.45]],
  vicHighR: [['coin', 20, -0.45], ['vicHigh', 60, 0.45], ['coin', 70, -0.45], ['coin', 110, -0.45]],
  vicHangL: [['coin', 30, -0.45, 6], ['vicHang', 70, -0.45], ['coin', 70, -0.45, 6], ['coin', 110, 0.45]],
  vicHangR: [['coin', 30, 0.45, 6], ['vicHang', 70, 0.45], ['coin', 70, 0.45, 6], ['coin', 110, -0.45]],
  vicBarrelL: [['coin', 20, 0.45], ['vicBarrel', 60, -0.45], ['coin', 60, 0.45], ['coin', 100, 0.45]],
  vicBarrelR: [['coin', 20, -0.45], ['vicBarrel', 60, 0.45], ['coin', 60, -0.45], ['coin', 100, -0.45]],
  vicChairsL: [['coin', 20, 0.45], ['vicChairs', 60, -0.45], ['coin', 60, 0.45], ['coin', 100, 0.45]],
  vicChairsR: [['coin', 20, -0.45], ['vicChairs', 60, 0.45], ['coin', 60, -0.45], ['coin', 100, -0.45]],
  vicPotL: [['coin', 20, 0.45], ['vicPot', 60, -0.45], ['coin', 60, 0.45], ['coin', 100, 0.45]],
  vicPotR: [['coin', 20, -0.45], ['vicPot', 60, 0.45], ['coin', 60, -0.45], ['coin', 100, -0.45]],
  // (vicSlalom and vicMix are long patterns, not used by the street pieces: they would run over the next piece, where two hazards on opposite walls could end up a few metres apart)
  vicAJ: [['coin', 20, 0], ['vicAJump', 60, 0], ['coin', 60, 0, 28], ['coin', 100, 0]],
  vicAS: [['coin', 30, 0, 6], ['vicASlide', 70, 0], ['coin', 70, 0, 6], ['coin', 110, 0, 6]],
  vicAM: [['vicAJump', 50, 0], ['coin', 50, 0, 28], ['coin', 150, 0], ['vicASlide', 260, 0], ['coin', 260, 0, 6]],
  vicMJ: [['coin', 20, 0], ['vicMJump', 60, 0], ['coin', 60, 0, 28], ['coin', 100, 0]],
  vicMS: [['coin', 30, 0, 6], ['vicMSlide', 70, 0], ['coin', 70, 0, 6], ['coin', 110, 0, 6]],
  vicSlalom: [['coin', 10, 0.45], ['vicHigh', 50, -0.45], ['coin', 220, 0], ['vicHigh', 400, 0.45], ['coin', 450, -0.45]],
  vicMix:   [['vicLow', 50, 0.45], ['coin', 60, -0.45], ['vicHang', 380, -0.45], ['coin', 390, 0.45]],
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
// THE NEON CORNER (the user, 2026-11-16, with a retouched screenshot: a square opening on the left of the neon street, the picture district seen through it, an arrow turning left into it): in each
// stretch of the neon quarter a junction (24 m in at the start of the run, so the district ends before the passage out of the quarter; 108 m in after a passage between zones, whose exit door stands 55 m in: the corner is never inside the passage); the runner who reaches it in the LEFT lane turns into the picture district (a sharp 90-degree pivot of 0.4 s, no curve), rides its street
// (14 slots of 12 m) and its tunnel (14 slots) and comes back out on the neon street; in the centre or right lane the street goes on as before. Game: corner / detour; scenery: src3d/env_neon.js.
const NEON_CORNER = {
  NAME: 'ART CITY',    // the district's name on the HUD (the user, 2026-11-16: 'Ville d'art', in English like the other zone names)
  on: true, REL: 2, REL_AFTER: 9, STREET: 14, TUNNEL: 14, ART: 50, EXIT: 2, SLOT: 120, T: 0.4,      // (the district: picture street, tunnel, ART CITY, a short tunnel back)
  // THE GLASS RAMP (the user, 2026-11-16): near the end of ART CITY, the runner in the LEFT lane climbs a transparent neon ramp (the last UP slots of ART CITY) to the bridge over the tunnel
  // under the spiral and goes on HIGH UP (H units of run) along the NEON AVENUE (CANYON slots, the user's picture of circuit-board towers at sunset), then comes down (DOWN slots) to the short
  // tunnel back to the neon street. Drawing only, like every slope of the game (World.extraLift -> dropAt): the rules stay flat.
  UP: 6, CANYON: 70, DOWN: 6, H: 140,      // (CANYON 70 slots, 840 m: the user offered to lengthen the avenue for the monorail city)
  // THE UNDERGROUND TUNNEL (the user): a runner who does not take the glass ramp goes on into the tunnel under the spiral, which goes DOWN (DIVE slots, DEPTH units of run under the street),
  // runs underground (UNDER slots: the place of the tunnel's own scenario, to come) and comes back UP (RISE slots) to the short tunnel out to the neon street.
  DIVE: 6, UNDER: 20, RISE: 6, DEPTH: 120,
  // THE CAR PARK (the user: "the entrance of the tunnel is the entrance of two tunnels"): a runner in the LEFT lane at the tunnel's mouth takes the second tunnel. It goes down like the first
  // (the same DIVE), opens on a big car park under the tiled floor of the avenue (PARK slots, about 100 m), then a ramp with stairs beside it (PRISE slots) climbs back to the tiled floor,
  // POFF_M metres to the left of the circuit, and a slip road (PMERGE slots) joins the circuit that runs on the ground all along under the avenue, to the way down and the short tunnel back.
  PARK: 16, PRISE: 6, PMERGE: 4, POFF_M: 8.2,
  // ITS OWN TUBE (the user: "a real tube"): the choice is made PIN slots before the mouth; a slip road leaves the circuit to the left there and enters a smaller tube whose axis is
  // PTUBE_M metres to the left of the big one (off, below); inside, on the way down, the road comes back under the circuit's line.
  PIN: 3, PTUBE_M: 12,
  // THE SIDE ROAD (the user, 2026-11-20: "a second road at the car park's entrance, to a new circuit beyond the rails, beside the buildings and through the green zone, then a deviation
  // back to the main circuit"): at the same choice (PIN slots before the mouth) the RIGHT lane leaves the circuit to the right, passes right of the tunnel, under the monorail rail, and
  // runs SIDE_M metres to the right of the circuit (the ground floor of the two-floor street), swings out to SPARK_M through the park (SSW slots each way), and comes back to the circuit
  // over SOUT slots at the end of the avenue. sideM(qf): its offset in metres at qf slots after the tunnel's mouth.
  SIDE_M: 25, SIN: 6, SPARK_M: 43, SSW: 5, SOUT: 6,
  sideM(qf) { const e = t => t * t * (3 - 2 * t), c = v => Math.max(0, Math.min(1, v)), P0 = Math.floor((15 + this.CANYON) / 2) - 4, P1 = P0 + 9, R0 = this.CANYON - 3;
    if (qf <= -this.PIN || qf >= R0 + this.SOUT) return 0;
    if (qf < this.SIN - this.PIN) return this.SIDE_M * e((qf + this.PIN) / this.SIN);
    if (qf >= R0) return this.SIDE_M * (1 - e((qf - R0) / this.SOUT));
    return this.SIDE_M + (this.SPARK_M - this.SIDE_M) * e(c((qf - (P0 - this.SSW)) / this.SSW)) * (1 - e(c((qf - P1) / this.SSW))); },
  // THE GLASS BRANCH of the side road (the user, 2026-11-20: "connect a glass ramp that passes through the centre of these towers"): in the park's last slot (GQ slots after the mouth) the
  // RIGHT lane of the side road climbs a one-lane glass ramp (GUP slots, GH units of run high: 2.80 m, the user), which runs between the two rows of towers, GM metres right of the circuit, under the
  // stations' glass tunnels, and comes down in a long curve (GOUT slots) onto the circuit before the tunnel back. glassW(qf): the ramp's centre line (metres, where it STANDS);
  // glassM(qf): the road's centre for its runner (it starts on the side road's centre, the runner being in the right lane, and joins the ramp's line within a slot); glassH: its height.
  GQ: 46, GM: 52.5, GH: 28, GUP: 6, GDN: 6, GOUT: 10,
  glassW(qf) { const e = t => t * t * (3 - 2 * t), c = v => Math.max(0, Math.min(1, v)), a = this.SPARK_M + 2.2, R = this.CANYON + this.DOWN - this.GOUT;
    return qf < R ? a + (this.GM - a) * e(c((qf - this.GQ) / this.GUP)) : this.GM * (1 - e(c((qf - R) / this.GOUT))); },
  glassM(qf) { const e = t => t * t * (3 - 2 * t), c = v => Math.max(0, Math.min(1, v)); return this.glassW(qf) - 2.2 * (1 - e(c(qf - this.GQ))); },
  glassH(qf) { const e = t => t * t * (3 - 2 * t), c = v => Math.max(0, Math.min(1, v)); return this.GH * e(c((qf - this.GQ) / this.GUP)) * (1 - e(c((qf - (this.CANYON - 2)) / this.GDN))); },
  // THE HIGH BRANCH (the user, 2026-11-20: "add another ramp this way, which climbs more and more until it reaches 7 metres"): G2Q slots after the mouth, a runner on the glass branch who
  // has pressed RIGHT on it leaves it to the right on a second glass ramp, which climbs more and more up to G2H (7 m), comes back OVER the first one to pass between the towers (1 m left of
  // its line), and comes down in its own later, tighter curve onto the circuit. glass2W: its centre line (metres); glass2H: its height. gM / gH: the line and height for a detour's `glass` (true or 2).
  G2Q: 49, G2H: 70, G2X: 10.5, G2UP: 5, G2R: 68.5, G2OUT: 7.5,
  // THE SQUARE TUNNEL (the user, 2026-11-20: "a vast square tunnel, a train station as much as a pedestrian passage (our ramp)", "crossed by the high ramp"): G2TN slots from slot G2T, where the
  // high ramp runs straight at its 7 m; so the ramp reaches 7 m before it (G2UP) and curves back to the towers after it.
  // (the user, on a screenshot: "where I want the tunnel with the station", "between the 2 buildings": between the skyline's pavilion and its blue spire tower, G2TX m out)
  G2T: 54, G2TN: 4, G2TX: 59,
  // THE BACK ROAD (the user, on a screenshot: "a new road behind the buildings, the green zones; it leaves from a roundabout that we add at the very start of that side"): scenery so far
  // (no access yet). The roundabout NRQ slots after the tunnel's mouth, its centre NRC m right of the circuit; the road NRX m out, behind the far row of towers; where the built skyline
  // stands it comes in to NRIN m and passes under the square tunnel's station, then goes out again. backM(qf): its offset.
  NRQ: 8, NRC: 75, NRX: 83, NRIN: 65,      // (2026-11-21, the user: the road and the bike lane moved 9 m back, to the old tree line, to leave room in front of the towers on the left)
  backM(qf) { const e = t => t * t * (3 - 2 * t), c = v => Math.max(0, Math.min(1, v)); return this.NRX + (this.NRIN - this.NRX) * e(c((qf - 50) / 4)) * (1 - e(c((qf - 58) / 4))); },
  // THE BIKE LANE (the user, 2026-11-21: "an active bike road with an entrance at the start and several entrances; it runs all along the tarmac, reaches the roundabout, goes on beside the
  // street behind the buildings and continues straight"): BIKE_M metres right of the circuit all along ART CITY (rideable there by anyone, on foot too: Game.bikeLane; an entrance over
  // the first two slots, then every BIKE_EVERY slots, and where it ends before the side road's fork); then it follows the side road's slip, crosses the open ground to the roundabout,
  // passes it on its right and runs BIKE_OUT metres beyond the back road, straight on (scenery from the fork on: no way back to the circuit yet). bikeM(qf): its offset.
  BIKE_M: 5.0, BIKE_W: 2.0, BIKE_G: 0.5, BIKE_OUT: 5.0, BIKE_EVERY: 10,      // (a TWO-WAY lane BIKE_W wide, its centre BIKE_M right of the circuit; the runner rides its right half, BIKE_G right of the centre line)
  bikeEntry(r) { return r >= 0 && (r % this.BIKE_EVERY <= 1 || r >= this.ART - this.PIN - 2); },
  // (2026-11-21, the user's red line: before the fork the lane swings BIKE_SW m further right, round the two fork signs' posts, and is back in line under the bridge, between its
  // pillars. RIDEABLE all the way now: a runner on it at the fork takes the side road's detour and keeps the lane, by the roundabout and along the back road; BIKE_RET slots before the
  // avenue's end a link brings it back beside the side road (entrances there), while the strip itself goes on straight, as scenery.)
  BIKE_SW: 2.9, BIKE_RET: 62, BIKE_END: 69,
  dipK(qf) { return (this.NRX - this.backM(qf)) / (this.NRX - this.NRIN); },      // (1 where the back road is in under the square tunnel's station: there the lane passes outside the station's legs)
  bikeM(qf) { const e = t => t * t * (3 - 2 * t), c = v => Math.max(0, Math.min(1, v)), a = this.SIDE_M + this.BIKE_M, R = this.NRC + 17.3, B = this.backM(qf) + this.BIKE_OUT + 2.8 * this.dipK(qf), q0 = this.SIN - this.PIN;
    if (qf < q0) return this.sideM(qf) + this.BIKE_M + this.BIKE_SW * e(c((qf + 9.5) / 3)) * (1 - e(c((qf + 3) / 2.5)));
    const m = a + (R - a) * e(c((qf - q0) / (this.NRQ + 0.5 - q0))) + (B - R) * e(c((qf - this.NRQ - 0.5) / 2)), t = e(c((qf - this.BIKE_RET - 0.15) / 5));
    return (m - 9 * e(c((qf - this.BIKE_RET + 0.4) / 2.2))) * (1 - t) + (this.sideM(qf) + this.BIKE_M) * t; },      // (- 9: the link keeps the line it had before the road moved 9 m out, between the ramp's pillars)
  glass2W(qf) { const e = t => t * t * (3 - 2 * t), c = v => Math.max(0, Math.min(1, v)), a = this.SPARK_M + 2.2, back = e(c((qf - 58) / 3));
    if (qf >= this.G2R) return (this.GM - 1) * (1 - e(c((qf - this.G2R) / this.G2OUT)));
    return a + (this.GM - a) * e(c((qf - this.GQ) / this.GUP)) + this.G2X * e(c((qf - this.G2Q) / 4)) * (1 - back) - back; },
  glass2H(qf) { const e = t => t * t * (3 - 2 * t), c = v => Math.max(0, Math.min(1, v)), h = this.GH * e(c((qf - this.GQ) / this.GUP));
    return (h + (this.G2H - h) * e(c((qf - this.G2Q) / this.G2UP))) * (1 - e(c((qf - 68) / 7))); },
  gM(g, qf) { return g === 2 && qf >= this.G2Q ? this.glass2W(qf) : this.glassM(qf); },
  gH(g, qf) { return g === 2 && qf >= this.G2Q ? this.glass2H(qf) : this.glassH(qf); },
  // THE RAMP BENDS LEFT (the user: seen from below it curves away, so riding it must curve the same way): the lateral offset of the road (lateral units) on the glass ramp, up and down:
  // SHIFT_M metres to the left by the top (the circuit stays where it is, to the right), back by the end of the way down. Lateral units are U3.X = 2.2 / 0.62 metres.
  SHIFT_M: 17,
  off(d, z) {
    if (d && d.side) { const qf = (z - d.z0) / this.SLOT - (this.STREET + this.TUNNEL + this.ART); return (d.glass && qf >= this.GQ ? this.gM(d.glass, qf) : this.sideM(qf)) / (2.2 / 0.62); }
    if (d && d.park) { const S = this.SLOT, zT = d.z0 + (this.STREET + this.TUNNEL + this.ART) * S, zP = zT - this.PIN * S, zR = zT + S, zQ = zT + this.DIVE * S, e = t => t * t * (3 - 2 * t), D = this.PTUBE_M / (2.2 / 0.62);      // (straight beside the big tube for one slot, then back)
      return z <= zP || z >= zQ ? 0 : -D * (z < zT ? e((z - zP) / (zT - zP)) : z < zR ? 1 : 1 - e((z - zR) / (zQ - zR))); }
    if (!d || !d.up) return 0;
    const S = this.SLOT, z0 = d.z0 + (this.STREET + this.TUNNEL + this.ART - this.UP) * S, zA = z0 + this.UP * S, zB = zA + this.CANYON * S, zC = zB + this.DOWN * S, e = t => t * t * (3 - 2 * t), D = this.SHIFT_M / (2.2 / 0.62);
    return z <= z0 || z >= zC ? 0 : -D * (z < zA ? e((z - z0) / (zA - z0)) : z < zB ? 1 : 1 - e((z - zB) / (zC - zB)));
  },
  // the height of the road (units of run) at z for a detour that took the glass ramp (positive), or the underground tunnel (negative)
  lift(d, z) {
    if (d && d.glass) return this.gH(d.glass, (z - d.z0) / this.SLOT - (this.STREET + this.TUNNEL + this.ART));
    if (d && (d.down || d.park)) { const S = this.SLOT, z0 = d.z0 + (this.STREET + this.TUNNEL + this.ART) * S, zA = z0 + this.DIVE * S, zB = zA + (d.park ? this.PARK : this.UNDER) * S, zC = zB + (d.park ? this.PRISE : this.RISE) * S, e = t => t * t * (3 - 2 * t);
      return z <= z0 || z >= zC ? 0 : -this.DEPTH * (z < zA ? e((z - z0) / (zA - z0)) : z < zB ? 1 : 1 - e((z - zB) / (zC - zB))); }
    if (!d || !d.up) return 0;
    const S = this.SLOT, z0 = d.z0 + (this.STREET + this.TUNNEL + this.ART - this.UP) * S, zA = z0 + this.UP * S, zB = zA + this.CANYON * S, zC = zB + this.DOWN * S, e = t => t * t * (3 - 2 * t);
    return z <= z0 || z >= zC ? 0 : z < zA ? this.H * e((z - z0) / (zA - z0)) : z < zB ? this.H : this.H * (1 - e((z - zB) / (zC - zB)));
  },
  // the junction (track units, a slot boundary) of the neon stretch holding z, or null
  junction(w, z) {
    const pc = w.pieces.find(p => p.z0 <= z && p.z1 > z && TRACK.segments[p.id] && TRACK.segments[p.id].biome === 'neon');
    if (!pc || pc.id === 'neonStart') return null;                                  // (the opening stretch of the run, 400 m, is too short for the district: no corner there)
    return (Math.ceil(pc.z0 / this.SLOT) + this.REL_AFTER) * this.SLOT;
  },
};
const TRACK = {
  noOver: !(typeof window !== "undefined" && window.__keepOver),             // THE USER (2026-11-16): no banner gates (the `over` obstacles, slide under) on any circuit; the patterns keep them, World skips them while this is true (tests that check the slide set window.__keepOver before the page loads)
  segments: {
    cityStart: { name: 'OLD TOWN',      biome: 'city',   length: 900,  curve: 0,    first: 420, spacing: 210, calmStart: true,   // calmStart: the run always opens with the first (hazard-free) pattern
                 patterns: ['line', 'crateJump', 'hurdle', 'slideGate'] },
    cityRun:   { gate: 0.5, name: 'OLD TOWN',      biome: 'city',   length: 1000, curve: 1.1,  first: 60,  spacing: 210,
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
    neonStart: { gate: 0.5, name: 'NEON QUARTER',  biome: 'neon',   length: 4000, curve: 0,    first: 420, spacing: 210, district: 1200, opening: true, calmStart: true,
                 patterns: ['line', 'crateJump', 'hurdle', 'slideGate', 'trailR', 'dodgeL', 'risky', 'zig'] },
    neonRun:   { gate: 0.5, name: 'NEON QUARTER',  biome: 'neon',   length: 21500, curve: -0.8, first: 140, spacing: 210, district: 1200,
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
    utrechtB:  { gate: 0.5, name: 'HOOG CATHARIJNE',  biome: 'utrechtB', length: 1800, curve: 0, first: 160, spacing: 210, district: 600, opening: true, stay: true,
                 patterns: ['slideGate', 'line', 'neonGantry', 'trailL', 'slideGate', 'trailR'], extra: ['gateTrail', 'slideJump'] },
    // The Oudegracht is now in two parts: the canal alone (`utrechtC`, 1100 units: the first bridges and quays), then a JUNCTION (`gateUtrecht`, below): LEFT the canal goes on (`utrechtD`, the Dom at its end), RIGHT the
    // flight of stairs of a bridge climbs to the street along the water, an optional upper circuit with the cheese carts (`utrechtQuay`: the street 3.5 m over the water, the houses and shops, on foot). `stay`: fully in to the end.
    utrechtC:  { name: 'OUDEGRACHT',       biome: 'utrecht',  length: 1100, curve: 0, first: 160, spacing: 210, district: 700, opening: true, stay: true,
                 patterns: ['line', 'crateJump', 'hurdle', 'slideGate', 'dodgeL', 'dodgeR', 'risky', 'zig', 'twin', 'trailL', 'trailR', 'rowL'], extra: ['crateBarrier', 'gateTrail', 'stagger', 'slideJump', 'hopWeave'] },
    utrechtD:  { name: 'OUDEGRACHT',       biome: 'utrecht',  length: 4000, curve: 0, first: 160, spacing: 210, district: 700, opening: true,
                 patterns: ['line', 'crateJump', 'hurdle', 'slideGate', 'dodgeL', 'dodgeR', 'risky', 'zig', 'twin', 'trailL', 'trailR', 'rowL'], extra: ['crateBarrier', 'gateTrail', 'stagger', 'slideJump', 'hopWeave'],
                 props: [{ spr: 'utDom', dz: 2400, x: -9 }], waymark: 'slide' },
    // THE UPPER CIRCUIT of the Oudegracht: the street of the right bank, 3.5 m over the water (the road's `rise`, see `gateUtrecht`), run on foot (no surfboard), past the houses and the shops, with the plane trees and the lawn
    // of the quay; its hazards are the cheese carts (the crate: a wooden cart, a gingham awning, yellow wheels of cheese). `first`: nothing before the top of the stairs (World.genFork also keeps the hazards off both flights).
    utrechtQuay: { name: 'STADSKADE',      biome: 'utrechtQuay', length: 4000, curve: 0, first: 1100, spacing: 210, district: 700, opening: true,
                 patterns: ['line', 'crateJump', 'hurdle', 'slideGate', 'dodgeL', 'crateJump', 'hurdle', 'dodgeR', 'risky', 'slideGate', 'zig', 'twin', 'trailL', 'hurdle', 'trailR', 'rowL'], extra: ['crateBarrier', 'gateTrail', 'stagger', 'slideJump', 'hopWeave'], waymark: 'jump' },
    // VIC, CATALUNYA: the old town's narrow streets (src3d/env_vic.js): eleven pieces: the six original bends (left, right, left...) with a straight stretch between two bends, a street 4.4 m wide (`hw`), two places only (`lanes: 2`: the left half or the right half), hazards against the walls
    vicA: { name: 'VIC', biome: 'vic', lanes: 2, length: 900, curve: 1.1, hw: 0.62, first: 170, spacing: 280, district: 300, opening: true, stay: true, patterns: ['vicLowL', 'vicBarrelR', 'vicHangL', 'vicChairsR', 'vicPotL', 'vicHighL', 'vicBarrelL', 'vicHangR', 'vicChairsL', 'vicPotR', 'vicLowR', 'vicHighR'], extra: [] },
    vicB: { name: 'VIC', biome: 'vic', lanes: 2, length: 900, curve: -1.3, hw: 0.62, first: 170, spacing: 280, district: 300, opening: true, stay: true, patterns: ['vicChairsR', 'vicPotL', 'vicHighL', 'vicBarrelL', 'vicHangR', 'vicChairsL', 'vicPotR', 'vicLowR', 'vicHighR', 'vicLowL', 'vicBarrelR', 'vicHangL'], extra: [] },
    vicC: { name: 'VIC', biome: 'vic', lanes: 2, length: 900, curve: 1.3, hw: 0.62, first: 170, spacing: 280, district: 300, opening: true, stay: true, patterns: ['vicHighL', 'vicBarrelL', 'vicHangR', 'vicChairsL', 'vicPotR', 'vicLowR', 'vicHighR', 'vicLowL', 'vicBarrelR', 'vicHangL', 'vicChairsR', 'vicPotL'], extra: [] },
    vicD: { name: 'VIC', biome: 'vic', lanes: 2, length: 900, curve: -1.3, hw: 0.62, first: 170, spacing: 280, district: 300, opening: true, stay: true, patterns: ['vicChairsL', 'vicPotR', 'vicLowR', 'vicHighR', 'vicLowL', 'vicBarrelR', 'vicHangL', 'vicChairsR', 'vicPotL', 'vicHighL', 'vicBarrelL', 'vicHangR'], extra: [] },
    vicE: { name: 'VIC', biome: 'vic', lanes: 2, length: 900, curve: 1.1, hw: 0.62, first: 170, spacing: 280, district: 300, opening: true, stay: true, patterns: ['vicHighR', 'vicLowL', 'vicBarrelR', 'vicHangL', 'vicChairsR', 'vicPotL', 'vicHighL', 'vicBarrelL', 'vicHangR', 'vicChairsL', 'vicPotR', 'vicLowR'], extra: [] },
    vicF: { name: 'VIC', biome: 'vic', lanes: 2, length: 900, curve: -1.1, hw: 0.62, first: 170, spacing: 280, district: 300, opening: true, stay: true, patterns: ['vicBarrelR', 'vicHangL', 'vicChairsR', 'vicPotL', 'vicHighL', 'vicBarrelL', 'vicHangR', 'vicChairsL', 'vicPotR', 'vicLowR', 'vicHighR', 'vicLowL'], extra: [] },
    vicS1: { gate: 0.5, name: 'VIC', biome: 'vic', lanes: 2, length: 900, curve: 0, hw: 0.62, first: 170, spacing: 280, district: 300, opening: true, stay: true, patterns: ['vicPotL', 'vicHighL', 'vicBarrelL', 'vicHangR', 'vicChairsL', 'vicPotR', 'vicLowR', 'vicHighR', 'vicLowL', 'vicBarrelR', 'vicHangL', 'vicChairsR'], extra: [] },
    vicS2: { name: 'VIC', biome: 'vic', lanes: 2, length: 1400, curve: 0, hw: 0.62, first: 170, spacing: 280, district: 300, opening: true, stay: true, patterns: ['vicBarrelL', 'vicHangR', 'vicChairsL', 'vicPotR', 'vicLowR', 'vicHighR', 'vicLowL', 'vicBarrelR', 'vicHangL', 'vicChairsR', 'vicPotL', 'vicHighL'], extra: [] },
    vicS3: { name: 'VIC', biome: 'vic', lanes: 2, length: 900, curve: 0, hw: 0.62, first: 170, spacing: 280, district: 300, opening: true, stay: true, patterns: ['vicPotR', 'vicLowR', 'vicHighR', 'vicLowL', 'vicBarrelR', 'vicHangL', 'vicChairsR', 'vicPotL', 'vicHighL', 'vicBarrelL', 'vicHangR', 'vicChairsL'], extra: [] },
    vicS4: { name: 'VIC', biome: 'vic', lanes: 2, length: 900, curve: 0, hw: 0.62, first: 170, spacing: 280, district: 300, opening: true, stay: true, patterns: ['vicHighR', 'vicLowL', 'vicBarrelR', 'vicHangL', 'vicChairsR', 'vicPotL', 'vicHighL', 'vicBarrelL', 'vicHangR', 'vicChairsL', 'vicPotR', 'vicLowR'], extra: [] },
    vicS5: { name: 'VIC', biome: 'vic', lanes: 2, length: 900, curve: 0, hw: 0.62, first: 170, spacing: 280, district: 300, opening: true, stay: true, patterns: ['vicHangL', 'vicChairsR', 'vicPotL', 'vicHighL', 'vicBarrelL', 'vicHangR', 'vicChairsL', 'vicPotR', 'vicLowR', 'vicHighR', 'vicLowL', 'vicBarrelR'], extra: [] },
    // THE SQUARE OF VIC (from the user's six photos of the town centre): a new street, two places like the rest of the street (`vicSquare`: crossing, cinema, tobacconist, bollards, trees in planters)
    vicP1: { name: 'VIC', biome: 'vicSquare', lanes: 2, length: 900, curve: 1.2, hw: 0.62, first: 170, spacing: 280, district: 300, opening: true, stay: true, patterns: ['vicHangL', 'vicChairsR', 'vicPotL', 'vicHighL', 'vicBarrelL', 'vicHangR', 'vicChairsL', 'vicPotR', 'vicLowR', 'vicHighR', 'vicLowL', 'vicBarrelR'], extra: [] },
    vicP2: { name: 'VIC', biome: 'vicSquare', lanes: 2, length: 1400, curve: 0, hw: 0.62, first: 170, spacing: 280, district: 300, opening: true, stay: true, patterns: ['vicHangL', 'vicChairsR', 'vicPotL', 'vicHighL', 'vicBarrelL', 'vicHangR', 'vicChairsL', 'vicPotR', 'vicLowR', 'vicHighR', 'vicLowL', 'vicBarrelR'], extra: [] },
    vicP3: { name: 'VIC', biome: 'vicSquare', lanes: 2, length: 900, curve: -1.2, hw: 0.62, first: 170, spacing: 280, district: 300, opening: true, stay: true, patterns: ['vicHangL', 'vicChairsR', 'vicPotL', 'vicHighL', 'vicBarrelL', 'vicHangR', 'vicChairsL', 'vicPotR', 'vicLowR', 'vicHighR', 'vicLowL', 'vicBarrelR'], extra: [] },
    // THE PINK ALLEY (the end of Vic, one place only, from the user's photo of a medina alley): four pieces after the street, rose walls with carved wooden awnings, blue planters to jump, awnings to slide under
    vicR1: { name: 'RUELLE', biome: 'vicMedina', lanes: 1, length: 900, curve: 0, hw: 0.32, first: 170, spacing: 260, district: 300, opening: true, stay: true, patterns: ['vicMS', 'vicMS', 'vicMJ', 'vicMJ', 'vicMS', 'vicMJ'], extra: [] },
    vicR2: { name: 'RUELLE', biome: 'vicMedina', lanes: 1, length: 900, curve: 0.9, hw: 0.32, first: 170, spacing: 260, district: 300, opening: true, stay: true, patterns: ['vicMS', 'vicMJ', 'vicMJ', 'vicMS', 'vicMJ', 'vicMS'], extra: [] },
    vicR3: { name: 'RUELLE', biome: 'vicMedina', lanes: 1, length: 900, curve: -0.9, hw: 0.32, first: 170, spacing: 260, district: 300, opening: true, stay: true, patterns: ['vicMJ', 'vicMJ', 'vicMS', 'vicMJ', 'vicMS', 'vicMS'], extra: [] },
    vicR4: { name: 'RUELLE', biome: 'vicMedina', lanes: 1, length: 900, curve: 0, hw: 0.32, first: 170, spacing: 260, district: 300, opening: true, stay: true, patterns: ['vicMJ', 'vicMS', 'vicMJ', 'vicMS', 'vicMS', 'vicMJ'], extra: [] },
    // THE JUNCTION OF VIC (`gateVic`, after the second straight): LEFT the street goes on (`vicM`: the two halves), RIGHT an ALLEY between two walls, as in the user's photo (`vicAlley`, one place only, `lanes: 1`): no room to go round, the hazards are
    // only jumped or slid under. The two roads come back to the street after 180 m.
    vicM: { name: 'VIC', biome: 'vic', lanes: 2, length: 1800, curve: 0, hw: 0.62, first: 170, spacing: 280, district: 300, opening: true, stay: true, waymark: 'slide',
            patterns: ['vicLowL', 'vicBarrelR', 'vicHangL', 'vicChairsR', 'vicPotL', 'vicHighL', 'vicBarrelL', 'vicHangR', 'vicChairsL', 'vicPotR', 'vicLowR', 'vicHighR'], extra: [] },
    vicAlley: { name: 'RUELLE', biome: 'vicAlley', lanes: 1, length: 1800, curve: 0, hw: 0.32, first: 220, spacing: 260, district: 300, opening: true, stay: true, waymark: 'jump', patterns: ['vicAJ', 'vicAS', 'vicAS', 'vicAJ', 'vicAJ', 'vicAS'], extra: [] },
    // THE COASTAL ZONE, on the main circuit (after the first plaza of every lap), one of four pieces by turns (`pickSegs.C`): the same safe sprint of coin waves, dunes and a few barriers, on a 420 m
    // coast road, under four lights: the sunset (the look of the coast branches of the junctions), the morning haze, the midday sun and the blue hour. A district fading in and out over 90 m.
    coastMorning:  { gate: 0.5, name: 'MORNING COAST',   biome: 'coastMorning', length: 4200, curve: -0.8, first: 220, spacing: 210, district: 900, stay: true, calmStart: true,
                     patterns: ['coastWave', 'coastDunes', 'line', 'coastWave', 'trailR', 'coastDunes', 'trailL', 'hurdle', 'coastWave', 'crateJump'], extra: ['crateBarrier', 'hopWeave'] },
    coastMidday:   { gate: 0.5, name: 'MIDDAY COAST',    biome: 'coastNoon',    length: 4200, curve: -0.8, first: 220, spacing: 210, district: 900, stay: true, calmStart: true,
                     patterns: ['coastWave', 'coastDunes', 'line', 'coastWave', 'trailR', 'coastDunes', 'trailL', 'hurdle', 'coastWave', 'crateJump'], extra: ['crateBarrier', 'hopWeave'] },
    coastSunset:   { gate: 0.5, name: 'SUNSET COAST',    biome: 'coast',        length: 4200, curve: -0.8, first: 220, spacing: 210, district: 900, stay: true, calmStart: true,
                     patterns: ['coastWave', 'coastDunes', 'line', 'coastWave', 'trailR', 'coastDunes', 'trailL', 'hurdle', 'coastWave', 'crateJump'], extra: ['crateBarrier', 'hopWeave'] },
    coastBlueHour: { gate: 0.5, name: 'BLUE HOUR COAST', biome: 'coastBlue',    length: 4200, curve: -0.8, first: 220, spacing: 210, district: 900, stay: true, calmStart: true,
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
    // TERRASSE GASPERI: a night street of café terraces (the user's photo of the Cafetería Nuevo Gasperi, reimagined), coins along the tables and a few easy hazards
    terraceRun:  { kartGate: 0.75, name: 'TERRASSE GASPERI', biome: 'terrace', curve: 0.9, first: 80, spacing: 210,
                   patterns: ['line', 'trailL', 'hurdle', 'rowR', 'slideGate', 'trailR', 'crateJump', 'line', 'dodgeL'], extra: ['gateTrail', 'hopWeave'], waymark: 'jump' },
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
    // the island junction, in the four lights (the passage to the island is optional: LEFT the coast goes on, RIGHT the way to the island, which goes UNDER THE SEA: `tube`, from the user's sketch of an aquarium-style trajectory: the right road keeps the coast's look (`pre`) while the two roads part, then runs 900 m through the glass tunnel (`biome`, ENV3D.coastAqua: long enough to play and enjoy it, about 30 s), BELOW THE LEVEL OF THE SEA AND OF THE LAND (for a runner who took it: the road dives `depth` 13 m GRADUALLY over `ramp` 300 m at the mouth, runs 300 m on the sea bed and comes up again over the last 300 m, World.dropAt; the light, the fog and the colours of the road follow the depth, never a cut: Renderer3D; the coast road is not seen from deep under the sea), then comes up on the 300 m island, the only place of the afro-Mediterranean music; `hold`: the beach look goes through the junction, it does not fade in)
    gateIslandSunset: { zone: 480, branchLen: 15000, merge: 380, blend: 40, hold: true, tube: { pre: 'coast', biome: 'coastAqua', len: 9000, depth: 130, ramp: 3000 }, left: { route: 'coastWalkSunset', sign: 'signCoast' }, right: { route: 'islandSunset', sign: 'signIsland' } },
    gateIslandMidday: { zone: 480, branchLen: 15000, merge: 380, blend: 40, hold: true, tube: { pre: 'coastNoon', biome: 'coastAqua', len: 9000, depth: 130, ramp: 3000 }, left: { route: 'coastWalkMidday', sign: 'signCoast' }, right: { route: 'islandMidday', sign: 'signIsland' } },
    gateIslandBlue: { zone: 480, branchLen: 15000, merge: 380, blend: 40, hold: true, tube: { pre: 'coastBlue', biome: 'coastAqua', len: 9000, depth: 130, ramp: 3000 }, left: { route: 'coastWalkBlue', sign: 'signCoast' }, right: { route: 'islandBlue', sign: 'signIsland' } },
    gateIslandMorning: { zone: 480, branchLen: 15000, merge: 380, blend: 40, hold: true, tube: { pre: 'coastMorning', biome: 'coastAqua', len: 9000, depth: 130, ramp: 3000 }, left: { route: 'coastWalkMorning', sign: 'signCoast' }, right: { route: 'islandMorning', sign: 'signIsland' } },
    // THE UPPER CIRCUIT OF UTRECHT: after the first bridges of the Oudegracht, LEFT the canal goes on, RIGHT a flight of stairs (a bridge's) climbs to the street of the right bank: `rise` lifts the right road by
    // `h` units (34.5 = 3.45 m, 5 cm under the street of the quay props) over `up` units once the roads have parted (the stairs), keeps it there and brings it down over `down` units before the roads merge (all on the grid of 120 units = one 12 m slot). `c`: the lateral centre of each road once
    // open (1.225 lanes: the street, 0.75 lane of half-width, narrower than the canal, runs beside it, 8.7 m from its axis, as the real quay does; FORK_C otherwise).
    gateUtrecht: { zone: 480, branchLen: 4000, merge: 360, blend: 40, hold: true, c: 1.225, rise: { side: 'right', hw: 0.75, h: 34.5, up: 960, down: 840, grid: 120 }, left: { route: 'utrechtD', sign: 'signCanal' }, right: { route: 'utrechtQuay', sign: 'signQuay' } },
    gateVic: { zone: 480, branchLen: 1800, merge: 360, blend: 40, hold: true, c: 2.2, preHw: 0.62, mergeHw: 0.62, left: { route: 'vicM', sign: 'signVic' }, right: { route: 'vicAlley', sign: 'signAlley' } },
    // THE JUNCTIONS OF THE CIRCUIT. The coast and the neon quarter are zones of their own now (Neon > Beach > Saint-Gilles > Utrecht), so the pairs the junction of Saint-Gilles takes (picks.A) offer only the
    // detours that stay in its neighbourhood: forest, market, ruins. The pairs above that lead to the coast or the neon quarter (gate3, gate4, gate2, gate3B, gate4B) are no longer on the circuit.
    gate5: { zone: 440, branchLen: 1300, merge: 360, blend: 40, left: { route: 'ruinsRun', sign: 'signRuins' }, right: { route: 'detourB', sign: 'signMarket' } },
    gate7: { zone: 440, branchLen: 5000, merge: 360, blend: 40, left: { route: 'terraceRun', sign: 'signTerrace' }, right: { route: 'detourB', sign: 'signMarket' } },      // the café terraces or the market
    gate6: { zone: 480, branchLen: 1500, merge: 380, blend: 40, left: { route: 'forestB', sign: 'signForest' }, right: { route: 'ruinsRunB', sign: 'signRuins' } },
  },
  // Every route choice is a fork with a signpost on each side. The two fork slots of a lap (A and B) pick one of three pairs each (see `picks`), so the destinations come in a different order
  // from lap to lap and, in a real run, from run to run (World.seed). Between them the five destinations (forest, market, coast, ruins, neon district) are all reachable.
  base: 'city',          // the biome every segment's palette blends from (the "unblended" look); NOT the biome of the first piece, which is the neon quarter
  // THE ZONES IN ORDER (Utrecht is followed by VIC, the narrow streets, before the neon quarter): Neon > Beach (the coast, in the four lights by turns, then the island junction: the coast goes on or an optional bridge leads to the coastal town on its island) > Saint-Gilles (the street, a junction with forest / market / ruins detours, the tram street, the Gare du Midi) > Utrecht (by train) >
  // Neon again, and so on: one door between each zone and the next (Saint-Gilles to Utrecht is the train, not a door). The run starts in the neon quarter (neonStart); the loop starts at the beach.
  sequence: [{ seg: 'neonStart' }, { pick: 'C' }, { pick: 'E' }, { seg: 'cityRun' }, { pick: 'A' }, { seg: 'plaza' }, { seg: 'cityRunB' }, { seg: 'tramRun' }, { seg: 'gareMidi' }, { seg: 'utrechtA' }, { seg: 'utrechtB' }, { seg: 'utrechtC' }, { fork: 'gateUtrecht' }, { seg: 'vicA' }, { seg: 'vicS1' }, { seg: 'vicB' }, { seg: 'vicS2' }, { fork: 'gateVic' }, { seg: 'vicC' }, { seg: 'vicS3' }, { seg: 'vicD' }, { seg: 'vicS4' }, { seg: 'vicE' }, { seg: 'vicS5' }, { seg: 'vicF' }, { seg: 'vicP1' }, { seg: 'vicP2' }, { seg: 'vicP3' }, { seg: 'vicR1' }, { seg: 'vicR2' }, { seg: 'vicR3' }, { seg: 'vicR4' }, { seg: 'neonRun' }],
  // a `pick` slot of `pickSegs` chooses a SEGMENT instead of a fork pair: one after the other at each passage (the first one with seed 0, a seeded starting point for a real run), so every ambiance of the coastal zone is met in turn
  pickSegs: { C: ['coastSunset', 'coastMidday', 'coastBlueHour', 'coastMorning'] },
  pickForks: { E: ['gateIslandSunset', 'gateIslandMidday', 'gateIslandBlue', 'gateIslandMorning'] },       // a `pick` slot of `pickForks` chooses a FORK by turns, like `pickSegs` a segment
  pickSalt: { E: 'C' },         // the island junction takes its light from the same turn as the coastal piece before it (the same seeded start)
  picks: { A: ['gate', 'gate5', 'gate6', 'gate7'], B: ['gate2', 'gate3B', 'gate4B'] },       // the fork pairs a `pick` slot chooses from (the first lap, with seed 0, takes the first: forest / market); B is not on the circuit any more
  loopFrom: 1,
};
