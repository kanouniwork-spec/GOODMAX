#!/usr/bin/env bash
# Re-encodes the owner's product video for scroll scrubbing.
# Short GOP (keyframe every 4 frames) keeps seeking smooth in Chrome/Safari; audio is dropped.
set -euo pipefail
SRC=media-src/product-scroll-original.mp4
OUT=public/media
ffmpeg -v error -y -i "$SRC" -an -c:v libx264 -profile:v high -pix_fmt yuv420p -preset slow -crf 23 \
  -g 4 -keyint_min 4 -sc_threshold 0 -movflags +faststart "$OUT/product-scroll.mp4"
ffmpeg -v error -y -i "$SRC" -an -vf scale=1280:-2 -c:v libx264 -profile:v high -pix_fmt yuv420p -preset slow -crf 25 \
  -g 4 -keyint_min 4 -sc_threshold 0 -movflags +faststart "$OUT/product-scroll-720.mp4"
ffmpeg -v error -y -i "$SRC" -an -c:v libvpx-vp9 -b:v 0 -crf 36 -g 4 -row-mt 1 -deadline good -cpu-used 4 "$OUT/product-scroll.webm" || true
# Poster = exact first frame, so the first paint matches the video
ffmpeg -v error -y -i "$SRC" -frames:v 1 -q:v 3 "$OUT/product-scroll-poster.jpg"
ffmpeg -v error -y -i "$SRC" -frames:v 1 -vf scale=828:-2 -q:v 4 "$OUT/product-scroll-poster-mobile.jpg"
# Product stills from the owner's video (full razor visible, dark studio background — not transparent)
ffmpeg -v error -y -ss 0.2 -i "$SRC" -frames:v 1 -vf "crop=560:1080:680:0" -q:v 3 "$OUT/still-razor-front.jpg"
ffmpeg -v error -y -ss 4.0 -i "$SRC" -frames:v 1 -vf "crop=560:1080:680:0" -q:v 3 "$OUT/still-razor-back.jpg"
ffmpeg -v error -y -ss 12.0 -i "$SRC" -frames:v 1 -vf "crop=1080:1080:420:0" -q:v 3 "$OUT/still-blade-closeup.jpg"
ffmpeg -v error -y -ss 16.0 -i "$SRC" -frames:v 1 -vf "crop=1080:1080:420:0" -q:v 3 "$OUT/still-cartridge.jpg"
ls -la "$OUT"
