import json
import os
import re

from PIL import Image

os.chdir(r"D:\ICT\coinbox")
src = open("src/themes.js", encoding="utf-8").read()
groups = re.findall(r"prefix: '([a-z0-9]+)', label: '([^']+)', count: (\d+)", src)
keys = []
for pre, label, cnt in groups:
    for i in range(1, int(cnt) + 1):
        keys.append("%s-%02d" % (pre, i))
print("groups", len(groups), "expected", len(keys))
colors = json.loads(open("src/bg-colors.js", encoding="utf-8").read().split("=", 1)[1].strip().rstrip(";"))
print("缺图", [k for k in keys if not os.path.exists("public/backgrounds/%s.webp" % k)])
print("缺主色", [k for k in keys if k not in colors])
print("多余key", [k for k in colors if k not in keys])
bad = []
for k in keys:
    f = "public/backgrounds/%s.webp" % k
    if os.path.exists(f):
        im = Image.open(f)
        if min(im.size) < 1080:
            bad.append((k, im.size))
print("尺寸不足", bad)
print("目录图片数", len([f for f in os.listdir("public/backgrounds") if f.endswith(".webp")]))
print("总大小MB", round(sum(os.path.getsize(os.path.join("public/backgrounds", f)) for f in os.listdir("public/backgrounds")) / 1048576, 2))
