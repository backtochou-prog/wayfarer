// WAYFARER regression test: the avatar is the user's retouched artwork (RunnerSprite), with the 3D model still available via ?avatar=3d.
// Checks the default and the switch, that both images load (also from file://), the view shown in each state, size / ground contact / slide
// height, that the card always faces the camera whatever the renderer's yaw, and that nothing leaks.
//
// Run:  node tests/qa3d_avatar.js     (needs playwright-core and a Chromium: CHROMIUM=/path/to/chrome, NODE_PATH or PW_CORE as for the other tests)
const http = require('http'), fs = require('fs'), path = require('path');
let chromium; try { ({ chromium } = require('playwright-core')); } catch (e) { ({ chromium } = require(process.env.PW_CORE || 'playwright-core')); }
const ROOT = path.join(__dirname, '..'), PORT = 8116;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const res = []; const T = (n, ok, i = '') => { res.push(ok); console.log((ok ? 'PASS ' : 'FAIL ') + n + (i !== '' ? '  [' + i + ']' : '')); };

(async () => {
  const srv = http.createServer((q, r) => {
    let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
    fs.readFile(path.join(ROOT, p), (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' }); r.end(d); } });
  }).listen(PORT);
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/root/.cache/ms-playwright/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const open = async url => { const pg = await (await b.newContext({ viewport: { width: 480, height: 270 } })).newPage(); pg.errs = []; pg.on('pageerror', e => pg.errs.push(e.message)); pg.on('console', m => m.type() === 'error' && pg.errs.push(m.text())); await pg.goto(url); await pg.waitForFunction(() => window.__wf, null, { timeout: 30000 }); await pg.waitForTimeout(700); return pg; };

  // ---------------------------------------------------------------- 1. default avatar, images loaded, view per state
  const pg = await open(process.env.TEST_URL || 'http://localhost:' + PORT + '/');
  const A = await pg.evaluate(async () => {
    const g = __wf, r = g.r, rn = r.runner, out = {};
    out.isSprite = rn instanceof RunnerSprite; out.has3dClass = typeof Runner3D === 'function';
    out.assets = Object.fromEntries(['back', 'side'].map(k => [k, { w: AVATAR_ASSETS[k].w, h: AVATAR_ASSETS[k].h, mh: +AVATAR_ASSETS[k].mh.toFixed(2) }]));
    for (let i = 0; i < 50 && !(rn.cards.back.material.visible && rn.cards.side.material.visible); i++) await new Promise(r => setTimeout(r, 100));
    out.loaded = ['back', 'side'].map(k => { const m = rn.cards[k].material; return m.map.image.complete && m.map.image.naturalWidth === AVATAR_ASSETS[k].w && m.map.image.naturalHeight === AVATAR_ASSETS[k].h && m.visible; });
    const st = o => Object.assign({ time: 3, runRate: 3, airborne: false, vy: 0, sliding: false, lean: 0, state: 'play' }, o);
    const box = () => { rn.group.updateMatrixWorld(true); const bb = new THREE.Box3().setFromObject(rn.group); return { top: +bb.max.y.toFixed(2), bottom: +bb.min.y.toFixed(2), half: +Math.max(-bb.min.x, bb.max.x).toFixed(2) }; };
    const pose = (name, o, yaw) => { rn.group.position.set(0, 0, 0); rn.group.rotation.y = yaw || 0; for (let i = 0; i < 90; i++) rn.update(1 / 60, st(o)); out[name] = box(); out[name].view = rn.cards.back.visible ? 'back' : rn.cards.side.visible ? 'side' : 'none'; };
    pose('stand', {}); pose('jump', { airborne: true, vy: 3 }); pose('slide', { sliding: true }); pose('over', { state: 'over' }); pose('title', { state: 'title', time: 3.1 });
    // the card always faces the camera (world normal +z) whatever yaw the renderer gives the group: heading on a curve, the menu's half turn
    out.facing = [0, 0.3, -0.4, Math.PI].map(yaw => { rn.group.rotation.y = yaw; for (let i = 0; i < 5; i++) rn.update(1 / 60, st({})); rn.group.updateMatrixWorld(true); const n = new THREE.Vector3(0, 0, 1).transformDirection(rn.cards.back.matrixWorld); return +n.z.toFixed(3); });
    // the renderer passes the direction of the (orbiting) menu camera as faceYaw: the card turns to face it exactly
    out.faceYaw = [0.5, -0.8].map(fy => { rn.group.rotation.y = Math.PI; for (let i = 0; i < 5; i++) rn.update(1 / 60, st({ state: 'title', time: 3.1, faceYaw: fy })); rn.group.updateMatrixWorld(true); const card = rn.cards.back.visible ? rn.cards.back : rn.cards.side, n = new THREE.Vector3(0, 0, 1).transformDirection(card.matrixWorld); return +(n.x * Math.sin(fy) + n.z * Math.cos(fy)).toFixed(3); });
    rn.group.rotation.y = 0; rn.update(1 / 60, st({ state: 'pause', time: 9 })); out.pauseHolds = true;
    return out;
  });
  T('default avatar is the retouched artwork (RunnerSprite); the 3D model class is still there', A.isSprite && A.has3dClass, JSON.stringify({ isSprite: A.isSprite, has3d: A.has3dClass }));
  T('both images load at their embedded size and become visible', A.loaded.every(Boolean) && A.assets.back.h === 800 && A.assets.side.h === 800 && Math.abs(A.assets.back.mh - 1.9) < 0.02 && Math.abs(A.assets.side.mh - 1.9) < 0.05, JSON.stringify({ loaded: A.loaded, assets: A.assets }));
  T('the view follows the state: back while playing / jumping / sliding / tripping and, by default, in the menu', A.stand.view === 'back' && A.jump.view === 'back' && A.slide.view === 'back' && A.over.view === 'back' && A.title.view === 'back', JSON.stringify({ stand: A.stand.view, jump: A.jump.view, slide: A.slide.view, over: A.over.view, title: A.title.view }));
  T('size and ground: standing ~1.9 m (+ run bounce), feet on the road, jumping clear of it, sliding under 0.9 m, tripped lower still', A.stand.top >= 1.85 && A.stand.top <= 2.05 && A.stand.bottom >= -0.06 && A.stand.bottom <= 0.1 && A.jump.bottom >= -0.01 && A.slide.top <= 0.9 && A.slide.bottom >= -0.06 && A.over.top < A.slide.top + 0.2 && A.stand.half >= 0.43, JSON.stringify({ stand: A.stand, jump: A.jump, slide: A.slide, over: A.over }));
  T('the card always faces the camera whatever the group\'s yaw (heading on curves, the menu turn), and squarely faces the menu camera\'s direction (faceYaw)', A.facing.every(z => z > 0.999) && A.faceYaw.every(v => v > 0.999), JSON.stringify({ facing: A.facing, faceYaw: A.faceYaw }));

  // ---------------------------------------------------------------- 2. no leaks over a long play-through; textures stay at 2
  const L = await pg.evaluate(() => {
    const g = __wf, r = g.r; g.start(); g.world.items = [];
    const hazardFree = () => { g.world.items = g.world.items.filter(i => i.kind === 'coin' || i.kind === 'prop'); };
    for (let f = 0; f < 30; f++) { g.advance(1 / 60); r.draw(g); }                       // real frames first, so the textures are uploaded
    const rn = r.runner, kids0 = r.scene.children.length, own0 = rn.pivot.children.length, geoIds0 = ['back', 'side'].map(k => rn.cards[k].geometry.uuid).join();
    const play = n => { for (let f = 0; f < n && g.state === 'play'; f++) { if (f % 20 === 0) hazardFree(); g.advance(1 / 60); if (f % 15 === 0) r.draw(g); if (f === 600) g.keys.left = true; if (f === 700) { g.keys.left = false; g.keys.right = true; } if (f === 800) g.keys.right = false; } r.draw(g); };
    play(1800); const tex1 = r.renderer.info.memory.textures;                              // textures are uploaded when first drawn: the tree atlas, the avatar's back view, the sun glow and the sign atlas of the tram street (warmed up at start), and the neon atlas once the district comes into view
    play(1800); const tex2 = r.renderer.info.memory.textures;                              // a second 30 s: nothing new may appear
    return { state: g.state, tex: [tex1, tex2], kids: [kids0, r.scene.children.length], own: [own0, rn.pivot.children.length], sameCards: geoIds0 === ['back', 'side'].map(k => rn.cards[k].geometry.uuid).join() };   // (geometry counts also grow as new scenery is first drawn: that is the GPU upload of props, not the avatar)
  });
  T('no leaks: the uploaded textures stop growing (<= 14: trees, the two avatar views, three neon atlases, the tram signs, the sun glow, the blossom tree, the board rear, the board trail gradient, the neon shop windows, the fourth neon set, the mixed flowers), the 2 cards and the scene children stay constant over 60 s of play', L.state === 'play' && L.tex[0] >= 1 && L.tex[0] <= 14 && L.tex[0] === L.tex[1] && L.kids[0] === L.kids[1] && L.own[0] === 2 && L.own[1] === 2 && L.sameCards, JSON.stringify(L));
  T('no JS errors in the default avatar session', pg.errs.length === 0, pg.errs.slice(0, 2).join('|'));
  await pg.context().close();                                   // close it: a page left running keeps drawing and slows every page opened after it (software GL)

  // ---------------------------------------------------------------- 3. ?avatar=3d selects the 3D model; file:// works (the images are embedded)
  if (!process.env.TEST_URL) {
    const p3 = await open('http://localhost:' + PORT + '/?avatar=3d');
    const M = await p3.evaluate(() => ({ is3d: __wf.r.runner instanceof Runner3D, kids: __wf.r.runner.group.children.length }));
    T('?avatar=3d selects the 3D model', M.is3d && M.kids > 0 && p3.errs.length === 0, JSON.stringify({ is3d: M.is3d, errs: p3.errs.length }));
    await p3.context().close();
    const ps = await open('http://localhost:' + PORT + '/?menu=side');
    const V = await ps.evaluate(() => { const rn = __wf.r.runner; rn.group.rotation.y = Math.PI; for (let i = 0; i < 5; i++) rn.update(1 / 60, { state: 'title', time: 3.1, runRate: 3, airborne: false, vy: 0, sliding: false, lean: 0 }); return { menuView: rn.menuView, side: rn.cards.side.visible, back: rn.cards.back.visible }; });
    T('?menu=side shows the side view in the menu', V.menuView === 'side' && V.side && !V.back && ps.errs.length === 0, JSON.stringify(V));
    await ps.context().close();
    const pf = await open('file://' + path.join(ROOT, 'index.html'));
    const F = await pf.evaluate(async () => { const rn = __wf.r.runner; for (let i = 0; i < 50 && !rn.cards.back.material.visible; i++) await new Promise(r => setTimeout(r, 100)); return { sprite: rn instanceof RunnerSprite, visible: rn.cards.back.material.visible && rn.cards.side.material.visible }; });
    T('works from file:// (images embedded as data URIs, no CORS problem)', F.sprite && F.visible && pf.errs.length === 0, JSON.stringify({ ...F, errs: pf.errs.slice(0, 1) }));
  }
  console.log('\n' + res.filter(Boolean).length + '/' + res.length + ' passed');
  await b.close(); srv.close(); process.exit(res.every(Boolean) ? 0 : 1);
})().catch(e => { console.log('TEST ERROR', e.message); process.exit(1); });
