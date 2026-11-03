// Items3D: pooled coins and hazards. Each kind's geometry is merged once and shared by every instance; instances are
// Groups placed per frame (begin -> place* -> end), so nothing is allocated while the game runs.
// Every hazard's size comes from the gameplay collision table (OBST x U3), so what you see is what you can hit:
//   crate   THE VORTEX (VortexArt): a 2 m disc, the user's red glass ring with her spiral that turns and pulls, and a funnel of swirls 1.05 m tall: jump over it, or it absorbs you   (was a wooden crate)
//   barrier 2.77 m wide, 0.68 m tall          (jump over it)
//   over    gate posts 3.9 m apart, banner from 1.15 m to the top beam (slide under it; the gap is 1.05 m)
//   coin    ringed disc of radius 0.32 m, spinning and bobbing
// The 3D build's collectibles (see src/perks.js), each with its own silhouette and colour so they are told apart at a glance and at speed, all spinning and bobbing out of sync:
//   magnet   a red horseshoe with silver, cyan-lit tips            aura     a teal shield bubble with two turning rings and a bright core
//   dash     two orange chevrons pointing up (forward) inside a glowing ring     shard    a violet crystal fragment with a pale core and two chips orbiting it
//   waymark  a gold diamond inside two crossed gold rings (rare: one per fork route)
class Items3D {
  constructor(scene) {
    const P = PAL3, mats = Kit.materials(), X = U3.X, Y = U3.Y;
    const vHW = OBST.vicLow.hw * X, vAW = OBST.vicAJump.hw * X, hwB = OBST.barrier.hw * X, cHW = OBST.crate.hw * X, cH = OBST.crate.y1 * Y, bHW = OBST.barrier.hw * X, bH = OBST.barrier.y1 * Y;
    const oHW = OBST.over.hw * X, gap = OBST.over.y0 * Y, oTop = OBST.over.y1 * Y;
    // the cheese cart's chalkboard (shared by every cart): the board of the photo, white chalk on black in a wooden frame
    const chalk = (() => {
      const cv = document.createElement('canvas'); cv.width = 256; cv.height = 128; const c = cv.getContext('2d');
      c.fillStyle = '#6a4a30'; c.fillRect(0, 0, 256, 128); c.fillStyle = '#1d1f1e'; c.fillRect(8, 8, 240, 112);
      c.fillStyle = '#f2f0e8'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = 'bold 25px "Arial Narrow", Arial, sans-serif';
      c.fillText('NOORD HOLLANDS', 128, 28); c.fillText('OUD SNIJDBAAR', 128, 60); c.font = 'bold 34px Arial, sans-serif'; c.fillStyle = '#f5d768'; c.fillText('500', 128, 96);
      const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
      return { geo: new THREE.PlaneGeometry(0.98, 0.49), mat: new THREE.MeshBasicMaterial({ map: tex }) };
    })();
    const kinds = {
      crate: () => VortexArt.solid(),                                                  // the vortex: its solid parts here, the pictures and the funnel as extras (below)
      barrier: () => {                                                                // low striped road barrier on two feet
        const p = [Kit.box(0.2, 0.3, 0.26, -(bHW - 0.14), 0, 0, P.metal), Kit.box(0.2, 0.3, 0.26, bHW - 0.14, 0, 0, P.metal)];
        const n = 12, w = 2 * bHW / n;
        for (let k = 0; k < n; k++) p.push(Kit.box(w + 0.005, 0.3, 0.3, -bHW + (k + 0.5) * w, bH - 0.3, 0, k % 2 ? P.stripeCream : P.stripeRed));
        return Kit.merge(p);
      },
      over: () => {                                                                   // gate: two posts, a top beam and a hanging banner
        const p = [], mid = (gap + oTop) / 2 + 0.1;
        for (const x of [-(oHW - 0.1), oHW - 0.1]) p.push(Kit.box(0.2, oTop + 0.1, 0.22, x, 0, 0, P.metal), Kit.box(0.28, 0.16, 0.3, x, 0, 0, P.woodDark));
        p.push(Kit.box(2 * oHW + 0.3, 0.22, 0.26, 0, oTop - 0.12, 0, P.woodDark));      // top beam
        p.push(Kit.box(2 * (oHW - 0.3), oTop - 0.15 - gap - 0.1, 0.1, 0, gap + 0.1, 0, P.burgundy));   // banner cloth: bottom edge 0.1 m above the gap line
        p.push(Kit.box(2 * (oHW - 0.3) + 0.04, 0.12, 0.12, 0, gap + 0.05, 0, P.capBand), Kit.box(2 * (oHW - 0.3) + 0.04, 0.1, 0.12, 0, oTop - 0.25, 0, P.capBand));
        p.push(Kit.ico(0.5, 0, mid, 0.06, P.capBand, { sz: 0.35, detail: 1 }), Kit.ico(0.26, 0, mid, 0.1, P.burgundy, { sz: 0.35 }));   // emblem
        return Kit.merge(p);
      },
      // the coin: concentric rings on both faces (a green core with cream and lime bands, a thick green band, a hot-pink ring, a lilac rim) on a lilac edge.
      // Radius 0.32 m as before (the pickup box is unchanged). Faces are flat unlit bands, so the colours read the same in every biome's light.
      coin: () => {
        const R = 0.32, HT = 0.04, parts = [Kit.cyl(R, R, 2 * HT, 0, -HT, 0, '#a46cf0', { rx: Math.PI / 2, seg: 22 })];
        const BANDS = [[0, 0.07, '#c8ffb8'], [0.07, 0.14, '#52ff2e'], [0.14, 0.21, '#aef59a'], [0.21, 0.29, '#52ff2e'], [0.29, 0.37, '#e9f7a8'], [0.37, 0.47, '#8dff1f'],
                       [0.47, 0.55, '#f0eeb8'], [0.55, 0.65, '#7dff2a'], [0.65, 0.73, '#f2e8c0'], [0.73, 0.86, '#62d444'], [0.86, 0.9, '#ffffff'], [0.9, 0.95, '#ff2a8a'], [0.95, 1, '#d9baff']];
        for (const face of [1, -1]) for (const [a, b, col] of BANDS) {
          const geo = new THREE.RingGeometry(a * R, b * R, 22, 1); if (face < 0) geo.rotateY(Math.PI); geo.translate(0, 0, face * (HT + 0.002));
          const g = geo.toNonIndexed(); geo.dispose(); g.deleteAttribute('uv'); g.deleteAttribute('normal'); g.computeVertexNormals();
          parts.push({ geo: g, color: col, glow: true });
        }
        return Kit.merge(parts);
      },
    };
    // ---- the collectibles of the 3D build: shared geometry, built once. `glow` parts are unlit (they keep their colour in every biome's light), the translucent and additive materials are shared.
    const sheen = (col, op, add) => new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: op, depthWrite: false, side: THREE.DoubleSide, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending });
    const SH = { aura: sheen('#5ff0d0', 0.2), auraRing: sheen('#8ffbe6', 0.85, true), dashRing: sheen('#ffb347', 0.8, true), wayRing: sheen('#ffe08a', 0.9, true) };
    const G = { shell: new THREE.IcosahedronGeometry(0.46, 1), ring: new THREE.TorusGeometry(0.42, 0.022, 5, 22), ringBig: new THREE.TorusGeometry(0.5, 0.026, 5, 24), ringWay: new THREE.TorusGeometry(0.48, 0.024, 5, 24) };
    const kinds2 = {
      magnet: () => {
        const p = [], R = 0.26;
        for (let k = 0; k <= 6; k++) { const a = Math.PI * k / 6; p.push(Kit.box(0.13, 0.15, 0.15, Math.cos(a) * R, Math.sin(a) * R - 0.075, 0, k % 2 ? '#e0344a' : '#c42a40', { rz: a })); }             // the arch
        for (const sx of [-1, 1]) p.push(Kit.box(0.13, 0.2, 0.15, sx * R, -0.3, 0, '#e0344a'), Kit.box(0.14, 0.12, 0.16, sx * R, -0.4, 0, '#e9eef7'), Kit.box(0.15, 0.035, 0.17, sx * R, -0.235, 0, '#35e6ff', { glow: true }));   // legs, silver tips, cyan bands
        p.push(Kit.box(0.13, 0.1, 0.17, 0, R + 0.1, 0, '#ffd2d8', { glow: true }));                                                                                           // a highlight on the crown
        return Kit.merge(p);
      },
      shard: () => {
        const p = [Kit.ico(0.22, 0, 0, 0, '#b86bff', { sy: 2.4, sx: 0.8, sz: 0.8, rz: 0.35, glow: true }), Kit.ico(0.12, 0, 0, 0, '#e8fbff', { sy: 2.2, sx: 0.7, sz: 0.7, rz: 0.35, glow: true }),
                    Kit.ico(0.09, 0.3, 0.12, 0.05, '#7cf5ff', { sy: 1.8, glow: true, rz: -0.5 }), Kit.ico(0.07, -0.28, -0.14, -0.05, '#d9baff', { sy: 1.8, glow: true, rz: 0.9 })];
        return Kit.merge(p);
      },
      dash: () => {                                                                                                                                                              // two stacked chevrons pointing up (forward), thick so they read from any angle, inside a ring
        const p = [];
        for (const [dy, col] of [[0.2, '#ffb347'], [-0.1, '#ff7a1a']]) for (const sx of [-1, 1]) p.push(Kit.box(0.34, 0.13, 0.15, sx * 0.14, dy, 0, col, { glow: true, rz: -sx * 0.62 }));
        p.push(Kit.box(0.1, 0.1, 0.1, 0, 0.4, 0, '#fff0c0', { glow: true }));
        return Kit.merge(p);
      },
      waymark: () => {
        const p = [Kit.ico(0.3, 0, 0, 0, '#ffc94a', { sy: 1.7, sx: 0.85, sz: 0.85, glow: true }), Kit.ico(0.16, 0, 0, 0, '#fff4c8', { sy: 1.6, sx: 0.8, sz: 0.8, glow: true }),
                   Kit.box(0.5, 0.06, 0.06, 0, 0.55, 0, '#ffe08a', { glow: true }), Kit.box(0.06, 0.2, 0.06, 0, 0.45, 0, '#ffe08a', { glow: true })];                           // a little crown bar: a "marker"
        return Kit.merge(p);
      },
    };
    // extra meshes of a pooled instance (rings, the bubble) and the per-frame motion of each kind
    const extras = {
      aura: g => { const core = Kit.merge([Kit.ico(0.17, 0, 0, 0, '#5ff0d0', { glow: true, detail: 0 }), Kit.ico(0.09, 0, 0, 0, '#ffffff', { glow: true })]); g.add(new THREE.Mesh(core.glow, mats.glow));
                   // the pickup IS the protective sphere, full size (the same 1.15 m as the bubble round the runner, the user's dotted sphere): the runner that collects it is INSIDE it, and the bubble that takes its place is the same sphere
                   const sp = SphereArt.mesh(1.15, 0.5, 28); sp.position.y = 0.2; g.add(sp); g.userData.sphere = sp;
                   const r1 = new THREE.Mesh(G.ring, SH.auraRing), r2 = new THREE.Mesh(G.ring, SH.auraRing); r1.scale.setScalar(2.74); r2.scale.setScalar(2.74); r1.position.y = r2.position.y = 0.2; r2.rotation.x = Math.PI / 2; g.add(r1, r2); g.userData.r1 = r1; g.userData.r2 = r2; },
      raceGate: g => { const sp = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.6), RaceArt.sphereMaterial()); sp.position.y = 1.5; g.add(sp); g.userData.sp = sp; const r1 = new THREE.Mesh(G.ringWay, SH.wayRing); r1.scale.setScalar(1.7); r1.position.y = 1.5; g.add(r1); g.userData.r1 = r1; },
      crate: g => VortexArt.attach(g), crateW: g => VortexArt.attach(g),
      crateS: g => { const m = new THREE.Mesh(chalk.geo, chalk.mat); m.position.set(0, 0.64, 0.472); g.add(m); },                // the chalkboard on the counter's front
      dash: g => { const r = new THREE.Mesh(G.ringBig, SH.dashRing); r.position.z = -0.05; g.add(r); g.userData.r1 = r; },
      waymark: g => { const r1 = new THREE.Mesh(G.ringWay, SH.wayRing), r2 = new THREE.Mesh(G.ringWay, SH.wayRing); r2.rotation.x = Math.PI / 2; g.add(r1, r2); g.userData.r1 = r1; g.userData.r2 = r2; },
    };
    this.extraKinds = ['magnet', 'shard', 'dash', 'waymark', 'aura', 'raceGate']; this.extraSet = { magnet: 1, shard: 1, dash: 1, waymark: 1, aura: 1, raceGate: 1 };
    // pool sizes cover everything inside the 150 m draw range, including both roads of a fork
    const POOL = { coin: 140, crate: 40, barrier: 24, over: 24, crateW: 40, barrierW: 24, overW: 24, crateS: 24, vicLow: 24, vicBarrel: 24, vicPot: 24, vicAJump: 24, vicMJump: 24, vicMSlide: 24, vicASlide: 24, vicChairs: 24, vicHigh: 24, vicHang: 24, barrierS: 24, barrierB: 24, overS: 24, raceGate: 3, magnet: 6, shard: 16, dash: 6, waymark: 6, aura: 6 };
    this.pool = {}; this.used = {}; this.merged = {}; this.dropped = 0;
    // ---- the hazards on the canals (Renderer3D picks `<kind>W` for an item on a water road): the same sizes and boxes as the crate, the low barrier and the gate, so what you see is what you can hit
    //   crateW   a whirlpool: the same vortex (it was floating barrels)
    //   barrierW a white rowing boat across the canal with a red lantern at each end, 2.77 m wide, 0.68 m tall: jump over it
    //   overW    a low brick footbridge on two piers, its underside 1.05 m above the water, nothing above 3.6 m (the camera passes over it): slide under it
    const kindsW = {
      crateW: () => VortexArt.solid(),                                                 // on the canals the same vortex: a whirlpool
      barrierW: () => {
        const p = [], W = '#e8eae4', hw = bHW;
        p.push(Kit.box(2 * hw - 0.9, 0.36, 0.95, 0, 0, 0, W), Kit.box(0.6, 0.34, 0.7, -(hw - 0.55), 0, 0, W), Kit.box(0.6, 0.34, 0.7, hw - 0.55, 0, 0, W), Kit.box(0.34, 0.3, 0.45, -(hw - 0.2), 0.05, 0, W), Kit.box(0.34, 0.3, 0.45, hw - 0.2, 0.05, 0, W),
          Kit.box(2 * hw - 1.2, 0.05, 0.9, 0, 0.36, 0, '#9b9c94'), Kit.box(0.12, 0.05, 0.9, -0.5, 0.4, 0, W), Kit.box(0.12, 0.05, 0.9, 0.5, 0.4, 0, W), Kit.box(2 * hw - 0.9, 0.05, 0.99, 0, 0.3, 0, '#2f5d8c'));
        for (const sx of [-1, 1]) p.push(Kit.box(0.05, 0.3, 0.05, sx * (hw - 0.25), 0.38, 0, '#2a2430'), Kit.box(0.14, 0.12, 0.14, sx * (hw - 0.25), 0.56, 0, '#ff3a2a', { glow: true }));
        p.push(Kit.box(0.04, 0.04, 2.0, -0.2, 0.41, 0, '#7a5230', { ry: 0.5 }), Kit.box(0.04, 0.04, 2.0, 0.3, 0.41, 0, '#7a5230', { ry: -0.5 }));            // two oars across the thwarts
        return Kit.merge(p);
      },
      overW: () => {
        const p = [], BR = '#92503f', BR2 = '#7a4234', ST = '#a29686', px = oHW - 0.25;
        for (const sx of [-1, 1]) p.push(Kit.box(0.7, oTop - 0.2, 1.4, sx * px, 0, 0, BR2), Kit.box(0.84, 0.2, 1.5, sx * px, 0, 0, '#6c655d'));
        p.push(Kit.box(2 * oHW + 0.7, oTop - gap - 0.2, 1.4, 0, gap, 0, BR), Kit.box(2 * oHW + 0.9, 0.2, 1.6, 0, oTop - 0.2, 0, ST), Kit.box(2 * oHW - 0.4, 0.06, 1.3, 0, gap - 0.04, 0, '#2a2430'));
        for (let k = 0; k < 5; k++) p.push(Kit.box(0.5, 0.18, 1.42, -oHW + 0.2 + k * (2 * oHW - 0.4) / 4, oTop - 0.5, 0, k % 2 ? ST : '#6c655d'));            // a course of pale stones
        for (const sx of [-1, 1]) for (const a of [Math.PI / 4, -Math.PI / 4]) p.push(Kit.box(0.08, 0.8, 0.06, sx * 0.9, oTop - 0.9, 0.73, '#202228', { rz: a }), Kit.box(0.08, 0.8, 0.06, sx * 0.9, oTop - 0.9, -0.73, '#202228', { rz: a }));   // X-shaped wall anchors
        return Kit.merge(p);
      },
    };
    // ---- the hazards of the upper circuit of Utrecht (Renderer3D picks `<kind>S` for an item on the raised road, the quay): the cheese cart, from the user's photo. crateS: a wooden counter 1.2 m wide and 1.0 m high (the crate's box:
    // jump over it), two grey wheels, two handles, yellow and black cheeses with a cut wedge on top, two posts and a red and white gingham awning (above the box, 1.6 m and more), the chalkboard on its front (an extra mesh)
    const kindsS = {
      // VIC: the café terrace of the user's photo as three hazards, each half a street wide (the box: OBST.vicLow / vicHigh / vicHang, hw 0.3 lane = 2.1 m), standing against one wall. Local x = 0 is the middle of the half.
      vicLow: () => {                                                                                       // two small tables, folding chairs with orange seats, a shrub at the end: 0.68 m high, jump over it
        const p = [], hw = vHW, G = '#2a2a2e', OR = '#d9772e';
        for (const tx of [-0.5, 0.5]) { p.push(Kit.cyl(0.4, 0.4, 0.04, tx, bH - 0.04, 0, '#3a3a40', { seg: 8 }), Kit.cyl(0.04, 0.05, bH - 0.05, tx, 0, 0, G, { seg: 6 }), Kit.cyl(0.2, 0.2, 0.03, tx, 0, 0, G, { seg: 8 }));
          for (const [dx, dz] of [[-0.55, 0.1], [0.55, -0.1], [0.05, 0.55]]) p.push(Kit.box(0.36, 0.04, 0.36, tx + dx, 0.34, dz, OR), Kit.box(0.34, 0.3, 0.04, tx + dx, 0.36, dz + (dz > 0.3 ? 0.18 : 0.0) - (dz > 0.3 ? 0 : 0.18), G), Kit.box(0.04, 0.34, 0.04, tx + dx - 0.14, 0, dz - 0.14, G), Kit.box(0.04, 0.34, 0.04, tx + dx + 0.14, 0, dz + 0.14, G)); }
        p.push(Kit.ico(0.42, hw - 0.5, 0.42, 0.0, '#3f7a3f', { detail: 1, sy: 0.9 }), Kit.cyl(0.3, 0.25, 0.28, hw - 0.5, 0, 0.0, '#6a4a3a', { seg: 6 }));
        return Kit.merge(p);
      },
      vicBarrel: () => {                                                                                    // two oak barrels with grey iron hoops, a zinc bucket with a plant on one (the user's photo)
        const p = [], W = '#c9ae88', WD = '#b09a76', H = '#6a6a6e'; 
        for (const [bx, s] of [[-0.5, 1], [0.55, 0.9]]) { const h = 0.95 * s, r = 0.4 * s;
          p.push(Kit.cyl(r * 0.88, r, h * 0.5, bx, 0, 0, W, { seg: 12 }), Kit.cyl(r, r * 0.88, h * 0.5, bx, h * 0.5, 0, W, { seg: 12 }), Kit.cyl(r * 0.9, r * 0.9, 0.03, bx, h, 0, WD, { seg: 12 }));
          for (const y of [0.08, 0.3, 0.62, 0.86]) p.push(Kit.cyl(r * (0.93 + 0.07 * Math.sin((y / 0.95) * Math.PI)) + 0.012, r * (0.93 + 0.07 * Math.sin((y / 0.95) * Math.PI)) + 0.012, 0.07, bx, y * s, 0, H, { seg: 12 })); }
        p.push(Kit.cyl(0.2, 0.15, 0.28, -0.5, 0.95, 0, '#c8ccd0', { seg: 10 }), Kit.ico(0.24, -0.5, 1.35, 0, '#4d7a45', { detail: 1 }), Kit.ico(0.14, -0.4, 1.45, 0.08, '#d9667c', { detail: 0 }));
        return Kit.merge(p);
      },
      vicChairs: () => {                                                                                    // two armchairs, grey frames with brown wooden slats, one facing the other (the user's photo)
        const p = [], F = '#5a5850', Wd = '#7a3a2a';
        for (const [cx, ry] of [[-0.55, Math.PI / 2], [0.55, -Math.PI / 2]]) { const o = { ry };
          p.push(Kit.box(0.5, 0.05, 0.5, cx, 0.42, 0, Wd, o), Kit.box(0.5, 0.2, 0.04, cx + (ry > 0 ? -0.23 : 0.23), 0.55, 0, Wd, { ry }), Kit.box(0.5, 0.16, 0.04, cx + (ry > 0 ? -0.23 : 0.23), 0.78, 0, Wd, { ry }));
          for (const dz of [-0.26, 0.26]) p.push(Kit.box(0.54, 0.06, 0.05, cx, 0.62, dz, F), Kit.box(0.05, 0.62, 0.05, cx + 0.22, 0, dz, F), Kit.box(0.05, 0.84, 0.05, cx - 0.22, 0, dz, F)); }
        return Kit.merge(p);
      },
      vicPot: () => {                                                                                       // two big terracotta pots with round shrubs (the planters of the street): 1.05 m, jump over
        const p = [];
        for (const [bx, s2, c] of [[-0.5, 1, '#3f7a3f'], [0.55, 0.9, '#355d3a']]) p.push(Kit.cyl(0.42 * s2, 0.3 * s2, 0.75 * s2, bx, 0, 0, '#b0603f', { seg: 10 }), Kit.cyl(0.46 * s2, 0.46 * s2, 0.08, bx, 0.72 * s2, 0, '#9a4e32', { seg: 10 }), Kit.ico(0.62 * s2, bx, 1.2 * s2, 0, c, { detail: 1 }), Kit.ico(0.4 * s2, bx + 0.25, 1.55 * s2 - 0.1, 0.1, '#4d7a45', { detail: 1 }), Kit.ico(0.1, bx - 0.2, 1.6 * s2 - 0.1, 0.25, '#d9667c', { detail: 0 }));
        return Kit.merge(p);
      },
      vicAJump: () => {                                                                                     // across the alley: three low wooden crates with pots of flowers and a basket, wall to wall (0.8 m): jump over it
        const p = [], aw = vAW, W = '#b2814f', WD = '#8a5e36';
        for (const bx of [-aw * 0.62, 0, aw * 0.62]) { p.push(Kit.box(0.95, 0.62, 0.8, bx, 0, 0, W), Kit.box(0.99, 0.06, 0.84, bx, 0.6, 0, '#d3a76c'), Kit.box(0.97, 0.05, 0.82, bx, 0.28, 0, WD)); }
        for (const [bx, c] of [[-aw * 0.31, '#d9667c'], [aw * 0.31, '#e8b84a'], [-aw * 0.9, '#b07ad9'], [aw * 0.9, '#d9667c']]) p.push(Kit.cyl(0.2, 0.15, 0.3, bx, 0.0, 0.3, '#b0603f', { seg: 8 }), Kit.ico(0.26, bx, 0.45, 0.3, '#4d7a45', { detail: 1 }), Kit.ico(0.12, bx + 0.05, 0.62, 0.32, c, { detail: 0 }));
        return Kit.merge(p);
      },
      vicASlide: () => {                                                                                    // a washing line from wall to wall with sheets and clothes hanging from it (1.15 m up to 2.8 m): slide under
        const p = [], aw = vAW, cols = ['#f2efe6', '#e8a0a0', '#8ab0d8', '#f2c230', '#f2efe6', '#a8c890', '#d9667c'];
        p.push(Kit.box(0.18, 0.14, 0.2, -aw, 2.8, 0, '#202228'), Kit.box(0.18, 0.14, 0.2, aw, 2.8, 0, '#202228'), Kit.box(2 * aw, 0.03, 0.03, 0, 2.85, 0, '#202228'));
        for (let k = 0; k < 7; k++) { const x = -aw + 0.35 + k * (2 * aw - 0.7) / 6, h = 0.9 + (k % 3) * 0.28; p.push(Kit.box(0.5, h, 0.05, x, 2.85 - h, 0, cols[k], { rz: ((k % 2) ? 1 : -1) * 0.05 }), Kit.box(0.06, 0.06, 0.08, x - 0.2, 2.82, 0, '#6a5a40'));  }
        return Kit.merge(p);
      },
      vicMJump: () => {                                                                                     // big blue tapered planters with green rims and shrubs, wall to wall (0.75 m): jump over them (the user's photo)
        const p = [], aw = vAW;
        for (const bx of [-aw * 0.62, 0, aw * 0.62]) p.push(Kit.cyl(0.5, 0.33, 0.72, bx, 0, 0, '#2f5d9a', { seg: 4, ry: Math.PI / 4 }), Kit.cyl(0.54, 0.54, 0.07, bx, 0.7, 0, '#3f8a5a', { seg: 4, ry: Math.PI / 4 }), Kit.ico(0.36, bx, 0.98, 0, '#4d7a45', { detail: 1 }), Kit.ico(0.2, bx + 0.12, 1.2, 0.1, '#6aa050', { detail: 1 }));
        return Kit.merge(p);
      },
      vicMSlide: () => {                                                                                    // a carved wooden awning wall to wall, its toothed front edge hanging to 1.2 m (the user's photo): slide under it
        const p = [], aw = vAW, W = '#b0652e', WD = '#7a4a24';
        p.push(Kit.box(2 * aw, 0.12, 1.1, 0, 2.9, 0, W), Kit.box(2 * aw, 1.3, 0.08, 0, 1.55, 0.5, W), Kit.box(0.14, 1.5, 0.2, -aw + 0.1, 1.5, 0, WD), Kit.box(0.14, 1.5, 0.2, aw - 0.1, 1.5, 0, WD));
        for (let t = 0; t < 14; t++) p.push(Kit.box(0.16, 0.22, 0.1, -aw + 0.25 + t * (2 * aw - 0.5) / 13, 1.35, 0.5, WD), Kit.cyl(0.07, 0.07, 0.1, -aw + 0.4 + t * (2 * aw - 0.8) / 13, 1.9 + (t % 3) * 0.2, 0.55, '#2a1a10', { rx: Math.PI / 2, seg: 6 }));
        return Kit.merge(p);
      },
      vicHigh: () => {                                                                                      // a patio heater (a black column with a glass lamp), a big planter, folding chairs stacked against the wall: too tall to jump
        const p = [], hw = vHW, G = '#2a2a2e';
        p.push(Kit.cyl(0.3, 0.34, 0.2, -0.45, 0, 0, G, { seg: 8 }), Kit.cyl(0.16, 0.16, 1.9, -0.45, 0.2, 0, G, { seg: 8 }), Kit.cyl(0.26, 0.2, 0.7, -0.45, 2.1, 0, '#d8e8f0', { seg: 8 }), Kit.cone(0.4, 0.25, -0.45, 2.8, 0, G, { seg: 8 }), Kit.box(0.3, 0.2, 0.3, -0.45, 2.3, 0, '#ffb060', { glow: true }));
        p.push(Kit.cyl(0.55, 0.45, 0.7, 0.35, 0, 0, '#6a4a3a', { seg: 8 }), Kit.ico(0.7, 0.35, 1.2, 0, '#3f7a3f', { detail: 1 }), Kit.ico(0.5, 0.55, 1.7, 0.1, '#355d3a', { detail: 1 }));
        for (let k = 0; k < 5; k++) p.push(Kit.box(0.4, 0.05, 0.4, hw - 0.4, 0.4 + k * 0.38, 0.1, '#d9772e'), Kit.box(0.4, 0.4, 0.04, hw - 0.4, 0.45 + k * 0.38, -0.1, G), Kit.box(0.04, 0.4 + k * 0.38, 0.04, hw - 0.58, 0, 0.28, G), Kit.box(0.04, 0.4 + k * 0.38, 0.04, hw - 0.22, 0, -0.08, G));
        return Kit.merge(p);
      },
      vicHang: () => {                                                                                      // a big beige parasol on a pole against the wall, its arm carrying the canopy over the street half: the canopy is over your head (from 1.15 m up), slide under it
        const p = [], hw = vHW, b = '#e6dcc0', b2 = '#cfc4a4', px = hw - 0.1;
        p.push(Kit.cyl(0.05, 0.06, 2.7, px, 0, 0, '#3a3a40', { seg: 6 }), Kit.cyl(0.3, 0.3, 0.06, px, 0, 0, '#3a3a40', { seg: 8 }), Kit.box(px + 0.1, 0.05, 0.05, px / 2, 2.55, 0, '#3a3a40'));
        for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; p.push(Kit.box(0.5, 0.04, 1.0, Math.cos(a) * 0.5, 2.3, Math.sin(a) * 0.5, k % 2 ? b : b2, { ry: -a })); }
        p.push(Kit.cone(1.05, 0.6, 0, 1.9, 0, b, { seg: 8 }));
        return Kit.merge(p);
      },
      // the café terrace and the parked bicycles (low barriers, 2.77 m across, 0.68 m high: jump over them) and the bar's awning (a gate to slide under) of the street
      barrierS: () => {
        const p = [], G = '#1f5a3a', hw = bHW;
        for (const tx of [-0.65, 0.65]) { p.push(Kit.cyl(0.42, 0.42, 0.04, tx, bH - 0.04, 0, '#7a5a3a', { seg: 10 }), Kit.cyl(0.04, 0.06, bH - 0.06, tx, 0, 0, G, { seg: 6 }), Kit.cyl(0.2, 0.2, 0.03, tx, 0, 0, G, { seg: 8 }), Kit.cyl(0.12, 0.12, 0.02, tx, bH, 0, '#e8dcc0', { seg: 6 }));
          for (const [dx, dz, a] of [[-0.58, 0, 0], [0.58, 0, 0], [0, -0.56, 1], [0, 0.56, 1]]) p.push(Kit.box(0.36, 0.05, 0.36, tx + dx, 0.34, dz, G), Kit.box(a ? 0.36 : 0.05, 0.3, a ? 0.05 : 0.36, tx + dx + (a ? 0 : dx < 0 ? -0.18 : 0.18), 0.34, dz + (a ? (dz < 0 ? -0.18 : 0.18) : 0), G), Kit.box(0.04, 0.34, 0.04, tx + dx - 0.14, 0, dz - 0.14, G), Kit.box(0.04, 0.34, 0.04, tx + dx + 0.14, 0, dz + 0.14, G)); }
        return Kit.merge(p);
      },
      barrierB: () => {
        const p = [], cols = ['#26262c', '#b83a3a', '#2f4a6a', '#3a3a42', '#26262c'];
        for (let k = 0; k < 5; k++) { const x = -hwB + 0.3 + k * ((2 * hwB - 0.6) / 4), c = cols[k];
          for (const z of [-0.5, 0.5]) p.push(Kit.cyl(0.25, 0.25, 0.05, x, 0.23, z, '#1a1a1e', { rz: Math.PI / 2, seg: 10 }), Kit.cyl(0.04, 0.04, 0.07, x, 0.215, z, '#9a9ea6', { rz: Math.PI / 2, seg: 4 }));
          p.push(Kit.box(0.05, 0.05, 1.0, x, 0.42, 0, c), Kit.box(0.05, 0.3, 0.05, x, 0.25, 0.1, c), Kit.box(0.14, 0.05, 0.26, x, 0.56, -0.25, '#26262c'), Kit.box(0.5, 0.05, 0.05, x, 0.64, 0.45, '#26262c'), Kit.box(0.28, 0.16, 0.3, x, 0.3, 0.55, '#6a5a40')); }
        return Kit.merge(p);
      },
      overS: () => {
        const p = [], px = oHW - 0.25, n = 12, w = (2 * oHW + 0.2) / n;
        for (const sx of [-1, 1]) p.push(Kit.box(0.2, oTop, 0.22, sx * px, 0, 0, '#202228'), Kit.box(0.3, 0.2, 0.32, sx * px, 0, 0, '#6c655d'), Kit.box(0.34, 0.3, 0.34, sx * px, oTop - 0.9, 0.0, '#ffbd70', { glow: true }));
        p.push(Kit.box(2 * oHW + 0.4, 0.14, 0.3, 0, oTop - 0.14, 0, '#202228'));
        for (let k = 0; k < n; k++) { const x = -oHW - 0.1 + (k + 0.5) * w, c = k % 2 ? '#f2e6e2' : '#6a1f2c'; p.push(Kit.box(w + 0.004, oTop - gap - 0.55, 0.1, x, gap + 0.3, 0.12, c), Kit.box(w + 0.004, 0.3, 0.08, x, gap, 0.12, c, { rx: 0 }), Kit.box(w + 0.004, 0.05, 0.9, x, oTop - 0.3, -0.25, c, { rx: -0.3 })); }
        p.push(Kit.box(1.2, 0.34, 0.06, 0, (gap + oTop) / 2, 0.19, '#26262c'), Kit.box(0.9, 0.18, 0.05, 0, (gap + oTop) / 2 + 0.08, 0.23, '#ffbd70', { glow: true }));       // BAR, a lit sign on the cloth
        return Kit.merge(p);
      },
      crateS: () => {
        const p = [], W = '#b2814f', WD = '#8a5e36', WL = '#d3a76c', hw = cHW;
        p.push(Kit.box(2 * hw, cH - 0.3, 0.92, 0, 0.3, 0, W), Kit.box(2 * hw + 0.06, 0.07, 1.0, 0, cH - 0.07, 0, WL), Kit.box(2 * hw + 0.04, 0.07, 0.96, 0, 0.3, 0, WD));                             // the counter: planks, the rim and the foot rail
        for (const y of [0.52, 0.72]) p.push(Kit.box(2 * hw + 0.02, 0.025, 0.94, 0, y, 0, WD));                                                                                             // plank lines
        for (const sx of [-1, 1]) p.push(Kit.cyl(0.3, 0.3, 0.1, sx * (hw + 0.04), 0.25, 0.12, '#5a5e66', { rz: Math.PI / 2, seg: 10 }), Kit.cyl(0.1, 0.1, 0.13, sx * (hw + 0.04), 0.235, 0.12, '#9a9ea6', { rz: Math.PI / 2, seg: 6 }),
          Kit.box(0.07, 0.07, 0.8, sx * (hw - 0.2), 0.5, -0.8, WD, { rx: -0.16 }), Kit.box(0.07, 0.07, 0.08, sx * (hw - 0.2), 0.3, -0.45, WD));                                                      // the wheels with their hubs, the two handles
        p.push(Kit.cyl(0.25, 0.25, 0.15, -0.34, cH, 0.0, '#e8b830', { seg: 10 }), Kit.cyl(0.25, 0.25, 0.15, -0.34, cH + 0.15, 0.0, '#f0c848', { seg: 10 }), Kit.cyl(0.23, 0.23, 0.12, -0.34, cH + 0.3, 0.0, '#e8c870', { seg: 10 }),          // yellow wheels of cheese
               Kit.cyl(0.23, 0.23, 0.15, 0.3, cH, -0.05, '#2a2a30', { seg: 10 }), Kit.cyl(0.23, 0.23, 0.15, 0.3, cH + 0.15, -0.05, '#35353c', { seg: 10 }),                                                              // black cheeses
               Kit.roof(0.34, 0.2, 0.4, 0.12, cH, 0.3, '#f2c640', { ry: 0.6 }), Kit.cyl(0.14, 0.14, 0.1, -0.05, cH, 0.32, '#d9a838', { seg: 8 }));                                                               // a cut wedge and a small round cheese
        for (const sx of [-1, 1]) p.push(Kit.box(0.07, 1.05, 0.07, sx * (hw - 0.03), cH, -0.4, WD));                                                                                                       // the two posts at the back
        const n = 8, w = (2 * hw + 0.2) / n, ay = 1.86;
        for (let k = 0; k < n; k++) { const x = -hw - 0.1 + (k + 0.5) * w, col = k % 2 ? '#f2e6e2' : '#c8483c'; p.push(Kit.box(w + 0.004, 0.035, 1.08, x, ay, 0.06, col, { rx: 0.4 }), Kit.box(w + 0.004, 0.14, 0.03, x, 1.43, 0.52, col)); }   // the gingham awning, sloping down to the front, with its valance
        return Kit.merge(p);
      },
    };
    Object.assign(kinds, kinds2, kindsW, kindsS); kinds.aura = () => ({}); kinds.raceGate = () => ({});                                                    // (aura: no merged geometry, only its extra meshes)
    for (const k of Object.keys(kinds)) {
      const m = this.merged[k] = kinds[k](); this.pool[k] = []; this.used[k] = 0;
      for (let i = 0; i < POOL[k]; i++) {
        const g = new THREE.Group();
        if (m.lit) g.add(new THREE.Mesh(m.lit, mats.lit));
        if (m.glow) g.add(new THREE.Mesh(m.glow, mats.glow));
        if (extras[k]) extras[k](g);
        g.visible = false; g.userData.phase = i * 1.7; g.userData.y0 = 0; scene.add(g); this.pool[k].push(g);
      }
    }
  }
  begin() { for (const k in this.used) this.used[k] = 0; }
  place(kind, x, y, z, rotY) {
    const g = this.pool[kind][this.used[kind]];
    if (!g) { this.dropped++; return; }                    // pool full (should never happen; counted so tests can see it)
    this.used[kind]++;
    g.position.set(x, y, z); g.rotation.y = rotY || 0; g.visible = true; g.userData.y0 = y; return g;
  }
  end(time) {
    for (const k in this.pool) { const list = this.pool[k], n = this.used[k]; for (let i = n; i < list.length; i++) list[i].visible = false; }
    for (const k of ['crate', 'crateW']) {                                                                                        // the vortex: the spiral turns (counter-clockwise: its lines flow IN) with a wobble, the funnel turns slowly the other way and breathes
      const list = this.pool[k];
      for (let i = 0; i < this.used[k]; i++) {
        const c = list[i], u = c.userData, ph = u.phase, b = this.absorbing && this.absorbing.g === c ? this.absorbing.k : 0;
        u.spin.rotation.y = time * 3.4 + 0.7 * Math.sin(time * 2.1 + ph) + b * b * 40; const br = 1 + 0.05 * Math.sin(time * 3.1 + ph) + 0.25 * b; u.fun.rotation.y = -time * 1.5 + ph; u.fun.scale.set(br, 1 + 0.12 * b, br);
      }
    }
    const coins = this.pool.coin;
    for (let i = 0; i < this.used.coin; i++) { const c = coins[i], ph = c.userData.phase; c.rotation.y = time * 4 + ph; c.position.y = c.userData.y0 + Math.sin(time * 3 + ph) * 0.05; }   // spin + bob, out of sync
    for (const k of this.extraKinds) {                                                                                            // the collectibles: each its own motion, all frozen with the game clock (pause)
      const list = this.pool[k];
      for (let i = 0; i < this.used[k]; i++) {
        const c = list[i], ph = c.userData.phase, u = c.userData;
        c.position.y = u.y0 + Math.sin(time * 2.6 + ph) * 0.07;
        if (k === 'magnet') { c.rotation.y = time * 3 + ph; c.rotation.z = Math.sin(time * 2 + ph) * 0.12; }
        else if (k === 'shard') { c.rotation.y = time * 2.2 + ph; c.rotation.z = Math.sin(time * 1.7 + ph) * 0.18; const pulse = 1 + Math.sin(time * 5 + ph) * 0.06; c.scale.set(pulse, pulse, pulse); }
        else if (k === 'dash') { c.rotation.y = Math.sin(time * 1.8 + ph) * 0.55; const s = 1 + Math.sin(time * 6 + ph) * 0.08; c.scale.set(s, s, s); u.r1.rotation.z = time * 2; u.r1.scale.setScalar(1 + 0.12 * Math.sin(time * 5 + ph)); }
        else if (k === 'waymark') { c.rotation.y = time * 1.4 + ph; u.r1.rotation.y = time * 1.1; u.r2.rotation.z = time * 1.3; }
        else if (k === 'raceGate') { u.sp.rotation.z = Math.sin(time * 0.7 + ph) * 0.12; u.sp.scale.setScalar(1 + 0.04 * Math.sin(time * 3 + ph)); u.r1.rotation.z = time * 1.1; u.r1.rotation.y = time * 0.8; }
        else if (k === 'aura') { c.rotation.y = time * 1.2 + ph; u.r1.rotation.z = time * 1.6; u.r2.rotation.y = time * 1.9; c.scale.setScalar(1 + Math.sin(time * 3 + ph) * 0.03); }
      }
    }
  }
}
