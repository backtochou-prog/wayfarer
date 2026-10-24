// Kit: shared contract for the 3D modules. Build-once low-poly geometry with per-vertex colours,
// shared materials, the 3D palette and the world dimensions every module agrees on.
//
// Scene conventions (metres, +Y up):
//  - The runner always stands at the origin and runs toward -Z; the camera sits behind it at +Z.
//    Everything else is positioned relative to the runner each frame (so precision never degrades).
//  - Three lanes at x = -LANE_X, 0, +LANE_X. Asphalt spans |x| <= ROAD_HALF; its top surface is y = 0.
//  - The road is built from segments SEG_LEN long. A segment's local geometry spans z in [-SEG_LEN, 0].
//  - Gameplay units (World/TRACK, inherited from the 2D game) convert with U3: x * U3.X, z * U3.Z, height * U3.Y.
const LANE_X = 2.2, SEG_LEN = 12, ROAD_HALF = 3.3, CURB_W = 0.3, WALK_W = 3.0;  // sidewalk spans ROAD_HALF+CURB_W .. +WALK_W
const WALK_Y = 0.15;                       // top of curbs/sidewalks; roadside props and buildings stand on this level
const FRONT_X = ROAD_HALF + CURB_W + WALK_W + 0.4;   // 7.0: building facades line up here (|x|)
const U3 = { X: LANE_X / LANE_W, Z: 0.1, Y: 0.075 };                            // LANE_W comes from track.js

// Palette: WAYFARER's amber / burgundy / teal / forest green / earth, lit by a warm low sun.
const PAL3 = {
  // runner (same identity as the pixel sprite)
  cap: '#7e2a3f', capBand: '#e8a33d', scarf: '#f0b048', jacket: '#2b8a86', jacketDark: '#1f6664',
  pack: '#6b2737', packDark: '#4a1a2b', bedroll: '#7fc4b8', trousers: '#6a4a36', boots: '#2e2233', skin: '#e2b08a', hair: '#4a3228',
  // city
  terracotta: '#c4623f', terracottaDark: '#9a4632', burgundy: '#7e3040', cream: '#ead7b0', ochre: '#d9a24a', sand: '#cdb187',
  teal: '#3d8a86', slate: '#4a4458', roofTile: '#a8483a', roofDark: '#6e2f2c', window: '#ffd27a', windowDark: '#3a3448', door: '#5a3a2a',
  asphalt: '#5a4f5c', asphaltAlt: '#544a56', laneLine: '#f1e3c0', curb: '#cdb187', sidewalk: '#b89f80', sidewalkAlt: '#a88f72',
  lampPost: '#2e2a33', lampGlow: '#ffd27a', leaf: '#4d8f4a', leafDark: '#2f6b3a', trunk: '#6a4a36', bush: '#3f7d45',
  // pickups / hazards
  coin: '#f2b630', coinEdge: '#c98a1c', wood: '#a87447', woodDark: '#7a5234', stripeRed: '#b23a3a', stripeCream: '#f3e6c8', metal: '#6f6a78',
};

const Kit = {
  _mats: null,
  // One lit (Lambert, flat-shaded, vertex colours) and one unlit "glow" material shared by every mesh in the game.
  materials() {
    if (!this._mats) this._mats = {
      lit: new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }),
      glow: new THREE.MeshBasicMaterial({ vertexColors: true }),
    };
    return this._mats;
  },

  // ---- primitives. Each returns a "part" { geo, color, glow } positioned in its prop's local space.
  // o: { rx, ry, rz (radians, about the part's own centre), glow: true for unlit/emissive-looking parts, seg }
  // Anchor: (x, y, z) is the centre of the part's bottom (before rotation); `centred` parts use their centre.
  // Scale (sx, sy, sz) and rotation (rx, ry, rz) happen about the part's own centre.
  _part(geo, color, o, x, y, z, centred) {
    geo.computeBoundingBox();
    const bb = geo.boundingBox, sy = o.sy || 1, h = (bb.max.y - bb.min.y) * sy;
    geo.translate(-(bb.min.x + bb.max.x) / 2, -(bb.min.y + bb.max.y) / 2, -(bb.min.z + bb.max.z) / 2);
    geo.applyMatrix4(new THREE.Matrix4().makeScale(o.sx || 1, sy, o.sz || 1));
    geo.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(o.rx || 0, o.ry || 0, o.rz || 0)));
    geo.translate(x, y + (centred ? 0 : h / 2), z);
    const g = geo.index ? geo.toNonIndexed() : geo;
    if (g !== geo) geo.dispose();
    g.deleteAttribute('uv'); g.deleteAttribute('normal');
    g.computeVertexNormals();
    return { geo: g, color: color, glow: !!o.glow };
  },
  box(w, h, d, x, y, z, color, o = {}) { return this._part(new THREE.BoxGeometry(w, h, d), color, o, x, y, z, false); },
  cyl(rTop, rBot, h, x, y, z, color, o = {}) { return this._part(new THREE.CylinderGeometry(rTop, rBot, h, o.seg || 6), color, o, x, y, z, false); },
  cone(r, h, x, y, z, color, o = {}) { return this._part(new THREE.ConeGeometry(r, h, o.seg || 6), color, o, x, y, z, false); },
  ico(r, x, y, z, color, o = {}) { return this._part(new THREE.IcosahedronGeometry(r, o.detail || 0), color, o, x, y, z, true); },
  // gable roof: triangular prism, base w (x) by d (z), ridge height h, ridge runs along z (use ry to turn it)
  roof(w, h, d, x, y, z, color, o = {}) {
    const a = w / 2, b = d / 2, P = [
      -a, 0, b, a, 0, b, 0, h, b,      a, 0, -b, -a, 0, -b, 0, h, -b,              // gable ends
      -a, 0, b, 0, h, b, 0, h, -b,     -a, 0, b, 0, h, -b, -a, 0, -b,              // left slope
      a, 0, b, a, 0, -b, 0, h, -b,     a, 0, b, 0, h, -b, 0, h, b,                 // right slope
      -a, 0, b, -a, 0, -b, a, 0, -b,   -a, 0, b, a, 0, -b, a, 0, b];               // bottom
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    return this._part(geo, color, o, x, y, z, false);
  },

  // Merge parts into at most two geometries ({ lit, glow }), each with flat normals and a per-vertex colour.
  // Call once at start-up (never per frame); the part geometries are disposed.
  merge(parts) {
    const build = list => {
      if (!list.length) return null;
      let n = 0; for (const p of list) n += p.geo.attributes.position.count;
      const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3), c = new THREE.Color();
      let o = 0;
      for (const p of list) {
        const P = p.geo.attributes.position.array, N = p.geo.attributes.normal.array, k = P.length;
        pos.set(P, o); nor.set(N, o); c.set(p.color);
        for (let i = 0; i < k; i += 3) { col[o + i] = c.r; col[o + i + 1] = c.g; col[o + i + 2] = c.b; }
        o += k; p.geo.dispose();
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
      g.setAttribute('color', new THREE.BufferAttribute(col, 3));
      g.computeBoundingSphere(); g.computeBoundingBox();
      return g;
    };
    return { lit: build(parts.filter(p => !p.glow)), glow: build(parts.filter(p => p.glow)) };
  },

  // A Group holding one mesh per non-empty geometry of a merged prop, using the shared materials.
  mesh(merged) {
    const g = new THREE.Group(), m = this.materials();
    if (merged.lit) g.add(new THREE.Mesh(merged.lit, m.lit));
    if (merged.glow) g.add(new THREE.Mesh(merged.glow, m.glow));
    return g;
  },
};
