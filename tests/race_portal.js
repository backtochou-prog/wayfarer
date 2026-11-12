// WAYFARER regression test (no browser): the kart circuit's optional PARTICLE PORTAL (src/race.js portalStep). In the glass tunnel, in the ship hall, the RIGHT lane runs through an arch at KART.PORT_A
// (laps 4 and 5): the kart collapses (c1), re-appears 56 m down on the 2nd ring of the last floor (e1), runs PORT_D m there (run), collapses at the exit arch (c2) and re-appears in the tunnel (e2).
// The arch is optional (any other lane just goes on), it costs no time (the kart's s goes on as ever), and while away the kart is out of reach of the tunnel's items and karts.
//
// Run:  node tests/race_portal.js
const vm = require('vm'), fs = require('fs'), path = require('path');
vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'src', 'race.js'), 'utf8').replace(/^const /mg, 'var ').replace(/^class (\w+)/mg, 'var $1 = class $1'));
const res = []; const T = (n, ok, i = '') => { res.push(ok); console.log((ok ? 'PASS ' : 'FAIL ') + n + (i !== '' ? '  [' + i + ']' : '')); };
const mk = (lane, seed) => { const R = new Race(seed || 3, { kart: true, len: KART.LEN }); R.cd = 0; R.gateOpen = true; R.t = 60; R.bots.forEach((b, i) => { b.s = 5000 + i * 3; }); R.p.s = KART.PORT_A - 60; R.p.lane = lane; R.p.x = lane * RACE.LANE_M; R.p.speed = 43; return R; };
const run = (R, n, f) => { for (let i = 0; i < n && !R.done; i++) { R.step(1 / 60, { lane: R.p.lane, accel: true }); if (f) f(R); } };

// 1. the right lane takes the arch, the phases run in order, 56 m down, back after PORT_D m
{ const R = mk(1), seen = [], dys = {}, s = {}; let began = false; run(R, 1500, R => { if (R.p.away) began = true; if (began && !R.p.away) R.done = true;      /* (one trip only: the 5th lap has its own arch) */ const a = R.p.away; if (a && seen[seen.length - 1] !== a.ph) { seen.push(a.ph); dys[a.ph] = a.dy; s[a.ph] = Math.round(R.p.s); } });
  T('the right lane takes the portal at PORT_A (' + KART.PORT_A + '): collapse > re-appear 56 m down > run > collapse > back in the tunnel, then it is over', seen.join('>') === 'c1>e1>run>c2>e2' && dys.e1 === KART.PORT_DY && dys.e2 === 0 && R.p.away === null && s.c1 >= KART.PORT_A && s.c1 < KART.PORT_A + 3, JSON.stringify({ seen, dys, s }));
  T('what it skips is PORT_D = ' + KART.PORT_D + ' m of tunnel: the exit arch is where the run ends (s ' + s.c2 + ' - ' + s.c1 + ' = ' + (s.c2 - s.c1) + ' m)', Math.abs((s.c2 - s.c1) - KART.PORT_D) < 5, '') }

// 2. optional: the middle and the left lanes go straight on
for (const lane of [0, -1]) { const R = mk(lane); let hit = false; run(R, 1500, R => { if (R.p.away) hit = true; }); T('lane ' + lane + ' ignores the arch (it is optional)', !hit, ''); }

// 3. no time gained or lost: the kart's s goes on the same, with or without the portal
{ const A = mk(1), B = mk(0); A.items = []; B.items = []; A.bots.forEach(b => { b.s = 100; }); B.bots.forEach(b => { b.s = 100; }); run(A, 900); run(B, 900); T('the portal costs no time: after 15 s the kart that took the arch is as far on as the one that did not (' + A.p.s.toFixed(1) + ' / ' + B.p.s.toFixed(1) + ' m)', Math.abs(A.p.s - B.p.s) < 3, '') }

// 4. while away the kart is out of reach of the tunnel's items and karts
{ const R = mk(1); R.items = [{ type: 'spiral', s: KART.PORT_A + 60, lane: 1, color: 0, taken: false }, { type: 'ring', s: KART.PORT_A + 90, lane: 1, taken: false }]; run(R, 140, null);      // (the kart is away at 60 m past the arch)
  const away = !!R.p.away; R.bots[0].s = R.p.s + 1; R.bots[0].x = R.p.x - 0.1; R.bots[0].lane = 1; const bumps0 = R.p.bumps || 0, sp0 = R.p.spirals; run(R, 90, null);
  T('away on the ring, a spiral and a brake ring of the tunnel are not picked up, and a kart in the way cannot bump it', away && R.items.every(i => !i.taken) && (R.p.bumps || 0) === bumps0 && R.p.spirals === sp0, JSON.stringify({ away, taken: R.items.map(i => i.taken), bumps: R.p.bumps || 0 })) }

// 5. both laps have the arch, and nothing happens before the tunnel
{ const R = mk(1); R.p.s = KART.PORT_A + KART.LAP - 40; R.bots.forEach(b => { b.s = 100; }); let hit = false; run(R, 300, R => { if (R.p.away) hit = true; }); const Q = mk(1); Q.p.s = KART.PORT_A - 3 * KART.LAP - 60; Q.bots.forEach(b => { b.s = 100; }); let early = false; run(Q, 300, R => { if (R.p.away) early = true; });
  T('the 5th lap has its arch too, and the first laps (on the big ring) have none', hit && !early, JSON.stringify({ hit, early })) }
console.log('\n' + res.filter(Boolean).length + '/' + res.length + ' passed'); process.exit(res.every(Boolean) ? 0 : 1);
