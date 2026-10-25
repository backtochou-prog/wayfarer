#!/bin/sh
# Builds docs/downloads/dabke-neon-quarter.mp4 from rendered frames (see render.js). Needs ffmpeg and python3 + numpy.
#   sh tools/dabke_video/build.sh FRAMES_DIR            (FRAMES_DIR holds f00000.jpg .. f01001.jpg)
# Video: 1002 frames at 30 fps = 33.4 s = 65.5 beats of the track (117.73 BPM, beat 0.50964 s). Music: the track from 136.604 s (a bar line with steady energy), the dabke drums
# (make_drums.py: the maqsum rhythm, stamps on the dancers' steps, claps) on the same beat grid, 25 ms fade in, 1.4 s fade out.
set -e
F="${FFMPEG:-ffmpeg}"; D="$(dirname "$0")"; FR="$1"; TMP="$(mktemp -d)"; DUR=33.4; M0=136.60392
python3 "$D/make_drums.py" "$TMP/drums.wav" 33.6 0.50964
$F -y -loglevel error -ss $M0 -t $DUR -i "$D/../../assets/music.mp3" -i "$TMP/drums.wav" -filter_complex "[0:a]afade=t=in:st=0:d=0.25,afade=t=out:st=32:d=1.4,volume=0.95[m];[1:a]atrim=0:$DUR,afade=t=out:st=32.4:d=1.0,volume=0.6[d];[m][d]amix=inputs=2:normalize=0:duration=first,alimiter=limit=0.93:level=disabled[a]" -map "[a]" -ar 44100 -ac 2 "$TMP/mix.wav"
$F -y -loglevel error -framerate 30 -i "$FR/f%05d.jpg" -i "$TMP/mix.wav" -c:v libx264 -preset slow -crf 21 -pix_fmt yuv420p -profile:v high -movflags +faststart -c:a aac -b:a 160k -shortest "$D/../../docs/downloads/dabke-neon-quarter.mp4"
echo "built docs/downloads/dabke-neon-quarter.mp4"
