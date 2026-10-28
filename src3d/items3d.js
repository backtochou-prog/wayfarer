// Items3D: pooled coins and hazards. Each kind's geometry is merged once and shared by every instance; instances are
// Groups placed per frame (begin -> place* -> end), so nothing is allocated while the game runs.
// Every hazard's size comes from the gameplay collision table (OBST x U3), so what you see is what you can hit:
//   crate   1.2 m wide, 1.05 m tall           (jump over it)
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
    const cHW = OBST.crate.hw * X, cH = OBST.crate.y1 * Y, bHW = OBST.barrier.hw * X, bH = OBST.barrier.y1 * Y;
    const oHW = OBST.over.hw * X, gap = OBST.over.y0 * Y, oTop = OBST.over.y1 * Y;
    const kinds = {
      crate: () => {
        const w = 2 * cHW, p = [Kit.box(w, cH, 1.0, 0, 0, 0, P.wood), Kit.box(w + 0.04, 0.14, 1.04, 0, 0, 0, P.woodDark), Kit.box(w + 0.04, 0.14, 1.04, 0, cH - 0.14, 0, P.woodDark)];
        for (const x of [-(cHW - 0.05), cHW - 0.05]) p.push(Kit.box(0.14, cH, 1.04, x, 0, 0, P.woodDark));
        for (const z of [-1, 1]) {                                                    // diagonal braces on front and back
          p.push(Kit.box(0.1, 1.15, 0.05, 0, 0.0, z * 0.51, P.woodDark, { rz: 0.74 }));
          p.push(Kit.box(0.28, 0.2, 0.04, 0, 0.43, z * 0.53, P.coin, { glow: false }));   // amber plate
        }
        return Kit.merge(p);
      },
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
      aura: g => { const core = Kit.merge([Kit.ico(0.17, 0, 0, 0, '#5ff0d0', { glow: true, detail: 0 }), Kit.ico(0.09, 0, 0, 0, '#ffffff', { glow: true })]); g.add(new THREE.Mesh(core.glow, mats.glow)); g.add(new THREE.Mesh(G.shell, SH.aura));
                   const r1 = new THREE.Mesh(G.ring, SH.auraRing), r2 = new THREE.Mesh(G.ring, SH.auraRing); r2.rotation.x = Math.PI / 2; g.add(r1, r2); g.userData.r1 = r1; g.userData.r2 = r2; },
      dash: g => { const r = new THREE.Mesh(G.ringBig, SH.dashRing); r.position.z = -0.05; g.add(r); g.userData.r1 = r; },
      waymark: g => { const r1 = new THREE.Mesh(G.ringWay, SH.wayRing), r2 = new THREE.Mesh(G.ringWay, SH.wayRing); r2.rotation.x = Math.PI / 2; g.add(r1, r2); g.userData.r1 = r1; g.userData.r2 = r2; },
    };
    this.extraKinds = ['magnet', 'shard', 'dash', 'waymark', 'aura']; this.extraSet = { magnet: 1, shard: 1, dash: 1, waymark: 1, aura: 1 };
    // pool sizes cover everything inside the 150 m draw range, including both roads of a fork
    const POOL = { coin: 140, crate: 40, barrier: 24, over: 24, magnet: 6, shard: 16, dash: 6, waymark: 6, aura: 6 };
    this.pool = {}; this.used = {}; this.merged = {}; this.dropped = 0;
    Object.assign(kinds, kinds2); kinds.aura = () => ({});                                                    // (aura: no merged geometry, only its extra meshes)
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
    g.position.set(x, y, z); g.rotation.y = rotY || 0; g.visible = true; g.userData.y0 = y;
  }
  end(time) {
    for (const k in this.pool) { const list = this.pool[k], n = this.used[k]; for (let i = n; i < list.length; i++) list[i].visible = false; }
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
        else if (k === 'aura') { c.rotation.y = time * 1.2 + ph; u.r1.rotation.z = time * 1.6; u.r2.rotation.y = time * 1.9; c.scale.setScalar(1 + Math.sin(time * 3 + ph) * 0.05); }
      }
    }
  }
}
