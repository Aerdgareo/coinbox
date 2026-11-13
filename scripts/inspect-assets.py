import os
import glob
import email
import re

ROOT = r"C:\Users\risay\Desktop\shu"

try:
    from PIL import Image
except Exception as e:
    Image = None
    print("PIL missing:", e)

print("=" * 60)
print("IMAGES")
print("=" * 60)
exts = (".png", ".jpg", ".jpeg", ".avif", ".webp", ".gif")
for dirpath, dirnames, filenames in os.walk(ROOT):
    for fn in sorted(filenames):
        if fn.lower().endswith(exts):
            p = os.path.join(dirpath, fn)
            rel = os.path.relpath(p, ROOT)
            size = os.path.getsize(p) // 1024
            dim = "?"
            if Image:
                try:
                    im = Image.open(p)
                    dim = "%dx%d" % im.size
                except Exception as e:
                    dim = "unreadable"
            print("%-72s %6dKB %s" % (rel, size, dim))

print()
print("=" * 60)
print("MHTML")
print("=" * 60)
for p in glob.glob(os.path.join(ROOT, "*.mhtml")):
    print("\n---", os.path.basename(p))
    try:
        raw = open(p, "rb").read()
        msg = email.message_from_bytes(raw)
        html = ""
        for part in msg.walk():
            if part.get_content_type() == "text/html":
                payload = part.get_payload(decode=True)
                if payload:
                    html += payload.decode("utf-8", "ignore")
        title = re.search(r"<title>(.*?)</title>", html, re.S)
        print("title:", (title.group(1).strip() if title else "?"))
        for key in ("author", "owner", "up_name", "name"):
            m = re.findall(r'"%s"\s*:\s*"([^"]{1,40})"' % key, html)
            if m:
                print(key, ":", list(dict.fromkeys(m))[:6])
        # bilibili uploader patterns
        for pat in (r'"uname"\s*:\s*"([^"]{1,30})"', r"UP主[:：]\s*([^\s<]{1,30})"):
            m = re.findall(pat, html)
            if m:
                print("uname:", list(dict.fromkeys(m))[:6])
        # look for mid / space links
        m = re.findall(r"space\.bilibili\.com/(\d+)", html)
        if m:
            print("space mid:", list(dict.fromkeys(m))[:5])
    except Exception as e:
        print("error:", e)