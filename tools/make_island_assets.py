# Builds src3d/island_assets.js: the user's two photos kept for the places that fill the empty lots of the island, ONE WebP atlas (scaled; the cafe photo, whose lower part is only floor, is cropped to its upper part;
# never recoloured or redrawn). The pool and the cove photos were removed at the user's request. Run:  python3 tools/make_island_assets.py [folder of the uploads]
#   fruit = the fruit stall (strawberries, apricots, cherries, oranges, custard apples in wooden crates, with hand-written price boards): only the part ABOVE the line the user drew under the stall (the
#           bench and the crates; the pavement is cut away with that line, as transparency), it is the FRONT OF THE FRUIT SHOP, reframed as a square to fill its square front   -> coastFruit
#   cafe  = the table on the beach terrace (a candle and an orange juice with a pink straw, black rattan chairs, a white parasol with a green flag, the sea)   -> coastCafe
import base64, io, sys
import numpy as np
from PIL import Image, ImageOps
UP = sys.argv[1] if len(sys.argv) > 1 else '/root/.claude/uploads/65b8bc1c-1985-5345-a2d7-9387f9b1700d/'
F = {'fruit': '4049b876-image.jpg', 'cafe': 'e87e8b3c-image.jpg'}
img = {k: ImageOps.exif_transpose(Image.open(UP + v)).convert('RGBA') for k, v in F.items()}               # the phone photos are stored sideways with an orientation tag
CROP = {'cafe': 0.825}                                                                         # keep the top part of the picture (the fraction of its height): the table, not the floor; the pool, not the dark foreground
for k, f in CROP.items(): im = img[k]; img[k] = im.crop((0, 0, im.width, round(im.height * f)))
# the fruit shop: the line the user drew under the stall on the 972 x 2000 view of the photo (x, y of its points); everything below it is the pavement and is made transparent
LINE = [(0, 1410), (60, 1362), (150, 1312), (250, 1275), (350, 1250), (480, 1232), (540, 1208), (600, 1192), (660, 1170), (720, 1151), (780, 1126), (840, 1099), (900, 1064), (972, 1030)]
im = img['fruit']; f = im.width / 972.0; top = int(max(y for _, y in LINE) * f) + 4; a = np.asarray(im.crop((0, 0, im.width, top)).convert('RGBA')).copy()
cut = np.interp(np.arange(im.width) / f, [x for x, _ in LINE], [y for _, y in LINE]) * f - 6          # the line, in pixels of the full photo, a little above it so that no red stroke remains
for x in range(im.width):
    y0 = int(cut[x]); a[y0:, x, 3] = 0; a[y0:, x, :3] = a[y0 - 3, x, :3]                           # transparent below the line, the colour of the edge underneath (no grey fringe when the picture is filtered)
SQ = int(1240 * f)                                                                               # the bottom of the square, a little above the lowest point of the line (the left of the bench), so that little of it is transparent
img['fruit'] = Image.fromarray(a, 'RGBA').crop((0, SQ - im.width, im.width, SQ))                         # reframed as a SQUARE (the width of the photo) to fill the square front of the shop
H = 800; cells = {k: img[k].resize((round(im.width * H / im.height), H), Image.LANCZOS) for k, im in img.items()}
order = ['fruit', 'cafe']; W = sum(cells[k].width for k in order) + 4 * (len(order) - 1); atlas = Image.new('RGBA', (W, H), (0, 0, 0, 0)); pos = {}; x = 0
for k in order: atlas.paste(cells[k], (x, 0)); pos[k] = x; x += cells[k].width + 4
buf = io.BytesIO(); atlas.save(buf, 'WEBP', quality=84, method=6, alpha_quality=100)
out = {k: {'u0': pos[k] / W, 'u1': (pos[k] + cells[k].width) / W, 'v0': 0.0, 'v1': 1.0, 'ar': cells[k].width / cells[k].height} for k in order}
js = "// The user's two photos kept for the places that fill the empty lots of the island (the fruit shop and the beach cafe table): ONE WebP atlas (%d x %d) embedded as a data URI (so the game\n" % (W, H)
js += "// also runs from file://). Made by tools/make_island_assets.py; the pictures are only scaled (the cafe photo is cropped to its upper part: the lower part is floor; the fruit photo is cut along the line the user drew under the stall, transparent below it).\n"
js += 'const ISLAND_ASSETS = { ' + ', '.join('%s: { u0: %.5f, u1: %.5f, v0: %.5f, v1: %.5f, ar: %.4f }' % (k, v['u0'], v['u1'], v['v0'], v['v1'], v['ar']) for k, v in out.items())
js += ", w: %d, h: %d, src: 'data:image/webp;base64,%s' };\n" % (W, H, base64.b64encode(buf.getvalue()).decode())
open('src3d/island_assets.js', 'w').write(js); print('atlas', W, H, 'webp', len(buf.getvalue()) // 1024, 'KB', {k: round(v['ar'], 3) for k, v in out.items()})
