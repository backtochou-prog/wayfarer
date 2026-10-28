// UTRECHT, THE CANAL (design draft, not on the track yet: see tools/utrecht_design.html and docs/utrecht-canal-design.md). The zone after the Gare du Midi: the run is on the water of the
// Oudegracht near Utrecht Centraal, at blue hour. The road ribbon is the canal (6.6 m of water, three lanes), and the two sides are built the way the old canal is: a WHARF (werf) a metre above
// the water, a brick wall behind it with arched WHARF CELLARS (werfkelders: lit doorways, today's cafés), the STREET 3.5 m above the water with a railing, lamps, lindens and parked bicycles,
// then the tall narrow gabled houses (step, bell, neck, spout gables, white window frames, hoist beams). Props follow the same contract as the other zones (a Kit part list per prop, local
// +X pointing away from the road, local Z along it, one SEG_LEN slot each); the water, the wharf and the street are props, so the ribbon needs no change except its palette.
// Cross-section from the canal's axis (metres): water |x| < 3.3 | wharf deck 3.5 .. 6.2 (y 1.0) | cellar wall 6.2 .. 7.4 (to y 3.5) | street 6.2 .. 12.9 (y 3.5) | house fronts at 12.9.
// Everything here is original low-poly, drawn from how the real place is built, not a copy of any building.
window.ENV3D = window.ENV3D || {};

(function () {
  const mod = (a, n) => ((a % n) + n) % n;
  const U = { brick: '#92503f', brickD: '#6e3a30', brickL: '#ab6650', ochre: '#c98f58', cream: '#dccbab', blue: '#6f8796', sage: '#7e9482', white: '#ece6d8', stone: '#a29686', stoneD: '#6c655d', slab: '#8f857a',
              street: '#5d5654', cobble: '#6b6360', slate: '#3c3a48', roof: '#5a4046', glass: '#222a3c', warm: '#ffbd70', iron: '#202228', green: '#2f4a3c', oxblood: '#5c2a2c', water: '#34565f',
              leaf: '#4d7a45', leafD: '#355d3a', trunk: '#4e3a30', dom: '#b9a78e', domD: '#8d7c68' };
  const SLOT = SEG_LEN, WH = 1.0, ST = 3.5, FRONT = 12.9;           // slot length (12 m), wharf height, street height above the water, x of the house fronts from the canal's axis
  const EDGE = 3.5;                                                  // x of the water's edge (the ribbon's curb): quay props sit here, local x = 0 at the water edge, so the street is local 2.7 .. 9.4

  // ------------------------------------------------------------------ small parts
  const bike = (p, x, z, col, y0 = ST, ry = 0) => {                  // a parked bicycle standing along Z (wheels turn about X), leaning on nothing: two wheels, frame, saddle, bars, a basket
    const c = Math.cos(ry), s = Math.sin(ry), at = (dx, dz) => [x + dx * c - dz * s, z + dx * s + dz * c];
    for (const dz of [-0.46, 0.46]) { const [qx, qz] = at(0, dz); p.push(Kit.cyl(0.33, 0.33, 0.05, qx, y0 + 0.33, qz, U.iron, { rz: Math.PI / 2, seg: 8, ry })); }
    const [fx, fz] = at(0, 0); p.push(Kit.box(0.05, 0.05, 0.95, fx, y0 + 0.62, fz, col, { ry }), Kit.box(0.05, 0.5, 0.05, fx, y0 + 0.34, fz - Math.sin(ry) * 0.05 + 0.0, col, { ry }));
    const [sx, sz] = at(0, -0.3), [hx, hz] = at(0, 0.45); p.push(Kit.box(0.14, 0.06, 0.26, sx, y0 + 0.98, sz, U.iron, { ry }), Kit.box(0.5, 0.05, 0.05, hx, y0 + 0.98, hz, U.iron, { ry }), Kit.box(0.28, 0.2, 0.3, hx, y0 + 0.74, hz + 0.12, '#8a6a3a', { ry }));
  };
  const lamp = (p, x, z, y0 = ST) => p.push(Kit.cyl(0.05, 0.07, 3.8, x, y0, z, U.iron), Kit.box(0.34, 0.08, 0.34, x, y0 + 3.8, z, U.iron), Kit.box(0.26, 0.4, 0.26, x, y0 + 3.42, z, U.warm, { glow: true }), Kit.cone(0.26, 0.2, x, y0 + 3.9, z, U.iron, { seg: 4 }));
  const rail = (p, x, len, y0 = ST) => { p.push(Kit.box(0.06, 0.06, len, x, y0 + 1.0, 0, U.iron)); for (let z = -len / 2 + 0.2; z < len / 2; z += 1.6) p.push(Kit.box(0.05, 1.0, 0.05, x, y0, z, U.iron)); };

  // ------------------------------------------------------------------ the quay: wharf, cellar wall with lit arched doorways, street, railing, lamp. variant: 0 café terrace, 1 plain with plants, 2 bicycles
  const quay = variant => () => {
    const p = [], L = SLOT + 0.2;
    p.push(Kit.box(2.7, WH, L, 1.35, 0, 0, U.stoneD), Kit.box(2.7, 0.05, L, 1.35, WH, 0, U.slab), Kit.box(0.14, 0.12, L, 0.05, WH, 0, U.stone));               // the quay wall and the wharf deck with its edge stone
    p.push(Kit.box(1.2, ST - WH, L, 3.3, WH, 0, U.brickD));                                                                                                // the cellar wall (the wharf's back, the street's front)
    p.push(Kit.box(8.2, ST, L, 7.8, 0, 0, U.stoneD), Kit.box(9.4, 0.05, L, 7.4, ST, 0, U.street), Kit.box(0.8, 0.07, L, 3.2, ST, 0, U.stone));                  // the street slab, its paving and the coping along the edge
    for (const z of [-3.4, 3.4]) {                                                                                                                         // two wharf cellars: a stone arch, a dark frame, a lit door with mullions
      p.push(Kit.box(0.14, 1.65, 2.0, 2.62, WH, z, U.stone), Kit.cyl(1.0, 1.0, 0.14, 2.62, WH + 1.65, z, U.stone, { rz: Math.PI / 2, seg: 10 }));
      p.push(Kit.box(0.16, 1.5, 1.7, 2.55, WH, z, U.iron), Kit.cyl(0.85, 0.85, 0.16, 2.55, WH + 1.5, z, U.iron, { rz: Math.PI / 2, seg: 10 }));
      p.push(Kit.box(0.18, 1.4, 1.5, 2.5, WH, z, U.warm, { glow: true }), Kit.cyl(0.75, 0.75, 0.18, 2.5, WH + 1.4, z, U.warm, { rz: Math.PI / 2, seg: 10, glow: true }));
      p.push(Kit.box(0.22, 2.1, 0.07, 2.45, WH, z, U.iron), Kit.box(0.22, 0.07, 1.5, 2.45, WH + 0.8, z, U.iron));
    }
    p.push(Kit.cyl(0.1, 0.12, 0.45, 0.5, WH, -5.2, U.iron, { seg: 6 }), Kit.cyl(0.1, 0.12, 0.45, 0.5, WH, 5.2, U.iron, { seg: 6 }));                          // mooring bollards
    rail(p, 3.05, L); lamp(p, 3.4, mod(variant, 2) ? -4.5 : 4.5);
    if (variant === 0) {                                                                                                                                   // the café on the wharf: round tables, chairs, two parasols
      for (const [z, col] of [[-1.0, '#b83a3a'], [1.9, '#d8b14a']]) {
        p.push(Kit.cyl(0.4, 0.4, 0.05, 1.6, WH + 0.75, z, U.iron, { seg: 8 }), Kit.cyl(0.04, 0.04, 0.75, 1.6, WH, z, U.iron, { seg: 4 }), Kit.cyl(0.03, 0.03, 2.5, 1.6, WH, z, U.iron, { seg: 4 }), Kit.cone(1.25, 0.5, 1.6, WH + 2.4, z, col, { seg: 8 }));
        for (const [dx, dz] of [[-0.6, 0], [0.6, 0], [0, -0.6], [0, 0.6]]) p.push(Kit.box(0.34, 0.06, 0.34, 1.6 + dx, WH + 0.45, z + dz, '#3a342e'), Kit.box(0.34, 0.45, 0.05, 1.6 + dx + (dz ? 0 : (dx < 0 ? -0.17 : 0.17)), WH + 0.45, z + dz + (dz ? (dz < 0 ? -0.17 : 0.17) : 0), '#3a342e'));
      }
      for (const z of [-5.4, 5.4]) p.push(Kit.box(0.5, 0.45, 0.9, 2.3, WH, z, '#5a3a2a'), Kit.ico(0.32, 2.3, WH + 0.7, z, '#c04a6a'), Kit.ico(0.26, 2.3, WH + 0.65, z + 0.25, '#e8b84a'));       // planters
    } else if (variant === 1) {                                                                                                                            // plants against the wall and a pair of benches on the street
      for (const z of [-5.6, -1.4, 1.6, 5.6]) p.push(Kit.box(0.4, 0.4, 0.8, 2.3, WH, z, '#5a3a2a'), Kit.ico(0.34, 2.3, WH + 0.62, z, U.leaf), Kit.ico(0.25, 2.3, WH + 0.6, z + 0.3, '#d9667c'));
      for (const z of [-2.2, 2.6]) p.push(Kit.box(0.5, 0.1, 1.5, 4.0, ST + 0.45, z, '#7a5230'), Kit.box(0.08, 0.5, 1.5, 4.25, ST + 0.45, z, '#7a5230'), Kit.box(0.08, 0.45, 0.08, 3.85, ST, z - 0.6, U.iron), Kit.box(0.08, 0.45, 0.08, 3.85, ST, z + 0.6, U.iron));
    } else {                                                                                                                                               // bicycles: a row leaning along the railing, a rack further in
      [-5.2, -4.4, -3.6, -2.8, 0.6, 1.4, 2.2].forEach((z, k) => bike(p, 3.4, z, ['#b83a3a', '#2f5d8c', '#3a3a3a', '#d8b14a', '#2f7d5a', '#8a2f6a', '#e8e0d0'][k], ST, 0));
      p.push(Kit.box(0.05, 0.6, 4.0, 4.3, ST, 4.0, U.iron)); [3.0, 3.8, 4.6, 5.4].forEach((z, k) => bike(p, 4.6, z, ['#3a3a3a', '#b83a3a', '#d8b14a', '#2f5d8c'][k], ST, 0));
    }
    return Kit.merge(p);
  };

  // ------------------------------------------------------------------ a canal house: facade plane at local x = 0 (facing the canal), body toward +X, on the street (y = ST), centred on z = zc
  function house(p, o) {
    const { F, D = 8, floors, wall, zc = 0, gable = 'step', trim = U.white, shut = null, seed = 1, shop = false } = o, y0 = ST, GF = 3.3, FL = 2.9, H = GF + floors * FL, cols = F > 4.6 ? 3 : 2;
    p.push(Kit.box(D, H, F, D / 2, y0, zc, wall), Kit.box(D + 0.1, 0.55, F + 0.1, D / 2, y0, zc, U.stoneD));
    p.push(Kit.box(0.4, 0.22, F + 0.2, -0.1, y0 + H - 0.22, zc, trim), Kit.box(0.14, 0.14, F + 0.04, -0.05, y0 + GF - 0.1, zc, trim));                  // cornice, ground-floor band
    const win = (y, z, hgt, lit, wide = 0.9) => {                                                                                                          // a tall window with white frame, glazing bar, sill and lintel
      p.push(Kit.box(0.1, hgt, wide, -0.03, y, z, lit ? U.warm : U.glass, { glow: lit }), Kit.box(0.14, hgt + 0.2, 0.08, -0.06, y - 0.1, z - wide / 2 - 0.03, trim), Kit.box(0.14, hgt + 0.2, 0.08, -0.06, y - 0.1, z + wide / 2 + 0.03, trim),
        Kit.box(0.14, 0.1, wide + 0.18, -0.06, y + hgt, z, trim), Kit.box(0.2, 0.08, wide + 0.3, -0.09, y - 0.14, z, trim), Kit.box(0.12, 0.05, wide, -0.05, y + hgt * 0.55, z, trim));
      if (shut) p.push(Kit.box(0.06, hgt, 0.36, -0.1, y, z - wide / 2 - 0.26, shut), Kit.box(0.06, hgt, 0.36, -0.1, y, z + wide / 2 + 0.26, shut));
    };
    const doorZ = zc + (rnd(seed, 51) < 0.5 ? -1 : 1) * F * 0.24;                                                                                         // ground floor: a door with a transom and one or two windows (or a café front)
    p.push(Kit.box(0.12, 2.5, 1.0, -0.04, y0 + 0.5, doorZ, mod(seed, 3) === 0 ? U.oxblood : U.green), Kit.box(0.2, 0.15, 1.3, -0.08, y0 + 3.0, doorZ, trim), Kit.box(0.3, 0.2, 1.4, -0.15, y0 + 0.4, doorZ, U.stone));
    const gz = doorZ > zc ? zc - F * 0.24 : zc + F * 0.24; win(y0 + 0.9, gz, 1.9, rnd(seed, 53) < (shop ? 1 : 0.55), 1.1);
    for (let f = 0; f < floors; f++) for (let c = 0; c < cols; c++) win(y0 + GF + f * FL + 0.3, zc - F / 2 + (c + 0.5) * F / cols, f === floors - 1 && rnd(seed, 55) < 0.4 ? 1.5 : 1.9, rnd(seed * 17 + f * 5 + c, 57) < 0.42);
    const top = y0 + H;
    if (gable === 'step') { for (let s = 0; s < 4; s++) { const w = F - 0.4 - s * Math.min(0.95, (F - 0.9) / 3.4); p.push(Kit.box(0.5, 0.75, Math.max(0.5, w), 0.25, top + s * 0.75, zc, wall), Kit.box(0.6, 0.1, Math.max(0.6, w) + 0.1, 0.25, top + s * 0.75 + 0.75, zc, trim)); } }
    else if (gable === 'bell') { p.push(Kit.box(0.5, 1.3, F - 0.3, 0.25, top, zc, wall), Kit.cyl(F / 2 + 0.1, F / 2 + 0.1, 0.12, 0.12, top + 1.3, zc, trim, { rz: Math.PI / 2, seg: 12 }), Kit.cyl(F / 2 - 0.1, F / 2 - 0.1, 0.5, 0.25, top + 1.3, zc, wall, { rz: Math.PI / 2, seg: 12 }), Kit.cone(0.2, 0.5, 0.25, top + 1.3 + F / 2 - 0.05, zc, trim, { seg: 4 })); }
    else if (gable === 'neck') { p.push(Kit.box(0.5, 2.6, F * 0.52, 0.25, top, zc, wall), Kit.box(0.6, 0.15, F * 0.52 + 0.2, 0.25, top + 2.6, zc, trim), Kit.box(0.5, 0.8, F * 0.2, 0.25, top, zc - F * 0.36, wall), Kit.box(0.5, 0.8, F * 0.2, 0.25, top, zc + F * 0.36, wall), Kit.box(0.5, 1.6, F * 0.12, 0.25, top, zc - F * 0.26, wall), Kit.box(0.5, 1.6, F * 0.12, 0.25, top, zc + F * 0.26, wall)); }
    else if (gable === 'spout') { p.push(Kit.roof(F, 2.4, 0.5, 0.25, top, zc, wall, { ry: Math.PI / 2 }), Kit.box(0.14, 0.9, 0.5, 0.18, top + 0.9, zc, U.glass)); }
    if (gable !== 'flat') p.push(Kit.roof(F, 2.8, D - 0.6, D / 2 + 0.3, top, zc, rnd(seed, 59) < 0.5 ? U.roof : U.slate, { ry: Math.PI / 2 }));
    if (gable !== 'plain' && gable !== 'flat') { const hz = top + (gable === 'step' ? 3.0 : gable === 'bell' ? 1.3 + F / 2 : gable === 'neck' ? 2.75 : 2.4); p.push(Kit.box(0.14, 0.14, 1.0, -0.4, hz - 0.1, zc, U.iron), Kit.box(0.05, 0.4, 0.05, -0.8, hz - 0.4, zc, U.iron)); }       // the hoist beam and its hook
    if (gable === 'plain') p.push(Kit.roof(F + 0.3, 3.2, D + 0.3, D / 2, top, zc, U.roof, { ry: Math.PI / 2 }), Kit.box(0.5, 1.2, 0.5, D * 0.6, top + 2.0, zc + F * 0.2, U.brickD));
  }
  // a row of three houses filling a slot (12 m): widths, heights, gables and colours drawn from the seed
  const row = seed => () => {
    const p = [], W = [3.6 + rnd(seed, 1) * 1.0, 3.8 + rnd(seed, 2) * 1.2, 0], G = ['step', 'bell', 'neck', 'spout', 'plain', 'step', 'bell'], C = [U.brick, U.brickD, U.brickL, U.ochre, U.cream, U.blue, U.sage, U.brick, U.brickL];
    W[2] = SLOT - W[0] - W[1]; let z = -SLOT / 2;
    for (let k = 0; k < 3; k++) { const F = W[k], s = seed * 7 + k * 3; house(p, { F, D: 8.5, floors: 3 + Math.floor(rnd(s, 11) * 2.2), wall: C[Math.floor(rnd(s, 12) * C.length)], zc: z + F / 2, gable: G[Math.floor(rnd(s, 13) * G.length)], shut: rnd(s, 14) < 0.35 ? (rnd(s, 15) < 0.5 ? U.green : U.oxblood) : null, seed: s, shop: rnd(s, 16) < 0.3 }); z += F; }
    p.push(Kit.box(8.6, ST, SLOT + 0.1, 4.3, 0, 0, U.stoneD));                                                                                                 // the ground under them
    return Kit.merge(p);
  };

  // ------------------------------------------------------------------ trees: a linden on the street (2 sizes), a plane tree for the station park
  const linden = big => () => { const s = big ? 1.25 : 1, p = [Kit.cyl(0.16 * s, 0.22 * s, 3.2 * s, 0, ST, 0, U.trunk, { seg: 6 }), Kit.cyl(0.8, 0.8, 0.12, 0, ST, 0, U.stoneD, { seg: 8 })];
    for (const [dx, dy, dz, r, c] of [[0, 4.2, 0, 1.9, U.leaf], [0.9, 3.6, 0.7, 1.4, U.leafD], [-0.8, 3.7, -0.6, 1.5, U.leaf], [0.2, 5.3, -0.3, 1.2, U.leafD], [-0.3, 3.5, 1.0, 1.1, U.leaf]]) p.push(Kit.ico(r * s, dx * s, ST + dy * s, dz * s, c, { detail: 1 })); return Kit.merge(p); };

  // ------------------------------------------------------------------ the bridge: a low segmental stone arch over the canal, street level on top, lamps at the corners, a parapet along both sides. Spans x = -12 .. 12.
  const bridge = () => {
    const p = [], R = 6.0, CY = -3.0, L = 8.0;
    for (let x = -12; x < 12; x += 0.5) {                                                                                                                  // the arch face in 0.5 m columns: solid from the arch's soffit up to the street
      const xc = x + 0.25, ax = Math.abs(xc), yi = ax < 5.2 ? Math.max(WH, Math.sqrt(R * R - ax * ax) + CY) : 0;
      p.push(Kit.box(0.5, ST - yi, L, xc, yi, 0, mod(Math.round(x * 2), 4) < 2 ? U.brick : U.brickL));
    }
    p.push(Kit.box(24, 0.06, L, 0, ST, 0, U.street), Kit.box(24, 0.18, 0.3, 0, ST + 0.55, L / 2 - 0.15, U.brickD), Kit.box(24, 0.18, 0.3, 0, ST + 0.55, -L / 2 + 0.15, U.brickD), Kit.box(24, 0.7, 0.24, 0, ST, L / 2 - 0.12, U.brick), Kit.box(24, 0.7, 0.24, 0, ST, -L / 2 + 0.12, U.brick));   // street, parapets with coping
    p.push(Kit.box(7.4, WH, L, 4.5, 0, 0, U.stoneD), Kit.box(7.4, WH, L, -4.5, 0, 0, U.stoneD));
    for (const [x, z] of [[-6.5, -3.6], [-6.5, 3.6], [6.5, -3.6], [6.5, 3.6]]) lamp(p, x, z);
    return Kit.merge(p);
  };

  // ------------------------------------------------------------------ the Dom tower: the cathedral's bell tower, far off at the end of the canal (a fixed landmark). Pale stone, three stages, an open lantern, 112 m
  const dom = () => {
    const p = [Kit.box(16, 52, 16, 0, 0, 0, U.dom), Kit.box(16.6, 1.2, 16.6, 0, 50, 0, U.domD), Kit.box(12, 30, 12, 0, 52, 0, U.dom), Kit.box(12.6, 1.0, 12.6, 0, 80, 0, U.domD)];
    for (const [y, h] of [[8, 14], [30, 15]]) for (const s of [-1, 1]) p.push(Kit.box(2.6, h, 0.4, s * 3.2, y, -8.05, U.domD), Kit.box(2.6, h, 0.4, s * 3.2, y, 8.05, U.domD), Kit.box(0.4, h, 2.6, -8.05, y, s * 3.2, U.domD), Kit.box(0.4, h, 2.6, 8.05, y, s * 3.2, U.domD));   // tall blind windows
    for (const [y, h] of [[56, 20]]) for (const s of [-1, 1]) p.push(Kit.box(2.2, h, 0.4, s * 2.4, y, -6.05, U.domD), Kit.box(2.2, h, 0.4, s * 2.4, y, 6.05, U.domD), Kit.box(0.4, h, 2.2, -6.05, y, s * 2.4, U.domD), Kit.box(0.4, h, 2.2, 6.05, y, s * 2.4, U.domD));
    p.push(Kit.cyl(4.6, 5.0, 24, 0, 81, 0, U.dom, { seg: 8 }), Kit.cyl(5.2, 5.2, 1.0, 0, 105, 0, U.domD, { seg: 8 }), Kit.cone(4.6, 7, 0, 106, 0, '#59616a', { seg: 8 }), Kit.cyl(0.25, 0.25, 6, 0, 112, 0, U.iron, { seg: 4 }));
    for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4 + Math.PI / 8; p.push(Kit.box(1.4, 14, 0.3, 4.7 * Math.sin(a), 86, 4.7 * Math.cos(a), U.iron, { ry: a })); }                                         // the lantern's openings
    for (const [x, z] of [[-6.8, -6.8], [6.8, -6.8], [-6.8, 6.8], [6.8, 6.8]]) p.push(Kit.cone(1.2, 5, x, 80, z, U.domD, { seg: 4 }));
    return Kit.merge(p);
  };

  // ------------------------------------------------------------------ stretch A, the basin at Utrecht Centraal (the restored Catharijnesingel): on one side the station hall, a wave-shaped canopy over a wide promenade,
  // glass and concrete; on the other a park with plane trees and wide stone steps down to the water; a white footbridge across. Modern, open, lower than the old canal.
  const GL = '#26364f', CON = '#8d909a', WAVE = '#dfe6ee', LAWN = '#4f7048', PL = 0.9;
  const stationHall = () => {
    const p = [], L = SLOT + 0.2;
    p.push(Kit.box(6.2, PL, L, 3.1, 0, 0, U.stoneD), Kit.box(6.2, 0.05, L, 3.1, PL, 0, '#9a9288'), Kit.box(0.14, 0.12, L, 0.05, PL, 0, U.stone));                                    // the promenade, a little over the water
    p.push(Kit.box(14, 13, L, 13.2, 0, 0, CON), Kit.box(0.3, 0.5, L, 6.2, 12.6, 0, '#c9ccd4'));                                                                                         // the hall, a pale concrete band
    for (let y = 1.4; y < 11; y += 3.2) for (const z of [-4, 0, 4]) p.push(Kit.box(0.12, 2.6, 3.4, 6.1, y, z, rnd(y * 3 + z, 71) < 0.6 ? '#cfe6ff' : GL, { glow: true }), Kit.box(0.2, 0.12, 3.5, 6.0, y - 0.1, z, '#c9ccd4'));   // glass bays, most of them lit
    for (let k = 0; k < 4; k++) { const z = -4.5 + k * 3.0; p.push(Kit.box(7.2, 0.28, 3.0, 3.6, 6.4 + 0.5 * (k % 2), z, WAVE, { rz: (k % 2 ? 1 : -1) * 0.16 }), Kit.box(5.8, 0.05, 2.4, 3.4, 6.2 + 0.5 * (k % 2), z, '#fff3d8', { glow: true })); }   // the wave: slabs tilted one way, then the other, lit underneath
    for (const z of [-4.5, 1.5, 4.5]) p.push(Kit.cyl(0.16, 0.16, 6.4, 0.4, PL, z, '#c9ccd4', { seg: 6 }));                                                                             // columns
    p.push(Kit.box(0.4, 0.4, 0.4, 1.0, PL, -2.2, U.iron), Kit.cyl(0.05, 0.05, 3.4, 5.4, PL, 4.0, U.iron, { seg: 4 }), Kit.box(0.5, 0.25, 0.25, 5.4, PL + 3.3, 4.0, '#e8f0ff', { glow: true }));
    p.push(Kit.cyl(0.05, 0.05, 3.4, 5.4, PL, -4.0, U.iron, { seg: 4 }), Kit.box(0.5, 0.25, 0.25, 5.4, PL + 3.3, -4.0, '#e8f0ff', { glow: true }));
    for (const z of [-2.6, 2.4]) bike(p, 4.6, z, ['#b83a3a', '#2f5d8c'][z > 0 ? 1 : 0], PL, 0);
    return Kit.merge(p);
  };
  const park = () => {
    const p = [], L = SLOT + 0.2;
    for (let k = 0; k < 3; k++) p.push(Kit.box(1.0 + 0.0, PL - k * 0.3, L, 0.5 + k * 1.0, 0, 0, k % 2 ? U.stone : '#9a9288'));                                                              // wide stone steps down to the water
    p.push(Kit.box(14, PL, L, 10.0, 0, 0, LAWN), Kit.box(0.5, 0.3, L, 3.25, PL, 0, '#9a9288'));
    for (const z of [-3.2, 3.6]) p.push(Kit.box(0.5, 0.1, 1.6, 4.8, PL + 0.45, z, '#7a5230'), Kit.box(0.08, 0.5, 1.6, 5.05, PL + 0.45, z, '#7a5230'));
    return Kit.merge(p);
  };
  const plane = () => { const p = [Kit.cyl(0.28, 0.4, 5.5, 0, PL, 0, '#a59d8c', { seg: 6 })]; for (const [dx, dy, dz, r, c] of [[0, 7.6, 0, 3.0, '#6e8f50'], [1.6, 6.6, 1.2, 2.2, '#5e8046'], [-1.6, 6.8, -1.0, 2.4, '#6e8f50'], [0.3, 9.0, -0.4, 1.9, '#5e8046']]) p.push(Kit.ico(r, dx, PL + dy, dz, c, { detail: 1 })); return Kit.merge(p); };
  const footBridge = () => {                                                                                                                                                              // a white steel footbridge: a flat deck, one arch above it with hangers
    const p = [Kit.box(18, 0.25, 3.4, 0, 0.9, 0, '#e8e6e0'), Kit.box(18, 0.9, 3.0, 0, 0, 0, U.stoneD)];
    for (let k = -6; k <= 6; k++) { const a = k * 0.13, x = 9.6 * Math.sin(a), y = 1.2 + 6.4 * Math.cos(a) - 6.4 + 4.4 * 1; p.push(Kit.box(0.28, 0.5, 0.28, x, y, -1.6, '#f4f2ee', { rz: -a }), Kit.box(0.28, 0.5, 0.28, x, y, 1.6, '#f4f2ee', { rz: -a })); if (k % 2 === 0 && k !== -6 && k !== 6) p.push(Kit.box(0.05, y - 1.2, 0.05, x, 1.15, -1.6, '#cfd2d8'), Kit.box(0.05, y - 1.2, 0.05, x, 1.15, 1.6, '#cfd2d8')); }
    p.push(Kit.box(18, 0.06, 0.06, 0, 2.0, -1.65, '#e8e6e0'), Kit.box(18, 0.06, 0.06, 0, 2.0, 1.65, '#e8e6e0'));
    return Kit.merge(p);
  };
  // ------------------------------------------------------------------ stretch B, under Hoog Catharijne: the canal runs through a covered channel under the shopping centre. A low concrete ceiling, brick sides, lit walkways, and
  // strips of glass in the ceiling with the shadows of people crossing above (in the real place there are glass panels to watch the boats from above).
  const tunnel = () => {
    const p = [], L = SLOT + 0.2;
    p.push(Kit.box(24, 0.9, L, 0, 3.6, 0, CON), Kit.box(0.3, 3.6, L, -3.55, 0, 0, U.brickD), Kit.box(0.3, 3.6, L, 3.55, 0, 0, U.brickD));
    for (const s of [-1, 1]) { p.push(Kit.box(1.3, WH, L, s * 4.4, 0, 0, U.stoneD), Kit.box(7, 4.5, L, s * 8.4, 0, 0, U.stoneD), Kit.box(0.14, 0.8, L, s * 3.75, WH, 0, U.warm, { glow: true })); }
    for (const x of [-2.3, 0, 2.3]) { p.push(Kit.box(0.7, 0.12, L - 1.2, x, 3.55, 0, '#5f84b4', { glow: true })); for (let k = 0; k < 2; k++) { const z = (rnd(x * 7 + k, 81) - 0.5) * 8, xx = x + (rnd(x + k, 82) - 0.5) * 0.4; p.push(Kit.box(0.2, 0.03, 0.5, xx - 0.12, 3.5, z, '#1f2740'), Kit.box(0.2, 0.03, 0.5, xx + 0.12, 3.5, z + 0.1, '#1f2740')); } }       // the glass strips and the shadows of people
    for (const z of [-6, 0]) for (const s of [-1, 1]) p.push(Kit.box(0.3, 3.6, 0.5, s * 3.4, 0, z, '#9a9ca6'));
    for (const z of [-3, 3]) for (const x of [-1.15, 1.15]) p.push(Kit.box(0.5, 0.1, 0.9, x, 3.5, z, U.warm, { glow: true }));                                                                  // ceiling lamps between the glass strips
    return Kit.merge(p);
  };

  ENV3D.utrecht = {
    name: 'UTRECHT',
    sky: { top: '#27324f', mid: '#7b6f93', horizon: '#f0b484' },                                  // blue hour: deep blue overhead, lilac, a last peach band at the horizon
    sunDisc: { color: '#ffe0b0', size: 7 }, sunPos: [-30, 8], sunGlow: 0.5,
    fog: { color: '#8a88a8', near: 34, far: 190 },
    hemi: { sky: '#98a4cc', ground: '#443c4c', intensity: 1.4 },
    sun: { color: '#ffb070', intensity: 1.6, position: [-8, 4, -10] },
    groundFar: '#2c2a36',
    road: { asphalt: ['#35575f', '#315359'], mark: '#9fc4c8', edge: '#4a7078', curb: ['#6c655d', '#6c655d'], curbFace: '#5a544e', walk: ['#8f857a', '#8a8076'], court: '#5d5654', verge: ['#5d5654', '#585250'], water: true },   // the ribbon is water: blue-green, pale ripple marks
    innerOk: new Set(['linden']),
    props: { quayA: quay(0), quayB: quay(1), quayC: quay(2), rowA: row(1), rowB: row(2), rowC: row(3), rowD: row(4), rowE: row(5), rowF: row(6), rowG: row(7), rowH: row(8), linden: linden(false), lindenB: linden(true), bridge, dom, stationHall, park, plane, footBridge, tunnel },
    stretches: {                                                                                   // the other two stretches of the zone (the Oudegracht is `layout` above)
      basin(i, rnd) { const out = [{ prop: 'stationHall', x: -EDGE, dist: 6 }, { prop: 'park', x: EDGE, dist: 6 }]; if (mod(i, 4) === 2) out.push({ prop: 'footBridge', x: 0, dist: 6 }); else if (mod(i, 2) === 0) out.push({ prop: 'plane', x: 5.6 + rnd(i, 3) * 3, dist: 3 + rnd(i, 4) * 4 }); if (mod(i, 2) === 1) out.push({ prop: 'plane', x: 8.5 + rnd(i, 5) * 3, dist: 8 }); return out; },
      tunnel(i) { return [{ prop: 'tunnel', x: 0, dist: 6 }]; },
    },
    layout(i, rnd) {
      const out = [], ROWS = ['rowA', 'rowB', 'rowC', 'rowD', 'rowE', 'rowF', 'rowG', 'rowH'];
      if (mod(i, 8) === 5) { out.push({ prop: 'bridge', x: 0, dist: 6 }); return out; }            // a bridge every 8 slots (96 m): no quay or houses there, the bridge has its own
      for (const side of [-1, 1]) {
        const k = i * 2 + (side > 0 ? 1 : 0);
        out.push({ prop: ['quayA', 'quayB', 'quayC'][Math.floor(rnd(k, 3) * 3)], x: side * EDGE, dist: 6 });
        out.push({ prop: ROWS[Math.floor(rnd(k, 4) * ROWS.length)], x: side * FRONT, dist: 6 });
        if (mod(i + (side > 0 ? 1 : 0), 3) === 0) out.push({ prop: rnd(k, 6) < 0.5 ? 'linden' : 'lindenB', x: side * 7.6, dist: 3 + rnd(k, 5) * 2 });
      }
      return out;
    },
  };
})();
