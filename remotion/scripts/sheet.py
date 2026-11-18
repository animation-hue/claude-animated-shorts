"""usage: python scripts/sheet.py out.jpg img1 img2 ... (labels = frame numbers from file names), 5 per row"""
import sys, re
from PIL import Image, ImageDraw
out, files = sys.argv[1], sys.argv[2:]
ims = [Image.open(f).convert("RGB") for f in files]
w, h = 270, 480
cols = 5; rows = (len(ims) + cols - 1) // cols
S = Image.new("RGB", (cols * w, rows * (h + 22)), "#222")
d = ImageDraw.Draw(S)
for k, (im, f) in enumerate(zip(ims, files)):
    x, y = (k % cols) * w, (k // cols) * (h + 22)
    S.paste(im.resize((w, h)), (x, y + 22))
    d.text((x + 6, y + 5), re.findall(r"(\d+)\.jpg$", f)[0] if re.findall(r"(\d+)\.jpg$", f) else f, fill="#fff")
S.save(out, quality=85)
