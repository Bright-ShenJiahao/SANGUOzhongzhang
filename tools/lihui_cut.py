# 11/17 立绘去白底：从四边连通的白底 + 被包住的大块白底（≥60 像素）；小白块只去头发区里的（眼白保留），再去掉轮廓外的一圈浅色边
import sys, numpy as np
from PIL import Image
from scipy import ndimage
src, dst, H, ymax = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
a = np.array(Image.open(src).convert('RGB')).astype(int); mn = a.min(-1); mx = a.max(-1)
bgc = (mn > 228) & (mx - mn < 22); lab, n = ndimage.label(bgc); sz = ndimage.sum(bgc, lab, range(1, n + 1))
edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
keep = [i + 1 for i, s in enumerate(sz) if s >= 60 or (s >= 12 and np.where(lab == i + 1)[0].mean() < ymax)]
bg = np.isin(lab, list(edge) + keep)
for i in range(3): bg |= ndimage.binary_dilation(bg) & ~bg & (mn > 180) & (mx - mn < 40)
out = Image.fromarray(np.dstack([a.astype(np.uint8), np.where(bg, 0, 255).astype(np.uint8)]), 'RGBA'); out = out.crop(out.getbbox())
out = out.resize((round(out.width * H / out.height), H), Image.BOX); b = np.array(out).astype(float)
for it in range(5):
    A = b[..., 3] > 100; nb = ndimage.convolve((~A).astype(int), np.ones((3, 3)), mode='constant', cval=1)
    b[A & (nb >= 2) & (b[..., :3].min(-1) > 140), 3] = 0
b[..., 3] = np.where(b[..., 3] > 100, 255, 0)
A = b[..., 3] > 0; lab, n = ndimage.label(A); sz = ndimage.sum(A, lab, range(1, n + 1)); b[np.isin(lab, np.where(sz < 40)[0] + 1), 3] = 0
o = Image.fromarray(b.astype(np.uint8), 'RGBA'); o = o.crop(o.getbbox()); o.save(dst, quality=92); print(o.size)
