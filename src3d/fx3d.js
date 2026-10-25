// Fx3D: two cheap, pooled effects in the same low-poly style.
//  - pickup sparkle: six tiny green, pink and lilac sparks fly out of the spot where a coin was collected and shrink away within 0.3 s. The coin itself is
//    removed by the renderer in the same frame (Game marks it taken); the sparkle deliberately does NOT use the coin mesh, because a coin-shaped
//    effect at the same place looks exactly like the coin staying on the track (it used to swell and scroll past like a missed coin)
//  - crash debris: a burst of small red / cream / gold cubes thrown out from the runner when a hazard ends the run
// Effects are stored in absolute track coordinates (lateral metres, height, distance metres), so they stay put in the world
// as the runner moves; update() re-lays them relative to the runner every frame. Pools only: nothing allocated at runtime.
class Fx3D {
  constructor(scene) {
    const mats = Kit.materials(), P = PAL3;
    this.PER = 6; this.SPARKS = 16 * this.PER; this.DEBRIS = 24; this.SPARK_LIFE = 0.3; this.DB_LIFE = 0.9;
    const sparkGeo = c => Kit.merge([Kit.box(0.07, 0.07, 0.07, 0, 0, 0, c, { glow: true, rx: 0.6, rz: 0.6 })]).glow;   // tiny cubes in the coin's green / pink / lilac, nothing like a coin
    const SPARK = [sparkGeo('#52ff2e'), sparkGeo('#ff2a8a'), sparkGeo('#d9baff')];
    this.sparks = []; this.sparkT = new Float32Array(this.SPARKS).fill(-1); this.sparkP = new Float32Array(this.SPARKS * 3); this.sparkV = new Float32Array(this.SPARKS * 3); this.sparkN = 0;
    for (let i = 0; i < this.SPARKS; i++) { const m = new THREE.Mesh(SPARK[i % 3], mats.glow); m.visible = false; scene.add(m); this.sparks.push(m); }
    const cube = c => Kit.merge([Kit.box(0.22, 0.22, 0.22, 0, 0, 0, c)]);
    const geos = [cube(P.stripeRed), cube(P.stripeCream), cube(P.coin)];
    this.db = []; this.dbT = new Float32Array(this.DEBRIS).fill(-1); this.dbP = new Float32Array(this.DEBRIS * 3); this.dbV = new Float32Array(this.DEBRIS * 3); this.dbN = 0;
    for (let i = 0; i < this.DEBRIS; i++) { const m = new THREE.Mesh(geos[i % 3].lit, mats.lit); m.visible = false; scene.add(m); this.db.push(m); }
  }
  coinPop(lat, y, zAbs, t) {                                  // the pickup sparkle (name kept: called from Renderer3D.onCoin)
    for (let k = 0; k < this.PER; k++) {
      const i = this.sparkN++ % this.SPARKS, a = k * Math.PI / 3 + (t * 7) % 1, sp = 1.4 + (k % 3) * 0.5;
      this.sparkT[i] = t; this.sparkP[i * 3] = lat; this.sparkP[i * 3 + 1] = y; this.sparkP[i * 3 + 2] = zAbs;
      this.sparkV[i * 3] = Math.cos(a) * sp; this.sparkV[i * 3 + 1] = Math.sin(a) * sp + 0.6; this.sparkV[i * 3 + 2] = -3;    // sideways / up, drifting slightly back along the road
    }
  }
  crash(lat, y, zAbs, t) {
    for (let k = 0; k < this.DEBRIS; k++) {                 // golden-angle fan: deterministic, evenly spread, no Math.random
      const i = this.dbN++ % this.DEBRIS, a = k * 2.399963, sp = 3 + (k % 5) * 0.9;
      this.dbT[i] = t; this.dbP[i * 3] = lat; this.dbP[i * 3 + 1] = y; this.dbP[i * 3 + 2] = zAbs;
      this.dbV[i * 3] = Math.cos(a) * sp; this.dbV[i * 3 + 1] = 3.5 + (k % 4) * 1.2; this.dbV[i * 3 + 2] = Math.sin(a) * sp * 0.6 - 2;
    }
  }
  clear() { this.sparkT.fill(-1); this.dbT.fill(-1); for (const m of this.sparks) m.visible = false; for (const m of this.db) m.visible = false; }
  update(t, rz, Lref) {
    for (let i = 0; i < this.SPARKS; i++) {
      const a = t - this.sparkT[i], m = this.sparks[i];
      if (this.sparkT[i] < 0 || a < 0 || a > this.SPARK_LIFE) { m.visible = false; continue; }
      m.visible = true; m.scale.setScalar(Math.max(0.01, 1 - a / this.SPARK_LIFE)); m.rotation.set(a * 12, a * 9, 0);
      m.position.set(this.sparkP[i * 3] + this.sparkV[i * 3] * a - Lref, this.sparkP[i * 3 + 1] + this.sparkV[i * 3 + 1] * a - 2.5 * a * a, rz - (this.sparkP[i * 3 + 2] + this.sparkV[i * 3 + 2] * a));
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
