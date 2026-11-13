import os as _o;_B=_o.path.dirname(_o.path.abspath(__file__))
import sys;sys.path.insert(0,_B)
from full3 import *
from full3 import _orig
from PIL import ImageDraw
SPOT={5:((92,155),9),6:((66,141),9)}
def deface(out,col):
    (cx,cy),r=SPOT[col];cx+=OFF;cy+=OFF
    rgb=out[...,:3];al=out[...,3]>0;yy,xx=np.mgrid[:CAN,:CAN];dist=np.hypot(xx-cx,yy-cy)
    skin=al&(rgb[...,0]>170)&(rgb[...,0]>rgb[...,1]+25)&(rgb[...,1]>rgb[...,2]+12)
    dark=al&(rgb.max(-1)<105)&(dist<=r)
    lab,n=ndimage.label(dark);keep=np.zeros_like(dark)
    for k in range(1,n+1):
        c=lab==k
        if c.sum()>=6 and np.hypot(xx[c].mean()-cx,yy[c].mean()-cy)<r*0.6:keep|=c
    grow=ndimage.binary_dilation(keep,iterations=2)&al&~skin&(dist<=r+1)&(rgb.max(-1)<175)
    m=keep|grow
    ring=skin&(dist<=r+4)&~m
    out[m,:3]=np.median(rgb[ring],axis=0)
    return out
def common(col,w,place):
    out=_orig((0,col),None)
    if col in SPOT:out=deface(out,col)
    if place is None:return out
    (hx,hy),ang,hand=place;base=out.copy();pos=(hx+OFF,hy+OFF)
    W=weapon(w,ang,pos);m=W[...,3]>0
    if hand==2:m&=(base[...,3]==0)
    if hand==1:
        yy,xx=np.mgrid[:CAN,:CAN];m&=~(((xx-pos[0])**2+(yy-pos[1])**2<=8**2)&(base[...,3]>0))
    out[m]=W[m];return out
DAO={0:((76,128),32,1),1:((75,117),35,1),2:((80,130),35,1),3:((68,124),35,1),8:((62,126),55,1),9:((100,166),0,0)}
def sheet(w,row,PL,name):
    order=[('c',0),('c',1),('c',2),('c',3),('c',8),('c',4),('c',5),('c',6),('c',7),('c',9)]+[('a',i) for i in range(10)]
    bg=np.array([70,110,70.]);sh=Image.new('RGB',(2000,1200),(70,110,70));d=ImageDraw.Draw(sh)
    for i,(k,c) in enumerate(order):
        o=common(c,w,PL.get(c)) if k=='c' else compose((row,c),w)
        o=o[80:380,40:440];t=Image.fromarray((o[...,:3]*o[...,3:]+bg*(1-o[...,3:])).astype(np.uint8))
        x=(i%5)*400;y=(i//5)*300;sh.paste(t,(x,y));d.text((x+12,y+8),str(i+1),fill=(255,255,120),font_size=28)
    sh.save(name)
if __name__=='__main__':sheet('dao',1,DAO,'刀_20帧_编号.png')

def variants():
    bg=np.array([70,110,70.]);sh=Image.new('RGB',(1200,600),(70,110,70));d=ImageDraw.Draw(sh)
    V=[('A',{1:((75,117),35,1),3:((68,124),35,1)}),('B',{1:((75,117),35,1),3:((68,124),35,1)}),('C',{1:((128,115),-118,2),3:((123,117),-118,2)})]
    for i,(nm,pl) in enumerate(V):
        for j,c in enumerate((1,3)):
            o=common(c,'dao',pl[c])[80:380,90:390];t=Image.fromarray((o[...,:3]*o[...,3:]+bg*(1-o[...,3:])).astype(np.uint8))
            sh.paste(t.resize((400,400),Image.NEAREST).crop((0,50,400,350)),(i*400,j*300))
        d.text((i*400+12,8),nm,fill=(255,255,120),font_size=34)
    sh.save('走路拿刀_三种方案.png')
