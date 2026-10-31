// Renders the Zagla dance video's frames: node tools/zagla_dance/render.js OUT_DIR START END   (frame numbers at 30 fps, END exclusive; existing frames are skipped).
// Needs playwright-core and a Chromium (CHROMIUM=/path/to/chrome; NODE_PATH or PW_CORE for playwright-core). Several processes can render different ranges at once.
// Every frame is a pure function of its time (the game is paused and pinned), so any split gives the same video. Then see build.sh.
const fs = require('fs'), path = require('path');
let chromium; try { ({ chromium } = require('playwright-core')); } catch (e) { ({ chromium } = require(process.env.PW_CORE || 'playwright-core')); }
const [OUT, S, E] = [process.argv[2], +process.argv[3], +process.argv[4]], W = 960, H = 540, FPS = 30;
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/root/.cache/ms-playwright/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const pg = await b.newPage({ viewport: { width: W, height: H } }); const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('file://' + path.join(__dirname, '..', '..', 'index.html'), { timeout: 180000 }); await pg.waitForFunction(() => window.__wf, null, { timeout: 120000 }); await pg.waitForTimeout(1500);
  await pg.evaluate(fs.readFileSync(path.join(__dirname, 'page.js'), 'utf8'));
  for (let f = S; f < E; f++) {
    const name = path.join(OUT, 'f' + String(f).padStart(5, '0') + '.jpg'); if (fs.existsSync(name)) continue;
    const url = await pg.evaluate(t => window.__danceFrame(t, { q: 0.95 }), f / FPS); fs.writeFileSync(name, Buffer.from(url.split(',')[1], 'base64'));
  }
  console.log('done', S, E, errs.length ? JSON.stringify(errs.slice(0, 2)) : 'no errors'); await b.close();
})();
