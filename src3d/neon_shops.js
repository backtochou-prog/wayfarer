// NeonShopArt: what is behind the windows of the Neon Quarter's shops. Sixteen different shop displays (a dress on a mannequin, sneakers on a pedestal, a shelf of bottles, a plant, cupcakes, a retro
// TV, vinyl records, sunglasses, cocktails, a ramen bowl, a fish tank, a floor lamp, books, balloons, a vintage camera, hats), each drawn once at start-up on one small canvas atlas (4 x 4 cells of
// 128 x 160 px: no image file, none of the user's pictures). A shop window is a glass pane showing one of them, and no two panes of a shop show the same one (see env_neon.js).
// One shared unlit texture and material, like NeonArt; a prop factory returns { merged, sprite, material: () => NeonShopArt.material() }.
const NeonShopArt = {
  CW: 128, CH: 160, COLS: 4, ROWS: 4, N: 16,
  _mat: null, _cv: null,
  // one display per cell: [name, glass tint]
  DISPLAYS: [['dress', '#ff2fd0'], ['sneakers', '#22e0e8'], ['bottles', '#39ff14'], ['plant', '#39ff14'], ['cakes', '#ff2fd0'], ['tv', '#8a3cff'], ['vinyl', '#ffd21a'], ['shades', '#22e0e8'],
             ['cocktails', '#ff2a3a'], ['ramen', '#ffd21a'], ['fishtank', '#22e0e8'], ['lamp', '#ffd27a'], ['books', '#8a3cff'], ['balloons', '#ff2fd0'], ['camera', '#2a4cff'], ['hats', '#ff2a3a']],
  _build() {
    const W = this.CW, H = this.CH, cv = document.createElement('canvas'); cv.width = W * this.COLS; cv.height = H * this.ROWS; const g = cv.getContext('2d');
    const ell = (x, y, rx, ry, col) => { g.fillStyle = col; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, 7); g.fill(); };
    const rect = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
    const poly = (pts, col) => { g.fillStyle = col; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) g.lineTo(p[0], p[1]); g.closePath(); g.fill(); };
    this.DISPLAYS.forEach(([name, tint], idx) => {
      g.save(); g.translate((idx % this.COLS) * W, Math.floor(idx / this.COLS) * H); g.beginPath(); g.rect(0, 0, W, H); g.clip();
      // the lit window: dark glass with a glow of the display's colour rising from the floor, a shelf line, a dark floor
      const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#0a0d1c'); bg.addColorStop(0.55, '#101634'); bg.addColorStop(1, tint); g.fillStyle = bg; g.fillRect(0, 0, W, H);
      g.globalAlpha = 0.32; const gl = g.createRadialGradient(W / 2, H * 0.72, 4, W / 2, H * 0.72, W * 0.7); gl.addColorStop(0, '#fff6d8'); gl.addColorStop(1, 'rgba(255,246,216,0)'); g.fillStyle = gl; g.fillRect(0, 0, W, H); g.globalAlpha = 1;
      rect(0, H * 0.86, W, H * 0.14, '#06070f'); rect(0, H * 0.86, W, 2, tint);
      const fy = H * 0.86;                                                                                                   // the floor line every object stands on
      switch (name) {
        case 'dress': rect(W / 2 - 2, fy - 100, 4, 100, '#8a8fa0'); ell(W / 2, fy - 4, 22, 4, '#2a2f44'); ell(W / 2, fy - 104, 8, 10, '#e8d8c8'); poly([[W / 2 - 14, fy - 92], [W / 2 + 14, fy - 92], [W / 2 + 36, fy - 30], [W / 2 - 36, fy - 30]], '#ff2fd0'); rect(W / 2 - 14, fy - 62, 28, 4, '#ffd21a'); poly([[W / 2 - 36, fy - 30], [W / 2 + 36, fy - 30], [W / 2 + 40, fy - 22], [W / 2 - 40, fy - 22]], '#b8149a'); break;
        case 'sneakers': rect(W / 2 - 40, fy - 22, 80, 22, '#232843'); rect(W / 2 - 40, fy - 22, 80, 3, tint);
          for (const [dx, col] of [[-22, '#ff2fd0'], [20, '#22e0e8']]) { rect(W / 2 + dx - 20, fy - 44, 40, 8, '#f4f4f4'); poly([[W / 2 + dx - 20, fy - 44], [W / 2 + dx + 6, fy - 44], [W / 2 + dx + 20, fy - 36], [W / 2 + dx - 20, fy - 36]], col); poly([[W / 2 + dx - 20, fy - 62], [W / 2 + dx - 6, fy - 62], [W / 2 + dx - 2, fy - 44], [W / 2 + dx - 20, fy - 44]], col); for (let k = 0; k < 3; k++) rect(W / 2 + dx - 18, fy - 58 + k * 5, 10, 2, '#ffffff'); } break;
        case 'bottles': rect(12, fy - 60, W - 24, 4, '#6a6f86'); rect(12, fy - 118, W - 24, 4, '#6a6f86');
          [['#39ff14', 34], ['#ffb347', 28], ['#22e0e8', 38], ['#ff2fd0', 30], ['#ffd21a', 34]].forEach(([col, h], k) => { const x = 24 + k * 20; rect(x, fy - 60 - h, 11, h, col); rect(x + 3, fy - 60 - h - 9, 5, 9, col); rect(x + 2, fy - 60 - h * 0.6, 7, 4, '#ffffff'); });
          [['#ff2a3a', 30], ['#22e0e8', 36], ['#39ff14', 26], ['#ffd21a', 34]].forEach(([col, h], k) => { const x = 30 + k * 22; rect(x, fy - 118 - h, 11, h, col); rect(x + 3, fy - 118 - h - 9, 5, 9, col); }); break;
        case 'plant': poly([[W / 2 - 20, fy - 36], [W / 2 + 20, fy - 36], [W / 2 + 14, fy], [W / 2 - 14, fy]], '#c4623f'); rect(W / 2 - 22, fy - 40, 44, 6, '#9a4632');
          for (const [dx, dy, rx, ry, rot] of [[-22, -62, 8, 28, -0.6], [22, -62, 8, 28, 0.6], [0, -74, 9, 34, 0], [-10, -56, 7, 24, -0.25], [12, -56, 7, 24, 0.25]]) { g.save(); g.translate(W / 2 + dx, fy + dy); g.rotate(rot); ell(0, 0, rx, ry, '#2fae3a'); ell(0, 0, 1.6, ry * 0.9, '#8aff7a'); g.restore(); } break;
        case 'cakes': rect(W / 2 - 3, fy - 52, 6, 52, '#cfd3e6'); ell(W / 2, fy - 54, 44, 6, '#e8e8f4'); ell(W / 2, fy - 6, 26, 5, '#cfd3e6');
          [[-26, '#ff7ab8'], [0, '#7adfff'], [26, '#ffe27a']].forEach(([dx, col]) => { poly([[W / 2 + dx - 11, fy - 58], [W / 2 + dx + 11, fy - 58], [W / 2 + dx + 8, fy - 40], [W / 2 + dx - 8, fy - 40]], '#c98a5a'); ell(W / 2 + dx, fy - 62, 12, 9, col); ell(W / 2 + dx, fy - 72, 8, 6, col); ell(W / 2 + dx, fy - 80, 4, 4, '#ff2a3a'); }); break;
        case 'tv': rect(W / 2 - 40, fy - 76, 80, 62, '#6a4a36'); rect(W / 2 - 34, fy - 70, 58, 50, '#0a0a14'); ['#ffffff', '#ffd21a', '#22e0e8', '#39ff14', '#ff2fd0', '#ff2a3a', '#2a4cff'].forEach((col, k) => rect(W / 2 - 34 + k * 8.3, fy - 70, 8.3, 38, col)); rect(W / 2 - 34, fy - 32, 58, 12, '#101020'); ell(W / 2 + 32, fy - 54, 5, 5, '#c8c8d0'); ell(W / 2 + 32, fy - 38, 5, 5, '#c8c8d0');
          g.strokeStyle = '#aab'; g.lineWidth = 2; g.beginPath(); g.moveTo(W / 2 - 10, fy - 76); g.lineTo(W / 2 - 30, fy - 104); g.moveTo(W / 2 + 10, fy - 76); g.lineTo(W / 2 + 28, fy - 104); g.stroke(); break;
        case 'vinyl': for (const [dx, col] of [[-26, '#ff2fd0'], [0, '#22e0e8'], [26, '#ffd21a']]) { ell(W / 2 + dx, fy - 48, 22, 22, '#0b0b12'); ell(W / 2 + dx, fy - 48, 8, 8, col); ell(W / 2 + dx, fy - 48, 2, 2, '#000'); g.strokeStyle = 'rgba(255,255,255,0.18)'; g.lineWidth = 1; g.beginPath(); g.arc(W / 2 + dx, fy - 48, 15, 0, 7); g.stroke(); }
          rect(W / 2 - 42, fy - 22, 84, 22, '#2a2a38'); ell(W / 2 - 14, fy - 24, 18, 3, '#111'); rect(W / 2 + 16, fy - 40, 3, 18, '#c0c0c8'); break;
        case 'shades': rect(W / 2 - 2, fy - 90, 4, 90, '#8a8fa0'); ell(W / 2, fy - 4, 18, 4, '#2a2f44');
          [[-28, -80, '#ff2fd0'], [26, -60, '#22e0e8'], [-24, -38, '#ffd21a']].forEach(([dx, dy, col]) => { ell(W / 2 + dx - 11, fy + dy, 11, 8, col); ell(W / 2 + dx + 11, fy + dy, 11, 8, col); rect(W / 2 + dx - 2, fy + dy - 2, 4, 3, '#111'); rect(W / 2 + dx - 24, fy + dy - 1, 4, 2, '#111'); rect(W / 2 + dx + 20, fy + dy - 1, 4, 2, '#111'); ell(W / 2 + dx - 14, fy + dy - 3, 3, 2, 'rgba(255,255,255,0.7)'); }); break;
        case 'cocktails': [[-30, '#ff2a3a'], [0, '#39ff14'], [30, '#ffb347']].forEach(([dx, col], k) => { const x = W / 2 + dx, top = fy - 62 - (k === 1 ? 10 : 0); poly([[x - 16, top], [x + 16, top], [x, top + 26]], 'rgba(200,230,255,0.55)'); poly([[x - 13, top + 3], [x + 13, top + 3], [x, top + 23]], col); rect(x - 1.5, top + 26, 3, fy - top - 32, '#cfe'); ell(x, fy - 6, 12, 3, '#cfe'); g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.moveTo(x + 4, top + 4); g.lineTo(x + 14, top - 14); g.stroke(); ell(x - 12, top + 1, 5, 5, '#ffd21a'); }); break;
        case 'ramen': ell(W / 2, fy - 28, 40, 28, '#e8e8f0'); rect(W / 2 - 42, fy - 58, 84, 30, '#101634'); ell(W / 2, fy - 58, 40, 7, '#ffb347'); for (let k = 0; k < 6; k++) { g.strokeStyle = '#ffe7a0'; g.lineWidth = 2; g.beginPath(); g.arc(W / 2 - 24 + k * 9, fy - 58, 8, 3.4, 6); g.stroke(); }
          ell(W / 2 - 14, fy - 60, 9, 6, '#ffffff'); ell(W / 2 - 14, fy - 60, 4, 3, '#ffd21a'); rect(W / 2 + 10, fy - 66, 10, 4, '#2fae3a'); rect(W / 2 + 22, fy - 64, 8, 4, '#2fae3a'); g.strokeStyle = 'rgba(255,255,255,0.4)'; g.lineWidth = 3; for (const dx of [-14, 4, 20]) { g.beginPath(); g.moveTo(W / 2 + dx, fy - 70); g.quadraticCurveTo(W / 2 + dx + 8, fy - 82, W / 2 + dx, fy - 96); g.stroke(); } break;
        case 'fishtank': { const wg = g.createLinearGradient(0, fy - 100, 0, fy); wg.addColorStop(0, '#2a6a9a'); wg.addColorStop(1, '#0a2a4a'); g.fillStyle = wg; g.fillRect(18, fy - 100, W - 36, 100); rect(18, fy - 14, W - 36, 14, '#d8c48a');
          [[44, 56, '#ff7a2a', 1], [84, 40, '#ffd21a', -1], [60, 72, '#ff2fd0', 1]].forEach(([x, y, col, d]) => { ell(x, fy - y, 12, 7, col); poly([[x - d * 12, fy - y], [x - d * 22, fy - y - 8], [x - d * 22, fy - y + 8]], col); ell(x + d * 6, fy - y - 2, 1.8, 1.8, '#000'); });
          for (const [x, y] of [[96, 80], [100, 66], [94, 52]]) { g.strokeStyle = 'rgba(255,255,255,0.6)'; g.lineWidth = 1.5; g.beginPath(); g.arc(x, fy - y, 3, 0, 7); g.stroke(); } rect(30, fy - 30, 3, 20, '#2fae3a'); rect(36, fy - 24, 3, 14, '#39ff14'); break; }
        case 'lamp': rect(W / 2 - 2, fy - 90, 4, 90, '#8a8fa0'); ell(W / 2, fy - 4, 18, 4, '#2a2f44'); poly([[W / 2 - 26, fy - 70], [W / 2 + 26, fy - 70], [W / 2 + 14, fy - 112], [W / 2 - 14, fy - 112]], '#ffd27a'); g.globalAlpha = 0.35; ell(W / 2, fy - 90, 50, 40, '#ffd27a'); g.globalAlpha = 1; rect(W / 2 - 26, fy - 71, 52, 3, '#c9902f'); break;
        case 'books': [['#ff2fd0', 70, 12], ['#22e0e8', 58, 10], ['#ffd21a', 64, 14], ['#8a3cff', 52, 9], ['#39ff14', 68, 11]].forEach(([col, h, w], k, a) => { const x = 22 + a.slice(0, k).reduce((s, v) => s + v[2] + 2, 0); rect(x, fy - h, w, h, col); rect(x + 2, fy - h + 8, w - 4, 3, '#fff6d8'); });
          rect(18, fy - 76, 28, 6, '#ffd21a'); rect(20, fy - 82, 24, 6, '#22e0e8'); ell(W - 36, fy - 18, 14, 14, '#c4623f'); ell(W - 36, fy - 36, 10, 14, '#2fae3a'); break;
        case 'balloons': [[-30, -78, '#ff2fd0'], [-8, -92, '#22e0e8'], [18, -80, '#ffd21a'], [36, -62, '#39ff14'], [-14, -58, '#ff2a3a']].forEach(([dx, dy, col]) => { g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 1; g.beginPath(); g.moveTo(W / 2, fy - 8); g.lineTo(W / 2 + dx, fy + dy + 14); g.stroke(); ell(W / 2 + dx, fy + dy, 13, 16, col); ell(W / 2 + dx - 4, fy + dy - 6, 3, 5, 'rgba(255,255,255,0.55)'); }); rect(W / 2 - 10, fy - 10, 20, 10, '#6a6f86'); break;
        case 'camera': rect(W / 2 - 40, fy - 62, 80, 44, '#2a2f44'); rect(W / 2 - 40, fy - 62, 80, 14, '#c8c8d0'); ell(W / 2, fy - 38, 20, 20, '#15151f'); ell(W / 2, fy - 38, 14, 14, '#2a4cff'); ell(W / 2 - 4, fy - 42, 4, 4, 'rgba(255,255,255,0.8)'); rect(W / 2 + 22, fy - 74, 16, 12, '#ffd21a'); rect(W / 2 - 36, fy - 70, 12, 8, '#c8c8d0'); rect(W / 2 - 30, fy - 18, 60, 8, '#4a4f66'); break;
        case 'hats': for (const [dx, h] of [[-28, 0], [26, 1]]) { rect(W / 2 + dx - 2, fy - 54, 4, 54, '#8a8fa0'); ell(W / 2 + dx, fy - 4, 12, 3, '#2a2f44'); }
          ell(W / 2 - 28, fy - 62, 26, 6, '#7a1a2a'); rect(W / 2 - 40, fy - 82, 24, 20, '#9a2a3a'); rect(W / 2 - 40, fy - 70, 24, 4, '#ffd21a'); poly([[W / 2 + 12, fy - 58], [W / 2 + 40, fy - 58], [W / 2 + 36, fy - 80], [W / 2 + 18, fy - 80]], '#22e0e8'); rect(W / 2 + 10, fy - 60, 36, 4, '#0aa'); break;
      }
      // glass: a pale diagonal reflection and a thin bright edge, so it reads as a window and not as a picture on a wall
      g.globalAlpha = 0.14; poly([[W * 0.12, 0], [W * 0.34, 0], [W * 0.06, H], [0, H], [0, H * 0.7]], '#ffffff'); g.globalAlpha = 0.08; poly([[W * 0.42, 0], [W * 0.5, 0], [W * 0.2, H], [W * 0.12, H]], '#ffffff'); g.globalAlpha = 1;
      g.restore();
    });
    this._cv = cv; return cv;
  },
  material() {
    if (!this._mat) { const tex = new THREE.CanvasTexture(this._build()); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4; this._mat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }); }
    return this._mat;
  },
  // a vertical pane in the plane x = `x` (the facade plane of a prop; it faces -X), z from z0 to z1, y from y0 to y1, showing display `cell` (0..15)
  pane(cell, x, z0, z1, y0, y1) {
    const col = cell % this.COLS, row = Math.floor(cell / this.COLS), e = 0.004, u0 = col / this.COLS + e, u1 = (col + 1) / this.COLS - e, v1 = 1 - row / this.ROWS - e, v0 = 1 - (row + 1) / this.ROWS + e, g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([x, y0, z0, x, y0, z1, x, y1, z1, x, y1, z0], 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute([u0, v0, u1, v0, u1, v1, u0, v1], 2)); g.setIndex([0, 1, 2, 0, 2, 3]); return g;
  },
  join(list) {
    const pos = [], uv = [], idx = [];
    for (const g of list) { const o = pos.length / 3, p = g.attributes.position.array, u = g.attributes.uv.array, ix = g.index.array; for (const v of p) pos.push(v); for (const v of u) uv.push(v); for (const v of ix) idx.push(v + o); g.dispose(); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
    g.computeBoundingSphere(); g.computeBoundingBox(); return g;
  },
};
