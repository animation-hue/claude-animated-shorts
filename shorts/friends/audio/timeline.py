# Picture timeline of "Two Friends and the Bear", mirrored (read-only) from remotion/src/videos/friends/story.ts.
# All event times are seconds from words.json (the story is timed to the narration).
import json

FPS = 30
TOTAL = 5640
DUR = TOTAL / FPS            # 188.0 s
fr = lambda f: f / FPS
FLASH = -10.0

# shot starts (s), from story.ts PLANS
STARTS = [0, 3.4, 5.35, 8.9, 13.2, 18.7, 23.1, 26.15, 29.65, 32.4, 37.95, 44.85, 46.9, 48.2, 49.6, 53.2, 54.75, 58.0,
          60.95, 64.95, 69.1, 70.45, 71.65, 75.5, 76.6, 79.2, 81.2, 83.85, 89.3, 92.7, 98.2, 104.35, 107.15, 110.1, 112.0,
          113.45, 114.95, 116.1, 120.85, 129.5, 133.65, 138.15, 142.95, 146.85, 153.2, 156.3, 165.95, 167.95, 172.0, 174.8, 179.4]
SHOTS = {i + 1: (round(a * FPS), round((STARTS[i + 1] if i + 1 < len(STARTS) else DUR) * FPS)) for i, a in enumerate(STARTS)}
XFADE = {}

HANDS1 = [5.48, 6.30, 7.15, 8.05]
HANDS2 = [26.30, 27.27, 27.95, 28.63]
HANDS3 = [169.89, 171.14]
BRAVE = [35.11, 35.75, 36.18]              # "sher, saanp, bhoot"
JUMPS = [(47.2, 0.45), (53.75, 0.9), (61.4, 1.55)]
RUSTLE = 45.38; RABBIT = 48.25; GROWL = 50.9; SHADOW = 58.2; SHOES = 61.9; HORNBILL = 65.2; LAUGH = 69.5; NOLAUGH = 70.5
BUSH_OPEN = 72.57; BEAR_OUT = 74.6; FREEZE = 79.26; STICK = 82.25; RUN = 83.1; CLIMB = 86.2; TOP = 89.3
ALONE = 92.8; MEMORY = 98.2; MEMORY_END = 104.35; LIE = 106.1; BREATH = 109.1
BEAR_COMES = 110.2; SNIFF = [112.45, 113.79, 115.34]; WHISPER = 121.0; WHISPER_END = 133.7; BEAR_GOES = 134.9
DOWN = 143.0; LAND = 144.7; DUST = 145.0; SMILE = 146.03; STAND = 153.3; LESSON = 160.3; SMILE_GONE = 166.4
GOLD = 165.95; BAG = 175.6; WALK_AWAY = 175.8; MORAL = 179.5; LAST = 185.24


def shot_t(i):
    a, b = SHOTS[i]
    return fr(a), fr(b)


def words(path):
    W = json.load(open(path, encoding="utf-8"))
    W = W["words"] if isinstance(W, dict) else W
    for w in W:
        w.setdefault("s", w["start"]); w.setdefault("e", w["end"]); w.setdefault("w", w.get("text", w.get("word", "")))
    return W
