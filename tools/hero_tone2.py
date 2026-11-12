"""主角图集明暗校准（以无兵器的拳 quan_ 为基准）：
- 灰色类（头发、短裤、描边）：亮度分位数匹配，保持色相
- 白衣：各通道均值对齐基准白衣，去掉偏粉/偏灰
用法：python3 tools/hero_tone2.py 前缀 [前缀...]"""
import sys, numpy as np
from PIL import Image
S=['idle','walk1','walk2','walk3','hurt','roll1','roll2','roll3','roll4','down','chop1','chop2','sweep1','sweep2','thrust1','thrust2','spin1','spin2','up1','up2']
D='art/sprites/hero/'; REF='quan_'
def load(p,s): return np.asarray(Image.open(f'{D}{p}{s}.png').convert('RGBA')).astype(float)
L=lambda a:a[...,0]*.299+a[...,1]*.587+a[...,2]*.114
def grey(a): mx=a[...,:3].max(-1); mn=a[...,:3].min(-1); return (a[...,3]>0)&(mx-mn<32)&(mx<185)
def shirt(a): mx=a[...,:3].max(-1); mn=a[...,:3].min(-1); return (a[...,3]>0)&(mn>175)&(mx-mn<50)
def gl(p): return np.concatenate([L(a)[grey(a)] for a in (load(p,s) for s in S)])
def sc(p): return np.concatenate([a[shirt(a)][:,:3] for a in (load(p,s) for s in S)]).mean(0)
q=np.linspace(0,100,101); rg=np.percentile(gl(REF),q); rs=sc(REF)
for p in sys.argv[1:]:
    sg=np.percentile(gl(p),q); ks=rs/sc(p)
    for s in S:
        a=load(p,s); l=L(a); g=grey(a); w=shirt(a)
        k=np.where(g,np.interp(l,sg,rg)/np.maximum(l,1),1)
        for c in range(3): a[...,c]=np.where(w,a[...,c]*ks[c],a[...,c]*k)
        Image.fromarray(np.clip(a,0,255).astype('uint8')).save(f'{D}{p}{s}.png')
    print(p,'灰类中位',np.median(gl(p)).round(),'基准',np.median(gl(REF)).round(),'| 白衣',sc(p).round(),rs.round())
