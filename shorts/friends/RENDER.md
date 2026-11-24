# Two Friends and the Bear (दो दोस्त और भालू) — render on the GPU PC (Windows PowerShell)

Picture + sound: 188.0 s, 5640 frames, 30 fps. Sound: `shorts/friends/audio/mix.wav` (Hindi narration + score + SFX,
-15 LUFS, -1.2 dBTP).

Run each command on its own, from `D:\Projects\claude-animated-shorts`:

```powershell
git pull
cd remotion
npm.cmd ci
```

Quick draft (1080x1920) to check the picture and timing:
```powershell
npx.cmd remotion render src/index.ts FriendsShort out/friends/draft.mp4 --codec h264 --crf 23 --gl=angle --concurrency=2 --timeout=600000
ffmpeg -i out/friends/draft.mp4 -i ../shorts/friends/audio/mix.wav -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 256k -shortest out/friends/draft_with_audio.mp4
```

Final 2K (1440x2560):
```powershell
npx.cmd remotion render src/index.ts FriendsShort2K out/friends/video.mp4 --codec h264 --crf 16 --gl=angle --concurrency=2 --timeout=600000
ffmpeg -i out/friends/video.mp4 -i ../shorts/friends/audio/mix.wav -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 320k -shortest out/friends/two_friends_and_the_bear_2k.mp4
```

Result: `remotion\out\friends\two_friends_and_the_bear_2k.mp4`.
