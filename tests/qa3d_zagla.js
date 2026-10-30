// WAYFARER regression test: ZAGLA, the second character, a real 3D body (src3d/zagla3d.js, src3d/zagla_assets.js made by tools/make_zagla_assets.py from the user's two pictures of her, FRONT and BACK): the textures
// (the front picture and the back picture, cut out and scaled, as they are), the mesh (a volume, a body and two legs), the run (the legs swing, it stands on the vehicles), the choice of the character on the title screen
// (the button, the C key, remembered, ?avatar=), the pools, and the classic 2D game (untouched).
//
// Run:  node tests/qa3d_zagla.js     (needs playwright-core and a Chromium: CHROMIUM=/path/to/chrome, NODE_PATH or PW_CORE as for the other tests; TEST_URL=https://... tests a deployment)
const http = require('http'), fs = require('fs'), path = require('path');
let chromium; try { ({ chromium } = require('playwright-core')); } catch (e) { ({ chromium } = require(process.env.PW_CORE || 'playwright-core')); }
const ROOT = path.join(__dirname, '..'), PORT = 8127;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const res = []; const T = (n, ok, i = '') => { res.push(ok); console.log((ok ? 'PASS ' : 'FAIL ') + n + (i !== '' ? '  [' + i + ']' : '')); };

(async () => {
  const srv = http.createServer((q, r) => {
    let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
    fs.readFile(path.join(ROOT, p), (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' }); r.end(d); } });
  }).listen(PORT);
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/root/.cache/ms-playwright/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const base = process.env.TEST_URL || 'http://localhost:' + PORT + '/';
  const open = async (url, ctx) => { const pg = await (ctx || await b.newContext({ viewport: { width: 640, height: 360 } })).newPage(); pg.errs = []; pg.on('pageerror', e => pg.errs.push(e.message)); pg.on('console', m => m.type() === 'error' && !/404/.test(m.text()) && pg.errs.push(m.text())); await pg.goto(url, { timeout: 90000 }); await pg.waitForFunction(() => window.__wf, null, { timeout: 60000 }); await pg.waitForTimeout(1500); return pg; };

  // ================================================================ 1. the assets: the two textures and the mesh
  const pg = await open(base + '?avatar=zagla');
  const AS = await pg.evaluate(async () => {
    const A = ZAGLA_ASSETS, out = { w: A.w, h: A.h, pieces: A.pieces.map(p => [p.name, p.n, !!p.b]), mpp: A.mpp, mppx: A.mppx, mppy: A.mppy, mppz: A.mppz, step: A.step, fmt: [A.front.slice(0, 22), A.back.slice(0, 22)] };
    const px = async src => { const img = new Image(); img.src = src; await img.decode(); const cv = document.createElement('canvas'); cv.width = img.naturalWidth; cv.height = img.naturalHeight; const x = cv.getContext('2d'); x.drawImage(img, 0, 0); const d = x.getImageData(0, 0, cv.width, cv.height).data; return { w: cv.width, h: cv.height, d }; };
    const cls = ({ d }) => { const c = { n: 0, black: 0, violet: 0, magenta: 0, green: 0, beige: 0, red: 0, lime: 0, navy: 0 }; for (let i = 0; i < d.length; i += 4) { const r = d[i], g = d[i + 1], bl = d[i + 2], a = d[i + 3]; if (a < 200) continue; c.n++;
        if (r < 40 && g < 40 && bl < 70) c.black++; else if (r < 130 && g < 60 && bl > 150) c.violet++; else if (r > 200 && g < 90 && bl > 150) c.magenta++; else if (g > 200 && r < 90 && bl < 120) c.green++; else if (r > 190 && g > 160 && bl > 100 && bl < 200 && r - bl > 25 && g - bl > 15) c.beige++; else if (r > 200 && g < 100 && bl < 100) c.red++; else if (r > 190 && g > 230 && bl < 100) c.lime++; else if (r < 20 && g < 20 && bl >= 25 && bl < 60) c.navy++; } return c; };
    const F = await px(A.front), K = await px(A.back); out.front = cls(F); out.back = cls(K); out.dims = [F.w, F.h, K.w, K.h];
    // the silhouettes of the two textures are one the mirror of the other (the back is the view from behind)
    let diff = 0, area = 0; for (let y = 0; y < F.h; y += 2) for (let x = 0; x < F.w; x += 2) { const a = F.d[(y * F.w + x) * 4 + 3] > 128, bk = K.d[(y * K.w + (K.w - 1 - x)) * 4 + 3] > 128; if (a) area++; if (a !== bk) diff++; } out.mirror = +(diff / area).toFixed(3);
    // the back is the user's own back picture, not the front mirrored: over the torso the two textures are very different, and the back carries the green and yellow pattern of its torso
    let td = 0, tn = 0; for (let y = 280; y < 480; y += 2) for (let x = 60; x < F.w - 60; x += 2) { const o = (y * F.w + x) * 4, q = (y * F.w + (F.w - 1 - x)) * 4; if (F.d[o + 3] < 200 || K.d[o + 3] < 200) continue; tn++; td += (Math.abs(F.d[q] - K.d[o]) + Math.abs(F.d[q + 1] - K.d[o + 1]) + Math.abs(F.d[q + 2] - K.d[o + 2])) / 3; }
    out.torsoDiff = +(td / Math.max(tn, 1)).toFixed(1);
    const ax2b = A.w - A.axis, white = I => { let n = 0, t = 0; for (let i = 0; i < I.d.length; i += 4) { if (I.d[i + 3] < 200) continue; t++; if (I.d[i] > 240 && I.d[i + 1] > 240 && I.d[i + 2] > 240) n++; } return +(n / t).toFixed(4); };
    const boots = I => { let m = 0, bl = 0, t = 0; for (let y = Math.round(I.h * 0.88); y < I.h; y++) for (let x = 0; x < I.w; x++) { const o = (y * I.w + x) * 4; if (I.d[o + 3] < 200) continue; t++; if (I.d[o] > 200 && I.d[o + 1] < 90 && I.d[o + 2] > 150) m++; else if (I.d[o] > 200 && I.d[o + 1] > 200 && I.d[o + 2] > 200) bl++; } return { magenta: m, white: bl, n: t }; };
    out.boots = { front: boots(F), back: boots(K) };                                // the front shows the pink and white toes of the sneakers; from behind a boot is a dark heel (her back picture): none of the front's pink on her back
    // the rest of her is in the OPPOSITE position on the back (a real view from behind): the violet cuff of her arm is on the left of the front and on the right of the back, the green cuff the other way round
    const cuff = (I, rows, side) => { let v = 0, g = 0; const ax = A.axis; for (let y = rows[0]; y < rows[1]; y++) for (let x = 0; x < I.w; x++) { const dx = x - ax; if (Math.abs(dx) < 0.34 * I.w || (side === 'L') !== (dx < 0)) continue; const o = (y * I.w + x) * 4; if (I.d[o + 3] < 200) continue; if (I.d[o] < 140 && I.d[o + 1] < 70 && I.d[o + 2] > 150) v++; else if (I.d[o] < 120 && I.d[o + 1] > 200 && I.d[o + 2] < 120) g++; } return [v, g]; };
    out.cuffs = { frontL: cuff(F, [250, 420], 'L'), frontR: cuff(F, [250, 420], 'R'), backL: cuff(K, [250, 420], 'L'), backR: cuff(K, [250, 420], 'R') };
    let ad = 0, an = 0; for (let y = 250; y < 420; y++) for (let x = 0; x < F.w; x++) { if (Math.abs(x - ax2b) < 0.34 * F.w) continue; const o = (y * F.w + x) * 4, q = (y * F.w + (F.w - 1 - x)) * 4; if (F.d[q + 3] < 200 || K.d[o + 3] < 200) continue; an++; ad += (Math.abs(F.d[q] - K.d[o]) + Math.abs(F.d[q + 1] - K.d[o + 1]) + Math.abs(F.d[q + 2] - K.d[o + 2])) / 3; }
    out.armsDiff = +(ad / Math.max(an, 1)).toFixed(1);                              // the arms of the back are the arms of the front seen from behind (small difference)
    // the TOES: in the front picture the toes of the boots point down and OUT; on the back they point down and IN (the feet were turned the wrong way round; her red strokes): measured on each leg, how far the silhouette
    // of the boot goes beyond the shaft of the leg on the outer side and on the inner side
    const toe = (I, side) => { const row = []; for (let x = 0; x < I.w; x++) if (I.d[(744 * I.w + x) * 4 + 3] > 128 && (side === 'L') === (x < A.axis)) row.push(x); const s0 = Math.min(...row), s1 = Math.max(...row); let lo = 1e9, hi = -1;
      for (let y = 756; y < I.h; y++) for (let x = 0; x < I.w; x++) { if (I.d[(y * I.w + x) * 4 + 3] < 128 || (side === 'L') !== (x < A.axis)) continue; if (x < lo) lo = x; if (x > hi) hi = x; }
      const outer = side === 'L' ? s0 - lo : hi - s1, inner = side === 'L' ? hi - s1 : s0 - lo; return { outer, inner, shaft: [s0, s1] }; };
    out.toes = { frontL: toe(F, 'L'), frontR: toe(F, 'R'), backL: toe(K, 'L'), backR: toe(K, 'R') };
    out.bootLime = 0; for (let y = 735; y < K.h; y++) for (let x = 0; x < K.w; x++) { const o = (y * K.w + x) * 4; if (K.d[o + 3] > 200 && K.d[o + 1] > 170 && K.d[o] < 190 && K.d[o + 2] < 120) out.bootLime++; }      // (the lime spots of her boots)
    out.white = [white(F), white(K)];                                              // no white fringe: the back's own white background never shows inside the silhouette
    // BOTH ARMS AND BOTH BOOTS ARE THE SAME (the right ones are the mirror image of her left ones): the silhouette of the arm band and the pixels of the boot band, compared with their mirror about her body axis
    const lg = A.pieces.filter(p => /^leg/.test(p.name)), ax2 = (lg[0].pivot[0] + lg[1].pivot[0]) / 2, sym1 = (I, y0, y1, colour, ax) => { let diff = 0, area = 0, dc = 0; for (let y = y0; y < y1; y++) for (let x = 0; x < I.w; x++) { const mx = Math.round(2 * ax - x); if (mx < 0 || mx >= I.w) continue; const o = (y * I.w + x) * 4, q = (y * I.w + mx) * 4, a1 = I.d[o + 3] > 128, a2 = I.d[q + 3] > 128;
        if (a1 || a2) area++; if (a1 !== a2) diff++; if (colour && a1 && a2) dc += Math.abs(I.d[o] - I.d[q]) + Math.abs(I.d[o + 1] - I.d[q + 1]) + Math.abs(I.d[o + 2] - I.d[q + 2]); } return { area, diff: +(diff / Math.max(area, 1)).toFixed(3), colour: +(dc / Math.max(area, 1) / 3).toFixed(1) }; }, sym = (I, y0, y1, colour, ax) => { let best = null; for (const d of [-1, -0.5, 0, 0.5, 1]) { const r = sym1(I, y0, y1, colour, ax + d); if (!best || r.diff < best.diff) best = r; } return best; };      // (the axis to within a pixel: a mirror about a half pixel moves every edge)
    out.symArm = sym(F, 255, 350, false, A.axis); out.symBoot = sym(F, 710, 800, true, ax2); out.symBody = sym(F, 100, 700, false, A.axis);   // (the body for comparison: her head, pads and skirt are as they were)
    out.axis = A.axis;
    return out;
  });
  T('Zagla\'s assets: the picture cut out (' + AS.dims[0] + ' x ' + AS.dims[1] + ', its own alpha) and the back texture of the same size (' + AS.dims[2] + ' x ' + AS.dims[3] + '), both WebP, the back being the view from behind (the two silhouettes differ by ' + AS.mirror + ' of her area: mirror images), in three pieces ' + AS.pieces.map(p => p[0] + ' ' + p[1]).join(', '),
    AS.dims[0] === AS.w && AS.dims[1] === 800 && AS.dims[2] === AS.w && AS.dims[3] === 800 && /webp/.test(AS.fmt[0]) && /webp/.test(AS.fmt[1]) && AS.mirror < 0.04 && AS.pieces.length === 3 && AS.pieces[0][0] === 'body' && AS.pieces[0][1] > 5000 && AS.pieces[1][0] === 'legL' && AS.pieces[2][0] === 'legR' && AS.pieces[1][1] > 200 && AS.mppx > 0 && AS.mppy > 0 && AS.mppz > 0, JSON.stringify(AS.pieces));
  T('both arms and both boots are the same on both sides, as in her pictures: the silhouette of the band of the arms matches its mirror image about her body axis (' + AS.symArm.diff + ' of ' + AS.symArm.area + ' px differ), the boots about the middle of her legs (' + AS.symBoot.diff + ' of ' + AS.symBoot.area + ' differ)',
    AS.symArm.area > 3000 && AS.symArm.diff < 0.2 && AS.symBoot.area > 2500 && AS.symBoot.diff < 0.2, JSON.stringify([AS.symArm, AS.symBoot, AS.symBody]));
  T('the back of Zagla is a HOOD (the head and the torso are her back picture: the black hood with its V edge and the pattern of the cloak, differing from the front by ' + AS.torsoDiff + ' on average) and the REST of her is in the opposite position, as in a real view from behind: her violet cuff is at the left on the front (' + AS.cuffs.frontL[0] + ' violet px left, ' + AS.cuffs.frontR[0] + ' right) and at the right on the back (' + AS.cuffs.backL[0] + ' left, ' + AS.cuffs.backR[0] + ' right), the green cuff the other way round (front ' + AS.cuffs.frontL[1] + ' left, ' + AS.cuffs.frontR[1] + ' right; back ' + AS.cuffs.backL[1] + ' left, ' + AS.cuffs.backR[1] + ' right); the arms of the back match the arms of the front mirrored (difference ' + AS.armsDiff + ')',
    AS.torsoDiff > 35 && AS.cuffs.frontL[0] > 40 && AS.cuffs.frontL[0] > 3 * AS.cuffs.frontR[0] && AS.cuffs.backR[0] > 40 && AS.cuffs.backR[0] > 3 * AS.cuffs.backL[0] && AS.cuffs.frontR[1] > 40 && AS.cuffs.frontR[1] > 3 * AS.cuffs.frontL[1] && AS.cuffs.backL[1] > 40 && AS.cuffs.backL[1] > 3 * AS.cuffs.backR[1] && AS.armsDiff < 30, JSON.stringify([AS.cuffs, AS.armsDiff]));
  T('the feet: on the FRONT the toes of the boots point down and OUT (' + AS.toes.frontL.outer + ' px beyond the leg on the outer side of the left boot, ' + AS.toes.frontL.inner + ' on the inner side; right boot ' + AS.toes.frontR.outer + ' / ' + AS.toes.frontR.inner + '); on the BACK they are her own small boots from behind (her new back picture: a white and cyan collar, lime spots, no toe wedge): ' + AS.toes.backL.outer + ' outer / ' + AS.toes.backL.inner + ' inner on the left, ' + AS.toes.backR.outer + ' / ' + AS.toes.backR.inner + ' on the right, with ' + AS.bootLime + ' lime px on them; the legs have their own back silhouette (' + AS.pieces.filter(p => p[2]).length + ' of the two legs)',
    AS.toes.frontL.outer - AS.toes.frontL.inner > 10 && AS.toes.frontR.outer - AS.toes.frontR.inner > 10 && Math.abs(AS.toes.backL.outer - AS.toes.backL.inner) < 12 && Math.abs(AS.toes.backR.outer - AS.toes.backR.inner) < 12 && AS.toes.backL.outer < 14 && AS.toes.backR.outer < 14 && AS.bootLime > 60 && AS.pieces.filter(p => p[2]).length === 2 && AS.pieces[0][2] === false, JSON.stringify([AS.toes, AS.bootLime]));
  T('the feet, the colours: the FRONT shows the neon sneakers with their pink toes (' + AS.boots.front.magenta + ' pink px), the BACK shows her boots from behind, dark heels as in her back picture (' + AS.boots.back.magenta + ' pink px, ' + AS.boots.back.white + ' white), not the front\'s feet on her back',
    AS.boots.front.magenta > 500 && AS.boots.back.magenta < 250 && AS.boots.back.white < 0.05 * AS.boots.back.n, JSON.stringify(AS.boots));
  T('the FRONT is her picture, with her colours (black ' + Math.round(AS.front.black / AS.front.n * 100) + ' %, violet ' + AS.front.violet + ', magenta ' + AS.front.magenta + ', neon green ' + AS.front.green + ' px); the BACK is her back picture as it is, not the front mirrored (over the torso the two differ by ' + AS.torsoDiff + ' of 255 on average): black ' + Math.round(AS.back.black / AS.back.n * 100) + ' %, violet ' + AS.back.violet + ', magenta ' + AS.back.magenta + ', neon green ' + AS.back.green + ', lime ' + AS.back.lime + ' (the pattern of its torso), no white fringe in either (' + AS.white.join(' / ') + ' of the pixels white)',
    AS.front.black / AS.front.n > 0.4 && AS.front.violet > 2000 && AS.front.magenta > 800 && AS.front.green > 1500 && AS.back.black / AS.back.n > 0.15 && AS.back.green + AS.back.lime > 2000 && AS.back.violet + AS.back.magenta > 2000 && AS.torsoDiff > 35 && AS.white[0] < 0.02 && AS.white[1] < 0.02, JSON.stringify([AS.front, AS.back, AS.torsoDiff, AS.white]));

  // ================================================================ 2. the model: a body and two legs, a volume 1.9 m tall, the back toward the chase camera
  const MD = await pg.evaluate(async () => {
    const g = __wf, r = g.r, R = r.runner, out = { cls: R.constructor.name, base: Object.getPrototypeOf(R.constructor).name, ch: r.character, tris: R.tris, parts: Object.keys(R.parts), legs: R.legs.length };
    for (let i = 0; i < 80; i++) { await new Promise(q => setTimeout(q, 50)); if (R.tex.front.image.complete && R.tex.back.image.complete && R.tex.front.image.naturalWidth) break; }
    out.tex = [R.tex.front.image.naturalWidth, R.tex.front.image.naturalHeight, R.tex.back.image.naturalWidth, R.tex.back.image.naturalHeight];
    const sv = [R.pivot.scale.clone(), R.pivot.position.clone(), R.pivot.rotation.clone(), R.legs.map(l => l.rotation.x)]; R.pivot.scale.set(1, 1, 1); R.pivot.position.set(0, 0, 0); R.pivot.rotation.set(0, 0, 0); R.legs.forEach(l => { l.rotation.x = 0; });      // (measured in her rest pose: the menu's bounce on the beat and its spin must not count)
    R.group.updateMatrixWorld(true); const bb = new THREE.Box3().setFromObject(R.pivot); out.size = [+(bb.max.x - bb.min.x).toFixed(3), +(bb.max.y - bb.min.y).toFixed(3), +(bb.max.z - bb.min.z).toFixed(3)]; out.straw = [AVATAR_ASSETS.back.mw, AVATAR_ASSETS.back.mh, AVATAR_ASSETS.side.mw]; out.feet = +bb.min.y.toFixed(3); R.pivot.scale.copy(sv[0]); R.pivot.position.copy(sv[1]); R.pivot.rotation.copy(sv[2]); R.legs.forEach((l, i) => { l.rotation.x = sv[3][i]; });
    // the faces: the back surface lies toward +z (the chase camera), the front toward -z; the normals point outward
    const body = R.parts.body, f = body.children[0], k = body.children[1], mean = m => { const n = m.geometry.attributes.normal; let s = 0; for (let i = 0; i < n.count; i++) s += n.getZ(i); return s / n.count; };
    f.geometry.computeBoundingBox(); k.geometry.computeBoundingBox(); out.faces = { frontZ: [+f.geometry.boundingBox.min.z.toFixed(2), +f.geometry.boundingBox.max.z.toFixed(2)], backZ: [+k.geometry.boundingBox.min.z.toFixed(2), +k.geometry.boundingBox.max.z.toFixed(2)], nFront: +mean(f).toFixed(2), nBack: +mean(k).toFixed(2), mapF: f.material.map === R.tex.front, mapB: k.material.map === R.tex.back };
    out.cards = Object.values(R.cards).every(c => !c.parent);                       // the strawberry's flat cards are not on the body; the box above is of the body and the legs (the vehicles are other children of the group)
    return out;
  });
  T('Zagla is a real 3D body (' + MD.cls + ' of ' + MD.base + ', ' + MD.tris + ' triangles in ' + MD.parts.join(', ') + '), the SAME SIZE AS CAPTAIN STRAWBERRY: ' + MD.size[0] + ' m wide with her arms (his artwork ' + MD.straw[0] + '), ' + MD.size[1] + ' m tall (his ' + MD.straw[1] + '), ' + MD.size[2] + ' m deep (his side view ' + MD.straw[2] + '), feet on the ground (' + MD.feet + '), both textures loaded (' + MD.tex.join(' x ') + ')',
    MD.cls === 'RunnerZagla' && MD.base === 'RunnerSprite' && MD.ch === 'zagla' && MD.tris > 20000 && MD.tris < 80000 && MD.parts.join() === 'body,legL,legR' && MD.legs === 2 && Math.abs(MD.size[0] / MD.straw[0] - 1) < 0.02 && Math.abs(MD.size[1] / MD.straw[1] - 1) < 0.02 && Math.abs(MD.size[2] / MD.straw[2] - 1) < 0.03 && Math.abs(MD.feet) < 0.02 && MD.tex[0] === AS.w && MD.tex[1] === 800 && MD.tex[2] === AS.w && MD.cards, JSON.stringify([MD.size, MD.straw]));
  T('the BACK (the strawberry\'s material) faces the chase camera and the FRONT (her picture) faces the other way: the back surface lies at z ' + MD.faces.backZ.join(' .. ') + ' (toward +z, the camera) and the front at ' + MD.faces.frontZ.join(' .. ') + ', the normals point outward (' + MD.faces.nBack + ' / ' + MD.faces.nFront + '), each with its own texture',
    MD.faces.backZ[1] > 0.3 && MD.faces.backZ[0] >= -0.01 && MD.faces.frontZ[0] < -0.3 && MD.faces.frontZ[1] <= 0.01 && MD.faces.nBack > 0.1 && MD.faces.nFront < -0.1 && MD.faces.mapF && MD.faces.mapB, JSON.stringify(MD.faces));

  // ================================================================ 3. the run: legs swing in opposite phase, tuck in the air, stick out in the slide; the vehicles; the heading; the menu
  const RN = await pg.evaluate(() => {
    const g = __wf, R = g.r.runner, out = {}; const st = o => Object.assign({ beat: 0, faceYaw: 0.3, time: 0, runRate: 2.6, airborne: false, vy: 0, sliding: false, lean: 0, state: 'play', scooter: false }, o);
    let mn = 9, mx = -9, opp = 0, n = 0; R.legAmp = 0; for (let i = 0; i < 240; i++) { R.group.rotation.y = 0.2; R.update(1 / 60, st({ time: i / 60 })); const a = R.legs[0].rotation.x, b = R.legs[1].rotation.x; mn = Math.min(mn, a); mx = Math.max(mx, a); if (i > 60) { n++; if (a * b < 0 || Math.abs(a) < 0.02) opp++; } }
    out.swing = [+mn.toFixed(2), +mx.toFixed(2)]; out.opp = +(opp / n).toFixed(2);
    out.yaw = [+R.pivot.rotation.y.toFixed(3), +R.group.rotation.y.toFixed(3)];                      // a 3D body keeps the heading of the group (0.2); the card would cancel it
    for (let i = 0; i < 60; i++) R.update(1 / 60, st({ airborne: true, time: 5 + i / 60 })); out.air = +R.legs[0].rotation.x.toFixed(2);
    for (let i = 0; i < 60; i++) R.update(1 / 60, st({ sliding: true, time: 6 + i / 60 })); out.slide = +R.legs[0].rotation.x.toFixed(2); out.slideSy = +R.pivot.scale.y.toFixed(2);
    for (let i = 0; i < 120; i++) R.update(1 / 60, st({ scooter: true, vehicle: 'scooter', time: 7 + i / 60 })); out.ride = { y: +R.pivot.position.y.toFixed(2), scooter: R.scooter.visible, legs: +R.legs[0].rotation.x.toFixed(2) };
    for (let i = 0; i < 120; i++) R.update(1 / 60, st({ scooter: true, vehicle: 'surf', time: 9 + i / 60 })); out.surf = { y: +R.pivot.position.y.toFixed(2), board: R.surfB.visible };
    for (let i = 0; i < 120; i++) R.update(1 / 60, st({ time: 11 + i / 60 })); out.off = { y: +R.pivot.position.y.toFixed(2), scooter: R.scooter.visible };
    for (let i = 0; i < 60; i++) R.update(1 / 60, st({ state: 'over', time: 13 + i / 60 })); out.over = +R.pivot.rotation.x.toFixed(2);
    R.update(1 / 60, st({ state: 'pause' })); out.pause = true;
    // the menu: the group is turned toward the camera (pi): her front is seen; the showcase spin turns her
    R.group.rotation.y = Math.PI; R.update(1 / 60, st({ state: 'title', time: 4.5, faceYaw: Math.PI * 0.9 })); out.title = { pivot: +R.pivot.rotation.y.toFixed(2), spinning: Math.abs(R.pivot.rotation.y) > 0.01 };
    R.update(1 / 60, st({ state: 'title', time: 1, faceYaw: Math.PI })); out.titleIdle = +R.pivot.rotation.y.toFixed(3);
    return out;
  });
  T('in the run the two legs swing in opposite phase (' + RN.swing.join(' .. ') + ' rad, opposite ' + Math.round(RN.opp * 100) + ' % of the time), the body keeps the heading of its group (pivot ' + RN.yaw[0] + ' with the group at ' + RN.yaw[1] + ': a 3D body, not a card), the legs tuck in the air (' + RN.air + ') and stick out in the slide (' + RN.slide + ', squashed to ' + RN.slideSy + '), and she is back on her feet afterwards',
    RN.swing[0] < -0.5 && RN.swing[1] > 0.5 && RN.opp > 0.85 && Math.abs(RN.yaw[0]) < 0.01 && Math.abs(RN.yaw[1] - 0.2) < 0.01 && RN.air < -0.3 && RN.slide < -0.5 && RN.slideSy < 0.6 && RN.over < -0.8 && RN.pause, JSON.stringify(RN));
  T('she stands on the vehicles like the strawberry: the kick scooter (' + RN.ride.y + ' m up, shown ' + RN.ride.scooter + ', legs still ' + RN.ride.legs + '), the surfboard (' + RN.surf.y + ' m, board shown ' + RN.surf.board + '), and off again (' + RN.off.y + ', scooter hidden: ' + !RN.off.scooter + '); in the menu her group faces the camera (the front is seen) and the showcase spin turns her (' + RN.title.pivot + ' rad during the spin, ' + RN.titleIdle + ' at rest)',
    RN.ride.y > 0.15 && RN.ride.scooter && Math.abs(RN.ride.legs) < 0.25 && RN.surf.y > 0.1 && RN.surf.board && RN.off.y < 0.15 && !RN.off.scooter && RN.title.spinning && Math.abs(RN.titleIdle) < 0.01, JSON.stringify([RN.ride, RN.surf, RN.off, RN.title]));

  // a frame of the game with her: drawn, nothing dropped, the pixels of her in the picture
  const FR = await pg.evaluate(() => { const g = __wf, r = g.r; g.advance = () => {}; g.die = () => {}; g.start(); g.world.items = []; g.state = 'play'; g.p.speed = 300; for (let i = 0; i < 20; i++) { g.time += 1 / 60; r.draw(g); } return { dropped: r.dropped, vis: r.runner.group.visible, children: r.scene.children.length }; });
  T('a frame of the game with Zagla is drawn: her body visible, nothing dropped (' + FR.dropped + ')', FR.vis && FR.dropped === 0, JSON.stringify(FR));
  T('no JS errors (Zagla)', pg.errs.length === 0, pg.errs.slice(0, 2).join('|')); await pg.context().close();

  // ================================================================ 4. the choice of the character: the button and the C key on the title screen, remembered
  const ctx = await b.newContext({ viewport: { width: 640, height: 360 } });
  const p1 = await open(base, ctx);
  const C0 = await p1.evaluate(() => ({ ch: __wf.r.character, cls: __wf.r.runner.constructor.name, state: __wf.state, btn: typeof BTN !== 'undefined' ? BTN.char : null, has: typeof __wf.r.nextCharacter, saved: localStorage.getItem('wayfarer.character') }));
  await p1.keyboard.press('KeyC'); await p1.waitForTimeout(400);
  const C1 = await p1.evaluate(() => ({ ch: __wf.r.character, cls: __wf.r.runner.constructor.name, saved: localStorage.getItem('wayfarer.character'), inScene: __wf.r.scene.children.includes(__wf.r.runner.group), oldGone: !__wf.r.scene.children.includes(__wf.r.characters.strawberry.group), state: __wf.state }));
  const box = await p1.evaluate(() => { const r = document.getElementById('screen').getBoundingClientRect(); return { l: r.left, t: r.top, w: r.width, h: r.height }; });
  await p1.mouse.click(box.l + (216 + 48) / 320 * box.w, box.t + (123 + 8) / 180 * box.h); await p1.waitForTimeout(400);
  const C2 = await p1.evaluate(() => ({ ch: __wf.r.character, cls: __wf.r.runner.constructor.name, saved: localStorage.getItem('wayfarer.character'), state: __wf.state }));
  await p1.mouse.click(box.l + (216 + 48) / 320 * box.w, box.t + (123 + 8) / 180 * box.h); await p1.waitForTimeout(400);
  const C3 = await p1.evaluate(() => ({ ch: __wf.r.character, state: __wf.state, saved: localStorage.getItem('wayfarer.character') }));
  await p1.reload(); await p1.waitForFunction(() => window.__wf, null, { timeout: 60000 }); await p1.waitForTimeout(1200);
  const C4 = await p1.evaluate(() => ({ ch: __wf.r.character, cls: __wf.r.runner.constructor.name, state: __wf.state }));
  // the choice is only made on the title screen: C during the run does nothing
  await p1.evaluate(() => { __wf.advance = () => {}; __wf.start(); }); await p1.keyboard.press('KeyC'); await p1.waitForTimeout(200);
  const C5 = await p1.evaluate(() => ({ ch: __wf.r.character, state: __wf.state }));
  T('the character is chosen on the title screen: the strawberry by default (' + C0.cls + ', nothing saved: ' + C0.saved + ', the button at ' + (C0.btn && [C0.btn.x, C0.btn.y, C0.btn.w, C0.btn.h].join(',')) + '); the C key (' + C1.ch + ' ' + C1.cls + ', the strawberry out of the scene: ' + C1.oldGone + '), a click on the button (' + C2.ch + ') and another (' + C3.ch + ') change it, every change is saved (' + C1.saved + ' / ' + C2.saved + ' / ' + C3.saved + '), the game is still on the title screen (' + C3.state + '), it is still Zagla after a reload (' + C4.ch + ' ' + C4.cls + '), and C during the run changes nothing (' + C5.ch + ' in ' + C5.state + ')',
    C0.ch === 'strawberry' && C0.cls === 'RunnerSprite' && C0.saved === null && C0.has === 'function' && C0.btn && C0.btn.w > 60 && C0.state === 'title' && C1.ch === 'zagla' && C1.cls === 'RunnerZagla' && C1.saved === 'zagla' && C1.inScene && C1.oldGone && C2.ch === 'strawberry' && C2.saved === 'strawberry' && C3.ch === 'zagla' && C3.state === 'title' && C4.ch === 'zagla' && C4.cls === 'RunnerZagla' && C5.ch === 'zagla' && C5.state === 'play', JSON.stringify([C0, C1, C2, C3, C4, C5]));
  const UI = await p1.evaluate(() => { const px = (x, y) => Array.from(document.getElementById('screen').getContext('2d').getImageData(x, y, 1, 1).data); return null; });
  // the switch builds each runner once: switching ten times leaves the scene, the geometries and the textures as they were
  const SW = await p1.evaluate(() => { const g = __wf, r = g.r; g.state = 'title'; const k0 = r.scene.children.length, geo0 = r.renderer.info.memory.geometries; for (let i = 0; i < 10; i++) { r.nextCharacter(); g.time += 0.1; r.draw(g); } const k1 = r.scene.children.length, geo1 = r.renderer.info.memory.geometries; for (let i = 0; i < 10; i++) { r.nextCharacter(); g.time += 0.1; r.draw(g); } return { k: [k0, k1, r.scene.children.length], geo: [geo0, geo1, r.renderer.info.memory.geometries], tex: r.renderer.info.memory.textures, built: Object.keys(r.characters).sort().join() }; });
  T('switching the character ten times (and ten more) builds each runner once: the scene keeps ' + SW.k.join(' / ') + ' children, the geometries ' + SW.geo.join(' / ') + ' (' + SW.built + ' built), ' + SW.tex + ' textures on the GPU',
    SW.k[1] === SW.k[2] && SW.geo[1] === SW.geo[2] && SW.built === 'strawberry,zagla' && SW.tex <= 40, JSON.stringify(SW));
  // ?avatar= forces one for the visit (and is not remembered)
  const p2 = await open(base + '?avatar=strawberry', await b.newContext({ viewport: { width: 640, height: 360 } }));
  const F1 = await p2.evaluate(() => ({ ch: __wf.r.character, saved: localStorage.getItem('wayfarer.character') }));
  T('?avatar=strawberry gives the strawberry, ?avatar=zagla gives Zagla (nothing saved by the URL alone: ' + F1.saved + ')', F1.ch === 'strawberry' && F1.saved === null && C1.ch === 'zagla', JSON.stringify(F1));
  T('no JS errors (the title screen and the switches)', p1.errs.length === 0 && p2.errs.length === 0, p1.errs.concat(p2.errs).slice(0, 2).join('|')); await p1.context().close(); await p2.context().close();

  // ================================================================ 5. the classic 2D game is untouched: no character button, no Zagla
  const p3 = await open(base + '2d.html');
  const D2 = await p3.evaluate(() => { const g = __wf; return { zagla: typeof RunnerZagla + '/' + typeof ZAGLA_ASSETS, hasChar: typeof g.r.nextCharacter, state: g.state }; });
  await p3.keyboard.press('KeyC'); await p3.waitForTimeout(300); const D3 = await p3.evaluate(() => __wf.state);
  T('the classic 2D game has no character button and no Zagla (' + D2.zagla + ', nextCharacter ' + D2.hasChar + ') and C does nothing there (' + D3 + ')', D2.zagla === 'undefined/undefined' && D2.hasChar === 'undefined' && D3 === 'title' && p3.errs.length === 0, p3.errs.slice(0, 1).join('|'));
  await p3.context().close();
  console.log('\n' + res.filter(Boolean).length + '/' + res.length + ' passed');
  await b.close(); srv.close(); process.exit(res.every(Boolean) ? 0 : 1);
})().catch(e => { console.log('TEST ERROR', e.stack || e.message); process.exit(1); });
