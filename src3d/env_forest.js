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
    innerOk: new Set(['pine', 'oak', 'fbush', 'rock', 'log']),

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
      fence: () => {                                                     // rail fence, front toward -X, 4.4 m along z
        const p = [];
        for (let k = 0; k < 5; k++) p.push(Kit.box(0.14, 1.15, 0.14, 0, 0, -2.2 + k * 1.1, L.woodD));
        for (const y of [0.45, 0.85]) p.push(Kit.box(0.08, 0.1, 4.6, 0.1, y, 0, L.wood));
        return Kit.merge(p);
      },
    },

    // dense and close: 3-4 trees per side, a bush near the edge, now and then a rock / log / fence run
    layout(i, rnd) {
      const out = [], TREES = ['pine', 'pineTall', 'oak', 'pine', 'birch', 'pineTall'];
      for (const side of [-1, 1]) {
        const k = i * 2 + (side > 0 ? 1 : 0);
        const n = 3 + Math.floor(rnd(k, 31) * 2);
        for (let t = 0; t < n; t++) out.push({ prop: TREES[Math.floor(rnd(k, 40 + t) * 6)], x: side * (5.2 + rnd(k, 50 + t) * 7.5), dist: (t + rnd(k, 60 + t) * 0.8) * (12 / n) });
        out.push({ prop: 'fbush', x: side * (4.3 + rnd(k, 70) * 1.2), dist: rnd(k, 71) * 11 });
        const r = rnd(k, 72);
        if (r < 0.22) out.push({ prop: 'rock', x: side * (4.6 + rnd(k, 73) * 2.2), dist: rnd(k, 74) * 11 });
        else if (r < 0.38) out.push({ prop: 'log', x: side * (5.0 + rnd(k, 75) * 1.5), dist: 2 + rnd(k, 76) * 8 });
        else if (r < 0.55) out.push({ prop: 'fence', x: side * 4.5, dist: 4 + rnd(k, 77) * 4 });
      }
      return out;
    },
  };
})();
