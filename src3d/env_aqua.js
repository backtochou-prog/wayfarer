// THE AQUARIUM TUNNEL: the way to the island goes UNDER THE SEA (src/track.js `tube` of the island junctions `gateIsland*`: the first 900 m of the right branch wear the biome `coastAqua`; from the user's sketch of a trajectory
// "aquarium style, under the sea, toward the island"): a glass tube along the road, held by thick half-ring ribs in the pink-red of the Stargate rings, with thin dark lines running along its vault, and the road
// running away between them. Outside, the sea seen from inside: deep teal water that swallows the distance (a short fog), shoals of fish, a manta ray and a whale shark high above, jellyfish, sea turtles, kelp and coral on the sea bed, columns of bubbles (the creatures drift a little: `live`). It is long (900 m, about 30 s) to play and enjoy.
// The look comes in GRADUALLY with the depth of the road (it dives 13 m over 300 m at each mouth): Renderer3D blends the light and the fog from the coast's own to the deep, Road3D the colours of the road (World.seaK), and the sea life
// only shows where the water is deep enough (`under`). The coast and the island keep their own sunsets.
(() => {
  const mod = (a, n) => ((a % n) + n) % n, RIB = '#ff1a55', INK = '#0b1230', R = 6.9, ARCH = 20, T = 0.36, SLOT = 12;
  // one rib: a half ring (20 straight pieces) standing on the road's edges, a thin dark outline ring beside it, and the dark lines of the vault that run along the slot (the next rib's lines start where these end)
  const rib = () => {
    const p = [];
    for (let k = 0; k < ARCH; k++) {
      const a0 = Math.PI * k / ARCH, a1 = Math.PI * (k + 1) / ARCH, am = (a0 + a1) / 2, len = 2 * (R + 0.1) * Math.sin((a1 - a0) / 2) + 0.07;
      p.push(Kit.box(len, T, T, R * Math.cos(am), R * Math.sin(am) - T / 2, 0, RIB, { rz: am + Math.PI / 2, glow: true }),
             Kit.box(len, 0.1, 0.1, (R + 0.34) * Math.cos(am), (R + 0.34) * Math.sin(am) - 0.05, 0.28, INK, { rz: am + Math.PI / 2 }));
    }
    for (let j = 1; j < 8; j++) { const a = Math.PI * j / 8; p.push(Kit.box(0.09, 0.09, SLOT, (R - 0.12) * Math.cos(a), (R - 0.12) * Math.sin(a) - 0.045, 0, INK)); }
    return Kit.merge(p);
  };
  // a fish swimming toward the runner's way (its head toward -z): a flattened body, a tail and a dorsal fin
  const fish = (x, y, z, s, c1, c2) => [Kit.ico(0.42 * s, x, y, z, c1, { sx: 0.55, sy: 0.85, sz: 1.9 }), Kit.cone(0.3 * s, 0.62 * s, x, y - 0.31 * s, z + 0.98 * s, c2, { rx: -Math.PI / 2, sx: 0.3 }), Kit.cone(0.16 * s, 0.34 * s, x, y + 0.26 * s, z + 0.05 * s, c2, { rz: 0.0, sx: 0.3 })];
  const COL = [['#ff8a2a', '#ffd23a'], ['#ffd23a', '#ff8a2a'], ['#3aa8ff', '#e8f6ff'], ['#e8f6ff', '#3aa8ff'], ['#ff5c88', '#ffd0e0']];
  const shoal = k => () => {
    const p = [], n = 5 + (k % 2);
    for (let f = 0; f < n; f++) { const r = q => rnd(k * 31 + f, q), c = COL[Math.floor(r(1) * COL.length)]; p.push(...fish((r(2) - 0.5) * 5, 1.4 + r(3) * 6.2, (r(4) - 0.5) * 9, 0.6 + r(5) * 0.6, c[0], c[1])); }
    return Kit.merge(p);
  };
  // a manta ray gliding high above the tube: a dark flat body, two wings sloping down, a long thin tail, pale spots
  const ray = () => Kit.merge([Kit.ico(1.3, 0, 9.4, 0, '#2d5876', { sx: 1.1, sy: 0.22, sz: 1.5 }), Kit.box(4.4, 0.12, 2.6, -2.6, 9.35, 0.3, '#2d5876', { rz: 0.12 }), Kit.box(4.4, 0.12, 2.6, 2.6, 9.35, 0.3, '#2d5876', { rz: -0.12 }),
    Kit.cone(0.16, 5.5, 0, 9.4, 4.2, '#2d5876', { rx: Math.PI / 2, sx: 0.7 }), Kit.ico(0.22, -0.5, 9.6, -0.9, '#e8f6ff'), Kit.ico(0.22, 0.5, 9.6, -0.9, '#e8f6ff')]);
  // kelp: tall green ribbons swaying (stacked leaning pieces); coral: branching cones in pink, orange and violet
  const kelp = () => { const p = []; for (let s = 0; s < 3; s++) for (let k = 0; k < 7; k++) p.push(Kit.box(0.34, 0.9, 0.12, s * 0.7 - 0.7 + Math.sin(k * 0.8 + s) * 0.25, k * 0.85, (s - 1) * 0.5, (s + k) % 2 ? '#2e9e5a' : '#1d7a46', { rz: Math.sin(k * 0.8 + s) * 0.18 })); return Kit.merge(p); };
  const coral = () => { const p = [Kit.cyl(1.5, 1.7, 0.4, 0, 0, 0, '#7a6a5a', { seg: 7 })]; ['#ff6a8a', '#ffb347', '#c05cff', '#ff6a8a'].forEach((c, k) => { const a = k * 1.7; p.push(Kit.cone(0.32, 1.5 + k * 0.35, Math.cos(a) * 0.7, 0.3, Math.sin(a) * 0.7, c, { seg: 5, rz: Math.cos(a) * 0.3, rx: Math.sin(a) * 0.3 }), Kit.ico(0.24, Math.cos(a) * 0.7 + Math.cos(a) * 0.4, 1.9 + k * 0.35, Math.sin(a) * 0.7 + Math.sin(a) * 0.4, '#ffe0e8', { glow: true })); }); return Kit.merge(p); };
  const bubbles = () => { const p = []; for (let k = 0; k < 7; k++) p.push(Kit.ico(0.12 + (k % 3) * 0.06, Math.sin(k * 1.9) * 0.4, 0.6 + k * 1.15, Math.cos(k * 1.3) * 0.4, '#bff4ff', { glow: true })); return Kit.merge(p); };
  // a jellyfish drifting: a glowing pink dome with a paler core and long trailing tentacles
  const jelly = () => { const p = [Kit.ico(0.75, 0, 5.2, 0, '#ff9ee0', { sy: 0.62, glow: true }), Kit.ico(0.42, 0, 5.3, 0, '#fff0fa', { sy: 0.7, glow: true })];
    for (let k = 0; k < 7; k++) { const a = k * 0.9; p.push(Kit.box(0.05, 1.7 + (k % 3) * 0.5, 0.05, Math.cos(a) * 0.45, 3.4 - (k % 3) * 0.5, Math.sin(a) * 0.45, k % 2 ? '#ffb3e6' : '#d58cff', { glow: true })); }
    return Kit.merge(p); };
  // a sea turtle: a domed shell with plates, a head and four flippers (its head toward -z, the runner's way)
  const turtle = () => { const p = [Kit.ico(0.9, 0, 4.4, 0, '#3f8f5a', { sx: 1.05, sy: 0.55, sz: 1.4 }), Kit.ico(0.55, 0, 4.6, 0, '#7bc46a', { sx: 1.0, sy: 0.4, sz: 1.2 }), Kit.ico(0.3, 0, 4.4, -1.55, '#9bc87a', { sz: 1.3 })];
    for (const [sx, sz] of [[-1, -0.7], [1, -0.7], [-1, 0.9], [1, 0.9]]) p.push(Kit.box(1.3, 0.1, 0.55, sx * 1.15, 4.3, sz, '#7bc46a', { rz: sx * 0.35, ry: sx * (sz < 0 ? 0.5 : -0.4) }));
    return Kit.merge(p); };
  // a whale shark gliding overhead, the great animal of an aquarium tunnel: a long slate body with pale spots, a dorsal fin and a tall tail
  const whale = () => { const H = 10.3, p = [Kit.ico(1.7, 0, H, 0, '#3b5d7a', { sx: 1.0, sy: 0.85, sz: 4.4 }), Kit.ico(1.05, 0, H - 0.3, 0, '#9fc4d8', { sx: 0.9, sy: 0.5, sz: 4.2 }), Kit.cone(0.9, 2.2, 0, H + 1.3, 1.2, '#3b5d7a', { sx: 0.35 }), Kit.cone(1.0, 3.2, 0, H - 0.7, 7.7, '#3b5d7a', { rx: Math.PI / 2, sx: 0.3 }), Kit.cone(0.7, 1.6, -1.3, H - 0.7, -6.4, '#3b5d7a', { rz: 0.7 })];
    for (let k = 0; k < 14; k++) { const r = q => rnd(k * 7, q); p.push(Kit.ico(0.17 + r(1) * 0.12, (r(2) - 0.5) * 2.2, H + 0.5 + r(3) * 0.9, (r(4) - 0.5) * 9, '#e8f6ff')); }
    return Kit.merge(p); };
  const PROPS = { aquaJelly: jelly, aquaTurtle: turtle, aquaWhale: whale, aquaRib: rib, aquaShoal0: shoal(0), aquaShoal1: shoal(1), aquaShoal2: shoal(2), aquaRay: ray, aquaKelp: kelp, aquaCoral: coral, aquaBubbles: bubbles };
  // THE SEA IS ABOVE: a creature or a plant is only drawn where the sea is deep enough over the road to hold it (Renderer3D `under`, in metres: World.seaDepth at its place must be at least that: the height of the
  // animal above the road plus its drift, for the plants 3.6 m: where the surface of the sea has come in). At the mouths of the tunnel, where the road comes up to the surface, and for a runner who took the coast road
  // (the tunnel beside it is not under the sea for them: nothing dives), nothing of the sea life floats in the air: only the ribs of the tunnel are there.
  const UNDER = { aquaJelly: 6.5, aquaTurtle: 5.9, aquaRay: 10.5, aquaWhale: 12.8, aquaKelp: 3.6, aquaCoral: 3.6, aquaBubbles: 9.5 };
  // every slot: a rib across the road (x = 0: it is drawn once, with the road's own lean); outside (the right side of the island road), kelp, coral, bubbles and a shoal of fish; on the inner side, towards the coast road, a few fish (nothing tall: the coast road's runner must not have it in the way)
  const layout = (i, rnd) => {
    const out = [{ prop: 'aquaRib', x: 0, dist: 6 }], k = i * 2 + 1, r = n => rnd(k, n);
    if (mod(i, 23) === 11) out.push({ prop: 'aquaWhale', x: 0, dist: 6, live: true });                                           // (the creatures drift a little: `live`, Renderer3D)
    else if (mod(i, 7) === 3) out.push({ prop: 'aquaRay', x: 0, dist: 6, live: true });
    // both sides: under the sea the other road of the junction is not seen (Renderer3D `hide`), so the water is all round; seen from the coast road (the other side of the junction) only the fish of the inner side are allowed
    for (const sg of [1, -1]) {
      const q = n => rnd(k + (sg < 0 ? 777 : 0), n), s = n => rnd(k + (sg < 0 ? 777 : 0), n + 20);
      out.push({ prop: 'aquaShoal' + mod(i + (sg < 0 ? 1 : 0), 3), x: sg * (sg < 0 ? 7.4 + q(1) * 6 : 10 + q(1) * 10), dist: 6, live: true });
      if (sg > 0 || mod(i, 4) === 2) { if (mod(i, 3) === (sg > 0 ? 0 : 1)) out.push({ prop: 'aquaKelp', x: sg * (8.2 + q(2) * 2.5), dist: 2 + q(3) * 8 }); }
      if (mod(i, 4) === (sg > 0 ? 1 : 3)) out.push({ prop: 'aquaCoral', x: sg * (8.6 + q(4) * 2), dist: 3 + q(5) * 6 });
      if (mod(i, 5) === (sg > 0 ? 2 : 4)) out.push({ prop: 'aquaBubbles', x: sg * (9 + q(6) * 3), dist: 4 + q(7) * 4 });
      if (mod(i, 6) === (sg > 0 ? 4 : 1)) out.push({ prop: 'aquaJelly', x: sg * (8.5 + q(8) * 9), dist: 3 + q(9) * 6, live: true });
      if (mod(i, 9) === (sg > 0 ? 5 : 8)) out.push({ prop: 'aquaTurtle', x: sg * (9 + q(10) * 7), dist: 6, live: true });
    }
    for (const q of out) { const u = /^aquaShoal/.test(q.prop) ? 8.9 : UNDER[q.prop]; if (u !== undefined) q.under = u; }
    return out;
  };
  // the sea seen from inside: a deep teal that swallows the distance (a short fog), light from above
  ENV3D.coastAqua = Object.assign({}, ENV3D.coastBlue, {
    name: 'AQUARIUM TUNNEL', props: Object.assign({}, ENV3D.coastBlue.props, PROPS), layout, entrance: null, innerOk: new Set(['aquaShoal0', 'aquaShoal1', 'aquaShoal2', 'aquaJelly', 'aquaTurtle', 'aquaBubbles', 'aquaCoral']),
    sky: { top: '#06304f', mid: '#0c5a7c', horizon: '#1b8ca6' }, sunDisc: { color: '#0d5a7a', size: 0.1 }, sunPos: [-10, 40], sunGlow: 0, fog: { color: '#0d5a7a', near: 14, far: 100 },
    hemi: { sky: '#8fe6ff', ground: '#0a3a58', intensity: 1.7 }, sun: { color: '#c4f6ff', intensity: 1.8, position: [-3, 10, -4] }, groundFar: '#0a4c66',
    road: { asphalt: ['#27395c', '#223253'], mark: '#ff7aa0', edge: '#ff1a55', curb: ['#ff1a55', '#e0124a'], curbFace: '#9c0c38', walk: ['#1d4d6c', '#194560'], court: '#1d4d6c', verge: ['#0c4f68', '#0a4760'] },
  });
})();
