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
    const out = {}, w = new World(TRACK); w.extras = true; w.extend(160000); const ids = w.pieces.map(p => p.id || 'fork'), i = ids.indexOf('vicA'), V = w.pieces.slice(i, i + 12).filter(P => P.type === 'seg');
    out.seq = ids.slice(i - 1, i + 17).join('>'); out.curves = V.map(P => P.seg.curve); out.hw = V.map(P => P.seg.hw); out.len = V.map(P => P.z1 - P.z0); out.biome = [...new Set(V.map(P => P.seg.biome))].join();
    const bends = V.filter(P => P.seg.curve); out.alt = bends.length === 6 && bends.every((P, k) => !k || Math.sign(P.seg.curve) !== Math.sign(bends[k - 1].seg.curve)) && V.filter(P => !P.seg.curve).length === 5 && V.every((P, k) => !!P.seg.curve === (k % 2 === 0));
    const wid = z => { const b = w.bandsAt(z)[0]; return +((b.hi - b.lo) * U3.X).toFixed(2); };
    out.width = [wid(V[0].z0 - 5), wid(V[0].z0 + 200), wid(V[0].z0 + 500), wid(V[3].z0 + 300), wid(V[10].z1 + 5), wid(w.pieces.find(P => P.id === 'vicR2').z0 + 300)];
    let jump = 0, prev = null; for (let z = V[0].z0 - 100; z < V[10].z1 + 600; z += 5) { const bb = w.bandsAt(z); if (bb.length > 1) { prev = null; continue; } const b = bb[0]; if (prev) jump = Math.max(jump, Math.abs(b.hi - prev.hi), Math.abs(b.lo - prev.lo)); prev = b; } out.jump = +jump.toFixed(3);
    const hz = w.items.filter(it => OBST[it.kind] && it.tag === 'main' && it.z >= V[0].z0 && it.z < V[10].z1); out.kinds = [...new Set(hz.map(it => it.kind))].sort(); out.n = hz.length; out.xs = [...new Set(hz.filter(it => /^vic/.test(it.kind)).map(it => +it.x.toFixed(2)))].sort();
    out.both = hz.some(it => it.x < 0) && hz.some(it => it.x > 0); out.box = { low: OBST.vicLow, high: OBST.vicHigh, hang: OBST.vicHang, bar: OBST.vicBarrel, ch: OBST.vicChairs, pot: OBST.vicPot };
    out.zones = [Portal.fam(TRACK.segments.vicA.biome), BIOMES.vic && BIOMES.vic.atmo, !!ENV3D.vic, typeof VIC_ASSETS]; out.noTree = !ENV3D.vic.props.vicTree && !Array.from({ length: 80 }, (_, k) => ENV3D.vic.layout(k, rnd)).flat().some(q => /Tree/.test(q.prop));
    return out;
  });
  T('after the junction of Utrecht come eleven pieces of Vic (' + K.seq + '), 90 m each, eleven in all: the six original bends, left then right and so on, with a straight stretch between two of them (' + K.curves.join(' / ') + ': ' + K.alt + '), all biome ' + K.biome + ', one atmosphere for the 2D game too (' + K.zones[1] + ')',
     /^fork>vicA>vicS1>vicB>vicS2>fork>vicC>vicS3>vicD>vicS4>vicE>vicS5>vicF>vicP1>vicP2>vicP3>vicR1>vicR2$/.test(K.seq) && K.alt && K.len.every(l => l === 900 || l === 1400) && K.biome === 'vic' && K.zones[0] === 'vic' && K.zones[1] === 'vic' && K.zones[2], JSON.stringify(K.seq));
  T('the street is narrow, 4.4 m wide (' + K.width.join(' / ') + ' m at the entrance, in the street, in a bend, at the end, after the street, further on: it narrows over 40 m at the entrance and again into the pink alley at the end, no jump of its edge: ' + K.jump + ' lane per 0.5 m)',
    K.width[0] > 6 && Math.abs(K.width[2] - 4.4) < 0.05 && Math.abs(K.width[3] - 4.4) < 0.05 && K.width[1] < K.width[0] && K.width[5] < 3 && K.jump < 0.05, JSON.stringify(K.width));
  T('the hazards of the street stand against the walls, half a street wide (lane +-0.28, half-width 0.3: ' + K.xs.join(', ') + '), on both sides (' + K.both + '), six kinds (' + K.kinds.join(', ') + ', ' + K.n + ' of them); no tree, no photograph on the street (' + K.zones[3] + ')',
    K.xs.length === 2 && K.xs[0] === -0.28 && K.xs[1] === 0.28 && K.both && ['vicBarrel', 'vicChairs', 'vicHang', 'vicHigh', 'vicLow', 'vicPot'].every(k => K.kinds.includes(k)) && K.n >= 10 && K.noTree && K.zones[3] === 'undefined', JSON.stringify(K.box));

  const PK = await pg.evaluate(() => {
    const out = { kinds: {}, bad: 0, n: 0 }; for (const seed of [0, 1, 2, 3, 4, 5]) { const w = new World(TRACK); w.seed = seed; w.reset(); w.extras = true; w.extend(160000); const ids = w.pieces.filter(p => p.id && /^vic/.test(p.id) && !/^vicR/.test(p.id)); if (!ids.length) continue; const z0 = ids[0].z0, z1 = ids[ids.length - 1].z1;
      for (const it of w.items) if (ids.some(P => it.z >= P.z0 && it.z < P.z1) && it.kind !== 'prop' && it.kind !== 'raceGate' && !OBST[it.kind]) { out.n++; out.kinds[it.kind] = (out.kinds[it.kind] || 0) + 1; if (Math.abs(Math.abs(it.x) - 0.28) > 0.005) out.bad++; } }
    return out;
  });
  T('in the street everything to pick up stands on one of the two places too, coins and power-ups (' + Object.entries(PK.kinds).map(e => e.join(' ')).join(', ') + ': ' + PK.n + ' items over six runs, ' + PK.bad + ' off the two places)', PK.n > 40 && PK.bad === 0 && ['magnet', 'aura', 'dash', 'shard'].some(k => PK.kinds[k] > 0), JSON.stringify(PK.kinds));

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

  // only TWO places: the left half and the right half of the street, a key sends the runner to its half and it stays there
  const L2 = await pg.evaluate(() => {
    const g = __wf, out = { xs: [] }; g.r.renderer.render = () => {}; g.start(); g.world.extend(90000); const V = g.world.pieces.find(p => p.id === 'vicB'); g.world.items = g.world.items.filter(i => i.kind === 'prop'); g.state = 'play'; g.scene = null; g.fadeIn = 0; g.p.z = V.z0 + 10; g.p.x = 0.05; g.p.speed = 340; g.world.extend(g.p.z);
    const step = n => { for (let i = 0; i < n; i++) g.advance(1 / 60); }, press = (k, on) => { g.keys[k] = on; };
    step(20); out.xs.push(+g.p.x.toFixed(3)); press('left', true); step(3); press('left', false); step(20); out.xs.push(+g.p.x.toFixed(3)); step(15); out.xs.push(+g.p.x.toFixed(3));
    press('right', true); step(3); press('right', false); step(20); out.xs.push(+g.p.x.toFixed(3)); step(15); out.xs.push(+g.p.x.toFixed(3));
    g.p.z = g.world.pieces.find(p => p.id === 'neonRun').z0 + 300; g.world.extend(g.p.z); step(5); press('left', true); step(40); press('left', false); step(30); out.free = +g.p.x.toFixed(2);       // after the street the steering is free again
    return out;
  });
  T('in Vic the runner has only two places, the left half and the right half of the street (x ' + L2.xs.join(', ') + '): a key sends it to its half, it stays there when the key is released; outside the street the steering is free again (x ' + L2.free + ')',
    Math.abs(L2.xs[0] - 0.28) < 0.005 && Math.abs(L2.xs[1] + 0.28) < 0.005 && Math.abs(L2.xs[2] + 0.28) < 0.005 && Math.abs(L2.xs[3] - 0.28) < 0.005 && Math.abs(L2.xs[4] - 0.28) < 0.005 && L2.free < -0.4, JSON.stringify(L2));


  // THE ALLEY: a junction of the street (left, two places) and an alley (right, ONE place, wall to wall): only jump or slide
  const AL = await pg.evaluate(() => {
    const out = {}, w = new World(TRACK); w.extras = true; w.extend(120000); const F = w.pieces.find(p => p.type === 'fork' && p.fork === TRACK.forks.gateVic), f = F.fork, S = TRACK.segments;
    out.routes = [f.left.route, f.right.route]; out.lanes = [S[f.left.route].lanes, S[f.right.route].lanes]; out.biomes = [S[f.left.route].biome, S[f.right.route].biome]; out.signs = [f.left.sign, f.right.sign]; out.signKit = [f.left.sign, f.right.sign].every(n => !!SPR[n] && !!ENV3D.common.props[n]);
    out.seq = w.pieces.map(p => p.id || 'fork').join('>').match(/vicS2>fork>vicC/) !== null; const bs = w.bandsAt(F.fe + 200), l = bs.find(b => b.side < 0), r = bs.find(b => b.side > 0); out.width = [+((l.hi - l.lo) * U3.X).toFixed(2), +((r.hi - r.lo) * U3.X).toFixed(2)]; out.centres = [+((l.lo + l.hi) / 2).toFixed(2), +((r.lo + r.hi) / 2).toFixed(2)];
    const mg = w.bandsAt(F.z1 - 1); out.merge = mg.map(b => +((b.hi - b.lo) * U3.X).toFixed(2)); out.after = +((w.bandsAt(F.z1 + 50)[0].hi - w.bandsAt(F.z1 + 50)[0].lo) * U3.X).toFixed(2);
    const R = w.items.filter(i => i.tag === F.uid + 'right' && i.z >= F.fe), hz = R.filter(i => OBST[i.kind]); out.kinds = [...new Set(hz.map(i => i.kind))].filter(k => k !== 'crate').sort(); out.hz = hz.filter(i => i.kind !== 'crate').length; out.xs = [...new Set(hz.map(i => +i.x.toFixed(2)))]; out.pk = [...new Set(R.filter(i => i.kind !== 'prop' && !OBST[i.kind]).map(i => +i.x.toFixed(2)))];
    const hh = hz.filter(i => i.kind !== 'crate').sort((a, b) => a.z - b.z); out.gap = hh.length > 1 ? Math.min(...hh.slice(1).map((h, k) => h.z - hh[k].z)) : 0; out.way = ['slide', 'jump'].includes(S.vicM.waymark) && ['slide', 'jump'].includes(S.vicAlley.waymark);
    out.box = [OBST.vicAJump, OBST.vicASlide]; return out;
  });
  T('the junction of Vic: the street goes on LEFT (' + AL.routes[0] + ', two places, ' + AL.width[0] + ' m) and an alley goes RIGHT (' + AL.routes[1] + ', ONE place, ' + AL.width[1] + ' m wall to wall), signs ' + AL.signs.join(' / ') + ' in both builds, they merge into the street (' + AL.merge.join(' / ') + ' then ' + AL.after + ' m)',
    AL.seq && AL.lanes.join() === '2,1' && AL.biomes.join() === 'vic,vicAlley' && AL.signKit && Math.abs(AL.width[0] - 4.4) < 0.1 && Math.abs(AL.width[1] - 2.27) < 0.1 && Math.abs(AL.after - 4.4) < 0.1 && AL.merge.every(x => x < 6), JSON.stringify(AL.width));
  T('the alley has only two kinds of hazard, wall to wall (' + AL.kinds.join(', ') + ', ' + AL.hz + ' of them, boxes ' + JSON.stringify(AL.box) + '), all in the middle of its one place, at least ' + Math.round(AL.gap / 10) + ' m apart; the coins and the power-ups too (' + AL.pk.length + ' places)',
    AL.kinds.join() === 'vicAJump,vicASlide' && AL.hz >= 4 && AL.xs.length === 1 && AL.gap >= 190 && AL.pk.length === 1 && AL.pk[0] === AL.xs[0] && AL.way, JSON.stringify({ xs: AL.xs, pk: AL.pk }));
  const AR = await pg.evaluate(() => {
    const g = __wf, out = {}; g.r.renderer.render = () => {}; const run = (kind, act, dx, key) => {
      g.start(); g.world.extend(90000); const F = g.world.pieces.find(p => p.type === 'fork' && p.fork === TRACK.forks.gateVic); g.world.commit(F, 'right'); g.world.items = g.world.items.filter(i => i.kind === 'prop'); g.state = 'play'; g.scene = null; g.fadeIn = 0; g.pk.reset();
      g.p.z = F.fe + 700; const c = g.world.playerBand(g.p.z, 0).c; g.world.items.push({ kind, z: g.p.z + 300, x: c, h: 12, tag: 'main' }); g.p.x = c + dx; g.p.speed = 340; g.world.extend(g.p.z); g.keys.left = g.keys.right = false;
      for (let f = 0; f < 80 && g.state === 'play'; f++) { if (key && f < 40) g.keys[key] = true; if (act === 'jump' && f === 36) g.onKey({ code: 'Space', key: ' ', repeat: false, preventDefault() {} }, true); if (act === 'slide' && f === 22) g.onKey({ code: 'ArrowDown', key: 'ArrowDown', repeat: false, preventDefault() {} }, true); g.advance(1 / 60); }
      return { alive: g.state === 'play', dx: +(g.p.x - c).toFixed(3) };
    };
    out.jumpWalk = run('vicAJump', null, 0).alive; out.jumpJump = run('vicAJump', 'jump', 0).alive; out.slideWalk = run('vicASlide', null, 0).alive; out.slideSlide = run('vicASlide', 'slide', 0).alive; out.slideJump = run('vicASlide', 'jump', 0).alive;
    out.keyL = run('vicAJump', 'jump', 0, 'left').dx; out.keyR = run('vicAJump', 'jump', 0, 'right').dx; out.off = run('vicAJump', null, 0.2).alive; out.off2 = run('vicAJump', null, -0.2).alive; return out;
  });
  T('in the alley there is nothing to go round: walking into a hazard crashes (' + !AR.jumpWalk + ' / ' + !AR.slideWalk + '), even a little to one side (' + !AR.off + ' / ' + !AR.off2 + '), the arrow keys do not move the runner (' + AR.keyL + ' / ' + AR.keyR + '); the crate row is jumped (' + AR.jumpJump + '), the washing line is slid under (' + AR.slideSlide + ') and not jumped (' + AR.slideJump + ')',
    !AR.jumpWalk && !AR.slideWalk && !AR.off && !AR.off2 && Math.abs(AR.keyL) < 0.03 && Math.abs(AR.keyR) < 0.03 && AR.jumpJump && AR.slideSlide && !AR.slideJump, JSON.stringify(AR));
  const AB = await pg.evaluate(() => {
    const g = __wf; g.r.renderer.render = () => {}; g.start(); g.world.extend(90000); const F = g.world.pieces.find(p => p.type === 'fork' && p.fork === TRACK.forks.gateVic); g.state = 'play'; g.scene = null; g.fadeIn = 0; g.die = Game.prototype.die; g.p.z = F.z0 - 120; g.p.x = 0.28; g.p.speed = 340; g.world.extend(g.p.z);
    const key = c => g.onKey({ code: c, key: c, repeat: false, preventDefault() {} }, true), out = { frames: 0, coins: 0, names: new Set() }; const c0 = g.coins; let f = 0;
    while (g.state === 'play' && g.p.z < F.z1 + 100 && f < 60 * 40) { const p = g.p; g.keys.left = g.keys.right = false; if (p.z < F.z0 + 200) g.keys.right = true;
      const hz = g.world.items.filter(i => OBST[i.kind] && i.z > p.z && i.z - p.z < 140 && Math.abs(i.x - p.x) < 0.7)[0]; if (hz && hz.z - p.z < 105 && p.jy === 0 && p.slide <= 0) key(hz.kind === 'vicASlide' ? 'ArrowDown' : 'Space');
      g.advance(1 / 60); f++; out.names.add(g.world.track.segments[g.world.playerBand(g.p.z, g.p.x).route].name); }
    out.state = g.state; out.reached = g.p.z >= F.z1 + 100 - 1; out.coins = g.coins - c0; out.frames = f; out.names = [...out.names]; out.choice = F.choice; return out;
  });
  T('a bot takes the alley by jumping and sliding only (' + AB.frames + ' frames, ' + AB.coins + ' coins, alive ' + AB.state + ', HUD ' + AB.names.join(' / ') + ') and comes out into the street',
    AB.state === 'play' && AB.reached && AB.choice === 'right' && AB.coins >= 10 && AB.names.includes('RUELLE'), JSON.stringify(AB));


  // THE PINK ALLEY at the end of Vic: four pieces, ONE place, from the photo of a rose alley: blue planters to jump, wooden awnings to slide under
  const MD = await pg.evaluate(() => {
    const out = {}, w = new World(TRACK); w.extras = true; w.extend(160000); const R = w.pieces.filter(p => p.id && /^vicR\d$/.test(p.id)).slice(0, 4);
    out.n = R.length; out.lanes = R.map(P => P.seg.lanes); out.biome = [...new Set(R.map(P => P.seg.biome))].join(); out.name = R[0].seg.name; out.len = R.map(P => P.z1 - P.z0);
    const wid = z => { const b = w.bandsAt(z)[0]; return +((b.hi - b.lo) * U3.X).toFixed(2); }; out.width = [wid(R[0].z0 + 50), wid(R[0].z0 + 600), wid(R[2].z0 + 400), wid(R[3].z1 + 600)];
    const hz = w.items.filter(i => OBST[i.kind] && i.tag === 'main' && i.z >= R[0].z0 && i.z < R[3].z1); out.kinds = [...new Set(hz.map(i => i.kind))].sort(); out.hz = hz.length; out.xs = [...new Set(hz.map(i => +i.x.toFixed(2)))]; hz.sort((a, b) => a.z - b.z); out.gap = Math.min(...hz.slice(1).map((h, k) => h.z - hz[k].z));
    out.pk = [...new Set(w.items.filter(i => i.tag === 'main' && i.z >= R[0].z0 && i.z < R[3].z1 && i.kind !== 'prop' && !OBST[i.kind]).map(i => +i.x.toFixed(2)))];
    out.env = !!ENV3D.vicMedina && !!BIOMES.vicMedina && Portal.fam('vicMedina') === 'vic'; out.box = [OBST.vicMJump, OBST.vicMSlide]; return out;
  });
  T('the pink alley ends Vic: ' + MD.n + ' pieces of ' + MD.len[0] / 10 + ' m, one place (' + MD.lanes.join('') + '), ' + MD.width[1] + ' m wide (narrowing from ' + MD.width[0] + ', widening to ' + MD.width[3] + ' m after it), HUD "' + MD.name + '", only ' + MD.kinds.join(' and ') + ' (' + MD.hz + ' hazards, ' + Math.round(MD.gap / 10) + ' m apart at least), all and the pickups in the middle (' + MD.xs.join() + ' / ' + MD.pk.join() + ')',
    MD.n === 4 && MD.lanes.every(l => l === 1) && MD.biome === 'vicMedina' && MD.name === 'RUELLE' && Math.abs(MD.width[1] - 2.27) < 0.1 && MD.width[0] > 2.4 && MD.width[3] > 6 && MD.kinds.join() === 'vicMJump,vicMSlide' && MD.hz >= 6 && MD.gap >= 190 && MD.xs.join() === '0' && MD.pk.join() === '0' && MD.env, JSON.stringify(MD.box));
  const MB = await pg.evaluate(() => {
    const g = __wf; g.r.renderer.render = () => {}; g.start(); g.world.extend(90000); const R1 = g.world.pieces.find(p => p.id === 'vicR1'), R4 = g.world.pieces.find(p => p.id === 'vicR4'); g.state = 'play'; g.scene = null; g.fadeIn = 0; g.die = Game.prototype.die; g.p.z = R1.z0 - 150; g.p.x = 0.28; g.p.speed = 340; g.world.extend(g.p.z);
    const key = c => g.onKey({ code: c, key: c, repeat: false, preventDefault() {} }, true), out = { frames: 0, coins: 0, minX: 9, maxX: -9 }; const c0 = g.coins; let f = 0;
    while (g.state === 'play' && g.p.z < R4.z1 + 200 && f < 60 * 40) { const p = g.p; g.keys.left = g.keys.right = false; const hz = g.world.items.filter(i => OBST[i.kind] && i.z > p.z && i.z - p.z < 140)[0]; if (hz && hz.z - p.z < 105 && p.jy === 0 && p.slide <= 0) key(hz.kind === 'vicMSlide' ? 'ArrowDown' : 'Space'); g.advance(1 / 60); f++; if (g.p.z > R1.z0 + 500) { out.minX = Math.min(out.minX, g.p.x); out.maxX = Math.max(out.maxX, g.p.x); } }
    out.state = g.state; out.reached = g.p.z >= R4.z1 + 200 - 1; out.coins = g.coins - c0; out.frames = f; return out;
  });
  T('a bot runs the pink alley by jumping and sliding only (' + MB.frames + ' frames, ' + MB.coins + ' coins, alive ' + MB.state + '), staying on its one line (x ' + MB.minX.toFixed(2) + ' to ' + MB.maxX.toFixed(2) + ')', MB.state === 'play' && MB.reached && MB.coins >= 10 && Math.abs(MB.minX) < 0.05 && Math.abs(MB.maxX) < 0.05, JSON.stringify(MB));

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
    const g = __wf; g.r.renderer.render = () => {}; g.start(); g.world.extend(90000); const V = g.world.pieces.find(p => p.id === 'vicA'), L = g.world.pieces.find(p => p.id === 'vicF'); g.state = 'play'; g.scene = null; g.fadeIn = 0; g.die = Game.prototype.die; g.p.z = V.z0 - 300; g.p.x = 0; g.p.speed = 340; g.world.extend(g.p.z); const GF = g.world.pieces.find(p => p.type === 'fork' && p.fork === TRACK.forks.gateVic);
    const key = c => g.onKey({ code: c, key: c, repeat: false, preventDefault() {} }, true), out = { off: 0, coins: 0, minX: 9, maxX: -9 }; let f = 0; const c0 = g.coins;
    while (g.state === 'play' && g.p.z < L.z1 + 200 && f < 60 * 60) { const p = g.p, w = g.world; g.keys.left = g.keys.right = false; let tg = null; for (const it of w.items) { const ob = OBST[it.kind]; if (!ob || it.z <= p.z || it.z - p.z > p.speed * (/^vic[^AM]/.test(it.kind) ? 1.1 : 0.5)) continue; if (Math.abs(it.x - p.x) > ob.hw + 0.25) continue; if (!tg || it.z < tg.z) tg = it; }
      { const vt = g.world.items.filter(i => /^vic[^AM]/.test(i.kind) && i.z > p.z - 14 && i.z - p.z < p.speed * 1.1).sort((a, b) => a.z - b.z)[0]; if (vt) { const cc = g.world.playerBand(p.z, p.x).c; g.keys.left = vt.x > cc; g.keys.right = vt.x < cc; } else if (!g.lane2 && Math.abs(p.x) > 0.2 && Math.abs(p.x) < 0.3 && !(g.world.openFork() && p.z > g.world.openFork().z0 - 900)) { g.keys.left = p.x > 0; g.keys.right = p.x < 0; } if (tg && /^vic[^AM]/.test(tg.kind)) tg = null; } if (tg && tg.z - p.z < p.speed * 0.3 && p.jy === 0 && (p.slide <= 0 || !/^(over|vicASlide|vicMSlide)$/.test(tg.kind))) key(/^(over|vicASlide|vicMSlide)$/.test(tg.kind) ? 'ArrowDown' : 'Space');
      if (g.p.z > GF.z0 - 450 && g.p.z < GF.z0 + 5) { g.keys.left = true; g.keys.right = false; } g.advance(1 / 60); f++; const bs = w.bandsAt(g.p.z), ch = bs.find(q => q.chosen) || bs[0]; if (g.p.x < ch.lo - 0.02 || g.p.x > ch.hi + 0.02) out.off++; if (g.p.z > V.z0 && g.p.z < L.z1) { out.minX = Math.min(out.minX, g.p.x); out.maxX = Math.max(out.maxX, g.p.x); } }
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
