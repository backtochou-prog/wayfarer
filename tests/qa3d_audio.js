// WAYFARER regression test: sound and music (src/audio.js).
//  - nothing sounds before the first gesture; a key press unlocks the audio context and starts the music (the user's track, assets/music.mp3)
//  - the beat map really matches the decoded audio at the start, the middle and the end of the track (no drift)
//  - every game event requests the right effect exactly once (start, jump, land, slide, coin, crash, game over, fork prompt, fork choice, pause, resume)
//  - every synthesised effect renders (offline): audible, finite, not clipping; the coin pitch climbs with a streak
//  - mute (M key, the on-screen icon, remembered across page loads), music volume per state, no voice leak
//  - the animation follows the beat: scene light, glowing parts, PLAY button, avatar; the 2D page is untouched
//
// Run:  node tests/qa3d_audio.js     (needs playwright-core and a Chromium: CHROMIUM=/path/to/chrome, NODE_PATH or PW_CORE as for the other tests)
const http = require('http'), fs = require('fs'), path = require('path');
let chromium; try { ({ chromium } = require('playwright-core')); } catch (e) { ({ chromium } = require(process.env.PW_CORE || 'playwright-core')); }
const ROOT = path.join(__dirname, '..'), PORT = 8120;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.mp3': 'audio/mpeg' };
const res = []; const T = (n, ok, i = '') => { res.push(ok); console.log((ok ? 'PASS ' : 'FAIL ') + n + (i !== '' ? '  [' + i + ']' : '')); };

(async () => {
  const srv = http.createServer((q, r) => {                                  // static server with byte ranges (browsers ask for ranges when seeking in an <audio>)
    let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; const f = path.join(ROOT, p);
    fs.stat(f, (e, st) => {
      if (e || !st.isFile()) { r.writeHead(404); r.end(); return; }
      const type = MIME[path.extname(p)] || 'application/octet-stream', rg = q.headers.range;
      if (rg) { const m = /bytes=(\d*)-(\d*)/.exec(rg), s = +m[1] || 0, en = m[2] ? +m[2] : st.size - 1; r.writeHead(206, { 'content-type': type, 'content-range': `bytes ${s}-${en}/${st.size}`, 'accept-ranges': 'bytes', 'content-length': en - s + 1 }); fs.createReadStream(f, { start: s, end: en }).pipe(r); }
      else { r.writeHead(200, { 'content-type': type, 'accept-ranges': 'bytes', 'content-length': st.size }); fs.createReadStream(f).pipe(r); }
    });
  }).listen(PORT);
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/root/.cache/ms-playwright/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ viewport: { width: 640, height: 360 } });
  const base = process.env.TEST_URL || 'http://localhost:' + PORT + '/';
  const open = async (url = base) => { const pg = await ctx.newPage(); pg.errs = []; pg.on('pageerror', e => pg.errs.push(e.message)); pg.on('console', m => m.type() === 'error' && pg.errs.push(m.text())); await pg.goto(url, { timeout: 90000 }); await pg.waitForFunction(() => window.__wf, null, { timeout: 60000 }); await pg.waitForTimeout(500); return pg; };
  const pg = await open();

  // ================================================================ 1. locked until a gesture, then it plays
  const L0 = await pg.evaluate(() => { const a = __wf.sfx; const t0 = a.beat().beat; a.update(__wf, 0.3); const t1 = a.beat().beat; return { unlocked: a.unlocked, ctx: !!a.ctx, paused: a.music.paused, loop: a.music.loop, ready: a.music.readyState, clockMoves: t1 > t0 + 0.3, playing: a.beat().playing, hasSfx: !!__wf.sfx }; });
  T('before any gesture there is no audio context and the music is not playing (autoplay rules), but the beat clock already runs (the menu moves in time)', L0.hasSfx && !L0.unlocked && !L0.ctx && L0.paused && L0.clockMoves && !L0.playing, JSON.stringify(L0));
  await pg.keyboard.press('KeyX');                                           // any key is a gesture
  await pg.waitForFunction(() => __wf.sfx.music.currentTime > 0.5, null, { timeout: 90000 });
  const L1 = await pg.evaluate(async () => { const a = __wf.sfx, t0 = a.music.currentTime; await new Promise(r => setTimeout(r, 1200)); a.update(__wf, 0); return { unlocked: a.unlocked, state: a.ctx && a.ctx.state, advanced: +(a.music.currentTime - t0).toFixed(2), playing: a.beat().playing, dur: +a.music.duration.toFixed(1), loop: a.music.loop }; });
  T('a key press unlocks the audio context (running) and starts the track: it advances in real time, loops, lasts ~172.7 s, and the beat clock follows its currentTime', L1.unlocked && L1.state === 'running' && L1.advanced > 0.8 && L1.playing && L1.loop && L1.dur > 172 && L1.dur < 174, JSON.stringify(L1));

  // ================================================================ 2. the beat map against the real audio
  const beatMap = which => pg.evaluate(async which => {
    const B = which === 'coast' ? MUSIC_BEATS_COAST : MUSIC_BEATS, url = which === 'coast' ? 'assets/music_coast.mp3' : 'assets/music.mp3', out = { bpm: B.bpm, first: B.first, frames: B.energy.length, fps: B.fps, dur: B.duration };
    const buf = await (await fetch(url)).arrayBuffer(); out.bytes = buf.byteLength; const ac = new OfflineAudioContext(1, 1, 44100); const au = await ac.decodeAudioData(buf), x = au.getChannelData(0), sr = au.sampleRate;
    out.decDur = +au.duration.toFixed(2);
    // kick onsets: the 40-200 Hz band (two poles below 200 Hz minus one pole below 40 Hz), its 4 ms RMS envelope, and the rise over the previous 32 ms (sustained bass notes do not count)
    const lp = f => 1 - Math.exp(-2 * Math.PI * f / sr), a2 = lp(200), a1 = lp(40), H = Math.round(0.004 * sr), M = Math.floor(x.length / H), env = new Float32Array(M);
    let s1 = 0, s2 = 0, l = 0, acc = 0, j = 0, n = 0; for (let i = 0; i < M * H; i++) { s1 += a2 * (x[i] - s1); s2 += a2 * (s1 - s2); l += a1 * (x[i] - l); const v = s2 - l; acc += v * v; if (++n === H) { env[j++] = Math.sqrt(acc / H); acc = 0; n = 0; } }
    const ons = new Float32Array(M); for (let i = 8; i < M; i++) ons[i] = Math.max(0, env[i] - env[i - 8]);
    const at = t => { const i = Math.round(t / 0.004 - 0.5); return i >= 0 && i < M ? ons[i] : 0; };
    out.seg = {};
    for (const [name, t0] of [['start', 8], ['middle', 80], ['end', 135]]) {
      const per = B.beat, k0 = Math.ceil((t0 - B.first) / per), K = 60, score = (ph, shift = 0) => { let e = 0; for (let k = 0; k < K; k++) e += at(B.first + (k0 + k) * per + ph + shift); return e / K; };
      const scan = []; for (let ph = -0.12; ph <= 0.12; ph += 0.004) scan.push([ph, score(ph)]);
      const best = scan.reduce((m, v) => v[1] > m[1] ? v : m), peakOn = Math.max(...scan.filter(v => Math.abs(v[0]) <= 0.02).map(v => v[1])), peakOff = Math.max(...scan.map(v => score(v[0], B.beat / 2)).slice(0, 61).concat(scan.filter(v => Math.abs(v[0]) <= 0.02).map(v => score(v[0], B.beat / 2))));
      out.seg[name] = { bestPhase: +best[0].toFixed(3), onVsOff: +(peakOn / Math.max(1e-9, peakOff)).toFixed(2) };
    }
    return out;
  }, which);
  const BM = await beatMap('main'), BMC = await beatMap('coast');
  const ph = Object.values(BM.seg).map(s => s.bestPhase), phc = Object.values(BMC.seg).map(s => s.bestPhase);
  T('the beat map is the track\'s: ~117.7 BPM, 25 frames per second for the whole ' + BM.dur + ' s (' + BM.frames + ' frames), the same length as the decoded mp3 (' + BM.decDur + ' s)', Math.abs(BM.bpm - 117.7) < 0.3 && BM.fps === 25 && Math.abs(BM.frames - BM.dur * 25) < 3 && Math.abs(BM.decDur - BM.dur) < 0.3 && BM.bytes === 2764657, JSON.stringify({ bpm: BM.bpm, frames: BM.frames, dur: BM.dur, decDur: BM.decDur, bytes: BM.bytes }));
  T('the beat grid matches the decoded audio at the start, middle and end of the track (the kick onsets peak within 25 ms of the grid in each, and the three positions agree within 20 ms: no drift) and the kick onsets are clearly stronger on the beat than half a beat later',
    ph.every(p => Math.abs(p) <= 0.025) && Math.max(...ph) - Math.min(...ph) <= 0.02 && Object.values(BM.seg).every(s => s.onVsOff > 1.5), JSON.stringify(BM.seg));
  const BC = await pg.evaluate(async () => {            // the clock reads the audio's position: seek to a kick and to the middle of a beat
    const a = __wf.sfx, B = MUSIC_BEATS, mus = a.music, out = {};
    const at = async t => { mus.currentTime = t; await new Promise(r => { const f = () => { mus.removeEventListener('seeked', f); r(); }; mus.addEventListener('seeked', f); setTimeout(r, 3000); }); a.update(__wf, 0); return a.beat(); };
    const k = B.first + 100 * B.beat; const on = await at(k + 0.003), mid = await at(k + B.beat * 0.5);
    out.on = { pulse: +on.pulse.toFixed(2), phase: +on.phase.toFixed(3) }; out.mid = { pulse: +mid.pulse.toFixed(2), phase: +mid.phase.toFixed(2) }; out.energy = +on.energy.toFixed(2); out.playing = on.playing; return out;
  });
  T('the beat clock reads the audio position: pulse ~1 on a kick (' + BC.on.pulse + ') and ~0 mid-beat (' + BC.mid.pulse + '), energy is read from the map', BC.playing && BC.on.pulse > 0.9 && BC.mid.pulse < 0.1 && Math.abs(BC.mid.phase - 0.5) < 0.05 && BC.energy >= 0 && BC.energy <= 1, JSON.stringify(BC));

  // ================================================================ 3. every game event asks for the right effect, once
  const EV = await pg.evaluate(async () => {
    const g = __wf, a = g.sfx, r = g.r, out = {}; r.renderer.render = () => {};
    const key = c => g.onKey({ code: c, repeat: false, preventDefault() {} }, true);
    const step = n => { for (let i = 0; i < n; i++) g.advance(1 / 60); };
    const cnt = () => JSON.parse(JSON.stringify(a.counts)), diff = (b2, a2) => { const o = {}; for (const k of new Set([...Object.keys(b2), ...Object.keys(a2)])) if ((a2[k] || 0) !== (b2[k] || 0)) o[k] = (a2[k] || 0) - (b2[k] || 0); return o; };
    g.state = 'title'; let c0 = cnt(); key('Space'); out.start = diff(c0, cnt()); out.stateAfterStart = g.state;
    g.world.items = []; step(10);
    c0 = cnt(); key('Space'); step(5); out.jump = diff(c0, cnt()); step(60); out.land = diff(c0, cnt());                                  // one jump, then it lands
    g.world.items = []; step(20); c0 = cnt(); key('ArrowDown'); step(3); key('ArrowDown'); step(3); out.slide = diff(c0, cnt()); step(50);              // a second tap during the slide does not chain
    g.world.items = []; step(10); c0 = cnt(); const n0 = g.coins; for (let i = 0; i < 4; i++) g.world.items.push({ kind: 'coin', z: g.p.z + 30 + i * 18, x: g.p.x, h: 12, tag: 'x' }); step(60); out.coin = diff(c0, cnt()); out.coinsGot = g.coins - n0;
    g.world.items = []; step(5); c0 = cnt(); g.state = 'pause'; step(2); g.state = 'play'; step(2); out.pauseResume = diff(c0, cnt());
    g.world.items = []; g.world.extend(9000); const F = g.world.openFork(); g.p.z = F.z0 - 900; g.world.items = g.world.items.filter(i => i.z > g.p.z + 1500); c0 = cnt(); g.keys.left = true; step(1); g.keys.left = false;
    for (let i = 0; i < 400 && !F.choice && g.state === 'play'; i++) { g.world.items = g.world.items.filter(k => k.kind !== 'crate' && k.kind !== 'barrier' && k.kind !== 'over'); g.advance(1 / 60); } out.fork = diff(c0, cnt()); out.chose = F.choice;
    g.world.items = []; step(30); c0 = cnt(); const vo = GameAudio.voices.over, vc = GameAudio.voices.crash; out.delays = {}; GameAudio.voices.over = (c, o, t, x) => { out.delays.over = +(t - c.currentTime).toFixed(2); return vo(c, o, t, x); }; GameAudio.voices.crash = (c, o, t, x) => { out.delays.crash = +(t - c.currentTime).toFixed(2); return vc(c, o, t, x); };
    g.world.items.push({ kind: 'crate', z: g.p.z + 30, x: g.p.x, h: 12, tag: 'x' }); step(30); out.crash = diff(c0, cnt()); out.stateAfterCrash = g.state; step(40); out.over = diff(c0, cnt()); GameAudio.voices.over = vo; GameAudio.voices.crash = vc;
    return out;
  });
  const one = (o, k) => o[k] === 1;
  T('PLAY / Space asks for "start" once and begins the run', one(EV.start, 'start') && EV.stateAfterStart === 'play', JSON.stringify({ start: EV.start, st: EV.stateAfterStart }));
  T('a jump asks for "jump" once and, on touching down, "land" once', one(EV.jump, 'jump') && !EV.jump.land && one(EV.land, 'jump') && one(EV.land, 'land'), JSON.stringify({ jump: EV.jump, land: EV.land }));
  T('a slide asks for "slide" once even if down is tapped again during it', one(EV.slide, 'slide'), JSON.stringify(EV.slide));
  T('each coin picked up asks for "coin" (4 coins -> ' + EV.coinsGot + ' picked, ' + (EV.coin.coin || 0) + ' sounds)', EV.coinsGot === 4 && EV.coin.coin === 4, JSON.stringify(EV.coin));
  T('pausing asks for "pause" once and resuming "resume" once', one(EV.pauseResume, 'pause') && one(EV.pauseResume, 'resume'), JSON.stringify(EV.pauseResume));
  T('a fork asks for "prompt" once when the choice opens and "choose" once when the road is locked (' + EV.chose + ')', one(EV.fork, 'prompt') && one(EV.fork, 'choose') && (EV.chose === 'left' || EV.chose === 'right'), JSON.stringify(EV.fork));
  T('a crash asks for "crash" once, and the game over jingle "over" once, scheduled ~0.45 s after the crash sound', one(EV.crash, 'crash') && EV.stateAfterCrash === 'over' && one(EV.over, 'over') && one(EV.over, 'crash') && EV.delays.crash < 0.1 && EV.delays.over > 0.4 && EV.delays.over < 0.6, JSON.stringify({ crash: EV.crash, over: EV.over, delays: EV.delays }));

  // ================================================================ 4. the effects themselves, rendered offline
  const SY = await pg.evaluate(async () => {
    const out = {}, names = Object.keys(GameAudio.voices);
    for (const n of names) {
      const oc = new OfflineAudioContext(1, 44100 * 2, 44100), g = oc.createGain(); g.connect(oc.destination); GameAudio.voices[n](oc, g, 0.01, n === 'coin' ? 0 : undefined);
      const d = (await oc.startRendering()).getChannelData(0); let pk = 0, e = 0, bad = 0, last = 0; for (let i = 0; i < d.length; i++) { const v = d[i]; if (!isFinite(v)) bad++; pk = Math.max(pk, Math.abs(v)); e += v * v; if (Math.abs(v) > 0.003) last = i; }
      out[n] = { peak: +pk.toFixed(3), rms: +Math.sqrt(e / d.length).toFixed(4), bad, endsAt: +(last / 44100).toFixed(2) };
    }
    const zc = async streak => { const oc = new OfflineAudioContext(1, 44100, 44100), g = oc.createGain(); g.connect(oc.destination); GameAudio.voices.coin(oc, g, 0, streak); const d = (await oc.startRendering()).getChannelData(0); let c = 0; for (let i = 1; i < 0.3 * 44100; i++) if ((d[i - 1] < 0) !== (d[i] < 0)) c++; return c; };
    out.coinLow = await zc(0); out.coinHigh = await zc(9); out.names = names; return out;
  });
  const want = ['jump', 'land', 'slide', 'coin', 'crash', 'over', 'prompt', 'choose', 'start', 'pause', 'resume', 'click'];
  T('every effect exists (' + want.length + ') and renders audible, finite and not clipping (peak 0.05..1.0), and stops by itself within 1.6 s', want.every(n => SY[n]) && want.every(n => SY[n].peak > 0.05 && SY[n].peak <= 1.0 && SY[n].bad === 0 && SY[n].rms > 0.002 && SY[n].endsAt < 1.6), JSON.stringify(Object.fromEntries(want.map(n => [n, SY[n] && [SY[n].peak, SY[n].endsAt]]))));
  T('the coin sound climbs in pitch with a streak (zero crossings in the first 0.3 s: streak 0 -> ' + SY.coinLow + ', streak 9 -> ' + SY.coinHigh + ')', SY.coinHigh > SY.coinLow * 1.3, '');
  T('the crash is the loudest effect and the click the quietest (a sensible mix)', SY.crash.rms > SY.jump.rms && SY.crash.rms > SY.coin.rms && SY.click.rms < SY.jump.rms, JSON.stringify({ crash: SY.crash.rms, jump: SY.jump.rms, coin: SY.coin.rms, click: SY.click.rms }));

  // ================================================================ 5. mute, volume per state, no leaks
  const MU = await pg.evaluate(async () => {
    const g = __wf, a = g.sfx, out = {}; let made = 0; const co = a.ctx.createOscillator.bind(a.ctx), cb = a.ctx.createBufferSource.bind(a.ctx);
    a.ctx.createOscillator = () => { made++; return co(); }; a.ctx.createBufferSource = () => { made++; return cb(); };
    a.setMuted(false); made = 0; a.play('coin'); a.play('crash'); out.unmutedNodes = made;
    g.onKey({ code: 'KeyM', repeat: false, preventDefault() {} }, true);
    out.afterM = { muted: a.muted, gain: a.master.gain.value, mediaMuted: a.music.muted, stored: localStorage.getItem('wayfarer.sound') };
    made = 0; const c0 = a.counts.coin || 0; a.play('coin'); a.play('jump'); out.mutedNodes = made; out.mutedCounted = (a.counts.coin || 0) - c0;
    g.onKey({ code: 'KeyM', repeat: false, preventDefault() {} }, true);
    out.afterM2 = { muted: a.muted, gain: a.master.gain.value, mediaMuted: a.music.muted, stored: localStorage.getItem('wayfarer.sound') };
    return out;
  });
  T('M mutes: master gain 0, the music element muted, the choice stored; muted effects build no audio nodes but are still counted; M again restores it', MU.unmutedNodes > 0 && MU.afterM.muted && MU.afterM.gain === 0 && MU.afterM.mediaMuted && MU.afterM.stored === '0' && MU.mutedNodes === 0 && MU.mutedCounted === 1 && !MU.afterM2.muted && Math.abs(MU.afterM2.gain - 0.8) < 1e-6 && !MU.afterM2.mediaMuted && MU.afterM2.stored === '1', JSON.stringify(MU));
  T('the Sunset Coast track (assets/music_coast.mp3) has its own beat map: ~120.7 BPM, 25 frames per second for its whole ' + BMC.dur + ' s (' + BMC.frames + ' frames), the same length as the decoded mp3 (' + BMC.decDur + ' s)', Math.abs(BMC.bpm - 120.7) < 0.3 && BMC.fps === 25 && Math.abs(BMC.frames - BMC.dur * 25) < 3 && Math.abs(BMC.decDur - BMC.dur) < 0.3 && BMC.bytes === 2739999, JSON.stringify({ bpm: BMC.bpm, frames: BMC.frames, dur: BMC.dur, decDur: BMC.decDur, bytes: BMC.bytes }));
  T('its beat grid matches the decoded audio at the start, middle and end (kick onsets within 40 ms of the grid in each, positions agreeing within 40 ms: a steady tempo) and the onsets are stronger on the beat than half a beat later',
    phc.every(p => Math.abs(p) <= 0.04) && Math.max(...phc) - Math.min(...phc) <= 0.04 && Object.values(BMC.seg).every(s => s.onVsOff > 1.2), JSON.stringify(BMC.seg));
  const CF = await pg.evaluate(async () => {
    const g = __wf, a = g.sfx, c = a.musicCoast, out = {}, keep = { s: g.state, to: g.bgTo, t: g.bgT }, adv = g.advance; g.advance = () => {};       // (the game loop is held still: it would put its own state and biome back during the waits)
    g.state = 'play'; a.lastState = 'play'; g.bgTo = 'city'; g.bgT = 0;
    for (let i = 0; i < 60; i++) a.tick(g, 0.05);
    out.before = { w: a.coastW, coastPaused: c.paused, ready: c.readyState, mainVol: +a.music.volume.toFixed(2), coastVol: +c.volume.toFixed(2), track: a.beat().track };
    g.bgTo = 'coast'; g.bgT = 1; const vm = [], vc = [];                                     // enter the coast: the crossfade
    for (let i = 0; i < 40; i++) { a.tick(g, 0.05); vm.push(a.music.volume); vc.push(c.volume); if (i === 2) await new Promise(r => setTimeout(r, 700)); }
    for (let i = 0; i < 40; i++) a.tick(g, 0.05); await new Promise(r => setTimeout(r, 900)); a.tick(g, 0.05); a.update(g, 0);
    out.mono = vm.every((v, i) => i === 0 || v <= vm[i - 1] + 1e-9) && vc.every((v, i) => i === 0 || v >= vc[i - 1] - 1e-9);
    out.inCoast = { w: +a.coastW.toFixed(2), coastPaused: c.paused, t: +c.currentTime.toFixed(2), mainVol: +a.music.volume.toFixed(3), coastVol: +c.volume.toFixed(2), track: a.beat().track, beatT: +a.beat().t.toFixed(2) };
    out.sum = vm.map((v, i) => +(v + vc[i]).toFixed(2));                                       // the two together never exceed the music volume (no jump in loudness)
    g.state = 'title'; a.lastState = 'title'; for (let i = 0; i < 40; i++) a.tick(g, 0.05); out.title = { w: a.coastW, coastPaused: c.paused };             // the menu: the main track only
    g.state = 'play'; a.lastState = 'play'; g.bgTo = 'coast'; g.bgT = 1; for (let i = 0; i < 40; i++) a.tick(g, 0.05); await new Promise(r => setTimeout(r, 500)); out.again = { t: +c.currentTime.toFixed(2), paused: c.paused };   // entering again starts from the beginning
    g.bgTo = 'neon'; g.bgT = 1; for (let i = 0; i < 60; i++) a.tick(g, 0.05); a.update(g, 0);       // leave: back to the main track
    out.after = { w: a.coastW, coastPaused: c.paused, mainVol: +a.music.volume.toFixed(2), coastVol: +c.volume.toFixed(2), track: a.beat().track };
    a.setMuted(true); out.muted = c.muted && a.music.muted; a.setMuted(false); out.unmuted = !c.muted && !a.music.muted;
    g.state = keep.s; a.lastState = keep.s; g.bgTo = keep.to; g.bgT = keep.t; g.advance = adv; return out;
  });
  T('the Sunset Coast has its own music: before the coast the track is silent (paused, volume 0; it was started silently once at the first gesture so that browsers such as iOS Safari let game code play it later); entering the coast crossfades smoothly (the main track falls, the coast one rises, never louder together than the music volume), the coast track starts from its beginning (t=' + CF.inCoast.t + ' s) and the beat clock follows it',
    CF.before.w === 0 && CF.before.coastPaused && CF.before.coastVol === 0 && CF.before.track === 'main' && CF.mono && CF.inCoast.w > 0.97 && !CF.inCoast.coastPaused && CF.inCoast.t > 0.5 && CF.inCoast.t < 6 && CF.inCoast.mainVol < 0.01 && CF.inCoast.coastVol > 0.5 && CF.inCoast.track === 'coast' && Math.abs(CF.inCoast.beatT - CF.inCoast.t) < 0.3 && Math.max(...CF.sum) <= 0.9, JSON.stringify({ before: CF.before, inCoast: CF.inCoast, mono: CF.mono, sumMax: Math.max(...CF.sum) }));
  T('leaving the coast brings the main track back and stops the coast one; the menu never plays it; entering again restarts it; mute and unmute cover both tracks',
    CF.title.w === 0 && CF.title.coastPaused && CF.again.t < 4 && !CF.again.paused && CF.after.w === 0 && CF.after.coastPaused && CF.after.mainVol > 0.5 && CF.after.coastVol === 0 && CF.after.track === 'main' && CF.muted && CF.unmuted, JSON.stringify({ title: CF.title, again: CF.again, after: CF.after, muted: CF.muted, unmuted: CF.unmuted }));
  const CP = await pg.evaluate(async () => {                                                   // the real run: a bot takes the coast branch of a fork at the top speed; the loop is stepped by hand
    const g = __wf, a = g.sfx, orig = Game.runSeed, keep = g.advance, out = { log: [] }; Game.runSeed = () => 1; g.start(); Game.runSeed = orig;
    const key = c => g.onKey({ code: c, key: c, repeat: false, preventDefault() {} }, true), w = g.world; w.extend(90000);
    const F = w.pieces.find(p => p.type === 'fork' && p.fork.left.route === 'coastRun'); g.p.z = F.z0 - 1500; g.p.speed = 340; w.extend(g.p.z); w.items = w.items.filter(i => i.z > g.p.z + 700);
    let f = 0; while (f < 60 * 70 && g.state === 'play' && g.p.z < F.z1 + 1500) {
      const p = g.p, Fo = w.openFork(); g.keys.left = g.keys.right = false; if (Fo && p.z > Fo.z0 - 500 && p.z < Fo.z0 - 400) g.keys.left = true;
      let tg = null; for (const it of w.items) { const ob = OBST[it.kind]; if (!ob || it.z <= p.z || it.z - p.z > p.speed * 0.5) continue; if (Math.abs(it.x - p.x) > ob.hw + 0.25) continue; if (!tg || it.z < tg.z) tg = it; }
      if (tg && tg.z - p.z < p.speed * 0.3 && p.jy === 0 && p.slide <= 0) key(tg.kind === 'over' ? 'ArrowDown' : 'Space');
      g.p.speed = 340; g.advance(1 / 60); f++; if (f % 30 === 0) { await new Promise(r => setTimeout(r, 30)); out.log.push({ at: Math.round((g.p.z - F.z0) / 10), to: g.bgTo, w: a.coastW, main: a.music.volume, coast: a.musicCoast.volume, paused: a.musicCoast.paused, track: a.beat().track }); }
    }
    out.state = g.state; g.state = 'title'; return out;
  });
  const inB = CP.log.filter(x => x.at > 85 && x.at < 150), before = CP.log.filter(x => x.at < -40), afterB = CP.log.filter(x => x.at > 300);
  T('in a real run the coast branch plays the coast track: before the fork only the main one (coast paused, weight 0), inside the branch the coast track is on top (weight > 0.95, main volume < 0.05, coast > 0.7, the beat clock on it), the crossfade lasts a few seconds each way, and after the merge the main track is back',
    CP.state === 'play' && before.length > 2 && before.every(x => x.w === 0 && x.paused && x.track === 'main') && inB.length > 2 &&         /* (the samples are ~18 units apart, so the 65-unit window holds 3 or 4 of them) */ inB.every(x => x.w > 0.95 && x.main < 0.05 && x.coast > 0.7 && !x.paused && x.track === 'coast') && afterB.length > 2 && afterB.every(x => x.w === 0 && x.paused && x.main > 0.3), JSON.stringify({ state: CP.state, n: [before.length, inB.length, afterB.length], before: before.every(x => x.w === 0 && x.paused && x.track === 'main'), inB: inB.every(x => x.w > 0.95 && x.main < 0.05 && x.coast > 0.7 && !x.paused && x.track === 'coast'), afterB: afterB.every(x => x.w === 0 && x.paused && x.main > 0.3), log: CP.log.map(x => [x.at, x.to, +x.w.toFixed(2), +x.main.toFixed(2), +x.coast.toFixed(2), x.track, x.paused ? 'P' : ''].join(' ')) }));
  const VOL = await pg.evaluate(() => { const g = __wf, a = g.sfx, out = {}, keep = g.state; for (const s of ['title', 'play', 'pause', 'over']) { g.state = s; a.lastState = s; for (let i = 0; i < 60; i++) a.tick(g, 0.1); out[s] = +a.music.volume.toFixed(2); } g.state = keep; return out; });
  T('the music volume follows the state: loud while playing, softer in the menu, ducked on pause and after a crash', VOL.play > VOL.title && VOL.title > VOL.over && VOL.over > VOL.pause && VOL.pause > 0.1 && VOL.play <= 1, JSON.stringify(VOL));
  const LK = await pg.evaluate(async () => { const a = __wf.sfx; for (let i = 0; i < 12; i++) a.play(['coin', 'jump', 'land', 'slide', 'crash', 'click'][i % 6]); const peak = a.active; await new Promise(r => setTimeout(r, 1900)); return { peak, after: a.active }; });
  T('effects are capped (<= 24 at once) and the voice count returns to 0 after they end', LK.peak > 0 && LK.peak <= 24 && LK.after === 0, JSON.stringify(LK));

  // ================================================================ 6. the on-screen sound button, and mute remembered across page loads
  const BT = await pg.evaluate(() => { const g = __wf; g.state = 'title'; const cv = document.getElementById('screen'), r0 = cv.getBoundingClientRect(), b = BTN.sound; return { x: r0.left + (b.x + b.w / 2) / VW * r0.width, y: r0.top + (b.y + b.h / 2) / VH * r0.height, muted: g.sfx.muted }; });
  await pg.mouse.move(BT.x, BT.y); await pg.mouse.down(); await pg.mouse.up(); await pg.waitForTimeout(150);
  const BT2 = await pg.evaluate(() => { const g = __wf, ui = g.r.ui, ctx2 = document.getElementById('screen').getContext('2d'); g.r.draw(g); const b = BTN.sound, d = ctx2.getImageData(b.x, b.y, b.w, b.h).data; let red = 0; for (let i = 0; i < d.length; i += 4) if (d[i] > 180 && d[i + 1] < 140 && d[i + 2] < 120) red++; return { muted: g.sfx.muted, redCross: red, state: g.state }; });
  T('clicking the sound icon (menu, bottom right) mutes the game and the icon shows a red cross', !BT.muted && BT2.muted && BT2.redCross >= 6 && BT2.state === 'title', JSON.stringify({ before: BT.muted, after: BT2.muted, cross: BT2.redCross }));
  await pg.close();
  const pg2 = await open();
  const PS = await pg2.evaluate(() => ({ muted: __wf.sfx.muted, mediaMuted: __wf.sfx.music.muted }));
  T('mute is remembered: a new page load starts muted', PS.muted && PS.mediaMuted, JSON.stringify(PS));
  await pg2.evaluate(() => { __wf.sfx.setMuted(false); });

  // ================================================================ 7. the animation follows the beat
  const AN = await pg2.evaluate(() => {
    const g = __wf, a = g.sfx, r = g.r, out = {}; r.renderer.render = () => {}; a.update = () => {};            // freeze the clock: we set the beat by hand
    g.state = 'play'; g.world.items = [];
    const set = (pulse, energy = 1) => { a.b = { t: 0, beat: 0, phase: pulse > 0.5 ? 0 : 0.5, pulse, energy, kick: energy, playing: true }; };
    const glow = Kit.materials().glow;
    set(1); r.draw(g); const hemiOn = r.hemi.intensity, glowOn = glow.color.r, uiOn = r.ui.beatPulse;
    set(0); r.draw(g); const hemiOff = r.hemi.intensity, glowOff = glow.color.r, uiOff = r.ui.beatPulse;
    out.light = { on: +hemiOn.toFixed(3), off: +hemiOff.toFixed(3), base: +r.hemiBase.toFixed(3) }; out.glow = { on: +glowOn.toFixed(3), off: +glowOff.toFixed(3) }; out.ui = [uiOn, uiOff];
    set(1, 0); r.draw(g); out.quietBeat = +r.ui.beatPulse.toFixed(2);                                              // a beat in a quiet part of the track pulses less
    const rn = r.runner, st = b => ({ time: 3, runRate: 3, airborne: false, vy: 0, sliding: false, lean: 0, state: 'play', beat: b });
    for (let i = 0; i < 60; i++) rn.update(1 / 60, st(0)); const y0 = rn.pivot ? rn.pivot.position.y : rn.body.position.y; const s0 = rn.pivot ? rn.pivot.scale.y : 1;
    for (let i = 0; i < 60; i++) rn.update(1 / 60, st(1)); const y1 = rn.pivot ? rn.pivot.position.y : rn.body.position.y; const s1 = rn.pivot ? rn.pivot.scale.y : 1;
    out.avatar = { yOff: +y0.toFixed(3), yOn: +y1.toFixed(3), sOff: +s0.toFixed(3), sOn: +s1.toFixed(3) };
    return out;
  });
  T('the scene lights pulse with the beat (light ' + AN.light.off + ' -> ' + AN.light.on + ', glowing parts ' + AN.glow.off + ' -> ' + AN.glow.on + '), never darker than 75 %, never brighter than the base by more than 20 %',
    AN.light.on > AN.light.off && AN.light.on <= AN.light.base * 1.2 && AN.glow.on > AN.glow.off && AN.glow.on <= 1.0001 && AN.glow.off >= 0.75, JSON.stringify({ light: AN.light, glow: AN.glow }));
  T('the PLAY button and the avatar get the pulse too (button ' + AN.ui[1] + ' -> ' + AN.ui[0] + ', avatar lifted ' + (AN.avatar.yOn - AN.avatar.yOff).toFixed(3) + ' and stretched), and a beat in a quiet part pulses less (' + AN.quietBeat + ')',
    AN.ui[0] > 0.9 && AN.ui[1] < 0.05 && AN.avatar.yOn > AN.avatar.yOff + 0.01 && AN.avatar.sOn > AN.avatar.sOff && AN.quietBeat < 0.5 && AN.quietBeat > 0, JSON.stringify(AN));
  T('no JS errors in the sound session', pg2.errs.length === 0, pg2.errs.slice(0, 2).join('|'));
  await pg2.close();

  // ================================================================ 7b. phones: the music must start although the first touch event is not a valid gesture
  // (Chrome on Android / iOS only accept play() from touchend, click or a key; a touch pointerdown is rejected. This once left the effects working and the music silent.)
  const pctx = await b.newContext({ viewport: { width: 915, height: 412 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await pctx.addInitScript(() => {
    window.__kind = ''; window.__plays = [];
    for (const ev of ['pointerdown', 'touchstart', 'touchend', 'pointerup', 'click', 'keydown']) addEventListener(ev, () => { window.__kind = ev; setTimeout(() => { window.__kind = ''; }, 0); }, true);
    const real = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () { const ok = ['touchend', 'click', 'keydown'].includes(window.__kind); window.__plays.push((window.__kind || 'none') + ':' + (ok ? 'allowed' : 'REJECTED')); return ok ? real.call(this) : Promise.reject(new DOMException('needs a user gesture', 'NotAllowedError')); };
  });
  const pp = await pctx.newPage(); pp.errs = []; pp.on('pageerror', e => pp.errs.push(e.message));
  await pp.goto(base, { timeout: 90000 }); await pp.waitForFunction(() => window.__wf && window.__wf.sfx, null, { timeout: 60000 }); await pp.waitForTimeout(800);
  const ppos = await pp.evaluate(() => { const cv = document.getElementById('screen'), r0 = cv.getBoundingClientRect(), b2 = BTN.title; return { x: r0.left + (b2.x + b2.w / 2) / VW * r0.width, y: r0.top + (b2.y + b2.h / 2) / VH * r0.height }; });
  await pp.touchscreen.tap(ppos.x, ppos.y);
  await pp.waitForFunction(() => __wf.sfx.music.currentTime > 0.5, null, { timeout: 20000 }).catch(() => {});
  const PH = await pp.evaluate(() => { const a = __wf.sfx; return { playing: !a.music.paused && a.music.currentTime > 0.5, ctx: a.ctx && a.ctx.state, plays: window.__plays, blocked: a.musicBlocked, state: __wf.state }; });
  T('on a phone (touch pointerdown is not a valid gesture) the first music attempt is rejected, a later touch event retries and the music plays, with the effects working too',
    PH.plays[0].endsWith('REJECTED') && PH.plays.some(x => x.endsWith('allowed')) && PH.playing && PH.ctx === 'running' && PH.blocked === false && PH.state === 'play' && pp.errs.length === 0, JSON.stringify(PH));
  await pctx.close();

  // ================================================================ 8. the 2D page has no sound code and still works
  const p2 = await open(base + '2d.html');
  const TD = await p2.evaluate(() => ({ hasSfx: !!__wf.sfx, hasClass: typeof GameAudio !== 'undefined' }));
  await p2.keyboard.press('Enter'); await p2.waitForTimeout(400);
  const TD2 = await p2.evaluate(() => ({ state: __wf.state, z: Math.round(__wf.p.z) }));
  T('the classic 2D page is silent and unchanged: no GameAudio, Enter starts a run, no errors', !TD.hasSfx && !TD.hasClass && TD2.state === 'play' && p2.errs.length === 0, JSON.stringify({ ...TD, ...TD2, errs: p2.errs.slice(0, 1) }));
  console.log('\n' + res.filter(Boolean).length + '/' + res.length + ' passed');
  await b.close(); srv.close(); process.exit(res.every(Boolean) ? 0 : 1);
})().catch(e => { console.log('TEST ERROR', e.message); process.exit(1); });
