# Builds src3d/parasol_assets.js: the user's red and cream SUNBURST picture (rays from a centre), the canopy of the giant beach parasols of the coast. ONE WebP: only CROPPED to a square round the centre of
# the rays (so that the picture can be wound onto a cone seen from above without stretching it) and scaled down; never recoloured or redrawn. Run:
#   python3 tools/make_parasol_assets.py [path of the picture]
import base64, io, sys
from PIL import Image
SRC = sys.argv[1] if len(sys.argv) > 1 else '/root/.claude/uploads/65b8bc1c-1985-5345-a2d7-9387f9b1700d/b818e364-image.png'
im = Image.open(SRC).convert('RGBA'); CX, CY = 525, 481                       # the point the rays come from, measured on the 1050 x 962 picture
half = min(CX, CY, im.width - CX, im.height - CY); sq = im.crop((CX - half, CY - half, CX + half, CY + half)); W = 512; sm = sq.resize((W, W), Image.LANCZOS)
buf = io.BytesIO(); sm.save(buf, 'WEBP', quality=92, method=6)
js = "// The user's red and cream sunburst picture, the canopy of the giant beach parasols: ONE WebP (%d x %d), cropped to the square (%d px) round the centre of its rays and scaled down from %d x %d, nothing else\n" % (W, W, 2 * half, im.width, im.height)
js += "// changed, embedded as a data URI (so the game also runs from file://). Made by tools/make_parasol_assets.py.\n"
js += "const PARASOL_ASSETS = { w: %d, h: %d, src: 'data:image/webp;base64,%s' };\n" % (W, W, base64.b64encode(buf.getvalue()).decode())
open('src3d/parasol_assets.js', 'w').write(js); print('parasol', W, 'crop', 2 * half, 'webp', len(buf.getvalue()) // 1024, 'KB')
