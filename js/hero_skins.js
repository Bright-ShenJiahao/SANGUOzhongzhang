// 11/13 主角皮肤：8 套皮肤 × 10 种武器 × 20 帧，武器已画进每一帧（art/sprites/hero_skins/，说明见那里的 README_交接说明.md）。
// 主角帧名照旧是「前缀_帧名」（wd_chop1、qiang_idle…），这里把它换成 hero_skins/{皮肤}/{武器}/{帧名}.png。
// 图是高清的（人约 150 像素高）：按旧帧的 0.5 倍画、关平滑，脚底对齐 manifest 里的 anchor；朝左翻转由 drawChar 统一处理。
// 只在用到时才下载（当前皮肤 × 当前武器 20 张），没下好之前先用旧图顶着，不会隐形。
(function () {
  const ROOT = 'art/sprites/hero_skins/';
  const SKINS = { baiyi: '穿越者·乡勇', guanjun: '官军', huangjin: '黄巾', baima: '公孙瓒·白马义从', caojun: '曹操·虎豹骑', baier: '刘备·白毦兵', wujun: '孙权·解烦卫', xiliang: '董卓·飞熊军' };
  const WEP = {   // manifest.json 的 weapons：图片宽高、脚底中心
    dao: { size: [251, 179], anchor: [127, 175] }, jian: { size: [262, 187], anchor: [131, 177] }, chui: { size: [211, 184], anchor: [115, 175] },
    spear: { size: [365, 217], anchor: [185, 189] }, guandao: { size: [332, 211], anchor: [159, 191] }, bow: { size: [189, 177], anchor: [115, 175] },
    stone: { size: [189, 177], anchor: [115, 175] }, fu: { size: [189, 183], anchor: [115, 175] }, fan: { size: [237, 192], anchor: [120, 175] },
    quan: { size: [189, 180], anchor: [115, 178] } };
  const PRE = { wd_: 'dao', jian_: 'jian', chui_: 'chui', qiang_: 'spear', guandao_: 'guandao', bow_: 'bow', stone_: 'stone', huangfu_: 'fu', fan_: 'fan', quan_: 'quan' };
  const FR = new Set(['idle', 'walk1', 'walk2', 'walk3', 'hurt', 'roll1', 'roll2', 'roll3', 'roll4', 'down', 'chop1', 'chop2', 'sweep1', 'sweep2', 'thrust1', 'thrust2', 'spin1', 'spin2', 'up1', 'up2']);
  const SCALE = .5;
  let cur = 'baiyi';
  try { const s = localStorage.getItem('szz-skin'); if (s && SKINS[s]) cur = s; } catch (e) {}
  const cache = {};   // 'skin/wep/frame' → { img, white, w, h, ax, ay }
  function split(f) {   // 'wd_chop1' → ['dao','chop1']；没有前缀的（idle、roll1）按刀算
    const i = f.indexOf('_');
    if (i < 0) return FR.has(f) ? ['dao', f] : null;
    const w = PRE[f.slice(0, i + 1)], n = f.slice(i + 1);
    return w && FR.has(n) ? [w, n] : null;
  }
  function whiteOf(img) {   // 受击闪白用的剪影
    try { const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight; const g = c.getContext('2d');
      g.drawImage(img, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); return c; } catch (e) { return null; }
  }
  function get(f, skin) {
    const p = split(f); if (!p) return null;
    const key = (skin || cur) + '/' + p[0] + '/' + p[1];
    let o = cache[key];
    if (!o) {
      const m = WEP[p[0]], img = new Image();
      o = cache[key] = { img, white: null, w: m.size[0] * SCALE, h: m.size[1] * SCALE, ax: m.anchor[0] * SCALE, ay: m.anchor[1] * SCALE, skin: true };
      img.onload = () => { o.white = whiteOf(img); };
      img.src = ROOT + key + '.png';
    }
    return o.img.complete && o.img.naturalWidth ? o : null;
  }
  function preload(skin, prePrefix) {   // 换皮肤/换武器时先把这 20 张拉下来
    const w = PRE[prePrefix] || 'dao'; for (const n of FR) get(Object.keys(PRE).find(k => PRE[k] === w) + n, skin);
  }
  window.HERO_SKIN = {
    SKINS, list: Object.keys(SKINS), get, preload,
    cur: () => cur, name: () => SKINS[cur],
    set(s) { if (!SKINS[s]) return; cur = s; try { localStorage.setItem('szz-skin', s); } catch (e) {} preload(s, window.SURV && SURV.heldPre ? SURV.heldPre() : 'wd_'); },
    next() { const L = this.list; this.set(L[(L.indexOf(cur) + 1) % L.length]); return cur; },
  };
})();
