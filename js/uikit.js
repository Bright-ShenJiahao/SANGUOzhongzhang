// 11/13 像素界面套件（用户出的图：金/墨/朱三种按钮、墨色面板+标题牌、宣纸面板、输入框、勾选框）
// 按钮：左右端头 + 中间如意饰 + 横向平铺的底纹，高度随按钮缩放，宽度任意都不变形；面板：九宫格
(() => {
  const K = n => `art/ui/kit/${n}.webp`;
  const IMG = {
    gold: ['art/ui/kit/btn_gold_l.webp', 'art/ui/kit/btn_gold_r.webp', 'art/ui/kit/btn_gold_c.webp', 'art/ui/kit/btn_gold_f.webp'],
    dark: ['art/ui/kit/btn_dark_l.webp', 'art/ui/kit/btn_dark_r.webp', 'art/ui/kit/btn_dark_c.webp', 'art/ui/kit/btn_dark_f.webp'],
    red: ['art/ui/kit/btn_red_l.webp', 'art/ui/kit/btn_red_r.webp', 'art/ui/kit/btn_red_c.webp', 'art/ui/kit/btn_red_f.webp'],
  };
  const PANEL = 'art/ui/kit/panel_dark.webp', TAB = 'art/ui/kit/panel_tab.webp', PAPER = 'art/ui/kit/panel_paper.webp', INPUT = 'art/ui/kit/input.webp', CK0 = 'art/ui/kit/check_off.webp', CK1 = 'art/ui/kit/check_on.webp';
  void K;
  const btn = (sel, k) => { const [l, r, c, f] = IMG[k];
    return `${sel}{background:url(${c}) center/auto 100% no-repeat,url(${l}) left center/auto 100% no-repeat,url(${r}) right center/auto 100% no-repeat,url(${f}) center/auto 100% repeat-x!important;border:0!important;border-radius:0!important;box-shadow:none!important;color:#fff6e0!important;font-weight:400!important;text-shadow:1px 0 #2a1608,-1px 0 #2a1608,0 1px #2a1608,0 -1px #2a1608,0 2px 0 rgba(0,0,0,.45)!important;padding-top:.7em!important;padding-bottom:.7em!important;min-height:2.9em}
${sel}:active{transform:translateY(2px);filter:brightness(.92)}${sel}:hover{filter:brightness(1.08)}${sel}[disabled]{filter:grayscale(.7) brightness(.8)}`; };
  const css = [
    btn('#tStart', 'gold'), btn('#tCont', 'dark'), btn('#tConfirm .no', 'dark'), btn('#tConfirm .yes', 'red'),
    btn('#kaiju .bot .go', 'gold'), btn('#kaiju .bot .back', 'dark'),
    `#tConfirm .p{border:28px solid transparent!important;border-image:url(${PANEL}) 28 fill stretch!important;background:none!important;box-shadow:0 10px 30px rgba(0,0,0,.6)!important;border-radius:0!important;color:#efe2c4!important;padding:8px 18px 4px!important;position:relative;overflow:visible!important}`,
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
