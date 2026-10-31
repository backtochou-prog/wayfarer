#!/usr/bin/env python3
"""Builds src3d/vortex_assets.js: the two pictures of the VORTEX, the hazard that replaces the crates in the 3D build ("the rondelle with the spiral that absorbs the runner"). Run:
    python3 tools/make_vortex_assets.py [ring picture] [spiral picture]

  ring   = the user's red glass ring (a red-and-black glass lens seen from above, 640 x 640 with alpha: its middle, the "white" hole, is TRANSPARENT). Cut to the circle of the glass (centre (320, 322), radius 316
           of her 640 px picture, feathered 2 px) so that it fits a round disc, the colours bled outward from the opaque pixels (no dark fringe when it is filtered), scaled to 512 px. Nothing else is changed.
  spiral = the user's dark-red spiral on black (1050 x 962): cropped to the circle of radius 455 round the centre of the spiral (485, 505), scaled to 512 px. Her thin outer arms (1 to 3 px) would vanish at the size
           of a disc on the road, so the lines are thickened (3 px at the centre, up to 12 px at the rim) with a soft red glow, and brightened (the hue is hers: crimson), on her black.
  hole   = where the hole of the ring is, in the ring's own coordinates (fractions of the disc radius: centre x, centre z (down the picture is toward the camera), radius of the circle that covers it).
"""
import base64, io, sys
import numpy as np
from PIL import Image

U = '/root/.claude/uploads/65b8bc1c-1985-5345-a2d7-9387f9b1700d/'
RING = sys.argv[1] if len(sys.argv) > 1 else U + '93b68930-image.png'
SPIR = sys.argv[2] if len(sys.argv) > 2 else U + 'a34da819-image.png'
S = 512

def box(a, r):                                                              # box blur (radius r) by integral images
    k = 2 * r + 1; p = np.pad(a, ((r, r), (r, r)) + ((0, 0),) * (a.ndim - 2), mode='edge'); c = p.cumsum(0).cumsum(1); c = np.pad(c, ((1, 0), (1, 0)) + ((0, 0),) * (a.ndim - 2))
    return (c[k:, k:] - c[:-k, k:] - c[k:, :-k] + c[:-k, :-k]) / (k * k)

# ---- the ring
im = np.asarray(Image.open(RING).convert('RGBA')).astype(np.float64); H, W, _ = im.shape
CX, CY, CR = 320.0, 322.0, 316.0
hole = im[..., 3] < 30; ys, xs = np.nonzero(hole); sel = np.hypot(xs - 310, ys - 300) < 290; HX, HY = xs[sel].mean(), ys[sel].mean()
hole_r = 0.0
for ang in range(0, 360, 5):                                                # the largest distance from the hole's centre to its edge (the hole is a little oval)
    t = np.radians(ang); rr = np.arange(0, 400); X = np.clip(np.round(HX + rr * np.cos(t)).astype(int), 0, W - 1); Y = np.clip(np.round(HY - rr * np.sin(t)).astype(int), 0, H - 1)
    hole_r = max(hole_r, float(np.argmax(im[Y, X, 3] > 200)))
yy, xx = np.indices((H, W)); circ = np.clip((CR - np.hypot(xx - CX, yy - CY)) / 2.0 + 0.5, 0, 1)      # the circle of the glass, feathered
a_ = im[..., 3] / 255.0 * circ
rgb = im[..., :3].copy(); m_ = (a_ >= 0.5).astype(np.float64); fill = np.zeros_like(m_)
cur = rgb * m_[..., None]
for _ in range(10):                                                          # colours bled outward from the opaque pixels (the transparent ones keep a neighbour's colour)
    den = box(m_, 1) * 9.0; num = box(cur, 1) * 9.0; new = (m_ < 0.5) & (den > 0.5)
    cur = np.where(new[..., None], num / np.maximum(den[..., None], 1e-6), cur); m_ = np.where(new, 1.0, m_)
rgb = np.where((a_ >= 0.5)[..., None], rgb, cur)
x0, y0 = int(round(CX - CR)), int(round(CY - CR)); sz = int(round(2 * CR))
rgba = np.concatenate([rgb, a_[..., None] * 255.0], axis=2)[y0:y0 + sz, x0:x0 + sz]
ring = Image.fromarray(np.clip(rgba, 0, 255).astype(np.uint8), 'RGBA').resize((S, S), Image.LANCZOS)
hole_js = dict(x=round((HX - CX) / CR, 4), z=round((HY - CY) / CR, 4), r=round((hole_r + 5) / CR, 4))
print('ring: hole centre', round(HX, 1), round(HY, 1), 'radius up to', hole_r, '->', hole_js)
# ---- the spiral
sp = np.asarray(Image.open(SPIR).convert('RGB')).astype(np.float64); h2, w2, _ = sp.shape
SX, SY, SR = 485.0, 505.0, 455.0
red = np.clip((sp[..., 0] - 60.0) / 110.0, 0, 1) * np.clip((90.0 - sp[..., 1]) / 60.0, 0, 1)          # how much of a pixel is spiral line
yy1, xx1 = np.indices(red.shape); rad = np.hypot(xx1 - SX, yy1 - SY) / 455.0                       # the distance from the centre, in radii of the picture
line = red.copy()
for D in (3, 6, 9, 12):                                                      # thickened more the further from the centre (her outer arms are the thinnest): 3 px at the centre, 12 px at the rim
    thick = np.zeros_like(red)
    for dy in range(-D, D + 1):
        for dx in range(-D, D + 1):
            if dx * dx + dy * dy <= D * D: thick = np.maximum(thick, np.roll(np.roll(red, dy, 0), dx, 1))
    line = np.where((rad >= (D - 3) / 12.0 - 0.001) & (rad < D / 12.0 + 0.25), np.maximum(line, thick * 0.95), line) if D == 12 else np.where((rad >= (D - 3) / 12.0) & (rad < (D) / 12.0 + 0.0001 + (0.25 if D == 9 else 0)), np.maximum(line, thick * 0.95), line)
glow = box(line, 10) * 1.6                                                    # a soft red glow round the lines
line = np.maximum(line, np.clip(glow, 0, 0.45))
col = np.array([255.0, 28.0, 66.0])                                          # her crimson, brighter
out = line[..., None] * col[None, None, :]
cx, cy, r = int(SX), int(SY), int(SR)
crop = out[cy - r:cy + r, cx - r:cx + r]; yy2, xx2 = np.indices(crop.shape[:2]); disc = np.clip((r - np.hypot(xx2 - r, yy2 - r)) / 2.0 + 0.5, 0, 1)
crop = crop * disc[..., None]
spiral = Image.fromarray(np.clip(crop, 0, 255).astype(np.uint8), 'RGB').resize((S, S), Image.LANCZOS)
def webp(img, **k): b = io.BytesIO(); img.save(b, 'WEBP', method=6, **k); return base64.b64encode(b.getvalue()).decode()
js = "// The two pictures of the VORTEX (the hazard that replaces the crates in the 3D build), from the user's red glass ring and her dark-red spiral on black: two WebP data URIs (so the game also runs from file://).\n"
js += "// ring = the glass ring cut to its circle, its hole transparent (512 x 512 with alpha); spiral = the spiral cropped to a circle (512 x 512). hole = where the ring's hole is, in fractions of the disc radius.\n"
js += "// Made by tools/make_vortex_assets.py.\n"
js += "const VORTEX_ASSETS = { ring: 'data:image/webp;base64,%s', spiral: 'data:image/webp;base64,%s', hole: %s };\n" % (webp(ring, quality=88, alpha_quality=100), webp(spiral, quality=90), repr(hole_js).replace("'", ''))
open('src3d/vortex_assets.js', 'w').write(js); print('vortex_assets.js', len(js) // 1024, 'KB')
bg = Image.new('RGBA', (S, S), (60, 60, 90, 255)); bg.alpha_composite(ring); prev = Image.new('RGB', (2 * S + 10, S)); prev.paste(bg.convert('RGB'), (0, 0)); prev.paste(spiral, (S + 10, 0))
prev.save('/tmp/claude-0/-root/65b8bc1c-1985-5345-a2d7-9387f9b1700d/scratchpad/vx/assets_preview.png')
