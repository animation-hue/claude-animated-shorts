# Every sound effect + ambience bed of "Karela" as a cue list timed to the picture (timeline.py), rendered into one
# stereo SFX stem. Standard mix: EVENTS placed SFX_DB = -6 dB under their naive level (LU vs the voice stem, max
# momentary); BEDS (integrated) are not reduced. Boars speak only in grunts ("घुर्र! उँह!"), crunches and squeals.
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
    offs = [max(0.0, o) for o in (offs or [0.0] * len(xs))]
    n = max(ns(o) + x.shape[1] for x, o in zip(xs, offs))
    out = np.zeros((2, n))
    for x, o in zip(xs, offs):
        out[:, ns(o): ns(o) + x.shape[1]] += x
    return out


def thud(r, f=70.0, dur=0.35, amt=1.0):
    t = tt(dur)
    return (np.sin(2 * np.pi * f * (1 + 0.6 * np.exp(-t / 0.02)) * t) * np.exp(-t / 0.08) + lp(r.standard_normal(len(t)), 400, 2) * np.exp(-t / 0.03) * 0.6) * amt


def hoe_hit(r):
    """the hoe biting into soil: a dull thump + a gritty scrape"""
    return thud(r, 90, 0.25, 0.9) + bp(r.standard_normal(ns(0.25)), 800, 4000, 2) * np.exp(-tt(0.25) / 0.05) * 0.5


def rustle(dur, r, amt=1.0, lo=1500, hi=7000):
    n = ns(dur)
    env = np.clip(smooth_noise(n, r, 14) * 0.5 + 0.6, 0, None) * np.clip(tt(dur) / 0.05, 0, 1) * np.clip((dur - tt(dur)) / 0.2, 0, 1)
    return bp(r.standard_normal(n), lo, hi, 2) * env * amt


def grunt(r, base=None, dur=None, squeal=False):
    """a boar's grunt (low, nasal, rough) or a squeal (high, rising) - our own synthesized voice"""
    d = dur or r.uniform(0.18, 0.32)
    t = tt(d)
    f0 = (base or r.uniform(85, 120)) * (1 + (1.6 * t / d if squeal else -0.15 * t / d))
    if squeal: f0 = f0 * 4
    ph = 2 * np.pi * np.cumsum(f0 / SR)
    src = np.sign(np.sin(ph)) * 0.6 + 0.4 * np.sin(2 * ph) + 0.5 * lp(r.standard_normal(len(t)), 900, 1)
    env = np.clip(t / 0.02, 0, 1) * np.clip((d - t) / 0.05, 0, 1) * (1 + 0.5 * np.sin(2 * np.pi * 28 * t))
    return bp(src, 120, 2500 if not squeal else 5000, 2) * env


def crunch(r, dur=0.7):
    """chomping a crisp karela: a train of wet crunch bursts"""
    xs, offs = [], []
    for k in range(int(dur / 0.11)):
        xs.append(bp(r.standard_normal(ns(0.06)), 1800, 7000, 2) * np.exp(-tt(0.06) / 0.015) * r.uniform(0.6, 1.0)); offs.append(k * 0.11 + r.uniform(0, 0.02))
    return mixl(xs, offs)


def slide_down(r, f0=1400.0, f1=300.0, dur=0.7):
    """cartoon slide-whistle fall - the bitter taste"""
    t = tt(dur); f = f0 * (f1 / f0) ** (t / dur) * (1 + 0.03 * np.sin(2 * np.pi * 6 * t))
    return np.sin(2 * np.pi * np.cumsum(f / SR)) * np.clip(t / 0.02, 0, 1) * np.clip((dur - t) / 0.1, 0, 1) * 0.6


def hooves(dur, r, rate=7.0):
    xs, offs = [], []
    for k in range(int(dur * rate)):
        xs.append(thud(r, r.uniform(110, 160), 0.12, r.uniform(0.4, 0.8))); offs.append(k / rate + r.uniform(0, 0.03))
    return mixl(xs, offs)


def steps(dur, r, rate=1.8, scuff=0.4):
    xs, offs = [], []
    k = 0
    while k / rate < dur:
        xs.append(G.stroll_step(r, scuff) * r.uniform(0.8, 1.1)); offs.append(k / rate + abs(r.normal(0, 0.012))); k += 1
    return lp(mixl(xs, offs), 2500, 1)


def pour(dur, r):
    n = ns(dur)
    return bp(colored(n, r, 0.6), 500, 5000, 2) * (0.7 + 0.3 * smooth_noise(n, r, 10)) * np.clip(tt(dur) / 0.2, 0, 1) * np.clip((dur - tt(dur)) / 0.3, 0, 1)


def rooster(r):
    """our own synthesized rooster crow: four rising-falling nasal tones"""
    segs = [(0.18, 520, 700), (0.16, 700, 760), (0.5, 780, 820), (0.35, 820, 520)]
    out = []
    for d, a, b in segs:
        t = tt(d); f = a + (b - a) * t / d
        ph = 2 * np.pi * np.cumsum(f / SR)
        y = (np.sin(ph) + 0.6 * np.sin(2 * ph) + 0.3 * np.sin(3 * ph)) * np.clip(t / 0.02, 0, 1) * np.clip((d - t) / 0.03, 0, 1)
        out.append(y)
    return bp(np.concatenate(out), 400, 4000, 2) * 0.5


def farm_bed(dur, r, birds=1.0, crickets=0.0, breeze=1.0, owl=False):
    x = G.breeze(dur, r, 0.6 * breeze, 0.12, 1100)
    if birds: x = x + pan(G.bird_chirps(dur, r, 0.4 * birds, "sparrow") * 0.12, 0.4)
    if crickets: x = x + st(G.crickets(dur, r, 3) * 0.08 * crickets)
    return fades(x, 0.4, 0.5)


# ---------------- ElevenLabs sound effects (el/*.wav, generated for this film) ----------------
import os
from scipy.io import wavfile as _wf
_EL = {}
def el(name, dur=None, xf=1.5):
    """an ElevenLabs effect as stereo; with dur, tiled (crossfaded) to that length - the beds were generated as loops"""
    if name not in _EL:
        sr, x = _wf.read(os.path.join(os.path.dirname(os.path.abspath(__file__)), "el", name + ".wav"))
        x = x.astype(np.float64) / 32768.0
        _EL[name] = (x.T if x.ndim == 2 else st(x))
    x = _EL[name]
    if dur is None:
        return x.copy()
    n, L, f = ns(dur), x.shape[1], ns(xf)
    out = np.zeros((2, n)); pos = 0
    ramp = np.linspace(0, 1, f)
    while pos < n:
        seg = x.copy()
        if pos > 0: seg[:, :f] *= ramp
        seg[:, -f:] *= ramp[::-1]
        k = min(L, n - pos); out[:, pos:pos + k] += seg[:, :k]; pos += L - f
    return fades(out, 0.5, 0.8)


def cues():
    C = []
    R = rng(7311)
    rr = lambda: rng(int(R.integers(1 << 30)))
    add = C.append
    # beds: day birds, night crickets (silence around the boars' big moment is deliberate: only crickets)
    for (a, b, name, lvl, desc) in [
        (0.0, 52.8, "birds_morning", -27, "village morning: songbirds, a cuckoo, breeze (ElevenLabs)"),
        (52.6, 72.6, "night", -29, "night: crickets, wind in the corn, a far owl (ElevenLabs)"),
        (72.5, 126.5, "birds_morning", -29, "day: birds (ElevenLabs)"),
        (126.4, 131.7, "night", -29, "night (ElevenLabs)"),
        (131.6, 236.9, "birds_morning", -29, "day: birds (ElevenLabs)"),
        (236.8, 283.5, "night", -28, "night: crickets, wind, owl (ElevenLabs)"),
        (283.4, T.DUR, "birds_morning", -26, "sunrise: a chorus of birds (ElevenLabs)"),
    ]:
        add(Cue(a, "amb", desc, (lambda d=b - a + 0.3, nm=name: (el(nm, d), 0.0)), lvl, "bed", send=0.0))
    # Ramu's hoe in the first scene (strikes on the swing: k = 0.5 + 0.5 sin(3.2 t) peaks) and the ploughing
    for (a, b, w) in [(0.0, 23.9, 3.2), (T.PLOW[0], T.PLOW[1], 3.4)]:
        t = (np.pi / 2) / w
        while t < b:
            if t >= a:
                add(Cue(t, "hoe", "the hoe bites into the soil", (lambda r=rr(): (hoe_hit(r), 0.0)), -18, send=0.08, group="hoe"))
            t += 2 * np.pi / w
    add(Cue(20.8, "pour1", "Vidya waters the tulsi from her lota", lambda: (pour(4.5, rng(8)), 0.0), -22, send=0.1))
    add(Cue(T.SOW[0], "seeds", "seeds scattered (a dry patter)", lambda: (rustle(3.0, rng(9), 0.5, 2500, 9000), 0.0), -20, send=0.1))
    add(Cue(T.WATER[0], "pour2", "Ramu waters the young plants", lambda: (pour(7.0, rng(10)), 0.0), -20, send=0.1))
    add(Cue(T.GROW[0], "grow", "time-lapse growth: a soft rising whoosh", lambda: (G.whoosh(4.6, rng(11), 0.7, 300, 3000, 0.8, 0.3, 0.2), 0.0), -20, send=0.2))
    add(Cue(T.PLANT[0], "seeds2", "planting vines and seeds", lambda: (rustle(8.0, rng(12), 0.4, 2500, 9000), 0.0), -22, send=0.1))
    add(Cue(T.MONTAGE[0], "grow2", "the vines climb, the corn rises", lambda: (G.whoosh(9.5, rng(13), 0.6, 300, 3000, 0.8, 0.3, 0.2), 0.0), -21, send=0.2))
    # walking
    for (a, b, desc) in [(23.9, 26.0, "Ramu walks to the path"), (72.5, 75.7, "they hurry to the field"), (131.6, 134.3, "back to the field"), (283.4, 286.0, "a happy walk to the field")]:
        add(Cue(a, "steps", desc, (lambda d=b - a, r=rr(): (steps(d, r, 2.2), 0.0)), -20, send=0.1, group="steps"))
    # the nights: something in the corn
    add(Cue(63.6, "destroy1", "in the dark: corn stalks snapping, leaves tearing, trampling (ElevenLabs)", lambda: (fades(np.concatenate([el("field_destroy"), el("field_destroy")[:, : ns(1.0)]], axis=1), 1.5, 1.2), 0.0), -13, p=0.35, send=0.25))
    add(Cue(128.3, "destroy2", "again: the field being torn apart (ElevenLabs)", lambda: (fades(el("field_destroy")[:, ns(2.0): ns(5.4)], 0.6, 0.5), 0.0), -13, p=0.35, send=0.25))
    add(Cue(T.WRECK1 + 0.1, "sting1", "the ruined field: broken stalks creak in the wind", lambda: (rustle(3.0, rng(14), 0.5, 600, 3000), 0.0), -22, send=0.2))
    add(Cue(T.WRECK2 + 2.8, "sting2", "broken stalks again", lambda: (rustle(3.0, rng(15), 0.5, 600, 3000), 0.0), -22, send=0.2))
    add(Cue(T.GIVEUP - 3.0, "sit", "Ramu sinks down onto the soil", lambda: (thud(rng(16), 100, 0.3, 0.6), 0.0), -20, send=0.1))
    # the boars
    add(Cue(T.BOARS_OUT - 2.0, "bush", "the bushes shake", lambda: (rustle(2.5, rng(17), 1.1, 900, 6000), 0.0), -13, p=0.4, send=0.2))
    add(Cue(T.BOARS_OUT, "boars", "the herd trots out: deep snorting grunts, sniffing, rustling (ElevenLabs)", lambda: (el("boar_grunts"), 0.0), -10, p=0.3, send=0.15))
    add(Cue(T.AT_VINES - 0.4, "boars2", "snuffling at the vines (ElevenLabs)", lambda: (fades(el("boar_grunts")[:, ns(3.0): ns(6.5)], 0.3, 0.5), 0.0), -12, p=0.2, send=0.12))
    add(Cue(T.BOARS_OUT, "trot", "hooves trotting", lambda: (hooves(6.0, rng(18), 6.0), 0.0), -18, send=0.12))
    add(Cue(T.AT_VINES, "sniff", "sniffing at the vines", lambda: (mixl([bp(rng(19 + k).standard_normal(ns(0.08)), 1500, 5000, 2) * np.exp(-tt(0.08) / 0.025) for k in range(8)], [0.14 * k for k in range(8)]), 0.0), -14, send=0.12))
    add(Cue(T.BITE, "crunch", "CRUNCH: the first boar bites a karela - chomping, then a disgusted snort and spit (ElevenLabs)", lambda: (el("crunch"), 0.0), -8, send=0.12))
    add(Cue(T.BITTER, "bitter", "the bitter taste: a slide-whistle fall + a disgusted 'उँह!'", lambda: (mixl([slide_down(rng(21)), grunt(rng(22), 100, 0.45)], [0, 0.35]), 0.0), -7, send=0.18))
    for j, t0 in enumerate(T.OTHERS):
        add(Cue(t0, "crunch2", "another boar bites", (lambda r=rr(): (crunch(r, 1.0), 0.0)), -13, p=0.3 * (j - 2) / 2, send=0.12, group="crunch2"))
        add(Cue(t0 + 1.4, "yuck", "and spits it out: a squeal + 'उँह! उँह!'", (lambda r=rr(), j=j: (mixl([grunt(r, squeal=True, dur=0.3), grunt(r, 105 + 8 * j, 0.25), grunt(r, 95 + 8 * j, 0.25)], [0, 0.3, 0.6]), 0.0)), -11, p=0.3 * (j - 2) / 2, send=0.15, group="yuck"))
    add(Cue(T.RUN, "stampede", "they flee: panicked squeals, hooves, a crash through the bushes, fading away (ElevenLabs)", lambda: (el("boar_run"), 0.0), -8, p=0.4, send=0.18))
    # sunrise
    add(Cue(T.SUNRISE + 0.4, "rooster", "a rooster crows at sunrise", lambda: (rooster(rng(27)), 0.0), -16, p=-0.4, send=0.3))
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
