// SUNSET COAST: a warm seaside road, the first of the three destinations added to the forks. Low sun over the water on the left (the sea is a flat strip of blue with foam lines and glints,
// below the road), dunes with beach grass, sandstone cliffs and white cottages with blue shutters on the right, wooden fences, a lighthouse. Palette: peach and coral sky, sand, sea teal,
// white and terracotta, a few deep blue accents. Same shape as the other biomes (sky / fog / light colours, a road palette, a prop kit, a layout rule); the track's `coastRun` branch is the
// safe sprint (coin waves, almost no hazard). The sea is always on the LEFT, the land on the right, so the road reads the same whichever branch is taken.
window.ENV3D = window.ENV3D || {};

(function () {
  const mod = (a, n) => ((a % n) + n) % n;
  const C = { sand: '#e3cc98', sandD: '#c9a96a', white: '#f4eee0', blue: '#2f6fa8', blueD: '#1f4a7a', terra: '#c4623f', terraD: '#9a4632', ochre: '#e0a458', rock: ['#a65a44', '#bd7550', '#cf8c5c', '#e0a870'], wood: '#9a6a3c', woodD: '#6e4a2c',
              grass: '#a8b055', grassD: '#7e8a3c', sea: '#2b7ea6', seaL: '#58b0c8', foam: '#f4fbfa', roof: '#b8483a', roofB: '#3a5a8a', stone: '#c8bca8', red: '#d6402f', lamp: '#ffd9a0' };
  const SLOT = SEG_LEN;

  // a low seaside cottage: facade plane at local x = 0, body toward +X, centred on z = 0
  function cottage(F, D, H, wall, roofCol, seed) {
    const p = [Kit.box(D, H, F, D / 2, 0, 0, wall), Kit.box(D + 0.08, 0.5, F + 0.08, D / 2, 0, 0, C.stone), Kit.roof(D + 0.7, 1.9, F + 0.7, D / 2, H, 0, roofCol, { ry: 0 }), Kit.box(0.6, 1.6, 0.6, D * 0.65, H + 0.4, F * 0.24, C.stone)];
    p.push(Kit.box(0.12, 2.0, 0.95, -0.04, 0.0, F * 0.18, C.blueD), Kit.box(0.2, 0.14, 1.3, -0.08, 2.0, F * 0.18, C.white));                                                     // door
    for (const z of [-F * 0.28, F * 0.0]) {
      const lit = rnd(seed * 13 + (z > -1 ? 1 : 0), 3) < 0.5;
      p.push(Kit.box(0.1, 1.15, 1.0, -0.03, 1.0, z, lit ? '#ffd27a' : '#3a4a68', { glow: lit }), Kit.box(0.14, 1.3, 0.2, -0.07, 0.95, z - 0.62, C.blue), Kit.box(0.14, 1.3, 0.2, -0.07, 0.95, z + 0.62, C.blue), Kit.box(0.2, 0.1, 1.3, -0.1, 0.9, z, C.white));   // window and shutters
    }
    p.push(Kit.box(0.7, 0.1, F * 0.5, -0.38, 2.5, -F * 0.12, C.white, { rz: 0.0 }));                                                                                                    // a little porch roof over the windows
    return Kit.merge(p);
  }
  // a stretch of sea (the left side): a flat strip from the shore out to 110 m, below the road, foam lines and glints; local x grows away from the road
  function seaStrip() {
    const p = [Kit.box(110, 0.3, SLOT + 0.8, 55, -0.24, 0, C.sea), Kit.box(110, 0.02, SLOT + 0.8, 55, 0.05, 0, C.seaL), Kit.box(1.6, 0.05, SLOT + 0.8, 0.8, 0.05, 0, C.foam), Kit.box(0.35, 0.05, SLOT + 0.8, 2.6, 0.05, 0, C.foam)];
    // (the road ribbon's verge runs out to 120 m at the pavement's level, so the sea has to lie a few cm above it: the shore is a foam line, not a step)
    for (let k = 0; k < 9; k++) p.push(Kit.box(2.0 + rnd(k, 5) * 3, 0.04, 0.16, 6 + k * 11 + rnd(k, 6) * 6, 0.07, -5 + rnd(k, 7) * 10, C.foam), Kit.box(0.4, 0.05, 0.4, 14 + k * 9 + rnd(k, 8) * 5, 0.08, -5 + rnd(k, 9) * 10, '#fff2c0', { glow: true }));   // wave lines and sun glints
    return Kit.merge(p);
  }
  const fenceRun = (len) => () => { const p = []; const n = Math.round(len / 2.3);
    for (let k = 0; k <= n; k++) p.push(Kit.box(0.2, 1.05, 0.2, 0, 0, -len / 2 + k * len / n, C.wood), Kit.box(0.2, 0.06, 0.2, 0, 1.05, -len / 2 + k * len / n, C.woodD));
    for (const y of [0.45, 0.82]) p.push(Kit.box(0.1, 0.1, len, 0.05, y, 0, C.woodD));
    return Kit.merge(p); };
  const tuft = (n, h) => () => { const p = []; for (let k = 0; k < n; k++) { const a = k * 2.4, r = 0.18 + rnd(k, 31) * 0.35; p.push(Kit.cone(0.1, h * (0.7 + rnd(k, 32) * 0.6), Math.cos(a) * r, 0, Math.sin(a) * r, k % 2 ? C.grass : C.grassD, { seg: 4, rx: (rnd(k, 33) - 0.5) * 0.5, rz: (rnd(k, 34) - 0.5) * 0.5 })); } return Kit.merge(p); };

  // THE STRAWBERRY BEACH CLUB: a terrace on a wooden deck beside the road (one slot, 12 m, on the land side, about twice a coastal zone): white railings with surfboards leaning on them, tables under pink and
  // white parasols, a low bar, string lights, a pink canopy with a scalloped fringe, and, as the BACKDROP of the terrace, the user's 'STRAWBERRY WEEKEND' picture stretched wide (a 11.5 x 4.55 m panel
  // for a square picture: 2.5 times wider than it was), under a neon name board; at the entrance, on two posts, the user's 'EL MEDITERRANEOS' sign, facing the runner coming along the road.
  const club = () => {
    const p = [], L = SLOT + 0.2, WOOD = '#c9a56a', WOODD = '#8a6a3c', PINK = '#ff4fa8', WH = '#f4eee0', IRON = '#2a2630';
    p.push(Kit.box(6.2, 0.35, L, 3.1, 0, 0, WOOD), Kit.box(6.3, 0.06, L + 0.1, 3.15, 0.35, 0, '#d8b67c'));
    for (let z = -5.6; z <= 5.6; z += 1.2) p.push(Kit.box(6.2, 0.02, 0.05, 3.1, 0.415, z, WOODD));                                      // the joints of the planks
    p.push(Kit.box(0.5, 0.17, 2.6, -0.25, 0, 0, WOODD), Kit.box(0.3, 0.17, 2.6, -0.1, 0.17, 0, WOODD));                                  // the steps from the road side
    for (const [a, b] of [[-5.9, -1.5], [1.5, 5.9]]) { p.push(Kit.box(0.05, 0.05, b - a, 0.15, 1.2, (a + b) / 2, WH), Kit.box(0.05, 0.05, b - a, 0.15, 0.8, (a + b) / 2, WH)); for (let z = a; z <= b + 0.01; z += 1.1) p.push(Kit.box(0.08, 0.9, 0.08, 0.15, 0.35, z, WH)); }
    [[-5.3, '#ff4fa8', -0.18], [-4.7, '#35e6ff', 0.14], [-4.1, '#ffd24a', -0.1]].forEach(([z, c, r]) => p.push(Kit.box(0.07, 2.0, 0.5, 0.4, 0.35, z, c, { rz: r }), Kit.box(0.04, 1.7, 0.2, 0.4, 0.5, z, WH, { rz: r })));   // surfboards leaning on the railing
    p.push(Kit.box(0.4, 7.0, L, 6.4, 0, 0, '#5a3a2a'), Kit.box(0.5, 0.3, L + 0.3, 6.2, 5.1, 0, WOODD), Kit.box(0.5, 0.3, L + 0.3, 6.2, 0.35, 0, WOODD), Kit.box(0.5, 4.8, 0.3, 6.2, 0.35, -L / 2 - 0.05, WOODD), Kit.box(0.5, 4.8, 0.3, 6.2, 0.35, L / 2 + 0.05, WOODD));   // the wall behind the panel and its frame
    p.push(Kit.box(2.4, 0.15, L + 0.4, 5.0, 5.45, 0, PINK, { rz: -0.08 })); for (let k = 0, z = -5.8; z < 6.0; z += 1.0, k++) p.push(Kit.box(0.1, 0.4, 0.9, 3.85, 5.3, z, k % 2 ? WH : PINK));        // the canopy and its scalloped fringe
    for (const z of [-5.8, 5.8]) p.push(Kit.cyl(0.08, 0.08, 5.2, 3.9, 0.35, z, WOODD, { seg: 6 }));
    for (let z = -5.4, k = 0; z <= 5.4; z += 0.9, k++) p.push(Kit.box(0.14, 0.14, 0.14, 3.9, 4.85 - 0.25 * Math.sin(Math.PI * (z + 5.4) / 10.8), z, '#ffe2a8', { glow: true }));       // a string of lights
    const um = (x, z, c) => p.push(Kit.cyl(0.04, 0.04, 2.4, x, 0.35, z, IRON, { seg: 4 }), Kit.cone(1.2, 0.5, x, 2.7, z, c, { seg: 8 }), Kit.cyl(0.42, 0.42, 0.05, x, 1.1, z, WH, { seg: 8 }), Kit.cyl(0.04, 0.04, 0.75, x, 0.35, z, WH, { seg: 4 }));
    [[2.2, -3.4, PINK], [2.2, 0.2, WH], [2.2, 3.6, PINK]].forEach(([x, z, c]) => { um(x, z, c); for (const [dx, dz] of [[-0.6, 0], [0.6, 0], [0, -0.6], [0, 0.6]]) p.push(Kit.box(0.36, 0.05, 0.36, x + dx, 0.8, z + dz, '#7a5230'), Kit.box(0.34, 0.4, 0.05, x + dx, 0.8, z + dz + (dz ? (dz < 0 ? -0.18 : 0.18) : 0), '#7a5230')); });
    p.push(Kit.box(0.7, 1.1, 3.2, 5.3, 0.35, 3.3, WOODD), Kit.box(0.9, 0.06, 3.4, 5.25, 1.45, 3.3, '#e8d2a0')); for (const z of [2.2, 3.3, 4.4]) p.push(Kit.cyl(0.18, 0.18, 0.06, 4.55, 0.95, z, PINK, { seg: 8 }), Kit.cyl(0.03, 0.03, 0.6, 4.55, 0.35, z, IRON, { seg: 4 }));   // the bar and its stools
    for (const x of [0.75, 2.95]) p.push(Kit.cyl(0.06, 0.06, 2.6, x, 0.35, 5.0, WOODD, { seg: 6 }));                                       // the two posts of the entrance sign
    const sp = CoastArt.join([CoastArt.panel('strawberry', 6.15, -5.75, 5.75, 0.55, 5.1), CoastArt.blade('anchor', 5.0, 0.5, 3.2, 2.5, 5.2)]);                // the stretched backdrop, the club's sign
    return { merged: Kit.merge(p), sprite: sp, material: () => CoastArt.material(), extra: [{ sprite: CoastArt.signPanel(6.1, -4.5, 4.5, 5.55, 6.675), material: () => CoastArt.signMaterial() }] };
  };

  // CLUB DELPHI: a whitewashed cabin in the manner of the Greek islands (white cube, blue door and shutters, a small blue dome, an awning, bougainvillea), a tiled terrace with blue and white parasols, a
  // DOLPHIN SCULPTURE leaping out of foam on a pedestal in front of it, and a dolphin SIGN across the entrance (the drawn sign of CoastArt.delphiMaterial). All original shapes, not the user's art.
  // The dolphin is a chain of ten ellipsoids along an arc (tail low, head high), a pale belly under it, a beak, a dorsal fin, a pectoral fin, flukes and an eye; the arc's plane is turned 35 degrees from
  // the road so that the runner sees it from three quarters. It is about 2.7 m long and 2.3 m high on a 0.8 m pedestal.
  const dolphin = (p, x0, z0, base) => {
    const K = 1.25, A = 1.2, ca = Math.cos(A), sa = Math.sin(A), S = v => v.map(c => c * K), P0 = S([0, 0.15]), P1 = S([0.25, 2.0]), P2 = S([-1.75, 2.25]), N = 11, BACK = '#5c92b8', BELLY = '#dcecf3', DARK = '#3b6a92';
    const at = (u, y) => [x0 + u * ca, base + y, z0 + u * sa], bez = t => [(1 - t) * (1 - t) * P0[0] + 2 * (1 - t) * t * P1[0] + t * t * P2[0], (1 - t) * (1 - t) * P0[1] + 2 * (1 - t) * t * P1[1] + t * t * P2[1]];
    const tan = t => { const a = 2 * (1 - t) * (P1[0] - P0[0]) + 2 * t * (P2[0] - P1[0]), b = 2 * (1 - t) * (P1[1] - P0[1]) + 2 * t * (P2[1] - P1[1]), l = Math.hypot(a, b); return [a / l, b / l]; };
    const rad = t => K * (0.09 + 0.4 * Math.pow(Math.sin(Math.PI * Math.pow(t, 1.8)), 0.8));
    for (let k = 0; k <= N; k++) {
      const t = k / N, b = bez(t), d = tan(t), phi = Math.atan2(d[1], d[0]), r = rad(t), n = [-d[1], d[0]], q = at(b[0], b[1]), qb = at(b[0] + n[0] * r * 0.45, b[1] + n[1] * r * 0.45);
      p.push(Kit.ico(r, q[0], q[1], q[2], BACK, { sx: 0.55 * K / r, sz: 0.85, rz: phi, ry: -A, detail: 1 }));
      if (k > 1 && k < N - 1) p.push(Kit.ico(r * 0.7, qb[0], qb[1], qb[2], BELLY, { sx: 0.5 * K / (r * 0.7), sy: 0.8, sz: 1.0, rz: phi, ry: -A }));           // the pale belly (the inner, lower side of the arc: n points that way)
    }
    const hb = bez(1), hd = tan(1), hp = Math.atan2(hd[1], hd[0]), bk = at(hb[0] + hd[0] * 0.28 * K, hb[1] + hd[1] * 0.28 * K); p.push(Kit.ico(0.1 * K, bk[0], bk[1], bk[2], '#5a8aa8', { sx: 2.4, sz: 1.0, rz: hp, ry: -A }));   // the beak
    const fb = bez(0.5), fd = tan(0.5), fo = [fd[1], -fd[0]], fc = at(fb[0] + fo[0] * 0.52 * K, fb[1] + fo[1] * 0.52 * K); p.push(Kit.cone(0.18 * K, 0.62 * K, fc[0], fc[1] - 0.31 * K, fc[2], DARK, { rz: Math.atan2(fo[1] - fd[1] * 0.5, fo[0] - fd[0] * 0.5) - Math.PI / 2, ry: -A, sz: 0.28, seg: 4 }));   // the dorsal fin
    const pb = bez(0.74), pd = tan(0.74), pn = [-pd[1], pd[0]], pc = at(pb[0] + pn[0] * 0.4 * K, pb[1] + pn[1] * 0.4 * K); p.push(Kit.cone(0.11 * K, 0.46 * K, pc[0] - sa * 0.3 * K, pc[1] - 0.23 * K, pc[2] + ca * 0.3 * K, DARK, { rz: Math.atan2(pn[1], pn[0]) - Math.PI / 2 + 0.3, ry: -A, sz: 0.4, seg: 4 }));            // a pectoral fin, on the near side
    const tb = bez(0), tt = at(tb[0], tb[1]); for (const s of [-1, 1]) p.push(Kit.box(0.3 * K, 0.06, 0.55 * K, tt[0] - sa * s * 0.26 * K + ca * 0.05, tt[1] - 0.05, tt[2] + ca * s * 0.26 * K + sa * 0.05, DARK, { ry: -A - s * 0.45 }));                       // the flukes
    const eb = bez(0.935), ed = tan(0.935), en = [-ed[1], ed[0]], ec = at(eb[0] + en[0] * 0.04 * K, eb[1] + en[1] * 0.04 * K); p.push(Kit.ico(0.05 * K, ec[0] - sa * 0.2 * K, ec[1], ec[2] + ca * 0.2 * K, '#101820', {}));                                                  // the eye (near side)
    p.push(Kit.cyl(0.55, 0.62, base, x0, 0, z0, '#e6e1d3', { seg: 10 }), Kit.cyl(0.58, 0.58, 0.1, x0, base * 0.55, z0, '#2a6db3', { seg: 10 }));                                                                                                // the pedestal and its blue band
    for (let k = 0; k < 6; k++) { const a = k * 1.047, r = 0.72; p.push(Kit.ico(0.22, x0 + Math.cos(a) * r, base + 0.1, z0 + Math.sin(a) * r, '#f4fbfa', { sy: 0.6 })); }                                                                             // foam round the tail
  };
  const delphi = () => {
    const p = [], L = SLOT + 0.2, WH = '#f2efe6', BL = '#1f5fa8', BLD = '#164678', FLOOR = '#e4dccb';
    p.push(Kit.box(5.4, 0.25, L, 2.7, 0, 0, FLOOR)); for (let z = -5.5; z <= 5.6; z += 1.1) p.push(Kit.box(5.4, 0.02, 0.06, 2.7, 0.25, z, '#b9c8d8'));                          // a tiled terrace
    p.push(Kit.box(4.4, 3.5, 6.6, 7.8, 0, -1.4, WH), Kit.box(4.6, 0.25, 6.8, 7.8, 3.5, -1.4, BL), Kit.ico(1.4, 8.4, 3.75, -1.4, BL, { sy: 0.8, detail: 1 }), Kit.cyl(0.18, 0.2, 0.5, 8.4, 5.0, -1.4, WH, { seg: 6 }));  // the cabin, its blue roof edge and its dome
    p.push(Kit.box(0.12, 2.4, 1.3, 5.55, 0.25, -1.4, BL), Kit.box(0.2, 0.2, 1.7, 5.5, 2.65, -1.4, BLD), Kit.cyl(0.06, 0.06, 0.1, 5.5, 1.3, -0.9, '#e8c53a', { rz: Math.PI / 2, seg: 6 }));          // the door
    for (const z of [-3.9, 1.1]) p.push(Kit.box(0.1, 1.3, 0.9, 5.57, 1.2, z, '#12253a'), Kit.box(0.14, 1.4, 0.4, 5.52, 1.15, z - 0.65, BL), Kit.box(0.14, 1.4, 0.4, 5.52, 1.15, z + 0.65, BL), Kit.box(0.2, 0.08, 1.3, 5.5, 0.95, z, WH));   // windows with shutters
    for (let k = 0, z = -4.7; z < 1.95; z += 0.8, k++) p.push(Kit.box(1.5, 0.08, 0.7, 4.9, 2.95, z, k % 2 ? WH : BL, { rz: 0.35 }));                                                                                       // a striped awning
    for (const [dz, dy, r] of [[2.0, 1.2, 0.34], [2.3, 1.9, 0.3], [1.8, 2.5, 0.28], [2.5, 0.7, 0.26], [2.1, 3.0, 0.24]]) p.push(Kit.ico(r, 5.55, dy, -1.4 + dz, '#d6408f', { detail: 1 }));                                   // bougainvillea
    const um = (x, z, c) => p.push(Kit.cyl(0.04, 0.04, 2.4, x, 0.25, z, '#2a2630', { seg: 4 }), Kit.cone(1.05, 0.5, x, 2.6, z, c, { seg: 8 }), Kit.cyl(0.42, 0.42, 0.05, x, 1.0, z, WH, { seg: 8 }), Kit.cyl(0.04, 0.04, 0.75, x, 0.25, z, WH, { seg: 4 }));
    [[4.3, -3.2, BL], [4.3, -5.0, WH]].forEach(([x, z, c]) => { um(x, z, c); for (const [dx, dz] of [[-0.6, 0], [0.6, 0], [0, -0.6], [0, 0.6]]) p.push(Kit.box(0.36, 0.05, 0.36, x + dx, 0.7, z + dz, BL), Kit.box(0.34, 0.4, 0.05, x + dx, 0.7, z + dz + (dz ? (dz < 0 ? -0.18 : 0.18) : 0), BL)); });
    dolphin(p, 1.0, 1.4, 0.7);
    for (const x of [0.55, 2.85]) p.push(Kit.cyl(0.06, 0.06, 2.5, x, 0.25, 5.1, '#c8c4b8', { seg: 6 }));                                                                                                                            // the posts of the sign
    return { merged: Kit.merge(p), sprite: CoastArt.delphiBlade(5.1, 0.3, 3.1, 2.4, 5.2), material: () => CoastArt.delphiMaterial() };
  };

  ENV3D.coast = {
    name: 'SUNSET COAST',
    sky: { top: '#4a5aa0', mid: '#e87f78', horizon: '#ffc57e' },
    sunDisc: { color: '#fff0c8', size: 12 },
    sunPos: [-34, 9],                                                 // low over the sea, ahead and to the left
    sunGlow: 0.85,
    fog: { color: '#f2a974', near: 36, far: 150 },
    hemi: { sky: '#ffe0b8', ground: '#9a7a62', intensity: 1.6 },
    sun: { color: '#ffb36e', intensity: 2.9, position: [-7, 5, -8] },
    groundFar: '#cfb27c',

    road: { asphalt: ['#8d8078', '#857870'], mark: '#fff1d0', edge: '#e9b86a', curb: ['#efe0b8', '#e5d3a4'], curbFace: '#cdb98a', walk: ['#e3cc98', '#dac18a'], court: '#d3b884', verge: ['#e6cf9c', '#dfc58f'] },
    innerOk: new Set(['tuft', 'tuftBig', 'seaFence', 'lampSea']),

    props: {
      seaStrip: seaStrip, coastClub: club, coastDelphi: delphi,
      cottageA: () => cottage(7.4, 6, 3.6, C.white, C.roof, 1), cottageB: () => cottage(6.4, 5.5, 3.4, '#a9d0e0', C.roofB, 2), cottageC: () => cottage(8.0, 6, 3.8, '#f2d9a8', C.roof, 3), cottageD: () => cottage(6.8, 5.5, 3.2, C.white, C.roofB, 4),
      seaFence: fenceRun(SLOT - 0.4), tuft: tuft(6, 0.9), tuftBig: tuft(11, 1.3),
      driftwood: () => Kit.merge([Kit.cyl(0.16, 0.2, 2.8, 0, 0.2, 0, '#c8b898', { rz: Math.PI / 2, ry: 0.5, seg: 5 }), Kit.cyl(0.08, 0.1, 1.2, 0.5, 0.35, 0.4, '#b8a888', { rz: 1.2, seg: 5 })]),
      dune: () => Kit.merge([Kit.ico(3.4, 2.0, 0.4, 0, C.sand, { sy: 0.3, detail: 1 }), Kit.ico(2.4, 4.4, 0.3, 2.2, C.sandD, { sy: 0.3 }), Kit.ico(1.6, 0.5, 0.2, -2.5, C.sand, { sy: 0.3 })]),
      cliff: () => { const p = []; C.rock.forEach((col, k) => p.push(Kit.box(7 - k * 1.3, 2.4, 11 - k * 1.4, 4 + k * 0.7 + 0.1 * k, k * 2.4, 0, col))); p.push(Kit.box(1.4, 0.5, 2.6, 2.6, 9.6, 1.5, C.grass), Kit.ico(0.7, 3.5, 9.9, -1.2, C.grassD, { sy: 0.7 })); return Kit.merge(p); },
      boat: () => Kit.merge([Kit.box(2.0, 0.7, 5.2, 0, -0.2, 0, C.terra), Kit.box(1.5, 0.08, 4.4, 0, 0.5, 0, C.wood), Kit.box(0.14, 4.2, 0.14, 0, 0.5, -0.4, C.woodD), Kit.roof(0.1, 3.4, 2.4, 0, 1.0, 0.7, C.white, { rz: 0 }), Kit.box(0.06, 0.2, 1.0, 0, 0.5, 2.2, C.blue)]),
      buoy: () => Kit.merge([Kit.cyl(0.32, 0.32, 0.6, 0, -0.3, 0, C.red, { seg: 8 }), Kit.cyl(0.33, 0.33, 0.14, 0, -0.1, 0, C.white, { seg: 8 }), Kit.box(0.06, 0.6, 0.06, 0, 0.3, 0, C.woodD)]),
      crates: () => Kit.merge([Kit.box(0.9, 0.7, 0.9, 0, 0, -0.5, C.wood), Kit.box(0.9, 0.7, 0.9, 0.2, 0, 0.6, C.woodD), Kit.box(0.8, 0.6, 0.8, 0.1, 0.7, 0.0, C.wood), Kit.cyl(0.35, 0.35, 0.7, 1.2, 0, 0.2, C.blue, { seg: 8 })]),
      lampSea: () => Kit.merge([Kit.box(0.3, 0.4, 0.3, 0, 0, 0, C.woodD), Kit.cyl(0.08, 0.1, 3.8, 0, 0, 0, C.white), Kit.box(0.5, 0.06, 0.06, -0.25, 3.7, 0, C.white), Kit.box(0.3, 0.4, 0.3, -0.5, 3.2, 0, C.lamp, { glow: true }), Kit.cone(0.28, 0.3, -0.5, 3.6, 0, C.terraD, { seg: 4, ry: Math.PI / 4 })]),
      // landmarks (at most one per stretch): the lighthouse (always on the sea side: it stands on its own rock) and the pier
      lighthouse: () => { const p = [Kit.cyl(3.4, 4.4, 1.6, 0, -0.5, 0, C.rock[0], { seg: 9 }), Kit.cyl(2.6, 3.4, 1.2, 0, 0.7, 0, C.rock[1], { seg: 9 })];
        for (let k = 0; k < 5; k++) p.push(Kit.cyl(1.55 - k * 0.12, 1.7 - k * 0.12, 2.1, 0, 1.9 + k * 2.1, 0, k % 2 ? C.red : C.white, { seg: 10 }));
        p.push(Kit.cyl(2.0, 2.0, 0.22, 0, 12.4, 0, C.woodD, { seg: 10 }), Kit.cyl(1.0, 1.0, 1.5, 0, 12.6, 0, '#fff0b0', { seg: 8, glow: true }), Kit.cyl(1.2, 1.2, 0.18, 0, 14.1, 0, C.red, { seg: 8 }), Kit.cone(1.3, 1.5, 0, 14.28, 0, C.red, { seg: 8 }));
        for (const a of [0, Math.PI / 2, Math.PI, 3 * Math.PI / 2]) p.push(Kit.box(0.1, 0.1, 5.0, Math.cos(a) * 0.4 - 0, 13.2, Math.sin(a) * 0.4, '#fff4c0', { glow: true, ry: a }));          // the beam
        return Kit.merge(p); },
      pier: () => { const p = [Kit.box(34, 0.16, 2.6, 17, 0.9, 0, C.wood)]; for (let k = 0; k < 12; k++) p.push(Kit.box(0.34, 1.6, 0.34, 1.5 + k * 2.8, -0.4, -1.1, C.woodD), Kit.box(0.34, 1.6, 0.34, 1.5 + k * 2.8, -0.4, 1.1, C.woodD));
        for (let k = 0; k < 12; k++) p.push(Kit.box(0.08, 0.3, 2.6, 1 + k * 2.8, 1.0, 0, C.woodD));
        p.push(Kit.box(0.3, 3.0, 0.3, 33, 0.9, 0, C.woodD), Kit.box(0.4, 0.4, 0.4, 33, 3.9, 0, C.lamp, { glow: true })); return Kit.merge(p); },
      gateCoast: () => Kit.merge([Kit.cyl(0.1, 0.14, 3.6, 0, 0, 0, C.white, { seg: 6 }), Kit.box(0.06, 0.8, 1.2, -0.05, 2.5, 0.65, C.blue), Kit.box(0.08, 0.2, 1.2, -0.06, 2.9, 0.65, '#ffd27a'), Kit.cone(0.2, 0.3, 0, 3.6, 0, C.red, { seg: 6 })]),
    },

    entrance: 'gateCoast',

    // The coast road is the open one: the sea is always on the left (a strip of water and a fence, a boat or a buoy far out), the land on the right.
    //   0 village: a row of cottages set back, a fence along the verge, beach grass   2 cliffs: sandstone cliffs on the right, driftwood, a lamp
    //   1 dunes: open: dunes, tufts of grass and one fence, a lot of sky and sea     3 harbour: low cottages, crates, buoys and boats, a lamp in every slot
    // A landmark (lighthouse / pier) takes the sea side of one slot per stretch.
    layout(i, rnd) {
      const out = [], S = Stretch.of(i, 150, 4, ['lighthouse', 'pier']), COT = ['cottageA', 'cottageB', 'cottageC', 'cottageD'], lmHere = S.lm && S.lm.slot === i ? S.lm.kind : null;
      out.push({ prop: 'seaStrip', x: -8.4, dist: 6 });
      for (const side of [-1, 1]) {
        const k = i * 2 + (side > 0 ? 1 : 0), r = n => rnd(k, n), sea = side < 0;
        if (sea) {
          if (lmHere) { out.push({ prop: lmHere, x: -(lmHere === 'pier' ? 7.4 : 17), dist: 6 }); }
          else if (S.variant === 3) { out.push({ prop: r(1) < 0.5 ? 'boat' : 'buoy', x: -(11 + r(2) * 14), dist: 3 + r(3) * 6 }, { prop: 'buoy', x: -(8 + r(4) * 4), dist: 9 }); }
          else if (r(1) < 0.3) out.push({ prop: 'boat', x: -(22 + r(2) * 40), dist: 2 + r(3) * 8 }); else if (r(1) < 0.55) out.push({ prop: 'buoy', x: -(10 + r(2) * 10), dist: 2 + r(3) * 8 });
          if (S.variant !== 1 || mod(i, 2) === 0) out.push({ prop: 'seaFence', x: -4.9, dist: 6 });
          if (mod(i, 3) === 0) out.push({ prop: 'tuft', x: -(5.6 + r(5) * 1.2), dist: 2 + r(6) * 8 });
          if (S.variant === 2 || S.variant === 3) if (mod(i, 2) === 0) out.push({ prop: 'lampSea', x: -4.3, dist: 9 });
          continue;
        }
        if (mod(i, 17) === 2) { out.push({ prop: 'coastDelphi', x: 5.4, dist: 6 }, { prop: 'tuft', x: 5.0, dist: 2 }); continue; }          // Club Delphi, now and then
        if (mod(i, 17) === 8) { out.push({ prop: 'coastClub', x: 5.4, dist: 6 }, { prop: 'tuft', x: 5.0, dist: 2 }); continue; }          // the Strawberry Beach Club, now and then
        switch (S.variant) {
          case 0: out.push({ prop: COT[mod(i * 3 + S.b, 4)], x: 8.4 + r(1) * 1.2, dist: 6 + (r(2) - 0.5) * 1.2 }, { prop: 'seaFence', x: 4.9, dist: 6 }, { prop: 'tuft', x: 5.7 + r(3), dist: 2 + r(4) * 8 }); if (r(5) < 0.4) out.push({ prop: 'tuftBig', x: 6.3 + r(6), dist: 8 }); break;
          case 1: out.push({ prop: 'dune', x: 8 + r(1) * 4, dist: 3 + r(2) * 6 }, { prop: 'tuftBig', x: 5.4 + r(3) * 1.5, dist: 2 + r(4) * 4 }, { prop: 'tuft', x: 5.2 + r(5) * 2, dist: 7 + r(6) * 4 }); if (r(7) < 0.35) out.push({ prop: 'seaFence', x: 4.9, dist: 6 }); if (r(8) < 0.3) out.push({ prop: 'driftwood', x: 6 + r(9), dist: 5 }); break;
          case 2: out.push({ prop: 'cliff', x: 8.6 + r(1) * 1.5, dist: 6 }, { prop: 'tuft', x: 5.4 + r(3), dist: 2 + r(4) * 8 }); if (r(5) < 0.5) out.push({ prop: 'driftwood', x: 5.8 + r(6), dist: 8 }); if (mod(i, 2) === 1) out.push({ prop: 'lampSea', x: 4.3, dist: 3 }); break;
          default: out.push({ prop: COT[mod(i * 3 + S.b + 1, 4)], x: 7.6 + r(1) * 0.8, dist: 6 + (r(2) - 0.5) * 0.8 }, { prop: 'crates', x: 5.4 + r(3) * 0.6, dist: 2 + r(4) * 3 }, { prop: 'seaFence', x: 4.9, dist: 6 }); if (r(5) < 0.5) out.push({ prop: 'crates', x: 5.6, dist: 10 }); out.push({ prop: 'lampSea', x: 4.3, dist: 9 });
        }
      }
      return out;
    },
  };
  // THE INDEPENDENT COASTAL ZONE (src/track.js `coastMorning` / `coastMidday` / `coastSunset` / `coastBlueHour`, picked by turns at each passage): the same road, scenery and prop set (one pool) under four
  // lights. The sunset one is `ENV3D.coast` itself; the other three only replace the sky, fog, light and road palette (see tools/coast_protos.js for the first renders). The sea strip's own colours
  // are drawn into its geometry and stay the same in all four.
  const LIGHT = {
    coastMorning: { name: 'MORNING COAST', sky: { top: '#9ab0d8', mid: '#f0c8c0', horizon: '#fff0e0' }, sunDisc: { color: '#fff8e8', size: 14 }, sunPos: [-30, 12], sunGlow: 1.1, fog: { color: '#f6e4da', near: 22, far: 125 },
      hemi: { sky: '#fff0e8', ground: '#b8a890', intensity: 1.75 }, sun: { color: '#ffd8b8', intensity: 2.0, position: [-7, 5, -8] }, groundFar: '#e8d8b8',
      road: { asphalt: ['#a09890', '#988f88'], mark: '#fff8e8', edge: '#f0d8a8', curb: ['#f4e8d0', '#ecdfc0'], curbFace: '#d8caa8', walk: ['#eadcb8', '#e2d2a8'], court: '#d8c8a0', verge: ['#ecdcb4', '#e4d4a8'] } },
    coastNoon: { name: 'MIDDAY COAST', sky: { top: '#2f7fd0', mid: '#8cc8f0', horizon: '#eaf5ff' }, sunDisc: { color: '#fffbe8', size: 9 }, sunPos: [-26, 44], sunGlow: 0.3, fog: { color: '#d3eaf6', near: 60, far: 230 },
      hemi: { sky: '#eaf5ff', ground: '#cdbb90', intensity: 1.95 }, sun: { color: '#fff4d8', intensity: 3.3, position: [-6, 10, -6] }, groundFar: '#e4d2a0',
      road: { asphalt: ['#9a928a', '#928a82'], mark: '#ffffff', edge: '#f0d090', curb: ['#f4ead0', '#ecdfbc'], curbFace: '#d8c8a0', walk: ['#eddcae', '#e4d2a0'], court: '#dcc690', verge: ['#efdfb0', '#e8d6a4'] } },
    coastBlue: { name: 'BLUE HOUR COAST', sky: { top: '#1c2a55', mid: '#5a5a9a', horizon: '#e8a8a0' }, sunDisc: { color: '#ffc8a0', size: 8 }, sunPos: [-40, 4], sunGlow: 0.6, fog: { color: '#6e7ca8', near: 30, far: 160 },
      hemi: { sky: '#8a98d0', ground: '#4a4258', intensity: 1.25 }, sun: { color: '#ff9a70', intensity: 1.4, position: [-7, 3, -8] }, groundFar: '#3a3a50',
      road: { asphalt: ['#5a5a6c', '#545466'], mark: '#c8c8e8', edge: '#8a88b0', curb: ['#8a88a0', '#807e98'], curbFace: '#6a6880', walk: ['#7e7c94', '#76748c'], court: '#6a6880', verge: ['#7a7890', '#727088'] } },
  };
  for (const id in LIGHT) ENV3D[id] = Object.assign({}, ENV3D.coast, LIGHT[id]);
})();