#!/bin/sh
set -eu

if [ "$#" -lt 2 ] || [ "$#" -gt 3 ]; then
  echo "Usage: sh development/prime-demo/export-upload.sh INPUT.mp4 OUTPUT.mp4 [CRF]" >&2
  exit 2
fi

mkdir -p "$(dirname "$2")"
"${FFMPEG:-ffmpeg}" -hide_banner -loglevel error -n \
  -i "$1" -map 0:v:0 -an -sn -dn \
  -vf "setparams=range=limited:color_primaries=bt709:color_trc=bt709:colorspace=bt709" \
  -c:v libx264 -preset slow -crf "${3:-23}" \
  -profile:v high -level:v 5.0 -bf 3 -pix_fmt yuv420p \
  -color_range tv -colorspace bt709 -color_primaries bt709 -color_trc bt709 \
  -tag:v avc1 -r 30 -fps_mode cfr -movflags +faststart "$2"
