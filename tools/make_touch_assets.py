#!/usr/bin/env python3
"""Builds src/touch_assets.js: the art of the on-screen touch buttons, from the user's neon ring picture (tools/touch_ring.png: green, pink and lilac rings in a purple cog, 1280 x 1280 with alpha). Run:
    python3 tools/make_touch_assets.py [picture]

The picture is cropped to the cog (a square round its bounding box, a few pixels of margin) and scaled, with premultiplied alpha so that no halo is left on its edge, to the overlay's own pixel grid (the
overlay is 320 x 180 canvas pixels): ONE 64 x 42 PNG sheet, a 42 x 42 face for the four big buttons (steer left / right, jump, slide) at (0, 0) and a 22 x 22 face for the pause button at (42, 0).
(The first version was 34 and 18 px; the buttons were made a little bigger: 42 and 22.) The arrow or pause symbol is drawn over it by Renderer.drawTouch. Nothing else is changed in the picture.
"""
import base64, io, sys, os
import numpy as np
from PIL import Image

SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), 'touch_ring.png')
BIG, SMALL = 42, 22
im = Image.open(SRC).convert('RGBA'); a = np.asarray(im)[..., 3] > 200                                  # (the picture has a few stray specks round the cog: only rows and columns with at least 12 opaque pixels count)
cols = np.nonzero(a.sum(0) >= 12)[0]; rows = np.nonzero(a.sum(1) >= 12)[0]; xs, ys = cols, rows
cx, cy = (xs.min() + xs.max()) / 2.0, (ys.min() + ys.max()) / 2.0; half = max(xs.max() - xs.min(), ys.max() - ys.min()) / 2.0 + 6
box = (int(round(cx - half)), int(round(cy - half)), int(round(cx + half)), int(round(cy + half))); crop = im.crop(box); print('cog bbox', xs.min(), ys.min(), xs.max(), ys.max(), '-> crop', box)
def face(n):                                                              # premultiplied resize, then back to straight alpha
    c = np.asarray(crop).astype(np.float64); c[..., :3] *= c[..., 3:4] / 255.0
    ch = [np.asarray(Image.fromarray(c[..., k]).resize((n, n), Image.LANCZOS), dtype=np.float64) for k in range(4)]
    al = np.clip(ch[3], 0, 255); rgb = np.where(al[..., None] > 1, np.stack(ch[:3], axis=2) / np.maximum(al[..., None], 1) * 255.0, 0)
    return Image.fromarray(np.concatenate([np.clip(rgb, 0, 255), al[..., None]], axis=2).astype(np.uint8), 'RGBA')
sheet = Image.new('RGBA', (BIG + SMALL, BIG), (0, 0, 0, 0)); sheet.paste(face(BIG), (0, 0)); sheet.paste(face(SMALL), (BIG, 0))
HI = 256; hb = io.BytesIO(); face(HI).save(hb, 'WEBP', quality=92, method=6, alpha_quality=100)         # the SMOOTH face: 256 x 256, drawn by the smooth touch layer at the device's resolution
buf = io.BytesIO(); sheet.save(buf, 'PNG', optimize=True)
js = "// The touch-button art: the user's neon ring picture (green / pink / lilac rings in a purple cog), cut out and scaled to the overlay's pixel grid, embedded as a data URI.\n"
js += "// One %d x %d sheet: a %d x %d face for the four big buttons (steer left / right, jump, slide) at (0, 0) and a %d x %d face for the pause button at (%d, 0). Made by tools/make_touch_assets.py.\n" % (BIG + SMALL, BIG, BIG, BIG, SMALL, SMALL, BIG)
js += "// hi = the same picture at 256 x 256 (WebP with alpha) for the SMOOTH layer (canvas #touch, drawn at the device's resolution, anti-aliased); the pixel sheet above is the fallback.\n"
js += "const TOUCH_ART = { src: 'data:image/png;base64,%s', big: { x: 0, y: 0, w: %d, h: %d }, small: { x: %d, y: 0, w: %d, h: %d }, hi: { src: 'data:image/webp;base64,%s', w: %d, h: %d } };\n" % (base64.b64encode(buf.getvalue()).decode(), BIG, BIG, BIG, SMALL, SMALL, base64.b64encode(hb.getvalue()).decode(), HI, HI)
open(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'src', 'touch_assets.js'), 'w').write(js); print('touch_assets.js', len(js), 'bytes, sheet', sheet.size)
sheet.resize((sheet.width * 8, sheet.height * 8), Image.NEAREST).save('/tmp/claude-0/-root/65b8bc1c-1985-5345-a2d7-9387f9b1700d/scratchpad/touch_sheet_x8.png')
