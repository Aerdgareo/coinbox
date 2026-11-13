import math
import os
from PIL import Image, ImageDraw

S = 512
SS = 2
size = S * SS

img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
d = ImageDraw.Draw(img)

grad = Image.new("RGB", (size, size))
gd = ImageDraw.Draw(grad)
for y in range(size):
    t = y / (size - 1)
    r = int(38 + (118 - 38) * t)
    g = int(22 + (96 - 22) * t)
    b = int(82 + (245 - 82) * t)
    gd.line([(0, y), (size, y)], fill=(r, g, b))

mask = Image.new("L", (size, size), 0)
ImageDraw.Draw(mask).rounded_rectangle([0, 0, size - 1, size - 1], radius=int(size * 0.22), fill=255)
img.paste(grad, (0, 0), mask)

d = ImageDraw.Draw(img)

HAIR = (62, 42, 108, 255)
HAIR2 = (82, 56, 134, 255)
SKIN = (255, 228, 212, 255)
GOLD = (255, 214, 74, 255)
GOLD2 = (255, 176, 60, 255)
BLUSH = (255, 150, 176, 110)

# 后发
d.ellipse([92 * SS, 44 * SS, 420 * SS, 410 * SS], fill=HAIR)
d.ellipse([86 * SS, 170 * SS, 176 * SS, 430 * SS], fill=HAIR2)
d.ellipse([336 * SS, 170 * SS, 426 * SS, 430 * SS], fill=HAIR2)

# 脸
d.ellipse([142 * SS, 128 * SS, 370 * SS, 392 * SS], fill=SKIN)

# 刘海
d.pieslice([100 * SS, 36 * SS, 412 * SS, 300 * SS], 180, 360, fill=HAIR)
d.pieslice([128 * SS, 96 * SS, 260 * SS, 250 * SS], 200, 340, fill=HAIR2)
d.pieslice([252 * SS, 96 * SS, 384 * SS, 250 * SS], 200, 340, fill=HAIR2)

# 耳朵
d.ellipse([128 * SS, 214 * SS, 156 * SS, 262 * SS], fill=SKIN)
d.ellipse([356 * SS, 214 * SS, 384 * SS, 262 * SS], fill=SKIN)

# 眼睛：金色星芒
def star(cx, cy, r, inner=0.32):
    pts = []
    for i in range(8):
        ang = math.pi * i / 4 - math.pi / 2
        rr = r if i % 2 == 0 else r * inner
        pts.append((cx + math.cos(ang) * rr, cy + math.sin(ang) * rr))
    return pts

for cx in (206, 306):
    # 外发光
    d.polygon(star(cx * SS, 248 * SS, 44 * SS), fill=(255, 214, 74, 60))
    d.polygon(star(cx * SS, 248 * SS, 34 * SS), fill=GOLD)
    d.ellipse([(cx - 12) * SS, (248 - 12) * SS, (cx + 12) * SS, (248 + 12) * SS], fill=(255, 255, 255, 255))
    d.ellipse([(cx - 7) * SS, (248 - 7) * SS, (cx + 7) * SS, (248 + 7) * SS], fill=GOLD2)

# 腮红
d.ellipse([156 * SS, 294 * SS, 198 * SS, 312 * SS], fill=BLUSH)
d.ellipse([314 * SS, 294 * SS, 356 * SS, 312 * SS], fill=BLUSH)

# 嘴
d.arc([238 * SS, 296 * SS, 274 * SS, 332 * SS], 20, 160, fill=(186, 104, 96, 255), width=5 * SS)

# 右下角金币
d.ellipse([368 * SS, 360 * SS, 462 * SS, 454 * SS], fill=GOLD, outline=(255, 255, 255, 190), width=5 * SS)
d.ellipse([388 * SS, 380 * SS, 442 * SS, 434 * SS], outline=GOLD2, width=6 * SS)
d.line([(415 * SS, 392 * SS), (415 * SS, 422 * SS)], fill=GOLD2, width=6 * SS)
d.line([(403 * SS, 400 * SS), (427 * SS, 400 * SS)], fill=GOLD2, width=5 * SS)
d.line([(403 * SS, 414 * SS), (427 * SS, 414 * SS)], fill=GOLD2, width=5 * SS)

img = img.resize((S, S), Image.LANCZOS)

os.makedirs("build", exist_ok=True)
img.save("build/icon.png")
img.save(
    "build/icon.ico",
    sizes=[(256, 256), (128, 128), (64, 64), (48, 48), (32, 32), (16, 16)],
)

# Android 各密度
AND = os.path.join("android", "app", "src", "main", "res")
DENS = {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}
for name, px in DENS.items():
    folder = os.path.join(AND, "mipmap-" + name)
    if not os.path.isdir(folder):
        continue
    icon = img.resize((px, px), Image.LANCZOS)
    icon.save(os.path.join(folder, "ic_launcher.png"))
    # 圆形版本
    m = Image.new("L", (px, px), 0)
    ImageDraw.Draw(m).ellipse([0, 0, px - 1, px - 1], fill=255)
    rnd = Image.new("RGBA", (px, px), (0, 0, 0, 0))
    rnd.paste(icon, (0, 0), m)
    rnd.save(os.path.join(folder, "ic_launcher_round.png"))

print("icon written")