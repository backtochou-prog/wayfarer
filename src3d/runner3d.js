// Runner3D: the player avatar, the strawberry-man from the user's character painting.
// Proportions measured from the painting (height from the soles, 5.1 units to the top; the group is scaled to ~1.8 m):
//   black sneakers with pink trim 0-0.5 | long navy legs fading to pale blue at the ankles to 1.95 | navy belt with a ring, 1.98-2.12 |
//   one big glossy red strawberry body (broad rounded top, widest 2.28 at 3.9, tapering to a narrower flat bottom) with yellow seeds |
//   dark navy visor band 3.43-4.42 whose lower edge peaks in a V at the front | green calyx leaves fanning over the top | pink lips |
//   black oval panels at the sides, thin black arms with tiny red hands
// Built once from Kit parts, animated procedurally by rotating pivots (hips, knees, ankles, shoulders, elbows, torso).
// Origin = ground between the feet, facing -Z (the chase camera sees its back).
// States: 'play' run cycle / jump / slide, 'over' trip, 'pause' hold, 'title' a looping showcase for the main menu.
// slide pose: leaning back and squashed so the whole avatar stays under the ~1.05 m gap of an overhead gate
const SLIDE_Y = 1.3, SLIDE_RX = 1.6, SLIDE_SQ = 0.8;
class Runner3D {
  constructor() {
    const RED = '#ff2a2e', YELLOW_CAP = '#ff7a5c', NAVY = '#0c1a56', NAVY2 = '#102a7c', PALE = '#c8d8ff', BLACK = '#0b0b12', SHOE = '#1b1b24', PINK = '#e8386a', LIPS = '#ff2f86', HAND = '#d8262a', GREEN = '#46ff1c', LIME = '#c6ff3a', YEL = '#ffd60a';
    const mats = Kit.materials();
    // glossy, smooth-shaded body: normals averaged over shared vertices (so the berry is round, not faceted) and a Phong material with a specular highlight
    const gloss = new THREE.MeshPhongMaterial({ vertexColors: true, shininess: 70, specular: 0x666666 });
    const smooth = geo => {
      const P = geo.attributes.position.array, N = geo.attributes.normal.array, acc = new Map(), key = i => Math.round(P[i] * 1e3) + ',' + Math.round(P[i + 1] * 1e3) + ',' + Math.round(P[i + 2] * 1e3);
      for (let i = 0; i < P.length; i += 3) { const k = key(i); let a = acc.get(k); if (!a) acc.set(k, a = [0, 0, 0]); a[0] += N[i]; a[1] += N[i + 1]; a[2] += N[i + 2]; }
      for (let i = 0; i < P.length; i += 3) { const a = acc.get(key(i)), l = Math.hypot(a[0], a[1], a[2]) || 1; N[i] = a[0] / l; N[i + 1] = a[1] / l; N[i + 2] = a[2] / l; }
    };
    const mesh = parts => {
      for (const p of parts) if (!p.glow) smooth(p.geo);
      const m = Kit.merge(parts), g = new THREE.Group(); if (m.lit) g.add(new THREE.Mesh(m.lit, gloss)); if (m.glow) g.add(new THREE.Mesh(m.glow, mats.glow)); return g;
    };
    const pivot = (parent, x, y, z) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; };
    const UP = new THREE.Vector3(0, 1, 0), ONE = new THREE.Vector3(1, 1, 1), Q0 = new THREE.Quaternion(), V0 = new THREE.Vector3();
    // a free-form part from any THREE geometry (torus, tube): transform baked in, then merged like every other part
    const raw = (geo, color, pos, quat, scl, glow) => {
      geo.applyMatrix4(new THREE.Matrix4().compose(pos, quat, scl));
      const g = geo.toNonIndexed(); geo.dispose(); g.deleteAttribute('uv'); g.deleteAttribute('normal'); g.computeVertexNormals();
      return { geo: g, color, glow: !!glow };
    };
    const G = (part, bottom, pow) => (part.grad = bottom, part.gradPow = pow || 1, part);   // vertical gradient: the part's colour on top, `bottom` underneath (pow > 1 keeps `bottom` dominant)
    const RX = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2);
    const ring = (R, tube, y, zs, color, glow) => raw(new THREE.TorusGeometry(R, tube, 5, 30), color, new THREE.Vector3(0, y, 0), RX, new THREE.Vector3(1, zs, 1), glow);   // horizontal ring, zs squeezes it front-to-back

    // soft contact shadow on the road: lives in the scene (the renderer places it under the runner and shrinks it with jump height)
    this.shadow = new THREE.Mesh(new THREE.CircleGeometry(1, 24).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3, depthWrite: false }));
    this.shadow.renderOrder = 1; this.shadow.scale.set(0.5, 1, 0.42);
    this.HIP = 1.95;
    this.group = new THREE.Group();
    this.group.scale.setScalar(0.35);                              // 5.1 units -> 1.8 m
    this.root = pivot(this.group, 0, 0, 0);                        // spin (menu showcase)
    this.body = pivot(this.root, 0, this.HIP, 0);                  // bob / tilt, pivot at the hips
    const A = y => y - this.HIP;                                   // painting height (ground = 0) -> coordinates relative to the hip pivot

    // the strawberry body: a surface of revolution (half-width EA, half-depth EC), widest at YC; a broad rounded top (half-height BU) and a
    // lower half that tapers to a narrower flat bottom at Y0 (radius 0.58 EA there)
    const EA = 1.14, EC = 1.0, YC = 3.9, BU = 1.2, Y0 = 1.98, Y1 = 5.1, DZ = EC / EA;
    const eggR = y => y > YC ? EA * Math.sqrt(Math.max(0, 1 - Math.pow((y - YC) / BU, 2)))
                             : EA * (0.58 + 0.42 * Math.sqrt(Math.max(0, 1 - Math.pow((YC - y) / (YC - Y0), 1.7))));
    // a band of that surface between a bottom edge (constant or a function of the angle from the front) and a top edge, inflated by `infl`
    const shell = (yBot, yTop, infl, rows, segs, cap) => {
      const pos = [], P = (i, j) => {
        const f = 2 * Math.PI * i / segs, yb = typeof yBot === 'function' ? yBot(f) : yBot, y = yb + (yTop - yb) * j / rows, r = Math.max(0, eggR(y) + (y < Y1 - 0.001 ? infl : 0));
        return new THREE.Vector3(r * Math.sin(f), A(y), -r * DZ * Math.cos(f));
      };
      const tri = (a, b, c) => {                                                     // wound so the normal points away from the body's axis
        const n = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a)), m = new THREE.Vector3().add(a).add(b).add(c).divideScalar(3);
        m.y -= A(YC); if (n.dot(m) < 0) { const t = b; b = c; c = t; }
        pos.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
      };
      for (let j = 0; j < rows; j++) for (let i = 0; i < segs; i++) { const a = P(i, j), b = P(i + 1, j), c = P(i + 1, j + 1), d = P(i, j + 1); tri(a, b, c); tri(a, c, d); }
      if (cap) { const c = new THREE.Vector3(0, A(yBot), 0); for (let i = 0; i < segs; i++) tri(c, P(i, 0), P(i + 1, 0)); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals();
      return { geo: g, color: '#ffffff', glow: false };
    };
    const coat = (part, color, glow) => (part.color = color, part.glow = !!glow, part);
    // visor lower edge: a V peaking at the front (3.75), 3.43 at the sides and back
    const vBot = f => { const s = Math.sin(f), c = Math.cos(f); return c > 0 ? 3.43 + 0.32 * (1 - Math.min(1, Math.abs(s))) : 3.43; };
    const onEgg = (x, y, infl) => -DZ * Math.sqrt(Math.max(0, Math.pow(eggR(y) + (infl || 0), 2) - x * x));   // z of the front surface at (x, y)
    const K = 5.1 / 1055;                                          // painting pixels -> units
    const px = (u, v) => [(470 - u) * K, (1660 - v) * K];          // painting pixel -> (x, height); the painting's left is +x when seen from the front

    // legs: long navy limbs fading to pale blue at the ankle, hip pivot -> knee pivot -> ankle pivot -> black sneaker with pink trim.
    // The ankle counter-rotates against the leg so the shoe stays level instead of digging its toe into the road.
    this.hip = []; this.knee = []; this.ankle = [];
    for (const s of [-1, 1]) {
      const hip = pivot(this.body, s * 0.4, 0, 0);
      hip.add(mesh([G(Kit.cyl(0.26, 0.18, 0.62, 0, -0.62, 0, NAVY, { seg: 8 }), NAVY2)]));
      const knee = pivot(hip, 0, -0.62, 0);
      knee.add(mesh([G(Kit.cyl(0.18, 0.1, 0.88, 0, -0.88, 0, NAVY2, { seg: 8 }), PALE, 1.5)]));
      const ankle = pivot(knee, 0, -0.88, 0);
      const shoe = mesh([
        G(Kit.ico(0.32, 0, -0.25, -0.05, SHOE, { sx: 0.95, sy: 0.8, sz: 1.8, detail: 2 }), '#050508'),   // black upper
        Kit.ico(0.24, 0, -0.26, -0.5, PINK, { sx: 0.85, sy: 0.55, sz: 0.8, detail: 1 }),                  // pink toe cap
        Kit.cyl(0.2, 0.2, 0.07, 0, 0.0, 0.1, PINK, { seg: 8 }),                                          // pink collar round the ankle opening
        Kit.box(0.03, 0.05, 0.7, 0.3, -0.33, -0.05, PINK, { glow: true }), Kit.box(0.03, 0.05, 0.7, -0.3, -0.33, -0.05, PINK, { glow: true }),   // pink trim along the sides
        Kit.cyl(0.29, 0.28, 0.07, 0, -0.5, -0.06, PINK, { seg: 16, sz: 1.85 })]);                          // pink sole following the foot
      shoe.position.y = 0.1;                                                                             // sole bottom at -0.4: the soles touch the road
      ankle.add(shoe);
      this.hip.push(hip); this.knee.push(knee); this.ankle.push(ankle);
    }

    // torso group: the strawberry body (glare on the top fading into red), the visor band, belt, lips, seeds, side panels, calyx
    this.torso = pivot(this.body, 0, 0, 0);
    const berry = coat(shell(Y0, Y1, 0, 30, 32, true), YELLOW_CAP); G(berry, RED, 3.2); berry.gain = 1.8;
    const visor = coat(shell(vBot, 4.42, 0.03, 8, 40, false), '#12248a'); G(visor, '#050612');
    const parts = [berry, visor,
      ring(eggR(4.42) + 0.04, 0.026, A(4.42), DZ, YEL, true),                                              // thin yellow line along the top of the visor
      Kit.cyl(eggR(2.12) + 0.03, eggR(Y0) + 0.03, 0.14, 0, A(1.97), 0, '#141a55', { seg: 28, sz: DZ }),    // navy belt
      ring(eggR(2.14) + 0.03, 0.014, A(2.14), DZ, '#eaf0ff', true),                                        // thin white line above it
      raw(new THREE.TorusGeometry(0.17, 0.05, 6, 16), '#10143c', new THREE.Vector3(0, A(2.05), -0.7), Q0, ONE, false)];   // belt ring
    // seeds: only six small ones on each cheek (either side of the lips), placed a little unevenly and not mirrored
    for (const [x, y, sz] of [[0.5, 2.93, 0.048], [0.62, 2.8, 0.042], [0.52, 2.67, 0.046], [0.66, 2.96, 0.036], [0.45, 2.78, 0.037], [0.64, 2.61, 0.04],
                       [-0.52, 2.87, 0.044], [-0.63, 2.74, 0.05], [-0.48, 2.62, 0.04], [-0.62, 2.98, 0.038], [-0.44, 2.76, 0.035], [-0.65, 2.56, 0.037]])
      parts.push(Kit.ico(sz, x, A(y), onEgg(x, y, 0.006), '#ffd23a', { sy: 1.4, sz: 0.7, detail: 1, rz: (x * 7 + y * 3) % 1.2 - 0.6, glow: true }));
    // the back (what the chase camera sees): a dozen small seeds scattered irregularly (fixed pseudo-random sequence, kept apart, clear of the side panels)
    {
      let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      const placed = []; let tries = 0;
      while (placed.length < 12 && tries++ < 400) {
        const f = Math.PI + (rnd() - 0.5) * 2 * 1.1, y = 2.32 + rnd() * 0.95, r = eggR(y) + 0.006, x = r * Math.sin(f), z = -r * DZ * Math.cos(f);
        if (Math.abs(x) > 0.8) continue;
        if (placed.some(q => (q[0] - x) ** 2 + (q[1] - y) ** 2 + (q[2] - z) ** 2 < 0.32 * 0.32)) continue;
        placed.push([x, y, z]);
        parts.push(Kit.ico(0.028 + rnd() * 0.016, x, A(y), z, '#ffd23a', { sy: 1.4, sz: 0.7, detail: 1, ry: -f, rz: (rnd() - 0.5) * 1.2, glow: true }));
      }
    }
    { const [x, y] = px(375, 770); parts.push(Kit.ico(0.08, x, A(y), onEgg(x, y, 0.04), '#9fb4ff', { sx: 1.6, sz: 0.2, detail: 1, rz: 0.5, glow: true })); }   // the painting's white glare on the visor
    for (const s of [-1, 1]) {                                                                              // black oval side panels with a white inner edge and two buttons
      parts.push(Kit.ico(0.5, s * 1.0, A(2.7), -0.22, BLACK, { sx: 0.5, sy: 1.35, sz: 0.8, detail: 2, rz: -0.2 * s }));
      parts.push(Kit.box(0.025, 1.05, 0.03, s * 0.76, A(2.2), -0.7, '#f0f0ff', { glow: true, rz: -0.2 * s }));
      parts.push(Kit.ico(0.035, s * 0.98, A(3.05), -0.74, '#d9b13a', { glow: true }), Kit.ico(0.035, s * 1.0, A(2.85), -0.74, '#d9b13a', { glow: true }));
    }
    // the calyx: green pointed leaves fan out from the apex and lie over the dome, the front-left ones reaching down over the visor (as in the painting)
    const calyx = (psi, sEnd, w0) => {
      const N = 10, pos = [], rowsL = [], rowsR = [], side = new THREE.Vector3(-Math.sin(psi), 0, Math.cos(psi));
      for (let k = 0; k <= N; k++) {
        const u = k / N, sa = sEnd * u, f = 1.03 + 0.07 * u * u, w = w0 * Math.pow(1 - u, 0.7) * (0.75 + 0.25 * Math.min(1, u * 4));
        const c = new THREE.Vector3(EA * f * Math.sin(sa) * Math.cos(psi), A(YC + BU * f * Math.cos(sa)), EC * f * Math.sin(sa) * Math.sin(psi));
        rowsL.push(c.clone().addScaledVector(side, -w)); rowsR.push(c.clone().addScaledVector(side, w));
      }
      const tri = (a, b, c) => {
        const n = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a)), m = new THREE.Vector3().add(a).add(b).add(c).divideScalar(3);
        m.y -= A(YC); if (n.dot(m) < 0) { const t = b; b = c; c = t; }
        pos.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
      };
      for (let k = 0; k < N; k++) { tri(rowsL[k], rowsR[k], rowsR[k + 1]); tri(rowsL[k], rowsR[k + 1], rowsL[k + 1]); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals();
      return { geo: g, color: '#2fd01c', glow: false, gain: 1.7 };
    };
    for (let i = 0; i < 9; i++) {
      const psi = i * 2 * Math.PI / 9 + 0.2, toFrontLeft = Math.max(0, Math.cos(psi + 0.7));
      parts.push(calyx(psi, 1.05 + 0.45 * toFrontLeft, 0.32));
    }
    parts.push(Kit.ico(0.13, 0, A(Y1) + 0.02, 0, '#2fd01c', { sy: 0.8, detail: 1 }));        // stem nub at the apex
    this.torso.add(mesh(parts));
    // neon rim light along the visor (an inflated back-face copy glows round its silhouette)
    const rimMat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide });
    this.torso.add(new THREE.Mesh(Kit.merge([coat(shell(vBot, 4.42, 0.075, 8, 40, false), LIME, true)]).glow, rimMat));
    // lips: soft pink on the belly (pulses gently)
    this.eye = pivot(this.torso, ...(() => { const [x, y] = px(462, 1085); return [x, A(y), onEgg(x, y, 0.0)]; })());
    this.eye.add(mesh([Kit.ico(0.5, 0, 0, 0, LIPS, { sx: 0.82, sy: 0.2, sz: 0.1, detail: 1, rz: 0.08, glow: true }), Kit.ico(0.3, 0.05, 0.06, -0.01, '#ff5aa2', { sx: 1.0, sy: 0.25, sz: 0.1, detail: 1, rz: 0.12, glow: true })]));
    this.head = this.torso;                                       // (no separate head: nod / tilt move the whole body)

    // arms: thin black tubes from the shoulders with tiny red hands (they hang out and down like the painting's)
    this.arm = []; this.fore = [];
    for (const s of [-1, 1]) {
      const sh = pivot(this.torso, s * 1.0, A(3.3), 0);
      sh.add(mesh([Kit.ico(0.2, 0, 0, 0, BLACK, { detail: 1 }), Kit.cyl(0.17, 0.13, 0.65, 0, -0.65, 0, BLACK, { seg: 8 })]));
      const fo = pivot(sh, 0, -0.65, 0);
      fo.add(mesh([Kit.cyl(0.13, 0.09, 0.6, 0, -0.6, 0, BLACK, { seg: 8 }), Kit.ico(0.13, 0, -0.72, 0, HAND, { sy: 1.8, detail: 1 })]));
      this.arm.push(sh); this.fore.push(fo);
    }
    this.phase = 0;
    this.cur = { y: this.HIP, rx: 0, rz: 0, hl: 0, hr: 0, kl: 0, kr: 0, al: 0, ar: 0, alz: 0, arz: 0, nod: 0, tilt: 0, sq: 1 };   // sq = vertical squash (crouch while sliding)
    this.tgt = Object.assign({}, this.cur);
  }

  update(dt, s) {
    if (s.state === 'pause') return;                                   // hold the pose
    const c = this.cur, t = this.tgt, H = this.HIP, F = H / 0.72;       // F scales the old metre-based offsets to these units
    if (s.state !== 'over') this.phase += dt * s.runRate * Math.PI * 2;
    const sn = Math.sin(this.phase), T = s.time;
    let spin = 0; t.sq = 1;
    if (s.state === 'over') {                                          // tripped: tipped forward, limbs splayed
      t.y = 0.5; t.rx = -1.3; t.rz = 0.12; t.hl = 0.3; t.hr = -0.25; t.kl = -0.5; t.kr = -0.2; t.al = 2.6; t.ar = 2.3; t.alz = -0.5; t.arz = 0.5; t.nod = 0.4; t.tilt = 0.2;
    } else if (s.state === 'title') {                                  // showcase loop (10 s): idle, wave, spin, dance, run in place
      const u = T % 10;
      t.rx = 0; t.rz = 0; t.nod = 0; t.tilt = 0; t.hl = t.hr = t.kl = t.kr = 0; t.alz = -0.6; t.arz = 0.6; t.al = t.ar = 0; t.y = H + Math.sin(T * 2.2) * 0.025;
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
      t.y = SLIDE_Y; t.rx = SLIDE_RX; t.sq = SLIDE_SQ; t.rz = 0; t.hl = 0.26; t.hr = 0.3; t.kl = -0.15; t.kr = -0.35; t.al = 1.4; t.ar = 1.2; t.alz = -0.55; t.arz = 0.55; t.nod = -0.2; t.tilt = 0;
    } else if (s.airborne) {                                           // tucked jump, arms up; legs open again on the way down
      const rise = s.vy > 0 ? 1 : 0.4;
      t.y = H; t.rx = -0.1; t.rz = -s.lean * 0.2; t.hl = 0.95 * rise + 0.2; t.hr = 0.55 * rise; t.kl = -1.5 * rise - 0.2; t.kr = -1.2 * rise - 0.3;
      t.al = 0.4; t.ar = 0.4; t.alz = -2.2; t.arz = 2.2; t.nod = 0; t.tilt = 0;
    } else {                                                           // run cycle
      t.y = H + Math.abs(sn) * 0.09; t.rx = -0.12; t.rz = -s.lean * 0.2;
      t.hl = sn * 0.85; t.hr = -sn * 0.85;
      t.kl = -(0.15 + 1.1 * Math.max(0, -sn)); t.kr = -(0.15 + 1.1 * Math.max(0, sn));
      t.al = -sn * 0.7; t.ar = sn * 0.7; t.alz = -0.6; t.arz = 0.6; t.nod = Math.abs(sn) * 0.05; t.tilt = 0;
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
    this.torso.rotation.x = c.nod; this.torso.rotation.z = c.tilt;
    this.eye.scale.setScalar(1 + Math.sin(T * 4) * 0.05);              // the lips breathe
  }
}
