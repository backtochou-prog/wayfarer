// WAYFARER regression test: the passages between zones as a journey through a STARGATE (src3d/portal3d.js, portal_art.js, portal_assets.js made by tools/make_portal_assets.py from the user's picture;
// the pink wash and the flash in src/render.js drawPortalFx, the two voices in src/audio.js). Checks which passages get doors (every change of zone, none inside Saint-Gilles, none out of the Gare du
// Midi where the train takes over), the picture (kept as it is, additive, one plane per door), the placement of the doors on the road (also on both branches of a junction), the fade with distance,
// the light of the journey and its voices (once per passage), the pixels of the overlay, reduced motion, the pools, and the classic 2D game (no doors).
//
// Run:  node tests/qa3d_portal.js     (needs playwright-core and a Chromium: CHROMIUM=/path/to/chrome, NODE_PATH or PW_CORE as for the other tests; TEST_URL=https://... tests a deployment)
const http = require('http'), fs = require('fs'), path = require('path');
let chromium; try { ({ chromium } = require('playwright-core')); } catch (e) { ({ chromium } = require(process.env.PW_CORE || 'playwright-core')); }
const ROOT = path.join(__dirname, '..'), PORT = 8125;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const res = []; const T = (n, ok, i = '') => { res.push(ok); console.log((ok ? 'PASS ' : 'FAIL ') + n + (i !== '' ? '  [' + i + ']' : '')); };

(async () => {
  const srv = http.createServer((q, r) => {
    let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
    fs.readFile(path.join(ROOT, p), (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' }); r.end(d); } });
  }).listen(PORT);
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/root/.cache/ms-playwright/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const base = process.env.TEST_URL || 'http://localhost:' + PORT + '/';
  const open = async (url, opts = {}) => { const pg = await (await b.newContext(Object.assign({ viewport: { width: 480, height: 270 } }, opts))).newPage(); pg.errs = []; pg.on('pageerror', e => pg.errs.push(e.message)); pg.on('console', m => m.type() === 'error' && !/404/.test(m.text()) && pg.errs.push(m.text())); await pg.goto(url, { timeout: 90000 }); await pg.waitForFunction(() => window.__wf, null, { timeout: 60000 }); await pg.waitForTimeout(1500); return pg; };
  const setup = () => {
    window.H = {
      at(z) { const g = __wf; g.r.renderer.render = () => {}; g.start(); g.world.extend(170000); g.portal.scan(g.world); g.state = 'play'; g.p.z = z; g.p.x = 0; g.p.speed = 300; g.scene = null; g.fadeIn = 0; g.world.extend(z); g.world.items = g.world.items.filter(i => i.kind === 'prop');
        const a = g.world.playerBand(z + 300, 0); g.bgTo = a.to; g.bgT = a.t; g.die = () => {}; return g; },
      draw(n = 3) { const g = __wf; for (let i = 0; i < n; i++) { g.time += 1 / 60; g.r.draw(g); } },
      to(z) { const g = __wf, prev = g.p.z; g.p.z = z; g.world.extend(z); g.portal.update(g, prev); H.draw(2); return g; },
    };
  };
  const pg = await open(base); await pg.evaluate(setup);

  // ================================================================ 1. which passages have doors
  const A = await pg.evaluate(() => {
    const out = { seeds: {} };
    for (const s of [0, 1, 7, 99, 12345]) {
      const w = new World(TRACK); w.seed = s; w.reset(); w.extend(260000); const P = new Portal({}); P.scan(w); const pieces = w.pieces; let gare = 0, inside = 0, missing = 0, fam = 0;
      for (let i = 0; i + 1 < pieces.length; i++) {
        const a = pieces[i], c = pieces[i + 1]; if (a.type !== 'seg' || c.type !== 'seg') continue;
        const has = P.list.some(q => Math.abs(q.zIn - (c.z0 - 150)) < 1), fa = Portal.fam(TRACK.segments[a.id].biome), fc = Portal.fam(TRACK.segments[c.id].biome);
        if (a.id === 'gareMidi' && has) gare++; if (fa === fc && has) inside++; if (fa !== fc && !a.seg.scene && !has) missing++; if (a.id === 'gareMidi') fam++;
      }
      out.seeds[s] = { n: P.list.length, kinds: 'seg', gare, inside, missing, gares: fam, ordered: P.list.every((q, i) => !i || P.list[i - 1].zIn <= q.zIn), forks: pieces.filter(p => p.type === 'fork' && !p.fork.tube).length, isl: pieces.filter(p => p.type === 'fork' && p.fork.tube).length, islOk: pieces.filter(p => p.type === 'fork' && p.fork.tube).every(p => ['left', 'right'].every(sd => Portal.fam(TRACK.segments[p.fork[sd].route].biome) === 'coast')), forkOk: pieces.filter(p => p.type === 'fork' && !p.fork.tube).every(p => ['left', 'right'].every(sd => Portal.fam(TRACK.segments[p.fork[sd].route].biome) === 'saintgilles')), ok: P.list.every(q => q.zOut - q.zIn >= 700 && q.from !== q.to), apart: P.list.every((q, i) => !i || q.zIn - Portal.PULL >= P.list[i - 1].zOut + Portal.SETTLE), pairs: [...new Set(P.list.map(q => q.from + '>' + q.to))].sort().join(' ') };
    }
    const w = new World(TRACK); w.seed = 0; w.reset(); w.extend(60000); const P = new Portal({}); P.scan(w); out.lap1 = P.list.filter(q => q.zIn < 43000).map(q => q.from + '>' + q.to); out.lap = w.pieces.slice(0, 13).map(p => p.type === 'fork' ? 'fork' : p.id).join('>');
    return out;
  });
  const S = Object.values(A.seeds);
  T('every change of zone has doors, none inside Saint-Gilles (city, tram, gare are one zone) and none out of the Gare du Midi, where the train takes over, every exit door at least 70 m after its entry door and no two journeys overlapping (' + S.map(s => s.n + ' passages').join(', ') + ' for seeds 0, 1, 7, 99, 12345; ' + S[0].gares + ' gare pieces without a door)',
    S.every(s => s.n >= 15 && s.kinds === 'seg' && s.gare === 0 && s.inside === 0 && s.missing === 0 && s.gares >= 2 && s.ordered && s.ok && s.apart), JSON.stringify(A.seeds[0]));
  T('the circuit goes through the zones in order, Neon > Beach > Saint-Gilles > Utrecht > Neon again (' + A.lap + '), with ONE passage between a zone and the next (' + A.lap1.join(', ') + '; Saint-Gilles to Utrecht is the train), and the detours of the junction (forest, market, ruins: ' + S.map(s => s.forks).join('/') + ' junctions over five seeds) are part of Saint-Gilles, and both roads of the island junction (the coast on, the tunnel to the island: ' + S.map(s => s.isl).join('/') + ' junctions) are part of the beach: no door on any of them',
    A.lap === 'neonStart>coastSunset>fork>cityRun>fork>plaza>cityRunB>tramRun>gareMidi>utrechtA>utrechtB>utrechtC>neonRun' && A.lap1.join() === 'neon>coast,coast>saintgilles,utrecht>neon' && A.seeds[0].pairs === 'coast>saintgilles neon>coast utrecht>neon' && S.every(s => s.forks >= 4 && s.forkOk && s.isl >= 3 && s.islOk), A.seeds[0].pairs);

  // ================================================================ 2. the picture: the user's own, additive, one plane per door
  const PA = await pg.evaluate(async () => {
    const out = {}, tex = PortalArt.texture(); for (let i = 0; i < 80 && !PortalArt._ready; i++) await new Promise(q => setTimeout(q, 100)); const img = tex.image;
    out.loaded = PortalArt._ready && img.naturalWidth === PORTAL_ASSETS.w && img.naturalHeight === PORTAL_ASSETS.h; out.dims = [PORTAL_ASSETS.w, PORTAL_ASSETS.h, +PORTAL_ASSETS.ar.toFixed(4)]; out.sameRatio = Math.abs(PORTAL_ASSETS.w / PORTAL_ASSETS.h - 4200 / 3420) < 0.002 && Math.abs(PORTAL_ASSETS.ar - 4200 / 3420) < 0.0002;
    const cv = document.createElement('canvas'); cv.width = img.naturalWidth; cv.height = img.naturalHeight; const x = cv.getContext('2d'); x.drawImage(img, 0, 0); const px = (u, v) => Array.from(x.getImageData(Math.floor(u * (cv.width - 1)), Math.floor(v * (cv.height - 1)), 1, 1).data);
    out.pix = { centre: px(0.5, 0.45), corner: px(0.01, 0.01), ring: px(0.5, 0.74) }; const m = PortalArt.material(); out.mat = { add: m.blending === THREE.AdditiveBlending, fog: m.fog, dw: m.depthWrite, tr: m.transparent, tm: m.toneMapped, map: m.map === tex };
    const gm = PortalArt.gate(), pos = gm.attributes.position.array, uv = gm.attributes.uv.array; out.geo = { w: +(pos[3] - pos[0]).toFixed(2), h: +(pos[7] - pos[1]).toFixed(2), y0: pos[1], zs: new Set([0, 1, 2, 3].map(v => pos[v * 3 + 2])).size, uv: Array.from(uv).join() };
    return out;
  });
  T('the picture is the user\'s own, scaled and nothing else (' + PA.dims[0] + ' x ' + PA.dims[1] + ' from 4200 x 3420, ratio ' + PA.dims[2] + '), loaded: a white flare in the middle (' + PA.pix.centre.slice(0, 3).join(',') + '), a pink ring (' + PA.pix.ring.slice(0, 3).join(',') + '), black at the corner (' + PA.pix.corner.slice(0, 3).join(',') + '); drawn additive, unfogged, without depth write, one material per door',
    PA.loaded && PA.sameRatio && PA.pix.centre[0] > 200 && PA.pix.centre[1] > 150 && PA.pix.corner[0] < 30 && PA.pix.corner[1] < 30 && PA.pix.ring[0] > 150 && PA.pix.ring[1] < 110 && PA.mat.add && PA.mat.fog === false && PA.mat.dw === false && PA.mat.tr && PA.mat.tm === false && PA.mat.map, JSON.stringify(PA.mat));
  T('a door is one plane across the road (a constant z), ' + PA.geo.w + ' m wide and ' + PA.geo.h + ' m high with the picture\'s own proportions, standing on the road, the whole picture on it (uv ' + PA.geo.uv + ')',
    PA.geo.w === 14 && Math.abs(PA.geo.h - 14 / PA.dims[2]) < 0.01 && PA.geo.y0 === 0 && PA.geo.zs === 1 && PA.geo.uv === '0,0,1,0,1,1,0,1', JSON.stringify(PA.geo));

  // ================================================================ 3. the doors on the road: positions, size, fade with the distance, both branches of a junction, pools
  const PL = await pg.evaluate(() => {
    const out = {}; let g = H.at(0); const q = g.portal.list.find(x => x.from === 'coast' && x.to === 'saintgilles');
    const read = (z, lim = 100) => { g = H.at(z); H.draw(3); const r = g.r, vis = r.props.portalGate.filter(o => o.visible && -o.position.z < lim); return { n: vis.length, ahead: vis.map(o => +(-o.position.z).toFixed(1)).sort((a, c) => a - c), scale: [...new Set(vis.map(o => +o.scale.x.toFixed(2)))], op: vis.map(o => [+(-o.position.z).toFixed(0), +o.children[0].material.opacity.toFixed(2)]).sort((a, c) => a[0] - c[0]), x: vis.map(o => +o.position.x.toFixed(1)).sort((a, c) => a - c), dropped: r.dropped, droppedBy: r.droppedBy.portalGate || 0, all: r.props.portalGate.filter(o => o.visible).length, hole: vis[0] ? (() => { const pic = vis[0].children[0], hl = vis[0].children[1]; hl.geometry.computeBoundingBox(); const bb = hl.geometry.boundingBox; return { color: hl.material.color.getHex(), ro: [pic.renderOrder, hl.renderOrder], op: [+pic.material.opacity.toFixed(2), +hl.material.opacity.toFixed(2)], blend: [pic.material.blending === THREE.AdditiveBlending, hl.material.blending === THREE.NormalBlending], box: [+bb.min.x.toFixed(2), +bb.max.x.toFixed(2), +bb.min.y.toFixed(2), +bb.max.y.toFixed(2), +bb.min.z.toFixed(2)], w: PortalArt.gate().boundingBox.max.y }; })() : null }; };
    out.near = read(q.zIn - 600, 200); out.far = read(q.zIn - 1050, 170);
    out.exitFade = [0, 100, 200, 300].map(d => { const rd = read(q.zIn + d - 0, 200), ex = rd.op.find(o => Math.abs(o[0] - (q.zOut - q.zIn - d) / 10) < 0.6); return [(q.zOut - q.zIn - d) / 10, ex ? ex[1] : null]; });
    // after the door: the plane fades out as the runner goes through it
    g = H.at(q.zIn - 100); H.draw(2); const gate = () => g.r.props.portalGate.filter(o => o.visible).map(o => [+(-o.position.z).toFixed(1), +o.children[0].material.opacity.toFixed(2)]).sort((a, c) => a[0] - c[0]);
    out.passing = [10, 4, 0, -3, -7].map(d => { g.p.z = q.zIn - d * 10; H.draw(2); return [d, gate()[0]]; });
    // no pool is ever short: every passage of the first laps, seen from five distances
    let worst = 0, drops = 0; g = H.at(0); for (const p of g.portal.list.slice(0, 12)) for (const off of [-1500, -1000, -500, 0, 300]) { g.p.z = p.zIn + off; g.world.extend(g.p.z); H.draw(1); worst = Math.max(worst, g.r.propUsed.portalGate); drops += g.r.droppedBy.portalGate || 0; }
    out.pool = { worst, drops, cap: g.r.props.portalGate.length };
    return out;
  });
  T('at a boundary between two segments the entry door stands ' + PL.near.ahead[0] + ' m ahead at full strength and the exit door, the receiver, ' + PL.near.ahead[1] + ' m ahead (70 m after it) is not visible yet (strength ' + PL.near.op[1][1] + '): it cannot be seen from the entry door; it fades in only within 70 m (' + PL.exitFade.map(e => e[0] + ' m: ' + e[1]).join(', ') + ')',
    PL.near.n === 2 && Math.abs(PL.near.ahead[0] - 60) < 0.5 && Math.abs(PL.near.ahead[1] - 130) < 0.5 && PL.near.scale.join() === '1' && PL.near.op[0][1] === 1 && PL.near.op[1][1] === 0 && PL.exitFade[0][1] === 0 && PL.exitFade[1][1] > 0 && PL.exitFade[1][1] < 1 && PL.exitFade[2][1] === 1 && PL.exitFade[3][1] === 1 && PL.near.droppedBy === 0, JSON.stringify([PL.near.op, PL.exitFade]));
  T('a door fades in with the distance, so it never pops up: at ' + PL.far.op[0][0] + ' m its strength is ' + PL.far.op[0][1] + ', farther doors are at ' + PL.far.op.slice(1).map(o => o[1]).join(', ') + ' (every door is ' + PL.far.all + ' placed or fewer)', PL.far.n >= 1 && PL.far.op[0][1] > 0.3 && PL.far.op[0][1] < 0.7 && PL.far.op.slice(1).every(o => o[1] === 0), JSON.stringify(PL.far.op));
  T('the runner goes through: the door is at full strength until 4 m before it and fades out behind (' + PL.passing.map(p => p[0] + ' m: ' + (p[1] ? p[1][1] : '-')).join(', ') + ')', PL.passing[0][1][1] === 1 && PL.passing[1][1][1] === 1 && PL.passing[2][1][1] > 0.5 && PL.passing[2][1][1] < 0.8 && PL.passing[3][1][1] < 0.45 && PL.passing[4][1] && PL.passing[4][1][1] === 0, JSON.stringify(PL.passing));
  T('the pool of doors is never short: at most ' + PL.pool.worst + ' of ' + PL.pool.cap + ' used over the first twelve passages seen from five distances each, nothing dropped (' + PL.pool.drops + ')', PL.pool.worst <= PL.pool.cap && PL.pool.worst >= 2 && PL.pool.drops === 0 && PL.near.dropped === 0, JSON.stringify(PL.pool));

  T('the middle of the door is a BLACK HOLE: an opaque black disc (colour ' + PL.near.hole.color + ') a hair in front of the picture, drawn after it (so the white flare of the picture does not turn it pink), with the door\'s own strength (' + PL.near.hole.op.join(' / ') + '), centred on the rings, 2 m lower than the patch you circled (x ' + PL.near.hole.box.slice(0, 2).join(' to ') + ' m, ' + PL.near.hole.box.slice(2, 4).join(' to ') + ' m high, centre ' + ((PL.near.hole.box[2] + PL.near.hole.box[3]) / 2).toFixed(2) + ' m, of a door ' + PL.near.hole.w.toFixed(1) + ' m high); the picture round it stays transparent (additive)',
    PL.near.hole.color === 0 && PL.near.hole.ro[1] > PL.near.hole.ro[0] && PL.near.hole.op[0] === PL.near.hole.op[1] && PL.near.hole.blend.every(Boolean) && PL.near.hole.box[0] > -2 && PL.near.hole.box[1] < 2 && Math.abs((PL.near.hole.box[2] + PL.near.hole.box[3]) / 2 - 5.62) < 0.15 && (PL.near.hole.box[0] + PL.near.hole.box[1]) / 2 > 0 && (PL.near.hole.box[0] + PL.near.hole.box[1]) / 2 < 0.5 && PL.near.hole.box[1] - PL.near.hole.box[0] > 1.4 && PL.near.hole.box[4] > 0, JSON.stringify(PL.near.hole));

  // ================================================================ 3b. the journey of the runner: pulled into the black hole, out of sight between the doors, out of the exit door; nothing touches it meanwhile
  const JR = await pg.evaluate(() => {
    const out = {}; let g = H.at(0); const q = g.portal.list.find(x => x.from === 'coast'), at = (z, steps = 3) => { g.p.z = z - 1; g.p.x = 0; g.world.extend(z); g.portal.update(g, z - 2); g.p.z = z; g.portal.update(g, z - 1); H.draw(steps); const G = g.r.runner.group, sh = g.r.runner.shadow; return { mode: g.portal.pose.mode, e: +g.portal.pose.e.toFixed(2), vis: G.visible, s: +G.scale.x.toFixed(2), y: +G.position.y.toFixed(1), x: +G.position.x.toFixed(1), z: +G.position.z.toFixed(1), roll: +G.rotation.z.toFixed(2), shadow: sh.visible }; };
    g = H.at(q.zIn - 400); g.portal.list.forEach(x => x.hit = false);
    out.before = at(q.zIn - Portal.PULL - 30); g.portal.list.forEach(x => x.hit = true); out.pull0 = at(q.zIn - Portal.PULL + 5); out.pull1 = at(q.zIn - 90); out.pull2 = at(q.zIn - 40); out.pull3 = at(q.zIn - 6); out.hidden = at(q.zIn + 120);
    out.emerge0 = at(q.zOut - Portal.EMERGE + 25); out.emerge1 = at(q.zOut - 70); out.emerge2 = at(q.zOut); out.after = at(q.zOut + Portal.SETTLE + 30);
    // the road of a journey has no hazards (taken out when the passage is first seen) and the runner is not invincible: a crate put in its face is lethal inside the journey as well as outside
    const hit = (z, dz) => { g = H.at(z); g.die = Game.prototype.die; g.portal.list.forEach(x => x.hit = true); g.portal.update(g, z - 1); g.world.items.push({ kind: 'crate', z: z + dz, x: 0, h: 12, tag: 'main' }); for (let i = 0; i < 12; i++) g.advance(1 / 60); return { state: g.state }; };
    out.inside = hit(q.zIn + 100, 4); out.inPull = hit(q.zIn - 60, 4); out.outside = hit(q.zIn - Portal.PULL - 60, 4); out.outAfter = hit(q.zOut + Portal.SETTLE + 60, 4);
    g = __wf; g.start(); g.world.extend(60000); g.portal.scan(g.world); const inSpan = i => g.portal.list.some(x => i.z >= x.zIn - Portal.PULL && i.z <= x.zOut + Portal.SETTLE); out.span = { spans: g.portal.list.length, inSpan: 0, left: 0, outside: 0 };
    for (const i of g.world.items) { if (!OBST[i.kind]) continue; if (inSpan(i)) { out.span.inSpan++; if (!i.taken) out.span.left++; } else if (!i.taken) out.span.outside++; }
    return out;
  });
  T('as the runner reaches the door it is pulled into the black hole: nothing before the pull (' + JR.before.mode + ', scale ' + JR.before.s + '), then it rises toward the middle of the door while it shrinks and turns (scale ' + [JR.pull0, JR.pull1, JR.pull2, JR.pull3].map(p => p.s).join(' > ') + ', height ' + [JR.pull0, JR.pull1, JR.pull2, JR.pull3].map(p => p.y).join(', ') + ' m), and is gone at the door',
    JR.before.mode === 'none' && JR.before.s === 1 && JR.before.vis && JR.before.roll === 0 && JR.pull0.mode === 'pull' && JR.pull0.s > 0.95 && JR.pull1.s < JR.pull0.s && JR.pull2.s < JR.pull1.s && JR.pull3.s < 0.1 && JR.pull2.y > JR.pull1.y && JR.pull2.y > 2 && JR.pull1.vis && JR.pull1.shadow === false && JR.pull0.shadow, JSON.stringify([JR.before, JR.pull0, JR.pull1, JR.pull2, JR.pull3]));
  T('between the two doors the runner is out of sight (the runner and its shadow hidden); it comes out of the middle of the exit door, small and falling toward its road (scale ' + [JR.emerge0, JR.emerge1, JR.emerge2].map(p => p.s).join(' < ') + ', height ' + [JR.emerge0, JR.emerge1, JR.emerge2].map(p => p.y).join(' > ') + ' m) and is back as it was just after the door (scale ' + JR.after.s + ', no turn, height ' + JR.after.y + ')',
    JR.hidden.mode === 'hidden' && JR.hidden.vis === false && JR.hidden.shadow === false && JR.emerge0.vis && JR.emerge0.s < JR.emerge1.s && JR.emerge1.s < JR.emerge2.s && JR.emerge2.s < 1 && JR.emerge0.y > 4 && JR.emerge0.y > JR.emerge2.y && JR.emerge1.y > JR.emerge2.y && JR.after.mode === 'none' && JR.after.s === 1 && JR.after.roll === 0 && JR.after.y === 0 && JR.after.z === 0 && JR.after.vis && JR.after.shadow, JSON.stringify([JR.hidden, JR.emerge0, JR.emerge1, JR.emerge2, JR.after]));
  T('the road of a journey is clear: no hazard stands between the start of the pull and 2 m after the exit door (' + JR.span.left + ' left of the ' + JR.span.inSpan + ' the track had there, over ' + JR.span.spans + ' passages), the other ' + JR.span.outside + ' hazards are where they were; and the runner is not invincible (a crate in its face: ' + JR.inPull.state + ' in the pull, ' + JR.inside.state + ' between the doors, ' + JR.outside.state + ' before, ' + JR.outAfter.state + ' after)',
    JR.span.spans >= 5 && JR.span.left === 0 && JR.span.inSpan >= 3 && JR.span.outside > 20 && JR.inside.state === 'over' && JR.inPull.state === 'over' && JR.outside.state === 'over' && JR.outAfter.state === 'over', JSON.stringify([JR.span, JR.inside, JR.inPull, JR.outside, JR.outAfter]));

  // ================================================================ 4. the light of the journey and its voices
  const LG = await pg.evaluate(() => {
    const out = {}; const g = H.at(0), q = g.portal.list.find(x => x.from === 'coast'); const L = z => { const r = Portal.light(q, z); return [+r.k.toFixed(2), +r.flash.toFixed(2)]; };
    out.light = { before: L(q.zIn - 150), ramp: L(q.zIn - 45), in: L(q.zIn), mid: L((q.zIn + q.zOut) / 2), out: L(q.zOut), after: L(q.zOut + 75), gone: L(q.zOut + 170) };
    // a run through the passage: the voices, once each, and the light back to nothing
    g.world.items = g.world.items.filter(i => i.kind === 'prop'); const c0 = Object.assign({}, g.sfx.counts); g.p.z = q.zIn - 400; g.world.extend(g.p.z); const peak = { k: 0, flash: 0 }, cnt = g.portal.count; let steps = 0, flashFrames = 0, prevFlash = 0, risingMax = 0;
    while (g.p.z < q.zOut + 400 && steps < 4000) { g.advance(1 / 60); steps++; peak.k = Math.max(peak.k, g.portal.k); peak.flash = Math.max(peak.flash, g.portal.flash); risingMax = Math.max(risingMax, g.portal.flash - prevFlash); prevFlash = g.portal.flash; if (g.portal.flash > 0.5) flashFrames++; g.world.items = g.world.items.filter(i => i.kind === 'prop'); }
    out.run = { state: g.state, steps, ins: (g.sfx.counts.portalIn || 0) - (c0.portalIn || 0), outs: (g.sfx.counts.portalOut || 0) - (c0.portalOut || 0), passages: g.portal.count - cnt, peak, k: g.portal.k, flash: g.portal.flash, risingMax: +risingMax.toFixed(3), flashFrames };
    const v = GameAudio.voices; out.voices = [typeof v.portalIn, typeof v.portalOut];
    return out;
  });
  T('the light of the journey follows the road: nothing 15 m before the entry door, the pink wash rising to ' + LG.light.in[0] + ' with a flash of ' + LG.light.in[1] + ' as the entry door is crossed, steady (0.3) between the doors, a flash of ' + LG.light.out[1] + ' at the exit door, fading to nothing 17 m after it',
    JSON.stringify(LG.light.before) === '[0,0]' && LG.light.ramp[0] > 0.1 && LG.light.ramp[0] < 0.55 && LG.light.ramp[1] > 0 && LG.light.in[0] === 0.55 && LG.light.in[1] === 1 && LG.light.mid[0] === 0.3 && LG.light.mid[1] === 0 && LG.light.out[0] === 0.55 && LG.light.out[1] === 0.75 && LG.light.after[0] > 0 && LG.light.after[0] < 0.55 && JSON.stringify(LG.light.gone) === '[0,0]', JSON.stringify(LG.light));
  T('a run through a passage plays the entry voice once and the exit voice once (' + LG.run.ins + ' and ' + LG.run.outs + ', ' + LG.run.passages + ' passage counted), the flash is smooth (at most ' + LG.run.risingMax + ' more per step, ' + LG.run.flashFrames + ' bright frames, two flashes 70 m apart: under three a second), and the light is gone afterwards',
    LG.run.state === 'play' && LG.run.ins === 1 && LG.run.outs === 1 && LG.run.passages === 1 && LG.run.peak.k > 0.5 && LG.run.peak.k <= 0.55 && LG.run.peak.flash > 0.9 && LG.run.risingMax < 0.12 && LG.run.k === 0 && LG.run.flash === 0 && LG.voices.join() === 'function,function', JSON.stringify(LG.run));

  // ================================================================ 5. the Gare du Midi is left as it is: the whole way from the tram street to Utrecht plays no door
  const GR = await pg.evaluate(() => {
    let g = H.at(0); const P = g.world.pieces.find(p => p.id === 'gareMidi'), U = g.world.pieces.find(p => p.id === 'utrechtA'); g = H.at(P.z0 - 500); g.sfx.counts.portalIn = 0; g.sfx.counts.portalOut = 0; g.die = () => {};
    let steps = 0, scene = 0, maxK = 0; while ((g.p.z < U.z0 + 1500 || g.state === 'scene') && steps < 60 * 90) { g.advance(1 / 60); steps++; if (g.state === 'scene') scene++; maxK = Math.max(maxK, g.portal.k, g.portal.flash); g.world.items = g.world.items.filter(i => i.kind === 'prop'); }
    return { state: g.state, scene, steps, ins: g.sfx.counts.portalIn || 0, outs: g.sfx.counts.portalOut || 0, maxK, z: Math.round(g.p.z - U.z0), gates: g.r.propUsed.portalGate };
  });
  T('from the tram street through the station scene (' + GR.scene + ' frames of it) to 150 m into Utrecht no door is crossed and no light appears (' + GR.ins + ' / ' + GR.outs + ' voices, light ' + GR.maxK + ')', GR.scene > 120 && GR.state === 'play' && GR.z >= 1500 && GR.ins === 0 && GR.outs === 0 && GR.maxK === 0, JSON.stringify(GR));

  // ================================================================ 6. the overlay: pink at the corners and clear in the middle between the doors, white at a door, nothing elsewhere
  const OV = await pg.evaluate(() => {
    const g = H.at(0), q = g.portal.list.find(x => x.from === 'coast'), px = (x, y) => Array.from(g.r.ui.ctx.getImageData(x, y, 1, 1).data), out = {};
    H.to(q.zIn - 500); out.away = [px(6, 172), px(160, 90), px(314, 172)];                                    // (the overlay canvas is 320 x 180)
    H.to((q.zIn + q.zOut) / 2); out.mid = { corner: px(6, 172), corner2: px(314, 172), centre: px(160, 100) };
    H.to(q.zIn); out.door = { corner: px(6, 172), centre: px(160, 100) };
    H.to(q.zOut + 400); out.after = [px(6, 172), px(314, 172)];
    return out;
  });
  T('the overlay: nothing away from a passage; between the doors pink at the corners (alpha ' + OV.mid.corner[3] + ' / ' + OV.mid.corner2[3] + ') and clear in the middle (alpha ' + OV.mid.centre[3] + '); a white-pink flash over everything at a door (alpha ' + OV.door.centre[3] + '); nothing after',
    OV.away.every(p => p[3] === 0) && OV.mid.corner[3] > 30 && OV.mid.corner2[3] > 30 && OV.mid.corner[0] > 200 && OV.mid.corner[1] < 120 && OV.mid.centre[3] < 12 && OV.door.centre[3] > 90 && OV.door.centre[0] > 230 && OV.after.every(p => p[3] === 0), JSON.stringify(OV));
  T('no JS errors (3D)', pg.errs.length === 0, pg.errs.slice(0, 2).join('|')); await pg.context().close();

  // ================================================================ 7. reduced motion: a third of the flash and still streaks
  const pr = await open(base, { reducedMotion: 'reduce' }); await pr.evaluate(setup);
  const RM = await pr.evaluate(() => { const g = H.at(0), q = g.portal.list[0]; H.to(q.zIn); return { reduced: g.portal.reduced, flash: +g.portal.flash.toFixed(2), centre: Array.from(g.r.ui.ctx.getImageData(160, 100, 1, 1).data)[3] }; });
  T('with reduced motion the flash is a third as strong (' + RM.flash + ', alpha ' + RM.centre + ') and the streaks stand still', RM.reduced === true && RM.flash === 0.35 && RM.centre > 20 && RM.centre < 60, JSON.stringify(RM));
  T('no JS errors (reduced motion)', pr.errs.length === 0, pr.errs.slice(0, 2).join('|')); await pr.context().close();

  // ================================================================ 8. the classic 2D game has no doors and runs through a passage unchanged
  const p2 = await open(base + '2d.html');
  const D2 = await p2.evaluate(() => {
    const g = __wf, out = {}; g.start(); g.world.extend(60000); g.world.items = []; g.state = 'play'; g.p.z = 3000; g.p.speed = 340; g.world.extend(g.p.z); g.die = () => {}; let err = null, draws = 0;
    try { for (let f = 0; f < 60 * 12; f++) { g.advance(1 / 60); if (f % 4 === 0) { g.draw(); draws++; } } } catch (e) { err = String(e && e.message); }
    out.err = err; out.draws = draws; out.portal = g.portal; out.cls = typeof Portal; out.z = Math.round(g.p.z); return out;
  });
  T('the classic 2D game has no doors (no Portal object, ' + D2.cls + ' class) and runs through the first passage (z ' + D2.z + ', ' + D2.draws + ' frames) without error', !D2.err && D2.portal === null && D2.cls === 'undefined' && D2.z > 4100 && D2.draws > 150 && p2.errs.length === 0, JSON.stringify(D2));
  await p2.context().close();
  console.log('\n' + res.filter(Boolean).length + '/' + res.length + ' passed');
  await b.close(); srv.close(); process.exit(res.every(Boolean) ? 0 : 1);
})().catch(e => { console.log('TEST ERROR', e.message); process.exit(1); });
