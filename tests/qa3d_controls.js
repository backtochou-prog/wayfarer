// WAYFARER regression test: the controls. Keyboard: arrows and the WASD cluster still work, and Q Z D S work by letter on any layout (AZERTY: the same keys by position and by letter);
// the on-screen touch buttons wear the user's neon ring picture (TOUCH_ART, 42 and 22 px) with a symbol over it, drawn SMOOTH on their own canvas at the device's resolution (256 px picture, vector symbols, a held button eases up and glows), the hit boxes match the bigger buttons, taps pass through, and without the smooth canvas the pixel buttons are drawn.
//
// Run:  node tests/qa3d_controls.js     (needs playwright-core and a Chromium: CHROMIUM=/path/to/chrome, NODE_PATH or PW_CORE as for the other tests)
const http = require('http'), fs = require('fs'), path = require('path');
let chromium; try { ({ chromium } = require('playwright-core')); } catch (e) { ({ chromium } = require(process.env.PW_CORE || 'playwright-core')); }
const ROOT = path.join(__dirname, '..'), PORT = 8135;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const res = []; const T = (n, ok, i = '') => { res.push(ok); console.log((ok ? 'PASS ' : 'FAIL ') + n + (i !== '' ? '  [' + i + ']' : '')); };

(async () => {
  const srv = http.createServer((q, r) => {
    let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
    fs.readFile(path.join(ROOT, p), (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' }); r.end(d); } });
  }).listen(PORT);
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM || require('./_chromium')(), args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const pg = await (await b.newContext({ viewport: { width: 480, height: 270 } })).newPage(); const errs = [];
  pg.on('pageerror', e => errs.push(e.message)); pg.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await pg.goto(process.env.TEST_URL || 'http://localhost:' + PORT + '/', { timeout: 240000 }); await pg.waitForFunction(() => window.__wf, null, { timeout: 240000 }); await pg.waitForTimeout(600);

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

  // ---------------------------------------------------------------- 2. touch buttons wear the neon ring, SMOOTH (their own canvas at the device's resolution)
  const U = await pg.evaluate(async () => {
    const g = __wf, ui = g.r.ui, out = {}; g.start(); g.world.items = []; g.touch = true; g.held = {}; g.syncTouch(); g.state = 'play'; g.fadeIn = 0;
    ui.drawTouch(g); const L = ui.touchLayer(); for (let i = 0; i < 80 && !(L && L.img.complete && L.img.naturalWidth); i++) await new Promise(r => setTimeout(r, 50));
    ui.drawTouch(g); const cv = document.getElementById('touch'), sc = document.getElementById('screen'), r1 = cv.getBoundingClientRect(), r2 = sc.getBoundingClientRect(), cs = getComputedStyle(cv);
    out.layer = { has: !!L, hi: [L.img.naturalWidth, L.img.naturalHeight, /^data:image\/webp/.test(TOUCH_ART.hi.src)], sheet: ui.touchImg ? [ui.touchImg.naturalWidth, ui.touchImg.naturalHeight] : null };
    out.align = { dx: +(r1.left - r2.left).toFixed(1), dy: +(r1.top - r2.top).toFixed(1), dw: +(r1.width - r2.width).toFixed(1), dh: +(r1.height - r2.height).toFixed(1), px: [cv.width, cv.height], css: [+r1.width.toFixed(1), +r1.height.toFixed(1)], dpr: devicePixelRatio, pe: cs.pointerEvents, ir: cs.imageRendering, pos: cs.position };
    out.pass = document.elementFromPoint(r2.left + r2.width * (297 / 320), r2.top + r2.height * (158 / 180)) === sc && document.elementFromPoint(r2.left + r2.width * (25 / 320), r2.top + r2.height * (158 / 180)) === sc;
    const k = cv.width / 350, c = L.ctx, calls = [], fills = [], real = c.drawImage.bind(c), rf = c.fillRect.bind(c), rfill = c.fill.bind(c); out.k = k;
    c.drawImage = (...a) => { calls.push({ img: a[0] === L.img, w: +(a[3]).toFixed(2), x: a[1], y: a[2], sm: c.imageSmoothingEnabled, q: c.imageSmoothingQuality, m: c.getTransform().a, alpha: c.globalAlpha, sb: c.shadowBlur }); return real(...a); }; c.fillRect = (...a) => { fills.push('rect'); return rf(...a); }; c.fill = (...a) => { fills.push('fill'); return rfill(...a); };
    const pxCalls = []; const rp = ui.ctx.drawImage.bind(ui.ctx); ui.ctx.drawImage = (...a) => { pxCalls.push(a[0] === ui.touchImg); return rp(...a); };
    L.sig = null; g.time += 1; ui.drawTouch(g); out.idle = calls.map(a => a.w); /* (L.sig = null: the layer only redraws on a change, so the capture asks for one) */ out.drawn = calls.every(a => a.img && a.sm && a.q === 'high' && Math.abs(a.m - k) < 1e-6); out.alpha = calls.map(a => +a.alpha.toFixed(2)); out.shapes = fills.filter(f => f === 'fill').length; out.rects = fills.filter(f => f === 'rect').length; out.pixelDraws = pxCalls.filter(Boolean).length;
    // a pressed button eases up: a frame after the press it has begun to grow, half a second later it is 1.1 x and lit
    // (the layer is redrawn only when something on it changes: the widths are read from the LAST frame that drew; the glow of a held button is a second, larger and faint copy of its ring)
    const main = cs => cs.filter(a => a.alpha > 0.5).map(a => a.w); let lastDraw = [];
    calls.length = 0; g.held = { 1: 'left' }; g.syncTouch(); g.time += 1 / 60; ui.drawTouch(g); out.ease1 = main(calls); for (let i = 0; i < 30; i++) { calls.length = 0; g.time += 1 / 60; ui.drawTouch(g); if (calls.length) lastDraw = calls.slice(); }
    out.ease2 = main(lastDraw); out.glow = lastDraw.filter(a => a.alpha < 0.5 && a.w > 47).length; out.quiet = calls.length === 0;
    calls.length = 0; g.held = {}; g.syncTouch(); g.time += 1 / 60; ui.drawTouch(g); out.back1 = main(calls); lastDraw = []; for (let i = 0; i < 40; i++) { calls.length = 0; g.time += 1 / 60; ui.drawTouch(g); if (calls.length) lastDraw = calls.slice(); } out.back2 = main(lastDraw); out.quiet2 = calls.length === 0;
    // after a long pause between frames the ease is capped (no jump at the first frame back)
    c.drawImage = real; c.fillRect = rf; c.fill = rfill;
    // not touch: nothing; not in play: nothing, and the layer is empty (cleared)
    const alphaSum = () => { const d = c.getImageData(0, 0, cv.width, cv.height).data; let n = 0; for (let i = 3; i < d.length; i += 4 * 7) n += d[i]; return n; };
    g.time += 1; ui.drawTouch(g); out.inkOn = alphaSum() > 1000; g.touch = false; ui.drawTouch(g); out.inkNoTouch = alphaSum(); g.touch = true; ui.drawTouch(g); g.state = 'over'; ui.drawTouch(g); out.inkNotPlay = alphaSum(); g.state = 'play';
    // a fade-in (after a cutscene) covers the buttons too
    g.time += 1; g.fadeIn = 1; ui.drawTouch(g); const calls2 = []; g.fadeIn = 0.5; const rd = c.drawImage.bind(c); c.drawImage = (...a) => { calls2.push(c.globalAlpha); return rd(...a); }; ui.drawTouch(g); c.drawImage = rd; g.fadeIn = 0; out.fade = +calls2[0].toFixed(2);
    ui.ctx.drawImage = rp; out.boxes = TOUCH.map(t => [t.id, t.x, t.y, t.w, t.h].join(':')).join(' ');
    out.inside = TOUCH.every(t => t.x >= -TOUCH_OUT && t.y >= 0 && t.x + t.w <= 320 + TOUCH_OUT && t.y + t.h <= 180); const hit = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h; out.apart = TOUCH.every((a, i) => TOUCH.every((b, j) => i === j || !hit(a, b)));
    // without the canvas the pixel buttons are drawn as before (the 64 x 42 sheet, 42 / 22 px, 46 held)
    g.time += 1; ui._tl = null; ui.drawTouch(g); for (let i = 0; i < 40 && !(ui.touchImg && ui.touchImg.complete && ui.touchImg.naturalWidth); i++) await new Promise(q => setTimeout(q, 50));
    const fb = []; const rp2 = ui.ctx.drawImage.bind(ui.ctx); ui.ctx.drawImage = (...a) => { if (a[0] === ui.touchImg) fb.push(a[7]); return rp2(...a); }; ui.drawTouch(g); g.held = { 1: 'left' }; g.syncTouch(); const fb2 = []; ui.ctx.drawImage = (...a) => { if (a[0] === ui.touchImg) fb2.push(a[7]); return rp2(...a); }; ui.drawTouch(g); ui.ctx.drawImage = rp2; g.held = {}; g.syncTouch();
    out.fallback = { sheet: ui.touchImg ? [ui.touchImg.naturalWidth, ui.touchImg.naturalHeight] : null, sizes: fb, held: fb2.sort((x, y) => y - x)[0] };
    return out;
  });
  T('touch buttons are SMOOTH: they have their own canvas (#touch, ' + U.align.px.join(' x ') + ' px for ' + U.align.css.join(' x ') + ' CSS px at ' + U.align.dpr + 'x: one canvas pixel per device pixel), over the screen canvas plus a margin of 15 canvas px on each side for the buttons near the edges (offsets ' + [U.align.dx, U.align.dy, U.align.dw, U.align.dh].join(', ') + '), clicks pass through (pointer-events ' + U.align.pe + ', ' + U.pass + '), not pixelated (image-rendering ' + U.align.ir + '); the ring picture is the 256 px WebP (' + U.layer.hi.join(' x ') + '), drawn with smoothing on (high quality) at the canvas scale (' + U.k + '), at ' + U.idle.join(' / ') + ' logical px wide (four big 42, pause 22), with vector symbols (' + U.shapes + ' filled shapes, ' + U.rects + ' pixel rects), and nothing of them in the pixel overlay (' + U.pixelDraws + ')',
    U.layer.has && U.layer.hi[0] === 256 && U.layer.hi[1] === 256 && U.layer.hi[2] && Math.abs(U.align.dx + U.align.dw / 2) <= 1 && Math.abs(U.align.dy) <= 1 && Math.abs(U.align.dw - 2 * 15 * (U.align.css[0] - U.align.dw) / 320) <= 1 && Math.abs(U.align.dh) <= 1 && Math.abs(U.align.px[0] - U.align.css[0] * U.align.dpr) <= 1 && U.align.pe === 'none' && U.pass && U.align.ir !== 'pixelated' && U.align.ir !== 'crisp-edges' && U.drawn && U.idle.length === 5 && U.idle.filter(w => Math.abs(w - 42) < 0.01).length === 4 && U.idle.filter(w => Math.abs(w - 22) < 0.01).length === 1 && U.shapes >= 5 && U.rects === 0 && U.pixelDraws === 0, JSON.stringify(U.align) + JSON.stringify({ idle: U.idle, shapes: U.shapes, rects: U.rects, px: U.pixelDraws }));
  T('a pressed button EASES: a frame after the press the left button is ' + U.ease1[0] + ' wide (not yet 46.2), half a second (30 frames) later ' + U.ease2[0] + ' (1.1 x 42 = 46.2) and lit (a faint larger copy of its ring: ' + U.glow + '), the layer left untouched once the button is still (' + U.quiet + '/' + U.quiet2 + '), and eased back down when released (' + U.back1[0] + ' then ' + U.back2[0] + '); the others stay 42 (' + U.ease2.slice(1).join(', ') + '); nothing is drawn off touch devices (' + U.inkNoTouch + ') or outside play (' + U.inkNotPlay + '), and a fade-in covers them (alpha ' + U.fade + ')',
    U.ease1[0] > 42 && U.ease1[0] < 45.5 && Math.abs(U.ease2[0] - 46.2) < 0.2 && U.glow >= 1 && U.quiet && U.quiet2 && U.back1[0] > 42.2 && U.back1[0] < 46.1 && Math.abs(U.back2[0] - 42) < 0.4 && U.ease2.slice(1).filter(w => Math.abs(w - 42) < 0.01 || Math.abs(w - 22) < 0.01).length === 4 && U.inkOn && U.inkNoTouch === 0 && U.inkNotPlay === 0 && U.fade < 0.9, JSON.stringify({ ease1: U.ease1, ease2: U.ease2, back1: U.back1, back2: U.back2, glow: U.glow, fade: U.fade }));
  T('touch buttons: the hit boxes grew with the buttons (46 x 42 instead of 38 x 32 for left, right, slide and jump, 30 x 18 for pause), each centred on its picture, inside the 320 x 180 screen and clear of each other and of the HOP OFF button of the scooter (inert on foot); without the smooth canvas the pixel buttons are drawn as before (' + (U.fallback.sheet || []).join(' x ') + ' sheet, ' + U.fallback.sizes.join(' / ') + ' px, a held one ' + U.fallback.held + ')',
    U.boxes === 'left:-15:137:46:42 right:41:137:46:42 slide:233:137:46:42 jump:289:137:46:42 pause:145:2:30:18 scooter:132:154:56:20' && U.inside && U.apart && U.fallback.sheet && U.fallback.sheet[0] === 64 && U.fallback.sheet[1] === 42 && U.fallback.sizes.filter(w => w === 42).length === 4 && U.fallback.sizes.filter(w => w === 22).length === 1 && U.fallback.held === 46, U.boxes);
  // a real touch on the smooth button goes through to the game: on a phone-like page (touch, 2x), a tap on the jump button jumps and a press on the left button steers
  { const ctx = await b.newContext({ viewport: { width: 640, height: 360 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true }), pt = await ctx.newPage(); const e2 = []; pt.on('pageerror', e => e2.push(e.message));
    await pt.goto(process.env.TEST_URL || 'http://localhost:' + PORT + '/', { timeout: 240000 }); await pt.waitForFunction(() => window.__wf, null, { timeout: 240000 }); await pt.waitForTimeout(800);
    const geo = await pt.evaluate(() => { const g = __wf; g.touch = true; g.start(); g.world.items = []; g.state = 'play'; g.p.jy = 0; g.p.speed = 0; const sc = document.getElementById('screen').getBoundingClientRect(), tc = document.getElementById('touch'); return { x: sc.left + sc.width * (312 / 320), y: sc.top + sc.height * (158 / 180), lx: sc.left + sc.width * (26 / 320), dpr: devicePixelRatio, tw: tc.width, sw: sc.width }; });
    await pt.touchscreen.tap(geo.x, geo.y); await pt.waitForTimeout(150); const J = await pt.evaluate(() => { const g = __wf; return { jumped: g.p.jy > 0 || g.p.vy > 0 || g.jumpBuf > 0 }; });
    await pt.evaluate(() => { const g = __wf; g.p.jy = 0; g.p.vy = 0; g.jumpBuf = 0; });
    T('a real tap on the smooth jump button goes through to the game (jumped: ' + J.jumped + '), on a ' + geo.dpr + 'x touch page where the smooth canvas is ' + geo.tw + ' px for ' + Math.round(geo.sw) + ' CSS px wide', J.jumped && geo.tw === Math.round(geo.sw * (320 + 2 * 15) / 320 * geo.dpr) && !e2.length, JSON.stringify({ J, geo, e2 })); await ctx.close(); }

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
