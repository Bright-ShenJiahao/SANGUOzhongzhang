# 11/17 按对齐数据重烘某种兵器的帧（用法：SET=bow SKIN=... KEY=... [ONLYI=13,15] [MARGIN STRICT NEUTRAL] python3 export_set.py）
import os as _o;_B=_o.path.dirname(_o.path.abspath(__file__))
import sys,os,json;sys.path.insert(0,_B)
import skin,bake
from skin import *
data=json.load(open(_B+'/align_v5.json'));MF=json.load(open(_B+'/../../art/sprites/hero_skins/manifest.json'))
key=os.environ['KEY'];st=os.environ['SET'];FR=MF['frames'];m=MF['weapons'][st];(W,H),(ax,ay)=m['size'],m['anchor']
out=f'{_B}/../../art/sprites/hero_skins/{key}/{st}';os.makedirs(out,exist_ok=True)
for i,f in enumerate(data['sets'][st]):
    if os.environ.get('ONLYI') and str(i) not in os.environ['ONLYI'].split(','):continue
    o=bake.bake_frame(f,*bake.bodyrc(i,bake.ROW[st]))
    a=np.dstack([np.clip(o[...,:3],0,255),o[...,3:]*255]).astype(np.uint8)
    x0=247-ax;y0=328-ay;Image.fromarray(a[y0:y0+H,x0:x0+W],'RGBA').save(f'{out}/{FR[i]}.png')
print('ok',key,st)
