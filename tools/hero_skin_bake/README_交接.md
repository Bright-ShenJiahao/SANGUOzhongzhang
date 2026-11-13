# 主角皮肤：武器对齐工具 + 对齐记录 交接包

## 内容
- 对齐工具/index.html：武器对齐小工具，直接用浏览器打开就能用（离线可用）。左上切武器、帧；拖动/方向键调位置和角度；顶部按钮切皮肤；"导出"得到 JSON。
- 对齐数据_最新.json：目前所有武器、每帧的对齐记录（弓第3帧角度已改为 39）。工具里点"导入"粘贴它即可恢复。
- 脚本/：合成用的 Python 脚本（full2/full3/dao20/bake/skin/export_frames/pack）。
- 脚本/原始素材/：脚本里写死路径引用的原图（蓝棍底图、武器表、红衣黑甲、旧对齐 txt）。
- 皮肤原图/：11 套 50 帧总表（白衣、红衣黑甲、黄巾、白马、曹军、白毦、吴军、西凉、丹阳兵、先登营、陷阵营）。后 3 套还没生成武器帧。

## 帧布局
50 帧总表 5 行 × 10 列，品红背景 #FF00FF。
行0：待机、走×3、翻滚×4、受击、倒地；行1 单手攻击；行2 双手攻击；行3 弓；行4 拳。
游戏里每把武器 20 帧：idle, walk1-3, hurt, roll1-4, down, chop1/2, sweep1/2, thrust1/2, spin1/2, up1/2。
公共帧映射总表格子 CC=[0,1,2,3,8,4,5,6,7,9]。游戏内缩放 0.5，锚点在脚底中点。

## 生成一套新皮肤的武器帧
脚本里的路径是旧环境的：/home/claude/ 改成脚本所在目录，/mnt/user-data/uploads/xxx 改成 脚本/原始素材/ 里对应文件。
    MARGIN=30 STRICT=1 NEUTRAL=1 SKIN=皮肤原图/丹阳兵50帧总表.png PRE=丹阳兵 ATLAS=frames_dy.png python3 -W ignore -I skin.py
- MARGIN=30：头饰/盔缨超出格子时用。
- STRICT=1：只把纯品红当背景（白衣、浅色衣服带粉色阴影时用）。
- NEUTRAL=1：偏紫的阴影改成中性灰。
新皮肤要在工具里出现：把生成的 frames_xx.png 放进 对齐工具/，在 index.html 的 SK 数组和按钮里加一项。

## 已知遗留问题
弓放箭帧手是张开的；枪 walk2 是横的，chop2/up1 枪尖偏低；翻滚帧脸是倒的；石头、斧 sweep2/thrust2 手里是空的。
修图规矩：先圈出问题位置给用户确认，再改。

## 在本仓库里用（11/13 接入）
- 脚本已改成相对本目录的路径；50 帧原图在 art/gemini/hero_skins_src/。
- 出一套新皮肤（例：陷阵营）：
    cd tools/hero_skin_bake && MARGIN=30 SKIN=../../art/gemini/hero_skins_src/陷阵营50帧总表.png KEY=xianzhen python3 -W ignore export_frames.py
  然后按 manifest.json 里每种武器的 size/anchor 裁剪写到 art/sprites/hero_skins/<KEY>/<武器>/<帧>.png（裁剪方式见提交记录里的说明：x0=247-anchor.x, y0=328-anchor.y），并在 manifest.json 的 skins、js/hero_skins.js 的 SKINS、js/kaiju.js 的 FAC 里各加一项。
