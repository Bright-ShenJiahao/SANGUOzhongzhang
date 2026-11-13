import os as _o;_B=_o.path.dirname(_o.path.abspath(__file__))
import sys,json;sys.path.insert(0,_B)
import bake
from bake import *
SKPATH=__import__('os').environ.get('SKIN',_B+'/原始素材/红衣黑甲_1c0c7751.png');SK=np.asarray(Image.open(SKPATH).convert('RGB')).astype(float);C2=SK.shape[0]/5
print(SK.shape)
_cache={}
def body2(r,c):
    if (r,c) in _cache:return _cache[(r,c)].copy()
    MG=int(__import__('os').environ.get('MARGIN','0'))
    x0=int(round(c*SK.shape[1]/10));y0=int(round(r*C2));W_=176+2*MG
    q=np.zeros((176,W_,3));q[:]=(255,0,255)
    xa=max(0,x0-MG);xb=min(SK.shape[1],x0+176+MG);ya=y0;yb=min(SK.shape[0],y0+176)
    q[:yb-ya,xa-(x0-MG):xa-(x0-MG)+(xb-xa)]=SK[ya:yb,xa:xb];p=q
    R,G,B=p[...,0],p[...,1],p[...,2];bgm=(R-G>45)&(B-G>45)&(B>150)
    STRICT=bool(__import__('os').environ.get('STRICT'))
    if STRICT:bgm=(R>150)&(B>150)&(G<0.45*np.minimum(R,B))
    lab,n=ndimage.label(ndimage.binary_dilation(~bgm,iterations=4))
    if n>1:bgm|=lab!=(np.argmax(np.bincount(lab.ravel())[1:])+1)
    p=p.copy();R,G,B=p[...,0],p[...,1],p[...,2]
    for _ in range(3):
        near=ndimage.binary_dilation(bgm,iterations=1)&~bgm
        pur=near&(R-G>22)&(B-G>22)
        kill=pur&((np.maximum(R,B)>135)|((R-G>60)&(B-G>60)))
        if STRICT:kill=pur&((G<110)|((R-G>90)&(B-G>90)))
        bgm|=kill
    edge=ndimage.binary_dilation(bgm,iterations=3)&~bgm&(R-G>14)&(B-G>14)
    R[edge]=np.minimum(R[edge],G[edge]+10);B[edge]=np.minimum(B[edge],G[edge]+12)
    if STRICT:
        lav=~bgm&(((R-G>18)&(B-G>18)&(G>105))|((R-G>32)&(B-G>32)))
        R[lav]=G[lav]+4;B[lav]=np.minimum(B[lav],G[lav]+(8 if __import__('os').environ.get('NEUTRAL') else 38))
    lab2,n2=ndimage.label(~bgm)
    for k in set(lab2[0][lab2[0]>0])|set(lab2[-1][lab2[-1]>0]):
        if (lab2==k).sum()<200:bgm|=lab2==k
    sz2=np.bincount(lab2.ravel());bgm|=np.isin(lab2,np.nonzero(sz2<8)[0])&(lab2>0)
    out=np.zeros((CAN,CAN,4));out[OFF:OFF+176,OFF-MG:OFF+176+MG,:3]=p*(~bgm)[...,None];out[OFF:OFF+176,OFF-MG:OFF+176+MG,3]=~bgm
    _cache[(r,c)]=out;return out.copy()
bake.body=body2
def magenta_left(o):
    a=o[...,3]>0;R,G,B=o[...,0],o[...,1],o[...,2]
    return int((a&(R-G>40)&(B-G>40)&(B>110)).sum())
if __name__=='__main__':
    import os
    data=json.load(open('align_v5.json'));pre=os.environ.get('PRE','盔甲')
    bad=[(r,c,magenta_left(body2(r,c))) for r in range(5) for c in range(10)];bad=[b for b in bad if b[2]>0]
    print(pre,'cells with magenta left:',bad)
    at=np.zeros((5*176,10*176,4),np.uint8)
    for r in range(5):
        for c in range(10):
            o=body2(r,c)[OFF:OFF+176,OFF:OFF+176];at[r*176:(r+1)*176,c*176:(c+1)*176,:3]=np.clip(o[...,:3],0,255);at[r*176:(r+1)*176,c*176:(c+1)*176,3]=o[...,3]*255
    Image.fromarray(at,'RGBA').save('tool/'+os.environ.get('ATLAS','frames_armor.png'))
    os.makedirs('out',exist_ok=True)
    for k,n in [x for x in (('dao','刀'),('jian','剑'),('chui','锤'),('spear','长枪'),('guandao','关刀'),('bow','弓'),('stone','石子'),('fu','黄符'),('fan','羽扇'),('quan','拳')) if not os.environ.get('ONLY') or x[0]==os.environ['ONLY']]:bake.sheet(data,k,f'out/{pre}_{n}_20帧.png')
