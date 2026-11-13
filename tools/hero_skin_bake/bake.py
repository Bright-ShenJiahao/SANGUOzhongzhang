import os as _o;_B=_o.path.dirname(_o.path.abspath(__file__))
import sys,json;sys.path.insert(0,_B)
from dao20 import *
import full2
CC=[0,1,2,3,8,4,5,6,7,9]
def bodyrc(i,row):
    return (0,CC[i]) if i<10 else (row,i-10)
def body(r,c):
    o=full2.compose((r,c),None)
    if r==0 and c in SPOT:o=deface(o,c)
    return o
def bake_frame(f,r,c):
    base=body(r,c);out=base.copy()
    if not f['v'] or f['hide']:return out
    pos=(f['x']+OFF,f['y']+OFF);W=weapon(f['v'],f['a'],pos);m=W[...,3]>0
    if str(f['v']).startswith('bow'):
        ba=base[...,3]>0;ys=np.nonzero(ba.any(1))[0]
        if len(ys):
            head=np.zeros_like(ba);head[ys[0]:ys[0]+int((ys[-1]-ys[0])*0.45)]=True
            string=m&(W[...,:3].min(-1)>140)&(W[...,0]>190)
            m&=~(ndimage.binary_dilation(string,iterations=1)&(W[...,:3].min(-1)>110)&ba&head)
    if f['front']:
        if f['cover']>0:
            yy,xx=np.mgrid[:CAN,:CAN];a=math.radians(f['a']);dx,dy=math.cos(a),math.sin(a)
            for t in ([-f['hands'],f['hands']] if f['hands']>0 else [0]):
                m&=~(((xx-pos[0]-dx*t)**2+(yy-pos[1]-dy*t)**2<=f['cover']**2)&(base[...,3]>0))
        out[m]=W[m]
    else:
        m&=base[...,3]==0;out[m]=W[m]
    return out
ROW={'dao':1,'jian':1,'chui':1,'spear':2,'guandao':2,'bow':3,'stone':1,'fu':1,'fan':1,'quan':4}
def sheet(data,key,name):
    bg=np.array([70,110,70.]);sh=Image.new('RGB',(2400 if key in('spear','guandao') else 2000,1200),(70,110,70));d=ImageDraw.Draw(sh)
    for i,f in enumerate(data['sets'][key]):
        o=bake_frame(f,*bodyrc(i,ROW[key]))[80:380,(0 if key in('spear','guandao') else 40):(480 if key in('spear','guandao') else 440)]
        t=Image.fromarray((o[...,:3]*o[...,3:]+bg*(1-o[...,3:])).astype(np.uint8));cw=t.width;x=(i%5)*cw;y=(i//5)*300;sh.paste(t,(x,y));d.text((x+12,y+8),str(i+1),fill=(255,255,120),font_size=28)
    sh.save(name)
if __name__=='__main__':
    data=json.load(open(_B+'/原始素材/ada619f6-attachment.txt'))
    sheet(data,'chui','锤_20帧_v1.png');sheet(data,'spear','长枪_20帧_v1.png')
