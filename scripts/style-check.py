"""做一组 MISSILE228 局部放大前后的对照图，用来判断 4x-AnimeSharp 会不会改画风。"""
import json
import os
import shutil
import time
import urllib.request

from PIL import Image

SHU = r"C:\Users\risay\Desktop\shu"
OUT = r"D:\ICT\coinbox\.tmp-style"
COMFY = "http://127.0.0.1:8188"
COMFY_IN = r"R:/AI_/ComfyUI-aki-v3.2/ComfyUI/input"
COMFY_OUT = r"R:/AI_/ComfyUI-aki-v3.2/ComfyUI/output"

os.makedirs(OUT, exist_ok=True)
src = os.path.join(SHU, "新增", "MISSILE228", "005_429077_94141779_p0.jpg")
im = Image.open(src).convert("RGB")
W, H = im.size
box = (int(W * 0.28), int(H * 0.10), int(W * 0.28) + 420, int(H * 0.10) + 320)
crop = im.crop(box)
crop_path = os.path.join(OUT, "crop.png")
crop.save(crop_path)

name = "stylecheck_in.png"
shutil.copy(crop_path, os.path.join(COMFY_IN, name))
prompt = {
    "1": {"class_type": "LoadImage", "inputs": {"image": name}},
    "3": {"class_type": "UpscaleModelLoader", "inputs": {"model_name": "4x-AnimeSharp.pth"}},
    "17": {"class_type": "ImageUpscaleWithModel", "inputs": {"upscale_model": ["3", 0], "image": ["1", 0]}},
    "6": {"class_type": "SaveImage", "inputs": {"images": ["17", 0], "filename_prefix": "stylecheck"}},
}
req = urllib.request.Request(
    COMFY + "/prompt",
    data=json.dumps({"prompt": prompt}).encode("utf-8"),
    headers={"Content-Type": "application/json"},
)
opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
pid = json.loads(opener.open(req, timeout=30).read())["prompt_id"]
t0 = time.time()
up = None
while time.time() - t0 < 900:
    time.sleep(3)
    h = json.loads(opener.open(COMFY + "/history/" + pid, timeout=15).read())
    if h.get(pid):
        for node in h[pid].get("outputs", {}).values():
            for img in node.get("images", []):
                p = os.path.join(COMFY_OUT, img["filename"])
                if os.path.exists(p):
                    up = p
        break
if not up:
    raise SystemExit("放大失败")

big = Image.open(up).convert("RGB")
big4 = big.resize((crop.width * 4, crop.height * 4), Image.NEAREST)
up_scaled = big.resize((crop.width * 4, crop.height * 4), Image.LANCZOS)

# 左：原图最近邻放大（保留原始像素块）；右：4x-AnimeSharp
cmp = Image.new("RGB", (crop.width * 8 + 20, crop.height * 4), (12, 14, 22))
cmp.paste(big4, (0, 0))
cmp.paste(up_scaled, (crop.width * 4 + 20, 0))
cmp.save(os.path.join(OUT, "compare.png"))

# 放大后按原尺寸还原，看整体观感差异
back = big.resize(crop.size, Image.LANCZOS)
pair = Image.new("RGB", (crop.width * 2 + 16, crop.height), (12, 14, 22))
pair.paste(crop, (0, 0))
pair.paste(back, (crop.width + 16, 0))
pair.save(os.path.join(OUT, "same-size.png"))
print("done", crop.size, big.size)
