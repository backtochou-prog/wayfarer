// TreeSprite: the trees of every biome are the user's feather-tree artwork (TREE_ASSETS), drawn as two crossed, double-sided planes so a tree looks like a tree from
// the chase camera and from the side, standing in a round bed of flowers on the ground. One shared texture and material; one small shared geometry per prop name (its height differs). Unlit, so the artwork keeps its own
// colours, but fogged like everything else. A prop factory returns { sprite: geometry }, which Renderer3D turns into pooled meshes.
// MIXED BEDS: the user's own flower disc is drawn smaller (BED_K of its old size, and with fewer upright flowers), and mixed with flowers from two of their photos of Brussels flowers (FLOWER_ASSETS:
// a ring of small ground patches of geraniums, marigolds, lobelia, and upright cornflower heads), on a second textured panel set (`extra`) with its own material (FlowerArt).
const TreeSprite = {
  BED_K: 0.62,
  _mat: null,
  material() {
    if (!this._mat) {
      const img = new Image(), tex = new THREE.Texture(img);
      tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4; tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter;
      const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.4, side: THREE.DoubleSide, depthWrite: true });
      mat.visible = false; img.onload = () => { tex.needsUpdate = true; mat.visible = true; }; img.src = TREE_ASSETS.src;
      this._mat = mat;
    }
    return this._mat;
  },
  // geometry of a tree `h` metres tall: two planes crossed at +-45 degrees, the trunk's foot at the origin, a flat round bed of flowers on the ground around it
  // (a horizontal quad of side 2 R, R = 0.23 h + 0.4 m, using the flower disc of the atlas), and a ring of upright flowers standing round the rim of the bed
  // (two small crossed planes each, pink / yellow / orange, 0.4 - 0.75 m tall, placed by a fixed formula: no random state). Vertices: 8 + 4 + 8 per flower.
  geometry(h) {
    const A = TREE_ASSETS, w = h * A.w / A.h, pos = [], uv = [], idx = [], R = (0.23 * h + 0.4) * this.BED_K, N = Math.round(R * 4.5);
    const quad = (pts, uvs) => { const o = pos.length / 3; for (let i = 0; i < 4; i++) { pos.push(pts[i][0], pts[i][1], pts[i][2]); uv.push(uvs[i][0], uvs[i][1]); } return o; };
    for (const ang of [Math.PI / 4, -Math.PI / 4]) {                                // the tree
      const c = Math.cos(ang), s = Math.sin(ang), pts = [], uvs = [];
      for (const [u, v] of [[0, 0], [1, 0], [1, 1], [0, 1]]) { const x = (u - A.stalk) * w; pts.push([x * c, v * h, -x * s]); uvs.push([u, A.tv0 + v * (A.tv1 - A.tv0)]); }
      const o = quad(pts, uvs); idx.push(o, o + 1, o + 2, o, o + 2, o + 3);
    }
    { const pts = [], uvs = [];                                                       // the flower bed, 4 cm above the pavement / verge
      for (const [u, v] of [[0, 0], [1, 0], [1, 1], [0, 1]]) { pts.push([(u - 0.5) * 2 * R, 0.04, (v - 0.5) * 2 * R]); uvs.push([u, A.bv0 + v * (A.bv1 - A.bv0)]); }
      const o = quad(pts, uvs); idx.push(o, o + 2, o + 1, o, o + 3, o + 2); }
    const hash = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
    for (let k = 0; k < N; k++) {                                                      // the ring of upright flowers
      const a = 2 * Math.PI * (k + 0.4 * hash(k)) / N, rad = R * (0.74 + 0.2 * hash(k + 50)), fh = 0.4 + 0.35 * hash(k + 100), fw = fh * 124 / 192, v = k % 3;
      const cx = Math.cos(a) * rad, cz = Math.sin(a) * rad, rot = hash(k + 150) * Math.PI;
      for (const off of [0, Math.PI / 2]) {
        const c = Math.cos(rot + off), s = Math.sin(rot + off), pts = [], uvs = [];
        for (const [u, vv] of [[0, 0], [1, 0], [1, 1], [0, 1]]) { const x = (u - 0.5) * fw; pts.push([cx + x * c, 0.04 + vv * fh, cz - x * s]); uvs.push([(v * 128 + 2 + u * 124) / 384, A.fv0 + vv * (A.fv1 - A.fv0)]); }      // flower v sits in cell v of the strip: pixels v * 128 + 2 .. + 124
        const o = quad(pts, uvs); idx.push(o, o + 1, o + 2, o, o + 2, o + 3);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
    g.computeBoundingSphere(); g.computeBoundingBox();
    g.userData.bedRadius = R; g.userData.flowers = N;
    return g;
  },
  // the mixed-in flowers of the user's photos (FLOWER_ASSETS), for a tree `h` metres tall: a ring of small ground patches (4 kinds) round the user's disc, and upright cornflower heads (4 kinds)
  flowers(h) {
    const F = FLOWER_ASSETS, R = (0.23 * h + 0.4) * this.BED_K, pos = [], uv = [], idx = [], hash = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
    const cell = c => { const col = c % F.cols, row = Math.floor(c / F.cols), e = 0.006; return [col / F.cols + e, (col + 1) / F.cols - e, 1 - (row + 1) / 2 + e, 1 - row / 2 - e]; };      // u0, u1, v0, v1 of cell c
    const quad = (pts, c) => { const [u0, u1, v0, v1] = cell(c), o = pos.length / 3; for (const p of pts) pos.push(p[0], p[1], p[2]); uv.push(u0, v0, u1, v0, u1, v1, u0, v1); idx.push(o, o + 1, o + 2, o, o + 2, o + 3); };
    const NP = Math.max(5, Math.round(R * 9));
    for (let k = 0; k < NP; k++) {                                                              // ground patches lying flat, a little above the user's disc
      const a = 2 * Math.PI * (k + 0.5 * hash(k + 7)) / NP, rad = R * (0.55 + 0.55 * hash(k + 17)), sz = (0.42 + 0.34 * hash(k + 27)) * (0.8 + 0.1 * h / 4.6), cx = Math.cos(a) * rad, cz = Math.sin(a) * rad, y = 0.05 + 0.004 * k, rot = hash(k + 37) * 6.283;
      const c = Math.cos(rot), sn = Math.sin(rot), pts = [[-1, 1], [1, 1], [1, -1], [-1, -1]].map(([x, z]) => [cx + (x * c - z * sn) * sz / 2, y, cz + (x * sn + z * c) * sz / 2]);
      quad(pts, k % 4);
    }
    const NH = Math.max(4, Math.round(R * 5));
    for (let k = 0; k < NH; k++) {                                                              // upright cornflower heads: two crossed small planes
      const a = 2 * Math.PI * (k + 0.5 * hash(k + 57)) / NH, rad = R * (0.6 + 0.6 * hash(k + 67)), cx = Math.cos(a) * rad, cz = Math.sin(a) * rad, fh = 0.3 + 0.26 * hash(k + 77), rot = hash(k + 87) * 3.1416, c4 = 4 + (k % 4);
      for (const off of [0, Math.PI / 2]) { const c = Math.cos(rot + off), sn = Math.sin(rot + off), w = fh * 0.9; quad([[-1, 0], [1, 0], [1, 2], [-1, 2]].map(([x, yy]) => [cx + x * w / 2 * c, 0.08 + yy * fh / 2, cz - x * w / 2 * sn]), c4); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeBoundingSphere(); g.computeBoundingBox();
    g.userData.patches = NP; g.userData.heads = NH; return g;
  },
  prop(h) { return { sprite: this.geometry(h), extra: typeof FLOWER_ASSETS !== 'undefined' ? [{ sprite: this.flowers(h), material: () => FlowerArt.material() }] : undefined }; },
};

// FlowerArt: the shared unlit alpha-tested material of the mixed-in flowers (FLOWER_ASSETS), like TreeSprite's.
const FlowerArt = {
  _mat: null,
  material() {
    if (!this._mat) {
      const img = new Image(), tex = new THREE.Texture(img);
      tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4; tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter;
      const mat = new THREE.MeshBasicMaterial({ map: tex, alphaTest: 0.4, transparent: true, side: THREE.DoubleSide, depthWrite: true });
      mat.visible = false; img.onload = () => { tex.needsUpdate = true; mat.visible = true; }; img.src = FLOWER_ASSETS.src;
      this._mat = mat;
    }
    return this._mat;
  },
};
