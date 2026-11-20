// ART CITY (the user, 2026-11-16: "Ville d'art", from three pictures of a model city made of paper, prints and collage, and the sky of the neon-quarter picture): the district after the tunnel of
// the picture street, reached by the NEON CORNER (src/track.js NEON_CORNER). A grey road with white lines between blue-violet rails, a painted floor beside it, blocks and towers wearing the
// pictures' facades (the graffiti block, the RUN tower, the newspaper tower, the violet prism, the wavy striped tower, the collage skyline), a soft lavender sky (no patchwork walls: the user crossed them out); landmarks along it: the ART CITY gantries (name signs high over the road, not obstacles), the green arch over the road, the red beanbag, the round tiered building,
// and the green spiral at the end, over the short tunnel that leads back to the neon street.
//   ENV3D.artcity: the look (sky, fog, light, road colours) the renderer blends in on the district's stretch; its props are added to the neon quarter's (the district's slots belong to it), and
//   ArtCity.layout(r, rnd) dresses slot r of the district (0 .. NEON_CORNER.ART - 1).
window.ENV3D = window.ENV3D || {};

const ArtCity = {
  _mat: null,
  material() {                                                            // the atlas, unlit (the pictures keep their own colours, fogged like everything else)
    if (!this._mat) {
      const img = new Image(), tex = new THREE.Texture(img);
      tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8; tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter;
      const mat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide });
      mat.visible = false; img.onload = () => { tex.needsUpdate = true; mat.visible = true; }; img.src = ART_ASSETS.src;
      this._mat = mat;
    }
    return this._mat;
  },
  // a quad with the cell `c` of the atlas, corners a-b-c-d (counter-clockwise from bottom-left as the picture is seen)
  quad(cell, A, B, C, D, uRep = 1, vRep = 1) {
    const c = ART_ASSETS[cell], g = new THREE.BufferGeometry(), du = (c.u1 - c.u0), dv = (c.v1 - c.v0);
    g.setAttribute('position', new THREE.Float32BufferAttribute([...A, ...B, ...C, ...D], 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute([c.u0, c.v0, c.u0 + du * uRep, c.v0, c.u0 + du * uRep, c.v0 + dv * vRep, c.u0, c.v0 + dv * vRep], 2));
    g.setIndex([0, 1, 2, 0, 2, 3]); return g;
  },
  merge(list) {
    const pos = [], uv = [], idx = []; let base = 0;
    for (const g of list) { const p = g.attributes.position.array, u = g.attributes.uv.array; for (const v of p) pos.push(v); for (const v of u) uv.push(v); for (const v of g.index.array) idx.push(v + base); base += p.length / 3; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
    g.computeBoundingSphere(); g.computeBoundingBox(); return g;
  },
};

(function () {
  const A = { rail: '#5a4ad8', railGlow: '#8f7bff', post: '#2b2f45', white: '#f4f2ff', green: '#2fa84a', greenD: '#1f7a34', red: '#c81e28', redD: '#7a0c14', gold: '#e8c040', dark: '#262838' };
  const mod = (a, n) => ((a % n) + n) % n;
  const art = (merged, sprites) => ({ merged: Kit.merge(merged.length ? merged : [Kit.box(0.05, 0.05, 0.05, 0, -3, 0, A.dark)]), sprite: ArtCity.merge(sprites), material: () => ArtCity.material() });

  // a block on the building line (local x = 0 is its facade toward the road, the body toward +X; F wide along the road, D deep, H tall): its facade and its front face wear the cell's picture,
  // the picture keeps its proportions (it is repeated up the facade when the block is taller than the picture is at that width)
  const block = (cell, F, D, H, rim) => () => {
    const c = ART_ASSETS[cell], ph = F / c.ar, rep = H / ph, z0 = -F / 2, z1 = F / 2;
    const parts = [Kit.box(D, H, F, D / 2 + 0.02, 0, 0, A.dark)];
    if (rim) parts.push(Kit.box(0.12, 0.12, F + 0.1, -0.04, H, 0, rim, { glow: true }), Kit.box(0.12, H, 0.12, -0.04, 0, z0, rim, { glow: true }), Kit.box(0.12, H, 0.12, -0.04, 0, z1, rim, { glow: true }));
    const fa = ArtCity.quad(cell, [-0.03, 0, z1], [-0.03, 0, z0], [-0.03, H, z0], [-0.03, H, z1], 1, rep);                // the facade, facing the road (-X)
    const fw = D / c.ar, fr = ArtCity.quad(cell, [0, 0, z1 + 0.03], [D, 0, z1 + 0.03], [D, H, z1 + 0.03], [0, H, z1 + 0.03], 1, H / (D / c.ar) * (D / F) * (F / D));   // the face toward the runner (+Z)
    return art(parts, [fa, fr]);
  };
  // the wavy striped tower and the prism (slim, lit edges)
  const slim = (cell, F, H, col) => () => { const c = ART_ASSETS[cell], w = F, h = H;
    const parts = [Kit.box(w * 0.9, h, w * 0.9, w * 0.45 + 0.05, 0, 0, A.dark), Kit.box(0.14, h, 0.14, -0.04, 0, -w / 2, col, { glow: true }), Kit.box(0.14, h, 0.14, -0.04, 0, w / 2, col, { glow: true }), Kit.cone(w * 0.55, 3, w * 0.45, h, 0, col, { glow: true })];
    return art(parts, [ArtCity.quad(cell, [-0.03, 0, w / 2], [-0.03, 0, -w / 2], [-0.03, h, -w / 2], [-0.03, h, w / 2]), ArtCity.quad(cell, [0, 0, w / 2 + 0.03], [w * 0.9, 0, w / 2 + 0.03], [w * 0.9, h, w / 2 + 0.03], [0, h, w / 2 + 0.03])]); };

  const props = {
    // the rail along the road's edge (blue-violet, a lit strip on top) and the painted floor beside it, out to the walls
    artRail: () => Kit.merge([Kit.box(0.25, 0.75, 12.3, 0, 0, 0, A.rail), Kit.box(0.27, 0.08, 12.3, 0, 0.75, 0, A.railGlow, { glow: true }), Kit.box(0.27, 0.1, 12.3, 0, 0.2, 0, A.white)]),
    artFloor: () => art([], [ArtCity.quad('floor', [0.3, 0.02, 6.15], [0.3, 0.02, -6.15], [26, 0.02, -6.15], [26, 0.02, 6.15], 2.2, 1)].map(g => { const uv = g.attributes.uv.array; return g; })),
    // the collage skyline: the towers of the four views as a stage flat behind the blocks
    artSkyline: () => art([], [ArtCity.quad('collage', [0, 0, 18], [0, 0, -18], [0, 36 / ART_ASSETS.collage.ar, -18], [0, 36 / ART_ASSETS.collage.ar, 18])]),
    // the blocks and towers
    artGraffiti: block('graffiti', 9, 8, 14, '#ff4060'), artRun: block('run', 5, 5, 22, '#4aa8ff'), artNews: block('news', 5, 5, 26, null),
    artCollageB: block('collage', 11, 7, 9, '#b06bff'), artRound: () => { const c = ART_ASSETS.round, R = 6, H = R * 2 / c.ar, parts = [Kit.cyl(R, R + 0.6, 0.6, R, 0, 0, A.gold), Kit.cyl(0.6, 0.6, 3, R, H, 0, A.gold), Kit.ico(1.1, R, H + 3.6, 0, '#b04ad8')];
      return art(parts, [ArtCity.quad('round', [0, 0, R], [0, 0, -R], [0, H, -R], [0, H, R])]); },
    artWavy: slim('wavy', 4.5, 20, '#4ae0ff'), artPrism: slim('prism', 4.5, 24, '#c05aff'),
    // THE GANTRY over the road: ART CITY in white on a blue-violet beam, high over the road (a name sign, not an obstacle: 6.8 m up)
    artGantry: () => { const p = [Kit.box(0.5, 7.6, 0.5, 0, 0, -0.0, A.rail)], q = [Kit.box(0.5, 7.6, 0.5, -9.2, 0, 0, A.rail), Kit.box(9.7, 1.2, 0.5, -4.6, 6.8, 0, A.post), Kit.box(9.7, 0.1, 0.55, -4.6, 6.8, 0, A.railGlow, { glow: true }), Kit.box(9.7, 0.1, 0.55, -4.6, 8.0, 0, A.railGlow, { glow: true })];
      return { merged: Kit.merge(p.concat(q)), sprite: ArtCity.gantrySign(), material: () => ArtCity.signMaterial() }; },
    // the green arch over the road (the four views), the red beanbag (the neon-quarter picture)
    artArch: () => Kit.merge([Kit.box(1.4, 9, 2.4, -9.6, 0, 0, A.green), Kit.box(1.4, 9, 2.4, 0.4, 0, 0, A.green), Kit.box(11.4, 2.2, 2.4, -4.6, 9, 0, A.green), Kit.box(11.6, 0.15, 2.5, -4.6, 8.95, 0, '#7cff6a', { glow: true })]),
    // THE MAGNETIC SCOOTER parked on ART CITY's painted floor (the user: offered there too; the game offers any prop named scooter*: Renderer3D spots)
    scooterMag: () => Kit.merge(RunnerSprite.magScooterParts(0, 0, 0.35, 0)),
    bikeSport: () => typeof BIKE_ART !== 'undefined' ? RunnerSprite.bikeCardProp() : RunnerSprite.bikeStatic(0.25),      // THE SPORT E-BIKE (the user: the main vehicle of ART CITY and the neon quarter), parked
    artBeanbag: () => Kit.merge([Kit.ico(1.6, 0, 1.1, 0, A.red), Kit.ico(1.2, 0.5, 1.9, 0.6, A.red), Kit.ico(1.1, -0.6, 0.8, -0.8, A.redD)]),
    // THE GREEN SPIRAL at the end of the district, high on a lavender wall across the road, over the tunnel back to the neon street
    artSpiralUp: () => props.artSpiral(true),
    artSpiral: (top) => { const Q = NEON_QUARTER_ART, cx = 680, cy = 180, rp = 140, R = top ? 7 : 11, Y = top ? 30 : 24, seg = 48, pos = [], uv = [], idx = [];      // (the spiral of the neon-quarter picture: the user crossed out the other one)
      pos.push(0, Y, 1.9); uv.push(cx / Q.w, 1 - cy / Q.h);
      for (let k = 0; k <= seg; k++) { const a = 2 * Math.PI * k / seg; pos.push(Math.cos(a) * R, Y + Math.sin(a) * R, 1.9); uv.push((cx + Math.cos(a) * rp) / Q.w, 1 - (cy - Math.sin(a) * rp) / Q.h); if (k) idx.push(0, k, k + 1); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeBoundingSphere(); g.computeBoundingBox();
      const W = '#b9b6ee', o = top ? -NeonAvenue.shift((NEON_CORNER.UP - 1) / NEON_CORNER.UP) : 0;          // (`top`: the wall seen from the glass ramp, whose road passes o m to the left of the tunnel, high up)
      const p = top ? [Kit.box(30, 40, 1, o - 7.5 - 15, -2, 1.2, W), Kit.box(36, 40, 1, 7.5 + 18, -2, 1.2, W), Kit.box(7.5 - (o + 7.5), 28, 1, (o + 7.5 + 7.5) / 2, 10, 1.2, W), Kit.box(15, 16, 1, o, 22, 1.2, W)]
                    : [Kit.box(24, 40, 1, -19.5, -2, 1.2, W), Kit.box(24, 40, 1, 19.5, -2, 1.2, W), Kit.box(15, 28, 1, 0, 10, 1.2, W)];       // the lavender wall, open for the tunnel under the spiral (`top`: and for the ramp's road, up to 22 m)
      return { merged: Kit.merge(p), sprite: g, material: () => NeonArt.materialQuarterStreet() }; },      // (the disc 0.7 m in front of the wall: local +z is toward the runner)
  };

  // the sign of the gantry: ART CITY drawn on a canvas
  ArtCity.signMaterial = function () {
    if (!this._sign) { const cv = document.createElement('canvas'); cv.width = 512; cv.height = 64; const x = cv.getContext('2d'); x.fillStyle = '#2a2f6a'; x.fillRect(0, 0, 512, 64);
      x.fillStyle = '#ffffff'; x.font = 'bold 44px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('ART CITY', 256, 34);
      const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; this._sign = new THREE.MeshBasicMaterial({ map: t, side: THREE.DoubleSide }); }
    return this._sign;
  };
  ArtCity.gantrySign = function () { const g = new THREE.BufferGeometry(), z = 0.28, x0 = -9.2, x1 = 0, y0 = 6.85, y1 = 7.95;
    g.setAttribute('position', new THREE.Float32BufferAttribute([x0, y0, z, x1, y0, z, x1, y1, z, x0, y1, z], 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2)); g.setIndex([0, 1, 2, 0, 2, 3]);
    g.computeBoundingSphere(); g.computeBoundingBox(); return g; };

  // slot r of the district (12 m): rails, floor, walls on both sides; blocks and towers by turns; the landmarks at fixed slots
  const BLD = ['artGraffiti', 'artRun', 'artWavy', 'artNews', 'artCollageB', 'artPrism'];
  ArtCity.layout = (r, rnd, det, liftM = 0) => {
    const out = [], N = typeof NEON_CORNER !== 'undefined' ? NEON_CORNER.ART : 50;
    for (const s of [-1, 1]) {
      out.push({ prop: 'artRail', x: s * 3.75, dist: 6 }, { prop: 'artFloor', x: s * 3.6, dist: 6 });
      if (mod(r, 3) === (s > 0 ? 1 : 0)) out.push({ prop: 'artSkyline', x: s * 27, dist: 6 });
      const k = mod(r * 3 + (s > 0 ? 2 : 0) + Math.floor(rnd(r * 2 + (s > 0 ? 1 : 0), 31) * 3), BLD.length);
      if (!(r === 10 && s > 0) && !(r === 20 && s < 0) && r < N - 2) out.push({ prop: BLD[k], x: s * (7.5 + rnd(r * 2 + (s > 0 ? 1 : 0), 32) * 3), dist: 6 });
    }
    if (r === 1 || r === 26) out.push({ prop: 'artGantry', x: 4.6, dist: 8 });
    if (r === 14 || r === 38) out.push({ prop: 'artArch', x: 4.6, dist: 6 });
    if (r === 10) out.push({ prop: 'artBeanbag', x: 5.6, dist: 5 });
    if (r === 20) out.push({ prop: 'artRound', x: -10, dist: 6 });
    const U = typeof NEON_CORNER !== 'undefined' ? NEON_CORNER.UP : 6, up = !!(det && det.up);
    if (r === 1) out.push({ prop: 'bikeSport', x: 4.6, dist: 4 });                                                  // THE E-BIKE at the entrance of ART CITY (the user), just out of the tunnel on the right
    if (r % 12 === 9 && r < N - U - 3) out.push({ prop: 'bikeSport', x: r % 24 === 9 ? -4.9 : 4.9, dist: 5 });
    if (r % 20 === 15 && r < N - U - 3) out.push({ prop: 'scooterMag', x: r % 40 === 15 ? 4.9 : -4.9, dist: 7 });                     // a magnetic scooter to ride, now and then, on either side
    if (r === N - 1) out.push({ prop: 'artBridge', x: 0.001, dist: 2.5, dy: -liftM });      // THE BRIDGE over the tunnel (the user removed the lavender wall and the green spiral: the next stage's sky opens there)   // THE BRIDGE over the tunnel, under the spiral
    if (!up && r === N - 1 && typeof NeonAvenue !== 'undefined') out.push({ prop: 'pkSign', x: -5.3, dist: 9.5 });      // (the car park's sign at the tunnel's mouth: P, to the left)
    if (!up && r >= N - U) out.push({ prop: 'artGlassRamp' + (r - (N - U)), x: 0.001, dist: 6 });
    if (!up && r >= N - U && r < N - U + 3) for (let n = out.length - 1; n >= 0; n--) if (out[n].prop === 'artRail' && out[n].x < 0) out.splice(n, 1);      // (the exit: the left rail opens where the ramp leaves the circuit)
    if (!up && r >= N - U - 2) for (const o of out) if (o.x < -4 && !/^(art(Floor|GlassRamp)|pkSign)/.test(o.prop)) o.x -= NeonAvenue.D + 6;      // (the user: the buildings on the left step aside to give the ramp room)                                                                  // THE GLASS RAMP on the left (the choice: the left lane)
    if (up && r >= N - U) {                                                                                     // ON THE RAMP: what stands on the ground stays there, and the circuit parts to the right (NeonAvenue.shift)
      const k = r - (N - U), sh = d => NeonAvenue.shift((k + d / 12.2) / U), keep = out.filter(o => o.prop !== 'artRail');
      for (const o of keep) { if (o.dy === undefined) o.dy = -liftM; o.x += sh(o.dist); }
      for (let n = keep.length - 1; n >= 0; n--) if (keep[n].x < 4 && !/^(artFloor|cnMainRoad.*)$/.test(keep[n].prop)) keep.splice(n, 1);      // (the ramp goes off to the left: what stood on the left of the circuit is where it passes)
      keep.push({ prop: 'cnMainRoadU' + k, x: sh(6), dist: 6, dy: -liftM }); out.length = 0; out.push(...keep);
    }
    if (typeof NeonAvenue !== 'undefined' && r >= N - U - 10) {                                              // THE AVENUE'S RAIL, stretched back (the user): it fades in among the buildings and is solid by the glass ramp, which it follows over the bridge
      const k = r - (N - U), x0 = 32 - NeonAvenue.D;
      if (k < 0) out.push({ prop: 'cnRailF' + (k + 10), x: x0, dist: 6 });
      else out.push({ prop: 'cnRail', x: x0 + (up ? NeonAvenue.shift((k + 0.5) / U) : 0), dist: 6, dy: -liftM });
    }
    const PN = typeof NEON_CORNER !== 'undefined' ? NEON_CORNER.PIN : 0;
    if (!up && PN && r >= N - PN && typeof NeonAvenue !== 'undefined' && NeonAvenue.psh) {                    // THE CAR PARK'S SLIP ROAD (the user: a real tube beside the tunnel): it leaves the circuit to the left over the last PIN slots
      const k = r - (N - PN);
      if (k < PN - 1) for (let n = out.length - 1; n >= 0; n--) if (out[n].prop === 'artRail' && out[n].x < 0) out.splice(n, 1);      // (the left rail opens where it leaves)
      out.push({ prop: 'pkSlip' + k, x: 0.001, dist: 6 });
      if (det && det.park) {                                                                                  // ON THE SLIP ROAD: everything stays where it stands (the road bends, World.extraOff; Renderer3D turns each slot with it)
        out.push({ prop: 'pkMainRoad', x: 0.001, dist: 6 });
        const s0 = NeonAvenue.psh(k / PN), s1 = NeonAvenue.psh((k + 1) / PN), rot = -Math.atan((s1 - s0) / 12);
        for (const o of out) { const nx = o.x + s0 + (s1 - s0) * o.dist / 12; if (o.x < 0 && nx >= 0) o.rotY = (o.rotY || 0) + Math.PI; o.x = nx; o.rotY = (o.rotY || 0) + rot; }
      }
    }
    for (const q of out) q.solo = true;
    return out;
  };

  // the look of the district: the soft lavender sky of the neon-quarter picture, bright daylight, a grey road with white lines
  ENV3D.artcity = {
    name: 'ART CITY',
    sky: { top: '#8c93e6', mid: '#aaa8f2', horizon: '#cfc6f6' },
    sunDisc: { color: '#ffffff', size: 0.01 },
    fog: { color: '#c6c0f2', near: 60, far: 240 },
    hemi: { sky: '#f2eeff', ground: '#9a90d8', intensity: 2.2 },
    sun: { color: '#ffffff', intensity: 1.8, position: [-6, 10, 5] },
    groundFar: '#b4aee8',
    road: { asphalt: ['#4a4d58', '#464953'], mark: '#ffffff', edge: '#ffffff', curb: ['#5a4ad8', '#5446cc'], curbFace: '#3a2fa0', walk: ['#d8d2f4', '#cfc8ee'], court: '#c4bde8', verge: ['#b8b0e6', '#b0a8e0'] },
    innerOk: new Set(),
    props: {},
    layout() { return []; },
  };
  ArtCity.props = props;
  if (ENV3D.neon) Object.assign(ENV3D.neon.props, props);
})();

