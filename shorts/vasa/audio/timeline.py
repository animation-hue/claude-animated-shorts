# Picture timeline of the Vasa short, mirrored (read-only) from remotion/src/videos/vasa/story.ts so every sound
# lands on its frame. Times in seconds; frames at 30 fps.
import json

FPS = 30
TOTAL = 2040
DUR = TOTAL / FPS            # 68.0 s exactly
fr = lambda f: f / FPS
FLASH = fr(176)

# id: (first frame, end frame, light, crowd)  (story.ts SHOTS)
SHOTS = {
    1: (0, 119, "day", "sail"), 2: (119, 176, "day", "masts"), 3: (176, 206, "day", "builder"), 4: (206, 281, "day", "king"),
    5: (281, 419, "day", "none"), 6: (419, 499, "day", "builder"), 7: (499, 567, "day", "admiral"), 8: (567, 836, "day", "test"),
    9: (836, 910, "day", "admiral"), 10: (910, 945, "day", "launch"), 11: (945, 1034, "golden", "shore"), 12: (1034, 1181, "golden", "sail"),
    13: (1181, 1397, "golden", "masts"), 14: (1397, 1530, "day", "boat"), 15: (1530, 1628, "day", "none"), 16: (1628, 1735, "day", "inquiry"),
    17: (1735, 1809, "day", "kingInq"), 18: (1809, 1896, "day", "lift"), 19: (1896, TOTAL, "day", "tourists"),
}
XFADE = {11: 8, 14: 8, 15: 6, 16: 8, 18: 8, 19: 6}
# story events (frames, from story.ts / cast.ts)
RUNS = [592, 652, 698, 746]   # stability-test crossings start
RUN_F = 30
STOP_F = 779                  # "stopped them"
LURCH_F = 812                 # "fell over"
PORTS_LOW, PORTS_UP = 310, 388  # lid ripples (2.2 f apart, 12 lids)
SALUTE_PORTS = 975            # ports open for the salute (1.6 f apart)
SALUTE_F = 1017               # first gun (bow first, 1.2 f apart, 12 guns)
GUST_F, LEAN_F, SEA_F, SINK0_F = 1082, 1102, 1133, 1138
STAND_F, SIT_F = 1405, 1490   # the kid in the rowing boat
LIFT_F = 1858                 # raising starts (40 f)
CUTS = [119, 206, 281, 419, 499, 567, 652, 746, 836, 910, 945, 1012, 1034, 1082, 1133, 1181, 1310, 1397, 1476, 1530, 1628, 1684, 1735, 1783, 1809, 1896, 2003]


def shot_t(i):
    a, b = SHOTS[i][:2]
    return fr(a), fr(b)


def words(path):
    """words.json (start/end in s) -> also exposes the template's short keys s/e/w"""
    W = json.load(open(path, encoding="utf-8"))
    for w in W:
        w.setdefault("s", w["start"]); w.setdefault("e", w["end"]); w.setdefault("w", w["word"])
    return W
