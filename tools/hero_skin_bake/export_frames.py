import os as _o;_B=_o.path.dirname(_o.path.abspath(__file__))
import sys,os,json;sys.path.insert(0,_B)
import skin,bake
from skin import *
data=json.load(open('align_v5.json'))
skinkey=os.environ['KEY']
W=[('dao','刀'),('jian','剑'),('chui','锤'),('spear','长枪'),('guandao','关刀'),('bow','弓'),('stone','石子'),('fu','黄符'),('fan','羽扇'),('quan','拳')]
ROW=bake.ROW
outdir=f'export_tmp/{skinkey}';os.makedirs(outdir,exist_ok=True)
for k,_ in W:
    for i,f in enumerate(data['sets'][k]):
        o=bake.bake_frame(f,*bake.bodyrc(i,ROW[k]))
        a=np.dstack([np.clip(o[...,:3],0,255),o[...,3:]*255]).astype(np.uint8)
        np.save(f'{outdir}/{k}_{i:02d}.npy',a)
print('done',skinkey)
