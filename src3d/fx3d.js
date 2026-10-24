// Fx3D: two cheap, pooled effects in the same low-poly style.
//  - coin pop: the collected coin swells and rises for 0.4 s, then vanishes (a pool of coin meshes sharing the coin geometry)
//  - crash debris: a burst of small red / cream / gold cubes thrown out from the runner when a hazard ends the run
// Effects are stored in absolute track coordinates (lateral metres, height, distance metres), so they stay put in the world
// as the runner moves; update() re-lays them relative to the runner every frame. Pools only: nothing allocated at runtime.
class Fx3D {
  constructor(scene, coinMerged) {
    const mats = Kit.materials(), P = PAL3;
    this.POPS = 16; this.DEBRIS = 24; this.POP_LIFE = 0.4; this.DB_LIFE = 0.9;
    this.pops = []; this.popT = new Float32Array(this.POPS).fill(-1); this.popP = new Float32Array(this.POPS * 3); this.popN = 0;
    for (let i = 0; i < this.POPS; i++) { const g = Kit.mesh(coinMerged); g.visible = false; scene.add(g); this.pops.push(g); }
    const cube = c => Kit.merge([Kit.box(0.22, 0.22, 0.22, 0, 0, 0, c)]);
    const geos = [cube(P.stripeRed), cube(P.stripeCream), cube(P.coin)];
    this.db = []; this.dbT = new Float32Array(this.DEBRIS).fill(-1); this.dbP = new Float32Array(this.DEBRIS * 3); this.dbV = new Float32Array(this.DEBRIS * 3); this.dbN = 0;
    for (let i = 0; i < this.DEBRIS; i++) { const m = new THREE.Mesh(geos[i % 3].lit, mats.lit); m.visible = false; scene.add(m); this.db.push(m); }
  }
  coinPop(lat, y, zAbs, t) {
    const i = this.popN++ % this.POPS;
    this.popT[i] = t; this.popP[i * 3] = lat; this.popP[i * 3 + 1] = y; this.popP[i * 3 + 2] = zAbs;
  }
  crash(lat, y, zAbs, t) {
    for (let k = 0; k < this.DEBRIS; k++) {                 // golden-angle fan: deterministic, evenly spread, no Math.random
      const i = this.dbN++ % this.DEBRIS, a = k * 2.399963, sp = 3 + (k % 5) * 0.9;
      this.dbT[i] = t; this.dbP[i * 3] = lat; this.dbP[i * 3 + 1] = y; this.dbP[i * 3 + 2] = zAbs;
      this.dbV[i * 3] = Math.cos(a) * sp; this.dbV[i * 3 + 1] = 3.5 + (k % 4) * 1.2; this.dbV[i * 3 + 2] = Math.sin(a) * sp * 0.6 - 2;
    }
  }
  clear() { this.popT.fill(-1); this.dbT.fill(-1); for (const m of this.pops) m.visible = false; for (const m of this.db) m.visible = false; }
  update(t, rz, Lref) {
    for (let i = 0; i < this.POPS; i++) {
      const a = t - this.popT[i], m = this.pops[i];
      if (this.popT[i] < 0 || a < 0 || a > this.POP_LIFE) { m.visible = false; continue; }
      const s = a < 0.1 ? 1 + a / 0.1 * 0.9 : Math.max(0.01, 1.9 * (1 - (a - 0.1) / 0.3));
      m.visible = true; m.scale.setScalar(s); m.rotation.y = a * 18;
      m.position.set(this.popP[i * 3] - Lref, this.popP[i * 3 + 1] + a * 2.2, rz - this.popP[i * 3 + 2]);
    }
    for (let i = 0; i < this.DEBRIS; i++) {
      const a = t - this.dbT[i], m = this.db[i];
      if (this.dbT[i] < 0 || a < 0 || a > this.DB_LIFE) { m.visible = false; continue; }
      const y = Math.max(0.11, this.dbP[i * 3 + 1] + this.dbV[i * 3 + 1] * a - 4.9 * a * a);
      m.visible = true; m.scale.setScalar(a > 0.6 ? Math.max(0.01, 1 - (a - 0.6) / 0.3) : 1);
      m.rotation.set(a * 9, a * 7, 0);
      m.position.set(this.dbP[i * 3] + this.dbV[i * 3] * a - Lref, y, rz - (this.dbP[i * 3 + 2] + this.dbV[i * 3 + 2] * a));
    }
  }
}
