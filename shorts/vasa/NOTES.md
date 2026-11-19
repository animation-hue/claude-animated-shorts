# Vasa short — delivered 2026-11-19 (accepted by the user)

Final: `remotion/out/vasa/vasa_final_2k.mp4` (rendered on the user's GPU PC), 1440x2560, 30 fps, 68.00 s, -15.0 LUFS, -1.2 dBTP.

## Lessons for the next short
- Final export: render the native `<Name>2K` composition (1440x2560). Remotion 4 refuses `--scale 1.3333` (non-integer height).
- Windows PowerShell: `npx.cmd` (execution policy blocks npx.ps1); `Tee-Object` only exists in PowerShell, not cmd.
- Kenney kit is not in the repo: keep `KENNEY = []` (cartoon vegetation is drawn without it) for a clean log.
- Cloud container has no GPU: stills ~15 s at 0.5, full-res video ~hours. Do look passes here, final render on the GPU PC.
- Chromium in the container: keep REMOTION_TMP short (/tmp/rmt) or the socket path is too long.
- Sun direction is camera-relative per camera segment (story.ts SUN_SEG / segmentOf); small az = backlight.
- Effect cards with soft transparency let world ink show through: use cut-out cards for smoke etc.
- Verifier rounds: 4 (scores 5-7 -> 7-8). Common catches: readability traps (smiley lids, ice-floe splashes, anachronisms).
