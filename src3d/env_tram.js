// TRAM STREET: a Brussels street at sunset, from the user's two street photos: a low orange sun at the end of the road, a pale blue-grey sky, warm haze, tram rails set in
// dark cobbles, a cobbled parking strip with parked cars, brick and cream townhouses (bay windows, balconies, stepped gables), a dark tree, swan-neck lamps, poles with the overhead
// tram wires, and the lettered signs (POLYCLINIQUE, VERHAEGEN, TRAM). Same shape as the other biomes (sky / fog / light colours, a road palette, a prop kit, a layout rule), so the
// renderer and the track need nothing special: the track's `tramRun` segment is a `district` that fades in and out (World.bandsAt). The sun is placed low and ahead (`sunPos`),
// with a soft glow (`sunGlow`), by Renderer3D. Everything is lit by one low orange light from ahead, so the facades are half in shadow, like the photos.
window.ENV3D = window.ENV3D || {};

(function () {
  const mod = (a, n) => ((a % n) + n) % n;
  const T = { brick: '#a45a45', brickD: '#8a4a3c', brickL: '#b8704f', cream: '#e3d0b0', white: '#ece2d0', grey: '#b8aea2', stone: '#a8927e', slate: '#4a424c', roof: '#7a4a42',
              glass: '#2c2a3a', sun: '#e8975a', trim: '#f1e5cd', iron: '#2a2630', wire: '#26222c', warm: '#ffb870', cobble: '#55352f', cobbleA: '#6a4640', cobbleB: '#47302b',
              leaf: ['#3c4228', '#2f3622', '#454a2c'], trunk: '#3b2e28', awnA: '#b23a3a', awnB: '#efe0c0' };
  const SLOT = SEG_LEN;

  // one townhouse (or half of a twin): facade plane at local x = 0, body toward +X, centred at z = zc
  function house(parts, o) {
    const { F, D, H, zc = 0, wall, trim = T.trim, gable = 'step', roofCol = T.slate, cols = 3, bay = false, balcony = false, shop = null, seed = 1 } = o;
    const GF = 3.4, FL = 3.0, floors = Math.max(1, Math.floor((H - GF - 0.6) / FL));
    parts.push(Kit.box(D, H, F, D / 2, 0, zc, wall));                                                       // body
    parts.push(Kit.box(D + 0.08, 0.7, F + 0.08, D / 2, 0, zc, T.stone));                                    // plinth
    parts.push(Kit.box(0.36, 0.24, F + 0.3, -0.07, H - 0.24, zc, trim));                                    // cornice
    parts.push(Kit.box(0.16, 0.14, F, -0.02, GF - 0.12, zc, trim));                                         // ground-floor band
    const bc = Math.floor(cols / 2), cw = F / cols;
    for (let f = 0; f < floors; f++) {
      const y = GF + f * FL + 0.45;
      for (let c = 0; c < cols; c++) {
        if (bay && c === bc && f < 2) continue;                                                              // the oriel takes the middle window of the first two floors
        const z = zc - F / 2 + (c + 0.5) * cw, lit = rnd(seed * 31 + f * 7 + c, 3) < 0.34;
        parts.push(Kit.box(0.1, 1.9, 1.0, -0.03, y, z, lit ? T.sun : T.glass, { glow: lit }));
        parts.push(Kit.box(0.22, 0.1, 1.25, -0.09, y - 0.1, z, trim));                                       // sill
        parts.push(Kit.box(0.14, 0.14, 1.15, -0.06, y + 1.9, z, trim));                                      // lintel
      }
      if (balcony && f === 0 || balcony && f === 2) {                                                        // a long iron balcony in front of the first-floor windows
        const len = F * 0.8;
        parts.push(Kit.box(0.8, 0.14, len, -0.4, y - 0.15, zc, T.stone));
        parts.push(Kit.box(0.06, 0.08, len, -0.78, y + 0.8, zc, T.iron));
        for (let k = 0; k <= 12; k++) parts.push(Kit.box(0.04, 0.95, 0.04, -0.78, y - 0.15, zc - len / 2 + k * len / 12, T.iron));
      }
    }
    if (bay) {                                                                                               // oriel (bay window) over two floors
      const bw = cw * 1.3, bz = zc - F / 2 + (bc + 0.5) * cw, by = GF + 0.2, bh = 2 * FL - 0.5;
      parts.push(Kit.box(0.95, bh, bw, -0.45, by, bz, wall), Kit.box(1.1, 0.16, bw + 0.2, -0.5, by + bh, bz, trim), Kit.box(1.1, 0.16, bw + 0.2, -0.5, by - 0.1, bz, trim));
      for (let f = 0; f < 2; f++) for (const dz of [-0.4, 0.4]) {
        const lit = rnd(seed * 13 + f * 5 + (dz > 0 ? 1 : 0), 6) < 0.4;
        parts.push(Kit.box(0.08, 1.6, 0.62, -0.95, by + 0.45 + f * FL, bz + dz, lit ? T.sun : T.glass, { glow: lit }));
      }
      parts.push(Kit.box(1.2, 0.14, bw + 0.3, -0.55, by + bh + 0.16, bz, roofCol));
    }
    if (shop) {                                                                                              // a lit shop window and a door, a fascia board above (the lettered sign is a textured panel)
      parts.push(Kit.box(0.1, 1.9, F * 0.58, -0.04, 0.8, zc - F * 0.12, '#e69a56', { glow: true }));
      parts.push(Kit.box(0.14, 2.5, 1.1, -0.04, 0.0, zc + F / 2 - 1.1, T.iron));
      parts.push(Kit.box(0.22, 0.7, F * 0.94, -0.08, 2.75, zc, shop));                                       // fascia board
    } else {
      parts.push(Kit.box(0.14, 2.5, 1.2, -0.04, 0.0, zc, T.iron), Kit.box(0.22, 0.18, 1.6, -0.08, 2.5, zc, trim));
      for (const s of [-1, 1]) parts.push(Kit.box(0.1, 1.5, 0.9, -0.04, 0.95, zc + s * F * 0.3, T.glass));
    }
    if (gable === 'step') {                                                                                  // Brussels stepped gable
      const steps = [0.92, 0.7, 0.48, 0.26];
      steps.forEach((k, n) => parts.push(Kit.box(0.5, 0.55, F * k, 0.25, H + n * 0.55, zc, n % 2 ? wall : T.brickD), Kit.box(0.56, 0.1, F * k + 0.1, 0.25, H + n * 0.55 + 0.55, zc, trim)));
      parts.push(Kit.box(D * 0.9, 0.7, F * 0.9, D * 0.5, H, zc, roofCol));
    } else if (gable === 'gable') parts.push(Kit.roof(D + 0.5, Math.min(3.4, D * 0.42), F + 0.4, D / 2, H, zc, roofCol));
    else if (gable === 'mansard') {
      parts.push(Kit.box(D - 0.4, 1.8, F - 0.2, D / 2 + 0.2, H, zc, roofCol));
      parts.push(Kit.roof(D - 1.4, 0.9, F - 0.6, D / 2 + 0.2, H + 1.8, zc, T.roof));
      for (let c = 0; c < cols; c++) { const z = zc - F / 2 + (c + 0.5) * cw, lit = c % 2 === 1;
        parts.push(Kit.box(0.7, 1.0, 0.9, 0.35, H + 0.3, z, roofCol), Kit.box(0.08, 0.6, 0.55, -0.02, H + 0.5, z, lit ? T.sun : T.glass, { glow: lit })); }
    } else {                                                                                                 // flat roof with a parapet
      parts.push(Kit.box(0.3, 0.7, F, 0.15, H, zc, trim), Kit.box(D, 0.5, 0.3, D / 2, H, zc - F / 2 + 0.15, trim), Kit.box(D, 0.5, 0.3, D / 2, H, zc + F / 2 - 0.15, trim));
    }
    parts.push(Kit.box(0.6, 1.7, 0.6, D * 0.65, H + 0.4, zc + F * 0.27, T.brickD));                           // chimney
  }
  // a prop of one or more houses; `signs` = [[cell, z0, z1, y0, y1], ...] lettered boards on the facade, `extra(parts, sprites)` adds anything else (blade signs, furniture)
  const build = (houses, signs = [], extra = null) => () => {
    const parts = [], sp = []; for (const h of houses) house(parts, h);
    for (const [cell, z0, z1, y0, y1] of signs) sp.push(TramArt.panel(cell, -0.2, z0, z1, y0, y1));
    if (extra) extra(parts, sp);
    const merged = Kit.merge(parts);
    return sp.length ? { merged, sprite: TramArt.join(sp), material: () => TramArt.material() } : merged;
  };
  const fascia = (cell, F) => { const w = Math.min(F * 0.9, 0.56 * TramArt.SPEC[cell][2] / TramArt.SPEC[cell][3]); return [cell, -w / 2, w / 2, 2.8, 3.36]; };

  // ---- cars parked along the kerb: long axis along z, the red rear lights toward the camera
  function car(col, o = {}) {
    const { van = false, lit = false } = o, L = van ? 4.9 : 4.1, p = [];
    p.push(Kit.box(1.78, van ? 1.5 : 0.62, L, 0, 0.3, 0, col));
    if (!van) p.push(Kit.box(1.52, 0.56, L * 0.52, 0, 0.9, 0.2, col), Kit.box(1.56, 0.36, L * 0.46, 0, 0.98, 0.2, T.glass));
    else p.push(Kit.box(1.8, 0.5, 0.06, 0, 1.0, -L / 2 + 0.02, T.glass), Kit.box(1.8, 0.1, L, 0, 1.8, 0, T.grey));
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) p.push(Kit.cyl(0.3, 0.3, 0.22, sx * 0.86, 0.19, sz * (L / 2 - 0.85), '#1c1a20', { rz: Math.PI / 2, seg: 8 }));
    for (const sx of [-1, 1]) p.push(Kit.box(0.4, 0.14, 0.06, sx * 0.62, 0.62, L / 2 + 0.01, lit ? '#ff4a30' : '#8a2a2a', { glow: lit }));
    return Kit.merge(p);
  }
  const tree = () => { const p = [Kit.cyl(0.24, 0.36, 3.6, 0, 0, 0, T.trunk, { seg: 6 })], K = [[1.35, 0, 4.4, 0], [1.2, 0.5, 5.6, 0.3], [1.2, -0.5, 5.4, -0.4], [1.0, 0.1, 6.8, 0.1], [0.75, 0, 7.8, 0]];   // a tall dark crown, narrow like the photo's tree
    K.forEach(([r, x, y, z], n) => p.push(Kit.ico(r, x, y, z, T.leaf[n % 3], { detail: 0, sy: 1.25, sx: 0.85 }))); return Kit.merge(p); };

  // house types by slot parity (A C E G on even slots of a side, B D F H on odd ones), so two neighbouring houses are never the same whatever the stretch
  const ODD = ['rowB', 'rowD', 'rowF', 'rowH'], EVEN = ['rowA', 'rowC', 'rowE', 'rowG'];
  const BRICK = [['rowA', 'rowE', 'rowC'], ['rowH', 'rowB']], SHOPS = [['rowE', 'rowG'], ['rowF', 'rowH']];

  ENV3D.tram = {
    name: 'TRAM STREET',
    sky: { top: '#7b8fa6', mid: '#d6c8b2', horizon: '#f8c48c' },
    sunDisc: { color: '#fff1c4', size: 10 },
    sunPos: [12, 15],                                                // where the sun sits relative to the camera at 250 m: a little right of the road, ~3.5 degrees above the horizon
    sunGlow: 1,                                                      // strength of the additive halo around it
    fog: { color: '#e9a870', near: 26, far: 150 },
    hemi: { sky: '#d6c4b8', ground: '#6a4242', intensity: 1.35 },
    sun: { color: '#ff9a50', intensity: 3.3, position: [5, 3.5, -10] },   // low, from ahead (and a little to the left): rims the facades, leaves the rest in warm shade
    groundFar: '#5a3c36',

    road: {                                                          // dark red-brown cobbles, silver tram rails (the lane lines), grey-red kerbs and pavements
      asphalt: ['#5c4141', '#523a3a'], mark: '#cfc7c0', edge: '#8c7466', rails: true,
      curb: ['#a89484', '#9c8878'], curbFace: '#7e6a5e', walk: ['#8c6e62', '#826458'], court: '#5e403a', verge: ['#5c3f3a', '#563a36'],
    },
    innerOk: new Set(['pole', 'swan', 'plane', 'cobbles']),

    props: {
      rowA: build([{ F: 9, D: 8, H: 13.4, wall: T.brick, cols: 3, bay: true, seed: 1 }]),
      rowB: build([{ F: 8.6, D: 8, H: 15.4, wall: T.brickL, cols: 3, balcony: true, gable: 'flat', seed: 2 }]),
      rowC: build([{ F: 4.6, D: 7, H: 12.6, zc: -2.4, wall: T.white, cols: 2, seed: 3 }, { F: 4.6, D: 7.5, H: 14.6, zc: 2.4, wall: T.brickL, cols: 2, gable: 'gable', roofCol: T.roof, seed: 4 }]),
      rowD: build([{ F: 9.4, D: 7, H: 13, wall: T.white, cols: 4, gable: 'mansard', roofCol: T.slate, balcony: true, seed: 5 }]),
      rowE: build([{ F: 9.6, D: 8, H: 10.6, wall: T.brick, cols: 3, shop: '#4a2e28', seed: 6 }], [fascia('verh', 9.6)]),
      rowF: build([{ F: 8.8, D: 8, H: 12.6, wall: T.cream, cols: 3, shop: '#2f5d4a', bay: true, seed: 7 }], [fascia('brass', 8.8)]),
      rowG: build([{ F: 10, D: 7, H: 11.8, wall: T.white, cols: 4, shop: '#e8e2d2', gable: 'flat', balcony: true, seed: 8 }], [fascia('pharm', 10)]),
      rowH: build([{ F: 8.6, D: 7, H: 9.8, wall: T.brickD, cols: 3, shop: '#d9b46a', seed: 9 }], [fascia('boul', 8.6)]),
      // street furniture
      pole: () => Kit.merge([                                        // a pole carrying a cantilever arm over the rails, with a dropper to the wire
        Kit.box(0.4, 0.4, 0.4, 0, 0, 0, T.iron), Kit.cyl(0.09, 0.13, 6.6, 0, 0, 0, T.iron), Kit.box(3.0, 0.1, 0.1, -1.5, 6.1, 0, T.iron), Kit.box(1.7, 0.06, 0.06, -0.85, 5.5, 0, T.iron, { rz: -0.5 }),
        Kit.box(0.05, 0.8, 0.05, -2.85, 5.4, 0, T.iron), Kit.box(0.22, 0.12, 0.22, -2.85, 6.2, 0, T.grey)]),
      wire: () => Kit.merge([Kit.box(0.04, 0.04, SLOT + 0.6, 0, 5.4, 0, T.wire)]),   // one span of overhead wire along the slot (placed over each rail)
      swan: () => Kit.merge([
        Kit.box(0.3, 0.4, 0.3, 0, 0, 0, T.iron), Kit.cyl(0.07, 0.1, 4.8, 0, 0, 0, T.iron), Kit.box(1.3, 0.07, 0.07, -0.62, 4.8, 0, T.iron),
        Kit.box(0.55, 0.2, 0.34, -1.2, 4.58, 0, T.warm, { glow: true }), Kit.box(0.6, 0.06, 0.4, -1.2, 4.78, 0, T.iron)]),
      plane: tree,
      cobbles: () => { const p = [Kit.box(2.9, 0.03, SLOT - 0.4, 0, 0, 0, T.cobble)];                      // a cobbled parking strip with lighter setts
        for (let k = 0; k < 22; k++) p.push(Kit.box(0.55, 0.045, 0.4, -1.2 + rnd(k, 31) * 2.4, 0, -5 + rnd(k, 32) * 10, k % 2 ? T.cobbleA : T.cobbleB));
        return Kit.merge(p); },
      carA: () => car('#2a2530', { lit: true }), carB: () => car('#d8d4cc'), carC: () => car('#8e8a96', { lit: true }), van: () => car('#cfcac2', { van: true, lit: true }),
      // landmarks (at most one per stretch and side), and the entrance marker
      polyclinique: () => { const sp = [TramArt.panel('verh', -0.2, -3.6, 3.6, 2.8, 3.7), TramArt.blade('poly', -4.2, -1.2, -0.05, 5.2, 10.6)], p = [];
        house(p, { F: 11, D: 9, H: 17, wall: T.white, cols: 4, balcony: true, gable: 'flat', shop: '#4a2e28', seed: 11 });
        p.push(Kit.box(0.14, 5.6, 0.14, -0.1, 5.0, -4.2, T.iron), Kit.box(1.2, 0.08, 0.08, -0.6, 10.5, -4.2, T.iron), Kit.box(1.2, 0.08, 0.08, -0.6, 5.0, -4.2, T.iron));   // bracket of the vertical blade sign
        return { merged: Kit.merge(p), sprite: TramArt.join(sp), material: () => TramArt.material() }; },
      tramStop: () => { const p = [Kit.box(2.6, 0.22, 8.0, 0.6, 0, 0, T.stone)], sp = [TramArt.blade('stop', 4.6, -0.5, 0.5, 2.6, 3.3)];   // platform, shelter, a pole with the TRAM plate
        for (const z of [-3.4, 3.4]) p.push(Kit.box(0.12, 2.5, 0.12, 0.3, 0.22, z, T.iron), Kit.box(0.12, 2.5, 0.12, 1.5, 0.22, z, T.iron));
        p.push(Kit.box(1.5, 0.14, 7.4, 0.9, 2.7, 0, T.iron), Kit.box(0.06, 1.7, 7.0, 1.5, 0.6, 0, '#6a5a6a'), Kit.box(0.4, 0.1, 5.0, 0.9, 0.62, 0, '#7a5234'),
               Kit.cyl(0.07, 0.07, 3.4, 0.0, 0.22, 4.6, T.iron, { seg: 6 }));
        return { merged: Kit.merge(p), sprite: TramArt.join(sp), material: () => TramArt.material() }; },
      cornerCafe: build([{ F: 8, D: 7, H: 6.4, wall: T.brickL, cols: 3, shop: '#6b2737', gable: 'flat', seed: 12 }], [fascia('cafe', 8)], (parts) => {
        for (let k = 0; k < 8; k++) parts.push(Kit.box(1.4, 0.08, 1.0, -0.9, 3.2, -3.5 + k * 1.0, k % 2 ? T.awnA : T.awnB, { rz: 0.35 }));        // striped awning
        for (const z of [-2.2, 2.2]) parts.push(Kit.cyl(0.5, 0.5, 0.05, -2.6, 0.75, z, T.cream, { seg: 8 }), Kit.cyl(0.05, 0.05, 0.75, -2.6, 0, z, T.iron, { seg: 5 }), Kit.cone(1.4, 0.5, -2.6, 2.3, z, T.awnA, { seg: 8 }), Kit.cyl(0.05, 0.05, 2.3, -2.6, 0, z, T.iron, { seg: 5 }));
      }),
      gateTram: () => ({ merged: Kit.merge([Kit.cyl(0.09, 0.12, 3.6, 0, 0, 0, T.iron), Kit.box(0.3, 0.3, 0.3, 0, 0, 0, T.iron)]), sprite: TramArt.blade('stop', 0, -0.9, 0.9, 2.5, 3.5), material: () => TramArt.material() }),
    },

    entrance: 'gateTram',

    // The street is built in stretches (Stretch.of), each with its own character, so the same few props are not repeated slot after slot. In every slot the overhead wire runs over both
    // rails, with a pole each side every third slot.
    //   0 terrace: a continuous row of townhouses, parked cars on cobbles on one side     3 shops: shop fronts with lettered fascias, parasols, cars
    //   1 avenue: dark plane trees on the pavement, houses set back, swan-neck lamps        4 square: open, houses every other slot, trees, a bench, cobbles on both sides
    //   2 brick: tall brick houses with bay windows and stepped gables
    // A landmark (Polyclinique block / tram stop / corner cafe) replaces the house on its side of one slot per stretch (the tram stop stands on the pavement, the houses stay).
    layout(i, rnd) {
      const out = [{ prop: 'wire', x: -1.1, dist: 6 }, { prop: 'wire', x: 1.1, dist: 6 }], S = Stretch.of(i, 31, 5, ['polyclinique', 'tramStop', 'cornerCafe']);
      for (const side of [-1, 1]) {
        const k = i * 2 + (side > 0 ? 1 : 0), r = n => rnd(k, n), lm = S.lm && S.lm.slot === i && S.lm.side === side ? S.lm.kind : null, blocks = lm && lm !== 'tramStop';
        const par = mod(i + (side > 0 ? 1 : 0), 2), pick = (L = [EVEN, ODD]) => L[par][Math.floor(r(12) * L[par].length)];   // a house type of this slot's parity class
        const house = (prop, x, dz) => { if (!blocks) out.push({ prop, x: side * x, dist: 6 + dz }); };
        const park = mod(S.b + (side > 0 ? 1 : 0), 2) === 0;                                                 // which side of this stretch has the parking strip
        const cars = (p = 0.6) => { if (!park) return; out.push({ prop: 'cobbles', x: side * 5.15, dist: 6 }); if (r(5) < p) out.push({ prop: ['carA', 'carB', 'carC', 'van'][Math.floor(r(6) * 4)], x: side * 5.15, dist: 3.2 + r(7) * 5 }); };
        if (mod(i + (side > 0 ? 1 : 0), 3) === 0) out.push({ prop: 'pole', x: side * 4.0, dist: 2.5 });
        switch (S.variant) {
          case 0: house(pick(), FRONT_X + r(1) * 0.5, (r(2) - 0.5) * 0.8); cars(0.65); if (mod(i, 2) === (side > 0 ? 1 : 0)) out.push({ prop: 'swan', x: side * 3.95, dist: 8 }); break;
          case 1: house(pick(), FRONT_X + 1.4 + r(1) * 0.8, (r(2) - 0.5) * 0.8); out.push({ prop: 'plane', x: side * 4.9, dist: mod(i, 2) === 0 ? 3 + r(3) * 2 : 8 + r(4) * 2 }); out.push({ prop: 'swan', x: side * 3.95, dist: 6 }); break;
          case 2: house(pick(BRICK), FRONT_X + r(1) * 0.4, (r(2) - 0.5) * 0.6); cars(0.5); if (mod(i, 2) === 0) out.push({ prop: 'swan', x: side * 3.95, dist: 9 }); break;
          case 3: house(pick(SHOPS), FRONT_X - 0.4 + r(1) * 0.3, (r(2) - 0.5) * 0.6); cars(0.75); out.push({ prop: 'swan', x: side * 3.95, dist: 4 }); if (r(8) < 0.4) out.push({ prop: 'bollard', x: side * 5.4, dist: 9 }); break;
          default:
            if (par === 0) house(pick(), FRONT_X + 4.5, (r(2) - 0.5) * 1.2);
            out.push({ prop: 'cobbles', x: side * 5.15, dist: 6 }, { prop: 'plane', x: side * (7.5 + r(3) * 2.5), dist: 3 + r(4) * 3 }, { prop: 'plane', x: side * (7.5 + r(5) * 2.5), dist: 8 + r(6) * 3 });
            if (r(7) < 0.5) out.push({ prop: 'bench', x: side * 6.2, dist: 6 }); else out.push({ prop: 'bollard', x: side * 4.9, dist: 6 });
        }
        if (lm) out.push({ prop: lm, x: side * (lm === 'tramStop' ? 4.5 : lm === 'polyclinique' ? FRONT_X + 0.3 : FRONT_X - 0.2), dist: 6 });
      }
      return out;
    },
  };
})();
