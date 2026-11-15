// 三国终章：全自动出招 + 20 波限时（用户定 11/09）
// - 取消普攻/蓄力，只用大刀；身上 5 个武艺格按 1→5 顺序自动放（周天），目前只有「横扫」「连斩」两招。
// - 出招规则照三国幸存者：附近有敌人才起前摇；前摇时能走；前摇中翻滚 = 这一招作废、跳到下一招；
//   出手后有短暂后摇（站定），翻滚可以取消后摇。
// - 波次照三国幸存者（群侠传指引书）：20 波，每波限时 22～180 秒，撑到时间就算过关（鸣金收兵）；
//   第 10/14/17/20 波出敌将；敌人开场慢慢涌进来，不是一下子全刷出来。
(() => {
  const R = (a, b) => a + Math.random() * (b - a);
  const dist = (a, b) => Math.hypot(a.x - b.x, (a.y - b.y) * 2);
  const alive = () => zs.filter(z => !z.dead && !z.hidden && z.hp > 0);
  const hittable = () => alive().filter(z => !z.air);

  // ---------- 波次（数据照三国幸存者 data.js；同屏数按清版场地缩到约 1/4） ----------
  const WAVE_T = [22, 26, 34, 38, 42, 45, 48, 52, 55, 70, 60, 65, 70, 60, 60, 60, 90, 60, 75, 180];
  const WAVE_N = [50, 60, 74, 86, 98, 108, 116, 124, 132, 80, 140, 148, 156, 90, 164, 172, 90, 180, 190, 100];
  const BOSS_WAVES = { 10: 1, 14: 2, 17: 2, 20: 3 };   // 敌将数量（先用「老卒」放大顶替，美术以后再说）
  const N_SCALE = .25, WAVES = 20, HP_SCALE = .09;
  // 黄巾各部按波次轮换登场（三国幸存者的「八方」思路，用无名之辈现有兵种）
  // 第二章的黄巾兵（枪/盾/重刀）在第一章场景里没加载贴图，先只用第一章兵种
  const SECTS = [
    { from: 1, to: 7, u: 'grunt' }, { from: 3, to: 20, u: 'blade' }, { from: 5, to: 16, u: 'slinger' },
    { from: 7, to: 20, u: 'archer' }, { from: 10, to: 20, u: 'priest' }, { from: 13, to: 20, u: 'grunt' },
  ];
  const RT = { on: false, node: null, dmg: 1, cd: 1, move: 1, take: 1 };   // 路线模式（?route）：当前节点、磨刀加成
let CM = 1, RM = 1, CK = '';   // CK：当前出手的武艺（统计输出用）   // CM：当前这一招的伤害倍率（出身熟练×共鸣×熟练度）；RM：范围倍率
  const DM = () => RT.dmg * CM * critRoll();
  const rec = d => { if (CK) S.dps[CK] = (S.dps[CK] || 0) + d; };
const bossCount = () => RT.on ? (RT.node ? (RT.node.type === 'boss' ? 2 : RT.node.type === 'elite' ? 1 : 0) : 0) : (BOSS_WAVES[W.n] || 0);
const W = { n: 0, k: 0, N: 0, t: 0, retreat: 0, spawnT: 0, batchT: 0, bossDone: false, between: 0, started: false };
  const WT = () => RT.on ? W.tot : (WAVE_T[Math.min(W.n, WAVES) - 1] || 60);   // 路线模式：一个节点是一整场连续的仗，时长 = 原来几波加起来
  const CNT_BASE = 28, CNT_STEP = 6.2, CNT_MAX = 180;   // 路线模式：场上同屏人数 = 28 + 6.2×(难度级-1)，1 级约 28 只，10 级约 84，20 级约 146；难度级随时间连续上升，所以人数是一路慢慢涨
  const targetN = () => RT.on ? Math.min(CNT_MAX, Math.round((CNT_BASE + CNT_STEP * ((W.lvF || 1) - 1)) * (RT.node ? [1, .55, .75, .9][RT.node.layer] || 1 : 1))) : Math.max(8, Math.round((WAVE_N[W.n - 1] || 100) * N_SCALE));
  // ---------- 路线模式：按「段」和「节点标签」出兵 ----------
  // 单位简写：g 喽啰 b 刀手 s 投石 a 弓箭 p 方士 e 老卒 | 第二章兵（贴图没加载完时用刀手/老卒顶替）：h 大刀 d 盾 q 枪 l 力士
  const U = { g: ['grunt'], b: ['blade'], s: ['slinger'], a: ['archer'], p: ['priest'], e: ['elite'], h: ['yellow-heavy', 'blade'], d: ['yellow-shield', 'blade'], q: ['yellow-spear', 'blade'], l: ['yellow-golem', 'elite'], f: ['fire-jar'], m: ['drummer'], c: ['cavalry'], k: ['fanatic'], x: ['crossbow'] };   /* 11/12 新兵种：f 火罐手 m 鼓手 c 骑兵 k 狂信徒 */
  const POOL = [   // [段][标签] = 单位:权重
    { melee: { g: 100, b: 20 }, raid: { b: 70, g: 40 }, range: { g: 50, s: 50 }, shield: { b: 50, g: 40, s: 15 }, patrol: { g: 60, b: 40, e: 5 } },
    { melee: { g: 60, b: 50, h: 20 }, raid: { b: 50, h: 50, g: 20 }, range: { b: 30, s: 40, a: 30, f: 30 }, shield: { d: 50, h: 30, s: 20, f: 20 }, patrol: { b: 50, h: 40, e: 8, f: 15 } },
    { melee: { q: 60, b: 40, g: 30, c: 25 }, raid: { b: 40, h: 40, q: 30, c: 40 }, range: { x: 35, q: 30, a: 60, s: 30, f: 30 }, shield: { d: 40, q: 50, a: 20, m: 12 }, patrol: { x: 15, q: 50, h: 40, e: 8, l: 4, c: 20, m: 12 } },
    { melee: { h: 50, q: 50, g: 20, k: 45 }, raid: { h: 60, q: 40, b: 20, c: 40, k: 50 }, range: { x: 35, h: 25, a: 50, s: 30, p: 10, f: 35 }, shield: { d: 50, q: 40, a: 20, p: 10, m: 15 }, patrol: { x: 15, h: 50, q: 40, e: 10, l: 6, c: 25, m: 15, k: 30 } },
    { melee: { h: 50, q: 50, g: 20, k: 50 }, raid: { h: 60, q: 40, b: 20, c: 45, k: 60 }, range: { x: 35, h: 25, a: 50, s: 30, p: 10, f: 40 }, shield: { d: 50, q: 40, a: 20, p: 10, m: 18 }, patrol: { x: 15, h: 50, q: 40, e: 10, l: 6, c: 30, m: 18, k: 35 } },
  ];
  let c2ok = false;
  const unit = k => { const u = U[k]; return c2ok || !u[1] ? u[0] : u[1]; };
  const secOf = nd => Math.min(4, ((nd.layer - 1) / (window.ROUTE && ROUTE.segLen || 6)) | 0);
  function pickType() {
    if (RT.on && RT.node) {
      const nd = RT.node, w = (POOL[secOf(nd)][nd.tag || 'melee']) || POOL[0].melee, ks = Object.keys(w);
      let sum = 0; for (const k of ks) sum += w[k]; let r = Math.random() * sum;
      for (const k of ks) if ((r -= w[k]) <= 0) return unit(k);
      return 'grunt';
    }
    const pool = [];
    for (const s of SECTS) if (W.n >= s.from && W.n <= s.to) pool.push([s.u, W.n - s.from >= 1 ? 100 : 60]);
    if (W.n >= 4) pool.push(['elite', 4 + W.n]);   // 精英（老卒）随波次越来越常见
    let sum = pool.reduce((a, p) => a + p[1], 0), r = Math.random() * sum;
    for (const [u, w] of pool) if ((r -= w) <= 0) return u;
    return 'grunt';
  }
  // 段首领 / 最终首领 / 精锐小首领：t 兵种、fb 贴图没加载时的替身、hp 基础血量（0 = 用兵种自带 × m）、sc 放大
  /* 11/12 用户：管亥太大、小头目太小；首领画质差 → 首领按显示大小重新像素化（像素密度和小兵一致），这里的放大倍数都改回 1，大小由贴图本身决定；管亥 .85 写在 TYPES */
  /* 11/12 修：首领都换了专属贴图（不在第二章延迟加载包里），去掉 fb 替身——以前第二章图没下完时会用老卒顶替，邓茂/程远志变回老兵 */
  const BOSSES = [
    [{ t: 'cheng_yuanzhi', name: '程远志', hp: 70, sc: 1 }, { t: 'deng_mao', name: '邓茂', hp: 40, sc: 1 }],
    [{ t: 'bo_cai', name: '波才', hp: 80, sc: 1 }, { t: 'he_yi', name: '何仪', hp: 50, sc: 1 }],
    [{ t: 'guanhai_m', name: '管亥', hp: 95, sc: 1 }, { t: 'zhang_mancheng', name: '张曼成', hp: 55, sc: 1 }],
    [{ t: 'zhang_liang', name: '张梁', m: 1.4, sc: 1 }, { t: 'zhang_bao', name: '张宝', m: 1.5, sc: 1 }],
    [{ t: 'zhang_jiao', name: '张角', m: 1.0, sc: 1 }, { t: 'ma_yuanyi', name: '马元义', hp: 90, sc: 1 }],
  ];
  function bossBuff(z, dm) { if (!z) return; z.T = Object.assign({}, z.T, { dmg: (z.T.dmg || 1) * dm, heavy: true }); z.bossT = 6; }   // 首领/头目：伤害加成、出手不被打断（眩晕另有 stunGate 冷却）
  // 首领战机制（11/11）：每 13 秒喊人，从四周涌来一圈喽啰；血量过半「暴怒」：移速 +30%、抬手更快，脚下气焰变红
  // ===== 首领招式（11/11 用户定 1）：地上先亮红色预警（圈 / 直线），过一会儿才砸下来；翻滚无敌能躲 =====
  const TELE = [], BOOM = [], YS = .55;   // 俯视战场地面压扁系数：圆画成椭圆，判定也按压扁后的距离
  function teleAdd(o) { o.t = 0; TELE.push(o); return o; }
  /* 11/12 首领专属技能：预警颜色按属性分 0 暗红（兵器）1 白（雷）2 土黄（土）3 橙（符火）；ring = 圆环带缺口 */
  const TC = [['200,40,20', '255,90,50', '#ff5a2a', '#ffb060'], ['230,230,255', '240,240,255', '#e8e8ff', '#f4f4ff'], ['170,120,50', '225,175,95', '#c89850', '#e8c888'], ['230,110,20', '255,160,60', '#ff8a2a', '#ffc070']];
  const angDiff = (a, b) => Math.abs((((a - b + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI) - Math.PI);
  function teleHit(o) {
    const dx = hero.x - o.x, dy = (hero.y - o.y) / YS;
    if (o.k === 'circle') return dx * dx + dy * dy <= o.r * o.r;
    if (o.k === 'ring') { const d = Math.hypot(dx, dy); return d >= o.r0 && d <= o.r1 && angDiff(Math.atan2(dy, dx), o.ga) > o.gw; }
    const ca = Math.cos(o.a), sa = Math.sin(o.a), along = dx * ca + dy * sa, perp = Math.abs(-dx * sa + dy * ca);
    return along >= -10 && along <= o.len && perp <= o.w / 2;
  }
  // 会动的危险物（飞出去的大刀、流星锤、追人的符、旋风）：碰到主角就伤，同一个东西 0.7 秒内只伤一次
  const HZ = [];
  function hzAdd(o) { o.t = 0; o.hitT = 0; HZ.push(o); return o; }
  function hzTick(dt) {
    for (let i = HZ.length - 1; i >= 0; i--) {
      const o = HZ[i]; o.t += dt; o.hitT -= dt;
      if (o.src && (o.src.dead || o.src.hp <= 0 || o.src.endFade != null)) { HZ.splice(i, 1); continue; }
      if (o.upd) o.upd(o, dt);
      if (o.r && o.dmg && o.hitT <= 0 && Math.hypot(hero.x - o.x, (hero.y - o.y) / YS) < o.r && typeof dmgHero === 'function') { dmgHero(o.dmg, o.src || null, 'skill'); o.hitT = .7; }
      if (o.t >= o.T) { HZ.splice(i, 1); if (o.end) o.end(o); }
    }
  }
  // 张宝的土墙（会挡主角的路）、波才的令旗（插着就不停冒兵，主角站在旗边 0.8 秒就拔掉）
  const WALLS = [], FLAGS = [];
  function fieldTick(dt) {
    for (let i = WALLS.length - 1; i >= 0; i--) {
      const w = WALLS[i], p = w.p; w.t += dt;
      if (w.t > 5 || (w.src && w.src.dead)) { p.solid = false; p.fadeAt = gameT; WALLS.splice(i, 1); continue; }
      const hw = p.w / 2 + 6, x0 = p.x - hw, x1 = p.x + hw, y0 = p.y - 12, y1 = p.y + 4;
      if (hero.x > x0 && hero.x < x1 && hero.y > y0 && hero.y < y1) {   // 推到最近的一边
        const opts = [[hero.x - x0, 'x', x0], [x1 - hero.x, 'x', x1], [hero.y - y0, 'y', y0], [y1 - hero.y, 'y', y1]].sort((a, b) => a[0] - b[0])[0];
        hero[opts[1]] = opts[2];
      }
    }
    for (let i = FLAGS.length - 1; i >= 0; i--) {
      const f = FLAGS[i], p = f.p; f.t += dt; f.sp -= dt;
      const near = Math.hypot(hero.x - p.x, (hero.y - p.y) / YS) < 40;
      f.pull = near ? f.pull + dt : Math.max(0, f.pull - dt);
      if (f.pull > .8 || f.t > 10 || (f.src && f.src.dead)) { p.fadeAt = gameT; FLAGS.splice(i, 1); if (f.pull > .8) { floaters.push({ x: p.x, y: p.y - 60, t: 0, txt: '拔旗！', color: '#ffe08a', big: 1 }); if (window.SFX) SFX.play('crack'); } continue; }
      if (f.sp <= 0) { f.sp = 1.7; for (let k = 0; k < 2; k++) { const e = edgeSpawn(pickType()); if (e) { e.x = p.x + R(-30, 30); e.y = Math.max(M.top + 6, Math.min(M.bot - 6, p.y + R(-16, 16))); } } }
    }
  }
  function teleTick(dt) {
    for (let i = TELE.length - 1; i >= 0; i--) {
      const o = TELE[i]; o.t += dt;
      if (o.src && (o.src.dead || o.src.endFade != null)) { TELE.splice(i, 1); continue; }   // 放招的人倒了，招也散了
      if (o.t < o.T) continue;
      TELE.splice(i, 1);
      if (o.dmg && teleHit(o) && typeof dmgHero === 'function') dmgHero(o.dmg, o.src || null, 'skill');
      shake = Math.max(shake, o.k !== 'line' && (o.r || o.r1) > 80 ? .3 : .18); if (window.SFX && o.snd !== '') SFX.play(o.snd || 'crack', 0, .8);
      BOOM.push({ k: o.k, x: o.x, y: o.y, r: o.r, r0: o.r0, r1: o.r1, ga: o.ga, gw: o.gw, a: o.a, len: o.len, w: o.w, t: 0, c: o.c || 0 });
      if (o.then) o.then();
    }
    for (let i = BOOM.length - 1; i >= 0; i--) if ((BOOM[i].t += dt) > .4) BOOM.splice(i, 1);
    hzTick(dt); fieldTick(dt);
  }
  function teleDraw() {
    const shape = (o, k = 1) => { ctx.beginPath(); if (o.k === 'circle') ctx.arc(0, 0, o.r * k, 0, 7); else if (o.k === 'ring') { ctx.arc(0, 0, o.r1, o.ga + o.gw, o.ga + 2 * Math.PI - o.gw); ctx.arc(0, 0, o.r0, o.ga + 2 * Math.PI - o.gw, o.ga + o.gw, true); ctx.closePath(); } else { ctx.rotate(o.a); ctx.rect(0, -o.w / 2, o.len, o.w); } };
    for (const o of TELE) {
      const p = Math.min(1, o.t / o.T), blink = p > .75 ? .5 + .5 * Math.sin(o.t * 40) : 1, C = TC[o.c || 0];
      ctx.save(); ctx.translate(o.x, o.y); ctx.scale(1, YS);
      ctx.fillStyle = `rgba(${C[0]},${.16 * blink})`; shape(o); ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = `rgba(${C[1]},${.75 * blink})`; ctx.stroke();
      ctx.restore();
      ctx.save(); ctx.translate(o.x, o.y); ctx.scale(1, YS); ctx.globalAlpha = .38 * blink; ctx.fillStyle = C[2];   // 里面一层随时间涨满 = 还剩多久
      if (o.k === 'circle') { ctx.beginPath(); ctx.arc(0, 0, o.r * p, 0, 7); ctx.fill(); } else if (o.k === 'ring') { ctx.globalAlpha = .38 * blink * p; shape(o); ctx.fill(); } else { ctx.rotate(o.a); ctx.fillRect(0, -o.w / 2, o.len * p, o.w); }
      ctx.restore();
    }
    for (const b of BOOM) {
      const q = b.t / .4; ctx.save(); ctx.translate(b.x, b.y); ctx.scale(1, YS); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = (1 - q) * .7;
      ctx.fillStyle = TC[b.c || 0][3];
      if (b.k === 'circle') { ctx.beginPath(); ctx.arc(0, 0, b.r * (1 + q * .15), 0, 7); ctx.fill(); } else if (b.k === 'ring') { shape(b); ctx.fill(); } else { ctx.rotate(b.a); ctx.fillRect(0, -b.w / 2 * (1 + q * .3), b.len, b.w * (1 + q * .3)); }
      ctx.restore();
    }
    for (const o of HZ) {
      ctx.save();
      if (o.kind === 'blade') {   // 飞旋的大刀：转着的月牙
        ctx.translate(o.x, o.y - 14); ctx.rotate(o.t * 20); ctx.lineCap = 'round';
        ctx.strokeStyle = '#2a1a10'; ctx.lineWidth = 9; ctx.beginPath(); ctx.arc(0, 0, 18, -1.2, 1.9); ctx.stroke();
        ctx.strokeStyle = '#e4e0d4'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(0, 0, 18, -1.2, 1.9); ctx.stroke();
        ctx.strokeStyle = '#7a5030'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-20, -8); ctx.stroke();
      } else if (o.kind === 'ball') {   // 流星锤：铁链 + 铁球
        const sx = o.src.x, sy = o.src.y - 30;
        ctx.strokeStyle = '#2a2a2a'; ctx.lineWidth = 3; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(o.x, o.y - 12); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = '#3a3a3a'; ctx.strokeStyle = '#111'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(o.x, o.y - 12, 11, 0, 7); ctx.fill(); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.arc(o.x - 3, o.y - 15, 4, 0, 7); ctx.fill();
      } else if (o.kind === 'fu') {   // 追人的黄符
        ctx.translate(o.x, o.y - 18); ctx.rotate(Math.sin(o.t * 9) * .4); ctx.fillStyle = '#f2d24a'; ctx.strokeStyle = '#b02a18'; ctx.lineWidth = 1.5; ctx.fillRect(-5, -8, 10, 16); ctx.strokeRect(-5, -8, 10, 16);
        ctx.beginPath(); ctx.moveTo(-2, -5); ctx.lineTo(2, -1); ctx.lineTo(-2, 3); ctx.lineTo(2, 6); ctx.stroke();
      } else if (o.kind === 'whirl') {   // 张梁双刀旋风
        ctx.translate(o.x, o.y); ctx.scale(1, YS); ctx.globalCompositeOperation = 'lighter';
        for (let k = 0; k < 3; k++) { ctx.strokeStyle = `rgba(255,200,120,${.45 - k * .12})`; ctx.lineWidth = 6 - k * 1.5; ctx.beginPath(); ctx.arc(0, 0, o.r - k * 10, o.t * 14 + k, o.t * 14 + k + 2.4); ctx.stroke(); }
      } else if (o.kind === 'fire') {   // 火油罐烧出的一片火
        const fade = Math.min(1, (o.T - o.t) / .5); ctx.translate(o.x, o.y); ctx.scale(1, YS); ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, o.r); g.addColorStop(0, `rgba(255,170,60,${.55 * fade})`); g.addColorStop(.7, `rgba(230,80,20,${.35 * fade})`); g.addColorStop(1, 'rgba(160,30,10,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, o.r, 0, 7); ctx.fill();
        for (let k = 0; k < 6; k++) { const a = k * 1.05 + o.t * 2, rr = o.r * (.35 + .4 * ((k * 37) % 10) / 10), fl = 6 + 4 * Math.sin(o.t * 14 + k * 2); ctx.fillStyle = `rgba(255,${150 + k * 12},60,${.6 * fade})`; ctx.beginPath(); ctx.ellipse(Math.cos(a) * rr, Math.sin(a) * rr, 4, fl, 0, 0, 7); ctx.fill(); }
      } else if (o.kind === 'heal') {   // 方士回春：一圈往外扩的绿环
        ctx.translate(o.x, o.y); ctx.scale(1, YS); const q = o.t / o.T; ctx.strokeStyle = `rgba(120,230,120,${.7 * (1 - q)})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, 20 + q * 110, 0, 7); ctx.stroke();
      } else if (o.kind === 'drum') {   // 战鼓声浪：一圈往外扩的红环
        ctx.translate(o.x, o.y); ctx.scale(1, YS); const q = o.t / o.T; ctx.strokeStyle = `rgba(255,90,60,${.7 * (1 - q)})`; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 0, 20 + q * 110, 0, 7); ctx.stroke();
      } else if (o.kind === 'stuck') {   // 插在地上的长戟
        ctx.strokeStyle = '#2a1a10'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(o.x, o.y); ctx.lineTo(o.x + 10, o.y - 46); ctx.stroke();
        ctx.strokeStyle = '#8a6040'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(o.x, o.y); ctx.lineTo(o.x + 10, o.y - 46); ctx.stroke();
        ctx.fillStyle = '#d8d8d0'; ctx.beginPath(); ctx.moveTo(o.x - 2, o.y + 2); ctx.lineTo(o.x + 4, o.y - 4); ctx.lineTo(o.x - 4, o.y - 6); ctx.fill();
      }
      ctx.restore();
    }
  }
  const ang = (z, tx, ty) => Math.atan2((ty - z.y) / YS, tx - z.x);
  // 每个首领的招：返回蓄力时长（这段时间首领原地不动）。11/12 用户：参考无名之辈，每个首领一招专属技能，招式之间不喘息；破绽来自招式本身（空手、刀卡地、头晕）
  const dirU = (z, tx, ty) => { const a = ang(z, tx, ty); return [Math.cos(a), Math.sin(a), a]; };
  const clampY = y => Math.max(M.top + 6, Math.min(M.bot - 6, y));
  const gap = (z, t, txt) => { z.stun = Math.max(z.stun || 0, t); floaters.push({ x: z.x, y: z.y - 70, t: 0, txt, color: '#9fe08a' }); };
  const BSK = {
    sweep: z => { teleAdd({ k: 'circle', x: z.x, y: z.y, r: 105, T: 1.0, dmg: 2.5, src: z }); say(z, '横扫千军！'); return 1.0; },
    cleave: z => { teleAdd({ k: 'line', x: z.x, y: z.y, a: ang(z, hero.x, hero.y), len: 230, w: 46, T: .85, dmg: 2.8, src: z }); say(z, '开山劈！'); return .85; },
    charge: z => { const a = ang(z, hero.x, hero.y), L = 300, x0 = z.x, y0 = z.y;
      teleAdd({ k: 'line', x: x0, y: y0, a, len: L, w: 56, T: .8, dmg: 2.8, src: z, then: () => { z.dash = { x0, y0, x1: x0 + Math.cos(a) * L, y1: clampY(y0 + Math.sin(a) * L * YS), t: 0 }; } }); say(z, '冲啊！'); return .8; },
    spin: z => { teleAdd({ k: 'circle', x: z.x, y: z.y, r: 120, T: 1.0, dmg: 2.5, src: z }); say(z, '旋戟！'); return 1.0; },
    firerain: z => { for (let i = 0; i < (z.rage ? 7 : 5); i++) teleAdd({ k: 'circle', x: hero.x + R(-110, 110), y: hero.y + R(-55, 55), r: 42, T: 1.0 + i * .14, dmg: 2, src: z, snd: 'land', c: 3 }); say(z, '火来！'); return .7; },
    thunder: z => { for (let i = 0; i < (z.rage ? 8 : 6); i++) teleAdd({ k: 'circle', x: hero.x + (i ? R(-120, 120) : 0), y: hero.y + (i ? R(-60, 60) : 0), r: 46, T: 1.15 + i * .12, dmg: 2.5, src: z, c: 1, snd: 'crack' }); say(z, '天雷！'); return .8; },
    // 程远志：长柄大刀脱手飞出，画一道直线飞到远处再飞回来，去回都伤人；刀没回来前空手站着（破绽）
    boomerang: z => { const [ux, uy, a] = dirU(z, hero.x, hero.y), L = 280;
      teleAdd({ k: 'line', x: z.x, y: z.y, a, len: L, w: 40, T: .5, src: z, snd: '', then: () => {
        const x0 = z.x, y0 = z.y, fx = x0 + ux * L, fy = y0 + uy * L * YS;
        hzAdd({ kind: 'blade', src: z, x: x0, y: y0, r: 28, dmg: 2.6, T: 1.15, upd: o => { const q = o.t / 1.15, e = Math.sin(q * Math.PI), bx = q < .5 ? x0 : z.x, by = q < .5 ? y0 : z.y; o.x = bx + (fx - bx) * e; o.y = by + (fy - by) * e; if (q >= .5 && !o.back) { o.back = 1; o.hitT = 0; } } });
      } }); say(z, '大刀回旋！'); return 1.65; },
    // 邓茂：九环刀劈地，三道裂地波扇形冲出；劈完刀卡在地里 1 秒
    quake3: z => { const a = ang(z, hero.x, hero.y);
      [-.42, 0, .42].forEach((d, i) => teleAdd({ k: 'line', x: z.x, y: z.y, a: a + d, len: 270, w: 38, T: .9, dmg: 2.6, src: z, c: 2, snd: i ? '' : 'land', then: i === 2 ? () => gap(z, 1, '刀卡住了！') : null }));
      say(z, '九环震地！'); return .9; },
    // 波才：插下令旗，旗边不停冒兵；主角站到旗边 0.8 秒就能拔掉
    flag: z => { const x = z.x + (hero.x > z.x ? -26 : 26), y = clampY(z.y + 4);
      teleAdd({ k: 'circle', x, y, r: 30, T: .6, src: z, c: 2, snd: 'land', then: () => { const p = { g: 'flag_huang', x, y, solid: false, broken: false, hp: 0, hitT: 0, sc: .75 }; props.push(p); FLAGS.push({ p, t: 0, sp: .3, pull: 0, src: z }); } });
      say(z, '令旗点兵！'); return .6; },
    // 何仪：双戟连突，三段短冲刺，每段重新瞄准；第三段后喘口气
    dash3: z => { const step = k => { const a = ang(z, hero.x, hero.y), L = 175, x0 = z.x, y0 = z.y;
        z.castT = .42; z.cx = x0; z.cy = y0;
        teleAdd({ k: 'line', x: x0, y: y0, a, len: L, w: 44, T: .42, dmg: 2.2, src: z, snd: 'enemySwing', then: () => { z.dash = { x0, y0, x1: x0 + Math.cos(a) * L, y1: clampY(y0 + Math.sin(a) * L * YS), t: 0 }; z.dashThen = k < 2 ? () => step(k + 1) : () => gap(z, .8, '喘气！'); } }); };
      step(0); say(z, '双戟连突！'); return .42; },
    // 管亥（马上）：跃马踏下，砸在主角现在的位置
    stomp: z => { const x = hero.x, y = hero.y; teleAdd({ k: 'circle', x, y, r: 72, T: .95, dmg: 3, src: z, snd: 'land', then: () => { z.x = x; z.y = y; z.cx = x; z.cy = y; } }); say(z, '马踏飞燕！'); return .95; },
    // 管亥（步战）：掷戟（照无名之辈）：长戟飞出插在地上，空手发愣 1.2 秒，再冲过去捡
    throwj: z => { const [ux, uy, a] = dirU(z, hero.x, hero.y), L = 310;
      teleAdd({ k: 'line', x: z.x, y: z.y, a, len: L, w: 34, T: .7, dmg: 3, src: z, then: () => { const px = z.x + ux * L, py = clampY(z.y + uy * L * YS); gap(z, 1.2, '空手！');
        hzAdd({ kind: 'stuck', src: z, x: px, y: py, T: 1.3, end: () => { z.dash = { x0: z.x, y0: z.y, x1: px, y1: py, t: 0 }; } }); } });
      say(z, '看戟！'); return .7; },
    // 张曼成：在主角周围画一圈符火，1.4 秒后整圈烧起，只留一个缺口
    firering: z => { teleAdd({ k: 'ring', x: hero.x, y: hero.y, r0: 62, r1: 118, ga: R(0, 6.28), gw: .5, T: 1.4, dmg: 3, src: z, c: 3, snd: 'land' }); say(z, '符火阵！'); return .8; },
    // 马元义：流星锤甩出去再拉回来，去回都伤人；拉回后硬直
    flail: z => { const [ux, uy, a] = dirU(z, hero.x, hero.y), L = 270;
      teleAdd({ k: 'line', x: z.x, y: z.y, a, len: L, w: 30, T: .5, src: z, snd: '', then: () => {
        const fx = z.x + ux * L, fy = z.y + uy * L * YS;
        hzAdd({ kind: 'ball', src: z, x: z.x, y: z.y, r: 22, dmg: 2.6, T: .95, upd: o => { const q = o.t / .95, e = Math.sin(q * Math.PI); o.x = z.x + (fx - z.x) * e; o.y = z.y + (fy - z.y) * e; if (q > .5 && !o.back) { o.back = 1; o.hitT = 0; } }, end: () => gap(z, .6, '收锤！') });
      } }); say(z, '流星锤！'); return 1.45; },
    // 张梁：双刀旋风，边转边追 2.2 秒，转完头晕
    whirl: z => { z.chase = { t: 0, T: 2.2, spd: z.rage ? 70 : 58 }; hzAdd({ kind: 'whirl', src: z, x: z.x, y: z.y, r: 60, dmg: 2.2, T: 2.2, upd: o => { o.x = z.x; o.y = z.y; }, end: () => gap(z, 1.2, '头晕！') }); say(z, '旋风斩！'); return 0; },
    // 张宝：地裂（照无名之辈）：一道裂缝从脚下朝主角一段段冒出来
    crack: z => { const [ux, uy] = dirU(z, hero.x, hero.y); for (let i = 0; i < 9; i++) teleAdd({ k: 'circle', x: z.x + ux * (34 + i * 30), y: clampY(z.y + uy * (34 + i * 30) * YS), r: 26, T: .55 + i * .07, dmg: 2.4, src: z, c: 2, snd: i % 3 ? '' : 'land' }); say(z, '地裂！'); return .6; },
    // 张宝：土墙（照无名之辈）：在主角身后升起一排土墙堵退路，留一个缺口，5 秒后崩塌
    wall: z => { const [ux, uy] = dirU(z, hero.x, hero.y), bx = hero.x + ux * 58, by = hero.y + uy * 58 * YS, px = -uy, py = ux, skip = (Math.random() * 5) | 0;
      for (let k = 0; k < 5; k++) { if (k === skip) continue; const x = bx + px * (k - 2) * 46, y = clampY(by + py * (k - 2) * 46 * YS);
        teleAdd({ k: 'circle', x, y, r: 24, T: .6, src: z, c: 2, snd: k ? '' : 'land', then: () => { const p = { g: 'zb_wall', x, y, solid: true, broken: false, hp: 0, hitT: 0, sc: 1, w: 56, h: 18.7 }; props.push(p); WALLS.push({ p, t: 0, src: z }); } }); }
      say(z, '土墙，起！'); return .6; },
    // 张角：雷符：三张符追着主角飘，1.3 秒后在主角脚下落雷
    leifu: z => { for (let k = 0; k < 3; k++) { const o = hzAdd({ kind: 'fu', src: z, x: z.x + (k - 1) * 16, y: z.y - 4, r: 14, dmg: 1.5, T: 1.3, upd: (o, dt) => { const d = Math.hypot(hero.x - o.x, hero.y - o.y) || 1; o.x += (hero.x - o.x) / d * 85 * dt; o.y += (hero.y - o.y) / d * 85 * dt * YS; } });
        if (!k) o.end = () => { teleAdd({ k: 'circle', x: hero.x, y: hero.y, r: 56, T: .7, dmg: 3, src: z, c: 1, snd: 'crack' }); if (z.rage) for (let j = 0; j < 2; j++) teleAdd({ k: 'circle', x: hero.x + R(-70, 70), y: hero.y + R(-35, 35), r: 44, T: .85, dmg: 2.5, src: z, c: 1, snd: '' }); }; }
      say(z, '符来！'); return .6; },
    // 张角：天雷滚滚：全场随机大范围落雷（11/12 用户：八卦雷阵改成随机大范围落雷）
    storm: z => { const n = z.rage ? 22 : 15; for (let i = 0; i < n; i++) { const mid = i === (n >> 1);
        teleAdd({ k: 'circle', x: mid ? hero.x : hero.x + R(-330, 330), y: mid ? hero.y : clampY(hero.y + R(-160, 160)), r: R(42, 64), T: 1.0 + i * .11, dmg: 2.6, src: z, c: 1, snd: i % 2 ? '' : 'crack' }); }
      say(z, '天雷滚滚！'); return 1.0; },
  };
  const BMOVES = { cheng_yuanzhi: ['boomerang', 'sweep'], deng_mao: ['quake3', 'cleave'], bo_cai: ['flag', 'spin'], he_yi: ['dash3', 'cleave'], zhang_mancheng: ['firering', 'firerain'], ma_yuanyi: ['flail', 'spin'],
    guanhai_m: ['charge', 'stomp'], guanhai_b: ['throwj', 'spin'], zhang_liang: ['whirl', 'charge'], zhang_bao: ['crack', 'wall', 'firerain'], zhang_jiao: ['leifu', 'storm'] };
  function say(z, t) { floaters.push({ x: z.x, y: z.y - 64, t: 0, txt: t, color: '#ffcf6a' }); }
  function bossSkills(dt) {
    for (const z of zs) {
      if (!z.survBoss || z.dead || z.hp <= 0 || z.endFade != null) continue;
      if (z.dash) {   // 冲刺：沿预警线冲过去
        const d = z.dash; d.t += dt; const q = Math.min(1, d.t / .3); z.x = d.x0 + (d.x1 - d.x0) * q; z.y = d.y0 + (d.y1 - d.y0) * q; z.st = 'move'; z.moving = true;
        if (q >= 1) { z.dash = null; if (z.dashThen) { const f = z.dashThen; z.dashThen = null; f(); } }
        continue;
      }
      if (z.chase) {   // 旋风：边转边追
        const c = z.chase; c.t += dt; const dx = hero.x - z.x, dy = (hero.y - z.y) / YS, d = Math.hypot(dx, dy) || 1;
        const step = c.spd * dt * slowMove(z);
        z.x += dx / d * step; z.y = clampY(z.y + dy / d * step * YS); z.st = 'strike'; z.t = .1; z.f = dx < 0 ? -1 : 1;
        if (c.t >= c.T) z.chase = null; continue;
      }
      if (z.castT > 0) { z.castT -= dt; z.x = z.cx; z.y = z.cy; z.st = 'wind'; z.t = Math.min(z.t, .2); z.vx = 0; continue; }   // 蓄力：原地不动、举刀
      if (z.stun > 0) continue;
      if (z.skCd == null) z.skCd = 2.5;
      const big = z.survTier >= 3, list = z.clone ? ['crack'] : (BMOVES[z.type] || (big ? ['sweep', 'cleave'] : ['cleave']));
      if (!z.seq || !z.seq.length) {
        if ((z.skCd -= dt) > 0) continue;
        z.skI = (z.skI || 0); z.seq = big ? [list[z.skI % list.length], list[(z.skI + 1) % list.length]] : [list[z.skI % list.length]]; z.skI += big ? 2 : 1;
        z.skCd = big ? (z.rage ? 3.5 : 5) : 8;   // 首领两招连放，然后隔 5 秒（暴怒 3.5 秒）；小头目一招，隔 8 秒
      }
      const T = BSK[z.seq.shift()](z);
      if (T > 0 && !(z.castT > 0)) { z.castT = T; z.cx = z.x; z.cy = z.y; }
      if (T > 0) { z.st = 'wind'; z.t = 0; }
    }
  }
  function bossTick(dt) {
    teleTick(dt); if (RT.on && RT.node && W.started && !W.pick) bossSkills(dt);
    if (!RT.on || !RT.node || !W.started || W.pick) return;
    for (const z of zs) {
      if (!z.survBoss || z.dead || z.hp <= 0 || z.endFade != null || !(z.survTier >= 3)) continue;
      if (z.type === 'guanhai_m' && !z.dismount && z.hp < (z.maxHp || z.hp) * .5) {   // 管亥二阶段：被打下马，换步战长戟，摔倒僵直 1.2 秒
        z.dismount = 1; z.type = 'guanhai_b'; z.sprite = 'guanhai_b'; z.T = Object.assign({}, TYPES.guanhai_b, { dmg: TYPES.guanhai_b.dmg * 1.6, heavy: true }); z.stun = 1.2; z.st = 'hurt'; z.t = 0;
        floaters.push({ x: z.x, y: z.y - 70, t: 0, txt: '管亥 落马！', color: '#ffcf6a', big: 1 }); shake = Math.max(shake, .35); if (window.SFX) SFX.play('crack');
        z.rage = 0;
      }
      if (!z.rage && z.hp < (z.maxHp || z.hp) * .5 && z.type === 'zhang_liang') {   /* 11/12 张梁二阶段：卸甲狂怒，比普通暴怒更快、出招几乎不停 */
        z.T = Object.assign({}, z.T, { spd: (z.T.spd || 30) * 1.2, wind: (z.T.wind || .8) * .7 }); z.bossT = 0;
        floaters.push({ x: z.x, y: z.y - 84, t: 0, txt: '张梁 狂怒！', color: '#ff4a2a', big: 1 }); shake = Math.max(shake, .4); if (window.SFX) SFX.play('crack');
      }
      if (!z.rage && z.hp < (z.maxHp || z.hp) * .5 && z.type === 'zhang_bao') {   /* 11/12 张宝二阶段：召出两个分身（血少、伤害低，打掉就散） */
        for (const s of [-1, 1]) { const c = edgeSpawn('zhang_bao', { name: '张宝·分身', hp: 18, sc: 1, tier: 2 }); if (c) { c.x = z.x + s * 70; c.y = Math.max(M.top + 6, Math.min(M.bot - 6, z.y + s * 30)); c.T = Object.assign({}, c.T, { dmg: (c.T.dmg || 1) * .6 }); c.clone = 1; } }
        floaters.push({ x: z.x, y: z.y - 84, t: 0, txt: '张宝：分身之术！', color: '#c9a0ff', big: 1 }); if (window.SFX) SFX.play('j_banner');
      }
      if (!z.rage && z.hp < (z.maxHp || z.hp) * .5) { z.rage = 1; z.T = Object.assign({}, z.T, { spd: (z.T.spd || 30) * 1.3, wind: (z.T.wind || .8) * .75 }); floaters.push({ x: z.x, y: z.y - (z.dismount ? 96 : 64), t: 0, txt: (z.bossLabel || '敌将') + ' 暴怒！', color: '#ff4a2a' }); shake = Math.max(shake, .3); if (window.SFX) SFX.play('j_banner'); }
      if ((z.bossT -= dt) <= 0) {
        z.bossT = z.rage ? 10 : 13; const n = 5 + (z.rage ? 2 : 0);
        floaters.push({ x: z.x, y: z.y - 60, t: 0, txt: (z.bossLabel || '敌将') + '：给我上！', color: '#ffcf6a' });
        for (let k = 0; k < n; k++) { const e = edgeSpawn(pickType()); if (e) { const a = k / n * Math.PI * 2; e.x = hero.x + Math.cos(a) * 170; e.y = Math.max(M.top + 6, Math.min(M.bot - 6, hero.y + Math.sin(a) * 90)); } }
      }
    }
  }
  // 首领战开打：刘关张中一人的立绘从左侧滑进来喊一句，约 2.6 秒后滑出（11/11 用户定 1）；不暂停战斗、不挡点击
  const INTRO = [
    ['liubei', '刘备', n => `贼首${n}就在前面，随我破阵！`],
    ['guanyu', '关羽', n => `${n}？插标卖首之辈，某去去便回。`],
    ['zhangfei', '张飞', n => `${n}！吃俺老张一矛！`],
    ['liubei', '刘备', n => `${n}占城为祸，今日便替百姓讨个公道！`],
  ];
  const LIHUI = { liubei: 'art/ui/npc/liubei_lihui.webp', guanyu: 'art/ui/npc/guanyu_lihui.webp', zhangfei: 'art/ui/npc/zhangfei_lihui.webp' };   // 写死字面路径，打包时才会换成 pack/ 网址
  function bossIntro(sec, name, fin) {
    if (!document.getElementById('bossIntroCss')) { const st = document.createElement('style'); st.id = 'bossIntroCss'; st.textContent = `
#bossIntro{position:fixed;left:0;bottom:0;z-index:10030;pointer-events:none;display:flex;align-items:flex-end;animation:biIn .45s cubic-bezier(.2,.9,.3,1.1) both}
#bossIntro.out{animation:biOut .4s ease-in both}
#bossIntro img{height:min(62vh,520px);image-rendering:pixelated;filter:drop-shadow(0 0 14px rgba(0,0,0,.7))}
#bossIntro .bx{margin:0 0 9vh -2vw;padding:10px 18px 12px;min-width:min(380px,40vw);border:1px solid rgba(184,149,90,.6);background:linear-gradient(180deg,rgba(20,17,14,.95),rgba(8,7,6,.95));box-shadow:0 8px 24px rgba(0,0,0,.6)}
#bossIntro b{display:inline-block;margin-bottom:4px;padding:1px 12px;border:1px solid rgba(184,149,90,.6);background:#140f0b;color:#e6c98a;font:700 17px "Songti SC","Noto Serif SC",serif;letter-spacing:.2em}
#bossIntro p{margin:0;color:#efe4cc;font:700 clamp(15px,2.4vh,21px)/1.5 "PingFang SC","Microsoft YaHei",sans-serif}
@keyframes biIn{from{transform:translateX(-60%);opacity:0}}@keyframes biOut{to{transform:translateX(-60%);opacity:0}}
@media (max-height:520px){#bossIntro img{height:58vh}#bossIntro .bx{margin-bottom:6vh}}`; document.head.appendChild(st); }
    const old = document.getElementById('bossIntro'); if (old) old.remove();
    const [k, nm, line] = fin ? ['liubei', '刘备', n => `${n}就在祭坛之上！三弟、二弟，随我杀上去！`] : INTRO[Math.min(3, sec)];
    const d = document.createElement('div'); d.id = 'bossIntro';
    d.innerHTML = `<img src="${LIHUI[k]}" alt=""><div class="bx"><b>${nm}</b><p>${line(name)}</p></div>`;
    document.body.appendChild(d); if (window.SFX) SFX.play('j_banner');
    setTimeout(() => d.classList.add('out'), 2600); setTimeout(() => d.remove(), 3050);
  }
  function spawnNamed() {
    const nd = RT.node;
    if (nd.type === 'elite') {
      const sec = secOf(nd), t = sec >= 2 && c2ok ? 'yellow-golem' : 'elite';
      bossBuff(edgeSpawn(t, { name: '精锐头目', hp: 30, sc: 1.2, tier: 2 }), 1.25); return;
    }
    // 11/12 张梁/张宝二选一：第 4 段走哪边就打谁（副将马元义）；没打的那个到最后张角战里当小头目
    const BR = { liang: { t: 'zhang_liang', name: '张梁', m: 1.4, sc: 1 }, bao: { t: 'zhang_bao', name: '张宝', m: 1.5, sc: 1 } };
    const took = window.ROUTE && ROUTE.branch ? ROUTE.branch() : null;
    const list = nd.br ? [BR[nd.br], BOSSES[4][1]] : nd.final ? [BOSSES[4][0], BR[took === 'bao' ? 'liang' : 'bao']] : BOSSES[secOf(nd)];
    bossIntro(nd.final ? 0 : secOf(nd), list[0].name, !!nd.final);
    W.bossT = list[0].t; talkIn = list[0].t;   // 11/14：首领登场台词（等开战横幅点掉再说）
    list.forEach((b, i) => { const z = edgeSpawn(c2ok || !b.fb ? b.t : b.fb, Object.assign({}, b, { tier: i === 0 ? 3 : 2, hp: i === 0 ? 130 : 40 })); bossBuff(z, i === 0 ? 1.6 : 1.3); });   // 11/11 用户：BOSS 太简单 → 首领血 54→130、小头目 21→40，伤害 ×1.6 / ×1.3   // 四档：小头目 ×7（21）、首领 ×18（54）
  }
  function edgeSpawn(type, boss) {   // boss：true = 老卒式 ×4 血；对象 = 命名首领 {name, hp 或 m, sc}
    const vw = viewW(); let side = Math.random() < .5 ? -1 : 1, x, y;
    if (window.ARENA && ARENA.on()) { const p = ARENA.edge(); x = p.x; y = p.y; side = x < hero.x ? -1 : 1; }   // 俯视竞技场：四周都刷
    else { x = side < 0 ? cam.x + 6 : cam.x + vw - 6; x = Math.max(arenaL + 14, Math.min(lockR - 14, x)); y = R(M.top + 6, M.bot - 6); }
    spawn(type, x, y);
    const z = zs[zs.length - 1]; z.f = -side; z.survMul = (1 + HP_SCALE * (W.n - 1)) * (HAS('yuxi') ? 1.15 : 1) * (S.enemyHpK || 1);
    z.survTier = 0;
    if (!boss && (z.T.elite || ['yellow-heavy', 'yellow-shield', 'yellow-golem', 'cavalry'].includes(type))) { z.survTier = 1; z.hp = 7.5; z.maxHp = z.hp * z.survMul; }   // 四档：杂兵 ×1（3）、精英 ×2.5（7.5）
    z.hp *= z.survMul;
    if (boss && boss !== true) { z.survTier = boss.tier || 2; const hb = boss.hp || 21; z.hp = hb * z.survMul; z.maxHp = z.hp; z.sc = (z.sc || 1) * (boss.sc || 1); z.survBoss = true; z.bossLabel = boss.name; floaters.push({ x: z.x, y: z.y - 60, t: 0, txt: boss.name + ' 出阵！', color: '#ff6a4a' }); }
    else if (boss) { z.hp *= 4; z.maxHp = z.hp; z.sc = (z.sc || 1) * 1.25; z.survBoss = true; floaters.push({ x: z.x, y: z.y - 60, t: 0, txt: '敌将出阵！', color: '#ff6a4a' }); }
    return z;
  }
  function startWave(n) {
    if (RT.on) {   // 路线模式：一个节点 = 一整场连续的仗（不分波、不鸣金）。难度从「本节点第 1 波」平滑爬到「最后一波」的级别
      const nd = RT.node, L = ROUTE.layers(), N0 = ROUTE.waves(nd);
      if (n === 1) { W.outTalk = 0; W.bossT = null; talkHold = false; }
      if (n === 1) { const cn = v => v <= 10 ? '零一二三四五六七八九十'[v] : v < 20 ? '十' + (v % 10 ? '零一二三四五六七八九'[v % 10] : '') : '零一二三四五六七八九'[(v / 10) | 0] + '十' + (v % 10 ? '零一二三四五六七八九'[v % 10] : ''); waveBanner(ROUTE.name(nd), nd.type === 'boss' ? '首领战 · 迎战' : nd.type === 'elite' ? '第' + cn(nd.layer) + '层 · 精锐 · 迎战' : '第' + cn(nd.layer) + '层 · 迎战'); }
      const lvOf = k => Math.max(1, Math.min(WAVES, 1 + Math.floor(((nd.layer - 1 + (k - 1) / N0) / L) * WAVES) + (nd.type === 'elite' ? 2 : 0) + (nd.type === 'boss' ? 2 : 0)));
      W.lv0 = lvOf(1); W.lv1 = lvOf(N0); W.tot = 0; for (let k = 1; k <= N0; k++) W.tot += (WAVE_T[lvOf(k) - 1] || 60) * ROUTE.TIME_K;
      W.tot = nd.type === 'boss' ? 60 : nd.type === 'elite' ? 42 : 30;   /* 11/14 用户：普通战斗每场 30 秒、场次加多 */ if (/[?&]longwave/.test(location.search) || window.TRIAL_ON) W.tot = 9999;   // 测试用：关卡不结束   /* 11/12 用户：关卡太长 → 普通约 40 秒（36~44）、精英 50、首领（含张角）60 秒内 */   // 11/11：第一关太长太难 → 前三层 35/42/48 秒   // 用户定 11/09：首领 3 分钟；精英约 1.5~2 分钟；普通战斗约 50~65 秒（18 层）
      W.k = 1; W.N = 1; W.n = W.lv0; W.lvF = W.lv0; W.t = 0; W.retreat = 0; W.spawnT = 0; W.batchT = 0; W.bossDone = false;
      say(ROUTE.name(nd), 1.6); return;
    }
    W.n = n; W.t = 0; W.retreat = 0; W.spawnT = 0; W.batchT = 0; W.bossDone = false;
    say(n === WAVES ? `第 ${n} 波 · 终局` : `第 ${n} 波`, 1.6);
  }
  function endWave() {   // 鸣金收兵：敌人停住、慢慢退场
    W.retreat = 1.4; S.wind = null; S.recov = null;
    say('鸣金收兵！', 1.6); sfx('stamp', hero.x);
    for (const z of alive()) { z.stun = 9; z.survFade = true; }
  }
  function waveFlow(dt) {
    if (!W.started) return;
    if (W.pick) return;   // 正在选武艺
    if (W.between > 0) { W.between -= dt; if (W.between <= 0) startWave(RT.on ? W.k + 1 : W.n + 1); return; }
    if (W.retreat > 0) {
      W.retreat -= dt;
      if (W.retreat <= 0) {
        zs.length = 0; eshots.length = 0;
        if (RT.on) {
          if (W.k >= W.N) { nodeClear(); return; }
        } else if (W.n >= WAVES) { won = true; return; }
        hero.hp = Math.min(window.GEAR ? GEAR.maxHp() : 10, hero.hp + 2);   // 波间调息：回一点血
        W.between = .8;
        if (!offerSkill() && window.ROGUE) ROGUE.offer();   // 波间：还有没学会的武艺就先选武艺，否则选锦囊
      }
      return;
    }
    W.t += dt;
    if (RT.on) { W.lvF = W.lv0 + (W.lv1 - W.lv0) * Math.min(1, W.t / W.tot); W.n = Math.round(W.lvF); }   // 难度随时间平滑上升
    if (bossCount() && !W.bossDone && W.t >= 1) { W.bossDone = true; if (RT.on) spawnNamed(); else for (let i = 0; i < bossCount(); i++) edgeSpawn('elite', true); }
    // 补兵：开场慢慢涌进来（前 60% 时间里目标人数从少爬到满）
    const ramp = RT.on ? WT() * .35 : Math.min(30, WT() * .6), r0 = RT.on ? .5 : .08, rf = Math.min(1, r0 + (1 - r0) * W.t / ramp), tn = Math.ceil(targetN() * rf);
    const cnt = alive().filter(z => !z.survBoss).length;
    if (cnt < tn * .5) { if ((W.spawnT -= dt) <= 0) { edgeSpawn(pickType()); W.spawnT = RT.on ? .22 - .1 * rf : rf < 1 ? .55 - .3 * rf : .2; } }
    else if ((W.batchT -= dt) <= 0 && cnt < tn) { const k = Math.min(tn - cnt, RT.on ? 3 + (Math.random() * 3 | 0) : rf < 1 ? 1 + (Math.random() * 2 | 0) : 3 + (Math.random() * 3 | 0)); for (let i = 0; i < k; i++) edgeSpawn(pickType()); W.batchT = RT.on ? R(.7, 1.1) : R(1.6, 2.4); }
    if (RT.on && RT.node && RT.node.type === 'boss' && W.bossDone && W.t > 3 && !alive().some(z => z.survBoss && z.survTier >= 3)) {   /* 11/11 用户：打死首领就结束（以前要连小头目一起打死） */ if (!W.outTalk && window.STORY && W.bossT) { W.outTalk = 1; if (STORY.boss(W.bossT, 1, () => { talkHold = false; W.t = WT(); })) { talkHold = true; return; } } if (talkHold) return; say(RT.node.final ? '黄巾首领已破！' : '敌将已破！', 1.6); W.t = WT(); }   // 首领战：把场上的敌将都打倒就算赢
    if (W.t >= WT()) endWave();
  }

  // ---------- 武艺（代码画） ----------
  const fx = [];
  function sweep(a0, half, r, dmg, kb, color, opt = {}) {
    r *= RM;   // 扇形斩：a0 朝向，half 半角，r 半径（左右距离；上下按清版透视压一半）
    fx.push({ k: 'arc', x: hero.x, y: hero.y, a0, half, r, t: 0, T: .26, color, rev: !!opt.rev });
    for (const z of hittable()) {
      const dx = z.x - hero.x, dy = (z.y - hero.y) * 2, d = Math.hypot(dx, dy);
      if (d > r + 8) continue;
      let da = Math.abs(Math.atan2(dy, dx) - a0); if (da > Math.PI) da = Math.PI * 2 - da;
      if (d > 14 && da > half) continue;
      const f0 = freeze;
      { const v = VUL(z); rec(dmg * DM() * v); hit(z, dmg * DM() * v, kb, Math.sign(dx) || hero.f, false, 0, .3, false, false, { secondary: true, survSkill: true }); }
      freeze = Math.min(freeze, Math.max(f0, .04));
    }
  }
  const aim = () => { const t = nearest(200); if (!t) return Math.atan2(0, hero.f); return Math.atan2((t.y - hero.y) * 2, t.x - hero.x); };
  function nearest(r) { let best = null, bd = r; for (const z of hittable()) { const d = dist(z, hero); if (d < bd) { bd = d; best = z; } } return best; }
  // 用户定 11/09：武艺没有各自冷却，1→5 依次放（放完一招才轮到下一招）；前摇/后摇照三国幸存者
  const SK = {
    hengsao: { desc: '身前 270° 大横扫，击退', name: '横扫', icon: '扫', color: '#ffb45a', wu: .6, rc: .3, need: 70, pose: [], range: 46, half: 2.356,
      cast() { const a = aim(); sweep(a, 2.356, 46, 2.4, 60, ['rgba(255,170,90,', 'rgba(255,230,160,']); sfx('swing_knife', hero.x); shake = Math.max(shake, .12); } },
    lianzhan: { desc: '180° 连砍两刀', name: '连斩', icon: '连', color: '#8fd0ff', wu: .5, rc: .4, need: 64, pose: [], range: 40, half: 1.571,
      cast() {
        const a = aim(); sweep(a, 1.571, 40, 1.6, 30, ['rgba(120,200,255,', 'rgba(210,240,255,']); sfx('swing_knife', hero.x);
        later(.25, () => { const b = aim(); S.poseOverride = { f: SK.lianzhan.pose2, t: .25 }; sweep(b, 1.571, 40, 1.6, 45, ['rgba(255,120,120,', 'rgba(255,220,220,'], { rev: true }); sfx('swing_knife', hero.x); });
      } },
  };
  SK.daobo = { desc: '向前劈出穿透刀波', name: '刀波', icon: '波', color: '#c8f0ff', wu: .5, rc: .3, need: 160, pose: [], range: 0, half: 0, beam: true,
    cast() {   // 朝最近的敌人劈出一道月牙刀波，一路穿透
      const a = aim(), vx = Math.cos(a), vy = Math.sin(a) / 2;
      bolts.push({ x: hero.x + vx * 14, y: hero.y + vy * 14, vx: vx * 270, vy: vy * 270, a, t: 0, T: .85, hitSet: [] });
      sfx('swing_knife', hero.x); shake = Math.max(shake, .08);
    } };
  const bolts = [], zones = [];
  for (const a of [bolts, zones]) { const pu = a.push; a.push = function (...o) { o.forEach(x => { x.cm = CM; x.ck = CK; }); return pu.apply(this, o); }; }   // 弹道/地面效果记下出手那一刻的倍率

  // ---------- 三国幸存者武艺（黄玄地天；tier 0 基础 / 黄 / 玄 / 地 / 天） ----------
  const TIERN = ['基础', '黄', '玄', '地', '天'], TMIN = [0, 0, 2, 4, 6];
  const tierOk = k => W.n >= TMIN[SK[k].tier || 0];
  const HT = (z, dmg, kb, dir, fr) => { const v = VUL(z); rec(dmg * DM() * v); const f0 = freeze; hit(z, dmg * DM() * v, kb, dir || hero.f, false, 0, .3, false, false, { secondary: true, survSkill: true }); freeze = Math.min(freeze, Math.max(f0, fr || .04)); };
  const near = (x, y, r) => hittable().filter(z => Math.hypot(z.x - x, (z.y - y) * 2) < r + 6);
  function blast(x, y, r, dmg, kb, col) { r *= RM; fx.push({ k: 'burst', x, y, r, t: 0, T: .4, col: col || '255,210,120' }); for (const z of near(x, y, r)) HT(z, dmg, kb, Math.sign(z.x - x) || hero.f); }
  function lineHit(a, L, w, dmg, kb, col, ox, oy) {
    L *= RM;   // 朝 a 方向一条宽 w 的直线（清版透视：y 压一半）；ox/oy 给了就从那里出手（残影用）
    const vx = Math.cos(a), vy = Math.sin(a) / 2, x0 = ox != null ? ox : hero.x, y0 = oy != null ? oy : hero.y;
    fx.push({ k: 'line', x: x0, y: y0, a, L, w, t: 0, T: .3, col: col || '255,240,190' });
    for (const z of hittable()) { const dx = z.x - x0, dy = (z.y - y0) * 2, al = dx * Math.cos(a) + dy * Math.sin(a), pe = Math.abs(-dx * Math.sin(a) + dy * Math.cos(a)); if (al > -10 && al < L && pe < w + 6) HT(z, dmg, kb, Math.sign(dx) || hero.f); }
  }
  function pts(n, range) {   // 随机落点：优先落在敌人身上
    const zs = hittable().filter(z => dist(z, hero) < range).sort(() => Math.random() - .5), out = [];
    for (let i = 0; i < n; i++) { const z = zs[i % Math.max(1, zs.length)]; out.push(z ? [z.x + R(-14, 14), z.y + R(-8, 8)] : [hero.x + R(-range, range) * .8, hero.y + R(-30, 30)]); }
    return out;
  }
  const shot = (a, o) => bolts.push(Object.assign({ x: hero.x + Math.cos(a) * 14, y: hero.y + Math.sin(a) * 7, vx: Math.cos(a) * 270, vy: Math.sin(a) * 135, a, t: 0, T: .85, hitSet: [], dmg: 1.8, col: ['160,225,255', '240,252,255'] }, o));
  const later = (t, f) => { const c = CM, r = RM, k = CK; S.later.push({ t, f() { const o = CM, q = RM, w = CK; CM = c; RM = r; CK = k; f(); CM = o; RM = q; CK = w; } }); };
  const add = (k, o) => { SK[k] = Object.assign({ wu: .6, rc: .35, pose: [], range: 0, half: 0, tier: 0 }, o); };
  SK.hengsao.tier = 1; SK.lianzhan.tier = 1;
  // 刀 13 招两招新的（11/12）
  add('liedihuan', { tier: 3, name: '裂地环', icon: '圜', color: '#e0a860', desc: '劈地，落点一圈接一圈向外裂开', need: 150, none: true, wu: .7, rc: .4,
    cast() { const [[x, y]] = pts(1, 170); fx.push({ k: 'mark', x, y, r: 26, t: 0, T: .3 }); sfx('crack', hero.x); shake = Math.max(shake, .15);
      [0, 1, 2].forEach(i => later(.12 + i * .16, () => { blast(x, y, 34 + i * 30, 1.25, 26 + i * 8, '224,170,100'); if (!i) shake = Math.max(shake, .2); })); } });
  add('feilunren', { tier: 4, name: '飞轮刃', icon: '轮', color: '#d8f0ff', desc: '刀脱手飞旋，绕身一大圈再飞回', need: 140, none: true, wu: .6, rc: .35,
    cast() { const a0 = aim(), N = 16; sfx('swing_knife', hero.x);
      for (let i = 1; i <= N; i++) later(i * .09, () => { const q = i / N, r = Math.sin(q * Math.PI) * 150 + 18, a = a0 + q * Math.PI * 2.2; blast(hero.x + Math.cos(a) * r, hero.y + Math.sin(a) * r * .5, 22, .8, 12, '216,240,255'); }); } });
  add('huima', { tier: 1, name: '回马刀', icon: '回', color: '#ffc27a', desc: '先斩身前，再回身斩身后', need: 60, range: 44, half: 1.2, wu: .55, rc: .35,
    cast() { const a = aim(); sweep(a, 1.2, 44, 1.8, 40, ['rgba(255,190,110,', 'rgba(255,235,180,']); sfx('swing_knife', hero.x); later(.22, () => { S.poseOverride = { f: SK.huima.pose2, t: .25 }; sweep(a + Math.PI, 1.2, 44, 2.2, 55, ['rgba(255,120,90,', 'rgba(255,215,200,'], { rev: true }); sfx('swing_knife', hero.x); }); } });
  add('qiang', { name: '枪刺', icon: '枪', color: '#ffe9a8', desc: '向前刺出一条长枪线', need: 130, beam: true, len: 100, wu: .5,
    cast() { lineHit(aim(), 100, 10, 2.6, 36, '255,233,168'); sfx('swing_knife', hero.x); shake = Math.max(shake, .08); } });

  add('huogong', { name: '火攻', icon: '火', color: '#ff7a3c', desc: '数处起火，灼烧三秒', need: 180, none: true,
    cast() { for (const [x, y] of pts(3, 230)) zones.push({ x, y, r: 30, t: 0, T: 3, tk: 0, dmg: .55, kind: 'fire' }); sfx('crack', hero.x); } });
  add('pili', { name: '霹雳', icon: '雷', color: '#cfd8ff', desc: '召四道落雷轰击', need: 200, none: true, wu: .5,
    cast() { pts(4, 230).forEach(([x, y], i) => later(i * .1, () => { fx.push({ k: 'bolt', x, y, t: 0, T: .35 }); blast(x, y, 18, 2.4, 30, '210,220,255'); sfx('crack', x); })); shake = Math.max(shake, .15); } });
  add('chong', { name: '冲锋', icon: '冲', color: '#ffb0a0', desc: '向前猛冲，撞飞路上的人', need: 120, beam: true, len: 90, wu: .45,
    cast() { const a = aim(); lineHit(a, 90, 16, 2.2, 70, '255,180,160'); hero.x += Math.cos(a) * 36; hero.y += Math.sin(a) * 18; sfx('crack', hero.x); shake = Math.max(shake, .15); } });
  add('daolun', { name: '刀轮', icon: '轮', color: '#cfe8ff', desc: '身周刀轮急转一圈（约 1 秒）', need: 90, wu: .5,
    cast() { zones.push({ x: 0, y: 0, follow: 1, r: 44, t: 0, T: 1.05, tk: 0, dmg: 1.25, kind: 'wheel' }); /* 11/11：3 秒太长等于常驻，缩到约 1 秒 */ sfx('swing_knife', hero.x); } });
  add('xuanfeng', { tier: 2, name: '回旋斩', icon: '旋', color: '#a0d0ff', desc: '周身 360° 回旋一斩', need: 80, range: 66, half: Math.PI,
    cast() { sweep(0, Math.PI, 66, 2.5, 55, ['rgba(160,210,255,', 'rgba(225,245,255,']); sfx('swing_knife', hero.x); shake = Math.max(shake, .15); } });
  add('dilie', { tier: 3, name: '地裂波', icon: '裂', color: '#d8a060', desc: '向前裂开长长一道地缝', need: 200, beam: true, len: 200, wu: .7, rc: .4,
    cast() { lineHit(aim(), 200, 18, 3.4, 60, '230,170,100'); sfx('crack', hero.x); shake = Math.max(shake, .3); } });
  add('shuanghuan', { tier: 3, name: '双环击飞', icon: '环', color: '#ffd27a', desc: '内外两环依次震飞', need: 90, range: 80, half: Math.PI, ring: true, wu: .7, rc: .4,
    cast() { blast(hero.x, hero.y, 46, 2.2, 70); later(.25, () => blast(hero.x, hero.y, 80, 2.6, 80)); sfx('crack', hero.x); shake = Math.max(shake, .3); } });
  add('xuehe', { tier: 3, name: '血河斩', icon: '血', color: '#ff5050', desc: '一道又宽又长的血色刀光', need: 180, beam: true, len: 180, wu: .7, rc: .4,
    cast() { lineHit(aim(), 180, 32, 3.8, 50, '255,70,70'); sfx('swing_knife', hero.x); shake = Math.max(shake, .3); } });
  add('sixiang', { tier: 4, name: '四象剑气', icon: '象', color: '#c8b0ff', desc: '四向射出穿透剑气', need: 200, wu: .7, rc: .4,
    cast() { const a = aim(); for (let i = 0; i < 4; i++) shot(a + i * Math.PI / 2, { dmg: 2.6, T: 1, col: ['180,150,255', '245,235,255'] }); sfx('swing_knife', hero.x); shake = Math.max(shake, .2); } });
  add('tianbeng', { tier: 4, name: '天崩地裂', icon: '崩', color: '#ffae54', desc: '身周巨震，再引六处崩裂', need: 120, none: true, wu: .9, rc: .5,
    cast() { blast(hero.x, hero.y, 100, 3.8, 90); pts(6, 240).forEach(([x, y], i) => later(.2 + i * .12, () => blast(x, y, 44, 2.4, 50))); sfx('crack', hero.x); shake = Math.max(shake, .5); } });
  add('wanren', { tier: 4, name: '万刃归宗', icon: '万', color: '#b8f0ff', desc: '十四柄飞刃自四面八方袭来', need: 200, none: true, wu: .8, rc: .5,
    cast() { for (let i = 0; i < 14; i++) later(i * .05, () => { const a = i * Math.PI * 2 / 14 + R(-.1, .1); shot(a, { dmg: 1.6, T: .9, vx: Math.cos(a) * 300, vy: Math.sin(a) * 150, col: ['170,235,255', '255,255,255'] }); }); sfx('swing_knife', hero.x); shake = Math.max(shake, .2); } });
  // ---------- 枪 12 招（11/12 用户定：黄 枪刺 连刺 拦扫 / 玄 冲锋 挑枪 梨花枪 / 地 投枪 回马枪 枪林 / 天 百鸟朝凤 七进七出 龙吟） ----------
  const HTU = (z, dmg, kb, dir) => { rec(dmg * DM()); const f0 = freeze; hit(z, dmg * DM(), kb, dir || hero.f, true, 0, .45, false, false, { secondary: true, survSkill: true }); freeze = Math.min(freeze, Math.max(f0, .05)); };   // 挑飞
  const QC = ['255,233,168', '255,250,225'];
  // 11/12 用户定：七进七出、回马枪由残影出手，主角原地不动。残影 = 半透明主角刺帧，从 (x0,y0) 冲到 (x1,y1)
  const ghost = (x0, y0, x1, y1, a, fr, T) => fx.push({ k: 'ghost', x0, y0, x1, y1, fr, flip: Math.cos(a) < 0, t: 0, T: T || .3, mt: .09 });
  add('lianci', { tier: 1, name: '连刺', icon: '刺', color: '#ffe0a0', desc: '向前连刺三枪', need: 110, beam: true, len: 90, wu: .45, rc: .35,
    cast() { [0, 1, 2].forEach(i => later(i * .13, () => { if (i) S.poseOverride = { f: i % 2 ? SK.lianci.pose2 : SK.lianci.pose[1], t: .12 }; lineHit(aim(), 90, 8, 1.15, 14, QC[0]); sfx('swing_knife', hero.x); })); } });
  add('lansao', { tier: 1, name: '拦扫', icon: '拦', color: '#f0c890', desc: '枪杆横拦，身前 200° 长距扫开', need: 70, range: 62, half: 1.75, wu: .6, rc: .35,
    cast() { sweep(aim(), 1.75, 62, 1.9, 70, ['rgba(240,200,140,', 'rgba(255,240,210,']); sfx('swing_knife', hero.x); shake = Math.max(shake, .12); } });
  add('tiaoqiang', { tier: 2, name: '挑枪', icon: '挑', color: '#ffd08a', desc: '刺进去往上一挑，把前面的人挑飞', need: 90, beam: true, len: 80, wu: .55, rc: .4,
    cast() { const a = aim(), L = 80 * RM, ca = Math.cos(a), sa = Math.sin(a); fx.push({ k: 'line', x: hero.x, y: hero.y, a, L, w: 14, t: 0, T: .3, col: '255,208,138' });
      for (const z of hittable()) { const dx = z.x - hero.x, dy = (z.y - hero.y) * 2, al = dx * ca + dy * sa, pe = Math.abs(-dx * sa + dy * ca); if (al > -10 && al < L && pe < 20) HTU(z, 2.3, 30, Math.sign(dx)); }
      sfx('swing_knife', hero.x); shake = Math.max(shake, .14); } });
  add('lihua', { tier: 2, name: '梨花枪', icon: '梨', color: '#ffe8f0', desc: '抖出枪花，身周连点一圈，花瓣四散', need: 70, wu: .5, rc: .4,
    cast() { zones.push({ x: 0, y: 0, follow: 1, r: 54, t: 0, T: .8, tk: 0, dmg: 1.0, kind: 'wheel' }); const a0 = aim();
      for (let i = 0; i < 8; i++) later(.1 + i * .06, () => shot(a0 + i * Math.PI / 4, { dmg: 1, T: .4, col: ['255,215,230', '255,250,252'] })); sfx('swing_knife', hero.x); } });
  add('touqiang', { tier: 3, name: '投枪', icon: '投', color: '#ffd890', desc: '掷出一杆重枪，一路贯穿，落地再炸', need: 220, beam: true, len: 220, wu: .6, rc: .4,
    cast() { const a = aim(); shot(a, { dmg: 3.2, T: .75, vx: Math.cos(a) * 420, vy: Math.sin(a) * 210, col: QC });
      const x = hero.x + Math.cos(a) * 300, y = clampY(hero.y + Math.sin(a) * 150); later(.72, () => blast(x, y, 40, 2, 40, '255,216,144')); sfx('swing_knife', hero.x); shake = Math.max(shake, .12); } });
  add('huimaq', { tier: 3, name: '回马枪', icon: '马', color: '#ffb890', desc: '残影冲出穿过敌群，再回身反刺一枪', need: 140, beam: true, len: 140, wu: .5, rc: .4,
    cast() { const a = aim(), x0 = hero.x, y0 = hero.y, x1 = x0 + Math.cos(a) * 140 * RM, y1 = clampY(y0 + Math.sin(a) * 70 * RM), fr = SK.huimaq.pose[1];
      ghost(x0, y0, x1, y1, a, fr, .3); lineHit(a, 140, 12, 1.2, 20, '200,225,255', x0, y0); sfx('swing_knife', hero.x);
      later(.26, () => { ghost(x1, y1, x1, y1, a + Math.PI, fr, .4); lineHit(a + Math.PI, 150, 14, 3.4, 60, '255,184,144', x1, y1); sfx('crack', x1); shake = Math.max(shake, .2); }); } });
  add('qianglin', { tier: 3, name: '枪林', icon: '林', color: '#e8d0a0', desc: '身周地里一圈圈刺出枪尖', need: 90, wu: .7, rc: .45,
    cast() { [50, 90].forEach((r, j) => { for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + j * Math.PI / 8, x = hero.x + Math.cos(a) * r, y = hero.y + Math.sin(a) * r * .5;
      fx.push({ k: 'mark', x, y, r: 16, t: 0, T: .2 + j * .18 }); later(.2 + j * .18, () => blast(x, y, 20, 1.4, 30, '232,208,160')); } }); sfx('crack', hero.x); shake = Math.max(shake, .15); } });
  add('bainiao', { tier: 4, name: '百鸟朝凤', icon: '凤', color: '#ffd060', desc: '枪如雨点，身前扇面连出十八枪', need: 170, beam: true, len: 170, wu: .7, rc: .45,
    cast() { const a0 = aim(); for (let i = 0; i < 18; i++) later(i * .035, () => { const a = a0 + R(-.55, .55); shot(a, { dmg: 1.15, T: .55, vx: Math.cos(a) * 340, vy: Math.sin(a) * 170, col: ['255,208,96', '255,248,220'] }); }); sfx('swing_knife', hero.x); shake = Math.max(shake, .15); } });
  add('qijin', { tier: 4, name: '七进七出', icon: '七', color: '#fff0c0', desc: '分出残影连冲七次，每次扎向最近的敌人', need: 160, beam: true, len: 120, wu: .6, rc: .5,
    cast() { const g = { x: hero.x, y: hero.y }, fr = SK.qijin.pose[1];
      for (let i = 0; i < 7; i++) later(i * .15, () => { let t = null, bd = 170; for (const z of hittable()) { const d = Math.hypot(z.x - g.x, (z.y - g.y) * 2); if (d < bd) { bd = d; t = z; } }
        const a = t ? Math.atan2((t.y - g.y) * 2, t.x - g.x) : aim() + R(-1, 1), L = t ? Math.min(150, bd + 24) : 70, nx = g.x + Math.cos(a) * (L - 18), ny = clampY(g.y + Math.sin(a) * (L - 18) * .5);
        ghost(g.x, g.y, nx, ny, a, fr, i === 6 ? .45 : .22); lineHit(a, L, 14, 1.6, 40, '255,240,192', g.x, g.y); g.x = nx; g.y = ny; sfx('swing_knife', g.x); }); shake = Math.max(shake, .2); } });
  add('longyin', { tier: 4, name: '龙吟', icon: '龙', color: '#a8e0ff', desc: '一枪砸地，枪劲化龙沿地面一路轰出', need: 200, beam: true, len: 220, wu: .8, rc: .5,
    cast() { const a = aim(); lineHit(a, 220, 24, 3.2, 70, '168,224,255'); for (let i = 1; i <= 5; i++) { const x = hero.x + Math.cos(a) * i * 44, y = clampY(hero.y + Math.sin(a) * i * 22); later(i * .08, () => blast(x, y, 30, 1.6, 40, '168,224,255')); }
      sfx('crack', hero.x); shake = Math.max(shake, .4); } });
  // ---------- 石子 12 招 + 黄符 12 招（11/13 用户定，按黄玄地天由弱到强） ----------
  const shotAt = (x, y, a, o) => bolts.push(Object.assign({ x, y, vx: Math.cos(a) * 270, vy: Math.sin(a) * 135, a, t: 0, T: .6, hitSet: [], dmg: 1.2, col: ['200,200,195', '245,245,240'] }, o));
  const STN = ['190,186,176', '240,236,226'], FUC = ['255,214,90', '255,248,200'];
  const stunz = (z, t) => { z.stun = Math.max(z.stun || 0, t); };
  function chain(n, range, dmg, col, gap) {   // 在敌人之间连跳 n 次（掌心雷等）
    let x = hero.x, y = hero.y; const hitd = [];
    for (let i = 0; i < n; i++) later(i * (gap || .09), () => {
      let t = null, bd = range; for (const z of hittable()) { if (hitd.includes(z)) continue; const d = Math.hypot(z.x - x, (z.y - y) * 2); if (d < bd) { bd = d; t = z; } }
      if (!t) return; hitd.push(t); const a = Math.atan2((t.y - y) * 2, t.x - x);
      lineHit(a, Math.max(10, bd / RM), 8, dmg, 20, col, x, y); x = t.x; y = t.y; sfx('swing_knife', x); });
  }
  // 黄符
  add('huofu', { tier: 1, name: '火符', icon: '符', color: '#ffb35a', desc: '甩出一张火符，打中就炸开起火', need: 190, wu: .45, rc: .3,
    cast() { const t = nearest(200), a = aim(), x = t ? t.x : hero.x + Math.cos(a) * 150, y = t ? t.y : hero.y + Math.sin(a) * 75;
      shot(a, { dmg: .8, T: .3, vx: Math.cos(a) * 420, vy: Math.sin(a) * 210, col: FUC });
      later(.28, () => { blast(x, y, 34, 2.0, 24, '255,150,60'); zones.push({ x, y, r: 28, t: 0, T: 2, tk: 0, dmg: .45, kind: 'fire' }); sfx('crack', x); }); } });
  add('feifu', { tier: 1, name: '飞符', icon: '飞', color: '#ffe07a', desc: '扇形甩出三张会追人的符', need: 220, wu: .45, rc: .3,
    cast() { const a0 = aim(); [-.6, 0, .6].forEach(d => shot(a0 + d, { dmg: 1.8, T: 1.4, home: 1, vx: Math.cos(a0 + d) * 200, vy: Math.sin(a0 + d) * 100, col: FUC })); sfx('swing_knife', hero.x); } });
  add('dingshen', { tier: 2, name: '定身符', icon: '定', color: '#ffd24a', desc: '前方锥形范围内的敌人定住两秒', need: 130, range: 130, half: .6, wu: .5, rc: .35,
    cast() { const a = aim(); fx.push({ k: 'arc', x: hero.x, y: hero.y, a0: a, half: .6, r: 130 * RM, t: 0, T: .4, color: ['rgba(255,214,90,', 'rgba(255,250,210,'] });
      for (const z of hittable()) { const dx = z.x - hero.x, dy = (z.y - hero.y) * 2, d = Math.hypot(dx, dy); let da = Math.abs(Math.atan2(dy, dx) - a); if (da > Math.PI) da = Math.PI * 2 - da; if (d < 130 * RM && da < .6) { HT(z, .8, 0); stunz(z, 2); } } sfx('crack', hero.x); } });
  add('zhangxin', { tier: 2, name: '掌心雷', icon: '掌', color: '#dfe6ff', desc: '闪电在敌人之间连锁跳八次', need: 180, wu: .5, rc: .35,
    cast() { chain(8, 160, 1.5, '220,230,255', .06); shake = Math.max(shake, .12); } });
  add('wulei', { tier: 2, name: '五雷符', icon: '五', color: '#ffe68a', desc: '五张符绕身飞转，碰到敌人就炸雷', need: 70, wu: .5, rc: .35,
    cast() { zones.push({ x: 0, y: 0, follow: 1, r: 58, t: 0, T: 4, tk: 0, dmg: 1.2, kind: 'orbit', col: '255,220,100', n: 5, zap: 1 }); sfx('swing_knife', hero.x); } });
  add('sadou', { tier: 3, name: '撒豆成兵', icon: '豆', color: '#f2c94c', desc: '撒出豆子化作四个金甲小兵，冲向敌人撞上就爆', need: 230, wu: .55, rc: .4,
    cast() { for (let i = 0; i < 4; i++) { const a = aim() + R(-1.2, 1.2); shot(a, { dmg: 2.6, T: 2.2, home: 1, big: 1, vx: Math.cos(a) * 150, vy: Math.sin(a) * 75, col: ['242,201,76', '255,244,200'] }); } sfx('swing_knife', hero.x); } });
  add('tianlei', { tier: 3, name: '天雷阵', icon: '阵', color: '#cfd8ff', desc: '地上画一圈雷阵，三秒内阵里不停落雷', need: 200, none: true, wu: .6, rc: .4,
    cast() { const [[x, y]] = pts(1, 200); zones.push({ x, y, r: 80, t: 0, T: 3, tk: 0, dmg: 1.6, kind: 'thunder' }); sfx('crack', x); } });
  add('fuhuo', { tier: 3, name: '符火燎原', icon: '燎', color: '#ff8a3c', desc: '一排火符落地，烧成一道火墙', need: 200, beam: true, len: 200, wu: .55, rc: .4,
    cast() { const a = aim(); for (let i = 1; i <= 5; i++) { const x = hero.x + Math.cos(a) * i * 40, y = clampY(hero.y + Math.sin(a) * i * 20); later(i * .06, () => zones.push({ x, y, r: 28, t: 0, T: 3, tk: 0, dmg: .6, kind: 'fire' })); } sfx('crack', hero.x); } });
  add('jiutian', { tier: 4, name: '九天雷罚', icon: '罚', color: '#e6ecff', desc: '全屏随机落下十道大雷', need: 300, none: true, wu: .7, rc: .45,
    cast() { pts(10, 300).forEach(([x, y], i) => { fx.push({ k: 'mark', x, y, r: 40, t: 0, T: .35 + i * .08 }); later(.35 + i * .08, () => { fx.push({ k: 'bolt', x, y, t: 0, T: .35 }); blast(x, y, 40, 3.0, 40, '220,230,255'); sfx('crack', x); }); }); shake = Math.max(shake, .35); } });
  add('huangtian', { tier: 4, name: '黄天当立', icon: '黄', color: '#ffd700', desc: '全屏黄光，所有敌人受伤并定住一秒半', need: 260, none: true, wu: .8, rc: .5,
    cast() { fx.push({ k: 'ring', x: hero.x, y: hero.y, t: 0, T: .6, r: 320 }); for (const z of hittable()) if (dist(z, hero) < 330) { HT(z, 2.5, 20); stunz(z, 1.5); } sfx('crack', hero.x); shake = Math.max(shake, .4); } });
  add('taiping', { tier: 4, name: '太平要术', icon: '太', color: '#fff0a0', desc: '身周展开旋转符阵五秒，阵里不停落雷', need: 90, wu: .7, rc: .5,
    cast() { zones.push({ x: 0, y: 0, follow: 1, r: 95, t: 0, T: 5, tk: 0, dmg: 1.5, kind: 'thunder' }); sfx('crack', hero.x); } });
  SK.pili.tier = 1;
  SK.qiang.tier = 1; SK.chong.tier = 2;
  SK.daobo.tier = 1; SK.huima.tier = 2; SK.daolun.tier = 2; SK.xuanfeng.tier = 2; SK.dilie.tier = 3; SK.shuanghuan.tier = 3; SK.xuehe.tier = 4; SK.tianbeng.tier = 4; SK.wanren.tier = 4;   /* 11/12 刀 13 招按黄玄地天重排 */
  // ================= 11/13 全部重做：10 种兵器 × 12 招（参考三国群英传按兵器分系的必杀、三国志的兵种战法） =================
  // 状态：击退 / 定身(stun) / 混乱(conf：乱走、误伤旁人) / 溃散(rout：掉头逃) / 减速(survSlow) / 起火(fire 区)
  const ZN = o => zones.push(Object.assign({ x: 0, y: 0, t: 0, tk: 0, dmg: 0 }, o));
  const tough = z => z.T && (z.T.boss || z.T.chapterBoss || z.T.elite);
  const conf = (z, t) => { if (tough(z)) { stunz(z, t * .3); return; } if (!(z.conf > 0)) floaters.push({ x: z.x, y: z.y - 64, t: 0, txt: '乱', color: '#d79bff' }); z.conf = Math.max(z.conf || 0, t); };
  const rout = (z, t) => { if (tough(z)) { stunz(z, t * .3); return; } if (!(z.rout > 0)) floaters.push({ x: z.x, y: z.y - 64, t: 0, txt: '逃', color: '#ffd27a' }); z.rout = Math.max(z.rout || 0, t); };
  const cone = (a, r, half) => hittable().filter(z => { const dx = z.x - hero.x, dy = (z.y - hero.y) * 2, d = Math.hypot(dx, dy); let da = Math.abs(Math.atan2(dy, dx) - a); if (da > Math.PI) da = Math.PI * 2 - da; return d < r * RM && (d < 14 || da < half); });
  const fan = (a0, n, spread, o) => { for (let i = 0; i < n; i++) { const a = a0 - spread / 2 + (n > 1 ? spread * i / (n - 1) : spread / 2); shot(a, Object.assign({ vx: Math.cos(a) * (o.sp || 300), vy: Math.sin(a) * (o.sp || 300) / 2 }, o)); } };
  const ring = (n, o, x, y) => { for (let i = 0; i < n; i++) { const a = i * Math.PI * 2 / n + (o.off || 0); (x != null ? shotAt(x, y, a, Object.assign({ vx: Math.cos(a) * (o.sp || 270), vy: Math.sin(a) * (o.sp || 270) / 2 }, o)) : shot(a, Object.assign({ vx: Math.cos(a) * (o.sp || 270), vy: Math.sin(a) * (o.sp || 270) / 2 }, o))); } };
  const front = (d) => { const a = aim(); return [hero.x + Math.cos(a) * d, clampY(hero.y + Math.sin(a) * d * .5), a]; };
  const drop = (x, y, what, T, cb) => { fx.push({ k: 'drop', x, y, what, t: 0, T }); later(T, cb); };
  const SW = 'swing_knife', CR = 'crack';
  const ARW = { shape: 'arrow', col: ['220,200,160', '255,250,230'] }, FEA = { shape: 'feather', col: ['255,140,60', '255,230,160'] }, SWD = { shape: 'sword', col: ['200,230,255', '255,255,255'] }, FLY = { shape: 'firefly', col: ['200,255,140', '255,255,220'] };
  const C = { dao: ['rgba(255,170,90,', 'rgba(255,230,160,'], chui: ['rgba(220,170,110,', 'rgba(255,230,190,'], qiang: ['rgba(255,233,168,', 'rgba(255,250,225,'], gd: ['rgba(120,220,170,', 'rgba(220,255,235,'], jian: ['rgba(170,215,255,', 'rgba(240,250,255,'], quan: ['rgba(255,190,140,', 'rgba(255,240,220,'], fan: ['rgba(190,240,230,', 'rgba(250,255,250,'] };
  const def = (k, w, tier, mot, o) => { add(k, Object.assign({ tier, wu: .5, rc: .35 }, o)); WOFX[k] = w; MOTX[k] = mot; };
  const WOFX = {}, MOTX = {};

  // ---------- 刀（0）：轻快连斩、月牙刀气 ----------
  def('tuodao', 0, 1, 'sweep', { name: '拖刀', icon: '拖', color: '#ffb46a', desc: '先退半步，再回身一刀重斩', need: 70, range: 52, half: 1.3,
    cast() { const a = aim(); hero.x -= Math.cos(a) * 14; later(.14, () => { sweep(a, 1.3, 54, 3.0, 55, C.dao); sfx(SW, hero.x); shake = Math.max(shake, .14); }); } });
  def('tiaozhan', 0, 1, 'up', { name: '挑斩', icon: '挑', color: '#ffd08a', desc: '往上一挑，把身前的人挑飞', need: 60, range: 46, half: 1.0,
    cast() { const a = aim(); fx.push({ k: 'arc', x: hero.x, y: hero.y, a0: a, half: 1.0, r: 46 * RM, t: 0, T: .26, color: C.dao }); for (const z of cone(a, 46, 1.0)) HTU(z, 2.2, 20, Math.sign(z.x - hero.x)); sfx(SW, hero.x); } });
  def('hongji', 0, 3, 'chop', { name: '轰击', icon: '轰', color: '#ffa860', desc: '一刀劈地，冲击波一路往前推', need: 180, beam: true, len: 180,
    cast() { const a = aim(); for (let i = 1; i <= 5; i++) { const x = hero.x + Math.cos(a) * i * 34, y = clampY(hero.y + Math.sin(a) * i * 17); later(i * .06, () => blast(x, y, 30 + i * 3, 1.5, 40, '255,180,110')); } sfx(CR, hero.x); shake = Math.max(shake, .25); } });
  def('shuangyue', 0, 3, 'sweep', { name: '双月斩', icon: '双', color: '#c8f0ff', desc: '两道月牙交叉飞出，一路穿透', need: 180, beam: true, len: 180,
    cast() { const a = aim(); [-.35, .35].forEach(d => { const b = a + d; bolts.push({ x: hero.x, y: hero.y, vx: Math.cos(b) * 300, vy: Math.sin(b) * 150, a: b, t: 0, T: .9, hitSet: [], dmg: 2.4 }); }); sfx(SW, hero.x); } });
  def('luanwu', 0, 4, 'spin', { name: '乱舞', icon: '舞', color: '#ff8a6a', desc: '原地乱斩三秒，身边的人连连挨刀', need: 70,
    cast() { for (let i = 0; i < 15; i++) later(i * .2, () => { S.poseOverride = { f: i % 2 ? SK.luanwu.pose[1] : SK.luanwu.pose2, t: .18 }; sweep(Math.random() * 7, 1.6, 62, 1.0, 25, C.dao, { rev: i % 2 }); if (i % 3 === 0) sfx(SW, hero.x); }); } });

  // ---------- 枪（3）：突、刺、穿 ----------
  def('luoxuan', 3, 2, 'thrust', { name: '螺旋突', icon: '螺', color: '#ffe0a0', desc: '旋转刺出，刺中的人陷入混乱', need: 120, beam: true, len: 120,
    cast() { const a = aim(); lineHit(a, 120, 14, 2.4, 20, '255,224,160'); for (const z of hittable()) { const dx = z.x - hero.x, dy = (z.y - hero.y) * 2, al = dx * Math.cos(a) + dy * Math.sin(a), pe = Math.abs(-dx * Math.sin(a) + dy * Math.cos(a)); if (al > -10 && al < 120 * RM && pe < 20) conf(z, 2.5); } sfx(SW, hero.x); } });
  def('erduan', 3, 2, 'thrust', { name: '二段突', icon: '二', color: '#ffd890', desc: '连刺两段，穿透两排人，各击退一次', need: 150, beam: true, len: 150,
    cast() { const a = aim(); lineHit(a, 90, 12, 1.8, 80, '255,216,144'); later(.16, () => { S.poseOverride = { f: SK.erduan.pose[1], t: .15 }; lineHit(a, 160, 12, 2.0, 90, '255,240,200'); sfx(SW, hero.x); }); sfx(SW, hero.x); } });
  def('qianhou', 3, 3, 'thrust', { name: '前后突', icon: '前', color: '#ffe8b0', desc: '枪劲同时刺向身前和身后两条线', need: 140, beam: true, len: 150,
    cast() { const a = aim(); lineHit(a, 160, 16, 3.0, 60, '255,232,176'); lineHit(a + Math.PI, 160, 16, 3.0, 60, '255,232,176'); sfx(SW, hero.x); shake = Math.max(shake, .15); } });
  def('sifang', 3, 4, 'spin', { name: '四方突', icon: '四', color: '#fff0c0', desc: '分出四道残影，同时刺向四方', need: 110,
    cast() { const fr = SK.sifang.pose[1]; for (let i = 0; i < 4; i++) { const a = aim() + i * Math.PI / 2, x1 = hero.x + Math.cos(a) * 150, y1 = clampY(hero.y + Math.sin(a) * 75); ghost(hero.x, hero.y, x1, y1, a, fr, .35); lineHit(a, 170, 18, 3.6, 60, '255,240,192'); } sfx(CR, hero.x); shake = Math.max(shake, .3); } });

  // ---------- 关刀（4）：长、宽、勾、横 ----------
  def('hengti', 4, 1, 'sweep', { name: '横薙', icon: '薙', color: '#9be0c0', desc: '长柄横扫，身前一大排都挨刀', need: 80, range: 80, half: 1.2, wu: .6,
    cast() { sweep(aim(), 1.2, 80, 2.2, 50, C.gd); sfx(SW, hero.x); shake = Math.max(shake, .12); } });
  def('pidao', 4, 1, 'chop', { name: '劈刀', icon: '劈', color: '#8fd8b0', desc: '一刀竖劈，前方一长条', need: 120, beam: true, len: 120,
    cast() { lineHit(aim(), 120, 20, 2.6, 40, '150,230,190'); sfx(CR, hero.x); shake = Math.max(shake, .12); } });
  def('xiongshou', 4, 1, 'up', { name: '熊手', icon: '勾', color: '#a8e8c8', desc: '刀背一勾，把前面的人拉到身前再斩', need: 130, beam: true, len: 130,
    cast() { const a = aim(); fx.push({ k: 'line', x: hero.x, y: hero.y, a, L: 130 * RM, w: 10, t: 0, T: .3, col: '160,230,200' });
      const zz = hittable().filter(z => { const dx = z.x - hero.x, dy = (z.y - hero.y) * 2, al = dx * Math.cos(a) + dy * Math.sin(a), pe = Math.abs(-dx * Math.sin(a) + dy * Math.cos(a)); return al > 20 && al < 130 * RM && pe < 24; });
      for (const z of zz) { z.x = hero.x + Math.cos(a) * 30; z.y = clampY(hero.y + Math.sin(a) * 15); HT(z, 1.2, 0); } later(.15, () => sweep(a, 1.0, 50, 2.0, 40, C.gd)); sfx(SW, hero.x); } });
  def('xuanfengd', 4, 2, 'spin', { name: '旋风', icon: '旋', color: '#80d8b0', desc: '长刀周身大旋两圈，被围时用', need: 70, wu: .6,
    cast() { [0, 1].forEach(i => later(i * .25, () => { sweep(i * 3, Math.PI, 78, 1.8, 60, C.gd, { rev: i }); sfx(SW, hero.x); })); } });
  def('daoqi', 4, 2, 'thrust', { name: '刀气', icon: '气', color: '#b0f0d0', desc: '直线飞出一道巨大刀气，一路贯穿', need: 220, beam: true, len: 220,
    cast() { const a = aim(); bolts.push({ x: hero.x, y: hero.y, vx: Math.cos(a) * 340, vy: Math.sin(a) * 170, a, t: 0, T: .8, hitSet: [], dmg: 3.0, col: ['120,220,170', '230,255,240'], big2: 1 }); sfx(SW, hero.x); } });
  def('handi', 4, 2, 'chop', { name: '撼地', icon: '撼', color: '#70c8a0', desc: '砸地，震波往前一路推开', need: 160, beam: true, len: 160,
    cast() { const a = aim(); for (let i = 1; i <= 4; i++) { const x = hero.x + Math.cos(a) * i * 40, y = clampY(hero.y + Math.sin(a) * i * 20); later(i * .08, () => blast(x, y, 34, 1.4, 70, '140,220,180')); } sfx(CR, hero.x); shake = Math.max(shake, .2); } });
  def('yanyue', 4, 3, 'sweep', { name: '偃月斩', icon: '偃', color: '#a0f0d0', desc: '月牙刀气往前推，越推越大', need: 220, beam: true, len: 220,
    cast() { const a = aim(); for (let i = 1; i <= 6; i++) later(i * .07, () => { const x = hero.x + Math.cos(a) * i * 36, y = clampY(hero.y + Math.sin(a) * i * 18); fx.push({ k: 'arc', x, y, a0: a, half: .9, r: (20 + i * 8) * RM, t: 0, T: .25, color: C.gd }); for (const z of near(x, y, (20 + i * 8) * RM)) if (!(z.yyT > W.t)) { z.yyT = W.t + .5; HT(z, 1.6, 40); } }); sfx(SW, hero.x); } });
  def('tuodaoji', 4, 3, 'up', { name: '拖刀计', icon: '计', color: '#c0ffe0', desc: '佯退一步，回身向上反撩一刀，伤害极高', need: 90, range: 70, half: 1.0,
    cast() { const a = aim(); hero.x -= Math.cos(a) * 20; later(.2, () => { S.poseOverride = { f: SK.tuodaoji.pose[1], t: .25 }; fx.push({ k: 'arc', x: hero.x, y: hero.y, a0: a, half: 1.0, r: 80 * RM, t: 0, T: .3, color: C.gd }); for (const z of cone(a, 80, 1.0)) HTU(z, 4.5, 30, Math.sign(z.x - hero.x)); sfx(CR, hero.x); shake = Math.max(shake, .25); }); } });
  def('zhanjiang', 4, 3, 'chop', { name: '斩将', icon: '斩', color: '#e0fff0', desc: '对准最近的敌将一刀重斩（优先首领）', need: 200,
    cast() { const zz = hittable().filter(z => dist(z, hero) < 200 * RM); const t = zz.sort((p, q) => (tough(q) ? 1 : 0) - (tough(p) ? 1 : 0) || dist(p, hero) - dist(q, hero))[0]; if (!t) return;
      fx.push({ k: 'bolt', x: t.x, y: t.y, t: 0, T: .3 }); blast(t.x, t.y, 30, 5.5, 60, '200,255,230'); sfx(CR, t.x); shake = Math.max(shake, .3); } });
  def('guowu', 4, 4, 'thrust', { name: '过五关', icon: '关', color: '#d0ffe8', desc: '分出残影，一路连斩五个不同的敌人', need: 200,
    cast() { const g = { x: hero.x, y: hero.y }, hit = [], fr = SK.guowu.pose[1]; for (let i = 0; i < 5; i++) later(i * .18, () => { let t = null, bd = 260; for (const z of hittable()) { if (hit.includes(z)) continue; const d = Math.hypot(z.x - g.x, (z.y - g.y) * 2); if (d < bd) { bd = d; t = z; } } if (!t) return; hit.push(t);
      const a = Math.atan2((t.y - g.y) * 2, t.x - g.x); ghost(g.x, g.y, t.x, t.y, a, fr, .3); lineHit(a, bd / RM + 20, 14, 2.4, 40, '200,255,230', g.x, g.y); blast(t.x, t.y, 40, 1.6, 30, '160,240,200'); g.x = t.x; g.y = t.y; sfx(SW, g.x); }); } });
  def('shuiyan', 4, 4, 'sweep', { name: '水淹七军', icon: '水', color: '#80c0ff', desc: '一刀劈出大浪往前推，把敌人卷着走', need: 260, beam: true, len: 260,
    cast() { const a = aim(); ZN({ x: hero.x + Math.cos(a) * 30, y: hero.y + Math.sin(a) * 15, vx: Math.cos(a) * 200, vy: Math.sin(a) * 100, r: 60, T: 1.4, dmg: 1.4, kind: 'wave', push: 1 }); sfx(CR, hero.x); shake = Math.max(shake, .3); } });
  def('qinglong', 4, 4, 'up', { name: '青龙偃月', icon: '龙', color: '#60e0a0', desc: '青龙刀气从地面腾起，绕全场盘旋一圈', need: 120,
    cast() { const N = 22; for (let i = 0; i < N; i++) later(i * .07, () => { const q = i / N, r = 60 + q * 180, a = aim() + q * Math.PI * 2.2, x = hero.x + Math.cos(a) * r, y = clampY(hero.y + Math.sin(a) * r * .5); blast(x, y, 34, 1.4, 30, '110,230,160'); }); sfx(CR, hero.x); shake = Math.max(shake, .3); } });

  // ---------- 石子（7）补：炬石 ----------
  def('jushi', 7, 4, 'up', { name: '炬石', icon: '炬', color: '#ff8a40', desc: '三块燃烧巨石砸下，留下一片火地', need: 280, none: true,
    cast() { pts(3, 260).forEach(([x, y], i) => { fx.push({ k: 'mark', x, y, r: 56, t: 0, T: .55 + i * .2 }); drop(x, y, 'rock', .55 + i * .2, () => { blast(x, y, 60, 3.4, 50, '255,140,60'); ZN({ x, y, r: 50, T: 3, dmg: .55, kind: 'fire' }); sfx(CR, x); shake = Math.max(shake, .35); }); }); } });

  // ---------- 黄符（8）补：妖术 ----------
  def('yaoshu', 8, 3, 'sweep', { name: '妖术', icon: '妖', color: '#d08aff', desc: '妖风扇面，里面的人陷入混乱、互相误伤', need: 160, range: 160, half: .7,
    cast() { const a = aim(); fx.push({ k: 'arc', x: hero.x, y: hero.y, a0: a, half: .7, r: 160 * RM, t: 0, T: .45, color: ['rgba(200,120,255,', 'rgba(240,210,255,'] }); for (const z of cone(a, 160, .7)) { HT(z, 1.0, 0); conf(z, 4); } sfx(CR, hero.x); } });

  // ---------- 羽扇（9）：风、火、迷、阵 ----------
  def('shanfeng', 9, 1, 'sweep', { name: '扇风', icon: '风', color: '#c8f0e8', desc: '扇出一道风墙往前推，把人推开', need: 120, beam: true, len: 120,
    cast() { const a = aim(); ZN({ x: hero.x, y: hero.y, vx: Math.cos(a) * 240, vy: Math.sin(a) * 120, r: 46, T: .7, dmg: .9, kind: 'wave', push: 1, col: '200,240,230' }); sfx(SW, hero.x); } });
  def('liuying', 9, 1, 'thrust', { name: '流萤', icon: '萤', color: '#d0ff90', desc: '五点萤火自己去找人', need: 240,
    cast() { const a0 = aim(); for (let i = 0; i < 5; i++) { const a = a0 + R(-1.5, 1.5); shot(a, Object.assign({ dmg: 1.4, T: 2, home: 1, vx: Math.cos(a) * 160, vy: Math.sin(a) * 80 }, FLY)); } sfx(SW, hero.x); } });
  def('longjuan', 9, 2, 'spin', { name: '龙卷', icon: '卷', color: '#b0e8ff', desc: '放出一股往前走的龙卷风，把人卷进去', need: 200, beam: true, len: 200,
    cast() { const a = aim(); ZN({ x: hero.x + Math.cos(a) * 30, y: hero.y + Math.sin(a) * 15, vx: Math.cos(a) * 80, vy: Math.sin(a) * 40, r: 52, T: 2.8, dmg: .8, kind: 'wind', pull: 2.5 }); sfx(SW, hero.x); } });
  def('mihun', 9, 2, 'sweep', { name: '迷魂', icon: '迷', color: '#e0b0ff', desc: '扇面迷香，里面的人陷入混乱', need: 140, range: 140, half: .8,
    cast() { const a = aim(); fx.push({ k: 'arc', x: hero.x, y: hero.y, a0: a, half: .8, r: 140 * RM, t: 0, T: .45, color: ['rgba(220,170,255,', 'rgba(250,235,255,'] }); for (const z of cone(a, 140, .8)) { HT(z, .6, 0); conf(z, 3); } sfx(SW, hero.x); } });
  def('shuangxue', 9, 2, 'sweep', { name: '霜雪', icon: '霜', color: '#d8f0ff', desc: '扇出寒气，扇面里的人冻得走不动', need: 150, range: 150, half: .8,
    cast() { const a = aim(), [x, y] = front(70); fx.push({ k: 'arc', x: hero.x, y: hero.y, a0: a, half: .8, r: 150 * RM, t: 0, T: .45, color: ['rgba(200,235,255,', 'rgba(255,255,255,'] }); for (const z of cone(a, 150, .8)) HT(z, 1.2, 10); ZN({ x, y, r: 70, T: 3, dmg: .3, kind: 'frost' }); sfx(SW, hero.x); } });
  def('lianying', 9, 3, 'sweep', { name: '火烧连营', icon: '营', color: '#ff7a3c', desc: '一排火墙往前推进', need: 220, beam: true, len: 220,
    cast() { const a = aim(), p = a + Math.PI / 2; for (let j = -2; j <= 2; j++) ZN({ x: hero.x + Math.cos(p) * j * 30 + Math.cos(a) * 30, y: hero.y + Math.sin(p) * j * 15 + Math.sin(a) * 15, vx: Math.cos(a) * 110, vy: Math.sin(a) * 55, r: 26, T: 2.2, dmg: .7, kind: 'fire' }); sfx(CR, hero.x); } });
  def('bazhen', 9, 3, 'spin', { name: '八阵图', icon: '阵', color: '#f0e0a0', desc: '身周八个阵点轮流爆开', need: 100,
    cast() { for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, x = hero.x + Math.cos(a) * 80, y = hero.y + Math.sin(a) * 40; fx.push({ k: 'mark', x, y, r: 26, t: 0, T: .2 + i * .1 }); later(.2 + i * .1, () => blast(x, y, 32, 1.8, 40, '240,224,160')); } sfx(CR, hero.x); } });
  def('huoyu', 9, 3, 'thrust', { name: '火羽', icon: '羽', color: '#ff9050', desc: '扇出一排火羽追击，打中就起火', need: 220,
    cast() { fan(aim(), 7, 1.0, Object.assign({ dmg: 1.4, T: 1.3, home: 1, sp: 230, onHit: z => ZN({ x: z.x, y: z.y, r: 20, T: 1.5, dmg: .35, kind: 'fire' }) }, FEA)); sfx(SW, hero.x); } });
  def('dongfeng', 9, 4, 'up', { name: '借东风', icon: '东', color: '#a0f0ff', desc: '全场大风四秒：火更大、伤害翻倍，敌人被吹退', need: 200, none: true,
    cast() { S.windT = 4; S.windA = hero.f > 0 ? 0 : Math.PI; for (const zn of zones) if (zn.kind === 'fire') { zn.r *= 1.6; zn.dmg *= 2; zn.T += 2; } for (let i = 0; i < 4; i++) { const [[x, y]] = pts(1, 220); ZN({ x, y, r: 34, T: 4, dmg: .6, kind: 'fire' }); } sfx(SW, hero.x); shake = Math.max(shake, .2); } });
  def('chibi', 9, 4, 'sweep', { name: '火烧赤壁', icon: '赤', color: '#ff5030', desc: '巨大火浪横扫全屏，留下大片火地', need: 260, none: true,
    cast() { const a = aim(); ZN({ x: hero.x, y: hero.y, vx: Math.cos(a) * 260, vy: Math.sin(a) * 130, r: 90, T: 1.4, dmg: 1.6, kind: 'wave', col: '255,110,50', trailFire: 1 }); sfx(CR, hero.x); shake = Math.max(shake, .35); } });
  def('qimen', 9, 4, 'spin', { name: '奇门遁甲', icon: '奇', color: '#fff0b0', desc: '身周展开旋转八卦阵五秒，把人吸进来持续伤害', need: 110,
    cast() { ZN({ follow: 1, r: 110, T: 5, dmg: 1.0, kind: 'bagua', pull: 1.2 }); sfx(CR, hero.x); } });

  // ---------- 剑（1）：快刺、飞剑、剑气 ----------
  def('jlianci', 1, 1, 'thrust', { name: '连刺', icon: '刺', color: '#c0e0ff', desc: '三连快刺', need: 90, beam: true, len: 90, wu: .4,
    cast() { [0, 1, 2].forEach(i => later(i * .1, () => { if (i) S.poseOverride = { f: i % 2 ? SK.jlianci.pose2 : SK.jlianci.pose[1], t: .1 }; lineHit(aim(), 90, 8, 1.1, 12, '200,230,255'); sfx(SW, hero.x); })); } });
  def('zhantie', 1, 1, 'chop', { name: '斩铁', icon: '铁', color: '#e0f0ff', desc: '一剑重斩，伤害很高', need: 60, range: 50, half: .9, wu: .6,
    cast() { sweep(aim(), .9, 54, 3.4, 40, C.jian); sfx(CR, hero.x); shake = Math.max(shake, .15); } });
  def('jianqi', 1, 1, 'thrust', { name: '剑气', icon: '气', color: '#b0d8ff', desc: '直线飞出一道剑气，一路穿透', need: 200, beam: true, len: 200,
    cast() { const a = aim(); shot(a, Object.assign({ dmg: 2.2, T: .7, vx: Math.cos(a) * 380, vy: Math.sin(a) * 190 }, SWD)); sfx(SW, hero.x); } });
  def('liefeng', 1, 2, 'sweep', { name: '烈风', icon: '烈', color: '#d0f0ff', desc: '剑风扇面，把人一路吹开', need: 120, range: 120, half: 1.0,
    cast() { const a = aim(); fx.push({ k: 'arc', x: hero.x, y: hero.y, a0: a, half: 1.0, r: 120 * RM, t: 0, T: .35, color: C.jian }); for (const z of cone(a, 120, 1.0)) HT(z, 1.8, 120); sfx(SW, hero.x); } });
  def('feijian', 1, 2, 'thrust', { name: '飞剑', icon: '飞', color: '#a0d0ff', desc: '放出一柄飞剑，自己追着敌人连砍', need: 240,
    cast() { const a = aim(); shot(a, Object.assign({ dmg: 1.6, T: 2.2, home: 1, multi: 3, vx: Math.cos(a) * 240, vy: Math.sin(a) * 120 }, SWD)); sfx(SW, hero.x); } });
  def('jianzhen', 1, 3, 'up', { name: '剑阵', icon: '阵', color: '#c8e8ff', desc: '地上插下六把剑围成一圈，三秒后一齐爆发', need: 160, none: true,
    cast() { const [[x, y]] = pts(1, 160); ZN({ x, y, r: 70, T: 2, dmg: .5, kind: 'swords', slow: 1 }); later(2, () => { blast(x, y, 80, 3.4, 60, '200,230,255'); for (let i = 0; i < 6; i++) { const b = i * Math.PI / 3; shotAt(x + Math.cos(b) * 60, y + Math.sin(b) * 30, b, Object.assign({ dmg: 1.2, T: .4 }, SWD)); } sfx(CR, x); shake = Math.max(shake, .25); }); } });
  def('xinjian', 1, 3, 'thrust', { name: '心剑', icon: '心', color: '#ffb0c0', desc: '两把飞剑自己找人砍，消失时炸出旋转火石', need: 240,
    cast() { [-1, 1].forEach(s => { const a = aim() + s * .8; shot(a, Object.assign({ dmg: 1.6, T: 2.6, home: 1, multi: 4, vx: Math.cos(a) * 230, vy: Math.sin(a) * 115, onEnd: b => ring(6, { dmg: 1.0, T: .45, shape: 'ember', col: ['255,150,60', '255,230,150'] }, b.x, b.y) }, SWD, { col: ['255,170,190', '255,240,245'] })); }); sfx(SW, hero.x); } });
  def('jinghong', 1, 3, 'thrust', { name: '惊虹', icon: '虹', color: '#ffffff', desc: '剑气凝成一点，直线贯穿全屏', need: 340, beam: true, len: 340, wu: .7,
    cast() { const a = aim(); lineHit(a, 380, 14, 5.0, 40, '255,255,255'); sfx(CR, hero.x); shake = Math.max(shake, .25); } });
  def('yujian', 1, 4, 'spin', { name: '御剑', icon: '御', color: '#c0e8ff', desc: '十二柄飞剑环绕五秒，不停射向敌人', need: 220,
    cast() { ZN({ follow: 1, r: 56, T: 5, dmg: .8, kind: 'orbit', col: '220,240,255', n: 6, sword: 1 }); for (let i = 0; i < 12; i++) later(.4 + i * .38, () => { const t = nearest(240); if (!t) return; const a = Math.atan2((t.y - hero.y) * 2, t.x - hero.x); shot(a, Object.assign({ dmg: 1.6, T: .8, vx: Math.cos(a) * 400, vy: Math.sin(a) * 200 }, SWD)); }); sfx(SW, hero.x); } });
  def('tianjian', 1, 4, 'chop', { name: '天剑', icon: '天', color: '#ffffd0', desc: '巨剑从天插入敌阵，引下数道落雷', need: 260, none: true,
    cast() { const [[x, y]] = pts(1, 240); fx.push({ k: 'mark', x, y, r: 80, t: 0, T: .5 }); drop(x, y, 'sword', .5, () => { blast(x, y, 80, 4.2, 70, '255,255,210'); for (let i = 0; i < 5; i++) later(.15 + i * .12, () => { const b = Math.random() * 7, r = Math.random() * 90, px = x + Math.cos(b) * r, py = y + Math.sin(b) * r * .5; fx.push({ k: 'bolt', x: px, y: py, t: 0, T: .3 }); blast(px, py, 26, 1.6, 20, '220,230,255'); }); sfx(CR, x); shake = Math.max(shake, .45); }); } });
  def('jianlun', 1, 4, 'spin', { name: '剑轮', icon: '轮', color: '#e0f0ff', desc: '剑气化成光轮向四周飞散，飞远了再飞回', need: 140,
    cast() { [0, .2].forEach((off, k) => later(k * .25, () => ring(8, Object.assign({ dmg: 1.8, T: 1.1, sp: 280, off, ret: 1 }, SWD, { shape: 'wheel' })))); sfx(SW, hero.x); } });

  // ---------- 拳（10）：拳风、腿法、吼 ----------
  def('chongquan', 10, 1, 'thrust', { name: '冲拳', icon: '拳', color: '#ffd0a0', desc: '一拳打出，拳风直线飞出去', need: 150, beam: true, len: 150, wu: .35,
    cast() { const a = aim(); shot(a, { dmg: 2.0, T: .5, vx: Math.cos(a) * 360, vy: Math.sin(a) * 180, shape: 'fist', col: ['255,200,150', '255,245,230'] }); sfx(SW, hero.x); } });
  def('saotui', 10, 1, 'sweep', { name: '扫腿', icon: '扫', color: '#f0c090', desc: '低身扫腿，身前一片绊倒', need: 60, range: 56, half: 1.5,
    cast() { const a = aim(); sweep(a, 1.5, 56, 1.6, 20, C.quan); for (const z of cone(a, 56, 1.5)) stunz(z, .5); sfx(SW, hero.x); } });
  def('shanggou', 10, 1, 'up', { name: '上勾拳', icon: '勾', color: '#ffb080', desc: '一记上勾拳，把身前的人打上天', need: 50, range: 44, half: .9, wu: .4,
    cast() { const a = aim(); fx.push({ k: 'arc', x: hero.x, y: hero.y, a0: a, half: .9, r: 44 * RM, t: 0, T: .25, color: C.quan }); for (const z of cone(a, 44, .9)) HTU(z, 2.6, 20, Math.sign(z.x - hero.x)); sfx(CR, hero.x); } });
  def('xuanfengtui', 10, 2, 'spin', { name: '旋风腿', icon: '旋', color: '#ffc890', desc: '原地旋踢两圈，把人踢飞', need: 60,
    cast() { [0, 1].forEach(i => later(i * .2, () => { sweep(i * 3, Math.PI, 56, 1.5, 90, C.quan, { rev: i }); sfx(SW, hero.x); })); } });
  def('tieshan', 10, 2, 'thrust', { name: '铁山靠', icon: '靠', color: '#e0a070', desc: '往前一撞，撞穿一排，被撞的人吓得溃散', need: 110, beam: true, len: 110,
    cast() { const a = aim(), L = 90; ghost(hero.x, hero.y, hero.x + Math.cos(a) * L, clampY(hero.y + Math.sin(a) * L * .5), a, SK.tieshan.pose[1], .25);
      for (const z of hittable()) { const dx = z.x - hero.x, dy = (z.y - hero.y) * 2, al = dx * Math.cos(a) + dy * Math.sin(a), pe = Math.abs(-dx * Math.sin(a) + dy * Math.cos(a)); if (al > -10 && al < 110 * RM && pe < 26) { HT(z, 2.0, 110); rout(z, 2.5); } }
      hero.x += Math.cos(a) * L * .6; hero.y = clampY(hero.y + Math.sin(a) * L * .3); sfx(CR, hero.x); shake = Math.max(shake, .2); } });
  def('dahe', 10, 2, 'chop', { name: '大喝', icon: '喝', color: '#ffe0a0', desc: '一声怒吼，身边一圈人被震住', need: 70, ring: true, range: 80,
    cast() { fx.push({ k: 'ring', x: hero.x, y: hero.y, t: 0, T: .4, r: 80 }); for (const z of hittable()) if (dist(z, hero) < 84 * RM) { HT(z, .8, 30); stunz(z, 1.2); } floaters.push({ x: hero.x, y: hero.y - 80, t: 0, txt: '喝！', color: '#ffe08a', big: 1 }); sfx(CR, hero.x); shake = Math.max(shake, .25); } });
  def('lianhuan', 10, 3, 'thrust', { name: '连环拳', icon: '连', color: '#ffd8b0', desc: '前方连打十二拳，拳影密集', need: 90, beam: true, len: 90,
    cast() { for (let i = 0; i < 12; i++) later(i * .06, () => { S.poseOverride = { f: i % 2 ? SK.lianhuan.pose[1] : SK.lianhuan.pose[0], t: .06 }; lineHit(aim() + R(-.2, .2), 90, 12, .7, 10, '255,216,176'); if (i % 3 === 0) sfx(SW, hero.x); }); } });
  def('jingang', 10, 3, 'chop', { name: '金刚掌', icon: '掌', color: '#ffd060', desc: '一个巨大掌印从天上拍下', need: 200, none: true,
    cast() { const [[x, y]] = pts(1, 200); fx.push({ k: 'mark', x, y, r: 64, t: 0, T: .45 }); drop(x, y, 'palm', .45, () => { blast(x, y, 66, 3.8, 60, '255,210,100'); for (const z of near(x, y, 66 * RM)) stunz(z, .8); sfx(CR, x); shake = Math.max(shake, .4); }); } });
  def('huxiao', 10, 3, 'thrust', { name: '虎啸', icon: '虎', color: '#ffb040', desc: '吼出一道猛虎冲击波，直线推出去，被冲到的人溃散', need: 220, beam: true, len: 220,
    cast() { const a = aim(); ZN({ x: hero.x + Math.cos(a) * 20, y: hero.y + Math.sin(a) * 10, vx: Math.cos(a) * 280, vy: Math.sin(a) * 140, r: 44, T: .9, dmg: 1.6, kind: 'wave', push: 1, col: '255,190,80', routs: 1 }); sfx(CR, hero.x); shake = Math.max(shake, .2); } });
  def('qluanwu', 10, 4, 'spin', { name: '乱舞', icon: '乱', color: '#ff9060', desc: '冲进敌群乱打三秒', need: 160,
    cast() { for (let i = 0; i < 12; i++) later(i * .25, () => { const t = nearest(170); if (t) { const a = Math.atan2((t.y - hero.y) * 2, t.x - hero.x); ghost(hero.x, hero.y, t.x, t.y, a, SK.qluanwu.pose[1], .2); hero.x += (t.x - hero.x) * .6; hero.y = clampY(hero.y + (t.y - hero.y) * .6); } sweep(Math.random() * 7, Math.PI, 52, 1.4, 50, C.quan); if (i % 2) sfx(SW, hero.x); }); } });
  def('baji', 10, 4, 'chop', { name: '八极崩', icon: '崩', color: '#ffc060', desc: '一跺脚，全屏震荡，敌人全部浮空', need: 200, none: true, wu: .8,
    cast() { fx.push({ k: 'ring', x: hero.x, y: hero.y, t: 0, T: .6, r: 300 }); for (const z of hittable()) if (dist(z, hero) < 300 * RM) HTU(z, 2.8, 20, Math.sign(z.x - hero.x)); sfx(CR, hero.x); shake = Math.max(shake, .5); } });
  def('fengjuan', 10, 4, 'spin', { name: '风卷残云', icon: '云', color: '#ffe0c0', desc: '身周拳风卷成龙卷五秒，卷进来的人被连打', need: 100,
    cast() { ZN({ follow: 1, r: 90, T: 5, dmg: 1.1, kind: 'wind', pull: 1.5 }); sfx(SW, hero.x); } });

  // ---------- 改名、改阶、下架（11/13 全部重做） ----------
  { const R2 = (k, o) => Object.assign(SK[k], o);
    R2('daobo', { name: '半月斩', icon: '月', desc: '劈出月牙刀气，一路穿透' }); R2('qiang', { name: '突出', desc: '一枪刺出，把人刺退一大段', cast() { lineHit(aim(), 110, 10, 2.6, 110, '255,233,168'); sfx(SW, hero.x); shake = Math.max(shake, .08); } });
    R2('bainiao', { name: '暴雨', icon: '雨', desc: '枪如暴雨，扇面连出十八枪' }); R2('lihua', { name: '旋枪', icon: '旋', desc: '长枪回旋一圈，枪花四散' });
    R2('tianlei', { name: '天雷牢', icon: '牢', desc: '雷阵困住里面的人，出不去还挨雷', cast() { const [[x, y]] = pts(1, 200); ZN({ x, y, r: 80, T: 3.5, dmg: 1.6, kind: 'thunder', cage: 1 }); sfx(CR, x); } });
    R2('sixiang', { name: '八方剑光', icon: '八', desc: '八个方向各飞出一道剑气', cast() { ring(8, Object.assign({ dmg: 1.8, T: .7, sp: 330 }, SWD)); sfx(SW, hero.x); } });
    const TI = { hengsao: 1, tuodao: 1, tiaozhan: 1, daobo: 2, lianzhan: 2, huima: 2, feilunren: 3, wanren: 4, tianbeng: 4, qiang: 1, lianci: 1, lansao: 1, huimaq: 2, bainiao: 3, lihua: 3, qijin: 4, longyin: 4,
      huogong: 1, pili: 1, huofu: 1, feifu: 1, dingshen: 2, zhangxin: 2, wulei: 2, sadou: 3, tianlei: 3, jiutian: 4, huangtian: 4, taiping: 4, sixiang: 2 };
    for (const k in TI) SK[k].tier = TI[k];
    for (const k of ['daolun', 'xuanfeng', 'liedihuan', 'dilie', 'shuanghuan', 'xuehe', 'chong', 'tiaoqiang', 'touqiang', 'qianglin', 'fuhuo']) SK[k].off = true; }
  // ================= 11/14 刀 12 招重做（按 DS 方案）：破甲（铺增伤）/ 浮空（开窗口）/ 流血（蓄 + 万刃引爆） =================
  //   黄：截江扫 挑袍式 倒拖刀　玄：偃月斩 叠锋斩 回锋斩 错锋斩　地：飞轮刃 裂地环 血河斩　天：天崩地裂 万刃归宗
  //   方案里的距离按 ×0.55 换成本游戏像素（DK）；1.00× 伤害 = DU（原横扫约 1.1×）
  //   等级：LV3 / LV7 状态强化，LV5 改形状；LV10 质变留到第二批
  const DK = .55, DU = 2.2;
  const DLV = { dmg: [1, 1.07, 1.14, 1.21, 1.30, 1.37, 1.45, 1.53, 1.62, 1.75], sz: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1]   /* 11/14 用户：照群侠传，升级不涨范围（只有个别招 LV5 自己变形） */, wu: [0, 0, .01, .01, .02, .02, .03, .03, .04, .05], rc: [0, 0, 0, .02, .02, .02, .03, .03, .04, .05] };
  const dlv = () => lvOf(CK);
  // 11/14 用户：范围比群侠传大 → 按阶缩（黄 .75 玄 .75 地 .7 天 .65）；武学试炼里能一招招调，存在本机，调完复制给 Claude 写死
  const DRS0 = { 1: .75, 2: .75, 3: .7, 4: .65 }; let DRS = {}; try { DRS = JSON.parse(localStorage.getItem('szz-dao-rs') || '{}') || {}; } catch (e) {}
  // 11/14 用户在武学试炼里一招招拖出来的定稿（本机拖动条仍可覆盖，方便以后再调）
  const DRS1 = { hengsao: .6, tuodao: .69, tiaozhan: .75, lianzhan: .55, daobo: .75, huima: .75, cuofeng: .68, liedihuan: .33, feilunren: .81, xuehe: .75, tianbeng: 1.12, wanren: .75 };
  const DSP1 = { hengsao: 1.3, tuodao: 1.2, tiaozhan: 1.3, lianzhan: 1.2, daobo: 1.4, huima: 1.4, cuofeng: 1.4, liedihuan: 1.51, feilunren: 2.29, xuehe: 1.7, tianbeng: 2.2, wanren: 1.9 };
  const rsOf = k => DRS[k] != null ? DRS[k] : DRS1[k] != null ? DRS1[k] : DRS0[(SK[k] && SK[k].tier) || 1] || 1;
  let DSP = {}; try { DSP = JSON.parse(localStorage.getItem('szz-dao-sp') || '{}') || {}; } catch (e) {}   // 起手/收势倍率（越大越慢），同样在武学试炼里拖动调
  const spOf = k => (DSP[k] != null ? DSP[k] : DSP1[k] != null ? DSP1[k] : 1) * (typeof HAS === 'function' && SK[k] && SK[k].dk && ((HAS('huanshou') && WOFX[k] === 0) || (HAS('muqiang') && WOFX[k] === 3) || (HAS('qingshizi') && WOFX[k] === 7) || (HAS('qingtongchui') && WOFX[k] === 2) || (HAS('sangmugong') && WOFX[k] === 5) || (HAS('mugandao') && WOFX[k] === 4) || (HAS('pukui') && WOFX[k] === 9) || (HAS('zhusha') && WOFX[k] === 8)) ? .9 : 1) * (typeof HAS === 'function' && HAS('qinglongdao') && WOFX[k] === 4 && S.gdSui != null && DKT - S.gdSui < 3 ? .85 : 1);   // 环首刀：刀的武艺快 10%
  const SPDN = [[.62, '极快'], [.85, '快'], [1.05, '中'], [1.25, '慢'], [99, '极慢']];
  const spdTxt = o => { const m = o.dk ? spOf(o.key) : 1, wu = (o.dk ? o.wu : o.wu * 1.2) * m, rc = o.rc * m, t = wu * weaponWindMul(o.key) + rc; return `出手${SPDN.find(q => t <= q[0])[1]}　起手 ${(wu * weaponWindMul(o.key)).toFixed(2)} 秒 · 收势 ${rc.toFixed(2)} 秒`; };
  let DKT = 0; const DKO = [];   // 刀的持续判定（飞刃、血河、裂地环等）不靠 later：翻滚也不会断
  const dmk = o => Object.assign({ t: 0, cm: CM, ck: CK, rm: RM }, o);
  // 易伤：破甲每层 +10%；浮空窗口 +25%（精锐/首领只吃一半）
  const PJK = () => typeof HAS === 'function' && HAS('gudingdao') ? .15 : .1;
  const VUL = z => (1 + PJK() * (z.pjT > 0 ? z.pj || 0 : 0)) * (z.fkT > 0 ? 1 + (z.fkV || .25) * (tough(z) ? .5 : 1) : 1);
  const slowGrade = z => z.survBoss || z.T.boss || z.T.chapterBoss ? 2 : z.survTier === 1 || z.T.elite ? 1 : 0;
  const slowMove = (z, legacy = 1) => Math.min(z.survSlow > 0 ? legacy : 1,
    z.slT > 0 ? [.80, .88, .92][slowGrade(z)] : 1, z.wetT > 0 ? .9 : 1);
  function addSL(z, extra = 0) {
    const mul = HAS('yuhua') && (CK === 'zashi' || CK === 'paoshi') ? 1.3 : 1;
    z.slT = Math.max(z.slT || 0, ((slowGrade(z) === 2 ? 2 : 2.5) + extra) * mul);
  }
  function addPJ(z, n, cap) { const CP = HAS('baipi') ? 6 : 4; cap = cap ? Math.min(CP, cap + (CP - 4)) : CP; const c = z.pjT > 0 ? z.pj || 0 : 0; z.pjT = 5; if (c >= cap) return; z.pj = Math.min(cap, c + n); }
  function addBL(z, n, cap) { const CB = HAS('baipi') ? 8 : 5; cap = cap ? Math.min(CB, cap + (CB - 5)) : CB;   /* 百辟刀：流血上限 8、破甲上限 6 */ const c = z.blT > 0 ? z.bl || 0 : 0; z.blT = 4; z.blCM = CM; if (!(z.blTk > 0)) z.blTk = .5; if (c >= cap) return; z.bl = Math.min(cap, c + n); }
  function addFK(z, o) {   // 浮空：普通兵被挑飞，落地再吃一下并晕 0.5 秒；10 秒内第 2 次 ×0.7、第 3 次 ×0.5、之后免疫
    z.fkH = (z.fkH || []).filter(t => DKT - t < 10); const n = z.fkH.length; if (n >= 3) return; const m = [1, .7, .5][n]; z.fkH.push(DKT);
    z.fkT = (1.8 + (o.fkPlus || 0)) * m; z.fkV = Math.max(o.fkV || .25, HAS('longdan') ? .5 : 0);
    if (!tough(z)) { z.fkLand = .5; z.fkCM = CM; z.fkCK = CK; z.fkShock = !!o.land; z.fkBl = o.fkBl || 0; z.fkLM = o.fkLM || 1; z.fkBoom = o.fkBoom || 0; }
  }
  // 刀的一次命中：o.pj 破甲层数 / o.bl 流血层数（o.blMax 本招上限）/ o.up 挑飞 / o.fk 对浮空目标的倍率（代替 +25%）/ o.once 同一目标只挂一次状态
  function DH(z, m, kb, o = {}) {
    if (!z || z.dead || z.air || z.hidden) return false;
    const pjm = 1 + PJK() * (z.pjT > 0 ? z.pj || 0 : 0), fkm = z.fkT > 0 ? (o.fk ? (tough(z) ? 1 + (o.fk - 1) / 2 : o.fk) : 1 + (z.fkV || .25) * (tough(z) ? .5 : 1)) : 1;
    const d = m * DU * DM() * pjm * fkm * (z.fkT > 0 && HAS('zhanma') ? 1.3 : 1),   /* 斩马刀：打浮空 +30% */ up = !!o.up && !tough(z), f0 = freeze, x0 = o.x != null ? o.x : hero.x;
    rec(d); hit(z, d, kb * (tough(z) ? .5 : 1), Math.sign(z.x - x0) || hero.f, up, 0, up ? .45 : .3, false, false, { secondary: true, survSkill: true });
    freeze = Math.min(freeze, Math.max(f0, .04));
    if (SK[CK] && (SK[CK].stone || SK[CK].hammer || SK[CK].bow)) {
      freeze = Math.max(freeze, .035);
      stoneBurst(z, 8 + SK[CK].tier * 2, .16);
    } else {   // 11/14 用户：打中时的手感——敌人身上闪一道刀痕；同一时刻多个目标只顿一次帧（约 0.05 秒）
      const sk = SK[CK], col = (sk && sk.color || '#ffe0a0').replace('#', ''), rgb = [0, 2, 4].map(i => parseInt(col.slice(i, i + 2), 16)).join(',');
      fx.push({ k: 'cut', n: (sk && sk.tier || 1) >= 3 ? 'dh2' : 'dg6', x: z.x, y: z.y - 20 * (z.sc || 1), a: Math.atan2(z.y - hero.y, z.x - x0) + (Math.random() - .5) * 1.2 - .6, L: 26 * (z.sc || 1), t: 0, T: .16, col: rgb });
      const now = performance.now(); if (now - (DH.hs || 0) > 110) { DH.hs = now; freeze = Math.max(freeze, .05); }
    }
    if (z.dead) return true;
    const first = !o.once || !o.once.has(z); if (o.once) o.once.add(z);
    if (first && o.pj) addPJ(z, o.pj, o.pjMax);
    if (first && o.bl) addBL(z, o.bl, o.blMax);
    if (o.up) addFK(z, o);
    return true;
  }
  const inArc = (x, y, z, a0, half, r) => { const dx = z.x - x, dy = (z.y - y) * 2, d = Math.hypot(dx, dy); return d <= r + 8 && (d < 14 || angDiff(Math.atan2(dy, dx), a0) <= half); };
  function dSweep(x, y, a0, half, r, m, kb, o = {}) {   // 扇形（r 用方案单位）
    r *= DK * RM;
    // 11/14 用户：有刀光图的招不再画代码扇形；出手那一下已由 daoSlash 播过，之后的追加刀（回锋、叠锋第二三刀等）按这一刀的方向再播一道刀光
    if (typeof DGM !== 'undefined' && DGM[CK]) { if (DKT - (daoSlash.t || -9) > .06) daoSlash(CK, a0, x, y); }
    else fx.push({ k: 'arc', x, y, a0, half, r, t: 0, T: .26, color: o.col || C.dao, rev: !!o.rev });
    return hittable().filter(z => inArc(x, y, z, a0, half, r) && DH(z, m, kb, Object.assign({ x }, o)));
  }
  function dCircle(x, y, r, m, kb, o = {}) {   // 圆（r 用方案单位）
    r *= DK * RM;
    if (typeof DGM !== 'undefined' && DGM[CK]) { const tr = SK[CK].tier || 1; fx.push({ k: 'cut', n: tr >= 3 ? 'dh2' : 'dg6', x, y: y - 14, a: -.6, L: r * (tr >= 3 ? .5 : .7), t: 0, T: .32, col: hexRgb(SK[CK].color) }); }
    else fx.push({ k: 'burst', x, y, r, t: 0, T: .4, col: o.col || '255,200,120' });
    return near(x, y, r).filter(z => DH(z, m, kb, Object.assign({ x }, o)));
  }
  function dRect(x0, y0, a, L, w, f) {   // 从 (x0,y0) 朝 a 长 L、半宽 w 的矩形（已换算好的像素），对里面的人调 f(z)
    for (const z of hittable()) { const dx = z.x - x0, dy = (z.y - y0) * 2, al = dx * Math.cos(a) + dy * Math.sin(a), pe = Math.abs(-dx * Math.sin(a) + dy * Math.cos(a)); if (al > -10 && al < L && pe < w + 6) f(z); }
  }
  function daoTick(dt) {
    DKT += dt; fanTick(dt); fuTick(dt);
    for (const z of zs) {
      if (z.dead) continue;
      if (z.pjT > 0 && (z.pjT -= dt) <= 0) z.pj = 0;
      if (z.fkT > 0) z.fkT -= dt;
      if (z.fkLand > 0 && (z.fkLand -= dt) <= 0) {
        if (z.air) z.fkLand = .05;
        else { const c = CM, k = CK; CM = z.fkCM || 1; CK = z.fkCK || ''; DH(z, .30 * (z.fkLM || 1), 0); stunz(z, .5); if (z.fkShock) dCircle(z.x, z.y, 80, .50, 30); if (z.fkBl) addBL(z, z.fkBl); if (z.fkBoom) dCircle(z.x, z.y, 90, z.fkBoom, 40); CM = c; CK = k; }
      }
      if (z.blT > 0) {
        z.blT -= dt;
        if ((z.blTk -= dt) <= 0) { z.blTk += .5; const d = .05 * DU * (z.bl || 0) * RT.dmg * (z.blCM || 1) * (HAS('diangang') ? 1.3 : 1); if (d > 0) { rec(d); hit(z, d, 0, 1, false, 0, 0, false, false, { dot: true, secondary: true, survSkill: true }); } }
        if (z.blT <= 0) z.bl = 0;
      }
    }
    for (let i = DKO.length - 1; i >= 0; i--) { const o = DKO[i], c = CM, k = CK, r = RM; o.t += dt; CM = o.cm; CK = o.ck; RM = o.rm; o.tick(o, dt); CM = c; CK = k; RM = r; if (o.t >= o.T) DKO.splice(i, 1); }
  }
  function dStatusDraw() {
    return;   // 11/14 用户：敌人头上不显示状态小图标（碎甲、血珠、浮空）——状态照常生效   // 头顶小标记：灰蓝方块 = 破甲层数，红点 = 流血层数，金色弧 = 浮空易伤
    for (const z of alive()) {
      const pj = z.pjT > 0 ? z.pj || 0 : 0, bl = z.blT > 0 ? z.bl || 0 : 0, fk = z.fkT > 0;
      if (!pj && !bl && !fk) continue;
      const y = z.y - (tough(z) ? 92 : 62) - (z.z || 0);
      ctx.save(); ctx.lineWidth = 1;
      // 11/14：状态小图标（破甲护甲片、流血血珠、浮空金箭头），层数写在图标右下
      const ic = []; if (pj) ic.push(['ic_pj', pj]); if (bl) ic.push(['ic_bl', bl]); if (fk) ic.push(['ic_fk', 0]);
      const S0 = 9, x0 = z.x - (ic.length * (S0 + 3)) / 2;
      ic.forEach(([n, c], i) => { const im = DGI[n], x = x0 + i * (S0 + 3); if (im.complete && im.naturalWidth) { const w = S0 * Math.min(1, im.naturalWidth / im.naturalHeight), h = S0 * Math.min(1, im.naturalHeight / im.naturalWidth); ctx.drawImage(im, x + (S0 - w) / 2, y + (S0 - h) / 2, w, h); }
        if (c > 1) { ctx.font = '700 6px Pixel12,sans-serif'; ctx.textAlign = 'left'; ctx.lineWidth = 2; ctx.strokeStyle = '#1a1008'; ctx.strokeText(c, x + S0 - 2, y + S0 + 1); ctx.fillStyle = '#fff2d0'; ctx.fillText(c, x + S0 - 2, y + S0 + 1); } });
      ctx.restore();
    }
  }
  // 11/14 用户：刀光不要都是金黄——每招颜色照图标的主色（染刀光、刀痕、飞行物）
  const DCOL = { hengsao: '#3fb6e8', tuodao: '#ff4a2a', tiaozhan: '#ffd23a', daobo: '#b9a6ff', lianzhan: '#ff3b2f', huima: '#ff9a1f', cuofeng: '#ff4f9a', feilunren: '#cfe6ff', liedihuan: '#c8902e', xuehe: '#c0141e', tianbeng: '#ffb02e', wanren: '#5fd4ff' };
  const DAO = (k, tier, mot, o) => { add(k, Object.assign({ tier, dk: 1, key: k }, o, DCOL[k] ? { color: DCOL[k] } : {})); WOFX[k] = 0; MOTX[k] = mot; };
  const RED = ['rgba(255,90,80,', 'rgba(255,225,215,'];
  // ---- 黄 ----
  DAO('hengsao', 1, 'sweep', { name: '截江扫', icon: '截', color: '#ffb45a', need: 75, wu: .40, rc: .20, range: 60, half: 2.356,
    desc: '身前 270° 横扫，挂 1 层破甲。LV3 破甲 2 层；LV5 再反向回扫 150°；LV7 击退变强',
    cast() { const L = dlv(), a = aim(), kb = L >= 7 ? 100 : 60; dSweep(hero.x, hero.y, a, 2.356, 110, 1.10, kb, { pj: L >= 3 ? 2 : 1 }); sfx(SW, hero.x); shake = Math.max(shake, .12);
      if (L >= 5) DKO.push(dmk({ T: .2, done: 0, tick(o) { if (!o.done && o.t >= .18) { o.done = 1; dSweep(hero.x, hero.y, a + Math.PI, 1.31, 110, .60, kb, { rev: true }); sfx(SW, hero.x); } } })); } });
  DAO('tiaozhan', 1, 'up', { name: '挑袍式', icon: '挑', color: '#ffd08a', need: 65, wu: .32, rc: .28, range: 52, half: .70,
    desc: '身前 80° 窄扇上挑，把人挑飞（浮空）：落地再吃一下并晕 0.5 秒，之后 1.8 秒内受伤 +25%。LV3 易伤窗口 +0.2 秒；LV5 落地震一圈；LV7 易伤 +30%',
    cast() { const L = dlv(), a = aim(); dSweep(hero.x, hero.y, a, .70, 95, .80, 20, { up: 1, fkV: L >= 7 ? .30 : .25, fkPlus: L >= 3 ? .2 : 0, land: L >= 5 }); sfx(SW, hero.x); shake = Math.max(shake, .1); } });
  DAO('tuodao', 1, 'sweep', { name: '落叶斩', icon: '叶', color: '#ff4a2a', need: 70, wu: .35, rc: .20, range: 90, half: .61,   // 11/16 用户定：原倒拖刀让给关刀（拖刀计），刀补这一招
    desc: '快速向前、左前、右前依次落 3 刀，每刀一个 70° 小扇面，挂 1 层流血；同一人最多吃 2 刀。LV3 流血 2 层；LV5 增至 5 刀，扇面更散；LV7 第 3 刀起附带 1 层破甲',
    cast() { const L = dlv(), a = aim(), offs = L >= 5 ? [0, -.45, .45, -.9, .9] : [0, -.5, .5], cnt = new Map();
      DKO.push(dmk({ T: offs.length * .08 + .02, i: 0, tick(o) { while (o.i < offs.length && o.t >= o.i * .08) { const b = a + offs[o.i], i = o.i;
        daoSlash('tuodao', b, hero.x, hero.y); S.poseOverride = { f: SK.tuodao.pose[i % 2], t: .08 };
        for (const z of hittable()) { if (!inArc(hero.x, hero.y, z, b, .61, 90 * DK * RM)) continue; const c = cnt.get(z) || 0; if (c >= 2) continue; cnt.set(z, c + 1); DH(z, .45, 20, { bl: L >= 3 ? 2 : 1, pj: L >= 7 && i >= 2 ? 1 : 0 }); }
        sfx(SW, hero.x); o.i++; } } })); } });
  // ---- 玄 ----
  DAO('daobo', 2, 'chop', { name: '偃月斩', icon: '月', color: '#ff8a7a', need: 150, wu: .50, rc: .30, beam: true, len: 143,
    desc: '劈出一道月牙刀气，一路穿透，挂 1 层流血。LV3 流血 2 层；LV5 刀气更宽更远；LV7 飞得更快',
    cast() { const L = dlv(), a = aim(), sp = (L >= 7 ? 760 : 620) * DK, R = (L >= 5 ? 340 : 260) * DK * RM, hw = (L >= 5 ? 65 : 45) * DK * RM;
      const b = { x: hero.x, y: hero.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp / 2, a, t: 0, T: R / sp, hitSet: [], nohit: 1, big2: L >= 5 ? 1 : 0, col: ['255,120,110', '255,235,225'], img: 'dg4', iw: hw * 2.4, tc: hexRgb(SK.daobo.color) }; bolts.push(b);
      DKO.push(dmk({ T: b.T, hs: new Set(), tick(o) { for (const z of hittable()) if (!o.hs.has(z) && Math.hypot(z.x - b.x, (z.y - b.y) * 2) < hw + 10) { o.hs.add(z); DH(z, 1.80, 20, { bl: L >= 3 ? 2 : 1, x: b.x - b.vx }); } } }));
      sfx(SW, hero.x); shake = Math.max(shake, .08); } });
  DAO('lianzhan', 2, 'sweep', { name: '叠锋斩', icon: '叠', color: '#ff9a8a', need: 65, wu: .45, rc: .35, range: 74, half: 1.83,
    desc: '先 150° 一刀，紧接 210° 更大一刀；每刀挂 1 层流血，第二刀对浮空目标 ×1.5。LV3 每刀流血 2 层；LV5 加第三刀 270°；LV7 范围 +15%',
    cast() { const L = dlv(), a = aim(), s = L >= 7 ? 1.15 : 1, bl = L >= 3 ? 2 : 1, N = L >= 5 ? 3 : 2; dSweep(hero.x, hero.y, a, 1.31, 110 * s, .85, 20, { bl, col: RED }); sfx(SW, hero.x);
      DKO.push(dmk({ T: .32, i: 1, tick(o) {
        if (o.i === 1 && o.t >= .15) { o.i = 2; S.poseOverride = { f: SK.lianzhan.pose2, t: .2 }; dSweep(hero.x, hero.y, a, 1.83, 135 * s, .95, 60, { bl, fk: 1.5, rev: true, col: RED }); sfx(SW, hero.x); }
        if (o.i === 2 && N > 2 && o.t >= .30) { o.i = 3; dSweep(hero.x, hero.y, a, 2.356, 150 * s, 1.05, 60, { bl, col: RED }); sfx(SW, hero.x); } } })); } });
  DAO('huima', 2, 'up', { name: '回锋斩', icon: '回', color: '#ffc27a', need: 70, wu: .50, rc: .32, range: 63, half: 1.48,
    desc: '先斩身前 170°，紧接回身斩身后 170°，两面都击退，挂 1 层破甲（同一人只挂一次）。LV3 破甲 2 层；LV5 左右再各补一小刀；LV7 两刀之间短暂无敌',
    cast() { const L = dlv(), a = aim(), once = new Set(), pj = L >= 3 ? 2 : 1; dSweep(hero.x, hero.y, a, 1.48, 115, .92, 100, { pj, once }); sfx(SW, hero.x); if (L >= 7) hero.inv = Math.max(hero.inv || 0, .3);
      DKO.push(dmk({ T: .25, i: 0, tick(o) {
        if (L >= 5 && o.i === 0 && o.t >= .07) { o.i = 1; dSweep(hero.x, hero.y, a + Math.PI / 2, 1.0, 80, .40, 40); }
        if (o.i <= 1 && o.t >= .15) { o.i = 2; S.poseOverride = { f: SK.huima.pose2, t: .2 }; dSweep(hero.x, hero.y, a + Math.PI, 1.48, 115, .93, 100, { pj, once, rev: true }); sfx(SW, hero.x); }
        if (L >= 5 && o.i === 2 && o.t >= .23) { o.i = 3; dSweep(hero.x, hero.y, a - Math.PI / 2, 1.0, 80, .40, 40, { rev: true }); } } })); } });
  DAO('cuofeng', 2, 'chop', { name: '错锋斩', icon: '错', color: '#ffb0a0', need: 130, wu: .55, rc: .35, none: true,
    desc: '在前方敌人身上斩出交叉的两道刀光（十字），交叉处再爆一下；每道挂 1 层流血。LV3 流血 2 层；LV5 多一道竖刀、交叉处更大；LV7 交叉处伤害更高',
    cast() { const L = dlv(), t = nearest(220), a = aim(), px = t ? t.x : hero.x + Math.cos(a) * 70, py = t ? t.y : clampY(hero.y + Math.sin(a) * 35), Lh = 110 * DK * RM, w = 15 * RM, bl = L >= 3 ? 2 : 1;
      const angs = [a + Math.PI / 4, a - Math.PI / 4].concat(L >= 5 ? [a] : []);
      DKO.push(dmk({ T: angs.length * .15 + .05, i: 0, tick(o) {
        while (o.i < angs.length && o.t >= o.i * .15) { const g = angs[o.i], x0 = px - Math.cos(g) * Lh, y0 = py - Math.sin(g) * Lh / 2;
          fx.push({ k: 'cut', n: 'dg6', x: px, y: py - 18, a: g, L: Lh * .95, t: 0, T: .3, col: hexRgb(SK.cuofeng.color) }); dRect(x0, y0, g, Lh * 2, w, z => DH(z, o.i < 2 ? 1.00 : .80, 20, { bl, x: px })); sfx(SW, px); o.i++;
          if (o.i === angs.length) dCircle(px, py, L >= 5 ? 75 : 55, L >= 7 ? .70 : .40, 10, { col: '255,160,140' }); } } })); } });
  // ---- 地 ----
  DAO('feilunren', 3, 'sweep', { name: '飞轮刃', icon: '轮', color: '#d8f0ff', need: 130, wu: .55, rc: .35, none: true,
    desc: '刀脱手绕身飞一整圈再收回（先外扩再收回），去程、回程各打一次，回程更重并挂 1 层流血。LV3 回程流血 2 层；LV5 两把一正一反；LV7 飞得更快',
    cast() { const L = dlv(), a0 = aim(), T = 1.6 / (L >= 7 ? 1.25 : 1), n = L >= 5 ? 2 : 1, k = n > 1 ? 1 / 2.4 : 1; sfx(SW, hero.x);
      for (let j = 0; j < n; j++) { const dir = j ? -1 : 1, b = { x: hero.x, y: hero.y, vx: 0, vy: 0, a: 0, t: 0, T, hitSet: [], nohit: 1, shape: 'wheel', col: ['216,240,255', '255,255,255'], img: 'fx_lun', iw: 44 * o0rm(), spin: 1, tc: hexRgb(SK.feilunren.color) }; bolts.push(b);
        DKO.push(dmk({ T, h1: new Set(), h2: new Set(), tick(o) { const q = Math.min(1, o.t / T), r = (120 + 60 * Math.sin(q * Math.PI)) * DK * o.rm, an = a0 + dir * q * Math.PI * 2;
          b.x = hero.x + Math.cos(an) * r; b.y = hero.y + Math.sin(an) * r * .5; const back = q > .5, hs = back ? o.h2 : o.h1;
          for (const z of hittable()) if (!hs.has(z) && Math.hypot(z.x - b.x, (z.y - b.y) * 2) < 24 * o.rm) { hs.add(z); DH(z, (back ? 1.40 : 1.00) * k, 20, { bl: back ? (L >= 3 ? 2 : 1) : 0, x: b.x }); } } })); } } });
  DAO('liedihuan', 3, 'chop', { name: '裂地环', icon: '圜', color: '#e0a860', need: 110, wu: .60, rc: .40, range: 143, half: Math.PI, ring: true,
    desc: '劈地，3 道环由脚下往外一道道慢慢裂开，每环挂破甲（本招最多 2 层）。LV3 本招破甲最多 3 层；LV5 4 道环；LV7 裂得快一点',
    cast() { const L = dlv(), N = L >= 5 ? 4 : 3, st = L >= 7 ? .2 : .26, pjCap = L >= 3 ? 3 : 2, cnt = new Map(), cx = hero.x, cy = hero.y; sfx(CR, hero.x); shake = Math.max(shake, .2);
      DKO.push(dmk({ T: N * st + .05, i: 0, tick(o) {
        while (o.i < N && o.t >= o.i * st) { const r = (60 + 200 / (N - 1) * o.i) * DK * o.rm, bw = 14 * o.rm; fx.push({ k: 'img', n: 'fx_ring', x: cx, y: cy, w: r * 2.3, t: 0, T: .45, col: hexRgb(SK.liedihuan.color), g0: .8 });
          for (const z of hittable()) { const d = Math.hypot(z.x - cx, (z.y - cy) * 2); if (!(Math.abs(d - r) < bw + 6 || (o.i === 0 && d < r))) continue; const c = cnt.get(z) || 0; if (c >= 3) continue; cnt.set(z, c + 1); DH(z, .85, 60, { x: cx, pj: c < pjCap ? 1 : 0 }); }
          if (o.i % 2 === 0) shake = Math.max(shake, .12); o.i++; } } })); } });
  DAO('xuehe', 3, 'sweep', { name: '血河斩', icon: '血', color: '#ff5050', need: 140, wu: .70, rc: .40, beam: true, len: 154,
    desc: '横拖一刀，身前留下一条血河 3 秒，每 0.5 秒伤一次并挂 1 层流血（本招最多叠到 3 层）。LV3 血河 3.5 秒；LV5 血河更宽更长；LV7 每跳 20% 多挂 1 层',
    cast() { const L = dlv(), a = aim(), w = (L >= 5 ? 130 : 90) * DK * RM / 2, Ln = (L >= 5 ? 360 : 280) * DK * RM, T = L >= 3 ? 3.5 : 3, x0 = hero.x, y0 = hero.y;
      fx.push({ k: 'img', n: 'fx_he', x: x0, y: y0, a, L: Ln, w: w * 2.6, t: 0, T: T + .3, col: '200,30,30', river: 1 });
      dRect(x0, y0, a, Ln, w, z => DH(z, .60, 0, { x: x0 })); sfx(SW, hero.x); shake = Math.max(shake, .2);
      DKO.push(dmk({ T, nx: .5, tick(o) { if (o.t >= o.nx) { o.nx += .5; dRect(x0, y0, a, Ln, w, z => { if (DH(z, .30, 0, { bl: 1, blMax: 3, x: x0 }) && L >= 7 && Math.random() < .2) addBL(z, 1, 3); }); } } })); } });
  // ---- 天 ----
  DAO('tianbeng', 4, 'chop', { name: '天崩地裂', icon: '崩', color: '#ffae54', need: 160, wu: .85, rc: .50, none: true,
    desc: '身周巨震，极强击退并挂 3 层破甲；随后 6 处落点从天砸下（2 处追着最近的敌人），落点把人挑飞（浮空）。LV3 巨震破甲 4 层；LV5 9 处落点、巨震更大；LV7 落点更大',
    cast() { const L = dlv(), t = nearest(260); dCircle(hero.x, hero.y, L >= 5 ? 220 : 170, 2.40, 200, { pj: L >= 3 ? 4 : 3 }); sfx(CR, hero.x); shake = Math.max(shake, .5);
      const N = L >= 5 ? 9 : 6, pr = L >= 7 ? 95 : 75, P = [];
      for (let i = 0; i < N; i++) { if (i < 2 && t) P.push([t.x + R(-10, 10), t.y + R(-6, 6)]); else { const g = Math.random() * 7, rr = R(100, 240) * DK * RM; P.push([hero.x + Math.cos(g) * rr, clampY(hero.y + Math.sin(g) * rr * .5)]); } }
      P.forEach(([x, y], i) => fx.push({ k: 'img', n: 'fx_aim', x, y, w: pr * DK * 2.4, t: 0, T: .2 + i * .15, col: '255,120,70', warn: 1 }));
      DKO.push(dmk({ T: .2 + N * .15, i: 0, tick(o) { while (o.i < N && o.t >= .2 + o.i * .15) { const [x, y] = P[o.i]; dCircle(x, y, pr, 1.00, 50, { up: 1, x }); sfx(CR, x); shake = Math.max(shake, .15); o.i++; } } })); } });
  DAO('wanren', 4, 'spin', { name: '归海一刀', icon: '海', color: '#b8f0ff', need: 200, wu: .80, rc: .50, none: true,
    desc: '14 柄飞刃从四周射向最近的敌人，一路穿透（同一人最多吃 6 柄），汇聚后一记巨斩（对浮空目标 ×1.4），并引爆目标身上全部流血（每层 0.25×）。LV3 引爆每层 0.35×；LV5 20 柄；LV7 巨斩更大',
    cast() { const L = dlv(), t = nearest(260), a = aim(), px = t ? t.x : hero.x + Math.cos(a) * 80, py = t ? t.y : clampY(hero.y + Math.sin(a) * 40), N = L >= 5 ? 20 : 14, Rr = 420 * DK * RM, ft = .35;
      const bs = []; for (let i = 0; i < N; i++) { const g = i * Math.PI * 2 / N, sx = px + Math.cos(g) * Rr, sy = py + Math.sin(g) * Rr * .5; const b = { x: sx, y: sy, vx: (px - sx) / ft, vy: (py - sy) / ft, a: g + Math.PI, t: 0, T: ft, hitSet: [], nohit: 1, shape: 'sword', col: ['170,235,255', '255,255,255'], img: 'dg6', iw: 34, tc: hexRgb(SK.wanren.color) }; bolts.push(b); bs.push(b); }
      sfx(SW, hero.x); const cnt = new Map();
      DKO.push(dmk({ T: ft + .02, done: 0, tick(o) {
        for (const b of bs) for (const z of hittable()) { if (b.hitSet.includes(z) || Math.hypot(z.x - b.x, (z.y - b.y) * 2) > 16) continue; b.hitSet.push(z); const c = cnt.get(z) || 0; if (c >= 6) continue; cnt.set(z, c + 1); DH(z, .50, 8, { x: b.x });   /* 11/15 用户：每柄 0.35→0.50，和天崩地裂对齐 */ }
        if (!o.done && o.t >= ft) { o.done = 1; const rr = (L >= 7 ? 120 : 90); shake = Math.max(shake, .45); sfx(CR, px);
          dCircle(px, py, rr, 2.20, 40, { fk: 1.4, x: px, col: '190,240,255' });
          for (const z of near(px, py, rr * DK * o.rm)) if (z.blT > 0 && z.bl > 0 && !z.dead) { const d = z.bl * (L >= 3 ? .35 : .25) * DU * RT.dmg * CM; rec(d); hit(z, d, 0, 1, false, 0, 0, false, false, { dot: true, secondary: true, survSkill: true }); floaters.push({ x: z.x, y: z.y - 70, t: 0, txt: '引爆', color: '#ff6a5a' }); z.bl = 0; z.blT = 0; } } } })); } });
  for (const k of ['daolun', 'xuanfeng', 'dilie', 'shuanghuan', 'hongji', 'shuangyue', 'luanwu']) if (SK[k]) SK[k].off = true;
  // ---------- 枪（11/15 用户定，照第二份策划方案重做）：直线、点杀、短扇、地波四种判定；主打流血 + 浮空；位移 1 进 1 退 + 游龙突，自带保护 ----------
  //   黄：穿云刺 点星刺 拦江扫　玄：挑月枪 梨花扎 破阵突 回马枪　地：掷虹枪 林海刺 游龙突　天：百鸟朝凤 龙吟九霄
  const QCOL = { qiang: '#dff0ff', lansao: '#7ec8ff', lianci: '#ffe27a', tiaoqiang: '#ffd23a', lihua: '#ffb8da', chong: '#ff8a3c', huimaq: '#5fe0c8', touqiang: '#ff6a3a', qianglin: '#b8d4ff', qijin: '#ffcf5a', bainiao: '#ffb02e', longyin: '#6fd8ff' };
  const QG = (k, tier, mot, o) => { add(k, Object.assign({ tier, dk: 1, key: k, color: QCOL[k] }, o)); WOFX[k] = 3; MOTX[k] = mot; };
  const QL = () => HAS('bawang') ? 1.2 : 1;                // 霸王枪：直线刺的招长 20%
  const QD = () => HAS('longdan') ? 1.3 : 1, QDM = () => HAS('longdan') ? 1.5 : 1;   // 龙胆亮银枪：冲刺距离 +30%、冲刺路上伤害 ×1.5
  const QS = (n) => n * DK * RM;                           // 方案单位 → 像素
  const qCol = () => hexRgb(SK[CK] ? SK[CK].color : '#ffe0a0');
  function qFx(x0, y0, a, L, T) { const ca = Math.cos(a), sa = Math.sin(a), Ls = L * Math.hypot(ca, sa * .5); fx.push({ k: 'cut', n: 'dg6', x: x0 + ca * L / 2, y: y0 + sa * L / 4 - 16, a: Math.atan2(sa * .5, ca), L: Ls / 2.2, t: 0, T: T || ((SK[CK] && SK[CK].tier) >= 3 ? .3 : .22), col: qCol() }); }
  // 直线刺：(x0,y0) 朝 a，长 L、宽 W（方案单位，全宽）；m 可以是数，也可以是 z => 倍率；返回打中的人
  function qT(x0, y0, a, L, W, m, kb, o = {}, noFx) {
    const Lp = QS(L) * (o.noL ? 1 : QL()), w = QS(W) / 2; if (!noFx) qFx(x0, y0, a, Lp);
    const hs = []; dRect(x0, y0, a, Lp, w, z => { const mm = typeof m === "function" ? m(z) : m; if (mm > 0 && DH(z, mm, kb, Object.assign({ x: x0 }, o))) hs.push(z); }); return hs;
  }
  const qBleedUp = (k, cap) => z => (z.blT > 0 ? 1 + k * Math.min(cap, z.bl || 0) : 1);   // 按目标身上的流血层数增伤
  function qBoom(z, per, max) { if (z.dead || !(z.blT > 0 && z.bl > 0)) return; const n = Math.min(max, z.bl), d = n * per * DU * RT.dmg * CM; rec(d); hit(z, d, 0, 1, false, 0, 0, false, false, { dot: true, secondary: true, survSkill: true }); floaters.push({ x: z.x, y: z.y - 70, t: 0, txt: '引爆', color: '#ff6a5a' }); z.bl -= n; if (z.bl <= 0) { z.bl = 0; z.blT = 0; } }
  // 冲刺：T 秒内朝 a 冲 D（方案单位）；路上判定宽 W；inv 秒内无敌；落点附近 ≥6 个敌人就提前停在 60 处（不上头）
  function qDash(a, D, T, W, m, kb, o, inv, done) {
    let Dp = QS(D) * QD(); const x0 = hero.x, y0 = hero.y, tx = x0 + Math.cos(a) * Dp, ty = y0 + Math.sin(a) * Dp * .5;
    if (near(tx, ty, QS(80)).length >= 6) Dp = Math.min(Dp, QS(60) * QD());
    const x1 = x0 + Math.cos(a) * Dp, y1 = clampY(y0 + Math.sin(a) * Dp * .5), hs = new Set(), w = QS(W) / 2;
    if (inv) hero.inv = Math.max(hero.inv || 0, inv);
    if (Dp > 4) ghost(x0, y0, x1, y1, a, SK[CK] ? SK[CK].pose[1] : null, T + .1);
    DKO.push(dmk({ T: T + .01, fin: 0, tick(q) { const p = Math.min(1, q.t / T); hero.x = x0 + (x1 - x0) * p; hero.y = clampY(y0 + (y1 - y0) * p); if (Math.abs(Math.cos(a)) > .2) hero.f = Math.cos(a) >= 0 ? 1 : -1;
      for (const z of hittable()) if (!hs.has(z) && Math.hypot(z.x - hero.x, (z.y - hero.y) * 2) < w + 12) { hs.add(z); DH(z, (typeof m === 'function' ? m(z) : m) * QDM(), kb, Object.assign({ x: hero.x - Math.cos(a) * 20 }, o)); }
      if (!q.fin && p >= 1) { q.fin = 1; if (done) done(hs); } } }));
    return Dp;
  }
  // ---- 黄 ----
  QG('qiang', 1, 'thrust', { name: '穿云刺', icon: '刺', need: 125, wu: .30, rc: .22, beam: true, len: 123,
    desc: '身前一道长 320 的白虹直刺，穿透不限，挂 1 层流血。LV3 流血 2 层；LV5 刺中第一个人处再往左右各裂一道斜枪气；LV7 流血 3 层，打已流血的人 +12%',
    cast() { const L = dlv(), a = aim(), bl = L >= 7 ? 3 : L >= 3 ? 2 : 1, m = L >= 7 ? z => 1.02 * (z.blT > 0 && z.bl > 0 ? 1.12 : 1) : 1.02;
      const hs = qT(hero.x, hero.y, a, 320, 46, m, 20, { bl }); sfx(SW, hero.x); shake = Math.max(shake, .06);
      if (L >= 5 && hs.length) { const f = hs.reduce((b, z) => dist(z, hero) < dist(b, hero) ? z : b); for (const s of [-1, 1]) qT(f.x, f.y, a + s * .52, 140, 30, .45, 20, { bl: 1, noL: 1 }); } } });
  QG('lianci', 1, 'thrust', { name: '点星刺', icon: '星', need: 92, wu: .32, rc: .22, beam: true, len: 92,
    desc: '锁定最近的敌人，向他连点三枪，第三枪更大、把人打退。LV3 每枪挂 1 层流血（本招最多 2 层）；LV5 再加一记回抽枪；LV7 本招流血最多 3 层，同时点第二近的敌人两枪',
    cast() { const L = dlv(), blMax = L >= 7 ? 3 : 2, bl = L >= 3 ? 1 : 0;
      const stab = (t, rad, m, kb) => { const a = Math.atan2((t.y - hero.y) * 2, t.x - hero.x); qFx(hero.x, hero.y, a, Math.max(10, dist(t, hero) - 6), .14); fx.push({ k: 'cut', n: 'dg6', x: t.x, y: t.y - 18, a: Math.atan2(Math.sin(a) * .5, Math.cos(a)), L: QS(rad) * .6, t: 0, T: .18, col: qCol() }); for (const z of near(t.x, t.y, QS(rad))) DH(z, m, kb, { bl, blMax, x: hero.x }); };
      const pick = () => { const a = aim(), t = nearest(QS(280)); return t || { x: hero.x + Math.cos(a) * QS(150), y: clampY(hero.y + Math.sin(a) * QS(75)) }; };
      const seq = [[48, .42, 10], [48, .42, 10], [62, .42, 45]].concat(L >= 5 ? [[70, 1.30, 60]] : []);
      DKO.push(dmk({ T: seq.length * .07 + .05, i: 0, tick(o) { while (o.i < seq.length && o.t >= o.i * .07) { const [r, m, kb] = seq[o.i], t = pick(); S.poseOverride = { f: o.i % 2 ? SK.lianci.pose[0] : SK.lianci.pose[1], t: .07 }; stab(t, r, m, kb);
        if (L >= 7 && o.i < 2) { const t2 = hittable().filter(z => z !== t && dist(z, hero) < QS(280)).sort((p, q) => dist(p, hero) - dist(q, hero))[0]; if (t2) stab(t2, 48, .42, 10); }
        if (o.i % 2 === 0) sfx(SW, hero.x); o.i++; } } })); } });
  QG('lansao', 1, 'sweep', { name: '拦江扫', icon: '拦', need: 98, wu: .34, rc: .24, range: 98, half: .873,
    desc: '枪杆横崩，扫开身前 100° 短扇，击退很强，专推贴脸的人。LV3 击退更远，被扫到的人挂 1 层流血；LV5 改成前后两段扫满一圈；LV7 两段都强击退、流血 2 层，出招后 0.35 秒自己受伤 −20%',
    cast() { const L = dlv(), a = aim(), kb = L >= 3 ? 119 : 85, bl = L >= 7 ? 2 : L >= 3 ? 1 : 0;
      if (L >= 5) { dSweep(hero.x, hero.y, a, Math.PI / 2, 130, 1.05, kb, { bl }); DKO.push(dmk({ T: .17, done: 0, tick(o) { if (!o.done && o.t >= .16) { o.done = 1; dSweep(hero.x, hero.y, a + Math.PI, Math.PI / 2, 130, .65, L >= 7 ? kb : 50, { bl, rev: true }); sfx(SW, hero.x); } } })); }
      else dSweep(hero.x, hero.y, a, .873, 130, 1.05, kb, { bl });
      if (L >= 7) S.qDR = DKT + .35; sfx(SW, hero.x); shake = Math.max(shake, .1); } });
  // ---- 玄 ----
  QG('tiaoqiang', 2, 'up', { name: '挑月枪', icon: '挑', need: 122, wu: .40, rc: .28, range: 122, half: .95,
    desc: '身前一横排枪尖从地里由近到远撩起（纵深 170、宽 240），把人挑飞（浮空）：落地再吃一下并晕 0.5 秒，之后 1.8 秒内受伤 +25%。LV3 落地时再挂 2 层流血；LV5 再撩第二浪、更远；LV7 浮空的人受伤 +45%，落地那一下 +50%',
    cast() { const L = dlv(), a = aim(), once = new Set(), fo = { up: 1, once, fkV: L >= 7 ? .45 : .25, fkBl: L >= 3 ? 2 : 0, fkLM: L >= 7 ? 1.5 : 1 };
      const row = (d0, d1, m) => { const ca = Math.cos(a), sa = Math.sin(a), px = -sa, py = ca; for (let k = -3; k <= 3; k++) { const dd = QS((d0 + d1) / 2), off = QS(240) / 2 * k / 3; fx.push({ k: 'cut', n: 'dg6', x: hero.x + ca * dd + px * off, y: hero.y + (sa * dd + py * off) * .5 - 14, a: -Math.PI / 2 + .25, L: QS(d1 - d0) * .35, t: 0, T: .28, col: qCol() }); }
        const x0 = hero.x + ca * QS(d0), y0 = hero.y + sa * QS(d0) * .5; dRect(x0, y0, a, QS(d1 - d0), QS(240) / 2, z => DH(z, m, 0, Object.assign({ x: hero.x }, fo))); };
      DKO.push(dmk({ T: L >= 5 ? .5 : .32, i: 0, tick(o) { const segs = [[0, 60], [55, 115], [110, 170]]; while (o.i < 3 && o.t >= o.i * .1) { row(segs[o.i][0], segs[o.i][1], 1.35); o.i++; } if (L >= 5 && o.i === 3 && o.t >= .18 + .2) { o.i = 4; row(60, 230, .90); sfx(SW, hero.x); } } }));
      sfx(SW, hero.x); shake = Math.max(shake, .1); } });
  QG('lihua', 2, 'spin', { name: '梨花扎', icon: '梨', need: 112, wu: .36, rc: .24, range: 112, half: Math.PI, ring: true,
    desc: '身周八方同时扎出八枪，像一朵梨花，每枪挂 1 层流血（本招最多 2 层）。LV3 每枪 2 层；LV5 八方变十六方，同一人能吃两枪；LV7 本招流血最多 4 层，目标身上每层流血让枪伤 +4%',
    cast() { const L = dlv(), a0 = aim(), N = L >= 5 ? 16 : 8, m0 = L >= 5 ? .85 : 1.55, blMax = L >= 7 ? 4 : 2, bl = L >= 3 ? 2 : 1, cnt = new Map(), cap = L >= 5 ? 2 : 1;
      const mf = z => { const c = cnt.get(z) || 0; if (c >= cap) return 0; cnt.set(z, c + 1); return m0 * (L >= 7 ? qBleedUp(.04, 4)(z) : 1); };
      for (let i = 0; i < N; i++) qT(hero.x, hero.y, a0 + i * Math.PI * 2 / N, 150, 36, mf, 25, { bl, blMax }); sfx(SW, hero.x); shake = Math.max(shake, .1); } });
  QG('chong', 2, 'thrust', { name: '破阵突', icon: '突', need: 116, wu: .34, rc: .28, beam: true, len: 116,
    desc: '平端长枪向前冲 150，一路穿透撞开两侧的人，挂 2 层流血；冲刺头 0.15 秒无敌，落点人太多会提前停下。LV3 流血 3 层；LV5 冲到头回身横扫身后 180°；LV7 冲过的路上留 3 秒枪痕，每 0.5 秒扎一下并挂流血',
    cast() { const L = dlv(), a = aim(), x0 = hero.x, y0 = hero.y; sfx(SW, hero.x); shake = Math.max(shake, .12);
      const Dp = qDash(a, 150, .18, 66, 1.70, 50, { bl: L >= 3 ? 3 : 2 }, .15, () => {
        if (L >= 5) { dSweep(hero.x, hero.y, a + Math.PI, Math.PI / 2, 140, .95, 90, { rev: true }); sfx(SW, hero.x); }
        if (L >= 7) DKO.push(dmk({ T: 3, nx: .5, tick(o) { if (o.t >= o.nx) { o.nx += .5; qFx(x0, y0, a, Dp, .25); dRect(x0, y0, a, Dp, QS(66) / 2, z => DH(z, .22, 0, { bl: 1, x: x0 })); } } })); }); } });
  QG('huimaq', 2, 'thrust', { name: '回马枪', icon: '马', need: 140, wu: .30, rc: .30, beam: true, len: 140,
    desc: '先后撤 100（后撤时无敌），枪尾顺手扫开身后的人，停一下再往前直刺一条长 360 的枪线，把人挑飞（浮空）。LV3 后撤 130、无敌更久；LV5 直刺变三道平行枪影；LV7 被挑飞的人落地时再炸一圈',
    cast() { const L = dlv(), a = aim(), back = a + Math.PI, fo = { up: 1, fkBoom: L >= 7 ? .90 : 0 }; sfx(SW, hero.x);
      qT(hero.x, hero.y, back, 90, 50, .30, 80, { noL: 1 });
      qDash(back, L >= 3 ? 130 : 100, .12, 40, 0, 0, {}, L >= 3 ? .18 : .12, () => later(.06, () => { S.poseOverride = { f: SK.huimaq.pose2, t: .2 }; const ca = Math.cos(a), sa = Math.sin(a), px = -sa * QS(55), py = ca * QS(55) * .5;
        qT(hero.x, hero.y, a, 360, 34, 1.40, 20, fo); if (L >= 5) for (const s of [-1, 1]) qT(hero.x + px * s, hero.y + py * s, a, 360, 30, .70, 20, fo);
        sfx(SW, hero.x); shake = Math.max(shake, .12); })); } });
  // ---- 地 ----
  QG('touqiang', 3, 'thrust', { name: '掷虹枪', icon: '虹', need: 190, wu: .55, rc: .35, beam: true, len: 190,
    desc: '掷出一杆光枪，直飞 440、一路穿透，挂 2 层流血（本招最多 3 层），飞到头炸开一圈。LV3 流血 3 层；LV5 三杆扇形齐掷，各自落点炸开；LV7 落点留 2.5 秒枪坑，每 0.5 秒扎一下并挂流血',
    cast() { const L = dlv(), a0 = aim(), sp = 950 * DK, three = L >= 5; sfx(SW, hero.x); shake = Math.max(shake, .12);
      const throwOne = (a, m1, m2, R) => { const Rr = QS(440) * QL(), hw = QS(54) / 2, b = { x: hero.x, y: hero.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp / 2, a, t: 0, T: Rr / sp, hitSet: [], nohit: 1, col: ['255,120,80', '255,240,220'], img: 'dg6', iw: 80, tc: hexRgb(SK.touqiang.color) }; bolts.push(b);
        DKO.push(dmk({ T: b.T + (L >= 7 ? 2.6 : .03), hs: new Set(), done: 0, nx: 0, tick(o) { if (!o.done) for (const z of hittable()) if (!o.hs.has(z) && Math.hypot(z.x - b.x, (z.y - b.y) * 2) < hw + 10) { o.hs.add(z); DH(z, m1, 0, { bl: L >= 3 ? 3 : 2, blMax: 3, x: b.x - b.vx }); }
          if (!o.done && o.t >= b.T) { o.done = 1; o.px = b.x; o.py = b.y; o.nx = o.t + .5; dCircle(b.x, b.y, R, m2, 50, { x: b.x }); sfx(CR, b.x); shake = Math.max(shake, .18); if (L >= 7) fx.push({ k: 'img', n: 'fx_aim', x: b.x, y: b.y, w: QS(110) * 2.3, t: 0, T: 2.5, col: '255,110,70', warn: 1 }); }
          if (o.done && L >= 7 && o.t >= o.nx) { o.nx += .5; for (const z of near(o.px, o.py, QS(110))) DH(z, .28, 0, { bl: 1, x: o.px }); } } })); };
      if (three) { throwOne(a0, 1.30, 1.15, 90); throwOne(a0 - .21, .75, .75, 90); throwOne(a0 + .21, .75, .75, 90); } else throwOne(a0, 1.30, 1.15, 120); } });
  QG('qianglin', 3, 'chop', { name: '林海刺', icon: '林', need: 165, wu: .62, rc: .42, range: 165, half: .6,
    desc: '身前一大片（纵深 60～300、宽 200）由近到远刺出 12 根枪尖，各挂 1 层流血（本招最多 3 层），之后留下一道枪篱 1.2 秒继续扎人。LV3 每根更重、流血 2 层；LV5 改成绕身两圈（先外圈后内圈）；LV7 枪篱留 2 秒，每下多挂 1 层流血',
    cast() { const L = dlv(), a = aim(), m = L >= 3 ? 1.45 : 1.25, bl = L >= 3 ? 2 : 1, cx = hero.x, cy = hero.y, ca = Math.cos(a), sa = Math.sin(a), hitN = new Map(), P = [];
      if (L >= 5) { for (let j = 0; j < 12; j++) { const g = j * Math.PI / 6; P.push([cx + Math.cos(g) * QS(170), cy + Math.sin(g) * QS(170) * .5]); } for (let j = 0; j < 8; j++) { const g = j * Math.PI / 4 + .3; P.push([cx + Math.cos(g) * QS(90), cy + Math.sin(g) * QS(90) * .5]); } }
      else for (let j = 0; j < 12; j++) { const d = QS(60 + 240 * (j + Math.random() * .6) / 12), off = QS(200) * (Math.random() - .5); P.push([cx + ca * d - sa * off, cy + (sa * d + ca * off) * .5]); }
      const gap = .5 / P.length, fenceT = L >= 7 ? 2 : 1.2; sfx(CR, hero.x); shake = Math.max(shake, .15);
      DKO.push(dmk({ T: .5 + fenceT, i: 0, nx: .5 + .4, tick(o) {
        while (o.i < P.length && o.t >= o.i * gap) { const [x, y] = P[o.i]; fx.push({ k: 'cut', n: 'dg6', x, y: y - 12, a: -Math.PI / 2, L: QS(52) * .45, t: 0, T: .4 + (o.t < .5 ? fenceT : 0) * .3, col: qCol() }); for (const z of near(x, y, QS(26))) { const c = hitN.get(z) || 0; if (c >= 2) continue; hitN.set(z, c + 1); DH(z, m, 15, { bl, blMax: 3, x }); } o.i++; }
        if (o.t >= o.nx) { o.nx += .4; for (const [x, y] of P) for (const z of near(x, y, QS(26))) DH(z, .30, 0, { bl: L >= 7 ? 1 : 0, blMax: 5, x }); } } })); } });
  QG('qijin', 3, 'thrust', { name: '游龙突', icon: '龙', need: 150, wu: .40, rc: .30, beam: true, len: 150,
    desc: '残影连突五段，每段冲一小步扎向最近的敌人，各挂 1 层流血（本招最多 4 层），第五段把人挑飞（浮空）；每段一瞬间无敌，身边人太多时那一段改成原地刺。LV3 每段流血 2 层；LV5 七段（七进七出）；LV7 连扎同一个人每段 +25%（最多 +100%），最后一段引爆 3 层流血',
    cast() { const L = dlv(), N = L >= 5 ? 7 : 5, step = L >= 5 ? 26 : 32, bl = L >= 3 ? 2 : 1; let last = null, chain = 0; sfx(SW, hero.x);
      DKO.push(dmk({ T: N * .12 + .05, i: 0, tick(o) { while (o.i < N && o.t >= o.i * .12) { const t = nearest(QS(240)), a = t ? Math.atan2((t.y - hero.y) * 2, t.x - hero.x) : aim(), lastSeg = o.i === N - 1;
        const crowd = near(hero.x, hero.y, QS(60)).length >= 5, mf = z => { const k = L >= 7 ? 1 + .25 * Math.min(4, z === last ? chain : 0) : 1; return .55 * k; }, so = { bl, blMax: 4, up: lastSeg ? 1 : 0 };
        hero.inv = Math.max(hero.inv || 0, .09);
        if (crowd) { const hs = qT(hero.x, hero.y, a, 96, 46, mf, 20, so); if (L >= 7 && lastSeg) hs.forEach(z => qBoom(z, .3, 3)); }
        else qDash(a, step, .09, 46, mf, 20, so, .09, hs => { if (L >= 7 && lastSeg) hs.forEach(z => qBoom(z, .3, 3)); });
        if (t) { chain = t === last ? chain + 1 : 0; last = t; } if (o.i % 2 === 0) sfx(SW, hero.x); o.i++; } } })); } });
  // ---- 天 ----
  QG('bainiao', 4, 'thrust', { name: '百鸟朝凤', icon: '凤', need: 176, wu: .68, rc: .38, range: 176, half: 1.05,
    desc: '身前 120° 扇面里，0.55 秒内依次扫出 18 道枪气（长 320），每道自己找人扎，各挂 1 层流血（可叠满 5 层），同一人最多吃 4 道。LV3 每道更重；LV5 扇面变成身周 360°；LV7 同一人每多吃一道 +12%（最多 +60%），流血满 5 层的人每道再多 0.30×',
    cast() { const L = dlv(), a = aim(), N = 18, gap = .55 / N, m0 = L >= 3 ? .88 : .78, cnt = new Map(); sfx(SW, hero.x); shake = Math.max(shake, .22);
      const mf = z => { const c = cnt.get(z) || 0; if (c >= 4) return 0; cnt.set(z, c + 1); return m0 * (L >= 7 ? 1 + .12 * Math.min(5, c) : 1) + (L >= 7 && z.blT > 0 && z.bl >= 5 ? .30 : 0); };
      DKO.push(dmk({ T: .6, i: 0, tick(o) { while (o.i < N && o.t >= o.i * gap) { let g;
        if (L >= 5) g = a + o.i * Math.PI * 2 / N; else { const cs = hittable().filter(z => dist(z, hero) < QS(320) && angDiff(Math.atan2((z.y - hero.y) * 2, z.x - hero.x), a) < 1.05 && (cnt.get(z) || 0) < 4); const z = cs.length ? cs[(Math.random() * cs.length) | 0] : null; g = z ? Math.atan2((z.y - hero.y) * 2, z.x - hero.x) : a + (Math.random() - .5) * 2.1; }
        S.poseOverride = { f: o.i % 2 ? SK.bainiao.pose[0] : SK.bainiao.pose[1], t: gap * 1.5 }; qT(hero.x, hero.y, g, 320, 24, mf, 10, { bl: 1, blMax: 5 }); if (o.i % 3 === 0) sfx(SW, hero.x); o.i++; } } })); } });
  QG('longyin', 4, 'chop', { name: '龙吟九霄', icon: '吟', need: 209, wu: .70, rc: .40, beam: true, len: 209,
    desc: '一枪砸地，龙形枪劲沿地面轰出 640（宽 160），一路穿透，把人挑飞（浮空）并挂 3 层流血，沿路留下龙息 2 秒；龙首到头炸开一圈、强击退。LV3 龙身更重、流血 4 层；LV5 一条龙变三条并行；LV7 龙首炸开时引爆路上每个人最多 3 层流血',
    cast() { const L = dlv(), a0 = aim(), x0 = hero.x, y0 = hero.y; sfx(CR, hero.x); shake = Math.max(shake, .35);
      const dragon = (a, len, m, last) => { const Ln = QS(len), hw = QS(160) / 2, T = Ln / QS(780), b = { x: x0, y: y0, vx: Math.cos(a) * Ln / T, vy: Math.sin(a) * Ln / T / 2, a, t: 0, T, hitSet: [], nohit: 1, col: ['110,216,255', '230,250,255'], img: 'dg4', iw: hw * 3, tc: hexRgb(SK.longyin.color) }; bolts.push(b);
        const hs = new Set(); DKO.push(dmk({ T: T + 2, nx: 0, ny: T + .4, done: 0, tick(o) {
          if (o.t < T) { if (o.t >= o.nx) { o.nx += .07; fx.push({ k: 'cut', n: 'dh2', x: b.x, y: b.y - 14, a: 0, L: hw * .5, t: 0, T: .35, col: hexRgb(SK.longyin.color) }); }
            for (const z of hittable()) if (!hs.has(z) && Math.hypot(z.x - b.x, (z.y - b.y) * 2) < hw + 10) { hs.add(z); DH(z, m, 30, { up: 1, bl: L >= 3 ? 4 : 3, x: b.x - b.vx }); } }
          else if (!o.done) { o.done = 1; if (last) { dCircle(b.x, b.y, 150, 1.05, 80, { x: b.x }); if (L >= 7) hs.forEach(z => qBoom(z, .35, 3)); sfx(CR, b.x); shake = Math.max(shake, .3); } }
          if (o.t >= o.ny && o.t < T + 2) { o.ny += .5; dRect(x0, y0, a, Ln, hw * .8, z => DH(z, .15, 0, { x: x0 })); } } })); };
      if (L >= 5) { dragon(a0, 640, 1.55, 1); dragon(a0 - .31, 520, 1.55, 0); dragon(a0 + .31, 520, 1.55, 0); } else dragon(a0, 640, L >= 3 ? 2.45 : 2.15, 1); } });
  for (const k of ['luoxuan', 'erduan', 'qianhou', 'sifang']) if (SK[k]) SK[k].off = true;   // 11/15：旧的枪招下架，枪只留这 12 招
  Object.assign(DRS1, { qiang: .70, lianci: .60, lansao: .75, tiaoqiang: .72, lihua: .75, chong: .58, huimaq: .62, touqiang: .78, qianglin: .80, qijin: .60, bainiao: 1.10, longyin: .90 });
  Object.assign(DSP1, { qiang: 1.12, lianci: 1.36, lansao: 1.16, tiaoqiang: 1.36, lihua: 1.20, chong: 1.36, huimaq: 1.40, touqiang: 1.80, qianglin: 2.08, qijin: 2.30, bainiao: 2.12, longyin: 2.20 });
  // ---------- 关刀（11/16 用户定）：大扇面、慢而重；刀头带吃满伤害、贴身刀杆 50%；主打破甲，满层「碎甲」 ----------
  //   黄：横云斩 开山斩 拖刀计　玄：车轮斩 破浪斩 立马斩 擒王斩　地：五关斩 卧月斩 旋刃阵　天：水淹七军 青龙偃月
  //   碎甲：关刀打中已有 3 层破甲的敌人 → 追加 0.5 倍（凤嘴刀 0.8 倍）、清掉破甲（凤嘴刀留 1 层）、震开；青龙偃月刀：碎甲后 3 秒关刀起手 ×0.85
  //   翻滚：前摇里翻滚 = 这招作废；已经放出去的刀浪、刀痕、残影、刀阵都挂在 DKO 上，照常结算
  const GDCOL = { hengti: '#4fb8ff', pidao: '#ffa030', xiongshou: '#ff4a3a', xuanfengd: '#3fe0b0', daoqi: '#4f8cff', handi: '#cfe0ff', zhanjiang: '#ffc24a', guowu: '#b46cff', yanyue: '#a8a8ff', tuodaoji: '#ff8a2a', shuiyan: '#7fd0ff', qinglong: '#4fe07a' };
  const GD = (k, tier, mot, o) => { add(k, Object.assign({ tier, dk: 1, key: k, color: GDCOL[k] }, o)); WOFX[k] = 4; MOTX[k] = mot; };
  const GS = n => n * DK * RM;                                    // 方案单位 → 像素
  const gCol = () => hexRgb(SK[CK] ? SK[CK].color : '#ffe0a0');
  const gEl = (z, on) => on && HAS('qinglongdao') && tough(z) ? 1.25 : 1;   // 青龙偃月刀：擒王斩、五关斩、青龙偃月打精锐首领 +25%
  function gSui(z, m) {   // 碎甲
    const fz = HAS('fengzui'); z.pj = 0; z.pjT = 0; DH(z, m * (fz ? .8 : .5), 110, { x: hero.x }); if (fz && !z.dead) { z.pj = 1; z.pjT = 5; }   // 凤嘴刀：碎甲后留 1 层
    floaters.push({ x: z.x, y: z.y - 70, t: 0, txt: '碎甲', color: '#9fd8ff' });
    fx.push({ k: 'burst', x: z.x, y: z.y, r: 26, t: 0, T: .35, col: '170,220,255' });
    if (HAS('qinglongdao')) S.gdSui = DKT;
  }
  function GH(z, m, kb, o = {}) {   // 关刀的一次命中（会触发碎甲）
    if (!z || z.dead) return false;
    const cap = o.suiAt || 3,   /* 11/16 用户：碎甲门槛 3 层（只带一两招关刀也能打出来） */ had = z.pjT > 0 ? z.pj || 0 : 0, mm = m * gEl(z, o.el);
    const r = DH(z, mm, kb, o);
    if (r && !z.dead && (had >= cap || o.suiForce)) gSui(z, mm);
    return r;
  }
  function gBand(x, y, a, half, R0, R1, T, hold) { const e = { k: 'gd', m: 'band', x, y, a, half, r0: R0, r1: R1, t: 0, T: T || .3, col: gCol(), hold }; fx.push(e); return e; }
  // 扇环：(x,y) 朝 a，半角 half，r0~r1（方案单位）；r0 以内是刀杆，伤害 ×0.5（眉尖刀 ×1）；o.hs 传一个 Set 就是「同一招每人只算一次」
  function gSweep(x, y, a, half, r0, r1, m, kb, o = {}, noFx) {
    const H = half * (HAS('meijian') ? 1.1 : 1), R0 = GS(r0), R1 = GS(r1), inner = HAS('meijian') ? 1 : .5;
    if (!noFx) { gBand(x, y, a, Math.min(Math.PI, H), R0, R1); if (DGM[CK] && DKT - (daoSlash.t || -9) > .06) daoSlash(CK, a, x, y); }
    return hittable().filter(z => {
      if (o.hs && o.hs.has(z)) return false;
      if (!inArc(x, y, z, a, Math.min(Math.PI, H), R1)) return false;
      const d = Math.hypot(z.x - x, (z.y - y) * 2), mm = (typeof m === 'function' ? m(z) : m) * (d < R0 ? inner : 1);
      if (!(mm > 0)) return false;
      if (o.hs) o.hs.add(z);
      return GH(z, mm, kb, Object.assign({ x }, o));
    });
  }
  function gdDraw(e) {
    if (e.m === 'swirl') return fanDraw(e);
    const p = e.t / e.T, al = e.hold ? (p < .8 ? 1 : (1 - p) / .2) : 1 - p;
    ctx.save(); ctx.translate(e.x, e.y - 6); ctx.scale(1, .5); ctx.lineCap = 'round';
    if (e.m === 'band') {
      const full = e.half >= Math.PI - .01, s0 = full ? 0 : e.a - e.half, s1 = full ? Math.PI * 2 : e.a + e.half, r1 = e.r1 * (e.hold ? 1 : .75 + .25 * Math.min(1, p * 3));
      ctx.fillStyle = `rgba(${e.col},${.2 * al})`; ctx.beginPath(); ctx.arc(0, 0, r1, s0, s1); ctx.arc(0, 0, Math.max(1, e.r0), s1, s0, true); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = `rgba(${e.col},${.85 * al})`; ctx.lineWidth = 8 * al + 2; ctx.beginPath(); ctx.arc(0, 0, Math.max(2, r1 - 5), s0, s1); ctx.stroke();
      ctx.strokeStyle = `rgba(255,255,255,${.85 * al})`; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(0, 0, r1, s0, s1); ctx.stroke();
    } else if (e.m === 'rect') {
      ctx.rotate(e.a); const L = e.L * (e.grow ? Math.min(1, e.t / e.grow) : 1);
      ctx.fillStyle = `rgba(${e.col},${.3 * al})`; ctx.fillRect(0, -e.w, L, e.w * 2);
      ctx.fillStyle = `rgba(255,240,200,${.85 * al})`; ctx.fillRect(0, -2, L, 4);
    } else if (e.m === 'wall') {
      ctx.rotate(e.a); ctx.fillStyle = `rgba(${e.col},${.35 * al})`; ctx.fillRect(e.d - 26, -e.hw, 26, e.hw * 2);
      ctx.fillStyle = `rgba(255,255,255,${.8 * al})`; ctx.fillRect(e.d - 5, -e.hw, 5, e.hw * 2);
    } else if (e.m === 'blades') {
      for (const b of e.pts) { ctx.save(); ctx.translate(b.x - e.x, (b.y - e.y) * 2); ctx.rotate(b.r);
        ctx.strokeStyle = `rgba(${e.col},${.9 * al})`; ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(0, 0, 13, -1.1, 1.1); ctx.stroke();
        ctx.strokeStyle = `rgba(255,255,255,${.9 * al})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 15, -1.1, 1.1); ctx.stroke(); ctx.restore(); }
    } else if (e.m === 'trail') {
      const P = e.pts; for (let i = 1; i < P.length; i++) { const q = i / P.length; ctx.strokeStyle = `rgba(${e.col},${.75 * al * q})`; ctx.lineWidth = 4 + 14 * q; ctx.beginPath(); ctx.moveTo(P[i - 1].x - e.x, (P[i - 1].y - e.y) * 2); ctx.lineTo(P[i].x - e.x, (P[i].y - e.y) * 2); ctx.stroke(); }
      if (P.length) { const h = P[P.length - 1]; ctx.fillStyle = `rgba(255,255,230,${.9 * al})`; ctx.beginPath(); ctx.arc(h.x - e.x, (h.y - e.y) * 2, 9, 0, 7); ctx.fill(); }
    }
    ctx.restore();
  }
  // ---- 黄 ----
  GD('hengti', 1, 'sweep', { name: '横云斩', icon: '云', need: 70, wu: .50, rc: .30, range: 120, half: 1.4,
    desc: '关刀横扫身前 160° 大扇面，刀头带（离身 40~120）吃满伤害，贴身的刀杆只有一半，挂 1 层破甲。LV3 破甲 2 层；LV5 扇面扩到 220°；LV7 击退加强',
    cast() { const L = dlv(), a = aim(); gSweep(hero.x, hero.y, a, (L >= 5 ? 110 : 80) * Math.PI / 180, 40, 120, 1.30, L >= 7 ? 110 : 70, { pj: L >= 3 ? 2 : 1 }); sfx(SW, hero.x); shake = Math.max(shake, .12); } });
  GD('pidao', 1, 'chop', { name: '开山斩', icon: '山', need: 100, wu: .55, rc: .30, beam: true, len: 200,
    desc: '向前竖劈，地上裂开一道长 200 的刀痕，由近到远依次判定，每人一次，挂 1 层破甲。LV3 破甲 2 层；LV5 刀痕尽头炸开一个小圆；LV7 刀痕留 1 秒，之后踩进去的敌人再吃一下',
    cast() { const L = dlv(), a = aim(), x0 = hero.x, y0 = hero.y, Lp = GS(200), w = GS(40) / 2, hs = new Set(), hs2 = new Set(), ex = x0 + Math.cos(a) * Lp, ey = clampY(y0 + Math.sin(a) * Lp * .5);
      fx.push({ k: 'gd', m: 'rect', x: x0, y: y0, a, L: Lp, w, grow: .3, t: 0, T: L >= 7 ? 1.3 : .5, col: gCol(), hold: L >= 7 }); sfx(SW, hero.x); shake = Math.max(shake, .14);
      DKO.push(dmk({ T: L >= 7 ? 1.3 : .32, b: 0, tick(o) { const reach = Math.min(1, o.t / .3) * Lp;
        dRect(x0, y0, a, reach, w, z => { if (!hs.has(z)) { hs.add(z); GH(z, 1.30, 40, { pj: L >= 3 ? 2 : 1, x: x0 }); } else if (L >= 7 && o.t > .35 && !hs2.has(z)) { hs2.add(z); GH(z, .30, 10, { x: x0 }); } });
        if (L >= 7 && o.t > .35) dRect(x0, y0, a, Lp, w, z => { if (!hs.has(z) && !hs2.has(z)) { hs2.add(z); GH(z, .30, 10, { x: x0 }); } });
        if (L >= 5 && !o.b && o.t >= .3) { o.b = 1; fx.push({ k: 'burst', x: ex, y: ey, r: GS(50), t: 0, T: .4, col: gCol() }); for (const z of near(ex, ey, GS(50))) GH(z, .60, 60, { x: ex }); } } })); } });
  GD('xiongshou', 1, 'up', { name: '拖刀计', icon: '拖', need: 70, wu: .55, rc: .35, range: 140, half: 1.57,
    desc: '佯装败退：往后撤一步（撤的时候短暂无敌），再回身向上撩出 180° 重斩，刀头带离身 40~140，击退很强，挂 1 层破甲。LV3 破甲 2 层；LV5 撤得更远、回身扇面扩到 240°；LV7 被撩中的敌人停住 0.3 秒',
    cast() { const L = dlv(), a = aim(), back = (L >= 5 ? 100 : 70) * DK; hero.inv = Math.max(hero.inv || 0, L >= 5 ? .3 : .22);
      DKO.push(dmk({ T: .26, done: 0, tick(o, dt) { if (o.t <= .2) { hero.x -= Math.cos(a) * back * dt / .2; hero.y = clampY(hero.y - Math.sin(a) * back * .5 * dt / .2); }
        if (!o.done && o.t >= .22) { o.done = 1; const hs = gSweep(hero.x, hero.y, a, (L >= 5 ? 120 : 90) * Math.PI / 180, 40, 140, 1.70, 140, { pj: L >= 3 ? 2 : 1 }); if (L >= 7) for (const z of hs) if (!tough(z)) stunz(z, .3); sfx(SW, hero.x); shake = Math.max(shake, .18); } } })); } });
  // ---- 玄 ----
  GD('xuanfengd', 2, 'spin', { name: '车轮斩', icon: '轮', need: 60, wu: .50, rc: .40, range: 130, half: Math.PI,
    desc: '关刀绕身抡两整圈，刀头带离身 50~130，每圈每人一次，每圈挂 1 层破甲。LV3 第二圈挂 2 层；LV5 抡三圈；LV7 每圈都往外推',
    cast() { const L = dlv(), n = L >= 5 ? 3 : 2;
      DKO.push(dmk({ T: n * .22 + .02, i: 0, tick(o) { while (o.i < n && o.t >= o.i * .22) { gSweep(hero.x, hero.y, 0, Math.PI, 50, 130, .75, L >= 7 ? 90 : 35, { pj: o.i >= 1 && L >= 3 ? 2 : 1 }); S.poseOverride = { f: SK.xuanfengd.pose[o.i % 2], t: .11 }; sfx(SW, hero.x); o.i++; } } })); shake = Math.max(shake, .12); } });
  GD('daoqi', 2, 'sweep', { name: '破浪斩', icon: '浪', need: 120, wu: .55, rc: .30, range: 160, half: .79,
    desc: '劈出一道 90° 的弧形刀浪，从离身 60 一路推到 260，越推越宽，每人一次，挂 1 层破甲。LV3 破甲 2 层；LV5 左右各多一道小浪（0.5 倍，和主浪共享命中）；LV7 推到尽头再卷回来一次（0.4 倍）',
    cast() { const L = dlv(), a = aim(), x0 = hero.x, y0 = hero.y, hs = new Set(), pj = L >= 3 ? 2 : 1, R = n => GS(n), T = .45;
      const waves = [[a, Math.PI / 4, 1.0]].concat(L >= 5 ? [[a - Math.PI / 6, Math.PI / 12, .5], [a + Math.PI / 6, Math.PI / 12, .5]] : []);
      const es = waves.map(w => gBand(x0, y0, w[0], w[1], R(30), R(60), T + .1, 1)); sfx(SW, hero.x); shake = Math.max(shake, .1);
      DKO.push(dmk({ T: L >= 7 ? T * 2 + .05 : T + .02, back: new Set(), tick(o) {
        const out = o.t <= T, p = out ? o.t / T : Math.max(0, 1 - (o.t - T) / T), r1 = R(60 + 200 * p), r0 = Math.max(0, r1 - R(40));
        waves.forEach((w, i) => { es[i].r0 = r0; es[i].r1 = r1; es[i].half = w[1] * (1 + .4 * p);
          for (const z of hittable()) { const d = Math.hypot(z.x - x0, (z.y - y0) * 2); if (d < r0 - 6 || d > r1 + 8 || angDiff(Math.atan2((z.y - y0) * 2, z.x - x0), w[0]) > es[i].half) continue;
            if (out) { if (!hs.has(z)) { hs.add(z); GH(z, w[2], 50, { pj, x: x0 }); } } else if (!o.back.has(z)) { o.back.add(z); GH(z, .4, 20, { x: x0 }); } } }); } })); } });
  GD('handi', 2, 'chop', { name: '立马斩', icon: '马', need: 75, wu: .75, rc: .35, range: 150, half: .87,
    desc: '原地站定重劈 100° 扇面，刀头带离身 40~150，伤害很高；对已有 2 层以上破甲的敌人再 +30%，挂 1 层破甲。LV3 破甲 2 层；LV5 扇面扩到 140°；LV7 只要 2 层破甲就能碎甲',
    cast() { const L = dlv(), a = aim(); gSweep(hero.x, hero.y, a, (L >= 5 ? 70 : 50) * Math.PI / 180, 40, 150, z => 1.80 * ((z.pjT > 0 ? z.pj || 0 : 0) >= 2 ? 1.3 : 1), 100, { pj: L >= 3 ? 2 : 1, suiAt: L >= 7 ? 2 : 0 }); sfx(SW, hero.x); shake = Math.max(shake, .22); } });
  GD('zhanjiang', 2, 'chop', { name: '擒王斩', icon: '王', need: 110, wu: .65, rc: .35, range: 60, half: .8,
    desc: '锁定 220 内血最多的敌人（首领、精锐优先），一道刀光落在它身上，身边 50 内的人也挨一下。本体挂 1 层破甲。LV3 本体破甲 2 层；LV5 再追砍血第二多的敌人（0.6 倍）；LV7 本体伤害 +20%',
    cast() { const L = dlv(), rng = GS(220), pri = z => (tough(z) ? 1e6 : 0) + (z.hp || 0), cs = hittable().filter(z => dist(z, hero) < rng).sort((p, q) => pri(q) - pri(p));
      const t = cs[0] || nearest(rng); if (!t) return;
      const strike = (z, m, pj) => { const a = Math.atan2((z.y - hero.y) * 2, z.x - hero.x); fx.push({ k: 'cut', n: 'dh2', x: z.x, y: z.y - 20, a, L: 34, t: 0, T: .3, col: gCol() }); fx.push({ k: 'burst', x: z.x, y: z.y, r: GS(50), t: 0, T: .35, col: gCol() });
        GH(z, m, 60, { pj, x: hero.x, el: 1 }); for (const q of near(z.x, z.y, GS(50))) if (q !== z) GH(q, .60, 40, { x: z.x }); };
      strike(t, L >= 7 ? 2.64 : 2.20, L >= 3 ? 2 : 1); sfx(SW, hero.x); shake = Math.max(shake, .16);
      if (L >= 5 && cs[1]) later(.12, () => strike(cs[1], 1.32, 1)); } });
  // ---- 地 ----
  GD('guowu', 3, 'thrust', { name: '五关斩', icon: '关', need: 140, wu: .60, rc: .40, range: 70, half: 1.05,
    desc: '分出残影，依次瞬斩 5 个不同的敌人，每到一人就在它身上劈一个 120° 小扇面（半径 70），本体站着不动；每关挂 1 层破甲，同一人最多吃 2 下。LV3 每关破甲 2 层；LV5 增至 7 关；LV7 最后一关伤害 ×2',
    cast() { const L = dlv(), n = L >= 5 ? 7 : 5, rng = GS(260), cnt = new Map(), seen = new Set(); let px = hero.x, py = hero.y;
      DKO.push(dmk({ T: n * .1 + .05, i: 0, tick(o) { while (o.i < n && o.t >= o.i * .1) {
        const t = hittable().filter(z => !seen.has(z) && dist(z, hero) < rng).sort((p, q) => Math.hypot(p.x - px, (p.y - py) * 2) - Math.hypot(q.x - px, (q.y - py) * 2))[0];
        if (!t) { o.i = n; break; } seen.add(t); const a = Math.atan2((t.y - py) * 2, t.x - px);
        ghost(px, py, t.x - Math.cos(a) * 12, t.y - Math.sin(a) * 6, a, SK.guowu.pose[1], .3);
        const m = (o.i === n - 1 && L >= 7 ? 2 : 1) * .90;
        gSweep(t.x - Math.cos(a) * 14, t.y - Math.sin(a) * 7, a, Math.PI / 3, 0, 70, z => { const c = cnt.get(z) || 0; if (c >= 2) return 0; cnt.set(z, c + 1); return m; }, 40, { pj: L >= 3 ? 2 : 1, el: 1 });
        px = t.x; py = t.y; sfx(SW, hero.x); o.i++; } } })); shake = Math.max(shake, .1); } });
  GD('yanyue', 3, 'chop', { name: '卧月斩', icon: '卧', need: 70, wu: .70, rc: .40, range: 160, half: 1.57,
    desc: '在前方地上劈出一道巨大的月牙刀痕（180° 弧，离身 80~160），落地伤害一次，之后留 2 秒、每 0.5 秒再判定一次；落地挂 1 层破甲。LV3 每跳都挂 1 层破甲；LV5 改成前后两道月牙；LV7 刀痕消失时炸一次（0.8 倍）',
    cast() { const L = dlv(), a = aim(), x0 = hero.x, y0 = hero.y, dirs = L >= 5 ? [a, a + Math.PI] : [a];
      dirs.forEach(d => gBand(x0, y0, d, Math.PI / 2, GS(80), GS(160), 2.2, 1)); sfx(SW, hero.x); shake = Math.max(shake, .16);
      const hit = (m, kb, pj) => { const hs = new Set(); for (const d of dirs) gSweep(x0, y0, d, Math.PI / 2, 80, 160, m, kb, { pj, hs }, true); };
      hit(1.0, 60, 1);
      DKO.push(dmk({ T: 2.05, n: 1, tick(o) { while (o.n <= 4 && o.t >= o.n * .5) { if (o.n < 4) hit(.30, 0, L >= 3 ? 1 : 0); else if (L >= 7) { hit(.80, 80, 0); fx.push({ k: 'burst', x: x0, y: y0, r: GS(160), t: 0, T: .4, col: gCol() }); } o.n++; } } })); } });
  GD('tuodaoji', 3, 'spin', { name: '旋刃阵', icon: '刃', need: 55, wu: .55, rc: .30, range: 110, half: Math.PI,
    desc: '3 把关刀虚影绕身转 3 秒（半径 110），边走边转；碰到的敌人受伤，同一人每 0.5 秒最多一次；第一次碰到挂 1 层破甲。LV3 每次碰到都挂 1 层破甲；LV5 增至 4 把；LV7 结束时虚影往外飞出（0.8 倍，贯穿）',
    cast() { const L = dlv(), n = L >= 5 ? 4 : 3, R = GS(110), last = new Map(), got = new Set(), e = { k: 'gd', m: 'blades', x: hero.x, y: hero.y, pts: [], t: 0, T: 3, col: gCol(), hold: 1 }; fx.push(e); sfx(SW, hero.x);
      DKO.push(dmk({ T: 3.02, fin: 0, tick(o) { const th = o.t * 3.2; e.x = hero.x; e.y = hero.y;
        e.pts = Array.from({ length: n }, (_, i) => { const b = th + i * Math.PI * 2 / n; return { x: hero.x + Math.cos(b) * R, y: hero.y + Math.sin(b) * R * .5, r: b + Math.PI / 2, b }; });
        for (const p of e.pts) for (const z of near(p.x, p.y, GS(26))) { if (DKT - (last.get(z) || -9) < .5) continue; last.set(z, DKT); const first = !got.has(z); got.add(z); GH(z, .45, 30, { pj: L >= 3 || first ? 1 : 0, x: hero.x }); }
        if (L >= 7 && !o.fin && o.t >= 2.98) { o.fin = 1; for (const p of e.pts) { fx.push({ k: 'gd', m: 'rect', x: p.x, y: p.y, a: p.b, L: GS(150), w: 8, grow: .15, t: 0, T: .3, col: gCol() }); dRect(p.x, p.y, p.b, GS(150), GS(20), z => GH(z, .80, 60, { x: p.x })); } } } })); } });
  // ---- 天 ----
  GD('shuiyan', 4, 'up', { name: '水淹七军', icon: '水', need: 130, wu: .90, rc: .50, range: 200, half: .6,
    desc: '一刀劈出宽 280 的大浪往前推 260，浪里的敌人被卷着一起走（精锐、首领只被推一下），每人最多被卷 3 下，到尽头浪碎再重击一次并挂 1 层破甲。LV3 浪碎破甲 2 层；LV5 改成左右斜着交叉的两道浪；LV7 浪碎处必定碎甲',
    cast() { const L = dlv(), a0 = aim(), x0 = hero.x, y0 = hero.y, D = GS(260), hw = GS(280) / 2, T = .9, cnt = new Map(), crash = new Set();
      const dirs = L >= 5 ? [a0 - .35, a0 + .35] : [a0], es = dirs.map(a => { const e = { k: 'gd', m: 'wall', x: x0, y: y0, a, d: 0, hw: L >= 5 ? hw * .75 : hw, t: 0, T: T + .25, col: gCol(), hold: 1 }; fx.push(e); return e; });
      sfx(SW, hero.x); shake = Math.max(shake, .25);
      DKO.push(dmk({ T: T + .05, tk: 0, fin: 0, tick(o, dt) { const d = Math.min(1, o.t / T) * D, tickNow = o.t >= o.tk; if (tickNow) o.tk += .25;
        dirs.forEach((a, i) => { es[i].d = d; const ca = Math.cos(a), sa = Math.sin(a), hwi = es[i].hw;
          for (const z of hittable()) { const dx = z.x - x0, dy = (z.y - y0) * 2, al = dx * ca + dy * sa, pe = Math.abs(-dx * sa + dy * ca); if (pe > hwi || al > d + 4 || al < d - GS(60)) continue;
            if (!tough(z)) { const push = Math.max(0, d - al) + 2; z.x = Math.max(arenaL + 14, Math.min(lockR - 14, z.x + ca * push)); z.y = clampY(z.y + sa * push * .5); }
            const c = cnt.get(z) || 0; if (tickNow && c < 3) { cnt.set(z, c + 1); GH(z, .50, tough(z) ? 40 : 0, { x: x0 }); } } });
        if (!o.fin && o.t >= T) { o.fin = 1; shake = Math.max(shake, .3);
          dirs.forEach((a, i) => { const ex = x0 + Math.cos(a) * D, ey = clampY(y0 + Math.sin(a) * D * .5); fx.push({ k: 'burst', x: ex, y: ey, r: GS(110), t: 0, T: .5, col: '200,235,255' });
            for (const z of near(ex, ey, GS(110))) if (!crash.has(z)) { crash.add(z); GH(z, 2.0, 120, { pj: L >= 3 ? 2 : 1, x: ex, suiForce: L >= 7 }); } }); } } })); } });
  GD('qinglong', 4, 'up', { name: '青龙偃月', icon: '龙', need: 120, wu: .90, rc: .50, range: 180, half: Math.PI,
    desc: '青龙刀气从地面腾起，绕身盘两圈（半径 180，碰到就伤，每圈每人一次），然后俯冲扎进敌人最密的地方炸开（半径 100），挂 2 层破甲。LV3 俯冲破甲 3 层；LV5 盘三圈；LV7 炸开后再荡出一圈 0.8 倍的波',
    cast() { const L = dlv(), loops = L >= 5 ? 3 : 2, R = GS(180), TL = .55, TO = loops * TL, e = { k: 'gd', m: 'trail', x: hero.x, y: hero.y, pts: [], t: 0, T: TO + .5, col: gCol(), hold: 1 }; fx.push(e); sfx(SW, hero.x); shake = Math.max(shake, .2);
      let sets = [], tgt = null;
      DKO.push(dmk({ T: TO + .5, fin: 0, w: 0, tick(o) {
        if (o.t < TO) { const li = Math.floor(o.t / TL), th = o.t / TL * Math.PI * 2, hx = hero.x + Math.cos(th) * R, hy = hero.y + Math.sin(th) * R * .5; sets[li] = sets[li] || new Set();
          e.x = hero.x; e.y = hero.y; e.pts.push({ x: hx, y: hy }); if (e.pts.length > 14) e.pts.shift();
          for (const z of near(hx, hy, GS(40))) if (!sets[li].has(z)) { sets[li].add(z); GH(z, .60, 40, { pj: 1, x: hero.x, el: 1 }); } return; }
        if (!tgt) { const cs = hittable().filter(z => dist(z, hero) < GS(320)); tgt = cs.length ? cs.reduce((b, z) => near(z.x, z.y, GS(100)).length > near(b.x, b.y, GS(100)).length ? z : b) : { x: hero.x + Math.cos(aim()) * GS(120), y: hero.y }; tgt = { x: tgt.x, y: tgt.y }; o.s = e.pts.length ? e.pts[e.pts.length - 1] : { x: hero.x, y: hero.y - 40 }; }
        const p = Math.min(1, (o.t - TO) / .2); e.pts.push({ x: o.s.x + (tgt.x - o.s.x) * p, y: o.s.y + (tgt.y - o.s.y) * p }); if (e.pts.length > 14) e.pts.shift();
        if (!o.fin && p >= 1) { o.fin = 1; shake = Math.max(shake, .35); fx.push({ k: 'burst', x: tgt.x, y: tgt.y, r: GS(100), t: 0, T: .5, col: gCol() });
          for (const z of near(tgt.x, tgt.y, GS(100))) GH(z, 2.60, 120, { pj: L >= 3 ? 3 : 2, x: tgt.x, el: 1 }); }
        if (L >= 7 && o.fin && !o.w && o.t >= TO + .42) { o.w = 1; gBand(tgt.x, tgt.y, 0, Math.PI, GS(100), GS(170), .4); gSweep(tgt.x, tgt.y, 0, Math.PI, 100, 170, .80, 80, {}, true); } } })); } });
  Object.assign(DRS1, { hengti: .80, pidao: .80, xiongshou: .80, xuanfengd: .75, daoqi: .75, handi: .75, zhanjiang: .75, guowu: .80, yanyue: .75, tuodaoji: .70, shuiyan: 1.0, qinglong: 1.0 });
  Object.assign(DSP1, { hengti: 1.45, pidao: 1.45, xiongshou: 1.45, xuanfengd: 1.40, daoqi: 1.50, handi: 1.60, zhanjiang: 1.50, guowu: 2.00, yanyue: 2.20, tuodaoji: 1.90, shuiyan: 2.30, qinglong: 2.20 });
  // ---------- 羽扇（11/16 用户定）：军师扇——风控 + 护身；主打迟缓，专属「迷乱」「风撞」 ----------
  //   黄：清风扇 飞蝶扇 回风引　玄：沙尘卷 迷魂蝶 飞霜羽 穿堂风　地：八阵图 旋风眼 乾坤屏　天：借东风 奇门遁甲
  //   风撞：被羽扇推开/吹飞的普通兵 0.4 秒内撞到别人 → 双方各 0.3 倍（鹤羽扇 0.5）；同一人 0.5 秒一次；七星羽扇：被撞的也飞出去，最多连 3 次
  //   迷乱：1.5 秒乱走不出手（精锐减半，首领免疫）；拉/吸的终点离主角至少 FMIN；精锐首领不被拉、推一半
  const FCOL = { shanfeng: '#5fc0ff', liuying: '#e070ff', huifeng: '#3fd8b0', longjuan: '#e0b040', mihun: '#a070ff', shuangxue: '#bfe6ff', lianying: '#4f8cff', bazhen: '#ffc24a', huoyu: '#8fc8a8', chibi: '#d8f4ff', dongfeng: '#7fe0ff', qimen: '#c070ff' };
  const FA = (k, tier, mot, o) => { add(k, Object.assign({ tier, dk: 1, key: k, color: FCOL[k] }, o)); WOFX[k] = 9; MOTX[k] = mot; };
  const FS = n => n * DK * RM, FMIN = () => Math.max(40, FS(80));
  const isBoss = z => !!(z.T && (z.T.boss || z.T.chapterBoss)) || !!z.survBoss;
  const fDur = () => HAS('qixingshan') ? 2 : 0;
  function addML(z, t) {   // 迷乱
    if (!z || z.dead || isBoss(z)) return; t = (t + (HAS('kongque') ? .5 : 0)) * (tough(z) ? .5 : 1);
    if (!(z.mlT > 0)) { floaters.push({ x: z.x, y: z.y - 58, t: 0, txt: '迷乱', color: '#d0a0ff' }); if (z.st && !['move', 'idle', 'hurt'].includes(z.st) && typeof set === 'function') set(z, 'move'); }
    z.mlT = Math.max(z.mlT || 0, t);
  }
  function FH(z, m, kb, o = {}) {   // 羽扇的一次命中：o.sl 挂迟缓（o.slx 多几秒）/ o.ml 迷乱秒数
    if (!z || z.dead) return false;
    const mm = m * (HAS('kongque') && z.slT > 0 ? 1.15 : 1) * (z.mlT > 0 && lvOf('mihun') >= 7 ? 1.25 : 1) * (o.slowBonus && z.slT > 0 ? o.slowBonus : 1);
    const r = DH(z, mm, kb, o); if (!r || z.dead) return r;
    if (o.sl) addSL(z, (o.slx || 0) + (HAS('kongque') ? 1 : 0));
    if (o.ml) addML(z, o.ml);
    return r;
  }
  const inBand = (x, y, z, a, half, R0, R1) => { const d = Math.hypot(z.x - x, (z.y - y) * 2); return d >= R0 - 6 && d <= R1 + 8 && (half >= Math.PI || d < 10 || angDiff(Math.atan2((z.y - y) * 2, z.x - x), a) <= half); };
  const PUSH = [], SCR = [];
  // 推：沿 (ax,ay)（未压扁的单位向量）推 D 像素，T 秒；o.cmul 风撞倍率，o.force 结束时没撞到也算一次风撞
  function fPush(z, ax, ay, D, T, o = {}) {
    if (!z || z.dead) return; if (tough(z)) D *= .5; if (isBoss(z)) D *= .6; D *= HAS('heyu') ? 1.25 : 1;
    PUSH.push({ z, vx: ax * D / T, vy: ay * D / T * .5, t: T, crash: o.crash !== false, force: !!o.force, cmul: o.cmul || 1, depth: o.depth || 0, cm: CM, ck: CK, rm: RM });
  }
  function fPull(z, tx, ty, T, o = {}) {   // 拉到 (tx,ty)；终点离主角不够远就往外挪
    if (!z || z.dead || tough(z)) return;
    const dh = Math.hypot(tx - hero.x, (ty - hero.y) * 2), mn = FMIN(); if (dh < mn) { const a = Math.atan2((ty - hero.y) * 2, tx - hero.x) || 0; tx = hero.x + Math.cos(a) * mn; ty = hero.y + Math.sin(a) * mn * .5; }
    const D = Math.hypot(tx - z.x, ty - z.y) * (HAS('heyu') ? 1 : 1);
    PUSH.push({ z, vx: (tx - z.x) / T, vy: (clampY(ty) - z.y) / T, t: T, crash: !!o.crash, force: false, cmul: o.cmul || 1, depth: 0, cm: CM, ck: CK, rm: RM, D });
  }
  const pushAway = (z, x, y, D, T, o) => { const a = Math.atan2((z.y - y) * 2, z.x - x) || 0; fPush(z, Math.cos(a), Math.sin(a), D, T, o); };
  function fCrash(e, z, q) {
    const c = CM, k = CK, r = RM; CM = e.cm; CK = e.ck; RM = e.rm;
    const m = (HAS('heyu') ? .5 : .3) * e.cmul * (S.dfT > 0 && lvOf('dongfeng') >= 3 ? 2 : 1);
    DH(z, m, 0); if (q) DH(q, m, 0); z.fzAt = DKT; if (q) q.fzAt = DKT;
    fx.push({ k: 'burst', x: q ? (z.x + q.x) / 2 : z.x, y: q ? (z.y + q.y) / 2 : z.y, r: 16, t: 0, T: .28, col: '220,240,255' });
    if (q && HAS('qixingshan') && e.depth < 3 && !q.dead) { const l = Math.hypot(e.vx, e.vy * 2) || 1; CM = e.cm; CK = e.ck; RM = e.rm; fPush(q, e.vx / l, e.vy * 2 / l, 40, .3, { depth: e.depth + 1, cmul: e.cmul }); }
    CM = c; CK = k; RM = r;
  }
  function fanTick(dt) {
    if (S.dfT > 0) S.dfT -= dt;
    for (let i = PUSH.length - 1; i >= 0; i--) {
      const e = PUSH[i], z = e.z; e.t -= dt;
      if (z.dead) { PUSH.splice(i, 1); continue; }
      z.x = Math.max(arenaL + 14, Math.min(lockR - 14, z.x + e.vx * dt)); z.y = clampY(z.y + e.vy * dt);
      if (e.crash && !e.done && !(DKT - (z.fzAt || -9) < .5)) {
        const q = hittable().find(q => q !== z && !(DKT - (q.fzAt || -9) < .5) && Math.hypot(q.x - z.x, (q.y - z.y) * 2) < 18);
        if (q) { e.done = 1; fCrash(e, z, q); }
      }
      if (e.t <= 0) { if (e.force && !e.done) { const q = hittable().filter(q => q !== z && Math.hypot(q.x - z.x, (q.y - z.y) * 2) < 40).sort((a, b) => dist(a, z) - dist(b, z))[0]; fCrash(e, z, q || null); } PUSH.splice(i, 1); }
    }
    for (let i = SCR.length - 1; i >= 0; i--) { const s = SCR[i]; s.t += dt; if (s.t >= s.T) { SCR.splice(i, 1); continue; } scrTick(s, dt); }
  }
  // 乾坤屏：拦下敌方飞行道具（箭、石子、剑气、火球、投石）
  function scrIn(s, x, y) { const R = s.R, d = Math.hypot(x - hero.x, (y - hero.y) * 2); if (d < R - 16 || d > R + 16) return false; return s.half >= Math.PI || angDiff(Math.atan2((y - hero.y) * 2, x - hero.x), s.a) <= s.half; }
  function scrTick(s) {
    if (typeof eshots === 'undefined') return;
    const t0 = nearest(200); if (t0) s.a = Math.atan2((t0.y - hero.y) * 2, t0.x - hero.x); s.e.x = hero.x; s.e.y = hero.y; s.e.a = s.a;
    for (let i = eshots.length - 1; i >= 0; i--) { const p = eshots[i]; let x, y;
      if (p.k === 'stone' || p.k === 'arrow' || p.k === 'enemyWave') { x = p.x; y = p.y; } else if (p.x0 != null && p.T > 0) { const q = Math.min(1, p.t / p.T); if (q < .4) continue; x = p.x0 + (p.tx - p.x0) * q; y = p.y0 + (p.ty - p.y0) * q; } else continue;
      if (!scrIn(s, x, y)) continue;
      eshots.splice(i, 1); fx.push({ k: 'burst', x, y, r: 12, t: 0, T: .25, col: '220,250,255' });
      if (s.L >= 7) { const c = CM, k = CK, r = RM; CM = s.cm; CK = s.ck; RM = s.rm; const src = p.source && !p.source.dead ? p.source : nearest(300); if (src) { fx.push({ k: 'line', x, y, a: Math.atan2((src.y - y) * 2, src.x - x), L: Math.hypot(src.x - x, (src.y - y) * 2), w: 3, t: 0, T: .25, col: '220,250,255' }); FH(src, .6, 20); } CM = c; CK = k; RM = r; } }
    const c = CM, k = CK, r = RM; CM = s.cm; CK = s.ck; RM = s.rm;
    for (const z of hittable()) { if (!scrIn(s, z.x, z.y)) continue; if (DKT - (s.last.get(z) || -9) < .5) continue; s.last.set(z, DKT); FH(z, .40, 0, { sl: s.L >= 3 }); pushAway(z, hero.x, hero.y, 60, .2, { crash: true }); }
    CM = c; CK = k; RM = r;
  }
  function fanDraw(e) {   // 旋风（龙卷、风眼）
    const p = e.t / e.T, al = e.hold ? (p < .85 ? 1 : (1 - p) / .15) : 1 - p;
    ctx.save(); ctx.translate(e.x, e.y - 8); ctx.scale(1, .5);
    for (let i = 0; i < 3; i++) { const r = e.r * (.45 + i * .27), s = e.t * (7 - i * 1.5) + i * 2; ctx.strokeStyle = `rgba(${e.col},${(.75 - i * .15) * al})`; ctx.lineWidth = 5 - i; ctx.beginPath(); ctx.arc(0, 0, r, s, s + 4.2); ctx.stroke(); }
    ctx.strokeStyle = `rgba(255,255,255,${.6 * al})`; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 0, e.r, e.t * 9, e.t * 9 + 2.5); ctx.stroke();
    ctx.restore();
  }
  const fSwirl = (x, y, r, T, hold) => { const e = { k: 'gd', m: 'swirl', x, y, r, t: 0, T, col: gCol(), hold }; fx.push(e); return e; };
  // ---- 黄 ----
  FA('shanfeng', 1, 'sweep', { name: '清风扇', icon: '风', need: 70, wu: .35, rc: .25, range: 110, half: .87,
    desc: '向身前 100° 扇出清风（离身 30~110），扇到的人往外推 80，推出去撞到别人就是风撞。LV3 推 110；LV5 扇面扩到 160°；LV7 风撞伤害 +50%',
    cast() { const L = dlv(), a = aim(), half = (L >= 5 ? 80 : 50) * Math.PI / 180; gBand(hero.x, hero.y, a, half, FS(30), FS(110)); sfx(SW, hero.x);
      for (const z of hittable().filter(z => inBand(hero.x, hero.y, z, a, half, FS(30), FS(110)))) { FH(z, .80, 0); pushAway(z, hero.x, hero.y, FS(L >= 3 ? 110 : 80), .25, { cmul: L >= 7 ? 1.5 : 1 }); } } });
  FA('liuying', 1, 'thrust', { name: '飞蝶扇', icon: '蝶', need: 140, wu: .35, rc: .25, beam: true, len: 180,
    desc: '把扇子扔出去，直飞 180 再旋回手里，去程、回程各打一次（路宽 30）。LV3 打中挂迟缓；LV5 回程变大一圈；LV7 去程打中的第一个人 ×1.5',
    cast() { const L = dlv(), a = aim(), x0 = hero.x, y0 = hero.y, D = FS(180), T = .32, h1 = new Set(), h2 = new Set(), e = { k: 'gd', m: 'blades', x: x0, y: y0, pts: [], t: 0, T: T * 2 + .05, col: gCol(), hold: 1 }; fx.push(e); sfx(SW, hero.x);
      let first = true;
      DKO.push(dmk({ T: T * 2 + .05, tick(o) { const out = o.t <= T, p = out ? o.t / T : 1 - (o.t - T) / T, bx = out ? x0 + Math.cos(a) * D * p : hero.x + (x0 + Math.cos(a) * D - hero.x) * Math.max(0, p), by = out ? y0 + Math.sin(a) * D * p * .5 : hero.y + (y0 + Math.sin(a) * D * .5 - hero.y) * Math.max(0, p);
        e.x = bx; e.y = by; e.pts = [{ x: bx, y: by, r: o.t * 20 }];
        for (const z of near(bx, by, FS(out ? 15 : L >= 5 ? 25 : 15) + 6)) { const hs = out ? h1 : h2; if (hs.has(z)) continue; hs.add(z); FH(z, .60 * (out && first && L >= 7 ? 1.5 : 1), 10, { sl: L >= 3 }); if (out) first = false; } } })); } });
  FA('huifeng', 1, 'up', { name: '回风引', icon: '引', need: 140, wu: .40, rc: .30, range: 150, half: .61,
    desc: '把前方 70°、150 以内的人（最多 6 人）吸到身前 80 处，一到就被小风推开一点——把散开的人聚成一团摆在你前面。精锐首领吸不动。LV3 挂迟缓；LV5 吸过来时互相撞，触发风撞；LV7 吸过来的人迷乱 0.6 秒',
    cast() { const L = dlv(), a = aim(), cs = hittable().filter(z => inBand(hero.x, hero.y, z, a, .61, 0, FS(150))).sort((p, q) => dist(p, hero) - dist(q, hero)).slice(0, 6);
      gBand(hero.x, hero.y, a, .61, FMIN(), FS(150)); sfx(SW, hero.x);
      const tx = hero.x + Math.cos(a) * FMIN(), ty = hero.y + Math.sin(a) * FMIN() * .5;
      for (const z of cs) { FH(z, .50, 0, { sl: L >= 3 }); if (dist(z, { x: tx, y: ty }) > 10) fPull(z, tx + (Math.random() - .5) * 16, ty + (Math.random() - .5) * 8, .25, { crash: L >= 5 }); }
      DKO.push(dmk({ T: .3, done: 0, tick(o) { if (!o.done && o.t >= .27) { o.done = 1; for (const z of cs) if (!z.dead) { if (L >= 7) addML(z, .6); pushAway(z, hero.x, hero.y, FS(20), .15, { crash: false }); } } } })); } });
  // ---- 玄 ----
  FA('longjuan', 2, 'spin', { name: '沙尘卷', icon: '卷', need: 160, wu: .50, rc: .30, beam: true, len: 220,
    desc: '放出一股小龙卷沿直线走 220（宽 50），卷进来的人被带着走、挂迟缓，每 0.3 秒受伤（最多 3 下），走到尽头甩出去 60。精锐首领只挨打不被卷。LV3 迟缓多 1 秒；LV5 左右各一股；LV7 甩出去必定风撞',
    cast() { const L = dlv(), a0 = aim(), x0 = hero.x, y0 = hero.y, D = FS(220), T = 1.0, dirs = L >= 5 ? [a0 - .35, a0 + .35] : [a0], cnt = new Map(), cap = new Set();
      const es = dirs.map(() => fSwirl(x0, y0, FS(25) + 8, T + .1, 1)); sfx(SW, hero.x);
      DKO.push(dmk({ T: T + .02, tk: 0, fin: 0, tick(o) { const p = Math.min(1, o.t / T), tickNow = o.t >= o.tk; if (tickNow) o.tk += .3;
        dirs.forEach((a, i) => { const cx = x0 + Math.cos(a) * D * p, cy = clampY(y0 + Math.sin(a) * D * p * .5); es[i].x = cx; es[i].y = cy;
          for (const z of near(cx, cy, FS(25))) { if (!tough(z)) { cap.add(z); z.x = z.x + (cx - z.x) * .35; z.y = clampY(z.y + (cy - z.y) * .35); }
            const c = cnt.get(z) || 0; if (tickNow && c < 3) { cnt.set(z, c + 1); FH(z, .30, 0, { sl: 1, slx: L >= 3 ? 1 : 0 }); } } });
        if (!o.fin && p >= 1) { o.fin = 1; for (const z of cap) if (!z.dead) { const a = dirs.length > 1 ? (Math.abs(angDiff(Math.atan2((z.y - y0) * 2, z.x - x0), dirs[0])) < Math.abs(angDiff(Math.atan2((z.y - y0) * 2, z.x - x0), dirs[1])) ? dirs[0] : dirs[1]) : dirs[0];
          FH(z, .60, 0); fPush(z, Math.cos(a), Math.sin(a), FS(60), .25, { force: L >= 7 }); } } } })); } });
  FA('mihun', 2, 'sweep', { name: '迷魂蝶', icon: '迷', need: 100, wu: .45, rc: .30, range: 130, half: 1.05,
    desc: '向身前 120° 撒出蝶影（离身 30~130），被扇到的人迷乱 1.5 秒：乱走、不追你、不出手（精锐减半，首领不受影响）。LV3 迷乱多 0.5 秒；LV5 扇面扩到 180°；LV7 迷乱中的敌人受羽扇伤害 +25%',
    cast() { const L = dlv(), a = aim(), half = (L >= 5 ? 90 : 60) * Math.PI / 180; gBand(hero.x, hero.y, a, half, FS(30), FS(130)); sfx(SW, hero.x);
      for (const z of hittable().filter(z => inBand(hero.x, hero.y, z, a, half, FS(30), FS(130)))) FH(z, .50, 10, { ml: L >= 3 ? 2 : 1.5 }); } });
  FA('shuangxue', 2, 'sweep', { name: '飞霜羽', icon: '霜', need: 100, wu: .50, rc: .30, range: 150, half: 1.05,
    desc: '向身前 120° 扇出寒风（离身 40~150），挂迟缓。LV3 迟缓多 1 秒；LV5 扇面扩到 180°；LV7 对已迟缓的敌人 +25%',
    cast() { const L = dlv(), a = aim(), half = (L >= 5 ? 90 : 60) * Math.PI / 180; gBand(hero.x, hero.y, a, half, FS(40), FS(150)); sfx(SW, hero.x);
      for (const z of hittable().filter(z => inBand(hero.x, hero.y, z, a, half, FS(40), FS(150)))) FH(z, .95, 20, { sl: 1, slx: L >= 3 ? 1 : 0, slowBonus: L >= 7 ? 1.25 : 0 }); } });
  FA('lianying', 2, 'thrust', { name: '穿堂风', icon: '堂', need: 180, wu: .55, rc: .30, beam: true, len: 280,
    desc: '一道宽 50、长 280 的窄风柱，把一排人推到尽头堆在一起，挂迟缓。LV3 迟缓多 0.5 秒；LV5 改成三道（15° 扇形）；LV7 堆在尽头的人再风撞一次',
    cast() { const L = dlv(), a0 = aim(), Lp = FS(280), w = FS(50) / 2, hs = new Set(); sfx(SW, hero.x);
      for (const a of L >= 5 ? [a0 - .26, a0, a0 + .26] : [a0]) { fx.push({ k: 'gd', m: 'rect', x: hero.x, y: hero.y, a, L: Lp, w, grow: .15, t: 0, T: .45, col: gCol() });
        dRect(hero.x, hero.y, a, Lp, w, z => { if (hs.has(z)) return; hs.add(z); FH(z, .70, 0, { sl: 1, slx: L >= 3 ? .5 : 0 }); const dx = z.x - hero.x, dy = (z.y - hero.y) * 2, al = dx * Math.cos(a) + dy * Math.sin(a); fPush(z, Math.cos(a), Math.sin(a), Math.max(10, Lp - al), .35, { force: L >= 7 }); }); } } });
  // ---- 地 ----
  FA('bazhen', 3, 'spin', { name: '八阵图', icon: '阵', need: 80, wu: .60, rc: .40, range: 120, half: Math.PI,
    desc: '身周半径 120 的 8 个阵点，1.6 秒内依次爆开（每点半径 40），阵点跟着你走，每点挂迟缓；同一人最多吃 2 下。LV3 爆开时迷乱 0.8 秒；LV5 爆开前先把附近 60 内的人吸过去；LV7 最后中心再爆一次（半径 120，1.2 倍）',
    cast() { const L = dlv(), R = FS(120), a0 = aim(), cnt = new Map(); sfx(SW, hero.x);
      const hitAt = (x, y, r, m, o) => { for (const z of near(x, y, r)) { const c = cnt.get(z) || 0; if (c >= 2 && !o.fin) continue; cnt.set(z, c + 1); FH(z, m, 30, o); } };
      DKO.push(dmk({ T: 1.75, i: 0, fin: 0, tick(o) { while (o.i < 8 && o.t >= o.i * .2) { const b = a0 + o.i * Math.PI / 4, px = hero.x + Math.cos(b) * R, py = clampY(hero.y + Math.sin(b) * R * .5);
          if (L >= 5) for (const z of near(px, py, FS(60))) fPull(z, px, py, .12);
          fx.push({ k: 'burst', x: px, y: py, r: FS(40), t: 0, T: .35, col: gCol() }); hitAt(px, py, FS(40), .50, { sl: 1, ml: L >= 3 ? .8 : 0 }); o.i++; }
        if (L >= 7 && !o.fin && o.t >= 1.7) { o.fin = 1; gBand(hero.x, hero.y, 0, Math.PI, 0, R, .4); hitAt(hero.x, hero.y, R, 1.20, { fin: 1 }); for (const z of near(hero.x, hero.y, R)) pushAway(z, hero.x, hero.y, FS(60), .25); } } })); } });
  FA('huoyu', 3, 'spin', { name: '旋风眼', icon: '眼', need: 200, wu: .65, rc: .40, range: 150, half: Math.PI,
    desc: '在 200 内敌人最密的地方放一个风眼，2.5 秒里把周围 150 内的人往中心吸（每 0.5 秒受伤），结束时向外炸开 90。精锐首领只挨打不被吸。LV3 吸着时挂迟缓；LV5 吸的半径扩到 190；LV7 炸飞的人必定风撞',
    cast() { const L = dlv(), cs = hittable().filter(z => dist(z, hero) < FS(200)), R = FS(L >= 5 ? 190 : 150);
      let c = cs.length ? cs.reduce((b, z) => near(z.x, z.y, FS(100)).length > near(b.x, b.y, FS(100)).length ? z : b) : { x: hero.x + Math.cos(aim()) * FS(150), y: hero.y };
      c = { x: c.x, y: c.y }; const dh = Math.hypot(c.x - hero.x, (c.y - hero.y) * 2), mn = Math.max(FMIN(), FS(110)); if (dh < mn) { const a = Math.atan2((c.y - hero.y) * 2, c.x - hero.x) || aim(); c.x = hero.x + Math.cos(a) * mn; c.y = clampY(hero.y + Math.sin(a) * mn * .5); }
      const e = fSwirl(c.x, c.y, R, 2.6, 1), cnt = new Map(); sfx(SW, hero.x);
      DKO.push(dmk({ T: 2.55, tk: .5, fin: 0, tick(o, dt) {
        for (const z of near(c.x, c.y, R)) if (!tough(z)) { const d = Math.hypot(z.x - c.x, (z.y - c.y) * 2); if (d > 12) { const k = Math.min(1, 70 * dt / d); z.x += (c.x - z.x) * k; z.y = clampY(z.y + (c.y - z.y) * k); } }
        if (o.t >= o.tk && o.tk <= 2.5) { o.tk += .5; for (const z of near(c.x, c.y, R)) { const n = cnt.get(z) || 0; if (n >= 5) continue; cnt.set(z, n + 1); FH(z, .30, 0, { sl: L >= 3 }); } }
        if (!o.fin && o.t >= 2.5) { o.fin = 1; fx.push({ k: 'burst', x: c.x, y: c.y, r: R, t: 0, T: .45, col: gCol() }); shake = Math.max(shake, .2); for (const z of near(c.x, c.y, R)) { FH(z, 1.20, 0); pushAway(z, c.x, c.y, FS(90), .3, { force: L >= 7 }); } } } })); } });
  FA('chibi', 3, 'up', { name: '乾坤屏', icon: '屏', need: 60, wu: .60, rc: .40, range: 60, half: 1.05,
    desc: '身前展开 120° 弧形风屏（离身 50），持续 3 秒，跟着你转向：敌人射来的箭、石子、剑气、火球碰到就消失；敌人撞上风屏被推开 60 并受伤（同一人 0.5 秒一次）。LV3 风屏扩到 180°、撞屏挂迟缓；LV5 改成整圈护住；LV7 挡下的飞行道具原路反弹（0.6 倍）',
    cast() { const L = dlv(), T = 3 + fDur(), half = L >= 5 ? Math.PI : (L >= 3 ? 90 : 60) * Math.PI / 180, R = Math.max(30, FS(50)), a = aim();
      const e = gBand(hero.x, hero.y, a, half, R - 6, R + 6, T, 1); sfx(SW, hero.x);
      SCR.push({ t: 0, T, a, half, R, L, e, last: new Map(), cm: CM, ck: CK, rm: RM }); } });
  // ---- 天 ----
  FA('dongfeng', 4, 'up', { name: '借东风', icon: '东', need: 200, wu: .90, rc: .50, none: true,
    desc: '全场大风 5 秒：画面里所有敌人被吹离你、挂迟缓，每 0.5 秒受伤一次。LV3 期间风撞伤害 ×2；LV5 风停时全场再吹飞一次（1.0 倍）；LV7 风停时回 6% 气血（春风化雨）',
    cast() { const L = dlv(), T = 5 + fDur(); S.dfT = T; shake = Math.max(shake, .25); sfx(SW, hero.x); floaters.push({ x: hero.x, y: hero.y - 80, t: 0, txt: '借东风', color: '#bff0ff' });
      DKO.push(dmk({ T: T + .02, tk: 0, fin: 0, tick(o) {
        if (o.t >= o.tk && o.t < T) { o.tk += .5; for (const z of near(hero.x, hero.y, 420)) { FH(z, .25, 0, { sl: 1 }); pushAway(z, hero.x, hero.y, FS(30), .45); fx.push({ k: 'cut', n: 'dg6', x: z.x, y: z.y - 16, a: Math.atan2((z.y - hero.y) * 2, z.x - hero.x) * .3, L: 14, t: 0, T: .3, col: '200,240,255' }); } }
        if (!o.fin && o.t >= T) { o.fin = 1; if (L >= 5) for (const z of near(hero.x, hero.y, 420)) { FH(z, 1.0, 0); pushAway(z, hero.x, hero.y, FS(90), .3); } if (L >= 7) { heal(maxHp() * .06); floaters.push({ x: hero.x, y: hero.y - 70, t: 0, txt: '春风化雨', color: '#9fffb0' }); } } } })); } });
  FA('qimen', 4, 'spin', { name: '奇门遁甲', icon: '奇', need: 100, wu: .90, rc: .50, range: 160, half: Math.PI,
    desc: '身周展开半径 160 的八卦护身阵，持续 5 秒：阵里的人被推到阵边、阵外的人进不来，碰到阵边受伤并挂迟缓（每 0.5 秒）；阵结束时八门一齐爆开，把阵边一圈人推飞。LV3 阵里每 1.5 秒随机一人迷乱；LV5 阵跟着你走；LV7 爆开伤害 +30%，推飞的人必定风撞',
    cast() { const L = dlv(), T = 5 + fDur(), R = FS(160), c = { x: hero.x, y: hero.y }, e = gBand(c.x, c.y, 0, Math.PI, R - 8, R + 8, T, 1), last = new Map(); sfx(SW, hero.x); shake = Math.max(shake, .2);
      DKO.push(dmk({ T: T + .02, ml: 1.5, fin: 0, tick(o, dt) { if (L >= 5) { c.x = hero.x; c.y = hero.y; } e.x = c.x; e.y = c.y;
        for (const z of near(c.x, c.y, R + 14)) { const d = Math.hypot(z.x - c.x, (z.y - c.y) * 2), a = Math.atan2((z.y - c.y) * 2, z.x - c.x);
          if (!isBoss(z) && d < R + 4) { const k = Math.min(1, 140 * dt / Math.max(1, R + 6 - d)); z.x += (c.x + Math.cos(a) * (R + 6) - z.x) * k; z.y = clampY(z.y + (c.y + Math.sin(a) * (R + 6) * .5 - z.y) * k); }
          if (DKT - (last.get(z) || -9) >= .5) { last.set(z, DKT); FH(z, .35, 0, { sl: 1 }); } }
        if (L >= 3 && o.t >= o.ml && o.t < T) { o.ml += 1.5; const cs = near(c.x, c.y, R + 40); if (cs.length) addML(cs[(Math.random() * cs.length) | 0], 1.5); }
        if (!o.fin && o.t >= T) { o.fin = 1; shake = Math.max(shake, .3); for (let i = 0; i < 8; i++) { const b = i * Math.PI / 4; fx.push({ k: 'burst', x: c.x + Math.cos(b) * R, y: c.y + Math.sin(b) * R * .5, r: FS(45), t: 0, T: .45, col: gCol() }); }
          for (const z of near(c.x, c.y, R + 40)) { FH(z, 1.80 * (L >= 7 ? 1.3 : 1), 0); pushAway(z, c.x, c.y, FS(90), .3, { force: L >= 7 }); } } } })); } });
  Object.assign(DRS1, { shanfeng: .75, liuying: .75, huifeng: .75, longjuan: .75, mihun: .75, shuangxue: .75, lianying: .75, bazhen: .80, huoyu: .80, chibi: .80, dongfeng: 1.0, qimen: 1.0 });
  Object.assign(DSP1, { shanfeng: 1.30, liuying: 1.30, huifeng: 1.30, longjuan: 1.35, mihun: 1.35, shuangxue: 1.35, lianying: 1.35, bazhen: 1.80, huoyu: 1.80, chibi: 1.80, dongfeng: 2.20, qimen: 2.20 });
  // ---------- 黄符（11/16 用户定）：火 / 雷 / 雨三系；配合只在黄符内部（导电、蒸腾），不和别的兵器联动 ----------
  //   黄：炎爆符 引雷符 唤雨符　玄：掌心雷 流火符 火蛇符 甘霖符　地：天雷阵 燎原符 行云符　天：五雷天罚 三昧真火
  //   灼烧：每 0.5 秒每层 0.06 倍，最多 3 层（离火珠 4），3 秒，刷新；带灼烧的敌人死了把 1 层溅给身边
  //   湿身：4 秒（太平要术 6），移速 −10%，受到黄符伤害 +12%
  //   导电：雷打湿身 → 这一下 ×1.5（太平要术 ×2），再跳到 120 内所有湿身的敌人（0.5 倍）
  //   蒸腾：火打湿身 → 照样灼烧，另炸一团白雾（半径 50，0.6 倍；太平要术 ×2），清掉湿身
  const FUCOL = { huofu: '#ff8a2a', feifu: '#ffe9a0', dingshen: '#5fb8ff', zhangxin: '#c070ff', wulei: '#ff3b2f', yaoshu: '#ff5a3a', huangtian: '#3fd8a0', tianlei: '#8f7aff', fuhuo: '#c8302a', sadou: '#7f9ccf', jiutian: '#fff0b0', taiping: '#ffb030' };
  const FU = (k, tier, mot, o) => { add(k, Object.assign({ tier, dk: 1, key: k, color: FUCOL[k] }, o)); WOFX[k] = 8; MOTX[k] = mot; };
  const isLei = o => o.el === 'lei' || o.el === 'both', isHuo = o => o.el === 'huo' || o.el === 'both';
  const fuR = () => HAS('lihuozhu') ? 1.25 : 1;                         // 离火珠：火区半径 +25%
  const fuPt = n => { const t = nearest(FS(n)); if (t) return { x: t.x, y: t.y }; const a = aim(); return { x: hero.x + Math.cos(a) * FS(n) * .7, y: clampY(hero.y + Math.sin(a) * FS(n) * .35) }; };
  const fuDense = n => { const cs = hittable().filter(z => dist(z, hero) < FS(n)); if (!cs.length) return fuPt(n); const b = cs.reduce((b, z) => near(z.x, z.y, FS(80)).length > near(b.x, b.y, FS(80)).length ? z : b); return { x: b.x, y: b.y }; };
  const fuChainLine = (a, b, col) => fx.push({ k: 'line', x: a.x, y: a.y, a: Math.atan2((b.y - a.y) * 2, b.x - a.x), L: Math.hypot(b.x - a.x, (b.y - a.y) * 2), w: 3, t: 0, T: .22, col: col || '220,210,255' });
  function fuBurn(z, n) {
    if (!z || z.dead) return; const cap = HAS('lihuozhu') ? 4 : 3, c = z.fbT > 0 ? z.fbN || 0 : 0;
    z.fbN = Math.min(cap, c + n); z.fbT = 3; z.fbCM = CM; z.fbCK = CK; if (!(z.fbTk > 0)) z.fbTk = .5;
  }
  function fuWet(z, x) { if (z && !z.dead) z.wetT = Math.max(z.wetT || 0, 4 + (HAS('taipingshu') ? 2 : 0) + (x || 0)); }
  let fuTxtT = 0;
  // 黄符的一次命中：o.el 火/雷/雨/both、o.burn 灼烧层数、o.wet 挂湿身、o.nc 不导电（导电本身那一跳）
  function FUH(z, m, kb, o = {}) {
    if (!z || z.dead) return false;
    const wet = z.wetT > 0, tp = HAS('taipingshu'), lei = isLei(o), huo = isHuo(o);
    let mm = m * (wet ? 1.12 : 1);
    if (lei) { mm *= (HAS('leijimu') ? 1.25 : 1) * (z.glB > 0 ? 1.2 : 1) * (o.wetUp && wet ? o.wetUp : 1); if (wet && !o.nc) mm *= tp ? 2 : 1.5; }
    const r = DH(z, mm, kb, o); if (!r) return r;
    const now = performance.now();
    if (lei && wet && !o.nc) {
      if (now - fuTxtT > 250) { fuTxtT = now; floaters.push({ x: z.x, y: z.y - 64, t: 0, txt: '导电', color: '#c8b8ff' }); }
      const R = FS(120) * (HAS('leijimu') ? 1.3 : 1);
      for (const q of near(z.x, z.y, R)) if (q !== z && q.wetT > 0 && !q.dead) { fuChainLine(z, q); DH(q, m * .5 * (tp ? 1.5 : 1), 0); }
    }
    if (huo && wet && !z.dead) {
      if (now - fuTxtT > 250) { fuTxtT = now; floaters.push({ x: z.x, y: z.y - 64, t: 0, txt: '蒸腾', color: '#f0f4ff' }); }
      fx.push({ k: 'burst', x: z.x, y: z.y, r: FS(50), t: 0, T: .45, col: '235,240,250' });
      for (const q of near(z.x, z.y, FS(50))) DH(q, .6 * (tp ? 2 : 1), 20);
      z.wetT = 0;
    }
    if (o.burn && !z.dead) fuBurn(z, o.burn);
    if (o.wet && !z.dead) fuWet(z, o.wetx);
    return r;
  }
  function fuTick(dt) {
    for (const z of zs) {
      if (z.wetT > 0) z.wetT -= dt;
      if (z.glB > 0) z.glB -= dt;
      if (z.fbT > 0) {
        if (z.dead) { if (!z.fbDone) { z.fbDone = 1; const c = CM, k = CK; CM = z.fbCM || 1; CK = z.fbCK || ''; for (const q of near(z.x, z.y, FS(60))) if (q !== z) fuBurn(q, z.fbSp || 1); CM = c; CK = k; } continue; }
        z.fbT -= dt;
        if ((z.fbTk -= dt) <= 0) { z.fbTk += .5; const d = .06 * (z.fbN || 0) * DU * RT.dmg * (z.fbCM || 1) * VUL(z) * (z.wetT > 0 ? 1.12 : 1); if (d > 0) { const k = CK; CK = z.fbCK || ''; rec(d); CK = k; hit(z, d, 0, 1, false, 0, 0, false, false, { dot: true, secondary: true, survSkill: true }); } }
        if (z.fbT <= 0) z.fbN = 0;
      }
    }
  }
  // 地面区域（火区/雨区）：每 0.5 秒对区内的人调 each(z)；move(o,dt) 可让区域移动；end(o) 结束时
  function fuZone(o) {
    const e = gBand(o.x, o.y, 0, Math.PI, 0, o.r, o.T, 1); e.col = o.col || (o.kind === 'huo' ? '255,110,40' : '110,170,255');
    const sw = o.kind === 'yu' ? fSwirl(o.x, o.y, o.r * .9, o.T, 1) : null; if (sw) sw.col = '170,210,255';
    DKO.push(dmk({ T: o.T + .02, nx: .5, end: 0, tick(q, dt) { if (o.move) o.move(o, dt); e.x = o.x; e.y = o.y; if (sw) { sw.x = o.x; sw.y = o.y; }
      if (q.t >= q.nx && q.t < o.T) { q.nx += .5; const cs = near(o.x, o.y, o.r); if (o.each) cs.forEach(z => o.each(z)); if (o.after) o.after(cs); }
      if (o.every) o.every(q, dt);
      if (!q.end && q.t >= o.T) { q.end = 1; if (o.end) o.end(o); } } }));
    return o;
  }
  const fuBolt = (x, y, r, m, o = {}) => { fx.push({ k: 'bolt', x, y, t: 0, T: .32 }); sfx(CR, x); const hs = []; for (const z of near(x, y, r)) if (!o.ok || o.ok(z)) { FUH(z, m, 20, Object.assign({ el: 'lei' }, o)); hs.push(z); } return hs; };
  const fuBoom = (x, y, r, m, o = {}) => { fx.push({ k: 'burst', x, y, r, t: 0, T: .4, col: o.col || '255,150,60' }); for (const z of near(x, y, r)) if (!o.ok || o.ok(z)) FUH(z, m, 30, Object.assign({ el: 'huo' }, o)); };
  const fuThrow = (x, y, T, cb) => { fx.push({ k: 'line', x: hero.x, y: hero.y, a: Math.atan2((y - hero.y) * 2, x - hero.x), L: Math.hypot(x - hero.x, (y - hero.y) * 2), w: 2, t: 0, T, col: '255,220,120' }); DKO.push(dmk({ T: T + .01, d: 0, tick(q) { if (!q.d && q.t >= T) { q.d = 1; cb(); } } })); };
  // ---- 黄 ----
  FU('huofu', 1, 'thrust', { name: '炎爆符', icon: '炎', need: 120, wu: .40, rc: .25, el: 'huo',
    desc: '把火符掷到最近的敌人脚下，炸开半径 45。LV3 挂 1 层灼烧；LV5 炸开后留 1.5 秒小火区；LV7 炸开半径 +30%',
    cast() { const L = dlv(), p = fuPt(160), r = FS(45) * (L >= 7 ? 1.3 : 1) * fuR(); sfx(SW, hero.x);
      fuThrow(p.x, p.y, .18, () => { fuBoom(p.x, p.y, r, .90, { burn: L >= 3 ? 1 : 0 }); if (L >= 5) fuZone({ x: p.x, y: p.y, r, T: 1.5, kind: 'huo', each: z => FUH(z, .10, 0, { el: 'huo', burn: L >= 3 ? 1 : 0 }) }); }); } });
  FU('feifu', 1, 'up', { name: '引雷符', icon: '引', need: 130, wu: .40, rc: .25, el: 'lei',
    desc: '一道落雷劈 180 内最近的敌人。LV3 再跳 1 人（0.5 倍）；LV5 跳 2 人；LV7 劈中湿身的敌人再 +20%',
    cast() { const L = dlv(), t = nearest(FS(180)); if (!t) return; const wu = L >= 7 ? 1.2 : 1; fuBolt(t.x, t.y, FS(20), 1.40, { wetUp: wu });
      let prev = t; const hs = new Set([t]); for (let i = 0; i < (L >= 5 ? 2 : L >= 3 ? 1 : 0); i++) { const q = hittable().filter(z => !hs.has(z) && dist(z, prev) < FS(120) * (HAS('leijimu') ? 1.3 : 1)).sort((a, b) => dist(a, prev) - dist(b, prev))[0]; if (!q) break; hs.add(q); fuChainLine(prev, q, '255,240,170'); FUH(q, .70, 10, { el: 'lei', wetUp: wu }); prev = q; } } });
  FU('dingshen', 1, 'up', { name: '唤雨符', icon: '雨', need: 130, wu: .40, rc: .25, el: 'yu',
    desc: '在前方 140 处下一片小雨（半径 70），持续 3 秒，每 0.5 秒淋一次并挂湿身（湿身：移速 −10%，受到黄符伤害 +12%）。LV3 雨区半径 +25%；LV5 持续 4 秒；LV7 雨停时再淋一下（0.5 倍）',
    cast() { const L = dlv(), p = fuPt(140), r = FS(70) * (L >= 3 ? 1.25 : 1); sfx(SW, hero.x);
      fuZone({ x: p.x, y: p.y, r, T: L >= 5 ? 4 : 3, kind: 'yu', each: z => FUH(z, .25, 0, { el: 'yu', wet: 1 }), end: o => { if (L >= 7) for (const z of near(o.x, o.y, r)) FUH(z, .50, 0, { el: 'yu', wet: 1 }); } }); } });
  // ---- 玄 ----
  FU('zhangxin', 2, 'thrust', { name: '掌心雷', icon: '掌', need: 130, wu: .50, rc: .30, el: 'lei',
    desc: '闪电在 180 内的敌人之间连锁跳 5 次（每跳 120 内找下一个），每人一次。LV3 跳 7 次；LV5 湿身的敌人优先跳；LV7 最后一跳炸开（半径 40，0.8 倍）',
    cast() { const L = dlv(), n = L >= 3 ? 7 : 5, hs = new Set(), R = FS(120) * (HAS('leijimu') ? 1.3 : 1); let prev = hero, t = nearest(FS(180)); if (!t) return; sfx(CR, hero.x);
      DKO.push(dmk({ T: n * .07 + .05, i: 0, tick(o) { while (o.i < n && o.t >= o.i * .07) { if (!t) { o.i = n; break; } hs.add(t); fuChainLine(prev, t); FUH(t, .70, 10, { el: 'lei' });
        if (L >= 7 && o.i === n - 1) fuBolt(t.x, t.y, FS(40), .80);
        prev = t; const cs = hittable().filter(z => !hs.has(z) && dist(z, prev) < R); t = cs.sort((a, b) => (L >= 5 ? ((b.wetT > 0) - (a.wetT > 0)) * 1e4 : 0) + dist(a, prev) - dist(b, prev))[0] || null; o.i++; } } })); } });
  FU('wulei', 2, 'thrust', { name: '流火符', icon: '流', need: 130, wu: .50, rc: .30, el: 'huo',
    desc: '扔出 3 张符，分别落在 3 个不同的敌人脚下，各起一片火区（半径 35）留 2.5 秒，挂 1 层灼烧。LV3 灼烧 2 层；LV5 改成 5 张；LV7 火区留 4 秒',
    cast() { const L = dlv(), n = L >= 5 ? 5 : 3, cs = hittable().filter(z => dist(z, hero) < FS(180)).sort((a, b) => dist(a, hero) - dist(b, hero)).slice(0, n), r = FS(35) * fuR(), bn = L >= 3 ? 2 : 1; sfx(SW, hero.x);
      const pts0 = cs.map(z => ({ x: z.x, y: z.y })); while (pts0.length < n) { const a = aim() + (Math.random() - .5) * 1.4; pts0.push({ x: hero.x + Math.cos(a) * FS(130), y: clampY(hero.y + Math.sin(a) * FS(65)) }); }
      pts0.forEach((p, i) => later(i * .06, () => fuThrow(p.x, p.y, .2, () => { fuBoom(p.x, p.y, r, .50, { burn: bn }); fuZone({ x: p.x, y: p.y, r, T: L >= 7 ? 4 : 2.5, kind: 'huo', each: z => FUH(z, .10, 0, { el: 'huo', burn: 1 }) }); }))); } });
  FU('yaoshu', 2, 'sweep', { name: '火蛇符', icon: '蛇', need: 150, wu: .55, rc: .30, el: 'huo', beam: true, len: 240,
    desc: '符贴地，一条火线沿直线蔓延 240（宽 30），留 2 秒，挂 1 层灼烧。LV3 灼烧 2 层；LV5 改成三条（20° 扇形）；LV7 火线燃尽时整条炸一次（0.6 倍）',
    cast() { const L = dlv(), a0 = aim(), x0 = hero.x, y0 = hero.y, Lp = FS(240), w = FS(30) / 2 * fuR(), dirs = L >= 5 ? [a0 - .35, a0, a0 + .35] : [a0], hs = new Set(); sfx(SW, hero.x);
      dirs.forEach(a => fx.push({ k: 'gd', m: 'rect', x: x0, y: y0, a, L: Lp, w, grow: .4, t: 0, T: 2.4, col: '255,90,40', hold: 1 }));
      DKO.push(dmk({ T: 2.45, nx: .9, fin: 0, tick(o) { const reach = Math.min(1, o.t / .4) * Lp;
        for (const a of dirs) dRect(x0, y0, a, reach, w, z => { if (!hs.has(z)) { hs.add(z); FUH(z, .80, 20, { el: 'huo', burn: L >= 3 ? 2 : 1, x: x0 }); } });
        if (o.t >= o.nx && o.t < 2.4) { o.nx += .5; const t2 = new Set(); for (const a of dirs) dRect(x0, y0, a, Lp, w, z => { if (!t2.has(z)) { t2.add(z); FUH(z, .10, 0, { el: 'huo', burn: 1, x: x0 }); } }); }
        if (L >= 7 && !o.fin && o.t >= 2.4) { o.fin = 1; const t3 = new Set(); for (const a of dirs) { for (let i = 1; i <= 4; i++) fx.push({ k: 'burst', x: x0 + Math.cos(a) * Lp * i / 4, y: y0 + Math.sin(a) * Lp * i / 8, r: w * 2, t: 0, T: .35, col: '255,120,50' }); dRect(x0, y0, a, Lp, w * 1.5, z => { if (!t3.has(z)) { t3.add(z); FUH(z, .60, 30, { el: 'huo', x: x0 }); } }); } } } })); } });
  FU('huangtian', 2, 'up', { name: '甘霖符', icon: '霖', need: 150, wu: .55, rc: .30, el: 'yu',
    desc: '在 200 内敌人最密的地方下一场大雨（半径 110），持续 4 秒，每 0.5 秒淋一次并挂湿身。LV3 雨里的敌人受雷伤 +20%；LV5 雨区跟着最近的敌群走；LV7 雨停时湿身再延长 3 秒',
    cast() { const L = dlv(), p = fuDense(200), r = FS(110); sfx(SW, hero.x);
      fuZone({ x: p.x, y: p.y, r, T: 4, kind: 'yu', col: '90,220,170', each: z => { FUH(z, .25, 0, { el: 'yu', wet: 1 }); if (L >= 3) z.glB = .6; },
        move: L >= 5 ? (o, dt) => { const t = hittable().sort((a, b) => dist(a, o) - dist(b, o))[0]; if (t) { const d = Math.hypot(t.x - o.x, (t.y - o.y) * 2); if (d > 6) { const k = Math.min(1, 50 * dt / d); o.x += (t.x - o.x) * k; o.y += (t.y - o.y) * k; } } } : null,
        end: o => { if (L >= 7) for (const z of near(o.x, o.y, r)) fuWet(z, 3); } }); } });
  // ---- 地 ----
  FU('tianlei', 3, 'up', { name: '天雷阵', icon: '阵', need: 150, wu: .65, rc: .40, el: 'lei',
    desc: '在敌人最密的地方画一圈雷阵（半径 120），3 秒内每 0.4 秒往阵里落一道雷（半径 30），湿身的敌人优先挨劈；同一人最多 3 道。LV3 阵变成 4 秒；LV5 每次落两道；LV7 阵结束时中心落大雷（半径 80，2.0 倍）',
    cast() { const L = dlv(), c = fuDense(200), R = FS(120), T = L >= 3 ? 4 : 3, cnt = new Map(), e = gBand(c.x, c.y, 0, Math.PI, R - 4, R + 4, T, 1); e.col = '160,140,255'; sfx(CR, c.x);
      DKO.push(dmk({ T: T + .05, nx: 0, fin: 0, tick(o) { while (o.t >= o.nx && o.nx < T) { o.nx += .4;
          for (let k = 0; k < (L >= 5 ? 2 : 1); k++) { const cs = near(c.x, c.y, R).filter(z => (cnt.get(z) || 0) < 3).sort((a, b) => (b.wetT > 0) - (a.wetT > 0) || Math.random() - .5); const t = cs[0];
            const p = t ? { x: t.x, y: t.y } : { x: c.x + (Math.random() - .5) * R * 1.6, y: clampY(c.y + (Math.random() - .5) * R * .8) };
            fuBolt(p.x, p.y, FS(30), 1.00, { ok: z => { const n = cnt.get(z) || 0; if (n >= 3) return false; cnt.set(z, n + 1); return true; } }); } }
        if (L >= 7 && !o.fin && o.t >= T) { o.fin = 1; shake = Math.max(shake, .3); fuBolt(c.x, c.y, FS(80), 2.00); } } })); } });
  FU('fuhuo', 3, 'sweep', { name: '燎原符', icon: '燎', need: 150, wu: .65, rc: .40, el: 'huo',
    desc: '扇形飞出 6 张符，落地各起一片火区（半径 40）留 3 秒，挂 2 层灼烧，相邻火区连成一大片。LV3 灼烧 3 层；LV5 改成 8 张；LV7 火区里有敌人死掉就再炸一次（0.8 倍）',
    cast() { const L = dlv(), n = L >= 5 ? 8 : 6, a0 = aim(), r = FS(40) * fuR(), bn = L >= 3 ? 3 : 2; sfx(SW, hero.x);
      for (let i = 0; i < n; i++) { const a = a0 + (i / (n - 1) - .5) * 1.75, D = FS(120 + (i % 2) * 70), p = { x: hero.x + Math.cos(a) * D, y: clampY(hero.y + Math.sin(a) * D * .5) };
        later(i * .04, () => fuThrow(p.x, p.y, .22, () => { const tick1 = new Set(); fuBoom(p.x, p.y, r, .60, { burn: bn }); let inside = new Set();
          fuZone({ x: p.x, y: p.y, r, T: 3, kind: 'huo', each: z => { if (!tick1.has(z)) FUH(z, .12, 0, { el: 'huo', burn: 1 }); }, after: cs => { tick1.clear();
            if (L >= 7) for (const z of inside) if (z.dead && !z.lyBoom) { z.lyBoom = 1; fuBoom(z.x, z.y, r, .80); } inside = new Set(cs); } }); })); } } });
  FU('sadou', 3, 'up', { name: '行云符', icon: '云', need: 150, wu: .65, rc: .40, el: 'yu',
    desc: '召来一朵云，4 秒内跟着最近的敌群走：云下一直下雨（半径 90，挂湿身），每 1 秒从云里落一道雷（1.0 倍，打湿身自带导电）；同一人最多挨 4 道雷。LV3 每 0.7 秒落一道雷；LV5 云的半径 +30%；LV7 云散时落一道大雷（2.0 倍）',
    cast() { const L = dlv(), p = fuDense(200), r = FS(90) * (L >= 5 ? 1.3 : 1), cnt = new Map(), iv = L >= 3 ? .7 : 1; sfx(SW, hero.x);
      const zo = fuZone({ x: p.x, y: p.y, r, T: 4, kind: 'yu', col: '130,150,200', each: z => FUH(z, .10, 0, { el: 'yu', wet: 1 }),
        move: (o, dt) => { const t = hittable().sort((a, b) => dist(a, o) - dist(b, o))[0]; if (t) { const d = Math.hypot(t.x - o.x, (t.y - o.y) * 2); if (d > 6) { const k = Math.min(1, 60 * dt / d); o.x += (t.x - o.x) * k; o.y += (t.y - o.y) * k; } } },
        end: o => { if (L >= 7) { shake = Math.max(shake, .25); fuBolt(o.x, o.y, FS(60), 2.00); } } });
      DKO.push(dmk({ T: 4, nb: .3, tick(q) { while (q.t >= q.nb && q.nb < 4) { q.nb += iv; const cs = near(zo.x, zo.y, r).filter(z => (cnt.get(z) || 0) < 4).sort((a, b) => (b.wetT > 0) - (a.wetT > 0) || Math.random() - .5); const t = cs[0]; if (!t) continue; cnt.set(t, (cnt.get(t) || 0) + 1); fuBolt(t.x, t.y, FS(20), 1.00, { ok: z => z === t }); } } })); } });
  // ---- 天 ----
  FU('jiutian', 4, 'up', { name: '五雷天罚', icon: '罚', need: 170, wu: .90, rc: .50, el: 'lei', none: true,
    desc: '全场下雨 6 秒，画面里所有敌人湿身；期间落 12 道天雷，每道劈一个随机敌人（半径 40），全部打湿身自带导电；同一人最多 4 道。LV3 增至 16 道；LV5 每道天雷劈完再跳一次；LV7 最后全场落一道大雷（1.5 倍）',
    cast() { const L = dlv(), T = 6, n = L >= 3 ? 16 : 12, cnt = new Map(); shake = Math.max(shake, .25); sfx(CR, hero.x); floaters.push({ x: hero.x, y: hero.y - 80, t: 0, txt: '五雷天罚', color: '#fff0b0' });
      const e = fSwirl(hero.x, hero.y, 220, T, 1); e.col = '150,190,255';
      DKO.push(dmk({ T: T + .05, nw: 0, nb: .3, fin: 0, tick(o) { e.x = hero.x; e.y = hero.y;
        if (o.t >= o.nw && o.t < T) { o.nw += .5; for (const z of near(hero.x, hero.y, 420)) fuWet(z); }
        while (o.t >= o.nb && o.nb < T) { o.nb += (T - .3) / n; const cs = near(hero.x, hero.y, 420).filter(z => (cnt.get(z) || 0) < 4); const t = cs[(Math.random() * cs.length) | 0]; if (!t) continue; cnt.set(t, (cnt.get(t) || 0) + 1);
          fuBolt(t.x, t.y, FS(40), 1.60, { ok: z => z === t || (cnt.get(z) || 0) < 4 });
          if (L >= 5) { const q = hittable().filter(z => z !== t && dist(z, t) < FS(140)).sort((a, b) => dist(a, t) - dist(b, t))[0]; if (q) { fuChainLine(t, q, '255,245,200'); FUH(q, .80, 10, { el: 'lei' }); } } }
        if (L >= 7 && !o.fin && o.t >= T) { o.fin = 1; shake = Math.max(shake, .4); for (const z of near(hero.x, hero.y, 420)) { fx.push({ k: 'bolt', x: z.x, y: z.y, t: 0, T: .32 }); FUH(z, 1.50, 20, { el: 'lei', nc: 1 }); } } } })); } });
  FU('taiping', 4, 'chop', { name: '三昧真火', icon: '昧', need: 170, wu: .90, rc: .50, el: 'both', none: true,
    desc: '3 道雷火柱砸向 3 处敌群，每处炸开半径 80（雷火两系：打湿身同时导电和蒸腾），挂 3 层灼烧，然后烧成火海（半径 100）留 4 秒。LV3 改成 4 道；LV5 火海留 6 秒；LV7 火海里的敌人死掉时扩散 2 层灼烧',
    cast() { const L = dlv(), n = L >= 3 ? 4 : 3, cs = hittable().filter(z => dist(z, hero) < FS(220)).sort((a, b) => near(b.x, b.y, FS(80)).length - near(a.x, a.y, FS(80)).length), used = []; sfx(CR, hero.x);
      for (const z of cs) { if (used.length >= n) break; if (used.every(u => Math.hypot(u.x - z.x, (u.y - z.y) * 2) > FS(100))) used.push({ x: z.x, y: z.y }); }
      while (used.length < n) { const a = aim() + (used.length - (n - 1) / 2) * .6; used.push({ x: hero.x + Math.cos(a) * FS(150), y: clampY(hero.y + Math.sin(a) * FS(75)) }); }
      used.forEach((p, i) => { fx.push({ k: 'mark', x: p.x, y: p.y, r: FS(80), t: 0, T: .4 + i * .12 });
        later(.4 + i * .12, () => { shake = Math.max(shake, .3); fx.push({ k: 'bolt', x: p.x, y: p.y, t: 0, T: .4 }); fuBoom(p.x, p.y, FS(80), 2.00, { el: 'both', burn: 3, col: '255,190,80' });
          fuZone({ x: p.x, y: p.y, r: FS(100) * fuR(), T: L >= 5 ? 6 : 4, kind: 'huo', col: '255,140,40', each: z => { FUH(z, .15, 0, { el: 'huo', burn: 1 }); if (L >= 7) z.fbSp = 2; } }); }); }); } });
  Object.assign(DRS1, { huofu: .75, feifu: .75, dingshen: .75, zhangxin: .75, wulei: .75, yaoshu: .75, huangtian: .75, tianlei: .80, fuhuo: .80, sadou: .80, jiutian: 1.0, taiping: 1.0 });
  Object.assign(DSP1, { huofu: 1.30, feifu: 1.30, dingshen: 1.30, zhangxin: 1.40, wulei: 1.40, yaoshu: 1.40, huangtian: 1.40, tianlei: 1.90, fuhuo: 1.90, sadou: 1.90, jiutian: 2.20, taiping: 2.20 });
  // 石子：每次施放持有自己的命中计数及宝物触发次数。
  const SG = (key, tier, mot, need, wu, rc, rs, sp, name, desc, cast) => {
    const color = ['#c9b992', '#e0c49a', '#edab63', '#ffd477'][tier - 1];
    add(key, { tier, dk: 1, stone: true, key, name, desc, icon: name[0], color,
      need, wu: wu / sp, rc: rc / sp, none: true, cast() { sfx('sling', hero.x); return cast(); } });
    WOFX[key] = 7; MOTX[key] = mot;
    DRS1[key] = rs; DSP1[key] = sp;
  };
  const stoneScale = n => n * DK * RM;
  const stoneAngle = (p, q) => Math.atan2((q.y - p.y) * 2, q.x - p.x);
  const stonePoint = (p, a, d) => ({ x: p.x + Math.cos(a) * d, y: p.y + Math.sin(a) * d / 2 });
  const stoneAim = p => {
    const z = nearest(stoneScale(SK[CK].need));
    return z ? stoneAngle(p, z) : Math.atan2(0, hero.f);
  };
  const stoneTargets = (p, r, accept = () => true) =>
    hittable().filter(z => dist(z, p) <= r && accept(z)).sort((a, b) => dist(a, p) - dist(b, p));
  const stoneJob = (T, tick) => DKO.push(dmk({ T, tick }));
  const stoneCount = (counts, z, cap) => {
    const n = counts.get(z) || 0;
    if (n >= cap) return false;
    counts.set(z, n + 1);
    return true;
  };
  const stoneBurst = (p, r, T = .25) =>
    fx.push({ k: 'burst', x: p.x, y: p.y, r, t: 0, T, col: hexRgb(SK[CK].color) });

  function stoneHit(z, m, p, { slow, extra = 0, bonus = 0, kb = 8 } = {}) {
    const mult = (z.slT > 0 ? 1 + bonus : 1) *
      (HAS('feihuang') && (CK === 'feishi' || CK === 'gunshi') ? 1.15 : 1);
    if (!DH(z, m * mult, kb, { x: p.x }) || z.dead) return;
    if (slow) addSL(z, extra);
    if (HAS('yunxing') && !(z.stoneStunCd > 0) && Math.random() < .2) {
      z.stoneStunCd = 2;
      stunz(z, slowGrade(z) === 2 ? .2 : .4);
    }
  }
  const stoneBolt = (p, a, length, size = 1) => {
    const sp = 420;
    const b = { x: p.x, y: p.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp / 2,
      a, t: 0, T: length / sp, col: STN, stone: size, tier: SK[CK].tier, nohit: true };
    bolts.push(b);
    return b;
  };
  // 用每帧扫过的线段判定，按命中先后处理，避免快石穿过近处敌人。
  function stoneShot(p, a, length, width, accept, contact, end, size = 1, pierce = HAS('yunxing') ? 1 : 0, arrowColor = null) {
    const b = stoneBolt(p, a, length, size);
    if (arrowColor) Object.assign(b, { stone: 0, shape: 'arrow', col: arrowColor });
    const seen = new Set();
    let gone = false, previous = 0;
    stoneJob(b.T, o => {
      if (gone) return;
      const d = o.t >= o.T ? length : o.t * 420;
      const hits = [];
      for (const z of hittable()) {
        if (seen.has(z) || !accept(z)) continue;
        const dx = z.x - p.x, dy = (z.y - p.y) * 2;
        const along = dx * Math.cos(a) + dy * Math.sin(a);
        const cross = dx * Math.sin(a) - dy * Math.cos(a);
        const r = (typeof width === 'function' ? width(Math.max(0, along)) : width) / 2 + 5;
        if (Math.abs(cross) > r) continue;
        const reach = Math.sqrt(r * r - cross * cross);
        if (along + reach >= previous && along - reach <= d) hits.push([z, Math.max(previous, along - reach)]);
      }
      hits.sort((a, b) => a[1] - b[1]);
      for (const [z, at] of hits) {
        if (z.dead || !accept(z)) continue;
        seen.add(z);
        if (contact(z, stonePoint(p, a, at)) === false && pierce-- <= 0) {
          gone = true; b.T = 0; return;
        }
      }
      previous = d;
      if (d >= length && end) end(stonePoint(p, a, length));
    });
  }
  function stoneSeek(p, target, range, contact, size = 1, canPierce = true) {
    const b = stoneBolt(p, stoneAngle(p, target), range, size);
    let travelled = 0, done = false;
    b.vx = b.vy = 0;
    stoneJob(b.T, (o, dt) => {
      if (done) return;
      if (target.dead || target.air || target.hidden) { done = true; b.T = 0; return; }
      const left = dist(b, target), step = Math.min(left, 420 * dt, range - travelled);
      b.a = stoneAngle(b, target);
      Object.assign(b, stonePoint(b, b.a, step));
      travelled += step;
      if (left <= step + 3) {
        done = true; b.T = 0; contact(target);
        const remaining = range - travelled;
        if (canPierce && HAS('yunxing') && remaining > 0) {
          stoneShot({ x: b.x, y: b.y }, b.a, remaining, stoneScale(20), z => z !== target,
            z => { contact(z); return false; }, null, size, 0);
        }
      }
    });
  }
  function stoneSequence(n, gap, fire) {
    const roll = S.stoneRoll || 0;
    let i = 0;
    const launch = t => {
      while (i < n && t + 1e-8 >= i * gap) {
        if (fire(i++) === false) { i = n; break; }
      }
    };
    launch(0);
    stoneJob((n - 1) * gap, o => {
      if ((S.stoneRoll || 0) !== roll || busy()) { o.T = 0; return; }
      launch(o.t);
    });
  }
  const openStone = () => true;

  SG('feishi', 1, 'thrust', 340, .26, .20, .70, 1.3, '惊鸿石',
    '直掷一颗石子，命中首个敌人；LV3 命中使敌人迟缓；LV5 命中后分出两颗碎石追击其他敌人；LV7 主石对迟缓目标伤害 +15%', () => {
      const L = dlv(), p = { x: hero.x, y: hero.y };
      stoneShot(p, stoneAim(p), stoneScale(380), stoneScale(28), openStone, z => {
        stoneHit(z, .80, p, { slow: L >= 3, bonus: L >= 7 ? .15 : 0 });
        if (L >= 5) for (const q of stoneTargets(z, stoneScale(120), q => q !== z).slice(0, 2))
          stoneSeek(z, q, stoneScale(120), t => stoneHit(t, .25, z));
        return false;
      });
    });

  SG('sashi', 1, 'sweep', 260, .30, .22, .75, 1.3, '散花石',
    '向前方扇形撒出五颗石子，每敌最多命中两次；LV3 命中施加迟缓；LV5 改撒七颗并展开扇面；LV7 对迟缓目标击退加强', () => {
      const L = dlv(), p = { x: hero.x, y: hero.y }, a = stoneAim(p);
      const n = (L >= 5 ? 7 : 5) + (HAS('feihuang') ? 1 : 0), hits = new Map();
      const arc = (L >= 5 ? 90 : 70) * Math.PI / 180;
      for (let i = 0; i < n; i++) stoneShot(p, a + arc * (i / (n - 1) - .5), stoneScale(300), stoneScale(24),
        z => (hits.get(z) || 0) < 2, z => {
          if (!stoneCount(hits, z, 2)) return;
          stoneHit(z, L >= 5 ? .34 : .40, p, { slow: L >= 3, kb: L >= 7 && z.slT > 0 ? 20 : 8 });
          return false;
        });
    });

  SG('tiaoshi', 1, 'thrust', 300, .28, .22, .72, 1.3, '漂萍石',
    '石子在附近不同敌人之间弹射，无下一目标时可回击当前敌人一次；LV3 首击施加迟缓；LV5 多跳一人并扩大弹射范围；LV7 末次命中处爆开', () => {
      const L = dlv(), p = { x: hero.x, y: hero.y }, seen = new Set();
      const cap = (L >= 5 ? 5 : 4) + (HAS('yuhua') ? 1 : 0), range = stoneScale(L >= 5 ? 180 : 160);
      const explode = z => {
        if (L < 7) return;
        const r = stoneScale(50);
        stoneBurst(z, r);
        for (const q of near(z.x, z.y, r)) stoneHit(q, .40, z);
      };
      const jump = (z, from) => {
        seen.add(z);
        stoneHit(z, .65, from, { slow: L >= 3 && seen.size === 1 });
        if (seen.size >= cap) { explode(z); return; }
        const q = stoneTargets(z, range, q => !seen.has(q))[0];
        if (q) { stoneSeek(z, q, range, t => { if (!seen.has(t)) jump(t, z); else explode(z); }, 1, false); return; }
        if (z.dead) { explode(z); return; }
        const off = stonePoint(z, stoneAngle(from, z), Math.min(14, range / 2));
        stoneSeek(off, z, range, t => { stoneHit(t, .35, off); explode(t); }, 1, false);
      };
      let started = false;
      stoneShot(p, stoneAim(p), stoneScale(340), stoneScale(28), z => !seen.has(z) && seen.size < cap, (z, from) => {
        if (!started) { started = true; jump(z, from); }
        else { seen.add(z); stoneHit(z, .65, from); }
        return false;
      });
    });

  SG('zashi', 2, 'sweep', 180, .32, .24, .75, 1.3, '绊马石',
    '前方铺石三秒，首次踩入受伤，留在区内持续受伤；首次踩入施加迟缓；LV3 迟缓多半秒；LV5 左右各铺一片，重叠只算一次；LV7 每秒额外弹击一次', () => {
      const L = dlv(), p = { x: hero.x, y: hero.y }, a = stoneAim(p);
      const center = stonePoint(p, a, stoneScale(180)), r = stoneScale(80);
      const areas = L >= 5 ? [-60, 60].map(d => stonePoint(center, a + Math.PI / 2, stoneScale(d))) : [center];
      const stayed = new Map();
      let beat = 1;
      for (const q of areas) {
        q.y = clampY(q.y);
        fx.push({ k: 'stonefield', x: q.x, y: q.y, r, t: 0, T: 3 });
      }
      stoneJob(3, (o, dt) => {
        const leap = L >= 7 && o.t + 1e-8 >= beat;
        if (leap) beat++;
        for (const z of hittable()) {
          if (!areas.some(q => dist(z, q) <= r)) continue;
          if (!stayed.has(z)) stoneHit(z, .30, center, { slow: true, extra: L >= 3 ? .5 : 0, kb: 0 });
          const prev = stayed.get(z) || 0, next = Math.min(3, prev + Math.min(dt, 3 - o.t + dt));
          stayed.set(z, next);
          if (Math.floor((next + 1e-8) * 2) > Math.floor((prev + 1e-8) * 2)) stoneHit(z, .15, center, { kb: 0 });
          if (leap) stoneHit(z, .25, center, { kb: 0 });
        }
      });
    });

  SG('xuanshi', 2, 'spin', 300, .32, .26, .72, 1.3, '回燕石',
    '投出可贯穿敌人的石子，去程和回程分别结算；LV3 回程施加迟缓；LV5 展开成左右双轨，共享去程及回程伤害上限；LV7 折返时各分成两颗碎石', () => {
      const L = dlv(), p = { x: hero.x, y: hero.y }, a = stoneAim(p);
      const out = new Map(), back = new Map(), range = stoneScale(340), w = stoneScale(36);
      const returnCap = L >= 7 ? 2 : 1, extraReturn = HAS('yuhua'), extraHits = new Set();
      for (const off of L >= 5 ? [-.09, .09] : [0]) {
        const g = a + off;
        stoneShot(p, g, range, w, z => !out.has(z), z => {
          if (stoneCount(out, z, 1)) stoneHit(z, .95, p);
        }, end => {
          if (extraReturn) stoneShot(end, g + Math.PI, range, w, z => !extraHits.has(z), z => {
            extraHits.add(z); stoneHit(z, L >= 7 ? .425 : .85, end, { slow: L >= 3 });
          });
          for (const split of L >= 7 ? [-.06, .06] : [0]) {
            stoneShot(end, g + Math.PI + split, range, w, z => (back.get(z) || 0) < returnCap, z => {
              if (stoneCount(back, z, returnCap)) stoneHit(z, L >= 7 ? .425 : .85, end, { slow: L >= 3 });
            });
          }
        });
      }
    });

  SG('shici', 2, 'thrust', 300, .30, .24, .70, 1.2, '连珠石',
    '锁定敌人，依次投出五颗石子；LV3 最后一颗施加迟缓；LV5 最后一颗换成重石；LV7 对迟缓目标伤害 +10%', () => {
      const L = dlv(), range = stoneScale(340);
      let target = nearest(stoneScale(300));
      const n = HAS('feihuang') ? 6 : 5;
      stoneSequence(n, .07, i => {
        const p = { x: hero.x, y: hero.y };
        if (!target || target.dead || target.hidden || target.air || dist(target, p) > range) target = nearest(range);
        if (!target) return false;
        stoneShot(p, stoneAngle(p, target), range, stoneScale(28), openStone, z => {
          stoneHit(z, i === n - 1 && L >= 5 ? .65 : .42, p, { slow: i === n - 1 && L >= 3, bonus: L >= 7 ? .10 : 0 });
          return false;
        }, null, i === n - 1 && L >= 5 ? 1.4 : 1);
      });
      return (n - 1) * .07;
    });

  SG('paoshi', 2, 'sweep', 180, .28, .24, .75, 1.3, '锁足石',
    '向附近最多四名敌人脚边各投一颗；命中施加迟缓；LV3 迟缓多半秒；LV5 最多攻击六名敌人；LV7 轻推已迟缓的目标', () => {
      const L = dlv(), p = { x: hero.x, y: hero.y }, range = stoneScale(200);
      for (const z of stoneTargets(p, range).slice(0, L >= 5 ? 6 : 4)) {
        stoneSeek(p, z, range, q => stoneHit(q, .55, p, { slow: true, extra: L >= 3 ? .5 : 0, kb: L >= 7 && q.slT > 0 ? 22 : 8 }));
      }
    });

  SG('gunshi', 3, 'thrust', 380, .46, .34, .80, 1.7, '赶月石',
    '抛出贯穿主石，命中后分出追击碎石，每敌主石和碎石各最多命中一次；LV3 主石施加迟缓；LV5 每次最多分出两颗碎石，全招最多六颗；LV7 碎石对迟缓目标伤害 +20%', () => {
      const L = dlv(), p = { x: hero.x, y: hero.y }, hits = new Set(), range = stoneScale(150);
      let chips = 0;
      stoneShot(p, stoneAim(p), stoneScale(420), stoneScale(44), openStone, z => {
        stoneHit(z, 1.10, p, { slow: L >= 3 });
        const targets = stoneTargets(z, range, q => q !== z && !hits.has(q)).slice(0, L >= 5 ? 2 : 1);
        if (!targets.length && !z.dead && !hits.has(z) && hittable().length === 1) targets.push(z);
        for (const q of targets) {
          if (chips >= (L >= 5 ? 6 : 5)) break;
          chips++; hits.add(q);
          const from = q === z ? stonePoint(z, stoneAngle(p, z), Math.min(15, range / 2)) : z;
          stoneSeek(from, q, range, t => stoneHit(t, L >= 5 ? .35 : .45, from, { bonus: L >= 7 ? .20 : 0 }));
        }
      }, null, 1.65);
    });

  SG('luanshi', 3, 'sweep', 340, .55, .40, .73, 2.0, '穿林石',
    '前方走廊内依次落下十二颗石子，每敌最多命中五次；LV3 命中施加迟缓；LV5 改为前后两段交错落点，共十六颗；LV7 迟缓多一秒', () => {
      const L = dlv(), p = { x: hero.x, y: hero.y }, a = stoneAim(p);
      const n = L >= 5 ? 16 : 12, hits = new Map(), r = stoneScale(32), length = stoneScale(380), halfWidth = stoneScale(50);
      const points = Array.from({ length: n }, (_, i) => {
        const u = L >= 5 ? ((i % 2) * .5 + Math.floor(i / 2) / n) : i / n;
        return stonePoint(stonePoint(p, a, stoneScale(20 + u * 360)), a + Math.PI / 2, stoneScale(R(-44, 44)));
      });
      let i = 0;
      stoneJob(1.2, o => {
        while (i < n && o.t >= 1.2 * i / n) {
          const q = points[i++];
          q.y = clampY(q.y); stoneBurst(q, r, .18);
          dRect(p.x, p.y, a, length, halfWidth, z => {
            if (dist(q, z) <= r && stoneCount(hits, z, 5))
              stoneHit(z, L >= 5 ? .30 : .36, q, { slow: L >= 3, extra: L >= 7 ? 1 : 0, kb: 0 });
          });
        }
      });
    });

  SG('raoshen', 3, 'spin', 220, .40, .32, .75, 1.5, '流萤石',
    '六颗石子先绕身，随后飞向附近敌人；LV3 环绕命中施加迟缓；LV5 增至八颗并优先分散索敌；LV7 飞出后回到身边再绕一圈', () => {
      const L = dlv(), n = L >= 5 ? 8 : 6, r = stoneScale(75), range = stoneScale(280);
      const roll = S.stoneRoll || 0, flightHits = new Map();
      function orbit(returning) {
        const hits = new Map(), bodies = [];
        for (let j = 0; j < n; j++) {
          const p = stonePoint(hero, j * Math.PI * 2 / n, r);
          const b = stoneBolt(p, 0, 420, 1);
          b.vx = b.vy = 0; bodies.push(b);
        }
        stoneJob(.5, o => {
          for (let j = 0; j < n; j++) {
            const a = 2 * Math.PI * (j / n + o.t / .5);
            const p = stonePoint(hero, a, r);
            Object.assign(bodies[j], p, { a: a + Math.PI / 2 });
            for (const z of near(p.x, p.y, stoneScale(18))) if (stoneCount(hits, z, returning ? 1 : 2))
              stoneHit(z, .25, p, { slow: L >= 3 });
          }
          if (o.t < .5 && (returning || (S.stoneRoll || 0) === roll)) return;
          o.T = 0;
          for (const b of bodies) b.T = 0;
          if (returning) return;
          const targets = stoneTargets(hero, range), ends = bodies.map(b => ({ x: b.x, y: b.y }));
          for (let j = 0; j < n; j++) {
            if (!targets.length) continue;
            const q = targets[j % targets.length];
            if (j >= targets.length * 2) continue;
            stoneSeek(bodies[j], q, range + r, z => {
              if (stoneCount(flightHits, z, 2)) stoneHit(z, .70, bodies[j]);
              ends[j] = { x: z.x, y: z.y };
            });
          }
          if (L >= 7) stoneJob((range + r) / 420, flight => {
            if (flight.t < flight.T) return;
            const returningBolts = ends.map(p => {
              const b = stoneBolt(p, stoneAngle(p, hero), .22 * 420);
              b.vx = b.vy = 0; return b;
            });
            stoneJob(.22, ret => {
              const f = Math.min(1, ret.t / ret.T);
              for (let j = 0; j < n; j++) {
                const p = ends[j], q = stonePoint(hero, j * Math.PI * 2 / n, r);
                Object.assign(returningBolts[j], { x: p.x + (q.x - p.x) * f, y: p.y + (q.y - p.y) * f, a: stoneAngle(p, q) });
              }
              if (f === 1) orbit(true);
            });
          });
        });
      }
      orbit(false);
    });

  SG('feihuang', 4, 'sweep', 300, .62, .42, .95, 1.9, '漫天飞蝗',
    '向四面分批撒出十四颗石子，优先打不同敌人，每敌最多四颗；LV3 命中施加迟缓；LV5 石子增至十八颗；LV7 对迟缓目标伤害 +10%', () => {
      const L = dlv(), n = (L >= 5 ? 18 : 14) + (HAS('feihuang') ? 1 : 0);
      const range = stoneScale(340), hits = new Map(), sent = new Map();
      stoneSequence(n, .018, i => {
        const p = { x: hero.x, y: hero.y };
        const targets = stoneTargets(p, range, z => (sent.get(z) || 0) < 4);
        targets.sort((a, b) => (sent.get(a) || 0) - (sent.get(b) || 0));
        const q = targets[0];
        if (!q) { stoneBolt(p, i * 2.39996, range); return; }
        stoneCount(sent, q, 4);
        stoneSeek(p, q, range, z => {
          if (stoneCount(hits, z, 4)) stoneHit(z, L >= 5 ? .65 : .75, p, { slow: L >= 3, bonus: L >= 7 ? .10 : 0 });
        });
      });
      return (n - 1) * .018;
    });

  SG('luoshi', 4, 'up', 360, .68, .42, .92, 2.2, '天坠星陨',
    '向敌群投下巨石，在落点炸开并向外飞散碎石，每敌最多受两颗碎石伤害；LV3 巨石施加迟缓；LV5 碎石增至十二颗；LV7 巨石对迟缓目标伤害 +20%', () => {
      const L = dlv(), origin = { x: hero.x, y: hero.y }, r = stoneScale(90);
      const targets = stoneTargets(origin, stoneScale(380));
      targets.sort((a, b) => near(b.x, b.y, r).length - near(a.x, a.y, r).length);
      const target = targets[0] || stonePoint(origin, stoneAim(origin), stoneScale(180));
      const p = { x: target.x, y: clampY(target.y) }, delay = .42;
      fx.push({ k: 'stonefall', x: p.x, y: p.y, r, t: 0, T: delay });
      stoneJob(delay, o => {
        if (o.t < delay) return;
        stoneBurst(p, r);
        sfx(CR, p.x); shake = Math.max(shake, .15);
        for (const z of near(p.x, p.y, r)) stoneHit(z, 2.40, p, { slow: L >= 3, bonus: L >= 7 ? .20 : 0, kb: 24 });
        const hits = new Map(), n = L >= 5 ? 12 : 8;
        for (let i = 0; i < n; i++) stoneShot(p, i * Math.PI * 2 / n, stoneScale(180), stoneScale(20),
          z => (hits.get(z) || 0) < 2, z => {
            if (stoneCount(hits, z, 2)) stoneHit(z, L >= 5 ? .30 : .40, p);
            return false;
          });
      });
    });

  // 锤沿用旧武艺编号，落点和地面震波共用战斗坐标。
  const HG = (key, tier, mot, name, need, wu, rc, desc, cast) => {
    const speed = [1.3, 1.35, 1.8, 2.1][tier - 1];
    DRS1[key] = [.75, .75, .8, .9][tier - 1];
    DSP1[key] = speed;
    WOFX[key] = 2; MOTX[key] = mot;
    add(key, { key, tier, name, icon: name[0], color: tier >= 3 ? '#ffc16d' : '#d0a16e',
      dk: 1, hammer: true, need, wu: wu / speed, rc: rc / speed, desc, cast });
  };
  const hammerPoint = (p, a, d) => {
    const q = stonePoint(p, a, stoneScale(d));
    q.y = clampY(q.y);
    return q;
  };
  const hammerFx = (p, r, T = .28) => {
    stoneBurst(p, stoneScale(r), T);
    sfx(CR, p.x);
    shake = Math.max(shake, .04 * SK[CK].tier);
  };
  const hammerWind = (key, radius) => {
    const scale = DK * rsOf(key), p = { x: hero.x, y: hero.y }, target = nearest(SK[key].need * scale);
    const a = target ? stoneAngle(p, target) : Math.atan2(0, hero.f);
    return { p, a, q: stonePoint(p, a, Math.min(radius * scale, target ? dist(p, target) : radius * scale)) };
  };
  const hammerAim = () => {
    const lock = S.wind && S.wind.hammerLock;
    const plan = lock || hammerWind(CK, SK[CK].need);
    plan.q.y = clampY(plan.q.y);
    return plan;
  };
  function hammerHit(z, m, p, stun = 0, kb = 8) {
    if (!DH(z, m, kb, { x: p.x }) || z.dead) return;
    const grade = slowGrade(z);
    if (stun && grade !== 2) stunz(z, grade === 1 ? stun / 2 : stun);
  }
  function hammerCircle(p, r, m, seen = new Set(), stun = 0, kb = 8) {
    hammerFx(p, r);
    for (const z of hittable()) {
      if (seen.has(z) || dist(z, p) > stoneScale(r)) continue;
      seen.add(z);
      hammerHit(z, m, p, stun, kb);
    }
    return seen;
  }
  function hammerSweep(p, a, half, r, damage, hits, kb) {
    const reach = stoneScale(r);
    fx.push({ k: 'hammerArc', x: p.x, y: p.y, a, half, r: reach, t: 0, T: .22 });
    sfx(SW, p.x);
    for (const z of hittable()) {
      if (hits.has(z) || dist(z, p) > reach || angDiff(stoneAngle(p, z), a) > half) continue;
      hits.add(z); hammerHit(z, damage, p, 0, kb);
    }
  }
  function hammerCore(p, core, radius, damage, outer, stun, a = 0) {
    const hits = new Set(), rings = [p];
    if (CK === 'pocheng' && dlv() >= 5) {
      const across = a + Math.PI / 2;
      rings.push(hammerPoint(p, across, 52), hammerPoint(p, across, -52));
    }
    for (const q of rings) hammerFx(q, radius);
    hammerFx(p, core, .2);
    let triggered = false;
    for (const z of hittable()) {
      if (hits.has(z) || !rings.some(q => dist(q, z) <= stoneScale(radius))) continue;
      const center = dist(p, z) <= stoneScale(core);
      hits.add(z);
      hammerHit(z, center ? damage * (HAS('pobichui') ? 1.25 : 1) : outer, p, center ? stun : 0);
      triggered ||= center;
    }
    if (triggered && HAS('zhenyuechui')) hammerAfter(.30, () => hammerCircle(p, 70, .55));
    return hits;
  }
  function hammerAfter(T, fire, cancellable = false) {
    const roll = S.stoneRoll || 0;
    stoneJob(T, o => {
      if (cancellable && ((S.stoneRoll || 0) !== roll || busy())) { o.T = 0; return; }
      if (o.t >= T) fire();
    });
    return T;
  }
  function hammerWave(p, a, length, width, m, hits, T = .27, kb = 8, offset = 0) {
    let previous = 0;
    const reach = stoneScale(length);
    let lastVisual = -.06;
    stoneJob(T, o => {
      const d = reach * Math.min(1, o.t / T), w = stoneScale(width) / 2;
      if (o.t - lastVisual >= .045) {
        lastVisual = o.t;
        stoneBurst(stonePoint(p, a, d), w, .17);
      }
      for (const z of hittable()) {
        if (hits.has(z)) continue;
        const dx = z.x - p.x, dy = (z.y - p.y) * 2;
        const along = dx * Math.cos(a) + dy * Math.sin(a);
        if (along < Math.max(offset, previous - 3) || along > d + 3 || Math.abs(dx * Math.sin(a) - dy * Math.cos(a)) > w) continue;
        hits.add(z); hammerHit(z, m, p, 0, kb);
      }
      previous = d;
    });
  }
  function hammerRing(p, start, end, m, T) {
    let previous = stoneScale(start);
    const hits = new Set();
    fx.push({ k: 'hammerRing', x: p.x, y: p.y, r0: previous, r: stoneScale(end), t: 0, T });
    stoneJob(T, o => {
      const r = stoneScale(start + (end - start) * Math.min(1, o.t / T));
      for (const z of hittable()) {
        const d = dist(z, p);
        if (hits.has(z) || d < previous - 5 || d > r + 5) continue;
        hits.add(z); hammerHit(z, m, p);
      }
      previous = r;
    });
  }
  const hammerReach = n => n * (HAS('mingleichui') ? 1.2 : 1);
  const hammerCoreReach = { kaishan: 125, zhichui: 145, pocheng: 140 };

  HG('zhidao', 1, 'chop', '磐石砸', 100, .35, .26, '向正前方落一锤，打击小圆区域', () => {
    const { p, a } = hammerAim();
    hammerCircle(hammerPoint(p, a, 80), 46, 1.15);
  });
  HG('lunchui', 1, 'sweep', '松风抡', 100, .30, .24, '横抡身前扇面；LV5 扇面向两侧展开', () => {
    const { p, a } = hammerAim();
    hammerSweep(p, a, (dlv() >= 5 ? 80 : 65) * Math.PI / 180, 105, 1, new Set(), 8);
  });
  HG('zhendi', 1, 'chop', '伏雷震', 75, .38, .27, '砸出贴身一圈震纹；LV7 加强贴身击退', () => {
    hammerCircle(hammerAim().p, 85, 1.05, new Set(), 0, dlv() >= 7 ? 22 : 8);
  });
  HG('kaishan', 2, 'chop', '断碑砸', 135, .52, .32, '起手锁定落点，锤心直击更重；锤心眩晕；LV3 眩晕多 0.15 秒；LV7 再多 0.10 秒', () => {
    const L = dlv();
    hammerCore(hammerAim().q, 30, 70, 1.95, 1.15, .55 + (L >= 3 ? .15 : 0) + (L >= 7 ? .10 : 0));
  });
  HG('tiaotian', 2, 'chop', '叠浪砸', 140, .40, .34, '先近后远连砸两下；LV3 第二砸中心短暂眩晕；LV5 第二砸向左右展开；LV7 第二砸眩晕多 0.15 秒', () => {
    const { p, a } = hammerAim(), L = dlv();
    hammerCircle(hammerPoint(p, a, 65), 50, .80);
    return hammerAfter(.25, () => {
      const far = hammerPoint(p, a, 125);
      const spots = L >= 5 ? [hammerPoint(far, a + Math.PI / 2, -26), hammerPoint(far, a + Math.PI / 2, 26)] : [far];
      for (const q of spots) hammerFx(q, 50);
      for (const z of hittable()) {
        const d = Math.min(...spots.map(q => dist(q, z)));
        if (d > stoneScale(50)) continue;
        hammerHit(z, 1.20, far, L >= 3 && d <= stoneScale(24) ? (L >= 7 ? .50 : .35) : 0);
      }
    }, true);
  });
  HG('dizhen', 2, 'chop', '裂堤震', 145, .43, .29, '锤击地面放出沿直线推进的窄震波；LV5 波尾左右分岔，共享命中上限；LV7 分岔加强击退', () => {
    const { p, a } = hammerAim(), L = dlv(), hits = new Set(), length = hammerReach(180);
    hammerWave(p, a, length, 56, 1.45, hits);
    if (L >= 5) hammerAfter(.22, () => {
      const fork = hammerPoint(p, a, length * .72);
      for (const g of [-.48, .48]) hammerWave(fork, a + g, length * .32, 37, 1.45, hits, .13, L >= 7 ? 22 : 8);
    });
  });
  HG('xuanchui', 2, 'sweep', '回岚抡', 95, .38, .34, '前扫后回身，同一敌人最多吃一段；LV5 回身段转成一整圈；LV7 回身段加强击退', () => {
    const { p, a } = hammerAim(), L = dlv(), hits = new Set();
    hammerSweep(p, a, Math.PI / 2, 105, 1.05, hits, 8);
    return hammerAfter(.22, () => hammerSweep(p, a + Math.PI, L >= 5 ? Math.PI : Math.PI / 2, 105, .65, hits, L >= 7 ? 22 : 8), true);
  });
  HG('zhichui', 3, 'up', '飞崖砸', 160, .58, .38, '锁定地面位置并跃砸；锤心眩晕；LV3 眩晕多 0.15 秒；LV5 落地向前甩出窄震波；LV7 起跳轻推身边敌人', () => {
    const { a, q } = hammerAim(), p = { x: hero.x, y: hero.y }, L = dlv();
    if (L >= 7) for (const z of near(p.x, p.y, stoneScale(45))) if (!tough(z)) z.vx = (Math.sign(z.x - p.x) || hero.f) * 18;
    const d = dist(p, q), goal = stonePoint(p, stoneAngle(p, q), Math.min(d, stoneScale(145)));
    const T = .18, roll = S.stoneRoll || 0;
    stoneJob(T, o => {
      const f = Math.min(1, o.t / T);
      if (busy() || (S.stoneRoll || 0) !== roll) { o.T = 0; return; }
      moveEnt(hero, p.x + (goal.x - p.x) * f - hero.x, clampY(p.y + (goal.y - p.y) * f) - hero.y);
      if (f < 1) return;
      const at = { x: hero.x, y: hero.y };
      const hits = hammerCore(at, 38, 85, 2.65, 1.50, L >= 3 ? .80 : .65);
      if (L >= 5) hammerWave(at, a, 135, 42, 1.50, hits);
    });
    return T;
  });
  HG('wanjun', 3, 'chop', '回潮震', 115, .55, .38, '脚下砸击以后，震环逐渐扩开；LV5 外震拆成两道；LV7 初击眩晕 0.40 秒', () => {
    const { p } = hammerAim(), L = dlv();
    hammerCircle(p, 60, 1.20, new Set(), L >= 7 ? .40 : 0);
    hammerRing(p, 0, hammerReach(175), L >= 5 ? .675 : 1.35, .35);
    if (L >= 5) hammerAfter(.13, () => hammerRing(p, 0, hammerReach(175), .675, .35));
  });
  HG('leiting', 3, 'chop', '追霆砸', 150, .56, .40, '首砸后在附近敌群脚下落下余震，同敌最多吃一道余震；LV5 增至三道；LV7 首砸中心眩晕 0.45 秒', () => {
    const { p, a } = hammerAim(), target = nearest(stoneScale(150)), L = dlv();
    const q = hammerPoint(p, a, Math.min(140, target ? dist(p, target) / stoneScale(1) : 140));
    hammerFx(q, 60);
    for (const z of hittable()) if (dist(z, q) <= stoneScale(60))
      hammerHit(z, 1.40, q, L >= 7 && dist(z, q) <= stoneScale(26) ? .45 : 0);
    const hits = new Set(), spots = [];
    for (let i = 0; i < (L >= 5 ? 3 : 2); i++) hammerAfter(.15 + i * .14, () => {
      const targets = stoneTargets(q, stoneScale(125), z => !hits.has(z) && spots.every(p => dist(z, p) > stoneScale(30)));
      targets.sort((a, b) => near(b.x, b.y, stoneScale(46)).length - near(a.x, a.y, stoneScale(46)).length);
      const z = targets[0];
      const at = z ? { x: z.x, y: z.y } : hammerPoint(q, a + i * 2.4, 35 + i * 12);
      spots.push(at); hammerCircle(at, 46, .65, hits);
    });
  });
  HG('pocheng', 4, 'chop', '五岳压顶', 155, .72, .46, '同一处先砸出裂纹再落重锤；末锤中心眩晕；LV3 眩晕多 0.15 秒；LV5 末击外圈向两侧裂开；LV7 锤心伤害额外增加', () => {
    const { q, a } = hammerAim(), L = dlv();
    hammerCircle(q, 90, 1.10);
    return hammerAfter(.32, () => hammerCore(q, 40, 90, L >= 7 ? 2.80 : 2.50, 1.45, L >= 3 ? .95 : .80, a), true);
  });
  HG('bengshan', 4, 'chop', '八荒雷动', 125, .68, .48, '先砸近圈，再向四面发出一道外震；近圈短暂眩晕；LV3 近圈眩晕多 0.15 秒；LV5 外震化为八股；LV7 放射波加强击退', () => {
    const { p, a } = hammerAim(), L = dlv(), r = hammerReach(205);
    hammerCircle(p, 80, 1.5, new Set(), L >= 3 ? .65 : .50);
    if (L < 5) hammerRing(p, 0, r, 1.65, .36);
    else {
      const hits = new Set();
      for (let i = 0; i < 8; i++) hammerWave(p, a + i * Math.PI / 4, r, 53, 1.65, hits, .36, L >= 7 ? 23 : 8);
    }
  });

  const BG = (key, tier, mot, name, need, wu, rc, desc, cast) => {
    const speed = [1.3, 1.35, 1.8, 2.1][tier - 1];
    DRS1[key] = [.8, .82, .85, .9][tier - 1];
    DSP1[key] = speed; WOFX[key] = 5; MOTX[key] = mot;
    add(key, { key, tier, name, icon: name[0], color: key === 'huoshi' ? '#ff9850' : '#eac67e',
      dk: 1, bow: true, need, wu: wu / speed, rc: rc / speed, desc,
      cast() { sfx('bow', hero.x); return cast(); } });
  };
  const bowLong = k => k === 'zhuihun' || k === 'dianguang' || k === 'guanri';
  const bowOrigin = () => ({ x: hero.x, y: hero.y });
  const bowImpact = (p, r, t = .22) => stoneBurst(p, stoneScale(r), t);
  const bowTarget = n => {
    const p = bowOrigin(), z = nearest(stoneScale(n));
    const q = z ? { x: z.x, y: z.y } : stonePoint(p, stoneAim(p), stoneScale(n * .7));
    q.y = clampY(q.y); return q;
  };
  function bowBurn(z, damage, count) {
    if (z.dead) return;
    const strength = damage * CM;
    if (z.bowBurn && DKO.includes(z.bowBurn.job)) {
      if (z.bowBurn.strength <= strength) Object.assign(z.bowBurn, { strength, damage, cm: CM, ck: CK });
      z.bowBurn.left = count; z.bowBurn.next = .5;
    } else {
      const burn = z.bowBurn = { strength, damage, cm: CM, ck: CK, left: count, next: .5 };
      burn.job = dmk({ T: Infinity, tick(o, dt) {
        if (z.dead) { z.bowBurn = null; o.T = 0; return; }
        burn.next -= dt;
        while (burn.next <= 0 && burn.left > 0 && !z.dead) {
          burn.next += .5; burn.left--;
          CM = burn.cm; CK = burn.ck;
          const d = burn.damage * DU * RT.dmg * CM * VUL(z);
          rec(d); hit(z, d, 0, 1, false, 0, 0, false, false, { dot: true, secondary: true, survSkill: true });
        }
        if (!burn.left || z.dead) { z.bowBurn = null; o.T = 0; }
      } });
      DKO.push(burn.job);
    }
  }
  function bowHit(z, m, p, slow = false, extra = 0, kb = 5) {
    if (!DH(z, m, kb, { x: p.x }) || z.dead) return;
    if (slow) addSL(z, extra);
    if (HAS('chiyugong') && (CK === 'luoyue' || CK === 'luori')) bowBurn(z, .10, 3);
  }
  function bowShot(p, a, range, width, contact, flame = false) {
    const color = flame ? ['255,129,54', '255,211,105'] : ARW.col;
    stoneShot(p, a, stoneScale(range), typeof width === 'function' ? d => stoneScale(width(d / stoneScale(1))) : stoneScale(width),
      openStone, z => contact(z, Math.max(0, (z.x - p.x) * Math.cos(a) + (z.y - p.y) * 2 * Math.sin(a)) / stoneScale(1)), null, 1, 0, color);
  }
  function bowDrop(p, r, T, fire, arrows = 1) {
    fx.push({ k: 'bowFall', x: p.x, y: p.y, r: stoneScale(r), t: 0, T, arrows });
    hammerAfter(T, () => { bowImpact(p, r); fire(); });
  }
  const bowInside = (z, p, r) => dist(z, p) <= stoneScale(r);
  const bowZones = (p, r, spread) => spread ? [p, ...[-1, 1].map(i => ({ x: p.x + i * stoneScale(r * .55), y: p.y }))] : [p];
  function bowEcho(p) {
    if (HAS('zhurigong')) bowDrop(p, 30, .20, () => {
      for (const z of hittable()) if (bowInside(z, p, 30)) DH(z, .55, 0, { x: p.x });
    });
  }
  function bowDistanceBonus(d, threshold, L) {
    return d >= threshold * (HAS('diaolinggong') ? .8 : 1) ? (L >= 7 ? 1.30 : 1.20) : 1;
  }
  const bowReach = n => n * (HAS('diaolinggong') ? 1.15 : 1);

  BG('qishe', 1, 'thrust', '掠风箭', 360, .26, .20, '快速平射一支轻箭，命中首个敌人', () => {
    const p = bowOrigin();
    bowShot(p, stoneAim(p), 410, 24, z => { bowHit(z, .85, p); return false; });
  });
  BG('lianzhu', 1, 'thrust', '透叶箭', 360, .33, .23, '细箭连续穿过两名敌人；LV5 可再贯穿一人；LV7 末次命中轻推', () => {
    const p = bowOrigin(), L = dlv(), cap = L >= 5 ? 3 : 2;
    let i = 0;
    bowShot(p, stoneAim(p), 430, 30, z => {
      bowHit(z, [.75,.55,.40][i++], p, false, 0, L >= 7 && i === cap ? 18 : 5);
      return i < cap;
    });
  });
  BG('luoyue', 1, 'up', '落雁箭', 330, .31, .24, '一支箭从天落入小圆；LV5 增加横向箭影，共享命中上限', () => {
    const p = bowTarget(350), L = dlv(), spots = bowZones(p, 46, L >= 5);
    bowDrop(p, 46, .25, () => {
      for (const q of spots) if (q !== p && L >= 5) bowImpact(q, 35);
      for (const z of hittable()) if (spots.some(q => bowInside(z, q, q === p || L < 5 ? 46 : 35))) bowHit(z, 1, p);
    }, L >= 5 ? 3 : 1);
  });
  BG('zhuihun', 2, 'thrust', '满月箭', 400, .47, .29, '拉满弓平射重箭，远距命中增伤；LV5 可穿过第一名敌人；LV7 远距增伤提高', () => {
    const p = bowOrigin(), L = dlv(); let i = 0;
    bowShot(p, stoneAim(p), bowReach(470), 34, (z, d) => {
      bowHit(z, (i++ === 0 ? 1.55 : .55) * bowDistanceBonus(d, 230, L), p);
      return L >= 5 && i < 2;
    });
  });
  BG('liannu', 2, 'thrust', '叠影箭', 360, .32, .28, '沿同一方向先后射出两箭；LV5 第二箭稍向侧方偏移；LV7 第二箭对迟缓敌人增伤', () => {
    const origin = bowOrigin(), a = stoneAim(origin), L = dlv();
    stoneSequence(2, .14, i => {
      const p = bowOrigin();
      bowShot(p, a + (i && L >= 5 ? .048 : 0), 430, 26, z => {
        bowHit(z, i && L >= 7 && z.slT > 0 ? .805 : .70, p); return false;
      });
    });
    return .14;
  });
  BG('xuanshe', 2, 'thrust', '寒芒箭', 350, .33, .25, '朝脚边射箭，命中首个敌人；命中迟缓；LV3 迟缓多半秒；LV5 追射后方一人；LV7 轻推已迟缓目标', () => {
    const p = bowOrigin(), a = stoneAim(p), L = dlv(), extra = L >= 3 ? .5 : 0;
    const hit = (z, m, from) => bowHit(z, m, from, true, extra, L >= 7 && z.slT > 0 ? 20 : 5);
    bowShot(p, a, 410, 32, z => {
      hit(z, .90, p);
      if (L >= 5) {
        const q = stoneTargets(z, stoneScale(150), q => q !== z && angDiff(stoneAngle(z, q), a) < Math.PI / 3)[0];
        if (q) bowShot(stonePoint(z, a, 8), stoneAngle(z, q), 155, 22, t => {
          if (t === z) return true;
          hit(t, .45, z); return false;
        });
      }
      return false;
    });
  });
  BG('jianyu', 2, 'up', '疏雨箭', 350, .40, .30, '箭从天分落在多处，每敌最多吃两处；命中迟缓；LV3 迟缓多半秒；LV5 增为五处；LV7 第二次命中迟缓再多半秒', () => {
    const p = bowTarget(380), o = bowOrigin(), L = dlv(), count = L >= 5 ? 5 : 3, hits = new Map();
    const targets = stoneTargets(p, stoneScale(95), z => bowInside(z, o, 380));
    for (let i = 0; i < count; i++) {
      const z = targets[i];
      const q = z ? { x: z.x, y: z.y } : i === 0 ? p : hammerPoint(p, i * 2.39996, 29 + i * 4);
      bowDrop(q, 44, .28 + i * .065, () => {
        for (const t of hittable()) if (bowInside(t, q, 44) && stoneCount(hits, t, 2))
          bowHit(t, L >= 5 ? .55 : .65, q, true, (L >= 3 ? .5 : 0) + (L >= 7 && hits.get(t) === 2 ? .5 : 0));
      });
    }
  });
  BG('dianguang', 3, 'thrust', '穿云箭', 450, .54, .36, '沿窄线平射一支贯穿重箭，远距命中增伤；LV5 远段增宽；LV7 远距增伤提高', () => {
    const p = bowOrigin(), L = dlv();
    bowShot(p, stoneAim(p), bowReach(560), d => L >= 5 && d >= 250 ? 57 : 42,
      (z, d) => bowHit(z, 1.95 * bowDistanceBonus(d, 250, L), p));
  });
  BG('huoshi', 3, 'thrust', '燎原箭', 380, .46, .33, '火箭命中后溅出一圈火星；命中与火星均施加灼烧；LV3 灼烧多一跳；LV5 两翼扩散；LV7 主目标灼烧加强', () => {
    const p = bowOrigin(), a = stoneAim(p), L = dlv(), red = HAS('chiyugong');
    const r = 65 * (red ? 1.2 : 1), n = 4 + (L >= 3 ? 1 : 0) + (red ? 1 : 0);
    bowShot(p, a, 460, 32, z => {
      const q = { x: z.x, y: z.y };
      bowHit(z, 1.30, p); bowBurn(z, L >= 7 ? .22 : .18, n);
      const spots = L >= 5 ? [-32, 32].map(d => hammerPoint(q, a + Math.PI / 2, d)) : [q];
      for (const at of spots) bowImpact(at, r, .28);
      for (const t of hittable()) if (t !== z && spots.some(at => bowInside(t, at, r))) {
        bowHit(t, .35, q); bowBurn(t, .10, n);
      }
      return false;
    }, true);
  });
  BG('luori', 3, 'up', '坠星箭', 400, .53, .36, '重箭从天垂直坠下，中心伤害更高；LV5 外圈向左右展开；LV7 中心伤害额外提高', () => {
    const p = bowTarget(430), L = dlv(), spots = bowZones(p, 75, L >= 5);
    bowDrop(p, 75, .50, () => {
      if (L >= 5) for (const q of spots) if (q.x !== p.x) bowImpact(q, 56);
      let center = false;
      for (const z of hittable()) {
        const core = bowInside(z, p, 28);
        if (!core && !spots.some(q => bowInside(z, q, q.x === p.x ? 75 : 56))) continue;
        center ||= core;
        bowHit(z, core ? (L >= 7 ? 2.90 : 2.65) : 1.45, p);
      }
      if (center) bowEcho(p);
    });
  });
  BG('guanri', 4, 'thrust', '贯日惊弦', 480, .67, .44, '一支长箭沿直线贯穿整列，远距增伤；LV5 箭势沿途扩大；LV7 远距增伤提高', () => {
    const p = bowOrigin(), L = dlv(), reach = bowReach(680);
    bowShot(p, stoneAim(p), reach, d => 64 + (L >= 5 ? 42 * Math.min(1, d / reach) : 0),
      (z, d) => bowHit(z, 2.85 * bowDistanceBonus(d, 300, L), p));
  });
  BG('wanjian', 4, 'up', '万箭穿心', 410, .66, .44, '锁定同一中心，三波天降箭雨逐次收紧；LV3 第一波迟缓；LV5 首波落区分成三片；LV7 最后一波中心增伤', () => {
    const p = bowTarget(450), L = dlv();
    [105, 72, 42].forEach((r, i) => {
      const split = L >= 5 && i === 0;
      const spots = split ? [0, 1, 2].map(j => hammerPoint(p, j * Math.PI * 2 / 3, 36)) : [p];
      const radius = split ? 70 : r, delay = [.30,.48,.66][i];
      for (const q of spots) bowDrop(q, radius, delay, q === spots[0] ? () => {
        let center = false;
        for (const z of hittable()) {
          if (!spots.some(q => bowInside(z, q, radius))) continue;
          const core = i === 2 && bowInside(z, p, 21);
          center ||= core;
          bowHit(z, [.70, 1.05, 1.65][i] + (core && L >= 7 ? .30 : 0), p, i === 0 && L >= 3);
        }
        if (center) bowEcho(p);
      } : () => {}, i === 2 ? 7 : 5);
    });
  });

  // ---------- 出身（开局配置里选；起手只有 1 个武艺） ----------
  const ORIGINS = {
    nongfu: { name: '农夫', tag: '刀 · 锤', wep: 0, weps: [0, 2], skill: 'hengsao', desc: '庄稼汉，挨得住打。受到伤害 -20%；本门刀或锤', take: .8, oa: [5, 4, 2, 1, 1, 2, 1, 3], at: [6, 4, 2, 2, 3, 2, 2, 1, 3] },
    xiaozu: { name: '小卒', tag: '枪 · 关刀', wep: 3, weps: [3, 4], skill: 'qiang', desc: '行伍出身，出手利落。武艺起手 -20%；本门枪或关刀', wu: .8, oa: [4, 4, 5, 1, 1, 2, 1, 3], at: [4, 3, 4, 3, 2, 2, 2, 1, 3] },
    liehu: { name: '猎户', tag: '石子 · 弓', wep: 7, weps: [7, 5], skill: 'feishi', desc: '山里跑惯了。移动速度 +12%；本门石子或弓', move: 1.12, oa: [3, 4, 1, 5, 1, 4, 1, 3], at: [3, 2, 2, 5, 3, 2, 5, 2, 3] },
    shusheng: { name: '书生', tag: '黄符 · 羽扇', wep: 8, weps: [8, 9], skill: 'huofu', desc: '手无缚鸡之力，却通术法。本门黄符或羽扇', oa: [2, 1, 1, 1, 1, 2, 6, 4], at: [2, 1, 1, 2, 3, 6, 2, 6, 5] },
  };
  let origin = 'nongfu';
  const OG = () => ORIGINS[origin] || ORIGINS.nongfu;
  // ---------- 武艺类别 / 出身熟练 / 类别共鸣 / 连携 / 熟练度 ----------
  // 大类（出身熟练、心法专精）→ 具体兵器（连携、共鸣、施法时手里拿什么）
  const CATN = ['短兵器', '长兵器', '远程', '法师'], CATA = [1, 2, 3, 6];   // 大类 → 出身属性下标
  const WEPN = ['刀', '剑', '锤', '枪', '关刀', '弓', '弩', '石子', '黄符', '羽扇', '拳'], WEPCAT = [0, 0, 0, 1, 1, 2, 2, 2, 3, 3, 0];
  // 11/12 用户定：刀一共 13 招（黄：横扫 连斩 刀波 / 玄：回马刀 刀轮 回旋斩 / 地：裂地环 地裂波 双环击飞 / 天：天崩地裂 飞轮刃 血河斩 万刃归宗），任何出身都能捡、能买，出刀时就是刀的帧，只是出身的短兵属性决定威力（农夫 ×1.18、书生 ×0.73）
  //   原本归剑/锤/关刀的连斩、地裂波、双环击飞、天崩地裂、回旋斩、血河斩、万刃归宗改归刀；四象剑气、震地不在名单里，留给以后的剑、锤
  const WOF = { hengsao: 0, daobo: 0, huima: 0, daolun: 0, lianzhan: 0, wanren: 0, dilie: 0, shuanghuan: 0, tianbeng: 0, xuanfeng: 0, xuehe: 0, liedihuan: 0, feilunren: 0, sixiang: 1, zhendi: 2, qiang: 3, chong: 3, lianci: 3, lansao: 3, tiaoqiang: 3, lihua: 3, touqiang: 3, huimaq: 3, qianglin: 3, bainiao: 3, qijin: 3, longyin: 3, jianyu: 5, huogong: 9, pili: 8, feishi: 7, sashi: 7, zashi: 7, tiaoshi: 7, xuanshi: 7, paoshi: 7, luoshi: 7, shici: 7, raoshen: 7, luanshi: 7, feihuang: 7, gunshi: 7, huofu: 8, feifu: 8, dingshen: 8, zhangxin: 8, wulei: 8, sadou: 8, tianlei: 8, fuhuo: 8, jiutian: 8, huangtian: 8, taiping: 8 };
  Object.assign(WOF, WOFX);
  const wepOf = k => WOF[k] != null ? WOF[k] : 0;
  const ONLY_DAO = true; const WEP_ON = [0, 1, 2, 3, 4, 5, 7, 8, 9, 10]; const wepOk = k => WEP_ON.includes(wepOf(k));   // 11/13：刀、枪、石子、黄符的招式做好了   // 11/12：刀、枪都有美术了   // 用户定 11/10：目前只有刀的美术，武艺奖励只出刀系；其他武器等美术补齐再开
  const catOf = k => WEPCAT[wepOf(k)];
  // 武艺姿势：主角固定空手，放招时按这一招的兵器举起对应的施招帧（第 1 帧蓄力，第 2 帧出手，更多帧给第二刀和收势）
  // FRW 下标同 WEPN：[帧名前缀, 帧数]；法术暂按武艺配法器，之后改成按装备的法器
  const FRW = [['dao', 4], ['jian', 4], ['chui', 2], ['qiang', 4], ['guandao', 5], ['gong', 2], ['nu', 2], ['shi', 2], ['zhang', 3]];
  const MAGE_FR = { huogong: 'shan', pili: 'fu' }, RECOV_N = { hengsao: 3, xuanfeng: 3, xuehe: 4, pili: 3 };
  // 11/12 用户定：主角始终拿出身兵器（农夫刀、小卒枪），不论放刀招还是枪招，都按这一招的「动作类型」取手中兵器的帧
  //   5 种动作：劈 chop / 横扫 sweep / 刺 thrust / 转 spin / 挑 up。以后弓、法术、石子的图集也都画这 5 个动作
  const MOT = { hengsao: 'sweep', lianzhan: 'sweep', xuehe: 'sweep', feilunren: 'sweep', daobo: 'chop', dilie: 'chop', shuanghuan: 'chop', liedihuan: 'chop', tianbeng: 'chop', daolun: 'spin', xuanfeng: 'spin', wanren: 'spin', huima: 'up',
    qiang: 'thrust', chong: 'thrust', lianci: 'thrust', touqiang: 'thrust', huimaq: 'thrust', bainiao: 'thrust', qijin: 'thrust', lansao: 'sweep', tiaoqiang: 'up', lihua: 'spin', qianglin: 'spin', longyin: 'chop',
    feishi: 'thrust', sashi: 'sweep', zashi: 'chop', tiaoshi: 'thrust', xuanshi: 'spin', paoshi: 'up', luoshi: 'up', shici: 'chop', raoshen: 'spin', luanshi: 'up', feihuang: 'sweep', gunshi: 'chop',
    pili: 'chop', huofu: 'thrust', feifu: 'sweep', dingshen: 'thrust', zhangxin: 'chop', wulei: 'spin', sadou: 'up', tianlei: 'chop', fuhuo: 'sweep', jiutian: 'chop', huangtian: 'up', taiping: 'spin', jianyu: 'up', huogong: 'up' };
  // [起手, 出手, 第二击]；刀没有专门的刺帧，借横斩
  // 11/12 新图集：每种兵器 20 帧，统一命名 前缀 + idle/walk1-3/roll1-4/hurt/down/chop1-2/sweep1-2/thrust1-2/spin1-2/up1-2
  const FRM0 = p => ({ chop: [p + 'chop1', p + 'chop2', p + 'chop2'], sweep: [p + 'sweep1', p + 'sweep2', p + 'sweep1'], thrust: [p + 'thrust1', p + 'thrust2', p + 'thrust1'], spin: [p + 'spin1', p + 'spin2', p + 'spin2'], up: [p + 'up1', p + 'up2', p + 'chop2'] });
  const FRM = { wd_: FRM0('wd_'), qiang_: FRM0('qiang_'), bow_: FRM0('bow_'), stone_: FRM0('stone_'), fan_: FRM0('fan_'), huangfu_: FRM0('huangfu_'), quan_: FRM0('quan_'), guandao_: FRM0('guandao_'), jian_: FRM0('jian_'), chui_: FRM0('chui_') };
  Object.assign(MOT, MOTX);
  const HELDP = { 0: 'wd_', 1: 'jian_', 2: 'chui_', 3: 'qiang_', 4: 'guandao_', 5: 'bow_', 7: 'stone_', 8: 'huangfu_', 9: 'fan_', 10: 'quan_' };   // 书生开局拿黄符
  // 11/13 用户定：开局在出身的两种本门兵器里挑一种，主角手里一直拿它，起手武艺也跟着换
  let startW = null; const heldW = () => startW != null && (OG().weps || []).includes(startW) ? startW : OG().wep;
  const START_SK = { 0: 'hengsao', 2: 'zhendi', 3: 'qiang', 4: 'hengti', 7: 'feishi', 5: 'qishe', 8: 'huofu', 9: 'shanfeng', 1: 'jlianci', 10: 'chongquan' };
  const startSk = () => START_SK[heldW()] || OG().skill;
  const heldPre = () => HELDP[heldW()] || 'wd_';
  const preOf = k => { const p = HELDP[wepOf(k)]; return p && FRM[p] ? p : heldPre(); };   // 11/14 用户：出什么武艺，就用那种兵器的动作图
  const motFr = k => (FRM[preOf(k)] || FRM.wd_)[MOT[k] || 'chop'];
  // 11/14 用户的刀光图（白色发光体，art/ui/fx/）：游戏里按招式主色染色、用叠加发光画；黄/玄共用朴素刀光（玄阶加亮加残影），地/天各有专属图
  const DGI = {}; for (const n of ['dg1', 'dg2', 'dg3', 'dg4', 'dg5', 'dg6', 'dd_xuehe', 'dd_feilun', 'dd_liedi', 'dt_tianbeng', 'dt_wanren', 'dh2', 'fx_lun', 'fx_ring', 'fx_he', 'fx_aim', 'ic_pj', 'ic_bl', 'ic_fk']) { const im = new Image(); im.src = 'art/ui/fx/' + n + '.webp'; DGI[n] = im; }
  const DGT = {}; const dgTint = (n, rgb) => { const key = n + rgb, im = DGI[n]; if (DGT[key]) return DGT[key]; const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; const g = c.getContext('2d'); g.drawImage(im, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = 'rgb(' + rgb + ')'; g.fillRect(0, 0, c.width, c.height); return DGT[key] = c; };
  // [图, 宽度=范围的几倍, 锚点x, 锚点y（图上哪一点放在落点）, 落点前移, 落点高度]
  const DGM = { lansao: ['dg1', 2.6, .5, .8, 14, -14], hengsao: ['dg1', 2.6, .5, .8, 14, -14], lianzhan: ['dg1', 2.6, .5, .8, 14, -14], tuodao: ['dg2', 2.4, .5, .5, 10, -14], tiaozhan: ['dg3', 1.6, .3, .6, 14, -24], daobo: ['dg4', 2.2, .45, .6, 10, -26], cuofeng: ['dg4', 2.2, .45, .6, 10, -26], huima: ['dg5', 2.4, .5, .55, 0, -24],
    xuehe: ['dd_xuehe', 2.6, .5, .75, 20, -16], feilunren: ['dd_feilun', 2.6, .35, .5, 30, -16], liedihuan: ['dd_liedi', 3.2, .55, .88, 24, 2], tianbeng: ['dt_tianbeng', 1.7, .5, .9, 30, 4], wanren: ['dt_wanren', 2.2, .5, .5, 0, -16, .65] };
  const o0rm = () => RM;
  const hexRgb = h => { const c = (h || '#ffe0a0').replace('#', ''); return [0, 2, 4].map(i => parseInt(c.slice(i, i + 2), 16)).join(','); };
  function daoSlash(key, a1, x1, y1) {
    const m = DGM[key], o = SK[key]; if (!m || !o) return; daoSlash.t = DKT;
    const a = a1 != null ? a1 : aim(), f = Math.cos(a) >= 0 ? 1 : -1, hx = x1 != null ? x1 : hero.x, hy = y1 != null ? y1 : hero.y, R = Math.max(30, (o.range || (o.len ? o.len / 2 : 60)) * DK * rsOf(key)), t = o.tier || 1;
    fx.push({ k: 'dg', n: m[0], w: R * m[1], ax: m[2], ay: m[3], x: hx + f * m[4], y: hy + m[5], sy: m[6] || 1, f, t: 0, T: t >= 4 ? .42 : t >= 3 ? .34 : .24, col: hexRgb(o.color), al: 1, wh: [.15, .15, .25, .3, .4][t], ghost: t === 2 });
    if (t >= 4) shake = Math.max(shake, .25);
  }
  // 11/14 用户：刀招的起手帧 / 出手帧可在武学试炼里挑（可水平翻转，帧名末尾加 ~ 表示翻转），存 localStorage szz-dao-pose，调好复制给 Claude 写死进 DPS1
  const DPS1 = { hengsao: { a: 'chop1', b: 'sweep2' }, tuodao: { a: 'sweep1', b: 'sweep2' }, tiaozhan: { a: 'up1', b: 'up2' }, lianzhan: { a: 'chop1', b: 'sweep2' }, daobo: { a: 'chop1', b: 'chop2' }, huima: { a: 'spin1', b: 'up2' }, cuofeng: { a: 'chop1', b: 'chop2' }, liedihuan: { a: 'up2', b: 'chop2' }, feilunren: { a: 'sweep1', b: 'sweep2' }, xuehe: { a: 'chop1', b: 'sweep2' }, tianbeng: { a: 'spin2', b: 'chop2' }, wanren: { a: 'spin1', b: 'spin2' },
    qiang: { a: 'thrust1', b: 'thrust2' }, lansao: { a: 'sweep1', b: 'sweep2' }, lianci: { a: 'thrust1', b: 'thrust2' }, tiaoqiang: { a: 'thrust2', b: 'up2' }, lihua: { a: 'spin1', b: 'spin2' }, chong: { a: 'thrust1', b: 'thrust2' }, huimaq: { a: 'thrust1', b: 'thrust2' }, touqiang: { a: 'up1', b: 'thrust2' }, qianglin: { a: 'up2', b: 'chop2' }, qijin: { a: 'thrust1', b: 'thrust2' }, bainiao: { a: 'thrust1', b: 'thrust2' }, longyin: { a: 'up2', b: 'chop2' } };   // 11/15 枪招动作（先按动作分配，试炼里可再挑）   // 11/14 用户在武学试炼里挑好的刀招动作（起手帧 → 出手帧）
  for (const k of Object.keys(SK).filter(k => SK[k].stone || SK[k].hammer || SK[k].bow)) DPS1[k] = { a: MOTX[k] + '1', b: MOTX[k] + '2' };
  Object.assign(DPS1, { hengti: { a: 'sweep1', b: 'sweep2' }, pidao: { a: 'chop1', b: 'chop2' }, xiongshou: { a: 'up1', b: 'up2' }, xuanfengd: { a: 'spin1', b: 'spin2' }, daoqi: { a: 'sweep1', b: 'sweep2' }, handi: { a: 'chop1', b: 'chop2' }, zhanjiang: { a: 'up2', b: 'chop2' }, guowu: { a: 'thrust1', b: 'thrust2' }, yanyue: { a: 'chop1', b: 'chop2' }, tuodaoji: { a: 'spin1', b: 'spin2' }, shuiyan: { a: 'up2', b: 'chop2' }, qinglong: { a: 'up1', b: 'up2' }, tuodao: { a: 'chop1', b: 'sweep2' },
    shanfeng: { a: 'sweep1', b: 'sweep2' }, liuying: { a: 'thrust1', b: 'thrust2' }, huifeng: { a: 'up1', b: 'up2' }, longjuan: { a: 'spin1', b: 'spin2' }, mihun: { a: 'sweep1', b: 'sweep2' }, shuangxue: { a: 'sweep1', b: 'sweep2' }, lianying: { a: 'thrust1', b: 'thrust2' }, bazhen: { a: 'spin1', b: 'spin2' }, huoyu: { a: 'up1', b: 'up2' }, chibi: { a: 'up1', b: 'up2' }, dongfeng: { a: 'up1', b: 'up2' }, qimen: { a: 'spin1', b: 'spin2' },
    huofu: { a: 'chop1', b: 'thrust2' }, feifu: { a: 'up1', b: 'up2' }, dingshen: { a: 'up1', b: 'up2' }, zhangxin: { a: 'thrust1', b: 'thrust2' }, wulei: { a: 'chop1', b: 'thrust2' }, yaoshu: { a: 'chop1', b: 'chop2' }, huangtian: { a: 'up1', b: 'up2' }, tianlei: { a: 'up1', b: 'up2' }, fuhuo: { a: 'sweep1', b: 'sweep2' }, sadou: { a: 'up1', b: 'up2' }, jiutian: { a: 'up1', b: 'up2' }, taiping: { a: 'up2', b: 'chop2' } });   // 11/16 关刀动作（试炼里可再挑）
  Object.assign(DGM, { hengti: ['dg1', 2.6, .5, .8, 14, -14], xiongshou: ['dg3', 1.8, .3, .6, 14, -24], handi: ['dg2', 2.4, .5, .5, 10, -14], guowu: ['dg5', 2.4, .5, .55, 0, -24] });
  let DPS = {}; try { DPS = JSON.parse(localStorage.getItem('szz-dao-pose') || '{}') || {}; } catch (e) {}
  const dpsOf = k => SK[k] && SK[k].dk ? DPS[k] || DPS1[k] || null : null;
  const dpsFr = (k, i) => { const o = dpsOf(k); if (!o) return motFr(k)[i]; const hp = preOf(k), n = i === 0 ? o.a : o.b, f = i === 0 ? o.fa : o.fb; return hp + n + (f ? '~' : ''); };
  for (const k of Object.keys(SK)) Object.defineProperties(SK[k], {
    pose: { get: () => [dpsFr(k, 0), dpsFr(k, 1)], set() {}, configurable: true },
    poseL: { get: () => dpsOf(k) ? dpsFr(k, 1) : motFr(k)[1], set() {}, configurable: true },
    pose2: { get: () => dpsOf(k) ? dpsFr(k, 1) : motFr(k)[2], set() {}, configurable: true } });
  // 出身六项属性（11/11 用户定 A：全部接上效果）：体魄 短兵 长兵 身法 运气 悟性
  const AT0 = () => OG().at || [3, 3, 3, 3, 3, 3, 3, 3, 3];   // 11/13：9 项（体魄 短兵 长兵 身法 运气 悟性 射艺 术法 内力）
  const AT = () => { const b = AT0(), d = S.atAdd || [], it = S.atAdd ? itemAt() : [0, 0, 0, 0, 0, 0, 0, 0, 0]; return b.map((v, i) => v + (d[i] || 0) + it[i]); };   // 出身底子 + 本局修炼
  const profV = v => Math.max(.72, Math.min(1.35, .58 + .15 * v));
  const AFX = {
    hp: () => 1 + (AT()[0] - 3) * .07,          // 体魄：气血（以受伤减免折算）
    move: () => 1 + (AT()[3] - 3) * .04,        // 身法：移动速度
    crit: () => (AT()[4] - 3) * .03,            // 运气：暴击率
    xp: () => Math.max(.5, 1 + (AT()[5] - 3) * .1),   // 悟性：武艺/心法熟练度获取
    nl: () => Math.max(.5, 1 + (AT()[8] - 3) * .06),   // 内力：真气上限、真气回复（11/13）
  };
  // ---------- 修为（11/11 用户定，照群侠幸存者）：杀敌和打完节点涨修为，满了升级攒一次「修炼」，节点打完后统一修炼（属性三选一），战斗中不打断 ----------
  const ATN = ['体魄', '短兵', '长兵', '身法', '运气', '悟性', '射艺', '术法', '内力'];
  const ADO = [0, 8, 1, 2, 6, 7, 3, 4, 5];   // 面板显示顺序：体魄 内力 短兵 长兵 射艺 术法 身法 运气 悟性
  const XIU_NEED = lv => 40 + lv * 20 + Math.max(0, lv - 5) * 15;   // 11/14 用户：照群侠，第一场基本能升一级（LV2 要 60，之前 95）；LV6 起每级多要一些
  function addXiu(n) {
    if (!RT.on || !S.atAdd) return;
    S.xiu += n * AFX.xp() * (HAS('sunzi') ? 1.2 : 1);
    while (S.xiu >= XIU_NEED(S.lv)) { S.xiu -= XIU_NEED(S.lv); S.lv++; S.bank++; S.lvFx = 1.6; if (window.SFX) SFX.play('j_lvup'); if (hero) floaters.push({ x: hero.x, y: hero.y - 100, t: 0, txt: '修为提升 LV.' + S.lv, color: '#ffd86e' }); }
  }
  const RAR = [['白', '#e8e0d0', 1], ['蓝', '#5aa8ff', 2], ['紫', '#c07cff', 3], ['橙', '#ff9a3a', 2]];
  function rollXiu() {   // 三个不重复的属性选项；运气越高越容易出高品阶
    const sh = (AT()[4] - 3) * .03, out = [], used = new Set();
    while (out.length < 3) {
      const r = Math.random(), q = r < .03 + sh / 3 ? 3 : r < .15 + sh * 2 / 3 ? 2 : r < .45 + sh ? 1 : 0;
      let a = Math.random() * 9 | 0; while (used.has(a)) a = (a + 1) % 9; used.add(a);
      const o = { q, adds: [[a, RAR[q][2]]] };
      if (q === 3) { let b = Math.random() * 9 | 0; while (b === a) b = Math.random() * 9 | 0; o.adds.push([b, 2]); }
      out.push(o);
    }
    return out;
  }
  function cultivate(cb, i = 1, n = S.bank, rerolled = false, opts = null) {
    if (!S.bank) return cb();
    opts = opts || rollXiu();
    const old = document.getElementById('survPick'); if (old) old.remove();
    const box = document.createElement('div'); box.id = 'survPick';
    box.innerHTML = `<div class="p"><h3>修 炼${n > 1 ? ' · 第 ' + i + '/' + n + ' 次' : ''} · 三选一</h3><div class="row">${opts.map((o, j) => `<button data-j="${j}" class="q${o.q}"><i style="font-style:normal;font-size:12px;color:${RAR[o.q][1]}">${RAR[o.q][0]}</i><b style="color:${RAR[o.q][1]};font-size:24px">${o.adds.map(([a]) => ATN[a]).join(' · ')}</b><span>${o.adds.map(([a, v]) => ATN[a] + ' +' + v).join('，')}</span><small>${o.adds.map(([a]) => AT()[a] + ' → ' + (AT()[a] + o.adds.filter(x => x[0] === a).reduce((t, x) => t + x[1], 0))).join('，')}</small></button>`).join('')}</div>`
      + `<div style="margin-top:10px;font-size:12px;color:#cdb98e">修为 LV.${S.lv}　运气越高越容易出高品阶　${rerolled ? '' : '<a href="#" class="rr" style="color:#ffd86e;margin-left:8px">刷新一次</a>'}</div></div>`;
    box.querySelectorAll('button').forEach(b => b.onclick = () => { const o = opts[+b.dataset.j]; if (window.SFX) SFX.play('j_pick' + o.q); for (const [a, v] of o.adds) S.atAdd[a] += v; S.bank--; box.remove(); cultivate(cb, i + 1, n); });
    const rr = box.querySelector('.rr'); if (rr) rr.onclick = e => { e.preventDefault(); box.remove(); cultivate(cb, i, n, true); };
    document.body.appendChild(box);
  }
  // 11/13 用户定：出身两种本门兵器 ×1.2，剑、拳通用 ×1.0，其他兵器 ×0.85；短兵/长兵属性只算修炼加上去的那部分成长
  const wmul = k => { const w = wepOf(k); return w === heldW() ? 1.1 : (OG().weps || [OG().wep]).includes(w) ? 1 : .85; };   /* 11/14 用户：改小 +10% / −15% */   // 11/14 用户定：开局所选兵器 +20%（本门），出身另一种 ±0，其他兵器 −25%（外门）
  const menTag = k => { const m = wmul(k); return m > 1 ? '<span style="color:#ffd36e">本门 +20%</span>' : m < 1 ? '<span style="color:#ff7a6a">外门 −25%</span>' : ''; };
  const ATW = { 0: 1, 1: 1, 2: 1, 10: 1, 3: 2, 4: 2, 5: 6, 7: 6, 8: 7, 9: 7 };   // 兵器 → 属性：短兵（刀锤剑拳）长兵（枪关刀）射艺（石子弓）术法（黄符羽扇）
  const attrMul = k => Math.max(.6, 1 + (AT()[ATW[wepOf(k)] != null ? ATW[wepOf(k)] : 1] - 3) * .06);
  const growOf = c => c === 0 ? profV(AT()[1]) / profV(AT0()[1]) : c === 1 ? profV(AT()[2]) / profV(AT0()[2]) : 1;
  const profOf = c => c === 0 ? profV(AT()[1]) : c === 1 ? profV(AT()[2]) : profV((OG().oa || [3, 3, 3, 3, 3, 3, 3, 3])[CATA[c]]);   // 短兵/长兵：对应大类武艺伤害
  const RESD = [0, 0, .08, .16, .26, .40];   // 同类别 n 件：该类别武艺伤害加成
  function RES() {
    const cnt = WEPN.map(() => 0); for (const k of S.slots) if (SK[k]) cnt[wepOf(k)]++;   // 按具体兵器数
    const mx = Math.max(...cnt);
    return { cnt, take: mx >= 3 ? .95 : 1, cd: mx >= 5 ? .9 : mx >= 4 ? .95 : 1 };
  }
  const MAST_T = [0, 8, 20, 40, 70, 110, 160, 220, 300, 400];   // 施放次数 → 熟练度 LV1~10
  const lvOf = k => { if (S.lvLock && S.lvLock[k]) return S.lvLock[k]; const m = S.mast[k] || 0; let l = 1; while (l < 10 && m >= MAST_T[l]) l++; return l; };
  const mastMul = k => { if (SK[k] && SK[k].dk) return DLV.dmg[lvOf(k) - 1]; const l = lvOf(k); return 1 + .06 * Math.min(3, l - 1) + (l >= 5 ? .12 : 0) + .05 * Math.max(0, Math.min(l, 9) - 5); };   // LV2-4、6-9 递增，LV5 质变
  // 11/14 参考群侠详情页：把说明拆成「出招方式 / 特殊效果 / 逐级修炼」，威力拆成各项乘数
  const STW = /湿身|导电|蒸腾|迷乱|风撞|碎甲|破甲|流血|浮空|挑飞|击飞|晕|定住|定身|迟缓|减速|灼烧|起火|着火|推开|拉回|卷/;
  function wuParts(k) {
    const o = SK[k]; if (!o) return null;
    const d = String(o.desc || ''), i = d.search(/LV\d/), base = (i < 0 ? d : d.slice(0, i)).replace(/[。；;，,\s]+$/, '');
    const cl = base.split(/[，,；;]/).map(x => x.trim()).filter(Boolean), st = cl.filter(x => STW.test(x)), sh = cl.filter(x => !STW.test(x));
    const sp = {}; let m; const re = /LV(\d+)\s*([^；;。]+)/g; while ((m = re.exec(i < 0 ? '' : d.slice(i)))) sp[+m[1]] = (sp[+m[1]] ? sp[+m[1]] + '；' : '') + m[2].trim();
    const mul = l => o.dk ? DLV.dmg[l - 1] : 1 + .06 * Math.min(3, l - 1) + (l >= 5 ? .12 : 0) + .05 * Math.max(0, Math.min(l, 9) - 5);
    const lv = []; for (let l = 1; l <= 10; l++) lv.push({ l, up: l === 1 ? '基础威力' : '威力 +' + Math.round((mul(l) - 1) * 100) + '%', sp: sp[l] || (l === 10 ? '突破（待开放）' : '') });
    return { shape: sh.join('，') || base, state: st.join('，') || '无', lv };
  }
  function powParts(k) {   // 威力 = 各项乘数，100 = 无加成
    const c = catOf(k), at = ATW[wepOf(k)] != null ? ATW[wepOf(k)] : 1, AN = ['体魄', '短兵', '长兵', '射艺', '术法', '身法', '射艺', '术法'];
    const w = wmul(k), am = attrMul(k), lm = mastMul(k), n = RES().cnt[wepOf(k)], rs = 1 + RESD[Math.min(5, n)] * (HAS('xinshu') ? 2 : 1);
    const bw = 1 + (S.bao || []).reduce((t, b) => t + (BAO[b] && BAO[b].w === wepOf(k) ? BAO[b].wd : 0), 0), other = GM.all * GM.cat[c] * (1 + .06 * S.xy) * baoMul() * bw * rs * (HAS('baipi') && wepOf(k) !== 0 ? .7 : 1) * (HAS('longdan') && wepOf(k) !== 3 ? .7 : 1) * (HAS('yunxing') && wepOf(k) !== 7 ? .7 : 1) * (HAS('zhenyuechui') && wepOf(k) !== 2 ? .7 : 1) * (HAS('zhurigong') && wepOf(k) !== 5 ? .7 : 1) * (HAS('qinglongdao') && wepOf(k) !== 4 ? .7 : 1) * (HAS('qixingshan') && wepOf(k) !== 9 ? .7 : 1) * (HAS('taipingshu') && wepOf(k) !== 8 ? .7 : 1);
    const r = [['等级', lm], [(AN[at] || '属性') + ' ' + AT()[at], am], [w > 1.05 ? '本门' : w < .95 ? '外门' : '出身兵器', w], ['心法·宝物·同门', other]].filter(x => Math.abs(x[1] - 1) > .005);
    return { total: Math.round(100 * lm * am * w * other), rows: r };
  }
  function skillMul(k) {
    const c = catOf(k), n = RES().cnt[wepOf(k)], low = hero.hp / maxHp() < .3 ? 1 + .25 * GM.low : 1;
    const bw = (S.bao || []).reduce((t, b) => t + (BAO[b] && BAO[b].w === wepOf(k) ? BAO[b].wd : 0), 0);
    return (1 + bw) * (HAS('baipi') && wepOf(k) !== 0 ? .7 : 1) * (HAS('longdan') && wepOf(k) !== 3 ? .7 : 1) * (HAS('yunxing') && wepOf(k) !== 7 ? .7 : 1) * (HAS('zhenyuechui') && wepOf(k) !== 2 ? .7 : 1) * (HAS('zhurigong') && wepOf(k) !== 5 ? .7 : 1) * (HAS('qinglongdao') && wepOf(k) !== 4 ? .7 : 1) * (HAS('qixingshan') && wepOf(k) !== 9 ? .7 : 1) * (HAS('taipingshu') && wepOf(k) !== 8 ? .7 : 1) * wmul(k) * attrMul(k) * (1 + RESD[Math.min(5, n)] * (HAS('xinshu') ? 2 : 1)) * mastMul(k) * GM.all * GM.cat[c] * low * (1 + .06 * S.xy) * baoMul();
  }
  function critRoll() {   // 暴击：基础 5% + 心法；伤害 ×1.5 + 心诀
    if (!CK || !SK[CK]) return 1;
    const c = catOf(CK);
    if (S.lhjOn || Math.random() < .05 + AFX.crit() + IT('crit') + GM.crit + GM.critC[c] + (HAS('qixing') ? .08 : 0)) { if (Math.random() < .35) floaters.push({ x: hero.x, y: hero.y - 54, t: 0, txt: '暴击', color: '#ff9a4a' }); return 1.5 + GM.critD[c] + (HAS('qixing') ? .3 : 0); }
    return 1;
  }
  const CDM = () => RT.cd * RES().cd * (HAS('hufu2') ? .9 : 1);
  // ---------- 心法（三国幸存者 38 个：20 心法 + 8 通用 + 5 杂项 + 5 轻功） ----------
  const GGEN = [.02, .03, .045, .065], GSPEC = [.08, .13, .19, .28], GLVM = [1, 1.3, 1.7], GFTH = [120, 300], GTN = ['黄', '玄', '地', '天'], GTC = ['#c9b27a', '#6fb8ff', '#c58cff', '#ffb347'];
  const GF = {};
  const gadd = (id, n, t, o) => { GF[id] = Object.assign({ id, n, t, c: -1, x: {}, d: '', qg: false }, o); };
  gadd('tuna', '吐纳心法', 0, { x: { hy: 2 }, d: '回元 +2（真气回复更快）' });
  gadd('yangqi', '养气诀', 0, { x: { hp: 1.12, qh: 2 }, d: '等效生命 +12%，气海 +2（真气上限）' });
  gadd('tieyi', '铁衣功', 1, { x: { take: .92 }, d: '受到伤害 -8%' });
  gadd('tayun', '踏云步法', 1, { x: { spd: 1.07 }, d: '移动速度 +7%' });
  gadd('jubao', '聚宝心经', 2, { x: {}, d: '银两 +20%（商店开放后生效）', off: true });
  gadd('guanxing', '观星诀', 2, { x: { crit: .05 }, d: '暴击率 +5%' });
  gadd('taiping', '太平清领心经', 3, { x: { all: 1.12, take: .94 }, kh: .004, d: '全部伤害 +12%，受到伤害 -6%', xj: '每次击杀回复 0.4% 生命' });
  gadd('hunyuan', '混元一气功', 3, { x: { all: 1.08, hp: 1.1, crit: .03 }, kh: .002, d: '全部伤害 +8%，等效生命 +10%，暴击 +3%', xj: '每次击杀回复 0.2% 生命' });
  [['短兵器', 0, ['快刀心法', '断水心经', '破军心经', '霸王心经'], 0], ['长兵器', 1, ['抖枪诀', '贯虹心法', '龙胆心经', '无双心经'], 1], ['远程', 2, ['听风诀', '穿云心经', '追月心经', '落日心经'], 2], ['法师', 3, ['引气诀', '通玄心法', '紫气心经', '太平玄元经'], 4]].forEach(([cn, ci, ns, k]) => ns.forEach((n, t) => gadd('gf' + k + t, n, t, { c: ci, cn })));
  gadd('gf30', '熊经诀', 0, { x: { take: .95 }, d: '受到伤害 -5%' });   // 原「体术」四本心法：体术取消，改成守御通用心法
  gadd('gf31', '金钟罩', 1, { x: { take: .92 }, d: '受到伤害 -8%' });
  gadd('gf32', '铁骨功', 2, { x: { take: .9 }, blk: .10, d: '受到伤害 -10%；心诀：10% 概率格挡一次伤害' });
  gadd('gf33', '不动明王功', 3, { x: { take: .88 }, blk: .10, stl: .4, d: '受到伤害 -12%；心诀：10% 格挡，站定 1 秒后受伤再 -40%' });
  gadd('qingshen', '轻身术', 0, { x: { dcd: .92 }, d: '翻滚冷却 -8%' });
  gadd('juqi', '聚气诀', 1, { x: { qh: 1, hy: 1 }, d: '气海 +1，回元 +1' });
  gadd('shixue', '嗜血功', 1, { x: {}, kh: .006, d: '每次击杀回复 0.6% 生命' });
  gadd('beishui', '背水一战', 2, { x: {}, low: 1, d: '生命低于 30% 时，武艺伤害 +25%，受到伤害 -10%' });
  gadd('lhj', '连环劲', 2, { x: {}, lhj: 1, d: '连续 3 秒不受伤，下一招必定暴击' });
  gadd('caoshang', '草上飞', 0, { qg: true, d: '轻功：跑动时脚下留风痕，敌人踩上减速 30%' });
  gadd('xingyun', '行云诀', 1, { qg: true, d: '轻功：跑动每 1 秒积 1 层势（最多 5），每层伤害 +6%；停下后每 1.5 秒散 1 层' });
  gadd('taxue', '踏雪无痕', 2, { qg: true, d: '轻功：跑动时受到伤害 -15%' });
  gadd('tiesha', '铁砂掌劲', 2, { qg: true, d: '轻功：翻滚时把周围敌人击退并僵直' });
  gadd('yufeng', '御风而行', 3, { qg: true, d: '轻功：跑动时身周不断扫出风刃' });
  const GM0 = () => ({ all: 1, take: 1, spd: 1, dcd: 1, hp: 1, crit: 0, hy: 0, qh: 0, cat: [1, 1, 1, 1], critC: [0, 0, 0, 0], critD: [0, 0, 0, 0], block: 0, still: 0, kh: 0, low: 0, lhj: false });
  let GM = GM0();
  const gfLv = id => { const e = S.gfExp[id] || 0; return 1 + (e >= GFTH[0] ? 1 : 0) + (e >= GFTH[1] ? 1 : 0); };   // 杀敌数 → LV1~3，×1 / ×1.3 / ×1.7
  const gfSame = c => S.gf.filter(id => GF[id] && GF[id].c === c).length;
  const SPECM = [1, 1, 1.3, 1.6], XPM = [1, 1, 1.5, 2];   // 同类心法 1 / 2 / 3 件：专精 ×1 / ×1.3 / ×1.6，升级速度 ×1 / ×1.5 / ×2
  function gfCalc() {   // 3 个内功格不分主辅；同类心法越多越专精；地、天阶心法带心诀
    const r = GM0();
    S.gf.forEach(id => {
      const g = GF[id]; if (!g) return;
      const f = .85 * GLVM[gfLv(id) - 1];
      if (g.c >= 0) {
        r.all *= 1 + GGEN[g.t] * f; r.cat[g.c] *= 1 + GSPEC[g.t] * f * SPECM[gfSame(g.c)];
        if (g.t >= 2) { r.critC[g.c] += .10; if (g.t === 3) r.critD[g.c] += .5; }
      } else {
        for (const k in g.x) { const v = g.x[k]; if (k === 'crit' || k === 'hy' || k === 'qh') r[k] += v * f; else r[k] *= 1 + (v - 1) * f; }
        if (g.kh) r.kh += g.kh * f; if (g.low) r.low += f; if (g.lhj) r.lhj = true; if (g.blk) r.block += g.blk; if (g.stl) r.still += g.stl;
      }
    });
    r.still = Math.min(.7, r.still); return r;
  }
  const zqMax = () => Math.round(maxHp() * (1 + .06 * GM.qh) * AFX.nl() * (HAS('hufu2') ? .5 : 1) * 10) / 10;
  function gfText(g) {
    const f = .85 * GLVM[gfLv(g.id) - 1], pc = v => (v * 100).toFixed(1).replace(/\.0$/, '') + '%';
    if (g.c >= 0) { const sm = SPECM[Math.max(1, gfSame(g.c))]; return `全部伤害 +${pc(GGEN[g.t] * f)}，${g.cn}武艺伤害 +${pc(GSPEC[g.t] * f * sm)}（同类心法越多越专精）` + (g.t >= 2 ? '；心诀：该类暴击 +10%' + (g.t === 3 ? '，暴击伤害 +50%' : '') : ''); }
    return g.d + (g.xj ? '；心诀：' + g.xj : '');
  }
  // 波间习得武艺：从还没学会的武艺里随机给最多 3 个，选一个放进空格
  function offerSkill(cb) {
    const owned = S.slots.filter(Boolean), free = S.slots.indexOf('');
    const pool = Object.keys(SK).filter(k => !owned.includes(k) && tierOk(k) && !SK[k].off && (!ONLY_DAO || wepOk(k)));
    if (free < 0 || !pool.length) return false;
    const pick = pool.sort(() => Math.random() - .5).slice(0, 3);
    W.pick = true;
    const box = document.createElement('div'); box.id = 'survPick';
    box.innerHTML = `<div class="p"><h3>习得武艺 · 三选一</h3><div class="row">${pick.map(k => `<button data-k="${k}"><b style="color:${SK[k].color}">${SK[k].icon}</b><span>${SK[k].name}</span><small>${SK[k].desc}</small></button>`).join('')}</div><p>新武艺放进第 ${free + 1} 格，按 1→5 顺序轮流放</p></div>`;
    box.querySelectorAll('button').forEach(b => b.onclick = () => {
      const i = S.slots.indexOf(''); if (i >= 0) S.slots[i] = b.dataset.k;
      box.remove(); W.pick = false; if (cb) cb(); else if (window.ROGUE) ROGUE.offer();
    });
    document.body.appendChild(box);
    return true;
  }
  const S = { slots: ['hengsao', '', '', '', ''], qi: 0, qt: 0, hold: 0, wind: null, recov: null, skip: [0, 0, 0, 0, 0], later: [], gf: ['', '', ''], qg: '', gfExp: {}, zq: 10, hp0: 10, noHitT: 0, stillT: 0, mvT: 0, xyD: 0, xy: 0, trailT: 0, ywT: 0, lhjReady: false, lhjOn: false, mast: {}, dps: {}, combo: 0, comboT: 0, lk: 0, chain: 0, lastCat: -1, lastI: -9, poseOverride: null, held: null, cycles: 0, flash: [0, 0, 0, 0, 0] };
  const busy = () => hero.st === 'roll' || hero.air || ['down', 'bounce', 'getup', 'hurt'].includes(hero.st) || hero.dazeT > 0;
  // 眩晕：每个目标有冷却（杂兵 4 秒 0.75 秒；精英 6 秒 0.5；小头目 10 秒 0.3；首领 16 秒 0.2，且不击倒）
  const STUN = [[4, .75], [6, .5], [10, .3], [16, .2]];
  // 打击感（11/11）：连击里程碑大字 + 一刀多杀定格 + 连击数字弹跳
  const CMB = [[10, '连续击倒十人'], [25, '连续击倒二十五人'], [50, '连续击倒五十人'], [100, '连续击倒一百人'], [200, '连续击倒二百人'], [300, '连续击倒三百人'], [500, '连续击倒五百人'], [1000, '连续击倒一千人']];   // 11/11 用户：不要「X人斩」，改成「连续击倒X人」
  function comboFx(c0, d) {
    S.cPop = 1;
    for (const [n, t] of CMB) if (c0 < n && c0 + d >= n) { S.cmb = { txt: t, t: 0, big: n >= 100 }; shake = Math.max(shake, n >= 100 ? .35 : .2); if (window.SFX) SFX.play(n >= 100 ? 'finisher' : 'j_banner'); }
    if (d >= 4) {   // 一下砍倒 4 个以上：短暂定格 + 「N 杀！」
      freeze = Math.max(freeze || 0, Math.min(.09, .03 + d * .008)); shake = Math.max(shake, .12);
      floaters.push({ x: hero.x, y: hero.y - 70, t: 0, txt: d + ' 杀！', color: d >= 8 ? '#ff7a3a' : '#ffd86e', big: 1 });
      if (window.SFX) SFX.play('crack', 0, .9);
    }
  }
  function cmbDraw(HW, HH, fine, dt) {
    if (S.cPop > 0) S.cPop = Math.max(0, S.cPop - dt * 4);
    const c = S.cmb; if (!c) return; c.t += dt; if (c.t > 1.4) { S.cmb = null; return; }
    const a = c.t < 1 ? 1 : 1 - (c.t - 1) / .4, sc = c.t < .12 ? .6 + c.t / .12 * .55 : c.t < .22 ? 1.15 - (c.t - .12) / .1 * .15 : 1, fs = (fine ? 54 : 34) * (c.big ? 1.25 : 1);
    ctx.save(); ctx.globalAlpha = a; ctx.translate(HW / 2, HH * .27); ctx.scale(sc, sc);
    ctx.font = '900 ' + fs + 'px "Songti SC","STSong","Noto Serif SC",serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    ctx.lineWidth = fs * .16; ctx.strokeStyle = 'rgba(10,6,3,.9)'; ctx.strokeText(c.txt, 0, 0);
    const g = ctx.createLinearGradient(0, -fs / 2, 0, fs / 2); g.addColorStop(0, '#fff3c8'); g.addColorStop(.5, c.big ? '#ff9a3a' : '#e8c070'); g.addColorStop(1, c.big ? '#b02a12' : '#8a5a20'); ctx.fillStyle = g; ctx.fillText(c.txt, 0, 0);
    ctx.restore();
  }
  // 11/14 用户定（照群侠）：普通命中敌人不停步、不硬直，只闪白、稍微推一下；只有眩晕（stunz）和浮空（挑飞）才让敌人停下
  function stunGate(z, stun, knock) {
    if (!RT.on) return null;
    if (!knock) return { stun: 0, knock: false, kbM: .35 };
    if (z.stunCd > 0) return { stun: 0, knock: false, kbM: .35 };
    const t = z.survTier || 0, st = STUN[t]; z.stunCd = st[0];
    return { stun: t < 2 ? st[1] : 0, knock: t < 2, kbM: t < 2 ? 1 : .35 };
  }
  const hammerWindMul = k => hammerCoreReach[k] && HAS('pobichui') ? 1.10 : 1;
  const weaponWindMul = k => hammerWindMul(k) * (bowLong(k) && HAS('diaolinggong') ? 1.08 : 1);
  function skillTick(dt) {
    GM = gfCalc();
    if (typeof kills === 'number') {
      if (kills < S.lk) S.lk = kills;
      if (kills > S.lk) {
        const d = kills - S.lk; const c0 = S.combo; S.combo += d; S.comboT = 3; if (RT.on) comboFx(c0, d);
        if (RT.on) {
          S.gf.forEach(id => { if (id) { const l0 = gfLv(id); S.gfExp[id] = (S.gfExp[id] || 0) + d * AFX.xp() * (GF[id].c >= 0 ? XPM[Math.max(1, gfSame(GF[id].c))] : 1); if (gfLv(id) > l0) floaters.push({ x: hero.x, y: hero.y - 90, t: 0, txt: GF[id].n + ' LV' + gfLv(id), color: '#ffd86e' }); } });
          if (GM.kh) heal(maxHp() * GM.kh * d);
          S.zq = Math.min(zqMax(), S.zq + zqMax() * .006 * d);
          addXiu(d);
        }
      }
      S.lk = kills;
    }
    if (RT.on) {
      S.zq = Math.min(zqMax(), S.zq + zqMax() * (.005 + .004 * GM.hy) * (1 + IT('regen')) * AFX.nl() * (HURT('nei') ? .7 : 1) * dt);
      if (hero.hp < S.hp0 - 1e-6) S.noHitT = 0; else S.noHitT += dt;
      S.hp0 = hero.hp;
      if (S.noHitT >= 3 && GM.lhj) S.lhjReady = true;
      const mv = Math.abs(hero.ix) > .1 || Math.abs(hero.iy) > .1;
      S.stillT = mv ? 0 : S.stillT + dt;
      if (S.qg === 'xingyun') { if (mv) { S.xyD = 0; if ((S.mvT += dt) >= 1) { S.mvT -= 1; S.xy = Math.min(5, S.xy + 1); } } else { S.mvT = 0; if ((S.xyD += dt) >= 1.5) { S.xyD -= 1.5; S.xy = Math.max(0, S.xy - 1); } } } else S.xy = 0;
      if (mv && W.started && !(W.retreat > 0)) {
        if (S.qg === 'caoshang' && (S.trailT -= dt) <= 0) { S.trailT = .3; zones.push({ x: hero.x, y: hero.y, r: 26, t: 0, T: 2.2, tk: 0, dmg: 0, kind: 'trail' }); }
        if (S.qg === 'yufeng' && (S.ywT -= dt) <= 0) { S.ywT = .7; CM = 1; CK = 'yufeng'; blast(hero.x, hero.y, 44, .5, 30, '180,230,255'); CK = ''; }
      }
    }
    if ((S.comboT -= dt) <= 0) S.combo = 0;
    for (let i = 0; i < 5; i++) { S.skip[i] = Math.max(0, S.skip[i] - dt); S.flash[i] = Math.max(0, S.flash[i] - dt); }
    if (S.brk) for (let i = 0; i < 5; i++) S.brk[i] = Math.max(0, S.brk[i] - dt);
    for (let i = S.later.length - 1; i >= 0; i--) { const q = S.later[i]; if ((q.t -= dt) <= 0) { S.later.splice(i, 1); if (!busy()) q.f(); } }
    if (S.poseOverride && (S.poseOverride.t -= dt) <= 0) S.poseOverride = null;
    if (W.retreat > 0 || W.between > 0) { S.wind = null; S.recov = null; return; }   // 鸣金后不再出手
    if (busy()) { if (S.wind && hero.st !== 'roll') { S.wind = null; } return; }
    if (S.wind) {
      S.wind.t += dt;
      if (!(Math.abs(hero.ix) > .1 || Math.abs(hero.iy) > .1)) { const t = nearest(200); if (t) hero.f = Math.sign(t.x - hero.x) || hero.f; }
      if (S.wind.t >= S.wind.dur) {
        const k = S.wind.k, i = S.wind.i, key = S.wind.key; S.flash[i] = .3;
        const t = nearest(k.stone || k.hammer || k.bow ? k.need * DK * rsOf(key) : 200); if (t) hero.f = Math.sign(t.x - hero.x) || hero.f;
        CM = skillMul(key); RM = k.dk ? DLV.sz[lvOf(key) - 1] * rsOf(key) : lvOf(key) >= 5 ? 1.1 : 1; const ch = S.wind.ch; S.chain = ch; S.lastCat = wepOf(key); S.lastI = i;
                S.lhjOn = S.lhjReady; S.lhjReady = false; if (S.lhjOn) S.noHitT = 0;
        CK = key; const channel = k.cast(); S.lhjOn = false;
        const l0 = lvOf(key); S.mast[key] = (S.mast[key] || 0) + AFX.xp(); if (lvOf(key) > l0) floaters.push({ x: hero.x, y: hero.y - 76, t: 0, txt: k.name + ' LV' + lvOf(key), color: '#ffd86e' });
        if (!k.dk && lvOf(key) >= 10) later(.2, () => { CM *= .6; k.cast(); });   // LV10 质变：多出一击
        CM = 1; RM = 1; CK = '';
        S.recov = { t: 0, dur: Math.max(k.stone || k.hammer || k.bow ? channel || 0 : 0, (k.dk ? Math.max(.08, k.rc - DLV.rc[lvOf(key) - 1]) * spOf(key) : k.rc) * CDM()), pose: k.pose[1], late: k.poseL }; S.wind = null; if (k.dk && !k.stone && !k.hammer && !k.bow) { const a = aim(), dx = Math.cos(a) * 7, dy = Math.sin(a) * 3; hero.x += dx; hero.y = clampY(hero.y + dy); daoSlash(key); }   // 11/14：刀招出手往前踏半步
        S.qi = (S.qi + 1) % 5; if (S.qi === 0) S.cycles++;
      }
      return;
    }
    if (S.recov) { if ((S.recov.t += dt) >= S.recov.dur) { S.recov = null; S.qt = -.2; } return; }   // 放完一招，隔 0.25 秒轮到下一招（没有各自冷却）
    const next = SK[S.slots[S.qi]] || [1, 2, 3, 4].map(i => SK[S.slots[(S.qi + i) % 5]]).find(Boolean);
    const need = next && (next.stone || next.hammer || next.bow) ? next.need * DK * rsOf(next.key) : 160;
    if (!nearest(Math.max(160, need))) { S.qt = 0; return; }
    for (let n = 0; n < 5 && !SK[S.slots[S.qi]]; n++) { S.qi = (S.qi + 1) % 5; if (S.qi === 0) S.cycles++; }
    if ((S.qt += dt) < .05) return;
    const k = SK[S.slots[S.qi]];
    if (k && nearest(k.stone || k.hammer || k.bow ? need : k.need)) { const key = S.slots[S.qi], ch = 0;   // 11/14 用户定：连携删掉（和兵器精通重复）   // 只算同一轮里紧挨着的前一槽；同一招重复、轮回到第 1 槽都不算
       S.wind = { i: S.qi, k, key, ch, t: 0, dur: (k.dk ? Math.max(.12, k.wu - DLV.wu[lvOf(S.slots[S.qi]) - 1]) * spOf(S.slots[S.qi]) : k.wu * 1.2) * (OG().wu || 1) * CDM() * (1 - .2 * ch) * weaponWindMul(key) };
       if (k.hammer && hammerCoreReach[key]) S.wind.hammerLock = hammerWind(key, hammerCoreReach[key]);
       S.hold = 0; return; }
    if (k && S.hold < 1.2) { S.hold += .05; S.qt = 0; return; }   // 这一招够不着人：等 1.2 秒，还不行就跳下一招
    S.skip[S.qi] = .2; S.qt = -.05; S.qi = (S.qi + 1) % 5; if (S.qi === 0) S.cycles++; S.hold = 0;
  }
  function onRoll() {
    S.stoneRoll = (S.stoneRoll || 0) + 1;
    hero.rollCd *= GM.dcd;
    if (HAS('jili') && RT.on && W.started) { (S.jili = S.jili || []).push({ x: hero.x, y: hero.y, t: 3, hs: new Set() }); fx.push({ k: 'mark', x: hero.x, y: hero.y, r: 13, t: 0, T: 3 }); }
    if (S.qg === 'tiesha') for (const z of near(hero.x, hero.y, 64)) hit(z, .3 * RT.dmg, 110, Math.sign(z.x - hero.x) || hero.f, true, 0, .5, false, false, { secondary: true, survSkill: true });
    if (OG().roll) hero.rollCd *= OG().roll;   // 翻滚：前摇中 = 这一招作废、跳到下一招；后摇中 = 直接取消后摇
    if (S.wind) { S.skip[S.wind.i] = .35; S.wind = null; S.qi = (S.qi + 1) % 5; if (S.qi === 0) S.cycles++; S.qt = 0; S.brk = S.brk || [0, 0, 0, 0, 0]; S.brk[(S.qi + 4) % 5] = .45; }   // 11/14 用户：不再冒「打断」字，改成出招顺序那格灰一下、抖一下
    S.recov = null;
  }

  // ---------- 路线模式 ----------
  const maxHp = () => (window.GEAR ? GEAR.maxHp() : 10) * (S.hpMul || 1);   // 11/14：宝物/祝福可改气血上限
  // ===================== 11/14 用户定：宝物 / 伤势 / 出征前·桃园三赠 =====================
  const BAO = {
    caoxie: { n: '织席草鞋', q: 0, d: '移速 +8%' },
    wuzhu: { n: '五铢钱串', q: 0, d: '每打完一仗多得 15 铜钱' },
    sunzi: { n: '孙子兵法残简', q: 0, d: '修为获取 +20%' },
    lingqi: { n: '缴获令旗', q: 0, d: '对精锐和首领伤害 +15%' },
    taoyuan: { n: '桃园酒', q: 0, d: '每仗开打的头 10 秒，武艺伤害 +30%' },
    jili: { n: '铁蒺藜', q: 0, d: '翻滚时撒下蒺藜，踩到的敌人受伤并晕 0.4 秒' },
    huxin: { n: '护心镜', q: 0, d: '每仗第一次受到致命伤时，只剩 1 点血' },
    qingnang: { n: '青囊书', q: 1, d: '每仗开打时回复 10% 气血' },
    qixing: { n: '七星刀', q: 1, d: '暴击 +8%，暴击伤害 +30%' },
    pojia: { n: '破甲锥', q: 1, d: '所有武艺命中都挂 1 层破甲' },
    dilu: { n: '的卢马', q: 1, d: '每仗第一次气血低于 30% 时，一跃而起，无敌 2 秒' },
    liannu: { n: '诸葛连弩', q: 1, d: '每 5 秒自动朝最近的敌人射三连箭' },
    muniu: { n: '木牛流马', q: 1, d: '拾取多一件；行商价格 −15%' },
    shuangji: { n: '典韦双戟', q: 1, d: '身边有 5 个以上敌人时，武艺伤害 +25%' },
    xinshu: { n: '孟德新书', q: 1, d: '兵器精通的加成翻倍' },
    // 兵器类宝物（11/14 用户：不要兵器栏，兵器就是宝物）：只加对应兵器的武艺伤害；做完一门兵器再加那一门的两把
    zhusha: { image: 'art/ui/bao/zhusha.webp', n: '朱砂笔', q: 0, w: 8, wd: 0, d: '黄符武艺起手、收势 ×0.9' },   // 11/16 用户定：黄符 5 件宝物
    huangbiao: { image: 'art/ui/bao/huangbiao.webp', n: '黄表纸', q: 0, w: 8, wd: .12, d: '黄符武艺伤害 +12%' },
    leijimu: { image: 'art/ui/bao/leijimu.webp', n: '雷击木', q: 1, w: 8, wd: 0, d: '黄符雷系伤害 +25%；连锁、导电的跳跃范围 +30%' },
    lihuozhu: { image: 'art/ui/bao/lihuozhu.webp', n: '离火珠', q: 1, w: 8, wd: 0, d: '黄符灼烧最多 4 层；火区半径 +25%' },
    taipingshu: { image: 'art/ui/bao/taipingshu.webp', n: '太平要术', q: 2, w: 8, wd: .3, d: '黄符武艺伤害 +30%；导电这一下 ×2（原 ×1.5）、跳出去的伤害 ×1.5；蒸腾伤害 ×2；湿身多 2 秒', c: '黄符以外的武艺伤害 −30%' },
    pukui: { image: 'art/ui/bao/pukui.webp', n: '蒲葵扇', q: 0, w: 9, wd: 0, d: '羽扇武艺起手、收势 ×0.9' },   // 11/16 用户定：羽扇 5 件宝物
    zhugu: { image: 'art/ui/bao/zhugu.webp', n: '竹骨扇', q: 0, w: 9, wd: .12, d: '羽扇武艺伤害 +12%' },
    heyu: { image: 'art/ui/bao/heyu.webp', n: '鹤羽扇', q: 1, w: 9, wd: 0, d: '羽扇推开、拉回、吸的距离 +25%；风撞伤害从 0.3 倍提高到 0.5 倍' },
    kongque: { image: 'art/ui/bao/kongque.webp', n: '孔雀翎扇', q: 1, w: 9, wd: 0, d: '羽扇挂的迟缓多 1 秒、迷乱多 0.5 秒；羽扇打已迟缓的敌人 +15%' },
    qixingshan: { image: 'art/ui/bao/qixingshan.webp', n: '七星羽扇', q: 2, w: 9, wd: .3, d: '羽扇武艺伤害 +30%；借东风、奇门遁甲、乾坤屏多持续 2 秒；风撞会连锁（被撞的人也飞出去再撞下一个，最多 3 次）', c: '羽扇以外的武艺伤害 −30%' },
    mugandao: { image: 'art/ui/bao/mugandao.webp', n: '木杆大刀', q: 0, w: 4, wd: 0, d: '关刀武艺起手、收势 ×0.9' },   // 11/16 用户定：关刀 5 件宝物
    chunqiu: { image: 'art/ui/bao/chunqiu.webp', n: '春秋大刀', q: 0, w: 4, wd: .12, d: '关刀武艺伤害 +12%' },
    meijian: { image: 'art/ui/bao/meijian.webp', n: '眉尖刀', q: 1, w: 4, wd: 0, d: '关刀贴身的刀杆部分也吃满伤害（原来只有一半）；关刀扇面 +10%' },
    fengzui: { image: 'art/ui/bao/fengzui.webp', n: '凤嘴刀', q: 1, w: 4, wd: 0, d: '碎甲追加的伤害从 0.5 倍提高到 0.8 倍，碎甲后敌人身上留 1 层破甲（更快打出下一次碎甲）' },
    qinglongdao: { image: 'art/ui/bao/qinglongdao.webp', n: '青龙偃月刀', q: 2, w: 4, wd: .3, d: '关刀武艺伤害 +30%；擒王斩、五关斩、青龙偃月打精锐和首领再 +25%；每次碎甲后 3 秒内，关刀起手 ×0.85', c: '关刀以外的武艺伤害 −30%' },
    jgdao: { n: '精钢刀', q: 0, w: 0, wd: .12, d: '刀的武艺伤害 +12%' },
    gudingdao: { n: '古锭刀', q: 1, w: 0, wd: .2, d: '刀的武艺伤害 +20%；破甲每层增伤从 10% 提高到 15%' },
    huanshou: { n: '环首刀', q: 0, w: 0, wd: 0, d: '刀的武艺出手快 10%（起手、收势都缩短）' },   // 11/15 用户定：每种兵器 凡2 良2 传1
    zhanma: { n: '斩马刀', q: 1, w: 0, wd: .15, d: '刀的武艺伤害 +15%；打浮空的敌人再多 30%' },
    muqiang: { n: '木枪', q: 0, w: 3, wd: 0, d: '枪的武艺出手快 10%（起手、收势都缩短）' },   // 11/15 用户定：枪的 5 件宝物
    hongying: { n: '红缨枪', q: 0, w: 3, wd: .12, d: '枪的武艺伤害 +12%' },
    diangang: { n: '点钢枪', q: 1, w: 3, wd: .15, d: '枪的武艺伤害 +15%；流血每跳伤害 +30%' },
    bawang: { n: '霸王枪', q: 1, w: 3, wd: .2, d: '枪的武艺伤害 +20%；直线刺的招长 20%' },
    longdan: { n: '龙胆亮银枪', q: 2, w: 3, wd: .3, d: '枪的武艺伤害 +30%；冲刺距离 +30%，冲刺路上的伤害 ×1.5；浮空的敌人多受 50% 伤害（原来 25%）', c: '枪以外的武艺伤害 −30%' },
    sangmugong: { image: 'art/ui/bao/sangmugong.webp', n: '桑木弓', q: 0, w: 5, wd: 0, d: '弓武艺起手、收势 ×0.90' },
    niujiaogong: { image: 'art/ui/bao/niujiaogong.webp', n: '牛角弓', q: 0, w: 5, wd: .12, d: '弓武艺伤害 +12%' },
    diaolinggong: { image: 'art/ui/bao/diaolinggong.webp', n: '雕翎弓', q: 1, w: 5, wd: 0, d: '满月箭、穿云箭、贯日惊弦远距增伤门槛提前 20%，飞行距离 +15%', c: '这三招起手 ×1.08' },
    chiyugong: { image: 'art/ui/bao/chiyugong.webp', n: '赤羽弓', q: 1, w: 5, wd: 0, d: '燎原箭的火星半径 +20%，灼烧多一跳；落雁箭和坠星箭附加三跳灼烧' },
    zhurigong: { image: 'art/ui/bao/zhurigong.webp', n: '逐日弓', q: 2, w: 5, wd: .30, d: '弓武艺伤害 +30%；坠星箭或万箭穿心末波命中中心时追加光箭，每次施放最多一次', c: '弓以外的武艺伤害 −30%' },
    qingtongchui: { image: 'art/ui/bao/qingtongchui.webp', n: '青铜锤', q: 0, w: 2, wd: 0, d: '锤武艺起手、收势 ×0.90' },
    shutiechui: { image: 'art/ui/bao/shutiechui.webp', n: '熟铁锤', q: 0, w: 2, wd: 0.12, d: '锤武艺伤害 +12%' },
    pobichui: { image: 'art/ui/bao/pobichui.webp', n: '破壁锤', q: 1, w: 2, wd: 0, d: '断碑砸、飞崖砸、五岳压顶锤心伤害 +25%', c: '这三招起手 ×1.10' },
    mingleichui: { image: 'art/ui/bao/mingleichui.webp', n: '鸣雷锤', q: 1, w: 2, wd: 0, d: '裂堤震、回潮震、八荒雷动的震波推进距离 +20%' },
    zhenyuechui: { image: 'art/ui/bao/zhenyuechui.webp', n: '镇岳锤', q: 2, w: 2, wd: 0.3, d: '锤武艺伤害 +30%；断碑砸、飞崖砸、五岳压顶锤心命中后震出一道余震，每次最多触发一次', c: '锤以外的武艺伤害 −30%' },
    qingshizi: { image: 'art/ui/bao/qingshizi.webp', n: '青石子', q: 0, w: 7, wd: 0, d: '石子武艺起手、收势 ×0.9' },
    tiedan: { image: 'art/ui/bao/tiedan.webp', n: '铁胆', q: 0, w: 7, wd: .12, d: '石子武艺伤害 +12%' },
    feihuang: { image: 'art/ui/bao/feihuang.webp', n: '飞蝗囊', q: 1, w: 7, wd: 0, d: '散花石、连珠石、漫天飞蝗各多投一颗；惊鸿石、赶月石伤害 +15%' },
    yuhua: { image: 'art/ui/bao/yuhua.webp', n: '雨花石', q: 1, w: 7, wd: 0, d: '漂萍石多弹一名敌人，回燕石多一次回程命中；锁足石、绊马石迟缓时长 ×1.3' },
    yunxing: { image: 'art/ui/bao/yunxing.webp', n: '陨星铁', q: 2, w: 7, wd: 0, d: '石子可额外穿过一个敌人；命中有 20% 概率眩晕 0.4 秒，首领减半，同一敌人每 2 秒最多触发一次', c: '石子以外的武艺伤害 −30%' },
    baipi: { n: '百辟刀', q: 2, w: 0, wd: .3, d: '刀的武艺伤害 +30%；流血最多叠 8 层、破甲最多 6 层', c: '刀以外的武艺伤害 −30%' },
    yuxi: { n: '传国玉玺', q: 2, d: '武艺伤害 +25%，每仗打完多回 15% 气血', c: '敌人血量 +15%' },
    chitu: { n: '赤兔马', q: 2, d: '移速 +30%', c: '受到的伤害 +10%' },
    tengjia: { n: '藤甲', q: 2, d: '受到的伤害 −25%', c: '被火烧伤害 ×2.5' },
    hufu2: { n: '虎符', q: 2, d: '武艺伤害 +20%，出手快 10%', c: '真气上限减半' },
    taiping: { n: '太平要术', q: 2, d: '每 15 秒天降一道雷，劈最近的敌人', c: '每次落雷自己扣 2% 气血' },
  };
  const BQN = ['凡品', '良品', '传说'], BQC = ['#d8c08a', '#6fb8ff', '#ffb347'];
  const SHANG = { jian: { n: '箭伤', d: '移速 −10%' }, nei: { n: '内伤', d: '真气回复 −30%' }, mo: { n: '心魔', d: '受到的伤害 +10%' } };
  const HAS = k => !!(S.bao && S.bao.includes(k)), HURT = k => !!(S.shang && S.shang.includes(k));
  function gainBao(k) { if (!BAO[k] || HAS(k)) return; (S.bao = S.bao || []).push(k); if (window.SFX) SFX.play('j_lvup'); if (window.CODEX) CODEX.see('bao:' + k); }
  function addShang(k) { if (SHANG[k] && !HURT(k)) (S.shang = S.shang || []).push(k); }
  const baoPool = q => Object.keys(BAO).filter(k => BAO[k].q === q && !HAS(k) && (BAO[k].w == null || [...S.slots, ...(S.owned || [])].some(s => s && SK[s] && wepOf(s) === BAO[k].w)));
  function baoOpts(qs) { const out = []; for (const q of qs) { const L = baoPool(q).filter(k => !out.includes(k)); if (L.length) out.push(L[(Math.random() * L.length) | 0]); } return out; }
  function pickBao(qs, cb, title) {   // 宝物 N 选 1（qs：每个选项的品级）
    const ks = baoOpts(qs); if (!ks.length) { if (cb) cb(); return; }
    const old = document.getElementById('survPick'); if (old) old.remove(); W.pick = true;
    const box = document.createElement('div'); box.id = 'survPick';
    box.innerHTML = `<div class="p"><h3>${title || '宝物 · 选一件'}</h3><div class="row">${ks.map((k, j) => { const b = BAO[k]; return `<button data-j="${j}" class="q${b.q === 2 ? 3 : b.q}"><img src="${b.image || `art/ui/bao/${k}.webp`}" style="width:72px;height:72px;display:block;margin:0 auto;filter:drop-shadow(0 2px 4px rgba(0,0,0,.7))"><b>${b.n}</b><span style="color:${BQC[b.q]};font-size:13px">${BQN[b.q]}</span><span>${b.d}</span>${b.c ? `<span style="color:#ff8a7a">代价：${b.c}</span>` : ''}</button>`; }).join('')}</div></div>`;
    box.querySelectorAll('button').forEach(b => b.onclick = () => { gainBao(ks[+b.dataset.j]); box.remove(); W.pick = false; if (cb) cb(); });
    document.body.appendChild(box);
  }
  const baoMul = () => (HAS('yuxi') ? 1.25 : 1) * (HAS('hufu2') ? 1.2 : 1) * (HAS('taoyuan') && W.started && W.t < 10 ? 1.3 : 1) * (HAS('shuangji') && near(hero.x, hero.y, 120).length >= 5 ? 1.25 : 1);
  function baoDmg(z, m) { const c = CM, k = CK; CM = 1; CK = ''; HT(z, m, 15); CM = c; CK = k; }
  function baoHit(z, d, traits) {   // 打中敌人时（g_combat_hit 调用）：令旗对精锐、破甲锥挂破甲
    if (!traits || traits.dot || !traits.survSkill) return d;
    if (HAS('pojia') && z && !z.dead) addPJ(z, 1, 4);
    return d * (HAS('lingqi') && tough(z) ? 1.15 : 1);
  }
  function baoTick(dt) {
    if (!RT.on || !W.started || W.pick || !hero) return;
    if (HAS('dilu') && !S.diluUsed && hero.hp > 0 && hero.hp / maxHp() < .3) { S.diluUsed = 1; hero.inv = Math.max(hero.inv || 0, 2); floaters.push({ x: hero.x, y: hero.y - 60, t: 0, txt: '的卢一跃！', gold: true }); }
    if (HAS('liannu') && (S.lnT = (S.lnT || 0) + dt) >= 5) { S.lnT = 0; for (let i = 0; i < 3; i++) later(i * .12, () => { const z = nearest(320); if (!z) return; fx.push({ k: 'line', x: hero.x, y: hero.y, a: Math.atan2((z.y - hero.y) * 2, z.x - hero.x), L: dist(z, hero), w: 3, t: 0, T: .18, col: '230,210,160' }); baoDmg(z, .55); }); }
    if (HAS('taiping') && (S.tpT = (S.tpT || 0) + dt) >= 15) { const z = nearest(420); if (z) { S.tpT = 0; fx.push({ k: 'bolt', x: z.x, y: z.y, t: 0, T: .45 }); baoDmg(z, 3.2); for (const o of near(z.x, z.y, 50)) if (o !== z) baoDmg(o, 1.2); shake = Math.max(shake, .3); hero.hp = Math.max(1, hero.hp - maxHp() * .02); if (window.SFX) SFX.play('j_banner'); } }
    if (S.jili && S.jili.length) for (let i = S.jili.length - 1; i >= 0; i--) { const o = S.jili[i]; o.t -= dt; for (const z of hittable()) if (!o.hs.has(z) && Math.hypot(z.x - o.x, (z.y - o.y) * 2) < 26) { o.hs.add(z); baoDmg(z, .25); stunz(z, .4); } if (o.t <= 0) S.jili.splice(i, 1); }
  }
  // 出征前·桃园三赠：刘备、关羽各一个免费，张飞一个有代价
  const BLESS = {
    lb: [['money', '盘缠', '得 100 铜钱'], ['hp', '宽厚', '气血上限 +10%'], ['caoxie', '织席草鞋', '得宝物「织席草鞋」']],
    gy: [['lv3', '指点刀法', '起手的武艺直接升到 LV3'], ['gf', '赠书', '学一门心法（三选一）'], ['xiu', '夜读春秋', '修为 +60']],
    zf: [['drink', '痛饮', '失去 30% 气血，得一件良品宝物'], ['dice', '赌酒', '失去全部铜钱，得一件传说宝物（三选一）'], ['fight', '拼命', '气血上限 −15%，多学一招武艺（三选一）']],
  };
  function blessOpts() { const r = L => L[(Math.random() * L.length) | 0]; return [['刘备'].concat(r(BLESS.lb)), ['关羽'].concat(r(BLESS.gy)), ['张飞'].concat(r(BLESS.zf))]; }
  function blessDo(k, cb) {
    const done = () => { if (cb) cb(); };
    if (k === 'money') { S.money += 100; done(); }
    else if (k === 'hp') { S.hpMul = (S.hpMul || 1) * 1.1; hero.hp = maxHp(); done(); }
    else if (k === 'caoxie') { gainBao('caoxie'); done(); }
    else if (k === 'lv3') { const s0 = S.slots[0]; if (s0) S.mast[s0] = Math.max(S.mast[s0] || 0, MAST_T[2]); done(); }
    else if (k === 'gf') offerReward(1, cb, 1, ['perk']);
    else if (k === 'xiu') { addXiu(60); done(); }
    else if (k === 'drink') { hero.hp = Math.max(1, hero.hp - maxHp() * .3); pickBao([1, 1, 1], cb, '张飞 · 痛饮 · 良品宝物'); }
    else if (k === 'dice') { S.money = 0; pickBao([2, 2, 2], cb, '张飞 · 赌酒 · 传说宝物'); }
    else if (k === 'fight') { S.hpMul = (S.hpMul || 1) * .85; hero.hp = Math.min(hero.hp, maxHp()); offerReward(1, cb, 1, ['skill']); }
    else done();
  }

  const heal = v => { hero.hp = Math.min(maxHp(), hero.hp + v); };
  // ---------- 节点结算：连选 n 次（武艺 / 强化 三选一）----------
  function rewardOptions(kind) {
    const owned = S.slots.filter(Boolean).concat(S.owned || []), free = true;   // 格子满了也能学（放进掌握武学）
    const sk = (free ? Object.keys(SK).filter(k => !owned.includes(k) && tierOk(k) && !SK[k].off && (!ONLY_DAO || wepOk(k))) : []).sort(() => Math.random() - .5).slice(0, kind === 'skill' ? 3 : 2).map(k => ({ kind: 'skill', k, q: Math.min(3, SK[k].tier || 0), name: SK[k].name, icon: SK[k].icon, color: SK[k].color, desc: (SK[k].tier ? TIERN[SK[k].tier] + '阶 · ' : '') + SK[k].desc.split(/[；;]/)[0].replace(/[，,]?\s*LV\d.*$/, '') }));
    const gp = Object.keys(GF).filter(id => { const g = GF[id]; return !g.off && (!ONLY_DAO || g.c < 2) && !S.gf.includes(id) && S.qg !== id && !(S.owned || []).includes(id) && W.n >= TMIN[g.t + 1]; });
    const pk = gp.sort(() => Math.random() - .5).map(id => { const g = GF[id]; return { kind: 'gf', id, q: g.t, name: g.n, icon: g.qg ? '轻' : g.n[0], color: GTC[g.t], desc: GTN[g.t] + '阶 · ' + (g.qg ? '轻功 · ' : g.c >= 0 ? g.cn + ' · ' : '内功 · ') + gfText(g) }; });
    {   // 11/14 用户定：三张里保底一张本门武艺；阶位按概率：黄七成、玄三成（有的话），不直接给玄
      const mine = Object.keys(SK).filter(k => !owned.includes(k) && tierOk(k) && !SK[k].off && wepOf(k) === heldW());
      if (mine.length && !sk.some(o => wepOf(o.k) === heldW())) {
        const want = Math.random() < .3 ? 2 : 1, byT = t => mine.filter(k => (SK[k].tier || 1) === t), L = byT(want).length ? byT(want) : byT(1).length ? byT(1) : mine, k = L[(Math.random() * L.length) | 0];
        const o = { kind: 'skill', k, q: Math.min(3, SK[k].tier || 0), name: SK[k].name, icon: SK[k].icon, color: SK[k].color, desc: (SK[k].tier ? TIERN[SK[k].tier] + '阶 · ' : '') + SK[k].desc.split(/[；;]/)[0].replace(/[，,]?\s*LV\d.*$/, '') };
        if (sk.length) sk[0] = o; else sk.push(o);
      }
    }
    if (pk.length < 3) pk.push({ kind: 'heal', name: '回春', icon: '春', color: '#ff9a9a', desc: '立刻回复 40% 血量' });
    if (kind === 'perk') return pk.slice(0, 3);
    return sk.concat(pk).slice(0, 3).sort(() => Math.random() - .5);
  }
  function offerReward(n, cb, i, kinds) {
    i = i || 1; if (i > n) { W.pick = false; if (cb) cb(); return; }
    const kind = kinds && kinds[Math.min(i, kinds.length) - 1], opts = rewardOptions(kind); W.pick = true;
    const old = document.getElementById('survPick'); if (old) old.remove();
    const box = document.createElement('div'); box.id = 'survPick';
    box.innerHTML = `<div class="p"><h3>战利 · ${kind === 'skill' ? '武艺 · ' : kind === 'perk' ? '心法 · ' : ''}${n > 1 ? '第 ' + i + '/' + n + ' 次 · ' : ''}三选一</h3><div class="row">${opts.map((o, j) => `<button data-j="${j}" class="q${o.q || 0}"><i style="font-style:normal;font-size:11px;opacity:.7">${o.kind === 'skill' ? '新武艺 · 主动' : o.kind === 'gf' ? '心法 · 被动' : '回血'}</i>${o.kind === 'skill' || o.kind === 'gf' ? `<div class="pkb">${bookOf(o)}</div>` : iconUrl(o.kind, o.k || o.id) ? `<em class="ic" style="background-image:url('${iconUrl(o.kind, o.k || o.id)}')"></em>` : `<b style="color:${o.color}">${o.icon}</b>`}<span>${o.name}</span><small>${o.desc}</small></button>`).join('')}</div><div style="text-align:center;margin-top:6px"><button class="skip">都不要 · 换 15 铜钱</button></div>${S.slots.indexOf('') >= 0 ? '<p>新武艺放进空着的格子；格子满了就收进「掌握武学」，到整备屏「武学」页换上</p>' : ''}</div>`;
    box.querySelector('.skip').onclick = () => { S.money = (S.money || 0) + 15; if (window.SFX) SFX.play('j_coin'); box.remove(); offerReward(n, cb, i + 1, kinds); };   // 11/14 用户定：三张都不要就换钱
    box.querySelectorAll('button[data-j]').forEach(b => b.onclick = () => {
      const o = opts[+b.dataset.j];
      if (o.kind === 'skill' || o.kind === 'gf') learn(o); else heal(maxHp() * .4);   // 11/11：格子满了以前会白选（学不进去），改走 learn：满了就进「掌握武学」
      box.remove(); offerReward(n, cb, i + 1, kinds);
    });
    document.body.appendChild(box);
  }
  // 奇遇：几个固定的小抉择（route.js 负责弹窗，选完把键传回来）
  function eventDo(k, cb) {
    const done = () => { if (cb) cb(); };
    if (k === 'pray') { heal(maxHp() * .4); done(); }
    else if (k === 'loot') { hero.hp = Math.max(1, hero.hp * .8); offerReward(1, cb); }
    else if (k === 'wine') { RT.dmg *= 1.08; done(); }
    else if (k === 'learn') offerReward(1, cb);
    else if (k === 'sharpen') { RT.dmg *= 1.1; done(); }
    else if (k === 'rest') { heal(maxHp() * .3); done(); }
    // 11/14 三国奇遇（cb(结果一句话, 要打的仗)）
    else if (k === 'e_wait') { addXiu(60); done(); }
    else if (k === 'e_note') offerReward(1, cb, 1, ['perk']);
    else if (k === 'e_hero') { addShang('mo'); pickBao([1, 1, 1], cb, '煮酒论英雄 · 良品宝物'); }
    else if (k === 'e_drop') { addXiu(30); done(); }
    else if (k === 'e_bone') { hero.hp = Math.max(1, hero.hp - maxHp() * .15); S.hpMul *= 1.1; S.shang = []; done(); }
    else if (k === 'e_mafei') { S.money -= 50; hero.hp = maxHp(); done(); }
    else if (k === 'e_arrow') { hero.hp = Math.max(1, hero.hp - maxHp() * .2); offerReward(1, cb, 1, ['skill']); }
    else if (k === 'e_city') { if (Math.random() < .5) pickBao([1, 1, 1], () => cb && cb('城中空无一人，案上却摆着一件宝物。')); else { if (cb) cb('城中伏兵四起——中计了！', 'battle'); } }
    else if (k === 'e_xiu20') { addXiu(20); done(); }
    else if (k === 'e_xiu10') { addXiu(10); done(); }
    else if (k === 'e_xiu25') { addXiu(25); done(); }
    else if (k === 'e_dandao') { S.afterFight = { bao: 2 }; if (cb) cb('你单刀赴会，席间刀光一闪，伏兵杀出！', 'elite'); }
    else if (k === 'e_coin40') { S.money += 40; done(); }
    else if (k === 'e_coin50') { S.money += 50; done(); }
    else if (k === 'e_coin60') { S.money += 60; done(); }
    else if (k === 'e_path') { S.afterFight = { coin2: 1 }; if (cb) cb('林深路窄，一声梆子响，伏兵杀出！', 'battle'); }
    else if (k === 'e_brother') { S.money -= 30; pickBao([0, 0, 0], cb, '结义 · 凡品宝物'); }
    else if (k === 'e_heal20') { heal(maxHp() * .2); done(); }
    else if (k === 'e_heal30') { heal(maxHp() * .3); done(); }
    else if (k === 'e_meng') { gainBao('tengjia'); if (cb) cb(HAS('tengjia') ? '孟获拜谢而去，留下一副藤甲。' : '孟获拜谢而去。'); }
    else if (k === 'e_bet') { const w = Math.random() < .5; if (w) S.money += 100; else hero.hp = Math.max(1, hero.hp - maxHp() * .1); if (cb) cb(w ? '一箭正中画戟小枝，众人喝彩，你赢了 100 铜钱！' : '箭擦着戟杆飞过，你输了，还被罚了几杯烈酒。'); }
    else if (k === 'e_fire') { S.enemyHpK = .8; done(); }
    else if (k === 'e_cover') { hero.hp = Math.max(1, hero.hp - maxHp() * .1); gainBao('qixing'); if (cb) cb('追兵过后，那将军解下佩刀相赠：「他日必报。」'); }
    else if (k === 'e_baby') { S.afterFight = { xiu: 50, heal: .2 }; if (cb) cb('你提刀杀进乱军！', 'battle'); }
    else if (k === 'e_flee') { addShang('mo'); done(); }
    else if (k === 'e_letter') { if (Math.random() < .5) pickBao([1, 1, 1], () => cb && cb('是真信！你连夜带着密信和信中提到的宝物离开。')); else { if (cb) cb('是假信——帐外伏兵早已等着你！', 'battle'); } }
    else if (k === 'e_work') { hero.hp = Math.max(1, hero.hp - maxHp() * .15); S.money += 80; done(); }
    else if (k === 'e_teach') { if (cb) cb('', 'train'); }
    else if (k === 'e_shoe') { S.money -= 20; gainBao('caoxie'); done(); }
    else if (k === 'e_chat') { addXiu(15); heal(maxHp() * .1); done(); }
    else if (k === 'e_maze') { hero.hp = Math.max(1, hero.hp - maxHp() * .2); pickBao([1, 1, 1], cb, '八阵图 · 良品宝物'); }
    else if (k === 'e_rob') { S.money += 60; addShang('jian'); done(); }
    else if (k === 'e_burn') { S.weakN = 2; done(); }
    else if (k === 'e_debate') { addXiu(80); done(); }
    else if (k === 'e_herb') { heal(maxHp() * .3); done(); }
    else if (k === 'e_heal5') { heal(maxHp() * .05); done(); }
    else done();
  }
  function nodeClear() {   // 一个节点打完：敌人站定淡出 → 左下战报 → 整备屏（结算/拾取/修炼/行商/武艺）→ 回长卷
    const nd = RT.node; W.started = false; eshots.length = 0; TELE.length = 0;
    for (const z of zs) if (!z.dead) { z.endFade = .9; z.st = 'idle'; z.t = 0; z.enemySkill = null; z.air = false; z.stun = 0; z.daze = 0; }
    setTimeout(() => { zs.length = 0; }, 950);
    const R = S.rep = { stolen: S.stolen || 0, kills: (typeof kills === 'number' ? kills : 0) - (S.k0 || 0), got: S.coinGot || 0, left: 0, taken: Math.round((S.taken || 0) * 10), tiao: 0, lv0: S.lvAt0 || S.lv, xiu: 0 };
    { let sum = 0; for (const c of S.coins) sum += c.v; R.left = Math.floor(sum * .9); S.money += R.left; S.coins.length = 0; }   // 地上没捡的铜钱：收回九成
    { R.zqLeft = Math.round(S.zq * 10); const c = S.zq * (.3 + IT('tiao')); if (c > .05) { heal(c); R.tiao = Math.round(c * 10); } S.zq = 0; if (IT('after')) heal(maxHp() * IT('after')); }   // 调息：剩余真气 30% 化成气血
    if (nd.type === 'boss' && nd.final) { won = true; return; }
    if (window.SFX) SFX.play('j_win');
    R.xiu = nd.type === 'boss' ? 60 : nd.type === 'elite' ? 40 : 25; addXiu(R.xiu);
    if (nd.type === 'boss') heal(maxHp() * .3);
    S.loot = rollLoot(nd); S.shop = rollShop(nd); S.bought = [];
    if (HAS('wuzhu')) S.money += 15; if (HAS('yuxi')) heal(maxHp() * .15);
    if ((S.weakN || 0) > 0) S.weakN--; S.enemyHpK = 1;
    const af = S.afterFight; S.afterFight = null;   // 奇遇里打的仗：打完的额外奖励
    if (af) { if (af.xiu) addXiu(af.xiu); if (af.heal) heal(maxHp() * af.heal); if (af.coin2) { S.money += R.got + R.left; } }
    {   // 11/14 用户：局内不弹选择——精锐随机掉一件凡品/良品，首领随机掉一件传说，奇遇里的精锐战掉对应品级，直接拿到
      const q = af && af.bao != null ? af.bao : nd.type === 'elite' ? (Math.random() < .35 ? 1 : 0) : nd.type === 'boss' ? 2 : -1;
      const k = q >= 0 ? baoOpts([q])[0] : null;
      if (k) { gainBao(k); R.bao = k; }   // 11/14 用户：战斗里不写出来，打完在结算页看
    }
    report(R);
    W.pick = true;
    setTimeout(() => prepOpen(nd), 1000);
  }
  function beginNode(nd) {
    if (window.CODEX) for (const k of S.slots.concat(S.owned || [])) if (k) CODEX.see('sk:' + k);
    if (window.HERO_SKIN) for (const k of S.slots) if (k && SK[k]) HERO_SKIN.preload(HERO_SKIN.cur(), preOf(k));
    S.diluUsed = 0; S.huxinUsed = 0; S.lnT = 0; S.tpT = 0; S.jili = []; if (HAS('qingnang')) heal(maxHp() * .1);   // 11/14：学过的武艺进图鉴
    if (!c2ok && typeof ensureAssets === 'function') ensureAssets('chapter2', { silent: true }).then(() => { c2ok = true; });
    GM = gfCalc(); S.zq = zqMax(); S.hp0 = hero.hp; S.noHitT = 0; S.xy = 0;
    S.k0 = typeof kills === 'number' ? kills : 0; S.coinGot = 0; S.taken = 0; S.hutiSum = 0; S.dps = {}; S.lastHp = hero.hp; S.coins = []; S.lvAt0 = S.lv; S.tutT = 0; S.stolen = 0; S.thiefCd = 8; S.catDone = false; TELE.length = 0; BOOM.length = 0;
    RT.node = nd; W.N = ROUTE.waves(nd); W.started = true; W.between = 0; W.pick = false; S.wind = null; S.recov = null; S.later = []; bolts.length = 0; zones.length = 0; DKO.length = 0; fx.length = 0;
    zs.length = 0; eshots.length = 0; if (window.ARENA) ARENA.start(ROUTE.mapOf(nd));
    startWave(1);
  }

  // ================= 铜钱 / 战报 / 整备屏 / 刘备教学（11/11 用户定） =================
  const COIN_IMG = new Image(); COIN_IMG.src = 'art/ui/hud/coin.webp';
  const PORTRAIT = new Image(); PORTRAIT.src = 'art/ui/npc/liubei_face.webp';
  function dropCoins(z) {   // 敌人倒下掉铜钱：普通 1，精锐 3，敌将 15
    if (z.T.unit === 'fan' && !z.fanBoom) { z.fanBoom = 1; teleAdd({ k: 'circle', x: z.x, y: z.y, r: 42, T: .45, dmg: 1.2, c: 3, snd: 'land' }); }   /* 11/12 狂信徒：倒下 0.45 秒后炸一小圈（不挂 src，人死了也照炸） */
    if (z.T.siege) { for (let i = 0; i < 5; i++) S.coins.push({ x: z.x + R(-16, 16), y: z.y + R(-6, 6), z: 8 + R(0, 10), vz: R(60, 110), vx: R(-40, 40), v: 1, t: 0 }); return; }   // 拆了投石车：地上掉 5 文
    if (z.T.thief) { const v = (z.loot || 0) + 4; z.loot = 0; for (let i = 0; i < Math.min(6, v); i++) S.coins.push({ x: z.x + R(-14, 14), y: z.y + R(-6, 6), z: 8 + R(0, 10), vz: R(60, 110), vx: R(-40, 40), v: Math.ceil(v / Math.min(6, v)), t: 0 }); floaters.push({ x: z.x, y: z.y - 44, t: 0, txt: '钱袋破了！', color: '#ffd86e' }); return; }   // 窃贼：偷的钱 + 4 全撒出来
    if (z.survTier < 1 || (z.survTier === 1 && !z.T.elite && z.type !== 'yellow-golem')) { S.money += 1; S.coinGot += 1; if (Math.random() > .07) return; }   // 11/11 用户定：普通杀敌直接入账，只有多出来的钱掉在地上要捡
    const v = z.survTier >= 2 ? 15 : z.survTier === 1 && (z.T.elite || z.type === 'yellow-golem') ? 8 + (Math.random() * 5 | 0) :   /* 11/14 精英 8～12 文（不再掉鸡腿） */ 3 + (Math.random() * 3 | 0);
    const n = Math.min(5, v), each = Math.ceil(v / n);
    for (let i = 0; i < n; i++) S.coins.push({ x: z.x + R(-14, 14), y: z.y + R(-6, 6), z: 8 + R(0, 10), vz: R(60, 110), vx: R(-40, 40), v: each, t: 0 });
    tut('coin');
  }
  // 窃贼（11/11 用户定）：跑去捡地上的铜钱，捡够了或没钱可捡就逃跑；打死会把偷的钱连本带利吐出来，跑掉了战报里记一笔
  // ================= 11/12 新兵种 AI =================
  function unitAI(z, dt) {
    if (z.daze > 0) { z.daze -= dt; z.stun = Math.max(0, z.stun - dt); moveEnt(z, z.vx * dt, 0); z.vx *= .85; z.moving = false; return; }
    if (z.stun > 0) { z.stun -= dt; moveEnt(z, z.vx * dt, 0); z.vx *= .85; z.moving = false; z.cdash = null; if (z.stun <= 0) set(z, 'move'); return; }
    if (z.st === 'hurt' || z.st === 'idle') set(z, 'move');
    const T = z.T, dx = hero.x - z.x, dy = hero.y - z.y, d = Math.hypot(dx, dy / YS) || 1, sp = T.spd * slowMove(z, .5) * dt;
    z.ucd = (z.ucd == null ? R(1, 2.5) : z.ucd) - dt;
    const go = (tx, ty, k = 1) => { const ex = tx - z.x, ey = ty - z.y, e = Math.hypot(ex, ey) || 1; z.moving = true; z.f = Math.sign(ex) || z.f; moveEnt(z, ex / e * sp * k, ey / e * sp * k * .8); };
    const keep = (lo, hi) => { if (d < lo) go(z.x - dx, z.y - dy); else if (d > hi) go(hero.x, hero.y); else { z.moving = false; z.f = Math.sign(dx) || z.f; } };
    if (T.unit === 'fire') {   // 火罐手：保持 140~210 的距离，扔火油罐，落地留一片烧 3 秒的火
      if (z.st === 'wind') { z.moving = false; if (z.t > .6) { set(z, 'strike'); const tx = hero.x + R(-14, 14), ty = hero.y + R(-8, 8);
        teleAdd({ k: 'circle', x: tx, y: ty, r: 40, T: .75, dmg: 1.2, c: 3, snd: 'land', then: () => hzAdd({ kind: 'fire', x: tx, y: ty, r: 38, dmg: .8, T: 3 }) }); if (window.SFX) SFX.play('bow', 0, .6); } return; }
      if (z.st === 'strike') { z.moving = false; if (z.t > .35) set(z, 'move'); return; }
      keep(140, 210); if (z.ucd <= 0 && d < 260) { z.ucd = R(3.2, 4.2); z.f = Math.sign(dx) || z.f; set(z, 'wind'); }
      return;
    }
    if (T.unit === 'drum') {   // 鼓手：躲在后排敲鼓，130 范围内的黄巾 4 秒内动作快 30%
      if (z.st === 'wind') { z.moving = false; if (z.t > .4) { set(z, 'strike'); for (const o of zs) if (o !== z && !o.dead && !o.survBoss && Math.hypot(o.x - z.x, (o.y - z.y) / YS) < 130) o.drumT = 4;
        hzAdd({ kind: 'drum', x: z.x, y: z.y, T: .6 }); floaters.push({ x: z.x, y: z.y - 50, t: 0, txt: '咚！咚！', color: '#ff7a5a' }); if (window.SFX) SFX.play('crack', 0, .5); } return; }
      if (z.st === 'strike') { z.moving = false; if (z.t > .55) set(z, 'move'); return; }
      keep(170, 240); if (z.ucd <= 0) { z.ucd = R(3.6, 4.6); set(z, 'wind'); }
      return;
    }
    if (T.unit === 'cav') {   // 骑兵：绕着主角兜圈，冷却好了就停下、出一条冲锋预警线，然后直线冲过去
      if (z.cdash) { const c = z.cdash; c.t += dt; const q = Math.min(1, c.t / .42); z.x = c.x0 + (c.x1 - c.x0) * q; z.y = Math.max(M.top + 6, Math.min(M.bot - 6, c.y0 + (c.y1 - c.y0) * q)); z.st = 'strike'; z.moving = true; if (q >= 1) { z.cdash = null; set(z, 'move'); } return; }
      if (z.st === 'wind') { z.moving = false; return; }
      if (z.ucd <= 0 && d < 280) { z.ucd = R(3.5, 4.5); const a = ang(z, hero.x, hero.y), L = 330, x0 = z.x, y0 = z.y; z.f = Math.cos(a) < 0 ? -1 : 1; set(z, 'wind');
        teleAdd({ k: 'line', x: x0, y: y0, a, len: L, w: 40, T: .7, dmg: 2, src: z, snd: '', then: () => { if (z.dead || z.air) return; z.cdash = { x0: z.x, y0: z.y, x1: z.x + Math.cos(a) * L, y1: z.y + Math.sin(a) * L * YS, t: 0 }; if (window.SFX) SFX.play('enemySwing', 0, .8); } }); return; }
      const oa = Math.atan2((z.y - hero.y) / YS, z.x - hero.x) + .9 * dt * (z.orb || (z.orb = Math.random() < .5 ? -1 : 1));
      go(hero.x + Math.cos(oa) * 210, hero.y + Math.sin(oa) * 210 * YS, 1); return;
    }
    if (T.unit === 'xbow') {   // 弩手：保持远距离，半蹲瞄准（地上一条细红线）0.8 秒后平射一支穿透弩箭
      if (z.st === 'wind') { z.moving = false; return; }
      if (z.st === 'strike') { z.moving = false; if (z.t > .35) set(z, 'move'); return; }
      keep(180, 260);
      if (z.ucd <= 0 && d < 330) { z.ucd = R(3.8, 4.8); const a = ang(z, hero.x, hero.y); z.f = Math.cos(a) < 0 ? -1 : 1; set(z, 'wind');
        teleAdd({ k: 'line', x: z.x, y: z.y, a, len: 440, w: 16, T: .8, dmg: 1.6, src: z, snd: '', then: () => { set(z, 'strike'); if (window.SFX) SFX.play('bow', 0, .9); } }); }
      return;
    }
    // ===== 11/12 用户：老兵种重新设计（数量多 → 难度低：伤害小、冷却长、预警清楚）=====
    const tele = (o, cd, then) => { z.ucd = cd; z.f = Math.sign(hero.x - z.x) || z.f; set(z, 'wind'); teleAdd(Object.assign({ src: z, snd: '' }, o, { then: () => { if (!z.dead) set(z, 'strike'); if (then) then(); } })); };
    const OLD = T.unit === 'heavy' || T.unit === 'shield' || T.unit === 'spear';
    if (OLD && z.cdash) { const c = z.cdash; c.t += dt; const q = Math.min(1, c.t / .24); z.x = c.x0 + (c.x1 - c.x0) * q; z.y = Math.max(M.top + 6, Math.min(M.bot - 6, c.y0 + (c.y1 - c.y0) * q)); z.moving = true; if (q >= 1) z.cdash = null; return; }
    if (OLD && z.st === 'wind') { z.moving = false; return; }
    if ((OLD || T.unit === 'priest') && z.st === 'strike') { z.moving = false; if (z.t > .4) set(z, 'move'); return; }
    if (T.unit === 'heavy') {   // 大刀兵：走近后蓄力 0.9 秒，朝你横劈一片（短而宽），劈完喘口气
      if (d < 70 && z.ucd <= 0) { tele({ k: 'line', x: z.x, y: z.y, a: ang(z, hero.x, hero.y), len: 78, w: 74, T: .9, dmg: 1.4 }, R(4.5, 5.5), () => { z.stun = Math.max(z.stun || 0, .5); }); return; }
      go(hero.x, hero.y, d < 60 ? 0 : 1); return;
    }
    if (T.unit === 'shield') {   // 盾兵：远程打他只吃七成（rangedResist）；靠近后举盾往前一撞，把你推开
      if (d < 120 && d > 30 && z.ucd <= 0) { const a = ang(z, hero.x, hero.y), L = 100, x0 = z.x, y0 = z.y;
        tele({ k: 'line', x: x0, y: y0, a, len: L, w: 36, T: .7, dmg: 1 }, R(5.5, 6.5), () => { z.cdash = { x0: z.x, y0: z.y, x1: z.x + Math.cos(a) * L * .8, y1: z.y + Math.sin(a) * L * .8 * YS, t: 0 }; }); return; }
      go(hero.x, hero.y, d < 40 ? 0 : 1); return;
    }
    if (T.unit === 'spear') {   // 枪兵：中距离停下，地上一条细长预警线，0.7 秒后往前突刺一段
      if (d < 170 && d > 50 && z.ucd <= 0) { const a = ang(z, hero.x, hero.y), L = 150;
        tele({ k: 'line', x: z.x, y: z.y, a, len: L, w: 22, T: .75, dmg: 1.2 }, R(4.5, 5.5), () => { z.cdash = { x0: z.x, y0: z.y, x1: z.x + Math.cos(a) * L * .7, y1: z.y + Math.sin(a) * L * .7 * YS, t: 0 }; }); return; }
      keep(90, 150); return;
    }
    if (T.unit === 'priest') {   // 方士：躲在后排念咒；附近有受伤的同伴就回血，没有就朝你丢一团符火（落地小火 2 秒）
      if (z.st === 'wind') { z.moving = false; if (z.t > .9) { set(z, 'strike');
          const hurt = zs.filter(o => o !== z && !o.dead && !o.survBoss && o.hp < (o.maxHp || o.hp) && Math.hypot(o.x - z.x, (o.y - z.y) / YS) < 130);
          if (hurt.length) { for (const o of hurt) o.hp = Math.min(o.maxHp || o.hp, o.hp + 1.5); hzAdd({ kind: 'heal', x: z.x, y: z.y, T: .7 }); floaters.push({ x: z.x, y: z.y - 50, t: 0, txt: '回春！', color: '#8fe08a' }); }
          else { const tx = hero.x, ty = hero.y; teleAdd({ k: 'circle', x: tx, y: ty, r: 32, T: .9, dmg: .9, c: 3, snd: 'land', src: z, then: () => hzAdd({ kind: 'fire', x: tx, y: ty, r: 28, dmg: .5, T: 2 }) }); }
        } return; }
      keep(160, 230); if (z.ucd <= 0 && d < 300) { z.ucd = R(5.5, 6.5); set(z, 'wind'); }
      return;
    }
    if (T.unit === 'fan') {   // 狂信徒：直冲主角，贴身扑一下；死的时候炸一小圈（dropCoins 里）
      if (z.st === 'wind') { z.moving = false; if (z.t > .3) { set(z, 'strike'); if (Math.hypot(hero.x - z.x, (hero.y - z.y) / YS) < 34 && typeof dmgHero === 'function') dmgHero(T.dmg, z); } return; }
      if (z.st === 'strike') { if (z.t > .35) set(z, 'move'); return; }
      if (d < 28 && z.ucd <= 0) { z.ucd = 1.1; set(z, 'wind'); return; }
      go(hero.x, hero.y); return;
    }
  }
  function thiefAI(z, dt) {
    z.t += dt; z.flash = Math.max(0, z.flash - dt);
    if (z.daze > 0) { z.daze -= dt; z.stun = Math.max(0, z.stun - dt); moveEnt(z, z.vx * dt, 0); z.vx *= .85; z.moving = false; return; }
    if (z.stun > 0) { z.stun -= dt; moveEnt(z, z.vx * dt, 0); z.vx *= .85; z.moving = false; if (z.stun <= 0) set(z, 'move'); return; }
    if (z.st !== 'move' && z.st !== 'idle' && z.st !== 'wind') set(z, 'move');
    z.loot = z.loot || 0; z.life = (z.life || 0) + dt;
    if (z.st === 'wind') { z.moving = false; if (z.t > .35) set(z, 'move'); return; }   // 弯腰把钱塞进麻袋
    const sp = z.T.spd * slowMove(z, .5) * dt;
    if (!z.flee && (z.loot >= 8 || z.life > 14 || (z.life > 6 && !S.coins.length))) {   // 捡够了 / 太久 / 没钱可捡：开溜
      z.flee = 1; floaters.push({ x: z.x, y: z.y - 46, t: 0, txt: z.loot ? '贼人要跑了！' : '贼人溜了', color: '#ffcf6a' });
      const p = window.ARENA && ARENA.on() ? ARENA.edge() : { x: z.x < hero.x ? cam.x - 60 : cam.x + viewW() + 60, y: z.y };
      z.fx = p.x; z.fy = p.y;
    }
    if (z.flee) {
      z.flee += dt; const dx = z.fx - z.x, dy = z.fy - z.y, d = Math.hypot(dx, dy) || 1;
      z.moving = true; z.f = Math.sign(dx) || z.f; moveEnt(z, dx / d * sp * 1.25, dy / d * sp * .9);
      if (d < 16 || z.flee > 3.2) { S.stolen = (S.stolen || 0) + z.loot; z.loot = 0; z.hidden = true; z.endFade = .45; z.thiefGone = 1; }
      return;
    }
    let best = null, bd = 1e9;
    for (const c of S.coins) { if (c.z > 0) continue; const d = Math.hypot(c.x - z.x, (c.y - z.y) * 1.4); if (d < bd) { bd = d; best = c; } }
    if (best) {
      const dx = best.x - z.x, dy = best.y - z.y, d = Math.hypot(dx, dy) || 1;
      if (d < 9) { S.coins.splice(S.coins.indexOf(best), 1); z.loot += best.v; set(z, 'wind'); floaters.push({ x: z.x, y: z.y - 40, t: 0, txt: '-' + best.v + ' 铜钱', color: '#ff8a5a' }); if (window.SFX) SFX.play('coin', 0, .7); return; }
      z.moving = true; z.f = Math.sign(dx) || z.f; moveEnt(z, dx / d * sp, dy / d * sp * .8);
    } else {   // 没钱可捡：在主角外圈绕着等
      const dx = z.x - hero.x, dy = z.y - hero.y, d = Math.hypot(dx, dy) || 1, want = 130;
      const tx = hero.x + dx / d * want - dy / d * 40, ty = hero.y + dy / d * want + dx / d * 40, ex = tx - z.x, ey = ty - z.y, e = Math.hypot(ex, ey) || 1;
      z.moving = e > 6; if (z.moving) { z.f = Math.sign(ex) || z.f; moveEnt(z, ex / e * sp * .7, ey / e * sp * .5); }
    }
  }
  function coinTick(dt) {
    if (RT.node && RT.node.cat && !S.catDone && W.started && W.t > 2.5 && c2ok) {   // 投石车（11/11 用户要）：节点开打后从场边推上来，原地不动一直往主角一带砸，拆掉掉 5 文
      S.catDone = true;
      for (let i = 0; i < RT.node.cat; i++) { const z = edgeSpawn('yellow-catapult'); if (z) { z.catapultIndex = i; z.cd = 3 + i * 2; z.survMul *= 1.5; z.hp *= 1.5; z.maxHp = z.hp; floaters.push({ x: z.x, y: z.y - 50, t: 0, txt: '投石车！', color: '#ffcf6a', big: 1 }); } }
      tut('catapult');
    }
    for (const z of zs) if (z.thiefGone && z.endFade <= 0 && z.st !== 'gone') { z.st = 'gone'; z.t = 1; }
    if (RT.node && W.started && !W.pick && (S.thiefCd = (S.thiefCd == null ? 8 : S.thiefCd) - dt) <= 0 && S.coins.length >= 2 && !zs.some(z => z.T.thief && !z.dead && !z.thiefGone)) {
      S.thiefCd = R(14, 22); const z = edgeSpawn('thief'); floaters.push({ x: z.x, y: z.y - 50, t: 0, txt: '有贼！', color: '#ffcf6a' }); tut('thief');
    }
    for (const z of zs) if (z.dead && !z.coinDone && !z.endFade) { z.coinDone = 1; dropCoins(z); }
    if (S.coinComboT > 0) S.coinComboT -= dt; else S.coinCombo = 0;
    for (let i = S.coins.length - 1; i >= 0; i--) {
      const c = S.coins[i]; c.t += dt;
      if (c.z > 0 || c.vz > 0) { c.vz -= 380 * dt; c.z = Math.max(0, c.z + c.vz * dt); c.x += c.vx * dt; if (c.z === 0) { c.vz = 0; c.vx = 0; } }
      const dx = hero.x - c.x, dy = hero.y - c.y, d = Math.hypot(dx, dy * 1.6);
      if (d < 22 && c.t > .35) { S.money += c.v; S.coinGot += c.v; S.coins.splice(i, 1); S.coinCombo = Math.min(14, S.coinCombo + 1); S.coinComboT = .7; if (window.SFX) SFX.play('coin', 0, 1 + S.coinCombo * .05); }
    }
    if (hero.hp < (S.lastHp == null ? hero.hp : S.lastHp)) S.taken += S.lastHp - hero.hp; S.lastHp = hero.hp;
  }
  function coinDraw() {
        for (const c of S.coins) {
      const bob = Math.sin(c.t * 5 + c.x) * 1.2, sz = 11;
      ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(c.x, c.y + 2, 3.5, 1.4, 0, 0, 7); ctx.fill();
      { const cx = c.x, cy = c.y - 5 - c.z + bob, sp = Math.abs(Math.cos(c.t * 3 + c.x));   // 地上的铜钱：画成透明底的方孔钱（coin.webp 带底色，画在地上是一块方砖）
        ctx.save(); ctx.translate(cx, cy); ctx.scale(.45 + .55 * sp, 1);
        ctx.fillStyle = '#3e2408'; ctx.beginPath(); ctx.arc(0, 0, 3.8, 0, 7); ctx.fill();   // 11/11：地上的钱缩小、压暗一点，不抢眼
        ctx.fillStyle = '#c08a34'; ctx.beginPath(); ctx.arc(0, 0, 3, 0, 7); ctx.fill();
        ctx.fillStyle = 'rgba(255,224,150,.75)'; ctx.beginPath(); ctx.arc(-.8, -.8, 1.6, 0, 7); ctx.fill();
        ctx.fillStyle = '#3e2408'; ctx.fillRect(-1, -1, 2, 2); ctx.restore(); }
    }
  }
  function moneyHud() {   // 左上角：铜钱
    if (hok('h2_money')) { const im = HIMG.h2_money, h = 50, w = h * im.naturalWidth / im.naturalHeight, x = 8, y = 26; ctx.save(); ctx.drawImage(im, x, y, w, h); ctx.font = '900 19px "Arial Black",Impact,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(10,6,3,.9)'; ctx.fillStyle = '#ffe9a8'; const cx = x + w * .66; ctx.strokeText(String(S.money), cx, y + h * .55); ctx.fillText(String(S.money), cx, y + h * .55); ctx.restore(); return; }   // 11/14：铜钱框（铜钱元宝挂在左头）
    const x = 10, y = 30, w = 104, h = 30;
    ctx.save(); ctx.fillStyle = 'rgba(16,10,6,.82)'; ctx.fillRect(x, y, w, h); ctx.strokeStyle = '#b08a4a'; ctx.lineWidth = 1.2; ctx.strokeRect(x + .5, y + .5, w - 1, h - 1);
    if (COIN_IMG.complete && COIN_IMG.naturalWidth) ctx.drawImage(COIN_IMG, x + 3, y + 2, 26, 26);
    ctx.font = 'bold 17px "PingFang SC",sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#ffe9a8'; ctx.fillText(String(S.money), x + 36, y + h / 2 + 1);
    ctx.restore();
  }
  function report(R) {   // 左下角战报，2.6 秒后淡出
    const old = document.getElementById('survRep'); if (old) old.remove();
    const d = document.createElement('div'); d.id = 'survRep';
    d.innerHTML = `<b>战报</b><span>击倒 ${R.kills}</span><span>铜钱 +${R.got + R.left}</span><span>受伤 ${R.taken}</span>${R.stolen ? `<span style="color:#ff7a5a">被贼人顺走 ${R.stolen} 铜钱……</span>` : ''}`;
    document.body.appendChild(d); setTimeout(() => d.classList.add('out'), 2600); setTimeout(() => d.remove(), 3200);
  }

  // 整备屏样式（11/11：1:1 照群侠幸存者，框体/图标用用户给的 Gemini 素材）
  const uiK = () => Math.max(.5, Math.min(1.45, Math.min(innerHeight / 860, innerWidth / 1500)));
  const uiKt = () => { const k = uiK(); return matchMedia('(pointer:coarse)').matches ? Math.max(k, .78) : k; };   // 11/11：手机上框体照旧按屏幕缩，字单独放大（不低于 0.78 倍）
  const setK = e => { e.style.setProperty('--k', uiK()); e.style.setProperty('--kt', uiKt()); };   // 整备屏/提醒框的缩放系数（CSS 里 calc 不能把长度除成纯数字，只能 JS 算）
  addEventListener('resize', () => { for (const id of ['survPrep', 'survTut']) { const e = document.getElementById(id); if (e) setK(e); } });
  const PREP_CSS = `
#survPrep{position:fixed;inset:0;z-index:10025;background:radial-gradient(ellipse at 50% 40%,rgba(14,10,8,.72),rgba(6,4,3,.9));font-family:"PingFang SC","Microsoft YaHei",sans-serif;color:#efe2c6;user-select:none}
@media (pointer:coarse) and (orientation:landscape) and (max-height:520px){#survPrep{bottom:30px;box-shadow:0 30px 0 #060403}}   /* iPhone 横屏：最下面一条留给浏览器工具栏，整备屏整体抬高，「出发」等按钮才点得到 */
#survPrep em{display:inline-block;background:center/contain no-repeat;vertical-align:middle;font-style:normal}
#survPrep .mo{position:absolute;left:1.2vw;top:1.6vh;height:calc(56px*var(--k));min-width:calc(200px*var(--k));display:flex;align-items:center;gap:calc(14px*var(--k));padding:0 calc(22px*var(--k));border:calc(14px*var(--k)) solid transparent;border-image:url(art/ui/prep/btn.webp) 40 fill stretch;box-sizing:border-box}
#survPrep .mo em{width:calc(40px*var(--k));height:calc(40px*var(--k))}#survPrep .mo b{font:900 calc(30px*var(--kt)) "PingFang SC",sans-serif;color:#fff2d4}
#survPrep .tb{position:absolute;left:50%;transform:translateX(-50%);top:1.5vh;display:flex;gap:calc(4px*var(--k))}
#survPrep .tb button{position:relative;width:calc(180px*var(--k));height:calc(66px*var(--k));border:0;background:url(art/ui/prep/tab.webp) center/100% 100% no-repeat;color:#cbb894;font:900 calc(26px*var(--kt)) "Songti SC","STSong","Noto Serif SC",serif;letter-spacing:.3em;text-indent:.3em;cursor:pointer}
#survPrep .tb button.on{background-image:url(art/ui/prep/tab_on.webp);color:#3a1e08;text-shadow:0 1px 0 rgba(255,240,200,.6);filter:drop-shadow(0 0 calc(10px*var(--k)) rgba(255,190,80,.55))}
#survPrep .tb button i{position:absolute;right:calc(10px*var(--k));top:calc(-4px*var(--k));min-width:calc(22px*var(--k));height:calc(22px*var(--k));border-radius:11px;background:#b8281e;color:#fff;font:700 calc(13px*var(--kt))/calc(22px*var(--kt)) sans-serif;font-style:normal;letter-spacing:0;text-indent:0}
#survPrep .tl{position:absolute;left:30vw;right:30vw;top:calc(1.5vh + 74px*var(--k));height:1px;background:linear-gradient(90deg,transparent,#b08a4a 15%,#b08a4a 85%,transparent)}
#survPrep .bd{position:absolute;left:3vw;right:3vw;top:calc(1.5vh + 92px*var(--k));bottom:calc(250px*var(--k));display:flex;gap:calc(18px*var(--k));justify-content:center}
#survPrep .pn{position:relative;flex:1;max-width:calc(660px*var(--k));border:calc(34px*var(--k)) solid transparent;border-image:url(art/ui/prep/panel.webp) 90 fill stretch;padding:calc(4px*var(--k)) calc(8px*var(--k));overflow:auto;box-sizing:border-box;scrollbar-width:thin}
#survPrep .pn.wide{max-width:none;display:flex;align-items:center;justify-content:center}
#survPrep h4{margin:calc(4px*var(--k)) 0 calc(8px*var(--k));padding-bottom:calc(5px*var(--k));border-bottom:1px solid rgba(176,138,74,.5);font:700 calc(19px*var(--kt)) "Songti SC","Noto Serif SC",serif;color:#cbb894;letter-spacing:.15em;display:flex;justify-content:space-between;align-items:flex-end}
#survPrep h4 small{font:400 calc(13px*var(--kt)) sans-serif;color:#8f7c5e;letter-spacing:0}
#survPrep .sm{display:grid;grid-template-columns:auto 1fr auto 1fr;gap:calc(10px*var(--k));align-items:center;font-size:calc(19px*var(--kt));color:#bfa98a}#survPrep .sm span{display:flex;align-items:center;gap:6px}#survPrep .sm em{width:calc(30px*var(--k));height:calc(30px*var(--k))}#survPrep .sm b{font:900 calc(26px*var(--kt)) sans-serif;color:#fff2d4}
#survPrep .nt{margin:calc(6px*var(--k)) 0 0;font-size:calc(14px*var(--kt));color:#8f7c5e}
#survPrep .ln{margin:calc(6px*var(--k)) 0;font-size:calc(18px*var(--kt));color:#cbb894;display:flex;align-items:center;gap:calc(8px*var(--k))}#survPrep .ln em{width:calc(28px*var(--k));height:calc(28px*var(--k))}#survPrep .ln b{color:#fff;font-size:calc(21px*var(--kt))}#survPrep .c1{color:#5cc8ff!important}#survPrep .c2{color:#ff5a5a!important}
#survPrep .pb{display:flex;align-items:center;gap:calc(10px*var(--k));margin:calc(6px*var(--k)) 0}#survPrep .pb>em{width:calc(42px*var(--k));height:calc(42px*var(--k));flex:none;border:1px solid #8a6a3a;background-size:cover}
#survPrep .pbf{position:relative;flex:1;height:calc(30px*var(--k));border:calc(10px*var(--k)) solid transparent;border-image:url(art/ui/prep/pbar.webp) 40 60 fill stretch;box-sizing:border-box;display:flex;align-items:center;justify-content:space-between;padding:0 calc(10px*var(--k));overflow:hidden}
#survPrep .pbf u{position:absolute;left:0;top:0;bottom:0;background:linear-gradient(90deg,#8a5a14,#e8b040 80%,#fff0a8);opacity:.9}#survPrep .pbf b,#survPrep .pbf i{position:relative;font:900 calc(15px*var(--kt)) sans-serif;font-style:normal;color:#fff6dc;text-shadow:0 1px 2px #000}
#survPrep .em2{text-align:center;color:#8f7c5e;font-size:calc(20px*var(--kt));line-height:1.8}#survPrep .em2 small{font-size:.7em}#survPrep .ov{position:absolute;left:0;right:0;top:45%}
#survPrep .gd{display:grid;grid-template-columns:repeat(4,1fr);gap:calc(10px*var(--k))}#survPrep .gd.sg{grid-template-columns:repeat(3,1fr);gap:calc(16px*var(--k)) calc(14px*var(--k))}@media (max-height:520px){#survPrep .gd.sg{grid-template-columns:repeat(5,1fr)}}#survPrep .sl .pr{position:absolute;left:50%;bottom:calc(-10px*var(--k));transform:translateX(-50%);padding:0 calc(8px*var(--k));background:rgba(10,6,4,.9);border:1px solid #8a6a3a;font:900 calc(15px*var(--kt)) "Arial Black",Impact,sans-serif;font-style:normal;color:#ffe08a;white-space:nowrap}#survPrep .sl.sold{filter:grayscale(.8) brightness(.6)}#survPrep .sl .lki{position:absolute;right:2px;top:2px;font-style:normal;font-size:calc(16px*var(--kt))}#survPrep .shn2{margin-left:auto;font:700 calc(13px*var(--kt)) "PingFang SC",sans-serif;color:#9e8a6a}#survPrep .lkh{margin-top:calc(18px*var(--k));font-size:calc(13px*var(--kt))}
#survPrep .sl{position:relative;aspect-ratio:1;background:url(art/ui/prep/slot.webp) center/100% 100% no-repeat;display:flex;align-items:center;justify-content:center;cursor:default}#survPrep .sl[data-a]{cursor:pointer}
#survPrep .sl em{width:80%;height:80%;background-size:cover}#survPrep .sl em.ghost{opacity:.5;background-size:contain}
#survPrep .sl.on{filter:drop-shadow(0 0 calc(8px*var(--k)) rgba(255,210,110,.9))}#survPrep .sl[style*="--rc"]{box-shadow:inset 0 0 0 2px var(--rc)}
#survPrep .sl .eq{position:absolute;right:2px;bottom:2px;padding:0 4px;background:rgba(10,6,4,.85);border:1px solid #b08a4a;font:700 calc(12px*var(--kt)) sans-serif;font-style:normal;color:#ffe9b8}
#survPrep .dt{display:flex;flex-direction:column;height:100%}#survPrep .dh{display:flex;gap:calc(14px*var(--k));align-items:center}#survPrep .dh>em{width:calc(96px*var(--k));height:calc(96px*var(--k));flex:none;border:2px solid #8a6a3a;background-size:cover}
#survPrep .dh h3{margin:0;font:900 calc(30px*var(--kt)) "Songti SC","Noto Serif SC",serif;color:#fff2d4}#survPrep .dh p{margin:calc(2px*var(--k)) 0;font-size:calc(17px*var(--kt))}
#survPrep .tg{display:flex;gap:calc(5px*var(--k));flex-wrap:wrap}#survPrep .tg span{padding:0 calc(6px*var(--k));border:1px solid #b08a4a;border-radius:3px;font-size:calc(14px*var(--kt));color:#e9cf98}
#survPrep h5{margin:calc(14px*var(--k)) 0 calc(4px*var(--k));font:400 calc(17px*var(--kt)) sans-serif;color:#8f7c5e}#survPrep .ds{margin:0;font-size:calc(18px*var(--kt));line-height:1.6;color:#efe2c6;flex:1}#survPrep .ds2{margin:calc(4px*var(--k)) 0;font-size:calc(14px*var(--kt));color:#8f7c5e}
#survPrep .db{display:flex;gap:calc(10px*var(--k));justify-content:center;margin-top:calc(8px*var(--k));flex-wrap:wrap}
#survPrep .db button,#survPrep .bb{border:calc(12px*var(--k)) solid transparent;border-image:url(art/ui/prep/btn.webp) 40 fill stretch;background:none;color:#f6e6c4;font:900 calc(20px*var(--kt)) "Songti SC","Noto Serif SC",serif;letter-spacing:.15em;padding:calc(2px*var(--k)) calc(18px*var(--k));cursor:pointer;display:inline-flex;align-items:center;gap:calc(6px*var(--k))}
#survPrep .db button em,#survPrep .bb em{width:calc(26px*var(--k));height:calc(26px*var(--k))}#survPrep button:disabled{opacity:.45;cursor:not-allowed}#survPrep .db button:hover:not(:disabled),#survPrep .bb:hover:not(:disabled){filter:brightness(1.25)}
#survPrep .cd{display:flex;flex-direction:column;align-items:center;text-align:center;max-width:calc(420px*var(--k))}#survPrep .cd .bi{width:calc(120px*var(--k));height:calc(120px*var(--k));padding:calc(12px*var(--k));box-sizing:border-box;background-color:rgba(0,0,0,.35);background-origin:content-box;border:calc(10px*var(--k)) solid transparent;border-image:url(art/ui/prep/pframe.webp) 50 stretch}
#survPrep .cd h3{margin:calc(10px*var(--k)) 0 0;font:900 calc(32px*var(--kt)) "Songti SC","Noto Serif SC",serif;color:#fff2d4}#survPrep .cd>p{margin:calc(2px*var(--k)) 0;font-size:calc(18px*var(--kt))}
#survPrep .dv{display:block;width:60%;height:1px;margin:calc(10px*var(--k)) 0;background:linear-gradient(90deg,transparent,#b08a4a,transparent)}#survPrep .up{font-size:calc(24px*var(--kt))!important;color:#efe2c6}#survPrep .up b{color:#ffd86e;margin-right:6px}
#survPrep .sd{flex:1;font-size:calc(16px*var(--kt))!important;color:#bfa98a}#survPrep .cd .bb{margin-top:auto;font-size:calc(26px*var(--kt))}
#survPrep .cd.sh{align-items:stretch;text-align:left}#survPrep .cd.sh{position:relative}#survPrep .lkb,#survPrep .lk{position:absolute;right:calc(10px*var(--k));bottom:calc(14px*var(--k));display:flex;flex-direction:column;align-items:center;line-height:1.1}#survPrep .lkb i,#survPrep .lk i{font-style:normal;font-size:.8em}#survPrep .lkb{padding:calc(4px*var(--k)) calc(14px*var(--k));border:1px solid #6a5232;border-radius:calc(6px*var(--k));background:rgba(20,14,9,.7);color:#bfa98a;font:700 calc(14px*var(--kt)) "PingFang SC",sans-serif;cursor:pointer}#survPrep .lkb:hover{color:#f3d08a;border-color:#b08a4a}#survPrep .lkb.on{color:#ffd86e;border-color:#d8b060;background:rgba(80,56,20,.6)}#survPrep .lk{margin:0;font:700 calc(14px*var(--kt)) "PingFang SC",sans-serif;color:#e8c47a}#survPrep .cd.sh .buy{align-self:center;font-family:"PingFang SC",sans-serif}#survPrep .cd.sh .buy b{font-size:calc(26px*var(--kt));color:#fff}
#survPrep .ch{display:flex;align-items:center;gap:calc(4px*var(--k))}#survPrep .ch .sl{width:calc(78px*var(--k))}#survPrep .ar2{width:calc(14px*var(--k));height:calc(18px*var(--k));background:url(art/ui/prep/arrow.webp) center/contain no-repeat;flex:none}
#survPrep .two{display:grid;grid-template-columns:3fr 1fr;gap:calc(16px*var(--k))}#survPrep .rw{display:flex;gap:calc(8px*var(--k))}#survPrep .rw .sl{width:calc(70px*var(--k))}
#survPrep .t-wu .pn:first-child{flex:1.35;max-width:calc(820px*var(--k))}
#survPrep .ab{position:absolute;left:1.5vw;right:1.5vw;bottom:calc(84px*var(--k));height:calc(140px*var(--k));display:flex;align-items:center}
#survPrep .ab .md{width:calc(150px*var(--k));height:calc(150px*var(--k));flex:none;background:url(art/ui/prep/medal.webp) center/contain no-repeat;display:flex;align-items:center;justify-content:center;z-index:1}#survPrep .ab .md em{width:58%;height:58%}
#survPrep .ar{flex:1;height:calc(124px*var(--k));margin:0 calc(-20px*var(--k));border:calc(22px*var(--k)) solid transparent;border-image:url(art/ui/prep/bar.webp) 60 90 fill stretch;display:flex;align-items:center;justify-content:space-around;padding:0 calc(26px*var(--k));box-sizing:border-box}
#survPrep .ac{display:flex;flex-direction:column;align-items:center;gap:calc(2px*var(--k));cursor:help}#survPrep .ac span{font:700 calc(17px*var(--kt)) "Songti SC","Noto Serif SC",serif;color:#bfa98a}#survPrep .ac em{width:calc(36px*var(--k));height:calc(36px*var(--k))}#survPrep .ac b{font:900 calc(20px*var(--kt)) sans-serif;color:#ffcf6a}
#survPrep .ar .sp{width:1px;align-self:stretch;margin:calc(8px*var(--k)) 0;background:linear-gradient(transparent,#b08a4a,transparent)}
#survPrep .vt{position:absolute;left:50%;transform:translateX(-50%);bottom:calc(8px*var(--k));width:min(46vw,calc(760px*var(--k)));display:flex;flex-direction:column;gap:calc(4px*var(--k))}
#survPrep .vb{display:flex;align-items:center;gap:calc(6px*var(--k))}#survPrep .vb>em{width:calc(34px*var(--k));height:calc(34px*var(--k))}
#survPrep .vf{position:relative;flex:1;height:calc(32px*var(--k));border:calc(10px*var(--k)) solid transparent;border-image:url(art/ui/prep/pbar.webp) 40 60 fill stretch;box-sizing:border-box;display:flex;align-items:center;justify-content:center;overflow:hidden}
#survPrep .vf u{position:absolute;left:0;top:0;bottom:0}#survPrep .vf.zq u{background:linear-gradient(180deg,#5cc0ff,#1f5fa8)}#survPrep .vf.hp u{background:linear-gradient(180deg,#e0463a,#8c1c18)}#survPrep .vf b{position:relative;font:900 calc(16px*var(--kt)) sans-serif;color:#fff;text-shadow:0 1px 2px #000}
#survPrep .lf{position:absolute;left:1.5vw;bottom:calc(14px*var(--k))}#survPrep .rf{font-size:calc(24px*var(--kt))!important;padding:calc(4px*var(--k)) calc(30px*var(--k))!important}#survPrep .rf span{margin-left:calc(20px*var(--k));font-family:sans-serif;color:#fff}
#survPrep .shn{margin:0;color:#8f7c5e;font-size:calc(15px*var(--kt))}
#survPrep .go{position:absolute;right:1.5vw;bottom:calc(10px*var(--k));min-width:calc(250px*var(--k));justify-content:center;font-size:calc(30px*var(--kt))!important;padding:calc(6px*var(--k)) calc(30px*var(--k))!important;letter-spacing:.4em!important}
#survPrep .ac b,#survPrep .mo b,#survPrep .sm b,#survPrep .pbf b,#survPrep .pbf i,#survPrep .vf b,#survPrep .ln b,#survPrep .rf span,#survPrep .buy b{font-family:"Arial Black","Impact","PingFang SC",sans-serif;letter-spacing:.04em;-webkit-text-stroke:calc(1px*var(--k)) rgba(20,10,4,.9);paint-order:stroke fill}
#survPrep .pn::-webkit-scrollbar{width:calc(8px*var(--k))}#survPrep .pn::-webkit-scrollbar-track{background:rgba(0,0,0,.35);border:1px solid #5a4226}#survPrep .pn::-webkit-scrollbar-thumb{background:linear-gradient(90deg,#8a6a3a,#d8b060,#8a6a3a);border-radius:4px}#survPrep .pn{scrollbar-color:#b08a4a rgba(0,0,0,.35)}
#survPrep h4 .so{padding:0 calc(10px*var(--k));height:calc(26px*var(--k));border:calc(6px*var(--k)) solid transparent;border-image:url(art/ui/prep/sbtn.webp) 30 fill stretch;background:none;color:#cbb894;font:600 calc(14px*var(--kt)) sans-serif;letter-spacing:0;cursor:pointer;line-height:1}
#survTut .tskip{position:fixed;right:calc(20px*var(--k));top:calc(18px*var(--k));padding:calc(4px*var(--k)) calc(14px*var(--k));background:linear-gradient(90deg,transparent,rgba(0,0,0,.7) 30%);font:600 calc(22px*var(--kt)) "PingFang SC",sans-serif;color:#9a8a70}#survTut .tskip b{color:#efe2c6}
@media (max-height:520px){#survPrep .ac span{display:none}}
#survTut{position:fixed;right:1vw;bottom:calc(16vh + 60px);z-index:10040;display:flex;align-items:stretch;width:min(820px,60vw);cursor:pointer;animation:tutIn .3s ease-out}
@keyframes tutIn{from{transform:translateY(16px);opacity:0}}
#survTut .bx{position:relative;flex:1;border:calc(18px*var(--k)) solid transparent;border-image:url(art/ui/prep/dialog.webp) 40 fill stretch;padding:calc(6px*var(--k)) calc(18px*var(--k));color:#f6ecd6;display:flex;flex-direction:column;justify-content:center}
#survTut .nm{position:absolute;left:calc(14px*var(--k));top:calc(-34px*var(--k));padding:calc(2px*var(--k)) calc(22px*var(--k));border:calc(10px*var(--k)) solid transparent;border-image:url(art/ui/prep/tab.webp) 30 fill stretch;font:900 calc(22px*var(--kt)) "Songti SC","Noto Serif SC",serif;letter-spacing:.2em;color:#ffe9b8}
#survTut p{margin:calc(6px*var(--k)) 0;font:600 calc(21px*var(--kt))/1.55 "PingFang SC",sans-serif}#survTut small{align-self:flex-end;font-size:calc(13px*var(--kt));color:#8f7c5e}#survTut small b{color:#e9dcc0}
#survTut>em{width:calc(150px*var(--k));flex:none;background:center/cover no-repeat;border:calc(14px*var(--k)) solid transparent;border-image:url(art/ui/prep/pframe.webp) 50 stretch;background-clip:padding-box}
#survTut.big{left:0;right:0;bottom:3vh;width:auto;padding-left:22vw}#survTut.big .bx{min-height:calc(170px*var(--k))}#survTut .lh{position:fixed;left:0;bottom:0;width:34vw;height:88vh;background:left bottom/contain no-repeat;pointer-events:none;filter:drop-shadow(0 0 20px rgba(0,0,0,.6))}
body.prep-open #survTut:not(.big){bottom:calc(80px*var(--k));width:min(900px,58vw)}
@media (max-height:520px){#survTut{bottom:calc(30vh);width:min(620px,70vw)}#survTut.big{padding-left:26vw}}
/* ===== 11/11 质感重做：照群侠 —— 近黑半透明底 + 1px 暗金细线 + 四角小角花，暗金低饱和，字米白 ===== */
#survPrep{background:radial-gradient(ellipse at 50% 40%,rgba(8,7,6,.62),rgba(3,3,3,.86));backdrop-filter:blur(3px) saturate(.7);-webkit-backdrop-filter:blur(3px) saturate(.7);color:#e6dccb}
#survPrep .pn,#survPick .p,.thinp{border:1px solid rgba(184,149,90,.5)!important;border-image:none!important;box-shadow:inset 0 0 0 1px rgba(0,0,0,.7),inset 0 0 calc(40px*var(--k,1)) rgba(0,0,0,.6),0 calc(10px*var(--k,1)) calc(30px*var(--k,1)) rgba(0,0,0,.55);
  background:linear-gradient(#d2b072,#d2b072) left 4px top 4px/14px 1px,linear-gradient(#d2b072,#d2b072) left 4px top 4px/1px 14px,linear-gradient(#d2b072,#d2b072) right 4px top 4px/14px 1px,linear-gradient(#d2b072,#d2b072) right 4px top 4px/1px 14px,
  linear-gradient(#d2b072,#d2b072) left 4px bottom 4px/14px 1px,linear-gradient(#d2b072,#d2b072) left 4px bottom 4px/1px 14px,linear-gradient(#d2b072,#d2b072) right 4px bottom 4px/14px 1px,linear-gradient(#d2b072,#d2b072) right 4px bottom 4px/1px 14px,
  linear-gradient(180deg,rgba(22,19,16,.9),rgba(10,9,8,.92))!important;background-repeat:no-repeat!important;border-radius:2px}
#survPrep .pn{padding:calc(16px*var(--k)) calc(22px*var(--k))}
#survPrep h4{border-bottom:0;background:linear-gradient(90deg,rgba(184,149,90,0),rgba(184,149,90,.55) 8%,rgba(184,149,90,.55) 92%,rgba(184,149,90,0)) left bottom/100% 1px no-repeat;color:#cdb68a;font-weight:600}
#survPrep .tb button{filter:saturate(.55) brightness(.78);color:#bfae8e}#survPrep .tb button.on{filter:saturate(.7) brightness(.95) drop-shadow(0 0 calc(6px*var(--k)) rgba(220,170,90,.35));color:#2a1606}
#survPrep .tl{background:linear-gradient(90deg,transparent,rgba(184,149,90,.6) 15%,rgba(184,149,90,.6) 85%,transparent)}
#survPrep .mo,#survPrep .db button,#survPrep .bb,#survPrep h4 .so,#survPrep .cbb{border:1px solid rgba(184,149,90,.6)!important;border-image:none!important;background:linear-gradient(180deg,rgba(44,36,27,.95),rgba(18,15,12,.95))!important;box-shadow:inset 0 0 0 1px rgba(0,0,0,.6),inset 0 1px 0 rgba(255,230,180,.08);color:#e3cf9f;border-radius:2px}
#survPrep .bb,#survPrep .db button{padding:calc(8px*var(--k)) calc(24px*var(--k))}
#survPrep .db button:hover:not(:disabled),#survPrep .bb:hover:not(:disabled),#survPrep .cbb:hover:not(:disabled){filter:none;border-color:#e2c27a!important;color:#fff0cc;box-shadow:inset 0 0 0 1px rgba(0,0,0,.6),0 0 calc(10px*var(--k)) rgba(226,194,122,.3)}
#survPrep .go{border-color:#c9a35a!important}
#survPrep .pbf,#survPrep .vf{border:1px solid rgba(184,149,90,.45)!important;border-image:none!important;background:rgba(0,0,0,.55);height:calc(18px*var(--k));padding:0 calc(8px*var(--k))}
#survPrep .vf{height:calc(20px*var(--k))}
#survPrep .pbf u{background:linear-gradient(90deg,#5a4320,#a8823e 70%,#e6c98a);opacity:.95}
#survPrep .pbf b,#survPrep .pbf i{font-size:calc(12px*var(--kt))}#survPrep .vf b{font-size:calc(13px*var(--kt))}
#survPrep .vf.hp u{background:linear-gradient(180deg,#c8473b,#7a1c16)}#survPrep .vf.zq u{background:linear-gradient(180deg,#5aa8e0,#1d4f86)}
#survPrep .ar,#survPrep .ab .md{filter:saturate(.6) brightness(.8)}#survPrep .ac b{color:#e6c98a}
#survPrep .sl{background:rgba(0,0,0,.45);border:1px solid rgba(184,149,90,.35);box-shadow:inset 0 0 calc(12px*var(--k)) rgba(0,0,0,.8)}
#survPrep .sl.on{border-color:#e2c27a;filter:none;box-shadow:inset 0 0 calc(12px*var(--k)) rgba(0,0,0,.8),0 0 calc(10px*var(--k)) rgba(226,194,122,.45)}
#survPrep .cd .bi{border:1px solid rgba(184,149,90,.5);border-image:none}#survPrep .dh>em{border:1px solid rgba(184,149,90,.5)}
#survPrep .tg span{border-color:rgba(184,149,90,.5);color:#cdb68a}
#survPrep .dh h3,#survPrep .cd h3{color:#efe4cc}
/* 一排竖卡（拾取 / 行商） */
#survPrep .pn.sw{display:block;overflow:visible;max-width:none}
#survPrep .srow{display:flex;gap:calc(18px*var(--k));justify-content:center;flex-wrap:wrap;margin-top:calc(14px*var(--k))}
#survPrep .sc{position:relative;width:calc(186px*var(--k));padding:calc(14px*var(--k)) calc(10px*var(--k)) calc(12px*var(--k));box-sizing:border-box;display:flex;flex-direction:column;align-items:center;text-align:center;cursor:pointer;
  background:linear-gradient(180deg,rgba(30,26,21,.95),rgba(12,11,9,.95));border:1px solid rgba(184,149,90,.4);border-top:2px solid var(--rc);box-shadow:inset 0 0 calc(20px*var(--k)) rgba(0,0,0,.7);transition:transform .12s,border-color .12s}
#survPrep .sc:hover,#survPrep .sc.on{transform:translateY(calc(-4px*var(--k)));border-color:#e2c27a;z-index:5}
#survPrep .sc.sold{opacity:.45}#survPrep .sc.lkd{box-shadow:inset 0 0 calc(20px*var(--k)) rgba(0,0,0,.7),0 0 0 1px #e2c27a}
#survPrep .sc .ci{height:calc(150px*var(--k));display:flex;align-items:center;justify-content:center}
#survPrep .sc .ico{width:calc(118px*var(--k));height:calc(118px*var(--k));background-size:cover;border:1px solid rgba(184,149,90,.4);box-shadow:0 0 0 2px rgba(0,0,0,.6)}
#survPrep .sc h3{margin:calc(8px*var(--k)) 0 0;font:700 calc(20px*var(--kt)) "Songti SC","Noto Serif SC",serif;color:#efe4cc;white-space:nowrap}
#survPrep .sc .rq{margin:calc(2px*var(--k)) 0 calc(8px*var(--k));font-size:calc(13px*var(--kt))}
#survPrep .sc .cb{display:flex;gap:calc(6px*var(--k));margin-top:auto}
#survPrep .cbb{padding:calc(4px*var(--k)) calc(12px*var(--k));font:700 calc(15px*var(--kt)) "PingFang SC",sans-serif;cursor:pointer;display:inline-flex;align-items:center;gap:calc(4px*var(--k));white-space:nowrap}
#survPrep .cbb em{width:calc(18px*var(--k));height:calc(18px*var(--k))}#survPrep .cbb.buy b{font:900 calc(17px*var(--kt)) "Arial Black",Impact,sans-serif;color:#ffe3a0}
#survPrep .sc .lkb,#survPrep .sc .lki{position:absolute;right:calc(6px*var(--k));top:calc(6px*var(--k));bottom:auto;padding:0;width:calc(28px*var(--k));height:calc(28px*var(--k));border:1px solid rgba(184,149,90,.4);border-radius:2px;background:rgba(0,0,0,.5);font-size:calc(15px*var(--kt));font-style:normal;display:flex;align-items:center;justify-content:center;cursor:pointer}
#survPrep .sc .tip{display:none;position:absolute;left:calc(100% + 10px*var(--k));top:0;width:calc(270px*var(--k));padding:calc(12px*var(--k)) calc(14px*var(--k));text-align:left;cursor:default;z-index:9;pointer-events:none;
  background:rgba(8,7,6,.97);border:1px solid rgba(184,149,90,.6);box-shadow:0 calc(8px*var(--k)) calc(24px*var(--k)) rgba(0,0,0,.7)}
#survPrep .sc .tip.r{left:auto;right:calc(100% + 10px*var(--k))}
#survPrep .sc .tip h3{margin:0;font-size:calc(22px*var(--kt))}#survPrep .sc .tip>p{margin:calc(2px*var(--k)) 0 calc(6px*var(--k));font-size:calc(14px*var(--kt))}#survPrep .sc .tip h5{margin:calc(10px*var(--k)) 0 calc(2px*var(--k))}#survPrep .sc .tip .ds{font-size:calc(16px*var(--kt))}
@media (pointer:fine){#survPrep .sc:hover .tip{display:block}}
@media (pointer:coarse){#survPrep .sc.on .tip{display:block}}
#survPrep .lkh{margin-top:calc(16px*var(--k));font-size:calc(14px*var(--kt))}
@media (max-height:520px){#survPrep .srow{flex-wrap:nowrap;gap:calc(12px*var(--k))}#survPrep .sc .ci{height:calc(120px*var(--k))}#survPrep .lkh{display:none}}
/* 标签页 / 属性栏也换细线款；翻页、卡片出现加过渡 */
#survPrep .tb{gap:calc(2px*var(--k))}
#survPrep .tb button{background:linear-gradient(180deg,rgba(34,28,22,.92),rgba(14,12,10,.92))!important;border:1px solid rgba(184,149,90,.4);filter:none!important;color:#a8977a!important;height:calc(52px*var(--k));width:calc(170px*var(--k));font-size:calc(23px*var(--kt));text-shadow:none!important;transition:color .15s,border-color .15s}
#survPrep .tb button:hover{color:#e6d3a4!important;border-color:rgba(226,194,122,.7)}
#survPrep .tb button.on{background:linear-gradient(180deg,rgba(84,64,34,.95),rgba(36,27,16,.95))!important;border-color:#e2c27a;color:#f6e6bd!important;box-shadow:inset 0 -2px 0 #e2c27a,0 0 calc(12px*var(--k)) rgba(226,194,122,.25)}
#survPrep .pbf u{background:url(art/ui/hud2/bar_gold.webp) left center/auto 100% repeat-x!important;opacity:1!important}
#survPrep .vf u{background:url(art/ui/hud2/bar_red.webp) left center/auto 100% repeat-x!important}#survPrep .vf.zq u{background-image:url(art/ui/hud2/bar_blue.webp)!important}
#survPrep .mo{border:0!important;border-image:none!important;background:url(art/ui/hud2/money.webp) center/100% 100% no-repeat!important;box-shadow:none!important;height:calc(64px*var(--k))!important;min-width:calc(166px*var(--k))!important;padding:0 calc(30px*var(--k)) 0 calc(76px*var(--k))!important;justify-content:center}#survPrep .mo em{display:none!important}
#survPrep .ar em{filter:none!important}
#survPrep .vb>em.md2{width:calc(46px*var(--k))!important;height:calc(46px*var(--k))!important;margin:calc(-6px*var(--k)) calc(-10px*var(--k)) calc(-6px*var(--k)) 0;position:relative;z-index:2;background-size:contain!important;background-repeat:no-repeat;filter:drop-shadow(0 2px 3px rgba(0,0,0,.7))}   /* 11/14：气血真气大圆章压在条的左头 */
/* 11/14 用户对比群侠：属性栏套黑漆金回纹长框（九宫格不拉花），气血/真气条套两头尖角金框 */
#survPrep .ab .ar{border:calc(16px*var(--k)) solid transparent!important;border-image:url(art/ui/dlg/box.webp) 34 fill stretch!important;background:none!important;box-shadow:none!important;height:calc(104px*var(--k));padding:0 calc(14px*var(--k));margin:0 calc(-14px*var(--k))}
#survPrep .vf{border:calc(5px*var(--k)) calc(15px*var(--k)) solid transparent!important;border-image:url(art/ui/hud2/barframe.webp) 16 52 fill stretch!important;background:none!important;height:calc(26px*var(--k))!important;padding:0!important;overflow:visible!important}
#survPrep .vf u{top:calc(2px*var(--k))!important;bottom:calc(2px*var(--k))!important;left:0}
#survPrep .vt{gap:calc(2px*var(--k))!important}
/* 11/14 用户的 HUD 美术：页签用暗牌匾 / 金牌匾（压暗一点不刺眼），继续按钮用云纹木牌匾 */
#survPrep .tb button{background:url(art/ui/hud2/pl_dark.webp) center/100% 100% no-repeat!important;border:0!important;box-shadow:none!important;height:calc(58px*var(--k));width:calc(176px*var(--k));color:#b9a684!important}
#survPrep .tb button.on{background:url(art/ui/hud2/pl_gold.webp) center/112% 128% no-repeat!important;filter:brightness(.82) saturate(.85)!important;color:#2a1606!important;text-shadow:0 1px 0 rgba(255,236,190,.5)!important;box-shadow:none!important}
#survPrep .go{background:url(art/ui/hud2/pl_wood.webp) center/100% 100% no-repeat!important;border:0!important;border-image:none!important;box-shadow:none!important;color:#f3d08a!important;text-shadow:0 2px 0 #1a0c04!important;min-width:calc(280px*var(--k))!important;height:calc(68px*var(--k))!important;padding:0 calc(50px*var(--k))!important}
#survPrep .ar{border:1px solid rgba(184,149,90,.45)!important;border-image:none!important;background:linear-gradient(180deg,rgba(22,19,16,.92),rgba(10,9,8,.94));filter:none!important;height:calc(96px*var(--k));margin:0 calc(-8px*var(--k));box-shadow:inset 0 0 0 1px rgba(0,0,0,.7)}
#survPrep .ab{height:calc(110px*var(--k))}#survPrep .ab .md{width:calc(110px*var(--k));height:calc(110px*var(--k));filter:saturate(.55) brightness(.8)!important}
#survPrep .ar .sp{background:linear-gradient(transparent,rgba(184,149,90,.6),transparent)}
#survPrep .ac span{color:#a8977a;font-weight:600}
#survPrep .ac{position:relative;cursor:help}#survPrep .ac .at{display:none;position:absolute;left:50%;bottom:calc(100% + 10px*var(--k));transform:translateX(-50%);width:calc(300px*var(--k));padding:calc(10px*var(--k)) calc(14px*var(--k));text-align:left;z-index:20;pointer-events:none;background:rgba(8,7,6,.97);border:1px solid rgba(184,149,90,.6);box-shadow:0 calc(8px*var(--k)) calc(24px*var(--k)) rgba(0,0,0,.7)}
#survPrep .ac .at h5{margin:0 0 calc(4px*var(--k));font:700 calc(18px*var(--kt)) "Songti SC","Noto Serif SC",serif;color:#e6c98a}#survPrep .ac .at p{margin:0;font:500 calc(14px*var(--kt))/1.55 "PingFang SC",sans-serif;color:#e6dccb;white-space:normal}#survPrep .ac .at p.cur{margin-top:calc(6px*var(--k));color:#ffd86e;font-weight:700}
#survPrep .ac:first-child .at{left:0;transform:none}#survPrep .ac:last-child .at{left:auto;right:0;transform:none}
@media (pointer:fine){#survPrep .ac:hover .at{display:block}#survPrep .ac:hover b{color:#fff3c8}}
#survPrep .ac.on .at{display:block}
@keyframes pfade{from{opacity:0;transform:translateY(calc(6px*var(--k)))}}
#survPrep .bd.an{animation:pfade .2s ease-out}
#survPrep .bd.an .sc{animation:pfade .25s ease-out backwards}#survPrep .bd.an .sc:nth-child(2){animation-delay:.04s}#survPrep .bd.an .sc:nth-child(3){animation-delay:.08s}#survPrep .bd.an .sc:nth-child(4){animation-delay:.12s}#survPrep .bd.an .sc:nth-child(5){animation-delay:.16s}
/* 11/11：卡片详情直接写在卡上（照群侠行商），锁挂在卡片下方 */
#survPrep .sc{width:calc(232px*var(--k));align-items:stretch;text-align:left;padding:calc(12px*var(--k)) calc(12px*var(--k)) calc(10px*var(--k));cursor:default;min-height:calc(300px*var(--k))}
#survPrep .sc:hover{transform:none}
#survPrep .sc .ch2{display:flex;gap:calc(10px*var(--k));align-items:center}
#survPrep .sc .ci{height:auto;flex:none}#survPrep .sc .ci .bk{width:calc(66px*var(--k));height:calc(86px*var(--k))}#survPrep .sc .ci .bk span{font-size:calc(9px*var(--kt))}
#survPrep .sc .ico{width:calc(70px*var(--k));height:calc(70px*var(--k))}
#survPrep .sc h3{margin:0;font-size:calc(19px*var(--kt));white-space:normal}#survPrep .sc .rq{margin:calc(2px*var(--k)) 0 calc(4px*var(--k))}
#survPrep .sc h5{margin:calc(12px*var(--k)) 0 calc(3px*var(--k));font-size:calc(13px*var(--kt));color:#8f7c5e}
#survPrep .sc .ds{margin:0;font-size:calc(14px*var(--kt));line-height:1.5;color:#e6dccb;flex:1}
#survPrep .sc .cb{justify-content:center;margin-top:calc(10px*var(--k))}
#survPrep .sc .lkb{position:absolute;left:50%;top:auto;right:auto;bottom:calc(-38px*var(--k));transform:translateX(-50%);width:calc(30px*var(--k));height:calc(30px*var(--k))}
#survPrep .sc .lkb.on{border-color:#e2c27a;background:rgba(80,56,20,.7)}#survPrep .sc i.lkb:empty{display:none}
#survPrep .t-shang .srow{margin-bottom:calc(40px*var(--k))}
@media (max-height:520px){#survPrep .sc{min-height:0;width:calc(250px*var(--k))}#survPrep .sc .ds{font-size:calc(12px*var(--kt))}#survPrep .sc h5{display:none}#survPrep .sc .tg{display:none}}
/* 11/14 用户定：整备屏的字照「整军备战」——金色小标题加字距加前导菱形，正文米白至少 14.6px，品阶只写黄/玄/地/天阶 */
#survPrep h4{font-size:calc(18px*var(--kt));color:#f0d89a;letter-spacing:calc(5px*var(--k));justify-content:flex-start;gap:calc(8px*var(--k))}
#survPrep h4::before{content:'';width:calc(7px*var(--k));height:calc(7px*var(--k));flex:none;align-self:center;transform:rotate(45deg);background:#c9a35e;box-shadow:0 0 0 1px rgba(0,0,0,.6)}
#survPrep h4 small{margin-left:auto;font-size:calc(14px*var(--kt));color:#a8977a}#survPrep h4 .so{margin-left:auto}
#survPrep .pw{display:flex;flex-wrap:wrap;align-items:baseline;gap:calc(4px*var(--k)) calc(12px*var(--k));margin:calc(8px*var(--k)) 0 0;font-size:calc(13px*var(--kt));color:#a8977a}#survPrep .pw b{font-size:calc(22px*var(--kt));color:#ffd27a;font-weight:400;margin-right:calc(4px*var(--k))}#survPrep .pw i{font-style:normal}#survPrep .pw i.up{color:#9fd88a}#survPrep .pw i.dn{color:#ff8a7a}
#survPrep .lvl p{display:flex;gap:calc(10px*var(--k));margin:0;padding:calc(3px*var(--k)) 0;font-size:calc(14px*var(--kt));line-height:1.45;color:#6d6252}#survPrep .lvl em{flex:0 0 calc(42px*var(--k));font-style:normal;color:#6d6252}#survPrep .lvl b{font-weight:400}#survPrep .lvl p.on{color:#e2d4b6}#survPrep .lvl p.on em{color:#e8c47a}#survPrep .lvl p.on b{color:#9fc7e8}
#survPrep h5,#survPrep .sc h5{font-size:calc(15px*var(--kt));color:#b8a27a;letter-spacing:calc(2px*var(--k))}
#survPrep .sc .ds,#survPrep .ds{font-size:calc(16px*var(--kt));line-height:1.55;color:#e2d4b6}
#survPrep .sc h3{font-size:calc(21px*var(--kt));color:#f0d89a;letter-spacing:calc(2px*var(--k))}
#survPrep .sc .rq{font-size:calc(15px*var(--kt));font-weight:700}
#survPrep .tg span{font-size:calc(14px*var(--kt))}
#survPrep .em2,#survPrep .lkh{color:#a8977a}#survPrep .lkh{font-size:calc(15px*var(--kt))}
#survPrep .cbb{font-size:calc(16px*var(--kt));letter-spacing:calc(1px*var(--k));color:#fff6e0;text-shadow:1px 0 0 #2a1608,-1px 0 0 #2a1608,0 1px 0 #2a1608,0 -1px 0 #2a1608}
#survPrep .ln,#survPrep .sm span{font-size:calc(16px*var(--kt));color:#e2d4b6}
/* 卡片详情：移上去（手机点卡片）浮出，放这一招自己的图标 */
#survPrep .sc{cursor:pointer}#survPrep .sc .tip{width:calc(300px*var(--k));top:calc(-10px*var(--k))}
#survPrep .tip .th{display:flex;gap:calc(12px*var(--k));align-items:center;margin-bottom:calc(6px*var(--k))}
#survPrep .sic{flex:none;width:calc(84px*var(--k));height:calc(84px*var(--k));background:#241e17 center/cover no-repeat;border:1px solid rgba(184,149,90,.6);box-shadow:0 0 0 2px rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;font:700 calc(48px*var(--kt)) Pixel12,sans-serif;font-style:normal}
#survPrep .tip .th h3{margin:0;font-size:calc(22px*var(--kt));color:#f0d89a;letter-spacing:calc(2px*var(--k))}#survPrep .tip .th p{margin:calc(2px*var(--k)) 0 0;font-size:calc(15px*var(--kt));font-weight:700}
#survPrep .tip .sp2{margin:calc(6px*var(--k)) 0 0;font-size:calc(14px*var(--kt));color:#a8977a}
#survPrep .sc.on{transform:none}
/* 线装秘籍（CSS 版，等 Gemini 书封到了换图） */
.bk{position:relative;width:calc(104px*var(--k,1));height:calc(138px*var(--k,1));box-sizing:border-box;border-radius:2px 4px 4px 2px;background-size:100% 100%;
  box-shadow:inset calc(16px*var(--k,1)) 0 0 rgba(0,0,0,.35),inset calc(17px*var(--k,1)) 0 0 var(--rc),inset 0 0 0 2px rgba(0,0,0,.45),inset 0 0 calc(18px*var(--k,1)) rgba(0,0,0,.55),3px 4px 8px rgba(0,0,0,.6)}
.bk.wy{background-color:#5e1d17;background-image:radial-gradient(ellipse at 60% 30%,rgba(255,200,160,.10),transparent 60%),repeating-linear-gradient(45deg,rgba(0,0,0,.06) 0 2px,transparent 2px 5px)}
.bk.xf{background-color:#17393a;background-image:radial-gradient(ellipse at 60% 30%,rgba(180,240,230,.10),transparent 60%),repeating-linear-gradient(45deg,rgba(0,0,0,.06) 0 2px,transparent 2px 5px)}
.bk::before{content:'';position:absolute;left:calc(5px*var(--k,1));top:12%;bottom:12%;width:calc(3px*var(--k,1));background:repeating-linear-gradient(180deg,#e8dcc0 0 3px,transparent 3px 22%)}
.bk::after{content:'';position:absolute;right:0;top:0;width:22%;height:16%;background:linear-gradient(225deg,var(--rc) 0 45%,transparent 46%);opacity:.85}
.bk em{position:absolute;left:28%;top:14%;width:44%;aspect-ratio:1;background:#e9dcbc center/88% no-repeat;border:1px solid rgba(0,0,0,.5);box-shadow:0 0 0 2px rgba(233,220,188,.25)}
.bk span{position:absolute;right:9%;top:13%;width:16%;min-height:44%;padding:3px 0;box-sizing:border-box;background:#efe4c8;color:#2a1a10;writing-mode:vertical-rl;font:700 calc(11px*var(--kt,1)) "Songti SC","Noto Serif SC",serif;letter-spacing:1px;display:flex;align-items:center;justify-content:center;overflow:hidden;box-shadow:0 0 0 1px rgba(0,0,0,.4)}
#survPick h3{border:1px solid rgba(184,149,90,.6)!important;border-image:none!important;background:#140f0b!important;color:#e6c98a!important}
/* 书封贴图：小窗 / 题签位置按原图量好的比例 */
.bk.im{background-color:transparent!important;background-size:100% 100%!important;box-shadow:none;height:calc(134px*var(--k,1));filter:drop-shadow(2px 4px 5px rgba(0,0,0,.6))}.bk.im::before,.bk.im::after{display:none}
.bk.im em{left:29.5%;top:20.3%;width:40.5%;height:31.7%;aspect-ratio:auto;background-color:transparent;background-size:92%;border:0;box-shadow:none;mix-blend-mode:multiply}
.bk.im span{left:73%;right:auto;top:21%;width:15.2%;height:46%;min-height:0;background:transparent;box-shadow:none;padding:0}
/* 11/14 用户的新书封（武/太极印 × 黄玄地天）：封面不再叠兵器图，名字写进题签；书带玉坠所以画布比书宽，按 240×274 */
.bk.im{width:calc(118px*var(--k,1));height:calc(135px*var(--k,1));background-position:0 0!important}.bk.im em{display:none}
.bk.im span{left:20.5%;top:23%;width:20%;height:35%;color:#3a2414;font-size:calc(11px*var(--kt,1));letter-spacing:0;overflow:hidden}
#survPrep .sc .ci .bk.im{width:calc(76px*var(--k));height:calc(87px*var(--k))}#survPrep .sc .ci .bk.im span{display:none}
#survPick .pkb{display:flex;justify-content:center;margin:4px 0}#survPick .pkb .bk{--k:.62}
@media (max-height:520px){#survPick .pkb .bk{--k:.46}}
/* 人物提醒：缩成右下角小框（不再放全身像），细线暗底 */
#survTut{right:1.2vw;bottom:calc(14vh + 40px);width:min(560px,44vw)}
#survTut .bx{border:1px solid rgba(184,149,90,.55);border-image:none;background:linear-gradient(180deg,rgba(20,17,14,.94),rgba(8,7,6,.95));box-shadow:inset 0 0 0 1px rgba(0,0,0,.7),0 calc(8px*var(--k)) calc(24px*var(--k)) rgba(0,0,0,.6);padding:calc(10px*var(--k)) calc(16px*var(--k))}
#survTut .nm{top:calc(-15px*var(--k));left:calc(12px*var(--k));padding:calc(1px*var(--k)) calc(14px*var(--k));border:1px solid rgba(184,149,90,.6);border-image:none;background:#140f0b;font-size:calc(17px*var(--kt));color:#e6c98a}
#survTut p{font-size:calc(17px*var(--kt));margin:calc(8px*var(--k)) 0 calc(2px*var(--k))}
#survTut>em{width:calc(96px*var(--k));border:1px solid rgba(184,149,90,.55);border-image:none;margin-left:-1px}
#survTut.big{left:auto;right:1.2vw;bottom:calc(80px*var(--k));width:min(560px,44vw);padding-left:0}#survTut.big .bx{min-height:0}#survTut .lh{display:block;left:0;bottom:0;width:auto;height:min(58vh,480px);aspect-ratio:481/552;background:left bottom/contain no-repeat;image-rendering:pixelated;filter:drop-shadow(0 0 14px rgba(0,0,0,.7));animation:biIn .45s cubic-bezier(.2,.9,.3,1.1) both}   /* 11/11 用户定 2：第一次进整备屏，刘备像素立绘站左下角讲解（比以前的全身像小，不挡中间面板） */@keyframes biIn{from{transform:translateX(-60%);opacity:0}}
body.prep-open #survTut:not(.big){bottom:calc(80px*var(--k));width:min(560px,44vw)}
@media (max-height:520px){#survTut,#survTut.big,body.prep-open #survTut:not(.big){width:min(470px,58vw);bottom:calc(24vh)}body.prep-open #survTut,body.prep-open #survTut.big{bottom:4px}}
`;
  // ---- 道具（11/11 用户定，照群侠幸存者：行商主要卖永久道具）----
  const ITEMS = {
    hufu: { n: '护身符', d: '体魄 +1，护身 +5%', at: [1, 0, 0, 0, 0, 0], huti: .05 },
    modao: { n: '磨刀石', d: '短兵 +1', at: [0, 1, 0, 0, 0, 0] },
    qiangying: { n: '红枪缨', d: '长兵 +1，暴击 +2%', at: [0, 0, 1, 0, 0, 0], crit: .02 },
    bangtui: { n: '绑腿', d: '身法 +1，移速 +3%', at: [0, 0, 0, 1, 0, 0], move: .03 },
    pingan: { n: '平安符', d: '运气 +1', at: [0, 0, 0, 0, 1, 0] },
    bingshu: { n: '兵书残卷', d: '悟性 +1', at: [0, 0, 0, 0, 0, 1] },
    jiuhulu: { n: '酒葫芦', d: '战后真气换血 +15%', tiao: .15 },
    huwan: { n: '铁护腕', d: '受到伤害 -4%', take: .04 },
    ganliang: { n: '干粮袋', d: '每打完一仗回复 6% 气血', after: .06 },
    chazhan: { n: '清茶盏', d: '真气回复 +25%', regen: .25 },
    yupei: { n: '玉佩', d: '暴击 +4%', crit: .04, q: 1 },
    yaoping: { n: '小药瓶', d: '立刻回复 40% 气血（用掉）', use: true },
  };
  const IT = k => (S.items || []).reduce((t, id) => t + ((ITEMS[id] && ITEMS[id][k]) || 0), 0);
  const itemAt = () => { const t = [0, 0, 0, 0, 0, 0, 0, 0, 0]; for (const id of S.items || []) if (ITEMS[id] && ITEMS[id].at) ITEMS[id].at.forEach((v, i) => t[i] += v); return t; };
  const itemOf = id => ({ kind: 'item', id, q: ITEMS[id].q || 0, name: ITEMS[id].n, desc: ITEMS[id].d, price: ITEMS[id].use ? 12 : 22 + (ITEMS[id].q || 0) * 12, sell: 8 });

  // ---- 掉落与货品 ----
  const SELL = [6, 12, 20, 30, 40];
  function itemFrom(o) { return o.kind === 'heal' ? null : Object.assign({}, o, { price: (o.kind === 'skill' ? 24 : 18) + (o.q || 0) * 15, sell: SELL[o.q || 0] }); }
  const ownedAll = () => S.slots.filter(Boolean).concat(S.gf.filter(Boolean), S.qg ? [S.qg] : [], S.owned || []);
  function rollLoot(nd) {   // 拾取：普通战斗 1 本（四成 2 本），精锐 2 本 + 1 件道具，敌将 3 本 + 1 件道具
    const n = (nd.type === 'boss' ? 3 : nd.type === 'elite' ? 2 : (Math.random() < .4 ? 2 : 1)) + (HAS('muniu') ? 1 : 0), out = [], seen = new Set(ownedAll());
    for (let i = 0; i < 6 && out.length < n; i++) for (const o of rewardOptions(i % 2 ? 'perk' : undefined)) { const it = itemFrom(o); const key = it && (it.k || it.id); if (it && !seen.has(key) && out.length < n) { seen.add(key); out.push(it); } }
    if (nd.type !== 'battle') { const ks = Object.keys(ITEMS).filter(k => !ITEMS[k].use); out.push(itemOf(ks[Math.random() * ks.length | 0])); }
    return out;
  }
  function rollShop(nd) {   // 行商：3 件道具 + 2 本秘籍（11/11 用户定 5 件），都能买，不能刷新；价格随层数涨（第 1 层 ×2，每 8 层再 +100%）
    const ks = Object.keys(ITEMS).sort(() => Math.random() - .5), out = ks.slice(0, 3).map(itemOf), seen = new Set(ownedAll().concat(S.loot.map(it => it.k || it.id)));
    let nb = 0; for (const o of rewardOptions(undefined).concat(rewardOptions('perk'), rewardOptions('skill'))) { const it = itemFrom(o); const key = it && (it.k || it.id); if (it && !seen.has(key) && nb < 2) { seen.add(key); out.push(it); nb++; } }
    const m = 2 * (1 + ((nd && nd.layer || 1) - 1) / 12); for (const it of out) it.price = Math.round(it.price * m * (HAS('muniu') ? .85 : 1));   // 11/11 用户定：整体 ×2，平均每关只买得起三件里的两件左右
    if (S.shopLock) { const L = S.shopLock; S.shopLock = null; const k = L.k || L.id; const j = out.findIndex(o => (o.k || o.id) === k); out.splice(j >= 0 ? j : 0, 1, Object.assign({}, L, { kept: 1 })); }   // 上一关锁定的货：原价留到这一关（只留一关）
    return out.sort((a, b) => (a.kind === 'item') - (b.kind === 'item') || (b.q || 0) - (a.q || 0));   // 秘籍在前，道具在后
  }
  function learn(it) {   // 格子满了也能学：先放进「掌握武学」，在武学页换上
    S.owned = S.owned || [];
    if (it.kind === 'skill') { const f = S.slots.indexOf(''); if (f >= 0) S.slots[f] = it.k; else S.owned.push(it.k); tut('learn'); window.CODEX && CODEX.see('sk:' + it.k); }
    else if (it.kind === 'gf') { if (GF[it.id].qg) { if (!S.qg) S.qg = it.id; else S.owned.push(it.id); } else { const f = S.gf.indexOf(''); if (f >= 0) S.gf[f] = it.id; else S.owned.push(it.id); } GM = gfCalc(); }
    else if (it.kind === 'item') { if (ITEMS[it.id].use) heal(maxHp() * .4); else (S.items = S.items || []).push(it.id); GM = gfCalc(); }
    return true;
  }

  // ---- 整备屏（1:1 照群侠幸存者：结算 / 拾取 / 修炼 / 行商 / 武学）----
  let prepLastTab = '', prepNd = null, prepTab = 'jie', selLoot = 0, selWu = null, selShop = 0;
  const TABS = [['jie', '结算'], ['shi', '拾取'], ['xiu', '修炼'], ['shang', '行商'], ['wu', '武学']];
  const A = n => `art/ui/attr/${n}.webp`, PU = n => `art/ui/prep/${n}.webp`;
  const ATI = ['bili', 'daojian', 'qiang', 'jiao', 'yun', 'wuxing', 'gong', 'fu', 'neili'];   // 11/14 用户的新属性图标（运气等新福缘图）
  const ATD = ['提高气血，受到的伤害按比例减少', '提高刀、锤、剑、拳等短兵武艺伤害', '提高枪、关刀等长兵武艺伤害', '提高移动速度', '提高暴击率，修炼更容易出好品阶', '武艺、心法熟练度和修为涨得更快', '提高石子、弓等射艺武艺伤害', '提高黄符、羽扇等术法武艺伤害', '提高真气上限和真气回复速度'];
  const icoOf = it => it.kind === 'item' ? `art/ui/item/${it.id}.webp` : iconUrl(it.kind, it.k || it.id) || '';
  const RQ = ['普通', '精良', '稀有', '绝世'], RQC = ['#e8e0d0', '#6fb8ff', '#c58cff', '#ffb347'];
  const rk = it => {   // 11/14 用户定：武艺/心法只写黄/玄/地/天阶（颜色同心法品阶色），道具才用普通/精良/稀有/绝世
    if (it.kind === 'skill') { const t = SK[it.k] && SK[it.k].tier || 0; return t ? { n: TIERN[t] + '阶', c: GTC[t - 1], i: t - 1 } : { n: '基础', c: GTC[0], i: 0 }; }
    if (it.kind === 'gf') { const t = GF[it.id].t || 0; return { n: GTN[t] + '阶', c: GTC[t], i: t }; }
    const q = Math.min(3, it.q || 0); return { n: RQ[q], c: RQC[q], i: q }; };
  const dsOf = it => (it.desc || '').replace(/^[黄玄地天]阶 · /, '');
  const skIco = it => it.kind === 'gf' ? `<em class="sic" style="background-image:url('art/ui/gf/${it.id}.webp')"></em>` : IMGU[it.k] ? `<em class="sic" style="background-image:url('${IMGU[it.k]}')"></em>` : `<em class="sic" style="color:${SK[it.k].color}">${SK[it.k].icon}</em>`;
  const tipOf = (it, right) => it.kind === 'item' || it.kind === 'heal' ? '' : `<div class="tip${right ? ' r' : ''}"><div class="th">${skIco(it)}<div><h3>${it.name}</h3><p style="color:${rk(it).c}">${rk(it).n}</p><div class="tg">${tagsOf(it).map(t => `<span>${t}</span>`).join('')}</div></div></div><h5>${it.kind === 'skill' ? '武艺效果' : '心法效果'}</h5><p class="ds">${dsOf(it)}</p>${it.kind === 'skill' ? `<p class="sp2">${spdTxt(SK[it.k])}</p>` : ''}</div>`;
  const tagsOf = it => it.kind === 'skill' ? ['武艺', '主动', WEPN[wepOf(it.k)]] : it.kind === 'gf' ? (GF[it.id].qg ? ['轻功', '被动'] : ['心法', '被动']) : ITEMS[it.id].use ? ['道具', '消耗'] : ['道具', '永久'];
  function prepOpen(nd) { { const t = document.getElementById('survTut'); if (t) t.remove(); tutQ = []; }   // 战斗里没看完的提醒不带进整备屏
    prepNd = nd; prepTab = 'jie'; prepLastTab = ''; selLoot = 0; selWu = null; selShop = 0; if (window.SFX) SFX.play('j_shop'); prepRender(); tut('prep'); }
  function prepClose() {
    for (const it of S.loot || []) S.money += it.sell;   // 没处理的战利品：按卖价自动换钱
    S.loot = []; const el = document.getElementById('survPrep'); if (el) el.remove(); document.body.classList.remove('prep-open'); { const t = document.getElementById('survTut'); if (t) t.remove(); tutQ = []; } W.pick = false; const nd = prepNd; prepNd = null; ROUTE.done(nd);
  }
  const bar = (lv, r, ic) => `<div class="pb">${ic ? `<em style="background-image:url('${ic}')"></em>` : ''}<div class="pbf"><u style="width:${Math.round(r * 100)}%"></u><b>LV. ${lv}</b><i>${(r * 100).toFixed(1)}%</i></div></div>`;
  const mastR = k => { const m = S.mast[k] || 0, l = lvOf(k); return l >= 10 ? 1 : Math.min(1, (m - MAST_T[l - 1]) / (MAST_T[l] - MAST_T[l - 1])); };
  const gfR = id => { const e = S.gfExp[id] || 0, l = gfLv(id); return l >= 3 ? 1 : Math.min(1, (e - (l === 1 ? 0 : GFTH[0])) / (GFTH[l - 1] - (l === 1 ? 0 : GFTH[0]))); };
  function attrBar() {   // 底部常驻属性栏
    const ai = attrInfo(origin, true), mh = maxHp(), cr = .05 + AFX.crit() + GM.crit + IT('crit');
    const col = (lab, ic, v, tip) => `<div class="ac"><span>${lab}</span><em style="background-image:url('${A(ic)}')"></em><b>${v}</b><div class="at">${tip}</div></div>`;   // 11/11 用户：移上去（手机点一下）有解释
    const T = (h, a, b) => `<h5>${h}</h5><p>${a}</p>${b ? `<p class="cur">${b}</p>` : ''}`;
    const need = XIU_NEED(S.lv);
    return `<div class="ab"><div class="md"><em style="background-image:url('${A('bag')}')"></em></div><div class="ar">${ai.map((r, i) => col(r[0], ATI[r[4]], r[1], T(r[0], ATD[r[4]] + '', '当前效果：' + r[2]))).join('')}<i class="sp"></i>`
      + col('气血', 'hp', Math.round(mh * 10), T('气血', '归零就倒下。打完一关不会自动回满，靠打完一关时剩下的真气换成气血，和道具回血。', `当前 ${Math.ceil(hero.hp * 10)} / ${Math.round(mh * 10)}`))
      + col('真气', 'zq', Math.round(zqMax() * 10), T('真气', '第二条血：挨打时先扣真气，替你挡掉三成伤害（护身）。打完一关，剩下的真气三成换成气血。战斗中会慢慢回复。', `当前 ${Math.round(S.zq * 10)} / ${Math.round(zqMax() * 10)}`))
      + col('暴击', 'crit', Math.round(cr * 100) + '%', T('暴击', '出手有几率打出暴击，造成加倍伤害。运气、道具和心法都能提高。', `当前会心几率 ${Math.round(cr * 100)}%`))
      + col('修为', 'xiu', 'LV' + S.lv, T('修为', '杀敌和过关都会涨修为，每升一级攒一次「修炼」机会，在整备屏「修炼」页三选一提升属性。', `LV${S.lv}${need ? '，本级进度 ' + Math.round(S.xiu / need * 100) + '%' : ''}，待修炼 ${S.bank || 0} 次`))
      + `</div><div class="md"><em style="background-image:url('${A('wuxue')}')"></em></div></div>`;
  }
  function vitals() {
    const mh = maxHp(), zr = Math.max(0, S.zq / zqMax()), hr = hero.hp / mh;
    return `<div class="vt"><div class="vb"><em class="md2" style="background-image:url(art/ui/hud2/md_zq.webp)"></em><div class="vf zq"><u style="width:${zr * 100}%"></u><b>${Math.round(S.zq * 10)} / ${Math.round(zqMax() * 10)}</b></div></div><div class="vb"><em class="md2" style="background-image:url(art/ui/hud2/md_hp.webp)"></em><div class="vf hp"><u style="width:${hr * 100}%"></u><b>${Math.ceil(hero.hp * 10)} / ${Math.round(mh * 10)}</b></div></div></div>`;
  }
  // 武艺/心法一律画成线装秘籍（11/11 用户定：一眼和道具分开）：武艺红封面、心法青封面，包角/书脊是品质色，封面小窗放图标，右边竖题签写名字
  const BOOK_IMG = { wy0: 'art/ui/book/wy0.webp', wy1: 'art/ui/book/wy1.webp', wy2: 'art/ui/book/wy2.webp', wy3: 'art/ui/book/wy3.webp', xf0: 'art/ui/book/xf0.webp', xf1: 'art/ui/book/xf1.webp', xf2: 'art/ui/book/xf2.webp', xf3: 'art/ui/book/xf3.webp' };   // 用户的 Gemini 书封（art/gemini/秘籍书封.png 按连通区域切）：武艺红 / 心法青 × 白蓝紫橙
  function bookOf(it) {
    if (it.kind === 'item' || it.kind === 'heal') return `<em class="ico" style="background-image:url('${icoOf(it)}')"></em>`;
    const t = it.kind === 'skill' ? 'wy' : 'xf', q = rk(it).i, im = BOOK_IMG[t + q];
    const sym = it.kind === 'skill' ? 'art/ui/attr/duan.webp' : GF[it.id] && GF[it.id].qg ? 'art/ui/attr/shen.webp' : 'art/ui/attr/tiaoxi.webp';   // 11/11 用户定 B：照群侠，书上不画各招的图，武艺统一画兵器（现在只开刀），心法画打坐，轻功画身法
    return `<div class="bk ${t}${im ? ' im' : ''}" style="--rc:${GTC[q]}${im ? `;background-image:url('${im}')` : ''}">${im ? '' : `<em style="background-image:url('${sym}')"></em>`}<span>${it.name}</span></div>`;
  }
  function card(it, i, mode, onI, btns, extra) {   // 一张竖卡：秘籍/道具图 + 名字 + 品质 + 按钮；鼠标移上去（手机点一下）浮出详情
    const r = rk(it), right = i >= 3;
    return `<div class="sc${extra || ''}" style="--rc:${r.c}"><div class="ch2"><div class="ci">${bookOf(it)}</div><div><h3>${it.name}</h3><p class="rq" style="color:${r.c}">${r.n}</p><div class="tg">${tagsOf(it).map(t => `<span>${t}</span>`).join('')}</div></div></div>
      <h5>${it.kind === 'item' ? '道具属性' : it.kind === 'skill' ? '武艺效果' : '心法效果'}</h5><p class="ds">${dsOf(it)}</p><div class="cb">${btns}</div>${tipOf(it, right)}</div>`;   // 11/11：照群侠，属性直接写在卡上，不用移上去看
  }
  function detail(it, btns) {
    if (!it) return '<p class="em2">选择一件战利品</p>';
    return `<div class="dt"><div class="dh"><em style="background-image:url('${icoOf(it)}')"></em><div><h3>${it.name}</h3><p style="color:${RQC[Math.min(3, it.q || 0)]}">${RQ[Math.min(3, it.q || 0)]}</p><div class="tg">${tagsOf(it).map(t => `<span>${t}</span>`).join('')}</div></div></div><h5>${it.kind === 'item' ? '道具属性' : it.kind === 'skill' ? '武艺效果' : '心法效果'}</h5><p class="ds">${it.desc}</p><div class="db">${btns}</div></div>`;
  }
  function prepRender() {
    let el = document.getElementById('survPrep');
    if (!el) { el = document.createElement('div'); el.id = 'survPrep'; document.body.appendChild(el); el.addEventListener('pointerdown', e => e.stopPropagation()); }
    setK(el); document.body.classList.add('prep-open');
    const R = S.rep || {};
    let body = '', left = '';
    if (prepTab === 'jie') {
      const tot = S.slots.filter(Boolean).reduce((t, k) => t + (S.dps[k] || 0), 0) || 1;
      const outs = S.slots.filter(Boolean).map(k => `<div class="pb"><em style="background-image:url('${IMGU[k] || ''}')"></em><div class="pbf"><u style="width:${(S.dps[k] || 0) / tot * 100}%"></u><b>${Math.round((S.dps[k] || 0) * 10)}</b><i>${((S.dps[k] || 0) / tot * 100).toFixed(1)}%</i></div></div>`).join('');
      body = `<div class="pn"><h4>总结</h4><div class="sm"><span><em style="background-image:url('${A('kill')}')"></em>斩敌</span><b>${R.kills}</b><span><em style="background-image:url('${A('coin')}')"></em>铜钱</span><b>${R.got + R.left}</b></div>${R.left ? `<p class="nt">地上没捡的钱袋，帮你收回了九成：+${R.left}</p>` : ''}
          ${R.bao && BAO[R.bao] ? `<h4>战利宝物</h4><p class="ln"><img src="${BAO[R.bao].image || `art/ui/bao/${R.bao}.webp`}" style="width:44px;height:44px;float:left;margin:0 8px 0 0"><b style="color:${BQC[BAO[R.bao].q]}">${BAO[R.bao].n}</b>　<span style="color:${BQC[BAO[R.bao].q]}">${BQN[BAO[R.bao].q]}</span><br>${BAO[R.bao].d}${BAO[R.bao].c ? `<br><span style="color:#ff8a7a">代价：${BAO[R.bao].c}</span>` : ''}</p>` : ''}
          <h4>输出统计</h4>${outs}
          <h4>真气回血</h4><p class="ln">剩余 <em style="background-image:url('${A('zq')}')"></em> 真气 <b class="c1">${R.zqLeft || 0}</b> 点</p><p class="ln">转换为 <b class="c2">${R.tiao}</b> 点 <em style="background-image:url('${A('hp')}')"></em> 气血</p><p class="ln"><em style="background-image:url('${A('huti')}')"></em> 护体 总共免除了 <b>${Math.round((S.hutiSum || 0) * 10)}</b> 点伤害</p></div>
        <div class="pn"><h4>修为</h4>${bar(S.lv, Math.min(1, S.xiu / XIU_NEED(S.lv)), A('xiu'))}<h4>武艺</h4>${S.slots.filter(Boolean).map(k => bar(lvOf(k), mastR(k), IMGU[k])).join('')}<h4>心法</h4>${S.gf.concat([S.qg]).filter(Boolean).map(id => bar(gfLv(id), gfR(id), `art/ui/gf/${id}.webp`)).join('') || '<p class="em2" style="padding:6px 0">还没有心法</p>'}<h4>宝物</h4>${(S.bao || []).map(k => `<p class="ln" style="display:flex;gap:6px;align-items:center" title="${BAO[k].d}${BAO[k].c ? '；代价：' + BAO[k].c : ''}"><img src="art/ui/bao/${k}.webp" style="width:30px;height:30px;flex:none"><b style="color:${BQC[BAO[k].q]};flex:none">${BAO[k].n}</b><span style="opacity:.8">${BAO[k].d}</span></p>`).join('') || '<p class="em2" style="padding:6px 0">还没有宝物</p>'}${(S.shang || []).length ? `<h4>伤势</h4>${S.shang.map(k => `<p class="ln" style="display:flex;gap:6px;align-items:center"><img src="art/ui/fx/sh_${k}.webp" style="height:30px;flex:none"><b style="color:#ff8a7a;flex:none">${SHANG[k].n}</b>　${SHANG[k].d}（营地休整可治）</p>`).join('')}` : ''}</div>`;
    } else if (prepTab === 'shi') {   // 11/11：照群侠，一排竖卡，移上去看详情；按钮直接在卡上
      const L = S.loot.slice().sort((a, b) => S.sortDn === false ? (a.q || 0) - (b.q || 0) : (b.q || 0) - (a.q || 0)); S.loot = L; selLoot = Math.min(selLoot, L.length - 1);
      body = `<div class="pn wide sw"><h4>战利品<button class="so" data-a="sort">稀有度 ${S.sortDn === false ? '▲' : '▼'}</button></h4><div class="srow">${L.map((it, i) => card(it, i, 'sel', selLoot, `<button class="cbb" data-a="learn" data-i="${i}">${it.kind === 'item' ? '收下' : '学会'}</button><button class="cbb" data-a="sell" data-i="${i}">卖 ${it.sell}<em style="background-image:url('${A('coin')}')"></em></button>`)).join('')}</div>${L.length ? '<p class="em2 lkh">没处理的战利品，出发时自动按卖价换成铜钱</p>' : '<p class="em2" style="margin-top:12%">暂无战利品</p>'}</div>`;
    } else if (prepTab === 'xiu') {
      if (!S.bank) body = `<div class="pn wide"><p class="em2">修为 LV.${S.lv} · 暂无修炼机会<br><small>斩敌、打完仗都会攒修为，每升一层得一次修炼</small></p></div>`;
      else { S.xopts = S.xopts || rollXiu(); body = S.xopts.map((o, j) => { const [a0, v0] = o.adds[0]; return `<div class="pn cd"><em class="bi" style="background-image:url('${A(ATI[a0])}')"></em><h3>${ATN[a0]}修炼</h3><p style="color:${RAR[o.q][1]}">${['普通', '精良', '稀有', '绝世'][o.q]}</p><i class="dv"></i>${o.adds.map(([a, v]) => `<p class="up"><b>+${v}</b> ${ATN[a]}</p>`).join('')}<p class="sd">${ATD[a0]}</p><button class="bb" data-a="xiu" data-i="${j}">修 炼</button></div>`; }).join('');
        left = `<button class="bb rf" data-a="xrr" ${S.xrr ? 'disabled' : ''}>刷新<span>${S.xrr ? 0 : 1}/1</span></button>`; }
    } else if (prepTab === 'shang') {   // 11/11：照群侠，5 件货一排排开，移上去看详情；购买、锁定在卡上
      const L = S.shop, bt = [].concat(S.bought ?? []);
      body = `<div class="pn wide sw"><h4>行商<small>可买多件 · 不刷新 · 越往后越贵</small></h4><div class="srow">${L.map((it, i) => { const sb = bt.includes(i);
        return card(it, i, 'ssel', selShop, sb ? '<button class="cbb" disabled>已买下</button>' : `<button class="cbb buy" data-a="buy" data-i="${i}" ${S.money < it.price ? 'disabled' : ''}><b>${it.price}</b><em style="background-image:url('${A('coin')}')"></em></button>`, (sb ? ' sold' : '') + (S.shopLock === it || it.kept ? ' lkd' : ''))
          .replace(/<\/div>$/, '') + (sb ? '<i class="lkb lki"></i>' : it.kept ? '<i class="lkb lki on" title="上一关锁定的货，原价保留">🔒</i>' : `<button class="lkb${S.shopLock === it ? ' on' : ''}" data-a="lock" data-i="${i}" title="锁定：这一关买不起就锁上，下一关原价还在（只留一关）">${S.shopLock === it ? '🔒' : '🔓'}</button>`) + '</div>'; }).join('')}</div>
        <p class="em2 lkh">买不起的货点下面的小锁锁定一件，下一关原价还在（只留一关）</p></div>`;
    } else if (prepTab === 'wu') {
      const all = S.slots.filter(Boolean).concat(S.gf.filter(Boolean), S.qg ? [S.qg] : [], S.owned || []);
      if (!selWu || !all.includes(selWu)) selWu = S.slots[0];
      const isSk = id => !!SK[id], on = id => S.slots.includes(id) || S.gf.includes(id) || S.qg === id;
      const ic = id => isSk(id) ? IMGU[id] || '' : `art/ui/gf/${id}.webp`;
      const chain = S.slots.map((k, i) => `${i ? `<i class="ar2"></i>` : ''}<div class="sl ${k === selWu ? 'on' : ''}" ${k ? `data-a="wsel" data-k="${k}"` : ''}><em style="background-image:url('${k ? ic(k) : A('e_wu')}')" class="${k ? '' : 'ghost'}"></em></div>`).join('');
      const gfs = S.gf.map(id => `<div class="sl ${id && id === selWu ? 'on' : ''}" ${id ? `data-a="wsel" data-k="${id}"` : ''}><em class="${id ? '' : 'ghost'}" style="background-image:url('${id ? ic(id) : A('e_xin')}')"></em></div>`).join('');
      const zt = S.slots.filter(Boolean).reduce((t, k) => t + SK[k].wu + SK[k].rc, 0);
      const wuDet = k => { const p = wuParts(k), pw = powParts(k), cur = lvOf(k);
        return `<div class="pw"><b>威力 ${pw.total}%</b>${pw.rows.map(([n, v]) => `<span>${n} <i class="${v >= 1 ? 'up' : 'dn'}">×${v.toFixed(2)}</i></span>`).join('')}</div>
        <h5>出招方式</h5><p class="ds">${p.shape}</p><p class="ds2">${spdTxt(SK[k])}</p><h5>特殊效果</h5><p class="ds">${p.state}</p>
        <h5>修炼效果</h5><div class="lvl">${p.lv.map(x => `<p class="${x.l <= cur ? 'on' : ''}"><em>LV${x.l}</em><span>${x.up}${x.sp ? `<br><b>${x.sp}</b>` : ''}</span></p>`).join('')}</div>`; };
      const sel = selWu, o = sel && (isSk(sel) ? SK[sel] : GF[sel]);
      const det = o ? `<div class="dt"><div class="dh"><em style="background-image:url('${ic(sel)}')"></em><div><h3>${isSk(sel) ? o.name : o.n}</h3><p>${isSk(sel) ? (o.tier ? TIERN[o.tier] + '阶' : '基础') : GTN[o.t] + '阶'}</p><div class="tg">${(isSk(sel) ? ['武艺', '主动', WEPN[wepOf(sel)]] : [o.qg ? '轻功' : '心法', '被动']).map(t => `<span>${t}</span>`).join('')}</div></div></div>${isSk(sel) ? bar(lvOf(sel), mastR(sel)) : bar(gfLv(sel), gfR(sel))}${isSk(sel) ? wuDet(sel) : `<h5>效果</h5><p class="ds">${o.d}</p>`}
        <div class="db">${on(sel) ? `<button data-a="woff">卸下</button>` : `<button data-a="won">上阵</button>`}${isSk(sel) && on(sel) ? `<button data-a="wl">◀ 提前</button><button data-a="wr">延后 ▶</button>` : ''}</div></div>` : '<p class="em2">选择一门武学</p>';
      body = `<div class="pn"><h4>上阵武艺<small>按顺序循环出手</small></h4><div class="ch">${chain}</div><div class="two"><div><h4>心法</h4><div class="rw">${gfs}</div></div><div><h4>轻功</h4><div class="rw"><div class="sl ${S.qg && S.qg === selWu ? 'on' : ''}" ${S.qg ? `data-a="wsel" data-k="${S.qg}"` : ''}><em class="${S.qg ? '' : 'ghost'}" style="background-image:url('${S.qg ? ic(S.qg) : A('e_qing')}')"></em></div></div></div></div><h4>周天信息</h4><p class="ln">一轮出手总时长 <b class="c1">${zt.toFixed(1)}</b> 秒　真气回复 <b class="c1">${((.005 + .004 * GM.hy) * (1 + IT('regen')) * 100).toFixed(1)}%</b>/秒</p></div>
        <div class="pn">${det}</div><div class="pn"><h4>掌握武学</h4><div class="gd">${Array.from({ length: Math.max(12, all.length) }, (_, i) => all[i] ? `<div class="sl ${all[i] === selWu ? 'on' : ''}" data-a="wsel" data-k="${all[i]}"><em style="background-image:url('${ic(all[i])}')"></em>${on(all[i]) ? '<i class="eq">装</i>' : ''}</div>` : '<div class="sl"></div>').join('')}</div><h4>道具</h4><div class="gd">${(S.items || []).map(id => `<div class="sl" title="${ITEMS[id].n}：${ITEMS[id].d}"><em style="background-image:url('art/ui/item/${id}.webp')"></em></div>`).join('') || '<p class="em2" style="padding:4px 0;font-size:13px">还没有道具</p>'}</div></div>`;
    }
    const badge = k => k === 'xiu' && S.bank ? `<i>${S.bank}</i>` : k === 'shi' && S.loot.length ? `<i>${S.loot.length}</i>` : '';
    el.innerHTML = `<div class="mo"><em style="background-image:url('${A('coin')}')"></em><b>${S.money}</b></div>
      <div class="tb">${TABS.map(([k, t]) => `<button data-t="${k}" class="${k === prepTab ? 'on' : ''}">${t}${badge(k)}</button>`).join('')}</div><i class="tl"></i>
      <div class="bd t-${prepTab}${prepTab !== prepLastTab ? ' an' : ''}">${body}</div>
      ${attrBar()}${vitals()}<div class="lf">${left}</div><button class="bb go">${prepTab === 'wu' ? '出 发' : '继 续'}</button>`;
    prepLastTab = prepTab;
    el.querySelectorAll('.ac').forEach(a => a.onclick = () => { const on = a.classList.contains('on'); el.querySelectorAll('.ac.on').forEach(x => x.classList.remove('on')); if (!on) a.classList.add('on'); });   // 手机：点属性看解释，再点收起
    el.querySelectorAll('.sc').forEach(c => c.onclick = () => { const on = c.classList.contains('on'); el.querySelectorAll('.sc.on').forEach(x => x.classList.remove('on')); if (!on && c.querySelector('.tip')) c.classList.add('on'); });   // 11/14：手机点卡片看详情（专属图标），再点收起；按钮自己拦截不触发
    el.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { prepTab = b.dataset.t; if (window.SFX) SFX.play('tick'); prepRender(); tut({ shi: 'loot', xiu: 'xiu', shang: 'shop', wu: 'wu' }[prepTab]); });
    el.querySelector('.go').onclick = () => { const i = TABS.findIndex(t => t[0] === prepTab); if (i < TABS.length - 1) { prepTab = TABS[i + 1][0]; prepRender(); tut({ shi: 'loot', xiu: 'xiu', shang: 'shop', wu: 'wu' }[prepTab]); } else prepClose(); };   // 照原作：继续 = 下一页，最后一页「出发」
    el.querySelectorAll('[data-a]').forEach(b => b.onclick = e => {
      e.preventDefault(); e.stopPropagation(); if (b.disabled) return; const a = b.dataset.a, i = +b.dataset.i, k = b.dataset.k;
      if (a === 'sel') selLoot = i;
      else if (a === 'ssel') selShop = i;
      else if (a === 'sort') { S.sortDn = S.sortDn === false; selLoot = 0; }
      else if (a === 'learn') { learn(S.loot[i]); S.loot.splice(i, 1); if (window.SFX) SFX.play('j_pick1'); }
      else if (a === 'sell') { S.money += S.loot[i].sell; S.loot.splice(i, 1); if (window.SFX) SFX.play('coin'); }
      else if (a === 'lock') { const it = S.shop[i]; S.shopLock = S.shopLock && S.shopLock === it ? null : it; if (window.SFX) SFX.play('j_pick0'); }
      else if (a === 'buy') { const it = S.shop[i]; if (S.money >= it.price) { S.money -= it.price; learn(it); S.bought = [].concat(S.bought ?? [], i); if (S.shopLock === it) S.shopLock = null; if (window.SFX) SFX.play('j_shop'); } }
      else if (a === 'xiu') { const o = S.xopts[i]; if (window.SFX) SFX.play('j_pick' + o.q); for (const [q, v] of o.adds) S.atAdd[q] += v; S.bank--; S.xopts = null; S.xrr = false; }
      else if (a === 'xrr') { S.xopts = null; S.xrr = true; }
      else if (a === 'wsel') selWu = k;
      else if (a === 'won') { const id = selWu; S.owned = (S.owned || []).filter(x => x !== id); if (SK[id]) { const f = S.slots.indexOf(''); if (f >= 0) S.slots[f] = id; else { S.owned.push(S.slots[4]); S.slots[4] = id; } } else if (GF[id].qg) { if (S.qg) S.owned.push(S.qg); S.qg = id; } else { const f = S.gf.indexOf(''); if (f >= 0) S.gf[f] = id; else { S.owned.push(S.gf[2]); S.gf[2] = id; } } GM = gfCalc(); }
      else if (a === 'woff') { const id = selWu; if (SK[id]) { if (S.slots.filter(Boolean).length <= 1) return; const j = S.slots.indexOf(id); S.slots.splice(j, 1); S.slots.push(''); } else if (S.qg === id) S.qg = ''; else S.gf[S.gf.indexOf(id)] = ''; (S.owned = S.owned || []).push(id); GM = gfCalc(); }
      else if (a === 'wl' || a === 'wr') { const j = S.slots.indexOf(selWu), t = a === 'wl' ? j - 1 : j + 1; if (t >= 0 && t < 5 && S.slots[t]) [S.slots[j], S.slots[t]] = [S.slots[t], S.slots[j]]; }
      prepRender();
    });
  }

  // ---- 刘关张轮流提醒（照原作：右下角弹出头像对话框，空格/点击继续；第一次进整备屏左边出半身立绘）----
  const NPC = { liu: ['刘备', 'art/ui/npc/liubei_face.webp'], guan: ['关羽', 'art/ui/npc/guanyu_face.webp'], zhang: ['张飞', 'art/ui/npc/zhangfei_face.webp'] };
  const TUT_KEY = 'szz-tut2', TUT = {
    start: ['liu', '贤弟，兵器自己会出手，你只管走位，别让贼兵围住。'],
    roll: ['guan', matchMedia('(pointer:coarse)').matches ? '被围了就点右下角翻滚，滚的时候刀枪不入。' : '被围了就按空格翻滚，滚的时候刀枪不入。'],
    zq: ['guan', '血条上面的蓝条是真气：挨打时替你挡下三成伤害，过半时出手更重。'],
    coin: ['zhang', '哈哈！这袋钱掉地上了，走过去捡！不捡的话，打完只能收回九成！'],
    catapult: ['guan', '远处那台投石车会一直往你这边砸。石头落地前地上有影子，躲开，再绕过去把它拆了！'],
    thief: ['zhang', '有个背麻袋的贼在偷地上的钱！快去砍他，打死了钱袋会破，连本带利吐出来！'],
    prep: ['liu', '打完一仗先歇口气。从「结算」看起，再去「拾取」「修炼」「行商」，最后在「武学」排好出手顺序。'],
    loot: ['zhang', '这些都是从贼兵身上扒下来的！用得上就学，用不上就卖给行商换钱！'],
    xiu: ['liu', '你在阵上攒下的修为，每升一层就能修炼一次，三选一，挑你最缺的。'],
    shop: ['zhang', '行商的货不能换，钱够就都买下！越往后走，东西越贵！'],
    wu: ['guan', '武艺最多同使五路，照你排好的顺序循环出手。学会的武学都在右边，随时可以换上。'],
    learn: ['guan', '学会了新武艺。去「武学」页看看出手顺序。'],
  };
  let tutSeen = {}; try { tutSeen = JSON.parse(localStorage.getItem(TUT_KEY) || '{}') || {}; } catch (e) {}
  let tutQ = [];
  function tut(k) {
    if (!RT.on || tutSeen[k] || !TUT[k]) return; try { if (localStorage.getItem('szz-skip-tut') === '1') return; } catch (e) {}   // 11/14 用户：可设置跳过指引 tutSeen[k] = 1; try { localStorage.setItem(TUT_KEY, JSON.stringify(tutSeen)); } catch (e) {}
    tutQ.push(k); if (!document.getElementById('survTut')) tutNext();
  }
  function tutNext() {
    const old = document.getElementById('survTut'); if (old) old.remove();
    const k = tutQ.shift(); if (!k) return;
    const [who, txt] = TUT[k], [nm, face] = NPC[who], big = k === 'prep';
    const d = document.createElement('div'); d.id = 'survTut'; if (big) d.className = 'big'; setK(d);
    d.innerHTML = (big ? `<div class="lh" style="background-image:url('art/ui/npc/liubei_lihui.webp')"></div>` : '') + `<div class="bx"><b class="nm">${nm}</b><p>${txt}</p><small>${document.getElementById('survPrep') ? '按 <b>空格键</b> 或点一下 继续' : '点一下关闭'}</small></div>${big ? '' : `<em style="background-image:url('${face}')"></em>`}`;
    const go = () => { removeEventListener('keydown', key, true); if (!d.parentNode) return; d.remove(); tutNext(); };
    let holdT = 0; const up = e => { if (e.code === 'Space') clearTimeout(holdT); };
    const key = e => { if (!document.getElementById('survPrep')) return;   // 战斗中空格是翻滚，不拿来关提醒（11/11 用户报冲突）
      if (e.code === 'Space' && !e.repeat) { clearTimeout(holdT); holdT = setTimeout(() => { tutQ = []; go(); }, 600); }   // 长按空格：跳过本段
      if (e.code === 'Space' && e.repeat) { e.preventDefault(); e.stopImmediatePropagation(); return; }
      if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); e.stopImmediatePropagation(); go(); } };
    d.onclick = go; addEventListener('keydown', key, true); addEventListener('keyup', up, true); document.body.appendChild(d);
    if (document.getElementById('survPrep')) { const sk = document.createElement('div'); sk.className = 'tskip'; sk.innerHTML = '长按 <b>空格键</b> 跳过本段'; d.appendChild(sk); }
    if (!document.getElementById('survPrep')) setTimeout(() => { if (d.parentNode && !document.getElementById('survPrep')) go(); }, 9000);   // 战斗中 9 秒自动收起
  }
  // ---------- 局内存档（11/11 用户定：回到长卷自动存；主界面「继续」读档） ----------
  const RUN_KEY = 'szz-run';
  const snap = () => ({ shopLock: S.shopLock || null, origin, slots: S.slots.slice(), held: S.held, mast: { ...S.mast }, gf: S.gf.slice(), qg: S.qg, gfExp: { ...S.gfExp }, xy: S.xy, rt: { dmg: RT.dmg, cd: RT.cd, move: RT.move, take: RT.take }, hp: hero ? hero.hp : null, lv: S.lv, xiu: S.xiu, bank: S.bank, atAdd: (S.atAdd || []).slice(), money: S.money || 0, items: (S.items || []).slice(), owned: (S.owned || []).slice() });
  function restore(o) {
    if (!o) return;
    if (ORIGINS[o.origin]) origin = o.origin;
    S.slots = o.slots || S.slots; S.held = o.held != null ? o.held : S.held; S.mast = o.mast || {}; S.gf = o.gf || ['', '', '']; S.qg = o.qg || ''; S.gfExp = o.gfExp || {}; S.xy = o.xy || 0;
    S.money = o.money || 0; S.coins = []; S.loot = []; S.shop = []; S.items = o.items || []; S.owned = o.owned || []; S.shopLock = o.shopLock || null;
    S.lv = o.lv || 1; S.xiu = o.xiu || 0; S.bank = o.bank || 0; S.atAdd = (o.atAdd || []).concat([0, 0, 0, 0, 0, 0, 0, 0, 0]).slice(0, 9);
    Object.assign(RT, o.rt || {}); GM = gfCalc(); S.zq = zqMax();
    if (hero && o.hp > 0) hero.hp = Math.min(o.hp, maxHp());
  }
  window.RUNSAVE = {
    save() { try { const route = ROUTE.snap(); if (route) localStorage.setItem(RUN_KEY, JSON.stringify({ v: 1, t: Date.now(), name: window.TITLE && TITLE.playerName ? TITLE.playerName() : '', route, surv: snap() })); } catch (e) {} },
    load() { try { const o = JSON.parse(localStorage.getItem(RUN_KEY) || 'null'); return o && o.v === 1 && o.route ? o : null; } catch (e) { return null; } },
    has() { return !!this.load(); },
    clear() { try { localStorage.removeItem(RUN_KEY); } catch (e) {} },
  };
  // ---------- 对外接口 ----------
  function forceBlade() { weapon = 'blade'; pendingWeapon = null; try { if (window.GEAR && GEAR.switch) GEAR.switch(); } catch (e) {} if (typeof ui === 'function') ui(); }
  function startRun() {
    S.lv = 1; S.shopLock = null; S.xiu = 0; S.bank = 0; S.atAdd = [0, 0, 0, 0, 0, 0, 0, 0, 0]; S.lvFx = 0; S.money = 0; S.coins = []; S.loot = []; S.shop = []; S.items = []; S.owned = []; S.bao = []; S.shang = []; S.hpMul = 1; S.weakN = 0; S.enemyHpK = 1; S.afterFight = null; S.hutiSum = 0; S.slots = [startSk() || 'hengsao', '', '', '', '']; S.held = wepOf(S.slots[0]) < 7 ? wepOf(S.slots[0]) : null; S.mast = {}; S.dps = {}; S.gf = ['', '', '']; S.qg = ''; S.gfExp = {}; S.xy = 0; S.lhjReady = false; S.lhjOn = false; GM = GM0(); S.zq = zqMax(); S.hp0 = hero.hp; S.combo = 0; S.lk = typeof kills === 'number' ? kills : 0; S.chain = 0; S.lastCat = -1; S.lastI = -9; W.pick = false; const old = document.getElementById('survPick'); if (old) old.remove();
    W.started = true; W.between = 0; S.wind = null; S.recov = null; S.later = []; S.qi = 0; bolts.length = 0; zones.length = 0; DKO.length = 0; S.cycles = 0; fx.length = 0;
    forceBlade();
    const vw = viewW(); arenaL = M.gates[0] + 10; lockR = arenaL + vw * 1.5; gateI = 0;
    hero.x = arenaL + vw * .5; cam.x = arenaL;
    if (window.ARENA) ARENA.start();   // 竞技场试玩：重设边界、镜头和出生点
    RT.on = !!(window.ROUTE && ROUTE.on()); RT.dmg = 1; RT.cd = 1; RT.move = 1; RT.take = 1; RT.node = null;
    if (RT.on) { W.started = false; ROUTE.start(); const r = window.__RESUME; if (r) { window.__RESUME = null; ROUTE.resume(r.route); restore(r.surv); } return; }
    startWave(1);
  }
  function tick(dt) {
    if (RT.on && RT.node && W.started && S.coins) { coinTick(dt); S.tutT = (S.tutT || 0) + dt; if (S.tutT > 1.5) tut('start'); if (S.tutT > 25) tut('zq'); if (zs.filter(z => !z.dead && Math.hypot(z.x - hero.x, z.y - hero.y) < 60).length >= 4) tut('roll'); }
    if (weapon !== 'blade') forceBlade();
    if (charging || atkHeldSince) cancelCharge();
    for (const z of zs) { if (z.stoneStunCd > 0) z.stoneStunCd -= dt; if (z.stunCd > 0) z.stunCd -= dt; if (z.survSlow > 0) z.survSlow -= dt; if (z.slT > 0) z.slT = Math.max(0, z.slT - dt);
      if (z.dead || z.air) continue;
      if (z.rout > 0 || z.conf > 0) {   // 11/13 溃散：掉头逃；混乱：乱走、误伤旁人
        z.stun = Math.max(z.stun || 0, .06); const sp = (z.T.spd || 60) * slowMove(z) * dt;
        if (z.rout > 0) { z.rout -= dt; const a = Math.atan2(z.y - hero.y, z.x - hero.x); moveEnt(z, Math.cos(a) * sp * 1.2, Math.sin(a) * sp * .6); z.f = Math.sign(z.x - hero.x) || 1; }
        else { z.conf -= dt; if (!z.cdir || Math.random() < dt * 1.5) z.cdir = Math.random() * 7; moveEnt(z, Math.cos(z.cdir) * sp, Math.sin(z.cdir) * sp * .5); z.f = Math.cos(z.cdir) > 0 ? 1 : -1;
          if ((z.cbit = (z.cbit || 0) - dt) <= 0) { z.cbit = .6; const o = alive().find(q => q !== z && !q.air && Math.hypot(q.x - z.x, q.y - z.y) < 46); if (o) { CM = 1; CK = ''; HT(o, .5, 20, Math.sign(o.x - z.x) || 1); } } }
        z.moving = true; }
      if (S.windT > 0 && !tough(z)) moveEnt(z, Math.cos(S.windA) * 70 * dt, 0); }
    if (S.windT > 0) S.windT -= dt;
    skillTick(dt); daoTick(dt); baoTick(dt); bossTick(dt);
    for (const e of fx) e.t += dt;
    for (const b of bolts) {
      CM = b.cm || 1; CK = b.ck || ''; b.t += dt;
      if (b.home) { let t = null, bd = 260; for (const z of hittable()) { if (b.hitSet.includes(z)) continue; const d = Math.hypot(z.x - b.x, (z.y - b.y) * 2); if (d < bd) { bd = d; t = z; } }
        if (t) { const sp = Math.hypot(b.vx, b.vy * 2) || 200, ta = Math.atan2((t.y - b.y) * 2, t.x - b.x); let da = ta - b.a; while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2; b.a += Math.max(-5 * dt, Math.min(5 * dt, da)); b.vx = Math.cos(b.a) * sp; b.vy = Math.sin(b.a) * sp / 2; } }
      if (b.ret && !b.back && b.t > b.T / 2) { b.back = 1; b.vx = -b.vx; b.vy = -b.vy; b.a += Math.PI; b.hitSet = []; }
      b.x += b.vx * dt; b.y += b.vy * dt;
      if (!b.nohit && (b.y < M.top - 4 || b.y > M.bot + 4)) b.t = b.T;
      if (!b.nohit) for (const z of hittable()) if (!b.hitSet.includes(z) && Math.abs(z.x - b.x) < (b.big ? 22 : 16) && Math.abs(z.y - b.y) < 16) { b.hitSet.push(z); if (b.big) { b.t = b.T; fx.push({ k: 'burst', x: b.x, y: b.y, r: 40, t: 0, T: .4, col: '242,201,76' }); for (const z2 of near(b.x, b.y, 40)) if (z2 !== z) HT(z2, b.dmg * .6, 30); } const f0 = freeze; rec((b.dmg || 1.8) * DM() * VUL(z)); hit(z, (b.dmg || 1.8) * DM() * VUL(z), 40, Math.sign(b.vx) || hero.f, false, 0, .3, false, false, { secondary: true, survSkill: true }); freeze = Math.min(freeze, Math.max(f0, .03)); if (b.onHit) b.onHit(z, b); if (b.multi && b.hitSet.length >= b.multi) b.t = b.T; }
      if (b.t >= b.T && b.onEnd && !b.ended) { b.ended = 1; b.onEnd(b); }
    }
    CM = 1; CK = '';
    for (const zn of zones) {
      CM = zn.cm || 1; CK = zn.ck || ''; zn.t += dt; if (zn.follow) { zn.x = hero.x; zn.y = hero.y; }
      if (zn.vx || zn.vy) { zn.x += (zn.vx || 0) * dt; zn.y = clampY(zn.y + (zn.vy || 0) * dt); if (zn.trailFire && (zn.ft = (zn.ft || 0) - dt) <= 0) { zn.ft = .15; zones.push({ x: zn.x + R(-40, 40), y: zn.y + R(-15, 15), r: 30, t: 0, T: 3, tk: 0, dmg: .5, kind: 'fire', cm: zn.cm, ck: zn.ck }); } }
      if (zn.pull) for (const z of near(zn.x, zn.y, zn.r * 1.4)) { if (tough(z)) continue; const k = Math.min(1, zn.pull * dt); z.x += (zn.x - z.x) * k; z.y += (zn.y - z.y) * k; }
      if (zn.push) { const sp = Math.hypot(zn.vx || 0, zn.vy || 0) || 1; for (const z of near(zn.x, zn.y, zn.r)) if (!tough(z)) { z.x += zn.vx * dt * .9; z.y = clampY(z.y + zn.vy * dt * .9); if (zn.routs) rout(z, 2); } }
      if (zn.cage) for (const z of alive()) { const dx = z.x - zn.x, dy = (z.y - zn.y) * 2, d = Math.hypot(dx, dy), R0 = zn.r * (zn.cm ? 1 : 1); if (d < R0 * 1.25 && d > R0 * .9) { z.x = zn.x + dx / d * R0 * .88; z.y = zn.y + dy / d * R0 * .44; } }
      if ((zn.tk -= dt) <= 0) { zn.tk = .35;
        if (zn.kind === 'thunder') { zn.tk = .3; const c = near(zn.x, zn.y, zn.r * RM), z = c[Math.floor(Math.random() * c.length)], a = Math.random() * 7, rr = Math.random() * zn.r * RM, x = z ? z.x : zn.x + Math.cos(a) * rr, y = z ? z.y : zn.y + Math.sin(a) * rr * .5; fx.push({ k: 'bolt', x, y, t: 0, T: .3 }); blast(x, y, 22, zn.dmg, 20, '220,230,255'); continue; }
        if (zn.kind === 'orbit') { zn.tk = .12; const N = zn.n || 3; for (let i = 0; i < N; i++) { const a = zn.t * 5 + i * Math.PI * 2 / N, x = zn.x + Math.cos(a) * zn.r, y = zn.y + Math.sin(a) * zn.r * .5; for (const z of near(x, y, 16)) { if ((z.orbT || 0) > zn.t) continue; z.orbT = zn.t + .4; HT(z, zn.dmg, 20); if (zn.zap) fx.push({ k: 'bolt', x: z.x, y: z.y, t: 0, T: .25 }); } } continue; }
        if (zn.kind === 'pit' || zn.kind === 'frost' || zn.kind === 'swords' || zn.slow) for (const z of near(zn.x, zn.y, zn.r)) z.survSlow = zn.kind === 'frost' ? 1 : .6;
        if (zn.kind === 'trail') { for (const z of near(zn.x, zn.y, zn.r)) z.survSlow = .6; } else for (const z of near(zn.x, zn.y, zn.r)) HT(z, zn.dmg, zn.kind === 'wheel' ? 25 : 4, Math.sign(z.x - zn.x) || hero.f, .02); }
    }
    CM = 1; CK = '';
    for (let i = zones.length - 1; i >= 0; i--) if (zones[i].t >= zones[i].T) zones.splice(i, 1);
    for (let i = bolts.length - 1; i >= 0; i--) if (bolts[i].t >= bolts[i].T) bolts.splice(i, 1);
    for (let i = fx.length - 1; i >= 0; i--) if (fx[i].t > fx[i].T) fx.splice(i, 1);
  }
  const BIMG = { f: new Image(), n: new Image() }; BIMG.f.src = 'art/ui/prep/pbar.webp'; BIMG.n.src = 'art/ui/prep/btn.webp';
  function bar3(img, cap, x, y, w, h) {   // 横向三段拉伸：两头按高度等比，中间拉长
    const H = img.naturalHeight, W2 = img.naturalWidth, c = Math.min(w / 2, cap * h / H);
    ctx.drawImage(img, 0, 0, cap, H, x, y, c, h); ctx.drawImage(img, cap, 0, W2 - cap * 2, H, x + c, y, w - c * 2, h); ctx.drawImage(img, W2 - cap, 0, cap, H, x + w - c, y, c, h);
  }
  function drawWorld() {
    if (S.wind?.hammerLock) {
      const { key, hammerLock: { q } } = S.wind;
      const scale = DK * rsOf(key), r = ({ kaishan: 70, zhichui: 85, pocheng: 90 })[key];
      ctx.save(); ctx.translate(q.x, clampY(q.y)); ctx.scale(1, .5);
      ctx.strokeStyle = 'rgba(218,161,89,.65)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(0, 0, r * scale, 0, 7); ctx.stroke();
      ctx.restore();
    }
    for (const z of zs) if (z.drumT > 0 && !z.dead) { ctx.save(); ctx.translate(z.x, z.y); ctx.scale(1, YS); ctx.fillStyle = `rgba(255,70,40,${.18 + .1 * Math.sin(gameT * 12)})`; ctx.beginPath(); ctx.arc(0, 0, 16, 0, 7); ctx.fill(); ctx.restore(); }   /* 被战鼓鼓舞 */
    teleDraw();
    // 敌将气焰（11/11）：脚下一圈黄巾土红光 + 身上往上窜的火苗，人堆里一眼认出来
    if (RT.on) for (const z of zs) if (z.survBoss && !z.dead && z.endFade == null) {
      const t = performance.now() / 1000, sc = z.sc || 1, pr = .5 + .5 * Math.sin(t * (z.rage ? 9 : 4) + z.x);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.translate(z.x, z.y); ctx.scale(1, .42);
      const g = ctx.createRadialGradient(0, 0, 4, 0, 0, 34 * sc); g.addColorStop(0, `rgba(255,170,60,${.35 + .2 * pr})`); g.addColorStop(.6, `rgba(220,70,30,${.18 + .1 * pr})`); g.addColorStop(1, 'rgba(160,30,10,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 34 * sc, 0, 7); ctx.fill();
      ctx.strokeStyle = `rgba(255,190,90,${.35 + .3 * pr})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, (24 + 4 * pr) * sc, 0, 7); ctx.stroke();
      ctx.setTransform(ctx.getTransform().scale(1, 1 / .42));
      for (let k = 0; k < 7; k++) {   // 火苗：从脚边往上飘
        const ph = (t * .9 + k / 7 + (z.x % 1)) % 1, ax = Math.sin(k * 2.3 + t * 2) * 13 * sc, ay = -ph * 58 * sc, rr = (4.5 - 3 * ph) * sc;
        ctx.fillStyle = `rgba(255,${140 + 80 * (1 - ph) | 0},60,${.5 * (1 - ph)})`; ctx.beginPath(); ctx.ellipse(ax, ay, rr * .7, rr * 1.5, 0, 0, 7); ctx.fill();
      }
      ctx.restore();
    }
    if (RT.on && S.coins && S.coins.length) coinDraw();
    // 前摇：脚下画出这一招将要覆盖的范围，越接近出手越亮
    if (S.wind && !S.wind.k.none) {
      const k = S.wind.k, p = S.wind.t / S.wind.dur, a = aim(), q = k.dk ? rsOf(S.wind.key) * DLV.sz[lvOf(S.wind.key) - 1] : 1;
      ctx.save(); ctx.translate(hero.x, hero.y); ctx.scale(q, .5 * q);
      ctx.fillStyle = `rgba(255,200,120,${.08 + .18 * p})`; ctx.strokeStyle = `rgba(255,220,150,${.3 + .5 * p})`; ctx.lineWidth = 1.5;
      if (k.beam) { ctx.rotate(a); ctx.fillRect(8, -14, (k.len || 180) * p, 28); ctx.strokeRect(8, -14, (k.len || 180) * p, 28); }   // 刀波：前方一条直线
      else if (k.ring) { ctx.beginPath(); ctx.arc(0, 0, k.range * (.4 + .6 * p), 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }   // 震地：脚下一整圈
      else { ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, k.range * (.4 + .6 * p), a - k.half, a + k.half); ctx.closePath(); ctx.fill(); ctx.stroke(); }
      ctx.restore();
    }
    for (const b of bolts) {   // 月牙刀波；石子、黄符、豆兵另画
      const p = b.t / b.T, al = 1 - p * p;
      if (b.img && DGI[b.img] && DGI[b.img].complete && DGI[b.img].naturalWidth) {   // 11/14：刀招的飞行物用刀光图（偃月斩刀气、万刃归宗飞刃、飞轮刃刀轮暂代）
        const im = DGI[b.img], w = b.iw, h = w * im.naturalHeight / im.naturalWidth; ctx.save(); ctx.translate(b.x, b.y - 16); ctx.rotate(b.spin ? b.t * 14 : Math.atan2(b.vy * 2, b.vx)); if (b.spin) ctx.scale(1, .55); ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = Math.min(1, al + .4); ctx.globalCompositeOperation = 'source-over'; ctx.drawImage(dgTint(b.img, b.tc), -w / 2, -h / 2, w, h); ctx.drawImage(dgTint(b.img, b.tc), -w / 2, -h / 2, w, h); ctx.globalAlpha *= .3; ctx.globalCompositeOperation = 'screen'; ctx.drawImage(im, -w / 2, -h / 2, w, h); ctx.restore(); continue; }
      if (b.stone) {
        const r = (3 + b.tier * .45) * b.stone;
        ctx.save(); ctx.translate(b.x, b.y - 16); ctx.rotate(Math.atan2(Math.sin(b.a) / 2, Math.cos(b.a)));
        ctx.strokeStyle = b.tier >= 3 ? 'rgba(239,177,90,.55)' : 'rgba(206,190,156,.36)';
        ctx.lineWidth = r; ctx.beginPath(); ctx.moveTo(-r * (b.tier >= 3 ? 4 : 2), 0); ctx.lineTo(0, 0); ctx.stroke();
        ctx.fillStyle = '#6e5037'; ctx.beginPath(); ctx.ellipse(0, 0, r, r * .73, b.t * 8, 0, 7); ctx.fill();
        ctx.fillStyle = b.tier >= 3 ? '#f1cf8b' : '#dac8a2';
        ctx.beginPath(); ctx.ellipse(-r * .25, -r * .22, r * .53, r * .32, -.45, 0, 7); ctx.fill();
        ctx.restore(); continue;
      }
      if (b.shape || b.col === STN || b.col === FUC || b.big) {
        ctx.save(); ctx.translate(b.x, b.y - 16); ctx.globalAlpha = Math.min(1, al + .3); ctx.strokeStyle = 'rgba(40,30,20,.95)'; ctx.lineWidth = 1.5;
        if (b.big) { ctx.fillStyle = '#f2c94c'; ctx.beginPath(); ctx.arc(0, 0, 8, 0, 7); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#fff4c8'; ctx.beginPath(); ctx.arc(-2, -3, 3, 0, 7); ctx.fill(); }
        else if (b.shape === 'arrow' || b.shape === 'sword') { ctx.rotate(Math.atan2(b.vy * 2, b.vx)); const L = b.shape === 'sword' ? 18 : 14; ctx.strokeStyle = `rgb(${b.col[0]})`; ctx.lineWidth = b.shape === 'sword' ? 3 : 2; ctx.beginPath(); ctx.moveTo(-L, 0); ctx.lineTo(L - 4, 0); ctx.stroke(); ctx.fillStyle = `rgb(${b.col[1]})`; ctx.beginPath(); ctx.moveTo(L + 2, 0); ctx.lineTo(L - 5, -3); ctx.lineTo(L - 5, 3); ctx.closePath(); ctx.fill(); if (b.shape === 'sword') { ctx.fillStyle = '#d8b050'; ctx.fillRect(-L, -4, 3, 8); } }
        else if (b.shape === 'feather') { ctx.rotate(Math.atan2(b.vy * 2, b.vx)); ctx.fillStyle = '#ff8a40'; ctx.beginPath(); ctx.ellipse(0, 0, 10, 3.5, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#ffe0a0'; ctx.fillRect(-8, -1, 14, 2); }
        else if (b.shape === 'firefly' || b.shape === 'ember') { const g = ctx.createRadialGradient(0, 0, 1, 0, 0, 9); g.addColorStop(0, `rgba(${b.col[1]},1)`); g.addColorStop(1, `rgba(${b.col[0]},0)`); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 9, 0, 7); ctx.fill(); }
        else if (b.shape === 'hammer') { ctx.rotate(b.t * 14); ctx.fillStyle = '#7a5030'; ctx.fillRect(-2, 0, 4, 14); ctx.fillStyle = '#b07840'; ctx.beginPath(); ctx.ellipse(0, -2, 9, 7, 0, 0, 7); ctx.fill(); ctx.stroke(); }
        else if (b.shape === 'fist') { ctx.fillStyle = `rgba(${b.col[0]},.8)`; ctx.beginPath(); ctx.arc(0, 0, 9, 0, 7); ctx.fill(); ctx.strokeStyle = `rgba(${b.col[1]},.9)`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(-6, 0, 12, -1, 1); ctx.stroke(); }
        else if (b.shape === 'wheel') { ctx.scale(1, .5); ctx.rotate(b.t * 12); ctx.strokeStyle = `rgba(${b.col[1]},.95)`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, 11, 0, 4.5); ctx.stroke(); ctx.strokeStyle = `rgba(${b.col[0]},.6)`; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(0, 0, 11, 4.6, 6.2); ctx.stroke(); }
        else if (b.col === FUC) { ctx.rotate(b.a + Math.sin(b.t * 20) * .3); ctx.fillStyle = '#ffd65a'; ctx.fillRect(-7, -4, 14, 8); ctx.strokeRect(-7, -4, 14, 8); ctx.fillStyle = '#c0392b'; ctx.fillRect(-4, -1, 8, 2); }
        else { ctx.fillStyle = '#bdb6a6'; ctx.beginPath(); ctx.arc(0, 0, 4.5, 0, 7); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#ece6d8'; ctx.beginPath(); ctx.arc(-1.5, -1.5, 1.6, 0, 7); ctx.fill(); }
        ctx.restore(); continue;
      }
      ctx.save(); ctx.translate(b.x, b.y - 14); ctx.scale(b.big2 ? 1.8 : 1, b.big2 ? .9 : .5); ctx.rotate(b.a);
      ctx.strokeStyle = `rgba(${(b.col || ['160,225,255'])[0]},${.5 * al})`; ctx.lineWidth = 9; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(-10, 0, 26, -1.1, 1.1); ctx.stroke();
      ctx.strokeStyle = `rgba(${(b.col || [0, '240,252,255'])[1]},${.95 * al})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(-8, 0, 26, -1.0, 1.0); ctx.stroke();
      ctx.restore();
    }
    for (const zn of zones) {
      const al = Math.min(1, (zn.T - zn.t) / .4, zn.t / .15 + .2);
      ctx.save(); ctx.translate(zn.x, zn.y); ctx.scale(1, .5); ctx.globalAlpha = al;
      if (zn.kind === 'wave') { const a = Math.atan2(zn.vy || 0, zn.vx || 1); ctx.rotate(a); ctx.strokeStyle = `rgba(${zn.col || '120,190,255'},.85)`; ctx.lineWidth = 6; ctx.lineCap = 'round'; for (let i = 0; i < 3; i++) { ctx.globalAlpha = al * (1 - i * .28); ctx.beginPath(); ctx.arc(-i * 14, 0, zn.r, -1.1, 1.1); ctx.stroke(); } ctx.restore(); continue; }
      if (zn.kind === 'frost') { ctx.fillStyle = 'rgba(200,235,255,.35)'; ctx.beginPath(); ctx.arc(0, 0, zn.r, 0, 7); ctx.fill(); ctx.strokeStyle = 'rgba(240,250,255,.8)'; ctx.lineWidth = 1.5; for (let i = 0; i < 6; i++) { const a = i * 1.05 + zn.t; ctx.beginPath(); ctx.moveTo(Math.cos(a) * zn.r * .2, Math.sin(a) * zn.r * .2); ctx.lineTo(Math.cos(a) * zn.r * .8, Math.sin(a) * zn.r * .8); ctx.stroke(); } ctx.restore(); continue; }
      if (zn.kind === 'wind') { ctx.strokeStyle = 'rgba(220,245,255,.75)'; ctx.lineWidth = 2.5; for (let i = 0; i < 5; i++) { const a = zn.t * 8 + i * 1.26, rr = zn.r * (.3 + i * .15); ctx.beginPath(); ctx.arc(0, -i * 16, rr, a, a + 2.2); ctx.stroke(); } ctx.restore(); continue; }
      if (zn.kind === 'bagua') { ctx.rotate(zn.t * 1.2); ctx.strokeStyle = 'rgba(255,240,170,.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, zn.r, 0, 7); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, zn.r * .55, 0, 7); ctx.stroke(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; ctx.beginPath(); ctx.moveTo(Math.cos(a) * zn.r * .6, Math.sin(a) * zn.r * .6); ctx.lineTo(Math.cos(a) * zn.r * .95, Math.sin(a) * zn.r * .95); ctx.stroke(); } ctx.restore(); continue; }
      if (zn.kind === 'swords') { ctx.restore(); for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3, x = zn.x + Math.cos(a) * zn.r * .85, y = zn.y + Math.sin(a) * zn.r * .42; ctx.globalAlpha = al; ctx.fillStyle = '#dfefff'; ctx.strokeStyle = 'rgba(30,40,60,.9)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 3, y - 26); ctx.lineTo(x, y - 32); ctx.lineTo(x + 3, y - 26); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#d8b050'; ctx.fillRect(x - 5, y - 28, 10, 3); ctx.globalAlpha = 1; } continue; }
      if (zn.kind === 'pit') { ctx.fillStyle = 'rgba(70,55,35,.55)'; ctx.beginPath(); ctx.arc(0, 0, zn.r, 0, 7); ctx.fill(); ctx.strokeStyle = 'rgba(160,140,100,.7)'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore(); continue; }
      if (zn.kind === 'thunder') { const rr = zn.r * (zn.cm ? 1 : 1); ctx.strokeStyle = `rgba(220,230,255,${.5 + .3 * Math.sin(zn.t * 12)})`; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(0, 0, rr, 0, 7); ctx.stroke(); ctx.strokeStyle = 'rgba(255,220,100,.6)'; ctx.lineWidth = 1.5; for (let i = 0; i < 8; i++) { const a = zn.t * 1.5 + i * Math.PI / 4; ctx.beginPath(); ctx.arc(Math.cos(a) * rr * .8, Math.sin(a) * rr * .8, 6, 0, 7); ctx.stroke(); } ctx.restore(); continue; }
      if (zn.kind === 'orbit') { ctx.restore(); const N = zn.n || 3; for (let i = 0; i < N; i++) { const a = zn.t * 5 + i * Math.PI * 2 / N, x = zn.x + Math.cos(a) * zn.r, y = zn.y + Math.sin(a) * zn.r * .5 - 18; ctx.globalAlpha = al; ctx.fillStyle = `rgb(${zn.col})`; ctx.strokeStyle = 'rgba(40,30,20,.9)'; ctx.lineWidth = 1.5; ctx.beginPath(); if (zn.zap) ctx.rect(x - 4, y - 7, 8, 14); else if (zn.sword) { ctx.moveTo(x - 9, y); ctx.lineTo(x + 9, y - 2); ctx.lineTo(x + 9, y + 2); ctx.closePath(); } else ctx.arc(x, y, 6, 0, 7); ctx.fill(); ctx.stroke(); ctx.globalAlpha = 1; } continue; }
      if (zn.kind === 'fire') {
        const g = ctx.createRadialGradient(0, 0, 2, 0, 0, zn.r); g.addColorStop(0, 'rgba(255,200,60,.6)'); g.addColorStop(1, 'rgba(220,60,20,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, zn.r * 1.1, 0, 7); ctx.fill();
        for (let i = 0; i < 7; i++) { const a = i * .9 + Math.sin(zn.t * 3 + i), rr = zn.r * .6 * (((i * 37) % 10) / 10 + .2), h = 14 + 10 * Math.abs(Math.sin(zn.t * 9 + i * 2)); ctx.fillStyle = i % 2 ? '#ff9a3c' : '#ffd25a'; ctx.beginPath(); ctx.ellipse(Math.cos(a) * rr, Math.sin(a) * rr, 4, h, 0, 0, 7); ctx.fill(); }
      } else {
        ctx.strokeStyle = 'rgba(200,230,255,.8)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
        for (let i = 0; i < 4; i++) { const a = zn.t * 9 + i * Math.PI / 2; ctx.beginPath(); ctx.arc(0, 0, zn.r, a, a + .9); ctx.stroke(); }
        ctx.strokeStyle = 'rgba(200,230,255,.25)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(0, 0, zn.r, 0, 7); ctx.stroke();
      }
      ctx.restore();
    }
    dStatusDraw();
    for (const e of fx) {
      const p = e.t / e.T;
      if (e.k === 'drop') { const q = Math.min(1, p), y = e.y - 260 * (1 - q * q), x = e.x; ctx.save(); ctx.globalAlpha = .95; ctx.strokeStyle = 'rgba(20,20,30,.9)'; ctx.lineWidth = 2;
        if (e.what === 'sword') { ctx.fillStyle = '#eef6ff'; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 9, y - 80); ctx.lineTo(x, y - 96); ctx.lineTo(x + 9, y - 80); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#d8b050'; ctx.fillRect(x - 18, y - 100, 36, 8); ctx.fillRect(x - 4, y - 124, 8, 24); }
        else if (e.what === 'hammer') { ctx.fillStyle = '#7a5030'; ctx.fillRect(x - 4, y - 120, 8, 80); ctx.fillStyle = '#c08048'; ctx.beginPath(); ctx.ellipse(x, y - 30, 36, 30, 0, 0, 7); ctx.fill(); ctx.stroke(); }
        else if (e.what === 'arrow') { ctx.strokeStyle = '#fff0c0'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(x, y - 110); ctx.lineTo(x, y); ctx.stroke(); ctx.fillStyle = '#ff9a50'; ctx.beginPath(); ctx.moveTo(x, y + 6); ctx.lineTo(x - 10, y - 14); ctx.lineTo(x + 10, y - 14); ctx.closePath(); ctx.fill(); }
        else if (e.what === 'rock') { ctx.fillStyle = '#8a7a60'; ctx.beginPath(); ctx.arc(x, y - 20, 22, 0, 7); ctx.fill(); ctx.stroke(); ctx.fillStyle = 'rgba(255,140,60,.8)'; ctx.beginPath(); ctx.arc(x, y - 40, 16, 0, 7); ctx.fill(); }
        else if (e.what === 'palm') { ctx.fillStyle = 'rgba(255,210,100,.75)'; ctx.beginPath(); ctx.ellipse(x, y - 20, 50, 34, 0, 0, 7); ctx.fill(); for (let i = -2; i <= 2; i++) ctx.fillRect(x + i * 18 - 6, y - 80, 12, 40); }
        ctx.restore(); continue; }
      if (e.k === 'bowFall') {
        ctx.save(); ctx.translate(e.x, e.y);
        ctx.strokeStyle = 'rgba(236,188,113,' + (.45 + p * .35) + ')';
        ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(0, 0, e.r, e.r * .5, 0, 0, 7); ctx.stroke();
        ctx.strokeStyle = '#f2d39b'; ctx.lineWidth = 2;
        for (let i = 0; i < e.arrows; i++) {
          const a = i * 2.39996, spread = i ? e.r * .58 : 0, h = (1 - p * p) * (75 + i * 5);
          const x = Math.cos(a) * spread, y = Math.sin(a) * spread / 2;
          ctx.beginPath(); ctx.moveTo(x - 12, y - h - 32); ctx.lineTo(x, y - h); ctx.stroke();
        }
        ctx.restore(); continue;
      }
      if (e.k === 'hammerArc') {
        ctx.save(); ctx.translate(e.x, e.y); ctx.scale(1, .5);
        ctx.strokeStyle = 'rgba(231,173,108,' + (.85 * (1 - p)) + ')';
        ctx.lineWidth = 7 * (1 - p) + 1;
        ctx.beginPath(); ctx.arc(0, 0, e.r * (.76 + .24 * p), e.a - e.half, e.a + e.half); ctx.stroke(); ctx.restore();
        continue;
      }
      if (e.k === 'hammerRing') {
        const r = e.r0 + (e.r - e.r0) * p;
        ctx.save(); ctx.translate(e.x, e.y); ctx.scale(1, .5);
        ctx.strokeStyle = 'rgba(230,161,84,' + (.85 - .55 * p) + ')';
        ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.stroke(); ctx.restore();
        continue;
      }
      if (e.k === 'stonefield' || e.k === 'stonefall') {
        ctx.save(); ctx.translate(e.x, e.y); ctx.scale(1, .5);
        ctx.fillStyle = e.k === 'stonefield' ? 'rgba(110,76,45,.28)' : 'rgba(213,141,61,.21)';
        ctx.strokeStyle = e.k === 'stonefield' ? 'rgba(211,172,109,.58)' : 'rgba(255,182,80,.78)';
        ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 0, e.r, 0, 7); ctx.fill(); ctx.stroke();
        if (e.k === 'stonefield') {
          for (let j = 0; j < 15; j++) {
            const a = j * 2.39996, r = e.r * Math.sqrt((j + .5) / 15);
            ctx.fillStyle = j % 2 ? '#9b7853' : '#c1a377';
            ctx.fillRect(Math.cos(a) * r, Math.sin(a) * r, 3, 4);
          }
        } else {
          const h = (1 - p * p) * 190, r = Math.max(8, e.r * .31);
          ctx.fillStyle = '#785237'; ctx.beginPath(); ctx.arc(0, -h, r, 0, 7); ctx.fill();
          ctx.fillStyle = '#d7a470'; ctx.beginPath(); ctx.arc(-r * .25, -h - r * .28, r * .58, 0, 7); ctx.fill();
        }
        ctx.restore(); continue;
      }
      if (e.k === 'burst') { ctx.save(); ctx.translate(e.x, e.y); ctx.scale(1, .5); const r = e.r * (.4 + .6 * Math.min(1, p * 2)); ctx.fillStyle = `rgba(${e.col},${.28 * (1 - p)})`; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill(); ctx.strokeStyle = `rgba(255,250,230,${.9 * (1 - p)})`; ctx.lineWidth = 4 * (1 - p) + 1; ctx.stroke(); ctx.restore(); }
      else if (e.k === 'mark') { ctx.save(); ctx.translate(e.x, e.y); ctx.scale(1, .5); ctx.strokeStyle = `rgba(255,90,60,${.3 + .4 * p})`; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(0, 0, e.r, 0, 7); ctx.stroke(); ctx.restore(); ctx.strokeStyle = 'rgba(233,220,176,.9)'; ctx.lineWidth = 2; for (let i = 0; i < 4; i++) { const ox = (i - 1.5) * e.r * .4, yy = e.y * 1 - (1 - p) * 120; ctx.beginPath(); ctx.moveTo(e.x + ox, yy - 20); ctx.lineTo(e.x + ox, yy); ctx.stroke(); } }
      else if (e.k === 'bolt') { ctx.save(); ctx.strokeStyle = `rgba(235,240,255,${1 - p})`; ctx.lineWidth = 4 * (1 - p) + 1; ctx.beginPath(); let x = e.x, y = e.y - 170; ctx.moveTo(x, y); for (let i = 0; i < 6; i++) { x = e.x + R(-10, 10) * (i < 5); y += (e.y - (e.y - 170)) / 6; ctx.lineTo(x, y); } ctx.stroke(); ctx.restore(); }
      else if (e.k === 'img') { const im = DGI[e.n]; if (im.complete && im.naturalWidth) { const q = Math.min(1, p); ctx.save(); ctx.globalCompositeOperation = 'screen';
        if (e.river) { const al = Math.min(1, q * 12) * (q > .9 ? (1 - q) * 10 : 1) * (.75 + .15 * Math.sin(e.t * 6)), h = e.w; ctx.translate(e.x, e.y); ctx.scale(1, .5); ctx.rotate(e.a); ctx.globalAlpha = al; ctx.globalCompositeOperation = 'source-over'; ctx.drawImage(dgTint(e.n, e.col), 0, -h / 2, e.L, h); ctx.drawImage(dgTint(e.n, e.col), 0, -h / 2, e.L, h); ctx.globalAlpha = al * .35; ctx.globalCompositeOperation = 'screen'; ctx.drawImage(im, 0, -h / 2, e.L, h); }
        else { const al = e.warn ? .35 + .55 * q : (q < .15 ? q / .15 : 1 - (q - .15) / .85), g = e.warn ? 1.2 - .2 * q : (e.g0 || 1) + (1 - (e.g0 || 1)) * q, w = e.w * g, h = w * im.naturalHeight / im.naturalWidth; ctx.translate(e.x, e.y); ctx.globalAlpha = al; ctx.globalCompositeOperation = 'source-over'; ctx.drawImage(dgTint(e.n, e.col), -w / 2, -h / 2, w, h); ctx.globalAlpha = al * .6; ctx.drawImage(dgTint(e.n, e.col), -w / 2, -h / 2, w, h); ctx.globalAlpha = al * .2; ctx.globalCompositeOperation = 'screen'; ctx.drawImage(im, -w / 2, -h / 2, w, h); }
        ctx.restore(); } }
      else if (e.k === 'dg') { const im = DGI[e.n]; if (im.complete && im.naturalWidth) { const q = Math.min(1, p), al = q < .15 ? q / .15 : 1 - (q - .15) / .85, w = e.w, h = w * im.naturalHeight / im.naturalWidth, sc = 1 + .08 * q;
        ctx.save(); ctx.translate(e.x, e.y); ctx.scale(e.f * sc, sc * e.sy); ctx.translate(-e.ax * w, -e.ay * h); ctx.globalCompositeOperation = 'screen';
        if (e.ghost) { ctx.globalAlpha = al * .3; ctx.globalCompositeOperation = 'source-over'; ctx.drawImage(dgTint(e.n, e.col), -w * .06, h * .03, w, h); }
        ctx.globalAlpha = al * e.al; ctx.globalCompositeOperation = 'source-over'; ctx.drawImage(dgTint(e.n, e.col), 0, 0, w, h); ctx.globalAlpha = Math.min(1, ctx.globalAlpha * .6); ctx.drawImage(dgTint(e.n, e.col), 0, 0, w, h); ctx.globalAlpha = al * e.al * e.wh; ctx.globalCompositeOperation = 'screen'; ctx.drawImage(im, 0, 0, w, h); ctx.restore(); } }
      else if (e.k === 'cut' && e.n && DGI[e.n].complete && DGI[e.n].naturalWidth) { const im = DGI[e.n], al = 1 - p * p, w = e.L * (e.n === 'dh2' ? 2.6 : 2.2), h = w * im.naturalHeight / im.naturalWidth; ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(e.n === 'dh2' ? 0 : e.a); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = al; ctx.globalCompositeOperation = 'source-over'; ctx.drawImage(dgTint(e.n, e.col), -w / 2, -h / 2, w, h); ctx.globalAlpha = al * .6; ctx.drawImage(dgTint(e.n, e.col), -w / 2, -h / 2, w, h); ctx.globalAlpha = al * .3; ctx.globalCompositeOperation = 'screen'; ctx.drawImage(im, -w / 2, -h / 2, w, h); ctx.restore(); }
      else if (e.k === 'cut') { ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(e.a); const g = Math.min(1, p * 5), L = e.L * g, al = 1 - p * p; ctx.lineCap = 'round'; ctx.strokeStyle = `rgba(${e.col},${.6 * al})`; ctx.lineWidth = 7 * (1 - p) + 2; ctx.beginPath(); ctx.moveTo(-L, 0); ctx.lineTo(L, 0); ctx.stroke(); ctx.strokeStyle = `rgba(255,255,255,${al})`; ctx.lineWidth = 2.5 * (1 - p) + .8; ctx.beginPath(); ctx.moveTo(-L, 0); ctx.lineTo(L, 0); ctx.stroke(); ctx.restore(); }
      else if (e.k === 'line') { ctx.save(); ctx.translate(e.x, e.y - 14); ctx.scale(1, .5); ctx.rotate(e.a); const k = Math.min(1, p * 4); ctx.lineCap = 'round'; ctx.strokeStyle = `rgba(${e.col},${.55 * (1 - p)})`; ctx.lineWidth = e.w * 1.6 * (1 - p) + 4; ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(10 + e.L * k, 0); ctx.stroke(); ctx.strokeStyle = `rgba(255,255,255,${.95 * (1 - p)})`; ctx.lineWidth = 3; ctx.stroke(); ctx.restore(); }
    }
    for (const e of fx) {
      if (e.k === 'bowFall' || e.k === 'hammerArc' || e.k === 'hammerRing' || e.k === 'stonefield' || e.k === 'stonefall' || e.k === 'burst' || e.k === 'mark' || e.k === 'bolt' || e.k === 'line' || e.k === 'drop' || e.k === 'cut' || e.k === 'dg' || e.k === 'img') continue;
      if (e.k === 'gd') { gdDraw(e); continue; }
      if (e.k === 'ghost') {   // 残影：半透明主角，带一道拖尾
        const q = Math.min(1, e.t / e.mt), x = e.x0 + (e.x1 - e.x0) * q, y = e.y0 + (e.y1 - e.y0) * q, al = .6 * (1 - Math.max(0, (e.t - e.mt) / (e.T - e.mt)));
        ctx.save(); ctx.strokeStyle = `rgba(200,225,255,${al * .5})`; ctx.lineWidth = 8; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(e.x0, e.y0 - 22); ctx.lineTo(x, y - 22); ctx.stroke(); ctx.restore();
        if (typeof drawChar === 'function') { ctx.save(); ctx.filter = 'brightness(1.6) saturate(.4)'; drawChar('hero', e.fr, x, y, e.flip, al, false, typeof HERO_SC === 'number' ? HERO_SC : 1); ctx.restore(); }
        continue;
      }
      if (e.k === 'ring') {   // 震地：地上一圈冲击波 + 裂纹
        const p = e.t / e.T, r = e.r * (.3 + .7 * Math.min(1, p * 2));
        ctx.save(); ctx.translate(e.x, e.y); ctx.scale(1, .5);
        ctx.fillStyle = `rgba(255,210,120,${.25 * (1 - p)})`; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = `rgba(255,230,160,${.9 * (1 - p)})`; ctx.lineWidth = 6 * (1 - p) + 2; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = `rgba(70,40,20,${.7 * (1 - p)})`; ctx.lineWidth = 2;
        for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + .3; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 8, Math.sin(a) * 8); ctx.lineTo(Math.cos(a + .15) * r * .55, Math.sin(a + .15) * r * .55); ctx.lineTo(Math.cos(a - .1) * r * .9, Math.sin(a - .1) * r * .9); ctx.stroke(); }
        ctx.restore(); continue;
      }
      const p = e.t / e.T, sp = Math.min(1, p * 2.4);
      ctx.save(); ctx.translate(e.x, e.y - 14); ctx.scale(1, .5); ctx.lineCap = 'round';
      const s0 = e.rev ? e.a0 + e.half : e.a0 - e.half, s1 = e.rev ? e.a0 + e.half - 2 * e.half * sp : e.a0 - e.half + 2 * e.half * sp;
      ctx.strokeStyle = e.color[0] + (.75 * (1 - p)) + ')'; ctx.lineWidth = 12 * (1 - p) + 3;
      ctx.beginPath(); ctx.arc(0, 0, e.r * .85, Math.min(s0, s1), Math.max(s0, s1)); ctx.stroke();
      ctx.strokeStyle = e.color[1] + (.9 * (1 - p)) + ')'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(0, 0, e.r, Math.min(s0, s1), Math.max(s0, s1)); ctx.stroke();
      ctx.restore();
    }
  }
  // HUD 美术（11/11 Gemini）：武艺图标、行标、空格、太极、血滴
  const HIMG = {}; const himg = (k, u) => { const i = new Image(); i.src = u; HIMG[k] = i; };
  himg('empty', 'art/ui/hud/empty.webp'); himg('waigong', 'art/ui/hud/waigong.webp'); himg('neigong', 'art/ui/hud/neigong.webp'); himg('qinggong', 'art/ui/hud/qinggong.webp');
  himg('taiji', 'art/ui/hud/taiji.webp'); himg('hourglass', 'art/ui/hud/hourglass.webp'); himg('blood', 'art/ui/hud/blood.webp');
  himg('daolun', 'art/ui/kaiju/sk_daolun.webp');
  'bar_gold bar_red bar_blue barframe timer money'.split(' ').forEach(k => himg('h2_' + k, 'art/ui/hud2/' + k + '.webp'));   // 11/14 用户的 HUD 美术：三色条纹理、修为条框、计时框、铜钱框
  const tex = (k, x, y, w, h) => { if (w <= 0) return false; const im = HIMG['h2_' + k]; if (!hok('h2_' + k)) return false; const sw = Math.min(im.naturalWidth, im.naturalWidth * w / (h * im.naturalWidth / im.naturalHeight)); ctx.drawImage(im, 0, 0, Math.max(1, sw), im.naturalHeight, x, y, w, h); return true; };   // 纹理条按高度缩放、从左往右截取，不拉花
  ['tuna','yangqi','tieyi','tayun','guanxing','taiping','hunyuan','gf00','gf01','gf02','gf03','gf30','gf31','gf32','gf33','qingshen','juqi','shixue','beishui','lhj','caoshang','xingyun','taxue','tiesha','yufeng'].forEach(id => himg('gf_' + id, 'art/ui/gf/' + id + '.webp'));
  const IMGU = { daolun: 'art/ui/kaiju/sk_daolun.webp' };
  'hengsao tuodao tiaozhan daobo lianzhan huima cuofeng feilunren liedihuan xuehe tianbeng wanren hengti pidao xiongshou xuanfengd daoqi handi zhanjiang guowu yanyue tuodaoji shuiyan qinglong shanfeng liuying huifeng longjuan mihun shuangxue lianying bazhen huoyu chibi dongfeng qimen huofu feifu dingshen zhangxin wulei yaoshu huangtian tianlei fuhuo sadou jiutian taiping qiang lansao lianci tiaoqiang lihua chong huimaq touqiang qianglin qijin bainiao longyin'.split(' ').forEach(k => { IMGU[k] = 'art/ui/skill/' + k + '.webp'; himg(k, IMGU[k]); });   // 11/14 用户的刀 12 招图标（每招一把不同的中国刀 + 招式特效）
  Object.assign(IMGU, {
    feishi: 'art/ui/skill/feishi.webp',
    sashi: 'art/ui/skill/sashi.webp',
    tiaoshi: 'art/ui/skill/tiaoshi.webp',
    zashi: 'art/ui/skill/zashi.webp',
    xuanshi: 'art/ui/skill/xuanshi.webp',
    shici: 'art/ui/skill/shici.webp',
    paoshi: 'art/ui/skill/paoshi.webp',
    gunshi: 'art/ui/skill/gunshi.webp',
    luanshi: 'art/ui/skill/luanshi.webp',
    raoshen: 'art/ui/skill/raoshen.webp',
    feihuang: 'art/ui/skill/feihuang.webp',
    luoshi: 'art/ui/skill/luoshi.webp',
  });
  Object.assign(IMGU, {
    zhidao: 'art/ui/skill/zhidao.webp',
    lunchui: 'art/ui/skill/lunchui.webp',
    zhendi: 'art/ui/skill/zhendi.webp',
    kaishan: 'art/ui/skill/kaishan.webp',
    tiaotian: 'art/ui/skill/tiaotian.webp',
    dizhen: 'art/ui/skill/dizhen.webp',
    xuanchui: 'art/ui/skill/xuanchui.webp',
    zhichui: 'art/ui/skill/zhichui.webp',
    wanjun: 'art/ui/skill/wanjun.webp',
    leiting: 'art/ui/skill/leiting.webp',
    pocheng: 'art/ui/skill/pocheng.webp',
    bengshan: 'art/ui/skill/bengshan.webp',
  });
  Object.assign(IMGU, {
    qishe: 'art/ui/skill/qishe.webp',
    lianzhu: 'art/ui/skill/lianzhu.webp',
    luoyue: 'art/ui/skill/luoyue.webp',
    zhuihun: 'art/ui/skill/zhuihun.webp',
    liannu: 'art/ui/skill/liannu.webp',
    xuanshe: 'art/ui/skill/xuanshe.webp',
    jianyu: 'art/ui/skill/jianyu.webp',
    dianguang: 'art/ui/skill/dianguang.webp',
    huoshi: 'art/ui/skill/huoshi.webp',
    luori: 'art/ui/skill/luori.webp',
    guanri: 'art/ui/skill/guanri.webp',
    wanjian: 'art/ui/skill/wanjian.webp',
  });
  for (const k of Object.keys(IMGU).filter(k => SK[k]?.stone || SK[k]?.hammer || SK[k]?.bow)) himg(k, IMGU[k]);
  const iconUrl = (kind, id) => kind === 'skill' ? IMGU[id] : kind === 'gf' && HIMG['gf_' + id] ? 'art/ui/gf/' + id + '.webp' : '';
  const hok = k => HIMG[k] && HIMG[k].complete && HIMG[k].naturalWidth;
  // 11/14 用户选 A：开打前的「军令」——（第三版：深色金边牌匾，和图鉴/整备一套）牌匾落下写本关名，点一下（或按任意键）「令」字大印砸下，竹简收起才开战；等待时战斗冻结
  let banHold = false, talkHold = false, talkIn = null;   // 11/14：首领台词期间冻结战斗
  setInterval(() => { if (!talkIn || !RT.on || banHold || document.getElementById('waveBan') || (window.ROUTE && ROUTE.shown())) return; const t = talkIn; talkIn = null; if (window.STORY && STORY.boss(t, 0, () => { talkHold = false; })) talkHold = true; }, 150);
  function waveBanner(title, sub) {
    const old = document.getElementById('waveBan'); if (old) old.remove();
    const d = document.createElement('div'); d.id = 'waveBan';
    d.innerHTML = '<div class="wb"><div class="jz"><div class="tx"><div class="t">' + title + '</div><div class="s">' + sub + '</div></div><b class="yin"></b></div></div><div class="hn">点击战斗</div>';
    if (window.SFX) SFX.play('j_banner');
    document.body.appendChild(d); banHold = true;
    let done = false;
    const go = () => {
      if (done) return; done = true; removeEventListener('keydown', key, true);
      d.classList.add('seal'); setTimeout(() => { if (window.SFX) SFX.play('j_seal'); shake = Math.max(shake, .3); }, 150);
      setTimeout(() => { d.classList.add('out'); banHold = false; }, 650); setTimeout(() => d.remove(), 1150);
    };
    const key = e => { if (d.isConnected && !e.repeat) { e.preventDefault(); e.stopPropagation(); go(); } };
    d.addEventListener('pointerdown', e => { e.preventDefault(); go(); });
    setTimeout(() => addEventListener('keydown', key, true), 350);
    if (window.TRIAL_ON) setTimeout(go, 700);   // 武学试炼不用等
  }
  function hud(HW) {
    hudT = performance.now(); buildUi();
    if (RT.on && RT.node && S.money != null) moneyHud();
    for (const id of ['bR', 'top']) { const e = document.getElementById(id); if (e && e.style.visibility) e.style.visibility = ''; }
    const HH = ctx.canvas.height / DPR, fine = !(window.matchMedia && matchMedia('(pointer:coarse)').matches), n = 5, sz = fine ? 44 : 38, sz0 = sz, gap = 6, w = n * sz + (n - 1) * gap;
    const lab = fine ? sz * .8 : 0, x0 = fine ? 16 + lab + 6 : (HW - w) / 2, y0 = fine ? HH - 16 - sz * 2 - 8 : (RT.on ? 60 : 44), labY = (fine ? 54 : y0 + sz + 4 + 26 + 18) + (RT.on ? 16 : 0);
    ctx.save();
    const slot = (x, y, k, cur, i, lbl, sz = sz0) => {
      const bk = i >= 0 && S.brk && S.brk[i] > 0 ? S.brk[i] : 0; if (bk) x += Math.sin(bk * 70) * 3 * (bk / .45);
      ctx.fillStyle = 'rgba(8,7,6,.78)'; ctx.fillRect(x, y, sz, sz);   // 11/11：照群侠，格子近黑底 + 细暗金边，不再铺颜色
      if (k) {
        if (i >= 0 && S.flash[i] > 0) { ctx.fillStyle = k.color; ctx.globalAlpha = .45; ctx.fillRect(x, y, sz, sz); ctx.globalAlpha = 1; }
        if (i >= 0 && S.wind && S.wind.i === i) { ctx.fillStyle = 'rgba(255,230,140,.45)'; ctx.fillRect(x, y + sz * (1 - S.wind.t / S.wind.dur), sz, sz * S.wind.t / S.wind.dur); }   // 前摇进度
        if (k.ik && hok(k.ik)) ctx.drawImage(HIMG[k.ik], x, y, sz, sz); else { ctx.font = 'bold 20px "PingFang SC",sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = k.color; ctx.fillText(k.icon, x + sz / 2, y + sz / 2 + 1); }
        if (!cur) { ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(x, y, sz, sz); }   // 没轮到的格子压暗
        { const t = lbl != null ? lbl : 'LV' + lvOf(S.slots[i]); if (t) { ctx.font = '900 ' + (sz > 30 ? 9 : 8) + 'px "Arial Black",Impact,sans-serif'; ctx.textAlign = 'right'; ctx.textBaseline = 'alphabetic'; ctx.lineWidth = 2.5; ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(8,6,4,.95)'; ctx.strokeText(t, x + sz - 2, y + sz - 2); ctx.fillStyle = '#e6d3a4'; ctx.fillText(t, x + sz - 2, y + sz - 2); ctx.textAlign = 'left'; } }
      } else if (hok('empty')) { ctx.fillStyle = '#0b0705'; ctx.fillRect(x, y, sz, sz); ctx.globalAlpha = .3; ctx.drawImage(HIMG.empty, x, y, sz, sz); ctx.globalAlpha = 1; }   // 空格压暗，和有图标的格子拉开 else { ctx.font = 'bold 18px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#4a3a2a'; ctx.fillText('+', x + sz / 2, y + sz / 2 + 1); }
      if (i >= 0 && S.skip[i] > 0) { ctx.fillStyle = 'rgba(160,160,170,.5)'; ctx.fillRect(x, y, sz, sz); }
      if (bk) { ctx.fillStyle = `rgba(120,120,125,${.6 * bk / .45})`; ctx.fillRect(x, y, sz, sz); ctx.strokeStyle = `rgba(230,230,235,${bk / .45})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + sz * .25, y + sz * .15); ctx.lineTo(x + sz * .55, y + sz * .5); ctx.lineTo(x + sz * .4, y + sz * .6); ctx.lineTo(x + sz * .75, y + sz * .88); ctx.stroke(); }   // 被打断：灰 + 一道裂纹
      if (!k) { ctx.strokeStyle = 'rgba(184,149,90,.28)'; ctx.lineWidth = 1; ctx.strokeRect(x + .5, y + .5, sz - 1, sz - 1); }
      else {   // 有东西的格子：细暗金边；轮到出手的那格换亮金边 + 柔光
        if (cur && i >= 0) { ctx.save(); ctx.shadowColor = 'rgba(255,220,150,.85)'; ctx.shadowBlur = 9; ctx.strokeStyle = '#ecd08e'; ctx.lineWidth = 1.5; ctx.strokeRect(x - .5, y - .5, sz + 1, sz + 1); ctx.restore(); }
        else { ctx.strokeStyle = 'rgba(184,149,90,.75)'; ctx.lineWidth = 1; ctx.strokeRect(x + .5, y + .5, sz - 1, sz - 1); }
      }
    };
    { const gx = x0 - 6 - (lab ? lab + 6 : 0), gw = w + 12 + (lab ? lab + 6 : 0), gh = fine ? sz * 2 + 8 + 12 : sz + 26 + 4 + 12, gg = ctx.createLinearGradient(gx, 0, gx + gw, 0); gg.addColorStop(0, 'rgba(6,5,4,.5)'); gg.addColorStop(1, 'rgba(6,5,4,0)'); ctx.fillStyle = gg; ctx.fillRect(gx, y0 - 6, gw, gh); }   // 11/11：去掉整块底板，只留一层往右淡出的暗影
    if (lab && hok('waigong')) { ctx.drawImage(HIMG.waigong, 16, y0 + (sz - lab) / 2, lab, lab); if (hok('neigong')) ctx.drawImage(HIMG.neigong, 16, y0 + sz + 8 + (sz - lab) / 2, lab, lab); }
    for (let i = 0; i < n; i++) { const kk = S.slots[i], o = SK[kk]; if (o && !o.ik && HIMG[kk]) o.ik = kk; slot(x0 + i * (sz + gap), y0, o, i === S.qi, i); }
    const gk = id => GF[id] ? { icon: GF[id].qg ? '轻' : GF[id].n[0], color: GTC[GF[id].t], ik: HIMG['gf_' + id] ? 'gf_' + id : '' } : null, sz2 = fine ? sz : 26, ry2 = y0 + sz + (fine ? 8 : 4);
    for (let i = 0; i < 3; i++) slot(x0 + i * (sz2 + gap), ry2, gk(S.gf[i]), true, -1, S.gf[i] ? 'LV' + gfLv(S.gf[i]) : '', sz2);   // 内功：主修 + 2 辅修
    slot(x0 + 3 * (sz2 + gap) + 8, ry2, gk(S.qg), true, -1, '', sz2);   // 轻功
    if (lab && hok('qinggong') && !S.qg) { ctx.globalAlpha = .28; ctx.drawImage(HIMG.qinggong, x0 + 3 * (sz2 + gap) + 8, ry2, sz2, sz2); ctx.globalAlpha = 1; }
    // 血条：屏幕底部正中（血量 ×10 显示成整数）
    const bw = fine ? Math.min(HW * .46, 520) : Math.min(HW * .44, 230), bh = fine ? 20 : 16, bx = (HW - bw) / 2, by = HH - (fine ? 18 : 12) - bh, mh = maxHp(), r = Math.max(0, Math.min(1, hero.hp / mh));
    // 11/11：气血/真气条换成金边花框（pbar 横向三段拉伸，框内深底正好是条的位置），掉血留橙色残影
    const frameBar = (y, h, rr, lag, c0, c1, c2) => {
      const fh = h * 1.8, s0 = fh / 54, fy = y - (fh - h) / 2;
      if (BIMG.f.complete && BIMG.f.naturalWidth) bar3(BIMG.f, 60, bx - 40 * s0, fy, bw + 80 * s0, fh); else { ctx.fillStyle = 'rgba(14,9,6,.85)'; ctx.fillRect(bx - 3, y - 3, bw + 6, h + 6); }
      if (lag > rr) { ctx.fillStyle = '#e88a3a'; ctx.fillRect(bx, y, bw * lag, h); }
      if (!tex(c0 === '#7ad0ff' ? 'bar_blue' : 'bar_red', bx, y, bw * rr, h)) { const gg = ctx.createLinearGradient(0, y, 0, y + h); gg.addColorStop(0, c0); gg.addColorStop(.5, c1); gg.addColorStop(1, c2); ctx.fillStyle = gg; ctx.fillRect(bx, y, bw * rr, h); ctx.fillStyle = 'rgba(255,255,255,.16)'; ctx.fillRect(bx, y, bw * rr, h * .35); }
      return 40 * s0;
    };
    S.hpLag = S.hpLag == null ? r : Math.max(r, S.hpLag - .4 / 60);
    const capW = frameBar(by, bh, r, S.hpLag, '#f05a44', '#c02a22', '#6c1210');
    ctx.font = '900 ' + (fine ? 13 : 11) + 'px "Arial Black",Impact,"PingFang SC",sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(20,8,6,.9)';
    if (hok('blood')) { const s2 = bh + 14; ctx.drawImage(HIMG.blood, bx - capW - s2 * .55, by + bh / 2 - s2 / 2, s2, s2); }
    const ht = Math.ceil(hero.hp * 10 - 1e-6) + ' / ' + Math.round(mh * 10); ctx.strokeText(ht, HW / 2, by + bh / 2 + 1); ctx.fillStyle = '#fff2d8'; ctx.fillText(ht, HW / 2, by + bh / 2 + 1);
    { const zh = fine ? 12 : 9, zy = by - (fine ? 15 : 13) - zh, zr = Math.max(0, Math.min(1, S.zq / zqMax()));   // 真气：蓝条叠在血条上方
      const capZ = frameBar(zy, zh, zr, 0, '#7ad0ff', '#2f86d8', '#164a8a');
      if (hok('taiji')) { const s3 = zh + 14; ctx.drawImage(HIMG.taiji, bx - capZ - s3 * .55, zy + zh / 2 - s3 / 2, s3, s3); }
      if (fine) { ctx.font = '900 10px "Arial Black",Impact,"PingFang SC",sans-serif'; ctx.textBaseline = 'middle'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(8,16,30,.9)'; const zt = '真气 ' + Math.round(S.zq * 10) + ' / ' + Math.round(zqMax() * 10); ctx.strokeText(zt, HW / 2, zy + zh / 2 + 1); ctx.fillStyle = '#e2f4ff'; ctx.fillText(zt, HW / 2, zy + zh / 2 + 1); } }
    // 右侧大字：击杀、连击
    const nf = fine ? 46 : 30, rx = HW - (fine ? 22 : 12), ry = HH * (fine ? .36 : .3);
    const big = (num, label, y, a) => { ctx.globalAlpha = a * .92; ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round'; ctx.font = '900 ' + nf + 'px "Arial Black",Impact,sans-serif'; ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(8,6,4,.85)'; ctx.strokeText(num, rx, y); ctx.fillStyle = '#efe4cc'; ctx.fillText(num, rx, y); ctx.font = 'bold ' + (fine ? 17 : 12) + 'px "Songti SC","STSong","Noto Serif SC",serif'; ctx.lineWidth = 4; ctx.strokeText(label, rx, y + nf * .7); ctx.fillStyle = '#b8955a'; ctx.fillText(label, rx, y + nf * .7); ctx.globalAlpha = 1; };   // 11/11：游戏数字字体 + 暗金小标签
    big(String(typeof kills === 'number' ? kills : 0), '击杀', ry, 1);
    if (S.combo > 1) { const pp = 1 + .3 * (S.cPop || 0); ctx.save(); ctx.translate(rx, ry + nf * 1.7); ctx.scale(pp, pp); ctx.translate(-rx, -(ry + nf * 1.7)); big(String(S.combo), '连击', ry + nf * 1.7, Math.min(1, S.comboT / .6)); ctx.restore(); }
    cmbDraw(HW, HH, fine, 1 / 60);
    // 修为条（11/11）：顶部正中，LV + 百分比；攒着的修炼次数写在右边
    if (RT.on && RT.node && S.atAdd) {
      const bw = Math.min(HW * .42, 460), bx = (HW - bw) / 2, by = 7, bh = 13, r = Math.min(1, S.xiu / XIU_NEED(S.lv));
      ctx.save();
      if (hok('h2_barframe')) { const im = HIMG.h2_barframe, fh = bh * 2.2, cap = 52 * fh / im.naturalHeight; ctx.drawImage(im, 0, 0, 52, im.naturalHeight, bx - cap * .62, by + bh / 2 - fh / 2, cap, fh); ctx.drawImage(im, 52, 0, im.naturalWidth - 104, im.naturalHeight, bx - cap * .62 + cap, by + bh / 2 - fh / 2, bw + cap * 1.24 - cap * 2, fh); ctx.drawImage(im, im.naturalWidth - 52, 0, 52, im.naturalHeight, bx + bw + cap * .62 - cap, by + bh / 2 - fh / 2, cap, fh); }   // 11/14：两头尖角的金边框
      else { ctx.fillStyle = 'rgba(14,9,6,.82)'; ctx.fillRect(bx - 3, by - 2, bw + 6, bh + 4); ctx.strokeStyle = '#b08a4a'; ctx.lineWidth = 1; ctx.strokeRect(bx - 2.5, by - 1.5, bw + 5, bh + 3); }
      if (!tex('bar_gold', bx, by + 1, bw * r, bh - 2)) { const gx = ctx.createLinearGradient(0, by, 0, by + bh); gx.addColorStop(0, '#ffe08a'); gx.addColorStop(1, '#b8801e'); ctx.fillStyle = gx; ctx.fillRect(bx, by, bw * r, bh); }
      if (S.lvFx > 0) { ctx.globalAlpha = Math.min(1, S.lvFx) * .6; ctx.fillStyle = '#fff6c8'; ctx.fillRect(bx, by, bw, bh); ctx.globalAlpha = 1; S.lvFx = Math.max(0, S.lvFx - 1 / 60); }
      ctx.font = 'bold 11px "PingFang SC",sans-serif'; ctx.textBaseline = 'middle'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(20,10,4,.95)'; ctx.fillStyle = '#fff2d0';
      ctx.textAlign = 'left'; ctx.strokeText('修为 LV.' + S.lv, bx + 6, by + bh / 2 + .5); ctx.fillText('修为 LV.' + S.lv, bx + 6, by + bh / 2 + .5);
      ctx.textAlign = 'right'; const pc = Math.floor(r * 100) + '%'; ctx.strokeText(pc, bx + bw - 6, by + bh / 2 + .5); ctx.fillText(pc, bx + bw - 6, by + bh / 2 + .5);
      if (S.bank > 0) { ctx.textAlign = 'left'; ctx.fillStyle = '#ffd86e'; const t = '待修炼 ×' + S.bank; ctx.strokeText(t, bx + bw + (fine ? 10 : 10), by + bh / 2 + .5); ctx.fillText(t, bx + bw + 10, by + bh / 2 + .5); }
      // 倒计时（11/11 用户：这关没有倒计时）：沙漏 + 分:秒。电脑放修为条正下方，手机放修为条左边（下面是武艺格）
      if (W.started && !W.pick) {
        const left = Math.max(0, Math.ceil(WT() - W.t)), tt = String(left / 60 | 0).padStart(2, '0') + ':' + String(left % 60).padStart(2, '0'), urg = left <= 10;
        const fs = fine ? 18 : 13, tx = fine ? HW / 2 : bx - (fine ? 0 : 44), ty = fine ? by + bh + 15 : by + bh / 2 + .5, ih = fs + 6;
        ctx.font = '900 ' + fs + 'px "Arial Black",Impact,sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; const tw = ctx.measureText(tt).width, x0 = tx - (tw + ih + 4) / 2;
        let tdone = false; if (hok('h2_timer')) { const im = HIMG.h2_timer, th = ih + 12, tw2 = th * im.naturalWidth / im.naturalHeight, tx2 = tx - tw2 / 2; ctx.drawImage(im, tx2, ty - th / 2, tw2, th); ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(14,8,4,.95)'; ctx.fillStyle = urg && (performance.now() / 300 | 0) % 2 ? '#ff6a4a' : '#f3e6c8'; ctx.textAlign = 'center'; const cx2 = tx2 + th * .62 + (tw2 - th * .62) / 2; ctx.strokeText(tt, cx2, ty + 1); ctx.fillText(tt, cx2, ty + 1); ctx.textAlign = 'left'; tdone = true; }   // 11/14：计时框（沙漏在框里）
        if (!tdone) { if (hok('hourglass')) ctx.drawImage(HIMG.hourglass, x0, ty - ih / 2, ih, ih);
        ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(14,8,4,.95)'; ctx.fillStyle = urg && (performance.now() / 300 | 0) % 2 ? '#ff6a4a' : '#f3e6c8';
        ctx.strokeText(tt, x0 + ih + 4, ty + 1); ctx.fillText(tt, x0 + ih + 4, ty + 1); }
      }
      ctx.restore();
    }
    // 敌将名牌血条（11/11 用户定，照群侠：屏幕上方正中，名字牌 + 宽红条 + 剩余血量；两个敌将上下叠，手机左右并排）
    let bosses = RT.on && RT.node ? zs.filter(z => z.survBoss && !z.dead && z.hp > 0 && z.endFade == null) : [];
    if (bosses.length < 2 && RT.on && RT.node) {   // 精英也挂名牌（淡一档），敌将优先，最多两条，挑离主角最近的
      const el = zs.filter(z => z.survTier === 1 && (z.T.elite || z.type === 'yellow-golem') && !z.survBoss && !z.dead && z.hp > 0 && z.endFade == null && !z.hidden).sort((a, b) => Math.hypot(a.x - hero.x, a.y - hero.y) - Math.hypot(b.x - hero.x, b.y - hero.y));
      bosses = bosses.concat(el.slice(0, 2 - bosses.length));
    }
    if (bosses.length) {   // 11/11 用户定：首领（第一档）最高最大；小头目 / 精锐小一号
      ctx.save();
      const big = bosses.filter(z => z.survTier >= 3).slice(0, 1), small = bosses.filter(z => !(z.survTier >= 3)).slice(0, 2), list = [];
      const BG = fine ? { bw: Math.min(HW * .46, 620), bh: 26, nh: 24, fn: 17, fh: 15 } : { bw: Math.min(HW * .42, 330), bh: 16, nh: 15, fn: 11, fh: 11 };
      const SM = fine ? { bw: Math.min(HW * .27, 320), bh: 15, nh: 17, fn: 12, fh: 11 } : { bw: big.length ? Math.min(HW * .17, 140) : Math.min(HW * .26, 200), bh: 11, nh: 13, fn: 9, fh: 9 };
      let y0 = fine ? 50 : 22;
      if (big.length) { list.push([big[0], BG, HW / 2, y0]); if (fine) y0 += BG.nh + BG.bh + 8; }
      small.forEach((z, i) => {
        const two = small.length > 1;
        let cx = HW / 2 + (two ? (i ? 1 : -1) * (SM.bw / 2 + 10) : 0);
        if (!fine && big.length) cx = HW / 2 + (i ? 1 : -1) * (BG.bw / 2 + SM.bw / 2 + 14);   // 手机：小头目挂在首领条左右两边，不往下压到武艺格
        list.push([z, SM, cx, y0 + (!fine && big.length ? BG.nh + BG.bh - SM.nh - SM.bh : 0)]);
      });
      for (const [z, D, cx, ny] of list) {
        const lite = !z.survBoss; if (z.maxHp == null) z.maxHp = z.hp;
        const { bw, bh, nh } = D, bx = cx - bw / 2, by = ny + nh - 3;
        const mx = z.maxHp || z.hp, r = Math.max(0, Math.min(1, z.hp / mx));
        z.hpLag = z.hpLag == null ? r : Math.max(r, z.hpLag - .5 / 60);   // 掉血后橙色残影慢慢追上
        if (BIMG.f.complete && BIMG.f.naturalWidth) bar3(BIMG.f, 60, bx, by, bw, bh); else { ctx.fillStyle = 'rgba(14,9,6,.85)'; ctx.fillRect(bx, by, bw, bh); }
        const s0 = bh / 54, ix = bx + 40 * s0, iw = bw - 80 * s0, iy = by + 13 * s0, ih = bh - 26 * s0;
        ctx.fillStyle = '#e88a3a'; ctx.fillRect(ix, iy, iw * z.hpLag, ih);
        if (!tex('bar_red', ix, iy, iw * r, ih)) { const g = ctx.createLinearGradient(0, iy, 0, iy + ih); g.addColorStop(0, '#f05a44'); g.addColorStop(.5, '#c02a22'); g.addColorStop(1, '#6c1210'); ctx.fillStyle = g; ctx.fillRect(ix, iy, iw * r, ih); ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(ix, iy, iw * r, ih * .35); }
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(20,6,4,.95)'; ctx.fillStyle = '#fff2d8';
        ctx.font = '900 ' + D.fh + 'px Arial Black,Impact,sans-serif'; const ht = String(Math.ceil(z.hp * 10)); ctx.strokeText(ht, cx, by + bh / 2 + .5); ctx.fillText(ht, cx, by + bh / 2 + .5);
        ctx.font = 'bold ' + D.fn + 'px "Songti SC","STSong","Noto Serif SC",serif'; const nm = (lite ? '精锐 · ' : '') + (z.bossLabel || z.T.name || '敌将'), nw = ctx.measureText(nm).width + D.fn * 2.6;
        if (BIMG.n.complete && BIMG.n.naturalWidth) bar3(BIMG.n, 40, cx - nw / 2, ny, nw, nh); else { ctx.fillStyle = 'rgba(30,18,10,.9)'; ctx.fillRect(cx - nw / 2, ny, nw, nh); }
        ctx.fillStyle = D === BG ? '#f3d08a' : '#d9cfb4'; ctx.strokeText(nm, cx, ny + nh / 2 + .5); ctx.fillText(nm, cx, ny + nh / 2 + .5);
      }
      ctx.globalAlpha = 1; ctx.restore(); ctx.restore(); return;   // 有敌将名牌时不再写节点名
    }
    // 波次与倒计时
    ctx.font = 'bold 14px "PingFang SC",sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#ffe9a0';
    const left = Math.max(0, Math.ceil(WT() - W.t));
    ctx.textBaseline = 'alphabetic';
    if (RT.on && !RT.node) { ctx.restore(); return; }   // 路线图还没选节点：不画波次文字
    ctx.fillText(W.retreat > 0 || W.between > 0 ? (RT.on ? '鸣金收兵' : `第 ${W.n}/${WAVES} 波 · 鸣金收兵`) : (RT.on ? ROUTE.name(RT.node) + (bossCount() ? ' · 敌将' : '') : `第 ${W.n}/${WAVES} 波 · 还剩 ${left} 秒${bossCount() ? ' · 敌将' : ''}`), HW / 2, labY);
    ctx.restore();
  }
  // 主角姿势：前摇举刀，出手和后摇用挥刀帧
  let poseFlipNow = false;
  function pose() { const f = pose0(); poseFlipNow = !!f && f.endsWith('~'); return poseFlipNow ? f.slice(0, -1) : f; }
  function pose0() {
    if (S.poseOverride) return S.poseOverride.f;
    if (S.recov) return S.recov.late && S.recov.t > S.recov.dur * .55 ? S.recov.late : S.recov.pose;
    if (S.wind && (hero.st !== 'walk' || S.wind.dur - S.wind.t < (S.wind.k.dk ? .32 : .16))) return S.wind.k.pose[0];   // 11/14：刀招举刀至少露 0.32 秒   // 边走边打时，出手前 0.16 秒也露一下起手帧
    return null;
  }
  const rooted = () => !!S.recov;
  // 隐藏普攻和换武器按钮
  const st = document.createElement('style'); st.textContent = '#bA,#bWeapon,#wp button[data-w]{display:none!important}'
    + '#waveBan{position:fixed;inset:0;z-index:10010;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;background:rgba(0,0,0,.38);overflow:hidden;cursor:pointer;transition:opacity .4s}#waveBan.out{opacity:0}'
    + '#waveBan .wb{position:relative;width:100%;display:flex;justify-content:center}'
    + '#waveBan .jz{position:relative;width:min(56vw,520px);aspect-ratio:1000/324;background:url(art/ui/hud/bian.webp) center/100% 100% no-repeat;filter:drop-shadow(0 12px 18px rgba(0,0,0,.75));animation:bianIn .5s cubic-bezier(.3,1.4,.5,1) both}#waveBan.out .jz{animation:bianOut .4s ease-in both}'
    + '#waveBan .tx{position:absolute;left:11%;right:11%;top:12%;bottom:12%;z-index:2;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px}'
    + '#waveBan .t{font:400 clamp(28px,4.6vw,48px) WenKai,MaShanZheng,"STKaiti",serif;letter-spacing:.18em;text-indent:.18em;line-height:1.2;background:linear-gradient(180deg,#fff0bf,#f0c86a 55%,#b88a3a);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 2px 0 #2a1608) drop-shadow(0 0 8px rgba(255,200,110,.25))}'
    + '#waveBan .s{display:flex;align-items:center;gap:.7em;font:400 clamp(12px,1.7vw,16px) WenKai,MaShanZheng,"STKaiti",serif;letter-spacing:.25em;text-indent:.25em;color:#c9a35e}#waveBan .s::before,#waveBan .s::after{content:"";width:clamp(18px,3.4vw,40px);height:1px;background:linear-gradient(90deg,transparent,#9a7638 30%,#c9a35e 70%,transparent)}'
    + '@keyframes bianIn{from{opacity:0;transform:translateY(-70px)}to{opacity:1;transform:none}}@keyframes bianOut{from{opacity:1;transform:none}to{opacity:0;transform:translateY(-80px)}}'
    + '#waveBan .yin{position:absolute;z-index:3;right:6%;bottom:2%;width:15%;aspect-ratio:1;width:17%;background:url(art/ui/hud/yin.webp) center/contain no-repeat;opacity:0;transform:rotate(-6deg) scale(2.6);filter:drop-shadow(0 2px 3px rgba(0,0,0,.6))}'
    + '#waveBan.seal .yin{animation:yinIn .18s .0s cubic-bezier(.5,0,.9,.4) forwards}'
    + '#waveBan .hn{font:400 clamp(16px,2.1vw,20px) WenKai,MaShanZheng,serif;letter-spacing:.5em;text-indent:.5em;color:#f0d89a;text-shadow:0 2px 4px #000;animation:hnB 1.2s .6s ease-in-out infinite both}#waveBan.seal .hn{visibility:hidden}'
    + '@keyframes jzOpen{from{clip-path:inset(0 50% 0 50%)}to{clip-path:inset(0 0 0 0)}}@keyframes jzClose{from{clip-path:inset(0 0 0 0)}to{clip-path:inset(0 50% 0 50%)}}@keyframes jzTx{from{opacity:0}}'
    + '@keyframes yinIn{0%{opacity:0;transform:rotate(-6deg) scale(2.6)}100%{opacity:.95;transform:rotate(-6deg) scale(1)}}@keyframes hnB{0%,100%{opacity:.35}50%{opacity:1}}'
    + '@media (pointer:fine){#joy{display:none!important}}'
    + '#bR{background:#241812 url(art/ui/hud/dodge.webp) center/cover no-repeat!important;border-radius:8px!important;border:1px solid #c9a24a!important;font-size:0!important;width:60px!important;height:60px!important}'
    + '@media (pointer:fine){#bR:after{content:"空格";position:absolute;left:0;right:0;bottom:-18px;font:700 12px "PingFang SC",sans-serif;color:#f3dc9a;text-shadow:0 1px 2px #000}}'
    + '#bPause{background:url(art/ui/hud2/pause.webp) top center/100% auto no-repeat!important;border:0!important;width:42px!important;height:72px!important;box-shadow:none!important}#bPause .pause-icon-bar{display:none!important}'
    + '#survPick button.q0,#survPick button.q1,#survPick button.q2,#survPick button.q3{background:center/100% 100% no-repeat!important;border:0!important;width:156px!important;min-height:236px;padding:22px 14px 18px!important;justify-content:flex-start;gap:4px;border-radius:0!important}'
    + '#survPick button.skip{display:inline-block!important;width:auto!important;min-height:0!important;padding:5px 22px!important;background:rgba(20,14,9,.92)!important;border:1px solid #8a6a32!important;color:#d8c49a!important;font:15px WenKai,serif!important;white-space:nowrap}#survPick button.skip:hover{border-color:#e2c27a!important;color:#fff0cc!important}'
    + '#survPick button small{min-height:3.1em;display:block;line-height:1.5;text-align:center}#survPick .row{align-items:stretch}'   // 11/14 用户：三张卡的名字、说明要横着对齐（从上往下排，说明留够两行）
    + '#survPick button.q0{background-image:url(art/ui/card/q0.webp)!important}#survPick button.q1{background-image:url(art/ui/card/q1.webp)!important}#survPick button.q2{background-image:url(art/ui/card/q2.webp)!important}#survPick button.q3{background-image:url(art/ui/card/q3.webp)!important}'
    + '#survPick button.q0:hover,#survPick button.q1:hover,#survPick button.q2:hover,#survPick button.q3:hover{transform:translateY(-4px);filter:brightness(1.15)}'
    + '#survPick em.ic{display:block;width:64px;height:64px;background:center/cover;border-radius:3px;box-shadow:0 0 0 1px rgba(216,176,96,.6);margin:4px 0}'
    + '@media (max-height:520px){#survPick button.q0,#survPick button.q1,#survPick button.q2,#survPick button.q3{width:130px!important;min-height:196px;padding:16px 10px 12px!important}#survPick em.ic{width:48px;height:48px}}'
    + '#survRep{position:fixed;left:14px;bottom:calc(120px + env(safe-area-inset-bottom));z-index:10011;display:flex;gap:12px;align-items:center;padding:8px 16px;background:linear-gradient(90deg,rgba(16,10,6,.92),rgba(16,10,6,.6));border-left:3px solid #d8b060;color:#f6e6c4;font:700 15px "PingFang SC",sans-serif;animation:repIn .35s ease-out;transition:opacity .5s;pointer-events:none}#survRep b{color:#ffd86e;font-family:"Songti SC","Noto Serif SC",serif;letter-spacing:.2em}#survRep.out{opacity:0}@keyframes repIn{from{transform:translateX(-30px);opacity:0}}'
    + PREP_CSS
    + '#survPick h3,#survPick button b,#survPick button span{font-family:WenKai,MaShanZheng,"STKaiti",serif!important;font-weight:400!important}#survPick button b{font-size:21px!important;letter-spacing:.06em}#survPick button span{font-size:15px!important;line-height:1.5}#survPick h3{font-size:24px!important;letter-spacing:.3em;color:#f0d89a!important}'   // 11/14 用户：三选一的字也换粗楷书
    + '#survPick{position:fixed;inset:0;z-index:10020;display:flex;align-items:center;justify-content:center;background:rgba(10,6,4,.6);font-family:"PingFang SC","Noto Sans CJK SC",sans-serif}'
    + '#survPick .p{position:relative;box-sizing:border-box;border:clamp(24px,5vh,40px) solid transparent;border-image:url(art/ui/prep/panel.webp) 90 fill stretch;padding:clamp(22px,4.5vh,40px) clamp(14px,2vw,26px) clamp(10px,2vh,20px);color:#f2e4c8;text-align:center;max-width:96vw}'
    + '#survPick h3{position:absolute;left:50%;top:clamp(-30px,-4.5vh,-18px);transform:translateX(-50%);margin:0;height:clamp(34px,6.5vh,48px);padding:0 clamp(24px,3vw,40px);display:flex;align-items:center;white-space:nowrap;border:12px solid transparent;border-image:url(art/ui/prep/btn.webp) 40 fill stretch;color:#f3d08a;letter-spacing:4px;font:900 clamp(16px,3vh,24px) "Songti SC","STSong","Noto Serif SC",serif;text-shadow:0 2px 0 #2a1608}#survPick .row{display:flex;gap:10px;justify-content:center;flex-wrap:wrap}'
    + '#survPick button{width:140px;padding:12px 8px;background:#2e2118;border:1px solid #8a6a3a;border-radius:8px;color:#f2e4c8;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:4px}'
    + '#survPick button:hover{border-color:#ffd86e;background:#3a2a1c}#survPick b{font-size:30px}#survPick span{font-size:16px;font-weight:700}#survPick small{color:#cdb98e;font-size:12px}#survPick p{margin:10px 0 0;color:#a08d70;font-size:12px}'; document.head.appendChild(st);
  // ---------- 构筑总览（TAB / 右上「构」按钮；路线图和战斗里都能开，开着时战斗暂停） ----------
  let buildOpen = false, buildBtn = null, hudT = 0;
  function buildHtml() {
    const o = OG(), R = RES(), tot = Object.values(S.dps).reduce((a, b) => a + b, 0);
    const cats = `<span style="display:inline-block;margin:2px 8px 2px 0">${(o.weps || []).map(w => WEPN[w]).join('、')} <b style="color:#9fe08a">×1.2</b></span><span style="display:inline-block;margin:2px 8px 2px 0">剑、拳 <b style="color:#ddd">×1.0</b></span><span style="display:inline-block;margin:2px 8px 2px 0">其他兵器 <b style="color:#e08a8a">×0.85</b></span>`;
    const rows = S.slots.map((k, i) => !SK[k] ? `<div class="r" style="opacity:.4">${i + 1}. 空</div>` :
      `<div class="r"><b style="color:${SK[k].color}">${i + 1}. ${SK[k].name}</b> <span class="t">${WEPN[wepOf(k)]} · ${CATN[catOf(k)]}${SK[k].tier ? ' · ' + TIERN[SK[k].tier] + '阶' : ''}</span><span class="v">LV${lvOf(k)} · ×${skillMul(k).toFixed(2)}${tot ? ' · 输出 ' + Math.round((S.dps[k] || 0) / tot * 100) + '%' : ''}</span><span class="mv"><button data-mv="${i}:-1"${i < 1 ? ' disabled' : ''}>▲</button><button data-mv="${i}:1"${i > 3 || !SK[S.slots[i + 1]] ? ' disabled' : ''}>▼</button></span></div>`).join('');
    const res = R.cnt.map((n, c) => n >= 2 ? `<div class="r"><b>${WEPN[c]}精通 · ${n} 招</b><span class="v">${WEPN[c]}武艺伤害 +${Math.round(RESD[Math.min(5, n)] * 100)}%</span></div>` : '').join('') || '<div class="r" style="opacity:.5">还没有（同一种兵器的武艺 2 件起）</div>';
    const gfRows = S.gf.map((id, i) => { const g = GF[id]; return !g ? `<div class="r" style="opacity:.4">内功 ${i + 1} · 空</div>` : `<div class="r"><b style="color:${GTC[g.t]}">${g.n}</b> <span class="t">${GTN[g.t]}阶 · ${g.c >= 0 ? g.cn + '心法' : '通用'} · LV${gfLv(id)} · 杀敌 ${S.gfExp[id] || 0}</span><span class="mv"><button data-gx="${i}">✕</button></span></div><div class="gd">${gfText(g)}</div>`; }).join('');
    const qgRow = GF[S.qg] ? `<div class="r"><b style="color:${GTC[GF[S.qg].t]}">${GF[S.qg].n}</b> <span class="t">${GTN[GF[S.qg].t]}阶</span><span class="mv"><button data-qx="1">✕</button></span></div><div class="gd">${GF[S.qg].d}</div>` : '<div class="r" style="opacity:.4">空（战利品里可能出现轻功）</div>';
    const mx = Math.max(...R.cnt), ex = [mx >= 3 ? '受伤 -5%' : '', mx >= 4 ? '出招 -5% 间隔' : '', mx >= 5 ? '出招再快（共 -10%）' : ''].filter(Boolean).join('，');
    return `<div class="bp"><h3>构筑总览 <button class="x">✕</button></h3>
      <h4>出身 · ${o.name}</h4><div style="font-size:12px">${cats}</div><div style="font-size:11px;opacity:.6">出身对各类武艺的熟练系数：跨类也能用，只是偏弱</div>
      <h4>武艺（按 1→5 顺序放，可用 ▲▼ 调顺序）</h4>${rows}
      <h4>兵器精通</h4>${res}${ex ? `<div style="font-size:11px;opacity:.7;margin-top:2px">额外：${ex}</div>` : ''}
      <h4>内功（同类心法装得越多，专精越高、升级越快）</h4>${gfRows}
      <h4>轻功</h4>${qgRow}
      <h4>真气</h4><div style="font-size:12px">${Math.round(S.zq * 10)} / ${Math.round(zqMax() * 10)}　<span style="opacity:.65">护身：受伤时真气挡 30%；打完一关剩下的真气三成换成气血</span></div></div>`;
  }
  function toggleBuild(on) {
    buildOpen = on != null ? on : !buildOpen;
    let box = document.getElementById('survBuild');
    if (!buildOpen) { if (box) box.remove(); return; }
    if (!box) {
      if (!document.getElementById('survBuildCss')) { const st = document.createElement('style'); st.id = 'survBuildCss'; st.textContent = '#survBuild{position:fixed;inset:0;z-index:10030;display:flex;align-items:center;justify-content:center;background:rgba(10,6,4,.62);font-family:"PingFang SC","Noto Sans CJK SC",sans-serif;color:#eee}#survBuild .bp{width:min(92vw,520px);max-height:86vh;overflow:auto;background:#1c140e;border:2px solid #8a6a3a;border-radius:8px;padding:10px 14px}#survBuild h3{margin:0 0 4px;font-size:16px;display:flex;justify-content:space-between;color:#ffd27a}#survBuild h4{margin:10px 0 3px;font-size:13px;color:#d8b070;border-bottom:1px solid #4a3820}#survBuild .r{display:flex;gap:8px;align-items:baseline;font-size:13px;padding:2px 0}#survBuild .gd{font-size:11px;opacity:.7;margin:0 0 3px 8px}#survBuild .t{opacity:.6;font-size:11px}#survBuild .v{margin-left:auto;white-space:nowrap;font-size:12px;opacity:.85}#survBuild .mv{display:flex;gap:3px;margin-left:6px}#survBuild .mv button{background:#2e2118;border:1px solid #8a6a3a;color:#ddd;border-radius:4px;font-size:12px;padding:2px 8px}#survBuild .mv button:disabled{opacity:.25}#survBuild .x{background:none;border:1px solid #8a6a3a;color:#ddd;border-radius:4px;font-size:14px;padding:0 8px}#survBuildBtn{position:fixed;top:10px;right:104px;z-index:10025;width:34px;height:34px;border-radius:6px;border:2px solid #8a6a3a;background:rgba(28,20,14,.85);color:#ffd27a;font-size:15px;display:none}'; document.head.appendChild(st); }
      box = document.createElement('div'); box.id = 'survBuild'; document.body.appendChild(box);
      box.onclick = e => {
        if (e.target === box || e.target.classList.contains('x')) { toggleBuild(false); return; }
        const t = e.target.closest ? e.target : null, gm = t && t.closest('[data-gm]'), gx = t && t.closest('[data-gx]'), qx = t && t.closest('[data-qx]');
        if (gm) { const i = +gm.dataset.gm; if (i > 0) { const q = S.gf[i]; S.gf[i] = S.gf[i - 1]; S.gf[i - 1] = q; box.innerHTML = buildHtml(); } return; }
        if (gx) { S.gf[+gx.dataset.gx] = ''; box.innerHTML = buildHtml(); return; }
        if (qx) { S.qg = ''; box.innerHTML = buildHtml(); return; }
        const m = e.target.closest && e.target.closest('[data-mv]'); if (!m) return;
        const [i, d] = m.dataset.mv.split(':').map(Number), j = i + d;
        if (j >= 0 && j < 5 && SK[S.slots[i]] && SK[S.slots[j]]) { const t = S.slots[i]; S.slots[i] = S.slots[j]; S.slots[j] = t; S.lastI = -9; S.chain = 0; box.innerHTML = buildHtml(); }
      };
    }
    box.innerHTML = buildHtml();
  }
  function buildUi() {
    if (buildBtn) { buildBtn.style.display = RT.on && (ROUTE.shown() || performance.now() - hudT < 800) ? 'block' : 'none'; return; }
    buildBtn = document.createElement('button'); buildBtn.id = 'survBuildBtn'; buildBtn.textContent = '构'; buildBtn.title = '构筑总览（TAB）'; buildBtn.onclick = () => toggleBuild();
    document.body.appendChild(buildBtn);
  }
  addEventListener('keydown', e => { if (e.key === 'Tab' && RT.on && (ROUTE.shown() || performance.now() - hudT < 800)) { e.preventDefault(); toggleBuild(); } });
  setInterval(buildUi, 400);

  const attrInfo = (k, cur) => { const o0 = origin, d0 = S.atAdd; if (ORIGINS[k]) origin = k; if (!cur) S.atAdd = null; const at = AT(), pct = x => (x >= 0 ? '+' : '') + Math.round(x * 100) + '%';
    const wp = v => pct((v - 3) * .06), R0 = [['体魄', at[0], '气血 ' + pct(AFX.hp() - 1), '越高越扛打：受到的伤害按比例减少'], ['短兵', at[1], '刀锤剑拳 ' + wp(at[1]), '刀、锤、剑、拳武艺的伤害'], ['长兵', at[2], '枪、关刀 ' + wp(at[2]), '枪、关刀武艺的伤害'],
      ['身法', at[3], '移速 ' + pct(AFX.move() - 1), '移动速度'], ['运气', at[4], '暴击 ' + pct(AFX.crit()), '暴击率（基础 5%）'], ['悟性', at[5], '熟练 ' + pct(AFX.xp() - 1), '武艺、心法熟练度涨得更快'],
      ['射艺', at[6], '石子、弓 ' + wp(at[6]), '石子、弓武艺的伤害'], ['术法', at[7], '黄符、羽扇 ' + wp(at[7]), '黄符、羽扇武艺的伤害'], ['内力', at[8], '真气 ' + pct(AFX.nl() - 1), '真气上限和回复速度']];
    const r = ADO.map(i => R0[i].concat([i]));
    origin = o0; S.atAdd = d0; return r; };
  const status = () => ({   // 路线长卷「兵籍牒」用：这一局的当前状态（11/11）
    origin: OG().name, money: S.money || 0, bao: (S.bao || []).map(k => Object.assign({ k }, BAO[k])), shang: (S.shang || []).map(k => Object.assign({ k }, SHANG[k])), lv: S.lv || 1, pct: Math.floor(Math.min(1, (S.xiu || 0) / XIU_NEED(S.lv || 1)) * 100), bank: S.bank || 0,
    hp: hero ? [Math.ceil(hero.hp * 10), Math.round(maxHp() * 10)] : [0, 0], attrs: attrInfo(origin, true), base: AT0(), add: (S.atAdd || []).slice(),
    slots: S.slots.map(k => k && SK[k] ? { name: SK[k].name, icon: SK[k].icon, color: SK[k].color, desc: SK[k].desc, lv: lvOf(k) } : null),
    gf: S.gf.map(id => id && GF[id] ? { name: GF[id].n, desc: GF[id].d, lv: gfLv(id) } : null), qg: S.qg && GF[S.qg] ? { name: GF[S.qg].n, desc: GF[S.qg].d } : null,
    dmg: RT.dmg });
  // 11/13 武学试炼（开发者面板）：看招用
  const TRIAL = { SK, GF, MOT, WEPN, TIERN, wepOf, IMGU, spdTxt, spawn: t => edgeSpawn(t), count: t => zs.filter(z => !z.dead && z.type === t).length, long() { W.tot = 9999; if (W.t > W.tot - 5) W.t = 0; },
    setGf(ids) { S.gf = ['', '', '']; ids.slice(0, 3).forEach((id, i) => { S.gf[i] = id; }); GM = gfCalc(); }, setQg(id) { S.qg = id || ''; GM = gfCalc(); }, gf: () => S.gf.slice(), qg: () => S.qg, mul: k => skillMul(k), lv: k => lvOf(k), spd: k => spdTxt(SK[k]), rs: k => SK[k] && SK[k].dk ? rsOf(k) : null, setRs(k, v) { DRS[k] = v; try { localStorage.setItem('szz-dao-rs', JSON.stringify(DRS)); } catch (e) {} },
    sp: k => spOf(k), setSp(k, v) { DSP[k] = v; try { localStorage.setItem('szz-dao-sp', JSON.stringify(DSP)); } catch (e) {} }, spAll(v) { Object.keys(SK).forEach(k => { if (SK[k].dk) DSP[k] = v; }); try { localStorage.setItem('szz-dao-sp', JSON.stringify(DSP)); } catch (e) {} },
    FRN: ['idle', 'walk1', 'walk2', 'walk3', 'roll1', 'roll2', 'roll3', 'roll4', 'hurt', 'down', 'chop1', 'chop2', 'sweep1', 'sweep2', 'thrust1', 'thrust2', 'spin1', 'spin2', 'up1', 'up2'],
    getPose: k => { const o = dpsOf(k); if (o) return Object.assign({ fa: 0, fb: 0 }, o); const m = motFr(k), hp = preOf(k); return { a: m[0].slice(hp.length), b: m[1].slice(hp.length), fa: 0, fb: 0 }; },
    setPose: (k, o) => { DPS[k] = o; try { localStorage.setItem('szz-dao-pose', JSON.stringify(DPS)); } catch (e) {} },
    poseAll: () => Object.keys(SK).filter(k => SK[k].dk && !SK[k].off).sort((a, b) => SK[a].tier - SK[b].tier).map(k => { const o = TRIAL.getPose(k); return `${SK[k].name}(${k}) 起手 ${o.a}${o.fa ? '（翻转）' : ''} → 出手 ${o.b}${o.fb ? '（翻转）' : ''}`; }).join('\n'),
    rsAll: () => Object.keys(SK).filter(k => SK[k].dk && !SK[k].off).sort((a, b) => SK[a].tier - SK[b].tier).map(k => `${TIERN[SK[k].tier]} ${SK[k].name}(${k}) 范围×${rsOf(k)} 速度×${spOf(k)}（${spdTxt(SK[k])}）`).join('\n'), setLv(k, l) { S.lvLock = {}; if (k && l) S.lvLock[k] = l; } };
  window.SURV = { slowMove, coinAt: (x, y, v) => { const n = Math.min(5, v), e = Math.ceil(v / n); for (let i = 0; i < n; i++) S.coins.push({ x: x + R(-14, 14), y: y + R(-6, 6), z: 8 + R(0, 10), vz: R(60, 110), vx: R(-40, 40), v: e, t: 0 }); }, wuParts, trial: TRIAL, BAO, BQN, BQC, SHANG, baoHit, blessOpts, bless: (k, cb) => blessDo(k, cb), baoPick: (qs, cb, t) => pickBao(qs, cb, t), maxHp: () => maxHp(), poseFlip: () => poseFlipNow, banner: (a, b) => waveBanner(a, b), curNode: () => RT.on && W.started ? RT.node : null, status, attrInfo, addXiu: n => addXiu(n), heldPre: () => heldPre(), dbg: () => ({ gf: S.gf.slice(), qg: S.qg, zq: S.zq, zqMax: zqMax(), exp: S.gfExp, GM }), giveGf: id => { if (GF[id]) { if (GF[id].qg) S.qg = id; else { const f = S.gf.indexOf(""); if (f >= 0) S.gf[f] = id; } } }, newHud: () => RT.on && !!RT.node, stunGate, noStun: () => RT.on, get slots() { return S.slots; }, SK, beginNode, frozen: () => RT.on && (ROUTE.shown() || buildOpen || talkHold || (banHold && !!document.getElementById('waveBan'))), routeHp: () => [hero.hp, maxHp()], camp(k) { if (k === 'heal') { heal(maxHp() * .3); S.shang = []; } else if (k && SK[k]) { const l = lvOf(k); if (l < 10) S.mast[k] = MAST_T[l]; } else RT.dmg *= 1.1; },   // 11/14 营地：休整回三成血；修炼 = 选一招直接升一级
    money: () => S.money, campSkills: () => [...S.slots, ...(S.owned || [])].filter((k, i, a) => k && SK[k] && a.indexOf(k) === i).map(k => ({ k, name: SK[k].name, lv: lvOf(k), img: IMGU[k] || '', icon: SK[k].icon, color: SK[k].color })), ORIGINS, setOrigin(k) { if (ORIGINS[k] && !ORIGINS[k].locked) { origin = k; startW = null; } }, origin: () => origin, setWep(w) { startW = w; }, wep: () => heldW(), startSk: () => startSk(), WEPN, takeMul: (from, kind) => { const fireK = kind === 'fire' || !!(from && (from.fire || (from.source && /fire|huo|jar/.test(String(from.source)))));
      if (RT.on && GM.block && Math.random() < GM.block) { floaters.push({ x: hero.x, y: hero.y - 50, t: 0, txt: '格挡', color: '#bfe0ff' }); return 0; }
      const mv = Math.abs(hero.ix) > .1 || Math.abs(hero.iy) > .1, low = hero.hp / maxHp() < .3 ? 1 - .10 * GM.low : 1;
      return (HAS('chitu') ? 1.1 : 1) * (HAS('tengjia') ? (fireK ? 2.5 : .75) : 1) * (HURT('mo') ? 1.1 : 1) * ((S.weakN || 0) > 0 ? .85 : 1) * (OG().take || 1) / AFX.hp() * (1 - IT('take')) * RT.take * RES().take * GM.take / GM.hp * low * (S.qg === 'taxue' && mv ? .85 : 1) * (GM.still && S.stillT > 1 ? 1 - GM.still : 1) * (S.qDR && DKT < S.qDR ? .8 : 1);
    },
    absorb: n => { if (!RT.on) return n; if (S.zq > 0) { const a = Math.min(S.zq, n * (.3 + IT('huti'))); S.zq -= a; S.hutiSum = (S.hutiSum || 0) + a; n -= a; } if (HAS('huxin') && !S.huxinUsed && hero.hp - n <= 0 && n > 0) { S.huxinUsed = 1; n = Math.max(0, hero.hp - .1); floaters.push({ x: hero.x, y: hero.y - 60, t: 0, txt: '护心镜！', gold: true }); } return n; },   // 护体（11/11 用户定，照群侠幸存者）：真气只挡 30% 伤害，其余直接扣血；真气空了全扣血
     moveMul: () => (OG().move || 1) * AFX.move() * (1 + IT('move') + (HAS('caoxie') ? .08 : 0) + (HAS('chitu') ? .3 : 0)) * (HURT('jian') ? .9 : 1) * RT.move * GM.spd, left: () => RT.on && RT.node && W.started ? Math.max(0, WT() - W.t) : null, reward: (n, cb) => offerReward(n, cb), event(k, cb) { eventDo(k, cb); }, SK, tick, drawWorld, hud, thief: thiefAI, unitAI: (z, dt) => unitAI(z, dt), startRun, waveFlow, pose, rooted, onRoll, skipWave() { if (W.retreat <= 0 && W.between <= 0 && W.started) endWave(); }, state: () => ({ wave: W.n, t: W.t, slots: S.slots.slice() }) };
})();
