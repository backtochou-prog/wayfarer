// WAYFARER regression test: PERFORMANCE on budget phones. The scene walk skips the hidden pooled groups, a 120 Hz screen is capped at about 60 frames a second, the touch layer is at most 2 device pixels per CSS
// pixel and is redrawn only when something on it changes, and the adaptive resolution starts at 1.5, climbs to 2.25 while frames are fast, steps down when they are slow and does not flicker.
//
// Run:  node tests/qa3d_perf.js     (needs playwright-core and a Chromium: CHROMIUM=/path/to/chrome, NODE_PATH or PW_CORE as for the other tests; TEST_URL=https://... tests a deployment)
const http = require('http'), fs = require('fs'), path = require('path');
let chromium; try { ({ chromium } = require('playwright-core')); } catch (e) { ({ chromium } = require(process.env.PW_CORE || 'playwright-core')); }
const ROOT = path.join(__dirname, '..'), PORT = 8133;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.mp3': 'audio/mpeg' };
const res = []; const T = (n, ok, i = '') => { res.push(ok); console.log((ok ? 'PASS ' : 'FAIL ') + n + (i !== '' ? '  [' + i + ']' : '')); };
(async () => {
  const srv = http.createServer((q, r) => { let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; fs.readFile(path.join(ROOT, p), (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' }); r.end(d); } }); }).listen(PORT);
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/root/.cache/ms-playwright/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const base = process.env.TEST_URL || 'http://localhost:' + PORT + '/';
  // a phone page whose animation frames are driven by hand (window.__raf is the game loop), so the frame rate and the clock are the test's
  const phone = async q => { const ctx = await b.newContext({ viewport: { width: 873, height: 393 }, deviceScaleFactor: 2.75, hasTouch: true, isMobile: true }); await ctx.addInitScript(() => { window.requestAnimationFrame = cb => { window.__raf = cb; return 1; }; });
    const pg = await ctx.newPage(); pg.errs = []; pg.on('pageerror', e => pg.errs.push(e.message)); await pg.goto(base + q, { timeout: 240000, waitUntil: 'domcontentloaded' }); await pg.waitForFunction(() => window.__wf, null, { timeout: 240000 }); await pg.waitForTimeout(1000); return pg; };

  // ---- 1. the scene walk skips hidden groups
  const pg = await phone('?zone=neon&adapt=1');
  const W = await pg.evaluate(() => { const sc = __wf.r.scene, mk = vis => { const g = new THREE.Group(); g.visible = vis; g.position.set(5, 6, 7); sc.add(g); return g; }, a = mk(true), h = mk(false);
    const z = o => +o.matrixWorld.elements[14].toFixed(1); sc.updateMatrixWorld(true); const out = { visible: z(a), hidden: z(h), n: sc.children.length };
    h.visible = true; sc.updateMatrixWorld(true); out.shownAgain = z(h);                                         // a group shown again gets its matrix at once
    Renderer3D.cullHidden = false; const h2 = mk(false); sc.updateMatrixWorld(true); out.walkAll = z(h2); Renderer3D.cullHidden = true; sc.remove(a, h, h2); return out; });
  T('the scene walk skips the hidden groups (a visible one gets its matrix: z ' + W.visible + '; a hidden one does not: ' + W.hidden + '; shown again at once: ' + W.shownAgain + '; with cullHidden = false it walks all: ' + W.walkAll + ') among ' + W.n + ' root groups',
    W.visible === 7 && W.hidden === 0 && W.shownAgain === 7 && W.walkAll === 7 && W.n > 5000, JSON.stringify(W));

  // ---- 2. the touch layer: at most 2 device pixels per CSS pixel, redrawn only on a change
  const TL = await pg.evaluate(async () => { const g = __wf; g.touch = true; g.die = () => {}; g.start(); g.fadeIn = 0; g.fitTouch(); const t = document.getElementById('touch'), r = document.getElementById('screen').getBoundingClientRect(), ui = g.r.ui;
    ui.drawTouch(g); const L = ui.touchLayer(); for (let i = 0; i < 100 && !(L && L.img.complete && L.img.naturalWidth); i++) await new Promise(r => setTimeout(r, 50));   /* (the ring picture must have loaded: until then the pixel buttons are drawn) */
    for (let i = 0; i < 3; i++) { g.time += 1 / 60; ui.drawTouch(g); } const d0 = L.draws || 0; for (let i = 0; i < 60; i++) { g.time += 1 / 60; ui.drawTouch(g); } const still = (L.draws || 0) - d0;
    g.held = { 1: 'left' }; g.syncTouch(); const d1 = L.draws || 0; for (let i = 0; i < 20; i++) { g.time += 1 / 60; ui.drawTouch(g); } const pressed = (L.draws || 0) - d1; g.held = {}; g.syncTouch();
    return { density: +(t.width / (r.width + 2 * r.width * 15 / 320)).toFixed(2), dpr: devicePixelRatio, w: t.width, still, pressed }; });
  T('the touch layer is at most 2 device pixels per CSS pixel (' + TL.density + ' on a ' + TL.dpr + ' phone: ' + TL.w + ' px wide), is not redrawn at all while nothing changes (' + TL.still + ' redraws in 60 still frames) and is while a button eases (' + TL.pressed + ' in 20)',
    TL.density <= 2.02 && TL.still === 0 && TL.pressed >= 3, JSON.stringify(TL));

  // ---- 3. the adaptive resolution (a fake clock: the test chooses how long every frame takes)
  const AD = await pg.evaluate(() => { const r = __wf.r; let now = 5000; performance.now = () => now; r.renderer.render = () => {}; const pr = () => +r.renderer.getPixelRatio().toFixed(2), run = (n, ms) => { for (let i = 0; i < n; i++) { now += ms; r.adapt(); } };
    const o = { start: pr(), ceil: Renderer3D.PR_CEIL }; run(2, 16); o.afterInit = pr();
    run(150, 16); o.t2s = pr(); run(1000, 16); o.fast16s = pr(); o.steps0 = r.adaptSteps;                      // 2.4 s then 18 s of 16 ms frames: it climbs, to the ceiling and no higher
    run(120, 45); o.slow = pr(); o.steps1 = r.adaptSteps;                                                    // 5.4 s of 45 ms frames: it steps down
    run(700, 16); o.recover = pr();                                                                          // 11 s of fast frames: it does NOT climb back over the level that was too slow (25 s)
    run(2400, 16); o.later = pr();                                                                           // 38 s more: it may try the higher level again
    run(40, 400); o.hitch = pr();                                                                            // frames over 250 ms (a pause, a hitch) are not measured
    return o; });
  T('the adaptive resolution starts at ' + AD.start + ' and climbs to ' + AD.fast16s + ' (ceiling ' + AD.ceil + ') while frames are fast, steps down to ' + AD.slow + ' when they are slow (' + AD.steps1 + ' steps), does not climb straight back (' + AD.recover + '), tries again later (' + AD.later + '), and ignores hitches (' + AD.hitch + ')',
    AD.start === 1.5 && AD.t2s > 1.5 && AD.fast16s === 2.25 && AD.steps0 === 0 && AD.slow < 2.25 && AD.steps1 >= 1 && AD.recover <= AD.slow + 0.31 && AD.later > AD.recover && AD.hitch === AD.later, JSON.stringify(AD));
  T('no error on the phone page', pg.errs.length === 0, JSON.stringify(pg.errs.slice(0, 2)));
  await pg.context().close();

  // ---- 4. a 120 Hz screen draws at most about 60 frames a second, a 60 Hz one draws every frame
  const frames = async (q, hz) => { const p = await phone(q); const out = await p.evaluate(hz => { const g = __wf; let n = 0; const adv = g.advance.bind(g); g.advance = dt => { n++; return adv(dt); }; g.draw = () => {}; let t = 1000; const step = 1000 / hz;
      for (let i = 0; i < 400; i++) { t += step; window.__raf(t); } return { calls: n, cap: g.frameCap() }; }, hz); await p.context().close(); return out; };
  const F120 = await frames('?zone=neon', 120), F60 = await frames('?zone=neon', 60), FX = await frames('?zone=neon&fps=0', 120);
  T('a 120 Hz screen draws about 60 frames a second (' + F120.calls + ' of 400 refreshes), a 60 Hz screen draws all of them (' + F60.calls + '), and ?fps=0 turns the cap off (' + FX.calls + ')',
    F120.calls > 190 && F120.calls < 230 && F60.calls >= 390 && FX.calls >= 390 && F120.cap > 0 && F60.cap === 0, JSON.stringify({ F120, F60, FX }));
  console.log('\n' + res.filter(Boolean).length + '/' + res.length + ' passed'); await b.close(); srv.close(); process.exit(res.every(Boolean) ? 0 : 1);
})().catch(e => { console.log('TEST ERROR', e.message); process.exit(1); });
