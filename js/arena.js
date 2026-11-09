// 俯视竞技场（试玩对比用，网址带 ?bg=arena 才启用）：
// 一张固定的俯视场地图，镜头不动，人物和敌人只能在围墙里面那块地面上走；敌人从四周（左右 + 上方城门 + 下方台阶）涌进来。
// 场地图在世界里放在 AX 附近，地面范围用图内比例 FL 量出来；改图后只需要改 FL。
(() => {
  const ON_URL = /[?&]bg=arena2?(?:&|$)/.test(location.search);
  const Z = /[?&]bg=arena2(?:&|$)/.test(location.search) ? 1.25 : 1;   // arena2：场地比屏幕大 25%，镜头跟着人物轻微移动（像群侠传）
  let camTop = 0;
  const HAZE = /[?&]look=haze(?:&|$)/.test(location.search);   // 群侠传式氛围：薄雾 + 降饱和 + 暗角 + 飘尘 + 软阴影
  const DUST = Array.from({ length: 46 }, () => ({ x: Math.random(), y: Math.random(), r: .6 + Math.random() * 1.8, vx: .004 + Math.random() * .012, vy: (Math.random() - .5) * .004, a: .08 + Math.random() * .16 }));
  let dustT = 0;
  const AX = 1000;                                   // 场地中心的世界 x
  const ST = { x0: .466, x1: .534, top: .14, bot: .945 };   // 上下两处台阶：可以走上去（台阶宽度内），两边墙外不能走
  const FL = { x0: .105, x1: .885, y0: .18, y1: .86 };   // 地面（围墙里面）占图的比例范围
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
      hero.x = AX; hero.y = M.top + (M.bot - M.top) * .2; this.cam(true);   // 出生在城门前方（上中），不在正中间
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
      const g = geo(), m = e === hero ? 10 : 8;
      e.x = Math.max(g.L + m, Math.min(g.R - m, e.x));
      const yT = Math.max(g.TS, Z === 1 ? 0 : -1e9), yB = Math.min(g.BS, Z === 1 ? M.viewH : 1e9);
      e.y = Math.max(yT, Math.min(yB, e.y));
      if (e.y < g.T || e.y > g.B) e.x = Math.max(g.SL + m * .5, Math.min(g.SR - m * .5, e.x));   // 在台阶上时，不能偏出台阶宽度
    },
    edge() {     // 刷怪点：左右两侧随机高度，上方城门，下方台阶
      const g = geo(), r = Math.random();
      if (r < .3) return { x: g.L + 8, y: g.T + 6 + Math.random() * (g.B - g.T - 12) };
      if (r < .6) return { x: g.R - 8, y: g.T + 6 + Math.random() * (g.B - g.T - 12) };
      if (r < .8) return { x: AX + (Math.random() - .5) * g.w * .06, y: Math.max(g.TS, Z === 1 ? 0 : -1e9) + 3 };
      return { x: AX + (Math.random() - .5) * g.w * .06, y: Math.min(g.BS, Z === 1 ? M.viewH : 1e9) - 3 };
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
