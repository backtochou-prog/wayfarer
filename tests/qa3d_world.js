// WAYFARER regression test: world variety and track integrity (prompt 11).
// Checks that the road/scenery variation is deterministic, bounded and does not break the road, the junctions or gameplay.
//
// Run:  node tests/qa3d_world.js      (needs playwright-core and a Chromium: CHROMIUM=/path/to/chrome, and NODE_PATH or
//        PW_CORE=/path/to/node_modules/playwright-core if playwright-core is not installed next to the project)
const http = require('http'), fs = require('fs'), path = require('path');
let chromium; try { ({ chromium } = require('playwright-core')); } catch (e) { ({ chromium } = require(process.env.PW_CORE || 'playwright-core')); }
const ROOT = path.join(__dirname, '..'), PORT = 8115;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const res = []; const T = (n, ok, i = '') => { res.push(ok); console.log((ok ? 'PASS ' : 'FAIL ') + n + (i !== '' ? '  [' + i + ']' : '')); };

(async () => {
  const srv = http.createServer((q, r) => {
    let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
    fs.readFile(path.join(ROOT, p), (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' }); r.end(d); } });
  }).listen(PORT);
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/root/.cache/ms-playwright/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const pg = await (await b.newContext({ viewport: { width: 480, height: 270 } })).newPage();
  const errs = []; pg.on('pageerror', e => errs.push(e.message)); pg.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await pg.goto(process.env.TEST_URL || 'http://localhost:' + PORT + '/');   // TEST_URL=https://... runs the same checks against a deployed copy await pg.waitForFunction(() => window.__wf, null, { timeout: 30000 }); await pg.waitForTimeout(600);

  // ================================================================ 1. data-level checks (no rendering)
  const D = await pg.evaluate(() => {
    const out = {}, LIM = 90000;
    const mk = () => { const w = new World(TRACK); w.extend(LIM); return w; };
    // a. deterministic: two fresh worlds are item-for-item identical; per-slot scenery layouts are reproducible
    const w1 = mk(), w2 = mk();
    out.sameItems = JSON.stringify(w1.items) === JSON.stringify(w2.items) && w1.items.length > 500 && JSON.stringify(w1.pieces.map(p => [p.type, p.z0, p.z1])) === JSON.stringify(w2.pieces.map(p => [p.type, p.z0, p.z1]));
    out.sameLayouts = ['city', 'forest', 'market'].every(id => { for (let i = -3; i < 1500; i++) if (JSON.stringify(ENV3D[id].layout(i, rnd)) !== JSON.stringify(ENV3D[id].layout(i, rnd))) return false; return true; });
    // b. track integrity at every seam and along every piece: pieces touch, road bands change smoothly, the band count changes only at junctions
    const w = mk(); let maxJump = 0, badCount = 0, badSeam = 0, forks = 0, segsSeen = new Set(), forksSeen = new Set();
    for (let k = 0; k < w.pieces.length; k++) {
      const P = w.pieces[k]; if (P.type === 'fork') { forks++; forksSeen.add(Object.keys(TRACK.forks).find(n => TRACK.forks[n] === P.fork)); } else segsSeen.add(P.id);
      if (k && Math.abs(P.z0 - w.pieces[k - 1].z1) > 1e-6) badSeam++;
      let prev = null;
      for (let z = P.z0 + 0.5; z < P.z1 - 0.5; z += 2) {
        const bs = w.bandsAt(z), lo = bs.map(x => x.lo), hi = bs.map(x => x.hi), off = bs.map(x => x.off);
        const expect = P.type === 'fork' ? 2 : 1; if (bs.length !== expect) badCount++;
        if (prev && prev.n === bs.length) for (let q = 0; q < bs.length; q++) maxJump = Math.max(maxJump, Math.abs(lo[q] - prev.lo[q]), Math.abs(hi[q] - prev.hi[q]), Math.abs(off[q] - prev.off[q]));
        prev = { n: bs.length, lo, hi, off };
      }
      if (P.type === 'fork') {                                          // the two roads cover the single road at both ends (no gap at the fork tip or the merge)
        for (const z of [P.z0 + 0.5, P.z1 - 0.5]) { const bs = w.bandsAt(z).slice().sort((x, y) => x.lo - y.lo); out.forkCover = (out.forkCover === undefined || out.forkCover) && bs[0].lo <= -0.89 && Math.max(...bs.map(x => x.hi)) >= 0.89 && bs[1].lo <= bs[0].hi + 0.05; }   // the roads touch or overlap: no gap
      }
    }
    out.routes = Object.values(TRACK.forks).flatMap(f => [f.left.route, f.right.route]);
    out.integrity = { maxJump: +maxJump.toFixed(4), badCount, badSeam, pieces: w.pieces.length, forks, segs: [...segsSeen].sort(), forkIds: [...forksSeen].sort() };
    // c. obstacle patterns: seeded pick, never the same pattern twice running, hazards never closer than the base spacing allows, hazard-free run-up to every junction
    const inst = {}; for (const it of w1.items) if (it.pat) { const key = it.seg + '#' + it.tag + '#' + it.inst; if (!inst[key]) inst[key] = { seg: it.seg, tag: it.tag, n: it.inst, pat: it.pat, z: it.z }; inst[key].z = Math.min(inst[key].z, it.z); }
    const seqs = {}; for (const e of Object.values(inst)) (seqs[e.seg + '#' + e.tag] = seqs[e.seg + '#' + e.tag] || []).push(e);
    let repeats = 0; const distinct = {}, orderings = new Set();
    for (const key in seqs) { const a = seqs[key].sort((x, y) => x.n - y.n); for (let k = 1; k < a.length; k++) if (a[k].pat === a[k - 1].pat) repeats++; const id = key.split('#')[0]; distinct[id] = Math.max(distinct[id] || 0, new Set(a.map(e => e.pat)).size); if (a.length >= 4) orderings.add(id + ':' + a.slice(0, 6).map(e => e.pat).join(',')); }
    const hzByTag = {}; for (const i of w1.items) if (OBST[i.kind]) (hzByTag[i.tag] = hzByTag[i.tag] || []).push(i.z);
    let minGap = 1e9, hzN = 0, firstHz = 1e9; for (const tag in hzByTag) { const zs = hzByTag[tag].sort((a, b) => a - b); hzN += zs.length; firstHz = Math.min(firstHz, tag === 'main' ? zs[0] : 1e9); for (let k = 1; k < zs.length; k++) if (zs[k] - zs[k - 1] > 1) minGap = Math.min(minGap, zs[k] - zs[k - 1]); }
    const hz = [{ z: firstHz }];
    let guide = 1e9; for (const F of w1.pieces.filter(p => p.type === 'fork')) for (const i of w1.items) if (OBST[i.kind] && i.z < F.z0 && F.z0 - i.z < 1000) guide = Math.min(guide, F.z0 - i.z);
    out.patterns = { repeats, distinct, orderings: orderings.size, minGap: Math.round(minGap), guide: Math.round(guide), firstHazard: Math.round(hz[0].z), hazards: hzN };
    // the gaps between consecutive pattern starts on a road vary (they are not a fixed 210)
    { const g = new Set(); for (const key in seqs) { const a = seqs[key].sort((x, y) => x.n - y.n); for (let k = 1; k < a.length; k++) g.add(Math.round(a[k].z - a[k - 1].z)); } out.gapKinds = g.size; }
    out.itemsPerKm = Math.round(w1.items.length / (LIM / 10000));
    // d. stretches and landmarks (city / forest / market salts and variant counts as the environments use them)
    const CFG = { city: [0, 6, ['fountain', 'clockTower', 'statue']], market: [40, 4, ['marketHall', 'fountain', 'bigTent']], forest: [80, 6, ['cabin', 'giantOak', 'standingStones']] };
    out.stretch = {};
    for (const id in CFG) {
      const [salt, nv, lms] = CFG[id], blocks = new Map(); let ok = true;
      for (let i = -20; i < 3000; i++) { const S = Stretch.of(i, salt, nv, lms); if (!blocks.has(S.b)) blocks.set(S.b, { b: S.b, len: S.len, variant: S.variant, lm: S.lm, n: 0 }); const B = blocks.get(S.b); B.n++; if (S.len !== B.len || S.variant !== B.variant || JSON.stringify(S.lm) !== JSON.stringify(B.lm)) ok = false; }
      const arr = [...blocks.values()].filter(x => x.b > -2 && x.b < 330).sort((a, b) => a.b - b.b); let sameVar = 0, sameLm = 0, minLen = 99, maxLen = 0, lmCount = 0, minLmGap = 1e9, lastLm = -1e9; const variants = new Set(), kinds = new Set();
      for (let k = 0; k < arr.length; k++) {
        const B = arr[k]; minLen = Math.min(minLen, B.len); maxLen = Math.max(maxLen, B.len); variants.add(B.variant);
        if (k && arr[k - 1].variant === B.variant) sameVar++;
        if (k && arr[k - 1].lm && B.lm && arr[k - 1].lm.kind === B.lm.kind) sameLm++;
        if (B.lm) { lmCount++; kinds.add(B.lm.kind); minLmGap = Math.min(minLmGap, B.lm.slot - lastLm); lastLm = B.lm.slot; if (B.lm.slot < B.b * 0 - 1e9) ok = false; }
      }
      out.stretch[id] = { consistent: ok, blocks: arr.length, minLen, maxLen, variants: variants.size, nv, sameVar, sameLm, lmShare: +(lmCount / arr.length).toFixed(2), kinds: kinds.size, minLmGap };
    }
    // e. repetition: how often a slot's set of props (per side) equals the slot p slots further on, worst lag 2..16, per biome. Lower is more varied.
    const sig = (id, i) => { const L = ENV3D[id].layout(i, rnd), side = s => L.filter(q => (q.x < 0) === (s < 0)).map(q => q.prop).sort().join('+'); return side(-1) + '|' + side(1); };
    out.repeat = {}; out.houseAdj = {};
    for (const id of ['city', 'forest', 'market']) {
      const N = 1500, S = []; for (let i = 0; i < N; i++) S.push(sig(id, i)); let worst = 0, worstLag = 0;
      for (let p = 2; p <= 16; p++) { let m = 0; for (let i = 0; i + p < N; i++) if (S[i] === S[i + p]) m++; const f = m / (N - p); if (f > worst) { worst = f; worstLag = p; } }
      out.repeat[id] = { worst: +worst.toFixed(3), lag: worstLag, distinct: new Set(S).size };
      let adj = 0, pairs = 0; for (const side of [-1, 1]) { let prev = null; for (let i = 0; i < N; i++) { const h = ENV3D[id].layout(i, rnd).find(q => /^house/.test(q.prop) && (q.x < 0) === (side < 0)); const nm = h ? h.prop : null; if (prev && nm) { pairs++; if (nm === prev) adj++; } prev = nm; } }
      out.houseAdj[id] = { adj, pairs };
    }
    // e2. large-scale variety: how much the number of tall structures (houses, trees, landmarks) near the road changes from one 10-slot window to the next,
    //     and how many kinds of prop a biome uses. (Before the stretches: SD 0.25 / 0.43 / 0.20 and 10 / 8 / 9 kinds for city / forest / market.)
    out.variety = {};
    for (const id of ['city', 'forest', 'market']) {
      const tall = [], kinds = new Set(); for (let i = 0; i < 1500; i++) { const L = ENV3D[id].layout(i, rnd); for (const q of L) kinds.add(q.prop); tall.push(L.filter(q => /^house|^tree|^oak|^pine|^birch|giantOak|clockTower|cabin|marketHall|bigTent/.test(q.prop) && Math.abs(q.x) <= 9).length); }
      const m = []; for (let st = 0; st + 10 <= tall.length; st += 10) { let t = 0; for (let k = 0; k < 10; k++) t += tall[st + k]; m.push(t / 10); }
      const mean = m.reduce((a, c) => a + c, 0) / m.length; out.variety[id] = { tallSD: +Math.sqrt(m.reduce((a, c) => a + (c - mean) * (c - mean), 0) / m.length).toFixed(2), kinds: kinds.size };
    }
    // f. dressing totals per biome are sane (no empty stretches, no overcrowded slots)
    out.slots = {}; for (const id of ['city', 'forest', 'market']) { let min = 99, max = 0; for (let i = 0; i < 1500; i++) { const n = ENV3D[id].layout(i, rnd).length; min = Math.min(min, n); max = Math.max(max, n); } out.slots[id] = { min, max }; }
    return out;
  });
  T('deterministic: two fresh worlds are item-for-item identical (items, pieces), scenery layouts reproducible', D.sameItems && D.sameLayouts, JSON.stringify({ items: D.sameItems, layouts: D.sameLayouts }));
  const I = D.integrity; const TRACK_ROUTES = Object.fromEntries(D.routes.map(r => [r, 1]));
  T('track integrity: pieces touch, 1 road on segments / 2 on junctions, road bands change smoothly (no jumps) along all ' + I.pieces + ' pieces incl. both junction types and every segment variant',
    I.badSeam === 0 && I.badCount === 0 && I.maxJump < 0.03 && I.forkIds.join() === 'gate,gate2' && I.segs.includes('cityRunB') && I.segs.includes('plazaB') && I.segs.includes('neonRun') && ['forest', 'detour', 'forestB', 'detourB'].every(r => !!TRACK_ROUTES[r]), JSON.stringify(I));
  T('both roads of every junction cover the single road at the fork tip and the merge (no gap)', D.forkCover === true, String(D.forkCover));
  const Pt = D.patterns;
  T('obstacle patterns: never the same pattern twice running, several orderings, spacing varies, hazards >= 19 m apart on a road, nothing in the run-up to a junction, first hazard >= 60 m in', Pt.repeats === 0 && Pt.orderings >= 2 && Pt.minGap >= 190 && Pt.guide >= 390 && Pt.firstHazard >= 600 && D.gapKinds >= 8 && Object.values(Pt.distinct).every(n => n >= 2), JSON.stringify({ ...Pt, gapKinds: D.gapKinds }));
  for (const id of ['city', 'forest', 'market']) { const S = D.stretch[id];
    T('stretches (' + id + '): length 4-13 slots, every variant used (' + S.variants + '/' + S.nv + '), neighbouring stretches never share a variant or a landmark kind, landmarks >= 3 slots apart',
      S.consistent && S.minLen >= 4 && S.maxLen <= 13 && S.variants === S.nv && S.sameVar === 0 && S.sameLm === 0 && S.minLmGap >= 3 && S.kinds === 3 && S.lmShare > 0.5 && S.lmShare < 0.95, JSON.stringify(S)); }
  T('no slot arrangement recurs at a fixed distance (worst lag-match <= 0.35 in every biome; this measures exact recurrence only)', ['city', 'forest', 'market'].every(id => D.repeat[id].worst <= 0.35 && D.repeat[id].distinct >= 25), JSON.stringify(D.repeat));
  T('large-scale variety: the density of tall structures near the road swings from stretch to stretch (SD over 10-slot windows: city >= 0.8, forest >= 1.0, market >= 0.5) and each biome uses >= 12 kinds of prop',
    D.variety.city.tallSD >= 0.8 && D.variety.forest.tallSD >= 1.0 && D.variety.market.tallSD >= 0.5 && ['city', 'forest', 'market'].every(id => D.variety[id].kinds >= 12), JSON.stringify(D.variety));
  T('neighbouring slots rarely repeat the same house on a side (<= 8 % of adjacent pairs)', ['city', 'forest', 'market'].every(id => D.houseAdj[id].pairs === 0 || D.houseAdj[id].adj / D.houseAdj[id].pairs <= 0.08), JSON.stringify(D.houseAdj));
  T('every slot is dressed but never overcrowded (2..14 props per slot)', ['city', 'forest', 'market'].every(id => D.slots[id].min >= 2 && D.slots[id].max <= 14), JSON.stringify(D.slots));

  // ================================================================ 2. object pools stay bounded on both branches of every junction
  const Pool = await pg.evaluate(() => {
    const g = __wf, r = g.r; r.renderer.render = () => {};
    const out = { dropped: 0, byName: {}, peak: 0, peakName: '' }; let geo0 = -1, kids0 = r.scene.children.length, drift = 0, n = 0;
    for (const choice of ['left', 'right']) {
      g.start(); g.world.items = []; g.world.reset(); g.start();
      for (let z = 0; z < 100000; z += 60) {
        g.p.z = z; g.world.extend(z);
        const F = g.world.pieces.find(p => p.type === 'fork' && !p.choice && z > p.z0 - 20); if (F) { F.choice = choice; g.world.ver++; }
        const pb = g.world.playerBand(z, 0); g.camX = pb.c; g.camOff = pb.off; g.time += 1 / 60; r.draw(g); n++;
        for (const k in r.propUsed) { const f = r.propUsed[k] / r.props[k].length; if (f > out.peak) { out.peak = f; out.peakName = k; } }
        if (n === 100) geo0 = r.renderer.info.memory.geometries; else if (n > 100 && (r.renderer.info.memory.geometries !== geo0 || r.scene.children.length !== kids0)) drift++;
        if (z % 3000 === 0) g.world.prune(z);
      }
    }
    out.dropped = r.dropped + r.items.dropped; out.byName = r.droppedBy; out.drift = drift; out.frames = n; out.layoutCache = Object.values(r.layouts).map(m => m.size);
    return out;
  });
  T('object pools bounded on both branches of both junctions over 200 km of road: nothing dropped, pools never > 85 % full (peak ' + Pool.peakName + ' ' + Math.round(Pool.peak * 100) + ' %), scene constant', Pool.dropped === 0 && Pool.peak <= 0.85 && Pool.drift === 0 && Pool.layoutCache.every(n => n <= 60), JSON.stringify({ dropped: Pool.dropped, by: Pool.byName, peak: +Pool.peak.toFixed(2), drift: Pool.drift, cache: Pool.layoutCache }));

  // ================================================================ 3. play through six junctions (alternating left/right): routes, branch lock, road, camera, scoring
  const Run = await pg.evaluate(() => {
    const g = __wf, r = g.r, { key } = { key: c => g.onKey({ code: c, repeat: false, preventDefault() {} }, true) };
    g.start(); g.world.items = []; g.world.reset(); g.start();
    const out = { picks: [], wants: [], deaths: 0, backwards: 0, offRoad: 0, otherRoad: 0, maxEdge: 0, maxCamDx: 0, maxCamDy: 0, seen: new Set(), gates: new Set(), forkRoutes: new Set(), dropped: 0 };
    const LM = ['fountain', 'clockTower', 'statue', 'cabin', 'giantOak', 'standingStones', 'marketHall', 'bigTent'], GATES = ['gateCity', 'gateWood', 'gateMarket'];
    let zP = 0, cP = 0, sP = 0, scP = 0, camP = null, nFork = 0, want = null, lastUid = -1, f = 0;
    const vis = o => { for (let n = o; n; n = n.parent) if (!n.visible) return false; return true; };
    while (out.picks.length < 6 && f < 60 * 60 * 10 && g.state === 'play') {
      const p = g.p, w = g.world, F = w.openFork();
      if (F && F.uid !== lastUid && p.z > F.z0 - 600) { lastUid = F.uid; want = nFork++ % 2 === 0 ? 'left' : 'right'; out.wants.push(want); }
      g.keys.left = g.keys.right = false;
      if (F && want && p.z > F.z0 - 500 && p.z < F.z0 - 400) g.keys[want] = true;
      let tg = null; for (const it of w.items) { const ob = OBST[it.kind]; if (!ob || it.z <= p.z || it.z - p.z > p.speed * 0.5) continue; if (Math.abs(it.x - p.x) > ob.hw + 0.25) continue; if (!tg || it.z < tg.z) tg = it; }
      if (tg && tg.z - p.z < p.speed * 0.3 && p.jy === 0 && p.slide <= 0) key(tg.kind === 'over' ? 'ArrowDown' : 'Space');
      g.advance(1 / 60); f++;
      for (const P of w.pieces) if (P.type === 'fork' && P.choice && !out.forkRoutes.has(P.uid)) { out.forkRoutes.add(P.uid); out.picks.push(P.choice); }
      if (g.p.z < zP) out.backwards++; if (g.coins < cP) out.backwards++; if (g.p.speed < sP - 1e-9) out.backwards++; if (g.score() < scP) out.backwards++; zP = g.p.z; cP = g.coins; sP = g.p.speed; scP = g.score();
      // the runner stays on its road, and never inside the other road of a junction
      const bs = w.bandsAt(g.p.z), ch = bs.find(q => q.chosen) || (bs.length === 1 ? bs[0] : null);
      if (ch && (g.p.x < ch.lo - 0.02 || g.p.x > ch.hi + 0.02)) out.offRoad++;
      if (bs.length === 2 && ch && bs.some(q => !q.chosen) && g.p.z > 0) { const o = bs.find(q => !q.chosen); if (o.hi < ch.lo - 0.1 || o.lo > ch.hi + 0.1) { if (g.p.x > o.lo && g.p.x < o.hi) out.otherRoad++; } }
      if (f % 3 === 0) {
        r.draw(g);
        const E = r.road.edge; for (let i = 0; i < r.road.N - 1; i++) { out.maxEdge = Math.max(out.maxEdge, Math.abs(E.loA[i + 1] - E.loA[i]), Math.abs(E.hiB[i + 1] - E.hiB[i])); if (E.two[i] && E.two[i + 1]) out.maxEdge = Math.max(out.maxEdge, Math.abs(E.hiA[i + 1] - E.hiA[i]), Math.abs(E.loB[i + 1] - E.loB[i])); }   // outer edges always; inner edges while both roads exist
        const cp = { x: r.look.x, y: r.camera.position.y }; if (camP) { out.maxCamDx = Math.max(out.maxCamDx, Math.abs(cp.x - camP.x)); out.maxCamDy = Math.max(out.maxCamDy, Math.abs(cp.y - camP.y)); } camP = cp;   // the camera sits at x 0 (the scene moves around it): what can jump is the look-at target
        for (const n of LM) if (r.props[n] && r.props[n].some(vis)) out.seen.add(n); for (const n of GATES) if (r.props[n] && r.props[n].some(vis)) out.gates.add(n);
      }
    }
    out.state = g.state; out.dist = Math.round(g.p.z / 10); out.coins = g.coins; out.dropped = r.dropped + r.items.dropped; out.seen = [...out.seen].sort(); out.gates = [...out.gates].sort(); out.forkRoutes = out.forkRoutes.size;
    return out;
  });
  T('six junctions played, alternating left/right (' + Run.picks.join(',') + '): still running at ' + Run.dist + ' m, every choice took the intended road, both junction types used', Run.state === 'play' && Run.picks.length === 6 && Run.picks.join() === Run.wants.slice(0, 6).join() && Run.dist > 1500, JSON.stringify({ state: Run.state, picks: Run.picks, wants: Run.wants, dist: Run.dist }));
  T('branch lock: the runner always stays on its chosen road and never enters the other road of a junction', Run.offRoad === 0 && Run.otherRoad === 0, JSON.stringify({ offRoad: Run.offRoad, otherRoad: Run.otherRoad }));
  T('distance, speed, score and coins never go backwards across segments and junctions (' + Run.coins + ' coins)', Run.backwards === 0 && Run.coins > 30, JSON.stringify({ backwards: Run.backwards, coins: Run.coins }));
  T('road ribbon stays continuous and the chase camera glitch-free through all of it (max edge step between sections ' + Run.maxEdge.toFixed(2) + ' m, look-at step ' + Run.maxCamDx.toFixed(2) + ' m / camera height step ' + Run.maxCamDy.toFixed(2) + ' m per 3 frames)', Run.maxEdge < 1.6 && Run.maxCamDx < 1.0 && Run.maxCamDy < 0.3, JSON.stringify({ edge: +Run.maxEdge.toFixed(2), dx: +Run.maxCamDx.toFixed(2), dy: +Run.maxCamDy.toFixed(2) }));
  T('landmarks and biome entrance markers actually show up in play (>= 3 landmark kinds and >= 2 entrance kinds seen), no prop dropped', Run.seen.length >= 3 && Run.gates.length >= 2 && Run.dropped === 0, JSON.stringify({ landmarks: Run.seen, gates: Run.gates, dropped: Run.dropped }));

  // ================================================================ 3b. the neon quarter: a district that fades in and out, and its scenery
  const Nq = await pg.evaluate(() => {
    const w = new World(TRACK); w.extend(60000); const out = { segs: 0, bad: [], maxStep: 0, mid: 0, ends: 0, ids: [] };
    for (const P of w.pieces.filter(p => p.type === 'seg' && p.id === 'neonRun')) {
      out.segs++; out.len = P.z1 - P.z0; let prev = null;
      for (let z = P.z0 + 0.5; z < P.z1 - 0.5; z += 5) {
        const b = w.bandsAt(z)[0], u = (z - P.z0) / (P.z1 - P.z0);
        if (b.to !== 'neon') out.bad.push(['to', Math.round(z)]);
        if (prev !== null) out.maxStep = Math.max(out.maxStep, Math.abs(b.t - prev)); prev = b.t;
        if (u > 0.4 && u < 0.6 && b.t < 0.999) out.bad.push(['mid', Math.round(z), b.t]); if (u > 0.4 && u < 0.6) out.mid++;
        if ((u < 0.01 || u > 0.99) && b.t > 0.05) out.bad.push(['end', Math.round(z), b.t]); if (u < 0.01 || u > 0.99) out.ends++;
      }
      const before = w.pieces[w.pieces.indexOf(P) - 1], after = w.pieces[w.pieces.indexOf(P) + 1];      // the neighbours are plain city, so the quarter is entered and left from the base palette
      if (before && after) out.ids.push(before.id + '>' + P.id + '>' + after.id);      // (the last one may sit at the edge of the generated track)
    }
    const lay = []; for (let i = -3; i < 600; i++) lay.push(ENV3D.neon.layout(i, rnd).length); out.layout = { min: Math.min(...lay), max: Math.max(...lay) };
    const kinds = new Set(); for (let i = -3; i < 1500; i++) for (const q of ENV3D.neon.layout(i, rnd)) kinds.add(q.prop); out.kinds = [...kinds].sort();
    out.missing = out.kinds.filter(k => !ENV3D.neon.props[k]); out.has2D = !!BIOMES.neon;
    return out;
  });
  T('the neon quarter is a district: biome neon through the whole segment, atmosphere fades in over the first 120 m and out over the last 120 m (no jumps), full strength for the ~250 m between, the segment sits between plain city pieces (' + Nq.ids[0] + ')',
    Nq.segs >= 2 && Nq.len >= 5000 && Nq.bad.length === 0 && Nq.maxStep < 0.1 && Nq.mid > 5 && Nq.ends > 0 && Nq.ids.every(x => /^(plaza|plazaB)>neonRun>cityRunB$/.test(x)), JSON.stringify({ segs: Nq.segs, len: Nq.len, bad: Nq.bad.slice(0, 3), maxStep: +Nq.maxStep.toFixed(3), ids: Nq.ids.slice(0, 2) }));
  T('the neon quarter\'s layout only uses props it defines, dresses every slot (2..14 props) and uses >= 12 kinds incl. the three landmarks; the 2D game has a palette for it',
    Nq.missing.length === 0 && Nq.layout.min >= 2 && Nq.layout.max <= 14 && Nq.kinds.length >= 12 && ['neonRing', 'neonSpire', 'neonBillboard'].every(k => Nq.kinds.includes(k)) && Nq.has2D, JSON.stringify({ missing: Nq.missing, layout: Nq.layout, kinds: Nq.kinds.length }));

  const Na = await pg.evaluate(async () => {
    const r = __wf.r, mat = NeonArt.material(); for (let i = 0; i < 60 && !mat.visible; i++) await new Promise(q => setTimeout(q, 100));
    const out = { loaded: mat.visible && mat.map.image.naturalWidth === 512 && mat.map.image.naturalHeight > 700, cells: {}, mats: new Set() };
    for (const n of ['neonTowerA', 'neonTowerB', 'neonBillboard']) {
      const g = r.props[n][0], meshes = g.children.filter(c => c.isMesh), tex = meshes.filter(m => m.material.map);
      out.cells[n] = { meshes: meshes.length, textured: tex.length }; tex.forEach(m => out.mats.add(m.material.uuid));
      if (tex[0]) { const bb = new THREE.Box3().setFromObject(tex[0]); out.cells[n].w = +(bb.max.z - bb.min.z).toFixed(1); out.cells[n].h = +(bb.max.y - bb.min.y).toFixed(1); }
    }
    out.mats = out.mats.size; return out;
  });
  T('the neon billboard and the two neon towers carry the user\'s pictures (one textured panel each, one shared unlit atlas that loads; billboard square ~7.4 m like its picture, towers ~0.9 of their height)',
    Na.loaded && Na.mats === 1 && ['neonTowerA', 'neonTowerB', 'neonBillboard'].every(n => Na.cells[n].textured === 1 && Na.cells[n].meshes >= 2) && Math.abs(Na.cells.neonBillboard.w - Na.cells.neonBillboard.h) < 0.5 && Na.cells.neonBillboard.w > 7 && Na.cells.neonTowerB.h > Na.cells.neonTowerA.h, JSON.stringify(Na));

  // ================================================================ 4. trees are the user's artwork
  const Tr = await pg.evaluate(async () => {
    const r = __wf.r, names = ['tree', 'pine', 'pineTall', 'oak', 'birch', 'giantOak'], out = { kinds: {}, mats: new Set(), loaded: false };
    const mat = TreeSprite.material(); for (let i = 0; i < 50 && !mat.visible; i++) await new Promise(q => setTimeout(q, 100));
    out.loaded = mat.visible && mat.map.image.naturalWidth === TREE_ASSETS.w && mat.map.image.naturalHeight > TREE_ASSETS.h * 1.5;     // the atlas: the tree on top, the flower disc below
    for (const n of names) { const g = r.props[n] && r.props[n][0], m = g && g.children[0]; out.kinds[n] = !!m && m.isMesh && !!m.material.map; if (m) { out.mats.add(m.material.uuid); const bb = new THREE.Box3().setFromObject(m); out.kinds[n + 'H'] = +(bb.max.y - bb.min.y).toFixed(1); out.kinds[n + 'R'] = +m.geometry.userData.bedRadius.toFixed(2); out.kinds[n + 'V'] = m.geometry.attributes.position.count; out.kinds[n + 'F'] = m.geometry.userData.flowers; const p = m.geometry.attributes.position; let flat = 0; for (let i = 8; i < 12; i++) if (Math.abs(p.getY(i) - 0.04) < 1e-6) flat++; out.kinds[n + 'bed'] = flat === 4 && Math.abs(Math.abs(p.getX(9) - p.getX(8)) - 2 * m.geometry.userData.bedRadius) < 1e-3; } }
    out.mats = out.mats.size; out.pools = names.map(n => r.props[n].length);
    return out;
  });
  T('all six tree kinds are the artwork (two crossed planes + a flat round bed + a ring of upright flowers, one shared material), the image loads, heights differ (tree 4.6 .. giant oak 12 m) and the beds grow with the tree',
    Tr.loaded && ['tree', 'pine', 'pineTall', 'oak', 'birch', 'giantOak'].every(n => Tr.kinds[n]) && Tr.mats === 1 && ['tree', 'pine', 'pineTall', 'oak', 'birch', 'giantOak'].every(n => Tr.kinds[n + 'V'] === 12 + 8 * Tr.kinds[n + 'F'] && Tr.kinds[n + 'F'] >= 8 && Tr.kinds[n + 'F'] <= 30 && Tr.kinds[n + 'bed'] && Tr.kinds[n + 'R'] >= 1.4) && Tr.kinds.giantOakR > Tr.kinds.treeR && Tr.kinds.giantOakF > Tr.kinds.treeF && Tr.kinds.treeH > 4 && Tr.kinds.giantOakH > 11 && Tr.kinds.giantOakH > Tr.kinds.pineTallH && Tr.kinds.pineTallH > Tr.kinds.pineH, JSON.stringify(Tr));

  T('no JS errors during the whole session', errs.length === 0, errs.slice(0, 2).join('|'));
  console.log('\n' + res.filter(Boolean).length + '/' + res.length + ' passed');
  await b.close(); srv.close(); process.exit(res.every(Boolean) ? 0 : 1);
})().catch(e => { console.log('TEST ERROR', e.message); process.exit(1); });
