// NeonArt: the user's neon pictures (NEON_ASSETS, one atlas) as flat panels in the Neon Quarter: the big billboard and the facades of the two neon towers.
// One shared unlit texture and material (the artwork keeps its own colours, fogged like everything else). A prop factory returns
// { merged, sprite, material }: `merged` = the usual vertex-coloured geometry (Kit.merge), `sprite` = the textured panels; Renderer3D pools both together.
const NeonArt = {
  _mat: null,
  material() {
    if (!this._mat) {
      const img = new Image(), tex = new THREE.Texture(img);
      tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4; tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter;
      const mat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide });
      mat.visible = false; img.onload = () => { tex.needsUpdate = true; mat.visible = true; }; img.src = NEON_ASSETS.src;
      this._mat = mat;
    }
    return this._mat;
  },
  // the second atlas (NEON_ASSETS2, WebP with alpha): alpha-tested, so the transparent parts of the pictures stay see-through
  _mat2: null,
  material2() {
    if (!this._mat2) {
      const img = new Image(), tex = new THREE.Texture(img);
      tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4; tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter;
      const mat = new THREE.MeshBasicMaterial({ map: tex, alphaTest: 0.3, side: THREE.DoubleSide });
      mat.visible = false; img.onload = () => { tex.needsUpdate = true; mat.visible = true; }; img.src = NEON_ASSETS2.src;
      this._mat2 = mat;
    }
    return this._mat2;
  },
  // same as panel(), for a cell of the second atlas
  panel2(cell, x, z0, z1, y0, y1) { return this.panel(cell, x, z0, z1, y0, y1, NEON_ASSETS2); },
  // two crossed vertical planes (a free-standing cut-out seen from any side) of a cell of the second atlas, h metres tall, standing on y0, centred on the origin
  cross(cell, h, y0 = 0) {
    const c = NEON_ASSETS2[cell], w = h * c.ar, pos = [], uv = [], idx = [];
    for (const ang of [Math.PI / 4, -Math.PI / 4]) {
      const cs = Math.cos(ang), sn = Math.sin(ang), o = pos.length / 3;
      for (const [u, v] of [[0, 0], [1, 0], [1, 1], [0, 1]]) { const x = (u - 0.5) * w; pos.push(x * cs, y0 + v * h, -x * sn); uv.push(c.u0 + u * (c.u1 - c.u0), c.v0 + v * (c.v1 - c.v0)); }
      idx.push(o, o + 1, o + 2, o, o + 2, o + 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeBoundingSphere(); g.computeBoundingBox();
    return g;
  },
  // a vertical panel in the plane x = `x` (the facade plane of a prop; it faces -X), z from z0 to z1 (u grows with z), y from y0 to y1, showing atlas cell `cell`
  panel(cell, x, z0, z1, y0, y1, set = NEON_ASSETS) {
    const c = set[cell], g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([x, y0, z0, x, y0, z1, x, y1, z1, x, y1, z0], 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute([c.u0, c.v0, c.u1, c.v0, c.u1, c.v1, c.u0, c.v1], 2));
    g.setIndex([0, 1, 2, 0, 2, 3]); g.computeBoundingSphere(); g.computeBoundingBox();
    return g;
  },
};
