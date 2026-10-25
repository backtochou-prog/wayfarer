// WAYFARER regression test: coin collection in the 3D build (prompt 11).
//
// Invariant checked on EVERY frame: the number of coin meshes that are actually visible in the scene equals the number of
// uncollected coins in draw range. A collected coin that stays on screen (or a coin-shaped "pickup effect" drawn where it was)
// breaks that equality at once, as does a collected coin that can be collected again.
//
// Run:  node tests/qa3d_coins.js      (needs playwright-core and a Chromium: set CHROMIUM=/path/to/chrome, and NODE_PATH or
//        PW_CORE=/path/to/node_modules/playwright-core if playwright-core is not installed next to the project)
const http = require('http'), fs = require('fs'), path = require('path');
let chromium; try { ({ chromium } = require('playwright-core')); } catch (e) { ({ chromium } = require(process.env.PW_CORE || 'playwright-core')); }
const ROOT = path.join(__dirname, '..'), PORT = 8114;
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
  await pg.goto('http://localhost:' + PORT + '/'); await pg.waitForFunction(() => window.__wf, null, { timeout: 30000 }); await pg.waitForTimeout(600);

  await pg.evaluate(() => {
    const g = __wf, r = g.r;
    r.renderer.render = () => {};                                         // CPU only: the scene graph still updates in draw()
    const visible = o => { for (let n = o; n; n = n.parent) if (!n.visible) return false; return true; };
    const coinLit = r.items.merged.coin.lit, coinGlow = r.items.merged.coin.glow;
    window.CT = {
      g, r,
      sparks: () => r.fx.sparks || [], sparkT: () => r.fx.sparkT || [],          // (tolerates a build without the sparkle pool, so the invariant checks still fail instead of crashing)
      key: c => g.onKey({ code: c, repeat: false, preventDefault() {} }, true),
      fresh() { g.start(); g.world.items = []; g.keys = {}; g.tleft = g.tright = false; return g; },
      add(dz, x, h, tag) { const it = { kind: 'coin', z: g.p.z + dz, x, h: h === undefined ? 12 : h, tag: tag || 'main' }; g.world.items.push(it); return it; },
      // every visible mesh that uses the coin geometry, wherever it sits in the scene (pooled coins AND any effect that reuses the coin)
      coinMeshes() { const out = []; r.scene.traverse(o => { if (o.isMesh && (o.geometry === coinLit || o.geometry === coinGlow) && visible(o)) { const p = new THREE.Vector3(); (o.parent || o).getWorldPosition(p); out.push({ lit: o.geometry === coinLit, x: p.x, y: p.y, z: p.z }); } }); return out; },
      untakenInRange() { let n = 0; for (const it of g.world.items) { const dz = it.z - g.p.z; if (it.kind === 'coin' && !it.taken && dz >= -150 && dz <= 1500) n++; } return n; },
      // where the renderer would draw this coin right now (scene metres, runner at z = 0)
      sceneSpot(it) { const U = U3, Lref = (g.camX + g.camOff) * U.X, off = g.world.bandNear(it.z, it.x).off; return { x: (it.x + off) * U.X - Lref, y: it.h * U.Y, z: -(it.z - g.p.z) * U.Z }; },
      // one frame: advance, draw, then check the invariant; returns what was found
      frame() {
        const before = g.coins; g.advance(1 / 60); r.draw(g);
        const m = CT.coinMeshes(), lit = m.filter(q => q.lit).length, glow = m.length - lit, used = r.items.used.coin, untaken = CT.untakenInRange();
        return { picked: g.coins - before, lit, glow, used, untaken, ok: lit === used && glow === used && used === untaken && r.items.dropped === 0 };
      },
    };
  });

  // ---------------------------------------------------------------- 1. a line of coins: each vanishes the frame it is collected, counted once
  const A = await pg.evaluate(() => {
    const { g, r } = CT; CT.fresh(); const coins = [0, 1, 2, 3, 4].map(k => CT.add(80 + 26 * k, g.p.x, 12)); const z0 = g.p.z;
    const out = { frames: 0, bad: [], pickups: 0, ghost: 0, visibleAfter: 0, calls: 0, sparkFrames: 0, sparkCoinGeo: 0 };
    const orig = r.onCoin.bind(r); r.onCoin = (gg, it) => { out.calls++; orig(gg, it); };
    const gone = [];                                                       // coins collected so far
    for (let f = 0; f < 140; f++) {
      const res = CT.frame(); out.frames++;
      if (!res.ok) out.bad.push({ f, ...res });
      if (res.picked) { out.pickups += res.picked; for (const it of coins) if (it.taken && !gone.includes(it)) gone.push(it); }
      // no coin mesh within 0.4 m of any collected coin's spot, this frame and every later one
      for (const it of gone) { const s = CT.sceneSpot(it); for (const q of CT.coinMeshes()) if (Math.hypot(q.x - s.x, q.z - s.z) < 0.4 && Math.abs(q.y - s.y) < 0.6) out.ghost++; }
      if (CT.sparks().some(m => m.visible)) out.sparkFrames++;
    }
    out.counter = g.coins; out.allTaken = coins.every(it => it.taken); out.meshesLeft = CT.coinMeshes().length; out.z0 = z0;
    out.sparkGeo = CT.sparks().length > 0 && CT.sparks().every(m => m.geometry !== r.items.merged.coin.lit && m.geometry !== r.items.merged.coin.glow);
    r.onCoin = orig; return out;
  });
  T('coins vanish at pickup: on every frame the coin meshes drawn = the uncollected coins in range (' + A.frames + ' frames, 5 coins)', A.bad.length === 0, JSON.stringify(A.bad.slice(0, 2)));
  T('no coin mesh is left at (or flying away from) a collected coin\'s spot, on the pickup frame or after', A.ghost === 0 && A.meshesLeft === 0, 'ghost sightings ' + A.ghost + ', meshes left ' + A.meshesLeft);
  T('counter increases exactly once per coin (5 coins -> 5, pickup hook called 5 times)', A.counter === 5 && A.pickups === 5 && A.calls === 5 && A.allTaken, JSON.stringify({ counter: A.counter, pickups: A.pickups, calls: A.calls }));
  T('the pickup effect is a separate sparkle (shown briefly, not made of the coin geometry)', A.sparkFrames > 5 && A.sparkFrames < 60 && A.sparkGeo, 'spark frames ' + A.sparkFrames);

  // ---------------------------------------------------------------- 2. a collected coin cannot be collected again (run back through the same stretch)
  const B = await pg.evaluate(() => {
    const { g, r } = CT; const c0 = g.coins; const taken0 = g.world.items.filter(i => i.kind === 'coin' && i.taken).length;
    g.p.z -= 400; g.p.vx = 0; const bad = []; for (let f = 0; f < 60; f++) { const res = CT.frame(); if (!res.ok) bad.push({ f, ...res }); }
    return { gained: g.coins - c0, taken0, taken1: g.world.items.filter(i => i.kind === 'coin' && i.taken).length, bad: bad.length, meshes: CT.coinMeshes().length };
  });
  T('a collected coin cannot be collected again (re-running the same stretch adds nothing, shows nothing)', B.gained === 0 && B.taken0 === B.taken1 && B.bad === 0 && B.meshes === 0, JSON.stringify(B));

  // ---------------------------------------------------------------- 3. recycled pool slots: a later coin reusing the slot is visible, uncollected and counts once
  const Rc = await pg.evaluate(() => {
    const { g, r } = CT; CT.fresh(); const first = CT.add(60, g.p.x, 12), later = [CT.add(1100, g.p.x, 12), CT.add(1126, g.p.x, 12)];
    const slot0 = r.items.pool.coin[0], seen = { first: false, hiddenAfter: false, laterVisible: false, laterSameSlot: false }, bad = [];
    let c0 = g.coins, afterFirst = null;
    for (let f = 0; f < 400 && g.state === 'play'; f++) {
      const res = CT.frame(); if (!res.ok) bad.push({ f, ...res });
      if (!seen.first && slot0.visible && !first.taken) seen.first = true;               // slot 0 shows the first coin
      if (first.taken && afterFirst === null) afterFirst = g.coins - c0;
      if (first.taken && !later[0].taken && CT.coinMeshes().length > 0 && slot0.visible) { seen.laterVisible = true; seen.laterSameSlot = true; }   // the same slot now shows a later coin
      if (first.taken && !seen.hiddenAfter && CT.coinMeshes().length === 0) seen.hiddenAfter = true;
    }
    return { seen, afterFirst, total: g.coins - c0, laterTaken: later.every(i => i.taken), bad: bad.length, state: g.state };
  });
  T('pool slots are reused: slot shows the first coin, goes empty after pickup, later shows a fresh uncollected coin that is collected once each', Rc.seen.first && Rc.seen.hiddenAfter && Rc.seen.laterSameSlot && Rc.afterFirst === 1 && Rc.total === 3 && Rc.laterTaken && Rc.bad === 0, JSON.stringify(Rc));

  // ---------------------------------------------------------------- 4. both branches of the fork (real world, bot avoids hazards), invariant on every frame
  const Br = await pg.evaluate(() => {
    const { g, r, key } = CT; const out = {};
    const bot = want => {
      const p = g.p, w = g.world, F = w.openFork(); g.keys.left = g.keys.right = false;
      if (F && p.z > F.z0 - 500 && p.z < F.z0 - 400) g.keys[want] = true;
      let tg = null; for (const it of w.items) { const ob = OBST[it.kind]; if (!ob || it.z <= p.z || it.z - p.z > p.speed * 0.5) continue; if (Math.abs(it.x - p.x) > ob.hw + 0.25) continue; if (!tg || it.z < tg.z) tg = it; }
      if (tg && tg.z - p.z < p.speed * 0.3 && p.jy === 0 && p.slide <= 0) key(tg.kind === 'over' ? 'ArrowDown' : 'Space');
    };
    for (const want of ['left', 'right']) {
      CT.fresh(); g.world.reset(); g.start();
      const F0 = g.world.openFork(); g.p.z = F0.z0 - 1500; g.world.extend(g.p.z);
      const other = F0.uid + (want === 'left' ? 'right' : 'left'), mine = F0.uid + want, tags = [];
      let calls = 0, bad = 0, first = null, otherSeen = 0; const orig = r.onCoin.bind(r); r.onCoin = (gg, it) => { calls++; tags.push(it.tag); orig(gg, it); };
      const c0 = g.coins;
      for (let f = 0; f < 60 * 80 && g.state === 'play' && g.p.z < F0.z1 + 1500; f++) {
        bot(want); const res = CT.frame(); if (!res.ok) { bad++; if (!first) first = { f, ...res }; }
        if (g.p.z > F0.fe + 200 && g.p.z < F0.be - 200) otherSeen = Math.max(otherSeen, g.world.items.filter(i => i.kind === 'coin' && i.tag === other && !i.taken && Math.abs(i.z - g.p.z) < 1500).length);   // the other road's coins are still there, on the other road
      }
      out[want] = { state: g.state, chose: F0.choice, coins: g.coins - c0, calls, bad, first, takenCount: tags.length, tookOtherRoad: tags.filter(t => t === other).length, branchCoinsTaken: tags.filter(t => t === mine).length, otherRoadSeen: otherSeen };
      r.onCoin = orig;
    }
    return out;
  });
  for (const side of ['left', 'right']) { const B2 = Br[side];
    T('branch ' + side + ': invariant holds on every frame, counter = pickups (' + B2.coins + '), only the chosen road\'s coins are collected, the other road\'s coins stay uncollected',
      B2.state === 'play' && B2.chose === side && B2.bad === 0 && B2.coins === B2.calls && B2.coins === B2.takenCount && B2.coins > 20 && B2.branchCoinsTaken > 3 && B2.tookOtherRoad === 0 && B2.otherRoadSeen > 3, JSON.stringify(B2)); }

  // ---------------------------------------------------------------- 5. restart: counter and coins reset, nothing stale on screen, coins work again
  const Rs = await pg.evaluate(() => {
    const { g, r } = CT; CT.fresh(); const c1 = CT.add(60, g.p.x, 12); const bad = [];
    for (let f = 0; f < 60; f++) { const res = CT.frame(); if (!res.ok) bad.push(f); }
    const beforeCoins = g.coins, hadSparks = CT.sparks().some(m => m.visible) || CT.sparkT().some(t => t >= 0);
    g.state = 'over'; g.overT = 1; g.onKey({ code: 'Enter', repeat: false, preventDefault() {} }, true);   // the real restart path (Enter / Space / R / RUN AGAIN)
    const out = { beforeCoins, hadSparks, state: g.state, coins: g.coins, anyTaken: g.world.items.some(i => i.taken), sparksClear: CT.sparkT().every(t => t < 0) && CT.sparks().every(m => !m.visible), routeClear: g.world.pieces.every(p => !p.choice) };
    g.world.items = []; const c2 = CT.add(60, g.p.x, 12); let ok = true, n = 0;
    for (let f = 0; f < 60; f++) { const res = CT.frame(); if (!res.ok) ok = false; n += res.picked; }
    out.afterCounter = g.coins; out.afterPicked = n; out.afterTaken = c2.taken; out.afterOk = ok && bad.length === 0; out.meshes = CT.coinMeshes().length;
    return out;
  });
  T('restart: counter back to 0, no coin marked collected, no leftover effects or route choice; coins can be collected (once) again', Rs.beforeCoins === 1 && Rs.coins === 0 && !Rs.anyTaken && Rs.sparksClear && Rs.routeClear && Rs.afterCounter === 1 && Rs.afterPicked === 1 && Rs.afterTaken && Rs.afterOk && Rs.meshes === 0, JSON.stringify(Rs));

  T('no JS errors during the whole session', errs.length === 0, errs.slice(0, 2).join('|'));
  console.log('\n' + res.filter(Boolean).length + '/' + res.length + ' passed');
  await b.close(); srv.close(); process.exit(res.every(Boolean) ? 0 : 1);
})().catch(e => { console.log('TEST ERROR', e.message); process.exit(1); });
