#!/usr/bin/env python3
"""The music of the RACE ZONE: assets/music_race.mp3 and its beat map src3d/music_beats_race.js, from the user's track ('redone - Casablanca Trance', 2026-11-03).

    python3 tools/make_race_music.py "redone_-_Casablanca_Trance_....m4a"         (needs ffmpeg on the PATH, or FFMPEG=/path/to/ffmpeg, and numpy)

The export opens on two silent seconds and a long quiet intro (the groove only drops at about 25 s) and ENDS ON A FADE (from 124 s down to silence at 127 s). Played in a loop it would fall silent
in the middle of a race, so the music is a LOOP of 40 bars, from bar 11 (26.31 s, where the groove is running) to bar 51 (121.90 s), both at the same strength: the end runs back into the start on the
beat. The track is a steady 100.43 BPM (beat 0.59745 s, first kick 0.025 s, measured by tools/make_beatmap.py). The cut starts PRE = 50 ms before the bar line with a 4 ms fade-in and ends PRE before
bar 51 with a 6 ms fade-out, so the repeat has no click. The level is brought to -16.9 LUFS like the other two tracks, 128 kbps / 44.1 kHz.
"""
import os, re, subprocess, sys, tempfile
import numpy as np

FF = os.environ.get('FFMPEG', 'ffmpeg'); HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
BEAT, FIRST, FROM_BAR, BARS, LUFS, SR = 0.597452, 0.025, 11, 40, -16.9, 44100
PRE, FIN, FOUT = 0.05, 0.004, 0.006

src = sys.argv[1]; out_mp3 = os.path.join(ROOT, 'assets', 'music_race.mp3'); out_js = os.path.join(ROOT, 'src3d', 'music_beats_race.js')
run = lambda *a, **k: subprocess.run([FF, '-hide_banner', '-loglevel', 'error', '-nostats', *a], check=True, **k)
x = np.frombuffer(run('-i', src, '-vn', '-ac', '2', '-ar', str(SR), '-f', 'f32le', '-', stdout=subprocess.PIPE).stdout, dtype=np.float32).reshape(-1, 2)

t0 = FIRST + 4 * FROM_BAR * BEAT - PRE; n0 = int(round(t0 * SR)); nL = int(round(4 * BARS * BEAT * SR))
audio = x[n0:n0 + nL].copy(); a, b = int(FIN * SR), int(FOUT * SR)
audio[:a] *= (np.sin(np.linspace(0, np.pi / 2, a)) ** 2)[:, None]; audio[-b:] *= (np.cos(np.linspace(0, np.pi / 2, b)) ** 2)[:, None]
sys.stderr.write('loop %.3f - %.3f s of %.3f s (%d bars, %.3f s)\n' % (t0, t0 + nL / SR, len(x) / SR, BARS, nL / SR))

r = subprocess.run([FF, '-hide_banner', '-nostats', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', '-af', 'ebur128=framelog=quiet', '-f', 'null', '-'], input=audio.tobytes(), stderr=subprocess.PIPE)
lufs = float(re.findall(r'I:\s+(-?[\d.]+) LUFS', r.stderr.decode())[-1]); gain = LUFS - lufs
sys.stderr.write('loudness %.1f LUFS, gain %.2f dB\n' % (lufs, gain))
run('-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', '-af', 'volume=%.2fdB' % gain, '-codec:a', 'libmp3lame', '-b:a', '128k', '-ar', str(SR), out_mp3, input=audio.tobytes())

with tempfile.TemporaryDirectory() as d:
    mono = os.path.join(d, 'mono.f32')
    run('-y', '-i', out_mp3, '-vn', '-ac', '1', '-ar', '22050', '-f', 'f32le', mono)
    js = subprocess.run([sys.executable, os.path.join(HERE, 'make_beatmap.py'), mono, str(BEAT)], check=True, stdout=subprocess.PIPE).stdout.decode()
head = ("// Beat map of assets/music_race.mp3 (the race zone), made by tools/make_race_music.py with tools/make_beatmap.py: a LOOP of %d bars (bar %d to bar %d of the user's 'Casablanca Trance', %.2f s: no silent\n"
        "// intro, no fade at the end), 100.43 BPM, first kick at %s s; `energy` / `kick` = loudness of the whole sound / of the bass, 40 ms windows (25 per second), 0..255. The animation reads them by the audio's currentTime.\n"
        ) % (BARS, FROM_BAR, FROM_BAR + BARS, nL / SR, re.search(r'"first":([\d.]+)', js).group(1))
body = js[js.index('const MUSIC_BEATS = '):].replace('const MUSIC_BEATS = ', 'const MUSIC_BEATS_RACE = ', 1)
open(out_js, 'w').write(head + body)
sys.stderr.write('wrote %s (%d bytes) and %s\n' % (out_mp3, os.path.getsize(out_mp3), out_js))
