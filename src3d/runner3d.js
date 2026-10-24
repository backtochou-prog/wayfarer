// Runner3D: the player avatar, the neon egg-bot from the character sheet.
// Proportions follow the sheet's front view (height from the soles, 5.1 units incl. fronds):
//   sneakers 0-0.5 | thin legs 0.5-1.25 | blue/magenta hip bulb 1.25-2.0 | magenta+black torso 2.0-2.95 |
//   tall glossy-black egg head 2.95-4.45 with a wide visor band over its lower half and a yellow ring eye | frond crown to 5.1
// Built once from Kit parts (units, then the group is scaled to ~2 m tall); animated procedurally by rotating pivots.
// Origin = ground between the feet, facing -Z (the chase camera sees its back).
// States: 'play' run cycle / jump / slide, 'over' trip, 'pause' hold, 'title' a looping showcase for the main menu.
// slide pose: leaning back and squashed so the whole avatar stays under the ~1.05 m gap of an overhead gate
const SLIDE_Y = 1.0, SLIDE_RX = 1.6, SLIDE_SQ = 0.8;
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

    // legs: thin black limbs, hip pivot -> knee pivot -> ankle pivot -> chunky neon sneaker with white cuff.
    // The ankle counter-rotates against the leg so the shoe stays level instead of digging its toe into the road.
    this.hip = []; this.knee = []; this.ankle = [];
    for (const s of [-1, 1]) {
      const hip = pivot(this.body, s * 0.4, 0, 0);
      hip.add(mesh([Kit.cyl(0.075, 0.07, 0.38, 0, -0.38, 0, GLASS, { seg: 6 })]));
      const knee = pivot(hip, 0, -0.38, 0);
      knee.add(mesh([Kit.cyl(0.07, 0.065, 0.5, 0, -0.5, 0, GLASS, { seg: 6 }), Kit.cyl(0.17, 0.16, 0.12, 0, -0.56, 0, WHITE, { seg: 7 })]));   // shin + ankle cuff
      const ankle = pivot(knee, 0, -0.5, 0);
      ankle.add(mesh([
        Kit.box(0.6, 0.3, 0.8, 0, -0.37, 0.0, MAG), Kit.ico(0.3, 0, -0.24, -0.45, MAG_N, { sx: 1.0, sy: 0.75, sz: 1.35 }),   // shoe + rounded toe cap
        Kit.box(0.62, 0.2, 0.3, 0, -0.12, 0.22, VIO),                                                  // heel collar
        Kit.box(0.66, 0.06, 1.2, 0, -0.4, -0.12, YEL, { glow: true }),                                 // neon sole
        Kit.box(0.34, 0.04, 0.3, 0, 0.0, -0.3, CYAN, { glow: true })]));                               // laces
      this.hip.push(hip); this.knee.push(knee); this.ankle.push(ankle);
    }

    // torso group: blue hip bulb, magenta side panels around a black chest with mouth slit and trim lines
    this.torso = pivot(this.body, 0, 0, 0);
    this.torso.add(mesh([
      Kit.ico(0.7, 0, 0.42, 0, BLUE, { sx: 1.0, sy: 0.62, sz: 0.8, detail: 2 }),
      Kit.ico(0.45, 0, 0.3, -0.26, MAG, { sx: 1.1, sy: 0.5, sz: 0.55, detail: 1 }),
      Kit.ico(0.28, -0.62, 0.38, -0.1, MAG_N, { sy: 0.8, detail: 1 }), Kit.ico(0.28, 0.62, 0.38, -0.1, MAG_N, { sy: 0.8, detail: 1 }),
      Kit.cyl(0.74, 0.7, 0.05, 0, 0.74, 0, MAG_N, { seg: 14, glow: true }),                            // waist neon ring
      Kit.ico(0.8, 0, 1.28, 0, BODY, { sx: 1.0, sy: 0.7, sz: 0.78, detail: 2 }),                      // chest
      Kit.ico(0.5, -0.74, 1.28, -0.08, MAG, { sx: 0.7, sy: 1.05, sz: 0.82, detail: 2 }), Kit.ico(0.5, 0.74, 1.28, -0.08, MAG, { sx: 0.7, sy: 1.05, sz: 0.82, detail: 2 }),   // big panels
      Kit.ico(0.3, -0.5, 1.15, -0.4, VIO, { sx: 0.5, sy: 0.9, sz: 0.4, detail: 1 }), Kit.ico(0.3, 0.5, 1.15, -0.4, VIO, { sx: 0.5, sy: 0.9, sz: 0.4, detail: 1 }),
      Kit.ico(0.3, -0.8, 1.7, -0.05, BLUE, { sx: 0.5, sy: 0.35, detail: 1 }), Kit.ico(0.3, 0.8, 1.7, -0.05, BLUE, { sx: 0.5, sy: 0.35, detail: 1 }),   // shoulder caps
      Kit.box(0.82, 0.8, 0.06, 0, 0.88, -0.6, GLASS), Kit.box(0.82, 0.9, 0.06, 0, 0.82, 0.6, GLASS),     // front / back glass plates
      Kit.box(0.46, 0.05, 0.03, 0, 1.4, -0.65, VIO, { glow: true }), Kit.box(0.22, 0.05, 0.03, -0.3, 1.45, -0.65, VIO, { glow: true, rz: -0.4 }), Kit.box(0.22, 0.05, 0.03, 0.3, 1.45, -0.65, VIO, { glow: true, rz: 0.4 }), // mouth
      Kit.box(0.76, 0.03, 0.03, 0, 1.0, -0.65, VIO, { glow: true }), Kit.box(0.76, 0.03, 0.03, 0, 0.92, -0.65, BLUE, { glow: true }), Kit.box(0.76, 0.03, 0.03, 0, 0.84, -0.65, MAG_N, { glow: true }),
      Kit.cyl(0.42, 0.5, 0.2, 0, 1.78, 0, BODY, { seg: 10 })]));                                       // neck

    // head pivot (nod / tilt): tall egg, wide visor band with neon rims, yellow ring eye, big frond crown
    this.head = pivot(this.torso, 0, 1.7, 0);
    const hd = [
      Kit.ico(0.85, 0, 0.78, 0, BODY, { sx: 1.08, sy: 0.92, sz: 1.0, detail: 2 }),
      Kit.cyl(0.94, 0.88, 0.76, 0, 0.0, 0, GLASS, { seg: 18 }),                                        // bulging visor band
      Kit.cyl(0.97, 0.97, 0.07, 0, 0.72, 0, MAG_N, { seg: 18, glow: true }),                           // upper neon rim
      Kit.cyl(0.9, 0.9, 0.06, 0, -0.02, 0, YEL, { seg: 18, glow: true }),                              // lower rim (the yellow edge line)
      Kit.cyl(0.955, 0.955, 0.035, 0, 0.5, 0, BLUE, { seg: 18, glow: true })];
    const base = new THREE.Vector3(0, 1.55, 0);
    const AZ = [0, 0.7, 1.4, 2.1, 2.8, 3.5, 4.2, 4.9, 5.6], TILT = [0.5, 1.15, 0.75, 1.3, 0.6, 1.2, 0.85, 1.05, 0.7], LEN = [1.55, 1.4, 1.7, 1.45, 1.6, 1.35, 1.65, 1.5, 1.3];
    AZ.forEach((az, i) => hd.push(blade(base, az, TILT[i], LEN[i], 0.15, i % 2 ? BLUE : VIO, false)));
    hd.push(blade(base, 0.3, 0.25, 0.9, 0.09, MAG_N, true));                                          // short neon frond in the middle
    this.head.add(mesh(hd));
    this.eye = pivot(this.head, 0, 0.5, -0.95);
    this.eye.add(mesh([raw(new THREE.TorusGeometry(0.2, 0.05, 6, 16), YEL, new THREE.Vector3(), Q0, ONE, true),
                       Kit.box(0.14, 0.05, 0.04, 0.2, -0.24, 0, YEL, { glow: true })]));

    // leaf-blade arms with a loose "ribbon" forearm (hang from the shoulders, point down)
    this.arm = []; this.fore = [];
    for (const s of [-1, 1]) {
      const sh = pivot(this.torso, s * 1.1, 1.55, 0);
      sh.add(mesh([drop(0.8, 0.12, VIO, false, 0)]));
      const fo = pivot(sh, 0, -0.78, 0);
      fo.add(mesh([drop(0.7, 0.09, FROND, false, 0), drop(0.35, 0.06, MAG_N, true, -0.45)]));
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
      t.y = SLIDE_Y; t.rx = SLIDE_RX; t.sq = SLIDE_SQ; t.rz = 0; t.hl = 0.26; t.hr = 0.3; t.kl = -0.15; t.kr = -0.35; t.al = 1.4; t.ar = 1.2; t.alz = -0.55; t.arz = 0.55; t.nod = -0.2; t.tilt = 0;
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
    this.head.rotation.x = c.nod; this.head.rotation.z = c.tilt;
    this.eye.scale.setScalar(1 + Math.sin(T * 4) * 0.07);              // the ring eye pulses
  }
}
