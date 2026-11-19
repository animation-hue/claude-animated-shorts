"""Tighten pauses in a narration WAV, then hit a target length with a pitch-preserving stretch.

usage: python tighten.py in.wav out.wav --target 68.0
Gaps (< -40 dBFS) longer than 0.3 s are shortened: >=0.6 s -> 0.50 s (paragraph), else -> 0.30 s.
"""
import argparse, subprocess, tempfile, os
import numpy as np
import soundfile as sf

ap = argparse.ArgumentParser()
ap.add_argument("inp"); ap.add_argument("out")
ap.add_argument("--target", type=float, default=68.0)
ap.add_argument("--thr", type=float, default=-40.0)
a = ap.parse_args()

x, sr = sf.read(a.inp)
if x.ndim > 1: x = x.mean(1)
hop = int(sr * 0.01)
n = len(x) // hop
rms = np.sqrt(np.mean(x[: n * hop].reshape(n, hop) ** 2, 1) + 1e-12)
quiet = 20 * np.log10(rms) < a.thr

# runs of quiet frames
runs, i = [], 0
while i < n:
    if quiet[i]:
        j = i
        while j < n and quiet[j]: j += 1
        runs.append((i, j)); i = j
    else: i += 1

fade = int(sr * 0.008)
pieces, cur = [], 0
cuts = []  # (orig_sample_start_of_cut, orig_sample_end_of_cut) removed spans
for s, e in runs:
    dur = (e - s) * 0.01
    s_, e_ = s * hop, e * hop
    if s == 0:  # lead-in
        keep = 0.15
    elif e >= n:  # tail
        keep = 0.40
    elif dur >= 0.6:
        keep = 0.50
    elif dur > 0.3:
        keep = 0.30
    else:
        continue
    k = int(keep * sr)
    if e_ - s_ <= k: continue
    # keep half of the kept silence on each side of the cut
    a_end = s_ + k // 2
    b_start = e_ - (k - k // 2)
    pieces.append(x[cur:a_end].copy())
    cuts.append((a_end, b_start))
    cur = b_start
pieces.append(x[cur:].copy())
for p in pieces:  # tiny fades at every cut (cuts are inside silence anyway)
    if len(p) > 2 * fade:
        p[:fade] *= np.linspace(0, 1, fade); p[-fade:] *= np.linspace(1, 0, fade)
y = np.concatenate(pieces)
tight = len(y) / sr
tempo = max(1.0, tight / a.target)
print(f"orig {len(x)/sr:.2f}s  tightened {tight:.2f}s  tempo x{tempo:.3f}")

with tempfile.TemporaryDirectory() as td:
    t = os.path.join(td, "t.wav"); sf.write(t, y, sr)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", t, "-af",
                    f"rubberband=tempo={tempo:.4f}:transients=smooth:formant=preserved,aresample=48000",
                    "-ac", "1", "-c:a", "pcm_s24le", a.out], check=True)
print("wrote", a.out, f"{sf.info(a.out).duration:.2f}s")

import json
json.dump({"sr": sr, "tempo": tempo, "cuts_s": [[c0 / sr, c1 / sr] for c0, c1 in cuts]},
          open(os.path.splitext(a.out)[0] + ".map.json", "w"), indent=1)


def remap(t, cuts=[[c0 / sr, c1 / sr] for c0, c1 in cuts]):
    """original-take seconds -> output seconds"""
    removed = 0.0
    for c0, c1 in cuts:
        if t >= c1: removed += c1 - c0
        elif t > c0: removed += t - c0  # inside a removed span: clamp to the cut
    return (t - removed) / tempo

