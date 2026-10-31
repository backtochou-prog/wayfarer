// Runs INSIDE the game page (index.html); injected by render.js. Sets up the dance scene (the 3D Zagla, dancing on the road of the island of the coastal town, in front of the fruit shop, at sunset) and exposes
// window.__danceFrame(t) -> jpeg data URL. Everything is a pure function of the video time t (seconds): beat = t / BEAT. No real-time clock is used, so the render is deterministic.
// The music is the redone 'afro Mediterraneo' (assets/music_coast.mp3) from bar 4 (7.979 s, a kick): 120.71 BPM, beat 0.49705 s; 64 beats = 8 phrases of 8: 40 beats of groove (bar 4 to 13, the loud passage),
// 16 beats of break (the quieter bars 14 to 17), 8 beats of finale. Zagla's body is one piece with two legs, so the dance is done with the whole body (bounce, squash and stretch, lean, twist, spins, hops) and her legs.
(function () {
  const BEAT = 0.49705, g = __wf, r = g.r, scene = r.scene, real = r.renderer.render.bind(r.renderer), SLOT = window.__SLOT || 175, ISLE = window.__ISLE || 'islandSunset';
  const ease = x => x * x * (3 - 2 * x), lerp = (a, b, k) => a + (b - a) * k, clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp3 = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
  // ---- the scene: the island, the runner hidden, the HUD is not part of the WebGL canvas
  g.start(); g.world.items = []; g.world.extend(170000);
  const F = g.world.pieces.find(p => p.type === 'fork' && p.fork.tube && p.fork.right.route === ISLE); g.world.commit(F, 'right'); g.state = 'play'; g.die = () => {}; g.scene = null; g.fadeIn = 0;
  const Z0 = SLOT * 120 + 60; r.renderer.render = () => {}; r.menu = 0; const sfx = g.sfx; if (sfx) sfx.update = () => {};
  const Z = new RunnerZagla(); scene.add(Z.group); scene.add(Z.shadow);
  g.world.extend(Z0 + 3000); const XC = g.world.playerBand(Z0, 1e4).c;                                    // the centre of the island road (the right one of the two roads of the junction), in the world's units
  const pin = t => { g.world.extend(Z0 + 3000); g.state = 'pause'; g.p.z = Z0; g.p.x = XC; g.p.speed = 0; g.world.items = []; r.menu = 0;
    const a = g.world.playerBand(g.p.z + 30, XC); g.bgTo = BIOMES[a.to].keep ? 'coast' : a.to; g.bgT = a.t; const pb = g.world.playerBand(g.p.z, XC); g.camX = pb.c; g.camOff = pb.off; g.camErr = 0; g.camRel = 0; g.time = t; };
  pin(0); for (let i = 0; i < 3; i++) { g.time += 1 / 60; r.draw(g); }
  const X0 = r.runner.group.position.x, YAW0 = r.runner.group.rotation.y;                      // where the lane is on the screen of the world, and the heading of the road there
  // ---- a neon shockwave ring under her on every beat (cyan and magenta in turn)
  const RINGS = [0, 1].map(i => { const m = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.5, 40), new THREE.MeshBasicMaterial({ color: i ? 0x22e0e8 : 0xff2fd0, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false })); m.rotation.x = -Math.PI / 2; m.visible = false; scene.add(m); return m; });
  // ---- the choreography: b = beats since the start. yaw 0 = she faces -z: her BACK is to the camera behind (the picture 'Le dos'), her FRONT to a camera in front of her; yaw pi / 2 faces -x (a camera on the left).
  const yawOf = b => {
    const PI = Math.PI;
    if (b < 14) return 0;                                                          // her back to the camera behind, for the first 14 beats
    if (b < 16) return 2 * PI * ease((b - 14) / 2);                                 // a full turn, ending front on for the camera in front of her
    if (b < 28) return 2 * PI + 0.5 * Math.sin(PI * (b - 16));                      // the twist, facing the camera in front
    if (b < 29) return 2 * PI + PI / 2 * ease(b - 28);                              // a quarter turn to face the camera on the left
    if (b < 40) return 5 * PI / 2 + 0.45 * Math.sin(PI * (b - 29));
    if (b < 56) return 5 * PI / 2 + 2 * PI * ease((b - 40) / 16);                   // the break: one slow turn, all her sides
    if (b < 57) return 9 * PI / 2 + 3 * PI / 2 * ease(b - 56);                      // a jump turn to face the low camera in front
    if (b < 60) return 6 * PI + 0.3 * Math.sin(PI * (b - 57));
    if (b < 63) return 6 * PI + 4 * PI * ease((b - 60) / 3);                        // the double spin
    return 10 * PI;
  };
  const dance = b => {
    const fr = b - Math.floor(b), s = Math.sin(Math.PI * fr), land = Math.exp(-fr * 9), o = { x: 0, y: 0, z: 0, tz: 0, tx: 0, l0: 0, l1: 0, z0: 0, z1: 0, air: 0 };
    if (b < 16) {                                                       // GROOVE: a bounce on every beat, a step side to side every two beats, the legs stepping in turn
      o.x = 0.45 * Math.sin(Math.PI * b / 2); o.y = 0.12 * s; o.tz = -0.16 * Math.cos(Math.PI * b / 2); o.l0 = 0.7 * Math.sin(Math.PI * b); o.l1 = -o.l0; o.tx = 0.05 * land;
    } else if (b < 28) {                                                // TWIST: faster steps, a bounce on every half beat, the whole body twisting
      const f2 = (2 * b) % 1; o.x = 0.55 * Math.sin(Math.PI * b / 2); o.y = 0.07 * Math.sin(Math.PI * f2); o.tz = 0.12 * Math.sin(Math.PI * b); o.l0 = 0.8 * Math.sin(2 * Math.PI * b); o.l1 = -o.l0; o.z0 = 0.12; o.z1 = -0.12; o.tx = 0.06 * Math.exp(-f2 * 8);
    } else if (b < 40) {                                                // JUMPS: a hop on every beat, the knees up in the air
      o.x = 0.6 * Math.sin(Math.PI * b / 2); o.y = 0.46 * s; o.air = s; o.l0 = o.l1 = -0.95 * s; o.tz = 0.1 * Math.sin(Math.PI * b / 2); o.z0 = 0.2 * s; o.z1 = -0.2 * s;
    } else if (b < 56) {                                                // BREAK: slow, smooth, a sway with a slow turn, small steps
      const u = (b - 40) / 16; o.x = 0.9 * Math.sin(2 * Math.PI * u); o.z = 0.5 * (Math.cos(2 * Math.PI * u) - 1); o.y = 0.04 + 0.04 * Math.sin(Math.PI * b / 2); o.tz = 0.2 * Math.sin(Math.PI * b / 4); o.l0 = 0.5 * Math.sin(Math.PI * b / 2); o.l1 = -o.l0; o.tx = 0.05 * Math.sin(Math.PI * b / 2 + 1);
    } else if (b < 60) {                                                // FINALE 1: big hops, the legs thrown wide
      o.x = 0.3 * Math.sin(Math.PI * b); o.y = 0.6 * s; o.air = s; o.l0 = o.l1 = -0.4 * s; o.z0 = 0.55 * s; o.z1 = -0.55 * s; o.tz = 0.12 * Math.sin(Math.PI * b);
    } else if (b < 63) {                                                // FINALE 2: a double spin in one long jump, the legs tucked
      const u = (b - 60) / 3; o.y = 1.0 * Math.sin(Math.PI * u); o.air = Math.sin(Math.PI * u); o.l0 = o.l1 = -0.7 * o.air; o.z0 = 0.15 * o.air; o.z1 = -0.15 * o.air;
    } else { o.y = 0; }                                                 // the landing: squashed, then still
    return o;
  };
  const SHOTS = [                                                       // camera shots (video beats): from / to position (relative to her), target, fov. Hard cuts on the beat.
    { b0: 0,  b1: 16, p0: [-0.8, 1.25, 5.0], p1: [-0.4, 1.15, 3.9], t0: [0, 1.0, 0],   t1: [0, 1.0, 0],   f0: 44, f1: 44 },    // from behind: her back, the island ahead
    { b0: 16, b1: 28, p0: [-3.0, 1.0, -3.8], p1: [-2.2, 1.1, -3.2], t0: [0.2, 1.0, 0], t1: [0.2, 1.0, 0], f0: 46, f1: 44 },    // three-quarter from the front left
    { b0: 28, b1: 40, p0: [-6.2, 1.5, 0.8], p1: [-5.0, 1.4, 0.8], t0: [3.0, 1.2, 0], t1: [3.0, 1.2, 0], f0: 52, f1: 50 },      // wide from the left: Zagla and the fruit shop behind her
    { b0: 40, b1: 56, p0: [2.4, 3.0, 6.2], p1: [-2.4, 1.9, 5.0], t0: [0, 1.0, 0],   t1: [0, 1.0, 0],   f0: 46, f1: 46 },      // the break: a slow glide from high on the right round to the left
    { b0: 56, b1: 64, p0: [0, 0.5, -5.2], p1: [0, 0.9, -3.0], t0: [0, 1.2, 0],    t1: [0, 1.25, 0],   f0: 52, f1: 42 },      // the finale: low and in front, pushing in
  ];
  window.__danceFrame = function (t, opts = {}) {
    const beat = t / BEAT, frac = beat - Math.floor(beat), energy = beat < 40 || beat >= 56 ? 0.9 : 0.6, pulse = Math.exp(-frac * 5.5) * (0.4 + 0.6 * energy);
    if (sfx) sfx.b = { t, beat, phase: frac, pulse, energy, kick: energy, playing: true };
    pin(t);
    const o = dance(beat), yaw = yawOf(beat), sq = Math.exp(-frac * 9) * (o.air > 0.05 ? 0 : 1), land = beat >= 63 ? 0.1 * Math.exp(-(beat - 63) * 5) : 0;
    const sy = 1 + 0.16 * o.y - 0.07 * sq - land, sx = 1 / Math.pow(sy, 0.7);
    Z.group.position.set(X0 + o.x, 0, o.z); Z.group.rotation.y = YAW0; Z.group.visible = true;
    Z.pivot.rotation.set(o.tx, yaw, o.tz); Z.pivot.position.y = o.y; Z.pivot.scale.set(sx, sy, sx); Z.group.updateMatrixWorld(true);
    Z.legs[0].rotation.x = o.l0; Z.legs[1].rotation.x = o.l1; Z.legs[0].rotation.z = o.z0; Z.legs[1].rotation.z = o.z1;
    const sh = 0.6 * (1 - clamp(o.y * 0.7, 0, 0.55)); Z.shadow.position.set(X0 + o.x, 0.045, o.z); Z.shadow.scale.set(sh, 1, sh * 0.8); Z.shadow.visible = true;
    const ring = RINGS[Math.floor(beat) % 2], other = RINGS[(Math.floor(beat) + 1) % 2]; other.visible = false;
    if (frac < 0.9 && beat >= 0 && (beat < 40 || beat >= 56 || Math.floor(beat) % 2 === 0)) { ring.visible = true; ring.position.set(X0 + o.x, 0.06, o.z); const sc = 0.6 + frac * 3.2; ring.scale.set(sc, sc, sc); ring.material.opacity = 0.8 * Math.exp(-frac * 4.2); } else ring.visible = false;
    let S = SHOTS[SHOTS.length - 1]; for (const s of SHOTS) if (beat >= s.b0 && beat < s.b1) { S = s; break; }
    const k = ease(clamp((beat - S.b0) / (S.b1 - S.b0), 0, 1)), P = lerp3(S.p0, S.p1, k), T = lerp3(S.t0, S.t1, k), fov = lerp(S.f0, S.f1, k) - Math.exp(-frac * 5) * 1.0, jolt = -0.03 * Math.exp(-frac * 9);
    r.renderer.render = (sc, cam) => { r.runner.group.visible = false; r.runner.shadow.visible = false; cam.position.set(X0 + P[0], P[1] + jolt, P[2]); cam.lookAt(X0 + T[0], T[1], T[2]); cam.fov = fov; cam.updateProjectionMatrix(); real(sc, cam); };
    r.atmoQ = -1; r.draw(g);
    const url = document.getElementById('gl').toDataURL('image/jpeg', opts.q || 0.93);
    r.renderer.render = () => {};
    return url;
  };
  return { slot: SLOT, x0: X0, yaw0: YAW0 };
})();
