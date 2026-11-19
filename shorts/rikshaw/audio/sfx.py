# Every sound effect + ambience bed of "Rikshaw Love" as a cue list timed to the picture (timeline.py), rendered into
# one stereo SFX stem. Standard mix: EVENTS placed SFX_DB = -6 dB under their naive level (LU vs the voice stem, max
# momentary); BEDS (integrated) are not reduced. The autos "speak" only in engines, horns and headlight clicks.
import numpy as np
from dsp import (SR, ns, tt, rng, dbg, lp, hp, bp, pan, st, place, fades, make_ir, convolve_st, momentary_max, integrated,
                 colored, smooth_noise, modal)
import sfx_gen as G
import instruments as I
import timeline as T

N = ns(T.DUR)
SFX_DB = -6.0
W = T.fr


class Cue:
    def __init__(self, t, name, desc, gen, naive, kind="event", p=0.0, extra=0.0, lpf=None, send=0.12, group=None, cut=None):
        self.t, self.name, self.desc, self.gen, self.naive = t, name, desc, gen, naive
        self.kind, self.p, self.extra, self.lpf, self.send, self.cut = kind, p, extra, lpf, send, cut
        self.group = group or name
        self.applied = naive + (SFX_DB if kind == "event" else 0.0) + extra
        self.measured = None


def S(x):
    x = np.asarray(x, float)
    return st(x) if x.ndim == 1 else x


def mixl(xs, offs=None):
    xs = [S(x) for x in xs]
    offs = offs or [0.0] * len(xs)
    n = max(ns(o) + x.shape[1] for x, o in zip(xs, offs))
    out = np.zeros((2, n))
    for x, o in zip(xs, offs):
        out[:, ns(o): ns(o) + x.shape[1]] += x
    return out


# ---------------- our own auto sounds ----------------
def engine(dur, r, rate=24.0, rate1=None, rough=0.25, bright=900.0):
    """2-stroke auto putt-putt: an impulse train (firing rate Hz, optionally gliding) through a low resonant body"""
    n, t = ns(dur), tt(dur)
    rr = rate if rate1 is None else rate + (rate1 - rate) * np.clip(t / dur, 0, 1)
    ph = np.cumsum(rr / SR)
    fire = (np.diff(np.floor(ph), prepend=0) > 0).astype(float) * (1 + rough * r.standard_normal(n))
    body = lp(fire, bright, 2) * 6 + 0.25 * lp(colored(n, r, 1.0), 600, 1) * (0.6 + 0.4 * smooth_noise(n, r, 4))
    body = body + 0.5 * np.sin(2 * np.pi * np.cumsum(rr * 2 / SR)) * 0.15
    return fades(hp(body, 40, 2), 0.05, 0.1)


def horn_squeak(r, pitch=520.0, dur=0.22, n=1):
    """Badshah's squeaky rubber-bulb horn: a nasal two-tone toot"""
    out = []
    for k in range(n):
        t = tt(dur); f = pitch * (1 + 0.08 * np.exp(-t / 0.04))
        ph = 2 * np.pi * np.cumsum(f / SR)
        y = (np.sign(np.sin(ph)) * 0.6 + np.sin(2 * ph) * 0.3) * np.clip(t / 0.01, 0, 1) * np.clip((dur - t) / 0.03, 0, 1)
        out.append(bp(y, 400, 3000, 1)); out.append(np.zeros(ns(0.06)))
    return np.concatenate(out)


def horn_chime(r, notes=(659.3, 784.0), dur=0.32):
    """Bijli's soft two-note horn chime"""
    out = []
    for f in notes:
        t = tt(dur)
        y = (np.sin(2 * np.pi * f * t) + 0.3 * np.sin(4 * np.pi * f * t)) * np.exp(-t / 0.18) * np.clip(t / 0.008, 0, 1)
        out.append(y)
    return np.concatenate(out) * 0.8


def boing(r):
    """metal lamp post struck: bright clang + long wobbling 'boing' resonance"""
    dur = 1.6; t = tt(dur)
    clang = modal(dur, [(420, 1.0, 0.6), (1130, 0.6, 0.35), (2210, 0.4, 0.2), (3480, 0.25, 0.12)], r)
    f = 160 * (1 + 0.25 * np.exp(-t / 0.3) * np.sin(2 * np.pi * 7 * t))
    wob = np.sin(2 * np.pi * np.cumsum(f / SR)) * np.exp(-t / 0.55) * 0.9
    thud = lp(r.standard_normal(len(t)), 300, 2) * np.exp(-t / 0.05) * 1.5
    return clang * 0.6 + wob + thud


def click(r, f=2600.0):
    """headlight switch: relay click + a short warm hum"""
    t = tt(0.25)
    c = hp(r.standard_normal(len(t)), 1500, 2) * np.exp(-t / 0.004)
    hum = np.sin(2 * np.pi * 110 * t) * np.exp(-t / 0.12) * 0.15 * np.clip(t / 0.01, 0, 1)
    tick = np.sin(2 * np.pi * f * t) * np.exp(-t / 0.01) * 0.3
    return c * 0.8 + hum + tick


def laugh(r, base=150.0, n=6):
    """Happy Singh's big belly laugh: 'ha' bursts falling in pitch"""
    xs, offs = [], []
    for k in range(n):
        xs.append(G.whoa(r, base * (1.15 - 0.05 * k), 0.16)); offs.append(0.19 * k)
    return mixl(xs, offs)


def sea_bed(dur, r, wash=1.0, gulls=0.5, traffic=0.4, town=0.0):
    n = ns(dur)
    sw = bp(colored(n, r, 0.9), 150, 2400, 1) * (0.45 + 0.55 * (0.5 + 0.5 * np.sin(2 * np.pi * tt(dur) / 7.0)) ** 2) * wash
    x = st(sw) + G.breeze(dur, r, 0.6, 0.1, 900)
    x = x + pan(G.bird_chirps(dur, r, 0.25 * gulls, "sparrow") * 0.07, 0.5)
    if traffic:
        hum = lp(colored(n, r, 1.3), 250, 2) * traffic * 0.5
        x = x + st(hum)
    if town:
        x = x + st(lp(G.babble(dur, r, 160, 1.0, 3.6, 0.5), 2400, 1) * 0.15 * town)
    return fades(x, 0.3, 0.4)


def cues():
    C = []
    R = rng(2026)
    rr = lambda: rng(int(R.integers(1 << 30)))
    add = C.append

    # ------------------------------------------------ beds
    for (a, b, seed, kw, lvl, desc) in [
        (0.0, W(838), 1, dict(wash=1.0, gulls=0.6, traffic=0.5, town=0.4), -28, "morning Marine Drive: sea wash against the wall, gulls, traffic hum"),
        (W(838), W(977), 2, dict(wash=0.7, gulls=0.3, traffic=0.8, town=0.6), -28, "noon: busier traffic, distant town"),
        (W(977), W(1134), 3, dict(wash=0.5, gulls=0.1, traffic=0.4, town=0.2), -31, "haze: muffled, flat"),
        (W(1134), W(1468), 4, dict(wash=1.0, gulls=0.5, traffic=0.5, town=0.3), -28, "5:20: sea wash, evening birds"),
        (W(2209), T.DUR, 6, dict(wash=1.1, gulls=0.6, traffic=0.2, town=0.1), -27, "6 pm: waves, breeze, a few gulls"),
    ]:
        add(Cue(a, "amb", desc, (lambda d=b - a + 0.3, s=seed, kw=kw: (sea_bed(d, rng(s), **kw), 0.0)), lvl, "bed", send=0.0))
    add(Cue(W(T.GARAGE_F), "garage_room", "garage room tone: a buzzing bulb, a slow drip, the street outside",
            lambda: (mixl([lp(colored(ns(W(2209) - W(T.GARAGE_F)), rng(5), 1.4), 400, 1) * 0.3,
                           np.sin(2 * np.pi * 100 * tt(W(2209) - W(T.GARAGE_F))) * 0.02]), 0.0), -33, "bed", send=0.0))

    # ------------------------------------------------ the signal (shots 1-6)
    add(Cue(0.0, "idle_all", "a queue of autos idling at the red light", lambda: (mixl([engine(W(470), rng(10 + k), 20 + 3 * k, rough=0.3) for k in range(4)]), 0.0),
            -16, send=0.15, cut=W(470) + 0.3))
    add(Cue(0.0, "idle_badshah", "Badshah's own idle putt-putt", lambda: (engine(W(470), rng(20), 23), 0.0), -14, p=-0.1, send=0.1))
    add(Cue(W(175), "bijli_arrive", "Bijli rolls up: a softer, smoother engine", lambda: (engine(W(470) - W(175), rng(21), 30, 26, rough=0.12, bright=1300), 0.0), -15, p=0.2, send=0.1))
    add(Cue(W(T.LOVE_F) + 0.2, "squeak", "Badshah's horn squeaks by itself (he's in love)", lambda: (horn_squeak(rng(22), 560, 0.14, 2), 0.0), -12, p=-0.1, send=0.15))
    add(Cue(W(T.BEAT_F), "hiccup", "his engine skips a beat: a stutter, a little backfire pop, a cough", lambda: (mixl([engine(0.5, rng(23), 9, 4), lp(rng(24).standard_normal(ns(0.15)), 900, 2) * np.exp(-tt(0.15) / 0.03) * 3], [0, 0.18]), 0.0),
            -8, p=-0.1, send=0.15))
    add(Cue(W(T.GREEN_F) - 0.25, "sig_beep", "signal changes (soft click)", lambda: (click(rng(25), 1800), 0.0), -20, send=0.1))
    add(Cue(W(440), "bijli_go", "Bijli glides away: engine rises and fades, a soft chime", lambda: (mixl([engine(1.6, rng(26), 30, 48, rough=0.12, bright=1400), horn_chime(rng(27)) * 0.5], [0, 0.2]), 0.0),
            -10, p=0.4, send=0.15))
    add(Cue(W(T.GOGGLES_F), "goggles", "Natraj snaps his goggles down: elastic snap", lambda: (mixl([G.clink(rng(28), 900, 0.08, 0.8), hp(rng(29).standard_normal(ns(0.05)), 2000, 2) * np.exp(-tt(0.05) / 0.01)]), 0.0),
            -11, send=0.1))
    add(Cue(W(T.GOGGLES_F) + 0.25, "rev", "Badshah revs up", lambda: (engine(0.9, rng(30), 22, 55), 0.0), -9, send=0.12))

    # ------------------------------------------------ chase + roundabout (shots 7-9)
    add(Cue(W(T.CHASE_F), "chase_engine", "Badshah at full speed along the sea wall", lambda: (engine(W(T.ROUND_F) - W(T.CHASE_F), rng(31), 58, 64, rough=0.35, bright=1500), 0.0),
            -9, send=0.12))
    for k, f0 in enumerate([584, 604, 620]):
        add(Cue(W(f0), "pass", "whoosh past another auto + its horn", (lambda r=rr(), k=k: (mixl([G.whoosh(0.5, r, 0.2, 300, 2200, 0.8, 0.15, 0.2), horn_squeak(r, 470 + 40 * k, 0.12)], [0, 0.1]), 0.2)),
                -12, p=0.5 - 0.4 * k, send=0.15, group="pass"))
    add(Cue(W(T.CORNER_F), "whip", "whip round the corner: tyre squeal", lambda: (bp(rng(32).standard_normal(ns(0.5)), 1800, 4200, 2) * np.exp(-tt(0.5) / 0.2) * 0.5, 0.0), -12, send=0.15))
    add(Cue(W(T.ROUND_F), "round_horns", "the roundabout: forty engines and a chorus of horns",
            lambda: (mixl([engine(W(T.EXIT_F) - W(T.ROUND_F), rng(40 + k), 30 + 4 * k, rough=0.3) for k in range(5)] +
                          [horn_squeak(rng(50 + k), 420 + 30 * k, 0.13, 1 + k % 2) for k in range(9)], [0] * 5 + [0.3 + 0.45 * k for k in range(9)]), 0.0), -8, send=0.2))
    add(Cue(W(T.EXIT_F), "dizzy", "out of the roundabout: engine winds down, a dizzy wobble", lambda: (mixl([engine(1.4, rng(55), 30, 8), np.sin(2 * np.pi * np.cumsum((600 + 200 * np.sin(2 * np.pi * 3 * tt(1.0))) / SR)) * np.exp(-tt(1.0) / 0.5) * 0.15], [0, 0.2]), 0.0),
            -14, send=0.15))

    # ------------------------------------------------ search (shots 10-11)
    for f0 in (T.PINK1_F, T.PINK2_F, T.PINK3_F):
        add(Cue(W(f0), "toot", "hopeful toot on 'pink roof!'", (lambda r=rr(): (horn_squeak(r, 600, 0.12, 2), 0.0)), -12, send=0.15, group="toot"))
    add(Cue(W(T.WINK_F), "grandma", "the grandma auto winks: a creaky old double honk", lambda: (lp(horn_squeak(rng(60), 330, 0.2, 2), 1600, 2), 0.0), -12, p=0.3, send=0.15))
    add(Cue(W(T.UMB_F) - 0.6, "umbrella", "a pink umbrella pops open", lambda: (mixl([G.whoosh(0.35, rng(61), 0.1, 600, 3000, 0.7, 0.1, 0.3), G.clink(rng(62), 1200, 0.06, 0.6)], [0, 0.25]), 0.0), -14, p=0.3, send=0.15))
    add(Cue(W(T.AWAY_F), "away", "a far pink auto drives away", lambda: (lp(engine(2.0, rng(63), 34, 50, rough=0.15), 900, 2), 0.0), -18, p=0.4, send=0.25))
    add(Cue(W(T.DROOP_F) + 0.4, "sigh_horn", "a sad, sagging horn sigh", lambda: (np.sin(2 * np.pi * np.cumsum(np.linspace(420, 260, ns(0.9)) / SR)) * np.exp(-tt(0.9) / 0.5) * 0.4, 0.0), -15, send=0.15))

    # ------------------------------------------------ hope + fall (shots 12-13)
    add(Cue(W(T.CHASE_F) * 0 + W(1134), "slow_engine", "Badshah putters slowly home", lambda: (engine(W(T.ACROSS_F) - W(1134), rng(70), 18, rough=0.2), 0.0), -16, send=0.1))
    add(Cue(W(T.JASMINE_F), "jasmine", "jasmine on the air: a soft airy shimmer", lambda: (G.breeze(1.6, rng(71), 0.5, 0.2, 2400) * 0.6, 0.0), -16, send=0.2))
    add(Cue(W(T.ACROSS_F), "across", "he goes for it: engine rises", lambda: (engine(W(T.CRASH_F) - W(T.ACROSS_F) + 0.05, rng(72), 25, 58), 0.0), -9, send=0.1, cut=W(T.CRASH_F)))
    add(Cue(W(T.CRASH_F), "boing", "BOING: Badshah meets the lamp post", lambda: (st(boing(rng(73))), 0.0), 0, send=0.2))
    add(Cue(W(T.CRASH_F) + 0.12, "crack", "a headlight cracks (glass tinkle)", lambda: (mixl([G.clink(rng(74 + k), 3000 + 600 * k, 0.12, 1.2) for k in range(4)], [0.05 * k for k in range(4)]), 0.0), -12, send=0.15))
    add(Cue(W(T.CRASH_F) + 0.5, "stars", "cartoon stars twinkling round his roof", lambda: (mixl([I.glock(I.m2f(91 + 2 * (k % 3)), 0.3, rng(80 + k)) for k in range(5)], [0.25 * k for k in range(5)]), 0.0), -18, send=0.25))

    # ------------------------------------------------ garage (shot 14)
    for k, tm in enumerate([W(1500), W(1560), W(1600)]):
        add(Cue(tm, "wrench", "Happy Singh's spanner on metal", (lambda r=rr(): (G.clink(r, r.uniform(700, 1100), 0.15, 0.9), 0.0)), -16, p=0.3, send=0.2, group="wrench"))
    add(Cue(W(T.LAUGH_F), "laugh", "Happy Singh laughs and jokes, like always", lambda: (laugh(rng(90)), 0.0), -8, p=0.3, send=0.2))
    add(Cue(W(1535), "tape", "a strip of tape torn off the roll", lambda: (bp(rng(91).standard_normal(ns(0.35)), 2500, 7000, 2) * np.clip(tt(0.35) / 0.02, 0, 1) * np.exp(-tt(0.35) / 0.25) * 0.4, 0.0), -16, send=0.1))

    # ------------------------------------------------ magic + flower + flicker (shots 15-17)
    add(Cue(W(T.GOLD_F), "gold", "the doorway fills with golden light: a warm airy swell", lambda: (G.breeze(2.2, rng(100), 0.7, 0.05, 2000) * np.clip(tt(2.2) / 1.2, 0, 1)[None, :] if False else G.breeze(2.2, rng(100), 0.7, 0.05, 2000), 0.0),
            -18, send=0.25))
    add(Cue(W(T.HONK_F), "chime", "someone honks, very softly (Bijli's chime)", lambda: (horn_chime(rng(101)) * 0.7, 0.0), -10, p=0.2, send=0.25))
    add(Cue(W(T.BIJLI_IN), "bijli_in", "Bijli rolls into the doorway, engine purring low", lambda: (engine(1.6, rng(102), 26, 14, rough=0.1, bright=1200), 0.0), -16, p=0.2, send=0.2))
    add(Cue(W(T.FLOWER_F), "flower", "a jasmine flower on his mirror: a tiny tinkle", lambda: (I.glock(I.m2f(96), 0.3, rng(103)), 0.0), -18, send=0.25))
    for f0, kk in [(T.FLICK1, 0), (T.FLICK2, 1), (T.BACK1, 2), (T.BACK2, 3)]:
        add(Cue(W(f0), "click", "headlight flicker click" + (" (Bijli)" if kk > 1 else ""), (lambda r=rr(), kk=kk: (click(r, 2600 + 300 * kk), 0.0)), -14 + (2 if kk > 1 else 0), p=-0.1 if kk < 2 else 0.2, send=0.15, group="click"))

    # ------------------------------------------------ together (shot 18)
    add(Cue(W(T.END_F), "two_engines", "two autos side by side, both purring slowly", lambda: (mixl([engine(W(T.TOTAL) - W(T.END_F), rng(110), 20, rough=0.18), engine(W(T.TOTAL) - W(T.END_F), rng(111), 26, rough=0.1, bright=1300)]), 0.0),
            -15, send=0.1))
    for f0 in [1830, 2040]:
        add(Cue(W(f0), "whoosh", "camera move", (lambda r=rr(): (st(G.whoosh(0.6, r, 0.09, 330, 2000, 0.8, 0.18, 0.15)), 0.09)), -15, send=0.12, group="whoosh"))
    return C


def render(v_ref, on_event=None):
    C = cues()
    out = np.zeros((2, N))
    send = np.zeros(N)
    for c in C:
        x, anchor = c.gen()
        x = S(x)
        if c.cut is not None:
            k = ns(c.cut - (c.t - anchor))
            if 0 < k < x.shape[1]:
                x = fades(x[:, :k], 0.0, 0.05)
        if c.p:
            x = pan(x.mean(0), c.p)
        tgt = v_ref + c.applied
        cur = momentary_max(x) if c.kind == "event" else integrated(x)
        if np.isfinite(cur):
            x = x * dbg(tgt - cur)
        if c.lpf:
            x = lp(x, c.lpf, 1)
        c.measured = momentary_max(x) - v_ref if c.kind == "event" else integrated(x) - v_ref
        t0 = c.t - anchor
        place(out, x, t0)
        if on_event:
            on_event(c, x, t0)
        if c.send > 0:
            G._place_mono(send, c.send * x.mean(0), t0)
    street = make_ir(1.0, 77, pre=0.01, hf=1.6, early=[(0.08, 0.4, -0.5), (0.15, 0.3, 0.6)])
    out += 0.45 * convolve_st(send, street)
    out = hp(out, 25, 2)
    end = ns(T.DUR - 0.12)
    out[:, end:] *= np.linspace(1, 0, N - end)[None, :] ** 2
    return out, C
