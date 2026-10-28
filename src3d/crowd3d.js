// Crowd3D: the few people of the Gare du Midi platform (Renderer3D owns one, built once and moved every frame like the train, never pooled). Low-poly travellers, 1.0 to 1.8 m tall: chatting
// pairs, a woman with a suitcase, a man with a backpack, a child who waves the train off, and two people walking along the platform. A person is a Group at its feet; the walkers' legs and the
// child's right arm are separate meshes hinged at the hip / shoulder so they can swing. Positions are in metres along the track from the boarding door (`dz`, positive = ahead, the way the
// train leaves) and across the platform (`lat`, the platform spans 7.0 .. 10.6 m from the road's axis; the runner steps onto it near the door, so nobody stands within 4 m of the door).
class Crowd3D {
  constructor(scene) {
    const SK = ['#e2b08a', '#c68a62', '#8d5a3c', '#f0c8a0'], DARK = '#2a2530';
    this.group = new THREE.Group(); this.group.visible = false; this.people = [];
    // one person. o: coat / trousers / skin / hair colours, s = scale, legs: 'fixed' | 'swing', arm: 'fixed' | 'wave', bag: 'case' | 'pack' | null
    const build = o => {
      const p = [Kit.box(0.44, 0.6, 0.26, 0, 0.82, 0, o.coat), Kit.ico(0.14, 0, 1.57, 0, o.skin), Kit.box(0.29, 0.1, 0.3, 0, 1.63, -0.01, o.hair), Kit.box(0.46, 0.08, 0.28, 0, 1.38, 0, o.coat)];     // torso, head, hair, shoulders
      if (o.legs === 'fixed') for (const sx of [-0.1, 0.1]) p.push(Kit.box(0.17, 0.82, 0.2, sx, 0.0, 0, o.trousers), Kit.box(0.18, 0.08, 0.28, sx, 0.0, 0.04, DARK));
      p.push(Kit.box(0.11, 0.56, 0.13, -0.27, 0.84, 0, o.coat), Kit.box(0.1, 0.1, 0.1, -0.27, 0.76, 0, o.skin));                                                                            // the left arm
      if (o.arm === 'fixed') p.push(Kit.box(0.11, 0.56, 0.13, 0.27, 0.84, 0, o.coat), Kit.box(0.1, 0.1, 0.1, 0.27, 0.76, 0, o.skin));
      if (o.bag === 'pack') p.push(Kit.box(0.34, 0.44, 0.16, 0, 0.92, -0.21, o.bagColor), Kit.box(0.3, 0.12, 0.14, 0, 1.2, -0.21, DARK));
      if (o.bag === 'case') p.push(Kit.box(0.42, 0.62, 0.2, 0.46, 0.0, 0.05, o.bagColor), Kit.box(0.04, 0.3, 0.04, 0.46, 0.62, 0.05, DARK));
      const g = new THREE.Group(), body = Kit.mesh(Kit.merge(p)); g.add(body); g.scale.setScalar(o.s || 1);
      const limb = (x, y, parts) => { const j = new THREE.Group(); j.position.set(x, y, 0); j.add(Kit.mesh(Kit.merge(parts))); g.add(j); return j; };
      const person = { g, o, legs: null, arm: null };
      if (o.legs === 'swing') person.legs = [-0.1, 0.1].map(sx => limb(sx, 0.82, [Kit.box(0.17, 0.82, 0.2, 0, -0.82, 0, o.trousers), Kit.box(0.18, 0.08, 0.28, 0, -0.82, 0.04, DARK)]));
      if (o.arm === 'wave') person.arm = limb(0.27, 1.38, [Kit.box(0.11, 0.56, 0.13, 0, -0.56, 0, o.coat), Kit.box(0.1, 0.1, 0.1, 0, -0.62, 0, o.skin)]);
      this.group.add(g); this.people.push(person); return person;
    };
    const add = (o, lat, dz, face, move) => { const p = build(o); p.lat = lat; p.dz0 = dz; p.face = face; p.move = move || 0; return p; };         // move: metres per second along the track (+ ahead)
    // standing: a pair chatting face to face, a woman with a case, a man with a pack, and the child who waves (facing the road, hence the camera)
    add({ coat: '#2f7d8a', trousers: '#3a3a4a', skin: SK[0], hair: '#3a2a22', legs: 'fixed', arm: 'fixed' }, 9.6, 6.2, Math.PI);
    add({ coat: '#8a2f3f', trousers: '#2e2a38', skin: SK[2], hair: '#1e1a1a', legs: 'fixed', arm: 'fixed' }, 9.5, 7.4, 0);
    add({ coat: '#d9a24a', trousers: '#4a3a30', skin: SK[3], hair: '#6a4a2a', legs: 'fixed', arm: 'fixed', bag: 'case', bagColor: '#2f5d8c' }, 9.8, -7.5, Math.PI / 2);
    add({ coat: '#4a5a8a', trousers: '#5a4a3a', skin: SK[1], hair: '#2a2420', legs: 'fixed', arm: 'fixed', bag: 'pack', bagColor: '#b0452a' }, 10.0, 15.5, Math.PI / 2);
    this.waver = add({ coat: '#e0703a', trousers: '#3a4a6a', skin: SK[1], hair: '#2a2420', legs: 'fixed', arm: 'wave', s: 0.62 }, 9.0, 11.6, -Math.PI / 2);
    add({ coat: '#6a8a4a', trousers: '#3a3a4a', skin: SK[0], hair: '#8a6a3a', legs: 'fixed', arm: 'fixed', bag: 'case', bagColor: '#8a2f3f' }, 9.9, 20, Math.PI);
    // walking: one comes from behind along the platform, one comes toward the door from far ahead (neither gets within 4 m of the door while the scene lasts)
    add({ coat: '#3a3a4a', trousers: '#6a5a4a', skin: SK[2], hair: '#1e1a1a', legs: 'swing', arm: 'fixed', bag: 'pack', bagColor: '#2f7d8a' }, 8.3, -28, Math.PI, 1.25);
    add({ coat: '#b24a5a', trousers: '#2e2a38', skin: SK[3], hair: '#5a3a2a', legs: 'swing', arm: 'fixed' }, 8.8, 26, 0, -1.1);
    scene.add(this.group);
  }
  // t: seconds since the walkers started (0 before the scene); wave: the child waves; lx / y / z: where the platform is (lateral shift of the road's axis, height, world z of the boarding door)
  place(lx, y, z, t, wave) {
    for (const p of this.people) {
      const dz = Math.max(-45, Math.min(45, p.dz0 + p.move * t)), walking = p.move !== 0 && t > 0 && Math.abs(p.dz0 + p.move * t) < 45;
      p.g.position.set(p.lat - lx, y + (walking ? Math.abs(Math.sin(t * 7.5)) * 0.03 : 0), z - dz); p.g.rotation.y = p.face;
      if (p.legs) { const a = walking ? 0.55 * Math.sin(t * 7.5) : 0; p.legs[0].rotation.x = a; p.legs[1].rotation.x = -a; }
      if (p.arm) p.arm.rotation.z = wave ? 0.82 * Math.PI + 0.28 * Math.sin(t * 9) : 0.04;
    }
  }
}
