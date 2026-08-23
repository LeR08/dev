"""Derives every icon size Expo asks for from source-logo.png.

source-logo.png is the artwork as supplied — it is the master and is never
edited here. This script only resizes it and lays it out for the formats
Android needs; drop a new file in its place and re-run to change the icon.

    python assets-tya/make-icons.py

The one layout decision, in android-icon-foreground.png: Android masks
adaptive icons to a circle (and to squircles, teardrops...) and only
guarantees the middle ~66% is visible. The artwork runs to the edges of its
square, so it is scaled down into that safe zone rather than pasted at full
bleed, which would cut off the speech bubble and the shoulder. The flat
background layer behind it is the artwork's own white, so the mask never
shows a mismatched sliver.
"""

import os

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "source-logo.png")
SAFE = 0.66
BG = (255, 255, 255)

source = Image.open(SRC).convert("RGB")


def resized(size):
    return source.resize((size, size), Image.LANCZOS)


# --- icon.png / splash-icon.png: the artwork, untouched apart from scale ---
resized(1024).save(os.path.join(HERE, "icon.png"))
resized(1024).save(os.path.join(HERE, "splash-icon.png"))

# --- favicon.png ---
resized(48).save(os.path.join(HERE, "favicon.png"))

# --- android-icon-background.png: flat, matching the artwork's background ---
Image.new("RGB", (512, 512), BG).save(os.path.join(HERE, "android-icon-background.png"))


def safe_zone(canvas_size):
    """The artwork centred inside Android's guaranteed-visible middle."""
    inner = int(canvas_size * SAFE)
    canvas = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    canvas.paste(resized(inner), ((canvas_size - inner) // 2, (canvas_size - inner) // 2))
    return canvas


safe_zone(512).save(os.path.join(HERE, "android-icon-foreground.png"))

# --- monochrome: Android 13+ themed icons recolour by alpha, so the white
# background has to drop out or the whole tile reads as one solid blob. ---
mono_inner = int(432 * SAFE)
art = source.resize((mono_inner, mono_inner), Image.LANCZOS).convert("L")
alpha = art.point(lambda v: 255 - v)  # ink opaque, paper transparent
shape = Image.new("RGBA", (mono_inner, mono_inner), (0, 0, 0, 255))
shape.putalpha(alpha)
mono = Image.new("RGBA", (432, 432), (0, 0, 0, 0))
mono.paste(shape, ((432 - mono_inner) // 2, (432 - mono_inner) // 2), shape)
mono.save(os.path.join(HERE, "android-icon-monochrome.png"))

print("done")
