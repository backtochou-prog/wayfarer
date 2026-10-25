// Runs INSIDE the game page (index.html); injected by render.js. Sets up the dabke scene (5 copies of the 3D model of the character, holding hands, in the Neon Quarter) and
// exposes window.__dabkeFrame(t) -> jpeg data URL.
// Everything is a pure function of the video time t (seconds): beat = t / BEAT. No real-time clock is used, so the render is deterministic.
(function () {
  const BEAT = 0.50964;                                   // seconds per beat of the track (117.73 BPM); music segment starts on a kick, so video beat 0 = a kick
  const g = __wf, r = g.r, scene = r.scene, camera = r.camera, real = r.renderer.render.bind(r.renderer);
  const NDANCE = 5, SPACING = 1.62;
  // ---- the scene: the game's own neon quarter, the runner hidden, the HUD is not part of the WebGL canvas
  g.start(); g.world.items = []; g.world.extend(30000);
  const NR = g.world.pieces.filter(p => p.id === 'neonRun')[window.__NR_INDEX || 0];
  g.state = 'play'; g.p.z = NR.z0 + (NR.z1 - NR.z0) * (window.__NR_AT || 0.5); g.p.x = 0; g.world.extend(g.p.z); g.world.items = [];
  r.renderer.render = () => {};
  r.menu = 0; r.runner.group.visible = false; r.runner.shadow.visible = false;
  const sfx = g.sfx; if (sfx) sfx.update = () => {};
  // ---- the dancers: copies of the 3D model of the character
  const D = [];
  for (let i = 0; i < NDANCE; i++) { const d = new Runner3D(); d.group.rotation.y = Math.PI; scene.add(d.group); scene.add(d.shadow); D.push(d); }
  // ---- the handkerchief (mandil): a waving cloth, white with red stripes, held by the leader's hand
  const cv = document.createElement('canvas'); cv.width = 128; cv.height = 96; const cx = cv.getContext('2d');
  cx.fillStyle = '#f6f1e6'; cx.fillRect(0, 0, 128, 96); cx.fillStyle = '#d4202c'; for (let k = 0; k < 6; k++) { cx.fillRect(0, 8 + k * 16, 128, 6); } for (let k = 0; k < 8; k++) { cx.fillRect(8 + k * 16, 0, 5, 96); }
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const cloth = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1.3, 10, 6), new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }));
  const clothBase = cloth.geometry.attributes.position.array.slice();
  const lead = D[NDANCE - 1]; lead.fore[0].add(cloth); cloth.position.set(0.5, -0.9, 0);
  // ---- a neon shockwave ring under every dancer, released on each stomp
  const RINGS = D.map((d, i) => { const m = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.5, 40), new THREE.MeshBasicMaterial({ color: i % 2 ? 0x22e0e8 : 0xff2fd0, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false })); m.rotation.x = -Math.PI / 2; m.position.y = 0.06; m.renderOrder = 2; scene.add(m); return m; });
  // ---- helpers
  const ease = x => x * x * (3 - 2 * x), lerp = (a, b, k) => a + (b - a) * k, clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  // periodic keyframes over a 4-beat bar: [u, hip, knee]; interpolated with an ease between neighbours. DOWN = foot planted, UP = knee raised, KICK = leg swung forward
  const DOWN = [0.14, -0.14], UP = [1.2, -1.5], KICK = [1.05, -0.2], SUP = [0.1, -0.28];
  const KEY = {   // the stomp (down) lands exactly on the beat: R on 0, 2 and 3.75; L on 1 and 3
    R: [[0, DOWN], [1.0, DOWN], [1.5, UP], [2.0, DOWN], [3.0, DOWN], [3.5, KICK], [3.75, DOWN], [4.0, DOWN]],
    L: [[0, DOWN], [0.5, UP], [1.0, DOWN], [2.0, DOWN], [2.5, UP], [3.0, DOWN], [4.0, DOWN]],
  };
  const STOMPS = { R: [0, 2, 3.75], L: [1, 3] };
  const leg = (name, u) => {
    const K = KEY[name]; let i = 0; while (i < K.length - 2 && u >= K[i + 1][0]) i++;
    const a = K[i], b = K[i + 1], k = ease(clamp((u - a[0]) / (b[0] - a[0]), 0, 1));
    return [lerp(a[1][0], b[1][0], k), lerp(a[1][1], b[1][1], k)];
  };
  const sinceStomp = (u, list) => { let best = 9; for (const st of list) best = Math.min(best, ((u - st) % 4 + 4) % 4); return best; };       // beats since the latest stomp in `list` (period 4)
  // camera shots (video beats): from / to position, target, fov. Hard cuts on the beat.
  const SHOTS = [
    { b0: 0,  b1: 16, p0: [0, 1.5, 7.4],    p1: [0, 1.3, 5.6],    t0: [0, 1.0, 0],    t1: [0, 1.0, 0],    f0: 44, f1: 44 },    // wide, front, slow push in
    { b0: 16, b1: 28, p0: [-6.2, 0.8, 5.4], p1: [-3.6, 1.0, 4.6], t0: [0.5, 1.1, 0],  t1: [0.8, 1.1, 0],  f0: 50, f1: 48 },    // low three-quarter from the left
    { b0: 28, b1: 40, p0: [0.8, 1.35, 3.8], p1: [2.0, 1.4, 3.4],  t0: [3.0, 1.35, 0], t1: [3.1, 1.4, 0],  f0: 40, f1: 37 },    // close on the leader and the handkerchief
    { b0: 40, b1: 52, p0: [5.2, 4.8, 8.8],  p1: [2.6, 3.2, 6.8],  t0: [0, 0.9, 0],    t1: [0, 1.0, 0],    f0: 50, f1: 46 },    // high, from the front right, the street behind
    { b0: 52, b1: 64, p0: [0, 0.65, 7.4],   p1: [0, 0.9, 4.9],    t0: [0, 1.2, 0],    t1: [0, 1.25, 0],   f0: 54, f1: 44 },    // low and fast push in, then hold
  ];
  const lerp3 = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];

  window.__setSpot = (index, u) => { g.world.extend(14000 * (index + 2)); const P = g.world.pieces.filter(p => p.id === 'neonRun')[index]; g.world.extend(P.z1 + 3000); g.p.z = P.z0 + (P.z1 - P.z0) * u; g.world.extend(g.p.z); g.world.items = []; window.__spotZ = g.p.z; return Math.round(g.p.z); };
  window.__dabkeFrame = function (t, opts = {}) {
    const beat = t / BEAT, u = ((beat % 4) + 4) % 4, bar = Math.floor(beat / 4);
    // beat clock for the game's own animation (scene light, glowing neon, PLAY): pulse 1 on the kick, decaying
    const frac = beat - Math.floor(beat), energy = 0.85; const pulse = Math.exp(-frac * 5.5) * (0.4 + 0.6 * energy);
    if (sfx) sfx.b = { t, beat, phase: frac, pulse, energy, kick: energy, playing: true };
    g.state = 'pause'; g.p.z = window.__spotZ; g.p.x = 0; g.p.speed = 0; g.world.items = []; g.bgTo = 'neon'; g.bgT = 1; r.menu = 0;      // the game's own loop must not move the world: paused, position pinned every frame r.runner.group.visible = false; r.runner.shadow.visible = false;
    const pb = g.world.playerBand(g.p.z, 0); g.camX = pb.c; g.camOff = pb.off; g.time = t;
    // ---- the line: sway side to side over 8 beats, each dancer a hair late (a natural ripple), all stomping together
    const swayF = b2 => -0.34 * Math.cos(2 * Math.PI * b2 / 4), velF = b2 => Math.sin(2 * Math.PI * b2 / 4);     // the line steps right on beats 1-2 and back left on 3-4
    for (let i = 0; i < NDANCE; i++) {
      const d = D[i], bi = beat - i * 0.035, ui = ((bi % 4) + 4) % 4, isLead = i === NDANCE - 1, isEnd0 = i === 0;
      const x = (i - (NDANCE - 1) / 2) * SPACING + swayF(bi), z = -0.28 * Math.pow((i - (NDANCE - 1) / 2) / 2, 2) * 1.0;
      d.group.position.set(x, 0, z);
      let yaw = Math.PI;
      if (isLead && beat >= 48 && beat < 49) yaw += 2 * Math.PI * ease(beat - 48);                  // the leader twirls once
      d.group.rotation.y = yaw;
      const R = leg('R', ui), L = leg('L', ui);
      d.hip[1].rotation.x = R[0]; d.knee[1].rotation.x = R[1]; d.hip[0].rotation.x = L[0]; d.knee[0].rotation.x = L[1];
      const vel = velF(bi), HZ = window.__HZ || 1;                    // sideways: the leg on the side of travel swings out, the other follows in
      d.hip[0].rotation.z = HZ * (-0.5 * Math.max(vel, 0) + 0.14 * Math.max(-vel, 0)); d.hip[1].rotation.z = HZ * (0.5 * Math.max(-vel, 0) - 0.14 * Math.max(vel, 0));
      // ankles: keep the soles level, like the game's run cycle
      d.ankle[1].rotation.x = -(R[0] + R[1]) * 0.95; d.ankle[0].rotation.x = -(L[0] + L[1]) * 0.95;
      const dip = 0.1 * Math.exp(-Math.min(sinceStomp(ui, STOMPS.R), sinceStomp(ui, STOMPS.L)) * 7);       // the body drops on every stomp
      const lift = 0.05 * Math.max(Math.sin(Math.PI * ((ui * 2) % 1)), 0);
      d.body.position.y = d.HIP - dip + lift - 0.04;
      d.body.rotation.z = 0.09 * Math.sin(Math.PI * bi / 2) + 0.02 * Math.sin(Math.PI * bi * 2);
      d.body.rotation.x = 0.04 + 0.05 * Math.exp(-sinceStomp(ui, STOMPS.R) * 6);
      d.torso.rotation.x = 0.1 * Math.exp(-sinceStomp(ui, STOMPS.L) * 6) - 0.04; d.torso.rotation.z = 0.06 * Math.sin(Math.PI * bi / 2 + 1);
      // arms: hands joined with the neighbours, held out at shoulder height and pumped a little on each stomp
      const pump = 0.12 * Math.exp(-sinceStomp(ui, [0, 1, 2, 3]) * 6);
      d.arm[0].rotation.z = -(1.32 + pump); d.arm[1].rotation.z = 1.32 + pump; d.arm[0].rotation.x = 0.08; d.arm[1].rotation.x = 0.08;
      d.fore[0].rotation.x = 0.1; d.fore[1].rotation.x = 0.1; d.fore[0].rotation.z = 0; d.fore[1].rotation.z = 0;
      if (isEnd0) { d.arm[1].rotation.z = 0.95 + 0.25 * Math.sin(Math.PI * bi * 2); d.arm[1].rotation.x = -0.4 + 0.3 * Math.sin(Math.PI * bi * 2 + 1); d.fore[1].rotation.x = -0.9 + 0.5 * Math.sin(Math.PI * bi * 2); }   // the free hand at the end of the line swings in time
      if (isLead) {   // the leader: the outer hand high, swinging the handkerchief
        d.arm[0].rotation.z = -(2.2 + 0.25 * Math.sin(Math.PI * bi)); d.arm[0].rotation.x = -0.25;
        d.fore[0].rotation.x = -0.5 + 0.7 * Math.sin(Math.PI * bi * 2); d.fore[0].rotation.z = 0.9 * Math.sin(Math.PI * bi * 2 + 0.6);
        const P = cloth.geometry.attributes.position, A = clothBase;
        for (let k = 0; k < P.count; k++) { const px = A[k * 3], py = A[k * 3 + 1], w = (px + 0.85) / 1.7; P.setZ(k, 0.22 * w * Math.sin(6 * w - t * 14) + 0.06 * Math.sin(py * 5 + t * 9) * w); P.setY(k, py - 0.15 * w * w); }
        P.needsUpdate = true; cloth.geometry.computeVertexNormals();
      }
      d.head.rotation.x = 0.12 * Math.exp(-sinceStomp(ui, [0, 1, 2, 3]) * 7) - 0.03;                      // a little nod on each beat
      d.shadow.position.set(x, 0.045, z); d.shadow.scale.set(0.6, 1, 0.5); d.shadow.visible = true; d.group.visible = true;
      const ds = sinceStomp(ui, [0, 1, 2, 3, 3.75]), ring = RINGS[i];
      if (ds < 1.1) { ring.visible = true; ring.position.x = x; ring.position.z = z; const sc = 0.5 + ds * 2.6; ring.scale.set(sc, sc, sc); ring.material.opacity = 0.85 * Math.exp(-ds * 4.5); } else ring.visible = false;
      d.group.updateMatrixWorld(true);
    }
    // ---- camera
    if (opts.cam) { const c = opts.cam; r.renderer.render = (sc, cam) => { cam.position.set(...c.p); cam.lookAt(...c.t); cam.fov = c.f; cam.updateProjectionMatrix(); real(sc, cam); }; r.atmoQ = -1; r.draw(g); const u2 = document.getElementById('gl').toDataURL('image/jpeg', 0.9); r.renderer.render = () => {}; return u2; }
    let S = SHOTS[SHOTS.length - 1]; for (const s of SHOTS) if (beat >= s.b0 && beat < s.b1) { S = s; break; }
    const k = ease(clamp((beat - S.b0) / (S.b1 - S.b0), 0, 1)), kb = Math.exp(-frac * 5) * 0.012, jolt = -0.04 * Math.exp(-sinceStomp(u, [0, 1, 2, 3, 3.75]) * 9);
    const P0 = lerp3(S.p0, S.p1, k), T0 = lerp3(S.t0, S.t1, k), fov = lerp(S.f0, S.f1, k) - (opts.noBeatZoom ? 0 : kb * 100);
    r.renderer.render = (sc, cam) => { cam.position.set(P0[0], P0[1] + jolt, P0[2]); cam.lookAt(T0[0], T0[1], T0[2]); cam.fov = fov; cam.updateProjectionMatrix(); real(sc, cam); };
    r.atmoQ = -1; r.draw(g);
    const url = document.getElementById('gl').toDataURL('image/jpeg', opts.q || 0.93);
    r.renderer.render = () => {};
    return url;
  };
  window.__D = D;
  window.__setSpot(1, 0.68);
  return { dancers: NDANCE };
})();
