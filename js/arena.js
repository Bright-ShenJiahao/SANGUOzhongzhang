// 俯视竞技场（试玩对比用，网址带 ?bg=arena 才启用）：
// 一张固定的俯视场地图，镜头不动，人物和敌人只能在围墙里面那块地面上走；敌人从四周（左右 + 上方城门 + 下方台阶）涌进来。
// 场地图在世界里放在 AX 附近，地面范围用图内比例 FL 量出来；改图后只需要改 FL。
(() => {
  const ON_URL = /[?&]bg=arena(?:&|$)/.test(location.search);
  const AX = 1000;                                   // 场地中心的世界 x
  const FL = { x0: .115, x1: .885, y0: .19, y1: .86 };   // 地面（围墙里面）占图的比例范围
  let active = false;
  const img = () => (typeof IMG !== 'undefined' ? IMG.arena : null);
  const ready = () => { const i = img(); return !!(i && i.complete && i.width); };
  function geo() {
    const vw = viewW(), i = img();
    const s = Math.max(vw / i.width, M.viewH / i.height), w = i.width * s, h = i.height * s;
    const ox = AX - w / 2, oy = (M.viewH - h) / 2;
    return { vw, s, w, h, ox, oy, L: ox + FL.x0 * w, R: ox + FL.x1 * w, T: oy + FL.y0 * h, B: oy + FL.y1 * h };
  }
  function apply() {
    if (!ready()) return null;
    const g = geo();
    M.top = Math.max(0, g.T); M.bot = Math.min(M.viewH, g.B);
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
      hero.x = AX; hero.y = (M.top + M.bot) / 2; cam.x = AX - g.vw / 2;
    },
    stop() { active = false; },
    tick() { if (!this.on()) return; apply(); this.clamp(hero); for (const z of zs) this.clamp(z); },
    cam() { if (this.on()) cam.x = AX - viewW() / 2; },
    clamp(e) {   // 所有人物都只能待在围墙里面
      if (!this.on()) return;
      const g = geo(), m = e === hero ? 10 : 8;
      e.x = Math.max(g.L + m, Math.min(g.R - m, e.x)); e.y = Math.max(g.T, Math.min(g.B, e.y));
    },
    edge() {     // 刷怪点：左右两侧随机高度，上方城门，下方台阶
      const g = geo(), r = Math.random();
      if (r < .3) return { x: g.L + 8, y: g.T + 6 + Math.random() * (g.B - g.T - 12) };
      if (r < .6) return { x: g.R - 8, y: g.T + 6 + Math.random() * (g.B - g.T - 12) };
      if (r < .8) return { x: AX + (Math.random() - .5) * g.w * .08, y: g.T + 4 };
      return { x: AX + (Math.random() - .5) * g.w * .08, y: g.B - 4 };
    },
    drawBg() {
      if (!ready()) return;
      const g = geo(); ctx.imageSmoothingEnabled = true;
      ctx.drawImage(img(), g.ox, g.oy, g.w, g.h);
    },
  };
})();
