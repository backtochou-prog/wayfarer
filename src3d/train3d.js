// Train3D: the train of the Gare du Midi cutscene (Renderer3D owns one, built once and moved every frame, never pooled). A low-poly commuter train, 28 m long, three coaches in pale grey with a
// blue band, a glowing window strip, four pairs of sliding doors on the platform side and a cab with a yellow front and two headlamps. The platform side faces -X (the road); local z runs along the
// track with the cab at z = -12 (the train leaves toward -z) and the BOARDING DOOR at z = 0: its two leaves slide apart as `open` goes 0 -> 1 (the doorway then shows a lit interior).
class Train3D {
  constructor(scene) {
    const LIGHT = '#d9dde2', BLUE = '#1d4f91', DARK = '#16161e', GLASS = '#ffe2a8', STEEL = '#8a9099', YEL = '#f2c230';
    const zf = -12, zr = 16, L = zr - zf, zc = (zf + zr) / 2, DOORS = [-7, 0, 6.5, 12.5], p = [];
    p.push(Kit.box(3.0, 0.5, L, 1.5, 0.4, zc, '#2a2d36'), Kit.box(3.0, 2.8, L, 1.5, 0.9, zc, LIGHT), Kit.box(3.04, 0.7, L, 1.5, 1.15, zc, BLUE), Kit.box(2.5, 0.3, L - 0.6, 1.5, 3.7, zc, STEEL), Kit.box(1.2, 0.4, 3.2, 1.5, 4.0, 4, '#aab0b8'), Kit.box(1.2, 0.4, 3.2, 1.5, 4.0, -8, '#aab0b8'));
    for (const z of [-4, 9]) p.push(Kit.box(3.08, 2.8, 0.32, 1.5, 0.85, z, DARK), Kit.box(2.4, 0.1, 0.9, 1.5, 3.55, z, '#3a3f4a'));                                     // the joints between the coaches
    for (let z = -10.2; z < 15.5; z += 2.45) { if (DOORS.some(d => Math.abs(z - d) < 1.9)) continue; p.push(Kit.box(0.06, 0.95, 1.8, -0.02, 2.2, z, GLASS, { glow: true }), Kit.box(0.08, 0.06, 1.95, -0.03, 3.17, z, STEEL), Kit.box(0.08, 0.06, 1.95, -0.03, 2.14, z, STEEL)); }   // the windows
    for (const d of DOORS) {
      p.push(Kit.box(0.14, 2.3, 1.7, -0.04, 0.95, d, DARK), Kit.box(0.2, 0.1, 1.9, -0.06, 3.28, d, STEEL), Kit.box(0.06, 0.18, 0.5, -0.07, 3.35, d, '#7dff9a', { glow: true }));     // the doorway, its frame and a green light above
      if (d !== 0) p.push(Kit.box(0.1, 2.2, 0.78, -0.1, 0.98, d - 0.4, BLUE), Kit.box(0.1, 2.2, 0.78, -0.1, 0.98, d + 0.4, BLUE), Kit.box(0.1, 0.9, 0.5, -0.16, 2.1, d - 0.4, GLASS, { glow: true }), Kit.box(0.1, 0.9, 0.5, -0.16, 2.1, d + 0.4, GLASS, { glow: true }));
    }
    p.push(Kit.box(0.1, 2.0, 1.5, 0.45, 0.98, 0, '#ffd9a0', { glow: true }));                                                                                    // the lit interior behind the boarding door
    p.push(Kit.box(3.04, 0.45, 0.1, 1.5, 0.95, zf - 0.02, YEL), Kit.box(2.5, 1.0, 0.1, 1.5, 2.5, zf - 0.04, '#101820'), Kit.box(0.34, 0.3, 0.1, 0.5, 1.5, zf - 0.06, '#ffffff', { glow: true }), Kit.box(0.34, 0.3, 0.1, 2.5, 1.5, zf - 0.06, '#ffffff', { glow: true }), Kit.box(0.5, 0.2, 0.1, 1.5, 3.3, zf - 0.04, '#ff3a3a', { glow: true }));   // the cab
    for (const z of [-9, -6, 1, 4, 11, 14]) for (const x of [0.4, 2.6]) p.push(Kit.cyl(0.45, 0.45, 0.3, x, 0.0, z, '#1c1c22', { rz: Math.PI / 2, seg: 8 }));
    this.group = new THREE.Group(); this.group.visible = false; this.group.add(Kit.mesh(Kit.merge(p)));
    const leaf = z => { const g = Kit.mesh(Kit.merge([Kit.box(0.1, 2.2, 0.76, -0.1, 0.98, z, BLUE), Kit.box(0.1, 0.9, 0.5, -0.16, 2.1, z, GLASS, { glow: true })])); this.group.add(g); return g; };
    this.leafA = leaf(-0.39); this.leafB = leaf(0.39);
    scene.add(this.group); this.setOpen(0);
  }
  // 0 = closed, 1 = fully open (the leaves slide 0.8 m apart along the car)
  setOpen(k) { this.leafA.position.z = -0.8 * k; this.leafB.position.z = 0.8 * k; this.open = k; }
}
