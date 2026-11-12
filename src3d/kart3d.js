// KART3D: the KART CIRCUIT of the Calagtic (2026-11-09, the user: "qu'il soit enfermé du haut comme un centre commercial, un circuit rond 360° et grand, pas d'asphalte;
// petite voiture de karting; très grand ~1,5 km"). A ring of radius KART.R (240 m: 1.5 km a lap, two laps) inside a huge round shopping centre: a tiled floor (no asphalt), a low
// barrier on each side, the café fronts and terraces of the Terrasse Gasperi all round the outside, a garden of trees and planters in the middle, a glass dome over everything.
// The RULES are the race zone's (src/race.js, with this.len = two laps); the items are Race3D's own meshes, placed by Race3D.placeItems on its straight track and then carried onto
// the ring here: a point (x across, s along) of the straight track is ring(s, x) = centre + (R + x) (cos a, 0, -sin a), a = s / R (the karts turn LEFT round a centre at x = -R).
class Kart3D {
  static get HALL() { return true; }      // the 3D ship hall instead of the painted arch and floor
  static get WELD_FLOOR() { return false; }      // the user's floor picture (KART_ART.weldFloor) under the hall: removed for now, its settings kept to reuse later
  constructor(race3d) {
    const R = KART.R, sc = this.scene = new THREE.Scene(); this.r3 = race3d;
    sc.background = new THREE.Color('#05060f');      /* THE 360 ROOM (the user's panorama of the ship's hexagon hall, once, as a 360 picture): underground it is the whole surround - the walls on every side, true in VR since a 360 picture is drawn at infinity and follows the head without distortion */
    if (typeof KART_ART !== 'undefined' && KART_ART.vrPano) { const img = new Image(), t = new THREE.Texture(img); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; img.onload = () => { t.needsUpdate = true; }; img.src = KART_ART.vrPano;
      const sky = new THREE.Mesh(new THREE.SphereGeometry(1200, 96, 48), new THREE.MeshBasicMaterial({ map: t, side: THREE.BackSide, depthTest: false, depthWrite: false, fog: false })); sky.renderOrder = -1000; sky.frustumCulled = false; sky.visible = false;      /* (a sphere drawn first and behind everything, always centred on the eye - each eye in VR - so it reads as infinitely far: no distortion when the head turns) */
      sky.onBeforeRender = (r, s2, cam) => { sky.matrixWorld.makeTranslation(cam.matrixWorld.elements[12], cam.matrixWorld.elements[13], cam.matrixWorld.elements[14]); }; sky.matrixAutoUpdate = false; sc.add(sky); this.vrSky = sky; }
    sc.add(new THREE.HemisphereLight('#fff0d8', '#4a3a40', 1.9)); const d = new THREE.DirectionalLight('#ffe2b8', 1.1); d.position.set(30, 80, 20); sc.add(d);
    this.camera = new THREE.PerspectiveCamera(64, 16 / 9, 0.2, 1400);
    this.C = new THREE.Vector3(-R, 0, 0);
    const P = ENV3D.terrace.props, cvTex = (w, h, f, rep) => { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; f(cv.getContext('2d')); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; if (rep) t.repeat.set(rep[0], rep[1]); t.anisotropy = 4; return t; };
    // THE FLOOR: the track in big cream and terracotta tiles (no asphalt), the mall round it in pale stone, the garden in the middle
    // the tiles change with the lap (the user: lap 1 neon green, lap 2 transparent neon ORANGE, lap 3 transparent neon RED): the coloured squares are see-through onto a glowing under-floor
    const tcv = document.createElement('canvas'); tcv.width = tcv.height = 128; const tiles = new THREE.CanvasTexture(tcv); tiles.colorSpace = THREE.SRGBColorSpace; tiles.wrapS = tiles.wrapT = THREE.RepeatWrapping; tiles.repeat.set(Math.round(2 * Math.PI * R / 4), 3); tiles.anisotropy = 4;
    this.LAPCOL = [['#39ff14', '#b8ff9a', 1], ['#ff7a10', '#ffc080', 0.62], ['#ff1830', '#ff9aa4', 0.62], ['#39ff14', '#b8ff9a', 1]];
    // the tile texture is a MASK (grey squares, white top edge, black between): the colour comes from the shader below, so a lap change can sweep across the track
    { const x = tcv.getContext('2d'); x.fillStyle = '#07090a'; x.fillRect(0, 0, 128, 128); x.fillStyle = '#cccccc'; x.fillRect(2, 2, 60, 60); x.fillRect(66, 66, 60, 60); x.fillStyle = '#ffffff'; x.fillRect(2, 2, 60, 3); x.fillRect(66, 66, 60, 3); x.strokeStyle = '#000'; x.lineWidth = 4; x.strokeRect(0, 0, 128, 128); tiles.needsUpdate = true; }
    // THE COLOUR CHANGE AS AN EQUALIZER (the user: 'le passage comme un égaliseur, ligne par ligne'): at each lap line the new colour runs ahead along the track from the line, one 2 m row of tiles
    // at a time, with a jagged front: each of the six columns of squares across the track is a bar whose length follows the music (src3d/music_beats_kart.js), like the bars of an equalizer
    this.tileU = { uOld: { value: new THREE.Color(this.LAPCOL[0][0]) }, uNew: { value: new THREE.Color(this.LAPCOL[0][0]) }, uAOld: { value: 1 }, uANew: { value: 1 }, uFront: { value: 1e9 }, uLapLen: { value: KART.LAP }, uRep: { value: tiles.repeat }, uBar: { value: [0, 0, 0, 0, 0, 0] } };
    this.tileLap = 0; this.tileT0 = 0;
    this.paintTiles = (lap, t) => { const c = this.LAPCOL[Math.min(lap, this.LAPCOL.length - 1)], U = this.tileU; U.uOld.value.copy(U.uNew.value); U.uAOld.value = U.uANew.value; U.uNew.value.set(c[0]); U.uANew.value = c[2]; U.uFront.value = 0; this.tileT0 = t; this.tileLap = lap;
      };
    const ring = (r0, r1, mat, y, seg) => { const g = new THREE.RingGeometry(r0, r1, seg || 720, 1); const m = new THREE.Mesh(g, mat); m.rotation.x = -Math.PI / 2; m.position.set(-R, y || 0, 0); sc.add(m); return m; };
    { const g = new THREE.RingGeometry(R - 6.5, R + 6.5, 720, 1), uv = g.attributes.uv, pos = g.attributes.position;          // the track's uv: u along the ring, v across
      for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), y = pos.getY(i), a = Math.atan2(y, x), r = Math.hypot(x, y); uv.setXY(i, (a < 0 ? a + 2 * Math.PI : a) / (2 * Math.PI), (r - (R - 6.5)) / 13); }
      const m = new THREE.Mesh(g, new THREE.MeshPhongMaterial({ map: tiles, emissiveMap: tiles, emissive: 0xffffff, emissiveIntensity: 0.35, specular: 0x8899aa, shininess: 90, transparent: true })); this.floorMat = m.material; this.banked = [m];
      m.material.onBeforeCompile = sh => { Object.assign(sh.uniforms, this.tileU);
        sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 uOld; uniform vec3 uNew; uniform float uAOld; uniform float uANew; uniform float uFront; uniform float uLapLen; uniform vec2 uRep; uniform float uBar[6];')
          .replace('#include <map_fragment>', '#include <map_fragment>\nfloat sq = step(0.3, sampledDiffuseColor.r); float uu = vMapUv.x / uRep.x, vv = vMapUv.y / uRep.y; float rowS = floor(fract(uu) * uLapLen / 2.0) * 2.0; int jc = int(clamp(floor(fract(vv) * 6.0), 0.0, 5.0));\nfloat isNew = step(rowS + uBar[jc], uFront); vec3 tcol = mix(uOld, uNew, isNew) * sampledDiffuseColor.r * 1.2; diffuseColor.rgb = mix(diffuseColor.rgb, tcol, sq); diffuseColor.a = mix(1.0, mix(uAOld, uANew, isNew), sq);')
          .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance = mix(totalEmissiveRadiance, totalEmissiveRadiance * mix(uOld, uNew, isNew) * 1.2, sq);'); };      /* neon-green and glossy black tiles (the user: 'carreau vert néon comme celui du droid, et noir un peu brillant') */ m.rotation.x = -Math.PI / 2; m.position.set(-R, 0.01, 0); sc.add(m); }
    ring(R + 6.5, R + 60, new THREE.MeshLambertMaterial({ color: '#d8d2c6' }), 0);                                              // the walk of the mall, pale stone
    { let gm = new THREE.MeshLambertMaterial({ color: '#5a7a46' });                                       // the garden: the user's spiral picture over the whole disc, out to the track's inner edge (was a lawn)
      if (typeof KART_ART !== 'undefined' && KART_ART.garden) { const img = new Image(), t = new THREE.Texture(img); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; img.onload = () => { t.needsUpdate = true; }; img.src = KART_ART.garden; gm = new THREE.MeshBasicMaterial({ map: t }); }
      gm.side = THREE.DoubleSide; ring(0, R - 6.5, gm, 0, 360); }      // (both sides: seen from the banked track, below its level, the garden must still hide the tunnel underneath)                                                   // the garden
    for (const r of [R - 1.2, R + 1.2]) this.banked.push(ring(r - 0.06, r + 0.06, new THREE.MeshBasicMaterial({ color: '#0a0c0b' }), 0.02));          // the lane lines
    this.under = ring(R - 7, R + 7, new THREE.MeshBasicMaterial({ color: '#000' }), -2 * KART.BANK - 0.6); this.under.material.color.set('#ffffff');
    // the under-floor glow follows the SAME equalizer wave as the tiles (it showed through the see-through orange tiles and turned red at once at the start of lap 3: the user)
    this.under.material.onBeforeCompile = sh => { Object.assign(sh.uniforms, this.tileU, { uR: { value: R } });
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWp;').replace('#include <project_vertex>', '#include <project_vertex>\nvWp = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWp; uniform vec3 uOld; uniform vec3 uNew; uniform float uFront; uniform float uLapLen; uniform float uBar[6]; uniform float uR;')
        .replace('#include <color_fragment>', '#include <color_fragment>\nfloat ang = atan(-vWp.z, vWp.x + uR); if (ang < 0.0) ang += 6.2831853; float rr = length(vec2(vWp.x + uR, vWp.z)); int jc = int(clamp(floor((rr - (uR - 6.5)) / 13.0 * 6.0), 0.0, 5.0));\nfloat rowS = floor(ang * uR / 2.0) * 2.0; float isNew = step(rowS + uBar[jc], uFront); diffuseColor.rgb *= mix(uOld, uNew, isNew) * 0.35;'); };                         // the glowing floor under the see-through tiles
    for (const m of this.banked) { const P = m.geometry.attributes.position; m.userData.r = Float32Array.from({ length: P.count }, (_, i) => Math.hypot(P.getX(i), P.getY(i))); }
    this.bank = 0; this.setBank = b => { if (Math.abs(b - this.bank) < 1e-3) return; this.bank = b;                                              // THE BANKING (lap 2: the left, inner side of the track goes down)
      for (const m of this.banked) { const P = m.geometry.attributes.position, r = m.userData.r; for (let i = 0; i < P.count; i++) P.setZ(i, this.bankY(r[i] - R)); P.needsUpdate = true; m.geometry.computeBoundingSphere(); }
      if (this.innerSide) this.innerSide.position.y = -KART.BANK * b; };
    // THE BARRIERS: a low wall on each side with a warm light strip
    this.innerSide = new THREE.Group(); sc.add(this.innerSide); this.gateStuff = []; this.gapFill = [];      // (the gate and its road and tunnel show only at the end of lap 3 and in lap 4; otherwise the wall is closed)
    { const r = R - 7.0, gap = KART.GATE_W / r, sk = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 4.2, 720, 1, true, Math.PI / 2 + gap / 2, 2 * Math.PI - gap), new THREE.MeshBasicMaterial({ color: '#160f12', side: THREE.DoubleSide }));      // the inner bank's skirt: a fixed wall under the
      sk.position.set(-R, -2.1, 0); sc.add(sk); const f = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 4.2, 12, 1, true, Math.PI / 2 - gap / 2, gap), sk.material); f.position.copy(sk.position); sc.add(f); this.gapFill.push(f); }                                                                                                                       // garden's edge, so the lowered track never looks under the garden (the tunnel)
    for (const [r, s] of [[R - 6.8, 1], [R + 6.8, -1]]) { const par = s > 0 ? this.innerSide : sc;
      const gap = s > 0 ? KART.GATE_W / r : 0, w = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 1.5, 720, 1, true, Math.PI / 2 + gap / 2, 2 * Math.PI - gap), new THREE.MeshLambertMaterial({ color: '#3a2b22', side: THREE.DoubleSide })); w.position.set(-R, 0.75, 0); par.add(w); if (gap) { const f = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 1.5, 12, 1, true, Math.PI / 2 - gap / 2, gap), w.material); f.position.copy(w.position); par.add(f); this.gapFill.push(f); }
      const l = new THREE.Mesh(new THREE.CylinderGeometry(r + s * 0.05, r + s * 0.05, 0.08, 720, 1, true, Math.PI / 2 + gap / 2, 2 * Math.PI - gap), new THREE.MeshBasicMaterial({ color: '#ffd27a', side: THREE.DoubleSide })); l.position.set(-R, 1.46, 0); par.add(l); if (gap) { const f = new THREE.Mesh(new THREE.CylinderGeometry(r + s * 0.05, r + s * 0.05, 0.08, 12, 1, true, Math.PI / 2 - gap / 2, gap), l.material); f.position.copy(l.position); par.add(f); this.gapFill.push(f); } }
    // THE SHOPS all round the outside (the café fronts and terraces of the Terrasse Gasperi, the road side toward the track), THE GARDEN inside (trees in benches, planters)
    const inst = (merged, mats) => { const m = Kit.materials(); for (const [geo, mat] of [[merged.lit, m.lit], [merged.glow, m.glow]]) { if (!geo) continue; const im = new THREE.InstancedMesh(geo, mat, mats.length); mats.forEach((M, i) => im.setMatrixAt(i, M)); sc.add(im); } };
    const at = (a, r, faceIn, y) => { const q = new THREE.Matrix4(), p = new THREE.Vector3(-R + r * Math.cos(a), y || 0, -r * Math.sin(a)); q.makeRotationY(a + (faceIn ? 0 : Math.PI)); q.setPosition(p); return q; };      // local -x toward the centre (faceIn) or away
    const N = 150, cafes = [], terr = [], plant = [], trees = [], plantIn = [];
    for (let k = 0; k < N; k++) { const a = (k + 0.5) / N * 2 * Math.PI; (k % 3 === 2 ? plant : cafes).push(at(a, R + 21, true)); if (k % 3 !== 2) terr.push(at(a, R + 12, true)); else plant.push(at(a + 0.004, R + 9, true)); }
    for (let k = 0; k < 110; k++) { const a = (k + 0.25) / 110 * 2 * Math.PI; (k % 2 ? plantIn : trees).push(at(a, R - 30, false)); }
    inst(P.cafeFront(), cafes); inst(P.terrace(), terr); inst(P.bigPlanter(), plant); inst(P.treeRing(), trees); inst(P.bigPlanter(), plantIn);
    { const tr = []; for (let k = 0; k < 160; k++) { const a = k * 2.399, r = 95 + Math.sqrt(k / 160) * (R - 135); tr.push(at(a, r, false)); } inst(P.treeRing(), tr); }       // the garden: trees all over
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
    this.bots = ['#c8243a', '#ff8a2a', '#e8d020', '#2ad0ff', '#b040ff', '#ff3fa0', '#20e0a0', '#f0f0f0', '#3a50ff', '#9aff30', '#ff5050', '#40ffd8', '#c080ff', '#ffb0d0'].map((c, i) => { const k = kart(c, i % 2 ? '#101018' : '#ffffff'); sc.add(k); return k; });      // THE EIGHT ROBOT KARTS
    // THE ARROW BANDS (the user: 'bandes de flèches bleues, contour turquoise néon, animées vers l'avant, à droite du circuit, à chaque 40 m'): three chevrons flat on the floor near the right edge,
    // lit one after the other toward the front (a chase light), every 40 m round the ring
    // THE ARROW BANDS on the BELT of the circuit (the user, 2nd round: 'horizontales, adaptées à la ceinture du contour'): three blue chevrons with a turquoise rim on the inner face of the outer wall,
    // pointing forward, every 40 m, lit one after the other toward the front
    { const chev = k => { const sh = new THREE.Shape(); sh.moveTo(0.4 * k, 0.7 * k); sh.lineTo(-0.4 * k, 0); sh.lineTo(0.4 * k, -0.7 * k); sh.lineTo(0.78 * k, -0.7 * k); sh.lineTo(-0.02 * k, 0); sh.lineTo(0.78 * k, 0.7 * k); sh.closePath(); const g = new THREE.ShapeGeometry(sh); g.rotateY(-Math.PI / 2); return g; };   // the tip forward (-z), facing the track
      const fill = chev(1), rim = chev(1.2); rim.translate(0.01, 0, 0.03);
      const pair = (fc, ec) => [0, 1, 2].map(() => ({ fc: new THREE.Color(fc), ec: new THREE.Color(ec), f: new THREE.MeshBasicMaterial({ color: fc, fog: false, side: THREE.DoubleSide }), e: new THREE.MeshBasicMaterial({ color: ec, fog: false, side: THREE.DoubleSide }) }));
      this.arrowMats = pair('#1a4cff', '#35f0ff').concat(pair('#ff1a2a', '#ff8a1a'));      // blue with a turquoise rim on the outer wall; RED with an ORANGE rim on the inner wall, facing them (the user)
      this.chev = chev;
      for (const side of [1, -1]) for (let s0 = 20; s0 < KART.LAP; s0 += 40) for (let k = 0; k < 3; k++) { if (side < 0 && Math.min((s0 + k * 3.2) % KART.LAP, KART.LAP - (s0 + k * 3.2) % KART.LAP) < KART.GATE_W) continue; const h = new THREE.Group(), m = this.arrowMats[k + (side < 0 ? 3 : 0)], e = new THREE.Mesh(rim, m.e), f = new THREE.Mesh(fill, m.f); f.position.x = -0.02;
        h.add(e, f); const s1 = s0 + k * 3.2; this.ringPos(s1, side * 6.72, 0.72, h.position); h.rotation.y = s1 / R; h.scale.set(side, 0.85, 2.6);      /* (stretched along the track: seen from the kart the wall is at a grazing angle) */ (side < 0 ? this.innerSide : sc).add(h); } }
    // THE FINISH LINE (s = 0): a chequered band across the track
    if (false) { const cv = document.createElement('canvas'); cv.width = 208; cv.height = 24;      /* (the chequered band removed: the user) */ const x = cv.getContext('2d'); for (let i = 0; i < 26; i++) for (let j = 0; j < 3; j++) { x.fillStyle = (i + j) % 2 ? '#111' : '#f4f4f4'; x.fillRect(i * 8, j * 8, 8, 8); }
      const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; const m = new THREE.Mesh(new THREE.PlaneGeometry(13, 1.5), new THREE.MeshBasicMaterial({ map: t, fog: false })); m.rotation.x = -Math.PI / 2; m.position.set(0, 0.05, 0); sc.add(m); }
    // THE GATE beside the line, in the inner (left) wall (the user: 'une entrée permanente côté gauche qui mène à la route qui encercle le rond-point; elle ne s'ouvre que si on arrive PREMIER à la fin
    // du 3e tour'): two neon pillars, a beam, two doors of dark glass that slide apart when Race.gateOpen; behind it a short lane to an INNER RING ROAD round the garden
    { const G = new THREE.Group(), W = KART.GATE_W, pil = new THREE.MeshBasicMaterial({ color: '#b040ff', fog: false }), neon = new THREE.MeshBasicMaterial({ color: '#ff3fd0', fog: false });
      for (const z of [-W / 2 - 0.3, W / 2 + 0.3]) { const pm = new THREE.Mesh(new THREE.BoxGeometry(0.6, 3.6, 0.6), pil); pm.position.set(0, 1.8, z); G.add(pm); }
      const beam = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, W + 1.2), pil); beam.position.y = 3.6; G.add(beam); const nb = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.12, W + 1.2), neon); nb.position.y = 3.35; G.add(nb);
      const dm = new THREE.MeshPhongMaterial({ color: '#0a0f14', transparent: true, opacity: 0.85, specular: 0x8899aa, shininess: 80 }), dl = new THREE.MeshBasicMaterial({ color: '#39ff14', fog: false });
      this.doors = [-1, 1].map(sd => { const d = new THREE.Group(), pane = new THREE.Mesh(new THREE.BoxGeometry(0.15, 3.0, W / 2), dm), line = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.08, W / 2 - 0.3), dl), line2 = line.clone(); pane.position.y = 1.5; line.position.y = 2.6; line2.position.y = 0.6; d.add(pane, line, line2); d.userData.z0 = sd * W / 4; d.position.z = d.userData.z0; G.add(d); return d; });
      G.position.set(-6.8, 0, -1.5); G.rotation.y = -0.7; this.innerSide.add(G); this.gateStuff.push(G); this.gateK = 0;      /* (turned 40 degrees: the gate faces the karts coming down the detour lane, the user) */
      // THE ENTRANCE ROAD (the user: clear room in the roundabout for the entrance road and its lines, without touching the rest of the decor): an 8 m strip with pink edge lines that follows the
      // karts' path (the left lane, shifted by Race.off) from the track, through the gate, onto the inner ring road; the garden's trees and planters keep out of it (they stand at R - 30 and further in)
      { const off = q => { const v = Math.max(0, Math.min(1, (q - KART.TURN) / KART.TURN_L)); return KART.INNER * v * v * (3 - 2 * v); }, N2 = 40, pos = [], idx = [], lp = [], rp = [];
        for (let i = 0; i <= N2; i++) { const q = KART.TURN - 10 + i / N2 * (KART.TURN_L + 80), c = -2.4 + off(q) * (16 - 2.4) / 16 + (off(q) / KART.INNER) * 0; const cc = q > KART.TURN ? -2.4 + off(q) + 2.4 * (off(q) / KART.INNER) : -2.4;
          const dq = q < KART.GATE_S ? 0 : -KART.TD * (v => v * v * (3 - 2 * v))(Math.max(0, Math.min(1, (q - KART.GATE_S - 4) / KART.DIVE_L))), a = this.ringPos(q, cc - 4, 0.03 + dq), b = this.ringPos(q, cc + 4, 0.03 + dq); pos.push(a.x, a.y, a.z, b.x, b.y, b.z); lp.push(this.ringPos(q, cc - 3.9, 0.05 + dq)); rp.push(this.ringPos(q, cc + 3.9, 0.05 + dq)); this.tunPath = this.tunPath || []; this.tunPath.push(this.ringPos(q, cc, dq + 2));
          if (i) idx.push(2 * i - 2, 2 * i - 1, 2 * i, 2 * i - 1, 2 * i + 1, 2 * i); }
        const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
        const road = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: '#0b0d10', side: THREE.DoubleSide, fog: false })); road.position.z = 0; sc.add(road); this.gateStuff.push(road); this.entRoad = road;
        // THE SPIRAL TUNNEL (the user's picture): a tube from the mouth past the gate, down the dive and all round lap 4 under the inner ring road, its inside wearing the spiral, turning
        { const path = this.tunPath.filter(v => v.y < 1.2).concat(Array.from({ length: 360 }, (_, i) => this.ringPos(KART.GATE_S + KART.TURN_L + 80 + i / 359 * (KART.LAP - KART.TURN_L - 70), -16, -KART.TD + 2)));
          // the tunnel TIGHTENS (the user: 'serre le tunnel graduellement, finir en tunnel serré'): radius 6.2 m down to 4.2 m over the second half, and its colours turn from the original red and peach
          // into the PINK version (the user's choice, n° 7) through a spiral-shaped wipe in the middle (each point of the wall changes when the wipe's front, twisted round the tube, passes it)
          const SEG = 900, RAD = 24, curve = new THREE.CatmullRomCurve3(path), tg = new THREE.TubeGeometry(curve, SEG, 6.2, RAD, false), P = tg.attributes.position, fade = new Float32Array(P.count), sm = (a, b, v) => { v = Math.max(0, Math.min(1, (v - a) / (b - a))); return v * v * (3 - 2 * v); };
          for (let i2 = 0; i2 <= SEG; i2++) { const u = i2 / SEG, c = curve.getPointAt(u), k = 1 - (2 / 6.2) * sm(0.3, 0.85, u);
            for (let j2 = 0; j2 <= RAD; j2++) { const n = i2 * (RAD + 1) + j2; P.setXYZ(n, c.x + (P.getX(n) - c.x) * k, c.y + (P.getY(n) - c.y) * k, c.z + (P.getZ(n) - c.z) * k); fade[n] = u; } }
          tg.setAttribute('fade', new THREE.BufferAttribute(fade, 1)); tg.computeBoundingSphere();
          let tm = new THREE.MeshBasicMaterial({ color: '#c02020', side: THREE.BackSide, fog: false });
          if (typeof KART_ART !== 'undefined' && KART_ART.tunnel) { const img = new Image(), tA = new THREE.Texture(img), cv2 = document.createElement('canvas'), rep = new THREE.Vector2(Math.round(curve.getLength() / 14), 1);
            const prep = tt => { tt.colorSpace = THREE.SRGBColorSpace; tt.wrapS = tt.wrapT = THREE.RepeatWrapping; tt.anisotropy = 8; return tt; }; prep(tA);
            img.onload = () => { tA.needsUpdate = true; cv2.width = img.width; cv2.height = img.height; const x = cv2.getContext('2d'); x.filter = 'hue-rotate(320deg)'; x.drawImage(img, 0, 0); this.tunU.mapB.value = prep(new THREE.CanvasTexture(cv2)); };      /* (the pink texture made once the picture is in: a canvas texture made empty keeps its 0 x 0 size) */ img.src = KART_ART.tunnel;
            if (KART_ART.tunnel4) { const i4 = new Image(), t4 = prep(new THREE.Texture(i4)); i4.onload = () => { t4.needsUpdate = true; this.tunU.mapD.value = t4; }; i4.src = KART_ART.tunnel4; }      // THE FOURTH SPIRAL (blue and cyan glass, the user): the long last stretch, open under the glass road
            if (KART_ART.tunnel3) { const i3 = new Image(), t3 = prep(new THREE.Texture(i3)); i3.onload = () => { t3.needsUpdate = true; this.tunU.mapC.value = t3; }; i3.src = KART_ART.tunnel3; }      // THE THIRD SPIRAL (black with red spirals, the user): the last part of the tunnel
            this.tunU = { uGlassAll: { value: 0 }, uFloorY: { value: -KART.TD }, mapD: { value: tA }, mapC: { value: tA }, mapA: { value: tA }, mapB: { value: tA }, rep: { value: rep }, off: { value: 0 } };
            tm = new THREE.ShaderMaterial({ uniforms: this.tunU, side: THREE.DoubleSide, transparent: true, depthWrite: true,
              vertexShader: 'attribute float fade; varying vec2 vUv; varying float vF; varying float vY; void main() { vUv = uv; vF = fade; vY = (modelMatrix * vec4(position, 1.0)).y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
              fragmentShader: 'uniform sampler2D mapA; uniform sampler2D mapB; uniform sampler2D mapC; uniform sampler2D mapD; uniform vec2 rep; uniform float off; uniform float uFloorY; uniform float uGlassAll; varying vec2 vUv; varying float vF; varying float vY;\n' +
                'void main() { if ((vF > 0.6 || uGlassAll > 0.5) && vY < uFloorY - 0.2) discard; vec2 uv = vec2(vUv.x * rep.x + off, vUv.y * rep.y); vec4 a = texture2D(mapA, uv), b = texture2D(mapB, uv), c3 = texture2D(mapC, vec2(vUv.x * rep.x * 1.6 + off * 0.6, vUv.y * 2.0)), c4 = texture2D(mapD, vec2(vUv.x * rep.x * 1.2 + off * 0.8, vUv.y * 2.0));\n' +
                '  float front = 0.28 + 0.03 * sin(vUv.y * 6.2832 * 2.0 + vUv.x * 900.0);\n' +            // the wipe's front, twisted into a spiral round the tube
                '  float k = smoothstep(front - 0.03, front + 0.03, vF); vec4 col = mix(a, vec4(b.rgb * 0.62, b.a), k);\n' +
                '  float front2 = 0.45 + 0.03 * sin(vUv.y * 6.2832 * 2.0 - vUv.x * 900.0); float k2 = smoothstep(front2 - 0.03, front2 + 0.03, vF); col = mix(col, vec4(c3.rgb * 1.6, 1.0), k2);\n' +
                '  float front3 = 0.6 + 0.03 * sin(vUv.y * 6.2832 * 2.0 + vUv.x * 700.0); float k3 = max(uGlassAll, smoothstep(front3 - 0.03, front3 + 0.03, vF)); gl_FragColor = mix(col, vec4(c4.rgb * 0.85, 0.16), k3); gl_FragColor.rgb *= 0.8;\n#include <colorspace_fragment>\n}' });
            this.tunTex = { offset: { set x(v) { } } }; }
          { const tun = new THREE.Mesh(tg, tm); sc.add(tun); this.gateStuff.push(tun); }
          { const cp = [], s0 = KART.GATE_S + KART.LAP - 160; for (let k = 0; k <= 40; k++) cp.push(this.ringPos(s0 + k * 7, -16, -KART.TD + 2));      /* THE LAST LAP (5) closes the circle under the gate, where the tube dives up to the surface */
            const cg = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(cp), 80, 6.2 * (1 - 2 / 6.2), RAD, false); cg.setAttribute('fade', new THREE.BufferAttribute(new Float32Array(cg.attributes.position.count).fill(1), 1));
            const cm = new THREE.Mesh(cg, tm); cm.visible = false; sc.add(cm); this.tunClose = cm; }
          const fl = ring(R - 20, R - 12, new THREE.MeshPhongMaterial({ color: '#3a7aa0', emissive: '#0c2a40', specular: 0xaaddff, shininess: 120, transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide }), -KART.TD + 0.02); fl.renderOrder = 2;       // the tunnel's floor: DARK GLASS (the user): the rest of the tunnel shows through it
          // the tunnel's road in the style of the LASER FENCES (the user): neon lines along the floor (cyan at the edges, pink between the lanes) and two low laser bars along each side, blinking
          const lzC = new THREE.MeshBasicMaterial({ color: '#35f0ff', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }), lzP = new THREE.MeshBasicMaterial({ color: '#ff3fd0', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
          this.tunLaser = [lzC, lzP];
          if (typeof KART_ART !== 'undefined' && KART_ART.pano) {      /* THE DEEP BACKGROUND (the user's two pictures joined into ONE panorama, nothing repeated: the control room - left, middle - then the right side): a single curved screen on the outer side of the glass stretch, its height keeping the pictures' proportions, over a dark floor */
            const img = new Image(), pt = new THREE.Texture(img); pt.colorSpace = THREE.SRGBColorSpace; pt.anisotropy = 8; pt.wrapS = THREE.RepeatWrapping; pt.repeat.x = -1; pt.offset.x = 1;      /* (seen from inside the circle: unmirrored) */ img.onload = () => { pt.needsUpdate = true; }; img.src = KART_ART.pano;
            const RS = R + 12, L = 400, HS = L / KART_ART.ar_pano, BY = -2 - HS, th = L / RS, ac = (KART.GATE_S + 0.8 * KART.LAP) / R, bowl = new THREE.Group();
            const fl2 = new THREE.Mesh(new THREE.CircleGeometry(R + 12, 180), new THREE.MeshBasicMaterial({ color: '#06040c', fog: false })); fl2.rotation.x = -Math.PI / 2; fl2.position.y = BY - 95; bowl.add(fl2);
            const scr = new THREE.Mesh(new THREE.CylinderGeometry(RS, RS, HS, 160, 1, true, ac + Math.PI / 2 - th / 2, th), new THREE.MeshBasicMaterial({ map: pt, side: THREE.BackSide, transparent: true, alphaTest: 0.25, fog: false })); scr.position.y = BY + HS / 2;      /* (the user's arch, 400 m round the tunnel, its see-through parts kept) */ scr.visible = !Kart3D.HALL; bowl.add(scr); this.pano = scr;      /* (replaced by the 3D ship hall, Kart3D.HALL) */
            if (KART_ART.panoFloor) {      /* THE FLOOR of the panorama (the user's picture, its control room at the bottom centre): it goes on from the arch's foot and curves down and in, ROUND, to a bottom right under the tunnel (a quarter ellipse, 28 m across, 90 m down) */
              const i2 = new Image(), ft = new THREE.Texture(i2); ft.colorSpace = THREE.SRGBColorSpace; ft.anisotropy = 8; i2.onload = () => { ft.needsUpdate = true; }; i2.src = KART_ART.panoFloor;
              const NS = 160, NP = 24, Rt = R - 16, a = RS - Rt, bb = 90, yj = BY, th0 = ac + Math.PI / 2 - th / 2, pos = [], uv = [], idx = [];
              for (let j = 0; j <= NP; j++) { const f = j / NP * Math.PI / 2, r = Rt + a * Math.cos(f), y = yj - bb * Math.sin(f);
                for (let k = 0; k <= NS; k++) { const q = th0 + k / NS * th; pos.push(r * Math.sin(q), y, r * Math.cos(q)); uv.push(1 - k / NS, 1 - j / NP); } }
              for (let j = 0; j < NP; j++) for (let k = 0; k < NS; k++) { const A = j * (NS + 1) + k, B = A + NS + 1; idx.push(A, B, A + 1, A + 1, B, B + 1); }
              const fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); fg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); fg.setIndex(idx);
              if (!Kart3D.HALL) bowl.add(new THREE.Mesh(fg, new THREE.MeshBasicMaterial({ map: ft, side: THREE.DoubleSide, transparent: true, alphaTest: 0.25, fog: false }))); }
            bowl.position.set(-R, 0, 0); sc.add(bowl); this.gateStuff.push(bowl); this.bowl = bowl;
            // THE STARS AND THE ENGINE ROOM (the user's choice, 1 + 2, over 70 degrees only, right after the arch; the rest of the circle stays dark for the user's own pictures): a deep field of
            // stars and a violet nebula, and big 3D machines of the ship - rings and reactors - floating and turning in the void, their lights pulsing on the music
            { const sA = KART.GATE_S + 0.8 * KART.LAP + (th / 2) * R + 6, sB = sA + (70 * Math.PI / 180) * R, G = new THREE.Group(), rnd = k => { const v = Math.sin(k * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };
              const n = 1600, sp = new Float32Array(n * 3), sc2 = new Float32Array(n * 3);
              for (let k = 0; k < n; k++) { let xx = -110 + rnd(k + 9e3) * 125, yy = -6 - rnd(k + 2e4) * 190; if (Math.abs(xx + 16) < 14 && yy > -34) yy -= 40; const q = this.ringPos(sA + rnd(k) * (sB - sA), xx, yy);      /* (none right round the tunnel) */ sp.set([q.x, q.y, q.z], k * 3); const c = new THREE.Color().setHSL(0.55 + rnd(k + 5e4) * 0.25, 0.6, 0.6 + rnd(k + 7e4) * 0.4); sc2.set([c.r, c.g, c.b], k * 3); }
              const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3)); sg.setAttribute('color', new THREE.BufferAttribute(sc2, 3));
              if (false) G.add(new THREE.Points(sg, new THREE.PointsMaterial({      /* (the stars inside removed, the user) */ size: 2.5, vertexColors: true, sizeAttenuation: false, fog: false })));
              const cv = document.createElement('canvas'); cv.width = cv.height = 256; const x = cv.getContext('2d'); for (const [cx, cy, r2, col] of [[128, 128, 120, 'rgba(150,60,255,0.45)'], [90, 150, 80, 'rgba(60,200,255,0.30)'], [170, 100, 70, 'rgba(255,60,200,0.30)']]) { const gr = x.createRadialGradient(cx, cy, 0, cx, cy, r2); gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = gr; x.fillRect(0, 0, 256, 256); }
              const nt = new THREE.CanvasTexture(cv); nt.colorSpace = THREE.SRGBColorSpace;
              for (let k = 0; k < 4; k++) { const sp2 = new THREE.Sprite(new THREE.SpriteMaterial({ map: nt, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })); sp2.position.copy(this.ringPos(sA + (k + 0.5) / 4 * (sB - sA), -40 + 30 * rnd(k + 300), -70 - 50 * rnd(k + 400))); sp2.scale.setScalar(140 + 60 * rnd(k + 500)); if (false) G.add(sp2); }      /* (and the nebula with them) */
              if (Kart3D.HALL) this.buildHall(sc);
              this.machines = []; if (false) { const MC = ['#35f0ff', '#b040ff', '#ff3fd0', '#39ff14'];
              for (let k = 0; k < 6; k++) { const m = new THREE.Group(), col = MC[k % 4], r2 = 22 + 18 * rnd(k + 600), glow = new THREE.MeshBasicMaterial({ color: col, fog: false }), dark = new THREE.MeshBasicMaterial({ color: '#3a4462', fog: false });
                const ringA = new THREE.Mesh(new THREE.TorusGeometry(r2, 0.9, 10, 64), dark), ringB = new THREE.Mesh(new THREE.TorusGeometry(r2 * 0.98, 0.25, 6, 64), glow), ringC = new THREE.Mesh(new THREE.TorusGeometry(r2 * 0.62, 0.6, 8, 48), dark), ringD = new THREE.Mesh(new THREE.TorusGeometry(r2 * 0.6, 0.18, 6, 48), glow);
                ringC.rotation.y = Math.PI / 2; ringD.rotation.y = Math.PI / 2;
                const core = new THREE.Mesh(new THREE.SphereGeometry(r2 * 0.22, 20, 14), new THREE.MeshBasicMaterial({ color: col, fog: false })), halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: nt, color: col, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })); halo.scale.setScalar(r2 * 1.6);
                for (let j = 0; j < 4; j++) { const sp3 = new THREE.Mesh(new THREE.BoxGeometry(0.5, r2 * 1.9, 0.5), dark); sp3.rotation.z = j * Math.PI / 4; m.add(sp3); }
                ringA.scale.z = ringA.scale.x = ringA.scale.y = 1; [ringA, ringB].forEach(q => { q.geometry.dispose(); }); ringA.geometry = new THREE.TorusGeometry(r2, 1.8, 12, 72); ringB.geometry = new THREE.TorusGeometry(r2 * 0.98, 1.1, 8, 72); ringC.geometry = new THREE.TorusGeometry(r2 * 0.62, 1.2, 10, 56); ringD.geometry = new THREE.TorusGeometry(r2 * 0.6, 0.8, 8, 56);
                m.add(ringA, ringB, ringC, ringD, core, halo); const side = k % 2 ? 1 : -1;
                m.position.copy(this.ringPos(sA + (k + 0.5) / 6 * (sB - sA), side > 0 ? 40 + 20 * rnd(k + 700) : -75 - 25 * rnd(k + 700), -28 - 30 * rnd(k + 800)));
                m.rotation.set(rnd(k + 900) * 3, rnd(k + 950) * 3, 0); m.userData = { spin: 0.15 + 0.25 * rnd(k + 990), inner: [ringC, ringD], glow, col: new THREE.Color(col), core, halo, r2 }; G.add(m); this.machines.push(m); } }      /* (the machines removed, the user) */
              if (KART_ART.pano2) {      /* THE SECOND CURVED WALL (the user's two pictures welded into one, 350 m long), right after the stars and machines, in the dark part of the circle */
                const i3 = new Image(), t3 = new THREE.Texture(i3); t3.colorSpace = THREE.SRGBColorSpace; t3.anisotropy = 8; t3.wrapS = THREE.RepeatWrapping; t3.repeat.x = -1; t3.offset.x = 1; i3.onload = () => { t3.needsUpdate = true; }; i3.src = KART_ART.pano2;
                const L2 = 350, H2 = L2 / KART_ART.ar_pano2, th2 = L2 / RS, ac2 = (sB + 10 + L2 / 2 * R / RS) / R;
                const w2 = new THREE.Mesh(new THREE.CylinderGeometry(RS, RS, H2, 160, 1, true, ac2 + Math.PI / 2 - th2 / 2, th2), new THREE.MeshBasicMaterial({ map: t3, side: THREE.BackSide, fog: false })); w2.position.set(-R, -2 - H2 / 2, 0); w2.visible = false; G.add(w2); }      /* (replaced by the right-hand view, the user: 1D is what one sees on the right through the glass) */
              sc.add(G); this.gateStuff.push(G); } }
          for (const [r, m] of [[R - 19.7, lzC], [R - 17.2, lzP], [R - 14.8, lzP], [R - 12.3, lzC]]) ring(r - 0.03, r + 0.03, m, -KART.TD + 0.04);
          for (const r of [R - 19.9, R - 12.1]) for (const [hh, m] of [[0.35, lzP], [0.75, lzC]]) { const c = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.022, 720, 1, true), m); c.position.set(-R, -KART.TD + hh, 0); sc.add(c); } }
        for (const L of [lp, rp]) { const lg = new THREE.BufferGeometry().setFromPoints(L), ln = new THREE.Line(lg, new THREE.LineBasicMaterial({ color: '#ff3fd0', fog: false })); sc.add(ln); this.gateStuff.push(ln); } }
      ring(R - 20, R - 12, new THREE.MeshPhongMaterial({ color: '#0b0d10', emissive: '#1a0830', specular: 0x8899aa, shininess: 80, side: THREE.DoubleSide }), 0.02);                          // the inner ring road
      for (const r of [R - 20, R - 12]) ring(r - 0.1, r + 0.1, new THREE.MeshBasicMaterial({ color: '#ff3fd0', fog: false }), 0.03); }
    // THE NEON BARRIERS at the end of lap 3 (shown while the player is in lap 3 and through the gate): a diagonal of laser posts closing the lanes from the right toward the gate,
    // and a barrier across the big ring just past the line (no fourth lap on it); arrows on them point left, into the gate
    { const B = this.barriers = new THREE.Group(), post = new THREE.MeshBasicMaterial({ color: '#20242c', fog: false }), las = new THREE.MeshBasicMaterial({ color: '#35f0ff', transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }), las2 = new THREE.MeshBasicMaterial({ color: '#ff3fd0', transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
      this.laserMats = [las, las2];
      // a DETOUR all along lap 3, like the cones that lead a motorway onto its exit: a laser fence on the right shoulder from the start of lap 3, then across the right lane (FUNNEL), then across the middle
      // lane (FUNNEL2), keeping only the left lane to the gate
      const pts = [], sm2 = v => { v = Math.max(0, Math.min(1, v)); return v * v * (3 - 2 * v); };
      for (let s1 = 2 * KART.LAP + 10; s1 <= KART.GATE_S - 4; s1 += 12) pts.push([s1, KART.fence(s1)]);
      const P = pts.map(([s1, x]) => this.ringPos(s1, x, 0));
      pts.forEach(([s1, x], i) => { const pm = new THREE.Mesh(new THREE.BoxGeometry(0.25, 1.6, 0.25), post); pm.position.copy(P[i]).setY(0.8); pm.userData.bx = x; pm.userData.bs = s1; B.add(pm);
        const tip = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.3), i % 2 ? las2 : las); tip.position.copy(P[i]).setY(1.66); tip.userData.bx = x; tip.userData.bs = s1; B.add(tip);
        if (i) for (const [hh, mm] of [[0.45, las], [0.95, las2], [1.4, las]]) { const a = P[i - 1], b = P[i], len = a.distanceTo(b), bar = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, len), mm); bar.position.copy(a).add(b).multiplyScalar(0.5).setY(hh); bar.lookAt(b.x, hh, b.z); bar.userData.bx = (pts[i - 1][1] + x) / 2; bar.userData.bs = s1; B.add(bar); } });
      { const a = this.ringPos(KART.GATE_S + 6, -4.2, 0), b = this.ringPos(KART.GATE_S + 6, 6.6, 0), len = a.distanceTo(b);                                    // the barrier across the big ring
        for (const [hh, mm] of [[0.35, las2], [0.75, las], [1.15, las2], [1.55, las], [1.95, las2]]) { const bar = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, len), mm); bar.position.copy(a).add(b).multiplyScalar(0.5).setY(hh); bar.lookAt(b.x, hh, b.z); B.add(bar); }
        for (const q of [a, b]) { const pm = new THREE.Mesh(new THREE.BoxGeometry(0.4, 2.2, 0.4), post); pm.position.copy(q).setY(1.1); B.add(pm); }
        const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(1.2, 0.7); sh.lineTo(1.2, 0.35); sh.lineTo(2.6, 0.35); sh.lineTo(2.6, -0.35); sh.lineTo(1.2, -0.35); sh.lineTo(1.2, -0.7); sh.closePath();
        const ar = new THREE.Mesh(new THREE.ShapeGeometry(sh), new THREE.MeshBasicMaterial({ color: '#39ff14', side: THREE.DoubleSide, fog: false })); ar.position.copy(a).add(b).multiplyScalar(0.5).setY(2.9); ar.lookAt(this.ringPos(KART.GATE_S - 30, 1, 2.9)); ar.scale.setScalar(1.4); B.add(ar); this.gateArrow = ar; }
      // THE KEEP-LEFT SIGNS (the user: nothing showed that one must keep left): neon gantries across the track with a big arrow and 'SERREZ A GAUCHE', and merge arrows painted on the lanes
      // that are closing, every 40 m from 250 m before the fence starts to turn
      { const cv = document.createElement('canvas'); cv.width = 512; cv.height = 128; const x = cv.getContext('2d'); x.fillStyle = '#05140a'; x.fillRect(0, 0, 512, 128); x.strokeStyle = '#39ff14'; x.lineWidth = 8; x.strokeRect(4, 4, 504, 120);
        x.fillStyle = '#39ff14'; x.beginPath(); x.moveTo(20, 64); x.lineTo(90, 14); x.lineTo(90, 44); x.lineTo(140, 44); x.lineTo(140, 84); x.lineTo(90, 84); x.lineTo(90, 114); x.closePath(); x.fill();
        x.font = 'bold 52px monospace'; x.textBaseline = 'middle'; x.fillText('SERREZ', 160, 42); x.fillText('A GAUCHE', 160, 94);
        const st = new THREE.CanvasTexture(cv); st.colorSpace = THREE.SRGBColorSpace; const sm = new THREE.MeshBasicMaterial({ map: st, side: THREE.DoubleSide, fog: false });
        for (const s1 of [KART.FUNNEL - 240, KART.FUNNEL - 60, KART.FUNNEL2 - 40]) { const c = this.ringPos(s1, 0, 0), a1 = this.ringPos(s1, -6.6, 0), b1 = this.ringPos(s1, 6.6, 0);
          for (const q of [a1, b1]) { const pm = new THREE.Mesh(new THREE.BoxGeometry(0.3, 4.6, 0.3), post); pm.position.copy(q).setY(2.3); pm.userData.bs = s1; pm.userData.bx = 0; B.add(pm); }
          const bm = new THREE.Mesh(new THREE.BoxGeometry(13.4, 0.25, 0.25), las); bm.position.copy(c).setY(4.6); bm.lookAt(this.ringPos(s1 + 10, 0, 4.6)); bm.userData.bs = s1; bm.userData.bx = 0; B.add(bm);
          const sg = new THREE.Mesh(new THREE.PlaneGeometry(8, 2), sm); sg.position.copy(c).setY(3.4); sg.lookAt(this.ringPos(s1 - 30, 0, 3.4)); sg.userData.bs = s1; sg.userData.bx = 0; B.add(sg); }
        const sh = new THREE.Shape(); sh.moveTo(0, 1.6); sh.lineTo(0.8, 0.5); sh.lineTo(0.3, 0.5); sh.lineTo(0.9, -1.4); sh.lineTo(0.3, -1.6); sh.lineTo(-0.3, 0.5); sh.lineTo(-0.8, 0.5); sh.closePath();     // a lane-merge arrow: up, bent to the left
        const ag = new THREE.ShapeGeometry(sh); ag.rotateX(-Math.PI / 2); const am = new THREE.MeshBasicMaterial({ color: '#39ff14', transparent: true, opacity: 0.85, fog: false }); this.mergeMat = am;
        for (let s1 = KART.FUNNEL - 230; s1 < KART.GATE_S - 30; s1 += 40) for (const lane of [0, 1]) { if (KART.fence(s1 + 40) < lane * RACE.LANE_M - 1.2) continue; const m = new THREE.Mesh(ag, am), q = this.ringPos(s1, lane * RACE.LANE_M, 0.06);
          m.position.copy(q); m.rotation.y = s1 / R + 0.45; m.scale.setScalar(1.3); m.userData.bs = s1; m.userData.bx = lane * RACE.LANE_M; B.add(m); } }
      B.visible = false; sc.add(B); B.children.forEach(c => { c.userData.y0 = c.position.y; }); }
    this.holders = null; this.bound = null; this.camPos = new THREE.Vector3(); this.v = new THREE.Vector3();
  }
  bankY(x) { return -KART.BANK * this.bank * Math.max(0, Math.min(1, (6.5 - x) / 13)); }      // the height of the banked track at x across (x < 0: the inner, left side)
  // THE SHIP HALL (the user's painting of a curved part of a spaceship, rebuilt in 3D at the size of a football field - step 1, the structure): 110 m long, 70 m wide, 35 m high, the glass tunnel
  // running right through it along its length. A floor of pink mesh with a blue walkway down the middle, a vault of hexagon glass panels between heavy black curved ribs with violet neon edges,
  // dark curved side walls with neon lines; the far end and the near end are open arches the tunnel passes through. Textures are drawn in the painting's colours (none of the user's pictures tiled).
  buildHall(sc) {
    const L = 110, W = 70, H = 35, Y0 = -KART.TD - 23, sC = KART.GATE_S + 0.8 * KART.LAP, g = new THREE.Group();
    const tex = (w, h, f, rx, ry) => { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; f(cv.getContext('2d'), w, h); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.anisotropy = 8; return t; };
    const mesh = tex(64, 64, (x, w, h) => { x.fillStyle = '#12040c'; x.fillRect(0, 0, w, h); x.fillStyle = '#e0206a'; for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) { x.save(); x.translate(i * 16 + (j % 2) * 8 + 4, j * 16 + 8); x.rotate(-0.5); x.fillRect(-6, -1.6, 12, 3.2); x.restore(); } }, W / 3, L / 3);
    const walk = tex(64, 64, (x, w, h) => { x.fillStyle = '#0a1a3a'; x.fillRect(0, 0, w, h); x.fillStyle = '#2a6aff'; for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) x.fillRect(i * 8 + 2, j * 8 + 3, 5, 2); }, 2, L / 4);
    const hex = tex(256, 222, (x, w, h) => { x.fillStyle = '#0a3a8a'; x.fillRect(0, 0, w, h); const r = 32, dx = r * 1.5, dy = r * Math.sqrt(3);
      for (let i = -1; i < 7; i++) for (let j = -1; j < 5; j++) { const cx = i * dx, cy = j * dy + (i % 2 ? dy / 2 : 0); x.beginPath(); for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; x.lineTo(cx + (r - 2) * Math.cos(a), cy + (r - 2) * Math.sin(a)); } x.closePath();
        const l = 45 + 20 * Math.abs(Math.sin(i * 3.1 + j * 1.7)); x.fillStyle = 'hsl(' + (198 + 14 * Math.sin(i + j * 2)) + ',95%,' + l + '%)'; x.fill(); } }, 6, 3);
    const M = { floor: new THREE.MeshBasicMaterial({ map: mesh }), walk: new THREE.MeshBasicMaterial({ map: walk }), hex: new THREE.MeshBasicMaterial({ map: hex, side: THREE.DoubleSide }),
      rib: new THREE.MeshBasicMaterial({ color: '#0c0c14' }), neon: new THREE.MeshBasicMaterial({ color: '#b040ff' }), cyan: new THREE.MeshBasicMaterial({ color: '#35f0ff' }), wall: new THREE.MeshBasicMaterial({ color: '#07070d', side: THREE.DoubleSide }) };
    const fl = new THREE.Mesh(new THREE.PlaneGeometry(W, L), M.floor); fl.rotation.x = -Math.PI / 2; g.add(fl);
    const wk = new THREE.Mesh(new THREE.PlaneGeometry(8, L), M.walk); wk.rotation.x = -Math.PI / 2; wk.position.y = 0.05; g.add(wk);
    for (const sx of [-1, 1]) { const e = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, L), M.cyan); e.position.set(sx * 4.2, 0.15, 0); g.add(e); }
    // the vault: a half cylinder of hexagon glass (radius W/2, long axis along the hall), squashed to H, and the ribs every 11 m
    const vault = new THREE.Mesh(new THREE.CylinderGeometry(W / 2, W / 2, L, 48, 1, true, Math.PI / 2, Math.PI), M.hex); vault.rotation.x = Math.PI / 2; vault.scale.set(1, 1, H / (W / 2)); g.add(vault);
    for (let k = 0; k <= 10; k++) { const z = -L / 2 + k * L / 10, heavy = k % 5 === 0;
      const rib = new THREE.Mesh(new THREE.TorusGeometry(W / 2 - 0.5, heavy ? 1.6 : 0.8, 8, 48, Math.PI), M.rib); rib.scale.y = H / (W / 2); rib.position.z = z; g.add(rib);
      const ne = new THREE.Mesh(new THREE.TorusGeometry(W / 2 - (heavy ? 2.3 : 1.4), 0.18, 6, 48, Math.PI), M.neon); ne.scale.y = H / (W / 2); ne.position.z = z; g.add(ne); }
    for (const a of [0.55, 1.1, 1.6, 2.04, 2.59]) { const sp = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, L), M.rib), r = W / 2 - 0.6; sp.position.set(r * Math.cos(a), r * Math.sin(a) * H / (W / 2), 0); g.add(sp); }      // the long beams between the glass panels
    // the dark lower side walls (curving in at the foot), with two neon lines along them
    for (const sx of [-1, 1]) { const wl = new THREE.Mesh(new THREE.CylinderGeometry(9, 9, L, 16, 1, true, sx > 0 ? 0 : Math.PI, Math.PI / 2), M.wall); wl.rotation.x = Math.PI / 2; wl.position.set(sx * (W / 2 - 9), 9, 0); g.add(wl);
      for (const [yy, m] of [[3.5, M.neon], [7.5, M.cyan]]) { const ln = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, L), m); ln.position.set(sx * (W / 2 - 9 + 9 * Math.cos(Math.asin(Math.min(1, (yy) / 9))) - 0.3), yy, 0); g.add(ln); } }
    // STEP 2: the REACTOR at the far end of the walkway (a stepped base ringed with neon, a core of orange light with its halo and a beam, a portal of concentric neon rings behind it),
    // the CONSOLES along both sides (curved desks with lit edges, holographic screens standing on them), and everything pulsing on the music (in draw: this.hallFx)
    const add = (geo, mat, x, y, z, rx, ry) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); if (rx) m.rotation.x = rx; if (ry) m.rotation.y = ry; g.add(m); return m; };
    const glow = c => new THREE.MeshBasicMaterial({ color: c }), dark = new THREE.MeshBasicMaterial({ color: '#10101a' }), fx = { rings: [], screens: [], edges: [] };
    const zR = -L / 2 + 16;
    add(new THREE.CylinderGeometry(12, 13, 1.5, 48), dark, 0, 0.75, zR); add(new THREE.CylinderGeometry(9, 10, 1.5, 48), dark, 0, 2.25, zR); add(new THREE.CylinderGeometry(6, 7, 2, 40), dark, 0, 4, zR);
    for (const [r, y, c] of [[12.6, 1.5, '#35f0ff'], [11.6, 1.2, '#ff3fd0'], [9.6, 3, '#ffb020'], [8.6, 2.8, '#39ff14'], [6.6, 5, '#ff3fd0']]) { const m = add(new THREE.TorusGeometry(r, 0.35, 8, 64), glow(c), 0, y, zR, Math.PI / 2); fx.rings.push({ m, c: new THREE.Color(c) }); }
    const core = add(new THREE.SphereGeometry(5, 32, 20), new THREE.MeshBasicMaterial({ color: '#ffb84a' }), 0, 12, zR);
    const hcv = document.createElement('canvas'); hcv.width = hcv.height = 256; { const x = hcv.getContext('2d'), gr = x.createRadialGradient(128, 128, 10, 128, 128, 128); gr.addColorStop(0, 'rgba(255,230,160,1)'); gr.addColorStop(0.25, 'rgba(255,150,40,0.7)'); gr.addColorStop(0.6, 'rgba(200,60,255,0.25)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = gr; x.fillRect(0, 0, 256, 256); }
    const ht = new THREE.CanvasTexture(hcv); ht.colorSpace = THREE.SRGBColorSpace; const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: ht, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); halo.position.set(0, 12, zR); halo.scale.setScalar(26); g.add(halo);
    const beam = add(new THREE.CylinderGeometry(0.8, 2.2, 14, 16, 1, true), new THREE.MeshBasicMaterial({ color: '#ffcf70', transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }), 0, 6, zR);
    for (const [r, c, t] of [[11, '#35f0ff', 0.5], [13.5, '#ff3fd0', 0.35], [16, '#b040ff', 0.6], [18.5, '#35f0ff', 0.3]]) { const m = add(new THREE.TorusGeometry(r, t, 8, 72, Math.PI), glow(c), 0, 0, -L / 2 + 3); fx.rings.push({ m, c: new THREE.Color(c) }); }      // the portal behind it
    fx.core = core; fx.halo = halo; fx.beam = beam;
    { const n0 = g.children.indexOf(core) - 8; for (let k = Math.max(0, n0); k <= g.children.indexOf(beam); k++) g.children[k].visible = false; }      /* (the reactor removed, the user: base, its neon rings, the orange core, halo and beam - hidden, the portal behind stays) */
    // the consoles: curved desks on both sides of the walkway, each with two or three holographic screens
    const scrTex = k => { const cv = document.createElement('canvas'); cv.width = 128; cv.height = 96; const x = cv.getContext('2d'); x.fillStyle = 'rgba(10,60,90,0.55)'; x.fillRect(0, 0, 128, 96); x.strokeStyle = '#35f0ff'; x.lineWidth = 2; x.strokeRect(2, 2, 124, 92);
      const cols = ['#35f0ff', '#ff3fd0', '#ffb020', '#39ff14']; for (let i = 0; i < 9; i++) { x.fillStyle = cols[(i + k) % 4]; x.fillRect(8, 10 + i * 9, 20 + ((i * 37 + k * 13) % 80), 3); }
      x.strokeStyle = cols[k % 4]; x.beginPath(); for (let i = 0; i <= 40; i++) x.lineTo(70 + i * 1.3, 60 + 20 * Math.sin(i * 0.5 + k)); x.stroke(); x.beginPath(); x.arc(98, 28, 14, 0, Math.PI * 2); x.stroke();
      const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t; };
    let k = 0;
    for (const sx of [-1, 1]) for (const z of [-26, -8, 10, 28]) {
      const dz = z + (sx > 0 ? 4 : 0), xd = sx * 16;
      const desk = add(new THREE.CylinderGeometry(9, 9, 3, 24, 1, false, sx > 0 ? Math.PI : 0, Math.PI * 0.7), dark, xd + sx * 6, 1.5, dz); desk.scale.z = 0.5;
      const edge = add(new THREE.TorusGeometry(9, 0.2, 6, 24, Math.PI * 0.7), glow('#b040ff'), xd + sx * 6, 3.05, dz, Math.PI / 2); edge.rotation.z = sx > 0 ? Math.PI : 0; edge.scale.y = 0.5; fx.edges.push(edge);
      for (let j = 0; j < 3; j++) { const sm = new THREE.MeshBasicMaterial({ map: scrTex(k++), transparent: true, opacity: 0.85, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false });
        const sp = add(new THREE.PlaneGeometry(5, 3.8), sm, xd + sx * (2 + j * 2.5), 5.5 + (j % 2) * 0.8, dz - 2.5 + j * 2.5, -0.15, sx > 0 ? -Math.PI / 2 + 0.5 : Math.PI / 2 - 0.5); fx.screens.push(sm); } }
    this.hallFx = fx;
    this.ringPos(sC, -16, Y0, g.position); g.rotation.y = sC / KART.R; sc.add(g); this.gateStuff.push(g); this.hall = g;
    // WELDED TO THE HALL (the user: the two pictures go on from the hall): right after its forward end, its two sides go on as the user's pictures - 1D on the right, 2D on the left - curved walls
    // of the hall's own height (floor to vault), each picture once, unstretched, the hall's last rib framing them
    const R = KART.R, sE = sC + L / 2, Lw = 50, Hw = 50,      /* (closer and bigger, the user could not see them: 50 x 50 m, 13 m from the tunnel's axis, top just under the track) */ mk = (key, r, front) => { if (typeof KART_ART === 'undefined' || !KART_ART[key]) return; const img = new Image(), t = new THREE.Texture(img); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.wrapS = THREE.RepeatWrapping; if (!front) { t.repeat.x = -1; t.offset.x = 1; } img.onload = () => { t.needsUpdate = true; }; img.src = KART_ART[key];
      const th = Lw / r, ac = (sE + Lw / 2) / R, w = new THREE.Mesh(new THREE.CylinderGeometry(r, r, Hw, 48, 1, true, ac + Math.PI / 2 - th / 2, th), new THREE.MeshBasicMaterial({ map: t, side: front ? THREE.FrontSide : THREE.BackSide, fog: false })); w.position.set(-R, -2 - Hw / 2, 0); sc.add(w); this.gateStuff.push(w); return w; };
    this.wallR = null;
    for (const [key, k0, mir] of []      /* (the wall pictures removed, the user: only the hexagon band stays; the old list: Array.from({ length: 11 }, (_, i) => [i % 4 < 2 ? 'rightView4' : 'rightView5', i, i % 2 === 1])) */      /* (the suites go on round the circle, the user: a cycle blue / blue mirrored / new picture / new picture mirrored - every seam meets its neighbour exactly) */      /* (and its continuation, the same picture MIRRORED so its lines run on from the first at the seam: no visible repeat, the user) */      /* (the user's new picture in D1's place, same curved wall; the old D1 pictures stay in kart_assets.js) */) if (typeof KART_ART !== 'undefined' && KART_ART[key]) {      /* (D1, then its continuation, the user's next picture, right after it: 'continuer D1') */      /* D1 as a CURVED WALL (the user: curved vertically at the top, stretched and lengthened, like the first try): from the foot where the floor curves up, straight up, then its top bends over toward the tunnel - 120 m long like the floor */
      const img = new Image(), t = new THREE.Texture(img); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; img.onload = () => { t.needsUpdate = true; }; img.src = KART_ART[key];
      const Ld = 120, NS = 80, NJ = 30, x0 = -3, yb = -52, yv = -14, Ra = 10,      /* (D1 and its 2nd part back as before, the user: their glass mosaic lined up with the tunnel) */      /* (top raised to just under the track and bent further over the tunnel, 144 degrees: hides the shops, the user) */ up = yv - yb, arc = Math.PI * 0.5 * Ra, Rb = 10, fl = 0, bc = 0, tot = fl + bc + up + arc, pos = [], uv = [], idx = [];
      // (the continuations, the user: their pictures come down to line up with D1, and their lower part curves in like D1's floor - a flat strip and a quarter circle up - a piece of floor to be completed later)
      const prof = q => { let d = q * tot; if (d <= fl) return [x0 - Rb - fl + d, yb - Rb]; d -= fl; if (d <= bc) { const b = d / Rb; return [x0 - Rb + Rb * Math.sin(b), yb - Rb + Rb - Rb * Math.cos(b)]; } d -= bc;
        if (d <= up) return [x0, yb + d]; const a2 = (d - up) / Ra; return [x0 - Ra + Ra * Math.cos(a2), yv + Ra * Math.sin(a2)]; };
      for (let k = 0; k <= NS; k++) for (let j = 0; j <= NJ; j++) { const [x, y] = prof(j / NJ), q = this.ringPos(sE + (k0 + k / NS) * Ld, x, y); pos.push(q.x, q.y, q.z); uv.push(mir ? k / NS : 1 - k / NS, j / NJ); }
      for (let k = 0; k < NS; k++) for (let j = 0; j < NJ; j++) { const a1 = k * (NJ + 1) + j, b1 = a1 + NJ + 1; idx.push(a1, b1, a1 + 1, a1 + 1, b1, b1 + 1); }
      const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); dg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); dg.setIndex(idx);
      const dm = new THREE.Mesh(dg, new THREE.MeshBasicMaterial({ map: t, side: THREE.DoubleSide, fog: false })); sc.add(dm); this.gateStuff.push(dm); if (!k0) this.wallR = dm; }
    if (typeof KART_ART !== 'undefined' && KART_ART.hexBand) {      /* THE HEXAGON BAND (the user): the link along the wall's three parts, at the level of the blue zone and of the tunnel; mirrored repeats so its edges meet */
      const img = new Image(), t = new THREE.Texture(img); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.wrapS = THREE.MirroredRepeatWrapping; img.onload = () => { t.needsUpdate = true; }; img.src = KART_ART.hexBand;
      const Lb = KART.LAP,      /* (the whole ring, the user: the band closes the circle) */ Hb = 5, yc = -KART.TD + 2, nRep = 2 * Math.round(Lb / (2 * Hb * KART_ART.ar_hexBand)), NS = 240,      /* (an even number of mirrored repeats: the two ends meet) */ pos = [], uv = [], idx = [];
      for (let k = 0; k <= NS; k++) for (let j = 0; j <= 1; j++) { const an = (j ? 38 : 8) * Math.PI / 180, R2 = 9.85, q = this.ringPos(sE + k / NS * Lb, -3 - 10 + R2 * Math.cos(an), -14 + R2 * Math.sin(an));      /* (laid on the wall's curve, just inside it, from 8 to 38 degrees: about 1.5 m to 6 m above the tunnel's floor, level with the tunnel) */ pos.push(q.x, q.y, q.z); uv.push(k / NS * nRep, j); }
      for (let k = 0; k < NS; k++) { const a1 = k * 2; idx.push(a1, a1 + 2, a1 + 1, a1 + 1, a1 + 2, a1 + 3); }
      const bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); bg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); bg.setIndex(idx);
      const bm = new THREE.Mesh(bg, new THREE.MeshBasicMaterial({ map: t, side: THREE.DoubleSide, fog: false })); sc.add(bm); this.gateStuff.push(bm); this.hexBandMesh = bm; }
    { // THE LAST FLOOR, about 4 floors underground (the user: the tunnel is the 2nd basement): one dark ground over the whole circle, and on it a ROUNDABOUT made of the user's red, black and steel hexagons (KART_ART.hexBand2) - a 24 m ring right under the tunnel, all round
      const Y4 = -70, gr = new THREE.Mesh(new THREE.CircleGeometry(R + 70, 240), new THREE.MeshBasicMaterial({ color: '#07070b', side: THREE.DoubleSide, fog: false })); gr.rotation.x = -Math.PI / 2; gr.position.set(-R, Y4 - 0.4, 0); sc.add(gr); this.gateStuff.push(gr); this.lastGround = gr;
      if (typeof KART_ART !== 'undefined' && KART_ART.hexBand2) {
        const img = new Image(), t = new THREE.Texture(img); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.wrapS = THREE.MirroredRepeatWrapping; img.onload = () => { t.needsUpdate = true; }; img.src = KART_ART.hexBand2;
        const Wc = 24, NS = 360, pos = [], uv = [], idx = [];
        for (const [r0, xc] of [-16, -80, -144].entries()) {      /* (three rings, the user: the first under the tunnel, then two more like it, inside) */
          const nR = 2 * Math.max(1, Math.round(KART.LAP * (R + xc) / R / (2 * Wc * KART_ART.ar_hexBand2))), b0 = pos.length / 3;      /* (an even number of mirrored repeats: each ring closes without a seam) */
          for (let k = 0; k <= NS; k++) for (let j = 0; j <= 1; j++) { const q = this.ringPos(sE + k / NS * KART.LAP, xc + (j - 0.5) * Wc, Y4); pos.push(q.x, q.y, q.z); uv.push(k / NS * nR, j); }
          for (let k = 0; k < NS; k++) { const a1 = b0 + k * 2; idx.push(a1, a1 + 2, a1 + 1, a1 + 1, a1 + 2, a1 + 3); } }
        const cg = new THREE.BufferGeometry(); cg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); cg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); cg.setIndex(idx);
        const cm = new THREE.Mesh(cg, new THREE.MeshBasicMaterial({ map: t, side: THREE.DoubleSide, fog: false })); sc.add(cm); this.gateStuff.push(cm); this.roundabout = cm; }
      if (typeof KART_ART !== 'undefined' && KART_ART.floorDisc) {      /* THE VERY CENTRE of the last floor (the user's glass flower of green, pink and violet rings, cut out of its checkerboard, used once, its own proportions): inside the smallest ring, 160 m long */
        const img = new Image(), t = new THREE.Texture(img); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; img.onload = () => { t.needsUpdate = true; }; img.src = KART_ART.floorDisc;
        const Rd = 84, dg = new THREE.CircleGeometry(Rd, 160), P = dg.attributes.position, U = dg.attributes.uv;      /* (flush with the rings, the user: a round piece exactly filling the smallest ring's centre, at the same height, its edge meeting the ring's inner edge; the picture's own round heart - 88 % of it, all solid - mapped into it, its sides adapted to the circle) */
        for (let k = 0; k < P.count; k++) U.setXY(k, 0.5188 + 0.44 * P.getX(k) / Rd, (1 - 0.4906) + 0.44 * P.getY(k) / Rd);
        const dm = new THREE.Mesh(dg, new THREE.MeshBasicMaterial({ map: t, side: THREE.DoubleSide, fog: false })); dm.rotation.x = -Math.PI / 2; dm.position.set(-R, Y4, 0); sc.add(dm); this.gateStuff.push(dm); this.floorDisc = dm; } }      /* (the strip under the tunnel's road, 2nd basement, removed: the user) */
    { // SMOKED BLACK GLASS from the band's top edge up to the ceiling (the underside of the track and the garden), all round, with a red neon laser line along its middle (the user)
      const a2 = 38 * Math.PI / 180, xb = -13 + 9.85 * Math.cos(a2), yb2 = -14 + 9.85 * Math.sin(a2), yt = -0.5, NS = 240, pos = [], idx = [], lp = [];
      for (let k = 0; k <= NS; k++) { const s1 = sE + k / NS * KART.LAP; for (const y of [yb2, yt]) { const q = this.ringPos(s1, xb, y); pos.push(q.x, q.y, q.z); } lp.push(this.ringPos(s1, xb - 0.05, (yb2 + yt) / 2)); }
      for (let k = 0; k < NS; k++) { const a1 = k * 2; idx.push(a1, a1 + 2, a1 + 1, a1 + 1, a1 + 2, a1 + 3); }
      const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); gg.setIndex(idx);
      const gl = new THREE.Mesh(gg, new THREE.MeshPhongMaterial({ color: '#010103', specular: 0xaabbdd, shininess: 160, reflectivity: 1, transparent: true, opacity: 0.96, side: THREE.DoubleSide })      /* (darker, still glass: a bright sharp glint) */); sc.add(gl); this.gateStuff.push(gl);
      this.glassMesh = gl; const lz = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(lp, true), 600, 0.09, 6, true), new THREE.MeshBasicMaterial({ color: '#ff1a2a', fog: false }));
      const lg = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(lp, true), 600, 0.35, 6, true), new THREE.MeshBasicMaterial({ color: '#ff1a2a', transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
      sc.add(lz, lg); this.gateStuff.push(lz, lg); this.laser = [lz, lg];
      const ce = new THREE.Mesh(new THREE.RingGeometry(R + xb, R + 66, 360, 1), new THREE.MeshBasicMaterial({ color: '#05060a', side: THREE.BackSide, fog: false })); ce.rotation.x = -Math.PI / 2; ce.position.set(-R, -0.45, 0); ce.visible = false; sc.add(ce); this.glassCeil = ce; }      /* (the ceiling above the glass: the underside of the track and the shops' walk, seen only from underground - the garden and Saturn stay open) */ this.wallL = null;      /* (D2 removed, the user) */
    if (Kart3D.WELD_FLOOR && typeof KART_ART !== 'undefined' && KART_ART.weldFloor) {      /* (switched off, the user: kept with all its settings - 120 m long, y -62, right side curving up into D1's foot - to be used again later; set Kart3D.WELD_FLOOR = true) */      /* THE FLOOR between them (the user's picture, once): across the full width of the hall, its length from the picture's own proportions, its top toward the front */
      const img = new Image(), t = new THREE.Texture(img); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; img.onload = () => { t.needsUpdate = true; }; img.src = KART_ART.weldFloor;
      const Lf = 120, NS = 80, NJ = 24, Yb = -52, Yf = -62, xR = -3, Rc = Yb - Yf, xL = -16 - W / 2, flat = (xR - Rc) - xL, arc = Math.PI / 2 * Rc, tot = flat + arc, pos = [], uv = [], idx = [];      /* (stretched forward to 120 m, the user; and across, its right side curves up, a quarter circle, into the foot of D1) */
      const prof = t => { const d = t * tot; if (d <= flat) return [xL + d, Yf]; const a = (d - flat) / Rc; return [xR - Rc + Rc * Math.sin(a), Yf + Rc - Rc * Math.cos(a)]; };
      for (let k = 0; k <= NS; k++) for (let j = 0; j <= NJ; j++) { const [x, y] = prof(j / NJ), q = this.ringPos(sE + k / NS * Lf, x, y); pos.push(q.x, q.y, q.z); uv.push(k / NS, 1 - j / NJ); }
      for (let k = 0; k < NS; k++) for (let j = 0; j < NJ; j++) { const a1 = k * (NJ + 1) + j, b1 = a1 + NJ + 1; idx.push(a1, b1, a1 + 1, a1 + 1, b1, b1 + 1); }
      const fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); fg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); fg.setIndex(idx);
      const fm = new THREE.Mesh(fg, new THREE.MeshBasicMaterial({ map: t, side: THREE.DoubleSide, transparent: true, alphaTest: 0.2, fog: false })); sc.add(fm); this.gateStuff.push(fm); this.weldFloor = fm; }
  }
  ringPos(s, x, y, out) { const a = s / KART.R, r = KART.R + x; return (out || new THREE.Vector3()).set(-KART.R + r * Math.cos(a), y, -r * Math.sin(a)); }
  bind(R) {                                                                                          // Race3D builds the item meshes; each goes into a holder that stands on the ring
    if (this.r3.bound !== R) this.r3.bind(R);
    if (this.holders) for (const h of this.holders) { this.scene.remove(h); h.traverse(o => { if (o.geometry) o.geometry.dispose(); const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : []; for (const m of ms) m.dispose(); }); }      /* (a restart rebuilds every holder: the old ones' GPU buffers are released, not leaked - three re-uploads the few shared ones on demand) */
    const chevG = new Map(), chev = k => { let g = chevG.get(k); if (!g) { const sh = new THREE.Shape(); sh.moveTo(-0.7 * k, -0.35 * k); sh.lineTo(0, 0.45 * k); sh.lineTo(0.7 * k, -0.35 * k); sh.lineTo(0.7 * k, -0.75 * k); sh.lineTo(0, 0.05 * k); sh.lineTo(-0.7 * k, -0.75 * k); sh.closePath(); g = new THREE.ShapeGeometry(sh); g.rotateX(-Math.PI / 2); chevG.set(k, g); } return g; };      /* (one geometry per size for ALL the speed tokens, not five per token) */
    const COL = ['#ff2a3a', '#c050ff', '#50ff30', '#d8ff20'], smoke = new THREE.MeshBasicMaterial({ color: '#0c1014', transparent: true, opacity: 0.42, side: THREE.DoubleSide, depthWrite: false });
    this.holders = this.r3.meshes.map((m, i) => { const it = R.items[i], h = new THREE.Group();
      if (it.type === 'spiral') {                                                                    // THE SPEED TOKENS shaped like the blue arrow bands (three chevrons with a rim, lit one after the other toward the front), in their own neon colours
        const col = new THREE.Color(COL[it.color]), rimC = col.clone().lerp(new THREE.Color('#ffffff'), 0.45), mk = chev;
        const fill = mk(1); const rimG = chevG.get('rim') || (chevG.set('rim', chev(1.22).clone().translate(0, -0.005, 0.02)), chevG.get('rim')); h.userData.chev = [];
        for (let k = 0; k < 3; k++) { const fm = new THREE.MeshBasicMaterial({ color: col, fog: false }), em = new THREE.MeshBasicMaterial({ color: rimC, fog: false }), gm = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
          const g3 = new THREE.Group(), glow = new THREE.Mesh(mk(1.6), gm); glow.position.y = -0.01; const f = new THREE.Mesh(fill, fm); f.position.y = 0.012; g3.add(glow, new THREE.Mesh(rimG, em), f); g3.position.z = -k * 1.25; g3.scale.setScalar(1.6); h.add(g3); h.userData.chev.push({ fm, em, gm, col, rimC }); }
        h.userData.flat = true;
      } else if (it.type === 'ramp') {                                                               // THE RAMPS re-made for the kart circuit (the user: they had lost their look): the race's ramp picture under a smoked
        const M = RACE.LANE_M, W = M * 1.1, L = 11, A = 0.34, H = L * Math.sin(A), D = L * Math.cos(A), z0 = 1.2, zc = z0 - D / 2, rg = new THREE.Group();      // black glass, its red and blue neon sides, no white band
        const pic = new THREE.Mesh(new THREE.PlaneGeometry(W, L), this.r3.rampMat), glass = new THREE.Mesh(new THREE.PlaneGeometry(W, L), smoke); pic.rotation.x = glass.rotation.x = -Math.PI / 2 + A; pic.position.set(0, H / 2 + 0.05, zc); glass.position.set(0, H / 2 + 0.09, zc);
        const pk = []; for (const s2 of [-1, 1]) pk.push(Kit.box(0.09, 0.09, L, s2 * W / 2, H / 2, zc, s2 < 0 ? '#ff2020' : '#2832ff', { glow: true, rx: A }));
        pk.push(Kit.box(W + 0.1, 0.09, 0.09, 0, H, z0 - D, '#39ff14', { glow: true }), ...Array.from({ length: 9 }, (_, k) => Kit.box(W / 9 + 0.02, 0.07, 0.2, -W / 2 + (k + 0.5) * W / 9, 0.02, z0, '#ff3fb0', { glow: true })));
        rg.add(pic, glass, Kit.mesh(Kit.merge(pk))); h.add(rg); m.visible = false; h.userData.ramp = true;
      } else h.add(m);
      this.scene.add(h); return h; }); this.bound = R;
  }
  draw(g, renderer) {
    const R = g.race; if (this.bound !== R) this.bind(R);
    const bt = g.sfx ? g.sfx.beat() : null, pulse = bt ? bt.pulse * (0.45 + 0.55 * bt.energy) : 0, t = g.time, p = R.p, air = p.air > 0 ? Math.sin(Math.PI * (1 - p.air / RACE.JUMP_T)) : 0;
    this.r3.placeItems(R, t, pulse); { const last = p.s >= (KART.LAPS - 1) * KART.LAP - 40; if (this.tunU) this.tunU.uGlassAll.value = last ? 1 : 0; if (this.tunClose) this.tunClose.visible = last; if (this.glassCeil) this.glassCeil.visible = p.s > KART.GATE_S + 60; if (this.vrSky) this.vrSky.visible = p.s > KART.GATE_S + 60; if (this.entRoad && this._gateShown) this.entRoad.visible = !last; }      /* the last lap: the whole tunnel is clear glass, a complete circle */ if (this.tunU) this.tunU.off.value = -t * 0.35;      /* the spiral flows along the tunnel */ const OFF = R.off(p.s), PX = p.x + OFF;
    { const lap = Math.min(KART.LAPS - 1, Math.floor(p.s / KART.LAP)), into = p.s - lap * KART.LAP;      // the lap: the tiles' colour, and the banking of lap 2 (in over its first 120 m, out over the last 120 m)
      if (lap !== this.tileLap) this.paintTiles(lap, t);
      // THE RED WAVE BRINGS THEM (the user: no illogical pop): from lap 3 the fence posts appear as the equalizer wave of the red colour passes them, and the gate when the wave reaches it
      const lap3 = p.s >= 2 * KART.LAP - 1, wf = !lap3 ? -1 : p.s >= 3 * KART.LAP - 1 || this.tileU.uFront.value > 1e8 && t - this.tileT0 > 14 ? 1e9 : (t - this.tileT0 - 1.2) * KART.EQ_V;      // (1.2 s after the red wave: the fence never cuts into the equalizer's passage, the user)      // (from lap 4 on, everything stays)
      { const show = (lap3 && wf >= KART.LAP - 20) || R.intro > 0; if (show !== this._gateShown) { this._gateShown = show; this.gateStuff.forEach(o => { o.visible = show; }); this.gapFill.forEach(o => { o.visible = !show; }); } }
      if (this.barriers) { if (this.barriers.visible) this.barriers.children.forEach(c => { if (c.userData.bx !== undefined) c.position.y = c.userData.y0 + this.bankY(c.userData.bx); }); this.barriers.visible = lap3 && p.s < KART.GATE_S + 200; if (this.barriers.visible && wf < 1e8) this.barriers.children.forEach(c => { if (c.userData.bs !== undefined) c.visible = c.userData.bs - 2 * KART.LAP < wf; else c.visible = wf >= KART.LAP - 20; }); else if (this.barriers.visible && !this._barAll) this.barriers.children.forEach(c => { c.visible = true; }); this._barAll = this.barriers.visible && wf >= 1e8; if (this.mergeMat) this.mergeMat.opacity = 0.45 + 0.45 * (Math.floor(t * 3) % 2); this.laserMats.forEach((m, k) => { m.opacity = 0.45 + 0.5 * Math.abs(Math.sin(t * 6 + k * 1.6)); }); }
      { const U = this.tileU; if (U.uFront.value < 1e8) { U.uFront.value = (t - this.tileT0) * KART.EQ_V; if (U.uFront.value > KART.LAP + 160) U.uFront.value = 1e9; }
        const Bq = bt || { beat: t * 2.262, energy: 0.6 }, bq = Math.floor(Bq.beat * 2), en = Math.max(0.2, Math.min(1, Bq.energy));
        for (let c = 0; c < 6; c++) { const hsh = Math.abs(Math.sin((bq * 7 + c * 13) * 12.9898) * 43758.5453) % 1; U.uBar.value[c] = 2 * Math.floor(hsh * en * 40); } }      // the equalizer: six bars, a new height every eighth note, in whole 2 m rows
      const L2 = KART.LAP, sm = v => { v = Math.max(0, Math.min(1, v)); return v * v * (3 - 2 * v); };
      this.setBank(lap === 1 || lap === 2 ? Math.min(sm(into / 120) * (1 + sm((into - (L2 - 520)) / 260)), 2 * sm((L2 - into) / 90)) : 0);      /* (lap 2: in over 120 m; then deeper, twice as low, over the last 520 m; back up to flat over the last 90 m, at the line) */
      this.gateK += ((R.gateOpen ? 1 : 0) - this.gateK) * 0.03; if (this.doors) this.doors.forEach(d => { d.position.z = d.userData.z0 * (1 + 1.9 * this.gateK); }); }
    // THE CIRCUIT DANCES TO 'ROAD NIGHT 2' (135.7 BPM, src3d/music_beats_kart.js): the tiles flash on every kick (harder on the bar's downbeat), the arrows step one chevron per eighth note
    // toward the front, the ceiling brightens with the loudness (dim in the breakdowns), Saturn's rings turn faster when the track is full
    const dtk = this._kt === undefined ? 0 : Math.min(0.1, Math.max(0, t - this._kt)); this._kt = t;
    const B = bt || { beat: t * 2.262, pulse: 0, energy: 0.6, kick: 0.5 }, en = Math.max(0, Math.min(1, B.energy)), kk = Math.max(0, Math.min(1, B.kick)), down = Math.floor(B.beat) % 4 === 0 ? 1.5 : 1;
    if (this.floorMat) this.floorMat.emissiveIntensity = 0.16 + 0.14 * en + 0.5 * B.pulse * kk * down;
    if (this.ceilMat && this.ceilMat.map) this.ceilMat.color.setScalar(0.62 + 0.3 * en + 0.12 * B.pulse);
    if (this.hallFx) { const F = this.hallFx, pp = B.pulse; F.core.scale.setScalar(1 + 0.08 * pp); F.halo.scale.setScalar(26 * (1 + 0.25 * pp + 0.1 * en)); F.beam.material.opacity = 0.3 + 0.4 * pp;
      F.rings.forEach((r, i) => r.m.material.color.copy(r.c).multiplyScalar(0.5 + 0.5 * (Math.floor(B.beat) % F.rings.length === i ? 1 : pp * 0.6)));
      F.screens.forEach((m, i) => { m.opacity = 0.55 + 0.3 * Math.abs(Math.sin(t * 3 + i * 1.7)) + 0.15 * pp; }); F.edges.forEach(e => e.material.color.setRGB(0.45 + 0.4 * pp, 0.2, 0.9)); }      // the hall breathes with the music
    if (this.machines) for (const m of this.machines) { const u = m.userData; m.rotation.z += dtk * u.spin; for (const q of u.inner) q.rotation.x += dtk * u.spin * 2.2; const b = 0.55 + 0.45 * B.pulse + 0.3 * en; u.glow.color.copy(u.col).multiplyScalar(b); u.core.material.color.copy(u.col).multiplyScalar(0.6 + 0.6 * B.pulse); u.halo.scale.setScalar(u.r2 * (1.5 + 0.5 * B.pulse)); }      // the engine room turns and pulses on the beat
    if (this.vent) this.vent.rotation.z += dtk * (0.02 + 0.22 * en);
    const step = Math.floor(B.beat * 2), sub = B.beat * 2 - step;
    this.arrowStep = { step, sub };
    if (this.tunLaser) this.tunLaser.forEach((m, k) => { m.opacity = 0.25 + 0.3 * Math.abs(Math.sin(t * 6 + k * 1.6)); });      // (fine and light)
    if (this.arrowMats) this.arrowMats.forEach((m, k) => { const lit = step % 3 === k % 3, b = lit ? 0.55 + 0.45 * (1 - sub) : 0.22; m.f.color.copy(m.fc).multiplyScalar(0.3 + 0.7 * b); m.e.color.copy(m.ec).multiplyScalar(0.4 + 0.6 * b); });
    if (this.centreLit) { this.centreLit[0].material.opacity = 0.7 + 0.3 * pulse + 0.1 * Math.sin(t * 2.2); const k = 1 + 0.05 * pulse; this.centreLit[1].scale.set(230 * k, 230 * k, 1); this.centreLit[1].material.opacity = 0.75 + 0.25 * pulse; }
    this.r3.meshes.forEach((m, i) => { const h = this.holders[i]; h.visible = m.visible; if (!m.visible) return; const s = -m.position.z; const mx = m.position.x + R.off(s); this.ringPos(s, mx, (h.userData.flat ? 0.1 : 0) + this.bankY(mx) + R.dep(s), h.position); h.rotation.y = s / KART.R; if (h.userData.flat) { h.scale.setScalar(s > KART.GATE_S ? 0.55 : 1);      /* (smaller in the tunnel, the user) */ h.userData.chev.forEach((c, k) => { const st = this.arrowStep || { step: 0, sub: 0 }, w = st.step % 3 === k ? 1 - st.sub : 0, b = 0.45 + 0.55 * w + 0.2 * pulse; c.fm.color.copy(c.col).multiplyScalar(b); c.em.color.copy(c.rimC).multiplyScalar(0.5 + 0.5 * b); c.gm.opacity = 0.2 + 0.4 * w * w; }); return; } m.position.set(0, m.position.y, 0); });
    const put = (o, s, x, y, yaw) => { this.ringPos(s, x, y + this.bankY(x) + R.dep(s), o.position); o.rotation.z = 0; o.rotation.set(0, s / KART.R + (yaw || 0), 0); };
    put(this.car, p.s, PX, 0.02 + air * 2.2, -(p.lane * RACE.LANE_M - p.x) * 0.04 - 0.6 * (R.off(p.s + 3) - R.off(p.s - 3)) / 6); if (R.bots) R.bots.forEach((b, i) => put(this.bots[i], b.s, b.x + R.off(b.s), 0.02, -0.6 * (R.off(b.s + 3) - R.off(b.s - 3)) / 6)); else { this.bot.visible = true; put(this.bot, R.bot.s, R.bot.x, 0.02); }
    const f = 64 + Math.min(14, p.speed - RACE.BASE) * 0.9; if (Math.abs(this.camera.fov - f) > 0.05) { this.camera.fov += (f - this.camera.fov) * 0.1; this.camera.updateProjectionMatrix(); }
    if (R.intro > 0) {                                                                                 // THE FLYOVER before the start (the user): high over the shops looking at the sphere in its rings, round the
      const u = 1 - R.intro / 7, e = v => { v = Math.max(0, Math.min(1, v)); return v * v * (3 - 2 * v); }, a = e(u / 0.8);     // roundabout to the gate beside the line, then down behind the kart
      const cs = p.s - 330 * (1 - a) - 4.6 * a, cx = 34 * (1 - a) + PX * 0.6 * a, cy = 34 * (1 - e(u / 0.85)) + 2.1 * e(u / 0.85);      /* (it ends exactly on the chase camera's pose) */
      this.ringPos(cs, cx, cy, this.camPos); this.camera.position.copy(this.camPos);
      const lk = new THREE.Vector3(-KART.R, 40, 0), gt = new THREE.Vector3(-8, 2, 0), ch = this.ringPos(p.s + 12, PX * 0.4, 0.9, this.v);
      if (u < 0.45) this.camera.lookAt(lk); else if (u < 0.8) this.camera.lookAt(lk.lerp(gt, e((u - 0.45) / 0.3))); else this.camera.lookAt(gt.lerp(ch, e((u - 0.8) / 0.2)));
    } else if (g.kartCam) {                                                                                   // THE SATURN VIEW (optional, V or a tap on the bars): outside the track, a little behind and above the kart, looking at it across the
      this.ringPos(p.s - 10, (p.x * 0.6 + OFF) + 2.4, 3.0 + air, this.camPos); this.camPos.y += this.bankY(PX) + R.dep(p.s);      /* (the user: the same view, only moved back 3 m, not turned) */                                                 // track toward the centre, so the sphere in its rings stands whole behind the kart
      if (this.camera.position.distanceTo(this.camPos) > 6) this.camera.position.copy(this.camPos); else this.camera.position.lerp(this.camPos, 0.5);
      this.camera.lookAt(this.ringPos(p.s + 9, (p.x * 0.5 + OFF) - 7, 1.6, this.v).setY(this.v.y + this.bankY(PX) + R.dep(p.s + 10)));
    } else {
    this.ringPos(p.s - 4.6, (p.x * 0.6 + OFF), 2.1 + air, this.camPos); this.camPos.y += this.bankY(PX) + R.dep(p.s); if (this.camera.position.distanceTo(this.camPos) > 6) this.camera.position.copy(this.camPos); else this.camera.position.lerp(this.camPos, 0.5);
    this.camera.lookAt(this.ringPos(p.s + 12, (p.x * 0.4 + OFF), 0.9 + air * 0.6, this.v).setY(this.v.y + this.bankY(PX) + R.dep(p.s + 10)));
    }
    const X = g.r && g.r.xr && g.r.xr.presenting ? g.r.xr : null;                                  // VR: the headset looks from a rig at the chase pose (behind the kart, heading along the ring); no pitch, no roll
    if (X) { const rg = X.rig('race'), dtx = Math.min(0.05, Math.max(0, t - (this._xrT === undefined ? t : this._xrT))) || 1 / 72; this._xrT = t; if (rg) { this.camera.position.set(0, 0, 0); this.camera.rotation.set(0, 0, 0); this.ringPos(p.s - 4.6, (p.x * 0.6 + OFF), 0, this.v); this.v.y += this.bankY(PX) + R.dep(p.s); X.placeKart(rg, this.v, p.s / KART.R, dtx); } }      /* VR: the headset looks from the XR rig mounted on THIS scene and camera (so the HUD panel, the controllers and the comfort vignette are drawn here too), at the chase pose behind the kart, heading along the ring, following the banked laps and the dive into the tunnel; no pitch, no roll */
    else this._xrT = undefined;
    // THE RIGHT-HAND VIEW (the user's 1D picture: 'what one sees on the right through the transparent tunnel'): a far backdrop that travels with the kart on its right side while it is in the glass
    // tunnel (lap 4 from its glass stretch, and lap 5), so the painting is seen as painted, through the glass, behind everything else
    renderer.render(this.scene, this.camera);
  }
}
