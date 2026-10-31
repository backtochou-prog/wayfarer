// WAYFARER regression test: THE VORTEX, the hazard that replaces the crates in the 3D build (src3d/vortex_art.js, vortex_assets.js made by tools/make_vortex_assets.py from the user's red glass ring and her spiral;
// Items3D pools; Renderer3D absorbs the runner; Game.die(hit) keeps the killer; the 'absorb' voice). Checks the two pictures, the model (a 2 m ROUND RUG lying flat, 3 cm thick, with the glass ring, the spiral that
// turns inward and a second one laid over it turning the other way: the same hit box as the crate), that the rules are untouched (a hit still ends the run, a jump clears it, the aura takes one hit), the absorption of the runner (pulled in, turning, shrinking, sunk into the
// disc, no tip-over), the delay of the game-over panel, the sound, the other hazards (still a crash), the water (a whirlpool) and the classic 2D game.
//
// Run:  node tests/qa3d_vortex.js     (needs playwright-core and a Chromium: CHROMIUM=/path/to/chrome, NODE_PATH or PW_CORE as for the other tests; TEST_URL=https://... tests a deployment)
const http = require('http'), fs = require('fs'), path = require('path');
let chromium; try { ({ chromium } = require('playwright-core')); } catch (e) { ({ chromium } = require(process.env.PW_CORE || 'playwright-core')); }
const ROOT = path.join(__dirname, '..'), PORT = 8240;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const res = []; const T = (n, ok, i = '') => { res.push(ok); console.log((ok ? 'PASS ' : 'FAIL ') + n + (i !== '' ? '  [' + i + ']' : '')); };

(async () => {
  const srv = http.createServer((q, r) => { let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; fs.readFile(path.join(ROOT, p), (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' }); r.end(d); } }); }).listen(PORT);
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/root/.cache/ms-playwright/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const base = process.env.TEST_URL || 'http://localhost:' + PORT + '/';
  const open = async url => { const pg = await (await b.newContext({ viewport: { width: 480, height: 270 } })).newPage(); pg.errs = []; pg.on('pageerror', e => pg.errs.push(e.message)); pg.on('console', m => m.type() === 'error' && !/404/.test(m.text()) && pg.errs.push(m.text())); await pg.goto(url, { timeout: 90000 }); await pg.waitForFunction(() => window.__wf, null, { timeout: 60000 }); await pg.waitForTimeout(1500); return pg; };
  const pg = await open(base);
  await pg.evaluate(() => {
    window.H = {
      // a fresh run at z 1200 with nothing on the road but what the scenario puts there; the runner in the middle lane at the top speed
      setup(lane = 0) { const g = __wf; delete g.advance; g.start(); g.p.z = 1200; g.world.extend(g.p.z + 4000); g.world.items = []; g.p.x = lane * LANE_W; g.p.speed = 340; g.state = 'play'; g.keys = {}; return g; },
      put(kind, dz, lane = 0) { const g = __wf, it = { kind, z: g.p.z + dz, x: lane * LANE_W, h: 12, tag: 'x' }; g.world.items.push(it); return it; },
      run(n) { const g = __wf; for (let i = 0; i < n && g.state === 'play'; i++) { g.advance(1 / 60); g.time += 1 / 60; } },
      overTo(t) { const g = __wf; for (let i = 0; i < 400 && g.overT < t; i++) { g.advance(1 / 60); g.time += 1 / 60; } g.r.draw(g); },
    };
  });

  // ================================================================ 1. the two pictures
  const A = await pg.evaluate(async () => {
    const load = src => new Promise(r => { const im = new Image(); im.onload = () => { const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; const x = c.getContext('2d'); x.drawImage(im, 0, 0); r({ w: c.width, h: c.height, d: x.getImageData(0, 0, c.width, c.height).data }); }; im.onerror = () => r(null); im.src = src; });
    const R = await load(VORTEX_ASSETS.ring), S = await load(VORTEX_ASSETS.spiral), out = { ring: [R.w, R.h], spiral: [S.w, S.h], hole: VORTEX_ASSETS.hole };
    const al = (I, x, y) => I.d[(y * I.w + x) * 4 + 3], c = R.w / 2; out.holeAlpha = al(R, Math.round(c + out.hole.x * c), Math.round(c + out.hole.z * c)); out.cornerAlpha = Math.max(al(R, 3, 3), al(R, R.w - 4, 3), al(R, 3, R.h - 4), al(R, R.w - 4, R.h - 4));
    let ringOp = 0, ringRed = 0; for (let y = 0; y < R.h; y += 2) for (let x = 0; x < R.w; x += 2) { const o = (y * R.w + x) * 4; if (R.d[o + 3] > 200) { ringOp++; if (R.d[o] > 150 && R.d[o + 1] < 90) ringRed++; } } out.ring_ = { opaque: ringOp, red: ringRed };
    let line = 0, black = 0, outside = 0; for (let y = 0; y < S.h; y += 2) for (let x = 0; x < S.w; x += 2) { const o = (y * S.w + x) * 4, inside = Math.hypot(x - S.w / 2, y - S.h / 2) < S.w / 2 - 4; if (!inside) { if (Math.hypot(x - S.w / 2, y - S.h / 2) > S.w / 2 + 1 && S.d[o] + S.d[o + 1] + S.d[o + 2] > 30) outside++; continue; } if (S.d[o] > 150 && S.d[o + 1] < 110) line++; else if (S.d[o] + S.d[o + 1] + S.d[o + 2] < 40) black++; } out.spiral_ = { line, black, outside };
    // the spiral winds counter-clockwise outward (y up): going round counter-clockwise from a line, the next line met is further out on average
    const cx = S.w / 2, cy = S.h / 2, radii = th => { const r = []; let on = false; for (let rr = 0; rr < S.w / 2 - 6; rr++) { const x = Math.round(cx + rr * Math.cos(th)), y = Math.round(cy - rr * Math.sin(th)), o = (y * S.w + x) * 4, red = S.d[o] > 130 && S.d[o + 1] < 110; if (red && !on) r.push(rr); on = red; } return r; };
    let sum = 0, n = 0; for (let k = 0; k < 72; k++) { const a = radii(2 * Math.PI * k / 72), b = radii(2 * Math.PI * (k + 1) / 72); for (const r of a) { if (!b.length) continue; const q = b.reduce((m, v) => Math.abs(v - r) < Math.abs(m - r) ? v : m); if (Math.abs(q - r) < 25) { sum += q - r; n++; } } } out.winding = +(sum / Math.max(n, 1)).toFixed(2);
    return out;
  });
  T('the two pictures: the red glass ring ' + A.ring.join(' x ') + ' with a TRANSPARENT hole (alpha ' + A.holeAlpha + ' in the middle, ' + A.cornerAlpha + ' in the corners: cut to its circle), mostly red and dark glass (' + A.ring_.opaque + ' opaque samples, ' + A.ring_.red + ' red), and her spiral ' + A.spiral.join(' x ') + ' in crimson on black (' + A.spiral_.line + ' line samples, ' + A.spiral_.black + ' black, ' + A.spiral_.outside + ' outside its circle), winding counter-clockwise outward (+' + A.winding + ' px per step)',
    A.ring[0] === 512 && A.ring[1] === 512 && A.spiral[0] === 512 && A.spiral[1] === 512 && A.holeAlpha < 10 && A.cornerAlpha < 10 && A.ring_.opaque > 8000 && A.ring_.red > 500 && A.spiral_.line > 3000 && A.spiral_.black > 15000 && A.spiral_.outside < 50 && A.winding > 0.3 && A.hole.r > 0.85 && A.hole.r < 0.95, JSON.stringify(A));

  // ================================================================ 2. the model
  const M = await pg.evaluate(async () => {
    const g = H.setup(), r = g.r, out = {}, U = U3, box = m => { m.updateMatrixWorld(true); const bb = new THREE.Box3().setFromObject(m); return { w: +(bb.max.x - bb.min.x).toFixed(2), d: +(bb.max.z - bb.min.z).toFixed(2), h: +bb.max.y.toFixed(2), y0: +bb.min.y.toFixed(2) }; };
    out.dims = {}; for (const k of ['crate', 'crateW']) { const m = r.items.pool[k][0]; m.visible = true; m.position.set(0, 0, 0); m.rotation.y = 0; m.userData.spin.rotation.y = 0; m.userData.fun.rotation.y = 0; m.userData.fun.scale.set(1, 1, 1); out.dims[k] = box(m); out.dims[k].ring = (() => { const g2 = m.userData.ring.geometry; g2.computeBoundingBox(); return +(g2.boundingBox.max.x - g2.boundingBox.min.x).toFixed(2); })(); out.dims[k].parts = m.children.length; out.dims[k].meshes = [!!m.userData.spin, !!m.userData.ring, !!m.userData.fun]; }
    out.hit = { w: 2 * OBST.crate.hw * U.X, wPlayer: 2 * (OBST.crate.hw + P_HW) * U.X, h: OBST.crate.y1 * U.Y };
    for (let k = 0; k < 40 && !(VortexArt.materials().ring.visible && VortexArt.materials().spiral.visible); k++) await new Promise(q => setTimeout(q, 100)); const M3 = VortexArt.materials(); out.loaded = M3.ring.visible && M3.spiral.visible; out.mats = { ringAlphaTest: M3.ring.alphaTest, ringMap: !!M3.ring.map, spiralMap: !!M3.spiral.map, overTransparent: M3.over.transparent, overDepthWrite: M3.over.depthWrite, overAdditive: M3.over.blending === THREE.AdditiveBlending };
    // the motion: the spiral turns counter-clockwise (rotation.y grows) with a wobble, the funnel turns the other way
    H.put('crate', 60); g.r.draw(g); const c = r.items.pool.crate[0], u = c.userData, a0 = [u.spin.rotation.y, u.fun.rotation.y]; g.time += 0.2; r.draw(g); const a1 = [u.spin.rotation.y, u.fun.rotation.y]; g.time += 0.2; r.draw(g); const a2 = [u.spin.rotation.y, u.fun.rotation.y];
    out.motion = { spin: [+(a1[0] - a0[0]).toFixed(2), +(a2[0] - a1[0]).toFixed(2)], fun: [+(a1[1] - a0[1]).toFixed(2), +(a2[1] - a1[1]).toFixed(2)] };
        // all the pictures lie flat: the normals of the ring and the spirals point up (+y), whatever the rug's heading
    { const m = r.items.pool.crate[0], up = mesh => { const g2 = mesh.geometry, n = g2.attributes.normal, v = new THREE.Vector3(n.getX(0), n.getY(0), n.getZ(0)); return +v.y.toFixed(2); }; out.flat = [m.userData.ring, m.userData.spin, m.userData.fun].map(up).join(' / '); out.flatOk = [m.userData.ring, m.userData.spin, m.userData.fun].every(x => up(x) > 0.99); }
    out.pooled = { crate: r.items.pool.crate.length, crateW: r.items.pool.crateW.length };
    return out;
  });
  T('the vortex model replaces the crate: a round rug lying FLAT, ' + M.dims.crate.ring + ' m across (' + M.dims.crate.w + ' m with its glowing rim; the crate\'s box ' + M.hit.w.toFixed(2) + ' m wide, with the runner ' + M.hit.wPlayer.toFixed(2) + '), only ' + (M.dims.crate.h * 100).toFixed(0) + ' cm thick (nothing stands up from it; the hit box still reaches ' + M.hit.h.toFixed(2) + ' m: you jump over it), made of ' + M.dims.crate.parts + ' parts incl. the ring, the spiral and its turning twin, all horizontal (' + M.flat + '); the whirlpool on the canals is the same (' + M.dims.crateW.w + ' x ' + M.dims.crateW.h + ' m); the pictures are loaded (' + M.loaded + ', the ring cut out by alpha test ' + M.mats.ringAlphaTest + '), the twin spiral additive without writing depth; 40 + 40 pooled',
    ['crate', 'crateW'].every(k => Math.abs(M.dims[k].ring - 2.0) < 0.05 && M.dims[k].ring >= M.hit.w && M.dims[k].ring <= M.hit.wPlayer + 0.1 && M.dims[k].w < 2.5 && M.dims[k].h < 0.08 && M.dims[k].y0 > -0.05 && M.dims[k].meshes.every(Boolean)) && M.loaded && M.mats.ringAlphaTest === 0.5 && M.mats.ringMap && M.mats.spiralMap && M.mats.overTransparent && M.mats.overAdditive && !M.mats.overDepthWrite && M.flatOk && M.pooled.crate === 40 && M.pooled.crateW === 40, JSON.stringify(M.dims));
  T('it is turbulent: the spiral turns counter-clockwise (' + M.motion.spin.join(', ') + ' rad per 0.2 s: its lines flow IN, since it winds counter-clockwise outward) with a wobble, the twin spiral laid over it turns the other way (' + M.motion.fun.join(', ') + ') so their lines interfere',
    M.motion.spin.every(v => v > 0.3) && M.motion.fun.every(v => v < -0.1) && Math.abs(M.motion.spin[0] - M.motion.spin[1]) > 0.005, JSON.stringify(M.motion));

  // ================================================================ 3. the rules are the crate's
  const RU = await pg.evaluate(() => {
    const out = {}; let g = H.setup(); H.put('crate', 80); H.run(60); out.hit = { state: g.state, killer: g.killer && g.killer.kind, flashShake: [g.flash > 0, +g.shake.toFixed(2)], overDelay: g.overDelay };
    g = H.setup(); H.put('crate', 80); g.jumpKey && g.jumpKey(); let cleared = false; for (let i = 0; i < 90 && g.state === 'play'; i++) { const it = g.world.items[0]; if (i === 0 || (it && it.z - g.p.z < 60 && g.p.jy === 0 && it.z > g.p.z)) { g.onKey({ code: 'Space', key: ' ', repeat: false, preventDefault() {} }, true); } g.advance(1 / 60); g.time += 1 / 60; } out.jump = { state: g.state, z: Math.round(g.p.z - 1200) };
    g = H.setup(); g.pk.t.aura = g.pk.tot.aura = 15; const it = H.put('crate', 80); H.run(60); out.aura = { state: g.state, taken: !!it.taken, aura: +g.pk.t.aura.toFixed(1) };
    g = H.setup(1); H.put('crate', 80, -1); H.run(60); out.otherLane = g.state;
    g = H.setup(); H.put('barrier', 80); H.run(60); out.barrier = { state: g.state, killer: g.killer && g.killer.kind, delay: g.overDelay, shake: +g.shake.toFixed(2) };
    return out;
  });
  T('the rules are the crate\'s: a hit ends the run (' + RU.hit.state + ', killer ' + RU.hit.killer + ', flash ' + RU.hit.flashShake[0] + ', a small shake ' + RU.hit.flashShake[1] + '), a jump clears it (' + RU.jump.state + ' ' + RU.jump.z + ' units on), the aura takes one hit and destroys it (' + RU.aura.state + ', taken ' + RU.aura.taken + ', aura ' + RU.aura.aura + '), another lane is safe (' + RU.otherLane + '); a barrier is still a crash (killer ' + RU.barrier.killer + ', shake ' + RU.barrier.shake + ', panel delay ' + RU.barrier.delay + ' s)',
    RU.hit.state === 'over' && RU.hit.killer === 'crate' && RU.hit.flashShake[0] && RU.hit.flashShake[1] < 0.2 && RU.hit.overDelay === 0.85 && RU.jump.state === 'play' && RU.jump.z > 200 && RU.aura.state === 'play' && RU.aura.taken && RU.aura.aura < 15 && RU.otherLane === 'play' && RU.barrier.state === 'over' && RU.barrier.killer === 'barrier' && RU.barrier.shake === 0.35 && RU.barrier.delay === 0.5, JSON.stringify(RU));

  // ================================================================ 4. the absorption
  const AB = await pg.evaluate(() => {
    const out = { f: [] }; const g = H.setup(), r = g.r; H.put('crate', 60); H.run(60); const K = g.killer; out.died = g.state;
    for (const t of [0.02, 0.2, 0.4, 0.6, 0.78, 1.0]) { H.overTo(t); const gp = r.runner.group, pv = r.runner.pivot, kp = r.kill && r.kill.g ? r.kill.g.position : null, sh = r.runner.shadow;
      out.f.push({ t, vis: gp.visible, s: +gp.scale.x.toFixed(3), y: +gp.position.y.toFixed(2), x: +gp.position.x.toFixed(2), z: +gp.position.z.toFixed(2), kz: kp ? +kp.z.toFixed(2) : null, kx: kp ? +kp.x.toFixed(2) : null, spin: +pv.rotation.y.toFixed(2), tip: +pv.rotation.x.toFixed(2), shadowVis: sh.visible, boost: r.items.absorbing ? +r.items.absorbing.k.toFixed(2) : 0 }); }
    out.panel = { early: null }; const g2 = H.setup(); H.put('crate', 60); H.run(60); H.overTo(0.6); out.panel.early = g2.state === 'over' && g2.overT > 0.5 && !(g2.overT > g2.overDelay); g2.onKey({ code: 'Space', key: ' ', repeat: false, preventDefault() {} }, true); out.panel.stillOver = g2.state; H.overTo(0.9); out.panel.ready = g2.overT > g2.overDelay; g2.onKey({ code: 'Space', key: ' ', repeat: false, preventDefault() {} }, true); out.panel.restarted = g2.state; out.panel.scaleBack = r.runner.group.scale.x;
    r.draw(g2); out.panel.scaleAfter = +r.runner.group.scale.x.toFixed(2); out.panel.visibleAfter = r.runner.group.visible;
    return out;
  });
  const F = AB.f, last = F[F.length - 1];
  T('the runner is ABSORBED, not crashed: after the hit the runner is pulled to the middle of the disc (x ' + F.map(f => f.x).join(', ') + ', z ' + F.map(f => f.z).join(', ') + ' towards the disc at ' + F[0].kx + ', ' + F[0].kz + '), shrinks (' + F.map(f => f.s).join(', ') + ') and sinks (y ' + F.map(f => f.y).join(', ') + '), turning faster and faster (' + F.map(f => f.spin).join(', ') + '), is never tipped over (' + F.map(f => f.tip).join(', ') + '), its shadow with it, gone at the end (visible ' + last.vis + '); the disc spins up (' + F.map(f => f.boost).join(', ') + ')',
    AB.died === 'over' && F[0].s > 0.95 && F.every((f, i) => i === 0 || f.s <= F[i - 1].s + 1e-6) && F[4].s < 0.35 && last.s < 0.1 && !last.vis && Math.abs(F[4].z - F[4].kz) < 0.5 * Math.abs(F[0].kz - 0) + 0.3 && F.every(f => Math.abs(f.tip) < 0.05) && F[4].y < F[1].y && Math.abs(F[3].spin) > Math.abs(F[1].spin) && F[2].boost > 0.3 && F[0].shadowVis, JSON.stringify(AB.f));
  T('the game-over panel and the restart wait for the vortex to finish (the panel is not up at ' + 0.6 + ' s: ' + AB.panel.early + ', Space does nothing then: ' + AB.panel.stillOver + '), they come at 0.85 s (' + AB.panel.ready + ', Space restarts: ' + AB.panel.restarted + '), and a restart gives the runner its size back (' + AB.panel.scaleAfter + ', visible ' + AB.panel.visibleAfter + ')',
    AB.panel.early && AB.panel.stillOver === 'over' && AB.panel.ready && AB.panel.restarted === 'play' && AB.panel.scaleAfter === 1 && AB.panel.visibleAfter, JSON.stringify(AB.panel));

  // ================================================================ 5. the sound and the other avatars
  const SO = await pg.evaluate(async () => {
    const g = H.setup(), a = g.sfx, out = {}; out.voice = typeof GameAudio.voices.absorb; const c0 = a.counts.crash || 0; let args = []; const vc = GameAudio.voices.crash, va = GameAudio.voices.absorb; GameAudio.voices.crash = (c, o, t, x) => { args.push(x); return vc(c, o, t, x); }; GameAudio.voices.absorb = (c, o, t) => { args.push('absorb-voice'); return va(c, o, t); };
    a.unlock(); await new Promise(q => setTimeout(q, 200)); H.put('crate', 60); H.run(60); await new Promise(q => setTimeout(q, 100)); out.crash = (a.counts.crash || 0) - c0; out.args = args.slice();
    const g2 = H.setup(); args = []; H.put('barrier', 60); H.run(60); await new Promise(q => setTimeout(q, 100)); out.barrierArgs = args.slice(); GameAudio.voices.crash = vc; GameAudio.voices.absorb = va;
    // the voice rendered offline: it makes sound (energy), longer than the crash, and ends with a low gulp
    const render = async v => { const oc = new OfflineAudioContext(1, 44100 * 2, 44100), gn = oc.createGain(); gn.connect(oc.destination); v(oc, gn, 0); const buf = await oc.startRendering(), d = buf.getChannelData(0); let e = 0, last = 0; for (let i = 0; i < d.length; i++) { e += d[i] * d[i]; if (Math.abs(d[i]) > 0.01) last = i; } return { rms: Math.sqrt(e / d.length), dur: last / 44100 }; };
    out.absorb = await render(GameAudio.voices.absorb); out.crashV = await render((c, o, t) => GameAudio.voices.crash(c, o, t));
    return out;
  });
  T('the sound: the crash is requested once (' + SO.crash + ') and wears the absorb voice for a vortex (' + SO.args.join(', ') + '), the old crash for a barrier (' + SO.barrierArgs.join(', ') + '); the absorb voice rendered offline has energy (rms ' + SO.absorb.rms.toFixed(3) + ') and lasts ' + SO.absorb.dur.toFixed(2) + ' s (the crash ' + SO.crashV.dur.toFixed(2) + ' s)',
    SO.voice === 'function' && SO.crash === 1 && SO.args.includes('absorb-voice') && SO.args.includes('vortex') && !SO.barrierArgs.includes('absorb-voice') && SO.absorb.rms > 0.01 && SO.absorb.dur > 0.8 && SO.absorb.dur > SO.crashV.dur, JSON.stringify(SO));
  T('no JS errors (3D)', pg.errs.length === 0, pg.errs.slice(0, 2).join('|')); await pg.context().close();

  // the other avatars: Zagla is absorbed too (a card with a body); the 3D-model avatar turns its group
  for (const av of ['zagla', '3d']) {
    const pa = await open(base + '?avatar=' + av); await pa.evaluate(() => { window.H = { }; });
    const R = await pa.evaluate(() => {
      const g = __wf; g.start(); g.p.z = 1200; g.world.extend(5200); g.world.items = [{ kind: 'crate', z: 1260, x: 0, h: 12, tag: 'x' }]; g.p.x = 0; g.p.speed = 340; g.state = 'play'; for (let i = 0; i < 60 && g.state === 'play'; i++) { g.advance(1 / 60); g.time += 1 / 60; }
      const out = { state: g.state, cls: g.r.runner.constructor.name, s: [] }; for (const t of [0.1, 0.4, 0.78]) { for (let i = 0; i < 100 && g.overT < t; i++) { g.advance(1 / 60); g.time += 1 / 60; } g.r.draw(g); out.s.push(+g.r.runner.group.scale.x.toFixed(2)); } return out;
    });
    T('the ' + av + ' avatar (' + R.cls + ') is absorbed too: its size goes ' + R.s.join(' > '), R.state === 'over' && R.s[0] > R.s[1] && R.s[1] > R.s[2] && R.s[2] < 0.35 && !pa.errs.length, JSON.stringify(R) + pa.errs.join('|')); await pa.context().close();
  }

  // ================================================================ 6. the whirlpool on the canals, and the classic 2D game
  const p2 = await open(base);
  const WH = await p2.evaluate(() => {
    const g = __wf, r = g.r, out = {}; let P = null; g.world.extend(150000); for (const q of g.world.pieces) if (q.type === 'seg' && /^utrecht/.test(q.id)) { P = q; break; } if (!P) return { error: 'no utrecht' };
    g.start(); g.world.extend(150000); const C = g.world.pieces.find(q => q.type === 'seg' && q.id === 'utrechtC'); out.have = !!C; if (!C) return out;
    g.world.items = g.world.items.filter(i => i.kind === 'prop'); const it = { kind: 'crate', z: C.z0 + 800, x: 0, h: 12, tag: 'w' }; g.world.items.push(it); g.state = 'play'; g.p.z = it.z - 80; g.p.x = 0; g.p.speed = 0; g.world.extend(g.p.z + 3000); const a = g.world.playerBand(g.p.z + 300, 0); g.bgTo = a.to; g.bgT = a.t; for (let i = 0; i < 4; i++) { g.time += 1 / 60; r.draw(g); }
    out.used = { W: r.items.used.crateW, dry: r.items.used.crate }; out.dropped = r.items.dropped; return out;
  });
  T('on the canals of Utrecht the vortex is a whirlpool: the water pool is used (' + WH.used.W + ' of crateW, ' + WH.used.dry + ' dry), nothing dropped (' + WH.dropped + ')', WH.have && WH.used.W === 1 && WH.used.dry === 0 && WH.dropped === 0, JSON.stringify(WH));
  await p2.context().close();
  const p3 = await open(base + '2d.html'); const D2 = await p3.evaluate(() => {
    const g = window.__wf || null; const out = { has: !!g, vortex: typeof VortexArt, absorb: g && g.r ? g.r.supportsAbsorb : undefined, killer: g ? 'killer' in g : null };
    if (g) { g.start(); g.world.extend(8000); g.world.items = [{ kind: 'crate', z: 400, x: 0, h: 12, tag: 'x' }]; g.p.z = 330; g.p.speed = 340; g.p.x = 0; g.state = 'play'; for (let i = 0; i < 60 && g.state === 'play'; i++) g.advance(1 / 60); out.state = g.state; out.delay = g.overDelay; out.shake = g.shake; out.killer = g.killer && g.killer.kind; }
    return out;
  });
  T('the classic 2D game keeps its crates and its crash (no vortex module: ' + D2.vortex + ', supportsAbsorb ' + D2.absorb + '; a hit: ' + D2.state + ', shake ' + D2.shake + ', panel delay ' + D2.delay + ' s)', D2.has && D2.vortex === 'undefined' && !D2.absorb && D2.state === 'over' && D2.shake === 0.35 && D2.delay === 0.5, JSON.stringify(D2));
  T('no JS errors (2D)', p3.errs.length === 0, p3.errs.slice(0, 2).join('|')); await p3.context().close();

  console.log('\n' + res.filter(Boolean).length + '/' + res.length + ' passed');
  await b.close(); srv.close(); process.exit(res.every(Boolean) ? 0 : 1);
})().catch(e => { console.log('TEST ERROR', e.message); process.exit(1); });
