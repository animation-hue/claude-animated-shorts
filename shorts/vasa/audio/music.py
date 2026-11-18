# Original score for the Vasa short, composed and synthesized here: a stately comic naval march in D major,
# 112 bpm, with a fife tune of our own over oompah brass, snare and timpani. It follows the picture:
# fanfare hook that deflates on "sank" | stately town march (cymbal on "sixty-four", timpani on "two") | nervous pizz
# for the shipbuilder | test vamp with a tuba whoop on every crossing, tighter each time, dead stop on "stopped them" |
# hush under the admiral | bright launch + festive salute (crash on "salute") | cut dead on the gust | silence through
# the sinking and "Luckily" | sad brass on "Unluckily" | music-box lilt with the rowing boat | pizz walk at the inquiry,
# fanfare stab on "the king" | gentle reprise that blooms on "a million people" and buttons on "deck".
import numpy as np
from dsp import SR, ns, rng, pan, place, dbg, make_ir, convolve_st, integrated, lp, hp
import instruments as I
import timeline as T

N = ns(T.DUR)
Q = 60.0 / 112.0           # quarter note (s)
BAR = 4 * Q
F = I.m2f
W = lambda w: T.fr(w)      # frame -> s

# theme (bar, beat, length in quarters, midi): fife register, D major
THEME = [
    (1, 0, 1, 74), (1, 1, .5, 78), (1, 1.5, .5, 81), (1, 2, 1, 86), (1, 3, 1, 81),
    (2, 0, .5, 83), (2, .5, .5, 81), (2, 1, .5, 79), (2, 1.5, .5, 78), (2, 2, 2, 76),
    (3, 0, 1, 76), (3, 1, .5, 79), (3, 1.5, .5, 83), (3, 2, 1, 88), (3, 3, 1, 83),
    (4, 0, .5, 85), (4, .5, .5, 83), (4, 1, .5, 81), (4, 1.5, .5, 79), (4, 2, 2, 78),
    (5, 0, 1, 74), (5, 1, .5, 78), (5, 1.5, .5, 81), (5, 2, 1, 86), (5, 3, 1, 90),
    (6, 0, .5, 88), (6, .5, .5, 86), (6, 1, .5, 85), (6, 1.5, .5, 83), (6, 2, 1, 81), (6, 3, 1, 78),
    (7, 0, .5, 79), (7, .5, .5, 83), (7, 1, .5, 81), (7, 1.5, .5, 79), (7, 2, .5, 78), (7, 2.5, .5, 76), (7, 3, 1, 73),
    (8, 0, 2, 74), (8, 2, 1, 69), (8, 3, 1, 74),
]
CHB = {1: ["D"] * 4, 2: ["G", "G", "A7", "A7"], 3: ["Em"] * 4, 4: ["A7"] * 4, 5: ["D"] * 4, 6: ["G", "G", "D", "D"],
       7: ["Em", "Em", "A7", "A7"], 8: ["D"] * 4}
CH = {
    "D": dict(oom=(38, 45), pah=[57, 62, 66]), "G": dict(oom=(43, 38), pah=[55, 59, 62]), "A7": dict(oom=(45, 40), pah=[55, 61, 64]),
    "Em": dict(oom=(40, 47), pah=[55, 59, 64]), "Bm": dict(oom=(47, 42), pah=[54, 59, 62]), "Dm": dict(oom=(38, 45), pah=[57, 62, 65]),
    "Gm": dict(oom=(43, 38), pah=[55, 58, 62]),
}

# sections (name, start, end) for the level automation; QUIET ones inherit the previous gain; HARD = instant switches
GUST = W(T.GUST_F)
SECTIONS = [
    ("hook", 0.0, W(124)), ("sank", W(124), T.FLASH), ("town", T.FLASH, W(430)), ("nervous", W(430), W(499)),
    ("test", W(499), W(T.STOP_F)), ("stop", W(T.STOP_F), W(905)), ("launch", W(905), W(1012)), ("salute", W(1012), GUST),
    ("dropout", GUST, W(1258)), ("sad", W(1258), W(1395)), ("boat", W(1395), W(1628)), ("court", W(1628), W(1786)),
    ("king", W(1786), W(1809)), ("reprise", W(1809), T.DUR),
]
QUIET = {"dropout", "stop"}
HARD = [T.FLASH, GUST, W(1258)]


def theme(t_bar1, bars=range(1, 9), transpose=0):
    ev = []
    for (b, beat, d, m) in THEME:
        if b in bars:
            ev.append((t_bar1 + (b - min(bars)) * BAR + beat * Q, d * Q, m + transpose))
    return sorted(ev)


class Band:
    def __init__(self):
        self.tr, self.send, self.cues = {}, {}, []

    def track(self, name, send):
        if name not in self.tr:
            self.tr[name] = np.zeros((2, N)); self.send[name] = send
        return self.tr[name]

    def add(self, name, x, t, p=0.0, g=1.0):
        if t >= T.DUR:
            return
        place(self.track(name, 0.15), pan(x, p) if np.ndim(x) == 1 else x, max(0.0, t), g)


R = rng(1628)
_r = lambda: rng(int(R.integers(1 << 30)))


def oompah(b, t_bar, chords, vel=0.6, pah_vel=0.4, until=None):
    for beat in range(4):
        t = t_bar + beat * Q
        if until is not None and t >= until:
            return
        c = CH[chords[beat]]
        b.add("tuba", I.brass(F(c["oom"][beat % 2]), 0.3, vel * (1.0 if beat in (0, 2) else 0.88), _r(), "tuba"), t, -0.1)
        for k, m in enumerate(c["pah"]):
            b.add("pah", I.brass(F(m), 0.15, pah_vel, _r(), "horn", scoop=-12), t + Q / 2 + 0.004 * k, 0.32 - 0.12 * k)


SN = {"light": [1, 0, 0, 0, 2, 0, 0, 0, 1, 0, 0, 0, 2, 0, 1, 1], "march": [3, 0, 1, 1, 2, 0, 1, 0, 3, 0, 1, 1, 2, 0, 1, 0]}


def snare_bar(b, t_bar, pat, vel, until=None):
    for s, v in enumerate(SN[pat]):
        t = t_bar + s * Q / 4
        if not v or (until is not None and t >= until):
            continue
        vv = vel * {1: 0.5, 2: 0.9, 3: 0.95}[v] * R.uniform(0.93, 1.05)
        b.add("snare", I.snare(vv, _r()), t + R.normal(0, 0.002), 0.05)


def melody(b, name, notes, vel, fn="fife", p=0.0, gate=0.9, until=None):
    for (t, d, m) in notes:
        if until is not None and t >= until:
            continue
        if until is not None:
            d = min(d, until - t - 0.02)
        x = {"fife": lambda: I.fife(F(m), d * gate, vel * R.uniform(0.94, 1.04), _r()),
             "glock": lambda: I.glock(F(m), vel * R.uniform(0.92, 1.05), _r()),
             "musicbox": lambda: I.musicbox(F(m), vel * R.uniform(0.92, 1.05), _r()),
             "vibes": lambda: I.vibes(F(m), vel * R.uniform(0.92, 1.05), _r(), dur=max(1.2, d + 0.8), damp=d + 0.35),
             "pluck": lambda: I.pluck(F(m), vel * R.uniform(0.9, 1.05), _r(), dur=0.6)}[fn]()
        b.add(name, x, t, p)


def march(b, t0, bars, vel=0.6, fife=True, glock=False, snare="light", until=None, transpose=0):
    for k, bar in enumerate(bars):
        tb = t0 + k * BAR
        if until is not None and tb >= until:
            break
        oompah(b, tb, CHB[bar], vel, 0.4 * vel / 0.6, until)
        if snare:
            snare_bar(b, tb, snare, 0.5 * vel / 0.6, until)
    notes = theme(t0, bars, transpose)
    if fife:
        melody(b, "fife", notes, 0.75 * vel / 0.6, "fife", until=until)
    if glock:
        melody(b, "glock", notes, 0.55 * vel / 0.6, "glock", 0.2, until=until)


def build():
    b = Band()
    for name, send in [("fife", 0.16), ("glock", 0.22), ("tuba", 0.10), ("pah", 0.18), ("snare", 0.13), ("cymbal", 0.16), ("stab", 0.16),
                       ("timpani", 0.18), ("pad", 0.25), ("vibes", 0.26), ("musicbox", 0.26), ("pluck", 0.18), ("triangle", 0.2)]:
        b.track(name, send); b.send[name] = send

    # ---- hook: fanfare tutti, then the deflating slide on "sank"
    sank = W(124)
    b.add("timpani", I.timpani(F(38), 0.9, _r()), 0.05)
    b.add("cymbal", I.cymbal(0.6, _r(), 2.0), 0.05)
    march(b, 0.05, [1, 2], 0.8, fife=True, glock=True, snare="march", until=sank - 0.05)
    b.add("stab", I.brass(F(45), 1.2, 0.8, _r(), "tuba", scoop=-10, fall=-14), sank)       # wah-woooo down a ninth
    b.add("stab", I.brass(F(57), 1.0, 0.55, _r(), "horn", scoop=-10, fall=-12), sank + 0.02)
    b.cues.append((0.05, "hook: fanfare tutti (timpani + crash), theme bars 1-2 with fife + glock + snare"))
    b.cues.append((sank, "'sank': the band stops; tuba + horn slide down (wah-woooo)"))

    # ---- Stockholm: stately march (bars 1-4), crash on "sixty-four", timpani on "two"
    t0 = T.FLASH + 0.05
    b.add("timpani", I.timpani(F(38), 0.6, _r()), t0)
    march(b, t0, [1, 2, 3, 4], 0.55, fife=True, glock=True, snare="light", until=W(430))
    b.add("cymbal", I.cymbal(0.55, _r(), 2.2), W(310) - 0.02)
    for k, tt_ in enumerate([W(388), W(388) + Q / 2]):
        b.add("timpani", I.timpani(F(45 if k else 38), 0.85, _r()), tt_)
    b.cues.append((t0, "Stockholm: stately march, theme bars 1-4 (fife + glock, oompah, light snare)"))
    b.cues.append((W(310), "crash on 'sixty-four'; timpani 1-5 on 'two (gun decks)'"))
    # ---- shipbuilder: nervous pizz (tiptoe minor seconds)
    tn = W(430)
    for k in range(10):
        m = [62, 61, 62, 61, 64, 63, 64, 61, 62, 57][k]
        b.add("pluck", I.pluck(F(m), 0.6, _r(), dur=0.4), tn + k * Q / 2, -0.2 + 0.04 * k)
    b.cues.append((tn, "shipbuilder: nervous pizz, chromatic tiptoe"))

    # ---- the test: vamp (D / A7) with a tuba whoop on every crossing, getting faster/brighter, dead stop
    tv, stop = W(499), W(T.STOP_F)
    k = 0
    while tv + k * BAR < stop:
        oompah(b, tv + k * BAR, ["D", "D", "A7", "A7"], 0.45 + 0.05 * k, 0.3, until=stop)
        snare_bar(b, tv + k * BAR, "light" if k < 3 else "march", 0.4 + 0.06 * k, until=stop)
        k += 1
    for j, fr_ in enumerate(T.RUNS):
        t = W(fr_)
        b.add("stab", I.brass(F(38 + 2 * j), 0.5, 0.6 + 0.1 * j, _r(), "tuba", scoop=-200), t)              # whoop up
        b.add("glock", I.glock(F(86 + 2 * j), 0.5, _r()), t + W(T.RUN_F) - 0.05, 0.2)
    melody(b, "fife", theme(W(567), [1, 2]), 0.55, "fife", until=stop)
    b.cues.append((tv, "test: D / A7 vamp, snare tightening; tuba whoop on each crossing, glock ping on arrival"))
    b.cues.append((stop, "dead stop on 'stopped them'"))
    # hush under the admiral: soft pad (D minor), one low note on 'home'
    b.add("pad", I.pad([F(50), F(57), F(62), F(65)], 2.4, 0.4, _r(), att=0.5, rel=0.8), W(840))
    b.add("pad", I.pad([F(45), F(57), F(61), F(64)], 0.9, 0.35, _r(), att=0.3, rel=0.6), W(895))
    b.cues.append((W(840), "admiral: soft D minor pad, A7 under 'home'"))

    # ---- launched anyway -> festive salute, cut dead on the gust
    tl = W(910)
    b.add("cymbal", I.cymbal(0.5, _r(), 1.5), tl)
    march(b, tl, [5, 6, 7, 8, 1, 2], 0.7, fife=True, glock=True, snare="march", until=GUST - 0.04)
    b.add("cymbal", I.cymbal(0.85, _r(), 2.4, 1.2), W(1019))
    b.add("timpani", I.timpani(F(38), 1.0, _r()), W(1019))
    b.cues.append((tl, "'launched it anyway': bright march, theme bars 5-8 + 1-2, full band"))
    b.cues.append((W(1019), "crash + timpani on 'salute'; the band cuts dead on the gust"))

    # ---- Unluckily: sad brass, then a sparse pizz
    tu = W(1258)
    for j, (m, d) in enumerate([(57, 0.42), (56, 0.42), (55, 0.42), (54, 1.5)]):
        b.add("stab", I.brass(F(m), d, 0.62, _r(), "horn", scoop=-20, fall=-1.0 if j == 3 else 0.0), tu + j * 0.5, 0.1)
        b.add("tuba", I.brass(F(m - 24), d, 0.55, _r(), "tuba", scoop=-20), tu + j * 0.5, -0.1)
    for j in range(6):
        b.add("pluck", I.pluck(F([50, 57, 50, 57, 53, 57][j]), 0.45, _r(), dur=0.5), W(1340) + j * Q, 0.1)
    b.cues.append((tu, "'Unluckily': sad brass wah-wah-wah-waaah (horn + tuba), then sparse pizz"))

    # ---- the rowing boat: music-box lilt in 3/4 that rocks; a wobble on 'tip', resolves on 'back'
    tb = W(1395)
    lilt = [74, 78, 81, 79, 78, 76, 74, 78, 81, 83, 81, 78, 76, 79, 83, 81, 79, 76, 74]
    for j, m in enumerate(lilt):
        t = tb + j * Q
        if W(1468) < t < W(1520):
            continue
        b.add("musicbox", I.musicbox(F(m), 0.55, _r()), t, 0.15 * np.sin(j * 1.3))
        if j % 3 == 0:
            b.add("pluck", I.pluck(F(50 if (j // 3) % 2 == 0 else 45), 0.45, _r(), dur=0.7), t, -0.2)
    for j, m in enumerate([81, 80, 79, 78]):
        b.add("vibes", I.vibes(F(m), 0.5, _r(), dur=0.8, damp=0.35), W(1476) + j * 0.11, 0.3)                    # wobble on 'tip'
    for j, m in enumerate([74, 78, 81, 86]):
        b.add("musicbox", I.musicbox(F(m), 0.6, _r()), W(1524) + j * 0.12, 0.0)                                   # resolve on 'back'
    for j in range(5):
        b.add("tuba", I.brass(F([38, 33, 38, 33, 26][j]), 0.25, 0.5, _r(), "tuba"), W(1553) + j * Q * 1.5, -0.1)  # 'all cannon on top'
    b.cues.append((tb, "rowing boat: music-box lilt (3/4) with pizz bass; vibes wobble on 'tip', resolve on 'back'"))

    # ---- inquiry: pizz walk in D minor, then the king's fanfare stab
    tc = W(1628)
    walk = [50, 53, 57, 55, 53, 52, 50, 49, 50, 53, 57, 58, 57, 55, 53, 52, 50, 45]
    for j, m in enumerate(walk):
        t = tc + j * Q / 1.0
        if t >= W(1783):
            break
        b.add("pluck", I.pluck(F(m), 0.55, _r(), dur=0.55), t, -0.15)
        if j % 2 == 0:
            b.add("snare", I.brush(0.4, _r()), t + Q / 2, 0.1) if hasattr(I, "brush") else None
    tk = W(1790) - 0.03
    for m in [62, 66, 69, 74]:
        b.add("stab", I.brass(F(m), 0.5, 0.8, _r(), "stab", scoop=-8), tk, 0.0)
    b.add("cymbal", I.cymbal(0.5, _r(), 1.6), tk)
    b.add("timpani", I.timpani(F(38), 0.8, _r()), tk)
    b.cues.append((tc, "inquiry: pizz walking bass (D minor) + brush"))
    b.cues.append((tk, "'was the king': D major fanfare stab + crash + timpani"))

    # ---- reprise: gentle glock theme, blooms on 'a million people', button on 'deck'
    tr = W(1812)
    melody(b, "glock", theme(tr, [1, 2]), 0.45, "glock", 0.1)
    for k in range(2):
        oompah(b, tr + k * BAR, CHB[1 + k], 0.35, 0.22)
    tm_ = W(1922) - 2 * Q
    march(b, tm_, [5, 6, 7], 0.6, fife=True, glock=True, snare="light", until=W(2028))
    ted = W(2030)
    for m in [50, 57, 62, 66, 74]:
        b.add("stab", I.brass(F(m), 0.28, 0.75, _r(), "stab" if m > 60 else "tuba", scoop=-8), ted)
    b.add("timpani", I.timpani(F(38), 0.9, _r(), dur=1.0), ted)
    b.add("triangle", I.triangle(0.5, _r(), 0.8), ted)
    b.cues.append((tr, "reprise: glock theme over soft oompah"))
    b.cues.append((tm_, "full band blooms under 'a million people'"))
    b.cues.append((ted, "D major button on 'deck'"))
    return b


TARGET = {  # relative balance inside the band (LU, measured on each track's own active span)
    "fife": 0.0, "glock": -6.0, "tuba": -2.5, "pah": -7.5, "snare": -6.0, "cymbal": -11.0, "stab": -2.0, "timpani": -5.0,
    "pad": -4.0, "vibes": -3.0, "musicbox": -2.0, "pluck": -3.0, "triangle": -15.0,
}


def render(b, ref=-20.0):
    hall = make_ir(1.5, 7, pre=0.018, hf=1.4)
    dry = np.zeros((2, N)); wet = np.zeros((2, N)); levels = {}
    for k, x in b.tr.items():
        if not np.any(x):
            continue
        L = integrated(x)
        g = dbg(ref + TARGET.get(k, -6) - L)
        levels[k] = (round(L, 1), round(ref + TARGET.get(k, -6), 1))
        x = x * g
        b.tr[k] = x
        dry += x
        wet += b.send[k] * x
    out = dry + 0.7 * convolve_st(wet.mean(0), hall)
    out = hp(out, 30, 2)
    # hard silences: the band is gone after the hook slide (until the flash), on the gust, and in the test's dead stop
    t = np.arange(N) / SR
    for a, bnd in [(T.FLASH - 0.02, T.FLASH + 0.04), (GUST, W(1256)), (W(T.STOP_F) + 0.25, W(838))]:
        m = (t >= a) & (t < bnd)
        out[:, m] *= np.clip((t[m] - a) / 0.25, 0, 1)[None, :] * 0 + np.exp(-(t[m] - a) / 0.12)[None, :]
    return out, levels
