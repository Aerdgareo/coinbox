import os
import shutil
from PIL import Image, ImageDraw

SRC = r"C:\Users\risay\Desktop\shu\改_151928382_p0.png"
S = 512

os.makedirs("build", exist_ok=True)
if os.path.exists("build/icon.png") and not os.path.exists("build/icon-old.png"):
    shutil.copy("build/icon.png", "build/icon-old.png")

im = Image.open(SRC).convert("RGB")
w, h = im.size
if w != h:
    side = min(w, h)
    left = (w - side) // 2
    top = (h - side) // 2
    im = im.crop((left, top, left + side, top + side))

main = im.resize((S, S), Image.LANCZOS)
main.save("build/icon.png")
main.save(
    "build/icon.ico",
    sizes=[(256, 256), (128, 128), (64, 64), (48, 48), (32, 32), (16, 16)],
)

AND = os.path.join("android", "app", "src", "main", "res")
DENS = {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}
for name, px in DENS.items():
    folder = os.path.join(AND, "mipmap-" + name)
    if not os.path.isdir(folder):
        continue
    icon = main.resize((px, px), Image.LANCZOS)
    icon.save(os.path.join(folder, "ic_launcher.png"))
    m = Image.new("L", (px, px), 0)
    ImageDraw.Draw(m).ellipse([0, 0, px - 1, px - 1], fill=255)
    rnd = Image.new("RGBA", (px, px), (0, 0, 0, 0))
    rnd.paste(icon, (0, 0), m)
    rnd.save(os.path.join(folder, "ic_launcher_round.png"))

print("icon replaced, source", (w, h))