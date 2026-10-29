// WAYFARER regression test: the depth layer of the 3D build (src/perks.js, Perk3D, the skill patterns). Power-ups (magnet, aura, dash), Memory Shards, Golden Waymarks, missions, near misses and
// sequence bonuses, the new obstacle patterns (avoidable at the top speed and in a dash), spawn fairness on both branches, saved progress (also corrupt), pause / restart, the HUD, pools and sounds,
// and that the classic 2D game is untouched. Every scenario is set up by hand in a fresh run (items placed ahead of the runner) and stepped frame by frame, so results do not depend on timing.
//
// Run:  node tests/qa3d_perks.js     (needs playwright-core and a Chromium: CHROMIUM=/path/to/chrome, NODE_PATH or PW_CORE as for the other tests; TEST_URL=https://... tests a deployment)
const http = require('http'), fs = require('fs'), path = require('path');
let chromium; try { ({ chromium } = require('playwright-core')); } catch (e) { ({ chromium } = require(process.env.PW_CORE || 'playwright-core')); }
const ROOT = path.join(__dirname, '..'), PORT = 8122;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const res = []; const T = (n, ok, i = '') => { res.push(ok); console.log((ok ? 'PASS ' : 'FAIL ') + n + (i !== '' ? '  [' + i + ']' : '')); };

(async () => {
  const srv = http.createServer((q, r) => {
    let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
    fs.readFile(path.join(ROOT, p), (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' }); r.end(d); } });
  }).listen(PORT);
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/root/.cache/ms-playwright/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const base = process.env.TEST_URL || 'http://localhost:' + PORT + '/';
  const open = async url => { const pg = await (await b.newContext({ viewport: { width: 480, height: 270 } })).newPage(); pg.errs = []; pg.on('pageerror', e => pg.errs.push(e.message)); pg.on('console', m => m.type() === 'error' && !/404/.test(m.text()) && pg.errs.push(m.text())); await pg.goto(url, { timeout: 90000 }); await pg.waitForFunction(() => window.__wf, null, { timeout: 60000 }); await pg.waitForTimeout(400); return pg; };
  // the helpers every scenario uses, defined in the page (and again after a reload)
  const HELPERS = () => {
    window.H = {
      // a fresh run with nothing on the road except what the scenario puts there; the runner stands at z 0 in lane `lane`, at the top speed
      setup(lane = 0, speed = 340) { const g = __wf; g.r.renderer.render = () => {}; g.start(); g.world.extend(14000); g.world.items = g.world.items.filter(i => i.kind === 'prop'); g.p.z = 0; g.p.x = lane * LANE_W; g.p.speed = speed; g.state = 'play'; g.keys = {}; return g; },
      put(kind, dz, lane = 0, h = 12, extra) { const g = __wf, it = Object.assign({ kind, z: g.p.z + dz, x: lane * LANE_W, h, tag: 'main' }, extra); g.world.items.push(it); return it; },
      run(n, dt = 1 / 60) { for (let i = 0; i < n && __wf.state === 'play'; i++) __wf.advance(dt); },
      // a player who jumps or slides at the hazards in its own lane, timed to its real speed (a jump may end a slide, but never while still inside a gate)
      bot() {
        const g = __wf, p = g.p, hz = g.world.items.filter(it => OBST[it.kind] && !it.taken && it.z > p.z - 12 && it.z < p.z + 300);
        g.keys.left = g.keys.right = false;                                                  /* (no lane changes: every hazard can be jumped or slid under) */
        let tg = null; for (const it of hz) { const o = OBST[it.kind]; if (Math.abs(it.x - p.x) > o.hw + P_HW + 0.08 || it.z <= p.z - 2) continue; if (!tg || it.z < tg.z) tg = it; }
        if (tg) { const d = tg.z - p.z, v = p.speed * (g.pk ? g.pk.speedMul : 1); if (tg.kind === 'over') { if (d < v * 0.2 + 10 && p.jy === 0 && p.slide <= 0) g.slideKey(); } else if (d < v * 0.26 + 8 && p.jy === 0 && !hz.some(it => it.kind === 'over' && it.z > p.z - 10 && it.z < p.z + 12)) g.jump(); }
      },
    };
  };
  const pg = await open(base); await pg.evaluate(HELPERS);

  // ================================================================ 1. the 3D world: what spawns, where, how often (and the classic game keeps its own world)
  const W = await pg.evaluate(() => {
    const out = { seeds: [] };
    for (const seed of [0, 3, 41]) {
      const w = new World(TRACK); w.extras = true; w.seed = seed; w.reset(); w.extend(90000);
      const it = w.items, kinds = {}; for (const i of it) kinds[i.kind] = (kinds[i.kind] || 0) + 1;
      const byTag = {}; for (const i of it) if (i.kind !== 'prop') (byTag[i.tag] = byTag[i.tag] || []).push(i);
      let minPU = 1e9, nearHaz = 0, puBefore700 = 0, wayWithoutHazard = 0, wayN = 0;
      for (const tag in byTag) {
        const pu = byTag[tag].filter(i => i.kind === 'magnet' || i.kind === 'aura' || i.kind === 'dash').sort((a, b) => a.z - b.z); for (let k = 1; k < pu.length; k++) minPU = Math.min(minPU, pu[k].z - pu[k - 1].z);
        for (const c of byTag[tag].filter(i => PICKUPS[i.kind] && i.kind !== 'waymark')) for (const h of byTag[tag]) if (OBST[h.kind] && Math.abs(h.z - c.z) < 60 && Math.abs(h.x - c.x) < 0.45) nearHaz++;
        for (const wm of byTag[tag].filter(i => i.kind === 'waymark')) { wayN++; if (!byTag[tag].some(h => OBST[h.kind] && Math.abs(h.z - wm.z) < 2)) wayWithoutHazard++; }
      }
      for (const i of it) if ((i.kind === 'magnet' || i.kind === 'aura' || i.kind === 'dash') && i.z < 700) puBefore700++;
      // gradual: the first occurrence of every skill pattern is at or past its intro distance
      const early = []; for (const name in PATTERNS_X) { const z = Math.min(1e9, ...it.filter(i => i.pat === name).map(i => i.z)); if (z < PATTERNS_X[name].intro) early.push(name); }
      // gaps: from the last hazard of each pattern instance to the first hazard of the next one on the same road
      let minGap = 1e9; for (const tag in byTag) { const hz = byTag[tag].filter(i => OBST[i.kind] && !/^wm/.test(i.pat || '')).sort((a, b) => a.z - b.z); for (let k = 1; k < hz.length; k++) { if (hz[k].inst !== hz[k - 1].inst || hz[k].seg !== hz[k - 1].seg) minGap = Math.min(minGap, hz[k].z - hz[k - 1].z); } }
      // no hazard in the stretch before a junction (the player is steered onto its road there)
      let atFork = 0; for (const P of w.pieces) if (P.type === 'fork') atFork += it.filter(i => OBST[i.kind] && i.tag === 'main' && i.z > P.z0 - 390 && i.z < P.z0 + 1).length;
      out.seeds.push({ seed, kinds, minPU, nearHaz, puBefore700, early, minGap: Math.round(minGap), atFork, wayN, wayWithoutHazard, patterns: [...new Set(it.map(i => i.pat).filter(Boolean))].filter(n => PATTERNS_X[n]).length });
    }
    // both branches: over many forks every branch road gets power-ups and shards, and exactly one waymark
    const w = new World(TRACK); w.extras = true; w.seed = 5; w.reset(); w.extend(300000);          // (one junction per 29 250-unit lap now)
    const sides = { left: { pu: 0, sh: 0, wm: [] }, right: { pu: 0, sh: 0, wm: [] } };
    for (const P of w.pieces) if (P.type === 'fork') for (const sd of ['left', 'right']) { const its = w.items.filter(i => i.tag === P.uid + sd); sides[sd].pu += its.filter(i => i.kind === 'magnet' || i.kind === 'aura' || i.kind === 'dash').length; sides[sd].sh += its.filter(i => i.kind === 'shard').length; sides[sd].wm.push(its.filter(i => i.kind === 'waymark').length); }
    out.sides = sides; out.forks = w.pieces.filter(p => p.type === 'fork').length;
    // the classic game's generator is untouched
    const c = new World(TRACK); c.seed = 0; c.reset(); c.extend(60000); out.classic = [...new Set(c.items.map(i => i.kind))].sort().join();
    return out;
  });
  const S = W.seeds;
  T('with extras the world has coins, hazards, signs, ' + Object.keys(S[0].kinds).join(', ') + ' (3 seeds, 90 000 units each); every skill pattern (' + S[0].patterns + ' of 5) appears', S.every(s => ['shard', 'magnet', 'aura', 'dash', 'waymark', 'coin', 'crate', 'barrier', 'over'].every(k => s.kinds[k] > 0)) && S.every(s => s.patterns === 5), JSON.stringify(S.map(s => s.kinds)));
  T('power-ups are sparse and fair: at least 2400 units apart on a road (' + S.map(s => s.minPU).join(', ') + '), none in the first 700 units, none and no shard within 60 units of a hazard in its lane (' + S.map(s => s.nearHaz).join(', ') + ')', S.every(s => s.minPU >= 2400 && s.puBefore700 === 0 && s.nearHaz === 0), '');
  T('the skill patterns come in gradually (none earlier than its intro distance: ' + S.map(s => s.early.length).join(', ') + ' early), and every hazard is at least ' + Math.min(...S.map(s => s.minGap)) + ' units after the last one of the previous pattern; no hazard in the 390 units before a junction (' + S.map(s => s.atFork).join(', ') + ')', S.every(s => s.early.length === 0 && s.minGap >= 190 && s.atFork === 0), JSON.stringify(S.map(s => s.early)));
  T('both branches of ' + W.forks + ' junctions get power-ups (' + W.sides.left.pu + ' left, ' + W.sides.right.pu + ' right) and shards (' + W.sides.left.sh + ' / ' + W.sides.right.sh + '), and every branch road has exactly one Golden Waymark, placed at a hazard (a jump, a slide or a free lane)',
    W.forks >= 8 && W.sides.left.pu >= 3 && W.sides.right.pu >= 3 && W.sides.left.sh >= 5 && W.sides.right.sh >= 5 && W.sides.left.wm.every(n => n === 1) && W.sides.right.wm.every(n => n === 1) && S.every(s => s.wayWithoutHazard === 0), JSON.stringify({ l: W.sides.left.wm, r: W.sides.right.wm }));

  // ================================================================ 2. never unavoidable: every skill pattern and waymark spot, from each lane, at the top speed and in a dash
  const AV = await pg.evaluate(() => {
    const g = __wf, results = [], pats = Object.assign({}, PATTERNS_X); for (const k in WAYMARKS) pats['wm_' + k] = WAYMARKS[k];
    for (const [name, P] of Object.entries(pats)) for (const lane of [-1, 0, 1]) for (const speed of [220, 280, 340, 'dash']) {
      const dash = speed === 'dash'; H.setup(lane, dash ? 340 : speed); if (dash) { g.pk.t.dash = 9; g.pk.tot.dash = 9; g.pk.dashK = 1; }
      for (const [kind, dz, ln, hh] of P.items) H.put(kind, 500 + dz, ln, hh === undefined ? 12 : hh);
      const endZ = 500 + P.last + 350; let f = 0; while (g.p.z < endZ && g.state === 'play' && f < 2400) { H.bot(); g.advance(1 / 60); f++; }
      results.push({ name, lane, speed, ok: g.state === 'play' });
    }
    return results;
  });
  T('every skill pattern and waymark spot (' + new Set(AV.map(r => r.name)).size + ' of them) is avoidable from each of the 3 lanes at 220, 280 and 340 units/s and in a dash (' + AV.length + ' runs, ' + AV.filter(r => !r.ok).length + ' failed)', AV.length === 108 && AV.every(r => r.ok), JSON.stringify(AV.filter(r => !r.ok)));

  // ================================================================ 3. power-ups
  const M = await pg.evaluate(() => {
    const out = {}; let g = H.setup();
    // control: without the magnet only the middle lane's coins are collected
    H.put('coin', 70, 0); H.put('coin', 90, -1); H.put('coin', 110, 1); H.run(60); out.control = g.coins;
    g = H.setup(); const mag = H.put('magnet', 20, 0); const c = [H.put('coin', 70, 0), H.put('coin', 90, -1), H.put('coin', 110, 1), H.put('coin', 130, -1), H.put('coin', 100, 1.9), H.put('coin', 330, 0)];
    H.run(4); out.picked = g.pk.t.magnet; out.tot = g.pk.tot.magnet; out.powerups = g.pk.powerups; out.pickedFlag = mag.taken;
    H.run(26); out.coinsWith = g.coins; out.farMoved = c[5].z !== g.p.z + 330 - 0 && c[5].z !== 330 ? 'moved' : 'still'; out.far2 = { x: c[4].x, taken: !!c[4].taken };
    out.tAfter = +g.pk.t.magnet.toFixed(2);
    // it ends on time: 8 s after the pickup, once (one 'expire' sound), and then nothing is pulled
    const e0 = g.sfx.counts.expire || 0; H.run(480); out.expired = g.pk.t.magnet; out.expireSound = (g.sfx.counts.expire || 0) - e0;
    const lateCoin = H.put('coin', 120, 1); H.run(40); out.lateCoin = !!lateCoin.taken;
    // a coin collected while pulled counts once, for the score and for a coin mission
    g = H.setup(); g.pk.save.missions.idx = 0; g.pk.reset(); g.pk.t.magnet = g.pk.tot.magnet = 8; H.put('coin', 60, 0); H.run(30); out.once = { coins: g.coins, mission: g.pk.mission.progress };
    return out;
  });
  T('MAGNET: picking it up starts 8 s (' + M.picked + ' s, one power-up); the coins on the sides (lanes -1 and +1) glide in and are collected (' + M.coinsWith + ' of 4 against ' + M.control + ' of 3 without it: only the middle lane), a coin 1.9 lanes out and one beyond 150 units are left alone, it ends on time (' + M.expired + ' after 8 s, one sound), and after that nothing is pulled',
    M.picked > 7.9 && M.picked <= 8 && M.tot === 8 && M.powerups === 1 && M.pickedFlag && M.control === 1 && M.coinsWith === 4 && M.far2.taken === false && Math.abs(M.far2.x - 1.9 * 0.62) < 1e-9 && M.expired === 0 && M.expireSound === 1 && !M.lateCoin && M.once.coins === 1 && M.once.mission === 1, JSON.stringify(M));

  const A = await pg.evaluate(() => {
    const out = {}; let g = H.setup(); const crash0 = g.sfx.counts.crash || 0;
    H.put('aura', 20, 0); const c1 = H.put('crate', 70, 0), c2 = H.put('crate', 320, 0); H.run(4); out.start = g.pk.t.aura; const b0 = g.sfx.counts.auraBreak || 0;
    H.run(16); out.afterFirst = { alive: g.state === 'play', aura: g.pk.t.aura, hazardGone: !!c1.taken, crash: (g.sfx.counts.crash || 0) - crash0, breaks: (g.sfx.counts.auraBreak || 0) - b0 };
    H.run(60); out.secondHit = g.state;
    // it times out after 15 s if no hazard is hit; a second aura picked up while one is on only refreshes it (still one hit)
    g = H.setup(); H.put('aura', 10, 0); H.run(3); g.pk.t.aura = 4; H.put('aura', 30, 0); H.run(8); out.refresh = { t: +g.pk.t.aura.toFixed(1), tot: g.pk.tot.aura };
    const c3 = H.put('crate', 120, 0), c4 = H.put('crate', 330, 0); H.run(30); out.firstOfTwo = g.state; H.run(60); out.secondOfTwo = g.state;
    g = H.setup(); H.put('aura', 10, 0); H.run(3); H.run(60 * 14); out.t14 = +g.pk.t.aura.toFixed(1); H.run(70); out.t15 = g.pk.t.aura; out.expireSound = g.sfx.counts.expire > 0;
    // a twin pair: the aura takes one crate, the other lane's crate is a different hazard (here the runner dodges it by steering)
    g = H.setup(); g.pk.t.aura = g.pk.tot.aura = 15; const ha = H.put('crate', 60, 0); H.run(14); out.hazardTaken = !!ha.taken; out.noRepeat = g.state === 'play' && g.pk.t.aura === 0;
    return out;
  });
  T('AURA: 15 s, and exactly ONE hit: the first crate is destroyed and the run goes on (alive ' + A.afterFirst.alive + ', one auraBreak sound, no crash), the aura is gone (' + A.afterFirst.aura + ') so the second crate ends the run (' + A.secondHit + '); a second aura picked up while one is on only refreshes it (' + A.refresh.t + ' s left: still one hit: ' + A.firstOfTwo + ' then ' + A.secondOfTwo + '); without a hit it times out at 15 s (' + A.t14 + ' s left after 14 s, 0 after 15)',
    A.start > 14.9 && A.start <= 15 && A.afterFirst.alive && A.afterFirst.aura === 0 && A.afterFirst.hazardGone && A.afterFirst.crash === 0 && A.afterFirst.breaks === 1 && A.secondHit === 'over' && A.refresh.t >= 14 && A.refresh.tot === 15 && A.firstOfTwo === 'play' && A.secondOfTwo === 'over' && A.t14 > 0.5 && A.t15 === 0 && A.expireSound && A.hazardTaken && A.noRepeat, JSON.stringify(A));

  const D = await pg.evaluate(() => {
    const out = {}; let g = H.setup();
    const z0 = () => g.p.z; H.run(60); const base = g.p.z; H.run(60); out.baseDz = +(g.p.z - base).toFixed(1);
    g = H.setup(); H.put('dash', 10, 0); H.run(4); out.start = g.pk.t.dash; H.run(40); const z1 = g.p.z, sp1 = g.p.speed; H.run(60); out.dashDz = +(g.p.z - z1).toFixed(1); out.speedField = g.p.speed; out.mulMax = g.pk.speedMul;
    // it ends at 3.5 s, the boost eases out, and the speed of the run itself was never touched
    H.run(60 * 2); out.t = g.pk.t.dash; H.run(90); out.k = g.pk.dashK; out.speedAfter = g.p.speed;
    // the reward: a clean dash pays 25 plus 10 per hazard passed; a dash cut short by a hit does not pay the 25
    g = H.setup(); g.pk.t.dash = g.pk.tot.dash = 3.5; for (let k = 0; k < 3; k++) H.put('crate', 150 + k * 260, 0); const b0 = g.score() - g.pk.bonus;       /* (260: a typical gap between two patterns, the least is 195) */
    for (let i = 0; i < 480 && g.state === 'play'; i++) { H.bot(); g.advance(1 / 60); } out.clean = { passed: g.pk.dashPassed, bonus: g.pk.bonus, state: g.state, dashT: g.pk.t.dash };
    g = H.setup(); g.pk.t.dash = g.pk.tot.dash = 3.5; g.pk.t.aura = g.pk.tot.aura = 15; H.put('crate', 100, 0); H.put('crate', 260, 0); for (let i = 0; i < 300 && g.state === 'play'; i++) { if (i > 30 && i < 40) g.jump(); g.advance(1 / 60); }
    out.cutShort = { clean: g.pk.dashClean, bonus: g.pk.bonus };
    return out;
  });
  const ratio = D.dashDz / D.baseDz;
  T('DASH: 3.5 s, +32 % forward speed once built up (' + D.dashDz + ' units/s against ' + D.baseDz + ': x' + ratio.toFixed(2) + ', never more than x' + D.mulMax.toFixed(2) + '), the run\'s own speed is untouched (' + D.speedField + ' units/s), it ends on time and the boost fades (k ' + D.k.toFixed(2) + '); a clean dash pays (' + D.clean.bonus + ' points for 3 crates passed), one cut short by a hit does not get the completion bonus (clean ' + D.cutShort.clean + ')',
    D.start > 3.4 && D.start <= 3.5 && ratio > 1.25 && ratio < 1.36 && D.mulMax <= 1.32 + 1e-9 && D.speedField === 340 && D.t === 0 && D.k < 0.02 && D.speedAfter === 340 && D.clean.state === 'play' && D.clean.bonus >= 25 + 30 && D.cutShort.clean === false && D.cutShort.bonus < 25 + 10, JSON.stringify(D));

  const C = await pg.evaluate(() => {
    const out = {}; let g = H.setup();
    H.put('magnet', 10, 0); H.put('aura', 25, 0); H.put('dash', 40, 0); H.run(14); out.all = { ...g.pk.t }; out.mulOk = g.pk.speedMul <= 1.32 + 1e-9;
    H.put('magnet', 20, 0); H.run(4); out.refreshed = g.pk.t.magnet; out.tot = { ...g.pk.tot };
    let mulMax = 1; for (let i = 0; i < 700; i++) { g.advance(1 / 60); mulMax = Math.max(mulMax, g.pk.speedMul); } out.mulMax = mulMax; out.kMax = g.pk.dashK;
    out.afterAll = { ...g.pk.t };
    // game over clears every effect at once
    g = H.setup(); g.pk.t.magnet = g.pk.tot.magnet = 8; g.pk.t.aura = g.pk.tot.aura = 15; g.pk.t.dash = g.pk.tot.dash = 3.5; g.pk.dashK = 1; g.die(); out.dead = { ...g.pk.t, k: g.pk.dashK, state: g.state };
    return out;
  });
  T('no contradictory states: the three effects run side by side (magnet ' + C.all.magnet.toFixed(1) + ', aura ' + C.all.aura.toFixed(1) + ', dash ' + C.all.dash.toFixed(1) + '), picking the same kind again only restarts its own clock (never beyond its full length), the speed multiplier never exceeds x1.32, the magnet and the dash end by themselves (' + JSON.stringify(C.afterAll) + '), and a game over clears them all',
    C.all.magnet > 6 && C.all.aura > 13 && C.all.dash > 2.5 && C.mulOk && C.refreshed > 7.5 && C.tot.magnet === 8 && C.mulMax <= 1.32 + 1e-9 && C.kMax <= 1 && C.afterAll.magnet === 0 && C.afterAll.dash === 0 && C.dead.magnet === 0 && C.dead.aura === 0 && C.dead.dash === 0 && C.dead.k === 0 && C.dead.state === 'over', JSON.stringify(C));

  const PS = await pg.evaluate(() => {
    const out = {}; const g = H.setup(); g.pk.t.magnet = g.pk.tot.magnet = 8; g.pk.t.aura = g.pk.tot.aura = 15; g.pk.t.dash = g.pk.tot.dash = 3.5; const m = g.pk.mission; m.progress = 0; H.put('coin', 400, 0);
    H.run(60); const snap = () => ({ t: { ...g.pk.t }, time: g.time, z: g.p.z, prog: g.pk.mission.progress, pops: g.pk.pops.length, k: g.pk.dashK });
    out.before = snap(); g.state = 'pause'; for (let i = 0; i < 600; i++) g.advance(1 / 60); out.paused = snap();
    g.state = 'play'; H.run(60); out.after = snap();
    out.dtMagnet = [out.before.t.magnet - out.paused.t.magnet, out.paused.t.magnet - out.after.t.magnet];
    return out;
  });
  T('PAUSE freezes everything gameplay-related: after 10 s paused the three timers, the game clock, the distance, the mission and the dash blend are exactly as they were (magnet ' + PS.before.t.magnet.toFixed(2) + ' -> ' + PS.paused.t.magnet.toFixed(2) + '), and they run again on resume (' + PS.after.t.magnet.toFixed(2) + ')',
    PS.paused.t.magnet === PS.before.t.magnet && PS.paused.t.aura === PS.before.t.aura && PS.paused.t.dash === PS.before.t.dash && PS.paused.time === PS.before.time && PS.paused.z === PS.before.z && PS.paused.prog === PS.before.prog && PS.paused.k === PS.before.k && Math.abs(PS.dtMagnet[1] - 1) < 0.05, JSON.stringify(PS.dtMagnet));

  // ================================================================ 4. collectibles are counted once, shards and waymarks are saved
  const Q = await pg.evaluate(() => {
    const out = {}; const g = H.setup(); localStorage.removeItem('wayfarer.progress'); g.pk.save = Perks.defaults(); g.pk.reset();
    const its = { coin: H.put('coin', 40, 0), shard: H.put('shard', 70, 0), wm: H.put('waymark', 100, 0, 12, { seg: 'forestB' }), mag: H.put('magnet', 130, 0), aura: H.put('aura', 160, 0), dash: H.put('dash', 190, 0) };
    H.run(70); out.first = { coins: g.coins, shards: g.pk.shards, wm: g.pk.waymarks, powerups: g.pk.powerups, taken: Object.values(its).every(i => i.taken), save: JSON.stringify(g.pk.save), bonus: g.pk.bonus };
    // go back over them: nothing counts again (also with the magnet on, which pulls only untaken coins)
    g.p.z -= 220; g.pk.t.magnet = 8; H.run(70); out.again = { coins: g.coins, shards: g.pk.shards, wm: g.pk.waymarks, powerups: g.pk.powerups, save: JSON.stringify(g.pk.save), bonus: g.pk.bonus };
    out.stored = localStorage.getItem('wayfarer.progress');
    // the waymark spots need the move: a standing runner under a high waymark does not get it, a jump at the right time does; a slide waymark is only reachable by sliding
    let g2 = H.setup(); const wh = H.put('waymark', 80, 0, 52), cr = H.put('crate', 80, 0); const wh0 = g2.pk.waymarks; H.run(60); out.noJump = { dead: g2.state === 'over', got: wh.taken };
    g2 = H.setup(); const wj = H.put('waymark', 100, 0, 52), cj = H.put('crate', 100, 0); let jumped = false; for (let i = 0; i < 80 && g2.state === 'play'; i++) { if (!jumped && cj.z - g2.p.z < 95) { g2.jump(); jumped = true; } g2.advance(1 / 60); } out.jump = { alive: g2.state === 'play', got: !!wj.taken };
    g2 = H.setup(); const ws = H.put('waymark', 100, 0, 5), gs = H.put('over', 100, 0); let slid = false; for (let i = 0; i < 80 && g2.state === 'play'; i++) { if (!slid && gs.z - g2.p.z < 60) { g2.slideKey(); slid = true; } g2.advance(1 / 60); } out.slide = { alive: g2.state === 'play', got: !!ws.taken };
    return out;
  });
  T('every collectible is counted once: coin, shard, waymark and the three power-ups (' + JSON.stringify({ c: Q.first.coins, s: Q.first.shards, w: Q.first.wm, p: Q.first.powerups }) + '), and running back over them changes nothing (' + JSON.stringify({ c: Q.again.coins, s: Q.again.shards, w: Q.again.wm, p: Q.again.powerups }) + '); the shard and the waymark (route forest, +50 points) are saved: ' + Q.first.save,
    Q.first.coins === 1 && Q.first.shards === 1 && Q.first.wm === 1 && Q.first.powerups === 3 && Q.first.taken && JSON.parse(Q.first.save).shards === 1 && JSON.parse(Q.first.save).waymarks.forest === 1 && Q.first.bonus === 50 && JSON.stringify(Q.again) === JSON.stringify({ coins: 1, shards: 1, wm: 1, powerups: 3, save: Q.first.save, bonus: 50 }) && Q.stored === Q.first.save, JSON.stringify(Q.again));
  T('the Golden Waymarks need a deliberate move: a high one is out of reach for the runner who just runs into its crate (dead ' + Q.noJump.dead + ', got it ' + Q.noJump.got + '), a well-timed jump over the crate gets it (' + Q.jump.got + '), the one under a gate is only reachable by sliding (' + Q.slide.got + ')', Q.noJump.dead && !Q.noJump.got && Q.jump.alive && Q.jump.got && Q.slide.alive && Q.slide.got, JSON.stringify([Q.noJump, Q.jump, Q.slide]));

  // ================================================================ 5. saved progress: survives a reload, and a corrupt save is harmless
  await pg.evaluate(() => { localStorage.setItem('wayfarer.progress', JSON.stringify({ v: 1, shards: 12, waymarks: { forest: 2, coastRun: 1 }, missions: { done: 4, idx: 4 } })); });
  await pg.reload({ timeout: 90000 }); await pg.waitForFunction(() => window.__wf, null, { timeout: 60000 }); await pg.waitForTimeout(400); await pg.evaluate(HELPERS);
  const RL = await pg.evaluate(() => {
    const g = H.setup(); const out = { loaded: JSON.stringify(g.pk.save), mission: { kind: g.pk.mission.kind, goal: g.pk.mission.goal } };
    H.put('shard', 40, 0); H.run(30); out.after = g.pk.save.shards; out.stored = JSON.parse(localStorage.getItem('wayfarer.progress')).shards; out.run = g.pk.shards; return out;
  });
  T('the saved progress survives a reload (12 shards, waymarks per route, 4 missions done: ' + RL.loaded + '), the next mission is the one the counter says (' + RL.mission.kind + ' ' + RL.mission.goal + '), a new shard makes 13 in the page and in storage, and this run counted only its own (' + RL.run + ')', JSON.parse(RL.loaded).shards === 12 && JSON.parse(RL.loaded).waymarks.coastRun === 1 && JSON.parse(RL.loaded).missions.done === 4 && RL.mission.kind === 'distance' && RL.mission.goal === 550 && RL.after === 13 && RL.stored === 13 && RL.run === 1, JSON.stringify(RL));
  const BAD = await pg.evaluate(() => {
    const cases = ['not json {{{', 'null', '[]', '"x"', '123', '{"shards":"many","waymarks":[1,2],"missions":7}', '{"shards":-5,"waymarks":{"ok":3,"bad key!":9,"x":-2},"missions":{"done":1e30,"idx":-1}}', '{"shards":1e400,"missions":{"done":"3","idx":"2"}}', JSON.stringify({ shards: 5, waymarks: Object.fromEntries(Array.from({ length: 80 }, (_, i) => ['r' + i, 1])) })];
    const out = cases.map(c => { localStorage.setItem('wayfarer.progress', c); const s = Perks.load(); return { c: c.slice(0, 40), shards: s.shards, wm: Object.keys(s.waymarks).length, done: s.missions.done, idx: s.missions.idx, ok: Number.isInteger(s.shards) && s.shards >= 0 && s.missions.done >= 0 && s.missions.idx >= 0 && s.v === 1 }; });
    // storage that throws (private mode, blocked): load gives the defaults and persisting is silent
    const gi = Storage.prototype.getItem, si = Storage.prototype.setItem; Storage.prototype.getItem = () => { throw new Error('blocked'); }; Storage.prototype.setItem = () => { throw new Error('blocked'); };
    let threw = false, d = null; try { d = Perks.load(); const g = H.setup(); g.pk.persist(); H.put('shard', 40, 0); H.run(30); } catch (e) { threw = true; } finally { Storage.prototype.getItem = gi; Storage.prototype.setItem = si; }
    localStorage.removeItem('wayfarer.progress'); return { out, threw, d };
  });
  T('corrupt or missing saved data is replaced field by field by safe values (' + BAD.out.length + ' bad saves: text, null, arrays, wrong types, negatives, huge, 80 route keys: shards ' + BAD.out.map(o => o.shards).join(',') + '), and a storage that throws neither breaks loading nor playing',
    BAD.out.every(o => o.ok) && BAD.out[0].shards === 0 && BAD.out[6].shards === 0 && BAD.out[6].idx === 0 && BAD.out[6].done === 1e9 && BAD.out[6].wm === 2 && BAD.out[8].wm <= 24 && BAD.out[7].shards === 0 && BAD.out[7].done === 3 && !BAD.threw && BAD.d && BAD.d.shards === 0, JSON.stringify(BAD.out.map(o => [o.shards, o.wm, o.done, o.idx])));

  // ================================================================ 6. missions
  const MI = await pg.evaluate(() => {
    const out = {}; const fresh = idx => { const g = H.setup(); g.pk.save = Perks.defaults(); g.pk.save.missions.idx = idx; g.pk.reset(); return g; };
    let g = fresh(0); out.m0 = { kind: g.pk.mission.kind, goal: g.pk.mission.goal }; for (let k = 0; k < 14; k++) H.put('coin', 30 + k * 28, 0);
    H.run(30); out.half = g.pk.mission.progress; for (let f = 0; f < 900 && !g.pk.mission.done; f++) g.advance(1 / 60); out.coinDone = { coins: g.coins, progress: g.pk.mission.progress, done: g.pk.mission.done, bonus: g.pk.bonus, reward: g.pk.rewardShards, save: JSON.parse(JSON.stringify(g.pk.save)), flash: g.pk.flash > 0, missionSound: g.sfx.counts.mission || 0 };
    // the same event twice counts once; after the reward more coins change nothing; the next mission appears 3 s later
    const before = g.pk.bonus; g.pk.ev('coins'); g.pk.ev('coins'); out.dup = g.pk.bonus === before ? 'once' : 'paid again';
    g = fresh(0); H.put('coin', 30, 0); for (let k = 0; k < 11; k++) g.pk.coin(); const p0 = g.pk.mission.progress; H.run(20); out.noDouble = { before: p0, after: g.pk.mission.progress, coins: g.coins };
    g = fresh(0); for (let k = 0; k < 12; k++) H.put('coin', 30 + k * 25, 0); H.run(120); const done1 = g.pk.mission.done; H.run(60 * 4); out.next = { kind: g.pk.mission.kind, goal: g.pk.mission.goal, done1, idx: g.pk.save.missions.idx, missionsDone: g.pk.missionsDone };
    // the distance mission: 400 m, monotone, once
    g = fresh(1); let prev = -1, mono = true; for (let i = 0; i < 900 && g.state === 'play' && !g.pk.mission.done; i++) { g.advance(1 / 60); if (g.pk.mission.progress < prev) mono = false; prev = g.pk.mission.progress; } out.dist = { goal: g.pk.mission.goal, done: g.pk.mission.done, mono, at: Math.floor(g.p.z / 10), bonus: g.pk.bonus, saveDone: g.pk.save.missions.done }; for (let i = 0; i < 60; i++) g.advance(1 / 60); out.dist.doneStill = g.pk.save.missions.done;
    // the special ones: a shard, near misses, a power-up
    g = fresh(2); out.sp0 = { kind: g.pk.mission.kind, goal: g.pk.mission.goal }; H.put('shard', 40, 0); H.run(30); out.sp0Done = g.pk.mission.done;
    g = fresh(5); out.sp1 = { kind: g.pk.mission.kind, goal: g.pk.mission.goal }; g.pk.ev('near'); g.pk.ev('near'); const mid = g.pk.mission.progress; g.pk.ev('near'); out.sp1Done = [mid, g.pk.mission.done, g.pk.mission.progress]; g.pk.ev('near'); out.sp1Over = g.pk.mission.progress;
    g = fresh(8); out.sp2 = { kind: g.pk.mission.kind, goal: g.pk.mission.goal }; H.put('dash', 30, 0); H.run(30); out.sp2Done = g.pk.mission.done;
    // harder with every lap of three
    out.tiers = [0, 3, 6, 30].map(i => { const t = fresh(i); return t.pk.mission.goal; }); out.tiersD = [1, 4, 7, 40].map(i => { const t = fresh(i); return t.pk.mission.goal; });
    return out;
  });
  T('MISSIONS: the first is "collect 12 coins" (' + JSON.stringify(MI.m0) + '): progress follows the coins taken (' + MI.half + ' after the first few), at 12 it is complete once: +100 points, +1 shard saved, counters ' + JSON.stringify(MI.coinDone.save.missions) + ', the completion sound once; further events change nothing (no double count: ' + MI.noDouble.before + ' = ' + MI.noDouble.after + '); the next mission (' + MI.next.kind + ' ' + MI.next.goal + ') appears 3 s later',
    MI.m0.kind === 'coins' && MI.m0.goal === 12 && MI.coinDone.progress === 12 && MI.coinDone.done && MI.coinDone.bonus === 100 && MI.coinDone.reward === 1 && MI.coinDone.save.shards === 1 && MI.coinDone.save.missions.done === 1 && MI.coinDone.save.missions.idx === 1 && MI.coinDone.missionSound === 1 && MI.noDouble.after === 11 + 1 && MI.noDouble.coins === 1 && MI.next.kind === 'distance' && MI.next.goal === 400 && MI.next.done1 === true && MI.next.idx === 1, JSON.stringify([MI.coinDone, MI.noDouble, MI.next]));
  T('the distance mission is 400 m, only ever grows, and completes once at the right distance (' + MI.dist.at + ' m); the special ones: a shard (' + MI.sp0Done + '), 3 near misses (' + JSON.stringify(MI.sp1Done) + ', never past its goal: ' + MI.sp1Over + '), a power-up (' + MI.sp2Done + '); they grow with every lap of three (coins ' + MI.tiers.join(', ') + ' m ' + MI.tiersD.join(', ') + ')',
    MI.dist.goal === 400 && MI.dist.done && MI.dist.mono && MI.dist.at >= 400 && MI.dist.at <= 410 && MI.dist.bonus === 100 && MI.dist.saveDone === 1 && MI.dist.doneStill === 1 && MI.sp0.kind === 'shard' && MI.sp0Done && MI.sp1.kind === 'near' && MI.sp1.goal === 3 && MI.sp1Done[0] === 2 && MI.sp1Done[1] === true && MI.sp1Over === 3 && MI.sp2.kind === 'power' && MI.sp2Done && MI.tiers.join() === '12,18,24,60' && MI.tiersD.join() === '400,550,700,2000', '');
  const MS = await pg.evaluate(() => {
    const out = {}; const g = H.setup(); g.pk.save = Perks.defaults(); g.pk.reset(); for (let k = 0; k < 5; k++) g.pk.coin(); out.a = g.pk.mission.progress;
    g.state = 'pause'; g.advance(1 / 60); g.state = 'play'; out.pause = g.pk.mission.progress;                                   // a pause changes nothing
    g.die(); g.start(); out.restart = { progress: g.pk.mission.progress, goal: g.pk.mission.goal, kind: g.pk.mission.kind, done: g.pk.save.missions.done, idx: g.pk.save.missions.idx, runDone: g.pk.missionsDone };   // run progress is gone, the unfinished mission is offered again
    for (let k = 0; k < 12; k++) g.pk.coin(); const saved1 = JSON.stringify(g.pk.save); g.die(); g.start(); out.afterDone = { saved: JSON.stringify(g.pk.save) === saved1, idx: g.pk.save.missions.idx, kind: g.pk.mission.kind, shards: g.pk.save.shards, run: g.pk.shards + g.pk.rewardShards };
    return out;
  });
  T('missions survive pause, restart and game over without corruption: 5 of 12 stays 5 through a pause (' + MS.pause + '); after a game over the run progress is gone (' + MS.restart.progress + ') but the unfinished mission is offered again (' + MS.restart.kind + ' ' + MS.restart.goal + ') and nothing was credited (' + MS.restart.done + ' done); a completed one is credited once, saved (idx ' + MS.afterDone.idx + ') and the next run starts the next mission (' + MS.afterDone.kind + ')',
    MS.a === 5 && MS.pause === 5 && MS.restart.progress === 0 && MS.restart.goal === 12 && MS.restart.kind === 'coins' && MS.restart.done === 0 && MS.restart.idx === 0 && MS.restart.runDone === 0 && MS.afterDone.saved && MS.afterDone.idx === 1 && MS.afterDone.kind === 'distance' && MS.afterDone.shards === 1 && MS.afterDone.run === 0, JSON.stringify(MS));

  // ================================================================ 7. near misses and sequence bonuses
  const NM = await pg.evaluate(() => {
    const out = {};
    // beside a crate by 0.05 (the runner was headed for it): a near miss, once, at three frame rates and at the top speed with and without a dash
    const beside = (off, dt, dash) => { const g = H.setup(); g.p.x = 0.29 + off; if (dash) { g.pk.t.dash = 9; g.pk.tot.dash = 9; g.pk.dashK = 1; } const cr = H.put('crate', 200, 0); const early = []; const n = Math.ceil(2.2 / dt); for (let i = 0; i < n && g.state === 'play'; i++) { g.advance(dt); if (i === Math.floor(0.25 / dt)) early.push(g.pk.nearMisses); } return { n: g.pk.nearMisses, bonus: g.pk.bonus, passed: !!cr.passed, alive: g.state === 'play', early: early[0] }; };
    out.rates = [1 / 20, 1 / 30, 1 / 60, 1 / 144].map(dt => beside(0.05, dt, false)); out.dash = beside(0.05, 1 / 60, true); out.wide = beside(0.16, 1 / 60, false);
    // standing in the next lane (0.62 away) is no near miss; a crate far ahead gives nothing until it is passed
    let g = H.setup(1); H.put('crate', 150, 0); H.run(90); out.nextLane = g.pk.nearMisses;
    g = H.setup(); g.p.x = 0.34; H.put('crate', 600, 0); H.run(20); out.distant = g.pk.nearMisses;
    // a repeated call for the same hazard cannot pay twice
    g = H.setup(); g.p.x = 0.34; const c1 = H.put('crate', 100, 0); H.run(40); const n1 = g.pk.nearMisses, b1 = g.pk.bonus; g.pk.passed(c1, OBST.crate, 0.34, 24); g.pk.passed(c1, OBST.crate, 0.34, 24); out.twice = [n1, g.pk.nearMisses, b1, g.pk.bonus];
    // jumping over: a hair above is a near miss, a high jump is not; sliding under a gate never is
    g = H.setup(); g.pk.xh = [0, 0, 0, 0]; const ja = H.put('barrier', 100, 0); g.p.z = ja.z; g.p.jy = 10; g.p.slide = 0; g.pk.passed(ja, OBST.barrier, 0, 24); out.jumpLow = g.pk.nearMisses;
    g = H.setup(); const jb = H.put('crate', 100, 0); g.p.z = jb.z; g.p.jy = 30; g.pk.passed(jb, OBST.crate, 0, 24); out.jumpHigh = g.pk.nearMisses;
    g = H.setup(); const sg = H.put('over', 100, 0); g.p.z = sg.z; g.p.jy = 0; g.p.slide = 0.3; g.pk.passed(sg, OBST.over, 0, 8); out.slideUnder = g.pk.nearMisses;
    return out;
  });
  T('NEAR MISS: squeezing past a crate by 0.05 (having been headed for it) pays once (+5, a text and a sound): at 20, 30, 60 and 144 frames a second (' + NM.rates.map(r => r.n).join(', ') + ') and at the top speed in a dash (' + NM.dash.n + '); not before the hazard is passed (' + NM.rates.map(r => r.early).join(', ') + ' at 0.25 s), not for a crate 0.16 away (' + NM.wide.n + '), not for standing in the next lane (' + NM.nextLane + '), not for a distant crate (' + NM.distant + '), and a second report of the same hazard changes nothing (' + NM.twice.join(', ') + ')',
    NM.rates.every(r => r.n === 1 && r.bonus === 5 && r.passed && r.alive && r.early === 0) && NM.dash.n === 1 && NM.dash.bonus === 5 && NM.wide.n === 0 && NM.nextLane === 0 && NM.distant === 0 && NM.twice[0] === 1 && NM.twice[1] === 1 && NM.twice[2] === 5 && NM.twice[3] === 5, JSON.stringify(NM.rates));
  T('jumping just over a hazard (10 above a barrier of 9) is a near miss (' + NM.jumpLow + '), a high jump (' + NM.jumpHigh + ') and sliding under a gate (' + NM.slideUnder + ') are not', NM.jumpLow === 1 && NM.jumpHigh === 0 && NM.slideUnder === 0, '');
  const CB = await pg.evaluate(() => {
    const out = {}; let g = H.setup(); for (const [kind, dz, ln, hh] of PATTERNS_X.crateBarrier.items) H.put(kind, 500 + dz, ln, hh === undefined ? 12 : hh, OBST[kind] ? { combo: 'CB', comboN: 2 } : undefined); for (let i = 0; i < 400 && g.state === 'play'; i++) { H.bot(); g.advance(1 / 60); }
    out.clean = { combos: g.pk.combos, bonus: g.pk.bonus - g.pk.nearMisses * NEAR.bonus, alive: g.state === 'play' };
    // a sequence in which the aura took a hit pays nothing; one that was passed is not paid twice
    g = H.setup(); g.pk.t.aura = g.pk.tot.aura = 15; const a = H.put('crate', 60, 0, 12, { combo: 'S', comboN: 2 }), b2 = H.put('barrier', 150, 0, 12, { combo: 'S', comboN: 2 }); H.run(20); out.absorbed = { aura: g.pk.t.aura, seq: g.pk.seq.S };
    for (let i = 0; i < 90 && g.state === 'play'; i++) { if (g.p.jy === 0 && b2.z - g.p.z < 95) g.jump(); g.advance(1 / 60); } out.afterAbsorb = { combos: g.pk.combos, alive: g.state === 'play' };
    g = H.setup(); const p1 = H.put('crate', 40, 0, 12, { combo: 'T', comboN: 2 }), p2 = H.put('crate', 80, 1, 12, { combo: 'T', comboN: 2 }); g.p.z = p2.z + 5; g.p.jy = 0; g.pk.passed(p1, OBST.crate, 0.62, 24); g.pk.passed(p2, OBST.crate, 0.62, 24); g.pk.passed(p2, OBST.crate, 0.62, 24); g.pk.passed(p1, OBST.crate, 0.62, 24); out.twice = { combos: g.pk.combos, bonus: g.pk.bonus };
    return out;
  });
  T('SKILL BONUS: a crate-then-barrier sequence passed cleanly pays +20 once (' + CB.clean.combos + '); if the aura took a hit in it, nothing (' + CB.afterAbsorb.combos + '); reporting the hazards twice does not pay twice (' + CB.twice.combos + ' sequence, ' + CB.twice.bonus + ' points)', CB.clean.combos === 1 && CB.clean.bonus === 20 && CB.clean.alive && CB.absorbed.aura === 0 && CB.absorbed.seq === -1 && CB.afterAbsorb.combos === 0 && CB.afterAbsorb.alive && CB.twice.combos === 1 && CB.twice.bonus === 20, JSON.stringify(CB));

  // ================================================================ 8. restart, game over, score
  const RS = await pg.evaluate(() => {
    const out = {}; let g = H.setup(); g.pk.save = Perks.defaults(); g.pk.reset(); H.put('shard', 30, 0); H.put('magnet', 60, 0); H.run(60); g.pk.bonus += 40; g.pk.nearMisses = 2; g.pk.waymarks = 1; g.pk.dashClean = false;
    out.score = { s: g.score(), expect: Math.floor(g.p.z / 10) + g.coins * 10 + g.pk.bonus };
    g.die(); out.over = { state: g.state, t: { ...g.pk.t }, shards: g.pk.shards, saved: g.pk.save.shards };
    g.start(); out.restart = { state: g.state, t: { ...g.pk.t }, shards: g.pk.shards, waymarks: g.pk.waymarks, near: g.pk.nearMisses, bonus: g.pk.bonus, saved: g.pk.save.shards, pops: g.pk.pops.length, k: g.pk.dashK, clean: g.pk.dashClean, score: g.score() };
    return out;
  });
  T('GAME OVER and RESTART: the score is distance + 10 per coin + the bonuses (' + RS.score.s + ' = ' + RS.score.expect + '); at game over every effect has ended; a restart starts a run from nothing (no effect, no run counts, no bonus, a clean dash) while the saved shards stay (' + RS.restart.saved + ')', RS.score.s === RS.score.expect && RS.over.state === 'over' && RS.over.t.magnet === 0 && RS.over.saved === 1 && RS.restart.state === 'play' && RS.restart.t.magnet === 0 && RS.restart.t.aura === 0 && RS.restart.t.dash === 0 && RS.restart.shards === 0 && RS.restart.waymarks === 0 && RS.restart.near === 0 && RS.restart.bonus === 0 && RS.restart.saved === 1 && RS.restart.pops === 0 && RS.restart.k === 0 && RS.restart.clean && RS.restart.score === 0, JSON.stringify(RS.restart));

  // ================================================================ 9. the 3D presentation: models, effects, HUD, sounds
  const V = await pg.evaluate(() => {
    const out = {}; const g = H.setup(), r = g.r, draw = () => { g.time += 1 / 60; r.draw(g); };
    for (const k of ['magnet', 'aura', 'dash', 'shard', 'waymark']) H.put(k, 120, k === 'magnet' || k === 'aura' ? -1 : 1, 12); H.put('shard', 150, 0, 36); H.put('waymark', 180, 0, 46);
    g.advance(1 / 60); draw(); out.used = { ...r.items.used }; out.dropped = r.items.dropped;
    // every collectible is its own mesh group with its own colours (not a coin), and animates with the game clock
    const y0 = r.items.pool.shard[0].position.y, rot0 = r.items.pool.waymark[0].rotation.y; g.time += 0.3; r.draw(g); out.animated = r.items.pool.shard[0].position.y !== y0 && r.items.pool.waymark[0].rotation.y !== rot0;
    // pickup effects: sparks and a ring appear at the pickup, then are gone
    const g2 = H.setup(); const sh = H.put('shard', 30, 0); for (let i = 0; i < 6; i++) { g2.advance(1 / 60); } r.draw(g2); const sparks = () => r.perk.sparks.filter(m => m.visible).length, rings = () => r.perk.rings.filter(m => m.visible).length; out.afterPickup = { sparks: sparks(), rings: rings() };
    g2.time += 1; r.draw(g2); out.later = { sparks: sparks(), rings: rings() };
    // the aura bubble: visible while it lasts, hidden after it breaks; the dash streaks and the wider view while it lasts; the magnet rings; all gone after a restart
    g2.pk.t.aura = g2.pk.tot.aura = 15; r.draw(g2); out.bubble = r.perk.bubble.visible; g2.pk.absorb({ kind: 'crate', z: g2.p.z + 5, x: g2.p.x, h: 12, combo: null }); r.draw(g2); out.bubbleAfter = r.perk.bubble.visible; out.breakRing = rings() > 0;
    g2.pk.t.dash = g2.pk.tot.dash = 3.5; g2.pk.dashK = 1; g2.time += 1; r.draw(g2); out.dash = { streaks: r.perk.streaks[0].visible, lines: r.perk.lines.filter(m => m.visible).length, fov: r.camera.fov };
    g2.pk.t.magnet = g2.pk.tot.magnet = 8; r.draw(g2); out.magnet = r.perk.mag[0].visible;
    g2.start(); r.draw(g2); out.reset = { bubble: r.perk.bubble.visible, streak: r.perk.streaks[0].visible, mag: r.perk.mag[0].visible, sparks: sparks(), fov: r.camera.fov };
    return out;
  });
  T('the five collectibles are drawn as five different models from their own pools (' + JSON.stringify(V.used) + ' placed, none dropped) and animate with the game clock; a pickup shows sparks and a ring that are gone a second later (' + V.afterPickup.sparks + ' sparks, ' + V.afterPickup.rings + ' ring -> ' + V.later.sparks + ', ' + V.later.rings + '); the aura is a bubble while it lasts and breaks with a ring (' + V.bubble + ' / ' + V.bubbleAfter + '), the dash adds streaks, speed lines and a wider view (fov ' + V.dash.fov.toFixed(1) + '), the magnet its rings; a restart clears all of it (fov ' + V.reset.fov + ')',
    V.used.magnet === 1 && V.used.aura === 1 && V.used.dash === 1 && V.used.shard === 2 && V.used.waymark === 2 && V.dropped === 0 && V.animated && V.afterPickup.sparks >= 8 && V.afterPickup.rings >= 1 && V.later.sparks === 0 && V.later.rings === 0 && V.bubble === true && V.bubbleAfter === false && V.breakRing && V.dash.streaks && V.dash.lines >= 10 && V.dash.fov > 66 && V.magnet && V.reset.bubble === false && V.reset.streak === false && V.reset.mag === false && V.reset.sparks === 0 && V.reset.fov === 62, JSON.stringify(V));
  const HU = await pg.evaluate(() => {
    const g = H.setup(), r = g.r, ui = r.ui, ctx = ui.ctx, rects = []; const fr = ctx.fillRect.bind(ctx);
    g.pk.t.magnet = 6; g.pk.tot.magnet = 8; g.pk.t.aura = 12; g.pk.tot.aura = 15; g.pk.t.dash = 2; g.pk.tot.dash = 3.5; g.pk.shards = 2; g.pk.save.shards = 14;
    ctx.fillRect = (x, y, w, h) => { rects.push([x, y, w, h, String(ctx.fillStyle)]); return fr(x, y, w, h); };
    ui.drawPerksHud(g); ctx.fillRect = fr;
    // the perks HUD (apart from the toasts and the completion plate, which appear briefly) stays in the top 36 px: sky, not road
    const hudBottom = Math.max(...rects.map(q => q[1] + q[3])); const left = rects.filter(q => q[0] < 70).length > 0, right = rects.filter(q => q[0] + q[2] > 250).length > 0;
    // the whole game screen draws without error in each state, with a mission flash and toasts
    const errs = []; g.pk.flash = 1.5; g.pk.toast('NEAR MISS +5', '#9fe8ff'); g.pk.toast('SHARD +1', '#c58bff'); for (const st of ['play', 'pause', 'over']) { g.state = st; g.overT = 1; try { ui.drawUI(g); } catch (e) { errs.push(st + ': ' + e.message); } }
    return { hudBottom, left, right, n: rects.length, errs };
  });
  T('the HUD keeps to the top-left (coins, shards of this run and saved), the top-right (mission progress) and the top-centre (one chip per effect with a bar and the seconds): everything within the top ' + HU.hudBottom + ' px of the 180, drawn without error in play, pause and game over', HU.hudBottom <= 36 && HU.left && HU.right && HU.n > 20 && HU.errs.length === 0, JSON.stringify(HU.errs));
  const SN = await pg.evaluate(async () => {
    const out = { fired: {}, voices: {} }; const g = H.setup(), c = g.sfx.counts, c0 = { ...c };
    H.put('shard', 30, 0); H.put('waymark', 60, 0); H.put('magnet', 90, 0); H.put('aura', 120, 0); H.put('dash', 150, 0); H.put('crate', 220, 0); H.run(110); g.p.x = 0.34; H.put('crate', 100, 0); g.p.x = 0.34; H.run(60);
    g.pk.t.magnet = 0.02; H.run(3); for (const k of ['shard', 'waymark', 'perk', 'auraBreak', 'expire', 'near']) out.fired[k] = (c[k] || 0) - (c0[k] || 0);
    for (const n of ['shard', 'waymark', 'perk', 'auraBreak', 'expire', 'near', 'combo', 'mission']) { const oc = new OfflineAudioContext(1, 44100 * 2, 44100), gn = oc.createGain(); gn.connect(oc.destination); GameAudio.voices[n](oc, gn, 0.01, n === 'perk' ? 'dash' : undefined); const d = (await oc.startRendering()).getChannelData(0); let pk = 0, bad = 0, last = 0; for (let i = 0; i < d.length; i++) { const v = d[i]; if (!isFinite(v)) bad++; pk = Math.max(pk, Math.abs(v)); if (Math.abs(v) > 0.003) last = i; } out.voices[n] = { peak: +pk.toFixed(3), bad, ends: +(last / 44100).toFixed(2) }; }
    return out;
  });
  T('each reward has its own sound, fired by the right event (' + JSON.stringify(SN.fired) + '), and every voice renders audible, finite, not clipping and ends by itself: ' + Object.entries(SN.voices).map(([n, v]) => n + ' ' + v.peak + ' / ' + v.ends + ' s').join(', '), SN.fired.shard === 1 && SN.fired.waymark === 1 && SN.fired.perk === 3 && SN.fired.auraBreak === 1 && SN.fired.expire >= 1 && SN.fired.near >= 0 && Object.values(SN.voices).every(v => v.peak > 0.04 && v.peak <= 1 && v.bad === 0 && v.ends < 2), JSON.stringify(SN.voices));

  // ================================================================ 10. a long run: the bot plays, pools stay bounded, nothing leaks across pauses and restarts
  const LR = await pg.evaluate(() => {
    const g = H.setup(), r = g.r, out = { restarts: 0, deaths: 0, maxPops: 0, maxItems: 0, maxPieces: 0, sfxActive: 0, drift: 0, pickups: { shard: 0, magnet: 0, aura: 0, dash: 0, waymark: 0, coin: 0 } }; let geo0 = -1, kids0 = r.scene.children.length, lastZ = 0, backwards = 0;
    g.start(); g.p.speed = 200; const key = c => g.onKey({ code: c, key: c, repeat: false, preventDefault() {} }, true);
    for (let f = 0; f < 60 * 60 * 6; f++) {
      if (g.state !== 'play') { out.deaths++; g.start(); out.restarts++; continue; }
      const w = g.world, p = g.p, F = w.openFork(); H.bot(); if (F && p.z > F.z0 - 340 && p.z < F.z0 - 280) { g.keys.left = F.uid % 2 === 0; g.keys.right = !g.keys.left; }
      if (f % 2500 === 1000) { g.state = 'pause'; for (let k = 0; k < 20; k++) g.advance(1 / 60); g.state = 'play'; }
      const z0 = p.z; g.advance(1 / 60); if (g.p.z < z0) backwards++;
      out.maxPops = Math.max(out.maxPops, g.pk.pops.length); out.maxItems = Math.max(out.maxItems, w.items.length); out.maxPieces = Math.max(out.maxPieces, w.pieces.length); out.sfxActive = Math.max(out.sfxActive, g.sfx.active);
      if (f % 6 === 0) { g.time += 0; r.draw(g); if (f >= 3000 && geo0 < 0) geo0 = r.renderer.info.memory.geometries; else if (geo0 >= 0 && (r.renderer.info.memory.geometries !== geo0 || r.scene.children.length !== kids0)) out.drift++; }
    }
    out.dropped = r.dropped + r.items.dropped; out.backwards = backwards; out.shardsSaved = g.pk.save.shards; out.missions = g.pk.save.missions.done; out.geo = r.renderer.info.memory.geometries; out.kids = r.scene.children.length; out.state = g.state;
    out.poolSizes = Object.fromEntries(Object.entries(r.items.pool).map(([k, v]) => [k, v.length])); out.perkPool = [r.perk.sparks.length, r.perk.rings.length, r.perk.lines.length];
    return out;
  });
  T('a 6-minute run with a bot, pauses and restarts (' + LR.deaths + ' game overs, ' + LR.restarts + ' restarts): pools never overflow (dropped ' + LR.dropped + '), geometries and scene objects stay constant (' + LR.geo + ' / ' + LR.kids + ', drift ' + LR.drift + '), items ' + LR.maxItems + ' and pieces ' + LR.maxPieces + ' bounded, at most ' + LR.maxPops + ' toasts, at most ' + LR.sfxActive + ' sounds at once, the runner never went back, the saved shards only grew (' + LR.shardsSaved + ')',
    LR.dropped === 0 && LR.drift === 0 && LR.maxItems < 1100 && LR.maxPieces < 8 && LR.maxPops <= 3 && LR.sfxActive <= 24 && LR.backwards === 0 && LR.perkPool[0] === 98 && LR.perkPool[1] === 10, JSON.stringify({ pool: LR.poolSizes, perk: LR.perkPool }));
  const BR = await pg.evaluate(() => {
    const out = {}; for (const side of ['left', 'right']) {
      const g = H.setup(); g.start(); g.world.extend(60000); const F = g.world.pieces.find(p => p.type === 'fork'); g.p.z = F.z0 - 1200; g.p.speed = 300; g.world.extend(g.p.z); g.pk.t.aura = g.pk.tot.aura = 15; let steps = 0; const tag0 = F.uid + side, cnt0 = g.world.items.filter(i => i.tag === tag0 && PICKUPS[i.kind]).length;
      while (g.p.z < F.z1 + 600 && g.state === 'play' && steps < 3000) { const p = g.p; H.bot(); if (p.z > F.z0 - 340 && p.z < F.z0 - 280) { g.keys.left = side === 'left'; g.keys.right = side === 'right'; } g.advance(1 / 60); steps++; }
      const tag = F.uid + side, items = g.world.items.filter(i => i.tag === tag);
      out[side] = { alive: g.state === 'play', choice: F.choice, z: Math.round(g.p.z - F.z1), collectibles: cnt0, taken: items.filter(i => PICKUPS[i.kind] && i.taken).length };
    }
    return out;
  });
  T('both branches work: the run goes through the junction and out of it on the left (' + BR.left.choice + ', alive ' + BR.left.alive + ') and on the right (' + BR.right.choice + ', alive ' + BR.right.alive + '), each branch road with its own collectibles (' + BR.left.collectibles + ' / ' + BR.right.collectibles + ')', BR.left.alive && BR.right.alive && BR.left.choice === 'left' && BR.right.choice === 'right' && BR.left.collectibles >= 1 && BR.right.collectibles >= 1, JSON.stringify(BR));
  T('no JS errors (3D)', pg.errs.length === 0, pg.errs.slice(0, 2).join('|')); await pg.context().close();

  // ================================================================ 11. the classic 2D game: no perks, no new items, the same score rule
  const p2 = await open(base + '2d.html');
  const D2 = await p2.evaluate(() => {
    const g = __wf, out = { pk: g.pk === null, extras: g.world.extras, supports: !!(g.r && g.r.supportsPerks) }; g.start(); g.world.extend(60000); const kinds = [...new Set(g.world.items.map(i => i.kind))].sort(); out.kinds = kinds.join();
    g.world.items = []; for (let i = 0; i < 60 * 8; i++) g.advance(1 / 60); g.draw(); out.score = [g.score(), Math.floor(g.p.z / 10) + g.coins * 10]; out.state = g.state; return out;
  });
  T('the classic 2D game is untouched: no Perks, no extra items (' + D2.kinds + '), the old score rule (' + D2.score.join(' = ') + '), nothing drawn from the perks layer, no errors', D2.pk && D2.extras === false && !D2.supports && !/shard|magnet|aura|dash|waymark/.test(D2.kinds) && D2.score[0] === D2.score[1] && D2.state === 'play' && p2.errs.length === 0, JSON.stringify({ ...D2, errs: p2.errs.slice(0, 1) }));
  await p2.context().close();
  console.log('\n' + res.filter(Boolean).length + '/' + res.length + ' passed');
  await b.close(); srv.close(); process.exit(res.every(Boolean) ? 0 : 1);
})().catch(e => { console.log('TEST ERROR', e.message); process.exit(1); });
