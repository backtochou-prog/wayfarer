// THE CENTRAL DISTRICT (the user, 2026-11-22, a plan: "NEO METROPOLIS CENTRAL DISTRICT", docs/refs/neo_central_district_plan.png: 2 km2 behind the picture towers on the left of the
// NEON AVENUE, entered by the walled glass ramp that passes between two of them). The plan at 0.7: 1400 m x 1400 m. The runner only ever goes forward, so the route is the plan's main
// NORTH-SOUTH AVENUE, from the south gate to the north gate (NEON_CORNER.DN slots of 12 m), through the CENTRE NEVRALGIQUE in the middle; what stands within reach of the eye along it is
// built (the fog closes at 280 m), the four round quarters further out are a later stage.
// STAGE 1: the avenue (a canal on its left, lawns and trees on both sides, a two-way bike lane on its right, a basketball court, a five-a-side pitch, a skate spot and a playground),
// towers 70-210 m with garden terraces, eight main towers 560-700 m, aerial walkways, green platforms on stems, a maglev and a metro viaduct, two three-level motorways, flying cars,
// two canals across, and the Centre: a round plaza with a ring basin, lawns, the E-W avenue and the diagonals, the tower astride the road and its halo.
// Everything is written in the district's own frame (X metres right of the route, Zd metres from its start) and cut into BANDS of 4 slots: one prop per band (dsB<n>), placed by the
// slot at the band's FAR end, so a band appears 240 m ahead and leaves only once the runner has passed all of it. dsBase is the ground of one slot, pooled.
const NeoDistrict = { props: {}, layout() { return []; } };
(function () {
  if (typeof Kit === 'undefined' || typeof ENV3D === 'undefined' || typeof NEON_CORNER === 'undefined' || !NEON_CORNER.DN || typeof NeonAvenue === 'undefined') return;
  const NC = NEON_CORNER, DN = NC.DN, L = DN * 12, BAND = 4, NB = Math.ceil(DN / BAND), ZC = Math.round(L / 2), HUB0 = ZC - 180, HUB1 = ZC + 180;
  const C = { pave: '#1b2244', paveL: '#262f5c', navy: '#1a2150', navy2: '#232a66', navy3: '#141a3c', slab: '#aab8e0', white: '#eaf6ff', cyan: '#58f0ff', mag: '#ff5ad8', gold: '#ffd27a', lime: '#9dff7a',
    lawn: '#1f8a4a', lawnD: '#17703c', leaf: '#2fae5c', leafD: '#1f8f4c', leafL: '#58c874', trunk: '#6a4a36', water: '#0d4f8c', bike: '#0f7a72', court: '#2146b8', asph: '#1d2550' };
  const rr = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const anchorSlot = b => Math.min(DN, (b + 1) * BAND) - 1, anchorZ = b => anchorSlot(b) * 12 + 6;
  let bands = null;
  const gen = () => {
    bands = Array.from({ length: NB }, () => ({ parts: [], glass: [], pic: [] }));
    const bOf = zFar => Math.max(0, Math.min(NB - 1, Math.floor(zFar / (BAND * 12))));
    const put = (zFar, part) => bands[bOf(zFar)].parts.push(part);
    const box = (w, h, d, X, Y, Z, col, o) => put(Z + d / 2 - 0.01, Kit.box(w, h, d, X, Y, -Z, col, o));
    const rbox = (w, h, d, X, Y, Z, col, ry, o) => put(Z + (Math.abs(w * Math.sin(ry)) + Math.abs(d * Math.cos(ry))) / 2 - 0.01, Kit.box(w, h, d, X, Y, -Z, col, Object.assign({ ry }, o)));
    const cyl = (r0, r1, h, X, Y, Z, col, o) => put(Z + Math.max(r0, r1), Kit.cyl(r0, r1, h, X, Y, -Z, col, o));
    const ico = (r, X, Y, Z, col, o) => put(Z + r, Kit.ico(r, X, Y, -Z, col, o));
    const glass = (zFar, A, B, Cc, D) => bands[bOf(zFar)].glass.push([A, B, Cc, D].map(p => [p[0], p[1], -p[2]]));
    // a flat strip along the route from Z0 to Z1, cut at the bands' limits and at the gaps
    const strip = (X0, X1, top, Z0, Z1, col, gaps, o) => { const cuts = [[Z0, Z1]];
      for (const [a, b] of gaps || []) for (let i = cuts.length - 1; i >= 0; i--) { const [s, e] = cuts[i]; if (b <= s || a >= e) continue; cuts.splice(i, 1); if (a > s) cuts.push([s, a]); if (b < e) cuts.push([b, e]); }
      for (const [s, e] of cuts) for (let z = s; z < e - 0.01;) { const n = Math.min(e, (Math.floor(z / (BAND * 12) + 1e-6) + 1) * BAND * 12); box(X1 - X0, 0.1, n - z, (X0 + X1) / 2, top - 0.1, (z + n) / 2, col, o); z = n; } };
    const ring = (R, n, w, h, Y, col, o, skipX, cz = ZC, cx = 0, skipA) => { for (let i = 0; i < n; i++) { const a = (i + 0.5) / n * Math.PI * 2, X = cx + R * Math.sin(a), Z = cz + R * Math.cos(a); if (skipX && Math.abs(X) < skipX) continue; if (skipA && skipA(a)) continue;
      rbox(2 * R * Math.tan(Math.PI / n) + 0.06, h, w, X, Y, Z, col, -a, o); } };
    const tree = (X, Z, r, k) => { cyl(r * 0.1, r * 0.16, r * 1.3, X, 0, Z, C.trunk); ico(r * 0.62, X, r * 1.75, Z, [C.leaf, C.leafD, C.leafL][k % 3]); ico(r * 0.44, X + r * 0.4 * (k % 2 ? 1 : -1), r * 1.42, Z + r * 0.25, [C.leafD, C.leafL, C.leaf][k % 3]); };
    const lamp = (X, Z, col) => { cyl(0.1, 0.15, 6, X, 0, Z, C.navy2); box(1.5, 0.12, 0.12, X - Math.sign(X) * 0.7, 5.9, Z, C.navy2); box(0.9, 0.16, 0.34, X - Math.sign(X) * 1.2, 5.74, Z, col, { glow: true }); };

    const X1 = 350, X2 = 1050, GAPS = [[X1 - 6, X1 + 6], [X2 - 6, X2 + 6], [HUB0, HUB1]], GAPX = [[X1 - 6, X1 + 6], [X2 - 6, X2 + 6]], Z0 = 14, Z1 = L - 14;
    // ---- THE AVENUE's sides: lawns, the canal (left), the bike lane (right)
    strip(-12, -6.4, 0.04, Z0, Z1, C.lawn, GAPX); strip(6.4, 8.7, 0.04, Z0, Z1, C.lawn, GAPX); strip(11.9, 19.5, 0.04, Z0, Z1, C.lawnD, GAPX);
    strip(-23, -13, 0.07, Z0 + 20, Z1 - 20, C.water, [[HUB0 + 40, HUB1 - 40]]);                                                             // the canal along the avenue (it meets the Centre's ring basin)
    for (const X of [-12.75, -23.25]) { strip(X - 0.25, X + 0.25, 0.5, Z0 + 20, Z1 - 20, C.slab, GAPS); strip(X - 0.12, X + 0.12, 0.56, Z0 + 20, Z1 - 20, C.cyan, GAPS, { glow: true }); }
    strip(9, 11.6, 0.1, Z0, Z1, C.bike);                                                                                                    // THE BIKE LANE: two ways, all along
    for (const X of [9.06, 11.54]) strip(X - 0.06, X + 0.06, 0.13, Z0, Z1, C.white, null, { glow: true });
    for (let z = Z0 + 2; z < Z1 - 3; z += 6) box(0.1, 0.1, 2.2, 10.3, 0.03, z + 1.1, C.lime, { glow: true });
    for (let z = 24, k = 0; z < Z1; z += 12, k++) { const hub = z > HUB0 + 60 && z < HUB1 - 60, cross = Math.abs(z - X1) < 9 || Math.abs(z - X2) < 9; if (cross) continue;
      tree(-9.2, z + 3, 2.3 + rr(k) * 0.7, k); tree(7.5, z + 9, 1.7 + rr(k + 50) * 0.4, k + 1); if (k % 2 === 0 && !hub) tree(15.6 + rr(k + 9) * 1.6, z, 3.2 + rr(k + 90) * 1.1, k + 2);
      if (k % 2 === 1) { lamp(-6.1, z, k % 4 === 1 ? C.cyan : C.mag); lamp(6.1, z + 6, k % 4 === 1 ? C.mag : C.cyan); if (!hub) lamp(-24.6, z + 6, C.gold); }
      if (k % 6 === 3 && !hub) { box(2.4, 0.14, 0.7, 13.6, 0.5, z + 5, C.slab); box(0.2, 0.5, 0.6, 12.6, 0, z + 5, C.navy2); box(0.2, 0.5, 0.6, 14.6, 0, z + 5, C.navy2); } }      // (benches by the lane)

    // ---- THE TWO CANALS ACROSS (the avenue and the lane cross them on the level, between lit parapets)
    for (const zc of [X1, X2]) { for (const s of [-1, 1]) { box(244.5, 0.1, 10, s * 127.75, -0.03, zc, C.water); for (const e of [-5.2, 5.2]) { box(244.5, 0.5, 0.4, s * 127.75, 0, zc + e, C.slab); box(244.5, 0.07, 0.2, s * 127.75, 0.5, zc + e, C.cyan, { glow: true }); } }
      for (const X of [-5.4, 5.4, 12]) { box(0.25, 1.1, 11, X, 0, zc, C.slab); box(0.3, 0.1, 11, X, 1.1, zc, C.mag, { glow: true }); }
      box(7, 0.1, 10, 8.6, -0.02, zc, C.paveL); }

    // ---- TOWERS (70-210 m), with their GARDEN TERRACES
    const tower = (X, Z, W, D, H, k) => { const s = Math.sign(X), col = [C.cyan, C.mag, C.white, C.gold][k % 4], body = [C.navy, C.navy2, C.navy3][k % 3], n = Math.max(3, Math.floor((H - 14) / 15));
      box(W + 4, 6, D + 4, X, 0, Z, C.navy3); box(W + 4.2, 0.5, D + 4.2, X, 6, Z, col, { glow: true }); box(W, H - 6, D, X, 6, Z, body);
      for (let i = 0; i < n; i++) box(W + 0.24, i % 3 === 0 ? 1.6 : 0.8, D + 0.24, X, 16 + i * (H - 22) / n, Z, i % 3 === 0 ? col : C.slab, { glow: i % 3 === 0 });
      box(0.7, H * 0.86, 0.7, X - s * W / 2, 8, Z + D * 0.3, col, { glow: true }); box(0.7, H * 0.6, 0.7, X - s * W / 2, 8, Z - D * 0.3, C.white, { glow: true });
      box(W * 0.6, 7, D * 0.6, X, H, Z, C.navy3); box(W * 0.62, 0.6, D * 0.62, X, H + 7, Z, col, { glow: true }); cyl(0.25, 0.4, 16, X, H + 7.6, Z, C.slab); ico(0.9, X, H + 24, Z, C.mag, { glow: true });
      if (k % 2 === 0) { const h = 16 + rr(k + 7) * 22, tx = X - s * (W / 2 + 4); box(9, 0.9, D * 0.8, tx, h, Z, C.slab); box(8.4, 0.3, D * 0.8 - 0.6, tx, h + 0.9, Z, C.lawn); ico(1.8, tx, h + 2.4, Z - D * 0.2, C.leaf); ico(1.4, tx - s * 1.5, h + 2.1, Z + D * 0.22, C.leafL); box(9.2, 0.2, 0.2, tx, h - 0.2, Z + D * 0.4, C.lime, { glow: true }); } };
    const QX = 232, QR = 170, inQ = (X, Z, m) => [X1, X2].some(zc => Math.hypot(Math.abs(X) - QX, Z - zc) < QR + m);                              // THE FOUR ROUND QUARTERS: centres (+-QX, X1 / X2), radius QR
    const SPORT = [[140, 186], [240, 282], [972, 1046], [1142, 1182]], inSport = z => SPORT.some(([a, b]) => z > a - 16 && z < b + 16);
    for (let z = 58, k = 0; z < L - 40; z += 34, k++) { if (z > HUB0 - 16 && z < HUB1 + 16) continue; if (Math.abs(z - X1) < 146 || Math.abs(z - X2) < 146) continue;               // (no wall of towers in front of the quarters: they are seen from the avenue)
      const Wl = 20 + rr(k * 3) * 6, Wr = 20 + rr(k * 3 + 1) * 6;
      tower(-(40 + Wl / 2 + rr(k * 5) * 8), z, Wl, 22 + rr(k * 7) * 6, 70 + rr(k * 11) * 140, k); tower((inSport(z) ? 52 : 34) + Wr / 2 + rr(k * 5 + 2) * 8, z + 8, Wr, 22 + rr(k * 7 + 3) * 6, 70 + rr(k * 11 + 5) * 140, k + 2); }
    for (let z = 76, k = 0; z < L - 40; z += 68, k++) for (const s of [-1, 1]) { if (z > HUB0 - 30 && z < HUB1 + 30) continue; const X = s * (104 + rr(k * 13 + s) * 12); if (inQ(X, z, 16)) continue; const H = 140 + rr(k * 17 + s) * 70, col = [C.cyan, C.mag, C.gold][(k + (s > 0 ? 1 : 0)) % 3];
      box(26, H, 26, X, 0, z, C.navy3); for (let i = 1; i <= 4; i++) box(26.3, 1.4, 26.3, X, H * i / 4.6, z, i % 2 ? col : C.slab, { glow: i % 2 === 1 }); box(0.8, H, 0.8, X - s * 13, 0, z, col, { glow: true }); }
    // ---- THE MAIN TOWERS (560-700 m)
    const mega = (X, Z, H, col) => { let w = 44, y = 0; for (let i = 0; i < 5; i++) { const h = H * [0.3, 0.24, 0.2, 0.15, 0.11][i]; box(w, h, w, X, y, Z, [C.navy, C.navy2][i % 2]); y += h; box(w + 0.6, 2.2, w + 0.6, X, y - 2.2, Z, col, { glow: true }); w -= 7; }
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(1.2, H * 0.54, 1.2, X + sx * 22, 0, Z + sz * 22, C.white, { glow: true }); cyl(0.6, 1.6, 50, X, y, Z, C.slab); ico(2.4, X, y + 51, Z, col, { glow: true }); };
    [[-150, 150, 620, C.cyan], [165, 168, 560, C.mag], [-150, HUB0 + 30, 700, C.mag], [150, HUB0 + 40, 640, C.cyan], [-150, HUB1 - 40, 660, C.cyan], [150, HUB1 - 30, 700, C.gold], [-150, 1255, 580, C.gold], [165, 1240, 640, C.cyan]].forEach(m => mega(...m));

    // ---- THE FOUR ROUND QUARTERS of the plan (stage 2): a disc of QR m on each side of the two cross canals. Ring boulevards, eight radial streets, two rings of buildings that rise
    // towards the middle, a park ring and pocket parks, and in the middle a round basin (the cross canal ends there) with the quarter's own hub tower. Each has its colour and its hub.
    const quarter = (cx, cz, A, B, kind, vh, qi) => { const R = QR, s = Math.sign(cx), axis = s > 0 ? Math.PI * 1.5 : Math.PI * 0.5, P = (r, a) => [cx + r * Math.sin(a), cz + r * Math.cos(a)];
      const off = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b))), onCanal = a => off(a, axis) < 0.14;
      for (const h of [-1, 1]) for (let d = 6; d < R - 0.01; d += 6) { const d1 = Math.min(d + 6, R), m = (d + d1) / 2, hc = Math.sqrt(R * R - m * m); box(2 * hc, 0.1, d1 - d, cx, 0.02, cz + h * m, C.paveL); }
      box(R, 0.1, 12, cx + s * R / 2, 0.02, cz, C.paveL);                                                                                   // (the ground leaves the canal open on the avenue's side)
      ring(R - 1, 48, 0.6, 1.3, 0.12, A, { glow: true }, 0, cz, cx, onCanal);                                                               // the rim: the round shape, seen from the avenue
      [[R - 8, 48, 8], [108, 36, 7], [56, 24, 6]].forEach(([r, n, w], i) => { ring(r, n, w, 0.25, 0.15, C.asph, null, 0, cz, cx); ring(r, n, 0.3, 0.08, 0.4, i % 2 ? B : A, { glow: true }, 0, cz, cx); });
      for (let i = 0; i < 8; i++) { const a = (i + 0.5) * Math.PI / 4, [X, Z] = P(107, a); rbox(6, 0.25, 98, X, 0.15, Z, C.asph, -a); rbox(0.3, 0.08, 98, X, 0.4, Z, B, -a, { glow: true }); }
      const build = (r, a, W, D, H, col, k) => { const [X, Z] = P(r, a), n = Math.max(2, Math.round(H / 26)); rbox(W, H, D, X, 0, Z, [C.navy, C.navy2, C.navy3][k % 3], -a);
        for (let i = 1; i <= n; i++) rbox(W + 0.3, i % 2 ? 1.3 : 0.7, D + 0.3, X, H * i / (n + 0.5), Z, i % 2 ? col : C.slab, -a, { glow: i % 2 === 1 });
        if (k % 3 === 0) { rbox(W * 0.84, 0.4, D * 0.84, X, H, Z, C.lawn, -a); ico(2.6, X, H + 2, Z, C.leaf); ico(2, X + 3, H + 1.6, Z + 2, C.leafL); }
        else { rbox(W * 0.5, 5, D * 0.5, X, H, Z, C.navy3, -a); rbox(W * 0.52, 0.5, D * 0.52, X, H + 5, Z, col, -a, { glow: true }); } };
      for (let i = 0; i < 8; i++) { const c = i * Math.PI / 4, canal = off(c, axis) < 0.1;
        for (const e of [-1, 1]) { const k = qi * 16 + i * 2 + (e > 0 ? 1 : 0);
          build(82, c + e * 0.175, 16, 30, (k % 2 ? 150 : 96) + rr(k * 3.1) * 40, k % 2 ? A : B, k); build(134, c + e * 0.13, 22, 34, 44 + rr(k * 5.3) * 46, k % 2 ? B : A, k + 1); }
        if (!canal) { const [X, Z] = P(134, c); rbox(8, 0.25, 34, X, 0.15, Z, C.lawn, -c); for (const r of [123, 134, 145]) { const [tx, tz] = P(r, c); tree(tx, tz, 3 + rr(qi * 9 + i + r) * 1.2, i + r); } } }
      ring(41, 24, 20, 0.25, 0.15, C.lawn, null, 0, cz, cx, onCanal);                                                                       // the park ring round the basin
      for (let i = 0; i < 16; i++) { const a = (i + 0.5) * Math.PI / 8; if (off(a, axis) < 0.3) continue; const [X, Z] = P(i % 2 ? 37 : 45, a); tree(X, Z, 3.4 + rr(qi * 7 + i) * 1.6, i + qi); }
      cyl(26, 26, 0.1, cx, 0.2, cz, C.water, { seg: 24 }); ring(27, 24, 1.4, 0.9, 0.12, C.slab, null, 0, cz, cx); ring(27, 24, 0.5, 0.12, 1.02, A, { glow: true }, 0, cz, cx); cyl(10, 11, 1.4, cx, 0.2, cz, C.slab, { seg: 12 });
      const halo = (r, y, col) => ring(r, 16, 1.2, 1.2, y, col, { glow: true }, 0, cz, cx);
      if (kind === 0) { cyl(5, 8, 90, cx, 1.6, cz, C.navy2, { seg: 8 }); cyl(3, 5, 110, cx, 91.6, cz, C.navy, { seg: 8 }); cyl(1, 3, 90, cx, 201.6, cz, C.navy2, { seg: 8 }); cyl(0.3, 1, 40, cx, 291.6, cz, C.white, { seg: 6, glow: true });   // the needle
        halo(13, 90, A); halo(9, 200, B); halo(5, 290, A); ico(3, cx, 333, cz, B, { glow: true }); }
      else if (kind === 1) { cyl(9, 9, 230, cx, 1.6, cz, C.navy, { seg: 12 }); for (let y = 30; y < 230; y += 28) cyl(9.25, 9.25, 1.5, cx, y, cz, (y / 28 | 0) % 2 ? A : C.slab, { seg: 12, glow: (y / 28 | 0) % 2 === 1 });                           // the round tower and its three rings
        halo(18, 80, B); halo(18, 150, A); halo(18, 220, B); ico(9, cx, 228, cz, C.slab, { detail: 1 }); cyl(0.3, 0.8, 36, cx, 236, cz, A, { seg: 6, glow: true }); }
      else if (kind === 2) { let y = 1.6; [[12, 70], [10, 60], [8, 52], [6, 46], [4, 40]].forEach(([r, h], i) => { cyl(r, r, h, cx, y, cz, [C.navy2, C.navy][i % 2], { seg: 6 }); y += h; cyl(r + 0.4, r + 0.4, 1.6, cx, y - 1.6, cz, i % 2 ? B : A, { seg: 6, glow: true }); });   // the stepped hexagon
        ico(5, cx, y + 4, cz, A, { glow: true, detail: 1 }); halo(16, 70, B); }
      else { for (const e of [-8, 8]) { box(9, 250, 9, cx + e, 1.6, cz, e < 0 ? C.navy : C.navy2); box(9.3, 1.4, 9.3, cx + e, 250, cz, A, { glow: true }); box(0.7, 250, 0.7, cx + e * 1.56, 1.6, cz, B, { glow: true }); }                  // the twin towers and their bridges
        for (const y of [70, 140, 210]) { box(8, 4, 5, cx, y, cz, C.slab); box(8, 0.5, 5.2, cx, y + 4, cz, A, { glow: true }); } ico(4.5, cx, 262, cz, B, { glow: true, detail: 1 }); halo(20, 110, A); }
      for (const e of [-9, 9]) { box(3, 30, 3, s * 78, 0, cz + e, C.navy2); box(0.5, 30, 0.5, s * 76.4, 0, cz + e, A, { glow: true }); } box(3, 2, 21, s * 78, 28, cz, C.slab); box(3.2, 0.5, 21, s * 78, 30, cz, A, { glow: true });   // its gate on the avenue's side, over the canal
      for (const h of [-1, 1]) { strip(s > 0 ? 46 : -58, s > 0 ? 58 : -46, 0.04, h < 0 ? cz - 140 : cz + 9, h < 0 ? cz - 9 : cz + 140, C.lawn); for (let d = 22; d < 140; d += 24) tree(s * 52, cz + h * d, 2.6 + rr(qi * 5 + d) * 0.8, d / 24 + qi | 0); }   // a garden along the open frontage
      cyl(7, 7, vh + 7, s * 200, 0.12, cz, C.navy2, { seg: 10 }); cyl(8.5, 8.5, 0.8, s * 200, vh + 7.1, cz, A, { seg: 10, glow: true }); };                                                                     // the terminal where the viaduct arrives
    [[QX, X1, C.cyan, C.white, 0, 21], [-QX, X1, C.mag, C.gold, 1, 21], [-QX, X2, C.gold, C.cyan, 2, 13], [QX, X2, C.lime, C.mag, 3, 13]].forEach((q, i) => quarter(...q, i));


    // ---- AERIAL WALKWAYS (glass tubes across the avenue, tower to tower) and GREEN PLATFORMS on stems
    [[122, 26], [262, 34], [432, 28], [958, 30], [1128, 36], [1296, 26]].forEach(([z, h], k) => { const col = k % 2 ? C.mag : C.cyan;
      box(120, 0.8, 5, 0, h, z, C.slab); for (const e of [-2.5, 2.5]) box(120, 0.2, 0.2, 0, h - 0.1, z + e, col, { glow: true }); box(120, 0.2, 5.2, 0, h + 3.4, z, C.slab);
      for (const X of [-27, 27]) { cyl(1.1, 1.6, h, X, 0, z, C.navy2, { seg: 8 }); box(4, 0.4, 6, X, h - 0.4, z, col, { glow: true }); }
      for (const e of [-2.5, 2.5]) glass(z + 3, [-60, h + 0.8, z + e], [60, h + 0.8, z + e], [60, h + 3.4, z + e], [-60, h + 3.4, z + e]); });
    const platform = (X, Z, h, k) => { cyl(1.3, 2.4, h, X, 0, Z, C.navy2, { seg: 8 }); cyl(9.5, 6.5, 1.8, X, h, Z, C.slab, { seg: 12 }); cyl(9, 9, 0.4, X, h + 1.8, Z, C.lawn, { seg: 12 }); cyl(9.8, 9.8, 0.25, X, h + 1.2, Z, k % 2 ? C.lime : C.cyan, { seg: 12, glow: true });
      for (let i = 0; i < 3; i++) { const a = i * 2.1 + k, tx = X + 5 * Math.sin(a), tz = Z + 5 * Math.cos(a), r = 1.8 + rr(k * 3 + i) * 0.8; cyl(r * 0.1, r * 0.16, r * 1.3, tx, h + 2.2, tz, C.trunk); ico(r * 0.62, tx, h + 2.2 + r * 1.75, tz, [C.leaf, C.leafL, C.leafD][i]); } };
    [[-33, 96, 16], [29, 208, 22], [-34, 300, 26], [-33, 410, 18], [30, 470, 24], [-34, 905, 20], [30, 930, 26], [-33, 1010, 16], [29, 1100, 22], [-34, 1210, 26], [30, 1262, 18], [-33, 1330, 22]].forEach(([X, z, h], k) => platform(X, z, h, k));

    // ---- THE MAGLEV (above the first canal) and THE METRO (above the second), on viaducts across
    [[X1, 21, C.cyan, C.white], [X2, 13, C.mag, C.gold]].forEach(([z, h, col, car], k) => { box(400, 1.2, 4.4, 0, h, z, C.slab); for (const e of [-2.2, 2.2]) box(400, 0.25, 0.25, 0, h - 0.3, z + e, col, { glow: true });
      for (let X = -175; X <= 175; X += 50) { cyl(1, 1.5, h, X + (X === 25 || X === -25 ? 0 : 0), 0, z, C.navy2, { seg: 8 }); box(5, 0.9, 5, X, h - 0.9, z, C.navy3); }
      for (let i = 0; i < 4; i++) { const X = (k ? 60 : -52) + i * 21; box(20, 3, 3.1, X, h + 1.5, z, car); box(18.6, 0.9, 3.2, X, h + 3, z, col, { glow: true }); } box(3, 2.4, 2.9, (k ? 60 : -52) + 73.5, h + 1.5, z, col, { glow: true }); });

    // ---- THE MOTORWAYS: three levels, south and north of the Centre
    for (const z of [HUB0 - 28, HUB1 + 28]) { [12, 21, 30].forEach((h, i) => { const zz = z + (i - 1) * 3; box(400, 1, 9, 0, h, zz, C.asph); for (const e of [-4.5, 4.5]) box(400, 0.7, 0.3, 0, h + 1, zz + e, C.slab); box(400, 0.06, 0.25, 0, h + 1.02, zz, [C.cyan, C.mag, C.gold][i], { glow: true });
        for (let c = 0; c < 9; c++) { const X = -160 + c * 40 + rr(c * 7 + i * 3 + z) * 26, e = c % 2 ? 2.2 : -2.2; box(3.6, 1.1, 1.7, X, h + 1, zz + e, [C.white, C.navy2, C.slab][c % 3]); box(0.3, 0.4, 1.5, X + (c % 2 ? 1.9 : -1.9), h + 1.3, zz + e, c % 2 ? C.white : C.mag, { glow: true }); } });
      for (const X of [-150, -100, -50, -14, 14, 50, 100, 150]) { cyl(1.2, 1.8, 31, X, 0, z, C.navy2, { seg: 8 }); } }

    // ---- FLYING CARS
    for (let i = 0; i < 26; i++) { const z = 60 + i * 50 + rr(i * 3) * 30, X = (rr(i * 5) - 0.5) * 110, y = 34 + rr(i * 9) * 70; if (z > L - 30) continue; box(1.9, 0.8, 4.2, X, y, z, i % 2 ? C.white : C.slab); box(1.5, 0.5, 1.8, X, y + 0.8, z, C.navy3); box(2.1, 0.12, 4.4, X, y - 0.14, z, i % 3 ? C.cyan : C.mag, { glow: true }); }

    // ---- THE COURTS and the YOUTH GROUNDS (right of the lane)
    const lines = (X0, Xb, Za, Zb, y, col) => { box(Xb - X0, 0.06, 0.18, (X0 + Xb) / 2, y, Za, col, { glow: true }); box(Xb - X0, 0.06, 0.18, (X0 + Xb) / 2, y, Zb, col, { glow: true }); box(0.18, 0.06, Zb - Za, X0, y, (Za + Zb) / 2, col, { glow: true }); box(0.18, 0.06, Zb - Za, Xb, y, (Za + Zb) / 2, col, { glow: true }); box(Xb - X0, 0.06, 0.18, (X0 + Xb) / 2, y, (Za + Zb) / 2, col, { glow: true }); };
    const flood = (X, Z) => { cyl(0.16, 0.24, 11, X, 0, Z, C.navy2); box(2.2, 0.9, 0.3, X, 11, Z, C.white, { glow: true }); };
    { const a = 148, b = 178, x0 = 24, x1 = 42; box(x1 - x0 + 4, 0.1, b - a + 4, (x0 + x1) / 2, -0.01, (a + b) / 2, C.court); lines(x0, x1, a, b, 0.1, C.white); ring(1.8, 10, 0.16, 0.06, 0.1, C.white, { glow: true }, 0, (a + b) / 2);      // BASKETBALL
      for (const [z, s] of [[a - 0.4, 1], [b + 0.4, -1]]) { cyl(0.14, 0.18, 3.4, 33, 0, z, C.slab); box(1.8, 1.1, 0.1, 33, 2.9, z + s * 0.9, C.white, { glow: true }); box(0.6, 0.06, 0.6, 33, 3.0, z + s * 1.3, C.mag, { glow: true }); }
      for (const X of [x0 - 2, x1 + 2]) for (const z of [a - 2, b + 2]) flood(X, z); }
    { const a = 980, b = 1038, x0 = 23, x1 = 45; box(x1 - x0 + 4, 0.1, b - a + 4, (x0 + x1) / 2, -0.01, (a + b) / 2, C.lawn); lines(x0, x1, a, b, 0.1, C.white); ring(4, 14, 0.18, 0.06, 0.1, C.white, { glow: true }, 0, (a + b) / 2);        // FIVE-A-SIDE
      for (let i = 0; i < 6; i++) if (i % 2) box(x1 - x0, 0.03, (b - a) / 6, (x0 + x1) / 2, 0.09, a + (i + 0.5) * (b - a) / 6, C.lawnD);
      for (const z of [a, b]) { box(0.14, 2.2, 0.14, 31, 0, z, C.white, { glow: true }); box(0.14, 2.2, 0.14, 37, 0, z, C.white, { glow: true }); box(6.14, 0.14, 0.14, 34, 2.2, z, C.white, { glow: true }); }
      for (const X of [x0 - 2, x1 + 2]) for (const z of [a - 2, (a + b) / 2, b + 2]) flood(X, z); }
    { const a = 246, b = 276; box(22, 0.1, b - a, 33, -0.01, (a + b) / 2, C.paveL);                                                                 // SKATE SPOT
      box(12, 0.2, 5, 33, 1.1, a + 2.2, C.mag, { rx: 0.42 }); box(12, 0.2, 5, 33, 1.1, b - 2.2, C.cyan, { rx: -0.42 }); box(12, 2.2, 0.4, 33, 0, a - 0.2, C.navy2); box(12, 2.2, 0.4, 33, 0, b + 0.2, C.navy2);
      box(5, 0.7, 2.4, 28, 0, (a + b) / 2, C.slab); box(0.12, 0.12, 9, 38, 0.8, (a + b) / 2, C.gold, { glow: true }); box(0.12, 0.8, 0.12, 38, 0, (a + b) / 2 - 4, C.slab); box(0.12, 0.8, 0.12, 38, 0, (a + b) / 2 + 4, C.slab);
      flood(22.5, a); flood(43.5, b); }
    { const a = 1148, b = 1176, m = (a + b) / 2; box(22, 0.1, b - a, 33, -0.01, m, '#b8643c');                                                      // PLAYGROUND
      for (const X of [27, 31]) { box(0.16, 3, 0.16, X, 0, a + 4, C.gold, { glow: true }); } box(4.2, 0.16, 0.16, 29, 3, a + 4, C.gold, { glow: true }); box(0.9, 0.08, 0.4, 28.2, 0.7, a + 4, C.mag); box(0.9, 0.08, 0.4, 29.9, 0.7, a + 4, C.cyan);
      ico(3, 37, 0, m, C.lime, { glow: true }); ico(2.7, 37, 0, m, C.navy3, { detail: 1 }); box(1.2, 0.14, 6, 28, 1.4, b - 6, C.cyan, { rx: 0.4 }); box(1.6, 2.6, 1.6, 28, 0, b - 2.6, C.mag);
      tree(41, a + 3, 2.6, 1); tree(41, b - 3, 2.8, 2); flood(22.5, b); flood(43.5, a); }

    // ---- THE GATES: south (the user's picture above it) and north
    [[30, C.cyan, true], [L - 26, C.mag, false]].forEach(([z, col, pic]) => { for (const s of [-1, 1]) { box(4, 19, 4, s * 15, 0, z, C.navy2); box(4.3, 0.5, 4.3, s * 15, 19, z, col, { glow: true }); box(0.5, 19, 0.5, s * 12.8, 0, z + 2, col, { glow: true }); }
      box(34, 3, 4, 0, 19.5, z, C.navy3); box(34, 0.4, 4.2, 0, 19.1, z, col, { glow: true }); box(34, 0.4, 4.2, 0, 22.5, z, C.white, { glow: true });
      if (pic && typeof NEOCENTRAL_ART !== 'undefined') { const W = 30, H = W * NEOCENTRAL_ART.h / NEOCENTRAL_ART.w; box(W + 1.2, H + 1.2, 0.6, 0, 23.2, z + 0.4, C.navy3); bands[bOf(z)].pic.push([[-W / 2, 23.8, -(z - 0.02)], [W / 2, 23.8, -(z - 0.02)], [W / 2, 23.8 + H, -(z - 0.02)], [-W / 2, 23.8 + H, -(z - 0.02)]]); } });

    // ---- THE CENTRE NEVRALGIQUE: the round plaza, the E-W avenue and the diagonals, the ring basin, lawns, the tower astride the road and its halo
    for (const s of [-1, 1]) { box(193, 0.1, 14, s * 102.5, -0.02, ZC, C.asph); box(193, 0.06, 0.2, s * 102.5, 0.08, ZC, C.cyan, { glow: true }); for (const e of [-7, 7]) box(193, 0.06, 0.2, s * 102.5, 0.08, ZC + e, C.mag, { glow: true }); }
    for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) { const R = 112, ph = Math.atan2(sx, sz); rbox(150, 0.1, 8, sx * R * Math.SQRT1_2, -0.03, ZC + sz * R * Math.SQRT1_2, C.paveL, Math.PI / 2 - ph); rbox(150, 0.05, 0.25, sx * R * Math.SQRT1_2, 0.07, ZC + sz * R * Math.SQRT1_2, C.gold, Math.PI / 2 - ph, { glow: true }); }
    ring(175, 60, 0.5, 0.1, 0.02, C.cyan, { glow: true }, 6); ring(120, 44, 0.4, 0.1, 0.02, C.mag, { glow: true }, 6); ring(58, 28, 0.4, 0.1, 0.02, C.white, { glow: true }, 6);
    ring(84, 36, 9, 0.1, -0.02, C.water, null, 7); ring(89, 36, 0.5, 0.5, 0, C.slab, null, 7); ring(79, 36, 0.5, 0.5, 0, C.slab, null, 7); ring(89, 36, 0.2, 0.08, 0.5, C.cyan, { glow: true }, 7);      // the ring basin
    for (let i = 0; i < 16; i++) { const a = (i + 0.5) / 16 * Math.PI * 2, X = 42 * Math.sin(a), Z = ZC + 42 * Math.cos(a); if (Math.abs(X) < 14) continue; rbox(13, 0.1, 18, X, -0.04, Z, C.lawn, -a); tree(X, Z, 3 + rr(i) * 1.2, i); }
    for (let i = 0; i < 24; i++) { const a = (i + 0.5) / 24 * Math.PI * 2, X = 104 * Math.sin(a), Z = ZC + 104 * Math.cos(a); if (Math.abs(X) < 16 || Math.abs(Z - ZC) < 12) continue; rbox(16, 0.1, 12, X, -0.04, Z, C.lawnD, -a); tree(X, Z, 3.4 + rr(i + 30) * 1.4, i + 1); }
    for (let i = 0; i < 12; i++) { const a = (i + 0.5) / 12 * Math.PI * 2, X = 150 * Math.sin(a), Z = ZC + 150 * Math.cos(a); cyl(1.6, 2.6, 44, X, 0, Z, C.navy2, { seg: 8 }); ico(3, X, 46, Z, i % 2 ? C.cyan : C.mag, { glow: true }); }
    ring(150, 48, 1.2, 0.8, 43, C.slab); ring(150, 48, 0.4, 0.3, 42.6, C.cyan, { glow: true });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) { box(9, 44, 9, sx * 17, 0, ZC + sz * 17, C.navy2); box(0.8, 44, 0.8, sx * 12.2, 0, ZC + sz * 12.2, C.cyan, { glow: true }); }
    box(46, 8, 46, 0, 42, ZC, C.navy3); box(46.6, 1, 46.6, 0, 41.4, ZC, C.cyan, { glow: true }); ico(7, 0, 31, ZC, C.cyan, { glow: true, detail: 1 }); ico(8.4, 0, 31, ZC, C.white, { glow: true }); cyl(0.5, 0.5, 6, 0, 37, ZC, C.slab);
    { let w = 36, y = 50; [56, 48, 38, 28].forEach((h, i) => { box(w, h, w, 0, y, ZC, [C.navy, C.navy2][i % 2]); for (let j = 1; j < 4; j++) box(w + 0.3, 0.9, w + 0.3, 0, y + h * j / 4, ZC, C.slab); y += h; box(w + 1, 1.6, w + 1, 0, y - 1.6, ZC, [C.cyan, C.mag, C.cyan, C.gold][i], { glow: true }); w -= 7; });
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(1, 100, 1, sx * 18.2, 50, ZC + sz * 18.2, C.white, { glow: true }); cyl(0.5, 1.6, 40, 0, y, ZC, C.slab); ico(2.6, 0, y + 41, ZC, C.mag, { glow: true }); }
    ring(52, 32, 2.4, 1.2, 74, C.slab); ring(52, 32, 0.6, 0.5, 73.4, C.cyan, { glow: true }); ring(54.6, 32, 0.4, 0.4, 74.4, C.mag, { glow: true });
    for (let i = 0; i < 8; i++) { const a = (i + 0.5) / 8 * Math.PI * 2; rbox(0.6, 0.6, 34, 35 * Math.sin(a), 74.3, ZC + 35 * Math.cos(a), C.slab, a); }
  };

  const built = {};
  const band = b => () => { if (!bands) gen(); if (built[b]) return built[b]; const B = bands[b], a = anchorZ(b), mv = q => NeonAvenue.plain(...q.map(p => [p[0], p[1], p[2] + a]));
    for (const p of B.parts) p.geo.translate(0, 0, a);
    const merged = Kit.merge(B.parts.length ? B.parts : [Kit.box(0.05, 0.05, 0.05, 0, -60, 0, C.navy)]);
    if (!B.glass.length && !B.pic.length) return (built[b] = merged);
    const o = { merged, sprite: NeonAvenue.merge(B.glass.length ? B.glass.map(mv) : [NeonAvenue.plain([0, -60, 0], [0.01, -60, 0], [0.01, -60.01, 0], [0, -60.01, 0])]), material: () => NeonAvenue.glassMaterial() };
    if (B.pic.length) o.extra = [{ sprite: NeonAvenue.merge(B.pic.map(mv)), material: () => NEOCENTRAL_ART.material() }];
    return (built[b] = o); };
  const props = {};
  for (let b = 0; b < NB; b++) props['dsB' + b] = band(b);
  props.dsBase = () => Kit.merge([Kit.box(195, 0.1, 12.05, -102.4, -0.12, 0, C.pave), Kit.box(195, 0.1, 12.05, 102.4, -0.12, 0, C.pave), Kit.box(0.14, 0.05, 12.05, -5.2, -0.02, 0, C.cyan, { glow: true }), Kit.box(0.14, 0.05, 12.05, 5.2, -0.02, 0, C.cyan, { glow: true }),
    Kit.box(1.2, 0.03, 12.05, -30, -0.03, 0, C.paveL), Kit.box(1.2, 0.03, 12.05, 22, -0.03, 0, C.paveL)]);
  NeoDistrict.props = props;
  // slot k of the district (0 .. DN - 1): its ground, the band that ends there, and for the first two slots the circuit's own tunnel back, which stands where it stood (to the right)
  NeoDistrict.layout = k => { const o = [{ prop: 'dsBase', x: 0.001, dist: 6, solo: true }];
    for (let b = 0; b < NB; b++) if (anchorSlot(b) === k) o.push({ prop: 'dsB' + b, x: 0.001, dist: 6, solo: true });
    if (k < NC.EXIT) { o.push({ prop: 'neonTunnel' + (k % 6), x: -NC.G3BX, dist: 6, solo: true }); if (k === 0) o.push({ prop: 'neonTunnelMouth', x: -NC.G3BX, dist: 6, solo: true }); }
    return o; };
  if (ENV3D.neon) Object.assign(ENV3D.neon.props, props);
})();
