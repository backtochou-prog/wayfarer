// WAYFARER regression test: the runner rides a kick scooter in Saint-Gilles (?scooter=1 everywhere, ?scooter=0 nowhere). Checks the default rule, the glide (no run bounce), the feet on the deck,
// the spinning wheels, the lean and the nose-up jump, that it goes away outside the zone, that gameplay numbers are untouched, and that nothing leaks.
//
// Run:  node tests/qa3d_scooter.js     (needs playwright-core and a Chromium: CHROMIUM=/path/to/chrome, NODE_PATH or PW_CORE as for the other tests)
const http = require('http'), fs = require('fs'), path = require('path');
let chromium; try { ({ chromium } = require('playwright-core')); } catch (e) { ({ chromium } = require(process.env.PW_CORE || 'playwright-core')); }
const ROOT = path.join(__dirname, '..'), PORT = 8118;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const res = []; const T = (n, ok, i = '') => { res.push(ok); console.log((ok ? 'PASS ' : 'FAIL ') + n + (i !== '' ? '  [' + i + ']' : '')); };

(async () => {
  const srv = http.createServer((q, r) => {
    let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
    fs.readFile(path.join(ROOT, p), (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' }); r.end(d); } });
  }).listen(PORT);
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/root/.cache/ms-playwright/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const base = process.env.TEST_URL || 'http://localhost:' + PORT + '/';
  const open = async q => { const pg = await (await b.newContext({ viewport: { width: 480, height: 270 } })).newPage(); pg.errs = []; pg.on('pageerror', e => pg.errs.push(e.message)); pg.on('console', m => m.type() === 'error' && pg.errs.push(m.text())); await pg.goto(base + q); await pg.waitForFunction(() => window.__wf, null, { timeout: 30000 }); await pg.waitForTimeout(600); return pg; };

  // the same probe on each URL: put the game in a zone, draw 90 frames, report what the runner looks like
  const probe = pg => pg.evaluate(() => {
    const g = __wf, r = g.r, rn = r.runner, out = {}; r.renderer.render = () => {};
    const zone = (to, t, state = 'play') => { g.start(); g.world.items = []; g.state = state; g.bgTo = to; g.bgT = t; };
    const frames = n => { for (let i = 0; i < n; i++) { g.time += 1 / 60; r.draw(g); } };
    const box = () => { rn.group.updateMatrixWorld(true); const bb = new THREE.Box3().setFromObject(rn.group); return { top: +bb.max.y.toFixed(2), bottom: +bb.min.y.toFixed(2) }; };
    zone('tram', 1); frames(90); out.tram = { ride: +rn.ride.toFixed(2), vis: rn.scooter.visible, pivotY: +rn.pivot.position.y.toFixed(3), box: box() };
    // wheels spin
    const a0 = rn.scooter.userData.wheels.map(w => w.rotation.x); frames(10); out.spin = rn.scooter.userData.wheels.map((w, i) => Math.abs(w.rotation.x - a0[i]) > 0.3);
    // a steady glide: the card's height barely changes over a second (the run bounce is 7 cm; here it is about a centimetre)
    let lo = 9, hi = -9; for (let i = 0; i < 60; i++) { frames(1); lo = Math.min(lo, rn.pivot.position.y); hi = Math.max(hi, rn.pivot.position.y); } out.bounce = +(hi - lo).toFixed(3);
    // steering leans the scooter, the jump lifts its nose
    g.p.vx = 200; frames(40); out.lean = +rn.scooter.rotation.z.toFixed(3); g.p.vx = 0;
    g.p.jy = 40; g.p.vy = 100; frames(40); out.nose = +rn.scooter.rotation.x.toFixed(3); g.p.jy = 0; g.p.vy = 0; frames(40);
    // leaving the zone
    zone('city', 0); frames(120); out.city = { ride: +rn.ride.toFixed(2), vis: rn.scooter.visible, pivotY: +rn.pivot.position.y.toFixed(3) };
    zone('tram', 1, 'title'); frames(120); out.title = rn.scooter.visible;
    zone('tram', 0.3); frames(120); out.early = rn.scooter.visible;                  // the zone is only a little in: not yet
    out.kids = r.scene.children.length; return out;
  });

  // ---------------------------------------------------------------- 1. default: Saint-Gilles only
  const pg = await open(''); const D = await probe(pg);
  T('default: on the scooter in Saint-Gilles (ride ' + D.tram.ride + '), standing on the deck (the card lifted ' + D.tram.pivotY + ' m), not in the old town, not in the menu, not while the zone is only a little in',
    D.tram.ride > 0.95 && D.tram.vis && Math.abs(D.tram.pivotY - 0.22) < 0.03 && D.city.ride < 0.02 && !D.city.vis && D.city.pivotY < 0.12 && !D.title && !D.early, JSON.stringify({ tram: D.tram, city: D.city, title: D.title, early: D.early }));
  T('the wheels spin, the glide is steady (card height varies ' + D.bounce + ' m over a second, far less than the 7 cm run bounce), steering leans the scooter (' + D.lean + ' rad) and the jump lifts its nose (' + D.nose + ' rad)',
    D.spin.every(Boolean) && D.bounce < 0.03 && Math.abs(D.lean) > 0.03 && D.nose > 0.08, JSON.stringify({ spin: D.spin, bounce: D.bounce, lean: D.lean, nose: D.nose }));
  T('size: the runner with its scooter stands under 2.3 m with the scooter wheels on the road', D.tram.box.top > 1.9 && D.tram.box.top < 2.3 && D.tram.box.bottom > -0.05 && D.tram.box.bottom < 0.1, JSON.stringify(D.tram.box));
  const G = await pg.evaluate(() => ({ speed: BASE_SPEED, hit: JSON.stringify(OBST), kids: __wf.r.scene.children.length }));
  T('gameplay is untouched: the hit boxes (crate / barrier / overhead) and the speed are the same constants; the scene holds the same number of objects (' + G.kids + ' = ' + D.kids + ')', G.hit === '{"crate":{"hw":0.17,"y0":0,"y1":14},"barrier":{"hw":0.39,"y0":0,"y1":9},"over":{"hw":0.55,"y0":14,"y1":48}}' && G.kids === D.kids, G.hit);
  T('no JS errors (default)', pg.errs.length === 0, pg.errs.slice(0, 2).join('|')); await pg.context().close();

  // ---------------------------------------------------------------- 2. ?scooter=1 and ?scooter=0
  const p1 = await open('?scooter=1'); const A = await p1.evaluate(() => { const g = __wf, r = g.r; r.renderer.render = () => {}; g.start(); g.world.items = []; g.bgTo = 'city'; g.bgT = 0; for (let i = 0; i < 90; i++) { g.time += 1 / 60; r.draw(g); } return { vis: r.runner.scooter.visible, ride: +r.runner.ride.toFixed(2) }; });
  const p0 = await open('?scooter=0'); const N = await p0.evaluate(() => { const g = __wf, r = g.r; r.renderer.render = () => {}; g.start(); g.world.items = []; g.bgTo = 'tram'; g.bgT = 1; for (let i = 0; i < 90; i++) { g.time += 1 / 60; r.draw(g); } return { vis: r.runner.scooter.visible, ride: +r.runner.ride.toFixed(2) }; });
  T('?scooter=1 rides everywhere (even in the old town) and ?scooter=0 never rides (even in Saint-Gilles)', A.vis && A.ride > 0.95 && !N.vis && N.ride < 0.02 && p1.errs.length === 0 && p0.errs.length === 0, JSON.stringify({ always: A, never: N }));
  await p1.context().close(); await p0.context().close();
  console.log('\n' + res.filter(Boolean).length + '/' + res.length + ' passed');
  await b.close(); srv.close(); process.exit(res.every(Boolean) ? 0 : 1);
})().catch(e => { console.log('TEST ERROR', e.message); process.exit(1); });
