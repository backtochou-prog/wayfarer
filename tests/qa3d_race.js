// WAYFARER regression test: THE RACE ZONE (rules src/race.js are tested separately, in plain node, by tests/race_sim.js). Here: the sphere in every zone, the race entered through ?zone=race and through the sphere, the
// countdown, a bot winning and a passive player losing, the immediate exit and the sphere used up for the zone, the rare tokens kept, the scene drawn, the touch buttons in the race, the classic 2D game untouched.
//
// Run:  node tests/qa3d_race.js     (needs playwright-core and a Chromium: CHROMIUM=/path/to/chrome, NODE_PATH or PW_CORE as for the other tests; TEST_URL=https://... tests a deployment)
const http = require('http'), fs = require('fs'), path = require('path');
let chromium; try { ({ chromium } = require('playwright-core')); } catch (e) { ({ chromium } = require(process.env.PW_CORE || 'playwright-core')); }
const ROOT = path.join(__dirname, '..'), PORT = 8131;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const res = []; const T = (n, ok, i = '') => { res.push(ok); console.log((ok ? 'PASS ' : 'FAIL ') + n + (i !== '' ? '  [' + i + ']' : '')); };
(async () => {
  const srv = http.createServer((q, r) => { let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; fs.readFile(path.join(ROOT, p), (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' }); r.end(d); } }); }).listen(PORT);
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/root/.cache/ms-playwright/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const base = process.env.TEST_URL || 'http://localhost:' + PORT + '/';
  const open = async url => { const pg = await (await b.newContext({ viewport: { width: 640, height: 360 } })).newPage(); pg.errs = []; pg.on('pageerror', e => pg.errs.push(e.message)); pg.on('console', m => m.type() === 'error' && !/404/.test(m.text()) && pg.errs.push(m.text())); await pg.goto(url, { timeout: 90000 }); await pg.waitForFunction(() => window.__wf, null, { timeout: 60000 }); await pg.waitForTimeout(500); return pg; };

  // ---- the spheres: one in each zone of a lap, none in the classic game
  const pg = await open(base);
  const G = await pg.evaluate(() => {
    const w = new World(TRACK); w.extras = true; w.extend(150000); const out = { zones: {}, gates: [] };
    for (const it of w.items) if (it.kind === 'raceGate') { const P = w.pieces.find(q => q.type === 'seg' && it.z >= q.z0 && it.z < q.z1); const fam = P ? Portal.fam(P.seg.biome) : '?'; out.zones[fam] = (out.zones[fam] || 0) + 1; out.gates.push([P && P.id, Math.round(it.z)]); }
    const near = w.items.filter(it => it.kind !== 'raceGate' && it.kind !== 'prop' && w.items.some(g => g.kind === 'raceGate' && Math.abs(g.z - it.z) < 200 && g.tag === it.tag)).length;
    const w2 = new World(TRACK); w2.extend(60000); out.plain = w2.items.filter(i => i.kind === 'raceGate').length; out.near = near; out.n = out.gates.length; return out;
  });
  T('a sphere stands in the middle of the road in every zone of the circuit (' + JSON.stringify(G.zones) + ', ' + G.n + ' in all over a few laps), nothing else within 20 m of it, none in a world without the 3D extras (' + G.plain + ')',
    ['neon', 'coast', 'saintgilles', 'utrecht', 'vic'].every(z => G.zones[z] >= 1) && G.near === 0 && G.plain === 0, JSON.stringify(G.gates.slice(0, 9)));

  // ---- the race through ?zone=race: the countdown, the scene, the HUD, no error
  const pz = await open(base + '?zone=race');
  const NB = await pz.evaluate(() => { const g = __wf; g.start(); g.race = null; g.raceNow = false; g.state = 'play'; g.world.extend(150000); const G1 = g.world.items.filter(i => i.kind === 'raceGate').sort((a, b) => a.z - b.z)[0]; g.p.z = G1.z - 60; g.p.x = G1.x; g.p.speed = 300; g.world.extend(g.p.z + 3000); for (let i = 0; i < 90; i++) g.advance(1 / 60); return { state: g.state, taken: G1.taken, passed: g.p.z > G1.z }; });
  T('automated browsers run through the sphere without entering it (the bots of the other tests stay on the road: state ' + NB.state + ', passed ' + NB.passed + ')', NB.state === 'play' && !NB.taken && NB.passed);
  const A = await pz.evaluate(async () => { const g = __wf; g.start(); for (let i = 0; i < 6; i++) g.advance(1 / 60); const out = { state: g.state, cd: g.race && +g.race.cd.toFixed(2), has: !!g.race, items: g.race && g.race.items.length, sup: g.r.supportsRace };
    for (let i = 0; i < 100; i++) g.advance(1 / 60); out.cdAfter = g.race && +g.race.cd.toFixed(2); out.s0 = g.race && g.race.p.s; for (let i = 0; i < 400; i++) { g.advance(1 / 60); g.r.draw(g); } out.s1 = Math.round(g.race.p.s); out.t = +g.race.t.toFixed(1); out.scene = !!(g.r.race3d && g.r.race3d.meshes.length === g.race.items.length); return out; });
  T('?zone=race opens the race at once: state ' + A.state + ', the countdown from ' + A.cd + ' s holds the cars (still at ' + A.s0 + ' m after 1.7 s), then they run (' + A.s1 + ' m after 4 s of race, ' + A.t + ' s), ' + A.items + ' things on the track, the scene is drawn (' + A.scene + '), no error',
    A.state === 'race' && A.has && A.cd > 2 && A.s0 === 0 && A.s1 > 40 && A.scene && A.items > 40 && pz.errs.length === 0, JSON.stringify({ errs: pz.errs.slice(0, 2) }));

  // ---- a bot that plays well wins; the exit is at once, back on the road, the sphere used up; the rare tokens are kept
  const W = await pz.evaluate(() => { const g = __wf; localStorage.removeItem('wf.rare'); g.rare = 0; g.start(); g.advance(1 / 60); const R0 = g.race, R = g.race, coins0 = g.coins; let n = 0, lane = 0;
    const best = () => { const p = R.p, sc = [0, 0, 0]; for (const it of R.items) { if (it.taken || it.hit) continue; const d = it.s - p.s; if (d < -1 || d > 55) continue; const L = it.lane + 1, k = 1 - d / 77; if (it.type === 'spiral') sc[L] += RACE.SPIRAL[it.color].add * 2.2 * k; else if (it.type === 'ring') sc[L] -= 60 * k; else if (it.type === 'rare') sc[L] += 12 * k; else if (it.type === 'ramp') sc[L] += 25 * k; else if (it.type === 'droid') { const ramp = R.items.some(q => q.type === 'ramp' && !q.taken && q.lane === it.lane && q.s < it.s && q.s > it.s - 40); sc[L] -= (ramp ? 4 : 55) * k; } }
      let b = lane + 1, bs = -1e9; for (let L = 0; L < 3; L++) { const v = sc[L] - Math.abs(L - (lane + 1)) * 2.5; if (v > bs) { bs = v; b = L; } } return b - 1; };
    while (g.state === 'race' && n++ < 20000) { if (g.race.cd <= 0 && !g.race.done) { const want = best(); g.laneQ = Math.sign(want - g.race.p.lane); g.advance(1 / 60); lane = g.race.p.lane; g.advance(1 / 60); } else g.advance(1 / 60); }
    return { res: R0.result, t: +R0.t.toFixed(1), s: Math.round(R0.p.s), state: g.state, race: !!g.race, coins: g.coins - coins0, rare: g.rare, saved: localStorage.getItem('wf.rare'), got: R0.p.rare, bot: Math.round(R0.bot.s) }; });
  T('a good player wins (' + W.res + ' in ' + W.t + ' s, the robot at ' + W.bot + ' m), is paid a bonus (+' + W.coins + ' coins), the rare tokens it took are kept on the device (' + W.got + ' taken, ' + W.rare + ' counted, saved ' + W.saved + '), and goes back on the road (' + W.state + ')',
    W.res === 'win' && W.coins >= 30 && W.state === 'play' && !W.race && W.rare === W.got && String(W.rare) === W.saved, JSON.stringify(W));

  // ---- a passive player loses: the robot crosses first, the race ends at once, back on the road
  const L = await pz.evaluate(() => { const g = __wf; g.start(); g.advance(1 / 60); const R = g.race, coins0 = g.coins; let n = 0; while (g.state === 'race' && n++ < 20000) g.advance(1 / 60); return { res: R.result, t: +R.t.toFixed(1), s: Math.round(R.p.s), state: g.state, coins: g.coins - coins0, bot: R.bot.finishT && +R.bot.finishT.toFixed(1) }; });
  T('a passive player loses (' + L.res + ': the robot crossed at ' + L.bot + ' s while the car was at ' + L.s + ' m): thrown back on the road at once, no bonus (' + L.coins + ')', L.res === 'lose' && L.state === 'play' && L.coins === 0 && L.s < 1800, JSON.stringify(L));

  // ---- the sphere: passing into it opens the race, once; the next zone's sphere is a new chance
  const S = await pz.evaluate(() => { const g = __wf; g.raceTest = true; g.start(); for (let i = 0; i < 4; i++) g.advance(1 / 60); g.state = 'play'; g.race = null; g.raceNow = false; g.world.extend(150000);
    const gates = g.world.items.filter(i => i.kind === 'raceGate').sort((a, b) => a.z - b.z), G1 = gates[0], G2 = gates[1];
    const put = G => { g.p.z = G.z - 60; g.p.x = G.x; g.p.speed = 300; g.p.jy = 0; g.world.extend(g.p.z + 3000); };
    put(G1); g.p.z = G1.z - 90; g.world.extend(g.p.z + 3000); let seen = 0, derr = null; try { for (let i = 0; i < 8; i++) { g.advance(1 / 60); g.r.draw(g); seen = Math.max(seen, g.r.items.used.raceGate || 0); } } catch (e) { derr = e.message; } put(G1); let n = 0; while (g.state === 'play' && n++ < 600) g.advance(1 / 60); const o = { seen, derr, entered: g.state === 'race', taken: G1.taken, next: !!G2 && !G2.taken }; if (g.state === 'race') { g.race.p.s = 1e5; g.race.bot.s = 2e5; g.advance(1 / 60); n = 0; while (g.state === 'race' && n++ < 2000) g.advance(1 / 60); }
    o.back = g.state; g.p.z = G1.z - 40; g.p.x = G1.x; g.world.extend(g.p.z + 3000); n = 0; while (n++ < 120 && g.state === 'play') g.advance(1 / 60); o.again = g.state === 'race';
    g.state = 'play'; put(G2); n = 0; while (g.state === 'play' && n++ < 600) g.advance(1 / 60); o.second = g.state === 'race'; return o; });
  T('the sphere is drawn on the road before it (' + S.seen + ' in view, ' + (S.derr || 'no error') + '), opens the race when the car runs into it (' + S.entered + '), is used up (' + S.taken + ') so a second pass does not reopen it (' + (S.again ? 'reopened' : 'closed') + '), and the sphere of the next zone is still there (' + S.next + ') and works (' + S.second + ')',
    S.seen >= 1 && !S.derr && S.entered && S.taken && !S.again && S.next && S.second, JSON.stringify(S));

  // ---- touch: the same four buttons are drawn and steer in the race
  const pt = await (await b.newContext({ viewport: { width: 640, height: 360 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true })).newPage(); pt.errs = []; pt.on('pageerror', e => pt.errs.push(e.message));
  await pt.goto(base + '?zone=race', { timeout: 90000 }); await pt.waitForFunction(() => window.__wf, null, { timeout: 60000 }); await pt.waitForTimeout(600);
  const TT = await pt.evaluate(() => { const g = __wf; g.touch = true; g.start(); for (let i = 0; i < 260; i++) g.advance(1 / 60); const sc = document.getElementById('screen').getBoundingClientRect(); return { x: sc.left + sc.width * (60 / 320), y: sc.top + sc.height * (158 / 180), state: g.state, lane: g.race.p.lane, drawn: (() => { g.r.draw(g); return g.r.ui.touchLayer() ? g.r.ui.touchLayer().dirty : null; })() }; });
  await pt.touchscreen.tap(TT.x + 20, TT.y); await pt.waitForTimeout(250);
  const T2 = await pt.evaluate(() => { const g = __wf; for (let i = 0; i < 30; i++) g.advance(1 / 60); return { lane: g.race.p.lane, state: g.state }; });
  T('on a phone the race shows the touch buttons (layer drawn ' + TT.drawn + ') and a tap on the right button moves the car from lane ' + TT.lane + ' to ' + T2.lane, TT.state === 'race' && TT.drawn === true && T2.lane === 1 && pt.errs.length === 0, JSON.stringify({ TT, T2, errs: pt.errs.slice(0, 2) }));

  // ---- the classic 2D game: no sphere, no race, no error
  const p2 = await open(base + '2d.html');
  const D2 = await p2.evaluate(() => { const g = __wf; g.start(); g.world.extend(150000); let draws = 0, err = null; g.state = 'play'; g.die = () => {}; try { for (let i = 0; i < 300; i++) { g.p.speed = 340; g.advance(1 / 60); g.r.draw(g); draws++; } } catch (e) { err = e.message; } return { gates: g.world.items.filter(i => i.kind === 'raceGate').length, state: g.state, draws, err, race: typeof Race }; });
  T('the classic 2D game has no sphere and no race, and still runs (' + D2.draws + ' frames, state ' + D2.state + ')', D2.gates === 0 && D2.state === 'play' && !D2.err && p2.errs.length === 0, JSON.stringify({ ...D2, errs: p2.errs.slice(0, 1) }));
  console.log('\n' + res.filter(Boolean).length + '/' + res.length + ' passed'); await b.close(); srv.close(); process.exit(res.every(Boolean) ? 0 : 1);
})().catch(e => { console.log('TEST ERROR', e.message); process.exit(1); });
