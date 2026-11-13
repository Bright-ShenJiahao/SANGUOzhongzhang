// 11/13 像素界面套件（用户出的图：金/墨/朱三种按钮、墨色面板+标题牌、宣纸面板、输入框、勾选框）
// 按钮：左右端头 + 中间如意饰 + 横向平铺的底纹，高度随按钮缩放，宽度任意都不变形；面板：九宫格
(() => {
  const K = n => `art/ui/kit/${n}.webp`;
  const IMG = { gold: ['art/ui/kit/btn_gold.webp', 651 / 150], dark: ['art/ui/kit/btn_dark.webp', 651 / 149], red: ['art/ui/kit/btn_red.webp', 677 / 165], darkS: ['art/ui/kit/btn_dark_s.webp', 397 / 149] };
  const GP = 'art/ui/kaiju2/panel.webp', CLOSE = 'art/ui/kit/btn_close.webp';   // 11/13：设置、图鉴、帮助统一用开局配置那块金边云纹面板
  const PANEL = 'art/ui/kit/panel_dark.webp', TAB = 'art/ui/kit/panel_tab.webp', PAPER = 'art/ui/kit/panel_paper.webp', INPUT = 'art/ui/kit/input.webp', CK0 = 'art/ui/kit/check_off.webp', CK1 = 'art/ui/kit/check_on.webp';
  void K;
  // 11/13 用户：按钮要和原图一模一样 → 整张图原样铺满，按钮按原图宽高比固定（不再拆端头）
  const btn = (sel, k, free) => { const [src, ar] = IMG[k];
    return `${sel}{background:url(${src}) center/100% 100% no-repeat!important;${free ? '' : `aspect-ratio:${ar.toFixed(3)};height:auto!important;min-height:0!important;min-width:min(${(ar * 2.5).toFixed(1)}em,38vw)!important;max-width:100%;`}box-sizing:border-box;padding:0 1em!important;display:inline-flex!important;align-items:center;justify-content:center;border:0!important;border-radius:0!important;box-shadow:none!important;color:#fff6e0!important;font-weight:400!important;letter-spacing:.06em!important;text-shadow:1px 0 #2a1608,-1px 0 #2a1608,0 1px #2a1608,0 -1px #2a1608,0 2px 0 rgba(0,0,0,.45)!important}
${sel}:active{transform:translateY(2px);filter:brightness(.92)}${sel}:hover{filter:brightness(1.08)}${sel}[disabled]{filter:grayscale(.7) brightness(.8)}`; };
  const css = [
    btn('#tStart', 'dark', 1), btn('#tCont', 'darkS', 1),   // 标题页两颗按钮的大小由 title.js 按原图比例排
    btn('#tConfirm .no', 'dark'), btn('#tConfirm .yes', 'red'), btn('#tNameAsk .no', 'darkS', 1), btn('#tNameAsk .yes', 'gold', 1),
    `#tNameAsk .p{border:28px solid transparent;border-image:url(${PANEL}) 28 fill stretch;color:#efe2c4}#tNameAsk .p h3{color:#fff2d0}#tNameAsk input{border:10px solid transparent;border-image:url(${INPUT}) 18 fill stretch;background:none;color:#3a2410}`,
    btn('#kaiju .bot .go', 'dark', 1), btn('#kaiju .bot .back', 'dark', 1),
    `#tConfirm .p{box-sizing:border-box;max-width:94vw!important;border:28px solid transparent!important;border-image:url(${PANEL}) 28 fill stretch!important;background:none!important;box-shadow:0 10px 30px rgba(0,0,0,.6)!important;border-radius:0!important;color:#efe2c4!important;padding:8px 18px 4px!important;position:relative;overflow:visible!important}`,
    `#tConfirm .p h3{position:relative;top:-46px;margin:0 auto -30px!important;width:max-content;min-width:60%;padding:6px 34px!important;background:url(${TAB}) center/100% 100% no-repeat;color:#fff2d0!important;font-weight:400!important;text-shadow:0 1px 0 #000}`,
    `#tConfirm .p p{color:#efe2c4!important}#tConfirm .p small{color:#d8b878!important}`,
    `#tName{border:10px solid transparent!important;border-image:url(${INPUT}) 18 fill stretch!important;background:none!important;border-radius:0!important;box-shadow:none!important;color:#3a2410!important}#tName::placeholder{color:rgba(90,60,30,.55)!important}`,
    `#tNovice input,#tHintOff input,#szzHintOff input{appearance:none;-webkit-appearance:none;width:20px!important;height:20px!important;margin:0 6px 0 0;background:url(${CK0}) center/100% 100% no-repeat;border:0;vertical-align:middle;cursor:pointer}#tNovice input:checked,#tHintOff input:checked,#szzHintOff input:checked{background-image:url(${CK1})}`,
    // 11/13 用户：右上角 图鉴 / 设置 / 帮助 / 声音 都用文字 + 短款墨色按钮（只在主界面）
    `body.ontitle #szzCodexBtn,body.ontitle #szzSetBtn,body.ontitle #tHelp{position:fixed!important;top:8px!important;width:var(--tb-w)!important;height:var(--tb-h)!important;min-width:0!important;padding:0!important;margin:0!important;background:url(${IMG.darkS[0]}) center/100% 100% no-repeat!important;border:0!important;border-radius:0!important;box-shadow:none!important;color:#fff6e0!important;font:400 var(--tb-f) Pixel12,sans-serif!important;letter-spacing:.06em!important;text-shadow:1px 0 #2a1608,-1px 0 #2a1608,0 1px #2a1608,0 -1px #2a1608!important;display:flex;align-items:center;justify-content:center;cursor:pointer;z-index:31}`,
    `:root{--tb-h:34px;--tb-w:90px;--tb-f:15px;--tb-g:6px}@media (max-width:600px){:root{--tb-h:30px;--tb-w:78px;--tb-f:13px;--tb-g:4px}}`,
    `body.ontitle #bMute{display:none!important}body.ontitle #tHelp{right:8px!important}body.ontitle #szzSetBtn{right:calc(8px + var(--tb-w) + var(--tb-g))!important}body.ontitle #szzCodexBtn{right:calc(8px + 2 * (var(--tb-w) + var(--tb-g)))!important}`,   // 静音放进设置里
    `body.ontitle #szzCodexBtn:hover,body.ontitle #szzSetBtn:hover,body.ontitle #tHelp:hover{filter:brightness(1.12)}`,
    `#tHelpPanel{box-sizing:border-box!important;width:min(760px,92vw)!important;max-height:84vh!important;overflow:auto!important;left:50%!important;top:50%!important;transform:translate(-50%,-50%)!important;border:28px solid transparent!important;border:30px solid transparent!important;border-image:url(${GP}) 100 fill stretch!important;background:none!important;border-radius:0!important;padding:4px 10px!important;font:400 14px/1.8 Pixel12,sans-serif!important;color:#efe2c4!important}#tHelpPanel h3{margin:0 0 8px!important;text-align:center;color:#ffd86e!important;font-weight:400!important}#tHelpPanel b{color:#ffd86e;font-weight:400}`,
    /* 11/13 用户：设置、图鉴还是旧风格 → 换成开局配置同款（墨黑底、金边云纹面板、暗金线、选中金框发光），字用像素字 */
    `body #szzSet{background:rgba(6,5,4,.66)}body #szzSet .p{border:30px solid transparent!important;border-image:url(${GP}) 100 fill stretch!important;background:none!important;box-shadow:none!important;padding:16px 10px 4px!important;width:min(440px,92vw)!important;font-family:Pixel12,sans-serif!important}`,
    `body #szzSet h3{position:static!important;transform:none!important;border:0!important;background:none!important;padding:0 0 10px!important;margin:0 0 6px!important;color:#f0d89a!important;font:400 20px Pixel12,sans-serif!important;letter-spacing:.5em!important;text-indent:.5em!important;text-align:center;border-bottom:1px solid rgba(201,164,92,.35)!important;width:auto!important}`,
    `body #szzSet .row label{width:auto!important;min-width:4.6em;white-space:nowrap;font-weight:400!important;color:#d8c49a!important;letter-spacing:.1em}body #szzSet .row b{font:400 15px Pixel12,monospace!important;color:#f0d89a!important}`,
    `body #szzSet .tg button{min-height:36px!important;border:1px solid #4a3c25!important;border-radius:0!important;background:#1c1a17!important;color:#8f826c!important;font:400 15px Pixel12,sans-serif!important;letter-spacing:.2em}`,
    `body #szzSet .tg button.on{border-color:#f0d89a!important;color:#fff2d0!important;background:linear-gradient(180deg,#2c261c,#15130f)!important;box-shadow:0 0 0 1px #000,0 0 0 2px #c9a45c,0 0 10px rgba(240,200,110,.25)!important}`,
    `body #szzSet small{color:#8f826c!important;font-family:Pixel12,sans-serif!important}`,
    `body #szzSet .ok{border:0!important;border-radius:0!important;background:url(${IMG.darkS[0]}) center/100% 100% no-repeat!important;aspect-ratio:397/149;width:46%!important;height:auto!important;min-height:0!important;color:#f5e8c8!important;font:400 17px Pixel12,sans-serif!important;letter-spacing:.4em;text-indent:.4em;text-shadow:0 1px 0 #000}`,
    `body #szzCodex{background:rgba(6,5,4,.8)}body #szzCodex .cx{border:30px solid transparent!important;border-image:url(${GP}) 100 fill stretch!important;background:none!important;box-shadow:none!important;font-family:Pixel12,sans-serif!important}`,
    `body #szzCodex .hd{padding:0 4px 10px!important;border-bottom:1px solid rgba(201,164,92,.35)!important}body #szzCodex .hd h2{white-space:nowrap;font:400 22px Pixel12,sans-serif!important;color:#f0d89a!important;letter-spacing:.4em!important}`,
    `body #szzCodex .tb,body #szzCodex .ct{white-space:nowrap}@media (max-width:520px){body #szzCodex .cx{border-width:22px!important}body #szzCodex .hd{gap:8px!important}body #szzCodex .hd h2{font-size:18px!important;letter-spacing:.2em!important}body #szzCodex .tb{padding:4px 10px!important}body #szzCodex .ct{font-size:11px!important}}`,
    `body #szzCodex .tb{border:1px solid #4a3c25!important;background:#1c1a17!important;color:#a99878!important;font:400 14px Pixel12,sans-serif!important;padding:5px 16px!important}body #szzCodex .tb.on{border-color:#f0d89a!important;color:#fff2d0!important;background:linear-gradient(180deg,#2c261c,#15130f)!important;box-shadow:0 0 0 1px #000,0 0 0 2px #c9a45c!important}`,
    `body #szzCodex .x{width:34px!important;height:34px!important;border:0!important;background:url(${CLOSE}) center/contain no-repeat!important;color:transparent!important;font-size:0!important}`,
    `body #szzCodex .gr{padding:12px 10px!important}body #szzCodex .cd{position:relative;border:1px solid #4a3c25!important;background:#1c1a17!important;box-shadow:inset 0 0 0 2px #0b0a08}`,
    `body #szzCodex .cd:before,body #szzCodex .cd:after{content:"";position:absolute;width:7px;height:7px;border:1px solid #c9a45c;pointer-events:none}body #szzCodex .cd:before{left:-1px;top:-1px;border-right:0;border-bottom:0}body #szzCodex .cd:after{right:-1px;bottom:-1px;border-left:0;border-top:0}`,
    `body #szzCodex .cd:hover,body #szzCodex .cd.sel{border-color:#f0d89a!important;background:linear-gradient(180deg,#2c261c,#15130f)!important;box-shadow:inset 0 0 0 2px #0b0a08,0 0 10px rgba(240,200,110,.28)!important}`,
    `body #szzCodex .cd span{font-family:Pixel12,sans-serif!important}body #szzCodex .cd .nb{font-family:Pixel12,monospace!important;color:#a8823f!important}`,
    `body #szzCodex .dt{border-left:1px solid rgba(201,164,92,.35)!important}body #szzCodex .dt .pic{background:radial-gradient(ellipse at 50% 70%,rgba(201,164,92,.16),transparent 68%)!important;border-bottom:1px solid rgba(201,164,92,.25)}`,
    `body #szzCodex .dt h3{font:400 22px Pixel12,sans-serif!important;color:#f0d89a!important}body #szzCodex .dt h4{color:#c9a45c!important;font-weight:400!important;font-family:Pixel12,sans-serif!important;display:flex;align-items:center;gap:8px}body #szzCodex .dt h4:after{content:"";flex:1;height:1px;background:linear-gradient(90deg,#a8823f,transparent)}`,
    `body #szzCodex .dt p,body #szzCodex .dt ul,body #szzCodex .dt .no,body #szzCodex .dt .tg,body #szzCodex .ct{font-family:Pixel12,sans-serif!important}body #szzCodex .dt .tg{border-color:#4a3c25!important;background:#1c1a17}`,
  ].join('\n');
  void PAPER;
  const st = document.createElement('style'); st.id = 'uikit'; st.textContent = css;
  const put = () => document.head.appendChild(st);   // 放到最后，压过各模块自己的样式
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(put, 0)); else setTimeout(put, 0);
  window.addEventListener('load', put);
})();
