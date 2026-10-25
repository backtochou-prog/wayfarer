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
  // a vertical panel in the plane x = `x` (the facade plane of a prop; it faces -X), z from z0 to z1 (u grows with z), y from y0 to y1, showing atlas cell `cell`
  panel(cell, x, z0, z1, y0, y1) {
    const c = NEON_ASSETS[cell], g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([x, y0, z0, x, y0, z1, x, y1, z1, x, y1, z0], 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute([c.u0, c.v0, c.u1, c.v0, c.u1, c.v1, c.u0, c.v1], 2));
    g.setIndex([0, 1, 2, 0, 2, 3]); g.computeBoundingSphere(); g.computeBoundingBox();
    return g;
  },
};
