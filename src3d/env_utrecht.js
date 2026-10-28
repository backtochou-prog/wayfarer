// UTRECHT, THE CANAL (design draft, not on the track yet: see tools/utrecht_design.html and docs/utrecht-canal-design.md). The zone after the Gare du Midi: the run is on the water of the
// Oudegracht near Utrecht Centraal, at blue hour. The road ribbon is the canal (6.6 m of water, three lanes), and the two sides are built the way the old canal is: a WHARF (werf) a metre above
// the water, a brick wall behind it with arched WHARF CELLARS (werfkelders: lit doorways, today's cafés), the STREET 3.5 m above the water (herringbone brick) with a railing, black lanterns, plane trees and parked bicycles,
// then the tall narrow gabled houses (step, bell, neck, spout gables, white window frames, hoist beams). Props follow the same contract as the other zones (a Kit part list per prop, local
// +X pointing away from the road, local Z along it, one SEG_LEN slot each); the water, the wharf and the street are props, so the ribbon needs no change except its palette.
// Cross-section from the canal's axis (metres): water |x| < 3.3 | wharf deck 3.5 .. 6.2 (y 1.0) | cellar wall 6.2 .. 7.4 (to y 3.5) | street 6.2 .. 12.9 (y 3.5) | house fronts at 12.9.
// Everything here is original low-poly, drawn from how the real place is built, except seven pictures and the canal water from the user's own Utrecht photos (src3d/utrecht_assets.js, 28 photos in all) (src3d/utrecht_assets.js: the 1905 and 1912 houses above their shops,
// the Choorstraat house, a shop window with raffia shoes, a white facade with arched windows, the brick house with Utrecht's red and white shutters, the Dom tower under scaffolding), used as flat panels (only cropped, never recoloured). The street vocabulary (black square lanterns, herringbone paving, plane trees, painted
// shopfronts in mint and burgundy, fruit crates with plants, the cheese cart, beige parasols, green bistro chairs, orange brick bands and red arches) is taken from those photos.
window.ENV3D = window.ENV3D || {};

(function () {
  const mod = (a, n) => ((a % n) + n) % n;
  const U = { brick: '#92503f', brickD: '#6e3a30', brickL: '#ab6650', ochre: '#c98f58', cream: '#dccbab', nouv: '#d9c796', blue: '#6f8796', sage: '#7e9482', white: '#ece6d8', cream2: '#e8dcc0', stone: '#a29686', stoneD: '#6c655d', slab: '#8f857a',
              street: '#4e413e', slate: '#3c3a48', roof: '#5a4046', glass: '#222a3c', warm: '#ffbd70', iron: '#202228', green: '#2f4a3c', oxblood: '#5c2a2c', water: '#34565f',
              leaf: '#4d7a45', leafD: '#355d3a', trunk: '#4e3a30', dom: '#b9a78e', domD: '#8d7c68',
              mint: '#8fe0b0', burg: '#6a1f2c', chair: '#1f5a3a', beige: '#d9cdb0', blueFrame: '#2a4466', archRed: '#b0442c', orange: '#cd8a30', banner: '#8a1c24', blueUm: '#1d4fb8', greyUm: '#3a3a40', redUm: '#c0282c', wicker: '#6a4a34', boat: '#dfe2dc', pileW: '#ececec', pile: '#5a4a3a' };
  const SLOT = SEG_LEN, WH = 1.0, ST = 3.5, FRONT = 12.9;           // slot length (12 m), wharf height, street height above the water, x of the house fronts from the canal's axis
  const EDGE = 3.5;                                                  // x of the water's edge (the ribbon's curb): quay props sit here, local x = 0 at the water edge, so the street is local 2.7 .. 9.4

  // ------------------------------------------------------------------ small parts (the vocabulary comes from the user's photos of Utrecht: black square lanterns, dark Dutch bicycles, green bistro furniture, beige parasols)
  const bike = (p, x, z, col, y0 = ST, ry = 0) => {                  // a parked bicycle standing along Z (wheels turn about X): two wheels, frame, saddle, high bars, a carrier or a basket
    const c = Math.cos(ry), s = Math.sin(ry), at = (dx, dz) => [x + dx * c - dz * s, z + dx * s + dz * c];
    for (const dz of [-0.46, 0.46]) { const [qx, qz] = at(0, dz); for (const f of [1, -1]) p.push(Kit._part(new THREE.RingGeometry(0.26, 0.34, 10), U.iron, { ry: f * Math.PI / 2 + ry }, qx, y0 + 0.34, qz, true)); p.push(Kit.cyl(0.04, 0.04, 0.08, qx, y0 + 0.3, qz, U.iron, { rz: Math.PI / 2, seg: 4 })); }     // wheels: rings with a hub
    const [fx, fz] = at(0, 0); p.push(Kit.box(0.05, 0.05, 0.95, fx, y0 + 0.62, fz, col, { ry }), Kit.box(0.05, 0.5, 0.05, fx, y0 + 0.34, fz, col, { ry }));
    const [sx, sz] = at(0, -0.3), [hx, hz] = at(0, 0.45); p.push(Kit.box(0.14, 0.06, 0.26, sx, y0 + 0.98, sz, U.iron, { ry }), Kit.box(0.5, 0.05, 0.05, hx, y0 + 1.04, hz, U.iron, { ry }), Kit.box(0.28, 0.2, 0.3, hx, y0 + 0.74, hz + 0.12, '#6a5a40', { ry }));
  };
  const BIKES = ['#26262c', '#26262c', '#3a3a42', '#b83a3a', '#26262c', '#2f4a6a', '#3a3a42'];
  // a square lantern: iron base and cap, four corner posts, a lit glass box, a finial (the lanterns of the photos hang on brackets from the walls or stand on fluted iron posts)
  const lantern = (p, x, y, z, s = 1) => {
    p.push(Kit.box(0.34 * s, 0.08 * s, 0.34 * s, x, y, z, U.iron), Kit.box(0.28 * s, 0.42 * s, 0.28 * s, x, y + 0.08 * s, z, U.warm, { glow: true }), Kit.cone(0.3 * s, 0.24 * s, x, y + 0.5 * s, z, U.iron, { seg: 4, ry: Math.PI / 4 }), Kit.ico(0.05 * s, x, y + 0.8 * s, z, U.iron));
    for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) p.push(Kit.box(0.04 * s, 0.44 * s, 0.04 * s, x + dx * 0.15 * s, y + 0.08 * s, z + dz * 0.15 * s, U.iron));
  };
  const lamp = (p, x, z, y0 = ST) => { p.push(Kit.cyl(0.14, 0.17, 0.5, x, y0, z, U.iron, { seg: 8 }), Kit.cyl(0.05, 0.08, 2.9, x, y0 + 0.5, z, U.iron, { seg: 8 }), Kit.box(0.2, 0.1, 0.2, x, y0 + 3.35, z, U.iron)); lantern(p, x, y0 + 3.45, z, 1.1); };
  const wallLantern = (p, y, z) => { p.push(Kit.box(0.7, 0.06, 0.06, -0.38, y, z, U.iron), Kit.box(0.06, 0.3, 0.06, -0.7, y - 0.3, z, U.iron)); lantern(p, -0.7, y - 0.05, z, 0.9); };
  const rail = (p, x, len, y0 = ST) => { p.push(Kit.box(0.06, 0.06, len, x, y0 + 1.0, 0, U.iron), Kit.box(0.05, 0.05, len, x, y0 + 0.55, 0, U.iron)); for (let z = -len / 2 + 0.2; z < len / 2; z += 1.6) p.push(Kit.box(0.1, 1.0, 0.1, x, y0, z, U.iron), Kit.ico(0.085, x, y0 + 1.06, z, U.iron)); };       // posts with ball finials, two rails
  const pile = (p, x, z, y0 = -0.2, h = 1.5) => p.push(Kit.cyl(0.11, 0.12, h, x, y0, z, U.pile, { seg: 6 }), Kit.cyl(0.115, 0.115, 0.2, x, y0 + h, z, U.pileW, { seg: 6 }));      // a mooring pile with a white cap
  const crates = (p, x, z, y0 = ST) => {                             // wooden fruit crates stacked beside a shop door with potted plants on and in them
    p.push(Kit.box(0.5, 0.34, 0.8, x, y0, z, '#6a4a30'), Kit.box(0.5, 0.34, 0.8, x, y0 + 0.34, z, '#7a5638'), Kit.box(0.5, 0.34, 0.8, x + 0.05, y0 + 0.68, z + 0.05, '#6a4a30'));
    for (const [dz, c, r] of [[-0.25, U.leaf, 0.2], [0.05, '#5d9a50', 0.24], [0.3, U.leafD, 0.18]]) p.push(Kit.ico(r, x, y0 + 1.15, z + dz, c), Kit.cyl(0.1, 0.08, 0.16, x, y0 + 1.02, z + dz, '#a8583c', { seg: 6 }));
    p.push(Kit.ico(0.15, x + 0.2, y0 + 0.5, z - 0.55, '#d9a830'), Kit.ico(0.13, x + 0.18, y0 + 0.5, z + 0.6, U.leaf));
  };
  // the cheese cart of the photos: a wooden barrow with one grey wheel, a gingham awning on two posts, yellow wheels of cheese and cut wedges
  const cheeseCart = (p, x, z, y0 = ST) => {
    p.push(Kit.box(0.7, 0.5, 1.2, x, y0 + 0.5, z, '#e0cca0'), Kit.cyl(0.3, 0.3, 0.14, x - 0.1, y0 + 0.02, z + 0.4, '#5a5e66', { rz: Math.PI / 2, seg: 8 }), Kit.box(0.08, 0.5, 0.08, x - 0.3, y0 + 0.02, z - 0.5, '#e0cca0'), Kit.box(0.08, 0.5, 0.08, x + 0.3, y0 + 0.02, z - 0.5, '#e0cca0'));
    p.push(Kit.box(0.06, 1.5, 0.06, x - 0.34, y0 + 0.75, z + 0.52, '#e0cca0'), Kit.box(0.06, 1.5, 0.06, x - 0.34, y0 + 0.75, z - 0.52, '#e0cca0'));
    for (let k = 0; k < 8; k++) p.push(Kit.box(0.9, 0.04, 0.14, x - 0.1, y0 + 2.24 - Math.abs(k - 3.5) * 0.0, z - 0.6 + k * 0.17, k % 2 ? '#f2e6e2' : '#c8483c', { rz: 0.3 }));
    p.push(Kit.cyl(0.26, 0.26, 0.12, x, y0 + 1.0, z - 0.3, '#e8b830', { seg: 8 }), Kit.cyl(0.26, 0.26, 0.12, x, y0 + 1.0, z + 0.25, '#e8b830', { seg: 8 }), Kit.cyl(0.24, 0.24, 0.1, x, y0 + 1.12, z - 0.3, '#e8c870', { seg: 8 }), Kit.cyl(0.22, 0.22, 0.1, x, y0 + 1.12, z + 0.25, '#d9a838', { seg: 8 }));
  };
  const parasol = (p, x, y, z, r = 1.25, col = U.beige) => p.push(Kit.cyl(0.04, 0.04, 0.75, x, y, z, U.iron, { seg: 4 }), Kit.cyl(0.03, 0.03, 2.5, x, y, z, U.iron, { seg: 4 }), Kit.cone(r, 0.5, x, y + 2.4, z, col, { seg: 8 }));
  const closedUm = (p, x, y, z, col) => p.push(Kit.cyl(0.03, 0.03, 2.2, x, y, z, U.iron, { seg: 4 }), Kit.cone(0.2, 1.7, x, y + 0.5, z, col, { seg: 6 }), Kit.cyl(0.16, 0.05, 0.2, x, y + 0.3, z, col, { seg: 6 }));     // a folded parasol
  const boat = (p, x, z, y = -0.04) => p.push(Kit.box(0.7, 0.3, 2.4, x, y, z, U.boat), Kit.box(0.5, 0.27, 0.5, x, y + 0.02, z - 1.4, U.boat), Kit.box(0.28, 0.24, 0.4, x, y + 0.05, z - 1.75, U.boat), Kit.box(0.5, 0.27, 0.45, x, y + 0.02, z + 1.4, U.boat), Kit.box(0.5, 0.04, 2.0, x, y + 0.3, z, '#9b9c94'), Kit.box(0.56, 0.05, 0.2, x, y + 0.33, z - 0.4, U.boat), Kit.box(0.56, 0.05, 0.2, x, y + 0.33, z + 0.5, U.boat));   // a white rowing boat moored along the wharf
  const bistro = (p, x, y, z, col = U.chair) => {                                   // a round table and four chairs in green painted metal
    p.push(Kit.cyl(0.4, 0.4, 0.05, x, y + 0.75, z, col, { seg: 8 }), Kit.cyl(0.04, 0.04, 0.75, x, y, z, col, { seg: 4 }));
    for (const [dx, dz] of [[-0.6, 0], [0.6, 0], [0, -0.6], [0, 0.6]]) p.push(Kit.box(0.36, 0.05, 0.36, x + dx, y + 0.45, z + dz, col), Kit.box(0.36, 0.45, 0.05, x + dx + (dz ? 0 : (dx < 0 ? -0.18 : 0.18)), y + 0.45, z + dz + (dz ? (dz < 0 ? -0.18 : 0.18) : 0), col));
  };

  // ------------------------------------------------------------------ the quay: wharf, cellar wall with lit arched doorways, street (herringbone brick), railing, black lanterns.
  // variant: 0 café terrace (beige parasols, green bistro chairs, a string of lights), 1 plants, benches and fruit crates, 2 bicycles and the cheese cart
  const quay = variant => () => {
    const p = [], L = SLOT + 0.2;
    p.push(Kit.box(2.7, WH, L, 1.35, 0, 0, U.stoneD), Kit.box(2.7, 0.05, L, 1.35, WH, 0, U.slab), Kit.box(0.14, 0.12, L, 0.05, WH, 0, U.stone));               // the quay wall and the wharf deck with its edge stone
    p.push(Kit.box(1.2, ST - WH, L, 3.3, WH, 0, U.brickD));                                                                                                // the cellar wall (the wharf's back, the street's front)
    p.push(Kit.box(8.2, ST, L, 7.8, 0, 0, U.stoneD), Kit.box(9.4, 0.05, L, 7.4, ST, 0, U.street), Kit.box(0.8, 0.07, L, 3.2, ST, 0, U.stone));                  // the street slab (its brick paving is a textured quad), the coping along the edge
    for (const z of [-3.4, 3.4]) {                                                                                                                         // two wharf cellars: a stone arch, a dark frame, a lit door with mullions
      p.push(Kit.box(0.14, 1.65, 2.0, 2.62, WH, z, U.stone), Kit.cyl(1.0, 1.0, 0.14, 2.62, WH + 1.65, z, U.stone, { rz: Math.PI / 2, seg: 10 }));
      p.push(Kit.box(0.16, 1.5, 1.7, 2.55, WH, z, U.iron), Kit.cyl(0.85, 0.85, 0.16, 2.55, WH + 1.5, z, U.iron, { rz: Math.PI / 2, seg: 10 }));
      p.push(Kit.box(0.18, 1.4, 1.5, 2.5, WH, z, U.warm, { glow: true }), Kit.cyl(0.75, 0.75, 0.18, 2.5, WH + 1.4, z, U.warm, { rz: Math.PI / 2, seg: 10, glow: true }));
      p.push(Kit.box(0.22, 2.1, 0.07, 2.45, WH, z, U.iron), Kit.box(0.22, 0.07, 1.5, 2.45, WH + 0.8, z, U.iron));
    }
    for (const z of [-5.4, -0.6, 4.4]) pile(p, -0.12, z);                                                                                                  // mooring piles with white caps, as along the wharves of the photos
    rail(p, 3.05, L); lamp(p, 3.4, mod(variant, 2) ? -4.5 : 4.5);
    if (variant === 0) {
      for (const [z, um] of [[-1.0, U.blueUm], [1.9, U.greyUm]]) { bistro(p, 1.6, WH, z, U.wicker); parasol(p, 1.6, WH, z, 1.3, um); }
      for (let k = 0; k <= 10; k++) p.push(Kit.box(0.09, 0.09, 0.09, 4.4, ST + 3.2 - Math.sin(k / 10 * Math.PI) * -0.0 - 0.35 * Math.sin(k / 10 * Math.PI), -5 + k, U.warm, { glow: true }));   // a string of lights along the street
      p.push(Kit.box(0.02, 0.02, 10.2, 4.4, ST + 3.2, 0, U.iron));
      for (const z of [-5.4, 5.4]) p.push(Kit.box(0.5, 0.45, 0.9, 2.3, WH, z, '#5a3a2a'), Kit.ico(0.32, 2.3, WH + 0.7, z, '#c04a6a'), Kit.ico(0.26, 2.3, WH + 0.65, z + 0.25, '#e8b84a'));       // planters
    } else if (variant === 1) {
      for (const z of [-5.6, -1.4, 1.6, 5.6]) p.push(Kit.box(0.4, 0.4, 0.8, 2.3, WH, z, '#5a3a2a'), Kit.ico(0.34, 2.3, WH + 0.62, z, U.leaf), Kit.ico(0.25, 2.3, WH + 0.6, z + 0.3, '#d9667c'));
      for (const z of [-2.2, 2.6]) p.push(Kit.box(0.5, 0.1, 1.5, 4.0, ST + 0.45, z, '#7a5230'), Kit.box(0.08, 0.5, 1.5, 4.25, ST + 0.45, z, '#7a5230'), Kit.box(0.08, 0.45, 0.08, 3.85, ST, z - 0.6, U.iron), Kit.box(0.08, 0.45, 0.08, 3.85, ST, z + 0.6, U.iron));
      crates(p, 8.6, -3.6); crates(p, 8.6, 4.8);
      for (let k = 0; k < 9; k++) p.push(Kit.box(0.9, (ST - WH) * (9 - k) / 9, 0.5, 2.25, WH, -2.2 + k * 0.5, '#5a3a2a'), Kit.box(0.9, 0.05, 0.5, 2.25, WH + (ST - WH) * (9 - k) / 9, -2.2 + k * 0.5, '#7a5230'));      // wooden stairs down to the wharf
      p.push(Kit.box(0.07, 0.07, 4.9, 1.75, WH + 1.5, 0.25, '#f2efe6', { rx: Math.atan2(ST - WH, 4.5) }), Kit.box(0.07, 0.9, 0.07, 1.75, WH, 2.4, '#f2efe6'), Kit.box(0.07, 0.9, 0.07, 1.75, ST + 0.3, -2.0, '#f2efe6'));       // its white handrail
      boat(p, -0.45, -3.2); boat(p, -0.45, 0.6); boat(p, -0.45, 4.1);
    } else {
      [-5.2, -4.4, -3.6, -2.8, 0.6, 1.4, 2.2].forEach((z, k) => bike(p, 3.4, z, BIKES[k], ST, 0));
      p.push(Kit.box(0.05, 0.6, 4.0, 4.3, ST, 4.0, U.iron)); [3.0, 3.8, 4.6, 5.4].forEach((z, k) => bike(p, 4.6, z, BIKES[k + 2], ST, 0));
      cheeseCart(p, 7.2, -3.6); closedUm(p, 1.7, WH, -1.2, U.redUm); closedUm(p, 1.9, WH, 2.2, U.redUm);
    }
    return { merged: Kit.merge(p), sprite: UtrechtArt.floor(3.9, 9.4, -L / 2, L / 2, ST + 0.056), material: () => UtrechtArt.paveMaterial() };
  };

  // ------------------------------------------------------------------ a painted shopfront on a ground floor (3.3 m): pilasters with consoles, a fascia, a central door, two lit windows, as the user's photos show them (mint, burgundy, dark green).
  // `sp` collects textured panels; `display: 'shoes'` puts the photographed shop window (raffia shoes on green tiles) in the left window instead of a lit pane
  function shopfront(p, sp, F, zc, col, display, seed) {
    const y0 = ST, H = 3.3;
    p.push(Kit.box(0.18, 0.4, F, -0.09, y0, zc, U.iron), Kit.box(0.34, 0.62, F, -0.17, y0 + H - 0.62, zc, col), Kit.box(0.42, 0.12, F + 0.1, -0.21, y0 + H - 0.12, zc, col));
    for (const s of [-1, 1]) p.push(Kit.box(0.3, H - 0.7, 0.34, -0.15, y0, zc + s * (F / 2 - 0.17), col), Kit.box(0.4, 0.16, 0.44, -0.2, y0 + H - 0.86, zc + s * (F / 2 - 0.17), col), Kit.box(0.34, 0.5, 0.2, -0.17, y0 + H - 1.2, zc + s * (F / 2 - 0.4), col));   // pilasters, capitals and brackets
    p.push(Kit.box(0.14, 2.45, 1.0, -0.06, y0 + 0.2, zc, mod(seed, 2) ? '#44504a' : '#26262c'), Kit.box(0.2, 0.14, 1.3, -0.1, y0 + 2.65, zc, col), Kit.cyl(0.05, 0.05, 0.08, -0.15, y0 + 1.1, zc + 0.35, '#c9ccd0', { rz: Math.PI / 2, seg: 6 }));       // the door
    const pane = (z0, z1, shoes) => {
      const lit = !shoes && rnd(seed * 3 + z0, 61) < 0.8;
      if (shoes) sp.push(UtrechtArt.panel('shoes', -0.04, z0, z1, y0 + 0.5, y0 + 0.5 + (z1 - z0) / UTRECHT_ASSETS.shoes.ar)); else p.push(Kit.box(0.1, 2.0, z1 - z0, -0.03, y0 + 0.5, (z0 + z1) / 2, lit ? U.warm : U.glass, { glow: lit }));
      p.push(Kit.box(0.14, 2.2, 0.07, -0.06, y0 + 0.4, z0, col), Kit.box(0.14, 2.2, 0.07, -0.06, y0 + 0.4, z1, col), Kit.box(0.14, 0.08, z1 - z0 + 0.1, -0.06, y0 + 2.55, (z0 + z1) / 2, col), Kit.box(0.14, 0.08, z1 - z0 + 0.1, -0.06, y0 + 0.42, (z0 + z1) / 2, col));
    };
    pane(zc - F / 2 + 0.5, zc - 0.7, display === 'shoes'); pane(zc + 0.7, zc + F / 2 - 0.5, false);
    if (rnd(seed, 63) < 0.5) crates(p, 0.62, zc + (rnd(seed, 64) < 0.5 ? -1 : 1) * (F / 2 - 0.5));
  }
  // ------------------------------------------------------------------ a canal house: facade plane at local x = 0 (facing the canal), body toward +X, on the street (y = ST), centred on z = zc. Several kinds:
  // gable: step, bell, neck, spout (a triangle), plain, mansard (a slate roof with dormers). stripes: orange brick bands. arch: red brick arches over the windows. frame: 'white' or 'blue' (blue frames in cream surrounds)
  function house(p, sp, o) {
    const { F, D = 8, floors, wall, zc = 0, gable = 'step', trim = U.white, shut = null, seed = 1, shopCol = null, display = null, frame = 'white', stripes = null, arch = false, lant = false, banner = false, water = false } = o, y0 = o.y0 === undefined ? ST : o.y0, GF = 3.3, FL = 2.9, H = GF + floors * FL, cols = F > 4.6 ? 3 : 2;
    p.push(Kit.box(D, H, F, D / 2, y0, zc, wall), Kit.box(D + 0.1, 0.55, F + 0.1, D / 2, y0, zc, U.stoneD));
    p.push(Kit.box(0.4, 0.22, F + 0.2, -0.1, y0 + H - 0.22, zc, trim), Kit.box(0.14, 0.14, F + 0.04, -0.05, y0 + GF - 0.1, zc, trim));                  // cornice, ground-floor band
    if (stripes) for (let f = 0; f <= floors; f++) p.push(Kit.box(0.06, 0.1, F, -0.02, y0 + GF + f * FL - 0.25, zc, stripes), Kit.box(0.06, 0.08, F, -0.02, y0 + GF + f * FL - 0.45, zc, stripes));
    const blue = frame === 'blue', fr = blue ? U.blueFrame : trim;
    const win = (y, z, hgt, lit, wide = 0.9) => {                                                                                                          // a tall window: frame, glazing bar, sill and lintel; blue frames sit in a cream surround; arched ones in a red brick ring
      p.push(Kit.box(0.1, hgt, wide, -0.03, y, z, lit ? U.warm : U.glass, { glow: lit }), Kit.box(0.14, hgt + 0.2, 0.08, -0.06, y - 0.1, z - wide / 2 - 0.03, fr), Kit.box(0.14, hgt + 0.2, 0.08, -0.06, y - 0.1, z + wide / 2 + 0.03, fr),
        Kit.box(0.14, 0.1, wide + 0.18, -0.06, y + hgt, z, fr), Kit.box(0.2, 0.08, wide + 0.3, -0.09, y - 0.14, z, trim), Kit.box(0.12, 0.05, wide, -0.05, y + hgt * 0.55, z, fr));
      if (blue) p.push(Kit.box(0.1, hgt + 0.5, 0.2, -0.04, y - 0.15, z - wide / 2 - 0.22, U.cream2), Kit.box(0.1, hgt + 0.5, 0.2, -0.04, y - 0.15, z + wide / 2 + 0.22, U.cream2), Kit.box(0.1, 0.2, wide + 0.62, -0.04, y + hgt + 0.1, z, U.cream2));
      if (arch) p.push(Kit.cyl(wide / 2 + 0.26, wide / 2 + 0.26, 0.1, 0.03, y + hgt + 0.1, z, U.archRed, { rz: Math.PI / 2, seg: 10 }), Kit.cyl(wide / 2 + 0.06, wide / 2 + 0.06, 0.1, 0.0, y + hgt + 0.1, z, wall, { rz: Math.PI / 2, seg: 10 }));
      if (shut) p.push(Kit.box(0.06, hgt, 0.36, -0.1, y, z - wide / 2 - 0.26, shut), Kit.box(0.06, hgt, 0.36, -0.1, y, z + wide / 2 + 0.26, shut));
    };
    if (water) {                                                                                                                                           // a house on the water: one or two arched basement openings (lit), mooring piles in front
      const na = F > 4.6 ? 2 : 1;
      for (let a = 0; a < na; a++) { const z = zc + (na === 1 ? 0 : (a ? 0.26 : -0.26) * F), lit = rnd(seed * 3 + a, 71) < 0.75;
        p.push(Kit.box(0.14, 2.0, 1.7, -0.05, y0 + 0.25, z, U.stone), Kit.cyl(0.85, 0.85, 0.14, -0.05, y0 + 2.25, z, U.stone, { rz: Math.PI / 2, seg: 10 }), Kit.box(0.18, 1.85, 1.4, -0.08, y0 + 0.25, z, lit ? U.warm : U.iron, { glow: lit }), Kit.cyl(0.7, 0.7, 0.18, -0.08, y0 + 2.1, z, lit ? U.warm : U.iron, { rz: Math.PI / 2, seg: 10, glow: lit }), Kit.box(0.22, 2.2, 0.06, -0.12, y0 + 0.25, z, U.iron)); }
      pile(p, -0.55, zc - F * 0.4); pile(p, -0.55, zc + F * 0.4);
    } else if (shopCol) shopfront(p, sp, F, zc, shopCol, display, seed);
    else {                                                                                                                                                 // ground floor without a shop: a door with a transom and a window
      const doorZ = zc + (rnd(seed, 51) < 0.5 ? -1 : 1) * F * 0.24;
      p.push(Kit.box(0.12, 2.5, 1.0, -0.04, y0 + 0.5, doorZ, mod(seed, 3) === 0 ? U.oxblood : U.green), Kit.box(0.2, 0.15, 1.3, -0.08, y0 + 3.0, doorZ, trim), Kit.box(0.3, 0.2, 1.4, -0.15, y0 + 0.4, doorZ, U.stone));
      const gz = doorZ > zc ? zc - F * 0.24 : zc + F * 0.24; win(y0 + 0.9, gz, 1.9, rnd(seed, 53) < 0.55, 1.1);
    }
    for (let f = 0; f < floors; f++) for (let c = 0; c < cols; c++) win(y0 + GF + f * FL + 0.3, zc - F / 2 + (c + 0.5) * F / cols, f === floors - 1 && rnd(seed, 55) < 0.4 ? 1.5 : 1.9, rnd(seed * 17 + f * 5 + c, 57) < 0.42);
    const top = y0 + H;
    if (gable === 'step') { for (let s = 0; s < 4; s++) { const w = F - 0.4 - s * Math.min(0.95, (F - 0.9) / 3.4); p.push(Kit.box(0.5, 0.75, Math.max(0.5, w), 0.25, top + s * 0.75, zc, wall), Kit.box(0.6, 0.1, Math.max(0.6, w) + 0.1, 0.25, top + s * 0.75 + 0.75, zc, trim)); } }
    else if (gable === 'bell') { p.push(Kit.box(0.5, 1.3, F - 0.3, 0.25, top, zc, wall), Kit.cyl(F / 2 + 0.1, F / 2 + 0.1, 0.12, 0.12, top + 1.3, zc, trim, { rz: Math.PI / 2, seg: 12 }), Kit.cyl(F / 2 - 0.1, F / 2 - 0.1, 0.5, 0.25, top + 1.3, zc, wall, { rz: Math.PI / 2, seg: 12 }), Kit.cone(0.2, 0.5, 0.25, top + 1.3 + F / 2 - 0.05, zc, trim, { seg: 4 })); }
    else if (gable === 'neck') { p.push(Kit.box(0.5, 2.6, F * 0.52, 0.25, top, zc, wall), Kit.box(0.6, 0.15, F * 0.52 + 0.2, 0.25, top + 2.6, zc, trim), Kit.box(0.5, 0.8, F * 0.2, 0.25, top, zc - F * 0.36, wall), Kit.box(0.5, 0.8, F * 0.2, 0.25, top, zc + F * 0.36, wall), Kit.box(0.5, 1.6, F * 0.12, 0.25, top, zc - F * 0.26, wall), Kit.box(0.5, 1.6, F * 0.12, 0.25, top, zc + F * 0.26, wall)); }
    else if (gable === 'spout') { p.push(Kit.roof(F, 2.4, 0.5, 0.25, top, zc, wall, { ry: Math.PI / 2 }), Kit.box(0.14, 0.9, 0.5, 0.18, top + 0.9, zc, U.glass)); }
    if (gable === 'mansard') {                                                                                                                             // a slate roof sloping back from the cornice, with two white dormers
      p.push(Kit.roof(D, 3.2, F + 0.3, D / 2, top, zc, U.slate));
      for (const s of [-1, 1]) { const dz = zc + s * F * 0.24; p.push(Kit.box(1.5, 1.7, 1.5, 1.0, top + 0.5, dz, trim), Kit.box(0.1, 1.2, 1.0, 0.22, top + 0.7, dz, rnd(seed * 5 + s, 65) < 0.4 ? U.warm : U.glass, { glow: false }), Kit.roof(1.7, 0.9, 1.8, 1.0, top + 2.2, dz, U.slate, { ry: Math.PI / 2 })); }
    } else if (gable !== 'flat') p.push(Kit.roof(F, 2.8, D - 0.6, D / 2 + 0.3, top, zc, rnd(seed, 59) < 0.5 ? U.roof : U.slate, { ry: Math.PI / 2 }));
    if (gable === 'step' || gable === 'bell' || gable === 'neck') { const hz = top + (gable === 'step' ? 3.0 : gable === 'bell' ? 1.3 + F / 2 : 2.75); p.push(Kit.box(0.14, 0.14, 1.0, -0.4, hz - 0.1, zc, U.iron), Kit.box(0.05, 0.4, 0.05, -0.8, hz - 0.4, zc, U.iron)); }       // the hoist beam and its hook
    if (lant) wallLantern(p, y0 + GF - 0.4, zc + F / 2 - 0.5);
    if (banner) p.push(Kit.box(0.04, 2.0, 0.55, -0.14, y0 + GF + 0.3, zc - F / 2 + 0.5, U.banner), Kit.box(0.04, 1.8, 0.55, -0.14, y0 + GF + 0.5, zc - F / 2 + 1.2, U.banner));
    for (let f = 0; f < Math.min(floors, 2); f++) for (const z of [zc - F / 2 + 0.25, zc + F / 2 - 0.25]) p.push(Kit.box(0.05, 0.42, 0.05, -0.05, y0 + GF + f * FL + 1.0, z, U.iron, { rz: Math.PI / 4 }), Kit.box(0.05, 0.42, 0.05, -0.05, y0 + GF + f * FL + 1.0, z, U.iron, { rz: -Math.PI / 4 }));   // wall anchors
  }
  // a photographed house (the user's facade, only cropped) standing on the street: a body behind it, a painted shopfront under it where the photo shows only the upper floors
  function photoHouse(p, sp, cell, F, zc, o = {}) {
    const A = UTRECHT_ASSETS[cell], h = F / A.ar, y0 = ST, shopH = o.ground === false ? 0 : 3.3, eave = o.eave === undefined ? 1 : o.eave, body = shopH + h * eave;      // eave: the share of the photo that is wall (the rest is roof against the sky)
    p.push(Kit.box(8.5, body, F, 4.25, y0, zc, o.wall), Kit.box(8.6, 0.55, F + 0.1, 4.3, y0, zc, U.stoneD));
    if (eave < 1) p.push(Kit.roof(8.5, h * (1 - eave) * 1.05, F, 4.3, y0 + body, zc, U.slate));
    if (shopH) shopfront(p, sp, F, zc, o.shopCol, o.display, o.seed || 1);
    sp.push(UtrechtArt.panel(cell, -0.03, zc - F / 2, zc + F / 2, y0 + shopH, y0 + shopH + h));
  }
  // a row of three houses filling a slot (12 m): widths, heights, gables and colours drawn from the seed. `photo` = { cell, F, side, ... } puts one of the user's photographed houses in the row
  const row = (seed, photo, wet) => () => {
    const p = [], sp = [], G = ['step', 'bell', 'neck', 'spout', 'plain', 'mansard', 'mansard', 'step', 'bell'], C = [U.brick, U.brickD, U.brickL, U.ochre, U.cream, U.nouv, U.blue, U.sage, U.brick, U.brickL, U.nouv], SH = [U.mint, U.burg, U.chair, null, null, U.mint];
    const parts = photo ? (photo.side ? [photo.F, (SLOT - photo.F) / 2, (SLOT - photo.F) / 2] : [(SLOT - photo.F) / 2, (SLOT - photo.F) / 2, photo.F]) : [3.6 + rnd(seed, 1) * 1.0, 3.8 + rnd(seed, 2) * 1.2, 0];
    if (!photo) parts[2] = SLOT - parts[0] - parts[1];
    let z = -SLOT / 2;
    for (let k = 0; k < 3; k++) {
      const F = parts[k], s = seed * 7 + k * 3;
      if (photo && F === photo.F && ((photo.side && k === 0) || (!photo.side && k === 2))) photoHouse(p, sp, photo.cell, F, z + F / 2, { wall: photo.wall, shopCol: photo.shopCol, display: photo.display, seed: s, ground: photo.ground, eave: photo.eave });
      else {
        const nouv = rnd(s, 17) < 0.35, shopCol = SH[Math.floor(rnd(s, 18) * SH.length)];
        house(p, sp, { F, D: 8.5, y0: wet ? 0 : undefined, water: !!wet, floors: 3 + Math.floor(rnd(s, 11) * 2.2), wall: nouv ? U.nouv : C[Math.floor(rnd(s, 12) * C.length)], zc: z + F / 2, gable: G[Math.floor(rnd(s, 13) * G.length)], shut: !nouv && rnd(s, 14) < 0.3 ? (rnd(s, 15) < 0.5 ? U.green : U.oxblood) : null, seed: s,
          shopCol: wet ? null : shopCol, display: photo && photo.display && shopCol ? photo.display : null, frame: rnd(s, 19) < 0.3 ? 'blue' : 'white', stripes: nouv ? U.orange : null, arch: nouv && rnd(s, 20) < 0.7, lant: rnd(s, 21) < 0.4, banner: rnd(s, 22) < 0.12 });
      }
      z += F;
    }
    if (!wet) p.push(Kit.box(8.6, ST, SLOT + 0.1, 4.3, 0, 0, U.stoneD));                                                                                  // the ground under them (a house on the water has none)
    const merged = Kit.merge(p);
    if (!sp.length) return merged;                                                                                                                         // plain geometry (the usual prop shape) unless the row carries photographed panels
    return { merged, sprite: UtrechtArt.join(sp), material: () => UtrechtArt.material() };
  };

  // ------------------------------------------------------------------ trees: a plane tree (mottled grey-green trunk, as on the square of the photos) on the street, in 2 sizes
  const platane = big => () => { const s = big ? 1.25 : 1, p = [Kit.cyl(0.2 * s, 0.28 * s, 3.4 * s, 0, ST, 0, '#8a8a58', { seg: 6 }), Kit.cyl(0.21 * s, 0.24 * s, 0.9 * s, 0, ST + 0.6 * s, 0, '#6a6842', { seg: 6 }), Kit.cyl(0.21 * s, 0.24 * s, 0.7 * s, 0, ST + 1.9 * s, 0, '#a09a6a', { seg: 6 }), Kit.cyl(0.8, 0.8, 0.12, 0, ST, 0, U.stoneD, { seg: 8 })];
    for (const [dx, dy, dz, r, c] of [[0, 4.4, 0, 1.9, '#5f8a4e'], [0.9, 3.8, 0.7, 1.4, '#4d7a45'], [-0.8, 3.9, -0.6, 1.5, '#5f8a4e'], [0.2, 5.5, -0.3, 1.2, '#4d7a45'], [-0.3, 3.7, 1.0, 1.1, '#5f8a4e']]) p.push(Kit.ico(r * s, dx * s, ST + dy * s, dz * s, c, { detail: 1 })); return Kit.merge(p); };

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
    for (const sz of [-1, 1]) { for (const x of [-4.2, -1.4, 1.4, 4.2]) for (const a of [Math.PI / 4, -Math.PI / 4]) p.push(Kit.box(0.09, 1.0, 0.07, x, ST - 1.25, sz * (L / 2 + 0.05), U.iron, { rz: a }));            // the X-shaped iron wall anchors of the old bridge face
      for (let k = 0; k < 7; k++) bike(p, -9 + k * 1.2 + (sz > 0 ? 0.5 : 0), sz * (L / 2 - 0.62), BIKES[(k + (sz > 0 ? 3 : 0)) % BIKES.length], ST, Math.PI / 2); }   // bicycles leaning on both railings
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
    // the Dom was under scaffolding with the red and white Utrecht flag on it: the user's photo of it wraps the body of the tower (two tiles of 26 m on the lower block, one on the upper)
    const sp = UtrechtArt.join([UtrechtArt.tower('scaf', 8.06, 8.06, 0, 26), UtrechtArt.tower('scaf', 8.06, 8.06, 26, 52), UtrechtArt.tower('scaf', 6.06, 6.06, 52, 52 + 12.12 / UTRECHT_ASSETS.scaf.ar)]);
    return { merged: Kit.merge(p), sprite: sp, material: () => UtrechtArt.material() };
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
    innerOk: new Set(['platane']),
    props: { quayA: quay(0), quayB: quay(1), quayC: quay(2), rowA: row(1), rowB: row(2), rowC: row(3), rowD: row(4), rowE: row(5), rowF: row(6), rowG: row(7), rowH: row(8),
             rowP1905: row(21, { cell: 'h1905', F: 5.4, side: true, wall: '#d8c8a0', shopCol: '#26262c', eave: 0.7 }), rowP1912: row(22, { cell: 'h1912', F: 5.4, side: false, wall: '#d8c8a0', shopCol: '#6a1f2c', display: 'shoes', eave: 0.72 }), rowPChoor: row(23, { cell: 'hChoor', F: 5.3, side: true, wall: '#8a4a38', ground: false }),
             rowPWhite: row(24, { cell: 'wArch', F: 5.0, side: false, wall: '#e0dcd2', shopCol: '#26262c', eave: 0.93 }), rowPShut: row(25, { cell: 'shut', F: 5.4, side: true, wall: '#9a5a44', shopCol: '#2f4a3c', eave: 0.95 }),
             wetA: row(31, null, true), wetB: row(32, null, true), wetC: row(33, null, true), wetD: row(34, null, true),
             platane: platane(false), plataneB: platane(true), bridge, dom, stationHall, park, plane, footBridge, tunnel },
    stretches: {                                                                                   // the other two stretches of the zone (the Oudegracht is `layout` above)
      basin(i, rnd) { const out = [{ prop: 'stationHall', x: -EDGE, dist: 6 }, { prop: 'park', x: EDGE, dist: 6 }]; if (mod(i, 4) === 2) out.push({ prop: 'footBridge', x: 0, dist: 6 }); else if (mod(i, 2) === 0) out.push({ prop: 'plane', x: 5.6 + rnd(i, 3) * 3, dist: 3 + rnd(i, 4) * 4 }); if (mod(i, 2) === 1) out.push({ prop: 'plane', x: 8.5 + rnd(i, 5) * 3, dist: 8 }); return out; },
      tunnel(i) { return [{ prop: 'tunnel', x: 0, dist: 6 }]; },
    },
    layout(i, rnd) {
      const out = [], ROWS = ['rowA', 'rowB', 'rowC', 'rowD', 'rowE', 'rowF', 'rowG', 'rowH'], PHOTO = ['rowP1905', 'rowP1912', 'rowPChoor', 'rowPWhite', 'rowPShut'], WET = ['wetA', 'wetB', 'wetC', 'wetD'], blk = Math.floor(i / 3), wetL = rnd(blk * 2, 41) < 0.34, wetR = !wetL && rnd(blk * 2 + 1, 41) < 0.34;       // now and then a stretch where the houses rise straight out of the water (as above the Stadhuisbrug)
      if (mod(i, 8) === 5) { out.push({ prop: 'bridge', x: 0, dist: 6 }); return out; }            // a bridge every 8 slots (96 m): no quay or houses there, the bridge has its own
      for (const side of [-1, 1]) {
        const k = i * 2 + (side > 0 ? 1 : 0);
        if (side < 0 ? wetL : wetR) { out.push({ prop: WET[Math.floor(rnd(k, 9) * WET.length)], x: side * EDGE, dist: 6 }); continue; }
        out.push({ prop: ['quayA', 'quayB', 'quayC'][Math.floor(rnd(k, 3) * 3)], x: side * EDGE, dist: 6 });
        out.push({ prop: rnd(k, 7) < 0.42 ? PHOTO[Math.floor(rnd(k, 8) * PHOTO.length)] : ROWS[Math.floor(rnd(k, 4) * ROWS.length)], x: side * FRONT, dist: 6 });     // now and then one of the user's photographed houses
        if (mod(i + (side > 0 ? 1 : 0), 3) === 0) out.push({ prop: rnd(k, 6) < 0.5 ? 'platane' : 'plataneB', x: side * 7.6, dist: 3 + rnd(k, 5) * 2 });
      }
      return out;
    },
  };
})();
