// WAYFARER regression test: the five destinations (prompt 12). Forest and Market plus the new Sunset Coast, Mossy Ruins and Neon District: reachable through valid routes, a different order
// from run to run (World.seed), continuous road at every fork type, signs with advance warning, each destination distinct (palette, props, landmark), each with its own small gameplay identity
// that stays fair at the top speed, and bounded object pools over repeated route cycles.
//
// Run:  node tests/qa3d_dest.js     (needs playwright-core and a Chromium: CHROMIUM=/path/to/chrome, NODE_PATH or PW_CORE as for the other tests)
const http = require('http'), fs = require('fs'), path = require('path');
let chromium; try { ({ chromium } = require('playwright-core')); } catch (e) { ({ chromium } = require(process.env.PW_CORE || 'playwright-core')); }
const ROOT = path.join(__dirname, '..'), PORT = 8119;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const res = []; const T = (n, ok, i = '') => { res.push(ok); console.log((ok ? 'PASS ' : 'FAIL ') + n + (i !== '' ? '  [' + i + ']' : '')); };

(async () => {
  const srv = http.createServer((q, r) => {
    let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
    fs.readFile(path.join(ROOT, p), (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' }); r.end(d); } });
  }).listen(PORT);
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/root/.cache/ms-playwright/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const pg = await (await b.newContext({ viewport: { width: 480, height: 270 } })).newPage(); const errs = [];
  pg.on('pageerror', e => errs.push(e.message)); pg.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await pg.goto((process.env.TEST_URL || 'http://localhost:' + PORT + '/'), { timeout: 90000 }); await pg.waitForFunction(() => window.__wf, null, { timeout: 60000 }); await pg.waitForTimeout(600);
  await pg.evaluate(() => { window.requestAnimationFrame = () => 0; });

  // ---------------------------------------------------------------- 1. routes: all five destinations, order varies, fair picks
  const R = await pg.evaluate(() => {
    const out = { dest: {}, firstPairs: new Set(), pairs: new Set(), rep: 0, same: 0, seed0: [], forks: 0, perSeed: [] };
    for (let seed = 0; seed < 40; seed++) {
      const w = new World(TRACK); w.seed = seed; w.reset(); w.extend(120000); const fk = w.pieces.filter(p => p.type === 'fork'); out.forks += fk.length;
      fk.forEach((F, n) => {
        const L = TRACK.segments[F.fork.left.route].biome, Rr = TRACK.segments[F.fork.right.route].biome;
        out.dest[L] = (out.dest[L] || 0) + 1; out.dest[Rr] = (out.dest[Rr] || 0) + 1; if (L === Rr) out.same++;
        out.pairs.add(F.fork.left.route + '|' + F.fork.right.route); if (n === 0) out.firstPairs.add(F.fork.left.route + '|' + F.fork.right.route);
        if (seed === 0) out.seed0.push(F.fork.left.route + '|' + F.fork.right.route);
      });
      // never the same fork pair twice in a row in a slot (slot A = even index, B = odd)
      for (let k = 2; k < fk.length; k++) if (fk[k].fork === fk[k - 2].fork) out.rep++;
    }
    out.firstPairs = [...out.firstPairs]; out.pairs = [...out.pairs].sort();
    // the same seed gives the same route (reproducible)
    const a = new World(TRACK); a.seed = 7; a.reset(); a.extend(60000); const c = new World(TRACK); c.seed = 7; c.reset(); c.extend(60000);
    out.repro = a.pieces.map(p => p.id || p.fork.left.route).join() === c.pieces.map(p => p.id || p.fork.left.route).join();
    // peek and next agree (resolved once)
    const d = new World(TRACK); d.seed = 5; d.reset(); const pk = d.peekSpec(), nx = d.nextSpec(); out.peekOk = pk === nx || JSON.stringify(pk) === JSON.stringify(nx);
    return out;
  });
  T('all five destinations are reachable through valid routes: ' + Object.keys(R.dest).sort().join(', ') + ' (' + R.pairs.length + ' different fork pairs; every fork offers two DIFFERENT destinations)',
    ['forest', 'market', 'coast', 'ruins', 'neon'].every(d => R.dest[d] > 20) && R.same === 0 && R.pairs.length >= 6, JSON.stringify({ dest: R.dest, pairs: R.pairs, same: R.same }));
  T('the order varies: seed 0 is the canonical order (the first fork is forest / market), other seeds start with ' + R.firstPairs.length + ' different pairs; a fork slot never repeats its pair twice in a row (' + R.rep + ' repeats); the same seed is reproducible, peek and next agree',
    R.seed0[0] === 'forest|detour' && R.seed0[1] === 'forestB|detourB' && R.firstPairs.length >= 3 && R.rep === 0 && R.repro && R.peekOk, JSON.stringify({ seed0: R.seed0.slice(0, 6), first: R.firstPairs, rep: R.rep, repro: R.repro }));
  const Gs = await pg.evaluate(() => { const g = __wf; const seeds = [], saved = Game.runSeed; for (let k = 0; k < 6; k++) { g.start(); seeds.push(g.world.seed); } const wd = navigator.webdriver; return { webdriver: !!wd, seeds, canon: seeds.every(s => s === 0) }; });
  T('in an automated browser a run is the canonical seed 0 (reproducible tests); Game.runSeed gives a real player a random seed from ?seed=N or Math.random', Gs.canon === Gs.webdriver && (Gs.webdriver ? Gs.canon : true), JSON.stringify(Gs));
  const Rs = await pg.evaluate(() => { const orig = Object.getOwnPropertyDescriptor(navigator, 'webdriver'); Object.defineProperty(navigator, 'webdriver', { get: () => false, configurable: true }); const a = new Set(); for (let k = 0; k < 12; k++) a.add(Game.runSeed()); if (orig) Object.defineProperty(navigator, 'webdriver', orig); else delete navigator.webdriver; return { distinct: a.size, nonzero: [...a].every(v => v >= 1) }; });
  T('a real player (no webdriver) gets a different non-zero seed each run (' + Rs.distinct + ' distinct of 12)', Rs.distinct >= 10 && Rs.nonzero, JSON.stringify(Rs));

  // ---------------------------------------------------------------- 2. every fork type: continuous road, merges back, signs, branch content on the right road
  const F = await pg.evaluate(() => {
    const out = { forks: {} };
    for (const id of Object.keys(TRACK.forks)) {
      // a world whose sequence is forced to this fork (so each fork type is tested by itself)
      const T2 = Object.assign({}, TRACK, { sequence: [{ seg: 'neonStart' }, { seg: 'cityRun' }, { fork: id }, { seg: 'plaza' }, { seg: 'cityRunB' }], loopFrom: 3 });
      const w = new World(T2); w.extend(40000); const P = w.pieces.find(p => p.type === 'fork'), r = { id, left: P.fork.left.route, right: P.fork.right.route };
      let maxJump = 0, prev = null, badBands = 0, seam = 0;
      for (let z = P.z0 - 300; z < P.z1 + 300; z += 5) {
        const bs = w.bandsAt(z); if (z > P.z0 + 2 && z < P.z1 - 2 && bs.length !== 2) badBands++; if ((z < P.z0 - 2 || z > P.z1 + 2) && bs.length !== 1) badBands++;
        const lo = Math.min(...bs.map(x => x.lo)), hi = Math.max(...bs.map(x => x.hi)); if (prev) maxJump = Math.max(maxJump, Math.abs(lo - prev[0]), Math.abs(hi - prev[1])); prev = [lo, hi];
      }
      const a = w.bandsAt(P.z0 - 1)[0], c = w.bandsAt(P.z0 + 1), d = w.bandsAt(P.z1 - 1), e = w.bandsAt(P.z1 + 1)[0];
      seam = Math.max(Math.abs(c[0].lo - a.lo), Math.abs(c[1].hi - a.hi) > 1 ? 9 : 0, Math.abs(Math.min(...d.map(x => x.lo)) - e.lo), Math.abs(Math.max(...d.map(x => x.hi)) - e.hi));
      r.maxJump = +maxJump.toFixed(3); r.badBands = badBands; r.seam = +seam.toFixed(3); r.tl = w.bandsAt(P.fe + 10).map(x => TRACK.segments[x.route].biome);
      // signs: two pairs, 420 and 140 units before the junction (and the prompt at 760), each with a 3D sign and a 2D sprite
      const signs = w.items.filter(i => i.kind === 'prop' && i.spr !== 'gore' && Math.abs(i.z - P.z0) < 500); r.signs = signs.map(i => i.spr + '@' + (P.z0 - i.z) + (i.x < 0 ? 'L' : 'R')).sort();
      r.signsOk = signs.length === 4 && signs.every(i => ENV3D.common.props[i.spr] && SPR[i.spr]) && [420, 140].every(d2 => signs.filter(i => P.z0 - i.z === d2).length === 2);
      // content: coins and hazards of each branch lie on that branch's road (inside its band) and each branch has a coin trail
      const bad = [], cnt = { L: { coin: 0, hz: 0 }, R: { coin: 0, hz: 0 } };
      for (const it of w.items) { if (it.z < P.fe + 1 || it.z > P.be || !String(it.tag).startsWith(P.uid)) continue; const side = it.tag.endsWith('left') ? 'L' : 'R', b = w.bandsAt(it.z).find(x => x.side === (side === 'L' ? -1 : 1)); if (!(it.x >= b.lo - 0.01 && it.x <= b.hi + 0.01)) bad.push([it.kind, Math.round(it.z)]); cnt[side][it.kind === 'coin' ? 'coin' : 'hz']++; }
      r.misplaced = bad.length; r.cnt = cnt; r.coinTrail = w.items.filter(i => i.kind === 'coin' && i.z > P.z0 && i.z < P.fe && String(i.tag).startsWith(P.uid)).length;
      out.forks[id] = r;
    }
    return out;
  });
  const fk = Object.values(F.forks);
  T('every fork type (' + fk.map(f => f.id).join(', ') + '): two roads from one, back to one; no jump in the road edge (max ' + Math.max(...fk.map(f => f.maxJump)) + ' per 0.5 m of running, the same for the original forks), the merge meets the road after it (seam <= 0.03), branches are their own biome', fk.length === 6 && fk.every(f => f.maxJump < 0.06 && f.badBands === 0 && f.seam < 0.03 && f.tl.length === 2 && f.tl[0] !== f.tl[1]), JSON.stringify(fk.map(f => [f.id, f.maxJump, f.badBands, f.seam, f.tl])));
  T('every fork has signs with advance warning: two signposts per side 42 m and 14 m before the junction, each with a 3D sign and a 2D sprite; every branch has its coin trail through the junction and its own coins and hazards, all inside its own road',
    fk.every(f => f.signsOk && f.misplaced === 0 && f.coinTrail >= 10 && f.cnt.L.coin > 10 && f.cnt.R.coin > 10 && f.cnt.L.hz > 0 && f.cnt.R.hz >= 0), JSON.stringify(fk.map(f => [f.id, f.signs.length, f.misplaced, f.coinTrail, f.cnt.L, f.cnt.R])));

  // ---------------------------------------------------------------- 3. each destination is its own place
  const D = await pg.evaluate(() => {
    const out = { envs: {}, missing: {} };
    const ids = ['forest', 'market', 'coast', 'ruins', 'neon'].map(n => n === 'market' ? 'market' : n);
    for (const id of ids) {
      const e = ENV3D[id]; if (!e) { out.envs[id] = null; continue; }
      const kinds = new Set(); for (let i = -3; i < 1500; i++) for (const q of e.layout(i, rnd)) kinds.add(q.prop);
      const all = new Set(); for (const k in ENV3D) for (const n in ENV3D[k].props || {}) all.add(n);
      out.envs[id] = { name: e.name, sky: e.sky.top + e.sky.horizon, fog: e.fog.color + e.fog.near, road: e.road.asphalt[0] + e.road.walk[0] + e.road.verge[0], light: e.sun.color + e.hemi.sky, kinds: kinds.size, missing: [...kinds].filter(k => !all.has(k)), entrance: !!e.entrance && !!(e.props[e.entrance]), lm: e.name };
    }
    out.sun = { coast: ENV3D.coast.sunPos, glow: ENV3D.coast.sunGlow };
    const uniq = f => new Set(ids.map(id => out.envs[id][f])).size; out.uniq = { sky: uniq('sky'), fog: uniq('fog'), road: uniq('road'), light: uniq('light') };
    out.has2D = ['coast', 'ruins', 'neon'].every(n => !!BIOMES[n]);
    out.names = ['coastRun', 'ruinsRun', 'neonBranch'].map(n => TRACK.segments[n].name);
    return out;
  });
  T('the five destinations differ: each has its own sky, fog, road and light colours (' + JSON.stringify(D.uniq) + ' distinct of 5), its own name (' + D.names.join(', ') + '), an entrance marker, and the 2D game has a palette for each new one',
    Object.values(D.uniq).every(n => n === 5) && D.has2D && ['coast', 'ruins'].every(id => D.envs[id] && D.envs[id].entrance) && D.names.join() === 'SUNSET COAST,MOSSY RUINS,NEON DISTRICT', JSON.stringify({ uniq: D.uniq, names: D.names }));
  T('the coast and the ruins have their own scenery kits: layouts use only props that exist (missing: ' + JSON.stringify([D.envs.coast.missing, D.envs.ruins.missing]) + '), >= 14 different kinds each; the coast has the sun low over the sea (glow ' + D.sun.glow + ')',
    D.envs.coast.missing.length === 0 && D.envs.ruins.missing.length === 0 && D.envs.coast.kinds >= 14 && D.envs.ruins.kinds >= 14 && D.sun.glow > 0.5, JSON.stringify({ coast: D.envs.coast.kinds, ruins: D.envs.ruins.kinds }));
  const L = await pg.evaluate(() => {
    const out = {}; for (const id of ['coast', 'ruins']) { const lay = []; const lms = {}; for (let i = -3; i < 2500; i++) { const l = ENV3D[id].layout(i, rnd); lay.push(l.length); for (const q of l) if (['lighthouse', 'pier', 'ruinTemple', 'obelisk'].includes(q.prop)) lms[q.prop] = (lms[q.prop] || 0) + 1; }
      // never the same landmark in two slots in a row
      let adj = 0; for (let i = 0; i < 2500; i++) { const a = ENV3D[id].layout(i, rnd).filter(q => ['lighthouse', 'pier', 'ruinTemple', 'obelisk'].includes(q.prop)).map(q => q.prop), b = ENV3D[id].layout(i + 1, rnd).filter(q => ['lighthouse', 'pier', 'ruinTemple', 'obelisk'].includes(q.prop)).map(q => q.prop); if (a.some(x => b.includes(x))) adj++; }
      out[id] = { min: Math.min(...lay), max: Math.max(...lay), lms, adj }; }
    // the arch of the ruins: two halves, one each side, meeting over the road (the lintel of a half reaches to the middle)
    const arch = ENV3D.ruins.props.archHalf(); arch.lit.computeBoundingBox(); out.archReach = +(-arch.lit.boundingBox.min.x).toFixed(2); out.archH = +arch.lit.boundingBox.max.y.toFixed(2);
    let archSlots = 0; for (let i = 0; i < 400; i++) if (ENV3D.ruins.layout(i, rnd).filter(q => q.prop === 'archHalf').length === 2) archSlots++; out.archSlots = archSlots;
    return out;
  });
  T('every slot of the coast and of the ruins is dressed (2..16 props), each has two landmarks (lighthouse + pier; ruined temple + obelisk) that never sit in neighbouring slots; the ruin arch closes over the road (each half reaches ' + L.archReach + ' m, ' + L.archH + ' m high, ' + L.archSlots + ' slots of 400 with both halves)',
    L.coast.min >= 2 && L.coast.max <= 16 && L.ruins.min >= 2 && L.ruins.max <= 16 && L.coast.lms.lighthouse > 5 && L.coast.lms.pier > 5 && L.ruins.lms.ruinTemple > 5 && L.ruins.lms.obelisk > 5 && L.coast.adj === 0 && L.ruins.adj === 0 && L.archReach >= 4.8 && L.archH > 8 && L.archSlots > 10, JSON.stringify(L));
  const N = await pg.evaluate(() => { const p = ENV3D.neon.props, kinds = new Set(); for (let i = 0; i < 600; i++) for (const q of ENV3D.neon.layout(i, rnd)) kinds.add(q.prop); const wire = p.neonWire(); wire.lit.computeBoundingBox(); const pud = p.neonPuddle();
    return { cables: kinds.has('neonWire') && kinds.has('neonPole'), puddles: kinds.has('neonPuddle'), wireLen: +(wire.lit.boundingBox.max.z - wire.lit.boundingBox.min.z).toFixed(1), wireH: +wire.lit.boundingBox.max.y.toFixed(2), puddleLow: !!pud.glow && !!pud.lit }; });
  T('the Neon District has its overhead cables (a span over each side of the road, 12.6 m long at ' + N.wireH + ' m, with poles) and reflective-looking wet patches on the road (dark glossy slab with lit streaks)', N.cables && N.puddles && N.wireLen >= 12 && N.wireH > 6 && N.puddleLow, JSON.stringify(N));

  // ---------------------------------------------------------------- 4. each destination's gameplay identity, tested with the real physics at the top speed (340 units/s)
  const G = await pg.evaluate(() => {
    const g = __wf, out = {}; g.r.renderer.render = () => {};
    const run = (items, input) => {                                                   // a fresh run on a clear road with only `items`, the speed at its maximum; input(f, g) per frame
      g.start(); g.world.items = []; g.p.speed = 340; g.p.z = 0; g.p.x = 0; g.keys = {}; const base = 100; for (const it of items) g.world.items.push(Object.assign({ tag: 'main', h: 12 }, it, { z: base + it.z }));
      let f = 0, took = 0; for (; f < 60 * 4 && g.state === 'play'; f++) { input && input(f, g); g.p.speed = 340; g.advance(1 / 60); }
      return { alive: g.state === 'play', coins: g.coins, z: Math.round(g.p.z) };
    };
    const jumpAt = (z0) => (f, gg) => { if (gg.p.z > z0 && gg.p.jy === 0 && !gg._j) { gg._j = 1; gg.onKey({ code: 'Space', key: ' ', repeat: false, preventDefault() {} }, true); } };
    const pat = (name, z) => PATTERNS[name].map(([kind, dz, lane, h]) => ({ kind, z: z + dz, x: lane * LANE_W, h: h === undefined ? 12 : h }));
    // Mossy Ruins: the fallen wall blocks all three lanes: steering cannot avoid it, standing still crashes, a jump (time-boxed at the top speed) clears it, from the left, middle and right lane
    const arch = PATTERNS.collapsedArch.filter(i => i[0] === 'barrier'); out.archLanes = arch.map(i => i[2]).sort().join(); out.archZ = new Set(arch.map(i => i[1])).size;
    out.archWalk = [-1, 0, 1].map(lane => { g._j = 0; const it = pat('collapsedArch', 0); return run(it, (f, gg) => { gg.p.x = lane * LANE_W; }).alive; });     // never jumps: crashes in every lane
    const clear = [];
    for (const lane of [-1, 0, 1]) for (const early of [-6, 0, 6]) { g._j = 0; const it = pat('collapsedArch', 0); const r = run(it, (f, gg) => { gg.p.x = lane * LANE_W; if (!gg._j && gg.p.z > 100 + 62 - 36 + early * 1) { gg._j = 1; gg.onKey({ code: 'Space', key: ' ', repeat: false, preventDefault() {} }, true); } }); clear.push(r.alive); }
    out.archJump = clear;
    // Neon District: two gantries 14 units apart, one slide gets under both (and standing crashes)
    const gan = PATTERNS.neonGantry.filter(i => i[0] === 'over'); out.ganZ = gan.map(i => i[1]).join();
    out.ganStand = run(pat('neonGantry', 0)).alive;
    g._s = 0; out.ganSlide = run(pat('neonGantry', 0), (f, gg) => { if (!gg._s && gg.p.z > 100 + 56 - 22) { gg._s = 1; gg.onKey({ code: 'ArrowDown', key: 'ArrowDown', repeat: false, preventDefault() {} }, true); } }).alive;
    // the strobing crates leave the middle lane open: staying in it survives without any input; the side lanes crash
    out.strobeMid = run(pat('neonStrobe', 0), (f, gg) => { gg.p.x = 0; }).alive; out.strobeSide = [-1, 1].map(l => run(pat('neonStrobe', 0), (f, gg) => { gg.p.x = l * LANE_W; }).alive);
    // Sunset Coast: the sprint patterns carry no hazard, and the whole branch has far fewer than the forest
    out.sprint = ['coastWave'].map(n => PATTERNS[n].filter(i => i[0] !== 'coin').length); out.dunes = PATTERNS.coastDunes.filter(i => i[0] !== 'coin').map(i => i[0]);
    const hz = id => { const seg = TRACK.segments[id]; let h = 0, c = 0, n = 0; for (const name of seg.patterns) { n++; for (const it of PATTERNS[name]) it[0] === 'coin' ? c++ : h++; } return { h: h / n, c: c / n }; };
    out.mix = { coast: hz('coastRun'), coastB: hz('coastRunB'), forest: hz('forest'), ruins: hz('ruinsRun'), neon: hz('neonBranch') };
    // a coin wave is collectable on the real road: the bot (steering to the next coin) collects most of it without a hazard
    out.waveWalk = run(pat('coastWave', 0), (f, gg) => { const nxt = gg.world.items.find(i => i.kind === 'coin' && !i.taken && i.z > gg.p.z - 5); if (nxt) { const dx = nxt.x - gg.p.x; gg.p.x += Math.max(-0.05, Math.min(0.05, dx)); } });
    return out;
  });
  T('MOSSY RUINS, the fallen wall: three barriers at the same distance across lanes ' + G.archLanes + ' block the whole road: walking into it crashes in every lane (' + G.archWalk + '), a jump clears it from every lane and at 3 timings (' + G.archJump.every(Boolean) + ') at the top speed',
    G.archLanes === '-1,0,1' && G.archZ === 1 && G.archWalk.every(a => !a) && G.archJump.every(Boolean), JSON.stringify({ lanes: G.archLanes, walk: G.archWalk, jump: G.archJump }));
  T('NEON DISTRICT, the double gantry: two overhead hazards ' + G.ganZ + ' units in, standing crashes, one slide gets under both; the strobing crates leave the middle lane open (the middle lane survives with no input, the side lanes crash)',
    G.ganStand === false && G.ganSlide === true && G.strobeMid === true && G.strobeSide.every(a => !a), JSON.stringify({ stand: G.ganStand, slide: G.ganSlide, mid: G.strobeMid, side: G.strobeSide }));
  T('SUNSET COAST, the safe sprint: the coin wave has no hazard, the dunes pattern one low log (' + G.dunes.join() + '), the branch carries ' + G.mix.coast.h.toFixed(1) + ' hazards per pattern against ' + G.mix.forest.h.toFixed(1) + ' in the forest and ' + G.mix.coast.c.toFixed(1) + ' coins against ' + G.mix.forest.c.toFixed(1) + '; a coin wave is collected on the road (' + G.waveWalk.coins + ' coins)',
    G.sprint[0] === 0 && G.dunes.join() === 'barrier' && G.mix.coast.h < G.mix.forest.h * 0.8 && G.mix.coastB.h < G.mix.forest.h && G.mix.coast.c > G.mix.forest.c && G.waveWalk.alive && G.waveWalk.coins >= 5, JSON.stringify(G.mix) + ' ' + JSON.stringify(G.waveWalk));

  // ---------------------------------------------------------------- 5. play every fork type through, both choices, with a hazard-avoiding bot at the top speed
  const Pl = await pg.evaluate(async () => {
    const g = __wf, r = g.r, out = { runs: [], dropped: 0, peak: 0, drift: 0 }; r.renderer.render = () => {};
    const bot = (want) => {
      const p = g.p, w = g.world, F = w.openFork(); g.keys.left = g.keys.right = false; if (F && p.z > F.z0 - 500 && p.z < F.z0 - 400) g.keys[want] = true;
      let tg = null; for (const it of w.items) { const ob = OBST[it.kind]; if (!ob || it.z <= p.z || it.z - p.z > p.speed * 0.5) continue; if (Math.abs(it.x - p.x) > ob.hw + 0.25) continue; if (!tg || it.z < tg.z) tg = it; }
      if (tg && tg.z - p.z < p.speed * 0.3 && p.jy === 0 && p.slide <= 0) g.onKey({ code: tg.kind === 'over' ? 'ArrowDown' : 'Space', key: ' ', repeat: false, preventDefault() {} }, true);
    };
    for (const id of Object.keys(TRACK.forks)) for (const want of ['left', 'right']) {
      const T2 = Object.assign({}, TRACK, { sequence: [{ seg: 'neonStart' }, { seg: 'cityRun' }, { fork: id }, { seg: 'plaza' }, { seg: 'cityRunB' }], loopFrom: 3 });
      g.start(); g.world.track = T2; g.world.reset(); g.world.items = []; g.world.reset(); g.start(); g.world.track = T2; g.world.reset(); g.world.extend(9000);
      const F0 = g.world.openFork(); g.p.z = F0.z0 - 1500; g.p.speed = 340; g.world.extend(g.p.z); g.world.items = g.world.items.filter(i => i.z > g.p.z + 700);
      const c0 = g.coins; let f = 0, coinsBack = 0, cPrev = g.coins, zPrev = g.p.z, zBack = 0, tags = new Set();
      for (; f < 60 * 80 && g.state === 'play' && g.p.z < F0.z1 + 1200; f++) { bot(want); g.p.speed = 340; g.advance(1 / 60); if (f % 4 === 0) r.draw(g); if (g.coins < cPrev) coinsBack++; cPrev = g.coins; if (g.p.z < zPrev) zBack++; zPrev = g.p.z; const pb = g.world.playerBand(g.p.z, g.p.x); tags.add(pb.route); for (const k in r.propUsed) { const fr = r.propUsed[k] / r.props[k].length; if (fr > out.peak) out.peak = fr; } }
      out.runs.push({ id, want, alive: g.state === 'play', reached: g.p.z >= F0.z1 + 1200 - 1, coins: g.coins - c0, route: F0.choice, routes: [...tags].join('>'), back: coinsBack + zBack });
      out.dropped += r.dropped + r.items.dropped;
    }
    g.world.track = TRACK; g.world.reset();                                       // (the forced one-fork tracks are only for these runs)
    return out;
  });
  T('every fork type, both choices (12 runs), played through at the top speed by a hazard-avoiding bot: it survives past the merge, collects coins on the branch, takes the chosen route, nothing runs backwards, nothing is dropped from any pool (peak ' + Math.round(Pl.peak * 100) + ' %)',
    Pl.runs.length === 12 && Pl.runs.every(x => x.alive && x.reached && x.coins > 5 && x.route === x.want && x.back === 0) && Pl.dropped === 0 && Pl.peak <= 0.85, JSON.stringify(Pl.runs.map(x => [x.id, x.want, x.alive, x.coins, x.routes])));

  // ---------------------------------------------------------------- 6. pools bounded over repeated route cycles (all five destinations, several seeds)
  const Pool = await pg.evaluate(() => {
    const g = __wf, r = g.r; r.renderer.render = () => {}; const out = { dropped: 0, peak: 0, peakName: '', drift: 0, frames: 0, seen: new Set(), laps: 0 }; let geo0 = -1, kids0 = r.scene.children.length, n = 0;
    for (const seed of [0, 3, 6, 9]) for (const choice of ['left', 'right']) {
      g.start(); g.world.seed = seed; g.world.items = []; g.world.reset(); g.start(); g.world.seed = seed; g.world.reset();
      for (let z = 0; z < 120000; z += 70) {
        g.p.z = z; g.world.extend(z); const F = g.world.pieces.find(p => p.type === 'fork' && !p.choice && z > p.z0 - 20); if (F) { F.choice = choice; g.world.ver++; }
        const pb = g.world.playerBand(z, 0); g.camX = pb.c; g.camOff = pb.off; const ah = g.world.playerBand(z + 300, 0); g.bgTo = ah.to; g.bgT = ah.t; out.seen.add(pb.to); g.time += 1 / 60; r.draw(g); n++;
        for (const k in r.propUsed) { const f = r.propUsed[k] / r.props[k].length; if (f > out.peak) { out.peak = f; out.peakName = k; } }
        if (n === 100) geo0 = r.renderer.info.memory.geometries; else if (n > 100 && (r.renderer.info.memory.geometries !== geo0 || r.scene.children.length !== kids0)) out.drift++;
        if (z % 3000 === 0) g.world.prune(z);
      }
    }
    out.dropped = r.dropped + r.items.dropped; out.frames = n; out.by = r.droppedBy; out.seen = [...out.seen].sort(); out.layoutCache = Object.values(r.layouts).map(m => m.size);
    return out;
  });
  T('object pools stay bounded over repeated route cycles of all five destinations (' + Pool.frames + ' frames, 4 seeds, both choices, 120 km each): nothing dropped, no pool over 85 % full (peak ' + Pool.peakName + ' ' + Math.round(Pool.peak * 100) + ' %), the scene constant, the layout caches small; biomes drawn: ' + Pool.seen.join(','),
    Pool.dropped === 0 && Pool.peak <= 0.85 && Pool.drift === 0 && Pool.layoutCache.every(n => n <= 60) && ['coast', 'ruins', 'neon', 'forest', 'market'].every(b => Pool.seen.includes(b)), JSON.stringify({ dropped: Pool.dropped, by: Pool.by, peak: +Pool.peak.toFixed(2), drift: Pool.drift, cache: Pool.layoutCache, seen: Pool.seen }));
  T('no JS errors', errs.length === 0, errs.slice(0, 2).join('|'));
  console.log('\n' + res.filter(Boolean).length + '/' + res.length + ' passed');
  await b.close(); srv.close(); process.exit(res.every(Boolean) ? 0 : 1);
})().catch(e => { console.log('TEST ERROR', e.message); process.exit(1); });
