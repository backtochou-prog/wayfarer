// RunnerSprite: the player avatar as the user's own retouched artwork (AVATAR_ASSETS in avatar_assets.js), shown as flat cards.
// It has the same interface as Runner3D (group, shadow, update(dt, state), cur), so the renderer and the tests treat both alike:
//   - the chase camera looks at the runner from behind, so gameplay shows the retouched BACK view;
//   - the menu shows the retouched SIDE view with an idle / wave / spin / dance / run-in-place showcase, like the 3D model's;
//   - there is no skeleton, so the motion is done to the whole card: run bounce and squash-and-stretch, a steering lean, a stretch in the jump,
//     ducking (squashed) for the slide, tipping forward for a crash.
// Size: 1.9 m tall (hair top to soles), feet on the road (the card pivots at its bottom centre). The group is yawed by the renderer like the 3D
// model (heading, menu turn); the card cancels that yaw so it always faces the camera. `?avatar=3d` in the URL selects the 3D model instead.
// States: 'play' run / jump / slide, 'over' trip, 'pause' hold, 'title' a looping showcase for the main menu.
class RunnerSprite {
  constructor() {
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
    t.y = 0; t.rx = 0; t.rz = 0; t.sx = 1; t.sy = 1;
    if (s.state === 'over') {                                  // tripped: tips forward onto its face
      t.rx = -1.35; t.rz = 0.1; t.sy = 0.95;
    } else if (s.state === 'title') {                          // showcase loop (10 s) on the side view: idle, wave, spin, dance, run in place
      view = 'side'; const u = T % 10;
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
    const k = 1 - Math.exp(-(s.sliding ? 60 : 15) * dt);       // the slide pose is near-instant: the game counts a slide from the first frame
    for (const key in c) c[key] += (t[key] - c[key]) * k;
    if (view !== this.view) { this.cards.back.visible = view === 'back'; this.cards.side.visible = view === 'side'; this.view = view; }
    this.pivot.position.y = c.y;
    this.pivot.rotation.set(c.rx, -this.group.rotation.y + spin, c.rz, 'YXZ');   // cancel the renderer's yaw: the card always faces the camera (plus the showcase spin)
    this.pivot.scale.set(c.sx, c.sy, 1);
  }
}
