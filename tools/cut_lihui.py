# 立绘白底抠图（11/14）：外部白底 + 头发/胳膊间夹着的白色小洞都透明，边缘去白边
import sys;from PIL import Image;import numpy as np
from scipy import ndimage
def cut(src,dst):
  h=np.array(Image.open(src).convert('RGB')).astype(float);dh=np.abs(h-255).max(2)
  bgm=dh<22
  lb,k=ndimage.label(bgm);sz=ndimage.sum(bgm,lb,range(1,k+1))
  edge=set(np.unique(np.concatenate([lb[0],lb[-1],lb[:,0],lb[:,-1]])))-{0}
  bg=np.isin(lb,[j+1 for j in range(k) if (j+1) in edge or sz[j]>=30])   # 夹缝里的白洞（≥30像素）也算背景
  fg=~bg;fg=ndimage.binary_opening(fg,iterations=1)
  lb2,k2=ndimage.label(fg);s2=ndimage.sum(fg,lb2,range(1,k2+1));fg=np.isin(lb2,[j+1 for j in range(k2) if s2[j]>300])
  core=ndimage.binary_erosion(fg,iterations=2);ring=fg&~core
  a=np.where(core,1.,0.);a[ring]=np.clip(dh[ring]/90,0,1)   # 边缘按离白色多远给半透明
  a=np.maximum(a,ndimage.gaussian_filter(core.astype(float),.5)*core)
  f=np.clip(a,1e-3,1)[...,None];rgb=np.clip((h-255*(1-f))/f,0,255)   # 去掉混进来的白
  ys,xs=np.where(a>.05);o=(slice(ys.min(),ys.max()+1),slice(xs.min(),xs.max()+1))
  im=Image.fromarray(np.dstack([rgb,a*255]).astype(np.uint8)[o],'RGBA');im.thumbnail((700,900),Image.LANCZOS);im.save(dst,quality=90)
if __name__=='__main__': cut(sys.argv[1],sys.argv[2])
