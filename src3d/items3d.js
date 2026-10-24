// Items3D: pooled coins and hazards. Each kind's geometry is merged once and shared by every instance; instances are
// Groups placed per frame (begin -> place* -> end), so nothing is allocated while the game runs.
// Sizes match the gameplay collision boxes (design units x U3): crate 1.2x1.05x1, barrier 0.68 tall,
// overhead gate with a 1.05 m gap under its banner (slide under it), coin radius 0.32.
class Items3D {
  constructor(scene) {
    const P = PAL3, mats = Kit.materials();
    const kinds = {
      crate: () => {
        const p = [Kit.box(1.2, 1.05, 1.0, 0, 0, 0, P.wood), Kit.box(1.24, 0.14, 1.04, 0, 0, 0, P.woodDark), Kit.box(1.24, 0.14, 1.04, 0, 0.91, 0, P.woodDark)];
        for (const x of [-0.55, 0.55]) p.push(Kit.box(0.14, 1.05, 1.04, x, 0, 0, P.woodDark));
        for (const z of [-1, 1]) {                                                    // diagonal braces on front and back
          p.push(Kit.box(0.1, 1.15, 0.05, 0, 0.0, z * 0.51, P.woodDark, { rz: 0.74 }));
          p.push(Kit.box(0.28, 0.2, 0.04, 0, 0.43, z * 0.53, P.coin, { glow: false }));   // amber plate
        }
        return Kit.merge(p);
      },
      barrier: () => {
        const p = [Kit.box(0.2, 0.3, 0.26, -0.78, 0, 0, P.metal), Kit.box(0.2, 0.3, 0.26, 0.78, 0, 0, P.metal)];
        const n = 8, w = 1.9 / n;
        for (let k = 0; k < n; k++) p.push(Kit.box(w + 0.005, 0.3, 0.3, -0.95 + (k + 0.5) * w, 0.38, 0, k % 2 ? P.stripeCream : P.stripeRed));
        return Kit.merge(p);
      },
      over: () => {
        const p = [];
        for (const x of [-1.0, 1.0]) p.push(Kit.box(0.2, 3.7, 0.22, x, 0, 0, P.metal), Kit.box(0.28, 0.16, 0.3, x, 0, 0, P.woodDark));
        p.push(Kit.box(2.2, 0.22, 0.26, 0, 3.48, 0, P.woodDark));                      // top beam
        p.push(Kit.box(1.8, 2.3, 0.1, 0, 1.15 + 0.0, 0, P.burgundy, {}));             // banner cloth (y 1.15 .. 3.45)
        p.push(Kit.box(1.84, 0.12, 0.12, 0, 1.1, 0, P.capBand), Kit.box(1.84, 0.1, 0.12, 0, 3.38, 0, P.capBand));
        p.push(Kit.ico(0.42, 0, 2.3, 0.06, P.capBand, { sz: 0.35, detail: 1 }), Kit.ico(0.22, 0, 2.3, 0.1, P.burgundy, { sz: 0.35 }));  // emblem
        return Kit.merge(p);
      },
      coin: () => Kit.merge([
        Kit.cyl(0.32, 0.32, 0.08, 0, 0, 0, P.coinEdge, { rx: Math.PI / 2, seg: 14 }),
        Kit.cyl(0.27, 0.27, 0.1, 0, 0, 0, P.coin, { rx: Math.PI / 2, seg: 14, glow: true }),
        Kit.box(0.08, 0.3, 0.115, 0, -0.15, 0, P.coinEdge, { glow: true })]),
    };
    const POOL = { coin: 64, crate: 16, barrier: 16, over: 12 };
    this.pool = {}; this.used = {};
    for (const k of Object.keys(kinds)) {
      const m = kinds[k](); this.pool[k] = []; this.used[k] = 0;
      for (let i = 0; i < POOL[k]; i++) {
        const g = new THREE.Group();
        if (m.lit) g.add(new THREE.Mesh(m.lit, mats.lit));
        if (m.glow) g.add(new THREE.Mesh(m.glow, mats.glow));
        g.visible = false; g.userData.phase = i * 1.7; scene.add(g); this.pool[k].push(g);
      }
    }
  }
  begin() { for (const k in this.used) this.used[k] = 0; }
  place(kind, x, y, z, rotY) {
    const g = this.pool[kind][this.used[kind]];
    if (!g) return;
    this.used[kind]++;
    g.position.set(x, y, z); g.rotation.y = rotY || 0; g.visible = true;
  }
  end(time) {
    for (const k in this.pool) { const list = this.pool[k], n = this.used[k]; for (let i = n; i < list.length; i++) list[i].visible = false; }
    const coins = this.pool.coin;
    for (let i = 0; i < this.used.coin; i++) coins[i].rotation.y = time * 4 + coins[i].userData.phase;   // spin, out of sync
  }
}
