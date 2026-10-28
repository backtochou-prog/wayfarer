// GameAudio: all the game's sound. Two parts:
//  - MUSIC: the user's track (assets/music.mp3, played by an <audio> element, looped) plus a precomputed beat map (MUSIC_BEATS) that gives the animation a beat clock
//    (`beat()`), read from the audio's currentTime; with no audio yet (browsers only allow sound after a first tap / key press) the same clock runs from the page time at the same
//    tempo, so the menu already moves in time.
//    A SECOND track (assets/music_coast.mp3, MUSIC_BEATS_COAST) belongs to the Sunset Coast: it crossfades with the main one as the road enters and leaves the coast (the weight is the
//    game's biome blend, g.bgTo === 'coast' ? g.bgT : 0), starts from its beginning on every entry, and the beat clock follows whichever track is louder.
//  - EFFECTS: short sounds synthesised with the Web Audio API (no sound files): jump, land, slide, coin (the pitch climbs with a streak), crash, game-over, fork prompt / choice,
//    start, pause / resume. Every voice is a pure function of (ctx, out, time, arg), so tests can render them offline.
// Sound is allowed from the first user gesture; M toggles mute (remembered); the game pauses it with the tab. The Game just calls `g.sfx.play(name)` where things happen and
// `g.sfx.tick(g, dt)` once per frame. Without a GameAudio (the 2D page) nothing changes.
class GameAudio {
  constructor(opts = {}) {
    this.src = opts.src || 'assets/music.mp3'; this.srcCoast = opts.srcCoast || 'assets/music_coast.mp3';
    this.beats = opts.beats || (typeof MUSIC_BEATS !== 'undefined' ? MUSIC_BEATS : null);
    this.beatsCoast = opts.beatsCoast || (typeof MUSIC_BEATS_COAST !== 'undefined' ? MUSIC_BEATS_COAST : null); this.coastW = 0;      // coastW: 0..1, how much of the coast track is heard
    this.counts = {};                       // how many times each effect was requested (also while muted / locked: tests and the HUD can read it)
    this.muted = false; try { this.muted = localStorage.getItem('wayfarer.sound') === '0'; } catch (e) {}
    this.ctx = null; this.master = null; this.unlocked = false; this.active = 0; this.nodesMade = 0;
    this.musicVol = 0; this.sceneOut = 0; this.streak = 0; this.streakT = -9; this.lastState = ''; this.clock = 0; this.b = { t: 0, beat: 0, phase: 0, pulse: 0, energy: 0, kick: 0, playing: false };
    this.music = null; this.musicBlocked = false; this.musicTries = 0;
    try { const a = new Audio(); a.loop = true; a.preload = 'auto'; a.src = this.src; a.volume = 0; a.muted = this.muted; this.music = a; } catch (e) {}
    this.musicCoast = null; try { const c = new Audio(); c.loop = true; c.preload = 'none'; c.src = this.srcCoast; c.volume = 0; c.muted = this.muted; this.musicCoast = c; } catch (e) {}      // (fetched only when the coast is first approached)
    // Every gesture (re)tries to start the music until it is really playing. Browsers on phones do not count a touch's pointerdown as a user gesture (touchend / click are), so
    // the first attempt there is rejected and a later one succeeds; a single attempt at the first event left the music silent while the effects worked.
    const go = () => { this.unlock(); this.startMusic(); this.unlockCoast(); };
    for (const ev of ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown']) addEventListener(ev, go, { passive: true });
    document.addEventListener('visibilitychange', () => this.visibility());
  }

  // ---- context / unlock
  unlock() {
    if (this.unlocked) { this.resume(); return; }
    this.unlocked = true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext; this.ctx = new AC();
      this.master = this.ctx.createGain(); this.master.gain.value = this.muted ? 0 : 0.8;
      this.bus = this.ctx.createDynamicsCompressor(); this.bus.threshold.value = -14; this.bus.ratio.value = 6;                // keeps a pile-up of effects from clipping
      this.master.connect(this.bus); this.bus.connect(this.ctx.destination);
    } catch (e) { this.ctx = null; }
    this.resume();
    this.startMusic();
  }
  // Some browsers (iOS Safari) only let a media element play later, from game code, if it has been played once from a user gesture: so on the first gesture that works the coast track is started
  // silently (volume 0) and stopped again at once. (Chrome needs nothing of the kind; the cost is that the file is fetched at the first tap.)
  unlockCoast() {
    const c = this.musicCoast; if (!this.unlocked || !c || this.coastUnlocked || this.coastUnlocking || document.hidden) return;
    this.coastUnlocking = true;
    try { c.volume = 0; const p = c.play(); if (p && p.then) p.then(() => { if (!this.coastOn) { try { c.pause(); c.currentTime = 0; } catch (e) {} } this.coastUnlocked = true; this.coastUnlocking = false; }, () => { this.coastUnlocking = false; }); else { this.coastUnlocking = false; } } catch (e) { this.coastUnlocking = false; }
  }
  // start the track if it is not playing (a rejected attempt is remembered in musicBlocked and simply tried again on the next gesture)
  startMusic() {
    const a = this.music; if (!this.unlocked || !a || !a.paused || document.hidden) return;
    this.musicTries = (this.musicTries || 0) + 1;
    try { const p = a.play(); if (p && p.then) p.then(() => { this.musicBlocked = false; }, e => { this.musicBlocked = e && e.name || true; }); } catch (e) { this.musicBlocked = true; }
  }
  resume() { try { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); } catch (e) {} }
  visibility() {
    if (!this.unlocked) return;
    if (document.hidden) { try { this.music.pause(); if (this.musicCoast) this.musicCoast.pause(); if (this.ctx) this.ctx.suspend(); } catch (e) {} }
    else { this.resume(); this.startMusic(); }
  }

  // ---- mute
  setMuted(m) {
    this.muted = !!m; try { localStorage.setItem('wayfarer.sound', this.muted ? '0' : '1'); } catch (e) {}
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.8;
    if (this.music) this.music.muted = this.muted;
    if (this.musicCoast) this.musicCoast.muted = this.muted;
    if (!this.muted) { this.unlock(); this.play('click'); }
  }
  toggle() { this.setMuted(!this.muted); }

  // ---- the beat clock, read by the animation. beat = beats since the first kick; phase = 0..1 within the beat; pulse = 1 on the kick, decaying to 0; energy / kick = 0..1 loudness
  beat() { return this.b; }
  update(g, dt) {
    const w = this.coastW, c = this.musicCoast, useCoast = !!(c && this.beatsCoast && w > 0.5 && this.unlocked && !c.paused && c.readyState >= 2);       // the coast track leads the clock once it is the louder
    const a = useCoast ? c : this.music, B = useCoast ? this.beatsCoast : this.beats, playing = !!(a && this.unlocked && !a.paused && a.readyState >= 2);
    this.clock += dt; const t = playing ? a.currentTime : this.clock;
    const period = B ? B.beat : 60 / 118, first = B ? B.first : 0, beat = (t - first) / period, phase = beat - Math.floor(beat);
    let energy = 0.6, kick = 0.6;
    if (B && playing) { const i = Math.min(B.energy.length - 1, Math.max(0, Math.floor(t * B.fps))); energy = B.energy[i] / 255; kick = B.kick[i] / 255; }
    this.b = { t, beat, phase, pulse: Math.exp(-phase * 5.5), energy, kick, playing, track: useCoast ? 'coast' : 'main' };
  }

  // ---- once per frame: beat clock, music volume by state, state-change sounds
  tick(g, dt) {
    this.update(g, dt);
    const s = g.state, a = this.music;
    if (a) {
      const level = { title: 0.55, play: 0.85, pause: 0.22, over: 0.3, scene: 0 }, target = s in level ? level[s] : 0.5;                       // the station scene has no music: only the place and its people (see voices.station)
      if (s === 'scene') this.sceneOut = 5; else if (this.sceneOut > 0) this.sceneOut = Math.max(0, this.sceneOut - dt);
      this.musicVol += (target - this.musicVol) * Math.min(1, dt * (s === 'scene' ? 3 : this.sceneOut > 0 ? 0.7 : 4));      // out in about a second; back in slowly over the first seconds after the scene
      if (s === 'scene' && this.musicVol < 0.004) this.musicVol = 0;
      // the coast crossfade: the weight follows the biome blend of the road ahead (g.bgTo / g.bgT) and is only heard while playing or paused on that road
      const want = g.bgTo === 'coast' && s !== 'title' ? Math.max(0, Math.min(1, g.bgT)) : 0, c = this.musicCoast;
      this.coastW += (want - this.coastW) * Math.min(1, dt * 6);
      if (this.coastW < 0.004 && want === 0) this.coastW = 0;
      if (c) {
        if (this.coastW > 0.01 && c.paused && this.unlocked && !document.hidden && !this.coastBlocked) { if (!this.coastOn) { try { c.currentTime = 0; } catch (e) {} } this.coastOn = true; try { const p = c.play(); if (p && p.then) p.then(() => { this.coastBlocked = false; }, e => { this.coastBlocked = true; setTimeout(() => { this.coastBlocked = false; }, 1500); }); } catch (e) {} }
        else if (this.coastW === 0 && !c.paused) { try { c.pause(); } catch (e) {} this.coastOn = false; }
        try { c.volume = Math.max(0, Math.min(1, this.musicVol * this.coastW)); } catch (e) {}
      }
      try { a.volume = Math.max(0, Math.min(1, this.musicVol * (1 - this.coastW))); } catch (e) {}
    }
    if (s !== this.lastState) {
      if (this.lastState === 'play' && s === 'pause') this.play('pause');
      else if (this.lastState === 'pause' && s === 'play') this.play('resume');
      else if (s === 'over' && this.lastState === 'play') this.play('over', 0.45);
      this.lastState = s;
    }
  }

  // ---- effects. `name` as listed in GameAudio.voices; `arg` = voice-specific (a delay in seconds for most)
  play(name, arg) {
    this.counts[name] = (this.counts[name] || 0) + 1;
    if (!this.ctx || this.muted || !GameAudio.voices[name]) return;
    this.resume();
    const t = this.ctx.currentTime + 0.01; let a = arg;
    if (name === 'coin') { const now = this.ctx.currentTime; this.streak = now - this.streakT < 0.9 ? Math.min(this.streak + 1, 9) : 0; this.streakT = now; a = this.streak; }
    else if (typeof arg === 'number') a = arg;
    if (this.active >= 24) return;                                  // a hard cap on simultaneous voices
    this.active++; setTimeout(() => { this.active = Math.max(0, this.active - 1); }, 1500);
    try { GameAudio.voices[name](this.ctx, this.master, name === 'over' ? t + (arg || 0) : t, a); } catch (e) {}
  }
}

// ---- synth helpers (pure: take the context and an output node)
GameAudio.noiseBuf = new WeakMap();
GameAudio.noise = ctx => { let b = GameAudio.noiseBuf.get(ctx); if (!b) { b = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate); const d = b.getChannelData(0); let s = 12345; for (let i = 0; i < d.length; i++) { s = (s * 16807) % 2147483647; d[i] = s / 1073741823.5 - 1; } GameAudio.noiseBuf.set(ctx, b); } return b; };
// a pitched blip: oscillator `type` gliding f0 -> f1 over dur, with a short attack and an exponential decay to nothing
GameAudio.tone = (ctx, out, t, o) => {
  const osc = ctx.createOscillator(), g = ctx.createGain(), at = o.attack || 0.005, vol = o.vol || 0.3;
  osc.type = o.type || 'sine'; osc.frequency.setValueAtTime(o.f0, t); if (o.f1) osc.frequency.exponentialRampToValueAtTime(o.f1, t + o.dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + at); g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
  osc.connect(g); g.connect(out); osc.start(t); osc.stop(t + o.dur + 0.02);
};
// a burst of noise through a filter sweeping f0 -> f1
GameAudio.hiss = (ctx, out, t, o) => {
  const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(), vol = o.vol || 0.3;
  src.buffer = GameAudio.noise(ctx); src.loop = true; f.type = o.filter || 'bandpass'; f.Q.value = o.q || 1; f.frequency.setValueAtTime(o.f0, t); f.frequency.exponentialRampToValueAtTime(o.f1 || o.f0, t + o.dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + (o.attack || 0.01)); g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
  src.connect(f); f.connect(g); g.connect(out); src.start(t); src.stop(t + o.dur + 0.02);
};
// a shared "hall" for the station: one convolver (1.7 s of decaying noise) per output node; `wet` is an input that feeds the output dry and the hall by `amt`
GameAudio.spaces = new WeakMap();
GameAudio.space = (ctx, out) => {
  let r = GameAudio.spaces.get(out); if (r) return r;
  const n = Math.floor(ctx.sampleRate * 1.7), b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0); let q = 987654321;
  for (let i = 0; i < n; i++) { q = (q * 16807) % 2147483647; d[i] = (q / 1073741823.5 - 1) * Math.pow(1 - i / n, 3); }
  const cv = ctx.createConvolver(); cv.buffer = b; r = ctx.createGain(); r.gain.value = 0.35; r.connect(cv); cv.connect(out); GameAudio.spaces.set(out, r); return r;
};
GameAudio.wet = (ctx, out, amt) => { const i = ctx.createGain(), s = ctx.createGain(); s.gain.value = amt; i.connect(out); i.connect(s); s.connect(GameAudio.space(ctx, out)); return i; };
const _hz = m => 440 * Math.pow(2, (m - 69) / 12);

GameAudio.voices = {
  jump:   (c, o, t) => { GameAudio.tone(c, o, t, { type: 'triangle', f0: 260, f1: 720, dur: 0.2, vol: 0.28 }); GameAudio.tone(c, o, t, { type: 'sine', f0: 520, f1: 1440, dur: 0.14, vol: 0.08 }); },
  land:   (c, o, t) => { GameAudio.tone(c, o, t, { type: 'sine', f0: 150, f1: 45, dur: 0.16, vol: 0.5 }); GameAudio.hiss(c, o, t, { filter: 'lowpass', f0: 900, f1: 200, dur: 0.08, vol: 0.25 }); },
  slide:  (c, o, t) => { GameAudio.hiss(c, o, t, { filter: 'bandpass', q: 1.4, f0: 3200, f1: 500, dur: 0.42, vol: 0.34, attack: 0.04 }); },
  coin:   (c, o, t, streak = 0) => { const m = 88 + Math.min(9, streak) * 2; GameAudio.tone(c, o, t, { type: 'square', f0: _hz(m), dur: 0.07, vol: 0.12 }); GameAudio.tone(c, o, t + 0.065, { type: 'square', f0: _hz(m + 7), dur: 0.22, vol: 0.13 }); GameAudio.tone(c, o, t + 0.065, { type: 'sine', f0: _hz(m + 19), dur: 0.3, vol: 0.05 }); },
  crash:  (c, o, t) => { GameAudio.hiss(c, o, t, { filter: 'lowpass', f0: 5200, f1: 160, dur: 0.7, vol: 0.55, attack: 0.004 }); GameAudio.tone(c, o, t, { type: 'sawtooth', f0: 190, f1: 38, dur: 0.6, vol: 0.38 }); GameAudio.tone(c, o, t, { type: 'sine', f0: 90, f1: 28, dur: 0.5, vol: 0.42 }); },
  over:   (c, o, t) => { [[64, 0], [60, 0.2], [55, 0.4], [48, 0.6]].forEach(([m, d]) => GameAudio.tone(c, o, t + d, { type: 'triangle', f0: _hz(m), dur: d === 0.6 ? 0.9 : 0.3, vol: 0.22 })); },
  mount:  (c, o, t) => { [0, 5, 9].forEach((m, i) => GameAudio.tone(c, o, t + i * 0.05, { type: 'square', f0: _hz(76 + m), dur: 0.1, vol: 0.1 })); GameAudio.tone(c, o, t, { type: 'triangle', f0: 200, f1: 520, dur: 0.18, vol: 0.14 }); },     // a little rising blip: on the scooter
  dismount: (c, o, t) => { GameAudio.tone(c, o, t, { type: 'triangle', f0: 520, f1: 190, dur: 0.16, vol: 0.14 }); },
  // ---- THE STATION (the Gare du Midi cutscene): no music, only the place and a few people. `station` is the bed (its length = the scene's); the others are cut to the picture by Game.sceneStep.
  train:  (c, o, t) => { const w = GameAudio.wet(c, o, 0.45); [[88, 0], [84, 0.42]].forEach(([m, d]) => { GameAudio.tone(c, w, t + d, { type: 'sine', f0: _hz(m), dur: 1.0, vol: 0.12 }); GameAudio.tone(c, w, t + d, { type: 'sine', f0: _hz(m + 12), dur: 0.7, vol: 0.03 }); }); },     // the station chime, ding-dong
  station: (c, o, t, dur) => {
    const D = dur > 1 ? dur : 10, bed = c.createGain(), dry = c.createGain(), rv = GameAudio.space(c, o), send = c.createGain(), rnd = seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    bed.gain.setValueAtTime(0.0001, t); bed.gain.linearRampToValueAtTime(1, t + 1.2); bed.gain.setValueAtTime(1, t + Math.max(1.3, D - 2.2)); bed.gain.exponentialRampToValueAtTime(0.0001, t + D);       // fades in, and out over the train's departure
    dry.gain.value = 0.7; send.gain.value = 0.45; bed.connect(dry); dry.connect(o); bed.connect(send); send.connect(rv);
    const noiseBed = (type, f, q, vol) => { const s = c.createBufferSource(), fl = c.createBiquadFilter(), g = c.createGain(); s.buffer = GameAudio.noise(c); s.loop = true; fl.type = type; fl.frequency.value = f; fl.Q.value = q; g.gain.value = vol; s.connect(fl); fl.connect(g); g.connect(bed); s.start(t); s.stop(t + D + 0.05); };
    noiseBed('lowpass', 240, 0.7, 0.2); noiseBed('bandpass', 1500, 0.4, 0.02);                                                    // the room: a big hall, low and airy
    const hum = (f, vol) => { const a = c.createOscillator(), fl = c.createBiquadFilter(), g = c.createGain(), l = c.createOscillator(), lg = c.createGain(); a.type = 'sawtooth'; a.frequency.value = f; fl.type = 'lowpass'; fl.frequency.value = 230; g.gain.value = vol; l.frequency.value = 6.5; lg.gain.value = vol * 0.35; l.connect(lg); lg.connect(g.gain); a.connect(fl); fl.connect(g); g.connect(bed); a.start(t); a.stop(t + D + 0.05); l.start(t); l.stop(t + D + 0.05); };
    hum(55, 0.07); hum(82.5, 0.045);                                                                                              // the train idling at the platform
    // a voice: a glottal buzz (sawtooth at f0) through two moving formants, switched on and off in syllables and phrases (from `a` to `b` seconds, `gap` = the longest pause between phrases)
    const talker = (f0, vol, seed, a, b, gap, out) => {
      const R = rnd(seed), o1 = c.createOscillator(), g = c.createGain(), F1 = c.createBiquadFilter(), F2 = c.createBiquadFilter();
      o1.type = 'sawtooth'; o1.frequency.value = f0; F1.type = F2.type = 'bandpass'; F1.Q.value = F2.Q.value = 5; F1.frequency.value = 500; F2.frequency.value = 1500; g.gain.value = 0.0001;
      o1.connect(F1); o1.connect(F2); F1.connect(g); F2.connect(g); g.connect(out); o1.start(t + a); o1.stop(t + b + 0.1);
      for (let x = t + a + R() * gap; x < t + b - 0.2;) {
        for (let k = 2 + Math.floor(R() * 5); k > 0 && x < t + b - 0.1; k--) {
          const len = 0.1 + R() * 0.12;
          g.gain.setTargetAtTime(vol * (0.5 + 0.5 * R()), x, 0.015); o1.frequency.setTargetAtTime(f0 * (0.9 + 0.22 * R()), x, 0.04); F1.frequency.setTargetAtTime(320 + R() * 520, x, 0.025); F2.frequency.setTargetAtTime(950 + R() * 1300, x, 0.025);
          x += len; g.gain.setTargetAtTime(0.0001, x - 0.025, 0.02); x += 0.03 + R() * 0.06;
        }
        x += 0.3 + R() * gap;
      }
    };
    const crowd = c.createGain(), soft = c.createBiquadFilter(); crowd.gain.value = 1; soft.type = 'lowpass'; soft.frequency.value = 2600; crowd.connect(soft); soft.connect(bed);
    [[112, 0.8, 11], [128, 0.7, 23], [205, 0.7, 37], [228, 0.6, 41], [168, 0.5, 53]].forEach(([f, v, sd]) => talker(f, v, sd, 0.2, D - 0.5, 1.6, crowd));       // five people talking, far and near
    const pa = c.createGain(), hp = c.createBiquadFilter(), lp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 420; lp.type = 'lowpass'; lp.frequency.value = 3200; pa.gain.value = 0.9; pa.connect(hp); hp.connect(lp); lp.connect(bed);
    talker(126, 1.2, 7, 1.7, Math.min(D - 1, 4.6), 0.05, pa);                                                                      // a tinny announcement over the loudspeakers
    [[2.45, 84], [5.0, 79]].forEach(([d, m]) => { if (d < D - 1) { GameAudio.tone(c, bed, t + d, { type: 'sine', f0: _hz(m + 5), dur: 0.9, vol: 0.12 }); GameAudio.tone(c, bed, t + d + 0.34, { type: 'sine', f0: _hz(m), dur: 1.1, vol: 0.12 }); } });
  },
  step:   (c, o, t, k) => { const j = k ? 1.12 : 0.92, w = GameAudio.wet(c, o, 0.3); GameAudio.tone(c, w, t, { type: 'sine', f0: 150 * j, f1: 52, dur: 0.11, vol: 0.34 }); GameAudio.hiss(c, w, t, { filter: 'bandpass', q: 0.9, f0: 2300 * j, f1: 900, dur: 0.05, vol: 0.22, attack: 0.002 }); },     // a shoe on the platform (k alternates the foot)
  luggage: (c, o, t) => {                                                                                                          // a suitcase rolling by: wheels over the joints of the paving
    const w = GameAudio.wet(c, o, 0.25), s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(), l = c.createOscillator(), lg = c.createGain();
    s.buffer = GameAudio.noise(c); s.loop = true; f.type = 'bandpass'; f.Q.value = 1.4; f.frequency.value = 1150; g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.1, t + 0.4); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);
    l.frequency.value = 11; lg.gain.value = 0.05; l.connect(lg); lg.connect(g.gain); s.connect(f); f.connect(g); g.connect(w); s.start(t); s.stop(t + 1.85); l.start(t); l.stop(t + 1.85);
    for (let k = 0; k < 5; k++) GameAudio.tone(c, w, t + 0.2 + k * 0.28, { type: 'sine', f0: 95, f1: 55, dur: 0.07, vol: 0.14 });
  },
  doorOpen:  (c, o, t) => { const w = GameAudio.wet(c, o, 0.3); GameAudio.hiss(c, w, t, { filter: 'bandpass', q: 0.9, f0: 4200, f1: 1100, dur: 0.55, vol: 0.22, attack: 0.03 }); GameAudio.tone(c, w, t + 0.45, { type: 'sine', f0: 115, f1: 55, dur: 0.14, vol: 0.32 }); [0, 0.11].forEach((d, i) => GameAudio.tone(c, w, t + d, { type: 'sine', f0: i ? 1318 : 1760, dur: 0.1, vol: 0.1 })); },   // the pneumatic doors open, with their two-note chime
  doorBeep:  (c, o, t) => { const w = GameAudio.wet(c, o, 0.25); [0, 0.2, 0.4].forEach(d => GameAudio.tone(c, w, t + d, { type: 'sine', f0: 2100, dur: 0.13, vol: 0.14, attack: 0.004 })); },                                                                                       // the doors are closing: three beeps
  doorClose: (c, o, t) => { const w = GameAudio.wet(c, o, 0.3); GameAudio.hiss(c, w, t, { filter: 'bandpass', q: 0.9, f0: 3000, f1: 800, dur: 0.35, vol: 0.2, attack: 0.02 }); GameAudio.tone(c, w, t + 0.28, { type: 'sine', f0: 100, f1: 45, dur: 0.13, vol: 0.38 }); GameAudio.hiss(c, w, t + 0.3, { filter: 'highpass', f0: 3000, dur: 0.03, vol: 0.2, attack: 0.002 }); },
  whistle:   (c, o, t) => {                                                                                                        // the guard's whistle: a short and a long blast, with a trill
    const w = GameAudio.wet(c, o, 0.4);
    [[0, 0.2], [0.3, 0.55]].forEach(([d, len]) => { const a = c.createOscillator(), g = c.createGain(), l = c.createOscillator(), lg = c.createGain(), x = t + d; a.type = 'triangle'; a.frequency.value = 2650; l.frequency.value = 30; lg.gain.value = 150; l.connect(lg); lg.connect(a.frequency); g.gain.setValueAtTime(0.0001, x); g.gain.linearRampToValueAtTime(0.13, x + 0.02); g.gain.setValueAtTime(0.13, x + len - 0.05); g.gain.exponentialRampToValueAtTime(0.0001, x + len); a.connect(g); g.connect(w); a.start(x); a.stop(x + len + 0.02); l.start(x); l.stop(x + len + 0.02); GameAudio.hiss(c, w, x, { filter: 'bandpass', q: 2, f0: 3100, dur: len, vol: 0.04, attack: 0.02 }); });
  },
  horn:   (c, o, t) => { const w = GameAudio.wet(c, o, 0.4); GameAudio.tone(c, w, t, { type: 'sawtooth', f0: 311, dur: 1.0, vol: 0.13 }); GameAudio.tone(c, w, t, { type: 'sawtooth', f0: 392, dur: 1.0, vol: 0.13 }); },                                                    // the train's two-tone horn
  pull:   (c, o, t) => {                                                                                                           // the train pulling out: rumble and sub swell, wheels over the rail joints getting quicker, then fading away
    const w = GameAudio.wet(c, o, 0.35), s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = GameAudio.noise(c); s.loop = true; f.type = 'lowpass'; f.frequency.setValueAtTime(70, t); f.frequency.exponentialRampToValueAtTime(260, t + 1.3); f.frequency.exponentialRampToValueAtTime(80, t + 3.0);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.5, t + 1.2); g.gain.exponentialRampToValueAtTime(0.0001, t + 3.0); s.connect(f); f.connect(g); g.connect(w); s.start(t); s.stop(t + 3.05);
    GameAudio.tone(c, w, t, { type: 'sine', f0: 46, f1: 38, dur: 3.0, vol: 0.38, attack: 1.0 });
    for (let k = 0, x = 0.25; k < 16; k++, x += 0.42 * Math.pow(0.85, k)) { const v = 0.28 * Math.sin(Math.PI * Math.min(1, (k + 2) / 17)); GameAudio.tone(c, w, t + x, { type: 'sine', f0: 100, f1: 56, dur: 0.07, vol: v * 0.8 }); GameAudio.hiss(c, w, t + x, { filter: 'bandpass', q: 1.1, f0: 2500, f1: 1500, dur: 0.05, vol: v * 0.7, attack: 0.002 }); }
  },
  // ---- the perks layer (src/perks.js): every reward has its own voice, short and clear; all synthesised like the rest
  shard:    (c, o, t) => { const w = GameAudio.wet(c, o, 0.35); [[96, 0], [100, 0.07], [103, 0.14]].forEach(([m, d]) => { GameAudio.tone(c, w, t + d, { type: 'sine', f0: _hz(m), dur: 0.5, vol: 0.14 }); GameAudio.tone(c, w, t + d, { type: 'triangle', f0: _hz(m + 12), dur: 0.3, vol: 0.05 }); }); },     // glass: three rising chimes
  waymark:  (c, o, t) => { const w = GameAudio.wet(c, o, 0.4); [[79, 0], [86, 0.09], [91, 0.18]].forEach(([m, d]) => { GameAudio.tone(c, w, t + d, { type: 'sine', f0: _hz(m), dur: 1.1, vol: 0.16 }); GameAudio.tone(c, w, t + d, { type: 'sine', f0: _hz(m + 12) * 1.003, dur: 0.8, vol: 0.06 }); }); GameAudio.hiss(c, w, t, { filter: 'highpass', f0: 5000, dur: 0.3, vol: 0.05, attack: 0.02 }); },   // a bright bell
  perk:     (c, o, t, k) => {
    const w = GameAudio.wet(c, o, 0.3);
    if (k === 'aura') { [72, 76, 79].forEach((m, i) => GameAudio.tone(c, w, t + i * 0.05, { type: 'sine', f0: _hz(m), dur: 0.7, vol: 0.13, attack: 0.12 })); GameAudio.hiss(c, w, t, { filter: 'highpass', f0: 4000, dur: 0.5, vol: 0.05, attack: 0.15 }); }      // a soft chord that swells
    else if (k === 'dash') { GameAudio.hiss(c, w, t, { filter: 'bandpass', q: 0.8, f0: 400, f1: 3800, dur: 0.45, vol: 0.3, attack: 0.05 }); GameAudio.tone(c, w, t, { type: 'sawtooth', f0: 200, f1: 760, dur: 0.4, vol: 0.1 }); }               // a whoosh forward
    else { GameAudio.tone(c, w, t, { type: 'sawtooth', f0: 110, f1: 440, dur: 0.3, vol: 0.1 }); [0, 0.09, 0.18].forEach(d => GameAudio.tone(c, w, t + 0.12 + d, { type: 'sine', f0: _hz(88), dur: 0.12, vol: 0.12 })); }          // the magnet: a whirr and three pings
  },
  auraBreak: (c, o, t) => { const w = GameAudio.wet(c, o, 0.4); GameAudio.hiss(c, w, t, { filter: 'highpass', f0: 3000, f1: 8000, dur: 0.3, vol: 0.28, attack: 0.003 }); [[96, 0], [88, 0.04], [81, 0.09]].forEach(([m, d]) => GameAudio.tone(c, w, t + d, { type: 'triangle', f0: _hz(m), f1: _hz(m - 12), dur: 0.35, vol: 0.14 })); GameAudio.tone(c, w, t, { type: 'sine', f0: 140, f1: 50, dur: 0.2, vol: 0.3 }); },    // glass breaking, a low thump
  expire:   (c, o, t) => { GameAudio.tone(c, o, t, { type: 'sine', f0: _hz(76), dur: 0.16, vol: 0.1 }); GameAudio.tone(c, o, t + 0.1, { type: 'sine', f0: _hz(69), dur: 0.22, vol: 0.1 }); },                                                    // two soft falling notes: it ran out
  near:     (c, o, t) => { GameAudio.hiss(c, o, t, { filter: 'bandpass', q: 1.2, f0: 1500, f1: 4600, dur: 0.18, vol: 0.2, attack: 0.02 }); GameAudio.tone(c, o, t + 0.08, { type: 'sine', f0: _hz(103), dur: 0.14, vol: 0.07 }); },                          // a swish and a tick
  combo:    (c, o, t) => { [0, 4].forEach((m, i) => GameAudio.tone(c, o, t + i * 0.07, { type: 'square', f0: _hz(84 + m), dur: 0.14, vol: 0.09 })); GameAudio.tone(c, o, t + 0.14, { type: 'triangle', f0: _hz(91), dur: 0.3, vol: 0.1 }); },
  mission:  (c, o, t) => { const w = GameAudio.wet(c, o, 0.3); [72, 76, 79, 84].forEach((m, i) => { GameAudio.tone(c, w, t + i * 0.09, { type: 'triangle', f0: _hz(m), dur: 0.5, vol: 0.15 }); GameAudio.tone(c, w, t + i * 0.09, { type: 'sine', f0: _hz(m + 12), dur: 0.35, vol: 0.05 }); }); GameAudio.hiss(c, w, t + 0.3, { filter: 'highpass', f0: 6000, dur: 0.5, vol: 0.06, attack: 0.05 }); },      // a short fanfare: a rising major arpeggio
  prompt: (c, o, t) => { GameAudio.tone(c, o, t, { type: 'sine', f0: _hz(79), dur: 0.18, vol: 0.2 }); GameAudio.tone(c, o, t + 0.12, { type: 'sine', f0: _hz(86), dur: 0.26, vol: 0.2 }); },
  choose: (c, o, t) => { [0, 4, 7, 12].forEach((s, i) => GameAudio.tone(c, o, t + i * 0.06, { type: 'triangle', f0: _hz(72 + s), dur: 0.22, vol: 0.2 })); },
  start:  (c, o, t) => { GameAudio.tone(c, o, t, { type: 'sawtooth', f0: 180, f1: 900, dur: 0.35, vol: 0.14 }); [0, 7, 12].forEach((s, i) => GameAudio.tone(c, o, t + 0.15 + i * 0.05, { type: 'square', f0: _hz(72 + s), dur: 0.3, vol: 0.1 })); },
  pause:  (c, o, t) => { GameAudio.tone(c, o, t, { type: 'triangle', f0: 660, f1: 330, dur: 0.14, vol: 0.2 }); },
  resume: (c, o, t) => { GameAudio.tone(c, o, t, { type: 'triangle', f0: 330, f1: 660, dur: 0.14, vol: 0.2 }); },
  click:  (c, o, t) => { GameAudio.tone(c, o, t, { type: 'square', f0: 900, f1: 600, dur: 0.05, vol: 0.12 }); },
};
