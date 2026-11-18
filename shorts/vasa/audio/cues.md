# The Bridge That Fell for a Song - soundtrack cue sheet

All sound is original: synthesized in numpy/scipy by `sfx_gen.py` / `instruments.py`, placed by `sfx.py` / `music.py`, mixed by `mix.py`.
Voice = `voice/voice.wav`, gain only (no EQ, no compression, no pitch).

## Files
| file | content |
|---|---|
| `mix.wav` | final mix, 48 kHz, stereo, 24-bit, 3,240,000 samples = 67.500 s |
| `stem_voice.wav` / `stem_music.wav` / `stem_sfx.wav` | stems at mix gain (they sum to the mix before the master limiter) |

## Master loudness (own BS.1770-4 meter)
- Integrated **-15.0 LUFS**, true peak **-1.2 dBTP**, LRA 3.0 LU, max momentary -9.4 LUFS, max short-term -13.1 LUFS
- Stems: voice -15.1 LUFS, music -25.5 LUFS, sfx -28.2 LUFS (voice gain +10.81 dB, same gain on every stem)
- Master limiter (4x oversampled look-ahead, ceiling -1.2 dBTP): max gain reduction 4.83 dB, active (>0.1 dB) on 9.04 % of samples, >0.5 dB on 3.58 %

ffmpeg ebur128 cross-check:
```
Summary:
  Integrated loudness:
    I:         -15.0 LUFS
    Threshold: -25.1 LUFS
  Loudness range:
    LRA:         3.0 LU
    Threshold: -35.1 LUFS
    LRA low:   -16.8 LUFS
    LRA high:  -13.7 LUFS
  True peak:
    Peak:       -1.2 dBFS
```

## Voice on top: per-section loudness (LUFS, integrated per stem, at mix gain)
bed = music + sfx. margin = voice - bed (integrated over the section). speech median / p10 = median and 10th percentile of the 400 ms momentary margin (voice - bed) over windows centred on spoken words.

| section (shots) | time s | voice | music | sfx | bed | margin LU | speech median LU | speech p10 LU |
|---|---|---|---|---|---|---|---|---|
| hook (1-2) | 0.00-5.87 | -15.6 | -24.7 | -33.3 | -24.5 | 8.9 | 8.5 | 1.1 |
| king + guns (3-5) | 5.87-13.97 | -14.5 | -25.1 | -29.9 | -24.3 | 9.9 | 9.1 | 3.6 |
| builder + admiral (6-7) | 13.97-18.90 | -15.6 | -28.0 | -41.1 | -27.8 | 12.1 | 13.1 | 7.2 |
| test (8) | 18.90-27.87 | -15.4 | -24.1 | -28.4 | -23.3 | 8.0 | 7.0 | 2.7 |
| anyway (9-10) | 27.87-31.50 | -16.8 | -27.3 | -35.2 | -26.8 | 10.0 | 13.1 | 7.7 |
| salute (11) | 31.50-34.47 | -13.8 | -23.1 | -26.3 | -21.4 | 7.7 | 8.6 | -0.1 |
| gust + flood (12) | 34.47-39.37 | -14.4 | -25.0 | -22.0 | -22.2 | 7.8 | 8.0 | 0.9 |
| deadpan (13) | 39.37-46.57 | -15.4 | -27.5 | -32.6 | -27.7 | 12.4 | 11.4 | 7.0 |
| boat (14) | 46.57-51.00 | -15.6 | -27.4 | -32.3 | -26.7 | 11.1 | 11.5 | 5.9 |
| cannon on top (15) | 51.00-54.27 | -15.2 | -25.7 | -38.7 | -25.5 | 10.2 | 9.5 | 7.3 |
| inquiry + king (16-17) | 54.27-60.30 | -15.2 | -26.8 | -39.8 | -26.7 | 11.5 | 9.8 | 5.0 |
| raised (18) | 60.30-63.20 | -15.9 | -30.8 | -29.3 | -28.2 | 12.3 | 14.5 | 8.1 |
| visitors (19) | 63.20-68.00 | -14.6 | -24.0 | -30.2 | -23.3 | 8.6 | 7.7 | 3.1 |

## Music map (original naval march, D major, 112 bpm)
Music target per section, LU under the voice (after a -3 dB speech duck keyed from words.json): hook -9.0, sank -11.0, town -10.5, nervous -11.5, test -10.0, stop -10.0, launch -9.5, salute -9.5, dropout -10.0, sad -10.5, boat -11.0, court -11.5, king -9.5, reprise -10.0. Applied section gains (dB): hook -18.4, sank -18.9, town -16.0, nervous -17.3, test -13.6, stop -13.6, launch -16.8, salute -15.5, dropout -15.5, sad -13.0, boat -14.5, court -13.7, king -30.3, reprise -15.2.

Rides (music only, dB): 3.00-3.60 s -2.0, 5.00-5.70 s -3.0, 64.10-66.30 s -2.0 - so quiet sentence-final words stay on top and the band blooms in the gaps after them. 

| time s | frame | music |
|---|---|---|
| 0.05 | 2 | hook: fanfare tutti (timpani + crash), theme bars 1-2 with fife + glock + snare |
| 4.13 | 124 | 'sank': the band stops; tuba + horn slide down (wah-woooo) |
| 5.92 | 177 | Stockholm: stately march, theme bars 1-4 (fife + glock, oompah, light snare) |
| 10.33 | 310 | crash on 'sixty-four'; timpani 1-5 on 'two (gun decks)' |
| 14.33 | 430 | shipbuilder: nervous pizz, chromatic tiptoe |
| 16.63 | 499 | test: D / A7 vamp, snare tightening; tuba whoop on each crossing, glock ping on arrival |
| 25.97 | 779 | dead stop on 'stopped them' |
| 28.00 | 840 | admiral: soft D minor pad, A7 under 'home' |
| 30.33 | 910 | 'launched it anyway': bright march, theme bars 5-8 + 1-2, full band |
| 33.97 | 1019 | crash + timpani on 'salute'; the band cuts dead on the gust |
| 41.93 | 1258 | 'Unluckily': sad brass wah-wah-wah-waaah (horn + tuba), then sparse pizz |
| 46.50 | 1395 | rowing boat: music-box lilt (3/4) with pizz bass; vibes wobble on 'tip', resolve on 'back' |
| 54.27 | 1628 | inquiry: pizz walking bass (D minor) + brush |
| 59.64 | 1789 | 'was the king': D major fanfare stab + crash + timpani |
| 60.40 | 1812 | reprise: glock theme over soft oompah |
| 63.00 | 1890 | full band blooms under 'a million people' |
| 67.67 | 2030 | D major button on 'deck' |

## SFX events
Level convention: every EVENT has a naive level (LU vs the voice stem, as the event's max momentary loudness); applied = naive - 6 dB (standard mix rule) + distance/intensity offsets. BEDS are integrated loudness, not reduced. 'mix LUFS' = the event's max momentary loudness in the final mix (voice stem = -15.1 LUFS integrated). Column sounds also get the camera-distance low-pass and more valley reverb.

| # | time s | frame | cue | what | naive LU | applied LU | mix LUFS | pan |
|---|---|---|---|---|---|---|---|---|
| 1 | 0.000 | 0.0 | amb (bed, integrated) | hook: open harbour, water along the hull, breeze, gulls | -30 | -30.0 | -45.1 | +0.00 |
| 2 | 0.000 | 0.0 | sails_hook | sails and flags cracking in the wind, rigging creak | -14 | -20.0 | -35.1 | +0.20 |
| 3 | 4.133 | 124.0 | sink_hook | flash-forward sinking: timber groan + water rush + bubbles | -6 | -12.0 | -27.1 | +0.00 |
| 4 | 5.867 | 176.0 | amb (bed, integrated) | Stockholm quay: water lapping, breeze, birds, distant town murmur (shots 3-10) | -29 | -29.0 | -44.1 | +0.00 |
| 5 | 5.867 | 176.0 | flash | whoosh into the white flash | -8 | -14.0 | -29.1 | +0.00 |
| 6 | 5.867 | 176.0 | quay_murmur | dock workers and townsfolk on the quay | -14 | -20.0 | -35.1 | +0.00 |
| 7 | 10.333 | 310.0 | lid | gun-port lid 1 creaks open (lower deck) | -13 | -19.0 | -34.1 | -0.60 |
| 8 | 10.407 | 312.2 | lid | gun-port lid 2 creaks open (lower deck) | -15 | -21.0 | -36.1 | -0.50 |
| 9 | 10.453 | 313.6 | gun_run | barrel run out on its carriage | -17 | -23.0 | -38.1 | -0.60 |
| 10 | 10.480 | 314.4 | lid | gun-port lid 3 creaks open (lower deck) | -15 | -21.0 | -36.1 | -0.40 |
| 11 | 10.527 | 315.8 | gun_run | barrel run out on its carriage | -17 | -23.0 | -38.1 | -0.50 |
| 12 | 10.553 | 316.6 | lid | gun-port lid 4 creaks open (lower deck) | -13 | -19.0 | -34.1 | -0.30 |
| 13 | 10.600 | 318.0 | gun_run | barrel run out on its carriage | -17 | -23.0 | -38.1 | -0.40 |
| 14 | 10.627 | 318.8 | lid | gun-port lid 5 creaks open (lower deck) | -15 | -21.0 | -36.1 | -0.20 |
| 15 | 10.673 | 320.2 | gun_run | barrel run out on its carriage | -17 | -23.0 | -38.1 | -0.30 |
| 16 | 10.700 | 321.0 | lid | gun-port lid 6 creaks open (lower deck) | -15 | -21.0 | -36.1 | -0.10 |
| 17 | 10.747 | 322.4 | gun_run | barrel run out on its carriage | -17 | -23.0 | -38.1 | -0.20 |
| 18 | 10.773 | 323.2 | lid | gun-port lid 7 creaks open (lower deck) | -13 | -19.0 | -34.1 | +0.00 |
| 19 | 10.820 | 324.6 | gun_run | barrel run out on its carriage | -17 | -23.0 | -38.1 | -0.10 |
| 20 | 10.847 | 325.4 | lid | gun-port lid 8 creaks open (lower deck) | -15 | -21.0 | -36.1 | +0.10 |
| 21 | 10.893 | 326.8 | gun_run | barrel run out on its carriage | -17 | -23.0 | -38.1 | +0.00 |
| 22 | 10.920 | 327.6 | lid | gun-port lid 9 creaks open (lower deck) | -15 | -21.0 | -36.1 | +0.20 |
| 23 | 10.967 | 329.0 | gun_run | barrel run out on its carriage | -17 | -23.0 | -38.1 | +0.10 |
| 24 | 10.993 | 329.8 | lid | gun-port lid 10 creaks open (lower deck) | -13 | -19.0 | -34.1 | +0.30 |
| 25 | 11.040 | 331.2 | gun_run | barrel run out on its carriage | -17 | -23.0 | -38.1 | +0.20 |
| 26 | 11.067 | 332.0 | lid | gun-port lid 11 creaks open (lower deck) | -15 | -21.0 | -36.1 | +0.40 |
| 27 | 11.113 | 333.4 | gun_run | barrel run out on its carriage | -17 | -23.0 | -38.1 | +0.30 |
| 28 | 11.140 | 334.2 | lid | gun-port lid 12 creaks open (lower deck) | -15 | -21.0 | -36.1 | +0.50 |
| 29 | 11.187 | 335.6 | gun_run | barrel run out on its carriage | -17 | -23.0 | -38.1 | +0.40 |
| 30 | 11.260 | 337.8 | gun_run | barrel run out on its carriage | -17 | -23.0 | -38.1 | +0.50 |
| 31 | 12.933 | 388.0 | lid | gun-port lid 1 creaks open (upper deck) | -13 | -19.0 | -34.1 | -0.60 |
| 32 | 13.007 | 390.2 | lid | gun-port lid 2 creaks open (upper deck) | -15 | -21.0 | -36.1 | -0.50 |
| 33 | 13.053 | 391.6 | gun_run | barrel run out on its carriage | -17 | -23.0 | -38.1 | -0.60 |
| 34 | 13.080 | 392.4 | lid | gun-port lid 3 creaks open (upper deck) | -15 | -21.0 | -36.1 | -0.40 |
| 35 | 13.127 | 393.8 | gun_run | barrel run out on its carriage | -17 | -23.0 | -38.1 | -0.50 |
| 36 | 13.153 | 394.6 | lid | gun-port lid 4 creaks open (upper deck) | -13 | -19.0 | -34.1 | -0.30 |
| 37 | 13.200 | 396.0 | gun_run | barrel run out on its carriage | -17 | -23.0 | -38.1 | -0.40 |
| 38 | 13.227 | 396.8 | lid | gun-port lid 5 creaks open (upper deck) | -15 | -21.0 | -36.1 | -0.20 |
| 39 | 13.273 | 398.2 | gun_run | barrel run out on its carriage | -17 | -23.0 | -38.1 | -0.30 |
| 40 | 13.300 | 399.0 | lid | gun-port lid 6 creaks open (upper deck) | -15 | -21.0 | -36.1 | -0.10 |
| 41 | 13.347 | 400.4 | gun_run | barrel run out on its carriage | -17 | -23.0 | -38.1 | -0.20 |
| 42 | 13.373 | 401.2 | lid | gun-port lid 7 creaks open (upper deck) | -13 | -19.0 | -34.1 | +0.00 |
| 43 | 13.420 | 402.6 | gun_run | barrel run out on its carriage | -17 | -23.0 | -38.1 | -0.10 |
| 44 | 13.447 | 403.4 | lid | gun-port lid 8 creaks open (upper deck) | -15 | -21.0 | -36.1 | +0.10 |
| 45 | 13.493 | 404.8 | gun_run | barrel run out on its carriage | -17 | -23.0 | -38.1 | +0.00 |
| 46 | 13.520 | 405.6 | lid | gun-port lid 9 creaks open (upper deck) | -15 | -21.0 | -36.1 | +0.20 |
| 47 | 13.567 | 407.0 | gun_run | barrel run out on its carriage | -17 | -23.0 | -38.1 | +0.10 |
| 48 | 13.593 | 407.8 | lid | gun-port lid 10 creaks open (upper deck) | -13 | -19.0 | -34.1 | +0.30 |
| 49 | 13.640 | 409.2 | gun_run | barrel run out on its carriage | -17 | -23.0 | -38.1 | +0.20 |
| 50 | 13.667 | 410.0 | lid | gun-port lid 11 creaks open (upper deck) | -15 | -21.0 | -36.1 | +0.40 |
| 51 | 13.713 | 411.4 | gun_run | barrel run out on its carriage | -17 | -23.0 | -38.1 | +0.30 |
| 52 | 13.740 | 412.2 | lid | gun-port lid 12 creaks open (upper deck) | -15 | -21.0 | -36.1 | +0.50 |
| 53 | 13.787 | 413.6 | gun_run | barrel run out on its carriage | -17 | -23.0 | -38.1 | +0.40 |
| 54 | 13.860 | 415.8 | gun_run | barrel run out on its carriage | -17 | -23.0 | -38.1 | +0.50 |
| 55 | 14.733 | 442.0 | scratch | shipbuilder scratching his head (hmm) | -18 | -24.0 | -39.1 | +0.00 |
| 56 | 18.900 | 567.0 | whoosh | camera move | -13 | -19.0 | -34.1 | +0.00 |
| 57 | 19.733 | 592.0 | feet | thirty sailors run across the deck (crossing 1) | -9 | -15.0 | -30.1 | +0.30 |
| 58 | 20.233 | 607.0 | rigging | rigging and blocks knocking with the roll | -18 | -24.0 | -39.1 | +0.00 |
| 59 | 20.333 | 610.0 | groan | hull groans as she rolls (crossing 1) | -12 | -18.0 | -33.1 | +0.00 |
| 60 | 21.733 | 652.0 | feet | thirty sailors run across the deck (crossing 2) | -8 | -14.0 | -29.1 | -0.30 |
| 61 | 22.233 | 667.0 | rigging | rigging and blocks knocking with the roll | -17 | -23.0 | -38.1 | +0.00 |
| 62 | 22.333 | 670.0 | groan | hull groans as she rolls (crossing 2) | -10 | -16.0 | -31.1 | +0.00 |
| 63 | 23.267 | 698.0 | feet | thirty sailors run across the deck (crossing 3) | -7 | -13.0 | -28.1 | +0.30 |
| 64 | 23.767 | 713.0 | rigging | rigging and blocks knocking with the roll | -16 | -22.0 | -37.1 | +0.00 |
| 65 | 23.867 | 716.0 | groan | hull groans as she rolls (crossing 3) | -8 | -14.0 | -29.1 | +0.00 |
| 66 | 24.867 | 746.0 | feet | thirty sailors run across the deck (crossing 4) | -6 | -12.0 | -27.1 | -0.30 |
| 67 | 25.417 | 762.5 | rigging | rigging and blocks knocking with the roll | -15 | -21.0 | -36.1 | +0.00 |
| 68 | 25.527 | 765.8 | groan | hull groans as she rolls (crossing 4) | -6 | -12.0 | -27.1 | +0.00 |
| 69 | 25.967 | 779.0 | halt | they skid to a stop: shuffling feet | -12 | -18.0 | -33.1 | +0.00 |
| 70 | 26.867 | 806.0 | lurch | the big lurch: long deep timber groan + things sliding | -4 | -10.0 | -25.1 | +0.00 |
| 71 | 27.117 | 813.5 | whoa | sailors: whoa! | -10 | -16.0 | -31.1 | +0.00 |
| 72 | 29.833 | 895.0 | sigh | the admiral sighs | -18 | -24.0 | -39.1 | +0.00 |
| 73 | 30.333 | 910.0 | launch_cheer | the quay cheers as she is warped off | -10 | -16.0 | -31.4 | +0.00 |
| 74 | 31.500 | 945.0 | amb (bed, integrated) | golden harbour: lapping, soft breeze (shots 11-13) | -30 | -30.0 | -45.1 | +0.00 |
| 75 | 31.500 | 945.0 | shore_cheer | crowd on the quay cheering and clapping (10 August) | -11 | -17.0 | -32.3 | +0.00 |
| 76 | 32.500 | 975.0 | lid | salute: gun-port lids open | -18 | -24.0 | -39.1 | -0.30 |
| 77 | 32.553 | 976.6 | lid | salute: gun-port lids open | -18 | -24.0 | -39.1 | -0.25 |
| 78 | 32.607 | 978.2 | lid | salute: gun-port lids open | -18 | -24.0 | -39.1 | -0.20 |
| 79 | 32.660 | 979.8 | lid | salute: gun-port lids open | -18 | -24.0 | -39.1 | -0.15 |
| 80 | 32.713 | 981.4 | lid | salute: gun-port lids open | -18 | -24.0 | -39.1 | -0.10 |
| 81 | 32.767 | 983.0 | lid | salute: gun-port lids open | -18 | -24.0 | -39.1 | -0.05 |
| 82 | 32.820 | 984.6 | lid | salute: gun-port lids open | -18 | -24.0 | -39.1 | +0.00 |
| 83 | 32.873 | 986.2 | lid | salute: gun-port lids open | -18 | -24.0 | -39.1 | +0.05 |
| 84 | 32.927 | 987.8 | lid | salute: gun-port lids open | -18 | -24.0 | -39.1 | +0.10 |
| 85 | 32.980 | 989.4 | lid | salute: gun-port lids open | -18 | -24.0 | -39.1 | +0.15 |
| 86 | 33.033 | 991.0 | lid | salute: gun-port lids open | -18 | -24.0 | -39.1 | +0.20 |
| 87 | 33.087 | 992.6 | lid | salute: gun-port lids open | -18 | -24.0 | -39.1 | +0.25 |
| 88 | 33.900 | 1017.0 | cannon | farewell salute: gun 1 | -4 | -10.0 | -25.1 | +0.50 |
| 89 | 33.940 | 1018.2 | cannon | farewell salute: gun 2 | -8 | -14.0 | -29.1 | +0.42 |
| 90 | 33.980 | 1019.4 | cannon | farewell salute: gun 3 | -8 | -14.0 | -29.1 | +0.34 |
| 91 | 34.020 | 1020.6 | cannon | farewell salute: gun 4 | -8 | -14.0 | -29.1 | +0.26 |
| 92 | 34.060 | 1021.8 | cannon | farewell salute: gun 5 | -8 | -14.0 | -29.1 | +0.18 |
| 93 | 34.100 | 1023.0 | cannon | farewell salute: gun 6 | -8 | -14.0 | -29.1 | +0.10 |
| 94 | 34.140 | 1024.2 | cannon | farewell salute: gun 7 | -8 | -14.0 | -29.1 | +0.02 |
| 95 | 34.180 | 1025.4 | cannon | farewell salute: gun 8 | -8 | -14.0 | -29.1 | -0.06 |
| 96 | 34.220 | 1026.6 | cannon | farewell salute: gun 9 | -8 | -14.0 | -29.1 | -0.14 |
| 97 | 34.260 | 1027.8 | cannon | farewell salute: gun 10 | -8 | -14.0 | -29.1 | -0.22 |
| 98 | 34.300 | 1029.0 | cannon | farewell salute: gun 11 | -8 | -14.0 | -29.1 | -0.30 |
| 99 | 34.340 | 1030.2 | cannon | farewell salute: gun 12 | -8 | -14.0 | -29.1 | -0.38 |
| 100 | 34.467 | 1034.0 | sails_out | under sail: canvas, rigging, water along the hull | -18 | -24.0 | -39.1 | +0.00 |
| 101 | 34.467 | 1034.0 | whoosh | camera move | -13 | -19.0 | -34.1 | +0.00 |
| 102 | 36.067 | 1082.0 | gust | THE GUST: wind roar, sails slam full (whump), flags crack | +0 | -6.0 | -21.1 | +0.00 |
| 103 | 36.433 | 1093.0 | lean | she leans over: huge hull groan, cargo and guns shifting | -3 | -9.0 | -24.1 | +0.00 |
| 104 | 37.033 | 1111.0 | crew_cry | crew shouting | -10 | -16.0 | -31.3 | +0.00 |
| 105 | 37.767 | 1133.0 | sea_in | the sea pours in through the open gun ports | -1 | -7.0 | -22.1 | +0.00 |
| 106 | 38.533 | 1156.0 | sinking | going down: water closing over, big bubbles, last groans | -6 | -12.0 | -27.1 | +0.00 |
| 107 | 39.367 | 1181.0 | gasp | the quay gasps | -14 | -20.0 | -35.1 | +0.00 |
| 108 | 39.367 | 1181.0 | whoosh | camera move | -13 | -19.0 | -34.1 | +0.00 |
| 109 | 41.333 | 1240.0 | swimmers | sailors splashing by the masts | -20 | -26.0 | -41.1 | +0.00 |
| 110 | 41.933 | 1258.0 | glug | one last deadpan bubble on 'Unluckily' | -14 | -20.0 | -35.1 | +0.00 |
| 111 | 46.567 | 1397.0 | amb (bed, integrated) | the rowing boat: close water lapping against the hull (shots 14-15) | -27 | -27.0 | -42.1 | +0.00 |
| 112 | 46.833 | 1405.0 | stand | kid stands up: wooden creak + the boat rocks | -14 | -20.0 | -35.1 | +0.00 |
| 113 | 47.667 | 1430.0 | rock | boat rocks: slosh + creak | -14 | -20.0 | -35.1 | +0.00 |
| 114 | 48.400 | 1452.0 | rock | boat rocks: slosh + creak | -12 | -18.0 | -33.1 | +0.00 |
| 115 | 49.200 | 1476.0 | kid_whoa | kid: whoa! | -9 | -15.0 | -30.1 | +0.00 |
| 116 | 49.200 | 1476.0 | rock | boat rocks: slosh + creak | -10 | -16.0 | -31.1 | +0.00 |
| 117 | 49.667 | 1490.0 | sit | kid sits down: bump on the thwart + settling slosh | -12 | -18.0 | -33.1 | +0.00 |
| 118 | 51.767 | 1553.0 | cannon_thud | heavy guns 'on top': three low thuds | -14 | -20.0 | -35.1 | +0.00 |
| 119 | 54.267 | 1628.0 | amb (bed, integrated) | the inquiry on the quay: breeze, birds, distant town | -30 | -30.0 | -45.1 | +0.00 |
| 120 | 55.100 | 1653.0 | gavel | a judge's gavel on 'nobody (was punished)' | -12 | -18.0 | -33.1 | +0.00 |
| 121 | 58.000 | 1740.0 | judges_gasp | judges turn: small gasp | -16 | -22.0 | -37.1 | +0.00 |
| 122 | 59.667 | 1790.0 | ding | the king beams: a bright ting | -14 | -20.0 | -35.1 | +0.00 |
| 123 | 60.300 | 1809.0 | amb (bed, integrated) | today: harbour air, gulls (shots 18-19) | -30 | -30.0 | -45.1 | +0.00 |
| 124 | 60.300 | 1809.0 | whoosh | camera move | -13 | -19.0 | -34.1 | +0.00 |
| 125 | 62.033 | 1861.0 | lift | she breaks the surface: water pouring off the hull | -6 | -12.0 | -27.1 | +0.00 |
| 126 | 62.667 | 1880.0 | lift_cheer | a distant cheer | -16 | -22.0 | -38.9 | +0.00 |
| 127 | 63.200 | 1896.0 | visitors (bed, integrated) | a million a year: visitors chatting, kids, a few laughs | -16 | -16.0 | -31.1 | +0.00 |
| 128 | 66.767 | 2003.0 | hush | on deck: just the gulls and the breeze (the barrier rope creaks) | -20 | -26.0 | -41.1 | +0.00 |
