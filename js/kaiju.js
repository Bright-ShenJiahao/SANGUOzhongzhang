// 开局配置（三国终章，用户定 11/09）：照三国幸存者的三栏布局。
// 左：称号 / 势力 / 出身；中：所选战场；右：兵籍牒（属性 + 起手招式）。整军备战不要了。
(() => {
  const ATTR = ['体魄', '短兵', '长兵', '身法', '运气', '悟性'];
  const STAT = {   // 出身的属性条（先只是展示，数值以后再接）
    nongfu: [6, 4, 2, 2, 3, 2], xiaozu: [4, 3, 4, 3, 2, 2], liehu: [3, 3, 1, 5, 3, 2], shusheng: [2, 1, 1, 2, 3, 6],
  };
  const FIELDS = [
    { name: '黄巾之乱', note: '从涿郡一路杀到张角祭坛：18 层、4 位段首领、终战张角。', open: true, pic: 'art/ui/kaiju/field1.webp' },
    { name: '黄巾决战 · 祭台', note: '第二章，暂未开放。', open: false },
  ];
  const OGI = { nongfu: 'art/ui/kaiju/og_nongfu.webp', xiaozu: 'art/ui/kaiju/og_xiaozu.webp', liehu: 'art/ui/kaiju/og_liehu.webp', shusheng: 'art/ui/kaiju/og_shusheng.webp' };
  const SKI = { hengsao: 'art/ui/kaiju/sk_hengsao.webp', daobo: 'art/ui/kaiju/sk_daobo.webp', huima: 'art/ui/kaiju/sk_huima.webp', daolun: 'art/ui/kaiju/sk_daolun.webp' };   // 招式图标（11/11 Gemini）
  const PIC = { bg: 'art/ui/kaiju/bg.webp', field1: 'art/ui/kaiju/field1.webp', std: 'art/ui/kaiju/diff_std.webp', hard: 'art/ui/kaiju/diff_hard.webp', plate: 'art/ui/kaiju/plate.webp' };
  let el = null, field = 0, name = '无名';
  // 11/11 改版（用户给了美术）：宣纸水墨背景 + 深色木框面板压在纸上；出身/难度做成「图标 + 名字 + 一句话」卡片
  const CSS = `
  #kaiju{position:fixed;inset:0;z-index:10005;background:#ecd9c0 url('${PIC.bg}') center/cover no-repeat;color:#f2e4c8;
    font-family:"Songti SC","STSong","Noto Serif SC","PingFang SC",serif;display:flex;flex-direction:column;
    padding:calc(8px + env(safe-area-inset-top)) calc(12px + env(safe-area-inset-right)) calc(8px + env(safe-area-inset-bottom)) calc(12px + env(safe-area-inset-left));box-sizing:border-box}
  #kaiju *{box-sizing:border-box}
  #kaiju .top{display:flex;align-items:center;gap:10px;padding-bottom:6px;margin-bottom:8px;border-bottom:1px solid rgba(60,40,24,.35)}
  #kaiju .seal{width:34px;height:34px;background:#a8281e;color:#ffe9c0;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:18px;border-radius:4px;transform:rotate(-4deg);box-shadow:0 2px 6px rgba(80,20,10,.35)}
  #kaiju .top h1{margin:0;font-size:22px;letter-spacing:8px;color:#2a1c12}#kaiju .top small{color:#6b5232;font-size:12px;letter-spacing:3px}
  #kaiju .cols{flex:1;min-height:0;display:grid;grid-template-columns:1fr 1.3fr 1fr;gap:12px}
  #kaiju .pan{position:relative;border:1px solid #b08a4a;border-radius:3px;background:linear-gradient(180deg,rgba(34,24,16,.94),rgba(22,15,10,.95));padding:12px 12px 10px;overflow:auto;min-height:0;
    box-shadow:inset 0 0 0 3px rgba(14,9,6,.9),inset 0 0 0 4px rgba(176,138,74,.45),0 8px 24px rgba(40,25,10,.35)}
  #kaiju .pan:before,#kaiju .pan:after{content:"";position:absolute;width:14px;height:14px;border:2px solid #d8b060;pointer-events:none}
  #kaiju .pan:before{left:3px;top:3px;border-right:0;border-bottom:0}#kaiju .pan:after{right:3px;bottom:3px;border-left:0;border-top:0}
  #kaiju h4{margin:4px 0 8px;color:#e9cf98;font-size:14px;letter-spacing:6px;display:flex;align-items:center;gap:8px}
  #kaiju h4:before{content:"";width:7px;height:7px;background:#d8b060;transform:rotate(45deg);flex:none}
  #kaiju h4:after{content:"";flex:1;height:1px;background:linear-gradient(90deg,#8a6a3a,transparent)}
  #kaiju .ico{width:44px;height:44px;border-radius:3px;flex:none;background:#1c140d center/cover;box-shadow:0 0 0 1px #6b5230}
  #kaiju .namep{display:flex;align-items:center;gap:10px;margin-bottom:8px}#kaiju .namep b{font-size:18px;color:#ffe9b8;letter-spacing:2px}#kaiju .namep small{display:block;font-size:11px;color:#a8916c}
  #kaiju select{width:100%;background:#1c140d;color:#f2e4c8;border:1px solid #8a6a3a;border-radius:3px;padding:6px;font-size:13px;font-family:inherit}
  #kaiju .hint{margin:6px 0 10px;padding:6px 8px;border-left:3px solid #b08a4a;background:rgba(0,0,0,.28);font-size:12px;color:#d8c39a}
  #kaiju .og{display:grid;grid-template-columns:1fr 1fr;gap:6px}
  #kaiju .card{display:flex;align-items:center;gap:8px;padding:5px;border:1px solid #5a4226;border-radius:4px;background:rgba(36,25,16,.85);color:#e9cf98;cursor:pointer;text-align:left;font-family:inherit;min-width:0}
  #kaiju .card b{display:block;font-size:15px;letter-spacing:2px;white-space:nowrap}#kaiju .card small{display:block;font-size:11px;color:#a8916c;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  #kaiju .card span{min-width:0}
  #kaiju .card.on{border:1px solid #ffd86e;background:linear-gradient(180deg,rgba(90,62,30,.9),rgba(50,34,18,.9));box-shadow:0 0 0 1px #ffd86e,0 0 12px rgba(255,200,90,.45);color:#ffe9b8}
  #kaiju .card.lock{opacity:.4;cursor:not-allowed}
  #kaiju .ogd{margin-top:8px;padding:8px;border:1px solid rgba(176,138,74,.6);border-radius:4px;background:rgba(60,42,26,.45)}
  #kaiju .ogd b{font-size:16px;color:#ffe9b8}#kaiju .tag{display:inline-block;margin-left:6px;padding:0 6px;border:1px solid #b08a4a;border-radius:3px;font-size:11px;color:#e9cf98}
  #kaiju .ogd p{margin:4px 0 0;font-size:12px;color:#d8c39a}
  #kaiju .diff{display:grid;grid-template-columns:1fr 1fr;gap:6px}
  #kaiju .field{display:flex;flex-direction:column;height:100%}
  #kaiju .pic{flex:1;min-height:90px;border:1px solid #6b5230;border-radius:2px;background:#1c140d center/cover no-repeat;position:relative;overflow:hidden}
  #kaiju .pic.lock{filter:grayscale(1) brightness(.5)}
  #kaiju .pic .ban{position:absolute;left:0;right:0;bottom:0;padding:26px 10px 10px;background:linear-gradient(180deg,transparent,rgba(12,8,5,.88) 55%);text-align:center}
  #kaiju .pic .arr{position:absolute;top:50%;transform:translateY(-50%);width:30px;height:46px;border:1px solid rgba(216,176,96,.6);border-radius:3px;background:rgba(12,8,5,.55);color:#f2e4c8;font-size:20px;cursor:pointer}
  #kaiju .fname{font-size:20px;letter-spacing:8px;color:#ffe9b8;text-shadow:0 2px 6px #000}#kaiju .fnote{font-size:12px;color:#d8c39a;margin-top:2px}
  #kaiju .rows div{display:flex;justify-content:space-between;border-bottom:1px dotted #5a4226;padding:3px 0;font-size:13px}#kaiju .rows span{color:#a8916c}
  #kaiju .bar{display:grid;grid-template-columns:34px 1fr 16px;align-items:center;gap:6px;font-size:12px;margin:3px 0}
  #kaiju .bar i{display:block;height:7px;background:#3a2a1c;border-radius:2px;overflow:hidden}#kaiju .bar i u{display:block;height:100%;background:linear-gradient(90deg,#8a2a1e,#e0804a)}
  #kaiju .sk{display:flex;gap:6px;margin-top:4px}#kaiju .sk div{flex:1;aspect-ratio:1;max-width:48px;border:1px dashed #5a4226;border-radius:3px;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:18px;background:rgba(20,14,9,.7) center/cover;color:#5a4a36}
  #kaiju .sk div.has{border:1px solid #ffd86e;color:#ffd86e;box-shadow:0 0 8px rgba(255,200,90,.35)}
  #kaiju .bot{display:flex;align-items:center;gap:10px;margin-top:8px}
  #kaiju .bot button{white-space:nowrap;border:1px solid #b08a4a;border-radius:4px;background:linear-gradient(180deg,#3a2a1c,#1e150d);color:#f5e2b8;font-size:16px;letter-spacing:6px;padding:9px 18px;cursor:pointer;font-family:inherit;box-shadow:inset 0 0 0 2px rgba(14,9,6,.8),0 4px 10px rgba(40,25,10,.3)}
  #kaiju .bot .go{margin-left:auto;padding:10px 52px;font-size:19px;border:2px solid #d8b060;background:linear-gradient(180deg,#6a4424,#2e1d10);color:#ffe9b8}
  #kaiju .bot .dice{letter-spacing:0;padding:8px 12px}
  @media (max-height:520px){#kaiju .top{padding-bottom:3px;margin-bottom:5px}#kaiju .top h1{font-size:16px}#kaiju .seal{width:28px;height:28px;font-size:15px}#kaiju .pan{padding:8px 9px 6px}#kaiju h4{margin:2px 0 5px;font-size:12px}
    #kaiju .hint{display:none}#kaiju .ico{width:32px;height:32px}#kaiju .card{padding:3px;gap:6px}#kaiju .card b{font-size:13px}#kaiju .card small{font-size:10px}#kaiju .namep{margin-bottom:4px}#kaiju .namep b{font-size:15px}
    #kaiju .bar{margin:1px 0;font-size:11px}#kaiju .rows div{padding:1px 0;font-size:12px}#kaiju select{padding:3px 6px;font-size:12px}#kaiju .sk div{max-width:34px}#kaiju .ogd{margin-top:5px;padding:5px 7px}#kaiju .ogd p{font-size:11px}
    #kaiju .pic{min-height:60px}#kaiju .bot{margin-top:5px}#kaiju .bot button{padding:6px 14px;font-size:14px}#kaiju .bot .go{padding:7px 36px}#kaiju .fname{font-size:16px}}
  @media (max-width:700px) and (orientation:portrait){#kaiju .cols{display:flex;flex-direction:column;overflow-y:auto;gap:10px;-webkit-overflow-scrolling:touch}#kaiju .pan{overflow:visible;flex:none}#kaiju .field{order:-1;height:auto}#kaiju .pic{flex:none;height:min(56vw,240px)}#kaiju .bot button{letter-spacing:2px;padding:9px 12px;white-space:nowrap}#kaiju .bot .go{flex:1;padding:10px 0;letter-spacing:8px}}`;
  function render() {
    const O = window.SURV ? SURV.ORIGINS : {}, cur = SURV.origin(), o = O[cur], st = STAT[cur] || [], SK = SURV.SK, sk = SK[o.skill];
    const F = FIELDS[field], hard = !!(window.TITLE && TITLE.hardMode && TITLE.hardMode());
    const ic = u => `style="background-image:url('${u}')"`;
    el.innerHTML = `
      <div class="top"><div class="seal">卒</div><div><h1>开局配置</h1><small>选择你的出身</small></div></div>
      <div class="cols">
        <div class="pan">
          <h4>名号</h4>
          <div class="namep"><div class="ico" ${ic(PIC.plate)}></div><div><b>${esc(name)}</b><small>称号：无（通关或达成条件后获得）</small></div></div>
          <h4>势力</h4><select disabled><option>普通乡勇　增：无；减：无</option></select>
          <h4 style="margin-top:10px">出身</h4>
          <div class="og">${Object.keys(O).map(k => `<button data-o="${k}" class="card ${k === cur ? 'on' : ''} ${O[k].locked ? 'lock' : ''}"><div class="ico" ${ic(OGI[k] || '')}></div><span><b>${O[k].name}</b><small>${(O[k].desc || '').split('。')[0]}</small></span></button>`).join('')}</div>
          <div class="ogd"><b>${o.name}</b><span class="tag">${o.tag}</span><p>${o.desc}</p><p>起手招式：<b style="font-size:13px;color:${sk ? sk.color : '#fff'}">${sk ? sk.name : '—'}</b>${sk ? '（' + sk.desc + '）' : ''}</p></div>
          <h4 style="margin-top:10px">难度</h4>
          <div class="diff"><button class="card ${hard ? '' : 'on'}" data-h="0"><div class="ico" ${ic(PIC.std)}></div><span><b>标准</b><small>试牛刀，来去自如</small></span></button><button class="card ${hard ? 'on' : ''}" data-h="1"><div class="ico" ${ic(PIC.hard)}></div><span><b style="color:#ff8a70">困难</b><small>敌人更强，积分×1.25</small></span></button></div>
        </div>
        <div class="pan field">
          <h4>所选战场</h4>
          <div class="pic ${F.open ? '' : 'lock'}" style="background-image:url('${F.pic || PIC.field1}')"><button class="arr" data-f="-1" style="left:6px">‹</button><button class="arr" data-f="1" style="right:6px">›</button>
            <div class="ban"><div class="fname">${F.name}</div><div class="fnote">${F.note}</div></div></div>
        </div>
        <div class="pan">
          <h4>兵籍牒</h4>
          <div class="rows"><div><span>姓名</span>${esc(name)}</div><div><span>出身</span>${o.name}</div><div><span>兵器</span>单刀</div><div><span>难度</span>${hard ? '困难' : '标准'}</div></div>
          <h4 style="margin-top:8px">属性</h4>
          ${ATTR.map((a, i) => `<div class="bar"><span>${a}</span><i><u style="width:${(st[i] || 0) * 14}%"></u></i><span>${st[i] || 0}</span></div>`).join('')}
          <h4 style="margin-top:8px">起手招式</h4>
          <div class="sk">${[0, 1, 2, 3, 4].map(i => i === 0 && sk ? (SKI[o.skill] ? `<div class="has" title="${sk.name}" ${ic(SKI[o.skill])}></div>` : `<div class="has" title="${sk.name}">${sk.icon}</div>`) : '<div></div>').join('')}</div>
          <div class="hint" style="margin-bottom:0">起手只有 1 个招式，其余在路上习得；5 格按 1→5 依次自动放。</div>
        </div>
      </div>
      <div class="bot"><button class="back">返回主菜单</button><button class="dice" title="随机出身">🎲</button><button class="go" ${F.open ? '' : 'disabled style="opacity:.5"'}>出　发</button></div>`;
    el.querySelectorAll('.og .card').forEach(b => b.onclick = () => { if (O[b.dataset.o].locked) return; SURV.setOrigin(b.dataset.o); render(); });
    el.querySelectorAll('.diff .card').forEach(b => b.onclick = () => { if (window.TITLE && TITLE.setHard) TITLE.setHard(b.dataset.h === '1'); render(); });
    el.querySelectorAll('.arr').forEach(b => b.onclick = () => { field = (field + +b.dataset.f + FIELDS.length) % FIELDS.length; render(); });
    el.querySelector('.dice').onclick = () => { const ks = Object.keys(O).filter(k => !O[k].locked); SURV.setOrigin(ks[Math.random() * ks.length | 0]); render(); };
    el.querySelector('.back').onclick = () => { close(); if (window.TITLE && TITLE.show) TITLE.show(); };
    el.querySelector('.go').onclick = () => { if (!FIELDS[field].open) return; close(); if (window.TITLE && TITLE.beginRun) TITLE.beginRun(); };
  }
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function open(n) {
    name = n || '无名'; field = 0;
    if (!document.getElementById('kaijuCss')) { const s = document.createElement('style'); s.id = 'kaijuCss'; s.textContent = CSS; document.head.appendChild(s); }
    if (!el) { el = document.createElement('div'); el.id = 'kaiju'; el.addEventListener('pointerdown', e => e.stopPropagation()); el.addEventListener('touchmove', e => e.stopPropagation(), { passive: true }); }
    document.body.appendChild(el); render();
  }
  function close() { if (el) el.remove(); }
  window.KAIJU = { open, close, active: () => !!(el && el.parentNode) };
})();
