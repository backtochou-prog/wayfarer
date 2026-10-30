# Builds src3d/zagla_assets.js: ZAGLA, the second character, as a 3D body made from the user's picture of her (front view, cut out, 800 px tall) with
#   - the FRONT texture = the user's picture, only cut out and scaled (its own colours, nothing redrawn);
#   - the BACK texture = the BACK of C.Strawberry (AVATAR_ASSETS.back, the view the chase camera sees) used as the MATERIAL of the back, fitted onto Zagla's shape and recoloured into Zagla's own
#     palette (black, electric violet, magenta, neon green): the strawberry's jacket becomes black, its stripes and target ring neon, its cap violet, its calyx neon green;
#   - the MESH = her silhouette inflated into a volume (a round cross-section from the distance to the edge), in three pieces: the body and the two legs (which swing in the run).
# Run:  python3 tools/make_zagla_assets.py [path of the picture]       (needs Pillow and numpy; writes src3d/zagla_assets.js and docs/screenshots/zagla-textures.jpg)
import base64, io, re, sys, json
import numpy as np
from PIL import Image
SRC = sys.argv[1] if len(sys.argv) > 1 else '/root/.claude/uploads/65b8bc1c-1985-5345-a2d7-9387f9b1700d/e2dd37a4-image.png'
H = 800; STEP = 4; M_PER_PX = 1.9 / H                                     # 1.9 m tall like the strawberry's cards; mesh grid step in texture pixels

# ---- 1. the picture: cut out (it has its own alpha), cropped to its silhouette, scaled to 800 px tall (premultiplied so the edge keeps no halo)
im = Image.open(SRC).convert('RGBA'); a0 = np.array(im)[..., 3]
ys, xs = np.where(a0 > 16); x0, x1, y0, y1 = xs.min() - 6, xs.max() + 7, ys.min() - 6, ys.max() + 7
crop = im.crop((x0, y0, x1, y1)); W = int(round(crop.width * H / crop.height))
c = np.array(crop).astype(np.float32); al = c[..., 3:4] / 255.0; c[..., :3] *= al
pm = Image.fromarray(np.concatenate([c[..., :3], c[..., 3:4]], axis=2).astype(np.float32), mode='RGBA') if False else None
chans = [Image.fromarray(c[..., k]).resize((W, H), Image.LANCZOS) for k in range(4)]
f = np.stack([np.array(ch, dtype=np.float32) for ch in chans], axis=2)
alpha = np.clip(f[..., 3], 0, 255); rgb = np.where(alpha[..., None] > 1, f[..., :3] / np.maximum(alpha[..., None], 1) * 255.0, 0); rgb = np.clip(rgb, 0, 255)
front = np.concatenate([rgb, alpha[..., None]], axis=2).astype(np.uint8)            # W x H x 4
mask = alpha > 40
print('front', W, 'x', H, 'cropped from', crop.size)

# ---- 2. the back of C.Strawberry (its own artwork, in the game) as the material of the back
s = open('src3d/avatar_assets.js').read(); mm = re.search(r"back: \{ w: \d+, h: \d+, mw: [\d.]+, mh: [\d.]+, src: 'data:image/png;base64,([^']+)'", s)
straw = np.array(Image.open(io.BytesIO(base64.b64decode(mm.group(1)))).convert('RGBA')).astype(np.float32)   # 543 x 800
SH, SW = straw.shape[:2]

def edt(m, iters=2):                                                      # distance to the nearest outside pixel (chamfer 3-4, two passes), in pixels
    INF = 1e9; d = np.where(m, INF, 0.0).astype(np.float64); h, w = d.shape
    for y in range(h):
        row = d[y]; up = d[y - 1] if y else None
        for x in range(w):
            v = row[x]
            if v == 0: continue
            if x: v = min(v, row[x - 1] + 3)
            if y:
                v = min(v, up[x] + 3)
                if x: v = min(v, up[x - 1] + 4)
                if x + 1 < w: v = min(v, up[x + 1] + 4)
            row[x] = v
    for y in range(h - 1, -1, -1):
        row = d[y]; dn = d[y + 1] if y + 1 < h else None
        for x in range(w - 1, -1, -1):
            v = row[x]
            if v == 0: continue
            if x + 1 < w: v = min(v, row[x + 1] + 3)
            if dn is not None:
                v = min(v, dn[x] + 3)
                if x + 1 < w: v = min(v, dn[x + 1] + 4)
                if x: v = min(v, dn[x - 1] + 4)
            row[x] = v
    return d / 3.0
dist = edt(mask)

# ---- 3. the BACK texture: the picture mirrored (seen from behind) as the base; inside the body, the strawberry's back fitted onto her shape (rows matched by landmarks, the same scale) and recoloured
def rows(landmarks):                                                       # piecewise-linear map of a row of Zagla (texture px) to a row of the strawberry
    zy = [l[0] for l in landmarks]; sy = [l[1] for l in landmarks]; return lambda y: np.interp(y, zy, sy)
zc = 0.0
body_cols = np.where(mask[int(H * 0.70)])[0]; xc = 0.5 * (body_cols.min() + body_cols.max()) if len(body_cols) else W / 2   # the axis of her body, read on the skirt (the tail on the left and the blade on the right make the bbox, and the rows of the arms, off-centre)
LM = rows([(0, 4), (int(H * .104), 8), (int(H * .33), 170), (int(H * .43), 215), (int(H * .61), 430), (int(H * .777), 545), (int(H * .875), 690), (H, 800)])   # apex of the head, visor, shoulders, skirt top, skirt bottom, shoes
SX = 0.9
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
xm = (W - 1) - xx                                                          # the back view: x mirrored about the middle of the texture
xb = (W - 1) - xc                                                          # her axis, mirrored
sy = LM(yy); sx = SW / 2 + (xm - xb) / SX
sxi = np.clip(sx, 0, SW - 1.001).astype(np.int32); syi = np.clip(sy, 0, SH - 1.001).astype(np.int32)
S = straw[syi, sxi]; Sa = S[..., 3] / 255.0; R_, G_, B_ = S[..., 0] / 255, S[..., 1] / 255, S[..., 2] / 255
mx = np.maximum(np.maximum(R_, G_), B_); mn = np.minimum(np.minimum(R_, G_), B_); V = mx; Sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
dlt = np.maximum(mx - mn, 1e-6)
Hh = np.where(mx == R_, ((G_ - B_) / dlt) % 6, np.where(mx == G_, (B_ - R_) / dlt + 2, (R_ - G_) / dlt + 4)) * 60.0
def lerp(c0, c1, t): t = np.clip(t, 0, 1)[..., None]; return np.array(c0, np.float32) * (1 - t) + np.array(c1, np.float32) * t
BLACK = (4, 0, 10); VIOLET = (72, 0, 255); MAGENTA = (255, 24, 208); GREEN = (0, 255, 64); LIME = (214, 255, 42); PINKW = (255, 150, 255)
out = np.zeros((H, W, 3), np.float32) + np.array(BLACK, np.float32)
dark = V < 0.22
beige = (Sat < 0.34) & (V >= 0.45) & ~dark                                  # the jacket: black with a violet sheen
grey = (Sat < 0.16) & (V >= 0.22) & (V < 0.62)
pink = ((Hh >= 285) & (Hh <= 350)) & (Sat >= 0.25) & ~dark
red = (((Hh < 28) | (Hh > 350)) & (Sat >= 0.4)) & ~dark                     # the cap and the hands: violet, the shine pink-white
green = ((Hh >= 70) & (Hh <= 170) & (Sat >= 0.3)) & ~dark
navy = ((Hh >= 190) & (Hh <= 270) & (Sat >= 0.2)) & ~dark                   # the legs
out = np.where(beige[..., None], lerp(BLACK, (40, 0, 110), (V - 0.45) / 0.55 * 0.55), out)
out = np.where(grey[..., None], lerp((10, 0, 60), VIOLET, (V - 0.22) / 0.4), out)
out = np.where(navy[..., None], lerp(BLACK, (30, 0, 120), V * 0.8), out)
out = np.where(red[..., None], lerp((2, 0, 8), (30, 0, 110), (V - 0.55) * 0.9), out)                         # the cap: her black head with a violet sheen
out = np.where((red & (Sat < 0.5) & (V > 0.9))[..., None], lerp((30, 0, 110), (150, 60, 255), (0.5 - Sat) * 2), out)         # (only the shine of the cap, where it is washed out, turns violet)
out = np.where(pink[..., None], lerp((120, 0, 120), MAGENTA, V * 1.3), out)
out = np.where(green[..., None], lerp((0, 120, 30), GREEN, V * 1.2), out)
out = np.where(dark[..., None], lerp(BLACK, (30, 0, 70), V / 0.22), out)
out = np.where((Sa < 0.12)[..., None], np.array(BLACK, np.float32), out)
# neon: a touch of contrast
out = np.clip(out, 0, 255)

mirror = front[:, ::-1].astype(np.float32)                                  # the picture seen from behind
mrgb = mirror[..., :3]
# her face has no back: the eye ring and the visor are painted out (dark navy of the visor)
body_zone = (yy > H * 0.085) & (yy < H * 0.78)
edge = np.clip((dist[:, ::-1] - 9.0) / 8.0, 0, 1)                           # a rim of her own neon outline stays at the edge of the silhouette (feathered)
# between the shoulders and the skirt only the middle of the back is the strawberry's (her shoulder pads, violet and green, are seen from behind too: they stay hers, mirrored)
shoulder = np.clip((yy - H * 0.42) / 30.0, 0, 1) * np.clip((H * 0.605 - yy) / 30.0, 0, 1)
half = np.where(shoulder > 0, 1.0 - shoulder * (1.0 - 0.33 * W / 1.0 / np.maximum(np.abs(xm - xb), 1) * 0), 1.0)
mid = np.clip((0.118 * W - np.abs(xm - xb)) / 14.0, 0, 1)                      # the middle column (feathered)
zone = 1.0 - shoulder * (1.0 - mid)
wt = (edge * body_zone.astype(np.float32) * zone)[..., None]
back_rgb = mrgb * (1 - wt) + out * wt
back = np.concatenate([back_rgb, mirror[..., 3:4]], axis=2).clip(0, 255).astype(np.uint8)

# ---- 4. the MESH: the silhouette inflated (round cross-section from the distance to the edge), in a grid of STEP px: the body and the two legs
YCUT = int(H * 0.77)                                                        # just under the skirt: the legs start here (they overlap the skirt a little, hidden inside it)
gx = np.arange(0, W, STEP); gy = np.arange(0, H, STEP)
def maxfilter(d, r):
    out2 = d.copy()
    for k in range(1, r + 1):
        out2[:, k:] = np.maximum(out2[:, k:], d[:, :-k]); out2[:, :-k] = np.maximum(out2[:, :-k], d[:, k:])
    o3 = out2.copy()
    for k in range(1, r + 1):
        o3[k:] = np.maximum(o3[k:], out2[:-k]); o3[:-k] = np.maximum(o3[:-k], out2[k:])
    return o3
Rloc = maxfilter(dist, 20)                                                  # (window 41 px; sampled every 2 px below for speed)
def zof(px, py):
    d = dist[py, px]; R = max(Rloc[py, px], d, 1.0); return float(np.sqrt(max(0.0, d * (2 * R - d))))
pieces = []
def comps(region):                                                          # connected components (4-neighbour) of a boolean image
    lab = np.zeros(region.shape, np.int32); n = 0
    for y, x in zip(*np.where(region)):
        if lab[y, x]: continue
        n += 1; st = [(y, x)]; lab[y, x] = n
        while st:
            cy, cx = st.pop()
            for ny, nx in ((cy + 1, cx), (cy - 1, cx), (cy, cx + 1), (cy, cx - 1)):
                if 0 <= ny < region.shape[0] and 0 <= nx < region.shape[1] and region[ny, nx] and not lab[ny, nx]: lab[ny, nx] = n; st.append((ny, nx))
    return lab, n
legreg = mask.copy(); legreg[:YCUT + 10] = False
lab, nl = comps(legreg); legs = []
for k in range(1, nl + 1):
    ysk, xsk = np.where(lab == k)
    if len(ysk) > 600: legs.append((xsk.min(), xsk.max()))
legs.sort(); print('legs', legs)
def piece(name, sel, pivot):                                                # sel: boolean pixel image of the piece
    vin = np.zeros((len(gy), len(gx)), bool)
    for j, y in enumerate(gy):
        for i, x in enumerate(gx): vin[j, i] = sel[y, x] and mask[y, x]
    # rim vertices (a neighbour outside): z = 0, so that the front and the back of the body meet along the silhouette
    idx = -np.ones(vin.shape, np.int32); ij = []; zz = []
    for j in range(vin.shape[0]):
        for i in range(vin.shape[1]):
            if not vin[j, i]: continue
            nb = [vin[j - 1, i] if j else False, vin[j + 1, i] if j + 1 < vin.shape[0] else False, vin[j, i - 1] if i else False, vin[j, i + 1] if i + 1 < vin.shape[1] else False]
            rim = not all(nb); idx[j, i] = len(ij); ij.append((i, j)); zz.append(0.0 if rim else zof(gx[i], gy[j]))
    tris = []
    for j in range(vin.shape[0] - 1):
        for i in range(vin.shape[1] - 1):
            q = [idx[j, i], idx[j, i + 1], idx[j + 1, i + 1], idx[j + 1, i]]
            if all(v >= 0 for v in q): tris += [(q[0], q[1], q[2]), (q[0], q[2], q[3])]
            else:
                ok = [v for v in q if v >= 0]
                if len(ok) == 3: tris.append(tuple(ok))
    print(name, 'verts', len(ij), 'tris', len(tris), 'zmax', max(zz))
    return dict(name=name, pivot=list(pivot), n=len(ij), ij=np.array(ij, np.uint16), z=np.round(np.array(zz) * 8).astype(np.int16), tri=np.array(tris, np.uint16))
body_sel = np.zeros_like(mask); body_sel[:YCUT + 10] = True
pieces.append(piece('body', body_sel, (xc, YCUT)))
for k, (lx0, lx1) in enumerate(legs[:2]):
    sel = np.zeros_like(mask); sel[YCUT - 24:, lx0 - 1:lx1 + 2] = True
    pieces.append(piece('legL' if k == 0 else 'legR', sel, ((lx0 + lx1) / 2, YCUT - 14)))

# ---- 5. write the asset
def b64(arr): return base64.b64encode(arr.tobytes()).decode()
def webp(arr, q=95):
    buf = io.BytesIO(); Image.fromarray(arr, 'RGBA').save(buf, 'WEBP', quality=q, method=6); return buf.getvalue()
fw, bw = webp(front), webp(back)
js = "// ZAGLA, the second character, as a 3D body (made by tools/make_zagla_assets.py from the user's picture of her, front view): `front` = the picture cut out and scaled (its own colours), `back` = the BACK of C.Strawberry\n"
js += "// (AVATAR_ASSETS.back) as the material of the back, fitted onto her shape and recoloured into her palette, `pieces` = her silhouette inflated into a volume (grid of `step` texture px: ij = grid column / row,\n"
js += "// z = depth in 1/8 px, tri = triangles; the back of the body is the front mirrored in z), cut in the body and two legs that swing. Sizes: w x h texture px, `mpp` = metres per texture px (1.9 m tall).\n"
js += "const ZAGLA_ASSETS = " + json.dumps(dict(w=W, h=H, mpp=M_PER_PX, step=STEP, axis=float(xc), pieces=[dict(name=p['name'], pivot=p['pivot'], n=p['n'], ij=b64(p['ij']), z=b64(p['z']), tri=b64(p['tri'])) for p in pieces],
      front='data:image/webp;base64,' + base64.b64encode(fw).decode(), back='data:image/webp;base64,' + base64.b64encode(bw).decode())) + ";\n"
open('src3d/zagla_assets.js', 'w').write(js); print('zagla_assets.js', len(js) // 1024, 'KB (front', len(fw) // 1024, 'KB, back', len(bw) // 1024, 'KB)')
sheet = Image.new('RGB', (W * 2 + 30, H + 20), (90, 100, 120)); fr = Image.fromarray(front, 'RGBA'); bk = Image.fromarray(back, 'RGBA')
sheet.paste(fr, (10, 10), fr); sheet.paste(bk, (W + 20, 10), bk); sheet.save('docs/screenshots/zagla-textures.jpg', quality=88)
