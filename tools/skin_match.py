"""皮肤按基准图集（刀）逐级对齐：11/13 用户说其他 9 套皮肤「像抹了油、打了白色高光」。
做法：把每套皮肤像素的亮度分布按分位数映射到刀的分布，颜色直接取刀在同一亮度上的皮肤色；
夹在皮肤中间的白色高光点也当皮肤处理。用法：python3 tools/skin_match.py 基准前缀 前缀..."""
import sys, glob, numpy as np
from PIL import Image
from scipy import ndimage
D = 'art/sprites/hero/'
L = lambda a: a[..., 0]*.299 + a[..., 1]*.587 + a[..., 2]*.114
def skinmask(a):
    R, G, B = a[..., 0], a[..., 1], a[..., 2]
    return (a[..., 3] > 0) & (R > G) & (G >= B) & (R - B > 30) & (R > 120) & (G > R*.5)
def shine(a, sk):   # 皮肤中间的亮白点（高光）
    l = L(a); mx = a[..., :3].max(-1); mn = a[..., :3].min(-1)
    near = ndimage.uniform_filter(sk.astype(float), 3) > .5
    return (a[..., 3] > 0) & ~sk & (l > 195) & (mx - mn < 60) & near
ref = sys.argv[1]
px = []
for f in glob.glob(f'{D}{ref}*.png'):
    a = np.asarray(Image.open(f).convert('RGBA')).astype(float); m = skinmask(a); px.append(a[m][:, :3])
px = np.concatenate(px); pl = L(px)
qs = np.linspace(0, 100, 201); refq = np.percentile(pl, qs)
order = np.argsort(pl); spl = pl[order]; spx = px[order]
def refcol(lv):   # 刀里亮度最接近 lv 的皮肤色（取附近 40 个的中位数）
    i = np.clip(np.searchsorted(spl, lv), 20, len(spl) - 21); return np.median(spx[i-20:i+20], 0)
LUT = np.array([refcol(v) for v in np.arange(256)])
for p in sys.argv[2:]:
    fs = sorted(glob.glob(f'{D}{p}*.png')); arrs = [np.asarray(Image.open(f).convert('RGBA')).astype(float).copy() for f in fs]
    ms = [skinmask(a) for a in arrs]; ms = [m | shine(a, m) for a, m in zip(arrs, ms)]
    allL = np.concatenate([L(a)[m] for a, m in zip(arrs, ms)]); srcq = np.percentile(allL, qs)
    for f, a, m in zip(fs, arrs, ms):
        nl = np.interp(L(a)[m], srcq, refq)
        a[m, :3] = LUT[np.clip(nl.round().astype(int), 0, 255)]
        Image.fromarray(np.clip(a, 0, 255).astype('uint8'), 'RGBA').save(f)
    print(p, 'ok')
