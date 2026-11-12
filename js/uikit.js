// 11/13 像素界面套件（用户出的图：金/墨/朱三种按钮、墨色面板+标题牌、宣纸面板、输入框、勾选框）
// 按钮：左右端头 + 中间如意饰 + 横向平铺的底纹，高度随按钮缩放，宽度任意都不变形；面板：九宫格
(() => {
  const K = n => `art/ui/kit/${n}.webp`;
  const IMG = { gold: ['art/ui/kit/btn_gold.webp', 651 / 150], dark: ['art/ui/kit/btn_dark.webp', 651 / 149], red: ['art/ui/kit/btn_red.webp', 677 / 165], darkS: ['art/ui/kit/btn_dark_s.webp', 397 / 149] };
  const PANEL = 'art/ui/kit/panel_dark.webp', TAB = 'art/ui/kit/panel_tab.webp', PAPER = 'art/ui/kit/panel_paper.webp', INPUT = 'art/ui/kit/input.webp', CK0 = 'art/ui/kit/check_off.webp', CK1 = 'art/ui/kit/check_on.webp';
  void K;
  // 11/13 用户：按钮要和原图一模一样 → 整张图原样铺满，按钮按原图宽高比固定（不再拆端头）
  const btn = (sel, k, free) => { const [src, ar] = IMG[k];
    return `${sel}{background:url(${src}) center/100% 100% no-repeat!important;${free ? '' : `aspect-ratio:${ar.toFixed(3)};height:auto!important;min-height:0!important;min-width:min(${(ar * 2.5).toFixed(1)}em,38vw)!important;max-width:100%;`}box-sizing:border-box;padding:0 1em!important;display:inline-flex!important;align-items:center;justify-content:center;border:0!important;border-radius:0!important;box-shadow:none!important;color:#fff6e0!important;font-weight:400!important;letter-spacing:.06em!important;text-shadow:1px 0 #2a1608,-1px 0 #2a1608,0 1px #2a1608,0 -1px #2a1608,0 2px 0 rgba(0,0,0,.45)!important}
${sel}:active{transform:translateY(2px);filter:brightness(.92)}${sel}:hover{filter:brightness(1.08)}${sel}[disabled]{filter:grayscale(.7) brightness(.8)}`; };
  const css = [
    btn('#tStart', 'gold', 1), btn('#tCont', 'darkS', 1),   // 标题页两颗按钮的大小由 title.js 按原图比例排 btn('#tConfirm .no', 'dark'), btn('#tConfirm .yes', 'red'),
    btn('#kaiju .bot .go', 'gold'), btn('#kaiju .bot .back', 'dark'),
    `#tConfirm .p{box-sizing:border-box;max-width:94vw!important;border:28px solid transparent!important;border-image:url(${PANEL}) 28 fill stretch!important;background:none!important;box-shadow:0 10px 30px rgba(0,0,0,.6)!important;border-radius:0!important;color:#efe2c4!important;padding:8px 18px 4px!important;position:relative;overflow:visible!important}`,
    `#tConfirm .p h3{position:relative;top:-46px;margin:0 auto -30px!important;width:max-content;min-width:60%;padding:6px 34px!important;background:url(${TAB}) center/100% 100% no-repeat;color:#fff2d0!important;font-weight:400!important;text-shadow:0 1px 0 #000}`,
    `#tConfirm .p p{color:#efe2c4!important}#tConfirm .p small{color:#d8b878!important}`,
    `#tName{border:10px solid transparent!important;border-image:url(${INPUT}) 18 fill stretch!important;background:none!important;border-radius:0!important;box-shadow:none!important;color:#3a2410!important}#tName::placeholder{color:rgba(90,60,30,.55)!important}`,
    `#tNovice input,#tHintOff input,#szzHintOff input{appearance:none;-webkit-appearance:none;width:20px!important;height:20px!important;margin:0 6px 0 0;background:url(${CK0}) center/100% 100% no-repeat;border:0;vertical-align:middle;cursor:pointer}#tNovice input:checked,#tHintOff input:checked,#szzHintOff input:checked{background-image:url(${CK1})}`,
  ].join('\n');
  void PAPER;
  const st = document.createElement('style'); st.id = 'uikit'; st.textContent = css;
  const put = () => document.head.appendChild(st);   // 放到最后，压过各模块自己的样式
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(put, 0)); else setTimeout(put, 0);
  window.addEventListener('load', put);
})();
