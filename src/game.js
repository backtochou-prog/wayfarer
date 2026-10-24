// Game state, input and main loop.
// Speed starts forgiving and climbs ~1.6 u/s per second to a cap (about 75 s to reach it).
const BASE_SPEED = 220, MAX_SPEED = 340, ACCEL = 1.6, STEER = 2.7;
// on-canvas buttons (canvas pixels); the renderer draws them, the game hit-tests them
const BTN = {
  title: { x: 110, y: 123, w: 100, h: 16, label: 'START' },
  pause: { x: 110, y: 88, w: 100, h: 16, label: 'RESUME' },
  over:  { x: 100, y: 114, w: 120, h: 16, label: 'RUN AGAIN' },
};
// touch controls (canvas pixels): hold left/right to steer, tap jump/slide/pause; each finger is tracked separately
const TOUCH = [
  { id: 'left',  x: 4,   y: 142, w: 38, h: 32 },
  { id: 'right', x: 46,  y: 142, w: 38, h: 32 },
  { id: 'slide', x: 234, y: 142, w: 38, h: 32 },
  { id: 'jump',  x: 278, y: 142, w: 38, h: 32 },
  { id: 'pause', x: 148, y: 3,   w: 24, h: 14 },
];
const GUIDE_DIST = 350;           // design units before the junction line where a picked road starts pulling the runner over
const GRAV = 900, JUMP_V = 268, SLIDE_T = 0.55, P_HW = 0.1;

class Game {
  // opts.world / opts.renderer let another front end (the 3D version) reuse this state machine, input and rules
  constructor(cv, opts = {}) {
    this.cv = cv;
    this.world = opts.world || new World(TRACK);
    this.r = opts.renderer || new Renderer(cv);
    this.keys = {}; this.held = {}; this.tleft = this.tright = false;
    this.touch = !!(window.matchMedia && matchMedia('(pointer: coarse)').matches); // shows the on-screen controls
    this.time = 0; this.best = 0;
    try { this.best = +localStorage.getItem('wayfarer.best') || 0; } catch (e) {}
    this.state = 'title';
    this.resetRun();
    addEventListener('keydown', e => this.onKey(e, true));
    addEventListener('keyup', e => this.onKey(e, false));
    addEventListener('blur', () => { this.keys = {}; this.releaseTouch(); if (this.state === 'play') this.state = 'pause'; });
    this.mouse = { x: -1, y: -1, down: false };
    const at = e => { const r = cv.getBoundingClientRect(); this.mouse.x = (e.clientX - r.left) * VW / r.width; this.mouse.y = (e.clientY - r.top) * VH / r.height; };
    cv.addEventListener('pointermove', at);
    cv.addEventListener('pointerleave', () => { this.mouse.x = this.mouse.y = -1; this.mouse.down = false; });
    cv.addEventListener('contextmenu', e => e.preventDefault());
    const zone = () => TOUCH.find(c => this.mouse.x >= c.x && this.mouse.x <= c.x + c.w && this.mouse.y >= c.y && this.mouse.y <= c.y + c.h);
    cv.addEventListener('pointerdown', e => {
      at(e); this.mouse.down = true;
      if (e.pointerType === 'touch') this.touch = true;
      const c = this.state === 'play' && this.touch && zone();
      if (c) { try { cv.setPointerCapture(e.pointerId); } catch (err) {} this.hold(e.pointerId, c.id, true); }
    });
    cv.addEventListener('pointermove', e => { // sliding a finger between left and right keeps steering
      if (this.held[e.pointerId] !== 'left' && this.held[e.pointerId] !== 'right') return;
      const c = zone(); this.hold(e.pointerId, c && (c.id === 'left' || c.id === 'right') ? c.id : null, false);
    });
    const lift = e => { delete this.held[e.pointerId]; this.syncTouch(); };
    addEventListener('pointercancel', lift);
    addEventListener('pointerup', e => { // a click counts when released over the same button it started on
      lift(e);
      const was = this.mouse.down; this.mouse.down = false; at(e);
      const b = this.activeButton();
      if (was && b && this.overButton(b)) {
        if (this.state === 'pause') this.state = 'play';
        else { if (this.state === 'title' && this.touch) this.goFullscreen(); this.start(); }
      }
    });
    addEventListener('resize', () => this.fit());
    this.fit();
    let last = performance.now();
    const loop = now => {
      requestAnimationFrame(loop); // re-arm first so one bad frame can never freeze the game
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      this.advance(dt); this.draw(dt);
    };
    requestAnimationFrame(loop);
  }

  // simulate in slices of at most 1/60 s so jump height and collisions don't depend on the frame rate
  advance(dt) {
    const n = Math.max(1, Math.ceil(dt * 60 - 1e-6));
    for (let i = 0; i < n; i++) this.update(dt / n);
  }

  draw() { this.r.draw(this); }

  fit() {
    // whole-number scaling keeps pixels even; on screens too small for 2x (phones in portrait) use the exact fit instead
    const f = Math.min(innerWidth / VW, innerHeight / VH), s = f >= 2 ? Math.floor(f) : f;
    this.cv.style.width = VW * s + 'px'; this.cv.style.height = VH * s + 'px';
  }

  resetRun() {
    this.world.reset();
    this.p = { x: 0, z: 0, vx: 0, jy: 0, vy: 0, slide: 0, speed: BASE_SPEED };
    this.coins = 0; this.camX = 0; this.camOff = 0; this.camRel = 0; this.camErr = 0; this.prevTgt = 0;
    this.bgT = 0; this.bgTo = this.world.baseBiome; this.canopy = 0; this.flash = 0; this.overT = 0;
    this.fx = []; this.dustT = 0; this.shake = 0; this.coinPulse = 0; this.jumpBuf = 0;
    this.carryC = 0; this.lean = 0; this.kick = null; this.sway = 0; this.prompt = null; this.banner = null;
  }

  activeButton() {
    if (this.state === 'title') return BTN.title;
    if (this.state === 'pause') return BTN.pause;
    if (this.state === 'over' && this.overT > 0.5) return BTN.over;
    return null;
  }
  overButton(b) { const m = this.mouse; return m.x >= b.x && m.x <= b.x + b.w && m.y >= b.y && m.y <= b.y + b.h; }

  start() { this.resetRun(); this.state = 'play'; }

  // which road the player would take if the junction line were crossed now: an explicit left/right input given inside the
  // prompt window wins (lane steering outside the window never counts); with no input, the side the runner is on, else right
  preview() {
    const p = this.p;
    if (this.lean) return this.lean < 0 ? 'left' : 'right';
    if (p.x < -0.25) return 'left';
    return 'right';
  }
  score() { return Math.floor(this.p.z / 10) + this.coins * 10; }

  jump() { this.jumpBuf = 0.12; } // buffered: a press just before landing still jumps
  slideKey() { const p = this.p; if (p.jy > 0) p.vy = -600; else p.slide = SLIDE_T; }

  // a finger went down on / moved onto a control; jump, slide and pause fire once, steering is held
  hold(pid, id, fresh) {
    if (id === null) delete this.held[pid]; else this.held[pid] = id;
    this.syncTouch();
    if (!fresh || this.state !== 'play') return;
    if (id === 'jump') this.jump(); else if (id === 'slide') this.slideKey(); else if (id === 'pause') { this.state = 'pause'; this.releaseTouch(); }
  }
  syncTouch() { const h = Object.values(this.held); this.tleft = h.includes('left'); this.tright = h.includes('right'); }
  releaseTouch() { this.held = {}; this.syncTouch(); }
  goFullscreen() { // hides the browser bars and asks for landscape (Android Chrome); silently ignored elsewhere
    try {
      const de = document.documentElement;
      if (!document.fullscreenElement && de.requestFullscreen) de.requestFullscreen().then(() => { try { screen.orientation.lock('landscape').catch(() => {}); } catch (e) {} }).catch(() => {});
    } catch (e) {}
  }

  onKey(e, down) {
    const c = e.code;
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(c)) e.preventDefault();
    if (c === 'ArrowLeft' || c === 'KeyA') this.keys.left = down;
    if (c === 'ArrowRight' || c === 'KeyD') this.keys.right = down;
    if (!down || e.repeat) return;
    const s = this.state;
    if (s === 'title' && (c === 'Enter' || c === 'Space')) this.start();
    else if (s === 'over' && this.overT > 0.5 && (c === 'Enter' || c === 'Space' || c === 'KeyR')) this.start();
    else if (s === 'play') {
      if (c === 'Space' || c === 'ArrowUp' || c === 'KeyW') this.jump();
      else if (c === 'ArrowDown' || c === 'KeyS') this.slideKey();
      else if (c === 'KeyP' || c === 'Escape') this.state = 'pause';
    } else if (s === 'pause' && (c === 'KeyP' || c === 'Escape')) this.state = 'play';
  }

  update(dt) {
    const w = this.world, p = this.p, ab = this.activeButton();
    this.cv.style.cursor = ab && this.overButton(ab) ? 'pointer' : 'default';
    if (this.state === 'pause') return;
    this.time += dt;
    this.updateFx(dt);
    if (this.state === 'play') this.step(dt);
    else if (this.state === 'title') {
      const z0 = p.z;
      p.z += 110 * dt; w.extend(p.z);
      if (Math.floor(p.z / 100) !== Math.floor(z0 / 100)) w.prune(p.z);
      const F = w.openFork(); if (F && p.z > F.z0 - 300) this.resetRun();
    } else { this.overT += dt; this.flash = Math.max(0, this.flash - dt); }

    // camera: tracks the centre of the player's road exactly (so merges don't make the runner slide),
    // eases out any jump in that centre (e.g. when the branch is chosen), and follows half the player's offset
    const pb = w.playerBand(p.z, p.x);
    const jump = this.prevTgt - pb.c;
    this.camErr = (this.camErr + (Math.abs(jump) > 0.2 ? jump : 0)) * Math.exp(-6 * dt); this.prevTgt = pb.c;
    this.camRel += ((p.x - pb.c) * 0.5 - this.camRel) * Math.min(1, dt * 5);
    this.camX = pb.c + this.camErr + this.camRel;
    this.camOff = pb.off;

    // brief lean of the road toward the chosen branch; the runner's screen position is unaffected
    if (this.kick) {
      this.kick.t += dt;
      this.sway = this.kick.side * 16 * Math.sin(Math.PI * Math.min(1, this.kick.t / 1.8));
      if (this.kick.t >= 1.8) { this.kick = null; this.sway = 0; }
    }
    if (this.banner) this.banner.t -= dt;

    // sky/parallax/canopy follow the road ahead of the player (leaning side before the choice is made)
    const ahead = w.playerBand(p.z + 300, p.x);
    let to = ahead.to, tt = ahead.t;
    if (to !== this.bgTo && this.bgT > 0.02) tt = 0; // finish easing out the old biome first
    this.bgT += (tt - this.bgT) * Math.min(1, dt * 1.5);
    if (this.bgT <= 0.02 && to !== this.bgTo) this.bgTo = to;
    const here = w.playerBand(p.z + 60, p.x);
    this.canopy += ((here.to === 'forest' ? here.t : 0) - this.canopy) * Math.min(1, dt * 2);
  }

  updateFx(dt) {
    this.shake = Math.max(0, this.shake - dt); this.coinPulse = Math.max(0, this.coinPulse - dt);
    for (const f of this.fx) { f.x += f.vx * dt; f.y += f.vy * dt; f.vy += (f.gy === undefined ? 260 : f.gy) * dt; f.t -= dt; }
    this.fx = this.fx.filter(f => f.t > 0);
  }
  burst(x, y, cols, n, speed, life) {
    for (let i = 0; i < n; i++) {
      const a = Math.PI * 2 * i / n + 0.4;
      this.fx.push({ x, y, vx: Math.cos(a) * speed * (0.6 + 0.4 * ((i * 7) % 3) / 2), vy: Math.sin(a) * speed - speed * 0.5, t: life, col: cols[i % cols.length] });
    }
  }

  step(dt) {
    const w = this.world, p = this.p, prevZ = p.z;
    p.speed = Math.min(MAX_SPEED, p.speed + ACCEL * dt);
    p.z += p.speed * dt;
    this.steer(dt);
    if (this.jumpBuf > 0) { // jump starts on the ground, cancels a slide; a press just before landing is kept briefly
      this.jumpBuf -= dt;
      if (p.jy === 0) { p.slide = 0; p.vy = JUMP_V; p.jy = 0.01; this.jumpBuf = 0; }
    }
    if (p.jy > 0) { p.vy -= GRAV * dt; p.jy += p.vy * dt; if (p.jy <= 0) { p.jy = 0; p.vy = 0; } }
    if (p.slide > 0) p.slide -= dt;
    this.dust(dt);
    w.extend(p.z);
    if (Math.floor(p.z / 100) !== Math.floor(prevZ / 100)) w.prune(p.z);

    const top = p.slide > 0 ? 8 : 24;
    for (const it of w.items) {
      if (it.taken || it.z < prevZ - 10 || it.z > p.z + 10) continue;
      const dx = Math.abs(it.x - p.x);
      if (it.kind === 'coin') {
        if (dx < 0.2 && it.z > prevZ - 9 && it.z < p.z + 9 && p.jy < it.h + 6 && p.jy + top > it.h - 6) {
          it.taken = true; this.coins++; this.coinPulse = 0.2;
          this.onCoin(it);
        }
      } else if (it.kind !== 'prop') {
        const o = OBST[it.kind];
        if (dx < o.hw + P_HW && it.z > prevZ - 8 && it.z < p.z + 8 && p.jy < o.y1 && p.jy + top > o.y0) { this.die(); return; }
      }
    }
  }

  // free steering across the road, the junction choice, and keeping the runner on its road
  steer(dt) {
    const w = this.world, p = this.p;
    const dir = (this.keys.right || this.tright ? 1 : 0) - (this.keys.left || this.tleft ? 1 : 0);
    p.vx += (dir * STEER - p.vx) * Math.min(1, dt * 14);
    p.x += p.vx * dt;
    // junction: the choice is only read inside the prompt window, and locks when the junction line is crossed
    const F = w.openFork();
    this.prompt = null;
    if (F && p.z > F.z0 - PROMPT_DIST) {
      if (dir && p.z < F.z0) this.lean = dir;
      if (p.z >= F.z0) {
        const side = this.preview();
        w.commit(F, side);
        this.kick = { t: 0, side: side === 'left' ? -1 : 1 };
        this.banner = { t: 2.2, text: w.track.segments[F.fork[side].route].name };
        this.lean = 0;
      } else this.prompt = { fork: F.fork, sel: this.preview() };
    }
    // once a road has been picked, ease the runner onto that road's side for the last stretch before the junction line,
    // so it never has to cut across the widening gap at the fork's tip (only while no steering key is held)
    if (F && this.lean && !dir && p.z < F.z0 && p.z > F.z0 - GUIDE_DIST) p.x += ((this.lean < 0 ? -0.45 : 0.45) - p.x) * Math.min(1, dt * 4);
    // carry the runner along with the road's centre line (diverge / merge) so they stay put on screen;
    // a sudden jump in that centre (the moment the choice locks) is eased by the clamp below instead
    const c0 = w.playerBand(p.z, p.x).c;
    if (Math.abs(c0 - this.carryC) < 0.2) p.x += c0 - this.carryC;
    this.carryC = c0;
    const cx = w.clampX(p.x, p.z), pc = w.pieceAt(p.z);
    // ease onto the chosen road at the start of the junction, hard clamp everywhere else
    if (pc.type === 'fork' && p.z < pc.z0 + 120) p.x += (cx - p.x) * Math.min(1, dt * 14); else p.x = cx;
  }

  // running dust on the road, drifting leaves in the forest (1px specks, a handful per second)
  dust(dt) {
    const p = this.p;
    this.dustT -= dt;
    if (this.dustT <= 0 && p.jy === 0) {
      this.dustT = p.slide > 0 ? 0.04 : 0.12;
      const leaf = this.canopy > 0.3, sxp = 160 + (p.x - this.camX) * LPX * S20;
      this.fx.push({ x: sxp - 3 + (Math.random() * 6 | 0), y: 157, vx: -10 + (Math.random() * 20 | 0), vy: leaf ? -16 : -10, gy: leaf ? 30 : 4, t: leaf ? 0.5 : 0.3,
                     col: leaf ? (Math.random() < 0.5 ? C.moss : C.amberD) : C.sandD, s: 1 });
    }
  }
  onCoin(it) {
    const cxp = 160 + (it.x - this.camX) * LPX * S20;
    this.burst(cxp, 159 - it.h, [C.amberL, C.amber, C.bone], 6, 55, 0.35);
    this.fx.push({ x: cxp - 4, y: 150 - it.h, vx: 0, vy: -34, gy: 0, t: 0.55, col: C.amberL, txt: '+1' });
  }
  onDie() { this.burst(160 + (this.p.x - this.camX) * LPX * S20, 140, [C.earth, C.earthD, C.amberL, C.burgL, C.bone], 12, 90, 0.6); }

  die() {
    this.releaseTouch();
    if (this.touch && navigator.vibrate) navigator.vibrate(60);
    this.state = 'over'; this.flash = 0.25; this.shake = 0.35; this.overT = 0; this.jumpBuf = 0;
    this.onDie();
    const s = this.score();
    if (s > this.best) { this.best = s; try { localStorage.setItem('wayfarer.best', s); } catch (e) {} }
  }
}

