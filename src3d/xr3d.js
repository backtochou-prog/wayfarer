// XR3D: WAYFARER in immersive VR (WebXR, Meta Quest Browser), through three.js r186's own WebXR support (renderer.xr). PHASE 1, PHASE 2 (the controllers: src3d/xr_input.js; the HUD and menus: src3d/xr_hud.js) (see QUEST2_VR_IMPLEMENTATION_PLAN.md): the session, the loop,
// the camera rig and the stereo picture. No gameplay here: the Game keeps every rule; this module only owns the frame clock while a session runs and moves the two camera rigs.
//
// - Support: an ENTER VR button appears only where navigator.xr says 'immersive-vr' is supported (?vr=0 hides it). Nothing else runs until it is pressed, so desktop and phones are unchanged.
// - The loop: while a session runs, the frames come from the headset (renderer.setAnimationLoop -> XRSession.requestAnimationFrame) at its own rate (72 / 80 / 90 Hz), with no 60 fps cap; the
//   window loop of Game stays armed but does nothing (Game.loopOwner = 'xr'). When the session ends (EXIT VR, the headset's own exit, an error) the window loop takes over again.
// - The rigs: the headset owns the camera's rotation and position, so the chase view moves a RIG that holds the camera: one rig per scene and camera (the main scene, and the race's own scene),
//   inserted at session start and taken out at the end (the desktop scene graph is left as it was). A rig only moves sideways / along the road and turns about the vertical: no pitch, no roll
//   (the horizon stays level), no shake; height is fixed (cfg.eyeY above the road for the player's eyes, whatever their real height).
// - Rendering: a conservative framebuffer scale (0.9) and fixed foveation (1), set before the session; the desktop adaptive resolution (Renderer3D.adapt / resize) stands aside while presenting.
// Every number of the framing is in XR3D.cfg and can be set from the URL for tuning on the headset (?xrY=2.2&xrBack=4.5&xrLat=0.6&xrScale=0.9&xrFov=1).
class XR3D {
  constructor(game) {
    this.game = game; this.r3 = game.r; this.renderer = game.r.renderer; this.presenting = false; this.busy = false; this.session = null; this.errors = 0; this.frames = 0;
    this.cfg = Object.assign({}, XR3D.cfg, XR3D.urlCfg());
    this.rigMain = null; this.rigRace = null; this.head = 1.6; this.tmp = new THREE.Vector3(); this.e = new THREE.Euler(); this.q = new THREE.Quaternion(); this.pose = null; this.m4 = new THREE.Matrix4(); this.hp = new THREE.Vector3(); this.sc = new THREE.Vector3(); this.h0 = { x: 0, z: 0, yaw: 0 }; this.wantCentre = false; this.centred = 0;
    this.r3.xr = this;                                                                   // the renderers ask `this.xr && this.xr.presenting` before they touch the camera or the size
    this.button = null; this.check();
  }
  static urlCfg() {
    const o = {}, q = typeof location !== 'undefined' ? location.search : '', num = (k, n) => { const m = q.match(new RegExp('[?&]' + k + '=([\\d.]+)')); if (m) o[n] = +m[1]; };
    num('xrY', 'eyeY'); num('xrBack', 'back'); num('xrRaceBack', 'raceBack'); num('xrLat', 'latFollow'); num('xrScale', 'scale'); num('xrFov', 'foveation'); if (/[?&]xrStats=1/.test(q)) o.stats = true;
    return o;
  }
  // is 'immersive-vr' there? then show the button (never in automated browsers unless the page asks with ?vr=1, so the existing tests see the page they always saw)
  async check() {
    const q = typeof location !== 'undefined' ? location.search : '';
    if (/[?&]vr=0/.test(q)) return false;
    if (typeof navigator === 'undefined' || !navigator.xr || !navigator.xr.isSessionSupported) return false;
    if (navigator.webdriver && !/[?&]vr=1/.test(q)) return false;
    let ok = false; try { ok = await navigator.xr.isSessionSupported('immersive-vr'); } catch (e) { ok = false; }
    if (ok) this.showButton();
    return ok;
  }
  showButton() {
    if (this.button || typeof document === 'undefined') return;
    const b = this.button = document.createElement('button'); b.id = 'xr-button'; b.type = 'button'; b.textContent = 'ENTER VR';
    b.style.cssText = 'position:fixed;right:max(12px,env(safe-area-inset-right,0px));top:max(12px,env(safe-area-inset-top,0px));z-index:5;padding:10px 16px;font:bold 14px/1 monospace;' +
      'letter-spacing:.08em;color:#fff3df;background:rgba(40,18,30,.78);border:2px solid #ffb35c;border-radius:6px;cursor:pointer;touch-action:manipulation';
    b.addEventListener('click', e => { e.stopPropagation(); this.presenting ? this.exit() : this.enter(); });
    b.addEventListener('pointerdown', e => e.stopPropagation());        // (the game's own pointer handlers never see a press on the button)
    b.addEventListener('pointerup', e => e.stopPropagation());
    document.body.appendChild(b);
  }
  label(t) { if (this.button) this.button.textContent = t; }

  // ENTER: ask for the session (it must be called from the click), set the framebuffer scale and foveation first, then hand it to three
  async enter() {
    if (this.busy || this.presenting) return;
    this.busy = true; this.label('STARTING…');
    let s = null;
    try {
      s = await navigator.xr.requestSession('immersive-vr', { optionalFeatures: ['local-floor', 'bounded-floor'] });
      const xr = this.renderer.xr;
      xr.enabled = true;
      xr.setFramebufferScaleFactor(this.cfg.scale);
      xr.setFoveation(this.cfg.foveation);
      xr.setReferenceSpaceType(await XR3D.spaceType(s));
      this.session = s;
      s.addEventListener('end', this.onEnd = () => this.ended());
      xr.addEventListener('sessionstart', this.onStart = () => this.started());
      this.loop();                                                                       // BEFORE setSession: three stops its window-driven animation at 'sessionstart' only if the loop is already set (set after, it restarts it and two loops run)
      await xr.setSession(s);
    } catch (e) {
      console.warn('[XR3D] could not start the VR session:', e);
      this.busy = false; this.label('VR UNAVAILABLE');
      setTimeout(() => this.label('ENTER VR'), 2500);
      this.renderer.setAnimationLoop(null);
      if (s && !this.presenting) { try { await s.end(); } catch (e2) {} }
      this.cleanup();
    }
  }
  // 'local-floor' when the device offers it (the plan's choice), else 'local'
  static async spaceType(s) {
    try { await s.requestReferenceSpace('local-floor'); return 'local-floor'; } catch (e) { return 'local'; }
  }
  exit() { if (this.session) this.session.end().catch(() => {}); }

  // the session is running: take the frames, put the cameras on their rigs
  started() {
    const g = this.game, wasPlay = g.state;
    this.presenting = true; this.busy = false; this.errors = 0; this.frames = 0; this.label('EXIT VR');
    this.mountRig('main'); this.active = this.rigMain; this.lostAt = 0; this.h0 = { x: 0, z: 0, yaw: 0 }; if (this.cfg.autoCentre) this.recentre();
    g.vr = true;                                                                         // the HUD canvas becomes a panel: Renderer.drawUI leaves out what covers the whole screen and the keyboard hints
    if (typeof XRInput !== 'undefined') { this.input = this.input || new XRInput(this); this.input.start(this.session); }      // PHASE 2: the controllers (src3d/xr_input.js)
    if (typeof XRHud !== 'undefined') this.hud = this.hud || new XRHud(this);                                                 // and the HUD / menus in the world (src3d/xr_hud.js)
    if (typeof XRComfort !== 'undefined') { this.comfort = this.comfort || new XRComfort(this); this.comfort.reset(); }       // PHASE 3: the vignette and the fades (src3d/xr_comfort.js)
    if (this.session) this.session.addEventListener('visibilitychange', this.onVis = () => this.visibility());
    g.loopOwner = 'xr'; this.last = -1;
    if (g.state === 'race' && g.race && g.race.menu) g.kartChoose('chase');                // the kart's quick menu cannot be used with the controllers: the session start is the choice (the camera behind)
    // entering VR can blur the page (and the Game pauses on blur): a run that was going on goes on
    if (wasPlay === 'play') setTimeout(() => { if (this.presenting && g.state === 'pause') g.state = 'play'; }, 600);
  }
  // the headset's frame loop. It is registered just before the session starts, so it may be called by the window for a moment before that: it only works while presenting
  loop() {
    const g = this.game; this.last = -1;
    this.renderer.setAnimationLoop((t) => {
      if (!this.presenting || !this.renderer.xr.isPresenting) return;
      const dt = this.last < 0 ? 1 / 72 : Math.max(0, Math.min(0.05, (t - this.last) / 1000)); this.last = t;
      try { this.frames++; const t0 = performance.now(); this.preFrame(dt); g.frame(dt); if (this.hud) this.hud.update(); if (this.comfort) this.comfort.update(dt); this.stats(performance.now() - t0, dt); this.errors = 0; }
      catch (e) { console.error('[XR3D] frame error:', e); if (++this.errors >= 3) this.exit(); }
    });
  }
  // frame statistics for tuning on the headset (?xrStats=1 logs them every 5 s; tests read them): the JS time of a frame and the interval between headset frames
  stats(ms, dt) {
    const S = this.st || (this.st = { n: 0, js: 0, jsMax: 0, dt: 0, slow: 0, t0: performance.now() });
    S.n++; S.js += ms; S.jsMax = Math.max(S.jsMax, ms); S.dt += dt; if (dt > 1 / 60) S.slow++;
    if (this.cfg.stats && performance.now() - S.t0 > 5000) { const i = this.renderer.info.render; console.log('[XR3D] ' + S.n + ' frames, ' + (S.n / S.dt).toFixed(1) + ' fps, JS ' + (S.js / S.n).toFixed(2) + ' ms (max ' + S.jsMax.toFixed(1) + '), frames over 16.7 ms: ' + S.slow + ', draw calls ' + i.calls + ', triangles ' + i.triangles + ', textures ' + this.renderer.info.memory.textures); this.st = null; }
  }
  // before the game steps: which rig is drawn (the race's while racing), the controllers and the HUD on it, the ray, then the controllers' input; a run waits if tracking is lost
  preFrame(dt) {
    const g = this.game;
    const prev = this.active;
    this.active = (g.state === 'race' && g.race && this.raceView()) ? this.rig('race') : this.rigMain;
    if (prev && prev !== this.active) { this.active.userData.fresh = true; if (this.comfort) this.comfort.cut(); }     // a change of scene (the race and back) snaps behind a short fade, never sweeps
    if (this.input) for (const c of this.input.ctrl) if (c && c.parent !== this.active) this.active.add(c);
    if (this.hud) { this.hud.place(); if (this.input) this.hud.aim(this.input); }
    if (this.input) this.input.poll(dt);
    const xr = this.renderer.xr, fr = xr.getFrame && xr.getFrame(), ref = xr.getReferenceSpace();
    const pose = fr && ref && fr.getViewerPose ? fr.getViewerPose(ref) : null;
    this.pose = null;                                                                    // the headset in the room (reference space), exact this frame: for the eye height and recentring
    if (pose && pose.transform && pose.transform.matrix) { this.m4.fromArray(pose.transform.matrix).decompose(this.hp, this.q, this.sc); this.pose = this.hp; }
    const now = performance.now(); if (pose) this.lostAt = 0; else if (!this.lostAt) this.lostAt = now;
    if (pose && g.race && g.race.hold && (!this.session || this.session.visibilityState === 'visible')) { g.race.hold = false; g.race.cd = Math.max(g.race.cd, 1.5); }      // the headset is back on: the race goes on after a short countdown           // (real time: the game's dt is clamped)
    if (this.lostAt && now - this.lostAt > 250) this.interrupt();
  }
  // the headset lost tracking, the session was hidden (the system menu, the headset taken off), or a controller went away mid-press: nothing stays held, a run waits
  interrupt() {
    if (this.input) this.input.release();
    const g = this.game; if (g.state === 'play') { g.state = 'pause'; g.releaseTouch(); }
    else if (g.state === 'race' && g.race && !g.race.done && !g.race.menu) { g.race.hold = true; g.releaseTouch(); }      // a race (the kart's gate rule loses it for whoever is slow) waits too: Game.raceStep stands still while it is held
  }
  visibility() { if (this.session && this.session.visibilityState !== 'visible') this.interrupt(); }
  // the session is over, whoever ended it: stop the headset's loop, give the frames back to the window, take the cameras off their rigs
  ended() {
    this.renderer.setAnimationLoop(null);
    this.game.loopOwner = 'window';
    this.presenting = false; this.busy = false;
    if (this.input) this.input.stop();
    if (this.hud) this.hud.detach();
    if (this.comfort) this.comfort.detach();
    if (this.session && this.onVis) this.session.removeEventListener('visibilitychange', this.onVis); this.onVis = null;
    if (this.game.race) this.game.race.hold = false;                                      // (a race held for a lost headset is not left frozen on the desktop)
    this.game.vr = false; this.game.mouse.x = this.game.mouse.y = -1; this.game.mouse.down = false; this.active = null;
    this.unmountRig(this.rigMain, this.r3.camera); this.unmountRig(this.rigRace, this.rigRace && this.rigRace.userData.cam);
    this.cleanup();
    if (this.game.state === 'play') this.game.state = 'pause';                          // the headset came off: the run waits
    this.label('ENTER VR');
    setTimeout(() => { try { if (!this.presenting) this.r3.resize(); } catch (e) {} }, 0);      // (after three has finished ending the session: it refuses a resize while still presenting)
  }
  cleanup() {
    const xr = this.renderer.xr;
    if (this.onStart) xr.removeEventListener('sessionstart', this.onStart);
    if (this.session && this.onEnd) this.session.removeEventListener('end', this.onEnd);
    this.onStart = this.onEnd = null; this.session = null;
    xr.enabled = false;
  }

  // ---- the rigs. A camera sits in its rig only while presenting; the rig is a child of that camera's scene.
  // the scene and camera the race is drawn with: the kart circuit has its OWN (Kart3D), every other race uses Race3D's
  raceView() {
    const r3 = this.r3, g = this.game, K = g && g.race && g.race.kart && r3.kart3d;
    if (K) return { scene: K.scene, camera: K.camera, kart: true };
    const R = r3.race3d; return R ? { scene: R.scene, camera: R.camera, kart: false } : null;
  }
  mountRig(which) {
    if (which === 'main') {
      if (!this.rigMain) { this.rigMain = new THREE.Group(); this.rigMain.name = 'xrRigMain'; }
      this.attach(this.rigMain, this.r3.scene, this.r3.camera);
    } else {
      const V = this.raceView(); if (!V) return null;
      if (!this.rigRace) { this.rigRace = new THREE.Group(); this.rigRace.name = 'xrRigRace'; }
      this.attach(this.rigRace, V.scene, V.camera);
    }
    return which === 'main' ? this.rigMain : this.rigRace;
  }
  attach(rig, scene, cam) {
    const old = rig.userData.cam; if (old && old !== cam && old.parent === rig) rig.remove(old);       // (the rig moves between the race scenes: the other scene's camera is let go)
    if (rig.parent !== scene) scene.add(rig);
    if (cam.parent !== rig) { cam.position.set(0, 0, 0); cam.quaternion.identity(); rig.add(cam); }
    rig.userData.cam = cam;                                                               // (not children[0]: the controllers and the HUD ride the rig too, in any order)
    rig.userData.fresh = true;                                                            // the first placement snaps (no sweep from wherever the rig was)
  }
  unmountRig(rig, cam) {
    if (!rig) return;
    if (cam && cam.parent === rig) rig.remove(cam);
    if (rig.parent) rig.parent.remove(rig);
  }
  rig(which) {
    if (which !== 'race') return this.rigMain;
    const V = this.raceView(), r = this.rigRace;
    return r && V && r.parent === V.scene && V.camera.parent === r ? r : this.mountRig('race');       // (valid only on the scene being drawn now)
  }
  // the headset's own height over the floor, measured slowly (the seated compensation in place()), and the recentre request
  trackHead(rig, dt) {
    const cam = rig.userData.cam, fresh = rig.userData.fresh, hy = this.pose ? this.pose.y : (cam ? cam.position.y : 0);
    if (hy > 0.3 && hy < 2.5) this.head += (hy - this.head) * (fresh ? 1 : Math.min(1, dt * 0.5));
    if (this.wantCentre && this.pose) { this.centre(this.pose); this.wantCentre = false; }
  }
  // THE KART CIRCUIT'S RIG: the car drives round a ring, so the rig is put straight at `pos` (a world point on the road, height included), turned to `yaw` (about the vertical), no smoothing and no
  // yaw clamp; the player's eyes sit cfg.eyeY above the road whatever their real height (the seated compensation), the room's own place and heading taken out as in place()
  placeKart(rig, pos, yaw, dt) {
    if (this.active && this.active !== rig) { rig.userData.fresh = true; if (this.comfort) this.comfort.cut(); }
    this.active = rig; this.trackHead(rig, dt); rig.userData.fresh = false;
    const c = this.cfg, h0 = this.h0, ry = yaw - h0.yaw, co = Math.cos(ry), si = Math.sin(ry);
    rig.rotation.set(0, ry, 0);
    rig.position.set(pos.x - (co * h0.x + si * h0.z), pos.y + c.eyeY - (c.seatedCompensate ? this.head : 0), pos.z - (-si * h0.x + co * h0.z));
  }

  // the yaw (about the vertical) of a camera at `from` looking at `to`, the way three's cameras look (down -z)
  static yaw(from, to) { return Math.atan2(-(to.x - from.x), -(to.z - from.z)); }
  // PLACE A RIG: x follows (smoothed), z is the runner's plus the back offset (hard: the road is fast, a lag would let the runner run away), the height puts the player's eyes at cfg.eyeY above the
  // road whatever their own height (the headset's height over the floor is measured slowly), the yaw is smoothed and kept within cfg.yawClamp of straight ahead. No pitch, no roll.
  // RECENTRE (PHASE 3, seated play): the player's own place and heading in the room (where the headset is over the floor, which way it faces) are taken out, so the view sits behind the runner
  // and looks down the road whichever way the chair faces. Done once tracking starts, and on demand (both grips held in a menu: XRInput).
  place(rig, x, zRunner, yaw, dt, back) {
    if (this.active && this.active !== rig) { rig.userData.fresh = true; if (this.comfort) this.comfort.cut(); }    // (the race scene's first frame: its rig appears here)
    this.active = rig;
    const c = this.cfg, cam = rig.userData.cam, u = rig.userData, fresh = u.fresh;
    const hy = this.pose ? this.pose.y : (cam ? cam.position.y : 0);
    if (hy > 0.3 && hy < 2.5) this.head += (hy - this.head) * (fresh ? 1 : Math.min(1, dt * 0.5));
    if (this.wantCentre && this.pose) { this.centre(this.pose); this.wantCentre = false; }
    const lim = c.yawClamp * Math.PI / 180, ty = Math.max(-lim, Math.min(lim, yaw)), tx = x * c.latFollow;
    if (fresh || u.sx === undefined) { u.sx = tx; u.sy = ty; u.fresh = false; }
    else { u.sx += (tx - u.sx) * (1 - Math.exp(-dt / c.posLag)); u.sy += (ty - u.sy) * (1 - Math.exp(-dt / c.yawLag)); }
    const h0 = this.h0, ry = u.sy - h0.yaw, co = Math.cos(ry), si = Math.sin(ry);
    rig.rotation.set(0, ry, 0);                                                            // yaw only: no pitch, no roll, the horizon stays level
    rig.position.x = u.sx - (co * h0.x + si * h0.z);
    rig.position.z = zRunner + back - (-si * h0.x + co * h0.z);
    rig.position.y = c.eyeY - (c.seatedCompensate ? this.head : 0);
  }
  recentre() { this.wantCentre = true; }
  centre(p) { this.e.setFromQuaternion(this.q, 'YXZ'); this.h0 = { x: p.x, z: p.z, yaw: this.e.y }; if (p.y > 0.3) this.head = p.y; this.centred++; }       // (p / this.q: this frame's headset position and orientation)
  // the main scene (called by Renderer3D.draw instead of writing the camera): the desktop chase target `cam` / `look` gives the side and the heading; the runner stands at z = 0
  applyMain(cam, look, dt) { const r = this.rigMain; if (!r) return; if (this.game.state === 'title') { this.place(r, 0, 0, 0, dt, this.cfg.back); return; } this.place(r, cam.x, 0, XR3D.yaw(cam, look), dt, this.cfg.back); }     // (the title: still, straight behind the runner; the desktop menu camera orbits, which in VR would be forced motion)
  // the race scene (called by Race3D.draw): its car runs down -z at `zRunner`
  applyRace(x, zRunner, yaw, dt) { const r = this.rig('race'); if (!r) return; this.place(r, x, zRunner, yaw, dt, this.cfg.raceBack); }
  // where the eyes are, in the main scene (for the sky dome and the sun, which follow the viewer)
  eyeWorld(out) { const r = this.rigMain; return out.copy(r ? r.position : this.r3.camera.position); }
}
// starting values, to be tuned on the headset
XR3D.cfg = {
  eyeY: 2.2,            // metres above the road for the player's eyes (the desktop chase camera is at 4.2: lower is more comfortable and the runner is bigger)
  back: 4.5,            // metres behind the runner (desktop 7.5)
  raceBack: 6.5,        // metres behind the car in the race (its own camera is 8.2 behind)
  latFollow: 0.6,       // how much of the chase camera's sideways move the rig takes
  posLag: 0.12,         // seconds: smoothing of the sideways move
  yawLag: 0.6,          // seconds: smoothing of the turn on curves
  yawClamp: 25,         // degrees: the most the rig turns from straight ahead
  seatedCompensate: true,  // put the eyes at eyeY whatever the player's real height (seated or standing)
  scale: 0.9,           // XR framebuffer scale (set before the session)
  foveation: 1,         // fixed foveated rendering, 0..1
  autoCentre: true,     // recentre on the player's place and heading when tracking starts (seated play in any direction)
  stats: false,         // ?xrStats=1: log the frame rate, JS time and draw calls every 5 s (remote DevTools console)
};
XR3D.maybeCreate = game => (typeof THREE !== 'undefined' && game && game.r && game.r.renderer && game.r.renderer.xr) ? new XR3D(game) : null;
