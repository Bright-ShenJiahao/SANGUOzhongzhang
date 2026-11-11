"""黑边太粗的精灵（GPT 出图自带粗黑边，像素化时又加一圈）→ 以喽啰（棍子兵）为基准削细（11/12 用户定）。
只削「最外圈暗、往里第 2、3 圈也暗」的地方（黑边 ≥3 格厚），削完黑边最多 2 格，和喽啰一样。只跑一次。
用法：python3 tools/thin_outline.py 角色文件夹...；DRY=1 只看统计。"""
import sys, os, glob, numpy as np
from PIL import Image
from scipy import ndimage
K = np.ones((3, 3), bool)
def prof(a):
    on = a[..., 3] > 0; D = ndimage.distance_transform_cdt(np.pad(on, 1), metric='taxicab')[1:-1, 1:-1]
    dark = (a[..., :3].astype(float) @ [.3, .59, .11] < 70) & on
    return on, D, dark
def thin(a):
    on, D, dark = prof(a)
    d2, d3 = dark & (D == 2), dark & (D == 3)
    kill = (D == 1) & dark & ndimage.binary_dilation(d2 & ndimage.binary_dilation(d3, K), K)
    a = a.copy(); a[kill, 3] = 0; return a
def layers(c):
    F = [0] * 3; N = [0] * 3
    for p in glob.glob(f'art/sprites/{c}/*.png'):
        on, D, dark = prof(np.asarray(Image.open(p).convert('RGBA')))
        for k in range(3): m = (D == k + 1) & on; F[k] += (dark & m).sum(); N[k] += m.sum()
    return ' '.join(f'{f / max(n, 1):.2f}' for f, n in zip(F, N))
for c in sys.argv[1:]:
    before = layers(c)
    if not os.environ.get('DRY'):
        for p in glob.glob(f'art/sprites/{c}/*.png'): Image.fromarray(thin(np.asarray(Image.open(p).convert('RGBA')))).save(p)
    print(f'{c:16s} {before}  ->  {layers(c)}')
