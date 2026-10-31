// Renders Zagla's 3D body as a transparent PNG seen from the SIDE (her front to the left, like the strawberry's side picture): node tools/zagla_png/render_side.js OUT.png [front|side|back] [WIDTH]
// The runner is posed in the game page (legs straight, no vehicle), the scene is hidden but for her and neutral lights, and she is drawn orthographically twice, on black and on white: the difference gives the alpha
// (exact on the antialiased edges) and the colour. Needs playwright-core and a Chromium (CHROMIUM=/path/to/chrome).
const http = require('http'), fs = require('fs'), path = require('path');
let chromium; try { ({ chromium } = require('playwright-core')); } catch (e) { ({ chromium } = require(process.env.PW_CORE || 'playwright-core')); }
const ROOT = path.join(__dirname, '..', '..'), MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const [OUT, VIEW = 'side'] = [process.argv[2] || 'zagla-side.png', process.argv[3] || 'side'], PXM = +(process.argv[4] || 800);       // PXM: pixels per metre
const srv = http.createServer((q, r) => { let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; fs.readFile(path.join(ROOT, p), (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' }); r.end(d); } }); }).listen(8231);
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/root/.cache/ms-playwright/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const pg = await b.newPage({ viewport: { width: 640, height: 360 } }); const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('http://localhost:8231/?avatar=zagla', { timeout: 120000 }); await pg.waitForFunction(() => window.__wf, null, { timeout: 90000 }); await pg.waitForTimeout(2500);
  const W = VIEW === 'side' ? Math.round(1.5 * PXM) : Math.round(1.5 * PXM), H = Math.round(2.1 * PXM);
  const res = await pg.evaluate(async ([VIEW, W, H]) => {
    window.requestAnimationFrame = () => 0; await new Promise(r => setTimeout(r, 400));
    const g = __wf, r = g.r, rn = r.runner, scene = r.scene, R = r.renderer; if (rn.constructor.name !== 'RunnerZagla') return { error: 'not Zagla: ' + rn.constructor.name };
    for (const c of scene.children) if (!c.isLight && c !== rn.group) c.visible = false;
    rn.group.visible = true; rn.group.position.set(0, 0, 0); rn.group.rotation.set(0, 0, 0); rn.pivot.position.set(0, 0, 0); rn.pivot.rotation.set(0, 0, 0); rn.pivot.scale.set(1, 1, 1); rn.scooter.visible = rn.board.visible = rn.surfB.visible = false;
    for (const l of rn.legs) l.rotation.set(0, 0, 0);
    scene.fog = null; r.hemi.color.set(0xffffff); r.hemi.groundColor.set(0x8a8aa0); r.hemi.intensity = 1.0; r.sun.color.set(0xffffff); r.sun.intensity = 1.2;
    const cam = new THREE.OrthographicCamera(-W / 2 / 800 * 0 - 0.75, 0.75, 1.05 + 0.0, -1.05 + 0.0, 0.1, 50); cam.left = -0.75; cam.right = 0.75; cam.top = 1.05; cam.bottom = -1.05;
    const zc = -0.02, yc = 1.0, P = VIEW === 'side' ? [-8, yc, zc] : VIEW === 'front' ? [0, yc, -8] : [0, yc, 8];
    cam.position.set(...P); cam.up.set(0, 1, 0); cam.lookAt(VIEW === 'side' ? 0 : 0, yc, VIEW === 'side' ? zc : 0); cam.updateMatrixWorld();
    r.sun.position.set(...(VIEW === 'side' ? [-6, 8, 3] : VIEW === 'front' ? [3, 8, -6] : [3, 8, 6])); r.sun.target.position.set(0, 1, 0); r.sun.target.updateMatrixWorld();
    R.setPixelRatio(1); R.setSize(W, H, false); const canvas = document.getElementById('gl'); const shots = [];
    for (const col of [0x000000, 0xffffff]) { scene.background = new THREE.Color(col); R.render(scene, cam); shots.push(canvas.toDataURL('image/png')); }
    const load = u => new Promise(rs => { const im = new Image(); im.onload = () => rs(im); im.src = u; }), cv = document.createElement('canvas'); cv.width = W; cv.height = H; const cx = cv.getContext('2d', { willReadFrequently: true });
    const im0 = await load(shots[0]), im1 = await load(shots[1]); cx.drawImage(im0, 0, 0); const d0 = cx.getImageData(0, 0, W, H); cx.clearRect(0, 0, W, H); cx.drawImage(im1, 0, 0); const d1 = cx.getImageData(0, 0, W, H); const out = cx.createImageData(W, H);
    for (let i = 0; i < d0.data.length; i += 4) { const a = 1 - Math.max(d1.data[i] - d0.data[i], d1.data[i + 1] - d0.data[i + 1], d1.data[i + 2] - d0.data[i + 2]) / 255, al = Math.max(0, Math.min(1, a)); out.data[i + 3] = Math.round(al * 255); for (let k = 0; k < 3; k++) out.data[i + k] = al > 0.003 ? Math.max(0, Math.min(255, Math.round(d0.data[i + k] / al))) : 0; }
    cx.putImageData(out, 0, 0); return { png: cv.toDataURL('image/png'), W, H };
  }, [VIEW, W, H]);
  if (res.error) { console.log(res.error); } else { fs.writeFileSync(OUT, Buffer.from(res.png.split(',')[1], 'base64')); console.log('wrote', OUT, res.W + 'x' + res.H, errs.length ? JSON.stringify(errs.slice(0, 2)) : 'no errors'); }
  await b.close(); srv.close();
})();
