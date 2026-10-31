// RunnerZagla: ZAGLA, the second character, as a real 3D body, the size of Captain Strawberry (1.29 m wide with the arms, 1.9 m tall, 0.83 m deep: his artwork's own dimensions), (ZAGLA_ASSETS, made by tools/make_zagla_assets.py from the user's picture of her): her silhouette inflated into a volume (a round cross-section),
// wearing the user's picture on the FRONT (its own colours) and the BACK of C.Strawberry, fitted onto her shape and recoloured into her palette, as the material of the BACK (the view the chase camera sees).
// The body is one piece; the two legs are their own pieces, pivoting at the hips, and swing in the run. It has the same interface as RunnerSprite (group, shadow, update(dt, state), cur, the vehicles: it stands
// on the scooter, the board and the surfboard like the strawberry does), so the renderer and the tests treat both alike; unlike the flat cards it is a true 3D body: it keeps the heading of its group (it turns with the
// road), and in the menu it faces the camera (its front) while the camera drifts round it.
// Facing -Z like the other runners: the BACK surface is at +Z (toward the chase camera), the FRONT at -Z.
class RunnerZagla extends RunnerSprite {
  constructor() {
    super();
    for (const k in this.cards) this.pivot.remove(this.cards[k]);                    // not the strawberry's artwork
    const A = ZAGLA_ASSETS, MX = A.mppx, MY = A.mppy, MZ = A.mppz, S = A.step, u8 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
    const tex = {};
    for (const k of ['front', 'back']) {
      const img = new Image(), t = new THREE.Texture(img); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter;
      img.onload = () => { t.needsUpdate = true; }; img.src = A[k]; tex[k] = t;
    }
    // HER SIDE PICTURE (A.side, the user's retouched side view of herself): the texture of the flanks. It is projected along x (the u coordinate is the depth z, v the height), and every pixel of the body mixes it with the front or back
    // picture by how much its surface faces sideways (smoothstep of |normal.x| from 0.3 to 0.65, only on the egg of her body and her legs: the thin arms and the hair keep their own pictures), so the front and the back pictures meet the side picture without a seam.
    if (A.side) { const img = new Image(), t = new THREE.Texture(img); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; img.onload = () => { t.needsUpdate = true; }; img.src = A.side.src; tex.side = t; }
    this.tex = tex;
    // lit, glossy (a specular sheen on the black), and the picture's own colours kept bright by an emissive copy of it (so the neon stays neon in every biome's light)
    const mat = t => new THREE.MeshPhongMaterial({ map: t, emissiveMap: t, emissive: 0xffffff, emissiveIntensity: 0.6, specular: 0x666666, shininess: 60 });
    this.mats = { front: mat(tex.front), back: mat(tex.back) };
    if (tex.side) for (const k of ['front', 'back']) {
      const m = this.mats[k]; m.customProgramCacheKey = () => 'zagla-side';
      m.onBeforeCompile = sh => {
        sh.uniforms.sideMap = { value: tex.side };
        sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec2 uvSide; attribute float sideK; varying vec2 vUvSide; varying float vSideW;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvUvSide = uvSide; vSideW = smoothstep(0.3, 0.65, abs(objectNormal.x)) * sideK;');
        sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform sampler2D sideMap; varying vec2 vUvSide; varying float vSideW;')
          .replace('#include <map_fragment>', 'vec4 sideC = texture2D(sideMap, vUvSide);\n#ifdef USE_MAP\nvec4 sampledDiffuseColor = texture2D(map, vMapUv); sampledDiffuseColor = mix(sampledDiffuseColor, sideC, vSideW); diffuseColor *= sampledDiffuseColor;\n#endif')
          .replace('#include <emissivemap_fragment>', '#ifdef USE_EMISSIVEMAP\nvec4 emissiveColor = texture2D(emissiveMap, vEmissiveMapUv); emissiveColor = mix(emissiveColor, sideC, vSideW); totalEmissiveRadiance *= emissiveColor.rgb;\n#endif');
      };
    }
    const surface = (P, face, ox, oy) => {                                           // one face of a piece: the grid vertices (x, y, +-z), the picture's coordinates as the UVs (the back one mirrored: it is the view from behind)
      // a back face with its own silhouette (P.b: the legs, whose boots seen from behind are not the front's) has its grid in the back texture's coordinates; otherwise it is the front's grid, mirrored
      const own = face === 'back' && P.b, D = own ? P.b : P, n = D.n, ij = new Uint16Array(u8(D.ij).buffer), zz = new Int16Array(u8(D.z).buffer), tri = new Uint16Array(u8(D.tri).buffer), sg = face === 'front' ? -1 : 1, zo = D.zo ? new Int16Array(u8(D.zo).buffer) : null, sw = D.sw ? u8(D.sw) : null;      // zo: the shift of the middle of each row toward the back (the side silhouette of the strawberry)
      const pos = new Float32Array(n * 3), uv = new Float32Array(n * 2);
      for (let k = 0; k < n; k++) {
        const x = ij[2 * k] * S, y = ij[2 * k + 1] * S, xf = own ? (A.w - 1) - x : x;
        pos[3 * k] = (A.axis - xf) * MX - ox; pos[3 * k + 1] = (A.foot - y) * MY - oy; pos[3 * k + 2] = (sg * zz[k] + (zo ? zo[k] : 0)) / 8 * MZ;
        uv[2 * k] = own ? x / A.w : face === 'front' ? x / A.w : 1 - x / A.w; uv[2 * k + 1] = 1 - y / A.h;
      }
      const idx = new Uint16Array(tri);
      // the winding that makes the normals point outward (+Z for the back face, -Z for the front one): checked on the first triangle, the whole list flipped if need be
      const a = idx[0] * 3, b = idx[1] * 3, c = idx[2] * 3, nz = (pos[b] - pos[a]) * (pos[c + 1] - pos[a + 1]) - (pos[b + 1] - pos[a + 1]) * (pos[c] - pos[a]);
      if ((nz > 0) !== (sg > 0)) for (let k = 0; k < idx.length; k += 3) { const t = idx[k + 1]; idx[k + 1] = idx[k + 2]; idx[k + 2] = t; }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
      if (A.side) { const Sd = A.side, us = new Float32Array(n * 2); for (let k = 0; k < n; k++) { us[2 * k] = (Sd.w / 2 + (pos[3 * k + 2] - Sd.zc) * Sd.ppm) / Sd.w; us[2 * k + 1] = 1 - (Sd.foot - (pos[3 * k + 1] + oy) * Sd.ppm) / Sd.h; } const sk = new Float32Array(n); for (let k = 0; k < n; k++) sk[k] = sw ? sw[k] / 255 : 1; g.setAttribute('uvSide', new THREE.BufferAttribute(us, 2)); g.setAttribute('sideK', new THREE.BufferAttribute(sk, 1)); }       /* (the side picture: u from the depth z, v from the height above her soles) */ g.setIndex(new THREE.BufferAttribute(idx, 1));
      g.computeVertexNormals(); g.computeBoundingSphere(); g.computeBoundingBox(); return g;
    };
    this.parts = {}; this.legs = []; this.tris = 0;
    for (const P of A.pieces) {
      const leg = P.name !== 'body', ox = leg ? (A.axis - P.pivot[0]) * MX : 0, oy = leg ? (A.foot - P.pivot[1]) * MY : 0, grp = new THREE.Group();
      grp.position.set(ox, oy, 0);
      for (const face of ['front', 'back']) { const g = surface(P, face, ox, oy), m = new THREE.Mesh(g, this.mats[face]); grp.add(m); this.tris += g.index.count / 3; }
      this.pivot.add(grp); this.parts[P.name] = grp; if (leg) this.legs.push(grp);
    }
    this.legAmp = 0;
  }

  update(dt, s) {
    if (s.state === 'pause') return;                                                  // hold the pose
    super.update(dt, s);
    this.pivot.rotation.y = this.pivot.rotation.y + this.group.rotation.y - (s.faceYaw || 0);   // a 3D body keeps the heading of the group (the card cancels it); only the showcase spin stays
    const T = s.time, run = s.state === 'play' && !s.sliding && !s.airborne && this.ride < 0.5, show = s.state === 'title' && T % 10 >= 7.6;
    const amp = run ? 1 : show ? 0.8 : 0, k = 1 - Math.exp(-12 * dt); this.legAmp += (amp - this.legAmp) * k;
    const a = Math.sin(this.phase) * 0.75 * this.legAmp, tuck = s.airborne ? -0.55 : s.sliding ? -0.9 : 0;                  // in the air the legs tuck forward, in the slide they stick out
    this.legs[0].rotation.x += (a + tuck - this.legs[0].rotation.x) * Math.min(1, k * 1.5);
    if (this.legs[1]) this.legs[1].rotation.x += (-a + tuck - this.legs[1].rotation.x) * Math.min(1, k * 1.5);
  }
}
