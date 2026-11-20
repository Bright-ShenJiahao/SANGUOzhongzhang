# 第三套：《战至终章》现有美术（主角单刀、黄巾刀兵/枪兵、披甲程远志、村口打谷场）
import json, base64
from PIL import Image
SP = '/home/claude/sanguozhongzhang/art/sprites/'
A = json.load(open(SP + 'atlas.json'))
K = .85
MAP = {
 'hero': ('hero', {'idle': ['wd_idle', 'wd_idle'], 'run': ['wd_walk1', 'wd_walk2', 'wd_walk3'], 'atk': ['wd_sweep1', 'wd_sweep2'], 'roll': ['wd_roll1', 'wd_roll2', 'wd_roll3', 'wd_roll4'], 'hurt': ['wd_hurt'], 'dead': ['wd_down']}),
 'soldiers:dao': ('blade_pxa', {'run': ['walk1', 'walk2'], 'atk': ['wind', 'strike'], 'hurt': ['hurt'], 'dead': ['down'], 'por': ['portrait']}),
 'soldiers:qiang': ('spear_pxa', {'run': ['walk1', 'walk2', 'walk3', 'walk4'], 'atk': ['wind', 'strike'], 'hurt': ['hurt'], 'dead': ['down'], 'por': ['portrait']}),
 'boss': ('cheng_new', {'idle': ['idle', 'idle'], 'walk': ['walk1', 'walk2', 'walk3', 'walk4'], 'charge': ['sweep1', 'sweep2'], 'jump': ['wind', 'fly1', 'strike'], 'hurt': ['hurt'], 'dead': ['down'], 'por': ['portrait']}),
}
ims = []
for grp, (ch, anims) in MAP.items():
  F = A[ch]
  for an, names in anims.items():
    key = (grp + ':' + an) if grp in ('hero', 'boss') else ('soldiers:' + grp.split(':')[1] + '_' + an)
    for n in names:
      im = Image.open(f'{SP}{ch}/{n}.png').convert('RGBA')
      if n == 'portrait': w, h = round(im.width * .4), round(im.height * .4); ax, ay = w / 2, h
      else: fw, fh, fax, fay = F[n]; w, h = max(1, round(fw * K)), max(1, round(fh * K)); ax, ay = fax * K, fay * K
      ims.append((key, im.resize((w, h), Image.LANCZOS), ax, ay))
# 主角没有头像：用站立帧的上半身
hi = Image.open(SP + 'hero/wd_idle.png').convert('RGBA'); hp = hi.crop((0, 0, hi.width, int(hi.height * .55))); ims.append(('hero:por', hp, hp.width / 2, hp.height))
AW = 1024; cx = cy = rh = 0; pl = []
for key, im, ax, ay in ims:
  if cx + im.width > AW: cx = 0; cy += rh + 2; rh = 0
  pl.append((key, im, cx, cy, ax, ay)); cx += im.width + 2; rh = max(rh, im.height)
at = Image.new('RGBA', (AW, cy + rh)); meta = {}
for key, im, x, y, ax, ay in pl: at.paste(im, (x, y)); meta.setdefault(key, []).append([x, y, im.width, im.height, round(ax, 1), round(ay)])
at.save('atlas_c.png')
Image.open('/home/claude/sanguozhongzhang/art/bg/field.webp').convert('RGB').resize((2048, 1152), Image.LANCZOS).save('bg_c.jpg', quality=86)
b64 = lambda p: base64.b64encode(open(p, 'rb').read()).decode()
s = open('assets.js').read(); d = json.loads(s[len('window.ASSETS='):-1])
d['c'] = {'atlas': 'data:image/png;base64,' + b64('atlas_c.png'), 'bg': 'data:image/jpeg;base64,' + b64('bg_c.jpg'), 'f': meta, 'art': 1}
open('assets.js', 'w').write('window.ASSETS=' + json.dumps(d) + ';')
print(at.size, {k: len(v) for k, v in meta.items()})
