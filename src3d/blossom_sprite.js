// BlossomSprite: the trees of Saint-Gilles are the user's own photo of a cherry-blossom tree (BLOSSOM_ASSETS), drawn like the feather trees of the other zones (TreeSprite): two crossed,
// double-sided planes, so the tree looks like a tree from the chase camera and from the side, the trunk's foot at the origin. One shared texture and material; one geometry per prop name.
// Unlit, so the photo keeps its colours (toned down a little by TINT, so the pale blossom does not glow against the sunset), but fogged like everything else.
const BlossomSprite = {
  TINT: 0xffe0d2,                                                   // one constant: the warm tone the blossom is multiplied by (0xffffff = the photo as it is)
  _mat: null,
  material() {
    if (!this._mat) {
      const img = new Image(), tex = new THREE.Texture(img);
      tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4; tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter;
      const mat = new THREE.MeshBasicMaterial({ map: tex, color: this.TINT, transparent: true, alphaTest: 0.4, side: THREE.DoubleSide, depthWrite: true });
      mat.visible = false; img.onload = () => { tex.needsUpdate = true; mat.visible = true; }; img.src = BLOSSOM_ASSETS.src;
      this._mat = mat;
    }
    return this._mat;
  },
  // a tree `h` metres tall: two planes crossed at +-45 degrees, the trunk's foot at the origin
  geometry(h) {
    const A = BLOSSOM_ASSETS, w = h * A.w / A.h, pos = [], uv = [], idx = [];
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
  prop(h) { return { sprite: this.geometry(h), material: () => this.material() }; },
};
