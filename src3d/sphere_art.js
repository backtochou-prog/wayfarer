// SphereArt: the user's dotted sphere (SPHERE_ASSETS.map, src3d/sphere_assets.js made by tools/make_sphere.py: her partial picture completed into a whole sphere and unrolled, equirectangular, with alpha) as the
// texture of THE PROTECTIVE SPHERE: the aura you win on the circuit, as the bubble that wraps the runner (Perk3D) and as its pickup (Items3D). One texture for both; a material per use (each blinks on its own opacity).
// The body of the sphere is almost clear and the lime dots opaque, so it is drawn blended, double sided, without writing depth.
const SphereArt = {
  _tex: null, _mats: [],
  texture() {
    if (!this._tex) {
      const img = new Image(), tex = new THREE.Texture(img);
      tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4; tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter; tex.wrapS = THREE.RepeatWrapping;
      img.onload = () => { tex.needsUpdate = true; this.ready = true; for (const m of this._mats) m.visible = true; }; img.src = SPHERE_ASSETS.map.src; this._tex = tex;
    }
    return this._tex;
  },
  material(opacity = 1) {
    const m = new THREE.MeshBasicMaterial({ map: this.texture(), transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide }); m.visible = !!this.ready; this._mats.push(m); return m;
  },
  // a sphere mesh of radius r wearing it (the dots are the same size on every sphere: their angular size)
  mesh(r, opacity, seg = 32) { return new THREE.Mesh(new THREE.SphereGeometry(r, seg, Math.round(seg * 0.7)), this.material(opacity)); },
};
