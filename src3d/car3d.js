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
  build(o) { return Kit.mesh(Kit.merge(Car3D.parts(o))); },
};
