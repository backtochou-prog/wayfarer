// WAYFARER regression test: the kart circuit in VR (src3d/xr3d.js + src3d/kart3d.js). A FAKE WebXR device (the one of qa3d_xr.js) drives three.js' own WebXR code, so this proves the wiring, not a real
// headset. What it guards: the kart is drawn with Kart3D's OWN scene and camera, so the XR rig, the HUD panel, the controllers' ray and the comfort vignette must be mounted THERE (they used to be
// mounted on the other race scene, which is never drawn for the kart: no HUD in the headset), the rig must follow the track's height through the banked laps and the dive into the spiral tunnel
// (it used to stay on the road above the tunnel), the eyes sit at a fixed height whatever the player's own, the quick menu is answered when the session starts, and a headset taken off holds the race.
//
// Run:  node tests/qa3d_kartvr.js     (needs playwright-core and a Chromium: CHROMIUM=/path/to/chrome, NODE_PATH or PW_CORE as for the other tests)
const http = require('http'), fs = require('fs'), path = require('path');
let chromium; try { ({ chromium } = require('playwright-core')); } catch (e) { ({ chromium } = require(process.env.PW_CORE || 'playwright-core')); }
const ROOT = path.join(__dirname, '..'), PORT = 8136;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.mp3': 'audio/mpeg' };
const res = []; const T = (n, ok, i = '') => { res.push(ok); console.log((ok ? 'PASS ' : 'FAIL ') + n + (i !== '' ? '  [' + i + ']' : '')); };
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
  const ctx = await b.newContext({ viewport: { width: 640, height: 360 } }), pg = await ctx.newPage(), errs = [];
  pg.on('pageerror', e => errs.push(e.message)); pg.on('console', m => m.type() === 'error' && errs.push(m.text().slice(0, 200)));
  await pg.addInitScript(FAKE, { supported: true });
  await pg.goto('http://localhost:' + PORT + '/?vr=1&zone=kart&seed=0', { timeout: 240000 }); await pg.waitForFunction(() => window.__wf, null, { timeout: 240000 }); await pg.waitForTimeout(800);

  // ---- 1. the session starts while the kart's quick menu is open: that answers it (the controllers cannot use the menu), the race is not stuck
  await pg.evaluate(() => { __wf.start(); });
  await pg.waitForFunction(() => __wf.state === 'race' && __wf.race && __wf.race.menu, null, { timeout: 240000 });      // (?zone=kart opens the run in the kart race, its quick menu open)
  const pre = await pg.evaluate(() => ({ state: __wf.state, menu: !!(__wf.race && __wf.race.menu), kart: !!(__wf.race && __wf.race.kart) }));
  await pg.evaluate(() => document.getElementById('xr-button').click());
  await pg.waitForFunction(() => __wf.xr && __wf.xr.presenting && __xrlog.rafs > 3, null, { timeout: 180000 });
  await pg.evaluate(async () => { const X = __wf.xr; window.nf = async n => { const f = X.frames + n; while (X.frames < f) await new Promise(r => setTimeout(r, 20)); }; await nf(4); });
  const a = await pg.evaluate(() => ({ menu: __wf.race.menu, state: __wf.state, vr: __wf.vr }));
  T('starting a VR session with the kart quick menu open answers it (the camera behind) and the race is not stuck', pre.state === 'race' && pre.menu && pre.kart && a.menu === false && a.state === 'race' && a.vr === true, JSON.stringify({ pre, a }));
  await pg.evaluate(() => { const R = __wf.race; R.intro = 0; R.cd = 0; R.t = 5; R.gateOpen = true; });

  // ---- 2. everything of the XR layer is on the KART scene
  const m = await pg.evaluate(async () => {
    await nf(4); const X = __wf.xr, K = __wf.r.kart3d, root = o => { while (o && o.parent) o = o.parent; return o; };
    return { rigScene: X.rigRace && X.rigRace.parent === K.scene, camInRig: K.camera.parent === X.rigRace, active: X.active === X.rigRace, panel: root(X.hud.panel) === K.scene,
      vig: root(X.comfort.vig) === K.camera || (X.comfort.vig.parent === K.camera && K.camera.parent === X.rigRace), ctrl: X.input.ctrl.filter(Boolean).every(c => c.parent === X.rigRace),
      raceCamFree: !__wf.r.race3d || __wf.r.race3d.camera.parent !== X.rigRace };
  });
  T('the rig, the HUD panel, the comfort vignette and the controllers are on the kart scene and camera (not on the other race scene, which is never drawn for the kart)', m.rigScene && m.camInRig && m.active && m.panel && m.vig && m.ctrl && m.raceCamFree, JSON.stringify(m));

  // ---- 3. the rig follows the track's height: banked laps, the dive, the tunnel
  const rows = [];
  for (const d of [-300, -80, 0, 30, 60, 100, 200, 3000]) {
    const r = await pg.evaluate(async d => { const g = __wf, R = g.race, K = g.r.kart3d; R.p.s = KART.GATE_S + d; R.p.lane = 0; R.p.x = 0; R.hold = false; await nf(3); const w = new THREE.Vector3(); K.camera.getWorldPosition(w); return { d, cam: +w.y.toFixed(2), car: +K.car.position.y.toFixed(2) }; }, d);
    rows.push(r);
  }
  const above = rows.map(r => r.cam - r.car), tunnel = rows.filter(r => r.d >= 100);
  T('the headset camera stays 0.5 to 3.5 m above the kart all the way down into the spiral tunnel, and is underground (below -10 m) once in it', above.every(v => v > 0.5 && v < 3.5) && tunnel.every(r => r.cam < -10), JSON.stringify(rows));

  // ---- 4. the eyes sit cfg.eyeY over the road whatever the player's own height: the rig is lowered by exactly the measured head height (seated compensation)
  const h = await pg.evaluate(async () => { const g = __wf, X = g.xr, K = g.r.kart3d, R = g.race, out = {}; R.p.s = KART.GATE_S + 200; for (const hy of [1.2, 1.9]) { X.head = hy; await nf(1); out[hy] = +(X.rigRace.position.y + X.head - K.car.position.y).toFixed(2); } out.eye = X.cfg.eyeY; return out; });
  T('the rig puts the eyes cfg.eyeY (2.2 m) over the road for a 1.2 m and for a 1.9 m head alike (within 0.2 m)', Math.abs(h[1.2] - h.eye) < 0.2 && Math.abs(h[1.9] - h.eye) < 0.2, JSON.stringify(h));

  // ---- 5. the headset taken off holds the race; when it is back the race goes on after a short countdown
  const w = await pg.evaluate(async () => {
    const g = __wf, R = g.race, X = g.xr; R.cd = 0; R.hold = false; R.p.s = KART.GATE_S - 600; const s0 = R.p.s; X.interrupt(); const held = R.hold; g.raceStep(0.05); g.raceStep(0.05); const s1 = R.p.s;
    await nf(3); return { held, stood: s1 === s0, back: R.hold === false, cd: R.cd };
  });
  T('tracking lost / headset off: the race is held (no step moves it) and it resumes with a countdown when the headset is back', w.held && w.stood && w.back && w.cd > 0, JSON.stringify(w));

  // ---- 6. leaving VR: the camera is taken off the rig, the desktop view draws again, no error
  await pg.evaluate(() => { __wf.race.hold = true; __wf.xr.exit(); }); await pg.waitForFunction(() => !__wf.xr.presenting, null, { timeout: 60000 });
  await pg.waitForTimeout(500);
  const e = await pg.evaluate(() => { const g = __wf, K = g.r.kart3d, X = g.xr; let err = null; try { g.r.draw(g); } catch (x) { err = x.message; } return { camFree: K.camera.parent !== X.rigRace, rigOut: !X.rigRace || !X.rigRace.parent, unheld: g.race.hold === false, err }; });
  T('after leaving VR (even with the race held) the kart camera is off the rig, the rig is out of the scene, the race is not left frozen and the desktop view draws without error', e.camFree && e.rigOut && e.unheld && !e.err && !errs.length, JSON.stringify({ e, errs: errs.slice(0, 2) }));

  await b.close(); srv.close();
  console.log('\n' + res.filter(Boolean).length + '/' + res.length + ' passed');
  process.exit(res.every(Boolean) ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
