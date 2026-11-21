// src3d/bike_lane.js: THE BIKE LANE'S ENTRANCES (the user, 2026-11-18; the rule is in Game.bikeLane / Game.steer): wherever the scenery lays the coastBike strip (the coast road, the island), every 20 slots
// (240 m) the kerb is lowered over 2 slots (24 m) into the lane: a green ramp across the kerb with white arrows and a bicycle sign on a post; a vehicle to ride it (the magnetic scooter or
// the e-bike, in turn) is parked just before each entrance, beyond the lane. Added by wrapping the layouts of those biomes, so nothing else of their scenery changes.
(function () {
  const mod = (a, n) => ((a % n) + n) % n;
  const entry = () => { const p = [Kit.box(0.5, 0.06, 12.2, 0, 0, 0, '#2fbf5a')];
    for (const z of [-4, 0, 4]) p.push(Kit.box(0.08, 0.02, 0.5, 0.0, 0.06, z, '#ffffff', { ry: 0.6 }), Kit.box(0.08, 0.02, 0.5, 0.0, 0.06, z + 0.3, '#ffffff', { ry: -0.6 }));
    p.push(Kit.cyl(0.05, 0.05, 2.2, 1.6, 0, -5, '#3a3f48'), Kit.box(0.06, 0.6, 0.6, 1.6, 2.0, -5, '#2a6ad8'), Kit.box(0.07, 0.36, 0.36, 1.56, 2.12, -5, '#ffffff'), Kit.box(0.08, 0.06, 0.4, 1.6, 2.65, -5, '#2fbf5a', { glow: true }));
    return Kit.merge(p); };
  const extra = { laneEntry: entry, scooterMag: () => Kit.merge(RunnerSprite.magScooterParts(0, 0, 0.35, 0)), bikeSport: () => typeof BIKE_ART !== 'undefined' ? RunnerSprite.bikeCardProp() : RunnerSprite.bikeStatic(0.25) };
  for (const k of Object.keys(ENV3D)) {
    const E = ENV3D[k]; if (!E || !/^coast/.test(k) || typeof E.layout !== 'function' || !E.props) continue;
    for (const n in extra) if (!E.props[n]) E.props[n] = extra[n];
    if (E.layout._bike) continue;
    const base = E.layout, wrapped = (i, rnd) => { const out = base(i, rnd); if (!out.some(q => q.prop === 'coastBike')) return out; const m = mod(i, 20), o = out.slice();
      if (m <= 1) o.push({ prop: 'laneEntry', x: 3.3, dist: 6 });
      if (m === 18) o.push({ prop: mod(Math.floor(i / 20), 2) ? 'bikeSport' : 'scooterMag', x: 5.7, dist: 6 });
      return o; };
    wrapped._bike = true; E.layout = wrapped;
  }
})();
// (loaded after every env_*.js, so the coast and island biomes are there to wrap; the prop is named laneEntry, not bike*, which the renderer would offer as a vehicle)

// THE BIKE LANE OF ART CITY (the user, 2026-11-21; its line and entrances: NEON_CORNER.bikeM / bikeEntry, the rule: Game.bikeLane): a green strip right of the circuit's right rail all along
// the district; at each entrance the rail is open over two slots (the same green ramp and sign as on the coast). From the side road's fork on it is scenery: it follows the slip, crosses
// the open ground to the roundabout, passes it on the right and runs beyond the back road, straight on. Added by wrapping ArtCity.layout and NeonAvenue.layout.
(function () {
  if (typeof ArtCity === 'undefined' || typeof NeonAvenue === 'undefined' || typeof NEON_CORNER === 'undefined' || !NEON_CORNER.bikeM || !ENV3D.neon || !ENV3D.neon.props) return;
  const C = NEON_CORNER, GREEN = '#1fae6a', P = ENV3D.neon.props, N = C.ART, PN = C.PIN, U = C.UP;
  // THE LANE IS TWO-WAY (the user: "comme réellement, une voie qui vient et l'autre qui va"): BIKE_W wide, a white dashed centre line, an arrow in each half (ours, the right one, points on;
  // the left one points back), lit edges. rot: a point (lx, lz) of the lane's own frame turned by ry, as the lane bends.
  const W = C.BIKE_W, H = W / 2, WH = '#f4efe2', rot = (lx, lz, ry) => [lx * Math.cos(ry) + lz * Math.sin(ry), -lx * Math.sin(ry) + lz * Math.cos(ry)];
  const seg = (p, x, y, z, len, ry) => { p.push(Kit.box(W, 0.03, len, x, y, z, GREEN, { ry })); for (const s of [-1, 1]) { const [ox, oz] = rot(s * (H - 0.03), 0, ry); p.push(Kit.box(0.06, 0.02, len, x + ox, y + 0.02, z + oz, '#9ff4ff', { glow: true, ry })); } };
  const arrow = (p, x, y, z, ry, dir) => { const put = (lx, lz, len, a) => { const [ox, oz] = rot(lx, lz, ry); p.push(Kit.box(0.08, 0.01, len, x + ox, y + 0.03, z + oz, WH, { ry: ry + a })); }, sx = dir * H / 2;      // dir 1: our half, pointing on (-z); -1: the other half, pointing back
    put(sx, 0, 1.0, 0); put(sx + 0.1, -dir * 0.37, 0.4, dir * 0.59); put(sx - 0.1, -dir * 0.37, 0.4, -dir * 0.59); };
  const strip = y => () => { const p = []; seg(p, 0, y, 0, 12.25, 0); for (const z of [-4.5, -1.5, 1.5, 4.5]) p.push(Kit.box(0.07, 0.01, 1.2, 0, y + 0.03, z, WH)); arrow(p, 0, y, 3, 0, 1); arrow(p, 0, y, -3, 0, -1); return Kit.merge(p); };
  const bent = (q0, y) => () => { const p = [], n = 8, f = t => C.bikeM(q0 + t), xm = f(0.5);
    for (let i = 0; i < n; i++) { const x0 = f(i / n) - xm, x1 = f((i + 1) / n) - xm, dz = 12 / n, len = Math.hypot(x1 - x0, dz) + 0.06, ry = -Math.atan((x1 - x0) / dz), x = (x0 + x1) / 2, z = 6 - dz * (i + 0.5);
      seg(p, x, y, z, len, ry); if (i % 2) p.push(Kit.box(0.07, 0.01, 0.9, x, y + 0.03, z, WH, { ry })); if (i === 2) arrow(p, x, y, z, ry, 1); if (i === 6) arrow(p, x, y, z, ry, -1); }
    return Kit.merge(p); };
  // an entrance: the green ramp from the road's edge to the lane, its chevrons, the bicycle sign on a post beyond the lane
  P.bkEntry = () => { const p = [Kit.box(0.9, 0.06, 12.2, 0, 0, 0, '#2fbf5a')], px = C.BIKE_M + H + 0.45 - 3.6;
    for (const z of [-4, 0, 4]) p.push(Kit.box(0.08, 0.02, 0.5, 0.1, 0.06, z, '#ffffff', { ry: 0.6 }), Kit.box(0.08, 0.02, 0.5, 0.1, 0.06, z + 0.3, '#ffffff', { ry: -0.6 }));
    p.push(Kit.cyl(0.05, 0.05, 2.2, px, 0, -5, '#3a3f48'), Kit.box(0.06, 0.6, 0.6, px, 2.0, -5, '#2a6ad8'), Kit.box(0.07, 0.36, 0.36, px - 0.04, 2.12, -5, '#ffffff'), Kit.box(0.08, 0.06, 0.4, px, 2.65, -5, '#2fbf5a', { glow: true })); return Kit.merge(p); };
  P.artBike = strip(0.03); P.bkStrip = strip(0.12);
  const SW = PN + 6, RT = C.BIKE_RET, RE = C.BIKE_END, bend = q => Math.abs(C.bikeM(q + 1) - C.bikeM(q)) > 0.01 || Math.abs(C.bikeM(q + 0.5) - C.bikeM(q)) > 0.01;      // (the swing round the signs starts 6 slots before the fork)
  for (let k = 0; k < SW; k++) P['bkBA' + k] = bent(k - SW, 0.05);
  for (let q = 0; q < RE; q++) P['bkB' + q] = bent(q, 0.12);
  const baseA = ArtCity.layout, baseN = NeonAvenue.layout, BLD = /^art(Graffiti|Run|Wavy|News|CollageB|Prism)/;
  ArtCity.layout = (r, rnd, det, liftM = 0) => { const out = baseA(r, rnd, det, liftM), up = !!(det && det.up), add = [], X = C.bikeM(r - N + 0.5);
    if (r < N - SW) add.push({ prop: 'artBike', x: C.BIKE_M, dist: 6 });
    else if (r < N - PN || !(det && det.park)) add.push({ prop: 'bkBA' + (r - (N - SW)), x: X, dist: 6 });
    if (r < N - PN) { if (r >= N - SW) for (const o of out) if (o.x > 4 && BLD.test(o.prop)) o.x += C.BIKE_SW + 0.6;      // (the buildings step back where the lane swings out)
      for (const o of out) if (o.x > 3.9 && o.x < C.BIKE_M + H + 0.3 && !/^art(Rail|Floor)|^sdSign/.test(o.prop)) o.x = X + H + 1.9;            // (whatever was parked on the lane's line stands beside it)
      if (C.bikeEntry(r)) { for (let n = out.length - 1; n >= 0; n--) if (out[n].prop === 'artRail' && out[n].x > 0) out.splice(n, 1); if (r < N - SW) add.push({ prop: 'bkEntry', x: 3.6, dist: 6 }); } }
    if (up && r >= N - U) for (const a of add) { a.x += NeonAvenue.shift((r - (N - U) + 0.5) / U); a.dy = -liftM; }
    else if (det && det.side && r >= N - PN) { const s0 = C.sideM(r - N), s1 = C.sideM(r - N + 1); for (const a of add) { a.x -= (s0 + s1) / 2; a.rotY = Math.atan((s1 - s0) / 12); } }
    for (const a of add) { a.solo = true; out.push(a); } return out; };
  NeonAvenue.layout = (q, rnd, liftM) => { const out = baseN(q, rnd, liftM);
    if (liftM > 3 && q > RT && q < RT + 5) for (let n = out.length - 1; n >= 0; n--) if (/^ft/.test(out[n].prop) && out[n].x - NeonAvenue.D > 26 && out[n].x - NeonAvenue.D < 62) out.splice(n, 1);      // (the towers make room for the link back to the side road)
    if (liftM > 3 && q > RT && q < RT + 5) for (let n = out.length - 1; n >= 0; n--) if (/^ftStation/.test(out[n].prop)) out.splice(n, 1);      // (... and the stations with them: their lifts and legs stood on the link)
    if (liftM > 3 && q >= 0 && q < C.CANYON) for (let n = out.length - 1; n >= 0; n--) if (out[n].prop === 'cnPlanter' && Math.abs(out[n].x - NeonAvenue.D - C.bikeM(q + 0.5)) < 3) out.splice(n, 1);      // (no planter on the lane)
    if (liftM > 3 && q >= 0 && q < C.CANYON) { const it = (prop, x) => out.push({ prop, x: x + NeonAvenue.D, dist: 6, dy: -liftM, solo: true });
      if (q >= RT) it('bkStrip', C.NRX + C.BIKE_OUT); if (q < RE) it(bend(q) ? 'bkB' + q : 'bkStrip', C.bikeM(q + 0.5)); }
    return out; };
  // (the link comes in under the two-floor street: there the street stands open to the right, no pillar and no pylon on the lane)
  const baseS = NeonAvenue.side; if (baseS) NeonAvenue.side = (q, rnd, glass) => { const o = baseS(q, rnd, glass); if (q > RT + 3 && q < RT + 6) for (const p of o) if (/^(sdStreet|sdStreetL|ftStreet)$/.test(p.prop)) p.prop = 'sdStreetO';
    { const mid = Math.floor((15 + C.CANYON) / 2); if ((q >= mid - 9 && q <= mid - 5) || (q >= mid + 5 && q <= mid + 9)) for (const p of o) if (/^ft(Green|Plain)/.test(p.prop)) p.x -= 5; }      // (the towers that stepped back where the side road swings to the park stood on the back road's edge: 4 m nearer)
    return o; };
})();
