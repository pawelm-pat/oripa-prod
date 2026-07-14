"""Re-cut the Big Bonanza pack from the original asset with a dark-pixel
cleanup pass so no stray background specks survive, then trim tight."""
from PIL import Image, ImageDraw

SRC = "/Users/pawelmucha/.cursor/projects/Users-pawelmucha-Documents-Repos-repos/assets/image-a0a2b634-85d8-4bd9-8b83-b055545d8fa7.png"
OUT = "public/pack-big-bonanza.png"
SENTINEL = (255, 0, 255)

im = Image.open(SRC).convert("RGB")
w, h = im.size
px = im.load()

# Flood fill the dark background inward from every border pixel.
for x in range(0, w, 8):
    for y in (0, h - 1):
        r, g, b = px[x, y]
        if max(r, g, b) <= 80:
            ImageDraw.floodfill(im, (x, y), SENTINEL, thresh=85)
for y in range(0, h, 8):
    for x in (0, w - 1):
        r, g, b = px[x, y]
        if max(r, g, b) <= 80:
            ImageDraw.floodfill(im, (x, y), SENTINEL, thresh=85)

rgba = im.convert("RGBA")
d = rgba.load()
for y in range(h):
    for x in range(w):
        r, g, b, _ = d[x, y]
        # sentinel (flood-filled bg) OR any leftover very-dark pixel -> clear
        if (r, g, b) == SENTINEL or max(r, g, b) < 26:
            d[x, y] = (0, 0, 0, 0)

bbox = rgba.getbbox()
if bbox:
    rgba = rgba.crop(bbox)
rgba.save(OUT)
print(f"{OUT}: {w}x{h} -> {rgba.size}")
