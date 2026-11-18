# Every sound effect + ambience bed of the Vasa short as a cue list timed to the picture (timeline.py), rendered into
# one stereo SFX stem. Standard mix: each EVENT has a "naive" level (LU relative to the voice stem, measured as the
# event's max momentary loudness) and is placed SFX_DB = -6 dB under it; ambience BEDS (integrated) are not reduced.
import numpy as np
from dsp import (SR, ns, tt, rng, dbg, lp, hp, bp, peq, pan, st, place, fades, make_ir, convolve_st, momentary_max, integrated,
                 colored, smooth_noise)
import sfx_gen as G
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


# ---------------- our own composite sounds ----------------
def S(x):
    """to stereo (generators return mono or stereo)"""
    x = np.asarray(x, float)
    return st(x) if x.ndim == 1 else x


def mixl(xs, offs=None):
    """sum sounds of different lengths (optional start offsets in s), stereo"""
    xs = [S(x) for x in xs]
    offs = offs or [0.0] * len(xs)
    n = max(ns(o) + x.shape[1] for x, o in zip(xs, offs))
    out = np.zeros((2, n))
    for x, o in zip(xs, offs):
        out[:, ns(o): ns(o) + x.shape[1]] += x
    return out
def cannon(r, size=1.0):
    """black-powder gun: crack + low boom + rolling harbour echo"""
    dur = 2.2
    n, t = ns(dur), tt(dur)
    crack = hp(r.standard_normal(n), 900, 2) * np.exp(-t / 0.012) * 0.9
    body = lp(colored(n, r, 1.2), 260, 2) * np.exp(-t / 0.18) * 2.4 * size
    thump = np.sin(2 * np.pi * (48 + 30 * np.exp(-t / 0.05)) * t) * np.exp(-t / 0.22) * 1.6 * size
    roll = lp(colored(n, r, 1.0), 500, 1) * np.exp(-np.maximum(0, t - 0.25) / 0.6) * (t > 0.2) * 0.5 * smooth_noise(n, r, 6)
    return fades(crack + body + thump + roll, 0.0, 0.2)


def water_rush(dur, r, a=1.0):
    """sea pouring in through an opening: broadband roar with gurgle"""
    n, t = ns(dur), tt(dur)
    x = bp(colored(n, r, 0.6), 160, 2600, 1) * (0.7 + 0.3 * smooth_noise(n, r, 8.0))
    x += 0.4 * G.bubbles(dur, r, 60.0, 250, 1600)
    env = np.clip(t / 0.25, 0, 1) * np.clip((dur - t) / 0.6, 0, 1)
    return x * env * a


def lid_creak(r):
    """gun-port lid swinging open on a wooden hinge + a soft knock at the stop"""
    x = G.creak(0.32, r, 220, 380, rough=0.15) * 0.8
    knock = np.zeros(ns(0.45)); knock[: len(x)] += x
    k = G.clink(r, r.uniform(240, 330), 0.1, 0.4)
    knock[ns(0.3): ns(0.3) + len(k)] += 0.7 * k
    return knock


def gun_run(r):
    """carriage trucks rumbling as the barrel is run out"""
    n, t = ns(0.55), tt(0.55)
    x = lp(colored(n, r, 1.1), 420, 2) * (0.6 + 0.4 * np.abs(np.sin(2 * np.pi * 9 * t))) * np.clip((0.55 - t) / 0.15, 0, 1) * np.clip(t / 0.05, 0, 1)
    return x


def feet_run(dur, r, people=30):
    """thirty pairs of bare feet + shoes thumping across the deck"""
    out = np.zeros(ns(dur + 0.3))
    for k in range(int(people * dur * 3.2)):
        t0 = r.uniform(0, dur)
        s = G.stroll_step(r, 0.25) * r.uniform(0.4, 1.0)
        a = ns(t0); out[a: a + len(s)] += s[: len(out) - a]
    env = np.clip(np.arange(len(out)) / SR / 0.15, 0, 1) * np.clip((dur + 0.3 - np.arange(len(out)) / SR) / 0.3, 0, 1)
    return lp(out * env, 5200, 1)


def hull_groan(dur, r, a=1.0):
    return G.creak(dur, r, 55, 120, G.TIMBER, rough=0.22) * a


def _amb(dur, seed, water=0.6, gulls=0.5, breeze=1.0, town=0.0):
    def g():
        r = rng(seed)
        n = ns(dur)
        x = G.breeze(dur, r, breeze, 0.15, 850)
        lap = bp(colored(n, r, 0.8), 220, 1600, 1) * water * (0.6 + 0.4 * smooth_noise(n, r, 0.7))
        x = S(x) + st(lap)
        x += pan(G.bird_chirps(dur, r, 0.35 * gulls, "sparrow") * 0.07, 0.5)
        if town:
            x += st(lp(G.babble(dur, r, 150, 1.0, 3.6, 0.6), 2600, 1) * 0.18 * town)
        return fades(x, 0.3, 0.4), 0.0
    return g


def cues():
    C = []
    R = rng(1628)
    rr = lambda: rng(int(R.integers(1 << 30)))
    add = C.append

    # ------------------------------------------------ beds
    for (a, b, seed, kw, lvl, desc) in [
        (0.0, T.FLASH, 1, dict(water=0.8, gulls=0.6), -30, "hook: open harbour, water along the hull, breeze, gulls"),
        (T.FLASH, W(945), 2, dict(water=0.5, gulls=0.5, town=0.6), -29, "Stockholm quay: water lapping, breeze, birds, distant town murmur (shots 3-10)"),
        (W(945), W(1397), 3, dict(water=0.7, gulls=0.3, breeze=0.8), -30, "golden harbour: lapping, soft breeze (shots 11-13)"),
        (W(1397), W(1628), 4, dict(water=1.0, gulls=0.4), -27, "the rowing boat: close water lapping against the hull (shots 14-15)"),
        (W(1628), W(1809), 5, dict(water=0.25, gulls=0.6, town=0.5), -30, "the inquiry on the quay: breeze, birds, distant town"),
        (W(1809), T.DUR, 6, dict(water=0.6, gulls=0.6, town=0.3), -30, "today: harbour air, gulls (shots 18-19)"),
    ]:
        add(Cue(a, "amb", desc, _amb(b - a + 0.3, seed, **kw), lvl, "bed", send=0.0))
    add(Cue(W(1896), "visitors", "a million a year: visitors chatting, kids, a few laughs", lambda: (st(lp(G.babble(4.9, rng(1896), 170, 1.1, 4.6, 0.8), 3800, 1)), 0.0),
            -16, "bed", send=0.25))

    # ------------------------------------------------ hook (shots 1-2)
    add(Cue(0.0, "sails_hook", "sails and flags cracking in the wind, rigging creak", lambda: (mixl([G.flag_flutter(4.1, rng(11)) * 0.8, G.creak(1.2, rng(12), 90, 160) * 0.3]), 0.0),
            -14, p=0.2, cut=W(124)))
    add(Cue(W(124), "sink_hook", "flash-forward sinking: timber groan + water rush + bubbles", lambda: (mixl([hull_groan(1.6, rng(13)), water_rush(1.7, rng(14))]), 0.0), -6, send=0.2,
            cut=T.FLASH))
    add(Cue(T.FLASH, "flash", "whoosh into the white flash", lambda: (st(G.whoosh(0.7, rng(15), 0.3, 300, 2400, 0.9, 0.2, 0.15)), 0.3), -8, send=0.15))

    # ------------------------------------------------ crowd + people
    add(Cue(W(176), "quay_murmur", "dock workers and townsfolk on the quay", lambda: (st(lp(G.babble(2.0, rng(21), 140, 1.0, 4.0, 0.7), 3000, 1)), 0.0), -14, send=0.3))
    for f0, gun in [(T.PORTS_LOW, 0), (T.PORTS_UP, 1)]:
        for i in range(12):
            t = W(f0 + i * 2.2)
            add(Cue(t, "lid", f"gun-port lid {i + 1} creaks open ({'lower' if gun == 0 else 'upper'} deck)", (lambda r=rr(): (lid_creak(r), 0.0)), -15 + (0 if i % 3 else 2),
                    p=-0.6 + 0.1 * i, send=0.15, group="lids"))
            add(Cue(t + 0.12, "gun_run", "barrel run out on its carriage", (lambda r=rr(): (gun_run(r), 0.0)), -17, p=-0.6 + 0.1 * i, send=0.12, group="lids"))
    add(Cue(W(442), "scratch", "shipbuilder scratching his head (hmm)", lambda: (S(G.whoa(rng(31), 105, 0.3)) * 0.6, 0.0), -18, send=0.1))

    # ------------------------------------------------ the stability test (shot 8)
    for k, fr_ in enumerate(T.RUNS):
        t = W(fr_)
        dur = W(T.RUN_F if k < 3 else (T.STOP_F - fr_))
        add(Cue(t, "feet", f"thirty sailors run across the deck (crossing {k + 1})", (lambda r=rr(), d=dur: (st(feet_run(d, r)), 0.0)), -9 + k, p=(0.3 if k % 2 == 0 else -0.3),
                send=0.2, group="feet"))
        add(Cue(t + dur * 0.6, "groan", f"hull groans as she rolls (crossing {k + 1})", (lambda r=rr(), a=0.6 + 0.15 * k: (st(hull_groan(1.1, r, a)), 0.0)), -12 + 2 * k, send=0.25,
                group="hull"))
        add(Cue(t + dur * 0.5, "rigging", "rigging and blocks knocking with the roll", (lambda r=rr(): (st(G.rattle(0.6, r, 22)) * 0.6, 0.0)), -18 + k, send=0.25, group="hull"))
    add(Cue(W(T.STOP_F), "halt", "they skid to a stop: shuffling feet", lambda: (st(feet_run(0.35, rng(77), 20)), 0.0), -12, send=0.2))
    add(Cue(W(T.LURCH_F) - 0.2, "lurch", "the big lurch: long deep timber groan + things sliding", lambda: (mixl([hull_groan(2.0, rng(81), 1.0), G.rattle(1.2, rng(82), 30, heavy=True) * 0.5]), 0.0),
            -4, send=0.3))
    add(Cue(W(T.LURCH_F) + 0.05, "whoa", "sailors: whoa!", lambda: (mixl([G.whoa(rng(83 + k), 120 + 25 * k) for k in range(4)], [0.03 * k for k in range(4)]) / 2, 0.0), -10, send=0.25))
    add(Cue(W(895), "sigh", "the admiral sighs", lambda: (S(G.whoa(rng(89), 92, 0.7)) * 0.5, 0.0), -18, send=0.1))

    # ------------------------------------------------ launch + salute (shots 10-11)
    add(Cue(W(910), "launch_cheer", "the quay cheers as she is warped off", lambda: (mixl([G.hurrah(rng(91 + k), 150 + 20 * k, 1.0, kid=(k == 3)) for k in range(5)] + [G.applause(1.2, rng(96), 24)], [0.07 * k for k in range(5)] + [0.0]), 0.0),
            -10, lpf=5000, send=0.3))
    add(Cue(W(945), "shore_cheer", "crowd on the quay cheering and clapping (10 August)", lambda: (mixl([G.applause(2.8, rng(97), 36), lp(G.babble(2.8, rng(98), 160, 1.2, 4.4, 0.9), 3600, 1)]), 0.0),
            -11, lpf=5200, send=0.3))
    for i in range(12):
        t = W(T.SALUTE_PORTS + i * 1.6)
        add(Cue(t, "lid", "salute: gun-port lids open", (lambda r=rr(): (lid_creak(r), 0.0)), -18, p=-0.3 + 0.05 * i, send=0.2, group="lids"))
    for i in range(12):
        t = W(T.SALUTE_F + i * 1.2)
        add(Cue(t, "cannon", f"farewell salute: gun {i + 1}", (lambda r=rr(), s=1.0 - 0.03 * i: (st(cannon(r, s)), 0.0)), -4 if i == 0 else -8, p=0.5 - 0.08 * i, send=0.35,
                group="salute", cut=W(T.GUST_F)))

    # ------------------------------------------------ the gust, the lean, the sea, the sinking (shots 12-13)
    add(Cue(W(1034), "sails_out", "under sail: canvas, rigging, water along the hull", lambda: (mixl([G.flag_flutter(1.6, rng(101)) * 0.6, water_rush(1.6, rng(102), 0.25)]), 0.0), -18, cut=W(T.GUST_F)))
    add(Cue(W(T.GUST_F), "gust", "THE GUST: wind roar, sails slam full (whump), flags crack", lambda: (mixl([G.breeze(2.4, rng(110), 3.0, 0.9, 1400), G.whoosh(0.6, rng(111), 0.05, 120, 900, 1.0, 0.3, 0.2) * 1.5,
            G.flag_flutter(2.0, rng(112))]), 0.0), 0, send=0.2))
    add(Cue(W(T.LEAN_F) - 0.3, "lean", "she leans over: huge hull groan, cargo and guns shifting", lambda: (mixl([hull_groan(2.2, rng(120), 1.0), G.rattle(1.6, rng(121), 26, heavy=True) * 0.6]), 0.0), -3, send=0.3))
    add(Cue(W(T.LEAN_F) + 0.3, "crew_cry", "crew shouting", lambda: (mixl([G.whoa(rng(125 + k), 130 + 18 * k) for k in range(5)], [0.05 * k for k in range(5)]) / 2, 0.0), -10, lpf=4500, send=0.3))
    add(Cue(W(T.SEA_F), "sea_in", "the sea pours in through the open gun ports", lambda: (mixl([water_rush(2.0, rng(130), 1.0), G.splash_big(rng(131)) * 0.6]), 0.0), -1, send=0.2))
    add(Cue(W(T.SINK0_F) + 0.6, "sinking", "going down: water closing over, big bubbles, last groans", lambda: (mixl([G.bubbles(3.2, rng(140), 30, 120, 900), hull_groan(2.4, rng(141), 0.6)]), 0.0),
            -6, send=0.3))
    add(Cue(W(1181), "gasp", "the quay gasps", lambda: (st(lp(G.babble(1.4, rng(150), 180, 1.3, 6.0, 0.9), 3000, 1)), 0.0), -14, send=0.35))
    add(Cue(W(1240), "swimmers", "sailors splashing by the masts", lambda: (S(G.water_bed(4.0, rng(151), 0.7, 1.1)), 0.0), -20, send=0.2))
    add(Cue(W(1258), "glug", "one last deadpan bubble on 'Unluckily'", lambda: (G.bubbles(0.5, rng(152), 6, 200, 600), 0.0), -14, send=0.1))

    # ------------------------------------------------ rowing boat (shot 14)
    add(Cue(W(T.STAND_F), "stand", "kid stands up: wooden creak + the boat rocks", lambda: (st(G.creak(0.6, rng(160), 160, 260)), 0.0), -14, send=0.15))
    for k, f0 in enumerate([1430, 1452, 1476]):
        add(Cue(W(f0), "rock", "boat rocks: slosh + creak", (lambda r=rr(), a=0.6 + 0.2 * k: (mixl([G.water_bed(0.8, r, 1.0, 2.5), G.creak(0.4, r, 130, 220)]) * a, 0.0)), -14 + 2 * k,
                send=0.15, group="boat"))
    add(Cue(W(1476), "kid_whoa", "kid: whoa!", lambda: (st(G.whoa(rng(170), 300)), 0.0), -9, send=0.15))
    add(Cue(W(T.SIT_F), "sit", "kid sits down: bump on the thwart + settling slosh", lambda: (mixl([G.push_thump(rng(180)), G.water_bed(1.0, rng(181), 1.0, 1.5) * 0.6]), 0.0), -12, send=0.15))
    add(Cue(W(1553), "cannon_thud", "heavy guns 'on top': three low thuds", lambda: (mixl([G.push_thump(rng(190 + k)) for k in range(3)], [0.32 * k for k in range(3)]), 0.0), -14, send=0.15))

    # ------------------------------------------------ inquiry + king (shots 16-17)
    add(Cue(W(1653), "gavel", "a judge's gavel on 'nobody (was punished)'", lambda: (st(G.hammer_hit(rng(200), 0.5)), 0.0), -12, send=0.2))
    add(Cue(W(1740), "judges_gasp", "judges turn: small gasp", lambda: (st(G.whoa(rng(210), 140, 0.3)), 0.0), -16, send=0.15))
    add(Cue(W(1790), "ding", "the king beams: a bright ting", lambda: (st(G.clink(rng(220), 3200, 0.4, 1.4)), 0.0), -14, send=0.25))

    # ------------------------------------------------ raised + visitors (shots 18-19)
    add(Cue(W(T.LIFT_F) + 0.1, "lift", "she breaks the surface: water pouring off the hull", lambda: (mixl([water_rush(2.4, rng(230), 1.0), G.splash_big(rng(231)) * 0.4]), 0.0), -6, send=0.25))
    add(Cue(W(1880), "lift_cheer", "a distant cheer", lambda: (S(G.applause(1.6, rng(232), 30)) * 0.8, 0.0), -16, lpf=4000, send=0.35))
    add(Cue(W(2003), "hush", "on deck: just the gulls and the breeze (the barrier rope creaks)", lambda: (st(G.creak(0.3, rng(240), 300, 420)) * 0.5, 0.0), -20, send=0.2))

    # ------------------------------------------------ camera cuts / crossfades: soft whooshes on the big moves
    for f in [567, 1034, 1181, 1809]:
        add(Cue(W(f), "whoosh", "camera move", (lambda r=rr(): (st(G.whoosh(0.6, r, 0.09, 330, 2000, 0.8, 0.18, 0.15)), 0.09)), -13, send=0.12, group="whoosh"))
    return C


def render(v_ref, on_event=None):
    C = cues()
    out = np.zeros((2, N))
    send = np.zeros(N)
    for c in C:
        x, anchor = c.gen()
        x = np.asarray(x, float)
        x = pan(x, c.p) if x.ndim == 1 else x
        if c.cut is not None:
            k = ns(c.cut - (c.t - anchor))
            if 0 < k < x.shape[1]:
                x = fades(x[:, :k], 0.0, 0.05)
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
    harbour = make_ir(1.3, 77, pre=0.012, hf=1.6, early=[(0.1, 0.4, -0.5), (0.18, 0.3, 0.6)])
    out += 0.5 * convolve_st(send, harbour)
    out = hp(out, 25, 2)
    end = ns(T.DUR - 0.12)
    out[:, end:] *= np.linspace(1, 0, N - end)[None, :] ** 2
    return out, C
