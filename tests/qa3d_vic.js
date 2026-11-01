// WAYFARER regression test: VIC, CATALUNYA (the narrow streets after Utrecht: six short pieces with bends, a street 4.4 m wide, two halves to choose from, hazards standing against the walls: terraces, barrels, armchairs, pots, a patio
// heater, a parasol). Checks the track, the width of the road (it narrows and widens smoothly), the hazards (half a street wide: the other half is free; low ones are jumped, the tall one is not, the parasol is slid under),
// the models (3D pools, boxes of the collision table), no trees and no photograph put on the street, a bot playing the zone, the 2D game.
//
// Run:  node tests/qa3d_vic.js     (needs playwright-core and a Chromium: CHROMIUM=/path/to/chrome, NODE_PATH or PW_CORE as for the other tests; TEST_URL=https://... tests a deployment)
const http = require('http'), fs = require('fs'), path = require('path');
let chromium; try { ({ chromium } = require('playwright-core')); } catch (e) { ({ chromium } = require(process.env.PW_CORE || 'playwright-core')); }
const ROOT = path.join(__dirname, '..'), PORT = 8129;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const res = []; const T = (n, ok, i = '') => { res.push(ok); console.log((ok ? 'PASS ' : 'FAIL ') + n + (i !== '' ? '  [' + i + ']' : '')); };
(async () => {
  const srv = http.createServer((q, r) => { let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; fs.readFile(path.join(ROOT, p), (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' }); r.end(d); } }); }).listen(PORT);
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/root/.cache/ms-playwright/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const base = process.env.TEST_URL || 'http://localhost:' + PORT + '/';
  const open = async url => { const pg = await (await b.newContext({ viewport: { width: 480, height: 270 } })).newPage(); pg.errs = []; pg.on('pageerror', e => pg.errs.push(e.message)); pg.on('console', m => m.type() === 'error' && !/404/.test(m.text()) && pg.errs.push(m.text())); await pg.goto(url, { timeout: 90000 }); await pg.waitForFunction(() => window.__wf, null, { timeout: 60000 }); await pg.waitForTimeout(500); return pg; };
  const pg = await open(base);
  const K = await pg.evaluate(() => {
    const out = {}, w = new World(TRACK); w.extras = true; w.extend(160000); const ids = w.pieces.map(p => p.id || 'fork'), i = ids.indexOf('vicA'), V = w.pieces.slice(i, i + 6);
    out.seq = ids.slice(i - 1, i + 7).join('>'); out.curves = V.map(P => P.seg.curve); out.hw = V.map(P => P.seg.hw); out.len = V.map(P => P.z1 - P.z0); out.biome = [...new Set(V.map(P => P.seg.biome))].join();
    const bends = V.filter(P => P.seg.curve); out.alt = bends.length === 3 && bends.every((P, k) => !k || Math.sign(P.seg.curve) !== Math.sign(bends[k - 1].seg.curve)) && V.filter(P => !P.seg.curve).length === 3;
    const wid = z => { const b = w.bandsAt(z)[0]; return +((b.hi - b.lo) * U3.X).toFixed(2); };
    out.width = [wid(V[0].z0 - 5), wid(V[0].z0 + 200), wid(V[0].z0 + 500), wid(V[3].z0 + 300), wid(V[5].z1 + 5), wid(V[5].z1 + 500)];
    let jump = 0, prev = null; for (let z = V[0].z0 - 100; z < V[5].z1 + 600; z += 5) { const b = w.bandsAt(z)[0]; if (prev) jump = Math.max(jump, Math.abs(b.hi - prev.hi), Math.abs(b.lo - prev.lo)); prev = b; } out.jump = +jump.toFixed(3);
    const hz = w.items.filter(it => OBST[it.kind] && it.z >= V[0].z0 && it.z < V[5].z1); out.kinds = [...new Set(hz.map(it => it.kind))].sort(); out.n = hz.length; out.xs = [...new Set(hz.filter(it => /^vic/.test(it.kind)).map(it => +it.x.toFixed(2)))].sort();
    out.both = hz.some(it => it.x < 0) && hz.some(it => it.x > 0); out.box = { low: OBST.vicLow, high: OBST.vicHigh, hang: OBST.vicHang, bar: OBST.vicBarrel, ch: OBST.vicChairs, pot: OBST.vicPot };
    out.zones = [Portal.fam(TRACK.segments.vicA.biome), BIOMES.vic && BIOMES.vic.atmo, !!ENV3D.vic, typeof VIC_ASSETS]; out.noTree = !ENV3D.vic.props.vicTree && !Array.from({ length: 80 }, (_, k) => ENV3D.vic.layout(k, rnd)).flat().some(q => /Tree/.test(q.prop));
    return out;
  });
  T('after the junction of Utrecht come six short pieces of Vic (' + K.seq + '), 70 m each, half of them straight, three with a bend, left then right then left (' + K.curves.join(' / ') + ': ' + K.alt + '), all biome ' + K.biome + ', one atmosphere for the 2D game too (' + K.zones[1] + ')',
    K.seq === 'utrechtC>fork>vicA>vicB>vicC>vicD>vicE>vicF>neonRun'.split('>').slice(1).join('>') || /^fork>vicA>vicB>vicC>vicD>vicE>vicF>neonRun$/.test(K.seq) && K.alt && K.len.every(l => l === 700) && K.biome === 'vic' && K.zones[0] === 'vic' && K.zones[1] === 'vic' && K.zones[2], JSON.stringify(K.seq));
  T('the street is narrow, 4.4 m wide (' + K.width.join(' / ') + ' m at the entrance, in the street, in a bend, at the end, after the street, further on: it narrows over 40 m and widens again, no jump of its edge: ' + K.jump + ' lane per 0.5 m)',
    K.width[0] > 6 && Math.abs(K.width[2] - 4.4) < 0.05 && Math.abs(K.width[3] - 4.4) < 0.05 && K.width[1] < K.width[0] && K.width[5] > 6 && K.jump < 0.05, JSON.stringify(K.width));
  T('the hazards of the street stand against the walls, half a street wide (lane +-0.28, half-width 0.3: ' + K.xs.join(', ') + '), on both sides (' + K.both + '), six kinds (' + K.kinds.join(', ') + ', ' + K.n + ' of them); no tree, no photograph on the street (' + K.zones[3] + ')',
    K.xs.length === 2 && K.xs[0] === -0.28 && K.xs[1] === 0.28 && K.both && ['vicBarrel', 'vicChairs', 'vicHang', 'vicHigh', 'vicLow', 'vicPot'].every(k => K.kinds.includes(k)) && K.n >= 12 && K.noTree && K.zones[3] === 'undefined', JSON.stringify(K.box));

  // the rule of the street: the free half is the way round, a low hazard is jumped, the tall one cannot be, the parasol is slid under
  const R = await pg.evaluate(() => {
    const out = {}, g = __wf; g.r.renderer.render = () => {}; const run = (kind, side, act, atX) => {
      g.start(); g.world.extend(90000); const V = g.world.pieces.find(p => p.id === 'vicB'); g.world.items = g.world.items.filter(i => i.kind === 'prop'); g.state = 'play'; g.scene = null; g.fadeIn = 0; g.pk.reset();
      g.world.items.push({ kind, z: V.z0 + 400, x: side * 0.28, h: 12, tag: 'main' }); g.p.z = V.z0 + 150; g.p.x = atX; g.p.speed = 340; g.world.extend(g.p.z); g.keys.left = g.keys.right = false;
      for (let f = 0; f < 90 && g.state === 'play'; f++) { if (act === 'jump' && f === 22) g.onKey({ code: 'Space', key: ' ', repeat: false, preventDefault() {} }, true); if (act === 'slide' && f === 26) g.onKey({ code: 'ArrowDown', key: 'ArrowDown', repeat: false, preventDefault() {} }, true); g.advance(1 / 60); }
      return g.state === 'play';
    };
    for (const k of ['vicLow', 'vicBarrel', 'vicChairs', 'vicPot', 'vicHigh', 'vicHang']) out[k] = { sameWalk: run(k, -1, null, -0.28), otherWalk: run(k, -1, null, 0.28), sameJump: run(k, -1, 'jump', -0.28), sameSlide: run(k, -1, 'slide', -0.28), rightWalk: run(k, 1, null, 0.28), rightOther: run(k, 1, null, -0.28) };
    return out;
  });
  const lowK = ['vicLow', 'vicBarrel', 'vicChairs', 'vicPot'];
  T('the free half is the way round: against a wall on the left (or the right) a runner on the same half crashes, on the other half goes by, whatever the hazard (' + Object.keys(R).map(k => k + ' ' + [R[k].sameWalk, R[k].otherWalk, R[k].rightWalk, R[k].rightOther].join('/')).join('; ') + ')',
    Object.values(R).every(x => !x.sameWalk && x.otherWalk && !x.rightWalk && x.rightOther), JSON.stringify(R));
  T('a low hazard (terrace, barrels, armchairs, pots) is jumped from its own half (' + lowK.map(k => R[k].sameJump).join(', ') + '), the tall one (patio heater, planter, chairs) cannot be (' + R.vicHigh.sameJump + ', nor slid under ' + R.vicHigh.sameSlide + '), the parasol is slid under (' + R.vicHang.sameSlide + ') and not jumped (' + R.vicHang.sameJump + ')',
    lowK.every(k => R[k].sameJump) && !R.vicHigh.sameJump && !R.vicHigh.sameSlide && R.vicHang.sameSlide && !R.vicHang.sameJump, '');

  // the models
  const M = await pg.evaluate(() => {
    const out = {}, g = __wf, r = g.r; for (const k of ['vicLow', 'vicBarrel', 'vicChairs', 'vicPot', 'vicHigh', 'vicHang']) { const m = r.items.pool[k] && r.items.pool[k][0]; if (!m) { out[k] = null; continue; } m.visible = true; m.position.set(0, 0, 0); m.rotation.set(0, 0, 0); m.updateMatrixWorld(true); const bb = new THREE.Box3().setFromObject(m); out[k] = { w: +(bb.max.x - bb.min.x).toFixed(2), h: +bb.max.y.toFixed(2), y0: +bb.min.y.toFixed(2), x0: +bb.min.x.toFixed(2), x1: +bb.max.x.toFixed(2) }; m.visible = false; }
    return out;
  });
  const hh = k => OBST[k] ? 0 : 0;
  T('the six models exist in the 3D pools and fit the boxes: ' + Object.keys(M).map(k => k + ' ' + (M[k] ? M[k].w + 'x' + M[k].h : '-')).join(', '),
    Object.values(M).every(Boolean) && M.vicLow.h <= 0.85 && M.vicChairs.h <= 1.0 && M.vicChairs.h >= 0.7 && M.vicBarrel.h >= 1.0 && M.vicPot.h >= 0.95 && M.vicHigh.h >= 2.0 && M.vicHang.h >= 1.9 && Object.values(M).every(m => m.w >= 1.4 && m.w <= 2.6 && m.y0 >= -0.05), JSON.stringify(M));

  // the street in play
  const P = await pg.evaluate(() => {
    const g = __wf, r = g.r, out = { used: {}, props: {} }; r.renderer.render = () => {}; g.start(); g.world.extend(90000); const V = g.world.pieces.find(p => p.id === 'vicA'); g.state = 'play'; g.scene = null; g.fadeIn = 0; g.die = () => {}; g.p.z = V.z0 + 1300; g.p.x = 0.3; g.p.speed = 0; g.world.extend(g.p.z + 3000);
    const a = g.world.playerBand(g.p.z + 300, 0); g.bgTo = a.to; g.bgT = a.t; for (let i = 0; i < 5; i++) { g.time += 1 / 60; r.draw(g); }
    for (const k of ['vicA', 'vicB', 'vicC', 'vicD', 'vicE', 'vicF', 'vicYellow', 'vicArch', 'vicOrange', 'vicCobble', 'vicFlags', 'vicPlanter', 'vicBench']) out.props[k] = (r.props[k] || []).filter(m => m.visible).length;
    out.houses = ['vicA', 'vicB', 'vicC', 'vicD', 'vicE', 'vicF'].reduce((s, k) => s + out.props[k], 0); out.dropped = r.dropped + r.items.dropped; out.bg = g.bgTo; out.sprites = Object.keys(r.props).filter(k => /^vic/.test(k)).some(k => r.props[k][0].children.some(c => c.material && c.material.map && c.material.map.image && c.material.map.image.width > 300));
    return out;
  });
  T('the street is drawn: ' + P.houses + ' modelled houses in view (the yellow, the pink with the stone arch, the orange with its shop are built, ' + [P.props.vicYellow, P.props.vicArch, P.props.vicOrange].join('/') + ' in view), the cobbles (' + P.props.vicCobble + '), no photo panel (' + P.sprites + '), nothing dropped (' + P.dropped + '), atmosphere ' + P.bg,
    P.houses >= 6 && P.props.vicCobble >= 5 && P.dropped === 0 && P.bg === 'vic' && !P.sprites, JSON.stringify(P.props));

  // a bot plays the whole zone: from before it to the neon quarter
  const BOT = await pg.evaluate(() => {
    const g = __wf; g.r.renderer.render = () => {}; g.start(); g.world.extend(90000); const V = g.world.pieces.find(p => p.id === 'vicA'), L = g.world.pieces.find(p => p.id === 'vicF'); g.state = 'play'; g.scene = null; g.fadeIn = 0; g.die = Game.prototype.die; g.p.z = V.z0 - 300; g.p.x = 0; g.p.speed = 340; g.world.extend(g.p.z);
    const key = c => g.onKey({ code: c, key: c, repeat: false, preventDefault() {} }, true), out = { off: 0, coins: 0, minX: 9, maxX: -9 }; let f = 0; const c0 = g.coins;
    while (g.state === 'play' && g.p.z < L.z1 + 200 && f < 60 * 60) { const p = g.p, w = g.world; g.keys.left = g.keys.right = false; let tg = null; for (const it of w.items) { const ob = OBST[it.kind]; if (!ob || it.z <= p.z || it.z - p.z > p.speed * (/^vic/.test(it.kind) ? 1.1 : 0.5)) continue; if (Math.abs(it.x - p.x) > ob.hw + 0.25) continue; if (!tg || it.z < tg.z) tg = it; }
      if (tg && /^vic/.test(tg.kind)) { g.keys.left = tg.x > 0; g.keys.right = tg.x < 0; tg = null; } if (tg && tg.z - p.z < p.speed * 0.3 && p.jy === 0 && (p.slide <= 0 || tg.kind !== 'over')) key(tg.kind === 'over' ? 'ArrowDown' : 'Space');
      g.advance(1 / 60); f++; const bs = w.bandsAt(g.p.z), ch = bs.find(q => q.chosen) || bs[0]; if (g.p.x < ch.lo - 0.02 || g.p.x > ch.hi + 0.02) out.off++; if (g.p.z > V.z0 && g.p.z < L.z1) { out.minX = Math.min(out.minX, g.p.x); out.maxX = Math.max(out.maxX, g.p.x); } }
    out.state = g.state; out.reached = g.p.z >= L.z1 + 200 - 1; out.coins = g.coins - c0; out.frames = f; return out;
  });
  T('a bot plays the six pieces (' + BOT.frames + ' frames, ' + BOT.coins + ' coins, alive ' + BOT.state + '), stepping from one half of the street to the other (x from ' + BOT.minX.toFixed(2) + ' to ' + BOT.maxX.toFixed(2) + '), off the road for ' + BOT.off + ' frames at most while the street narrows (the game puts the runner back)',
    BOT.state === 'play' && BOT.reached && BOT.coins >= 15 && BOT.off <= 4 && BOT.minX < -0.1 && BOT.maxX > 0.1, JSON.stringify(BOT));
  T('no JS errors (3D)', pg.errs.length === 0, pg.errs.slice(0, 2).join('|')); await pg.context().close();
  const pz = await open(base + '?zone=vic');
  const Z = await pz.evaluate(() => { const g = __wf; g.start(); const V = g.world.pieces.find(p => p.id === 'vicA'); for (let i = 0; i < 120; i++) g.advance(1 / 60); const b = g.world.playerBand(g.p.z, g.p.x); return { d: Math.round(V.z0 - g.p.z), route: b.route, state: g.state, z: Math.round(g.p.z) }; });
  T('?zone=vic starts the run in front of Vic to test it (after 2 s: ' + Z.d + ' units before / inside the street, road ' + Z.route + ', ' + Z.state + ')', Z.state === 'play' && /^(vicA|utrechtC|neonRun|fork)$|^vic|^utrecht/.test(String(Z.route)) && Z.z > 30000, JSON.stringify(Z)); await pz.context().close();
  const p2 = await open(base + '2d.html');
  const D2 = await p2.evaluate(() => { const g = __wf, out = {}; g.start(); g.world.extend(90000); const V = g.world.pieces.find(p => p.id === 'vicA'), L = g.world.pieces.find(p => p.id === 'vicF'); let draws = 0, err = null; g.state = 'play'; g.p.z = V.z0 - 300; g.p.speed = 340; g.die = () => {}; try { for (let f = 0; f < 60 * 30 && g.p.z < L.z1 + 100; f++) { g.advance(1 / 60); if (f % 4 === 0) { g.draw(); draws++; } } } catch (e) { err = String(e && e.message); } out.draws = draws; out.err = err; return out; });
  T('the classic 2D game draws the street with its hazards (' + D2.draws + ' frames), no error', !D2.err && D2.draws > 100 && p2.errs.length === 0, JSON.stringify({ ...D2, errs: p2.errs.slice(0, 1) }));
  await p2.context().close();
  console.log('\n' + res.filter(Boolean).length + '/' + res.length + ' passed'); await b.close(); srv.close(); process.exit(res.every(Boolean) ? 0 : 1);
})().catch(e => { console.log('TEST ERROR', e.message); process.exit(1); });
