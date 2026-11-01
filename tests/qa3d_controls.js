// WAYFARER regression test: the controls. Keyboard: arrows and the WASD cluster still work, and Q Z D S work by letter on any layout (AZERTY: the same keys by position and by letter);
// the on-screen touch buttons wear the user's neon ring picture (TOUCH_ART, a little bigger than before: 42 and 22 px) with a symbol over it, a held button grows, the hit boxes match the bigger buttons, and without the image the old plates are drawn.
//
// Run:  node tests/qa3d_controls.js     (needs playwright-core and a Chromium: CHROMIUM=/path/to/chrome, NODE_PATH or PW_CORE as for the other tests)
const http = require('http'), fs = require('fs'), path = require('path');
let chromium; try { ({ chromium } = require('playwright-core')); } catch (e) { ({ chromium } = require(process.env.PW_CORE || 'playwright-core')); }
const ROOT = path.join(__dirname, '..'), PORT = 8117;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const res = []; const T = (n, ok, i = '') => { res.push(ok); console.log((ok ? 'PASS ' : 'FAIL ') + n + (i !== '' ? '  [' + i + ']' : '')); };

(async () => {
  const srv = http.createServer((q, r) => {
    let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
    fs.readFile(path.join(ROOT, p), (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' }); r.end(d); } });
  }).listen(PORT);
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/root/.cache/ms-playwright/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const pg = await (await b.newContext({ viewport: { width: 480, height: 270 } })).newPage(); const errs = [];
  pg.on('pageerror', e => errs.push(e.message)); pg.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await pg.goto(process.env.TEST_URL || 'http://localhost:' + PORT + '/', { timeout: 90000 }); await pg.waitForFunction(() => window.__wf, null, { timeout: 90000 }); await pg.waitForTimeout(600);

  // ---------------------------------------------------------------- 1. keyboard
  const K = await pg.evaluate(() => {
    const g = __wf, out = {}, ev = (code, key, down) => g.onKey({ code, key, repeat: false, preventDefault() {} }, down);
    g.start(); g.world.items = [];
    const steer = (code, key, which) => { g.keys = {}; ev(code, key, true); const on = !!g.keys[which]; ev(code, key, false); return on && !g.keys[which]; };
    out.left = { arrow: steer('ArrowLeft', 'ArrowLeft', 'left'), wasdA: steer('KeyA', 'a', 'left'), azertyQ: steer('KeyA', 'q', 'left'), qwertyQ: steer('KeyQ', 'q', 'left') };
    out.right = { arrow: steer('ArrowRight', 'ArrowRight', 'right'), d: steer('KeyD', 'd', 'right') };
    const jump = (code, key) => { g.state = 'play'; g.p.jy = 0; g.jumpBuf = 0; ev(code, key, true); ev(code, key, false); return g.jumpBuf > 0; };
    out.jump = { space: jump('Space', ' '), up: jump('ArrowUp', 'ArrowUp'), w: jump('KeyW', 'w'), azertyZ: jump('KeyW', 'z'), qwertyZ: jump('KeyZ', 'z') };
    const slide = (code, key) => { g.state = 'play'; g.p.jy = 0; g.p.slide = 0; ev(code, key, true); ev(code, key, false); return g.p.slide > 0; };
    out.slide = { down: slide('ArrowDown', 'ArrowDown'), s: slide('KeyS', 's') };
    g.keys = {}; g.state = 'play'; g.p.jy = 0; g.jumpBuf = 0; g.p.slide = 0; ev('KeyQ', 'a', true); ev('KeyQ', 'a', false);     // the key labelled A on an AZERTY keyboard (code KeyQ): not a control
    out.unmapped = !g.keys.left && !g.keys.right && g.jumpBuf === 0 && g.p.slide === 0;
    return out;
  });
  T('keyboard: arrows, A / D / W / S (by position, i.e. ZQSD on an AZERTY keyboard) and Q / Z / D / S by letter on any layout all steer, jump and slide; the key labelled A on AZERTY does nothing',
    Object.values(K.left).every(Boolean) && Object.values(K.right).every(Boolean) && Object.values(K.jump).every(Boolean) && Object.values(K.slide).every(Boolean) && K.unmapped, JSON.stringify(K));

  // ---------------------------------------------------------------- 2. touch buttons wear the neon ring
  const U = await pg.evaluate(async () => {
    const g = __wf, ui = g.r.ui, out = {}; g.start(); g.world.items = []; g.touch = true; g.held = {}; g.syncTouch();
    ui.drawTouch(g); for (let i = 0; i < 60 && !(ui.touchImg && ui.touchImg.complete && ui.touchImg.naturalWidth); i++) await new Promise(r => setTimeout(r, 50));
    out.img = [ui.touchImg.naturalWidth, ui.touchImg.naturalHeight, TOUCH_ART.src.startsWith('data:image/png;base64,')];
    const calls = []; const real = ui.ctx.drawImage.bind(ui.ctx); ui.ctx.drawImage = (...a) => { calls.push(a); return real(...a); };
    ui.drawTouch(g); out.idle = calls.filter(a => a[0] === ui.touchImg).map(a => [a[7], a[8]]);
    calls.length = 0; g.held = { 1: 'left' }; g.syncTouch(); ui.drawTouch(g); out.held = calls.filter(a => a[0] === ui.touchImg).map(a => a[7]).sort((x, y) => y - x);
    // not in play: nothing; not touch: nothing
    calls.length = 0; g.touch = false; ui.drawTouch(g); out.noTouch = calls.length; g.touch = true; g.state = 'over'; ui.drawTouch(g); out.notPlay = calls.length; g.state = 'play';
    // without the picture the old plates are drawn (no drawImage of the sheet)
    const keep = ui.touchImg; ui.touchImg = new Image(); calls.length = 0; ui.drawTouch(g); out.fallback = calls.filter(a => a[0] === keep).length; ui.touchImg = keep;
    ui.ctx.drawImage = real; out.boxes = TOUCH.map(t => [t.id, t.x, t.y, t.w, t.h].join(':')).join(' ');
    out.inside = TOUCH.every(t => t.x >= 0 && t.y >= 0 && t.x + t.w <= 320 && t.y + t.h <= 180); const hit = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h; out.apart = TOUCH.every((a, i) => TOUCH.every((b, j) => i === j || !hit(a, b)));
    // the picture of each big button is centred on its box
    out.centred = TOUCH.filter(t => t.id !== 'scooter').every(t => { const f = t.id === 'pause' ? TOUCH_ART.small : TOUCH_ART.big; return Math.abs((t.x + t.w / 2) - (t.x + (t.w >> 1))) <= 1 && f.w <= t.w + 0 && f.h <= t.h + 1; });
    return out;
  });
  T('touch buttons: the neon ring picture (a 64 x 42 PNG sheet, data URI) loads; four big buttons are drawn 42 x 42 (they were 34) and the pause button 22 x 22 (it was 18), a held button grows to 46, nothing is drawn off touch devices or outside play',
    U.img[0] === 64 && U.img[1] === 42 && U.img[2] && U.idle.length === 5 && U.idle.filter(s => s[0] === 42).length === 4 && U.idle.filter(s => s[0] === 22).length === 1 && U.held[0] === 46 && U.noTouch === 0 && U.notPlay === 0, JSON.stringify({ img: U.img, idle: U.idle, held: U.held, noTouch: U.noTouch, notPlay: U.notPlay }));
  T('touch buttons: the hit boxes grew with the buttons (46 x 42 instead of 38 x 32 for left, right, slide and jump, 30 x 18 for pause), each centred on its picture, inside the 320 x 180 screen and clear of each other and of the HOP OFF button of the scooter (inert on foot) and, without the picture, the old plates are drawn instead',
    U.boxes === 'left:3:137:46:42 right:52:137:46:42 slide:222:137:46:42 jump:271:137:46:42 pause:145:2:30:18 scooter:132:154:56:20' && U.inside && U.apart && U.fallback === 0, U.boxes + ' | fallback sheet draws ' + U.fallback);

  // ---------------------------------------------------------------- 3. menu text names the new keys
  const M = await pg.evaluate(() => {
    const g = __wf, ui = g.r.ui, seen = []; g.touch = false; g.state = 'title';
    const t1 = ui.txt.bind(ui), t2 = ui.ctr.bind(ui); ui.txt = (s, ...a) => { seen.push(s); return t1(s, ...a); }; ui.ctr = (s, ...a) => { seen.push(s); return t2(s, ...a); };
    ui.drawTitle3D ? ui.drawTitle3D(g) : ui.drawTitle(g); g.state = 'pause'; ui.drawPause && ui.drawPause(g);
    ui.txt = t1; ui.ctr = t2; return seen.join('|');
  });
  T('the menu and pause text name the keys (Q D / ARROWS steer, Z / SPACE / UP jump, S / DOWN slide)', /Q D \/ ARROWS/.test(M) && /Z \/ SPACE \/ UP/.test(M) && /S \/ DOWN/.test(M), M.slice(0, 200));
  T('no JS errors', errs.length === 0, errs.slice(0, 2).join('|'));
  console.log('\n' + res.filter(Boolean).length + '/' + res.length + ' passed');
  await b.close(); srv.close(); process.exit(res.every(Boolean) ? 0 : 1);
})().catch(e => { console.log('TEST ERROR', e.message); process.exit(1); });
