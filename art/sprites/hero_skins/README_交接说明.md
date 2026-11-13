# 主角皮肤素材包（交接说明）

给《三国：战至终章》（repo SANGUOzhongzhang）用的主角帧图。8 套皮肤 × 10 种武器 × 20 帧，武器已经画进每一帧（烘焙好的），游戏里直接按帧播放即可，不需要再贴武器。

## 目录

hero_skins/{皮肤}/{武器}/{帧名}.png

皮肤：baiyi 白衣·农夫 / guanjun 红衣黑甲·官军 / huangjin 黄巾披甲 / baima 白马义从 / caojun 曹军 / baier 白毦兵·刘备 / wujun 吴军·孙权 / xiliang 西凉

武器：dao 刀 / jian 剑 / chui 锤 / spear 长枪 / guandao 关刀 / bow 弓 / stone 石子 / fu 黄符 / fan 羽扇 / quan 拳

帧名（每种武器 20 帧，顺序固定）：
idle 待机 / walk1 walk2 walk3 走路 / hurt 受击 / roll1~roll4 翻滚 / down 倒地 /
chop1 chop2 劈（起手、出手）/ sweep1 sweep2 横扫 / thrust1 thrust2 刺 / spin1 spin2 转 / up1 up2 挑

## 尺寸和对齐（重要）

- 人物在图里约 150 像素高（高清），游戏里请按 **0.5 倍**绘制，并关闭图像平滑（像素风）。
- 同一种武器的所有皮肤、所有帧，图片尺寸相同、人物脚底位置相同。manifest.json 里每种武器给了 size（图片宽高）和 anchor（脚底中心在图片里的像素坐标）。绘制时把 anchor 对准角色在地面上的坐标：
  drawX = 角色x − anchor.x × 0.5，drawY = 角色y − anchor.y × 0.5
- 不同武器的图片尺寸不同（长枪、关刀更宽），所以一定要按各自的 anchor 对齐，不要按图片中心对齐。
- 所有帧都面朝右，朝左时水平翻转（以 anchor.x 为轴）。

## 和旧图的关系

旧的主角图（art/sprites/hero/ 下的 wd_、qiang_ 等）可以保留不动。建议新建 art/sprites/hero_skins/ 放这批图，代码里加一个"当前皮肤"变量，按 hero_skins/{皮肤}/{武器}/{帧名}.png 取图；招式按动作类型（劈/横扫/刺/转/挑）取对应的两帧。

## 已知问题（不影响使用）

- 弓：放箭的几帧（chop2、sweep2、thrust2、spin2、up2）手是张开的，握弓略不自然。
- 长枪：walk2 枪是横的；chop2、up1 枪尖略低于脚底。
- 翻滚 roll2、roll3 能看到倒过来的脸，翻滚四帧不显示武器。
- 石子、黄符：sweep2、thrust2 手里是空的（表示已经扔出去），飞行物由招式特效画。

## source/

对齐数据.json：每帧武器的位置、角度、前后层级。以后要改武器位置，用这份数据重新出图即可。
