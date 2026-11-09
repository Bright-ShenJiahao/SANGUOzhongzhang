// 开局配置（三国终章，用户定 11/09）：照三国幸存者的三栏布局。
// 左：称号 / 势力 / 出身；中：所选战场；右：兵籍牒（属性 + 起手招式）。整军备战不要了。
(() => {
  const ATTR = ['体魄', '短兵', '长兵', '身法', '运气', '悟性'];
  const STAT = {   // 出身的属性条（先只是展示，数值以后再接）
    nongfu: [6, 4, 2, 2, 3, 2], xiaozu: [4, 3, 4, 3, 2, 2], liehu: [3, 3, 1, 5, 3, 2], shusheng: [2, 1, 1, 2, 3, 6],
  };
  const FIELDS = [
    { name: '黄巾之乱 · 村口', note: '撑过 20 波黄巾，第 10/14/17/20 波有敌将。', open: true },
    { name: '黄巾决战 · 祭台', note: '第二章，暂未开放。', open: false },
  ];
  const ICON = { nongfu: '农', xiaozu: '卒', liehu: '猎', shusheng: '书' };
  let el = null, field = 0, name = '无名';
  const CSS = `
  #kaiju{position:fixed;inset:0;z-index:10005;background:radial-gradient(ellipse at 50% 30%,#2a1c12,#120c08 75%);color:#f2e4c8;
    font-family:"PingFang SC","Noto Sans CJK SC","Microsoft YaHei",sans-serif;display:flex;flex-direction:column;
    padding:calc(8px + env(safe-area-inset-top)) calc(10px + env(safe-area-inset-right)) calc(8px + env(safe-area-inset-bottom)) calc(10px + env(safe-area-inset-left));box-sizing:border-box}
  #kaiju *{box-sizing:border-box}
  #kaiju .top{display:flex;align-items:center;gap:10px;border-bottom:1px solid #5a4226;padding-bottom:6px;margin-bottom:8px}
  #kaiju .seal{width:34px;height:34px;background:#a8281e;color:#ffe9c0;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:18px;border-radius:4px;transform:rotate(-4deg)}
  #kaiju .top h1{margin:0;font-size:20px;letter-spacing:6px;color:#f5e2b8}#kaiju .top small{color:#a8916c;font-size:11px;letter-spacing:2px}
  #kaiju .cols{flex:1;min-height:0;display:grid;grid-template-columns:1fr 1.25fr 1fr;gap:10px}
  #kaiju .pan{border:1px solid #8a6a3a;border-radius:6px;background:linear-gradient(180deg,rgba(40,28,18,.95),rgba(26,18,12,.95));padding:10px;overflow:auto;min-height:0;box-shadow:inset 0 0 0 3px rgba(0,0,0,.25)}
  #kaiju h4{margin:4px 0 6px;color:#e9cf98;font-size:13px;letter-spacing:6px;display:flex;align-items:center;gap:8px}
  #kaiju h4:after{content:"";flex:1;height:1px;background:#5a4226}
  #kaiju select{width:100%;background:#1c140d;color:#f2e4c8;border:1px solid #8a6a3a;border-radius:4px;padding:6px;font-size:13px}
  #kaiju .hint{margin:6px 0 10px;padding:6px 8px;border-left:3px solid #b08a4a;background:rgba(0,0,0,.25);font-size:12px;color:#d8c39a}
  #kaiju .og{display:flex;gap:6px;flex-wrap:wrap}
  #kaiju .og button{width:46px;height:46px;border:1px solid #6b5230;border-radius:6px;background:#241910;color:#e9cf98;font-size:20px;font-weight:900;cursor:pointer;position:relative}
  #kaiju .og button.on{border:2px solid #ffd86e;background:#3a2a1c;color:#ffd86e}
  #kaiju .og button.lock{opacity:.4;cursor:not-allowed}
  #kaiju .ogd{margin-top:8px;padding:8px;border:1px solid #b08a4a;border-radius:6px;background:rgba(60,42,26,.6)}
  #kaiju .ogd b{font-size:16px;color:#ffe9b8}#kaiju .tag{display:inline-block;margin-left:6px;padding:0 6px;border:1px solid #b08a4a;border-radius:3px;font-size:11px;color:#e9cf98}
  #kaiju .ogd p{margin:4px 0 0;font-size:12px;color:#d8c39a}
  #kaiju .field{display:flex;flex-direction:column;height:100%}
  #kaiju .pic{flex:1;min-height:90px;border:1px solid #5a4226;border-radius:4px;background-size:cover,cover;background-position:center bottom,center;position:relative}
  #kaiju .pic.lock{filter:grayscale(1) brightness(.5)}
  #kaiju .pic .arr{position:absolute;top:50%;transform:translateY(-50%);width:28px;height:44px;border:0;background:rgba(0,0,0,.45);color:#f2e4c8;font-size:20px;cursor:pointer}
  #kaiju .fname{text-align:center;font-size:18px;letter-spacing:6px;color:#f5e2b8;margin:8px 0 2px}#kaiju .fnote{text-align:center;font-size:12px;color:#a8916c}
  #kaiju .rows div{display:flex;justify-content:space-between;border-bottom:1px dotted #5a4226;padding:3px 0;font-size:13px}#kaiju .rows span{color:#a8916c}
  #kaiju .bar{display:grid;grid-template-columns:34px 1fr 16px;align-items:center;gap:6px;font-size:12px;margin:3px 0}
  #kaiju .bar i{display:block;height:7px;background:#3a2a1c;border-radius:2px;overflow:hidden}#kaiju .bar i u{display:block;height:100%;background:linear-gradient(90deg,#8a2a1e,#e0804a)}
  #kaiju .sk{display:flex;gap:5px;margin-top:4px}#kaiju .sk div{flex:1;aspect-ratio:1;max-width:42px;border:1px solid #6b5230;border-radius:4px;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:18px;background:#1c140d;color:#5a4a36}
  #kaiju .sk div.has{border-color:#ffd86e;color:#ffd86e;background:#3a2a1c}
  #kaiju .bot{display:flex;align-items:center;gap:10px;margin-top:8px}
  #kaiju .bot button{border:1px solid #b08a4a;border-radius:6px;background:linear-gradient(180deg,#3a2a1c,#241910);color:#f5e2b8;font-size:16px;letter-spacing:6px;padding:9px 18px;cursor:pointer}
  #kaiju .bot .go{margin-left:auto;padding:10px 46px;font-size:18px;border:2px solid #d8b060;background:linear-gradient(180deg,#5a3a20,#2a1a10)}
  #kaiju .bot .dice{letter-spacing:0;padding:8px 12px}
  @media (max-height:520px){#kaiju .top{padding-bottom:3px;margin-bottom:5px}#kaiju .top h1{font-size:16px}#kaiju .pan{padding:6px 8px}#kaiju h4{margin:2px 0 4px}
    #kaiju .hint{margin:4px 0 6px;padding:4px 6px}#kaiju .og button{width:38px;height:38px;font-size:16px}#kaiju .bar{margin:1px 0}#kaiju .rows div{padding:1px 0;font-size:12px}
    #kaiju .hint{display:none}#kaiju select{padding:3px 6px;font-size:12px}#kaiju .sk div{max-width:32px;font-size:14px}#kaiju .ogd{margin-top:5px;padding:5px 7px}#kaiju .ogd p{font-size:11px}#kaiju .bar{font-size:11px}#kaiju .pic{min-height:60px}#kaiju .bot{margin-top:5px}#kaiju .bot button{padding:6px 14px;font-size:14px}#kaiju .bot .go{padding:7px 34px}#kaiju .fname{font-size:15px;margin:4px 0 0}}
  @media (max-width:700px) and (orientation:portrait){#kaiju .cols{grid-template-columns:1fr;overflow:auto}#kaiju .pan{overflow:visible}#kaiju .pic{min-height:140px}}`;
  function render() {
    const O = window.SURV ? SURV.ORIGINS : {}, cur = SURV.origin(), o = O[cur], st = STAT[cur] || [], SK = SURV.SK, sk = SK[o.skill];
    const F = FIELDS[field], bg = typeof BG !== 'undefined' ? (window.INK_BG ? `url('${BG.inkNear}'),url('${BG.inkFar}')` : `url('${BG.mid}'),url('${BG.far}')`) : 'none';
    el.innerHTML = `
      <div class="top"><div class="seal">卒</div><div><h1>开局配置</h1><small>选择你的出身</small></div></div>
      <div class="cols">
        <div class="pan">
          <h4>称号</h4><select disabled><option>无</option></select><div class="hint">未佩戴称号（通关或达成条件后获得）</div>
          <h4>势力</h4><select disabled><option>普通乡勇</option></select><div class="hint">普通乡勇　增：无；减：无</div>
          <h4>出身</h4>
          <div class="og">${Object.keys(O).map(k => `<button data-o="${k}" class="${k === cur ? 'on' : ''} ${O[k].locked ? 'lock' : ''}" title="${O[k].name}">${ICON[k] || '?'}</button>`).join('')}</div>
          <div class="ogd"><b>${o.name}</b><span class="tag">${o.tag}</span><p>${o.desc}</p><p>起手招式：<b style="font-size:13px;color:${sk ? sk.color : '#fff'}">${sk ? sk.name : '—'}</b>${sk ? '（' + sk.desc + '）' : ''}</p></div>
        </div>
        <div class="pan field">
          <h4>所选战场</h4>
          <div class="pic ${F.open ? '' : 'lock'}" style="background-image:${bg}"><button class="arr" data-f="-1" style="left:4px">‹</button><button class="arr" data-f="1" style="right:4px">›</button></div>
          <div class="fname">${F.name}</div><div class="fnote">${F.note}</div>
        </div>
        <div class="pan">
          <h4>兵籍牒</h4>
          <div class="rows"><div><span>姓名</span>${esc(name)}</div><div><span>出身</span>${o.name}</div><div><span>兵器</span>大刀</div></div>
          <h4 style="margin-top:8px">属性</h4>
          ${ATTR.map((a, i) => `<div class="bar"><span>${a}</span><i><u style="width:${(st[i] || 0) * 14}%"></u></i><span>${st[i] || 0}</span></div>`).join('')}
          <h4 style="margin-top:8px">招式</h4>
          <div class="sk">${[0, 1, 2, 3, 4].map(i => i === 0 && sk ? `<div class="has" title="${sk.name}">${sk.icon}</div>` : '<div>空</div>').join('')}</div>
          <div class="hint" style="margin-bottom:0">起手只有 1 个招式，其余在波间习得；5 格按 1→5 依次自动放。</div>
        </div>
      </div>
      <div class="bot"><button class="back">返回主菜单</button><button class="dice" title="随机出身">🎲</button><button class="go" ${F.open ? '' : 'disabled style="opacity:.5"'}>出　发</button></div>`;
    el.querySelectorAll('.og button').forEach(b => b.onclick = () => { if (O[b.dataset.o].locked) return; SURV.setOrigin(b.dataset.o); render(); });
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
