// Renderer3D: draws the game state (World + Game from the 2D build) as a low-poly 3D scene.
//
// Frame of reference: the runner always stands at the scene origin and runs toward -Z; the road, props and items are
// repositioned around it every frame, so coordinates never grow and road segments are simply recycled by index.
// Gameplay units convert with U3 (kit.js). Lateral positions are road-relative: the road's centre line under the
// runner is x = 0, and the centre line elsewhere follows the player's chosen route (see roadLat).
//
// Branching (what works / what is missing): the *chosen* route is followed in 3D (the road bends sideways through the
// fork zone, curves, and merges back); the second road of a fork is NOT drawn yet, and the branch's own coins/obstacles
// only appear after the choice has been made. See README "3D build" for what true 3D branching needs.
class Renderer3D {
  constructor(uiCanvas, env) {
    this.env = env;
    this.ui = new Renderer(uiCanvas);                     // the pixel-art HUD / menus / touch controls, drawn on a transparent overlay
    this.uiCtx = uiCanvas.getContext('2d');
    this.ui.menu3d = true;

    const gl = this.gl = document.getElementById('gl');
    this.renderer = new THREE.WebGLRenderer({ canvas: gl, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));   // keeps fill-rate modest on high-DPI phones
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(62, 16 / 9, 0.1, 400);
    this.scene.fog = new THREE.Fog(env.fog.color, env.fog.near, env.fog.far);
    this.scene.background = new THREE.Color(env.fog.color);

    // lights: warm hemisphere fill + one low sun, no shadow maps
    this.scene.add(new THREE.HemisphereLight(env.hemi.sky, env.hemi.ground, env.hemi.intensity));
    const sun = new THREE.DirectionalLight(env.sun.color, env.sun.intensity);
    sun.position.set(...env.sun.position); this.scene.add(sun);

    // sky dome (vertex-coloured gradient, ignores fog) + sun disc, both re-centred on the camera each frame
    const dome = new THREE.SphereGeometry(300, 16, 10), pos = dome.attributes.position, col = new Float32Array(pos.count * 3);
    const top = new THREE.Color(env.sky.top), mid = new THREE.Color(env.sky.mid), hor = new THREE.Color(env.sky.horizon), c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const h = Math.max(0, pos.getY(i) / 300);
      if (h < 0.35) c.copy(hor).lerp(mid, h / 0.35); else c.copy(mid).lerp(top, Math.min(1, (h - 0.35) / 0.65));
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    dome.setAttribute('color', new THREE.BufferAttribute(col, 3));
    this.sky = new THREE.Mesh(dome, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
    this.sky.renderOrder = -2; this.scene.add(this.sky);
    this.sunDisc = new THREE.Mesh(new THREE.CircleGeometry(1, 20), new THREE.MeshBasicMaterial({ color: env.sunDisc.color, fog: false, depthWrite: false }));
    const sz = 250 * Math.tan(env.sunDisc.size * Math.PI / 360);
    this.sunDisc.scale.setScalar(sz); this.sunDisc.position.set(-70, 28, -250); this.sunDisc.renderOrder = -1; this.scene.add(this.sunDisc);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(700, 700), new THREE.MeshLambertMaterial({ color: env.groundFar }));
    ground.rotation.x = -Math.PI / 2; ground.position.y = -0.02; this.scene.add(ground);

    // road segments: one shared merged geometry, a fixed pool, indexed by (segment number mod pool size)
    const seg = Kit.merge(env.segment());
    this.NSEG = 15; this.segs = [];
    for (let i = 0; i < this.NSEG; i++) { const g = Kit.mesh(seg); this.scene.add(g); this.segs.push(g); }
    // props: shared geometry per prop, a bounded pool per kind
    this.props = {}; this.propUsed = {};
    for (const name of Object.keys(env.props)) {
      const m = env.props[name](), list = [], cap = /^house/.test(name) ? 14 : name === 'tree' ? 48 : 28;   // pool sizes cover the worst case of the layout rules (plazas add many trees)
      for (let i = 0; i < cap; i++) { const g = Kit.mesh(m); g.visible = false; this.scene.add(g); list.push(g); }
      this.props[name] = list; this.propUsed[name] = 0;
    }
    this.droppedBy = {};
    this.dropped = 0;                                      // props skipped because a pool was full (should stay 0)
    this.layouts = new Map();                              // segment index -> cached placements
    this.items = new Items3D(this.scene);
    this.runner = new Runner3D(); this.scene.add(this.runner.group);

    // chase camera and menu showcase camera (blended by this.menu: 1 = menu, 0 = gameplay)
    this.menu = 1; this.fk = 1; this.lastChoice = null; this.camLat = 0; this.lookX = 0;
    this.cam = new THREE.Vector3(); this.look = new THREE.Vector3();
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const w = Math.max(2, innerWidth), h = Math.max(2, innerHeight);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.fov = w / h < 1.5 ? 62 + (1.5 - w / h) * 26 : 62;       // keep all three lanes in view on narrow screens
    this.camera.updateProjectionMatrix();
  }

  // lateral centre (metres) of the route the player follows at gameplay z, before subtracting the runner's own
  roadLat(w, z) {
    const bands = w.bandsAt(z);
    let b = bands[0], c = 0;
    if (bands.length > 1) { b = bands.find(q => q.chosen); if (!b) return 0; c = (b.lo + b.hi) / 2; }
    return (c * this.fk + b.off) * U3.X;
  }

  draw(g) {
    const w = g.world, p = g.p, dt = Math.min(0.05, this.lastT ? (g.time - this.lastT) : 0.016) || 0.016;
    if (g.state !== 'pause') this.lastT = g.time;
    const U = U3, rz = p.z * U.Z;

    // fork bend eases in over ~0.7 s after the choice locks (so the road ahead doesn't snap sideways)
    const F = w.pieces.find(q => q.type === 'fork' && q.choice && q.z1 > p.z - 50);
    const choice = F ? F.uid + F.choice : null;
    if (choice !== this.lastChoice) { this.lastChoice = choice; this.fk = choice ? 0 : 1; }
    this.fk = Math.min(1, this.fk + dt / 0.7);
    const lat0 = this.roadLat(w, p.z);

    // ---- road segments + props (recycled by index)
    const i0 = Math.floor(rz / SEG_LEN) - 2, i1 = i0 + this.NSEG - 1;
    for (const k in this.propUsed) this.propUsed[k] = 0;
    for (let i = i0; i <= i1; i++) {
      const zs = i * SEG_LEN, ze = zs + SEG_LEN;
      const xs = this.roadLat(w, zs / U.Z) - lat0, xe = this.roadLat(w, ze / U.Z) - lat0, yaw = -Math.atan2(xe - xs, SEG_LEN);
      const m = this.segs[((i % this.NSEG) + this.NSEG) % this.NSEG];
      m.position.set(xs, 0, rz - zs); m.rotation.y = yaw;
      let lay = this.layouts.get(i);
      if (!lay) { lay = this.env.layout(i, rnd); this.layouts.set(i, lay); }
      for (const pl of lay) {
        const pool = this.props[pl.prop], n = this.propUsed[pl.prop];
        if (!pool || n >= pool.length) { this.dropped++; this.droppedBy[pl.prop] = (this.droppedBy[pl.prop] || 0) + 1; continue; }
        this.propUsed[pl.prop] = n + 1;
        const o = pool[n], t = pl.dist / SEG_LEN;
        o.position.set(xs + (xe - xs) * t + pl.x, WALK_Y, rz - zs - pl.dist);
        o.rotation.y = (pl.x < 0 ? Math.PI : 0) + (pl.rotY || 0) + yaw; o.visible = true;
      }
    }
    for (const name in this.props) { const pool = this.props[name]; for (let n = this.propUsed[name]; n < pool.length; n++) pool[n].visible = false; }
    if (this.layouts.size > 40) for (const k of this.layouts.keys()) if (k < i0 - 4) this.layouts.delete(k);

    // ---- items: coins and hazards. A fork's own items show only once that fork's route has been chosen.
    this.items.begin();
    for (const it of w.items) {
      if (it.taken || it.kind === 'prop') continue;
      const dz = it.z - p.z;
      if (dz < -150 || dz > 1500) continue;      // design units: 15 m behind .. 150 m ahead
      if (it.tag !== 'main') { const uid = parseInt(it.tag, 10), pc = w.pieces.find(q => q.uid === uid); if (!pc || !pc.choice) continue; }
      const band = w.bandNear(it.z, it.x), rel = (it.x - (band.lo + band.hi) / 2) * U.X;
      const zr = -dz * U.Z, x = rel + this.roadLat(w, it.z) - lat0;
      if (it.kind === 'coin') this.items.place('coin', x, it.h * U.Y, zr);
      else this.items.place(it.kind, x, 0, zr);
    }
    this.items.end(g.time);

    // ---- runner (road-relative lateral, jump height in metres)
    const pb = w.playerBand(p.z, p.x);
    const relX = (p.x - pb.c) * U.X;
    this.runner.group.position.set(relX, p.jy * U.Y, 0);
    const ms = 1 - Math.exp(-3.5 * dt);
    this.menu += ((g.state === 'title' ? 1 : 0) - this.menu) * ms;
    const mm = this.menu * this.menu * (3 - 2 * this.menu);
    this.runner.group.rotation.y = Math.PI * mm;
    this.runner.update(dt, { time: g.time, runRate: 2.3 + p.speed / 340 * 1.1, airborne: p.jy > 0, vy: p.vy, sliding: p.slide > 0,
                             lean: Math.max(-1, Math.min(1, p.vx / STEER)), state: g.state });

    // ---- camera: chase (behind and above, follows half the lateral offset) blended with the menu showcase orbit
    this.camLat += ((g.camRel + g.camErr) * U.X - this.camLat) * (1 - Math.exp(-8 * dt));
    const orbit = Math.sin(g.time * 0.35) * 0.5;                  // menu camera drifts around the character
    const cx = this.camLat;
    this.cam.set(cx + ((relX + Math.sin(orbit) * 2.6) - cx) * mm, 4.2 + (1.35 - 4.2) * mm, 7.5 + (Math.cos(orbit) * 3.5 - 7.5) * mm);
    // menu: the character faces the camera and is framed right of centre so the left side holds the title
    // chase: look 20 m down the road (so bends are followed), blended into the menu framing
    const ahead = this.roadLat(w, p.z + 200) - lat0;
    this.lookX += ((cx + (ahead - cx) * 0.75) - this.lookX) * (1 - Math.exp(-6 * dt));
    this.look.set(this.lookX + ((relX - 1.0) - this.lookX) * mm, 0.8 + 0.3 * mm, -20 * (1 - mm));
    if (g.shake > 0) { this.cam.x += Math.sin(g.time * 90) * g.shake * 0.5; this.cam.y += Math.cos(g.time * 70) * g.shake * 0.3; }
    this.camera.position.copy(this.cam); this.camera.lookAt(this.look);
    this.sky.position.copy(this.camera.position);
    this.sunDisc.position.set(this.camera.position.x - 70, this.camera.position.y + 28, this.camera.position.z - 250);
    this.sunDisc.lookAt(this.camera.position);

    this.renderer.render(this.scene, this.camera);
    this.uiCtx.clearRect(0, 0, VW, VH);
    this.ui.drawUI(g);
  }
}
