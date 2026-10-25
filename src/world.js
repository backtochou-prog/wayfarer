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
  constructor(track) { this.track = track; this.reset(); }

  reset() {
    this.pieces = []; this.items = []; this.cursor = {}; this.lastPat = {}; this.seqIdx = 0; this.uid = 0; this.ver = (this.ver || 0) + 1;   // ver only ever increases; it changes whenever bandsAt() results could change (pieces added/dropped, a route chosen)
    this.baseBiome = this.track.base || this.track.segments[this.track.sequence[0].seg].biome;
    this.extend(0);
  }

  nextSpec() {
    const T = this.track, n = T.sequence.length;
    let i = this.seqIdx++;
    if (i >= n) i = T.loopFrom + ((i - n) % (n - T.loopFrom));
    return T.sequence[i];
  }

  // the piece after the one being built (the sequence loops), without consuming it
  peekSpec() {
    const T = this.track, n = T.sequence.length; let i = this.seqIdx;
    if (i >= n) i = T.loopFrom + ((i - n) % (n - T.loopFrom));
    return T.sequence[i];
  }

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
    const seg = this.track.segments[id], end = z0 + len - tail, L = seg.patterns.length;
    let n = this.cursor[id] || 0, last = this.lastPat[id] === undefined ? -1 : this.lastPat[id];
    const h = hashStr(id);
    for (let z = z0 + seg.first; z + seg.spacing <= end; z += seg.spacing + Math.floor(rnd(h, n * 3 + 2) * 50)) {
      let k = Math.floor(rnd(h, n * 3) * L);
      if (n === 0 && seg.calmStart) k = 0;
      else if (L > 1 && last >= 0 && seg.patterns[k] === seg.patterns[last]) {           // compare names: a list can hold the same pattern at two indices
        k = (k + 1 + Math.floor(rnd(h, n * 3 + 1) * (L - 1))) % L;
        for (let t = 0; t < L && seg.patterns[k] === seg.patterns[last]; t++) k = (k + 1) % L;
      }
      n++; last = k;
      for (const [kind, dz, lane, hh] of PATTERNS[seg.patterns[k]])
        this.items.push({ kind, z: z + dz, x: cx + lane * LANE_W, h: hh === undefined ? 12 : hh, tag, pat: seg.patterns[k], seg: id, inst: n });   // pat / seg / inst: which pattern, segment and occurrence made this item (for tests)
    }
    this.cursor[id] = n; this.lastPat[id] = last;
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
  }

  pieceAt(z) { return this.pieces.find(p => z < p.z1) || this.pieces[this.pieces.length - 1]; }

  // Road bands at depth z, each with a lateral range, a curve offset and its biome blend.
  // One band on normal road; two on a junction (they diverge, run parallel, then rejoin).
  bandsAt(z) {
    const P = this.pieceAt(z), T = this.track;
    if (P.type === 'seg') {
      const s = P.seg, pv = P.prev;
      let to = s.biome, t = 0;
      if (s.district) { const d = s.district === true ? 0.3 * (P.z1 - P.z0) : s.district; t = ease(clamp(Math.min(s.opening ? d : z - P.z0, P.z1 - z) / d, 0, 1)); }   // a district fades in over its first `district` units and out over its last (an `opening` one is already fully in at the start)
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
