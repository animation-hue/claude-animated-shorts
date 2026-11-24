# किसान रामू और विद्या – करेला बना खेत का रखवाला — render (Windows PowerShell)

16:9 landscape, 24 fps, 340.4 s (5:40). Sound: `shorts/karela/audio/mix.wav` (narrator + Ramu + Vidya, score, SFX;
-15 LUFS, -1.2 dBTP).

Run each command on its own, from the project folder (`D:\Projects\claude-animated-shorts` on the GPU PC):

```powershell
git pull
cd remotion
npm.cmd ci
```

Draft, 1920x1080:
```powershell
npx.cmd remotion render src/index.ts KarelaFilm out/karela/draft.mp4 --codec h264 --crf 23 --gl=angle --concurrency=2 --timeout=600000
npx.cmd remotion ffmpeg -i out/karela/draft.mp4 -i ../shorts/karela/audio/mix.wav -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 256k -shortest out/karela/karela_draft.mp4
```

Final 2K, 2560x1440:
```powershell
npx.cmd remotion render src/index.ts KarelaFilm2K out/karela/video.mp4 --codec h264 --crf 16 --gl=angle --concurrency=2 --timeout=600000
npx.cmd remotion ffmpeg -i out/karela/video.mp4 -i ../shorts/karela/audio/mix.wav -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 320k -shortest out/karela/karela_2k.mp4
```
