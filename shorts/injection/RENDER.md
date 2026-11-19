# Injection Ka Khauf (remake) — final render (on the GPU PC, Windows PowerShell)

Picture: 96.4 s, 2892 frames, 30 fps, 69 shots on the original's cut points, a fade to black at the end.
Sound: the ORIGINAL audio, unchanged: `shorts/injection/audio/original_audio.wav` (48 kHz stereo).
The picture is not locked yet. Render after it is approved.

```powershell
cd D:\Projects\claude-animated-shorts
git pull
cd remotion
npm ci
npx.cmd remotion render src/index.ts InjectionShort2K out/injection/video.mp4 --codec h264 --crf 16 --gl=angle --concurrency=2 --timeout=600000 2>&1 | Tee-Object -FilePath render_injection.log
ffmpeg -i out/injection/video.mp4 -i ../shorts/injection/audio/original_audio.wav -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 320k -shortest out/injection/injection_ka_khauf_2k.mp4
```

Result: `remotion\out\injection\injection_ka_khauf_2k.mp4` (1440x2560).

Quick draft first (1080x1920, faster) if you want to check the timing before the 2K render:
```powershell
npx.cmd remotion render src/index.ts InjectionShort out/injection/draft.mp4 --codec h264 --crf 23 --gl=angle --concurrency=2 --timeout=600000
ffmpeg -i out/injection/draft.mp4 -i ../shorts/injection/audio/original_audio.wav -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 256k -shortest out/injection/draft_with_audio.mp4
```
