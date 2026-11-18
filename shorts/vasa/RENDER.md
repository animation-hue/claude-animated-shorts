# Vasa short — final render (picture LOCKED 2026-11-18, Opus verifier round 4: lock = yes)

Sound is locked to this picture: `shorts/vasa/audio/mix.wav` (68.000 s, 48 kHz, -15 LUFS, -1.2 dBTP).

On a PC with a GPU (Node 20+, Git, ffmpeg):

```bash
git clone -b vasa-short https://github.com/animation-hue/claude-animated-shorts
cd claude-animated-shorts/remotion && npm ci
npx remotion render src/index.ts VasaShort2K out/vasa/video.mp4 --codec h264 --crf 16 --gl=angle --concurrency=2 --timeout=600000
ffmpeg -i out/vasa/video.mp4 -i ../shorts/vasa/audio/mix.wav -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 320k -shortest out/vasa/vasa_final_2k.mp4
```

Result: `remotion/out/vasa/vasa_final_2k.mp4`, 1440x2560, 30 fps, 2040 frames.
Then run QA: `python scripts/short_qa.py out/vasa/vasa_final_2k.mp4 out/vasa/qa` (needs a shots.json; optional).

Notes:
- `VasaShort2K` is the same film as a native 1440x2560 composition (Remotion refuses `--scale 1.3333`: 1920 x 1.3333 is not a whole pixel count).
- Windows PowerShell: type `npx.cmd` instead of `npx` (script execution policy blocks `npx.ps1`).
