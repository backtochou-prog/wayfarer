// Canvas renderer: sky/parallax, perspective road with curves, depth-sorted objects, HUD and overlays.
// Every world->screen x goes through the same formula: perspective scale + a "sway" term that is zero
// at the player's depth, so the road can lean toward a chosen branch while the runner stays put.
const LOW_PROPS = new Set(['lamp', 'fenceC', 'fenceW', 'bench', 'rock', 'bush', 'shopSign']); // hug the road edge
const PARALLAX = [['far', 4, 0], ['mid', 9, 1], ['near', 18, 2]];                              // layer, speed, colour index

class Renderer {
  constructor(cv) {
    this.ctx = cv.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    buildSprites();
    this.layers = { city: Skyline.city(), forest: Skyline.forest() };
    const pc = mk(2, 2, r => { r(C.ink, 0, 0, 1, 1); r(C.ink, 1, 1, 1, 1); });
    this.dither = this.ctx.createPattern(pc, 'repeat');
    this.dk = {};
  }

  sx(wx, s) { return 160 + (wx - this.camW) * LPX * s + this.sway * (1 - s / S20); }
  dark(c) { return this.dk[c] || (this.dk[c] = lerpHex(c, C.ink, 0.22)); }

  draw(g) {
    const ctx = this.ctx, p = g.p;
    this.camW = g.camX + g.camOff; this.sway = g.sway; this.camZ = p.z - PLAYER_D;
    ctx.save();
    if (g.shake > 0) ctx.translate(Math.round(Math.sin(g.time * 90) * g.shake * 8), Math.round(Math.cos(g.time * 70) * g.shake * 6));
    this.drawSky(g);
    this.drawRoad(g.world);
    this.drawObjects(g);
    this.drawBeams(g);
    this.drawCanopy(g);
    for (const f of g.fx) {
      const x = Math.round(f.x), y = Math.round(f.y);
      if (f.txt) { drawText(ctx, f.txt, x + 1, y + 1, C.ink); drawText(ctx, f.txt, x, y, f.col); }
      else { ctx.fillStyle = f.col; ctx.fillRect(x, y, f.s || 2, f.s || 2); }
    }
    ctx.restore();
    this.drawUI(g);
  }

  // HUD, touch controls and screens; also used on its own as the overlay of the 3D front end
  drawUI(g) {
    const ctx = this.ctx;
    if (g.state === 'over' && g.flash > 0) { ctx.globalAlpha = 0.5; ctx.fillStyle = C.burg; ctx.fillRect(0, 0, VW, VH); ctx.globalAlpha = 1; }
    if (g.state !== 'title') this.drawHud(g);
    this.drawTouch(g);
    if (g.state === 'play') this.drawScooterHint(g);
    if (g.scene || g.fadeIn > 0) this.drawSceneOverlay(g);
    if (g.state === 'title') this.drawTitle(g);
    else if (g.state === 'pause') this.drawPause(g);
    else if (g.state === 'over' && g.overT > 0.5) this.drawOver(g);
    if (g.sfx && g.state !== 'play' && g.state !== 'scene') this.drawSoundBtn(g);
  }

  // the sound on / off icon (bottom-right of the menu, pause and game-over screens): a speaker with waves when on, crossed out when off
  drawSoundBtn(g) {
    const b = BTN.sound, c = this.ctx, m = g.mouse, hov = m.x >= b.x && m.x <= b.x + b.w && m.y >= b.y && m.y <= b.y + b.h, off = g.sfx.muted;
    c.fillStyle = C.ink; c.fillRect(b.x - 1, b.y - 1, b.w + 2, b.h + 2); c.fillStyle = hov ? '#3a2d52' : C.plum; c.fillRect(b.x, b.y, b.w, b.h);
    const x = b.x + 3, y = b.y + 4, col = off ? C.stoneD : C.tealL;
    c.fillStyle = col; c.fillRect(x, y + 3, 3, 4); c.fillRect(x + 3, y + 2, 1, 6); c.fillRect(x + 4, y + 1, 1, 8); c.fillRect(x + 5, y, 1, 10);
    if (off) { c.fillStyle = C.terraL; for (let k = 0; k < 6; k++) { c.fillRect(x + 8 + k, y + 2 + k, 1, 1); c.fillRect(x + 13 - k, y + 2 + k, 1, 1); } }
    else { c.fillStyle = col; c.fillRect(x + 8, y + 3, 1, 4); c.fillRect(x + 10, y + 1, 1, 8); }
  }

  drawSky(g) {
    const ctx = this.ctx, pal = paletteFor(g.bgTo, g.bgT);
    [[0, 22], [22, 18], [40, 14], [54, 10]].forEach(([y, h], i) => { ctx.fillStyle = pal.sky[i]; ctx.fillRect(0, y, VW, h); });
    const toF = BIOMES[g.bgTo].skyline === 'forest', t = g.bgT;
    const sunY = 52 + (toF ? t * 16 : 0);
    ctx.fillStyle = C.amberL; ctx.fillRect(228, sunY - 10, 16, 20); ctx.fillRect(225, sunY - 6, 22, 12); ctx.fillRect(227, sunY - 8, 18, 16);
    if ((toF ? 1 - t : 1) > 0.4) { // city: a few slow, flat evening clouds
      const cc = lerpHex(pal.sky[2], pal.sky[3], 0.6), cs = lerpHex(cc, C.burg, 0.45);
      for (let k = 0; k < 3; k++) {
        const x = Math.round(((g.time * 2.5 + k * 130) % (VW + 80)) - 40), y = 14 + k * 10 + (k & 1) * 4;
        ctx.fillStyle = cc; ctx.fillRect(x + 6, y, 16, 2); ctx.fillRect(x, y + 2, 30, 3);
        ctx.fillStyle = cs; ctx.fillRect(x + 2, y + 5, 26, 1);
      }
    }
    const cityShift = toF ? t * 46 : 0, forestShift = toF ? (1 - t) * 46 : 46;
    const L = this.layers, par = this.camW - this.sway * 0.06, N = Skyline.N;
    for (const [key, k, ci] of PARALLAX) {
      this.layer(L.city[key], BIOMES.city.layers[ci], par * k, cityShift);
      if (key === 'mid') {
        const off = Math.floor(par * k); ctx.fillStyle = C.amber;
        for (const [lx, ly] of L.city.lights) { const sx = (((lx - off) % N) + N) % N; if (sx < VW) ctx.fillRect(sx, HY - ly + Math.round(cityShift), 1, 2); }
      }
      this.layer(L.forest[key], BIOMES.forest.layers[ci], par * k, forestShift);
    }
  }

  layer(arr, col, off, shift) {
    if (shift >= 46) return;
    const ctx = this.ctx, N = Skyline.N; off = Math.floor(off); ctx.fillStyle = col;
    for (let x = 0; x < VW;) {
      const idx = (((x + off) % N) + N) % N, h = arr[idx]; let run = 1;
      while (x + run < VW && arr[(((x + run + off) % N) + N) % N] === h) run++;
      if (h > 0) ctx.fillRect(x, HY - h + Math.round(shift), run, h + 2);
      x += run;
    }
  }

  drawRoad(w) {
    const ctx = this.ctx, camZ = this.camZ;
    for (let y = HY; y < VH; y++) {
      const t = (y + 0.5 - HY) / (VH - HY), d = K * (1 / t - 1), z = camZ + d;
      const stripe = d > 420 ? 0 : (Math.floor(z / 36) & 1);
      const bands = w.bandsAt(z), b0 = bands[0], b1 = bands[bands.length - 1];
      const X = wx => Math.round(this.sx(wx, t));
      const split = clamp(bands.length > 1 ? Math.round((X(b0.hi + b0.off) + X(b1.lo + b1.off)) / 2) : X(b0.off), 0, VW);
      const pl = paletteFor(b0.eL.to, b0.eL.t), pr = paletteFor(b1.eR.to, b1.eR.t);
      ctx.fillStyle = pl.ground[stripe]; ctx.fillRect(0, y, split, 1);
      ctx.fillStyle = pr.ground[stripe]; ctx.fillRect(split, y, VW - split, 1);
      // the chosen road is drawn last so it stays on top where the two roads overlap in the merge
      const order = bands.length > 1 && bands[0].chosen ? [bands[1], bands[0]] : bands;
      for (const b of order) {
        const pal = paletteFor(b.to, b.t);
        const a = X(b.lo + b.off), e = X(b.hi + b.off), cw = Math.max(1, Math.round(0.14 * LPX * t));
        ctx.fillStyle = pal.curb[stripe]; ctx.fillRect(a, y, e - a, 1);
        ctx.fillStyle = pal.road[stripe]; ctx.fillRect(a + cw, y, e - a - 2 * cw, 1);
        if (bands.length === 1 && stripe === 0) {
          const lw = Math.max(1, Math.round(0.05 * LPX * t));
          ctx.fillStyle = pal.line; ctx.fillRect(X(b.off) - (lw >> 1), y, lw, 1);
        }
        if (d < 300) this.roadDetail(w, b, z, y, t, a + cw, e - cw, stripe, pal, X);
      }
    }
  }

  // cobblestone flecks on city roads, wheel ruts and pebbles on forest tracks
  roadDetail(w, b, z, y, t, x0, x1, stripe, pal, X) {
    const ctx = this.ctx, bi = BIOMES[b.t > 0.5 ? b.to : w.baseBiome], dc = this.dark(pal.road[stripe]);
    if (x1 - x0 < 4) return;
    ctx.fillStyle = dc;
    if (bi.detail === 'cobble') {
      const key = Math.floor(z / 7);
      for (let k = 0; k < 4; k++) ctx.fillRect(x0 + Math.floor(rnd(key, k + 7 * (b.side + 2)) * (x1 - x0 - 1)), y, 1 + (t > 0.5 ? 1 : 0), 1);
    } else {
      const c = (b.lo + b.hi) / 2 + b.off, rw = Math.max(1, Math.round(0.04 * LPX * t));
      ctx.fillRect(X(c - 0.3) - (rw >> 1), y, rw, 1); ctx.fillRect(X(c + 0.3) - (rw >> 1), y, rw, 1);
      const key = Math.floor(z / 11);
      if (rnd(key, 3 + b.side) > 0.6) { ctx.fillStyle = pal.curb[0]; ctx.fillRect(x0 + Math.floor(rnd(key, 5) * (x1 - x0 - 1)), y, 1, 1); }
    }
  }

  drawObjects(g) {
    const ctx = this.ctx, w = g.world, p = g.p, camZ = this.camZ, list = [];
    const SLOT = 50, i0 = Math.floor(camZ / SLOT), i1 = Math.floor((camZ + MAXD) / SLOT);
    for (let i = i0; i <= i1; i++) {
      const z = i * SLOT + rnd(i, 9) * 20, bands = w.bandsAt(z);
      for (const b of bands) for (let e = 0; e < 2; e++) {
        const k = i * 8 + (b.side + 1) * 2 + e, inf = e ? b.eR : b.eL;
        const biome = rnd(k, 3) < inf.t ? BIOMES[inf.to] : BIOMES[w.baseBiome];
        if (rnd(k, 1) < biome.density) continue;
        const nm = biome.scenery[Math.floor(rnd(k, 4) * biome.scenery.length)];
        // low props (lamps, fences, rocks) hug the road; buildings and trees stand further back
        const off = LOW_PROPS.has(nm) ? 0.22 + rnd(k, 2) * 0.3 : biome.margin + rnd(k, 2) * 0.9;
        const X = (e ? b.hi + off : b.lo - off) + b.off;
        if (bands.some(o => o !== b && X > o.lo + o.off - 0.5 && X < o.hi + o.off + 0.5)) continue;
        list.push({ z, wx: X, spr: SPR[nm] });
        if (biome.deep) // second row: forests close in around the road
          list.push({ z: z + 12, wx: X + (e ? 1 : -1) * (0.7 + rnd(k, 5) * 0.5), spr: SPR[biome.scenery[Math.floor(rnd(k, 6) * 5)]] });
      }
    }
    for (const it of w.items) {
      if (it.taken || it.z < camZ - 4 || it.z > camZ + MAXD) continue;
      list.push({ z: it.z, wx: it.x + w.bandNear(it.z, it.x).off, it });
    }
    list.push({ z: p.z, player: true });
    list.sort((a, b) => b.z - a.z);

    for (const o of list) {
      const d = o.z - camZ, s = K / (d + K), sc = s / S20, sy = HY + (VH - HY) * s;
      if (o.player) { this.drawPlayer(g, 160 + (p.x - g.camX) * LPX * S20, sy); continue; }
      let spr, lift = 0;
      if (o.it) {
        const it = o.it;
        if (it.kind === 'coin') { spr = SPR.coin[Math.floor(g.time * 8 + it.z / 20) & 3]; lift = (it.h - 4) * sc; }
        else if (it.kind === 'prop') spr = SPR[it.spr];
        else if (it.kind === 'crate') spr = SPR.crate;
        else spr = SPR[w.themeAt(it.z, it.x) + it.kind[0].toUpperCase() + it.kind.slice(1)];
      } else spr = o.spr;
      if (!spr) continue;                                                                          // (a prop that only the 3D build draws, such as the station hall)
      const sw = Math.max(1, Math.round(spr.width * sc)), sh = Math.max(1, Math.round(spr.height * sc));
      ctx.drawImage(spr, Math.round(this.sx(o.wx, s) - sw / 2), Math.round(sy - sh - lift), sw, sh);
    }
  }

  drawPlayer(g, sx, feetY) {
    const ctx = this.ctx, p = g.p;
    feetY = Math.round(feetY); sx = Math.round(sx);
    ctx.globalAlpha = 0.35; ctx.fillStyle = C.ink; ctx.fillRect(sx - 6, feetY - 1, 12, 2); ctx.globalAlpha = 1;
    let spr;
    if (g.state === 'pause') spr = SPR.run0;
    else if (p.slide > 0) spr = SPR.slide; else if (p.jy > 0) spr = SPR.jump; else spr = SPR['run' + (Math.floor(g.time * 11) & 3)];
    ctx.drawImage(spr, sx - 7, feetY - 24 - Math.round(p.jy) + (p.jy > 0 ? 3 : 0));
  }

  // forest: a few dithered shafts of light slanting down through the canopy
  drawBeams(g) {
    const n = Math.round(g.canopy * 3);
    if (n < 1) return;
    const ctx = this.ctx; ctx.fillStyle = lerpHex(C.amberL, C.forestD, 0.62);
    for (let i = 0; i < n; i++) {
      const x0 = 70 + i * 96 + Math.sin(g.time * 0.35 + i * 2) * 4 - this.sway * 0.3;
      for (let y = 24; y < 140; y += 3) ctx.fillRect(Math.round(x0 + (y - 24) * 0.3), y, 5, 1);
    }
  }

  // leafy ceiling that closes in as the forest mix rises
  drawCanopy(g) {
    const m = Math.round(g.canopy * 6) / 6;
    if (m < 0.1) return;
    const ctx = this.ctx, h = Math.round(20 * m), off = Math.floor(this.camW * 3);
    for (let x = 0; x < VW; x += 6) {
      const i = x / 6 + off, dh = Math.round(h * (0.55 + 0.45 * rnd(i, 77)));
      ctx.fillStyle = C.forestD; ctx.fillRect(x, 0, 6, dh);
      ctx.fillStyle = C.ink; ctx.fillRect(x, dh, 6, 1);
      if (rnd(i, 78) > 0.5) { ctx.fillStyle = C.forest; ctx.fillRect(x + 1, Math.max(0, dh - 5), 3, 2); }
    }
  }

  // ---- interface: compact plates and buttons share one border/plum/amber language
  txt(s, x, y, col, sc = 1, sh = C.ink) { const o = Math.max(1, sc >> 1); drawText(this.ctx, s, x + o, y + o, sh, sc); drawText(this.ctx, s, x, y, col, sc); }
  ctr(s, y, col, sc = 1, sh = C.ink) { this.txt(s, Math.round((VW - textW(s, sc)) / 2), y, col, sc, sh); }
  panel(x, y, w, h) {
    const c = this.ctx;
    c.fillStyle = C.ink; c.fillRect(x - 1, y - 1, w + 2, h + 2);
    c.fillStyle = C.amberD; c.fillRect(x, y, w, h);
    c.fillStyle = C.plum; c.fillRect(x + 1, y + 1, w - 2, h - 2);
    c.fillStyle = C.burgD; c.fillRect(x + 3, y + 3, w - 6, 1); c.fillRect(x + 3, y + h - 4, w - 6, 1); // inner rule
    c.fillStyle = C.amber; for (const [cx, cy] of [[x, y], [x + w - 2, y], [x, y + h - 2], [x + w - 2, y + h - 2]]) c.fillRect(cx, cy, 2, 2);
  }
  plate(x, y, w, h, edge = C.ink) {
    const c = this.ctx;
    c.fillStyle = edge; c.fillRect(x - 1, y - 1, w + 2, h + 2);
    c.fillStyle = C.plum; c.fillRect(x, y, w, h);
  }
  button(b, g) {
    const m = g.mouse, hov = m.x >= b.x && m.x <= b.x + b.w && m.y >= b.y && m.y <= b.y + b.h, pr = hov && m.down, c = this.ctx;
    const art = b.art && this[b.art];
    if (art && art.complete && art.naturalWidth) {          // the user's artwork as the button face: a dark base (no white), the rings, a green glow on hover / a dark veil when pressed, and a dark plate behind the label
      c.fillStyle = C.ink; c.fillRect(b.x - 1, b.y - 1, b.w + 2, b.h + 2);
      c.fillStyle = C.ink; c.fillRect(b.x, b.y, b.w, b.h);
      const sm = c.imageSmoothingEnabled; c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high'; c.drawImage(art, b.x, b.y, b.w, b.h); c.imageSmoothingEnabled = sm;
      if (this.beatPulse > 0.01) { c.fillStyle = 'rgba(120,255,90,' + (0.2 * this.beatPulse).toFixed(3) + ')'; c.fillRect(b.x, b.y, b.w, b.h); }          // the button glows on the beat
      if (pr) { c.fillStyle = 'rgba(40,10,60,0.32)'; c.fillRect(b.x, b.y, b.w, b.h); } else if (hov) { c.fillStyle = 'rgba(90,230,70,0.30)'; c.fillRect(b.x, b.y, b.w, b.h); }
      const tw = textW(b.label, 2), tx = Math.round(b.x + (b.w - tw) / 2), ty = b.y + 3 + (pr ? 1 : 0);
      c.fillStyle = 'rgba(14,8,26,0.82)'; c.fillRect(tx - 3, ty - 2, tw + 6, 14);
      drawText(c, b.label, tx, ty, pr ? '#2f9a2a' : hov ? '#b4f58c' : '#5ee83c', 2);   // a green label
      return;
    }
    c.fillStyle = C.ink; c.fillRect(b.x - 1, b.y - 1, b.w + 2, b.h + 2);
    c.fillStyle = pr ? C.amberD : hov ? C.amberL : C.amber; c.fillRect(b.x, b.y, b.w, b.h);
    if (!pr) { c.fillStyle = C.amberD; c.fillRect(b.x, b.y + b.h - 2, b.w, 2); }
    drawText(c, b.label, Math.round(b.x + (b.w - textW(b.label, 2)) / 2), b.y + 3 + (pr ? 1 : 0), C.ink, 2);
  }

  // on-screen controls (touch devices only): each button wears the user's neon ring (TOUCH_ART) with its symbol drawn over it in pixels, light with a dark edge so it reads on the
  // artwork; a held button grows a little and lights up. Without the image (not loaded yet) the old plates are drawn.
  drawTouch(g) {
    if (!g.touch || g.state !== 'play') return;
    const c = this.ctx, on = new Set(Object.values(g.held));
    if (!this.touchImg && typeof TOUCH_ART !== 'undefined') { this.touchImg = new Image(); this.touchImg.src = TOUCH_ART.src; }
    const art = this.touchImg && this.touchImg.complete && this.touchImg.naturalWidth ? this.touchImg : null;
    for (const t of TOUCH) {
      if (t.id === 'scooter') {                                                  // 'hop off': only while riding
        if (!g.riding) continue;
        c.globalAlpha = 0.85; c.fillStyle = C.ink; c.fillRect(t.x - 1, t.y - 1, t.w + 2, t.h + 2); c.fillStyle = on.has('scooter') ? C.burgD : C.plum; c.fillRect(t.x, t.y, t.w, t.h);
        c.fillStyle = C.amberD; c.fillRect(t.x, t.y, t.w, 1); c.fillRect(t.x, t.y + t.h - 1, t.w, 1); c.globalAlpha = 1;
        this.scooterGlyph(t.x + 4, t.y + 5, C.bone); this.txt('HOP OFF', t.x + 20, t.y + 8, C.bone, 1); continue;
      }
      const hot = on.has(t.id), cx = t.x + (t.w >> 1), cy = t.y + (t.h >> 1);
      if (art) {
        const f = t.id === 'pause' ? TOUCH_ART.small : TOUCH_ART.big, k = hot ? 1.1 : 1, w = Math.round(f.w * k), h = Math.round(f.h * k);
        c.globalAlpha = hot ? 1 : 0.8; c.drawImage(art, f.x, f.y, f.w, f.h, cx - (w >> 1), cy - (h >> 1), w, h); c.globalAlpha = 1;
      } else {
        c.globalAlpha = 0.82;
        c.fillStyle = C.ink; c.fillRect(t.x - 1, t.y - 1, t.w + 2, t.h + 2);
        c.fillStyle = hot ? C.burgD : C.plum; c.fillRect(t.x, t.y, t.w, t.h);
        c.fillStyle = hot ? C.amber : C.amberD; c.fillRect(t.x, t.y, t.w, 1); c.fillRect(t.x, t.y + t.h - 1, t.w, 1);
        c.globalAlpha = 1;
      }
      for (const [dx, dy, col] of art ? [[1, 1, C.ink], [0, 0, hot ? '#ffffff' : C.bone]] : [[0, 0, hot ? C.amberL : C.bone]]) {   // the symbol: a dark shadow, then the light one
        c.fillStyle = col; const x = cx + dx, y = cy + dy;
        if (t.id === 'pause') { c.fillRect(x - 3, y - 3, 2, 6); c.fillRect(x + 1, y - 3, 2, 6); continue; }
        for (let i = 0; i < 7; i++) {
          if (t.id === 'left') c.fillRect(x - 5 + i, y - i, 1, 2 * i + 1);
          else if (t.id === 'right') c.fillRect(x + 5 - i, y - i, 1, 2 * i + 1);
          else if (t.id === 'jump') c.fillRect(x - i, y - 5 + i, 2 * i + 1, 1);
          else c.fillRect(x - i, y + 5 - i, 2 * i + 1, 1);
        }
      }
    }
  }

  // a tiny kick scooter in pixels (13 x 10), top-left at (x, y)
  scooterGlyph(x, y, col) {
    const c = this.ctx; c.fillStyle = col;
    c.fillRect(x + 9, y, 1, 8); c.fillRect(x + 7, y, 4, 1);                  // stem and handlebar
    c.fillRect(x + 1, y + 6, 9, 1);                                          // deck
    c.fillRect(x, y + 7, 3, 3); c.fillRect(x + 9, y + 7, 3, 3);              // wheels
  }

  // the cutscene's frame: letterbox bars sliding in, the caption (GARE DU MIDI / ALL ABOARD / NEXT ZONE) and the fade to black (g.scene.fade) and from black (g.fadeIn) round it
  drawSceneOverlay(g) {
    const c = this.ctx, S = g.scene;
    if (S) {
      const k = Math.min(1, S.t / 0.7), bar = Math.round(24 * (k * k * (3 - 2 * k)));
      c.globalAlpha = 1; c.fillStyle = C.ink; c.fillRect(0, 0, VW, bar); c.fillRect(0, VH - bar, VW, bar);
      c.fillStyle = C.amber; c.fillRect(0, bar, VW, 1); c.fillRect(0, VH - bar - 1, VW, 1);
      if (S.caption) { const w2 = textW(S.caption, 2) + 14, x = Math.round((VW - w2) / 2); c.globalAlpha = 0.9; c.fillStyle = C.ink; c.fillRect(x - 1, 28, w2 + 2, 20); c.fillStyle = C.plum; c.fillRect(x, 29, w2, 18); c.fillStyle = C.amberD; c.fillRect(x, 29, w2, 1); c.fillRect(x, 46, w2, 1); c.globalAlpha = 1; this.ctr(S.caption, 33, C.amberL, 2); }
    }
    const a = Math.max(S ? S.fade : 0, g.fadeIn > 0 ? g.fadeIn * g.fadeIn : 0);
    if (a > 0.003) { c.globalAlpha = Math.min(1, a); c.fillStyle = '#000'; c.fillRect(0, 0, VW, VH); c.globalAlpha = 1; }
  }

  // a vehicle in pixels, to tell the player what the disc is for: a kick scooter (lime) or the electromagnetic skateboard (cyan deck, red engine ring), about 28 x 18, top-left at (x, y)
  vehicleGlyph(kind, x, y, col) {
    const c = this.ctx; c.fillStyle = col;
    if (kind === 'board') {
      c.fillRect(x + 3, y + 8, 22, 3); c.fillRect(x, y + 6, 4, 2); c.fillRect(x + 24, y + 6, 4, 2);                  // the deck with its kicked nose and tail
      c.fillStyle = '#ff3a6a'; c.fillRect(x + 4, y + 11, 20, 1); c.fillRect(x + 8, y + 13, 12, 1);                       // the glow under it
      c.fillStyle = col; c.fillRect(x + 11, y + 15, 2, 2); c.fillRect(x + 15, y + 15, 2, 2);                           // the magnetic pads
    } else {
      c.fillRect(x + 20, y, 2, 15); c.fillRect(x + 16, y, 9, 2);                                                       // stem and handlebar
      c.fillRect(x + 3, y + 13, 19, 2);                                                                                 // deck
      c.fillRect(x, y + 14, 6, 5); c.fillRect(x + 19, y + 14, 6, 5);                                                   // wheels
    }
  }

  // the indicator for a parked scooter, skateboard or station (g.scooterHint, placed by Renderer3D): not a sign, a translucent DISC on the ground right under it, made from the user's green swirl
  // picture (RING_ART, reshaped into a round disc), squashed into the ground's perspective ellipse, turning slowly and breathing a little. It is big enough to see from far away, and it says what it
  // is for: a floating pixel drawing of the vehicle above it (lime scooter / cyan skateboard) and, below, the key (E, or TAP) and RIDE SCOOTER / RIDE SKATEBOARD. Pressing E or tapping / clicking
  // the disc (or anything of it) gets on (Game.mount). It is armed from 140 m ahead to 60 m behind, and pinned low on its side once the vehicle is behind the camera. Until the picture has loaded
  // (or without it) the disc is drawn with ellipses.
  drawScooterHint(g) {
    const h = g.scooterHint; if (!h || g.riding) return;
    const c = this.ctx, a = Math.max(0.5, Math.min(1, 1.35 - Math.abs(h.ahead) / (h.ahead < 0 ? 90 : 150))), board = h.kind === 'board', label = g.touch ? 'TAP' : 'E', what = board ? 'RIDE SKATEBOARD' : 'RIDE SCOOTER';
    if (!this.ringImg && typeof RING_ART !== 'undefined') { this.ringImg = new Image(); this.ringImg.src = RING_ART.a; }
    const art = this.ringImg && this.ringImg.complete && this.ringImg.naturalWidth;
    const rx = 14 + Math.min(36, h.rx * 1.4), ry = Math.max(h.ry * 1.25, rx * 0.42), k = 1 + 0.05 * Math.sin(g.time * 3);        // the disc's half axes on the ground (never small)
    if (art) {
      c.save(); c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high'; c.globalAlpha = (h.pinned ? 0.9 : 0.82) * a;
      c.translate(h.x, h.y); c.scale(1, ry / rx); c.rotate(g.time * 0.7); c.drawImage(this.ringImg, -rx * k, -rx * k, 2 * rx * k, 2 * rx * k);          // (turned, then squashed: a disc seen at a slant)
      c.restore();
    } else {
      c.save(); c.beginPath(); c.ellipse(h.x, h.y, rx, ry, 0, 0, 6.2832); c.fillStyle = '#7ddc3a'; c.globalAlpha = 0.22 * a; c.fill();
      c.lineWidth = 1; c.strokeStyle = '#b6ff7a'; c.globalAlpha = 0.75 * a; c.beginPath(); c.ellipse(h.x, h.y, rx, ry, 0, 0, 6.2832); c.stroke(); c.restore();
    }
    // the vehicle floating above the disc, bobbing, in its own colour with a dark edge (translucent, no plate)
    const bob = Math.round(Math.sin(g.time * 4) * 2), gx = Math.round(h.x - 14), gy = Math.round(h.y - ry - 28) + bob, col = board ? '#35e6ff' : '#8ff04a';
    c.globalAlpha = 0.55 * a; this.vehicleGlyph(h.kind, gx + 1, gy + 1, C.ink); c.globalAlpha = 0.92 * a; this.vehicleGlyph(h.kind, gx, gy, col);
    // what to press, and for what
    const ty = Math.min(VH - 24, Math.round(h.y + ry + 2));
    c.globalAlpha = 0.95 * a; this.txt(label, Math.round(h.x - textW(label, 2) / 2), ty, '#d8ffb0', 2);
    c.globalAlpha = 0.9 * a; this.txt(what, Math.round(h.x - textW(what, 1) / 2), ty + 12, board ? '#9ff4ff' : '#d8ffb0', 1);
    c.globalAlpha = 1;
  }

  drawHud(g) {
    const w = g.world, p = g.p, T = w.track, pulse = g.coinPulse > 0;
    this.plate(3, 3, 62, 24);
    this.txt('DIST ' + Math.floor(p.z / 10) + ' M', 7, 6, C.bone);
    if (this.menu3d) {                                      // the 3D coin's rings, small: lilac rim, pink, green, cream, lime, mint core
      const cx = 11, cy = pulse ? 18 : 19;
      [[5, '#d9baff'], [4.4, '#ff2a8a'], [3.8, '#62d444'], [2.8, '#e9f7a8'], [2.1, '#8dff1f'], [1.4, '#52ff2e'], [0.7, '#c8ffb8']].forEach(([r, col]) => { this.ctx.fillStyle = col; this.ctx.beginPath(); this.ctx.arc(cx, cy, r, 0, 6.2832); this.ctx.fill(); });
    } else this.ctx.drawImage(SPR.coin[pulse ? 1 : 0], 7, pulse ? 14 : 15);
    this.txt('' + g.coins, 18, 17, pulse ? C.bone : C.amberL);
    const nm = T.segments[w.playerBand(p.z, p.x).route].name, nw = textW(nm) + 8;
    this.plate(VW - 3 - nw, 3, nw, 11);
    this.txt(nm, VW - 3 - nw + 4, 6, C.tealL);
    if (g.prompt && g.state === 'play') { // junction visible: LEFT / RIGHT with the current pick highlighted
      const f = g.prompt.fork, sel = g.prompt.sel;
      const l = '< LEFT: ' + T.segments[f.left.route].name, r = 'RIGHT: ' + T.segments[f.right.route].name + ' >';
      const lw = textW(l) + 8, rw = textW(r) + 8;
      this.plate(5, 31, lw, 11, sel === 'left' ? C.amber : C.ink);
      this.txt(l, 9, 34, sel === 'left' ? C.amberL : C.stoneL);
      this.plate(VW - 5 - rw, 31, rw, 11, sel === 'right' ? C.amber : C.ink);
      this.txt(r, VW - 5 - rw + 4, 34, sel === 'right' ? C.amberL : C.stoneL);
    } else if (g.banner && g.banner.t > 0) {
      const bw = textW(g.banner.text, 2) + 12;
      this.plate(Math.round((VW - bw) / 2), 30, bw, 15, C.amber);
      this.ctr(g.banner.text, 33, C.amberL, 2);
    }
  }

  // 3D menu: title block on the left, the animated character fills the rest of the screen
  // a panel made of the user's artwork (an Image), optionally under a dark veil of the given strength; false if the image is not available
  artPanel(img, x, y, w, h, veil) {
    if (!(img && img.complete && img.naturalWidth)) return false;
    const c = this.ctx, sm = c.imageSmoothingEnabled;
    c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high'; c.drawImage(img, x, y, w, h); c.imageSmoothingEnabled = sm;
    if (veil) { c.fillStyle = 'rgba(14,8,26,' + veil + ')'; c.fillRect(x, y, w, h); }
    return true;
  }

  drawTitle3D(g) {
    // both menu panels are the user's artwork (this.titleImg / this.controlsImg, set by the 3D front end). The title text sits over the dark part of the first, to the
    // right of its light wall, with its glowing red line between 'PROTOTYPE 01' and 'TAKE A FORK.'; the controls panel is drawn under a dark veil so its text stays
    // readable. Without an image the usual bordered panel is drawn.
    const art1 = this.artPanel(this.titleImg, 8, 8, 124, 52, 0); if (!art1) this.panel(8, 8, 124, 52);
    if (!this.artPanel(this.controlsImg, 8, 66, 124, 40, 0.25)) this.panel(8, 66, 124, 40);
    const tx = art1 ? 34 : 14;
    this.txt('WAYFARER', tx, 16, C.amber, 2, C.burgD);
    this.txt('PROTOTYPE 01', tx, 38, C.tealL, 1);
    this.txt('TAKE A FORK.', tx, 48, C.sand, 1);
    const tc = this.controlsImg && this.controlsImg.complete && this.controlsImg.naturalWidth ? C.tealL : C.bone;     // over the artwork the controls text is light teal (no white)
    if (g.touch) { this.txt('HOLD < > STEER', 14, 74, tc, 1); this.txt('UP JUMP  DOWN SLIDE', 14, 84, tc, 1); this.txt('II PAUSE', 14, 94, tc, 1); }
    else { this.txt('Q D / ARROWS STEER', 14, 74, tc, 1); this.txt('Z / SPACE / UP  JUMP', 14, 84, tc, 1); this.txt('S / DOWN SLIDE  P PAUSE', 14, 94, tc, 1); }
    this.button(BTN.title, g);
    if (!g.touch) this.txt('OR PRESS ENTER', 24, 144, C.stoneL, 1);
  }

  drawTitle(g) {
    if (this.menu3d) return this.drawTitle3D(g);
    this.ctx.drawImage(SPR.signForest, 14, 96); this.ctx.drawImage(SPR.signMarket, 272, 96); // the two roads, framing the panel
    this.panel(60, 30, 200, 124);
    this.ctr('WAYFARER', 41, C.amber, 4, C.burgD);
    this.ctr('PROTOTYPE 01', 68, C.tealL);
    if (g.touch) {
      this.ctr('HOLD < > TO STEER', 84, C.bone);
      this.ctr('UP  JUMP   DOWN  SLIDE', 93, C.bone);
      this.ctr('II  PAUSE', 102, C.bone);
    } else {
      this.ctr('Q D / ARROWS  STEER', 84, C.bone);
      this.ctr('Z / SPACE / UP  JUMP', 93, C.bone);
      this.ctr('S / DOWN  SLIDE   P  PAUSE', 102, C.bone);
    }
    this.ctr('TAKE A FORK. PICK A ROAD.', 112, C.sand);
    this.button(BTN.title, g);
    if (!g.touch) this.ctr('OR PRESS ENTER', 145, C.stoneL);
  }

  drawPause(g) {
    this.ctx.fillStyle = this.dither; this.ctx.fillRect(0, 0, VW, VH);
    this.panel(100, 54, 120, 70);
    this.ctr('PAUSED', 64, C.amber, 3, C.burgD);
    this.button(BTN.pause, g);
    if (!g.touch) this.ctr('P  ESC', 110, C.stoneL);
  }

  drawOver(g) {
    this.ctx.fillStyle = this.dither; this.ctx.fillRect(0, 0, VW, VH);
    this.panel(80, 30, 160, 112);
    this.ctr('GAME OVER', 38, C.burgL, 3, C.ink);
    this.ctr('DIST ' + Math.floor(g.p.z / 10) + ' M', 64, C.bone);
    this.ctr('COINS ' + g.coins, 74, C.amberL);
    this.ctr('SCORE ' + g.score(), 86, C.bone);
    this.ctr('BEST ' + g.best, 96, C.tealL);
    this.button(BTN.over, g);
    if (!g.touch) this.ctr('SPACE  ENTER  R', 133, C.sand);
  }
}
