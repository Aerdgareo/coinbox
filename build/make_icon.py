from PIL import Image, ImageDraw

S = 512
img = Image.new('RGBA', (S, S), (0, 0, 0, 0))

grad = Image.new('RGB', (S, S))
for y in range(S):
    t = y / (S - 1)
    r = int(123 + (58 - 123) * t)
    g = int(108 + (47 - 108) * t)
    b = int(255 + (143 - 255) * t)
    for x in range(S):
        d = ImageDraw.Draw(grad)
        d.line([(0, y), (S, y)], fill=(r, g, b))

mask = Image.new('L', (S, S), 0)
ImageDraw.Draw(mask).rounded_rectangle([0, 0, S - 1, S - 1], radius=116, fill=255)
img.paste(grad, (0, 0), mask)

d = ImageDraw.Draw(img)

white = (247, 245, 255, 255)
shadow = (38, 28, 92, 120)
ribbon = (123, 108, 255, 255)

d.rounded_rectangle([116, 196, 396, 408], radius=26, fill=shadow)
d.rounded_rectangle([124, 206, 388, 400], radius=24, fill=white)
d.rounded_rectangle([106, 158, 406, 226], radius=22, fill=white)

d.rectangle([236, 158, 276, 400], fill=ribbon)
d.rectangle([106, 178, 406, 196], fill=ribbon)
d.rounded_rectangle([236, 158, 276, 226], radius=8, fill=ribbon)

d.ellipse([196, 118, 256, 178], fill=white)
d.ellipse([256, 118, 316, 178], fill=white)
d.ellipse([222, 142, 256, 176], fill=ribbon)
d.ellipse([256, 142, 290, 176], fill=ribbon)

d.rounded_rectangle([150, 236, 216, 250], radius=7, fill=(216, 210, 255, 255))
d.rounded_rectangle([150, 268, 200, 280], radius=6, fill=(226, 221, 255, 255))

img = img.resize((256, 256), Image.LANCZOS)
img.save('icon.png')
img.save(
    'icon.ico',
    sizes=[(256, 256), (128, 128), (64, 64), (48, 48), (32, 32), (16, 16)],
)
print('icon written')