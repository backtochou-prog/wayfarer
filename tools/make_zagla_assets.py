# Builds src3d/zagla_assets.js: ZAGLA, the second character, as a 3D body made from the user's two pictures of her, FRONT and BACK (800 px tall, cut out):
#   - the FRONT texture = the user's front picture, only cut out and scaled (its own colours, nothing redrawn; it has its own alpha);
#   - the BACK texture = the user's back picture (the view the chase camera sees), only cropped and scaled, cut out with the silhouette of the front (the back picture has a white background, and a soft haze at the
#     edge of its torso: where it is white, and along the rim of the silhouette, the front mirrored shows through, so no white fringe is ever seen). The back is the view from behind: it is read mirrored about her body axis;
#   - the MESH = her silhouette inflated into a volume (a round cross-section from the distance to the edge), in three pieces: the body and the two legs (which swing in the run).
#   - THE USER'S OWN EDITS of the two textures (tools/zagla_sheet_edits.png: the sheet docs/screenshots/zagla-textures.jpg, F and B, painted over by the user: the lower torso, the skirt and the boots of the back): wherever the
#     user's sheet differs from the sheet this script makes without them, the user's pixels replace the generated ones (feathered, and never on the rim of the silhouette, where the sheet is blended with its grey ground).
# Run:  python3 tools/make_zagla_assets.py [front picture] [back picture] [edited sheet]       (needs Pillow and numpy; writes src3d/zagla_assets.js and docs/screenshots/zagla-textures.jpg)
import base64, io, sys, json
import numpy as np
from PIL import Image
U = '/root/.claude/uploads/65b8bc1c-1985-5345-a2d7-9387f9b1700d/'
SRC = sys.argv[1] if len(sys.argv) > 1 else U + '4b334d3f-image.png'
SRCB = sys.argv[2] if len(sys.argv) > 2 else U + '900ea59d-image.png'
import os
EDITS = sys.argv[3] if len(sys.argv) > 3 else os.path.join(os.path.dirname(os.path.abspath(__file__)), 'zagla_sheet_edits.png')
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

# ---- 3b. the user's edits of the two textures, taken from her painted-over sheet (the sheet this script makes: F at (10, 10), B at (W + 20, 10) on grey, JPEG 88, 2W + 30 x H + 20)
def sheet_of(fr, bk):
    sh = Image.new('RGB', (W * 2 + 30, H + 20), (90, 100, 120)); a = Image.fromarray(fr, 'RGBA'); b2 = Image.fromarray(bk, 'RGBA'); sh.paste(a, (10, 10), a); sh.paste(b2, (W + 20, 10), b2); return sh
def box(a, r):                                                              # separable box blur, radius r
    k = 2 * r + 1; p = np.pad(a, ((r, r), (0, 0)) if a.ndim == 2 else ((r, r), (0, 0), (0, 0)), mode='edge'); c = np.cumsum(p, axis=0, dtype=np.float64); c = np.concatenate([np.zeros_like(c[:1]), c], axis=0); a = (c[k:] - c[:-k]) / k
    p = np.pad(a, ((0, 0), (r, r)) if a.ndim == 2 else ((0, 0), (r, r), (0, 0)), mode='edge'); c = np.cumsum(p, axis=1, dtype=np.float64); c = np.concatenate([np.zeros_like(c[:, :1]), c], axis=1); return (c[:, k:] - c[:, :-k]) / k
edited = {'front': 0, 'back': 0}
if os.path.exists(EDITS):
    us = Image.open(EDITS).convert('RGBA')
    if us.size != (W * 2 + 30, H + 20): print('the edited sheet is', us.size, 'not', (W * 2 + 30, H + 20), ': its edits are not applied')
    else:
        buf0 = io.BytesIO(); sheet_of(front, back).save(buf0, 'JPEG', quality=88); pre = np.array(Image.open(io.BytesIO(buf0.getvalue())).convert('RGB')).astype(np.float32); ua = np.array(us).astype(np.float32)
        er = (dist >= 3.0)                                                   # the silhouette without its rim (front); the back's is its mirror image
        for key, tex, x0, deep in (('front', front, 10, er), ('back', back, W + 20, er[:, ::-1])):
            up = ua[10:10 + H, x0:x0 + W]; pp = pre[10:10 + H, x0:x0 + W]; dd = np.abs(up[..., :3] - pp).mean(axis=2)
            ok = deep & (up[..., 3] > 200) & (tex[..., 3] > 200)
            ch = box((dd > 30).astype(np.float32), 2) > 0.45                 # a real edit, not the noise of the JPEG: a blob of pixels that changed, not a lone one
            wgt = np.clip(box(box(ch.astype(np.float32), 2), 2) * 1.6, 0, 1) * ok
            tex[..., :3] = np.clip(tex[..., :3] * (1 - wgt[..., None]) + up[..., :3] * wgt[..., None], 0, 255).astype(np.uint8); edited[key] = int((wgt > 0.5).sum())
        print('the user\'s edits: front', edited['front'], 'px, back', edited['back'], 'px')

# ---- 3c. THE BOOTS OF THE BACK ARE TURNED THE OTHER WAY ROUND (her red strokes '\\' on the left boot and '/' on the right one, and 'the feet are turned the wrong way round'): in the front picture the toes of the boots
# point down and OUT; on the back they point down and IN. Each boot of the back texture (the user's own pixels, her lime-spotted boots) is turned about its leg: flipped left to right about the middle of the leg,
# the picture and its silhouette together. The mesh of the back face of each leg is built from this silhouette (the front face keeps the front's).
mb = back[..., 3] > 40; YS = int(H * 0.93); runs = []
xs_ = np.where(mb[YS])[0]
if len(xs_):
    st = xs_[0]; pv = xs_[0]
    for v in xs_[1:]:
        if v != pv + 1: runs.append((st, pv)); st = v
        pv = v
    runs.append((st, pv))
back0 = back.copy(); turned = {}
if len(runs) == 2:
    for kk, (sx0, sx1) in enumerate(runs):
        cs = (sx0 + sx1) / 2.0; wsh = sx1 - sx0 + 1; w0, w1 = max(0, sx0 - 45), min(W, sx1 + 46); y0 = None
        for y in range(YS, H):
            xx = np.where(mb[y, w0:w1])[0]
            if len(xx) and xx.max() - xx.min() + 1 > 1.4 * wsh and y0 is None: y0 = y
        if y0 is None: continue
        ytop = y0 - 8
        for y in range(ytop, H):
            for x in range(w0, w1):
                sx = int(round(2 * cs - x)); back[y, x] = back0[y, sx] if w0 <= sx < w1 else 0
        turned[kk] = (float(cs), int(ytop))
    print('boots of the back turned about their legs:', turned)
else:
    print('boots of the back: expected two legs at row', YS, 'found', runs)

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
def zof(px, py, dm=None, Rm=None):
    dm = dist if dm is None else dm; Rm = Rloc if Rm is None else Rm
    d = dm[py, px]; R = max(Rm[py, px], d, 1.0); return float(np.sqrt(max(0.0, d * (2 * R - d))))
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
def surf(sel, mk, dm, Rm):                                                  # one face of a piece: the grid vertices inside sel & mk, the depth from the distance map dm
    vin = np.zeros((len(gy), len(gx)), bool)
    for j, y in enumerate(gy):
        for i, x in enumerate(gx): vin[j, i] = sel[y, x] and mk[y, x]
    # rim vertices (a neighbour outside): z = 0, so that the front and the back of the body meet along the silhouette
    idx = -np.ones(vin.shape, np.int32); ij = []; zz = []
    for j in range(vin.shape[0]):
        for i in range(vin.shape[1]):
            if not vin[j, i]: continue
            nb = [vin[j - 1, i] if j else False, vin[j + 1, i] if j + 1 < vin.shape[0] else False, vin[j, i - 1] if i else False, vin[j, i + 1] if i + 1 < vin.shape[1] else False]
            rim = not all(nb); idx[j, i] = len(ij); ij.append((i, j)); zz.append(0.0 if rim else zof(gx[i], gy[j], dm, Rm))
    tris = []
    for j in range(vin.shape[0] - 1):
        for i in range(vin.shape[1] - 1):
            q = [idx[j, i], idx[j, i + 1], idx[j + 1, i + 1], idx[j + 1, i]]
            if all(v >= 0 for v in q): tris += [(q[0], q[1], q[2]), (q[0], q[2], q[3])]
            else:
                ok = [v for v in q if v >= 0]
                if len(ok) == 3: tris.append(tuple(ok))
    return dict(n=len(ij), ij=np.array(ij, np.uint16), z=np.round(np.array(zz) * 8).astype(np.int16), tri=np.array(tris, np.uint16), zmax=max(zz) if zz else 0)
def piece(name, sel, pivot, back_face=None):                                 # back_face: (sel in back coordinates, mask, distance, local radius) when the back face has its own silhouette (the legs: the boots seen from behind)
    P = surf(sel, mask, dist, Rloc)
    if back_face is not None: P['b'] = surf(*back_face)
    print(name, 'verts', P['n'], 'tris', len(P['tri']), 'zmax', P['zmax'], '| back face' if back_face is not None else '', P['b']['n'] if back_face is not None else '')
    P.update(name=name, pivot=list(pivot)); return P
body_sel = np.zeros_like(mask); body_sel[:YCUT + 10] = True
pieces.append(piece('body', body_sel, (xc, YCUT)))
mask_b = back[..., 3] > 40; dist_b = edt(mask_b); Rloc_b = maxfilter(dist_b, 20)                  # the silhouette of the back face (in the back texture's coordinates)
for k, (lx0, lx1) in enumerate(legs[:2]):
    sel = np.zeros_like(mask); sel[YCUT - 24:, lx0 - 1:lx1 + 2] = True
    sel_b = np.zeros_like(mask); sel_b[YCUT - 24:, max(0, W - 1 - lx1 - 26):W - 1 - lx0 + 27] = True
    pieces.append(piece('legL' if k == 0 else 'legR', sel, ((lx0 + lx1) / 2, YCUT - 14), (sel_b, mask_b, dist_b, Rloc_b)))

# ---- 5. write the asset
def b64(arr): return base64.b64encode(arr.tobytes()).decode()
def webp(arr, q=95):
    buf = io.BytesIO(); Image.fromarray(arr, 'RGBA').save(buf, 'WEBP', quality=q, method=6); return buf.getvalue()
fw, bw = webp(front), webp(back)
js = "// ZAGLA, the second character, as a 3D body (made by tools/make_zagla_assets.py from the user's pictures of her, front and back, and her own edits of the textures): `front` = her front picture cut out and scaled\n"
js += "// (its own colours), `back` = her back picture, the view from behind (the hood, the rest in the opposite position), `pieces` = her silhouette inflated into a volume (grid of `step` texture px: ij = grid column / row,\n"
js += "// z = depth in 1/8 px, tri = triangles; the back of the body is the front mirrored in z), cut in the body and two legs that swing. Sizes: w x h texture px, `mpp` = metres per texture px (1.9 m tall).\n"
js += "const ZAGLA_ASSETS = " + json.dumps(dict(w=W, h=H, mpp=M_PER_PX, step=STEP, axis=float(xc), pieces=[dict(name=p['name'], pivot=p['pivot'], n=p['n'], ij=b64(p['ij']), z=b64(p['z']), tri=b64(p['tri']), **({'b': dict(n=p['b']['n'], ij=b64(p['b']['ij']), z=b64(p['b']['z']), tri=b64(p['b']['tri']))} if 'b' in p else {})) for p in pieces],
      front='data:image/webp;base64,' + base64.b64encode(fw).decode(), back='data:image/webp;base64,' + base64.b64encode(bw).decode())) + ";\n"
open('src3d/zagla_assets.js', 'w').write(js); print('zagla_assets.js', len(js) // 1024, 'KB (front', len(fw) // 1024, 'KB, back', len(bw) // 1024, 'KB)')
sheet_of(front, back).save('docs/screenshots/zagla-textures.jpg', quality=88)
