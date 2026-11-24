# Picture timeline of "Karela" (Ramu aur Vidya), mirrored (read-only) from remotion/src/videos/karela/story.ts (24 fps).
import json
import math

FPS = 24
TOTAL = math.ceil((340.168 + 0.2) * FPS)
DUR = TOTAL / FPS
fr = lambda f: f / FPS
FLASH = -10.0
XFADE = {}
STARTS = [0, 8.0, 14.7, 19.6, 23.0, 24.6, 26.0, 29.2, 31.0, 35.8, 40.5, 45.0, 49.8, 52.6, 56.4, 62.9, 68.4, 72.5, 75.8, 80.2, 84.6, 90.3,
          94.8, 99.0, 104.5, 107.5, 110.0, 115.0, 122.1, 126.4, 131.6, 134.4, 138.4, 141.3, 151.4, 155.9, 165.6, 169.6, 176.2, 180.5,
          190.2, 197.8, 202.0, 208.5, 214.2, 218.5, 222.6, 224.6, 228.9, 233.5, 236.8, 243.2, 249.2, 253.6, 257.4, 260.4, 262.2, 266.2,
          268.2, 275.6, 283.4, 286.2, 293.4, 299.0, 307.9, 313.3]
SHOTS = {i + 1: (round(a * FPS), round((STARTS[i + 1] if i + 1 < len(STARTS) else DUR) * FPS)) for i, a in enumerate(STARTS)}

# story events (s)
HOE = [t / 100 for t in range(0, 2390, 1)]  # placeholder (hits are computed in sfx.py from the swing)
NIGHT1 = (52.6, 72.5); NIGHT2 = (126.4, 131.6); NIGHT3 = (236.8, 283.4)
WRECK1 = 72.5; SHOCK1 = 75.85; WRECK2 = 131.6; GIVEUP = 141.4; IDEA = 158.45; WHISPER = 169.7
PLOW = (99.05, 104.5); SOW = (104.5, 107.5); WATER = (107.5, 115.0); GROW = (110.0, 115.0)
PLANT = (202.0, 214.2); MONTAGE = (214.2, 224.6)
BOARS_OUT = 249.2; AT_VINES = 255.4; BITE = 257.4; BITTER = 260.4; OTHERS = [261.45, 262.0, 262.55, 263.1, 263.65]; RUN = 267.8; GONE = 275.6
SUNRISE = 283.4; HAPPY = 286.2; MORAL = 315.77; LAST = 335.7


def shot_t(i):
    a, b = SHOTS[i]
    return fr(a), fr(b)


def words(path):
    W = json.load(open(path, encoding="utf-8"))
    W = W["words"] if isinstance(W, dict) else W
    for w in W:
        w.setdefault("s", w["start"]); w.setdefault("e", w["end"]); w.setdefault("w", w.get("text", ""))
    return W
