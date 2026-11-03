// Race3D: the scene of the race zone (3D build only), drawn with its own THREE.Scene on the game's renderer while Game.state is 'race' (rules: src/race.js). The theme of the user's pictures: a near-black world,
// thin glowing neon lines (the road is traced in dark red lines), spirals and rings of light. The runner's way is -z: the track position `s` is z = -s. Everything is built once and moved by `draw`.
// the sphere of glass that opens the race zone: one shared material (Items3D hangs it in every zone)
const RaceArt = {
  _m: null,
  sphereMaterial() {
    if (!this._m) { const img = new Image(), t = new THREE.Texture(img); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; const m = new THREE.MeshBasicMaterial({ map: t, transparent: true, side: THREE.DoubleSide, depthWrite: false }); m.visible = false; img.onload = () => { t.needsUpdate = true; m.visible = true; }; img.src = RACE_ASSETS.sphere; this._m = m; }
    return this._m;
  },
};
class Race3D {
  constructor() {
    const sc = this.scene = new THREE.Scene(); sc.background = new THREE.Color('#04020a'); sc.fog = new THREE.Fog('#04020a', 90, 520);
    sc.add(new THREE.HemisphereLight('#b0a8ff', '#40204a', 2.0)); const d = new THREE.DirectionalLight('#ff9ac8', 1.0); d.position.set(-6, 12, 8); sc.add(d);
    this.camera = new THREE.PerspectiveCamera(62, 16 / 9, 0.2, 700);
    this.tex = {}; const L = (src) => { const img = new Image(), t = new THREE.Texture(img); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; img.onload = () => { t.needsUpdate = true; }; img.src = src; return t; };
    const mat = (t, add) => new THREE.MeshBasicMaterial({ map: t, transparent: true, side: THREE.DoubleSide, depthWrite: false, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending });
    const halo = col => { const cv = document.createElement('canvas'); cv.width = cv.height = 128; const x = cv.getContext('2d'), gr = x.createRadialGradient(64, 64, 4, 64, 64, 62); gr.addColorStop(0, col + 'cc'); gr.addColorStop(0.45, col + '55'); gr.addColorStop(1, col + '00'); x.fillStyle = gr; x.fillRect(0, 0, 128, 128); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return mat(t, true); };
    this.spiralMat = RACE_ASSETS.spirals.map(u => mat(L(u), true)); this.haloMat = ['#ff2a3a', '#c050ff', '#50ff30', '#d8ff20'].map(halo); this.ringHalo = halo('#ff3fd0'); this.carGlow = halo('#4a2a70'); this.botGlow = halo('#1a6a80'); this.ringMat = mat(L(RACE_ASSETS.ring)); this.ringMatFlat = mat(L(RACE_ASSETS.ring), true); this.carMat = mat(L(RACE_ASSETS.carSide), true); this.botMat = mat(L(RACE_ASSETS.bot34), true); this.rampMat = mat(L(RACE_ASSETS.ramp), true); this.sphereMat = mat(L(RACE_ASSETS.sphere));
    this.plane = (w, h) => new THREE.PlaneGeometry(w, h);
    this.track = this.buildTrack(); sc.add(this.track);
    // THE TWO CARS ARE THE USER'S OWN PICTURES, as they are (drawn additively, so the black of the drawing disappears on the black road): the player's car (its side view, mirrored, on a plane turned 30 degrees,
    // seen from the chase camera) and the robot's magnetic pod (its three-quarter view, always facing the camera). Car3D (the modelled car) is kept for the renders in docs/race.
    this.car = new THREE.Group();
    { const w = 6.4, h = w * 0.62, m = new THREE.Mesh(this.plane(w, h), this.carMat); m.scale.x = -1; m.rotation.y = 0.62; m.position.set(0, h / 2 - 0.35, 0); this.car.add(m); this.car.userData.pic = m;
      const gl = new THREE.Mesh(this.plane(w * 0.75, w * 0.4), this.ringHalo); gl.rotation.x = -Math.PI / 2; gl.position.set(0, 0.02, 0.3); gl.material = this.carGlow; this.car.add(gl); }
    sc.add(this.car);
    this.bot = new THREE.Group();
    { const w = 6.4, m = new THREE.Mesh(this.plane(w, w * 0.62), this.botMat); m.position.y = 1.0; this.bot.add(m); this.bot.userData.pic = m; const gl = new THREE.Mesh(this.plane(w * 0.8, w * 0.5), this.botGlow); gl.rotation.x = -Math.PI / 2; gl.position.y = 0.03; this.bot.add(gl); }
    sc.add(this.bot); this.beacon = this.buildBeacon(); this.bot.add(this.beacon);
    this.itemsGroup = new THREE.Group(); sc.add(this.itemsGroup); this.meshes = []; this.bound = null; this.camPos = new THREE.Vector3();
  }
  // the track: a dark floor, the three lanes traced in thin dark-red neon lines, the walls' red edge lines, neon posts every 24 m, the start and the finish arches
  buildTrack() {
    const g = new THREE.Group(), LEN = RACE.LEN + 400, M = RACE.LANE_M, p = [];
    const row = (w, h, d, x, y, z, c, glow) => p.push(Kit.box(w, h, d, x, y, z, c, { glow: !!glow }));
    row(3 * M + 3.2, 0.1, LEN, 0, -0.1, -LEN / 2 + 200, '#0b0614');                              // the floor
    for (const x of [-1.5 * M, -0.5 * M, 0.5 * M, 1.5 * M]) row(0.09, 0.03, LEN, x, 0.02, -LEN / 2 + 200, '#a0102a', true);          // the lane lines
    for (const s of [-1, 1]) { row(0.5, 0.9, LEN, s * (1.5 * M + 1.9), 0, -LEN / 2 + 200, '#12081c'); row(0.1, 0.06, LEN, s * (1.5 * M + 1.62), 0.92, -LEN / 2 + 200, '#ff1a4a', true); }
    for (let z = 0; z > -LEN; z -= 24) for (const s of [-1, 1]) { row(0.22, 3.2, 0.22, s * (1.5 * M + 2.6), 0, z, '#1a0c24'); row(0.3, 0.3, 0.3, s * (1.5 * M + 2.6), 3.2, z, (Math.round(-z / 24) % 2) ? '#35e6ff' : '#ff1a4a', true); }
    for (const sz of [0, -RACE.LEN]) {                                                           // the start and the finish: a checkered line on the road and an arch of light
      for (let k = 0; k < 12; k++) for (let j = 0; j < 2; j++) row(M * 3 / 12, 0.03, 0.8, -1.5 * M + (k + 0.5) * M * 3 / 12, 0.04, sz - 0.4 - j * 0.8, (k + j) % 2 ? '#f0f0ff' : '#0a0610', (k + j) % 2 === 1);
      for (const s of [-1, 1]) row(0.3, 5.6, 0.3, s * (1.5 * M + 1.2), 0, sz, sz ? '#35e6ff' : '#ff1a4a', true); row(3 * M + 2.7, 0.3, 0.3, 0, 5.6, sz, sz ? '#35e6ff' : '#ff1a4a', true);
    }
    const m = Kit.merge(p); g.add(Kit.mesh(m)); return g;
  }
  // the robot's magnetic car: a dark glossy pod with a red lattice canopy, a cyan cockpit, two slanted eyes that light up neon turquoise (no flames: it hovers on an electric field)
  buildBot() {
    const g = new THREE.Group(), p = [];
    p.push(Kit.ico(1.15, 0, 0.55, 0, '#28284a', { sx: 0.95, sy: 0.38, sz: 2.2, detail: 1 }));
    p.push(Kit.ico(0.8, 0, 0.82, 0.25, '#ff1a4a', { sx: 0.95, sy: 0.38, sz: 1.5, detail: 1, glow: true }));      // the red lattice canopy
    p.push(Kit.ico(0.62, 0, 0.98, 0.12, '#10131f', { sx: 0.9, sy: 0.4, sz: 1.35, detail: 1 }));
    p.push(Kit.ico(0.42, 0, 1.0, 0.1, '#2fd8ff', { sx: 0.9, sy: 0.4, sz: 1.3, detail: 1, glow: true }));           // the cyan cockpit
    for (const s of [-1, 1]) p.push(Kit.box(0.55, 0.1, 0.1, s * 0.55, 0.72, -2.1, '#19f0e0', { glow: true, rz: s * 0.45 }));   // the eyes (also recoloured by the charge)
    p.push(Kit.box(2.4, 0.05, 4.4, 0, 0.05, 0.1, '#19f0e0', { glow: true }), Kit.box(0.12, 0.12, 5.0, -1.1, 0.5, 0.1, '#19f0e0', { glow: true }), Kit.box(0.12, 0.12, 5.0, 1.1, 0.5, 0.1, '#19f0e0', { glow: true }));       // the electric field under the pod and two turquoise lines of light along its flanks
    const m = Kit.merge(p); g.add(Kit.mesh(m)); return g;
  }
  // the beacon over the robot's car: a turquoise inverted pyramid and a thin vertical line of light (seen from far ahead)
  buildBeacon() { const g = new THREE.Group(); g.add(Kit.mesh(Kit.merge([Kit.cone(0.9, 1.4, 0, 3.4, 0, '#19f0e0', { glow: true, seg: 4, rz: Math.PI }), Kit.box(0.08, 9, 0.08, 0, 0.9, 0, '#19f0e0', { glow: true })]))); return g; }
  // a droid: a black glossy powerful body (huge shoulders), green glowing chest core, cyan fists, green shoes, a small yellow face light; faces +z (towards the car); legs and arms swing on pivots
  buildDroid() {
    const g = new THREE.Group(), K = '#252c3c', body = [Kit.box(0.7, 0.9, 0.42, 0, 1.0, 0, K), Kit.box(1.5, 0.5, 0.55, 0, 1.75, 0, K), Kit.ico(0.3, 0, 2.5, 0.02, K, { detail: 1 }),
      Kit.box(0.55, 0.3, 0.1, 0, 1.7, 0.3, '#22ff88', { glow: true }), Kit.box(0.14, 0.18, 0.06, 0, 2.42, 0.3, '#ffe24a', { glow: true }), Kit.box(0.3, 0.2, 0.3, 0, 1.0, 0, '#0c2a1a')];
    g.add(Kit.mesh(Kit.merge(body)));
    const limb = (x, y, parts) => { const pv = new THREE.Group(); pv.position.set(x, y, 0); pv.add(Kit.mesh(Kit.merge(parts))); g.add(pv); return pv; };
    this.legL = null; g.userData.legs = [-1, 1].map(s => limb(s * 0.24, 1.0, [Kit.box(0.3, 0.95, 0.32, 0, -0.95, 0, K), Kit.box(0.34, 0.18, 0.5, 0, -1.0, 0.08, '#22ff88', { glow: true })]));
    g.userData.arms = [-1, 1].map(s => limb(s * 0.95, 1.9, [Kit.box(0.34, 0.9, 0.34, 0, -0.9, 0, K), Kit.box(0.4, 0.34, 0.4, 0, -1.15, 0.05, '#19f0e0', { glow: true })]));
    return g;
  }
  buildRare() { const g = new THREE.Group(); g.add(Kit.mesh(Kit.merge([Kit.ico(0.42, 0, 1.2, 0, '#ffd24a', { glow: true, sy: 1.4 }), Kit.ico(0.2, 0, 1.2, 0, '#ffffff', { glow: true, sy: 1.4 }), Kit.cyl(0.55, 0.55, 0.05, 0, 0.8, 0, '#ff4fd8', { glow: true, seg: 10 })]))); return g; }
  // a ramp, from the user's picture: glossy black, a wavy base edged with pink light, green chevrons on the slope, red streaks down one side and blue ones down the other, white highlights
  // the ramp: the user's picture laid as it is on the road (a plane lying flat, 9.4 m long), with a pink glow under it and two lines of light along its sides; the car takes off when it drives over it
  // the ramp: the user's picture laid on the slope as it is (30 degrees, 11 m), with a frame of light round it (pink at the foot, red and blue up the sides, white at the lip) so the black shape reads against the black road
  buildRamp() {
    const g = new THREE.Group(), M = RACE.LANE_M, W = M * 1.1, L = 11, A = 0.52, H = L * Math.sin(A), D = L * Math.cos(A), z0 = 1.2, zc = z0 - D / 2;
    const halo = new THREE.Mesh(this.plane(W + 2.6, D + 2.0), this.ringHalo); halo.rotation.x = -Math.PI / 2; halo.position.set(0, 0.015, zc);
    const pic = new THREE.Mesh(this.plane(W, L), this.rampMat); pic.rotation.x = -Math.PI / 2 + A; pic.position.set(0, H / 2 + 0.05, zc);
    const pic2 = pic.clone(); pic2.position.y += 0.04; g.add(halo, pic, pic2); g.userData.pic = pic;
    const p = [];
    for (let k = 0; k < 9; k++) p.push(Kit.box(W / 9 + 0.02, 0.07, 0.2, -W / 2 + (k + 0.5) * W / 9, 0.02, z0 + 0.15 * Math.sin(k * 1.7), '#ff3fb0', { glow: true }));                      // the wavy pink foot
    for (const s2 of [-1, 1]) p.push(Kit.box(0.09, 0.09, L, s2 * W / 2, H / 2, zc, s2 < 0 ? '#ff2020' : '#2832ff', { glow: true, rx: A }));                                               // red up one side, blue up the other
    p.push(Kit.box(W + 0.1, 0.09, 0.09, 0, H, z0 - D, '#ffffff', { glow: true }));                                                                                                        // the lip
    g.add(Kit.mesh(Kit.merge(p))); return g;
  }



  // bind a Race: one mesh per item (the textured ones are planes that face the car)
  bind(race) {
    while (this.itemsGroup.children.length) this.itemsGroup.remove(this.itemsGroup.children[0]);
    this.meshes = race.items.map(it => {
      let m;
      if (it.type === 'spiral') { m = new THREE.Group(); const h = new THREE.Mesh(this.plane(4.2, 4.2), this.haloMat[it.color]); h.position.z = -0.05; const a1 = new THREE.Mesh(this.plane(3.1, 3.1), this.spiralMat[it.color]), a2 = new THREE.Mesh(this.plane(3.1, 3.1), this.spiralMat[it.color]); a2.rotation.z = 0.08; a2.scale.setScalar(1.03); m.add(h, a1, a2); }
      else if (it.type === 'ring') { m = new THREE.Group(); const flat = new THREE.Mesh(this.plane(3.0, 3.0), this.ringMatFlat), h = new THREE.Mesh(this.plane(5.0, 5.0), this.ringHalo); flat.rotation.x = h.rotation.x = -Math.PI / 2; h.position.y = -0.01; m.add(h, flat); m.userData.flat = flat; }       // the brake ring lies on the road
      else if (it.type === 'droid') m = this.buildDroid(); else if (it.type === 'rare') m = this.buildRare(); else m = this.buildRamp();
      this.itemsGroup.add(m); return m;
    });
    this.bound = race;
  }
  // draw one frame of the race `R` into `renderer`
  draw(g, renderer) {
    const bt = g.sfx ? g.sfx.beat() : null, pulse = bt ? bt.pulse * (0.45 + 0.55 * bt.energy) : 0, kick = bt ? bt.kick : 0.5;              // THE RACE DANCES TO ITS TRACK (assets/music_race.mp3): the lights of the track, the spirals, the rings and the two cars move on the beat
    const R = g.race; if (this.bound !== R) this.bind(R);
    const p = R.p, M = RACE.LANE_M, t = g.time, air = p.air > 0 ? Math.sin(Math.PI * (1 - p.air / RACE.JUMP_T)) : 0;
    R.items.forEach((it, i) => {
      const m = this.meshes[i], z = -it.s, x = it.lane * M, vis = !it.taken && !(it.type === 'droid' && it.hit) && it.s > p.s - 12 && it.s < p.s + 230; m.visible = vis; if (!vis) return;
      if (it.type === 'spiral') { m.position.set(x, 1.5 + 0.12 * Math.sin(t * 3 + i), z); m.rotation.z = t * 1.6 * (i % 2 ? 1 : -1); m.scale.setScalar(1 + 0.05 * Math.sin(t * 6 + i) + 0.22 * pulse); }                 // they flare on every kick
      else if (it.type === 'ring') { m.position.set(x, 0.06, z); m.userData.flat.rotation.z = t * 0.5 * (i % 2 ? 1 : -1); m.scale.setScalar(1 + 0.04 * Math.sin(t * 5 + i) + 0.1 * pulse); }
      else if (it.type === 'droid') { m.position.set(x, 0, z); const sw = Math.sin(t * (it.run ? 14 : 3) + i) * (it.run ? 0.9 : 0.12); m.userData.legs[0].rotation.x = sw; m.userData.legs[1].rotation.x = -sw; m.userData.arms[0].rotation.x = -sw; m.userData.arms[1].rotation.x = sw; m.position.y = it.run ? Math.abs(Math.sin(t * 14 + i)) * 0.12 : 0; }
      else if (it.type === 'rare') { m.position.set(x, 0.15 * Math.sin(t * 3 + i), z); m.rotation.y = t * 2.4; }
      else { m.position.set(x, 0, z); if (m.userData.pic) m.userData.pic.scale.setScalar(1 + 0.03 * Math.sin(t * 4 + i) + 0.07 * pulse); }
    });
    // the cars
    this.track.position.y = 0.04 * pulse; this.track.scale.set(1 + 0.004 * pulse, 1, 1);                                                                   // the whole track breathes on the kick
    Kit.materials().glow.color.setScalar(1 - 0.16 * (1 - pulse));                                                                                            // every neon light of the race (lines, posts, cars) pulses with the music
    this.car.position.set(p.x, 0.02 + air * 2.6 + 0.05 * pulse, -p.s); this.car.rotation.set(0, 0, 0); this.car.userData.pic.rotation.z = (p.lane * M - p.x) * 0.05 - air * 0.12; this.car.userData.pic.scale.y = 1 + 0.03 * pulse;
    const gap = R.bot.s - p.s;                                                                               // the robot is drawn where it really is (it never slows down when the player does); far ahead it is drawn bigger, with a turquoise beacon over it, so it stays easy to see
    const bx = Math.sin(R.t * 0.8) * M * 0.9, far = Math.max(0, gap - 30); this.bot.position.set(bx, 1.9 + 0.15 * Math.sin(t * 4) + 0.18 * pulse, -R.bot.s); this.bot.userData.pic.rotation.z = Math.sin(t * 1.6) * 0.05 + 0.03 * pulse; this.bot.userData.pic.lookAt(this.camera.position.x, this.bot.position.y + 1, this.camera.position.z); this.bot.scale.setScalar(2.3 * (1 + Math.min(far, 120) / 110)); this.beacon.visible = gap > 30; this.beacon.scale.setScalar(0.45 * (1 + Math.min(far, 150) / 130)); this.beacon.rotation.y = t * 2;
    const f = 62 + Math.min(14, p.speed - RACE.BASE) * 0.9 + (p.hitT > 0 ? -4 : 0); if (Math.abs(this.camera.fov - f) > 0.05) { this.camera.fov += (f - this.camera.fov) * 0.1; this.camera.updateProjectionMatrix(); }
    const cx = p.x * 0.55, cz = -p.s + 8.2; this.camPos.set(cx, 3.5 + air * 1.4, cz); this.camera.position.lerp(this.camPos, 0.5); this.camera.position.z = cz; this.camera.lookAt(p.x * 0.4, 1.3 + air * 0.8, -p.s - 12);
    renderer.render(this.scene, this.camera);
  }
}
