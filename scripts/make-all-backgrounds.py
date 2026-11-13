import os
import json
import colorsys
from PIL import Image, ImageFilter, ImageEnhance, ImageOps

SRC = r"C:\Users\risay\Desktop\shu"
OUT = r"D:\ICT\coinbox\public\backgrounds"
COLORS_OUT = r"D:\ICT\coinbox\src\bg-colors.js"
TW, TH = 720, 1280

for f in os.listdir(OUT):
    if f.endswith(".webp"):
        os.remove(os.path.join(OUT, f))

GROUPS = [
    ("丛雨", "congyu", "丛雨", None),
    ("初音未来", "miku", "【miku】初音未来～（32）", None),
    ("雪未来", "snowmiku", "雪未来2017", None),
    ("甘城猫猫", "gancheng", "甘城なつき", None),
    ("猫羽雫", "gancheng2", "甘城なつき/猫羽雫", None),
    ("杂", "za", "杂", None),
    ("小雪从小就很可爱", "xiaoxue", "杂/小雪从小就很可爱", None),
    ("桐生桔梗", "kikyou", "【桐生桔梗】猜猜我尾巴到哪了~（12）", None),
    ("白毛合集", "shiro", "【白毛合集】别进来，会被电的！（16）", None),
    ("风堇合集", "fengjin", "【风堇合集】这也是治疗的一部分喔~（15）", None),
]

# 根目录只保留用户指定的这 2 张
OTHER_KEEP = ["151348352_p0.jpg", "151928382_p0.png"]


def clamp_color(r, g, b):
    h, l, s = colorsys.rgb_to_hls(r / 255.0, g / 255.0, b / 255.0)
    l = max(0.42, min(0.60, l))
    s = max(0.38, min(0.88, s))
    r2, g2, b2 = colorsys.hls_to_rgb(h, l, s)
    return int(r2 * 255), int(g2 * 255), int(b2 * 255)


def lighten(rgb, amount=0.14):
    h, l, s = colorsys.rgb_to_hls(rgb[0] / 255.0, rgb[1] / 255.0, rgb[2] / 255.0)
    l = min(0.72, l + amount)
    s = max(0.3, s - 0.05)
    r2, g2, b2 = colorsys.hls_to_rgb(h, l, s)
    return int(r2 * 255), int(g2 * 255), int(b2 * 255)


def compose_bg(im):
    bg = ImageOps.fit(im, (TW, TH), method=Image.LANCZOS)
    bg = bg.filter(ImageFilter.GaussianBlur(26))
    bg = ImageEnhance.Brightness(bg).enhance(0.5)
    fg = im.copy()
    fg.thumbnail((int(TW * 0.96), int(TH * 0.96)), Image.LANCZOS)
    top = int((TH - fg.height) * 0.18)
    canvas = bg.copy()
    canvas.paste(fg, ((TW - fg.width) // 2, top))
    return canvas


def accent_colors(path):
    im = Image.open(path).convert("RGB").resize((48, 80))
    buckets = {}
    for r, g, b in im.getdata():
        s = r + g + b
        if s < 120 or s > 700:
            continue
        key = (r // 28, g // 28, b // 28)
        if key not in buckets:
            buckets[key] = [0, 0, 0, 0]
        v = buckets[key]
        v[0] += r
        v[1] += g
        v[2] += b
        v[3] += 1
    if not buckets:
        return "#7b6cff", "#a78bfa"
    best = None
    for k, v in buckets.items():
        if v[3] < 16:
            continue
        if best is None or v[3] > best[3]:
            best = (v[0], v[1], v[2], v[3])
    if best is None:
        for k, v in buckets.items():
            if best is None or v[3] > best[3]:
                best = (v[0], v[1], v[2], v[3])
    r = best[0] // best[3]
    g = best[1] // best[3]
    b = best[2] // best[3]
    r, g, b = clamp_color(r, g, b)
    r2, g2, b2 = lighten((r, g, b))
    return "#%02x%02x%02x" % (r, g, b), "#%02x%02x%02x" % (r2, g2, b2)


colors = {}

def emit(path, key):
    im = Image.open(path).convert("RGB")
    compose_bg(im).save(os.path.join(OUT, key + ".webp"), "WEBP", quality=82, method=6)
    a1, a2 = accent_colors(path)
    colors[key] = [a1, a2]


for label, prefix, rel, _ in GROUPS:
    d = os.path.join(SRC, rel.replace("/", os.sep))
    if not os.path.isdir(d):
        print("skip", label)
        continue
    files = sorted(
        f for f in os.listdir(d)
        if os.path.isfile(os.path.join(d, f)) and f.lower().endswith((".png", ".jpg", ".jpeg", ".webp"))
    )
    idx = 0
    for fn in files:
        try:
            emit(os.path.join(d, fn), "%s-%02d" % (prefix, idx + 1))
        except Exception:
            continue
        idx += 1
    print("%-10s %-8s %d" % (label, prefix, idx))

# other 只保留指定 2 张
idx = 0
for fn in OTHER_KEEP:
    p = os.path.join(SRC, fn)
    if not os.path.isfile(p):
        print("missing", fn)
        continue
    idx += 1
    emit(p, "other-%02d" % idx)
print("other", idx)

with open(COLORS_OUT, "w", encoding="utf-8") as f:
    f.write("export const BG_COLORS = " + json.dumps(colors, ensure_ascii=False, indent=2) + "\n")

print("total", len(colors))