# Rikshaw Love — final render (on the GPU PC, Windows PowerShell)

Picture + sound: 78.00 s, 2340 frames, 30 fps. Sound: `shorts/rikshaw/audio/mix.wav` (-15 LUFS, -1.2 dBTP).
Picture LOCKED 2026-11-19 (verifier round 3). Ready to render.

```powershell
cd D:\Projects\claude-animated-shorts
git pull
cd remotion
npm ci
npx.cmd remotion render src/index.ts RikshawShort2K out/rikshaw/video.mp4 --codec h264 --crf 16 --gl=angle --concurrency=2 --timeout=600000 2>&1 | Tee-Object -FilePath render_rikshaw.log
ffmpeg -i out/rikshaw/video.mp4 -i ../shorts/rikshaw/audio/mix.wav -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 320k -shortest out/rikshaw/rikshaw_love_2k.mp4
```

Result: `remotion\out\rikshaw\rikshaw_love_2k.mp4` (1440x2560).

QA (picture):
```powershell
ffmpeg -hide_banner -i out/rikshaw/rikshaw_love_2k.mp4 -vf "blackdetect=d=0.1:pix_th=0.05,freezedetect=n=0.001:d=0.4" -an -f null - 2>&1 | Select-String "black_start|freeze_start|frame="
```
