// VortexArt: THE VORTEX, the hazard that replaces the crates in the 3D build (the user's words: "a rondelle that becomes turbulent, or better a spiral that absorbs the character when it passes over the rondelle, instead
// of a crash against the crate", then "lay the rondelle and its spiral flat, like a round carpet"). A ROUND RUG lying flat on the road, 2 m across (the width of its hit box: the runner's centre within 1.03 m of the middle)
// and 3 cm thick: the user's RED GLASS RING (VORTEX_ASSETS.ring, a red-and-black glass lens with a transparent hole) round the edge, her SPIRAL (VORTEX_ASSETS.spiral, crimson on black) in the hole, turning (the spiral
// winds counter-clockwise outward, so turning it counter-clockwise makes the lines flow IN: it pulls), a second copy of the spiral laid over it, additive and turning the other way, so that the lines interfere and
// the carpet looks turbulent, and a glowing red rim on the road. Same hit box as the crate (src/track.js OBST.crate: it is flat, you jump over it). Pooled by Items3D.
const VortexArt = {
  R: 1.0, H: 0.03,                                               // the rug's radius and thickness
  _geo: null, _mats: null,
  tex(src, mat) { const img = new Image(), t = new THREE.Texture(img); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter;
    img.onload = () => { t.needsUpdate = true; mat.visible = true; if (mat._also) mat._also.visible = true; }; img.src = src; return t; },
  materials() {
    if (!this._mats) {
      const ring = new THREE.MeshBasicMaterial({ transparent: false, alphaTest: 0.5, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }); ring.visible = false; ring.map = this.tex(VORTEX_ASSETS.ring, ring);
      const spiral = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }); spiral.visible = false; spiral.map = this.tex(VORTEX_ASSETS.spiral, spiral);
      // the second spiral, laid over the first: additive (its black adds nothing), turning the other way, a little fainter
      const over = new THREE.MeshBasicMaterial({ map: spiral.map, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }); over.visible = false; spiral._also = over;
      this._mats = { ring, spiral, over };
    }
    return this._mats;
  },
  geometries() {
    if (!this._geo) {
      const R = this.R, Hh = this.H, hole = VORTEX_ASSETS.hole, flat = g => g.rotateX(-Math.PI / 2);                  // (a circle's picture is seen right way up from behind, the top of the picture away from the camera)
      this._geo = {
        ring: flat(new THREE.CircleGeometry(R, 64)).translate(0, Hh + 0.008, 0),
                // the spiral turns about ITS OWN centre: the geometry is centred on the hole and the mesh is moved to it
        spiralCentred: flat(new THREE.CircleGeometry(hole.r * R, 48)),
      };
    }
    return this._geo;
  },
  // the solid parts, merged once: the thin dark body of the rug and a glowing red rim on the road round it
  solid() { const R = this.R; return Kit.merge([Kit.cyl(R, R + 0.01, this.H, 0, 0, 0, '#2a0710', { seg: 40 }), Kit.cyl(R + 0.16, R + 0.16, 0.012, 0, 0, 0, '#ff2a4a', { glow: true, seg: 40 })]); },
  // the extra meshes of one pooled vortex (the ring, the spiral that turns, the second spiral that turns the other way)
  attach(g) {
    const M = this.materials(), G = this.geometries(), hole = VORTEX_ASSETS.hole, R = this.R;
    const ring = new THREE.Mesh(G.ring, M.ring), spin = new THREE.Mesh(G.spiralCentred, M.spiral), fun = new THREE.Mesh(G.spiralCentred, M.over);
    spin.position.set(hole.x * R, this.H + 0.002, hole.z * R); fun.position.set(hole.x * R, this.H + 0.005, hole.z * R); ring.renderOrder = 2; spin.renderOrder = 1; fun.renderOrder = 3; fun.scale.setScalar(0.97);
    g.add(spin, ring, fun); g.userData.spin = spin; g.userData.fun = fun; g.userData.ring = ring;
  },
};
