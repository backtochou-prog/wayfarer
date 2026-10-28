# Builds src3d/utrecht_assets.js: the Utrecht materials, ONE WebP atlas with alpha cut from seven of the user's street and canal photos (their uploaded pictures are only cropped, scaled and, for the two houses
# whose roofs stood against a sky, cut out along the roofline; never recoloured or redrawn). Run:  python3 tools/make_utrecht_assets.py  (needs Pillow; the pictures' paths are in UP below)
#   h1912  = the house dated 1912 above its shop (cream brick with orange bands, two dormers, a stained-glass arch window, an iron balcony)
#   h1905  = the 1905 art nouveau house above its shop (red brick arches, ANNO 1905, a bay window with an iron balcony, a gable with a crossed finial)
#   hChoor = the brick house of the Choorstraat with its burgundy shopfront and its blue-framed windows
#   shoes  = a shop window: raffia shoes on green herringbone tiles, hanging raffia
#   wArch  = a white facade with tall arched windows on two floors (a canal-side street)
#   shut   = a brick house with white-framed windows and the red and white hourglass shutters of Utrecht
#   scaf   = the Dom tower body under scaffolding, with the red and white Utrecht flag panel
#   and a separate small tile of canal WATER (UTRECHT_WATER, cropped from the first canal photo)
import base64, io, sys
from PIL import Image, ImageDraw, ImageFilter, ImageOps
UP = sys.argv[1] if len(sys.argv) > 1 else '/root/.claude/uploads/65b8bc1c-1985-5345-a2d7-9387f9b1700d/'
F = {'h1912': '4de1e5b3', 'shoes': '4e0b441a', 'hChoor': '99789b07', 'h1905': '5d1f5332', 'wArch': 'fffd8f35', 'shut': '4ecc60e0', 'scaf': '5a5d4c3b', 'water': '217b3efb'}
img = {k: ImageOps.exif_transpose(Image.open(UP + v + '-image.jpg')).convert('RGBA') for k, v in F.items()}
def crop(k, box, w, poly=None):
    c = img[k].crop(box)
    if poly:                                                         # alpha: opaque inside the polygon (crop pixels), transparent in the sky above the roofline
        m = Image.new('L', c.size, 0); ImageDraw.Draw(m).polygon(poly, fill=255); c.putalpha(m.filter(ImageFilter.GaussianBlur(2)))
    return c.resize((w, round(c.height * w / c.width)), Image.LANCZOS)
cells = {}
cells['h1912'] = crop('h1912', (170, 470, 2230, 2545), 540, [(0, 0), (105, 0), (105, 215), (255, 200), (300, 95), (715, 95), (715, 250), (1000, 265), (1310, 335), (1330, 215), (1730, 215), (1750, 330), (1850, 420), (2060, 520), (2060, 2075), (0, 2075)])
cells['shoes'] = crop('shoes', (0, 0, 2268, 2720), 360)
cells['hChoor'] = crop('hChoor', (80, 0, 1900, 3440), 460)
cells['wArch'] = crop('wArch', (850, 150, 1050, 560), 320)
cells['shut'] = crop('shut', (780, 10, 1080, 540), 340)
cells['scaf'] = crop('scaf', (430, 0, 850, 760), 350)
cells['h1905'] = crop('h1905', (430, 800, 1570, 2675), 520, [(0, 330), (330, 300), (380, 250), (520, 60), (540, 0), (610, 0), (630, 50), (780, 200), (800, 240), (970, 200), (985, 90), (1030, 80), (1050, 150), (1075, 30), (1140, 0), (1140, 1875), (0, 1875)])
W = 1024; rows = [['h1912', 'shoes'], ['h1905', 'hChoor'], ['wArch', 'shut', 'scaf']]; y = 0; pos = {}
for r in rows:
    x = 0
    for k in r: pos[k] = (x, y); x += cells[k].width + 4
    y += max(cells[k].height for k in r) + 4
H = y; atlas = Image.new('RGBA', (W, H), (0, 0, 0, 0))
for k, (x, yy) in pos.items(): atlas.paste(cells[k], (x, yy))
buf = io.BytesIO(); atlas.save(buf, 'WEBP', quality=82, method=6); data = base64.b64encode(buf.getvalue()).decode()
out = {k: {'u0': pos[k][0] / W, 'u1': (pos[k][0] + cells[k].width) / W, 'v0': 1 - (pos[k][1] + cells[k].height) / H, 'v1': 1 - pos[k][1] / H, 'ar': cells[k].width / cells[k].height} for k in cells}
js = '// Utrecht materials: ONE WebP atlas with alpha (%d x %d) from four of the user\'s street photos, embedded as a data URI (so the game also runs from file://). Made by tools/make_utrecht_assets.py:\n' % (W, H)
js += '// h1912 / h1905 = two art nouveau houses above their shops, hChoor = the brick house of the Choorstraat, shoes = the raffia shoes in a shop window. Only cropped and scaled (the roofs cut out of the sky).\n'
js += 'const UTRECHT_ASSETS = { ' + ', '.join('%s: { u0: %.5f, u1: %.5f, v0: %.5f, v1: %.5f, ar: %.4f }' % (k, v['u0'], v['u1'], v['v0'], v['v1'], v['ar']) for k, v in out.items())
js += ', w: %d, h: %d, src: \'data:image/webp;base64,%s\' };\n' % (W, H, data)
wt = img['water'].convert('RGB').crop((200, 1280, 820, 1900)).resize((256, 256), Image.LANCZOS); wb = io.BytesIO(); wt.save(wb, 'WEBP', quality=80, method=6)
js += "// the canal water: a 256 x 256 crop of the first canal photo (only cropped and scaled), tiled and mirrored along the canal by the renderer\nconst UTRECHT_WATER = { w: 256, h: 256, src: 'data:image/webp;base64,%s' };\n" % base64.b64encode(wb.getvalue()).decode()
open('src3d/utrecht_assets.js', 'w').write(js); print('water', len(wb.getvalue()) // 1024, 'KB; atlas', W, H, 'webp', len(buf.getvalue()) // 1024, 'KB', {k: round(v['ar'], 3) for k, v in out.items()})
bg = Image.new('RGBA', (W, H), (40, 50, 80, 255)); bg.alpha_composite(atlas); bg.convert('RGB').save('/tmp/claude-0/-root/65b8bc1c-1985-5345-a2d7-9387f9b1700d/scratchpad/utph/atlas_preview.png')
