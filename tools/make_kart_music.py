#!/usr/bin/env python3
"""The music of the KART CIRCUIT (the Galerie Gasperi), MASTERED: from the user's track 'redone - Road Night 2' (the 2026-11-10 export, 192 s, 135.73 BPM).

    python3 tools/make_kart_music.py "redone_-_Road_Night_2_-_....m4a"        (needs ffmpeg on the PATH, or FFMPEG=/path/to/ffmpeg, and numpy)

Writes:
  assets/music_kart.mp3                  the game's loop (128 kbps, -16.9 LUFS like the game's other tracks)
  src3d/music_beats_kart.js              its beat map (tools/make_beatmap.py with the known period)
  docs/downloads/road-night-2-master.mp3 the whole MASTERED track for the user (320 kbps, -14 LUFS, -1 dBTP: streaming level)

THE MASTERING (measured on the export: -14.9 LUFS, LRA 4.9 LU, the bass 20-150 Hz about 16 dB over the low mids and 40 dB over 1.5-11 kHz: a dark, boomy mix):
  1. a 28 Hz high-pass (rumble under the kick, eats headroom), a -2.5 dB bell at 220 Hz (low-mid mud), a -1.5 dB low shelf at 70 Hz (tames the boom without losing the kick);
  2. +2 dB of presence at 3 kHz and a +3 dB air shelf from 10 kHz (the hats and the lead come forward);
  3. a gentle glue compressor (2:1 above -20 dB, 15 ms attack, 180 ms release, +2 dB make-up);
  4. loudness and true peak: EBU R128 loudnorm (two passes, linear) to the target and -1 dBTP.
THE LOOP: the whole track, 108 bars from the first kick (0.066 s) to 191.04 s; the 0.5 s decay after the cut is mixed into the start, a 4 ms fade-in and a 6 ms fade-out at the seams.
"""
import os, re, json, subprocess, sys, tempfile
import numpy as np

FF = os.environ.get('FFMPEG', 'ffmpeg'); HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
BPM, FIRST, BARS, SR = 135.725, 0.066, 108, 44100; BEAT = 60.0 / BPM
PRE, FIN, FOUT, TAIL = 0.03, 0.004, 0.006, 0.5
EQ = 'highpass=f=28:p=2,equalizer=f=70:t=q:w=0.7:g=-1.5,equalizer=f=220:t=q:w=1.2:g=-2.5,equalizer=f=3000:t=q:w=1.0:g=2,highshelf=f=10000:g=3,acompressor=threshold=-20dB:ratio=2:attack=15:release=180:makeup=2'

src = sys.argv[1]
OUT_LOOP = os.path.join(ROOT, 'assets', 'music_kart.mp3'); OUT_JS = os.path.join(ROOT, 'src3d', 'music_beats_kart.js'); OUT_MASTER = os.path.join(ROOT, 'docs', 'downloads', 'road-night-2-master.mp3')
run = lambda *a, **k: subprocess.run([FF, '-hide_banner', '-loglevel', 'error', '-nostats', *a], check=True, **k)

def loudnorm(inp, out_args, target, tp):              # two-pass EBU R128 (the first pass measures, the second applies it linearly)
    r = subprocess.run([FF, '-hide_banner', '-nostats', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', '-af', 'loudnorm=I=%g:TP=%g:LRA=11:print_format=json' % (target, tp), '-f', 'null', '-'], input=inp, stderr=subprocess.PIPE)
    m = json.loads(re.search(r'\{[^{}]*"input_i"[^{}]*\}', r.stderr.decode(), re.S).group(0))
    af = 'loudnorm=I=%g:TP=%g:LRA=11:measured_I=%s:measured_TP=%s:measured_LRA=%s:measured_thresh=%s:offset=%s:linear=true' % (target, tp, m['input_i'], m['input_tp'], m['input_lra'], m['input_thresh'], m['target_offset'])
    run('-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', '-af', af + ',aresample=%d' % SR, *out_args, input=inp)
    return m

# the mastered whole track (EQ and compression on the full export, before any cut)
eqd = np.frombuffer(run('-i', src, '-vn', '-ac', '2', '-ar', str(SR), '-af', EQ, '-f', 'f32le', '-', stdout=subprocess.PIPE).stdout, dtype=np.float32).reshape(-1, 2)
os.makedirs(os.path.dirname(OUT_MASTER), exist_ok=True)
m = loudnorm(eqd.tobytes(), ['-codec:a', 'libmp3lame', '-b:a', '320k', OUT_MASTER], -14, -1)
sys.stderr.write('master: input %s LUFS / %s dBTP -> -14 LUFS / -1 dBTP: %s\n' % (m['input_i'], m['input_tp'], OUT_MASTER))

# the game's loop, cut from the mastered sound
t0 = FIRST - PRE; n0 = int(round(t0 * SR)); nL = int(round(BARS * 4 * BEAT * SR)); nT = int(TAIL * SR)
loop = eqd[n0:n0 + nL].copy(); tail = eqd[n0 + nL:n0 + nL + nT].copy()
if len(tail): fade = np.cos(np.linspace(0, np.pi / 2, len(tail))) ** 2; loop[:len(tail)] += tail * fade[:, None]       # the decay after the cut, into the start
a, b = int(FIN * SR), int(FOUT * SR); loop[:a] *= (np.sin(np.linspace(0, np.pi / 2, a)) ** 2)[:, None]; loop[-b:] *= (np.cos(np.linspace(0, np.pi / 2, b)) ** 2)[:, None]
loudnorm(loop.astype(np.float32).tobytes(), ['-codec:a', 'libmp3lame', '-b:a', '128k', OUT_LOOP], -16.9, -1.5)
sys.stderr.write('loop %.3f - %.3f s (%d bars, %.2f s): %s\n' % (t0, t0 + nL / SR, BARS, nL / SR, OUT_LOOP))

with tempfile.TemporaryDirectory() as d:
    mono = os.path.join(d, 'mono.f32')
    run('-y', '-i', OUT_LOOP, '-vn', '-ac', '1', '-ar', '22050', '-f', 'f32le', mono)
    js = subprocess.run([sys.executable, os.path.join(HERE, 'make_beatmap.py'), mono, str(BEAT), str(PRE)], check=True, stdout=subprocess.PIPE).stdout.decode()
head = ("// Beat map of assets/music_kart.mp3 (the kart circuit), made by tools/make_kart_music.py with tools/make_beatmap.py: the user's 'Road Night 2' (2026-11-10 export) MASTERED, a loop of the\n"
        "// whole track (%d bars, %.2f s), %.2f BPM; `energy` / `kick` = loudness of the whole sound / of the bass, 40 ms windows (25 per second), 0..255. The animation reads them by the audio's currentTime.\n") % (BARS, nL / SR, BPM)
open(OUT_JS, 'w').write(head + js[js.index('const MUSIC_BEATS = '):].replace('const MUSIC_BEATS = ', 'const MUSIC_BEATS_KART = ', 1))
sys.stderr.write('wrote %s\n' % OUT_JS)
