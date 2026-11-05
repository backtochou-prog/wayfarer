// XRHud: the game's own 320 x 180 pixel-art interface (the #screen canvas that Renderer.drawUI paints every frame: title, buttons, pause, game over, score, coins, banners, missions, the race
// HUD) shown in immersive VR as a panel in the world (PHASE 2). It is the SAME canvas, uploaded as a texture (nearest filtering: the pixels stay sharp), so the artwork, the typography, the
// colours and the button states (hover, pressed) are the original ones; nothing is redrawn for VR.
//   - the MENU layout (title, pause, game over): a large panel 2.2 m ahead at eye height, held by the rig (it follows the run, never the head), with the controller's ray and a pointer dot;
//     under it a small EXIT VR plate in the game's pixel font and colours, the way back to the ordinary game from inside the headset
//   - the RUN layout (run, race, cutscene): a smaller panel lower in the view, tilted toward the eyes, no ray
// The panel, the ray and the dot ride the rig of the scene being drawn (the main scene's or the race's: XR3D.active), so they are never in the wrong scene.
class XRHud {
  constructor(xr) {
    this.xr = xr; this.game = xr.game; this.cfg = Object.assign({}, XRHud.cfg);
    const cv = this.game.cv;                                                                     // the #screen canvas (320 x 180)
    const t = this.tex = new THREE.CanvasTexture(cv); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.LinearFilter; t.generateMipmaps = false; t.colorSpace = THREE.SRGBColorSpace;
    const over = (m) => { m.depthTest = false; m.depthWrite = false; m.transparent = true; m.fog = false; m.toneMapped = false; return m; };
    this.panel = new THREE.Mesh(new THREE.PlaneGeometry(1, VH / VW), over(new THREE.MeshBasicMaterial({ map: t })));
    this.panel.renderOrder = 1000; this.panel.name = 'xrHud'; this.panel.frustumCulled = false;
    // EXIT VR: a small plate drawn once per state change on its own little canvas, with the game's pixel font (drawText) and palette (C)
    const ec = this.exitCv = document.createElement('canvas'); ec.width = 64; ec.height = 15;
    this.exitTex = new THREE.CanvasTexture(ec); this.exitTex.magFilter = THREE.NearestFilter; this.exitTex.minFilter = THREE.LinearFilter; this.exitTex.generateMipmaps = false; this.exitTex.colorSpace = THREE.SRGBColorSpace;
    this.exitMesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 15 / 64), over(new THREE.MeshBasicMaterial({ map: this.exitTex })));
    this.exitMesh.renderOrder = 1000; this.exitMesh.name = 'xrExit'; this.exitMesh.frustumCulled = false; this.exitHot = null; this.drawExit(false);
    // the ray (a thin line, scaled to the hit) and the pointer dot, in the game's amber
    // (PHASE 3: a thin tapered beam, 3 mm at the hand, not a 1-pixel line, which flickers and nearly vanishes in the headset)
    const lg = new THREE.CylinderGeometry(0.003, 0.0012, 1, 6, 1, true); lg.rotateX(Math.PI / 2); lg.translate(0, 0, -0.5);
    this.line = new THREE.Mesh(lg, over(new THREE.MeshBasicMaterial({ color: C.amber, opacity: 0.8 }))); this.line.renderOrder = 1001; this.line.frustumCulled = false; this.line.visible = false;
    this.dot = new THREE.Mesh(new THREE.CircleGeometry(0.012, 12), over(new THREE.MeshBasicMaterial({ color: C.amberL }))); this.dot.renderOrder = 1002; this.dot.frustumCulled = false; this.dot.visible = false;
    this.targets = []; this.rig = null; this.layout = null; this.v = new THREE.Vector3();
  }
  drawExit(hot) {
    if (this.exitHot === hot) return; this.exitHot = hot;
    const c = this.exitCv.getContext('2d'), w = 64, h = 15; c.imageSmoothingEnabled = false; c.clearRect(0, 0, w, h);
    c.fillStyle = C.ink; c.fillRect(0, 0, w, h); c.fillStyle = hot ? C.amber : C.burgD; c.fillRect(1, 1, w - 2, h - 2); c.fillStyle = hot ? C.amberL : C.burg; c.fillRect(1, 1, w - 2, 1);
    const s = 'EXIT VR', tw = typeof textW === 'function' ? textW(s, 1) : 28, x = Math.round((w - tw) / 2);
    if (typeof drawText === 'function') { drawText(c, s, x + 1, 5, C.ink, 1); drawText(c, s, x, 4, hot ? C.ink : C.bone, 1); }
    this.exitTex.needsUpdate = true;
  }
  isMenu() { const s = this.game.state; return s === 'title' || s === 'pause' || (s === 'over' && this.game.overT > this.game.overDelay); }
  // place everything on the active rig, in the layout the game's state calls for (called each frame before the picture is drawn)
  place() {
    const rig = this.xr.active; if (!rig) return;
    if (this.rig !== rig) { for (const o of [this.panel, this.exitMesh, this.line, this.dot]) rig.add(o); this.rig = rig; this.layout = null; }
    const c = this.cfg, menu = this.isMenu(), eye = this.xr.head, L = menu ? 'menu' : 'run';
    if (L !== this.layout) {
      this.layout = L;
      if (menu) { this.panel.scale.setScalar(c.menuW); this.panel.position.set(0, eye + c.menuDy, -c.menuDist); this.panel.rotation.set(0, 0, 0); }
      else { this.panel.scale.setScalar(c.runW); this.panel.position.set(0, eye + c.runDy, -c.runDist); this.panel.rotation.set(c.runTilt, 0, 0); }
      this.exitMesh.scale.setScalar(c.exitW); this.exitMesh.position.set(0, eye + c.menuDy - c.menuW * VH / VW / 2 - 0.12, -c.menuDist);
    } else { this.panel.position.y = eye + (menu ? c.menuDy : c.runDy); this.exitMesh.position.y = eye + c.menuDy - c.menuW * VH / VW / 2 - 0.12; }
    this.exitMesh.visible = menu;
    this.targets.length = 0; if (menu) { this.targets.push(this.panel, this.exitMesh); }
  }
  // the ray: hover = Game.mouse in canvas pixels; the line and the dot show where it points
  aim(input) {
    const g = this.game, H = this.isMenu() ? input.aim(this.targets) : (input.hit = null);
    if (H && H.obj === this.panel && H.uv) { g.mouse.x = H.uv.x * VW; g.mouse.y = (1 - H.uv.y) * VH; } else if (this.isMenu()) { g.mouse.x = g.mouse.y = -1; }
    this.drawExit(!!(H && H.obj === this.exitMesh));
    if (input.hover) input.hover(H ? (H.obj === this.exitMesh ? 'exit' : this.buttonAt(g)) : null);
    const show = this.isMenu() && input.hands[input.pointer].ctrl && input.hands[input.pointer].ctrl.visible;
    this.line.visible = !!show; this.dot.visible = !!(show && H);
    if (show) {
      const c = input.hands[input.pointer].ctrl, rig = this.rig;
      this.line.position.copy(c.position); this.line.quaternion.copy(c.quaternion); this.line.scale.set(1, 1, H ? H.dist : 2);      // (the controller space is in rig coordinates too)
      if (H) { this.v.copy(H.point); rig.worldToLocal(this.v); this.dot.position.copy(this.v); this.dot.position.z += 0.004; this.dot.rotation.copy(H.obj.rotation); }
    }
  }
  // which of the game's buttons is under the pointer (for the hover tick), or null
  buttonAt(g) {
    const b = g.activeButton(); if (b && g.overButton(b)) return 'main';
    if (g.state === 'title' && g.r.nextCharacter && g.overButton(BTN.char)) return 'char';
    if (g.sfx && g.state !== 'play' && g.overButton(BTN.sound)) return 'sound';
    return null;
  }
  // after the game drew the frame: upload the canvas it painted (once per frame, only while the panel is shown)
  update() { if (this.panel.parent) this.tex.needsUpdate = true; }
  detach() { for (const o of [this.panel, this.exitMesh, this.line, this.dot]) if (o.parent) o.parent.remove(o); this.rig = null; this.layout = null; }
}
// the layout, in metres (starting values, to be tuned on the headset)
XRHud.cfg = { menuW: 2.4, menuDist: 2.2, menuDy: 0, runW: 1.8, runDist: 1.7, runDy: -0.3, runTilt: -0.2, exitW: 0.5 };
