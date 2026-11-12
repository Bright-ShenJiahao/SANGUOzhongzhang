import sys, numpy as np
from PIL import Image
from scipy import ndimage
K=np.ones((3,3),bool)
def fix(a):
    a=a.copy(); on=a[...,3]>0
    D=ndimage.distance_transform_cdt(np.pad(on,1),metric='taxicab')[1:-1,1:-1]
    lum=a[...,:3].astype(float)@[.3,.59,.11]; dark=(lum<60)&on
    # 1) 外两圈都是黑的 → 削掉最外一圈
    kill=(D==1)&dark&ndimage.binary_dilation(dark&(D==2),K)
    a[kill,3]=0; on=a[...,3]>0
    D=ndimage.distance_transform_cdt(np.pad(on,1),metric='taxicab')[1:-1,1:-1]
    lum=a[...,:3].astype(float)@[.3,.59,.11]
    # 2) 剩下的外圈黑线染成里面颜色的深色（和黄巾兵一样的有色描边）
    edge=(D==1)&(lum<60)
    inner=(D>=3)&on&(lum>=60)
    if inner.any():
        src=np.where(inner[...,None],a[...,:3].astype(float),0); w=inner.astype(float)
        k=np.ones((7,7))
        s=np.stack([ndimage.convolve(src[...,c],k,mode='constant') for c in range(3)],-1); n=ndimage.convolve(w,k,mode='constant')
        col=s/np.maximum(n,1e-6)[...,None]*0.32
        ok=edge&(n>0)
        a[ok,:3]=col[ok].clip(0,255)
    return a
if __name__=='__main__':
    for p in sys.argv[1:]:
        Image.fromarray(fix(np.asarray(Image.open(p).convert('RGBA')))).save(p)
