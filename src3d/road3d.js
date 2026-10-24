// Road3D: the road, curbs, sidewalks and verges as two "ribbon" meshes (one per possible road of a junction).
// Each ribbon is SECTIONS cross-sections of fixed-size vertex buffers; every frame the sections are re-laid from
// World.bandsAt(), so a fork is real geometry: one road splits into two that diverge, run apart, and merge back, with the
// same widths, curve offsets and biome blend that gameplay uses. Nothing is allocated per frame (typed arrays are
// reused); sections are keyed by absolute distance, so markings and paving stay put in the world as the runner moves.
//
// Ribbon A is the single road (or the left road of a fork), ribbon B the right road of a fork (collapsed to zero area when
// there is only one road). Where two roads touch or overlap near the tips of a fork, each takes its half up to the midline,
// so surfaces never overlap or z-fight, and the inner curb/sidewalk strips shrink to nothing at the tip.
//
// Strips per section (left to right): verge, court, walk, curb top, curb face | ROAD | curb face, curb top, walk, court,
// verge, then four thin markings (two lane lines that dash, two continuous edge lines).
class Road3D {
  constructor(scene, envs, baseId) {
    const D = TRACK3D, N = this.N = D.SECTIONS, SC = this.SC = 15, VPS = this.VPS = SC * 2;
    this.baseId = baseId; this.envs = envs; this.pals = new Map();
    this.mat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, side: THREE.DoubleSide });
    this.OUT = D.CURB_W + D.WALK_W + D.COURT_W + D.FAR;              // "unlimited" room beside an outer edge
    const idx = new Uint16Array((N - 1) * SC * 6);
    let k = 0;
    for (let i = 0; i < N - 1; i++) for (let s = 0; s < SC; s++) {
      const a = i * VPS + s * 2, b = a + 1, c = a + VPS, d = c + 1;
      idx[k++] = a; idx[k++] = b; idx[k++] = c; idx[k++] = b; idx[k++] = d; idx[k++] = c;
    }
    this.rib = [];
    for (let r = 0; r < 2; r++) {
      const geo = new THREE.BufferGeometry(), pos = new Float32Array(N * VPS * 3), col = new Float32Array(N * VPS * 3);
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
      geo.setAttribute('color', new THREE.BufferAttribute(col, 3).setUsage(THREE.DynamicDrawUsage));
      geo.setIndex(new THREE.BufferAttribute(idx, 1));
      const mesh = new THREE.Mesh(geo, this.mat); mesh.frustumCulled = false; scene.add(mesh);
      this.rib.push({ geo, pos, col, mesh });
    }
    // road edges of the latest frame (scene metres, per section), kept so tests/tools can check the runner stays on the road
    this.edge = { n0: 0, z: new Float32Array(N), loA: new Float32Array(N), hiA: new Float32Array(N), loB: new Float32Array(N), hiB: new Float32Array(N), two: new Uint8Array(N) };
  }

  // blended road palette (Three colours) between the opening biome and `toId`, quantised to 8 steps
  pal(toId, t) {
    const q = Math.round(t * 8), key = toId + q;
    let p = this.pals.get(key);
    if (!p) {
      const a = this.envs[this.baseId].road, b = this.envs[toId].road, f = q / 8, C = () => new THREE.Color();
      const mixC = (x, y) => C().set(x).lerp(C().set(y), f);
      p = { asphalt: [mixC(a.asphalt[0], b.asphalt[0]), mixC(a.asphalt[1], b.asphalt[1])], mark: mixC(a.mark, b.mark), edge: mixC(a.edge, b.edge),
            curb: [mixC(a.curb[0], b.curb[0]), mixC(a.curb[1], b.curb[1])], curbFace: mixC(a.curbFace, b.curbFace),
            walk: [mixC(a.walk[0], b.walk[0]), mixC(a.walk[1], b.walk[1])], court: mixC(a.court, b.court), verge: [mixC(a.verge[0], b.verge[0]), mixC(a.verge[1], b.verge[1])] };
      this.pals.set(key, p);
    }
    return p;
  }

  // lateral edge (scene metres) of a band at gameplay z: centre line + curve offset, relative to the camera reference
  static lat(x, off, Lref) { return (x + off) * U3.X - Lref; }

  update(w, rzm, Lref) {
    const N = this.N, DS = TRACK3D.SECTION, n0 = Math.floor((rzm - TRACK3D.BEHIND) / DS), E = this.edge, OUT = this.OUT;
    E.n0 = n0;
    for (let i = 0; i < N; i++) {
      const n = n0 + i, zm = n * DS, sz = rzm - zm, par = n & 1, dash = !par;
      const bands = w.bandsAt(zm / U3.Z), bA = bands[0], bB = bands.length > 1 ? bands[1] : null;
      let loA = Road3D.lat(bA.lo, bA.off, Lref), hiA = Road3D.lat(bA.hi, bA.off, Lref), palA = this.pal(bA.to, bA.t);
      E.z[i] = sz; E.two[i] = bB ? 1 : 0;
      if (!bB) {
        E.loA[i] = loA; E.hiA[i] = hiA; E.loB[i] = E.hiB[i] = hiA;
        this.band(0, i, sz, loA, hiA, OUT, OUT, palA, par, dash);
        this.collapse(1, i, sz, hiA, palA);
        continue;
      }
      let loB = Road3D.lat(bB.lo, bB.off, Lref), hiB = Road3D.lat(bB.hi, bB.off, Lref), palB = this.pal(bB.to, bB.t);
      const mid = (hiA + loB) / 2;
      if (hiA > loB) {                                          // roads overlap (merge): both wear the chosen road's colours
        const ch = bA.chosen ? bA : bB.chosen ? bB : null;
        if (ch) palA = palB = this.pal(ch.to, ch.t);
      }
      const hiA2 = Math.min(hiA, mid), loB2 = Math.max(loB, mid);
      E.loA[i] = loA; E.hiA[i] = hiA2; E.loB[i] = loB2; E.hiB[i] = hiB;
      this.band(0, i, sz, loA, hiA2, OUT, Math.max(0, mid - hiA2), palA, par, dash);
      this.band(1, i, sz, loB2, hiB, Math.max(0, loB2 - mid), OUT, palB, par, dash);
    }
    for (const r of this.rib) { r.geo.attributes.position.needsUpdate = true; r.geo.attributes.color.needsUpdate = true; }
  }

  // write one vertex pair of strip s in section i
  put(r, i, s, xa, ya, xb, yb, z, c) {
    const R = this.rib[r], o = (i * this.VPS + s * 2) * 3, p = R.pos, k = R.col;
    p[o] = xa; p[o + 1] = ya; p[o + 2] = z; p[o + 3] = xb; p[o + 4] = yb; p[o + 5] = z;
    k[o] = c.r; k[o + 1] = c.g; k[o + 2] = c.b; k[o + 3] = c.r; k[o + 4] = c.g; k[o + 5] = c.b;
  }
  collapse(r, i, z, x, pal) { for (let s = 0; s < this.SC; s++) this.put(r, i, s, x, 0, x, 0, z, pal.asphalt[0]); }

  band(r, i, z, lo, hi, availL, availR, pal, par, dash) {
    const D = TRACK3D, CH = D.CURB_H;
    // widths of curb / walk / court / verge that fit in the room beside each edge
    let cwL = Math.min(D.CURB_W, availL), q = availL - cwL, wwL = Math.min(D.WALK_W, q); q -= wwL; let ctL = Math.min(D.COURT_W, q); q -= ctL; const vgL = Math.min(D.FAR, q);
    let cwR = Math.min(D.CURB_W, availR); q = availR - cwR; const wwR = Math.min(D.WALK_W, q); q -= wwR; const ctR = Math.min(D.COURT_W, q); q -= ctR; const vgR = Math.min(D.FAR, q);
    const L1 = lo - cwL, L2 = L1 - wwL, L3 = L2 - ctL, L4 = L3 - vgL, R1 = hi + cwR, R2 = R1 + wwR, R3 = R2 + ctR, R4 = R3 + vgR;
    const fL = cwL > 0.02 ? CH : 0, fR = cwR > 0.02 ? CH : 0;
    this.put(r, i, 0, L4, CH, L3, CH, z, pal.verge[par]);
    this.put(r, i, 1, L3, CH, L2, CH, z, pal.court);
    this.put(r, i, 2, L2, CH, L1, CH, z, pal.walk[par]);
    this.put(r, i, 3, L1, CH, lo, CH, z, pal.curb[par]);
    this.put(r, i, 4, lo, 0, lo, fL, z, pal.curbFace);
    this.put(r, i, 5, lo, 0, hi, 0, z, pal.asphalt[par]);
    this.put(r, i, 6, hi, 0, hi, fR, z, pal.curbFace);
    this.put(r, i, 7, hi, CH, R1, CH, z, pal.curb[par]);
    this.put(r, i, 8, R1, CH, R2, CH, z, pal.walk[par]);
    this.put(r, i, 9, R2, CH, R3, CH, z, pal.court);
    this.put(r, i, 10, R3, CH, R4, CH, z, pal.verge[par]);
    // markings: lane lines at the thirds (dashed), edge lines near each edge (continuous)
    const w = hi - lo, my = 0.02, wide = w > 2.4;
    const l1 = lo + w / 3, l2 = hi - w / 3, hw = 0.06;
    if (wide && dash) { this.put(r, i, 11, l1 - hw, my, l1 + hw, my, z, pal.mark); this.put(r, i, 12, l2 - hw, my, l2 + hw, my, z, pal.mark); }
    else { this.put(r, i, 11, l1, my, l1, my, z, pal.mark); this.put(r, i, 12, l2, my, l2, my, z, pal.mark); }
    if (w > 0.8) { this.put(r, i, 13, lo + 0.14, my, lo + 0.26, my, z, pal.edge); this.put(r, i, 14, hi - 0.26, my, hi - 0.14, my, z, pal.edge); }
    else { this.put(r, i, 13, lo, my, lo, my, z, pal.edge); this.put(r, i, 14, hi, my, hi, my, z, pal.edge); }
  }
}
