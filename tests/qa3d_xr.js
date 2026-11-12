// WAYFARER regression test: immersive VR, PHASE 1 (src3d/xr3d.js). There is no headset here, so the page gets a FAKE WebXR device (navigator.xr, an XRSession that hands out frames with two
// views, an XRWebGLLayer) that three.js r186's own WebXRManager drives exactly as it would a real one. What this proves: the button logic, the session start / end paths, who owns the loop (one loop
// at a time, the window loop back after VR), the rigs (cameras parented while presenting, horizon level, the race's own rig), error handling, repeated entering and leaving, and that the page
// without WebXR is unchanged. What it cannot prove: anything about a real Quest 2 (see QUEST2_VR_PHASE1_REPORT.md).
//
// Run:  node tests/qa3d_xr.js     (needs playwright-core and a Chromium: CHROMIUM=/path/to/chrome, NODE_PATH or PW_CORE as for the other tests)
const http = require('http'), fs = require('fs'), path = require('path');
let chromium; try { ({ chromium } = require('playwright-core')); } catch (e) { ({ chromium } = require(process.env.PW_CORE || 'playwright-core')); }
const ROOT = path.join(__dirname, '..'), PORT = 8134;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.mp3': 'audio/mpeg' };
const res = []; const T = (n, ok, i = '') => { res.push(ok); console.log((ok ? 'PASS ' : 'FAIL ') + n + (i !== '' ? '  [' + i + ']' : '')); };

// the fake WebXR device, installed before any page script (options: supported, reject)
const FAKE = (opt) => {
  window.__xrlog = { sessions: 0, rafs: 0, ended: 0 };
  Object.defineProperty(window, 'XRWebGLBinding', { value: undefined, configurable: true });      // (so three uses the plain XRWebGLLayer path, which the fake provides)
  if (window.WebGL2RenderingContext) WebGL2RenderingContext.prototype.makeXRCompatible = function () { return Promise.resolve(); };
  const persp = (l) => { const n = 0.1, f = 1000; return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, (f + n) / (n - f), -1, 0, 0, 2 * f * n / (n - f), 0]; };
  const tr = (x, y, z = 0) => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1];
  // a fake Quest Touch controller: handedness, a target-ray space whose pose the test sets, an xr-standard gamepad (7 buttons, 4 axes) and a haptic actuator that logs its pulses
  window.__xrPad = (hand) => ({ handedness: hand, targetRayMode: 'tracked-pointer', profiles: ['oculus-touch-v2'], gripSpace: null, targetRaySpace: { pose: tr(hand === 'left' ? -0.2 : 0.2, 1.3, -0.3) },
    gamepad: { mapping: 'xr-standard', buttons: Array.from({ length: 7 }, () => ({ pressed: false, touched: false, value: 0 })), axes: [0, 0, 0, 0], hapticActuators: [{ pulse: (v, ms) => { (window.__xrlog.pulses = window.__xrlog.pulses || []).push([hand, v, ms]); return Promise.resolve(true); } }] } });
  window.__xrTr = tr;
  window.__xrRotY = (a, x, y, z) => [Math.cos(a), 0, -Math.sin(a), 0, 0, 1, 0, 0, Math.sin(a), 0, Math.cos(a), 0, x, y, z, 1];      // a head turned by `a` about the vertical, at (x, y, z)
  window.XRWebGLLayer = class { constructor(s, gl, o) { this.framebuffer = null; this.framebufferWidth = 800; this.framebufferHeight = 450; this.ignoreDepthValues = false; this.fixedFoveation = 0; this.scale = o && o.framebufferScaleFactor; window.__xrlog.layer = this; }
    getViewport(v) { return v.eye === 'left' ? { x: 0, y: 0, width: 400, height: 450 } : { x: 400, y: 0, width: 400, height: 450 }; } };
  class FakeSession extends EventTarget {
    constructor() { super(); this.visibilityState = 'visible'; this.renderState = {}; this.inputSources = []; this.enabledFeatures = ['local-floor']; this.id = 0; this.done = false; window.__xrlog.sessions++; window.__xrlog.cur = this; }
    updateRenderState(s) { Object.assign(this.renderState, s); }
    async requestReferenceSpace(t) { if (t === 'bounded-floor') throw new Error('no'); return { type: t, getOffsetReferenceSpace() { return this; } }; }
    requestAnimationFrame(cb) { const id = ++this.id; this.t = setTimeout(() => { if (this.done) return; window.__xrlog.rafs++; const hm = window.__xrlog.headM; const pose = hm ? { transform: { matrix: hm }, views: [{ eye: 'left', transform: { matrix: hm }, projectionMatrix: persp() }, { eye: 'right', transform: { matrix: hm }, projectionMatrix: persp() }] } : { transform: { matrix: tr(0, 1.6) }, views: [{ eye: 'left', transform: { matrix: tr(-0.032, 1.6) }, projectionMatrix: persp() }, { eye: 'right', transform: { matrix: tr(0.032, 1.6) }, projectionMatrix: persp() }] };
      cb(performance.now(), { session: this, getViewerPose: () => (window.__xrlog.lostPose ? null : pose), getPose: (sp) => (sp && sp.pose ? { transform: { matrix: sp.pose }, emulatedPosition: false } : null) }); }, 11); return id; }
    addSources(list) { this.inputSources.push(...list); const e = new Event('inputsourceschange'); e.added = list; e.removed = []; this.dispatchEvent(e); }
    removeSources(list) { this.inputSources = this.inputSources.filter(x => !list.includes(x)); const e = new Event('inputsourceschange'); e.added = []; e.removed = list; this.dispatchEvent(e); }
    hide() { this.visibilityState = 'hidden'; this.dispatchEvent(new Event('visibilitychange')); }
    cancelAnimationFrame() { clearTimeout(this.t); }
    async end() { if (this.done) return; this.done = true; clearTimeout(this.t); window.__xrlog.ended++; this.dispatchEvent(new Event('end')); }
  }
  const xr = { isSessionSupported: async (m) => opt.supported && m === 'immersive-vr', requestSession: async () => { if (opt.reject) throw new Error('denied'); return new FakeSession(); } };
  Object.defineProperty(Navigator.prototype, 'xr', { get() { return opt.none ? undefined : xr; }, configurable: true });
};

(async () => {
  const srv = http.createServer((q, r) => {
    let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
    fs.readFile(path.join(ROOT, p), (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' }); r.end(d); } });
  }).listen(PORT);
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM || require('./_chromium')(), args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const open = async (q, opt) => {
    const ctx = await b.newContext({ viewport: { width: 640, height: 360 } }), pg = await ctx.newPage(), errs = [];
    pg.on('pageerror', e => errs.push(e.message)); pg.on('console', m => m.type() === 'error' && errs.push(m.text()));
    if (opt) await pg.addInitScript(FAKE, opt);
    for (let a = 0; a < 2; a++) { try { await pg.goto('http://localhost:' + PORT + '/' + q, { timeout: 240000 }); break; } catch (e) { if (a) throw e; } }
    await pg.waitForFunction(() => window.__wf, null, { timeout: 240000 }); await pg.waitForTimeout(800);
    return { pg, ctx, errs };
  };

  // ---------------------------------------------------------------- 1. no button where VR is not offered
  {
    const A = await open('?seed=0'); const a = await A.pg.evaluate(() => ({ btn: !!document.getElementById('xr-button'), xr: !!__wf.xr, owner: __wf.loopOwner, t0: __wf.time }));
    await A.pg.waitForFunction(t => __wf.time > t, a.t0, { timeout: 60000 }).catch(() => {}); const t1 = await A.pg.evaluate(() => __wf.time);      /* (waits for the clock to move instead of a fixed 2.5 s: a slow software-GL page load made that a flaky test) */
    T('the ordinary page (no ?vr=1 in an automated browser): no ENTER VR button, the window loop owns the frames and the game runs as before', !a.btn && a.owner === 'window' && t1 > a.t0 && !A.errs.length, JSON.stringify(a) + ' errs=' + A.errs.length);
    await A.ctx.close();
    const N = await open('?vr=1&seed=0', { supported: false, none: true }); const n = await N.pg.evaluate(() => !!document.getElementById('xr-button')); await N.ctx.close();
    const U = await open('?vr=1&seed=0', { supported: false }); const u = await U.pg.evaluate(() => !!document.getElementById('xr-button')); await U.ctx.close();
    const Z = await open('?vr=0&seed=0', { supported: true }); const z = await Z.pg.evaluate(() => !!document.getElementById('xr-button')); await Z.ctx.close();
    T('no button without navigator.xr, none when immersive-vr is not supported, none with ?vr=0', !n && !u && !z, JSON.stringify({ n, u, z }));
  }

  // ---------------------------------------------------------------- 2. a session: start, the loop, the rig, the end
  const S = await open('?vr=1&seed=0', { supported: true }); const pg = S.pg;
  const btn = await pg.evaluate(() => { const e = document.getElementById('xr-button'); return e ? e.textContent : null; });
  T('where immersive-vr is supported the ENTER VR button appears', btn === 'ENTER VR', String(btn));
  // count every call to Game.frame and every headset frame, to see there is exactly one loop
  await pg.evaluate(() => { const g = __wf, f = g.frame.bind(g); window.__fc = 0; g.frame = dt => { window.__fc++; return f(dt); }; });
  const pr0 = await pg.evaluate(() => __wf.r.renderer.getPixelRatio());
  await pg.evaluate(() => document.getElementById('xr-button').click());
  await pg.waitForFunction(() => __wf.xr.presenting && __xrlog.rafs > 5, null, { timeout: 120000 });
  const s1 = await pg.evaluate(async () => {
    const g = __wf, X = g.xr, r = X.rigMain; g.start();
    const fc0 = window.__fc, rf0 = X.frames; await new Promise(k => setTimeout(k, 1500)); const fc1 = window.__fc, rf1 = X.frames;
    return { owner: g.loopOwner, isP: g.r.renderer.xr.isPresenting, label: document.getElementById('xr-button').textContent, camInRig: g.r.camera.parent === r, rigInScene: r.parent === g.r.scene,
      frames: fc1 - fc0, rafs: rf1 - rf0, state: g.state, rx: r.rotation.x, rz: r.rotation.z, y: +r.position.y.toFixed(3), z: +r.position.z.toFixed(3), sky: g.r.sky.position.distanceTo(r.position),
      scale: __xrlog.layer.scale, fov: __xrlog.layer.fixedFoveation, space: g.r.renderer.xr.getReferenceSpace() && g.r.renderer.xr.getReferenceSpace().type, time: g.time };
  });
  T('entering VR: three presents the session, the button says EXIT VR, the reference space is local-floor, the framebuffer scale (0.9) and foveation (1) are set',
    s1.isP && s1.label === 'EXIT VR' && s1.space === 'local-floor' && s1.scale === 0.9 && s1.fov === 1, JSON.stringify({ isP: s1.isP, label: s1.label, space: s1.space, scale: s1.scale, fov: s1.fov }));
  T('ONE LOOP in VR: the headset drives every frame (every Game.frame call comes from the headset loop, none from the window) and the window loop stands idle (loopOwner xr)',
    s1.owner === 'xr' && s1.rafs > 2 && s1.frames === s1.rafs, JSON.stringify({ owner: s1.owner, frames: s1.frames, rafs: s1.rafs }));
  T('the camera rides its rig in the main scene; the horizon is level (no pitch, no roll); the eyes are put 2.2 m over the road (rig 0.6 m + the 1.6 m head) and 4.5 m behind the runner; the sky follows the viewer',
    s1.camInRig && s1.rigInScene && s1.rx === 0 && s1.rz === 0 && s1.y === 0.6 && s1.z === 4.5 && s1.sky < 1e-6, JSON.stringify(s1));
  const pr1 = await pg.evaluate(() => { __wf.r.resize(); return { pr: __wf.r.renderer.getPixelRatio() }; });
  T('the desktop adaptive resolution stands aside while presenting (three works at ratio 1 on the XR layer; resize() does nothing)', pr1.pr === 1, JSON.stringify({ before: pr0, during: pr1.pr }));

  // the race scene in VR: its own camera on its own rig, in its own scene
  const rc = await pg.evaluate(async () => {
    const g = __wf; g.beginRace(null); await new Promise(k => setTimeout(k, 1500));
    const R = g.r.race3d, X = g.xr, r = X.rigRace;
    return { state: g.state, raceCamInRig: !!(R && r && R.camera.parent === r), rigInRace: !!(r && r.parent === R.scene), mainUntouched: g.r.camera.parent === X.rigMain, dz: r ? +(r.position.z - (-g.race.p.s)).toFixed(2) : null, rx: r && r.rotation.x, rz: r && r.rotation.z, fov: R.camera.fov };
  });
  T('the race in VR: its own camera rides its own rig in the race scene (no re-parenting of the main camera), 6.5 m behind the car, horizon level',
    rc.state === 'race' && rc.raceCamInRig && rc.rigInRace && rc.mainUntouched && rc.dz === 6.5 && rc.rx === 0 && rc.rz === 0, JSON.stringify(rc));

  // EXIT
  const fcA = await pg.evaluate(() => { __wf.endRace(); __wf.state = 'play'; return window.__fc; });
  await pg.evaluate(() => document.getElementById('xr-button').click());
  await pg.waitForFunction(() => !__wf.xr.presenting, null, { timeout: 60000 });
  const s2 = await pg.evaluate(async () => {
    const g = __wf, X = g.xr; const st = g.state; const fc0 = window.__fc; await new Promise(k => setTimeout(k, 1200));
    g.state = 'play'; const t0 = g.time; await new Promise(k => setTimeout(k, 600));
    return { owner: g.loopOwner, isP: g.r.renderer.xr.isPresenting, enabled: g.r.renderer.xr.enabled, label: document.getElementById('xr-button').textContent, camParent: g.r.camera.parent ? g.r.camera.parent.name || 'x' : null,
      rigGone: !X.rigMain.parent, raceCamParent: g.r.race3d.camera.parent ? 'x' : null, paused: st, windowFrames: window.__fc - fc0, advanced: g.time > t0, pr: g.r.renderer.getPixelRatio() };
  });
  T('EXIT VR: the headset loop stops, the window loop takes the frames again and the game runs on; the cameras leave their rigs (the scene graph is as before); a running game is paused when VR ends',
    s2.owner === 'window' && !s2.isP && !s2.enabled && s2.label === 'ENTER VR' && s2.camParent === null && s2.rigGone && s2.raceCamParent === null && s2.paused === 'pause' && s2.windowFrames > 5 && s2.advanced, JSON.stringify(s2));
  T('after VR the desktop resolution is back (three restores the pixel ratio)', s2.pr === pr0, JSON.stringify({ before: pr0, after: s2.pr }));

  // ---------------------------------------------------------------- 3. in and out five times
  const rep = await pg.evaluate(async () => {
    const g = __wf, X = g.xr, out = []; const kids0 = g.r.scene.children.length;
    for (let i = 0; i < 5; i++) {
      document.getElementById('xr-button').click(); let n = 0; while (!(X.presenting && __xrlog.rafs > 0) && n++ < 400) await new Promise(k => setTimeout(k, 50));
      const fc0 = window.__fc, rf0 = X.frames; await new Promise(k => setTimeout(k, 500)); const a = { p: X.presenting, d: Math.abs((window.__fc - fc0) - (X.frames - rf0)), n: X.frames - rf0 };
      document.getElementById('xr-button').click(); n = 0; while (X.presenting && n++ < 400) await new Promise(k => setTimeout(k, 50));
      a.out = !X.presenting && g.loopOwner === 'window'; out.push(a);
    }
    return { out, sessions: __xrlog.sessions, ended: __xrlog.ended, kids: g.r.scene.children.length - kids0 };
  });
  T('entering and leaving VR five more times: every time one loop only, every session ended, nothing left in the scene, no page error',
    rep.out.every(a => a.p && a.d === 0 && a.n > 0 && a.out) && rep.sessions === rep.ended && rep.kids === 0 && !S.errs.length, JSON.stringify(rep) + ' errs=' + JSON.stringify(S.errs.slice(0, 3)));

  // ---------------------------------------------------------------- 4. errors
  const er = await pg.evaluate(async () => {
    const g = __wf, X = g.xr, d = g.r.draw.bind(g.r); document.getElementById('xr-button').click(); let n = 0; while (!(X.presenting && __xrlog.rafs > 0) && n++ < 400) await new Promise(k => setTimeout(k, 50));
    const ce = console.error; console.error = () => {}; g.r.draw = () => { throw new Error('boom'); };
    n = 0; while (X.presenting && n++ < 200) await new Promise(k => setTimeout(k, 50));
    g.r.draw = d; console.error = ce; const t0 = g.time; g.state = 'title'; await new Promise(k => setTimeout(k, 500));
    return { out: !X.presenting, owner: g.loopOwner, runs: g.time > t0 };
  });
  T('a frame that keeps failing in VR (3 in a row) ends the session cleanly and the desktop game carries on', er.out && er.owner === 'window' && er.runs, JSON.stringify(er));
  await S.ctx.close();
  const J = await open('?vr=1&seed=0', { supported: true, reject: true });
  await J.pg.evaluate(() => document.getElementById('xr-button').click()); await J.pg.waitForTimeout(400);
  const rj = await J.pg.evaluate(() => ({ label: document.getElementById('xr-button').textContent, p: __wf.xr.presenting, owner: __wf.loopOwner, enabled: __wf.r.renderer.xr.enabled }));
  T('a refused session (requestSession rejects): a short message on the button, nothing presenting, the window loop untouched', rj.label === 'VR UNAVAILABLE' && !rj.p && rj.owner === 'window' && !rj.enabled, JSON.stringify(rj));
  await J.ctx.close();

  // ---------------------------------------------------------------- 6. PHASE 2: the controllers, the HUD panel, the whole loop of the game in VR
  {
    const P = await open('?vr=1&seed=0', { supported: true }), q = P.pg;
    await q.evaluate(() => document.getElementById('xr-button').click()); await q.waitForFunction(() => __wf.xr.presenting && __xrlog.rafs > 2, null, { timeout: 120000 });
    // helpers in the page: wait n headset frames; aim a controller at canvas pixel (x, y) of the menu panel, or at the EXIT VR plate; press / release a button; push a stick
    await q.evaluate(() => {
      const X = __wf.xr; window.nf = async (n = 2) => { const f = X.frames + n; let k = 0; while (X.frames < f && k++ < 600) await new Promise(r => setTimeout(r, 20)); };
      window.L = __xrPad('left'); window.R = __xrPad('right'); __xrlog.cur.addSources([L, R]);
      const H = () => X.head, C = XRHud.cfg;
      window.aimPx = (pad, x, y) => { pad.targetRaySpace.pose = __xrTr((x / 320 - 0.5) * C.menuW, H() + C.menuDy + (0.5 - y / 180) * C.menuW * 180 / 320, -0.3); };
      window.aimExit = (pad) => { pad.targetRaySpace.pose = __xrTr(0, H() + C.menuDy - C.menuW * 180 / 320 / 2 - 0.12, -0.3); };
      window.aimAway = (pad) => { pad.targetRaySpace.pose = __xrTr(3, -2, -0.3); };
      window.btn = (pad, i, on) => { const b = pad.gamepad.buttons[i]; b.pressed = on; b.value = on ? 1 : 0; };
      window.stick = (pad, x, y = 0) => { pad.gamepad.axes[2] = x; pad.gamepad.axes[3] = y; };
      const g = __wf; window.cnt = { start: 0, jump: 0, slide: 0, mount: 0, dismount: 0 };
      for (const k of Object.keys(cnt)) { const f = g[k === 'slide' ? 'slideKey' : k].bind(g); g[k === 'slide' ? 'slideKey' : k] = (...a) => { cnt[k]++; return f(...a); }; }
    });
    await q.evaluate(() => nf(3));
    const d = await q.evaluate(() => { const I = __wf.xr.input; return { left: !!I.hands.left.src, right: !!I.hands.right.src, lc: !!(I.hands.left.ctrl && I.hands.left.ctrl.visible), rc: !!(I.hands.right.ctrl && I.hands.right.ctrl.visible), onRig: I.ctrl.every(c => c.parent === __wf.xr.active) }; });
    T('controller discovery: both Quest Touch controllers are found by hand, tracked (visible) and ride the active rig', d.left && d.right && d.lc && d.rc && d.onRig, JSON.stringify(d));

    // the title in VR: the ray on PLAY lights it (hover), the trigger presses it once
    const t1 = await q.evaluate(async () => {
      const g = __wf, b = BTN.title, hud = __wf.xr.hud; aimPx(R, b.x + b.w / 2, b.y + b.h / 2); await nf(3);
      const hover = { mx: Math.round(g.mouse.x), my: Math.round(g.mouse.y), over: g.overButton(b), line: hud.line.visible, dot: hud.dot.visible, panelOnRig: hud.panel.parent === __wf.xr.active, w: +hud.panel.scale.x.toFixed(2) };
      btn(R, 0, true); await nf(3); const pressed = g.mouse.down, st0 = g.state;
      btn(R, 0, false); await nf(2); const st1 = g.state; await nf(3);
      return { hover, pressed, st0, st1, starts: cnt.start, hints: g.vr };
    });
    T('HUD: the title is on a 2.4 m panel on the rig; the controller ray (line and dot) on PLAY gives the 320x180 canvas point and lights the button; the trigger shows it pressed and starts the game on release, once',
      t1.hover.over && t1.hover.line && t1.hover.dot && t1.hover.panelOnRig && t1.hover.w === 2.4 && t1.pressed && t1.st0 === 'title' && t1.st1 === 'play' && t1.starts === 1, JSON.stringify(t1));

    // steering: dead zone, hysteresis, release
    const st = await q.evaluate(async () => {
      const g = __wf; g.world.items = []; const o = {};
      stick(L, 0.3); await nf(2); o.dead = !g.tleft && !g.tright;
      stick(L, -0.6); await nf(2); o.left = g.tleft && g.held['xr-L'] === 'left';
      stick(L, -0.3); await nf(2); o.hyst = g.tleft;
      stick(L, -0.2); await nf(2); o.off = !g.tleft && g.held['xr-L'] === undefined;
      stick(R, 0.9); await nf(2); o.rightStick = g.tright;
      stick(R, 0); await nf(2); o.rOff = !g.tright;
      return o;
    });
    T('steering (as a held touch button): nothing inside the dead zone (0.3), steers past 0.35, keeps steering down to 0.25 (hysteresis), lets go under it; either stick steers',
      st.dead && st.left && st.hyst && st.off && st.rightStick && st.rOff, JSON.stringify(st));

    // jump, slide, scooter: one action per press, nothing on a held button, nothing left held
    const js = await q.evaluate(async () => {
      const g = __wf, o = {}; g.world.items = [];
      btn(R, 0, true); await nf(4); o.jumps = cnt.jump; btn(R, 0, false); await nf(2);
      await new Promise(r => setTimeout(r, 1200)); g.p.jy = 0; g.p.vy = 0;
      btn(L, 4, true); await nf(2); btn(L, 4, false); await nf(2); o.jumpsX = cnt.jump;
      g.p.jy = 0; g.p.slide = 0; btn(R, 5, true); await nf(4); o.slides = cnt.slide; btn(R, 5, false); await nf(2);
      btn(L, 1, true); await nf(3); o.mounts = cnt.mount + cnt.dismount; btn(L, 1, false); await nf(2);
      o.leftHeld = Object.keys(g.held).filter(k => k.startsWith('xr-'));
      return o;
    });
    T('jump (right trigger; X too), slide (B), scooter (grip): exactly one action per press however long it is held, and no hold left behind',
      js.jumps === 1 && js.jumpsX === 2 && js.slides === 1 && js.mounts === 1 && js.leftHeld.length === 0, JSON.stringify(js));

    // pause and resume with the stick press; steering is released by the pause
    const pz = await q.evaluate(async () => {
      const g = __wf, o = {}; g.world.items = []; stick(L, -0.8); await nf(2); o.steer = g.tleft;
      btn(L, 3, true); await nf(2); btn(L, 3, false); await nf(2); o.paused = g.state; o.released = !g.tleft && g.held['xr-L'] === undefined; o.menu = __wf.xr.hud.isMenu();
      stick(L, 0); await nf(2);
      const b = BTN.pause; aimPx(R, b.x + b.w / 2, b.y + b.h / 2); await nf(2); btn(R, 0, true); await nf(2); btn(R, 0, false); await nf(2); o.resumedByRay = g.state;
      btn(R, 3, true); await nf(2); btn(R, 3, false); await nf(2); o.p2 = g.state; btn(L, 3, true); await nf(2); btn(L, 3, false); await nf(2); o.r2 = g.state;
      return o;
    });
    T('pause (thumbstick press) stops the run and lets go of the steering; the pause menu is on the panel; RESUME by the ray, and the stick press again, resume',
      pz.steer && pz.paused === 'pause' && pz.released && pz.menu && pz.resumedByRay === 'play' && pz.p2 === 'pause' && pz.r2 === 'play', JSON.stringify(pz));

    // the race: one lane per flick, on the race's lane queue
    const rc = await q.evaluate(async () => {
      const g = __wf, o = {}; g.state = 'play'; g.beginRace(null); g.race.cd = 0; await nf(3); const R0 = g.race.p.lane;
      stick(L, 0.85); await nf(5); o.one = g.race.p.lane - R0;
      stick(L, 0.5); await nf(2); stick(L, 0.85); await nf(3); o.noRearm = g.race.p.lane - R0;
      stick(L, 0.1); await nf(2); stick(L, 0.85); await nf(3); o.two = g.race.p.lane - R0; stick(L, 0); await nf(2);
      stick(L, -0.9); await nf(3); o.back = g.race.p.lane - R0; stick(L, 0); await nf(2);
      o.steerHeld = g.tleft || g.tright; o.panelInRace = __wf.xr.hud.panel.parent === __wf.xr.rigRace; o.ctrlInRace = __wf.xr.input.ctrl.every(c => c.parent === __wf.xr.rigRace);
      g.endRace(); await nf(3); o.after = __wf.xr.hud.panel.parent === __wf.xr.rigMain;
      return o;
    });
    T('the race: a flick of the stick is one lane on the race lane queue (held: still one; no second until the stick comes back under 0.3), no continuous steering; the HUD and the controllers follow into the race scene and back',
      rc.one === 1 && rc.noRearm === 1 && rc.two === 2 && rc.back === 1 && !rc.steerHeld && rc.panelInRace && rc.ctrlInRace && rc.after, JSON.stringify(rc));

    // the race pedals from the controllers: held, through the touch channel (right trigger / A / X accelerate, B / Y / left trigger brake), released when let go and at the end of the race
    const pd = await q.evaluate(async () => {
      const g = __wf, o = {}; g.state = 'play'; g.beginRace(null); g.race.cd = 0; await nf(2);
      btn(R, 0, true); await nf(3); o.acc = g.race.p.pedal; btn(R, 0, false); await nf(2); o.off = g.race.p.pedal;
      btn(L, 0, true); await nf(3); o.brkL = g.race.p.pedal; btn(L, 0, false); btn(R, 5, true); await nf(3); o.brkB = g.race.p.pedal;
      g.endRace(); await nf(3); o.heldAfter = Object.keys(g.held).filter(k => k.startsWith('xr-')).length; btn(R, 5, false); await nf(2); o.lane = g.state;
      return o;
    });
    T('race pedals in VR: the right trigger accelerates, the left trigger and B brake, all while held; nothing stays held after the race', pd.acc === 'accel' && pd.off === null && pd.brkL === 'brake' && pd.brkB === 'brake' && pd.heldAfter === 0, JSON.stringify(pd));

    // game over -> RUN AGAIN (A); haptics on the crash
    const ov = await q.evaluate(async () => {
      const g = __wf, o = {}; __xrlog.pulses = []; g.state = 'play'; g.emit('crash'); o.pulses = __xrlog.pulses.length;
      g.state = 'over'; g.overT = 5; await nf(2); o.menu = __wf.xr.hud.isMenu(); const s0 = cnt.start;
      btn(R, 4, true); await nf(3); btn(R, 4, false); await nf(2); o.restart = g.state; o.starts = cnt.start - s0;
      return o;
    });
    T('game over: RUN AGAIN with A (the screen main button), once; a crash pulses both controllers', ov.menu && ov.restart === 'play' && ov.starts === 1 && ov.pulses === 2, JSON.stringify(ov));

    // interruptions: a controller goes away mid-steer, the session is hidden, tracking is lost
    const it = await q.evaluate(async () => {
      const g = __wf, o = {}; g.world.items = [];
      stick(R, 0.9); await nf(2); o.held = g.tright; __xrlog.cur.removeSources([R]); await nf(2); o.disc = !g.tright && g.held['xr-R'] === undefined && !__wf.xr.input.hands.right.src;
      __xrlog.cur.addSources([R]); stick(R, 0); await nf(3); o.back = !!__wf.xr.input.hands.right.src;
      g.state = 'play'; stick(L, -0.9); await nf(2); __xrlog.cur.hide(); await nf(1); o.hidden = g.state === 'pause' && !g.tleft; __xrlog.cur.visibilityState = 'visible'; stick(L, 0); await nf(2);
      g.state = 'play'; __xrlog.lostPose = true; await new Promise(r => setTimeout(r, 900)); await nf(2); o.lost = g.state; __xrlog.lostPose = false; await nf(2);
      return o;
    });
    T('interruptions: a controller disconnected mid-steer leaves nothing held (and reconnects); a hidden session and lost tracking pause the run with nothing held',
      it.held && it.disc && it.back && it.hidden && it.lost === 'pause', JSON.stringify(it));

    // EXIT VR from inside: the plate under the menu, by the ray; steering held at that moment is let go
    const ex = await q.evaluate(async () => {
      const g = __wf, o = {}; g.state = 'pause'; await nf(2); aimExit(R); await nf(3); o.hot = __wf.xr.hud.exitHot;
      btn(R, 0, true); await nf(2); btn(R, 0, false);
      let k = 0; while (__wf.xr.presenting && k++ < 200) await new Promise(r => setTimeout(r, 30));
      o.out = !__wf.xr.presenting && g.loopOwner === 'window'; o.vr = g.vr; o.held = Object.keys(g.held).filter(k2 => k2.startsWith('xr-')).length; o.onEmit = !!g.onEmit; o.hudGone = !__wf.xr.hud.panel.parent;
      return o;
    });
    T('EXIT VR inside VR: the plate under the menu lights under the ray and ends the session; the desktop game is back (window loop, no VR flag, nothing held, no haptics listener, the panel gone)',
      ex.hot && ex.out && ex.vr === false && ex.held === 0 && !ex.onEmit && ex.hudGone, JSON.stringify(ex));

    // back in VR once more: everything works again (re-entry), and on the desktop the hints and effects are back
    const re = await q.evaluate(async () => {
      document.getElementById('xr-button').click(); let k = 0; while (!(__wf.xr.presenting && __xrlog.rafs > 0) && k++ < 400) await new Promise(r => setTimeout(r, 30));
      const s = __xrlog.cur; window.L = __xrPad('left'); window.R = __xrPad('right'); s.addSources([L, R]); await nf(3);
      const g = __wf; g.state = 'title'; await nf(2); const b = BTN.title; aimPx(R, b.x + b.w / 2, b.y + b.h / 2); await nf(2); btn(R, 0, true); await nf(2); btn(R, 0, false); await nf(3);
      const st = g.state; s.end(); k = 0; while (__wf.xr.presenting && k++ < 200) await new Promise(r => setTimeout(r, 30));
      return { st, out: !__wf.xr.presenting, vr: g.vr };
    });
    T('re-entering VR: the controllers are found again and PLAY works by the ray; a session ended by the system returns cleanly', re.st === 'play' && re.out && re.vr === false, JSON.stringify(re));
    T('no page error during the whole VR session tests', !P.errs.length, JSON.stringify(P.errs.slice(0, 3)));
    await P.ctx.close();
  }

  // ---------------------------------------------------------------- 7. PHASE 3: comfort (vignette, fades, scene cuts), haptics, recentring, re-entry, frame statistics
  {
    const P = await open('?vr=1&seed=0', { supported: true }), q = P.pg;
    await q.evaluate(() => document.getElementById('xr-button').click()); await q.waitForFunction(() => __wf.xr.presenting && __xrlog.rafs > 2, null, { timeout: 120000 });
    await q.evaluate(() => {
      const X = __wf.xr; window.nf = async (n = 2) => { const f = X.frames + n; let k = 0; while (X.frames < f && k++ < 600) await new Promise(r => setTimeout(r, 20)); };
      window.L = __xrPad('left'); window.R = __xrPad('right'); __xrlog.cur.addSources([L, R]);
      window.btn = (pad, i, on) => { const b = pad.gamepad.buttons[i]; b.pressed = on; b.value = on ? 1 : 0; };
    });
    await q.evaluate(() => nf(3));
    const cf = await q.evaluate(async () => {
      const g = __wf, X = g.xr, C = X.comfort, o = {}; g.start(); g.world.items = []; await nf(4);
      await nf(6); o.onCam = C.vig.parent === g.r.camera && C.fade.parent === g.r.camera; o.calm = +C.vig.material.opacity.toFixed(3);
      for (let i = 0; i < 12; i++) { g.p.speed = MAX_SPEED; g.world.items = []; await nf(1); } o.fast = +C.vig.material.opacity.toFixed(2);
      C.cfg.vignette = 0; await nf(3); o.off = C.vig.visible; C.cfg.vignette = 0.5; g.p.speed = BASE_SPEED;
      g.fadeIn = 1; C.update(0); o.fadeIn = C.fade.material.opacity; await nf(1); g.fadeIn = 0; await nf(2); o.clear = C.fade.visible;
      g.fadeIn = 0; g.portal.flash = 1; C.update(0); o.portal = +C.fade.material.opacity.toFixed(2); g.portal.flash = 0; await nf(1);       /* (the game recomputes the flash every frame: set it and update the comfort layer at once) */
      g.state = 'play'; g.beginRace(null); let cut = 0; for (let i = 0; i < 4; i++) { await nf(1); cut = Math.max(cut, C.fade.material.opacity); } o.raceCut = +cut.toFixed(2);
      o.onRaceCam = C.vig.parent === g.r.race3d.camera; o.raceSnap = Math.abs(X.rigRace.position.z - (-g.race.p.s + X.cfg.raceBack)) < 1e-6;
      o.roll = X.rigRace.rotation.x === 0 && X.rigRace.rotation.z === 0;
      g.endRace(); await nf(3); o.back = C.vig.parent === g.r.camera;
      return o;
    });
    T('comfort: the vignette and the fade ride the camera (with the head); the vignette is faint (under 0.1) when calm, clearly stronger at top speed, and can be turned off (vignette 0)',
      cf.onCam && cf.calm < 0.1 && cf.fast > cf.calm + 0.1 && cf.off === false, JSON.stringify(cf));
    T('comfort: the game fades (g.fadeIn) and a portal door flash darken the view in VR; going into the race is a cut behind black (the rig snaps, no sweep), both cameras carry the comfort layer, the horizon stays level',
      cf.fadeIn > 0.95 && !cf.clear && cf.portal === 0.7 && cf.raceCut > 0.3 && cf.onRaceCam && cf.raceSnap && cf.roll && cf.back, JSON.stringify(cf));

    const hp = await q.evaluate(async () => {
      const g = __wf, I = g.xr.input, o = {}; __xrlog.pulses = [];
      g.state = 'play'; g.emit('perk', 'magnet'); o.perk = __xrlog.pulses.length; g.emit('coin'); o.coinV = __xrlog.pulses[__xrlog.pulses.length - 1][1];
      I.map.hapticScale = 0; __xrlog.pulses = []; g.emit('crash'); o.scale0 = __xrlog.pulses.length; I.map.hapticScale = 1;
      I.map.haptics = false; g.emit('crash'); o.off = __xrlog.pulses.length; I.map.haptics = true;
      const ha = R.gamepad.hapticActuators; R.gamepad.hapticActuators = []; let err = null; try { o.none = I.pulse(I.hands.right, 0.5, 20); } catch (e) { err = e.message; } o.err = err;
      let va = 0; R.gamepad.vibrationActuator = { playEffect: () => { va++; return Promise.resolve(); } }; I.pulse(I.hands.right, 0.5, 20); o.fallback = va; delete R.gamepad.vibrationActuator; R.gamepad.hapticActuators = ha;
      g.state = 'play'; g.beginRace(null); g.race.cd = 0; await nf(2); __xrlog.pulses = []; g.race.p.bumps = (g.race.p.bumps || 0) + 1; await nf(2); o.bump = __xrlog.pulses.filter(p => p[2] === 80).length;
      g.endRace(); await nf(2);
      return o;
    });
    T('haptics: a power-up pulses both hands, a coin is faint (0.1); strength 0 or haptics off make no pulse; a controller without haptics is ignored without error, the newer vibrationActuator is used where it exists; the race pulses on a bump into the robot',
      hp.perk === 2 && hp.coinV === 0.1 && hp.scale0 === 0 && hp.off === 0 && hp.none === false && hp.err === null && hp.fallback === 1 && hp.bump === 2, JSON.stringify(hp));

    const hv = await q.evaluate(async () => {
      const g = __wf, C = XRHud.cfg, X = g.xr; g.state = 'title'; await nf(2);
      R.targetRaySpace.pose = __xrTr(3, -2, -0.3); await nf(2); __xrlog.pulses = []; const b = BTN.title;
      R.targetRaySpace.pose = __xrTr(((b.x + b.w / 2) / 320 - 0.5) * C.menuW, X.head + C.menuDy + (0.5 - (b.y + b.h / 2) / 180) * C.menuW * 180 / 320, -0.3); await nf(4);
      const ticks = __xrlog.pulses.filter(p => p[1] === 0.05).length, beam = X.hud.line.visible && X.hud.line.geometry.type === 'CylinderGeometry';
      return { ticks, beam };
    });
    T('menus: the ray is a visible beam (not a 1-pixel line) and moving it onto a button gives one faint hover tick', hv.ticks === 1 && hv.beam, JSON.stringify(hv));

    // recentring for seated play: a head sitting off to the side and turned 90 degrees, both grips held in the title
    const rc = await q.evaluate(async () => {
      const g = __wf, X = g.xr, cam = g.r.camera, o = {}; g.state = 'title'; __xrlog.headM = __xrRotY(Math.PI / 2, 0.5, 1.2, 0.3); await nf(3);
      const n0 = X.centred; btn(L, 1, true); btn(R, 1, true); const t0 = performance.now(); while (performance.now() - t0 < 1300) await nf(1); btn(L, 1, false); btn(R, 1, false); await nf(3);
      o.centred = X.centred - n0; const p = new THREE.Vector3(), d = new THREE.Vector3(); cam.getWorldPosition(p); cam.getWorldDirection(d);
      o.headX = +p.x.toFixed(2); o.headY = +p.y.toFixed(2); o.headZ = +p.z.toFixed(2); o.dirX = +d.x.toFixed(2); o.dirZ = +d.z.toFixed(2); o.rigX = +X.rigMain.position.x.toFixed(2);
      __xrlog.headM = null; await nf(2); return o;
    });
    T('seated play: holding both grips in a menu recentres; a player sitting 0.5 m aside and facing 90 degrees away still sees down the road, eyes 2.2 m over it, 4.5 m behind the runner',
      rc.centred === 1 && Math.abs(rc.headX) < 0.6 && rc.headY === 2.2 && rc.headZ === 4.5 && Math.abs(rc.dirX) < 0.05 && rc.dirZ < -0.95, JSON.stringify(rc));

    // re-entry: the controllers stay in the rig between sessions; the head is still measured from the camera (a Phase 2 bug: it was read from the rig's first child)
    const re = await q.evaluate(async () => {
      const X = __wf.xr; __xrlog.cur.end(); let k = 0; while (X.presenting && k++ < 200) await new Promise(r => setTimeout(r, 30));
      document.getElementById('xr-button').click(); k = 0; while (!(X.presenting && __xrlog.rafs > 0) && k++ < 400) await new Promise(r => setTimeout(r, 30));
      __xrlog.cur.addSources([__xrPad('left'), __xrPad('right')]); await nf(6);
      return { camRef: X.rigMain.userData.cam === __wf.r.camera, head: +X.head.toFixed(2), firstChildIsCam: X.rigMain.children[0] === __wf.r.camera, stats: !!(X.st && X.st.n > 0) };
    });
    T('re-entering VR: the rig knows its camera (not its first child, which may be a controller) and the eye height is the headset 1.6 m; frame statistics are kept', re.camRef && re.head === 1.6 && re.stats, JSON.stringify(re));
    T('no page error during the comfort / haptics tests', !P.errs.length, JSON.stringify(P.errs.slice(0, 3)));
    await P.ctx.close();
  }

  // ---------------------------------------------------------------- 5. the classic 2D page never loads VR
  const D = await open2d();
  async function open2d() {
    const ctx = await b.newContext({ viewport: { width: 640, height: 360 } }), p2 = await ctx.newPage(), errs = []; p2.on('pageerror', e => errs.push(e.message));
    await p2.addInitScript(FAKE, { supported: true });
    await p2.goto('http://localhost:' + PORT + '/2d.html?vr=1', { timeout: 120000 }); await p2.waitForFunction(() => window.__wf || window.game || document.readyState === 'complete', null, { timeout: 120000 }); await p2.waitForTimeout(800);
    const r = await p2.evaluate(() => ({ xr3d: typeof XR3D, btn: !!document.getElementById('xr-button'), three: typeof THREE })); await ctx.close(); return { r, errs };
  }
  T('the classic 2D page loads no VR code and shows no button (even with a WebXR device present)', D.r.xr3d === 'undefined' && !D.r.btn && !D.errs.length, JSON.stringify(D));

  await b.close(); srv.close();
  console.log('\n' + res.filter(Boolean).length + '/' + res.length + ' passed');
  process.exit(res.every(Boolean) ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
