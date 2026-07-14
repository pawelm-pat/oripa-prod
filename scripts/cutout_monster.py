"""Chroma-key the flat green background off the generated monster mascot.
Flood-fills the connected green border region to transparent, then removes any
leftover green spill/fringe, and trims to the creature's bounds."""
from PIL import Image, ImageDraw

SRC = "/Users/pawelmucha/.cursor/projects/Users-pawelmucha-Documents-Repos-repos/assets/monster-pokemon.png"
OUT = "public/monster-pokemon.png"
SENTINEL = (255, 0, 255)

im = Image.open(SRC).convert("RGB")
w, h = im.size
px = im.load()

# Flood fill inward from every border pixel using that pixel's own colour.
step = 6
for x in range(0, w, step):
    ImageDraw.floodfill(im, (x, 0), SENTINEL, thresh=95)
    ImageDraw.floodfill(im, (x, h - 1), SENTINEL, thresh=95)
for y in range(0, h, step):
    ImageDraw.floodfill(im, (0, y), SENTINEL, thresh=95)
    ImageDraw.floodfill(im, (w - 1, y), SENTINEL, thresh=95)

rgba = im.convert("RGBA")
d = rgba.load()
for y in range(h):
    for x in range(w):
        r, g, b, _ = d[x, y]
        # sentinel (flood-filled bg) OR residual pure-green spill -> transparent.
        greeny = g > 90 and g > r * 1.35 and g > b * 1.35
        if (r, g, b) == SENTINEL or greeny:
            d[x, y] = (0, 0, 0, 0)

bbox = rgba.getbbox()
if bbox:
    rgba = rgba.crop(bbox)
rgba.save(OUT)
print(f"{OUT}: {w}x{h} -> {rgba.size}")
