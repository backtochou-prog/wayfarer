// Programmatically drawn pixel-art sprites, built once onto offscreen canvases.
const SPR = {};
function mk(w, h, fn) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d');
  const r = (col, a, b, cw, ch) => { x.fillStyle = col; x.fillRect(a, b, cw, ch); };
  fn(r, w, h, x);
  return c;
}
function disc(r, col, cx, cy, rad) {
  for (let dy = -rad; dy <= rad; dy++) {
    const hw = Math.floor(Math.sqrt(rad * rad - dy * dy + 0.5));
    r(col, cx - hw, cy + dy, hw * 2 + 1, 1);
  }
}
// stepped triangle: outlined, shaded, lit from the left
function tri(r, cx, y0, rows, maxW, fill, lit, edge = C.ink) {
  for (let i = 0; i < rows; i++) {
    const ww = 2 + Math.floor(i * (maxW - 2) / (rows - 1)), x = cx - (ww >> 1);
    r(edge, x, y0 + i, ww, 1);
    if (ww > 2) { r(fill, x + 1, y0 + i, ww - 2, 1); if (i % 3 !== 2) r(lit, x + 1, y0 + i, Math.min(3, ww - 2), 1); }
  }
}

const PCOL = { k: C.ink, h: '#4a3228', s: '#d9a679', t: C.teal, T: C.tealD, b: C.burg, B: C.burgD, a: C.amber, A: C.amberD, c: C.burgL, p: C.earthD };
// little traveller seen from behind: burgundy cap with an amber band, amber scarf, burgundy pack with a bedroll
const PHEAD = [
  '....kkkkkk....',
  '...kcccccck...',
  '..kcccccccck..',
  '.kkAAAAAAAAkk.',
  '..khhhhhhhhk..',
  '...khhhhhhk...',
  '..kaaaaaaaak..',
];
const PTORSO = [
  '..kttbbbbttk..',
  '..ktbbaabbtk..',
  '..ktbbaabbtk..',
  '..kbbbbbbbbk..',
  '..kbBBBBBBbk..',
  '..kttttttttk..',
  '..kppppppppk..',
];
// 4-frame run cycle (contact, pass, contact, pass) with body bob, arm swing and a fluttering scarf tail
const RUN = [
  { l: 24, r: 20, la: 10, ra: 8, bob: 1 },
  { l: 23, r: 22, la: 9, ra: 9, bob: 0 },
  { l: 20, r: 24, la: 8, ra: 10, bob: 1 },
  { l: 22, r: 23, la: 9, ra: 9, bob: 0 },
];
function playerFrame(kind, f = 0) {
  return mk(14, 24, r => {
    const put = (rows, y0) => rows.forEach((row, j) => [...row].forEach((ch, i) => { if (ch !== '.') r(PCOL[ch], i, y0 + j, 1, 1); }));
    const leg = (x, top, bottom) => { r(C.earthD, x, top, 3, bottom - 2 - top); r(C.earth, x, top, 1, bottom - 2 - top); r(C.ink, x, bottom - 2, 4, 2); r(C.earthD, x + 1, bottom - 2, 1, 1); };
    const arm = (x, y, len) => { r(C.teal, x, y, 2, len); r(C.tealD, x === 0 ? 0 : 13, y, 1, len); r('#d9a679', x, y + len, 2, 1); };
    if (kind === 'slide') { // crouched, leaning back: cap, scarf and pack only
      put([PHEAD[1], PHEAD[2], PHEAD[3], PHEAD[4], PHEAD[6], ...PTORSO], 12);
      r(C.amber, 12, 18, 2, 1); r(C.amberD, 13, 19, 1, 1);
      return;
    }
    if (kind === 'jump') {
      put([...PHEAD, ...PTORSO], 0);
      arm(0, 5, 4); arm(12, 5, 4); leg(3, 14, 20); leg(8, 14, 21);
      r(C.amber, 12, 4, 2, 1); r(C.amberD, 13, 3, 1, 1);
      return;
    }
    const q = RUN[f];
    put([...PHEAD, ...PTORSO], q.bob);
    leg(3, 14 + q.bob, q.l); leg(8, 14 + q.bob, q.r);
    arm(0, q.la + q.bob, 4); arm(12, q.ra + q.bob, 4);
    r(C.amber, 12, 6 + q.bob, 2, 1); r(C.amberD, 13, 7 + q.bob + (f & 1), 1, 2);
  });
}

function buildSprites() {
  for (let f = 0; f < 4; f++) SPR['run' + f] = playerFrame('run', f);
  SPR.jump = playerFrame('jump'); SPR.slide = playerFrame('slide');

  // ---- city scenery
  SPR.homeA = mk(34, 78, (r, w, h) => {
    for (let i = 0; i < 14; i++) { const ww = 6 + i * 2, x = (w - ww) >> 1; r(C.ink, x, i, ww, 1); r(C.terraD, x + 1, i, ww - 2, 1); if (i % 3 === 0) r(C.terra, x + 1, i, ww - 2, 1); }
    r(C.ink, 1, 14, 32, 1); r(C.ink, 1, 15, 1, h - 15); r(C.ink, 32, 15, 1, h - 15);
    r(C.burg, 2, 15, 30, h - 18); r(C.burgD, 26, 15, 6, h - 18);
    for (let row = 0; row < 4; row++) for (let col = 0; col < 3; col++) {
      const x = 5 + col * 9, y = 19 + row * 13;
      r(C.ink, x, y, 6, 8); r((row * 3 + col) % 4 === 1 ? C.amber : C.tealD, x + 1, y + 1, 4, 6);
    }
    r(C.stone, 2, h - 3, 30, 3); r(C.earthD, 13, h - 14, 8, 11); r(C.amber, 19, h - 8, 1, 1);
  });
  SPR.homeB = mk(48, 58, (r, w, h) => {
    r(C.stoneD, 34, 0, 6, 10);
    for (let i = 0; i < 12; i++) { const ww = 28 + Math.round(i * 1.5), x = (w - ww) >> 1; r(C.ink, x, 4 + i, ww, 1); r(C.terraD, x + 1, 4 + i, ww - 2, 1); if (i % 3 === 1) r(C.terraL, x + 1, 4 + i, ww - 2, 1); }
    r(C.ink, 2, 16, 44, h - 16); r(C.sand, 3, 16, 42, h - 19); r(C.sandD, 37, 16, 8, h - 19);
    for (const x of [8, 30]) for (const y of [22, 40]) { r(C.ink, x - 1, y, 12, 12); r(C.tealD, x, y + 1, 10, 10); r(C.teal, x, y + 1, 2, 10); r(C.teal, x + 8, y + 1, 2, 10); r(C.amber, x + 3, y + 3, 4, 4); }
    r(C.stone, 3, h - 3, 42, 3);
  });
  SPR.tower = mk(26, 100, (r, w, h) => {
    for (let i = 0; i < 28; i++) { const ww = Math.min(w - 4, 2 + Math.floor(i / 2) * 2), x = (w - ww) >> 1; r(C.ink, x, i, ww, 1); if (ww > 2) r(C.teal, x + 1, i, ww - 2, 1); }
    r(C.ink, 3, 28, 20, h - 28); r(C.stone, 4, 28, 18, h - 31); r(C.stoneD, 17, 28, 5, h - 31); r(C.stoneL, 4, 28, 3, h - 31);
    disc(r, C.ink, 13, 42, 7); disc(r, C.bone, 13, 42, 6); r(C.ink, 13, 37, 1, 6); r(C.ink, 13, 42, 4, 1);
    for (const y of [58, 74]) { r(C.ink, 11, y, 4, 9); r(C.amber, 12, y + 1, 2, 7); }
    r(C.stoneD, 1, h - 6, 24, 6); r(C.ink, 1, h - 6, 24, 1);
  });
  SPR.lamp = mk(8, 36, r => { r(C.ink, 3, 8, 2, 28); r(C.ink, 1, 1, 6, 8); r(C.amber, 2, 2, 4, 6); r(C.amberL, 3, 3, 2, 3); r(C.ink, 1, 33, 6, 3); });

  // ---- city street furniture
  SPR.fenceC = mk(36, 12, r => {
    r(C.ink, 0, 4, 36, 2); r(C.stoneD, 0, 5, 36, 1); r(C.ink, 0, 9, 36, 1);
    for (let x = 0; x < 36; x += 7) { r(C.ink, x, 2, 3, 10); r(C.stoneD, x + 1, 3, 1, 9); r(C.amberD, x + 1, 0, 1, 2); r(C.ink, x, 1, 3, 1); }
  });
  SPR.shopSign = mk(22, 40, r => {
    r(C.ink, 2, 0, 3, 40); r(C.earthD, 3, 1, 1, 39);
    r(C.ink, 3, 4, 17, 2); r(C.ink, 9, 5, 1, 3); r(C.ink, 19, 5, 1, 3);
    r(C.ink, 7, 8, 14, 14); r(C.burg, 8, 9, 12, 12); r(C.amber, 8, 9, 12, 1);
    disc(r, C.amberD, 14, 15, 4); disc(r, C.amber, 14, 15, 3); r(C.amberL, 13, 14, 2, 1);
    r(C.ink, 0, 36, 7, 4);
  });
  // ---- forest props
  SPR.fenceW = mk(38, 14, r => {
    r(C.ink, 0, 4, 38, 3); r(C.earth, 0, 5, 38, 1); r(C.ink, 0, 9, 38, 3); r(C.earth, 0, 10, 38, 1);
    for (const x of [1, 17, 33]) { r(C.ink, x - 1, 1, 5, 13); r(C.earthD, x, 2, 3, 12); r(C.earth, x, 2, 1, 12); }
    r(C.moss, 20, 3, 8, 1);
  });
  SPR.rock = mk(26, 14, r => {
    r(C.ink, 4, 2, 18, 12); r(C.ink, 1, 5, 24, 9);
    r(C.stone, 5, 3, 16, 10); r(C.stone, 2, 6, 22, 7); r(C.stoneL, 5, 3, 8, 3); r(C.stoneD, 15, 9, 9, 4);
    r(C.moss, 5, 2, 11, 2); r(C.mossL, 7, 2, 4, 1); r(C.moss, 2, 6, 4, 2); r(C.forestD, 17, 12, 7, 2);
  });
  // ---- forest scenery
  SPR.conifer = mk(30, 68, (r, w, h) => {
    r(C.earthD, 13, h - 9, 4, 9);
    for (let t = 0; t < 4; t++) tri(r, 15, t * 14, 22, 12 + t * 6, C.forestD, C.forest);
  });
  SPR.pine = mk(22, 90, (r, w, h) => {
    r(C.earthD, 10, h - 8, 3, 8);
    for (let t = 0; t < 6; t++) tri(r, 11, t * 13, 18, 10 + t * 2, C.forestD, C.forest);
  });
  SPR.broad = mk(40, 56, r => {
    r(C.ink, 17, 34, 6, 22); r(C.earthD, 18, 34, 4, 22); r(C.earth, 18, 34, 1, 22);
    disc(r, C.ink, 20, 22, 20); disc(r, C.forestD, 20, 22, 19); disc(r, C.forest, 16, 18, 13);
    disc(r, C.forestD, 31, 28, 8); disc(r, C.forest, 29, 26, 5); disc(r, C.moss, 13, 14, 6); disc(r, C.mossL, 11, 12, 2);
  });
  SPR.bush = mk(18, 12, r => { disc(r, C.ink, 9, 6, 6); disc(r, C.forestD, 9, 6, 5); disc(r, C.forest, 7, 5, 3); r(C.moss, 6, 3, 2, 1); });

  // ---- obstacles: crate (shared), low barrier / fallen branch, overhead banner / vines
  SPR.crate = mk(28, 16, r => {
    r(C.ink, 0, 0, 28, 16); r(C.earth, 1, 1, 26, 14); r(C.earthD, 1, 5, 26, 1); r(C.earthD, 1, 10, 26, 1);
    r(C.burg, 11, 1, 6, 14); r(C.amber, 13, 7, 2, 2); r(C.earthD, 24, 1, 3, 14);
  });
  SPR.cityBarrier = mk(64, 14, r => {
    r(C.ink, 2, 6, 5, 8); r(C.ink, 57, 6, 5, 8); r(C.stoneD, 3, 7, 3, 7); r(C.stoneD, 58, 7, 3, 7);
    r(C.ink, 0, 0, 64, 9);
    for (let i = 0; i < 8; i++) r(i % 2 ? C.bone : C.burg, 1 + i * 8, 1, 8, 7);
  });
  SPR.forestBarrier = mk(64, 14, r => {
    r(C.ink, 2, 4, 60, 8); r(C.earthD, 3, 5, 58, 6); r(C.earth, 3, 5, 58, 2);
    disc(r, C.sandL, 4, 8, 4); disc(r, C.amberD, 4, 8, 2);
    r(C.ink, 18, 0, 2, 5); r(C.ink, 40, 1, 2, 4); r(C.forestD, 17, 0, 3, 3); r(C.forest, 39, 1, 3, 3);
    r(C.moss, 26, 4, 10, 2); r(C.mossL, 28, 4, 4, 1);
  });
  SPR.cityOver = mk(96, 56, r => {
    for (const x of [2, 88]) { r(C.ink, x, 0, 6, 56); r(C.earthD, x + 1, 0, 4, 56); }
    r(C.ink, 2, 1, 92, 6); r(C.earthD, 3, 2, 90, 4);
    r(C.burg, 8, 7, 80, 31);
    for (let x = 12; x < 88; x += 10) r(C.burgD, x, 7, 2, 31);
    for (let x = 8; x < 88; x += 8) { r(C.amber, x, 38, 6, 4); r(C.amberD, x, 41, 6, 1); }
    disc(r, C.burgD, 48, 22, 8); disc(r, C.amber, 48, 22, 6); disc(r, C.burg, 48, 22, 3);
  });
  SPR.forestOver = mk(96, 56, r => {
    for (const x of [2, 88]) { r(C.ink, x, 0, 6, 56); r(C.earthD, x + 1, 0, 4, 56); r(C.earth, x + 1, 0, 1, 56); }
    r(C.ink, 1, 1, 94, 10); r(C.earthD, 2, 2, 92, 8); r(C.earth, 2, 2, 92, 2);
    for (let x = 9; x < 88; x += 5) {
      const len = 16 + Math.floor(rnd(x, 41) * 16);
      r(C.forestD, x, 10, 3, len); r(C.moss, x + 1, 10, 1, len - 4); r(C.forest, x - 1, 10 + len - 3, 5, 3);
    }
  });

  // ---- fork signage
  const sign = (icon, label) => mk(34, 62, (r, w, h, x) => {
    r(C.ink, 15, 30, 4, 32); r(C.earthD, 16, 30, 2, 32);
    r(C.ink, 0, 0, 34, 31); r(C.burgD, 1, 1, 32, 29); r(C.amber, 2, 2, 30, 1); r(C.amber, 2, 28, 30, 1);
    icon(r);
    drawText(x, label, Math.round((34 - textW(label)) / 2), 21, C.bone);
  });
  SPR.signForest = sign(r => { tri(r, 17, 4, 7, 10, C.forest, C.moss, C.forestD); tri(r, 17, 9, 9, 16, C.forest, C.moss, C.forestD); r(C.earth, 16, 18, 2, 2); }, 'WOODS');
  SPR.signMarket = sign(r => {
    for (let i = 0; i < 8; i++) r(i % 2 ? C.amber : C.burgL, 9 + i * 2, 4, 2, 5);
    r(C.ink, 9, 9, 1, 8); r(C.ink, 24, 9, 1, 8); r(C.earth, 10, 12, 14, 5); r(C.amberL, 13, 10, 3, 2); r(C.mossL, 18, 10, 3, 2);
  }, 'MARKET');
  // the signs of the new destinations (2D): a sun over waves, a stone arch, a neon ring
  SPR.signCoast = sign(r => { r(C.amberL, 12, 5, 10, 5); r(C.amber, 10, 7, 14, 3); r(C.tealL, 5, 12, 24, 2); r(C.teal, 5, 14, 24, 2); r(C.tealL, 9, 17, 6, 1); r(C.tealL, 19, 17, 6, 1); }, 'COAST');
  SPR.signIsland = sign(r => { r(C.amberL, 13, 3, 8, 12); r('#d8392b', 13, 3, 8, 1); r('#d8392b', 13, 3, 1, 12); r('#d8392b', 20, 3, 1, 12); r('#f7e9c6', 15, 5, 1, 8); r('#f7e9c6', 18, 5, 1, 8); r(C.tealL, 6, 16, 22, 2); r(C.teal, 8, 18, 18, 1); }, 'ISLE');   // a painted tower over the water
  SPR.signRuins = sign(r => { r(C.stoneL, 9, 6, 3, 11); r(C.stoneL, 22, 6, 3, 11); r(C.stone, 9, 4, 16, 3); r(C.stoneD, 12, 7, 10, 2); r(C.mossL, 9, 15, 3, 2); r(C.mossL, 22, 12, 3, 2); r(C.moss, 13, 8, 8, 1); }, 'RUINS');
  SPR.signNeon = sign(r => { r('#ff2fd0', 9, 5, 16, 2); r('#ff2fd0', 9, 14, 16, 2); r('#ff2fd0', 9, 7, 2, 7); r('#ff2fd0', 23, 7, 2, 7); r('#22e0e8', 13, 9, 8, 3); r('#22e0e8', 15, 8, 4, 5); }, 'NEON');
  // ---- market street furniture
  SPR.stall = mk(40, 34, r => {
    r(C.earthD, 3, 10, 3, 24); r(C.earthD, 34, 10, 3, 24);
    r(C.ink, 0, 1, 40, 1);
    for (let i = 0; i < 10; i++) { r(i % 2 ? C.amber : C.burg, i * 4, 2, 4, 8); r(i % 2 ? C.amberD : C.burgD, i * 4, 10, 4, 2); }
    r(C.ink, 3, 22, 34, 12); r(C.earth, 4, 23, 32, 10); r(C.earthD, 4, 28, 32, 1);
    r(C.amberL, 8, 19, 4, 3); r(C.mossL, 14, 19, 4, 3); r(C.burgL, 24, 19, 4, 3); r(C.amberL, 30, 19, 3, 3);
  });
  SPR.bench = mk(24, 12, r => {
    r(C.ink, 0, 0, 24, 3); r(C.earthD, 1, 1, 22, 1);
    r(C.ink, 0, 4, 24, 4); r(C.earth, 1, 5, 22, 2);
    r(C.ink, 2, 8, 3, 4); r(C.ink, 19, 8, 3, 4);
  });
  SPR.gore = mk(10, 30, r => {
    r(C.ink, 0, 0, 10, 30);
    for (let y = 0; y < 5; y++) { r(y % 2 ? C.burgD : C.amber, 1, 1 + y * 5, 8, 5); }
    r(C.ink, 0, 26, 10, 4);
  });

  // ---- coin spin frames
  SPR.coin = [8, 6, 4, 6].map(ww => mk(8, 8, r => {
    const x = (8 - ww) >> 1;
    r(C.ink, x + 1, 0, ww - 2, 8); r(C.ink, x, 1, ww, 6);
    r(C.amber, x + 1, 1, ww - 2, 6); r(C.amberL, x + 1, 1, 1, 4);
  }));
}

// Parallax skyline height maps (wrap at N). Heights are px above the horizon; three depths per biome.
const Skyline = {
  N: 640,
  city() {
    const N = this.N, far = new Array(N).fill(0), mid = new Array(N).fill(0), near = new Array(N).fill(0), lights = [];
    for (let x = 0; x < N;) { // distant towers and spires
      const w = 10 + Math.floor(rnd(x, 1) * 16), h = 16 + Math.floor(rnd(x, 2) * 20);
      for (let i = 0; i < w && x + i < N; i++) far[x + i] = h;
      if (rnd(x, 3) > 0.8) for (let i = -3; i <= 3; i++) { const xi = x + (w >> 1) + i; if (xi >= 0 && xi < N) far[xi] = h + (4 - Math.abs(i)) * 4; }
      x += w;
    }
    for (let x = 0; x < N;) { // terracotta gables with chimneys
      const w = 16 + Math.floor(rnd(x, 5) * 14), h = 10 + Math.floor(rnd(x, 6) * 12);
      for (let i = 0; i < w && x + i < N; i++) mid[x + i] = h + Math.floor((w / 2 - Math.abs(i - w / 2)) * 0.7);
      if (rnd(x, 9) > 0.55) { const cx = x + 3 + Math.floor(rnd(x, 10) * (w - 8)); for (let i = 0; i < 2 && cx + i < N; i++) mid[cx + i] += 4; }
      if (rnd(x, 7) > 0.5) lights.push([x + 4 + Math.floor(rnd(x, 8) * (w - 8)), h - 4]);
      x += w;
    }
    for (let x = 0; x < N;) { // low street-level roof line
      const w = 14 + Math.floor(rnd(x, 21) * 14), h = 5 + Math.floor(rnd(x, 22) * 6);
      for (let i = 0; i < w && x + i < N; i++) near[x + i] = h + (rnd(x, 23) > 0.5 ? Math.max(0, 3 - Math.floor(Math.abs(i - w / 2) * 0.6)) : 0);
      x += w;
    }
    return { far, mid, near, lights };
  },
  forest() {
    const N = this.N, far = [], near = [], mid = new Array(N).fill(10);
    for (let x = 0; x < N; x++) far.push(Math.round(20 + 7 * Math.sin(x / N * Math.PI * 8) + 4 * Math.sin(x / N * Math.PI * 22 + 1)));
    for (let x = 0; x < N; x += 12 + Math.floor(rnd(x, 11) * 10)) { // pine tops
      const th = 22 + Math.floor(rnd(x, 12) * 14), half = Math.ceil(th / 2.4);
      for (let i = -half; i <= half; i++) { const xi = (x + i + N) % N; mid[xi] = Math.max(mid[xi], 10 + Math.round(th - Math.abs(i) * 2.4)); }
    }
    for (let x = 0; x < N; x++) near.push(Math.round(6 + 2 * Math.sin(x * 0.35) + 1.5 * Math.sin(x * 0.13) + (rnd(x >> 2, 31) > 0.8 ? 3 : 0)));
    return { far, mid, near, lights: [] };
  },
};
