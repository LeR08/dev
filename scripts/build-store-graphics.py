"""Generates the fixed-size graphics Google Play asks for.

    python scripts/build-store-graphics.py

Both are derived from assets-tya/source-logo.png and the app's own typeface
(Manrope, from node_modules), so the listing looks like the app rather than
like a separate thing made in a hurry.

  store/icon-512.png       the 512x512 icon the listing requires
  store/feature-graphic.png  1024x500, shown at the top of the store page

Play crops the feature graphic on some surfaces, so nothing that matters sits
near the edges.
"""

import os

from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'store')
LOGO = os.path.join(ROOT, 'assets-tya', 'source-logo.png')
FONTS = os.path.join(ROOT, 'node_modules', '@expo-google-fonts', 'manrope')

INK = (28, 26, 23)
MUTED = (110, 103, 95)
BG = (247, 245, 242)          # the app's warm background
ACCENT = (66, 64, 199)        # indigo accent, "strong" in light mode

os.makedirs(OUT, exist_ok=True)


def font(weight, size):
    return ImageFont.truetype(os.path.join(FONTS, weight, f'Manrope_{weight}.ttf'), size)


logo = Image.open(LOGO).convert('RGB')

# --- 512x512 icon -----------------------------------------------------------
logo.resize((512, 512), Image.LANCZOS).save(os.path.join(OUT, 'icon-512.png'))

# --- 1024x500 feature graphic ----------------------------------------------
W, H = 1024, 500
card = Image.new('RGB', (W, H), BG)
draw = ImageDraw.Draw(card)

# The mark, left, inset well away from the crop-prone edges. The artwork has a
# white background of its own, which reads as an accidental box on the app's
# warm ground — so it is deliberately presented as a rounded card, matching the
# radius and hairline border the app uses for its own cards.
mark_size = 300
radius = 34
tile = Image.new('RGB', (mark_size, mark_size), (255, 255, 255))
tile.paste(logo.resize((mark_size, mark_size), Image.LANCZOS), (0, 0))
mask = Image.new('L', (mark_size, mark_size), 0)
ImageDraw.Draw(mask).rounded_rectangle((0, 0, mark_size - 1, mark_size - 1), radius=radius, fill=255)
mark_pos = (70, (H - mark_size) // 2)
card.paste(tile, mark_pos, mask)
draw.rounded_rectangle(
    (mark_pos[0], mark_pos[1], mark_pos[0] + mark_size - 1, mark_pos[1] + mark_size - 1),
    radius=radius, outline=(228, 223, 215), width=2,
)

x = 70 + mark_size + 60
draw.text((x, 150), 'TYA', font=font('800ExtraBold', 92), fill=INK)
draw.text((x, 258), 'Track what you drink.', font=font('600SemiBold', 40), fill=ACCENT)
draw.text((x, 312), 'See what it adds up to.', font=font('600SemiBold', 40), fill=ACCENT)
draw.text((x, 378), 'No judgement. No red warnings.', font=font('500Medium', 27), fill=MUTED)

card.save(os.path.join(OUT, 'feature-graphic.png'))

print('wrote store/icon-512.png and store/feature-graphic.png')
