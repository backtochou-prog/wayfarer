// THE NEON AVENUE (the user, 2026-11-16: the continuation of ART CITY, the picture of a canyon of circuit-board skyscrapers at sunset; "the circuit follows the light highway up there").
// Reached by THE GLASS RAMP at the end of ART CITY (NEON_CORNER.UP: left lane): the road climbs, transparent neon glass on both sides, over the bridge across the tunnel under the spiral,
// and runs HIGH UP (NEON_CORNER.H, 14 m) between the towers of the picture (their facades as they are: white, teal, magenta, violet, green, purple, orange, red), over the poster avenue
// down below, a second highway of light beside it, toward an orange sun in a magenta sky; then it comes down to the tunnel back to the neon street.
//   ENV3D.canyon: the look (sky, fog, light, the road's colours) the renderer blends in on that stretch; NeonAvenue.layout(q, rnd, liftM) dresses its slot q (props added to the neon
//   quarter's; liftM = the road's height there in metres, so what stands on the ground is placed liftM under the road).
window.ENV3D = window.ENV3D || {};

const NeonAvenue = {
  _mat: null, _glass: null, _ramp: null,
  material() {
    if (!this._mat) { const img = new Image(), tex = new THREE.Texture(img); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8; tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter;
      const mat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }); mat.visible = false; img.onload = () => { tex.needsUpdate = true; mat.visible = true; }; img.src = CANYON_ASSETS.src; this._mat = mat; }
    return this._mat;
  },
  // the glass of the ramp and of the high road's sides: transparent cyan, lit from inside
  glassMaterial() { if (!this._glass) this._glass = new THREE.MeshBasicMaterial({ color: '#7fe8ff', transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false }); return this._glass; },
  // the race zone's ramp picture (RACE_ASSETS.ramp: glossy black, a wavy base edged with pink light, green chevrons): the sides of the bridge over the tunnel
  rampMaterial() {
    if (!this._ramp) { const img = new Image(), tex = new THREE.Texture(img); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
      const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.2, side: THREE.DoubleSide }); mat.visible = false; img.onload = () => { tex.needsUpdate = true; mat.visible = true; }; img.src = RACE_ASSETS.ramp; this._ramp = mat; }
    return this._ramp;
  },
  quad(set, cell, A, B, C, D, uRep = 1, vRep = 1) {
    const c = set[cell], g = new THREE.BufferGeometry(), du = c.u1 - c.u0, dv = c.v1 - c.v0;
    g.setAttribute('position', new THREE.Float32BufferAttribute([...A, ...B, ...C, ...D], 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute([c.u0, c.v0, c.u0 + du * uRep, c.v0, c.u0 + du * uRep, c.v0 + dv * vRep, c.u0, c.v0 + dv * vRep], 2));
    g.setIndex([0, 1, 2, 0, 2, 3]); return g;
  },
  plain(A, B, C, D) { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([...A, ...B, ...C, ...D], 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2)); g.setIndex([0, 1, 2, 0, 2, 3]); return g; },
  merge(list) { return ArtCity.merge(list); },
};

(function () {
  const C = { pink: '#ff5ad8', cyan: '#7fe8ff', white: '#f2fbff', pillar: '#1c1f3a', violet: '#8a5cff', orange: '#ffb050', dark: '#120c22' };
  const mod = (a, n) => ((a % n) + n) % n;
  const tex = (merged, sprites, mat) => ({ merged: Kit.merge(merged.length ? merged : [Kit.box(0.05, 0.05, 0.05, 0, -60, 0, C.dark)]), sprite: NeonAvenue.merge(sprites), material: mat });

  // a tower of the picture standing on the ground: its facade toward the road (local x = 0, the body toward +X), as tall as the picture makes it at width F; `down` (m) = how far the ground
  // is under the road where it stands (the layout passes it as the prop's dy, so the tower's foot is on the ground)
  const tower = (cell, F, rim) => () => {
    const c = CANYON_ASSETS[cell], H = F / c.ar, D = F * 0.9;
    const parts = [Kit.box(D, H, F, D / 2 + 0.03, 0, 0, C.dark), Kit.box(0.14, H, 0.14, -0.04, 0, -F / 2, rim, { glow: true }), Kit.box(0.14, H, 0.14, -0.04, 0, F / 2, rim, { glow: true }), Kit.box(D, 0.2, F, D / 2, H, 0, rim, { glow: true })];
    return tex(parts, [NeonAvenue.quad(CANYON_ASSETS, cell, [-0.02, 0, F / 2], [-0.02, 0, -F / 2], [-0.02, H, -F / 2], [-0.02, H, F / 2]), NeonAvenue.quad(CANYON_ASSETS, cell, [0, 0, F / 2 + 0.02], [D, 0, F / 2 + 0.02], [D, H, F / 2 + 0.02], [0, H, F / 2 + 0.02])], () => NeonAvenue.material());
  };

  // the colours of the quarter of 2455, a tree (trunk and a crown of three balls), and a slot of its park
  const F = { cyan: '#7fe8ff', pink: '#ff5ad8', violet: '#8a5cff', lime: '#9dff7a', leaf: '#3fae5a', leafD: '#2c8448', leafL: '#6fd070' };
  const tree = (x, y, z, r) => [Kit.cyl(r * 0.1, r * 0.16, r * 1.3, x, y, z, '#6a4a36'), Kit.ico(r * 0.62, x, y + r * 1.75, z, F.leaf), Kit.ico(r * 0.46, x + r * 0.42, y + r * 1.45, z + r * 0.25, F.leafD), Kit.ico(r * 0.42, x - r * 0.4, y + r * 1.5, z - r * 0.3, F.leafL)];
  const street = m => { const L = 12.25, PX = m ? 4.3 : 3.2, P = [Kit.box(7.4, 0.5, L, 0, 9, 0, '#232a4a'), Kit.box(0.14, 0.05, L * 0.5, 0, 9.5, 0, F.lime, { glow: true })];
      if (!m) P.push(Kit.box(7, 0.12, L, 0, 0, 0, '#17152a'), Kit.box(0.12, 0.05, L * 0.5, 0, 0.12, 0, F.cyan, { glow: true })); else P.push(Kit.box(9.2, 0.4, 0.6, 0, 8.6, 0, '#2a3156'));
      for (const s of [-1, 1]) { P.push(Kit.box(0.14, 0.14, L, s * 3.7, 9.5, 0, s < 0 ? F.cyan : F.pink, { glow: true }), Kit.box(0.08, 0.9, L, s * 3.7, 9.6, 0, '#2f3a66'));
        if (!((m === 2 && s > 0) || (m === 3 && s < 0))) P.push(Kit.box(0.6, 9, 0.6, s * PX, 0, 0, '#2a3156'));
        if (!m) P.push(Kit.box(0.14, 0.14, L, s * 3.5, 0.12, 0, F.violet, { glow: true })); }
      P.push(Kit.box(1.5, 0.9, 3, -1.7, 9.7, 3, '#e8eef6'), Kit.box(1.52, 0.35, 2, -1.7, 10.3, 3, '#1c2a44'), Kit.box(1.2, 0.12, 0.1, -1.7, 9.95, 1.48, '#fff2c0', { glow: true }));
      if (!m) P.push(Kit.box(1.5, 0.9, 3, 1.7, 0.3, -2, '#ffb050'), Kit.box(1.52, 0.35, 2, 1.7, 0.9, -2, '#1c2a44'), Kit.box(1.2, 0.12, 0.1, 1.7, 0.55, -3.52, '#ff5a6a', { glow: true }));
      P.push(Kit.box(0.9, 1.0, L, 0, 22, 0, '#c9d2e0'), Kit.box(0.3, 0.12, L, 0, 21.9, 0, F.cyan, { glow: true }));
      if (m !== 2) P.push(Kit.box(0.7, 23.4, 0.7, 5.2, 0, 0, '#aab4c8'), Kit.box(5.6, 0.6, 0.7, 2.6, 22.9, 0, '#aab4c8'), Kit.box(0.3, 0.3, 0.3, 5.2, 23.5, 0, F.pink, { glow: true }));
      return Kit.merge(P); };
  const park = (v, road) => { const L = 12.25, G = v ? '#2f9450' : '#34a058', P = road ? [Kit.box(8, 0.3, L, -16, 0, 0, G), Kit.box(24, 0.3, L, 8, 0, 0, G), Kit.box(0.14, 0.1, L, -12.07, 0.3, 0, F.lime, { glow: true }), Kit.box(0.14, 0.1, L, -3.93, 0.3, 0, F.lime, { glow: true })] : [Kit.box(40, 0.3, L, 0, 0, 0, G), Kit.box(3, 0.06, L, v ? -6 : -8, 0.3, 0, '#d9c9a0')];      // (road: the side road's corridor through the lawn, 8 m wide at x -8, NEON_CORNER.SPARK_M)
    P.push(Kit.box(0.14, 0.1, L, -20, 0.3, 0, F.lime, { glow: true }), Kit.box(0.14, 0.1, L, 20, 0.3, 0, F.lime, { glow: true }));
    const T = v ? [[-14, 3, 9], [-1, -3, 13], [9, 2, 10], [16, -4, 8]] : [[-15, -3, 8], [-2, 3, 12], [6, -2, 9], [15, 3, 11]];
    for (const [x, z, r] of T) P.push(...tree(x, 0.3, z, r));
    if (v) P.push(Kit.cyl(4.5, 4.5, 0.12, 3, 0.3, 4, '#3aa0c8', { seg: 10 }), Kit.cyl(0.25, 0.25, 0.12, 3, 0.4, 4, '#e8fbff', { glow: true, seg: 6 }));
    else P.push(Kit.box(5, 0.5, 2, 10, 0.3, 4.5, '#ff7ab8'), Kit.box(5, 0.5, 2, road ? -16.6 : -10, 0.3, 4.5, '#ffd24a'), Kit.box(4, 0.5, 2, 1, 0.3, -5, '#c084ff'));
    if (!road) P.push(Kit.box(1.8, 0.45, 0.5, v ? -4 : -6, 0.3, 2, '#e8eef6'), Kit.cyl(0.06, 0.08, 3.2, v ? -8 : -10, 0.3, -3, '#c9d2e0'), Kit.ico(0.3, v ? -8 : -10, 3.7, -3, '#fff2c0', { glow: true }));
    else P.push(Kit.cyl(0.06, 0.08, 3.2, -12.6, 0.3, -3, '#c9d2e0'), Kit.ico(0.3, -12.6, 3.7, -3, '#fff2c0', { glow: true }), Kit.cyl(0.06, 0.08, 3.2, -3.4, 0.3, 3.4, '#c9d2e0'), Kit.ico(0.3, -3.4, 3.7, 3.4, '#fff2c0', { glow: true }));
    return Kit.merge(P); };

  const props = {
    // THE HIGH ROAD's sides, one slot: a glass skirt hanging under each edge (transparent cyan), a pink light along each edge and a cyan one under it
    cnGlass: () => glassSides(3.45), cnGlassN: () => glassSides(1.75),      // (N: the one-lane glass ramps, up and down)
  };
  // the sides of the one-lane ramps follow their slope: slot k of n of a ramp going up (dir 1) or down (-1); the prop is placed at the height of the slot's middle, so each point is raised by
  // the climb from there (the ramp's own curve, NEON_CORNER.lift: an S of HM metres over n slots)
  function rampSides(k, n, dir) { const L = 12.25, X = 1.75, m = 8, ee = t => t * t * (3 - 2 * t), Hh = typeof NEON_CORNER !== 'undefined' ? NEON_CORNER.H / 10 : 14;
    const hy = f => { const t = (k + f) / n, t0 = (k + 0.5) / n; return dir > 0 ? Hh * (ee(t) - ee(t0)) : Hh * (ee(t0) - ee(t)); };
    const parts = [], sk = [];
    for (let a = 0; a < m; a++) { const f0 = a / m, f1 = (a + 1) / m, z0 = L / 2 - f0 * L, z1 = L / 2 - f1 * L, y0 = hy(f0), y1 = hy(f1), len = Math.hypot(z1 - z0, y1 - y0), rx = Math.atan2(y1 - y0, z0 - z1);
      for (const s of [-1, 1]) { parts.push(Kit.box(0.12, 0.12, len, s * (X + 0.1), (y0 + y1) / 2 - 0.02, (z0 + z1) / 2, C.pink, { glow: true, rx }), Kit.box(0.2, 0.6, len, s * (X + 0.2), (y0 + y1) / 2 - 0.3, (z0 + z1) / 2, '#2a2f6a', { rx }));
        sk.push(NeonAvenue.plain([s * X, y0, z0], [s * X, y1, z1], [s * X, y1 - 2.5, z1], [s * X, y0 - 2.5, z0])); }
      sk.push(NeonAvenue.plain([-X, y0 - 0.02, z0], [X, y0 - 0.02, z0], [X, y1 - 0.02, z1], [-X, y1 - 0.02, z1]));                                                    // THE GLASS DECK (the user: the runner rides on the transparent ramp)
      if (a % 2 === 0) parts.push(Kit.box(0.1, 0.03, len * 0.6, 0, (y0 + y1) / 2, (z0 + z1) / 2, C.cyan, { glow: true, rx }));                                       // a dashed line of light down the middle
      parts.push(Kit.box(2 * X, 0.04, 0.06, 0, y0 - 0.01, z0, '#9ff4ff', { glow: true })); }                                                                          // the glass panes' joints
    return tex(parts, sk, () => NeonAvenue.glassMaterial()); }
  { const UN = typeof NEON_CORNER !== 'undefined' ? NEON_CORNER.UP : 6, DN = typeof NEON_CORNER !== 'undefined' ? NEON_CORNER.DOWN : 6;
    for (let k = 0; k < UN; k++) props['cnGlassU' + k] = () => rampSides(k, UN, 1);
    for (let k = 0; k < DN; k++) props['cnGlassD' + k] = () => rampSides(k, DN, -1); }
  function glassSides(X) { const L = 12.25, parts = [];
      for (const s of [-1, 1]) parts.push(Kit.box(0.12, 0.12, L, s * (X + 0.1), 0.05, 0, C.pink, { glow: true }), Kit.box(0.1, 0.1, L, s * (X + 0.05), -2.4, 0, C.cyan, { glow: true }), Kit.box(0.2, 0.7, L, s * (X + 0.2), 0.05, 0, '#2a2f6a'));
      const sk = [-1, 1].map(s => NeonAvenue.plain([s * X, 0, L / 2], [s * X, 0, -L / 2], [s * X, -2.5, -L / 2], [s * X, -2.5, L / 2]));
      sk.push(NeonAvenue.plain([-X, -0.02, L / 2], [X, -0.02, L / 2], [X, -0.02, -L / 2], [-X, -0.02, -L / 2]));                                                       // THE GLASS DECK of the high road too (the user: like the first ramp)
      for (const z of [-L / 4, L / 4]) parts.push(Kit.box(2 * X, 0.04, 0.06, 0, -0.01, z, '#9ff4ff', { glow: true }));                                                  // the panes' joints
      for (const lx of [-X / 3, X / 3]) for (const z of [-3, 3]) parts.push(Kit.box(0.1, 0.03, 2.4, lx, 0, z, C.cyan, { glow: true }));                                  // dashed lines of light between the lanes
      return tex(parts, sk, () => NeonAvenue.glassMaterial()); }
  Object.assign(props, {
    // its FOUNDATIONS: two dark pillars down to the ground (40 m: the ground hides the rest), neon rings round them
    cnPillar: () => Kit.merge([Kit.box(1.2, 40, 1.2, -2.2, -40, 0, C.pillar), Kit.box(1.2, 40, 1.2, 2.2, -40, 0, C.pillar), Kit.box(5.6, 1.2, 1.6, 0, -3.6, 0, C.pillar),
      Kit.box(1.3, 0.12, 1.3, -2.2, -8, 0, C.pink, { glow: true }), Kit.box(1.3, 0.12, 1.3, 2.2, -8, 0, C.pink, { glow: true }), Kit.box(1.3, 0.12, 1.3, -2.2, -14, 0, C.cyan, { glow: true }), Kit.box(1.3, 0.12, 1.3, 2.2, -14, 0, C.cyan, { glow: true })]),
    // the towers of the picture
    cnWhite: tower('white', 6, C.white), cnTeal: tower('teal', 5, C.cyan), cnMagenta: tower('magenta', 6, C.pink), cnViolet: tower('violet', 5, C.violet),
    cnGreen: tower('green', 6, '#39ff14'), cnPurple: tower('purple', 7, C.violet), cnOrange: tower('orange', 5, C.orange), cnRed: tower('redleft', 6, C.pink),
    // the poster avenue down below (on the ground, beside the high road), one slot
    cnPosters: () => tex([], [NeonAvenue.quad(CANYON_ASSETS, 'posters', [4, 0.02, 6.15], [4, 0.02, -6.15], [16, 0.02, -6.15], [16, 0.02, 6.15])], () => NeonAvenue.material()),
    // the second highway of light, lower down on the other side: streaks of light along it
    cnTrail: () => { const p = []; for (let k = 0; k < 5; k++) p.push(Kit.box(0.08 + 0.04 * (k % 2), 0.08, 12.4, k * 0.5, k % 3 * 0.25, 0, [C.cyan, C.white, C.pink, C.cyan, C.violet][k], { glow: true }));
      p.push(Kit.box(3.2, 0.3, 12.3, 1.0, -0.4, 0, '#1a1d40')); return Kit.merge(p); },
      // the floor under the high road: 3 m tiles, glossy black (two near blacks in a checker, a faint lighter grout, a sheen line on every other one), 60 m wide; FLOOR_TINTS: the 200 m tints
    ...Object.fromEntries([['#0b0b10', '#121219'], ['#0a0f1c', '#101829'], ['#140a18', '#1d1024'], ['#0a1411', '#0f1d18'], ['#0b0b10', '#131320']].map(([a, b], n) => ['cnFloor' + n, () => {
      const P = [], W = 60, L = 12.2, T = 3.05; for (let x = -W / 2; x < W / 2; x += T) for (let z = -L / 2; z < L / 2 - 0.01; z += T * 1.02) { const odd = (Math.round(x / T) + Math.round(z / T)) & 1;
        P.push(Kit.box(T - 0.06, 0.04, Math.min(T, L / 2 - z) - 0.06, x + T / 2, 0, z + Math.min(T, L / 2 - z) / 2, odd ? a : b)); if (!odd) P.push(Kit.box(T * 0.7, 0.002, 0.05, x + T / 2, 0.042, z + 0.4, '#3a3a52')); }
      P.push(Kit.box(W, 0.02, L, 0, -0.02, 0, '#2a2a3a')); return Kit.merge(P); }])),
    // a big concrete planter: a low wide box of grey concrete, filled with greens and flowers
    cnPlanter: () => { const P = [Kit.box(3.6, 0.9, 3.6, 0, 0, 0, '#8a8a90'), Kit.box(3.8, 0.12, 3.8, 0, 0.9, 0, '#a0a0a8'), Kit.box(3.3, 0.1, 3.3, 0, 0.88, 0, '#3a2a1c')], cols = ['#ff4fa0', '#ffd23a', '#ffffff', '#b06bff', '#ff7a3a'];
      for (let k = 0; k < 9; k++) { const x = -1.1 + (k % 3) * 1.1, z = -1.1 + Math.floor(k / 3) * 1.1; P.push(Kit.ico(0.45 + (k % 2) * 0.12, x, 1.25, z, k % 2 ? '#2f8a3a' : '#3fa548')); }
      for (let k = 0; k < 14; k++) { const a = k * 2.4, r = 0.4 + (k % 4) * 0.35; P.push(Kit.ico(0.12, Math.cos(a) * r, 1.6 + (k % 3) * 0.1, Math.sin(a) * r, cols[k % cols.length])); }
      P.push(Kit.cyl(0.08, 0.1, 1.6, 0, 0.9, 0, '#5a3a22'), Kit.ico(0.7, 0, 2.7, 0, '#2a7a34')); return Kit.merge(P); },
    // a terrace: a little kiosk (counter, dark roof with a neon rim) and four round tables with their chairs, on the tiles
    cnTerrace: () => { const P = [Kit.box(2.6, 2.3, 2.0, 0, 0, -3.5, '#1d1a2a'), Kit.box(2.6, 0.12, 2.1, 0, 1.0, -2.45, '#d8d0c0'), Kit.box(3.2, 0.2, 2.8, 0, 2.3, -3.5, '#121018'), Kit.box(3.25, 0.08, 2.85, 0, 2.5, -3.5, C.pink, { glow: true }), Kit.box(2.0, 0.8, 0.05, 0, 1.3, -2.48, '#ffd27a', { glow: true })];
      for (const [x, z] of [[-1.6, 0.4], [1.6, 0.4], [-1.6, 3.4], [1.6, 3.4]]) { P.push(Kit.cyl(0.45, 0.45, 0.05, x, 0.72, z, '#e8e4dc', { seg: 12 }), Kit.cyl(0.05, 0.05, 0.72, x, 0, z, '#3a3a44'));
        for (const [dx, dz] of [[-0.75, 0], [0.75, 0], [0, 0.75], [0, -0.75]]) P.push(Kit.box(0.4, 0.06, 0.4, x + dx, 0.45, z + dz, '#c8553d'), Kit.box(0.04, 0.45, 0.04, x + dx, 0, z + dz, '#3a3a44'), Kit.box(dx ? 0.05 : 0.4, 0.4, dz ? 0.05 : 0.4, x + dx * 1.25, 0.5, z + dz * 1.25, '#c8553d')); }
      return Kit.merge(P); },
    // the monorail's rail: a concrete beam 12 m over the ground on a pillar, a steel guide on top
    cnRailSpan: () => Kit.merge([Kit.box(1.4, 1.1, 12.25, 0, 11, 0, '#b8a890'), Kit.box(0.5, 0.25, 12.25, 0, 12.1, 0, '#8a8f99'), Kit.box(1.45, 0.08, 12.25, 0, 10.98, 0, '#ffd27a', { glow: true })]),      // (no pillar: the side road passes under)
    cnRail: () => Kit.merge([Kit.box(1.4, 1.1, 12.25, 0, 11, 0, '#b8a890'), Kit.box(0.5, 0.25, 12.25, 0, 12.1, 0, '#8a8f99'), Kit.box(1.1, 11, 1.1, 0, 0, 0, '#a89880'), Kit.box(2.2, 0.6, 1.6, 0, 10.4, 0, '#a89880'), Kit.box(1.45, 0.08, 12.25, 0, 10.98, 0, '#ffd27a', { glow: true })]),
    // (the user: the first rail is stretched BACK over the bridge and the glass ramp, and fades away among ART CITY's buildings: cnRailF0..9, more and more solid towards the ramp)
    ...Object.fromEntries(Array.from({ length: 10 }, (_, j) => ['cnRailF' + j, () => ({ merged: Kit.merge([Kit.box(0.05, 0.05, 0.05, 0, -60, 0, '#a89880')]), sprite: Kit.merge([Kit.box(1.4, 1.1, 12.25, 0, 11, 0, '#b8a890'), Kit.box(0.5, 0.25, 12.25, 0, 12.1, 0, '#8a8f99'), Kit.box(1.1, 11, 1.1, 0, 0, 0, '#a89880'), Kit.box(2.2, 0.6, 1.6, 0, 10.4, 0, '#a89880'), Kit.box(1.45, 0.08, 12.25, 0, 10.98, 0, '#ffd27a')]).lit,
      material: () => (NeonAvenue._railF = NeonAvenue._railF || [])[j] || (NeonAvenue._railF[j] = new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: (j + 1) / 11, depthWrite: j > 5 })) })])),
    // a white monorail train of three cars on its rail (as in the picture: rounded white cars, a dark band of windows, a lit nose)
    cnTrain: () => { const P = []; for (let c = 0; c < 3; c++) { const z = -9 + c * 9.2; P.push(Kit.box(2.6, 2.6, 8.8, 0, 12.35, z, '#f2efe8'), Kit.box(2.66, 0.9, 8.0, 0, 13.4, z, '#2a3240'), Kit.box(2.2, 0.3, 8.6, 0, 15.0, z, '#e2ded6')); }
      P.push(Kit.cone(1.3, 2.2, 0, 13.6, -14.4, '#f2efe8', { rx: -Math.PI / 2, seg: 10 }), Kit.box(1.6, 0.4, 0.2, 0, 13.0, -15.2, '#e8fbff', { glow: true })); return Kit.merge(P); },
    // the picture itself, standing on the ground, 115 m tall (its towers at their scale), its bottom a little under the ground
    cnMetroView: () => { const H = 115, W = H * METRO_ART.w / METRO_ART.h, g = new THREE.PlaneGeometry(W, H); g.translate(0, H / 2 - 4, 0); g.computeBoundingSphere(); g.computeBoundingBox();
      if (!NeonAvenue._metroMat) { const tex = new THREE.Texture(METRO_ART.img); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8; const m = new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide, fog: false });
        const up = () => { tex.needsUpdate = true; m.visible = true; }; if (METRO_ART.img.complete && METRO_ART.img.naturalWidth) up(); else { m.visible = false; METRO_ART.img.addEventListener('load', up); } NeonAvenue._metroMat = m; }
      return { merged: Kit.merge([Kit.box(W, 0.5, 2, 0, -0.3, 0, '#0c0b12')]), sprite: g, material: () => NeonAvenue._metroMat }; },
    // ---- THE GREAT QUARTER OF 2455 (the user), all along the monorail rail on the right of the glass avenue: a street on two floors with a hanging train line over it (the rail on the
    // train's back), towers of the future behind it, 2 of every 3 with vertical gardens (67 %), and a park in the middle of the avenue, the breathing point. All local: metres, the ground at y 0.
    // the two-floor street, one slot (its centre at x 0, 7.4 m wide): the ground lane, the upper deck 9 m up on pillars, light along its edges, a few pods; over it the hanging line's beam, 22 m
    // up on a pylon with an arm
    ftStreet: () => street(0),
    sdStreet: () => street(1), sdStreetO: () => street(2), sdStreetL: () => street(3),      // (the side road runs under the deck: no floor, no pod, the pillars apart; O: open to the right, L: to the left)
    // the hanging train: three white cars under the beam, hung by their roofs (the rail on their back), a dark window band, light under the floor
    // A STATION for every building (the user: no aerial train without stations): a glass platform beside the hanging line, at the cars' floor, a GLASS TUNNEL from it, and at its end
    // THE HALL (the user): a zone of the building under a glass vault, a station of its own (benches, ticket posts, screens, planters, people), with a BIG LIFT in a glass shaft that takes
    // people down to the street. All the ceilings are CURVED (the user): vaults of flat glass panels. (N: the near row, 10 m away; F: the far row, 30 m.) Local x = 0 is the line.
    ...Object.fromEntries([['N', 10], ['F', 30], ['G', 30]].map(([n, far]) => ['ftStation' + n, () => { const gb = n === 'G';      // (G: the far station over the glass branch, its lift inside the hall's near end so that the ramp passes free)
      const y = 17.3, x0 = 1.5, P = [], G = [], GL = '#9fe6ff', DK = '#2a3358';
      const vaultX = (L, xc, yb, R, zc, out, col, o, th = 0.08, nn = 6) => { for (let k = 0; k < nn; k++) { const t = (k + 0.5) / nn * Math.PI; out.push(Kit.box(L, th, 2 * R * Math.sin(Math.PI / 2 / nn) * 1.04, xc, yb + R * Math.sin(t) - th / 2, zc + R * Math.cos(t), col, Object.assign({ rx: Math.PI / 2 - t }, o))); } };      // a vault whose axis runs along x
      const vaultZ = (L, zc, yb, R, xc, out, col, o, th = 0.08, nn = 6) => { for (let k = 0; k < nn; k++) { const t = (k + 0.5) / nn * Math.PI; out.push(Kit.box(2 * R * Math.sin(Math.PI / 2 / nn) * 1.04, th, L, xc + R * Math.cos(t), yb + R * Math.sin(t) - th / 2, zc, col, Object.assign({ rz: t - Math.PI / 2 }, o))); } };      // ... along z
      // the platform under its curved canopy
      P.push(Kit.box(3, 0.25, 11, x0 + 1.5, y - 0.25, 0, DK), Kit.box(0.12, 0.06, 11, x0 + 0.1, y, 0, F.lime, { glow: true }));
      for (const z of [-5.4, 0, 5.4]) { P.push(Kit.box(0.14, 2.2, 0.14, x0 + 2.93, y, z, '#c9d2e0'), Kit.box(0.14, 2.2, 0.14, x0 + 0.07, y, z, '#c9d2e0')); vaultZ(0.16, z, y + 2.2, 1.5, x0 + 1.5, P, F.cyan, { glow: true }, 0.1); }
      vaultZ(11, 0, y + 2.2, 1.5, x0 + 1.5, G, GL);
      G.push(Kit.box(0.08, 2.2, 3.6, x0 + 3, y, -3.7, GL), Kit.box(0.08, 2.2, 3.6, x0 + 3, y, 3.7, GL));
      for (const z of [-3.6, 3.6]) P.push(Kit.box(0.5, 0.45, 1.8, x0 + 2.5, y, z, '#e8ecf4'));                                                       // (two benches)
      // the tunnel: straight glass walls, a curved glass ceiling, lit hoops
      const hd = far > 20 ? 8 : 4.6, a = x0 + 3, hx = far - hd, L = hx - a;
      P.push(Kit.box(L, 0.2, 3, a + L / 2, y - 0.2, 0, DK), Kit.box(L, 0.06, 0.1, a + L / 2, y, 0, F.cyan, { glow: true }));
      for (let k = 0, nH = Math.max(1, Math.round(L / 4.5)); k <= nH; k++) { const x = a + L * k / nH; P.push(Kit.box(0.16, 1.7, 0.12, x, y, -1.5, F.pink, { glow: true }), Kit.box(0.16, 1.7, 0.12, x, y, 1.5, F.pink, { glow: true })); vaultX(0.16, x, y + 1.7, 1.5, 0, P, F.pink, { glow: true }, 0.1); }
      G.push(Kit.box(L, 1.7, 0.08, a + L / 2, y, -1.5, GL), Kit.box(L, 1.7, 0.08, a + L / 2, y, 1.5, GL)); vaultX(L, a + L / 2, y + 1.7, 1.5, 0, G, GL);
      if (far > 20) for (const x of [a + L * 0.3, a + L * 0.75]) P.push(Kit.box(0.5, y - 0.2, 0.5, x, 0, 0, '#3a4468'));                              // (the long one stands on two legs)
      // THE HALL, against the building: a floor, glass walls 2.4 m high and a wide glass vault over them
      const hw = 4.6, hc = hx + hd / 2;
      P.push(Kit.box(hd, 0.35, hw * 2, hc, y - 0.35, 0, DK), Kit.box(hd, 0.08, 0.14, hc, y, -hw, F.cyan, { glow: true }), Kit.box(hd, 0.08, 0.14, hc, y, hw, F.cyan, { glow: true }), Kit.box(0.5, y - 0.35, 0.5, hx + 0.5, 0, -hw + 0.5, '#3a4468'));
      for (const x of [hx, hx + hd / 2, far - 0.1]) { vaultX(0.2, x, y + 2.4, hw, 0, P, F.lime, { glow: true }, 0.12, 8); P.push(Kit.box(0.2, 2.4, 0.14, x, y, -hw, F.lime, { glow: true }), Kit.box(0.2, 2.4, 0.14, x, y, hw, F.lime, { glow: true })); }
      G.push(Kit.box(hd, 2.4, 0.08, hc, y, -hw, GL), Kit.box(hd, 2.4, 0.08, hc, y, hw, GL), Kit.box(0.08, 2.4, hw - 1.5, hx, y, -(hw + 1.5) / 2, GL), Kit.box(0.08, 2.4, hw - 1.5, hx, y, (hw + 1.5) / 2, GL)); vaultX(hd, hc, y + 2.4, hw, 0, G, GL, {}, 0.08, 8);
      // ... full of a station's things: benches, ticket posts, a departures screen, planters with small trees, a kiosk, people
      for (const z of [-2.6, 2.6]) P.push(Kit.box(Math.min(2.4, hd - 2.4), 0.45, 0.6, hc, y, z, '#e8ecf4'), Kit.box(0.9, 0.5, 0.9, far - 0.9, y, z * 1.25, '#5a6078'), Kit.cyl(0.07, 0.09, 1.2, far - 0.9, y + 0.5, z * 1.25, '#6a4a36'), Kit.ico(0.75, far - 0.9, y + 2.2, z * 1.25, F.leaf), Kit.ico(0.5, far - 0.6, y + 2.8, z * 1.25 + 0.2, F.leafL));
      for (const z of gb ? [-1.1] : [-1.1, 1.1]) P.push(Kit.box(0.35, 1.2, 0.35, hx + 0.9, y, z * 2.4, '#d6dce8'), Kit.box(0.37, 0.3, 0.3, hx + 0.9, y + 0.8, z * 2.4, F.cyan, { glow: true }));
      P.push(Kit.box(0.12, 1.0, 2.6, far - 0.25, y + 2.6, 0, '#10182c'), Kit.box(0.06, 0.8, 2.4, far - 0.33, y + 2.7, 0, F.cyan, { glow: true }), Kit.box(0.3, 3.2, 2.6, far - 0.1, y, 0, F.lime, { glow: true }));                          // the screen over the lit door into the building
      if (hd > 6) P.push(Kit.box(1.6, 2.1, 1.6, hc + 1.6, y, -3.4, '#ff8a5a'), Kit.box(1.9, 0.14, 1.9, hc + 1.6, y + 2.1, -3.4, F.pink, { glow: true }));                                                                                    // (a kiosk)
      for (const [dx, z, c] of [[1.4, 0.7, '#ffd27a'], [hd * 0.5, -1.2, '#ff8ac0'], [hd * 0.62, 1.6, '#8ad0ff'], [hd - 1.6, -0.5, '#c8ff9a']]) P.push(Kit.box(0.36, 1.05, 0.26, hx + dx, y, z, c), Kit.ico(0.2, hx + dx, y + 1.3, z, '#e8c2a0'));  // people
      // THE BIG LIFT: a glass shaft down the side of the hall to the street, its lit cabin half-way, a lit door at the bottom
      { const S = gb ? 2.4 : 3.2, ex = gb ? hx + 1.4 : far - 2, ez = gb ? hw - 1.4 : hw + 1.7;
        for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) P.push(Kit.box(0.18, y + 3.4, 0.18, ex + dx * S / 2, 0, ez + dz * S / 2, '#c9d2e0'));
        for (let yy = 0; yy <= y + 3.4; yy += (y + 3.4) / 5) P.push(Kit.box(S + 0.2, 0.14, S + 0.2, ex, yy, ez, F.cyan, { glow: true }));
        P.push(Kit.box(S - 0.5, 2.6, S - 0.5, ex, y * 0.45, ez, '#f2f5fa'), Kit.box(S - 0.4, 0.12, S - 0.4, ex, y * 0.45 - 0.1, ez, F.lime, { glow: true }), Kit.box(S - 0.44, 1.0, S - 0.44, ex, y * 0.45 + 1.1, ez, '#16233a'), Kit.box(0.12, 2.4, 1.6, ex - S / 2 - 0.02, 0, ez, F.lime, { glow: true }), Kit.box(2.6, 0.1, 5, ex - S / 2 - 1.3, 0.02, ez, '#3a4468'));
        G.push(Kit.box(S, y + 3.4, 0.08, ex, 0, ez - S / 2, GL), Kit.box(S, y + 3.4, 0.08, ex, 0, ez + S / 2, GL), Kit.box(0.08, y + 3.4, S, ex - S / 2, 0, ez, GL), Kit.box(0.08, y + 3.4, S, ex + S / 2, 0, ez, GL)); }
      return { merged: Kit.merge(P), sprite: Kit.merge(G).lit, material: () => NeonAvenue._stGlass || (NeonAvenue._stGlass = new THREE.MeshBasicMaterial({ color: '#9fe6ff', transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide })) }; }])),
    ftRailArm: () => Kit.merge([Kit.box(5.4, 0.35, 0.7, -2.7, 10.05, 0, '#a89880'), Kit.box(0.3, 0.3, 0.72, -5.2, 10.4, 0, '#8a8f99')]),      // the arm that holds the glass track beside the rail
    ftHangTrain: () => { const P = []; for (let c = 0; c < 3; c++) { const z = -9.2 + c * 9.2; P.push(Kit.box(2.5, 3.0, 8.7, 0, 17.4, z, '#f2f5fa'), Kit.box(2.56, 1.0, 7.9, 0, 18.7, z, '#16233a'), Kit.box(2.2, 0.12, 8.2, 0, 17.3, z, F.cyan, { glow: true }), Kit.box(0.5, 1.6, 0.7, 0, 20.4, z - 2.6, '#8a94a8'), Kit.box(0.5, 1.6, 0.7, 0, 20.4, z + 2.6, '#8a94a8'), Kit.box(2.6, 0.2, 8.7, 0, 20.4, z, '#d6dce8')); }
      P.push(Kit.box(1.8, 0.5, 0.15, 0, 18.2, -13.6, '#fff2c0', { glow: true })); return Kit.merge(P); },
    // towers of 2455 (their facade at x 0 toward the road, the body toward +X). The green ones carry their gardens up the building:
    //   A: a stepped tower, a garden with trees on every step and a living wall down its face
    ftGreenA: () => { const P = []; let y = 0; for (let k = 0; k < 5; k++) { const d = 14 - k * 2.2, f = 11 - k * 1.5, h = 13 - k; P.push(Kit.box(d, h, f, d / 2, y, 0, k % 2 ? '#1d2748' : '#243258'), Kit.box(0.1, h - 2, f * 0.5, -0.03, y + 1, 0, '#3f6f9a'), Kit.box(d + 0.4, 0.5, f + 0.4, d / 2, y + h, 0, F.leaf));
        P.push(...tree(d - 1.2, y + h + 0.5, f / 2 - 1.3, 3.2), ...tree(1.0, y + h + 0.5, -f / 2 + 1.2, 2.6), Kit.box(0.5, h * 0.8, 1.6, -0.2, y + h * 0.1, f / 2 - 1.2, k % 2 ? F.leaf : F.leafD), Kit.box(0.12, 0.12, f, -0.05, y + h - 0.2, 0, F.lime, { glow: true })); y += h; }
      P.push(Kit.cyl(0.1, 0.25, 7, 2.5, y + 0.5, 0, '#c9d2e0'), Kit.ico(0.4, 2.5, y + 7.8, 0, F.pink, { glow: true })); return Kit.merge(P); },
    //   B: two slabs joined by garden bridges (trees in the sky), planted balconies up both faces
    ftGreenB: () => { const P = [], H = 72; for (const z of [-4.2, 4.2]) { P.push(Kit.box(11, H, 4.6, 5.5, 0, z, '#1b2a4c'), Kit.box(0.1, H - 4, 2.4, -0.03, 2, z, '#35608a'), Kit.box(11.2, 0.3, 4.8, 5.5, H, z, F.cyan, { glow: true }));
        for (let y = 5; y < H - 3; y += 6) P.push(Kit.box(1.2, 0.9, 4.2, -0.5, y, z, (y / 6 | 0) % 2 ? F.leaf : F.leafD), Kit.box(1.0, 0.5, 3.6, -0.5, y + 0.9, z, F.leafL)); }
      for (const y of [18, 38, 58]) P.push(Kit.box(9, 0.6, 4, 5.5, y, 0, '#2a3a66'), Kit.box(8.6, 0.5, 3.8, 5.5, y + 0.6, 0, F.leaf), ...tree(3, y + 1.1, 0, 3.4), ...tree(7.6, y + 1.1, 0.4, 2.8), Kit.box(0.1, 0.1, 4, 1, y + 0.3, 0, F.lime, { glow: true }));
      P.push(...tree(3, H + 0.3, -4.2, 3), ...tree(8, H + 0.3, 4.2, 3)); return Kit.merge(P); },
    //   C: a round tower ringed with gardens every 9 m, a glass dome with a tree at its top
    ftGreenC: () => { const P = [Kit.cyl(4.6, 5.4, 60, 5.4, 0, 0, '#22305a', { seg: 10 }), Kit.cyl(4.7, 4.7, 0.3, 5.4, 60, 0, F.pink, { glow: true, seg: 10 })];
      for (let y = 7; y < 58; y += 9) { P.push(Kit.cyl(7.2, 6.6, 0.7, 5.4, y, 0, '#2c3c6c', { seg: 10 }), Kit.cyl(7.0, 7.0, 0.5, 5.4, y + 0.7, 0, (y / 9 | 0) % 2 ? F.leaf : F.leafD, { seg: 10 }), Kit.cyl(5.5, 5.5, 0.12, 5.4, y - 0.2, 0, F.lime, { glow: true, seg: 10 }));
        for (let a = 0; a < 5; a++) { const t = a / 5 * 6.283 + y; P.push(Kit.ico(1.3, 5.4 + Math.cos(t) * 6.1, y + 2.1, Math.sin(t) * 6.1, a % 2 ? F.leafL : F.leaf)); } }
      P.push(Kit.cyl(0.6, 4.4, 4.5, 5.4, 60.3, 0, '#3f6f9a', { seg: 10 }), ...tree(5.4, 64, 0, 3.2)); return Kit.merge(P); },
    //   the plain ones: a glass prism with lines of light; a slim pair with a bridge
    ftPlainA: () => Kit.merge([Kit.box(11, 66, 9, 5.5, 0, 0, '#16203e'), Kit.box(0.1, 62, 6.5, -0.03, 2, 0, '#2f5a88'), Kit.box(0.14, 66, 0.14, -0.05, 0, -4.5, F.cyan, { glow: true }), Kit.box(0.14, 66, 0.14, -0.05, 0, 4.5, F.pink, { glow: true }), Kit.box(0.12, 0.14, 9, -0.05, 22, 0, F.cyan, { glow: true }), Kit.box(0.12, 0.14, 9, -0.05, 44, 0, F.violet, { glow: true }), Kit.box(8, 6, 6.5, 5.5, 66, 0, '#1d2a50'), Kit.cyl(0.08, 0.2, 9, 5.5, 72, 0, '#c9d2e0'), Kit.ico(0.35, 5.5, 81.2, 0, F.cyan, { glow: true })]),
    ftPlainB: () => { const P = []; for (const [z, H] of [[-3.6, 58], [3.6, 50]]) P.push(Kit.box(8, H, 4.4, 4, 0, z, '#1a2444'), Kit.box(0.1, H - 3, 2.6, -0.03, 1.5, z, '#3a4f8a'), Kit.box(8.2, 0.3, 4.6, 4, H, z, F.violet, { glow: true }), Kit.box(0.12, H, 0.12, -0.05, 0, z + (z < 0 ? -2.2 : 2.2), F.pink, { glow: true }));
      P.push(Kit.box(5, 2.4, 3, 4, 34, 0, '#2a3a66'), Kit.box(5.1, 0.14, 3.1, 4, 34, 0, F.cyan, { glow: true })); return Kit.merge(P); },
    // THE PARK in the middle of the avenue (the breathing point), one slot, 40 m wide (its centre at x 0): lawn, a pale path, a pond, giant trees whose crowns rise over the high road, flower
    // beds, benches and soft lamps. Two slots that alternate.
    ftParkA: () => park(0), ftParkB: () => park(1),
    sdParkA: () => park(0, true), sdParkB: () => park(1, true),
    // THE PROTECTION WALL (the user): a dark glass wall standing on the ground on the left of the high road, 2 m from its edge, up to 2 m over its deck (NEON_CORNER.H + 2 m), lit edges
    cnWall: () => { const H = (typeof NEON_CORNER !== 'undefined' ? NEON_CORNER.H / 10 : 14) + 2, L = 12.25, parts = [Kit.box(0.35, H, L, 0, 0, 0, '#1a1438'), Kit.box(0.4, 0.14, L, 0, H, 0, C.pink, { glow: true }), Kit.box(0.4, 0.1, L, 0, H - 2.4, 0, C.cyan, { glow: true })];
      for (const z of [-L / 2 + 0.2, 0]) parts.push(Kit.box(0.42, H, 0.18, 0, 0, z, '#2a2f6a'), Kit.box(0.44, H * 0.9, 0.05, 0, H * 0.05, z, C.violet, { glow: true }));
      return Kit.merge(parts); },
  // THE BRIDGE across the road over the tunnel, under the spiral (ART CITY's last slot): a deck on pillars (foundations), its sides wearing the race zone's ramp picture
    artBridge: () => { const W = 50, y = 12.6, parts = [Kit.box(W, 1.0, 7, 0, y - 1.0, 0, '#22264a'), Kit.box(W, 0.14, 0.14, 0, y, 3.5, C.pink, { glow: true }), Kit.box(W, 0.14, 0.14, 0, y, -3.5, C.cyan, { glow: true })];
      for (const x of [-21, -15, 13.2, 20]) parts.push(Kit.box(1.6, y - 1, 1.6, x, 0, 0, C.pillar), Kit.box(1.7, 0.14, 1.7, x, 4, 0, C.pink, { glow: true }));
      const fasc = [3.52, -3.52].map(z => NeonAvenue.plain([-W / 2, y - 3.2, z], [W / 2, y - 3.2, z], [W / 2, y, z], [-W / 2, y, z]));
      return tex(parts, fasc, () => NeonAvenue.rampMaterial()); },
  });
  // THE GLASS RAMP, a DETOUR (the user: "the glass ramp is a detour, not mixed with the circuit"): a second road that leaves the circuit like the exit of a motorway. Over ART CITY's last UP slots
  // it parts from the road (its centre D m to the left by the end, NeonAvenue.shift) and climbs (NEON_CORNER.lift) to the bridge over the tunnel; the circuit goes straight on to the tunnel.
  // Before the choice it is drawn here as glass beside the road (artGlassRamp0..UP-1); a runner who takes it rides it as THE road (World.extraLift) and the circuit is then drawn as
  // `cnMainRoad`, parting to the right and staying down.
  const UPN = typeof NEON_CORNER !== 'undefined' ? NEON_CORNER.UP : 6, HM = typeof NEON_CORNER !== 'undefined' ? NEON_CORNER.H / 10 : 14, e = t => t * t * (3 - 2 * t);
  NeonAvenue.D = typeof NEON_CORNER !== 'undefined' ? NEON_CORNER.SHIFT_M : 17; NeonAvenue.shift = t => NeonAvenue.D * e(Math.max(0, Math.min(1, t))); NeonAvenue.height = t => HM * e(Math.max(0, Math.min(1, t)));
  for (let k = 0; k < UPN; k++) props['artGlassRamp' + k] = (() => { const L = 12.25, n = 8, W = 2.4,      // (the user: the ramp may be narrower than the circuit)
    pos = [], uv = [], idx = [], parts = [];
    for (let a = 0; a < n; a++) { const f0 = a / n, f1 = (a + 1) / n, P = f => { const t = (k + f) / UPN; return [-NeonAvenue.shift(t), NeonAvenue.height(t), L / 2 - f * L]; }, [xa, ya, za] = P(f0), [xb, yb, zb] = P(f1);
      if (xa + W > -3.6 || xb + W > -3.6) continue;                                                                   // (the user: no glass over the circuit's asphalt: the deck starts where the ramp has left the road)
      const o = pos.length / 3; pos.push(xa - W, ya, za, xa + W, ya, za, xb - W, yb, zb, xb + W, yb, zb); uv.push(0, f0, 1, f0, 0, f1, 1, f1); idx.push(o, o + 2, o + 1, o + 1, o + 2, o + 3); }
    for (let a = 0; a < n; a++) { const f0 = a / n, f1 = (a + 1) / n, t0 = (k + f0) / UPN, t1 = (k + f1) / UPN, x0 = -NeonAvenue.shift(t0), x1 = -NeonAvenue.shift(t1), y0 = NeonAvenue.height(t0), y1 = NeonAvenue.height(t1), z0 = L / 2 - f0 * L, z1 = L / 2 - f1 * L;
      const len = Math.hypot(x1 - x0, y1 - y0, z1 - z0), rx = Math.atan2(y1 - y0, z0 - z1), ry = Math.atan2(x0 - x1, z0 - z1);
      for (const [dx, col] of [[-W, C.pink], [W, C.cyan]]) if (y0 > 0.3 || dx < 0 || x0 + W < -3.6) parts.push(Kit.box(0.14, y0 > 0.3 ? 0.14 : 0.03, len, (x0 + x1) / 2 + dx, (y0 + y1) / 2 - 0.07, (z0 + z1) / 2, col, { glow: true, rx, ry }));
      if (a === n / 2 && y0 > 2) parts.push(Kit.box(1.0, y0, 1.0, (x0 + x1) / 2, 0, (z0 + z1) / 2, C.pillar)); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
    return () => tex(parts, [g], () => NeonAvenue.glassMaterial()); })();
  // the circuit seen from the ramp: one slot of the grey road of ART CITY with its white lines and its blue-violet rails, on the ground (placed at the ramp's shift, to the right, and down)
  props.cnMainRoad = () => Kit.merge([Kit.box(6.6, 0.05, 12.3, 0, 0, 0, '#4a4d58'), Kit.box(0.14, 0.02, 12.3, -3.1, 0.05, 0, '#ffffff'), Kit.box(0.14, 0.02, 12.3, 3.1, 0.05, 0, '#ffffff'), Kit.box(0.12, 0.02, 3, -1.1, 0.05, -3, '#ffffff'), Kit.box(0.12, 0.02, 3, 1.1, 0.05, -3, '#ffffff'),
    Kit.box(0.25, 0.75, 12.3, -3.75, 0, 0, '#5a4ad8'), Kit.box(0.27, 0.08, 12.3, -3.75, 0.75, 0, '#8f7bff', { glow: true }), Kit.box(0.25, 0.75, 12.3, 3.75, 0, 0, '#5a4ad8'), Kit.box(0.27, 0.08, 12.3, 3.75, 0.75, 0, '#8f7bff', { glow: true })]);

  // (the user, "sans goudron": under the avenue the circuit has no asphalt, only its lines and its barriers on the floor)
  // (the user, 2026-11-20, "enlever les lines": no edge lines and no rails on the tiled floor, only the lane dashes)
  props.cnMainRoadBare = () => Kit.merge([Kit.box(0.12, 0.02, 3, -1.1, 0.03, -3, '#ffffff'), Kit.box(0.12, 0.02, 3, 1.1, 0.03, -3, '#ffffff')]);
  // (the user: the circuit beside the ramp was a staircase of straight pieces; each slot's piece is now bent along the curve, cnMainRoadU0.. on the way up, cnMainRoadD0.. on the way down)
  { const bend = (k, n, dir) => () => { const m = props.cnMainRoad(), f = z => NeonAvenue.shift(dir > 0 ? (k + (6 - z) / 12.2) / n : 1 - (k + (6 - z) / 12.2) / n), c = f(0);
      for (const g of [m.lit, m.glow]) if (g) { const P = g.attributes.position; for (let i = 0; i < P.count; i++) P.setX(i, P.getX(i) + f(P.getZ(i)) - c); P.needsUpdate = true; g.computeBoundingSphere(); g.computeBoundingBox(); }
      return m; };
    const DN0 = typeof NEON_CORNER !== 'undefined' ? NEON_CORNER.DOWN : 6;
    for (let k = 0; k < UPN; k++) props['cnMainRoadU' + k] = bend(k, UPN, 1);
    for (let k = 0; k < DN0; k++) props['cnMainRoadD' + k] = bend(k, DN0, -1); }
  // slot q of the avenue (0 .. CANYON + DOWN - 1, the high road and its way down); liftM: the road's height there (m)
  const TW = ['cnWhite', 'cnTeal', 'cnMagenta', 'cnViolet', 'cnGreen', 'cnPurple', 'cnOrange', 'cnRed'];
  // THE NEON SKYLINE, BUILT (the user: "construire"): the city of the user's picture (SKYLINE_ART) standing in 3D beyond the monorail rail on the right. Every tower of the picture is a
  // real volume at its own depth (the big screen towers in front, the twin towers with their stepped crowns and spires at the back, the low city between them, the two roofed pavilions and
  // palms in front); the picture itself is projected on them from the front, so each building wears exactly its own part of it (sides and tops darker). Measures: the picture is 165 m wide
  // and 110 m tall, its smeared bottom 9 m under the ground. A far group of its own (the renderer places it, seen from 390 m: Renderer3D "skies"), at the slots SKY_Q, SKY_X m to the right.
  NeonAvenue.SKY_Q = [54]; NeonAvenue.SKY_X = 114; NeonAvenue.SKY_S = 75.6 / 110;      // (the user: at the scale of the towers of the left, the tallest 75.6 m like theirs; as far beyond the rail as
  // theirs stand from the road, 20 m: its nearest corner 52 m from the road's centre; the first of the two cities removed)
  NeonAvenue.skyMesh = () => {
    const H = 110, W = H * SKYLINE_ART.w / SKYLINE_ART.h, SINK = 9, X = px => (px / 2000 - 0.5) * W, Y = py => (1 - py / 1333) * H - SINK, M = W / 2000, geos = [];
    const add = (g, x, y, z, flat) => { g = g.index ? g.toNonIndexed() : g; g.translate(x, y, z); g.computeVertexNormals(); if (flat) g.userData.flat = flat; geos.push(g); };
    const box = (x0, x1, top, z, d) => { const w = (x1 - x0) * M, h = Y(top) + SINK; add(new THREE.BoxGeometry(w, h, d || Math.min(w, 16)), X((x0 + x1) / 2), h / 2 - SINK, z); };
    const cyl = (cx, r0, r1, y0, y1, z, seg) => add(new THREE.CylinderGeometry(r1 * M, r0 * M, Y(y1) - Y(y0), seg || 12), X(cx), (Y(y0) + Y(y1)) / 2, z);
    const poly = (pts, z, d) => { const sh = new THREE.Shape(); pts.forEach((q, k) => k ? sh.lineTo(X(q[0]), Y(q[1])) : sh.moveTo(X(q[0]), Y(q[1]))); add(new THREE.ExtrudeGeometry(sh, { depth: d, bevelEnabled: false }), 0, 0, z - d); };
    // the front row: the big screen towers of both edges
    box(55, 232, 70, 22); box(232, 316, 0, 18, 10); box(316, 440, 60, 14);
    box(1545, 1890, 0, 22, 18); box(1452, 1548, 0, 15, 8); box(1830, 2000, 0, 12, 12);
    // the middle: the cyan screen block, the round screen tower, the two spire towers
    box(655, 762, 600, 0); cyl(1283, 78, 78, 1333, 300, 0, 16); cyl(1283, 78, 40, 300, 270, 0, 16);
    box(482, 580, 600, -8); cyl(531, 34, 0, 600, 470, -8, 6); box(1122, 1196, 600, -8); cyl(1159, 30, 0, 600, 455, -8, 6);
    // the back: the low city
    box(430, 1452, 1010, -16, 10);
    // (the user: the twin towers are removed)
    // the two roofed pavilions in front (their roof lines), and palms standing before them (their colours taken from the picture's own palms)
    poly([[0, 790], [110, 800], [430, 1060], [430, 1333], [0, 1333]], 36, 12); poly([[2000, 960], [1600, 1170], [1600, 1333], [2000, 1333]], 36, 12);
    for (const [px, z, hh] of [[600, 44, 13], [1470, 44, 15], [760, 30, 11], [1340, 30, 12]]) { const x = X(px);
      add(new THREE.CylinderGeometry(0.28, 0.45, hh, 6), x, hh / 2, z, [1420, 1100]);
      for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2, g = new THREE.ConeGeometry(0.9, 6.5, 4); g.scale(1, 1, 0.25); g.rotateZ(-Math.PI / 2 + 0.5); g.translate(2.6, -0.9, 0); g.rotateY(a); add(g, x, hh, z, k % 2 ? [640, 960] : [1500, 930]); } }
    // one geometry: the picture projected from the front (uv from x and y), faces that do not look to the front darker
    let n = 0; for (const g of geos) n += g.attributes.position.count;
    const P = new Float32Array(n * 3), UV = new Float32Array(n * 2), CL = new Float32Array(n * 3); let o = 0;
    for (const g of geos) { const p = g.attributes.position, nm = g.attributes.normal, f = g.userData.flat;
      for (let k = 0; k < p.count; k++, o++) { const x = p.getX(k), y = p.getY(k); P[o * 3] = x; P[o * 3 + 1] = y; P[o * 3 + 2] = p.getZ(k);
        UV[o * 2] = f ? f[0] / 2000 : x / W + 0.5; UV[o * 2 + 1] = f ? 1 - f[1] / 1333 : (y + SINK) / H;
        const sh = f ? 0.75 + 0.5 * Math.max(0, nm.getY(k)) : 0.42 + 0.58 * Math.max(0, nm.getZ(k)); CL[o * 3] = CL[o * 3 + 1] = CL[o * 3 + 2] = sh; } g.dispose(); }
    const G = new THREE.BufferGeometry(); G.setAttribute('position', new THREE.BufferAttribute(P, 3)); G.setAttribute('uv', new THREE.BufferAttribute(UV, 2)); G.setAttribute('color', new THREE.BufferAttribute(CL, 3)); G.computeBoundingSphere();
    if (!NeonAvenue._skyMat) { const tex = new THREE.Texture(SKYLINE_ART.img); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8; const m = new THREE.MeshBasicMaterial({ map: tex, vertexColors: true, fog: false });
      const up = () => { tex.needsUpdate = true; m.visible = true; }; if (SKYLINE_ART.img.complete && SKYLINE_ART.img.naturalWidth) up(); else { m.visible = false; SKYLINE_ART.img.addEventListener('load', up); } NeonAvenue._skyMat = m; }
    const mesh = new THREE.Mesh(G, NeonAvenue._skyMat); mesh.rotation.y = -0.4; mesh.scale.setScalar(NeonAvenue.SKY_S); mesh.visible = false; return mesh; };
  NeonAvenue.layout = (q, rnd, liftM) => {
    const CN0 = typeof NEON_CORNER !== 'undefined' ? NEON_CORNER.CANYON : 40, out = [{ prop: q >= CN0 ? 'cnGlassD' + (q - CN0) : 'cnGlass', x: 0.001, dist: 6 }], CN = typeof NEON_CORNER !== 'undefined' ? NEON_CORNER.CANYON : 40, DN = typeof NEON_CORNER !== 'undefined' ? NEON_CORNER.DOWN : 6;
    if (q >= CN) {                                                                     // THE WAY DOWN, a glass ramp too (the user): it comes down from the left onto the circuit, which runs below on the right and meets it
      const k = q - CN, sh = d => NeonAvenue.shift(1 - (k + d / 12.2) / DN);
      out.push({ prop: 'cnMainRoadD' + k, x: sh(6) + 0.001, dist: 6, dy: -liftM });
      for (const s of [1]) { const kk = mod(q * 3 + Math.floor(rnd(q, 44) * 4), TW.length); out.push({ prop: TW[kk], x: sh(6) + 12 + rnd(q, 45) * 6, dist: 6, dy: -liftM }); }
      if (k % 2 === 0 && liftM > 3) out.push({ prop: 'cnPillar', x: 0.001, dist: 3 });
      for (const o of out) o.solo = true;
      return out;
    }
    if (q % 2 === 0 && liftM > 3) out.push({ prop: 'cnPillar', x: 0.001, dist: 3 });
    for (const s of [-1, 1]) {
      const k = mod(q * 3 + (s > 0 ? 5 : 0) + Math.floor(rnd(q * 2 + (s > 0 ? 1 : 0), 41) * 4), TW.length);
      const far = s > 0 ? 14 : 0;                                                    // (the user: the buildings on the right step back, so the ground down there is wide and seen from the road)
      if (s < 0) out.push({ prop: TW[k], x: s * (11 + far + rnd(q * 2 + (s > 0 ? 1 : 0), 42) * 9), dist: 6, dy: -liftM });      // (the user: a very large open space first on the right, for the joint to come; then (choice A) no tower on the right at all: the monorail city is seen whole)
      if (mod(q, 3) === 1 && s < 0) out.push({ prop: TW[mod(k + 3, TW.length)], x: s * (24 + far + rnd(q, 43 + s) * 8), dist: 2, dy: -liftM });      // (the user: no second row on the right: free ground behind the first, kept for the material to come)
    }
    if (liftM > 3) {                                                                   // UNDER THE GLASS ROAD (the user): no asphalt, a floor of big glossy black tiles under it and on both sides, its tint
      out.push({ prop: 'cnFloor' + (Math.floor(q / 17) % 5), x: 0.001, dist: 6, dy: -liftM });   //   changing every 200 m to another dark glossy colour; a big concrete planter of flowers and greens every 50 m in the
      if (q % 4 === 1) out.push({ prop: 'cnPlanter', x: 0.001, dist: 6, dy: -liftM });             //   middle, under the road; a terrace (a kiosk, tables and chairs) every 350 m on the right
      if (q % 29 === 14) out.push({ prop: 'cnTerrace', x: 25.5, dist: 6, dy: -liftM });
    }
    if (liftM > 3) out.push({ prop: 'cnWall', x: -5.45, dist: 6, dy: -liftM });
    if (liftM > 3 && NeonAvenue.PK && q >= NeonAvenue.PK.q0 && q < NeonAvenue.PK.q0 + NeonAvenue.PK.n) out.push({ prop: 'pkTop' + (q - NeonAvenue.PK.q0), x: NeonAvenue.PK.x, dist: 6, dy: -liftM });      // (the car park's ramp and stairs come up through the tiled floor here)
    // THE MONORAIL CITY (the user's picture, METRO_ART) on the free ground of the right, after the open space: the picture itself, standing tall far out (it is the city's skyline, its towers,
    // the art deco block and the roof gardens), turned toward the road and the runner; in front of it an elevated monorail rail along the avenue with its white trains
    if (q < (typeof NEON_CORNER !== 'undefined' ? NEON_CORNER.EXIT : 2)) { out.push({ prop: 'neonTunnel' + (q % 6), x: NeonAvenue.D, dist: 6, dy: -liftM, solo: true }); if (q === 0) out.push({ prop: 'neonTunnelMouth', x: NeonAvenue.D, dist: 6, dy: -liftM, solo: true }); }      // (the user: seen from the ramp, the circuit ran to nothing: its tunnel is there now, under the bridge)
    if (liftM > 3) out.push({ prop: 'cnRail', x: 32, dist: 6, dy: -liftM });
    // (the user, two circuits "to be reached later": 1. THE CIRCUIT ON THE GROUND goes on out of its tunnel, all along under the avenue's right side, to where the way down meets it;
    //  2. A GLASS TRACK like the glass road, one lane wide, 1 m from the rail and 1 m under its top, all along the rail, held by an arm on every pillar. Both are scenery for now: no way in yet.)
    if (liftM > 3 && q >= (typeof NEON_CORNER !== 'undefined' ? NEON_CORNER.EXIT : 2)) out.push({ prop: 'cnMainRoadBare', x: NeonAvenue.D, dist: 6, dy: -liftM });
    if (liftM > 3) out.push({ prop: 'cnGlassN', x: 28.55, dist: 6, dy: 11 - liftM }, { prop: 'ftRailArm', x: 32, dist: 6, dy: -liftM });
    if (liftM > 3 && q >= 15) { if (q % 13 === 4) out.push({ prop: 'cnTrain', x: 32, dist: 6, dy: -liftM }); }
    // THE GREAT QUARTER OF 2455 (the user), all along the rail: the two-floor street with the hanging line over it (a hanging train every 110 m), then the towers in two rows, 2 of every 3
    // with vertical gardens (67 %); in the middle of the avenue the park (9 slots, 110 m) in place of the towers; no tower where the built skyline stands
    if (liftM > 3 && q >= 15 && q < CN) { const mid = Math.floor((15 + CN) / 2), inPark = Math.abs(q - mid) <= 4, sky = NeonAvenue.SKY_Q.some(z => q >= z - 6 && q <= z + 5);
      out.push({ prop: 'ftStreet', x: 42, dist: 6, dy: -liftM }); if (q % 9 === 2) out.push({ prop: 'ftHangTrain', x: 42, dist: 6, dy: -liftM });
      if (inPark) out.push({ prop: q % 2 ? 'ftParkA' : 'ftParkB', x: 68, dist: 6, dy: -liftM });
      else if (!sky) out.push({ prop: q % 3 === 2 ? (q % 2 ? 'ftPlainA' : 'ftPlainB') : ['ftGreenA', 'ftGreenB', 'ftGreenC'][(Math.floor(q / 3) + q % 3) % 3], x: q % 2 ? 72 : 52, dist: 6, dy: -liftM }, { prop: q % 2 ? 'ftStationF' : 'ftStationN', x: 42, dist: 6, dy: -liftM }); }      // (the user: the train stays, with its rail; the city picture (cnMetroView) is removed)                       // THE PROTECTION WALL on the left (the user): from the ground up to 2 m over the glass road, 2 m from its edge
    for (const o of out) o.solo = true;
    return out;
  };

  // THE CAR PARK under the avenue (the user: "the tunnel's entrance is the entrance of two tunnels; after 100 m underground, a big car park under the tiled floor, then a ramp and stairs
  // up to the tiled floor"). NEON_CORNER.PARK: the second tunnel goes down like the first, opens on the car park (pkHall*, PARK slots), and a ramp with stairs on its left (pkRise0..) climbs
  // through an open trench in the tiled floor, POFF_M m to the left of the circuit on the ground; a slip road (PMERGE slots, the avenue's long props bent: pk<name>k) joins that circuit.
  { const NC = typeof NEON_CORNER !== 'undefined' ? NEON_CORNER : { DIVE: 6, PARK: 8, PRISE: 6, PMERGE: 4, POFF_M: 8.2, DEPTH: 120, CANYON: 70, DOWN: 6 }, PD = NC.DEPTH / 10, PR = NC.PRISE, PM = NC.PMERGE, OFF = NC.POFF_M, L = 12.2, D = NeonAvenue.D, CH = 5.4, HW = 34;      // (the user, 2026-11-20: a vaster and longer car park: four rows a side, PARK 16)
    const X0 = -5.85, X1 = 4.1, XM = (X0 + X1) / 2, XW = X1 - X0, WALL = '#262a38', SLAB = '#3a3d46';      // (the trench: the stairs on the left, the ramp, between two walls)
    const gy = (k, f) => PD * (1 - e(Math.max(0, Math.min(1, (k + f) / PR))));                             // the tiled floor's height over the ramp, slot k, fraction f
    NeonAvenue.PK = { q0: NC.DIVE + NC.PARK, n: PR, x: D - OFF };
    const COLS = ['#d8404a', '#3a7bd8', '#e8e8ee', '#f0b030', '#3aa878', '#8a5cff', '#22262e'];
    const car = (x, z, col, s) => [Kit.box(4.2, 0.75, 1.8, x, 0.25, z, col), Kit.box(2.2, 0.6, 1.6, x + s * 0.3, 1.0, z, '#1a2030'), Kit.box(0.08, 0.16, 1.4, x - s * 2.1, 0.62, z, '#fff2c0', { glow: true })];
    const hall = v => () => { const P = [Kit.box(2 * HW, 0.2, L + 0.05, 0, -0.2, 0, '#30333c'), Kit.box(2 * HW, 0.4, L + 0.05, 0, CH, 0, '#1b1d26'), Kit.box(0.25, 0.02, 2.4, 0, 0, 0.6, '#ffffff'), Kit.box(0.25, 0.02, 1.3, 0.42, 0, -0.75, '#ffffff', { ry: -0.7 }), Kit.box(0.25, 0.02, 1.3, -0.42, 0, -0.75, '#ffffff', { ry: 0.7 })];
      for (const s of [-1, 1]) { P.push(Kit.box(0.4, CH, L + 0.05, s * HW, 0, 0, WALL), Kit.box(0.44, 0.5, L, s * (HW - 0.02), 1.6, 0, s < 0 ? '#3a7bd8' : '#ff8a3a'), Kit.box(0.14, 0.02, L, s * 3.6, 0, 0, '#ffffff'),
          Kit.box(0.5, 0.08, 9, s * 3.4, CH - 0.08, 0, '#eaf6ff', { glow: true }), Kit.box(0.5, 0.08, 9, s * 14, CH - 0.08, 0, '#eaf6ff', { glow: true }), Kit.box(0.5, 0.08, 9, s * 26.8, CH - 0.08, 0, '#eaf6ff', { glow: true }),
          Kit.box(0.8, CH, 0.8, s * 19, 0, 0, '#4a4d58'), Kit.box(0.84, 0.5, 0.84, s * 19, 0.9, 0, '#f0c020'),
          Kit.box(0.8, CH, 0.8, s * 10.8, 0, 0, '#4a4d58'), Kit.box(0.84, 0.5, 0.84, s * 10.8, 0.9, 0, '#f0c020'));
        for (const row of [0, 1, 2, 3]) { const xc = s * [6.9, 15.5, 22.5, 31.1][row], green = (v && s < 0 && row === 1) || (!v && s > 0 && row === 3) || (v && s > 0 && row === 2);
          if (green) { P.push(Kit.box(5, 0.6, 8, xc, 0, 0, '#8a8a90'), Kit.box(4.6, 0.1, 7.6, xc, 0.56, 0, '#3a2a1c'), Kit.box(4.6, 0.1, 7.6, xc, CH - 0.06, 0, '#fff6d8', { glow: true }), ...tree(xc, 0.6, 0, 2.1), Kit.ico(0.9, xc - 1.2, 0.6, 2.6, F.leafL), Kit.ico(0.8, xc + 1.1, 0.6, -2.7, F.leafD), Kit.ico(0.35, xc + 1.4, 0.9, 2.4, '#ff7ab8'), Kit.ico(0.35, xc - 1.3, 0.9, -2.2, '#ffd24a')); continue; }
          for (let b = 0; b < 4; b++) { const z = -L / 2 + b * L / 4; P.push(Kit.box(5, 0.02, 0.12, xc, 0, z + 0.06, '#ffffff'));
            if ((b * 7 + v * 3 + (s > 0 ? 5 : 0) + row * 2) % 5 < 3) P.push(...car(xc, z + L / 8, COLS[(b + v * 2 + row * 3 + (s > 0 ? 4 : 0)) % 7], row % 2 ? -s : s)); } } }
      return Kit.merge(P); };
    props.pkHallA = hall(0); props.pkHallB = hall(1);
    // the hall's two ends: the tunnel comes in through a wall; at the far end the ramp and the stairs leave through an opening
    props.pkHallIn = () => Kit.merge([Kit.box(2 * HW, 6, 0.3, 0, CH, 6.0, '#1b1d26'), Kit.box(HW - 4.2, CH, 0.3, -(HW + 4.2) / 2, 0, 6.0, WALL), Kit.box(HW - 4.2, CH, 0.3, (HW + 4.2) / 2, 0, 6.0, WALL)]);
    // THE SLIP ROAD to the car park's tube (in the circuit's frame): PIN slots, PTUBE_M metres to the left by the mouth; asphalt beside the circuit only, a rail on its left, one on its right once it has left
    { const PN = NC.PIN || 3, PT = NC.PTUBE_M || 12; NeonAvenue.psh = t => PT * e(Math.max(0, Math.min(1, t)));
      for (let k = 0; k < PN; k++) props['pkSlip' + k] = () => { const P = [], n = 8;
        for (let a = 0; a < n; a++) { const f0 = a / n, f1 = (a + 1) / n, x0 = -NeonAvenue.psh((k + f0) / PN), x1 = -NeonAvenue.psh((k + f1) / PN), z0 = 6.1 - f0 * 12.2, z1 = 6.1 - f1 * 12.2, xm = (x0 + x1) / 2, zm = (z0 + z1) / 2, len = Math.hypot(x1 - x0, z1 - z0) + 0.06, ry = Math.atan2(x0 - x1, z0 - z1);
          const xr = Math.min(xm + 3.6, -3.62), xl = xm - 3.6; if (xr > xl + 0.2) P.push(Kit.box(xr - xl, 0.03, len, (xl + xr) / 2, 0.03, zm, '#4a4d58', { ry: xr < xm + 3.6 ? 0 : ry }));
          P.push(Kit.box(0.25, 0.75, len, xm - 3.75, 0, zm, '#5a4ad8', { ry }), Kit.box(0.27, 0.08, len, xm - 3.75, 0.75, zm, '#8f7bff', { glow: true, ry }));
          if (xm - 3.1 < -3.9) P.push(Kit.box(0.14, 0.02, len, xm - 3.1, 0.06, zm, '#ffffff', { ry }));
          if (xm + 3.75 < -4.3) P.push(Kit.box(0.25, 0.75, len, xm + 3.75, 0, zm, '#5a4ad8', { ry }), Kit.box(0.27, 0.08, len, xm + 3.75, 0.75, zm, '#8f7bff', { glow: true, ry }), Kit.box(0.14, 0.02, len, xm + 3.1, 0.06, zm, '#ffffff', { ry })); }
        return Kit.merge(P); };
      props.pkMainRoad = () => Kit.merge([Kit.box(7.2, 0.05, 12.3, 0, 0, 0, '#4a4d58'), Kit.box(0.14, 0.02, 12.3, -3.1, 0.05, 0, '#ffffff'), Kit.box(0.14, 0.02, 12.3, 3.1, 0.05, 0, '#ffffff'), Kit.box(0.12, 0.02, 3, -1.1, 0.05, -3, '#ffffff'), Kit.box(0.12, 0.02, 3, 1.1, 0.05, -3, '#ffffff')]); }
    // THE SIDE ROAD (the user: a second road at the car park's entrance, beyond the rail, along the buildings and through the park, back on the circuit at the end; "neon asphalt"):
    // NEON_CORNER.sideM. sdRoad/sdRoadC: one slot of it in ITS OWN frame (C: longer, for the bends); sdSlip k: its first slots in the CIRCUIT's frame (the fork seen before the choice)
    { const AS = '#1d2550', road = len => () => { const P = [Kit.box(7.5, 0.08, len, 0, 0, 0, AS), Kit.box(0.16, 0.05, len, -3.6, 0.08, 0, C.cyan, { glow: true }), Kit.box(0.16, 0.05, len, 3.6, 0.08, 0, C.pink, { glow: true })];
        for (const x of [-1.1, 1.1]) for (const z of [-3, 3]) P.push(Kit.box(0.12, 0.02, 2.4, x, 0.08, z, '#9ff4ff', { glow: true })); return Kit.merge(P); };
      props.sdRoad = road(12.3); props.sdRoadC = road(13.6);
      if (NC.sideM) for (let k = 0; k < (NC.PIN || 3) + 3; k++) props['sdSlip' + k] = () => { const P = [], n = 8, PN = NC.PIN || 3;
        for (let a = 0; a < n; a++) { const f0 = a / n, f1 = (a + 1) / n, x0 = NC.sideM(k - PN + f0), x1 = NC.sideM(k - PN + f1), z0 = 6.1 - f0 * 12.2, z1 = 6.1 - f1 * 12.2, xm = (x0 + x1) / 2, zm = (z0 + z1) / 2, len = Math.hypot(x1 - x0, z1 - z0) + 0.06, ry = Math.atan2(x0 - x1, z0 - z1);
          const xl = Math.max(xm - 3.75, 3.62), xr = xm + 3.75; if (xr > xl + 0.2) P.push(Kit.box(xr - xl, 0.04, len, (xl + xr) / 2, 0.03, zm, AS, { ry: xl > xm - 3.75 ? 0 : ry }));
          P.push(Kit.box(0.16, 0.05, len, xm + 3.6, 0.07, zm, C.pink, { glow: true, ry }));
          if (xm - 3.6 > 4.0) P.push(Kit.box(0.16, 0.05, len, xm - 3.6, 0.07, zm, C.cyan, { glow: true, ry }));
          if (a % 4 === 1) for (const x of [-1.1, 1.1]) if (xm + x > 4.0) P.push(Kit.box(0.12, 0.02, len * 1.4, xm + x, 0.07, zm, '#9ff4ff', { glow: true, ry })); }
        return Kit.merge(P); }; }
    // THE GLASS BRANCH of the side road (the user: "a glass ramp that passes through the centre of these towers"), NEON_CORNER.glassW / glassH: slot k of it in the CIRCUIT's frame, at its
    // true heights (it stands there whoever rides it): a glass deck one lane wide, glass skirts, a pink light along each edge and a cyan one under it, a pillar every other slot
    if (NC.glassW) { const G0 = NC.GQ, GN = NC.CANYON + NC.DOWN - G0;
      for (let k = 0; k < GN; k++) props['sgRamp' + k] = () => { const n = 8, X = 1.75, LL = 12.25, parts = [], sk = [], q = G0 + k, Hm = f => Math.max(0.1, NC.glassH(q + f) / 10);
        for (let a = 0; a < n; a++) { const f0 = a / n, f1 = (a + 1) / n, x0 = NC.glassW(q + f0), x1 = NC.glassW(q + f1), y0 = Hm(f0), y1 = Hm(f1), z0 = LL / 2 - f0 * LL, z1 = LL / 2 - f1 * LL, xm = (x0 + x1) / 2, ym = (y0 + y1) / 2, zm = (z0 + z1) / 2;
          if (y0 < 0.15 && y1 < 0.15 && Math.min(x0, x1) - X < 3.7) continue;                                                             // (no glass over the circuit's asphalt, where the ramp has landed)
          const len = Math.hypot(x1 - x0, y1 - y0, z1 - z0) + 0.04, rx = Math.atan2(y1 - y0, z0 - z1), ry = Math.atan2(x0 - x1, z0 - z1), h0 = Math.min(2.5, y0), h1 = Math.min(2.5, y1);
          sk.push(NeonAvenue.plain([x0 - X, y0, z0], [x0 + X, y0, z0], [x1 + X, y1, z1], [x1 - X, y1, z1]));
          for (const s of [-1, 1]) { sk.push(NeonAvenue.plain([x0 + s * X, y0, z0], [x1 + s * X, y1, z1], [x1 + s * X, y1 - h1, z1], [x0 + s * X, y0 - h0, z0]));
            parts.push(Kit.box(0.12, 0.12, len, xm + s * (X + 0.1), ym - 0.02, zm, s < 0 ? C.cyan : C.pink, { glow: true, rx, ry }));
            if (ym > 1) parts.push(Kit.box(0.2, 0.6, len, xm + s * (X + 0.2), ym - 0.3, zm, '#2a2f6a', { rx, ry }));
            if (ym > 2.9) parts.push(Kit.box(0.1, 0.1, len, xm + s * (X + 0.05), ym - 2.4, zm, s < 0 ? C.pink : C.cyan, { glow: true, rx, ry })); }
          if (a % 2 === 0) parts.push(Kit.box(0.1, 0.03, len * 0.6, xm, ym + 0.01, zm, C.cyan, { glow: true, rx, ry }));
          parts.push(Kit.box(2 * X, 0.04, 0.06, x0, y0 - 0.01, z0, '#9ff4ff', { glow: true, ry }));
          if (a === n / 2 && k % 2 === 0 && y0 > 2.5) parts.push(Kit.box(1.0, y0 - 0.4, 1.0, x0, 0, z0, C.pillar), Kit.box(2 * X + 0.4, 0.4, 1.2, x0, y0 - 0.45, z0, C.pillar), Kit.box(1.1, 0.12, 1.1, x0, 1.2, z0, C.pink, { glow: true })); }
        return tex(parts, sk, () => NeonAvenue.glassMaterial()); }; }
    props.pkHallEnd = () => Kit.merge([Kit.box(HW + X0, CH, 0.3, (X0 - HW) / 2, 0, -6.0, WALL), Kit.box(HW - X1, CH, 0.3, (X1 + HW) / 2, 0, -6.0, WALL), Kit.box(XW, 0.12, 0.34, XM, CH - 0.12, -6.0, C.cyan, { glow: true }),
      Kit.box(1.5, 0.5, 0.1, -4.75, CH - 0.9, -5.8, '#3aa878', { glow: true }), Kit.box(2.6, 0.5, 0.1, 0, CH - 0.9, -5.8, '#3a7bd8', { glow: true })]);
    const TINT = [['#0b0b10', '#121219'], ['#0a0f1c', '#101829'], ['#140a18', '#1d1024'], ['#0a1411', '#0f1d18'], ['#0b0b10', '#131320']];
    const floorHole = (y, tint) => { const P = [], T = 3.05, W = 60, sx = -(D - OFF), [a, b] = TINT[tint];                                 // the avenue's tiled floor (cnFloor's grid), open over the trench
      for (let x = -W / 2; x < W / 2 - 0.01; x += T) for (let z = -L / 2; z < L / 2 - 0.01; z += T * 1.02) { const odd = (Math.round(x / T) + Math.round(z / T)) & 1, dz = Math.min(T, L / 2 - z);
        for (const [u0, u1] of [[x + sx, Math.min(x + T + sx, X0)], [Math.max(x + sx, X1), x + T + sx]]) if (u1 - u0 > 0.12) P.push(Kit.box(u1 - u0 - 0.06, 0.04, dz - 0.06, (u0 + u1) / 2, y, z + dz / 2, odd ? a : b)); }
      const xl = sx - W / 2, xr = sx + W / 2; P.push(Kit.box(X0 - xl, 0.02, L, (X0 + xl) / 2, y - 0.02, 0, '#2a2a3a'), Kit.box(xr - X1, 0.02, L, (X1 + xr) / 2, y - 0.02, 0, '#2a2a3a')); return P; };
    const rim = (y, k) => { const P = []; for (const [x, col] of [[X0 + 0.15, C.pink], [X1 - 0.15, C.cyan]]) P.push(Kit.box(0.34, 0.1, L, x, y, 0, col, { glow: true }), Kit.box(0.1, 1.0, L, x, y + 0.1, 0, '#5a4ad8'), Kit.box(0.14, 0.08, L, x, y + 1.1, 0, '#8f7bff', { glow: true }));
      if (k === 0) P.push(Kit.box(XW, 1.0, 0.1, XM, y + 0.1, 6.0, '#5a4ad8'), Kit.box(XW, 0.08, 0.14, XM, y + 1.1, 6.0, '#8f7bff', { glow: true })); return P; };
    for (let k = 0; k < PR; k++) { const tint = Math.floor((NC.DIVE + NC.PARK + k) / 17) % 5;
      props['pkRise' + k] = () => { const g0 = gy(k, 0.5), ry = f => g0 - gy(k, f), m = 8, P = [...floorHole(g0 - 0.04, tint), ...rim(g0, k)];
        for (let a = 0; a < m; a++) { const f0 = a / m, f1 = (a + 1) / m, z0 = L / 2 - f0 * L, z1 = L / 2 - f1 * L, y0 = ry(f0), y1 = ry(f1), len = Math.hypot(z1 - z0, y1 - y0) + 0.02, rx = Math.atan2(y1 - y0, z0 - z1), ym = (y0 + y1) / 2, zm = (z0 + z1) / 2;
          P.push(Kit.box(7.4, 0.2, len, 0, ym - 0.2, zm, SLAB, { rx }), Kit.box(0.14, 0.02, len, -3.4, ym + 0.005, zm, '#ffffff', { rx }), Kit.box(0.14, 0.02, len, 3.4, ym + 0.005, zm, '#ffffff', { rx }), Kit.box(0.08, 0.08, len, -3.72, ym + 0.95, zm, C.cyan, { glow: true, rx }));
          if (a % 2 === 0) P.push(Kit.box(0.12, 0.02, len * 0.6, 0, ym + 0.005, zm, '#ffffff', { rx }));
          for (const x of [X0 + 0.15, X1 - 0.15]) if (g0 - y0 > 0.05) P.push(Kit.box(0.3, g0 - y0 + 0.4, L / m + 0.02, x, y0 - 0.4, zm, WALL)); }
        const n = 20; for (let a = 0; a < n; a++) { const y0 = ry(a / n), y1 = ry((a + 1) / n); P.push(Kit.box(1.8, 0.4 + y1 - y0, L / n + 0.01, -4.65, y0 - 0.4, L / 2 - (a + 0.5) * L / n, a % 2 ? '#8e929c' : '#a4a8b2')); }      // the stairs
        if (k === 0) P.push(Kit.box(XW, Math.max(0.1, PD - CH), 0.3, XM, ry(0) + CH, 6.0, WALL));
        return Kit.merge(P); };
      // the same opening seen from the high road: its lit rim, its guard rails, the dark way down (the ramp's top in the last slot)
      props['pkTop' + k] = () => Kit.merge([...rim(0, k), Kit.box(XW - 0.3, 0.03, L, XM, 0.045, 0, k === PR - 1 ? SLAB : k === PR - 2 ? '#1c1e26' : '#050507'), ...(k >= PR - 2 ? [Kit.box(0.14, 0.02, L, -3.4, 0.08, 0, '#ffffff'), Kit.box(0.14, 0.02, L, 3.4, 0.08, 0, '#ffffff'), Kit.box(1.8, 0.03, L, -4.65, 0.08, 0, '#a4a8b2')] : [])]); }
    // the runner's own lane on the tiles after the ramp, the circuit without its left barrier (the slip road opens into it), the car park's sign
    props.pkLane = () => Kit.merge([Kit.box(0.14, 0.02, L, -3.4, 0.03, 0, '#ffffff'), Kit.box(0.14, 0.02, L, 3.4, 0.03, 0, '#ffffff'), Kit.box(0.12, 0.02, 3, 0, 0.03, -3, '#ffffff')]);
    props.cnMainRoadBareR = () => Kit.merge([Kit.box(0.12, 0.02, 3, -1.1, 0.03, -3, '#ffffff'), Kit.box(0.12, 0.02, 3, 1.1, 0.03, -3, '#ffffff')]);
    props.sdSign = () => { const P = [Kit.box(0.14, 3.2, 0.14, 0, 0, 0, '#c9d2e0'), Kit.box(2.3, 2.3, 0.1, 0, 3.2, 0, '#12203a')];      // (the side road's sign: two cyan arrows to the right on a dark panel with a pink rim, readable from both faces)
      for (const s of [1, -1]) { P.push(Kit.box(2.1, 2.1, 0.02, 0, 3.3, s * 0.06, '#1d2550', { glow: true }), Kit.box(2.3, 0.1, 0.02, 0, 3.2, s * 0.07, '#ff5ad8', { glow: true }), Kit.box(2.3, 0.1, 0.02, 0, 5.4, s * 0.07, '#ff5ad8', { glow: true }));
        for (const y of [3.75, 4.65]) for (const [w, h, x, yy, rz] of [[1.2, 0.16, -0.05, y + 0.1, 0], [0.16, 0.6, 0.42, y - 0.02, 0.8], [0.16, 0.6, 0.42, y - 0.3, -0.8]]) P.push(Kit.box(w, h, 0.02, s * x, yy, s * 0.09, '#9ff4ff', { glow: true, rz: s * rz })); }
      return Kit.merge(P); };
    props.pkSign = () => { const P = [Kit.box(0.14, 3.2, 0.14, 0, 0, 0, '#c9d2e0'), Kit.box(1.7, 2.3, 0.1, 0, 3.2, 0, '#1f5fd0')];      // (a blue panel, a white P and an arrow to the left, readable from both faces)
      for (const s of [1, -1]) { P.push(Kit.box(1.5, 2.1, 0.02, 0, 3.3, s * 0.06, '#2f7bff', { glow: true }));
        for (const [w, h, x, y, rz] of [[0.16, 0.9, -0.25, 4.3, 0], [0.5, 0.14, 0, 5.06, 0], [0.5, 0.14, 0, 4.66, 0], [0.14, 0.5, 0.25, 4.68, 0], [0.9, 0.14, 0.05, 3.7, 0], [0.14, 0.5, -0.3, 3.62, 0.8], [0.14, 0.5, -0.3, 3.4, -0.8]]) P.push(Kit.box(w, h, 0.02, s * x, y, s * 0.09, '#ffffff', { glow: true, rz: s * rz })); }
      return Kit.merge(P); };
    // a prop bent sideways along its slot: x moved by f(z) - f(0)
    const shearX = (m, f) => { const c = f(0), sh = g => { if (!g || !g.attributes || !g.attributes.position) return; const P = g.attributes.position; for (let i = 0; i < P.count; i++) P.setX(i, P.getX(i) + f(P.getZ(i)) - c); P.needsUpdate = true; g.computeBoundingSphere(); g.computeBoundingBox(); };
      sh(m.lit); sh(m.glow); if (m.merged) { sh(m.merged.lit); sh(m.merged.glow); } sh(m.sprite); return m; };
    const xs = t => OFF * (1 - e(Math.max(0, Math.min(1, t)))), BENT = ['cnGlass', 'cnWall', 'cnRail', 'cnGlassN', 'ftStreet', 'cnMainRoadBareR'];
    for (let k = 0; k < PM; k++) for (const nm of BENT) props['pk' + nm + k] = () => shearX(props[nm](), z => xs((k + (L / 2 - z) / L) / PM));
    for (let k = 0; k < NC.DOWN; k++) props['pkGlassD' + k] = () => shearX(rampSides(k, NC.DOWN, -1), z => -NeonAvenue.shift(1 - (k + (L / 2 - z) / L) / NC.DOWN));
    // slot q of the car park's way (from the end of the way down in the tunnel to the end of the avenue's way down)
    NeonAvenue.park = (q, rnd) => { const h0 = NC.DIVE, r0 = h0 + NC.PARK, m0 = r0 + PR, g1 = m0 + PM, CN = NC.CANYON, DN = NC.DOWN, solo = o => { for (const p of o) p.solo = true; return o; };
      if (q < r0) { const j = q - h0, o = [{ prop: j % 2 ? 'pkHallB' : 'pkHallA', x: 0.001, dist: 6 }]; if (j === 0) o.push({ prop: 'pkHallIn', x: 0.001, dist: 6 }); if (j === NC.PARK - 1) o.push({ prop: 'pkHallEnd', x: 0.001, dist: 6 }); return solo(o); }
      if (q < m0) { const k = q - r0, o = [{ prop: 'pkRise' + k, x: 0.001, dist: 6 }];                                                    // the ramp: the avenue stands around the trench, at the tiled floor's height
        for (const p of NeonAvenue.layout(q, rnd, HM)) if (!/^(cnFloor|pkTop)/.test(p.prop)) o.push(Object.assign(p, { x: p.x - (D - OFF), dy: (p.dy || 0) + HM + gy(k, p.dist / 12) }));
        return solo(o); }
      if (q < g1) { const k = q - m0, x1 = xs((k + 0.5) / PM), o = [{ prop: 'pkLane', x: 0.001, dist: 6 }];                              // the slip road
        for (const p of NeonAvenue.layout(q, rnd, HM)) { if (/^pkTop/.test(p.prop)) continue; if (p.prop === 'cnMainRoadBare') p.prop = 'cnMainRoadBareR'; if (BENT.includes(p.prop)) p.prop = 'pk' + p.prop + k; o.push(Object.assign(p, { x: p.x - D + x1, dy: (p.dy || 0) + HM })); }
        return solo(o); }
      if (q < CN) return solo(NeonAvenue.layout(q, rnd, HM).map(p => Object.assign(p, { x: p.x - D, dy: (p.dy || 0) + HM })));          // the circuit on the ground, under the avenue's right side
      const k = q - CN, Hk = d => HM * (1 - e(Math.max(0, Math.min(1, (k + d / 12) / DN)))), sh = d => NeonAvenue.shift(1 - (k + d / 12) / DN);      // the avenue's way down, seen from the circuit it comes down to
      return solo(NeonAvenue.layout(q, rnd, Hk(6)).map(p => { if (/^cnGlassD/.test(p.prop)) p.prop = 'pkGlassD' + k; if (/^cnMainRoadD/.test(p.prop)) return { prop: 'cnMainRoadBare', x: 0.001, dist: 6 }; return Object.assign(p, { x: p.x - sh(p.dist), dy: (p.dy || 0) + Hk(p.dist) }); })); };
    // slot q of THE SIDE ROAD's way (the runner's road is NEON_CORNER.sideM metres to the right of the circuit on the ground; everything else stands where it stood)
    NeonAvenue.side = (q, rnd, glass) => { const CN = NC.CANYON, DN = NC.DOWN, PT = NC.PTUBE_M || 12, gl = !!(glass && NC.glassM && q >= NC.GQ), S = f => gl ? NC.glassM(f) : NC.sideM(f), s0 = S(q), s1 = S(q + 1), bend = Math.abs(s1 - s0) > 0.01; let o;
      if (q < CN) o = NeonAvenue.layout(q, rnd, HM).map(p => Object.assign(p, { x: p.x - D, dy: (p.dy || 0) + HM }));
      else { const k = q - CN, Hk = d => HM * (1 - e(Math.max(0, Math.min(1, (k + d / 12) / DN)))), sh = d => NeonAvenue.shift(1 - (k + d / 12) / DN);
        o = NeonAvenue.layout(q, rnd, Hk(6)).map(p => { if (/^cnGlassD/.test(p.prop)) p.prop = 'pkGlassD' + k; if (/^cnMainRoadD/.test(p.prop)) return { prop: 'cnMainRoadBare', x: 0.001, dist: 6 }; return Object.assign(p, { x: p.x - sh(p.dist), dy: (p.dy || 0) + Hk(p.dist) }); });
        if (q <= CN + 3) o = o.filter(p => !TW.includes(p.prop) || p.x < 0); }
      const mid = Math.floor((15 + CN) / 2), swing = (q >= mid - 9 && q <= mid - 5) || (q >= mid + 5 && q <= mid + 9), open = (q >= mid - 9 && q <= mid - 7) || (q >= mid + 7 && q <= mid + 9), inPark = Math.abs(q - mid) <= 4;
      if (swing) { o = o.filter(p => !/^ftStation/.test(p.prop)); for (const p of o) if (/^ft(Green|Plain)/.test(p.prop)) p.x = 62; }      // (the user: the buildings step back where the road swings to the park)
      if (NC.glassW && q === CN - 2) { o = o.filter(p => !/^ftStation/.test(p.prop)); for (const p of o) if (/^ft(Green|Plain)/.test(p.prop)) p.x = 72; }      // (the glass branch curves out through this tower's place: it steps back behind the far row)
      for (const p of o) {
        if (p.prop === 'ftStreet' && !inPark) p.prop = open ? 'sdStreetO' : swing ? 'ftStreet' : q >= CN - 3 && q <= CN - 2 ? 'sdStreetL' : 'sdStreet';
        if (p.prop === 'ftParkA') p.prop = 'sdParkA'; if (p.prop === 'ftParkB') p.prop = 'sdParkB';
        if (p.prop === 'cnRail' && (q === 0 || q === CN - 1)) p.prop = 'cnRailSpan'; }
      if (q < 3) { o.push({ prop: 'pkTubeDv' + q, x: -PT, dist: 6, rotY: Math.PI }); if (q === 0) o.push({ prop: 'pkTubeMouth', x: -PT, dist: 6, rotY: Math.PI }); }
      if (q >= 4 && q <= 14 && q % 2 === 0) o.push({ prop: 'cnPlanter', x: 31.4, dist: 6 });                                         // (green beside the road before the street begins)
      if (NC.glassW && q >= NC.GQ) for (const p of o) if (p.prop === 'ftStationF') p.prop = 'ftStationG';
      if (NC.glassW && q >= NC.GQ) o.push({ prop: 'sgRamp' + (q - NC.GQ), x: 0.001, dist: 6 });                                              // THE GLASS BRANCH, standing where it stands
      if (gl) { const a0 = NC.sideM(q), a1 = NC.sideM(q + 1); o.push({ prop: Math.abs(a1 - a0) > 0.01 ? 'sdRoadC' : 'sdRoad', x: (a0 + a1) / 2 || 0.001, dist: 6, rotY: -Math.atan((a1 - a0) / 12) });      // (from the glass, the side road stays below)
        for (const p of o) p.dy = (p.dy || 0) - NC.glassH(q + p.dist / 12) / 10; }
      for (const p of o) { const nx = p.x - (s0 + (s1 - s0) * p.dist / 12); if ((p.x < 0) !== (nx < 0)) p.rotY = (p.rotY || 0) + Math.PI; p.x = nx || 0.001; p.rotY = (p.rotY || 0) + Math.atan((s1 - s0) / 12); }
      if (!gl) o.push({ prop: bend ? 'sdRoadC' : 'sdRoad', x: 0.001, dist: 6 });
      for (const p of o) p.solo = true; return o; };
  }
  NeonAvenue.props = props;
  if (ENV3D.neon) Object.assign(ENV3D.neon.props, props);

  // the look of the avenue: the magenta sky of the picture, an orange sun low ahead, pink fog
  ENV3D.canyon = {
    name: 'NEON AVENUE',
    sky: { top: '#5a0a48', mid: '#b8206e', horizon: '#ff9a48' },
    sunDisc: { color: '#ffd27a', size: 9 }, sunPos: [0, 6], sunGlow: 0.9,
    fog: { color: '#a8306e', near: 70, far: 280 },
    hemi: { sky: '#ffb0e8', ground: '#5a2a80', intensity: 1.9 },
    sun: { color: '#ffc8a0', intensity: 1.6, position: [0, 6, -10] },
    groundFar: '#0c0b12',      // (the tiles' black, the user)
    road: { asphalt: ['#1d2550', '#1a2148'], mark: '#9ff4ff', edge: '#ff5ad8', curb: ['#3a3f8a', '#343a80'], curbFace: '#262a66', walk: ['#2a1040', '#261038'], court: '#220c34', verge: ['#1e0a30', '#1c0a2c'] },
    innerOk: new Set(), props: {}, layout() { return []; },
  };
})();
