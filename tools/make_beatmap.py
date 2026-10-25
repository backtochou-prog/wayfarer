#!/usr/bin/env python3
"""Beat map of a music track for the game's animation (writes src3d/music_beats.js).

    ffmpeg -i track.m4a -vn -ac 1 -ar 22050 -f f32le /tmp/mono.f32
    ffmpeg -i track.m4a -vn -af volume=-3dB -codec:a libmp3lame -b:a 128k -ar 44100 assets/music.mp3
    python3 tools/make_beatmap.py /tmp/mono.f32 > src3d/music_beats.js

Finds the tempo and the position of the first kick drum by a grid search on the kick onsets (sharp rises in the 40-200 Hz band), checks that the grid does not drift
(best phase in six windows), and writes the loudness of the whole sound and of the bass (20-250 Hz) in 40 ms windows (25 per second). Needs numpy. Assumes a steady tempo.
"""
import sys, json
import numpy as np

SR = 22050
x = np.fromfile(sys.argv[1], dtype=np.float32)

def band(lo, hi):
    out = np.zeros_like(x); B = SR * 8
    for s in range(0, len(x), B):
        seg = x[s:s + B]; F = np.fft.rfft(seg); fq = np.fft.rfftfreq(len(seg), 1 / SR); F[(fq < lo) | (fq > hi)] = 0
        out[s:s + len(seg)] = np.fft.irfft(F, len(seg))
    return out

kb = band(40, 200); h = int(0.004 * SR); m = len(kb) // h; dt = 0.004
env = np.sqrt((kb[:m * h] ** 2).reshape(m, h).mean(axis=1))
ons = np.maximum(0, env[8:] - env[:-8]); ons = np.concatenate([np.zeros(8), ons]); ons /= ons.std() + 1e-9
T = len(ons) * dt

def score(per, off, t0=0, t1=None):
    t1 = t1 or T; k0 = int(np.ceil((t0 - off) / per)); k1 = int((t1 - off) / per); tt = off + per * np.arange(k0, k1)
    return float(np.interp(tt / dt - 0.5, np.arange(len(ons)), ons).mean())

best = max((score(per, off), per, off) for per in np.arange(0.40, 0.75, 0.0005) for off in np.arange(0, 0.75, 0.01))   # coarse
_, per0, off0 = best
best = max((score(per, off), per, off) for per in np.arange(per0 - 0.0015, per0 + 0.0015, 0.00001) for off in np.arange(off0 - 0.03, off0 + 0.03, 0.001))  # fine
_, per, off = best
shifts = []
for k in range(6):
    t0 = k * 28; shifts.append(round((max((score(per, o, t0, t0 + 28), o) for o in np.arange(off - 0.06, off + 0.06, 0.002))[1] - off) * 1000))
sys.stderr.write('tempo %.3f BPM, first kick %.3f s, phase shift per 28 s window (ms): %s\n' % (60 / per, off % per, shifts))

W = int(0.04 * SR); n = len(x) // W
def loud(sig):
    v = np.sqrt((sig[:n * W] ** 2).reshape(n, W).mean(axis=1)); return np.clip(v / np.percentile(v, 99), 0, 1)
E, K = loud(x), loud(band(20, 250))
bm = {'bpm': round(60 / per, 4), 'beat': round(float(per), 5), 'first': round(float(off) % per, 4), 'duration': round(len(x) / SR, 3), 'fps': 25.0,
      'energy': [int(v * 255) for v in E], 'kick': [int(v * 255) for v in K]}
print('// Beat map of assets/music.mp3, made by tools/make_beatmap.py: %.2f BPM, first kick at %.3f s; `energy` / `kick` = loudness of the whole sound / of the bass,' % (bm['bpm'], bm['first']))
print('// 40 ms windows (25 per second), 0..255. The animation reads them by the audio\'s currentTime.')
print('const MUSIC_BEATS = %s;' % json.dumps(bm, separators=(',', ':')))
