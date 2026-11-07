// Car3D: the cars of the race zone, modelled in low poly from the user's drawing of the player's car (a dark navy hatchback-coupe with thin blue neon outlines, cyan wheel arches, yellow headlights, a red glow
// under the nose and a blue one under the tail, on a near-black ground). Never put on the road as a picture: built from boxes and cylinders with the shared Kit materials. The car faces -z (the way the runner runs),
// 4 m long, 1.7 m wide, 1.35 m high, its wheels on y = 0. `Car3D.build(opts)` returns a Group; opts.body / opts.glowFront / opts.glowRear recolour it (the opponent car wears other colours).
const Car3D = {
  WR: 0.42,                              // the race car's wheel radius: the wheels stand ON the ground (Kit's cylinders are placed by their foot: the wheels used to float 17 cm up)
  TAIL_TILT: 25 * Math.PI / 180,
  TAIL_ROUND: 0.2,
  TAIL_STRETCH: 1.16,
  TAIL_SQUASH: 0.97,                       // and to 90 % of its height, so its rounded top meets the Porsche-like roof arc                    // the back picture is stretched this much in width (only), to cover the sides of the body                      // how much the end of the body draws in (a quarter circle over the last 10 %): the rounded edges onto the tail          // the back of the race car leans forward this much (its picture and the body behind it)
  parts(o) {
    o = Object.assign({ body: '#1c2468', roof: '#151c58', glass: '#0b1030', line: '#2a3cff', arch: '#35e6ff', head: '#ffe21a', tail: '#ff2a3a', glowFront: '#ff1a3a', glowRear: '#2a3cff' }, o || {});
    const p = [], W = 0.85, wheelZ = [-1.3, 1.25];
    // body: a long low tub, a hood sloping down at the nose, a short boot, the cabin set back with raked glass
    p.push(Kit.box(1.7, 0.55, 3.9, 0, 0.28, 0, o.body));
    p.push(Kit.box(1.6, 0.3, 1.2, 0, 0.6, -1.15, o.body, { rx: -0.16 }));                                         /* the hood */
    p.push(Kit.box(1.62, 0.14, 0.5, 0, 0.5, -1.98, o.body, { rx: 0.2 }));                                          /* the nose */
    p.push(Kit.box(1.6, 0.34, 0.9, 0, 0.62, 1.4, o.body, { rx: 0.1 }));                                             /* the boot */
    p.push(Kit.box(1.5, 0.52, 1.9, 0, 0.82, 0.12, o.glass));                                                        /* the cabin glass */
    p.push(Kit.box(1.52, 0.1, 1.5, 0, 1.3, 0.2, o.roof));                                                           /* the roof */
    p.push(Kit.box(1.48, 0.5, 0.18, 0, 0.86, -0.92, o.glass, { rx: -0.55 }));                                       /* the windscreen, raked */
    p.push(Kit.box(1.48, 0.5, 0.16, 0, 0.86, 1.14, o.glass, { rx: 0.5 }));                                          /* the rear window */
    for (const s of [-1, 1]) p.push(Kit.box(0.06, 0.5, 1.9, s * 0.75, 0.82, 0.12, o.roof));                         /* the pillars along the sides */
    // wheels: black tyres, a cyan ring round each (the arches of the drawing)
    for (const s of [-1, 1]) for (const z of wheelZ) {
      p.push(Kit.cyl(0.38, 0.38, 0.28, s * (W - 0.05), 0.36, z, '#050509', { rz: Math.PI / 2, seg: 12 }));
      p.push(Kit.cyl(0.41, 0.41, 0.04, s * (W + 0.09), 0.36, z, o.arch, { rz: Math.PI / 2, seg: 14, glow: true }));
      p.push(Kit.cyl(0.26, 0.26, 0.07, s * (W + 0.1), 0.36, z, '#050509', { rz: Math.PI / 2, seg: 12 }));
    }
    // the thin neon outlines: a belt line along each side, the roof edges, the windscreen frame
    for (const s of [-1, 1]) {
      p.push(Kit.box(0.04, 0.04, 3.7, s * 0.86, 0.6, 0, o.line, { glow: true }));
      p.push(Kit.box(0.04, 0.04, 1.6, s * 0.76, 1.34, 0.2, o.line, { glow: true }));
    }
    p.push(Kit.box(1.5, 0.04, 0.04, 0, 1.0, -1.15, o.line, { glow: true, rx: -0.55 }));
    // lights: yellow headlights, red tail lights, and the two glows under the car (red at the nose, blue at the tail)
    for (const s of [-1, 1]) { p.push(Kit.box(0.4, 0.14, 0.08, s * 0.6, 0.56, -2.02, o.head, { glow: true })); p.push(Kit.box(0.4, 0.12, 0.08, s * 0.6, 0.62, 1.88, o.tail, { glow: true })); }
    // THE BACK OF THE CAR (the camera of the race is behind it, and none of the user's three pictures shows a rear): built from the user's material picture (a panel of its dark red and black paint with its
    // neon streaks, hung on the tail: `Car3D.rearPanel`) plus the boot lid, a red lamp bar across the tail with a lamp at each end, the number plate, a diffuser with its fins and two exhaust glows.
    p.push(Kit.box(1.66, 0.1, 0.5, 0, 0.88, 1.72, o.body, { rx: -0.08 }));                                                                               // the boot lid, slightly raised at the tail
    p.push(Kit.box(1.7, 0.05, 0.06, 0, 1.0, 1.95, o.line, { glow: true }), Kit.box(0.05, 0.46, 0.06, -0.82, 0.56, 1.95, o.line, { glow: true }), Kit.box(0.05, 0.46, 0.06, 0.82, 0.56, 1.95, o.line, { glow: true }));   // the neon outline of the tail
    p.push(Kit.box(1.5, 0.08, 0.07, 0, 0.5, 1.99, o.tail, { glow: true }));                                                                              // the lamp bar across
    for (const s2 of [-1, 1]) p.push(Kit.box(0.46, 0.18, 0.1, s2 * 0.56, 0.36, 1.98, o.tail, { glow: true }), Kit.box(0.46, 0.05, 0.11, s2 * 0.56, 0.5, 1.98, '#ff9aa6', { glow: true }));   // a lamp at each end, with a lighter top line
    p.push(Kit.box(0.42, 0.13, 0.05, 0, 0.3, 2.0, '#d8d8e8'), Kit.box(0.46, 0.17, 0.03, 0, 0.28, 1.99, '#2a2a38'));                                      // the number plate
    p.push(Kit.box(1.5, 0.3, 0.3, 0, 0.1, 1.86, '#0a0a12'));                                                                                             // the diffuser
    for (let k = 0; k < 5; k++) p.push(Kit.box(0.05, 0.3, 0.32, -0.56 + k * 0.28, 0.1, 1.86, '#15151f'));                                                // its fins
    for (const s2 of [-1, 1]) p.push(Kit.cyl(0.1, 0.1, 0.12, s2 * 0.46, 0.26, 2.0, o.arch, { rz: Math.PI / 2, seg: 8, glow: true }));                    // the two exhausts, lit
    p.push(Kit.box(1.9, 0.04, 1.7, 0, 0.1, -1.0, o.glowFront, { glow: true }));
    p.push(Kit.box(1.9, 0.04, 1.7, 0, 0.1, 1.0, o.glowRear, { glow: true }));
    return p;
  },
  // the panel of the user's material on the tail (and a second, smaller one on the boot lid): a plane facing +z, drawn with the shared race material
  rearPanel() {
    const g = new THREE.BufferGeometry(), q = [];
    const quad = (x0, x1, y0, y1, z, u0, u1, v0, v1) => { const i = q.length / 5; q.push(x0, y0, z, u0, v0, x1, y0, z, u1, v0, x1, y1, z, u1, v1, x0, y1, z, u0, v1); return [i, i + 1, i + 2, i, i + 2, i + 3]; };
    const idx = [].concat(quad(-0.78, 0.78, 0.56, 1.0, 1.97, 0.05, 0.95, 0.3, 0.8));                 // the panel sits on the tail, above the lamps
    const pos = [], uv = []; for (let i = 0; i < q.length; i += 5) { pos.push(q[i], q[i + 1], q[i + 2]); uv.push(q[i + 3], q[i + 4]); }
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeBoundingSphere(); g.computeBoundingBox();
    return g;
  },

  // THE RACE CAR, GENERATED FROM THE USER'S PICTURE OF ITS BACK: the picture itself is the tail (hung as it is by Race3D, never redrawn), and the rest of the car is modelled from what the picture shows —
  // a wide low body in near-black blue, a blue band along the flanks at the height of the rear window, a green line low down continuing the light bar, dark wheels with a faint rim and a magenta glow underneath.
  // `backW` is how wide the body is (the picture is hung wider than that, because its own glow spreads beyond the car).
  fromBack(o) {
    o = Object.assign({ body: '#1a2240', dark: '#04050b', blue: '#1636ff', green: '#2bff3a', rim: '#1b2440' }, o || {});        // (the body a dark slate blue: in the night race a near-black body hid its curves)
    const p = [], W = 2.3, L = 5.0, zT = 2.0, zN = zT - L;                                                                         // (5 m: the user's retouched picture: a longer car; the tail stays where the back picture hangs)
    // THE CURVED BODY (the user: a low, sculpted sports car, not boxes): one smooth shell lofted through cross-sections along the car (Car3D.shell): a low narrower nose, the body rising in a wedge
    // toward the tail, flanks bulging out and tucked in at the foot, and the cabin a narrow smoked-glass greenhouse with a raked windscreen and a long fastback sloping down to the user's tail picture.
    const S = Car3D.shell(o, W, L, zT); p.push(S.part);
    for (const s2 of [-1, 1]) {
      // the blue band of the back and the green line of its light bar, carried along the flanks: now following the curves (the belt line and the foot of the body)
      for (const [line, col, dy, dx] of [[S.belt, o.blue, 0, 0.012], [S.foot, o.green, 0.06, 0.012]]) for (let i = 0; i < line.length - 1; i++) {
        const [z0, y0, a0] = line[i], [z1, y1, a1] = line[i + 1], len = Math.hypot(z1 - z0, y1 - y0, a1 - a0);
        p.push(Kit.box(0.03, 0.03, len + 0.06, s2 * ((a0 + a1) / 2 + dx),        /* (+6 cm of overlap: a continuous line on the curves, not dashes) */ (y0 + y1) / 2 + dy - 0.015, (z0 + z1) / 2, col, { rx: -Math.atan2(y1 - y0, z1 - z0), glow: true }));
      }
      // (the gold trim along the roof was removed at the user's request: 'annule les traits dores')
      // THE METAL BAND (the user raised the cabin by 20 cm and asked for a metal band to fill the gap): a brushed-metal strip 0.18 m tall along each side of the cabin, just above the belt line
      for (let i = 0; i < S.belt.length - 1; i++) { const t0 = i / (S.belt.length - 1); if (t0 < 0.33 || t0 > 0.86) continue; const [z0, y0, a0] = S.belt[i], [z1, y1, a1] = S.belt[i + 1], len = Math.hypot(z1 - z0, y1 - y0);
        p.push(Kit.box(0.03, 0.18, len + 0.04, s2 * ((a0 + a1) / 2 - 0.02), (y0 + y1) / 2 + 0.01, (z0 + z1) / 2, '#8d96ab', { rx: -Math.atan2(y1 - y0, z1 - z0) })); }
      // THE PINK ROOF MOULDING (the user: the pink neon at the top of the back picture carried forward as a line, a moulding, that stops on reaching the windscreen): a thin lit pink line along the edge of
      // the roof on each side, from the top of the windscreen to just before the rounded end, where the picture's own pink line takes over
      for (let i = 0; i < S.side.length - 1; i++) { const ta = S.side[i].t, tb = S.side[i + 1].t; if (tb > 0.9) continue;     /* (from the foot of the windscreen pillar: 'continuer le rose') */ const a0 = S.side[i][s2 < 0 ? 'L' : 'R'][2], a1 = S.side[i + 1][s2 < 0 ? 'L' : 'R'][2], len = Math.hypot(a1[2] - a0[2], a1[1] - a0[1]);
        p.push(Kit.box(0.016, 0.016, len + 0.01, (a0[0] + a1[0]) / 2 + s2 * 0.015, (a0[1] + a1[1]) / 2 + 0.008, (a0[2] + a1[2]) / 2, '#ff3fd0', { rx: -Math.atan2(a1[1] - a0[1], a1[2] - a0[2]), glow: true })); }
      // THE MATTE BLACK FLANK PANEL (the user marked it on both side views): a band of matte black just under the belt line, from the middle of the car to the rear wheel, following the body's curve
      for (let i = 0; i < S.belt.length - 1; i++) { const t0 = i / (S.belt.length - 1); if (t0 < 0.5 || t0 > 0.76) continue; const [z0, y0, a0] = S.belt[i], [z1, y1, a1] = S.belt[i + 1], len = Math.hypot(z1 - z0, y1 - y0);
        p.push(Kit.box(0.03, 0.15, len + 0.01, s2 * ((a0 + a1) / 2 + 0.006), (y0 + y1) / 2 - 0.2, (z0 + z1) / 2, '#050507', { rx: -Math.atan2(y1 - y0, z1 - z0) })); }
      for (const z of [zT - 1.0, zN + 1.2]) p.push(Kit.cyl(0.46, 0.46, 0.04, s2 * (S.half(z) + 0.005), Car3D.WR - 0.02, z, '#020204', { rz: Math.PI / 2, seg: 18 }));   // the dark wheel arch round each wheel
      for (const z of [zT - 1.0, zN + 1.2]) { const hw = S.half(z);                                                              // the wheels (at the body's own width there: the rear haunches are wider)
        p.push(Kit.cyl(Car3D.WR, Car3D.WR, 0.34, s2 * (hw - 0.1), Car3D.WR - 0.17, z, '#07080e', { rz: Math.PI / 2, seg: 14 }));
        p.push(Kit.cyl(0.31, 0.31, 0.05, s2 * (hw + 0.07), Car3D.WR - 0.025, z, '#0d1220', { rz: Math.PI / 2, seg: 14 }));                // a bigger dark rim
        for (let k = 0; k < 5; k++) { const a2 = k * Math.PI * 2 / 5; p.push(Kit.box(0.05, 0.3, 0.07, s2 * (hw + 0.1), Car3D.WR - 0.15 + Math.sin(a2) * 0.15, z + Math.cos(a2) * 0.15, o.rim, { rx: -a2 })); }   // its five spokes
        p.push(Kit.cyl(0.07, 0.07, 0.06, s2 * (hw + 0.12), Car3D.WR - 0.03, z, o.blue, { rz: Math.PI / 2, seg: 8, glow: true }));        // the hub, lit
      }
      // THE FLANKS (the user, with a picture of a sports car seen from the side: 'fabriquer des flancs pareils'): modelled in the spirit of that silhouette, in this car's own colours, not copied from
      // the picture: the long sculpted AIR INTAKE behind the door (a dark recess with a lit edge, rising toward the rear wheel), the BODY LINE that climbs from the front wheel to the top of the intake,
      // the black SIDE SKIRT between the wheels, and the open VENT in front of the rear wheel.
      const sx = s2 * (W / 2 + 0.012);
      p.push(Kit.box(0.05, 0.34, 1.5, sx, 0.52, zT - 2.05, '#020205', { rx: 0.16 }));                                                // the intake: a dark recess, its rear end higher
      p.push(Kit.box(0.055, 0.035, 1.55, s2 * (W / 2 + 0.02), 0.71, zT - 2.05, o.blue, { rx: 0.16, glow: true }));                  // its upper edge, lit
      p.push(Kit.box(0.055, 0.03, 1.2, s2 * (W / 2 + 0.02), 0.36, zT - 2.2, '#2a3550', { rx: 0.06 }));                              // its lower lip
      p.push(Kit.box(0.04, 0.03, 2.0, s2 * (W / 2 + 0.006), 0.66, zN + 1.55, '#2a3550', { rx: -0.1 }));                              // the body line, from the front wheel up to the intake
      p.push(Kit.box(0.08, 0.12, L - 2.3, s2 * (W / 2 + 0.02), 0.08, zT - L / 2 - 0.1, '#03040a'));                                  // the side skirt
      p.push(Kit.box(0.06, 0.24, 0.32, s2 * (W / 2 + 0.015), 0.62, zT - 1.62, '#010103'));                                           // the vent in front of the rear wheel
      p.push(Kit.box(0.065, 0.02, 0.34, s2 * (W / 2 + 0.025), 0.75, zT - 1.62, o.green, { glow: true }));                            // its lit top
    }
    return p;
  },
  // the lofted shell of the race car: cross-sections every few centimetres from the nose (zT - L) to the tail (zT), each a profile from the left foot over the roof to the right foot. Returns the part
  // (smooth normals, per-vertex colours: body, smoked glass on the greenhouse) and the belt and foot lines (z, y, half width) for the neon lines.
  shell(o, W, L, zT) {
    const NZ = 36, sm = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); }, zN = zT - L;
    // THE TAIL MEETS THE USER'S PICTURE OF THE BACK (the user: 'adapter les baguettes avec les baguettes, la vitre avec la vitre, le coffre avec le coffre'): measured on that picture as it hangs at the
    // tail (2.95 m wide, from 0.06 to 1.79 m): its roof at 1.75 m, its rear window nearly vertical from 1.10 to 1.57 m, its belt line at 1.01 m, its boot 0.79 - 1.01 m, its lamp bar 0.44 - 0.72 m, and the
    // car in it about 2.6 m wide. So at the tail the body widens into rear haunches (2.6 m), the belt (and the blue line) rises to 1.01 m, the cabin does not slope away but keeps its height to 1.74 m with
    // its glass coming down VERTICAL onto the picture's window, and the green line climbs to the picture's green lamp bar.
    const half = t => W / 2 * (0.8 + 0.2 * sm(0, 0.2, t)) + 0.15 * sm(0.74, 1, t);                         // narrower nose, wider rear haunches
    // THE FRONT WING (the user: 'defaut de capote': the bonnet was 0.5 m high and the front wheel, 0.88 m tall, came through it): the belt swells into a rounded wing over the front wheel (centred at
    // 1.2 m from the nose), so the bonnet covers it; the line runs on smoothly into the wedge behind.
    const wingT = 1.2 / L, wing = t => 0.3 * Math.exp(-Math.pow((t - wingT) / 0.15, 2));      /* (broader and softer: 'capote pas exacte') */
    const beltY0 = t => Math.max(0.48 + 0.53 * Math.pow(t, 0.75), 0.47 + wing(t)), wingTop = beltY0(wingT);
    // (the user drew a straight line from the top of the front wheel down to the foot of the nose: ahead of the wheel the wing and the bonnet run straight down to 0.3 m at the nose, no flat plank)
    const beltY = t => t >= wingT ? beltY0(t) : 0.3 + (wingTop - 0.3) * Math.pow(t / wingT, 0.85);                                                          // the wedge: low at the nose, rising to the picture's belt line (1.01 m)
    // (the user, twice: 'comme une Porsche': one continuous arc: the roof peaks over the front seats and falls away in a smooth curve to the tail)
    const roofY = t => { const up = sm(0.3, 0.5, t), arc = 1.45 - 0.05 * Math.pow(Math.max(0, (t - 0.52) / 0.48), 1.6);     /* (the front half of the roof lowered: the user saw it standing above the back from behind) */ return arc * up + (beltY(t) + 0.06) * (1 - up); };   // the raked windscreen, then the roof rising gently to the picture's (1.74 m)
    const cabW0 = 0.74, cabW = cabW0;
    const glass = new THREE.Color(o.dark), body = new THREE.Color(o.body), glassTint = new THREE.Color('#0a1430');
    const pos = [], cols = [], belt = [], foot = [], NP = 13;
    for (let i = 0; i <= NZ; i++) {
      const t = i / NZ, z = zN + t * L, a = half(t), hb = beltY(t), hr = Math.max(roofY(t), hb + 0.06), k = sm(0.06, 0.32, hr - hb);   // k: how much of a cabin there is here
      // ONE ARC FROM THE FLANK TO THE TOP (the user, on the back view: 'bombe pour atteindre le haut et le flanc, un arc parfait'): where there is a cabin, its side points sit on a quarter ellipse that
      // starts at the belt on the flank itself (a * 0.94) and rises to the top of the roof, so there is no shoulder ledge: flank and roof are one vault, the same on both sides.
      const cw = cabW0 + 0.14 * sm(0.7, 1, t), X0 = a * 0.94, Htop = hr + 0.07, arcP = phi => [X0 * Math.cos(phi), hb + (Htop - hb) * Math.sin(phi)];
      const A1 = arcP(Math.PI / 6), A2 = arcP(Math.PI / 3);
      const g1x = a * 0.78 * (1 - k) + A1[0] * k, g1y = (hb - 0.01) * (1 - k) + A1[1] * k;      /* (where there is no cabin, the bonnet sits LOWER than the wings, like a Porsche: the wings bulge either side of it) */
      const g2x = a * 0.4 * (1 - k) + A2[0] * k, g2y = (hb - 0.05) * (1 - k) + A2[1] * k;      /* (a rounded roof seen from behind, like a Porsche: the edges of the roof lower, its middle higher) */
      const side = [[a * 0.9, Math.min(0.12, hb * 0.3)], [a * 0.98, Math.min(0.28, hb * 0.6)], [a, Math.min(0.5, hb - 0.03)], [a * 0.94, hb], [g1x, g1y], [g2x, g2y]];      /* (the flank never stands above the belt: near the low nose it used to, above the blue line, 'le capot doit etre aligne avec le trait bleu') */
      const prof = side.map(([x, y]) => [-x, y]).concat([[0, (hr + 0.07) * k + (hb - 0.05) * (1 - k) + 0.02]], side.slice().reverse());
      // THE ROUNDED END (the user, twice: 'courbe', at the top edge between the roof and the tail picture, and at the lower corners between the flanks and it): over the last 14 % of the length the
      // section draws in on a quarter circle, the sides inward and the roof down (toward a point low in the middle), so the body rolls onto the tail instead of ending in sharp edges.
      const fu = Math.max(0, (t - 0.86) / 0.14, (0.07 - t) / 0.07), fil = 1 - Car3D.TAIL_ROUND * (1 - Math.sqrt(Math.max(0, 1 - fu * fu))), FY = 0.2;      /* (and the nose rounded the same way over its first 7 %: not a flat plank) */      /* (the user: 'complete la courbe jusqu'ici': the rounding reaches down the rear corner behind the wheel) */
      const fx = x => x * fil, fyv = y => FY + (y - FY) * fil;
      prof.forEach(([x0, y0], j) => { const x = fx(x0), y = fyv(y0); pos.push(x, y, z); const isGlass = (j === 4 || j === 5 || j === 6 || j === 7 || j === 8) && k > 0.5, c = isGlass ? glass.clone().lerp(glassTint, 0.35) : body; cols.push(c.r, c.g, c.b); });
      belt.push([z, fyv(hb), fx(a * 0.97)]); const fy = 0.14 + 0.44 * sm(0.72, 1, t); foot.push([z, fyv(fy), fx(fy < 0.3 ? a * 0.93 : a * 0.99)]);       // (the green line climbs to the lamp bar at the tail)
    }
    // THE TAIL LEANS FORWARD (the user drew the roof curving down onto the back): the back picture is hung tilted by Car3D.TAIL_TILT about its foot, so nothing of the body may stand behind that slanted
    // plane: every point above the picture's foot is pulled forward onto it. The roof then comes down onto the top of the picture, the flanks follow its slope, the lines stop on it.
    const zMax = y => zT + 0.02 - Math.max(0, y - 0.06) * Math.tan(Car3D.TAIL_TILT);
    for (let i = 0; i < pos.length; i += 3) pos[i + 2] = Math.min(pos[i + 2], zMax(pos[i + 1]) - 0.01);
    for (const ln of [belt, foot]) for (const q of ln) q[0] = Math.min(q[0], zMax(q[1]) - 0.03);
    // the cabin's SIDE WINDOWS (the user: copy the glass of the back picture onto the flanks, under the roof): for each section where there is a cabin, the side rows from the belt (3) through the
    // window's foot (4) to the roof's edge (5), left (j) and right (NP - 1 - j), after the tail's slant. Race3D lays the picture's glass on them.
    const side = [];
    for (let i = 0; i <= NZ; i++) { const t = i / NZ; if (t < 0.34) continue;   /* (from the windscreen: the user's retouch shows the whole side of the cabin in the blue glass) */ const P = j => [pos[(i * NP + j) * 3], pos[(i * NP + j) * 3 + 1], pos[(i * NP + j) * 3 + 2]];
      // (the user drew the glass's rear edge sweeping down to the corner of the lamp bar: toward the tail the foot of the side glass slides down from the belt toward the body's waist)
      const dw = 0,                                                                                 /* (no longer lowered: the user wanted that part filled with the roof's body) */ low = (A, B) => [A[0] + (B[0] - A[0]) * dw, A[1] + (B[1] - A[1]) * dw, A[2] + (B[2] - A[2]) * dw];
      side.push({ t, L: [low(P(3), P(2)), P(4), P(5)], R: [low(P(NP - 4), P(NP - 3)), P(NP - 5), P(NP - 6)] }); }
    const idx = [];
    for (let i = 0; i < NZ; i++) for (let j = 0; j < NP - 1; j++) { const A = i * NP + j, B = A + NP; idx.push(A, B, A + 1, A + 1, B, B + 1); }
    for (const [i, flip] of [[0, true], [NZ, false]]) { const c0 = pos.length / 3; let cx = 0, cy = 0; for (let j = 0; j < NP; j++) { cx += pos[(i * NP + j) * 3]; cy += pos[(i * NP + j) * 3 + 1]; }
      pos.push(cx / NP, cy / NP * 0.7, zN + (i ? L : 0)); cols.push(body.r, body.g, body.b);
      for (let j = 0; j < NP - 1; j++) { const A = i * NP + j; if (flip) idx.push(c0, A + 1, A); else idx.push(c0, A, A + 1); }
      const A0 = i * NP + NP - 1, A1 = i * NP; if (flip) idx.push(c0, A1, A0); else idx.push(c0, A0, A1); }          // (the bottom, closing the profile)
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3)); g.setIndex(idx);
    g.computeVertexNormals(); const ng = g.toNonIndexed(); g.dispose();
    const S = { part: { geo: ng, color: o.body, cols: ng.attributes.color.array }, belt, foot, side, half: z => half((z - zN) / L) }; Car3D.lastShell = S; return S;
  },
  buildFromBack(o) {   /* (see shell and Race3D: the back picture hangs tilted by TAIL_TILT) */ return Kit.mesh(Kit.merge(Car3D.fromBack(o))); },
  build(o) { return Kit.mesh(Kit.merge(Car3D.parts(o))); },
};
