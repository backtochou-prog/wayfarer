#!/usr/bin/env python3
"""Completes the user's dotted sphere (a quarter of it was in her picture, 640 x 640, cut by the frame) into a WHOLE sphere, 1024 x 1024 with alpha: tools/make_sphere.py [picture]

Her picture is an orthographic-looking view of a glass-clear sphere (an almost transparent body, alpha 0.08) covered with lime dots (a green core, a yellow-green band, a pink ring, a violet halo), seen so that
one dot is in the middle, with its centre at (219, 235) and the sphere's rim 413 px from it (the right edge and the bottom of the frame touch the rim; the left and the top are beyond the frame). The dots stand about 25.5 degrees
apart. The whole sphere is rebuilt from that: the radial profile of the central dot is measured on her picture (colour and opacity by distance from its centre, up to the violet halo at 82 px = 11.5 degrees), a dot lattice
(rows every 25 degrees of latitude, the dots of a row evenly spread, 360 cos(lat) / 25 of them) is put on the unit sphere, and every pixel of the disc is coloured by the profile at its angular distance from the nearest dot
(so the dots foreshorten by themselves towards the rim, as in her picture). The body is her body (near-white, alpha 0.08), with a lilac rim line. Writes docs/downloads/sphere-dots.png (the whole sphere seen from the front, 1024 x 1024 PNG), docs/downloads/sphere-map.png and src3d/sphere_assets.js (the same sphere unrolled\n(equirectangular, 1024 x 512), the texture of the protective sphere of the game: the aura that wraps the runner and its pickup).
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
# 3. the picture: 1024 x 1024, the sphere of radius 480 in the middle (the orthographic view, for the PNG)
def shade(P, rr_len, body_a, rim_on):                                                # colour and alpha of the points P (M, 3) of the unit sphere: the nearest dot's profile over the body
    best = np.full(P.shape[0], -2.0)
    for c in dots: best = np.maximum(best, P @ c)
    theta = np.arccos(np.clip(best, -1, 1)); rho = theta / np.arcsin(ROUT / R0)                 # the angular distance to the nearest dot, in dot radii (the halo's outer radius = 1)
    col = np.stack([np.interp(rho, rho_c, prof[:, c]) for c in range(4)], axis=-1); dot_a = col[:, 3:4]
    if rim_on: rim = np.clip((rr_len - 0.955) / 0.045, 0, 1)[:, None]
    else: rim = np.zeros((P.shape[0], 1))
    b_a = body_a + (0.30 - body_a) * rim; b_rgb = BODY_RGB[None, :] * (1 - rim) + np.array([190.0, 175.0, 232.0])[None, :] * rim
    A = dot_a + b_a * (1 - dot_a); RGB = (col[:, :3] * dot_a + b_rgb * b_a * (1 - dot_a)) / np.maximum(A, 1e-6)
    return RGB, A[:, 0] * 255.0
def to_image(out, S1, S2, ss):
    pm = out.copy(); pm[..., :3] *= pm[..., 3:4] / 255.0
    pm = pm.reshape(S2, ss, S1, ss, 4).mean(axis=(1, 3)); al = pm[..., 3:4]; rgb = np.where(al > 0.5, pm[..., :3] / np.maximum(al, 1e-6) * 255.0, 0)
    return Image.fromarray(np.concatenate([np.clip(rgb, 0, 255), np.clip(al, 0, 255)], axis=2).astype(np.uint8), 'RGBA')
S, RS = 1024, 480.0; ss = 2                                                           # supersampled 2 x 2 for smooth edges
N = S * ss; v, u = np.indices((N, N)); nx = (u + 0.5 - N / 2) / (RS * ss); ny = -(v + 0.5 - N / 2) / (RS * ss); rr = nx * nx + ny * ny; inside = rr < 1.0
nz = np.sqrt(np.clip(1 - rr, 0, 1)); P = np.stack([nx, ny, nz], axis=-1)[inside]
out = np.zeros((N, N, 4)); RGB, A = shade(P, np.sqrt(rr[inside]), BODY_A, True); out[inside, :3] = RGB; out[inside, 3] = A
to_image(out, S, S, ss).save('docs/downloads/sphere-dots.png', optimize=True)
# 4. the SPHERE MAP (equirectangular, 1024 x 512, for a sphere mesh: u = longitude, v = latitude, the poles at the top and the bottom), the texture of the protective sphere (the aura) round the runner and of its pickup:
# the same dots, the body a little more present (alpha 0.14) so that the bubble reads in the game; no rim line (a mesh has its own silhouette)
MW, MH = 1024, 512; v2, u2 = np.indices((MH * ss, MW * ss)); lon = (u2 + 0.5) / (MW * ss) * 2 * np.pi; lat = np.pi / 2 - (v2 + 0.5) / (MH * ss) * np.pi
PM = np.stack([np.cos(lat) * np.sin(lon), np.sin(lat), np.cos(lat) * np.cos(lon)], axis=-1).reshape(-1, 3)
RGB, A = shade(PM, None, 0.14, False); outm = np.zeros((MH * ss, MW * ss, 4)); outm[..., :3] = RGB.reshape(MH * ss, MW * ss, 3); outm[..., 3] = A.reshape(MH * ss, MW * ss)
mimg = to_image(outm, MW, MH, ss); mimg.save('docs/downloads/sphere-map.png', optimize=True)
buf = io.BytesIO(); mimg.save(buf, 'WEBP', quality=82, method=6, alpha_quality=90)
js = "// The user's dotted sphere, COMPLETED and unrolled: the SPHERE MAP (equirectangular, %d x %d with alpha, one WebP embedded as a data URI so the game also runs from file://), the texture of the protective sphere (the aura) that\n" % (MW, MH)
js += "// wraps the runner and of its pickup. Made by tools/make_sphere.py from her picture: the profile of her central dot and her body colour, a lattice of dots on the sphere (the whole sphere, not the quarter she drew).\n"
js += "const SPHERE_ASSETS = { map: { w: %d, h: %d, src: 'data:image/webp;base64,%s' } };\n" % (MW, MH, base64.b64encode(buf.getvalue()).decode())
open('src3d/sphere_assets.js', 'w').write(js); print('sphere_assets.js', len(js) // 1024, 'KB')
