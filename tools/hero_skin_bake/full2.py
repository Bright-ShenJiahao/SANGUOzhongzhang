import os as _o;_B=_o.path.dirname(_o.path.abspath(__file__))
from PIL import Image
import numpy as np, math
from scipy import ndimage
SRC=_B+'/原始素材/蓝棍50帧总表_4403a7f1.png'
S=176;C=887/5;CAN=480;OFF=152
a=np.asarray(Image.open(SRC).convert('RGB')).astype(float)
FLIP={(1,4)}
FORCE_DARK={(1,1)}
PATCH={
 (2,6):[('band',-65,-49,-3.2,4.5,(116,117,5)),('tline',-49,-3.4,-65,-3.4,0.8),('tline',-65,-3.4,-66.5,5.5,0.8)],
 (2,9):[('deblue',-68,-27,4.5,(98,96,5)),('skin',109,79,6),('clear',26,124,46,141,'red')],
}
def cell(ry,cx):
    x0=int(round(cx*C));y0=int(round(ry*C));p=a[y0:y0+176,x0:x0+176]
    r,g,b=p[...,0],p[...,1],p[...,2]
    bgm=(r-g>45)&(b-g>45)
    blue=(b>r+60)&(b>g+40)&~bgm
    red=(r>170)&(g<80)&(b<90)
    red&=ndimage.binary_dilation(blue,iterations=6)
    rod=blue|red
    dark=(np.maximum(np.maximum(r,g),b)<80)
    blu2=(b>r+18)&(b>g+12)
    skin0=(r>170)&(r>g+25)&(g>b+12)&~bgm
    nearskin=ndimage.binary_dilation(skin0,iterations=3)
    rem=rod|(ndimage.binary_dilation(rod,iterations=2)&dark&~nearskin)|(ndimage.binary_dilation(rod,iterations=9)&(blu2|((r>g+90)&(r>b+70))))
    lab,n=ndimage.label(ndimage.binary_dilation((~bgm)|rem,iterations=4))
    if n>1:
        big_=np.argmax(np.bincount(lab.ravel())[1:])+1;keep=lab==big_;bgm=bgm|~keep;rod&=keep;red&=keep;rem&=keep
    info=None
    if rod.sum()>40:
        ys,xs=np.nonzero(rod);pts=np.stack([xs,ys],1).astype(float);c=pts.mean(0)
        u,s,vt=np.linalg.svd(pts-c,full_matrices=False);d=vt[0]
        if red.sum()>3:
            ry_,rx_=np.nonzero(red);
            if (np.array([rx_.mean(),ry_.mean()])-c)@d<0:d=-d
        if (ry,cx) in FLIP:d=-d
        t=(pts-c)@d;tmin,tmax=np.percentile(t,1),np.percentile(t,99)
        hist=np.zeros(int(tmax-tmin)+1);np.add.at(hist,np.clip((t-tmin).astype(int),0,len(hist)-1),1)
        gaps=[];i=0
        while i<len(hist):
            if hist[i]==0:
                j=i
                while j<len(hist) and hist[j]==0:j+=1
                if j-i>=5:gaps.append((i+j)/2+tmin)
                i=j
            else:i+=1
        info=dict(c=c,d=d,tmin=tmin,tmax=tmax,gaps=list(gaps))
    filled=np.zeros(p.shape[:2],bool);pp=p.copy()
    if info is not None:
        yy,xx=np.mgrid[:176,:176];c=info['c'];d=info['d'];nrm=np.array([-d[1],d[0]])
        tt=(xx-c[0])*d[0]+(yy-c[1])*d[1];pd=(xx-c[0])*nrm[0]+(yy-c[1])*nrm[1]
        ys,xs=np.nonzero(rod);hw=np.percentile(np.abs((xs-c[0])*nrm[0]+(ys-c[1])*nrm[1]),90)
        cor=(np.abs(pd)<=hw+2.5)&(tt>=info['tmin']-9)&(tt<=info['tmax']+9)
        redish=((r>g+70)&(r>b+50)&(g<120))|((r>g+28)&(r>b+28)&(g<100))
        red1=(r>g+70)&(r>b+50)&(g<120)
        rem=rem|(cor&(blu2|red1|(dark&~nearskin&ndimage.binary_dilation(rod,iterations=3))))
        rem&=~bgm
        e1=c+d*info['tmin'];e2=c+d*info['tmax']
        disk=((xx-e1[0])**2+(yy-e1[1])**2<=(hw+7)**2)|((xx-e2[0])**2+(yy-e2[1])**2<=(hw+7)**2)
        skinl=(r>170)&(r>g+25)&(g>b+12)
        keepdark=dark&ndimage.binary_dilation(skinl,iterations=2)
        capz=disk&ndimage.binary_dilation(rem,iterations=7)
        rem|=capz&~bgm&~skinl&~keepdark
        if (ry,cx) in FORCE_DARK:
            mx0=np.maximum(np.maximum(r,g),b)
            rem&=~((mx0>=30)&(mx0<95)&(np.abs(r-g)<14)&(np.abs(g-b)<20)&(b<=r+12)&~rod)
        ok=~bgm&~rem
        zone=ndimage.binary_dilation(rem,iterations=5)
        # cap remnants: small skin-coloured islands living entirely next to the rod
        lab,n=ndimage.label(ok&skinl)
        for k in range(1,n+1):
            cm=lab==k
            if cm.sum()<70 and zone[cm].all() and (r[cm]-g[cm]).mean()>78:rem|=cm
        lab,n=ndimage.label(ok&dark&zone)
        if n:
            sz=np.bincount(lab.ravel());rem|=np.isin(lab,np.nonzero(sz<=8)[0])&(lab>0)&~nearskin
        handz=ndimage.binary_dilation(skin0&ndimage.binary_dilation(rod,iterations=6),iterations=9)
        mxh=np.maximum(np.maximum(r,g),b)
        strict=rod|(blu2&(mxh>70)&ndimage.binary_dilation(rod,iterations=1))
        strict|=dark&ndimage.binary_dilation(rod,iterations=2)&~ndimage.binary_dilation(skin0,iterations=2)
        protect=handz&~strict&(skin0|(dark&nearskin&(b<110)))
        rem&=~protect
        ok=~bgm&~rem
        st=ndimage.generate_binary_structure(2,2)
        closed=ndimage.binary_closing(np.pad(ok,12),structure=st,iterations=int(hw)+4)[12:-12,12:-12]
        dens=ndimage.uniform_filter(ok.astype(float),13);bgd=ndimage.uniform_filter(bgm.astype(float),13)
        inside=rem&(dens>0.28)&(dens>bgd)
        def side(sgn):
            v=np.zeros(rem.shape,bool)
            for off in (hw+4,hw+7,hw+10,hw+14):
                sx=np.clip(np.rint(xx+sgn*nrm[0]*off).astype(int),0,175);sy=np.clip(np.rint(yy+sgn*nrm[1]*off).astype(int),0,175);v|=ok[sy,sx]
            return v
        inside|=rem&side(1)&side(-1)
        mx=np.maximum(np.maximum(r,g),b)
        srcm=ok&~ndimage.binary_dilation(rem,iterations=3)&(mx>=28)&~((mx<75)&(r>g+10))
        if srcm.sum()<50:srcm=ok
        Pn=np.where(srcm[...,None],p,np.nan)
        M=np.dstack([ndimage.generic_filter(Pn[...,k],np.nanmedian,size=5,mode='nearest') for k in range(3)])
        M=np.where(np.isnan(M),p,M)
        lab,n=ndimage.label(inside)
        for k in range(1,n+1):
            cm=lab==k;ring=ndimage.binary_dilation(cm,iterations=6)&srcm
            cls=srcm
            if ring.sum()>=12:
                med=np.median(p[ring],axis=0)
                if med[0]>170 and med[0]>med[1]+25 and med[1]>med[2]+12 and (ry,cx) not in FORCE_DARK:
                    ns=ring&~skin0
                    if ns.sum()>=14 and dens[cm].mean()>0.42:
                        med=np.median(p[ns],axis=0)
                    else:
                        inside&=~cm;continue
                c2=srcm&(np.abs(p-med).sum(-1)<90)&ndimage.binary_dilation(cm,iterations=14)
                if c2.sum()>=12:cls=c2
            if (ry,cx) in FORCE_DARK:
                c3=srcm&(mx<95)&(np.abs(r-g)<14)&ndimage.binary_dilation(cm,iterations=16)
                if c3.sum()>=12:cls=c3
            idx=ndimage.distance_transform_edt(~cls,return_distances=False,return_indices=True)
            pp[cm]=M[idx[0][cm],idx[1][cm]]
        filled=inside
        if (ry,cx)==(1,2):
            # manual rebuild where the rod tail crossed the shirt edge (frame 13 of the one-hand set)
            band=(np.abs(pd)<=hw+2.0)&(tt>=info['tmin']-9)&(tt<=info['tmax']+7)&(xx>=72)&(xx<=116)
            wide=(np.abs(pd)<=hw+6)&(xx>=72)&(xx<=116)&(rem|filled)
            edge=86-(yy-110)*(3/9.0)
            light=(np.minimum(np.minimum(r,g),b)>150)&~bgm&~rem
            shirt_med=np.median(p[light&(xx>88)&(xx<110)&(yy>96)&(yy<130)],axis=0)
            col=np.zeros_like(p);col[:]=shirt_med
            for sgn in (1,-1):
                off=hw+4.5-sgn*pd
                sx=np.clip(np.rint(xx+sgn*nrm[0]*off).astype(int),0,175);sy=np.clip(np.rint(yy+sgn*nrm[1]*off).astype(int),0,175)
                pass
            air=(band|wide)&(xx<edge-1);line=band&(xx>=edge-1)&(xx<edge+1);sh_=band&(xx>=edge+1)
            halo=(yy>=116)&(yy<=125)&(xx>=74)&(xx<edge-1)&(np.minimum(np.minimum(pp[...,0],pp[...,1]),pp[...,2])>120)
            air|=halo;line|=(yy>=116)&(yy<=122)&(xx>=edge-1)&(xx<edge+1)&ndimage.binary_dilation(halo,iterations=2)
            pp[sh_]=col[sh_];pp[line]=(28,10,24)
            rem=(rem&~band)|air;filled=((filled&~band)|sh_|line)&~air
            bgm=bgm&~(sh_|line)
    m=((~bgm&~rem)|filled).astype(float);hole=(rem&~bgm).astype(float)
    if (ry,cx) in PATCH and info is not None:
        yy,xx=np.mgrid[:176,:176];c=info['c'];d=info['d'];nrm=np.array([-d[1],d[0]])
        tt=(xx-c[0])*d[0]+(yy-c[1])*d[1];pd=(xx-c[0])*nrm[0]+(yy-c[1])*nrm[1]
        src0=pp.copy();m0=m.copy()
        for op in PATCH[(ry,cx)]:
            k=op[0]
            if k=='band':   # flat fill of a strip along the rod with a colour sampled nearby
                _,t0,t1,p0,p1,(sx_,sy_,sr_)=op
                band=(tt>=t0)&(tt<=t1)&(pd>=p0)&(pd<=p1)
                R_,G_,B_=src0[...,0],src0[...,1],src0[...,2]
                smp=((xx-sx_)**2+(yy-sy_)**2<=sr_**2)&(m0>0)&(R_>170)&(R_>G_+25)&(G_>B_+12)
                pp[band]=np.median(src0[smp],axis=0);m[band]=1
            elif k=='deblue':   # recolour bluish/greyish translucent rod pixels to skin, keeping their shading
                _,t0,t1,half,(sx_,sy_,sr_)=op
                band=(tt>=t0)&(tt<=t1)&(np.abs(pd)<=half)
                R_,G_,B_=src0[...,0],src0[...,1],src0[...,2]
                smp=((xx-sx_)**2+(yy-sy_)**2<=sr_**2)&(m0>0)&(R_>170)&(R_>G_+25)&(G_>B_+12)
                med=np.median(src0[smp],axis=0);lum=src0.mean(-1)
                odd=band&(m0>0)&(B_>G_-8)&(src0.max(-1)>80)
                pp[odd]=np.clip(med[None,:]*np.clip(lum[odd]/med.mean(),0.72,1.08)[:,None],0,255)
                hol=band&(m0==0)&ndimage.binary_fill_holes(m0>0)
                pp[hol]=med*0.9;m[hol]=1
            elif k=='tline':
                _,t0,p0,t1,p1,wd=op
                den=max(1e-6,(t1-t0)**2+(p1-p0)**2);u=np.clip(((tt-t0)*(t1-t0)+(pd-p0)*(p1-p0))/den,0,1)
                ln=np.hypot(tt-(t0+u*(t1-t0)),pd-(p0+u*(p1-p0)))<=wd
                pp[ln]=(30,12,22);m[ln]=1
            elif k=='skin':  # fill removed/odd pixels in a disc with the local skin colour
                _,x,y,rad=op;disc=(xx-x)**2+(yy-y)**2<=rad**2
                R_,G_,B_=src0[...,0],src0[...,1],src0[...,2]
                sk=disc&(m0>0)&(R_>170)&(R_>G_+25)&(G_>B_+12)
                if sk.sum()>4:
                    bad=disc&~sk&~((m0>0)&(src0.max(-1)<60)&ndimage.binary_dilation(~disc|(m0==0),iterations=2))
                    bad&=ndimage.binary_fill_holes(sk|((m0>0)&disc))
                    pp[bad]=np.median(src0[sk],axis=0);m[bad]=1
            elif k=='clear':
                _,x0,y0,x1,y1,mode=op;box=(xx>=x0)&(xx<=x1)&(yy>=y0)&(yy<=y1)
                R_,G_,B_=src0[...,0],src0[...,1],src0[...,2]
                red_=(R_>G_+45)&(R_>B_+45)
                kill=box&(ndimage.binary_dilation(red_&box,iterations=2))
                m[kill]=0
        hole=hole*(m==0)
    return pp*m[...,None],m>0,hole>0,info
cells={(y,x):cell(y,x) for y in range(5) for x in range(10)}
#px=np.concatenate([c[A] for c,A,_,_ in cells.values()]).astype(np.uint8)
#pal=np.array(Image.fromarray(px.reshape(1,-1,3)).quantize(32,method=Image.Quantize.MEDIANCUT,dither=Image.Dither.NONE).getpalette()[:96]).reshape(32,3).astype(float)
def quant(c):return c
def keyed(img):
    p=np.asarray(img.convert('RGB')).astype(float)
    return p,(~((p[...,0]-p[...,1]>45)&(p[...,2]-p[...,1]>45))).astype(float)
ws=Image.open(_B+'/原始素材/武器表_1cc91d68.png');w2=Image.open('weapons_sheet_v2.png')
WEP={ # src, grip(src px), final length px, src length px
 'dao':(keyed(ws.crop((36,100,322,200))),(78,41),120,286),
 'jian':(keyed(ws.crop((415,115,690,170))),(46,27),116,275),
 'chui':(keyed(ws.crop((790,96,1028,188))),(62,45),80,238),
 'spear':(keyed(w2.crop((392,1075,1056,1139))),(250,32),220,664),
 'guandao':(keyed(w2.crop((388,1180,1060,1274))),(240,60),224,672),
}
def fat(src,grip,L,L0,k=1.4,br=1.15):
    p,m=src;p=p.copy();p[m==0]=(34,24,28);h,w=m.shape;nh=int(h*k)
    P=np.asarray(Image.fromarray(p.astype(np.uint8)).resize((w,nh),Image.BICUBIC)).astype(float)
    M=np.asarray(Image.fromarray((m*255).astype(np.uint8)).resize((w,nh),Image.BICUBIC)).astype(float)/255
    return ((np.clip(P*br+12,0,255),(M>0.5).astype(float)),(grip[0],grip[1]*k),L,L0)
for _k in('spear','guandao'):WEP[_k]=fat(*WEP[_k])
def _clean():
    (p,m),g,L,L0=WEP['dao'];m=m.copy()
    red=(p[...,0]>120)&(p[...,1]<80)&(p[...,2]<100)
    yy,xx=np.mgrid[:m.shape[0],:m.shape[1]]
    kill=ndimage.binary_dilation(red,iterations=3)|((xx<58)&(yy>54))|(xx<32)
    m[kill]=0;WEP['dao']=((p,m),g,L,L0)
_clean()
FRONT={(1,4)}
def weapon(name,theta,pos):
    (p,m),grip,L,L0=WEP[name];scale=L/L0
    h,w=m.shape;R=int(math.hypot(w,h))+4
    big=np.zeros((2*R,2*R,4));ox=R-int(grip[0]);oy=R-int(grip[1])
    big[oy:oy+h,ox:ox+w,:3]=p*m[...,None];big[oy:oy+h,ox:ox+w,3]=m*255
    n=int(round(2*R*scale));n+=n%2
    ch=[np.asarray(Image.fromarray(big[...,k].astype(np.float32),'F').rotate(-theta,resample=Image.BILINEAR).resize((n,n),Image.BOX)) for k in range(4)]
    A=ch[3]/255;col=np.clip(np.dstack(ch[:3])/np.maximum(A,1e-3)[...,None],0,255)
    out=np.zeros((CAN,CAN,4));x0=int(round(pos[0]-n/2));y0=int(round(pos[1]-n/2))
    ys,xs=np.nonzero(A>0.4)
    for y,x in zip(ys,xs):
        Y=y0+y;X=x0+x
        if 0<=Y<CAN and 0<=X<CAN: out[Y,X,:3]=col[y,x];out[Y,X,3]=1
    return out
LAST={}
def compose(key,wname):
    c,A,hole,info=cells[key]
    base=np.zeros((CAN,CAN,4));base[OFF:OFF+S,OFF:OFF+S,:3]=quant(c);base[OFF:OFF+S,OFF:OFF+S,3]=A
    H=np.zeros((CAN,CAN),bool);H[OFF:OFF+S,OFF:OFF+S]=hole
    out=base.copy()
    if info and wname:
        d=info['d'];th=math.degrees(math.atan2(d[1],d[0]))
        two=wname in('spear','guandao')
        if two:
            g=info['gaps'];tg=(g[0]+g[-1])/2 if len(g)>=2 else (info['tmin']+info['tmax'])/2
        else:
            g=[x for x in info['gaps'] if x<info['tmin']+(info['tmax']-info['tmin'])*0.6]
            tg=g[0] if g else info['tmin']-6
        pos=info['c']+d*tg+OFF
        if not two:
            pc,pA=c,A;yy0,xx0=np.mgrid[:S,:S];gx,gy=info['c']+d*tg
            sk=pA&(pc[...,0]>170)&(pc[...,0]>pc[...,1]+25)&(pc[...,1]>pc[...,2]+15)&((xx0-gx)**2+(yy0-gy)**2<=11**2)
            if sk.sum()>25:
                nrm=np.array([-d[1],d[0]]);off=((xx0[sk].mean()-gx)*nrm[0]+(yy0[sk].mean()-gy)*nrm[1])
                pos=pos+nrm*max(-6,min(6,off))
        _,grip,L,L0=WEP[wname];tipl=(L0-grip[0])*L/L0;foot=OFF+170
        if pos[1]+math.sin(math.radians(th))*tipl>foot:
            sn=max(-1,min(1,(foot-pos[1])/tipl));th2=math.degrees(math.asin(sn))
            th=th2 if d[0]>=0 else 180-th2
        LAST[(key,wname)]=(float(pos[0]-OFF),float(pos[1]-OFF),float(th),two,[float(x) for x in info['gaps']],float(tg))
        W=weapon(wname,th,pos)
        yy,xx=np.mgrid[:CAN,:CAN]
        t=(xx-OFF-info['c'][0])*d[0]+(yy-OFF-info['c'][1])*d[1]
        wm=W[...,3]>0
        show=wm&((base[...,3]==0)|H|(t>info['tmax']-2))
        if key in FRONT:
            show=wm.copy();hm=((xx-pos[0])**2+(yy-pos[1])**2<=7**2)&(base[...,3]>0);show&=~hm
        out[show]=W[show]
    lab,n=ndimage.label(out[...,3]>0)
    if n>1:
        sz=np.bincount(lab.ravel());small=np.isin(lab,np.nonzero(sz<40)[0])&(lab>0);out[small]=0
    return out
if __name__=='__main__':
    import sys
    bg=np.array([70,110,70.])
    def tile(o,box):
        o=o[box[1]:box[3],box[0]:box[2]];return Image.fromarray((o[...,:3]*o[...,3:]+bg*(1-o[...,3:])).astype(np.uint8))
    box=(40,80,440,380);Z=1
    rows=[(1,'dao'),(1,'jian'),(1,'chui'),(2,'spear'),(2,'guandao')]
    sh=Image.new('RGB',(400*Z*5,300*Z*2*len(rows)),(70,110,70))
    for i,(ry,w) in enumerate(rows):
        for cx in range(10):
            t=tile(compose((ry,cx),w),box)
            sh.paste(t.resize((400*Z,300*Z),Image.NEAREST),((cx%5)*400*Z,(i*2+cx//5)*300*Z))
    sh.save('t/all.png')
    for i in range(len(rows)): sh.crop((0,i*2*300*Z,400*Z*5,(i+1)*2*300*Z)).save(f't/r{i}.png')
    for k in [(1,x) for x in range(10)]+[(2,x) for x in range(10)]:
        inf=cells[k][3];print(k,None if not inf else (round(math.degrees(math.atan2(inf['d'][1],inf['d'][0]))),[round(g) for g in inf['gaps']],round(inf['tmin']),round(inf['tmax'])))
