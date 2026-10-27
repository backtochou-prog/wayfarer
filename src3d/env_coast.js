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
      seaStrip: seaStrip,
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
})();
