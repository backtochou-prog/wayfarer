// World model: a deterministic chain of track pieces (segments / junctions), road geometry,
// the branch choice, and item spawning from TRACK data.
const LPX = 100, K = 90, HY = 64, VW = 320, VH = 180, PLAYER_D = 20, MAXD = 720;
const S20 = K / (PLAYER_D + K); // projection scale at the player's depth
const APPROACH = 450;           // scenery starts leaning toward the branch biomes this far before the fork
const GUIDE_DIST = 350;         // in this last stretch before a junction the runner is eased onto the picked road (Game.steer), so it is kept free of hazards
const PROMPT_DIST = 760;        // LEFT / RIGHT prompt appears this far before the junction line
const ease = u => u * u * (3 - 2 * u);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const bump = u => { const s = Math.sin(Math.PI * clamp(u, 0, 1)); return s * s; };
function rnd(a, b = 0) {
  let h = (a * 374761393 + b * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

function hashStr(s) { let h = 17; for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0; return h; }

class World {
  constructor(track) { this.track = track; this.extras = false; this.reset(); }       // extras: the 3D build's extra items and patterns (power-ups, shards, waymarks, skill patterns); off for the classic 2D game

  reset() {
    this.pieces = []; this.items = []; this.cursor = {}; this.lastPat = {}; this.seqIdx = 0; this.seqCount = 0; this.picked = {}; this.pickLap = {}; this.pickLast = {}; this.lastPU = {}; this.lastShard = {}; this.puKind = ''; this.uid = 0; this.ver = (this.ver || 0) + 1;   // ver only ever increases; it changes whenever bandsAt() results could change (pieces added/dropped, a route chosen)
    this.baseBiome = this.track.base || this.track.segments[this.track.sequence[0].seg].biome;
    this.extend(0);
  }

  // The piece sequence repeats from `loopFrom`. A `{ pick: 'A' }` entry is a fork slot: it takes one of the pairs of TRACK.picks.A, a different one on each lap (never the same twice in a row).
  // `this.seed` 0 (the default, and what the tests use) is the canonical order: the first lap takes the first pair (forest / market), later laps are seeded picks; any other seed (a real run:
  // see Game.runSeed) varies the order from the very first fork. The choice is a pure function of (seed, slot, lap), resolved once and kept, so peekSpec and nextSpec always agree.
  specAt(i) {
    const T = this.track, n = T.sequence.length;
    if (i >= n) i = T.loopFrom + ((i - n) % (n - T.loopFrom));
    const sp = T.sequence[i];
    if (!sp.pick) return sp;
    const key = this.seqCount;                                          // the absolute index of the piece being resolved
    if (this.picked[key]) return this.picked[key];
    if (T.pickSegs && T.pickSegs[sp.pick]) {                           // a slot that takes a segment by turns: the passage number plus a seeded start (0 for the canonical seed)
      const so = T.pickSegs[sp.pick], n = this.pickLap[sp.pick] || 0, sd = this.seed || 0, off = sd ? Math.floor(rnd(sd * 13 + 5, hashStr((T.pickSalt && T.pickSalt[sp.pick]) || sp.pick)) * so.length) : 0;
      this.pickLap[sp.pick] = n + 1; return (this.picked[key] = { seg: so[(n + off) % so.length] });
    }
    const opts = T.picks[sp.pick], lap = this.pickLap[sp.pick] || 0, seed = this.seed || 0, h = hashStr(sp.pick);
    let k = lap === 0 && !seed ? 0 : Math.floor(rnd(seed * 31 + lap, h) * opts.length);
    const prev = this.pickLast[sp.pick];
    if (prev !== undefined && opts.length > 1 && k === prev) k = (k + 1 + Math.floor(rnd(seed * 17 + lap, h + 1) * (opts.length - 1))) % opts.length;
    this.pickLap[sp.pick] = lap + 1; this.pickLast[sp.pick] = k;
    return (this.picked[key] = { fork: opts[k] });
  }
  nextSpec() { this.seqCount = this.seqIdx; const sp = this.specAt(this.seqIdx); this.seqIdx++; return sp; }
  peekSpec() { this.seqCount = this.seqIdx; return this.specAt(this.seqIdx); }

  extend(z) {
    for (;;) {
      const last = this.pieces[this.pieces.length - 1];
      if (last && last.z1 > z + 2400) break;
      this.addPiece();
    }
  }

  addPiece() {
    const spec = this.nextSpec(), T = this.track, prev = this.pieces[this.pieces.length - 1] || null;
    const z0 = prev ? prev.z1 : 0, uid = this.uid++;
    let P;
    if (spec.seg) {
      const seg = T.segments[spec.seg], nx = this.peekSpec();
      P = { type: 'seg', id: spec.seg, seg, uid, z0, z1: z0 + seg.length, prev };
      this.genSegment(spec.seg, z0, seg.length, 'main', 0, nx && nx.fork ? GUIDE_DIST + 40 : 0);   // nothing in the stretch before a junction
    } else {
      const f = T.forks[spec.fork], fe = z0 + f.zone, be = fe + f.branchLen;
      P = { type: 'fork', fork: f, uid, z0, fe, be, z1: be + f.merge, choice: null, prev };
      this.genFork(P);
    }
    this.pieces.push(P); this.ver++;
  }

  // Items of one segment. Each spot takes a seeded pick from the segment's pattern list (never the same pattern twice in a row), and the
  // gap to the next spot is the base spacing plus 0-49 seeded units, never less. Hazards sit 55-70 units into every pattern, so the
  // distance between consecutive hazards stays >= spacing - 15 whatever the order. Deterministic: same track -> same items.
  genSegment(id, z0, len, tag, cx, tail = 0) {
    const seg = this.track.segments[id], end = Math.min(z0 + len - tail, seg.itemsEnd !== undefined ? z0 + seg.itemsEnd : 1e12), X = this.extras;
    const list = X && seg.extra ? seg.patterns.concat(seg.extra) : seg.patterns, L = list.length;                            // extras: the skill patterns join the segment's own list
    for (const pr of seg.props || []) this.items.push({ kind: 'prop', spr: pr.spr, z: z0 + pr.dz, x: pr.x, tag: 'prop' });          // fixed props of the segment (the station hall ...)
    let n = this.cursor[id] || 0, last = this.lastPat[id] === undefined ? -1 : this.lastPat[id];
    const h = hashStr(id);
    for (let z = z0 + seg.first; z + seg.spacing <= end;) {
      let k = Math.floor(rnd(h, n * 3) * L);
      if (X && PATTERNS_X[list[k]] && z < PATTERNS_X[list[k]].intro) k = Math.floor(rnd(h, n * 3 + 5) * seg.patterns.length);     // a skill pattern not introduced yet: one of the classic ones
      if (n === 0 && seg.calmStart) k = 0;
      else if (L > 1 && last >= 0 && list[k] === list[last]) {                           // compare names: a list can hold the same pattern at two indices
        k = (k + 1 + Math.floor(rnd(h, n * 3 + 1) * (L - 1))) % L;
        for (let t = 0; t < L && (list[k] === list[last] || (X && PATTERNS_X[list[k]] && z < PATTERNS_X[list[k]].intro)); t++) k = (k + 1) % L;
      }
      n++; last = k;
      const px = PATTERNS_X[list[k]], items = px ? px.items : PATTERNS[list[k]], inst = h + '.' + n;
      for (const [kind, dz, lane, hh] of items) {
        const it = { kind, z: z + dz, x: cx + lane * LANE_W, h: hh === undefined ? 12 : hh, tag, pat: list[k], seg: id, inst: n };       // pat / seg / inst: which pattern, segment and occurrence made this item (for tests)
        if (px && px.combo && OBST[kind]) { it.combo = inst + tag; it.comboN = px.combo; }                                  // the hazards of a sequence: passing them all without a hit earns the skill bonus
        this.items.push(it);
      }
      z += Math.max(seg.spacing, px ? px.last + 140 : 0) + Math.floor(rnd(h, n * 3 + 2) * 50);    // a skill pattern is followed by the usual gap after its LAST hazard
    }
    this.cursor[id] = n; this.lastPat[id] = last;
    if (X) this.genExtras(id, seg, z0, end, tag, cx);
  }

  // ---- extras (the 3D build): one Golden Waymark spot per fork branch, then power-ups and Memory Shards in the clear gaps. All seeded by the segment id and the spot index, so the same track gives the same items.
  // `free(tag, z, x, dzBefore, dzAfter, wide)` = no hazard of that road within the window in a lane near x (every lane if `wide`), and no other pickup within 30 units
  free(tag, z, x, before, after, wide) {
    for (const it of this.items) {
      if (it.tag !== tag || it.kind === 'prop') continue;
      const dz = it.z - z;
      if (OBST[it.kind]) { if (dz > -before && dz < after && (wide || Math.abs(it.x - x) < 0.45)) return false; }
      else if (it.kind !== 'coin' && Math.abs(dz) < 30) return false;
    }
    return true;
  }
  genExtras(id, seg, z0, end, tag, cx) {
    const h = hashStr(id) ^ 0x5bd1e995, tail = end - 160;
    if (seg.waymark && tag !== 'main') {                                           // the route's Golden Waymark: its pattern replaces whatever the grid put in a window of the branch
      const W = WAYMARKS[seg.waymark], zc = z0 + (end - z0) * 0.45;
      this.items = this.items.filter(it => !(it.tag === tag && it.kind !== 'prop' && it.z > zc - 175 && it.z < zc + W.last + 205));
      for (const [kind, dz, lane, hh] of W.items) this.items.push({ kind, z: zc + dz, x: cx + lane * LANE_W, h: hh === undefined ? 12 : hh, tag, pat: 'wm' + seg.waymark, seg: id, inst: 0 });
    }
    const base = k => this[k][tag] !== undefined ? this[k][tag] : (this[k].main !== undefined ? this[k].main : -1e9);
    let lastPU = base('lastPU'), lastSh = base('lastShard');
    for (let m = 0, z = z0 + 520; z < tail; m++, z += 330 + Math.floor(rnd(h, m * 7 + 1) * 120)) {
      const pre = Math.floor(rnd(h, m * 7 + 2) * 3) - 1;                           // lane -1 .. 1
      if (z > 700 && z - lastPU >= 2400 && rnd(h, m * 7 + 3) < 0.55) {            // a power-up: at most one every 240 m on a road, never in the first 70 m, never against a hazard
        let kind = ['magnet', 'aura', 'dash'][Math.floor(rnd(h, m * 7 + 4) * 3)];
        if (kind === this.puKind) kind = ['magnet', 'aura', 'dash'][(['magnet', 'aura', 'dash'].indexOf(kind) + 1) % 3];
        for (let t = 0; t < 3; t++) {
          const lane = ((pre + 1 + t) % 3) - 1, x = cx + lane * LANE_W;
          if (this.free(tag, z, x, 70, kind === 'dash' ? 130 : 70, kind === 'dash')) { this.items.push({ kind, z, x, h: 12, tag, seg: id }); lastPU = z; this.puKind = kind; break; }
        }
      } else if (z > 500 && z - lastSh >= 650 && rnd(h, m * 7 + 5) < 0.6) {       // a Memory Shard: off the usual line, or high enough to need a jump
        const how = Math.floor(rnd(h, m * 7 + 6) * 3);
        for (let t = 0; t < 3; t++) {
          const lane = ((pre + 1 + t) % 3) - 1;
          if (how === 0) { const l = lane || 1, x = cx + l * LANE_W; if (this.free(tag, z, x, 60, 60, false)) { this.items.push({ kind: 'shard', z, x, h: 12, tag, seg: id }); lastSh = z; break; } }                                  // at the edge of the road
          else if (how === 1) { const x = cx + lane * LANE_W; if (this.free(tag, z, x, 60, 60, true)) { this.items.push({ kind: 'shard', z, x, h: 36, tag, seg: id }); lastSh = z; break; } }                              // up in the air: a jump
          else if (this.free(tag, z - 22, cx - LANE_W, 60, 60, false) && this.free(tag, z + 22, cx + LANE_W, 60, 60, false)) { for (const [dz, sl] of [[-22, -1], [22, 1]]) this.items.push({ kind: 'shard', z: z + dz, x: cx + sl * LANE_W, h: 14, tag, seg: id }); lastSh = z; break; }   // a pair on both edges: one side only
        }
      }
    }
    this.lastPU[tag] = lastPU; this.lastShard[tag] = lastSh;
  }

  genFork(P) {
    const f = P.fork, s = P.z0;
    this.items.push(
      { kind: 'prop', spr: f.left.sign, z: s - 420, x: -1.35, tag: 'prop' },
      { kind: 'prop', spr: f.right.sign, z: s - 420, x: 1.35, tag: 'prop' },
      { kind: 'prop', spr: f.left.sign, z: s - 140, x: -1.35, tag: 'prop' },
      { kind: 'prop', spr: f.right.sign, z: s - 140, x: 1.35, tag: 'prop' },
      { kind: 'prop', spr: 'gore', z: s + 70, x: 0, tag: 'prop' });
    for (const side of ['left', 'right']) {
      const sg = side === 'left' ? -1 : 1, tag = P.uid + side;
      for (let k = 0; k < 6; k++) {
        const z = s + f.zone * (0.4 + 0.1 * k), e = ease((z - s) / f.zone);
        this.items.push({ kind: 'coin', z, x: sg * (0.45 + (FORK_C - 0.45) * e), h: 12, tag });
      }
      this.genSegment(f[side].route, P.fe, f.branchLen, tag, sg * FORK_C);
    }
    if (this.extras) { const lt = P.uid + 'left', rt = P.uid + 'right'; this.lastPU.main = Math.max(this.lastPU[lt] === undefined ? -1e9 : this.lastPU[lt], this.lastPU[rt] === undefined ? -1e9 : this.lastPU[rt], this.lastPU.main === undefined ? -1e9 : this.lastPU.main); this.lastShard.main = Math.max(this.lastShard[lt] === undefined ? -1e9 : this.lastShard[lt], this.lastShard[rt] === undefined ? -1e9 : this.lastShard[rt], this.lastShard.main === undefined ? -1e9 : this.lastShard.main); }
  }

  pieceAt(z) { return this.pieces.find(p => z < p.z1) || this.pieces[this.pieces.length - 1]; }

  // blend 0..1 of a district segment at z: in over its first `district` units, out over its last (an `opening` one is already fully in at the start)
  districtT(P, z) {
    const s = P.seg, d = s.district === true ? 0.3 * (P.z1 - P.z0) : s.district;
    if (s.stay) return s.opening ? 1 : ease(clamp(Math.min(z - P.z0, d) / d, 0, 1));   // `stay`: fades in, then stays in to the end of the segment (the next piece takes over at full strength); with `opening` it is in all the way
    return ease(clamp(Math.min(s.opening ? d : z - P.z0, P.z1 - z) / d, 0, 1));
  }
  // how much of a segment's grade applies at z: a `stay` district still eases its slope out over its last `district` units (the road levels off before the next piece)
  gradeT(P, z) { const s = P.seg; if (!s.district) return 1; if (!s.stay) return this.districtT(P, z); const d = s.district; return ease(clamp(Math.min(z - P.z0, P.z1 - z) / d, 0, 1)); }

  // DESCENT. A segment with `grade` (fall per unit of run, e.g. 0.07) slopes downhill along its length in proportion to its district blend, so the slope eases in and out with the
  // atmosphere. Gameplay stays flat (the runner is always at height 0); only the drawing follows the slope. dropAt(z) is the fall, in units of run, from the start of the graded pieces held
  // up to z: only differences between two z are meaningful (pieces behind the runner are pruned, which cancels out). gradeAt(z) is the slope at z.
  dropAt(z) {
    let d = 0;
    for (const P of this.pieces) {
      if (P.type !== 'seg' || !P.seg.grade || z <= P.z0) continue;
      const tab = P.dropTab || (P.dropTab = this.dropTable(P)), k = (Math.min(z, P.z1) - P.z0) / 20, i = Math.min(tab.length - 2, Math.floor(k));
      d += P.seg.grade * (tab[i] + (tab[i + 1] - tab[i]) * (k - i));
    }
    return d;
  }
  gradeAt(z) { const P = this.pieceAt(z); return P.type === 'seg' && P.seg.grade ? P.seg.grade * this.gradeT(P, z) : 0; }
  dropTable(P) {                                        // running integral of the blend every 20 units (trapezoids)
    const n = Math.ceil((P.z1 - P.z0) / 20) + 2, tab = new Float32Array(n); let prev = this.gradeT(P, P.z0);
    for (let j = 1; j < n; j++) { const t = this.gradeT(P, Math.min(P.z1, P.z0 + j * 20)); tab[j] = tab[j - 1] + 20 * (prev + t) / 2; prev = t; }
    return tab;
  }

  // Road bands at depth z, each with a lateral range, a curve offset and its biome blend.
  // One band on normal road; two on a junction (they diverge, run parallel, then rejoin).
  bandsAt(z) {
    const P = this.pieceAt(z), T = this.track;
    if (P.type === 'seg') {
      const s = P.seg, pv = P.prev;
      let to = s.biome, t = 0;
      if (s.district) t = this.districtT(P, z);   // a district fades in over its first `district` units and out over its last (an `opening` one is already fully in at the start)
      if (pv && pv.type === 'fork' && pv.choice) { // fade out of the branch we just left
        to = T.segments[pv.fork[pv.choice].route].biome;
        t = clamp(1 - (z - pv.be) / (pv.fork.merge + 250), 0, 1);
      }
      const b = { lo: -0.9, hi: 0.9, side: 0, route: P.id, off: s.curve * bump((z - P.z0) / (P.z1 - P.z0)), to, t, chosen: true };
      b.eL = b.eR = { to, t };
      const F = this.pieces[this.pieces.indexOf(P) + 1];
      if (F && F.type === 'fork' && z > F.z0 - APPROACH) { // edges lean toward the branch biomes
        const k = 0.5 * (z - (F.z0 - APPROACH)) / APPROACH;
        b.eL = { to: T.segments[F.fork.left.route].biome, t: k };
        b.eR = { to: T.segments[F.fork.right.route].biome, t: k };
      }
      return [b];
    }
    const F = P.fork, out = [];
    for (const sg of [-1, 1]) {
      const side = sg < 0 ? 'left' : 'right', seg = T.segments[F[side].route];
      let c, hw = 0.9, off = 0;
      if (z < P.fe) { const e = ease((z - P.z0) / F.zone); c = 0.45 + (FORK_C - 0.45) * e; hw = 0.45 + 0.45 * e; }
      else if (z < P.be) { c = FORK_C; off = seg.curve * bump((z - P.fe) / F.branchLen); }
      else c = FORK_C * (1 - ease((z - P.be) / F.merge));
      const a = sg * (c - hw), b2 = sg * (c + hw);
      const up = clamp((z - P.z0) / (F.zone + F.blend), 0, 1);
      const down = z > P.be ? clamp(1 - (z - P.be) / (F.merge + 250), 0, 1) : 1;
      const t = Math.min(up, down);
      const bd = { lo: Math.min(a, b2), hi: Math.max(a, b2), side: sg, route: F[side].route, off, to: seg.biome, t, chosen: P.choice === side };
      bd.eL = bd.eR = { to: seg.biome, t };
      out.push(bd);
    }
    return out;
  }

  bandNear(z, x) {
    let best = null, bd = 1e9;
    for (const b of this.bandsAt(z)) { const d = Math.abs(x - (b.lo + b.hi) / 2); if (d < bd) { bd = d; best = b; } }
    return best;
  }

  // The band the player is on: centre/offset used by the camera plus biome info for sky and labels.
  playerBand(z, x) {
    const bands = this.bandsAt(z);
    if (bands.length === 1) { const b = bands[0]; return { c: 0, off: b.off, to: b.to, t: b.t, route: b.route }; }
    const chosen = bands.find(b => b.chosen);
    if (chosen) return { c: (chosen.lo + chosen.hi) / 2, off: chosen.off, to: chosen.to, t: chosen.t, route: chosen.route };
    const n = this.bandNear(z, x); // undecided: look toward the side the player leans to
    return { c: 0, off: 0, to: n.to, t: n.t, route: n.route };
  }

  // The junction the player has not yet committed to (null if none is within reach).
  openFork() { return this.pieces.find(p => p.type === 'fork' && !p.choice) || null; }

  // Lock the choice for this junction. The other road keeps its coins and hazards (they stay visible alongside as the road you
  // did not take); they cannot be touched, since the runner is confined to the chosen road and the two roads are metres apart.
  commit(F, side) {
    F.choice = side; this.ver++;
  }

  // Keep the player on their road. On a junction only the chosen road counts.
  clampX(x, z) {
    const m = 0.12, bands = this.bandsAt(z);
    let b = bands[0];
    if (bands.length > 1) b = bands.find(q => q.chosen) || { lo: bands[0].lo, hi: bands[1].hi };
    return clamp(x, b.lo + m, b.hi - m);
  }

  prune(z) {
    this.items = this.items.filter(i => i.z > z - 60);
    while (this.pieces.length > 2 && this.pieces[0].z1 < z - 700) { this.pieces.shift(); this.ver++; }
  }

  themeAt(z, x) {
    const b = this.bandNear(z, x);
    return (b.t > 0.5 ? BIOMES[b.to] : BIOMES[this.baseBiome]).props;
  }
}
