# 11/19 首领重做：绿底动作表切图（按连通块归格，不一刀切），原分辨率输出 + frames.json
# 用法：python3 tools/slice_boss.py <图> <输出目录> <列> <行> <名字逗号分隔> <idle目标高度>
import sys, json, os
import numpy as np
from PIL import Image
from scipy import ndimage as nd

src, out, cols, rows, names, tgt = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4]), sys.argv[5].split(','), float(sys.argv[6])
a = np.array(Image.open(src).convert('RGB')).astype(int)
H, W = a.shape[:2]; cw, ch = W / cols, H / rows
r, g, b = a[..., 0], a[..., 1], a[..., 2]
bg = (g > 150) & (g > r + 60) & (g > b + 60)
fg = ~bg
lab, n = nd.label(fg, structure=np.ones((3, 3)))
objs = nd.find_objects(lab)
areas = nd.sum(np.ones_like(lab), lab, index=range(1, n + 1))
cents = nd.center_of_mass(np.ones_like(lab), lab, range(1, n + 1))
cell = {}
warn = []
for i, (sl, ar, (cy, cx)) in enumerate(zip(objs, areas, cents)):
    if ar < 25: continue
    c = min(cols - 1, int(cx // cw)) + cols * min(rows - 1, int(cy // ch))
    if sl[1].stop - sl[1].start > cw * 1.15 or sl[0].stop - sl[0].start > ch * 1.15: warn.append((c + 1, 'big blob'))
    cell.setdefault(c, []).append(i + 1)
os.makedirs(out, exist_ok=True)
meta = {}
# 去绿边：半透明边缘按绿色程度降 alpha，并把残留绿色压回去
spill = np.clip((g - np.maximum(r, b) - 20) / 80.0, 0, 1)
for ci, nm in enumerate(names):
    if not nm or ci not in cell:
        if nm: warn.append((ci + 1, 'empty'))
        continue
    m = np.isin(lab, cell[ci])
    ys, xs = np.where(m); y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    mm = m[y0:y1, x0:x1]
    # 边缘 1 像素做柔化
    er = nd.binary_erosion(mm)
    edge = mm & ~er
    al = np.where(mm, 255, 0).astype(float)
    sp = spill[y0:y1, x0:x1]
    al[edge] = 255 * (1 - sp[edge] * .8)
    rgb = a[y0:y1, x0:x1].copy().astype(float)
    gg = rgb[..., 1]; mx = np.maximum(rgb[..., 0], rgb[..., 2])
    rgb[..., 1] = np.where(gg > mx + 10, mx + 10, gg)
    im = Image.fromarray(np.dstack([rgb.clip(0, 255), al]).astype(np.uint8), 'RGBA')
    im.save(f'{out}/{nm}.png')
    h, w = mm.shape
    band = mm[int(h * .35):int(h * .7)]
    bx = np.where(band)[1]
    axp = float(np.median(bx)) if len(bx) else w / 2
    meta[nm] = [w, h, axp, h - 3]
# 世界尺寸：idle 高 = tgt
s = tgt / meta['idle'][1]
fr = {k: [round(v[0] * s, 1), round(v[1] * s, 1), round(v[2] * s, 1), round(v[3] * s, 1)] for k, v in meta.items()}
json.dump(fr, open(f'{out}/frames.json', 'w'), ensure_ascii=False)
print(os.path.basename(out), len(fr), 'frames', 'warn:', warn)
