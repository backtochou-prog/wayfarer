// WAYFARER regression test: the main-menu title panel is the user's artwork (UI_ASSETS.titlePanel), with a safe fallback to the drawn panel.
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
    const img = ui.titleImg; out.loaded = !!(img && img.complete && img.naturalWidth === 496 && img.naturalHeight === 208);
    const grab = () => { g.r.draw(g); const d = ctx.getImageData(10, 10, 120, 48).data; let lum = 0, red = 0, n = 0, mn = 255, mx = 0; for (let i = 0; i < d.length; i += 4) { const l = (d[i] + d[i + 1] + d[i + 2]) / 3; lum += l; if (d[i] > 150 && d[i + 1] < 90 && d[i + 2] < 90) red++; mn = Math.min(mn, l); mx = Math.max(mx, l); n++; } return { mean: Math.round(lum / n), red, range: mx - mn }; };
    g.state = 'title'; out.withImage = grab();
    ui.titleImg = null; out.fallback = grab();                       // no image: the old drawn panel (a light border and a plain dark fill)
    ui.titleImg = img; out.restored = grab();
    return out;
  });
  T('the title-panel artwork loads at its embedded size (496 x 208)', U.loaded, JSON.stringify({ loaded: U.loaded }));
  T('with the artwork, the panel shows its dark body and glowing red line (red pixels present, dark mean); the old border panel is not drawn', U.withImage.red > 10 && U.withImage.mean < 90 && U.withImage.range > 100, JSON.stringify(U.withImage));
  T('without the image the usual drawn panel is the fallback (no red line) and restoring the image brings the artwork back', U.fallback.red === 0 && U.restored.red === U.withImage.red, JSON.stringify({ fallback: U.fallback, restored: U.restored }));
  T('no JS errors', errs.length === 0, errs.slice(0, 2).join('|'));
  console.log('\n' + res.filter(Boolean).length + '/' + res.length + ' passed');
  await b.close(); srv.close(); process.exit(res.every(Boolean) ? 0 : 1);
})().catch(e => { console.log('TEST ERROR', e.message); process.exit(1); });
