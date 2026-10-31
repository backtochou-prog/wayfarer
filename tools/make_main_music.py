#!/usr/bin/env python3
"""The main music: assets/music.mp3 and its beat map src3d/music_beats.js, from the user's track (the export 'Deep Disco' of 2022-06-10, the same recording as 'Aqualand').

    python3 tools/make_main_music.py "Deep_Disco__2022-06-10_23_07.m4a"             (needs ffmpeg on the PATH, or FFMPEG=/path/to/ffmpeg, and numpy)

The export has a SILENT start (2 s of nothing, then a quiet intro with two pauses, at 3.5 s and 7.5 s: the first 8 seconds) and it ENDS AT FULL POWER, cut dead (the export stops in the middle of the loudest
passage, 2:52.7: there is no ending). Played in a loop it would stop, go silent for two seconds and stutter through the intro every time round, in the middle of the activity. So the music is a LOOP of exactly 80
bars, from bar 4, where the full groove drops (8.17 s), to bar 84 (171.26 s): the loud end runs straight into the loud drop, on the beat. The track is a steady 117.73 BPM (beat 0.50964 s, first kick 0.0204 s,
bar n starting at FIRST + 4 * n * BEAT, measured by tools/make_beatmap.py). The cut starts PRE = 50 ms before the bar line (the drop's first hit starts 40 ms ahead of it) with a 4 ms fade-in, and ends PRE before bar 84 with
a 6 ms fade-out, so the repeat has no click and the first hit keeps its attack; the game's <audio loop> repeats it without a gap (the mp3 carries its encoder delay and padding). The level is brought to -16.9 LUFS, as
before (the first version was the whole track lowered 3 dB, -16.9 LUFS), 128 kbps / 44.1 kHz. The beat map is made for the loop with the beat period known (the position of the first kick is searched: the kicks of the drop fall about 20 ms ahead of the grid of the whole track).
"""
import os, re, subprocess, sys, tempfile
import numpy as np

FF = os.environ.get('FFMPEG', 'ffmpeg'); HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
BEAT, FIRST, FROM_BAR, BARS, LUFS, SR = 0.50964, 0.0204, 4, 80, -16.9, 44100
PRE, FIN, FOUT = 0.05, 0.004, 0.006

src = sys.argv[1]; out_mp3 = os.path.join(ROOT, 'assets', 'music.mp3'); out_js = os.path.join(ROOT, 'src3d', 'music_beats.js')
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
head = ("// Beat map of assets/music.mp3, made by tools/make_main_music.py with tools/make_beatmap.py: the music is a LOOP of 80 bars (bar 4 to bar 84 of the user's track, %.2f s: no silent intro, no pause, no dead end), "
        "117.73 BPM,\n// first kick at %s s; `energy` / `kick` = loudness of the whole sound / of the bass, 40 ms windows (25 per second), 0..255. The animation reads them by the audio's currentTime.\n") % (nL / SR, re.search(r'"first":([\d.]+)', js).group(1))
body = js[js.index('const MUSIC_BEATS = '):]
open(out_js, 'w').write(head + body)
sys.stderr.write('wrote %s (%d bytes) and %s\n' % (out_mp3, os.path.getsize(out_mp3), out_js))
