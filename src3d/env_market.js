// MARKET DETOUR: the city detour. Reuses every Old Town building and street prop (same geometry, same pools) with a
// different layout (lower buildings, lamps and planters on both sides, market stalls) and a warmer cobbled road.
window.ENV3D = window.ENV3D || {};

(function () {
  const mod = (a, n) => ((a % n) + n) % n;                        // modulo that stays >= 0 for the (negative) slot indexes at the very start
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
    props: Object.assign({}, C.props, {
      stall: () => awning(P.stripeRed, P.stripeCream), stallB: () => awning(P.teal, P.stripeCream),
      // landmarks (the market also draws the city's fountain / clock tower / statue)
      marketHall: () => {                                              // an open-sided market hall: posts, a big striped roof, trestle tables with goods and bunting
        const p = [];
        for (const [x, z] of [[0.6, -3.6], [0.6, 3.6], [6.2, -3.6], [6.2, 3.6]]) p.push(Kit.cyl(0.16, 0.18, 3.3, x, 0, z, P.woodDark, { seg: 6 }));
        p.push(Kit.roof(8.0, 2.2, 9.4, 3.4, 3.3, 0, P.roofTile), Kit.box(7.6, 0.14, 9.0, 3.4, 3.2, 0, '#6a4a36'));
        for (const z of [-2.2, 0.4, 2.8]) p.push(Kit.box(1.0, 0.1, 1.8, 2.6, 0.9, z, P.wood), Kit.box(0.9, 0.9, 0.1, 2.6, 0, z - 0.8, P.woodDark), Kit.box(0.9, 0.9, 0.1, 2.6, 0, z + 0.8, P.woodDark),
                                                  Kit.ico(0.22, 2.4, 1.15, z - 0.4, P.coin), Kit.ico(0.22, 2.6, 1.15, z + 0.1, P.terracotta), Kit.ico(0.22, 2.8, 1.15, z + 0.5, P.leaf));
        for (let k = 0; k < 9; k++) p.push(Kit.box(0.05, 0.4, 0.32, -0.45, 2.7, -4.0 + k * 1.0, k % 2 ? P.teal : P.stripeRed, { rz: 0.15 }));
        return Kit.merge(p);
      },
      bigTent: () => Kit.merge([Kit.cyl(2.4, 2.5, 1.7, 0, 0, 0, P.cream, { seg: 8 }), Kit.cone(2.9, 2.4, 0, 1.7, 0, P.stripeRed, { seg: 8 }), Kit.cone(2.95, 0.5, 0, 1.7, 0, P.stripeCream, { seg: 8, ry: 0.4 }),
                                Kit.cyl(0.06, 0.06, 1.4, 0, 4.1, 0, P.lampPost, { seg: 5 }), Kit.box(0.04, 0.4, 0.7, 0, 5.1, 0.4, P.teal), Kit.box(0.14, 1.5, 1.0, -2.45, 0, 0, P.woodDark)]),
      barrel: () => Kit.merge([[-0.55, 0.9], [0.55, 0.8]].flatMap(([z, h]) => [Kit.cyl(0.4, 0.4, h, 0, 0, z, P.wood, { seg: 8 }), Kit.cyl(0.43, 0.43, 0.07, 0, 0.15, z, P.woodDark, { seg: 8 }), Kit.cyl(0.43, 0.43, 0.07, 0, h - 0.22, z, P.woodDark, { seg: 8 })])),
      // marks where the street changes character (entering the market)
      gateMarket: () => Kit.merge([
        Kit.cyl(0.11, 0.14, 3.6, 0, 0, 0, P.woodDark, { seg: 6 }), Kit.box(0.08, 0.08, 2.0, 0, 3.3, 1.0, P.woodDark),
        ...[0, 1, 2, 3].map(k => Kit.box(0.04, 0.5, 0.4, 0, 2.75, 0.3 + k * 0.45, k % 2 ? P.stripeCream : P.stripeRed, { rz: 0.1 })), Kit.box(0.06, 0.7, 0.9, 0, 1.2, 0.2, P.teal)]),
    }),
    entrance: 'gateMarket',

    // Stretches (Stretch.of) of different character, with lower buildings than Old Town:
    //   0 stalls: houses on the line, lamps both sides, stalls / planters / benches       2 arcade: houses forward, planter pairs, benches, a lamp every other slot
    //   1 open market: houses far back and only every other slot, a stall pair per slot, barrels (open)       3 cobbles: wider mix of houses, awning stalls, barrels, cafe tables
    // A landmark (market hall / fountain / big tent) takes the place of the house on its side of one slot per stretch.
    layout(i, rnd) {
      const out = [], H = ['houseD', 'houseC', 'houseA'], S = Stretch.of(i, 40, 4, ['marketHall', 'fountain', 'bigTent']);
      for (const side of [-1, 1]) {
        const k = i * 2 + (side > 0 ? 1 : 0), r = n => rnd(k, n), lm = S.lm && S.lm.slot === i && S.lm.side === side ? S.lm.kind : null;
        const house = (prop, x, dz) => { if (!lm) out.push({ prop, x: side * x, dist: 6 + dz }); };
        const hv = H[mod(i + S.b + (side > 0 ? 1 : 0), 3)];                   // steps through the three houses: neighbours (also across a stretch change) always differ
        switch (S.variant) {
          case 0:
            house(hv, 7.0 + r(1) * 0.5, (r(2) - 0.5) * 0.8);
            out.push({ prop: 'lamp', x: side * 4.0, dist: 2.2 + r(3) * 0.8 });
            { const e = r(14); if (e < 0.35) out.push({ prop: e < 0.17 ? 'stall' : 'stallB', x: side * 5.4, dist: 8 }); else if (e < 0.6) out.push({ prop: 'planter', x: side * 5.8, dist: 5 }, { prop: 'planter', x: side * 5.8, dist: 10 }); else if (e < 0.85) out.push({ prop: 'bench', x: side * 5.8, dist: 6 }, { prop: 'tree', x: side * 5.4, dist: 10 }); } break;
          case 1:
            if (mod(i, 2) === (side > 0 ? 1 : 0)) house(hv, 11.5, (r(2) - 0.5) * 1.2);
            out.push({ prop: mod(i + (side > 0 ? 1 : 0), 2) ? 'stall' : 'stallB', x: side * 5.4, dist: 3 }, { prop: r(4) < 0.5 ? 'stall' : 'stallB', x: side * 5.4, dist: 9 }, { prop: 'barrel', x: side * 4.7, dist: 6 + r(5) * 1.5 });
            if (r(6) < 0.6) out.push({ prop: 'lamp', x: side * 4.0, dist: 6 }); break;
          case 2:
            house(['houseD', 'houseC'][mod(i + (side > 0 ? 1 : 0), 2)], 6.6 + r(1) * 0.4, (r(2) - 0.5) * 0.8);
            out.push({ prop: 'planter', x: side * 5.8, dist: 3 }, { prop: 'planter', x: side * 5.8, dist: 9 }, { prop: 'bench', x: side * 5.9, dist: 6 });
            if (mod(i, 2) === (side > 0 ? 1 : 0)) out.push({ prop: 'lamp', x: side * 4.0, dist: 2.5 }); break;
          default:
            house(['houseA', 'houseC', 'houseD'][mod(2 * i + S.b + (side > 0 ? 1 : 0), 3)], 7.6 + r(2) * 0.8, (r(3) - 0.5) * 0.8);
            out.push({ prop: 'lamp', x: side * 4.0, dist: 2.2 + r(4) * 1.5 });
            if (r(5) < 0.4) out.push({ prop: 'stallB', x: side * 5.4, dist: 8 }); if (r(6) < 0.5) out.push({ prop: 'barrel', x: side * 4.7, dist: 4 }); if (r(7) < 0.4) out.push({ prop: 'cafe', x: side * 5.3, dist: 9 });
        }
        if (lm) out.push({ prop: lm, x: side * (lm === 'marketHall' ? 8.4 : lm === 'fountain' ? 9.3 : 8.4), dist: 6 });
      }
      return out;
    },
  };
})();
