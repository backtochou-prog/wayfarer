// TreeSprite: the trees of every biome are the user's feather-tree artwork (TREE_ASSETS), drawn as two crossed, double-sided planes so a tree looks like a tree from
// the chase camera and from the side. One shared texture and material; one small shared geometry per prop name (its height differs). Unlit, so the artwork keeps its own
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
  // geometry of a tree `h` metres tall: two planes crossed at +-45 degrees, the trunk's foot at the origin
  geometry(h) {
    const A = TREE_ASSETS, w = h * A.w / A.h, pos = [], uv = [], idx = [];
    for (const ang of [Math.PI / 4, -Math.PI / 4]) {
      const c = Math.cos(ang), s = Math.sin(ang), o = pos.length / 3;
      for (const [u, v] of [[0, 0], [1, 0], [1, 1], [0, 1]]) { const x = (u - A.stalk) * w; pos.push(x * c, v * h, -x * s); uv.push(u, v); }
      idx.push(o, o + 1, o + 2, o, o + 2, o + 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
    g.computeBoundingSphere(); g.computeBoundingBox();
    return g;
  },
  prop(h) { return { sprite: this.geometry(h) }; },
};
