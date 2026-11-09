#!/usr/bin/env python3
"""把白衣主角帧的头发压成接近黑色（保留明暗层次）。用法：python3 tools/hairfix.py 帧名或路径 ...
新切出来的 PNG 在放进 art/sprites/hero 之后跑一遍。"""
import sys, numpy as np
from PIL import Image
def fix(path, loose_rows=.6):
    im = Image.open(path).convert('RGBA'); a = np.array(im).astype(float); H = a.shape[0]
    r, g, b, al = [a[..., i] for i in range(4)]; rr = np.maximum(r, 1)
    ratio = (g / rr > .33) & (b / rr > .30) & (r >= g) & (g >= b - 4) & (al > 0)
    rows = np.arange(H)[:, None] < H * loose_rows
    hair = ratio & (((r < 125) & (g < 105) & (b < 100)) | (rows & (r < 165) & (g < 125) & (b < 115)))
    lum = .3 * r + .59 * g + .11 * b
    for c, m in zip((0, 1, 2), (.62, .62, .7)): a[..., c][hair] = np.clip(lum[hair] * m, 0, 255)
    Image.fromarray(a.astype(np.uint8), 'RGBA').save(path)
if __name__ == '__main__':
    for p in sys.argv[1:]: fix(p, .7 if 'portrait' in p else .6)
