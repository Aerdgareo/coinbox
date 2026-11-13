import os
from PIL import Image

SRC = r"C:\Users\risay\Desktop\shu"
OUT = r"D:\ICT\coinbox\public\characters"
os.makedirs(OUT, exist_ok=True)

TW, TH = 600, 780

PAIRS = [
    ("丛雨/IMG_1794302015173.jpg", "congyu"),
    ("丛雨/IMG_1794301881076.jpg", "congyu2"),
    ("雪未来2017/IMG_1794302201107.png.jpg", "miku"),
    ("甘城なつき/IMG_1794302231028.png.jpg", "gancheng"),
    ("甘城なつき/猫羽雫/IMG_1794302206940.png.jpg", "gancheng2"),
]

for rel, name in PAIRS:
    path = os.path.join(SRC, rel.replace("/", os.sep))
    im = Image.open(path).convert("RGB")
    w, h = im.size
    scale = max(TW / w, TH / h)
    im = im.resize((max(TW, int(w * scale)), max(TH, int(h * scale))), Image.LANCZOS)
    w2, h2 = im.size
    left = max(0, (w2 - TW) // 2)
    top = 0
    im = im.crop((left, top, left + TW, top + TH))
    out = os.path.join(OUT, name + ".webp")
    im.save(out, "WEBP", quality=82, method=6)
    print(name, im.size, os.path.getsize(out) // 1024, "KB")