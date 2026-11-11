// RACE: the race zone's rules, pure (no drawing, no DOM): the player's car against the robot's magnetic car over RACE.LEN metres on a three-lane track.
// The robot is faster than the player's own pace: only the SPEED SPIRALS (four colours, four speeds) let the player catch it and cross the line first; the pink BRAKE RINGS slow the car, the running
// DROIDS must be avoided (change lane) or jumped over from a RAMP; two RARE TOKENS lie on the track (the counter is kept between runs). Losing ends the race at once (the robot crossed first).
// Units: metres and seconds along the track `s`; lanes -1, 0, 1 (LANE_M apart). Every number a test or the renderer needs is a field of the Race.
const RACE = {
  LEN: 2600, LANE_M: 2.4, BASE: 43, BOT: 58, ACCEL: 40,                         // BASE: the car's own pace (m/s); BOT: the robot's pace
  SPIRAL: [{ name: 'RED', add: 25 }, { name: 'PURPLE', add: 17 }, { name: 'GREEN', add: 11 }, { name: 'LIME', add: 6 }],      // the speed each colour adds (m/s) while it lasts
  SPIRAL_T: 3.2, BRAKE_MUL: 0.55, BRAKE_T: 2.0, HIT_MUL: 0.3, HIT_T: 0.9, JUMP_T: 1.1,
  LAST: 0.75,     /* where the run-in starts (the last quarter: more spirals, the strong colours, fewer traps, so the player can still take the robot) */
  THROTTLE: 5, PEDAL_MUL: 0.5,   /* the PEDALS (the user: 'boutons accelerer, freiner'): accelerating while held adds THROTTLE m/s to the car's pace (the user asked for both cars faster: 43 / 58 m/s, the spirals scaled with them; 5, not more: measured by tests/race_sim.js, a player who only holds the accelerator in one lane wins about one race in six, an attentive one 85 % without it and all with it; the spirals stay the way to win), braking while held halves it */
  DROID_V: 12, DROID_TRIGGER: 50, RAMP_BEFORE: 30, BUMP_MUL: 0.6, BUMP_T: 0.9, BUMP_GAP: 4.4,          /* running into the back of the robot's car: it is an obstacle like any other, the player is slowed and held behind it */
};
// THE KART CIRCUIT (the Galerie Gasperi, a ring inside a big shopping centre): the same rules over two laps of a ring of radius R (src3d/kart3d.js draws it)
const KART = { R: 240, LAPS: 5, BANK: 1.6, GATE_W: 12, INNER: -16, EQ_V: 140 };      /* EQ_V: how fast the equalizer colour change runs round the track, m/s (slower: a longer, more gradual passage, the user) */      /* INNER: the inner ring road's centre, metres across from the track's (lap 4 is run on it) */      /* (4 laps: the user added two; BANK: how far the inner edge goes down in lap 2, metres) */ KART.LAP = 2 * Math.PI * KART.R; KART.LEN = Math.round(KART.LAP * KART.LAPS);
// THE GATE AT THE END OF LAP 3 (the user: neon electronic barriers guide the karts through the gate and forbid another lap on the big ring; lap 4 is run on the inner ring road): from FUNNEL the
// lanes close from the right (the middle one 80 m before the line), then every kart turns left through the gate (TURN: where the turn starts, over TURN_L m) onto the inner road.
KART.GATE_S = 3 * KART.LAP; KART.FUNNEL = KART.GATE_S - 420; KART.FUNNEL2 = KART.GATE_S - 160;
// THE DETOUR FENCE (the user's red line: one long diagonal from the right edge across the track to the left lane, in front of the gate): x across the track at s
KART.fence = s => { if (s < KART.FUNNEL) return 6.3; const v = Math.max(0, Math.min(1, (s - KART.FUNNEL) / (KART.GATE_S - 40 - KART.FUNNEL))); return 6.3 - 7.5 * v; }; KART.TURN = KART.GATE_S - 14; KART.TURN_L = 50; KART.TD = 14; KART.DIVE_L = 110;      /* the gate leads UNDERGROUND (the user): the road dives TD m over DIVE_L m into the spiral tunnel */
class Race {
  constructor(seed, opts) {
    this.len = (opts && opts.len) || RACE.LEN; this.kart = !!(opts && opts.kart);      // (the KART circuit of the Galerie Gasperi: laps of a ring, src3d/kart3d.js)
    this.seed = seed || 1; this.t = 0; this.done = false; this.result = null; this.fin = 0;          // result: 'win' | 'lose'
    this.p = { s: 0, lane: -1, x: -RACE.LANE_M, speed: RACE.BASE * 0.6, boost: 0, boostT: 0, brakeT: 0, hitT: 0, air: 0, pedal: null, spirals: 0, rare: 0, hits: 0, rings: 0, jumps: 0, near: 0, bumps: 0 };
    this.bot = { s: 0, speed: RACE.BASE * 0.65, lane: 1, x: RACE.LANE_M, finishT: null };             // the two cars start SIDE BY SIDE on the line, one at each side of the track (the player on the left, the robot on the right: a lane of road between them)                                              
    if (this.kart) {                                                                                  // THE KART CIRCUIT races EIGHT robot karts (the user: '8 voitures robots qui font la course avec le joueur; il doit les doubler sans les toucher par derrière'):
      this.bots = [];                                                                                 // they start spread out ahead of the player, the nearest the fastest, all a little slower than the player's own pace, each weaving through the lanes
      // FOURTEEN robot karts (the user: more cars, varied distances and driving styles): spread out irregularly ahead, each with a STYLE -
      //   steady: keeps its lane a long time, an even pace;   weaver: changes lane often and quickly;   surger: bursts of speed then eases;   cruiser: slower, hugs the right;   racer: fast, swerves late
      const ST = { steady: { lf: 0.12, lx: 1.0, sw: 0.02, sf: 0.5 }, weaver: { lf: 0.55, lx: 2.6, sw: 0.03, sf: 0.9 }, surger: { lf: 0.25, lx: 1.4, sw: 0.12, sf: 0.35 }, cruiser: { lf: 0.1, lx: 0.8, sw: 0.02, sf: 0.4, bias: 0.7 }, racer: { lf: 0.35, lx: 2.0, sw: 0.05, sf: 0.7 } };
      const ORDER = ['racer', 'weaver', 'steady', 'surger', 'cruiser', 'weaver', 'racer', 'steady', 'surger', 'cruiser', 'weaver', 'steady', 'surger', 'racer'];
      let s1 = 22; for (let i = 0; i < 14; i++) { const st = ORDER[i], q = this.rnd(900 + i), lane = [1, 0, -1][Math.floor(this.rnd(950 + i) * 3)], v = (st === 'racer' ? 47.8 : st === 'cruiser' ? 43.8 : 46.3) - i * 0.18 + q * 0.6;
        this.bots.push({ s: s1, lane, x: lane * RACE.LANE_M, v, speed: 30, finishT: null, i, style: st, P: ST[st], ph: this.rnd(970 + i) * 6.28 }); s1 += 14 + Math.floor(this.rnd(990 + i) * 46); }
      this.bot = this.bots[7];
    }
    this.items = []; this.events = []; this.build();
  }
  rnd(n) { let h = (this.seed * 374761393 + n * 668265263) >>> 0; h = ((h ^ (h >>> 13)) * 1274126177) >>> 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
  add(o) { o.id = this.items.length; o.taken = false; this.items.push(o); return o; }
  // the layout: a set every ~55 m after a 110 m run-up. A set is a spiral line, a ring trap with a spiral beside it, or a droid (with a ramp before it in its lane, or in the open). Spirals are worth more where it is harder to be.
  build() {
    let s = 110, n = 0, rare = 0;
    while (s < this.len - 90) {
      const r = k => this.rnd(n * 17 + k), lane = Math.floor(r(1) * 3) - 1, kind = r(2), other = lane === 1 ? -1 : lane + 1, third = -lane - other;
      const late = s > this.len * RACE.LAST;                                                        // the run-in of the race
      if (late ? kind < 0.72 : kind < 0.34) {                                                                               // a line of three spirals of one colour in one lane (the colour by luck, rarer the stronger)
        const c = late ? (r(3) < 0.55 ? 0 : 1) : r(3) < 0.12 ? 0 : r(3) < 0.32 ? 1 : r(3) < 0.62 ? 2 : 3;                 // in the run-in the strong colours (red, purple) and a longer line of them
        for (let k = 0, nS = late ? 5 : 3; k < nS; k++) this.add({ type: 'spiral', color: c, lane, s: s + k * 9 });
        if (late) for (let k = 0; k < 3; k++) this.add({ type: 'spiral', color: r(8) < 0.5 ? 1 : 2, lane: other, s: s + 4 + k * 9 });   // and a second line beside it: there is always a way to gain
      } else if (late ? kind < 0.86 : kind < 0.62) {                                                                        // a single brake ring in one lane (lying on the road), a spiral in the third (the colour of the spiral again by luck)
        if (!this.kart) this.add({ type: 'ring', lane, s });                                        // (no brake rings on the kart circuit: the robot karts are the obstacles)
        this.add({ type: 'spiral', color: r(4) < 0.2 ? 0 : r(4) < 0.5 ? 1 : 2, lane: third, s: s + 2 });
      } else {                                                                                         // a droid in a lane: dodge it, or take the ramp that lies in front of it; a spiral waits after it in that lane
        const droid = this.kart ? { s: s + 38 } : this.add({ type: 'droid', lane, s: s + 38, run: false, v: 0, hit: false });      // (the KART circuit has no droids, the user: 'enlève les droïdes, laisse les rampes')
        if (this.kart || r(5) < 0.7) this.add({ type: 'ramp', lane, s: droid.s - RACE.RAMP_BEFORE - 0 });
        this.add({ type: 'spiral', color: r(6) < 0.3 ? 0 : 1, lane, s: droid.s + 14 });
        if (n % 5 === 4 && rare < 2) { this.add({ type: 'rare', lane: other, s: droid.s + 6 }); rare++; }
      }
      s += (late ? 44 : 52) + Math.floor(r(7) * 16); n++;
    }
    while (rare < 2) { const q = this.items.filter(i => i.type === (this.kart ? 'ramp' : 'droid')); const d = q[rare * 3 + 1] || q[q.length - 1]; this.add({ type: 'rare', lane: d.lane === 1 ? -1 : d.lane + 1, s: d.s + 6 }); rare++; }
    if (this.kart) this.items = this.items.filter(it => it.s < KART.FUNNEL - 30 || it.s > KART.GATE_S + 90);
    if (this.kart) {                                                                                  // IN THE TUNNEL (lap 4) the speed arrows run only along the two sides (the user: none in the middle), in tidy
      let side = 1, last = -1e9;                                                                     // lines: each line of arrows on one side, the next line on the other side
      { let kept = false; this.items = this.items.filter(it => { if (it.type !== 'ramp' || it.s <= KART.GATE_S) return true; if (kept) return false; kept = true; return true; }); }      // one ramp only in the tunnel
      for (const it of this.items) if (it.type === 'spiral' && it.s > KART.GATE_S) { if (it.s - last > 20) side = -side; it.lane = side; last = it.s; } }      // (nothing on the road where the barriers funnel the karts into the gate)
    this.items.sort((a, b) => a.s - b.s);
  }
  // one step: input.lane (-1, 0, 1: the lane wanted, set by the key presses of the caller) -> the car changes lane smoothly; the airborne car cannot be hit
  step(dt, input) {
    if (this.done) { this.fin += dt; return; }
    const p = this.p, bot = this.bot; this.t += dt;
    if (input && input.lane !== undefined) p.lane = Math.max(-1, Math.min(1, input.lane));
    p.lane = Math.min(p.lane, this.maxLane(p.s));
    if (this.kart && p.s > KART.FUNNEL - 20 && p.s < KART.GATE_S && p.x + 0.9 > KART.fence(p.s)) {        // BRUSHING THE FENCE (pushed by it instead of moving left in time): the kart slows and sparks
      p.speed *= Math.pow(0.55, dt); p.scrape = (p.scrape || 0) + dt; if (!this._scr) this.events.push({ e: 'scrape' }); this._scr = true; } else this._scr = false;
    p.pedal = input && input.brake ? 'brake' : input && input.accel ? 'accel' : null;                      // (braking wins when both are held)
    p.x += (p.lane * RACE.LANE_M - p.x) * Math.min(1, dt * 9);
    p.boostT = Math.max(0, p.boostT - dt); if (!p.boostT) p.boost = 0; p.brakeT = Math.max(0, p.brakeT - dt); p.hitT = Math.max(0, p.hitT - dt); p.air = Math.max(0, p.air - dt);
    let target = RACE.BASE + p.boost + (p.pedal === 'accel' ? RACE.THROTTLE : 0); if (p.pedal === 'brake') target *= RACE.PEDAL_MUL; if (p.brakeT > 0) target *= RACE.BRAKE_MUL; if (p.hitT > 0) target *= RACE.HIT_MUL;
    const coast = this.kart && p.pedal !== 'brake' && !(p.brakeT > 0) && !(p.hitT > 0);      /* the kart: when a boost runs out the speed eases down (it felt like braking by itself: the user) */
    p.speed += Math.max(-RACE.ACCEL * (coast ? 0.3 : 2.2) * dt, Math.min(RACE.ACCEL * dt, target - p.speed));
    const s0 = p.s; p.s += p.speed * dt;
    if (this.kart) for (const b of this.bots) { { const P = b.P, want = Math.max(-1, Math.min(this.maxLane(b.s), Math.round(Math.sin(this.t * P.lf + b.ph) * 1.3 + (P.bias || 0)))); if (want === b.lane || want > this.maxLane(b.s) || !(p.lane === want && Math.abs(p.s - b.s) < 10)) b.lane = Math.min(want, this.maxLane(b.s)); }      /* (a robot does not cut into the player's lane right beside or in front of the player) */ b.x += (b.lane * RACE.LANE_M - b.x) * Math.min(1, dt * 1.4 * b.P.lx); b.speed += Math.min(14 * dt, b.v * (1 + b.P.sw * Math.sin(this.t * b.P.sf + b.ph)) - b.speed); b.s += b.speed * dt; }
    else {
    bot.lane = Math.max(-1, Math.min(1, Math.round(Math.sin(this.t * 0.33 + Math.PI / 2) * 1.3)));                       // the robot drifts from lane to lane: the player has to go round it, not through it
    bot.x += (bot.lane * RACE.LANE_M - bot.x) * Math.min(1, dt * 1.6);
    bot.speed += Math.min(18 * dt, RACE.BOT * (1 + 0.04 * Math.sin(this.t * 0.9)) - bot.speed); bot.s += bot.speed * dt; }                           // the robot's pace breathes a little
    for (const it of this.items) {
      if (it.type === 'droid') {
        if (!it.run && it.s - p.s < RACE.DROID_TRIGGER && !it.hit) { it.run = true; this.events.push({ e: 'droid', id: it.id }); }
        if (it.run && !it.hit) it.s -= RACE.DROID_V * dt;
      }
      if (it.taken) continue;
      const lo = Math.min(s0, p.s) - 0.6, hi = Math.max(s0, p.s) + 0.6;
      if (it.type === 'droid') {
        if (it.hit) continue;
        const reach = it.run ? 1.6 : 1.1;
        if (it.lane === p.lane && it.s > p.s - 1.2 && it.s < p.s + reach + 0.4 && Math.abs(p.x - it.lane * RACE.LANE_M) < 1.3 && p.air <= 0) {
          it.hit = true; p.hits++; p.hitT = RACE.HIT_T; p.speed *= 0.5; this.events.push({ e: 'hit', id: it.id });
        }
        continue;
      }
      if (it.s < lo || it.s > hi) continue;
      if (Math.abs(p.x - it.lane * RACE.LANE_M) > 1.25) continue;
      if (it.type === 'spiral') { it.taken = true; const c = RACE.SPIRAL[it.color]; p.spirals++; if (c.add >= p.boost) p.boost = c.add; p.boostT = Math.max(p.boostT, RACE.SPIRAL_T) + (p.boostT > 0 ? 0.6 : 0); this.events.push({ e: 'spiral', color: it.color }); }
      else if (it.type === 'ring' && p.air <= 0) { it.taken = true; p.rings++; p.brakeT = RACE.BRAKE_T; this.events.push({ e: 'ring' }); }
      else if (it.type === 'ramp' && p.air <= 0) { it.taken = true; p.air = RACE.JUMP_T; p.jumps++; this.events.push({ e: 'jump' }); }
      else if (it.type === 'rare') { it.taken = true; p.rare++; this.events.push({ e: 'rare' }); }
    }
    for (const bot of (this.kart ? this.bots : [this.bot])) if (!this.done && p.s > bot.s - RACE.BUMP_GAP && p.s < bot.s + 2 && Math.abs(p.x + this.off(p.s) - bot.x - this.off(bot.s)) < 1.5 && (!this.kart || (s0 < bot.s - RACE.BUMP_GAP + 0.6 && !(p.s > KART.FUNNEL - 60 && p.s < KART.GATE_S + 140)))) {      // (the kart: only when the player really runs into its back - a robot cutting in alongside is not a bump - and none in the merge to the gate, where every kart is squeezed into one lane)      // (the kart: the back of each robot kart)        // the back of the robot's car: an obstacle. The player is slowed and cannot drive through it
      p.s = bot.s - RACE.BUMP_GAP; p.speed = Math.min(p.speed * RACE.BUMP_MUL, bot.speed * 0.8); p.hitT = Math.max(p.hitT, RACE.BUMP_T); p.bumps = (p.bumps || 0) + 1; this.events.push({ e: 'bump' });
    }
    if (this.kart && !this.gateOpen && !this.done) {                                                    // THE GATE: it opens for the first kart to reach it; if that is a robot, the player is out at once
      const lead = Math.max(p.s, ...this.bots.map(b => b.s));
      if (lead >= KART.TURN) { if (p.s >= lead) { this.gateOpen = true; this.events.push({ e: 'gate' }); } else { this.done = true; this.result = 'lose'; this.gateShut = true; this.events.push({ e: 'lose' }); } } }      // THE GATE opens for the leader at the end of lap 3
    for (const b of (this.kart ? this.bots : [bot])) if (b.finishT === null && b.s >= this.len) b.finishT = this.t;
    const first = this.kart ? this.bots.find(b => b.finishT !== null) : (bot.finishT !== null ? bot : null);
    if (this.kart) this.bot = this.bots.reduce((a, b) => (b.s > a.s ? b : a));                           // (the HUD's robot: the leading kart)
    if (p.s >= this.len) { this.done = true; this.result = first ? 'lose' : 'win'; this.events.push({ e: this.result }); }
    else if (first) { this.done = true; this.result = 'lose'; this.events.push({ e: 'lose' }); }          // the robot crossed first: out at once
  }
  place() { return this.kart ? 1 + this.bots.filter(b => b.s > this.p.s).length : (this.bot.s > this.p.s ? 2 : 1); }      // the player's place in the race (the kart: out of nine)
  off(s) { if (!this.kart) return 0; const v = Math.max(0, Math.min(1, (s - KART.TURN) / KART.TURN_L)); return KART.INNER * v * v * (3 - 2 * v); }      // the kart: lateral shift onto the inner road
  dep(s) { if (!this.kart || s < KART.GATE_S) return 0; const v = Math.max(0, Math.min(1, (s - KART.GATE_S - 4) / KART.DIVE_L)); return -KART.TD * v * v * (3 - 2 * v); }      // lap 4 goes UNDERGROUND (the spiral tunnel)
  keepLeft(s) { return !!this.kart && s > KART.FUNNEL - 250 && s < KART.GATE_S; }      // the zone of the KEEP LEFT indicators
  maxLane(s) { if (!this.kart || s < KART.FUNNEL || s > KART.GATE_S + 60) return 1; return Math.max(-1, Math.min(1, Math.floor((KART.fence(s) - 1.6) / RACE.LANE_M + 1e-6))); }      // a lane stays open while the fence is right of it       // the barriers close the lanes from the right
  gap() { return this.bot.s - this.p.s; }                                                              // metres the robot is ahead (negative: the player leads)
  progress() { return Math.min(1, this.p.s / this.len); }
}
