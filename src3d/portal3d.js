// Portal: the passages between the zones as a JOURNEY THROUGH A STARGATE (3D build only; it only draws, plays sounds and clears the road: the rules and the scoring are not touched).
//
// THE ZONES in order: Neon > Beach (the coast) > Saint-Gilles > Utrecht > Neon again (src/track.js `sequence`). A zone is a family of biomes: Saint-Gilles = city + tram + gare and the forest / market /
// ruins detours of its junction (no door there: they are part of the zone), the coast in all its lights, Utrecht, the neon quarter. There is ONE passage between a zone and the next, with two doors, both the
// user's picture: the ENTRY door (the transmitter) 15 m before the boundary of the two segments and the EXIT door (the receiver) 55 m after it, 70 m from the entry door, so far that it cannot be seen from
// it (an exit door only fades in when it is less than 70 m away, an entry door from 120 m). Between them the screen is lit pink (a vignette and light streaks flying outward, the middle of the screen kept
// clear so the road stays readable), with a flash as each door is crossed, and two voices. The passage out of a segment with a cutscene (the Gare du Midi, where the train takes the runner to Utrecht) has
// no door: that one is left as it is.
// THE BLACK HOLE. The middle of the door is black and opaque (the picture is transparent round it). As the runner reaches the door it is pulled into that black hole (the last 14 m: it spirals in,
// turns and shrinks away), stays out of sight between the two doors, then falls out of the middle of the exit door and settles back onto its road (from 17 m before the exit door, so that it is out before it
// goes through it, to 2 m after it). The runner is not made invincible: instead the road is CLEAR of hazards from the start of the pull to 2 m after the exit door (they are taken out when the passage is
// first seen), so nothing it could not see is in its way. The pull and the entry voice start together, 14 m before the entry door.
// Distances are in the track's units (10 per metre).
class Portal {
  constructor(g) { this.g = g; this.reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches; this.reset(); }
  reset() { this.list = []; this.seen = new Set(); this.k = 0; this.flash = 0; this.count = 0; this.act = null; this.pose = { mode: 'none', e: 0 }; }

  static fam(biome) { return /^coast/.test(biome) ? 'coast' : /^utrecht/.test(biome) ? 'utrecht' : /^(city|tram|gare|forest|market|ruins)$/.test(biome) ? 'saintgilles' : biome; }

  // the passages between the pieces the world has built so far (it builds ahead and forgets behind, so each pair of neighbours is looked at once, when it first appears)
  scan(w) {
    const P = w.pieces, T = w.track, fam = id => Portal.fam(T.segments[id].biome); let added = false;
    for (let i = 0; i + 1 < P.length; i++) {
      const A = P[i], B = P[i + 1], key = A.uid + '>' + B.uid; if (this.seen.has(key)) continue; this.seen.add(key);
      if (A.type !== 'seg' || B.type !== 'seg' || A.seg.scene || fam(A.id) === fam(B.id)) continue;
      const q = { zIn: B.z0 - 150, zOut: B.z0 + 550, hit: false, out: false, id: key, from: fam(A.id), to: fam(B.id) }; this.list.push(q); added = true;
      const a = q.zIn - Portal.PULL, b = q.zOut + Portal.SETTLE; for (const it of w.items) if (OBST[it.kind] && it.z >= a && it.z <= b) it.taken = true;                 // the journey's road has no hazards
    }
    if (added) this.list.sort((a, b) => a.zIn - b.zIn);
  }

  // the doors that stand in the track range [za, zb): { z, kind: 'in' | 'out', q }
  gatesIn(za, zb) {
    const out = [];
    for (const q of this.list) { if (q.zIn >= za && q.zIn < zb) out.push({ z: q.zIn, kind: 'in', q }); if (q.zOut >= za && q.zOut < zb) out.push({ z: q.zOut, kind: 'out', q }); }
    return out;
  }

  // light of the journey at z: `k` (0..1) the pink wash, `flash` (0..1) the flash of a door being crossed
  static light(q, z) {
    const ramp = t => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); }, tri = (c, h) => Math.max(0, 1 - Math.abs(z - c) / h);
    const lvl = 0.3 + 0.25 * Math.max(tri(q.zIn, 200), tri(q.zOut, 200));                                    // steady between the doors, stronger near each of them
    const k = lvl * ramp((z - (q.zIn - 90)) / 90) * (z > q.zOut ? ramp(1 - (z - q.zOut) / 150) : 1);
    return { k, flash: Math.max(tri(q.zIn, 70), 0.75 * tri(q.zOut, 60)) };
  }

  // each step (after the run moved from prevZ): the pull starts, the doors' voices play, and the light of the journey and the runner's pose are set for the picture
  update(g, prevZ) {
    const z = g.p.z, ramp = t => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); }; this.scan(g.world); let k = 0, flash = 0, act = null;
    for (const q of this.list) {
      const zp = q.zIn - Portal.PULL, ze = q.zOut - Portal.EMERGE;
      if (!q.hit && prevZ < zp && z >= zp) { q.hit = true; q.out = false; this.count++; g.emit('portalIn'); }
      if (q.hit && !q.out && prevZ < ze && z >= ze) { q.out = true; g.emit('portalOut'); }
      if (q.hit && z >= zp && z <= q.zOut + Portal.SETTLE) act = q;
      if (z < q.zIn - 100 || z > q.zOut + 160) continue;
      const L = Portal.light(q, z); if (L.k > k) k = L.k; if (L.flash > flash) flash = L.flash;
    }
    this.k = k; this.flash = flash * (this.reduced ? 0.35 : 1); this.act = act;
    this.pose = !act ? { mode: 'none', e: 0 } : z < act.zIn ? { mode: 'pull', e: ramp((z - (act.zIn - Portal.PULL)) / Portal.PULL) } : z < act.zOut - Portal.EMERGE ? { mode: 'hidden', e: 1 } : { mode: 'emerge', e: ramp((z - (act.zOut - Portal.EMERGE)) / (Portal.EMERGE + Portal.SETTLE)) };
    if (this.list.length > 24) this.list = this.list.filter(q => q.zOut > z - 3000);
  }
}
Portal.PULL = 140; Portal.EMERGE = 170; Portal.SETTLE = 20;                                    // track units: the pull before the entry door, the emergence before the exit door, the settling after it
