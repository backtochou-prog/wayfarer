// WAYFARER regression test: both main-menu panels and the START button are the user's artwork (UI_ASSETS.titlePanel / controlsPanel / startButton), with a safe fallback to the drawn panels,
// and the controls text stays legible over the (veiled) artwork.
// Run:  node tests/qa3d_ui.js     (needs playwright-core and a Chromium: CHROMIUM=/path/to/chrome, NODE_PATH or PW_CORE as for the other tests)
const http = require('http'), fs = require('fs'), path = require('path');
let chromium; try { ({ chromium } = require('playwright-core')); } catch (e) { ({ chromium } = require(process.env.PW_CORE || 'playwright-core')); }
const ROOT = path.join(__dirname, '..'), PORT = 8117;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const res = []; const T = (n, ok, i = '') => { res.push(ok); console.log((ok ? 'PASS ' : 'FAIL ') + n + (i !== '' ? '  [' + i + ']' : '')); };
(async () => {
  const srv = http.createServer((q, r) => { let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; fs.readFile(path.join(ROOT, p), (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' }); r.end(d); } }); }).listen(PORT);
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/root/.cache/ms-playwright/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const pg = await (await b.newContext({ viewport: { width: 640, height: 360 } })).newPage(); const errs = [];
  pg.on('pageerror', e => errs.push(e.message)); pg.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await pg.goto(process.env.TEST_URL || 'http://localhost:' + PORT + '/'); await pg.waitForFunction(() => window.__wf, null, { timeout: 30000 }); await pg.waitForTimeout(1200);
  const U = await pg.evaluate(() => {
    const g = __wf, ui = g.r.ui, ctx = document.getElementById('screen').getContext('2d'), out = {};
    const ti = ui.titleImg, ci = ui.controlsImg;
    out.loaded = !!(ti && ti.complete && ti.naturalWidth === 496 && ti.naturalHeight === 208); out.loadedControls = !!(ci && ci.complete && ci.naturalWidth === 496 && ci.naturalHeight === 160);
    const bone = (() => { const h = C.bone.replace('#', ''); return [0, 2, 4].map(i => parseInt(h.substr(i, 2), 16)); })();
    const stats = (x, y, w, h) => { const d = ctx.getImageData(x, y, w, h).data; let lum = 0, red = 0, text = 0, sat = 0, n = 0, mn = 255, mx = 0; for (let i = 0; i < d.length; i += 4) { const l = (d[i] + d[i + 1] + d[i + 2]) / 3; lum += l; if (d[i] > 150 && d[i + 1] < 90 && d[i + 2] < 90) red++; if (Math.max(d[i], d[i + 1], d[i + 2]) - Math.min(d[i], d[i + 1], d[i + 2]) > 70) sat++; if (Math.abs(d[i] - bone[0]) < 8 && Math.abs(d[i + 1] - bone[1]) < 8 && Math.abs(d[i + 2] - bone[2]) < 8) text++; mn = Math.min(mn, l); mx = Math.max(mx, l); n++; } return { mean: Math.round(lum / n), red, text, sat, range: Math.round(mx - mn) }; };
    const grab = () => { g.r.draw(g); return { title: stats(10, 10, 120, 48), controls: stats(10, 68, 120, 36) }; };
    g.state = 'title'; out.withImage = grab();
    ui.titleImg = null; ui.controlsImg = null; out.fallback = grab();            // no images: the old drawn panels (a light border and a plain dark fill)
    ui.titleImg = ti; ui.controlsImg = ci; out.restored = grab();
    return out;
  });
  T('both panel images load at their embedded sizes (496 x 208 and 496 x 160)', U.loaded && U.loadedControls, JSON.stringify({ title: U.loaded, controls: U.loadedControls }));
  T('title panel: the artwork shows its dark body and glowing red line (red pixels present, dark mean)', U.withImage.title.red > 10 && U.withImage.title.mean < 90 && U.withImage.title.range > 100, JSON.stringify(U.withImage.title));
  T('controls panel: the colourful artwork shows through the veil (many saturated pixels, far more than the plain drawn panel) and the text is legible (its colour is present in numbers)', U.withImage.controls.sat > 3 * Math.max(50, U.fallback.controls.sat) && U.withImage.controls.mean < 110 && U.withImage.controls.text > 40, JSON.stringify({ art: U.withImage.controls, drawn: U.fallback.controls }));
  T('without the images the usual drawn panels are the fallback (no red line), and restoring them brings the artwork back', U.fallback.title.red === 0 && U.restored.title.red === U.withImage.title.red && Math.abs(U.restored.controls.mean - U.withImage.controls.mean) <= 3, JSON.stringify({ withImage: U.withImage, fallback: U.fallback, restored: U.restored }));
  // the START button: artwork face, hover / pressed feedback, the fallback, and that RESUME / RUN AGAIN stay plain amber
  const B = await pg.evaluate(() => {
    const g = __wf, ui = g.r.ui, ctx = document.getElementById('screen').getContext('2d'), out = {}, b = BTN.title;
    out.loaded = !!(ui.startImg && ui.startImg.complete && ui.startImg.naturalWidth === 400 && ui.startImg.naturalHeight === 64);
    const px = (x, y) => Array.from(ctx.getImageData(x, y, 1, 1).data);
    const face = () => { g.r.draw(g); const d = ctx.getImageData(b.x, b.y, b.w, b.h).data; let sat = 0, green = 0, pink = 0, lum = 0, n = 0; for (let i = 0; i < d.length; i += 4) { const mx = Math.max(d[i], d[i + 1], d[i + 2]), mn = Math.min(d[i], d[i + 1], d[i + 2]); if (mx - mn > 90) sat++; if (d[i + 1] > 200 && d[i] < 120 && d[i + 2] < 80) green++; if (d[i] > 200 && d[i + 1] < 80 && d[i + 2] > 80) pink++; lum += (d[i] + d[i + 1] + d[i + 2]) / 3; n++; } return { sat, green, pink, lum: Math.round(lum / n) }; };
    g.state = 'title'; g.mouse = { x: 0, y: 0, down: false }; out.idle = face();
    g.mouse = { x: b.x + 5, y: b.y + 5, down: false }; out.hover = face();
    g.mouse = { x: b.x + 5, y: b.y + 5, down: true }; out.pressed = face();
    g.mouse = { x: 0, y: 0, down: false };
    const img = ui.startImg; ui.startImg = null; out.plain = face(); ui.startImg = img;
    g.state = 'pause'; g.r.draw(g); out.resume = px(BTN.pause.x + 3, BTN.pause.y + 8);     // the pause button must still be plain amber (no artwork)
    g.state = 'title';
    return out;
  });
  T('START button: the artwork loads (400 x 64) and the face shows its green and pink rings (plain button has none)', B.loaded && B.idle.green > 100 && B.idle.pink > 20 && B.plain.green === 0 && B.plain.pink === 0, JSON.stringify({ loaded: B.loaded, idle: B.idle, plain: B.plain }));
  T('START button feedback: lighter on hover, darker when pressed', B.hover.lum > B.idle.lum + 5 && B.pressed.lum < B.idle.lum - 5, JSON.stringify({ idle: B.idle.lum, hover: B.hover.lum, pressed: B.pressed.lum }));
  T('the pause button (RESUME) is still the plain amber one', B.resume[0] > 200 && B.resume[1] > 140 && B.resume[2] < 110, JSON.stringify(B.resume));
  T('no JS errors', errs.length === 0, errs.slice(0, 2).join('|'));
  console.log('\n' + res.filter(Boolean).length + '/' + res.length + ' passed');
  await b.close(); srv.close(); process.exit(res.every(Boolean) ? 0 : 1);
})().catch(e => { console.log('TEST ERROR', e.message); process.exit(1); });
