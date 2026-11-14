// WAYFARER regression test (no browser): the kart circuit's optional PARTICLE PORTAL and RING TOUR (src/race.js portalStep / awayStep). In the glass tunnel, in the ship hall, the RIGHT lane runs through an arch at
// KART.PORT_A (laps 4 and 5). The kart (as the user's strawberry pod) is sent to the first CARBON ring, drives one FULL LAP round it, is sucked through the neon portal at the lap line onto the next ring, and so on
// through the three rings; after the last lap it is sucked back into the tunnel. The arch is optional (any other lane just goes on) and THE RACE STANDS STILL meanwhile (the other karts, the clock, the kart's own s).
//
// Run:  node tests/race_portal.js
const vm = require('vm'), fs = require('fs'), path = require('path');
vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'src', 'race.js'), 'utf8').replace(/^const /mg, 'var ').replace(/^class (\w+)/mg, 'var $1 = class $1'));
const res = []; const T = (n, ok, i = '') => { res.push(ok); console.log((ok ? 'PASS ' : 'FAIL ') + n + (i !== '' ? '  [' + i + ']' : '')); };
const mk = (lane, seed) => { const R = new Race(seed || 3, { kart: true, len: KART.LEN }); R.cd = 0; R.gateOpen = true; R.t = 60; R.bots.forEach((b, i) => { b.s = 5000 + i * 3; }); R.p.s = KART.PORT_A - 60; R.p.lane = lane; R.p.x = lane * RACE.LANE_M; R.p.speed = 43; return R; };
const run = (R, n, f) => { for (let i = 0; i < n && !R.done; i++) { R.step(1 / 60, { lane: R.p.lane, accel: false }); if (f) f(R); } };

// 1. the right lane takes the arch: collapse > expand on ring 0 > lap > collapse > expand on ring 1 > lap > ... > collapse > expand in the tunnel
{ const R = mk(1), seq = [], laps = [], bots0 = R.bots.map(b => b.s); let began = false, sFrozen = null, tFrozen = null, botsMoved = false, sMoved = false, tMoved = false, steps = 0;
  run(R, 20000, R => { const A = R.p.away; if (A && A.k === 3) A.id = true; if (A) { began = true; steps++; if (seq[seq.length - 1] !== A.ph + (A.k >= 0 ? A.k : '')) seq.push(A.ph + (A.k >= 0 ? A.k : '')); if (A.ph === 'c1' && sFrozen === null) { sFrozen = R.p.s; tFrozen = R.t; } if (A.ph === 'ring' && A.th > 0) laps[A.k] = A.th; if (R.p.s !== sFrozen) sMoved = true; if (R.t !== tFrozen) tMoved = true; if (R.bots.some((b, i) => b.s !== bots0[i] + (b.s - bots0[i]) && false)) botsMoved = true; } if (began && !A) R.done = true; });
  T('the right lane takes the arch at PORT_A (' + KART.PORT_A + '): c1 > e1 (ring 0) > ring 0 > c2 > e2 ... ring 3 (the last floor, round the flower) > fl (floats up the anti-gravity column) > cE > eE (tunnel), then it is over', seq.join('>') === 'c10>e10>ring0>c20>e21>ring1>c21>e22>ring2>c22>e23>ring3>fl3>cE3>eE' && R.p.away === null, seq.join('>'));
  T('each ring gets one FULL lap (the angle goes to 2 pi on all four rings: ' + laps.map(v => v.toFixed(2)).join(' / ') + ')', laps.length === 4 && laps.every(v => v > 6.0), '');
  T('the race stands still on the rings: the kart\'s s (' + sFrozen + ') and the clock do not move, and afterwards the kart is back at the arch', !sMoved && !tMoved && Math.abs(R.p.s - sFrozen) < 0.001, JSON.stringify({ sMoved, tMoved, s: R.p.s, sFrozen }));
  const secs = steps / 60; const exp = KART.PORT_RINGS.reduce((a, r) => a + 2 * Math.PI * (KART.R + r.x) / RACE.BASE, 0) + 8 * 0.45 + (KART.FLOAT ? KART.FLOAT_T : 0);
  T('the tour is the four laps round the rings at the kart\'s own pace: ' + secs.toFixed(0) + ' s (expected about ' + exp.toFixed(0) + ' s)', Math.abs(secs - exp) < 12, '') }

// 2. the other karts do not move while the kart is away
{ const R = mk(1); let moved = false, before = null; run(R, 20000, R => { const A = R.p.away; if (A && A.ph === 'ring' && before === null) before = R.bots.map(b => b.s); if (A && A.ph === 'ring' && R.bots.some((b, i) => b.s !== before[i])) moved = true; if (before && !A) R.done = true; });
  T('the other karts stand still on the rings tour (the race is paused, not lost)', before !== null && !moved, '') }

// 3. optional: the middle and the left lanes go straight on
for (const lane of [0, -1]) { const R = mk(lane); let hit = false; run(R, 1500, R => { if (R.p.away) hit = true; }); T('lane ' + lane + ' ignores the arch (it is optional)', !hit, ''); }

// 4. afterwards the race goes on: the kart drives on from the arch and the others move again
{ const R = mk(1); let began = false, done = false; run(R, 20000, R => { if (R.p.away) began = true; if (began && !R.p.away) done = true; if (done) R.done = true; }); R.done = false; const s0 = R.p.s, b0 = R.bots[0].s; run(R, 120, null);
  T('after the tour the race goes on from the arch (the kart +' + (R.p.s - s0).toFixed(0) + ' m, a robot +' + (R.bots[0].s - b0).toFixed(0) + ' m in 2 s)', R.p.s - s0 > 60 && R.bots[0].s - b0 > 30, '') }

// 5. both laps have the arch, and nothing happens before the tunnel
{ const R = mk(1); R.p.s = KART.PORT_A + KART.LAP - 40; R.bots.forEach(b => { b.s = 100; }); let hit = false; run(R, 300, R => { if (R.p.away) hit = true; }); const Q = mk(1); Q.p.s = KART.PORT_A - 3 * KART.LAP - 60; Q.bots.forEach(b => { b.s = 100; }); let early = false; run(Q, 300, R => { if (R.p.away) early = true; });
  T('the 5th lap has its arch too, and the first laps (on the big ring) have none', hit && !early, JSON.stringify({ hit, early })) }
// 6. the anti-gravity flower: after the last ring the pod floats (KART.FLOAT_T s, f 0..1, the race still frozen); too short a lap (the field has not come up) or KART.FLOAT = false skips it
{ const R = mk(1); let fl = 0, fmax = 0, sMoved = false, s0 = null, ok = true, last = -1; let began = false; run(R, 20000, R => { const A = R.p.away; if (A && A.k === 3) A.id = true; if (A) began = true; if (began && !A) R.done = true; if (A && A.ph === 'fl') { fl++; fmax = Math.max(fmax, A.f); if (s0 === null) s0 = R.p.s; if (R.p.s !== s0) sMoved = true; if (A.f < last) ok = false; last = A.f; } });
  T('the float: ' + (fl / 60).toFixed(1) + ' s (FLOAT_T ' + KART.FLOAT_T + '), f rises 0 > 1 monotonically, the race stands still', Math.abs(fl / 60 - KART.FLOAT_T) < 0.3 && fmax > 0.99 && ok && !sMoved, JSON.stringify({ fl, fmax, ok, sMoved })); }
{ const R = mk(1); let fl = false; KART.FLOAT_NEED = 1e9; run(R, 20000, R => { if (R.p.away && R.p.away.k === 3) R.p.away.id = true; if (R.p.away && R.p.away.ph === 'fl') fl = true; }); KART.FLOAT_NEED = 14; T('without the 14 s of field build-up there is no float (the tour goes straight to the exit)', !fl, ''); }
{ const R = mk(1); let fl = false; KART.FLOAT = false; run(R, 20000, R => { if (R.p.away && R.p.away.k === 3) R.p.away.id = true; if (R.p.away && R.p.away.ph === 'fl') fl = true; }); KART.FLOAT = true; T('KART.FLOAT = false switches the float off', !fl, ''); }
// 7. the identification: not identified -> access denied (the 'deny' phase DENY_T s, no float, the tour ends); identified late (during the deny phase) -> the field opens; KART.IDENT = false skips the check
{ const R = mk(1); let seq = [], dn = 0, fl = 0, began = false; run(R, 20000, R => { const A = R.p.away; if (A) began = true; if (began && !A) R.done = true; if (A && A.ph === 'deny') dn++; if (A && A.ph === 'fl') fl++; });
  T('not identified: access denied for ' + (dn / 60).toFixed(1) + ' s (DENY_T ' + KART.DENY_T + '), no float, the tour then ends', Math.abs(dn / 60 - KART.DENY_T) < 0.2 && fl === 0 && R.p.away === null, JSON.stringify({ dn, fl })); }
{ const R = mk(1); let fl = 0, began = false, late = false; run(R, 20000, R => { const A = R.p.away; if (A) began = true; if (began && !A) R.done = true; if (A && A.ph === 'deny' && A.t > 1) { A.id = true; late = true; } if (A && A.ph === 'fl') fl++; });
  T('identified during the deny phase: the field opens after all', late && fl > KART.FLOAT_T * 60 - 20, JSON.stringify({ late, fl })); }
{ const R = mk(1); KART.IDENT = false; let fl = 0, began = false; run(R, 20000, R => { const A = R.p.away; if (A) began = true; if (began && !A) R.done = true; if (A && A.ph === 'fl') fl++; }); KART.IDENT = true; T('KART.IDENT = false: no identification needed, the float happens', fl > KART.FLOAT_T * 60 - 20, String(fl)); }
console.log('\n' + res.filter(Boolean).length + '/' + res.length + ' passed'); process.exit(res.every(Boolean) ? 0 : 1);
