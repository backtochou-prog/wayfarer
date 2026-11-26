// THE UNDERGROUND (the user, 2026-11-25): what lies below the Central District's lifts. Step 2: the underground ROAD, 250 m of the neon tunnel's own tube (ENV3D.neon.props.neonTunnel0..5: walls,
// ceiling, lights), a pink neon every 40 m, in the neon quarter's atmosphere. Later steps put the underground city after it.
window.ENV3D = window.ENV3D || {};
(function () {
  if (!ENV3D.neon) return;
  const mod = (a, n) => ((a % n) + n) % n;
  // a plain road tunnel (the user, 2026-11-26: no picture, no spiral, "simple connexion comme de realite"): a concrete arch of the same size as the neon tube (R 6.6 m), a lamp strip along the crown,
  // amber guide lights low on both walls; the last slot of a tunnel has a head frame round the mouth. The user will send the final decor of the tunnel that leads to the city.
  const T = { conc: ['#3b4050', '#343948', '#2e3342'], lamp: '#fff0c8', amber: '#ffb347', frame: '#555c70' };
  const tube = (k, end) => () => { const p = [], R = 6.6, cy = 3.6, a0 = 0.5, n = 28, LL = 12.2;
    for (let q = 0; q < n; q++) { const a = -a0 + (Math.PI + 2 * a0) * q / (n - 1), len = (Math.PI + 2 * a0) * (R + 0.3) / (n - 1) * 1.2; p.push(Kit.box(len, 0.4, LL, Math.cos(a) * (R + 0.3), cy + Math.sin(a) * (R + 0.3), 0, T.conc[(q + k) % 3], { rz: a + Math.PI / 2 })); }
    p.push(Kit.box(1.6, 0.12, 5, 0, cy + R - 0.35, 0, T.lamp, { glow: true }));
    for (const s of [-1, 1]) p.push(Kit.box(0.14, 0.14, 2.4, s * (R - 0.5), 1.2, 0, T.amber, { glow: true }));
    if (end) for (let q = 0; q < n; q++) { const a = -a0 + (Math.PI + 2 * a0) * q / (n - 1), len = (Math.PI + 2 * a0) * (R + 1.0) / (n - 1) * 1.25; p.push(Kit.box(len, 1.2, 0.7, Math.cos(a) * (R + 0.6), cy + Math.sin(a) * (R + 0.6), -LL / 2 + 0.35, T.frame, { rz: a + Math.PI / 2 })); }
    return Kit.merge(p); };
  const tubeProps = {}; for (let k = 0; k < 3; k++) { tubeProps['ucTube' + k] = tube(k, false); tubeProps['ucTubeEnd' + k] = tube(k, true); }
  // THE BLUEPRINT TUNNEL (the user's picture, 2026-11-26: "TUNNEL SOUTERRAIN 3 VOIES - 180 m", NEO METROPOLIS): a rectangular tunnel 18 m wide and 8 m high, the walls lined with panels of concentric
  // red / orange / yellow rings, a portal frame with chamfered corners (glowing amber) at every 12 m, a ceiling of white light bars and yellow rings, a concrete barrier with hazard stripes and amber lights on both
  // sides of the road, a dark wet floor. Used by `underRoad` (180 m) between the lift and the underground city; the climb keeps the plain concrete tunnel above.
  const B = { dark: '#150a08', red: '#7a1008', red2: '#d42e0c', orange: '#ff8a10', yel: '#ffd21a', glow: '#ffb800', conc: '#74747c', black: '#101010', white: '#ffffff' };
  const blue = (end) => () => { const p = [], LL = 12.2;
    p.push(Kit.box(20, 0.1, LL, 0, -0.12, 0, '#14100e'), Kit.box(20, 0.5, LL, 0, 8, 0, B.dark));
    for (const z of [-4, 0, 4]) p.push(Kit.box(0.8, 0.1, 2.4, 0, 7.94, z, B.white, { glow: true }));
    for (const [r, c] of [[5.4, B.yel], [3.4, B.orange]]) p.push(Kit.cyl(r, r, 0.05, 0, 7.92, 0, c, { seg: 48, glow: true }), Kit.cyl(r - 0.07, r - 0.07, 0.05, 0, 7.9, 0, B.dark, { seg: 48 }));
    p.push(Kit.cyl(1.2, 1.2, 0.05, 0, 7.92, 0, B.yel, { seg: 20, glow: true }));
    for (const s of [-1, 1]) {
      p.push(Kit.box(0.6, 8, LL, s * 9.3, 0, 0, B.dark));
      [[3.7, B.red], [3.3, B.red2], [2.7, B.orange], [2.15, B.red2], [1.6, B.yel], [1.05, B.red], [0.55, B.yel]].forEach(([r, c], q) => p.push(Kit.cyl(r, r, 0.08, s * (8.95 - 0.03 * q), 4, 0, c, { rz: Math.PI / 2, seg: 28, glow: q === 4 || q === 6 || q === 2 })));
      p.push(Kit.box(0.1, 0.1, LL, s * 8.85, 7.5, 0, B.glow, { glow: true }), Kit.box(0.1, 0.1, LL, s * 8.85, 0.9, 0, B.red2, { glow: true }));
      p.push(Kit.box(1.6, 0.9, LL, s * 5.3, 0, 0, B.conc), Kit.box(0.08, 0.04, LL, s * 4.4, 0, 0, B.glow, { glow: true }));
      for (let z = -LL / 2 + 0.6; z < LL / 2; z += 1.2) p.push(Kit.box(1.3, 0.08, 0.6, s * 5.3, 0.92, z, Math.round((z + 7) / 1.2) % 2 ? B.yel : B.black));
      for (const z of [-3, 3]) p.push(Kit.box(0.3, 0.45, 0.9, s * 4.42, 0.45, z, B.glow, { glow: true }));
    }
    const fz = -LL / 2 + 0.25, th = end ? 0.2 : 0.12, seg = (x0, y0, x1, y1) => p.push(Kit.box(Math.hypot(x1 - x0, y1 - y0) + 0.02, th, 0.2, (x0 + x1) / 2, (y0 + y1) / 2, fz, B.glow, { glow: true, rz: Math.atan2(y1 - y0, x1 - x0) }));      // the portal frame at the far end of the slot: a thin line with rounded corners
    const pts = []; for (const s of [-1, 1]) { const q = [[s * 8.6, 0.9], [s * 8.6, 5.9]]; for (let k = 1; k <= 8; k++) { const t = k / 8 * Math.PI / 2; q.push([s * (6.8 + 1.8 * Math.cos(t)), 5.9 + 1.8 * Math.sin(t)]); } pts.push(s < 0 ? q.reverse() : q); }
    for (const q of pts) for (let k = 0; k + 1 < q.length; k++) seg(q[k][0], q[k][1], q[k + 1][0], q[k + 1][1]);
    seg(-6.8, 7.7, 6.8, 7.7);
    return Kit.merge(p); };
  const blueProps = { ucBlue: blue(false), ucBlueEnd: blue(true) };
  const road = Object.assign({}, ENV3D.neon.road, { mark: '#f4f4f4', edge: '#ffb800', asphalt: ['#17120f', '#120e0c'] });
  ENV3D.under = Object.assign({}, ENV3D.neon, {
    name: 'UNDERGROUND', entrance: null, props: Object.assign({}, ENV3D.neon.props, blueProps), road,
    sky: { top: '#080303', mid: '#140806', horizon: '#2a0e06' }, fog: { color: '#150805', near: 30, far: 150 }, hemi: { sky: '#ffb888', ground: '#4a2010', intensity: 1.7 },
    sun: { color: '#ffd0a0', intensity: 1.0, position: [0, 9, 4] }, groundFar: '#100806',
    layout(i) { const g = typeof window !== 'undefined' && window.__wf, w = g && g.world, P = w && w.pieceAt(i * 120 + 60), end = !!(P && P.z1 - (i * 120 + 120) < 1); return [{ prop: end ? 'ucBlueEnd' : 'ucBlue', x: 0, dist: 6, solo: true }]; },
  });
  // the climb keeps the plain concrete motorway tunnel, in the neon night's atmosphere
  ENV3D.underClimb = Object.assign({}, ENV3D.neon, {
    name: 'THE CLIMB', entrance: null, props: Object.assign({}, ENV3D.neon.props, tubeProps),
    layout(i) { const g = typeof window !== 'undefined' && window.__wf, w = g && g.world, P = w && w.pieceAt(i * 120 + 60), end = !!(P && P.z1 - (i * 120 + 120) < 1); return [{ prop: (end ? 'ucTubeEnd' : 'ucTube') + mod(i, 3), x: 0, dist: 6, solo: true }]; },
  });
})();

// STEP 3: THE UNDERGROUND CITY (the user, 2026-11-25: "une ville toute souterraine avec ses rues, ses lumieres, magasins, panneaux et meme des ronds-points, voies cyclables, un peu pres 4 km"). The road runs
// straight along its main avenue under a vault 34 m high (ribs, light panels, glass skylights over the gardens). Per 12.2 m slot, mirrored on both sides: a bike lane and a pavement with lamps, then
// shop fronts (glowing windows, awnings, signs, balconies with plants) and housing storeys up to the cavern wall; every 24 slots (290 m) a cross street with a zebra crossing and a signal gantry; every 72
// slots a roundabout plaza on each side (a fountain, a ring of trees and lamps); and blocks of garden (lawns, trees, a skylight) in between. Everything is merged per slot variant, built when first seen.
(function () {
  if (!ENV3D.under) return;
  const mod = (a, n) => ((a % n) + n) % n, L = 12.2;
  const P = { pave: '#1b2244', paveL: '#2c3568', navy: '#141a3c', navy2: '#232a66', wall: '#0e1230', roof: '#0b0f22', slab: '#aab8e0', cyan: '#58f0ff', mag: '#ff5ad8', gold: '#ffd27a', lime: '#9dff7a', warm: '#ffe0a8', white: '#eaf6ff',
    lawn: '#1f8a4a', lawnD: '#17703c', leaf: '#2fae5c', leafD: '#1f8f4c', leafL: '#58c874', trunk: '#6a4a36', bike: '#0f7a72', water: '#1a78c8', glass: '#bfe9ff', blue: '#143a8a' };
  const SH = [P.cyan, P.mag, P.gold, P.lime, '#ff8a4a', '#7a8cff'];      // shop colours
  const hr = (a, b) => { const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return x - Math.floor(x); };

  const cavern = (p, sky) => {                                      // the vault, the cavern walls and the floor: the same in every slot
    p.push(Kit.box(100, 1.2, L, 0, 33, 0, P.roof), Kit.box(100, 0.9, 0.7, 0, 32.1, -L / 2 + 0.35, P.navy2), Kit.box(70, 0.16, 0.3, 0, 31.95, -L / 2 + 0.35, P.cyan, { glow: true }));
    if (!sky) for (const x of [-30, -10, 10, 30]) p.push(Kit.box(8, 0.12, 3.2, x, 32.4, 0, P.warm, { glow: true }));
    for (const s of [-1, 1]) { p.push(Kit.box(8, 34, L, s * 54, 0, 0, P.wall)); for (const y of [5, 11, 17, 23, 29]) p.push(Kit.box(0.2, 1.2, L * 0.7, s * 49.9, y, 0, P.warm, { glow: true })); }
    p.push(Kit.box(100, 0.1, L, 0, -0.12, 0, P.pave));
  };
  const street = (p, s, i) => {                                      // a bike lane, the pavement, a lamp, a tree in a planter
    p.push(Kit.box(2.2, 0.07, L, s * 5.4, 0, 0, P.bike), Kit.box(0.12, 0.09, L, s * 4.3, 0, 0, P.white, { glow: true }), Kit.box(0.12, 0.09, L, s * 6.5, 0, 0, P.white, { glow: true }));
    for (let z = -L / 2 + 1; z < L / 2; z += 3) p.push(Kit.box(0.14, 0.09, 1.2, s * 5.4, 0, z, P.lime, { glow: true }));
    p.push(Kit.box(5.4, 0.16, L, s * 9.6, 0, 0, P.paveL), Kit.box(0.1, 0.18, L, s * 6.9, 0, 0, P.cyan, { glow: true }));
    const lz = mod(i, 2) ? 3 : -3; p.push(Kit.cyl(0.1, 0.16, 6.2, s * 7.4, 0.16, lz, P.navy2), Kit.box(1.7, 0.12, 0.14, s * 6.5, 6.3, lz, P.navy2), Kit.box(1.0, 0.16, 0.4, s * 5.7, 6.15, lz, P.warm, { glow: true }));
  };
  const tree = (p, x, z, r, k) => { p.push(Kit.cyl(r * 0.1, r * 0.16, r * 1.3, x, 0.1, z, P.trunk), Kit.ico(r * 0.62, x, r * 1.75, z, [P.leaf, P.leafD, P.leafL][k % 3]), Kit.ico(r * 0.44, x + r * 0.4, r * 1.42, z + r * 0.25, [P.leafD, P.leafL, P.leaf][k % 3])); };
  const shops = (seed, kind) => () => {                              // a street of shops and housing
    const p = []; cavern(p, false);
    for (const s of [-1, 1]) { const k = seed * 2 + (s > 0 ? 1 : 0); street(p, s, seed + (s > 0 ? 1 : 0));
      const H = 15 + Math.floor(hr(k, 1) * 5) * 3, bodyC = [P.navy, P.navy2, '#1c2352'][Math.floor(hr(k, 2) * 3)];
      p.push(Kit.box(34, H, L, s * 29.5, 0, 0, bodyC));
      for (const z of [-3.1, 3.1]) { const c = SH[Math.floor(hr(k + z, 3) * SH.length)], c2 = SH[Math.floor(hr(k + z, 4) * SH.length)];
        p.push(Kit.box(0.3, 3.2, 5.4, s * 12.4, 0.5, z, c, { glow: true }), Kit.box(0.2, 0.1, 5.5, s * 12.3, 0.4, z, P.slab), Kit.box(1.8, 0.2, 5.6, s * 11.6, 4.0, z, c2, { rz: s * 0.25 }), Kit.box(0.4, 1.2, 4.6, s * 12.4, 4.7, z, kind === 1 ? P.warm : c2, { glow: true }));
        if (hr(k + z, 5) < 0.5) p.push(Kit.box(0.2, 1.5, 1.5, s * 10.8, 4.6, z + 2.4, c, { glow: true }));        // a blade sign over the pavement
        for (const y of [7, 10.5, 14]) if (y < H) { p.push(Kit.box(0.2, 1.5, 4.8, s * 12.4, y, z, hr(k + z + y, 6) < 0.7 ? P.warm : P.navy2, { glow: true }));
          if (hr(k + y + z, 7) < 0.3) p.push(Kit.box(0.9, 0.5, 4.8, s * 11.9, y - 0.3, z, P.lawn), Kit.ico(0.6, s * 11.9, y + 0.3, z, P.leaf)); } }
      p.push(Kit.box(0.4, 0.5, L, s * 12.4, H, 0, P.cyan, { glow: true }));
      if (hr(k, 8) < 0.5) tree(p, s * 8.6, hr(k, 9) * 6 - 3, 2 + hr(k, 10), k);
    }
    return Kit.merge(p);
  };
  const garden = (seed) => () => {                                   // lawns and trees under a glass skylight
    const p = []; cavern(p, true);
    p.push(Kit.box(70, 0.16, L - 0.8, 0, 32.3, 0, P.glass, { glow: true }));
    for (const z of [-L / 2 + 0.2, 0, L / 2 - 0.2]) p.push(Kit.box(70, 0.4, 0.3, 0, 32.2, z, P.slab));
    for (const s of [-1, 1]) { const k = seed * 2 + (s > 0 ? 1 : 0); street(p, s, seed);
      p.push(Kit.box(40, 0.14, L, s * 33, 0.02, 0, P.lawn), Kit.box(14, 0.16, L, s * 16.5, 0.02, 0, P.lawnD));
      for (let j = 0; j < 3; j++) tree(p, s * (14 + hr(k, j) * 22), (hr(k, j + 10) - 0.5) * 10, 3 + hr(k, j + 20) * 3, k + j);
      p.push(Kit.box(2.4, 0.5, 0.7, s * 12, 0.16, 3.5 - 7 * hr(k, 30), P.slab), Kit.box(0.2, 1.6, 0.2, s * 20, 0.16, 0, P.navy2), Kit.ico(0.45, s * 20, 1.9, 0, P.lime, { glow: true }));
    }
    return Kit.merge(p);
  };
  const cross = (seed) => () => {                                    // a cross street: zebra crossing, signal gantry, the street running off both ways
    const p = []; cavern(p, false);
    for (const s of [-1, 1]) { street(p, s, seed); p.push(Kit.box(34, 0.1, L, s * 29.5, 0, 0, '#171d40'), Kit.box(34, 0.04, 0.25, s * 29.5, 0.1, 0, P.gold, { glow: true }));
      for (const z of [-L / 2 + 0.6, L / 2 - 0.6]) p.push(Kit.box(0.2, 1.6, 0.2, s * 12.2, 0.16, z, P.navy2), Kit.box(0.5, 0.5, 0.3, s * 12.2, 1.8, z, s > 0 ? '#ff3a3a' : '#3aff6a', { glow: true })); }
    for (let x = -3.4; x <= 3.4; x += 0.9) p.push(Kit.box(0.45, 0.03, 3.2, x, 0.02, 0, P.white));
    p.push(Kit.box(0.4, 6.5, 0.4, -7.6, 0, 0, P.navy2), Kit.box(0.4, 6.5, 0.4, 7.6, 0, 0, P.navy2), Kit.box(16, 2.2, 0.4, 0, 6.5, 0, P.blue), Kit.box(15, 0.18, 0.5, 0, 6.5, 0.05, P.white, { glow: true }), Kit.box(15, 0.18, 0.5, 0, 8.5, 0.05, P.white, { glow: true }));
    for (const x of [-4.5, -1.5, 1.5, 4.5]) p.push(Kit.box(1.4, 0.5, 0.5, x, 7.2, 0.15, P.cyan, { glow: true }));
    for (const s of [-1, 1]) p.push(Kit.box(6, 14, 0.5, s * 12.2, 0, -L / 2 + 0.2, P.navy), Kit.box(6, 14, 0.5, s * 12.2, 0, L / 2 - 0.2, P.navy));
    return Kit.merge(p);
  };
  const round = (k, seed) => () => {                                 // a roundabout plaza on each side, three slots: a ring road round a fountain, trees and lamps (k: 0, 1, 2 along it)
    const p = []; cavern(p, false); const zc = (k - 1) * L;
    for (const s of [-1, 1]) { street(p, s, seed + k); p.push(Kit.box(34, 0.1, L, s * 29.5, 0, 0, '#171d40')); const cx = s * 27;
      for (let a = 0; a < 40; a++) { const t = a / 40 * Math.PI * 2, pz = zc + 15 * Math.cos(t), px = cx + 15 * Math.sin(t); if (Math.abs(pz) > L / 2) continue;
        p.push(Kit.box(2.4, 0.08, 2.4, px, 0.1, pz, '#222a52', { ry: t })); if (a % 4 === 0) p.push(Kit.cyl(0.1, 0.14, 4.4, cx + 17.6 * Math.sin(t), 0.1, zc + 17.6 * Math.cos(t), P.navy2), Kit.ico(0.4, cx + 17.6 * Math.sin(t), 4.6, zc + 17.6 * Math.cos(t), P.warm, { glow: true })); }
      for (let a = 0; a < 24; a++) { const t = a / 24 * Math.PI * 2, pz = zc + 10 * Math.cos(t), px = cx + 10 * Math.sin(t); if (Math.abs(pz) > L / 2) continue; p.push(Kit.box(1.9, 0.5, 1.9, px, 0.1, pz, P.slab, { ry: t })); if (a % 3 === 0) tree(p, px, pz, 2.4 + hr(a, k) * 0.6, a); }
      if (k === 1) { p.push(Kit.cyl(5, 5.4, 0.9, cx, 0.1, 0, P.slab, { seg: 16 }), Kit.cyl(4.6, 4.6, 0.8, cx, 0.2, 0, P.water, { seg: 16, glow: true }), Kit.cyl(0.3, 0.5, 5, cx, 0.4, 0, P.slab), Kit.ico(0.9, cx, 5.8, 0, P.cyan, { glow: true }), Kit.cyl(0.05, 0.1, 3.6, cx + 1.2, 1.2, 0, P.cyan, { glow: true })); }
      if (k === 0) p.push(Kit.box(6, 16, 0.5, s * 12.2, 0, L / 2 - 0.2, P.navy)); if (k === 2) p.push(Kit.box(6, 16, 0.5, s * 12.2, 0, -L / 2 + 0.2, P.navy)); }
    return Kit.merge(p);
  };
  const props = {}; for (let v = 0; v < 6; v++) props['ucShop' + v] = shops(v, v % 3);
  for (let v = 0; v < 3; v++) { props['ucGarden' + v] = garden(v); props['ucCross' + v] = cross(v); }
  for (let k = 0; k < 3; k++) props['ucRound' + k] = round(k, 7);
  const base = ENV3D.underClimb;
  const mallLayout = (i, rnd) => { const b = mod(i, 16), prop = b === 0 ? 'ucCross' + mod(Math.floor(i / 16), 3) : b >= 9 && b <= 11 ? 'ucGarden' + mod(i, 3) : 'ucShop' + Math.floor(rnd(i, 71) * 6); return [{ prop, x: 0, dist: 6, solo: true }]; };
  ENV3D.underCity = Object.assign({}, base, { name: 'UNDERGROUND CITY', props: Object.assign({}, base.props, props),
    layout(i, rnd) {
      const m = mod(i, 72), b = mod(i, 24), blk = Math.floor(mod(i, 72) / 24);
      let prop;
      if (m >= 35 && m <= 37) prop = 'ucRound' + (m - 35);
      else if (b === 0) prop = 'ucCross' + mod(Math.floor(i / 24), 3);
      else if (b >= 14 && b <= 19 && blk !== 0) prop = 'ucGarden' + mod(i, 3);
      else prop = 'ucShop' + Math.floor(rnd(i, 71) * 6);
      return [{ prop, x: 0, dist: 6, solo: true }];
    } });
  ENV3D.mallDown = Object.assign({}, ENV3D.underCity, { name: 'CENTRE COMMERCIAL', layout: mallLayout });
  // THE PARKING (the user, 2026-11-26): a big underground car park between the shopping centre's gallery and the blueprint tunnel; the tarmac road starts from it. Three rows of bays on each side of the
  // road (cars of every colour, white bay lines), pillars with hazard feet, a low ceiling with light strips, a lit P gantry over the road every 3 slots, yellow guide lines along the aisle.
  const CARS = ['#c0392b', '#2e86de', '#f1c40f', '#ecf0f1', '#2c3e50', '#27ae60', '#e67e22', '#8e44ad', '#95a5a6'];
  const park = (v) => () => { const p = [], LL = 12.2;
    p.push(Kit.box(100, 0.1, LL, 0, -0.12, 0, '#1a1c28'), Kit.box(100, 0.6, LL, 0, 7, 0, '#10121e'));
    for (const x of [-30, -16, -3, 3, 16, 30]) p.push(Kit.box(0.5, 0.08, 6, x, 6.9, 0, '#fff4d0', { glow: true }));
    for (const s of [-1, 1]) { p.push(Kit.box(8, 7.4, LL, s * 54, 0, 0, '#0e1020'));
      for (const xr of [11, 16.8, 22.6]) { for (let q = 0; q < 5; q++) { const z = -4.8 + q * 2.4, k = v * 31 + q * 7 + xr + (s > 0 ? 3 : 0);
          p.push(Kit.box(0.12, 0.02, 2.4, s * (xr - 2.4), 0, z - 1.2, '#f2f2f2'));
          if (hr(k, 1) < 0.66) { const col = CARS[Math.floor(hr(k, 2) * CARS.length)], toward = xr === 16.8 ? -s : -s;
            p.push(Kit.box(4.2, 0.7, 1.8, s * xr, 0.22, z, col), Kit.box(2.2, 0.55, 1.6, s * (xr + 0.2), 0.9, z, '#222a40'), Kit.box(0.1, 0.18, 1.3, s * (xr - 2.12), 0.55, z, '#ff3030', { glow: true })); } } }
      for (const x of [14, 19.7]) p.push(Kit.box(0.9, 7, 0.9, s * x, 0, 0, '#3a3f58'), Kit.box(1.0, 0.7, 1.0, s * x, 0, 0, '#ffb800'), Kit.box(0.2, 0.2, 0.2, s * x, 1.4, 0, '#ffb800', { glow: true }));
      p.push(Kit.box(0.14, 0.03, LL, s * 5.4, 0.02, 0, '#ffd21a', { glow: true })); }
    if (mod(v, 3) === 0) p.push(Kit.box(0.3, 3, 0.3, -7, 3.4, 0, '#232a66'), Kit.box(0.3, 3, 0.3, 7, 3.4, 0, '#232a66'), Kit.box(15, 2.4, 0.3, 0, 4.4, 0, '#143a8a'), Kit.box(14, 0.18, 0.4, 0, 6.6, 0.05, '#ffffff', { glow: true }), Kit.box(1.6, 1.5, 0.4, 0, 4.9, 0.12, '#ffffff', { glow: true }), Kit.box(0.5, 1.5, 0.45, -0.3, 4.9, 0.14, '#143a8a'));
    return Kit.merge(p); };
  const parkProps = {}; for (let v = 0; v < 6; v++) parkProps['ucPark' + v] = park(v);
  ENV3D.mallPark = Object.assign({}, ENV3D.underCity, { name: 'PARKING', props: Object.assign({}, ENV3D.underCity.props, parkProps), layout(i) { return [{ prop: 'ucPark' + mod(i, 6), x: 0, dist: 6, solo: true }]; } });
})();
