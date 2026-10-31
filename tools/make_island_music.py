#!/usr/bin/env python3
"""The island's music: assets/music_coast.mp3 and its beat map src3d/music_beats_coast.js, from the full 'afro Mediterraneo' track.

    python3 tools/make_island_music.py "redone - afro Mediteraneo.m4a"            the WHOLE track (170 s, 85 bars, a steady 120.71 BPM)
    python3 tools/make_island_music.py "redone - afro Mediteraneo.m4a" --loop     only its closing 7 bars, a seamless loop (28 beats, 13.92 s): the first cut, kept for reference

(needs ffmpeg on the PATH, or FFMPEG=/path/to/ffmpeg, and numpy). The level is brought to -17 LUFS, the loudness the main track (assets/music.mp3) is at, so the crossfade into it has no jump (the redone track
is much louder, -10 LUFS: it is lowered by about 6.7 dB); the mp3 is 128 kbps / 44.1 kHz like it. A 2 ms fade-in and a 0.3 s fade-out take the clicks off the two ends of the file. The beat map is made by
tools/make_beatmap.py: for the whole track it finds the tempo and the first kick itself (beat 0.49705 s, first kick 0.026 s); for the loop it is given that beat period (the tempo search is unreliable on a few seconds
of music). The loop (--loop) is bars FROM_BAR .. FROM_BAR + 6, bar n starting at FIRST + 4 * n * BEAT; the natural tail of the last bar (about a second of decay in the full track) is mixed into its start, and the cut
starts 3 ms before the bar line with a 4 ms fade-in, so the repeat has no seam or click and the first hit keeps its attack.
"""
import os, re, subprocess, sys, tempfile
import numpy as np

FF = os.environ.get('FFMPEG', 'ffmpeg'); HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
BEAT, FIRST, FROM_BAR, BEATS, LUFS, SR = 0.49705, 0.026, 78, 28, -17.0, 44100
PRE, FADE = 0.003, 0.004                                    # the loop starts PRE s before the bar line and fades in over FADE s

LOOP = '--loop' in sys.argv; src = [a for a in sys.argv[1:] if not a.startswith('--')][0]
out_mp3 = os.path.join(ROOT, 'assets', 'music_coast.mp3'); out_js = os.path.join(ROOT, 'src3d', 'music_beats_coast.js')
run = lambda *a, **k: subprocess.run([FF, '-hide_banner', '-loglevel', 'error', '-nostats', *a], check=True, **k)
x = np.frombuffer(run('-i', src, '-vn', '-ac', '2', '-ar', str(SR), '-f', 'f32le', '-', stdout=subprocess.PIPE).stdout, dtype=np.float32).reshape(-1, 2)

if LOOP:
    t0 = FIRST + 4 * FROM_BAR * BEAT - PRE; n0 = int(round(t0 * SR)); nL = int(round(BEATS * BEAT * SR))
    audio = x[n0:n0 + nL].copy(); tail = x[n0 + nL:]; tl = min(len(tail), nL); audio[:tl] += tail[:tl]; nf = int(FADE * SR); audio[:nf] *= (np.sin(np.linspace(0, np.pi / 2, nf)) ** 2)[:, None]
    sys.stderr.write('loop %.3f - %.3f s of %.3f s (tail of %.2f s mixed into its start)\n' % (t0, t0 + nL / SR, len(x) / SR, tl / SR))
else:
    t0 = 0.0; nL = len(x); audio = x.copy(); a, b = int(0.002 * SR), int(0.3 * SR); audio[:a] *= np.linspace(0, 1, a)[:, None]; audio[-b:] *= np.linspace(1, 0, b)[:, None]
    sys.stderr.write('the whole track, %.3f s\n' % (nL / SR))

# loudness, then the gain to -17 LUFS (the encode below applies it in float, before the mp3 is written)
r = subprocess.run([FF, '-hide_banner', '-nostats', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', '-af', 'ebur128=framelog=quiet', '-f', 'null', '-'], input=audio.tobytes(), stderr=subprocess.PIPE)
lufs = float(re.findall(r'I:\s+(-?[\d.]+) LUFS', r.stderr.decode())[-1]); gain = LUFS - lufs
sys.stderr.write('loudness %.1f LUFS, gain %.2f dB\n' % (lufs, gain))
run('-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', '-af', 'volume=%.2fdB' % gain, '-codec:a', 'libmp3lame', '-b:a', '128k', '-ar', str(SR), out_mp3, input=audio.tobytes())

with tempfile.TemporaryDirectory() as d:
    mono = os.path.join(d, 'mono.f32')
    run('-y', '-i', out_mp3, '-vn', '-ac', '1', '-ar', '22050', '-f', 'f32le', mono)
    js = subprocess.run([sys.executable, os.path.join(HERE, 'make_beatmap.py'), mono] + ([str(BEAT)] if LOOP else []), check=True, stdout=subprocess.PIPE).stdout.decode()
first = re.search(r'"first":([\d.]+)', js).group(1)
mm, ss = divmod(t0, 60); mm2, ss2 = divmod(t0 + nL / SR, 60)
if LOOP:
    head = ("// Beat map of assets/music_coast.mp3 (the island track: the last 7 bars of the user's redone 'afro Mediterraneo', %d:%05.2f to %d:%05.2f of the full track, a %.2f s loop of exactly 28 beats, the natural\n"
            "// tail of the last bar mixed into its start and a 4 ms fade-in from 3 ms before the bar line, so the repeat has no seam or click), made by tools/make_island_music.py --loop with tools/make_beatmap.py and the beat period of the\n"
            "// full track (120.71 BPM): the first bass hit is at %s s; `energy` / `kick` = loudness of the whole sound / of the bass, 40 ms windows (25 per second), 0..255. The animation reads them by the audio's currentTime.\n") % (mm, ss, mm2, ss2, nL / SR, first)
else:
    head = ("// Beat map of assets/music_coast.mp3 (the island track: the WHOLE of the user's redone 'afro Mediterraneo', %.1f s, 85 bars at a steady %.2f BPM), made by tools/make_island_music.py with tools/make_beatmap.py:\n"
            "// first kick at %s s; `energy` / `kick` = loudness of the whole sound / of the bass, 40 ms windows (25 per second), 0..255. The animation reads them by the audio's currentTime.\n") % (nL / SR, float(re.search(r'"bpm":([\d.]+)', js).group(1)), first)
body = js[js.index('const MUSIC_BEATS = '):].replace('const MUSIC_BEATS = ', 'const MUSIC_BEATS_COAST = ', 1)
open(out_js, 'w').write(head + body)
sys.stderr.write('wrote %s (%d bytes) and %s\n' % (out_mp3, os.path.getsize(out_mp3), out_js))
