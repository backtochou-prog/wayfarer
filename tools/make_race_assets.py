# the pictures of the race zone, from the user's drawings (see README "Race zone"): the four speed spirals (black background -> transparent), the brake ring (flat purple -> transparent) and the access sphere
# (already cut out: docs/race/access-sphere.png). One JS file of data URIs (WebP with alpha, 256 px): src3d/race_assets.js. Usage: python3 tools/make_race_assets.py <uploads dir>
import sys, base64, io, numpy as np
from PIL import Image
U = sys.argv[1]
SPIRALS = ['965b44c5', 'eb30652e', 'deec633a', '3b783d55']                     # red, purple, green, lime
RING, RAMP, SPHERE = '8503930b', 'b0acdf89', 'docs/race/access-sphere.png'
REAR = '7195575a'      # the user's material for the BACK of the player's car (none of the three car pictures shows a rear): dark glossy red and black paint with red and blue neon streaks, on white
CARS = {'carSide': '9dd4430e', 'car34': '4b59b77e', 'carFront': 'f312573c', 'carBack': '0b91946f', 'bot34': '014422de', 'botShell': '8aa21757'}      # carBack: the user's view of the BACK of the player's car (the green light bar, the red lines, the blue body and its magenta glow): the piece the chase camera sees      # the user's cars, kept as they are (drawn additively, so their black background disappears on the race's black road)
def uri(im):
    b = io.BytesIO(); im.save(b, 'WEBP', quality=88, method=6); return 'data:image/webp;base64,' + base64.b64encode(b.getvalue()).decode()
AR = {}
def fit_rect(im, n=384):      # the cars, the droid: no padding, so the picture fills its plane in the game and its size is its own (fit() pads to a square, which shrank them inside their plane)
    im = im.copy(); im.thumbnail((n, n), Image.LANCZOS); return im                                 # the proportions of each cut-out, so the game can hang the picture as it is
def fit(im, n=256):
    im = im.copy(); im.thumbnail((n, n), Image.LANCZOS); c = Image.new('RGBA', (n, n), (0, 0, 0, 0)); c.alpha_composite(im, ((n - im.width) // 2, (n - im.height) // 2)); return c
def from_black(im):
    a = np.asarray(im.convert('RGB')).astype(np.float32); m = a.max(axis=2); al = np.clip((m - 16) * 2.4, 0, 255)
    rgb = np.where(al[..., None] > 0, np.clip(a * (255.0 / np.maximum(al, 1))[..., None], 0, 255), 0)
    out = np.dstack([rgb, al]).astype(np.uint8); return Image.fromarray(out, 'RGBA')
def from_key(im, key):
    a = np.asarray(im.convert('RGB')).astype(np.float32); d = np.sqrt(((a - np.array(key, np.float32)) ** 2).sum(axis=2)); al = np.clip((d - 20) * 6, 0, 255)
    out = np.dstack([a, al]).astype(np.uint8); return Image.fromarray(out, 'RGBA')
res = {'spirals': [], 'ring': None, 'ramp': None, 'sphere': None}
import numpy as _np
for s in SPIRALS:
    im = Image.open(f'{U}/{s}-image.png'); bb = from_black(im); bb = bb.crop(bb.getbbox()); res['spirals'].append(uri(fit(bb)))
r = Image.open(f'{U}/{RING}-image.png').convert('RGB'); key = r.getpixel((20, 1100)); rr = from_key(r, key); rr = rr.crop(rr.getbbox()); res['ring'] = uri(fit(rr))
m = Image.open(f'{U}/{RAMP}-image.png').convert('RGBA')                      # the ramp: already on a transparent background, but with a grey shadow round it; keep only what is coloured or bright
import numpy as _np
_a = _np.asarray(m).astype(_np.float32); _rgb, _al = _a[..., :3], _a[..., 3]
_sat = _rgb.max(axis=2) - _rgb.min(axis=2); _keep = _np.clip(_np.maximum(_sat * 4, (_rgb.max(axis=2) - 60) * 3), 0, 255)
m = Image.fromarray(_np.dstack([_rgb, _np.minimum(_al, _keep)]).astype(_np.uint8), 'RGBA'); m = m.crop(m.getbbox())
res['ramp'] = uri(fit(m, 320))
CROP = {'carBack': (430, 650, 2140, 1660)}      # only the car itself: the magenta and blue wings painted round it in the drawing were showing in the game as debris behind the car
for k, cid in CARS.items():
    c = Image.open(f'{U}/{cid}-image.png').convert('RGBA')
    if k in CROP: c = c.crop(CROP[k])
    _a2 = _np.asarray(c).astype(_np.float32); _m2 = _a2[..., :3].max(axis=2)
    c = Image.fromarray(_np.dstack([_a2[..., :3], _np.minimum(_a2[..., 3], _np.clip(_m2 * 6, 0, 255))]).astype(_np.uint8), 'RGBA')
    bb = c.getbbox(); c = c.crop(bb) if bb else c
    AR[k] = round(c.width / c.height, 4)
    res[k] = uri(fit_rect(c, 384) if k in ('carBack', 'car34', 'carSide', 'carFront', 'bot34') else fit(c, 384))
_dr = Image.open(f'{U}/c864b4e4-image.png').convert('RGBA')                 # the user's DROID (the obstacle that runs at the car): it carries its own alpha, keep it as it is
_dr = _dr.crop(_dr.getbbox()); res['droid'] = uri(fit_rect(_dr, 384)); AR['droid'] = round(_dr.width / _dr.height, 4)
# THE ROBOT'S FLANK holds the upper half of its side too. The user circled that upper part (the red lattice and the dark shell) on a copy of the picture (9300573c): it becomes a separate piece, laid on the top of the
# car, and the rest stays the flank. Both are cut from the same canvas, so they share one size and one scale.
from collections import deque
from PIL import ImageFilter
_c = Image.open(f'{U}/9300573c-image.jpg').convert('RGB'); _ca = _np.asarray(_c).astype(int)
_st = (_ca[..., 0] > 150) & (_ca[..., 1] < 95) & (_ca[..., 2] < 95) & (_ca[..., 0] - _ca[..., 1] > 70); _H, _W = _st.shape; _free = ~_st; _rc = _np.zeros((_H, _W), bool); _q = deque()
for _x in range(_W):
    for _y in (0, _H - 1):
        if _free[_y, _x] and not _rc[_y, _x]: _rc[_y, _x] = True; _q.append((_y, _x))
for _y in range(_H):
    for _x in (0, _W - 1):
        if _free[_y, _x] and not _rc[_y, _x]: _rc[_y, _x] = True; _q.append((_y, _x))
while _q:
    _y, _x = _q.popleft()
    for _dy, _dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        _ny, _nx = _y + _dy, _x + _dx
        if 0 <= _ny < _H and 0 <= _nx < _W and _free[_ny, _nx] and not _rc[_ny, _nx]: _rc[_ny, _nx] = True; _q.append((_ny, _nx))
_sd = Image.open(f'{U}/484d20dd-image.png').convert('RGBA'); _sd = _sd.crop(_sd.getbbox())
_mk = Image.fromarray(((~_rc) * 255).astype(_np.uint8)).resize(_sd.size, Image.BILINEAR).filter(ImageFilter.MinFilter(25)).filter(ImageFilter.GaussianBlur(6))      # eroded: the stroke is wide, the true edge is its middle
_mk = _np.asarray(_mk).astype(_np.float32) / 255.0; _sa = _np.asarray(_sd).astype(_np.float32)
for _name, _k in (('botFlankTop', _mk), ('botFlankLow', 1 - _mk)):
    _o = _sa.copy(); _o[..., 3] = _sa[..., 3] * _k
    res[_name] = uri(fit_rect(Image.fromarray(_o.astype(_np.uint8), 'RGBA'), 384))
res['botSide'] = uri(fit_rect(_sd, 512))                       # the whole flank picture, to be WRAPPED over the pod's rounded side and roof
AR['botSide'] = round(_sd.width / _sd.height, 4)
def untint_triangle(im):
    """the user (on the back of the robot's car): 'eliminer la couleur rose sur le triangle et le centre du triangle'. Inside the triangle of the head-on picture (its outline and its middle,
    in fractions of the picture so it works at any size) the magenta is taken out: those pixels keep their light and shade but in the dark blue of the rest of the car. Nothing else changes."""
    a = _np.asarray(im.convert('RGBA')).astype(_np.float32); H, W = a.shape[:2]
    # the triangle (a few pixels wider than its outline), then the larger V the user drew round it ('eliminer l'inutile pour faire un triangle lisse'): the pink sides of the bulb from the triangle's top
    # corners down to the point under it, so the dark part is one smooth triangle
    yy, xx = _np.mgrid[0:H, 0:W]; inside = _np.zeros((H, W), bool)
    for P in ([(0.412 * W, 0.515 * H), (0.596 * W, 0.515 * H), (0.501 * W, 0.80 * H)], [(0.362 * W, 0.515 * H), (0.640 * W, 0.515 * H), (0.501 * W, 0.95 * H)]):
        t = _np.ones((H, W), bool)
        for i in range(3):
            (x1, y1), (x2, y2) = P[i], P[(i + 1) % 3]; t &= ((x2 - x1) * (yy - y1) - (y2 - y1) * (xx - x1)) >= 0
        inside |= t
    for cx in (0.275, 0.725):                                                                      # and the pink arc over each dark 'eye', on both sides ('eliminer ce rose des deux cotes')
        inside |= ((xx / W - cx) / 0.075) ** 2 + ((yy / H - 0.50) / 0.085) ** 2 <= 1
    for cx in (0.395, 0.605):                                                                      # and what is left low down beside the triangle, both sides ('eliminer tout ce qui est rose dans la zone marquee')
        inside |= ((xx / W - cx) / 0.065) ** 2 + ((yy / H - 0.78) / 0.12) ** 2 <= 1
    r, g, b = a[..., 0], a[..., 1], a[..., 2]; pink = inside & (r > g + 25) & (b > g + 5)
    lum = 0.3 * r + 0.59 * g + 0.11 * b
    a[..., 0] = _np.where(pink, lum * 0.22, r); a[..., 1] = _np.where(pink, lum * 0.30, g); a[..., 2] = _np.where(pink, lum * 0.55, b)
    return Image.fromarray(a.clip(0, 255).astype(_np.uint8), 'RGBA')
_pod = Image.open(f'{U}/2f7a0cb6-image.png').convert('RGBA')                 # the user's last picture of the ROBOT's car (the magnetic pod seen head on): it already carries its own alpha, so keep it as it is
_pod = _pod.crop(_pod.getbbox())
_pod = untint_triangle(_pod)                                                    # no pink on the triangle (see untint_triangle)
res['botPod'] = uri(fit_rect(_pod, 384)); AR['botPod'] = round(_pod.width / _pod.height, 4)
_ne = Image.open(f'{U}/2502aa2b-image.png').convert('RGBA'); _ne = _ne.crop(_ne.getbbox())        # BRACK3, the user's NEON of the robot's back (pink light lines, the triangle, the two eyes) on transparency
_pad = Image.new('RGBA', (_ne.width + 16, _ne.height + 16), (0, 0, 0, 0)); _pad.alpha_composite(_ne, (8, 8)); _ne = _pad   # (a clear margin: the projection clamps to the edge, which must be empty)
res['brack3'] = uri(fit_rect(_ne, 768)); AR['brack3'] = round(_ne.width / _ne.height, 4)
rr = Image.open(f'{U}/{REAR}-image.png').convert('RGB')                      # white background out, and the black frame of the drawing with it: keep the painted part
_r = _np.asarray(rr).astype(_np.float32); _white = (_r.min(axis=2) > 170); _black = (_r.max(axis=2) < 26)
_al = _np.where(_white | _black, 0, 255).astype(_np.uint8)
m2 = Image.fromarray(_np.dstack([_r, _al]).astype(_np.uint8), 'RGBA'); bb2 = m2.getbbox(); m2 = m2.crop(bb2) if bb2 else m2
res['rear'] = uri(fit(m2, 384))
res['sphere'] = uri(fit(Image.open(SPHERE).convert('RGBA')))
res['ar'] = AR
open('src3d/race_assets.js', 'w').write('// generated by tools/make_race_assets.py from the user\'s race-zone drawings: four speed spirals (red, purple, green, lime), the brake ring and the access sphere (WebP with alpha, 256 px)\nconst RACE_ASSETS = ' + __import__('json').dumps(res) + ';\n')
print({k: (len(v) if isinstance(v, str) else [len(x) for x in v]) for k, v in res.items()})
