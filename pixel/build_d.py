# 第四套：帝国风精进版（d）+ 帝国像素打谷场地图
import json, base64, re
from PIL import Image
import numpy as np
from slice import frames
src = open('build_atlas.py').read()
exec(src[src.index('def shrink'):src.index('out = {}')])   # 复用 shrink / anchor
MAPD = {'hero': {'idle':[(0,0),(0,1)],'run':[(1,0),(1,1),(1,2)],'atk':[(2,0),(2,1)],'roll':[(3,0),(3,1)],'hurt':[(4,0)],'dead':[(4,1)],'por':[(5,0)]},
        'soldiers': {'dao_run':[(0,0),(0,1),(0,2)],'dao_atk':[(0,3),(0,4)],'dao_hurt':[(1,0)],'dao_dead':[(1,1)],'qiang_run':[(2,0),(2,1),(2,2)],'qiang_atk':[(2,3),(2,4)],'qiang_hurt':[(3,0)],'qiang_dead':[(3,1)],'dao_por':[(4,0)],'qiang_por':[(4,1)]},
        'boss': {'idle':[(0,0),(0,1)],'walk':[(0,2),(0,3),(0,4)],'charge':[(1,0),(1,1)],'jump':[(2,0),(2,1),(2,2)],'hurt':[(3,0)],'dead':[(3,1)],'por':[(4,0)]}}
import sys
SET = sys.argv[1] if len(sys.argv) > 1 else 'd'; ARTD, BK = {'d': (5.0, 1.6), 'e': (6.0, 1.7)}[SET]; MAPK = {'d': 'pixd', 'e': 'pixe'}[SET]
def merge(a, b):   # 把掉在一旁的大刀并进倒地帧
  x0, y0 = min(a['x'], b['x']), min(a['y'], b['y']); x1, y1 = max(a['x'] + a['w'], b['x'] + b['w']), max(a['y'] + a['h'], b['y'] + b['h'])
  c = Image.new('RGBA', (x1 - x0, y1 - y0)); c.paste(a['img'], (a['x'] - x0, a['y'] - y0), a['img']); c.paste(b['img'], (b['x'] - x0, b['y'] - y0), b['img'])
  return dict(x=x0, y=y0, w=x1 - x0, h=y1 - y0, img=c)
sheets = {}
for n in ['hero', 'soldiers', 'boss']:
  R = frames(f'src/{SET}/{n}.png')
  if n == 'boss' and len(R[3]) == 3: R[3] = [R[3][0], merge(R[3][1], R[3][2])]
  k = ARTD / (BK if n == 'boss' else 1)
  for an, idx in MAPD[n].items():
    for (r, c) in idx: sheets.setdefault((n, an), []).append(shrink(R[r][c]['img'], k, 0))
allims = [im for v in sheets.values() for im in v]
W = sum(i.width + 2 for i in allims); H = max(i.height for i in allims)
big = Image.new('RGBA', (W, H)); x = 0; pos = []
for im in allims: big.paste(im, (x, 0)); pos.append(x); x += im.width + 2
q = big.convert('RGB').quantize(48, method=Image.Quantize.MEDIANCUT).convert('RGB'); big = Image.merge('RGBA', (*q.split(), big.split()[3]))
meta = {}; i = 0; AW = 1024; cx = cy = rh = 0; places = []
for key, ims in sheets.items():
  for im in ims:
    sub = big.crop((pos[i], 0, pos[i] + im.width, im.height)); i += 1
    if cx + sub.width > AW: cx = 0; cy += rh + 2; rh = 0
    places.append((key, sub, cx, cy)); cx += sub.width + 2; rh = max(rh, sub.height)
atlas = Image.new('RGBA', (AW, cy + rh))
for key, sub, x0, y0 in places:
  atlas.paste(sub, (x0, y0)); ax, ay = anchor(sub); meta.setdefault(key[0] + ':' + key[1], []).append([x0, y0, sub.width, sub.height, round(ax, 1), ay])
atlas.save(f'atlas_{SET}.png')
Image.open(f'src/map_field_{SET}.png').convert('RGB').save(f'bg_{SET}.jpg', quality=88)
b64 = lambda p: base64.b64encode(open(p, 'rb').read()).decode()
s = open('assets.js').read(); d = json.loads(s[len('window.ASSETS='):-1])
d[SET] = {'atlas': 'data:image/png;base64,' + b64(f'atlas_{SET}.png'), 'f': meta, 'art': ARTD}
d['maps'][MAPK] = 'data:image/jpeg;base64,' + b64(f'bg_{SET}.jpg')
open('assets.js', 'w').write('window.ASSETS=' + json.dumps(d) + ';')
print(atlas.size, {k: [m[3] for m in v] for k, v in meta.items() if k.endswith(':idle') or 'run' in k})
