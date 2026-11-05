// XRComfort: the comfort layer of immersive VR (PHASE 3). Two quads held in front of the eyes (children of the camera that three moves with the head, so they never lag), drawn after
// everything else, without depth:
//   - the VIGNETTE: a soft dark ring at the edge of the view that closes in while the run is fast (the dash, the top speed, a race boost) or while the rig turns on a curve, and opens again
//     when it calms down. Peripheral motion is what makes fast running in VR uncomfortable; the centre of the view is never touched. Strength 0 (off) .. 1, cfg.vignette (?xrVig=0..1).
//   - the FADE to black, driven by the values the game already has for its own fades: the Gare du Midi cutscene (g.scene.fade, g.fadeIn), the flash of a portal door (g.portal.flash), the
//     end of a race (g.fadeIn); and a short fade of its own when the view cuts between the main scene and the race's, so a change of scene is a cut behind black, never a sweep.
// It moves no camera and decides nothing in the game.
class XRComfort {
  constructor(xr) {
    this.xr = xr; this.game = xr.game; this.cfg = Object.assign({}, XRComfort.cfg, XRComfort.urlCfg());
    const cv = document.createElement('canvas'); cv.width = cv.height = 128; const c = cv.getContext('2d'), gr = c.createRadialGradient(64, 64, 64 * this.cfg.clear, 64, 64, 64 * 0.98);
    gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.55, 'rgba(0,0,0,0.6)'); gr.addColorStop(1, 'rgba(0,0,0,1)'); c.fillStyle = gr; c.fillRect(0, 0, 128, 128);
    const vt = new THREE.CanvasTexture(cv); vt.colorSpace = THREE.SRGBColorSpace;
    const mat = (o) => new THREE.MeshBasicMaterial(Object.assign({ transparent: true, depthTest: false, depthWrite: false, fog: false, toneMapped: false, opacity: 0 }, o));
    const geo = new THREE.PlaneGeometry(1, 1);
    this.vig = new THREE.Mesh(geo, mat({ map: vt })); this.vig.renderOrder = 2000; this.vig.frustumCulled = false; this.vig.visible = false; this.vig.name = 'xrVignette';
    this.fade = new THREE.Mesh(geo, mat({ color: 0x000000 })); this.fade.renderOrder = 2001; this.fade.frustumCulled = false; this.fade.visible = false; this.fade.name = 'xrFade';
    for (const m of [this.vig, this.fade]) { m.position.z = -this.cfg.dist; m.scale.setScalar(this.cfg.size); }
    this.reset();
  }
  static urlCfg() { const o = {}, q = typeof location !== 'undefined' ? location.search : '', m = q.match(/[?&]xrVig=([\d.]+)/); if (m) o.vignette = Math.max(0, Math.min(1, +m[1])); if (/[?&]xrFade=0/.test(q)) o.fades = false; return o; }
  reset() { this.v = 0; this.f = 0; this.cutT = 0; this.lastYaw = null; this.cam = null; }
  cut() { if (this.cfg.fades) this.cutT = this.cfg.cutTime; }
  // how strong the vignette wants to be now (0..1): the speed above the cruising pace, a dash, a race boost, the turn rate of the rig
  speedK() {
    const g = this.game, r3 = this.xr.r3;
    if (g.state === 'race' && g.race && typeof RACE !== 'undefined') return Math.max(0, Math.min(1, (g.race.p.speed - RACE.BASE) / 18));
    if (g.state !== 'play') return 0;
    const top = typeof MAX_SPEED !== 'undefined' ? Math.max(0, Math.min(1, (g.p.speed - (BASE_SPEED + 0.6 * (MAX_SPEED - BASE_SPEED))) / (0.4 * (MAX_SPEED - BASE_SPEED)))) : 0;
    const dash = r3 && r3.perk && r3.perk.fov ? Math.max(0, Math.min(1, (r3.perk.fov - 62) / 6)) : 0;
    return Math.max(top * 0.6, dash);
  }
  update(dt) {
    const g = this.game, c = this.cfg, rig = this.xr.active, cam = rig && rig.userData.cam; if (!cam) return;
    if (this.cam !== cam) { cam.add(this.vig); cam.add(this.fade); this.cam = cam; this.lastYaw = null; }
    // the vignette
    const yaw = rig.rotation.y, rate = this.lastYaw === null || dt <= 0 ? 0 : Math.abs(yaw - this.lastYaw) / dt; this.lastYaw = yaw;
    const want = c.vignette > 0 ? c.vignette * Math.max(this.speedK(), Math.min(1, Math.max(0, rate - c.turnDead) / c.turnRate)) : 0;
    if (c.vignette <= 0) this.v = 0; else this.v += (want - this.v) * (1 - Math.exp(-dt / (want > this.v ? c.inTime : c.outTime)));
    this.vig.material.opacity = this.v * c.maxOpacity; this.vig.visible = this.vig.material.opacity > 0.01;
    // the fade
    this.cutT = Math.max(0, this.cutT - dt);
    let f = 0;
    if (c.fades) {
      const S = g.scene; f = Math.max(S ? S.fade || 0 : 0, g.fadeIn > 0 ? g.fadeIn * g.fadeIn : 0, g.portal && g.state !== 'title' ? (g.portal.flash || 0) * c.portalFade : 0, this.cutT > 0 ? Math.min(1, this.cutT / (c.cutTime * 0.5)) : 0);
    }
    this.f = f; this.fade.material.opacity = Math.min(1, f); this.fade.visible = f > 0.003;
  }
  detach() { for (const m of [this.vig, this.fade]) if (m.parent) m.parent.remove(m); this.reset(); }
}
XRComfort.cfg = {
  vignette: 0.5,        // 0 = off, 1 = strongest (?xrVig=)
  maxOpacity: 0.9,      // the darkest the edge ring gets at full strength
  clear: 0.42,          // the clear centre, as a part of the quad's half size (the quad covers about +-63 degrees)
  turnRate: 0.5,        // rad/s of rig turn (above turnDead) that counts as a full-strength turn
  turnDead: 0.12,       // rad/s: gentle turns (the road easing round a curve) do not close the vignette
  inTime: 0.25, outTime: 0.6,   // seconds: how fast the vignette closes and opens
  fades: true,          // fade to black for the cutscene, the portal doors, the end of a race and a change of scene (?xrFade=0 turns them off)
  portalFade: 0.7,      // how dark a portal door's flash goes
  cutTime: 0.35,        // seconds of black around a change of scene
  dist: 0.3, size: 1.2, // the quads: 0.3 m in front of the eyes (both cameras' near planes are nearer), 1.2 m wide
};
