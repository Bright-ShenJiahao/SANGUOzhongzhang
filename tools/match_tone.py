"""首领配色对齐喽啰（棍子兵）（11/12 用户：喜欢棍子兵的颜色；张梁已经一致，其他首领发白）。
发白原因：之前 brighten.py 的 gamma 提亮把暗部也抬起来了，对比度变低；黄色本身又偏灰。
做法：按每个角色的统计，把黄色部分的色相/饱和度/亮度拉到张梁的平均值，其余部分把被抬起的暗部压回去（恢复对比度）。
用法：python3 tools/match_tone.py 角色文件夹...（只跑一次；DRY=1 只看统计）"""
import sys, os, glob, numpy as np, matplotlib.colors as mc
from PIL import Image
REF = 'grunt'   # 以喽啰（棍子兵）的颜色为准（11/12 用户定）
def stats(c):
    px = []
    for p in glob.glob(f'art/sprites/{c}/*.png'):
        a = np.asarray(Image.open(p).convert('RGBA')).astype(float) / 255; px.append(mc.rgb_to_hsv(a[..., :3])[a[..., 3] > 0])
    h = np.concatenate(px); y = (np.abs(h[:, 0] - .11) < .06) & (h[:, 1] > .25) & (h[:, 2] > .3); o = ~y & (h[:, 2] > .08)
    return h[y, 0].mean(), h[y, 1].mean(), h[y, 2].mean(), np.median(h[o, 2])
rh, rs, rv, ro = stats(REF)
for c in sys.argv[1:]:
    h0, s0, v0, o0 = stats(c); ks, kv, g = rs / s0, rv / v0, max(1, np.log(max(ro, .05)) / np.log(max(o0, .05)))
    print(f'{c:16s} 黄 S{s0:.2f}->{rs:.2f} V{v0:.2f}->{rv:.2f} H{h0:.3f}->{rh:.3f} | 其他亮度 {o0:.2f}->{ro:.2f} (gamma {g:.2f})')
    if os.environ.get('DRY'): continue
    for p in glob.glob(f'art/sprites/{c}/*.png'):
        a = np.asarray(Image.open(p).convert('RGBA')).astype(float); hsv = mc.rgb_to_hsv(a[..., :3] / 255); H = hsv[..., 0]
        w = np.clip(1 - np.abs(H - .11) / .06, 0, 1) * (hsv[..., 1] > .25)
        hsv[..., 0] = H + (rh - h0) * w
        hsv[..., 1] = np.clip(hsv[..., 1] * (1 + (ks - 1) * w), 0, 1)
        hsv[..., 2] = np.clip(hsv[..., 2] * (1 + (kv - 1) * w), 0, 1) ** (1 + (g - 1) * (1 - w))   # 非黄色部分压回暗部
        a[..., :3] = mc.hsv_to_rgb(hsv) * 255; Image.fromarray(a.astype(np.uint8)).save(p)
