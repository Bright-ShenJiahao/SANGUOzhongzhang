import os as _o;_B=_o.path.dirname(_o.path.abspath(__file__))
import sys;sys.path.insert(0,_B)
from full2 import *
import full2
ws=Image.open(_B+'/原始素材/武器表_1cc91d68.png')
def add(name,box,grip,scale,kill=None):
    p,m=keyed(ws.crop(box))
    if kill is not None:
        yy,xx=np.mgrid[:m.shape[0],:m.shape[1]];m=m.copy();m[kill(xx,yy,p)]=0
    if name.startswith('bow'):
        from PIL import ImageDraw
        mb=m>0;wood=ndimage.binary_dilation(ndimage.binary_opening(mb,iterations=2),iterations=2)&mb
        ys,xs=np.nonzero(wood);top=(int(xs[ys.argmin()]),int(ys.min()));bot=(int(xs[ys.argmax()]),int(ys.max()))
        ys2,xs2=np.nonzero(mb);apex=(int(xs2.min()),int(ys2[xs2.argmin()]))
        L=Image.new('L',(m.shape[1],m.shape[0]),0);dr=ImageDraw.Draw(L)
        pts=[top,bot] if name=='bow0' else [top,apex,bot]
        dr.line(pts,fill=255,width=3);ln=np.asarray(L)>0
        p=p.copy();p[ln&~wood]=(232,224,190);m=(wood|ln).astype(float)
    WEP[name]=((p,m),grip,m.shape[1]*scale,m.shape[1])
add('fan',(1140,66,1410,216),(48,74),0.36,lambda x,y,p:((x<64)&(y>89))|ndimage.binary_dilation((p[...,0]>150)&(p[...,1]<70)&(p[...,2]<90)&(x<70),iterations=3))
add('fu',(880,365,1026,434),(18,35),0.34)
add('stone',(1238,372,1313,432),(37,28),0.30)
add('bow0',(160,540,250,800),(66,130),0.42)
add('bow1',(460,550,630,790),(150,120),0.42)
add('bow2',(800,552,1020,788),(198,118),0.42)
_orig=full2.compose
def fix_holes(out):
    al=out[...,3]>0;enc=ndimage.binary_fill_holes(al)&~al
    lab,n=ndimage.label(enc)
    if n:
        sz=np.bincount(lab.ravel());small=np.isin(lab,np.nonzero(sz<=30)[0])&(lab>0)
        idx=ndimage.distance_transform_edt(~al,return_distances=False,return_indices=True)
        out[small]=out[idx[0][small],idx[1][small]]
    return out
EMPTY={(1,3),(1,5)}
def compose(key,wname):
    if wname in('fu','stone') and key in EMPTY:wname=None
    if wname=='stone':
        c,A,hole,info=cells[key];out=_orig(key,None)
        d=info['d'];g=[x for x in info['gaps'] if x<info['tmin']+(info['tmax']-info['tmin'])*0.6]
        tg=(g[0] if g else info['tmin']-6)+9
        W=weapon('stone',0,info['c']+d*tg+OFF);m=W[...,3]>0;out[m]=W[m];return fix_holes(out)
    return fix_holes(_orig(key,wname))
BOW=[((138,118),22,'bow2'),((126,119),22,'bow0'),((142,94),0,'bow2'),((133,97),0,'bow0'),((125,94),0,'bow2'),
     ((132,95),0,'bow0'),((112,102),0,'bow1'),((22,94),180,'bow0'),((130,72),-28,'bow2'),((130,52),-28,'bow0')]
def compose_bow(cx):
    out=_orig((3,cx),None);base=out.copy()
    (hx,hy),th,nm=BOW[cx];pos=(hx+OFF,hy+OFF)
    W=weapon(nm,th,pos);m=W[...,3]>0
    yy,xx=np.mgrid[:CAN,:CAN];hm=((xx-pos[0])**2+(yy-pos[1])**2<=9**2)&(base[...,3]>0)
    m&=~hm;out[m]=W[m];return out
if __name__=='__main__':
    bg=np.array([70,110,70.])
    def tile(o,box):
        o=o[box[1]:box[3],box[0]:box[2]];return Image.fromarray((o[...,:3]*o[...,3:]+bg*(1-o[...,3:])).astype(np.uint8))
    box=(40,80,440,380)
    rows=['fan','fu','stone','bow','quan']
    sh=Image.new('RGB',(400*5,300*2*len(rows)),(70,110,70))
    for i,w in enumerate(rows):
        for cx in range(10):
            o=compose_bow(cx) if w=='bow' else compose((4,cx),None) if w=='quan' else compose((1,cx),w)
            sh.paste(tile(o,box),((cx%5)*400,(i*2+cx//5)*300))
    sh.save('t/all2.png')
    for i in range(len(rows)):sh.crop((0,i*600,2000,i*600+600)).save(f't/q{i}.png')
