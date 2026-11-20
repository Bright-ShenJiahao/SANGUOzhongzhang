import json, base64, io
from PIL import Image
import numpy as np
from slice import frames
MAP = {
 'a': {'hero': {'idle':[(0,0),(0,1)],'run':[(1,0),(1,1),(1,2)],'atk':[(2,0),(2,1)],'roll':[(3,0),(3,1)],'hurt':[(4,0)],'dead':[(4,1)],'por':[(5,0)]},
       'soldiers': {'dao_run':[(0,0),(0,1),(0,2)],'dao_atk':[(0,3),(0,4)],'dao_hurt':[(1,0)],'dao_dead':[(1,1)],'qiang_run':[(2,0),(2,1),(2,2)],'qiang_atk':[(2,3),(2,4)],'qiang_hurt':[(3,0)],'qiang_dead':[(3,1)],'dao_por':[(4,0)],'qiang_por':[(4,1)]},
       'boss': {'idle':[(0,0),(0,1)],'walk':[(0,2),(0,3),(0,4)],'charge':[(1,0),(1,1)],'jump':[(2,0),(2,1),(2,2)],'hurt':[(3,0)],'dead':[(3,1)],'por':[(4,0)]}},
 'b': {'hero': {'idle':[(0,0),(0,1)],'run':[(1,0),(1,1),(1,2),(1,3)],'atk':[(2,0),(2,1),(2,2)],'roll':[(3,0),(3,1),(3,2)],'hurt':[(4,0)],'dead':[(4,1)],'por':[(5,0)]},
       'soldiers': {'dao_run':[(0,0),(0,1),(0,2),(0,3)],'dao_atk':[(1,0),(1,1)],'dao_hurt':[(1,2)],'dao_dead':[(1,3)],'qiang_run':[(2,0),(2,1),(2,2),(2,3)],'qiang_atk':[(3,0),(3,1)],'qiang_hurt':[(3,2)],'qiang_dead':[(3,3)],'dao_por':[(4,0)],'qiang_por':[(4,1)]},
       'boss': {'idle':[(0,0),(0,1)],'walk':[(0,2),(0,3),(0,4),(0,5)],'charge':[(1,0),(1,1)],'jump':[(2,0),(2,1),(2,2)],'hurt':[(3,0)],'dead':[(3,1)],'por':[(4,0)]}},
}
ART = {'a': 6.0, 'b': 3.0}   # 原图里一个像素点有几像素宽
BOSSK = 1.6                   # 首领缩得少一点 → 更大、像素更细（不比小兵粗）
def shrink(img, k, ncol):
  w, h = max(1, round(img.width / k)), max(1, round(img.height / k))
  a = np.array(img).astype(float); al = a[..., 3:4] / 255
  pm = Image.fromarray(np.dstack([a[..., :3] * al, al * 255]).clip(0, 255).astype(np.uint8), 'RGBA').resize((w, h), Image.BOX)
  b = np.array(pm).astype(float); A = b[..., 3:4] / 255
  rgb = np.where(A > 0, b[..., :3] / np.maximum(A, 1e-6), 0)
  keep = (A[..., 0] > .5) & ~((rgb[..., 0] - rgb[..., 1] > 50) & (rgb[..., 2] - rgb[..., 1] > 50))   # 去掉品红残边
  out = np.dstack([rgb, keep * 255]).clip(0, 255).astype(np.uint8)
  return Image.fromarray(out, 'RGBA')
def anchor(img):
  a = np.array(img).astype(int); al = a[..., 3] > 0; h = a.shape[0]
  mx, mn = a[..., :3].max(-1), a[..., :3].min(-1); sat = (mx - mn) / np.maximum(mx, 1)
  m = al & (sat > .25); m[: int(h * .45)] = False
  if m.sum() < 5: m = al
  xs = np.nonzero(m)[1]; ys = np.nonzero(al)[0]
  return float(xs.mean()), int(ys.max()) + 1
out = {}
for s in 'ab':
  sheets = {}
  for n in ['hero', 'soldiers', 'boss']:
    R = frames(f'src/{s}/{n}.png', dil=4 if (s, n) == ('b', 'boss') else 8); k = ART[s] / (BOSSK if n == 'boss' else 1) * (1.3 if (s, n) == ('b', 'soldiers') else 1)
    for an, idx in MAP[s][n].items():
      for (r, c) in idx:
        f = R[r][c]; im = shrink(f['img'], k, 0)
        sheets.setdefault((n, an), []).append(im)
  # 统一调色：每套风格量化一次，减少杂色
  allims = [im for v in sheets.values() for im in v]
  W = sum(i.width + 2 for i in allims); H = max(i.height for i in allims)
  big = Image.new('RGBA', (W, H)); x = 0; pos = []
  for im in allims: big.paste(im, (x, 0)); pos.append(x); x += im.width + 2
  q = big.convert('RGB').quantize(64 if s == 'b' else 40, method=Image.Quantize.MEDIANCUT).convert('RGB')
  big = Image.merge('RGBA', (*q.split(), big.split()[3]))
  # 打包成多行图集
  meta = {}; rows = []; i = 0; AW = 1024; cx = cy = rh = 0; places = []
  for key, ims in sheets.items():
    for im in ims:
      sub = big.crop((pos[i], 0, pos[i] + im.width, im.height)); i += 1
      if cx + sub.width > AW: cx = 0; cy += rh + 2; rh = 0
      places.append((key, sub, cx, cy)); cx += sub.width + 2; rh = max(rh, sub.height)
  atlas = Image.new('RGBA', (AW, cy + rh)); 
  for key, sub, x0, y0 in places:
    atlas.paste(sub, (x0, y0)); ax, ay = anchor(sub)
    meta.setdefault(key[0] + ':' + key[1], []).append([x0, y0, sub.width, sub.height, round(ax, 1), ay])
  atlas.save(f'atlas_{s}.png')
  # 背景
  bg = Image.open('src/map_field.png').convert('RGB'); bgs = bg; bgs.save(f'bg_{s}.jpg', quality=86)
  b64 = lambda p: base64.b64encode(open(p, 'rb').read()).decode()
  out[s] = {'atlas': 'data:image/png;base64,' + b64(f'atlas_{s}.png'), 'bg': 'data:image/jpeg;base64,' + b64(f'bg_{s}.jpg'), 'f': meta, 'art': ART[s]}
  print(s, atlas.size, bgs.size, {k: [m[3] for m in v] for k, v in meta.items() if k.endswith('idle') or k.endswith('run')})
open('assets.js', 'w').write('window.ASSETS=' + json.dumps(out) + ';')
import os; print(os.path.getsize('assets.js') // 1024, 'KB')
