// TramArt: the lettered signs of the Tram Street zone (the vertical POLYCLINIQUE blade sign and the VERHAEGEN shop fascia from the user's street photos, plus a TRAM stop plate
// and a couple of shop boards), drawn once on a small canvas atlas at start-up: no image file. One shared texture and material, same contract as NeonArt:
// a prop factory returns { merged, sprite, material: () => TramArt.material() } and Renderer3D pools both together.
const TramArt = {
  W: 512, H: 512, cells: {},
  _mat: null,
  // name: [x, y, w, h, background, text colour, text, orientation]
  SPEC: {
    poly:  [0, 0, 128, 512, '#e9e3d4', '#2c2a35', 'POLYCLINIQUE', 'v'],       // vertical blade sign, letters stacked
    verh:  [128, 0, 384, 96, '#4a2e28', '#f1e3c4', 'VERHAEGEN', 'h'],           // shop fascia
    stop:  [128, 96, 192, 96, '#b8342f', '#fdf1dc', 'TRAM', 'h'],               // tram stop plate
    brass: [320, 96, 192, 96, '#2f5d4a', '#f1e3c4', 'BRASSERIE', 'h'],
    pharm: [128, 192, 384, 96, '#e8e2d2', '#1f7a4d', 'PHARMACIE', 'h'],
    cafe:  [128, 288, 384, 96, '#6b2737', '#f3cf7a', 'CAFE', 'h'],
    boul:  [128, 384, 384, 96, '#d9b46a', '#4a2e28', 'BOULANGERIE', 'h'],
  },
  _build() {
    const c = document.createElement('canvas'); c.width = this.W; c.height = this.H;
    const g = c.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, this.W, this.H);
    for (const name in this.SPEC) {
      const [x, y, w, h, bg, fg, text, o] = this.SPEC[name];
      g.fillStyle = bg; g.fillRect(x, y, w, h);
      g.strokeStyle = fg; g.lineWidth = 3; g.strokeRect(x + 4, y + 4, w - 8, h - 8);
      g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
      if (o === 'v') {                                                  // letters stacked top to bottom
        const n = text.length, step = (h - 24) / n; g.font = 'bold ' + Math.floor(step * 0.86) + 'px Arial, Helvetica, sans-serif';
        for (let k = 0; k < n; k++) g.fillText(text[k], x + w / 2, y + 12 + (k + 0.5) * step);
      } else {
        let s = Math.floor(h * 0.6); g.font = 'bold ' + s + 'px Arial, Helvetica, sans-serif';
        while (g.measureText(text).width > w - 24 && s > 8) { s -= 2; g.font = 'bold ' + s + 'px Arial, Helvetica, sans-serif'; }
        g.fillText(text, x + w / 2, y + h / 2 + 2);
      }
      this.cells[name] = { u0: (x + 2) / this.W, u1: (x + w - 2) / this.W, v0: 1 - (y + h - 2) / this.H, v1: 1 - (y + 2) / this.H, ar: w / h };
    }
    return c;
  },
  material() {
    if (!this._mat) {
      const tex = new THREE.CanvasTexture(this._build());
      tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
      // unlit like the other art, toned down a little: the street is backlit, so a full-bright sign would glow against it
      this._mat = new THREE.MeshBasicMaterial({ map: tex, color: 0xe6d2bc, side: THREE.DoubleSide });
    }
    return this._mat;
  },
  // a vertical panel in the plane x = `x` (the facade plane of a prop; it faces -X), z from z0 to z1, y from y0 to y1, showing cell `name`
  panel(name, x, z0, z1, y0, y1) {
    this.material();
    const c = this.cells[name], g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([x, y0, z0, x, y0, z1, x, y1, z1, x, y1, z0], 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute([c.u0, c.v0, c.u1, c.v0, c.u1, c.v1, c.u0, c.v1], 2));
    g.setIndex([0, 1, 2, 0, 2, 3]); g.computeBoundingSphere(); g.computeBoundingBox();
    return g;
  },
  // a sign standing across the street (in the plane z = `z`, x from x0 to x1), readable from both ends of the street: two panels back to back, the far one mirrored
  // so the letters read correctly whichever side of the road the prop stands on (a prop on the left of the road is turned half a circle)
  blade(name, z, x0, x1, y0, y1) {
    this.material();
    const c = this.cells[name], face = (zz, flip) => {
      const g = new THREE.BufferGeometry(), ua = flip ? c.u1 : c.u0, ub = flip ? c.u0 : c.u1;
      g.setAttribute('position', new THREE.Float32BufferAttribute([x0, y0, zz, x1, y0, zz, x1, y1, zz, x0, y1, zz], 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute([ua, c.v0, ub, c.v0, ub, c.v1, ua, c.v1], 2));
      g.setIndex([0, 1, 2, 0, 2, 3]); return g;
    };
    return this.join([face(z + 0.03, false), face(z - 0.03, true)]);
  },
  // one single geometry holding several panels (a prop has one `sprite` geometry): merges position/uv/index arrays
  join(list) {
    const pos = [], uv = [], idx = [];
    for (const g of list) {
      const o = pos.length / 3, p = g.attributes.position.array, u = g.attributes.uv.array, ix = g.index.array;
      for (let i = 0; i < p.length; i++) pos.push(p[i]); for (let i = 0; i < u.length; i++) uv.push(u[i]); for (let i = 0; i < ix.length; i++) idx.push(ix[i] + o);
      g.dispose();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
    g.computeBoundingSphere(); g.computeBoundingBox();
    return g;
  },
};
