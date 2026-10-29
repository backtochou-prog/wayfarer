// ParasolArt: the user's red and cream SUNBURST picture (PARASOL_ASSETS, one square WebP) as the canopy of the giant beach parasols of the coast. The picture is wound on an open cone seen from above:
// its centre (where the rays meet) is the apex, so the rays run down the canopy as the ribs of a real parasol. Same contract as the other *Art modules: a prop factory returns { merged, sprite, material }.
const ParasolArt = {
  _mat: null,
  material() {
    if (!this._mat) {
      const img = new Image(), tex = new THREE.Texture(img);
      tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4; tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter;
      const mat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide });
      mat.visible = false; img.onload = () => { tex.needsUpdate = true; mat.visible = true; }; img.src = PARASOL_ASSETS.src;
      this._mat = mat;
    }
    return this._mat;
  },
  // the canopy: an open cone of radius R and height H, its rim at height y0 and its apex above; the picture is mapped as a view from above (u = 0.5 + x / 2R, v = 0.5 - z / 2R)
  canopy(R, H, y0) {
    const g = new THREE.ConeGeometry(R, H, 48, 1, true), P = g.attributes.position, U = g.attributes.uv;
    for (let i = 0; i < P.count; i++) U.setXY(i, 0.5 + P.getX(i) / (2 * R), 0.5 - P.getZ(i) / (2 * R));
    g.translate(0, H / 2 + y0, 0); U.needsUpdate = true; g.computeBoundingSphere(); g.computeBoundingBox();
    return g;
  },
};
