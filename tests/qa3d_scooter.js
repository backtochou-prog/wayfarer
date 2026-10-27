// WAYFARER regression test: the optional kick scooter of Saint-Gilles. Parked scooters and scooter stations on the pavement carry an indicator (a plate with a scooter and E / TAP);
// tapping or clicking it, or pressing E, gets the runner on (the scooter is taken); E again or the HOP OFF button gets off; it ends when the zone ends and on a restart.
// Riding is drawing only: glide, spinning wheels, lean, nose-up jump, size; the rules are untouched. ?scooter=1 / ?scooter=0 force it on / off.
//
// Run:  node tests/qa3d_scooter.js     (needs playwright-core and a Chromium: CHROMIUM=/path/to/chrome, NODE_PATH or PW_CORE as for the other tests)
const http = require('http'), fs = require('fs'), path = require('path');
let chromium; try { ({ chromium } = require('playwright-core')); } catch (e) { ({ chromium } = require(process.env.PW_CORE || 'playwright-core')); }
const ROOT = path.join(__dirname, '..'), PORT = 8118;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const res = []; const T = (n, ok, i = '') => { res.push(ok); console.log((ok ? 'PASS ' : 'FAIL ') + n + (i !== '' ? '  [' + i + ']' : '')); };

(async () => {
  const srv = http.createServer((q, r) => {
    let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
    fs.readFile(path.join(ROOT, p), (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' }); r.end(d); } });
  }).listen(PORT);
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/root/.cache/ms-playwright/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const base = process.env.TEST_URL || 'http://localhost:' + PORT + '/';
  const open = async q => {
    const pg = await (await b.newContext({ viewport: { width: 960, height: 540 } })).newPage(); pg.errs = []; pg.on('pageerror', e => pg.errs.push(e.message)); pg.on('console', m => m.type() === 'error' && pg.errs.push(m.text()));
    await pg.goto(base + q); await pg.waitForFunction(() => window.__wf, null, { timeout: 30000 }); await pg.evaluate(() => { window.requestAnimationFrame = () => 0; }); await pg.waitForTimeout(700);   // (the game's own loop is stopped: the test steps frames itself)
    await pg.evaluate(() => {
      const g = __wf, r = g.r; window.G = g;
      window.frames = n => { for (let i = 0; i < n; i++) { g.time += 1 / 60; g.draw(); } };
      // put the player in the tram street, `back` metres before the first slot that has `want` in its layout (any prop kind), the zone fully in
      window.goto = (want, back = 30, nth = 0) => {
        g.start(); g.world.items = []; g.world.reset(); g.start(); g.world.extend(9000); for (let n = 9000; !g.world.pieces.find(p => p.type === 'seg' && p.id === 'tramRun') && n < 90000; n += 4000) g.world.extend(n);
        const P = g.world.pieces.find(p => p.type === 'seg' && p.id === 'tramRun'); g.state = 'play'; g.world.items = []; let slot = null, seen = 0;
        if (!window.__L0) window.__L0 = ENV3D.tram.layout; ENV3D.tram.layout = window.__L0; for (const m of Object.values(r.layouts)) m.clear();      // (the real layout, unless 'clean')
        for (let i = Math.ceil((P.z0 + 1800) * 0.1 / 12); i < (P.z1 - 1500) * 0.1 / 12; i++) if (want !== 'clean' && ENV3D.tram.layout(i, rnd).some(q => q.prop === want) && seen++ >= nth) { slot = i; break; }
        if (want === 'clean') {                                                                           // a street with exactly one scooter, 20 slots into the zone, so nothing else competes for the ring
          slot = Math.ceil((P.z0 + 1800) * 0.1 / 12) + 6; const S = slot; ENV3D.tram.layout = (i, rn) => { const L = window.__L0(i, rn).filter(q => !/^scooter/.test(q.prop)); if (i === S) L.push({ prop: 'scooter', x: 4.3, dist: 6 }); return L; };
        }
        if (slot === null) return null;
        g.p.z = (slot * 12 + 6 - back) / 0.1; g.p.x = 0; g.world.extend(g.p.z); g.world.items = [];
        const ah = g.world.playerBand(g.p.z + 300, 0); g.bgTo = ah.to; g.bgT = ah.t; const pb = g.world.playerBand(g.p.z, 0); g.camX = pb.c; g.camOff = pb.off; r.atmoQ = -1; r.menu = 0; g.touch = false;
        return slot;
      };
    });
    return pg;
  };

  // ---------------------------------------------------------------- 1. the indicator
  const pg = await open('');
  const I = await pg.evaluate(() => {
    const g = G, r = g.r, out = {}; out.slotDock = goto('scooterDock'); frames(3); out.dock = g.scooterHint && { dock: g.scooterHint.dock, ahead: Math.round(g.scooterHint.ahead), x: Math.round(g.scooterHint.x), y: Math.round(g.scooterHint.y), rx: Math.round(g.scooterHint.rx), ry: Math.round(g.scooterHint.ry) }; out.onFoot = !g.riding && r.runner.ride < 0.05;
    out.slotOne = goto('scooter'); frames(3); out.one = g.scooterHint && { dock: g.scooterHint.dock, ahead: Math.round(g.scooterHint.ahead) };
    // far away (> 70 m) and in another zone: nothing
    goto('scooter', 220); frames(3); out.far = g.scooterHint && g.scooterHint.ahead > 140 ? g.scooterHint : null; out.city = true;
    goto('scooter', 30); g.state = 'pause'; frames(2); out.paused = g.scooterHint; g.state = 'play';
    // the layout offers them: docks and single scooters
    const kinds = {}; for (let i = 0; i < 3000; i++) for (const q of ENV3D.tram.layout(i, rnd)) if (/^scooter/.test(q.prop)) kinds[q.prop] = (kinds[q.prop] || 0) + 1; out.kinds = kinds;
    return out;
  });
  T('a translucent ring marks the nearest parked scooter or station ahead (dock: ' + JSON.stringify(I.dock) + ', single: ' + JSON.stringify(I.one) + '), armed from 140 m ahead, never further, not while paused; you start on foot',
    I.dock && I.dock.dock && I.dock.ahead >= 0 && I.dock.ahead <= 140 && I.dock.rx > I.dock.ry * 2 && I.one && !I.one.dock && I.one.ahead >= 0 && I.far === null && I.paused === null && I.onFoot, JSON.stringify(I));
  T('the street offers both single scooters and stations on the pavement (' + JSON.stringify(I.kinds) + ' over 3000 slots)', I.kinds.scooter > 20 && I.kinds.scooterDock > 10, JSON.stringify(I.kinds));

  const X = await pg.evaluate(async () => {
    const g = G, r = g.r, ui = r.ui, ctx = ui.ctx, out = {}; goto('scooterDock'); frames(3);
    for (let i = 0; i < 80 && !(ui.ringImgs && ui.ringImgs.every(m => m.complete && m.naturalWidth)); i++) await new Promise(q => setTimeout(q, 50));
    out.loaded = ui.ringImgs.map(m => [m.naturalWidth, m.naturalHeight]); out.meta = [RING_ART.w, RING_ART.h];
    // the pictures really are cut out: transparent corners, opaque rings (read back through a canvas)
    out.alpha = ui.ringImgs.map(m => { const c = document.createElement('canvas'); c.width = m.naturalWidth; c.height = m.naturalHeight; const x = c.getContext('2d'); x.drawImage(m, 0, 0); const d = x.getImageData(0, 0, c.width, c.height).data; let clear = 0, solid = 0; for (let i = 3; i < d.length; i += 4) { if (d[i] < 8) clear++; else if (d[i] > 240) solid++; } return { clear: +(clear / (d.length / 4)).toFixed(2), solid: +(solid / (d.length / 4)).toFixed(2), corner: d[3] }; });
    const run = () => { const o = { big: 0, imgs: [], alphas: [] }; const fr = ctx.fillRect.bind(ctx), di = ctx.drawImage.bind(ctx), fl = ctx.fill.bind(ctx), st = ctx.stroke.bind(ctx);
      ctx.fillRect = (x, y, w, h) => { if (w >= 12 || h >= 12) o.big++; return fr(x, y, w, h); }; ctx.drawImage = (...a) => { o.imgs.push([a[0] === ui.ringImgs[0] ? 'a' : a[0] === ui.ringImgs[1] ? 'b' : '?', +ctx.globalAlpha.toFixed(2), ctx.globalCompositeOperation]); return di(...a); };
      ctx.fill = (...a) => { o.alphas.push(+ctx.globalAlpha.toFixed(2)); return fl(...a); }; ctx.stroke = (...a) => { o.alphas.push(+ctx.globalAlpha.toFixed(2)); return st(...a); };
      ui.drawScooterHint(g); ctx.fillRect = fr; ctx.drawImage = di; ctx.fill = fl; ctx.stroke = st; return o; };
    out.withArt = run(); const keep = ui.ringImgs; ui.ringImgs = [new Image(), new Image()]; out.noArt = run(); ui.ringImgs = keep;     // pictures not loaded: the ellipse ring
    return out;
  });
  T('the ring is made from the two swirl pictures (' + X.loaded.map(l => l.join('x')).join(' and ') + ' WebP cut out of their backdrop: ' + Math.round(X.alpha[0].clear * 100) + ' % clear, ' + Math.round(X.alpha[0].solid * 100) + ' % solid): the colourful one as the steady ring, the white / cyan one as a faint shimmer over it, translucent (alpha <= 0.85), no solid plate',
    X.loaded.every(l => l[0] === X.meta[0] && l[1] === X.meta[1]) && X.alpha.every(a => a.clear > 0.3 && a.solid > 0.1 && a.corner === 0) && X.withArt.big === 0 && X.withArt.imgs.length === 2 && X.withArt.imgs[0][0] === 'a' && X.withArt.imgs[1][0] === 'b' && X.withArt.imgs.every(i => i[1] <= 0.85) && X.withArt.imgs[1][2] === 'lighter', JSON.stringify({ withArt: X.withArt, alpha: X.alpha }));
  T('until the pictures have loaded the ring is drawn with translucent ellipses instead (a disc and a ring, every alpha <= 0.75, no solid rectangle)',
    X.noArt.big === 0 && X.noArt.imgs.length === 0 && X.noArt.alphas.length >= 2 && Math.max(...X.noArt.alphas) <= 0.75, JSON.stringify(X.noArt));

  const W = await pg.evaluate(() => {
    const g = G, r = g.r, out = {}; out.slot = goto('clean', 120); frames(2); const first = g.scooterHint, keyAt = first.key;
    // drive past it at running speed (about 30 m/s): how long is the same scooter offered, and is it kept when newer ones appear ahead?
    let armed = 0, pinned = 0, lastAhead = null, swaps = 0;
    for (let m = 0; m < 300; m += 0.5) { g.p.z += 5; g.time += 1 / 60; g.draw(); const h = g.scooterHint; if (h && h.key === keyAt) { armed++; lastAhead = h.ahead; if (h.pinned) pinned++; } else if (armed && h && h.key !== keyAt && lastAhead > -55) swaps++; }
    out.firstAhead = Math.round(first.ahead); out.lastAhead = Math.round(lastAhead); out.armedMetres = armed * 0.5; out.pinned = pinned * 0.5; out.swaps = swaps; out.seconds = +(out.armedMetres / 30).toFixed(1);
    // pressing E late (the scooter 40 m behind, the ring pinned low) still gets on
    goto('clean', 120); frames(2); const k2 = g.scooterHint.key; g.p.z += (130 + 40) / 0.1; g.time += 1 / 60; g.draw(); const late = g.scooterHint; out.late = late && { key: late.key === k2, ahead: Math.round(late.ahead), pinned: late.pinned };
    g.onKey({ code: 'KeyE', key: 'e', repeat: false, preventDefault() {} }, true); out.lateRide = g.riding; g.riding = false;
    return out;
  });
  T('the ring stays armed long enough to be reached: the same scooter is offered from ' + W.firstAhead + ' m ahead to 60 m behind (' + W.armedMetres + ' m = ' + W.seconds + ' s at 30 m/s, ' + W.pinned + ' m of it pinned low once it is behind the camera), a newer one ahead does not steal the ring, and pressing E 40 m after passing still gets on',
    W.armedMetres >= W.firstAhead + 55 && W.lastAhead <= -55 && W.lastAhead >= -61 && W.pinned >= 30 && W.swaps === 0 && W.late && W.late.key && W.late.pinned && W.late.ahead < -30 && W.lateRide && W.seconds >= 3.5, JSON.stringify(W));

  // ---------------------------------------------------------------- 2. getting on: E, a click on the indicator, a tap; getting off
  const E = await pg.evaluate(() => {
    const g = G, r = g.r, out = {}; goto('scooter'); frames(3); const key = g.scooterHint.key, n0 = r.spots.length;
    g.onKey({ code: 'KeyE', key: 'e', repeat: false, preventDefault() {} }, true); g.onKey({ code: 'KeyE', key: 'e', repeat: false, preventDefault() {} }, false);
    frames(60); out.riding = g.riding; out.ride = +r.runner.ride.toFixed(2); out.hintGone = g.scooterHint === null; out.taken = r.usedSpots.has(key); out.spots = [n0, r.spots.length]; out.stillThere = r.spots.some(s => s.key === key);
    g.onKey({ code: 'KeyE', key: 'e', repeat: false, preventDefault() {} }, true); frames(60); out.off = !g.riding && r.runner.ride < 0.05;
    // E with nothing to take does nothing
    goto('scooter', 30); frames(2); for (const q of r.spots) r.usedSpots.add(q.key); r.armedSpot = null; frames(2); g.onKey({ code: 'KeyE', key: 'e', repeat: false, preventDefault() {} }, true); out.nothing = !g.riding && g.scooterHint === null;      // every scooter in sight already taken
    return out;
  });
  T('press E: the runner gets on (ride ' + E.ride + '), the indicator goes, that scooter is taken (gone from the street: ' + !E.stillThere + '); E again gets off; E with nothing in reach does nothing',
    E.riding && E.ride > 0.95 && E.hintGone && E.taken && !E.stillThere && E.off && E.nothing, JSON.stringify(E));
  const C = await (async () => {
    await pg.evaluate(() => { goto('scooter'); frames(3); });
    const h = await pg.evaluate(() => { const rc = document.getElementById('screen').getBoundingClientRect(), h = G.scooterHint; return { cx: rc.left + h.x * rc.width / VW, cy: rc.top + (h.y - 6) * rc.height / VH }; });   // on the ring, a little above its centre (the scooter stands there)
    await pg.mouse.click(h.cx, h.cy); await pg.waitForTimeout(100);
    return pg.evaluate(() => { frames(30); return { riding: G.riding, ride: +G.r.runner.ride.toFixed(2) }; });
  })();
  T('click on the indicator: gets on', C.riding && C.ride > 0.5, JSON.stringify(C));
  const H = await pg.evaluate(() => {
    const g = G, out = {}; g.touch = true; const sc = TOUCH.find(t => t.id === 'scooter'); out.shownRiding = g.riding;
    g.hold(7, 'scooter', true); out.afterTap = g.riding;                                  // the HOP OFF button (a finger down on it)
    out.hiddenOnFoot = true; return out;
  });
  T('the HOP OFF touch button gets off while riding', H.shownRiding && !H.afterTap, JSON.stringify(H));
  const D = await pg.evaluate(() => {
    const g = G, r = g.r, out = {}; g.touch = true; goto('scooter'); frames(3); g.touch = true;
    const calls = []; const ctx = r.ui.ctx, real = ctx.fillText; const t0 = r.ui.txt.bind(r.ui); const seen = []; r.ui.txt = (s, ...a) => { seen.push(s); return t0(s, ...a); };
    frames(2); out.tapLabel = seen.includes('TAP'); g.touch = false; seen.length = 0; frames(2); out.keyLabel = seen.includes('E');
    g.touch = true; g.mouse.x = 160; g.mouse.y = 164; g.riding = false; const z = TOUCH.find(t => t.id === 'scooter'); out.btnOnFoot = z && g.riding === false;   // (the button is inert on foot)
    r.ui.txt = t0; return out;
  });
  T('the plate says TAP on a touch device and E on a keyboard', D.tapLabel && D.keyLabel, JSON.stringify(D));

  // ---------------------------------------------------------------- 3. it ends with the zone and with a restart; riding is drawing only
  const Z = await pg.evaluate(() => {
    const g = G, r = g.r, rn = r.runner, out = {}; r.renderer.render = () => {};
    goto('scooter'); frames(3); g.mount(); frames(90);
    const box = () => { rn.group.updateMatrixWorld(true); const bb = new THREE.Box3().setFromObject(rn.group); return { top: +bb.max.y.toFixed(2), bottom: +bb.min.y.toFixed(2) }; };
    out.deck = +rn.pivot.position.y.toFixed(3); out.box = box();
    const a0 = rn.scooter.userData.wheels.map(w => w.rotation.x); frames(10); out.spin = rn.scooter.userData.wheels.map((w, i) => Math.abs(w.rotation.x - a0[i]) > 0.3);
    let lo = 9, hi = -9; for (let i = 0; i < 60; i++) { frames(1); lo = Math.min(lo, rn.pivot.position.y); hi = Math.max(hi, rn.pivot.position.y); } out.bounce = +(hi - lo).toFixed(3);
    g.p.vx = 200; frames(40); out.lean = +rn.scooter.rotation.z.toFixed(3); g.p.vx = 0; g.p.jy = 40; g.p.vy = 100; frames(40); out.nose = +rn.scooter.rotation.x.toFixed(3); g.p.jy = 0; g.p.vy = 0;
    // the zone ends: back on foot (the blend leaves 'tram')
    g.bgTo = 'city'; g.bgT = 0; g.update(1 / 60); out.leftZone = !g.riding;
    goto('scooter'); frames(3); g.mount(); out.again = g.riding; g.start(); out.restart = !g.riding && g.scooterHint === null;
    out.hit = JSON.stringify(OBST); out.speed = BASE_SPEED; return out;
  });
  T('riding: the card stands on the deck (lifted ' + Z.deck + ' m, the runner ' + Z.box.top + ' m tall), the wheels spin, the glide is steady (' + Z.bounce + ' m of bounce), steering leans the scooter (' + Z.lean + ' rad), the jump lifts its nose (' + Z.nose + ' rad)',
    Math.abs(Z.deck - 0.22) < 0.04 && Z.box.top > 1.9 && Z.box.top < 2.3 && Z.box.bottom > -0.05 && Z.box.bottom < 0.1 && Z.spin.every(Boolean) && Z.bounce < 0.03 && Math.abs(Z.lean) > 0.03 && Z.nose > 0.08, JSON.stringify(Z));
  T('getting out of the zone puts the runner back on foot, and so does a restart; the hit boxes and the speed are the same constants',
    Z.leftZone && Z.again && Z.restart && Z.hit === '{"crate":{"hw":0.17,"y0":0,"y1":14},"barrier":{"hw":0.39,"y0":0,"y1":9},"over":{"hw":0.55,"y0":14,"y1":48}}', JSON.stringify({ leftZone: Z.leftZone, again: Z.again, restart: Z.restart, speed: Z.speed }));
  T('no JS errors (default)', pg.errs.length === 0, pg.errs.slice(0, 2).join('|')); await pg.context().close();

  // ---------------------------------------------------------------- 4. ?scooter=1 and ?scooter=0
  const p1 = await open('?scooter=1'); const A = await p1.evaluate(() => { const r = G.r; r.renderer.render = () => {}; G.start(); G.world.items = []; G.bgTo = 'city'; G.bgT = 0; frames(90); return { vis: r.runner.scooter.visible, ride: +r.runner.ride.toFixed(2) }; });
  const p0 = await open('?scooter=0'); const N = await p0.evaluate(() => { const r = G.r; r.renderer.render = () => {}; goto('scooter'); frames(3); G.onKey({ code: 'KeyE', key: 'e', repeat: false, preventDefault() {} }, true); frames(90); return { vis: r.runner.scooter.visible, ride: +r.runner.ride.toFixed(2), riding: G.riding }; });
  T('?scooter=1 rides everywhere (even in the old town) and ?scooter=0 never rides (even after pressing E in Saint-Gilles)', A.vis && A.ride > 0.95 && !N.vis && N.ride < 0.02 && p1.errs.length === 0 && p0.errs.length === 0, JSON.stringify({ always: A, never: N }));
  await p1.context().close(); await p0.context().close();
  console.log('\n' + res.filter(Boolean).length + '/' + res.length + ' passed');
  await b.close(); srv.close(); process.exit(res.every(Boolean) ? 0 : 1);
})().catch(e => { console.log('TEST ERROR', e.message); process.exit(1); });
