// OLD TOWN: the city environment for the 3D renderer. A biome is pure data + geometry factories:
// sky/fog/light colours, a road palette, a small prop kit and a layout rule. A forest biome can be added
// later as ENV3D.forest with the same shape, without touching the renderer or the track.
window.ENV3D = window.ENV3D || {};

(function () {
  const mod = (a, n) => ((a % n) + n) % n;                        // modulo that stays >= 0 for the (negative) slot indexes at the very start
  const P = PAL3;
  const TRIM = '#efe0c0', TRIM_D = '#8a6a52', STONE = '#9c8468';

  // one townhouse (or half of a twin): facade plane at local x = 0, body toward +X, centred at z = zc
  function house(parts, o) {
    const { F, D, H, zc = 0, wall, trim = TRIM, roof = 'gable', roofCol = P.roofTile, cols = 3, shop = null, shutters = null, balcony = false, chimney = true, seed = 1 } = o;
    const GF = 3.2, FL = 2.8;                                      // ground floor and upper floor heights
    parts.push(Kit.box(D, H, F, D / 2, 0, zc, wall));                                   // body
    parts.push(Kit.box(D + 0.08, 0.5, F + 0.08, D / 2, 0, zc, TRIM_D));                // stone base
    parts.push(Kit.box(0.3, 0.22, F + 0.3, -0.05, H - 0.22, zc, trim));                // cornice
    parts.push(Kit.box(0.14, 0.14, F, -0.02, GF - 0.1, zc, trim));                      // ground-floor band
    const floors = Math.max(1, Math.floor((H - GF) / FL));
    for (let f = 0; f < floors; f++) {
      const y = GF + f * FL + 0.55;
      for (let c = 0; c < cols; c++) {
        const z = zc - F / 2 + (c + 0.5) * F / cols, lit = rnd(seed * 31 + f * 7 + c, 3) < 0.45;
        parts.push(Kit.box(0.1, 1.45, 0.95, -0.03, y, z, lit ? P.window : P.windowDark, { glow: lit }));
        parts.push(Kit.box(0.22, 0.1, 1.15, -0.08, y - 0.1, z, trim));                  // sill
        parts.push(Kit.box(0.14, 0.12, 1.05, -0.05, y + 1.45, z, trim));                // lintel
        if (shutters) for (const s of [-1, 1]) parts.push(Kit.box(0.08, 1.45, 0.32, -0.05, y, z + s * 0.66, shutters));
      }
      if (balcony && f === 0) {
        parts.push(Kit.box(0.75, 0.12, F * 0.6, -0.36, y - 0.25, zc, trim));
        parts.push(Kit.box(0.05, 0.6, F * 0.6, -0.7, y - 0.13, zc, P.lampPost));
      }
    }
    if (shop) { // shop window with a warm interior and a striped awning
      const w = F * 0.62;
      parts.push(Kit.box(0.1, 1.7, w, -0.03, 0.55, zc - F * 0.12, P.window, { glow: true }));
      parts.push(Kit.box(0.12, 2.2, 1.1, -0.03, 0, zc + F / 2 - 1.2, P.door));
      const n = 6;
      for (let k = 0; k < n; k++)
        parts.push(Kit.box(1.5, 0.08, w / n, -0.62, 2.55, zc - F * 0.12 - w / 2 + (k + 0.5) * w / n, k % 2 ? shop[1] : shop[0], { rz: 0.38 }));
    } else {
      parts.push(Kit.box(0.12, 2.3, 1.2, -0.03, 0, zc, P.door));
      parts.push(Kit.box(0.2, 0.18, 1.6, -0.06, 2.3, zc, trim));
      for (const s of [-1, 1]) parts.push(Kit.box(0.1, 1.2, 0.9, -0.03, 0.9, zc + s * F * 0.3, P.windowDark));
    }
    if (roof === 'gable') parts.push(Kit.roof(D + 0.5, Math.min(3.2, D * 0.42), F + 0.4, D / 2, H, zc, roofCol));
    else if (roof === 'steep') parts.push(Kit.roof(D + 0.4, D * 0.75, F + 0.3, D / 2, H, zc, roofCol));
    else if (roof === 'mansard') {
      parts.push(Kit.box(D - 0.4, 1.7, F - 0.2, D / 2 + 0.2, H, zc, roofCol));
      parts.push(Kit.roof(D - 1.4, 0.9, F - 0.6, D / 2 + 0.2, H + 1.7, zc, P.roofDark));
      for (let c = 0; c < cols; c++) { // dormers
        const z = zc - F / 2 + (c + 0.5) * F / cols;
        parts.push(Kit.box(0.7, 1.0, 0.9, 0.35, H + 0.25, z, roofCol));
        parts.push(Kit.box(0.08, 0.6, 0.55, -0.02, H + 0.4, z, c % 2 ? P.window : P.windowDark, { glow: c % 2 === 1 }));
        parts.push(Kit.roof(0.75, 0.35, 1.0, 0.35, H + 1.25, z, P.roofDark, { ry: Math.PI / 2 }));
      }
    } else { // flat roof with a parapet
      parts.push(Kit.box(0.3, 0.7, F, 0.15, H, zc, trim));
      parts.push(Kit.box(D, 0.5, 0.3, D / 2, H, zc - F / 2 + 0.15, trim));
      parts.push(Kit.box(D, 0.5, 0.3, D / 2, H, zc + F / 2 - 0.15, trim));
    }
    if (chimney) parts.push(Kit.box(0.55, 1.6, 0.55, D * 0.62, H + 0.4, zc + F * 0.28, P.terracottaDark));
  }
  const build = (...houses) => () => { const parts = []; for (const h of houses) house(parts, h); return Kit.merge(parts); };

  ENV3D.city = {
    name: 'OLD TOWN',
    sky: { top: '#352c66', mid: '#c46a6c', horizon: '#f7c57e' },
    sunDisc: { color: '#fff3cf', size: 7 },
    fog: { color: '#efb27c', near: 32, far: 128 },
    hemi: { sky: '#ffdcb4', ground: '#5c4262', intensity: 1.55 },
    sun: { color: '#ffcf96', intensity: 2.7, position: [-7, 9, 4] },   // low, from behind-left: lights the right-hand facades
    groundFar: '#7a6450',

    // colours for the ribbon road (Road3D): asphalt / curb / sidewalk / forecourt / verge, lane + edge markings
    road: {
      asphalt: ['#5a4f5c', '#544a56'], mark: '#f1e3c0', edge: '#e8a33d',
      curb: ['#cdb187', '#c3a77d'], curbFace: '#a8916c', walk: ['#b89f80', '#a88f72'], court: '#8f7d68', verge: ['#7a6450', '#745e4b'],
    },
    innerOk: new Set(['lamp', 'bench', 'bush', 'planter']),            // props allowed on the side facing the other road of a fork

    props: {
      houseA: build({ F: 10, D: 7, H: 9.2, wall: P.terracotta, shop: [P.stripeRed, P.stripeCream], shutters: P.teal, seed: 1 }),
      houseB: build({ F: 9.6, D: 8, H: 11.6, wall: P.cream, trim: '#f8eed8', roof: 'mansard', roofCol: P.slate, cols: 4, shutters: P.burgundy, balcony: true, chimney: false, seed: 2 }),
      houseC: build({ F: 4.8, D: 7, H: 8.8, zc: -2.5, wall: P.ochre, cols: 2, roof: 'steep', seed: 3 },
                    { F: 4.8, D: 7.5, H: 11.6, zc: 2.5, wall: P.burgundy, cols: 2, roof: 'steep', roofCol: P.roofDark, shutters: P.cream, chimney: false, seed: 4 }),
      houseD: build({ F: 10.4, D: 6.5, H: 7.4, wall: P.sand, trim: '#f3e6c8', roof: 'flat', cols: 4, shop: [P.teal, P.stripeCream], balcony: true, chimney: false, seed: 5 }),
      houseE: build({ F: 8, D: 7, H: 14.4, wall: P.burgundy, cols: 3, roof: 'steep', roofCol: P.roofTile, shutters: P.capBand, balcony: true, seed: 6 }),
      lamp: () => Kit.merge([
        Kit.box(0.32, 0.4, 0.32, 0, 0, 0, P.lampPost), Kit.cyl(0.07, 0.1, 4.0, 0, 0, 0, P.lampPost),
        Kit.box(1.0, 0.08, 0.08, -0.5, 3.86, 0, P.lampPost),
        Kit.box(0.36, 0.46, 0.36, -0.95, 3.32, 0, P.lampPost), Kit.box(0.28, 0.34, 0.28, -0.95, 3.38, 0, P.lampGlow, { glow: true }),
        Kit.cone(0.32, 0.26, -0.95, 3.78, 0, P.lampPost, { seg: 4, ry: Math.PI / 4 })]),
      tree: () => Kit.merge([
        Kit.box(1.2, 0.45, 1.2, 0, 0, 0, P.terracottaDark), Kit.box(1.0, 0.04, 1.0, 0, 0.45, 0, P.trunk),
        Kit.cyl(0.12, 0.17, 2.3, 0, 0.45, 0, P.trunk),
        Kit.ico(1.15, 0, 3.25, 0, P.leaf), Kit.ico(0.85, 0.4, 3.95, 0.35, P.leafDark), Kit.ico(0.8, -0.35, 2.95, -0.45, P.leaf, { sy: 0.85 })]),
      bush: () => Kit.merge([Kit.ico(0.55, 0, 0.42, 0, P.bush, { sy: 0.8 }), Kit.ico(0.42, 0.3, 0.4, 0.32, P.leaf, { sy: 0.85 })]),
      bench: () => Kit.merge([
        Kit.box(0.5, 0.08, 1.6, 0, 0.42, 0, P.wood), Kit.box(0.08, 0.45, 1.6, 0.24, 0.5, 0, P.wood),
        Kit.box(0.42, 0.42, 0.08, 0, 0, -0.68, P.lampPost), Kit.box(0.42, 0.42, 0.08, 0, 0, 0.68, P.lampPost)]),
      // landmarks: one per stretch at most (see Stretch), never the same kind twice in a row
      fountain: () => Kit.merge([
        Kit.cyl(2.9, 3.1, 0.8, 0, 0, 0, STONE, { seg: 14 }), Kit.cyl(2.6, 2.6, 0.06, 0, 0.8, 0, '#3d8a86', { seg: 14 }), Kit.cyl(3.0, 3.0, 0.14, 0, 0.8, 0, TRIM_D, { seg: 14 }),
        Kit.cyl(0.45, 0.65, 2.3, 0, 0.8, 0, STONE, { seg: 8 }), Kit.cyl(1.4, 0.6, 0.4, 0, 3.0, 0, STONE, { seg: 10 }), Kit.cyl(1.25, 1.25, 0.06, 0, 3.4, 0, '#6fc4c0', { seg: 10 }),
        Kit.cyl(0.16, 0.16, 1.2, 0, 3.4, 0, '#8ed8d2', { seg: 6 }), Kit.ico(0.45, 0, 4.8, 0, '#8ed8d2'), Kit.ico(0.3, 1.0, 3.9, 0, '#8ed8d2'), Kit.ico(0.3, -1.0, 3.9, 0, '#8ed8d2')]),
      clockTower: () => {                                              // a slim tower in the building line, with a lit clock face and a steep roof
        const parts = []; house(parts, { F: 3.8, D: 3.8, H: 14, wall: P.cream, trim: '#f8eed8', roof: 'steep', roofCol: P.slate, cols: 1, shutters: P.burgundy, chimney: false, seed: 9 });
        parts.push(Kit.cyl(0.85, 0.85, 0.14, -0.14, 11.4, 0, '#f8eed8', { rz: Math.PI / 2, seg: 16 }), Kit.cyl(0.7, 0.7, 0.1, -0.2, 11.4, 0, '#fff3cf', { rz: Math.PI / 2, seg: 16, glow: true }),
                   Kit.box(0.06, 0.55, 0.08, -0.28, 11.4, 0, P.lampPost), Kit.box(0.06, 0.08, 0.4, -0.28, 11.4, 0.15, P.lampPost));
        return Kit.merge(parts);
      },
      statue: () => Kit.merge([
        Kit.box(3.8, 0.6, 3.8, 0, 0, 0, STONE), Kit.box(2.0, 2.4, 2.0, 0, 0.6, 0, TRIM_D), Kit.box(2.3, 0.25, 2.3, 0, 3.0, 0, STONE), Kit.cyl(0.42, 0.55, 2.0, 0, 3.25, 0, '#5f9a82', { seg: 7 }),
        Kit.ico(0.4, 0, 5.5, 0, '#5f9a82'), Kit.box(0.18, 1.2, 0.18, 0.15, 4.0, -0.7, '#5f9a82', { rx: -0.6 }), Kit.cone(0.55, 0.9, 0.25, 5.8, 0, '#5f9a82', { seg: 6 })]),
      // street furniture and fences
      wall: () => Kit.merge([Kit.box(0.45, 0.95, 5.6, 0, 0, 0, STONE), Kit.box(0.6, 0.15, 5.7, 0, 0.95, 0, TRIM_D), Kit.box(0.7, 1.25, 0.7, 0, 0, -2.75, STONE), Kit.box(0.7, 1.25, 0.7, 0, 0, 2.75, STONE), Kit.box(0.8, 0.12, 0.8, 0, 1.25, -2.75, TRIM_D), Kit.box(0.8, 0.12, 0.8, 0, 1.25, 2.75, TRIM_D)]),
      cafe: () => Kit.merge([
        Kit.cyl(0.55, 0.55, 0.06, 0, 0.75, 0, P.cream, { seg: 8 }), Kit.cyl(0.06, 0.06, 0.75, 0, 0, 0, P.lampPost, { seg: 5 }), Kit.cyl(0.05, 0.05, 2.3, 0.0, 0, 0, P.lampPost, { seg: 5 }),
        Kit.cone(1.5, 0.55, 0, 2.3, 0, P.stripeRed, { seg: 8 }), Kit.cyl(0.22, 0.22, 0.45, 0, 0, -1.0, P.wood, { seg: 6 }), Kit.cyl(0.22, 0.22, 0.45, 0, 0, 1.0, P.wood, { seg: 6 })]),
      bollard: () => Kit.merge([-1.6, 0, 1.6].flatMap(z => [Kit.cyl(0.12, 0.15, 0.85, 0, 0, z, P.lampPost, { seg: 6 }), Kit.cyl(0.14, 0.14, 0.06, 0, 0.8, z, P.capBand, { seg: 6 })])),
      // marks where the street changes character (entering Old Town again after a detour)
      gateCity: () => Kit.merge([
        Kit.box(0.7, 3.0, 0.7, 0, 0, 0, STONE), Kit.box(0.9, 0.2, 0.9, 0, 3.0, 0, TRIM_D), Kit.roof(1.0, 0.7, 1.0, 0, 3.2, 0, P.roofDark),
        Kit.box(0.06, 0.06, 0.8, -0.5, 2.6, 0, P.lampPost), Kit.box(0.3, 0.4, 0.3, -0.5, 2.15, 0.35, P.lampGlow, { glow: true }), Kit.box(0.04, 1.1, 0.9, -0.38, 1.2, 0, P.burgundy)]),
      planter: () => Kit.merge([
        Kit.box(0.8, 0.5, 1.8, 0, 0, 0, P.terracotta), Kit.box(0.84, 0.08, 1.84, 0, 0.5, 0, TRIM),
        Kit.ico(0.32, 0, 0.75, -0.5, P.leaf), Kit.ico(0.3, 0, 0.75, 0.2, P.capBand), Kit.ico(0.28, 0, 0.72, 0.65, P.burgundy)]),
    },

    entrance: 'gateCity',

    // The street is built in stretches (Stretch.of): each has a seeded character, so the same few props are never repeated slot after slot.
    //   0 terrace: a continuous row of houses on the building line, lamps every other slot       3 shops: low shop fronts, planters, cafe tables, a lamp in every slot
    //   1 avenue: a double row of trees, houses set back further, few lamps                      4 tall: tall houses with a gap (trees, bushes, a wall) every third slot
    //   2 square: open; houses far back and only every other slot, trees, benches, bollards      5 walled: a low stone wall along the walk, houses and trees behind it
    // A landmark (fountain / clock tower / statue) replaces the house on its side of one slot per stretch. Small seeded jitter keeps spacing from looking ruled.
    layout(i, rnd) {
      const out = [], HOUSES = ['houseA', 'houseB', 'houseC', 'houseD', 'houseE'], S = Stretch.of(i, 0, 6, ['fountain', 'clockTower', 'statue']);
      for (const side of [-1, 1]) {
        const k = i * 2 + (side > 0 ? 1 : 0), r = n => rnd(k, n), lm = S.lm && S.lm.slot === i && S.lm.side === side ? S.lm.kind : null;
        const hv = (((i * 2 + (side > 0 ? 3 : 0) + Math.floor(r(12) * 2)) % 5) + 5) % 5;                         // consecutive slots step the house type by 1-3 (mod 5): neighbours differ
        const house = (prop, x, dz) => { if (!lm) out.push({ prop, x: side * x, dist: 6 + dz }); };
        const extras = () => { const e = r(14); if (e < 0.3) out.push({ prop: 'tree', x: side * 5.7, dist: 8.5 }); else if (e < 0.48) out.push({ prop: 'bench', x: side * 6.0, dist: 8.2 }); else if (e < 0.62) out.push({ prop: 'planter', x: side * 6.0, dist: 9 }); else if (e < 0.72) out.push({ prop: 'bush', x: side * 6.1, dist: 9.5 }); };
        switch (S.variant) {
          case 0:
            house(HOUSES[hv], FRONT_X + r(1) * 0.5, (r(2) - 0.5) * 0.8);
            if (mod(i + (side > 0 ? 1 : 0), 2) === 0) out.push({ prop: 'lamp', x: side * 4.0, dist: 2.5 });
            extras(); break;
          case 1:
            house(HOUSES[hv], FRONT_X + 1.3 + r(1) * 0.8, (r(2) - 0.5) * 0.8);
            out.push({ prop: 'tree', x: side * 5.6, dist: 2.5 + r(3) }, { prop: 'tree', x: side * 5.6, dist: 8.5 + r(4) });
            if (mod(i, 3) === (side > 0 ? 1 : 0)) out.push({ prop: 'lamp', x: side * 4.0, dist: 6 }); break;
          case 2:
            if (mod(i, 2) === (side > 0 ? 1 : 0)) house(HOUSES[(hv + 2) % 5], FRONT_X + 4.5, (r(2) - 0.5) * 1.2);
            out.push({ prop: 'tree', x: side * (7.5 + r(3) * 2.5), dist: 2.5 + r(4) * 3 }, { prop: 'tree', x: side * (7.5 + r(5) * 2.5), dist: 8 + r(6) * 3 }, { prop: 'bench', x: side * 6.0, dist: 6 }, { prop: 'bollard', x: side * 4.7, dist: 6 });
            if (r(7) < 0.5) out.push({ prop: 'lamp', x: side * 4.0, dist: 3 }); break;
          case 3:
            house(['houseA', 'houseD'][mod(i + (side > 0 ? 1 : 0), 2)], FRONT_X - 0.5 + r(1) * 0.4, (r(2) - 0.5) * 0.8);
            out.push({ prop: 'planter', x: side * 5.8, dist: 3 }, { prop: 'planter', x: side * 5.8, dist: 9 }, { prop: 'lamp', x: side * 4.0, dist: 2.5 });
            if (r(8) < 0.55) out.push({ prop: 'cafe', x: side * 5.3, dist: 6.5 }); break;
          case 4:
            if (mod(i + (side > 0 ? 1 : 0), 3) === 2) { if (!lm) out.push({ prop: 'tree', x: side * 8.0, dist: 4 }, { prop: 'bush', x: side * 6.2, dist: 8 }, { prop: 'wall', x: side * 6.6, dist: 6 }); }
            else house(['houseE', 'houseB', 'houseC'][mod(i + (side > 0 ? 1 : 0), 3) === 0 ? 0 : 1 + mod(i, 2)], FRONT_X + r(1) * 0.5, (r(2) - 0.5) * 0.8);
            if (mod(i, 2) === 0) out.push({ prop: 'lamp', x: side * 4.0, dist: 2.5 }); break;
          default:
            out.push({ prop: 'wall', x: side * 5.0, dist: 3 }, { prop: 'wall', x: side * 5.0, dist: 9 });
            house(HOUSES[hv], FRONT_X + 1.5 + r(1) * 0.6, (r(2) - 0.5) * 0.8);
            if (r(3) < 0.6) out.push({ prop: 'tree', x: side * 6.9, dist: 4 + r(4) * 4 });
            if (mod(i, 2) === (side > 0 ? 1 : 0)) out.push({ prop: 'lamp', x: side * 4.0, dist: 6 });
        }
        if (lm) out.push({ prop: lm, x: side * (lm === 'clockTower' ? FRONT_X + 0.3 : lm === 'fountain' ? 9.3 : 8.2), dist: 6 });
      }
      return out;
    },
  };
})();
