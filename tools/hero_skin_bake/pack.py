import os as _o;_B=_o.path.dirname(_o.path.abspath(__file__))
import numpy as np,os,json,zipfile
from PIL import Image
OFF=152
SK=[('baiyi','白衣·农夫'),('guanjun','红衣黑甲·官军'),('huangjin','黄巾披甲'),('baima','白马义从'),('caojun','曹军'),('baier','白毦兵·刘备'),('wujun','吴军·孙权'),('xiliang','西凉')]
W=[('dao','刀'),('jian','剑'),('chui','锤'),('spear','长枪'),('guandao','关刀'),('bow','弓'),('stone','石子'),('fu','黄符'),('fan','羽扇'),('quan','拳')]
ST=['idle','walk1','walk2','walk3','hurt','roll1','roll2','roll3','roll4','down','chop1','chop2','sweep1','sweep2','thrust1','thrust2','spin1','spin2','up1','up2']
STN=['待机','走路1','走路2','走路3','受击','翻滚1','翻滚2','翻滚3','翻滚4','倒地','劈·起手','劈·出手','横扫·起手','横扫·出手','刺·起手','刺·出手','转·起手','转·出手','挑·起手','挑·出手']
AX,AY=OFF+95,OFF+176   # feet bottom-centre in the 480 canvas
man={'scale':0.5,'note':'每帧原图人物约150像素高，游戏里按0.5倍绘制；anchor是脚底中心在该帧图片里的像素坐标','frames':ST,'frame_names':STN,'skins':{},'weapons':{}}
z=zipfile.ZipFile('主角皮肤素材包.zip','w',zipfile.ZIP_DEFLATED)
for wk,wn in W:
    x0=y0=10**9;x1=y1=-1
    for sk,_ in SK:
        for i in range(20):
            a=np.load(f'export_tmp/{sk}/{wk}_{i:02d}.npy')[...,3]>0
            ys,xs=np.nonzero(a)
            if len(xs):x0=min(x0,xs.min());x1=max(x1,xs.max());y0=min(y0,ys.min());y1=max(y1,ys.max())
    x0-=2;y0-=2;x1+=3;y1+=3
    man['weapons'][wk]={'name':wn,'size':[int(x1-x0),int(y1-y0)],'anchor':[int(AX-x0),int(AY-y0)]}
    for sk,_ in SK:
        for i in range(20):
            a=np.load(f'export_tmp/{sk}/{wk}_{i:02d}.npy')[y0:y1,x0:x1]
            p=f'/tmp/f.png';Image.fromarray(a,'RGBA').save(p,optimize=True)
            z.write(p,f'hero_skins/{sk}/{wk}/{ST[i]}.png')
for sk,sn in SK:man['skins'][sk]=sn
z.writestr('hero_skins/manifest.json',json.dumps(man,ensure_ascii=False,indent=1))
z.write(_B+'/align_v5.json','hero_skins/source/对齐数据.json')
z.write('/tmp/README.md','hero_skins/README_交接说明.md')
z.close()
print(os.path.getsize('主角皮肤素材包.zip')/1e6,json.dumps(man['weapons'],ensure_ascii=False))
