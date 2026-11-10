// KART3D: the KART CIRCUIT of the Galerie Gasperi (2026-11-09, the user: "qu'il soit enfermé du haut comme un centre commercial, un circuit rond 360° et grand, pas d'asphalte;
// petite voiture de karting; très grand ~1,5 km"). A ring of radius KART.R (240 m: 1.5 km a lap, two laps) inside a huge round shopping centre: a tiled floor (no asphalt), a low
// barrier on each side, the café fronts and terraces of the Terrasse Gasperi all round the outside, a garden of trees and planters in the middle, a glass dome over everything.
// The RULES are the race zone's (src/race.js, with this.len = two laps); the items are Race3D's own meshes, placed by Race3D.placeItems on its straight track and then carried onto
// the ring here: a point (x across, s along) of the straight track is ring(s, x) = centre + (R + x) (cos a, 0, -sin a), a = s / R (the karts turn LEFT round a centre at x = -R).
class Kart3D {
  constructor(race3d) {
    const R = KART.R, sc = this.scene = new THREE.Scene(); this.r3 = race3d;
    sc.background = new THREE.Color('#05060f'); sc.fog = new THREE.Fog('#2a2436', 120, 520);
    sc.add(new THREE.HemisphereLight('#fff0d8', '#4a3a40', 1.9)); const d = new THREE.DirectionalLight('#ffe2b8', 1.1); d.position.set(30, 80, 20); sc.add(d);
    this.camera = new THREE.PerspectiveCamera(64, 16 / 9, 0.2, 1400);
    this.C = new THREE.Vector3(-R, 0, 0);
    const P = ENV3D.terrace.props, cvTex = (w, h, f, rep) => { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; f(cv.getContext('2d')); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; if (rep) t.repeat.set(rep[0], rep[1]); t.anisotropy = 4; return t; };
    // THE FLOOR: the track in big cream and terracotta tiles (no asphalt), the mall round it in pale stone, the garden in the middle
    const tiles = cvTex(128, 128, x => { x.fillStyle = '#07090a'; x.fillRect(0, 0, 128, 128); x.fillStyle = '#39ff14'; x.fillRect(2, 2, 60, 60); x.fillRect(66, 66, 60, 60); x.fillStyle = '#b8ff9a'; x.fillRect(2, 2, 60, 3); x.fillRect(66, 66, 60, 3); x.strokeStyle = '#000'; x.lineWidth = 4; x.strokeRect(0, 0, 128, 128);}, [Math.round(2 * Math.PI * R / 4), 3]);
    const ring = (r0, r1, mat, y, seg) => { const g = new THREE.RingGeometry(r0, r1, seg || 720, 1); const m = new THREE.Mesh(g, mat); m.rotation.x = -Math.PI / 2; m.position.set(-R, y || 0, 0); sc.add(m); return m; };
    { const g = new THREE.RingGeometry(R - 6.5, R + 6.5, 720, 1), uv = g.attributes.uv, pos = g.attributes.position;          // the track's uv: u along the ring, v across
      for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), y = pos.getY(i), a = Math.atan2(y, x), r = Math.hypot(x, y); uv.setXY(i, (a < 0 ? a + 2 * Math.PI : a) / (2 * Math.PI), (r - (R - 6.5)) / 13); }
      const m = new THREE.Mesh(g, new THREE.MeshPhongMaterial({ map: tiles, emissiveMap: tiles, emissive: 0xffffff, emissiveIntensity: 0.35, specular: 0x8899aa, shininess: 90 })); this.floorMat = m.material;      /* neon-green and glossy black tiles (the user: 'carreau vert néon comme celui du droid, et noir un peu brillant') */ m.rotation.x = -Math.PI / 2; m.position.set(-R, 0.01, 0); sc.add(m); }
    ring(R + 6.5, R + 60, new THREE.MeshLambertMaterial({ color: '#d8d2c6' }), 0);                                              // the walk of the mall, pale stone
    { let gm = new THREE.MeshLambertMaterial({ color: '#5a7a46' });                                       // the garden: the user's spiral picture over the whole disc, out to the track's inner edge (was a lawn)
      if (typeof KART_ART !== 'undefined' && KART_ART.garden) { const img = new Image(), t = new THREE.Texture(img); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; img.onload = () => { t.needsUpdate = true; }; img.src = KART_ART.garden; gm = new THREE.MeshBasicMaterial({ map: t }); }
      ring(0, R - 6.5, gm, 0, 360); }                                                   // the garden
    for (const r of [R - 1.2, R + 1.2]) ring(r - 0.06, r + 0.06, new THREE.MeshBasicMaterial({ color: '#0a0c0b' }), 0.02);          // the lane lines
    // THE BARRIERS: a low wall on each side with a warm light strip
    for (const [r, s] of [[R - 6.8, 1], [R + 6.8, -1]]) {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 1.5, 720, 1, true), new THREE.MeshLambertMaterial({ color: '#3a2b22', side: THREE.DoubleSide })); w.position.set(-R, 0.75, 0); sc.add(w);
      const l = new THREE.Mesh(new THREE.CylinderGeometry(r + s * 0.05, r + s * 0.05, 0.08, 720, 1, true), new THREE.MeshBasicMaterial({ color: '#ffd27a', side: THREE.DoubleSide })); l.position.set(-R, 1.46, 0); sc.add(l); }
    // THE SHOPS all round the outside (the café fronts and terraces of the Terrasse Gasperi, the road side toward the track), THE GARDEN inside (trees in benches, planters)
    const inst = (merged, mats) => { const m = Kit.materials(); for (const [geo, mat] of [[merged.lit, m.lit], [merged.glow, m.glow]]) { if (!geo) continue; const im = new THREE.InstancedMesh(geo, mat, mats.length); mats.forEach((M, i) => im.setMatrixAt(i, M)); sc.add(im); } };
    const at = (a, r, faceIn, y) => { const q = new THREE.Matrix4(), p = new THREE.Vector3(-R + r * Math.cos(a), y || 0, -r * Math.sin(a)); q.makeRotationY(a + (faceIn ? 0 : Math.PI)); q.setPosition(p); return q; };      // local -x toward the centre (faceIn) or away
    const N = 150, cafes = [], terr = [], plant = [], trees = [], plantIn = [];
    for (let k = 0; k < N; k++) { const a = (k + 0.5) / N * 2 * Math.PI; (k % 3 === 2 ? plant : cafes).push(at(a, R + 21, true)); if (k % 3 !== 2) terr.push(at(a, R + 12, true)); else plant.push(at(a + 0.004, R + 9, true)); }
    for (let k = 0; k < 110; k++) { const a = (k + 0.25) / 110 * 2 * Math.PI; (k % 2 ? plantIn : trees).push(at(a, R - 11, false)); }
    inst(P.cafeFront(), cafes); inst(P.terrace(), terr); inst(P.bigPlanter(), plant); inst(P.treeRing(), trees); inst(P.bigPlanter(), plantIn);
    { const tr = []; for (let k = 0; k < 160; k++) { const a = k * 2.399, r = 95 + Math.sqrt(k / 160) * (R - 115); tr.push(at(a, r, false)); } inst(P.treeRing(), tr); }       // the garden: trees all over
    // THE CENTRE (the user's picture, 2026-11-09: a purple glass sphere): a big card always turned to the camera, standing in the middle of the garden
    if (typeof KART_ART !== 'undefined' && KART_ART.centre) { const img = new Image(), t = new THREE.Texture(img); t.colorSpace = THREE.SRGBColorSpace; img.onload = () => { t.needsUpdate = true; }; img.src = KART_ART.centre;
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, fog: false })); sp.scale.set(150, 150, 1); sp.position.set(-R, 40, 0);      /* Saturn: its equator in the plane of the ring of the ventilation, in the open top of the dome */ sc.add(sp); this.centre = sp;
      // ITS NEONS LIT (the user: 'allumer les néons de la sphère'): the picture added over itself (its bright green, cyan and pink rims glow, the dark glass stays dark) and a halo round it, both breathing with the music
      const lit = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, opacity: 0.85 })); lit.scale.set(151, 151, 1); lit.position.copy(sp.position); sc.add(lit);
      const cv = document.createElement('canvas'); cv.width = cv.height = 256; const x = cv.getContext('2d'), gr = x.createRadialGradient(128, 128, 70, 128, 128, 128); gr.addColorStop(0, 'rgba(200,60,255,0)'); gr.addColorStop(0.45, 'rgba(200,60,255,0.55)'); gr.addColorStop(0.7, 'rgba(60,255,140,0.25)'); gr.addColorStop(1, 'rgba(60,255,140,0)'); x.fillStyle = gr; x.fillRect(0, 0, 256, 256);
      const ht = new THREE.CanvasTexture(cv); ht.colorSpace = THREE.SRGBColorSpace; const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: ht, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
      halo.scale.set(230, 230, 1); halo.position.copy(sp.position); sc.add(halo); this.centreLit = [lit, halo]; }
    // THE VENTILATION (the user's picture, 2026-11-09): laid flat on the top of the dome, a lid that makes the shopping centre a flying saucer; seen from below as the ceiling's centre
    if (typeof KART_ART !== 'undefined' && KART_ART.vent) { const img = new Image(), t = new THREE.Texture(img); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; img.onload = () => { t.needsUpdate = true; }; img.src = KART_ART.vent;
      const v = new THREE.Mesh(new THREE.PlaneGeometry(300, 300), new THREE.MeshBasicMaterial({ map: t, alphaTest: 0.4, side: THREE.DoubleSide, fog: false })); v.rotation.x = -Math.PI / 2; v.position.set(-R, 40, 0);      /* SATURN'S RINGS (the user: 'le système d'aération comme les anneaux de Saturne, la sphère Saturne; le vide entre les anneaux transparent'): 300 m across, its hole (0.31 of it, 93 m) wider than the sphere (75 m), the gaps see the starry sky */ sc.add(v); this.vent = v; }
    // THE NIGHT SKY over the open top: stars on a far half sphere
    { const n = 2500, pos = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const u = Math.random() * 2 * Math.PI, w = 0.05 + Math.random() * 0.95, r = 1100; pos[i * 3] = -R + r * Math.sqrt(1 - w * w) * Math.cos(u); pos[i * 3 + 1] = r * w; pos[i * 3 + 2] = r * Math.sqrt(1 - w * w) * Math.sin(u); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); sc.add(new THREE.Points(g, new THREE.PointsMaterial({ color: '#ffffff', size: 2.2, sizeAttenuation: false, fog: false }))); }
    // THE GLASS DOME: ribs from the outer wall to a ring at the top, and a pale glass shell
    { const H = 46, RR = R + 64, shell = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 16, 0, Math.PI * 2, Math.asin(150 / (R + 64)), Math.PI / 2 - Math.asin(150 / (R + 64)))      /* open at the top where the rings lie */, new THREE.MeshBasicMaterial({ color: '#9fb8d8', transparent: true, opacity: 0.18, side: THREE.BackSide, depthWrite: false, fog: false }));
      shell.scale.set(RR, H, RR); shell.position.copy(this.C); sc.add(shell);
      if (typeof KART_ART !== 'undefined' && KART_ART.ceiling) {                                  // THE CEILING (the user's picture: plum panels with a pink neon line), all round the inside of the dome instead of the glass and ribs
        // the PINK NEON LINES are painted INTO the ceiling (the user: 'the pink line must pass UNDER the big bars'): three thin lines at the heights of the old yellow rings, drawn only on the dark
        // panels, so where a light bar of the picture crosses them the bar stays on top. (Rows: the dome's v runs from its opening, polar angle asin(150 / RR), down to the equator.)
        const cv = document.createElement('canvas'), smat = new THREE.MeshBasicMaterial({ color: '#3a2a34', side: THREE.BackSide, fog: false });      /* (plain plum until the picture is painted)*/
        const img = new Image(); img.onload = () => { const W2 = img.width, H2 = img.height * 6; cv.width = W2; cv.height = H2; const x = cv.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(img, 0, 0, W2, H2);
          const D = x.getImageData(0, 0, W2, H2), d = D.data, th0 = Math.asin(150 / (R + 64)), thL = Math.PI / 2 - th0, pk = [255, 63, 180];
          for (let k = 0; k < 3; k++) { const row = ((0.35 + k * 0.2) * Math.PI / 2 - th0) / thL * H2;
            for (let y = Math.max(0, Math.floor(row - 9)); y <= Math.min(H2 - 1, Math.ceil(row + 9)); y++) { const dy = Math.abs(y - row), wgt = dy < 1.2 ? 1 : 0.35 * Math.exp(-Math.pow((dy - 1.2) / 3, 2));
              for (let xx = 0; xx < W2; xx++) { const o = (y * W2 + xx) * 4, lum = 0.3 * d[o] + 0.59 * d[o + 1] + 0.11 * d[o + 2], under = Math.max(0, Math.min(1, (150 - lum) / 40)), w2 = wgt * under;      // (light bar: the line goes under it)
                for (let c = 0; c < 3; c++) d[o + c] = d[o + c] * (1 - w2) + pk[c] * w2; } } }
          x.putImageData(D, 0, 0); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; t.repeat.set(36, 1); t.anisotropy = 8; smat.map = t; smat.color.set('#ffffff'); smat.needsUpdate = true; }; img.src = KART_ART.ceiling;
        shell.material = smat; this.ceilMat = smat; this.noRibs = true; }
      const ribs = []; for (let k = 0; k < 48; k++) { const a = k / 48 * 2 * Math.PI; for (let j = 0; j < 12; j++) { const u0 = j / 12, u1 = (j + 1) / 12, p0 = [Math.sin(u0 * Math.PI / 2) * RR, Math.cos(u0 * Math.PI / 2) * H], p1 = [Math.sin(u1 * Math.PI / 2) * RR, Math.cos(u1 * Math.PI / 2) * H];
        const len = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]); ribs.push(Kit.box(0.5, len, 0.5, 0, 0, 0, '#2a2a34', {})); const b = ribs[ribs.length - 1].geo;
        const m = new THREE.Matrix4().makeRotationZ(Math.atan2(p1[1] - p0[1], p1[0] - p0[0]) - Math.PI / 2); m.premultiply(new THREE.Matrix4().makeTranslation((p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2 - len / 2 * 0, 0)); m.premultiply(new THREE.Matrix4().makeRotationY(a)); m.premultiply(new THREE.Matrix4().makeTranslation(-R, 0, 0)); b.applyMatrix4(m); } }
      if (!this.noRibs) sc.add(Kit.mesh(Kit.merge(ribs)));
      const wall = new THREE.Mesh(new THREE.CylinderGeometry(RR, RR, 1.2, 180, 1, true), new THREE.MeshLambertMaterial({ color: '#3a2b22', side: THREE.DoubleSide })); wall.position.set(-R, 0.6, 0); sc.add(wall);
      if (!this.noRibs) for (let k = 0; k < 3; k++) { const fr = new THREE.Mesh(new THREE.TorusGeometry(0.95 * RR * Math.sin((0.35 + k * 0.2) * Math.PI / 2), 0.06, 8, 720), new THREE.MeshBasicMaterial({ color: '#ff3fb4', fog: false }));      /* the PINK NEON rings (the user: the pink bars of the ceiling moved here, in place of the yellow lines) */
        const gl = new THREE.Mesh(new THREE.TorusGeometry(0.95 * RR * Math.sin((0.35 + k * 0.2) * Math.PI / 2), 0.22, 8, 720), new THREE.MeshBasicMaterial({ color: '#ff3fb4', transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })); fr.add(gl); fr.rotation.x = Math.PI / 2; fr.position.set(-R, 0.95 * Math.cos((0.35 + k * 0.2) * Math.PI / 2) * H, 0)      /* (5 % inside the dome: under its big bars, never through them) */; sc.add(fr); } }   // festoons round the dome
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
    this.bot = kart('#c8243a', '#ffffff'); sc.add(this.car, this.bot); this.bot.visible = false;
    this.bots = ['#c8243a', '#ff8a2a', '#e8d020', '#2ad0ff', '#b040ff', '#ff3fa0', '#20e0a0', '#f0f0f0'].map((c, i) => { const k = kart(c, i % 2 ? '#101018' : '#ffffff'); sc.add(k); return k; });      // THE EIGHT ROBOT KARTS
    // THE ARROW BANDS (the user: 'bandes de flèches bleues, contour turquoise néon, animées vers l'avant, à droite du circuit, à chaque 40 m'): three chevrons flat on the floor near the right edge,
    // lit one after the other toward the front (a chase light), every 40 m round the ring
    // THE ARROW BANDS on the BELT of the circuit (the user, 2nd round: 'horizontales, adaptées à la ceinture du contour'): three blue chevrons with a turquoise rim on the inner face of the outer wall,
    // pointing forward, every 40 m, lit one after the other toward the front
    { const chev = k => { const sh = new THREE.Shape(); sh.moveTo(0.4 * k, 0.7 * k); sh.lineTo(-0.4 * k, 0); sh.lineTo(0.4 * k, -0.7 * k); sh.lineTo(0.78 * k, -0.7 * k); sh.lineTo(-0.02 * k, 0); sh.lineTo(0.78 * k, 0.7 * k); sh.closePath(); const g = new THREE.ShapeGeometry(sh); g.rotateY(-Math.PI / 2); return g; };   // the tip forward (-z), facing the track
      const fill = chev(1), rim = chev(1.2); rim.translate(0.01, 0, 0.03);
      const pair = (fc, ec) => [0, 1, 2].map(() => ({ fc: new THREE.Color(fc), ec: new THREE.Color(ec), f: new THREE.MeshBasicMaterial({ color: fc, fog: false, side: THREE.DoubleSide }), e: new THREE.MeshBasicMaterial({ color: ec, fog: false, side: THREE.DoubleSide }) }));
      this.arrowMats = pair('#1a4cff', '#35f0ff').concat(pair('#ff1a2a', '#ff8a1a'));      // blue with a turquoise rim on the outer wall; RED with an ORANGE rim on the inner wall, facing them (the user)
      this.chev = chev;
      for (const side of [1, -1]) for (let s0 = 20; s0 < KART.LAP; s0 += 40) for (let k = 0; k < 3; k++) { const h = new THREE.Group(), m = this.arrowMats[k + (side < 0 ? 3 : 0)], e = new THREE.Mesh(rim, m.e), f = new THREE.Mesh(fill, m.f); f.position.x = -0.02;
        h.add(e, f); const s1 = s0 + k * 3.2; this.ringPos(s1, side * 6.72, 0.72, h.position); h.rotation.y = s1 / R; h.scale.set(side, 0.85, 2.6);      /* (stretched along the track: seen from the kart the wall is at a grazing angle) */ sc.add(h); } }
    this.holders = null; this.bound = null; this.camPos = new THREE.Vector3(); this.v = new THREE.Vector3();
  }
  ringPos(s, x, y, out) { const a = s / KART.R, r = KART.R + x; return (out || new THREE.Vector3()).set(-KART.R + r * Math.cos(a), y, -r * Math.sin(a)); }
  bind(R) {                                                                                          // Race3D builds the item meshes; each goes into a holder that stands on the ring
    if (this.r3.bound !== R) this.r3.bind(R);
    if (this.holders) for (const h of this.holders) this.scene.remove(h);
    const COL = ['#ff2a3a', '#c050ff', '#50ff30', '#d8ff20'], smoke = new THREE.MeshBasicMaterial({ color: '#0c1014', transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false });
    this.holders = this.r3.meshes.map((m, i) => { const it = R.items[i], h = new THREE.Group();
      if (it.type === 'spiral') {                                                                    // THE SPEED TOKENS shaped like the blue arrow bands (three chevrons with a rim, lit one after the other toward the front), in their own neon colours
        const col = new THREE.Color(COL[it.color]), rimC = col.clone().lerp(new THREE.Color('#ffffff'), 0.45), mk = k => { const sh = new THREE.Shape(); sh.moveTo(-0.7 * k, -0.35 * k); sh.lineTo(0, 0.45 * k); sh.lineTo(0.7 * k, -0.35 * k); sh.lineTo(0.7 * k, -0.75 * k); sh.lineTo(0, 0.05 * k); sh.lineTo(-0.7 * k, -0.75 * k); sh.closePath(); const g = new THREE.ShapeGeometry(sh); g.rotateX(-Math.PI / 2); return g; };
        const fill = mk(1), rim = mk(1.22); rim.translate(0, -0.005, 0.02); h.userData.chev = [];
        for (let k = 0; k < 3; k++) { const fm = new THREE.MeshBasicMaterial({ color: col, fog: false }), em = new THREE.MeshBasicMaterial({ color: rimC, fog: false }), gm = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
          const g3 = new THREE.Group(), glow = new THREE.Mesh(mk(1.6), gm); glow.position.y = -0.01; const f = new THREE.Mesh(fill, fm); f.position.y = 0.012; g3.add(glow, new THREE.Mesh(rim, em), f); g3.position.z = -k * 1.25; g3.scale.setScalar(1.6); h.add(g3); h.userData.chev.push({ fm, em, gm, col, rimC }); }
        h.userData.flat = true;
      } else { if (it.type === 'ramp') m.traverse(o => { if (o.isMesh) o.material = smoke; }); h.add(m); }      // the ramps in smoked black glass
      this.scene.add(h); return h; }); this.bound = R;
  }
  draw(g, renderer) {
    const R = g.race; if (this.bound !== R) this.bind(R);
    const bt = g.sfx ? g.sfx.beat() : null, pulse = bt ? bt.pulse * (0.45 + 0.55 * bt.energy) : 0, t = g.time, p = R.p, air = p.air > 0 ? Math.sin(Math.PI * (1 - p.air / RACE.JUMP_T)) : 0;
    this.r3.placeItems(R, t, pulse);
    // THE CIRCUIT DANCES TO 'ROAD NIGHT 2' (135.7 BPM, src3d/music_beats_kart.js): the tiles flash on every kick (harder on the bar's downbeat), the arrows step one chevron per eighth note
    // toward the front, the ceiling brightens with the loudness (dim in the breakdowns), Saturn's rings turn faster when the track is full
    const dtk = this._kt === undefined ? 0 : Math.min(0.1, Math.max(0, t - this._kt)); this._kt = t;
    const B = bt || { beat: t * 2.262, pulse: 0, energy: 0.6, kick: 0.5 }, en = Math.max(0, Math.min(1, B.energy)), kk = Math.max(0, Math.min(1, B.kick)), down = Math.floor(B.beat) % 4 === 0 ? 1.5 : 1;
    if (this.floorMat) this.floorMat.emissiveIntensity = 0.16 + 0.14 * en + 0.5 * B.pulse * kk * down;
    if (this.ceilMat && this.ceilMat.map) this.ceilMat.color.setScalar(0.62 + 0.3 * en + 0.12 * B.pulse);
    if (this.vent) this.vent.rotation.z += dtk * (0.02 + 0.22 * en);
    const step = Math.floor(B.beat * 2), sub = B.beat * 2 - step;
    this.arrowStep = { step, sub };
    if (this.arrowMats) this.arrowMats.forEach((m, k) => { const lit = step % 3 === k % 3, b = lit ? 0.55 + 0.45 * (1 - sub) : 0.22; m.f.color.copy(m.fc).multiplyScalar(0.3 + 0.7 * b); m.e.color.copy(m.ec).multiplyScalar(0.4 + 0.6 * b); });
    if (this.centreLit) { this.centreLit[0].material.opacity = 0.7 + 0.3 * pulse + 0.1 * Math.sin(t * 2.2); const k = 1 + 0.05 * pulse; this.centreLit[1].scale.set(230 * k, 230 * k, 1); this.centreLit[1].material.opacity = 0.75 + 0.25 * pulse; }
    this.r3.meshes.forEach((m, i) => { const h = this.holders[i]; h.visible = m.visible; if (!m.visible) return; const s = -m.position.z; this.ringPos(s, m.position.x, h.userData.flat ? 0.1 : 0, h.position); h.rotation.y = s / KART.R; if (h.userData.flat) { h.userData.chev.forEach((c, k) => { const st = this.arrowStep || { step: 0, sub: 0 }, w = st.step % 3 === k ? 1 - st.sub : 0, b = 0.45 + 0.55 * w + 0.2 * pulse; c.fm.color.copy(c.col).multiplyScalar(b); c.em.color.copy(c.rimC).multiplyScalar(0.5 + 0.5 * b); c.gm.opacity = 0.2 + 0.4 * w * w; }); return; } m.position.set(0, m.position.y, 0); });
    const put = (o, s, x, y, yaw) => { this.ringPos(s, x, y, o.position); o.rotation.set(0, s / KART.R + (yaw || 0), 0); };
    put(this.car, p.s, p.x, 0.02 + air * 2.2, -(p.lane * RACE.LANE_M - p.x) * 0.04); if (R.bots) R.bots.forEach((b, i) => put(this.bots[i], b.s, b.x, 0.02)); else { this.bot.visible = true; put(this.bot, R.bot.s, R.bot.x, 0.02); }
    const f = 64 + Math.min(14, p.speed - RACE.BASE) * 0.9; if (Math.abs(this.camera.fov - f) > 0.05) { this.camera.fov += (f - this.camera.fov) * 0.1; this.camera.updateProjectionMatrix(); }
    if (g.kartCam) {                                                                                   // THE SATURN VIEW (optional, V or a tap on the bars): outside the track, a little behind and above the kart, looking at it across the
      this.ringPos(p.s - 10, p.x * 0.6 + 2.4, 3.0 + air, this.camPos);      /* (the user: the same view, only moved back 3 m, not turned) */                                                 // track toward the centre, so the sphere in its rings stands whole behind the kart
      if (this.camera.position.distanceTo(this.camPos) > 6) this.camera.position.copy(this.camPos); else this.camera.position.lerp(this.camPos, 0.5);
      this.camera.lookAt(this.ringPos(p.s + 9, p.x * 0.5 - 7, 1.6, this.v));
    } else {
    this.ringPos(p.s - 4.6, p.x * 0.6, 2.1 + air, this.camPos); if (this.camera.position.distanceTo(this.camPos) > 6) this.camera.position.copy(this.camPos); else this.camera.position.lerp(this.camPos, 0.5);
    this.camera.lookAt(this.ringPos(p.s + 12, p.x * 0.4, 0.9 + air * 0.6, this.v));
    }
    const X = g.r && g.r.xr && g.r.xr.presenting ? g.r.xr : null;                                  // VR: the headset looks from a rig at the chase pose (behind the kart, heading along the ring); no pitch, no roll
    if (X) { if (!this.rig) { this.rig = new THREE.Group(); this.scene.add(this.rig); } if (this.camera.parent !== this.rig) this.rig.add(this.camera);
      this.camera.position.set(0, 0, 0); this.camera.rotation.set(0, 0, 0); this.ringPos(p.s - 4.6, p.x * 0.6, 0.6, this.rig.position); this.rig.rotation.set(0, p.s / KART.R, 0); }
    else if (this.rig && this.camera.parent === this.rig) { this.rig.remove(this.camera); this.scene.add(this.camera); }
    renderer.render(this.scene, this.camera);
  }
}
