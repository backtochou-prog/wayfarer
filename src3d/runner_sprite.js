// RunnerSprite: the player avatar as the user's own retouched artwork (AVATAR_ASSETS in avatar_assets.js), shown as flat cards.
// It has the same interface as Runner3D (group, shadow, update(dt, state), cur), so the renderer and the tests treat both alike:
//   - the chase camera looks at the runner from behind, so gameplay shows the retouched BACK view;
//   - the menu shows the same BACK view (or the SIDE view with ?menu=side) with an idle / wave / spin / dance / run-in-place showcase, like the 3D model's;
//   - there is no skeleton, so the motion is done to the whole card: run bounce and squash-and-stretch, a steering lean, a stretch in the jump,
//     ducking (squashed) for the slide, tipping forward for a crash.
// Size: 1.9 m tall (hair top to soles), feet on the road (the card pivots at its bottom centre). The group is yawed by the renderer like the 3D
// model (heading, menu turn); the card cancels that yaw so it always faces the camera. `?avatar=3d` in the URL selects the 3D model instead.
// SCOOTER: in Saint-Gilles (or everywhere with ?scooter=1, nowhere with ?scooter=0) the runner rides a lime kick scooter (a small low-poly model built from Kit parts, a child of the group, so it
// turns with the heading and rises in the jump): the card stands on the deck, the run bounce and sway give way to a steady glide with the steering lean, the wheels spin, the nose lifts in the jump.
// States: 'play' run / jump / slide, 'over' trip, 'pause' hold, 'title' a looping showcase for the main menu.
class RunnerSprite {
  static get SC() { return 1.3; }                            // the scooter is drawn 1.3 x its modelled size (a chunkier, easier to read scooter under a 1.9 m runner)
  static get BOARD_DECK() { return 0.21 * 1.3; }              // the floating board's deck top
  static get SURF_DECK() { return 0.13; }                     // the surfboard's deck top (the board lies on the water: nothing of it is below y = 0)
  static get DECK() { return 0.17 * 1.3; }                   // height of the deck's top: the card's feet stand here while riding
  constructor() {
    this.menuView = (location.search.match(/[?&]menu=(side|back)\b/) || [])[1] || 'back';   // which artwork the menu shows: the back view (default, wider and matching the game) or the side view (?menu=side)
    this.group = new THREE.Group();
    this.pivot = new THREE.Group(); this.group.add(this.pivot);                   // bottom-centre pivot: tilts, squashes and spins happen here
    this.cards = {};
    for (const name of ['back', 'side']) {
      const A = AVATAR_ASSETS[name], img = new Image(), tex = new THREE.Texture(img);
      tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4; tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter;
      const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.02, side: THREE.DoubleSide, fog: false });   // unlit: the artwork's own colours
      mat.visible = false; img.onload = () => { tex.needsUpdate = true; mat.visible = true; }; img.src = A.src;
      const geo = new THREE.PlaneGeometry(A.mw, A.mh); geo.translate(0, A.mh / 2, 0);                                       // origin at the soles
      const card = new THREE.Mesh(geo, mat); card.visible = false; this.pivot.add(card); this.cards[name] = card;
    }
    this.cards.back.visible = true;
    // the soft contact shadow lives in the scene (the renderer places it under the runner and shrinks it with jump height)
    this.shadow = new THREE.Mesh(new THREE.CircleGeometry(1, 24).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3, depthWrite: false }));
    this.shadow.renderOrder = 1; this.shadow.scale.set(0.5, 1, 0.42);
    this.scooter = RunnerSprite.buildScooter(); this.scooter.visible = false; this.group.add(this.scooter);   // the kick scooter (shown while riding)
    this.board = RunnerSprite.buildBoard(); this.board.visible = false; this.group.add(this.board);                    // the electromagnetic skateboard (the other vehicle)
    this.surfB = RunnerSprite.buildSurf(); this.surfB.visible = false; this.group.add(this.surfB);                    // the surfboard of the canals of Utrecht (Game.surf)
    this.vehicle = 'scooter'; this.ride = 0; this.wheelA = 0;                            // 0..1: how far the runner is on the scooter (eased); the wheels' spin angle
    this.phase = 0;
    this.cur = { y: 0, rx: 0, rz: 0, sx: 1, sy: 1 };           // rx = pitch of the card (0 upright, + leaning back, - tipped forward)
    this.tgt = Object.assign({}, this.cur);
  }

  update(dt, s) {
    if (s.state === 'pause') return;                           // hold the pose
    const c = this.cur, t = this.tgt, T = s.time;
    if (s.state !== 'over') this.phase += dt * s.runRate * Math.PI * 2;
    const sn = Math.sin(this.phase);
    let spin = 0, view = 'back';
    const face = s.faceYaw || 0;                                // the renderer passes the direction of the camera, so the card squarely faces it (the menu camera orbits)
    t.y = 0; t.rx = 0; t.rz = 0; t.sx = 1; t.sy = 1;
    if (s.state === 'over') {                                  // tripped: tips forward onto its face
      t.rx = -1.35; t.rz = 0.1; t.sy = 0.95;
    } else if (s.state === 'title') {                          // showcase loop (10 s): idle, wave, spin, dance, run in place
      view = this.menuView; const u = T % 10;
      t.y = Math.sin(T * 2.2) * 0.02;
      if (u < 2) { t.rz = Math.sin(T * 1.3) * 0.04; }
      else if (u < 4) { t.rz = 0.07 + Math.sin(T * 11) * 0.05; t.sy = 1.02; t.sx = 0.985; }                                  // wave: a quick sway
      else if (u < 5.4) { const f = (u - 4) / 1.4, e = f * f * (3 - 2 * f); spin = e * Math.PI * 2; t.y = Math.sin(Math.PI * f) * 0.4; }   // spin with a hop
      else if (u < 7.6) { const b = Math.sin(T * 8); t.y = Math.abs(b) * 0.1; t.rz = b * 0.09; t.sy = 1 - Math.abs(b) * 0.04; t.sx = 1 + Math.abs(b) * 0.03; }   // dance
      else { t.y = Math.abs(sn) * 0.07; t.rx = 0.05; t.rz = sn * 0.04; t.sy = 1 + 0.025 * Math.sin(2 * this.phase); t.sx = 1 / t.sy; }                    // run in place
    } else if (s.sliding) {                                    // slide: ducks (squashed to 42 % of its height, a touch wider, a small lean back). A card tilted right back is seen edge-on from the chase camera.
      t.rx = 0.25; t.sy = 0.42; t.sx = 1.12;
    } else if (s.airborne) {                                   // stretched in the jump, a little lean from the steering
      t.sy = 1.05; t.sx = 0.96; t.rz = -s.lean * 0.1;
    } else {                                                   // run cycle: bounce, squash-and-stretch, sway and a steering lean
      t.y = Math.abs(sn) * 0.07; t.sy = 1 + 0.025 * Math.sin(2 * this.phase); t.sx = 1 / t.sy; t.rz = -s.lean * 0.14 + 0.03 * sn;
    }
    if (s.scooter) this.vehicle = s.vehicle || 'scooter';                                  // which one the runner is on (kept while it fades out)
    const R = this.ride += ((s.scooter ? 1 : 0) - this.ride) * (1 - Math.exp(-6 * dt)), board = this.vehicle === 'board';    // on a vehicle: a steady glide instead of the run bounce, squash and sway
    if (R > 0.01 && s.state === 'play' && !s.sliding && !s.airborne) { const k = Math.min(1, R * 1.5); t.y = t.y * (1 - k) + 0.012 * (1 + sn) * k; t.sy += (1 - t.sy) * k; t.sx += (1 - t.sx) * k; t.rz = t.rz * (1 - k) + (-s.lean * 0.14) * k; }
    if (s.beat > 0 && s.state !== 'over') { const m = s.state === 'title' ? 1 : 0.4; t.y += 0.1 * m * s.beat; t.sy += 0.05 * m * s.beat; t.sx -= 0.03 * m * s.beat; }   // bounces on the beat of the music (more in the menu)
    const k = 1 - Math.exp(-(s.sliding ? 60 : 15) * dt);       // the slide pose is near-instant: the game counts a slide from the first frame
    for (const key in c) c[key] += (t[key] - c[key]) * k;
    if (view !== this.view) { this.cards.back.visible = view === 'back'; this.cards.side.visible = view === 'side'; this.view = view; }
    const surf = this.vehicle === 'surf', hover = board ? 0.02 * Math.sin(T * 3) : surf ? 0.03 * Math.sin(T * 2.4) + 0.02 * (s.beat || 0) : 0;      // the board floats, with a gentle bob (the surfboard rides the swell)
    this.pivot.position.y = c.y + (surf ? RunnerSprite.SURF_DECK : board ? RunnerSprite.BOARD_DECK : RunnerSprite.DECK) * Math.min(1, R * 1.5) + hover * R;   // the feet stand on the deck
    const sc = this.scooter, bd = this.board, sf = this.surfB, v = surf ? sf : board ? bd : sc; for (const o of [sc, bd, sf]) if (o !== v) o.visible = false;
    v.visible = R > 0.02; v.scale.setScalar(Math.min(1, R * 1.4) * RunnerSprite.SC); v.position.y = hover * R;
    if (v.visible) {
      if (surf) { const u = sf.userData, k3 = 1 + 0.08 * Math.sin(T * 5); u.wake.scale.set(1, 1, k3); u.collar.scale.set(1 + 0.1 * Math.sin(T * 6), 1, 1); u.foam.material.opacity = 0.5 + 0.1 * Math.sin(T * 4); }
      else if (!board) { this.wheelA += dt * s.runRate * 9; for (const w of sc.userData.wheels) w.rotation.x = -this.wheelA; }
      else {
        const u = bd.userData, bt = s.beat || 0; if (u.rear) u.rear.scale.setScalar(1 + 0.1 * bt);                      // the engine ring swells on the beat
        u.ring.scale.setScalar(1 + 0.12 * Math.sin(T * 4) + 0.25 * bt); u.field.scale.setScalar(1 + 0.05 * Math.sin(T * 3)); u.trail.scale.y = 0.8 + 0.2 * Math.sin(T * 7);   // the magnetic field breathes
      }
      const k2 = 1 - Math.exp(-10 * dt); v.rotation.z += (-s.lean * 0.1 - v.rotation.z) * k2; v.rotation.x += ((s.airborne ? 0.14 : 0) - v.rotation.x) * k2;     // leans into the steering, nose up in the air
    }
    this.pivot.rotation.set(c.rx, -this.group.rotation.y + face + spin, c.rz, 'YXZ');   // cancel the renderer's yaw: the card always faces the camera (plus the showcase spin)
    this.pivot.scale.set(c.sx, c.sy, 1);
  }

  // the surfboard: a short cream board with a turquoise stripe and a tail fin, sitting in the water (about 2.4 m once drawn at the vehicle scale), with its white foam: a V-shaped wake behind, a collar at the nose
  // and a few soft dashes (flat translucent planes with a soft edge, one shared texture; they stay in the board's group and ride with it). The runner's artwork stands on it, unchanged.
  static buildSurf() {
    const C1 = '#efe8d6', C2 = '#1f8f8a', DK = '#2a2a32', g = new THREE.Group(), inner = new THREE.Group(); inner.scale.setScalar(0.7); inner.position.y = 0.04; g.add(inner);
    inner.add(Kit.mesh(Kit.merge([Kit.box(0.5, 0.09, 1.2, 0, 0, 0.05, C1), Kit.box(0.42, 0.09, 0.5, 0, 0, -0.8, C1), Kit.box(0.28, 0.09, 0.4, 0, 0.01, -1.15, C1, { rx: -0.2 }), Kit.box(0.14, 0.09, 0.25, 0, 0.03, -1.4, C1, { rx: -0.35 }),
      Kit.box(0.44, 0.09, 0.4, 0, 0, 0.85, C1), Kit.box(0.3, 0.09, 0.2, 0, 0, 1.1, C1), Kit.box(0.12, 0.1, 2.1, 0, 0.01, -0.1, C2), Kit.box(0.4, 0.04, 0.5, 0, 0.09, 0.35, DK)])));
    if (!RunnerSprite._foamTex) { const cv = document.createElement('canvas'); cv.width = cv.height = 64; const x = cv.getContext('2d'), gr = x.createRadialGradient(32, 32, 2, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.55, 'rgba(255,255,255,0.75)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64); RunnerSprite._foamTex = new THREE.CanvasTexture(cv); }
    const mat = new THREE.MeshBasicMaterial({ map: RunnerSprite._foamTex, transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide }), plane = (w, d, x, z, ry) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2), mat); m.position.set(x, 0.035, z); m.rotation.y = ry; m.renderOrder = 2; return m; };
    const wake = new THREE.Group(), collar = new THREE.Group(); wake.add(plane(0.7, 6.5, 0.7, 3.4, 0.17), plane(0.7, 6.5, -0.7, 3.4, -0.17), plane(1.3, 2.2, 0, 1.6, 0)); for (let k = 0; k < 6; k++) wake.add(plane(0.45, 0.9, (k % 2 ? 1 : -1) * (0.7 + k * 0.28), 2.4 + k * 1.0, 0.2 * (k % 2 ? -1 : 1)));
    collar.add(plane(1.7, 0.8, 0, -1.55, 0)); g.add(wake, collar); g.userData = { wake, collar, foam: wake.children[0] };
    return g;
  }

  // the kick scooter: deck, stem, handlebar, two spinning wheels; the runner faces -z. Lime body, dark tyres and grip tape, a glowing headlight and tail light
  static buildScooter() {
    const LIME = '#7ddc3a', DARK = '#23262c', PALE = '#e9f7a8', g = new THREE.Group();
    g.add(Kit.mesh(Kit.merge([
      Kit.box(0.26, 0.05, 0.95, 0, 0.12, 0.02, LIME), Kit.box(0.2, 0.012, 0.8, 0, 0.17, 0.02, DARK),                                 // deck and grip tape
      Kit.box(0.14, 0.03, 0.3, 0, 0.3, 0.52, LIME),                                                                                   // rear fender
      Kit.cyl(0.025, 0.03, 1.0, 0, 0.15, -0.54, LIME, { rx: 0.14, seg: 6 }), Kit.box(0.54, 0.04, 0.05, 0, 1.12, -0.47, DARK),           // stem and handlebar
      Kit.box(0.025, 0.3, 0.04, -0.07, 0.1, -0.62, DARK), Kit.box(0.025, 0.3, 0.04, 0.07, 0.1, -0.62, DARK),                         // fork
      Kit.box(0.1, 0.07, 0.04, 0, 0.88, -0.555, '#ffd27a', { glow: true }), Kit.box(0.12, 0.05, 0.03, 0, 0.31, 0.68, '#ff3a2a', { glow: true })])));
    const wheel = z => { const w = Kit.mesh(Kit.merge([Kit.cyl(0.13, 0.13, 0.06, 0, -0.03, 0, DARK, { rz: Math.PI / 2, seg: 12 }), Kit.cyl(0.075, 0.075, 0.07, 0, -0.035, 0, LIME, { rz: Math.PI / 2, seg: 8 }),
      Kit.box(0.075, 0.22, 0.025, 0, -0.11, 0, PALE), Kit.box(0.075, 0.22, 0.025, 0, -0.11, 0, PALE, { rx: Math.PI / 2 })])); w.position.set(0, 0.13, z); g.add(w); return w; };   // (the pale spokes make the spin visible)
    g.userData.wheels = [wheel(-0.62), wheel(0.56)];
    return g;
  }

  // the electromagnetic skateboard's parts (Kit parts, nose toward -z), centred on (x, z) and floating `y` m up; `pal` = { glow, accent }: the colour of its underglow and edge lights and of its
  // magnetic coils and guide lines (red / cyan on the pavements of Saint-Gilles, magenta / cyan in the Neon Quarter). A carbon deck with kicked nose and tail, light bars along both edges, a
  // guide line and chevrons on top, two side fins with lit edges, a front sensor, three levitation coils under the deck (a dark housing, a glowing ring, a glowing core), an underglow slab,
  // and a rear engine block with two glowing nozzles. (The user's picture of the rear, BoardArt, is a separate textured panel placed behind it by the caller.)
  static boardParts(x, y, z, pal) {
    const DARK = '#16161e', P = [];
    P.push(Kit.box(0.34, 0.045, 1.2, x, 0.16 + y, z, DARK), Kit.box(0.28, 0.01, 1.0, x, 0.205 + y, z, '#0b0b12'),
      Kit.box(0.32, 0.04, 0.2, x, 0.185 + y, z - 0.64, DARK, { rx: -0.35 }), Kit.box(0.32, 0.04, 0.2, x, 0.185 + y, z + 0.64, DARK, { rx: 0.35 }),
      Kit.box(0.02, 0.03, 1.2, x - 0.18, 0.17 + y, z, pal.glow, { glow: true }), Kit.box(0.02, 0.03, 1.2, x + 0.18, 0.17 + y, z, pal.glow, { glow: true }),
      Kit.box(0.012, 0.004, 0.8, x, 0.212 + y, z, pal.accent, { glow: true }), Kit.box(0.3, 0.012, 1.06, x, 0.1 + y, z, pal.glow, { glow: true }),
      Kit.box(0.18, 0.02, 0.03, x, 0.2 + y, z - 0.6, '#ffffff', { glow: true }));
    for (let k = 0; k < 3; k++) P.push(Kit.box(0.1 - k * 0.02, 0.004, 0.02, x, 0.213 + y, z - 0.3 + k * 0.1, pal.accent, { glow: true }));                                   // chevrons
    for (const sx of [-1, 1]) P.push(Kit.box(0.07, 0.018, 0.4, x + sx * 0.215, 0.19 + y, z, DARK, { rz: sx * 0.35 }), Kit.box(0.012, 0.012, 0.4, x + sx * 0.248, 0.2 + y, z, pal.accent, { glow: true, rz: sx * 0.35 }));   // fins
    for (const dz of [-0.38, 0, 0.38]) P.push(Kit.cyl(0.1, 0.1, 0.03, x, 0.1 + y, z + dz, '#23232e', { seg: 10 }), Kit.cyl(0.108, 0.108, 0.008, x, 0.088 + y, z + dz, pal.accent, { seg: 10, glow: true }), Kit.cyl(0.07, 0.07, 0.006, x, 0.082 + y, z + dz, pal.glow, { seg: 10, glow: true }));   // coils
    P.push(Kit.box(0.26, 0.1, 0.14, x, 0.13 + y, z + 0.58, '#1c1c26'));
    for (const sx of [-1, 1]) P.push(Kit.cyl(0.035, 0.04, 0.05, x + sx * 0.07, 0.15 + y, z + 0.67, pal.accent, { seg: 8, glow: true, rx: Math.PI / 2 }));                    // exhaust nozzles
    return P;
  }

  // the board the runner rides: boardParts floating on a magnetic field (a soft glowing disc on the road, a ring that swells on the beat, a fading light trail behind), and the user's picture of its
  // rear as the engine ring at the back, facing the chase camera
  static buildBoard() {
    const g = new THREE.Group(), pal = { glow: '#ff1f5a', accent: '#35e6ff' };
    g.add(Kit.mesh(Kit.merge(RunnerSprite.boardParts(0, 0, 0, pal))));
    if (!RunnerSprite._fx) {                                                                                       // shared by the board's effects: an additive material, a gradient for the trail
      const cv = document.createElement('canvas'); cv.width = 8; cv.height = 64; const x = cv.getContext('2d'), gr = x.createLinearGradient(0, 0, 0, 64); gr.addColorStop(0, 'rgba(255,60,110,0.55)'); gr.addColorStop(1, 'rgba(255,60,110,0)'); x.fillStyle = gr; x.fillRect(0, 0, 8, 64);
      const add = o => new THREE.MeshBasicMaterial(Object.assign({ transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }, o));
      RunnerSprite._fx = { field: add({ color: 0xff2a5a, opacity: 0.3 }), ring: add({ color: 0x35e6ff, opacity: 0.55 }), trail: add({ map: new THREE.CanvasTexture(cv), opacity: 1 }) };
    }
    const fx = RunnerSprite._fx, field = new THREE.Mesh(new THREE.CircleGeometry(0.6, 24), fx.field), ring = new THREE.Mesh(new THREE.RingGeometry(0.44, 0.5, 32), fx.ring), trail = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 2.4), fx.trail);
    for (const m of [field, ring]) { m.rotation.x = -Math.PI / 2; m.position.y = 0.025; g.add(m); } trail.rotation.x = -Math.PI / 2; trail.position.set(0, 0.03, 1.9); g.add(trail);
    g.userData.field = field; g.userData.ring = ring; g.userData.trail = trail;
    if (typeof BoardArt !== 'undefined' && typeof BOARD_ART !== 'undefined') { const rear = new THREE.Mesh(BoardArt.plane(0, -0.25, 0, 0.5), BoardArt.material()); rear.position.set(0, 0.45, 0.7); g.add(rear); g.userData.rear = rear; }
    return g;
  }
}
