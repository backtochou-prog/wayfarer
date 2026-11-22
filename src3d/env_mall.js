// THE UNDERGROUND MALL of ART CITY (the user, 2026-11-22, a red rectangle on the map over the tiled floor: "un centre commercial sous le sol du carrelage et un parking des grands
// camions sous le sol du centre commercial; l'entrée sera vaste pour contenir 2 routes séparées au milieu avec un mur de 50 cm, chaque route contient une rampe à côté; la route
// descend pour entrer au centre commercial et la 2e route descend plus bas pour entrer au tunnel"; then: "la sortie en montée; là où on sort de la terre, le petit carré marqué doit
// être plus bas de 1 m 50 que le reste, entouré d'un mur carré"). The route is NEON_CORNER.mallO / mallH (src/track.js); the game's side is the MALL block of src/game.js.
//   Everything here is authored in TRUE circuit coordinates (x in metres, q in slots after the avenue's mouth, y in metres from the ground) and cut into one prop per slot
//   (mlA30 .. mlA68). The ground itself becomes a slab (the renderer lowers its endless plane by NeonMall.DEEP while these slots are in view), with holes where one goes down.
//   The camera rides 7.5 m behind the runner along the circuit's axis whatever the road's heading, so on the diagonal crossing it is 6-7 m BESIDE the road: both levels are open
//   halls, and nothing stands in the band the runner and the camera sweep.
const NeonMall = { DEEP: 15.5 };
(() => {
  if (typeof NEON_CORNER === 'undefined' || !NEON_CORNER.mallO || typeof NeonAvenue === 'undefined' || typeof ENV3D === 'undefined' || !ENV3D.neon || !ENV3D.neon.props) return;
  const C = NEON_CORNER, P = ENV3D.neon.props, Q0 = 30, Q1 = 68, D = NeonAvenue.D;
  const X4 = q => C.mallO(4, q), X5 = q => C.mallO(5, q), H4 = q => C.mallH(4, q) / 10, H5 = q => C.mallH(5, q) / 10;
  const GT = -0.12, GB = -0.72, MT = -6.55, MB = -7.1, TT = -14.05, TB = -14.6, CT = -1.5, CB = -1.9;      // the ground's slab, the mall's floor, the trucks' floor, the court's floor (top, bottom)
  const HX0 = -82, HX1 = 26.5, HQ0 = C.MF, HQ1 = C.MC1 + 1.8;                                                        // the halls
  const KX0 = -132, KQ0 = C.MG - 6.5, KQ1 = C.MG, PX0 = -113.1, PQ1 = C.MC1 - 0.1, WX0 = -114, AQ0 = KQ0 - 4.6, S = C.MG - 46.6;  // the court, the open pit before the way out (PQ1: the exit's face), the room under the court
  const EX0 = -113.1, EX1 = -98.5, WA = -105.7, WB = -105.2;                                                // the exit's trench in the court (the entrance's, 125 m to the left) and the wall between its two roads
  const COL = { ground: '#0c0b12', wall: '#2a2350', wall2: '#3b3560', road: '#1d2550', cyan: '#7fe8ff', pink: '#ff5ad8', floor: '#b9b3cf', walk: '#d8d2e6', tfloor: '#3a3d47', twall: '#2b2e38', troad: '#1a1d2a',
    yel: '#ffd23a', lamp: '#fff3d0', green: '#3f9a55', green2: '#2f7d45', trunk: '#6a4a36', court: '#8f8aa8' };
  const near = (X, x, q, m) => q > 34 && q < C.MG + 0.4 && x > Math.min(X(q + 0.7), X(q)) - m && x < Math.max(X(q), X(q + 0.7)) + m;      // (the band the runner and the camera behind sweep)
  const near4 = (x, q, m) => near(X4, x, q, m), near5 = (x, q, m) => near(X5, x, q, m);
  const holeF = { q0: 37.3, q1: 38.3, f: q => [Math.max(X5(q + 0.66) - 2.4, X4(q) + 2.7), X5(q) + 2.8] };      // the trucks' road sinks through the mall's floor

  const NAMES = ['CAFÉ', 'MODE', 'LIVRES', 'JOUETS', 'FLEURS', 'SPORT', 'MUSIQUE', 'GLACES', 'BIJOUX', 'JEUX', 'PHARMACIE', 'BOULANGERIE', 'P CAMIONS', 'CINÉMA', 'ART', 'THÉ'];
  const LONG = ['CENTRE COMMERCIAL', 'PARKING CAMIONS · TUNNEL', 'NOUVEAU CIRCUIT', 'SORTIE'], LCOL = ['#ff5ad8', '#ffd23a', '#7fe8ff', '#7dffa0'], SCOL = ['#ffe6a8', '#a8f0ff', '#ffb8e8', '#c8ffb8', '#ffd0a0'];
  let _mat = null;
  const material = () => { if (_mat) return _mat; const cv = document.createElement('canvas'); cv.width = 2048; cv.height = 1024; const x = cv.getContext('2d'); x.fillStyle = '#0a0618'; x.fillRect(0, 0, 2048, 1024);
    const cell = (t, px, py, w, col) => { x.save(); x.beginPath(); x.rect(px, py, w, 128); x.clip(); x.strokeStyle = col; x.lineWidth = 6; x.strokeRect(px + 6, py + 6, w - 12, 116); x.textAlign = 'center'; x.textBaseline = 'middle'; x.shadowColor = col; x.shadowBlur = 16; x.fillStyle = '#fff6ff';
      let f = 78; x.font = 'bold ' + f + 'px "Arial Black", Impact, Arial, sans-serif'; while (x.measureText(t).width > w - 60 && f > 20) { f -= 4; x.font = 'bold ' + f + 'px "Arial Black", Impact, Arial, sans-serif'; } x.fillText(t, px + w / 2, py + 68); x.restore(); };
    LONG.forEach((t, i) => cell(t, 0, 128 * i, 1024, LCOL[i])); NAMES.forEach((t, j) => cell(t, 1024 + 512 * (j % 2), 128 * (j >> 1), 512, SCOL[j % SCOL.length]));
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4; return (_mat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide })); };
  const uvOf = c => c.long !== undefined ? [0, 128 * c.long, 1024] : [1024 + 512 * (c.shop % 2), 128 * (c.shop >> 1), 512];

  const build = () => {
    const parts = {}, quads = {}; for (let q = Q0; q <= Q1; q++) { parts[q] = []; quads[q] = []; }
    const zOf = (q, Q) => 6 - 12 * (q - Q), slot = q => Math.max(Q0, Math.min(Q1, Math.floor(q)));
    // an upright box between two x and two q, cut at the slots' joints
    const B = (x0, x1, q0, q1, y0, y1, col, glow) => { if (!(x1 > x0) || !(y1 > y0)) return; for (let Q = Math.max(Q0, Math.floor(q0)); Q <= Math.min(Q1, Math.ceil(q1) - 1); Q++) { const a = Math.max(q0, Q), b = Math.min(q1, Q + 1); if (b - a < 1e-6) continue;
      parts[Q].push(Kit.box(x1 - x0, y1 - y0, (b - a) * 12, (x0 + x1) / 2, y0, zOf((a + b) / 2, Q), col, glow ? { glow: true } : {})); } };
    const bx = (w, h, d, x, y, q, col, o) => { const Q = slot(q); parts[Q].push(Kit.box(w, h, d, x, y, zOf(q, Q), col, o || {})); };
    const cy = (r0, r1, h, x, y, q, col, o) => { const Q = slot(q); parts[Q].push(Kit.cyl(r0, r1, h, x, y, zOf(q, Q), col, o || {})); };
    const ic = (r, x, y, q, col) => { const Q = slot(q); parts[Q].push(Kit.ico(r, x, y, zOf(q, Q), col)); };
    // a box along a piece of road from A to B (x, height, q): `lat` to the right of its line, `yb` above it; vert: upright sides, a level top
    const OB = (Q, ax, ay, aq, bx_, by, bq, lat, w, yb, h, col, glow, vert) => { const dx = bx_ - ax, dy = by - ay, dz = -12 * (bq - aq), hl = Math.hypot(dx, dz), L = Math.hypot(hl, dy); if (hl < 1e-6 || h <= 0) return;
      const X = new THREE.Vector3(-dz / hl, 0, dx / hl), Z = vert ? new THREE.Vector3(-dx / hl, 0, -dz / hl) : new THREE.Vector3(-dx / L, -dy / L, -dz / L), Y = new THREE.Vector3().crossVectors(Z, X);
      const c = new THREE.Vector3((ax + bx_) / 2, (ay + by) / 2, zOf((aq + bq) / 2, Q)).addScaledVector(X, lat).addScaledVector(Y, yb + h / 2);
      const geo = new THREE.BoxGeometry(w, h, (vert ? hl : L) + 0.08); geo.applyMatrix4(new THREE.Matrix4().makeBasis(X, Y, Z).setPosition(c));
      const g = geo.toNonIndexed(); geo.dispose(); g.deleteAttribute('uv'); g.deleteAttribute('normal'); g.computeVertexNormals(); parts[Q].push({ geo: g, color: col, glow: !!glow }); };
    const rib = (g, q0, q1, lat, w, yb, h, col, glow) => { const n = Math.max(1, Math.round((q1 - q0) * 6)); for (let i = 0; i < n; i++) { const a = q0 + (q1 - q0) * i / n, b = q0 + (q1 - q0) * (i + 1) / n;
      OB(slot((a + b) / 2), C.mallO(g, a), C.mallH(g, a) / 10, a, C.mallO(g, b), C.mallH(g, b) / 10, b, lat, w, yb, h, col, glow); } };
    const fill = (g, q0, q1, lat, w, floor, col) => { const n = Math.max(1, Math.round((q1 - q0) * 6)); for (let i = 0; i < n; i++) { const a = q0 + (q1 - q0) * i / n, b = q0 + (q1 - q0) * (i + 1) / n, m = (C.mallH(g, a) + C.mallH(g, b)) / 20;
      OB(slot((a + b) / 2), C.mallO(g, a), m, a, C.mallO(g, b), m, b, lat, w, floor - m, m - 0.3 - floor, col, false, true); } };
    const road = (g, q0, q1, truck) => { rib(g, q0, q1, 0, 4.5, -0.24, 0.35, truck ? COL.troad : COL.road); rib(g, q0, q1, -2.1, 0.16, 0.11, 0.03, truck ? COL.yel : COL.cyan, true); rib(g, q0, q1, 2.1, 0.16, 0.11, 0.03, truck ? COL.yel : COL.pink, true); };
    // a floor between two x and two q with holes in it (a rectangle, or f: q -> [x0, x1] row by row)
    const slab = (x0, x1, q0, q1, y0, y1, col, holes) => { const cuts = new Set([q0, q1]); for (let q = Math.ceil(q0); q < q1; q++) cuts.add(q);
      for (const h of holes) { cuts.add(h.q0); cuts.add(h.q1); if (h.f) for (let q = h.q0 + 1 / 12; q < h.q1 - 1e-4; q += 1 / 12) cuts.add(+q.toFixed(5)); }
      const cs = [...cuts].filter(q => q >= q0 && q <= q1).sort((a, b) => a - b);
      for (let i = 0; i + 1 < cs.length; i++) { const a = cs[i], b = cs[i + 1], m = (a + b) / 2; if (b - a < 1e-4) continue; let iv = [[x0, x1]];
        for (const h of holes) { if (m < h.q0 || m > h.q1) continue; const [lo, hi] = h.f ? h.f(m) : [h.x0, h.x1]; if (!(hi > lo)) continue; const nv = []; for (const [u, v] of iv) { if (lo > u) nv.push([u, Math.min(v, lo)]); if (hi < v) nv.push([Math.max(u, hi), v]); } iv = nv.filter(([u, v]) => v - u > 1e-3); }
        for (const [u, v] of iv) B(u, v, a, b, y0, y1, col); } };
    const sign = (q, p0, p1, y0, y1, c) => quads[slot(q)].push({ p0, p1, y0, y1, c, Q: slot(q) });      // p0, p1: [x, q] of its lower left and lower right corners as read
    const tree = (x, y, q, s) => { s = s || 1; cy(0.16 * s, 0.24 * s, 2.2 * s, x, y, q, COL.trunk); ic(1.35 * s, x, y + 3.0 * s, q, COL.green); ic(0.95 * s, x + 0.7 * s, y + 3.7 * s, q + 0.03, COL.green2); ic(0.85 * s, x - 0.6 * s, y + 3.5 * s, q - 0.03, '#58b56a'); };
    const lampPost = (x, y, q) => { cy(0.07, 0.09, 3.4, x, y, q, '#2e2a33'); bx(0.5, 0.14, 0.5, x, y + 3.4, q, COL.lamp, { glow: true }); };

    // ---- THE GROUND: a slab, open over the entrance, the court and the way out
    slab(-300, 300, Q0, Q1 + 1, GB, GT, COL.ground, [{ q0: C.MD, q1: 39, x0: 12.3, x1: 26.5 }, { q0: KQ0, q1: KQ1, x0: KX0, x1: HX0 }, { q0: KQ1, q1: C.ML0 + 0.05, x0: EX0, x1: EX1 }]);

    // ---- THE ENTRANCE. The forecourt: paved from the tiles' edge to the side road, one wide carriageway that parts in two
    for (let q = C.MQ; q < 39.2 - 1e-6; q += 0.25) { const m = q + 0.125, e = Math.min(C.sideM(q), C.sideM(q + 0.25)) - 3.75, s = q >= C.MD - 1e-6 ? 26.9 : 12.6; B(s, e, q, q + 0.25, 0, 0.07, COL.wall2); }
    for (let i = 0; i < Math.round((34.2 - C.MQ) * 12); i++) { const a = C.MQ + i / 12, m = a + 1 / 24; B(X4(m) - 2.25, X5(m) + 2.25, a, a + 1 / 12, 0, 0.11, COL.road); }
    rib(4, C.MQ, 34.2, -2.1, 0.16, 0.11, 0.03, COL.cyan, true); rib(5, C.MQ, 34.2, 2.1, 0.16, 0.11, 0.03, COL.pink, true);
    road(4, 34.2, C.ML1 + 0.3); road(5, 34.2, C.ML0 + 0.1, true);
    // the wall between the two roads, 50 cm, and its lit cap
    B(19.3, 19.8, 34.2, C.MD, 0, 1.1, COL.wall); B(19.3, 19.8, C.MD, HQ0 + 0.5, -8, 1.1, COL.wall); B(19.35, 19.75, 34.2, HQ0, 1.1, 1.16, COL.pink, true); bx(0.9, 1.5, 0.9, 19.55, 0, 34.15, COL.wall2); bx(0.6, 0.25, 0.6, 19.55, 1.5, 34.15, COL.yel, { glow: true });
    // the open trench: its two outer walls, the earth under the roads, a ramp for people beside each road
    B(12.3, 12.7, C.MD, HQ0, -8, 1.1, COL.wall); B(26.1, 26.5, C.MD, HQ0, -8, 1.1, COL.wall); B(12.35, 12.65, C.MD, HQ0, 1.1, 1.16, COL.cyan, true); B(26.15, 26.45, C.MD, HQ0, 1.1, 1.16, COL.yel, true);
    for (let i = 0; i < Math.round((HQ0 - C.MD) * 12); i++) { const a = C.MD + i / 12, b = a + 1 / 12; B(12.7, 19.3, a, b, -8, Math.min(H4(a), H4(b)) - 0.3, COL.wall); B(19.8, 26.1, a, b, -8, Math.min(H5(a), H5(b)) - 0.3, COL.wall); }
    rib(4, C.MD, 37.8, 3.275, 2.05, -0.24, 0.5, COL.walk); rib(4, C.MD, 37.8, 2.32, 0.07, 1.05, 0.07, COL.cyan, true); rib(4, C.MD + 0.05, 37.8, 2.32, 0.07, 0.26, 0.8, '#8a8f99');
    rib(5, C.MD, HQ0, 3.1, 1.6, -0.24, 0.5, COL.walk); rib(5, C.MD, HQ0, 2.37, 0.07, 1.05, 0.07, COL.yel, true); rib(5, C.MD + 0.05, HQ0, 2.37, 0.07, 0.26, 0.8, '#8a8f99');
    B(24.5, 26.1, HQ0, HQ0 + 0.03, H5(HQ0) + 0.26, H5(HQ0) + 2.5, '#ffe9a8', true); B(24.5, 26.1, HQ0, HQ0 + 0.2, H5(HQ0) + 2.5, GB, COL.wall); B(24.5, 26.1, HQ0 + 0.03, HQ0 + 0.2, MT, H5(HQ0) + 2.5, COL.wall);      // (the trucks' side: the people's ramp ends at a lit door)
    // the pavilion over the two mouths: piers, a fascia with the two names, a roof, walls round the well behind
    B(11.9, 12.7, HQ0, 39.2, GB, 5.6, COL.wall); B(26.1, 26.9, HQ0, 39.2, GB, 5.6, COL.wall); B(11.9, 26.9, 39, 39.2, GB, 5.6, COL.wall); B(11.7, 27.1, 36.4, 39.25, 5.6, 5.9, COL.wall2);
    B(11.7, 27.1, 36.39, 36.41, 5.62, 5.88, COL.pink, true); B(11.9, 26.9, HQ0 - 0.04, HQ0 + 0.04, 3.6, 5.6, '#150f2c'); B(19.3, 19.8, HQ0 - 0.05, HQ0 + 0.05, 1.1, 3.6, COL.wall); B(11.9, 12.7, HQ0 - 0.3, HQ0, 1.1, 5.6, COL.wall); B(26.1, 26.9, HQ0 - 0.3, HQ0, 1.1, 5.6, COL.wall);
    B(12.7, 19.3, HQ0 - 0.045, HQ0 - 0.04, 3.6, 3.68, COL.cyan, true); B(19.8, 26.1, HQ0 - 0.045, HQ0 - 0.04, 3.6, 3.68, COL.yel, true);
    sign(HQ0 - 0.2, [12.9, HQ0 - 0.046], [19.1, HQ0 - 0.046], 4.2, 4.98, { long: 0 }); sign(HQ0 - 0.2, [20.0, HQ0 - 0.046], [25.9, HQ0 - 0.046], 4.22, 4.96, { long: 1 });
    for (const [x, q] of [[10.2, 35.3], [10.2, 36.4], [10.2, 37.6], [10.2, 38.7], [29.0, 37.4], [29.0, 38.6]]) { B(x - 1, x + 1, q - 0.09, q + 0.09, 0, 0.5, COL.wall2); tree(x, 0.5, q, 0.9); }      // (green at the door)

    // ---- THE MALL (6.5 m under the tiles)
    slab(HX0, HX1, HQ0, HQ1, MB, MT, COL.floor, [holeF]); slab(WX0, HX0, AQ0, KQ0, MB, MT, COL.floor, []); slab(PX0, HX0, KQ0, PQ1, MB, MT, COL.floor, [{ q0: PQ1 - 0.2, q1: PQ1, x0: -105, x1: EX1 }]); B(-105.2, -105, PQ1 - 0.2, PQ1, MT, MT + 1, COL.wall2); B(EX1, EX1 + 0.2, PQ1 - 0.2, PQ1, MT, MT + 1, COL.wall2); B(-105.2, EX1 + 0.2, PQ1 - 0.215, PQ1 - 0.2, MT, MT + 1, COL.wall2); B(-105.2, EX1 + 0.2, PQ1 - 0.217, PQ1 - 0.198, MT + 1, MT + 1.06, COL.yel, true);      // (the pit's floor; open over the trucks' road where it starts up)
    B(HX0, 8, HQ0 - 0.05, HQ0, TB, GB, COL.wall); B(HX1, HX1 + 0.5, HQ0, HQ1, TB, GB, COL.wall); B(HX0 - 0.5, HX1 + 0.5, HQ1, HQ1 + 0.05, TB, GB, COL.wall); B(HX0 - 0.5, HX0, HQ0, AQ0, TB, GB, COL.wall); B(WX0 - 0.5, WX0, AQ0, KQ0, TB, GB, COL.wall); B(WX0 - 0.5, HX0, AQ0 - 0.05, AQ0, TB, GB, COL.wall);      // (AQ0..KQ0: a wing to the left, under the ground, where the roads reach the pit)
    B(HX0 - 0.5, HX0, PQ1, HQ1, MB, GB, COL.wall);
    fill(4, HQ0, 37.8, 1.0, 6.6, MT, COL.wall2); fill(5, HQ0, 37.4, 0, 4.5, MT, COL.wall2); fill(5, 37.3, 40.1, 0, 4.5, TT, COL.twall);
    { let pl = null, ph = null; for (let q = holeF.q0; q < holeF.q1 - 1e-4; q += 1 / 12) { const [lo, hi] = holeF.f(q + 1 / 24); B(lo - 0.2, lo, q, q + 1 / 12, MT, MT + 1, COL.wall2); B(hi, hi + 0.2, q, q + 1 / 12, MT, MT + 1, COL.wall2);      // (a parapet round the opening)
        if (pl !== null) { B(Math.min(lo, pl) - 0.2, Math.max(lo, pl), q - 0.008, q + 0.008, MT, MT + 1, COL.wall2); B(Math.min(hi, ph), Math.max(hi, ph) + 0.2, q - 0.008, q + 0.008, MT, MT + 1, COL.wall2); } pl = lo; ph = hi; }
      B(pl - 0.2, ph + 0.2, holeF.q1, holeF.q1 + 0.017, MT, MT + 1, COL.wall2); B(pl - 0.2, ph + 0.2, holeF.q1 - 0.002, holeF.q1 + 0.019, MT + 1, MT + 1.06, COL.yel, true); }
    for (let q = 37; q < HQ1; q++) B(HX0 + 2, HX1 - 2, q + 0.48, q + 0.52, GB - 0.08, GB - 0.02, COL.lamp, true); for (let q = Math.ceil(AQ0); q < KQ0 - 0.6; q++) B(WX0 + 2, HX0 - 2, q + 0.48, q + 0.52, GB - 0.08, GB - 0.02, COL.lamp, true);      // (lights on the ceiling)
    const freeM = (x, q, m) => !near4(x, q, m) && !(q < 38.6 && near5(x, q, m + 0.5)) && !(q < 38.2 && x > 5);
    const SHOPC = ['#3a2a6a', '#5a2a5a', '#2a4a6a', '#2a5a4a', '#6a3a2a', '#4a2a4a']; let sn = 0;
    const ROWS = []; for (let q = 39.0; q < HQ1 - 0.9; q += 1.6) ROWS.push(+q.toFixed(2)); ROWS.push(HQ1 - 0.42);
    const GARD = []; for (let k = 0; 41.5 + 3.2 * k < HQ1 - 2; k++) for (const xc of k % 2 ? [-8, -58, 10, -40] : [-35, 5, -60, -15]) { const q = 41.5 + 3.2 * k; let ok = true; for (const x of [xc - 17, xc - 8, xc, xc + 8, xc + 17]) for (const dq of [-0.5, 0, 0.7]) if (!freeM(x, q + dq, 4)) ok = false; if (ok) { GARD.push([xc, q]); break; } }      // (gardens indoors, between the rows of shops, where the road does not pass)
    const inG = (x, q) => GARD.some(([xc, qc]) => x > xc - 16.5 && x < xc + 16.5 && q > qc - 0.5 && q < qc + 0.7);
    for (const q0 of ROWS) for (let k = 0; k < 10; k++) { const x0 = -80 + 10.4 * k, x1 = x0 + 10; let ok = true; for (const x of [x0 - 1, (x0 + x1) / 2, x1 + 1]) for (const q of [q0 - 0.3, q0, q0 + 0.42]) if (!freeM(x, q, 4)) ok = false; if (!ok) continue;
      const j = sn++ % 12, c = SCOL[j % SCOL.length]; B(x0 + 0.2, x1 - 0.2, q0, q0 + 0.42, MT, MT + 4.2, SHOPC[j % SHOPC.length]); B(x0 + 0.9, x1 - 0.9, q0 - 0.006, q0, MT + 0.5, MT + 2.7, c, true); B(x0 + 4.3, x1 - 4.3, q0 - 0.01, q0 - 0.006, MT, MT + 2.4, '#150f2c');
        B(x0 + 0.2, x1 - 0.2, q0 - 0.03, q0, MT + 4.2, MT + 4.3, c, true); sign(q0, [x0 + 2.4, q0 - 0.008], [x1 - 2.4, q0 - 0.008], MT + 2.85, MT + 4.15, { shop: j }); }
    for (let q = 38.5; q < HQ1 - 1; q += 1.6) for (let k = 0; k < 9; k++) { const x = -76 + 12 * k; if (!freeM(x, q, 5.5) || inG(x, q)) continue; B(x - 0.35, x + 0.35, q - 0.03, q + 0.03, MT, GB, COL.wall2); B(x - 0.4, x + 0.4, q - 0.034, q + 0.034, MT + 2.6, MT + 2.75, COL.cyan, true); }
    // a garden indoors, and planters
    for (const [xc, qc] of GARD) { B(xc - 15, xc + 15, qc - 0.35, qc + 0.55, MT, MT + 0.14, COL.green2); B(xc - 15.3, xc + 15.3, qc - 0.375, qc - 0.35, MT, MT + 0.4, COL.wall2); for (const [dx, dq] of [[-11, -0.1], [-3, 0.3], [5, -0.1], [11, 0.3]]) tree(xc + dx, MT + 0.14, qc + dq, 1); bx(2.4, 0.5, 2.4, xc + 1, MT + 0.14, qc + 0.1, COL.wall2); bx(1.6, 0.12, 1.6, xc + 1, MT + 0.64, qc + 0.1, COL.cyan, { glow: true }); }
    for (let k = 0; 39.8 + 1.6 * k < HQ1 - 0.6; k++) for (const x of [[-70, 8], [-44, 20], [-18, -62], [2, -30]][k % 4]) { const q = 39.8 + 1.6 * k; if (freeM(x, q, 4) && !inG(x, q)) { bx(1.8, 0.55, 1.8, x, MT, q, COL.wall2); tree(x, MT + 0.55, q, 0.8); } }
    { const x = X4(KQ0 - 0.1); sign(KQ0 - 0.4, [x - 3, KQ0 - 0.08], [x + 3, KQ0 - 0.08], -1.75, -1.0, { long: 3 }); B(x - 3, x + 3, KQ0 - 0.08, KQ0 - 0.074, -1.8, -0.72, '#150f2c'); }      // (SORTIE, over the way into the pit)

    // ---- THE TRUCKS' CAR PARK (14 m down) and the room its road climbs through, under the court
    B(HX0, HX1, HQ0, HQ1, TB, TT, COL.tfloor); B(WX0, HX0, AQ0, PQ1, TB, TT, COL.tfloor); B(WB, EX1, PQ1, KQ1, TB, TT, COL.tfloor); B(WX0 - 0.5, WX0, KQ0, KQ1, TB, CB, COL.twall); B(WX0 - 0.5, HX0, KQ1, KQ1 + 0.05, TB, CB, COL.twall); B(HX0 - 0.5, HX0, HQ1, KQ1, TB, CB, COL.twall);
    fill(5, C.MC1 - 0.95, PQ1, 0, 4.5, TT, COL.twall);
    for (let q = 37; q < HQ1; q++) B(HX0 + 2, HX1 - 2, q + 0.48, q + 0.52, MB - 0.08, MB - 0.02, '#ffe2a0', true); for (let q = Math.ceil(AQ0); q < PQ1 - 0.6; q++) B(WX0 + 2, HX0 - 2, q + 0.48, q + 0.52, MB - 0.08, MB - 0.02, '#ffe2a0', true);
    const freeT = (x, q, m) => !near5(x, q, m) && !(q < 38.2 && x > 8);
    for (let q = 38.5; q < HQ1 - 1; q += 1.7) for (let k = 0; k < 9; k++) { const x = -76 + 12 * k; if (!freeT(x, q, 3.5)) continue; B(x - 0.4, x + 0.4, q - 0.034, q + 0.034, TT, MB, COL.twall); B(x - 0.42, x + 0.42, q - 0.036, q + 0.036, TT, TT + 1.2, COL.yel); B(x - 0.43, x + 0.43, q - 0.037, q + 0.037, TT + 0.4, TT + 0.8, '#15151a'); }
    const TRC = ['#c8413a', '#2f6fb0', '#e0e0e6', '#3f9a55', '#e0a030', '#7a4ab0']; let tn = 0;
    for (let q = 39.4; q < HQ1 - 0.65; q += 1.7) for (let k = 0; k < 22; k++) { const x = -78 + 4.6 * k; tn++; let ok = x < HX1 - 2; for (const dq of [-0.7, -0.3, 0, 0.3, 0.7]) if (!freeT(x, q + dq, 5)) ok = false; if (!ok) continue;
      B(x - 2.3, x - 2.2, q - 0.6, q + 0.6, TT, TT + 0.03, COL.yel); if (tn % 4 === 0) continue; const c = TRC[tn % TRC.length], y = TT;      // (a bay; three in four have their truck, nose to the far wall)
      bx(2.6, 3.0, 10, x, y + 1.05, q - 0.12, c); bx(2.5, 2.8, 2.5, x, y + 0.55, q + 0.44, tn % 3 ? '#d8dbe4' : '#30343f'); bx(2.3, 0.9, 0.06, x, y + 2.1, q + 0.546, '#7fd0ff', { glow: true });
      for (const dq of [-0.5, -0.4, 0.42]) { bx(0.45, 1.0, 1.0, x - 1.15, y, q + dq, '#111114'); bx(0.45, 1.0, 1.0, x + 1.15, y, q + dq, '#111114'); } bx(0.35, 0.22, 0.06, x - 0.95, y + 1.3, q - 0.54, '#ff3344', { glow: true }); bx(0.35, 0.22, 0.06, x + 0.95, y + 1.3, q - 0.54, '#ff3344', { glow: true }); }
    sign(39.2, [-18, 39.2], [-12, 39.2], -8.6, -7.3, { shop: 12 }); sign(41.3, [-66, 41.3], [-60, 41.3], -8.6, -7.3, { shop: 12 }); sign(46.4, [-44, 46.4], [-38, 46.4], -8.6, -7.3, { shop: 12 }); sign(51.5, [-74, 51.5], [-68, 51.5], -8.6, -7.3, { shop: 12 });

    // ---- THE COURT where both roads come out of the earth: 1.5 m lower than the ground, a square wall round it
    slab(KX0, HX0, KQ0, KQ1, CB, CT, COL.court, [{ q0: KQ0, q1: PQ1, x0: PX0, x1: HX0 }, { q0: PQ1, q1: KQ1, x0: EX0, x1: EX1 }]);
    B(KX0 - 0.5, KX0, KQ0 - 0.05, KQ1 + 0.05, CB, 1.2, COL.wall); B(KX0, WX0 - 0.5, KQ0 - 0.05, KQ0, CB, 1.2, COL.wall); B(WX0 - 0.5, HX0, KQ0 - 0.05, KQ0, GB, 1.2, COL.wall);                    // west, south
    B(HX0 - 0.5, HX0, KQ0, PQ1, GB, 1.2, COL.wall); B(HX0 - 0.5, HX0, PQ1, KQ1 + 0.05, CB, 1.2, COL.wall);                                                                                          // east (over the mall's open side, then solid)
    B(KX0, EX0, KQ1, KQ1 + 0.05, CB, 1.2, COL.wall); B(EX1, HX0, KQ1, KQ1 + 0.05, CB, 1.2, COL.wall);                                                                                                 // north, with the gate
    for (const [a, b, c, d] of [[KX0 - 0.5, KX0, KQ0 - 0.05, KQ1 + 0.05], [HX0 - 0.5, HX0, KQ0 - 0.05, KQ1 + 0.05]]) B(a + 0.1, b - 0.1, c, d, 1.2, 1.26, COL.cyan, true); B(KX0, HX0, KQ0 - 0.04, KQ0 - 0.01, 1.2, 1.26, COL.cyan, true); B(KX0, EX0, KQ1 + 0.01, KQ1 + 0.04, 1.2, 1.26, COL.cyan, true); B(EX1, HX0, KQ1 + 0.01, KQ1 + 0.04, 1.2, 1.26, COL.cyan, true);
    // the pit, open to the sky, a garden on the mall's floor
    B(PX0 - 0.4, PX0, KQ0, PQ1, MB, CT + 1.1, COL.wall2); B(EX1, HX0, PQ1, PQ1 + 0.04, TB, CT + 1.1, COL.wall2); B(PX0 - 0.4, PX0, KQ0, PQ1, CT + 1.1, CT + 1.16, COL.pink, true); B(EX1, HX0, PQ1, PQ1 + 0.04, CT + 1.1, CT + 1.16, COL.pink, true);
    for (const [x, q] of [[-88, (S + 42.3)], [-96, (S + 42.4)], [-90, (S + 40.6)], [-103, (S + 40.5)], [-110, (S + 41.2)]]) if (!near4(x, q, 4)) { bx(2, 0.55, 2, x, MT, q, COL.wall2); tree(x, MT + 0.55, q, 1.1); }
    // THE WAY OUT, the entrance again on the other side: the two roads side by side in an open trench, the 50 cm wall between them, a ramp for people beside each, climbing little by little
    B(EX0, EX0 + 0.4, PQ1, KQ1, TB, CT + 1.1, COL.wall); B(EX1 - 0.4, EX1, PQ1, KQ1, TB, CT + 1.1, COL.wall); B(WA, WB, PQ1, KQ1, TB, CT + 1.1, COL.wall);
    B(EX0 + 0.05, EX0 + 0.35, PQ1, KQ1, CT + 1.1, CT + 1.16, COL.cyan, true); B(EX1 - 0.35, EX1 - 0.05, PQ1, KQ1, CT + 1.1, CT + 1.16, COL.yel, true); B(WA + 0.05, WB - 0.05, PQ1, KQ1, CT + 1.1, CT + 1.16, COL.pink, true);
    for (let i = 0; i < Math.round((KQ1 - PQ1) * 12); i++) { const a = PQ1 + i / 12, b = a + 1 / 12; B(EX0 + 0.4, WA, a, b, TB, Math.min(H4(a), H4(b)) - 0.3, COL.wall); B(WB, EX1 - 0.4, a, b, TT, Math.min(H5(a), H5(b)) - 0.3, COL.twall); }
    rib(4, PQ1, KQ1 - 0.1, 3.275, 2.05, -0.24, 0.5, COL.walk); rib(4, PQ1, KQ1 - 0.1, 2.32, 0.07, 1.05, 0.07, COL.cyan, true); rib(4, PQ1, KQ1 - 0.15, 2.32, 0.07, 0.26, 0.8, '#8a8f99');
    rib(5, PQ1, KQ1 - 0.1, 3.1, 1.6, -0.24, 0.5, COL.walk); rib(5, PQ1, KQ1 - 0.1, 2.37, 0.07, 1.05, 0.07, COL.yel, true); rib(5, PQ1, KQ1 - 0.15, 2.37, 0.07, 0.26, 0.8, '#8a8f99');
    // its face: piers, a fascia with SORTIE over each mouth, a roof
    B(EX0 - 0.4, EX0 + 0.4, PQ1 - 0.04, PQ1 + 0.3, MB, 4.1, COL.wall); B(EX1 - 0.4, EX1 + 0.4, PQ1 - 0.04, PQ1 + 0.3, MB, 4.1, COL.wall); B(WA, WB, PQ1 - 0.05, PQ1 + 0.05, CT + 1.1, 2.1, COL.wall); B(EX0 - 0.4, EX1 + 0.4, PQ1 - 0.04, PQ1 + 0.04, 2.1, 4.1, '#150f2c'); B(EX0 - 0.6, EX1 + 0.6, PQ1 - 0.08, PQ1 + 0.5, 4.1, 4.4, COL.wall2);
    B(EX0 - 0.6, EX1 + 0.6, PQ1 - 0.09, PQ1 - 0.08, 4.12, 4.38, COL.pink, true); B(EX0 + 0.4, WA, PQ1 - 0.045, PQ1 - 0.04, 2.1, 2.18, COL.cyan, true); B(WB, EX1 - 0.4, PQ1 - 0.045, PQ1 - 0.04, 2.1, 2.18, COL.yel, true);
    sign(PQ1 - 0.2, [-112.3, PQ1 - 0.046], [-106.1, PQ1 - 0.046], 2.7, 3.48, { long: 3 }); sign(PQ1 - 0.2, [-104.9, PQ1 - 0.046], [-99.1, PQ1 - 0.046], 2.72, 3.46, { long: 3 });
    // the way of the NEW CIRCUIT, to the left: a stub of road to a closed arch in the wall
    B(KX0, -113.6, (S + 44.6), (S + 45.0), CT, CT + 0.09, COL.road); B(KX0, -113.6, (S + 44.6), (S + 44.613), CT + 0.09, CT + 0.12, COL.cyan, true); B(KX0, -113.6, (S + 44.987), (S + 45.0), CT + 0.09, CT + 0.12, COL.pink, true);
    B(KX0 - 0.6, KX0 + 0.1, (S + 44.45), (S + 44.55), CB, 4.6, COL.wall2); B(KX0 - 0.6, KX0 + 0.1, (S + 45.05), (S + 45.15), CB, 4.6, COL.wall2); B(KX0 - 0.6, KX0 + 0.1, (S + 44.45), (S + 45.15), 3.4, 4.6, '#150f2c'); B(KX0 + 0.1, KX0 + 0.14, (S + 44.55), (S + 45.05), CT, 3.4, '#1a1440');
    for (let i = 0; i < 4; i++) B(KX0 + 0.14, KX0 + 0.18, (S + 44.57) + i * 0.125, (S + 44.63) + i * 0.125, CT + 0.6, CT + 1.5, i % 2 ? COL.yel : '#ff5a3a', true); B(KX0 + 0.14, KX0 + 0.18, (S + 44.55), (S + 45.05), 3.3, 3.4, COL.cyan, true);
    sign((S + 44.8), [KX0 + 0.16, (S + 44.52)], [KX0 + 0.16, (S + 45.08)], 3.55, 4.4, { long: 2 });
    // the gate, SORTIE over it, the ramp up to the ground and its walls
    B(EX0 - 0.5, EX0, KQ1 - 0.02, KQ1 + 0.07, CB, 4.2, COL.wall2); B(EX1, EX1 + 0.5, KQ1 - 0.02, KQ1 + 0.07, CB, 4.2, COL.wall2); B(EX0 - 0.5, EX1 + 0.5, KQ1 - 0.02, KQ1 + 0.07, 4.2, 5.4, '#150f2c'); sign(KQ1 - 0.3, [-109.8, KQ1 - 0.022], [-101.8, KQ1 - 0.022], 4.3, 5.3, { long: 3 });
    for (let i = 0; i < Math.round((C.ML0 + 0.05 - KQ1) * 12); i++) { const a = KQ1 + i / 12, b = a + 1 / 12; B(EX0, EX1, a, b, CB, Math.min(H4(a), H4(b), H5(a), H5(b)) - 0.02, COL.court); }
    B(EX0 - 0.4, EX0, KQ1 + 0.05, C.ML0 + 0.05, CB, 1.1, COL.wall); B(EX1, EX1 + 0.4, KQ1 + 0.05, C.ML0 + 0.05, CB, 1.1, COL.wall);
    // green in the court and round it
    B(-130.5, -115.5, (S + 40.5), (S + 44.2), CT, CT + 0.1, COL.green2); for (const [x, q] of [[-127, (S + 40.9)], [-119, (S + 41.5)], [-126, (S + 42.4)], [-118.5, (S + 43.2)], [-126.5, (S + 43.8)]]) tree(x, CT + 0.1, q, 1.15);
    B(-130.5, -115.5, (S + 45.4), (S + 46.3), CT, CT + 0.1, COL.green2); for (const [x, q] of [[-127, (S + 45.85)], [-120, (S + 45.85)]]) tree(x, CT + 0.1, q, 1);
    B(-96.5, -84, (S + 43.4), (S + 46.2), CT, CT + 0.1, COL.green2); for (const [x, q] of [[-94, (S + 43.8)], [-87, (S + 44.4)], [-93.5, (S + 45.2)], [-87, (S + 45.9)]]) tree(x, CT + 0.1, q, 1.15);
    for (const [x, q] of [[-114.6, (S + 43.6)], [-114.6, (S + 46.2)], [-97.4, (S + 43.6)], [-97.4, (S + 46.2)]]) lampPost(x, CT, q);
    for (let q = (S + 40.4); q < S + 48; q += 0.8) { tree(-78.5, 0, q, 1); if (q < (S + 46.4) || q > (S + 48.3)) tree(-135.5, 0, q + 0.4, 1.05); } for (let x = -129; x < -84; x += 9) tree(x, 0, (S + 39.75), 1);
    for (let q = Q0; q <= Q1; q++) if (!parts[q].length) parts[q].push(Kit.box(1, 0.1, 1, 0, GB, 0, COL.ground));
    return { parts, quads, used: {} };
  };

  const quadGeo = (list, Q) => { if (!list.length) return null; const pos = [], uv = [], idx = []; list.forEach((s, i) => { const z0 = 6 - 12 * (s.p0[1] - Q), z1 = 6 - 12 * (s.p1[1] - Q), [px, py, w] = uvOf(s.c), u0 = px / 2048, u1 = (px + w) / 2048, v1 = 1 - py / 1024, v0 = 1 - (py + 128) / 1024;
      pos.push(s.p0[0], s.y0, z0, s.p1[0], s.y0, z1, s.p1[0], s.y1, z1, s.p0[0], s.y1, z0); uv.push(u0, v0, u1, v0, u1, v1, u0, v1); idx.push(4 * i, 4 * i + 1, 4 * i + 2, 4 * i, 4 * i + 2, 4 * i + 3); });
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); return g; };
  let ST = null;
  for (let q = Q0; q <= Q1; q++) P['mlA' + q] = () => { if (!ST || ST.used[q]) ST = build(); ST.used[q] = true; const merged = Kit.merge(ST.parts[q]), sprite = quadGeo(ST.quads[q], q); return sprite ? { merged, sprite, material } : merged; };
  P.mlG = () => Kit.merge([Kit.box(600, GT - GB, 12, 0, GB, 0, COL.ground)]);                                                                   // (the plain ground, a slab too)
  P.mlRail = () => Kit.merge([Kit.box(1.4, 1.1, 12.25, 0, 11, 0, '#b8a890'), Kit.box(0.5, 0.25, 12.25, 0, 12.1, 0, '#8a8f99'), Kit.box(1.45, 0.08, 12.25, 0, 10.98, 0, '#ffd27a', { glow: true })]);      // (the avenue's rail without its leg, over the entrance)
  NeonMall.Q0 = 10; NeonMall.Q1 = 77;

  const det = () => (typeof window !== 'undefined' && window.__wf && window.__wf.detour) || null;
  const baseL = NeonAvenue.layout;
  NeonAvenue.layout = (q, rnd, liftM) => { const out = baseL(q, rnd, liftM), d = det(); if (q < NeonMall.Q0 || q > NeonMall.Q1 || (d && (d.park || d.down) && q < 33)) return out;
    if (q >= 31 && q <= 48) for (let n = out.length - 1; n >= 0; n--) { const o = out[n], x = o.x - D; if (o.prop === 'cnRail' && q >= 34 && q <= 38 && x > 12 && x < 27) o.prop = 'mlRail'; else if (q >= 35 && q <= 39 && /Street/.test(o.prop) && x > 12 && x < 32) out.splice(n, 1); }      // (the old street ran where the trench now opens)
    out.push({ prop: q >= Q0 && q <= Q1 ? 'mlA' + q : 'mlG', x: 0.001 + D, dist: 6, dy: -liftM, solo: true }); return out; };
  // from the mall's roads the new land's road and its green are there, on the ground (the side way draws them only from the walled ramp and from the land itself)
  const baseS = NeonAvenue.side; if (baseS) NeonAvenue.side = (q, rnd, glass, land) => { const o = baseS(q, rnd, glass, land); if (!(glass >= 4) || land || q < 38 || q > 75 || !P.ldLandA) return o;
    const s0 = C.mallO(glass, q), s1 = C.mallO(glass, q + 1), tw = (q >= C.G3TA && q < C.G3TA + 2) || (q >= C.G3TB && q < C.G3TB + 2), R = q < 63 && !tw, add = [{ prop: 'sdRoad', x: C.LX, dist: 6, rotY: Math.PI }]; if (q < 72) add.push({ prop: q >= C.ML0 - 1 && q < C.ML1 + 1 ? 'ldLandRA' : 'ldLand' + (R ? '' : 'L') + (q % 2 ? 'B' : 'A'), x: C.LX, dist: 6, rotY: Math.PI });      // (no trees on the left where the mall's road joins)
    for (const p of add) { const nx = p.x - (s0 + s1) / 2; if ((p.x < 0) !== (nx < 0)) p.rotY += Math.PI; p.x = nx || 0.001; p.rotY += Math.atan((s1 - s0) / 12); p.dy = -C.mallH(glass, q + 0.5) / 10; p.solo = true; o.push(p); } return o; };
})();
