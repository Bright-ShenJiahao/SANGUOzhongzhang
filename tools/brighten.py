"""首领贴图调亮（11/12 用户：首领比小兵暗）：整体提亮 + 黄色部分调成小兵那种亮黄。用法：python3 tools/brighten.py 角色文件夹...（只对刚像素化出来的图跑一次）"""
import sys, glob, numpy as np, matplotlib.colors as mc
from PIL import Image
import os
G, YS, YV = (float(x) for x in os.environ.get('BRIGHT', '.68,.6,.28').split(','))   # 首领 .68,.6,.28；旧小兵 .8,.9,.3（11/12）
for c in sys.argv[1:]:
  for p in glob.glob(f'art/sprites/{c}/*.png'):
    a = np.asarray(Image.open(p).convert('RGBA')).astype(float); rgb = (a[..., :3] / 255) ** G
    hsv = mc.rgb_to_hsv(np.clip(rgb, 0, 1)); h = hsv[..., 0]
    w = np.clip(1 - np.abs(h - .13) / .07, 0, 1) * (hsv[..., 1] > float(os.environ.get('SATMIN', '.25')))
    hsv[..., 1] = np.clip(hsv[..., 1] * (1 + YS * w), 0, 1); hsv[..., 2] = np.clip(hsv[..., 2] * (1 + YV * w), 0, 1); hsv[..., 0] = h + (float(os.environ.get('HUE', '.135')) - h) * float(os.environ.get('HUEK', '.5')) * w
    a[..., :3] = np.clip(mc.hsv_to_rgb(hsv), 0, 1) * 255
    Image.fromarray(a.astype(np.uint8)).save(p)
