// WAYFARER regression test: Utrecht, the zone the train goes to (tramRun > gareMidi > utrechtA > utrechtB > utrechtC > the neon quarter). Checks the track and its hand-overs (the cutscene ends on the
// station and the new zone's sky is in at once), the surfboard (the runner is on the water in these three stretches and only there, no scooter), the photographic water strip (visible only on the
// canals, fading with the zone), the water looks of the three hazards (same sizes as the collision boxes), the camera clearance under the bridge and the gallery, the props (pools bounded through
// the whole zone), a bot playing through all of it, the HUD names, and that the classic 2D game runs through it.
//
// Run:  node tests/qa3d_utrecht.js     (needs playwright-core and a Chromium: CHROMIUM=/path/to/chrome, NODE_PATH or PW_CORE as for the other tests; TEST_URL=https://... tests a deployment)
const http = require('http'), fs = require('fs'), path = require('path');
let chromium; try { ({ chromium } = require('playwright-core')); } catch (e) { ({ chromium } = require(process.env.PW_CORE || 'playwright-core')); }
const ROOT = path.join(__dirname, '..'), PORT = 8123;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const res = []; const T = (n, ok, i = '') => { res.push(ok); console.log((ok ? 'PASS ' : 'FAIL ') + n + (i !== '' ? '  [' + i + ']' : '')); };

(async () => {
  const srv = http.createServer((q, r) => {
    let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
    fs.readFile(path.join(ROOT, p), (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' }); r.end(d); } });
  }).listen(PORT);
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/root/.cache/ms-playwright/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const base = process.env.TEST_URL || 'http://localhost:' + PORT + '/';
  const open = async url => { const pg = await (await b.newContext({ viewport: { width: 480, height: 270 } })).newPage(); pg.errs = []; pg.on('pageerror', e => pg.errs.push(e.message)); pg.on('console', m => m.type() === 'error' && !/404/.test(m.text()) && pg.errs.push(m.text())); await pg.goto(url, { timeout: 90000 }); await pg.waitForFunction(() => window.__wf, null, { timeout: 60000 }); await pg.waitForTimeout(500); return pg; };
  const pg = await open(base);
  await pg.evaluate(() => {
    window.H = {
      // a run placed in a piece of the track: the runner at z0 + dz, hazards ahead kept, the atmosphere set as the game would have it
      at(seg, dz, speed = 300) { const g = __wf; g.r.renderer.render = () => {}; g.start(); g.world.extend(80000); const P = g.world.pieces.find(p => p.id === seg); g.state = 'play'; g.p.z = P.z0 + dz; g.p.x = 0; g.p.speed = speed; g.scene = null; g.fadeIn = 0; g.world.extend(g.p.z);
        const a = g.world.playerBand(g.p.z + 300, 0); g.bgTo = a.to; g.bgT = a.t; g.die = () => {}; return { g, P }; },
      draw(n = 3) { const g = __wf; for (let i = 0; i < n; i++) { g.time += 1 / 60; g.r.draw(g); } },
      bot() {                                                                                    // jumps or slides at the hazards in its own lane, timed to its real speed
        const g = __wf, p = g.p, mul = g.pk ? g.pk.speedMul : 1, hz = g.world.items.filter(it => OBST[it.kind] && !it.taken && it.z > p.z - 12 && it.z < p.z + 300); g.keys.left = g.keys.right = false;
        let tg = null; for (const it of hz) { const o = OBST[it.kind]; if (Math.abs(it.x - p.x) > o.hw + P_HW + 0.08 || it.z <= p.z - 2) continue; if (!tg || it.z < tg.z) tg = it; }
        if (tg) { const d = tg.z - p.z, v = p.speed * mul, key = c => g.onKey({ code: c, key: c, repeat: false, preventDefault() {} }, true); if (tg.kind === 'over') { if (d < v * 0.2 + 10 && p.jy === 0 && p.slide <= 0) key('ArrowDown'); } else if (d < v * 0.26 + 8 && p.jy === 0 && !hz.some(it => it.kind === 'over' && it.z > p.z - 10 && it.z < p.z + 12)) key('Space'); }
      },
    };
  });

  // ================================================================ 1. the track
  const K = await pg.evaluate(() => {
    const out = {}, w = new World(TRACK); w.extras = true; w.extend(120000); const ids = w.pieces.map(p => p.id || 'fork'), i = ids.indexOf('gareMidi');
    out.seq = ids.slice(i - 1, i + 5).join('>'); const G = w.pieces[i], A = w.pieces[i + 1], B = w.pieces[i + 2], C = w.pieces[i + 3], F = w.pieces[i + 4];
    out.len = [G, A, B, C].map(P => P.z1 - P.z0); out.biome = [A, B, C].map(P => P.seg.biome); out.names = [A, B, C].map(P => P.seg.name);
    out.door = G.z0 + G.seg.scene.at + G.seg.scene.run; out.toEnd = G.z1 - out.door;                       // the station ends 400 units after the door
    const t = z => w.bandsAt(z)[0]; out.t = [G.z1 - 2, A.z0 + 2, A.z1 - 2, B.z0 + 2, B.z1 - 2, C.z0 + 2, C.z0 + 4000, C.z1 - 350, C.z1 - 2].map(z => [t(z).to, +t(z).t.toFixed(2)]);
    let maxStep = 0, prev = null; for (let z = A.z0 + 1; z < C.z1 - 1; z += 5) { const v = t(z).t; if (prev !== null) maxStep = Math.max(maxStep, Math.abs(v - prev)); prev = v; } out.maxStep = +maxStep.toFixed(3);
    out.nextIsNeon = F.id === 'neonRun'; out.atmo = ['utrecht', 'utrechtA', 'utrechtB'].map(k => BIOMES[k] && BIOMES[k].atmo);
    // the zone's hazards and pickups are all inside the three pieces
    const inZ = w.items.filter(it => it.kind !== 'prop' && it.z >= A.z0 && it.z < C.z1); out.hz = inZ.filter(it => OBST[it.kind]).length; out.kinds = [...new Set(inZ.map(it => it.kind))].sort();
    out.dom = w.items.filter(it => it.kind === 'prop' && it.spr === 'utDom').length;
    out.envs = ['utrecht', 'utrechtA', 'utrechtB'].map(k => !!ENV3D[k] && !!ENV3D[k].layout && ENV3D[k].road.water === true && ENV3D[k].props === ENV3D.utrecht.props);
    out.extraNames = [...new Set(inZ.map(it => it.pat).filter(n => n && PATTERNS_X[n]))].sort();
    return out;
  });
  T('the track: ' + K.seq + '; the station is ' + K.len[0] + ' units (the door ' + K.toEnd + ' units before its end), then Utrecht in three pieces (' + K.len.slice(1).join(' + ') + ' units: ' + K.names.join(', ') + ') and then the neon quarter; one atmosphere for all three (' + K.atmo.join(', ') + '), fully in from the first unit and fading out only over the last 700 of the Oudegracht (largest step ' + K.maxStep + ')',
    K.seq === 'tramRun>gareMidi>utrechtA>utrechtB>utrechtC>neonRun' && K.len[0] === 1300 && K.toEnd === 400 && K.biome.join() === 'utrechtA,utrechtB,utrecht' && K.names.join() === 'UTRECHT CENTRAAL,HOOG CATHARIJNE,OUDEGRACHT' && K.atmo.every(a => a === 'utrecht') && K.t.slice(0, 7).every(x => x[1] === 1) && K.t[8][1] === 0 && K.t[7][1] > 0.2 && K.t[7][1] < 0.8 && K.maxStep < 0.02 && K.nextIsNeon && K.envs.every(Boolean), JSON.stringify({ t: K.t, len: K.len }));
  T('the zone has coins, hazards (' + K.hz + ' of them), shards and power-ups, the skill patterns (' + K.extraNames.join(', ') + ') and the Dom tower as a fixed prop (' + K.dom + ')', ['coin', 'crate', 'barrier', 'over', 'shard'].every(k => K.kinds.includes(k)) && K.hz >= 15 && K.extraNames.length >= 3 && K.dom >= 1, JSON.stringify(K.kinds));

  // ================================================================ 2. the cutscene hands over to Utrecht: its sky and light are in at once (no dip back to the old look), the surfboard comes with the water
  const HO = await pg.evaluate(() => {
    const out = {}; const { g, P } = H.at('gareMidi', 0); const sc = P.seg.scene; g.world.items = g.world.items.filter(i => i.kind === 'prop'); g.p.z = P.z0 + sc.at - 10; g.p.speed = 340; g.advance = g.advance; const adv = (n) => { for (let i = 0; i < n; i++) g.advance(1 / 60); };
    g.bgTo = 'gare'; g.bgT = 1; adv(5); out.inScene = g.state; let f = 0; while (g.state === 'scene' && f < 60 * 14) { adv(1); f++; if (f % 30 === 0) H.draw(1); }
    out.end = { state: g.state, z: Math.round(g.p.z - P.z0), bgTo: g.bgTo, bgT: g.bgT, surf: g.surf, fadeIn: +g.fadeIn.toFixed(2) };
    let minT = 1, toSeen = new Set(); const surfAt = []; for (let k = 0; k < 90; k++) { adv(1); minT = Math.min(minT, g.bgT); toSeen.add(g.bgTo); if (k % 15 === 0) surfAt.push([Math.round(g.p.z - P.z0), g.surf]); }
    out.after = { minT: +minT.toFixed(3), to: [...toSeen].join(), surfAt };
    return out;
  });
  T('after the cutscene the new zone\'s atmosphere is in at once: the run resumes at unit ' + HO.end.z + ' of the station with the sky already Utrecht\'s (' + HO.end.bgTo + ', ' + HO.end.bgT + '), fading in from black (' + HO.end.fadeIn + '), and over the next 1.5 s it never dips (lowest ' + HO.after.minT + ', ' + HO.after.to + '); the surfboard comes on with the water, 240 units later (' + JSON.stringify(HO.after.surfAt) + ')',
    HO.inScene === 'scene' && HO.end.state === 'play' && HO.end.z === 1000 && HO.end.bgTo === 'utrechtA' && HO.end.bgT === 1 && HO.end.fadeIn > 0.8 && HO.after.minT >= 0.99 && HO.after.to === 'utrechtA' && HO.end.surf === false && HO.after.surfAt.some(x => x[1] === true) && HO.after.surfAt[0][1] === false, JSON.stringify(HO));

  // ================================================================ 3. the surfboard: on the water in the three stretches and only there; no scooter
  const SF = await pg.evaluate(() => {
    const out = {}; const probe = (seg, dz) => { const { g } = H.at(seg, dz); for (let i = 0; i < 40; i++) g.advance(1 / 60); H.draw(40); const R = g.r.runner; return { surf: g.surf, riding: g.riding, vehicle: R.vehicle, sf: R.surfB.visible, sc: R.scooter.visible, bd: R.board.visible, ride: +R.ride.toFixed(2), hint: g.scooterHint }; };
    out.A = probe('utrechtA', 600); out.B = probe('utrechtB', 600); out.C = probe('utrechtC', 600); out.tram = probe('tramRun', 1500); out.gare = probe('gareMidi', 200); out.cityB = probe('neonRun', 300);
    // a scooter cannot be taken on the water (E and the indicator do nothing), and the runner's collision body is the same on the board
    const { g } = H.at('utrechtC', 600); g.advance(1 / 60); g.scooterHint = { x: 100, y: 100, rx: 20, ry: 5, kind: 'scooter' }; g.onKey({ code: 'KeyE', repeat: false, preventDefault() {} }, true); out.mount = { riding: g.riding, surf: g.surf };
    // jump and slide work on the board (same heights, same slide time)
    g.p.jy = 0; g.jump(); for (let i = 0; i < 20; i++) g.advance(1 / 60); out.jumpY = Math.round(g.p.jy); g.slideKey(); out.slide = g.p.slide > 0 || g.p.jy > 0;
    // the end of the zone: the board goes when the water fades below half (the last stretch of the Oudegracht), the scooter is not offered
    const e = H.at('utrechtC', 5100); e.g.advance(1 / 60); out.endSurf = e.g.surf; const e2 = H.at('utrechtC', 4500); e2.g.advance(1 / 60); out.nearEnd = e2.g.surf;
    return out;
  });
  T('the runner is on a surfboard in all three stretches (A ' + SF.A.surf + ', B ' + SF.B.surf + ', C ' + SF.C.surf + ': board visible, scooter and skateboard hidden) and not in Saint-Gilles, the station or the old town (' + [SF.tram.surf, SF.gare.surf, SF.cityB.surf].join(', ') + ' / board ' + [SF.tram.sf, SF.gare.sf, SF.cityB.sf].join(', ') + '); E does not take a scooter on the water (' + SF.mount.riding + '); the board is gone again once the canal has faded (' + SF.endSurf + ')',
    [SF.A, SF.B, SF.C].every(x => x.surf && x.vehicle === 'surf' && x.sf && !x.sc && !x.bd && x.ride > 0.9 && !x.riding && !x.hint) && [SF.tram, SF.gare, SF.cityB].every(x => !x.surf && !x.sf) && SF.mount.riding === false && SF.mount.surf === true && SF.endSurf === false && SF.nearEnd === true, JSON.stringify(SF));
  T('jumping and sliding are the same on the board (a jump reaches ' + SF.jumpY + ' units after 20 frames, a slide or a jump is accepted)', SF.jumpY >= 20 && SF.jumpY <= 45 && SF.slide, '');

  // ================================================================ 4. the water: a photographic strip on the canals only, with the zone's blend as its alpha
  const WT = await pg.evaluate(() => {
    const out = {}; const probe = (seg, dz) => { const { g } = H.at(seg, dz); H.draw(3); const W = g.r.road.wat, a = []; for (let i = 0; i < g.r.road.N; i += 4) a.push(W.col[i * 8 + 3]); return { vis: W.mesh.visible, any: Math.max(...a), min: Math.min(...a), tex: !!W.mesh.material.map.image && W.mesh.material.map.image.naturalWidth === 256 }; };
    out.A = probe('utrechtA', 800); out.C = probe('utrechtC', 2000); out.city = probe('neonRun', 300); out.tram = probe('tramRun', 1500); out.fade = probe('utrechtC', 4950);
    const { g } = H.at('utrechtC', 2000); H.draw(3); const W = g.r.road.wat; const u = Array.from(W.uv.slice(0, 8)); out.uvStatic = []; const lat0 = W.uv[0] * 3.4 - g.r.road.edge.loA[0] * 0 ; g.p.z += 12; g.world.extend(g.p.z); H.draw(3); out.uvAfter = Array.from(W.uv.slice(0, 4));
    out.sat = { w: UTRECHT_WATER.w, src: UTRECHT_WATER.src.slice(0, 22) };
    return out;
  });
  T('the water is the user\'s canal photo as a translucent strip over the road: visible in the basin and on the Oudegracht (alpha up to ' + WT.A.any.toFixed(2) + ' / ' + WT.C.any.toFixed(2) + ', a 256 px tile ' + WT.A.tex + '), not on the old town or in Saint-Gilles (' + WT.city.vis + ', ' + WT.tram.vis + '), and fading out with the zone near its end (alpha ' + WT.fade.any.toFixed(2) + ' then, down to ' + WT.fade.min.toFixed(2) + ' at the far end)',
    WT.A.vis && WT.C.vis && WT.A.any > 0.8 && WT.C.any > 0.8 && WT.A.tex && !WT.city.vis && !WT.tram.vis && WT.fade.any < 0.8 && WT.fade.min < 0.4 && WT.sat.src.startsWith('data:image/webp'), JSON.stringify(WT));

  // ================================================================ 5. the hazards on the water: the same boxes, a water look (barrels, a rowing boat, a low brick footbridge)
  const HZ = await pg.evaluate(() => {
    const out = {}; const U = U3, box = (r, name) => { const m = r.items.pool[name][0]; m.updateMatrixWorld(true); const bb = new THREE.Box3().setFromObject(m); return { w: +(bb.max.x - bb.min.x).toFixed(2), h: +bb.max.y.toFixed(2), y0: +bb.min.y.toFixed(2), d: +(bb.max.z - bb.min.z).toFixed(2) }; };
    const { g } = H.at('utrechtC', 100); const r = g.r; for (const k of ['crateW', 'barrierW', 'overW', 'crate', 'barrier', 'over']) { const m = r.items.pool[k][0]; m.visible = true; m.position.set(0, 0, 0); }
    out.dims = {}; for (const k of ['crateW', 'barrierW', 'overW', 'crate', 'barrier', 'over']) out.dims[k] = box(r, k);
    out.ob = { over: 2 * OBST.over.hw * U.X }; out.coll = { crate: [2 * OBST.crate.hw * U.X, OBST.crate.y1 * U.Y], barrier: [2 * OBST.barrier.hw * U.X, OBST.barrier.y1 * U.Y], over: [2 * OBST.over.hw * U.X, OBST.over.y0 * U.Y, OBST.over.y1 * U.Y] };
    // on the water the renderer picks the water pools, elsewhere the ordinary ones
    const used = (seg, dz, kind, off) => { const { g: gg, P } = H.at(seg, dz); const it = gg.world.items.filter(i => i.kind === kind && i.z > P.z0 + dz).sort((a, b) => a.z - b.z)[0]; gg.p.z = it.z - off; gg.world.extend(gg.p.z); const a = gg.world.playerBand(gg.p.z + 300, 0); gg.bgTo = a.to; gg.bgT = a.t; H.draw(2); const I = gg.r.items.used; return { w: I[kind + 'W'], n: I[kind] }; };
    out.wetC = used('utrechtC', 0, 'crate', 80); out.wetB = used('utrechtB', 0, 'over', 80); out.dryCity = used('cityRunB', 600, 'crate', 80); out.dryTram = used('tramRun', 600, 'barrier', 80);
    return out;
  });
  const D = HZ.dims, C = HZ.coll;
  T('the water looks keep the collision sizes: barrels ' + D.crateW.w + ' x ' + D.crateW.h + ' m (box ' + C.crate[0].toFixed(2) + ' x ' + C.crate[1].toFixed(2) + '), the rowing boat ' + D.barrierW.w + ' x ' + D.barrierW.h + ' m (box ' + C.barrier[0].toFixed(2) + ' x ' + C.barrier[1].toFixed(2) + '), the footbridge ' + D.overW.w + ' m wide, underside at ' + D.overW.y0 + ' m (box ' + C.over[1].toFixed(2) + '), top at ' + D.overW.h + ' m (box ' + C.over[2].toFixed(2) + '); the renderer draws them only on water road (' + JSON.stringify(HZ.wetC) + ' / ' + JSON.stringify(HZ.wetB) + ' on, ' + JSON.stringify(HZ.dryCity) + ' / ' + JSON.stringify(HZ.dryTram) + ' off)',
    Math.abs(D.crateW.w - C.crate[0]) < 0.25 && Math.abs(D.crateW.h - C.crate[1]) < 0.1 && Math.abs(D.barrierW.w - C.barrier[0]) < 0.15 && D.barrierW.h <= C.barrier[1] + 0.05 && D.barrierW.h >= C.barrier[1] - 0.15 && D.overW.w >= HZ.ob.over && D.overW.w < HZ.ob.over + 1.2 && D.overW.h <= C.over[2] + 0.05 && D.overW.h >= C.over[2] - 0.3 &&
    HZ.wetC.w >= 1 && HZ.wetC.n === 0 && HZ.wetB.w >= 1 && HZ.wetB.n === 0 && HZ.dryCity.n >= 1 && HZ.dryCity.w === 0 && HZ.dryTram.w === 0, JSON.stringify(D));

  // ================================================================ 6. the camera is never inside the bridge or the gallery: nothing under 4.9 m in the middle 3 m of the bridge arch or under 6.5 m in the gallery
  const CL = await pg.evaluate(() => {
    const out = {}; const E = ENV3D.utrecht, clearance = (name, halfW, yMax) => { const m = E.props[name](); const geos = [m.merged ? m.merged.lit : m.lit, m.merged ? m.merged.glow : m.glow]; let bad = 0, n = 0; for (const g of geos) { if (!g) continue; const a = g.attributes.position.array; for (let i = 0; i < a.length; i += 3) { n++; if (Math.abs(a[i]) < halfW && a[i + 1] < yMax && a[i + 1] > 0.3) bad++; } } return { bad, n }; };
    out.bridge = clearance('utBridge', 1.5, 4.9); out.gallery = clearance('utTunnel', 2.5, 6.5);
    // the crown is high enough for the chase camera (4.2 m) and the street ramps down to the quays
    const m = E.props.utBridge(), a = m.lit.attributes.position.array; let top = 0; for (let i = 1; i < a.length; i += 3) top = Math.max(top, a[i]); out.top = +top.toFixed(1);
    return out;
  });
  T('the chase camera (4.2 m) is never inside the bridge or the gallery: nothing in the middle 3 m of the bridge arch below 4.9 m (' + CL.bridge.bad + ' vertices), nothing in the middle 5 m of the gallery below 6.5 m (' + CL.gallery.bad + '), the bridge crown reaches ' + CL.top + ' m', CL.bridge.bad === 0 && CL.gallery.bad === 0 && CL.top >= 6, JSON.stringify(CL));

  // ================================================================ 7. a bot plays the whole zone: from the cutscene to the junction, pools bounded, nothing dropped, coins and shards counted
  const RUN = await pg.evaluate(() => {
    const { g, P } = H.at('gareMidi', 0, 340); const r = g.r, sc = P.seg.scene; g.world.items = g.world.items.filter(i => i.kind === 'prop' || i.z > P.z1); g.die = Game.prototype.die; g.p.z = P.z0 + sc.at - 10; g.p.speed = 340; g.bgTo = 'gare'; g.bgT = 1; g.pk.reset(); g.pk.save = Perks.defaults();
    const A = g.world.pieces.find(p => p.id === 'utrechtA'), Cc = g.world.pieces.find(p => p.id === 'utrechtC'), F = { z0: Cc.z1 + 100 }, out = { names: new Set(), surfFrames: 0, frames: 0, maxItems: 0 };
    let geo0 = -1, kids0 = r.scene.children.length, f = 0, drift = 0;
    while (g.p.z < F.z0 - 200 && (g.state === 'play' || g.state === 'scene') && f < 60 * 120) {
      if (g.state === 'play') H.bot(); g.advance(1 / 60); f++;
      if (g.state === 'play' && g.p.z > A.z0) { out.frames++; if (g.surf) out.surfFrames++; out.names.add(g.world.track.segments[g.world.playerBand(g.p.z, g.p.x).route].name); }
      out.maxItems = Math.max(out.maxItems, g.world.items.filter(i => i.z > g.p.z - 100 && i.z < g.p.z + 3000).length);        // (the items of the next 300 m)
      if (f % 6 === 0) { g.time += 0; r.draw(g); if (f >= 600 && geo0 < 0) geo0 = r.renderer.info.memory.geometries; else if (geo0 >= 0 && (r.renderer.info.memory.geometries !== geo0 || r.scene.children.length !== kids0)) drift++; }
    }
    out.state = g.state; out.z = Math.round(g.p.z - Cc.z0); out.coins = g.coins; out.shards = g.pk.shards; out.near = g.pk.nearMisses; out.dropped = r.dropped + r.items.dropped; out.by = r.droppedBy; out.drift = drift; out.names = [...out.names]; out.score = g.score(); out.reachedFork = g.p.z >= F.z0 - 200;
    return out;
  });
  T('a bot plays through the whole zone from the cutscene to the junction (' + RUN.frames + ' frames, ' + RUN.coins + ' coins, ' + RUN.shards + ' shards, ' + RUN.near + ' near misses, alive: ' + RUN.state + '), on the surfboard for the water part (' + RUN.surfFrames + ' of ' + RUN.frames + ' frames), the HUD naming ' + RUN.names.join(' / ') + '; no pool overflowed (dropped ' + RUN.dropped + ' ' + JSON.stringify(RUN.by) + '), geometry and scene objects constant (drift ' + RUN.drift + '), ' + RUN.maxItems + ' world items in the next 300 m at most',
    RUN.state === 'play' && RUN.reachedFork && RUN.coins >= 20 && RUN.dropped === 0 && RUN.drift === 0 && RUN.surfFrames > RUN.frames * 0.7 && ['UTRECHT CENTRAAL', 'HOOG CATHARIJNE', 'OUDEGRACHT'].every(n => RUN.names.includes(n)) && RUN.maxItems < 450, JSON.stringify({ z: RUN.z, score: RUN.score }));
  T('no JS errors (3D)', pg.errs.length === 0, pg.errs.slice(0, 2).join('|')); await pg.context().close();

  const DM = await open(base).then(async p3 => { const o = await p3.evaluate(() => { const g = __wf; g.r.renderer.render = () => {}; g.start(); g.world.extend(80000); const C = g.world.pieces.find(p => p.id === 'utrechtC'); g.state = 'play'; g.p.z = C.z0 + 3200; g.p.speed = 300; g.world.extend(g.p.z); const a = g.world.playerBand(g.p.z + 300, 0); g.bgTo = a.to; g.bgT = a.t; for (let i = 0; i < 4; i++) { g.time += 1 / 60; g.r.draw(g); } const d = g.r.props.utDom; const vis = d.filter(o => o.visible); const bb = vis.length ? new THREE.Box3().setFromObject(vis[0]) : null; return { n: vis.length, h: bb ? +(bb.max.y - bb.min.y).toFixed(0) : 0, x: bb ? +((bb.min.x + bb.max.x) / 2).toFixed(0) : 0 }; }); await p3.context().close(); return o; });
  T('the Dom tower is drawn on the Oudegracht as a fixed landmark (' + DM.n + ' of it in view, ' + DM.h + ' m tall, about ' + DM.x + ' m to the side), wrapped in your scaffolding photo', DM.n === 1 && DM.h >= 100 && DM.h <= 120 && Math.abs(DM.x) > 20, JSON.stringify(DM));

  // ================================================================ 8. the classic 2D game runs through the same track (station, Utrecht, the junction) with a dusk palette, no errors
  const p2 = await open(base + '2d.html');
  const D2 = await p2.evaluate(() => {
    const g = __wf, out = {}; g.start(); g.world.extend(80000); const A = g.world.pieces.find(p => p.id === 'utrechtA'), Cc = g.world.pieces.find(p => p.id === 'utrechtC'), seen = new Set(); let draws = 0, err = null;
    g.world.items = []; g.state = 'play'; g.p.z = A.z0 - 600; g.p.speed = 340; g.world.extend(g.p.z); g.die = () => {};
    try { for (let f = 0; f < 60 * 40 && g.p.z < Cc.z1 + 800; f++) { g.advance(1 / 60); if (f % 4 === 0) { g.draw(); draws++; } seen.add(g.world.playerBand(g.p.z, 0).to); } } catch (e) { err = String(e && e.message); }
    out.seen = [...seen].join(); out.draws = draws; out.err = err; out.pk = g.pk === null; out.surf = g.surf; out.z = Math.round(g.p.z - A.z0); out.kinds = [...new Set(g.world.items.map(i => i.kind))].sort().join();
    return out;
  });
  T('the classic 2D game draws the same track through the station, Utrecht (' + D2.seen + ') and past it (' + D2.draws + ' frames, ' + D2.z + ' units in) with its dusk palette: no error, no perks, no 3D-only items', !D2.err && D2.pk && D2.draws > 200 && D2.seen.includes('utrechtA') && D2.seen.includes('utrecht') && !/shard|magnet|aura|dash|waymark/.test(D2.kinds) && p2.errs.length === 0, JSON.stringify({ ...D2, errs: p2.errs.slice(0, 1) }));
  await p2.context().close();
  console.log('\n' + res.filter(Boolean).length + '/' + res.length + ' passed');
  await b.close(); srv.close(); process.exit(res.every(Boolean) ? 0 : 1);
})().catch(e => { console.log('TEST ERROR', e.message); process.exit(1); });
