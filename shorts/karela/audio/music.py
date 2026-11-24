# Original score for "Karela" (Ramu aur Vidya), composed and synthesized here, following the user's music table: ONE
# village theme (D major pentatonic, 96 bpm, bansuri-like fife over a tanpura drone and santoor-like plucks):
# light rural intro | uplifting harvest | a lullaby for the sleeping couple, then a low suspense drone over the field |
# sad and slow for the first loss | motivational for the time-lapse | hopeful second crop | a darker suspense night |
# slower, sadder for the second loss | hush -> hopeful glow for Vidya's idea | motivational planting + growing |
# suspense with light comic plucks for the boars | a funny comic cue for the karela bite and bitter faces |
# a comic chase as they run | calm moonlit field | sunrise + happy ending: warm, inspirational, full theme | button.
import numpy as np
from dsp import SR, ns, rng, pan, place, dbg, make_ir, convolve_st, integrated, lp, hp
import instruments as I
import timeline as T

N = ns(T.DUR)
Q = 60.0 / 96.0
F = I.m2f

MOTIF = [(0, .5, 74), (.5, .5, 76), (1, 1, 78), (2, 1, 81), (3, 1, 78),
         (4, .5, 76), (4.5, .5, 74), (5, 1, 76), (6, 2, 69),
         (8, .5, 74), (8.5, .5, 76), (9, 1, 78), (10, 1, 83), (11, 1, 81),
         (12, 1.5, 78), (13.5, .5, 76), (14, 2, 74)]
MINOR = {78: 77, 83: 82}

SECTIONS = [("intro", 0.0, 26.0), ("harvest", 26.0, 52.6), ("lullaby", 52.6, 62.9), ("prowl1", 62.9, 72.5), ("loss1", 72.5, 99.0),
            ("timelapse", 99.0, 115.0), ("hope", 115.0, 126.4), ("prowl2", 126.4, 131.6), ("loss2", 131.6, 155.9),
            ("idea", 155.9, 202.0), ("plant", 202.0, 236.8), ("night3", 236.8, 257.4), ("comic", 257.4, 275.6),
            ("calm", 275.6, 283.4), ("finale", 283.4, T.DUR)]
QUIET = set()
HARD = [T.WRECK1, T.WRECK2, T.BITE]


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


R = rng(7311)
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


def loop_motif(b, name, t0, t1, **kw):
    t = t0
    while t < t1 - 1.0:
        motif(b, name, t, until=t1, **kw); t += 16 * kw.get("q", Q)


def drone(b, t0, t1, root=38, vel=0.35, warm=1100):
    d = t1 - t0
    if d > 0.3:
        b.add("pad", I.pad([F(root), F(root + 7), F(root + 12), F(root + 19)], d, vel, _r(), att=min(1.2, d / 3), rel=1.0, warm=warm), t0)


def santoor(b, t0, t1, chord=(62, 66, 69, 74, 78), q=Q / 2, vel=0.45, p=0.25):
    t, k = t0, 0
    while t < t1:
        b.add("pluck", I.pluck(F(chord[k % len(chord)] + (12 if (k // len(chord)) % 2 else 0)), vel * (0.8 + 0.2 * (k % 2)), _r(), dur=0.7, bright=0.75), t, p * np.sin(k))
        t += q; k += 1


def walk_bass(b, t0, t1, notes=(50, 57), q=Q, vel=0.45, brush=True):
    t, k = t0, 0
    while t < t1:
        b.add("pluck", I.pluck(F(notes[k % len(notes)]), vel, _r(), dur=0.5, bright=0.5), t, -0.15)
        if brush and k % 2: b.add("brush", I.brush(0.3, _r(), 0.2), t, 0.1)
        t += q; k += 1


def build():
    b = Band()
    for name, send in [("fife", 0.22), ("glock", 0.24), ("musicbox", 0.28), ("vibes", 0.28), ("pluck", 0.2), ("pad", 0.3),
                       ("tuba", 0.1), ("snare", 0.13), ("brush", 0.12), ("timpani", 0.18), ("triangle", 0.2), ("stab", 0.16)]:
        b.track(name, send)
    # intro: light rural - drone, santoor, bansuri motif
    drone(b, 0, 26.2); santoor(b, 0.3, 26.0, vel=0.38)
    loop_motif(b, "fife", 1.0, 26.0, vel=0.6)
    b.cues.append((0.0, "intro: tanpura drone, santoor ripples, the village theme on the bansuri"))
    # harvest: uplifting - walking bass, brighter theme, glock sparkle on the corn
    drone(b, 26.0, 52.8, vel=0.32); walk_bass(b, 26.0, 52.6); santoor(b, 26.0, 52.6, vel=0.32)
    loop_motif(b, "fife", 26.2, 52.6, vel=0.62, q=Q * 0.9)
    for j, m in enumerate([86, 90, 93, 98]): b.add("glock", I.glock(F(m), 0.5, _r()), 29.3 + 0.12 * j, 0.3)
    b.cues.append((26.0, "harvest: uplifting - walking bass + brighter theme; glock sparkle on the golden cob"))
    # lullaby, then the prowl
    motif(b, "musicbox", 52.8, q=Q * 1.3, vel=0.38, until=62.8)
    drone(b, 52.6, 63.0, root=38, vel=0.25)
    drone(b, 62.9, 72.6, root=26, vel=0.42, warm=450)
    for k in range(5): b.add("pluck", I.pluck(F([38, 41][k % 2]), 0.5, _r(), dur=0.6, bright=0.4), 64.0 + 1.6 * k)
    b.cues.append((52.8, "night: a music-box lullaby for the sleeping couple"))
    b.cues.append((62.9, "the moonlit field: a low suspense drone, slow low plucks"))
    # loss 1: sad, slow (minor theme on vibes over a dark drone)
    b.add("timpani", I.timpani(F(33), 0.7, _r(), dur=2.4), T.WRECK1)
    drone(b, 72.5, 99.1, root=38, vel=0.3, warm=700)
    motif(b, "vibes", 76.5, q=Q * 1.5, vel=0.4, minor=True, until=98.8, p=-0.15)
    b.cues.append((72.5, "the field destroyed: a soft timpani, then the theme slow and minor on vibes"))
    # time-lapse: motivational, quicker
    drone(b, 99.0, 115.1, vel=0.32); walk_bass(b, 99.0, 115.0, q=Q / 2, vel=0.4)
    loop_motif(b, "fife", 99.2, 115.0, vel=0.6, q=Q * 0.75)
    for j in range(8): b.add("glock", I.glock(F([78, 81, 83, 86, 90, 93, 95, 98][j]), 0.4, _r()), 110.2 + 0.55 * j, 0.25)
    b.cues.append((99.0, "time-lapse: motivational double-time theme; rising glock as the corn grows"))
    # hope
    drone(b, 115.0, 126.5); santoor(b, 115.0, 126.4, vel=0.35); motif(b, "fife", 115.2, vel=0.55, until=126.3)
    # prowl 2: darker
    drone(b, 126.4, 131.7, root=25, vel=0.45, warm=400)
    for k in range(3): b.add("timpani", I.timpani(F(31), 0.35, _r(), dur=0.8), 127.0 + 1.4 * k)
    # loss 2: slower, sadder
    b.add("timpani", I.timpani(F(31), 0.65, _r(), dur=2.6), T.WRECK2)
    drone(b, 131.6, 156.0, root=38, vel=0.3, warm=600)
    motif(b, "pluck", 134.6, q=Q * 1.8, vel=0.38, minor=True, until=155.8)
    b.cues.append((131.6, "the second loss: slower, sadder - a lone minor pluck"))
    # idea: a hush, then the glow
    drone(b, 155.9, 158.5, root=38, vel=0.22)
    for j, m in enumerate([74, 78, 81, 86, 90]): b.add("glock", I.glock(F(m), 0.45, _r()), T.IDEA - 0.05 + 0.09 * j, 0.2)
    b.add("vibes", I.vibes(F(86), 0.45, _r(), dur=2.4), T.IDEA)
    drone(b, 158.4, 202.1, vel=0.26); santoor(b, 158.6, 202.0, vel=0.28, q=Q)
    motif(b, "musicbox", 170.0, q=Q * 1.2, vel=0.32, until=189.0)
    motif(b, "fife", 190.4, vel=0.55, until=201.8)
    b.cues.append((T.IDEA, "Vidya's idea: a hush, then a glock 'ping' of a bright idea; hopeful santoor"))
    # plant + grow: motivational
    drone(b, 202.0, 236.9, vel=0.32); walk_bass(b, 202.0, 236.6)
    loop_motif(b, "fife", 202.2, 236.6, vel=0.62, q=Q * 0.85)
    for j in range(10): b.add("glock", I.glock(F([78, 81, 83, 86, 90, 93, 95, 98, 102, 105][j]), 0.38, _r()), 214.4 + 1.0 * j, 0.2)
    b.cues.append((202.0, "the new plan: motivational theme over a walking bass; rising glock in the montage"))
    # night 3: suspense with light comic plucks (tiptoe) as the boars come out
    motif(b, "musicbox", 237.0, q=Q * 1.3, vel=0.34, until=243.1)
    drone(b, 243.2, 257.5, root=26, vel=0.4, warm=500)
    t, k = 249.2, 0
    while t < 257.3: b.add("pluck", I.pluck(F([45, 48, 52, 48][k % 4]), 0.45, _r(), dur=0.3, bright=0.9), t, 0.3 * np.sin(k)); t += Q / 2; k += 1
    b.cues.append((249.2, "the boars: suspense drone + tiptoe pizzicato"))
    # comic: bite (a crunch is SFX), the bitter face: a tuba 'wah-wah' fall + glock squeal; each boar a smaller one
    b.add("tuba", I.brass(F(41), 0.9, 0.7, _r(), "tuba", fall=-7), T.BITTER)
    b.add("stab", I.brass(F(53), 0.5, 0.5, _r(), "horn", fall=-5), T.BITTER + 0.05)
    for j, t0 in enumerate(T.OTHERS):
        b.add("tuba", I.brass(F(43 + 2 * (j % 3)), 0.5, 0.5, _r(), "tuba", fall=-5), t0 + 1.4)
    t, k = T.BITTER + 1.2, 0
    while t < T.RUN: b.add("pluck", I.pluck(F([62, 65, 61, 65][k % 4]), 0.35, _r(), dur=0.3, bright=0.9), t, 0.3 * np.sin(k)); t += Q / 2; k += 1
    # the chase: comic double-time oompah
    q2 = 0.42
    t, k = T.RUN, 0
    while t < 275.4:
        b.add("tuba", I.brass(F([38, 45][k % 2]), 0.2, 0.55, _r(), "tuba"), t)
        for s in (0, 2): b.add("snare", I.snare(0.4, _r(), dur=0.15), t + s * q2 / 4, 0.05)
        t += q2; k += 1
    motif(b, "fife", T.RUN, q=q2 * 0.75, vel=0.55, until=275.4)
    b.cues.append((T.BITTER, "the bitter face: a tuba 'wah' fall + horn; smaller wahs for each boar that tastes"))
    b.cues.append((T.RUN, "they run: comic double-time chase"))
    # calm
    drone(b, 275.6, 283.6, vel=0.3); motif(b, "musicbox", 275.8, q=Q * 1.2, vel=0.32, until=283.3)
    # finale: sunrise, happiness, the moral - warm and full, a button on the last word
    for j in range(10): b.add("glock", I.glock(F([74, 78, 81, 86, 90, 93, 98, 102, 105, 110][j]), 0.32 + 0.03 * j, _r()), T.SUNRISE + 0.18 * j, 0.4 * np.sin(j))
    drone(b, 283.4, T.DUR, vel=0.42); santoor(b, 283.6, T.DUR - 1.0, vel=0.34)
    loop_motif(b, "fife", 286.2, T.LAST - 0.1, vel=0.6)
    loop_motif(b, "vibes", 299.0, T.LAST - 0.1, vel=0.3, transpose=-12, p=-0.2)
    for m in [38, 50, 57, 62, 66, 69]: b.add("stab", I.brass(F(m), 1.0, 0.45, _r(), "soft"), T.LAST)
    b.add("glock", I.glock(F(86), 0.5, _r()), T.LAST); b.add("triangle", I.triangle(0.35, _r(), 1.4), T.LAST)
    b.cues.append((T.SUNRISE, "sunrise: glock shimmer, then the full theme - warm and inspirational to the end"))
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
    return out, levels
