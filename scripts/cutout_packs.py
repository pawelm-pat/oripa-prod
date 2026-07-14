"""Remove the near-black background from pack shots and trim to the pack.

Flood-fills from the image border (only through dark, connected pixels) so
dark areas *inside* the artwork are preserved, then crops to the opaque bounds.
"""
from PIL import Image, ImageDraw
import sys

SENTINEL = (255, 0, 255)  # magenta marker unlikely to appear in art
THRESH = 60               # colour distance for the flood fill
BRIGHT = 70               # only seed the fill from genuinely dark border pixels

FILES = [
    "public/pack-pocket-monsters.png",
    "public/pack-big-bonanza.png",
    "public/pack-collectors-vault.png",
    "public/pack-grand-chase.png",
]


def process(path: str) -> None:
    im = Image.open(path).convert("RGB")
    w, h = im.size

    # Seed points along all four borders.
    seeds = []
    step = 12
    for x in range(0, w, step):
        seeds.append((x, 0))
        seeds.append((x, h - 1))
    for y in range(0, h, step):
        seeds.append((0, y))
        seeds.append((w - 1, y))

    px = im.load()
    for (sx, sy) in seeds:
        r, g, b = px[sx, sy]
        if max(r, g, b) <= BRIGHT:  # only start from dark border pixels
            ImageDraw.floodfill(im, (sx, sy), SENTINEL, thresh=THRESH)

    # Build alpha: sentinel -> transparent, everything else opaque.
    rgba = im.convert("RGBA")
    data = rgba.load()
    for y in range(h):
        for x in range(w):
            r, g, b, _ = data[x, y]
            if (r, g, b) == SENTINEL:
                data[x, y] = (0, 0, 0, 0)

    # Trim to opaque bounds.
    bbox = rgba.getbbox()
    if bbox:
        rgba = rgba.crop(bbox)
    rgba.save(path)
    print(f"{path}: {w}x{h} -> {rgba.size}")


if __name__ == "__main__":
    for f in FILES:
        process(f)
