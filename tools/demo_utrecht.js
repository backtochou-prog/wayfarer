// Renders a DEMONSTRATION of the Utrecht zone from a real run of the game, frame by frame: the runner reaches the Gare du Midi, the cutscene plays, the train takes it to Utrecht, and a small bot
// plays the basin, the covered gallery and the Oudegracht up to the junction (the real game, rules, HUD and effects; nothing is staged but the start, and the bot that drives):
//   docs/downloads/wayfarer-utrecht-demo.mp4   (960 x 540, 20 fps, captions in French) and docs/screenshots/utrecht-demo-sheet.jpg (eight stills)
// Run:  node tools/demo_utrecht.js [outDir]   (needs playwright-core, a Chromium: CHROMIUM=/path/to/chrome, ffmpeg: FFMPEG=/path/to/ffmpeg, Pillow for the sheet)
const http = require('http'), fs = require('fs'), path = require('path'), cp = require('child_process');
let chromium; try { ({ chromium } = require('playwright-core')); } catch (e) { ({ chromium } = require(process.env.PW_CORE || 'playwright-core')); }
const ROOT = path.join(__dirname, '..'), OUT = process.argv[2] || path.join('/tmp', 'utrecht_demo'), FRAMES = path.join(OUT, 'frames'), FPS = 20, N = +(process.env.FRAMES || 900);
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
fs.mkdirSync(FRAMES, { recursive: true });
(async () => {
  const srv = http.createServer((q, r) => { let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; fs.readFile(path.join(ROOT, p), (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' }); r.end(d); } }); }).listen(8161);
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/root/.cache/ms-playwright/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const pg = await (await b.newContext({ viewport: { width: 960, height: 540 } })).newPage(); const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('http://localhost:8161/', { timeout: 90000 }); await pg.waitForFunction(() => window.__wf, null, { timeout: 60000 }); await pg.waitForTimeout(1500);
  await pg.evaluate(() => {
    const g = __wf, r = g.r; window.G = g; window.ADV = g.advance.bind(g); window.DRAW = () => r.draw(g);
    g.start(); g.world.extend(80000); const P = g.world.pieces.find(p => p.id === 'gareMidi'), A = g.world.pieces.find(p => p.id === 'utrechtA'), B = g.world.pieces.find(p => p.id === 'utrechtB'), C = g.world.pieces.find(p => p.id === 'utrechtC'), F = g.world.pieces.find(p => p.type === 'fork' && p.z0 >= C.z1 - 1);
    g.state = 'play'; g.p.z = P.z0 - 100; g.p.x = 0; g.p.speed = 300; g.world.extend(g.p.z); g.world.items = g.world.items.filter(i => i.kind === 'prop' || i.z > P.z0 + 1300);        // the run starts just before the station
    const a = g.world.playerBand(g.p.z + 300, 0); g.bgTo = a.to; g.bgT = a.t;
    window.Z = { P, A, B, C, F }; g.advance = () => {}; g.draw = () => {};                                                   // the page's own loop is frozen: the frames are stepped from here
    const div = document.createElement('div'); div.id = 'cap'; div.style.cssText = 'position:fixed;left:50%;bottom:6.5%;transform:translateX(-50%);padding:8px 16px;background:rgba(14,8,26,0.78);color:#f3e6c8;font:600 22px/1.2 system-ui,Segoe UI,sans-serif;border-radius:4px;white-space:nowrap;z-index:9;max-width:94%;overflow:hidden;text-overflow:ellipsis'; document.body.appendChild(div);
    const key = c => g.onKey({ code: c, key: c, repeat: false, preventDefault() {} }, true);
    window.BOT = () => {                                                                                                     // jumps or slides at the hazards in its own lane, timed to its real speed
      const p = g.p, hz = g.world.items.filter(it => OBST[it.kind] && !it.taken && it.z > p.z - 12 && it.z < p.z + 300); g.keys.left = g.keys.right = false;
      let tg = null; for (const it of hz) { const o = OBST[it.kind]; if (Math.abs(it.x - p.x) > o.hw + P_HW + 0.08 || it.z <= p.z - 2) continue; if (!tg || it.z < tg.z) tg = it; }
      if (tg) { const d = tg.z - p.z, v = p.speed; if (tg.kind === 'over') { if (d < v * 0.2 + 10 && p.jy === 0 && p.slide <= 0) key('ArrowDown'); } else if (d < v * 0.26 + 8 && p.jy === 0 && !hz.some(it => it.kind === 'over' && it.z > p.z - 10 && it.z < p.z + 12)) key('Space'); }
    };
    window.CAP = () => {                                                                                                     // the caption follows the place, and the next hazard when there is one
      const z = g.p.z, { P, A, B, C, F } = window.Z, S = g.scene;
      if (S) return S.phase === 'run' ? 'Gare du Midi : Captain Strawberry court vers le train' : S.phase === 'board' ? 'Il monte à bord, tout seul' : S.phase === 'doors' ? 'Les portes se ferment' : 'Le train l\'emmène à Utrecht';
      if (z < P.z0 + 500) return 'Fin de Saint-Gilles : la gare du Midi';
      if (z < A.z0 + 150) return 'Utrecht : la course continue sur l\'eau, sur une planche de surf';
      const it = g.world.items.filter(i => OBST[i.kind] && !i.taken && i.z > z && i.z < z + 260).sort((x, y) => x.z - y.z)[0];
      if (it && z > A.z0 + 150) return it.kind === 'over' ? 'Petit pont de brique : on glisse dessous' : it.kind === 'barrier' ? 'Barque en travers : on saute' : 'Tonneaux flottants : on saute';
      if (z < A.z1) return 'Utrecht Centraal : le bassin devant la gare';
      if (z < B.z1) return 'Hoog Catharijne : le canal sous le centre commercial';
      if (z > C.z0 + 2900 && z < C.z0 + 4300) return 'La tour Dom, sous échafaudage, comme sur vos photos';
      if (z > F.z0 - 800) return 'Le carrefour : on choisit la zone suivante';
      return 'L\'Oudegracht : quais, caves voûtées, ponts (l\'eau est votre photo)';
    };
    window.STEP = () => {
      for (let k = 0; k < 3; k++) { if (g.state === 'play') BOT(); ADV(1 / 60); }
      document.getElementById('cap').textContent = CAP(); DRAW();
      return { state: g.state, z: Math.round(g.p.z), phase: g.scene ? g.scene.phase : null, surf: g.surf, bgTo: g.bgTo, fadeIn: +g.fadeIn.toFixed(2), done: g.p.z > window.Z.F.z0 - 300, coins: g.coins, to: g.world.playerBand(g.p.z, 0).to };
    };
  });
  const marks = {}; let last = null;
  for (let i = 0; i < N; i++) {
    const s = await pg.evaluate(() => STEP());
    await pg.screenshot({ path: path.join(FRAMES, 'f' + String(i).padStart(4, '0') + '.png') });
    if (!marks.run && s.phase === 'run') marks.run = i + 6;
    if (!marks.board && s.phase === 'board') marks.board = i + 4;
    if (!marks.depart && s.phase === 'depart') marks.depart = i + 12;
    if (!marks.resume && last && last.phase === 'depart' && !s.phase && s.state === 'play') marks.resume = i + 12;
    if (!marks.A && s.to === 'utrechtA' && s.surf) marks.A = i + 15;
    if (!marks.B && s.to === 'utrechtB' && s.surf) marks.B = i + 25;
    if (!marks.C && s.to === 'utrecht' && s.surf) marks.C = i + 25;
    if (s.state !== 'play' && s.state !== 'scene') { console.log('run ended at frame', i, JSON.stringify(s)); break; }
    last = s; if (s.done) { console.log('done at frame', i, JSON.stringify(s)); marks.end = i; break; }
  }
  console.log('marks', JSON.stringify(marks), 'errors', errs.slice(0, 2));
  fs.writeFileSync(path.join(OUT, 'marks.json'), JSON.stringify(marks));
  await b.close(); srv.close();
  const ff = process.env.FFMPEG || 'ffmpeg';
  cp.execFileSync(ff, ['-y', '-framerate', String(FPS), '-i', path.join(FRAMES, 'f%04d.png'), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '25', '-preset', 'veryfast', '-movflags', '+faststart', path.join(OUT, 'wayfarer-utrecht-demo.mp4')], { stdio: 'ignore' });
  console.log('video', fs.statSync(path.join(OUT, 'wayfarer-utrecht-demo.mp4')).size);
})().catch(e => { console.log('DEMO ERROR', e.message); process.exit(1); });
