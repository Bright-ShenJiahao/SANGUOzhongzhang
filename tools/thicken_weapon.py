"""细兵器（剑身、枪杆）加粗 1 格：11/13 用户嫌剑、枪缩小后像一根线。
只往透明处长，人身上不动。用法：python3 tools/thicken_weapon.py 图片..."""
import sys, numpy as np
from PIL import Image
from scipy import ndimage
K4 = np.array([[0,1,0],[1,1,1],[0,1,0]], bool)
for p in sys.argv[1:]:
    a = np.asarray(Image.open(p).convert('RGBA')).astype(int).copy()
    on = a[..., 3] > 0; r, g, b = a[..., 0], a[..., 1], a[..., 2]
    mx = a[..., :3].max(-1); mn = a[..., :3].min(-1); lum = r*.3 + g*.59 + b*.11
    wood = on & (r > g + 12) & (g > b) & (lum < 120) & (lum > 30) & (r < 170)       # 枪杆木头（比皮肤暗）
    metal = on & (mx - mn < 40) & (lum > 110)                                         # 剑身、枪头（也会选到白衣）
    lab, n = ndimage.label(metal | wood, np.ones((3, 3)))
    keep = np.zeros_like(on)
    for i, sl in enumerate(ndimage.find_objects(lab), 1):
        m = lab[sl] == i; area = m.sum(); h, w = m.shape
        if area < 8: continue
        thin = area / max(h, w) < 4.2                                                 # 平均宽度不到 4 格 = 细长条
        if thin and max(h, w) >= 10: keep[sl] |= m
    grow = ndimage.binary_dilation(keep, K4) & ~on
    if grow.any():
        idx = ndimage.distance_transform_edt(~keep, return_distances=False, return_indices=True)
        src = a[idx[0], idx[1]]
        a[grow, :3] = (src[grow, :3] * .78).astype(int); a[grow, 3] = 255
    Image.fromarray(a.astype('uint8'), 'RGBA').save(p)
