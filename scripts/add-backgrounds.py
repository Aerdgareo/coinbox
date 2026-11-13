"""把 `shu/新增` 里的素材并入项目背景库（追加式，不改动既有 key）。

规则与 background-render.py 一致：
  - 短边 >= 1080：原图直接重排（真实细节）
  - 1000 <= 短边 < 1080：Lanczos 补足（差 8% 以内，不动用 AI）
  - 短边 < 1000：先 4x-AnimeSharp 放大，再重排

用法:
  py -3 scripts/add-backgrounds.py
"""
import json
import os
import shutil
import time
import urllib.request

from PIL import Image, ImageEnhance, ImageFilter, ImageOps

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "public", "backgrounds")
COLORS_JS = os.path.join(ROOT, "src", "bg-colors.js")
UP_DIR = r"C:\Users\risay\Desktop\shu\_upscaled\src"
SHU = r"C:\Users\risay\Desktop\shu"
COMFY = "http://127.0.0.1:8188"
COMFY_IN = r"R:/AI_/ComfyUI-aki-v3.2/ComfyUI/input"
COMFY_OUT = r"R:/AI_/ComfyUI-aki-v3.2/ComfyUI/output"
TW, TH = 1080, 1920
Q = 82

NEW = r"C:\Users\risay\Desktop\shu\新增"


def p(*parts):
    return os.path.join(*parts)


# key -> 源文件。顺序即分组内展示顺序。
JOBS = [
    # 初音未来（追加到已有 miku 分组，01~04 保持不动）
    ("miku-05", p(NEW, "初音未来", "787153.jpg")),
    ("miku-06", p(NEW, "初音未来", "9ecb99a2cf18fba198907a79261d5a2d.jpg")),
    ("miku-07", p(NEW, "初音未来", "illustration-long-hair-anime-anime-girls-blue-hair-blue-eyes-Vocaloid-Hatsune-Miku-mythology-screenshot-computer-wallpaper-fictional-character-35306.jpg")),
    ("miku-08", p(NEW, "初音未来", "m1000x1000.jpg")),
    ("miku-09", p(NEW, "初音未来", "深海少女.jpg")),
    # MISSILE228
    ("missile-01", p(NEW, "MISSILE228", "005_429077_94141779_p0.jpg")),
    ("missile-02", p(NEW, "MISSILE228", "017_429077_93131740_p1.jpg")),
    ("missile-03", p(NEW, "MISSILE228", "023_429077_91019930_p0.jpg")),
    ("missile-04", p(NEW, "MISSILE228", "045_429077_85995104_p0.jpg")),
    ("missile-05", p(NEW, "MISSILE228", "050_429077_84227943_p0.jpg")),
    ("missile-06", p(NEW, "MISSILE228", "062_429077_83708256_p3.jpg")),
    # Unicorn
    ("unicorn-01", p(NEW, "Unicorn", "Unicorn.(Azur.Lane).full.2596012.jpg")),
    ("unicorn-02", p(NEW, "Unicorn", "Unicorn (3).png")),
    ("unicorn-03", p(NEW, "Unicorn", "Unicorn (4).png")),
    # ホロライブ
    ("holo-01", p(NEW, "ホロライブ", "00000001.jpg")),
    ("holo-02", p(NEW, "ホロライブ", "00000007.jpg")),
    ("holo-03", p(NEW, "ホロライブ", "00000009.jpg")),
    # 椎野せら
    ("shino-01", p(NEW, "椎野せら", "1.png")),
    ("shino-02", p(NEW, "椎野せら", "5.png")),
    ("shino-03", p(NEW, "椎野せら", "6.png")),
    ("shino-04", p(NEW, "椎野せら", "7.png")),
    # 其他：原「杂」7 张并入（other-01/02 已占用）
    ("other-03", p(SHU, "杂", "1762667900656.png")),
    ("other-04", p(SHU, "杂", "1762667915920.png")),
    ("other-05", p(SHU, "杂", "1782399907718.jpg")),
    ("other-06", p(SHU, "杂", "1782400003764.jpg")),
    ("other-07", p(SHU, "杂", "@0kizakura.jpg")),
    ("other-08", p(SHU, "杂", "IMG_1794223241805.jpg")),
    ("other-09", p(SHU, "杂", "pid：144068201.png")),
    # 其他：新增根目录未分类 3 张
    ("other-10", p(NEW, "2025-05-30-1110902.jpeg")),
    ("other-11", p(NEW, "941038.png")),
    ("other-12", p(NEW, "Hakurei.Reimu.full.1801219.jpg")),
]


def compose(im):
    bg = ImageOps.fit(im, (TW, TH), method=Image.LANCZOS).filter(ImageFilter.GaussianBlur(39))
    bg = ImageEnhance.Brightness(bg).enhance(0.5)
    fg = im.copy()
    fg.thumbnail((int(TW * 0.96), int(TH * 0.96)), Image.LANCZOS)
    top = int((TH - fg.height) * 0.18)
    bg.paste(fg, ((TW - fg.width) // 2, top))
    return bg


def load_src(path):
    im = ImageOps.exif_transpose(Image.open(path))
    if im.mode in ("RGBA", "LA", "P"):
        im = im.convert("RGBA")
        flat = Image.new("RGB", im.size, (255, 255, 255))
        flat.paste(im, mask=im.getchannel("A"))
        return flat
    return im.convert("RGB")


def upscale_via_comfy(key, src):
    os.makedirs(UP_DIR, exist_ok=True)
    dst = os.path.join(UP_DIR, key + "_4x.png")
    if os.path.exists(dst):
        return dst
    ext = os.path.splitext(src)[1].lower() or ".png"
    name = key + "_in" + ext
    shutil.copy(src, os.path.join(COMFY_IN, name))
    prompt = {
        "1": {"class_type": "LoadImage", "inputs": {"image": name}},
        "3": {"class_type": "UpscaleModelLoader", "inputs": {"model_name": "4x-AnimeSharp.pth"}},
        "17": {"class_type": "ImageUpscaleWithModel", "inputs": {"upscale_model": ["3", 0], "image": ["1", 0]}},
        "6": {"class_type": "SaveImage", "inputs": {"images": ["17", 0], "filename_prefix": "up_" + key}},
    }
    req = urllib.request.Request(
        COMFY + "/prompt",
        data=json.dumps({"prompt": prompt}).encode("utf-8"),
        headers={"Content-Type": "application/json"},
    )
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
    pid = json.loads(opener.open(req, timeout=30).read())["prompt_id"]
    t0 = time.time()
    while time.time() - t0 < 1200:
        time.sleep(3)
        h = json.loads(opener.open(COMFY + "/history/" + pid, timeout=15).read())
        if h.get(pid):
            for node in h[pid].get("outputs", {}).values():
                for img in node.get("images", []):
                    src_out = os.path.join(COMFY_OUT, img["filename"])
                    if os.path.exists(src_out):
                        shutil.copy(src_out, dst)
                        return dst
            raise RuntimeError("找不到输出图 " + key)
    raise RuntimeError("超时 " + key)


def accent_colors(path):
    import colorsys

    def clamp(r, g, b):
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

    im = load_src(path).resize((48, 80))
    buckets = {}
    for r, g, b in im.getdata():
        s = r + g + b
        if s < 120 or s > 700:
            continue
        key = (r // 28, g // 28, b // 28)
        buckets.setdefault(key, [0, 0, 0, 0])
        v = buckets[key]
        v[0] += r
        v[1] += g
        v[2] += b
        v[3] += 1
    if not buckets:
        return ["#7b6cff", "#a78bfa"]
    best = None
    for v in buckets.values():
        if v[3] < 16:
            continue
        if best is None or v[3] > best[3]:
            best = v
    if best is None:
        best = max(buckets.values(), key=lambda v: v[3])
    r, g, b = clamp(best[0] // best[3], best[1] // best[3], best[2] // best[3])
    r2, g2, b2 = lighten((r, g, b))
    return ["#%02x%02x%02x" % (r, g, b), "#%02x%02x%02x" % (r2, g2, b2)]


def load_colors():
    raw = open(COLORS_JS, encoding="utf-8").read()
    body = raw.split("=", 1)[1].strip().rstrip(";")
    return json.loads(body)


def main():
    colors = load_colors()
    mapping = json.load(open(os.path.join(ROOT, "scripts", "background-source-map.json"), encoding="utf-8"))
    for key, src in JOBS:
        if not os.path.isfile(src):
            print("MISSING", key, src, flush=True)
            continue
        sw, sh = Image.open(src).size
        short = min(sw, sh)
        t = time.time()
        if short < 1000:
            use = upscale_via_comfy(key, src)
            tier = "4x"
        else:
            use = src
            tier = "lanczos" if short < 1080 else "direct"
        im = load_src(use)
        if min(im.size) < 1080:
            k = 1080.0 / min(im.size)
            im = im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)
        compose(im).save(os.path.join(OUT, key + ".webp"), "WEBP", quality=Q, method=6)
        colors[key] = accent_colors(use)
        mapping[key] = {"src": src, "short": short, "tier": tier}
        print("%-12s %5dx%-5d %-7s %5.1fs" % (key, sw, sh, tier, time.time() - t), flush=True)

    with open(COLORS_JS, "w", encoding="utf-8") as f:
        f.write("export const BG_COLORS = " + json.dumps(colors, ensure_ascii=False, indent=2) + "\n")
    with open(os.path.join(ROOT, "scripts", "background-source-map.json"), "w", encoding="utf-8") as f:
        json.dump(mapping, f, ensure_ascii=False, indent=1)
    print("total keys", len(colors))


if __name__ == "__main__":
    main()
