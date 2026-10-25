// TreeSprite: the trees of every biome are the user's feather-tree artwork (TREE_ASSETS), drawn as two crossed, double-sided planes so a tree looks like a tree from
// the chase camera and from the side, standing in a round bed of flowers on the ground. One shared texture and material; one small shared geometry per prop name (its height differs). Unlit, so the artwork keeps its own
// colours, but fogged like everything else. A prop factory returns { sprite: geometry }, which Renderer3D turns into pooled meshes.
const TreeSprite = {
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
    const A = TREE_ASSETS, w = h * A.w / A.h, pos = [], uv = [], idx = [], R = 0.23 * h + 0.4, N = Math.round(R * 7);
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
  prop(h) { return { sprite: this.geometry(h) }; },
};
