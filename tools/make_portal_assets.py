# Builds src3d/portal_assets.js: the user's STARGATE picture (concentric pink-red neon rings round a white flare, on black), the door that every passage between two zones goes through. ONE WebP
# (only scaled down from 4200 x 3420; never cropped, recoloured or redrawn). The game shows it with additive blending, so its black adds nothing and only the light is seen. Run:
#   python3 tools/make_portal_assets.py [path of the picture]
import base64, io, sys
from PIL import Image
SRC = sys.argv[1] if len(sys.argv) > 1 else '/root/.claude/uploads/65b8bc1c-1985-5345-a2d7-9387f9b1700d/c53ff97d-image.png'
im = Image.open(SRC).convert('RGBA'); W = 1024; H = round(im.height * W / im.width); sm = im.resize((W, H), Image.LANCZOS)
buf = io.BytesIO(); sm.save(buf, 'WEBP', quality=90, method=6, alpha_quality=100)
js = "// The user's STARGATE picture (pink-red neon rings round a white flare on black), the door of every passage between two zones: ONE WebP (%d x %d, scaled down from %d x %d, nothing else changed) embedded as a data URI\n" % (W, H, im.width, im.height)
js += "// (so the game also runs from file://). Made by tools/make_portal_assets.py. `ar` = width / height of the picture, kept as it is.\n"
js += "const PORTAL_ASSETS = { w: %d, h: %d, ar: %.4f, src: 'data:image/webp;base64,%s' };\n" % (W, H, im.width / im.height, base64.b64encode(buf.getvalue()).decode())
open('src3d/portal_assets.js', 'w').write(js); print('portal', W, H, 'webp', len(buf.getvalue()) // 1024, 'KB', 'ar', round(im.width / im.height, 4))
