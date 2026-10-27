// Renders the game's kick scooter (RunnerSprite.buildScooter) to transparent PNGs, to be refined in another tool:
//   docs/downloads/scooter.png         3/4 view from the front-right, 1536 x 1024
//   docs/downloads/scooter-views.png   side, front, rear and top views side by side (orthographic), 1600 x 520
// Everything is rendered 2x larger and scaled down (anti-aliasing). Run:  node tools/render_scooter.js   (needs playwright-core and a Chromium: CHROMIUM=/path/to/chrome)
const fs = require('fs'), path = require('path');
let chromium; try { ({ chromium } = require('playwright-core')); } catch (e) { ({ chromium } = require(process.env.PW_CORE || 'playwright-core')); }
const ROOT = path.join(__dirname, '..'), OUT = path.join(ROOT, 'docs', 'downloads');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/root/.cache/ms-playwright/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--allow-file-access-from-files'] });
  const pg = await b.newPage({ viewport: { width: 400, height: 300 } });
  await pg.goto('file://' + path.join(ROOT, 'index.html')); await pg.waitForFunction(() => window.__wf, null, { timeout: 30000 });
  const shots = await pg.evaluate(() => {
    const out = {};
    const render = (W, H, cam, setup) => {
      const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
      const r = new THREE.WebGLRenderer({ canvas: cv, alpha: true, antialias: true, preserveDrawingBuffer: true }); r.setClearColor(0x000000, 0); r.setSize(W, H, false);
      const sc = new THREE.Scene(); sc.add(new THREE.HemisphereLight(0xfff1e0, 0x6a5a66, 1.5)); const sun = new THREE.DirectionalLight(0xffffff, 2.4); sun.position.set(-4, 7, 5); sc.add(sun);
      const s = RunnerSprite.buildScooter(); s.userData.wheels.forEach(w => w.rotation.x = 0.4); sc.add(s); setup && setup(s);
      r.render(sc, cam); const url = cv.toDataURL('image/png'); r.dispose(); return url;
    };
    const persp = (W, H) => { const c = new THREE.PerspectiveCamera(28, W / H, 0.1, 50); c.position.set(-2.6, 1.7, -2.9); c.lookAt(0, 0.6, 0); return c; };
    out.hero = render(3072, 2048, persp(3072, 2048));
    const ortho = (pos, up, W, H, h = 1.4) => { const c = new THREE.OrthographicCamera(-h * W / H / 2, h * W / H / 2, h / 2, -h / 2, 0.1, 50); c.position.set(...pos); c.up.set(...up); c.lookAt(0, pos[1] > 3 ? 0 : 0.58, 0); return c; };
    out.side = render(800, 1040, ortho([5, 0.58, 0], [0, 1, 0], 1040, 800, 1.6)); out.front = render(520, 1040, ortho([0, 0.58, -5], [0, 1, 0], 520, 1040, 1.6));
    out.rear = render(520, 1040, ortho([0, 0.58, 5], [0, 1, 0], 520, 1040, 1.6)); out.top = render(520, 1040, ortho([0, 6, 0.0001], [0, 0, -1], 520, 1040, 1.9));
    return out;
  });
  const buf = u => Buffer.from(u.split(',')[1], 'base64');
  fs.mkdirSync(OUT, { recursive: true });
  for (const k of Object.keys(shots)) fs.writeFileSync(path.join('/tmp', 'scooter_raw_' + k + '.png'), buf(shots[k]));
  await b.close(); console.log('raw renders written to /tmp/scooter_raw_*.png');
})();
