// VIC, CATALUNYA: the old town's narrow streets at the end of the afternoon, from the user's photos: tall ochre, salmon, cream and pink houses on both sides, wrought-iron balconies, green and brown shutters,
// stone arches and door frames, wall lanterns, terracotta eaves, a flag line across the street now and then, café terraces under beige parasols, big planters, cobbles with a flagstone pavement. The road
// is NARROW (4.4 m: TRACK `hw`) and winds in short bends; the houses stand 4.5 m from its axis, facade plane at local x = 0 facing the street, body toward +X (the contract of the other zones).
// Three of the user's photographed houses are MODELLED (yellow, pink with the stone arch, orange with its shop), never put on the street as pictures.
window.ENV3D = window.ENV3D || {};
(function () {
  const mod = (a, n) => ((a % n) + n) % n, SLOT = SEG_LEN;
  const V = { ochre: '#d9a35e', salmon: '#d98a6a', cream: '#e8d5a8', terra: '#c4724a', pink: '#e0a090', sage: '#8aa070', grey: '#b0a28c', sand: '#e2b26a', stone: '#9a8e7a', stoneD: '#6e6558', roof: '#a2523a', roofD: '#7a3a2a', iron: '#202228', glass: '#262a34', warm: '#ffbd70',
              shutG: '#4a6a4a', shutB: '#6a4a34', beige: '#e6dcc0', orange: '#d9772e', leaf: '#4d7a45', leafD: '#355d3a', pot: '#a8583c', wood: '#7a5230' };
  const WALL = [V.ochre, V.salmon, V.cream, V.terra, V.pink, V.sage, V.grey, V.sand];
  const lantern = (p, x, y, z) => p.push(Kit.box(0.7, 0.05, 0.05, x - 0.35, y, z, V.iron), Kit.box(0.28, 0.4, 0.28, x - 0.7, y - 0.3, z, V.warm, { glow: true }), Kit.cone(0.26, 0.2, x - 0.7, y + 0.1, z, V.iron, { seg: 4, ry: Math.PI / 4 }));
  // a house: body, plinth, eave and roof, windows with stone frames and shutters, iron balconies, a door or an arch, a lantern
  function house(p, o) {
    const { F, floors, wall, zc, seed, kind, plinth, awn } = o, GF = 3.4, FL = 3.0, H = GF + floors * FL, r = n => rnd(seed, n);
    p.push(Kit.box(7, H, F, 3.5, 0, zc, wall), Kit.box(7.1, plinth ? 1.6 : 0.7, F + 0.05, 3.55, 0, zc, plinth || V.stone), Kit.box(0.9, 0.22, F + 0.3, -0.35, H - 0.1, zc, V.roofD), Kit.roof(7.2, 1.7, F + 0.3, 3.3, H + 0.1, zc, V.roof));
    for (let f = 0; f < floors; f++) {
      const y = GF + f * FL + 0.3, nW = F > 5.5 ? 2 : 1, balc = kind ? true : r(10 + f) < 0.55;
      for (let k = 0; k < nW; k++) {
        const z = zc + (nW === 1 ? 0 : (k - 0.5) * F * 0.5), sh = r(20 + f * 3 + k) < 0.4 ? (r(30 + k) < 0.5 ? V.shutG : V.shutB) : null;
        p.push(Kit.box(0.14, 1.9, 0.95, -0.03, y, z, r(40 + f * 3 + k) < 0.35 ? V.warm : V.glass, { glow: false }), Kit.box(0.18, 2.1, 0.12, -0.06, y - 0.1, z - 0.55, V.stone), Kit.box(0.18, 2.1, 0.12, -0.06, y - 0.1, z + 0.55, V.stone), Kit.box(0.18, 0.12, 1.3, -0.06, y + 1.9, z, V.stone));
        if (sh) p.push(Kit.box(0.08, 1.9, 0.4, -0.12, y, z - 0.7, sh), Kit.box(0.08, 1.9, 0.4, -0.12, y, z + 0.7, sh));
        if (balc) { p.push(Kit.box(1.0, 0.14, 1.7, -0.5, y - 0.1, z, V.stoneD), Kit.box(0.05, 0.06, 1.7, -1.0, y + 0.95, z, V.iron), Kit.box(0.05, 0.05, 1.7, -1.0, y + 0.1, z, V.iron)); for (let b = 0; b < 8; b++) p.push(Kit.box(0.04, 0.9, 0.04, -1.0, y + 0.1, z - 0.8 + b * 0.23, V.iron)); if (r(50 + f * 3 + k) < 0.5) p.push(Kit.cyl(0.18, 0.14, 0.3, -0.7, y + 0.04, z + 0.4, V.pot, { seg: 6 }), Kit.ico(0.28, -0.7, y + 0.5, z + 0.4, V.leaf, { detail: 1 })); }
      }
    }
    const dz = zc + (F > 5.5 ? F * 0.28 : 0);
    if (kind === 'yellow') { for (const k of [-1, 1]) p.push(Kit.box(0.2, 2.5, 2.2, -0.05, 0, zc + k * 1.25, '#5a2a24'), Kit.box(0.26, 0.16, 2.5, -0.08, 2.5, zc + k * 1.25, V.stone)); for (let b = 0; b < 4; b++) for (const k of [-1, 1]) p.push(Kit.box(0.24, 2.0, 0.07, -0.08, 0.3, zc + k * 1.25 - 0.9 + b * 0.6, '#2a1210'));      // two garage doors of dark brown wood with slats
    } else if (kind === 'arch') { p.push(Kit.box(0.5, 2.6, 2.4, -0.1, 0, zc, V.stone), Kit.cyl(1.2, 1.2, 0.5, -0.1, 2.6, zc, V.stone, { rz: Math.PI / 2, seg: 14 }), Kit.box(0.4, 2.6, 1.8, -0.3, 0, zc, '#6a3a22'), Kit.cyl(0.9, 0.9, 0.4, -0.3, 2.6, zc, '#6a3a22', { rz: Math.PI / 2, seg: 14 }));      // a big stone arch with a wooden door
      for (let b = 0; b < 7; b++) p.push(Kit.box(0.55, 0.28, 0.5, -0.12, 0.1 + b * 0.4, zc - 1.45, V.stoneD), Kit.box(0.55, 0.28, 0.5, -0.12, 0.1 + b * 0.4, zc + 1.45, V.stoneD));
    } else if (kind === 'shop') { p.push(Kit.box(0.3, 2.6, 2.0, -0.08, 0, zc, V.glass), Kit.box(0.34, 0.12, 2.3, -0.1, 2.6, zc, V.stone), Kit.box(0.34, 2.6, 0.12, -0.1, 0, zc - 1.1, V.stone), Kit.box(0.34, 2.6, 0.12, -0.1, 0, zc + 1.1, V.stone), Kit.box(0.2, 1.6, 1.2, -0.14, 0.4, zc + 0.2, '#ffbd70', { glow: true }));      // a shopfront with a lit window
    } else if (r(60) < 0.55) p.push(Kit.box(0.5, 2.6, 1.7, -0.1, 0, dz, V.stone), Kit.cyl(0.85, 0.85, 0.5, -0.1, 2.5, dz, V.stone, { rz: Math.PI / 2, seg: 10 }), Kit.box(0.4, 2.5, 1.3, -0.3, 0, dz, '#4a2e22'), Kit.cyl(0.65, 0.65, 0.4, -0.3, 2.4, dz, '#4a2e22', { rz: Math.PI / 2, seg: 10 }));
    else p.push(Kit.box(0.2, 2.4, 1.5, -0.05, 0, dz, '#5a3a28'), Kit.box(0.3, 0.14, 1.8, -0.1, 2.4, dz, V.stone));
    if (r(70) < 0.6) lantern(p, 0, 3.2, zc - F / 2 + 0.7);
    if (awn) for (let k = 0; k < 2; k++) { const az = zc + (k - 0.5) * F * 0.5, ay = 3.7 + r(90 + k) * 0.8;                                            // carved wooden awnings over the windows (the photo): a board sloping out from the wall with a toothed front edge and a round hole
      p.push(Kit.box(1.0, 0.1, 1.5, -0.5, ay, az, '#b0652e', { rz: -0.12 }), Kit.box(0.08, 0.5, 1.5, -1.0, ay - 0.4, az, '#8a4a22'));
      for (let t = 0; t < 5; t++) p.push(Kit.box(0.08, 0.14, 0.16, -1.0, ay - 0.62, az - 0.6 + t * 0.3, '#8a4a22'));
    }
    if (r(80) < 0.35) p.push(Kit.cyl(0.2, 0.15, 0.35, 0.35, 0.7, zc + F / 2 - 0.7, V.pot, { seg: 6 }), Kit.ico(0.34, 0.35, 1.2, zc + F / 2 - 0.7, V.leafD, { detail: 1 }));       // a pot at the foot of the wall
  }
  // a row of two houses filling a slot (12 m). `kind` makes the first one a modelled version of one of the user's photographed houses (never the photo itself): the yellow house with its iron balconies and garage doors, the
  // pink house with the big stone arch, the orange house with its shopfront (the colours, the balconies, the doors and the stone frames of the photos, built from boxes)
  const KIND = { yellow: { wall: '#e0a83c', floors: 3, F: 5.6 }, arch: { wall: '#e8a890', floors: 3, F: 6.2 }, orange: { wall: '#d98a50', floors: 4, F: 5.4 } };
  const row = (seed, kind) => () => {
    const p = [], K = kind && KIND[kind], F1 = K ? K.F : 5.4 + rnd(seed, 1) * 1.0, F2 = SLOT - F1;
    house(p, { F: F1, floors: K ? K.floors : 3 + Math.floor(rnd(seed, 2) * 2), wall: K ? K.wall : WALL[Math.floor(rnd(seed, 3) * WALL.length)], zc: -SLOT / 2 + F1 / 2, seed: seed * 3 + 1, kind });
    house(p, { F: F2, floors: 3 + Math.floor(rnd(seed, 4) * 2), wall: WALL[Math.floor(rnd(seed, 5) * WALL.length)], zc: SLOT / 2 - F2 / 2, seed: seed * 3 + 2 });
    return Kit.merge(p);
  };
  // THE PINK ALLEY (the user's photo of a medina alley): rose and terracotta walls with a darker foot, carved wooden awnings over the windows, blue planters, a lantern; one place wide
  const PINK = ['#e0a095', '#d98a7a', '#e6b0a0', '#d0806a', '#e8c0a8'];
  const rowM = seed => () => {
    const p = [], F1 = 5.4 + rnd(seed, 1) * 1.0, F2 = SLOT - F1;
    house(p, { F: F1, floors: 2 + Math.floor(rnd(seed, 2) * 2), wall: PINK[Math.floor(rnd(seed, 3) * PINK.length)], plinth: '#a85a4a', awn: true, zc: -SLOT / 2 + F1 / 2, seed: seed * 3 + 1 });
    house(p, { F: F2, floors: 2 + Math.floor(rnd(seed, 4) * 2), wall: PINK[Math.floor(rnd(seed, 5) * PINK.length)], plinth: '#a85a4a', awn: true, zc: SLOT / 2 - F2 / 2, seed: seed * 3 + 2 });
    return Kit.merge(p);
  };
  const layoutM = (i, r) => { const out = [{ prop: 'vicCobble', x: 0, dist: 6 }]; for (const side of [-1, 1]) out.push({ prop: ['vicM1', 'vicM2', 'vicM3', 'vicM4'][Math.floor(r(i * 2 + (side > 0 ? 1 : 0), 3) * 4)], x: side * 2.9, dist: 6 }); return out; };
  // the cobbles: a plane over the road, 5.6 m wide (the ribbon's own colours show at the edges of a wider road)
  const cobble = () => ({ merged: null, sprite: VicArt.floor(-2.8, 2.8, -SLOT / 2 - 0.1, SLOT / 2 + 0.1, 0.03), material: () => VicArt.cobbleMaterial() });
  // a flag line across the street: a wire and small yellow flags with red stripes (the user's photos show them on the balconies)
  const flags = () => {
    const p = [Kit.box(9, 0.03, 0.03, 0, 7.2, 0, V.iron)]; for (let k = 0; k < 7; k++) { const x = -3.3 + k * 1.1; p.push(Kit.box(0.7, 0.45, 0.03, x, 6.7 + Math.sin(k) * 0.05, 0, '#f2c230'), Kit.box(0.7, 0.07, 0.04, x, 6.84, 0, '#c8302a'), Kit.box(0.7, 0.07, 0.04, x, 6.98, 0, '#c8302a')); } return Kit.merge(p);
  };
  // dressing on the pavement: a planter with a shrub, a small tree, a bench
  const planter = () => Kit.merge([Kit.cyl(0.55, 0.45, 0.7, 0, 0, 0, '#6a4a3a', { seg: 8 }), Kit.ico(0.7, 0, 1.1, 0, V.leaf, { detail: 1 }), Kit.ico(0.5, 0.3, 1.5, 0.2, V.leafD, { detail: 1 })]);
  const tree_unused = () => Kit.merge([Kit.cyl(0.14, 0.2, 2.6, 0, 0, 0, '#6a5640', { seg: 6 }), Kit.ico(1.5, 0, 3.6, 0, '#e0903a', { detail: 1 }), Kit.ico(1.1, 0.8, 3.2, 0.5, V.leaf, { detail: 1 }), Kit.ico(1.1, -0.6, 3.1, -0.4, V.leaf, { detail: 1 })]);
  const bench = () => Kit.merge([Kit.box(0.5, 0.1, 1.8, 0.3, 0.45, 0, V.wood), Kit.box(0.08, 0.5, 1.8, 0.55, 0.45, 0, V.wood), Kit.box(0.08, 0.45, 0.08, 0.2, 0, -0.7, V.iron), Kit.box(0.08, 0.45, 0.08, 0.2, 0, 0.7, V.iron)]);

  // the street's layout (houses 4.5 m from the axis); the alley's (the same, 2.9 m from the axis of a road 2.3 m wide)
  const makeLayout = HX => (i, r) => {

      const out = [{ prop: 'vicCobble', x: 0, dist: 6 }], N = ['vicA', 'vicB', 'vicC', 'vicD', 'vicE', 'vicF'], PH = ['vicYellow', 'vicArch', 'vicOrange'];
      for (const side of [-1, 1]) {
        const k = i * 2 + (side > 0 ? 1 : 0);
        out.push({ prop: r(k, 4) < 0.4 ? PH[Math.floor(r(k, 5) * 3)] : N[Math.floor(r(k, 3) * N.length)], x: side * HX, dist: 6 });
        if (mod(i + (side > 0 ? 1 : 0), 4) === 1) out.push({ prop: 'vicPlanter', x: side * Math.min(3.4, HX - 0.6), dist: 3 + r(k, 6) * 5 });
        else if (mod(k, 7) === 3) out.push({ prop: 'vicBench', x: side * Math.min(3.4, HX - 0.6), dist: 6 });
      }
      if (HX > 4 && mod(i, 5) === 2) out.push({ prop: 'vicFlags', x: 0, dist: 6 });
      return out;
    };
  const UT = {
    name: 'VIC',
    sky: { top: '#5a86c8', mid: '#a8c0e0', horizon: '#f2b08a' }, sunDisc: { color: '#ffe8c0', size: 8 }, sunPos: [-26, 10], sunGlow: 0.6, fog: { color: '#d8b8a0', near: 36, far: 170 },
    hemi: { sky: '#cfd8f0', ground: '#6a5a50', intensity: 1.6 }, sun: { color: '#ffc890', intensity: 2.0, position: [-8, 5, -9] }, groundFar: '#5a4a40',
    road: { asphalt: ['#4c4e5c', '#484a58'], mark: '#4c4e5c', edge: '#5a5c6c', curb: ['#9a8e7a', '#948874'], curbFace: '#7a6e5c', walk: ['#a89c88', '#a29682'], court: '#8a7e6c', verge: ['#7e725f', '#786c5a'] },
    innerOk: new Set(), entrance: null,
    props: { vicA: row(1), vicB: row(2), vicC: row(3), vicD: row(4), vicE: row(5), vicF: row(6), vicYellow: row(7, 'yellow'), vicArch: row(8, 'arch'), vicOrange: row(9, 'orange'), vicCobble: cobble, vicM1: rowM(11), vicM2: rowM(12), vicM3: rowM(13), vicM4: rowM(14), vicFlags: flags, vicPlanter: planter, vicBench: bench },
    layout: null,
  };
  const down = g => g && g.translate(0, -WALK_Y, 0);
  const PR = {}; for (const k of Object.keys(UT.props)) { const f = UT.props[k]; PR[k] = () => { const m = f(); if (m.merged || m.sprite) { if (m.merged) { down(m.merged.lit); down(m.merged.glow); } down(m.sprite); } else { down(m.lit); down(m.glow); } return m; }; }
  const HOUSES = new Set(['vicA', 'vicB', 'vicC', 'vicD', 'vicE', 'vicF', 'vicYellow', 'vicArch', 'vicOrange', 'vicPlanter', 'vicBench']);        // (on the inner side of the junction of the street and the alley: the houses between them)
  ENV3D.vic = Object.assign({}, UT, { props: PR, layout: makeLayout(4.5), innerOk: HOUSES, innerAfterOpen: true });
  ENV3D.vicMedina = Object.assign({}, UT, { props: PR, layout: layoutM, name: 'RUELLE', innerOk: new Set(), sky: { top: '#7aa0d8', mid: '#e8c0b0', horizon: '#ffd8b8' }, fog: { color: '#e8b8a0', near: 30, far: 150 }, groundFar: '#8a5a48',
    road: { asphalt: ['#6a5a58', '#665654'], mark: '#6a5a58', edge: '#7a6a66', curb: ['#b0806a', '#a87862'], curbFace: '#8a6050', walk: ['#b8866e', '#b28068'], court: '#9a6a58', verge: ['#8a5a48', '#845444'] } });
  ENV3D.vicAlley = Object.assign({}, UT, { props: PR, layout: makeLayout(2.9), innerOk: HOUSES, innerAfterOpen: true, name: 'RUELLE' });
})();
