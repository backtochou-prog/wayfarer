// Prototype renders of the coastal zone (Sunset Coast): the zone as it is in the game, and three other atmospheres tried on it, rendered by the game's own engine on the real branch road.
// The variants only override the zone's sky / fog / light / road palette at run time (nothing in the game changes); the sea strip's own colours are baked into its geometry, so they stay.
//   node tools/coast_protos.js outDir   ->  outDir/coast_<variant>_<view>.png   (960 x 540)
const http = require('http'), fs = require('fs'), path = require('path');
let chromium; try { ({ chromium } = require('playwright-core')); } catch (e) { ({ chromium } = require(process.env.PW_CORE || 'playwright-core')); }
const ROOT = path.join(__dirname, '..'), OUT = process.argv[2] || '/tmp/coast_protos'; fs.mkdirSync(OUT, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const VARIANTS = {
  coucher: {},                                                                                                       // the game as it is
  midi: { sky: { top: '#2f7fd0', mid: '#8cc8f0', horizon: '#eaf5ff' }, sunDisc: { color: '#fffbe8', size: 9 }, sunPos: [-26, 44], sunGlow: 0.3, fog: { color: '#d3eaf6', near: 60, far: 230 },
          hemi: { sky: '#eaf5ff', ground: '#cdbb90', intensity: 1.95 }, sun: { color: '#fff4d8', intensity: 3.3, position: [-6, 10, -6] }, groundFar: '#e4d2a0', road: { asphalt: ['#9a928a', '#928a82'], mark: '#ffffff', edge: '#f0d090', curb: ['#f4ead0', '#ecdfbc'], curbFace: '#d8c8a0', walk: ['#eddcae', '#e4d2a0'], court: '#dcc690', verge: ['#efdfb0', '#e8d6a4'] } },
  bleue: { sky: { top: '#1c2a55', mid: '#5a5a9a', horizon: '#e8a8a0' }, sunDisc: { color: '#ffc8a0', size: 8 }, sunPos: [-40, 4], sunGlow: 0.6, fog: { color: '#6e7ca8', near: 30, far: 160 },
           hemi: { sky: '#8a98d0', ground: '#4a4258', intensity: 1.25 }, sun: { color: '#ff9a70', intensity: 1.4, position: [-7, 3, -8] }, groundFar: '#3a3a50', road: { asphalt: ['#5a5a6c', '#545466'], mark: '#c8c8e8', edge: '#8a88b0', curb: ['#8a88a0', '#807e98'], curbFace: '#6a6880', walk: ['#7e7c94', '#76748c'], court: '#6a6880', verge: ['#7a7890', '#727088'] } },
  brume: { sky: { top: '#9ab0d8', mid: '#f0c8c0', horizon: '#fff0e0' }, sunDisc: { color: '#fff8e8', size: 14 }, sunPos: [-30, 12], sunGlow: 1.1, fog: { color: '#f6e4da', near: 22, far: 125 },
           hemi: { sky: '#fff0e8', ground: '#b8a890', intensity: 1.75 }, sun: { color: '#ffd8b8', intensity: 2.0, position: [-7, 5, -8] }, groundFar: '#e8d8b8', road: { asphalt: ['#a09890', '#989088'], mark: '#fff8e8', edge: '#f0d8a8', curb: ['#f4e8d0', '#ecdfc0'], curbFace: '#d8caa8', walk: ['#eadcb8', '#e2d2a8'], court: '#d8c8a0', verge: ['#ecdcb4', '#e4d4a8'] } },
};
(async () => {
  const srv = http.createServer((q, r) => { let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; fs.readFile(path.join(ROOT, p), (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' }); r.end(d); } }); }).listen(8162);
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/root/.cache/ms-playwright/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const pg = await (await b.newContext({ viewport: { width: 960, height: 540 } })).newPage(); const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('http://localhost:8162/', { timeout: 90000 }); await pg.waitForFunction(() => window.__wf, null, { timeout: 60000 }); await pg.waitForTimeout(2000);
  await pg.evaluate(v => { const g = __wf; window.ORIG = ENV3D.coast; window.VAR = v; g.advance = () => {}; g.die = () => {}; }, VARIANTS);
  const views = [['a', 330], ['b', 760], ['c', 1150]];
  for (const name of Object.keys(VARIANTS)) for (const [vn, dz] of views) {
    await pg.evaluate(([name, dz]) => {
      const g = __wf, r = g.r; ENV3D.coast = Object.assign({}, window.ORIG, window.VAR[name]); r.road.pals = {};
      const T2 = Object.assign({}, TRACK, { sequence: [{ seg: 'neonStart' }, { seg: 'cityRun' }, { fork: 'gate3' }, { seg: 'plaza' }, { seg: 'cityRunB' }], loopFrom: 3 });
      g.world = new World(T2); g.world.extras = !!g.pk; g.start(); g.world.extend(30000); const F = g.world.pieces.find(p => p.type === 'fork'); g.world.commit(F, 'left');
      g.state = 'play'; g.p.z = F.fe + dz; g.p.speed = 300; g.world.extend(g.p.z); g.p.x = g.world.playerBand(g.p.z, -2).c; g.camX = g.p.x; g.camRel = 0; g.camErr = 0; g.scene = null; g.fadeIn = 0; g.surf = false;
      const a = g.world.playerBand(g.p.z + 300, g.p.x); g.bgTo = a.to; g.bgT = a.t;
      for (let i = 0; i < 10; i++) { g.time += 1 / 60; r.draw(g); }
    }, [name, dz]);
    await pg.screenshot({ path: path.join(OUT, `coast_${name}_${vn}.png`), timeout: 120000 }); console.log(name, vn);
  }
  console.log('errs', JSON.stringify(errs.slice(0, 3))); await b.close(); srv.close();
})().catch(e => { console.log('ERROR', e.message); process.exit(1); });
