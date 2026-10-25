// Runner3D: the player avatar, the neon egg-bot from the character sheet.
// Proportions measured from the sheet's front view (height from the soles, ~5.4 units incl. the crown):
//   sneakers 0-0.55 | thin legs to 1.1 | blue/pink bowl hip 1.1-2.0 | black chest between two magenta pill panels 1.95-2.95 |
//   visor band 2.95-3.65 (as wide as the torso, yellow ring eye) | pointed glossy-black dome to 4.45 | propeller crown of 8 leaves above
// Built once from Kit parts (units, then the group is scaled to ~2 m tall); animated procedurally by rotating pivots.
// Origin = ground between the feet, facing -Z (the chase camera sees its back).
// States: 'play' run cycle / jump / slide, 'over' trip, 'pause' hold, 'title' a looping showcase for the main menu.
// slide pose: leaning back and squashed so the whole avatar stays under the ~1.05 m gap of an overhead gate
const SLIDE_Y = 1.0, SLIDE_RX = 1.6, SLIDE_SQ = 0.8, SLIDE_CR = 0.45;   // SLIDE_CR: the frond crown folds down so it does not trail into the road
class Runner3D {
  constructor() {
    const BODY = '#2a2060', GLASS = '#04020c', MAG = '#ff1fd0', MAG_N = '#ff3fe0', VIO = '#5a2cff', BLUE = '#2e5cff', YEL = '#ffd60a', WHITE = '#f4f0ff', CYAN = '#35e0ff', FROND = '#3a1fb0';
    const mats = Kit.materials();
    const mesh = parts => { const m = Kit.merge(parts), g = new THREE.Group(); if (m.lit) g.add(new THREE.Mesh(m.lit, mats.lit)); if (m.glow) g.add(new THREE.Mesh(m.glow, mats.glow)); return g; };
    const pivot = (parent, x, y, z) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; };
    // a free-form part from any THREE geometry (blades, torus): transform baked in, then merged like every other part
    const raw = (geo, color, pos, quat, scl, glow) => {
      geo.applyMatrix4(new THREE.Matrix4().compose(pos, quat, scl));
      const g = geo.toNonIndexed(); geo.dispose(); g.deleteAttribute('uv'); g.deleteAttribute('normal'); g.computeVertexNormals();
      return { geo: g, color, glow: !!glow };
    };
    const UP = new THREE.Vector3(0, 1, 0), ONE = new THREE.Vector3(1, 1, 1), Q0 = new THREE.Quaternion();
    const blade = (base, az, tilt, len, w, color, glow) => {   // thin four-sided blade leaning out from `base`
      const d = new THREE.Vector3(Math.sin(tilt) * Math.sin(az), Math.cos(tilt), Math.sin(tilt) * Math.cos(az));
      const c = base.clone().addScaledVector(d, len / 2);
      return raw(new THREE.ConeGeometry(w, len, 4), color, c, new THREE.Quaternion().setFromUnitVectors(UP, d), new THREE.Vector3(1, 1, 0.3), glow);
    };
    const DOWN = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI);
    const drop = (len, w, color, glow, y0) => raw(new THREE.ConeGeometry(w, len, 4), color, new THREE.Vector3(0, y0 - len / 2, 0), DOWN, new THREE.Vector3(1, 1, 0.3), glow);

    this.HIP = 1.33;
    this.group = new THREE.Group();
    this.group.scale.setScalar(0.39);                              // 5.1 units -> ~2 m including the fronds, ~1.7 m to the top of the head
    this.root = pivot(this.group, 0, 0, 0);                        // spin (menu showcase)
    this.body = pivot(this.root, 0, this.HIP, 0);                  // bob / tilt, pivot at the hips

    // curved, tapering leaf (a thin lens-section strip along an arc): the frond and arm blade of the sheet.
    // From `base` it leaves at azimuth `az`, `tilt` rad from vertical, bending by `curl` rad over its length (+ = outward/down),
    // with an optional sideways S-wave. w = half-width, th = half-thickness at the widest point.
    const leaf = (base, az, tilt, len, w, th, curl, wave, color, glow) => {
      const N = 8, sx = Math.sin(az), cz = Math.cos(az), side = new THREE.Vector3(cz, 0, -sx), p = base.clone(), pos = [], ring = [];
      for (let i = 0; i <= N; i++) {
        const t = i / N, a = tilt + curl * t, tan = new THREE.Vector3(Math.sin(a) * sx, Math.cos(a), Math.sin(a) * cz);
        if (i) p.addScaledVector(new THREE.Vector3(Math.sin(a) * sx, Math.cos(a), Math.sin(a) * cz), len / N);
        const f = Math.pow(Math.sin(Math.PI * Math.min(1, t * 0.85 + 0.15)), 0.8), c = p.clone().addScaledVector(side, wave * Math.sin(t * Math.PI * 3) * t);
        const n = new THREE.Vector3().crossVectors(tan, side).normalize();
        ring.push([c.clone().addScaledVector(side, w * f), c.clone().addScaledVector(n, th * f), c.clone().addScaledVector(side, -w * f), c.clone().addScaledVector(n, -th * f)]);
      }
      const tri = (a, b, c) => pos.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
      for (let i = 0; i < N; i++) for (let k = 0; k < 4; k++) {
        const a = ring[i][k], b = ring[i][(k + 1) % 4], c = ring[i + 1][(k + 1) % 4], d = ring[i + 1][k];
        tri(a, b, c); tri(a, c, d); tri(a, c, b); tri(a, d, c);                    // both windings: visible from any side
      }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals();
      return { geo: g, color, glow: !!glow };
    };
    const ring = (R, tube, y, zs, color, x0, z0) => raw(new THREE.TorusGeometry(R, tube, 5, 30), color, new THREE.Vector3(x0 || 0, y, z0 || 0), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2), new THREE.Vector3(1, zs, 1), true);
    const GLOSS = '#ffe3ff';                                                       // pale specular streaks: the glossy look
    const spec = (x, y, z, sx, sy, rz) => Kit.ico(0.3, x, y, z, GLOSS, { sx, sy, sz: 0.1, detail: 1, rz: rz || 0, glow: true });

    // Measured from the sheet's front view (ground = 0, units): sneakers 0-0.55 | thin legs 0.55-1.1 | blue/pink bowl hip 1.1-2.0 |
    // magenta pill panels around a black chest 1.95-2.95 | visor band 2.95-3.65 (as wide as the torso) | pointed black dome to 4.45 | crown of leaves to ~5.4.
    // `A` converts those heights to coordinates relative to the hip pivot (HIP = 1.33).
    const A = y => y - 1.33;
    const G = (part, bottom, pow) => (part.grad = bottom, part.gradPow = pow || 1, part);   // vertical gradient: the part's colour on top, `bottom` underneath (pow > 1 keeps `bottom` dominant)
    const DOME = '#1c1248', CHEST = '#150d38';
    // neon rim light: an inflated copy of a part drawn back-faces-only in a glow colour = a bright outline around its silhouette
    const rimMat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide });
    const hull = parts => new THREE.Mesh(Kit.merge(parts).glow, rimMat);
    const RX = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2), RZ = a => new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), a);
    const arc = (R, tube, y, span, color) => raw(new THREE.TorusGeometry(R, tube, 5, 22, span), color, new THREE.Vector3(0, y, 0), RX.clone().multiply(RZ(1.5 * Math.PI - span / 2)), ONE, true);   // arc centred on the front (-Z)

    // legs: thin black limbs, hip pivot -> knee pivot -> ankle pivot -> chunky neon sneaker with white cuff.
    // The ankle counter-rotates against the leg so the shoe stays level instead of digging its toe into the road.
    this.hip = []; this.knee = []; this.ankle = [];
    for (const s of [-1, 1]) {
      const hip = pivot(this.body, s * 0.4, 0, 0);
      hip.add(mesh([Kit.cyl(0.075, 0.07, 0.38, 0, -0.38, 0, GLASS, { seg: 6 })]));
      const knee = pivot(hip, 0, -0.38, 0);
      knee.add(mesh([Kit.cyl(0.07, 0.065, 0.5, 0, -0.5, 0, GLASS, { seg: 6 }), Kit.cyl(0.2, 0.18, 0.16, 0, -0.6, 0, WHITE, { seg: 8, glow: true })]));   // shin + glowing white sock cuff
      const ankle = pivot(knee, 0, -0.5, 0);
      const shoe = mesh([
        G(Kit.ico(0.36, 0, -0.2, -0.08, '#ff48e4', { sx: 0.96, sy: 0.72, sz: 1.75, detail: 2 }), '#d0149a'),                 // sneaker body: a long glossy ellipsoid
        Kit.ico(0.3, 0, -0.17, -0.5, MAG_N, { sx: 0.95, sy: 0.7, sz: 0.95, detail: 1 }),                 // toe cap
        Kit.ico(0.28, 0, 0.0, 0.2, MAG, { sx: 0.95, sy: 1.1, sz: 0.8, detail: 1 }),                      // high-top heel / ankle
        Kit.ico(0.2, 0, 0.0, -0.3, BLUE, { sx: 0.8, sy: 0.5, sz: 1.2, detail: 1 }),                      // tongue
        Kit.box(0.04, 0.07, 0.8, s * 0.35, -0.3, -0.1, YEL, { glow: true }), Kit.box(0.04, 0.07, 0.8, -s * 0.35, -0.3, -0.1, YEL, { glow: true }),   // yellow side trim
        Kit.cyl(0.36, 0.34, 0.08, 0, -0.47, -0.08, WHITE, { seg: 16, sz: 1.78 }),                         // white midsole following the foot
        Kit.cyl(0.4, 0.38, 0.03, 0, -0.5, -0.08, YEL, { seg: 16, sz: 1.78, glow: true }),                  // neon yellow outsole outline
        Kit.box(0.3, 0.04, 0.09, 0, 0.1, -0.3, CYAN, { glow: true }), Kit.box(0.28, 0.04, 0.09, 0, 0.05, -0.46, CYAN, { glow: true }), Kit.box(0.24, 0.04, 0.09, 0, 0.0, -0.62, CYAN, { glow: true }),   // laces
        Kit.ico(0.12, s * 0.33, -0.2, 0.05, WHITE, { sx: 0.3, sy: 1, sz: 1, detail: 1, glow: true })]);   // round side emblem
      shoe.position.y = 0.1;                                                                            // outsole bottom at -0.4: the soles touch the road
      ankle.add(shoe);
      this.hip.push(hip); this.knee.push(knee); this.ankle.push(ankle);
    }

    // torso group: wide pink collar + tapering blue bowl (hip), then a deep black chest between two big magenta->blue pill panels
    this.torso = pivot(this.body, 0, 0, 0);
    const SIDE = [-1, 1];
    this.torso.add(mesh([
      G(Kit.ico(0.8, 0, A(1.5), 0, '#ff4ae8', { sx: 0.95, sy: 0.55, sz: 0.84, detail: 2 }), '#2a5cff', 2.6),    // bowl: pink at the rim fading to blue
      Kit.ico(0.5, -0.3, A(1.68), -0.3, MAG, { sx: 0.9, sy: 0.7, sz: 0.55, detail: 2 }),                    // magenta patch, front left
      Kit.cyl(0.8, 0.76, 0.04, 0, A(2.0), 0, MAG_N, { seg: 20, glow: true, sz: 0.88 }),                    // waist neon ring
      Kit.ico(0.8, 0, A(2.45), 0, CHEST, { sx: 0.95, sy: 0.62, sz: 0.86, detail: 2 }),                    // chest
      ...SIDE.flatMap(s => [
        G(Kit.ico(0.5, s * 0.66, A(2.42), 0, '#ff3cf0', { sx: 0.78, sy: 1.0, sz: 1.25, detail: 2 }), '#4a52ff'),   // tall pill panel, magenta fading to blue
        spec(s * 0.8, A(2.5), -0.42, 0.3, 0.9, s * -0.1)]),
      Kit.box(0.8, 0.95, 0.06, 0, A(1.97), -0.68, GLASS), Kit.box(0.8, 0.95, 0.06, 0, A(1.97), 0.68, GLASS),   // black front / back panels
      raw(new THREE.TorusGeometry(0.34, 0.022, 4, 18, Math.PI), VIO, new THREE.Vector3(0, A(2.4), -0.725), RZ(Math.PI), new THREE.Vector3(1, 0.5, 1), true),   // mouth: lower lip ...
      raw(new THREE.TorusGeometry(0.34, 0.022, 4, 18, Math.PI), VIO, new THREE.Vector3(0, A(2.4), -0.725), Q0, new THREE.Vector3(1, 0.3, 1), true),           // ... and upper lip make a lens
      Kit.box(0.78, 0.025, 0.03, 0, A(2.15), -0.73, VIO, { glow: true }), Kit.box(0.78, 0.025, 0.03, 0, A(2.08), -0.73, BLUE, { glow: true }), Kit.box(0.78, 0.025, 0.03, 0, A(2.01), -0.73, MAG_N, { glow: true })]));
    this.torso.add(hull([...SIDE.map(s => Kit.ico(0.54, s * 0.66, A(2.42), 0, MAG_N, { sx: 0.8, sy: 1.0, sz: 1.25, detail: 2, glow: true })),
                         Kit.ico(0.84, 0, A(1.5), 0, '#a05cff', { sx: 0.96, sy: 0.57, sz: 0.86, detail: 2, glow: true })]));

    // head pivot (nod / tilt) at the bottom of the visor: visor band as wide as the torso, pointed black dome above it, yellow ring eye, crown of leaves
    this.head = pivot(this.torso, 0, A(2.95), 0);
    const hd = [
      Kit.cyl(0.98, 1.0, 0.7, 0, 0, 0, GLASS, { seg: 24, sx: 1.05, sz: 0.97 }),                           // visor band
      G(Kit.ico(1.0, 0, 0.7, 0, '#2c1a78', { sx: 0.93, sy: 0.86, sz: 0.88, detail: 2 }), '#0b0624'),        // black dome with a violet sheen at the top (lower half hidden in the visor)
      ring(1.03, 0.05, 0.69, 0.92, BLUE), ring(1.04, 0.04, 0.6, 0.92, MAG_N),                             // glowing rims along the top edge
      ring(1.03, 0.045, 0.03, 0.92, MAG_N),                                                                // bottom rim
      arc(1.0, 0.04, 0.07, 2.4, YEL)];                                                                     // thin yellow curve along the lower front edge
    this.head.add(mesh(hd));
    this.head.add(hull([Kit.cyl(1.0, 1.02, 0.78, 0, -0.04, 0, MAG_N, { seg: 24, sx: 1.08, sz: 1.0, glow: true }),
                        Kit.ico(1.0, 0, 0.7, 0, '#6a46ff', { sx: 0.96, sy: 0.9, sz: 0.91, detail: 2, glow: true })]));
    // crown: 8 long curved leaves fanning out from the apex like a propeller (top view of the sheet), the tallest rising ~1 unit
    const base = new THREE.Vector3(), cr = [];
    const FR = [[0.2, 0.7, 1.5, 0.6, VIO, 1], [0.95, 1.15, 1.35, 0.5, BLUE, 0], [1.75, 0.8, 1.55, 0.6, VIO, 1], [2.5, 1.2, 1.3, 0.5, BLUE, 0],
                [3.3, 0.75, 1.5, 0.6, VIO, 1], [4.05, 1.15, 1.35, 0.5, BLUE, 0], [4.85, 0.85, 1.55, 0.6, VIO, 1], [5.6, 1.2, 1.3, 0.5, BLUE, 0]];
    for (const [az, tilt, len, curl, col, rim] of FR) {
      cr.push(leaf(base, az, tilt, len, 0.23, 0.05, curl, 0, col, false));
      if (rim) cr.push(leaf(base, az, tilt, len * 0.98, 0.06, 0.1, curl, 0, MAG_N, true));                // glowing magenta spine
    }
    this.crown = pivot(this.head, 0, 1.42, 0); this.crown.add(mesh(cr));
    this.eye = pivot(this.head, 0, 0.45, -0.97);
    this.eye.add(mesh([raw(new THREE.TorusGeometry(0.2, 0.055, 6, 18), YEL, new THREE.Vector3(), Q0, ONE, true),
                       Kit.box(0.14, 0.05, 0.04, 0.2, -0.24, 0, YEL, { glow: true })]));

    // small leaf-blade arms at the sides of the torso; the one on the sheet's left (+x here) ends in a long wavy ribbon
    this.arm = []; this.fore = [];
    const AD = new THREE.Vector3(0, 0, 0);
    for (const s of [-1, 1]) {
      const sh = pivot(this.torso, s * 1.0, A(2.74), 0);
      sh.add(mesh([leaf(AD, 0, Math.PI - 0.1, 0.75, 0.2, 0.05, s * 0.3, 0, BLUE, false), leaf(AD, 0, Math.PI - 0.1, 0.73, 0.045, 0.1, s * 0.3, 0, MAG_N, true)]));
      const fo = pivot(sh, 0, -0.7, 0);
      fo.add(s > 0 ? mesh([leaf(AD, 0, Math.PI, 1.5, 0.09, 0.04, 0, 0.16, VIO, false), leaf(AD, 0, Math.PI, 1.45, 0.03, 0.06, 0, 0.16, MAG_N, true)])
                   : mesh([leaf(AD, 0, Math.PI - 0.1, 0.55, 0.17, 0.05, 0.3, 0, VIO, false), leaf(AD, 0, Math.PI - 0.1, 0.53, 0.04, 0.09, 0.3, 0, MAG_N, true)]));
      this.arm.push(sh); this.fore.push(fo);
    }
    this.phase = 0;
    this.cur = { y: this.HIP, rx: 0, rz: 0, hl: 0, hr: 0, kl: 0, kr: 0, al: 0, ar: 0, alz: 0, arz: 0, nod: 0, tilt: 0, sq: 1, cr: 1 };   // sq = vertical squash (crouch while sliding)
    this.tgt = Object.assign({}, this.cur);
  }

  update(dt, s) {
    if (s.state === 'pause') return;                                   // hold the pose
    const c = this.cur, t = this.tgt, H = this.HIP, F = H / 0.72;       // F scales the old metre-based offsets to these units
    if (s.state !== 'over') this.phase += dt * s.runRate * Math.PI * 2;
    const sn = Math.sin(this.phase), T = s.time;
    let spin = 0; t.sq = 1; t.cr = 1;
    if (s.state === 'over') {                                          // tripped: tipped forward, limbs splayed
      t.y = 0.5; t.rx = -1.3; t.rz = 0.12; t.hl = 0.3; t.hr = -0.25; t.kl = -0.5; t.kr = -0.2; t.al = 2.6; t.ar = 2.3; t.alz = -0.5; t.arz = 0.5; t.nod = 0.4; t.tilt = 0.2;
    } else if (s.state === 'title') {                                  // showcase loop (10 s): idle, wave, spin, dance, run in place
      const u = T % 10;
      t.rx = 0; t.rz = 0; t.nod = 0; t.tilt = 0; t.hl = t.hr = t.kl = t.kr = 0; t.alz = -0.12; t.arz = 0.12; t.al = t.ar = 0; t.y = H + Math.sin(T * 2.2) * 0.025;
      if (u < 2) { t.tilt = Math.sin(T * 1.3) * 0.1; t.rz = Math.sin(T * 1.1) * 0.02; }
      else if (u < 4) { t.arz = 2.45 + Math.sin(T * 11) * 0.3; t.ar = 0; t.tilt = -0.18; t.rz = 0.05; t.nod = -0.08; }          // wave
      else if (u < 5.4) {                                                                                                             // spin with a hop
        const f = (u - 4) / 1.4, e = f * f * (3 - 2 * f); spin = e * Math.PI * 2;
        t.y = H + Math.sin(Math.PI * f) * 0.5; t.hl = 0.5; t.hr = 0.3; t.kl = -0.9; t.kr = -0.7; t.alz = -1.3; t.arz = 1.3;
      } else if (u < 7.6) {                                                                                                           // dance
        const b = Math.sin(T * 8);
        t.y = H - 0.1 + Math.abs(b) * 0.16; t.kl = t.kr = -0.45; t.hl = 0.2 * b; t.hr = -0.2 * b; t.rz = b * 0.1; t.tilt = -b * 0.18;
        t.al = -b * 0.9; t.ar = b * 0.9; t.alz = -0.9; t.arz = 0.9; t.nod = Math.abs(b) * 0.12;
      } else {                                                                                                                        // run in place
        t.y = H + Math.abs(sn) * 0.09; t.rx = -0.1; t.hl = sn * 0.85; t.hr = -sn * 0.85;
        t.kl = -(0.15 + 1.1 * Math.max(0, -sn)); t.kr = -(0.15 + 1.1 * Math.max(0, sn)); t.al = -sn * 0.7; t.ar = sn * 0.7; t.alz = -0.2; t.arz = 0.2;
      }
    } else if (s.sliding) {                                            // feet-first slide, leaning back
      t.y = SLIDE_Y; t.rx = SLIDE_RX; t.sq = SLIDE_SQ; t.cr = SLIDE_CR; t.rz = 0; t.hl = 0.26; t.hr = 0.3; t.kl = -0.15; t.kr = -0.35; t.al = 1.4; t.ar = 1.2; t.alz = -0.55; t.arz = 0.55; t.nod = -0.2; t.tilt = 0;
    } else if (s.airborne) {                                           // tucked jump, arms up; legs open again on the way down
      const rise = s.vy > 0 ? 1 : 0.4;
      t.y = H; t.rx = -0.1; t.rz = -s.lean * 0.2; t.hl = 0.95 * rise + 0.2; t.hr = 0.55 * rise; t.kl = -1.5 * rise - 0.2; t.kr = -1.2 * rise - 0.3;
      t.al = 0.4; t.ar = 0.4; t.alz = -2.2; t.arz = 2.2; t.nod = 0; t.tilt = 0;
    } else {                                                           // run cycle
      t.y = H + Math.abs(sn) * 0.09; t.rx = -0.12; t.rz = -s.lean * 0.2;
      t.hl = sn * 0.85; t.hr = -sn * 0.85;
      t.kl = -(0.15 + 1.1 * Math.max(0, -sn)); t.kr = -(0.15 + 1.1 * Math.max(0, sn));
      t.al = -sn * 0.7; t.ar = sn * 0.7; t.alz = -0.2; t.arz = 0.2; t.nod = Math.abs(sn) * 0.05; t.tilt = 0;
    }
    const k = 1 - Math.exp(-(s.sliding ? 60 : 15) * dt);   // the crouch is near-instant: the game counts a slide from the first frame
    for (const key in c) c[key] += (t[key] - c[key]) * k;
    this.root.rotation.y = spin; this.root.scale.y = c.sq;
    this.body.position.y = c.y; this.body.rotation.x = c.rx; this.body.rotation.z = c.rz;
    this.hip[0].rotation.x = c.hl; this.hip[1].rotation.x = c.hr;
    this.knee[0].rotation.x = c.kl; this.knee[1].rotation.x = c.kr;
    this.ankle[0].rotation.x = -(c.hl + c.kl) * 0.95; this.ankle[1].rotation.x = -(c.hr + c.kr) * 0.95;   // keep the soles level
    this.arm[0].rotation.x = c.al; this.arm[1].rotation.x = c.ar; this.arm[0].rotation.z = c.alz; this.arm[1].rotation.z = c.arz;
    this.fore[0].rotation.x = Math.sin(T * 9) * 0.3 - 0.15; this.fore[1].rotation.x = Math.sin(T * 9 + 1.7) * 0.3 - 0.15;   // loose forearms flutter
    this.fore[0].rotation.z = Math.sin(T * 7) * 0.25; this.fore[1].rotation.z = -Math.sin(T * 7 + 1) * 0.25;
    this.head.rotation.x = c.nod; this.head.rotation.z = c.tilt; this.crown.scale.setScalar(c.cr);
    this.eye.scale.setScalar(1 + Math.sin(T * 4) * 0.07);              // the ring eye pulses
  }
}
