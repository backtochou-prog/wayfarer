// WAYFARER regression test: THE UPPER CIRCUIT OF UTRECHT (the junction `gateUtrecht` at the end of the Oudegracht: LEFT the canal goes on, RIGHT the stairs of a bridge climb to the street of the right bank: a road raised
// by 3.45 m, run on foot, past the houses and the shops, with the cheese carts as its hazards). Checks the track and the road's own geometry (centres, the rise on the grid of the scenery slots, no drop for the other road),
// what the renderer draws (each road at its own height, the ground at the water, the stairs, the street, the houses, the parks; the canal's water beside it), the cheese cart (size of the crate's box, awning above it, chalkboard,
// a plain crash, no vortex), no hazard on the stairs, the surfboard only on the water, a bot playing both roads through, and the classic 2D game.
//
// Run:  node tests/qa3d_quay.js     (needs playwright-core and a Chromium: CHROMIUM=/path/to/chrome, NODE_PATH or PW_CORE as for the other tests; TEST_URL=https://... tests a deployment)
const http = require('http'), fs = require('fs'), path = require('path');
let chromium; try { ({ chromium } = require('playwright-core')); } catch (e) { ({ chromium } = require(process.env.PW_CORE || 'playwright-core')); }
const ROOT = path.join(__dirname, '..'), PORT = 8128;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const res = []; const T = (n, ok, i = '') => { res.push(ok); console.log((ok ? 'PASS ' : 'FAIL ') + n + (i !== '' ? '  [' + i + ']' : '')); };

(async () => {
  const srv = http.createServer((q, r) => {
    let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
    fs.readFile(path.join(ROOT, p), (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' }); r.end(d); } });
  }).listen(PORT);
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM || require('./_chromium')(), args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const base = process.env.TEST_URL || 'http://localhost:' + PORT + '/';
  const open = async url => { const pg = await (await b.newContext({ viewport: { width: 480, height: 270 } })).newPage(); pg.errs = []; pg.on('pageerror', e => pg.errs.push(e.message)); pg.on('console', m => m.type() === 'error' && !/404/.test(m.text()) && pg.errs.push(m.text())); await pg.goto(url, { timeout: 90000 }); await pg.waitForFunction(() => window.__wf, null, { timeout: 60000 }); await pg.waitForTimeout(500); return pg; };
  const pg = await open(base);
  await pg.evaluate(() => {
    window.H = {
      // a run placed on a road of the junction: `side` 'left' (the canal) or 'right' (the upper circuit) committed, the runner `dz` units after the end of the zone where the roads part (fe), the atmosphere set as the game has it
      at(side, dz, speed = 300) {
        const g = __wf; g.r.renderer.render = () => {}; g.start(); g.world.extend(80000); const F = g.world.pieces.find(p => p.type === 'fork' && p.fork === TRACK.forks.gateUtrecht); g.world.commit(F, side);
        g.state = 'play'; g.p.z = F.fe + dz; g.p.x = 0; g.p.speed = speed; g.scene = null; g.fadeIn = 0; g.world.extend(g.p.z); const a = g.world.playerBand(g.p.z + 300, 0); g.bgTo = a.to; g.bgT = a.t; g.die = () => {};
        const h = g.world.playerBand(g.p.z + 60, 0); g.surf = /^utrecht/.test(h.to) && h.to !== 'utrechtQuay' && h.t > 0.5; return { g, F };
      },
      draw(n = 3) { const g = __wf; for (let i = 0; i < n; i++) { g.time += 1 / 60; g.r.draw(g); } },
      bot() {                                                                                    // jumps or slides at the hazards in its own lane, timed to its real speed
        const g = __wf, p = g.p, mul = g.pk ? g.pk.speedMul : 1, hz = g.world.items.filter(it => OBST[it.kind] && !it.taken && it.z > p.z - 12 && it.z < p.z + 300); g.keys.left = g.keys.right = false;
        let tg = null; for (const it of hz) { const o = OBST[it.kind]; if (Math.abs(it.x - p.x) > o.hw + P_HW + 0.08 || it.z <= p.z - 2) continue; if (!tg || it.z < tg.z) tg = it; }
        { const vt = g.world.items.filter(i => /^vic[^AM]/.test(i.kind) && i.z > p.z - 14 && i.z - p.z < p.speed * 1.1).sort((a, b) => a.z - b.z)[0]; if (vt) { const cc = g.world.playerBand(p.z, p.x).c; g.keys.left = vt.x > cc; g.keys.right = vt.x < cc; } else if (!g.lane2 && Math.abs(p.x) > 0.2 && Math.abs(p.x) < 0.3 && !(g.world.openFork() && p.z > g.world.openFork().z0 - 900)) { g.keys.left = p.x > 0; g.keys.right = p.x < 0; } if (tg && /^vic[^AM]/.test(tg.kind)) tg = null; }
        if (tg) { const d = tg.z - p.z, v = p.speed * mul, key = c => g.onKey({ code: c, key: c, repeat: false, preventDefault() {} }, true); if (/^(over|vicASlide|vicMSlide)$/.test(tg.kind)) { if (d < v * 0.2 + 10 && p.jy === 0 && p.slide <= 0) key('ArrowDown'); } else if (d < v * 0.26 + 8 && p.jy === 0 && !hz.some(it => it.kind === 'over' && it.z > p.z - 10 && it.z < p.z + 12)) key('Space'); }
      },
    };
  });

  // ================================================================ 1. the track and the two roads
  const K = await pg.evaluate(() => {
    const out = {}, w = new World(TRACK); w.extras = true; w.extend(120000); const ids = w.pieces.map(p => p.id || 'fork'), i = ids.indexOf('utrechtC'), F = w.pieces[i + 1], f = F.fork, T2 = TRACK;
    out.seq = ids.slice(i, i + 3).join('>'); out.isGate = f === T2.forks.gateUtrecht; out.routes = [f.left.route, f.right.route]; out.biomes = [T2.segments[f.left.route].biome, T2.segments[f.right.route].biome]; out.names = [T2.segments[f.left.route].name, T2.segments[f.right.route].name];
    out.signs = [f.left.sign, f.right.sign]; out.signKit = [f.left.sign, f.right.sign].every(n => !!SPR[n] && !!ENV3D.common.props[n]);
    out.len = [f.zone, f.branchLen, f.merge]; out.cLeft = null;
    const open = w.bandsAt(F.fe + 100), l = open.find(b => b.side < 0), r = open.find(b => b.side > 0);
    out.centre = [+((l.lo + l.hi) / 2).toFixed(3), +((r.lo + r.hi) / 2).toFixed(3)]; out.width = [+(l.hi - l.lo).toFixed(3), +(r.hi - r.lo).toFixed(3)]; out.gap = +((r.lo - l.hi) * U3.X).toFixed(2);
    out.flags = [!!l.quay, !!r.quay, r.riseH, r.to, l.to]; out.pieceBefore = w.bandsAt(F.z0 - 5).length === 1 && w.bandsAt(F.z0 - 5)[0].to === 'utrecht';
    const G = w.riseGeom(F), R = f.rise; out.grid = [G.a0 % R.grid, G.a1 % R.grid, R.up % R.grid, R.down % R.grid, R.grid, SEG_LEN / U3.Z]; out.flights = [G.a0 >= F.fe, G.a0 + R.up < G.a1 - R.down, G.a1 <= F.be];
    out.h = R.h * U3.Z; out.slope = R.h / R.up; out.noRise = [w.riseAt(F, G.a0 - 1), w.riseAt(F, G.a0), w.riseAt(F, G.a1), w.riseAt(F, F.be + 5)]; out.top = w.riseAt(F, (G.a0 + R.up + G.a1 - R.down) / 2);
    let lin = true; for (let z = G.a0; z <= G.a0 + R.up; z += 24) if (Math.abs(w.riseAt(F, z) - (z - G.a0) * out.slope) > 1e-6) lin = false; out.linear = lin;
    out.stairs = [w.stairsAt(F, G.a0 + 5), w.stairsAt(F, G.a0 + R.up + 60), w.stairsAt(F, G.a1 - 5), w.stairsAt(F, F.fe + 10)];
    // lift (the road's height over the level the world is drawn at) and dropAt (the level itself follows the runner who took the stairs)
    const zm = G.a0 + R.up / 2, rm = w.riseAt(F, zm); const L = {}, b0 = w.dropAt(F.z0 - 100); for (const ch of ['left', 'right']) { w.commit(F, ch); L[ch] = { L: +w.lift(zm, -1).toFixed(2), R: +w.lift(zm, 1).toFixed(2), drop: +(w.dropAt(zm) - b0).toFixed(2) }; } /* (dropAt only means something as a difference: the fall of the zones before it is the same) */ out.mid = +rm.toFixed(2); out.lift = L;
    let maxStep = 0, prev = null; w.commit(F, 'right'); for (let z = F.z0; z < F.z1 + 400; z += 10) { const d = w.dropAt(z) - b0; if (prev !== null) maxStep = Math.max(maxStep, Math.abs(d - prev)); prev = d; } out.maxStep = +maxStep.toFixed(3);
    out.after = [w.dropAt(F.z1 + 200) - b0, w.lift(F.z1 + 200, 1), w.lift(F.z0 - 50, -1)]; w.commit(F, 'left'); out.left0 = Math.max(...[F.fe, G.a0 + 500, F.be - 200].map(z => Math.abs(w.dropAt(z) - b0)));
    // hazards: none on the flights of the right road, the first one after the top of the stairs; coins everywhere
    const top = G.a0 + R.up, bot = G.a1 - R.down, rt = w.items.filter(it => it.tag === F.uid + 'right'), hzR = rt.filter(it => OBST[it.kind]);
    out.onStairs = hzR.filter(it => (it.z > G.a0 - 60 && it.z < top + 60) || (it.z > bot - 60 && it.z < G.a1 + 60)).length; out.hzR = hzR.length; out.firstHz = hzR.length ? Math.min(...hzR.map(it => it.z)) - top : -1; out.crates = hzR.filter(it => it.kind === 'crate').length;
    out.coinsStairs = rt.filter(it => it.kind === 'coin' && it.z > G.a0 && it.z < top).length; out.hzL = w.items.filter(it => it.tag === F.uid + 'left' && OBST[it.kind]).length; out.dom = w.items.filter(it => it.kind === 'prop' && it.spr === 'utDom').length;
    out.atmo = BIOMES.utrechtQuay && BIOMES.utrechtQuay.atmo; out.env = !!ENV3D.utrechtQuay && ENV3D.utrechtQuay.road.water !== true && ENV3D.utrechtQuay.props === ENV3D.utrecht.props && typeof ENV3D.utrechtQuay.quay === 'function';
    return out;
  });
  T('the junction is the end of the Oudegracht (' + K.seq + '): LEFT the canal on (' + K.routes[0] + ', ' + K.names[0] + ', biome ' + K.biomes[0] + '), RIGHT the upper circuit (' + K.routes[1] + ', ' + K.names[1] + ', biome ' + K.biomes[1] + '), with the signs ' + K.signs.join(' / ') + ' in both builds; one road before it',
    K.seq === 'utrechtC>fork>vicA' && K.isGate && K.routes.join() === 'utrechtD,utrechtQuay' && K.biomes.join() === 'utrecht,utrechtQuay' && K.names.join() === 'OUDEGRACHT,STADSKADE' && K.signs.join() === 'signCanal,signQuay' && K.signKit && K.pieceBefore && K.atmo === 'utrecht' && K.env, JSON.stringify(K));
  T('the two roads run beside each other the way the canal and its street do: centres ' + K.centre.join(' / ') + ' lanes (1.225 each side), 1.8 lanes wide for the canal and 1.5 for the narrower street, ' + K.gap + ' m apart (the wharf and the quay wall between), the right one is the raised road (' + K.flags.join(', ') + ')',
    Math.abs(K.centre[0] + 1.225) < 0.01 && Math.abs(K.centre[1] - 1.225) < 0.01 && Math.abs(K.width[0] - 1.8) < 0.01 && Math.abs(K.width[1] - 1.5) < 0.01 && Math.abs(K.gap - 2.84) < 0.05 && K.flags[0] === false && K.flags[1] === true && K.flags[2] === 34.5 && K.flags[3] === 'utrechtQuay' && K.flags[4] === 'utrecht', JSON.stringify(K.centre));
  T('the road rises ' + K.h.toFixed(2) + ' m: a steady slope (' + K.slope.toFixed(4) + ') up the stairs, level on the street, a steady slope down; the flights start and end on the grid of the scenery slots (' + K.grid.join(', ') + '), after the roads have parted and before they merge; stairs +1 up / -1 down / 0 (' + K.stairs.join(', ') + ')',
    Math.abs(K.h - 3.45) < 1e-9 && K.grid.slice(0, 4).every(v => v === 0) && K.grid[4] === K.grid[5] && K.flights.every(Boolean) && K.linear && K.noRise[0] === 0 && K.noRise[1] === 0 && K.noRise[2] === 0 && K.noRise[3] === 0 && Math.abs(K.top - 34.5) < 1e-9 && K.stairs.join() === '1,0,-1,0', JSON.stringify({ noRise: K.noRise, top: K.top }));
  T('who climbs: a runner who took the stairs raises the whole world (dropAt ' + K.lift.right.drop + ' units at the middle of the flight, the canal road ' + K.lift.right.L + ' under the level, the street ' + K.lift.right.R + '), one who stayed on the canal does not (drop ' + K.lift.left.drop + ', the street ' + K.lift.left.R + ' over it); the climb has no step (' + K.maxStep + ' units per 10) and is gone after the merge (' + K.after.join(', ') + ')',
    Math.abs(K.lift.right.drop + K.mid) < 0.01 && Math.abs(K.lift.right.L + K.mid) < 0.01 && K.lift.right.R === 0 && K.lift.left.drop === 0 && Math.abs(K.lift.left.R - K.mid) < 0.01 && K.lift.left.L === 0 && K.maxStep < 4 && K.after.every(v => v === 0) && K.left0 === 0, JSON.stringify(K.lift));
  T('the hazards of the upper circuit: none on the stairs (' + K.onStairs + ' of ' + K.hzR + '), the first ' + (K.firstHz / 10).toFixed(0) + ' m after their top, ' + K.crates + ' crates (the cheese carts), coins all along (' + K.coinsStairs + ' on the way up); the canal keeps its own (' + K.hzL + ') and the Dom (' + K.dom + ')',
    K.onStairs === 0 && K.hzR >= 10 && K.firstHz > 0 && K.crates >= 4 && K.coinsStairs >= 3 && K.hzL >= 15 && K.dom >= 1, JSON.stringify({ first: K.firstHz }));

  // ================================================================ 2. what is drawn: each road at its own height, the ground at the water, the stairs, the street, the water beside it
  const D = await pg.evaluate(() => {
    const out = {}, yRoad = (r, rib, i) => r.road.rib[rib].pos[(i * r.road.VPS + 10) * 3 + 1], yEdge = (r, rib, i, s) => r.road.rib[rib].pos[(i * r.road.VPS + s * 2) * 3 + 1];
    const snap = (side, dz) => { const { g, F } = H.at(side, dz); H.draw(4); const r = g.r, n = r.road.N, o = { dz, ground: +r.groundPivot.position.y.toFixed(3), runnerY: +r.runner.group.position.y.toFixed(3), A: [], B: [], two: r.road.edge.two[10], watVis: r.road.wat.mesh.visible, props: {} };
      for (const i of [4, 8, 12, 16, 20]) { o.A.push(+yRoad(r, 0, i).toFixed(3)); o.B.push(+yRoad(r, 1, i).toFixed(3)); }
      for (const k of ['utQStairsUp', 'utQStairsDown', 'utQStreetA', 'utQStreetB', 'utQStreetC', 'utQPark', 'utQWall', 'utBridge', 'utPlatane', 'utPlataneB']) o.props[k] = (r.props[k] || []).filter(m => m.visible).length;
      o.rows = Object.keys(r.props).filter(k => /^utRow/.test(k)).reduce((a, k) => a + r.props[k].filter(m => m.visible).length, 0); o.dropped = r.dropped + r.items.dropped; return o; };
    out.quayFlat = snap('right', 2000); out.quayUp = snap('right', 550); out.canalFlat = snap('left', 2000); out.canalUp = snap('left', 550); out.zone = snap('right', 200); out.down = snap('right', 3500);
    // the stairs: the road of the right side climbs 0.1078 m per 3 m section, the strips at its edges are walls down to the canal
    const { g } = H.at('right', 550); H.draw(4); const r = g.r, E = r.road, dy = []; for (let i = 10; i < 22; i++) dy.push(yRoad(r, 1, i) - yRoad(r, 1, i - 1)); out.slopeStep = [+Math.min(...dy).toFixed(4), +Math.max(...dy).toFixed(4)];
    let wall = false; for (let i = 10; i < 22; i++) { const top = yEdge(r, 1, i, 5), foot = yEdge(r, 1, i, 0), yA = yRoad(r, 0, i); if (top - foot > 0.5 && Math.abs(foot - yA) < 0.01) wall = true; else { wall = false; break; } } out.wall = wall;
    const f = g.world.pieces.find(p => p.type === 'fork' && p.fork === TRACK.forks.gateUtrecht), up = g.world.riseGeom(f).a0 + f.fork.rise.up; const g2 = H.at('right', up - f.fe + 300).g; H.draw(3); out.flatWall = Math.abs(yEdge(g2.r, 1, 14, 5) - yEdge(g2.r, 1, 14, 0)) < 0.001;       // (no wall on the street: the quay props are its sides)
    return out;
  });
  const qf = D.quayFlat, qu = D.quayUp, cf = D.canalFlat, cu = D.canalUp;
  T('on the street the ground is the level of the water, 3.45 m under the runner (' + qf.ground + '), the runner stays at the height of the camera\'s world (' + qf.runnerY + '), its own road is level (' + qf.B.join(', ') + ') and the canal road lies 3.45 m below (' + qf.A.join(', ') + '); on the canal the street is 3.45 m ABOVE it (' + cf.B.join(', ') + ' against ' + cf.A.join(', ') + ') and the ground does not move (' + cf.ground + ')',
    Math.abs(qf.ground + 3.48) < 0.01 && qf.runnerY === 0 && qf.B.every(v => Math.abs(v) < 0.01) && qf.A.every(v => Math.abs(v + 3.45) < 0.01) && cf.B.every(v => Math.abs(v - 3.45) < 0.01) && cf.A.every(v => Math.abs(v) < 0.01) && Math.abs(cf.ground + 0.03) < 0.001 && qf.two === 1 && cf.two === 1, JSON.stringify({ qf: qf.B, cf: cf.B }));
  T('the stairs climb a steady 0.108 m per 3 m section (' + D.slopeStep.join(' to ') + ') with a wall at each edge down to the water (' + D.wall + ') and none on the street (' + D.flatWall + '); the flight is dressed with its stairs, the street with its paving, wall, houses and trees (the stairs ' + qu.props.utQStairsUp + ', the street ' + (qf.props.utQStreetA + qf.props.utQStreetB + qf.props.utQStreetC + qf.props.utQPark) + ', walls ' + qu.props.utQWall + ', houses ' + qf.rows + ', plane trees ' + (qf.props.utPlatane + qf.props.utPlataneB) + '), with the stairs down at the end (' + D.down.props.utQStairsDown + ') and no bridge across the junction (' + qu.props.utBridge + ')',
    D.slopeStep[0] > 0.1 && D.slopeStep[1] < 0.116 && D.wall && D.flatWall && qu.props.utQStairsUp >= 5 && qf.props.utQStreetA + qf.props.utQStreetB + qf.props.utQStreetC + qf.props.utQPark >= 5 && qu.props.utQWall >= 5 && qf.rows >= 4 && qf.props.utPlatane + qf.props.utPlataneB >= 1 && D.down.props.utQStairsDown >= 3 && qu.props.utBridge === 0 && qf.props.utBridge === 0 && cf.props.utBridge === 0, JSON.stringify({ up: qu.props, flat: qf.props }));
  T('the canal goes on beside the street: its water is drawn on both runs, on the left road of the junction (' + qf.watVis + ' from the street, ' + cf.watVis + ' on it), and nothing overflowed (dropped ' + (qf.dropped + qu.dropped + cf.dropped + cu.dropped + D.zone.dropped + D.down.dropped) + ')',
    qf.watVis && cf.watVis && qf.dropped + qu.dropped + cf.dropped + cu.dropped + D.zone.dropped + D.down.dropped === 0, '');

  // ================================================================ 3. the cheese cart (the crate on the upper circuit): the crate's box, the awning above it, the chalkboard; a plain crash; the water and the vortex elsewhere
  const C = await pg.evaluate(() => {
    const out = {}, { g, F } = H.at('right', 1500), r = g.r, it = g.world.items.filter(i => i.kind === 'crate' && i.tag === F.uid + 'right' && i.z > g.p.z).sort((a, b) => a.z - b.z)[0]; out.have = !!it; if (!it) return out;
    g.p.z = it.z - 150; g.world.extend(g.p.z); H.draw(3); out.used = { S: r.items.used.crateS, plain: r.items.used.crate, W: r.items.used.crateW };
    const m = r.items.pool.crateS.find(q => q.visible); m.updateMatrixWorld(true); const bb = new THREE.Box3().setFromObject(m); out.size = [+(bb.max.x - bb.min.x).toFixed(2), +bb.max.y.toFixed(2), +(bb.max.z - bb.min.z).toFixed(2)]; out.box = [2 * OBST.crate.hw * U3.X, OBST.crate.y1 * U3.Y];
    out.meshes = m.children.length; const ch = m.children.find(c => c.material && c.material.map && c.material.map.image && c.material.map.image.width === 256); out.chalk = !!ch && ch.material.map.image.height === 128;
    // the counter's top (the box) and the awning above it: the geometry's highest points under / over 1.2 m
    let lowTop = 0, aw = 0; for (const c of m.children) { if (!c.geometry || !c.geometry.attributes.position) continue; const P = c.geometry.attributes.position.array; for (let k = 1; k < P.length; k += 3) { if (P[k] < 1.08) lowTop = Math.max(lowTop, P[k]); else aw = Math.max(aw, P[k]); } }
    out.lowTop = +lowTop.toFixed(2); out.awning = +aw.toFixed(2);
    // on the canal and on the plain road the other crates are used
    const w2 = H.at('left', 600); const it2 = w2.g.world.items.filter(i => i.kind === 'crate' && i.tag === w2.F.uid + 'left' && i.z > w2.g.p.z).sort((a, b) => a.z - b.z)[0]; w2.g.p.z = it2.z - 150; w2.g.world.extend(w2.g.p.z); H.draw(3); out.canal = { S: w2.g.r.items.used.crateS, W: w2.g.r.items.used.crateW };
    // a collision with a cart is a plain crash: no vortex (the sound, the shake, the delay), one with a whirlpool on the canal is absorbed
    const q = H.at('right', 1500); const cart = q.g.world.items.filter(i => i.kind === 'crate' && i.tag === q.F.uid + 'right' && i.z > q.g.p.z).sort((a, b) => a.z - b.z)[0]; q.g.die = Game.prototype.die; const em = []; q.g.emit = (...a) => em.push(a); q.g.p.z = cart.z; q.g.p.x = cart.x; q.g.die(cart);
    out.cartDie = { street: q.g.killer.street, delay: q.g.overDelay, shake: q.g.shake, crash: em.filter(a => a[0] === 'crash').map(a => String(a[1])).join() };
    const v = H.at('left', 600); const wp = v.g.world.items.filter(i => i.kind === 'crate' && i.tag === v.F.uid + 'left' && i.z > v.g.p.z).sort((a, b) => a.z - b.z)[0]; v.g.die = Game.prototype.die; const em2 = []; v.g.emit = (...a) => em2.push(a); v.g.p.z = wp.z; v.g.p.x = wp.x; v.g.die(wp);
    out.vortexDie = { street: v.g.killer.street, delay: v.g.overDelay, crash: em2.filter(a => a[0] === 'crash').map(a => String(a[1])).join() };
    return out;
  });
  T('the cheese cart (the user\'s picture): the pool crateS is drawn on the street (' + JSON.stringify(C.used) + ': no plain crate there) and the canal keeps its whirlpools (' + JSON.stringify(C.canal) + ', the carts of the quay are seen from it); ' + (C.size || []).join(' x ') + ' m (its counter ' + C.lowTop + ' m high against the crate\'s box ' + (C.box || [0, 0])[1].toFixed(2) + ' m, ' + (C.box || [0, 0])[0].toFixed(2) + ' m wide), the awning up to ' + C.awning + ' m, the chalkboard on its front (' + C.chalk + ')',
    C.have && C.used.S >= 1 && C.used.plain === 0 && C.canal.W >= 1 && C.size[0] >= C.box[0] && C.size[0] < C.box[0] + 0.5 && Math.abs(C.lowTop - C.box[1]) < 0.04 && C.awning >= 1.6 && C.awning < 2.4 && C.chalk, JSON.stringify(C));
  T('a cart is a plain crash (street ' + C.cartDie.street + ', delay ' + C.cartDie.delay + ' s, shake ' + C.cartDie.shake + ', sound arg "' + C.cartDie.crash + '"), a whirlpool of the canal still absorbs the runner (street ' + C.vortexDie.street + ', delay ' + C.vortexDie.delay + ' s, sound "' + C.vortexDie.crash + '")',
    C.cartDie.street === true && C.cartDie.delay === 0.5 && C.cartDie.shake === 0.35 && C.cartDie.crash === 'undefined' && C.vortexDie.street === false && C.vortexDie.delay === 0.85 && C.vortexDie.crash === 'vortex', JSON.stringify([C.cartDie, C.vortexDie]));

  const O = await pg.evaluate(() => {
    const out = { used: {}, dims: {} }, { g, F } = H.at('right', 1500), r = g.r;
    for (const k of ['barrierS', 'barrierB', 'overS']) { const m = r.items.pool[k][0]; m.visible = true; m.position.set(0, 0, 0); m.updateMatrixWorld(true); const bb = new THREE.Box3().setFromObject(m); out.dims[k] = { w: +(bb.max.x - bb.min.x).toFixed(2), h: +bb.max.y.toFixed(2), y0: +bb.min.y.toFixed(2) }; m.visible = false; }
    for (const z of [1500, 2200, 2800]) { g.p.z = F.fe + z; g.world.extend(g.p.z); H.draw(3); for (const k of ['barrierS', 'barrierB', 'overS', 'barrier', 'over']) out.used[k] = (out.used[k] || 0) + r.items.used[k]; }
    out.coll = { b: [2 * OBST.barrier.hw * U3.X, OBST.barrier.y1 * U3.Y], o: [2 * OBST.over.hw * U3.X, OBST.over.y0 * U3.Y, OBST.over.y1 * U3.Y] };
    const hz = g.world.items.filter(i => i.tag === F.uid + 'right' && i.kind === 'barrier').map(i => Math.floor(i.z / 100) % 2); out.both = hz.includes(0) && hz.includes(1);
    return out;
  });
  T('the street\'s other hazards: café terraces (tables and chairs, ' + O.dims.barrierS.w + ' x ' + O.dims.barrierS.h + ' m) and rows of parked bicycles (' + O.dims.barrierB.w + ' x ' + O.dims.barrierB.h + ' m) as the low barrier (box ' + O.coll.b[0].toFixed(2) + ' x ' + O.coll.b[1].toFixed(2) + ', both looks on the road: ' + O.both + '), a bar\'s awning as the gate (' + O.dims.overS.w + ' m wide, from ' + O.coll.o[1].toFixed(2) + ' to ' + O.dims.overS.h + ' m); drawn on the street only (' + JSON.stringify(O.used) + ')',
    Math.abs(O.dims.barrierS.w - O.coll.b[0]) < 0.3 && O.dims.barrierS.h <= O.coll.b[1] + 0.05 && O.dims.barrierS.h >= O.coll.b[1] - 0.1 && Math.abs(O.dims.barrierB.w - O.coll.b[0]) < 0.4 && O.dims.barrierB.h <= O.coll.b[1] + 0.05 && O.dims.barrierB.h >= O.coll.b[1] - 0.1 && O.dims.overS.w >= O.coll.o[0] && O.dims.overS.w < O.coll.o[0] + 0.8 && O.dims.overS.h <= O.coll.o[2] + 0.05 && O.dims.overS.h >= O.coll.o[2] - 0.2 && O.both && O.used.barrierS + O.used.barrierB >= 1 && O.used.overS >= 1 && O.used.barrier === 0 && O.used.over === 0, JSON.stringify(O.dims));

  const TU = await pg.evaluate(() => {
    const w = new World(TRACK); w.extend(120000); const F = w.pieces.find(p => p.type === 'fork' && p.fork.tube), tb = F.fork.tube, mid = F.fe + tb.len / 2, q = F.fe + tb.ramp / 2, out = {};
    w.commit(F, 'left'); out.coast = [w.lift(mid, -1), w.lift(mid, 1) * U3.Z, w.lift(q, 1) * U3.Z, w.lift(F.fe + tb.len + 100, 1)]; out.depth = tb.depth * U3.Z;
    w.commit(F, 'right'); out.under = [w.lift(mid, 1), w.lift(mid, -1) * U3.Z]; return out;
  });
  T('passing beside the tunnel under the sea (on the coast road) its road sinks little by little, ' + TU.coast[2].toFixed(1) + ' m down half way down the ramp and the full ' + TU.depth + ' m in the middle (' + TU.coast[1].toFixed(1) + '), level again after it (' + TU.coast[3] + '); the coast stays level (' + TU.coast[0] + '); in the tunnel the whole world dives with the runner (the coast road is not lifted: ' + TU.under[1].toFixed(1) + ')',
    TU.coast[0] === 0 && Math.abs(TU.coast[1] + TU.depth) < 1e-6 && TU.coast[2] < -0.5 && TU.coast[2] > -TU.depth + 0.5 && TU.coast[3] === 0 && TU.under[0] === 0 && TU.under[1] === 0, JSON.stringify(TU));

  // ================================================================ 4. the surfboard is for the water only
  const S = await pg.evaluate(() => {
    const out = {}; const probe = (side, dz) => { const { g } = H.at(side, dz); for (let i = 0; i < 30; i++) g.advance(1 / 60); H.draw(90); const R = g.r.runner; return { surf: g.surf, sf: R.surfB.visible, sc: R.scooter.visible, bd: R.board.visible, y: +R.group.position.y.toFixed(3) }; };
    out.quay = probe('right', 2000); out.stairs = probe('right', 400); out.canal = probe('left', 2000); return out;
  });
  T('on the street and on its stairs the runner is on foot (board ' + S.quay.sf + ' / ' + S.stairs.sf + '), on the canal beside it on the surfboard (' + S.canal.sf + '), always at height ' + S.quay.y,
    !S.quay.surf && !S.quay.sf && !S.stairs.surf && !S.stairs.sf && S.canal.surf && S.canal.sf && S.quay.y === 0 && S.stairs.y === 0 && S.canal.y === 0, JSON.stringify(S));

  // ================================================================ 5. a bot plays each road from before the junction to the neon quarter
  const RUN = await pg.evaluate(() => {
    const out = {}; for (const side of ['right', 'left']) {
      const { g, F } = H.at('left', -1500, 340); g.world.items = g.world.items.filter(i => i.kind === 'prop' || i.z > F.z0 - 1400); g.world.reset(); g.start(); g.world.extend(80000); const F2 = g.world.pieces.find(p => p.type === 'fork' && p.fork === TRACK.forks.gateUtrecht);
      g.die = Game.prototype.die; g.state = 'play'; g.p.z = F2.z0 - 1500; g.p.x = 0; g.p.speed = 340; g.scene = null; g.fadeIn = 0; g.world.extend(g.p.z); g.r.renderer.render = () => {}; g.pk.reset(); g.pk.save = Perks.defaults(); const r = g.r;
      const o = { frames: 0, surfFrames: 0, maxY: 0, camJump: 0, offRoad: 0, groundStep: 0, names: new Set(), coins0: g.coins }; g.time += 1 / 20; r.draw(g); let gy = r.groundPivot.position.y, f = 0;
      while (g.p.z < F2.z1 + 600 && g.state === 'play' && f < 60 * 100) {
        if (f % 4 === 0 && F2.choice === null && g.p.z > F2.z0 - 500 && g.p.z < F2.z0 - 400) g.keys[side] = true; H.bot(); if (F2.choice === null && g.p.z > F2.z0 - 500 && g.p.z < F2.z0 - 400) g.keys[side] = true;
        g.advance(1 / 60); f++; o.frames++; if (g.surf) o.surfFrames++; o.names.add(g.world.track.segments[g.world.playerBand(g.p.z, g.p.x).route].name);
        const bs = g.world.bandsAt(g.p.z), ch = bs.find(q => q.chosen) || (bs.length === 1 ? bs[0] : null); if (ch && (g.p.x < ch.lo - 0.02 || g.p.x > ch.hi + 0.02)) o.offRoad++;
        if (f % 3 === 0) { g.time += 1 / 20; r.draw(g); if (g.p.z < F2.be) o.maxY = Math.max(o.maxY, Math.abs(r.runner.group.position.y - g.p.jy * U3.Y)); /* (after the junction the door of the neon quarter takes the runner up) */ const gn = r.groundPivot.position.y; o.groundStep = Math.max(o.groundStep, Math.abs(gn - gy)); gy = gn; }
      }
      o.state = g.state; o.reached = g.p.z >= F2.z1 + 600 - 1; o.choice = F2.choice; o.coins = g.coins - o.coins0; o.dropped = r.dropped + r.items.dropped; o.names = [...o.names]; o.z = Math.round(g.p.z - F2.z0); out[side] = o;
    } return out;
  });
  for (const side of ['right', 'left']) { const o = RUN[side]; T('a bot plays the ' + (side === 'right' ? 'upper circuit (stairs, street, cheese carts, stairs down)' : 'canal road of the junction') + ' from before the junction to the neon quarter (' + o.frames + ' frames, ' + o.coins + ' coins, alive ' + o.state + ', took ' + o.choice + ', HUD ' + o.names.join(' / ') + '), on the board ' + o.surfFrames + ' frames, never off its road (' + o.offRoad + '), the runner never leaves its height (' + o.maxY.toFixed(3) + '), the ground moves smoothly (' + o.groundStep.toFixed(3) + ' m per frame at most), nothing overflowed (' + o.dropped + ')',
    o.state === 'play' && o.reached && o.choice === side && o.coins >= 10 && o.offRoad === 0 && o.maxY < 0.01 && o.groundStep < 0.2 && o.dropped === 0 && (side === 'right' ? o.names.includes('STADSKADE') && o.surfFrames < o.frames * 0.5 : o.names.includes('OUDEGRACHT') && o.surfFrames > o.frames * 0.5), JSON.stringify({ z: o.z })); }
  T('no JS errors (3D)', pg.errs.length === 0, pg.errs.slice(0, 2).join('|')); await pg.context().close();

  // ================================================================ 6. the classic 2D game draws both roads of the junction
  const p2 = await open(base + '2d.html');
  const D2 = await p2.evaluate(() => {
    const out = {}, g = __wf; g.start(); g.world.extend(80000); const F = g.world.pieces.find(p => p.type === 'fork' && p.fork === TRACK.forks.gateUtrecht), seen = new Set(); let draws = 0, err = null; g.world.items = []; g.state = 'play'; g.p.z = F.z0 - 500; g.p.speed = 340; g.world.extend(g.p.z); g.die = () => {};
    try { for (let f = 0; f < 60 * 40 && g.p.z < F.z1 + 400; f++) { if (F.choice === null && g.p.z > F.z0 - 450) g.keys.right = true; else g.keys.right = false; g.advance(1 / 60); if (f % 4 === 0) { g.draw(); draws++; } seen.add(g.world.playerBand(g.p.z, g.p.x).to); } } catch (e) { err = String(e && e.message); }
    out.seen = [...seen].join(); out.draws = draws; out.err = err; out.choice = F.choice; out.signs = !!SPR.signCanal && !!SPR.signQuay; return out;
  });
  T('the classic 2D game draws the junction and takes the right road without error (' + D2.draws + ' frames, roads seen ' + D2.seen + ', took ' + D2.choice + ', signs ' + D2.signs + ')', !D2.err && D2.draws > 100 && D2.seen.includes('utrechtQuay') && D2.choice === 'right' && D2.signs && p2.errs.length === 0, JSON.stringify({ ...D2, errs: p2.errs.slice(0, 1) }));
  await p2.context().close();
  console.log('\n' + res.filter(Boolean).length + '/' + res.length + ' passed');
  await b.close(); srv.close(); process.exit(res.every(Boolean) ? 0 : 1);
})().catch(e => { console.log('TEST ERROR', e.message); process.exit(1); });
