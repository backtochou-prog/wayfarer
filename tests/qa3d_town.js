// WAYFARER regression test: the coastal town, the second half of the beach zone (src/track.js `townSunset` / `townMidday` / `townBlueHour` / `townMorning`, src3d/env_town.js, saucer3d.js), and the giant
// sunburst parasols of the coast (src3d/parasol_art.js, parasol_assets.js made by tools/make_parasol_assets.py from the user's picture). Checks the order of the zone and the lights, the hand-over between the
// coast and the town (no door, no dip in the atmosphere), the user's picture on the parasols, the towers, the roundabouts, the landing pad and the saucer that takes off, the pools, and the 2D game.
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
      slot(P, prop, env, from = 300) { for (let i = Math.ceil((P.z0 + from) * 0.1 / 12); i < (P.z1 - 300) * 0.1 / 12; i++) if (ENV3D[env].layout(i, rnd).some(q => q.prop === prop)) return i; return null; },
    };
  });

  // ================================================================ 1. the beach zone: the coast, then the town in the same light; the hand-over
  const K = await pg.evaluate(() => {
    const C = TRACK.pickSegs.C, D = TRACK.pickSegs.D, out = { seeds: {}, lights: new Set() };
    for (const s of [0, 1, 7, 99, 12345]) {
      const w = new World(TRACK); w.seed = s; w.reset(); w.extend(260000); const P = w.pieces; let n = 0, ok = 0, bad = 0; const before = new Set(), after = new Set();
      for (let i = 1; i + 2 < P.length; i++) if (C.includes(P[i].id)) { n++; const same = D.indexOf(P[i + 1].id) === C.indexOf(P[i].id); if (same) ok++; else bad++; before.add(P[i - 1].id); after.add(P[i + 2].id); out.lights.add(P[i].id + '+' + P[i + 1].id); }
      out.seeds[s] = { n, ok, bad, before: [...before].sort().join(), after: [...after].sort().join() };
    }
    out.lights = [...out.lights].sort().join(' ');
    const w0 = new World(TRACK); w0.extend(45000); const ids = w0.pieces.map(p => p.id || 'fork'), i = ids.findIndex(x => /^coast(Sunset|Midday|BlueHour|Morning)$/.test(x)), Pc = w0.pieces[i], Pt = w0.pieces[i + 1];
    out.order = ids.slice(i - 1, i + 3).join('>'); out.len = [Pc.z1 - Pc.z0, Pt.z1 - Pt.z0]; out.names = [Pc.seg.name, Pt.seg.name]; out.biomes = [Pc.seg.biome, Pt.seg.biome];
    const t = z => w0.bandsAt(z)[0].t; out.t = { coastStart: +t(Pc.z0 + 2).toFixed(2), coastMid: +t(Pc.z0 + 2100).toFixed(2), coastEnd: +t(Pc.z1 - 2).toFixed(2), townStart: +t(Pt.z0 + 2).toFixed(2), townMid: +t(Pt.z0 + 2400).toFixed(2), townEnd: +t(Pt.z1 - 2).toFixed(2) };
    let dip = 0, prev = null; for (let z = Pc.z0 + 1000; z < Pt.z1 - 1000; z += 5) { const b = w0.bandsAt(z)[0]; if (b.t < 0.999) dip++; } out.dip = dip;
    const P2 = new Portal({}); P2.scan(w0); out.passages = P2.list.filter(q => q.zIn < 36000).map(q => q.from + '>' + q.to).join(','); out.inside = P2.list.filter(q => q.zIn > Pc.z0 + 200 && q.zIn < Pt.z1 - 200).length;
    out.envs = ['coastTown', 'coastTownNoon', 'coastTownBlue', 'coastTownMorning'].map(k => !!ENV3D[k] && !!ENV3D[k].layout && ENV3D[k].props.coastTower3 && ENV3D[k].props.coastPad && ENV3D[k].props.coastRound && ENV3D[k].props.coastParasol && !!BIOMES[k] && ENV3D[k].sky.top !== undefined);
    out.sky = ['coastTown', 'coastTownNoon', 'coastTownBlue', 'coastTownMorning'].map(k => ENV3D[k].sky.top + ENV3D[k].fog.color).join(',');
    out.music = /^coast/.test('coastTownBlue') && /^coast/.test('coastTown'); out.fam = ['coastTown', 'coastTownNoon', 'coastTownBlue', 'coastTownMorning'].map(k => Portal.fam(k)).join();
    return out;
  });
  const S = Object.values(K.seeds);
  T('the beach zone is the coast then the town, in the same light: ' + K.order + ' (' + K.len[0] + ' + ' + K.len[1] + ' units = ' + (K.len[0] + K.len[1]) / 10 + ' m); for five seeds every coastal piece is followed by the town of its own light (' + S.map(s => s.ok + '/' + s.n).join(', ') + '), after the neon quarter and before Saint-Gilles; the four lights all occur',
    /^(neonStart|neonRun)>coast(Sunset|Midday|BlueHour|Morning)>town(Sunset|Midday|BlueHour|Morning)>cityRun$/.test(K.order) && K.len[0] === 4200 && K.len[1] === 4800 && S.every(s => s.n >= 8 && s.bad === 0 && s.ok === s.n && s.before === 'neonRun,neonStart' && s.after === 'cityRun') && K.lights.split(' ').length === 4, K.lights);
  T('the hand-over is seamless and there is NO door in the beach zone: the coast stays in to its end (t ' + K.t.coastEnd + ') and the town is in from its first unit (t ' + K.t.townStart + '), nothing dips back to the city look in between (' + K.dip + ' dips), both are one zone family (' + K.fam + '), and the passages around it are only ' + K.passages.split(',').slice(0, 3).join(', ') + ' (none inside it: ' + K.inside + ')',
    K.t.coastStart < 0.05 && K.t.coastMid === 1 && K.t.coastEnd === 1 && K.t.townStart === 1 && K.t.townMid === 1 && K.t.townEnd < 0.05 && K.dip === 0 && K.fam === 'coast,coast,coast,coast' && K.inside === 0 && K.passages === 'neon>coast,coast>saintgilles,utrecht>neon' && K.music, JSON.stringify(K.t));
  T('the town has its own names (' + K.names.join(' / ') + ', biome ' + K.biomes.join(' / ') + '), and one environment per light with the coast\'s sky and fog (' + K.sky + '), its props (towers, roundabout, landing pad, parasol) and a 2D palette', K.names[1] === 'SUNSET TOWN' || /TOWN$/.test(K.names[1]), JSON.stringify(K.envs));
  T('the four town environments are complete', K.envs.every(Boolean) && new Set(K.sky.split(',')).size === 4, K.sky);

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
    const out = {}; const w = new World(TRACK); w.extend(30000); const Pt = w.pieces.find(p => /^town/.test(p.id)); out.id = Pt.id;
    const kinds = new Set(), count = { tower: 0, round: 0, pad: 0, club: 0 }; let seaSame = 0, seaN = 0, landOk = true, landEmpty = 0;
    for (let i = Math.ceil(Pt.z0 * 0.1 / 12); i < Pt.z1 * 0.1 / 12; i++) {
      const L = ENV3D.coastTown.layout(i, rnd), land = L.filter(q => q.x > 0), sea = JSON.stringify(L.filter(q => q.x < 0)), cs = JSON.stringify(ENV3D.coast.layout(i, rnd).filter(q => q.x < 0)); seaN++; if (sea === cs) seaSame++;
      for (const q of land) { if (/^coastTower/.test(q.prop)) { count.tower++; kinds.add(q.prop); } else if (q.prop === 'coastRound') count.round++; else if (q.prop === 'coastClub' || q.prop === 'coastDelphi') count.club++; else if (q.prop === 'coastPad') count.pad++; }
      if (!land.length) landEmpty++; if (L.some(q => q.x < 0 && /^coastTower|coastRound|coastPad/.test(q.prop))) landOk = false;
    }
    out.count = count; out.kinds = [...kinds].sort().join(); out.seaSame = [seaSame, seaN]; out.landOk = landOk; out.landEmpty = landEmpty;
    // the towers: height, width, glow only where there is a neon strip
    out.towers = [0, 1, 2, 3].map(k => { const m = ENV3D.coastTown.props['coastTower' + k](); m.lit.computeBoundingBox(); const bb = m.lit.boundingBox; return { h: +bb.max.y.toFixed(1), w: +(bb.max.z - bb.min.z).toFixed(1), face: +bb.min.x.toFixed(2), glow: !!m.glow, tris: m.lit.attributes.position.count / 3 }; });
    const rd = ENV3D.coastTown.props.coastRound(); rd.sprite.computeBoundingBox(); out.round = { patches: rd.sprite.userData.patches, minY: +rd.sprite.boundingBox.min.y.toFixed(2), r: +Math.max(rd.sprite.boundingBox.max.x, rd.sprite.boundingBox.max.z).toFixed(1), flowers: rd.material() === FlowerArt.material(), merged: !!rd.merged.lit };
    const pd = ENV3D.coastTown.props.coastPad(); pd.lit.computeBoundingBox(); out.pad = { w: +(pd.lit.boundingBox.max.x - pd.lit.boundingBox.min.x).toFixed(1), h: +pd.lit.boundingBox.max.y.toFixed(2), glow: !!pd.glow };
    // drawn in the four lights, seen from many places along the piece: the pools are never short
    out.runs = {}; let worst = 0, drops = 0, towers = 0;
    for (const id of ['townSunset', 'townMidday', 'townBlueHour', 'townMorning']) {
      let g = H.at(0); const Q = g.world.pieces.find(p => p.id === id); if (!Q) { out.runs[id] = 'missing'; continue; }
      let used = 0; for (let k = 0; k < 14; k++) { g.p.z = Q.z0 + 300 + k * 330; g.world.extend(g.p.z); const a = g.world.playerBand(g.p.z + 300, 0); g.bgTo = a.to; g.bgT = a.t; H.draw(2); used = Math.max(used, g.r.propUsed.coastTower0 + g.r.propUsed.coastTower1 + g.r.propUsed.coastTower2 + g.r.propUsed.coastTower3); worst = Math.max(worst, ...['coastTower0', 'coastTower1', 'coastTower2', 'coastTower3', 'coastRound', 'coastPad', 'coastParasol'].map(n => g.r.propUsed[n] / g.r.props[n].length)); }
      drops += g.r.dropped; towers = Math.max(towers, used); out.runs[id] = used;
    }
    out.pool = { worst: +worst.toFixed(2), drops, towers };
    return out;
  });
  T('the town\'s land side is a row of painted towers (' + TW.count.tower + ', all four kinds: ' + TW.kinds + '), a flower roundabout every 9th slot (' + TW.count.round + '), the two clubs (' + TW.count.club + ') and a landing pad every 23rd (' + TW.count.pad + '), with the coast\'s own sea side (' + TW.seaSame.join(' of ') + ' slots identical): nothing of the town on the sea side',
    TW.count.tower >= 18 && TW.kinds === 'coastTower0,coastTower1,coastTower2,coastTower3' && TW.count.round >= 3 && TW.count.pad >= 1 && TW.count.club >= 2 && TW.seaSame[0] === TW.seaSame[1] && TW.landOk, JSON.stringify(TW.count));
  T('the towers are tall and painted: heights ' + TW.towers.map(t => t.h).join(' / ') + ' m, widths ' + TW.towers.map(t => t.w).join(' / ') + ' m, facades at the building line (x ' + TW.towers[0].face + '), neon strips (unlit parts) on all but the yellow one (' + TW.towers.map(t => t.glow).join(', ') + '); the roundabout wears your flowers (' + TW.round.patches + ' patches on the soil, radius ' + TW.round.r + ' m); the pad is a ' + TW.pad.w + ' m turquoise disc with a neon ring',
    TW.towers[0].h >= 22 && TW.towers[2].h >= 27 && TW.towers[3].h >= 15 && TW.towers.every(t => t.face <= -0.1 && t.face > -0.5 && t.tris > 100) && TW.towers.map(t => t.glow).join() === 'false,true,true,true' && TW.round.patches >= 15 && TW.round.minY >= 0.3 && TW.round.flowers && TW.round.merged && TW.pad.w >= 7 && TW.pad.glow, JSON.stringify(TW.towers));
  T('drawn from fourteen places along each of the four towns the pools are never short: at most ' + TW.pool.towers + ' towers in view (' + Object.entries(TW.runs).map(e => e[0].replace('town', '') + ' ' + e[1]).join(', ') + '), at most ' + Math.round(TW.pool.worst * 100) + ' % of a pool used, nothing dropped (' + TW.pool.drops + ')', TW.pool.drops === 0 && TW.pool.worst <= 0.95 && TW.pool.towers >= 6 && Object.values(TW.runs).every(v => typeof v === 'number' && v >= 6), JSON.stringify(TW.runs));

  // ================================================================ 3b. the long buildings are separate from the chalets: the cottages only on the beach, the towers and the clubs only in the town
  const SEP = await pg.evaluate(() => {
    const w = new World(TRACK); w.extend(30000); const Pc = w.pieces.find(p => /^coast(Sunset|Midday|BlueHour|Morning)$/.test(p.id)), Pt = w.pieces.find(p => /^town/.test(p.id)), cnt = (P, env) => {
      const c = { cottage: 0, tower: 0, club: 0, other: 0 }; for (let i = Math.ceil(P.z0 * 0.1 / 12); i < P.z1 * 0.1 / 12; i++) for (const q of ENV3D[env].layout(i, rnd)) { if (q.x < 0) continue; if (/^cottage/.test(q.prop)) c.cottage++; else if (/^coastTower/.test(q.prop)) c.tower++; else if (q.prop === 'coastClub' || q.prop === 'coastDelphi') c.club++; else c.other++; } return c; };
    const edge = (P, env, from, to) => { const c = { cottage: 0, tower: 0, club: 0 }; for (let i = Math.floor(from * 0.1 / 12); i < Math.ceil(to * 0.1 / 12); i++) for (const q of ENV3D[env].layout(i, rnd)) { if (q.x < 0) continue; if (/^cottage/.test(q.prop)) c.cottage++; else if (/^coastTower/.test(q.prop)) c.tower++; else if (q.prop === 'coastClub' || q.prop === 'coastDelphi') c.club++; } return c; };
    return { beach: cnt(Pc, 'coast'), town: cnt(Pt, 'coastTown'), lastBeach: edge(Pc, 'coast', Pc.z1 - 1200, Pc.z1), firstTown: edge(Pt, 'coastTown', Pt.z0, Pt.z0 + 1200), seam: [Pc.z1 === Pt.z0] };
  });
  T('the long buildings are separate from the chalets: on the beach (the coastal piece) the cottages stand (' + SEP.beach.cottage + ') and neither a tower nor a club does (' + SEP.beach.tower + ' / ' + SEP.beach.club + '); in the town (the next piece) the towers and the two clubs stand (' + SEP.town.tower + ' / ' + SEP.town.club + ') and not one cottage (' + SEP.town.cottage + '); at the seam, the last 100 m of the beach have no tower and the first 100 m of the town no cottage',
    SEP.beach.cottage >= 4 && SEP.beach.tower === 0 && SEP.beach.club === 0 && SEP.town.tower >= 18 && SEP.town.club >= 2 && SEP.town.cottage === 0 && SEP.lastBeach.tower === 0 && SEP.lastBeach.club === 0 && SEP.firstTown.cottage === 0 && SEP.seam[0], JSON.stringify(SEP));

  // ================================================================ 3c. the everyday life of the coast (a standing rule): a bike lane along the road, green spaces, a sports court and a youth playground, on the beach and in the town
  const LF = await pg.evaluate(() => {
    const w = new World(TRACK); w.extend(30000); const Pc = w.pieces.find(p => /^coast(Sunset|Midday|BlueHour|Morning)$/.test(p.id)), Pt = w.pieces.find(p => /^town/.test(p.id)), out = {};
    const count = (P, env) => { const c = { slots: 0, bike: 0, park: 0, court: 0, play: 0, trees: 0, sea: 0 }; for (let i = Math.ceil(P.z0 * 0.1 / 12); i < P.z1 * 0.1 / 12; i++) { const L = ENV3D[env].layout(i, rnd), land = L.filter(q => q.x > 0); c.slots++; if (land.some(q => q.prop === 'coastBike' && q.x > 3.5 && q.x < 4)) c.bike++; if (land.some(q => q.prop === 'coastPark')) c.park++; if (land.some(q => q.prop === 'coastCourt')) c.court++; if (land.some(q => q.prop === 'coastPlay')) c.play++; c.trees += land.filter(q => q.prop === 'tree').length; if (L.some(q => q.x < 0 && /^coast(Bike|Park|Court|Play)/.test(q.prop))) c.sea++; } return c; };
    out.beach = count(Pc, 'coast'); out.town = count(Pt, 'coastTown');
    const size = n => { const m = ENV3D.coast.props[n](); const g = m.lit; g.computeBoundingBox(); const bb = g.boundingBox; return [+(bb.max.x - bb.min.x).toFixed(1), +bb.max.y.toFixed(1), +(bb.max.z - bb.min.z).toFixed(1), !!m.glow]; };
    out.sizes = { bike: size('coastBike'), park: size('coastPark'), court: size('coastCourt'), play: size('coastPlay') };
    out.treeShared = ENV3D.coast.props.tree === ENV3D.city.props.tree;
    // drawn from many places along both pieces: each is in view somewhere, the pools hold, nothing dropped
    const used = { coastBike: 0, coastPark: 0, coastCourt: 0, coastPlay: 0, tree: 0 }; let drops = 0;
    for (const P of [Pc, Pt]) { const g = H.at(0); for (let k = 0; k < 14; k++) { g.p.z = P.z0 + 700 + k * 280; g.world.extend(g.p.z); const a = g.world.playerBand(g.p.z + 300, 0); g.bgTo = a.to; g.bgT = a.t; H.draw(2); for (const n in used) used[n] = Math.max(used[n], g.r.propUsed[n]); drops += g.r.dropped; } }
    out.used = used; out.drops = drops;
    return out;
  });
  T('the coast always has its everyday life: the bike lane runs along the road on every slot of the beach (' + LF.beach.bike + ' of ' + LF.beach.slots + ') and of the town (' + LF.town.bike + ' of ' + LF.town.slots + '), a ' + LF.sizes.bike[0] + ' m terracotta strip with white dashes and a bicycle sign, never on the sea side (' + (LF.beach.sea + LF.town.sea) + ')',
    LF.beach.bike === LF.beach.slots && LF.town.bike === LF.town.slots && LF.sizes.bike[0] === 1.2 && LF.sizes.bike[2] >= 12 && LF.beach.sea === 0 && LF.town.sea === 0, JSON.stringify([LF.beach, LF.town]));
  T('green spaces, a sports ground and a youth playground, on the beach (' + LF.beach.park + ' lawns, ' + LF.beach.court + ' courts, ' + LF.beach.play + ' playgrounds) and in the town (' + LF.town.park + ' / ' + LF.town.court + ' / ' + LF.town.play + '): a lawn with a path, bushes and a bench (' + LF.sizes.park.join(' x ') + ' m) with two of the user\'s trees each (' + LF.beach.trees + ' + ' + LF.town.trees + '), a green pitch with lines, goals and a basketball hoop (' + LF.sizes.court.join(' x ') + ' m), a playground with swings and a slide (' + LF.sizes.play.join(' x ') + ' m)',
    LF.beach.park >= 2 && LF.beach.court >= 1 && LF.beach.play >= 1 && LF.town.park >= 3 && LF.town.court >= 2 && LF.town.play >= 2 && LF.beach.trees === 2 * LF.beach.park && LF.town.trees === 2 * LF.town.park && LF.treeShared && LF.sizes.park[0] >= 8 && LF.sizes.park[2] >= 10 && LF.sizes.court[0] >= 8 && LF.sizes.court[1] >= 3 && LF.sizes.court[2] >= 10 && LF.sizes.play[0] >= 8 && LF.sizes.play[1] >= 2.5, JSON.stringify(LF.sizes));
  T('they are all drawn (in view somewhere along the two pieces: ' + Object.entries(LF.used).map(e => e[0].replace('coast', '') + ' ' + e[1]).join(', ') + ') and no pool is short (' + LF.drops + ' dropped)', LF.used.coastBike >= 8 && LF.used.coastPark >= 1 && LF.used.coastCourt >= 1 && LF.used.coastPlay >= 1 && LF.used.tree >= 2 && LF.drops === 0, JSON.stringify(LF.used));

  // ================================================================ 4. the saucer: it hovers over its pad and takes off, flying away, when the runner comes near
  const SA = await pg.evaluate(() => {
    const out = {}; let g = H.at(0); const Pt = g.world.pieces.find(p => /^town/.test(p.id)), slot = H.slot(Pt, 'coastPad', Pt.seg.biome), pz = slot * 120 + 60;           // the pad's z in track units
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
  T('no JS errors (3D)', pg.errs.length === 0, pg.errs.slice(0, 2).join('|')); await pg.context().close();

  // ================================================================ 5. the classic 2D game runs through the beach zone, the town included (its coast palette), nothing 3D-only
  const p2 = await open(base + '2d.html');
  const D2 = await p2.evaluate(() => {
    const g = __wf, out = {}; g.start(); g.world.extend(60000); const Pt = g.world.pieces.find(p => /^town/.test(p.id)); let draws = 0, err = null; const seen = new Set();
    g.world.items = []; g.state = 'play'; g.p.z = Pt.z0 - 400; g.p.speed = 340; g.world.extend(g.p.z); g.die = () => {};
    try { for (let f = 0; f < 60 * 28 && g.p.z < Pt.z1 + 400; f++) { g.advance(1 / 60); if (f % 4 === 0) { g.draw(); draws++; } seen.add(g.world.playerBand(g.p.z, 0).to); } } catch (e) { err = String(e && e.message); }
    out.err = err; out.draws = draws; out.seen = [...seen].join(); out.palette = !!BIOMES.coastTown && !!BIOMES.coastTownBlue; out.cls = typeof Saucer3D + '/' + typeof ParasolArt; out.z = Math.round(g.p.z - Pt.z0); return out;
  });
  T('the classic 2D game draws the town (' + D2.seen + ', ' + D2.draws + ' frames, ' + D2.z + ' units into it) with the coast\'s palettes: no error, nothing 3D-only (' + D2.cls + ')', !D2.err && D2.palette && D2.draws > 150 && /coastTown/.test(D2.seen) && D2.cls === 'undefined/undefined' && p2.errs.length === 0, JSON.stringify(D2));
  await p2.context().close();
  console.log('\n' + res.filter(Boolean).length + '/' + res.length + ' passed');
  await b.close(); srv.close(); process.exit(res.every(Boolean) ? 0 : 1);
})().catch(e => { console.log('TEST ERROR', e.message); process.exit(1); });
