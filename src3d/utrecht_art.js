// UtrechtArt: the user's Utrecht street photos (UTRECHT_ASSETS, one WebP atlas with alpha: two art nouveau houses, the Choorstraat house, a shop window) as flat facade panels, and the herringbone
// brick paving of the streets, drawn once on a small canvas. Same contract as NeonArt / TramArt: a prop factory returns { merged, sprite, material: () => UtrechtArt.material() } and
// Renderer3D pools both together. The photographs keep their own colours; the facade material is only toned a little toward the evening so that a daylight photo does not glow against the dusk.
const UtrechtArt = {
  _mat: null, _pave: null,
  material() {
    if (!this._mat) {
      const img = new Image(), tex = new THREE.Texture(img);
      tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4; tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter;
      const mat = new THREE.MeshBasicMaterial({ map: tex, color: 0xb9bed6, alphaTest: 0.3, side: THREE.DoubleSide });
      mat.visible = false; img.onload = () => { tex.needsUpdate = true; mat.visible = true; }; img.src = UTRECHT_ASSETS.src;
      this._mat = mat;
    }
    return this._mat;
  },
  // the canal water: the user's own photo of the canal (a 256 px tile, UTRECHT_WATER), mirrored so that it tiles without a seam; the caller sets `map.repeat` (and may scroll `map.offset`)
  waterMaterial() {
    if (!this._water) {
      const img = new Image(), tex = new THREE.Texture(img);
      tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = tex.wrapT = THREE.MirroredRepeatWrapping; tex.anisotropy = 4;
      const mat = new THREE.MeshBasicMaterial({ map: tex }); mat.color.setRGB(1.5, 1.75, 2.2);              // a daylight photo of dark water, lifted and cooled a little for the blue hour
      mat.visible = false; img.onload = () => { tex.needsUpdate = true; mat.visible = true; }; img.src = UTRECHT_WATER.src;
      this._water = mat;
    }
    return this._water;
  },
  // herringbone paving: brick-sized rectangles tilted 45 degrees, the tilt alternating from one column to the next, in browns and reds with dark joints (a 256 px tile, 1.6 m of street)
  paveMaterial() {
    if (!this._pave) {
      const cv = document.createElement('canvas'); cv.width = cv.height = 256; const x = cv.getContext('2d'); let s = 4242; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
      x.fillStyle = '#2e2422'; x.fillRect(0, 0, 256, 256);
      const tones = ['#7a5048', '#6e4a42', '#85584c', '#5e4640', '#8a6a5c', '#6a5650'];
      for (let c = 0; c < 8; c++) for (let k = 0; k < 8; k++) {
        const cx = c * 32 + 16, cy = k * 32 + (c % 2) * 16, col = tones[Math.floor(r() * tones.length)];
        for (const ox of [-256, 0, 256]) for (const oy of [-256, 0, 256]) { x.save(); x.translate(cx + ox, cy + oy); x.rotate((c % 2 ? -1 : 1) * Math.PI / 4); x.fillStyle = col; x.fillRect(-21, -6.5, 42, 13); x.restore(); }        // (copies shifted by the tile size: the bricks wrap round the edges)
      }
      const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.anisotropy = 4;
      this._pave = new THREE.MeshLambertMaterial({ map: tex });
    }
    return this._pave;
  },
  // a vertical panel in the plane x = `x` (the facade plane of a prop; it faces -X), z from z0 to z1, y from y0 to y1, showing cell `cell`
  panel(cell, x, z0, z1, y0, y1) {
    const c = UTRECHT_ASSETS[cell], g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([x, y0, z0, x, y0, z1, x, y1, z1, x, y1, z0], 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute([c.u0, c.v0, c.u1, c.v0, c.u1, c.v1, c.u0, c.v1], 2));
    g.setIndex([0, 1, 2, 0, 2, 3]); g.computeBoundingSphere(); g.computeBoundingBox();
    return g;
  },
  // the four faces of a square tower (half-sizes hx, hz about the origin) from y0 to y1, each showing atlas cell `cell` (the Dom tower under scaffolding)
  tower(cell, hx, hz, y0, y1) {
    const c = UTRECHT_ASSETS[cell], faces = [[-hx, -hz, hx, -hz], [hx, -hz, hx, hz], [hx, hz, -hx, hz], [-hx, hz, -hx, -hz]], list = [];
    for (const [xa, za, xb, zb] of faces) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute([xa, y0, za, xb, y0, zb, xb, y1, zb, xa, y1, za], 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute([c.u0, c.v0, c.u1, c.v0, c.u1, c.v1, c.u0, c.v1], 2)); g.setIndex([0, 1, 2, 0, 2, 3]); list.push(g);
    }
    return this.join(list);
  },
  // a horizontal quad (the paving of a street slab) x0..x1, z0..z1 at height y, the tile repeating every 1.6 m
  floor(x0, x1, z0, z1, y) {
    const g = new THREE.BufferGeometry(), t = 1.6;
    g.setAttribute('position', new THREE.Float32BufferAttribute([x0, y, z1, x1, y, z1, x1, y, z0, x0, y, z0], 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, (x1 - x0) / t, 0, (x1 - x0) / t, (z1 - z0) / t, 0, (z1 - z0) / t], 2));
    g.setIndex([0, 1, 2, 0, 2, 3]); g.computeBoundingSphere(); g.computeBoundingBox();
    return g;
  },
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
