// WAYFARER regression test: the end of Saint-Gilles, the Gare du Midi and its cutscene. Saint-Gilles runs into a station; at the platform the run hands over to a cutscene in which the runner
// carries on by itself (no control, no hazards), boards the train, the train leaves, the screen fades and the run resumes in a new zone. Checks the track pieces, the atmosphere hand-over, the
// scene's timeline, that input is ignored, that scoring and coins carry on, the camera and the overlay, restart, the 2D game (no cutscene), the sounds and the pools.
//
// Run:  node tests/qa3d_gare.js     (needs playwright-core and a Chromium: CHROMIUM=/path/to/chrome, NODE_PATH or PW_CORE as for the other tests)
const http = require('http'), fs = require('fs'), path = require('path');
let chromium; try { ({ chromium } = require('playwright-core')); } catch (e) { ({ chromium } = require(process.env.PW_CORE || 'playwright-core')); }
const ROOT = path.join(__dirname, '..'), PORT = 8121;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const res = []; const T = (n, ok, i = '') => { res.push(ok); console.log((ok ? 'PASS ' : 'FAIL ') + n + (i !== '' ? '  [' + i + ']' : '')); };

(async () => {
  const srv = http.createServer((q, r) => {
    let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
    fs.readFile(path.join(ROOT, p), (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' }); r.end(d); } });
  }).listen(PORT);
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/root/.cache/ms-playwright/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const base = process.env.TEST_URL || 'http://localhost:' + PORT + '/';
  const open = async url => { const pg = await (await b.newContext({ viewport: { width: 480, height: 270 } })).newPage(); pg.errs = []; pg.on('pageerror', e => pg.errs.push(e.message)); pg.on('console', m => m.type() === 'error' && pg.errs.push(m.text())); await pg.goto(url, { timeout: 90000 }); await pg.waitForFunction(() => window.__wf, null, { timeout: 90000 }); await pg.evaluate(() => { window.requestAnimationFrame = () => 0; }); await pg.waitForTimeout(600); return pg; };
  const pg = await open(base);

  // ---------------------------------------------------------------- 1. the track: Saint-Gilles -> the station -> the next fork
  const K = await pg.evaluate(() => {
    const out = {}, w = new World(TRACK); w.extend(120000); const ids = w.pieces.map(p => p.id || 'fork');
    const i = ids.indexOf('tramRun'); out.after = ids.slice(i, i + 5).join('>'); const G = w.pieces[i + 1], Tr = w.pieces[i];
    out.seg = { biome: G.seg.biome, len: G.z1 - G.z0, scene: G.seg.scene, name: G.seg.name, itemsEnd: G.seg.itemsEnd };
    // no hazard in the station, no item at all after `itemsEnd`
    const inG = w.items.filter(it => it.z >= G.z0 && it.z < G.z1 && it.kind !== 'prop'); out.hazards = inG.filter(it => OBST[it.kind]).length; out.lateItems = inG.filter(it => it.z > G.z0 + G.seg.itemsEnd + 1).length; out.coins = inG.filter(it => it.kind === 'coin').length;
    out.props = w.items.filter(it => it.kind === 'prop' && it.z >= G.z0 && it.z < G.z1).map(it => it.spr).sort();
    // the atmosphere is continuous from Saint-Gilles into the station, and fades out only over the station's last 700 units
    const t = z => w.bandsAt(z)[0]; out.t = [t(Tr.z1 - 2).t, t(G.z0 + 2).t, t(G.z0 + 800).t, t(G.z1 - 350).t, t(G.z1 - 2).t].map(v => +v.toFixed(2)); out.to = [t(Tr.z1 - 2).to, t(G.z0 + 2).to];
    let maxStep = 0, prev = null; for (let z = Tr.z0 + 1; z < G.z1 - 1; z += 5) { const v = t(z).t; if (prev !== null) maxStep = Math.max(maxStep, Math.abs(v - prev)); prev = v; } out.maxStep = +maxStep.toFixed(3);
    // the slope of Saint-Gilles eases out before the station: no step in the grade, no step in the drop
    out.grade = [w.gradeAt(Tr.z1 - 600), w.gradeAt(Tr.z1 - 300), w.gradeAt(Tr.z1 - 3), w.gradeAt(G.z0 + 50)].map(v => +v.toFixed(3)); let gStep = 0; for (let z = Tr.z1 - 1000; z < Tr.z1 + 100; z += 10) gStep = Math.max(gStep, Math.abs(w.gradeAt(z + 10) - w.gradeAt(z))); out.gStep = +gStep.toFixed(4);
    out.dropOk = Math.abs(w.dropAt(G.z0 + 400) - w.dropAt(G.z0 + 10)) < 1e-6;
    out.next = ids[i + 2]; out.nextFork = w.pieces[i + 2].type === 'fork' || w.pieces[i + 2].id === 'utrechtA';          // the zone the train goes to: Utrecht
    out.hasEnv = !!ENV3D.gare && !!BIOMES.gare && BIOMES.gare.atmo === 'tram' && ['signs', 'garePlat', 'gareHall', 'tourMidi'].filter(n => n !== 'signs').every(n => ENV3D.gare.props[n]);
    return out;
  });
  T('Saint-Gilles ends at the station: the sequence runs tramRun > gareMidi (GARE DU MIDI, biome gare, ' + K.seg.len + ' units, the scene 500 units in, the door 400 units further, 400 more to the end) > Utrecht; the station has no hazard, coins only before unit ' + K.seg.itemsEnd + ' (' + K.coins + ' of them), and the hall and the Tour du Midi as props (the signs of the next fork stand in its last 420 units)',
    K.after.startsWith('tramRun>gareMidi>utrechtA>utrechtB') && K.seg.biome === 'gare' && K.seg.name === 'GARE DU MIDI' && K.seg.scene.at === 500 && K.seg.scene.run === 400 && K.hazards === 0 && K.lateItems === 0 && K.coins >= 5 && K.props.includes('gareHall') && K.props.includes('tourMidi') && K.nextFork && K.hasEnv, JSON.stringify({ after: K.after, seg: K.seg, hazards: K.hazards, late: K.lateItems, coins: K.coins, props: K.props }));
  T('the hand-over is smooth: the atmosphere stays fully in from Saint-Gilles into the station (t ' + K.t.join(' / ') + ', biomes ' + K.to.join(' > ') + ') and stays fully in to the end of the station, where Utrecht takes over (largest step ' + K.maxStep + '); the slope eases out first (' + K.grade.join(' / ') + ', no step above ' + K.gStep + ') so the road is level in the station',
    K.t[0] === 1 && K.t[1] === 1 && K.t[2] === 1 && K.t[3] === 1 && K.t[4] === 1 && K.to.join() === 'tram,gare' && K.maxStep < 0.06 && K.grade[0] > K.grade[1] && K.grade[2] < 0.005 && K.grade[3] === 0 && K.gStep < 0.004 && K.dropOk, JSON.stringify(K));

  // ---------------------------------------------------------------- 2. no dip back to the base look between Saint-Gilles and the station (the game's own atmosphere easing)
  const Atm = await pg.evaluate(() => {
    const g = __wf; g.start(); g.world.items = []; g.world.reset(); g.start(); g.world.extend(60000); const P = g.world.pieces.find(p => p.id === 'gareMidi'), Tr = P.prev;
    g.state = 'play'; g.p.z = Tr.z1 - 900; g.p.speed = 340; g.p.x = 0; g.world.extend(g.p.z); g.world.items = g.world.items.filter(i => i.z > g.p.z + 1500 && i.kind === 'prop'); g.bgTo = 'tram'; g.bgT = 1;
    let minT = 1, seen = new Set(), f = 0; while (f < 60 * 12 && g.state === 'play') { g.advance(1 / 60); f++; seen.add(g.bgTo); if (g.bgTo === 'tram' || g.bgTo === 'gare') minT = Math.min(minT, g.bgT); }
    return { minT: +minT.toFixed(2), seen: [...seen].join(), state: g.state, scene: !!g.scene };
  });
  T('driving from Saint-Gilles into the station the sky, fog and light never dip back to the old town\'s (the atmosphere stays at ' + Atm.minT + ' or more while biomes go ' + Atm.seen + ')', Atm.minT > 0.95 && Atm.seen === 'tram,gare' && Atm.state === 'scene', JSON.stringify(Atm));

  // ---------------------------------------------------------------- 3. the cutscene: the timeline, no control, no hazards, score and coins carry on
  const S = await pg.evaluate(() => {
    const g = __wf, out = { frames: [], keys: 0 }; g.start(); g.world.items = []; g.world.reset(); g.start(); g.world.extend(60000); const P = g.world.pieces.find(p => p.id === 'gareMidi'), sc = P.seg.scene;
    g.state = 'play'; g.p.z = P.z0 + sc.at - 20; g.p.speed = 340; g.p.x = 0; g.world.extend(g.p.z); g.world.items = g.world.items.filter(i => i.kind === 'prop'); g.coins = 7; g.world.items.push({ kind: 'crate', z: P.z0 + sc.at + 200, x: 1.0, h: 12, tag: 'main' }, { kind: 'over', z: P.z0 + sc.at + 300, x: 2.0, h: 12, tag: 'main' });   // hazards in the runner's way
    const key = (c, d = true) => g.onKey({ code: c, key: c, repeat: false, preventDefault() {} }, d);
    const sc0 = g.score(), co0 = g.coins; let f = 0, phases = [], last = '', zPrev = g.p.z, back = 0, t0 = null, speedMax = 0, started = null;
    while (f < 60 * 14 && (g.state === 'play' || g.state === 'scene')) {
      if (g.state === 'scene') { for (const c of ['ArrowLeft', 'ArrowRight', 'Space', 'ArrowDown', 'KeyP', 'Escape', 'ArrowUp']) { key(c); out.keys++; key(c, false); } g.keys.left = true; }     // mash every control, the scene must not care
      g.advance(1 / 60); f++;
      if (g.state === 'scene') { const S = g.scene; if (S.phase !== last) { phases.push([S.phase, +S.t.toFixed(2)]); last = S.phase; } if (started === null) started = { z: Math.round(g.p.z), speed: Math.round(g.p.speed), x: g.p.x }; if (g.p.z < zPrev - 1e-9) back++; zPrev = g.p.z; out.frames.push([+S.t.toFixed(2), Math.round(g.p.z), +g.p.x.toFixed(2), S.phase, S.boarded, +S.open.toFixed(2), Math.round(S.trainS), +S.fade.toFixed(2), g.state]); }
      if (g.state === 'play' && phases.length && f > 5 && !out.end) out.end = { z: Math.round(g.p.z), x: g.p.x, speed: Math.round(g.p.speed), doorZ: P.z0 + sc.at + sc.run, state: g.state, fadeIn: +g.fadeIn.toFixed(2), scene: g.scene };
    }
    out.phases = phases; out.state = g.state; out.back = back; out.alive = g.state !== 'over'; out.score = [sc0, g.score()]; out.coins = [co0, g.coins]; out.started = started; out.doorZ = P.z0 + sc.at + sc.run; out.last = out.frames[out.frames.length - 1];
    out.minX = Math.min(...out.frames.map(r => r[2])); out.done = P.sceneDone; out.paused = out.frames.some(r => r[8] !== 'scene');
    return out;
  });
  const ph = Object.fromEntries(S.phases);
  T('the cutscene runs by itself: run > board > doors > depart (at ' + S.phases.map(p => p[0] + ' ' + p[1] + ' s').join(', ') + '), the runner arrives at the door (z ' + S.frames.find(r => r[3] === 'board')[1] + ' = ' + S.doorZ + '), boards it (x ' + S.last[2] + ' units) and the run resumes in play (state ' + S.state + ')',
    S.phases.map(p => p[0]).join() === 'run,board,doors,depart' && ph.run <= 0.05 && ph.board > 2.3 && ph.board < 5.2 && ph.doors - ph.board > 1.1 && ph.depart - ph.doors > 0.8 && S.frames.find(r => r[3] === 'board')[1] === S.doorZ && S.state === 'play' && S.alive, JSON.stringify({ phases: S.phases, door: S.doorZ, state: S.state }));
  T('no control: ' + S.keys + ' key presses of every control (steer, jump, slide, pause, escape) during the scene change nothing: the runner never goes back, stays in scene until it ends, and the crate and the overhead hazard on its way do not hurt (still alive)',
    S.keys > 100 && S.back === 0 && !S.paused && S.alive && S.frames.every(r => r[2] >= -0.001), JSON.stringify({ keys: S.keys, back: S.back, alive: S.alive, minX: S.minX }));
  T('it starts from the running speed (' + S.started.speed + ' units/s) without a jump and slows to a stop at the door; the train stays until the doors have closed, then leaves (it is ' + S.last[6] + ' units on at the end) and the screen is black (' + S.last[7] + ') when the run resumes; the runner is hidden once on board',
    S.started.speed >= 200 && S.frames.find(r => r[3] === 'doors')[5] <= 1 && S.frames.filter(r => r[3] === 'depart').every(r => r[4]) && S.last[6] > 150 && S.last[7] > 0.9 && S.frames.filter(r => r[3] === 'run').every(r => !r[4]) && S.frames.some(r => r[3] === 'board' && r[4]) && Math.max(...S.frames.map(r => r[5])) === 1 && S.frames.filter(r => r[3] === 'depart').every(r => r[5] === 0), JSON.stringify({ started: S.started, last: S.last }));
  T('then the run resumes in a new zone: on the road (x ' + S.end.x + '), 100 units past the door (z ' + S.end.z + ' / ' + (S.doorZ + 100) + '), at running speed (' + S.end.speed + ' units/s), fading in from black (' + S.end.fadeIn + '); the score and the coins carry on (score ' + S.score.join(' > ') + ', coins ' + S.coins.join(' > ') + '); the station does not trigger twice',
    S.end.x === 0 && S.end.z === S.doorZ + 100 && S.end.speed >= 200 && S.end.fadeIn > 0.9 && S.end.scene === null && S.score[1] >= S.score[0] && S.coins[1] >= S.coins[0] && S.done === true, JSON.stringify({ end: S.end, score: S.score, coins: S.coins }));

  // ---------------------------------------------------------------- 4. what is drawn: the camera, the frame, the train, restart, a jump in the air, the next fork
  const V = await pg.evaluate(() => {
    const g = __wf, r = g.r, out = {}; r.renderer.render = () => {}; g.start(); g.world.items = []; g.world.reset(); g.start(); g.world.extend(60000); const P = g.world.pieces.find(p => p.id === 'gareMidi'), sc = P.seg.scene;
    g.state = 'play'; g.p.z = P.z0 + sc.at - 10; g.p.speed = 340; g.p.x = 0; g.world.extend(g.p.z); g.world.items = g.world.items.filter(i => i.kind === 'prop'); g.p.jy = 20; g.p.vy = 150;      // starts in the air: it must come down
    const draw = () => { g.time += 1 / 60; g.draw(); }; const cam = () => r.camera.position.clone(); let prev = null, maxStep = 0, f = 0;
    draw(); out.trainBefore = r.train.group.visible; for (let i = 0; i < 20; i++) { g.advance(1 / 60); draw(); }
    const trace = []; while (g.state === 'scene' && f < 60 * 14) { g.advance(1 / 60); const inScene = g.state === 'scene'; draw(); f++; const c = cam(); if (prev && inScene) maxStep = Math.max(maxStep, c.distanceTo(prev)); prev = c;       /* (the frame on which the scene ends is behind a black screen) */ if (f % 20 === 0) trace.push({ ph: g.scene && g.scene.phase, k: +r.sceneK.toFixed(2), tz: +r.train.group.position.z.toFixed(1), vis: r.train.group.visible, runner: r.runner.group.visible, ry: +r.runner.group.position.y.toFixed(2), rx: +r.runner.group.position.x.toFixed(1), open: +r.train.open.toFixed(2) }); }
    out.maxCamStep = +maxStep.toFixed(2); out.trace = trace; out.jyEnd = g.p.jy; out.state = g.state;
    // the overlay: bars, caption, fade (read through the HUD canvas context)
    g.start(); g.world.items = []; g.world.reset(); g.start(); g.world.extend(60000); const P2 = g.world.pieces.find(p => p.id === 'gareMidi'); g.state = 'play'; g.p.z = P2.z0 + 495; g.p.speed = 340; g.world.extend(g.p.z); g.world.items = g.world.items.filter(i => i.kind === 'prop');
    for (let i = 0; i < 90; i++) { g.advance(1 / 60); draw(); } const ctx = r.ui.ctx, rects = [], fr = ctx.fillRect.bind(ctx); ctx.fillRect = (x, y, w, h) => { rects.push([x, y, w, h, String(ctx.fillStyle)]); return fr(x, y, w, h); }; r.ui.drawUI(g); ctx.fillRect = fr;
    out.overlay = { bars: rects.some(q => q[1] === 0 && q[2] === VW && q[3] >= 20) && rects.some(q => q[1] >= VH - 26 && q[2] === VW && q[3] >= 20), caption: g.scene.caption, state: g.state };
    // restart: no scene, the station is fresh in the new world, the train is hidden again, the camera blend returns to the chase camera
    g.start(); out.restart = { state: g.state, scene: g.scene, fadeIn: g.fadeIn }; g.world.extend(60000); out.fresh = g.world.pieces.filter(p => p.seg && p.seg.scene).every(p => !p.sceneDone);
    for (let i = 0; i < 120; i++) { g.advance(1 / 60); draw(); } out.k = +r.sceneK.toFixed(3); out.trainAfter = r.train.group.visible;
    return out;
  });
  const tr = V.trace;
  T('the cutscene is drawn: the camera eases from the chase view to a side view (the blend reaches ' + Math.max(...tr.map(t => t.k)) + ') with no jump (largest camera step ' + V.maxCamStep + ' m per frame), the train stands at the platform from afar (visible before the scene: ' + V.trainBefore + '), its doors open for the runner (' + Math.max(...tr.map(t => t.open)) + ') and close, the runner steps up onto the platform (+' + Math.max(...tr.map(t => t.ry)) + ' m), is hidden once aboard, the train pulls out (z ' + tr[tr.length - 1].tz + ')',
    V.trainBefore && Math.max(...tr.map(t => t.k)) > 0.95 && V.maxCamStep < 1.2 && Math.max(...tr.map(t => t.open)) === 1 && tr.some(t => t.ph === 'depart' && t.open === 0) && Math.max(...tr.map(t => t.ry)) > 0.6 && tr.some(t => !t.runner) && tr[0].runner && tr[tr.length - 1].tz < -3, JSON.stringify({ trainBefore: V.trainBefore, maxCamStep: V.maxCamStep, trace: tr.slice(0, 12).map(t => [t.ph, t.k, t.tz, t.runner, t.ry, t.open].join(' ')) }));
  T('a jump in the air when the scene starts comes down (jy ' + V.jyEnd + '); the frame is drawn: letterbox bars top and bottom and the caption (' + V.overlay.caption + '); a restart clears the scene and the fade, the next run\'s station is fresh, the camera blend and the train go back (blend ' + V.k + ', train visible ' + V.trainAfter + ')',
    V.jyEnd === 0 && V.overlay.bars && V.overlay.caption === 'GARE DU MIDI' && V.restart.state === 'play' && V.restart.scene === null && V.restart.fadeIn === 0 && V.fresh && V.k < 0.01 && !V.trainAfter, JSON.stringify({ jy: V.jyEnd, overlay: V.overlay, restart: V.restart, fresh: V.fresh, k: V.k, trainAfter: V.trainAfter }));

  // ---------------------------------------------------------------- 5. sounds, pools
  const A = await pg.evaluate(() => { const g = __wf, a = g.sfx, out = { train0: a.counts.train || 0, horn0: a.counts.horn || 0 }; g.start(); g.world.items = []; g.world.reset(); g.start(); g.world.extend(60000); const P = g.world.pieces.find(p => p.id === 'gareMidi'); g.state = 'play'; g.p.z = P.z0 + 495; g.p.speed = 340; g.world.extend(g.p.z); g.world.items = g.world.items.filter(i => i.kind === 'prop'); let f = 0; while (f < 60 * 14 && g.state !== 'play' || f < 5) { g.advance(1 / 60); f++; if (g.state === 'play' && f > 5) break; }
    out.train = (a.counts.train || 0) - out.train0; out.horn = (a.counts.horn || 0) - out.horn0; out.voices = typeof GameAudio.voices.train === 'function' && typeof GameAudio.voices.horn === 'function'; out.target = a.musicVol >= 0; return out; });
  T('the scene has its sounds: the station chime when it starts (' + A.train + ') and the horn when the train leaves (' + A.horn + '); both voices exist', A.train === 1 && A.horn === 1 && A.voices, JSON.stringify(A));
  // ---------------------------------------------------------------- 5b. the sound design: no music in the scene, the place and its people, cut to the picture
  const M = await pg.evaluate(() => {
    const g = __wf, a = g.sfx, out = {}, log = [], play0 = a.play.bind(a); a.play = (n, x) => { log.push([n, g.scene ? +g.scene.t.toFixed(2) : -1, g.scene ? g.scene.phase : g.state, x]); return play0(n, x); };
    g.start(); g.world.items = []; g.world.reset(); g.start(); g.world.extend(60000); const P = g.world.pieces.find(p => p.id === 'gareMidi'), sc = P.seg.scene; g.state = 'play'; g.p.z = P.z0 + sc.at - 10; g.p.speed = 340; g.p.x = 0; g.world.extend(g.p.z); g.world.items = g.world.items.filter(i => i.kind === 'prop');
    a.musicVol = 0.85; a.lastState = 'play'; const vol = [], T_ = g.scene; let f = 0;
    for (; f < 60 * 3 && g.state !== 'scene'; f++) g.advance(1 / 60);
    const S = g.scene; out.total = +(S.T + 5.3).toFixed(2);
    while (g.state === 'scene' && f < 60 * 20) { g.advance(1 / 60); f++; vol.push([g.scene ? g.scene.t : 99, a.musicVol, a.music.volume]); }
    out.vol1 = vol.find(v => v[0] >= 1.5), out.vol2 = vol.find(v => v[0] >= 3), out.volMax3 = Math.max(...vol.filter(v => v[0] >= 3 && v[0] < 90).map(v => v[1])); out.sceneEnded = g.state;
    const after = []; for (let i = 0; i < 60 * 9; i++) { g.advance(1 / 60); if (i === 29 || i === 179 || i === 539) after.push(+a.musicVol.toFixed(3)); } out.after = after;
    a.play = play0; out.log = log; return out;
  });
  const names = M.log.map(e => e[0]), cnt = n => names.filter(x => x === n).length, at = n => M.log.find(e => e[0] === n), steps = M.log.filter(e => e[0] === 'step'), runSteps = steps.filter(e => e[2] === 'run');
  const gaps = runSteps.slice(1).map((e, i) => e[1] - runSteps[i][1]), gA = gaps.slice(0, 3).reduce((x, y) => x + y, 0) / 3, gB = gaps.slice(-3).reduce((x, y) => x + y, 0) / 3;
  T('no music in the scene: it fades out within about a second (volume ' + M.vol1[1].toFixed(3) + ' after 1.5 s), is silent from then on (' + M.volMax3.toFixed(3) + ' at most after 3 s, the audio element at ' + M.vol2[2].toFixed(3) + '), and comes back slowly after the scene (' + M.after.join(' / ') + ' after 0.5 / 3 / 9 s)',
    M.sceneEnded === 'play' && M.vol1[1] < 0.03 && M.volMax3 < 0.005 && M.vol2[2] < 0.005 && M.after[0] > 0.02 && M.after[0] < 0.4 && M.after[1] > 0.4 && M.after[1] < 0.84 && M.after[2] > 0.8, JSON.stringify(M.after));
  T('the sounds follow the picture: the chime and the station bed at the start (the bed lasts ' + (at('station') && at('station')[3]) + ' s = the scene), the doors open while it runs, footsteps that slow down with the runner (' + gA.toFixed(2) + ' s apart at first, ' + gB.toFixed(2) + ' s at the end; ' + steps.length + ' in all, alternating feet), a suitcase rolling by, the guard\'s whistle as it boards, three beeps then the doors close, the horn and the train pulling out when it leaves; one of each',
    cnt('train') === 1 && cnt('station') === 1 && Math.abs(at('station')[3] - M.total) < 0.01 && at('train')[1] === 0 && cnt('doorOpen') === 1 && at('doorOpen')[2] === 'run' && cnt('luggage') === 1 && at('luggage')[2] === 'run' && cnt('whistle') === 1 && at('whistle')[2] === 'board' && cnt('doorBeep') === 1 && cnt('doorClose') === 1 && at('doorBeep')[2] === 'doors' && at('doorClose')[1] - at('doorBeep')[1] > 0.4 && at('doorClose')[1] - at('doorBeep')[1] < 0.75 &&
    cnt('horn') === 1 && cnt('pull') === 1 && at('horn')[2] === 'depart' && at('pull')[1] === at('horn')[1] && at('horn')[1] > at('doorClose')[1] && runSteps.length >= 6 && gB > gA * 1.4 && steps.every((e, i) => i === 0 || e[3] !== steps[i - 1][3]) && steps.every(e => e[2] === 'run' || e[2] === 'board') && steps.length - runSteps.length === 2,
    JSON.stringify({ counts: Object.fromEntries([...new Set(names)].map(n => [n, cnt(n)])), gA: +gA.toFixed(2), gB: +gB.toFixed(2), doorBeep: at('doorBeep'), doorClose: at('doorClose'), horn: at('horn') }));
  const SV = await pg.evaluate(async () => {
    const out = {}; for (const n of ['train', 'station', 'step', 'luggage', 'doorOpen', 'doorBeep', 'doorClose', 'whistle', 'horn', 'pull']) {
      const sr = 44100, secs = n === 'station' ? 9 : 4, oc = new OfflineAudioContext(1, sr * secs, sr), g = oc.createGain(); g.connect(oc.destination); GameAudio.voices[n](oc, g, 0.01, n === 'station' ? 6 : n === 'step' ? 1 : undefined);
      const d = (await oc.startRendering()).getChannelData(0); let pk = 0, e = 0, bad = 0, last = 0; for (let i = 0; i < d.length; i++) { const v = d[i]; if (!isFinite(v)) bad++; pk = Math.max(pk, Math.abs(v)); e += v * v; if (Math.abs(v) > 0.003) last = i; }
      out[n] = { peak: +pk.toFixed(3), rms: +Math.sqrt(e / d.length).toFixed(4), bad, endsAt: +(last / sr).toFixed(2) };
    }
    return out;
  });
  T('the scene voices render audible, finite and not clipping (peak 0.05..1.0) and stop by themselves: ' + Object.entries(SV).map(([n, v]) => n + ' ' + v.peak + ' / ' + v.endsAt + ' s').join(', '),
    Object.values(SV).every(v => v.peak > 0.05 && v.peak <= 1.0 && v.bad === 0 && v.rms > 0.002) && SV.step.endsAt < 0.5 && SV.station.endsAt < 6.5 && SV.station.endsAt > 4 && Object.entries(SV).every(([n, v]) => n === 'station' || v.endsAt < 3.5), JSON.stringify(SV));
  const CR = await pg.evaluate(() => {
    const g = __wf, r = g.r; r.renderer.render = () => {}; const out = { kids0: r.scene.children.length, dzMin: 99, lat: [99, -99], dy: [99, -99], swing: 0, swing0: 0, wave0: 0, waveMax: 0, vis: [] }; const C = r.crowd;
    g.start(); g.world.items = []; g.world.reset(); g.start(); g.world.extend(60000); const P = g.world.pieces.find(p => p.id === 'gareMidi'), sc = P.seg.scene; g.state = 'play'; g.p.z = P.z0 + sc.at - 10; g.p.speed = 340; g.p.x = 0; g.world.extend(g.p.z); g.world.items = g.world.items.filter(i => i.kind === 'prop');
    const draw = () => { g.time += 1 / 60; g.draw(); }; out.n = C.people.length; draw(); out.vis.push(C.group.visible); const walkers = C.people.filter(p => p.move), rel0 = walkers.map(p => p.g.position.z - r.train.group.position.z); let rel1 = rel0;           /* (along the platform: measured from the boarding door, the runner itself moves 40 m) */ out.swing0 = Math.max(...walkers.flatMap(p => p.legs.map(l => Math.abs(l.rotation.x)))); out.wave0 = C.waver.arm.rotation.z;
    for (let k = 0; k < 200 && g.state !== 'scene'; k++) { g.advance(1 / 60); draw(); }
    let f = 0; while (g.state === 'scene' && f < 60 * 14) { g.advance(1 / 60); draw(); f++; if (g.state !== 'scene') break;
      const T = r.train.group.position, ph = g.scene.phase; if (ph !== 'depart') for (const p of C.people) { out.dzMin = Math.min(out.dzMin, Math.abs(p.g.position.z - T.z)); const lat = p.g.position.x - T.x + 11.1; out.lat = [Math.min(out.lat[0], lat), Math.max(out.lat[1], lat)]; out.dy = [Math.min(out.dy[0], p.g.position.y - T.y), Math.max(out.dy[1], p.g.position.y - T.y)]; }
      if (ph !== 'depart') rel1 = walkers.map(p => p.g.position.z - T.z);
      for (const p of walkers) out.swing = Math.max(out.swing, ...p.legs.map(l => Math.abs(l.rotation.x))); out.waveMax = Math.max(out.waveMax, C.waver.arm.rotation.z); if (f === 60) out.wave1s = C.waver.arm.rotation.z; }
    out.moved = walkers.map((p, i) => +Math.abs(rel1[i] - rel0[i]).toFixed(1)); out.state = g.state;
    for (let i = 0; i < 40; i++) { g.advance(1 / 60); draw(); } out.afterVis = C.group.visible; out.trainAfter = r.train.group.visible;
    g.p.z = P.z0 - 3000; g.world.extend(g.p.z); draw(); out.farVis = C.group.visible; out.kids1 = r.scene.children.length; return out;
  });
  T('a few people are on the platform (' + CR.n + ', two of them walking along it (' + CR.moved.join(' and ') + ' m by the time the train leaves), legs swinging by ' + CR.swing.toFixed(2) + ' rad, standing still before the scene), all on the platform (across ' + CR.lat.map(v => v.toFixed(1)).join(' to ') + ' m, feet ' + CR.dy.map(v => v.toFixed(2)).join(' to ') + ' m above the rails), never within ' + CR.dzMin.toFixed(1) + ' m of the boarding door while the runner is there; the child waves the train off (arm ' + CR.wave0.toFixed(2) + ' rad before, ' + CR.waveMax.toFixed(2) + ' at most); they stay when the train has gone, are hidden far away, and nothing new is added to the scene',
    CR.n >= 8 && CR.vis[0] && CR.swing0 === 0 && CR.swing > 0.4 && CR.moved.every(m => m > 4) && CR.lat[0] >= 7.2 && CR.lat[1] <= 10.4 && CR.dy[0] > 0.7 && CR.dy[1] < 0.9 && CR.dzMin >= 3.9 && CR.wave0 < 0.1 && CR.waveMax > 2.2 && CR.state === 'play' && CR.afterVis && !CR.trainAfter && !CR.farVis && CR.kids0 === CR.kids1, JSON.stringify(CR));
  const Pl = await pg.evaluate(() => {
    const g = __wf, r = g.r; r.renderer.render = () => {}; const out = { dropped: 0, peak: 0, peakName: '', draws: 0 }; let geo0 = -1, kids0 = r.scene.children.length;
    for (const seed of [0, 1, 2]) { g.start(); g.world.seed = seed; g.world.items = []; g.world.reset(); g.start(); g.world.seed = seed; g.world.reset(); g.world.extend(80000); const P = g.world.pieces.find(p => p.id === 'gareMidi');
      for (let z = P.z0 - 2400; z < P.z1 + 1500; z += 40) { g.p.z = z; g.world.extend(z); const F = g.world.pieces.find(p => p.type === 'fork' && !p.choice && z > p.z0 - 20); if (F) { F.choice = 'left'; g.world.ver++; } const pb = g.world.playerBand(z, 0); g.camX = pb.c; g.camOff = pb.off; const ah = g.world.playerBand(z + 300, 0); g.bgTo = ah.to; g.bgT = ah.t; g.time += 1 / 60; r.draw(g); out.draws++;
        for (const k in r.propUsed) { const f = r.propUsed[k] / r.props[k].length; if (f > out.peak) { out.peak = f; out.peakName = k; } } if (out.draws === 60) geo0 = r.renderer.info.memory.geometries; else if (out.draws > 60 && (r.renderer.info.memory.geometries !== geo0 || r.scene.children.length !== kids0)) out.drift = (out.drift || 0) + 1; } }
    out.dropped = r.dropped + r.items.dropped; out.by = r.droppedBy; out.hallDrawn = r.props.gareHall.some(o => o.visible) || r.propUsed.gareHall > 0; return out;
  });
  T('driving through the station (3 seeds, ' + Pl.draws + ' frames): nothing dropped from any pool (peak ' + Pl.peakName + ' ' + Math.round(Pl.peak * 100) + ' %), the scene constant (no new geometry or objects)', Pl.dropped === 0 && Pl.peak <= 0.85 && !Pl.drift, JSON.stringify({ dropped: Pl.dropped, by: Pl.by, peak: +Pl.peak.toFixed(2), drift: Pl.drift || 0 }));
  T('no JS errors (3D)', pg.errs.length === 0, pg.errs.slice(0, 2).join('|')); await pg.context().close();

  // ---------------------------------------------------------------- 6. the classic 2D game: no cutscene, it just runs through the station
  const p2 = await open(base + '2d.html');
  const D = await p2.evaluate(() => {
    const g = __wf, out = {}; g.start(); g.world.items = []; g.world.reset(); g.start(); g.world.extend(60000); const P = g.world.pieces.find(p => p.id === 'gareMidi'); g.state = 'play'; g.p.z = P.z0 + 300; g.p.speed = 340; g.world.extend(g.p.z); g.world.items = g.world.items.filter(i => i.kind === 'prop');         /* (the fixed props stay: the hall and the tower have no 2D sprite and must not break the drawing) */
    const states = new Set(); let f = 0; while (f < 60 * 8 && g.state !== 'over' && g.p.z < P.z0 + 1300) { g.advance(1 / 60); g.draw(); f++; states.add(g.state); }
    out.states = [...states].join(); out.z = Math.round(g.p.z - P.z0); out.scene = g.scene; out.supports = !!(g.r && g.r.supportsScene); out.done = !!P.sceneDone; return out;
  });
  T('the classic 2D game has no cutscene: it runs straight through the station (states ' + D.states + ', z ' + D.z + ' units into it), its renderer does not claim to support scenes', D.states === 'play' && D.z >= 990 && D.scene === null && !D.supports && !D.done && p2.errs.length === 0, JSON.stringify({ ...D, errs: p2.errs.slice(0, 1) }));
  await p2.context().close();
  console.log('\n' + res.filter(Boolean).length + '/' + res.length + ' passed');
  await b.close(); srv.close(); process.exit(res.every(Boolean) ? 0 : 1);
})().catch(e => { console.log('TEST ERROR', e.message); process.exit(1); });
