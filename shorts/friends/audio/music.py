# Original score for "Two Friends and the Bear", composed and synthesized here: ONE friendship theme (D major
# pentatonic, 100 bpm, bansuri-like fife over a tanpura drone and santoor-like plucks) varied per beat:
# bright and bouncy for the friends + the handshake (a pluck hit on every slap/bump/thumb) | a light walking march into
# the jungle (tuba bumps on "sher, saanp, bhoot") | comic tiptoe pizzicato for the false alarms, a hit on every jump |
# a low drone + timpani for the bear, a frantic snare for the run | near-silence for playing dead (a soft heartbeat,
# nothing at all for the whisper) | a sneaky pluck as Ram climbs down | the theme slow and minor for the lesson and the
# unfinished handshake | warm and soft for the moral, a gentle button on the last word.
import numpy as np
from dsp import SR, ns, rng, pan, place, dbg, make_ir, convolve_st, integrated, lp, hp
import instruments as I
import timeline as T

N = ns(T.DUR)
Q = 60.0 / 100.0
F = I.m2f

# the friendship motif (beat, length in quarters, midi) - 4 bars, D major pentatonic
MOTIF = [(0, .5, 74), (.5, .5, 76), (1, 1, 78), (2, 1, 81), (3, 1, 78),
         (4, .5, 76), (4.5, .5, 74), (5, 1, 76), (6, 2, 69),
         (8, .5, 74), (8.5, .5, 76), (9, 1, 78), (10, 1, 83), (11, 1, 81),
         (12, 1.5, 78), (13.5, .5, 76), (14, 2, 74)]
MINOR = {78: 77, 83: 82}   # F# -> F, B -> Bb: D minor colour for the sad versions

SECTIONS = [("friends", 0.0, 13.2), ("journey", 13.2, 44.85), ("alarms", 44.85, 71.65), ("bear", 71.65, 81.2),
            ("run", 81.2, 92.7), ("alone", 92.7, 98.2), ("memory", 98.2, 104.35), ("still", 104.35, 137.5),
            ("relief", 137.5, 153.2), ("lesson", 153.2, 167.95), ("handshake", 167.95, 179.4), ("moral", 179.4, T.DUR)]
QUIET = set()
HARD = [T.BEAR_OUT - 0.02, T.STICK]


class Band:
    def __init__(self):
        self.tr, self.send, self.cues = {}, {}, []

    def track(self, name, send=0.15):
        if name not in self.tr:
            self.tr[name] = np.zeros((2, N)); self.send[name] = send
        return self.tr[name]

    def add(self, name, x, t, p=0.0, g=1.0):
        if t >= T.DUR or t < -1:
            return
        place(self.track(name), pan(x, p) if np.ndim(x) == 1 else x, max(0.0, t), g)


R = rng(2611)
_r = lambda: rng(int(R.integers(1 << 30)))


def motif(b, name, t0, q=Q, vel=0.7, fn="fife", transpose=0, minor=False, until=None, notes=MOTIF, p=0.0):
    for (bt, d, m) in notes:
        t = t0 + bt * q
        if until is not None and t >= until:
            continue
        mm = (MINOR.get(m, m) if minor else m) + transpose
        dd = d * q
        if until is not None:
            dd = min(dd, until - t - 0.02)
        x = {"fife": lambda: I.fife(F(mm), dd * 0.92, vel * R.uniform(0.94, 1.04), _r()),
             "glock": lambda: I.glock(F(mm), vel * R.uniform(0.92, 1.05), _r()),
             "musicbox": lambda: I.musicbox(F(mm), vel * R.uniform(0.92, 1.05), _r()),
             "vibes": lambda: I.vibes(F(mm), vel * R.uniform(0.92, 1.05), _r(), dur=max(1.2, dd + 0.8), damp=dd + 0.35),
             "pluck": lambda: I.pluck(F(mm), vel * R.uniform(0.9, 1.05), _r(), dur=0.9, bright=0.65)}[fn]()
        b.add(name, x, t, p)


def drone(b, t0, t1, root=38, vel=0.35, warm=1100):
    d = t1 - t0
    if d > 0.3:
        b.add("pad", I.pad([F(root), F(root + 7), F(root + 12), F(root + 19)], d, vel, _r(), att=min(1.2, d / 3), rel=1.0, warm=warm), t0)


def santoor(b, t0, t1, chord=(62, 66, 69, 74, 78), q=Q / 2, vel=0.45, p=0.25):
    t, k = t0, 0
    while t < t1:
        b.add("pluck", I.pluck(F(chord[k % len(chord)] + (12 if (k // len(chord)) % 2 else 0)), vel * (0.8 + 0.2 * (k % 2)), _r(), dur=0.7, bright=0.75), t, p * np.sin(k))
        t += q; k += 1


def hits(b, times, notes=(74, 78, 81, 86), vel=0.6):
    for t, m in zip(times, notes):
        b.add("pluck", I.pluck(F(m - 12), vel, _r(), dur=0.5, bright=0.8), t - 0.01, -0.2)
        b.add("glock", I.glock(F(m + 12), vel * 0.7, _r()), t - 0.01, 0.2)


def build():
    b = Band()
    for name, send in [("fife", 0.22), ("glock", 0.24), ("musicbox", 0.28), ("vibes", 0.28), ("pluck", 0.2), ("pad", 0.3),
                       ("tuba", 0.1), ("snare", 0.13), ("brush", 0.12), ("timpani", 0.18), ("triangle", 0.2), ("stab", 0.16)]:
        b.track(name, send)
    # ---- friends: bright, bouncy; the handshake hits
    drone(b, 0.0, 13.4)
    santoor(b, 0.15, 5.3, vel=0.4)
    motif(b, "fife", 0.25, vel=0.62, until=5.3)
    hits(b, T.HANDS1)
    santoor(b, 8.8, 13.2, vel=0.4)
    motif(b, "fife", 9.0, vel=0.6, notes=MOTIF[9:], q=Q * 0.75, until=13.2)
    b.cues.append((0.0, "friends: drone + santoor ripples + the friendship motif on the fife"))
    b.cues.append((T.HANDS1[0], "the secret handshake: a pluck + glock hit on each slap, slap, bump, thumbs"))
    # ---- journey: walking march, promise hits, tuba bumps on the boast
    drone(b, 13.2, 44.9, vel=0.28)
    t0 = 13.35
    t = t0
    while t < 44.7:
        k = int(round((t - t0) / Q))
        b.add("pluck", I.pluck(F([50, 57][k % 2]), 0.45, _r(), dur=0.5, bright=0.5), t, -0.15)
        if k % 2: b.add("brush", I.brush(0.3, _r(), 0.2), t, 0.1)
        t += Q
    motif(b, "fife", 13.4, vel=0.55, until=18.6)
    hits(b, T.HANDS2)
    motif(b, "fife", 29.7, vel=0.6, until=37.9)
    for tt_, m in zip(T.BRAVE, [43, 45, 47]): b.add("tuba", I.brass(F(m), 0.3, 0.6, _r(), "tuba"), tt_ - 0.02)
    motif(b, "vibes", 38.0, q=Q * 1.2, vel=0.4, until=44.7, p=0.2)
    b.cues.append((13.35, "journey: a walking bass of plucks + brushes under the motif"))
    b.cues.append((T.BRAVE[0], "'sher, saanp, bhoot': three proud tuba bumps"))
    b.cues.append((38.0, "the tall quiet jungle: the motif on vibes, slower"))
    # ---- alarms: tiptoe pizzicato, a hit on every jump, a glock giggle for Shyam's laugh
    t, k = 44.9, 0
    while t < 71.5:
        if not any(j0 - 0.05 <= t < j0 + 0.7 for j0, _ in T.JUMPS):
            b.add("pluck", I.pluck(F([62, 65, 69, 65][k % 4]), 0.35, _r(), dur=0.35, bright=0.9), t, 0.3 * np.sin(k))
        t += Q / 2; k += 1
    for j0, h in T.JUMPS:
        b.add("timpani", I.timpani(F(45), 0.5 + 0.25 * h, _r(), dur=0.8), j0)
        for j, m in enumerate([81, 86, 90][: 1 + int(h > 0.6) + int(h > 1.2)]): b.add("glock", I.glock(F(m), 0.55, _r()), j0 + 0.06 * j, 0.2)
    for j, m in enumerate([86, 88, 90, 88, 86]): b.add("glock", I.glock(F(m), 0.4, _r()), T.LAUGH + 0.09 * j, 0.3)
    b.add("tuba", I.brass(F(38), 0.5, 0.5, _r(), "tuba", fall=-2), T.NOLAUGH + 0.3)
    b.cues.append((44.9, "false alarms: tiptoe pizzicato; timpani + glock hit on each jump, bigger each time"))
    # ---- bear: the music stops, a low drone, a timpani hit as it comes out
    drone(b, 71.65, 81.3, root=26, vel=0.45, warm=500)
    b.add("timpani", I.timpani(F(33), 0.95, _r(), dur=2.4), T.BEAR_OUT)
    b.add("stab", I.brass(F(38), 0.9, 0.55, _r(), "tuba"), T.BEAR_OUT)
    b.cues.append((71.65, "the bear: everything stops; a low drone; a timpani + low brass hit as it steps out"))
    # ---- run: frantic snare roll + fast low plucks, a stinger at the top of the tree
    for (ts, v) in I.snare_roll(T.STICK, T.TOP, 0.2, 0.5, _r(), rate=18.0): b.add("snare", I.snare(v, _r(), dur=0.12), ts, 0.05)
    t, k = T.STICK, 0
    while t < T.TOP:
        b.add("pluck", I.pluck(F([38, 41, 45, 41][k % 4]), 0.55, _r(), dur=0.3, bright=0.7), t); t += Q / 3; k += 1
    b.add("stab", I.brass(F(50), 0.5, 0.5, _r(), "horn"), T.TOP)
    drone(b, T.TOP, 98.3, root=26, vel=0.32, warm=600)
    b.cues.append((T.STICK, "Ram runs: snare roll + racing low plucks; a horn stab when he reaches the top"))
    # ---- alone + memory
    motif(b, "pluck", T.ALONE + 0.4, q=Q * 1.4, vel=0.4, minor=True, notes=MOTIF[:5], until=98.1)
    motif(b, "musicbox", 98.4, q=Q * 1.1, vel=0.35, notes=MOTIF[:9], until=104.2)
    b.add("vibes", I.vibes(F(74), 0.35, _r(), dur=3.0), 98.25)
    b.cues.append((T.ALONE, "Shyam alone: the motif in minor on a lone pluck"))
    b.cues.append((98.25, "Grandma's memory: the motif on a music box"))
    # ---- still: near silence; a soft slow heartbeat while the bear sniffs; nothing for the whisper
    drone(b, 104.35, 137.6, root=26, vel=0.22, warm=400)
    hb = T.BEAR_COMES
    while hb < T.WHISPER - 0.2:
        b.add("timpani", I.timpani(F(33), 0.35, _r(), dur=0.5), hb); b.add("timpani", I.timpani(F(33), 0.25, _r(), dur=0.4), hb + 0.24)
        hb += 0.95
    b.cues.append((104.35, "playing dead: only a very low drone"))
    b.cues.append((T.BEAR_COMES, "the bear sniffs: a soft slow heartbeat, stopping for the whisper"))
    # ---- relief: the bear leaves, a sneaky pluck as Ram climbs down
    b.add("vibes", I.vibes(F(74), 0.4, _r(), dur=2.5), 137.6)
    drone(b, 137.6, 153.3, root=38, vel=0.25)
    for j, m in enumerate([62, 64, 66, 69, 66, 64, 62, 57]): b.add("pluck", I.pluck(F(m), 0.4, _r(), dur=0.35), T.DOWN + 0.2 * j, 0.2)
    motif(b, "pluck", T.SMILE, q=Q * 0.8, vel=0.4, notes=MOTIF[:5], until=153.0)
    b.cues.append((T.DOWN, "Ram climbs down: a sneaky descending pluck"))
    # ---- lesson: slow and minor
    drone(b, 153.2, 168.0, root=38, vel=0.3)
    motif(b, "vibes", 156.4, q=Q * 1.5, vel=0.36, minor=True, until=166.2, p=-0.15)
    b.cues.append((156.4, "the lesson: the motif slow and minor on vibes"))
    # ---- handshake: the unfinished handshake (two hits, then nothing), the motif sad on music box
    hits(b, T.HANDS3, notes=(74, 78), vel=0.45)
    motif(b, "musicbox", 172.2, q=Q * 1.4, vel=0.32, minor=True, notes=MOTIF[:9], until=179.3)
    drone(b, 168.0, 179.6, root=38, vel=0.3)
    b.cues.append((T.HANDS3[0], "the handshake again: only two hits, then silence where the bump should be"))
    # ---- moral: warm, soft, full theme; gentle button on the last word
    drone(b, 179.4, T.DUR, root=38, vel=0.42)
    santoor(b, 179.5, T.DUR - 1.0, vel=0.33)
    motif(b, "fife", 179.6, vel=0.55, until=T.LAST - 0.1)
    for m in [38, 50, 57, 62, 66, 69]: b.add("stab", I.brass(F(m), 0.8, 0.4, _r(), "soft"), T.LAST)
    b.add("glock", I.glock(F(86), 0.45, _r()), T.LAST); b.add("triangle", I.triangle(0.3, _r(), 1.2), T.LAST)
    b.cues.append((179.5, "the moral: the full theme, warm and soft"))
    b.cues.append((T.LAST, "a soft D major button on the last word"))
    return b


TARGET = {"fife": 0.0, "glock": -6.0, "musicbox": -2.0, "vibes": -4.0, "pluck": -3.0, "pad": -5.0, "tuba": -3.0,
          "snare": -7.0, "brush": -12.0, "timpani": -6.0, "triangle": -15.0, "stab": -4.0}


def render(b, ref=-20.0):
    hall = make_ir(1.7, 9, pre=0.02, hf=1.3)
    dry = np.zeros((2, N)); wet = np.zeros((2, N)); levels = {}
    for k, x in b.tr.items():
        if not np.any(x):
            continue
        L = integrated(x)
        g = dbg(ref + TARGET.get(k, -6) - L)
        levels[k] = (round(L, 1), round(ref + TARGET.get(k, -6), 1))
        x = x * g; b.tr[k] = x
        dry += x; wet += b.send[k] * x
    out = dry + 0.75 * convolve_st(wet.mean(0), hall)
    out = hp(out, 30, 2)
    # the whisper: no music at all
    t = np.arange(N) / SR
    a, e = T.WHISPER, T.WHISPER_END
    m = (t >= a) & (t < e)
    out[:, m] *= np.clip(1 - (t[m] - a) / 0.6, 0, 1)[None, :] + np.clip((t[m] - (e - 0.6)) / 0.6, 0, 1)[None, :]
    return out, levels
