// Renders a short DEMONSTRATION of the depth layer of the 3D build (power-ups, shards, a waymark, a mission, a near miss, the new patterns) from a staged run on the real road, frame by frame:
//   docs/downloads/wayfarer-perks-demo.mp4   (960 x 540, 20 fps, captions in French) and docs/screenshots/perks-sheet.jpg (six stills)
// The run is the real game (same rules, same HUD, same effects); only the items on the road are placed by hand so that every effect appears in order, and the runner is driven by a small bot.
// Run:  node tools/demo_perks.js [outDir]   (needs playwright-core, a Chromium: CHROMIUM=/path/to/chrome, ffmpeg: FFMPEG=/path/to/ffmpeg, Pillow for the sheet)
const http = require('http'), fs = require('fs'), path = require('path'), cp = require('child_process');
let chromium; try { ({ chromium } = require('playwright-core')); } catch (e) { ({ chromium } = require(process.env.PW_CORE || 'playwright-core')); }
const ROOT = path.join(__dirname, '..'), OUT = process.argv[2] || path.join('/tmp', 'perks_demo'), FRAMES = path.join(OUT, 'frames'), FPS = 20, N = +(process.env.FRAMES || 520);
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
fs.mkdirSync(FRAMES, { recursive: true });
(async () => {
  const srv = http.createServer((q, r) => { let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; fs.readFile(path.join(ROOT, p), (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' }); r.end(d); } }); }).listen(8160);
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/root/.cache/ms-playwright/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const pg = await (await b.newContext({ viewport: { width: 960, height: 540 } })).newPage(); const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('http://localhost:8160/', { timeout: 90000 }); await pg.waitForFunction(() => window.__wf, null, { timeout: 60000 }); await pg.waitForTimeout(1500);
  await pg.evaluate(() => {
    const g = __wf, r = g.r; window.G = g; window.ADV = g.advance.bind(g); window.DRAW = () => r.draw(g);
    g.start(); g.world.extend(9000); g.world.items = g.world.items.filter(i => i.kind === 'prop'); g.p.z = 0; g.p.x = 0; g.p.speed = 230; g.state = 'play';
    const put = (kind, z, lane = 0, h = 12, extra) => g.world.items.push(Object.assign({ kind, z, x: lane * LANE_W, h, tag: 'main' }, extra));
    const pat = (P, z0) => { for (const [kind, dz, ln, hh] of P.items) put(kind, z0 + dz, ln, hh === undefined ? 12 : hh, OBST[kind] && P.combo ? { combo: 'D' + z0, comboN: P.combo } : undefined); };
    for (let k = 0; k < 5; k++) put('coin', 160 + k * 26, 0);                                                                     // a first line of coins (the mission is "collect 12")
    put('shard', 520, 0, 36); put('crate', 520, 0);                                                                                 // a shard up in the air, above a crate: the jump that clears the crate gets it
    for (const [z, l] of [[700, -1], [726, -1], [752, -1], [700, 1], [726, 1], [752, 1]]) put('coin', z, l);                         // coins at the sides: out of reach without the magnet
    put('magnet', 980, 0); for (let k = 0; k < 6; k++) { put('coin', 1080 + k * 30, -1); put('coin', 1090 + k * 30, 1); }           // ... and now they are pulled in
    put('aura', 1700, 0); put('crate', 2060, 0); put('crate', 2300, 0);                                                              // the aura takes the first crate
    put('dash', 2560, 0); pat(PATTERNS_X.crateBarrier, 2760); put('over', 3060, 0); put('coin', 3040, 0, 6); put('coin', 3090, 0, 6);  // a dash through a sequence
    pat(WAYMARKS.jump, 3260);                                                                                                       // a golden waymark that needs a jump
    pat(PATTERNS_X.stagger, 3560); put('crate', 4320, 0);                                                                           // staggered crates, then a close pass
    G.ST = { near: false, log: {} }; g.advance = () => {}; g.draw = () => {};                                                       // the page's own loop is frozen: the frames are stepped from here
    const div = document.createElement('div'); div.id = 'cap'; div.style.cssText = 'position:fixed;left:50%;bottom:6.5%;transform:translateX(-50%);padding:8px 16px;background:rgba(14,8,26,0.78);color:#f3e6c8;font:600 22px/1.2 system-ui,Segoe UI,sans-serif;border-radius:4px;white-space:nowrap;z-index:9'; document.body.appendChild(div);
    window.H = { bot() {
      const p = g.p, hz = g.world.items.filter(it => OBST[it.kind] && !it.taken && it.z > p.z - 12 && it.z < p.z + 300);
      g.keys.left = g.keys.right = false;                                                  /* (no lane changes: every hazard can be jumped or slid under) */
      let tg = null; for (const it of hz) { const o = OBST[it.kind]; if (Math.abs(it.x - p.x) > o.hw + P_HW + 0.08 || it.z <= p.z - 2) continue; if (!tg || it.z < tg.z) tg = it; }
      if (tg) { const d = tg.z - p.z; if (tg.kind === 'over') { if (d < p.speed * 0.2 + 10 && p.jy === 0 && p.slide <= 0) g.slideKey(); } else if (d < p.speed * 0.3 && p.jy === 0 && !hz.some(it => it.kind === 'over' && it.z > p.z - 10 && it.z < p.z + 12)) g.jump(); } } };
    // one frame: the scripted driver, the game, the picture, the caption
    window.STEP = () => {
      const p = g.p, pk = g.pk, z = p.z, S = G.ST;
      if (z > 4260 && z < 4340) { g.keys.left = g.keys.right = false; p.x = 0.34; p.jy = 0; p.vy = 0; p.slide = 0; }                                                // the close pass: 0.05 beside the last crate, headed for it
      else if (z > 1800 && z < 2130 && pk.t.aura > 0) { g.keys.left = g.keys.right = false; }                                       // the first crate is left to the aura (no jump)
      else H.bot();
      const m0 = pk.mission.done, a0 = pk.t.aura, w0 = pk.waymarks, s0 = pk.shards; ADV(1 / FPS_);
      const cap = z < 300 ? 'Missions, pièces et éclats : le HUD reste en haut' : z < 900 ? 'Éclat de mémoire : il faut sauter pour l\'attraper (total sauvegardé)' : z < 1500 ? 'Aimant : attire les pièces voisines (8 s)' : z < 2000 ? 'Aura : absorbe UN seul choc, puis disparaît' : z < 2500 ? 'Aura : le premier choc est détruit, la course continue' : z < 3000 ? 'Élan : +32 % de vitesse (3,5 s), les obstacles restent évitables' : z < 3250 ? 'Nouveau motif : caisse puis barrière' : z < 3550 ? 'Waymark doré : un saut bien placé est nécessaire' : z < 4200 ? 'Caisses décalées : on saute ou on change de voie' : 'Quasi-collision : +5 points (une seule fois par obstacle)';
      document.getElementById('cap').textContent = pk.flash > 1.0 ? 'Mission accomplie : +100 points et +1 éclat' : cap;
      DRAW(); return { z: Math.round(p.z), near: pk.nearMisses, flash: pk.flash, aura: pk.t.aura, a0, magnet: pk.t.magnet, dash: pk.dashK, wm: pk.waymarks - w0, shard: pk.shards - s0, state: g.state, missionDone: pk.mission.done, m0 };
    };
    window.FPS_ = 20;
  });
  const stills = {}, st = { prevAura: 0, prevNear: 0, wmFrame: -99, shFrame: -99 };
  for (let i = 0; i < N; i++) {
    const s = await pg.evaluate(() => STEP());
    await pg.screenshot({ path: path.join(FRAMES, 'f' + String(i).padStart(4, '0') + '.png') });
    if (!stills.shard && s.shard > 0) stills.shard = i + 1;
    if (!stills.near && s.near > st.prevNear) stills.near = i + 2; st.prevNear = s.near;
    if (!stills.magnet && s.magnet > 0 && s.z > 1200) stills.magnet = i;
    if (!stills.aura && s.aura > 10 && s.z > 1900) stills.aura = i;
    if (!stills.pop && st.prevAura > 0 && s.aura === 0 && s.z > 2000) stills.pop = i + 2;
    if (!stills.dash && s.dash > 0.9) stills.dash = i;
    if (!stills.waymark && s.wm > 0) stills.waymark = i + 1;
    if (!stills.mission && s.flash > 1.6) stills.mission = i + 1;
    st.prevAura = s.aura; if (s.state !== 'play') { console.log('run ended at frame', i, JSON.stringify(s)); break; }
  }
  console.log('stills', JSON.stringify(stills), 'errors', errs.slice(0, 2));
  fs.writeFileSync(path.join(OUT, 'stills.json'), JSON.stringify(stills));
  await b.close(); srv.close();
  const ff = process.env.FFMPEG || 'ffmpeg';
  cp.execFileSync(ff, ['-y', '-framerate', String(FPS), '-i', path.join(FRAMES, 'f%04d.png'), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '24', '-preset', 'veryfast', '-movflags', '+faststart', path.join(OUT, 'wayfarer-perks-demo.mp4')], { stdio: 'ignore' });
  console.log('video', fs.statSync(path.join(OUT, 'wayfarer-perks-demo.mp4')).size);
})().catch(e => { console.log('DEMO ERROR', e.message); process.exit(1); });
