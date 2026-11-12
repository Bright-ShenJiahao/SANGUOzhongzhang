"""把主角图集的头发/短裤（低饱和暗灰）、皮肤、白衣的颜色对齐到基准图集。
用法：python3 tools/hero_match.py 基准前缀 前缀 [前缀...]   例：python3 tools/hero_match.py chui_ wd_ qiang_"""
import sys, numpy as np
from PIL import Image
S=['idle','walk1','walk2','walk3','hurt','roll1','roll2','roll3','roll4','down','chop1','chop2','sweep1','sweep2','thrust1','thrust2','spin1','spin2','up1','up2']
D='art/sprites/hero/'
def load(p,s): return np.asarray(Image.open(f'{D}{p}{s}.png').convert('RGBA')).astype(float)
L=lambda a:a[...,0]*.299+a[...,1]*.587+a[...,2]*.114
def masks(a):
    op=a[...,3]>0; R,G,B=a[...,0],a[...,1],a[...,2]; mx=a[...,:3].max(-1); mn=a[...,:3].min(-1); l=L(a)
    grey=op&(mx-mn<34)&(l<125)&(l>8)                                   # 头发、短裤（不含纯黑描边）
    skin=op&(R>G)&(G>=B)&(R-B>30)&(R>120)&(G>R*.5)                     # 皮肤（含阴影）
    clear=op&(R>170)&(R>G)&(G>B)&(R-B>45)&(G>R*.55)                    # 亮部皮肤，用来测量
    shirt=op&(mn>175)&(mx-mn<50)
    return grey,skin,clear,shirt
def stats(p):
    g,c,w=[],[],[]
    for s in S:
        a=load(p,s); gm,_,cm,wm=masks(a); g.append(a[gm][:,:3]); c.append(a[cm][:,:3]); w.append(a[wm][:,:3])
    g,c,w=map(np.concatenate,(g,c,w)); return g,c.mean(0),w.mean(0)
q=np.linspace(0,100,101)
ref=sys.argv[1]; rg,rc,rw=stats(ref); rgl=np.percentile(L(rg),q); rtint=rg.mean(0)/rg.mean()
for p in sys.argv[2:]:
    sg,sc,sw=stats(p); sgl=np.percentile(L(sg),q); kc=np.clip(rc/sc,.8,1.25); kw=np.clip(rw/sw,.85,1.15)
    for s in S:
        a=load(p,s); gm,km,_,wm=masks(a); l=L(a)
        nl=np.interp(l,sgl,rgl)
        for c in range(3):
            v=a[...,c]
            v=np.where(gm,nl*rtint[c],v)
            v=np.where(km&~gm,v*kc[c],v)
            v=np.where(wm,v*kw[c],v)
            a[...,c]=v
        Image.fromarray(np.clip(a,0,255).astype('uint8')).save(f'{D}{p}{s}.png')
    g2,c2,w2=stats(p)
    print(p.ljust(9),'头发',g2.mean(0).round(),'皮肤',c2.round(),'白衣',w2.round())
print('基准'.ljust(8),ref,'头发',rg.mean(0).round(),'皮肤',rc.round(),'白衣',rw.round())
