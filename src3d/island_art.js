// IslandArt: the user's four photos of the places that fill the empty lots of the island (ISLAND_ASSETS, one WebP atlas): the fruit stall, the beach cafe table, the pool terrace of the riad and the rocky cove,
// each hung as a framed picture at the end of its place (src3d/island_places.js). Same contract as CoastArt (a prop factory returns { merged, sprite, material }, Renderer3D pools it). The pictures keep their
// own colours (unlit, only fogged like everything else).
const IslandArt = {
  _mat: null,
  material() {
    if (!this._mat) {
      const img = new Image(), tex = new THREE.Texture(img);
      tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4; tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter;
      const mat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide, alphaTest: 0.5 });          // (alphaTest: the fruit shop's photo is cut along the line under the stall, transparent below it)
      mat.visible = false; img.onload = () => { tex.needsUpdate = true; mat.visible = true; }; img.src = ISLAND_ASSETS.src;
      this._mat = mat;
    }
    return this._mat;
  },
  // a vertical panel across the road (a plane of constant z: the runner meets it head on), x from x0 to x1, y from y0 to y1, showing the whole photo `cell`; the height follows the photo's proportions when y1 is omitted
  blade(cell, z, x0, x1, y0, y1) {
    const c = ISLAND_ASSETS[cell], g = new THREE.BufferGeometry(); if (y1 === undefined) y1 = y0 + (x1 - x0) / c.ar;
    g.setAttribute('position', new THREE.Float32BufferAttribute([x0, y0, z, x1, y0, z, x1, y1, z, x0, y1, z], 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute([c.u0, c.v0, c.u1, c.v0, c.u1, c.v1, c.u0, c.v1], 2)); g.setIndex([0, 1, 2, 0, 2, 3]); g.computeBoundingSphere(); g.computeBoundingBox();
    return g;
  },
  // a vertical panel along the road in the plane x = `x` (it faces the road, -X), z from z0 to z1, y from y0 to y1, showing the whole photo `cell`: the front of the fruit shop
  panel(cell, x, z0, z1, y0, y1) {
    const c = ISLAND_ASSETS[cell], g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([x, y0, z0, x, y0, z1, x, y1, z1, x, y1, z0], 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute([c.u0, c.v0, c.u1, c.v0, c.u1, c.v1, c.u0, c.v1], 2)); g.setIndex([0, 1, 2, 0, 2, 3]); g.computeBoundingSphere(); g.computeBoundingBox();
    return g;
  },
  // a name board painted on a canvas (cream letters on dark green, in a cream frame), one material per text; signPanel puts it on a wall: the plane x, z from z0 to z1, y from y0 to y1
  _signs: {},
  signMaterial(text) {
    if (!this._signs[text]) {
      const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 160; const x = cv.getContext('2d');
      x.fillStyle = '#1f4a2e'; x.fillRect(0, 0, 1024, 160); x.strokeStyle = '#f3e6c8'; x.lineWidth = 8; x.strokeRect(10, 10, 1004, 140);
      x.font = 'bold 104px "Arial Black", Impact, Arial, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#f3e6c8'; x.fillText(text, 512, 86);
      const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
      this._signs[text] = new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide });
    }
    return this._signs[text];
  },
  signPanel(x, z0, z1, y0, y1) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([x, y0, z0, x, y0, z1, x, y1, z1, x, y1, z0], 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2)); g.setIndex([0, 1, 2, 0, 2, 3]); g.computeBoundingSphere(); g.computeBoundingBox();
    return g;
  },
  join(list) { return CoastArt.join(list); },
};
