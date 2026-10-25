"""Dabke percussion for the video: the maqsum rhythm (D T . T D . T .) on the track's beat grid, foot stomps on the dancers' steps, and soft claps.
usage: make_drums.py out.wav seconds beat_seconds"""
import sys, wave, numpy as np
out, secs, per = sys.argv[1], float(sys.argv[2]), float(sys.argv[3]); SR = 44100; N = int(SR * secs); rng = np.random.default_rng(7)
mix = np.zeros((N, 2), np.float32)
def noise(n): return rng.uniform(-1, 1, n).astype(np.float32)
def band(x, lo, hi):
    F = np.fft.rfft(x); fq = np.fft.rfftfreq(len(x), 1 / SR); F[(fq < lo) | (fq > hi)] = 0; return np.fft.irfft(F, len(x)).astype(np.float32)
def put(t, sig, gain, pan=0.0):
    i = int(t * SR); 
    if i >= N: return
    n = min(len(sig), N - i); l = gain * (1 - max(pan, 0)); r = gain * (1 + min(pan, 0))
    mix[i:i + n, 0] += sig[:n] * l; mix[i:i + n, 1] += sig[:n] * r
def dum():     # the deep hand-drum note: a sine falling 150 -> 62 Hz, plus a click
    n = int(0.28 * SR); t = np.arange(n) / SR; f = 62 + 88 * np.exp(-t * 28); ph = 2 * np.pi * np.cumsum(f) / SR
    return (np.sin(ph) * np.exp(-t / 0.11) + 0.35 * band(noise(n), 300, 2500) * np.exp(-t / 0.006)).astype(np.float32)
def tek():     # the bright rim note: filtered noise + a short 1.8 kHz ring
    n = int(0.12 * SR); t = np.arange(n) / SR
    return (band(noise(n), 2500, 9000) * np.exp(-t / 0.028) + 0.35 * np.sin(2 * np.pi * 1850 * t) * np.exp(-t / 0.02)).astype(np.float32)
def ka():      # the soft left-hand tap
    n = int(0.08 * SR); t = np.arange(n) / SR
    return (band(noise(n), 3500, 10000) * np.exp(-t / 0.016) + 0.2 * np.sin(2 * np.pi * 2300 * t) * np.exp(-t / 0.012)).astype(np.float32)
def stomp():   # a foot stamp: low thud + a short slap
    n = int(0.2 * SR); t = np.arange(n) / SR; f = 55 + 70 * np.exp(-t * 40)
    return (np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.07) + 0.6 * band(noise(n), 150, 1200) * np.exp(-t / 0.03)).astype(np.float32)
def clap():    # a hand clap: three tiny bursts then a tail
    n = int(0.22 * SR); t = np.arange(n) / SR; env = sum(np.exp(-np.clip(t - d, 0, None) / 0.012) * (t >= d) for d in (0, 0.009, 0.019)) * 0.5 + np.exp(-t / 0.07) * (t >= 0.02) * 0.5
    return (band(noise(n), 900, 4500) * env).astype(np.float32)
D, T, K, S, C = dum(), tek(), ka(), stomp(), clap()
bars = int(secs / (4 * per)) + 1
for b in range(bars):
    t0 = b * 4 * per; B = lambda beats: t0 + beats * per
    # maqsum: Dum . Tek . . Tek Dum . . . Tek . .   (eighths 0..7 = D T . T D . T .)  written in beats
    put(B(0.0), D, 0.95); put(B(0.5), T, 0.5, 0.1); put(B(1.5), T, 0.5, -0.1); put(B(2.0), D, 0.85); put(B(3.0), T, 0.5, 0.1)
    put(B(2.5), K, 0.28, -0.15); put(B(3.5), K, 0.3, 0.15); put(B(3.75), K, 0.36, -0.1); put(B(1.0), K, 0.22, 0.1)
    # the dancers' stamps: R on 0, 2 and 3.75, L on 1 and 3 (the video's choreography)
    for u, pan in ((0, 0.25), (1, -0.25), (2, 0.25), (3, -0.25), (3.75, 0.25)): put(B(u), S, 0.5, pan)
    # claps on beats 2 and 4
    put(B(1.0), C, 0.32, -0.2); put(B(3.0), C, 0.32, 0.2)
mix = np.tanh(mix * 0.9) / 0.72                         # soft limiter so a pile-up of hits cannot clip
mix = np.clip(mix * 0.92, -0.98, 0.98)
with wave.open(out, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix * 32767).astype('<i2').tobytes())
print('drums: %.2f s, peak %.2f, rms %.3f' % (secs, float(np.abs(mix).max()), float(np.sqrt((mix ** 2).mean()))))
