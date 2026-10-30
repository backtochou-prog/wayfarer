// THE COASTAL TOWN, a small ISLAND beside the coast (src/track.js `islandSunset` / `islandMidday` / `islandBlue` / `islandMorning`: the right branch of the island junction `gateIsland*`, reached by an OPTIONAL passage; the left
// branch goes on along the coast), in the same light as the coastal piece before it, from the user's painting of a
// seaside town: tall painted towers with bold outlines, cream window columns and neon strips along the land side (yellow, red, blue, peach), flower roundabouts with the user's flowers, a turquoise landing
// pad where a dark flying saucer hovers and takes off when the runner comes near (Saucer3D), giant sunburst parasols, and the two clubs (the Strawberry Beach Club, Club Delphi: long buildings like the towers).
// THE LONG BUILDINGS (towers, clubs) ARE SEPARATE FROM THE CHALETS: the cottages of the beach stand only in the coastal piece, the towers and the clubs only in the town. The sea side is the coast's own (the sea, the fence, boats, a lighthouse or a pier).
// Same four lights as the coast: each ENV3D.coastTown* is its coast light (sky, fog, sun, road palette) with this prop set and this layout.
(() => {
  const mod = (a, n) => ((a % n) + n) % n, coastSea = ENV3D.coast.layout;
  // [width along the road, height, body, outline, window columns, neon strip (or null)]
  const SPEC = [[10.5, 22, '#f4c21c', '#d8392b', '#f7e9c6', null], [9.0, 18, '#e0483a', '#1c2a7a', '#f6e7c8', '#ff4fd8'], [11.0, 27, '#1f2f9d', '#f2efe6', '#ffd27a', '#35e6ff'], [8.0, 15, '#f0a07c', '#23297a', '#23297a', '#ff4fd8']];
  // a painted tower: the facade at local x = 0 (facing the road), the body toward +x, centred on z = 0
  const tower = k => {
    const [W, H, body, frame, win, neon] = SPEC[k], D = 8, p = [Kit.box(D, H, W, D / 2, 0, 0, body), Kit.box(D + 0.5, 0.55, W + 0.5, D / 2, H, 0, frame)];                              // the body and a darker cap
    p.push(Kit.box(0.35, H, 0.5, -0.12, 0, -W / 2 + 0.25, frame), Kit.box(0.35, H, 0.5, -0.12, 0, W / 2 - 0.25, frame), Kit.box(0.35, 0.5, W, -0.12, 0, 0, frame));                            // the outline: two edges and a foot
    const n = Math.max(2, Math.floor((W - 1.8) / 1.9)), gap = (W - 1.8) / n, ww = gap * 0.6;
    for (let c = 0; c < n; c++) { const z = -W / 2 + 0.9 + gap * (c + 0.5); p.push(Kit.box(0.16, H * 0.74, ww, -0.06, H * 0.1, z, win), Kit.cyl(ww / 2, ww / 2, 0.16, -0.06, H * 0.84, z, win, { rz: Math.PI / 2, seg: 8 }), Kit.box(0.08, H * 0.74, 0.14, -0.14, H * 0.1, z, frame)); }   // arched window columns
    if (neon) for (const z of (k === 1 ? [-W / 4, W / 4] : [0])) p.push(Kit.box(0.14, H * 0.92, 0.3, -0.2, H * 0.04, z, neon, { glow: true }));                                              // neon strips
    p.push(Kit.box(2.4, 1.2, 2.4, 5, H + 0.55, 1.2, frame), Kit.cyl(0.07, 0.07, 3.2, 5.6, H + 1.75, -1.4, frame, { seg: 4 }));                                                                 // a rooftop box and an antenna
    return Kit.merge(p);
  };
  // a flower roundabout: a cream kerb, soil, a lamp, and the user's flowers (the same ring of patches as round the trees, widened) on top
  const round = () => {
    const R = 3.1, p = [Kit.cyl(R + 0.35, R + 0.4, 0.3, 0, 0, 0, '#f1ead6', { seg: 20 }), Kit.cyl(R, R, 0.34, 0, 0, 0, '#5c4a3a', { seg: 20 }), Kit.cyl(0.07, 0.09, 3.2, 0, 0.3, 0, '#2a2630', { seg: 5 }), Kit.ico(0.28, 0, 3.6, 0, '#ffe2a8', { glow: true })];
    const fl = TreeSprite.flowers(14); fl.translate(0, 0.34, 0);
    return { merged: Kit.merge(p), sprite: fl, material: () => FlowerArt.material() };
  };
  // the landing pad: a turquoise disc with a white rim, a neon ring and a little blue beacon (the saucer hovers over it: Saucer3D)
  const pad = () => Kit.merge([Kit.cyl(3.55, 3.6, 0.1, 0, 0, 0, '#f2efe6', { seg: 18 }), Kit.cyl(3.4, 3.5, 0.18, 0, 0, 0, '#1ee0b0', { seg: 18 }), Kit.cyl(2.7, 2.7, 0.07, 0, 0.18, 0, '#35e6ff', { seg: 18, glow: true }), Kit.cyl(2.5, 2.5, 0.08, 0, 0.19, 0, '#14b890', { seg: 18 }),
    Kit.box(0.8, 0.8, 0.8, 2.6, 0.18, -2.2, '#1f2f9d'), Kit.box(0.5, 0.15, 0.5, 2.6, 1.0, -2.2, '#ffd27a', { glow: true })]);
  // the canal between the island and the coast: a narrow strip of the coast's own sea (same colours as seaStrip) in the gap between the two roads, on the island's inner side (local x grows away from the road)
  const canal = () => {
    const W = 2.8, L = 12.8, p = [Kit.box(W, 0.3, L, W / 2, -0.24, 0, '#2a86c0'), Kit.box(W, 0.02, L, W / 2, 0.05, 0, '#5cc0e6'), Kit.box(0.3, 0.05, L, 0.15, 0.05, 0, '#ffffff'), Kit.box(0.3, 0.05, L, W - 0.15, 0.05, 0, '#ffffff')];
    for (let k = 0; k < 7; k++) p.push(Kit.box(0.28, 0.05, 0.28, 0.6 + rnd(k, 4) * (W - 1.2), 0.08, -5.5 + k * 1.7 + rnd(k, 5) * 1.2, '#fff6d0', { glow: true }));      // scattered glints (not in a row: it must not read as a road marking)
    return Kit.merge(p);
  };
  const TOWN = Object.assign({ coastCanal: canal, coastTower0: () => tower(0), coastTower1: () => tower(1), coastTower2: () => tower(2), coastTower3: () => tower(3), coastRound: round, coastPad: pad }, ISLAND_PLACES);
  // The island is 600 m long (50 slots), so its sights come on a fixed beat of 14 slots (SEG_LEN, 168 m): every 17 slots hold at least one Club Delphi, one Strawberry Beach Club, one flower roundabout with
  // its parasol, one landing pad with its saucer, and the green spaces and grounds between the towers; the two lots of the beat that were empty hold one of the four PLACES of the user's photos in turn
  // (src3d/island_places.js: a fruit stall, a beach cafe, a pool terrace with a riad, a rocky cove, each with its photo in a frame). The land side keeps a bike lane on every slot; the sea side is the coast's own (the sea, the fence, boats),
  // and BEHIND the towers (x = 17 m) the sea comes back, and between the island and the coast road a narrow canal (a channel of the same sea): an island is water all round.
  const BEAT = ['tower', 'delphi', 'tower', 'park', 'round', 'tower', 'tower', 'place', 'club', 'court', 'tower', 'pad', 'play', 'place'], PLACES = ['coastFruit', 'coastCafe', 'coastPool', 'coastCove'], SWIRLS = [0, 5, 1, 7, 2, 4, 3, 6, 8];      // SWIRLS: the nine canopies of the giant parasols in turn, a pinwheel (0..3: red and cream, teal, teal on green, magenta) on every second one
  const layout = (i, rnd) => {
    const out = coastSea(i, rnd).filter(q => q.x < 0), r = n => rnd(i * 5 + 1, n);
    out.push({ prop: 'coastBike', x: 3.7, dist: 6 }, { prop: 'seaStrip', x: 17.0, dist: 6 }, { prop: 'coastCanal', x: -6.9, dist: 6 });                                                   // the bike lane along the road, on every slot; the sea behind the island
    switch (BEAT[mod(i, 14)]) {
      case 'delphi': out.push({ prop: 'coastDelphi', x: 5.4, dist: 6 }, { prop: 'tuft', x: 5.0, dist: 2 }); break;                              // Club Delphi: a long building, so on the island, never among the chalets
      case 'club': out.push({ prop: 'coastClub', x: 5.4, dist: 6 }, { prop: 'tuft', x: 5.0, dist: 2 }); break;                                  // the Strawberry Beach Club
      case 'round': out.push({ prop: 'coastRound', x: 9.8, dist: 6 }, { prop: 'coastParasolI' + SWIRLS[mod(Math.floor(i / 14), 9)], x: 6.6, dist: 3 }); break;                    // the giant parasol over the roundabout: one of the user's nine swirls, never all red (a different one at each roundabout)
      case 'pad': out.push({ prop: 'coastPad', x: 9.6, dist: 6 }); break;
      case 'park': out.push({ prop: 'coastPark', x: 7.4, dist: 6 }, { prop: 'tree', x: 11.8, dist: 2.5 }, { prop: 'tree', x: 13.0, dist: 9.5 }); break;     // a green space between the towers
      case 'place': out.push({ prop: PLACES[mod(Math.floor(i / 14) * 2 + (mod(i, 14) === 13 ? 1 : 0), 4)], x: 5.4, dist: 6 }); break;                                              // the empty lots: the fruit stall, the beach cafe, the pool and the cove, in turn (four neighbouring lots hold all four: an island, 25 lots, shows three or four of them)
      case 'court': out.push({ prop: 'coastCourt', x: 7.4, dist: 6 }); break;                                                                  // a sports court
      case 'play': out.push({ prop: 'coastPlay', x: 7.4, dist: 6 }); break;                                                                    // a youth playground
      default: out.push({ prop: 'coastTower' + Math.min(3, Math.floor(r(1) * 4)), x: 7.3 + r(2) * 0.5, dist: 6 });
    }
    return out;
  };
  for (const [id, base, name] of [['coastTown', 'coast', 'SUNSET TOWN'], ['coastTownNoon', 'coastNoon', 'MIDDAY TOWN'], ['coastTownBlue', 'coastBlue', 'BLUE HOUR TOWN'], ['coastTownMorning', 'coastMorning', 'MORNING TOWN']])
    ENV3D[id] = Object.assign({}, ENV3D[base], { name, props: Object.assign({}, ENV3D[base].props, TOWN), layout, entrance: null, innerOk: new Set([...ENV3D[base].innerOk, 'coastCanal']) });
})();
