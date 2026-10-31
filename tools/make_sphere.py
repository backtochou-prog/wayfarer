#!/usr/bin/env python3
"""Completes the user's dotted sphere (a quarter of it was in her picture, 640 x 640, cut by the frame) into a WHOLE sphere, 1024 x 1024 with alpha: tools/make_sphere.py [picture]

Her picture is an orthographic-looking view of a glass-clear sphere (an almost transparent body, alpha 0.08) covered with lime dots (a green core, a yellow-green band, a pink ring, a violet halo), seen so that
one dot is in the middle, with its centre at (219, 235) and the sphere's rim 413 px from it (the right edge and the bottom of the frame touch the rim; the left and the top are beyond the frame). The dots stand about 25.5 degrees
apart. The whole sphere is rebuilt from that: the radial profile of the central dot is measured on her picture (colour and opacity by distance from its centre, up to the violet halo at 82 px = 11.5 degrees), a dot lattice
(rows every 25 degrees of latitude, the dots of a row evenly spread, 360 cos(lat) / 25 of them) is put on the unit sphere, and every pixel of the disc is coloured by the profile at its angular distance from the nearest dot
(so the dots foreshorten by themselves towards the rim, as in her picture). The body is her body (near-white, alpha 0.08), with a lilac rim line. Writes src3d/sphere_assets.js (one WebP with alpha, 1024 x 1024) and
docs/downloads/sphere-dots.png (the whole sphere, 1024 x 1024 PNG).
"""
import base64, io, sys
import numpy as np
from PIL import Image

SRC = sys.argv[1] if len(sys.argv) > 1 else '/root/.claude/uploads/65b8bc1c-1985-5345-a2d7-9387f9b1700d/a31f6dca-image.png'
im = np.asarray(Image.open(SRC).convert('RGBA')).astype(np.float64); a = im[..., 3]; H, W = a.shape
CX0, CY0, R0, ROUT = 218.9, 234.8, 413.0, 82.0                                   # her central dot (centre), the sphere's radius in her picture, the outer radius of a dot (violet halo)
yy, xx = np.indices((H, W)); r = np.hypot(xx - CX0, yy - CY0)
# 1. the profile of the central dot: premultiplied colour and opacity by distance from the centre
NB = 41; rb = np.linspace(0, ROUT * 1.08, NB + 1); prof = np.zeros((NB, 4))
for k in range(NB):
    m = (r >= rb[k]) & (r < rb[k + 1]) & (a > 3) | ((r >= rb[k]) & (r < rb[k + 1]) & (r > 84))     # beyond the halo: the body only
    sel = (r >= rb[k]) & (r < rb[k + 1]); al = a[sel] / 255.0; w = al.sum()
    prof[k, :3] = (im[sel][:, :3] * al[:, None]).sum(0) / max(w, 1e-6); prof[k, 3] = al.mean()
rho_c = (rb[:-1] + rb[1:]) / 2.0 / ROUT
# the body: near white, alpha 0.08 (measured away from the dots)
body = (np.hypot(xx - 215, yy - 235) < 330) & (a < 60) & (a > 3); BODY_RGB = im[body][:, :3].mean(0); BODY_A = a[body].mean() / 255.0
prof[rho_c > 1.0, 3] = 0.0                                                          # outside the halo the dot is nothing (the body shows)
# 2. the lattice on the unit sphere: the view is along +z, the central dot at (0, 0, 1)
D = 25.0; dots = []
for m in range(-3, 4):
    lat = np.radians(m * D); n = max(1, int(round(360.0 * np.cos(lat) / D)))
    for k in range(n): lon = 2 * np.pi * k / n; dots.append([np.cos(lat) * np.sin(lon), np.sin(lat), np.cos(lat) * np.cos(lon)])
dots = np.array(dots); print('dots on the sphere:', len(dots))
# 3. the picture: 1024 x 1024, the sphere of radius 480 in the middle
S, RS = 1024, 480.0; ss = 2                                                           # supersampled 2 x 2 for smooth edges
N = S * ss; v, u = np.indices((N, N)); nx = (u + 0.5 - N / 2) / (RS * ss); ny = -(v + 0.5 - N / 2) / (RS * ss); rr = nx * nx + ny * ny; inside = rr < 1.0
nz = np.sqrt(np.clip(1 - rr, 0, 1)); P = np.stack([nx, ny, nz], axis=-1)[inside]                      # (M, 3)
out = np.zeros((N, N, 4)); M = P.shape[0]; best = np.full(M, -2.0)
for c in dots:
    d = P @ c; best = np.maximum(best, d)
theta = np.arccos(np.clip(best, -1, 1)); rho = theta / np.radians(np.degrees(np.arcsin(ROUT / R0)))          # the angular distance to the nearest dot, in dot radii (the halo's outer radius = 1)
col = np.stack([np.interp(rho, rho_c, prof[:, c]) for c in range(4)], axis=-1)                         # (M, 4): colour, opacity of the dot
dot_a = col[:, 3:4]; body_c = np.array(list(BODY_RGB) + [BODY_A])
rim = np.clip((np.sqrt(rr[inside]) - 0.955) / 0.045, 0, 1)[:, None]                                    # a lilac line along the rim of the glass
b_a = BODY_A + (0.30 - BODY_A) * rim; b_rgb = BODY_RGB[None, :] * (1 - rim) + np.array([190.0, 175.0, 232.0])[None, :] * rim
A = dot_a + b_a * (1 - dot_a); RGB = (col[:, :3] * dot_a + b_rgb * b_a * (1 - dot_a)) / np.maximum(A, 1e-6)
out[inside, :3] = RGB; out[inside, 3] = A[:, 0] * 255.0
# soft anti-aliased edge of the disc (the supersampling does it), then down to S x S
pm = out.copy(); pm[..., :3] *= pm[..., 3:4] / 255.0
pm = pm.reshape(S, ss, S, ss, 4).mean(axis=(1, 3)); al = pm[..., 3:4]; rgb = np.where(al > 0.5, pm[..., :3] / np.maximum(al, 1e-6) * 255.0, 0)
res = np.concatenate([np.clip(rgb, 0, 255), np.clip(al, 0, 255)], axis=2).astype(np.uint8); img = Image.fromarray(res, 'RGBA')
img.save('docs/downloads/sphere-dots.png', optimize=True)
buf = io.BytesIO(); img.save(buf, 'WEBP', quality=92, method=6, alpha_quality=100)
js = "// The user's dotted sphere, COMPLETED (her picture showed a quarter of it): a whole glass sphere with lime dots, 1024 x 1024 with alpha, one WebP embedded as a data URI (so the game also runs from file://).\n"
js += "// Made by tools/make_sphere.py from her picture: the profile of her central dot and her body colour, a dot lattice on the sphere, the dots foreshortening towards the rim by themselves.\n"
js += "const SPHERE_ASSETS = { w: %d, h: %d, ar: 1, src: 'data:image/webp;base64,%s' };\n" % (S, S, base64.b64encode(buf.getvalue()).decode())
open('src3d/sphere_assets.js', 'w').write(js); print('sphere_assets.js', len(js) // 1024, 'KB')
