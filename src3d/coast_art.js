// CoastArt: the user's club panels of the coastal zone (COAST_ASSETS, one WebP atlas): 'STRAWBERRY WEEKEND' (stretched wide, the backdrop of the terrace of the Strawberry Beach Club) and 'EL MEDITERRANEOS'
// (the club's sign), plus a drawn neon name board ('STRAWBERRY BEACH CLUB', one small canvas). Same contract as NeonArt / UtrechtArt: a prop factory returns { merged, sprite, material, extra } and
// Renderer3D pools them together. The pictures keep their own colours (unlit, only fogged like everything else).
const CoastArt = {
  _mat: null, _sign: null,
  material() {
    if (!this._mat) {
      const img = new Image(), tex = new THREE.Texture(img);
      tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4; tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter;
      const mat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide });
      mat.visible = false; img.onload = () => { tex.needsUpdate = true; mat.visible = true; }; img.src = COAST_ASSETS.src;
      this._mat = mat;
    }
    return this._mat;
  },
  // the neon name board: a dark navy plate with 'STRAWBERRY BEACH CLUB' in pink neon letters with a cyan glow (drawn once, 1024 x 128)
  signMaterial() {
    if (!this._sign) {
      const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 128; const x = cv.getContext('2d');
      x.fillStyle = '#16102e'; x.fillRect(0, 0, 1024, 128); x.strokeStyle = '#35e6ff'; x.lineWidth = 6; x.strokeRect(6, 6, 1012, 116);
      x.font = 'bold 78px "Arial Black", Impact, Arial, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.shadowColor = '#35e6ff'; x.shadowBlur = 18; x.fillStyle = '#ff4fa8'; x.fillText('STRAWBERRY BEACH CLUB', 512, 68); x.shadowBlur = 0; x.fillStyle = '#ffd0e8'; x.fillText('STRAWBERRY BEACH CLUB', 512, 68);
      const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
      this._sign = new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide });
    }
    return this._sign;
  },
  // a vertical panel in the plane x = `x` (it faces -X), z from z0 to z1, y from y0 to y1, showing atlas cell `cell` (the picture is stretched to the rectangle: a wide rectangle stretches it wide)
  panel(cell, x, z0, z1, y0, y1) {
    const c = COAST_ASSETS[cell], g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([x, y0, z0, x, y0, z1, x, y1, z1, x, y1, z0], 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute([c.u0, c.v0, c.u1, c.v0, c.u1, c.v1, c.u0, c.v1], 2)); g.setIndex([0, 1, 2, 0, 2, 3]); g.computeBoundingSphere(); g.computeBoundingBox();
    return g;
  },
  // a vertical panel in the plane z = `z` (across the road: the runner meets it head on), x from x0 to x1, y from y0 to y1
  blade(cell, z, x0, x1, y0, y1) {
    const c = COAST_ASSETS[cell], g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([x0, y0, z, x1, y0, z, x1, y1, z, x0, y1, z], 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute([c.u0, c.v0, c.u1, c.v0, c.u1, c.v1, c.u0, c.v1], 2)); g.setIndex([0, 1, 2, 0, 2, 3]); g.computeBoundingSphere(); g.computeBoundingBox();
    return g;
  },
  // the DOLPHIN SIGN of Club Delphi: an original drawing (not the user's art): a navy-rimmed ivory plate, a round window of sea and sky with a low sun, a leaping blue-grey dolphin with a pale belly over
  // white-capped waves, and the name below. Drawn once on a 512 x 512 canvas.
  delphiMaterial() {
    if (!this._delphi) {
      const cv = document.createElement('canvas'); cv.width = cv.height = 512; const x = cv.getContext('2d');
      const rr = (px, py, w, h, r) => { x.beginPath(); x.moveTo(px + r, py); x.arcTo(px + w, py, px + w, py + h, r); x.arcTo(px + w, py + h, px, py + h, r); x.arcTo(px, py + h, px, py, r); x.arcTo(px, py, px + w, py, r); x.closePath(); };
      x.fillStyle = '#12306a'; rr(0, 0, 512, 512, 46); x.fill(); x.fillStyle = '#f6f1e4'; rr(14, 14, 484, 484, 36); x.fill(); x.strokeStyle = '#35a0d8'; x.lineWidth = 4; rr(26, 26, 460, 460, 28); x.stroke();
      const CX = 256, CY = 236, R = 178; x.save(); x.beginPath(); x.arc(CX, CY, R, 0, Math.PI * 2); x.clip();
      let g = x.createLinearGradient(0, CY - R, 0, CY + R); g.addColorStop(0, '#b9e6f6'); g.addColorStop(0.55, '#7fcfee'); g.addColorStop(0.56, '#2a8fc4'); g.addColorStop(1, '#14578f'); x.fillStyle = g; x.fillRect(CX - R, CY - R, 2 * R, 2 * R);
      x.fillStyle = '#ffe28a'; x.beginPath(); x.arc(CX + 78, CY - 70, 30, 0, 6.2832); x.fill(); x.fillStyle = 'rgba(255,226,138,0.35)'; x.beginPath(); x.arc(CX + 78, CY - 70, 46, 0, 6.2832); x.fill();
      x.strokeStyle = 'rgba(255,255,255,0.8)'; x.lineWidth = 5; x.lineCap = 'round'; for (let k = 0; k < 5; k++) { const y = CY + 20 + k * 30; x.beginPath(); for (let u = CX - R; u <= CX + R; u += 8) { const yy = y + Math.sin(u * 0.045 + k * 1.3) * 6; if (u === CX - R) x.moveTo(u, yy); else x.lineTo(u, yy); } x.stroke(); }
      // the dolphin: the spine is a quadratic curve from the tail (low right) up and over to the head (upper left); the half-width follows a sine, the belly is a lighter lower half
      const P0 = [338, 352], P1 = [352, 138], P2 = [172, 142], bez = t => [(1 - t) * (1 - t) * P0[0] + 2 * (1 - t) * t * P1[0] + t * t * P2[0], (1 - t) * (1 - t) * P0[1] + 2 * (1 - t) * t * P1[1] + t * t * P2[1]];
      const tan = t => { const a = 2 * (1 - t) * (P1[0] - P0[0]) + 2 * t * (P2[0] - P1[0]), b = 2 * (1 - t) * (P1[1] - P0[1]) + 2 * t * (P2[1] - P1[1]), l = Math.hypot(a, b); return [a / l, b / l]; };
      const hw = t => 5 + 29 * Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.06)), 0.85) + (t > 0.78 ? 9 * Math.sin((t - 0.78) / 0.22 * Math.PI) : 0);
      const outer = [], inner = []; for (let k = 0; k <= 40; k++) { const t = k / 40, b = bez(t), d = tan(t), n = [d[1], -d[0]], w = hw(t); outer.push([b[0] + n[0] * w, b[1] + n[1] * w]); inner.push([b[0] - n[0] * w * 0.92, b[1] - n[1] * w * 0.92]); }
      const beakT = tan(1), tip = [P2[0] + beakT[0] * 46, P2[1] + beakT[1] * 46], bn = [beakT[1], -beakT[0]];
      x.fillStyle = '#3f6f94'; x.beginPath(); x.moveTo(outer[0][0], outer[0][1]); for (const q of outer) x.lineTo(q[0], q[1]); x.lineTo(tip[0] + bn[0] * 3, tip[1] + bn[1] * 3); x.lineTo(tip[0] - bn[0] * 3, tip[1] - bn[1] * 3); for (let k = inner.length - 1; k >= 0; k--) x.lineTo(inner[k][0], inner[k][1]); x.closePath(); x.fill();
      x.fillStyle = '#dcecf3'; x.beginPath(); for (let k = 2; k <= 36; k++) { const t = k / 40, b = bez(t), d = tan(t), n = [d[1], -d[0]], w = hw(t); const q = [b[0] - n[0] * w * 0.2, b[1] - n[1] * w * 0.2]; if (k === 2) x.moveTo(q[0], q[1]); else x.lineTo(q[0], q[1]); } for (let k = 36; k >= 2; k--) { const q = inner[k]; x.lineTo(q[0], q[1]); } x.closePath(); x.fill();
      x.fillStyle = '#2f5a7c'; const fb = bez(0.5), fd = tan(0.5), fn = [fd[1], -fd[0]]; x.beginPath(); x.moveTo(fb[0] + fn[0] * 28 - fd[0] * 18, fb[1] + fn[1] * 28 - fd[1] * 18); x.lineTo(fb[0] + fn[0] * 66 + fd[0] * 22, fb[1] + fn[1] * 66 + fd[1] * 22); x.lineTo(fb[0] + fn[0] * 30 + fd[0] * 30, fb[1] + fn[1] * 30 + fd[1] * 30); x.closePath(); x.fill();   // the dorsal fin
      const pb = bez(0.74), pd = tan(0.74), pn = [pd[1], -pd[0]]; x.beginPath(); x.moveTo(pb[0] - pn[0] * 22, pb[1] - pn[1] * 22); x.lineTo(pb[0] - pn[0] * 58 - pd[0] * 26, pb[1] - pn[1] * 58 - pd[1] * 26); x.lineTo(pb[0] - pn[0] * 26 + pd[0] * 16, pb[1] - pn[1] * 26 + pd[1] * 16); x.closePath(); x.fill();   // a pectoral fin
      const tb = bez(0), td = tan(0); x.beginPath(); x.moveTo(tb[0], tb[1]); x.quadraticCurveTo(tb[0] - 44, tb[1] + 16, tb[0] - 62, tb[1] + 52); x.quadraticCurveTo(tb[0] - 26, tb[1] + 36, tb[0], tb[1] + 22); x.quadraticCurveTo(tb[0] + 30, tb[1] + 40, tb[0] + 66, tb[1] + 44); x.quadraticCurveTo(tb[0] + 38, tb[1] + 12, tb[0], tb[1]); x.closePath(); x.fill();   // the flukes
      const eb = bez(0.93), ed = tan(0.93), en = [ed[1], -ed[0]]; x.fillStyle = '#ffffff'; x.beginPath(); x.arc(eb[0] + en[0] * 6, eb[1] + en[1] * 6, 7, 0, 6.2832); x.fill(); x.fillStyle = '#10213a'; x.beginPath(); x.arc(eb[0] + en[0] * 6 - ed[0] * 1.5, eb[1] + en[1] * 6 - ed[1] * 1.5, 3.6, 0, 6.2832); x.fill();
      x.strokeStyle = '#2a4c6b'; x.lineWidth = 3; x.beginPath(); x.moveTo(P2[0] + beakT[0] * 8, P2[1] + beakT[1] * 8 - 2); x.lineTo(tip[0], tip[1]); x.stroke();   // the smile
      x.fillStyle = '#ffffff'; for (const [dx, dy, r] of [[-70, 62, 6], [-86, 30, 4], [-96, 70, 5], [30, 48, 4], [48, 70, 6], [66, 38, 3.5]]) { x.beginPath(); x.arc(tb[0] + dx, tb[1] + dy, r, 0, 6.2832); x.fill(); }   // spray
      x.restore(); x.strokeStyle = '#12306a'; x.lineWidth = 7; x.beginPath(); x.arc(CX, CY, R, 0, Math.PI * 2); x.stroke();
      x.font = 'bold 66px "Arial Black", Impact, Arial, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#12306a'; x.fillText('CLUB DELPHI', 256, 452);
      const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4; this._delphi = new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide });
    }
    return this._delphi;
  },
  // a square panel across the road (a plane of constant z, the runner meets it head on) showing the whole canvas of the dolphin sign
  delphiBlade(z, x0, x1, y0, y1) {
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([x0, y0, z, x1, y0, z, x1, y1, z, x0, y1, z], 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2)); g.setIndex([0, 1, 2, 0, 2, 3]); g.computeBoundingSphere(); g.computeBoundingBox();
    return g;
  },
  // the neon name board as a panel in the plane x (z0..z1, y0..y1), showing the whole canvas
  signPanel(x, z0, z1, y0, y1) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([x, y0, z0, x, y0, z1, x, y1, z1, x, y1, z0], 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2)); g.setIndex([0, 1, 2, 0, 2, 3]); g.computeBoundingSphere(); g.computeBoundingBox();
    return g;
  },
  join(list) {
    const pos = [], uv = [], idx = [];
    for (const g of list) { const o = pos.length / 3, p = g.attributes.position.array, u = g.attributes.uv.array, ix = g.index.array; for (let i = 0; i < p.length; i++) pos.push(p[i]); for (let i = 0; i < u.length; i++) uv.push(u[i]); for (let i = 0; i < ix.length; i++) idx.push(ix[i] + o); g.dispose(); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeBoundingSphere(); g.computeBoundingBox();
    return g;
  },
};
