// NEON QUARTER: a night district of the city, from the user's neon-city picture: near-black streets with glowing magenta / green / red lines, tall slabs striped in
// yellow, purple, teal and magenta, blocks with lit windows, glowing signs, tube lamps. Same shape as the other biomes (sky / fog / light colours, a road palette, a prop
// kit, a layout rule), so the renderer and the track need nothing special: the track's `neonRun` segment is a `district` that fades in and out (World.bandsAt).
// Glow parts are unlit (Kit `glow`), so they stay bright in the dark; the rest is lit by a dim violet light.
window.ENV3D = window.ENV3D || {};

(function () {
  const mod = (a, n) => ((a % n) + n) % n;
  const N = { mag: '#ff2fd0', green: '#39ff14', red: '#ff2a3a', yellow: '#ffd21a', teal: '#22e0e8', purple: '#8a3cff', blue: '#2a4cff', warm: '#ffd27a',
              body: '#121c34', bodyB: '#171b3a', bodyC: '#0f2230', base: '#0a1020', post: '#1a1f33' };
  const STRIPES = [N.yellow, N.purple, N.teal, N.mag, N.blue, N.red];

  // a tall slab: facade plane at local x = 0, body toward +X, centred at z = zc; vertical glowing colour strips of different heights, like the towers of the picture
  function tower(F, D, H, seed) {
    const p = [Kit.box(D, H, F, D / 2, 0, 0, seed % 2 ? N.body : N.bodyB), Kit.box(D + 0.1, 0.5, F + 0.1, D / 2, 0, 0, N.base)];
    const n = 5, w = F / n;
    for (let i = 0; i < n; i++) {
      const col = STRIPES[mod(seed + i * 2, STRIPES.length)], h = H * (0.55 + 0.4 * rnd(seed * 7 + i, 5)), z = -F / 2 + (i + 0.5) * w;
      p.push(Kit.box(0.14, h, w - 0.22, -0.03, 0.8, z, col, { glow: true }));
      for (let k = 0; k < 3; k++) p.push(Kit.box(0.16, 0.08, w - 0.1, -0.05, 1.8 + k * (h / 3.4), z, N.base));    // dark bands across the strips
    }
    p.push(Kit.box(0.2, H * 0.98, 0.14, -0.04, 0, -F / 2 + 0.05, N.mag, { glow: true }), Kit.box(0.2, H * 0.98, 0.14, -0.04, 0, F / 2 - 0.05, N.teal, { glow: true }));  // lit corners
    p.push(Kit.box(D * 0.7, 0.3, F * 0.8, D / 2, H, 0, N.base), Kit.box(0.14, 0.14, F * 0.8, 0.0, H + 0.1, 0, N.mag, { glow: true }));   // roof cap with a magenta rim
    return Kit.merge(p);
  }
  // a tower whose facade carries a panel of the user's picture (in front of the glowing strips, between the lit corners)
  const artTower = (F, D, H, seed, cell) => ({ merged: tower(F, D, H, seed), sprite: NeonArt.panel(cell, -0.2, -F * 0.43, F * 0.43, 1.3, 1.3 + H * 0.9), material: () => NeonArt.material() });
  // a block with a grid of lit windows (warm, blue, cyan, some dark) and a neon rim
  function block(F, D, H, seed, rim) {
    const p = [Kit.box(D, H, F, D / 2, 0, 0, seed % 2 ? N.bodyC : N.body), Kit.box(D + 0.1, 0.5, F + 0.1, D / 2, 0, 0, N.base)];
    const floors = Math.max(2, Math.floor((H - 1.2) / 2.1)), cols = 4, cw = F / cols, WC = [N.warm, N.blue, N.teal, N.warm, N.base, N.yellow];
    for (let f = 0; f < floors; f++) for (let c = 0; c < cols; c++) {
      const r = rnd(seed * 31 + f * 7 + c, 9), lit = r < 0.78, col = lit ? WC[Math.floor(rnd(seed * 17 + f * 5 + c, 10) * 5)] : N.base;
      p.push(Kit.box(0.1, 1.15, cw - 0.75, -0.03, 1.1 + f * 2.1, -F / 2 + (c + 0.5) * cw, col, { glow: lit }));
    }
    p.push(Kit.box(0.2, 0.18, F, -0.02, H - 0.1, 0, rim, { glow: true }), Kit.box(0.2, 0.18, F, -0.02, 0.9, 0, rim, { glow: true }));       // neon rim along the roof and the ground floor
    p.push(Kit.box(D * 0.8, 0.4, F * 0.9, D / 2, H, 0, N.base));
    return Kit.merge(p);
  }
  // a low shop with a big glowing front and a stripe above
  function shop(F, D, H, col, col2) {
    const p = [Kit.box(D, H, F, D / 2, 0, 0, N.bodyB), Kit.box(0.14, H * 0.55, F * 0.8, -0.04, 0.5, 0, col, { glow: true }), Kit.box(0.16, 0.2, F * 0.9, -0.05, H * 0.62, 0, col2, { glow: true }),
               Kit.box(0.14, H * 0.3, F * 0.8, -0.04, H * 0.66, 0, N.base), Kit.box(0.5, 0.12, F * 0.85, -0.3, H * 0.6 + 0.25, 0, col2, { glow: true, rz: 0.3 })];
    return Kit.merge(p);
  }
  // props made of the user's materials (NeonArt, second atlas). A block / shop with a picture panel on its facade; free-standing cut-outs; posts with a banner or a glowing tube.
  const art2 = (merged, sprite) => ({ merged: Kit.merge(merged), sprite, material: () => NeonArt.material2() });
  const artBlock = (F, D, H, seed, cell, rim) => art2([Kit.box(D, H, F, D / 2, 0, 0, N.body), Kit.box(D + 0.1, 0.5, F + 0.1, D / 2, 0, 0, N.base), Kit.box(0.2, 0.18, F, -0.02, H - 0.1, 0, rim, { glow: true }), Kit.box(0.2, 0.18, F, -0.02, 0.9, 0, rim, { glow: true }), Kit.box(D * 0.8, 0.4, F * 0.9, D / 2, H, 0, N.base)],
    NeonArt.panel2(cell, -0.06, -F * 0.46, F * 0.46, 1.1, H - 0.4));
  // props of the third set (NEON_ASSETS3: 17 more pictures). `art3` = merged parts + one textured panel of the third atlas.
  const art3 = (merged, sprite) => ({ merged: Kit.merge(merged), sprite, material: () => NeonArt.material3() });
  const facadeBlock = (cell, F, D, H, rim) => art3([Kit.box(D, H, F, D / 2, 0, 0, N.body), Kit.box(D + 0.1, 0.5, F + 0.1, D / 2, 0, 0, N.base), Kit.box(0.2, 0.18, F, -0.02, H - 0.1, 0, rim, { glow: true }), Kit.box(0.2, 0.18, F, -0.02, 0.9, 0, rim, { glow: true }), Kit.box(D * 0.8, 0.4, F * 0.9, D / 2, H, 0, N.base)],
    NeonArt.panel3(cell, -0.06, -F * 0.46, F * 0.46, 1.1, H - 0.4));
  // a free-standing picture on two posts (a billboard / sign): `w` m wide, the height follows the picture's aspect, its frame glows
  const board = (cell, w, y0, col) => { const h = w / NEON_ASSETS3[cell].ar, hw = w / 2 + 0.3;
    return art3([Kit.box(0.36, y0 + 0.2, 0.36, 0, 0, -hw + 0.1, N.post), Kit.box(0.36, y0 + 0.2, 0.36, 0, 0, hw - 0.1, N.post), Kit.box(0.28, h + 0.5, w + 0.5, -0.04, y0 - 0.1, 0, N.base),
      Kit.box(0.4, 0.2, w + 0.6, -0.08, y0 + h + 0.3, 0, col, { glow: true }), Kit.box(0.4, 0.2, w + 0.6, -0.08, y0 - 0.2, 0, col, { glow: true }), Kit.box(0.4, h + 0.7, 0.2, -0.08, y0 - 0.2, -w / 2 - 0.3, col, { glow: true }), Kit.box(0.4, h + 0.7, 0.2, -0.08, y0 - 0.2, w / 2 + 0.3, col, { glow: true })],
      NeonArt.panel3(cell, -0.22, -w / 2, w / 2, y0, y0 + h)); };
  const lampOf = col => () => Kit.merge([
    Kit.box(0.3, 0.4, 0.3, 0, 0, 0, N.post), Kit.cyl(0.07, 0.1, 4.2, 0, 0, 0, N.post), Kit.box(1.1, 0.08, 0.08, -0.55, 4.1, 0, N.post),
    Kit.box(0.14, 0.14, 1.2, -1.1, 3.95, 0, col, { glow: true }), Kit.box(0.5, 0.05, 0.5, -1.1, 3.9, 0, col, { glow: true })]);
  const stripOf = col => () => Kit.merge([Kit.box(0.16, 0.07, 4.6, 0, 0.02, 0, col, { glow: true }), Kit.box(0.4, 0.02, 4.6, 0, 0, 0, N.base)]);       // a glowing line along the kerb, like the road lines of the picture
  const signOf = (a, b) => () => Kit.merge([
    Kit.cyl(0.07, 0.09, 3.4, 0, 0, -1.2, N.post), Kit.cyl(0.07, 0.09, 3.4, 0, 0, 1.2, N.post),
    Kit.box(0.12, 1.7, 3.3, -0.06, 3.0, 0, a, { glow: true }), Kit.box(0.14, 1.2, 2.7, -0.08, 3.25, 0, N.base), Kit.box(0.16, 0.5, 2.3, -0.1, 3.6, 0, b, { glow: true }), Kit.box(0.16, 0.12, 2.3, -0.1, 3.2, 0, b, { glow: true })]);
  const ring = (cx, cy, R, thick, col, parts, n = 20) => { for (let k = 0; k < n; k++) { const a = 2 * Math.PI * k / n, len = 2 * Math.PI * R / n * 1.15; parts.push(Kit.box(len, thick, thick, cx + Math.cos(a) * R, cy + Math.sin(a) * R, 0, col, { glow: true, rz: a + Math.PI / 2 })); } };

  ENV3D.neon = {
    name: 'NEON QUARTER',
    sky: { top: '#03040c', mid: '#150a30', horizon: '#3c1050' },
    sunDisc: { color: '#ff5ad2', size: 5 },
    fog: { color: '#0b0e22', near: 24, far: 110 },
    hemi: { sky: '#a090e8', ground: '#4a3a80', intensity: 1.9 },      // dim enough to read as night, bright enough that crates, barriers and gates stay readable
    sun: { color: '#c0a8ff', intensity: 1.7, position: [-7, 9, 4] },
    groundFar: '#0a0e1a',
    road: {                                                                // near-black asphalt with neon lines
      asphalt: ['#0e1626', '#0b1220'], mark: '#ff4fe0', edge: '#6bff3a',
      curb: ['#3a2466', '#321e5a'], curbFace: '#1a0f33', walk: ['#18213a', '#141c32'], court: '#0e1526', verge: ['#0b111e', '#090e1a'],
    },
    innerOk: new Set(['neonLampM', 'neonLampC', 'stripM', 'stripG', 'neonBucket', 'neonBottle', 'neonCar', 'neonCapSign']),
    entrance: 'gateNeon',

    props: {
      neonTowerA: () => artTower(7, 6.5, 19, 1, 'towA'), neonTowerB: () => artTower(6.4, 6, 24, 2, 'towB'),
      neonBlockA: () => block(9.6, 7, 11.5, 3, N.mag), neonBlockB: () => block(9, 7.5, 14.5, 4, N.teal), neonBlockC: () => block(10, 6.5, 9, 5, N.green),
      neonShopA: () => shop(8.5, 6, 5.2, N.mag, N.yellow), neonShopB: () => shop(9, 6, 5.6, N.teal, N.green),
      neonLampM: lampOf(N.mag), neonLampC: lampOf(N.teal),
      // the third set: picture facades (the swirl on four grounds, a lit window, red dots, light rays), boards (landmarks), signs, a screen, a banner, a boutique and a parked car
      neonSwirlR: () => facadeBlock('swirlR', 9.4, 6.5, 12, N.red), neonSwirlP: () => facadeBlock('swirlP', 9.4, 6.5, 14, N.purple), neonSwirlG: () => facadeBlock('swirlG', 9.4, 6.5, 11, N.green), neonSwirlT: () => facadeBlock('swirlT', 9.4, 6.5, 15, N.teal),
      neonStreetBlock: () => facadeBlock('street', 8.4, 6.5, 12.5, N.yellow), neonDotsBlock: () => facadeBlock('dots', 9, 6.5, 13, N.mag), neonRaysTower: () => facadeBlock('rays', 6.4, 6, 24, N.purple),
      neonSwirlSign: () => board('swirl', 4.6, 2.4, N.mag),                                                                                                   // a sign on two posts (the swirl with its white fill keyed out)
      neonCapSign: () => art3([Kit.cyl(0.08, 0.1, 3.4, 0, 0, 0, N.post)], NeonArt.panel3('cap', -0.1, -1.7, 1.7, 3.3, 3.3 + 3.4 / NEON_ASSETS3.cap.ar)),         // a glowing cap shape on a pole
      neonDotScreen: () => art3([Kit.box(6, 8, 8.5, 3, 0, 0, N.base)], NeonArt.panel3('dotscreen', -0.08, -4.1, 4.1, 0.4, 7.6)),                                // cyan dots floating in front of a dark block
      neonLinesBanner: () => board('lines', 4.4, 2.6, N.green),
      neonShopD: () => art3([Kit.box(6, 5.6, 9, 3, 0, 0, N.bodyB), Kit.box(0.16, 0.2, 9.2, -0.05, 5.6, 0, N.teal, { glow: true }), Kit.box(6.2, 0.3, 9.2, 3, 5.6, 0, N.base)], NeonArt.panel3('stripes2', -0.06, -4.3, 4.3, 0.4, 5.2)),
      neonCar: () => art3([], NeonArt.panel3('car', 0, -2.4, 2.4, 0.05, 0.05 + 4.8 / NEON_ASSETS3.car.ar)),                                                  // a parked neon car, seen from the side
      neonBoardVortex: () => board('vortex', 9, 5.0, N.purple), neonBoardSphere: () => board('sphere', 8, 5.2, N.teal), neonBoardRings: () => board('rings', 8.4, 5.0, N.mag), neonBoardSpiral: () => board('spiral', 6.2, 4.0, N.yellow),   // landmarks
      neonBlockD: () => artBlock(9.6, 7, 12.5, 6, 'dots', N.teal), neonBlockE: () => artBlock(8.4, 6.5, 17, 7, 'lamps', N.yellow),
      neonShopC: () => art2([Kit.box(6, 5.6, 9, 3, 0, 0, N.bodyB), Kit.box(0.16, 0.2, 9.2, -0.05, 5.6, 0, N.yellow, { glow: true }), Kit.box(6.2, 0.3, 9.2, 3, 5.6, 0, N.base)], NeonArt.panel2('stripes', -0.06, -4.3, 4.3, 0.4, 5.2)),
      neonBlade: () => art2([Kit.box(0.5, 0.35, 0.5, 0, 0, 0, N.post)], NeonArt.cross('blade', 11, 0.3)),                                   // a tall glowing orange tube on a wall slice
      neonBanner: () => art2([Kit.cyl(0.08, 0.1, 5.6, 0, 0, 0, N.post), Kit.box(0.08, 0.08, 2.8, 0, 5.4, 1.2, N.post)], NeonArt.panel2('banner', 0.0, -0.1, 2.5, 2.6, 5.4)),            // a banner of green stripes hanging from an arm
      neonBucket: () => art2([Kit.cyl(0.45, 0.5, 0.06, 0, 0, 0, N.mag, { seg: 10, glow: true })], NeonArt.cross('bucket', 1.5, 0.05)),                                         // the bucket drawing, standing on a glowing disc
      neonBottle: () => art2([Kit.box(0.55, 0.45, 0.55, 0, 0, 0, N.post), Kit.box(0.6, 0.05, 0.6, 0, 0.45, 0, N.yellow, { glow: true })], NeonArt.cross('bottle', 2.3, 0.5)),    // a glowing bottle lamp on a plinth
      neonHalo: () => art2([Kit.cyl(0.18, 0.24, 3.0, 0, 0, -4.2, N.post), Kit.cyl(0.18, 0.24, 3.0, 0, 0, 4.2, N.post), Kit.box(0.3, 0.3, 9, 0, 3.0, 0, N.post), Kit.box(0.34, 0.12, 9.2, -0.05, 3.1, 0, N.mag, { glow: true })],
        NeonArt.panel2('ring', -0.1, -4.5, 4.5, 3.2, 3.2 + 9 / NEON_ASSETS2.ring.ar)),                                                                                         // landmark: a giant glossy ring on two posts
      stripM: stripOf(N.mag), stripG: stripOf(N.green), stripR: stripOf(N.red),
      neonSignA: signOf(N.mag, N.teal), neonSignB: signOf(N.green, N.yellow),
      neonBollard: () => Kit.merge([-1.6, 0, 1.6].flatMap(z => [Kit.cyl(0.13, 0.15, 0.8, 0, 0, z, N.post, { seg: 6 }), Kit.cyl(0.14, 0.14, 0.07, 0, 0.78, z, z ? N.mag : N.teal, { seg: 6, glow: true })])),
      // landmarks: one per stretch at most, never the same kind twice in a row (Stretch)
      neonRing: () => { const p = [Kit.cyl(0.18, 0.24, 5.4, 0, 0, -3.2, N.post), Kit.cyl(0.18, 0.24, 5.4, 0, 0, 3.2, N.post)]; ring(0, 6.4, 3.4, 0.3, N.mag, p); ring(0, 6.4, 2.6, 0.22, N.teal, p, 16); ring(0, 6.4, 1.8, 0.16, N.yellow, p, 12); ring(0, 6.4, 1.0, 0.12, N.green, p, 8); return Kit.merge(p); },
      neonSpire: () => { const p = [Kit.box(3.4, 26, 3.4, 0, 0, 0, N.body)]; for (let k = 0; k < 7; k++) p.push(Kit.box(3.7, 0.28, 3.7, 0, 2.5 + k * 3.4, 0, [N.mag, N.teal, N.yellow, N.purple][k % 4], { glow: true }));
        p.push(Kit.box(0.2, 26, 0.3, -1.72, 0, 0, N.teal, { glow: true }), Kit.cone(1.6, 5, 0, 26, 0, N.body), Kit.cyl(0.07, 0.07, 4, 0, 31, 0, N.post), Kit.ico(0.28, 0, 35.2, 0, N.red, { glow: true })); return Kit.merge(p); },
      // the big billboard: the user's neon LOUNGE sign (a square picture, shown square, 7.4 x 7.4 m) in a glowing frame on two posts
      neonBillboard: () => { const p = [Kit.box(0.4, 6.0, 0.4, 0, 0, -4.1, N.post), Kit.box(0.4, 6.0, 0.4, 0, 0, 4.1, N.post), Kit.box(0.3, 7.9, 8.1, -0.05, 5.5, 0),
          Kit.box(0.42, 0.22, 8.3, -0.1, 13.3, 0, N.mag, { glow: true }), Kit.box(0.42, 0.22, 8.3, -0.1, 5.35, 0, N.teal, { glow: true }),
          Kit.box(0.42, 8.1, 0.22, -0.1, 5.35, -4.2, N.yellow, { glow: true }), Kit.box(0.42, 8.1, 0.22, -0.1, 5.35, 4.2, N.green, { glow: true })];
        return { merged: Kit.merge(p), sprite: NeonArt.panel('bill', -0.24, -3.7, 3.7, 5.7, 13.1), material: () => NeonArt.material() }; },
      // marks where the street turns to neon (the first slot of the quarter): a glowing pylon
      gateNeon: () => Kit.merge([Kit.box(0.5, 4.2, 0.5, 0, 0, 0, N.post), Kit.box(0.12, 4.0, 0.2, -0.3, 0.1, 0, N.mag, { glow: true }), Kit.box(0.12, 4.0, 0.2, 0.3, 0.1, 0, N.green, { glow: true }), Kit.box(0.9, 0.24, 0.9, 0, 4.2, 0, N.yellow, { glow: true })]),
    },

    // Stretches (Stretch.of), eight characters (the last four use the user's materials):
    //   0 towers: tall striped slabs and blocks on the building line, tube lamps, neon strips along both kerbs
    //   1 signs: blocks set back, big glowing signs close to the road, bollards
    //   2 shops: low glowing shop fronts close to the street, strips, lamps
    //   3 canyon: sparse; only lamps, strips and one far tower on each side, so the sky opens up
    //   4 boutiques: low striped shops, bucket drawings and bottle lamps along the kerb, banners and orange light blades
    //   5 lounge: blocks with picture facades (blue dots, hanging lamps), light blades, bottle lamps
    //   6 gallery: facades of the swirl on four grounds, a lit window and red dots, swirl signs, a parked neon car
    //   7 screens: floating cyan dots, light-ray towers, a striped boutique, green-line banners, cap signs
    // A landmark (neon ring / spire / billboard / halo / the four pictures on posts: vortex, sphere, rings, spiral) replaces the building on its side of one slot per stretch.
    layout(i, rnd) {
      const out = [], LMS = ['neonRing', 'neonSpire', 'neonBillboard', 'neonHalo', 'neonBoardVortex', 'neonBoardSphere', 'neonBoardRings', 'neonBoardSpiral'], S = Stretch.of(i, 120, 8, LMS), TOW = ['neonTowerA', 'neonBlockA', 'neonTowerB', 'neonBlockD', 'neonBlockB', 'neonBlockE', 'neonBlockC'], SH = ['neonShopA', 'neonShopB'];
      for (const side of [-1, 1]) {
        const k = i * 2 + (side > 0 ? 1 : 0), r = n => rnd(k, n), lm = S.lm && S.lm.slot === i && S.lm.side === side ? S.lm.kind : null;
        const bld = (prop, x, dz) => { if (!lm) out.push({ prop, x: side * x, dist: 6 + dz }); };
        const strip = mod(i + (side > 0 ? 1 : 0), 3) === 0 ? 'stripG' : mod(i, 3) === 1 ? 'stripM' : 'stripR';
        const lamp = mod(i + (side > 0 ? 1 : 0), 2) === 0 ? 'neonLampM' : 'neonLampC';
        switch (S.variant) {
          case 0:
            bld(TOW[mod(i * 2 + (side > 0 ? 3 : 0) + S.b, TOW.length)], FRONT_X + 0.3 + r(1) * 0.6, (r(2) - 0.5) * 0.8);
            out.push({ prop: strip, x: side * 3.9, dist: 6 }); if (mod(i, 2) === (side > 0 ? 1 : 0)) out.push({ prop: lamp, x: side * 4.4, dist: 2.5 }); break;
          case 1:
            bld(TOW[mod(i + S.b + (side > 0 ? 2 : 0), TOW.length)], FRONT_X + 2.5 + r(1) * 0.8, (r(2) - 0.5) * 0.8);
            out.push({ prop: mod(i + (side > 0 ? 1 : 0), 2) ? 'neonSignA' : 'neonSignB', x: side * 5.6, dist: 3 + r(3) * 5 }, { prop: 'neonBollard', x: side * 4.5, dist: 9 }, { prop: strip, x: side * 3.9, dist: 6 });
            if (r(4) < 0.5) out.push({ prop: lamp, x: side * 4.4, dist: 11 }); break;
          case 2:
            bld(SH[mod(i + (side > 0 ? 1 : 0) + S.b, 2)], 6.9 + r(1) * 0.5, (r(2) - 0.5) * 0.8);
            out.push({ prop: strip, x: side * 3.9, dist: 6 }, { prop: lamp, x: side * 4.4, dist: 2.5 });
            if (r(3) < 0.5) out.push({ prop: 'neonBollard', x: side * 4.8, dist: 9 }); if (r(4) < 0.35) out.push({ prop: 'neonSignB', x: side * 5.6, dist: 9.5 }); break;
          case 4:                                                                       // boutiques: low striped shops, buckets and bottle lamps along the kerb, banners, orange light blades
            bld(mod(i + (side > 0 ? 1 : 0) + S.b, 3) === 0 ? 'neonShopC' : SH[mod(i + S.b, 2)], 7.0 + r(1) * 0.5, (r(2) - 0.5) * 0.8);
            out.push({ prop: strip, x: side * 3.9, dist: 6 }, { prop: 'neonBucket', x: side * 4.9, dist: 3 + r(3) * 2 }, { prop: r(4) < 0.5 ? 'neonBottle' : 'neonBucket', x: side * 5.0, dist: 9 + r(5) * 2 });
            if (mod(i + (side > 0 ? 1 : 0), 2) === 0) out.push({ prop: 'neonBanner', x: side * 4.6, dist: 6.5 }); else out.push({ prop: 'neonBlade', x: side * 4.5, dist: 6 }); break;
          case 5:                                                                       // lounge: blocks with picture facades, light blades and bottle lamps
            bld(['neonBlockD', 'neonBlockE', 'neonTowerB', 'neonBlockE'][mod(i * 3 + (side > 0 ? 2 : 0) + S.b, 4)], FRONT_X + 0.8 + r(1) * 0.6, (r(2) - 0.5) * 0.8);
            out.push({ prop: 'neonBlade', x: side * 4.5, dist: 2.5 }, { prop: strip, x: side * 3.9, dist: 6 });
            if (r(3) < 0.55) out.push({ prop: 'neonBottle', x: side * 5.0, dist: 8.5 }); if (r(4) < 0.4) out.push({ prop: 'neonBucket', x: side * 4.9, dist: 11 }); break;
          case 6:                                                                       // gallery: facades of the swirl on four grounds, a lit window, red dots; signs and a parked car
            bld(['neonSwirlR', 'neonSwirlP', 'neonStreetBlock', 'neonSwirlG', 'neonDotsBlock', 'neonSwirlT'][mod(i * 5 + (side > 0 ? 3 : 0) + S.b, 6)], FRONT_X + 0.8 + r(1) * 0.6, (r(2) - 0.5) * 0.8);
            out.push({ prop: strip, x: side * 3.9, dist: 6 }, { prop: lamp, x: side * 4.4, dist: 2.5 });
            if (r(3) < 0.5) out.push({ prop: 'neonCar', x: side * 5.6, dist: 6 }); else out.push({ prop: 'neonSwirlSign', x: side * 6.2, dist: 6 }); break;
          case 7:                                                                       // screens: floating cyan dots, light-ray towers, a striped boutique, banners, cap signs
            bld([ 'neonRaysTower', 'neonDotScreen', 'neonShopD', 'neonRaysTower', 'neonDotScreen'][mod(i * 3 + (side > 0 ? 2 : 0) + S.b, 5)], mod(i + S.b, 5) === 2 ? 7.0 + r(1) * 0.4 : FRONT_X + 1.0 + r(1) * 0.6, (r(2) - 0.5) * 0.8);
            out.push({ prop: strip, x: side * 3.9, dist: 6 }, { prop: r(3) < 0.5 ? 'neonCapSign' : 'neonLinesBanner', x: side * (r(3) < 0.5 ? 4.6 : 6.4), dist: 8 + r(4) * 2 });
            if (r(5) < 0.5) out.push({ prop: 'neonBottle', x: side * 5.0, dist: 3 }); break;
          default:
            if (mod(i + (side > 0 ? 1 : 0), 3) === 1) bld(TOW[mod(i + S.b + (side > 0 ? 3 : 0), TOW.length)], 15 + r(1) * 4, (r(2) - 0.5) * 2);
            out.push({ prop: strip, x: side * 3.9, dist: 6 }); if (mod(i + (side > 0 ? 1 : 0), 2) === 0) out.push({ prop: lamp, x: side * 4.4, dist: 4 + r(3) * 4 });
        }
        if (lm) out.push({ prop: lm, x: side * (lm === 'neonRing' ? 9.5 : lm === 'neonSpire' ? 10.5 : lm === 'neonHalo' ? 9.5 : lm.startsWith('neonBoard') ? 11.5 : 9.0), dist: 6 });
      }
      return out;
    },
  };
})();
