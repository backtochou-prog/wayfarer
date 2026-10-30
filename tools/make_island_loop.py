#!/usr/bin/env python3
"""The island's music: assets/music_coast.mp3 and its beat map src3d/music_beats_coast.js, cut from the full 'afro Mediterraneo' track.

    python3 tools/make_island_loop.py "redone - afro Mediteraneo.m4a"        (needs ffmpeg on the PATH, or FFMPEG=/path/to/ffmpeg, and numpy)

The loop is the closing 7 bars of the track (28 beats, 13.92 s). The track is a steady 120.71 BPM (`make_beatmap.py` on the whole track: beat 0.49705 s, first kick 0.026 s), so bar n starts at
FIRST + 4 * n * BEAT. The natural tail of the last bar (what the full track plays after it: about a second of decay) is mixed into the start of the loop, so the repeat has no seam. The level is
brought to -17 LUFS, the loudness the main track (assets/music.mp3) is at, and the mp3 is 128 kbps / 44.1 kHz like it. The beat map is made for the loop itself by tools/make_beatmap.py with the beat
period known (the tempo search is unreliable on a few seconds of music). The cut starts 3 ms before the bar line with a 4 ms fade-in, so the repeat has no click and the first
hit keeps its attack.
"""
import os, re, subprocess, sys, tempfile
import numpy as np

FF = os.environ.get('FFMPEG', 'ffmpeg'); HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
BEAT, FIRST, FROM_BAR, BEATS, LUFS, SR = 0.49705, 0.026, 78, 28, -17.0, 44100
PRE, FADE = 0.003, 0.004                                    # the cut starts PRE s before the bar line and fades in over FADE s

src = sys.argv[1]; out_mp3 = os.path.join(ROOT, 'assets', 'music_coast.mp3'); out_js = os.path.join(ROOT, 'src3d', 'music_beats_coast.js')
run = lambda *a, **k: subprocess.run([FF, '-hide_banner', '-loglevel', 'error', '-nostats', *a], check=True, **k)
x = np.frombuffer(run('-i', src, '-vn', '-ac', '2', '-ar', str(SR), '-f', 'f32le', '-', stdout=subprocess.PIPE).stdout, dtype=np.float32).reshape(-1, 2)

t0 = FIRST + 4 * FROM_BAR * BEAT - PRE; n0 = int(round(t0 * SR)); nL = int(round(BEATS * BEAT * SR))
loop = x[n0:n0 + nL].copy(); tail = x[n0 + nL:]; tl = min(len(tail), nL); loop[:tl] += tail[:tl]; nf = int(FADE * SR); loop[:nf] *= (np.sin(np.linspace(0, np.pi / 2, nf)) ** 2)[:, None]
sys.stderr.write('loop %.3f - %.3f s of %.3f s (tail of %.2f s mixed into its start)\n' % (t0, t0 + nL / SR, len(x) / SR, tl / SR))

# loudness of the loop, then the gain to -17 LUFS (the encode below applies it in float, before the mp3 is written)
r = subprocess.run([FF, '-hide_banner', '-nostats', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', '-af', 'ebur128=framelog=quiet', '-f', 'null', '-'], input=loop.tobytes(), stderr=subprocess.PIPE)
lufs = float(re.findall(r'I:\s+(-?[\d.]+) LUFS', r.stderr.decode())[-1]); gain = LUFS - lufs
sys.stderr.write('loudness %.1f LUFS, gain %.2f dB\n' % (lufs, gain))
run('-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', '-af', 'volume=%.2fdB' % gain, '-codec:a', 'libmp3lame', '-b:a', '128k', '-ar', str(SR), out_mp3, input=loop.tobytes())

with tempfile.TemporaryDirectory() as d:
    mono = os.path.join(d, 'mono.f32')
    run('-y', '-i', out_mp3, '-vn', '-ac', '1', '-ar', '22050', '-f', 'f32le', mono)
    js = subprocess.run([sys.executable, os.path.join(HERE, 'make_beatmap.py'), mono, str(BEAT)], check=True, stdout=subprocess.PIPE).stdout.decode()
first = re.search(r'"first":([\d.]+)', js).group(1)
mm, ss = divmod(t0, 60); mm2, ss2 = divmod(t0 + nL / SR, 60)
head = ("// Beat map of assets/music_coast.mp3 (the island track: the last 7 bars of the user's redone 'afro Mediterraneo', %d:%05.2f to %d:%05.2f of the full track, a %.2f s loop of exactly 28 beats, the natural\n"
        "// tail of the last bar mixed into its start and a 4 ms fade-in from 3 ms before the bar line, so the repeat has no seam or click), made by tools/make_island_loop.py with tools/make_beatmap.py and the beat period of the full track (120.71 BPM): the first\n"
        "// bass hit is at %s s (in this closing passage the bass falls a sixteenth after the beat, so the pulse follows the bass that is heard); `energy` / `kick` = loudness of the whole sound /\n"
        "// of the bass, 40 ms windows (25 per second), 0..255. The animation reads them by the audio's currentTime.\n") % (mm, ss, mm2, ss2, nL / SR, first)
body = js[js.index('const MUSIC_BEATS = '):].replace('const MUSIC_BEATS = ', 'const MUSIC_BEATS_COAST = ', 1)
open(out_js, 'w').write(head + body)
sys.stderr.write('wrote %s (%d bytes) and %s\n' % (out_mp3, os.path.getsize(out_mp3), out_js))
