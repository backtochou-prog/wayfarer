// Props shared by every biome: the two route signposts before a fork (forest / market detour) and the striped marker at the
// tip of the fork. Signs face +Z (toward the oncoming runner) and carry an emblem instead of text: pines for the forest
// road, a terracotta house for the city detour.
window.ENV3D = window.ENV3D || {};

(function () {
  const P = PAL3;
  const board = (rim, face) => [
    Kit.box(0.18, 3.6, 0.18, -1.0, 0, 0, P.lampPost), Kit.box(0.18, 3.6, 0.18, 1.0, 0, 0, P.lampPost),
    Kit.box(2.6, 1.9, 0.16, 0, 2.0, 0, rim), Kit.box(2.3, 1.6, 0.18, 0, 2.15, 0.01, face)];
  ENV3D.common = {
    props: {
      signForest: () => {
        const p = board('#e8a33d', '#1f4a30');
        [[-0.55, 0.55], [0.0, 0.8], [0.55, 0.5]].forEach(([x, s]) => { p.push(Kit.cyl(0.05, 0.07, 0.4, x, 2.2, 0.12, '#6a4a36', { seg: 4 }), Kit.cone(0.38 * s + 0.1, 0.95 * s + 0.3, x, 2.5, 0.12, '#58b060', { seg: 6 })); });
        return Kit.merge(p);
      },
      signMarket: () => {
        const p = board('#e8a33d', '#7e3040');
        p.push(Kit.box(1.1, 0.8, 0.12, 0, 2.2, 0.12, '#c4623f'), Kit.roof(1.35, 0.55, 0.14, 0, 3.0, 0.12, '#a8483a', { ry: 0 }), Kit.box(0.28, 0.45, 0.14, 0, 2.2, 0.2, '#5a3a2a'),
               Kit.box(0.22, 0.22, 0.14, -0.38, 2.6, 0.2, '#ffd27a', { glow: true }), Kit.box(0.22, 0.22, 0.14, 0.38, 2.6, 0.2, '#ffd27a', { glow: true }));
        return Kit.merge(p);
      },
      signCoast: () => {                                                  // a sun over two waves on a teal board
        const p = board('#e8a33d', '#2b7a8c');
        p.push(Kit.cyl(0.4, 0.4, 0.1, 0, 2.55, 0.12, '#ffd27a', { rx: Math.PI / 2, seg: 10, glow: true }), Kit.box(2.0, 0.16, 0.1, 0, 2.28, 0.14, '#9fe0e8'), Kit.box(1.5, 0.14, 0.1, 0.1, 2.06, 0.14, '#e6fbff'), Kit.box(1.8, 0.14, 0.1, -0.1, 1.86, 0.14, '#9fe0e8'));
        return Kit.merge(p);
      },
      signIsland: () => {                                                 // a painted tower (yellow, red outline, cream window columns) over the water, on a blue board
        const p = board('#e8a33d', '#1f2f9d');
        p.push(Kit.box(0.7, 0.95, 0.1, 0, 2.7, 0.12, '#f4c21c'), Kit.box(0.78, 0.09, 0.12, 0, 3.65, 0.13, '#d8392b'), Kit.box(0.08, 0.95, 0.12, -0.37, 2.7, 0.13, '#d8392b'), Kit.box(0.08, 0.95, 0.12, 0.37, 2.7, 0.13, '#d8392b'),
               Kit.box(0.1, 0.7, 0.12, -0.15, 2.8, 0.14, '#f7e9c6'), Kit.box(0.1, 0.7, 0.12, 0.15, 2.8, 0.14, '#f7e9c6'), Kit.box(0.1, 0.5, 0.12, 0, 3.0, 0.15, '#ff4fd8', { glow: true }),
               Kit.box(1.9, 0.16, 0.1, 0, 2.24, 0.14, '#9fe0e8'), Kit.box(1.4, 0.14, 0.1, 0.1, 2.46, 0.14, '#e6fbff'));
        return Kit.merge(p);
      },
      signRuins: () => {                                                  // a stone arch with a glowing green keystone on a dark green board
        const p = board('#9aa690', '#16301f');
        p.push(Kit.box(0.34, 1.3, 0.12, -0.6, 1.75, 0.12, '#a8b09c'), Kit.box(0.34, 1.3, 0.12, 0.6, 1.75, 0.12, '#a8b09c'), Kit.box(1.5, 0.3, 0.12, 0, 3.05, 0.12, '#a8b09c'), Kit.box(0.5, 0.2, 0.12, 0, 2.82, 0.12, '#a8b09c'),
               Kit.box(0.2, 0.2, 0.14, 0, 2.55, 0.16, '#7dffa8', { glow: true }), Kit.box(0.5, 0.12, 0.1, -0.6, 1.1, 0.14, '#5e8a4a'));
        return Kit.merge(p);
      },
      signNeon: () => {                                                   // a neon ring on a black board
        const p = board('#ff2fd0', '#0a0f22');
        p.push(Kit.box(1.5, 0.12, 0.1, 0, 3.0, 0.14, '#ff2fd0', { glow: true }), Kit.box(1.5, 0.12, 0.1, 0, 2.0, 0.14, '#ff2fd0', { glow: true }), Kit.box(0.12, 1.0, 0.1, -0.75, 2.0, 0.14, '#ff2fd0', { glow: true }), Kit.box(0.12, 1.0, 0.1, 0.75, 2.0, 0.14, '#ff2fd0', { glow: true }),
               Kit.box(0.8, 0.14, 0.1, 0, 2.55, 0.16, '#22e0e8', { glow: true }), Kit.box(0.14, 0.6, 0.1, 0, 2.3, 0.16, '#22e0e8', { glow: true }));
        return Kit.merge(p);
      },
      gore: () => {                                                      // striped crash-barrel markers at the tip of the fork
        const p = [Kit.box(0.9, 0.18, 0.9, 0, 0, 0, '#cdb187')];
        for (let k = 0; k < 4; k++) p.push(Kit.cyl(0.38, 0.42, 0.34, 0, 0.18 + k * 0.34, 0, k % 2 ? P.stripeCream : P.stripeRed, { seg: 8 }));
        p.push(Kit.box(0.12, 1.2, 0.12, 0, 1.54, 0, P.lampPost), Kit.box(0.7, 0.4, 0.08, 0, 2.5, 0, '#e8a33d', { glow: true }));
        return Kit.merge(p);
      },
    },
  };
})();
