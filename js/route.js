// 三国终章：杀戮尖塔式路线图（水墨长卷）。网址带 ?route 才启用（和现在「一路 20 波」对比用）。
// - 横向长卷：左边涿郡出发，右边张角祭坛；每一列是一层，每层 3~5 个节点，随机分叉。手机竖屏自动改成纵向。
// - 节点：战（普通战斗）/ 精（精英）/ 营（营地：回血或磨刀）/ 帅（Boss，暂用第 18~20 级敌人顶替）。
// - 战斗由 survive.js 负责：SURV.beginNode(节点) 开打，打完回到这里 ROUTE.done(节点)。
(() => {
  const ON = /[?&]route(?:=|&|$)/.test(location.search);
  const LAYERS = 18, LANES = 5;
  const WAVES_OF = { battle: 3, elite: 4, boss: 3 };   // 每种节点打几波（可调）
  const TIME_K = 1.1;                                   // 路线模式下每波时间缩放（20 波表 ≈21 分钟，12 层约合 30 分钟）
  const ICON = { battle: 0, elite: 1, camp: 2, boss: 3, start: 4, shop: 5, event: 6, chest: 7 };   // 图标表（art/ui/route_icons.webp，4×2，每格 256）
  const MAPN = { field: '打谷场', town: '县城街巷', yz: '黄巾营寨', forest: '林间空地', camp: '营寨腹地', altar: '张角祭坛' };
  const SECT = [['field', 1, 4, '120,140,80', .13], ['town', 5, 8, '160,115,70', .13], ['forest', 9, 12, '110,130,70', .12], ['camp', 13, 16, '165,70,45', .12], ['altar', 17, 18, '70,55,95', .2]];   // 分段：地图、起止层、淡墨色调
  const hov = { n: null };
  const LABEL = { battle: '黄巾游兵', elite: '黄巾精锐', camp: '营地', boss: '张角祭坛', start: '涿郡', event: '奇遇', chest: '宝箱' };
  const EVENTS = [   // 奇遇：几个小抉择，选完不打架直接回长卷
    { t: '破庙神像', d: '路边一座破庙，神像前还摆着供品。', o: [['上香祈福', '回复 40% 血量', 'pray'], ['搜刮供品', '失去 20% 血量，换一次战利三选一', 'loot']] },
    { t: '路边老兵', d: '一个断了腿的老兵坐在树下，招呼你过去。', o: [['请他喝酒', '武艺伤害 +8%', 'wine'], ['向他求教', '一次战利三选一', 'learn']] },
    { t: '溪边磨石', d: '溪水边有一块平整的磨刀石。', o: [['磨刀', '武艺伤害 +10%', 'sharpen'], ['歇脚', '回复 30% 血量', 'rest']] },
  ];
  const FONT = '"MaShanZheng","STKaiti","KaiTi","Songti SC",serif';
  const UI = '"PingFang SC","Microsoft YaHei","Noto Sans CJK SC",sans-serif';   // 小字用黑体加粗，毛笔字只用在标题和节点名（11/11：字太小太细）
  const BGH = new Image(), BGV = new Image(); BGH.src = 'art/route/bg_h.webp'; BGV.src = 'art/route/bg_v.webp'; BGH.onload = BGV.onload = () => { bgKey = ''; };
  const FONT_Q = FONT.replace(/"/g, "'"), UI_Q = UI.replace(/"/g, "'");
  const KS = () => Math.max(1, Math.min(1.45, Math.min(W / 1280, H / 720)));
  const INK = '#2a211a', CINNABAR = '#b3281e', PAPER = '#eadcc0';

  let run = null, pending = false, shown = false, root = null, cv = null, g = null, W = 0, H = 0, DPR = 1, scroll = 0, tScroll = 0, raf = 0, t0 = 0, drag = null, noise = null, campBox = null, bgC = null, bgKey = '';
  const rnd = () => Math.random();
  const seeded = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

  // ---------- 生成地图 ----------
  // 结构（用户定 11/09，仿杀戮尖塔 + 群侠传）：4 段 × 4 层。每段：3 层岔路（4 条路径）→ 汇聚到该段唯一的首领节点 → 下一段从首领再散开。
  // 第 17 层单个营地，第 18 层最终首领。段内节奏：第 1 层纯近战；第 2 层加远程/盾枪；第 3 层精锐或小营地；第 4 层段首领。
  const SEGS = 4, SEGLEN = 4;
  const TAGN = { melee: '流民群', raid: '刀盾队', range: '弓手阵', shield: '盾枪阵', patrol: '精锐巡逻' };
  const RWN = { skill: '学一个新武艺', perk: '学一门心法', heal: '包扎回血', both: '武艺 + 心法' };
  const SECBOSS = [['程远志', '邓茂'], ['波才', '何仪'], ['管亥', '张曼成'], ['张梁', '张宝']];
  function gen() {
    const nodes = [], byLayer = [], cells = {};
    const mk = (l, c, type) => { const n = { id: nodes.length, layer: l, lane: c, type: type || 'battle', tag: '', rw: '', next: [], prev: [], jx: seeded(nodes.length + 1) - .5, jy: seeded(nodes.length + 9) - .5 }; nodes.push(n); (byLayer[l] = byLayer[l] || []).push(n); return n; };
    const cell = (l, c) => cells[l + ':' + c] || (cells[l + ':' + c] = mk(l, c));
    const start = mk(0, 2, 'start');
    const link = (a, b) => { if (!a.next.includes(b)) { a.next.push(b); b.prev.push(a); } };
    const crosses = (a, b) => nodes.some(o => o.layer === a.layer && o !== a && o.next.some(p => p !== b && p.layer === b.layer && (o.lane - a.lane) * (p.lane - b.lane) < 0));
    let from = start;
    for (let s = 0; s < SEGS; s++) {
      const l0 = s * SEGLEN + 1, lb = l0 + SEGLEN - 1;
      const bossN = mk(lb, 2, 'boss'); bossN.sec = s + 1;
      const lanes = [0, 1, 2, 3, 4].sort(() => rnd() - .5).slice(0, 4);
      for (const ln of lanes) {
        let cur = cell(l0, ln); link(from, cur);
        for (let l = l0 + 1; l < lb; l++) {
          const opts = [-1, 0, 1].map(d => cur.lane + d).filter(c => c >= 0 && c < LANES).sort(() => rnd() - .5);
          let nx = null;
          for (const c of opts) { const n = cell(l, c); if (!crosses(cur, n)) { nx = n; break; } }
          if (!nx) nx = cell(l, cur.lane);
          link(cur, nx); cur = nx;
        }
        link(cur, bossN);
      }
      from = bossN;
    }
    const camp = mk(LAYERS - 1, 2, 'event'); link(from, camp);
    const fin = mk(LAYERS, 2, 'boss'); fin.final = true; fin.sec = 5; link(camp, fin);
    // 节点类型：按「段内第几层」定节奏
    const pickRw = () => { const r = rnd(); return r < .4 ? 'skill' : r < .72 ? 'perk' : 'heal'; };
    for (let l = 1; l < LAYERS - 1; l++) {
      const k = (l - 1) % SEGLEN + 1, sg = (l - 1) / SEGLEN | 0; if (k === SEGLEN) continue;
      for (const n of byLayer[l] || []) {
        const r = rnd(); let t = 'battle';
        if (k === 1) t = l > 1 && r > .84 ? 'event' : 'battle';
        else if (k === 2) t = r < .14 && sg >= 1 ? 'elite' : r < .32 ? 'event' : 'battle';
        else t = r < .5 ? 'elite' : r < .7 ? 'event' : 'battle';
        if ((t === 'camp' || t === 'elite') && n.prev.some(p => p.type === t)) t = 'battle';
        n.type = t;
      }
      const lay = byLayer[l] || [];
      if (lay.length >= 2 && new Set(lay.map(n => n.type)).size === 1) {   // 同层不能全是同一种
        const n = lay[lay.length - 1], cur = n.type;
        const alts = k === 1 ? (l > 1 ? ['event'] : []) : k === 2 ? ['event', 'elite'] : cur === 'elite' ? ['battle'] : ['elite'];
        const a = alts.filter(x => x !== cur && !(n.prev.some(p => p.type === x) && (x === 'camp' || x === 'elite')));
        if (a.length) n.type = a[(rnd() * a.length) | 0];
      }
      const bat = lay.filter(n => n.type === 'battle');
      const opt = k === 1 ? ['melee', 'raid'] : ['range', 'shield'];
      bat.forEach((n, i) => { n.tag = opt[(i + (rnd() < .5 ? 1 : 0)) % 2]; if (bat.length >= 2 && i > 0 && n.tag === bat[i - 1].tag) n.tag = opt.find(x => x !== n.tag); });
      for (const n of lay) { if (n.type === 'elite') { n.tag = 'patrol'; } }
    }
    return { nodes, byLayer, start };
  }

  // ---------- 界面 ----------
  const port = () => W < H * .9;
  const GAP = () => port() ? Math.max(104, H * .15) : Math.max(150, W * .125);
  const MARGIN = () => port() ? 110 : 150;
  const LEN = () => MARGIN() * 2 + LAYERS * GAP();
  const VIEW = () => port() ? H : W;
  const maxScroll = () => Math.max(0, LEN() - VIEW());
  function pos(n) {
    const m = MARGIN() + n.layer * GAP() - scroll, span = port() ? W : H;
    const lo = port() ? W * .18 : H * .24, hi = port() ? W * .82 : H * .8;
    const c = lo + (n.lane + n.jx * .35) / (LANES - 1) * (hi - lo) + n.jy * 10;
    return port() ? { x: c, y: H - m } : { x: m, y: c };
  }
  const nlabel = n => !n ? '' : n.type === 'boss' ? (n.final ? '张角祭坛' : SECBOSS[n.sec - 1][0] + ' 营垒') : (n.tag && TAGN[n.tag]) || LABEL[n.type];
  const radius = n => n.type === 'boss' ? 42 : n.type === 'elite' ? 30 : n.type === 'start' ? 28 : 26;
  const reachable = n => !!run && run.cur.next.includes(n);
  const visited = n => !!run && run.visited.has(n);

  function ensureDom() {
    if (root) return;
    root = document.createElement('div'); root.id = 'routeMap';
    root.style.cssText = 'position:fixed;inset:0;z-index:10010;background:' + PAPER + ';touch-action:none;user-select:none;-webkit-user-select:none';
    cv = document.createElement('canvas'); cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block';
    root.appendChild(cv); document.body.appendChild(root); g = cv.getContext('2d');
    const exit = document.createElement('button'); exit.textContent = '退出';
    const bk = Math.max(1, Math.min(1.45, Math.min(innerWidth / 1280, innerHeight / 720)));
    const card = document.createElement('button'); card.textContent = '兵籍牒';   // 11/11：这一局的当前属性、修为、武艺
    card.style.cssText = 'position:absolute;right:' + (innerWidth < innerHeight * .9 ? 14 : Math.round(96 * bk)) + 'px;top:' + (innerWidth < innerHeight * .9 ? Math.round(56 * bk) : 12) + 'px;padding:6px 14px;font:700 ' + Math.round(16 * bk) + 'px ' + UI + ';letter-spacing:2px;color:#3b2a1c;background:#f3e6c8;border:1px solid #7a5a2c;border-radius:6px;cursor:pointer;z-index:2';
    card.onclick = () => sheet();
    root.appendChild(card);
    exit.style.cssText = 'position:absolute;right:14px;top:12px;padding:6px 14px;font:700 ' + Math.round(16 * Math.max(1, Math.min(1.45, Math.min(innerWidth / 1280, innerHeight / 720)))) + 'px ' + UI + ';letter-spacing:2px;color:#f3dc9a;background:rgba(40,28,18,.8);border:1px solid #c9a24a;border-radius:6px;cursor:pointer;z-index:2';
    exit.onclick = () => { if (!confirm('退出本局，回到主界面？')) return; close(); if (typeof returnFromPausedGame === 'function') returnFromPausedGame(true); else if (window.TITLE && TITLE.show) TITLE.show(); };
    root.appendChild(exit);
    cv.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, s: scroll, moved: false, id: e.pointerId }; try { cv.setPointerCapture(e.pointerId); } catch (_) {} });
    cv.addEventListener('pointermove', e => {
      if (!drag) { hov.n = null; if (run && e.pointerType !== 'touch') for (const n of run.nodes) { const p = pos(n); if (Math.hypot(p.x - e.clientX, p.y - e.clientY) < radius(n) + 6) { hov.n = n; break; } } cv.style.cursor = hov.n && reachable(hov.n) ? 'pointer' : 'default'; return; }
      if (e.pointerId !== drag.id) return;
      const d = port() ? e.clientY - drag.y : drag.x - e.clientX;
      if (Math.abs(e.clientX - drag.x) + Math.abs(e.clientY - drag.y) > 8) drag.moved = true;
      if (drag.moved) { scroll = Math.max(0, Math.min(maxScroll(), drag.s + (port() ? -d : d))); tScroll = scroll; }
    });
    cv.addEventListener('pointerup', e => { const d = drag; drag = null; if (d && !d.moved) tap(e.clientX, e.clientY); });
    cv.addEventListener('wheel', e => { e.preventDefault(); scroll = Math.max(0, Math.min(maxScroll(), scroll + (port() ? -e.deltaY : e.deltaY + e.deltaX))); tScroll = scroll; }, { passive: false });
    addEventListener('resize', () => { if (shown) fit(); });
  }
  function fit() {
    DPR = Math.min(2, window.devicePixelRatio || 1); W = innerWidth; H = innerHeight;
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    scroll = Math.max(0, Math.min(maxScroll(), scroll));
  }
  function focus(snap) {
    const m = MARGIN() + run.cur.layer * GAP();
    tScroll = Math.max(0, Math.min(maxScroll(), m - VIEW() * (port() ? .62 : .3)));
    if (snap) scroll = tScroll;
  }
  function open() {
    if (!run) return;
    ensureDom(); fit(); focus(true); shown = true; root.style.display = ''; t0 = performance.now();
    if (!raf) raf = requestAnimationFrame(frame);
  }
  function close() { shown = false; if (root) root.style.display = 'none'; if (campBox) { campBox.remove(); campBox = null; } cancelAnimationFrame(raf); raf = 0; }

  function tap(cx, cy) {
    if (campBox || !run) return;
    let best = null, bd = 1e9;
    for (const n of run.cur.next) { const p = pos(n), d = Math.hypot(p.x - cx, p.y - cy); if (d < radius(n) + 16 && d < bd) { bd = d; best = n; } }
    if (best) choose(best);
  }
  function choose(n) {
    if (!reachable(n)) return;
    if (n.type === 'camp') return camp(n);
    if (n.type === 'chest') return chest(n);
    if (n.type === 'event') return happen(n);
    close();
    if (window.SURV && SURV.beginNode) SURV.beginNode(n);
  }
  function popup(title, sub, desc, opts, pick) {   // 通用选择弹窗（奇遇用）
    const box = campBox = document.createElement('div');
    box.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(30,20,12,.45);z-index:3';
    const bs = 'width:170px;padding:12px 8px;font:700 18px ' + FONT + ';color:' + INK + ';background:#f3e6c8;border:1px solid #7a5a2c;border-radius:8px;cursor:pointer';
    box.innerHTML = '<div style="background:' + PAPER + ';border:2px solid #7a5a2c;border-radius:10px;padding:18px 22px;max-width:92vw;text-align:center;font-family:' + FONT + ';color:' + INK + ';box-shadow:0 10px 40px rgba(0,0,0,.45)">'
      + '<div style="font-size:26px;letter-spacing:6px;margin-bottom:6px">' + title + '</div><div style="font-size:14px;opacity:.75;margin-bottom:14px;max-width:340px">' + desc + '</div>'
      + '<div style="display:flex;gap:12px;flex-wrap:wrap;justify-content:center">' + opts.map((o, i) => '<button data-i="' + i + '" style="' + bs + '">' + o[0] + '<br><small style="font:12px sans-serif;opacity:.8">' + o[1] + '</small></button>').join('') + '</div></div>';
    box.querySelectorAll('button').forEach(b => b.onclick = () => { box.remove(); campBox = null; pick(opts[+b.dataset.i][2]); });
    root.appendChild(box);
  }
  function happen(n) {
    if (window.SFX) SFX.play('j_event');
    const ev = EVENTS[(n.id * 7 + n.layer) % EVENTS.length];
    popup(ev.t, '', ev.d, ev.o, k => SURV.event(k, () => done(n, true)));
  }
  function chest(n) { SURV.reward(2, () => done(n, true)); }
  function camp(n) {
    const box = campBox = document.createElement('div');
    box.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(30,20,12,.45);z-index:3';
    const hp = SURV.routeHp();
    box.innerHTML = '<div style="background:' + PAPER + ';border:2px solid #7a5a2c;border-radius:10px;padding:18px 22px;max-width:92vw;text-align:center;font-family:' + FONT + ';color:' + INK + ';box-shadow:0 10px 40px rgba(0,0,0,.45)">'
      + '<div style="font-size:26px;letter-spacing:6px;margin-bottom:6px">营 地</div><div style="font-size:14px;opacity:.75;margin-bottom:14px">血量 ' + Math.ceil(hp[0]) + ' / ' + hp[1] + '</div>'
      + '<div style="display:flex;gap:12px;flex-wrap:wrap;justify-content:center">'
      + '<button data-k="heal" style="width:150px;padding:12px 8px;font:700 18px ' + FONT + ';color:' + INK + ';background:#f3e6c8;border:1px solid #7a5a2c;border-radius:8px;cursor:pointer">歇息<br><small style="font:12px sans-serif;opacity:.8">回复 30% 血量</small></button>'
      + '<button data-k="up" style="width:150px;padding:12px 8px;font:700 18px ' + FONT + ';color:' + INK + ';background:#f3e6c8;border:1px solid #7a5a2c;border-radius:8px;cursor:pointer">磨刀<br><small style="font:12px sans-serif;opacity:.8">武艺伤害 +10%</small></button></div></div>';
    box.querySelectorAll('button').forEach(b => b.onclick = () => { SURV.camp(b.dataset.k); box.remove(); campBox = null; done(n, true); });
    root.appendChild(box);
  }
  // 节点打完（或营地选完）：记下走过的路，回到长卷
  function sheet() {   // 兵籍牒：这一局当前的修为、属性、武艺、心法
    if (campBox || !window.SURV || !SURV.status) return;
    const FONT = FONT_Q, UI = UI_Q;   // 写进 style="..." 里，字体名要用单引号
    const st = SURV.status(), box = campBox = document.createElement('div');
    box.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(30,20,12,.5);z-index:3;padding:10px';
    const row = (a, b, c) => '<div style="display:flex;justify-content:space-between;gap:10px;padding:3px 0;border-bottom:1px dotted rgba(122,90,44,.4)"><span style="opacity:.75">' + a + '</span><span>' + b + (c ? '　<small style="opacity:.7">' + c + '</small>' : '') + '</span></div>';
    const h = t => '<div style="margin:10px 0 4px;font:900 15px ' + FONT + ';letter-spacing:4px;color:#7a2a1e">◆ ' + t + '</div>';
    box.innerHTML = '<div style="background:radial-gradient(ellipse at 50% 30%,#f6ead4,#e6d2b0);border:2px solid #7a5a2c;border-radius:8px;padding:16px 20px;width:min(94vw,460px);max-height:92vh;overflow:auto;font:600 13px ' + UI + ';color:' + INK + ';box-shadow:0 12px 40px rgba(0,0,0,.45)">'
      + '<div style="display:flex;justify-content:space-between;align-items:center"><div style="font:900 24px ' + FONT + ';letter-spacing:6px">兵籍牒</div><button class="x" style="font:700 14px ' + UI + ';padding:4px 12px;background:#2e2016;color:#f3dc9a;border:1px solid #7a5a2c;border-radius:5px;cursor:pointer">关闭</button></div>'
      + row('出身', st.origin) + row('修为', 'LV.' + st.lv + '　' + st.pct + '%', st.bank ? '待修炼 ×' + st.bank : '') + row('气血', st.hp[0] + ' / ' + st.hp[1]) + (st.dmg > 1.001 ? row('武艺伤害', '+' + Math.round((st.dmg - 1) * 100) + '%', '磨刀/奇遇') : '')
      + h('属性') + st.attrs.map((r, i) => row(r[0], r[1] + (st.add[i] ? ' <small style="color:#3f8a4a">(+' + st.add[i] + ')</small>' : ''), r[2])).join('')
      + h('武艺') + (st.slots.filter(Boolean).map((k, i) => row((i + 1) + '. <i style="display:inline-block;width:9px;height:9px;border-radius:2px;background:' + k.color + ';box-shadow:0 0 0 1px rgba(0,0,0,.4);margin-right:4px"></i><b>' + k.name + '</b> LV' + k.lv, '', k.desc)).join('') || '<div style="opacity:.6">无</div>')
      + h('心法') + (st.gf.filter(Boolean).map(g => row(g.name + ' LV' + g.lv, '', g.desc)).join('') || '<div style="opacity:.6">无</div>')
      + (st.qg ? h('轻功') + row(st.qg.name, '', st.qg.desc) : '')
      + '</div>';
    const shut = () => { box.remove(); campBox = null; };
    box.querySelector('.x').onclick = shut; box.onclick = e => { if (e.target === box) shut(); };
    root.appendChild(box);
  }
  function done(n, keepOpen) {
    run.cur = n; run.visited.add(n);
    if (window.RUNSAVE) RUNSAVE.save();   // 自动存档（11/11 用户定）：每打完一个节点、回到长卷时存一次；战斗中途不存
    ensureDom(); fit(); focus(false); shown = true; root.style.display = ''; t0 = performance.now();
    if (!raf) raf = requestAnimationFrame(frame);
  }

  // ---------- 绘制 ----------
  function paperNoise() {
    if (noise) return noise;
    const c = document.createElement('canvas'); c.width = c.height = 220; const x = c.getContext('2d');
    for (let i = 0; i < 1400; i++) { x.fillStyle = `rgba(${90 + seeded(i) * 40 | 0},${70 + seeded(i + 5) * 30 | 0},40,${.02 + seeded(i + 11) * .05})`; x.fillRect(seeded(i + 2) * 220, seeded(i + 3) * 220, 1 + seeded(i + 4) * 2, 1 + seeded(i + 6) * 2); }
    return noise = g.createPattern(c, 'repeat');
  }
  function hills(par, alpha, h0, seed) {   // 远山：层层淡墨，随长卷慢慢错位
    g.beginPath(); const off = scroll * par;
    if (port()) {
      g.moveTo(0, H);
      for (let y = H; y >= 0; y -= 12) { const v = y + off; const x = W * .06 + Math.sin(v * .008 + seed) * 22 + Math.sin(v * .021 + seed * 2) * 12; g.lineTo(x * (h0 / 100), y); }
      g.lineTo(0, 0); g.closePath();
    } else {
      g.moveTo(0, H);
      for (let x = 0; x <= W; x += 12) { const v = x + off; const y = H - h0 - Math.abs(Math.sin(v * .004 + seed)) * H * .18 - Math.sin(v * .013 + seed * 3) * 14; g.lineTo(x, y); }
      g.lineTo(W, H); g.closePath();
    }
    g.fillStyle = `rgba(52,47,42,${alpha})`; g.fill();
  }
  function trail(a, b, na, nb, kind, seed) {   // 脚印虚线：沿略弯的曲线，左右脚交替的小墨点
    const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len, bend = (seeded(seed) - .5) * len * .22;
    const cx = (a.x + b.x) / 2 + nx * bend, cy = (a.y + b.y) / 2 + ny * bend;
    const pt = t => { const u = 1 - t; return [u * u * a.x + 2 * u * t * cx + t * t * b.x, u * u * a.y + 2 * u * t * cy + t * t * b.y]; };
    const t0_ = (radius(na) + 8) / len, t1_ = 1 - (radius(nb) + 8) / len, step = (kind === 2 ? 15 : 13) / len;
    const col = kind === 2 ? INK : kind === 1 ? '#6a3a1c' : '#4a3a2c', al = kind === 2 ? .85 : kind === 1 ? .85 : .3, rr = kind === 2 ? 3.6 : kind === 1 ? 3.2 : 2.2;
    g.fillStyle = col; let k = 0;
    for (let t = t0_; t < t1_; t += step, k++) {
      const [x, y] = pt(t), [x2, y2] = pt(Math.min(1, t + .01)), ang = Math.atan2(y2 - y, x2 - x), side = k % 2 ? 1 : -1;
      g.globalAlpha = al * (.75 + seeded(seed + k) * .25);
      g.beginPath(); g.ellipse(x + Math.cos(ang + 1.57) * side * 3.2, y + Math.sin(ang + 1.57) * side * 3.2, rr * 1.35, rr * .85, ang, 0, 7); g.fill();
    }
    g.globalAlpha = 1;
  }
  let sheetG = null;
  function sheets() {   // 图标表：彩色原图 + 水墨灰版（走过的节点用）
    const im = typeof IMG !== 'undefined' && IMG.ui_route_icons;
    if (!im || !im.complete || !im.naturalWidth) return null;
    if (sheetG !== null) return { c: im, g: sheetG || null };
    try {   // 灰版：逐像素去色；跨域图会读不出像素（抛安全错误），那就退回用滤镜
      const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; const x = c.getContext('2d'); x.drawImage(im, 0, 0);
      const d = x.getImageData(0, 0, c.width, c.height), a = d.data;
      for (let i = 0; i < a.length; i += 4) { const l = a[i] * .3 + a[i + 1] * .59 + a[i + 2] * .11, v = 40 + l * .5; a[i] = v * 1.03; a[i + 1] = v * .96; a[i + 2] = v * .88; }
      x.putImageData(d, 0, 0); sheetG = c;
    } catch (_) { sheetG = false; }
    return { c: im, g: sheetG || null };
  }
  function icon(type, size, gray) {
    const sh = sheets(); if (!sh) return;
    const k = ICON[type] || 0, sx = (k % 4) * 256, sy = (k >> 2) * 256;
    try {
      if (gray && !sh.g) { g.save(); g.filter = 'grayscale(1) brightness(.85)'; g.drawImage(sh.c, sx, sy, 256, 256, -size / 2, -size / 2, size, size); g.restore(); }
      else g.drawImage(gray ? sh.g : sh.c, sx, sy, 256, 256, -size / 2, -size / 2, size, size);
    } catch (_) {}
  }
  function seal(n, now) {
    const p = pos(n), R = radius(n), vis = visited(n), reach = reachable(n), cur = run.cur === n, t = (now - t0) / 1000;
    if (p.x < -80 || p.x > W + 80 || p.y < -80 || p.y > H + 80) return;
    const bob = reach ? Math.sin(t * 3 + n.id) * 1.6 : 0;
    g.save(); g.translate(p.x, p.y);
    // 不画圆底：图标直接落在地图上，靠柔和投影立住；可走的放大并发出朱红光晕，当前节点发金光
    const k = .5 + .5 * Math.sin(t * 3), sc = reach ? 1.12 + k * .05 : 1;
    g.translate(0, bob); g.scale(sc, sc);
    if (cur || reach) g.shadowColor = cur ? 'rgba(201,162,74,.95)' : reach ? `rgba(179,40,30,${.6 + .35 * k})` : 'rgba(40,28,18,.4)';
    if (cur || reach) { g.shadowBlur = cur ? 16 : 12 + k * 8; g.shadowOffsetY = 0; }
    g.globalAlpha = vis ? .75 : reach || cur ? 1 : .55;
    icon(n.type, R * 2.0, vis || (!reach && !cur));
    g.globalAlpha = 1; g.shadowBlur = 0; g.shadowColor = 'transparent'; g.shadowOffsetY = 0;
    if (vis && !cur) { g.beginPath(); g.arc(R * .62, -R * .62, 7, 0, 7); g.fillStyle = CINNABAR; g.fill(); g.strokeStyle = PAPER; g.lineWidth = 1.6; g.beginPath(); g.moveTo(R * .62 - 3, -R * .62); g.lineTo(R * .62 - .8, -R * .62 + 2.6); g.lineTo(R * .62 + 3.4, -R * .62 - 2.6); g.stroke(); }
    if (false && n.rw && !vis) { const bc = { skill: ['招', '#3b6ea8'], perk: ['功', '#a8662a'], heal: ['疗', '#3f8a4a'], both: ['双', '#7a3a8a'] }[n.rw]; g.beginPath(); g.arc(R * .7, R * .7, 9, 0, 7); g.fillStyle = bc[1]; g.fill(); g.strokeStyle = PAPER; g.lineWidth = 1.5; g.stroke(); g.fillStyle = '#fff'; g.font = `bold 11px ${UI}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(bc[0], R * .7, R * .7 + 1); }
    g.restore();
    // 名字：可走的节点、当前、Boss 常显；其他鼠标悬停才显
    if (hov.n !== n && ((reach && !port()) || cur || n.type === 'boss')) tag(p, R, n, cur || n.type === 'boss');
  }
  function tag(p, R, n, full) {
    const RWS = { skill: '新武艺', perk: '心法', heal: '回血', both: '武艺+心法' }, sh = false;   // 没悬停时一行写完（相邻节点挤不下两行）
    const l1 = n.type === 'start' ? '涿郡' : nlabel(n) + (sh ? ' · ' + RWS[n.rw] : ''), l2 = sh || !full ? '' : n.type === 'start' ? '' : n.type === 'event' ? '奇遇：做个选择' : n.type === 'elite' ? '精锐 · 掉落更好' : full ? MAPN[MAP_OF(n.layer)] : '';
    const k = KS(), f1 = `bold ${Math.round(18 * k)}px ${FONT}`, f2 = `600 ${Math.round(13 * k)}px ${UI}`;
    g.save(); g.font = f1; const w1 = g.measureText(l1).width; g.font = f2; const w2 = l2 ? g.measureText(l2).width : 0;
    const bw = Math.max(w1, w2) + 20 * k, bh = (l2 ? 44 : 28) * k; let x = p.x - bw / 2, y = p.y + R + 10;
    if (y + bh > H - 6) y = p.y - R - 10 - bh; x = Math.max(6, Math.min(W - bw - 6, x));
    g.fillStyle = 'rgba(40,28,18,.82)'; g.beginPath(); g.roundRect ? g.roundRect(x, y, bw, bh, 5) : g.rect(x, y, bw, bh); g.fill();
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#f3dc9a'; g.font = f1; g.fillText(l1, x + bw / 2, y + (l2 ? 15 : 14) * k);
    if (l2) { g.fillStyle = 'rgba(243,220,154,.85)'; g.font = f2; g.fillText(l2, x + bw / 2, y + 33 * k); }
    g.restore();
  }
  function tint() {   // 每一段（打谷场/县城/营寨/祭坛）一档淡墨色调，段名用大字淡淡写在背景上
    const ax = port() ? 'y' : 'x', at = l => pos({ layer: l, lane: 2, jx: 0, jy: 0 })[ax];
    for (const [k, l0, l1, rgb, al] of SECT) {
      const a = at(l0 - .5), b = at(l1 + .5), lo = Math.min(a, b), hi = Math.max(a, b), len = port() ? H : W;
      if (hi < 0 || lo > len) continue;
      const F = 110, gr = port() ? g.createLinearGradient(0, lo - F, 0, hi + F) : g.createLinearGradient(lo - F, 0, hi + F, 0), q = F / (hi - lo + 2 * F), c0 = `rgba(${rgb},0)`, c1 = `rgba(${rgb},${al})`;
      gr.addColorStop(0, c0); gr.addColorStop(q * 1.6, c1); gr.addColorStop(1 - q * 1.6, c1); gr.addColorStop(1, c0);
      g.fillStyle = gr; port() ? g.fillRect(0, lo - F, W, hi - lo + 2 * F) : g.fillRect(lo - F, 0, hi - lo + 2 * F, H);
      g.save(); g.fillStyle = `rgba(${rgb},.5)`; g.globalAlpha = .16; g.font = `${port() ? 56 : 84}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
      const c = (lo + hi) / 2; if (port()) g.fillText(MAPN[k], W * .5, c); else g.fillText(MAPN[k], c, H * .5);
      g.restore();
    }
  }
  function edge() {   // 卷轴边：内框双线、两端渐暗（还能滚就暗）、右下角印章落款
    g.save(); g.strokeStyle = 'rgba(42,33,26,.75)'; g.lineWidth = 3; g.strokeRect(9, 9, W - 18, H - 18); g.lineWidth = 1; g.strokeRect(15, 15, W - 30, H - 30);
    const fade = (x0, y0, x1, y1, a, r, gx, gy, gw, gh) => { if (a <= 0) return; const gr = g.createLinearGradient(x0, y0, x1, y1); gr.addColorStop(0, `rgba(60,42,24,${.32 * a})`); gr.addColorStop(1, 'rgba(60,42,24,0)'); g.fillStyle = gr; g.fillRect(gx, gy, gw, gh); };
    const m = maxScroll(), a0 = Math.min(1, scroll / 80), a1 = Math.min(1, (m - scroll) / 80), F = 56;
    if (port()) { fade(0, 0, 0, F, a1, 0, 0, 0, W, F); fade(0, H, 0, H - F, a0, 0, 0, H - F, W, F); } else { fade(0, 0, F, 0, a0, 0, 0, 0, F, H); fade(W, 0, W - F, 0, a1, 0, W - F, 0, F, H); }
    const s = 40, x = W - s - 26, y = H - s - 26; g.fillStyle = CINNABAR; g.globalAlpha = .9; g.fillRect(x, y, s, s); g.globalAlpha = 1; g.fillStyle = PAPER; g.font = `bold 17px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('三国', x + s / 2, y + s * .3); g.fillText('终章', x + s / 2, y + s * .72); g.restore();
  }
  function frame(now) {
    if (!shown) { raf = 0; return; }
    raf = requestAnimationFrame(frame);
    if (!drag || !drag.moved) scroll += (tScroll - scroll) * .1;
    // 静态底图（纸、淡墨分段、远山、路径）缓存成一张图：只在滚动/状态变化时重画，平时每帧只贴图 + 画发光的节点
    const key = W + 'x' + H + 'x' + DPR + '|' + scroll.toFixed(1) + '|' + (run.cur ? run.cur.id : -1) + '|' + run.visited.size + '|' + (port() ? 1 : 0);
    if (!bgC) bgC = document.createElement('canvas');
    if (key !== bgKey) {
      bgKey = key; if (bgC.width !== cv.width || bgC.height !== cv.height) { bgC.width = cv.width; bgC.height = cv.height; }
      const gMain = g; g = bgC.getContext('2d'); g.setTransform(DPR, 0, 0, DPR, 0, 0);
      g.fillStyle = PAPER; g.fillRect(0, 0, W, H);
    const bgI = port() ? BGV : BGH, bgOk = bgI.complete && bgI.naturalWidth;
    if (bgOk) {   // 11/11 Gemini 水墨长卷：随长卷慢慢平移（视差），从涿郡一路到张角祭坛
      const iw = bgI.naturalWidth, ih = bgI.naturalHeight, ms = Math.max(1, maxScroll()), t = Math.min(1, scroll / ms);
      if (port()) { const sc = Math.max(W / iw, H * 1.35 / ih), dw = iw * sc, dh = ih * sc; g.drawImage(bgI, (W - dw) / 2, -(dh - H) * (1 - t), dw, dh); }
      else { const sc = Math.max(H / ih, W * 1.35 / iw), dw = iw * sc, dh = ih * sc; g.drawImage(bgI, -(dw - W) * t, (H - dh) / 2, dw, dh); }
    } else { g.fillStyle = paperNoise(); g.fillRect(0, 0, W, H); }
    const wash = g.createRadialGradient(W * .5, H * .45, Math.min(W, H) * .2, W * .5, H * .5, Math.max(W, H) * .75);
    wash.addColorStop(0, 'rgba(255,248,230,.35)'); wash.addColorStop(1, 'rgba(120,90,50,.28)'); g.fillStyle = wash; g.fillRect(0, 0, W, H);
    tint();
    if (!bgOk) { hills(.12, .07, H * .16, 1.3); hills(.25, .11, H * .1, 4.1); hills(.45, .16, H * .045, 7.7); }
    // 路线
    for (const n of run.nodes) for (const m of n.next) {
      const a = pos(n), b = pos(m), seedE = n.id * 13 + m.id;
      const walked = visited(n) && visited(m), open = n === run.cur && reachable(m);
      trail(a, b, n, m, walked ? 2 : open ? 1 : 0, seedE);
    }
      g = gMain;
    }
    g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(bgC, 0, 0); g.setTransform(DPR, 0, 0, DPR, 0, 0);
    for (const n of run.nodes) { try { seal(n, now); } catch (e) { if (!window._rtErr) { window._rtErr = 1; console.error('route seal', e); } } }
    if (hov.n) tag(pos(hov.n), radius(hov.n), hov.n, true);   // 悬停的牌子最后画，不被旁边节点压住
    // 抬头：章节、血量、提示（手机竖屏先垫一层纸色渐隐，免得节点叠在字上）
    if (port()) { const hb = g.createLinearGradient(0, 0, 0, 132); hb.addColorStop(0, 'rgba(234,220,192,.97)'); hb.addColorStop(.75, 'rgba(234,220,192,.9)'); hb.addColorStop(1, 'rgba(234,220,192,0)'); g.fillStyle = hb; g.fillRect(0, 0, W, 132); }
    g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.fillStyle = INK;
    const k = KS(); g.font = `bold ${Math.round((port() ? 32 : 42) * k)}px ${FONT}`; g.fillText('第一章 · 黄巾之乱', 22, 56 * k);
    g.font = `600 ${Math.round(15 * k)}px ${UI}`; g.globalAlpha = .78; g.fillText(port() ? '点选发亮的节点前进' : '涿郡 → 张角祭坛　点选发亮的节点前进，可拖动长卷', 24, 84 * k); g.globalAlpha = 1;
    if (window.SURV && SURV.routeHp) {
      const [hp, mx] = SURV.routeHp(), bw = Math.min(220 * k, W * .34), x = 24, y = 100 * k, bh = 16 * k;
      g.fillStyle = 'rgba(40,28,18,.6)'; g.fillRect(x, y, bw + 4, bh); g.fillStyle = CINNABAR; g.fillRect(x + 2, y + 2, bw * Math.max(0, Math.min(1, hp / mx)), bh - 4);
      g.fillStyle = INK; g.font = `bold ${Math.round(14 * k)}px ${UI}`; g.textBaseline = 'middle'; g.fillText('气血 ' + Math.ceil(hp * 10) + ' / ' + Math.round(mx * 10), x + bw + 12, y + bh / 2); g.textBaseline = 'alphabetic';
    }
    // 图例（手机竖屏放右上，避开右下印章）
    const lg = [['battle', '普通'], ['elite', '精英'], ['event', '奇遇'], ['boss', '首领']]; g.font = `bold ${Math.round(14 * k)}px ${UI}`; g.fillStyle = INK; g.textAlign = 'left'; g.textBaseline = 'middle';
    let lx = 30; const ly = H - 36 * k;
    lg.forEach(([ty, t]) => { g.save(); g.translate(lx + 14 * k, ly); icon(ty, 32 * k); g.restore(); g.globalAlpha = .9; g.fillText(t, lx + 34 * k, ly + 1); g.globalAlpha = 1; lx += (port() ? 70 : 90) * k; });
    if (false) {   // 奖励角标说明（已取消：奖励统一在整备屏拿）（11/11：玩家看不懂「招/功/疗/双」）
      lx += 16 * k; const bc = [['招', '#3b6ea8', '新武艺'], ['功', '#a8662a', '心法'], ['疗', '#3f8a4a', '回血'], ['双', '#7a3a8a', '武艺+心法']];
      g.globalAlpha = .9; g.fillText('奖励：', lx, ly + 1); lx += g.measureText('奖励：').width + 6;
      for (const [c, col, t] of bc) { g.beginPath(); g.arc(lx + 9 * k, ly, 9 * k, 0, 7); g.fillStyle = col; g.fill(); g.fillStyle = '#fff'; g.font = `bold ${Math.round(11 * k)}px ${UI}`; g.textAlign = 'center'; g.fillText(c, lx + 9 * k, ly + 1); g.textAlign = 'left'; g.fillStyle = INK; g.font = `bold ${Math.round(14 * k)}px ${UI}`; g.fillText(t, lx + 22 * k, ly + 1); lx += 22 * k + g.measureText(t).width + 14 * k; }
      g.globalAlpha = 1;
    }
    edge();
  }

  if (ON) { const poll = () => { if (window.RUNSAVE && ((typeof over !== 'undefined' && over) || (typeof won !== 'undefined' && won))) RUNSAVE.clear(); if (pending && (!window.TITLE || TITLE.mode() === 'game')) { pending = false; open(); if (window.RUNSAVE) RUNSAVE.save(); } requestAnimationFrame(poll); }; requestAnimationFrame(poll); }   // 真正进游戏（不是在标题页）才打开长卷
  const MAP_OF = l => l <= 4 ? 'field' : l <= 8 ? 'town' : l <= 12 ? 'forest' : l <= 16 ? 'camp' : 'altar';   // 第 1~4 层打谷场，5~8 县城，9~12 林间空地，13~17 营寨腹地，18 张角祭坛
  window.ROUTE = {
    mapOf: n => MAP_OF(n.layer),
    on: () => ON, TIME_K, layers: () => LAYERS,
    waves: n => WAVES_OF[n.type] || 3,
    name: n => nlabel(n),
    secBoss: n => n && n.final ? [['张角', 'zhang_jiao'], ['马元义', '']] : n && n.sec ? SECBOSS[n.sec - 1] : [],
    tagOf: n => n.tag,
    shown: () => shown || pending,
    start() { run = { ...gen(), visited: new Set() }; run.cur = run.start; run.visited.add(run.start); pending = true; if (shown) close(); },
    snap() {   // 存档用：节点之间的连线存成编号
      if (!run) return null;
      return { nodes: run.nodes.map(n => ({ id: n.id, layer: n.layer, lane: n.lane, type: n.type, tag: n.tag, rw: n.rw, sec: n.sec, final: n.final, jx: n.jx, jy: n.jy, next: n.next.map(x => x.id) })), cur: run.cur.id, visited: [...run.visited].map(n => n.id) };
    },
    resume(o) {
      const nodes = o.nodes.map(n => ({ ...n, next: [], prev: [] })), byLayer = [];
      o.nodes.forEach((n, i) => n.next.forEach(j => { nodes[i].next.push(nodes[j]); nodes[j].prev.push(nodes[i]); }));
      for (const n of nodes) (byLayer[n.layer] || (byLayer[n.layer] = [])).push(n);
      run = { nodes, byLayer, start: nodes.find(n => n.type === 'start') || nodes[0], visited: new Set(o.visited.map(i => nodes[i])) };
      run.cur = nodes[o.cur]; pending = true; if (shown) close();
    },
    done, close, choose,
    debug: () => run,
  };
})();
