# Every sound effect + ambience bed of "Two Friends and the Bear" as a cue list timed to the narration (timeline.py),
# rendered into one stereo SFX stem. Standard mix: EVENTS placed SFX_DB = -6 dB under their naive level (LU vs the
# voice stem, max momentary); BEDS (integrated) are not reduced. The jungle goes quiet when the bear comes out and the
# birds come back when it leaves.
import numpy as np
from dsp import (SR, ns, tt, rng, dbg, lp, hp, bp, pan, st, place, fades, make_ir, convolve_st, momentary_max, integrated,
                 colored, smooth_noise, modal)
import sfx_gen as G
import instruments as I
import timeline as T

N = ns(T.DUR)
SFX_DB = -6.0


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


# ---------------- our own sounds ----------------
def slap(r, bright=1.0):
    """palm slap: a sharp noise crack with a skin-thud body"""
    t = tt(0.18)
    crack = bp(r.standard_normal(len(t)), 1200, 6000, 2) * np.exp(-t / 0.012) * bright
    body = lp(r.standard_normal(len(t)), 500, 2) * np.exp(-t / 0.03) * 0.8
    return crack + body


def bump(r):
    """fist bump: a soft knuckle knock"""
    t = tt(0.2)
    return modal(0.2, [(r.uniform(180, 230), 1.0, 0.03), (r.uniform(500, 650), 0.4, 0.015)], r) + lp(r.standard_normal(len(t)), 900, 2) * np.exp(-t / 0.015) * 0.6


def pop(r, f=900.0):
    """thumbs-up: a cartoon cork pop"""
    t = tt(0.12)
    fr_ = f * (1 + 1.5 * np.exp(-t / 0.01))
    return np.sin(2 * np.pi * np.cumsum(fr_ / SR)) * np.exp(-t / 0.03) + hp(r.standard_normal(len(t)), 2000, 2) * np.exp(-t / 0.004) * 0.4


def steps(dur, r, rate=1.8, scuff=0.4, soft=1.0, offset=0.0):
    """footsteps on a dirt path at `rate` steps per second"""
    xs, offs = [], []
    k = 0
    while offset + k / rate < dur:
        xs.append(G.stroll_step(r, scuff) * soft * r.uniform(0.8, 1.1)); offs.append(max(0.0, offset + k / rate + r.normal(0, 0.012))); k += 1
    return lp(mixl(xs, offs), 2500, 1)


def rustle(dur, r, amt=1.0):
    """leaves shaken: noise bursts through a leafy band"""
    n = ns(dur)
    env = np.clip(smooth_noise(n, r, 14) * 0.5 + 0.6, 0, None) * np.clip(tt(dur) / 0.05, 0, 1) * np.clip((dur - tt(dur)) / 0.2, 0, 1)
    return bp(r.standard_normal(n), 1500, 7000, 2) * env * amt


def thud(r, f=70.0, dur=0.35, amt=1.0):
    t = tt(dur)
    return (np.sin(2 * np.pi * f * (1 + 0.6 * np.exp(-t / 0.02)) * t) * np.exp(-t / 0.08) + lp(r.standard_normal(len(t)), 400, 2) * np.exp(-t / 0.03) * 0.6) * amt


def jump_whoosh(r, h):
    return G.whoosh(0.3 + 0.2 * h, r, 0.15, 400, 2600, 0.8, 0.1, 0.2)


def stomach(r, dur=1.6):
    """a long hungry stomach growl: a low gurgle with a wobbling pitch"""
    t = tt(dur)
    f = 85 + 25 * np.sin(2 * np.pi * 2.3 * t) + 15 * smooth_noise(len(t), r, 6)
    tone = np.sign(np.sin(2 * np.pi * np.cumsum(f / SR))) * 0.5
    burble = bp(r.standard_normal(len(t)), 100, 700, 2) * (0.5 + 0.5 * np.sin(2 * np.pi * 9 * t)) ** 2
    return lp(tone + burble, 600, 2) * np.clip(t / 0.15, 0, 1) * np.clip((dur - t) / 0.3, 0, 1)


def wings(dur, r, rate=3.5):
    """big slow wing beats (hornbill): low whooshing flaps"""
    xs, offs = [], []
    for k in range(int(dur * rate)):
        xs.append(G.whoosh(0.28, r, 0.1, 150, 900, 0.7, 0.05, 0.1)); offs.append(k / rate)
    return mixl(xs, offs)


def honk(r, f=300.0):
    """the hornbill's flat, unimpressed 'hrmph' honk"""
    t = tt(0.35)
    ff = f * (1 - 0.15 * t)
    y = np.sign(np.sin(2 * np.pi * np.cumsum(ff / SR))) * 0.4 + np.sin(2 * np.pi * np.cumsum(2 * ff / SR)) * 0.2
    return bp(y, 250, 2200, 2) * np.clip(t / 0.02, 0, 1) * np.clip((0.35 - t) / 0.08, 0, 1)


def bear_huff(r, dur=0.9, low=1.0):
    """bear breath / huff: filtered breath noise with a low growl underneath"""
    t = tt(dur)
    breath = bp(r.standard_normal(len(t)), 200, 1800, 2) * np.exp(-((t - dur * 0.3) / (dur * 0.3)) ** 2)
    f = 55 * low * (1 + 0.1 * np.sin(2 * np.pi * 6 * t))
    growl = lp(np.sign(np.sin(2 * np.pi * np.cumsum(f / SR))), 300, 2) * 0.35 * np.exp(-((t - dur * 0.35) / (dur * 0.35)) ** 2)
    return breath + growl


def sniff(r):
    """three quick wet sniffs"""
    return mixl([bp(r.standard_normal(ns(0.09)), 1500, 5000, 2) * np.exp(-tt(0.09) / 0.03) for _ in range(3)], [0, 0.13, 0.26])


def paw(r):
    return thud(r, r.uniform(45, 60), 0.4, 1.0) + lp(rustle(0.25, r, 0.3), 3000, 1)[: ns(0.4)] if False else thud(r, r.uniform(45, 60), 0.4, 1.0)


def scrape(dur, r):
    """sneakers on bark: rough scraping bursts"""
    n = ns(dur)
    env = (0.5 + 0.5 * np.sin(2 * np.pi * 5 * tt(dur))) ** 2
    return bp(r.standard_normal(n), 600, 3500, 2) * env * 0.8


def jungle_bed(dur, r, birds=1.0, insects=1.0, breeze=1.0):
    x = G.breeze(dur, r, 0.6 * breeze, 0.12, 1200)
    if birds: x = x + pan(G.bird_chirps(dur, r, 0.45 * birds, "sparrow") * 0.12, 0.4) + pan(G.bird_chirps(dur, rng(int(r.integers(1 << 20))), 0.25 * birds, "sparrow") * 0.08, -0.5)
    if insects: x = x + st(G.crickets(dur, r, 3) * 0.05 * insects)
    return fades(x, 0.4, 0.5)


def cues():
    C = []
    R = rng(2611)
    rr = lambda: rng(int(R.integers(1 << 30)))
    add = C.append
    # ---- beds
    for (a, b, seed, kw, lvl, desc) in [
        (0.0, 29.7, 1, dict(birds=1.0, insects=0.0, breeze=0.8), -29, "village morning: birds, a soft breeze"),
        (29.6, 71.8, 2, dict(birds=1.2, insects=0.8, breeze=0.7), -28, "the jungle: birds high and low, insects, leaves"),
        (71.6, 138.5, 3, dict(birds=0.0, insects=0.3, breeze=0.6), -33, "the bear: the birds go silent, only wind"),
        (98.2, 104.4, 4, dict(birds=0.6, insects=0.0, breeze=0.4), -31, "Grandma's memory: soft village birds"),
        (138.0, T.DUR, 5, dict(birds=0.8, insects=0.6, breeze=0.7), -29, "the birds come back; evening insects"),
    ]:
        add(Cue(a, "amb", desc, (lambda d=b - a + 0.3, s=seed, kw=kw: (jungle_bed(d, rng(s), **kw), 0.0)), lvl, "bed", send=0.0))
    # ---- the handshakes
    for k, t in enumerate(T.HANDS1 + T.HANDS2):
        kind = k % 4
        gen = [lambda r: slap(r), lambda r: slap(r, 1.2), lambda r: bump(r), lambda r: pop(r)][kind]
        add(Cue(t, "hand", ["slap", "slap", "fist bump", "thumbs-up pop"][kind] + (" (first)" if k < 4 else " (the promise)"), (lambda r=rr(), g=gen: (g(r), 0.0)), -10, send=0.15, group="hand"))
    for t in T.HANDS3:
        add(Cue(t, "hand_solo", "the last handshake: Ram's slap, alone", (lambda r=rr(): (slap(r, 0.8), 0.0)), -12, send=0.25, group="hand_solo"))
    # ---- walking
    for (a, b, rate, desc) in [(13.3, 18.6, 1.7, "the friends set off"), (29.7, 37.9, 1.9, "into the jungle"), (38.0, 44.8, 1.8, "deep in the jungle"),
                               (49.6, 53.2, 1.6, "walking on, warier"), (54.8, 58.0, 1.6, "walking on")]:
        add(Cue(a, "steps", "footsteps on the dirt path: " + desc, (lambda d=b - a, r=rr(), rt=rate: (steps(d, r, rt), 0.0)), -20, send=0.1, group="steps"))
    add(Cue(T.BRAVE[0] - 0.05, "swish", "Ram swishes his stick like a sword", lambda: (mixl([G.whoosh(0.3, rng(9), 0.12, 500, 3000, 0.8, 0.08, 0.2) for _ in range(3)], [0, 0.62, 1.05]), 0.0), -14, send=0.15))
    # ---- false alarms
    add(Cue(T.RUSTLE, "rustle", "the bush rustles", lambda: (rustle(1.6, rng(10)), 0.0), -12, p=-0.2, send=0.15))
    for j, (t0, h) in enumerate(T.JUMPS):
        d = 0.38 + 0.25 * h
        add(Cue(t0, "jump", f"Ram jumps ({['small', 'higher', 'huge'][j]})", (lambda r=rr(), h=h: (jump_whoosh(r, h), 0.0)), -12 + 2 * j, send=0.15, group="jump"))
        add(Cue(t0 + d, "land", "and lands", (lambda r=rr(), h=h: (thud(r, 80, 0.3, 0.8 + 0.3 * h), 0.0)), -12, send=0.1, group="land"))
    for k in range(4):
        add(Cue(T.RABBIT + 0.33 * k, "hop", "the rabbit hops away", (lambda r=rr(): (thud(r, 140, 0.15, 0.5), 0.0)), -22, p=-0.3, send=0.1, group="hop"))
    add(Cue(T.GROWL, "growl", "a deep, heavy growl... Shyam's stomach", lambda: (stomach(rng(11)), 0.0), -9, send=0.1))
    add(Cue(T.SHADOW, "wings", "a huge shadow: slow, heavy wing beats overhead", lambda: (wings(2.4, rng(12)), 0.0), -12, send=0.25))
    add(Cue(T.SHOES, "shoes", "his shoes pop off", lambda: (mixl([pop(rng(13), 700), pop(rng(14), 820)], [0, 0.08]), 0.0), -14, send=0.15))
    add(Cue(T.SHOES + 1.5, "shoes_land", "the shoes land", lambda: (mixl([thud(rng(15), 120, 0.2, 0.6), thud(rng(16), 130, 0.2, 0.5)], [0, 0.18]), 0.0), -18, send=0.1))
    add(Cue(T.HORNBILL + 1.0, "honk", "the hornbill: an unimpressed 'hrmph'", lambda: (honk(rng(17)), 0.0), -12, p=0.3, send=0.2))
    # ---- the bear
    add(Cue(T.BUSH_OPEN, "bush_open", "the bushes part: a big rustle and a snapping twig", lambda: (mixl([rustle(1.4, rng(18), 1.3), G.wood_crack(rng(19)) * 0.5], [0, 0.4]), 0.0), -9, p=0.3, send=0.15))
    for k in range(5):
        add(Cue(72.9 + 0.55 * k, "paw", "heavy paw steps", (lambda r=rr(): (paw(r), 0.0)), -14, p=0.25, send=0.15, group="paw"))
    add(Cue(T.BEAR_OUT, "huff", "the bear huffs", lambda: (bear_huff(rng(20), 1.1, 0.9), 0.0), -8, p=0.2, send=0.2))
    add(Cue(T.STICK, "stick", "Ram drops his stick: a wooden clatter", lambda: (mixl([G.clink(rng(21), 500, 0.15, 0.5), thud(rng(22), 200, 0.2, 0.5), G.clink(rng(23), 420, 0.12, 0.4)], [0, 0.05, 0.16]), 0.0), -11, send=0.12))
    add(Cue(T.RUN, "run", "Ram's running footsteps", lambda: (steps(2.4, rng(24), 4.5, 0.7), 0.0), -14, send=0.1))
    add(Cue(T.CLIMB, "climb", "scrambling up the bark", lambda: (scrape(2.6, rng(25)), 0.0), -14, p=0.2, send=0.15))
    add(Cue(T.LIE, "lie", "Shyam drops flat on the path", lambda: (thud(rng(26), 90, 0.3, 0.6), 0.0), -16, send=0.1))
    add(Cue(T.BREATH - 0.3, "inhale", "he holds his breath (a quick inhale, then nothing)", lambda: (bp(rng(27).standard_normal(ns(0.45)), 600, 3500, 2) * np.clip(tt(0.45) / 0.3, 0, 1) * np.exp(-tt(0.45) / 0.4) * 0.6, 0.0), -18, send=0.1))
    for k in range(4):
        add(Cue(T.BEAR_COMES + 0.5 * k, "paw2", "the bear walks up to Shyam", (lambda r=rr(): (paw(r), 0.0)), -16, send=0.12, group="paw2"))
    for t in T.SNIFF:
        add(Cue(t, "sniff", "the bear sniffs", (lambda r=rr(): (sniff(r), 0.0)), -12, send=0.15, group="sniff"))
    for k in range(4):
        add(Cue(T.WHISPER + 0.6 + 3.0 * k, "whisper", "breathing at Shyam's ear: slow, close bear breaths", (lambda r=rr(): (bear_huff(r, 1.6, 0.7) * 0.6, 0.0)), -17, send=0.08, group="whisper"))
    for k in range(6):
        add(Cue(T.BEAR_GOES + 0.6 + 0.6 * k, "paw3", "the bear lumbers back into the jungle", (lambda r=rr(), k=k: (paw(r) * (1 - 0.13 * k), 0.0)), -16, p=0.3, send=0.2, group="paw3"))
    add(Cue(T.BEAR_GOES + 4.4, "bush_close", "the bushes close behind it", lambda: (rustle(1.2, rng(30), 0.8), 0.0), -20, p=0.4, send=0.25))
    # ---- after
    add(Cue(T.DOWN, "slide", "Ram slides down the trunk", lambda: (scrape(1.6, rng(31)), 0.0), -15, p=0.2, send=0.15))
    add(Cue(T.LAND, "land2", "lands on his feet", lambda: (thud(rng(32), 90, 0.3, 0.7), 0.0), -14, send=0.1))
    add(Cue(T.DUST, "dust", "dusts off his clothes: pat pat pat", lambda: (mixl([lp(rng(33 + k).standard_normal(ns(0.08)), 1500, 2) * np.exp(-tt(0.08) / 0.02) for k in range(4)], [0.18 * k for k in range(4)]), 0.0), -18, send=0.1))
    add(Cue(T.STAND, "stand", "Shyam gets up", lambda: (mixl([rustle(0.4, rng(37), 0.5), thud(rng(38), 110, 0.2, 0.4)], [0, 0.3]), 0.0), -18, send=0.1))
    add(Cue(T.BAG, "bag", "he picks up his bag", lambda: (rustle(0.35, rng(39), 0.6), 0.0), -18, send=0.1))
    add(Cue(T.WALK_AWAY, "walk_away", "Shyam walks home, footsteps fading", lambda: (fades(steps(10.0, rng(40), 1.5, 0.4), 0.0, 6.0), 0.0), -20, p=-0.2, send=0.2))
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
