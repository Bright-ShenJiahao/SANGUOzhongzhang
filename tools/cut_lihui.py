# 立绘白底抠图（11/14）：外部白底 + 头发/胳膊间夹着的白色小洞都透明，边缘去白边
import sys;from PIL import Image;import numpy as np
from scipy import ndimage
def cut(src,dst):
  h=np.array(Image.open(src).convert('RGB')).astype(float);dh=np.abs(h-255).max(2)
  bgm=dh<(int(sys.argv[3]) if len(sys.argv)>3 else 22)
  er=ndimage.binary_erosion(bgm,iterations=6,border_value=1)   # 外部白底：先腐蚀再连通，刀刃高光和背景之间的细缝不会被当成一片
  lb,k=ndimage.label(er);edge=set(np.unique(np.concatenate([lb[0],lb[-1],lb[:,0],lb[:,-1]])))-{0}
  bg=ndimage.binary_dilation(np.isin(lb,list(edge)),iterations=8)&bgm
  hl,hk=ndimage.label(bgm&~bg);hs=ndimage.sum(bgm,hl,range(1,hk+1));hmn=ndimage.mean(dh,hl,range(1,hk+1));hmx=ndimage.maximum(dh,hl,range(1,hk+1));ob=ndimage.find_objects(hl)
  def dark_ring(j):   # 夹缝白洞：纯白、且周围是深色（头发衣服）才算背景；周围是亮灰（刀刃）就是高光，保留
    sl=tuple(slice(max(0,q.start-4),q.stop+4) for q in ob[j]);m=hl[sl]==j+1;r=ndimage.binary_dilation(m,iterations=3)&~m
    return np.median(dh[sl][r])>75
  bg|=np.isin(hl,[j+1 for j in range(hk) if hs[j]>=30 and hmn[j]<9 and dark_ring(j)])
  fg=~bg;fg=ndimage.binary_opening(fg,iterations=1)
  lb2,k2=ndimage.label(fg);s2=ndimage.sum(fg,lb2,range(1,k2+1));fg=np.isin(lb2,[j+1 for j in range(k2) if s2[j]>300])
  core=ndimage.binary_erosion(fg,iterations=2);ring=fg&~core
  a=np.where(core,1.,0.);a[ring]=np.clip(dh[ring]/90,0,1)   # 边缘按离白色多远给半透明
  a=np.maximum(a,ndimage.gaussian_filter(core.astype(float),.5)*core)
  f=np.clip(a,1e-3,1)[...,None];rgb=np.clip((h-255*(1-f))/f,0,255)   # 去掉混进来的白
  ys,xs=np.where(a>.05);o=(slice(ys.min(),ys.max()+1),slice(xs.min(),xs.max()+1))
  im=Image.fromarray(np.dstack([rgb,a*255]).astype(np.uint8)[o],'RGBA');im.thumbnail((700,900),Image.LANCZOS);im.save(dst,quality=90)
if __name__=="__main__": cut(sys.argv[1],sys.argv[2])
