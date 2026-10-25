// GameAudio: all the game's sound. Two parts:
//  - MUSIC: the user's track (assets/music.mp3, played by an <audio> element, looped) plus a precomputed beat map (MUSIC_BEATS) that gives the animation a beat clock
//    (`beat()`), read from the audio's currentTime; with no audio yet (browsers only allow sound after a first tap / key press) the same clock runs from the page time at the same
//    tempo, so the menu already moves in time.
//  - EFFECTS: short sounds synthesised with the Web Audio API (no sound files): jump, land, slide, coin (the pitch climbs with a streak), crash, game-over, fork prompt / choice,
//    start, pause / resume. Every voice is a pure function of (ctx, out, time, arg), so tests can render them offline.
// Sound is allowed from the first user gesture; M toggles mute (remembered); the game pauses it with the tab. The Game just calls `g.sfx.play(name)` where things happen and
// `g.sfx.tick(g, dt)` once per frame. Without a GameAudio (the 2D page) nothing changes.
class GameAudio {
  constructor(opts = {}) {
    this.src = opts.src || 'assets/music.mp3';
    this.beats = opts.beats || (typeof MUSIC_BEATS !== 'undefined' ? MUSIC_BEATS : null);
    this.counts = {};                       // how many times each effect was requested (also while muted / locked: tests and the HUD can read it)
    this.muted = false; try { this.muted = localStorage.getItem('wayfarer.sound') === '0'; } catch (e) {}
    this.ctx = null; this.master = null; this.unlocked = false; this.active = 0; this.nodesMade = 0;
    this.musicVol = 0; this.streak = 0; this.streakT = -9; this.lastState = ''; this.clock = 0; this.b = { t: 0, beat: 0, phase: 0, pulse: 0, energy: 0, kick: 0, playing: false };
    this.music = null; this.musicBlocked = false; this.musicTries = 0;
    try { const a = new Audio(); a.loop = true; a.preload = 'auto'; a.src = this.src; a.volume = 0; a.muted = this.muted; this.music = a; } catch (e) {}
    // Every gesture (re)tries to start the music until it is really playing. Browsers on phones do not count a touch's pointerdown as a user gesture (touchend / click are), so
    // the first attempt there is rejected and a later one succeeds; a single attempt at the first event left the music silent while the effects worked.
    const go = () => { this.unlock(); this.startMusic(); };
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
  // start the track if it is not playing (a rejected attempt is remembered in musicBlocked and simply tried again on the next gesture)
  startMusic() {
    const a = this.music; if (!this.unlocked || !a || !a.paused || document.hidden) return;
    this.musicTries = (this.musicTries || 0) + 1;
    try { const p = a.play(); if (p && p.then) p.then(() => { this.musicBlocked = false; }, e => { this.musicBlocked = e && e.name || true; }); } catch (e) { this.musicBlocked = true; }
  }
  resume() { try { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); } catch (e) {} }
  visibility() {
    if (!this.unlocked) return;
    if (document.hidden) { try { this.music.pause(); if (this.ctx) this.ctx.suspend(); } catch (e) {} }
    else { this.resume(); this.startMusic(); }
  }

  // ---- mute
  setMuted(m) {
    this.muted = !!m; try { localStorage.setItem('wayfarer.sound', this.muted ? '0' : '1'); } catch (e) {}
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.8;
    if (this.music) this.music.muted = this.muted;
    if (!this.muted) { this.unlock(); this.play('click'); }
  }
  toggle() { this.setMuted(!this.muted); }

  // ---- the beat clock, read by the animation. beat = beats since the first kick; phase = 0..1 within the beat; pulse = 1 on the kick, decaying to 0; energy / kick = 0..1 loudness
  beat() { return this.b; }
  update(g, dt) {
    const B = this.beats, a = this.music, playing = !!(a && this.unlocked && !a.paused && a.readyState >= 2);
    this.clock += dt; const t = playing ? a.currentTime : this.clock;
    const period = B ? B.beat : 60 / 118, first = B ? B.first : 0, beat = (t - first) / period, phase = beat - Math.floor(beat);
    let energy = 0.6, kick = 0.6;
    if (B && playing) { const i = Math.min(B.energy.length - 1, Math.max(0, Math.floor(t * B.fps))); energy = B.energy[i] / 255; kick = B.kick[i] / 255; }
    this.b = { t, beat, phase, pulse: Math.exp(-phase * 5.5), energy, kick, playing };
  }

  // ---- once per frame: beat clock, music volume by state, state-change sounds
  tick(g, dt) {
    this.update(g, dt);
    const s = g.state, a = this.music;
    if (a) {
      const target = { title: 0.55, play: 0.85, pause: 0.22, over: 0.3 }[s] || 0.5;
      this.musicVol += (target - this.musicVol) * Math.min(1, dt * 4); try { a.volume = Math.max(0, Math.min(1, this.musicVol)); } catch (e) {}
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
const _hz = m => 440 * Math.pow(2, (m - 69) / 12);

GameAudio.voices = {
  jump:   (c, o, t) => { GameAudio.tone(c, o, t, { type: 'triangle', f0: 260, f1: 720, dur: 0.2, vol: 0.28 }); GameAudio.tone(c, o, t, { type: 'sine', f0: 520, f1: 1440, dur: 0.14, vol: 0.08 }); },
  land:   (c, o, t) => { GameAudio.tone(c, o, t, { type: 'sine', f0: 150, f1: 45, dur: 0.16, vol: 0.5 }); GameAudio.hiss(c, o, t, { filter: 'lowpass', f0: 900, f1: 200, dur: 0.08, vol: 0.25 }); },
  slide:  (c, o, t) => { GameAudio.hiss(c, o, t, { filter: 'bandpass', q: 1.4, f0: 3200, f1: 500, dur: 0.42, vol: 0.34, attack: 0.04 }); },
  coin:   (c, o, t, streak = 0) => { const m = 88 + Math.min(9, streak) * 2; GameAudio.tone(c, o, t, { type: 'square', f0: _hz(m), dur: 0.07, vol: 0.12 }); GameAudio.tone(c, o, t + 0.065, { type: 'square', f0: _hz(m + 7), dur: 0.22, vol: 0.13 }); GameAudio.tone(c, o, t + 0.065, { type: 'sine', f0: _hz(m + 19), dur: 0.3, vol: 0.05 }); },
  crash:  (c, o, t) => { GameAudio.hiss(c, o, t, { filter: 'lowpass', f0: 5200, f1: 160, dur: 0.7, vol: 0.55, attack: 0.004 }); GameAudio.tone(c, o, t, { type: 'sawtooth', f0: 190, f1: 38, dur: 0.6, vol: 0.38 }); GameAudio.tone(c, o, t, { type: 'sine', f0: 90, f1: 28, dur: 0.5, vol: 0.42 }); },
  over:   (c, o, t) => { [[64, 0], [60, 0.2], [55, 0.4], [48, 0.6]].forEach(([m, d]) => GameAudio.tone(c, o, t + d, { type: 'triangle', f0: _hz(m), dur: d === 0.6 ? 0.9 : 0.3, vol: 0.22 })); },
  prompt: (c, o, t) => { GameAudio.tone(c, o, t, { type: 'sine', f0: _hz(79), dur: 0.18, vol: 0.2 }); GameAudio.tone(c, o, t + 0.12, { type: 'sine', f0: _hz(86), dur: 0.26, vol: 0.2 }); },
  choose: (c, o, t) => { [0, 4, 7, 12].forEach((s, i) => GameAudio.tone(c, o, t + i * 0.06, { type: 'triangle', f0: _hz(72 + s), dur: 0.22, vol: 0.2 })); },
  start:  (c, o, t) => { GameAudio.tone(c, o, t, { type: 'sawtooth', f0: 180, f1: 900, dur: 0.35, vol: 0.14 }); [0, 7, 12].forEach((s, i) => GameAudio.tone(c, o, t + 0.15 + i * 0.05, { type: 'square', f0: _hz(72 + s), dur: 0.3, vol: 0.1 })); },
  pause:  (c, o, t) => { GameAudio.tone(c, o, t, { type: 'triangle', f0: 660, f1: 330, dur: 0.14, vol: 0.2 }); },
  resume: (c, o, t) => { GameAudio.tone(c, o, t, { type: 'triangle', f0: 330, f1: 660, dur: 0.14, vol: 0.2 }); },
  click:  (c, o, t) => { GameAudio.tone(c, o, t, { type: 'square', f0: 900, f1: 600, dur: 0.05, vol: 0.12 }); },
};
