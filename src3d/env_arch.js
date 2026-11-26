// THE ARCH TUNNEL (the user, 2026-11-26: a picture and its blueprint, "BLUEPRINT - TUNNEL SOUTERRAIN, Style: Arches Lumineuses", 180 m, 18 m wide, 8 m high, 3 lanes of 3.5 m and two 1.5 m pavements; built "exactly under
// the red line" of the map, i.e. under the first LEFT round quarter (the round tower, centre X -232 m, Z 350 m of the district), along its axis from Z 260 to Z 440 m): a half-ellipse vault of dark metal
// ribs with cyan and magenta light slats between them, a double neon arch (cyan outside, magenta inside) at every slot, purple pavements along the kerbs, a dark cracked floor with cyan seams.
// Its entrance and its exit are still to be chosen by the user: for now it is the segment `archTunnel` (src/track.js), seen with ?zone=arch.
window.ENV3D = window.ENV3D || {};
(function () {
  if (!ENV3D.neon) return;
  const LL = 12.2, A = 9, B = 8, CY = '#35e6ff', MG = '#ff3df0', DK = '#0c0a1c', DK2 = '#1a1438', PUR = '#8a4bd0', FL = '#1a1036', mod = (a, n) => ((a % n) + n) % n;
  const hr = (a, b) => { const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return x - Math.floor(x); };
  const ell = (t, a, b) => [a * Math.cos(t), b * Math.sin(t)];
  const arch = (k, end) => () => { const p = [], n = 28;
    for (let q = 0; q < n; q++) { const t0 = Math.PI * q / n, t1 = Math.PI * (q + 1) / n, [x0, y0] = ell(t0, A + 0.3, B + 0.3), [x1, y1] = ell(t1, A + 0.3, B + 0.3), xm = (x0 + x1) / 2, ym = (y0 + y1) / 2, len = Math.hypot(x1 - x0, y1 - y0) * 1.04, ang = Math.atan2(y1 - y0, x1 - x0);
      p.push(Kit.box(len, 0.4, LL, xm, ym, 0, q % 2 ? DK : DK2, { rz: ang }));                                             // the vault's ribs: a dark shell
      if (q % 2 === 0) { const [xa, ya] = ell((t0 + t1) / 2, A - 0.2, B - 0.2); p.push(Kit.box(len * 0.62, 0.1, LL * 0.9, xa, ya, 0, q % 6 === 0 ? '#d030d8' : '#1ec8e8', { glow: true, rz: ang })); } }   // (the light slats between them)
    const z0 = -LL / 2 + 0.15;                                                                                                  // the double neon arch at the slot's far end
    for (const [aa, bb, col] of [[A - 0.05, B - 0.05, CY], [A - 0.55, B - 0.55, MG]]) for (let q = 0; q < 44; q++) { const t0 = Math.PI * q / 44, t1 = Math.PI * (q + 1) / 44, [x0, y0] = ell(t0, aa, bb), [x1, y1] = ell(t1, aa, bb); p.push(Kit.box(Math.hypot(x1 - x0, y1 - y0) * 1.05, end ? 0.32 : 0.2, end ? 0.4 : 0.26, (x0 + x1) / 2, (y0 + y1) / 2, z0, col, { glow: true, rz: Math.atan2(y1 - y0, x1 - x0) })); }
    p.push(Kit.box(2 * A + 0.8, 0.1, LL, 0, -0.12, 0, FL));                                                                      // the floor (top at -2 cm, the road's own surface is above it)
    for (let q = 0; q < 6; q++) { const x = (hr(k, q) - 0.5) * 15, z = (hr(k, q + 9) - 0.5) * 10, ry = (hr(k, q + 20) - 0.5) * 2.2; p.push(Kit.box(0.07, 0.02, 2.2 + hr(k, q + 30) * 2.5, x, -0.015, z, CY, { glow: true, ry })); }   // the cracks, lit
    for (const s of [-1, 1]) { p.push(Kit.box(1.5, 0.35, LL, s * 6.0, 0, 0, PUR), Kit.box(0.12, 0.05, LL, s * 5.28, 0.35, 0, MG, { glow: true }), Kit.box(0.14, 0.06, LL, s * (A - 0.4), 0.15, 0, CY, { glow: true })); }   // the pavements and the wall's foot light
    return Kit.merge(p); };
  const props = {}; for (let k = 0; k < 3; k++) { props['ucArch' + k] = arch(k, false); props['ucArchEnd' + k] = arch(k, true); }
  const road = Object.assign({}, ENV3D.neon.road, { mark: '#ffffff', edge: '#35e6ff', asphalt: ['#1b1236', '#150e2c'] });
  ENV3D.archTunnel = Object.assign({}, ENV3D.neon, {
    name: 'TUNNEL SOUTERRAIN', entrance: null, props: Object.assign({}, ENV3D.neon.props, props), road,
    sky: { top: '#0a0420', mid: '#1a0838', horizon: '#3a1060' }, fog: { color: '#12062a', near: 30, far: 170 }, hemi: { sky: '#c080ff', ground: '#301060', intensity: 1.8 },
    sun: { color: '#9fe8ff', intensity: 1.1, position: [0, 9, 4] }, groundFar: '#0e0620',
    layout(i) { const g = typeof window !== 'undefined' && window.__wf, w = g && g.world, P = w && w.pieceAt(i * 120 + 60), end = !!(P && P.z1 - (i * 120 + 120) < 1); return [{ prop: (end ? 'ucArchEnd' : 'ucArch') + mod(i, 3), x: 0, dist: 6, solo: true, dy: -0.15 }]; },
  });
})();
