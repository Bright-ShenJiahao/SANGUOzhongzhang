# 11/17 长戟：用长枪的对齐数据把长戟画进每套皮肤的 20 帧（用法：SKIN=... KEY=... [MARGIN STRICT NEUTRAL] python3 export_ji.py）
import os as _o;_B=_o.path.dirname(_o.path.abspath(__file__))
import sys,os,json,copy;sys.path.insert(0,_B)
import skin,bake
from skin import *
data=json.load(open(_B+'/align_v5.json'))
key=os.environ['KEY'];FR=json.load(open(_B+'/../../art/sprites/hero_skins/manifest.json'))['frames']
ax,ay=185,189;W,H=365,217
for wk in (os.environ.get('WK','ji').split(',')):
    out=f'{_B}/../../art/sprites/hero_skins/{key}/{wk}' if not os.environ.get('TEST') else f'/tmp/jitest/{key}/{wk}'
    os.makedirs(out,exist_ok=True)
    for i,f in enumerate(data['sets']['spear']):
        if os.environ.get('ONLYI') and str(i) not in os.environ['ONLYI'].split(','):continue
        f=dict(f);
        if f['v']=='spear':f['v']=wk if wk!='spearT' else 'spear'
        o=bake.bake_frame(f,*bake.bodyrc(i,bake.ROW['spear']))
        a=np.dstack([np.clip(o[...,:3],0,255),o[...,3:]*255]).astype(np.uint8)
        x0=247-ax;y0=328-ay;c=a[y0:y0+H,x0:x0+W]
        Image.fromarray(c,'RGBA').save(f'{out}/{FR[i]}.png')
print('ok',key)
