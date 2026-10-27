# Builds src3d/neon_assets4.js: the fourth set of Neon Quarter materials, ONE WebP atlas with alpha cut from six of the user's pictures (their uploaded art is only cropped, scaled and, for the lamp,
# cut out along its outline; never recoloured or redrawn). Run:  python3 tools/make_neon_assets4.py  (needs Pillow; the pictures' paths are in UP below)
import base64, io, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
UP = sys.argv[1] if len(sys.argv) > 1 else '/root/.claude/uploads/65b8bc1c-1985-5345-a2d7-9387f9b1700d/'
F = {'burlap': '31777d42', 'lamp': 'c321feb2', 'collage': '3628a9fd', 'chand': 'de5339b2', 'facade': '01dbd80f', 'tilesA': '64edbd1c', 'tilesB': '78b9ea97'}
img = {k: Image.open(UP + v + ('-image.jpg' if k == 'burlap' else '-image.png')).convert('RGBA') for k, v in F.items()}
def crop(k, box, w): c = img[k].crop(box); return c.resize((w, round(c.height * w / c.width)), Image.LANCZOS)
cells = {}
# the Moroccan filigree lamp, cut out along its outline (a polygon round the lamp; the picture's pixels are kept as they are)
lamp = img['lamp']; m = Image.new('L', lamp.size, 0)
ImageDraw.Draw(m).polygon([(150, 0), (210, 0), (260, 60), (305, 200), (318, 300), (300, 380), (255, 440), (250, 470), (285, 505), (295, 550), (270, 585), (90, 585), (70, 550), (80, 510), (110, 470), (100, 440), (50, 380), (28, 300), (40, 200), (85, 70)], fill=255)
m = m.filter(ImageFilter.GaussianBlur(1.2)); lamp.putalpha(m); lamp = lamp.crop((20, 0, 326, 590))
cells['lamp'] = lamp.resize((256, round(lamp.height * 256 / lamp.width)), Image.LANCZOS)
cells['pendants'] = crop('collage', (656, 0, 1262, 1080), 288)           # hanging glass drops in front of a pierced screen and teal glass
cells['pierced'] = crop('collage', (0, 0, 650, 1080), 307)               # a lit pierced screen and a gold glass drop
cells['chandelier'] = crop('chand', (560, 0, 1260, 1080), 332)           # the tiered gold and crystal chandelier
cells['facade'] = crop('facade', (470, 330, 1400, 930), 480)             # the lit restaurant front with its two backlit perforated panels and the neon logo
cells['tiles'] = crop('tilesA', (664, 0, 1256, 1080), 280)               # teal tile wall, a mountain-shaped wall, a table
cells['tiles2'] = crop('tilesB', (664, 0, 1256, 1080), 280)              # the same room with the sunburst chandelier
cells['tilewall'] = crop('tilesB', (1520, 0, 1920, 1080), 220)           # the teal tiles close up
cells['panelBlue'] = crop('facade', (520, 350, 755, 745), 256)           # the blue backlit perforated panel
cells['panelPink'] = crop('facade', (1175, 480, 1335, 790), 160)         # the magenta one

# the VAULT from the user's photo with the rose: everything UNDER the red line they drew (the woven burlap arch AND what is under it: the rose, the leaves, the stones), the background above the
# line (the white wall, the plant) removed. (An earlier cut kept only the burlap and removed the inside: that was the wrong way round.) The pixels are kept as they are; the red marker is left outside.
bur = img['burlap'].convert('RGBA'); poly = Image.new('L', bur.size, 0)
ImageDraw.Draw(poly).polygon([(930, 400), (930, 268), (1050, 232), (1115, 160), (1180, 92), (1240, 50), (1330, 22), (1420, 2), (1640, 2), (1660, 30), (1725, 95), (1790, 160), (1845, 215), (1840, 400)], fill=255)
# the red marker itself (a flat dull red, unlike the glossy deeper red of the rose, which is left alone) is cut out too
ba = np.array(bur.convert('RGB')).astype(int); marker = (ba[..., 0] > 165) & (ba[..., 0] < 215) & (ba[..., 1] > 30) & (ba[..., 1] < 75) & (ba[..., 2] > 30) & (ba[..., 2] < 75) & (abs(ba[..., 1] - ba[..., 2]) < 14)
rose = np.zeros(marker.shape, bool); rose[120:420, 1200:1580] = True; marker &= ~rose
mk = Image.fromarray((marker * 255).astype('uint8')).filter(ImageFilter.MaxFilter(7)); pm = np.array(poly).astype(int); pm[np.array(mk) > 0] = 0
mi = Image.fromarray(pm.astype('uint8')).filter(ImageFilter.GaussianBlur(1.0)); bur.putalpha(mi); bb = Image.fromarray(pm.astype('uint8')).point(lambda v: 255 if v > 60 else 0).getbbox(); arch = bur.crop(bb)
cells['vault'] = arch.resize((480, max(1, round(arch.height * 480 / arch.width))), Image.LANCZOS)
# a neon HOTEL sign (drawn here, in code: the letters are pink neon tubes with a cyan edge and a glow; nothing of the user's)
from PIL import ImageFont
fnt = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 150); SW, SH = 520, 190; sign = Image.new('RGBA', (SW, SH), (0, 0, 0, 0)); tx = Image.new('L', (SW, SH), 0)
ImageDraw.Draw(tx).text((SW // 2, SH // 2), 'HOTEL', font=fnt, fill=255, anchor='mm')
glow = tx.filter(ImageFilter.GaussianBlur(10)); core = tx.filter(ImageFilter.MinFilter(5))
layer = lambda m, col, a: Image.merge('RGBA', (Image.new('L', (SW, SH), col[0]), Image.new('L', (SW, SH), col[1]), Image.new('L', (SW, SH), col[2]), m.point(lambda v: int(v * a))))
sign = Image.alpha_composite(sign, layer(glow, (255, 47, 208), 1.0)); sign = Image.alpha_composite(sign, layer(tx, (255, 47, 208), 1.0)); sign = Image.alpha_composite(sign, layer(core, (255, 220, 250), 1.0))
cells['hotel'] = sign
# shelf packing into a 1024 wide atlas
W = 1024; rows = [['lamp', 'pendants', 'pierced', 'panelPink'], ['chandelier', 'tiles', 'tiles2'], ['facade', 'panelBlue', 'tilewall'], ['vault', 'hotel']]; y = 0; pos = {}
for r in rows:
    x = 0; h = 0
    for k in r: pos[k] = (x, y); x += cells[k].width + 4; h = max(h, cells[k].height)
    y += h + 4
H = y; atlas = Image.new('RGBA', (W, H), (0, 0, 0, 0))
for k, (x, yy) in pos.items(): atlas.paste(cells[k], (x, yy))
buf = io.BytesIO(); atlas.save(buf, 'WEBP', quality=84, method=6); b = buf.getvalue()
meta = ', '.join('%s: { u0: %.5f, u1: %.5f, v0: %.5f, v1: %.5f, ar: %.4f }' % (k, pos[k][0] / W, (pos[k][0] + cells[k].width) / W, 1 - (pos[k][1] + cells[k].height) / H, 1 - pos[k][1] / H, cells[k].width / cells[k].height) for k in pos)
open('src3d/neon_assets4.js', 'w').write("// A fourth set of Neon Quarter materials: ONE WebP atlas with alpha (%d x %d) from six of the user's pictures, embedded as a data URI (so the game also runs from file://). Made by tools/make_neon_assets4.py:\n"
  "// lamp = the Moroccan filigree lamp (cut out along its outline); pendants = hanging glass drops; pierced = a lit pierced screen; chandelier = the tiered gold and crystal chandelier; facade = the lit restaurant\n"
  "// front with the neon logo (the hotel); tiles / tiles2 = the teal tile room (mountain wall, sunburst chandelier); tilewall = the teal tiles close up; panelBlue / panelPink = the two backlit perforated panels; vault = the photo with the rose cut along the user's red line, the burlap arch and all that is under it (the hotel's entrance vault); hotel = a neon HOTEL sign drawn in code.\n"
  "// Each cell: u0..u1 / v0..v1 (texture space, v up) and ar = width / height.\nconst NEON_ASSETS4 = { %s,\n  src: 'data:image/webp;base64,%s' };\n" % (W, H, meta, base64.b64encode(b).decode()))
print('atlas', W, H, len(b) // 1024, 'KB')
atlas.resize((W // 2, H // 2)).save('/tmp/neon4_prev.png')
