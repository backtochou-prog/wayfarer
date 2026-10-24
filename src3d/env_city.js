// OLD TOWN: the city environment for the 3D renderer. A biome is pure data + geometry factories:
// sky/fog/light colours, a road palette, a small prop kit and a layout rule. A forest biome can be added
// later as ENV3D.forest with the same shape, without touching the renderer or the track.
window.ENV3D = window.ENV3D || {};

(function () {
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
      planter: () => Kit.merge([
        Kit.box(0.8, 0.5, 1.8, 0, 0, 0, P.terracotta), Kit.box(0.84, 0.08, 1.84, 0, 0.5, 0, TRIM),
        Kit.ico(0.32, 0, 0.75, -0.5, P.leaf), Kit.ico(0.3, 0, 0.75, 0.2, P.capBand), Kit.ico(0.28, 0, 0.72, 0.65, P.burgundy)]),
    },

    // per side: one house (neighbours always differ), sometimes a small plaza instead, a lamp every other
    // segment and occasionally a tree / bench / planter on the sidewalk. Never more than 4 per side.
    layout(i, rnd) {
      const out = [], HOUSES = ['houseA', 'houseB', 'houseC', 'houseD', 'houseE'];
      for (const side of [-1, 1]) {
        const k = i * 2 + (side > 0 ? 1 : 0);
        if (rnd(k, 11) < 0.12) { // plaza: trees and a bench set back from the street
          out.push({ prop: 'tree', x: side * 8.6, dist: 3 }, { prop: 'tree', x: side * 8.6, dist: 9.2 }, { prop: 'bench', x: side * 7.6, dist: 6 });
        } else {
          // consecutive segments step the variant by 1-3 (mod 5), so neighbours never repeat
          const v = (i * 2 + (side > 0 ? 3 : 0) + Math.floor(rnd(k, 12) * 2)) % 5;
          out.push({ prop: HOUSES[(v + 5) % 5], x: side * FRONT_X, dist: 6 });
        }
        if ((i + (side > 0 ? 1 : 0)) % 2 === 0) out.push({ prop: 'lamp', x: side * 4.0, dist: 2.5 });
        const r = rnd(k, 14);
        if (r < 0.3) out.push({ prop: 'tree', x: side * 5.7, dist: 8.5 });
        else if (r < 0.48) out.push({ prop: 'bench', x: side * 6.0, dist: 8.2 });
        else if (r < 0.62) out.push({ prop: 'planter', x: side * 6.0, dist: 9 });
        else if (r < 0.72) out.push({ prop: 'bush', x: side * 6.1, dist: 9.5 });
      }
      return out;
    },
  };
})();
