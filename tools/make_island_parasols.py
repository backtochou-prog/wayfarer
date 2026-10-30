# Builds src3d/island_parasol_assets.js: the user's recoloured SWIRL pictures, the canopies of the parasols of the island, ONE WebP atlas (3 x 3 cells of 256 px). Each picture is only CROPPED to the square round the
# pole of its swirl (so that it can be wound onto a cone seen from above, the swirl running down the canopy) and scaled down; never recoloured or redrawn. The red ones that look all red (the thin cream
# lines on red) are not used: the island's parasols are the ones that do not appear all red. Run:  python3 tools/make_island_parasols.py [folder of the uploads]
#   0 red pinwheel (red and cream, wide swirls)   1 teal pinwheel on black   2 teal pinwheel on dark green   3 magenta pinwheel on black
#   4 green spiral on black   5 purple spiral   6 lime spiral   7 brown spiral   8 crimson spiral
import base64, io, sys
from PIL import Image
UP = sys.argv[1] if len(sys.argv) > 1 else '/root/.claude/uploads/65b8bc1c-1985-5345-a2d7-9387f9b1700d/'
PIN = (459, 457); SPI = (498, 470)                              # the pole of the pinwheels and the centre of the spirals, measured on the 1050 x 962 pictures
F = [('69f647b2', PIN), ('ecf26340', PIN), ('95161fc0', PIN), ('b714a7aa', PIN), ('bc4aaac0', SPI), ('a4ed7dd3', SPI), ('3448e417', SPI), ('0e0af046', SPI), ('f441558e', SPI)]
C, COLS = 256, 3; atlas = Image.new('RGB', (C * COLS, C * COLS), (0, 0, 0))
for k, (f, (cx, cy)) in enumerate(F):
    im = Image.open(UP + f + '-image.png').convert('RGB'); half = min(cx, cy, im.width - cx, im.height - cy)
    atlas.paste(im.crop((cx - half, cy - half, cx + half, cy + half)).resize((C, C), Image.LANCZOS), ((k % COLS) * C, (k // COLS) * C))
buf = io.BytesIO(); atlas.save(buf, 'WEBP', quality=90, method=6)
js = "// The user's recoloured swirl pictures, the canopies of the parasols of the island: ONE WebP atlas (%d x %d, 3 x 3 cells of %d px) embedded as a data URI (so the game also runs from file://). Made by\n" % (C * COLS, C * COLS, C)
js += "// tools/make_island_parasols.py; each picture is only cropped to the square round the pole of its swirl and scaled. 0 red pinwheel, 1 teal pinwheel, 2 teal on dark green, 3 magenta, 4 green spiral, 5 purple, 6 lime, 7 brown, 8 crimson.\n"
js += "const ISLAND_PARASOLS = { n: %d, cols: %d, cell: %d, w: %d, h: %d, src: 'data:image/webp;base64,%s' };\n" % (len(F), COLS, C, C * COLS, C * COLS, base64.b64encode(buf.getvalue()).decode())
open('src3d/island_parasol_assets.js', 'w').write(js); atlas.save('/tmp/claude-0/-root/65b8bc1c-1985-5345-a2d7-9387f9b1700d/scratchpad/isl/para_atlas.png'); print('atlas', C * COLS, 'webp', len(buf.getvalue()) // 1024, 'KB')
