#!/usr/bin/env python3
"""Registers a back picture of Zagla onto her front picture, so that the two textures fit one body: the back picture is warped (rows, then columns) until the outline of its BODY (the egg of the hood and the
torso, the skirt, the legs: not the thin arms and hair strokes, which are removed by an opening) coincides with the outline of the front's body. Used for the glossy pair of pictures ("Zagla front" / "Zagla le dos"),
whose silhouettes differ a little (the back's skirt is rounder, its arms shorter).

    python3 tools/register_zagla_back.py front.png back.png OUT_front_canvas.png OUT_back_canvas.png [--debug overlay.png] [--identity]

Both outputs are the two pictures placed on the same 2560 x 2560 transparent canvas (what tools/make_zagla_assets.py expects: room on both sides of her axis), the back warped onto the front.
--identity: no warp, the two pictures are only placed on the canvas (for a pair drawn on the same frame, like the latest one: its silhouettes already coincide at 94 %, and the warp would only blur that).
Rows: a piecewise-linear map between the landmarks of the body (the apex of the hood, the bottom of the skirt, the soles); columns: per row, the run of the body of the back is stretched onto the run of the body of the front.
"""
import sys
import numpy as np
from PIL import Image

def box(a, r):                                                   # box mean of radius r along both axes (integral image), 'same' size, edges padded with 0
    k = 2 * r + 1; p = np.pad(a.astype(np.float64), r, mode='constant'); c = p.cumsum(0).cumsum(1); c = np.pad(c, ((1, 0), (1, 0)))
    return (c[k:, k:] - c[:-k, k:] - c[k:, :-k] + c[:-k, :-k]) / (k * k)

def body(alpha, r=40):                                           # the opening of the silhouette by a (2r+1) square: what is thicker than that (no arm blade, no hair stroke)
    m = alpha > 128; er = box(m, r) > 0.999; di = box(er, r) > 0.001; return di & m

def runs(m):                                                     # per row: the longest run of the mask (start, end), NaN where the row is empty
    L = np.full(m.shape[0], np.nan); R = np.full(m.shape[0], np.nan)
    for y in range(m.shape[0]):
        xs = np.nonzero(m[y])[0]
        if len(xs):
            cuts = np.nonzero(np.diff(xs) > 1)[0] + 1; parts = np.split(xs, cuts); p = max(parts, key=len); L[y], R[y] = p[0], p[-1]
    return L, R

def smooth(v, w=41, med=0):                                      # moving median (med rows) then moving average (w rows) over the rows that exist, the gaps filled from their neighbours
    idx = np.nonzero(~np.isnan(v))[0]; v = np.interp(np.arange(len(v)), idx, v[idx])
    if med: p = np.pad(v, med // 2, mode='edge'); v = np.array([np.median(p[i:i + med]) for i in range(len(v))])
    k = np.ones(w) / w; p = np.pad(v, w // 2, mode='edge'); return np.convolve(p, k, mode='valid')

def landmarks(alpha, bd):                                        # apex of the hood, the bottom of the skirt (the widest drop of the width between 62 and 88 % of the height), the soles
    L, R = runs(bd); w = np.where(np.isnan(L), 0, R - L); H = len(w); ys = np.nonzero(w > 40)[0]; apex = ys.min()
    a = (alpha > 128); soles = np.nonzero(a.any(1))[0].max()
    ws = smooth(w.astype(float), 21); d = np.gradient(ws); lo, hi = int(0.62 * H), int(0.88 * H); skirt = lo + int(np.argmin(d[lo:hi]))
    return apex, skirt, soles

def sample(img, xs, ys):                                         # bilinear sample of a premultiplied RGBA float image at float coordinates; outside = transparent
    H, W, _ = img.shape; x0 = np.floor(xs).astype(int); y0 = np.floor(ys).astype(int); fx = (xs - x0)[..., None]; fy = (ys - y0)[..., None]; out = np.zeros(xs.shape + (4,), np.float32)
    def g(yy, xx):
        ok = (xx >= 0) & (xx < W) & (yy >= 0) & (yy < H); v = np.zeros(xx.shape + (4,), np.float32); v[ok] = img[yy[ok], xx[ok]]; return v
    return (g(y0, x0) * (1 - fx) * (1 - fy) + g(y0, x0 + 1) * fx * (1 - fy) + g(y0 + 1, x0) * (1 - fx) * fy + g(y0 + 1, x0 + 1) * fx * fy)

def main():
    fp, bp, of, ob = sys.argv[1:5]; ident = '--identity' in sys.argv; dbg = sys.argv[sys.argv.index('--debug') + 1] if '--debug' in sys.argv else None
    F = Image.open(fp).convert('RGBA'); B = Image.open(bp).convert('RGBA'); assert F.size == B.size, (F.size, B.size)
    fa = np.asarray(F)[..., 3]; ba = np.asarray(B)[..., 3]; fb = body(fa); bb = body(ba); H, W = fa.shape
    if ident: reg = np.asarray(B).copy(); fb = fb; bb = bb
    fL, fR = (smooth(v, 101, 121) for v in runs(fb)); bL, bR = (smooth(v, 101, 121) for v in runs(bb))
    lf = landmarks(fa, fb); lb = landmarks(ba, bb); print('landmarks (apex, skirt bottom, soles): front', lf, 'back', lb)
    yf = np.arange(H, dtype=np.float64); yb = np.interp(yf, lf, lb, left=None, right=None); yb = np.where(yf < lf[0], lb[0] + (yf - lf[0]), yb); yb = np.where(yf > lf[2], lb[2] + (yf - lf[2]), yb)
    # the upper body (hood, torso, skirt): per row, the run of the back's body stretched onto the front's; above the apex the map of the apex row
    ya = np.clip(yb, 0, H - 1); L0 = np.interp(ya, np.arange(H), bL); R0 = np.interp(ya, np.arange(H), bR); sc = (R0 - L0) / np.maximum(fR - fL, 1.0)
    X = np.arange(W, dtype=np.float64)[None, :]; xbA = L0[:, None] + (X - fL[:, None]) * sc[:, None]
    # the legs and boots: one map for the block (its centre and its width, the full silhouette, below the skirt)
    def block(a, y0, y1): xs = np.nonzero(a[y0:y1].any(0))[0]; return xs.min(), xs.max()
    f0, f1 = block(fa > 128, lf[1] + 90, lf[2] - 4); b0, b1 = block(ba > 128, lb[1] + 90, lb[2] - 4); sB = (b1 - b0) / float(f1 - f0)
    xbB = (b0 + b1) / 2.0 + (X - (f0 + f1) / 2.0) * sB
    wgt = np.clip((yf - (lf[1] - 30)) / 60.0, 0, 1); wgt = (wgt * wgt * (3 - 2 * wgt))[:, None]; xb = xbA * (1 - wgt) + xbB * wgt; Yb = np.repeat(yb[:, None], W, axis=1)
    if not ident:
        arr = np.asarray(B).astype(np.float32); arr[..., :3] *= arr[..., 3:4] / 255.0                                             # premultiplied
        out = sample(arr, xb, Yb); a = out[..., 3:4]; rgb = np.where(a > 1, out[..., :3] / np.maximum(a, 1) * 255.0, 0); reg = np.concatenate([np.clip(rgb, 0, 255), np.clip(a, 0, 255)], axis=2).astype(np.uint8)
    # both on one 2560 x 2560 canvas, centred on the front's axis
    ox, oy = (2560 - W) // 2, 65
    for im, path in ((np.asarray(F), of), (reg, ob)):
        cv = Image.new('RGBA', (2560, 2560), (0, 0, 0, 0)); cv.paste(Image.fromarray(im, 'RGBA'), (ox, oy)); cv.save(path)
    ra = reg[..., 3] > 128; iou = (ra & (fa > 128)).sum() / (ra | (fa > 128)).sum(); print('IoU of the silhouettes after the warp: %.3f (before: %.3f)' % (iou, ((ba > 128) & (fa > 128)).sum() / ((ba > 128) | (fa > 128)).sum()))
    iou_b = (body(reg[..., 3]) & fb).sum() / (body(reg[..., 3]) | fb).sum(); print('IoU of the bodies after the warp: %.3f' % iou_b)
    if dbg:
        bg = Image.new('RGBA', (W, H), (90, 90, 90, 255)); bg.alpha_composite(Image.fromarray(reg, 'RGBA')); a2 = np.asarray(bg).copy(); m = fa > 128; e = m & ~box(m, 2).astype(bool) | (m ^ (box(m, 2) > 0.999)) & m
        er = box(m, 3) > 0.999; edge = m & ~er; a2[edge] = [255, 255, 0, 255]; Image.fromarray(a2).resize((W // 2, H // 2)).save(dbg)

main()
