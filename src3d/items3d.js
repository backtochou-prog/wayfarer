// Items3D: pooled coins and hazards. Each kind's geometry is merged once and shared by every instance; instances are
// Groups placed per frame (begin -> place* -> end), so nothing is allocated while the game runs.
// Every hazard's size comes from the gameplay collision table (OBST x U3), so what you see is what you can hit:
//   crate   1.2 m wide, 1.05 m tall           (jump over it)
//   barrier 2.77 m wide, 0.68 m tall          (jump over it)
//   over    gate posts 3.9 m apart, banner from 1.15 m to the top beam (slide under it; the gap is 1.05 m)
//   coin    ringed disc of radius 0.32 m, spinning and bobbing
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
    // pool sizes cover everything inside the 150 m draw range, including both roads of a fork
    const POOL = { coin: 140, crate: 40, barrier: 24, over: 24 };
    this.pool = {}; this.used = {}; this.merged = {}; this.dropped = 0;
    for (const k of Object.keys(kinds)) {
      const m = this.merged[k] = kinds[k](); this.pool[k] = []; this.used[k] = 0;
      for (let i = 0; i < POOL[k]; i++) {
        const g = new THREE.Group();
        if (m.lit) g.add(new THREE.Mesh(m.lit, mats.lit));
        if (m.glow) g.add(new THREE.Mesh(m.glow, mats.glow));
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
  }
}
