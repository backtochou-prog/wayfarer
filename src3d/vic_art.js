// VicArt: the cobbles of the streets of Vic, drawn once on a canvas (the user's photos of the town are models for the houses, they are never put on the street as pictures).
const VicArt = {
  _cob: null,
  // cobbles: rows of small dark blue-grey stones, a little offset from row to row (a 256 px tile = 2 m)
  cobbleMaterial() {
    if (!this._cob) {
      const cv = document.createElement('canvas'); cv.width = cv.height = 256; const x = cv.getContext('2d'); let s = 777; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
      x.fillStyle = '#2c2d36'; x.fillRect(0, 0, 256, 256); const tones = ['#5a5c6c', '#4e505f', '#666878', '#474957', '#6e707e'];
      for (let row = 0; row < 16; row++) for (let k = 0; k < 8; k++) { const w = 28 + r() * 6, px = (k * 32 + (row % 2) * 16 + r() * 3) % 256; x.fillStyle = tones[Math.floor(r() * tones.length)]; x.fillRect(px, row * 16 + 1, w - 3, 13); if (px + w > 256) x.fillRect(px - 256, row * 16 + 1, w - 3, 13); }
      const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.anisotropy = 4; this._cob = new THREE.MeshLambertMaterial({ map: tex });
    }
    return this._cob;
  },
  floor(x0, x1, z0, z1, y) {
    const g = new THREE.BufferGeometry(), t = 2;
    g.setAttribute('position', new THREE.Float32BufferAttribute([x0, y, z1, x1, y, z1, x1, y, z0, x0, y, z0], 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, (x1 - x0) / t, 0, (x1 - x0) / t, (z1 - z0) / t, 0, (z1 - z0) / t], 2));
    g.setIndex([0, 1, 2, 0, 2, 3]); g.computeBoundingSphere(); g.computeBoundingBox(); return g;
  },
  join(list) { return UtrechtArt.join(list); },
};
