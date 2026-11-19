# Picture timeline of "Rikshaw Love", mirrored (read-only) from remotion/src/videos/rikshaw/story.ts.
import json

FPS = 30
TOTAL = 2340
DUR = TOTAL / FPS            # 78.0 s exactly
fr = lambda f: f / FPS
FLASH = -10.0                # no white flash in this film

SHOTS = {
    1: (0, 108), 2: (108, 205), 3: (205, 311), 4: (311, 418), 5: (418, 487), 6: (487, 564), 7: (564, 648), 8: (648, 779),
    9: (779, 838), 10: (838, 977), 11: (977, 1134), 12: (1134, 1312), 13: (1312, 1468), 14: (1468, 1772), 15: (1772, 1963),
    16: (1963, 2034), 17: (2034, 2209), 18: (2209, TOTAL),
}
XFADE = {10: 10, 11: 12, 12: 12, 14: 10, 18: 12}
# story events (frames, from story.ts / cast.ts)
LOVE_F = 186; WIDE_F = 336; BEAT_F = 391; GREEN_F = 436; GO_F = 470; GONE_F = 472; GOGGLES_F = 545
CHASE_F = 564; CORNER_F = 624; ROUND_F = 648; SAME_F = 708; EXIT_F = 779
PINK1_F = 880; WINK_F = 905; PINK2_F = 930; UMB_F = 956; PINK3_F = 983; AWAY_F = 1005; DROOP_F = 1041
JASMINE_F = 1221; THERE_F = 1256; ACROSS_F = 1409; CRASH_F = 1452
GARAGE_F = 1468; LAUGH_F = 1626; HELLO_F = 1721
GOLD_F = 1779; HONK_F = 1847; BIJLI_IN = 1882; REVEAL_F = 1890; FLOWER_F = 1990
FLICK1 = 2134; FLICK2 = 2152; BACK1 = 2178; BACK2 = 2196; END_F = 2209; LAST_F = 2332


def shot_t(i):
    a, b = SHOTS[i]
    return fr(a), fr(b)


def words(path):
    W = json.load(open(path, encoding="utf-8"))
    for w in W:
        w.setdefault("s", w["start"]); w.setdefault("e", w["end"]); w.setdefault("w", w["word"])
    return W
