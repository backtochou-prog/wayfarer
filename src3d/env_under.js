// THE UNDERGROUND (the user, 2026-11-25): what lies below the Central District's lifts. Step 2: the underground ROAD, 250 m of the neon tunnel's own tube (ENV3D.neon.props.neonTunnel0..5: walls,
// ceiling, lights), a pink neon every 40 m, in the neon quarter's atmosphere. Later steps put the underground city after it.
window.ENV3D = window.ENV3D || {};
(function () {
  if (!ENV3D.neon) return;
  const mod = (a, n) => ((a % n) + n) % n;
  ENV3D.under = Object.assign({}, ENV3D.neon, {
    name: 'UNDERGROUND', entrance: null,
    layout(i, rnd) {
      const k = Math.floor(rnd(i, 77) * 6), k0 = Math.floor(rnd(i - 1, 77) * 6), o = [{ prop: 'neonTunnel' + (k === k0 ? (k + 1) % 6 : k), x: 0, dist: 6, solo: true }];
      if (mod(i, 3) === 0) o.push({ prop: 'neonTunnelPink', x: 0, dist: 6.75 });
      return o;
    },
  });
})();
