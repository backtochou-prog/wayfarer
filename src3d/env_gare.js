// GARE DU MIDI: the end of Saint-Gilles, a station in the same sunset light (the atmosphere is the tram street's: ENV3D.tram with its own name, props and layout). The left of the road
// keeps the street's houses and lamps; the right is the station: a platform with a canopy, the tracks (the train of the cutscene stands there, see Train3D), a brick station flank with arched
// glowing windows behind it, platform lamps, and, as fixed props of the segment (`TRACK.segments.gareMidi.props`), the station hall with its clock tower and name board and, far away, the
// Tour du Midi. Original low-poly buildings in the spirit of Brussels-Midi, not a copy of it. See Game.beginScene for the cutscene that plays here.
window.ENV3D = window.ENV3D || {};

(function () {
  const mod = (a, n) => ((a % n) + n) % n;
  const G = { brick: '#8c5444', brickD: '#6e3e32', stone: '#b8aa90', stoneD: '#8a7e68', slab: '#a29a8a', steel: '#3a4a44', roof: '#4e6a5a', yellow: '#e8c53a', ballast: '#5a5650', rail: '#9aa0a8', warm: '#ffc27a', glass: '#6a7a90', dark: '#16161e' };
  const SLOT = SEG_LEN;

  const platform = () => {                                       // a 12 m piece of platform + canopy + track, local x away from the road: platform 0..3.6 m, track bed 3.9..8.0 (the train's near side is at 4.1)
    const p = [Kit.box(3.6, 0.7, SLOT + 0.2, 1.8, 0, 0, G.slab), Kit.box(0.5, 0.04, SLOT + 0.2, 3.35, 0.7, 0, G.yellow), Kit.box(3.7, 0.08, SLOT + 0.2, 1.8, 0.7, 0, '#8d8576'),
      Kit.box(4.4, 0.2, SLOT + 0.2, 5.9, -0.2, 0, G.ballast), Kit.box(0.1, 0.14, SLOT + 0.2, 4.88, 0.0, 0, G.rail), Kit.box(0.1, 0.14, SLOT + 0.2, 6.32, 0.0, 0, G.rail)];
    for (let k = 0; k < 19; k++) p.push(Kit.box(2.5, 0.08, 0.3, 5.6, -0.02, -SLOT / 2 + 0.3 + k * 0.62, '#3a3430'));        // sleepers
    for (const z of [-3, 3]) p.push(Kit.box(0.22, 4.0, 0.22, 1.0, 0.7, z, G.steel));                                           // canopy posts
    p.push(Kit.box(3.0, 0.16, SLOT + 0.2, 1.7, 4.7, 0, G.roof, { rz: 0.05 }), Kit.box(2.4, 0.05, 9.0, 1.5, 4.55, 0, '#fff0c8', { glow: true }), Kit.box(0.5, 0.3, SLOT + 0.2, 0.2, 4.6, 0, G.steel));   // the canopy and its lights
    p.push(Kit.box(0.5, 0.45, 1.8, 2.4, 0.78, 0.6, '#6a4a2a'), Kit.box(0.08, 0.5, 1.8, 2.7, 1.1, 0.6, '#6a4a2a'));            // a bench
    return Kit.merge(p);
  };
  const flank = (seed) => () => {                                // the brick flank of the station behind the tracks: facade at local x = 0, a row of tall arched windows, a cornice
    const p = [Kit.box(10, 11, SLOT + 0.2, 5, 0, 0, G.brick), Kit.box(10.1, 0.9, SLOT + 0.2, 5, 0, 0, G.stoneD), Kit.box(0.5, 0.4, SLOT + 0.4, -0.15, 10.6, 0, G.stone), Kit.box(0.3, 0.3, SLOT + 0.3, -0.1, 5.4, 0, G.stone)];
    for (const z of [-3.2, 3.2]) { const lit = rnd(seed * 7 + (z > 0 ? 1 : 0), 17) < 0.8; p.push(Kit.box(0.1, 4.0, 2.0, -0.03, 1.8, z, lit ? G.warm : G.dark, { glow: lit }), Kit.box(0.2, 0.3, 2.5, -0.08, 5.8, z, G.stone), Kit.box(0.2, 0.3, 2.5, -0.08, 1.55, z, G.stone), Kit.box(0.18, 4.3, 0.3, -0.07, 1.6, z - 1.2, G.stone), Kit.box(0.18, 4.3, 0.3, -0.07, 1.6, z + 1.2, G.stone)); }
    for (const z of [-3.2, 3.2]) p.push(Kit.box(0.1, 2.0, 1.6, -0.03, 7.4, z, rnd(seed * 5 + z, 18) < 0.5 ? G.warm : G.glass, { glow: false }));
    return Kit.merge(p);
  };
  const platLamp = () => Kit.merge([Kit.box(0.3, 0.3, 0.3, 0, 0.7, 0, G.steel), Kit.cyl(0.07, 0.09, 3.6, 0, 0.7, 0, G.steel), Kit.box(0.7, 0.07, 0.07, -0.35, 4.2, 0, G.steel), Kit.box(0.5, 0.14, 0.3, -0.7, 4.05, 0, '#fff0c8', { glow: true })]);

  // the hall: the station's main building, a fixed prop (facade at local x = 0, 40 m along the track), with the clock tower, the arched glowing windows and the BRUXELLES-MIDI board
  const hall = () => {
    TramArt.material();                                            // (builds the sign atlas: its cells are read below)
    const W = 40, p = [Kit.box(14, 15, W, 7, 0, 0, G.brick), Kit.box(14.1, 1.2, W + 0.1, 7, 0, 0, G.stoneD), Kit.box(0.7, 0.5, W + 0.6, -0.25, 14.6, 0, G.stone), Kit.box(0.4, 0.4, W + 0.4, -0.15, 7.6, 0, G.stone)];
    p.push(Kit.box(11, 23, 20, 5.5, 0, 0, G.brickD), Kit.box(11.1, 1.2, 20.1, 5.5, 0, 0, G.stoneD), Kit.box(0.8, 0.5, 20.8, -0.3, 22.6, 0, G.stone));                                     // the taller central block
    for (let k = 0; k < 5; k++) { const z = -7.6 + k * 3.8; p.push(Kit.box(0.14, 9.0, 2.3, -0.06, 2.6, z, G.warm, { glow: true }), Kit.box(0.26, 0.5, 2.9, -0.1, 11.6, z, G.stone), Kit.box(0.26, 9.4, 0.4, -0.1, 2.4, z - 1.3, G.stone), Kit.box(0.26, 9.4, 0.4, -0.1, 2.4, z + 1.3, G.stone)); }
    for (const z of [-15, -11.5, 11.5, 15]) for (const y of [2.5, 8.2]) p.push(Kit.box(0.1, 2.6, 1.6, -0.03, y, z, rnd(y * 3 + z, 19) < 0.7 ? G.warm : G.glass, { glow: true }), Kit.box(0.2, 0.25, 2.0, -0.07, y + 2.6, z, G.stone));
    p.push(Kit.box(5.2, 14, 5.2, 4.5, 23, 6.5, G.brickD), Kit.box(5.4, 0.8, 5.4, 4.5, 36.4, 6.5, G.stone), Kit.cone(3.9, 4.6, 4.5, 37.2, 6.5, '#3e4a50', { seg: 4, ry: Math.PI / 4 }));                  // the clock tower
    p.push(Kit.cyl(1.9, 1.9, 0.3, 1.45, 31, 6.5, G.stone, { rz: Math.PI / 2, seg: 16 }), Kit.cyl(1.65, 1.65, 0.2, 1.25, 31, 6.5, '#fff6d8', { rz: Math.PI / 2, seg: 16, glow: true }), Kit.box(0.1, 1.3, 0.14, 1.1, 31, 6.5, G.dark), Kit.box(0.1, 0.14, 0.9, 1.1, 31, 6.9, G.dark));
    p.push(Kit.box(3.0, 0.5, 14, -1.5, 5.6, 0, G.steel), Kit.box(3.2, 0.12, 14.2, -1.5, 6.1, 0, '#9fc4d8', { glow: true }));                                                                     // the glass entrance canopy
    const sp = [TramArt.panel('midi', -0.18, -7.5, 7.5, 12.4, 12.4 + 15 / TramArt.cells.midi.ar), TramArt.panel('zuid', -0.18, -6.0, 6.0, 8.8, 8.8 + 12 / TramArt.cells.zuid.ar)];
    return { merged: Kit.merge(p), sprite: TramArt.join(sp), material: () => TramArt.material() };
  };
  const tower = () => { const p = [Kit.box(22, 110, 22, 11, 0, 0, '#5d6e86'), Kit.box(22.4, 3, 22.4, 11, 110, 0, '#46566c'), Kit.cyl(0.3, 0.4, 14, 11, 113, 0, '#9aa0a8', { seg: 5 })];
    for (let k = 0; k < 17; k++) p.push(Kit.box(22.5, 0.5, 22.5, 11, 6 + k * 6, 0, k % 3 === 0 ? G.warm : '#7ea0c0', { glow: true }));
    return Kit.merge(p); };                                       // the Tour du Midi, far away: a tall slab with lit floors

  ENV3D.gare = Object.assign({}, ENV3D.tram, {
    name: 'GARE DU MIDI', entrance: null,
    props: { garePlat: platform, stationFlankA: flank(1), stationFlankB: flank(2), platLamp, gareHall: hall, tourMidi: tower },
    layout(i, rnd) {
      const out = ENV3D.tram.layout(i, rnd).filter(q => q.x < 0 || Math.abs(q.x) < 2 || (q.prop === 'pole'));                // the left of the road (Saint-Gilles) and the wires, as before
      out.push({ prop: 'garePlat', x: 7.0, dist: 6 }, { prop: mod(i, 2) ? 'stationFlankA' : 'stationFlankB', x: 16.8, dist: 6 });
      if (mod(i, 2) === 0) out.push({ prop: 'platLamp', x: 9.2, dist: 3 }); else out.push({ prop: 'platLamp', x: 9.2, dist: 9 });
      return out;
    },
  });
})();
