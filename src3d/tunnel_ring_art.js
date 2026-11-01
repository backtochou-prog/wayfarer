// TunnelRingArt: the mouth of the tunnel under the sea, the user's red glass ring (TUNNEL_RING, tools/make_tunnel_ring_assets.py): a plane across the road at each mouth, its hole as wide as the tunnel's ribs (8.3 m), the ring covering
// the ends of the ribs and of the dark lines of the vault that would otherwise stick out of the mouth. Unlit, only fogged.
const TunnelRingArt = {
  R: 8.3, _mat: null, _geo: null,
  material() {
    if (!this._mat) {
      const img = new Image(), tex = new THREE.Texture(img); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
      const mat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide, alphaTest: 0.5 }); mat.visible = false; img.onload = () => { tex.needsUpdate = true; mat.visible = true; }; img.src = TUNNEL_RING.src; this._mat = mat;
    }
    return this._mat;
  },
  size() { return 2 * this.R / TUNNEL_RING.hole; },                                  // the plane's side: its hole is R in radius
  mesh() { const s = this.size(); const m = new THREE.Mesh(new THREE.PlaneGeometry(s, s), this.material()); m.userData.cy = TUNNEL_RING.cy * s / 2; m.visible = false; m.frustumCulled = false; return m; },
};
