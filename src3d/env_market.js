// MARKET DETOUR: the city detour. Reuses every Old Town building and street prop (same geometry, same pools) with a
// different layout (lower buildings, lamps and planters on both sides, market stalls) and a warmer cobbled road.
window.ENV3D = window.ENV3D || {};

(function () {
  const C = ENV3D.city, P = PAL3;
  const awning = (a, b) => { const parts = [Kit.box(1.5, 0.12, 2.6, 0, 1.7, 0, '#6a4a36'), Kit.box(1.5, 0.9, 0.12, 0.6, 0.0, 1.2, P.woodDark), Kit.box(1.5, 0.9, 0.12, 0.6, 0.0, -1.2, P.woodDark)];
    for (let k = 0; k < 8; k++) parts.push(Kit.box(1.9, 0.08, 0.34, -0.1, 2.2, -1.2 + (k + 0.5) * 0.3, k % 2 ? b : a, { rz: -0.35 }));
    parts.push(Kit.box(1.1, 0.12, 2.2, 0.0, 0.9, 0, P.wood), Kit.ico(0.2, 0, 1.1, -0.5, P.coin), Kit.ico(0.2, 0, 1.1, 0.2, P.terracotta), Kit.ico(0.2, 0, 1.1, 0.8, P.leaf));
    return Kit.merge(parts); };

  ENV3D.market = {
    name: 'MARKET DETOUR',
    sky: { top: '#40306e', mid: '#d0726a', horizon: '#ffcf8a' },
    sunDisc: C.sunDisc, fog: { color: '#f2b883', near: 30, far: 120 },
    hemi: { sky: '#ffe0b8', ground: '#6a4660', intensity: 1.6 },
    sun: { color: '#ffc88a', intensity: 2.8, position: [-7, 8, 4] },
    groundFar: '#8a6a52',
    road: {                                                              // warm cobbles with a terracotta edge line
      asphalt: ['#93806c', '#857360'], mark: '#f7d9a0', edge: '#b8503a',
      curb: ['#e6d2a2', '#d6c08c'], curbFace: '#b09870', walk: ['#c9a272', '#bd9666'], court: '#a07a52', verge: ['#8c6c4e', '#84644a'],
    },
    innerOk: C.innerOk,
    props: Object.assign({}, C.props, { stall: () => awning(P.stripeRed, P.stripeCream), stallB: () => awning(P.teal, P.stripeCream) }),

    // lower buildings (C, D, A), a lamp on every segment on both sides, stalls / planters / benches along the walk
    layout(i, rnd) {
      const out = [], H = ['houseD', 'houseC', 'houseA', 'houseD'];
      for (const side of [-1, 1]) {
        const k = i * 2 + (side > 0 ? 1 : 0);
        out.push({ prop: H[(i + (side > 0 ? 2 : 0) + Math.floor(rnd(k, 12) * 2) + 8) % 4], x: side * 7.0, dist: 6 });
        out.push({ prop: 'lamp', x: side * 4.0, dist: 2.2 });
        const r = rnd(k, 14);
        if (r < 0.35) out.push({ prop: r < 0.17 ? 'stall' : 'stallB', x: side * 5.4, dist: 8 });
        else if (r < 0.6) out.push({ prop: 'planter', x: side * 5.8, dist: 5 }, { prop: 'planter', x: side * 5.8, dist: 10 });
        else if (r < 0.85) out.push({ prop: 'bench', x: side * 5.8, dist: 6 }, { prop: 'tree', x: side * 5.4, dist: 10 });
      }
      return out;
    },
  };
})();
