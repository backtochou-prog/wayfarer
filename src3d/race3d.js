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
    this.droidMat = new THREE.MeshBasicMaterial({ map: L(RACE_ASSETS.droid), transparent: true, side: THREE.DoubleSide, depthWrite: false });
    this.droidGlowMat = mat(L(RACE_ASSETS.droid), true);
    this.spiralMat = RACE_ASSETS.spirals.map(u => mat(L(u), true)); this.haloMat = ['#ff2a3a', '#c050ff', '#50ff30', '#d8ff20'].map(halo); this.ringHalo = halo('#ff3fd0'); this.carGlow = halo('#4a2a70'); this.botGlow = halo('#1a6a80'); this.droidGlow = halo('#2bff6a'); this.botHalo = halo('#ff2a7a'); this.backGlowG = halo('#2bff3a'); this.backGlowM = halo('#2a4cff'); this.ringMat = mat(L(RACE_ASSETS.ring)); this.ringMatFlat = mat(L(RACE_ASSETS.ring), true); this.carMat = mat(L(RACE_ASSETS.carSide), true); this.backMat = mat(L(RACE_ASSETS.carBack), true); this.rearMat = new THREE.MeshBasicMaterial({ map: L(RACE_ASSETS.rear), transparent: true, side: THREE.DoubleSide }); this.botMat = new THREE.MeshBasicMaterial({ map: L(RACE_ASSETS.botPod), transparent: true, side: THREE.DoubleSide, depthWrite: false }); this.botGlowMat = mat(L(RACE_ASSETS.botPod), true);
    this.botWrapMat = new THREE.MeshBasicMaterial({ map: L(RACE_ASSETS.botSide), transparent: true, side: THREE.DoubleSide, depthWrite: false }); this.botWrapGlow = mat(L(RACE_ASSETS.botSide), true);
    this.botLowMat = new THREE.MeshBasicMaterial({ map: L(RACE_ASSETS.botFlankLow), transparent: true, side: THREE.DoubleSide, depthWrite: false }); this.botLowGlow = mat(L(RACE_ASSETS.botFlankLow), true);
    this.botTopMat = new THREE.MeshBasicMaterial({ map: L(RACE_ASSETS.botFlankTop), transparent: true, side: THREE.DoubleSide, depthWrite: false }); this.botTopGlow = mat(L(RACE_ASSETS.botFlankTop), true); this.rampMat = mat(L(RACE_ASSETS.ramp), true); this.sphereMat = mat(L(RACE_ASSETS.sphere));
    this.plane = (w, h) => new THREE.PlaneGeometry(w, h);
    this.track = this.buildTrack(); sc.add(this.track);
    this.crystal = this.buildCrystal(); sc.add(this.crystal);
    // THE TWO CARS ARE THE USER'S OWN PICTURES, as they are (drawn additively, so the black of the drawing disappears on the black road): the player's car (its side view, mirrored, on a plane turned 30 degrees,
    // seen from the chase camera) and the robot's magnetic pod (its three-quarter view, always facing the camera). Car3D (the modelled car) is kept for the renders in docs/race.
    // THE PLAYER'S CAR is modelled (src3d/car3d.js) because the race's camera is behind it and none of the user's three pictures shows a rear: its BACK is built from the user's material picture (the panel of
    // dark red and black paint with its neon streaks on the tail, over the modelled boot lid, lamp bar, plate, diffuser and exhausts).
    // THE PLAYER'S CAR is the user's own picture of its BACK (the green light bar, the red lines, the blue body and its magenta glow), hung as it is, facing the chase camera, with a glow on the road under
    // it; only that one piece, at the user's request. The modelled car (src3d/car3d.js, whose back is built from the user's material picture) is kept for the renders in docs/race.
    // THE PLAYER'S CAR is GENERATED FROM THE USER'S PICTURE OF ITS BACK: the picture is the tail, hung as it is (never redrawn), and the body in front of it is modelled from what it shows (Car3D.fromBack).
    this.car = Car3D.buildFromBack();
    { const w = 2.95, h = w / RACE_ASSETS.ar.carBack, m = new THREE.Mesh(this.plane(w, h), this.backMat); m.position.set(0, h / 2 + 0.06, 2.02); this.car.add(m); this.car.userData.pic = m;
      // the neon of the back LIT: the picture is drawn three times over itself (additive, so every lit line adds up) over a green and a magenta halo, and the whole thing flares on the beat
      for (const dz of [0.005, 0.01]) { const m2 = m.clone(); m2.position.z += dz; this.car.add(m2); }
      const hG = new THREE.Mesh(this.plane(w * 1.15, h * 0.7), this.backGlowG); hG.position.set(0, 0.42, 1.99); this.car.add(hG);
      const hM = new THREE.Mesh(this.plane(w * 1.1, h * 0.8), this.backGlowM); hM.position.set(0, h * 0.72, 1.985); this.car.add(hM);
      this.car.userData.halo = [hG, hM];
      const gl = new THREE.Mesh(this.plane(w * 0.7, w * 0.9), this.carGlow); gl.rotation.x = -Math.PI / 2; gl.position.set(0, 0.015, 0.2); this.car.add(gl); }
    sc.add(this.car);
    // THE ROBOT'S CAR, in 3D from the user's own pictures: its head-on view at the back and at the front of the pod, and its SIDE view on both flanks (mirrored on the far one). Each picture is drawn once
    // for the paint and twice more additively so its neon is lit, with a pink halo round the whole pod.
    this.bot = new THREE.Group();
    { const A = RACE_ASSETS.ar, L2 = 3.8, hS = L2 / A.botSide, hP = hS, W = 3.0, Y = 0.22;      /* the pod is a solid body: 3.8 m long, 3.0 m wide, 1.7 m tall (the head-on pictures are squeezed a little to that width) */
      const piece = (geo, mat2, glow, pos, rotY, mirror) => {
        const g2 = new THREE.Group(), m = new THREE.Mesh(geo, mat2); g2.add(m);
        for (const dz of [0.012, 0.024]) { const lit = new THREE.Mesh(geo, glow); lit.position.z = dz; g2.add(lit); }
        g2.position.set(pos[0], pos[1], pos[2]); g2.rotation.y = rotY; if (mirror) g2.scale.x = -1; this.bot.add(g2); return g2;
      };
      const back = this.plane(W * 0.82, hP), side = this.plane(L2, hS);
      piece(back, this.botMat, this.botGlowMat, [0, Y + hP / 2, L2 / 2 - 0.1], 0, false);                                   // the tail, facing the player behind
      // THE NOSE IS POINTED (the user's ask): the head-on picture is split down the middle and its two halves are swept back from a tip on the axis, like the prow of a ship, so that from above the front of the
      // car is a V and not a flat face. Each half keeps its own half of the picture (the left half on the left, the right half on the right), still lit.
      const SWEEP = 1.7, WN = W * 0.82, tipZ = -L2 / 2 - SWEEP + 0.1, cornerZ = -L2 / 2 + 0.1, len = Math.hypot(WN / 2, SWEEP), ang = Math.atan2(SWEEP, WN / 2);
      const half = (u0, u1) => { const g3 = new THREE.PlaneGeometry(len, hP), uv = g3.attributes.uv; for (let k = 0; k < uv.count; k++) uv.setX(k, u0 + uv.getX(k) * (u1 - u0)); uv.needsUpdate = true; return g3; };
      const prow = (sx, u0, u1) => { const g3 = half(u0, u1), g2 = new THREE.Group(); g2.add(new THREE.Mesh(g3, this.botMat));
        for (const dz of [0.012, 0.024]) { const lit = new THREE.Mesh(g3, this.botGlowMat); lit.position.z = dz; g2.add(lit); }
        g2.position.set(sx * WN / 4, Y + hP / 2, (tipZ + cornerZ) / 2); g2.rotation.y = -sx * ang; this.bot.add(g2); return g2; };
      prow(-1, 0, 0.5); prow(1, 0.5, 1);
      // THE ROUNDED BODY (the user: 'adapter les flancs avec le haut avec un look rendu ou bombe'): the flank picture, which holds the upper half of its side too, is no longer a flat plane with the roof leaned
      // against it. It is WRAPPED over a rounded shell: along the length the width swells in the middle and narrows to both ends (a barrel seen from above), across it the picture climbs a quarter ellipse from the
      // outer lower edge (its bottom) up to the middle of the roof (its top), where the twin from the other side meets it. The left is the picture as drawn, the right its mirror. The nose and tail pictures are
      // fitted to the narrower ends, and the nose is the pointed prow.
      const NU = 28, NV = 14, a0 = W / 2, endK = 0.82, wid = z => a0 * (endK + (1 - endK) * (1 - Math.pow(2 * z / L2, 2)));
      const shell = sx => { const pos = [], uv = [], idx = [];
        for (let i = 0; i <= NU; i++) { const u = i / NU, z = -L2 / 2 + 0.1 + u * (L2 - 0.2), a = wid(z);
          for (let j = 0; j <= NV; j++) { const v = j / NV, ph = v * Math.PI / 2; pos.push(sx * a * Math.cos(ph), Y + 0.03 + (hS - 0.03) * Math.sin(ph) * (0.9 + 0.1 * (1 - Math.pow(2 * z / L2, 2))), z); uv.push(u, v); } }
        for (let i = 0; i < NU; i++) for (let j = 0; j < NV; j++) { const k = i * (NV + 1) + j; idx.push(k, k + 1, k + NV + 1, k + 1, k + NV + 2, k + NV + 1); }
        const g3 = new THREE.BufferGeometry(); g3.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g3.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g3.setIndex(idx); g3.computeBoundingSphere(); return g3; };
      for (const sx of [-1, 1]) { const g3 = shell(sx), g2 = new THREE.Group(); g2.add(new THREE.Mesh(g3, this.botWrapMat));
        for (const k of [1.0, 1.0]) g2.add(new THREE.Mesh(g3, this.botWrapGlow)); this.bot.add(g2); }
      this.bot.userData.flanks = [];
      this.bot.add(this.botTop(W, L2, Y + hS, hS));                                                                          // the TOP, modelled to fill what the four pictures leave open
      const bh = new THREE.Mesh(this.plane(W * 1.3, hP * 1.6), this.botHalo); bh.position.set(0, Y + hP / 2, L2 / 2 - 0.15); this.bot.add(bh); this.bot.userData.halo = bh;
      const gl = new THREE.Mesh(this.plane(W * 1.1, L2 * 0.9), this.botGlow); gl.rotation.x = -Math.PI / 2; gl.position.y = 0.02; this.bot.add(gl);
      this.bot.userData.pic = this.bot; }
    sc.add(this.bot);
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
  // A SMOOTH, CRYSTALLISED LAYER over the whole race track (the user's ask): a glass sheet lying just over the road, made of a drawn texture of crystal facets (thin bright edges, cold tints), repeated along
  // the track, drawn additively so it only adds light; a second, slower copy over it makes the facets drift as the car goes by, like light moving over glass.
  buildCrystal() {
    const cv = document.createElement('canvas'); cv.width = cv.height = 512; const x = cv.getContext('2d');
    x.fillStyle = '#000'; x.fillRect(0, 0, 512, 512);
    const pts = []; for (let i = 0; i < 90; i++) pts.push([((i * 97) % 512 + (i % 7) * 23) % 512, ((i * 211) % 512 + (i % 5) * 37) % 512]);
    x.lineWidth = 1.2; x.lineCap = 'round';
    for (let i = 0; i < pts.length; i++) {                                                                                     // every point joined to its nearest neighbours: a web of facet edges
      const d = pts.map((q, k) => [((q[0] - pts[i][0]) ** 2 + (q[1] - pts[i][1]) ** 2), k]).sort((a, b) => a[0] - b[0]).slice(1, 4);
      for (const [dist, k] of d) { const a2 = 1 - Math.min(1, Math.sqrt(dist) / 150); if (a2 <= 0) continue;
        const gr = x.createLinearGradient(pts[i][0], pts[i][1], pts[k][0], pts[k][1]);
        gr.addColorStop(0, 'rgba(120,220,255,' + (0.5 * a2).toFixed(3) + ')'); gr.addColorStop(0.5, 'rgba(255,255,255,' + (0.7 * a2).toFixed(3) + ')'); gr.addColorStop(1, 'rgba(180,120,255,' + (0.5 * a2).toFixed(3) + ')');
        x.strokeStyle = gr; x.beginPath(); x.moveTo(pts[i][0], pts[i][1]); x.lineTo(pts[k][0], pts[k][1]); x.stroke(); }
    }
    for (const [px, py] of pts) { const gr = x.createRadialGradient(px, py, 0, px, py, 9); gr.addColorStop(0, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.beginPath(); x.arc(px, py, 9, 0, 7); x.fill(); }
    const tex = new THREE.CanvasTexture(cv); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(2, 60); tex.colorSpace = THREE.SRGBColorSpace;
    const tex2 = tex.clone(); tex2.needsUpdate = true; tex2.wrapS = tex2.wrapT = THREE.RepeatWrapping; tex2.repeat.set(1.3, 34);
    const g = new THREE.Group(), LEN = RACE.LEN + 400, W = 3 * RACE.LANE_M + 3.0;
    const sheet = (t2, y, op) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(W, LEN), new THREE.MeshBasicMaterial({ map: t2, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false }));
      m.rotation.x = -Math.PI / 2; m.position.set(0, y, -LEN / 2 + 200); g.add(m); return m; };
    this.crys = [sheet(tex, 0.035, 0.34), sheet(tex2, 0.05, 0.2)];
    return g;
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
  // the TOP of the robot's car, modelled to close the pod between its four pictures: a shallow dark shell in the colours of the drawings (near-black blue), with the magenta cells of the flanks glowing on it,
  // a green rim line all round and a thin cyan line down the middle.
  botTop() {
    // the roof is now ENTIRELY the user's own picture: the circled upper parts of the two flanks lean in and meet over the middle (see the flanks in the constructor). Nothing modelled is left on top.
    return new THREE.Group();
  }



  // a droid: a black glossy powerful body (huge shoulders), green glowing chest core, cyan fists, green shoes, a small yellow face light; faces +z (towards the car); legs and arms swing on pivots
  // THE DROID is the user's own picture (the black android with its green core and its cyan fists), standing on the road and facing the car, with an additive copy over it so its lights are lit and a green glow at its feet.
  buildDroid() {
    const g = new THREE.Group(), h = 3.6, w = h * RACE_ASSETS.ar.droid;
    const m = new THREE.Mesh(this.plane(w, h), this.droidMat); m.position.y = h / 2; g.add(m);
    for (const dz of [0.01, 0.02]) { const lit = new THREE.Mesh(this.plane(w, h), this.droidGlowMat); lit.position.z = dz; m.add(lit); }        // the droid's neon LIT: the picture added over itself twice
    const back = new THREE.Mesh(this.plane(w * 2.0, h * 0.95), this.droidGlow); back.position.set(0, h * 0.52, -0.05); g.add(back);              // a green halo behind it
    const gl = new THREE.Mesh(this.plane(w * 2.4, w * 1.8), this.droidGlow); gl.rotation.x = -Math.PI / 2; gl.position.y = 0.02; g.add(gl);
    g.userData.halo = [back, gl];
    g.userData.legs = []; g.userData.arms = []; g.userData.pic = m;
    return g;
  }

  buildRare() { const g = new THREE.Group(); g.add(Kit.mesh(Kit.merge([Kit.ico(0.42, 0, 1.2, 0, '#ffd24a', { glow: true, sy: 1.4 }), Kit.ico(0.2, 0, 1.2, 0, '#ffffff', { glow: true, sy: 1.4 }), Kit.cyl(0.55, 0.55, 0.05, 0, 0.8, 0, '#ff4fd8', { glow: true, seg: 10 })]))); return g; }
  // a ramp, from the user's picture: glossy black, a wavy base edged with pink light, green chevrons on the slope, red streaks down one side and blue ones down the other, white highlights
  // the ramp: the user's picture laid as it is on the road (a plane lying flat, 9.4 m long), with a pink glow under it and two lines of light along its sides; the car takes off when it drives over it
  // the ramp: the user's picture laid on the slope as it is (30 degrees, 11 m), with a frame of light round it (pink at the foot, red and blue up the sides, white at the lip) so the black shape reads against the black road
  buildRamp() {
    const g = new THREE.Group(), M = RACE.LANE_M, W = M * 1.1, L = 11, A = 0.34, H = L * Math.sin(A), D = L * Math.cos(A), z0 = 1.2, zc = z0 - D / 2;
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
      else if (it.type === 'droid') { const run = it.run ? 1 : 0; m.position.set(x, run * Math.abs(Math.sin(t * 13 + i)) * 0.16, z); m.rotation.z = Math.sin(t * (run ? 13 : 3) + i) * (run ? 0.06 : 0.02); m.userData.pic.scale.set(1 + run * 0.04 * Math.sin(t * 13 + i), 1 - run * 0.04 * Math.sin(t * 13 + i), 1); for (const h2 of m.userData.halo) h2.scale.setScalar(0.85 + 0.3 * pulse + 0.15 * run); }
      else if (it.type === 'rare') { m.position.set(x, 0.15 * Math.sin(t * 3 + i), z); m.rotation.y = t * 2.4; }
      else { m.position.set(x, 0, z); if (m.userData.pic) m.userData.pic.scale.setScalar(1 + 0.03 * Math.sin(t * 4 + i) + 0.07 * pulse); }
    });
    // the cars
    this.crys[0].material.map.offset.y = -p.s * 0.004; this.crys[1].material.map.offset.y = -p.s * 0.0022; this.crys[0].material.opacity = 0.3 + 0.22 * pulse; this.crys[1].material.opacity = 0.16 + 0.16 * pulse;
    this.track.position.y = 0.04 * pulse; this.track.scale.set(1 + 0.004 * pulse, 1, 1);                                                                   // the whole track breathes on the kick
    Kit.materials().glow.color.setScalar(1 - 0.16 * (1 - pulse));                                                                                            // every neon light of the race (lines, posts, cars) pulses with the music
    this.car.position.set(p.x, 0.02 + air * 2.6 + 0.05 * pulse, -p.s); this.car.rotation.set(-air * 0.12 * (p.air / RACE.JUMP_T > 0.5 ? 1 : -1), -(p.lane * M - p.x) * 0.05, (p.lane * M - p.x) * 0.03); this.car.userData.pic.scale.set(1, 1 + 0.03 * pulse, 1); for (const h2 of this.car.userData.halo) h2.scale.setScalar(0.9 + 0.25 * pulse);
    const gap = R.bot.s - p.s;                                                                               // the robot is drawn where it really is (it never slows down when the player does); far ahead it is simply drawn bigger, so it stays easy to see
    const far = Math.max(0, gap - 30); this.bot.position.set(R.bot.x, 0.06 + 0.07 * Math.sin(t * 4) + 0.05 * pulse, -R.bot.s);           // the same height as the player's car, in the lane it is really in (it can be run into from behind) this.bot.userData.pic.rotation.z = Math.sin(t * 1.6) * 0.05 + 0.03 * pulse; this.bot.userData.halo.scale.setScalar(0.85 + 0.3 * pulse); this.bot.userData.pic.lookAt(this.camera.position.x, this.bot.position.y + 1.1, this.camera.position.z); this.bot.scale.setScalar(1 + Math.min(far, 140) / 130);
    const f = 62 + Math.min(14, p.speed - RACE.BASE) * 0.9 + (p.hitT > 0 ? -4 : 0); if (Math.abs(this.camera.fov - f) > 0.05) { this.camera.fov += (f - this.camera.fov) * 0.1; this.camera.updateProjectionMatrix(); }
    const cx = p.x * 0.55, cz = -p.s + 8.2; this.camPos.set(cx, 3.5 + air * 1.4, cz); this.camera.position.lerp(this.camPos, 0.5); this.camera.position.z = cz; this.camera.lookAt(p.x * 0.4, 1.3 + air * 0.8, -p.s - 12);
    renderer.render(this.scene, this.camera);
  }
}
