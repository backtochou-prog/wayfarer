// Perks: the rules of the 3D build's depth layer, with no drawing in it (the HUD is Renderer.drawHud, the 3D effects are Perk3D) so the tests can drive it.
//   - three temporary POWER-UPS: MAGNET (pulls nearby coins), AURA (absorbs exactly one hit, and times out), DASH (a short forward boost; a clean one pays a bonus)
//   - two rarer collectibles: MEMORY SHARDS (a separate saved total) and GOLDEN WAYMARKS (one per fork route, each needs a deliberate jump, slide or lane)
//   - a rotating MISSION (coins, distance, then a shard / near misses / a power-up), run-specific progress, a modest reward, and a saved counter of the missions done
//   - NEAR MISSES (a genuine close pass of a hazard, once per hazard) and a small bonus for passing a whole sequence of hazards cleanly
// Everything advances in Game.step (so a paused game, a cutscene and a game over freeze or end it), and `reset()` starts every run from nothing. Only shards, waymarks per route and the mission
// counters are saved (localStorage 'wayfarer.progress'); effects, run counts and the active mission's progress never are. The classic 2D game has no Perks (Game.pk is null there).
const PERK = {
  magnet: { name: 'MAGNET', dur: 8,    rz: 150, rx: 1.05 },        // pulls coins up to 150 units ahead and 1.05 lanes-units sideways: they glide into the runner within about 0.4 s
  aura:   { name: 'AURA',   dur: 15 },                              // one hit, or 15 s: whichever comes first
  dash:   { name: 'DASH',   dur: 3.5,  boost: 0.32, ramp: 0.3 },   // +32 % forward speed, eased in and out over about 0.3 s; the speed ramp of the run itself is untouched
};
const NEAR = { x: 0.10, y: 5, bonus: 5 };                           // a close pass: less than 0.10 units (0.35 m) beside a hazard, or less than 5 units (0.38 m) above one that was jumped
const REWARD = { mission: 100, shardsPerMission: 1, combo: 20, dashHazard: 10, dashDone: 25, waymark: 50 };
const PICKUPS = { shard: 1, waymark: 1, magnet: 1, aura: 1, dash: 1 };   // the collectible kinds (a lookup table: ordinary coins are handled separately)

class Perks {
  constructor(game) { this.g = game; this.save = Perks.load(); this.reset(); }

  // ---- saved progress: { v: 1, shards, waymarks: { route: n }, missions: { done, idx } }. Anything missing or invalid is replaced by a safe default, field by field.
  static get KEY() { return 'wayfarer.progress'; }
  static defaults() { return { v: 1, shards: 0, waymarks: {}, missions: { done: 0, idx: 0 } }; }
  static int(v, max = 1e9) { v = Number(v); return Number.isFinite(v) ? Math.max(0, Math.min(max, Math.floor(v))) : 0; }
  static clean(o) {
    const d = Perks.defaults(); if (!o || typeof o !== 'object' || Array.isArray(o)) return d;
    d.shards = Perks.int(o.shards);
    if (o.waymarks && typeof o.waymarks === 'object' && !Array.isArray(o.waymarks)) for (const k of Object.keys(o.waymarks).slice(0, 24)) if (/^[A-Za-z0-9]{1,24}$/.test(k)) d.waymarks[k] = Perks.int(o.waymarks[k], 1e6);
    if (o.missions && typeof o.missions === 'object') { d.missions.done = Perks.int(o.missions.done); d.missions.idx = Perks.int(o.missions.idx); }
    return d;
  }
  static load() { try { return Perks.clean(JSON.parse(localStorage.getItem(Perks.KEY))); } catch (e) { return Perks.defaults(); } }
  persist() { try { localStorage.setItem(Perks.KEY, JSON.stringify(this.save)); } catch (e) {} }

  // ---- a new run: nothing carries over except the saved progress
  reset() {
    this.t = { magnet: 0, aura: 0, dash: 0 }; this.tot = { magnet: 1, aura: 1, dash: 1 };    // seconds left, and what the bar is relative to
    this.dashK = 0; this.dashPassed = 0; this.dashClean = true;
    this.shards = 0; this.waymarks = 0; this.nearMisses = 0; this.powerups = 0; this.combos = 0; this.bonus = 0; this.missionsDone = 0; this.rewardShards = 0;
    this.seq = {}; this.xh = [0, 0, 0, 0]; this.xhT = 0;
    this.pops = []; this.flash = 0; this.nextAt = 0; this.mission = null;
    this.mission = this.makeMission();
  }
  onDie() { this.t.magnet = this.t.aura = this.t.dash = 0; this.dashK = 0; this.pops.length = 0; }
  get speedMul() { return 1 + PERK.dash.boost * this.dashK; }
  fire(ev) { const r = this.g.r; if (r.onPerk) r.onPerk(this.g, ev); }
  toast(txt, col) { if (this.pops.length >= 3) this.pops.shift(); this.pops.push({ txt, col, t: 0 }); }

  // ---- every frame of play
  update(dt) {
    for (const k of ['magnet', 'aura', 'dash']) if (this.t[k] > 0) { this.t[k] = Math.max(0, this.t[k] - dt); if (this.t[k] === 0) this.expire(k); }
    this.dashK += ((this.t.dash > 0 ? 1 : 0) - this.dashK) * Math.min(1, dt / PERK.dash.ramp); if (this.t.dash <= 0 && this.dashK < 0.003) this.dashK = 0;
    this.xhT += dt; if (this.xhT >= 0.1) { this.xhT = 0; this.xh.shift(); this.xh.push(this.g.p.x); }                  // where the runner was over the last ~0.4 s (to tell a late dodge from standing beside a hazard)
    for (const q of this.pops) q.t += dt; while (this.pops.length && this.pops[0].t > 1.1) this.pops.shift();
    if (this.flash > 0) this.flash = Math.max(0, this.flash - dt);
    const m = this.mission;
    if (m && !m.done && m.kind === 'distance') this.progress(m, Math.floor((this.g.p.z - m.z0) / 10), true);
    if (m && m.done && this.nextAt > 0) { this.nextAt -= dt; if (this.nextAt <= 0) { this.nextAt = 0; this.mission = this.makeMission(); } }
  }
  expire(k) {
    if (k === 'dash') {                                                                  // a dash that was not cut short by a hit pays for the hazards it went past
      const pay = this.dashPassed * REWARD.dashHazard + (this.dashClean ? REWARD.dashDone : 0);
      if (pay > 0) { this.bonus += pay; this.toast('DASH +' + pay, '#ffb347'); }
      this.dashPassed = 0;
    }
    this.fire({ t: 'expire', kind: k }); this.g.emit('expire');
  }

  // ---- magnet: coins ahead glide toward the runner (called by Game.step while the magnet is on)
  pull(items, dt) {
    const p = this.g.p, top = p.slide > 0 ? 8 : 24, ez = Math.min(1, dt * 7), ex = Math.min(1, dt * 9);
    for (const it of items) {
      if (it.kind !== 'coin' || it.taken) continue;
      const dz = it.z - p.z; if (dz < -20 || dz > PERK.magnet.rz || Math.abs(it.x - p.x) > PERK.magnet.rx) continue;
      it.z += (p.z + 4 - it.z) * ez; it.x += (p.x - it.x) * ex; it.h += (p.jy + top * 0.4 - it.h) * ex; it.offV = -1;
    }
  }

  // ---- picking things up (Game.step found the runner inside the item's box; `taken` is already set, so it is counted once)
  pickup(it) {
    const k = it.kind;
    if (k === 'shard') {
      this.shards++; this.save.shards = Perks.int(this.save.shards + 1); this.persist(); this.ev('shard');
      this.toast('SHARD +1', '#c58bff'); this.g.emit('shard');
    } else if (k === 'waymark') {
      this.waymarks++; this.bonus += REWARD.waymark; const key = String(it.seg || 'route').replace(/B$/, '').replace(/[^A-Za-z0-9]/g, '').slice(0, 24) || 'route';
      this.save.waymarks[key] = Perks.int((this.save.waymarks[key] || 0) + 1, 1e6); this.persist();
      this.toast('WAYMARK +' + REWARD.waymark, '#ffd24a'); this.g.emit('waymark');
    } else {                                                                              // a power-up: starts, or restarts the clock of the same kind (they never stack)
      const P = PERK[k], was = this.t[k] > 0;
      this.t[k] = this.tot[k] = P.dur;
      if (k === 'dash' && !was) { this.dashPassed = 0; this.dashClean = true; }
      this.powerups++; this.ev('power');
      this.toast(P.name + ' ' + P.dur + 'S', k === 'magnet' ? '#ff6a7a' : k === 'aura' ? '#5ff0d0' : '#ffb347'); this.g.emit('perk', k);
    }
    this.fire({ t: 'pickup', kind: k, it });
  }
  // a hit on a hazard (Game.step): the aura takes it and ends; without one the run ends
  absorb(it) {
    if (this.t.aura <= 0) return false;
    this.t.aura = 0; this.dashClean = false; if (it.combo) this.seq[it.combo] = -1;
    it.taken = true;                                                                      // the hazard is destroyed: it cannot hit again on the next frame
    this.fire({ t: 'auraBreak', it }); this.g.emit('auraBreak'); this.toast('AURA BROKEN', '#5ff0d0');
    return true;
  }

  // ---- a hazard reaches the runner's z without a hit: near miss, sequence bonus, dash count. Once per hazard.
  passed(it, o, dx, top) {
    if (it.passed) return; it.passed = true;
    const p = this.g.p, inX = dx < o.hw + P_HW; let near = false;
    if (inX) near = it.kind !== 'over' && p.jy >= o.y1 && p.jy - o.y1 < NEAR.y;           // jumped over it by a hair
    else { const clear = dx - (o.hw + P_HW), heading = Math.abs(this.xh[0] - it.x) < o.hw + P_HW + 0.32;   // squeezed past beside it, having been headed for it
           near = clear < NEAR.x && heading && p.jy < o.y1 && p.jy + top > o.y0; }
    if (near) { this.nearMisses++; this.bonus += NEAR.bonus; this.ev('near'); this.toast('NEAR MISS +' + NEAR.bonus, '#9fe8ff'); this.fire({ t: 'near', it }); this.g.emit('near'); }
    if (this.t.dash > 0) this.dashPassed++;
    if (it.combo && this.seq[it.combo] !== -1) {
      const n = (this.seq[it.combo] || 0) + 1; this.seq[it.combo] = n;
      if (n === it.comboN) { this.combos++; this.bonus += REWARD.combo; this.toast('COMBO +' + REWARD.combo, '#ffe08a'); this.fire({ t: 'combo', it }); this.g.emit('combo'); delete this.seq[it.combo]; }
    }
  }

  // ---- missions. idx counts the missions completed in all runs (saved), so they rotate: coins, distance, then a special one (a shard, near misses, a power-up), each a little harder on every lap of three
  makeMission() {
    const idx = this.save.missions.idx, tier = Math.floor(idx / 3), z0 = this.g.p ? this.g.p.z : 0, ty = idx % 3;
    let m;
    if (ty === 0) m = { kind: 'coins', goal: Math.min(60, 12 + 6 * tier), label: 'COINS' };
    else if (ty === 1) m = { kind: 'distance', goal: Math.min(2000, 400 + 150 * tier), label: 'M' };
    else { const s = tier % 3; m = s === 0 ? { kind: 'shard', goal: 1, label: 'SHARD' } : s === 1 ? { kind: 'near', goal: Math.min(6, 2 + tier), label: 'NEAR MISS' } : { kind: 'power', goal: Math.min(3, 1 + Math.floor(tier / 3)), label: 'POWER-UP' }; }
    m.progress = 0; m.done = false; m.z0 = z0; m.idx = idx; return m;
  }
  progress(m, v, absolute) {
    const nv = Math.min(m.goal, absolute ? Math.max(m.progress, v) : m.progress + v);
    if (nv === m.progress) return; m.progress = nv; if (nv >= m.goal) this.finish(m);
  }
  ev(kind) { const m = this.mission; if (m && !m.done && m.kind === kind) this.progress(m, 1, false); }
  coin() { this.ev('coins'); }
  finish(m) {
    m.done = true; this.missionsDone++; this.bonus += REWARD.mission; this.rewardShards += REWARD.shardsPerMission;
    this.save.shards = Perks.int(this.save.shards + REWARD.shardsPerMission); this.save.missions.done = Perks.int(this.save.missions.done + 1); this.save.missions.idx = Perks.int(this.save.missions.idx + 1);
    this.persist(); this.flash = 2; this.nextAt = 3; this.toast('MISSION +' + REWARD.mission, '#ffe08a');
    this.fire({ t: 'mission' }); this.g.emit('mission');
  }
}
