// GREENWOOD: the forest biome. Same shape as ENV3D.city (colours, road palette, props, layout rule); the renderer and track
// code are untouched by adding it. Low-poly pines and broadleaf trees, bushes, rocks, logs and the occasional fence,
// set close to the road so the forest feels enclosed; cooler shadows, warm light still coming in low from the sunset.
window.ENV3D = window.ENV3D || {};

(function () {
  const L = { pineD: '#1f5a34', pineM: '#2b7a43', pineL: '#3f9a52', oakD: '#2f7a3a', oakL: '#58a84a', birch: '#cfc8b4', trunk: '#6a4a36', trunkD: '#4d3628',
              bush: '#3a8a46', bushL: '#6bb050', rock: '#8a8478', rockD: '#6a665c', moss: '#5f9a4a', wood: '#a07a4e', woodD: '#6d5236', berry: '#c43a52' };

  ENV3D.forest = {
    name: 'GREENWOOD',
    sky: { top: '#223a5e', mid: '#6a8a6e', horizon: '#e8c07a' },       // cooler zenith, the same warm glow at the horizon
    sunDisc: { color: '#ffe6b0', size: 7 },
    fog: { color: '#a8b47e', near: 22, far: 105 },                       // closer, greener fog: enclosed
    hemi: { sky: '#d6e6c0', ground: '#2c4a44', intensity: 1.45 },
    sun: { color: '#ffd596', intensity: 2.1, position: [-7, 8, 4] },
    groundFar: '#3a5f3a',
    road: {                                                              // a packed-earth track with mossy borders
      asphalt: ['#8a6a46', '#7e603f'], mark: '#6a4e34', edge: '#4f7a3a',
      curb: ['#6a9a46', '#5e8c3e'], curbFace: '#44683a', walk: ['#4a7e3c', '#427435'], court: '#3a6a30', verge: ['#3a6a34', '#33602e'],
    },
    innerOk: new Set(['pine', 'oak', 'fbush', 'rock', 'log', 'stump', 'flowers']),

    props: {
      pine: () => {                                                      // layered cone pine
        const p = [Kit.cyl(0.18, 0.26, 1.4, 0, 0, 0, L.trunk, { seg: 5 })];
        [[1.5, 2.0, 1.1, L.pineD], [2.4, 1.7, 0.9, L.pineM], [3.2, 1.35, 0.7, L.pineL], [3.9, 1.0, 0.5, L.pineM]].forEach(([y, h, r, c], i) => p.push(Kit.cone(r * 1.5, h, 0, y, 0, c, { seg: 7, ry: i })));
        return Kit.merge(p);
      },
      pineTall: () => {
        const p = [Kit.cyl(0.15, 0.22, 1.6, 0, 0, 0, L.trunk, { seg: 5 })];
        [[1.8, 2.4, 0.95, L.pineD], [3.0, 2.2, 0.8, L.pineM], [4.2, 1.9, 0.65, L.pineL], [5.2, 1.6, 0.5, L.pineM], [6.0, 1.2, 0.34, L.pineL]].forEach(([y, h, r, c], i) => p.push(Kit.cone(r * 1.5, h, 0, y, 0, c, { seg: 6, ry: i })));
        return Kit.merge(p);
      },
      oak: () => Kit.merge([
        Kit.cyl(0.22, 0.34, 2.6, 0, 0, 0, L.trunk, { seg: 6 }), Kit.box(0.5, 0.2, 0.18, 0.25, 1.9, 0, L.trunkD, { rz: 0.7 }),
        Kit.ico(1.7, 0, 3.7, 0, L.oakD, { detail: 1 }), Kit.ico(1.3, 1.1, 4.1, 0.5, L.oakL, { detail: 1 }), Kit.ico(1.2, -1.0, 3.5, -0.6, L.oakL), Kit.ico(1.0, 0.1, 4.8, -0.2, L.oakD)]),
      birch: () => Kit.merge([
        Kit.cyl(0.13, 0.17, 3.6, 0, 0, 0, L.birch, { seg: 5 }), Kit.box(0.14, 0.06, 0.2, 0, 1.2, 0, L.trunkD), Kit.box(0.14, 0.06, 0.2, 0, 2.3, 0, L.trunkD),
        Kit.ico(1.1, 0, 4.2, 0, L.oakL), Kit.ico(0.85, 0.6, 4.8, 0.3, L.oakD), Kit.ico(0.8, -0.5, 3.8, -0.3, L.oakL)]),
      fbush: () => Kit.merge([Kit.ico(0.7, 0, 0.55, 0, L.bush, { sy: 0.8, detail: 1 }), Kit.ico(0.5, 0.5, 0.45, 0.3, L.bushL, { sy: 0.8 }),
                             Kit.box(0.1, 0.1, 0.1, 0.1, 0.8, -0.5, L.berry), Kit.box(0.1, 0.1, 0.1, -0.3, 0.95, -0.4, L.berry)]),
      rock: () => Kit.merge([Kit.ico(0.9, 0, 0.5, 0, L.rock, { sy: 0.65, sx: 1.2 }), Kit.ico(0.6, 0.8, 0.3, 0.3, L.rockD, { sy: 0.7 }), Kit.ico(0.5, -0.2, 0.95, 0.1, L.moss, { sy: 0.4, sx: 1.2 })]),
      log: () => Kit.merge([Kit.cyl(0.32, 0.32, 2.2, 0, 0, 0, L.trunk, { seg: 7, rx: Math.PI / 2 }), Kit.cyl(0.33, 0.33, 0.06, 0, 0, -1.1, L.wood, { seg: 7, rx: Math.PI / 2 }),
                            Kit.cyl(0.2, 0.2, 0.08, 0, 0.5, 0.2, L.moss, { seg: 6 })]),
      // landmarks
      cabin: () => {                                                     // a log cabin set back from the track: door toward the road (-X), warm window, stone chimney
        const D = 5.2, F = 7.0, H = 3.4, p = [Kit.box(D, H, F, D / 2, 0, 0, L.trunk), Kit.box(D + 0.3, 0.3, F + 0.3, D / 2, 0, 0, L.rockD)];
        for (let y = 0.45; y < H; y += 0.4) p.push(Kit.box(0.1, 0.1, F + 0.1, -0.03, y, 0, L.trunkD), Kit.box(D + 0.1, 0.1, 0.1, D / 2, y, -F / 2 - 0.02, L.trunkD), Kit.box(D + 0.1, 0.1, 0.1, D / 2, y, F / 2 + 0.02, L.trunkD));
        p.push(Kit.roof(D + 1.2, 2.8, F + 1.2, D / 2, H, 0, '#5a3a2a'), Kit.box(0.14, 2.2, 1.1, -0.04, 0.3, -0.7, L.woodD), Kit.box(0.14, 1.0, 1.2, -0.04, 1.3, 2.0, '#ffd27a', { glow: true }),
               Kit.box(0.8, 4.4, 0.8, D * 0.78, 0.6, F * 0.3, L.rock), Kit.box(1.0, 0.25, 1.0, D * 0.78, 5.0, F * 0.3, L.rockD), Kit.box(1.4, 0.2, 2.8, -0.8, 0.3, -0.7, L.wood),
               Kit.box(0.5, 0.6, 1.8, -0.6, 0.3, 2.6, L.trunkD), Kit.box(0.5, 0.5, 1.6, -0.6, 0.9, 2.6, L.trunk));   // porch and a woodpile
        return Kit.merge(p);
      },
      giantOak: () => Kit.merge([
        Kit.cyl(0.9, 1.4, 6.0, 0, 0, 0, L.trunk, { seg: 7 }), Kit.box(0.5, 0.3, 1.4, 1.2, 0.2, 0.2, L.trunkD, { rz: 0.5 }), Kit.box(0.5, 0.3, 1.4, -1.2, 0.2, -0.3, L.trunkD, { rz: -0.5 }),
        Kit.ico(3.6, 0, 8.4, 0, L.oakD, { detail: 1 }), Kit.ico(2.7, 2.6, 9.2, 1.3, L.oakL, { detail: 1 }), Kit.ico(2.5, -2.5, 8.7, -1.2, L.oakL, { detail: 1 }), Kit.ico(2.2, 0.4, 11.2, -0.4, L.oakD, { detail: 1 })]),
      standingStones: () => {                                            // a ring of mossy slabs
        const p = [Kit.ico(3.4, 0, 0.0, 0, L.moss, { sy: 0.06, detail: 1 })];
        for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3 + 0.3, h = 3.2 + (k % 3) * 1.1; p.push(Kit.box(1.1, h, 0.7, Math.cos(a) * 3.0, 0, Math.sin(a) * 3.0, k % 2 ? L.rock : L.rockD, { ry: -a, rz: (k % 3 - 1) * 0.06 }), Kit.ico(0.55, Math.cos(a) * 3.0, h, Math.sin(a) * 3.0, L.moss, { sy: 0.5 })); }
        return Kit.merge(p);
      },
      // small roadside details
      boulder: () => Kit.merge([Kit.ico(1.6, 0, 0.9, 0, L.rock, { sy: 0.7, sx: 1.2, detail: 1 }), Kit.ico(1.0, 1.7, 0.5, 0.6, L.rockD, { sy: 0.7 }), Kit.ico(0.8, -0.2, 1.8, 0.2, L.moss, { sy: 0.4, sx: 1.3 })]),
      stump: () => Kit.merge([Kit.cyl(0.5, 0.62, 0.55, 0, 0, 0, L.trunk, { seg: 7 }), Kit.cyl(0.46, 0.46, 0.05, 0, 0.55, 0, L.wood, { seg: 7 }), Kit.ico(0.22, 0.4, 0.2, 0.4, L.moss, { sy: 0.5 })]),
      flowers: () => Kit.merge([Kit.ico(0.7, 0, 0.35, 0, L.bush, { sy: 0.5, sx: 1.4 }), ...[[-0.5, '#f2d34a'], [0.0, '#f4f0e0'], [0.45, '#e86a8a'], [0.9, '#f2d34a'], [-0.9, '#8a8ae8']].map(([z, c], n) => Kit.ico(0.14, (n % 2 - 0.5) * 0.5, 0.7 + (n % 3) * 0.06, z, c))]),
      // marks where the track changes character (entering Greenwood)
      gateWood: () => Kit.merge([
        Kit.cyl(0.18, 0.24, 3.4, 0, 0, 0, L.trunkD, { seg: 5 }), Kit.box(0.16, 0.16, 1.7, 0, 2.9, 0.8, L.woodD), Kit.box(0.04, 1.1, 0.9, 0, 1.7, 0.8, L.pineM), Kit.box(0.05, 0.12, 0.9, 0.0, 2.1, 0.8, L.pineL),
        Kit.ico(0.3, 0, 3.6, 0, L.pineL, { detail: 1 })]),
      fence: () => {                                                     // rail fence, front toward -X, 4.4 m along z
        const p = [];
        for (let k = 0; k < 5; k++) p.push(Kit.box(0.14, 1.15, 0.14, 0, 0, -2.2 + k * 1.1, L.woodD));
        for (const y of [0.45, 0.85]) p.push(Kit.box(0.08, 0.1, 4.6, 0.1, y, 0, L.wood));
        return Kit.merge(p);
      },
    },

    entrance: 'gateWood',

    // Stretches (Stretch.of) of different character, so the wood opens and closes:
    //   0 dense: 4-5 trees close to the road (enclosed)        3 grove: birch and oak, berry bushes
    //   1 clearing: open, a tree or two set far back, rocks, logs, stumps, flowers          4 rocky: boulders, rocks, a log, a few pines
    //   2 pines: tall and short pines in a stand, a fence now and then          5 pasture: a rail fence both sides, one tree far back, flowers
    // A landmark (cabin / giant oak / standing stones) sits far back on one side of one slot per stretch.
    layout(i, rnd) {
      const LMS = ['cabin', 'giantOak', 'standingStones'], out = [], TREES = ['pine', 'pineTall', 'oak', 'pine', 'birch', 'pineTall'], S = Stretch.of(i, 80, 6, LMS), S1 = Stretch.of(i - 1, 80, 6, LMS), S2 = Stretch.of(i + 1, 80, 6, LMS);
      for (const side of [-1, 1]) {
        const k = i * 2 + (side > 0 ? 1 : 0), r = n => rnd(k, n), lm = S.lm && S.lm.slot === i && S.lm.side === side ? S.lm.kind : null;
        const clear = [S, S1, S2].some(T => T.lm && T.lm.side === side && Math.abs(T.lm.slot - i) <= 1);       // a landmark keeps its footprint and the slots beside it clear of trees, so it can be seen from the road
        const trees = (n, names, x0, xr) => { for (let t = 0; t < n; t++) { const x = x0 + r(50 + t) * xr; if (clear && x > 5.6 && x < 13.5) continue; out.push({ prop: names[Math.floor(r(40 + t) * names.length)], x: side * x, dist: (t + r(60 + t) * 0.8) * (12 / n) }); } };   // (a landmark keeps its footprint clear)
        switch (S.variant) {
          case 0:
            trees(4 + Math.floor(r(31) * 2), TREES, 5.2, 7.5);
            out.push({ prop: 'fbush', x: side * (4.3 + r(70) * 1.2), dist: r(71) * 11 });
            if (r(72) < 0.22) out.push({ prop: 'rock', x: side * (4.6 + r(73) * 2.2), dist: r(74) * 11 }); else if (r(72) < 0.38) out.push({ prop: 'log', x: side * (5.0 + r(75) * 1.5), dist: 2 + r(76) * 8 }); break;
          case 1:
            trees(1 + Math.floor(r(31) * 2), ['oak', 'birch', 'oak'], 9.5, 5);
            out.push({ prop: 'rock', x: side * (5.0 + r(73) * 3), dist: r(74) * 11 }, { prop: 'fbush', x: side * (4.6 + r(70)), dist: r(71) * 11 }, { prop: r(80) < 0.5 ? 'stump' : 'log', x: side * (5.4 + r(75) * 2), dist: 1 + r(76) * 9 });
            out.push({ prop: 'flowers', x: side * (4.5 + r(77) * 1.5), dist: r(78) * 11 }); break;
          case 2:
            trees(4, ['pine', 'pineTall', 'pineTall', 'pine'], 5.0, 5.5);
            out.push({ prop: 'fbush', x: side * (4.4 + r(70)), dist: r(71) * 11 });
            if (r(72) < 0.4) out.push({ prop: 'fence', x: side * 4.5, dist: 4 + r(77) * 4 }); break;
          case 3:
            trees(3, ['birch', 'oak', 'birch'], 5.6, 5.5);
            out.push({ prop: 'fbush', x: side * (4.4 + r(70)), dist: r(71) * 5 }, { prop: 'fbush', x: side * (4.8 + r(79)), dist: 6 + r(78) * 5 });
            if (r(72) < 0.3) out.push({ prop: 'flowers', x: side * (4.5 + r(77)), dist: r(74) * 11 }); break;
          case 4:
            trees(2, ['pine', 'pineTall'], 8.5, 4);
            out.push({ prop: 'boulder', x: side * (6.0 + r(73) * 2.5), dist: 2 + r(74) * 8 }, { prop: 'rock', x: side * (4.6 + r(75) * 1.6), dist: r(76) * 11 }, { prop: 'rock', x: side * (5.4 + r(77) * 2), dist: r(78) * 11 });
            if (r(72) < 0.5) out.push({ prop: 'log', x: side * (5.0 + r(79)), dist: 2 + r(80) * 8 }); break;
          default:
            out.push({ prop: 'fence', x: side * 4.5, dist: 2.3 }, { prop: 'fence', x: side * 4.5, dist: 6.9 }, { prop: 'fence', x: side * 4.5, dist: 11.5 });
            if (r(31) < 0.6) trees(1, ['oak', 'birch'], 10, 3); out.push({ prop: 'flowers', x: side * (5.2 + r(77)), dist: r(78) * 11 });
        }
        if (lm) out.push({ prop: lm, x: side * (lm === 'cabin' ? 8.0 : lm === 'giantOak' ? 8.5 : 8.2), dist: 6 });
      }
      return out;
    },
  };
})();
