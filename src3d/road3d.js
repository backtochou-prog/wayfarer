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
    this.baseId = baseId; this.envs = envs; this.pals = {};
    this.P = new Float64Array(6); this.X = new Float64Array(12); this.Y = new Float64Array(12); this.C = new Array(11).fill(null);   // scratch for band()
    this.bc = []; for (let i = 0; i < N; i++) this.bc.push({ n: -1e9, ver: -1, bands: null });   // bands per section, reused until the track changes
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
    // WATER: where a biome's road palette says `water` (Utrecht) a translucent textured strip is laid over the road: the user's photo of the canal, tiled in the world (3.4 m a tile), with the alpha
    // following the biome blend, so it fades in and out with the zone. One strip along ribbon A (a canal is never part of a junction); it sits a hair above the road and under the lane marks.
    if (typeof UtrechtArt !== 'undefined' && typeof UTRECHT_WATER !== 'undefined') {
      const wm = UtrechtArt.waterMaterial(), g = new THREE.BufferGeometry(), pos = new Float32Array(N * 6), col = new Float32Array(N * 8), uv = new Float32Array(N * 4), wi = new Uint16Array((N - 1) * 6);
      for (let i = 0; i < N - 1; i++) { const a = i * 2; wi.set([a, a + 1, a + 2, a + 1, a + 3, a + 2], i * 6); }
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage)); g.setAttribute('color', new THREE.BufferAttribute(col, 4).setUsage(THREE.DynamicDrawUsage)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2).setUsage(THREE.DynamicDrawUsage)); g.setIndex(new THREE.BufferAttribute(wi, 1));
      const mat = new THREE.MeshBasicMaterial({ map: wm.map, vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
      const mesh = new THREE.Mesh(g, mat); mesh.frustumCulled = false; mesh.visible = false; mesh.renderOrder = 1; scene.add(mesh);
      this.wat = { geo: g, pos, col, uv, mesh, src: wm, any: false };
    }
    // road edges of the latest frame (scene metres, per section), kept so tests/tools can check the runner stays on the road
    this.edge = { n0: 0, z: new Float32Array(N), loA: new Float32Array(N), hiA: new Float32Array(N), loB: new Float32Array(N), hiB: new Float32Array(N), two: new Uint8Array(N) };
  }

  // blended road palette (Three colours) between the opening biome and `toId`, quantised to 8 steps
  pal(toId, t) {
    const q = Math.round(t * 8), row = this.pals[toId] || (this.pals[toId] = []);
    let p = row[q];
    if (!p) {
      const a = this.envs[this.baseId].road, b = this.envs[toId].road, f = q / 8, C = () => new THREE.Color();
      const mixC = (x, y) => C().set(x).lerp(C().set(y), f);
      p = { asphalt: [mixC(a.asphalt[0], b.asphalt[0]), mixC(a.asphalt[1], b.asphalt[1])], mark: mixC(a.mark, b.mark), edge: mixC(a.edge, b.edge),
            curb: [mixC(a.curb[0], b.curb[0]), mixC(a.curb[1], b.curb[1])], curbFace: mixC(a.curbFace, b.curbFace),
            walk: [mixC(a.walk[0], b.walk[0]), mixC(a.walk[1], b.walk[1])], court: mixC(a.court, b.court), verge: [mixC(a.verge[0], b.verge[0]), mixC(a.verge[1], b.verge[1])],
            rails: !!b.rails && f >= 0.5 };   // tram rails: the lane lines become continuous and a little wider once the zone is mostly in
      row[q] = p;
    }
    return p;
  }

  update(w, rzm, Lref) {
    const N = this.N, DS = TRACK3D.SECTION, n0 = Math.floor((rzm - TRACK3D.BEHIND) / DS), E = this.edge, OUT = this.OUT, P = this.P, X = U3.X;
    E.n0 = n0; const d0 = w.dropAt(rzm / U3.Z); if (this.wat) this.wat.any = false;                  // descent: each section sits lower by the fall between the runner and it (0 on flat road)
    for (let i = 0; i < N; i++) {
      const n = n0 + i, zm = n * DS, sz = rzm - zm, par = n & 1, dash = !par;
      const slot = this.bc[((n % N) + N) % N];
      if (slot.n !== n || slot.ver !== w.ver) { slot.n = n; slot.ver = w.ver; slot.bands = w.bandsAt(zm / U3.Z); }   // bands per section: computed once per section, not per frame
      const bands = slot.bands, bA = bands[0], bB = bands.length > 1 ? bands[1] : null;
      const loA = (bA.lo + bA.off) * X - Lref, hiA = (bA.hi + bA.off) * X - Lref;
      let palA = this.pal(bA.to, bA.t);
      E.z[i] = sz; E.two[i] = bB ? 1 : 0;
      P[5] = -(w.dropAt(zm / U3.Z) - d0) * U3.Z;
      if (this.wat) this.waterSection(i, zm, sz, loA, hiA, bB ? 0 : this.envs[bA.to].road.water ? bA.t : 0, P[5], Lref);
      P[0] = sz;                                               // doubles travel through P, not through call arguments (avoids boxing)
      if (!bB) {
        E.loA[i] = loA; E.hiA[i] = hiA; E.loB[i] = E.hiB[i] = hiA;
        P[1] = loA; P[2] = hiA; P[3] = OUT; P[4] = OUT; this.band(0, i, palA, par, dash);
        P[1] = hiA; this.collapse(1, i, palA);
        continue;
      }
      const loB = (bB.lo + bB.off) * X - Lref, hiB = (bB.hi + bB.off) * X - Lref;
      let palB = this.pal(bB.to, bB.t);
      const mid = (hiA + loB) / 2;
      if (hiA > loB) {                                          // roads overlap (merge): both wear the chosen road's colours
        const ch = bA.chosen ? bA : bB.chosen ? bB : null;
        if (ch) palA = palB = this.pal(ch.to, ch.t);
      }
      const hiA2 = Math.min(hiA, mid), loB2 = Math.max(loB, mid);
      E.loA[i] = loA; E.hiA[i] = hiA2; E.loB[i] = loB2; E.hiB[i] = hiB;
      P[1] = loA; P[2] = hiA2; P[3] = OUT; P[4] = Math.max(0, mid - hiA2); this.band(0, i, palA, par, dash);
      P[1] = loB2; P[2] = hiB; P[3] = Math.max(0, loB2 - mid); P[4] = OUT; this.band(1, i, palB, par, dash);
    }
    for (const r of this.rib) { r.geo.attributes.position.needsUpdate = true; r.geo.attributes.color.needsUpdate = true; }
    const W = this.wat; if (W) { W.mesh.visible = W.any && W.src.visible; W.geo.attributes.position.needsUpdate = true; W.geo.attributes.color.needsUpdate = true; W.geo.attributes.uv.needsUpdate = true; }
  }
  // one cross-section of the water strip: from lateral lo to hi (scene metres) at scene depth sz (absolute distance zm), alpha a (0 = nothing), road drop dy
  waterSection(i, zm, sz, lo, hi, a, dy, Lref) {
    const W = this.wat, p = W.pos, c = W.col, u = W.uv, T = 3.4, o = i * 6, k = i * 8, q = i * 4, y = 0.012 + dy;
    p[o] = lo; p[o + 1] = y; p[o + 2] = sz; p[o + 3] = hi; p[o + 4] = y; p[o + 5] = sz;
    u[q] = (lo + Lref) / T; u[q + 1] = zm / T; u[q + 2] = (hi + Lref) / T; u[q + 3] = zm / T;
    c[k] = c[k + 4] = 1.5; c[k + 1] = c[k + 5] = 1.75; c[k + 2] = c[k + 6] = 2.2; c[k + 3] = c[k + 7] = a * 0.92;      // a daylight photo of dark water, lifted and cooled for the blue hour
    if (a > 0.01) W.any = true;
  }

  // a collapsed (zero-area) ribbon section at lateral x = P[1], distance P[0]
  collapse(r, i, pal) {
    const R = this.rib[r], p = R.pos, k = R.col, c = pal.asphalt[0], x = this.P[1], z = this.P[0];
    for (let o = i * this.VPS * 3, e = o + this.VPS * 3; o < e; o += 3) { p[o] = x; p[o + 1] = 0; p[o + 2] = z; k[o] = c.r; k[o + 1] = c.g; k[o + 2] = c.b; }
  }

  // one road cross-section from P = [distance, lo, hi, room left, room right]
  band(r, i, pal, par, dash) {
    const D = TRACK3D, CH = D.CURB_H, P = this.P, z = P[0], lo = P[1], hi = P[2], availL = P[3], availR = P[4];
    // widths of curb / walk / court / verge that fit in the room beside each edge
    const cwL = Math.min(D.CURB_W, availL); let q = availL - cwL; const wwL = Math.min(D.WALK_W, q); q -= wwL; const ctL = Math.min(D.COURT_W, q); q -= ctL; const vgL = Math.min(D.FAR, q);
    const cwR = Math.min(D.CURB_W, availR); q = availR - cwR; const wwR = Math.min(D.WALK_W, q); q -= wwR; const ctR = Math.min(D.COURT_W, q); q -= ctR; const vgR = Math.min(D.FAR, q);
    // column x / y, left to right: verge | court | walk | curb top | curb face | ROAD | curb face | curb top | walk | court | verge
    const X = this.X, Y = this.Y, C = this.C, dy = P[5], L1 = lo - cwL, L2 = L1 - wwL, L3 = L2 - ctL, R1 = hi + cwR, R2 = R1 + wwR, R3 = R2 + ctR;
    X[0] = L3 - vgL; X[1] = L3; X[2] = L2; X[3] = L1; X[4] = lo; X[5] = lo; X[6] = hi; X[7] = hi; X[8] = R1; X[9] = R2; X[10] = R3; X[11] = R3 + vgR;
    Y[0] = Y[1] = Y[2] = Y[3] = CH; Y[4] = cwL > 0.02 ? CH : 0; Y[5] = 0; Y[6] = 0; Y[7] = cwR > 0.02 ? CH : 0; Y[8] = Y[9] = Y[10] = Y[11] = CH; for (let s = 0; s < 12; s++) Y[s] += dy;
    C[0] = pal.verge[par]; C[1] = pal.court; C[2] = pal.walk[par]; C[3] = pal.curb[par]; C[4] = pal.curbFace; C[5] = pal.asphalt[par];
    C[6] = pal.curbFace; C[7] = pal.curb[par]; C[8] = pal.walk[par]; C[9] = pal.court; C[10] = pal.verge[par];
    const R = this.rib[r], pos = R.pos, col = R.col, base = i * this.VPS * 3;
    for (let s = 0; s < 11; s++) {
      const o = base + s * 6, c = C[s];
      pos[o] = X[s]; pos[o + 1] = Y[s]; pos[o + 2] = z; pos[o + 3] = X[s + 1]; pos[o + 4] = Y[s + 1]; pos[o + 5] = z;
      col[o] = c.r; col[o + 1] = c.g; col[o + 2] = c.b; col[o + 3] = c.r; col[o + 4] = c.g; col[o + 5] = c.b;
    }
    // markings: lane lines at the thirds (dashed), edge lines near each edge (continuous); zero width = nothing drawn
    const w = hi - lo, my = 0.02 + dy, wide = w > 2.4, l1 = lo + w / 3, l2 = hi - w / 3, hw = wide && (dash || pal.rails) ? (pal.rails ? 0.09 : 0.06) : 0, ew = w > 0.8 ? 0.06 : 0;
    const mk = pal.mark, ed = pal.edge, o = base + 11 * 6;
    pos[o] = l1 - hw; pos[o + 1] = my; pos[o + 2] = z; pos[o + 3] = l1 + hw; pos[o + 4] = my; pos[o + 5] = z;
    pos[o + 6] = l2 - hw; pos[o + 7] = my; pos[o + 8] = z; pos[o + 9] = l2 + hw; pos[o + 10] = my; pos[o + 11] = z;
    pos[o + 12] = lo + 0.2 - ew; pos[o + 13] = my; pos[o + 14] = z; pos[o + 15] = lo + 0.2 + ew; pos[o + 16] = my; pos[o + 17] = z;
    pos[o + 18] = hi - 0.2 - ew; pos[o + 19] = my; pos[o + 20] = z; pos[o + 21] = hi - 0.2 + ew; pos[o + 22] = my; pos[o + 23] = z;
    for (let m = 0; m < 4; m++) { const c = m < 2 ? mk : ed, q2 = o + m * 6; col[q2] = c.r; col[q2 + 1] = c.g; col[q2 + 2] = c.b; col[q2 + 3] = c.r; col[q2 + 4] = c.g; col[q2 + 5] = c.b; }
  }
}
