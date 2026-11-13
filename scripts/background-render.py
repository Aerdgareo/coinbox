"""按原图重制背景素材。

规则（不再一律压到 720）：
  - 原图短边 >= 1080：直接原图重排到 1080x1920 画布，像素是真的；
  - 1000 <= 短边 < 1080：Lanczos 补到 1080（差 8% 以内，肉眼无差，不浪费 AI）；
  - 短边 < 1000：先用 4x-AnimeSharp 放大，再重排（真正的「太小才放大」）；
  - 已经是高清成品的（congyu-04）保持原样。

用法:
  py -3 scripts/background-render.py a   # 快速档：原图够大的直接重排（不依赖 ComfyUI）
  py -3 scripts/background-render.py c   # 补差档：短边 1000~1079，Lanczos 补足
  py -3 scripts/background-render.py b   # AI 档：短边 <1000，4x-AnimeSharp 放大后重排

素材与原图的对应关系存在 scripts/background-source-map.json（按图像相似度匹配生成，
因为源目录后来加过文件，按顺序编号会错位）。换画布尺寸时改 TW/TH 后重跑 a/c/b。
"""
import json
import os
import shutil
import sys
import time
import urllib.request

from PIL import Image, ImageEnhance, ImageFilter, ImageOps

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "public", "backgrounds")
UP_DIR = r"C:\Users\risay\Desktop\shu\_upscaled\src"
COMFY = "http://127.0.0.1:8188"
COMFY_IN = r"R:/AI_/ComfyUI-aki-v3.2/ComfyUI/input"
COMFY_OUT = r"R:/AI_/ComfyUI-aki-v3.2/ComfyUI/output"
TW, TH = 1080, 1920
Q = 82
KEEP = {"congyu-04"}


def compose(im):
    bg = ImageOps.fit(im, (TW, TH), method=Image.LANCZOS).filter(ImageFilter.GaussianBlur(39))
    bg = ImageEnhance.Brightness(bg).enhance(0.5)
    fg = im.copy()
    fg.thumbnail((int(TW * 0.96), int(TH * 0.96)), Image.LANCZOS)
    top = int((TH - fg.height) * 0.18)
    bg.paste(fg, ((TW - fg.width) // 2, top))
    return bg


def load_src(p):
    im = Image.open(p)
    im = ImageOps.exif_transpose(im).convert("RGB")
    return im


def upscale_via_comfy(key, src):
    """4x-AnimeSharp 放大，结果缓存在 shu/_upscaled/src/<key>_4x.png。"""
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
    while time.time() - t0 < 900:
        time.sleep(3)
        h = json.loads(opener.open(COMFY + "/history/" + pid, timeout=15).read())
        if h.get(pid):
            outs = h[pid].get("outputs", {})
            for node in outs.values():
                for img in node.get("images", []):
                    p = os.path.join(COMFY_OUT, img["filename"])
                    if os.path.exists(p):
                        shutil.copy(p, dst)
                        return dst
            raise RuntimeError("找不到输出图 " + key)
    raise RuntimeError("超时 " + key)


def main():
    phase = (sys.argv[1] if len(sys.argv) > 1 else "a").lower()
    if phase not in ("a", "b", "c"):
        raise SystemExit("用法: py -3 scripts/background-render.py [a|c|b]")
    mapping = json.load(open(os.path.join(ROOT, "scripts", "background-source-map.json"), encoding="utf-8"))
    done, skipped = 0, []
    for key in sorted(mapping):
        if key in KEEP:
            continue
        src = mapping[key]["src"]
        sw, sh = Image.open(src).size
        short = min(sw, sh)
        if phase == "a" and short < 1000:
            continue
        if phase == "b" and short >= 1000:
            continue
        if phase == "c" and not (1000 <= short < 1080):
            continue
        try:
            if short < 1000:
                use = upscale_via_comfy(key, src)
            else:
                use = src
            im = load_src(use)
            if min(im.size) < 1080:
                # 差得很少（8% 以内）时用 Lanczos 补足，没必要走模型
                k = 1080.0 / min(im.size)
                im = im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)
            t = time.time()
            img = compose(im)
            img.save(os.path.join(OUT, key + ".webp"), "WEBP", quality=Q, method=6)
            done += 1
            print("%-14s 源短边%-5d 用时%4.1fs" % (key, short, time.time() - t), flush=True)
        except Exception as e:
            print("FAIL", key, e, flush=True)
    print("完成 %d 张；跳过 %s" % (done, skipped))


if __name__ == "__main__":
    main()
