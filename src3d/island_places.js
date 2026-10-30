// THE FOUR PLACES THAT FILL THE EMPTY LOTS OF THE ISLAND (from the user's photos; src3d/env_town.js puts one on every lot of the beat that was empty, in turn): a FRUIT SHOP, a BEACH CAFE, a POOL TERRACE with a
// riad and a palm, and a ROCKY COVE. Each is one slot (12 m) on the land side, 11 m deep (local x grows away from the road, like the club), built from the photo's own things in the island's low-poly style.
// The fruit shop and the cafe also show their photo (the shop's front; a framed picture on two posts at the far end of the cafe, facing the runner, IslandArt.blade); the photos of the pool and the cove were
// removed at the user's request, so those two places are the 3D scenery only.
//   coastFruit  THE FRUIT SHOP: the photo of the stall (cut along the line the user drew under it) is the front of a small shop under a 'FRUITERIA' board, with the same stall in 3D in front: crates of
//               strawberries, apricots, oranges, cherries, plums and custard apples on a low wooden bench, hand-written price boards, green crates, a striped awning
//   coastCafe   a wooden deck with three tables (a candle and an orange juice on each), black rattan chairs with orange cushions, white parasols, a green flag, and a giant glass of orange juice
//   coastPool   a flagstone terrace round a turquoise pool with a steel ladder, a palm, and a sand-pink riad with a green awning over an arched door, two parasols in the island's swirl pictures
//   coastCove   a sand beach with a blue mattress, a turquoise water, and a cliff of red rock with a cave and an arch, dark rocks in front, a parasol in the island's swirl pictures
const ISLAND_PLACES = (() => {
  const W = '#c9a56a', WD = '#8a6a3c', WL = '#e0b46a', IRON = '#2a2630', WH = '#f4eee0', FRAME = '#6a4a2a', ZE = -5.45;          // ZE: the z of the framed photo, at the far end of the slot
  const frame = (p, x0, x1, y0, y1, z) => {                                                                                    // posts and a wooden frame behind a photo hung at z
    const zb = z - 0.07; p.push(Kit.cyl(0.07, 0.07, y1 - 0.2, x0 + 0.05, 0, z - 0.05, WD, { seg: 6 }), Kit.cyl(0.07, 0.07, y1 - 0.2, x1 - 0.05, 0, z - 0.05, WD, { seg: 6 }),
      Kit.box(x1 - x0 + 0.3, 0.14, 0.12, (x0 + x1) / 2, y0 - 0.12, zb, FRAME), Kit.box(x1 - x0 + 0.3, 0.14, 0.12, (x0 + x1) / 2, y1, zb, FRAME), Kit.box(0.14, y1 - y0 + 0.14, 0.12, x0 - 0.08, y0 - 0.12, zb, FRAME), Kit.box(0.14, y1 - y0 + 0.14, 0.12, x1 + 0.08, y0 - 0.12, zb, FRAME));
  };
  const photo = (cell, p, x0, x1, y0) => { const y1 = y0 + (x1 - x0) / ISLAND_ASSETS[cell].ar; frame(p, x0, x1, y0, y1, ZE); return IslandArt.join([IslandArt.blade(cell, ZE, x0, x1, y0, y1)]); };
  // the frame goes into the parts before they are merged
  const finish = (p, cell, x0, x1, y0, ...para) => {
    const canopies = para.map(([k, z, x = 5.6, R = 2.2]) => ({ sprite: ParasolArt.islandCanopy(k, R, 0.8, 3.4, x, z), material: () => ParasolArt.islandMaterial() }));          // [swirl picture, z, x, radius]
    const sprite = cell ? photo(cell, p, x0, x1, y0) : null, m = { merged: Kit.merge(p) };                                                      // (the frame of the photo goes into the parts before they are merged)
    if (cell) { m.sprite = sprite; m.material = () => IslandArt.material(); m.extra = canopies; }
    else { m.sprite = canopies[0].sprite; m.material = canopies[0].material; m.extra = canopies.slice(1); }                    // (no photo: the textured part is the first parasol; the renderer draws the 3D scenery with a textured part)
    return m;
  };

  // a crate of fruit: a wooden tray, a heap of round fruit (2 rows of 3 and one on top)
  const crate = (p, x, z, col, col2, r) => {
    p.push(Kit.box(1.5, 0.4, 1.1, x, 0.32, z, '#d8aa6a'), Kit.box(1.52, 0.07, 1.12, x, 0.32, z, WD));
    for (let a = 0; a < 2; a++) for (let b = 0; b < 3; b++) p.push(Kit.ico(r, x - 0.3 + a * 0.6 + (rnd(a * 3 + b, 41) - 0.5) * 0.12, 0.76 + (rnd(a * 3 + b, 42)) * 0.05, z - 0.36 + b * 0.36, (a + b) % 2 ? col : col2));
    p.push(Kit.ico(r * 1.05, x, 0.9, z, col));
  };
  // THE FRUIT SHOP: the photo of the stall (only the part above the line the user drew under it, cut out along that line, and reframed as a SQUARE) is the whole FRONT of a small shop, 7.2 m wide and 7.2 m
  // high, under a green name board 'FRUITERIA'; in front of it stands the same stall in 3D (a low wooden bench with crates of strawberries, apricots, oranges, cherries, plums and custard apples,
  // hand-written price boards, green crates) under a striped awning sloping down to the road.
  const SHOP_X = 4.0, SHOP_W = 3.6, SHOP_H = 7.2;                                                                               // the front wall of the shop (x), half the width of the photo, its height
  const fruit = () => {
    const p = [], KINDS = [['#e0262e', '#c91f2a', 0.2], ['#e0262e', '#cf1f2a', 0.2], ['#7a1230', '#9a1a3a', 0.15], ['#f39a2c', '#f0b04a', 0.2], ['#f58a14', '#f6a02c', 0.22], ['#e0262e', '#c91f2a', 0.2],
                   ['#e0262e', '#cf1f2a', 0.2], ['#6a2c5e', '#82386f', 0.2], ['#a9c06f', '#8fae55', 0.27], ['#e0262e', '#c91f2a', 0.2], ['#f0b04a', '#f39a2c', 0.2], ['#f58a14', '#f6a02c', 0.22]];
    // the shop: a dark body behind the photo (it shows through the corner of the photo that is cut away), the front framed by two wooden pilasters, a roof cornice
    p.push(Kit.box(3.6, SHOP_H + 1.1, 2 * SHOP_W + 0.6, SHOP_X + 1.8, 0, 0, '#5a4636'), Kit.box(0.2, SHOP_H, 2 * SHOP_W + 0.2, SHOP_X + 0.1, 0, 0, '#3a2c20'), Kit.box(0.5, 0.18, 2 * SHOP_W + 1.0, SHOP_X + 0.2, SHOP_H + 1.1, 0, '#7a5230'), Kit.box(4.4, 0.35, 2 * SHOP_W + 1.2, SHOP_X + 1.8, SHOP_H + 1.1, 0, '#8a5a3a'));
    for (const z of [-SHOP_W - 0.15, SHOP_W + 0.15]) p.push(Kit.box(0.3, SHOP_H + 1.1, 0.5, SHOP_X + 0.05, 0, z, '#a87447'));
    // the stall in front of the shop, in 3D: the bench, two rows of crates, the boards
    p.push(Kit.box(3.5, 0.32, 8.2, 2.0, 0, 0, '#b4814d'), Kit.box(3.6, 0.05, 8.3, 2.0, 0.32, 0, '#c99a62'));
    for (let z = -3.6; z <= 3.61; z += 1.0) p.push(Kit.box(3.55, 0.02, 0.05, 2.0, 0.375, z, WD));
    for (let r = 0; r < 2; r++) for (let k = 0; k < 6; k++) { const q = KINDS[r * 6 + k]; crate(p, 1.0 + r * 1.9, -3.5 + k * 1.4, q[0], q[1], q[2]); }
    for (const z of [-3.5, -1.4, 0.7, 2.8]) p.push(Kit.cyl(0.02, 0.02, 0.55, 0.25, 0.9, z, IRON, { seg: 4 }), Kit.box(0.04, 0.3, 0.42, 0.25, 1.4, z, '#5a3a2a', { rz: -0.15 }), Kit.box(0.045, 0.22, 0.34, 0.2, 1.44, z, '#f6efe4', { rz: -0.15 }));   // hand-written price boards
    p.push(Kit.box(0.9, 0.35, 1.2, 3.3, 0.32, -4.5, '#2f9a4a'), Kit.box(0.9, 0.35, 1.2, 3.3, 0.67, -4.5, '#27863e'), Kit.box(0.9, 0.35, 1.2, 3.3, 0.32, 4.5, '#2f9a4a'));   // green crates
    for (let k = 0; k < 10; k++) p.push(Kit.box(3.6, 0.08, 0.8, 2.1, 3.5, -3.6 + k * 0.8, k % 2 ? '#f4ece0' : '#d8392b', { rz: 0.16 }));   // the striped awning, from the shop wall down to the road
    for (const z of [-4.1, 4.1]) p.push(Kit.cyl(0.07, 0.07, 3.4, 0.35, 0, z, WD, { seg: 6 }));
    const sprite = IslandArt.join([IslandArt.panel('fruit', SHOP_X - 0.02, -SHOP_W, SHOP_W, 0.04, 0.04 + 2 * SHOP_W / ISLAND_ASSETS.fruit.ar)]);
    return { merged: Kit.merge(p), sprite, material: () => IslandArt.material(), extra: [{ sprite: IslandArt.signPanel(SHOP_X - 0.02, -SHOP_W, SHOP_W, SHOP_H + 0.2, SHOP_H + 1.0), material: () => IslandArt.signMaterial('FRUITERIA') }] };
  };

  const chair = (p, x, z, dir) => {                                                                                            // a black rattan chair with an orange cushion; dir = +1 / -1: which way its back is
    p.push(Kit.box(0.5, 0.42, 0.5, x, 0.3, z, '#2a2e32'), Kit.box(0.52, 0.07, 0.52, x, 0.72, z, '#343a3f'), Kit.box(0.46, 0.05, 0.46, x, 0.79, z, '#f08a24'), Kit.box(0.07, 0.62, 0.52, x + dir * 0.25, 0.79, z, '#2a2e32'));
  };
  const cafe = () => {
    const p = [];
    p.push(Kit.box(6.6, 0.3, 11.2, 3.7, 0, 0, W), Kit.box(6.7, 0.05, 11.3, 3.7, 0.3, 0, '#d8b67c'));                                          // the wooden deck, and the joints of its planks
    for (let z = -5.0; z <= 5.01; z += 1.2) p.push(Kit.box(6.6, 0.02, 0.05, 3.7, 0.355, z, WD));
    [-3.4, 0, 3.4].forEach((z, k) => {
      const x = 3.7;
      p.push(Kit.cyl(0.05, 0.05, 0.8, x, 0.35, z, '#15182a', { seg: 5 }), Kit.cyl(0.62, 0.62, 0.06, x, 1.15, z, '#1b2238', { seg: 10 }), Kit.cyl(0.3, 0.3, 0.04, x, 0.35, z, '#15182a', { seg: 8 }));      // the table
      p.push(Kit.cyl(0.14, 0.14, 0.5, x - 0.1, 1.21, z - 0.2, '#fff3d0', { glow: true, seg: 8 }), Kit.ico(0.09, x - 0.1, 1.78, z - 0.2, '#ffd36a', { glow: true }));                              // the candle
      p.push(Kit.cyl(0.1, 0.07, 0.3, x + 0.25, 1.21, z + 0.2, '#ffa81c', { seg: 8 }), Kit.box(0.03, 0.34, 0.03, x + 0.27, 1.4, z + 0.2, '#ff6fb0', { rz: 0.3 }), Kit.cyl(0.1, 0.1, 0.03, x + 0.14, 1.5, z + 0.28, '#f58a14', { rz: 1.2, seg: 8 }));   // the orange juice, its pink straw and its slice
      chair(p, x - 1.2, z, -1); chair(p, x + 1.2, z, 1);
      if (k !== 1) p.push(Kit.cyl(0.05, 0.05, 3.1, x, 1.2, z, '#e8e2d0', { seg: 5 }), Kit.cone(2.4, 0.8, x, 4.05, z, WH, { seg: 12 }));       // a big white parasol over two of the tables
    });
    p.push(Kit.cyl(0.03, 0.03, 2.6, 0.7, 0.3, -2.0, '#e8e2d0', { seg: 4 }), Kit.box(0.02, 0.45, 0.75, 0.7, 2.4, -1.62, '#7ee62e'));            // the little green flag
    for (let z = -5.2, k = 0; z <= 5.2; z += 0.9, k++) p.push(Kit.box(0.14, 0.14, 0.14, 0.9, 3.1 - 0.25 * Math.sin(Math.PI * (z + 5.2) / 10.4), z, '#ffe2a8', { glow: true }));          // a string of lights
    for (const z of [-5.2, 5.2]) p.push(Kit.cyl(0.07, 0.07, 3.2, 0.9, 0.3, z, WD, { seg: 6 }));
    // the giant glass of orange juice that stands over the cafe: a glass with a handle, the juice, a bent pink straw and a slice of orange on the rim
    p.push(Kit.cyl(0.55, 0.42, 1.9, 5.4, 0.3, 4.6, '#ffae1a', { seg: 10 }), Kit.cyl(0.57, 0.57, 0.12, 5.4, 2.1, 4.6, '#ffd24a', { seg: 10 }), Kit.cyl(0.3, 0.3, 0.14, 5.4, 0.3, 4.6, '#d8e8f0', { seg: 10 }),
      Kit.box(0.5, 0.14, 0.14, 4.8, 1.8, 4.6, '#d8e8f0'), Kit.box(0.14, 1.2, 0.14, 4.57, 0.9, 4.6, '#d8e8f0'), Kit.box(0.5, 0.14, 0.14, 4.8, 0.85, 4.6, '#d8e8f0'),
      Kit.box(0.1, 1.2, 0.1, 5.5, 2.1, 4.5, '#ff6fb0', { rz: -0.25 }), Kit.box(0.5, 0.1, 0.1, 5.82, 3.25, 4.5, '#ff6fb0', { rz: 0.45 }), Kit.cyl(0.5, 0.5, 0.1, 5.1, 2.0, 4.6, '#f58a14', { rx: 1.57, ry: 0.4, seg: 12 }), Kit.cyl(0.4, 0.4, 0.12, 5.1, 2.0, 4.6, '#ffd24a', { rx: 1.57, ry: 0.4, seg: 12 }));
    return finish(p, 'cafe', 0.8, 3.0, 0.9);
  };

  const pool = () => {
    const p = [];
    p.push(Kit.box(11.0, 0.12, 11.4, 5.5, 0, 0, '#8c7a6a'));                                                                                     // the flagstone terrace
    for (let k = 0; k < 18; k++) p.push(Kit.box(1.4 + rnd(k, 51) * 1.2, 0.02, 1.2 + rnd(k, 52) * 1.2, 1.4 + rnd(k, 53) * 8.2, 0.12, -4.6 + rnd(k, 54) * 9.2, k % 2 ? '#9a8776' : '#7c6b5c'));
    p.push(Kit.box(6.6, 0.22, 8.2, 4.0, 0.12, 0.4, '#d8cdb4'), Kit.box(5.8, 0.05, 7.4, 4.0, 0.34, 0.4, '#2fa3c0'), Kit.box(4.0, 0.02, 5.4, 4.1, 0.39, 0.4, '#5fc4d8'));    // the pool: its coping, the water, a lighter patch
    for (const [x, z, w, d] of [[4.0, -3.55, 6.5, 0.2], [4.0, 4.35, 6.5, 0.2], [0.75, 0.4, 0.2, 8.1], [7.25, 0.4, 0.2, 8.1]]) p.push(Kit.box(w, 0.1, d, x, 0.34, z, '#d8cdb4'));          // the lip
    p.push(Kit.box(0.55, 0.05, 8.0, 0.4, 0.12, 0.4, '#a58660'));                                                                                  // the wooden strip along the road side
    for (const z of [1.0, 1.75]) p.push(Kit.cyl(0.03, 0.03, 1.15, 0.95, 0.34, z, '#b8c0c8', { seg: 5 }), Kit.cyl(0.03, 0.03, 1.15, 1.7, 0.34, z, '#b8c0c8', { seg: 5 }), Kit.box(0.8, 0.05, 0.05, 1.32, 1.45, z, '#b8c0c8'));   // the steel ladder
    for (let k = 0; k < 5; k++) p.push(Kit.cyl(0.2 - k * 0.01, 0.25 - k * 0.01, 1.1, 8.4 + 0.12 * k, 0.12 + k * 1.1, 3.4, '#8a6a4a', { seg: 6, rz: -0.07 }));     // the palm: a leaning trunk and its fronds
    for (let a = 0; a < 9; a++) { const t = a * 0.698, cx = 8.9 + Math.cos(t) * 1.0, cz = 3.4 + Math.sin(t) * 1.0; p.push(Kit.box(2.0, 0.06, 0.42, cx, 5.55, cz, a % 2 ? '#3f8a3a' : '#2f6b3a', { rz: -0.5, ry: -t })); }
    p.push(Kit.ico(0.35, 8.9, 5.6, 3.4, '#6a8a3a'));
    p.push(Kit.box(3.6, 5.0, 6.8, 9.3, 0.12, -2.2, '#cf9e86'), Kit.box(3.9, 0.3, 7.1, 9.3, 5.12, -2.2, '#a9785f'), Kit.box(3.7, 0.5, 6.9, 9.3, 3.6, -2.2, '#b98e78'));    // the riad
    p.push(Kit.box(0.14, 2.5, 1.5, 7.43, 0.12, -2.2, '#3a2822'), Kit.cyl(0.75, 0.75, 0.14, 7.43, 2.62, -2.2, '#3a2822', { rz: Math.PI / 2, seg: 10 }), Kit.box(0.9, 0.1, 1.9, 7.1, 3.4, -2.2, '#2d6a3e', { rz: -0.32 }));      // the arched door, the green awning
    for (const z of [-4.6, -0.1]) p.push(Kit.box(0.12, 1.3, 0.9, 7.44, 1.0, z, '#2a2630'), Kit.box(0.14, 1.3, 0.9, 7.42, 3.9, z, '#2a2630'));       // the windows
    for (const z of [-4.2, -0.4]) { p.push(Kit.cyl(0.05, 0.05, 3.3, 5.6, 0.12, z, '#e8e2d0', { seg: 5 }), Kit.cyl(0.45, 0.45, 0.05, 5.6, 0.82, z, '#2a2630', { seg: 8 })); chair(p, 4.6, z, -1); chair(p, 6.6, z, 1); }
    return finish(p, null, 0, 0, 0, [3, -4.2], [1, -0.4]);                                                                                // (two parasols over the tables, in the island's swirl pictures: magenta and teal)
  };

  const rockCol = ['#a9442e', '#8f3626', '#c15a3a', '#b04c33', '#7a2f22'];
  const cove = () => {
    const p = [];
    p.push(Kit.box(5.2, 0.12, 11.4, 2.6, 0, 0, '#d8a870'), Kit.box(1.4, 0.1, 11.4, 5.9, 0, 0, '#b98558'));                                         // the sand, and the wet sand at the water
    p.push(Kit.box(5.6, 0.1, 11.4, 8.8, 0, 0, '#25b3a8'), Kit.box(3.8, 0.02, 9.4, 8.9, 0.1, 0, '#59d2c6'), Kit.box(0.35, 0.04, 11.2, 6.2, 0.1, 0, '#f6f3e6'));      // the turquoise water and its foam
    p.push(Kit.box(1.0, 0.14, 2.0, 3.4, 0.12, 2.4, '#2f9ad8', { ry: 0.2 }), Kit.box(0.9, 0.04, 1.6, 3.7, 0.12, -1.4, '#e8e2d0', { ry: -0.15 }));      // the blue mattress and a towel
    p.push(Kit.ico(3.4, 8.2, 4.0, -2.0, rockCol[0], { sx: 1.2, sy: 1.5, sz: 1.3 }), Kit.ico(2.5, 8.9, 5.8, -3.0, rockCol[1], { sx: 1.1, sy: 1.3 }), Kit.ico(2.3, 6.9, 3.0, -0.6, rockCol[2], { sy: 1.2 }), Kit.ico(2.1, 8.0, 2.0, 2.4, rockCol[3], { sx: 1.2 }),
      Kit.ico(1.8, 9.2, 2.4, 3.6, rockCol[4]), Kit.ico(1.6, 6.6, 1.2, -3.8, rockCol[3]));                                                         // the cliff of red rock
    p.push(Kit.box(0.3, 2.6, 1.7, 6.15, 0.1, 1.9, '#2a1814'), Kit.box(1.8, 0.8, 2.2, 6.9, 2.7, 1.9, '#a54631', { rz: 0.05 }));                       // the cave in its foot, and the lintel of its arch
    for (const [x, y, z, r, c] of [[0.8, 0.45, -4.4, 0.9, '#6b4a3a'], [1.3, 0.4, 3.8, 0.8, '#7a5644'], [0.5, 0.3, 0.9, 0.55, '#6b4a3a'], [1.9, 0.35, -2.6, 0.6, '#7a5644']]) p.push(Kit.ico(r, x, y, z, c, { sy: 0.8 }));   // dark rocks in front
    p.push(Kit.cyl(0.05, 0.05, 3.3, 2.4, 0.12, -2.8, '#e8e2d0', { seg: 5 }));
    return finish(p, null, 0, 0, 0, [2, -2.8, 2.4, 2.4]);                                                                                // a beach parasol on the sand, in the island's swirl pictures (teal on dark green)
  };

  // THE ISLAND'S GIANT PARASOLS (4.8 m in radius, 6.6 m high: half as big again as the coast's): the same pole and the canopy wound from one of the user's nine recoloured swirl pictures (ParasolArt.islandCanopy), coastParasolI0 .. I8
  const giant = k => () => ({ merged: Kit.merge([Kit.cyl(0.09, 0.12, 5.2, 0, 0, 0, '#f4eee0', { seg: 6 }), Kit.cyl(0.34, 0.42, 0.14, 0, 0, 0, '#c8c4b8', { seg: 8 }), Kit.ico(0.2, 0, 6.3, 0, '#f4eee0')]), sprite: ParasolArt.islandCanopy(k, 4.8, 1.8, 4.8), material: () => ParasolArt.islandMaterial() });
  const out = { coastFruit: fruit, coastCafe: cafe, coastPool: pool, coastCove: cove };
  for (let k = 0; k < 9; k++) out['coastParasolI' + k] = giant(k);
  return out;
})();
