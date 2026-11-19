"""Pull each word's end back to the onset of silence (< -48 dBFS) in voice.wav; clamp to file length."""
import json, sys, numpy as np, soundfile as sf
wav, wj = sys.argv[1:3]
x, sr = sf.read(wav); hop = sr // 100
n = len(x) // hop
db = 20*np.log10(np.sqrt(np.mean(x[:n*hop].reshape(n, hop)**2, 1)) + 1e-9)
quiet = db < -48; dur = len(x)/sr
W = json.load(open(wj)); fixed = 0
for k, w in enumerate(W):
    nxt = W[k+1]["start"] if k+1 < len(W) else dur
    e = min(w["end"], nxt, dur)
    # last loud frame before the word's (clamped) end; only trims trailing silence
    f = min(int(e*100), n) - 1
    while f > int(w["start"]*100) + 5 and quiet[f]: f -= 1
    if (f+1)/100 < e - 0.02: e = (f+1)/100; fixed += 1
    w["end"] = round(max(e, w["start"] + 0.05), 3); w["f1"] = int(round(w["end"]*30))
json.dump(W, open(wj, "w"), indent=1)
print("snapped", fixed, "ends; duration", dur)
for i in (0, 16, 17, 77, 87, 133, 141, 150, 205, 246):
    w = W[i]; print(f'{w["word"]:>14} {w["start"]:6.2f}-{w["end"]:6.2f}  f{w["f0"]}-{w["f1"]}')
