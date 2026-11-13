// WAYFARER object scan (no browser): looks for objects of the kart circuit that touch or overlap one another, or go out of the road, in the race rules' data (src/race.js): over many seeds it checks the items
// (every lane inside what the fence leaves open, no two items on top of each other, nothing inside the particle portal's arch or the gate's posts, nothing on the dive), and runs the race with the robot karts to
// count the frames in which a kart is outside the track, through the fence, or inside another kart. Prints what it finds; exits non-zero when something is wrong (a regression guard once the list is empty).
//
// Run:  node tests/scan_objects.js
const vm = require('vm'), fs = require('fs'), path = require('path');
vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'src', 'race.js'), 'utf8').replace(/^const /mg, 'var ').replace(/^class (\w+)/mg, 'var $1 = class $1'));
const bad = {}; const note = (k, d) => { (bad[k] = bad[k] || []).push(d); };
const KARTLEN = 4.6, KARTW = 2.0;
for (let seed = 1; seed <= 30; seed++) {
  const R = new Race(seed, { kart: true, len: KART.LEN }), it = R.items;
  for (const a of it) {
    if (a.lane < -1 || a.lane > 1) note('item outside the three lanes', `seed ${seed} s ${Math.round(a.s)} lane ${a.lane}`);
    if (a.s > KART.FUNNEL && a.s < KART.GATE_S + 60 && a.lane > R.maxLane(a.s)) note('item under the closing fence (lane beyond maxLane)', `seed ${seed} s ${Math.round(a.s)} lane ${a.lane} max ${R.maxLane(a.s)}`);
    if (a.s > KART.GATE_S - 40 && a.s < KART.GATE_S + 60 && a.type !== 'spiral') note('item in the gate / the dive (not a spiral)', `seed ${seed} ${a.type} s ${Math.round(a.s)}`);
    for (let k = 0; k < 2; k++) { const sA = KART.PORT_A + k * KART.LAP; if (a.lane === 1 && Math.abs(a.s - sA) < 4) note('item inside the portal arch (right lane)', `seed ${seed} ${a.type} s ${Math.round(a.s)} arch ${sA}`); }
  }
  const sorted = it.filter(a => a.type !== 'droid').slice().sort((a, b) => a.s - b.s);
  for (let i = 0; i < sorted.length; i++) for (let j = i + 1; j < sorted.length && sorted[j].s - sorted[i].s < 3; j++) if (sorted[i].lane === sorted[j].lane) note('two items on top of each other (same lane, less than 3 m apart)', `seed ${seed} ${sorted[i].type}+${sorted[j].type} s ${Math.round(sorted[i].s)} lane ${sorted[i].lane}`);
}
// the race: robot karts against the fence and against each other
for (const seed of [1, 2, 3, 4, 5, 6]) {
  const R = new Race(seed, { kart: true, len: KART.LEN }); R.cd = 0; R.gateOpen = true; let outside = 0, fence = 0, overlap = 0, frames = 0; const ex = {};
  for (let i = 0; i < 9000 && !R.done; i++) {
    R.step(1 / 60, { lane: R.p.lane, accel: true }); frames++; if (R.p.away) continue;
    for (const b of R.bots) {
      const xw = b.x;
      if (Math.abs(xw) > 2.4 + 1.0 + 0.01) { outside++; ex.outside = ex.outside || `seed ${seed} s ${Math.round(b.s)} x ${xw.toFixed(1)}`; }
      if (b.s > KART.FUNNEL - 20 && b.s < KART.GATE_S && xw + 0.9 > KART.fence(b.s) + 0.1) { fence++;      /* (touching the fence exactly is how the lanes are laid out - maxLane keeps the kart's side on it - only going past it counts) */ ex.fence = ex.fence || `seed ${seed} s ${Math.round(b.s)} x ${xw.toFixed(1)} fence ${KART.fence(b.s).toFixed(1)}`; }
    }
    const all = R.bots.concat([{ s: R.p.s, x: R.p.x, player: true }]);
    for (let a = 0; a < all.length; a++) for (let c = a + 1; c < all.length; c++) { const A = all[a], B = all[c]; if ((A.player || B.player)) continue; if (Math.abs(A.s - B.s) < KARTLEN * 0.7 && Math.abs(A.x - B.x) < KARTW * 0.8) { overlap++;      /* (robot karts only: the player's kart passes beside another on purpose - no side bumps, the user) */ ex.overlap = ex.overlap || `seed ${seed} s ${Math.round(A.s)} ${A.player || B.player ? 'with the player' : 'robots'}`; } }
  }
  if (outside) note('a robot kart outside the track (|x| > 3.4)', `${outside} frames, e.g. ${ex.outside}`);
  if (fence) note('a robot kart through the closing fence', `${fence} frames, e.g. ${ex.fence}`);
  if (overlap) note('two karts inside each other (less than 70 % of a kart length and 80 % of its width apart)', `${overlap} frames in ${frames}, e.g. ${ex.overlap}`);
}
const keys = Object.keys(bad);
if (!keys.length) console.log('PASS no object touches another or goes out of the road, in 30 seeds of items and 6 races');
for (const k of keys) console.log('FOUND ' + k + ': ' + bad[k].length + ' (e.g. ' + bad[k].slice(0, 3).join(' | ') + ')');
process.exit(keys.length ? 1 : 0);
