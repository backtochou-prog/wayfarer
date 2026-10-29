// Saucer3D: the flying saucers of the coastal town (from the user's painting of it: a dark lens with a dome and a neon underside, hovering over a landing pad and taking off, then flying away up and
// out over the sea as the runner comes near). 3D build only, and only a drawing: the renderer gives it the landing pads in view (`coastPad` props, one saucer each), it keeps one small state per pad.
// A saucer hovers (a slow bob and spin) until the runner is within 75 m of its pad, then climbs, tilts and flies away over 2.6 s, and stays gone.
class Saucer3D {
  constructor(scene) {
    this.pool = []; this.state = new Map();
    const mk = () => [Kit.ico(2.3, 0, 0, 0, '#171722', { sy: 0.26, detail: 1 }), Kit.ico(1.15, 0, 0.32, 0, '#2a2a3c', { sy: 0.8, detail: 1 }), Kit.cyl(1.7, 1.9, 0.14, 0, -0.38, 0, '#35e6ff', { seg: 14, glow: true }),
      Kit.cyl(1.0, 1.2, 0.12, 0, -0.5, 0, '#ff4fd8', { seg: 12, glow: true }), Kit.ico(0.5, 0, -0.62, 0, '#fff0ff', { glow: true }), Kit.ico(0.16, 0, 0.95, 0, '#ff4fd8', { glow: true })];
    for (let i = 0; i < 3; i++) { const g = Kit.mesh(Kit.merge(mk())); g.visible = false; scene.add(g); this.pool.push(g); }
  }
  // pads: { id, x, y, z } in the scene (the runner at the origin, running to -z); dt seconds; t the game time
  update(pads, dt, t) {
    let n = 0;
    for (const pad of pads) {
      if (n >= this.pool.length) break;
      let s = this.state.get(pad.id); if (!s) { s = { lift: 0 }; this.state.set(pad.id, s); }
      if (-pad.z < 75 || s.lift > 0) s.lift = Math.min(1, s.lift + dt / 2.6);                                  // the runner is near: it takes off (and keeps going)
      const e = s.lift * s.lift * (3 - 2 * s.lift), g = this.pool[n++], bob = Math.sin(t * 1.7 + pad.id) * 0.18 * (1 - e);
      g.visible = true; g.position.set(pad.x - e * 20, pad.y + 2.3 + bob + e * 36, pad.z - e * 70); g.rotation.set(-0.35 * e, t * (0.6 + 5 * e), 0.5 * e); g.scale.setScalar(1 - 0.5 * e);
    }
    for (; n < this.pool.length; n++) this.pool[n].visible = false;
    if (this.state.size > 24) for (const k of this.state.keys()) if (!pads.some(p => p.id === k)) { this.state.delete(k); if (this.state.size <= 12) break; }
  }
}
