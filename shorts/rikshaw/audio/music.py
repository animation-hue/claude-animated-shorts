# Original score for "Rikshaw Love", composed and synthesized here: ONE love leitmotif (G major pentatonic, 92 bpm,
# flute-like fife over a tanpura-style drone and santoor-like plucks) varied per beat, following the skill's fiction
# toolkit: tender at the meet (one skipped beat on "skipped a beat") | falling fragment on "gone" | comic double-time
# chase, swirling glock at the roundabout | sad minor pizz search with a hopeful ping on every "pink roof!" | warm
# swell + soft heartbeat at 5:20 | silence for the lamp post | lonely pluck in the garage | gold shimmer + full theme
# when the door glows | hushed music box with chime pings on the flickers | full warm theme at sunset, button on "time".
import numpy as np
from dsp import SR, ns, rng, pan, place, dbg, make_ir, convolve_st, integrated, lp, hp
import instruments as I
import timeline as T

N = ns(T.DUR)
Q = 60.0 / 92.0
F = I.m2f
W = T.fr

# the love motif (beat, length in quarters, midi) - 4 bars
MOTIF = [(0, 1, 71), (1, .5, 74), (1.5, .5, 76), (2, 1, 74), (3, 1, 71),
         (4, .5, 69), (4.5, .5, 71), (5, 1, 74), (6, 2, 67),
         (8, 1, 76), (9, .5, 74), (9.5, .5, 71), (10, 1, 69), (11, 1, 67),
         (12, 1.5, 69), (13.5, .5, 71), (14, 2, 67)]
MINOR = {71: 70, 76: 75}  # bend B->Bb, E->Eb for the sad (G minor-ish) colour

SECTIONS = [("meet", 0.0, W(418)), ("lose", W(418), W(487)), ("chase", W(487), W(648)), ("round", W(648), W(838)),
            ("search", W(838), W(1134)), ("hope", W(1134), W(1409)), ("fall", W(1409), W(1468)), ("garage", W(1468), W(1772)),
            ("magic", W(1772), W(2034)), ("flicker", W(2034), W(2209)), ("end", W(2209), T.DUR)]
QUIET = {"fall"}
HARD = [W(T.CRASH_F)]


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


R = rng(2026)
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


def drone(b, t0, t1, root=43, vel=0.35):
    """tanpura-style drone: root + fifth + octave, slow swell"""
    d = t1 - t0
    if d > 0.3:
        b.add("pad", I.pad([F(root), F(root + 7), F(root + 12), F(root + 19)], d, vel, _r(), att=min(1.2, d / 3), rel=1.0, warm=1100), t0)


def santoor(b, t0, t1, chord=(55, 59, 62, 67, 71), q=Q / 2, vel=0.45, p=0.25):
    """santoor-like rippling arpeggio"""
    t, k = t0, 0
    while t < t1:
        b.add("pluck", I.pluck(F(chord[k % len(chord)] + (12 if (k // len(chord)) % 2 else 0)), vel * (0.8 + 0.2 * (k % 2)), _r(), dur=0.7, bright=0.75), t, p * np.sin(k))
        t += q; k += 1


def build():
    b = Band()
    for name, send in [("fife", 0.22), ("glock", 0.24), ("musicbox", 0.28), ("vibes", 0.28), ("pluck", 0.2), ("pad", 0.3),
                       ("tuba", 0.1), ("pah", 0.16), ("snare", 0.13), ("brush", 0.12), ("timpani", 0.18), ("triangle", 0.2), ("stab", 0.16)]:
        b.track(name, send)
    # ---- meet: tender (drone + santoor + musicbox), motif on "fell in love", skipped beat
    drone(b, 0.0, W(418) + 0.4)
    santoor(b, 0.2, W(BEAT := T.BEAT_F) - 0.02, vel=0.38)
    santoor(b, W(T.BEAT_F) + 0.32, W(418), vel=0.4)                     # the skipped beat: a 0.3 s hole
    motif(b, "musicbox", 0.4, vel=0.45, notes=MOTIF[:9], until=W(T.LOVE_F) - 0.1)
    motif(b, "fife", W(T.LOVE_F) - 0.05, vel=0.72, until=W(T.BEAT_F) - 0.02)
    b.add("vibes", I.vibes(F(83), 0.55, _r(), dur=1.6), W(T.WIDE_F) - 0.03, 0.3)                    # shimmer on "wide"
    for j, m in enumerate([79, 83, 86]): b.add("glock", I.glock(F(m), 0.5, _r()), W(T.WIDE_F) + 0.08 * j, 0.2)
    b.cues.append((0.0, "meet: drone + santoor ripples + music-box motif"))
    b.cues.append((W(T.LOVE_F), "'fell in love': the love motif on the fife"))
    b.cues.append((W(T.BEAT_F), "'skipped a beat': the accompaniment drops out for 0.3 s"))
    # ---- lose: falling fragment
    for j, m in enumerate([74, 71, 69, 67, 62]): b.add("fife", I.fife(F(m), 0.3, 0.6, _r()), W(T.GREEN_F) + 0.22 * j)
    b.add("pluck", I.pluck(F(43), 0.6, _r(), dur=1.2), W(T.GONE_F))
    b.cues.append((W(T.GREEN_F), "green light: the motif falls away; low pluck on 'gone'"))
    # ---- chase: comic double time (120 bpm feel), oompah + snare + plucked motif
    q2 = 0.5
    t0 = W(T.GOGGLES_F) - 0.02
    for k in range(int((W(T.EXIT_F) - t0) / (4 * q2)) + 1):
        tb = t0 + k * 4 * q2
        for beat in range(4):
            t = tb + beat * q2
            if t >= W(T.EXIT_F) - 0.05: break
            b.add("tuba", I.brass(F([43, 50][beat % 2]), 0.22, 0.55, _r(), "tuba"), t, -0.1)
            for m in ([62, 67, 71] if (k // 2) % 2 == 0 else [62, 66, 69]): b.add("pah", I.brass(F(m), 0.12, 0.32, _r(), "horn", scoop=-12), t + q2 / 2, 0.25)
            for s in range(4):
                if s in (0, 2) or beat % 2: b.add("snare", I.snare(0.35 + 0.15 * (s == 0), _r(), dur=0.18), t + s * q2 / 4, 0.05)
    motif(b, "pluck", t0, q=q2, vel=0.6, until=W(T.ROUND_F))
    motif(b, "fife", W(T.ROUND_F), q=q2 * 0.75, vel=0.55, until=W(T.EXIT_F))
    k = 0
    t = W(T.ROUND_F)
    while t < W(T.EXIT_F) - 0.1:                                                                     # swirling roundabout glock
        b.add("glock", I.glock(F([79, 83, 86, 91, 86, 83][k % 6]), 0.4, _r()), t, 0.6 * np.sin(k * 0.9)); t += 0.125; k += 1
    b.add("tuba", I.brass(F(31), 1.2, 0.6, _r(), "tuba", fall=-3), W(T.EXIT_F) + 0.1)
    b.cues.append((t0, "chase: double-time oompah + snare, plucked motif; fife motif speeds up at the roundabout"))
    b.cues.append((W(T.ROUND_F), "roundabout: swirling glock circles"))
    b.cues.append((W(T.EXIT_F), "'she wasn't there': stop + low tuba sigh"))
    # ---- search: sad minor pizz, hopeful pings on "pink roof!" that deflate
    drone(b, W(838), W(1134), root=43, vel=0.25)
    motif(b, "pluck", W(845), q=Q * 1.15, vel=0.5, minor=True, until=W(1130))
    for f0 in (T.PINK1_F, T.PINK2_F, T.PINK3_F):
        b.add("glock", I.glock(F(86), 0.6, _r()), W(f0), 0.2)
        for j, m in enumerate([79, 75, 72]): b.add("vibes", I.vibes(F(m), 0.35, _r(), dur=0.9, damp=0.4), W(f0) + 0.55 + 0.16 * j, -0.2)
    b.cues.append((W(838), "search: sad minor motif on plucks over a low drone"))
    b.cues.append((W(T.PINK1_F), "each 'pink roof!': a hopeful glock ping, then a deflating vibes fall"))
    # ---- hope: warm swell + soft heartbeat, motif on "jasmine"
    drone(b, W(1134), W(1409), root=43, vel=0.4)
    santoor(b, W(1140), W(1409), vel=0.33)
    motif(b, "fife", W(T.JASMINE_F) - 0.1, vel=0.62, until=W(1409))
    hb = W(T.THERE_F)
    while hb < W(T.CRASH_F) - 0.2:
        b.add("timpani", I.timpani(F(38), 0.45, _r(), dur=0.5), hb); b.add("timpani", I.timpani(F(38), 0.32, _r(), dur=0.4), hb + 0.22)
        hb += max(0.42, 0.85 - 0.12 * (hb - W(T.THERE_F)))
    b.cues.append((W(1134), "5:20: warm drone + santoor"))
    b.cues.append((W(T.JASMINE_F), "'jasmine': the motif returns on the fife"))
    b.cues.append((W(T.THERE_F), "'there she was': a soft heartbeat that quickens until the lamp post (silence)"))
    # ---- garage: lonely solo pluck, sparse
    motif(b, "pluck", W(T.GARAGE_F) + 0.6, q=Q * 1.3, vel=0.42, minor=True, notes=MOTIF[:9], until=W(T.LAUGH_F))
    for j, m in enumerate([43, 50]): b.add("tuba", I.brass(F(m), 0.18, 0.5, _r(), "tuba"), W(T.LAUGH_F) + 0.3 + 0.35 * j)   # comic bump for Happy Singh
    motif(b, "musicbox", W(T.HELLO_F) - 0.6, q=Q * 1.4, vel=0.35, minor=True, notes=MOTIF[9:], until=W(T.GOLD_F))
    b.cues.append((W(T.GARAGE_F), "garage: lonely minor motif on a single pluck; a tuba bump for Happy Singh's laugh"))
    # ---- magic: gold shimmer, then the full motif
    for j in range(12): b.add("glock", I.glock(F([79, 83, 86, 91][j % 4] + 12 * (j // 8)), 0.35 + 0.03 * j, _r()), W(T.GOLD_F) + 0.12 * j, 0.5 * np.sin(j))
    drone(b, W(T.GOLD_F), W(2034) + 0.5, root=43, vel=0.45)
    b.add("vibes", I.vibes(F(79), 0.5, _r(), dur=3.0), W(T.GOLD_F))
    motif(b, "fife", W(T.HONK_F) + 0.3, vel=0.7, until=W(2034))
    santoor(b, W(T.HONK_F), W(2034), vel=0.4)
    b.add("triangle", I.triangle(0.4, _r(), 1.2), W(T.REVEAL_F))
    b.cues.append((W(T.GOLD_F), "the door glows gold: glock shimmer rising + vibes"))
    b.cues.append((W(T.HONK_F), "after the soft honk: the full motif, fife over santoor + drone"))
    # ---- flicker: hush, music box, chime pings on each flicker
    motif(b, "musicbox", W(2040), q=Q * 1.2, vel=0.32, notes=MOTIF[:5], until=W(T.FLICK1) - 0.05)
    for f0, m in [(T.FLICK1, 86), (T.FLICK2, 88), (T.BACK1, 91), (T.BACK2, 93)]: b.add("glock", I.glock(F(m), 0.55, _r()), W(f0), 0.15)
    drone(b, W(2040), W(2209) + 0.5, root=43, vel=0.22)
    b.cues.append((W(T.FLICK1), "flicker pings: his two, then her two (higher)"))
    # ---- end: full warm theme at sunset, button on "time"
    drone(b, W(T.END_F), T.DUR, root=43, vel=0.45)
    santoor(b, W(T.END_F), T.DUR - 0.6, vel=0.38)
    motif(b, "fife", W(T.END_F) + 0.1, vel=0.75, until=W(T.LAST_F) - 0.1)
    motif(b, "vibes", W(T.END_F) + 0.1, vel=0.35, transpose=-12, until=W(T.LAST_F) - 0.1, p=-0.2)
    for m in [43, 55, 59, 62, 67, 71]: b.add("stab", I.brass(F(m), 0.6, 0.45, _r(), "soft"), W(T.LAST_F))
    b.add("glock", I.glock(F(91), 0.5, _r()), W(T.LAST_F)); b.add("triangle", I.triangle(0.35, _r(), 1.0), W(T.LAST_F))
    b.cues.append((W(T.END_F), "sunset: the full theme (fife + vibes an octave down) over santoor and drone"))
    b.cues.append((W(T.LAST_F), "soft G major button on 'time'"))
    return b


TARGET = {"fife": 0.0, "glock": -6.0, "musicbox": -2.0, "vibes": -4.0, "pluck": -3.0, "pad": -5.0, "tuba": -3.0, "pah": -8.0,
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
    # silence for the lamp post (from the crash until the garage)
    t = np.arange(N) / SR
    a, e = W(T.CRASH_F) - 0.02, W(T.GARAGE_F) + 0.3
    m = (t >= a) & (t < e)
    out[:, m] *= np.exp(-(t[m] - a) / 0.08)[None, :]
    return out, levels
