# Builds src3d/sttunnel_assets.js: the faces of THE SQUARE TUNNEL (the user's picture, 2026-11-20: a vast square tunnel, blue walls with violet rings, a ceiling with a line of light, a dark
# red floor with pink rings between two black bands), each face taken out of the picture's perspective and kept as is. One JPEG atlas as a data URI.
# Run: python3 tools/make_sttunnel_assets.py <tunnel.png>
import sys, io, base64, json
import numpy as np
from PIL import Image
im = Image.open(sys.argv[1]).convert('RGB'); im = im.resize((2000, round(im.height * 2000 / im.width)), Image.LANCZOS)      # the points below are read on the picture 2000 wide
def face(quad, size):      # quad: the picture's points for the output's UL, UR, LR, LL
  w, h = size; dst = [(0, 0), (w, 0), (w, h), (0, h)]; A = []; B = []
  for (x, y), (u, v) in zip(dst, quad): A += [[x, y, 1, 0, 0, 0, -u * x, -u * y], [0, 0, 0, x, y, 1, -v * x, -v * y]]; B += [u, v]
  return im.transform(size, Image.PERSPECTIVE, list(np.linalg.solve(np.array(A, float), np.array(B, float))), Image.BICUBIC)
VP = (1000, 410)
def on(p, f): return (VP[0] + (p[0] - VP[0]) * f, VP[1] + (p[1] - VP[1]) * f)      # a point of the line from the vanishing point to p
FACES = {      # (left of the output = far, right = near, for the walls; top = far for the floor and the ceiling)
  'wallR': face([on((2000, 265), 0.25), on((2000, 265), 0.8), on((2000, 930), 0.8), on((2000, 930), 0.25)], (640, 320)),
  'wallL': face([on((0, 290), 0.25), on((0, 290), 0.95), on((0, 900), 0.95), on((0, 900), 0.25)], (640, 320)),
  'floor': face([on((120, 1370), 0.36), on((1870, 1380), 0.36), on((1870, 1380), 0.98), on((120, 1370), 0.98)], (448, 640)),
  'ceil': face([on((300, 40), 0.25), on((1700, 40), 0.25), (1700, 40), (300, 40)], (448, 512)),
}
W = 1024; x = y = rowh = 0; place = {}
for k in ['wallR', 'wallL', 'floor', 'ceil']:
  p = FACES[k]
  if x + p.width > W: x = 0; y += rowh + 4; rowh = 0
  place[k] = (x, y); x += p.width + 4; rowh = max(rowh, p.height)
H = y + rowh; atlas = Image.new('RGB', (W, H), (10, 10, 60)); cells = {}
for k, (px, py) in place.items():
  p = FACES[k]; atlas.paste(p, (px, py))
  cells[k] = {'u0': round((px + 2) / W, 5), 'u1': round((px + p.width - 2) / W, 5), 'v0': round(1 - (py + p.height - 2) / H, 5), 'v1': round(1 - (py + 2) / H, 5)}
atlas.save(sys.argv[2] if len(sys.argv) > 2 else '/dev/null', 'PNG') if len(sys.argv) > 2 else None
b = io.BytesIO(); atlas.save(b, 'JPEG', quality=86); src = 'data:image/jpeg;base64,' + base64.b64encode(b.getvalue()).decode()
open('src3d/sttunnel_assets.js', 'w').write("// THE SQUARE TUNNEL's faces (the user's picture, each face out of its perspective, as is), made by tools/make_sttunnel_assets.py; %dx%d JPEG as a data URI.\nconst STTUNNEL_ASSETS = { %s, src: '%s' };\n" % (W, H, ', '.join('%s: %s' % (k, json.dumps(v)) for k, v in cells.items()), src))
print(W, H, len(src) // 1024, 'KB')
