// MOSSY RUINS: the second destination added to the forks. Ancient stone under a green light: dark teal sky with a pale moon, thick green fog, a mossy cobbled road, low moss-covered walls,
// standing and broken columns, stone arches spanning the road (two halves that meet over it), glowing green lanterns, a ruined temple and an obelisk. Palette: stone grey-green, moss, deep
// teal shadows, one glowing green accent. Same shape as the other biomes; the track's `ruinsRun` branch carries the fallen wall that has to be jumped (pattern `collapsedArch`).
window.ENV3D = window.ENV3D || {};

(function () {
  const mod = (a, n) => ((a % n) + n) % n;
  const R = { stone: '#8a9482', stoneD: '#646e5e', stoneL: '#a8b29c', moss: '#4f8a45', mossD: '#355f33', mossL: '#78b060', dirt: '#3e4a3a', glow: '#7dffa8', glowD: '#3fd078', vine: '#2e6a38' };
  const SLOT = SEG_LEN;

  // a moss-capped wall, local x away from the road: a low run of stone blocks with gaps, moss on top, vines hanging on the road side
  function wall(seed, high) {
    const p = [], n = 5, w = (SLOT - 0.6) / n;
    for (let k = 0; k < n; k++) {
      const h = (high ? 2.4 : 1.3) * (0.55 + 0.45 * rnd(seed * 9 + k, 71)), br = rnd(seed * 9 + k, 72) < 0.18;                    // some blocks are broken down
      if (br) { p.push(Kit.box(0.8, 0.5, w, 0.4, 0, -SLOT / 2 + 0.3 + (k + 0.5) * w, R.stoneD)); continue; }
      p.push(Kit.box(0.9, h, w - 0.08, 0.45, 0, -SLOT / 2 + 0.3 + (k + 0.5) * w, k % 2 ? R.stone : R.stoneD), Kit.box(1.0, 0.16, w - 0.1, 0.45, h, -SLOT / 2 + 0.3 + (k + 0.5) * w, R.mossD), Kit.ico(0.42, 0.45, h + 0.2, -SLOT / 2 + 0.3 + (k + 0.5) * w, R.moss, { sy: 0.5 }));
      if (rnd(seed * 9 + k, 73) < 0.55) p.push(Kit.box(0.06, h * 0.7, 0.3, -0.05, h * 0.3, -SLOT / 2 + 0.3 + (k + 0.3) * w, R.vine), Kit.box(0.06, h * 0.45, 0.2, -0.05, h * 0.55, -SLOT / 2 + 0.3 + (k + 0.7) * w, R.mossL));
    }
    return Kit.merge(p);
  }
  const column = (h, broken) => () => { const p = [Kit.box(1.5, 0.4, 1.5, 0, 0, 0, R.stoneD), Kit.cyl(0.55, 0.62, h, 0, 0.4, 0, R.stone, { seg: 8 }), Kit.cyl(0.6, 0.6, 0.18, 0, 0.4 + h * 0.45, 0, R.mossD, { seg: 8 }), Kit.ico(0.5, 0.2, 0.55, 0.5, R.moss, { sy: 0.5 })];
    for (let k = 0; k < 4; k++) p.push(Kit.box(0.06, 0.12, 0.62, 0.0, 0.8 + h * 0.2 * k, 0, R.stoneD, { ry: k * 0.8 }));              // flutes
    if (broken) p.push(Kit.cyl(0.5, 0.55, 1.4, 1.5, 0.45, 0.8, R.stone, { rz: Math.PI / 2, seg: 8 }), Kit.box(1.1, 0.5, 1.1, 2.8, 0.0, -0.6, R.stoneD, { ry: 0.5 }));   // a drum and a block lying beside it
    else p.push(Kit.box(1.5, 0.36, 1.5, 0, 0.4 + h, 0, R.stoneL), Kit.box(0.2, 0.1, 0.2, 0.3, 0.76 + h, 0.2, R.moss));
    return Kit.merge(p); };
  // an arch half: a pillar at local x = 0 and half the lintel reaching toward the road (local -X) to the middle (4.9 m); with the half on the other side the arch closes over the road
  function archHalf() {
    const p = [Kit.box(1.6, 0.5, 1.6, 0, 0, 0, R.stoneD), Kit.box(1.0, 6.2, 1.0, 0, 0.5, 0, R.stone), Kit.box(1.3, 0.4, 1.3, 0, 6.7, 0, R.stoneL), Kit.ico(0.6, 0.3, 0.6, 0.55, R.moss, { sy: 0.5 }), Kit.box(0.08, 3.0, 0.4, -0.54, 1.8, 0.2, R.vine)];
    for (let k = 0; k < 5; k++) p.push(Kit.box(1.0 + 0.0, 0.8 - k * 0.06, 1.0, -0.5 - k * 1.0, 6.1 + k * 0.52, 0, k % 2 ? R.stone : R.stoneL, { rz: 0 }));              // the springer blocks stepping up to the keystone
    p.push(Kit.box(1.0, 0.3, 1.0, -4.5, 8.5, 0, R.mossD), Kit.box(0.4, 0.1, 0.5, -4.9, 8.2, 0, R.glow, { glow: true }), Kit.box(0.1, 1.2, 0.12, -2.4, 5.4, 0.2, R.vine), Kit.box(0.1, 0.8, 0.12, -3.6, 6.0, -0.2, R.mossL));
    return Kit.merge(p);
  }
  const lantern = () => Kit.merge([Kit.box(0.7, 0.4, 0.7, 0, 0, 0, R.stoneD), Kit.cyl(0.18, 0.24, 2.6, 0, 0.4, 0, R.stone, { seg: 6 }), Kit.box(0.7, 0.14, 0.7, 0, 3.0, 0, R.stoneL), Kit.ico(0.3, 0, 3.55, 0, R.glow, { glow: true }), Kit.cone(0.4, 0.4, 0, 3.8, 0, R.mossD, { seg: 4 }), Kit.ico(0.3, 0.2, 0.45, 0.2, R.moss, { sy: 0.6 })]);
  const blocks = () => Kit.merge([Kit.box(1.8, 1.0, 1.4, 0, 0, 0, R.stone, { ry: 0.3 }), Kit.box(1.3, 0.8, 1.1, 1.9, 0, 0.9, R.stoneD, { ry: -0.4 }), Kit.box(1.0, 0.6, 1.0, 0.4, 1.0, 0.1, R.stoneL, { ry: 0.8 }), Kit.ico(0.7, 0.2, 1.7, 0, R.moss, { sy: 0.4 })]);
  const ivy = () => Kit.merge([0, 1, 2, 3, 4].map(k => Kit.cone(0.12, 0.7 + rnd(k, 51) * 0.8, Math.cos(k * 1.3) * 0.5, 0, Math.sin(k * 1.3) * 0.5, k % 2 ? R.mossL : R.moss, { seg: 4, rx: (rnd(k, 52) - 0.5) * 0.7, rz: (rnd(k, 53) - 0.5) * 0.7 })).concat([Kit.ico(0.5, 0, 0.2, 0, R.mossD, { sy: 0.4 })]));
  const patch = (w, d) => () => Kit.merge([Kit.box(w, 0.04, d, 0, 0, 0, R.mossD), Kit.box(w * 0.6, 0.06, d * 0.6, w * 0.1, 0, 0.1, R.moss), Kit.box(w * 0.3, 0.07, d * 0.3, -w * 0.2, 0, -0.1, R.mossL)]);

  ENV3D.ruins = {
    name: 'MOSSY RUINS',
    sky: { top: '#0b1f1c', mid: '#1f5240', horizon: '#7fd0a0' },
    sunDisc: { color: '#e8ffe0', size: 7 },
    sunPos: [26, 22],                                                  // a pale moon, high and a little to the right
    sunGlow: 0.55,
    fog: { color: '#2d6a52', near: 16, far: 92 },
    hemi: { sky: '#9fe8c0', ground: '#1c2e24', intensity: 1.25 },
    sun: { color: '#b8ffd0', intensity: 1.7, position: [-4, 9, 3] },
    groundFar: '#2a4a32',

    road: { asphalt: ['#4b5a48', '#44523f'], mark: '#7a8f6a', edge: '#5e9a5a', curb: ['#808b78', '#747f6c'], curbFace: '#5a6552', walk: ['#5d6b55', '#566450'], court: '#4a5a44', verge: ['#2f4f2f', '#2a472b'] },
    innerOk: new Set(['lantern', 'ivy', 'patchA', 'patchB', 'columnLow', 'oak', 'fbush']),

    props: {
      wallLow: () => wall(1, false), wallHigh: () => wall(2, true), wallLowB: () => wall(3, false),
      column: column(6.2, false), columnLow: column(3.4, true), columnTall: column(8.4, false),
      archHalf: archHalf, lantern: lantern, blocks: blocks, ivy: ivy, patchA: patch(3.4, 3.8), patchB: patch(2.4, 5.6),
      // landmarks (at most one per stretch and side)
      ruinTemple: () => { const p = [Kit.box(8, 0.5, 14, 4, 0, 0, R.stoneD), Kit.box(7, 0.5, 13, 4, 0.5, 0, R.stone), Kit.box(5, 0.5, 12, 4.4, 1.0, 0, R.stoneD)];
        [-4.5, -1.5, 1.5, 4.5].forEach((z, k) => { const h = k === 2 ? 3.2 : 6.4; p.push(Kit.cyl(0.62, 0.7, h, 1.2, 1.5, z, R.stone, { seg: 8 }), Kit.box(1.5, 0.3, 1.5, 1.2, 1.5 + h, z, R.stoneL), Kit.ico(0.5, 1.5, 1.7, z + 0.5, R.moss, { sy: 0.5 })); });
        p.push(Kit.box(1.5, 0.8, 5.6, 1.2, 8.2, -3.0, R.stone), Kit.box(1.2, 0.5, 4.2, 1.2, 9.0, -3.0, R.stoneL), Kit.box(5, 5.2, 10, 6.5, 1.5, 0, R.stoneD), Kit.box(0.12, 2.6, 1.8, 3.9, 1.5, 0, R.glow, { glow: true }), Kit.box(0.2, 0.3, 2.2, 3.8, 4.2, 0, R.glow, { glow: true }), Kit.ico(1.3, 3.0, 7.2, 4.5, R.mossD, { sy: 0.5 }));
        return Kit.merge(p); },
      obelisk: () => { const p = [Kit.box(4.2, 0.6, 4.2, 0, 0, 0, R.stoneD), Kit.box(3.4, 0.5, 3.4, 0, 0.6, 0, R.stone)];
        for (let k = 0; k < 5; k++) p.push(Kit.box(1.9 - k * 0.22, 2.2, 1.9 - k * 0.22, 0, 1.1 + k * 2.2, 0, k % 2 ? R.stone : R.stoneL));
        p.push(Kit.cone(0.8, 1.6, 0, 12.1, 0, R.stoneL, { seg: 4, ry: Math.PI / 4 }), Kit.cone(0.2, 0.7, 0, 13.7, 0, R.glow, { seg: 4, glow: true, ry: Math.PI / 4 }));
        for (let k = 0; k < 4; k++) p.push(Kit.box(0.1, 0.6, 0.1, -0.96 + 0.0, 2.2 + k * 2.1, -0.4 + (k % 2) * 0.5, R.glow, { glow: true }), Kit.ico(0.9, 1.2, 0.5, 1.2, R.mossD, { sy: 0.5 }));
        return Kit.merge(p); },
      gateRuins: () => Kit.merge([Kit.box(0.8, 0.4, 0.8, 0, 0, 0, R.stoneD), Kit.box(0.5, 2.8, 0.5, 0, 0.4, 0, R.stone), Kit.box(0.7, 0.3, 0.7, 0, 3.2, 0, R.stoneL), Kit.ico(0.2, -0.4, 2.6, 0.2, R.glow, { glow: true }), Kit.ico(0.3, 0.2, 0.45, 0.2, R.moss, { sy: 0.6 })]),
    },

    entrance: 'gateRuins',

    // Four characters of stretch (Stretch.of), mostly enclosed and dim, with one open plaza:
    //   0 corridor: moss walls both sides, columns between           2 arches: stone arches over the road every other slot, columns and lanterns between
    //   1 overgrown: sparse oaks and bushes, ivy, broken columns, moss patches     3 plaza: open; broken columns, fallen blocks, lanterns, moss patches
    // A landmark (ruined temple / obelisk) sits back on one side of one slot per stretch.
    layout(i, rnd) {
      const out = [], S = Stretch.of(i, 190, 4, ['ruinTemple', 'obelisk']), WALLS = ['wallLow', 'wallHigh', 'wallLowB'];
      for (const side of [-1, 1]) {
        const k = i * 2 + (side > 0 ? 1 : 0), r = n => rnd(k, n), lm = S.lm && S.lm.slot === i && S.lm.side === side ? S.lm.kind : null;
        const near = [S, Stretch.of(i - 1, 190, 4, ['ruinTemple', 'obelisk']), Stretch.of(i + 1, 190, 4, ['ruinTemple', 'obelisk'])].some(T => T.lm && T.lm.side === side && Math.abs(T.lm.slot - i) <= 1);     // keep the landmark's footprint clear
        const put = (prop, x, dist) => { if (!near || x < 5.6) out.push({ prop, x: side * x, dist }); };
        switch (S.variant) {
          case 0: put(WALLS[mod(i + (side > 0 ? 1 : 0) + S.b, 3)], 5.6 + r(1) * 0.6, 6); if (mod(i, 2) === (side > 0 ? 1 : 0)) put('column', 6.8, 2.5); else put('columnLow', 6.8, 9); if (r(2) < 0.4) put('ivy', 4.6, 3 + r(3) * 6); break;
          case 1: put('oak', 7.5 + r(1) * 5, 2 + r(2) * 8); put('fbush', 4.6 + r(3), 3 + r(4) * 8); put('ivy', 4.5 + r(5) * 1.5, 1 + r(6) * 9); put(r(7) < 0.5 ? 'columnLow' : 'blocks', 6.2 + r(8) * 2, 5 + r(9) * 5); if (r(10) < 0.5) put('patchA', 4.9, 6); break;
          case 2: if (mod(i, 2) === 0) put('archHalf', 4.9, 6); else { put('column', 5.2, 3); put('wallLow', 6.4, 8); } put('lantern', 4.3, mod(i, 2) === 0 ? 11 : 6); break;
          default: put('columnLow', 6.2 + r(1) * 3, 2 + r(2) * 8); put('blocks', 5.4 + r(3) * 2.5, 6 + r(4) * 5); if (r(5) < 0.6) put('lantern', 4.4, 3 + r(6) * 8); if (r(7) < 0.55) put('patchB', 4.7, 6); if (r(8) < 0.3) put('column', 8.5 + r(9) * 2, 6);
        }
        if (lm) out.push({ prop: lm, x: side * (lm === 'obelisk' ? 9.4 : 10.2), dist: 6 });
        if (S.variant === 0 || S.variant === 2) { if (r(20) < 0.35) out.push({ prop: 'patchA', x: side * 4.6, dist: 6 }); }
      }
      return out;
    },
  };
})();
