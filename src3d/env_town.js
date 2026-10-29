// THE COASTAL TOWN: the second half of the beach zone (src/track.js `townSunset` / `townMidday` / `townBlueHour` / `townMorning`, the same light as the coastal piece before it), from the user's painting of a
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
  const TOWN = { coastTower0: () => tower(0), coastTower1: () => tower(1), coastTower2: () => tower(2), coastTower3: () => tower(3), coastRound: round, coastPad: pad };
  // the land side: a tower in nearly every slot, a club every 17th (Delphi, then the Strawberry Beach Club), a flower roundabout (with a giant parasol) every ninth, a landing pad every 23rd; the sea side is the coast's
  const layout = (i, rnd) => {
    const out = coastSea(i, rnd).filter(q => q.x < 0), r = n => rnd(i * 5 + 1, n);
    out.push({ prop: 'coastBike', x: 3.7, dist: 6 });                                                                                          // the bike lane along the road, on every slot
    if (mod(i, 17) === 2) out.push({ prop: 'coastDelphi', x: 5.4, dist: 6 }, { prop: 'tuft', x: 5.0, dist: 2 });            // Club Delphi, now and then: a long building, so in the town, never among the chalets
    else if (mod(i, 17) === 8) out.push({ prop: 'coastClub', x: 5.4, dist: 6 }, { prop: 'tuft', x: 5.0, dist: 2 });       // the Strawberry Beach Club, now and then
    else if (mod(i, 9) === 4) out.push({ prop: 'coastRound', x: 9.8, dist: 6 }, { prop: 'coastParasol', x: 6.6, dist: 3 });
    else if (mod(i, 23) === 11) out.push({ prop: 'coastPad', x: 9.6, dist: 6 });
    else if (mod(i, 7) === 3) out.push({ prop: 'coastPark', x: 7.4, dist: 6 }, { prop: 'tree', x: 11.8, dist: 2.5 }, { prop: 'tree', x: 13.0, dist: 9.5 });     // a green space between the towers
    else if (mod(i, 11) === 6) out.push({ prop: 'coastCourt', x: 7.4, dist: 6 });                                                                         // a sports court
    else if (mod(i, 13) === 9) out.push({ prop: 'coastPlay', x: 7.4, dist: 6 });                                                                          // a youth playground
    else out.push({ prop: 'coastTower' + Math.min(3, Math.floor(r(1) * 4)), x: 7.3 + r(2) * 0.5, dist: 6 });
    return out;
  };
  for (const [id, base, name] of [['coastTown', 'coast', 'SUNSET TOWN'], ['coastTownNoon', 'coastNoon', 'MIDDAY TOWN'], ['coastTownBlue', 'coastBlue', 'BLUE HOUR TOWN'], ['coastTownMorning', 'coastMorning', 'MORNING TOWN']])
    ENV3D[id] = Object.assign({}, ENV3D[base], { name, props: Object.assign({}, ENV3D[base].props, TOWN), layout, entrance: null });
})();
