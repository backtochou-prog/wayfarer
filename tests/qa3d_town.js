// WAYFARER regression test: the coastal town on its ISLAND, the optional half of the beach zone (src/track.js `gateIsland*` forks: the coast goes on to the left, the way to the island goes UNDER THE SEA, through the
// aquarium tunnel, to the right; src3d/env_town.js, src3d/env_aqua.js, saucer3d.js), and the giant sunburst parasols of the coast (src3d/parasol_art.js, parasol_assets.js made by tools/make_parasol_assets.py from the
// user's picture). Checks the order of the zone and the lights, the junction and its signs, the tunnel and the look that changes at its mouths (no dip), the hand-over (no door in the beach zone), the user's picture on the
// parasols, the towers, the roundabouts, the landing pad and the saucer that takes off, the pools, and the 2D game.
//
// Run:  node tests/qa3d_town.js     (needs playwright-core and a Chromium: CHROMIUM=/path/to/chrome, NODE_PATH or PW_CORE as for the other tests; TEST_URL=https://... tests a deployment)
const http = require('http'), fs = require('fs'), path = require('path');
let chromium; try { ({ chromium } = require('playwright-core')); } catch (e) { ({ chromium } = require(process.env.PW_CORE || 'playwright-core')); }
const ROOT = path.join(__dirname, '..'), PORT = 8126;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const res = []; const T = (n, ok, i = '') => { res.push(ok); console.log((ok ? 'PASS ' : 'FAIL ') + n + (i !== '' ? '  [' + i + ']' : '')); };

(async () => {
  const srv = http.createServer((q, r) => {
    let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
    fs.readFile(path.join(ROOT, p), (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' }); r.end(d); } });
  }).listen(PORT);
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/root/.cache/ms-playwright/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const base = process.env.TEST_URL || 'http://localhost:' + PORT + '/';
  const open = async url => { const pg = await (await b.newContext({ viewport: { width: 480, height: 270 } })).newPage(); pg.errs = []; pg.on('pageerror', e => pg.errs.push(e.message)); pg.on('console', m => m.type() === 'error' && !/404/.test(m.text()) && pg.errs.push(m.text())); await pg.goto(url, { timeout: 90000 }); await pg.waitForFunction(() => window.__wf, null, { timeout: 60000 }); await pg.waitForTimeout(1500); return pg; };
  const pg = await open(base);
  await pg.evaluate(() => {
    window.H = {
      at(z) { const g = __wf; g.r.renderer.render = () => {}; g.start(); g.world.extend(170000); g.portal.scan(g.world); g.state = 'play'; g.p.z = z; g.p.x = 0; g.p.speed = 300; g.scene = null; g.fadeIn = 0; g.world.extend(z); g.world.items = g.world.items.filter(i => i.kind === 'prop');
        const a = g.world.playerBand(z + 300, 0); g.bgTo = a.to; g.bgT = a.t; g.die = () => {}; if (g.r.saucers) g.r.saucers.state.clear(); return g; },
      draw(n = 3) { const g = __wf; for (let i = 0; i < n; i++) { g.time += 1 / 60; g.r.draw(g); } },
      slot(P, prop, env, from = 300, to = 300) { for (let i = Math.ceil((P.z0 + from) * 0.1 / 12); i < (P.z1 - to) * 0.1 / 12; i++) if (ENV3D[env].layout(i, rnd).some(q => q.prop === prop)) return i; return null; },
      isle(w, id) { const F = w.pieces.find(p => p.type === 'fork' && p.fork.tube && (!id || p.fork.right.route === id)); if (!F) return null; return { id: F.fork.right.route, F, seg: TRACK.segments[F.fork.right.route], z0: F.fe + F.fork.tube.len, z1: F.be }; },
    };
  });

  // ================================================================ 1. the beach zone: the coast, then the island junction in the same light; the tunnel; the hand-over
  const K = await pg.evaluate(() => {
    const C = TRACK.pickSegs.C, E = TRACK.pickForks.E, fid = f => Object.keys(TRACK.forks).find(k => TRACK.forks[k] === f), out = { seeds: {}, lights: new Set() };
    for (const s of [0, 1, 7, 99, 12345]) {
      const w = new World(TRACK); w.seed = s; w.reset(); w.extend(260000); const P = w.pieces; let n = 0, ok = 0, bad = 0; const before = new Set(), after = new Set();
      for (let i = 1; i + 2 < P.length; i++) if (C.includes(P[i].id)) { n++; const same = P[i + 1].type === 'fork' && E.indexOf(fid(P[i + 1].fork)) === C.indexOf(P[i].id); if (same) ok++; else bad++; before.add(P[i - 1].id); after.add(P[i + 2].id); out.lights.add(P[i].id + '+' + fid(P[i + 1].fork || {})); }
      out.seeds[s] = { n, ok, bad, before: [...before].sort().join(), after: [...after].sort().join() };
    }
    out.lights = [...out.lights].sort().join(' ');
    const w0 = new World(TRACK); w0.extend(52000); const ids = w0.pieces.map(p => p.id || 'fork'), i = ids.findIndex(x => /^coast(Sunset|Midday|BlueHour|Morning)$/.test(x)), Pc = w0.pieces[i], Pf = w0.pieces[i + 1], F = Pf.fork;
    out.order = ids.slice(i - 1, i + 3).join('>'); out.fork = fid(F); out.len = [Pc.z1 - Pc.z0, F.zone, F.branchLen, F.merge]; out.names = [Pc.seg.name, TRACK.segments[F.left.route].name, TRACK.segments[F.right.route].name]; out.routes = [F.left.route, F.right.route];
    out.biomes = [TRACK.segments[F.left.route].biome, TRACK.segments[F.right.route].biome]; out.signs = [F.left.sign, F.right.sign]; out.tube = F.tube; out.hold = !!F.hold;
    out.signKit = !!ENV3D.common.props.signIsland && !!SPR.signIsland && !!ENV3D.common.props.signCoast && !!SPR.signCoast;
    const band = (z, side) => w0.bandsAt(z).find(b => b.side === side), t = z => w0.bandsAt(z)[0].t;
    out.t = { coastStart: +t(Pc.z0 + 2).toFixed(2), coastMid: +t(Pc.z0 + 2100).toFixed(2), coastEnd: +t(Pc.z1 - 2).toFixed(2) };
    let dip = 0, leftOther = 0; const seq = []; for (let z = Pf.z0 + 1; z < Pf.be; z += 5) { const l = band(z, -1), r = band(z, 1); if (l.t < 0.999 || r.t < 0.999) dip++; if (!/^coast$/.test(l.to)) leftOther++; if (seq[seq.length - 1] !== r.to) seq.push(r.to); }
    out.dip = dip; out.leftOther = leftOther; out.rightSeq = seq.join('>'); out.mouth = [band(Pf.fe - 5, 1).to, band(Pf.fe + 5, 1).to, band(Pf.fe + F.tube.len - 5, 1).to, band(Pf.fe + F.tube.len + 5, 1).to];
    out.mergeT = [+w0.bandsAt(Pf.be + 10)[0].t.toFixed(2), +w0.bandsAt(Pf.z1 - 2)[0].t.toFixed(2)];
    const P2 = new Portal({}); P2.scan(w0); out.passages = P2.list.filter(q => q.zIn < 46000).map(q => q.from + '>' + q.to).join(','); out.inside = P2.list.filter(q => q.zIn > Pc.z0 + 200 && q.zIn < Pf.z1).length;
    const ex = P2.list.find(q => q.from === 'coast' && q.to === 'saintgilles'); out.exit = ex ? [ex.zIn - Pf.z1, ex.zOut - ex.zIn] : null;
    out.envs = ['coastTown', 'coastTownNoon', 'coastTownBlue', 'coastTownMorning'].map(k => !!ENV3D[k] && !!ENV3D[k].layout && ENV3D[k].props.coastTower3 && ENV3D[k].props.coastPad && ENV3D[k].props.coastRound && ENV3D[k].props.coastParasol && ENV3D[k].props.coastCanal && !!BIOMES[k] && ENV3D[k].sky.top !== undefined);
    out.sky = ['coastTown', 'coastTownNoon', 'coastTownBlue', 'coastTownMorning'].map(k => ENV3D[k].sky.top + ENV3D[k].fog.color).join(',');
    out.music = /^coast/.test('coastTownBlue') && /^coast/.test('coastTown') && /^coast/.test('coastAqua'); out.fam = ['coastTown', 'coastTownNoon', 'coastTownBlue', 'coastTownMorning', 'coastAqua'].map(k => Portal.fam(k)).join();
    out.forks = E.map(k => [TRACK.forks[k].left.route, TRACK.forks[k].right.route, TRACK.forks[k].tube.pre, TRACK.segments[TRACK.forks[k].left.route].biome, TRACK.segments[TRACK.forks[k].right.route].biome].join('/')).join(' ');
    return out;
  });
  const S = Object.values(K.seeds);
  T('the beach zone is the coast, then a junction to the island in the same light: ' + K.order + ' (' + K.len[0] + ' units of coast, then the junction: ' + K.len[1] + ' to part, ' + K.len[2] + ' of two roads, ' + K.len[3] + ' to merge); for five seeds every coastal piece is followed by the island junction of its own light (' + S.map(s => s.ok + '/' + s.n).join(', ') + '), after the neon quarter and before Saint-Gilles',
    /^(neonStart|neonRun)>coast(Sunset|Midday|BlueHour|Morning)>fork>cityRun$/.test(K.order) && K.len[0] === 4200 && K.len[1] === 480 && K.len[2] === 15000 && K.len[3] === 380 && S.every(s => s.n >= 6 && s.bad === 0 && s.ok === s.n && s.before === 'neonRun,neonStart' && s.after === 'cityRun') && K.lights.split(' ').length === 4, K.lights);
  T('the passage to the island is OPTIONAL: the junction offers the coast going on to the left (' + K.routes[0] + ', ' + K.names[1] + ') or the island to the right (' + K.routes[1] + ', ' + K.names[2] + '), two signposts each side (the COAST sun over waves, the ISLAND painted tower: ' + K.signs.join(' / ') + ', both drawn in 3D and in 2D), and the four lights are four junctions (' + K.forks + ')',
    K.signs.join() === 'signCoast,signIsland' && K.signKit && /^coast(Walk)/.test(K.routes[0]) && /^island/.test(K.routes[1]) && K.names[1] === 'SUNSET COAST' && K.names[2] === 'SUNSET ISLAND' && K.forks.split(' ').length === 4 && K.forks.split(' ').every((f, i) => { const [l, r, pre, bl, br] = f.split('/'); return /^coastWalk/.test(l) && /^island/.test(r) && pre === bl && /^coastTown/.test(br) && l.replace('coastWalk', '') === r.replace('island', ''); }), K.forks);
  T('the way to the island goes UNDER THE SEA: the right road keeps the coast look while the two roads part (' + K.mouth[0] + '), runs ' + K.tube.len / 10 + ' m through the aquarium tunnel (' + K.mouth[1] + ' to ' + K.mouth[2] + ') and comes up on the island (' + K.mouth[3] + '): ' + K.rightSeq + '; the coast road beside it stays the coast (' + K.leftOther + ' samples elsewhere)',
    K.tube.biome === 'coastAqua' && K.tube.len === 9000 && K.mouth[0] === K.tube.pre && K.mouth[1] === 'coastAqua' && K.mouth[2] === 'coastAqua' && /^coastTown/.test(K.mouth[3]) && /^coast[A-Za-z]*>coastAqua>coastTown[A-Za-z]*$/.test(K.rightSeq) && K.leftOther === 0, JSON.stringify(K.mouth));
  T('the hand-over is seamless and there is NO door in the beach zone: the coast stays in to its end (t ' + K.t.coastEnd + '), nothing dips back to the city look in the junction (' + K.dip + ' dips: it holds the look of the coast), the merge fades into Saint-Gilles (t ' + K.mergeT.join(' / ') + '), all one zone family (' + K.fam + '), and the passages around it are ' + K.passages + ' (' + K.inside + ' inside), the door out standing ' + (K.exit && K.exit[0] / 10) + ' m after the roads have merged',
    K.t.coastStart < 0.05 && K.t.coastMid === 1 && K.t.coastEnd === 1 && K.dip === 0 && K.hold && K.mergeT[0] > 0.5 && K.mergeT[1] < 0.5 && K.fam === 'coast,coast,coast,coast,coast' && K.inside === 0 && K.passages === 'neon>coast,coast>saintgilles,utrecht>neon' && K.exit && K.exit[0] === 50 && K.exit[1] === 700 && K.music, JSON.stringify(K.t));
  T('the island has its own names (' + K.names[2] + ', biome ' + K.biomes[1] + '), and one environment per light with the coast\'s sky and fog (' + K.sky + '), its props (towers, roundabout, landing pad, parasol, canal) and a 2D palette', /ISLAND$/.test(K.names[2]), JSON.stringify(K.envs));
  T('the four island environments are complete', K.envs.every(Boolean) && new Set(K.sky.split(',')).size === 4, K.sky);

  // ---- the look under the sea: the atmosphere switches at once at the mouths of the tunnel (and back on the island), under a splash of light, never dipping back to the city look; the coast road keeps its own
  const AQ = await pg.evaluate(() => {
    const out = {}, g = __wf; g.advance = g.advance; g.start(); g.world.extend(30000); g.die = () => {};
    const run = side => {
      g.start(); g.world.extend(40000); g.world.items = []; const F = g.world.pieces.find(p => p.type === 'fork' && p.fork.tube); g.state = 'play'; g.p.z = F.z0 - 500; g.p.speed = 300; g.p.x = 0; g.world.extend(g.p.z); g.die = () => {}; g.r.renderer.render = () => {};
      const a = g.world.playerBand(g.p.z + 300, 0); g.bgTo = BIOMES[a.to].keep ? 'coast' : a.to; g.bgT = a.t;
      const seq = [], at = {}, fogs = []; let minT = 1; const left = side < 0, tb = F.fork.tube;
      for (let f = 0; f < 60 * 120 && g.p.z < F.z1 - 400; f++) {          // (minT is read before the merge into Saint-Gilles, which fades the look on purpose 30 m ahead)
        if (g.p.z >= F.z0 - 150 && !F.choice) { g.world.commit(F, left ? 'left' : 'right'); g.p.x = left ? -2.4 : 2.4; }
        g.advance(1 / 60); if (g.p.z > F.z0 - 200 && g.p.z < F.be - 350) minT = Math.min(minT, g.bgT);
        if (seq[seq.length - 1] !== g.bgTo) { seq.push(g.bgTo); at[g.bgTo] = Math.round(g.p.z - F.fe); }
        if (f % 3 === 0 && g.p.z > F.fe - 600 && g.p.z < F.fe + tb.len + 600) { g.time += 3 / 60; g.r.draw(g); const c = g.r.scene.fog.color; fogs.push([Math.round(g.p.z - F.fe), c.r, c.g, c.b, g.r.seaTop.visible ? 1 : 0, Math.round(g.world.seaDepth(g.p.z) * 0.1 * 10) / 10]); }
      }
      let step = 0, jump = 0; for (let k = 1; k < fogs.length; k++) { const d = Math.max(Math.abs(fogs[k][1] - fogs[k - 1][1]), Math.abs(fogs[k][2] - fogs[k - 1][2]), Math.abs(fogs[k][3] - fogs[k - 1][3])); step = Math.max(step, d); }
      const col = hex => { const c = new THREE.Color(hex); return [c.r, c.g, c.b]; }, near = u => fogs.reduce((b2, q) => Math.abs(q[0] - u) < Math.abs(b2[0] - u) ? q : b2, fogs[0] || [0, 0, 0, 0, 0, 0]), dist = (q, c) => Math.max(Math.abs(q[1] - c[0]), Math.abs(q[2] - c[1]), Math.abs(q[3] - c[2]));
      const pre = ENV3D[tb.pre].fog.color, deep = ENV3D.coastAqua.fog.color;
      return { seq: seq.join('>'), at, minT: +minT.toFixed(2), n: fogs.length, step: +step.toFixed(3), mouth: +dist(near(-20), col(pre)).toFixed(3), mid: +dist(near(tb.len / 2), col(deep)).toFixed(3), exit: +dist(near(tb.len + 20), col(pre)).toFixed(3), half: +dist(near(tb.ramp / 2), col(pre)).toFixed(2), halfDeep: +dist(near(tb.ramp / 2), col(deep)).toFixed(2), planeAt: fogs.filter(q => q[4]).length, label: (BIOMES[g.bgTo] || {}).label || null };
    };
    out.right = run(1); out.left = run(-1);
    out.env = { ok: !!ENV3D.coastAqua && !!BIOMES.coastAqua && BIOMES.coastAqua.keep === true, fogFar: ENV3D.coastAqua.fog.far, props: ['aquaRib', 'aquaShoal0', 'aquaShoal1', 'aquaShoal2', 'aquaRay', 'aquaKelp', 'aquaCoral', 'aquaBubbles'].every(n => typeof ENV3D.coastAqua.props[n] === 'function'), label: BIOMES.coastAqua.label };
    // the ribs: a half ring of pink-red unlit pieces and dark lines along the vault
    const m = ENV3D.coastAqua.props.aquaRib(); m.glow.computeBoundingBox(); m.lit.computeBoundingBox(); const gb = m.glow.boundingBox; out.rib = { w: +(gb.max.x - gb.min.x).toFixed(1), h: +gb.max.y.toFixed(1), lit: m.lit.attributes.position.count / 3, glow: m.glow.attributes.position.count / 3, lenZ: +(m.lit.boundingBox.max.z - m.lit.boundingBox.min.z).toFixed(1) };
    return out;
  });
  T('the look under the sea comes in GRADUALLY with the depth, never a cut: the game keeps the atmosphere of the coast through the tunnel (' + AQ.right.seq + ': the island in ' + AQ.right.at.coastTown + ' units), and the renderer blends the light and the fog from the coast\'s own at the mouth (distance to it ' + AQ.right.mouth + ') through the middle of the ramp (' + AQ.right.half + ' from the coast and ' + AQ.right.halfDeep + ' from the deep) to the deep teal (' + AQ.right.mid + ') and back out to the coast\'s own at the exit (' + AQ.right.exit + '), the biggest change of the fog colour in 3 frames over ' + AQ.right.n + ' samples being ' + AQ.right.step + '; the coast road beside the tunnel stays the coast (' + AQ.left.seq + ', fog step ' + AQ.left.step + '); no dip back to the city look (lowest blend ' + AQ.right.minT + ')',
    /^coast$|^coast>coastTown$/.test(AQ.right.seq) && AQ.right.mouth < 0.02 && AQ.right.mid < 0.02 && AQ.right.exit < 0.03 && AQ.right.half > 0.05 && AQ.right.halfDeep > 0.05 && AQ.right.step < 0.04 && AQ.right.n > 400 && AQ.right.minT >= 0.9 && AQ.left.seq === 'coast' && AQ.left.step < 0.005 && AQ.env.ok && AQ.env.label === 'AQUARIUM TUNNEL', JSON.stringify(AQ.right));
  // ---- below the level of the sea and of the land: the road of the tunnel dives, runs on the sea bed and comes back up (World.dropAt: only for a runner who took it); under the sea the coast road is not seen and the surface hangs above
  const DV = await pg.evaluate(() => {
    const out = {}; const dip = choice => {
      const w = new World(TRACK); w.extend(30000); const F = w.pieces.find(p => p.type === 'fork' && p.fork.tube); if (choice) F.choice = choice; const d = z => w.dropAt(z) - w.dropAt(F.fe - 100), tb = F.fork.tube; let maxSlope = 0, neg = 0, pos = 0;
      for (let z = F.fe - 200; z < F.fe + tb.len + 200; z += 10) { const sl = (d(z + 10) - d(z)) / 10; maxSlope = Math.max(maxSlope, Math.abs(sl)); if (sl < -1e-6) neg++; if (sl > 1e-6) pos++; }
      return { mouth: +d(F.fe + 1).toFixed(1), mid: +d(F.fe + 3500).toFixed(1), end: +d(F.fe + tb.len - 1).toFixed(1), after: +d(F.fe + tb.len + 200).toFixed(1), merge: +d(F.z1 + 500).toFixed(1), half: +d(F.fe + tb.ramp / 2).toFixed(1), maxSlope: +maxSlope.toFixed(3), neg, pos, gDown: +w.gradeAt(F.fe + 1000).toFixed(3), gUp: +w.gradeAt(F.fe + tb.len - 1000).toFixed(3), gMid: +w.gradeAt(F.fe + 3500).toFixed(3), depth: tb.depth, ramp: tb.ramp };
    };
    out.right = dip('right'); out.left = dip('left'); out.undecided = dip(null);
    const g = __wf, r = g.r; r.renderer.render = () => {}; g.die = () => {};
    const at = (side, u) => { g.start(); g.world.extend(30000); g.world.items = []; const F = g.world.pieces.find(p => p.type === 'fork' && p.fork.tube); g.world.commit(F, side); g.state = 'play'; g.p.z = F.fe + u; g.p.x = side === 'right' ? 2.4 : -2.4; g.p.speed = 300; g.world.extend(g.p.z); g.scene = null; g.fadeIn = 0;
      const a = g.world.playerBand(g.p.z + 30, g.p.x); g.bgTo = BIOMES[a.to].keep ? 'coast' : a.to; g.bgT = a.t; for (let i = 0; i < 4; i++) { g.time += 1 / 60; r.draw(g); }
      const E = r.road.edge; let two = 0; for (let i = 0; i < r.road.N; i++) two += E.two[i] ? 1 : 0;
      const side2 = (n) => r.props[n].filter(o => o.visible), rv = side2('aquaRib'), rx = rv.length ? rv.reduce((a2, o) => a2 + o.position.x, 0) / rv.length : 0, left = ['aquaShoal0', 'aquaShoal1', 'aquaShoal2', 'aquaKelp', 'aquaCoral', 'aquaJelly', 'aquaTurtle', 'aquaBubbles'].reduce((n, k) => n + side2(k).filter(o => o.position.x < rx - 5).length, 0);      // (on the coast side of the road: x less than the ribs' centre line less 5 m)
      const NEED = { aquaJelly: 6.5, aquaTurtle: 5.9, aquaRay: 10.5, aquaWhale: 12.8, aquaKelp: 3.6, aquaCoral: 3.6, aquaBubbles: 9.5, aquaShoal0: 8.9, aquaShoal1: 8.9, aquaShoal2: 8.9 }; let life = 0, air = 0, big = 0, minGap = 99;
      for (const n in NEED) for (const o of r.props[n].filter(q => q.visible)) { life++; if (/Shoal|Ray|Whale/.test(n)) big++; const z = g.p.z - o.position.z * 10, depth = g.world.seaDepth(z) * 0.1; minGap = Math.min(minGap, depth - NEED[n]); if (depth < NEED[n] - 0.7) air++; }      // (a creature drifts up to 0.45 m and 2.2 m along the road: 0.7 m of margin)
      return { life, air, big, minGap: +minGap.toFixed(1), sea: r.seaTop.visible, seaY: +r.seaTop.position.y.toFixed(1), hide: r.road.hide, two, ribs: r.propUsed.aquaRib, left, dropped: r.dropped, d0: +(g.world.dropAt(g.p.z) - g.world.dropAt(F.fe - 100)).toFixed(0), to: g.bgTo };
    };
    const col = r.seaTop.geometry.attributes.color, pos = r.seaTop.geometry.attributes.position, tb0 = TRACK.forks.gateIslandSunset.tube, rows = col.count / 2 - 1; let r2 = -1, r5 = -1, wet0 = 0, wetEnd = 0;
    for (let k = 0; k <= rows; k++) { const d = World.dipAt(tb0, k * tb0.len / rows) * 0.1; if (r2 < 0 && d >= 2) r2 = k; if (r5 < 0 && d >= 5) r5 = k; }
    out.alpha = { mouth: +col.getW(0).toFixed(3), below2: +col.getW(Math.max(0, r2 - 1) * 2).toFixed(3), at5: +col.getW(r5 * 2).toFixed(3), mid: +col.getW(Math.floor(rows / 2) * 2).toFixed(3), exit: +col.getW(rows * 2).toFixed(3), len: +(Math.abs(pos.getY(0) - pos.getY(pos.count - 1)) / 0.1).toFixed(0), tubeLen: tb0.len, rows };
    out.k = { k25: World.seaK(25), k100: World.seaK(100), k60: +World.seaK(60).toFixed(2) };
    out.deep = at('right', 3500); out.ramp = at('right', 1500); out.shallow = at('right', 150); out.rise = at('right', 7500); out.island = at('right', 10600); out.coastRoad = at('left', 3500);
    return out;
  });
  const dvOk = D => D.mouth === 0 && D.mid === D.depth && D.end === 0 && D.after === 0 && D.merge === 0;
  T('below the level of the sea and of the land: for a runner who took the tunnel the road dives ' + DV.right.depth / 10 + ' m over ' + DV.right.ramp / 10 + ' m from the mouth (0 at the mouth, ' + DV.right.half + ' units at half the ramp, ' + DV.right.mid + ' on the sea bed), comes back up over the last ' + DV.right.ramp / 10 + ' m and is level again on the island (' + DV.right.after + ', ' + DV.right.merge + ' after the merge); the slope stays gentle (max ' + DV.right.maxSlope + ', down ' + DV.right.gDown + ', flat ' + DV.right.gMid + ', up ' + DV.right.gUp + ' per unit of run); the coast road (left) and a junction not yet chosen do not move at all (' + DV.left.mid + ' / ' + DV.undecided.mid + ')',
    dvOk(DV.right) && DV.right.depth === 130 && DV.right.ramp === 3000 && DV.right.half > 40 && DV.right.half < 90 && DV.right.maxSlope > 0.05 && DV.right.maxSlope < 0.12 && DV.right.neg > 100 && DV.right.pos > 100 && DV.right.gDown > 0.05 && DV.right.gUp < -0.05 && DV.right.gMid === 0 && ['mouth', 'mid', 'end', 'after', 'merge'].every(k => DV.left[k] === 0 && DV.undecided[k] === 0 && DV.left.maxSlope === 0), JSON.stringify([DV.right, DV.left]));
  T('THE SEA IS ABOVE: the sea life (fish, jellyfish, turtles, the manta and the whale shark, kelp, coral, bubbles) is only drawn where the sea is deep enough over the road to hold it, never floating in the air: ' + DV.deep.life + ' in the deep (' + DV.deep.air + ' too high), ' + DV.ramp.life + ' on the way down at ' + DV.ramp.d0 / 10 + ' m deep (' + DV.ramp.air + ' too high: the ones ahead stand where it is deeper), ' + DV.shallow.life + ' near the mouth (' + DV.shallow.air + '), ' + DV.rise.life + ' on the way up (' + DV.rise.air + '), none on the island (' + DV.island.life + ') and none beside the coast road for a runner who did not take the tunnel (' + DV.coastRoad.life + '): only the ribs of the tunnel stand there',
    DV.deep.life >= 10 && DV.deep.big >= 3 && [DV.deep, DV.ramp, DV.shallow, DV.rise, DV.island].every(x => x.air === 0) && DV.island.life === 0 && DV.coastRoad.life === 0 && DV.coastRoad.ribs >= 8 && DV.ramp.life > 0, JSON.stringify([DV.deep.life, DV.deep.air, DV.ramp.minGap, DV.shallow.minGap, DV.rise.minGap, DV.coastRoad.life]));
  T('the entrance of the tunnel and its surroundings stay DRY: the surface of the sea is one plane over the tunnel (' + DV.alpha.len + ' units long, ' + DV.alpha.rows + ' rows) whose alpha follows the depth of the road under it: ' + DV.alpha.mouth + ' at the mouth, ' + DV.alpha.below2 + ' down to 2 m deep, ' + DV.alpha.at5 + ' from 5 m, ' + DV.alpha.mid + ' in the middle, ' + DV.alpha.exit + ' at the exit; the look of the sea (light, fog, colours of the road) is ' + DV.k.k25 + ' at 2.5 m, ' + DV.k.k60 + ' at 6 m and ' + DV.k.k100 + ' at 10 m, and no plant or animal stands where the water has not come in (kelp and coral need 3.6 m)',
    DV.alpha.mouth === 0 && DV.alpha.below2 < 0.01 && DV.alpha.at5 > 0.99 && DV.alpha.mid === 1 && DV.alpha.exit === 0 && DV.alpha.len === DV.alpha.tubeLen && DV.k.k25 === 0 && DV.k.k100 === 1 && DV.k.k60 > 0.2 && DV.k.k60 < 0.8, JSON.stringify(DV.alpha));
  T('the surface of the sea is a plane at the sea\'s own height over the whole tunnel, from mouth to mouth, so the road, the plants and the fish are plainly under the water: ' + DV.shallow.seaY + ' m at the mouth (shown: ' + DV.shallow.sea + '), ' + DV.ramp.seaY + ' m half way down (' + DV.ramp.sea + '), ' + DV.deep.seaY + ' m in the deep (' + DV.deep.d0 + ' units down), ' + DV.rise.seaY + ' m on the way up, gone on the island (' + DV.island.sea + '); the coast road beside the tunnel is hidden once the runner is 3.5 m deep (hide at the mouth ' + DV.shallow.hide + ', half way ' + DV.ramp.hide + ', deep ' + DV.deep.hide + ': ' + DV.deep.two + ' two-road sections in the deep, ' + DV.shallow.two + ' at the mouth), with ' + DV.deep.left + ' plants and creatures on the coast side as well and ' + DV.deep.ribs + ' ribs; on the island two roads again (' + DV.island.two + ') and a runner on the coast road sees the tunnel as it was (no surface: ' + DV.coastRoad.sea + ', hide ' + DV.coastRoad.hide + ')',
    DV.shallow.sea && DV.shallow.seaY < 0.3 && DV.shallow.hide === 0 && DV.shallow.two > 0 && DV.ramp.sea && Math.abs(DV.ramp.seaY - 6.5) < 1 && DV.ramp.hide === -1 && DV.deep.sea && DV.deep.hide === -1 && DV.deep.two === 0 && Math.abs(DV.deep.seaY - 13) < 0.2 && DV.deep.ribs >= 8 && DV.deep.left >= 3 && DV.deep.dropped === 0 && DV.rise.sea && DV.rise.hide === -1 && !DV.island.sea && DV.island.hide === 0 && DV.island.two > 0 && !DV.coastRoad.sea && DV.coastRoad.hide === 0 && DV.coastRoad.two > 0, JSON.stringify([DV.shallow, DV.ramp, DV.deep, DV.rise, DV.island, DV.coastRoad]));
  T('the aquarium environment is complete: a deep teal fog that swallows the distance (far ' + AQ.env.fogFar + ' m), its props (rib, three shoals, manta ray, kelp, coral, bubbles); a rib is a half ring ' + AQ.rib.w + ' m wide and ' + AQ.rib.h + ' m high of ' + AQ.rib.glow + ' pink-red unlit pieces, with the dark lines of the vault (' + AQ.rib.lit + ' triangles, ' + AQ.rib.lenZ + ' m along the road)',
    AQ.env.fogFar <= 120 && AQ.env.props && AQ.rib.w >= 13 && AQ.rib.w <= 15.5 && AQ.rib.h >= 6.5 && AQ.rib.glow >= 200 && AQ.rib.lit > 100 && AQ.rib.lenZ >= 11.5, JSON.stringify(AQ.rib));

  // ================================================================ 2. the sunburst parasols: the user's picture on a cone, as the coast's giant parasols
  const PA = await pg.evaluate(async () => {
    const out = {}; const mat = ParasolArt.material(); for (let i = 0; i < 80 && !mat.visible; i++) await new Promise(q => setTimeout(q, 100)); const img = mat.map.image;
    out.loaded = mat.visible && img.naturalWidth === PARASOL_ASSETS.w && img.naturalHeight === PARASOL_ASSETS.h; out.dims = [PARASOL_ASSETS.w, PARASOL_ASSETS.h];
    const cv = document.createElement('canvas'); cv.width = img.naturalWidth; cv.height = img.naturalHeight; const x = cv.getContext('2d'); x.drawImage(img, 0, 0); const d = x.getImageData(0, 0, cv.width, cv.height).data; let red = 0, cream = 0, other = 0;
    for (let i = 0; i < d.length; i += 4) { const R = d[i], G = d[i + 1], B = d[i + 2]; if (R > 225 && G < 45 && B < 45) red++; else if (R > 225 && G > 165 && G < 215 && B > 90 && B < 145) cream++; else other++; }
    out.share = { red: +(red / (d.length / 4)).toFixed(2), cream: +(cream / (d.length / 4)).toFixed(2), other: +(other / (d.length / 4)).toFixed(2) };
    const g = ParasolArt.canopy(3.4, 1.3, 3.5), P = g.attributes.position, U = g.attributes.uv; let apex = null, rim = [];
    for (let i = 0; i < P.count; i++) { const y = P.getY(i); if (y > 4.79) apex = [U.getX(i), U.getY(i)]; else if (y < 3.51) rim.push(Math.hypot(U.getX(i) - 0.5, U.getY(i) - 0.5) / Math.hypot(P.getX(i), P.getZ(i)) * 3.4); }
    out.apex = apex; out.rimR = [Math.min(...rim), Math.max(...rim)].map(v => +v.toFixed(3)); out.size = [+(g.boundingBox.max.y - g.boundingBox.min.y).toFixed(2), +g.boundingBox.max.y.toFixed(2), +(g.boundingBox.max.x - g.boundingBox.min.x).toFixed(2)];
    const m = ENV3D.coast.props.coastParasol(); out.prop = { hasPole: !!m.merged.lit, sprite: !!m.sprite, material: m.material() === mat };
    // where they stand: the land side of the coast, now and then, never taking the place of a club or of Club Delphi
    const w = new World(TRACK); w.extend(30000); const Pc = w.pieces.find(p => /^coast(Sunset|Midday|BlueHour|Morning)$/.test(p.id)); let n = 0, land = true, clash = 0;
    for (let i = Math.ceil(Pc.z0 * 0.1 / 12); i < Pc.z1 * 0.1 / 12; i++) { const L = ENV3D.coast.layout(i, rnd), has = L.filter(q => q.prop === 'coastParasol'); if (has.length) { n++; if (!has.every(q => q.x > 0)) land = false; if (L.some(q => q.prop === 'coastClub' || q.prop === 'coastDelphi')) clash++; } }
    out.slots = { n, land, clash };
    const g2 = H.at(H.slot(Pc, 'coastParasol', 'coast') * 120 - 400); H.draw(4); out.used = g2.r.propUsed.coastParasol; const o = g2.r.props.coastParasol.find(q => q.visible); out.kids = o ? o.children.length : 0; out.dropped = g2.r.dropped;
    return out;
  });
  T('the giant parasols wear your red and cream sunburst, as it is (' + PA.dims.join(' x ') + ', ' + Math.round(PA.share.red * 100) + ' % red, ' + Math.round(PA.share.cream * 100) + ' % cream, ' + Math.round(PA.share.other * 100) + ' % other: the soft edges between the rays): loaded; wound on a cone seen from above (the apex at the centre of the rays: uv ' + (PA.apex || []).map(v => +v.toFixed(2)).join(',') + '; the rim on the picture\'s circle: radius ' + PA.rimR.join('..') + '), a ' + PA.size[2] + ' m canopy whose top is at ' + PA.size[1] + ' m',
    PA.loaded && PA.dims[0] === 512 && PA.dims[1] === 512 && PA.share.red > 0.3 && PA.share.cream > 0.3 && PA.share.other < 0.12 && PA.apex && Math.abs(PA.apex[0] - 0.5) < 0.01 && Math.abs(PA.apex[1] - 0.5) < 0.01 && PA.rimR[0] > 0.499 && PA.rimR[1] < 0.501 && PA.size[2] === 6.8 && PA.size[1] === 4.8 && PA.prop.hasPole && PA.prop.sprite && PA.prop.material, JSON.stringify([PA.share, PA.apex, PA.rimR, PA.size]));
  T('they stand on the land side of the coast every 13th slot (' + PA.slots.n + ' in the 420 m coastal piece), never in the place of a club (' + PA.slots.clash + '), and are drawn (' + PA.used + ' in view, ' + PA.kids + ' meshes: pole and canopy, nothing dropped)',
    PA.slots.n >= 2 && PA.slots.land && PA.slots.clash === 0 && PA.used >= 1 && PA.kids === 2 && PA.dropped === 0, JSON.stringify(PA.slots));

  // ================================================================ 3. the town: towers, roundabouts, the landing pad; the pools
  const TW = await pg.evaluate(() => {
    const out = {}; const w = new World(TRACK); w.extend(30000); const Pt = H.isle(w); out.id = Pt.id;
    const kinds = new Set(), count = { tower: 0, round: 0, pad: 0, club: 0 }; let seaSame = 0, seaN = 0, landOk = true, landEmpty = 0;
    for (let i = Math.ceil(Pt.z0 * 0.1 / 12); i < Pt.z1 * 0.1 / 12; i++) {
      const L = ENV3D.coastTown.layout(i, rnd), land = L.filter(q => q.x > 0), sea = JSON.stringify(L.filter(q => q.x < 0 && q.prop !== 'coastCanal')), cs = JSON.stringify(ENV3D.coast.layout(i, rnd).filter(q => q.x < 0)); seaN++; if (sea === cs) seaSame++;
      for (const q of land) { if (/^coastTower/.test(q.prop)) { count.tower++; kinds.add(q.prop); } else if (q.prop === 'coastRound') count.round++; else if (q.prop === 'coastClub' || q.prop === 'coastDelphi') count.club++; else if (q.prop === 'coastPad') count.pad++; }
      if (!land.length) landEmpty++; if (L.some(q => q.x < 0 && /^coastTower|coastRound|coastPad/.test(q.prop))) landOk = false;
    }
    const kk = new Set(); for (let i = 0; i < 300; i++) for (const q of ENV3D.coastTown.layout(i, rnd)) if (/^coastTower/.test(q.prop)) kk.add(q.prop);
    out.beat = true; for (let s0 = 0; s0 < 12; s0++) { const has = new Set(); for (let i = s0; i < s0 + 17; i++) for (const q of ENV3D.coastTown.layout(i, rnd)) has.add(q.prop); if (!['coastDelphi', 'coastClub', 'coastRound', 'coastPad', 'coastPark', 'coastCourt', 'coastPlay'].every(n => has.has(n))) out.beat = false; }   // every 17 slots (the island is 15 to 18) hold one of each
    out.canal = ENV3D.coastTown.layout(5, rnd).filter(q => q.prop === 'coastCanal').map(q => q.x).join(); out.sea17 = ENV3D.coastTown.layout(5, rnd).filter(q => q.prop === 'seaStrip').map(q => q.x).sort((a, b) => a - b).join(); out.innerOk = ENV3D.coastTown.innerOk.has('coastCanal');
    out.count = count; out.kinds = [...kk].sort().join(); out.seaSame = [seaSame, seaN]; out.landOk = landOk; out.landEmpty = landEmpty;
    // the towers: height, width, glow only where there is a neon strip
    out.towers = [0, 1, 2, 3].map(k => { const m = ENV3D.coastTown.props['coastTower' + k](); m.lit.computeBoundingBox(); const bb = m.lit.boundingBox; return { h: +bb.max.y.toFixed(1), w: +(bb.max.z - bb.min.z).toFixed(1), face: +bb.min.x.toFixed(2), glow: !!m.glow, tris: m.lit.attributes.position.count / 3 }; });
    const rd = ENV3D.coastTown.props.coastRound(); rd.sprite.computeBoundingBox(); out.round = { patches: rd.sprite.userData.patches, minY: +rd.sprite.boundingBox.min.y.toFixed(2), r: +Math.max(rd.sprite.boundingBox.max.x, rd.sprite.boundingBox.max.z).toFixed(1), flowers: rd.material() === FlowerArt.material(), merged: !!rd.merged.lit };
    const pd = ENV3D.coastTown.props.coastPad(); pd.lit.computeBoundingBox(); out.pad = { w: +(pd.lit.boundingBox.max.x - pd.lit.boundingBox.min.x).toFixed(1), h: +pd.lit.boundingBox.max.y.toFixed(2), glow: !!pd.glow };
    // drawn in the four lights, seen from many places along the piece: the pools are never short
    out.runs = {}; let worst = 0, drops = 0, towers = 0;
    for (const id of ['islandSunset', 'islandMidday', 'islandBlue', 'islandMorning']) {
      let g = H.at(0); const Q = H.isle(g.world, id); if (!Q) { out.runs[id] = 'missing'; continue; }
      let used = 0; for (let k = 0; k < 14; k++) { g.p.z = Q.z0 + 100 + k * 130; g.world.extend(g.p.z); const a = g.world.playerBand(g.p.z + 300, 0); g.bgTo = a.to; g.bgT = a.t; H.draw(2); used = Math.max(used, g.r.propUsed.coastTower0 + g.r.propUsed.coastTower1 + g.r.propUsed.coastTower2 + g.r.propUsed.coastTower3); worst = Math.max(worst, ...['coastTower0', 'coastTower1', 'coastTower2', 'coastTower3', 'coastRound', 'coastPad', 'coastParasol'].map(n => g.r.propUsed[n] / g.r.props[n].length)); }
      drops += g.r.dropped; towers = Math.max(towers, used); out.runs[id] = used;
    }
    out.pool = { worst: +worst.toFixed(2), drops, towers };
    return out;
  });
  T('the island\'s land side is a row of painted towers (' + TW.count.tower + ', all four kinds in its layout: ' + TW.kinds + '), a flower roundabout (' + TW.count.round + '), Club Delphi and the Strawberry Beach Club (' + TW.count.club + ') and a landing pad (' + TW.count.pad + '), on a beat of twelve slots so that every 17 slots hold one of each and the green spaces (' + TW.beat + '); the sea side is the coast\'s own (' + TW.seaSame.join(' of ') + ' slots identical): nothing of the island on the sea side',
    TW.count.tower >= 5 && TW.kinds === 'coastTower0,coastTower1,coastTower2,coastTower3' && TW.count.round >= 1 && TW.count.pad >= 1 && TW.count.club >= 2 && TW.beat && TW.seaSame[0] === TW.seaSame[1] && TW.landOk, JSON.stringify(TW.count));
  T('an island is water all round: the sea comes back behind the towers (a sea strip at ' + TW.sea17 + ' m on every slot, at the coast\'s own place on the other side) and a narrow canal of the same sea runs in the gap towards the coast road (at ' + TW.canal + ' m, allowed on the inner side of a junction: ' + TW.innerOk + ')', /17/.test(TW.sea17) && /-8.4/.test(TW.sea17) && TW.canal === '-6.9' && TW.innerOk, TW.sea17 + ' ' + TW.canal);
  T('the towers are tall and painted: heights ' + TW.towers.map(t => t.h).join(' / ') + ' m, widths ' + TW.towers.map(t => t.w).join(' / ') + ' m, facades at the building line (x ' + TW.towers[0].face + '), neon strips (unlit parts) on all but the yellow one (' + TW.towers.map(t => t.glow).join(', ') + '); the roundabout wears your flowers (' + TW.round.patches + ' patches on the soil, radius ' + TW.round.r + ' m); the pad is a ' + TW.pad.w + ' m turquoise disc with a neon ring',
    TW.towers[0].h >= 22 && TW.towers[2].h >= 27 && TW.towers[3].h >= 15 && TW.towers.every(t => t.face <= -0.1 && t.face > -0.5 && t.tris > 100) && TW.towers.map(t => t.glow).join() === 'false,true,true,true' && TW.round.patches >= 15 && TW.round.minY >= 0.3 && TW.round.flowers && TW.round.merged && TW.pad.w >= 7 && TW.pad.glow, JSON.stringify(TW.towers));
  T('drawn from fourteen places along each of the four islands the pools are never short: at most ' + TW.pool.towers + ' towers in view (' + Object.entries(TW.runs).map(e => e[0].replace('island', '') + ' ' + e[1]).join(', ') + '), at most ' + Math.round(TW.pool.worst * 100) + ' % of a pool used, nothing dropped (' + TW.pool.drops + ')', TW.pool.drops === 0 && TW.pool.worst <= 0.95 && TW.pool.towers >= 3 && Object.values(TW.runs).every(v => typeof v === 'number' && v >= 6), JSON.stringify(TW.runs));

  // ================================================================ 3b. the long buildings are separate from the chalets: the cottages only on the beach (the coast, on both roads), the towers and the clubs only on the island
  const SEP = await pg.evaluate(() => {
    const w = new World(TRACK); w.extend(30000); const Pc = w.pieces.find(p => /^coast(Sunset|Midday|BlueHour|Morning)$/.test(p.id)), Pt = H.isle(w), F = Pt.F, cnt = (z0, z1, env) => {
      const c = { cottage: 0, tower: 0, club: 0, other: 0 }; for (let i = Math.ceil(z0 * 0.1 / 12); i < z1 * 0.1 / 12; i++) for (const q of ENV3D[env].layout(i, rnd)) { if (q.x < 0) continue; if (/^cottage/.test(q.prop)) c.cottage++; else if (/^coastTower/.test(q.prop)) c.tower++; else if (q.prop === 'coastClub' || q.prop === 'coastDelphi') c.club++; else c.other++; } return c; };
    const walk = TRACK.segments[F.fork.left.route].biome;
    return { beach: cnt(Pc.z0, Pc.z1, 'coast'), walk: cnt(F.fe, F.be, walk), island: cnt(Pt.z0, Pt.z1, TRACK.segments[Pt.id].biome), walkBiome: walk, islandBiome: TRACK.segments[Pt.id].biome, long: Pt.z1 - Pt.z0 };
  });
  T('the long buildings are separate from the chalets: on the beach (the coastal piece) the cottages stand (' + SEP.beach.cottage + ') and neither a tower nor a club does (' + SEP.beach.tower + ' / ' + SEP.beach.club + '); the coast road that goes on beside the island (' + SEP.walkBiome + ') is the same (' + SEP.walk.cottage + ' cottages, ' + SEP.walk.tower + ' / ' + SEP.walk.club + '); on the island (' + SEP.islandBiome + ', ' + SEP.long / 10 + ' m) the towers and the two clubs stand (' + SEP.island.tower + ' / ' + SEP.island.club + ') and not one cottage (' + SEP.island.cottage + ')',
    SEP.beach.cottage >= 4 && SEP.beach.tower === 0 && SEP.beach.club === 0 && SEP.walk.cottage >= 4 && SEP.walk.tower === 0 && SEP.walk.club === 0 && SEP.island.tower >= 5 && SEP.island.club >= 2 && SEP.island.cottage === 0 && SEP.long >= 2900, JSON.stringify(SEP));

  // ================================================================ 3c. the everyday life of the coast (a standing rule): a bike lane along the road, green spaces, a sports court and a youth playground, on the beach and in the town
  const LF = await pg.evaluate(() => {
    const w = new World(TRACK); w.extend(30000); const Pc = w.pieces.find(p => /^coast(Sunset|Midday|BlueHour|Morning)$/.test(p.id)), Pt = H.isle(w), out = {};
    const count = (P, env) => { const c = { slots: 0, bike: 0, park: 0, court: 0, play: 0, trees: 0, sea: 0 }; for (let i = Math.ceil(P.z0 * 0.1 / 12); i < P.z1 * 0.1 / 12; i++) { const L = ENV3D[env].layout(i, rnd), land = L.filter(q => q.x > 0); c.slots++; if (land.some(q => q.prop === 'coastBike' && q.x > 3.5 && q.x < 4)) c.bike++; if (land.some(q => q.prop === 'coastPark')) c.park++; if (land.some(q => q.prop === 'coastCourt')) c.court++; if (land.some(q => q.prop === 'coastPlay')) c.play++; c.trees += land.filter(q => q.prop === 'tree').length; if (L.some(q => q.x < 0 && /^coast(Bike|Park|Court|Play)/.test(q.prop))) c.sea++; } return c; };
    out.beach = count(Pc, 'coast'); out.town = count(Pt, 'coastTown');
    const size = n => { const m = ENV3D.coast.props[n](); const g = m.lit; g.computeBoundingBox(); const bb = g.boundingBox; return [+(bb.max.x - bb.min.x).toFixed(1), +bb.max.y.toFixed(1), +(bb.max.z - bb.min.z).toFixed(1), !!m.glow]; };
    out.sizes = { bike: size('coastBike'), park: size('coastPark'), court: size('coastCourt'), play: size('coastPlay') };
    out.treeShared = ENV3D.coast.props.tree === ENV3D.city.props.tree;
    // drawn from many places along both pieces: each is in view somewhere, the pools hold, nothing dropped
    const used = { coastBike: 0, coastPark: 0, coastCourt: 0, coastPlay: 0, tree: 0 }; let drops = 0;
    for (const P of [Pc, Pt]) { const g = H.at(0), st = (P.z1 - P.z0 - 300) / 14; for (let k = 0; k < 14; k++) { g.p.z = P.z0 + 100 + k * st; g.world.extend(g.p.z); const a = g.world.playerBand(g.p.z + 300, 0); g.bgTo = a.to; g.bgT = a.t; H.draw(2); for (const n in used) used[n] = Math.max(used[n], g.r.propUsed[n]); drops += g.r.dropped; } }
    out.used = used; out.drops = drops;
    return out;
  });
  T('the coast always has its everyday life: the bike lane runs along the road on every slot of the beach (' + LF.beach.bike + ' of ' + LF.beach.slots + ') and of the town (' + LF.town.bike + ' of ' + LF.town.slots + '), a ' + LF.sizes.bike[0] + ' m terracotta strip with white dashes and a bicycle sign, never on the sea side (' + (LF.beach.sea + LF.town.sea) + ')',
    LF.beach.bike === LF.beach.slots && LF.town.bike === LF.town.slots && LF.sizes.bike[0] === 1.2 && LF.sizes.bike[2] >= 12 && LF.beach.sea === 0 && LF.town.sea === 0, JSON.stringify([LF.beach, LF.town]));
  T('green spaces, a sports ground and a youth playground, on the beach (' + LF.beach.park + ' lawns, ' + LF.beach.court + ' courts, ' + LF.beach.play + ' playgrounds) and in the town (' + LF.town.park + ' / ' + LF.town.court + ' / ' + LF.town.play + '): a lawn with a path, bushes and a bench (' + LF.sizes.park.join(' x ') + ' m) with two of the user\'s trees each (' + LF.beach.trees + ' + ' + LF.town.trees + '), a green pitch with lines, goals and a basketball hoop (' + LF.sizes.court.join(' x ') + ' m), a playground with swings and a slide (' + LF.sizes.play.join(' x ') + ' m)',
    LF.beach.park >= 2 && LF.beach.court >= 1 && LF.beach.play >= 1 && LF.town.park >= 1 && LF.town.court >= 1 && LF.town.play >= 1 && LF.beach.trees === 2 * LF.beach.park && LF.town.trees === 2 * LF.town.park && LF.treeShared && LF.sizes.park[0] >= 8 && LF.sizes.park[2] >= 10 && LF.sizes.court[0] >= 8 && LF.sizes.court[1] >= 3 && LF.sizes.court[2] >= 10 && LF.sizes.play[0] >= 8 && LF.sizes.play[1] >= 2.5, JSON.stringify(LF.sizes));
  T('they are all drawn (in view somewhere along the two pieces: ' + Object.entries(LF.used).map(e => e[0].replace('coast', '') + ' ' + e[1]).join(', ') + ') and no pool is short (' + LF.drops + ' dropped)', LF.used.coastBike >= 8 && LF.used.coastPark >= 1 && LF.used.coastCourt >= 1 && LF.used.coastPlay >= 1 && LF.used.tree >= 2 && LF.drops === 0, JSON.stringify(LF.used));

  // ================================================================ 4. the saucer: it hovers over its pad and takes off, flying away, when the runner comes near
  const SA = await pg.evaluate(() => {
    const out = {}; let g = H.at(0); const Pt = H.isle(g.world), slot = H.slot(Pt, 'coastPad', Pt.seg.biome, 0, 0), pz = slot * 120 + 60;           // the pad's z in track units
    const at = (ahead, frames) => { g.p.z = pz - ahead * 10; g.world.extend(g.p.z); const a = g.world.playerBand(g.p.z + 300, 0); g.bgTo = a.to; g.bgT = a.t; H.draw(frames); const S = g.r.saucers, v = S.pool.filter(o => o.visible), pad = g.r.padsNow[0], st = pad && S.state.get(pad.id);
      return { vis: v.length, pad: !!pad, padId: pad && pad.id, lift: st ? +st.lift.toFixed(3) : null, rel: v[0] && pad ? [+(v[0].position.x - pad.x).toFixed(1), +(v[0].position.y - pad.y).toFixed(1), +(v[0].position.z - pad.z).toFixed(1)] : null, tilt: v[0] ? +v[0].rotation.z.toFixed(2) : null, scale: v[0] ? +v[0].scale.x.toFixed(2) : null }; };
    out.far = at(110, 6); out.hover = at(85, 30); out.near = at(60, 2); out.rising = at(55, 60); out.gone = at(40, 200); out.back = at(110, 6); out.passed = at(-8, 6); out.slot = slot;
    // another pad far from this one: its own saucer, still hovering
    out.pads = [g.r.saucers.pool.length, g.r.saucers.state.size];
    return out;
  });
  T('a flying saucer hovers over each landing pad in view: ' + SA.hover.vis + ' saucer ' + SA.hover.rel[1] + ' m above its pad (a slow bob), not lifted yet (' + SA.far.lift + ' at 110 m, ' + SA.hover.lift + ' at 85 m: it waits until the runner is within 75 m)',
    SA.far.pad && SA.far.vis === 1 && SA.far.lift === 0 && SA.hover.lift === 0 && SA.hover.vis === 1 && Math.abs(SA.hover.rel[1] - 2.3) < 0.25 && Math.abs(SA.hover.rel[0]) < 0.1 && Math.abs(SA.hover.rel[2]) < 0.1 && SA.hover.scale === 1, JSON.stringify([SA.far, SA.hover]));
  T('when the runner is within 75 m it takes off (lift ' + SA.near.lift + ' then ' + SA.rising.lift + '), tilts and flies away up, ahead and out over the sea (' + SA.rising.rel.join(', ') + ' m from its pad, tilt ' + SA.rising.tilt + ', smaller), is gone for good after 2.6 s (lift ' + SA.gone.lift + ': ' + SA.gone.rel.join(', ') + ' m), and does not come back when the runner is far again (' + SA.back.lift + ')',
    SA.near.lift > 0 && SA.rising.lift > 0.2 && SA.rising.lift < 1 && SA.rising.rel[1] > 6 && SA.rising.rel[2] < -8 && SA.rising.tilt > 0.05 && SA.rising.scale < 1 && SA.gone.lift === 1 && SA.gone.rel[1] > 30 && SA.gone.rel[2] < -60 && SA.gone.rel[0] < -15 && SA.back.lift === 1 && SA.back.rel[1] > 30 && SA.passed.lift === 1, JSON.stringify([SA.near, SA.rising, SA.gone, SA.back]));
  T('the saucers are a pool of ' + SA.pads[0] + ', one small state per pad (' + SA.pads[1] + ')', SA.pads[0] === 3 && SA.pads[1] >= 1 && SA.pads[1] <= 12, JSON.stringify(SA.pads));

  // ---- the four PLACES of the user's photos that fill the empty lots of the island (src3d/island_places.js, island_art.js, island_assets.js made by tools/make_island_assets.py)
  const PL = await pg.evaluate(async () => {
    const NAMES = ['coastFruit', 'coastCafe', 'coastPool', 'coastCove'], CELL = { coastFruit: 'fruit', coastCafe: 'cafe', coastPool: 'pool', coastCove: 'cove' }, out = {};
    // the photos: one atlas, four cells, each with its own proportions, and the picture really decodes
    const img = new Image(); await new Promise(r => { img.onload = r; img.onerror = r; img.src = ISLAND_ASSETS.src; });
    const cv = document.createElement('canvas'); cv.width = img.naturalWidth; cv.height = img.naturalHeight; const cx = cv.getContext('2d'); cx.drawImage(img, 0, 0); out.atlas = { w: img.naturalWidth, h: img.naturalHeight, ar: {}, mean: {}, frac: {}, gone: { pool: !!ISLAND_ASSETS.pool, cove: !!ISLAND_ASSETS.cove } };
    for (const n of ['coastFruit', 'coastCafe']) { const c = ISLAND_ASSETS[CELL[n]]; out.atlas.ar[CELL[n]] = +c.ar.toFixed(3); const x0 = Math.round(c.u0 * cv.width) + 8, x1 = Math.round(c.u1 * cv.width) - 8, d = cx.getImageData(x0, 8, x1 - x0, cv.height - 16).data; let r = 0, g = 0, b = 0, k = 0; for (let i = 0; i < d.length; i += 40) { r += d[i]; g += d[i + 1]; b += d[i + 2]; k++; } out.atlas.mean[CELL[n]] = [Math.round(r / k), Math.round(g / k), Math.round(b / k)]; let red = 0, tq = 0, rock = 0; for (let i = 0; i < d.length; i += 40) { const R = d[i], G = d[i + 1], B = d[i + 2]; if (R > 150 && G < 100 && B < 100) red++; if (R > 90 && G < 120 && R > G + 25 && R > B + 35) rock++; if (G > R + 30 && B > R + 20) tq++; } out.atlas.frac[CELL[n]] = { red: +(red / k).toFixed(3), rock: +(rock / k).toFixed(3), tq: +(tq / k).toFixed(3) }; }
    // the layout: two lots per beat of 14, the four places in turn, only on the island
    out.lay = {}; for (const id of ['coastTown', 'coastTownNoon', 'coastTownBlue', 'coastTownMorning']) {
      const E = ENV3D[id], seq = []; let towers = 0; for (let i = 140; i < 168; i++) { const L = E.layout(i, rnd); for (const q of L) { if (NAMES.includes(q.prop)) seq.push([i, q.prop, q.x]); if (/^coastTower/.test(q.prop)) towers++; } }
      out.lay[id] = { n: seq.length, kinds: [...new Set(seq.map(q => q[1]))].length, towers, gaps: seq.map((q, k) => k ? q[0] - seq[k - 1][0] : 0).slice(1), x: [...new Set(seq.map(q => q[2]))], have: NAMES.every(n => !!E.props[n]) };
    }
    out.coast = { props: NAMES.filter(n => ENV3D.coast.props[n] || ENV3D.coastNoon.props[n]), slots: 0 }; for (let i = 0; i < 60; i++) for (const q of ENV3D.coast.layout(i, rnd)) if (NAMES.includes(q.prop)) out.coast.slots++;
    // the geometry of each: inside its slot (12 m along the road, 11 m deep), not a giant, the photo in a frame at the far end facing the runner
    out.geo = {}; for (const n of NAMES) {
      const m = ENV3D.coastTown.props[n](), boxes = []; let tris = 0; for (const k of ['lit', 'glow']) if (m.merged[k]) { m.merged[k].computeBoundingBox(); boxes.push(m.merged[k].boundingBox); tris += m.merged[k].attributes.position.count / 3; }
      const b = boxes.reduce((a, c) => a.union(c), boxes[0].clone());
      if (!m.sprite || m.material() !== IslandArt.material()) { out.geo[n] = { name: n, nophoto: true, extra: (m.sprite ? 1 : 0) + (m.extra || []).length, x: [+b.min.x.toFixed(1), +b.max.x.toFixed(1)], z: [+b.min.z.toFixed(1), +b.max.z.toFixed(1)], h: +b.max.y.toFixed(1), tris }; continue; }
      m.sprite.computeBoundingBox(); const sb = m.sprite.boundingBox, uv = m.sprite.attributes.uv.array, c = ISLAND_ASSETS[CELL[n]];
      out.geo[n] = { name: n, extra: (m.extra || []).length === 1, x: [+b.min.x.toFixed(1), +b.max.x.toFixed(1)], z: [+b.min.z.toFixed(1), +b.max.z.toFixed(1)], h: +b.max.y.toFixed(1), tris, photo: { z: +sb.min.z.toFixed(2), x: +sb.min.x.toFixed(2), dx: +(sb.max.x - sb.min.x).toFixed(3), dz: +(sb.max.z - sb.min.z).toFixed(3), w: +(sb.max.x - sb.min.x).toFixed(2), h: +(sb.max.y - sb.min.y).toFixed(2), ar: +(Math.max(sb.max.x - sb.min.x, sb.max.z - sb.min.z) / (sb.max.y - sb.min.y)).toFixed(3), cellAr: +c.ar.toFixed(3), uvIn: Math.min(...[...uv].filter((_, i) => i % 2 === 0)) >= c.u0 - 1e-4 && Math.max(...[...uv].filter((_, i) => i % 2 === 0)) <= c.u1 + 1e-4 } };
    }
    // drawn in a run on each of the four islands: every place that stands on it is in the pool, visible, with its photo loaded, nothing dropped
    out.run = {}; let drops = 0, worst = 0;
    for (const id of ['islandSunset', 'islandMidday', 'islandBlue', 'islandMorning']) {
      const g = H.at(0), Q = H.isle(g.world, id), hits = {}, env = id === 'islandSunset' ? 'coastTown' : id === 'islandMidday' ? 'coastTownNoon' : id === 'islandBlue' ? 'coastTownBlue' : 'coastTownMorning', seen = {};
      for (let i = Math.ceil(Q.z0 * 0.1 / 12); i < Math.floor(Q.z1 * 0.1 / 12); i++) for (const q of ENV3D[env].layout(i, rnd)) if (NAMES.includes(q.prop)) {
        hits[q.prop] = 1; if (i < Math.ceil(Q.z0 * 0.1 / 12) + 1 || i >= Math.floor(Q.z1 * 0.1 / 12) - 1) continue;      // (the lots at the two ends of the island are only counted)
        g.p.z = i * 120 - 260; g.world.extend(g.p.z); const a = g.world.playerBand(g.p.z + 300, 0); g.bgTo = a.to; g.bgT = a.t; H.draw(3);
        const vis = g.r.props[q.prop].filter(m => m.visible).length; seen[q.prop] = Math.max(seen[q.prop] || 0, vis); drops += g.r.dropped; worst = Math.max(worst, g.r.propUsed[q.prop] / g.r.props[q.prop].length);
      }
      out.run[id] = seen; out.run[id + 'Kinds'] = Object.keys(hits).length;
    }
    for (let k = 0; k < 40 && !(IslandArt._mat && IslandArt._mat.visible); k++) await new Promise(r => setTimeout(r, 100));
    out.run.loaded = !!(IslandArt._mat && IslandArt._mat.visible); out.run.drops = drops; out.run.worst = +worst.toFixed(2);
    return out;
  });
  T('the photos are one atlas (' + PL.atlas.w + ' x ' + PL.atlas.h + ', WebP, decoded) of TWO cells with their own proportions (fruit ' + PL.atlas.ar.fruit + ', cafe ' + PL.atlas.ar.cafe + '): the fruit shop is full of red fruit (' + PL.atlas.frac.fruit.red + '); the pool and the cove photos are gone (' + JSON.stringify(PL.atlas.gone) + ')',
    PL.atlas.w > 800 && PL.atlas.w < 1000 && PL.atlas.h === 640 && Math.abs(PL.atlas.ar.fruit - 0.689) < 0.02 && Math.abs(PL.atlas.ar.cafe - 0.681) < 0.02 && PL.atlas.frac.fruit.red > 0.08 && !PL.atlas.gone.pool && !PL.atlas.gone.cove, JSON.stringify(PL.atlas.frac));
  T('the empty lots of the island hold them: two lots per beat of 14 slots on the island of every light (' + Object.entries(PL.lay).map(e => e[0].replace('coastTown', '') + ' ' + e[1].n).join(', ') + ' in 28 slots), all four kinds in turn (' + Object.values(PL.lay).map(v => v.kinds).join(',') + '), on the land at x ' + PL.lay.coastTown.x.join(', ') + ' m, the towers are all still there (' + PL.lay.coastTown.towers + ' in 28 slots); none on the coast road (' + PL.coast.slots + ' in 60 slots)',
    Object.values(PL.lay).every(v => v.n === 4 && v.kinds === 4 && v.have && v.towers >= 9 && v.x.length === 1 && v.x[0] === 5.4 && v.gaps.every(g => g === 6 || g === 8)) && PL.coast.slots === 0 && PL.coast.props.length === 0, JSON.stringify(PL.lay.coastTown));
  const PG = Object.values(PL.geo), PH = PG.filter(v => !v.nophoto);
  T('each is one slot of the island, in the island\'s low-poly style: ' + PG.map(v => v.name.replace('coast', '') + ' ' + v.x.join('..') + ' x ' + v.z.join('..') + ' m, ' + v.h + ' m high, ' + Math.round(v.tris / 1000) + 'k triangles').join('; ') + '; only the fruit shop and the cafe show a photo (' + PH.map(v => v.name.replace('coast', '')).join(', ') + '): the cafe\'s hangs in a frame at the far end (z ' + PL.geo.coastCafe.photo.z + '), facing the runner, the fruit one is the FRONT of the fruit shop (the wall at x ' + PL.geo.coastFruit.photo.x + ' m, under its name board), each in its own proportions (' + PH.map(v => v.photo.ar + ' / ' + v.photo.cellAr).join(', ') + '), its texture coordinates inside its cell; the pool and the cove have none (' + PG.filter(v => v.nophoto).map(v => v.name.replace('coast', '') + ' with ' + v.extra + ' swirl parasol' + (v.extra > 1 ? 's' : '')).join(', ') + ')',
    PG.length === 4 && PH.length === 2 && PG.every(v => v.x[0] >= -0.6 && v.x[1] <= 11.8 && v.z[0] >= -6.0 && v.z[1] <= 6.0 && v.h > 3 && v.h < 9 && v.tris > 300 && v.tris < 30000) && PH.every(v => (v.name === 'coastFruit' ? v.photo.dx < 0.001 && Math.abs(v.photo.x - 3.98) < 0.01 && v.extra : Math.abs(v.photo.z + 5.45) < 0.01 && v.photo.dz < 0.001) && Math.abs(v.photo.ar - v.photo.cellAr) < 0.02 && v.photo.uvIn) && PL.geo.coastPool.nophoto && PL.geo.coastPool.extra === 2 && PL.geo.coastCove.nophoto && PL.geo.coastCove.extra === 1, JSON.stringify(PL.geo));
  T('drawn along the four islands in a run each place that stands there is in view, in its pool (' + Object.entries(PL.run).filter(e => /^island[A-Za-z]+$/.test(e[0])).map(e => e[0].replace('island', '') + ': ' + PL.run[e[0] + 'Kinds'] + ' kinds, ' + Object.entries(e[1]).map(f => f[0].replace('coast', '') + ' ' + f[1]).join(' ')).join('; ') + '), at most ' + Math.round(PL.run.worst * 100) + ' % of a pool used, nothing dropped (' + PL.run.drops + '), and the photos are on the GPU side loaded (' + PL.run.loaded + ')',
    ['islandSunset', 'islandMidday', 'islandBlue', 'islandMorning'].every(id => PL.run[id + 'Kinds'] >= 3 && Object.keys(PL.run[id]).length >= 2 && Object.values(PL.run[id]).every(v => v >= 1)) && PL.run.drops === 0 && PL.run.worst <= 0.5 && PL.run.loaded, JSON.stringify(PL.run));

  // ---- the island's parasols: the user's nine recoloured swirl pictures (src3d/island_parasol_assets.js made by tools/make_island_parasols.py), none of them all red
  const IP = await pg.evaluate(async () => {
    const out = {}, A = ISLAND_PARASOLS, img = new Image(); await new Promise(r => { img.onload = r; img.onerror = r; img.src = A.src; });
    const cv = document.createElement('canvas'); cv.width = img.naturalWidth; cv.height = img.naturalHeight; const cx = cv.getContext('2d'); cx.drawImage(img, 0, 0);
    out.atlas = [img.naturalWidth, img.naturalHeight, A.n, A.cols, A.cell]; out.red = []; out.cream = [];
    for (let k = 0; k < A.n; k++) { const d = cx.getImageData((k % A.cols) * A.cell, Math.floor(k / A.cols) * A.cell, A.cell, A.cell).data; let r = 0, c = 0, n = 0; for (let i = 0; i < d.length; i += 16) { n++; if (d[i] > 200 && d[i + 1] < 60 && d[i + 2] < 60) r++; if (d[i] > 220 && d[i + 1] > 150 && d[i + 2] > 90 && d[i + 2] < 150) c++; } out.red.push(+(r / n).toFixed(2)); out.cream.push(+(c / n).toFixed(2)); }
    // each canopy's texture coordinates stay inside its own cell
    out.uv = []; for (let k = 0; k < A.n; k++) { const g = ParasolArt.islandCanopy(k, 3.4, 1.3, 3.5), u = g.attributes.uv.array; let ok = true; for (let i = 0; i < u.length; i += 2) { const cu = (k % A.cols + 0) / A.cols, cv2 = 1 - (Math.floor(k / A.cols) + 1) / A.cols; if (u[i] < cu - 1e-6 || u[i] > cu + 1 / A.cols + 1e-6 || u[i + 1] < cv2 - 1e-6 || u[i + 1] > cv2 + 1 / A.cols + 1e-6) ok = false; } out.uv.push(ok); }
    // the layout: the roundabouts of the island of every light wear one of them, never the coast's red and cream sunburst
    out.lay = {}; for (const id of ['coastTown', 'coastTownNoon', 'coastTownBlue', 'coastTownMorning']) { const seq = []; let old = 0; for (let i = 0; i < 14 * 18; i++) for (const q of ENV3D[id].layout(i, rnd)) { if (/^coastParasolI\d$/.test(q.prop)) seq.push(+q.prop.slice(-1)); if (q.prop === 'coastParasol') old++; } out.lay[id] = { n: seq.length, kinds: new Set(seq).size, pin: seq.slice(0, 9).filter(k => k < 4).length, old, runs: seq.every((k, i) => i === 0 || k !== seq[i - 1]), have: Array.from({ length: 9 }, (_, k) => !!ENV3D[id].props['coastParasolI' + k]).every(Boolean) }; }
    out.coast = { old: ENV3D.coast.props.coastParasol ? 1 : 0, island: Object.keys(ENV3D.coast.props).filter(k => /^coastParasolI/.test(k)).length };
    // drawn in a run: the parasol over a roundabout of the island is in view, with its canopy, nothing dropped
    const g = H.at(0), Q = H.isle(g.world, 'islandSunset'); let shown = null;
    for (let i = Math.ceil(Q.z0 * 0.1 / 12) + 1; i < Math.floor(Q.z1 * 0.1 / 12) - 1 && !shown; i++) { const q = ENV3D.coastTown.layout(i, rnd).find(x => /^coastParasolI\d$/.test(x.prop)); if (!q) continue; g.p.z = i * 120 - 300; g.world.extend(g.p.z); const a = g.world.playerBand(g.p.z + 300, 0); g.bgTo = a.to; g.bgT = a.t; H.draw(3); const m = g.r.props[q.prop].find(o => o.visible); if (m) shown = { prop: q.prop, canopy: m.children.some(c => c.material === ParasolArt.islandMaterial()), dropped: g.r.dropped }; }
    out.shown = shown; for (let k = 0; k < 40 && !(ParasolArt._imat && ParasolArt._imat.visible); k++) await new Promise(r => setTimeout(r, 100)); out.loaded = !!(ParasolArt._imat && ParasolArt._imat.visible);
    return out;
  });
  T('the island\'s parasols are your nine swirl pictures in one atlas (' + IP.atlas.join(' x ') + ', all of them in their cell), NONE ALL RED: the share of pure red in each (' + IP.red.join(' ') + ') and the cream of the red pinwheel (' + IP.cream[0] + '), the canopies keep to their cell (' + IP.uv.every(Boolean) + ')',
    IP.atlas[0] === 768 && IP.atlas[1] === 768 && IP.atlas[2] === 9 && IP.red.every(v => v < 0.65) && IP.red.slice(1).every(v => v < 0.05) && IP.cream[0] > 0.25 && IP.uv.every(Boolean), JSON.stringify([IP.red, IP.cream]));
  T('every roundabout of the island has one in turn (' + Object.entries(IP.lay).map(e => e[0].replace('coastTown', '') + ' ' + e[1].n + ' roundabouts, ' + e[1].kinds + ' kinds').join('; ') + ' over 18 beats), never the same twice running, a pinwheel on every second one, the coast\'s red and cream parasol not on the island (' + Object.values(IP.lay).map(v => v.old).join(',') + ') and its props not on the coast (' + IP.coast.island + '); drawn in a run: ' + (IP.shown && IP.shown.prop) + ' with its canopy (' + (IP.shown && IP.shown.canopy) + '), the photos loaded (' + IP.loaded + ')',
    Object.values(IP.lay).every(v => v.n === 18 && v.kinds === 9 && v.have && v.runs && v.pin >= 4 && v.old === 0) && IP.coast.old === 1 && IP.coast.island === 0 && IP.shown && IP.shown.canopy && IP.shown.dropped === 0 && IP.loaded, JSON.stringify(IP.lay.coastTown));
  T('no JS errors (3D)', pg.errs.length === 0, pg.errs.slice(0, 2).join('|')); await pg.context().close();

  // ================================================================ 5. the classic 2D game runs through the island junction, the tunnel and the island included (the coast palettes), nothing 3D-only
  const p2 = await open(base + '2d.html');
  const D2 = await p2.evaluate(() => {
    const g = __wf, out = {}; g.start(); g.world.extend(60000); const F = g.world.pieces.find(p => p.type === 'fork' && p.fork.tube), Pt = { z0: F.fe, z1: F.be }; let draws = 0, err = null; const seen = new Set();
    g.world.items = []; g.state = 'play'; g.p.z = F.z0 - 400; g.p.speed = 340; g.world.extend(g.p.z); g.die = () => {}; g.world.commit(F, 'right'); g.p.x = 2.4;
    try { for (let f = 0; f < 60 * 90 && g.p.z < Pt.z1 + 400; f++) { g.advance(1 / 60); if (f % 4 === 0) { g.draw(); draws++; } seen.add(g.world.playerBand(g.p.z, 0).to); } } catch (e) { err = String(e && e.message); }
    out.err = err; out.draws = draws; out.seen = [...seen].join(); out.palette = !!BIOMES.coastTown && !!BIOMES.coastTownBlue; out.cls = typeof Saucer3D + '/' + typeof ParasolArt; out.z = Math.round(g.p.z - Pt.z0); return out;
  });
  T('the classic 2D game draws the way to the island (' + D2.seen + ', ' + D2.draws + ' frames, ' + D2.z + ' units into it) with the coast\'s palettes: no error, nothing 3D-only (' + D2.cls + ')', !D2.err && D2.palette && D2.draws > 150 && /coastAqua/.test(D2.seen) && /coastTown/.test(D2.seen) && D2.cls === 'undefined/undefined' && p2.errs.length === 0, JSON.stringify(D2));
  await p2.context().close();
  console.log('\n' + res.filter(Boolean).length + '/' + res.length + ' passed');
  await b.close(); srv.close(); process.exit(res.every(Boolean) ? 0 : 1);
})().catch(e => { console.log('TEST ERROR', e.message); process.exit(1); });
