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
    this.ride = 0; this.wheelA = 0;                            // 0..1: how far the runner is on the scooter (eased); the wheels' spin angle
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
    const R = this.ride += ((s.scooter ? 1 : 0) - this.ride) * (1 - Math.exp(-6 * dt));    // on the scooter: a steady glide instead of the run bounce, squash and sway
    if (R > 0.01 && s.state === 'play' && !s.sliding && !s.airborne) { const k = Math.min(1, R * 1.5); t.y = t.y * (1 - k) + 0.012 * (1 + sn) * k; t.sy += (1 - t.sy) * k; t.sx += (1 - t.sx) * k; t.rz = t.rz * (1 - k) + (-s.lean * 0.14) * k; }
    if (s.beat > 0 && s.state !== 'over') { const m = s.state === 'title' ? 1 : 0.4; t.y += 0.1 * m * s.beat; t.sy += 0.05 * m * s.beat; t.sx -= 0.03 * m * s.beat; }   // bounces on the beat of the music (more in the menu)
    const k = 1 - Math.exp(-(s.sliding ? 60 : 15) * dt);       // the slide pose is near-instant: the game counts a slide from the first frame
    for (const key in c) c[key] += (t[key] - c[key]) * k;
    if (view !== this.view) { this.cards.back.visible = view === 'back'; this.cards.side.visible = view === 'side'; this.view = view; }
    this.pivot.position.y = c.y + RunnerSprite.DECK * Math.min(1, R * 1.5);               // the feet stand on the deck
    const sc = this.scooter; sc.visible = R > 0.02; sc.scale.setScalar(Math.min(1, R * 1.4) * RunnerSprite.SC); sc.position.y = 0;
    if (sc.visible) {
      this.wheelA += dt * s.runRate * 9; for (const w of sc.userData.wheels) w.rotation.x = -this.wheelA;
      const k = 1 - Math.exp(-10 * dt); sc.rotation.z += (-s.lean * 0.1 - sc.rotation.z) * k; sc.rotation.x += ((s.airborne ? 0.14 : 0) - sc.rotation.x) * k;     // leans into the steering, nose up in the air
    }
    this.pivot.rotation.set(c.rx, -this.group.rotation.y + face + spin, c.rz, 'YXZ');   // cancel the renderer's yaw: the card always faces the camera (plus the showcase spin)
    this.pivot.scale.set(c.sx, c.sy, 1);
  }

  // the kick scooter: deck, stem, handlebar, two spinning wheels; the runner faces -z. Lime body, dark tyres and grip tape, a glowing headlight and tail light
  static buildScooter() {
    const LIME = '#7ddc3a', DARK = '#23262c', PALE = '#e9f7a8', g = new THREE.Group();
    g.add(Kit.mesh(Kit.merge([
      Kit.box(0.26, 0.05, 0.95, 0, 0.12, 0.02, LIME), Kit.box(0.2, 0.012, 0.8, 0, 0.17, 0.02, DARK),                                 // deck and grip tape
      Kit.box(0.14, 0.03, 0.3, 0, 0.3, 0.52, LIME),                                                                                   // rear fender
      Kit.cyl(0.025, 0.03, 1.0, 0, 0.15, -0.54, LIME, { rx: 0.14, seg: 6 }), Kit.box(0.54, 0.04, 0.05, 0, 1.12, -0.6, DARK),           // stem and handlebar
      Kit.box(0.025, 0.3, 0.04, -0.07, 0.1, -0.62, DARK), Kit.box(0.025, 0.3, 0.04, 0.07, 0.1, -0.62, DARK),                         // fork
      Kit.box(0.1, 0.07, 0.04, 0, 0.9, -0.64, '#ffd27a', { glow: true }), Kit.box(0.12, 0.05, 0.03, 0, 0.31, 0.68, '#ff3a2a', { glow: true })])));
    const wheel = z => { const w = Kit.mesh(Kit.merge([Kit.cyl(0.13, 0.13, 0.06, 0, -0.03, 0, DARK, { rz: Math.PI / 2, seg: 12 }), Kit.cyl(0.075, 0.075, 0.07, 0, -0.035, 0, LIME, { rz: Math.PI / 2, seg: 8 }),
      Kit.box(0.075, 0.22, 0.025, 0, -0.11, 0, PALE), Kit.box(0.075, 0.22, 0.025, 0, -0.11, 0, PALE, { rx: Math.PI / 2 })])); w.position.set(0, 0.13, z); g.add(w); return w; };   // (the pale spokes make the spin visible)
    g.userData.wheels = [wheel(-0.62), wheel(0.56)];
    return g;
  }
}
