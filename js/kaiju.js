// 开局配置（三国终章，用户定 11/09）：照三国幸存者的三栏布局。
// 左：称号 / 势力 / 出身；中：所选战场；右：兵籍牒（属性 + 起手招式）。整军备战不要了。
(() => {
  const WEP = [['dao', '刀', true], ['jian', '剑'], ['chui', '锤'], ['qiang', '枪'], ['guandao', '关刀'], ['gong', '弓']];   // 兵器路数（11/11）：只有刀有美术，其余上锁
  let axSel = -1;
  const FIELDS = [
    { name: '黄巾之乱', sub: '第一章 · 中平元年', note: '从涿郡一路杀到张角祭坛：18 层、4 位段首领、终战张角。', open: true, pic: 'art/ui/kaiju/field1.webp' },
    { name: '董卓乱京', sub: '第二章 · 中平六年', note: '暂未开放，敬请期待。', open: false },   // 11/11 用户定：先放出来，但不能选
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
  #kaiju .top{display:flex;align-items:center;gap:12px;padding:7px 14px;margin:0 0 10px;align-self:flex-start;min-width:min(420px,100%);background:linear-gradient(90deg,rgba(22,15,10,.94) 0%,rgba(22,15,10,.88) 70%,rgba(22,15,10,0) 100%);border-bottom:1px solid #b08a4a;border-radius:3px 0 0 0}
  #kaiju .seal{width:34px;height:34px;background:#a8281e;color:#ffe9c0;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:18px;border-radius:4px;transform:rotate(-4deg);box-shadow:0 2px 6px rgba(80,20,10,.35)}
  #kaiju .top h1{margin:0;font-size:22px;letter-spacing:8px;color:#f5e2b8;text-shadow:0 1px 3px #000}#kaiju .top small{color:#c9b08a;font-size:12px;letter-spacing:3px}
  #kaiju .cols{flex:1;min-height:0;display:grid;grid-template-columns:1.25fr 1fr 1fr;gap:12px}
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
  #kaiju .fl{display:flex;gap:8px;margin-top:8px}
  #kaiju .fl button{flex:1;min-width:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;padding:7px 6px;border:1px solid #5a4226;border-radius:4px;background:rgba(36,25,16,.85);color:#e9cf98;font-family:inherit;cursor:pointer}
  #kaiju .fl button b{font-size:15px;letter-spacing:4px;white-space:nowrap}#kaiju .fl button small{font-size:11px;color:#a8916c;white-space:nowrap}
  #kaiju .fl button.on{border-color:#ffd86e;background:linear-gradient(180deg,rgba(90,62,30,.9),rgba(50,34,18,.9));box-shadow:0 0 0 1px #ffd86e,0 0 12px rgba(255,200,90,.4);color:#ffe9b8}
  #kaiju .fl button.lock{opacity:.55;cursor:not-allowed;filter:grayscale(.6)}#kaiju .fl button.lock b:before{content:"🔒 ";font-size:12px;letter-spacing:0}
  #kaiju .fl button.shake{animation:kjShake .3s}@keyframes kjShake{25%{transform:translateX(-4px)}75%{transform:translateX(4px)}}
  #kaiju .fname{font-size:20px;letter-spacing:8px;color:#ffe9b8;text-shadow:0 2px 6px #000}#kaiju .fnote{font-size:12px;color:#d8c39a;margin-top:2px}
  #kaiju .wp{display:grid;grid-template-columns:repeat(3,1fr);gap:5px}
  #kaiju .wp button{padding:6px 2px;border:1px solid #5a4226;border-radius:4px;background:rgba(36,25,16,.85);color:#e9cf98;font:700 15px inherit;font-family:inherit;letter-spacing:3px;cursor:pointer}
  #kaiju .wp button.on{border-color:#ffd86e;background:linear-gradient(180deg,rgba(90,62,30,.9),rgba(50,34,18,.9));box-shadow:0 0 0 1px #ffd86e,0 0 10px rgba(255,200,90,.4);color:#ffe9b8}
  #kaiju .wp button.lock{opacity:.45;cursor:not-allowed;font-weight:400}#kaiju .wp button.lock:after{content:"🔒";font-size:10px;margin-left:2px}
  #kaiju .wp button.shake,#kaiju .fl button.shake{animation:kjShake .3s}
  #kaiju .skd{margin-top:6px;padding:7px 8px;border:1px solid rgba(176,138,74,.5);border-radius:4px;background:rgba(60,42,26,.4);font-size:12px;color:#d8c39a;line-height:1.6}
  #kaiju .skd b{font-size:14px}
  #kaiju .bag{display:grid;grid-template-columns:repeat(5,1fr);gap:5px;margin-top:4px}#kaiju .bag div{aspect-ratio:1;max-width:48px;border:1px dashed #5a4226;border-radius:3px;background:rgba(20,14,9,.7) center/cover;position:relative}
  #kaiju .bag div.has{border:1px solid #8a6a3a}#kaiju .bag div i{position:absolute;right:2px;bottom:1px;font-style:normal;font-size:10px;color:#ffe9b8;text-shadow:0 1px 2px #000}
  #kaiju .ax{font-size:11px;color:#c9b08a;white-space:nowrap;text-align:right}
  #kaiju .bar{cursor:help}#kaiju .bar.sel span:first-child{color:#ffd86e}
  #kaiju .axd{min-height:1.5em;margin:4px 0 2px;font-size:11px;color:#a8916c}
  #kaiju .rows div{display:flex;justify-content:space-between;border-bottom:1px dotted #5a4226;padding:3px 0;font-size:13px}#kaiju .rows span{color:#a8916c}
  #kaiju .bar{display:grid;grid-template-columns:34px 1fr 14px 70px;align-items:center;gap:6px;font-size:12px;margin:3px 0}
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
    #kaiju .pic{min-height:60px}#kaiju .bot{margin-top:5px}#kaiju .bot button{padding:6px 14px;font-size:14px}#kaiju .bot .go{padding:7px 36px}#kaiju .fname{font-size:16px}#kaiju .fl{margin-top:5px}#kaiju .fl button{padding:4px}#kaiju .fl button small{display:none}#kaiju .top{padding:4px 10px;margin-bottom:6px}}
  @media (max-width:700px) and (orientation:portrait){#kaiju .cols{display:flex;flex-direction:column;overflow-y:auto;gap:10px;-webkit-overflow-scrolling:touch}#kaiju .pan{overflow:visible;flex:none}#kaiju .field{order:-1;height:auto}#kaiju .pic{flex:none;height:min(56vw,240px)}#kaiju .bot button{letter-spacing:2px;padding:9px 12px;white-space:nowrap}#kaiju .bot .go{flex:1;padding:10px 0;letter-spacing:8px}}`;
  function render() {
    const O = window.SURV ? SURV.ORIGINS : {}, cur = SURV.origin(), o = O[cur], ai = SURV.attrInfo ? SURV.attrInfo(cur) : [], SK = SURV.SK, sk = SK[o.skill];
    const F = FIELDS[field], hard = !!(window.TITLE && TITLE.hardMode && TITLE.hardMode());
    const ic = u => `style="background-image:url('${u}')"`;
    el.innerHTML = `
      <div class="top"><div class="seal">卒</div><div><h1>开局配置</h1><small>选择你的出身</small></div></div>
      <div class="cols">
        <div class="pan field">
          <h4>所选战场</h4>
          <div class="pic" style="background-image:url('${F.pic}')">
            <div class="ban"><div class="fname">${F.name}</div><div class="fnote">${F.note}</div></div></div>
          <div class="fl">${FIELDS.map((f, i) => `<button data-i="${i}" class="${i === field ? 'on' : ''} ${f.open ? '' : 'lock'}" title="${f.open ? '' : '暂未开放'}"><b>${f.name}</b><small>${f.open ? f.sub : '暂未开放'}</small></button>`).join('')}</div>
        </div>
        <div class="pan">
          <h4>名号</h4>
          <div class="namep"><div class="ico" ${ic(PIC.plate)}></div><div><b>${esc(name)}</b><small>称号：无（通关或达成条件后获得）</small></div></div>
          <h4>势力</h4><select disabled><option>普通乡勇　增：无；减：无</option></select>
          <h4 style="margin-top:10px">出身</h4>
          <div class="og">${Object.keys(O).map(k => `<button data-o="${k}" class="card ${k === cur ? 'on' : ''} ${O[k].locked ? 'lock' : ''}"><div class="ico" ${ic(OGI[k] || '')}></div><span><b>${O[k].name}</b><small>${(O[k].desc || '').split('。')[0]}</small></span></button>`).join('')}</div>
          <div class="ogd"><b>${o.name}</b><span class="tag">${o.tag}</span><p>${o.desc}</p><p>起手招式：<b style="font-size:13px;color:${sk ? sk.color : '#fff'}">${sk ? sk.name : '—'}</b>${sk ? '（' + sk.desc + '）' : ''}</p></div>
          <h4 style="margin-top:10px">兵器路数</h4>
          <div class="wp">${WEP.map(w => `<button data-w="${w[0]}" class="${w[2] ? 'on' : 'lock'}" title="${w[2] ? '' : '暂未开放'}">${w[1]}</button>`).join('')}</div>
          <h4 style="margin-top:10px">难度</h4>
          <div class="diff"><button class="card ${hard ? '' : 'on'}" data-h="0"><div class="ico" ${ic(PIC.std)}></div><span><b>标准</b><small>试牛刀，来去自如</small></span></button><button class="card ${hard ? 'on' : ''}" data-h="1"><div class="ico" ${ic(PIC.hard)}></div><span><b style="color:#ff8a70">困难</b><small>敌人更强，积分×1.25</small></span></button></div>
        </div>
        <div class="pan">
          <h4>兵籍牒</h4>
          <div class="rows"><div><span>姓名</span>${esc(name)}</div><div><span>出身</span>${o.name}</div><div><span>兵器</span>刀</div><div><span>难度</span>${hard ? '困难' : '标准'}</div></div>
          <h4 style="margin-top:8px">属性</h4>
          ${ai.map((r, i) => `<div class="bar ${i === axSel ? 'sel' : ''}" data-a="${i}" title="${r[3]}"><span>${r[0]}</span><i><u style="width:${r[1] * 14}%"></u></i><span>${r[1]}</span><span class="ax">${r[2]}</span></div>`).join('')}
          <div class="axd">${axSel >= 0 && ai[axSel] ? ai[axSel][0] + '：' + ai[axSel][3] : '点属性看说明（3 为常人水平）'}</div>
          <h4 style="margin-top:8px">起手招式</h4>
          <div class="sk">${[0, 1, 2, 3, 4].map(i => i === 0 && sk ? (SKI[o.skill] ? `<div class="has" title="${sk.name}" ${ic(SKI[o.skill])}></div>` : `<div class="has" title="${sk.name}">${sk.icon}</div>`) : '<div></div>').join('')}</div>
          ${sk ? `<div class="skd"><b style="color:${sk.color}">${sk.name}</b>　${sk.desc}<br>单刀招式 · 受「短兵」加成 · 自动出手</div>` : ''}
          <div class="hint" style="margin-bottom:6px">起手只有 1 个招式，其余在路上习得；5 格按 1→5 依次自动放。</div>
          <h4 style="margin-top:8px">行囊</h4>
          <div class="bag"><div class="has" style="background-image:url('art/ui/kaiju/bag.webp')" title="盘缠"><i>0</i></div>${'<div></div>'.repeat(9)}</div>
          <div class="axd">路上拾得的物品会放在这里（物品系统制作中）</div>
        </div>
      </div>
      <div class="bot"><button class="back">返回主菜单</button><button class="dice" title="随机出身">🎲</button><button class="go" ${F.open ? '' : 'disabled style="opacity:.5"'}>出　发</button></div>`;
    el.querySelectorAll('.og .card').forEach(b => b.onclick = () => { if (O[b.dataset.o].locked) return; SURV.setOrigin(b.dataset.o); render(); });
    el.querySelectorAll('.wp button.lock').forEach(b => b.onclick = () => { b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); });
    el.querySelectorAll('.bar').forEach(b => b.onclick = () => { axSel = +b.dataset.a === axSel ? -1 : +b.dataset.a; render(); });
    el.querySelectorAll('.diff .card').forEach(b => b.onclick = () => { if (window.TITLE && TITLE.setHard) TITLE.setHard(b.dataset.h === '1'); render(); });
    el.querySelectorAll('.fl button').forEach(b => b.onclick = () => { const f = FIELDS[+b.dataset.i]; if (!f.open) { b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); return; } field = +b.dataset.i; render(); });
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
