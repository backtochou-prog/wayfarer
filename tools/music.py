#!/usr/bin/env python3
"""MUSIC: one utility to look at a track and to cut the game's music from it (the loop that plays in a zone), without touching the three dedicated scripts (make_main_music.py, make_island_music.py,
make_race_music.py), which keep the exact recipe of the tracks already in the game.

    python3 tools/music.py look  <audio>                                 what is in the file: length, tempo, first beat, bars, and the loudness second by second (where it is silent, where the groove is)
    python3 tools/music.py cut   <audio> --zone race --from-bar 11 --bars 40      cut a loop and write assets/music_<zone>.mp3 + src3d/music_beats_<zone>.js
    python3 tools/music.py cut   <audio> --zone race --from 26.3 --to 121.9       the same, in seconds instead of bars (snapped to the beat unless --no-snap)
    python3 tools/music.py beats <audio> --zone race                     only redo the beat map of a loop already in assets/ (nothing is re-encoded)

Options of `cut`:
    --zone NAME        which track to write: main, coast, island, race, or any new name (assets/music_NAME.mp3, src3d/music_beats_NAME.js, const MUSIC_BEATS_NAME)
    --from-bar N       the bar the loop starts on (bar 0 is the first beat of the track)          --bars N      how many bars it lasts
    --from S --to S    the same in seconds                                                        --no-snap     do not snap those seconds to the beat
    --bpm X            the tempo, when the search gets it wrong (it is printed by `look`)         --first S     the time of the first beat
    --lufs X           the level to bring the loop to (default -16.9, as the other tracks)        --kbps N      the bit rate (default 128)
    --fade-in MS --fade-out MS    the few milliseconds at the cut (default 4 and 6: no click when the loop repeats)
    --dry-run          say what would be written, write nothing

A loop must START and END ON A BAR LINE and at the same strength, or the repeat is heard: `look` prints the loudness of every bar so a good pair can be picked. Needs ffmpeg on the PATH (or FFMPEG=...)
and numpy. After writing a NEW zone: add <script src="src3d/music_beats_NAME.js"></script> to index.html and play it in src/audio.js (see how the race track is mixed in, GameAudio.tick).
"""
import argparse, json, os, re, subprocess, sys, tempfile
import numpy as np

FF = os.environ.get('FFMPEG', 'ffmpeg'); HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE); SR = 44100
run = lambda *a, **k: subprocess.run([FF, '-hide_banner', '-loglevel', 'error', '-nostats', *a], check=True, **k)


def decode(src, ar=SR, ch=2):
    raw = run('-i', src, '-vn', '-ac', str(ch), '-ar', str(ar), '-f', 'f32le', '-', stdout=subprocess.PIPE).stdout
    x = np.frombuffer(raw, dtype=np.float32)
    return x.reshape(-1, ch) if ch == 2 else x


def tempo(src, bpm=None, first=None):
    """the tempo and the first beat, from tools/make_beatmap.py (it prints them on stderr); either can be given instead"""
    if bpm and first is not None:
        return 60.0 / bpm, first
    with tempfile.TemporaryDirectory() as d:
        mono = os.path.join(d, 'mono.f32'); run('-y', '-i', src, '-vn', '-ac', '1', '-ar', '22050', '-f', 'f32le', mono)
        args = [sys.executable, os.path.join(HERE, 'make_beatmap.py'), mono] + ([str(60.0 / bpm)] if bpm else [])
        r = subprocess.run(args, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, check=True)
        m = re.search(r'tempo ([\d.]+) BPM, first kick ([\d.]+)', r.stderr.decode())
        beat = 60.0 / float(m.group(1)) if not bpm else 60.0 / bpm
        return beat, (first if first is not None else float(m.group(2)))


def look(a):
    x = decode(a.audio, ch=1); dur = len(x) / SR; beat, f0 = tempo(a.audio, a.bpm, a.first); bar = 4 * beat
    print('%s: %.2f s, %.2f BPM (beat %.5f s, bar %.4f s), first beat %.4f s, %.1f bars' % (os.path.basename(a.audio), dur, 60 / beat, beat, bar, f0, (dur - f0) / bar))
    rms = lambda s, e: float(np.sqrt((x[max(0, int(s * SR)):int(e * SR)] ** 2).mean() + 1e-12))
    peak = max(rms(t, t + 1) for t in range(int(dur)))
    print('\nloudness per second (0-9 of the loudest second, . is silence):')
    line = ''.join('.' if rms(t, t + 1) < peak * 0.04 else str(min(9, int(rms(t, t + 1) / peak * 9.99))) for t in range(int(dur)))
    for i in range(0, len(line), 60):
        print('  %4d s  %s' % (i, line[i:i + 60]))
    print('\nloudness per bar (bar number every 10):')
    n = int((dur - f0) / bar); lv = [rms(f0 + k * bar, f0 + (k + 1) * bar) for k in range(n)]
    bl = ''.join('.' if v < peak * 0.04 else str(min(9, int(v / peak * 9.99))) for v in lv)
    for i in range(0, len(bl), 60):
        print('  bar %4d  %s' % (i, bl[i:i + 60]))
    print('\na loop wants two bars of the same strength: e.g. --from-bar %d --bars %d' % (next((k for k, v in enumerate(lv) if v > peak * 0.5), 0), max(8, n - 8)))


def cut(a):
    beat, f0 = tempo(a.audio, a.bpm, a.first); bar = 4 * beat; x = decode(a.audio)
    if a.from_bar is not None:
        t0 = f0 + a.from_bar * bar; t1 = t0 + (a.bars or 40) * bar
    else:
        if a.start is None or a.end is None: sys.exit('give --from-bar/--bars or --from/--to')
        t0, t1 = a.start, a.end
        if not a.no_snap:
            t0 = f0 + round((t0 - f0) / bar) * bar; t1 = f0 + round((t1 - f0) / bar) * bar
    pre = 0.05; n0 = int(round((t0 - pre) * SR)); nL = int(round((t1 - t0) * SR))
    if n0 < 0 or n0 + nL > len(x): sys.exit('the loop falls outside the file (%.2f - %.2f s of %.2f s)' % (t0, t1, len(x) / SR))
    audio = x[n0:n0 + nL].copy()
    fi, fo = int(a.fade_in / 1000 * SR), int(a.fade_out / 1000 * SR)
    audio[:fi] *= (np.sin(np.linspace(0, np.pi / 2, fi)) ** 2)[:, None]; audio[-fo:] *= (np.cos(np.linspace(0, np.pi / 2, fo)) ** 2)[:, None]
    r = subprocess.run([FF, '-hide_banner', '-nostats', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', '-af', 'ebur128=framelog=quiet', '-f', 'null', '-'], input=audio.tobytes(), stderr=subprocess.PIPE)
    lufs = float(re.findall(r'I:\s+(-?[\d.]+) LUFS', r.stderr.decode())[-1]); gain = a.lufs - lufs
    mp3 = os.path.join(ROOT, 'assets', 'music_%s.mp3' % a.zone if a.zone != 'main' else 'assets/music.mp3')
    js = os.path.join(ROOT, 'src3d', 'music_beats_%s.js' % a.zone if a.zone != 'main' else 'src3d/music_beats.js')
    print('loop %.3f - %.3f s (%.3f s, %.1f bars) of %.2f s, %.1f LUFS %+.2f dB -> %s' % (t0, t1, nL / SR, (t1 - t0) / bar, len(x) / SR, lufs, gain, os.path.relpath(mp3, ROOT)))
    if a.dry_run: return
    run('-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', '-af', 'volume=%.2fdB' % gain, '-codec:a', 'libmp3lame', '-b:a', '%dk' % a.kbps, '-ar', str(SR), mp3, input=audio.tobytes())
    write_beats(mp3, js, a.zone, beat)


def write_beats(mp3, js, zone, beat=None):
    with tempfile.TemporaryDirectory() as d:
        mono = os.path.join(d, 'mono.f32'); run('-y', '-i', mp3, '-vn', '-ac', '1', '-ar', '22050', '-f', 'f32le', mono)
        out = subprocess.run([sys.executable, os.path.join(HERE, 'make_beatmap.py'), mono] + ([str(beat)] if beat else []), check=True, stdout=subprocess.PIPE).stdout.decode()
    name = 'MUSIC_BEATS' if zone == 'main' else 'MUSIC_BEATS_%s' % zone.upper()
    body = out[out.index('const MUSIC_BEATS = '):].replace('const MUSIC_BEATS = ', 'const %s = ' % name, 1)
    d = json.loads(body[body.index('= ') + 2:].rstrip(';\n'))
    head = ('// Beat map of %s, made by tools/music.py with tools/make_beatmap.py: %.2f s at %.2f BPM, first beat at %s s; `energy` / `kick` = loudness of the whole sound / of the bass,\n'
            '// 40 ms windows (25 per second), 0..255. The animation reads them by the audio\'s currentTime.\n') % (os.path.relpath(mp3, ROOT), d['duration'], 60 / d['beat'], d['first'])
    open(js, 'w').write(head + body)
    print('wrote %s (%d kB) and %s (%s)' % (os.path.relpath(mp3, ROOT), os.path.getsize(mp3) // 1024, os.path.relpath(js, ROOT), name))


def beats(a):
    mp3 = os.path.join(ROOT, 'assets', 'music_%s.mp3' % a.zone if a.zone != 'main' else 'assets/music.mp3')
    js = os.path.join(ROOT, 'src3d', 'music_beats_%s.js' % a.zone if a.zone != 'main' else 'src3d/music_beats.js')
    if not os.path.exists(mp3): sys.exit('no %s' % mp3)
    write_beats(mp3, js, a.zone, 60.0 / a.bpm if a.bpm else None)


ap = argparse.ArgumentParser(description='look at a track, cut the game\'s music from it, or redo a beat map', formatter_class=argparse.RawDescriptionHelpFormatter, epilog=__doc__)
sub = ap.add_subparsers(dest='cmd', required=True)
p = sub.add_parser('look'); p.add_argument('audio'); p.add_argument('--bpm', type=float); p.add_argument('--first', type=float); p.set_defaults(fn=look)
p = sub.add_parser('cut'); p.add_argument('audio'); p.add_argument('--zone', required=True); p.add_argument('--from-bar', type=int, dest='from_bar'); p.add_argument('--bars', type=int)
p.add_argument('--from', type=float, dest='start'); p.add_argument('--to', type=float, dest='end'); p.add_argument('--no-snap', action='store_true')
p.add_argument('--bpm', type=float); p.add_argument('--first', type=float); p.add_argument('--lufs', type=float, default=-16.9); p.add_argument('--kbps', type=int, default=128)
p.add_argument('--fade-in', type=float, default=4, dest='fade_in'); p.add_argument('--fade-out', type=float, default=6, dest='fade_out'); p.add_argument('--dry-run', action='store_true'); p.set_defaults(fn=cut)
p = sub.add_parser('beats'); p.add_argument('--zone', required=True); p.add_argument('--bpm', type=float); p.set_defaults(fn=beats)
a = ap.parse_args(); a.fn(a)
