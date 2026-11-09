// 三国终章：杀戮尖塔式路线图（水墨长卷）。网址带 ?route 才启用（和现在「一路 20 波」对比用）。
// - 横向长卷：左边涿郡出发，右边张角祭坛；每一列是一层，每层 3~5 个节点，随机分叉。手机竖屏自动改成纵向。
// - 节点：战（普通战斗）/ 精（精英）/ 营（营地：回血或磨刀）/ 帅（Boss，暂用第 18~20 级敌人顶替）。
// - 战斗由 survive.js 负责：SURV.beginNode(节点) 开打，打完回到这里 ROUTE.done(节点)。
(() => {
  const ON = /[?&]route(?:=|&|$)/.test(location.search);
  const LAYERS = 12, LANES = 5;
  const WAVES_OF = { battle: 3, elite: 4, boss: 3 };   // 每种节点打几波（可调）
  const TIME_K = .72;                                   // 路线模式下每波时间缩放（20 波表 ≈21 分钟，12 层约合 30 分钟）
  const CH = { battle: '战', elite: '精', camp: '营', boss: '帅', start: '涿' };
  const LABEL = { battle: '黄巾游兵', elite: '黄巾精锐', camp: '营地', boss: '张角祭坛', start: '涿郡' };
  const FONT = '"MaShanZheng","STKaiti","KaiTi","Songti SC",serif';
  const INK = '#2a211a', CINNABAR = '#b3281e', PAPER = '#eadcc0';

  let run = null, pending = false, shown = false, root = null, cv = null, g = null, W = 0, H = 0, DPR = 1, scroll = 0, tScroll = 0, raf = 0, t0 = 0, drag = null, noise = null, campBox = null;
  const rnd = () => Math.random();
  const seeded = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

  // ---------- 生成地图 ----------
  function gen() {
    const nodes = [], byLayer = [], cells = {};
    const mk = (l, c, type) => { const n = { id: nodes.length, layer: l, lane: c, type: type || 'battle', next: [], prev: [], jx: seeded(nodes.length + 1) - .5, jy: seeded(nodes.length + 9) - .5 }; nodes.push(n); (byLayer[l] = byLayer[l] || []).push(n); return n; };
    const cell = (l, c) => cells[l + ':' + c] || (cells[l + ':' + c] = mk(l, c));
    const start = mk(0, 2, 'start');
    const link = (a, b) => { if (!a.next.includes(b)) { a.next.push(b); b.prev.push(a); } };
    const crosses = (a, b) => nodes.some(o => o.layer === a.layer && o !== a && o.next.some(p => p !== b && p.layer === b.layer && (o.lane - a.lane) * (p.lane - b.lane) < 0));
    // 4 条路径：每一步同列或相邻列，避免交叉
    const PATHS = 4, starts = [0, 1, 2, 3, 4].sort(() => rnd() - .5);
    for (let p = 0; p < PATHS; p++) {
      let cur = cell(1, starts[p % 5]); link(start, cur);
      for (let l = 2; l <= LAYERS - 2; l++) {
        const opts = [-1, 0, 1].map(d => cur.lane + d).filter(c => c >= 0 && c < LANES).sort(() => rnd() - .5);
        let nx = null;
        for (const c of opts) { const n = cell(l, c); if (!crosses(cur, n)) { nx = n; break; } }
        if (!nx) nx = cell(l, cur.lane);
        link(cur, nx); cur = nx;
      }
      const camp = cell(LAYERS - 1, cur.lane); link(cur, camp);
    }
    const boss = mk(LAYERS, 2, 'boss');
    for (const n of byLayer[LAYERS - 1]) { n.type = 'camp'; link(n, boss); }
    // 节点类型：第 1 层必是战；精英第 4 层以后；营地第 3 层以后；上一层同类特殊节点不连着出现
    for (let l = 2; l <= LAYERS - 2; l++) for (const n of byLayer[l] || []) {
      const r = rnd(); let t = 'battle';
      if (l >= 4 && r < .2) t = 'elite'; else if (l >= 3 && r > .83) t = 'camp';
      if (t !== 'battle' && n.prev.some(p => p.type === t)) t = 'battle';
      n.type = t;
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
    const lo = port() ? W * .13 : H * .24, hi = port() ? W * .87 : H * .8;
    const c = lo + (n.lane + n.jx * .35) / (LANES - 1) * (hi - lo) + n.jy * 10;
    return port() ? { x: c, y: H - m } : { x: m, y: c };
  }
  const radius = n => n.type === 'boss' ? 34 : n.type === 'elite' ? 26 : 22;
  const reachable = n => !!run && run.cur.next.includes(n);
  const visited = n => !!run && run.visited.has(n);

  function ensureDom() {
    if (root) return;
    root = document.createElement('div'); root.id = 'routeMap';
    root.style.cssText = 'position:fixed;inset:0;z-index:10010;background:' + PAPER + ';touch-action:none;user-select:none;-webkit-user-select:none';
    cv = document.createElement('canvas'); cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block';
    root.appendChild(cv); document.body.appendChild(root); g = cv.getContext('2d');
    const exit = document.createElement('button'); exit.textContent = '退出';
    exit.style.cssText = 'position:absolute;right:14px;top:12px;padding:6px 14px;font:700 14px ' + FONT + ';letter-spacing:2px;color:#f3dc9a;background:rgba(40,28,18,.8);border:1px solid #c9a24a;border-radius:6px;cursor:pointer;z-index:2';
    exit.onclick = () => { if (!confirm('退出本局，回到主界面？')) return; close(); if (typeof returnFromPausedGame === 'function') returnFromPausedGame(true); else if (window.TITLE && TITLE.show) TITLE.show(); };
    root.appendChild(exit);
    cv.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, s: scroll, moved: false, id: e.pointerId }; try { cv.setPointerCapture(e.pointerId); } catch (_) {} });
    cv.addEventListener('pointermove', e => {
      if (!drag || e.pointerId !== drag.id) return;
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
    close();
    if (window.SURV && SURV.beginNode) SURV.beginNode(n);
  }
  function camp(n) {
    const box = campBox = document.createElement('div');
    box.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(30,20,12,.45);z-index:3';
    const hp = SURV.routeHp();
    box.innerHTML = '<div style="background:' + PAPER + ';border:2px solid #7a5a2c;border-radius:10px;padding:18px 22px;max-width:92vw;text-align:center;font-family:' + FONT + ';color:' + INK + ';box-shadow:0 10px 40px rgba(0,0,0,.45)">'
      + '<div style="font-size:26px;letter-spacing:6px;margin-bottom:6px">营 地</div><div style="font-size:14px;opacity:.75;margin-bottom:14px">血量 ' + Math.ceil(hp[0]) + ' / ' + hp[1] + '</div>'
      + '<div style="display:flex;gap:12px;flex-wrap:wrap;justify-content:center">'
      + '<button data-k="heal" style="width:150px;padding:12px 8px;font:700 18px ' + FONT + ';color:' + INK + ';background:#f3e6c8;border:1px solid #7a5a2c;border-radius:8px;cursor:pointer">歇息<br><small style="font:12px sans-serif;opacity:.8">回复 30% 血量</small></button>'
      + '<button data-k="up" style="width:150px;padding:12px 8px;font:700 18px ' + FONT + ';color:' + INK + ';background:#f3e6c8;border:1px solid #7a5a2c;border-radius:8px;cursor:pointer">磨刀<br><small style="font:12px sans-serif;opacity:.8">招式伤害 +10%</small></button></div></div>';
    box.querySelectorAll('button').forEach(b => b.onclick = () => { SURV.camp(b.dataset.k); box.remove(); campBox = null; done(n, true); });
    root.appendChild(box);
  }
  // 节点打完（或营地选完）：记下走过的路，回到长卷
  function done(n, keepOpen) {
    run.cur = n; run.visited.add(n);
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
  function brush(a, b, w, col, alpha, seed) {   // 毛笔线：略弯、粗细和浓淡有变化
    const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len, bend = (seeded(seed) - .5) * len * .22;
    const cx = (a.x + b.x) / 2 + nx * bend, cy = (a.y + b.y) / 2 + ny * bend;
    for (let k = 0; k < 3; k++) {
      g.beginPath(); g.moveTo(a.x + nx * (k - 1) * .7, a.y + ny * (k - 1) * .7); g.quadraticCurveTo(cx + nx * (k - 1) * 1.1, cy + ny * (k - 1) * 1.1, b.x, b.y);
      g.lineWidth = w * (k === 1 ? 1 : .55); g.strokeStyle = col; g.globalAlpha = alpha * (k === 1 ? 1 : .45); g.lineCap = 'round'; g.stroke();
    }
    g.globalAlpha = 1;
  }
  function seal(n, now) {
    const p = pos(n), R = radius(n), vis = visited(n), reach = reachable(n), cur = run.cur === n, t = (now - t0) / 1000;
    if (p.x < -60 || p.x > W + 60 || p.y < -60 || p.y > H + 60) return;
    g.save(); g.translate(p.x, p.y);
    if (reach) { const k = .5 + .5 * Math.sin(t * 3); g.beginPath(); g.arc(0, 0, R + 7 + k * 4, 0, 7); g.strokeStyle = `rgba(179,40,30,${.25 + .3 * k})`; g.lineWidth = 2.5; g.stroke(); }
    // 印章：边缘略不规整的圆
    g.beginPath(); const N = 28;
    for (let i = 0; i <= N; i++) { const a = i / N * Math.PI * 2, r = R * (1 + (seeded(n.id * 31 + i) - .5) * .09); i ? g.lineTo(Math.cos(a) * r, Math.sin(a) * r) : g.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
    g.closePath();
    const col = vis || cur ? INK : n.type === 'camp' ? '#3f6a52' : n.type === 'elite' ? '#8f1d14' : n.type === 'boss' ? '#8f1d14' : CINNABAR;
    g.globalAlpha = reach || vis || cur ? 1 : .42; g.fillStyle = col; g.fill();
    if (n.type === 'elite' || n.type === 'boss') { g.beginPath(); g.arc(0, 0, R - 4, 0, 7); g.strokeStyle = 'rgba(234,220,192,.75)'; g.lineWidth = n.type === 'boss' ? 2.5 : 1.8; g.stroke(); }
    g.fillStyle = PAPER; g.font = `bold ${Math.round(R * 1.15)}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(CH[n.type], 0, 1);
    g.globalAlpha = 1;
    if (cur) { g.beginPath(); g.arc(0, 0, R + 5, 0, 7); g.strokeStyle = '#c9a24a'; g.lineWidth = 2.5; g.stroke(); }
    if (reach || cur || n.type === 'boss') { g.font = `14px ${FONT}`; g.fillStyle = INK; g.globalAlpha = .85; g.fillText(LABEL[n.type], 0, R + 16); g.globalAlpha = 1; }
    g.restore();
  }
  function frame(now) {
    if (!shown) { raf = 0; return; }
    raf = requestAnimationFrame(frame);
    if (!drag || !drag.moved) scroll += (tScroll - scroll) * .1;
    g.setTransform(DPR, 0, 0, DPR, 0, 0);
    g.fillStyle = PAPER; g.fillRect(0, 0, W, H);
    g.fillStyle = paperNoise(); g.fillRect(0, 0, W, H);
    const wash = g.createRadialGradient(W * .5, H * .45, Math.min(W, H) * .2, W * .5, H * .5, Math.max(W, H) * .75);
    wash.addColorStop(0, 'rgba(255,248,230,.35)'); wash.addColorStop(1, 'rgba(120,90,50,.28)'); g.fillStyle = wash; g.fillRect(0, 0, W, H);
    hills(.12, .07, H * .16, 1.3); hills(.25, .11, H * .1, 4.1); hills(.45, .16, H * .045, 7.7);
    // 路线
    for (const n of run.nodes) for (const m of n.next) {
      const a = pos(n), b = pos(m), seedE = n.id * 13 + m.id;
      const walked = visited(n) && visited(m), open = n === run.cur && reachable(m);
      brush(a, b, walked ? 4.2 : open ? 3.4 : 2, walked ? INK : open ? '#5a3a1e' : 'rgba(70,55,40,1)', walked ? .92 : open ? .85 : .28, seedE);
    }
    for (const n of run.nodes) seal(n, now);
    // 抬头：章节、血量、提示
    g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.fillStyle = INK;
    g.font = `${port() ? 30 : 38}px ${FONT}`; g.fillText('第一章 · 黄巾之乱', 22, 54);
    g.font = `15px ${FONT}`; g.globalAlpha = .7; g.fillText('涿郡 → 张角祭坛　点选发亮的节点前进，可拖动长卷', 24, 78); g.globalAlpha = 1;
    if (window.SURV && SURV.routeHp) {
      const [hp, mx] = SURV.routeHp(), bw = Math.min(190, W * .34), x = 24, y = 96;
      g.fillStyle = 'rgba(40,28,18,.55)'; g.fillRect(x, y, bw + 4, 14); g.fillStyle = CINNABAR; g.fillRect(x + 2, y + 2, bw * Math.max(0, Math.min(1, hp / mx)), 10);
      g.fillStyle = INK; g.font = `13px ${FONT}`; g.fillText('血 ' + Math.ceil(hp) + '/' + mx, x + bw + 12, y + 12);
    }
    // 图例
    g.font = `13px ${FONT}`; g.fillStyle = INK; g.globalAlpha = .75; g.textAlign = 'left';
    const lg = [['战', '普通'], ['精', '精英'], ['营', '营地'], ['帅', 'Boss']]; let lx = 24;
    lg.forEach(([c, t]) => { g.fillText(c + ' ' + t, lx, H - 18); lx += 76; }); g.globalAlpha = 1;
  }

  if (ON) setInterval(() => { if (pending && (!window.TITLE || TITLE.mode() === 'game')) { pending = false; open(); } }, 150);   // 真正进游戏（不是在标题页）才打开长卷
  window.ROUTE = {
    on: () => ON, TIME_K, layers: () => LAYERS,
    waves: n => WAVES_OF[n.type] || 3,
    name: n => LABEL[n.type],
    shown: () => shown || pending,
    start() { run = { ...gen(), visited: new Set() }; run.cur = run.start; run.visited.add(run.start); pending = true; if (shown) close(); },
    done, close,
    debug: () => run,
  };
})();
