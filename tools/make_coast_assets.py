# Builds src3d/coast_assets.js: the user's two club panels for the coastal zone, ONE WebP atlas (only scaled; never cropped, recoloured or redrawn). Run:  python3 tools/make_coast_assets.py
#   strawberry = the 'STRAWBERRY WEEKEND' picture (the strawberry man with sunglasses on the beach at sunset, the round badge): the renderer STRETCHES it wide as the backdrop of the terrace of the Strawberry Beach Club
#   anchor     = the 'EL MEDITERRANEOS' sign (a black anchor in a blue and white sea with two suns): the club's sign on a post at the entrance of the terrace
import base64, io, sys
from PIL import Image
UP = sys.argv[1] if len(sys.argv) > 1 else '/root/.claude/uploads/65b8bc1c-1985-5345-a2d7-9387f9b1700d/'
F = {'strawberry': 'c5702371-image.jpg', 'anchor': '211d6298-image.png'}
img = {k: Image.open(UP + v).convert('RGB') for k, v in F.items()}
def scaled(k, w): im = img[k]; return im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
cells = {'strawberry': scaled('strawberry', 768), 'anchor': scaled('anchor', 640)}
W = cells['strawberry'].width + cells['anchor'].width + 4; H = max(c.height for c in cells.values()); atlas = Image.new('RGB', (W, H), (0, 0, 0)); pos = {}; x = 0
for k in ('strawberry', 'anchor'): atlas.paste(cells[k], (x, 0)); pos[k] = x; x += cells[k].width + 4
buf = io.BytesIO(); atlas.save(buf, 'WEBP', quality=86, method=6)
out = {k: {'u0': pos[k] / W, 'u1': (pos[k] + cells[k].width) / W, 'v0': 1 - cells[k].height / H, 'v1': 1.0, 'ar': cells[k].width / cells[k].height} for k in cells}
js = "// The user's two club panels for the coastal zone: ONE WebP atlas (%d x %d) embedded as a data URI (so the game also runs from file://). Made by tools/make_coast_assets.py; the pictures are only scaled.\n" % (W, H)
js += "// strawberry = 'STRAWBERRY WEEKEND' (stretched wide as the backdrop of the Strawberry Beach Club's terrace), anchor = 'EL MEDITERRANEOS' (the club's sign).\n"
js += 'const COAST_ASSETS = { ' + ', '.join('%s: { u0: %.5f, u1: %.5f, v0: %.5f, v1: %.5f, ar: %.4f }' % (k, v['u0'], v['u1'], v['v0'], v['v1'], v['ar']) for k, v in out.items())
js += ", w: %d, h: %d, src: 'data:image/webp;base64,%s' };\n" % (W, H, base64.b64encode(buf.getvalue()).decode())
open('src3d/coast_assets.js', 'w').write(js); print('atlas', W, H, 'webp', len(buf.getvalue()) // 1024, 'KB', {k: round(v['ar'], 3) for k, v in out.items()})
