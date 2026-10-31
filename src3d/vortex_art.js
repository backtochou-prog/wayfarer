// VortexArt: THE VORTEX, the hazard that replaces the crates in the 3D build (the user's words: "a rondelle that becomes turbulent, or better a spiral that absorbs the character when it passes over the rondelle, instead
// of a crash against the crate"). A flat round disc on the road, 2 m across (the width of its hit box: the runner's centre within 1.03 m of the middle) and 9 cm high, made of: the user's RED GLASS RING (VORTEX_ASSETS.ring, a red-and-black glass lens with a transparent hole) on top, her
// SPIRAL (VORTEX_ASSETS.spiral, crimson on black) in the hole, turning (the spiral winds counter-clockwise outward, so turning it counter-clockwise makes the lines flow IN: it pulls), and a translucent funnel of red
// swirls rising 1.05 m above it (the height of the old crate: it is what you can hit, you jump over it) that turns slowly the other way. Same hit box as the crate (src/track.js OBST.crate). Pooled by Items3D.
const VortexArt = {
  R: 1.0, H: 0.09, TOP: 1.05,                                    // the disc's radius, the thickness of the puck, the top of the funnel (= the old crate's height)
  _geo: null, _mats: null,
  tex(src, mat) { const img = new Image(), t = new THREE.Texture(img); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter;
    img.onload = () => { t.needsUpdate = true; mat.visible = true; }; img.src = src; return t; },
  materials() {
    if (!this._mats) {
      const ring = new THREE.MeshBasicMaterial({ transparent: false, alphaTest: 0.5, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }); ring.visible = false; ring.map = this.tex(VORTEX_ASSETS.ring, ring);
      const spiral = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }); spiral.visible = false; spiral.map = this.tex(VORTEX_ASSETS.spiral, spiral);
      // the funnel's swirls: slanted bands (they tile round the cone), bright red with a pale core, fading out toward the top
      const cv = document.createElement('canvas'); cv.width = 512; cv.height = 128; const x = cv.getContext('2d'); x.clearRect(0, 0, 512, 128);
      const bands = 5, W = 512, Hh = 128, slant = 150;
      for (let b = 0; b < bands; b++) for (const wrap of [-W, 0, W]) {
        const x0 = b * W / bands + wrap; x.beginPath(); x.moveTo(x0, Hh); x.lineTo(x0 + 48, Hh); x.lineTo(x0 + 48 + slant, 0); x.lineTo(x0 + slant, 0); x.closePath(); x.fillStyle = '#ff2a55'; x.fill();
        x.beginPath(); x.moveTo(x0 + 16, Hh); x.lineTo(x0 + 30, Hh); x.lineTo(x0 + 30 + slant, 0); x.lineTo(x0 + 16 + slant, 0); x.closePath(); x.fillStyle = '#ffc0cc'; x.fill();
      }
      x.globalCompositeOperation = 'destination-in'; const gr = x.createLinearGradient(0, Hh, 0, 0); gr.addColorStop(0, 'rgba(0,0,0,0.95)'); gr.addColorStop(0.55, 'rgba(0,0,0,0.55)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = gr; x.fillRect(0, 0, W, Hh);
      const ft = new THREE.CanvasTexture(cv); ft.colorSpace = THREE.SRGBColorSpace; ft.wrapS = THREE.RepeatWrapping; ft.anisotropy = 4;
      const funnel = new THREE.MeshBasicMaterial({ map: ft, transparent: true, depthWrite: false, side: THREE.DoubleSide, opacity: 0.95 });
      this._mats = { ring, spiral, funnel };
    }
    return this._mats;
  },
  geometries() {
    if (!this._geo) {
      const R = this.R, Hh = this.H, hole = VORTEX_ASSETS.hole, flat = g => g.rotateX(-Math.PI / 2);                  // (a circle's picture is seen right way up from behind, the top of the picture away from the camera)
      this._geo = {
        ring: flat(new THREE.CircleGeometry(R, 64)).translate(0, Hh + 0.015, 0),
        spiral: flat(new THREE.CircleGeometry(hole.r * R, 48)).translate(hole.x * R, Hh + 0.004, hole.z * R),
        funnel: new THREE.CylinderGeometry(R * 0.93, R * 0.62, this.TOP - Hh, 36, 1, true).translate(0, Hh + (this.TOP - Hh) / 2, 0),
        // the spiral turns about ITS OWN centre: the geometry is centred on the hole and the mesh is moved to it
        spiralCentred: flat(new THREE.CircleGeometry(hole.r * R, 48)),
      };
    }
    return this._geo;
  },
  // the solid parts, merged once: the dark puck and a glowing red rim on the road round it
  solid() { const R = this.R; return Kit.merge([Kit.cyl(R, R + 0.02, this.H, 0, 0, 0, '#2a0710', { seg: 40 }), Kit.cyl(R + 0.16, R + 0.16, 0.02, 0, 0, 0, '#ff2a4a', { glow: true, seg: 40 })]); },
  // the extra meshes of one pooled vortex (the ring, the spiral that turns, the funnel that turns the other way)
  attach(g) {
    const M = this.materials(), G = this.geometries(), hole = VORTEX_ASSETS.hole, R = this.R;
    const ring = new THREE.Mesh(G.ring, M.ring), spin = new THREE.Mesh(G.spiralCentred, M.spiral), fun = new THREE.Mesh(G.funnel, M.funnel);
    spin.position.set(hole.x * R, this.H + 0.004, hole.z * R); ring.renderOrder = 2; spin.renderOrder = 1; fun.renderOrder = 3;
    g.add(spin, ring, fun); g.userData.spin = spin; g.userData.fun = fun; g.userData.ring = ring;
  },
};
