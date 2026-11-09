// 俯视竞技场（试玩对比用，网址带 ?bg=arena 才启用）：
// 一张固定的俯视场地图，镜头不动，人物和敌人只能在围墙里面那块地面上走；敌人从四周（左右 + 上方城门 + 下方台阶）涌进来。
// 场地图在世界里放在 AX 附近，地面范围用图内比例 FL 量出来；改图后只需要改 FL。
(() => {
  const FIELD = /[?&]bg=field(?:&|$)/.test(location.search);   // 打谷场：形状不规则，有水塘/草垛/石井挡路，右上角有能走上去的土台
  const ON_URL = FIELD || /[?&]bg=arena2?(?:&|$)/.test(location.search);
  const Z = FIELD || /[?&]bg=arena2(?:&|$)/.test(location.search) ? 1.25 : 1;
  // 可走区域（都是占整张图的比例）：地面多边形 − 障碍（椭圆、土台整块）+ 土台台面 + 斜坡
  const FC = {"ground":[[0.0598,0.2497],[0.2512,0.1116],[0.2871,0.1116],[0.3589,0.17],[0.4187,0.1966],[0.4486,0.1041],[0.5012,0.1041],[0.5036,0.1966],[0.5383,0.2125],[0.5712,0.1807],[0.924,0.2125],[0.9091,0.3188],[0.951,0.4463],[0.9641,0.5951],[0.9569,0.7226],[0.9211,0.7864],[0.8373,0.8236],[0.7715,0.8342],[0.6579,0.8395],[0.5323,0.8342],[0.5293,0.9192],[0.4575,0.9192],[0.4396,0.8236],[0.3888,0.8342],[0.323,0.8555],[0.2392,0.8502],[0.1495,0.8077],[0.0718,0.7333],[0.0329,0.627],[0.0269,0.5526],[0.0718,0.5207],[0.1106,0.4995],[0.1077,0.457],[0.0778,0.4251],[0.0658,0.3507]],"block":[[0.5682,0.1594],[0.8852,0.0978],[0.93,0.2019],[0.9258,0.2465],[0.8343,0.3741],[0.7207,0.3804],[0.6549,0.2784],[0.5682,0.1966]],"top":[[0.5849,0.1594],[0.7177,0.1201],[0.8852,0.1063],[0.924,0.2019],[0.8325,0.3103],[0.7207,0.2614],[0.6579,0.2657],[0.573,0.1849]],"ramp":[[0.6071,0.3454],[0.6878,0.3741],[0.7207,0.2657],[0.6609,0.2444]],"ell":[[0.1645,0.2019,0.1166,0.1254],[0.1734,0.7067,0.0897,0.0404],[0.8672,0.7332,0.0359,0.0276]]};
  const inPoly = (pt, x, y) => { let c = false; for (let i = 0, j = pt.length - 1; i < pt.length; j = i++) { const a = pt[i], b = pt[j]; if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; };
  const inEll = (e, x, y) => ((x - e[0]) / e[2]) ** 2 + ((y - e[1]) / e[3]) ** 2 < 1;
  const walk = (x, y) => (inPoly(FC.ground, x, y) && !inPoly(FC.block, x, y) && !FC.ell.some(e => inEll(e, x, y))) || inPoly(FC.top, x, y) || inPoly(FC.ramp, x, y);
  const FB = FC.ground.reduce((r, p) => ({ x0: Math.min(r.x0, p[0]), x1: Math.max(r.x1, p[0]), y0: Math.min(r.y0, p[1]), y1: Math.max(r.y1, p[1]) }), { x0: 1, x1: 0, y0: 1, y1: 0 });   // arena2：场地比屏幕大 25%，镜头跟着人物轻微移动（像群侠传）
  let camTop = 0;
  const HAZE = /[?&]look=haze(?:&|$)/.test(location.search);   // 群侠传式氛围：薄雾 + 降饱和 + 暗角 + 飘尘 + 软阴影
  const DUST = Array.from({ length: 46 }, () => ({ x: Math.random(), y: Math.random(), r: .6 + Math.random() * 1.8, vx: .004 + Math.random() * .012, vy: (Math.random() - .5) * .004, a: .08 + Math.random() * .16 }));
  let dustT = 0;
  const AX = 1000;                                   // 场地中心的世界 x
  const ST = FIELD ? { x0: .44, x1: .56, top: FB.y0, bot: FB.y1 } : { x0: .466, x1: .534, top: .14, bot: .945 };   // 上下两处台阶：可以走上去（台阶宽度内），两边墙外不能走
  const FL = FIELD ? { x0: FB.x0, x1: FB.x1, y0: FB.y0 + .1, y1: FB.y1 - .1 } : { x0: .105, x1: .885, y0: .18, y1: .86 };   // 地面（围墙里面）占图的比例范围
  // 遮挡层：把草垛(含推车)、石井的轮廓从背景图里抠出来，按脚底线 base 和人物前后排序；人物走到它们后面时被盖住（并且变半透明）
  const OCC = FIELD ? [
    { base: .7067, poly: [[290,518],[325,545],[345,585],[375,582],[405,598],[432,640],[420,668],[345,700],[335,722],[285,722],[250,700],[205,690],[150,672],[138,640],[170,600],[215,588],[240,565],[275,540]].map(p => [p[0] / 1672, p[1] / 941]) },
    { base: .745, poly: [[1405,580],[1480,575],[1505,600],[1500,640],[1520,690],[1500,712],[1440,730],[1385,700],[1395,650],[1410,610]].map(p => [p[0] / 1672, p[1] / 941]) },
  ] : [];
  for (const o of OCC) { const xs = o.poly.map(p => p[0]), ys = o.poly.map(p => p[1]); o.bx = Math.min(...xs); o.by = Math.min(...ys); o.bw = Math.max(...xs) - o.bx; o.bh = Math.max(...ys) - o.by; o.cv = null; }
  function occCanvas(o) {
    if (o.cv) return o.cv; const i = img(); if (!i) return null;
    const c = document.createElement('canvas'); c.width = Math.round(o.bw * i.width); c.height = Math.round(o.bh * i.height);
    const x = c.getContext('2d'); x.beginPath(); o.poly.forEach((p, k) => { const px = (p[0] - o.bx) * i.width, py = (p[1] - o.by) * i.height; k ? x.lineTo(px, py) : x.moveTo(px, py); }); x.closePath(); x.clip();
    x.drawImage(i, -o.bx * i.width, -o.by * i.height); return o.cv = c;
  }
  // 绕路：直线被挡住时，沿「到主角的最短可走路线」走（格子 96×54，主角换格子才重算）
  const GX = 96, GY = 54; let flow = null, flowKey = -1, flowCells = null;
  function cells() { if (flowCells) return flowCells; flowCells = new Uint8Array(GX * GY); for (let j = 0; j < GY; j++) for (let i = 0; i < GX; i++) flowCells[j * GX + i] = walk((i + .5) / GX, (j + .5) / GY) ? 1 : 0; return flowCells; }
  function field(hx, hy) {
    const ws = cells(); let hi = Math.max(0, Math.min(GX - 1, hx * GX | 0)), hj = Math.max(0, Math.min(GY - 1, hy * GY | 0));
    if (!ws[hj * GX + hi]) { let best = 1e9; for (let j = 0; j < GY; j++) for (let i = 0; i < GX; i++) if (ws[j * GX + i]) { const d = (i - hi) ** 2 + (j - hj) ** 2; if (d < best) { best = d; var bi = i, bj = j; } } hi = bi; hj = bj; }
    const key = hj * GX + hi; if (key === flowKey && flow) return flow; flowKey = key;
    const d = flow = new Float32Array(GX * GY).fill(1e9), q = [key]; d[key] = 0;
    for (let h = 0; h < q.length; h++) { const c = q[h], ci = c % GX, cj = c / GX | 0;
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) { if (!di && !dj) continue; const ni = ci + di, nj = cj + dj; if (ni < 0 || nj < 0 || ni >= GX || nj >= GY) continue; const n = nj * GX + ni; if (!ws[n]) continue; if (di && dj && (!ws[cj * GX + ni] || !ws[nj * GX + ci])) continue; const nd = d[c] + (di && dj ? 1.41 : 1); if (nd < d[n]) { d[n] = nd; q.push(n); } } }
    return d;
  }
  let active = false;
  const img = () => (typeof IMG !== 'undefined' ? IMG.arena : null);
  const ready = () => { const i = img(); return !!(i && i.complete && i.width); };
  function geo() {
    const vw = viewW(), i = img();
    const s = Math.max(vw / i.width, M.viewH / i.height) * Z, w = i.width * s, h = i.height * s;
    const ox = AX - w / 2, oy = M.viewH / 2 - h / 2;
    return { vw, s, w, h, ox, oy, L: ox + FL.x0 * w, R: ox + FL.x1 * w, T: oy + FL.y0 * h, B: oy + FL.y1 * h, TS: oy + ST.top * h, BS: oy + ST.bot * h, SL: ox + ST.x0 * w, SR: ox + ST.x1 * w };
  }
  function apply() {
    if (!ready()) return null;
    const g = geo();
    if (Z === 1) { M.top = Math.max(0, g.TS); M.bot = Math.min(M.viewH, g.BS); } else { M.top = g.TS; M.bot = g.BS; }
    arenaL = g.L - 12; lockR = g.R + 12;
    return g;
  }
  window.ARENA = {
    available: () => ON_URL && typeof BG !== 'undefined' && !!BG.arena,
    on: () => active && ready(),
    start() {
      if (!this.available()) return;
      active = true;
      const g = apply(); if (!g) return;
      props.length = 0;                               // 场地里不放草垛推车，地面保持干净
      if (FIELD) { hero.x = g.ox + .478 * g.w; hero.y = g.oy + .36 * g.h; hero._ax = null; } else { hero.x = AX; hero.y = M.top + (M.bot - M.top) * .2; }
      this.cam(true);   // 出生在城门前方（上中），不在正中间
    },
    stop() { active = false; },
    tick() { if (!this.on()) return; apply(); this.clamp(hero); for (const z of zs) this.clamp(z); },
    camY: () => camTop,
    cam(snap) {   // 镜头：Z=1 固定居中；Z>1 跟随人物，被限制在场地图范围内
      if (!this.on()) return;
      const g = geo(), vw = g.vw;
      let tx = AX - vw / 2, ty = 0;
      if (Z > 1) {
        tx = Math.max(g.ox, Math.min(g.ox + g.w - vw, hero.x - vw / 2));
        ty = Math.max(g.oy, Math.min(g.oy + g.h - M.viewH, hero.y - M.viewH / 2));
      }
      const k = snap ? 1 : .1;
      cam.x += (tx - cam.x) * k; camTop += (ty - camTop) * k;
    },
    clamp(e) {   // 所有人物都只能待在围墙里面
      if (!this.on()) return;
      if (FIELD) {   // 不规则地形：新位置走不了就沿 x 或 y 单独滑，再不行就退回上一帧位置
        const g = geo(), fx = (x, y) => walk((x - g.ox) / g.w, (y - g.oy) / g.h);
        if (fx(e.x, e.y)) { e._ax = e.x; e._ay = e.y; return; }
        if (e._ax != null) {
          if (fx(e.x, e._ay)) { e.y = e._ay; e._ax = e.x; return; }
          if (fx(e._ax, e.y)) { e.x = e._ax; e._ay = e.y; return; }
          if (fx(e._ax, e._ay)) { e.x = e._ax; e.y = e._ay; return; }
        }
        for (let r = 6; r < 400; r += 6) for (let k = 0; k < 16; k++) { const a = k / 16 * 6.283, x = e.x + Math.cos(a) * r, y = e.y + Math.sin(a) * r; if (fx(x, y)) { e.x = x; e.y = y; e._ax = x; e._ay = y; return; } }
        return;
      }
      const g = geo(), m = e === hero ? 10 : 8;
      e.x = Math.max(g.L + m, Math.min(g.R - m, e.x));
      const yT = Math.max(g.TS, Z === 1 ? 0 : -1e9), yB = Math.min(g.BS, Z === 1 ? M.viewH : 1e9);
      e.y = Math.max(yT, Math.min(yB, e.y));
      if (e.y < g.T || e.y > g.B) e.x = Math.max(g.SL + m * .5, Math.min(g.SR - m * .5, e.x));   // 在台阶上时，不能偏出台阶宽度
    },
    edge() {     // 刷怪点：左右两侧随机高度，上方城门，下方台阶
      const g = geo(), r = Math.random();
      if (FIELD) {   // 不规则地形：上下两处石阶口 + 离主角够远的随机可走点
        if (r < .15) return { x: g.ox + .475 * g.w, y: g.TS + 4 };
        if (r < .3) return { x: g.ox + .494 * g.w, y: g.BS - 4 };
        for (let i = 0; i < 60; i++) { const x = g.ox + (FB.x0 + Math.random() * (FB.x1 - FB.x0)) * g.w, y = g.oy + (FB.y0 + Math.random() * (FB.y1 - FB.y0)) * g.h; if (walk((x - g.ox) / g.w, (y - g.oy) / g.h) && Math.hypot(x - hero.x, (y - hero.y) * 1.6) > 380) return { x, y }; }
        return { x: g.ox + .475 * g.w, y: g.TS + 4 };
      }
      if (r < .3) return { x: g.L + 8, y: g.T + 6 + Math.random() * (g.B - g.T - 12) };
      if (r < .6) return { x: g.R - 8, y: g.T + 6 + Math.random() * (g.B - g.T - 12) };
      if (r < .8) return { x: AX + (Math.random() - .5) * g.w * .06, y: Math.max(g.TS, Z === 1 ? 0 : -1e9) + 3 };
      return { x: AX + (Math.random() - .5) * g.w * .06, y: Math.min(g.BS, Z === 1 ? M.viewH : 1e9) - 3 };
    },
    layers() {   // 草垛、石井的遮挡层：交给 game.js 的前后排序列表
      if (!FIELD || !this.on()) return [];
      return OCC.map(o => ({ y: geo().oy + o.base * geo().h, d: () => {
        const c = occCanvas(o); if (!c) return; const g = geo();
        const bx = g.ox + o.bx * g.w, by = g.oy + o.by * g.h, bw = o.bw * g.w, bh = o.bh * g.h;
        const hide = hero.y < g.oy + o.base * g.h && hero.x > bx - 10 && hero.x < bx + bw + 10 && hero.y > by - 10;   // 主角在它后面、位置重叠：半透明让人看得见
        ctx.save(); ctx.globalAlpha = hide ? .55 : 1; ctx.drawImage(c, bx, by, bw, bh); ctx.restore();
      } }));
    },
    steer(e, dx, dy) {   // 敌人和主角之间被挡住时，改走绕路方向（只改方向，不改步长）
      if (!FIELD || !this.on() || e === hero) return [dx, dy];
      const g = geo(), ex = (e.x - g.ox) / g.w, ey = (e.y - g.oy) / g.h, hx = (hero.x - g.ox) / g.w, hy = (hero.y - g.oy) / g.h;
      const mag = Math.hypot(dx, dy); if (mag < 1e-4) return [dx, dy];
      if (dx * (hero.x - e.x) + dy * (hero.y - e.y) <= 0) return [dx, dy];   // 不是朝主角走（后撤、绕圈）就不管
      let clear = true; for (let k = 1; k <= 12; k++) if (!walk(ex + (hx - ex) * k / 12, ey + (hy - ey) * k / 12)) { clear = false; break; }
      if (clear) return [dx, dy];
      const d = field(hx, hy), ws = cells(), ci = Math.max(0, Math.min(GX - 1, ex * GX | 0)), cj = Math.max(0, Math.min(GY - 1, ey * GY | 0));
      let bd = d[cj * GX + ci], bi = -1, bj = -1;
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) { const ni = ci + di, nj = cj + dj; if ((!di && !dj) || ni < 0 || nj < 0 || ni >= GX || nj >= GY) continue; const n = nj * GX + ni; if (ws[n] && d[n] < bd) { bd = d[n]; bi = ni; bj = nj; } }
      if (bi < 0) return [dx, dy];
      const tx = g.ox + (bi + .5) / GX * g.w - e.x, ty = g.oy + (bj + .5) / GY * g.h - e.y, tl = Math.hypot(tx, ty) || 1;
      return [tx / tl * mag, ty / tl * mag];
    },
    soft: HAZE ? (x, y, r) => {   // 更大更软的脚下阴影
      ctx.save(); ctx.translate(x, y); ctx.scale(1, .34);
      const gr = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 1.7); gr.addColorStop(0, 'rgba(25,20,22,.42)'); gr.addColorStop(.55, 'rgba(25,20,22,.2)'); gr.addColorStop(1, 'rgba(25,20,22,0)');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(0, 0, r * 1.7, 0, 7); ctx.fill(); ctx.restore();
    } : null,
    post(W, H) {   // 在人物之后、界面之前，整屏叠一层氛围（屏幕坐标）
      if (!HAZE || !this.on()) return;
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = 'saturation'; ctx.globalAlpha = .22; ctx.fillStyle = '#808080'; ctx.fillRect(0, 0, W, H);   // 降饱和
      ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = .38; ctx.fillStyle = '#e6dccd'; ctx.fillRect(0, 0, W, H);       // 暖褐色调
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = .1; ctx.fillStyle = '#9fb0c2'; ctx.fillRect(0, 0, W, H);      // 灰蓝薄雾
      const v = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .35, W / 2, H / 2, Math.max(W, H) * .75);
      v.addColorStop(0, 'rgba(10,8,10,0)'); v.addColorStop(1, 'rgba(10,8,10,.5)'); ctx.globalAlpha = 1; ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);   // 暗角
      dustT += 1 / 60;
      ctx.fillStyle = '#d9c7a6';
      for (const d of DUST) {   // 缓慢飘动的灰尘
        d.x = (d.x + d.vx / 60 + 1) % 1; d.y = (d.y + d.vy / 60 + 1) % 1;
        ctx.globalAlpha = d.a * (.6 + .4 * Math.sin(dustT * 1.3 + d.x * 9));
        ctx.beginPath(); ctx.arc(d.x * W, d.y * H, d.r * H / 300 * .5, 0, 7); ctx.fill();
      }
      ctx.restore();
    },
    drawBg() {
      if (!ready()) return;
      const g = geo(); ctx.imageSmoothingEnabled = true;
      ctx.drawImage(img(), g.ox, g.oy, g.w, g.h);
    },
  };
})();
