# Remotion project (cloud/Linux)

- `src/videos/bridge/` — untouched bridge template (reference, renders as `BridgeShort`).
- `src/videos/vasa/` — the Vasa short (`VasaShort`, 2040 f = 68.00 s voice), forked from the bridge.
- `public/vasa/` — `voice.wav`, `words.json` (from `../shorts/vasa/voice/`).

```bash
npm ci
REMOTION_TMP=/tmp/rmt node scripts/stills.mjs VasaShort out/vasa/x_ 100,400 0.5
```

Notes: `stills.mjs` is the Linux port of `bridge-stills.mjs` (Chromium at `/opt/pw-browsers/chromium`, `GL=swangle` software WebGL
by default, ~22 s per 0.5 still). Keep `REMOTION_TMP` short: Chromium aborts if its socket path is too long.
Kenney `.glb` props are optional (`public/vasa/kenney/`); missing ones are skipped.
