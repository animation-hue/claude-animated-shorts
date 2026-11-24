# The Bridge That Fell for a Song - soundtrack cue sheet

All sound is original: synthesized in numpy/scipy by `sfx_gen.py` / `instruments.py`, placed by `sfx.py` / `music.py`, mixed by `mix.py`.
Voice = `voice/voice.wav`, gain only (no EQ, no compression, no pitch).

## Files
| file | content |
|---|---|
| `mix.wav` | final mix, 48 kHz, stereo, 24-bit, 3,240,000 samples = 67.500 s |
| `stem_voice.wav` / `stem_music.wav` / `stem_sfx.wav` | stems at mix gain (they sum to the mix before the master limiter) |

## Master loudness (own BS.1770-4 meter)
- Integrated **-15.0 LUFS**, true peak **-1.2 dBTP**, LRA 2.7 LU, max momentary -9.5 LUFS, max short-term -13.2 LUFS
- Stems: voice -14.7 LUFS, music -25.4 LUFS, sfx -38.9 LUFS (voice gain +1.58 dB, same gain on every stem)
- Master limiter (4x oversampled look-ahead, ceiling -1.2 dBTP): max gain reduction 3.05 dB, active (>0.1 dB) on 9.55 % of samples, >0.5 dB on 3.17 %

ffmpeg ebur128 cross-check:
```
Summary:
  Integrated loudness:
    I:         -15.0 LUFS
    Threshold: -25.3 LUFS
  Loudness range:
    LRA:         2.7 LU
    Threshold: -35.3 LUFS
    LRA low:   -16.6 LUFS
    LRA high:  -13.9 LUFS
  True peak:
    Peak:       -1.2 dBFS
```

## Voice on top: per-section loudness (LUFS, integrated per stem, at mix gain)
bed = music + sfx. margin = voice - bed (integrated over the section). speech median / p10 = median and 10th percentile of the 400 ms momentary margin (voice - bed) over windows centred on spoken words.

| section (shots) | time s | voice | music | sfx | bed | margin LU | speech median LU | speech p10 LU |
|---|---|---|---|---|---|---|---|---|
| friends (1-4) | 0.00-13.20 | -15.3 | -24.8 | -38.2 | -24.6 | 9.3 | 8.9 | 4.2 |
| journey (5-11) | 13.20-44.85 | -15.1 | -25.1 | -38.8 | -24.9 | 9.8 | 9.5 | 4.2 |
| alarms (12-22) | 44.85-71.65 | -14.5 | -24.5 | -35.9 | -24.2 | 9.7 | 10.3 | 4.5 |
| bear+run (23-29) | 71.65-92.70 | -14.5 | -24.3 | -33.7 | -24.0 | 9.5 | 9.2 | 3.6 |
| alone+memory (30-31) | 92.70-104.35 | -13.8 | -25.4 | -45.3 | -25.3 | 11.5 | 12.2 | 7.4 |
| playing dead (32-41) | 104.35-138.15 | -15.0 | -29.8 | -41.3 | -30.0 | 15.0 | 17.3 | 9.9 |
| after (42-46) | 138.15-165.95 | -14.2 | -25.8 | -41.4 | -25.7 | 11.5 | 11.9 | 4.4 |
| handshake (47-50) | 165.95-179.40 | -15.3 | -26.9 | -40.3 | -26.7 | 11.4 | 11.3 | 6.2 |
| moral (51) | 179.40-188.00 | -13.9 | -24.1 | -42.6 | -24.1 | 10.1 | 9.3 | 4.8 |

## Music map (original love theme, G major pentatonic, 92 bpm)
Music target per section, LU under the voice (after a -3 dB speech duck keyed from words.json): friends -9.5, journey -10.0, alarms -10.0, bear -11.0, run -9.0, alone -12.0, memory -11.0, still -15.0, relief -11.0, lesson -12.0, handshake -11.0, moral -9.5. Applied section gains (dB): friends -5.5, journey -5.4, alarms -0.9, bear -2.5, run -2.7, alone -5.4, memory -3.8, still -0.9, relief -1.6, lesson -3.3, handshake -4.6, moral -5.2.

Rides (music only, dB): 160.20-165.50 s -1.5, 179.40-185.60 s -1.0 - so quiet sentence-final words stay on top and the band blooms in the gaps after them. 

| time s | frame | music |
|---|---|---|
| 0.00 | 0 | friends: drone + santoor ripples + the friendship motif on the fife |
| 5.48 | 164 | the secret handshake: a pluck + glock hit on each slap, slap, bump, thumbs |
| 13.35 | 400 | journey: a walking bass of plucks + brushes under the motif |
| 35.11 | 1053 | 'sher, saanp, bhoot': three proud tuba bumps |
| 38.00 | 1140 | the tall quiet jungle: the motif on vibes, slower |
| 44.90 | 1347 | false alarms: tiptoe pizzicato; timpani + glock hit on each jump, bigger each time |
| 71.65 | 2150 | the bear: everything stops; a low drone; a timpani + low brass hit as it steps out |
| 82.25 | 2468 | Ram runs: snare roll + racing low plucks; a horn stab when he reaches the top |
| 92.80 | 2784 | Shyam alone: the motif in minor on a lone pluck |
| 98.25 | 2948 | Grandma's memory: the motif on a music box |
| 104.35 | 3130 | playing dead: only a very low drone |
| 110.20 | 3306 | the bear sniffs: a soft slow heartbeat, stopping for the whisper |
| 143.00 | 4290 | Ram climbs down: a sneaky descending pluck |
| 156.40 | 4692 | the lesson: the motif slow and minor on vibes |
| 169.89 | 5097 | the handshake again: only two hits, then silence where the bump should be |
| 179.50 | 5385 | the moral: the full theme, warm and soft |
| 185.24 | 5557 | a soft D major button on the last word |

## SFX events
Level convention: every EVENT has a naive level (LU vs the voice stem, as the event's max momentary loudness); applied = naive - 6 dB (standard mix rule) + distance/intensity offsets. BEDS are integrated loudness, not reduced. 'mix LUFS' = the event's max momentary loudness in the final mix (voice stem = -14.7 LUFS integrated). Column sounds also get the camera-distance low-pass and more valley reverb.

| # | time s | frame | cue | what | naive LU | applied LU | mix LUFS | pan |
|---|---|---|---|---|---|---|---|---|
| 1 | 0.000 | 0.0 | amb (bed, integrated) | village morning: birds, a soft breeze | -29 | -29.0 | -43.7 | +0.00 |
| 2 | 5.480 | 164.4 | hand | slap (first) | -10 | -16.0 | -30.7 | +0.00 |
| 3 | 6.300 | 189.0 | hand | slap (first) | -10 | -16.0 | -30.7 | +0.00 |
| 4 | 7.150 | 214.5 | hand | fist bump (first) | -10 | -16.0 | -30.7 | +0.00 |
| 5 | 8.050 | 241.5 | hand | thumbs-up pop (first) | -10 | -16.0 | -30.7 | +0.00 |
| 6 | 13.300 | 399.0 | steps | footsteps on the dirt path: the friends set off | -20 | -26.0 | -40.7 | +0.00 |
| 7 | 26.300 | 789.0 | hand | slap (the promise) | -10 | -16.0 | -30.7 | +0.00 |
| 8 | 27.270 | 818.1 | hand | slap (the promise) | -10 | -16.0 | -30.7 | +0.00 |
| 9 | 27.950 | 838.5 | hand | fist bump (the promise) | -10 | -16.0 | -30.7 | +0.00 |
| 10 | 28.630 | 858.9 | hand | thumbs-up pop (the promise) | -10 | -16.0 | -30.7 | +0.00 |
| 11 | 29.600 | 888.0 | amb (bed, integrated) | the jungle: birds high and low, insects, leaves | -28 | -28.0 | -42.7 | +0.00 |
| 12 | 29.700 | 891.0 | steps | footsteps on the dirt path: into the jungle | -20 | -26.0 | -40.7 | +0.00 |
| 13 | 35.060 | 1051.8 | swish | Ram swishes his stick like a sword | -14 | -20.0 | -34.7 | +0.00 |
| 14 | 38.000 | 1140.0 | steps | footsteps on the dirt path: deep in the jungle | -20 | -26.0 | -40.7 | +0.00 |
| 15 | 45.380 | 1361.4 | rustle | the bush rustles | -12 | -18.0 | -32.7 | -0.20 |
| 16 | 47.200 | 1416.0 | jump | Ram jumps (small) | -12 | -18.0 | -32.7 | +0.00 |
| 17 | 47.693 | 1430.8 | land | and lands | -12 | -18.0 | -32.7 | +0.00 |
| 18 | 48.250 | 1447.5 | hop | the rabbit hops away | -22 | -28.0 | -42.7 | -0.30 |
| 19 | 48.580 | 1457.4 | hop | the rabbit hops away | -22 | -28.0 | -42.7 | -0.30 |
| 20 | 48.910 | 1467.3 | hop | the rabbit hops away | -22 | -28.0 | -42.7 | -0.30 |
| 21 | 49.240 | 1477.2 | hop | the rabbit hops away | -22 | -28.0 | -42.7 | -0.30 |
| 22 | 49.600 | 1488.0 | steps | footsteps on the dirt path: walking on, warier | -20 | -26.0 | -40.7 | +0.00 |
| 23 | 50.900 | 1527.0 | growl | a deep, heavy growl... Shyam's stomach | -9 | -15.0 | -29.7 | +0.00 |
| 24 | 53.750 | 1612.5 | jump | Ram jumps (higher) | -10 | -16.0 | -30.7 | +0.00 |
| 25 | 54.355 | 1630.6 | land | and lands | -12 | -18.0 | -32.7 | +0.00 |
| 26 | 54.800 | 1644.0 | steps | footsteps on the dirt path: walking on | -20 | -26.0 | -40.7 | +0.00 |
| 27 | 58.200 | 1746.0 | wings | a huge shadow: slow, heavy wing beats overhead | -12 | -18.0 | -32.7 | +0.00 |
| 28 | 61.400 | 1842.0 | jump | Ram jumps (huge) | -8 | -14.0 | -28.7 | +0.00 |
| 29 | 61.900 | 1857.0 | shoes | his shoes pop off | -14 | -20.0 | -34.7 | +0.00 |
| 30 | 62.167 | 1865.0 | land | and lands | -12 | -18.0 | -32.7 | +0.00 |
| 31 | 63.400 | 1902.0 | shoes_land | the shoes land | -18 | -24.0 | -38.7 | +0.00 |
| 32 | 66.200 | 1986.0 | honk | the hornbill: an unimpressed 'hrmph' | -12 | -18.0 | -32.7 | +0.30 |
| 33 | 71.600 | 2148.0 | amb (bed, integrated) | the bear: the birds go silent, only wind | -33 | -33.0 | -47.7 | +0.00 |
| 34 | 72.570 | 2177.1 | bush_open | the bushes part: a big rustle and a snapping twig | -9 | -15.0 | -29.7 | +0.30 |
| 35 | 72.900 | 2187.0 | paw | heavy paw steps | -14 | -20.0 | -34.7 | +0.25 |
| 36 | 73.450 | 2203.5 | paw | heavy paw steps | -14 | -20.0 | -34.7 | +0.25 |
| 37 | 74.000 | 2220.0 | paw | heavy paw steps | -14 | -20.0 | -34.7 | +0.25 |
| 38 | 74.550 | 2236.5 | paw | heavy paw steps | -14 | -20.0 | -34.7 | +0.25 |
| 39 | 74.600 | 2238.0 | huff | the bear huffs | -8 | -14.0 | -28.7 | +0.20 |
| 40 | 75.100 | 2253.0 | paw | heavy paw steps | -14 | -20.0 | -34.7 | +0.25 |
| 41 | 82.250 | 2467.5 | stick | Ram drops his stick: a wooden clatter | -11 | -17.0 | -31.7 | +0.00 |
| 42 | 83.100 | 2493.0 | run | Ram's running footsteps | -14 | -20.0 | -34.7 | +0.00 |
| 43 | 86.200 | 2586.0 | climb | scrambling up the bark | -14 | -20.0 | -34.7 | +0.20 |
| 44 | 98.200 | 2946.0 | amb (bed, integrated) | Grandma's memory: soft village birds | -31 | -31.0 | -45.7 | +0.00 |
| 45 | 106.100 | 3183.0 | lie | Shyam drops flat on the path | -16 | -22.0 | -36.7 | +0.00 |
| 46 | 108.800 | 3264.0 | inhale | he holds his breath (a quick inhale, then nothing) | -18 | -24.0 | -38.7 | +0.00 |
| 47 | 110.200 | 3306.0 | paw2 | the bear walks up to Shyam | -16 | -22.0 | -36.7 | +0.00 |
| 48 | 110.700 | 3321.0 | paw2 | the bear walks up to Shyam | -16 | -22.0 | -36.7 | +0.00 |
| 49 | 111.200 | 3336.0 | paw2 | the bear walks up to Shyam | -16 | -22.0 | -36.7 | +0.00 |
| 50 | 111.700 | 3351.0 | paw2 | the bear walks up to Shyam | -16 | -22.0 | -36.7 | +0.00 |
| 51 | 112.450 | 3373.5 | sniff | the bear sniffs | -12 | -18.0 | -32.7 | +0.00 |
| 52 | 113.790 | 3413.7 | sniff | the bear sniffs | -12 | -18.0 | -32.7 | +0.00 |
| 53 | 115.340 | 3460.2 | sniff | the bear sniffs | -12 | -18.0 | -32.7 | +0.00 |
| 54 | 121.600 | 3648.0 | whisper | breathing at Shyam's ear: slow, close bear breaths | -17 | -23.0 | -37.7 | +0.00 |
| 55 | 124.600 | 3738.0 | whisper | breathing at Shyam's ear: slow, close bear breaths | -17 | -23.0 | -37.7 | +0.00 |
| 56 | 127.600 | 3828.0 | whisper | breathing at Shyam's ear: slow, close bear breaths | -17 | -23.0 | -37.7 | +0.00 |
| 57 | 130.600 | 3918.0 | whisper | breathing at Shyam's ear: slow, close bear breaths | -17 | -23.0 | -37.7 | +0.00 |
| 58 | 135.500 | 4065.0 | paw3 | the bear lumbers back into the jungle | -16 | -22.0 | -36.7 | +0.30 |
| 59 | 136.100 | 4083.0 | paw3 | the bear lumbers back into the jungle | -16 | -22.0 | -36.7 | +0.30 |
| 60 | 136.700 | 4101.0 | paw3 | the bear lumbers back into the jungle | -16 | -22.0 | -36.7 | +0.30 |
| 61 | 137.300 | 4119.0 | paw3 | the bear lumbers back into the jungle | -16 | -22.0 | -36.7 | +0.30 |
| 62 | 137.900 | 4137.0 | paw3 | the bear lumbers back into the jungle | -16 | -22.0 | -36.7 | +0.30 |
| 63 | 138.000 | 4140.0 | amb (bed, integrated) | the birds come back; evening insects | -29 | -29.0 | -43.7 | +0.00 |
| 64 | 138.500 | 4155.0 | paw3 | the bear lumbers back into the jungle | -16 | -22.0 | -36.7 | +0.30 |
| 65 | 139.300 | 4179.0 | bush_close | the bushes close behind it | -20 | -26.0 | -40.7 | +0.40 |
| 66 | 143.000 | 4290.0 | slide | Ram slides down the trunk | -15 | -21.0 | -35.7 | +0.20 |
| 67 | 144.700 | 4341.0 | land2 | lands on his feet | -14 | -20.0 | -34.7 | +0.00 |
| 68 | 145.000 | 4350.0 | dust | dusts off his clothes: pat pat pat | -18 | -24.0 | -38.7 | +0.00 |
| 69 | 153.300 | 4599.0 | stand | Shyam gets up | -18 | -24.0 | -38.7 | +0.00 |
| 70 | 169.890 | 5096.7 | hand_solo | the last handshake: Ram's slap, alone | -12 | -18.0 | -32.7 | +0.00 |
| 71 | 171.140 | 5134.2 | hand_solo | the last handshake: Ram's slap, alone | -12 | -18.0 | -32.7 | +0.00 |
| 72 | 175.600 | 5268.0 | bag | he picks up his bag | -18 | -24.0 | -38.7 | +0.00 |
| 73 | 175.800 | 5274.0 | walk_away | Shyam walks home, footsteps fading | -20 | -26.0 | -40.7 | -0.20 |
