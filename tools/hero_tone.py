"""主角图集调色：皮肤按刀(wd_)按比例校准 + 头发深灰压到刀的水平。用法：python3 tools/hero_tone.py 前缀 [前缀...]"""
import sys, numpy as np
from PIL import Image
S=['idle','walk1','walk2','walk3','hurt','roll1','roll2','roll3','roll4','down','chop1','chop2','sweep1','sweep2','thrust1','thrust2','spin1','spin2','up1','up2']
SS=['idle','walk1','walk2','walk3','hurt','chop2','thrust2']; ST=['idle','walk1','walk2','walk3']
D='art/sprites/hero/'
def load(p,s): return np.asarray(Image.open(f'{D}{p}{s}.png').convert('RGBA')).astype(float)
def clear(a): R,G,B=a[...,0],a[...,1],a[...,2]; return (a[...,3]>0)&(R>170)&(R>G)&(G>B)&(R-B>45)&(G>R*.55)
def warm(a): R,G,B=a[...,0],a[...,1],a[...,2]; return (a[...,3]>0)&(R>G)&(G>=B)&(R-B>30)
def darkm(a): mx=a[...,:3].max(-1); mn=a[...,:3].min(-1); return (a[...,3]>0)&(mx<135)&(mx-mn<40)&(mx>15)
def skin(p): return np.concatenate([(lambda a:a[clear(a)][:,:3])(load(p,s)) for s in SS]).mean(0)
def hair(p):
    v=[]
    for s in ST:
        a=load(p,s); t=np.nonzero(a[...,3].any(1))[0][0]; r=np.zeros(a.shape[:2],bool); r[t:t+12]=True; v.append(a[darkm(a)&r][:,:3])
    return np.concatenate(v).mean(0)
rs,rh=skin('wd_'),hair('wd_')
for p in sys.argv[1:]:
    k=np.clip(rs/skin(p),.8,1.2); kh=rh.mean()/hair(p).mean()*.95
    for s in S:
        a=load(p,s); m=warm(a)
        for c in range(3): a[...,c]=np.where(m,np.clip(a[...,c]*k[c],0,255),a[...,c])
        m=darkm(a); g=a[...,:3].mean(-1)
        for c in range(3): a[...,c]=np.where(m,np.clip(g*kh*(rh[c]/rh.mean()),0,255),a[...,c])
        Image.fromarray(a.astype('uint8')).save(f'{D}{p}{s}.png')
    print(p,'皮肤',skin(p).round(),'头发',hair(p).round(),'| 刀',rs.round(),rh.round())
