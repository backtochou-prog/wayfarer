// BoardArt: the user's picture of the rear of the electromagnetic skateboard (BOARD_ART) as a flat upright panel facing the chase camera (+z): the glowing engine ring at the back of every board,
// the one the player sees when riding and on the boards parked on the pavement. One shared unlit texture and material (the picture keeps its own colours, fogged like everything else); a
// prop factory returns { merged, sprite, material: () => BoardArt.material() } like the other textured props. Without it a board is just a dark deck with glowing edges.
const BoardArt = {
  _mat: null,
  material() {
    if (!this._mat) {
      const img = new Image(), tex = new THREE.Texture(img);
      tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4; tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter;
      const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.08, side: THREE.DoubleSide, depthWrite: true });
      mat.visible = false; img.onload = () => { tex.needsUpdate = true; mat.visible = true; }; img.src = BOARD_ART.src;
      this._mat = mat;
    }
    return this._mat;
  },
  // an upright panel `h` metres tall (its width follows the picture), centred on x, z, its foot at y, facing +z (and -z: double-sided). Several can be joined into one geometry with `join`.
  plane(x, y, z, h) {
    const w = h * BOARD_ART.w / BOARD_ART.h, g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([x - w / 2, y, z, x + w / 2, y, z, x + w / 2, y + h, z, x - w / 2, y + h, z], 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2)); g.setIndex([0, 1, 2, 0, 2, 3]); return g;
  },
  join(list) {
    const pos = [], uv = [], idx = [];
    for (const g of list) { const o = pos.length / 3, p = g.attributes.position.array, u = g.attributes.uv.array, ix = g.index.array; for (const v of p) pos.push(v); for (const v of u) uv.push(v); for (const v of ix) idx.push(v + o); g.dispose(); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
    g.computeBoundingSphere(); g.computeBoundingBox(); return g;
  },
};
