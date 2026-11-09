// KART3D: the KART CIRCUIT of the Galerie Gasperi (2026-11-09, the user: "qu'il soit enfermé du haut comme un centre commercial, un circuit rond 360° et grand, pas d'asphalte;
// petite voiture de karting; très grand ~1,5 km"). A ring of radius KART.R (240 m: 1.5 km a lap, two laps) inside a huge round shopping centre: a tiled floor (no asphalt), a low
// barrier on each side, the café fronts and terraces of the Terrasse Gasperi all round the outside, a garden of trees and planters in the middle, a glass dome over everything.
// The RULES are the race zone's (src/race.js, with this.len = two laps); the items are Race3D's own meshes, placed by Race3D.placeItems on its straight track and then carried onto
// the ring here: a point (x across, s along) of the straight track is ring(s, x) = centre + (R + x) (cos a, 0, -sin a), a = s / R (the karts turn LEFT round a centre at x = -R).
class Kart3D {
  constructor(race3d) {
    const R = KART.R, sc = this.scene = new THREE.Scene(); this.r3 = race3d;
    sc.background = new THREE.Color('#1a1a2a'); sc.fog = new THREE.Fog('#2a2436', 120, 520);
    sc.add(new THREE.HemisphereLight('#fff0d8', '#4a3a40', 1.9)); const d = new THREE.DirectionalLight('#ffe2b8', 1.1); d.position.set(30, 80, 20); sc.add(d);
    this.camera = new THREE.PerspectiveCamera(64, 16 / 9, 0.2, 1400);
    this.C = new THREE.Vector3(-R, 0, 0);
    const P = ENV3D.terrace.props, cvTex = (w, h, f, rep) => { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; f(cv.getContext('2d')); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; if (rep) t.repeat.set(rep[0], rep[1]); t.anisotropy = 4; return t; };
    // THE FLOOR: the track in big cream and terracotta tiles (no asphalt), the mall round it in pale stone, the garden in the middle
    const tiles = cvTex(128, 128, x => { x.fillStyle = '#07090a'; x.fillRect(0, 0, 128, 128); x.fillStyle = '#2bff6a'; x.fillRect(2, 2, 60, 60); x.fillRect(66, 66, 60, 60); x.fillStyle = '#9dffbf'; x.fillRect(2, 2, 60, 3); x.fillRect(66, 66, 60, 3); x.strokeStyle = '#000'; x.lineWidth = 4; x.strokeRect(0, 0, 128, 128);}, [Math.round(2 * Math.PI * R / 4), 3]);
    const ring = (r0, r1, mat, y, seg) => { const g = new THREE.RingGeometry(r0, r1, seg || 720, 1); const m = new THREE.Mesh(g, mat); m.rotation.x = -Math.PI / 2; m.position.set(-R, y || 0, 0); sc.add(m); return m; };
    { const g = new THREE.RingGeometry(R - 6.5, R + 6.5, 720, 1), uv = g.attributes.uv, pos = g.attributes.position;          // the track's uv: u along the ring, v across
      for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), y = pos.getY(i), a = Math.atan2(y, x), r = Math.hypot(x, y); uv.setXY(i, (a < 0 ? a + 2 * Math.PI : a) / (2 * Math.PI), (r - (R - 6.5)) / 13); }
      const m = new THREE.Mesh(g, new THREE.MeshPhongMaterial({ map: tiles, emissiveMap: tiles, emissive: 0xffffff, emissiveIntensity: 0.35, specular: 0x8899aa, shininess: 90 }));      /* neon-green and glossy black tiles (the user: 'carreau vert néon comme celui du droid, et noir un peu brillant') */ m.rotation.x = -Math.PI / 2; m.position.set(-R, 0.01, 0); sc.add(m); }
    ring(R + 6.5, R + 60, new THREE.MeshLambertMaterial({ color: '#d8d2c6' }), 0);                                              // the walk of the mall, pale stone
    ring(0, R - 6.5, new THREE.MeshLambertMaterial({ color: '#5a7a46' }), 0, 360);                                                   // the garden
    for (const r of [R - 1.2, R + 1.2]) ring(r - 0.06, r + 0.06, new THREE.MeshBasicMaterial({ color: '#0a0c0b' }), 0.02);          // the lane lines
    // THE BARRIERS: a low wall on each side with a warm light strip
    for (const [r, s] of [[R - 6.8, 1], [R + 6.8, -1]]) {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.7, 720, 1, true), new THREE.MeshLambertMaterial({ color: '#3a2b22', side: THREE.DoubleSide })); w.position.set(-R, 0.35, 0); sc.add(w);
      const l = new THREE.Mesh(new THREE.CylinderGeometry(r + s * 0.05, r + s * 0.05, 0.08, 720, 1, true), new THREE.MeshBasicMaterial({ color: '#ffd27a', side: THREE.DoubleSide })); l.position.set(-R, 0.62, 0); sc.add(l); }
    // THE SHOPS all round the outside (the café fronts and terraces of the Terrasse Gasperi, the road side toward the track), THE GARDEN inside (trees in benches, planters)
    const inst = (merged, mats) => { const m = Kit.materials(); for (const [geo, mat] of [[merged.lit, m.lit], [merged.glow, m.glow]]) { if (!geo) continue; const im = new THREE.InstancedMesh(geo, mat, mats.length); mats.forEach((M, i) => im.setMatrixAt(i, M)); sc.add(im); } };
    const at = (a, r, faceIn, y) => { const q = new THREE.Matrix4(), p = new THREE.Vector3(-R + r * Math.cos(a), y || 0, -r * Math.sin(a)); q.makeRotationY(a + (faceIn ? 0 : Math.PI)); q.setPosition(p); return q; };      // local -x toward the centre (faceIn) or away
    const N = 150, cafes = [], terr = [], plant = [], trees = [], plantIn = [];
    for (let k = 0; k < N; k++) { const a = (k + 0.5) / N * 2 * Math.PI; (k % 3 === 2 ? plant : cafes).push(at(a, R + 21, true)); if (k % 3 !== 2) terr.push(at(a, R + 12, true)); else plant.push(at(a + 0.004, R + 9, true)); }
    for (let k = 0; k < 110; k++) { const a = (k + 0.25) / 110 * 2 * Math.PI; (k % 2 ? plantIn : trees).push(at(a, R - 11, false)); }
    inst(P.cafeFront(), cafes); inst(P.terrace(), terr); inst(P.bigPlanter(), plant); inst(P.treeRing(), trees); inst(P.bigPlanter(), plantIn);
    { const tr = []; for (let k = 0; k < 160; k++) { const a = k * 2.399, r = 20 + Math.sqrt(k / 160) * (R - 40); tr.push(at(a, r, false)); } inst(P.treeRing(), tr); }       // the garden: trees all over
    // THE GLASS DOME: ribs from the outer wall to a ring at the top, and a pale glass shell
    { const H = 46, RR = R + 64, shell = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 16, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#9fb8d8', transparent: true, opacity: 0.18, side: THREE.BackSide, depthWrite: false, fog: false }));
      shell.scale.set(RR, H, RR); shell.position.copy(this.C); sc.add(shell);
      const ribs = []; for (let k = 0; k < 48; k++) { const a = k / 48 * 2 * Math.PI; for (let j = 0; j < 12; j++) { const u0 = j / 12, u1 = (j + 1) / 12, p0 = [Math.sin(u0 * Math.PI / 2) * RR, Math.cos(u0 * Math.PI / 2) * H], p1 = [Math.sin(u1 * Math.PI / 2) * RR, Math.cos(u1 * Math.PI / 2) * H];
        const len = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]); ribs.push(Kit.box(0.5, len, 0.5, 0, 0, 0, '#2a2a34', {})); const b = ribs[ribs.length - 1].geo;
        const m = new THREE.Matrix4().makeRotationZ(Math.atan2(p1[1] - p0[1], p1[0] - p0[0]) - Math.PI / 2); m.premultiply(new THREE.Matrix4().makeTranslation((p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2 - len / 2 * 0, 0)); m.premultiply(new THREE.Matrix4().makeRotationY(a)); m.premultiply(new THREE.Matrix4().makeTranslation(-R, 0, 0)); b.applyMatrix4(m); } }
      sc.add(Kit.mesh(Kit.merge(ribs)));
      const wall = new THREE.Mesh(new THREE.CylinderGeometry(RR, RR, 1.2, 180, 1, true), new THREE.MeshLambertMaterial({ color: '#3a2b22', side: THREE.DoubleSide })); wall.position.set(-R, 0.6, 0); sc.add(wall);
      for (let k = 0; k < 3; k++) { const fr = new THREE.Mesh(new THREE.TorusGeometry(RR * Math.sin((0.35 + k * 0.2) * Math.PI / 2), 0.12, 4, 240), new THREE.MeshBasicMaterial({ color: '#ffd27a', fog: false })); fr.rotation.x = Math.PI / 2; fr.position.set(-R, Math.cos((0.35 + k * 0.2) * Math.PI / 2) * H - 0.3, 0); sc.add(fr); } }   // festoons round the dome
    // THE KARTS: a small open kart (the player's blue and pink, the robot's red), a driver's helmet
    const kart = (body, helm) => { const g = new THREE.Group(); g.add(Kit.mesh(Kit.merge([
      Kit.box(1.3, 0.22, 2.2, 0, 0.12, 0, body), Kit.box(1.0, 0.3, 0.6, 0, 0.3, -0.9, body), Kit.box(0.9, 0.12, 0.4, 0, 0.55, 1.05, '#20202a'), Kit.box(0.5, 0.4, 0.5, 0, 0.34, 0.3, '#18181e'),
      Kit.ico(0.32, 0, 0.92, 0.3, helm), Kit.box(0.5, 0.12, 0.08, 0, 0.92, 0.0, '#101018'),
      ...[[-0.72, -0.75], [0.72, -0.75], [-0.75, 0.75], [0.75, 0.75]].map(([x, z]) => Kit.cyl(0.24, 0.24, 0.26, x, 0.11, z, '#0c0c10', { rz: Math.PI / 2, seg: 10 })),
      Kit.box(1.1, 0.06, 0.06, 0, 0.45, 1.25, '#ff2a3a', { glow: true }), Kit.box(0.9, 0.05, 0.05, 0, 0.36, -1.22, '#ffd27a', { glow: true })]))); return g; };
    // THE PLAYER'S KART: the user's concept sheet (2026-11-09: front / rear / side / top views): a carbon-blue nose cone and side pods with neon edges (pink on top, green below, blue on
    // the nose sides, orange across the front and rear bumpers), a black bucket seat, a steering wheel, the engine behind the seat with violet and green lights, wide black tyres with a
    // blue rim; Zagla at the wheel (the user's picture of her driving it), her own 3D body, seated (legs forward)
    const CARB = '#1a2446', CARB2 = '#22305a', PINK = '#ff3fd0', BLUE = '#3a6bff', GREEN = '#2bff6a', ORANGE = '#ff8a2a', TYRE = '#0b0b10';
    const pk = [
      Kit.box(1.25, 0.08, 2.5, 0, 0.1, 0, '#101420'),                                                        // the chassis floor
      Kit.box(0.55, 0.22, 1.1, 0, 0.16, -0.75, CARB, { rx: -0.18 }), Kit.box(0.42, 0.2, 0.7, 0, 0.42, -0.3, CARB2, { rx: -0.35 }),      // the nose cone rising to the wheel
      Kit.box(1.35, 0.14, 0.32, 0, 0.12, -1.28, CARB),                                                      // the front bumper
      Kit.box(0.5, 0.04, 0.05, 0, 0.2, -1.45, ORANGE, { glow: true }), Kit.box(0.45, 0.04, 0.05, -0.55, 0.14, -1.43, GREEN, { glow: true, ry: 0.25 }), Kit.box(0.45, 0.04, 0.05, 0.55, 0.14, -1.43, GREEN, { glow: true, ry: -0.25 }),
      ...[-1, 1].flatMap(sx => [
        Kit.box(0.04, 0.04, 1.05, sx * 0.29, 0.38, -0.72, PINK, { glow: true, rx: -0.18 }),                   // the nose's neon edges
        Kit.box(0.04, 0.04, 0.5, sx * 0.6, 0.24, -1.2, BLUE, { glow: true, ry: sx * 0.5 }),
        Kit.box(0.26, 0.3, 1.0, sx * 0.62, 0.12, 0.25, CARB),                                                 // the side pod
        Kit.box(0.04, 0.035, 0.95, sx * 0.62, 0.43, 0.25, PINK, { glow: true }), Kit.box(0.05, 0.035, 0.95, sx * 0.76, 0.14, 0.25, GREEN, { glow: true }),
        Kit.box(0.05, 0.035, 0.18, sx * 0.76, 0.3, 0.58, GREEN, { glow: true, rx: 0.5 }),
        Kit.cyl(0.27, 0.27, 0.3, sx * 0.72, 0.27 - 0.15, -0.95, TYRE, { rz: Math.PI / 2, seg: 14 }), Kit.cyl(0.11, 0.11, 0.04, sx * 0.88, 0.27 - 0.02, -0.95, BLUE, { rz: Math.PI / 2, seg: 12, glow: true }),
        Kit.cyl(0.3, 0.3, 0.38, sx * 0.76, 0.3 - 0.19, 0.95, TYRE, { rz: Math.PI / 2, seg: 14 }), Kit.cyl(0.12, 0.12, 0.04, sx * 0.96, 0.3 - 0.02, 0.95, BLUE, { rz: Math.PI / 2, seg: 12, glow: true }),
      ]),
      Kit.box(0.55, 0.12, 0.5, 0, 0.18, 0.35, '#0e0e14'), Kit.box(0.55, 0.62, 0.1, 0, 0.25, 0.62, '#0e0e14', { rx: 0.25 }),          // the bucket seat
      Kit.cyl(0.03, 0.03, 0.45, 0, 0.42, -0.2, '#2a2a34', { rx: 0.9, seg: 5 }), Kit.cyl(0.17, 0.17, 0.035, 0, 0.72, -0.05, '#14141a', { rx: 0.9, seg: 12 }),     // the steering column and wheel
      Kit.box(0.55, 0.38, 0.42, 0, 0.2, 0.95, '#5a5e6a'), Kit.box(0.5, 0.1, 0.36, 0, 0.58, 0.95, '#3a3e4a'),              // the engine
      Kit.box(0.04, 0.3, 0.04, -0.12, 0.62, 0.95, '#b040ff', { glow: true }), Kit.box(0.04, 0.3, 0.04, 0.12, 0.62, 0.95, '#b040ff', { glow: true }), Kit.box(0.4, 0.04, 0.04, 0, 0.66, 1.12, GREEN, { glow: true }),
      Kit.box(1.2, 0.06, 0.06, 0, 0.2, 1.32, ORANGE, { glow: true }), Kit.box(0.6, 0.05, 0.05, 0, 0.12, 1.33, GREEN, { glow: true }),      // the rear bumper, lit (and brake light below)
    ];
    this.car = new THREE.Group();
    if (typeof KART_ART !== 'undefined') {                                                            // the user's sheet AS IT IS (2026-11-09: 'telle qu'elle, ne change rien dans les images'): its four views as cut-out cards round the kart
      const A = KART_ART, L = 2.6, W = 1.37, tex = u => { const img = new Image(), t = new THREE.Texture(img); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; img.onload = () => { t.needsUpdate = true; }; img.src = u; return t; };
      const mat = u => new THREE.MeshBasicMaterial({ map: tex(u), alphaTest: 0.4, side: THREE.DoubleSide });
      const card = (u, w, h, x, y, z, ry, rx) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat(u)); m.position.set(x, y, z); m.rotation.set(rx || 0, ry || 0, 0, 'YXZ'); this.car.add(m); return m; };
      const hr = W / A.ar_rear, hf = W / A.ar_front, hs = L / A.ar_side;
      card(A.rear, W, hr, 0, hr / 2, L / 2); card(A.front, W, hf, 0, hf / 2, -L / 2, Math.PI);
      for (const sx of [-1, 1]) card(A.side, L, hs, sx * W * 0.42, hs / 2, 0, -Math.PI / 2);
      card(A.top, L * A.ar_top * 0 + W * 1.0, L, 0, 0.32, 0, 0, -Math.PI / 2);
    } else this.car.add(Kit.mesh(Kit.merge(pk)));
    if (typeof RunnerZagla !== 'undefined' && typeof ZAGLA_ASSETS !== 'undefined') {                    // Zagla at the wheel: her body on the seat, her legs forward to the pedals
      const z = new RunnerZagla(), d = z.group, k = 0.62; d.scale.setScalar(k); d.position.set(0, 0.28 - 0.95 * k * 0, 0.42); z.pivot.position.y = -0.5; z.legs.forEach(l => { l.rotation.x = -1.45; }); this.driver = z; this.car.add(d); }
    this.bot = kart('#c8243a', '#ffffff'); sc.add(this.car, this.bot);
    this.holders = null; this.bound = null; this.camPos = new THREE.Vector3(); this.v = new THREE.Vector3();
  }
  ringPos(s, x, y, out) { const a = s / KART.R, r = KART.R + x; return (out || new THREE.Vector3()).set(-KART.R + r * Math.cos(a), y, -r * Math.sin(a)); }
  bind(R) {                                                                                          // Race3D builds the item meshes; each goes into a holder that stands on the ring
    if (this.r3.bound !== R) this.r3.bind(R);
    if (this.holders) for (const h of this.holders) this.scene.remove(h);
    this.holders = this.r3.meshes.map(m => { const h = new THREE.Group(); h.add(m); this.scene.add(h); return h; }); this.bound = R;
  }
  draw(g, renderer) {
    const R = g.race; if (this.bound !== R) this.bind(R);
    const bt = g.sfx ? g.sfx.beat() : null, pulse = bt ? bt.pulse * (0.45 + 0.55 * bt.energy) : 0, t = g.time, p = R.p, air = p.air > 0 ? Math.sin(Math.PI * (1 - p.air / RACE.JUMP_T)) : 0;
    this.r3.placeItems(R, t, pulse);
    this.r3.meshes.forEach((m, i) => { const h = this.holders[i]; h.visible = m.visible; if (!m.visible) return; const s = -m.position.z; this.ringPos(s, m.position.x, 0, h.position); h.rotation.y = s / KART.R; m.position.set(0, m.position.y, 0); });
    const put = (o, s, x, y, yaw) => { this.ringPos(s, x, y, o.position); o.rotation.set(0, s / KART.R + (yaw || 0), 0); };
    put(this.car, p.s, p.x, 0.02 + air * 2.2, -(p.lane * RACE.LANE_M - p.x) * 0.04); put(this.bot, R.bot.s, R.bot.x, 0.02);
    const f = 64 + Math.min(14, p.speed - RACE.BASE) * 0.9; if (Math.abs(this.camera.fov - f) > 0.05) { this.camera.fov += (f - this.camera.fov) * 0.1; this.camera.updateProjectionMatrix(); }
    this.ringPos(p.s - 4.6, p.x * 0.6, 2.1 + air, this.camPos); if (this.camera.position.distanceTo(this.camPos) > 6) this.camera.position.copy(this.camPos); else this.camera.position.lerp(this.camPos, 0.5);
    this.camera.lookAt(this.ringPos(p.s + 12, p.x * 0.4, 0.9 + air * 0.6, this.v));
    renderer.render(this.scene, this.camera);
  }
}
