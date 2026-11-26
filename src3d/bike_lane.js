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
  // A PARK along the lane's far side, by the back road (the user's red marks, 2026-11-21: that side was a black void up to the horizon): a lawn, a hedge by the lane, trees, a path lamp.
  const tree = (p, x, z, h, r, c) => { p.push(Kit.cyl(0.16, 0.22, h, x, 0.1, z, '#5a3b2e', { seg: 6 }), Kit.ico(r, x, h + r * 0.55, z, c, { sy: 0.9 }), Kit.ico(r * 0.7, x + r * 0.55, h + r * 0.2, z + 0.4, '#2f7d4f', { sy: 0.85 })); };
  // (THE WALK's dirt track, NEON_CORNER.walkM, crosses the park, a garden and the paved walk: clr(q, xc) tells whether the point (lx, lz) of a prop standing at slot q, xc m right of
  // the circuit, is more than m metres from the track's line; the props it crosses are built with it, hedges open and nothing standing on it)
  const clr = (q, xc) => q == null || !C.walkM ? () => true : (lx, lz, m) => Math.abs(xc + lx - C.walkM(q + 0.5 - lz / 12)) > m;
  const hedge = (p, ok, w, h, d, x, y, z, c) => { const along = d > w, L = along ? d : w, n = Math.ceil(L / 2.1), l = L / n; for (let i = 0; i < n; i++) { const o = -L / 2 + l * (i + 0.5), hx = along ? x : x + o, hz = along ? z + o : z; if (ok(hx, hz, 3.4)) p.push(Kit.box(along ? w : l + 0.02, h, along ? l + 0.02 : d, hx, y, hz, c)); } };
  const park = (v, q, xc) => () => { const ok = clr(q, xc), p = [Kit.box(18, 0.1, 12.25, 0, 0, 0, '#1f6b45')], T = (x, z, h, r, c) => { if (ok(x, z, 5)) tree(p, x, z, h, r, c); }; hedge(p, ok, 0.5, 0.55, 12.25, -8.6, 0.1, 0, '#2a8a52');
    if (v) { T(-4.5, 3, 3.2, 2.0, '#3aa863'); T(2.5, -3.5, 4.2, 2.6, '#2f9358'); T(6.5, 2, 2.8, 1.8, '#3aa863'); }
    else { T(-5.5, -2.5, 3.8, 2.3, '#2f9358'); T(0.5, 3.5, 3.0, 1.9, '#3aa863'); T(5.5, -1, 4.6, 2.8, '#2f9358');
      if (ok(-7.9, 0, 3)) p.push(Kit.cyl(0.05, 0.05, 2.6, -7.9, 0.1, 0, '#3a3f48'), Kit.box(0.3, 0.12, 0.3, -7.9, 2.7, 0, '#ffe9a8', { glow: true })); }
    return Kit.merge(p); };
  P.bkParkA = park(0); P.bkParkB = park(1);
  // NEO METROPOLIS (the user's blueprint, 2026-11-21: "construire ces immeubles sur les traits, éloignés de la voie vélo d'à peu près 24 mètres"): the building of src3d/metropolis_art.js,
  // its front to the lane, 24 m beyond it (the park between the two), one every METRO_EVERY slots along the back road.
  // (2026-11-21, the user: of the 10 Neo Metropolis plots the 1st, 4th, 7th and 8th keep their building; the 2nd and 3rd are a GARDEN, the 5th and 6th a SKATE PARK; the others stay empty.
  // Each plot 42 m deep (x, the lane on the -x side) and 50 m long (z).)
  const lampP = (p, x, z, c) => p.push(Kit.cyl(0.09, 0.12, 4.6, x, 0.1, z, '#23285e', { seg: 6 }), Kit.box(0.9, 0.14, 0.3, x, 4.7, z, c, { glow: true }));
  const bench = (p, x, z, ry) => p.push(Kit.box(2.2, 0.12, 0.6, x, 0.5, z, '#b9824a', { ry }), Kit.box(2.2, 0.5, 0.1, x + 0.28 * Math.sin(ry), 0.62, z + 0.28 * Math.cos(ry), '#b9824a', { ry }), Kit.box(2, 0.4, 0.12, x, 0.1, z, '#3a3d55', { ry }));
  const garden = (q, xc) => () => { const ok = clr(q, xc), p = [Kit.box(42, 0.14, 50, 0, 0, 0, '#2a8a52')], SAND = '#d9c9a3', FL = ['#ff4fa0', '#ffd23a', '#ffffff', '#b06bff', '#ff7a3a'];
    p.push(Kit.box(42, 0.05, 3, 0, 0.14, 0, SAND), Kit.box(3, 0.05, 50, 0, 0.14, 0, SAND), Kit.cyl(7.5, 7.5, 0.05, 0, 0.15, 0, SAND, { seg: 24 }));                                   // the paths: a cross and a round place
    if (ok(0, 0, 7)) p.push(Kit.cyl(4, 4.3, 0.7, 0, 0.15, 0, '#8a8a90', { seg: 20 }), Kit.cyl(3.6, 3.6, 0.1, 0, 0.8, 0, '#4fe3ff', { glow: true, seg: 20 }), Kit.cyl(0.5, 0.8, 2.2, 0, 0.8, 0, '#8a8a90', { seg: 8 }),
      Kit.cyl(1.5, 0.4, 0.3, 0, 3, 0, '#8a8a90', { seg: 12 }), Kit.ico(0.6, 0, 3.4, 0, '#9ff4ff', { glow: true }));                                                                    // the fountain
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const bx = sx * 11.5, bz = sz * 13.5;                                                                                       // four flower beds, a tree in each
      if (!ok(bx, bz, 10)) { if (ok(sx * 6.3, sz * 3.2, 4)) bench(p, sx * 6.3, sz * 3.2, sz > 0 ? 0 : Math.PI); continue; }
      p.push(Kit.box(13, 0.35, 15, bx, 0.14, bz, '#5a3b2e'), Kit.box(12.4, 0.1, 14.4, bx, 0.49, bz, '#3fae5a'));
      for (let i = 0; i < 5; i++) for (let j = 0; j < 6; j++) if ((i + j) % 2 === 0 && !(i === 2 && (j === 2 || j === 3))) p.push(Kit.box(1.1, 0.4, 1.1, bx - 4.8 + i * 2.4, 0.55, bz - 6 + j * 2.4, FL[(i * 2 + j + (sx + 1) + (sz + 1) / 2) % 5]));
      tree(p, bx, bz, 3.4, 2.3, '#3fd060'); bench(p, sx * 6.3, sz * 3.2, sz > 0 ? 0 : Math.PI); lampP(p, sx * 3.2, sz * 9, '#ffe9a8'); }
    for (let k = 0; k < 9; k++) { if (ok(19.3, -22 + k * 5.5, 5)) tree(p, 19.3, -22 + k * 5.5, 4 + (k % 3) * 0.6, 2.2, k % 2 ? '#2f9e58' : '#3fd060'); if (k % 2 === 0 && Math.abs(k - 4) > 0 && ok(-19.3, -22 + k * 5.5, 5)) { tree(p, -19.3, -22 + k * 5.5, 3.6, 2, '#2f9e58'); } }      // a row of trees at the back, a few in front
    for (const sz of [-1, 1]) { hedge(p, ok, 42, 0.8, 0.7, 0, 0.14, sz * 24.6, '#1f6b45'); hedge(p, ok, 0.7, 0.8, 21.5, -20.6, 0.14, sz * 13.9, '#1f6b45'); }                     // hedges round it, the gate facing the lane
    hedge(p, ok, 0.7, 0.8, 50, 20.6, 0.14, 0, '#1f6b45');
    for (const sz of [-1, 1]) p.push(Kit.cyl(0.2, 0.25, 3.4, -20.6, 0.14, sz * 2.4, '#e8e2d0', { seg: 8 })); p.push(Kit.box(0.5, 0.4, 6.2, -20.6, 3.5, 0, '#e8e2d0'), Kit.box(0.2, 0.16, 5, -20.9, 3.62, 0, '#ff4fa0', { glow: true }));      // the gate
    for (let k = 0; k < 4; k++) { const z = -4.5 + k * 3; p.push(Kit.cyl(0.14, 0.14, 2.8, 13, 0.14, z, '#e8e2d0', { seg: 6 }), Kit.cyl(0.14, 0.14, 2.8, 16, 0.14, z, '#e8e2d0', { seg: 6 }), Kit.box(4, 0.14, 0.2, 14.5, 2.94, z, '#e8e2d0')); }      // a pergola at the back
    p.push(Kit.box(0.2, 0.14, 9.6, 13, 3.08, 0, '#e8e2d0'), Kit.box(0.2, 0.14, 9.6, 16, 3.08, 0, '#e8e2d0'), Kit.box(3.4, 0.2, 9, 14.5, 3.2, 0, '#3fae5a'));
    return Kit.merge(p); };
  P.bkGarden = garden();
  P.bkSkate = () => { const CO = '#4a4e6c', C2 = '#5c6185', p = [Kit.box(42, 0.14, 50, 0, 0, 0, '#34374f')], arc = (cx, a0, a1, R, z, len, col) => { const n = 7;                    // (arc: a curved ramp, its section in x/y)
      for (let k = 0; k < n; k++) { const a = a0 + (a1 - a0) * (k + 0.5) / n, w = Math.abs(a1 - a0) * R / n + 0.08; p.push(Kit.box(w, 0.16, len, cx + R * Math.cos(a), 0.14 + R + R * Math.sin(a) - 0.08, z, col, { rz: a + Math.PI / 2 })); } };
    for (const sz of [-1, 1]) p.push(Kit.box(42, 0.05, 0.2, 0, 0.14, sz * 24.8, '#4fe3ff', { glow: true })); for (const sx of [-1, 1]) p.push(Kit.box(0.2, 0.05, 50, sx * 20.8, 0.14, 0, '#ff4fa0', { glow: true }));
    // the half-pipe at the back: two quarter arcs 3.4 m high, a flat between, a deck on each side
    arc(9.4, Math.PI, Math.PI * 1.5, 3.4, 8, 18, C2); arc(12.4, Math.PI * 1.5, Math.PI * 2, 3.4, 8, 18, C2); p.push(Kit.box(3.1, 0.16, 18, 10.9, 0.14, 8, C2));
    p.push(Kit.box(2, 3.4, 18, 5, 0.14, 8, CO), Kit.box(2, 3.4, 18, 16.8, 0.14, 8, CO), Kit.box(0.1, 0.9, 18, 4.05, 3.54, 8, '#ffd23a'), Kit.box(0.1, 0.9, 18, 17.75, 3.54, 8, '#ffd23a'),
      Kit.box(0.12, 0.12, 18, 6, 3.5, 8, '#4fe3ff', { glow: true }), Kit.box(0.12, 0.12, 18, 15.8, 3.5, 8, '#ff4fa0', { glow: true }));
    // the fun box in the middle: a table, a bank on each of its four sides, a rail over it
    { const fx = -6, fz = -6, h = 0.9, L = 3.2, a = Math.atan(h / L), s = Math.hypot(h, L);
      p.push(Kit.box(5, h, 5, fx, 0.14, fz, CO));
      for (const d of [-1, 1]) { p.push(Kit.box(s, 0.14, 5, fx + d * (2.5 + L / 2), 0.14 + h / 2 - 0.07, fz, C2, { rz: -d * a }), Kit.box(5, 0.14, s, fx, 0.14 + h / 2 - 0.07, fz + d * (2.5 + L / 2), C2, { rx: d * a })); }
      p.push(Kit.box(0.1, 0.1, 9, fx + 1.4, 0.14 + h + 0.5, fz, '#ffd23a', { glow: true })); for (const d of [-1, 0, 1]) p.push(Kit.box(0.1, 0.5, 0.1, fx + 1.4, 0.14 + h, fz + d * 2.2, '#8a8a90')); }
    // a quarter pipe on the near side, a low rail and a ledge, three steps with a handrail
    for (let k = 0; k < 6; k++) { const a = -Math.PI / 2 * (k + 0.5) / 6, R = 2.6, w = Math.PI / 2 * R / 6 + 0.08; p.push(Kit.box(14, 0.16, w, -4, 0.14 + R - R * Math.cos(a) - 0.08, -19.4 + R * Math.sin(a) , C2, { rx: a })); }
    p.push(Kit.box(14, 2.6, 1.6, -4, 0.14, -23.4, CO), Kit.box(14, 0.12, 0.12, -4, 2.74, -22.5, '#4fe3ff', { glow: true }));
    p.push(Kit.box(0.1, 0.1, 8, -14, 0.64, 6, '#4fe3ff', { glow: true }), Kit.box(0.1, 0.5, 0.1, -14, 0.14, 3, '#8a8a90'), Kit.box(0.1, 0.5, 0.1, -14, 0.14, 9, '#8a8a90'), Kit.box(1.2, 0.5, 7, -10, 0.14, 14, CO), Kit.box(0.1, 0.06, 7, -9.4, 0.64, 14, '#ff4fa0', { glow: true }));
    for (let k = 0; k < 3; k++) p.push(Kit.box(1.1, 0.3 * (3 - k), 5, -2 + k * 1.1, 0.14, 19, CO)); p.push(Kit.box(8, 0.9, 5, -6.55, 0.14, 19, CO), Kit.box(3.6, 0.08, 0.08, -0.9, 1.0, 19, '#ffd23a', { glow: true, rz: -Math.atan(0.9 / 3.3) }));
    // a painted wall at the back, lamps, benches, trees at the corners and along the back
    p.push(Kit.box(0.4, 3.2, 26, 20, 0.14, -8, '#23285e')); for (let k = 0; k < 6; k++) p.push(Kit.box(0.1, 1.6 + (k % 3) * 0.5, 3.4, 19.75, 0.6 + (k % 2) * 0.4, -18.6 + k * 4.2, ['#ff4fa0', '#4fe3ff', '#ffd23a', '#b06bff', '#3fd060', '#ff7a3a'][k], { glow: k % 2 === 0 }));
    for (const [x, z, c] of [[-18, -22, '#4fe3ff'], [-18, 22, '#ff4fa0'], [0, 0, '#ffe9a8'], [2, 22, '#4fe3ff'], [18, -3, '#ff4fa0']]) lampP(p, x, z, c);
    bench(p, -18.5, -8, -Math.PI / 2); bench(p, -18.5, 12, -Math.PI / 2);
    for (const [x, z] of [[-18.5, -17], [-18.5, 18], [18.5, 22], [12, 22], [18.5, -23], [-18.5, 2]]) { p.push(Kit.cyl(1.2, 1.2, 0.4, x, 0.14, z, '#5a3b2e', { seg: 8 })); tree(p, x, z, 3.6, 2.1, '#3fd060'); }
    return Kit.merge(p); };
  // NEO METROPOLIS, CENTRAL DISTRICT (2026-11-21, the user's second blueprint and red lines: behind the plots): the complex of the picture at its own scale, 800 m long, 60 m deep,
  // 120 m at its highest, laid out as on the "vue de face": a glazed podium all along (shops lit at street level, a planted roof), on it five terraced buildings with round ends and
  // planted balconies, four glass towers with white fins, two glass footbridges. Built once in "s" (metres from the picture's left end) and cut in ND_L m chunks (ndC0..), one prop each;
  // the picture's right end comes first on the way. A paved walk with trees (ndWalk) runs between the plots and its front.
  const ND_L = 96, ND_N = 9, ND = (() => { const W = '#eef2f6', G1 = '#3f78ad', G2 = '#2c5a8a', GR = '#3fae5a', GD = '#2f9e58', WARM = '#ffd9a0', L = [], rnd = n => { const v = Math.sin(n * 127.1 + 3.7) * 43758.5453; return v - Math.floor(v); };
    const B = (w, h, d, x, y, s, c, o) => L.push({ s, f: z => Kit.box(w, h, d, x, y, z, c, o || {}) }), CY = (r, h, x, y, s, c, o) => L.push({ s, f: z => Kit.cyl(r, r, h, x, y, z, c, Object.assign({ seg: 12 }, o || {})) }),
      TR = (x, y, s, h, r) => L.push({ s, f: z => Kit.cyl(0.3, 0.4, h, x, y, z, '#5a3b2e', { seg: 6 }) }, { s, f: z => Kit.ico(r, x, y + h + r * 0.5, z, rnd(s) > 0.5 ? GR : GD, { sy: 0.9 }) });
    const PH = 26;                                                                                                             // THE PODIUM: 24 m bays from s 20 to 788
    for (let s = 32; s < 788; s += 24) { B(54, PH, 24, 1, 0, s, s % 48 ? G1 : G2); B(60, 1.2, 24.2, 0, 12.4, s, W); B(60, 1.4, 24.2, 0, PH, s, W); B(1.6, PH, 1.6, -29, 0, s - 12, W);
      B(0.4, 9, 19, -26.3, 1.2, s, WARM, { glow: true }); if (rnd(s) > 0.45) B(0.4, 7, 17, -26.3, 15.5, s, '#bfe6ff', { glow: true });
      B(2.4, 1.6, 24, -28.4, PH + 1.4, s, GR); B(1.6, 1, 24, -28.9, 13.6, s, GD); if (rnd(s + 5) > 0.4) TR(-24, PH + 1.4, s + 6 * rnd(s + 1) - 3, 4.5, 3.4); }
    const Y0 = PH + 1.4, FL = 9;
    const terr = (s0, s1, top, deep) => { const n = Math.max(2, Math.round((top - Y0) / FL)), c = (s0 + s1) / 2;                  // A TERRACED BUILDING: every floor steps back and in, a white slab over it, a planted edge, round ends
      for (let i = 0; i < n; i++) { const y = Y0 + i * FL, w = s1 - s0 - 24 - i * 3, d = deep - i * 3.2, x = -26 + i * 3.2 + d / 2, r = Math.min(12, d / 2 - 1), xr = x - d / 2 + r;
        B(d, FL - 1, w, x, y, c, i % 2 ? G1 : G2); B(d + 5, 1.1, w + 2, x - 1, y + FL - 1, c, W); B(1.6, 1.3, w, x - d / 2 - 2.4, y + FL + 0.1, c, i % 2 ? GR : GD);
        for (const e of [-1, 1]) { CY(r, FL - 1, xr, y, c + e * w / 2, i % 2 ? G2 : G1); CY(r + 2.6, 1.1, xr, y + FL - 1, c + e * w / 2, W, { seg: 16 }); CY(r + 2.2, 1.3, xr, y + FL + 0.1, c + e * w / 2, i % 2 ? GD : GR); CY(r + 0.6, 1.4, xr, y + FL + 0.1, c + e * w / 2, W); }
        for (let k = 0; k < 3; k++) if (rnd(s0 + i * 7 + k) > 0.5) B(0.4, 4.5, w / 5, x - d / 2 - 0.25, y + 1.5, c + (k - 1) * w / 3.4, k % 2 ? WARM : '#bfe6ff', { glow: true });
        if (i % 2 === 0) TR(x - d / 2 - 2.4, y + FL + 0.1, c + (rnd(s0 + i) - 0.5) * w * 0.8, 3, 2.6); }
      const yt = Y0 + n * FL + 0.1, wt = s1 - s0 - 24 - n * 3; B(deep - n * 3.2 - 8, 1.2, wt, -26 + n * 3.2 + (deep - n * 3.2) / 2, yt, c, GR); for (const e of [-1, 0, 1]) TR(-20 + n * 3.2 + (deep - n * 3.2) / 2 - 6, yt + 1.2, c + e * wt / 3, 4, 3.2); };
    const tower = (s0, s1, top) => { const w = s1 - s0, c = (s0 + s1) / 2, d = 34, x = 4;                                           // A TOWER: glass, white fins on its front, a band every third floor, a white crown
      B(d, top - Y0 - 6, w, x, Y0, c, G2); for (let f = s0 + 3; f <= s1 - 3 + 0.01; f += (w - 6) / Math.max(2, Math.round(w / 9))) { B(1.6, top - Y0 - 6, 1, x - d / 2 - 0.8, Y0, f, W); B(1.6, top - Y0 - 6, 1, x + d / 2 + 0.8, Y0, f, W); }
      for (let y = Y0 + 12; y < top - 10; y += 14) B(d + 3.4, 1, w + 2, x, y, c, W);
      for (let y = Y0 + 3; y < top - 12; y += 7) for (let k = 0; k < 2; k++) if (rnd(s0 + y * 3 + k) > 0.55) B(0.4, 3.6, w / 4, x - d / 2 - 0.25, y, c + (k - 0.5) * w / 2.2, k ? WARM : '#bfe6ff', { glow: true });
      B(d + 4, 1.4, w + 3, x, top - 6, c, W); B(d - 8, 4.6, w - 8, x + 2, top - 4.6, c, G1); B(d - 6, 0.8, w - 6, x + 2, top - 0.8, c, W); B(0.5, 9, 0.5, x + 6, top, c, W); B(0.9, 0.9, 0.9, x + 6, top + 9, c, '#ff4fa0', { glow: true }); };
    const bridge = (s0, s1, y) => { for (let s = s0 + 6; s < s1; s += 12) { B(9, 6, 12.1, -4, y, s, G1); B(10.4, 0.9, 12.1, -4, y - 0.9, s, W); B(10.4, 0.9, 12.1, -4, y + 6, s, W); B(8, 1, 12.1, -4, y + 6.9, s, GR); } };
    terr(40, 92, 54, 30); terr(88, 198, 82, 46); tower(196, 246, 116); terr(276, 380, 82, 44); bridge(380, 428, 52); tower(428, 478, 120); terr(470, 532, 66, 36);
    tower(552, 594, 98); bridge(594, 632, 60); tower(632, 672, 120); terr(662, 772, 108, 48);
    { const c = 717, y = Y0 + 9 * FL + 1.3; for (const e of [-1, 1]) B(2, 12, 2, 2, y, c + e * 26, W); B(26, 2, 56, 4, y + 12, c, W); CY(13, 2, -9, y + 12, c, W, { seg: 16 }); }      // (the big building's white canopy)
    return L; })();
  for (let k = 0; k < ND_N; k++) P['ndC' + k] = () => Kit.merge(ND.filter(o => Math.floor(o.s / ND_L) === k).map(o => o.f(o.s - (k + 0.5) * ND_L)));
  const walk = (v, q, xc) => () => { const ok = clr(q, xc), p = [Kit.box(14, 0.12, 12.25, 0, 0, 0, '#c9ccd6'), Kit.box(0.3, 0.05, 12.25, -6.6, 0.12, 0, '#4fe3ff', { glow: true }), Kit.box(4, 0.3, 12.25, 4.6, 0.12, 0, '#2a8a52')];
    if (v) { tree(p, 4.6, 0, 4.4, 2.6, '#3fd060'); if (ok(-2, 3, 2.6)) p.push(Kit.box(2.2, 0.12, 0.6, -2, 0.5, 3, '#b9824a'), Kit.box(2, 0.4, 0.12, -2, 0.12, 3, '#3a3d55')); } else { if (ok(-5.6, 0, 3)) lampP(p, -5.6, 0, '#ffe9a8'); tree(p, 4.6, -3, 3.6, 2.1, '#2f9e58'); p.push(Kit.box(2.6, 0.7, 2.6, 4.6, 0.3, 3.5, '#8a8a90'), Kit.box(2.2, 0.5, 2.2, 4.6, 1, 3.5, '#ff4fa0')); }
    return Kit.merge(p); };
  P.ndWalkA = walk(0); P.ndWalkB = walk(1);
  const ND_X = C.NRX + C.BIKE_OUT + 1 + 24 + 42 + 14 + 30, ND_Q0 = 66;      // (its middle line; chunk k stands at slot ND_Q0 - 8 k)
  const METRO_EVERY = 6, PLOT = { 0: 'bkMetro', 1: 'bkGarden', 2: 'bkGarden', 3: 'bkMetro', 4: 'bkSkate', 5: 'bkSkate', 6: 'bkMetro', 7: 'bkMetro' }; if (typeof NeoMetroArt !== 'undefined') P.bkMetro = () => ({ sprite: NeoMetroArt.building(), material: () => NeoMetroArt.material() });
  const SW = PN + 6, RT = C.BIKE_RET, RE = C.BIKE_END, DQ = typeof C.DESC_Q === 'number' ? C.DESC_Q : 1e9, bend = q => Math.abs(C.bikeM(q + 1) - C.bikeM(q)) > 0.01 || Math.abs(C.bikeM(q + 0.5) - C.bikeM(q)) > 0.01;      // (the swing round the signs starts 6 slots before the fork)
  for (let k = 0; k < SW; k++) P['bkBA' + k] = bent(k - SW, 0.05);
  for (let q = 0; q < (C.BIKE_FAR || RE); q++) P['bkB' + q] = bent(q, 0.12);
  // THE WALK's DIRT TRACK (the user's red line, 2026-11-23; its line: NEON_CORNER.walkM): 2.4 m of beaten earth, two ruts, a green verge, wooden posts; from the bike lane to the paved
  // walk (slots WK0..), (since 2026-11-24 the walk goes straight on from there: wkDk*). Nothing on the paved walk itself, nor across the back road and the lane's strip.
  const WK0 = Math.floor(C.WALK_Q), WKA = WK0 + 7, WK1 = C.BIKE_FAR, PARK_X = C.NRX + C.BIKE_OUT + H + 9.4, PLOT_X = C.NRX + C.BIKE_OUT + H + 24 + 21, wkSlot = q => (q >= WK0 && q <= WKA) || (q >= WK1 && q < C.BIKE_FAR);
  const trail = q0 => () => { const p = [], n = 8, f = t => C.walkM(q0 + t), xm = f(0.5), DIRT = '#b98a4e', RUT = '#96703c', wild = (q0 >= 61 && q0 <= 65) || (q0 >= 70 && q0 <= 75);
    for (let i = 0; i < n; i++) { const X0 = f(i / n), X1 = f((i + 1) / n), XM = (X0 + X1) / 2, dz = 12 / n, len = Math.hypot(X1 - X0, dz) + 0.3, ry = -Math.atan((X1 - X0) / dz), x = XM - xm, z = 6 - dz * (i + 0.5);
      if (XM > 157.4 || (q0 < 30 && XM < 89.8) || (q0 > 30 && XM > 78.6 && XM < 89.4)) continue;
      p.push(Kit.box(wild ? 11 : 7, 0.16, len, x, 0, z, '#2a8a52', { ry }), Kit.box(2.4, 0.2, len, x, 0.04, z, DIRT, { ry }));
      for (const s of [-1, 1]) { const [ox, oz] = rot(s * 0.55, 0, ry); p.push(Kit.box(0.3, 0.02, len, x + ox, 0.24, z + oz, RUT, { ry })); }
      if (i % 4 === 1) for (const s of [-1, 1]) { const [ox, oz] = rot(s * 1.75, 0, ry); p.push(Kit.cyl(0.09, 0.11, 0.9, x + ox, 0.16, z + oz, '#7a5230', { seg: 6 }), Kit.box(0.2, 0.06, 0.2, x + ox, 1.06, z + oz, '#ffd23a', { glow: true })); }
      if (wild && i % 4 === 3) for (const s of [-1, 1]) { if (s < 0 && q0 >= 74) continue; const [ox, oz] = rot(s * 4.4, 0, ry); tree(p, x + ox, z + oz, 3 + ((q0 + i) % 3) * 0.6, 1.9 + ((q0 * 3 + i) % 2) * 0.5, (q0 + i) % 2 ? '#3aa863' : '#2f9358'); }
      if (wild && i % 4 === 1) for (const s of [-1, 1]) { const [ox, oz] = rot(s * 3.6, 0, ry); p.push(Kit.ico(0.8, x + ox, 0.5, z + oz, '#3fae5a', { sy: 0.7 })); } }
    return Kit.merge(p.length ? p : [Kit.box(0.05, 0.05, 0.05, 0, -60, 0, '#2a8a52')]); };
  for (let q = WK0; q < C.BIKE_FAR; q++) if (wkSlot(q)) { P['wkT' + q] = trail(q); P['bkParkW' + q] = park(q % 2, q, PARK_X); P['ndWalkW' + q] = walk(q % 2, q, ND_X - 37); }
  // THE WALK's PROMENADE begins (2026-11-24): where NEO METROPOLIS's paved walk ends the walk goes STRAIGHT ON to the district (its deck there: src3d/env_district.js): the ground, a green
  // verge, the raised deck (a ramp up over the first slot, NEON_CORNER.walkH) and a tree on each side, for the slots CANYON .. BIKE_FAR
  const deck = q => () => { const p = [Kit.box(84, 0.1, 12.05, -4, -0.1, 0, '#1b2244'), Kit.box(8, 0.14, 12.05, 0, 0, 0, '#17703c')];
    for (let i = 0; i < 8; i++) { const z = 6 - 1.5 * (i + 0.5), h = C.walkH(q + (i + 0.5) / 8); p.push(Kit.box(2.7, h - 0.06, 1.52, 0, 0, z, '#7a5230'), Kit.box(2.4, 0.06, 1.52, 0, h - 0.06, z, '#e0bf7a')); for (const s of [-1, 1]) p.push(Kit.box(0.12, 0.04, 1.52, s * 1.14, h, z, '#ffd27a', { glow: true })); }
    for (const s of [-1, 1]) tree(p, s * 4.3, s * 2, 3 + (q % 3) * 0.6, 1.9 + (q % 2) * 0.4, (q + (s > 0 ? 1 : 0)) % 2 ? '#3aa863' : '#2f9358');
    return Kit.merge(p); };
  for (let q = C.CANYON; q < C.BIKE_FAR; q++) P['wkDk' + q] = deck(q);
  P.bkGardenW = garden(C.NRQ + 5 + METRO_EVERY, PLOT_X);
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
    if (liftM > 3 && NeonAvenue.far && q >= C.CANYON && q < C.BIKE_FAR && DQ > 1e8) out.push({ prop: bend(q) ? 'bkB' + q : 'bkStrip', x: C.bikeM(q + 0.5) + NeonAvenue.D, dist: 6, dy: -liftM, solo: true });      // (on to the district's lane)
    if (liftM > 3 && q >= 0 && q < C.CANYON) { const it = (prop, x) => out.push({ prop, x: x + NeonAvenue.D, dist: 6, dy: -liftM, solo: true });
      if (q >= RT && q < DQ - 3) it('bkStrip', C.NRX + C.BIKE_OUT); if (P.bkMetro && q >= C.NRQ + 5 && (q - C.NRQ - 5) % METRO_EVERY === 0) { const pl = PLOT[(q - C.NRQ - 5) / METRO_EVERY]; if (pl) out.push({ prop: pl === 'bkGarden' && wkSlot(q) ? 'bkGardenW' : pl, x: C.NRX + C.BIKE_OUT + H + 24 + 21 + NeonAvenue.D, dist: 6, dy: -liftM, solo: true, rotY: pl === 'bkMetro' ? -Math.PI / 2 : 0 }); } if (q >= C.NRQ + 3 && q < DQ + 2) it(wkSlot(q) && P['bkParkW' + q] ? 'bkParkW' + q : q % 2 ? 'bkParkB' : 'bkParkA', (q >= RT ? C.NRX + C.BIKE_OUT : Math.max(C.bikeM(q), C.bikeM(q + 0.5), C.bikeM(q + 1))) + H + 9.4 + (C.glass3W && q >= 53 && q <= 58 ? 3.5 : 0)); if (q < DQ - 3 && (q < RE || NeonAvenue.far)) it(bend(q) ? 'bkB' + q : 'bkStrip', C.bikeM(q + 0.5));      // (the park steps back from the widened square tunnel)
      if (q >= 2 && q <= ND_Q0 && (ND_Q0 - q) % 8 === 0) it('ndC' + (ND_Q0 - q) / 8, ND_X); if (q >= 3) it(wkSlot(q) ? 'ndWalkW' + q : q % 2 ? 'ndWalkB' : 'ndWalkA', ND_X - 37);
      if (wkSlot(q) && (q <= WKA || NeonAvenue.far)) { it('wkT' + q, C.walkM(q + 0.5)); for (let n = out.length - 1; n >= 0; n--) if (out[n].prop === 'cnPlanter' && Math.abs(out[n].x - NeonAvenue.D - C.walkM(q + 0.5)) < 7) out.splice(n, 1); } }
    if (liftM > 3 && NeonAvenue.far && q >= C.CANYON && q < C.BIKE_FAR && P['wkDk' + q]) out.push({ prop: 'wkDk' + q, x: C.WALK_X + NeonAvenue.D, dist: 6, dy: -liftM, solo: true });
    return out; };
  // (the link comes in under the two-floor street: there the street stands open to the right, no pillar and no pylon on the lane)
  const baseS = NeonAvenue.side; if (baseS) NeonAvenue.side = (q, rnd, glass, land) => { const o = baseS(q, rnd, glass, land); if (q > RT + 3 && q < RT + 6) for (const p of o) if (/^(sdStreet|sdStreetL|ftStreet)$/.test(p.prop)) p.prop = 'sdStreetO';
    { const mid = Math.floor((15 + C.CANYON) / 2); if ((q >= mid - 9 && q <= mid - 5) || (q >= mid + 5 && q <= mid + 9)) for (const p of o) if (/^ft(Green|Plain)/.test(p.prop)) p.x -= 5; }      // (the towers that stepped back where the side road swings to the park stood on the back road's edge: 4 m nearer)
    return o; };
})();
