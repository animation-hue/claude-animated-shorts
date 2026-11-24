# The Bridge That Fell for a Song - soundtrack cue sheet

All sound is original: synthesized in numpy/scipy by `sfx_gen.py` / `instruments.py`, placed by `sfx.py` / `music.py`, mixed by `mix.py`.
Voice = `voice/voice.wav`, gain only (no EQ, no compression, no pitch).

## Files
| file | content |
|---|---|
| `mix.wav` | final mix, 48 kHz, stereo, 24-bit, 3,240,000 samples = 67.500 s |
| `stem_voice.wav` / `stem_music.wav` / `stem_sfx.wav` | stems at mix gain (they sum to the mix before the master limiter) |

## Master loudness (own BS.1770-4 meter)
- Integrated **-15.0 LUFS**, true peak **-1.2 dBTP**, LRA 6.3 LU, max momentary -8.6 LUFS, max short-term -11.6 LUFS
- Stems: voice -13.7 LUFS, music -23.9 LUFS, sfx -39.7 LUFS (voice gain +6.55 dB, same gain on every stem)
- Master limiter (4x oversampled look-ahead, ceiling -1.2 dBTP): max gain reduction 5.62 dB, active (>0.1 dB) on 13.71 % of samples, >0.5 dB on 6.22 %

ffmpeg ebur128 cross-check:
```
Summary:
  Integrated loudness:
    I:         -15.0 LUFS
    Threshold: -25.3 LUFS
  Loudness range:
    LRA:         6.3 LU
    Threshold: -35.3 LUFS
    LRA low:   -19.2 LUFS
    LRA high:  -12.9 LUFS
  True peak:
    Peak:       -1.2 dBFS
```

## Voice on top: per-section loudness (LUFS, integrated per stem, at mix gain)
bed = music + sfx. margin = voice - bed (integrated over the section). speech median / p10 = median and 10th percentile of the 400 ms momentary margin (voice - bed) over windows centred on spoken words.

| section (shots) | time s | voice | music | sfx | bed | margin LU | speech median LU | speech p10 LU |
|---|---|---|---|---|---|---|---|---|
| intro (01-02) | 0.00-26.00 | -13.4 | -22.9 | -39.9 | -22.9 | 9.4 | 10.1 | 6.2 |
| harvest (03) | 26.00-52.60 | -15.5 | -25.5 | -42.8 | -25.4 | 9.9 | 9.6 | 4.9 |
| night 1 (04-05) | 52.60-72.50 | -12.4 | -23.2 | -40.4 | -23.1 | 10.7 | 11.2 | 6.1 |
| loss 1 (06-07) | 72.50-99.00 | -12.6 | -24.1 | -42.4 | -24.0 | 11.4 | 10.2 | 4.8 |
| again (08-10) | 99.00-131.60 | -13.6 | -23.5 | -40.3 | -23.4 | 9.8 | 10.0 | 5.3 |
| loss 2 (11) | 131.60-155.90 | -14.2 | -26.2 | -42.5 | -26.1 | 11.9 | 13.4 | 5.5 |
| idea (12-14) | 155.90-202.00 | -14.3 | -25.3 | -43.8 | -25.3 | 10.9 | 10.0 | 4.4 |
| plan (15-17) | 202.00-236.80 | -13.3 | -22.8 | -42.6 | -22.7 | 9.5 | 9.7 | 4.8 |
| boars (18-21) | 236.80-283.40 | -13.8 | -23.6 | -34.6 | -23.5 | 9.6 | 10.2 | 5.7 |
| ending (22-24) | 283.40-340.38 | -13.9 | -23.7 | -41.3 | -23.6 | 9.8 | 9.8 | 4.9 |

## Music map (original love theme, G major pentatonic, 92 bpm)
Music target per section, LU under the voice (after a -3 dB speech duck keyed from words.json): intro -9.5, harvest -10.0, lullaby -11.0, prowl1 -10.5, loss1 -11.5, timelapse -9.5, hope -10.5, prowl2 -10.5, loss2 -12.0, idea -11.0, plant -9.5, night3 -10.5, comic -9.0, calm -11.0, finale -9.5. Applied section gains (dB): intro -10.0, harvest -13.3, lullaby -8.5, prowl1 -3.8, loss1 -6.6, timelapse -10.3, hope -10.8, prowl2 -7.6, loss2 -12.7, idea -7.9, plant -9.9, night3 -7.7, comic -7.0, calm -8.9, finale -11.1.

Rides (music only, dB): 315.70-336.20 s -1.0 - so quiet sentence-final words stay on top and the band blooms in the gaps after them. 

| time s | frame | music |
|---|---|---|
| 0.00 | 0 | intro: tanpura drone, santoor ripples, the village theme on the bansuri |
| 26.00 | 624 | harvest: uplifting - walking bass + brighter theme; glock sparkle on the golden cob |
| 52.80 | 1267 | night: a music-box lullaby for the sleeping couple |
| 62.90 | 1510 | the moonlit field: a low suspense drone, slow low plucks |
| 72.50 | 1740 | the field destroyed: a soft timpani, then the theme slow and minor on vibes |
| 99.00 | 2376 | time-lapse: motivational double-time theme; rising glock as the corn grows |
| 131.60 | 3158 | the second loss: slower, sadder - a lone minor pluck |
| 158.45 | 3803 | Vidya's idea: a hush, then a glock 'ping' of a bright idea; hopeful santoor |
| 202.00 | 4848 | the new plan: motivational theme over a walking bass; rising glock in the montage |
| 249.20 | 5981 | the boars: suspense drone + tiptoe pizzicato |
| 260.40 | 6250 | the bitter face: a tuba 'wah' fall + horn; smaller wahs for each boar that tastes |
| 267.80 | 6427 | they run: comic double-time chase |
| 283.40 | 6802 | sunrise: glock shimmer, then the full theme - warm and inspirational to the end |
| 335.70 | 8057 | a soft D major button on the last word |

## SFX events
Level convention: every EVENT has a naive level (LU vs the voice stem, as the event's max momentary loudness); applied = naive - 6 dB (standard mix rule) + distance/intensity offsets. BEDS are integrated loudness, not reduced. 'mix LUFS' = the event's max momentary loudness in the final mix (voice stem = -13.7 LUFS integrated). Column sounds also get the camera-distance low-pass and more valley reverb.

| # | time s | frame | cue | what | naive LU | applied LU | mix LUFS | pan |
|---|---|---|---|---|---|---|---|---|
| 1 | 0.000 | 0.0 | amb (bed, integrated) | village morning: birds, breeze through the corn | -29 | -29.0 | -42.7 | +0.00 |
| 2 | 0.491 | 11.8 | hoe | the hoe bites into the soil | -18 | -24.0 | -37.7 | +0.00 |
| 3 | 2.454 | 58.9 | hoe | the hoe bites into the soil | -18 | -24.0 | -37.7 | +0.00 |
| 4 | 4.418 | 106.0 | hoe | the hoe bites into the soil | -18 | -24.0 | -37.7 | +0.00 |
| 5 | 6.381 | 153.2 | hoe | the hoe bites into the soil | -18 | -24.0 | -37.7 | +0.00 |
| 6 | 8.345 | 200.3 | hoe | the hoe bites into the soil | -18 | -24.0 | -37.7 | +0.00 |
| 7 | 10.308 | 247.4 | hoe | the hoe bites into the soil | -18 | -24.0 | -37.7 | +0.00 |
| 8 | 12.272 | 294.5 | hoe | the hoe bites into the soil | -18 | -24.0 | -37.7 | +0.00 |
| 9 | 14.235 | 341.6 | hoe | the hoe bites into the soil | -18 | -24.0 | -37.7 | +0.00 |
| 10 | 16.199 | 388.8 | hoe | the hoe bites into the soil | -18 | -24.0 | -37.7 | +0.00 |
| 11 | 18.162 | 435.9 | hoe | the hoe bites into the soil | -18 | -24.0 | -37.7 | +0.00 |
| 12 | 20.126 | 483.0 | hoe | the hoe bites into the soil | -18 | -24.0 | -37.7 | +0.00 |
| 13 | 20.800 | 499.2 | pour1 | Vidya waters the tulsi from her lota | -22 | -28.0 | -41.7 | +0.00 |
| 14 | 22.089 | 530.1 | hoe | the hoe bites into the soil | -18 | -24.0 | -37.7 | +0.00 |
| 15 | 23.900 | 573.6 | steps | Ramu walks to the path | -20 | -26.0 | -39.7 | +0.00 |
| 16 | 52.600 | 1262.4 | amb (bed, integrated) | night: crickets | -31 | -31.0 | -44.7 | +0.00 |
| 17 | 66.100 | 1586.4 | corn_rustle | something moves in the corn | -16 | -22.0 | -35.7 | +0.40 |
| 18 | 72.500 | 1740.0 | amb (bed, integrated) | day: birds, breeze | -30 | -30.0 | -43.7 | +0.00 |
| 19 | 72.500 | 1740.0 | steps | they hurry to the field | -20 | -26.0 | -39.7 | +0.00 |
| 20 | 72.600 | 1742.4 | sting1 | the ruined field: broken stalks creak in the wind | -22 | -28.0 | -41.7 | +0.00 |
| 21 | 100.254 | 2406.1 | hoe | the hoe bites into the soil | -18 | -24.0 | -37.7 | +0.00 |
| 22 | 102.102 | 2450.4 | hoe | the hoe bites into the soil | -18 | -24.0 | -37.7 | +0.00 |
| 23 | 103.950 | 2494.8 | hoe | the hoe bites into the soil | -18 | -24.0 | -37.7 | +0.00 |
| 24 | 104.500 | 2508.0 | seeds | seeds scattered (a dry patter) | -20 | -26.0 | -39.7 | +0.00 |
| 25 | 107.500 | 2580.0 | pour2 | Ramu waters the young plants | -20 | -26.0 | -39.7 | +0.00 |
| 26 | 110.000 | 2640.0 | grow | time-lapse growth: a soft rising whoosh | -20 | -26.0 | -39.7 | +0.00 |
| 27 | 126.400 | 3033.6 | amb (bed, integrated) | night: crickets | -31 | -31.0 | -44.7 | +0.00 |
| 28 | 128.800 | 3091.2 | corn_rustle | something moves in the corn | -16 | -22.0 | -35.7 | +0.40 |
| 29 | 131.600 | 3158.4 | amb (bed, integrated) | day: birds, breeze | -30 | -30.0 | -43.7 | +0.00 |
| 30 | 131.600 | 3158.4 | steps | back to the field | -20 | -26.0 | -39.7 | +0.00 |
| 31 | 134.400 | 3225.6 | sting2 | broken stalks again | -22 | -28.0 | -41.7 | +0.00 |
| 32 | 138.400 | 3321.6 | sit | Ramu sinks down onto the soil | -20 | -26.0 | -39.7 | +0.00 |
| 33 | 202.000 | 4848.0 | seeds2 | planting vines and seeds | -22 | -28.0 | -41.7 | +0.00 |
| 34 | 214.200 | 5140.8 | grow2 | the vines climb, the corn rises | -21 | -27.0 | -40.7 | +0.00 |
| 35 | 236.800 | 5683.2 | amb (bed, integrated) | night: crickets, wind in the corn | -30 | -30.0 | -43.7 | +0.00 |
| 36 | 247.200 | 5932.8 | bush | the bushes shake | -13 | -19.0 | -32.7 | +0.40 |
| 37 | 249.200 | 5980.8 | grunt | grunts as they trot out ('घुर्र! घुर्र!') | -14 | -20.0 | -33.7 | +0.00 |
| 38 | 249.200 | 5980.8 | trot | hooves trotting | -18 | -24.0 | -37.7 | +0.00 |
| 39 | 249.800 | 5995.2 | grunt | grunts as they trot out ('घुर्र! घुर्र!') | -14 | -20.0 | -33.7 | +0.25 |
| 40 | 250.400 | 6009.6 | grunt | grunts as they trot out ('घुर्र! घुर्र!') | -14 | -20.0 | -33.7 | +0.27 |
| 41 | 251.000 | 6024.0 | grunt | grunts as they trot out ('घुर्र! घुर्र!') | -14 | -20.0 | -33.7 | +0.04 |
| 42 | 251.600 | 6038.4 | grunt | grunts as they trot out ('घुर्र! घुर्र!') | -14 | -20.0 | -33.7 | -0.23 |
| 43 | 252.200 | 6052.8 | grunt | grunts as they trot out ('घुर्र! घुर्र!') | -14 | -20.0 | -33.7 | -0.29 |
| 44 | 252.800 | 6067.2 | grunt | grunts as they trot out ('घुर्र! घुर्र!') | -14 | -20.0 | -33.7 | -0.08 |
| 45 | 253.400 | 6081.6 | grunt | grunts as they trot out ('घुर्र! घुर्र!') | -14 | -20.0 | -33.7 | +0.20 |
| 46 | 254.000 | 6096.0 | grunt | grunts as they trot out ('घुर्र! घुर्र!') | -14 | -20.0 | -33.7 | +0.30 |
| 47 | 254.600 | 6110.4 | grunt | grunts as they trot out ('घुर्र! घुर्र!') | -14 | -20.0 | -33.7 | +0.12 |
| 48 | 255.400 | 6129.6 | sniff | sniffing at the vines | -14 | -20.0 | -33.7 | +0.00 |
| 49 | 257.400 | 6177.6 | crunch | CRUNCH: the first boar bites a karela | -9 | -15.0 | -28.7 | +0.00 |
| 50 | 260.400 | 6249.6 | bitter | the bitter taste: a slide-whistle fall + a disgusted 'उँह!' | -7 | -13.0 | -26.7 | +0.00 |
| 51 | 261.450 | 6274.8 | crunch2 | another boar bites | -13 | -19.0 | -32.7 | -0.30 |
| 52 | 262.000 | 6288.0 | crunch2 | another boar bites | -13 | -19.0 | -32.7 | -0.15 |
| 53 | 262.550 | 6301.2 | crunch2 | another boar bites | -13 | -19.0 | -32.7 | +0.00 |
| 54 | 262.850 | 6308.4 | yuck | and spits it out: a squeal + 'उँह! उँह!' | -11 | -17.0 | -30.7 | -0.30 |
| 55 | 263.100 | 6314.4 | crunch2 | another boar bites | -13 | -19.0 | -32.7 | +0.15 |
| 56 | 263.400 | 6321.6 | yuck | and spits it out: a squeal + 'उँह! उँह!' | -11 | -17.0 | -30.7 | -0.15 |
| 57 | 263.650 | 6327.6 | crunch2 | another boar bites | -13 | -19.0 | -32.7 | +0.30 |
| 58 | 263.950 | 6334.8 | yuck | and spits it out: a squeal + 'उँह! उँह!' | -11 | -17.0 | -30.7 | +0.00 |
| 59 | 264.500 | 6348.0 | yuck | and spits it out: a squeal + 'उँह! उँह!' | -11 | -17.0 | -30.7 | +0.15 |
| 60 | 265.050 | 6361.2 | yuck | and spits it out: a squeal + 'उँह! उँह!' | -11 | -17.0 | -30.7 | +0.30 |
| 61 | 267.800 | 6427.2 | stampede | they flee: hooves, squeals, a crash through the bushes | -10 | -16.0 | -29.7 | +0.40 |
| 62 | 283.400 | 6801.6 | amb (bed, integrated) | sunrise: a chorus of birds | -28 | -28.0 | -41.7 | +0.00 |
| 63 | 283.400 | 6801.6 | steps | a happy walk to the field | -20 | -26.0 | -39.7 | +0.00 |
| 64 | 283.800 | 6811.2 | rooster | a rooster crows at sunrise | -16 | -22.0 | -35.7 | -0.40 |
