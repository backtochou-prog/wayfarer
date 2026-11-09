// TERRASSE GASPERI: a night detour of café terraces, from the user's photo of the Cafetería Nuevo Gasperi reimagined (2026-11-09): brick fronts with a
// bottle-green fascia and warm windows, terracotta awnings on dark bronze posts with a climbing plant, festoon bulbs, round tables with a lamp each,
// big planters, trees in a round wooden bench (green spaces in every plan). Reuses Old Town's houses, lamps and benches.
// Props are built with the road on their -x side (like the market's stalls); the renderer mirrors them on the left.
window.ENV3D = window.ENV3D || {};

(function () {
  const mod = (a, n) => ((a % n) + n) % n;
  const C = ENV3D.city, P = PAL3;
  const BRICK = '#8a4b34', BRICK_D = '#6e3a28', GREEN = '#1f3a2a', CREAM = '#f4d9a8', TERRA = '#9c3f2a', BRONZE = '#3a2b22', LEAF = '#4c8f52', LEAF_D = '#3f7a46', WARM = '#ffd27a';
  const bush = (x, y, z, s, col) => Kit.ico(s, x, y, z, col || LEAF);
  const table = (x, z) => [Kit.cyl(0.05, 0.05, 0.72, x, 0, z, BRONZE, { seg: 6 }), Kit.cyl(0.42, 0.42, 0.05, x, 0.72, z, '#d8c3a2', { seg: 10 }),
    Kit.cyl(0.05, 0.06, 0.16, x, 0.77, z, WARM, { seg: 6, glow: true }),
    Kit.box(0.4, 0.45, 0.4, x + 0.62, 0, z, TERRA), Kit.box(0.08, 0.5, 0.4, x + 0.84, 0.45, z, TERRA),
    Kit.box(0.4, 0.45, 0.4, x - 0.62, 0, z, TERRA), Kit.box(0.08, 0.5, 0.4, x - 0.84, 0.45, z, TERRA)];

  const props = {
    // the café front: a brick block, a bottle-green fascia with a cream lettering band, three warm windows and a door, a terracotta awning
    cafeFront: () => Kit.merge([
      Kit.box(4.0, 6.2, 9.0, 2.0, 0, 0, BRICK), Kit.box(0.1, 0.25, 9.0, -0.02, 2.75, 0, BRICK_D),
      Kit.box(0.2, 0.9, 8.6, -0.08, 3.0, 0, GREEN), Kit.box(0.1, 0.22, 5.2, -0.2, 3.35, 0, CREAM, { glow: true }),
      Kit.box(0.1, 1.9, 2.4, -0.04, 0.7, -2.9, WARM, { glow: true }), Kit.box(0.1, 2.3, 1.2, -0.04, 0.0, -0.8, '#ffcf8a', { glow: true }),
      Kit.box(0.1, 1.9, 2.4, -0.04, 0.7, 2.2, WARM, { glow: true }), Kit.box(0.12, 0.7, 8.6, -0.05, 0, 0, '#b8956a'),
      Kit.box(1.6, 0.1, 8.8, -0.8, 2.85, 0, TERRA, { rz: -0.22 }), Kit.box(0.06, 0.3, 8.8, -1.58, 2.5, 0, '#7a2f22'),
      ...[-3.4, 3.4].flatMap(z => [Kit.box(0.6, 0.5, 0.9, -0.4, 0, z, '#2f3a2e'), bush(-0.4, 0.75, z, 0.45)]),
    ]),
    // the terrace: two bronze posts (one with a climbing plant), a terracotta awning roof, a festoon of bulbs, two tables with chairs
    terrace: () => {
      const p = [];
      for (const z of [-2.6, 2.6]) p.push(Kit.box(0.14, 2.7, 0.14, -0.3, 0, z, BRONZE), Kit.box(0.4, 0.04, 0.4, -0.3, 0, z, '#2b2019'));
      for (let k = 0; k < 6; k++) p.push(bush(-0.3 + (k % 2 ? 0.1 : -0.1), 0.35 + k * 0.4, -2.6, 0.13, k % 2 ? LEAF : LEAF_D));
      p.push(Kit.box(3.4, 0.08, 6.0, 1.4, 2.75, 0, TERRA, { rz: -0.12 }), Kit.box(0.05, 0.28, 6.0, -0.32, 2.5, 0, '#7a2f22'));
      for (let k = 0; k < 9; k++) { const z = -2.6 + k * 0.65, sag = Math.sin(k / 8 * Math.PI) * 0.22; p.push(Kit.ico(0.07, -0.34, 2.45 - sag, z, WARM, { glow: true })); }
      p.push(...table(1.2, -1.3), ...table(1.2, 1.3));
      return Kit.merge(p);
    },
    // a big planter along the terrace: olive bush, lavender, grasses
    bigPlanter: () => Kit.merge([Kit.box(0.9, 0.6, 2.6, 0, 0, 0, '#2f3a2e'), Kit.box(0.95, 0.06, 2.65, 0, 0.6, 0, BRONZE),
      bush(0, 1.05, -0.7, 0.5, LEAF), bush(0.05, 1.2, 0.2, 0.6, LEAF_D), bush(0, 0.95, 0.9, 0.42, '#8a7ac4'), bush(-0.15, 0.85, -1.1, 0.3, '#8a7ac4')]),
    // a tree in a round wooden bench
    treeRing: () => Kit.merge([Kit.cyl(0.16, 0.2, 3.0, 0, 0, 0, '#5a4636', { seg: 6 }), Kit.ico(1.3, 0, 3.6, 0, LEAF_D), Kit.ico(0.9, 0.5, 3.0, 0.4, LEAF),
      Kit.cyl(1.0, 1.0, 0.45, 0, 0, 0, '#7b5a3f', { seg: 12 }), Kit.cyl(0.7, 0.7, 0.5, 0, 0, 0, '#3a2b20', { seg: 12 }), Kit.cyl(0.65, 0.65, 0.04, 0, 0.5, 0, '#4a6a3a', { seg: 12 })]),
    // the chalkboard of the coffee of the day
    aBoard: () => Kit.merge([Kit.box(0.08, 0.95, 0.6, -0.12, 0, 0, GREEN, { rz: 0.18 }), Kit.box(0.08, 0.95, 0.6, 0.12, 0, 0, GREEN, { rz: -0.18 }), Kit.box(0.02, 0.06, 0.4, -0.22, 0.6, 0, CREAM, { glow: true, rz: 0.18 })]),
    // the entrance arch: two bronze posts and a festoon across, with a green board
    gateTerrace: () => Kit.merge([Kit.cyl(0.1, 0.12, 3.8, 0, 0, 0, BRONZE, { seg: 6 }), Kit.box(0.08, 0.08, 2.2, 0, 3.5, 1.1, BRONZE),
      ...[0, 1, 2, 3, 4].map(k => Kit.ico(0.08, 0, 3.35 - Math.sin(k / 4 * Math.PI) * 0.15, 0.2 + k * 0.45, WARM, { glow: true })), Kit.box(0.06, 0.6, 1.0, 0, 1.3, 0.3, GREEN), Kit.box(0.07, 0.12, 0.7, 0, 1.55, 0.3, CREAM, { glow: true })]),
  };

  ENV3D.terrace = {
    name: 'TERRASSE GASPERI',
    sky: { top: '#0e1428', mid: '#2a2236', horizon: '#6a3a40' },
    sunDisc: { color: '#efe4d0', size: 2.2 }, /* a small moon */ fog: { color: '#2a2030', near: 28, far: 110 },
    hemi: { sky: '#ffd8a8', ground: '#3a2a3a', intensity: 1.3 },
    sun: { color: '#ffc88a', intensity: 1.6, position: [-6, 9, 4] },
    groundFar: '#3a3230',
    road: {                                                              // grey brick paving with a terracotta band, like the photo
      asphalt: ['#5b5550', '#54504b'], mark: '#e8c890', edge: '#b9845f',
      curb: ['#c9b8a2', '#bba892'], curbFace: '#8a7a68', walk: ['#b89a7e', '#ad8f74'], court: '#7a5a42', verge: ['#4a5a3a', '#43533a'],
    },
    innerOk: C.innerOk,
    props: Object.assign({}, C.props, props),
    entrance: 'gateTerrace',
    // Stretches: 0 terraces (café fronts, a terrace, a planter); 1 green (trees in benches, planters, houses set back); 2 mixed (houses, terraces every other slot, lamps)
    layout(i, rnd) {
      const out = [], S = Stretch.of(i, 60, 3, ['fountain', 'statue', 'clockTower']);
      for (const side of [-1, 1]) {
        const k = i * 2 + (side > 0 ? 1 : 0), r = n => rnd(k, n), lm = S.lm && S.lm.slot === i && S.lm.side === side ? S.lm.kind : null;
        const alt = mod(i + (side > 0 ? 1 : 0), 2);
        switch (mod(i, 3) === 2 ? 1 : (S.variant === 1 ? 2 : 0)) {      // two slots of terraces for one green slot, whatever the stretch
          case 0:
            if (!lm) out.push({ prop: 'cafeFront', x: side * 7.6, dist: 6 });
            out.push({ prop: 'terrace', x: side * 4.6, dist: 6 }, { prop: 'bigPlanter', x: side * 4.2, dist: 1.2 + r(1) * 0.5 });
            if (r(2) < 0.5) out.push({ prop: 'aBoard', x: side * 4.0, dist: 10.5 }); break;
          case 1:
            if (!lm) out.push({ prop: ['houseA', 'houseD'][alt], x: side * 9.5, dist: 6 });
            out.push({ prop: 'treeRing', x: side * 5.4, dist: 3 + r(1) }, { prop: 'bigPlanter', x: side * 4.4, dist: 8.5 }, { prop: 'bench', x: side * 6.0, dist: 10.5 }); break;
          default:
            if (!lm) out.push({ prop: alt ? 'cafeFront' : 'houseC', x: side * (alt ? 7.6 : 8.2), dist: 6 });
            if (alt) out.push({ prop: 'terrace', x: side * 4.6, dist: 6 }); else out.push({ prop: 'treeRing', x: side * 5.4, dist: 5 }, { prop: 'lamp', x: side * 4.0, dist: 2.5 });
            if (r(3) < 0.6) out.push({ prop: 'bigPlanter', x: side * 4.2, dist: 11 });
        }
        if (lm) out.push({ prop: lm, x: side * 9.3, dist: 6 });
      }
      return out;
    },
  };
})();
