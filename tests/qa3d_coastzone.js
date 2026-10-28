// WAYFARER regression test: the independent coastal zone on the main circuit (src/track.js `pick: 'C'` after the first plaza of every lap): one of four 420 m pieces by turns, the same safe coast road
// under four lights (sunset, midday, morning haze, blue hour: ENV3D.coast, coastNoon, coastMorning, coastBlue). Checks the track and the rotation at each passage (also by seed), the four atmospheres,
// the coast music for every light, a bot through each piece, the pools, and the classic 2D game; the coast branches of the junctions stay as they were.
//
// Run:  node tests/qa3d_coastzone.js     (needs playwright-core and a Chromium: CHROMIUM=/path/to/chrome, NODE_PATH or PW_CORE as for the other tests; TEST_URL=https://... tests a deployment)
const http = require('http'), fs = require('fs'), path = require('path');
let chromium; try { ({ chromium } = require('playwright-core')); } catch (e) { ({ chromium } = require(process.env.PW_CORE || 'playwright-core')); }
const ROOT = path.join(__dirname, '..'), PORT = 8124;
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
      at(seg, dz, speed = 300) { const g = __wf; g.r.renderer.render = () => {}; g.start(); g.world.extend(170000); const P = g.world.pieces.find(p => p.id === seg); g.state = 'play'; g.p.z = P.z0 + dz; g.p.x = 0; g.p.speed = speed; g.scene = null; g.fadeIn = 0; g.world.extend(g.p.z);
        const a = g.world.playerBand(g.p.z + 300, 0); g.bgTo = a.to; g.bgT = a.t; g.die = () => {}; return { g, P }; },
      draw(n = 3) { const g = __wf; for (let i = 0; i < n; i++) { g.time += 1 / 60; g.r.draw(g); } },
      bot() {
        const g = __wf, p = g.p, hz = g.world.items.filter(it => OBST[it.kind] && !it.taken && it.z > p.z - 12 && it.z < p.z + 300); g.keys.left = g.keys.right = false;
        let tg = null; for (const it of hz) { const o = OBST[it.kind]; if (Math.abs(it.x - p.x) > o.hw + P_HW + 0.08 || it.z <= p.z - 2) continue; if (!tg || it.z < tg.z) tg = it; }
        if (tg) { const d = tg.z - p.z, v = p.speed * (g.pk ? g.pk.speedMul : 1), key = c => g.onKey({ code: c, key: c, repeat: false, preventDefault() {} }, true); if (tg.kind === 'over') { if (d < v * 0.2 + 10 && p.jy === 0 && p.slide <= 0) key('ArrowDown'); } else if (d < v * 0.26 + 8 && p.jy === 0 && !hz.some(it => it.kind === 'over' && it.z > p.z - 10 && it.z < p.z + 12)) key('Space'); }
      },
    };
  });

  // ================================================================ 1. the track and the rotation
  const K = await pg.evaluate(() => {
    const out = {}, order = TRACK.pickSegs.C; const seqOf = seed => { const w = new World(TRACK); w.seed = seed; w.reset(); w.extend(260000); return w.pieces.map(p => p.id || 'fork').filter(x => /^coast(Morning|Midday|Sunset|BlueHour)$/.test(x)); };
    const w0 = new World(TRACK); w0.extend(30000); const ids = w0.pieces.map(p => p.id || 'fork'); const i = ids.indexOf('plaza'); out.after = ids.slice(i - 2, i + 3).join('>'); const C = w0.pieces[i + 1];
    out.piece = { id: C.id, len: C.z1 - C.z0, biome: C.seg.biome, name: C.seg.name, district: C.seg.district };
    const t = z => w0.bandsAt(z)[0]; out.t = [t(C.z0 + 2).t, t(C.z0 + 450).t, t(C.z0 + 2100).t, t(C.z1 - 450).t, t(C.z1 - 2).t].map(v => +v.toFixed(2));
    const nF = w0.items.filter(it => OBST[it.kind] && it.z >= C.z0 && it.z < C.z1).length, nAll = w0.items.filter(it => it.kind !== 'prop' && it.z >= C.z0 && it.z < C.z1).length; out.hz = [nF, nAll];
    out.seeds = {}; for (const s of [0, 1, 7, 99, 12345]) out.seeds[s] = seqOf(s).slice(0, 6);
    out.again = JSON.stringify(seqOf(7)) === JSON.stringify(seqOf(7));
    out.order = order; out.cyc = Object.values(out.seeds).every(q => q.every((id, k) => { const j = order.indexOf(q[0]); return id === order[(j + k) % order.length]; }));
    out.four = Object.values(out.seeds).every(q => new Set(q.slice(0, 4)).size === 4);
    out.canon = out.seeds[0].slice(0, 4).join();
    // the coast branches of the junctions are the ones they were (the sunset look: biome coast)
    out.branch = [TRACK.segments.coastRun.biome, TRACK.segments.coastRunB.biome, TRACK.segments.coastRun.name];
    out.biomes = order.map(id => TRACK.segments[id].biome); out.names = order.map(id => TRACK.segments[id].name);
    out.starts = {}; for (const id of order) { const s2 = new World(TRACK); s2.seed = 0; s2.reset(); } return out;
  });
  T('the coastal zone is its own piece on the main circuit: ' + K.after + ' (' + K.piece.len + ' units, a district of ' + K.piece.district + ' fading in and out: t ' + K.t.join(' / ') + ', ' + K.hz[0] + ' hazards among ' + K.hz[1] + ' items); the canonical run starts with the sunset (' + K.canon + ')',
    /plaza>coast(Sunset|Midday|BlueHour|Morning)>neonRun/.test(K.after) && K.piece.len === 4200 && K.t[0] < 0.05 && K.t[1] > 0.4 && K.t[1] < 0.99 && K.t[2] === 1 && K.t[4] < 0.05 && K.hz[0] <= 10 && K.hz[1] > 40 && K.canon === 'coastSunset,coastMidday,coastBlueHour,coastMorning', JSON.stringify(K.t));
  T('one light per passage, by turns: every seed goes through the four in the same cyclic order from its own start (' + Object.entries(K.seeds).map(([s, q]) => s + ': ' + q.slice(0, 4).map(x => x.replace('coast', '')).join('/')).join('; ') + '), all four in any four consecutive passages, and the same seed gives the same run; the coast branches of the junctions keep the sunset look (biome ' + K.branch.slice(0, 2).join(', ') + ')',
    K.cyc && K.four && K.again && K.branch[0] === 'coast' && K.branch[1] === 'coast' && K.biomes.join() === 'coast,coastNoon,coastBlue,coastMorning' && K.names.join() === 'SUNSET COAST,MIDDAY COAST,BLUE HOUR COAST,MORNING COAST', JSON.stringify(K.biomes));

  // ================================================================ 2. the four atmospheres (3D environments, 2D palettes, the coast music for each)
  const AT = await pg.evaluate(() => {
    const out = { env: {}, fog: {}, sky: {} }; const ids = { coastSunset: 'coast', coastMidday: 'coastNoon', coastBlueHour: 'coastBlue', coastMorning: 'coastMorning' };
    for (const [seg, bio] of Object.entries(ids)) { const E = ENV3D[bio]; out.env[seg] = !!E && E.props === ENV3D.coast.props && E.layout === ENV3D.coast.layout && !!BIOMES[bio]; const { g } = H.at(seg, 2000); H.draw(4); out.fog[seg] = g.r.scene.fog.color.getHexString(); out.sky[seg] = E.sky.top + E.sky.horizon; out[seg] = { bgTo: g.bgTo, bgT: g.bgT, name: g.world.track.segments[g.world.playerBand(g.p.z, 0).route].name, drop: g.r.dropped };
      // the coast music follows each light: the weight goes to 1 and the coast track starts, then back to 0 away from the coast
      const a = g.sfx; g.advance = () => {}; for (let i = 0; i < 80; i++) a.tick(g, 0.05); out[seg].coastW = +a.coastW.toFixed(2); g.bgTo = 'neon'; g.bgT = 1; for (let i = 0; i < 80; i++) a.tick(g, 0.05); out[seg].after = +a.coastW.toFixed(2); delete g.advance; }
    return out;
  });
  const segs = ['coastSunset', 'coastMidday', 'coastBlueHour', 'coastMorning'];
  T('the four lights are four environments over one prop set (one pool) with their own sky and fog (' + segs.map(s => AT.fog[s]).join(', ') + '), the game sets each one up (' + segs.map(s => AT[s].bgTo).join(', ') + ') and names the stretch (' + segs.map(s => AT[s].name).join(' / ') + '), nothing dropped',
    segs.every(s => AT.env[s]) && new Set(segs.map(s => AT.fog[s])).size === 4 && new Set(segs.map(s => AT.sky[s])).size === 4 && segs.every(s => AT[s].bgT === 1 && AT[s].drop === 0) && AT.coastSunset.bgTo === 'coast' && AT.coastMidday.bgTo === 'coastNoon' && AT.coastBlueHour.bgTo === 'coastBlue' && AT.coastMorning.bgTo === 'coastMorning' && AT.coastMidday.name === 'MIDDAY COAST', JSON.stringify(AT.fog));
  T('the coast music (afro Mediterraneo) plays under every light and goes away with it (weights ' + segs.map(s => AT[s].coastW + ' -> ' + AT[s].after).join(', ') + ')', segs.every(s => AT[s].coastW > 0.95 && AT[s].after < 0.05), '');

  // ================================================================ 3. a bot plays each of the four pieces from the plaza before it to the neon quarter after it; pools bounded
  const RUN = await pg.evaluate(() => {
    const out = {}; for (const seg of ['coastSunset', 'coastMidday', 'coastBlueHour', 'coastMorning']) {
      const { g, P } = H.at(seg, -700, 340); g.die = Game.prototype.die; const r = g.r; g.pk.reset(); g.pk.save = Perks.defaults(); let f = 0, geo0 = -1, drift = 0; const kids0 = r.scene.children.length, seen = new Set();
      while (g.p.z < P.z1 + 500 && g.state === 'play' && f < 60 * 60) { H.bot(); g.advance(1 / 60); f++; seen.add(g.bgTo); if (f % 6 === 0) { r.draw(g); if (f >= 300 && geo0 < 0) geo0 = r.renderer.info.memory.geometries; else if (geo0 >= 0 && (r.renderer.info.memory.geometries !== geo0 || r.scene.children.length !== kids0)) drift++; } }
      out[seg] = { state: g.state, z: Math.round(g.p.z - P.z0), coins: g.coins, dropped: r.dropped + r.items.dropped, drift, seen: [...seen].join() };
    }
    return out;
  });
  T('a bot plays each of the four pieces through (alive in all: ' + segs.map(s => RUN[s].state).join(', ') + '; ' + segs.map(s => RUN[s].coins + ' coins').join(', ') + '), nothing dropped from any pool and the scene constant (' + segs.map(s => RUN[s].dropped + '/' + RUN[s].drift).join(', ') + ')',
    segs.every(s => RUN[s].state === 'play' && RUN[s].z > 4200 && RUN[s].coins >= 20 && RUN[s].dropped === 0 && RUN[s].drift === 0), JSON.stringify(RUN));
  // ================================================================ 3b. the Strawberry Beach Club: a terrace whose backdrop is the user's strawberry picture stretched wide, with the club's anchor sign at its entrance
  const CL = await pg.evaluate(async () => {
    const out = {}; const { g, P } = H.at('coastSunset', 0); const r = g.r;
    let slots = []; for (let i = Math.ceil(P.z0 * 0.1 / 12); i < P.z1 * 0.1 / 12; i++) { const L = ENV3D.coast.layout(i, rnd); if (L.some(q => q.prop === 'coastClub')) slots.push([i, L.filter(q => q.prop === 'coastClub').every(q => q.x > 0), L.filter(q => q.x > 0 && /^cottage/.test(q.prop)).length]); }
    out.slots = slots.length; out.landSide = slots.every(x => x[1]); out.noCottage = slots.every(x => x[2] === 0);
    const mat = CoastArt.material(); for (let i = 0; i < 80 && !mat.visible; i++) await new Promise(q => setTimeout(q, 100)); out.loaded = mat.visible && mat.map.image.naturalWidth === COAST_ASSETS.w && mat.map.image.naturalHeight === COAST_ASSETS.h; out.sign = CoastArt.signMaterial().map.image instanceof HTMLCanvasElement;
    g.p.z = slots[0][0] * 120 + 60 - 180; g.world.extend(g.p.z); const a = g.world.playerBand(g.p.z + 300, 0); g.bgTo = a.to; g.bgT = a.t; H.draw(4);
    out.used = r.propUsed.coastClub; const club = r.props.coastClub.find(o => o.visible); out.kids = club ? club.children.length : 0;
    const m = ENV3D.coast.props.coastClub(); m.sprite.computeBoundingBox(); const bb = m.sprite.boundingBox, pos = m.sprite.attributes.position.array, uv = m.sprite.attributes.uv.array;
    const back = { w: Math.abs(pos[5] - pos[2]), h: Math.abs(pos[7] - pos[1]) }; out.back = { w: +back.w.toFixed(2), h: +back.h.toFixed(2) }; const cell = COAST_ASSETS.strawberry; out.stretch = +((back.w / back.h) / cell.ar).toFixed(2);
    out.uv = [uv[0], uv[1], uv[4], uv[5]].map(v => +v.toFixed(4)); out.cell = [cell.u0, cell.v0, cell.u1, cell.v1].map(v => +v.toFixed(4)); out.extra = (m.extra || []).length;
    // the anchor sign: a panel across the road (a plane of constant z) that the runner meets head on, the whole 'anchor' cell on it
    const an = COAST_ASSETS.anchor; out.anchor = { ar: +an.ar.toFixed(2), uv: [uv[8], uv[9]].map(v => +v.toFixed(4)), z: [4, 5, 6, 7].map(v => +pos[v * 3 + 2].toFixed(2)) };
    out.dropped = r.dropped; return out;
  });
  T('the Strawberry Beach Club stands on the land side of the coast road, in place of a cottage (' + CL.slots + ' in a 420 m piece): a terrace under parasols whose BACKDROP is your strawberry picture stretched ' + CL.stretch + ' times wider (a ' + CL.back.w + ' x ' + CL.back.h + ' m panel for a ' + 'square picture, all of it shown: uv ' + CL.uv.join(',') + ' of ' + CL.cell.join(',') + '), a neon name board and, across the entrance, your EL MEDITERRANEOS sign (' + CL.anchor.z.join(' / ') + '); the atlas loaded (' + CL.loaded + '), one club in view with ' + CL.kids + ' meshes, nothing dropped',
    CL.slots >= 1 && CL.landSide && CL.noCottage && CL.loaded && CL.sign && CL.used === 1 && CL.kids >= 3 && CL.back.w >= 11 && CL.back.h >= 4.4 && CL.stretch >= 2.3 && CL.stretch <= 2.8 && JSON.stringify(CL.uv) === JSON.stringify([CL.cell[0], CL.cell[1], CL.cell[2], CL.cell[3]]) && CL.extra === 1 && new Set(CL.anchor.z).size === 1 && CL.dropped === 0, JSON.stringify(CL));
  // ================================================================ 3c. Club Delphi: a whitewashed cabin with a dolphin SCULPTURE leaping on a pedestal and the drawn dolphin SIGN across its entrance (original drawings: none of the uploaded art is used or changed)
  const DL = await pg.evaluate(async () => {
    const out = {}; const { g, P } = H.at('coastSunset', 0); const r = g.r;
    const slots = []; for (let i = Math.ceil(P.z0 * 0.1 / 12); i < P.z1 * 0.1 / 12; i++) { const L = ENV3D.coast.layout(i, rnd); if (L.some(q => q.prop === 'coastDelphi')) slots.push([i, L.filter(q => q.prop === 'coastDelphi').every(q => q.x > 0), L.filter(q => /^cottage|^coastClub/.test(q.prop)).length]); }
    out.slots = slots.length; out.landSide = slots.every(x => x[1]); out.alone = slots.every(x => x[2] === 0);
    const clubs = []; for (let i = Math.ceil(P.z0 * 0.1 / 12); i < P.z1 * 0.1 / 12; i++) if (ENV3D.coast.layout(i, rnd).some(q => q.prop === 'coastClub')) clubs.push(i); out.clubs = clubs.length; out.apart = clubs.every(c => slots.every(s => Math.abs(s[0] - c) > 1));
    g.p.z = slots[0][0] * 120 + 60 - 180; g.world.extend(g.p.z); const a = g.world.playerBand(g.p.z + 300, 0); g.bgTo = a.to; g.bgT = a.t; H.draw(4);
    out.used = r.propUsed.coastDelphi; const dl = r.props.coastDelphi.find(o => o.visible); out.kids = dl ? dl.children.length : 0;
    const m = ENV3D.coast.props.coastDelphi(); m.merged.lit.computeBoundingBox(); const bb = m.merged.lit.boundingBox; out.size = [bb.max.x - bb.min.x, bb.max.y - bb.min.y, bb.max.z - bb.min.z].map(v => +v.toFixed(1)); out.tris = m.merged.lit.attributes.position.count / 3;
    const pos = m.sprite.attributes.position.array, uv = m.sprite.attributes.uv.array; out.sign = { w: +Math.abs(pos[3] - pos[0]).toFixed(2), h: +Math.abs(pos[7] - pos[1]).toFixed(2), zs: new Set([0, 1, 2, 3].map(v => +pos[v * 3 + 2].toFixed(2))).size, uv: [uv[0], uv[1], uv[4], uv[5]].join() };
    const mat = CoastArt.delphiMaterial(); const cv = mat.map.image; out.canvas = [cv.width, cv.height]; const px = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data; let body = 0, ink = 0, sea = 0;
    for (let i = 0; i < px.length; i += 4) { const R = px[i], G = px[i + 1], B = px[i + 2]; if (Math.abs(R - 0x3f) < 30 && Math.abs(G - 0x6f) < 30 && Math.abs(B - 0x94) < 30) body++; else if (R < 40 && G < 70 && B > 80 && B < 140) ink++; else if (R < 70 && G > 110 && B > 160) sea++; }
    out.px = { body, ink, sea }; out.same = CoastArt.delphiMaterial() === mat && mat !== CoastArt.material() && mat !== CoastArt.signMaterial();
    out.uploaded = [COAST_ASSETS.w, COAST_ASSETS.h, +COAST_ASSETS.strawberry.ar.toFixed(3), COAST_ASSETS.anchor.ar].join(); out.dropped = r.dropped; return out;
  });
  T('Club Delphi stands on the land side of the coast road in place of a cottage (' + DL.slots + ' in a 420 m piece, never beside the Strawberry Beach Club: ' + DL.clubs + ' there): a whitewashed cabin with a dolphin sculpture leaping on a pedestal (the whole prop is ' + DL.size.join(' x ') + ' m, ' + DL.tris + ' triangles) and the dolphin SIGN across the entrance (a ' + DL.sign.w + ' x ' + DL.sign.h + ' m square panel in one plane, the whole drawing on it, ' + DL.canvas.join('x') + ' canvas: ' + DL.px.body + ' dolphin, ' + DL.px.sea + ' sea, ' + DL.px.ink + ' navy pixels); the club pictures are untouched (' + DL.uploaded + ')',
    DL.slots >= 1 && DL.landSide && DL.alone && DL.apart && DL.used === 1 && DL.kids >= 2 && DL.size[1] >= 3.5 && DL.size[1] <= 6.5 && DL.size[0] > 5 && DL.tris > 800 && DL.sign.w === DL.sign.h && DL.sign.w >= 2.5 && DL.sign.zs === 1 && DL.sign.uv === '0,0,1,1' && DL.canvas[0] === 512 && DL.canvas[1] === 512 && DL.px.body > 2500 && DL.px.sea > 8000 && DL.px.ink > 1500 && DL.same && DL.uploaded === '1412,771,0.996,1' && DL.dropped === 0, JSON.stringify(DL));
  T('no JS errors (3D)', pg.errs.length === 0, pg.errs.slice(0, 2).join('|')); await pg.context().close();

  // ================================================================ 4. the classic 2D game runs through the coastal zone (its coast palette), no error, no 3D-only items
  const p2 = await open(base + '2d.html');
  const D2 = await p2.evaluate(() => {
    const g = __wf, out = {}; g.start(); g.world.extend(60000); const C = g.world.pieces.find(p => /^coast(Morning|Midday|Sunset|BlueHour)$/.test(p.id)); let draws = 0, err = null; const seen = new Set();
    g.world.items = []; g.state = 'play'; g.p.z = C.z0 - 600; g.p.speed = 340; g.world.extend(g.p.z); g.die = () => {};
    try { for (let f = 0; f < 60 * 30 && g.p.z < C.z1 + 600; f++) { g.advance(1 / 60); if (f % 4 === 0) { g.draw(); draws++; } seen.add(g.world.playerBand(g.p.z, 0).to); } } catch (e) { err = String(e && e.message); }
    out.err = err; out.draws = draws; out.seen = [...seen].join(); out.pk = g.pk === null; out.id = C.id; return out;
  });
  T('the classic 2D game draws the coastal zone (' + D2.id + ', biome ' + D2.seen + ', ' + D2.draws + ' frames) with its coast palette: no error, no perks', !D2.err && D2.pk && D2.draws > 150 && /coast/.test(D2.seen) && p2.errs.length === 0, JSON.stringify({ ...D2, errs: p2.errs.slice(0, 1) }));
  await p2.context().close();
  console.log('\n' + res.filter(Boolean).length + '/' + res.length + ' passed');
  await b.close(); srv.close(); process.exit(res.every(Boolean) ? 0 : 1);
})().catch(e => { console.log('TEST ERROR', e.message); process.exit(1); });
