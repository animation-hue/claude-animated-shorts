"""Map raw take word times through voice.map.json -> words.json (seconds + 30 fps frames)."""
import json, sys
raw, mp, out = sys.argv[1:4]
m = json.load(open(mp)); tempo = m["tempo"]; cuts = m["cuts_s"]
def remap(t):
    rem = 0.0
    for c0, c1 in cuts:
        if t >= c1: rem += c1 - c0
        elif t > c0: rem += t - c0
    return (t - rem) / tempo
d = json.load(open(raw))
ws = d["words"] if isinstance(d, dict) else d
ws = [w for w in ws if w.get("type", "word") == "word"]
res = []
for i, w in enumerate(ws):
    s, e = remap(w["start"]), remap(w["end"])
    res.append({"i": i, "word": w["text"], "start": round(s, 3), "end": round(e, 3),
                "f0": int(s * 30), "f1": int(round(e * 30))})
json.dump(res, open(out, "w"), indent=1)
print(len(res), "words; last ends", res[-1]["end"], "s")
