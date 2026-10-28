// Perk3D: the 3D effects of the power-ups and rewards (rules: src/perks.js; the pickup models: Items3D). All of it is built once and pooled; nothing is allocated while the game runs, and every
// animation reads the game clock (g.time), which stops with the game, so a pause freezes the lot.
//  - pickup / break / near-miss / celebration BURSTS: a few tiny glowing cubes in the effect's colour and one expanding ring, in absolute track coordinates like Fx3D's sparks
//  - AURA: a teal bubble round the runner with two turning rings; it blinks in its last 3 s and pops (a big ring and a fan of sparks) when it takes a hit
//  - MAGNET: two soft rings that swell outward from the runner's feet, the same colours as the horseshoe, for as long as it works
//  - DASH: two orange streaks behind the runner, a handful of speed lines along the sides, and the camera's field of view opened a few degrees
// Light on purpose: at most ~90 small meshes, no screen-wide effects, no shaking.
class Perk3D {
  constructor(scene) {
    const mats = Kit.materials(), COL = { magnet: '#ff6a7a', aura: '#5ff0d0', dash: '#ffb347', shard: '#c58bff', waymark: '#ffd24a', near: '#9fe8ff', gold: '#ffe08a' };
    this.COLORS = Object.keys(COL); this.PER = 14; this.SPARK_LIFE = 0.5; this.RING_LIFE = 0.55; this.RINGS = 10;
    this.sparks = []; this.N = this.COLORS.length * this.PER; this.sT = new Float64Array(this.N).fill(-1); this.sP = new Float32Array(this.N * 3); this.sV = new Float32Array(this.N * 3); this.sN = this.COLORS.map(() => 0);
    this.COLORS.forEach(c => { const geo = Kit.merge([Kit.box(0.1, 0.1, 0.1, 0, 0, 0, COL[c], { glow: true, rx: 0.6, rz: 0.6 })]).glow; for (let i = 0; i < this.PER; i++) { const m = new THREE.Mesh(geo, mats.glow); m.visible = false; scene.add(m); this.sparks.push(m); } });
    this.rings = []; this.rT = new Float64Array(this.RINGS).fill(-1); this.rP = new Float32Array(this.RINGS * 3); this.rS = new Float32Array(this.RINGS); this.rN = 0;
    const ringGeo = new THREE.RingGeometry(0.4, 0.5, 28);
    for (let i = 0; i < this.RINGS; i++) { const m = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending })); m.visible = false; scene.add(m); this.rings.push(m); }
    this.col = COL;
    // the aura bubble: a faceted translucent shell and two rings (additive), centred on the runner
    this.bubble = new THREE.Group(); this.bubble.visible = false;
    this.shell = new THREE.Mesh(new THREE.IcosahedronGeometry(1.15, 1), new THREE.MeshBasicMaterial({ color: 0x5ff0d0, transparent: true, opacity: 0.17, depthWrite: false, side: THREE.DoubleSide }));
    const rg = new THREE.TorusGeometry(1.2, 0.025, 5, 28), rm = new THREE.MeshBasicMaterial({ color: 0x8ffbe6, transparent: true, opacity: 0.75, depthWrite: false, blending: THREE.AdditiveBlending });
    this.bR1 = new THREE.Mesh(rg, rm); this.bR2 = new THREE.Mesh(rg, rm); this.bR2.rotation.x = Math.PI / 2; this.bubble.add(this.shell, this.bR1, this.bR2); scene.add(this.bubble);
    // the magnet's rings on the ground
    const mg = new THREE.RingGeometry(0.9, 1, 36).rotateX(-Math.PI / 2); this.mag = [];
    [0xff6a7a, 0x35e6ff].forEach(c => { const m = new THREE.Mesh(mg, new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })); m.visible = false; scene.add(m); this.mag.push(m); });
    // the dash: two streaks behind the runner (a fading orange gradient) and speed lines
    const cv = document.createElement('canvas'); cv.width = 8; cv.height = 64; const x = cv.getContext('2d'), gr = x.createLinearGradient(0, 0, 0, 64);
    gr.addColorStop(0, 'rgba(255,179,71,0.9)'); gr.addColorStop(1, 'rgba(255,179,71,0)'); x.fillStyle = gr; x.fillRect(0, 0, 8, 64);
    const sg = new THREE.PlaneGeometry(0.3, 8).rotateX(-Math.PI / 2), sm = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    this.streaks = [-0.32, 0.32].map(dx => { const m = new THREE.Mesh(sg, sm); m.userData.dx = dx; m.visible = false; scene.add(m); return m; }); this.streakMat = sm;
    const lg = Kit.merge([Kit.box(0.03, 0.03, 2.2, 0, 0, 0, '#ffd9a0', { glow: true })]).glow; this.lines = [];
    for (let i = 0; i < 18; i++) { const m = new THREE.Mesh(lg, mats.glow); m.visible = false; scene.add(m); this.lines.push(m); }
    this.fov = 62;
  }
  // ---- bursts (absolute track coordinates: lateral metres, height, distance metres)
  burst(kind, lat, y, zAbs, t, n = 10) {
    const c = Math.max(0, this.COLORS.indexOf(kind)), base = c * this.PER;
    for (let k = 0; k < n; k++) {
      const i = base + (this.sN[c]++ % this.PER), a = k * 2.399963 + (t * 5) % 1, sp = 1.3 + (k % 3) * 0.55;       // golden-angle fan: deterministic, no Math.random
      this.sT[i] = t; this.sP[i * 3] = lat; this.sP[i * 3 + 1] = y; this.sP[i * 3 + 2] = zAbs;
      this.sV[i * 3] = Math.cos(a) * sp; this.sV[i * 3 + 1] = Math.sin(a) * sp + 0.7; this.sV[i * 3 + 2] = -2.5;
    }
  }
  ring(kind, lat, y, zAbs, t, size) {
    const i = this.rN++ % this.RINGS; this.rT[i] = t; this.rP[i * 3] = lat; this.rP[i * 3 + 1] = y; this.rP[i * 3 + 2] = zAbs; this.rS[i] = size; this.rings[i].material.color.set(this.col[kind] || '#ffffff');
  }
  pickup(kind, lat, y, zAbs, t) { this.burst(kind, lat, y, zAbs, t, kind === 'waymark' ? 14 : 10); this.ring(kind, lat, y, zAbs, t, kind === 'shard' ? 1.4 : kind === 'waymark' ? 2.6 : 2.1); }
  auraBreak(lat, y, zAbs, t) { this.burst('aura', lat, y, zAbs, t, 14); this.ring('aura', lat, y, zAbs, t, 3.6); }
  near(lat, y, zAbs, t) { this.burst('near', lat, y, zAbs, t, 6); this.ring('near', lat, y, zAbs, t, 1.5); }
  celebrate(lat, y, zAbs, t) { this.burst('gold', lat, y, zAbs, t, 14); this.ring('gold', lat, y, zAbs, t, 3.2); }
  clear() {
    this.sT.fill(-1); this.rT.fill(-1); for (const m of this.sparks) m.visible = false; for (const m of this.rings) m.visible = false;
    this.bubble.visible = false; for (const m of this.mag) m.visible = false; for (const m of this.streaks) m.visible = false; for (const m of this.lines) m.visible = false;
  }

  // ---- every frame. rz / Lref: the renderer's origin shift; relX / ry: where the runner is drawn (lateral, height of its feet)
  update(g, rz, Lref, relX, ry) {
    const t = g.time, pk = g.pk, live = !!pk && (g.state === 'play' || g.state === 'pause');
    for (let i = 0; i < this.N; i++) {
      const a = t - this.sT[i], m = this.sparks[i];
      if (this.sT[i] < 0 || a < 0 || a > this.SPARK_LIFE) { m.visible = false; continue; }
      m.visible = true; m.scale.setScalar(Math.max(0.01, 1 - a / this.SPARK_LIFE)); m.rotation.set(a * 11, a * 8, 0);
      m.position.set(this.sP[i * 3] + this.sV[i * 3] * a - Lref, this.sP[i * 3 + 1] + this.sV[i * 3 + 1] * a - 2.2 * a * a, rz - (this.sP[i * 3 + 2] + this.sV[i * 3 + 2] * a));
    }
    for (let i = 0; i < this.RINGS; i++) {
      const a = (t - this.rT[i]) / this.RING_LIFE, m = this.rings[i];
      if (this.rT[i] < 0 || a < 0 || a > 1) { m.visible = false; continue; }
      m.visible = true; m.scale.setScalar(0.4 + this.rS[i] * (1 - Math.pow(1 - a, 2))); m.material.opacity = 0.9 * (1 - a);
      m.position.set(this.rP[i * 3] - Lref, this.rP[i * 3 + 1], rz - this.rP[i * 3 + 2] + 0.2);
    }
    // the aura bubble
    const au = live ? pk.t.aura : 0;
    if (au > 0) {
      const blink = au < 3 && Math.floor(t * 7) % 2 === 0;
      this.bubble.visible = true; this.bubble.position.set(relX, ry + 0.95, 0); this.bubble.scale.setScalar(1 + Math.sin(t * 4) * 0.04);
      this.shell.material.opacity = blink ? 0.05 : 0.17; this.bR1.rotation.z = t * 1.3; this.bR2.rotation.y = t * 1.7; this.bR1.visible = this.bR2.visible = !blink;
    } else this.bubble.visible = false;
    // the magnet: two rings that swell from the runner's feet outward and fade, a half-period apart
    const mg = live ? pk.t.magnet : 0;
    this.mag.forEach((m, k) => {
      if (mg <= 0) { m.visible = false; return; }
      const u = ((t * 0.9 + k * 0.5) % 1), fade = mg < 2 ? Math.max(0, mg / 2) : 1;
      m.visible = true; m.position.set(relX, ry + 0.06, 0); m.scale.setScalar(0.5 + u * 3.6); m.material.opacity = (1 - u) * 0.55 * fade;
    });
    // the dash: streaks behind, speed lines at the sides, in proportion to how far the boost has built up
    const dk = live ? pk.dashK : 0;
    this.streakMat.opacity = Math.min(1, dk * 1.2);
    for (const m of this.streaks) { m.visible = dk > 0.03; m.position.set(relX + m.userData.dx, ry + 0.9, 4.2); }
    for (let i = 0; i < this.lines.length; i++) {
      const m = this.lines[i]; if (dk < 0.05) { m.visible = false; continue; }
      const side = i % 2 ? 1 : -1, x = relX + side * (1.7 + (i * 0.73) % 2.4), y = 0.4 + (i * 0.61) % 3.0, z = ((i * 7.3 + t * 46) % 30) - 24;
      m.visible = true; m.position.set(x, ry + y, z); m.scale.set(1, 1, 0.6 + dk);
    }
    this.fov = 62 + 6 * dk;
  }
}
