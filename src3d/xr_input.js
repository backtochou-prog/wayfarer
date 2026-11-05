// XRInput: the Quest Touch controllers in immersive VR (PHASE 2, see QUEST2_VR_IMPLEMENTATION_PLAN.md). It turns the physical controls into the actions the Game ALREADY has, exactly as a
// finger or a key does, and holds no rule of its own:
//   - steering in a run   -> Game.hold('xr-L' / 'xr-R', 'left' | 'right' | null)   (the touch channel: held, released by releaseTouch() at a pause, a cutscene, a race, a blur)
//   - jump / slide        -> Game.hold(id, 'jump' | 'slide', true)                (fires once, and only in a run: the rule hold() already applies)
//   - a lane in the race  -> Game.laneQ += 1 / -1 on each FLICK of the stick       (one lane per flick, as one key press or one tap; raceStep reads it)
//   - scooter             -> Game.mount() / Game.dismount()                         (the E key's calls; mount refuses when no vehicle is offered)
//   - pause / resume      -> state 'pause' / 'play' as the P key does, with releaseTouch()
//   - menus               -> the controller's ray on the HUD panel gives Game.mouse (hover: the buttons light as under a mouse), the trigger pressed = mouse down, released over the same
//                            spot = Game.pressAt(x, y) (the same code as a click). A / X press the screen's main button, B / Y on the title change the character.
// The gamepads follow the WebXR 'xr-standard' mapping: buttons[0] trigger, [1] squeeze (grip), [3] thumbstick press, [4] A / X, [5] B / Y; axes[2], axes[3] the thumbstick.
// Everything a press does is decided on its EDGE (the frame it goes down or up), so a held button never repeats, and every hold is released when a controller goes away, the session is
// hidden or ends, or tracking is lost (XR3D calls release()).
class XRInput {
  constructor(xr) {
    this.xr = xr; this.game = xr.game; this.map = Object.assign({}, XRInput.MAP);
    this.hands = { left: XRInput.hand('left'), right: XRInput.hand('right') };
    this.pointer = 'right';                                                             // the hand whose ray points at the menus (the last one whose trigger was pressed)
    this.ctrl = []; this.ray = new THREE.Raycaster(); this.ray.far = 8; this.hit = null; this.press = null; this.pulses = 0; this.centreT = 0; this.centred = false; this.hoverKey = null;
    if (typeof location !== 'undefined' && /[?&]xrHaptics=0/.test(location.search)) this.map.haptics = false;
  }
  static hand(name) { return { name, src: null, gp: null, prev: [], steer: 0, flick: 0, ped: null, ctrl: null }; }

  // the session started: the two controller spaces of three (they hold the target rays), their connected / disconnected events, and the haptics on the game's events
  start(session) {
    const R = this.xr.renderer.xr;
    for (let i = 0; i < 2; i++) {
      const c = R.getController(i); c.userData.i = i;
      if (!c.userData.xrInput) {
        c.userData.xrInput = true;
        c.addEventListener('connected', e => this.connect(c, e.data));
        c.addEventListener('disconnected', () => this.disconnect(c));
      }
      this.ctrl[i] = c;
    }
    this.game.onEmit = (name) => this.onEmit(name);
  }
  stop() {
    this.release();
    for (const h of Object.values(this.hands)) { h.src = null; h.gp = null; h.prev.length = 0; h.ctrl = null; }
    if (this.game.onEmit) this.game.onEmit = null;
    this.hit = null; this.press = null;
  }
  connect(c, src) {
    if (!src || src.hand) return;                                                      // (hand tracking: not a controller, not used in this phase)
    const h = this.hands[src.handedness === 'left' ? 'left' : 'right']; h.src = src; h.ctrl = c; h.prev.length = 0; h.steer = 0; h.flick = 0;
  }
  disconnect(c) {
    for (const h of Object.values(this.hands)) if (h.ctrl === c) { this.releaseHand(h); h.src = null; h.gp = null; h.ctrl = null; h.prev.length = 0; }
  }
  // let go of everything this layer holds in the Game (and of the menu press)
  release() { for (const h of Object.values(this.hands)) this.releaseHand(h); this.press = null; if (this.game.mouse) this.game.mouse.down = false; }
  releaseHand(h) {
    const g = this.game, id = 'xr-' + h.name[0].toUpperCase();
    if (g.held && (g.held[id] !== undefined || g.held[id + '-ped'] !== undefined)) { delete g.held[id]; delete g.held[id + '-ped']; g.syncTouch(); }
    h.steer = 0; h.flick = 0; h.ped = null;
  }

  // ---- once per frame, before the game steps
  poll(dt) {
    const g = this.game, m = this.map;
    for (const h of Object.values(this.hands)) {
      const gp = h.src && h.src.gamepad; h.gp = gp || null;
      if (!gp) { if (h.steer || h.flick || h.ped) this.releaseHand(h); continue; }
      const b = i => !!(gp.buttons[i] && gp.buttons[i].pressed), down = i => b(i) && !h.prev[i], up = i => !b(i) && h.prev[i];
      const sx = gp.axes.length >= 4 ? gp.axes[2] : (gp.axes[0] || 0);
      const steerHand = m.steer === 'either' || m.steer === h.name;
      // the stick: a held direction (with hysteresis) and a flick (once per push past FLICK, re-armed near the centre)
      let dir = h.steer; const ax = Math.abs(sx);
      if (ax >= m.deadOn) dir = sx < 0 ? -1 : 1; else if (ax <= m.deadOff) dir = 0;
      let flick = 0; if (h.flick === 0 && ax >= m.flick) { h.flick = sx < 0 ? -1 : 1; flick = h.flick; } else if (h.flick !== 0 && ax <= m.rearm) h.flick = 0;
      const menu = g.state === 'title' || g.state === 'pause' || (g.state === 'over');
      if (g.state === 'play' && steerHand) {
        if (dir !== h.steer) { g.hold('xr-' + h.name[0].toUpperCase(), dir < 0 ? 'left' : dir > 0 ? 'right' : null, false); h.steer = dir; }
      } else if (h.steer) this.releaseHand(h);
      if (g.state === 'race' && steerHand && flick) g.laneQ = (g.laneQ || 0) + flick;
      // the race's PEDALS, held: accelerate = right trigger or A / X, brake = B / Y or left trigger (through the touch channel, as the jump / slide buttons held on a phone)
      const ped = g.state === 'race' ? (b(5) || (h.name === 'left' && b(0)) ? 'slide' : (b(4) || (h.name === 'right' && b(0)) ? 'jump' : null)) : null;
      if (ped !== h.ped) { g.hold('xr-' + h.name[0].toUpperCase() + '-ped', ped, false); h.ped = ped; }
      h.steer = g.state === 'play' && steerHand ? dir : 0;
      // the buttons, on their edges
      const act = name => m[name].some(k => { const [hn, bi] = k; return (hn === 'any' || hn === h.name) && down(bi); });
      if (g.state === 'play') {
        if (act('jump')) this.fire(h, 'jump');
        else if (act('slide')) this.fire(h, 'slide');
        if (act('scooter')) { if (g.riding) g.dismount(); else g.mount(); }
        if (act('pause')) { g.state = 'pause'; g.releaseTouch(); this.release(); }
      } else if (g.state === 'pause' && act('pause')) { g.state = 'play'; }
      if (menu) {
        if (down(0)) { this.pointer = h.name; this.pressDown(); }
        if (up(0) && this.pointer === h.name) this.pressUp();
        if (act('confirm')) this.confirm();
        if (g.state === 'title' && act('character') && g.r.nextCharacter) { g.nextCharacter(); this.pulse(h, 0.25, 30); }
      }
      for (let i = 0; i < gp.buttons.length; i++) h.prev[i] = b(i);
    }
    // RECENTRE (PHASE 3): both grips held for cfg.centreHold seconds in a menu (title or pause; the grip does nothing else there)
    const both = ['left', 'right'].every(n => { const gp = this.hands[n].gp; return gp && gp.buttons[1] && gp.buttons[1].pressed; });
    if (both && (g.state === 'title' || g.state === 'pause')) { const now = performance.now(); if (!this.centreT) this.centreT = now; if (now - this.centreT >= m.centreHold * 1000 && !this.centred) {   /* (real time: the game's dt is clamped) */ this.centred = true; this.xr.recentre(); this.pulse(this.hands.left, 0.4, 60); this.pulse(this.hands.right, 0.4, 60); } }
    else { this.centreT = 0; this.centred = false; }
    // the race's own events, read from its state (nothing in the rules emits them): running into the robot's car, the result
    const Rc = g.state === 'race' && g.race;
    if (Rc) {
      const bumps = Rc.p.bumps || 0; if (this.raceRef !== Rc) { this.raceRef = Rc; this.bumps = bumps; this.result = Rc.result; }
      if (bumps > this.bumps) this.buzz('bump'); this.bumps = bumps;
      if (Rc.result && Rc.result !== this.result) this.buzz(Rc.result === 'win' ? 'win' : 'lose'); this.result = Rc.result;
    }
    if (!(g.state === 'title' || g.state === 'pause' || g.state === 'over')) { this.hit = null; if (this.press) { this.press = null; g.mouse.down = false; } }
  }
  fire(h, what) { const id = 'xr-' + h.name[0].toUpperCase() + '-' + what; this.game.hold(id, what, true); this.game.hold(id, null, false); }

  // ---- the menu ray: what the pointing hand's ray meets on the HUD (or the EXIT VR plate), in canvas pixels
  aim(targets) {
    const h = this.hands[this.pointer].ctrl ? this.hands[this.pointer] : (this.hands.right.ctrl ? this.hands.right : this.hands.left), c = h && h.ctrl;
    this.hit = null; if (!c || !c.visible || !targets.length) return null;
    c.updateMatrixWorld(true); this.ray.setFromXRController(c);
    const hits = this.ray.intersectObjects(targets, false);
    if (hits.length) { const it = hits[0]; this.hit = { obj: it.object, uv: it.uv, point: it.point, dist: it.distance, ctrl: c }; }
    return this.hit;
  }
  pressDown() { const g = this.game, H = this.hit; if (!H) return; this.press = { obj: H.obj, x: g.mouse.x, y: g.mouse.y }; g.mouse.down = true; }
  pressUp() {
    const g = this.game, P = this.press, H = this.hit; this.press = null; g.mouse.down = false;
    if (!P || !H || H.obj !== P.obj) return null;
    const h = this.hands[this.pointer];
    if (H.obj === this.xr.hud.exitMesh) { this.pulse(h, XRInput.HAPTIC.press[0], XRInput.HAPTIC.press[1]); this.xr.exit(); return 'exit'; }
    const r = g.pressAt(g.mouse.x, g.mouse.y); if (r) this.pulse(h, XRInput.HAPTIC.press[0], XRInput.HAPTIC.press[1]);
    return r;
  }
  // A / X: the screen's main button (PLAY, RESUME, RUN AGAIN), at its centre, as a click there
  confirm() { const g = this.game, b = g.activeButton(); if (!b) return null; const r = g.pressAt(b.x + b.w / 2, b.y + b.h / 2); if (r) this.pulse(this.hands[this.pointer], XRInput.HAPTIC.press[0], XRInput.HAPTIC.press[1]); return r; }

  // ---- haptics: short pulses on what the desktop shows with a shake or a flash, a sound or a toast (never needed to play: off with map.haptics = false or ?xrHaptics=0)
  onEmit(name) { this.buzz(name); }
  buzz(name) { const P = XRInput.HAPTIC[name]; if (!P) return; for (const h of Object.values(this.hands)) this.pulse(h, P[0], P[1]); }
  pulse(h, v, ms) {
    if (!this.map.haptics || !h || !h.gp) return false;
    const k = Math.max(0, Math.min(1, v * this.map.hapticScale)); if (k <= 0) return false;
    const a = h.gp.hapticActuators && h.gp.hapticActuators[0];
    try {
      if (a && a.pulse) { a.pulse(k, ms); this.pulses++; return true; }
      const va = h.gp.vibrationActuator;                                                // (the newer Gamepad API name, on browsers that have it instead)
      if (va && va.playEffect) { va.playEffect('dual-rumble', { duration: ms, strongMagnitude: k, weakMagnitude: k }); this.pulses++; return true; }
    } catch (e) {}
    return false;                                                                        // no haptic hardware: nothing happens, nothing breaks
  }
  // a faint tick when the ray moves onto a button (the buttons light as they do under a mouse; this is the touch of it)
  hover(key) { if (key && key !== this.hoverKey) this.pulse(this.hands[this.pointer], XRInput.HAPTIC.hover[0], XRInput.HAPTIC.hover[1]); this.hoverKey = key; }
}
// THE MAPPING (configurable: XRInput.MAP before entering VR, or xr.input.map during a session). Each action lists [hand, button index] pairs; hand 'any', 'left' or 'right'.
XRInput.MAP = {
  steer: 'either',                       // which thumbstick steers (and changes lanes in the race): 'left', 'right' or 'either'
  deadOn: 0.35, deadOff: 0.25,           // the stick steers past 0.35 and lets go under 0.25 (hysteresis: no flutter at the edge)
  flick: 0.6, rearm: 0.3,                // a race lane change: one per push past 0.6; the next one needs the stick back under 0.3
  jump: [['right', 0], ['any', 4]],      // right trigger, A (right) or X (left)
  slide: [['any', 5]],                   // B (right) or Y (left)
  scooter: [['any', 1]],                 // grip (squeeze), either hand
  pause: [['any', 3]],                   // thumbstick press, either hand (the Meta / menu buttons belong to the system); again to resume
  confirm: [['any', 4]],                 // in the menus: A / X press PLAY / RESUME / RUN AGAIN
  character: [['any', 5]],               // on the title: B / Y change the character
  centreHold: 0.8,                       // seconds both grips must be held in a menu to recentre the view
  haptics: true,                         // all haptics on / off (?xrHaptics=0)
  hapticScale: 1,                        // a strength factor for every pulse (0..1)
};
// [strength 0..1, milliseconds] per event. The names are the Game's own sound events (Game.emit), the race's (bump, win, lose: read from its state) and the menus' (hover, press)
XRInput.HAPTIC = {
  coin: [0.1, 14], shard: [0.15, 18], waymark: [0.18, 24],                     // pickups (the race's spirals and rare tokens are 'coin' too)
  jump: [0.15, 18], land: [0.12, 16],                                           // a jump, a landing (in the race 'land' is a ring or a droid hit: see bump)
  crash: [0.9, 140], auraBreak: [0.6, 80],                                      // collisions: the run ends; the aura absorbs a hit
  perk: [0.45, 60], mission: [0.4, 70],                                         // a power-up starts; a mission completed
  mount: [0.35, 40], dismount: [0.25, 30],                                      // the scooter / skateboard
  bump: [0.6, 80], win: [0.55, 180], lose: [0.35, 120],                         // the race: into the robot's car, the result
  hover: [0.05, 8], press: [0.35, 35],                                          // the menus
};
