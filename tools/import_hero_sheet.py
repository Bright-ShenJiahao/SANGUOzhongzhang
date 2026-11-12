"""导入 GPT 出的主角 20 帧总表（绿底 5×4）→ art/sprites/hero/<前缀>_*.png，并更新 atlas。
按连通区域切：大块是人，小块（飞出去的符纸、剑尖等）归到最近的人；整张按「待机帧身高 = 刀的待机身高」统一缩小。
用法：python3 tools/import_hero_sheet.py 总表.png 前缀"""
import sys, json, numpy as np
from PIL import Image
from scipy import ndimage
SRC, PRE = sys.argv[1], sys.argv[2]
ORDER = ['idle','walk1','walk2','walk3','chop1','chop2','sweep1','sweep2','thrust1','thrust2','spin1','spin2','up1','up2','roll1','roll2','roll3','roll4','hurt','down']
im = np.asarray(Image.open(SRC).convert('RGB')).astype(float)
r, g, b = im[..., 0], im[..., 1], im[..., 2]
d = g - np.maximum(r, b)
alpha = np.clip(1 - (d - 10) / 40, 0, 1); alpha[d > 50] = 0
fg = alpha > .35
lab, n = ndimage.label(fg, np.ones((3, 3)))
objs = ndimage.find_objects(lab); sizes = ndimage.sum(fg, lab, range(1, n + 1))
big = sorted([i + 1 for i in range(n) if sizes[i] > sizes.max() * .25], key=lambda i: (objs[i-1][0].start + objs[i-1][0].stop) / 2)
assert len(big) == 20, len(big)
rows = [sorted(big[k*5:(k+1)*5], key=lambda i: objs[i-1][1].start) for k in range(4)]
mains = [i for row in rows for i in row]
def ctr(i): o = objs[i-1]; return ((o[0].start+o[0].stop)/2, (o[1].start+o[1].stop)/2)
groups = {m: [m] for m in mains}
for i in range(1, n + 1):
    if i in groups or sizes[i-1] < 30: continue
    cy, cx = ctr(i)
    m = min(mains, key=lambda j: (ctr(j)[0]-cy)**2*2 + (ctr(j)[1]-cx)**2)   # 行优先：符纸一般在同一行
    groups[m].append(i)
# 缩放：待机帧（第 1 帧）高度对齐刀的待机
ref = Image.open('art/sprites/hero/wd_idle.png'); TH = json.load(open('art/sprites/atlas.json'))['hero']['wd_idle'][3]
o0 = objs[mains[0]-1]; s = TH / (o0[0].stop - o0[0].start)
atlas = json.load(open('art/sprites/atlas.json'))
rgba = np.dstack([im, alpha * 255])
for name, m in zip(ORDER, mains):
    ids = groups[m]; ys = [objs[j-1][0] for j in ids]; xs = [objs[j-1][1] for j in ids]
    y0, y1 = min(o.start for o in ys), max(o.stop for o in ys); x0, x1 = min(o.start for o in xs), max(o.stop for o in xs)
    mask = np.isin(lab[y0:y1, x0:x1], ids)
    a = rgba[y0:y1, x0:x1].copy(); a[..., 3] *= mask
    W, H = max(1, round((x1-x0)*s)), max(1, round((y1-y0)*s))
    al = a[..., 3:] / 255
    pm = Image.fromarray(np.clip(a[..., :3]*al, 0, 255).astype('uint8')).resize((W, H), Image.BOX)
    aa = np.asarray(Image.fromarray((al[..., 0]*255).astype('uint8')).resize((W, H), Image.BOX)).astype(float) / 255
    col = np.asarray(pm).astype(float) / np.maximum(aa, 1e-3)[..., None]
    out = np.dstack([np.clip(col, 0, 255), np.where(aa > .5, 255, 0)]).astype('uint8')
    # 锚点：主体（不含飞出去的小块）下部的横向中心、脚底
    mo = objs[m-1]; mm = (lab[mo] == m); hh = mm.shape[0]
    low = mm[int(hh*.7):]; cx = (np.where(low.any(0))[0].mean() + mo[1].start - x0) * s
    ay = (mo[0].stop - y0) * s - 2
    Image.fromarray(out, 'RGBA').save(f'art/sprites/hero/{PRE}_{name}.png')
    atlas['hero'][f'{PRE}_{name}'] = [W, H, round(cx, 1), round(ay)]
json.dump(atlas, open('art/sprites/atlas.json', 'w'), ensure_ascii=False, indent=0)
print('ok scale', round(s, 3))
