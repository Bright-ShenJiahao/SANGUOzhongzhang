// 三国终章：杀戮尖塔式路线图（水墨长卷）。网址带 ?route 才启用（和现在「一路 20 波」对比用）。
// - 横向长卷：左边涿郡出发，右边张角祭坛；每一列是一层，每层 3~5 个节点，随机分叉。手机竖屏自动改成纵向。
// - 节点：战（普通战斗）/ 精（精英）/ 营（营地：回血或磨刀）/ 帅（Boss，暂用第 18~20 级敌人顶替）。
// - 战斗由 survive.js 负责：SURV.beginNode(节点) 开打，打完回到这里 ROUTE.done(节点)。
(() => {
  const ON = /[?&]route(?:=|&|$)/.test(location.search);
  const LAYERS = 12, LANES = 5;
  const WAVES_OF = { battle: 3, elite: 4, boss: 3 };   // 每种节点打几波（可调）
  const TIME_K = .72;                                   // 路线模式下每波时间缩放（20 波表 ≈21 分钟，12 层约合 30 分钟）
  const ICON = { battle: 0, elite: 1, camp: 2, boss: 3, start: 4, shop: 5, event: 6, chest: 7 };   // 图标表（art/ui/route_icons.webp，4×2，每格 256）
  const MAPN = { field: '打谷场', town: '县城街巷', yz: '黄巾营寨', altar: '张角祭坛' };
  const SECT = [['field', 1, 3, '120,140,80', .13], ['town', 4, 6, '160,115,70', .13], ['yz', 7, 11, '165,70,45', .12], ['altar', 12, 12, '70,55,95', .2]];   // 分段：地图、起止层、淡墨色调
  const hov = { n: null };
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
    const lo = port() ? W * .18 : H * .24, hi = port() ? W * .82 : H * .8;
    const c = lo + (n.lane + n.jx * .35) / (LANES - 1) * (hi - lo) + n.jy * 10;
    return port() ? { x: c, y: H - m } : { x: m, y: c };
  }
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
    exit.style.cssText = 'position:absolute;right:14px;top:12px;padding:6px 14px;font:700 14px ' + FONT + ';letter-spacing:2px;color:#f3dc9a;background:rgba(40,28,18,.8);border:1px solid #c9a24a;border-radius:6px;cursor:pointer;z-index:2';
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
    g.shadowColor = cur ? 'rgba(201,162,74,.95)' : reach ? `rgba(179,40,30,${.6 + .35 * k})` : 'rgba(40,28,18,.4)';
    g.shadowBlur = cur ? 16 : reach ? 12 + k * 8 : 5; g.shadowOffsetY = reach || cur ? 0 : 2;
    g.globalAlpha = vis ? .75 : reach || cur ? 1 : .55;
    icon(n.type, R * 2.3, vis || (!reach && !cur));
    g.globalAlpha = 1; g.shadowBlur = 0; g.shadowColor = 'transparent'; g.shadowOffsetY = 0;
    if (vis && !cur) { g.beginPath(); g.arc(R * .62, -R * .62, 7, 0, 7); g.fillStyle = CINNABAR; g.fill(); g.strokeStyle = PAPER; g.lineWidth = 1.6; g.beginPath(); g.moveTo(R * .62 - 3, -R * .62); g.lineTo(R * .62 - .8, -R * .62 + 2.6); g.lineTo(R * .62 + 3.4, -R * .62 - 2.6); g.stroke(); }
    g.restore();
    // 名字：可走的节点、当前、Boss 常显；其他鼠标悬停才显
    if ((reach && !port()) || cur || n.type === 'boss' || hov.n === n) tag(p, R, n, hov.n === n || cur || n.type === 'boss');
  }
  function tag(p, R, n, full) {
    const l1 = n.type === 'start' ? '涿郡' : LABEL[n.type], l2 = n.type === 'start' || !full ? '' : MAPN[MAP_OF(n.layer)] + (n.type === 'camp' ? ' · 歇息' : '');
    g.save(); g.font = `bold 15px ${FONT}`; const w1 = g.measureText(l1).width; g.font = `12px ${FONT}`; const w2 = l2 ? g.measureText(l2).width : 0;
    const bw = Math.max(w1, w2) + 18, bh = l2 ? 38 : 24; let x = p.x - bw / 2, y = p.y + R + 10;
    if (y + bh > H - 6) y = p.y - R - 10 - bh; x = Math.max(6, Math.min(W - bw - 6, x));
    g.fillStyle = 'rgba(40,28,18,.82)'; g.beginPath(); g.roundRect ? g.roundRect(x, y, bw, bh, 5) : g.rect(x, y, bw, bh); g.fill();
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#f3dc9a'; g.font = `bold 15px ${FONT}`; g.fillText(l1, x + bw / 2, y + (l2 ? 13 : 12));
    if (l2) { g.fillStyle = 'rgba(243,220,154,.75)'; g.font = `12px ${FONT}`; g.fillText(l2, x + bw / 2, y + 28); }
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
    g.setTransform(DPR, 0, 0, DPR, 0, 0);
    g.fillStyle = PAPER; g.fillRect(0, 0, W, H);
    g.fillStyle = paperNoise(); g.fillRect(0, 0, W, H);
    const wash = g.createRadialGradient(W * .5, H * .45, Math.min(W, H) * .2, W * .5, H * .5, Math.max(W, H) * .75);
    wash.addColorStop(0, 'rgba(255,248,230,.35)'); wash.addColorStop(1, 'rgba(120,90,50,.28)'); g.fillStyle = wash; g.fillRect(0, 0, W, H);
    tint();
    hills(.12, .07, H * .16, 1.3); hills(.25, .11, H * .1, 4.1); hills(.45, .16, H * .045, 7.7);
    // 路线
    for (const n of run.nodes) for (const m of n.next) {
      const a = pos(n), b = pos(m), seedE = n.id * 13 + m.id;
      const walked = visited(n) && visited(m), open = n === run.cur && reachable(m);
      trail(a, b, n, m, walked ? 2 : open ? 1 : 0, seedE);
    }
    for (const n of run.nodes) { try { seal(n, now); } catch (e) { if (!window._rtErr) { window._rtErr = 1; console.error('route seal', e); } } }
    // 抬头：章节、血量、提示（手机竖屏先垫一层纸色渐隐，免得节点叠在字上）
    if (port()) { const hb = g.createLinearGradient(0, 0, 0, 132); hb.addColorStop(0, 'rgba(234,220,192,.97)'); hb.addColorStop(.75, 'rgba(234,220,192,.9)'); hb.addColorStop(1, 'rgba(234,220,192,0)'); g.fillStyle = hb; g.fillRect(0, 0, W, 132); }
    g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.fillStyle = INK;
    g.font = `${port() ? 30 : 38}px ${FONT}`; g.fillText('第一章 · 黄巾之乱', 22, 54);
    g.font = `15px ${FONT}`; g.globalAlpha = .7; g.fillText(port() ? '点选发亮的节点前进' : '涿郡 → 张角祭坛　点选发亮的节点前进，可拖动长卷', 24, 78); g.globalAlpha = 1;
    if (window.SURV && SURV.routeHp) {
      const [hp, mx] = SURV.routeHp(), bw = Math.min(190, W * .34), x = 24, y = 96;
      g.fillStyle = 'rgba(40,28,18,.55)'; g.fillRect(x, y, bw + 4, 14); g.fillStyle = CINNABAR; g.fillRect(x + 2, y + 2, bw * Math.max(0, Math.min(1, hp / mx)), 10);
      g.fillStyle = INK; g.font = `13px ${FONT}`; g.fillText('血 ' + Math.ceil(hp) + '/' + mx, x + bw + 12, y + 12);
    }
    // 图例（手机竖屏放右上，避开右下印章）
    const lg = [['battle', '普通'], ['elite', '精英'], ['camp', '营地'], ['boss', '首领']]; g.font = `13px ${FONT}`; g.fillStyle = INK; g.textAlign = 'left'; g.textBaseline = 'middle';
    let lx = 30; const ly = H - 34;
    lg.forEach(([ty, t]) => { g.save(); g.translate(lx + 12, ly); icon(ty, 28); g.restore(); g.globalAlpha = .8; g.fillText(t, lx + 30, ly + 1); g.globalAlpha = 1; lx += port() ? 68 : 82; });
    edge();
  }

  if (ON) setInterval(() => { if (pending && (!window.TITLE || TITLE.mode() === 'game')) { pending = false; open(); } }, 150);   // 真正进游戏（不是在标题页）才打开长卷
  const MAP_OF = l => l <= 3 ? 'field' : l <= 6 ? 'town' : l <= 11 ? 'yz' : 'altar';   // 第 1~3 层打谷场，4~6 县城，7~11 黄巾营寨，12 张角祭坛
  window.ROUTE = {
    mapOf: n => MAP_OF(n.layer),
    on: () => ON, TIME_K, layers: () => LAYERS,
    waves: n => WAVES_OF[n.type] || 3,
    name: n => n ? LABEL[n.type] : '',
    shown: () => shown || pending,
    start() { run = { ...gen(), visited: new Set() }; run.cur = run.start; run.visited.add(run.start); pending = true; if (shown) close(); },
    done, close,
    debug: () => run,
  };
})();
