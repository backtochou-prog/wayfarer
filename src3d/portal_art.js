// PortalArt: the user's STARGATE picture (PORTAL_ASSETS: pink-red neon rings round a white flare, on black), the door of every passage between two zones. Same contract as the other *Art modules
// (a prop factory returns { sprite, material }, Renderer3D pools it), with two differences. The picture is drawn with ADDITIVE blending: its black adds nothing, so the background is transparent and only
// the light is seen (not one pixel of it is changed), except in the middle, where a black disc over it makes the BLACK HOLE the runner is pulled into. And it is not fogged (a fogged additive layer would
// add the fog's colour): the renderer fades each gate in with its distance instead, one material per pooled gate.
const PortalArt = {
  _tex: null, _mats: [], _ready: false,
  // the black hole in the middle of the picture: the small dark patch inside its inner ring (circled by the user), moved 2 m down (0.175 of the door's 11.4 m) to the centre of the rings, behind the
  // white flare: centre and half axes as fractions of the picture
  // (cx, rx of its width; cy from the bottom, ry of its height)
  HOLE: { cx: 0.514, cy: 0.493, rx: 0.065, ry: 0.05 },
  texture() {
    if (!this._tex) {
      const img = new Image(), tex = new THREE.Texture(img);
      tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4; tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter;
      img.onload = () => { tex.needsUpdate = true; this._ready = true; for (const m of this._mats) m.visible = true; }; img.src = PORTAL_ASSETS.src;
      this._tex = tex;
    }
    return this._tex;
  },
  // one material per gate: the renderer sets its opacity every frame (fade in with the distance, out as the runner goes through); all share the one texture
  material() {
    const m = new THREE.MeshBasicMaterial({ map: this.texture(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false, toneMapped: false, opacity: 0 });
    m.visible = this._ready; this._mats.push(m); return m;
  },
  // the BLACK that fills that hole (the picture itself is transparent where it is black, so the middle is a black disc over it): opaque, not fogged, its opacity set with the door's
  holeMaterial() {
    const m = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false, toneMapped: false, opacity: 0 });
    m.visible = this._ready; this._mats.push(m); return m;
  },
  // the disc, a hair in front of the picture's plane (drawn after it: the picture's own glow, the white flare, would otherwise show through it and turn it pink)
  hole(w = 14) { const H = w / PORTAL_ASSETS.ar, g = new THREE.CircleGeometry(1, 56); g.scale(this.HOLE.rx * w, this.HOLE.ry * H, 1); g.translate((this.HOLE.cx - 0.5) * w, this.HOLE.cy * H, 0.03); return g; },
  // where the middle of the hole is, from the foot of a door of width `w` (metres)
  centre(w = 14) { return [(this.HOLE.cx - 0.5) * w, this.HOLE.cy * w / PORTAL_ASSETS.ar]; },
  // the picture on a plane of constant z (the runner meets it head on), `w` metres wide, as high as its own proportions make it, standing on the road (y = 0), the whole picture on it
  gate(w = 14) {
    const h = w / PORTAL_ASSETS.ar, g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([-w / 2, 0, 0, w / 2, 0, 0, w / 2, h, 0, -w / 2, h, 0], 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2)); g.setIndex([0, 1, 2, 0, 2, 3]); g.computeBoundingSphere(); g.computeBoundingBox();
    return g;
  },
};
