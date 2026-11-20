from PIL import Image, ImageDraw
import numpy as np
from scipy import ndimage
def frames(path, dil=8):
  a=np.array(Image.open(path).convert('RGB')).astype(int)
  r,g,b=a[...,0],a[...,1],a[...,2]
  bgm=(r-g>80)&(b-g>80)&(r>140)&(b>140)
  fg=ndimage.binary_opening(~bgm,iterations=1)
  lab,k=ndimage.label(ndimage.binary_dilation(fg,iterations=dil)); objs=ndimage.find_objects(lab)
  cl=[]
  for i,o in enumerate(objs):
    m=(lab[o]==i+1)&fg[o]; n=int(m.sum())
    if n<60: continue
    ys,xs=np.nonzero(m); cl.append(dict(x0=o[1].start+xs.min(),y0=o[0].start+ys.min(),x1=o[1].start+xs.max()+1,y1=o[0].start+ys.max()+1,n=n,ids=[i+1]))
  med=np.median([c['n'] for c in cl])
  big=[c for c in cl if c['n']>med*.15]; small=[c for c in cl if c['n']<=med*.15]
  for s in small:   # 小碎片（特效线、尘土）并到最近的大块
    def d(c): dx=max(c['x0']-s['x1'],s['x0']-c['x1'],0); dy=max(c['y0']-s['y1'],s['y0']-c['y1'],0); return dx*dx+dy*dy
    c=min(big,key=d)
    if d(c)<90**2: c['x0']=min(c['x0'],s['x0']);c['y0']=min(c['y0'],s['y0']);c['x1']=max(c['x1'],s['x1']);c['y1']=max(c['y1'],s['y1']);c['ids']+=s['ids']
  out=[]
  for c in big:
    sl=(slice(c['y0'],c['y1']),slice(c['x0'],c['x1']))
    m=np.isin(lab[sl],c['ids'])&fg[sl]
    rgba=np.dstack([a[sl],m*255]).astype(np.uint8)
    out.append(dict(x=c['x0'],y=c['y0'],w=c['x1']-c['x0'],h=c['y1']-c['y0'],img=Image.fromarray(rgba,'RGBA')))
  out.sort(key=lambda f:(f['y']+f['y']+f['h'])/2)
  rows=[]
  for f in out:
    cy=f['y']+f['h']/2
    if rows and cy < rows[-1]['bot']-25: rows[-1]['f'].append(f); rows[-1]['bot']=max(rows[-1]['bot'],f['y']+f['h'])
    else: rows.append({'bot':f['y']+f['h'],'f':[f]})
  return [sorted(R['f'],key=lambda f:f['x']) for R in rows]
def contact(R,path):
  W=sum(max(f['w'] for f in row) for row in R); 
  cw=max(sum(f['w']+20 for f in row) for row in R); ch=sum(max(f['h'] for f in row)+30 for row in R)
  im=Image.new('RGB',(cw,ch),(60,60,70)); d=ImageDraw.Draw(im); y=0
  for ri,row in enumerate(R):
    x=0
    for fi,f in enumerate(row): im.paste(f['img'],(x,y),f['img']); d.text((x+2,y+2),f'{ri}.{fi}',fill=(255,255,0)); x+=f['w']+20
    y+=max(f['h'] for f in row)+30
  im.thumbnail((1400,1400)); im.save(path)
if __name__=='__main__':
  import sys
  for s in ['a','b']:
    for n in ['hero','soldiers','boss']:
      R=frames(f'src/{s}/{n}.png'); print(s,n,[len(r) for r in R]); contact(R,f'/tmp/ct_{s}_{n}.png')
