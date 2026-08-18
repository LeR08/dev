"""TYA icon v4 — the line-art illustration the user supplied (person with a
phone, a beer, and a pie-chart speech bubble), redrawn as vector so it can be
rasterised at every size Expo asks for.

Two things the source artwork can't carry unchanged into a launcher icon,
handled here:

- Android masks adaptive icons to a circle (and to squircles, teardrops...)
  and only the middle ~66% is guaranteed visible. The artwork runs
  edge-to-edge, so the foreground layer is scaled into that safe zone rather
  than pasted at full bleed, which would clip the phone and the bubble.
- The background is near-white, so the flat background layer is the same
  lavender as the illustration: the mark keeps its own edge instead of
  dissolving into a light wallpaper.

icon.png and splash-icon.png keep the full composition — they're shown large
and unmasked, which is where this artwork is at its best.
"""

import os

import cairosvg
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "tya-mark.svg")
OUT = HERE
BG = (255, 255, 255)  # the illustration's own background

os.makedirs(OUT, exist_ok=True)


def render(size, transparent):
    """Rasterise the SVG at `size`, optionally dropping the background rect."""
    svg = open(SRC, encoding="utf-8").read()
    if transparent:
        svg = svg.replace('<rect width="1024" height="1024" fill="#FFFFFF"/>', "")
        # The inner fills reference the background colour to punch holes in
        # overlapping strokes; keep them opaque so the shapes stay readable
        # over the adaptive background layer.
    png = cairosvg.svg2png(bytestring=svg.encode(), output_width=size, output_height=size)
    path = os.path.join(HERE, f"_tmp_{size}_{transparent}.png")
    open(path, "wb").write(png)
    return Image.open(path).convert("RGBA")


# --- icon.png: full composition, opaque ---
render(1024, transparent=False).convert("RGB").save(f"{OUT}/icon.png")

# --- splash-icon.png: transparent, shown over the splash background ---
render(1024, transparent=True).save(f"{OUT}/splash-icon.png")

# --- android-icon-background.png: flat lavender ---
Image.new("RGBA", (512, 512), BG + (255,)).save(f"{OUT}/android-icon-background.png")

# --- android-icon-foreground.png: artwork scaled into Android's safe zone ---
SAFE = 0.66
fg = render(512, transparent=True)
scaled = fg.resize((int(512 * SAFE), int(512 * SAFE)), Image.LANCZOS)
canvas = Image.new("RGBA", (512, 512), (0, 0, 0, 0))
canvas.alpha_composite(scaled, ((512 - scaled.width) // 2, (512 - scaled.height) // 2))
canvas.save(f"{OUT}/android-icon-foreground.png")

# --- android-icon-monochrome.png: same geometry, alpha is what the OS uses ---
mono = render(432, transparent=True)
mono_scaled = mono.resize((int(432 * SAFE), int(432 * SAFE)), Image.LANCZOS)
mono_canvas = Image.new("RGBA", (432, 432), (0, 0, 0, 0))
mono_canvas.alpha_composite(mono_scaled, ((432 - mono_scaled.width) // 2, (432 - mono_scaled.height) // 2))
mono_canvas.save(f"{OUT}/android-icon-monochrome.png")

# --- favicon.png ---
render(48, transparent=False).convert("RGB").save(f"{OUT}/favicon.png")

for f in os.listdir(HERE):
    if f.startswith("_tmp_"):
        os.remove(os.path.join(HERE, f))

print("done")
