// WAYFARER regression test: the kart circuit's honour lap (src/race.js startHonour / honourStep, src/game.js raceStep, src3d/kart3d.js lifts). The user's scenario: the first kart to reach the ship hall wins;
// it brakes to a stop at the glass lift, slides across to it, the lift opens, takes the kart 23 m down to the hall's own floor, and the player may drive about there (a reward) until they leave.
// What it checks: the finish is the hall (KART.FIN), a win starts the honour lap, the phases run in order and the kart is at the lift's door at the hall's middle, the lift goes down by 23 m, free driving
// moves the kart and keeps it inside the hall, the camera follows it, leaving ends the race, and a robot arriving first still loses (no honour lap).
//
// Run:  node tests/qa3d_honour.js     (needs playwright-core and a Chromium: CHROMIUM=/path/to/chrome, NODE_PATH or PW_CORE as for the other tests)
const http = require('http'), fs = require('fs'), path = require('path');
let chromium; try { ({ chromium } = require('playwright-core')); } catch (e) { ({ chromium } = require(process.env.PW_CORE || 'playwright-core')); }
const ROOT = path.join(__dirname, '..'), PORT = 8137;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.mp3': 'audio/mpeg' };
const res = []; const T = (n, ok, i = '') => { res.push(ok); console.log((ok ? 'PASS ' : 'FAIL ') + n + (i !== '' ? '  [' + i + ']' : '')); };
(async () => {
  const srv = http.createServer((q, r) => { let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; fs.readFile(path.join(ROOT, p), (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' }); r.end(d); } }); }).listen(PORT);
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM || require('./_chromium')(), args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const pg = await (await b.newContext({ viewport: { width: 640, height: 360 } })).newPage(), errs = [];
  pg.on('pageerror', e => errs.push(e.message)); pg.on('console', m => m.type() === 'error' && errs.push(m.text().slice(0, 200)));
  await pg.goto('http://localhost:' + PORT + '/?zone=kart&seed=0', { timeout: 240000 }); await pg.waitForFunction(() => window.__wf, null, { timeout: 240000 });
  const setup = (lead) => pg.evaluate(lead => { window.requestAnimationFrame = () => 0; const g = __wf; if (g.state !== 'race') { g.kartNow = true; g.start(); for (let i = 0; i < 20; i++) g.advance(1 / 60); g.kartChoose('chase'); } KART.HONOUR = true;      /* (switched off in the game for now: the user kept the race's rules; the test turns it on) */ const R = g.race; R.len = KART.FIN; R.menu = false; R.cd = 0; R.intro = 0; R.t = 60; R.gateOpen = true; R.done = false; R.result = null; R.honour = null;
    R.p.s = KART.FIN - 160; R.p.lane = 0; R.p.x = 0; R.p.speed = 48; R.bots.forEach((b, i) => { b.s = R.p.s + (lead ? 40 + i * 5 : -80 - i * 30); b.finishT = null; }); R.items = R.items.filter(i => i.s < R.p.s - 50 || i.s > KART.FIN + 50); g.r.draw(g); return { fin: KART.FIN, hall: KART.HALL + KART.LAP, len: R.len }; }, lead);

  // ---- 1. the finish is the hall, a win starts the honour lap and the phases run in order
  const s0 = await setup(false); const log = await pg.evaluate(() => { const g = __wf, R = g.race, seen = [], at = {}; for (let i = 0; i < 900 && !(R.honour && R.honour.ph === 'free'); i++) { g.raceStep(1 / 30); const ph = R.honour && R.honour.ph; if (ph && seen[seen.length - 1] !== ph) { seen.push(ph); at[ph] = { s: Math.round(R.p.s), speed: +R.p.speed.toFixed(1), x: +(R.p.x + R.off(R.p.s)).toFixed(1), dy: R.honour.dy }; } } return { seen, at, res: R.result, done: R.done, len: R.len, s: R.p.s }; });
  T('the race ends at the ship hall (KART.FIN ' + s0.fin + ', 56 m before the hall\'s entrance in the 5th lap) and the winner gets the honour lap: brake > slide > open > down > free', s0.len === s0.fin && log.res === 'win' && log.seen.join('>') === 'brake>slide>open>down>free', JSON.stringify({ log, len: s0.len }));
  T('the winner stops exactly at the lift (the hall\'s middle, ' + Math.round(s0.hall) + ' m), slides across to the lift (x -7) and the lift takes the kart 23 m down', Math.abs(log.at.slide.s - s0.hall) < 1.5 && log.at.slide.speed === 0 && Math.abs(log.at.down.x + 7) < 0.2 && log.at.free.dy === -23, JSON.stringify(log.at));
  // ---- 2. the lift A cage and the kart go down together; the camera follows
  const cam = await pg.evaluate(() => { const g = __wf, R = g.race, K = g.r.kart3d; for (let k = 0; k < 8; k++) g.r.draw(g); const w = new THREE.Vector3(); K.camera.getWorldPosition(w); const h = new THREE.Vector3(); K.hall.localToWorld(h.set(R.honour.lx, 0, R.honour.lz)); return { camY: +w.y.toFixed(1), floorY: +h.y.toFixed(1), carY: +K.car.position.y.toFixed(1), dist: +Math.hypot(w.x - K.car.position.x, w.z - K.car.position.z).toFixed(1), cageVisible: K.lifts[0].cage.visible }; });
  T('free driving: the kart stands on the hall\'s floor (37 m under the track), the camera is 7 m behind it and 3.6 m up, the lift\'s cage has opened and gone', Math.abs(cam.carY - cam.floorY) < 0.2 && cam.floorY < -36 && cam.camY > cam.floorY + 2 && cam.camY < cam.floorY + 5 && cam.dist > 5 && cam.dist < 9 && !cam.cageVisible, JSON.stringify(cam));
  // ---- 3. driving: the kart goes, turns, stays inside the hall, and leaving ends the race
  const dr = await pg.evaluate(() => { const g = __wf, R = g.race, H = R.honour, out = {}; g.keys.up = true; for (let i = 0; i < 90; i++) g.raceStep(1 / 30); out.z = +H.lz.toFixed(1); out.v = +H.v.toFixed(1); g.keys.right = true; for (let i = 0; i < 60; i++) g.raceStep(1 / 30); g.keys.right = false; out.h = +H.h.toFixed(2); out.x = +H.lx.toFixed(1);
    for (let i = 0; i < 900; i++) g.raceStep(1 / 30); out.max = [Math.abs(H.lx), Math.abs(H.lz)].map(v => +v.toFixed(1)); g.keys.up = false; g.honourExit = true; g.raceStep(1 / 30); out.state = g.state; out.race = g.race === null; return out; });
  T('driving: accelerating moves the kart along the hall (' + dr.z + ' m, ' + dr.v + ' m/s), steering turns it (heading ' + dr.h + ' rad), it never leaves the hall\'s floor (|x| <= 12, |z| <= 48: ' + dr.max + ') and Enter leaves: the race ends, back on the road', dr.z < -20 && dr.v > 5 && dr.h > 0.3 && dr.max[0] <= 12.01 && dr.max[1] <= 48.01 && dr.state === 'play' && dr.race, JSON.stringify(dr));
  // ---- 4. a robot that gets to the hall first still wins: no honour lap
  await setup(true);      /* (the race was left: a new kart race starts, a robot kart ahead of the player) */
  const lo = await pg.evaluate(() => { const g = __wf, R = g.race; for (let i = 0; i < 700 && !R.done; i++) g.raceStep(1 / 30); return { done: R.done, res: R.result, honour: !!R.honour }; });
  T('with the honour lap on, a robot kart that reaches the hall first still wins: the player loses at once, with no honour lap', lo.done && lo.res === 'lose' && !lo.honour, JSON.stringify(lo));
  T('no error on the page', !errs.length, errs.slice(0, 2).join(' | '));
  await b.close(); srv.close();
  console.log('\n' + res.filter(Boolean).length + '/' + res.length + ' passed');
  process.exit(res.every(Boolean) ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
