// Car3D: the cars of the race zone, modelled in low poly from the user's drawing of the player's car (a dark navy hatchback-coupe with thin blue neon outlines, cyan wheel arches, yellow headlights, a red glow
// under the nose and a blue one under the tail, on a near-black ground). Never put on the road as a picture: built from boxes and cylinders with the shared Kit materials. The car faces -z (the way the runner runs),
// 4 m long, 1.7 m wide, 1.35 m high, its wheels on y = 0. `Car3D.build(opts)` returns a Group; opts.body / opts.glowFront / opts.glowRear recolour it (the opponent car wears other colours).
const Car3D = {
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
    p.push(Kit.box(1.9, 0.04, 1.7, 0, 0.1, -1.0, o.glowFront, { glow: true }));
    p.push(Kit.box(1.9, 0.04, 1.7, 0, 0.1, 1.0, o.glowRear, { glow: true }));
    return p;
  },
  build(o) { return Kit.mesh(Kit.merge(Car3D.parts(o))); },
};
