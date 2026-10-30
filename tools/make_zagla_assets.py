# Builds src3d/zagla_assets.js: ZAGLA, the second character, as a 3D body made from the user's two pictures of her, FRONT and BACK (800 px tall, cut out):
#   - the FRONT texture = the user's front picture, only cut out and scaled (its own colours, nothing redrawn; it has its own alpha);
#   - the BACK texture = the user's back picture (the view the chase camera sees), only cropped and scaled, cut out with the silhouette of the front (the back picture has a white background, and a soft haze at the
#     edge of its torso: where it is white, and along the rim of the silhouette, the front mirrored shows through, so no white fringe is ever seen). The back is the view from behind: it is read mirrored about her body axis;
#   - the MESH = her silhouette inflated into a volume (a round cross-section from the distance to the edge), in three pieces: the body and the two legs (which swing in the run).
# Run:  python3 tools/make_zagla_assets.py [front picture] [back picture]       (needs Pillow and numpy; writes src3d/zagla_assets.js and docs/screenshots/zagla-textures.jpg)
import base64, io, sys, json
import numpy as np
from PIL import Image
U = '/root/.claude/uploads/65b8bc1c-1985-5345-a2d7-9387f9b1700d/'
SRC = sys.argv[1] if len(sys.argv) > 1 else U + '4b334d3f-image.png'
SRCB = sys.argv[2] if len(sys.argv) > 2 else U + '900ea59d-image.png'
H = 800; STEP = 4; M_PER_PX = 1.9 / H                                     # 1.9 m tall like the strawberry's cards; mesh grid step in texture pixels

# ---- 1. the front picture: cut out (it has its own alpha), cropped to its silhouette, scaled to 800 px tall (premultiplied so the edge keeps no halo)
im = Image.open(SRC).convert('RGBA'); a0 = np.array(im)[..., 3]
ys, xs = np.where(a0 > 16); x0, x1, y0, y1 = xs.min() - 6, xs.max() + 7, ys.min() - 6, ys.max() + 7
crop = im.crop((x0, y0, x1, y1)); W = int(round(crop.width * H / crop.height))
c = np.array(crop).astype(np.float32); al = c[..., 3:4] / 255.0; c[..., :3] *= al
chans = [Image.fromarray(c[..., k]).resize((W, H), Image.LANCZOS) for k in range(4)]
f = np.stack([np.array(ch, dtype=np.float32) for ch in chans], axis=2)
alpha = np.clip(f[..., 3], 0, 255); rgb = np.where(alpha[..., None] > 1, f[..., :3] / np.maximum(alpha[..., None], 1) * 255.0, 0); rgb = np.clip(rgb, 0, 255)
front = np.concatenate([rgb, alpha[..., None]], axis=2).astype(np.uint8)            # W x H x 4
mask = alpha > 40
print('front', W, 'x', H, 'cropped from', crop.size, 'at', (x0, y0, x1, y1))
# the axis of her body in the picture (read on the skirt: the arms make the bbox, and the rows of the arms, off-centre)
sk = np.where(a0[int(y0 + 0.70 * (y1 - y0))] > 16)[0]; XA = 0.5 * (sk.min() + sk.max())
xc = (XA - x0) * W / (x1 - x0)                                              # the same axis in texture px

def edt(m):                                                               # distance to the nearest outside pixel (chamfer 3-4, two passes), in pixels
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

# ---- 2. the back picture: the window of the picture that is the MIRROR of the front window about her axis (so that the back view lines up with the mesh), scaled alike; read as it is (no flip: it is the view from behind)
bk = Image.open(SRCB).convert('RGB'); bx0, bx1 = int(round(2 * XA - x1)), int(round(2 * XA - x0))
assert bx0 >= 0 and bx1 <= bk.width, (bx0, bx1, bk.width)
back_px = np.array(bk.crop((bx0, y0, bx1, y1)).resize((W, H), Image.LANCZOS)).astype(np.float32)
# THE BACK OF ZAGLA IS A HOOD (her words): the head and the torso of her back picture (the black pointed hood, its black V edge, the green and yellow pattern of the cloak, the skirt) are the back as she drew it; the REST of
# the picture (the arms and their cuffs, the strokes of her hair, the legs and the boots) is in the OPPOSITE position, as in a real view from behind: what is on the left in the front is on the right in the back (the
# violet cuff on the right, the green one on the left). Her picture draws those parts on the same side as in the front, so outside the hood / torso block the picture is flipped about her axis.
xb = W - xc                                                                 # her axis in the back window (the window is the mirror of the front's about the axis)
core = dist[:, ::-1] >= 12.0                                                # deep inside the silhouette: the egg of her body (not her thin hair strokes, arms and ankles)
for _ in range(16):                                                         # grown by 16 px back to the rim of the egg
    g = core.copy(); g[1:] |= core[:-1]; g[:-1] |= core[1:]; g[:, 1:] |= core[:, :-1]; g[:, :-1] |= core[:, 1:]; core = g
core &= mask[:, ::-1]
cols = np.clip(np.round(2 * xb - np.arange(W)).astype(int), 0, W - 1)
back_px = np.where(core[..., None], back_px, back_px[:, cols])
mirror = front[:, ::-1].astype(np.float32)                                  # the front seen from behind: the fallback of the back
# ... except the BOOTS: from behind a boot is a heel, not the pink toe of the front picture (that would put the front's feet on her back: the feet would be the wrong way round). Her back picture draws them as dark
# green heels; where it is white or at the rim, the fallback below the ankles is the dark of those heels (darker toward the soles), never the front's pink and blue.
YB = int(H * 0.86)
heel = back_px[YB:][(back_px[YB:].min(axis=2) < 150)]; dk = heel.mean(axis=0) if len(heel) else np.array([20, 40, 28], np.float32)
dk = np.minimum(dk, 70.0)
tt = np.clip((np.arange(H)[:, None] - YB) / float(H - YB), 0, 1)[..., None]                                  # 0 at the ankle, 1 at the soles
shoe = (dk * (1 - 0.6 * tt) + np.array([18, 0, 40], np.float32) * 0.6 * tt)[:, None, :] if False else None
fall = mirror[..., :3].copy()
band = np.clip((np.arange(H)[:, None] - (YB - 10)) / 10.0, 0, 1)[..., None]                                    # a short blend at the ankle
heelc = dk[None, None, :] * (1 - 0.6 * tt) + np.array([18, 0, 40], np.float32)[None, None, :] * 0.6 * tt
fall = fall * (1 - band) + np.broadcast_to(heelc, fall.shape) * band
inside = mask[:, ::-1]; dback = dist[:, ::-1]
white = np.clip((back_px.min(axis=2) - 205.0) / 40.0, 0, 1)                 # the back picture's white background and haze
rim = np.clip((12.0 - dback) / 8.0, 0, 1)                                   # a rim of the front's outline stays at the edge of the silhouette
k = np.maximum(white, rim)[..., None]
back_rgb = back_px * (1 - k) + fall * k
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
