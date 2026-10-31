#!/bin/sh
# Builds docs/downloads/zagla-dance-island.mp4 from rendered frames (see render.js). Needs ffmpeg.
#   sh tools/zagla_dance/build.sh FRAMES_DIR            (FRAMES_DIR holds f00000.jpg .. f00954.jpg)
# Video: 955 frames at 30 fps = 31.8 s = 64 beats of the island music (the redone afro Mediterraneo, 120.71 BPM, beat 0.49705 s), from bar 4 (7.9788 s, a kick) to bar 20: 40 beats of groove, 16 of break,
# 8 of finale; 0.25 s fade in, 1.5 s fade out, a little louder than the game's level.
set -e
F="${FFMPEG:-ffmpeg}"; D="$(dirname "$0")"; FR="$1"; DUR=31.8; M0=7.9788
$F -y -loglevel error -framerate 30 -i "$FR/f%05d.jpg" -ss $M0 -t $DUR -i "$D/../../assets/music_coast.mp3" -filter_complex "[1:a]afade=t=in:st=0:d=0.25,afade=t=out:st=30.3:d=1.5,volume=1.5,alimiter=limit=0.93:level=disabled[a]" -map 0:v -map "[a]" -c:v libx264 -preset slow -crf 21 -pix_fmt yuv420p -profile:v high -movflags +faststart -c:a aac -b:a 160k -shortest "$D/../../docs/downloads/zagla-dance-island.mp4"
echo "built docs/downloads/zagla-dance-island.mp4"
