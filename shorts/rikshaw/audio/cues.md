# The Bridge That Fell for a Song - soundtrack cue sheet

All sound is original: synthesized in numpy/scipy by `sfx_gen.py` / `instruments.py`, placed by `sfx.py` / `music.py`, mixed by `mix.py`.
Voice = `voice/voice.wav`, gain only (no EQ, no compression, no pitch).

## Files
| file | content |
|---|---|
| `mix.wav` | final mix, 48 kHz, stereo, 24-bit, 3,240,000 samples = 67.500 s |
| `stem_voice.wav` / `stem_music.wav` / `stem_sfx.wav` | stems at mix gain (they sum to the mix before the master limiter) |

## Master loudness (own BS.1770-4 meter)
- Integrated **-15.0 LUFS**, true peak **-1.2 dBTP**, LRA 3.7 LU, max momentary -9.1 LUFS, max short-term -11.9 LUFS
- Stems: voice -14.9 LUFS, music -25.0 LUFS, sfx -32.7 LUFS (voice gain +8.55 dB, same gain on every stem)
- Master limiter (4x oversampled look-ahead, ceiling -1.2 dBTP): max gain reduction 4.30 dB, active (>0.1 dB) on 6.91 % of samples, >0.5 dB on 3.05 %

ffmpeg ebur128 cross-check:
```
Summary:
  Integrated loudness:
    I:         -15.0 LUFS
    Threshold: -25.1 LUFS
  Loudness range:
    LRA:         3.7 LU
    Threshold: -35.1 LUFS
    LRA low:   -17.2 LUFS
    LRA high:  -13.5 LUFS
  True peak:
    Peak:       -1.2 dBFS
```

## Voice on top: per-section loudness (LUFS, integrated per stem, at mix gain)
bed = music + sfx. margin = voice - bed (integrated over the section). speech median / p10 = median and 10th percentile of the 400 ms momentary margin (voice - bed) over windows centred on spoken words.

| section (shots) | time s | voice | music | sfx | bed | margin LU | speech median LU | speech p10 LU |
|---|---|---|---|---|---|---|---|---|
| meet (1-4) | 0.00-13.93 | -15.0 | -25.0 | -32.2 | -24.2 | 9.3 | 9.6 | 4.4 |
| lose (5-6) | 13.93-18.80 | -13.7 | -26.3 | -31.9 | -25.2 | 11.5 | 17.1 | 4.4 |
| chase (7-9) | 18.80-27.93 | -14.9 | -23.7 | -30.4 | -22.9 | 8.0 | 7.6 | 4.0 |
| search (10-11) | 27.93-37.80 | -13.5 | -24.0 | -37.5 | -23.8 | 10.3 | 10.8 | 3.7 |
| hope + fall (12-13) | 37.80-48.93 | -15.8 | -25.8 | -32.1 | -25.0 | 9.2 | 9.8 | 4.9 |
| garage (14) | 48.93-59.07 | -14.8 | -26.3 | -33.5 | -26.0 | 11.3 | 13.5 | 8.1 |
| magic (15-16) | 59.07-67.80 | -15.4 | -24.4 | -37.3 | -24.2 | 8.8 | 8.9 | 1.9 |
| flicker (17) | 67.80-73.63 | -18.2 | -31.0 | -37.0 | -30.2 | 12.0 | 11.1 | 8.3 |
| together (18) | 73.63-78.00 | -14.8 | -24.2 | -35.7 | -24.0 | 9.2 | 8.4 | 5.1 |

## Music map (original love theme, G major pentatonic, 92 bpm)
Music target per section, LU under the voice (after a -3 dB speech duck keyed from words.json): meet -10.0, lose -10.5, chase -9.5, round -9.5, search -10.5, hope -10.0, fall -10.0, garage -11.5, magic -9.0, flicker -11.0, end -9.0. Applied section gains (dB): meet -12.9, lose -11.8, chase -13.2, round -12.6, search -11.8, hope -12.3, fall -12.3, garage -11.1, magic -12.5, flicker -11.9, end -13.9.

Rides (music only, dB): 68.00-73.00 s -2.0, 76.40-78.00 s -1.5 - so quiet sentence-final words stay on top and the band blooms in the gaps after them. 

| time s | frame | music |
|---|---|---|
| 0.00 | 0 | meet: drone + santoor ripples + music-box motif |
| 6.20 | 186 | 'fell in love': the love motif on the fife |
| 13.03 | 391 | 'skipped a beat': the accompaniment drops out for 0.3 s |
| 14.53 | 436 | green light: the motif falls away; low pluck on 'gone' |
| 18.15 | 544 | chase: double-time oompah + snare, plucked motif; fife motif speeds up at the roundabout |
| 21.60 | 648 | roundabout: swirling glock circles |
| 25.97 | 779 | 'she wasn't there': stop + low tuba sigh |
| 27.93 | 838 | search: sad minor motif on plucks over a low drone |
| 29.33 | 880 | each 'pink roof!': a hopeful glock ping, then a deflating vibes fall |
| 37.80 | 1134 | 5:20: warm drone + santoor |
| 40.70 | 1221 | 'jasmine': the motif returns on the fife |
| 41.87 | 1256 | 'there she was': a soft heartbeat that quickens until the lamp post (silence) |
| 48.93 | 1468 | garage: lonely minor motif on a single pluck; a tuba bump for Happy Singh's laugh |
| 59.30 | 1779 | the door glows gold: glock shimmer rising + vibes |
| 61.57 | 1847 | after the soft honk: the full motif, fife over santoor + drone |
| 71.13 | 2134 | flicker pings: his two, then her two (higher) |
| 73.63 | 2209 | sunset: the full theme (fife + vibes an octave down) over santoor and drone |
| 77.73 | 2332 | soft G major button on 'time' |

## SFX events
Level convention: every EVENT has a naive level (LU vs the voice stem, as the event's max momentary loudness); applied = naive - 6 dB (standard mix rule) + distance/intensity offsets. BEDS are integrated loudness, not reduced. 'mix LUFS' = the event's max momentary loudness in the final mix (voice stem = -14.9 LUFS integrated). Column sounds also get the camera-distance low-pass and more valley reverb.

| # | time s | frame | cue | what | naive LU | applied LU | mix LUFS | pan |
|---|---|---|---|---|---|---|---|---|
| 1 | 0.000 | 0.0 | amb (bed, integrated) | morning Marine Drive: sea wash against the wall, gulls, traffic hum | -28 | -28.0 | -42.9 | +0.00 |
| 2 | 0.000 | 0.0 | idle_all | a queue of autos idling at the red light | -16 | -22.0 | -36.9 | +0.00 |
| 3 | 0.000 | 0.0 | idle_badshah | Badshah's own idle putt-putt | -14 | -20.0 | -34.9 | -0.10 |
| 4 | 5.833 | 175.0 | bijli_arrive | Bijli rolls up: a softer, smoother engine | -15 | -21.0 | -35.9 | +0.20 |
| 5 | 6.400 | 192.0 | squeak | Badshah's horn squeaks by itself (he's in love) | -12 | -18.0 | -32.9 | -0.10 |
| 6 | 13.033 | 391.0 | hiccup | his engine skips a beat: a stutter, a little backfire pop, a cough | -8 | -14.0 | -28.9 | -0.10 |
| 7 | 14.283 | 428.5 | sig_beep | signal changes (soft click) | -20 | -26.0 | -40.9 | +0.00 |
| 8 | 14.667 | 440.0 | bijli_go | Bijli glides away: engine rises and fades, a soft chime | -10 | -16.0 | -30.9 | +0.40 |
| 9 | 18.167 | 545.0 | goggles | Natraj snaps his goggles down: elastic snap | -11 | -17.0 | -31.9 | +0.00 |
| 10 | 18.417 | 552.5 | rev | Badshah revs up | -9 | -15.0 | -29.9 | +0.00 |
| 11 | 18.800 | 564.0 | chase_engine | Badshah at full speed along the sea wall | -9 | -15.0 | -29.9 | +0.00 |
| 12 | 19.467 | 584.0 | pass | whoosh past another auto + its horn | -12 | -18.0 | -32.9 | +0.50 |
| 13 | 20.133 | 604.0 | pass | whoosh past another auto + its horn | -12 | -18.0 | -32.9 | +0.10 |
| 14 | 20.667 | 620.0 | pass | whoosh past another auto + its horn | -12 | -18.0 | -32.9 | -0.30 |
| 15 | 20.800 | 624.0 | whip | whip round the corner: tyre squeal | -12 | -18.0 | -32.9 | +0.00 |
| 16 | 21.600 | 648.0 | round_horns | the roundabout: forty engines and a chorus of horns | -8 | -14.0 | -28.9 | +0.00 |
| 17 | 25.967 | 779.0 | dizzy | out of the roundabout: engine winds down, a dizzy wobble | -14 | -20.0 | -34.9 | +0.00 |
| 18 | 27.933 | 838.0 | amb (bed, integrated) | noon: busier traffic, distant town | -28 | -28.0 | -42.9 | +0.00 |
| 19 | 29.333 | 880.0 | toot | hopeful toot on 'pink roof!' | -12 | -18.0 | -32.9 | +0.00 |
| 20 | 30.167 | 905.0 | grandma | the grandma auto winks: a creaky old double honk | -12 | -18.0 | -32.9 | +0.30 |
| 21 | 31.000 | 930.0 | toot | hopeful toot on 'pink roof!' | -12 | -18.0 | -32.9 | +0.00 |
| 22 | 31.267 | 938.0 | umbrella | a pink umbrella pops open | -14 | -20.0 | -34.9 | +0.30 |
| 23 | 32.567 | 977.0 | amb (bed, integrated) | haze: muffled, flat | -31 | -31.0 | -45.9 | +0.00 |
| 24 | 32.767 | 983.0 | toot | hopeful toot on 'pink roof!' | -12 | -18.0 | -32.9 | +0.00 |
| 25 | 33.500 | 1005.0 | away | a far pink auto drives away | -18 | -24.0 | -38.9 | +0.40 |
| 26 | 35.100 | 1053.0 | sigh_horn | a sad, sagging horn sigh | -15 | -21.0 | -35.9 | +0.00 |
| 27 | 37.800 | 1134.0 | amb (bed, integrated) | 5:20: sea wash, evening birds | -28 | -28.0 | -42.9 | +0.00 |
| 28 | 37.800 | 1134.0 | slow_engine | Badshah putters slowly home | -16 | -22.0 | -36.9 | +0.00 |
| 29 | 40.700 | 1221.0 | jasmine | jasmine on the air: a soft airy shimmer | -16 | -22.0 | -36.9 | +0.00 |
| 30 | 46.967 | 1409.0 | across | he goes for it: engine rises | -9 | -15.0 | -29.9 | +0.00 |
| 31 | 48.400 | 1452.0 | boing | BOING: Badshah meets the lamp post | +0 | -6.0 | -20.9 | +0.00 |
| 32 | 48.520 | 1455.6 | crack | a headlight cracks (glass tinkle) | -12 | -18.0 | -32.9 | +0.00 |
| 33 | 48.900 | 1467.0 | stars | cartoon stars twinkling round his roof | -18 | -24.0 | -38.9 | +0.00 |
| 34 | 48.933 | 1468.0 | garage_room (bed, integrated) | garage room tone: a buzzing bulb, a slow drip, the street outside | -33 | -33.0 | -47.9 | +0.00 |
| 35 | 50.000 | 1500.0 | wrench | Happy Singh's spanner on metal | -16 | -22.0 | -36.9 | +0.30 |
| 36 | 51.167 | 1535.0 | tape | a strip of tape torn off the roll | -16 | -22.0 | -36.9 | +0.00 |
| 37 | 52.000 | 1560.0 | wrench | Happy Singh's spanner on metal | -16 | -22.0 | -36.9 | +0.30 |
| 38 | 53.333 | 1600.0 | wrench | Happy Singh's spanner on metal | -16 | -22.0 | -36.9 | +0.30 |
| 39 | 54.200 | 1626.0 | laugh | Happy Singh laughs and jokes, like always | -8 | -14.0 | -28.9 | +0.30 |
| 40 | 59.300 | 1779.0 | gold | the doorway fills with golden light: a warm airy swell | -18 | -24.0 | -38.9 | +0.00 |
| 41 | 61.000 | 1830.0 | whoosh | camera move | -15 | -21.0 | -35.9 | +0.00 |
| 42 | 61.567 | 1847.0 | chime | someone honks, very softly (Bijli's chime) | -10 | -16.0 | -30.9 | +0.20 |
| 43 | 62.733 | 1882.0 | bijli_in | Bijli rolls into the doorway, engine purring low | -16 | -22.0 | -36.9 | +0.20 |
| 44 | 66.333 | 1990.0 | flower | a jasmine flower on his mirror: a tiny tinkle | -18 | -24.0 | -38.9 | +0.00 |
| 45 | 68.000 | 2040.0 | whoosh | camera move | -15 | -21.0 | -35.9 | +0.00 |
| 46 | 71.133 | 2134.0 | click | headlight flicker click | -14 | -20.0 | -34.9 | -0.10 |
| 47 | 71.733 | 2152.0 | click | headlight flicker click | -14 | -20.0 | -34.9 | -0.10 |
| 48 | 72.600 | 2178.0 | click | headlight flicker click (Bijli) | -12 | -18.0 | -32.9 | +0.20 |
| 49 | 73.200 | 2196.0 | click | headlight flicker click (Bijli) | -12 | -18.0 | -32.9 | +0.20 |
| 50 | 73.633 | 2209.0 | amb (bed, integrated) | 6 pm: waves, breeze, a few gulls | -27 | -27.0 | -41.9 | +0.00 |
| 51 | 73.633 | 2209.0 | two_engines | two autos side by side, both purring slowly | -15 | -21.0 | -35.9 | +0.00 |
