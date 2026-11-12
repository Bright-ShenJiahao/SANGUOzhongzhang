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
  const secOf = nd => Math.min(4, ((nd.layer - 1) / 4) | 0);
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
        z.x += dx / d * c.spd * dt; z.y = clampY(z.y + dy / d * c.spd * dt * YS); z.st = 'strike'; z.t = .1; z.f = dx < 0 ? -1 : 1;
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
    list.forEach((b, i) => { const z = edgeSpawn(c2ok || !b.fb ? b.t : b.fb, Object.assign({}, b, { tier: i === 0 ? 3 : 2, hp: i === 0 ? 130 : 40 })); bossBuff(z, i === 0 ? 1.6 : 1.3); });   // 11/11 用户：BOSS 太简单 → 首领血 54→130、小头目 21→40，伤害 ×1.6 / ×1.3   // 四档：小头目 ×7（21）、首领 ×18（54）
  }
  function edgeSpawn(type, boss) {   // boss：true = 老卒式 ×4 血；对象 = 命名首领 {name, hp 或 m, sc}
    const vw = viewW(); let side = Math.random() < .5 ? -1 : 1, x, y;
    if (window.ARENA && ARENA.on()) { const p = ARENA.edge(); x = p.x; y = p.y; side = x < hero.x ? -1 : 1; }   // 俯视竞技场：四周都刷
    else { x = side < 0 ? cam.x + 6 : cam.x + vw - 6; x = Math.max(arenaL + 14, Math.min(lockR - 14, x)); y = R(M.top + 6, M.bot - 6); }
    spawn(type, x, y);
    const z = zs[zs.length - 1]; z.f = -side; z.survMul = 1 + HP_SCALE * (W.n - 1);
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
      if (n === 1) waveBanner(ROUTE.name(nd), nd.type === 'boss' ? '首领战 · 迎战' : nd.type === 'elite' ? '第 ' + nd.layer + ' 层 · 精锐 · 迎战' : '第 ' + nd.layer + ' 层 · 迎战');
      const lvOf = k => Math.max(1, Math.min(WAVES, 1 + Math.floor(((nd.layer - 1 + (k - 1) / N0) / L) * WAVES) + (nd.type === 'elite' ? 2 : 0) + (nd.type === 'boss' ? 2 : 0)));
      W.lv0 = lvOf(1); W.lv1 = lvOf(N0); W.tot = 0; for (let k = 1; k <= N0; k++) W.tot += (WAVE_T[lvOf(k) - 1] || 60) * ROUTE.TIME_K;
      W.tot = nd.type === 'boss' ? 60 : nd.type === 'elite' ? 50 : 36 + 8 * nd.layer / L; if (/[?&]longwave/.test(location.search)) W.tot = 9999;   // 测试用：关卡不结束   /* 11/12 用户：关卡太长 → 普通约 40 秒（36~44）、精英 50、首领（含张角）60 秒内 */   // 11/11：第一关太长太难 → 前三层 35/42/48 秒   // 用户定 11/09：首领 3 分钟；精英约 1.5~2 分钟；普通战斗约 50~65 秒（18 层）
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
    if (RT.on && RT.node && RT.node.type === 'boss' && W.bossDone && W.t > 3 && !alive().some(z => z.survBoss && z.survTier >= 3)) {   /* 11/11 用户：打死首领就结束（以前要连小头目一起打死） */ say(RT.node.final ? '黄巾首领已破！' : '敌将已破！', 1.6); W.t = WT(); }   // 首领战：把场上的敌将都打倒就算赢
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
      rec(dmg * DM()); hit(z, dmg * DM(), kb, Math.sign(dx) || hero.f, false, 0, .3, false, false, { secondary: true, survSkill: true });
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
  SK.zhendi = { desc: '砸地，脚下一圈震飞', name: '震地', icon: '震', color: '#ffd27a', wu: .7, rc: .35, need: 56, pose: [], range: 52, half: Math.PI, ring: true,
    cast() {   // 一刀砸地，脚下一圈冲击波，把周围的人震飞
      fx.push({ k: 'ring', x: hero.x, y: hero.y, t: 0, T: .45, r: 52 });
      for (const z of hittable()) if (dist(z, hero) < 52) { const f0 = freeze; rec(2.0 * DM()); hit(z, 2.0 * DM(), 50, Math.sign(z.x - hero.x) || hero.f, true, 0, .4, false, false, { secondary: true, survSkill: true }); freeze = Math.min(freeze, Math.max(f0, .05)); }
      sfx('crack', hero.x); shake = Math.max(shake, .3);
    } };
  const bolts = [], zones = [];
  for (const a of [bolts, zones]) { const pu = a.push; a.push = function (...o) { o.forEach(x => { x.cm = CM; x.ck = CK; }); return pu.apply(this, o); }; }   // 弹道/地面效果记下出手那一刻的倍率

  // ---------- 三国幸存者武艺（黄玄地天；tier 0 基础 / 黄 / 玄 / 地 / 天） ----------
  const TIERN = ['基础', '黄', '玄', '地', '天'], TMIN = [0, 0, 2, 4, 6];
  const tierOk = k => W.n >= TMIN[SK[k].tier || 0];
  const HT = (z, dmg, kb, dir, fr) => { rec(dmg * DM()); const f0 = freeze; hit(z, dmg * DM(), kb, dir || hero.f, false, 0, .3, false, false, { secondary: true, survSkill: true }); freeze = Math.min(freeze, Math.max(f0, fr || .04)); };
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
  SK.hengsao.tier = 1; SK.lianzhan.tier = 1; SK.zhendi.tier = 2;
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
  add('jianyu', { name: '箭雨', icon: '箭', color: '#e9dcb0', desc: '数处落箭，片刻后覆盖落点', need: 180, none: true, wu: .5,
    cast() { for (const [x, y] of pts(5, 220)) { fx.push({ k: 'mark', x, y, r: 26, t: 0, T: .55 }); later(.55, () => blast(x, y, 26, 1.7, 14, '240,225,170')); } } });
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
  function chain(n, range, dmg, col, gap) {   // 在敌人之间连跳 n 次（跳石、掌心雷）
    let x = hero.x, y = hero.y; const hitd = [];
    for (let i = 0; i < n; i++) later(i * (gap || .09), () => {
      let t = null, bd = range; for (const z of hittable()) { if (hitd.includes(z)) continue; const d = Math.hypot(z.x - x, (z.y - y) * 2); if (d < bd) { bd = d; t = z; } }
      if (!t) return; hitd.push(t); const a = Math.atan2((t.y - y) * 2, t.x - x);
      lineHit(a, Math.max(10, bd / RM), 8, dmg, 20, col, x, y); x = t.x; y = t.y; sfx('swing_knife', x); });
  }
  // 石子
  add('feishi', { tier: 1, name: '飞石', icon: '石', color: '#d8d2c4', desc: '直线连掷三颗快石', need: 170, beam: true, len: 170, wu: .4, rc: .3,
    cast() { [0, 1, 2].forEach(i => later(i * .1, () => shot(aim(), { dmg: 1.4, T: .6, vx: Math.cos(aim()) * 380, vy: Math.sin(aim()) * 190, col: STN }))); sfx('swing_knife', hero.x); } });
  add('sashi', { tier: 1, name: '撒石', icon: '撒', color: '#cfc6b0', desc: '扇形撒出一把碎石', need: 110, wu: .45, rc: .3,
    cast() { const a0 = aim(); for (let i = 0; i < 7; i++) { const a = a0 - .5 + i / 6; shot(a, { dmg: 1.0, T: .45, col: STN }); } sfx('swing_knife', hero.x); } });
  add('zashi', { tier: 1, name: '砸石', icon: '砸', color: '#bfb59c', desc: '往前方地上一砸，震晕附近的人', need: 80, wu: .55, rc: .35,
    cast() { const a = aim(), x = hero.x + Math.cos(a) * 44, y = clampY(hero.y + Math.sin(a) * 22); blast(x, y, 42, 2.2, 30, '200,190,165'); for (const z of near(x, y, 42 * RM)) stunz(z, .6); sfx('crack', x); shake = Math.max(shake, .2); } });
  add('tiaoshi', { tier: 2, name: '跳石', icon: '跳', color: '#e6dfcf', desc: '石子像打水漂，在敌人之间连跳五次', need: 160, wu: .45, rc: .35,
    cast() { chain(5, 170, 1.6, '230,226,214'); } });
  add('xuanshi', { tier: 2, name: '旋石', icon: '旋', color: '#d6cdb8', desc: '原地转一圈，甩出一圈石子', need: 90, wu: .5, rc: .35,
    cast() { for (let i = 0; i < 12; i++) shot(i * Math.PI / 6, { dmg: 1.1, T: .55, col: STN }); sfx('swing_knife', hero.x); } });
  add('paoshi', { tier: 2, name: '抛石', icon: '抛', color: '#c9bea4', desc: '高抛一块大石，落地爆开碎石四溅', need: 200, none: true, wu: .55, rc: .35,
    cast() { const [[x, y]] = pts(1, 210); fx.push({ k: 'mark', x, y, r: 40, t: 0, T: .5 });
      later(.5, () => { blast(x, y, 46, 2.6, 40, '210,200,175'); for (let i = 0; i < 6; i++) shotAt(x, y, i * Math.PI / 3, { dmg: .9, T: .4, col: STN }); sfx('crack', x); shake = Math.max(shake, .2); }); } });
  add('luoshi', { tier: 3, name: '落石', icon: '落', color: '#b8ab8c', desc: '数块大石从天砸下，砸出的坑里敌人减速', need: 220, none: true, wu: .6, rc: .4,
    cast() { pts(4, 230).forEach(([x, y], i) => { fx.push({ k: 'mark', x, y, r: 34, t: 0, T: .55 + i * .08 }); later(.55 + i * .08, () => { blast(x, y, 36, 2.4, 30, '190,175,140'); zones.push({ x, y, r: 36, t: 0, T: 3, tk: 0, dmg: .3, kind: 'pit' }); sfx('crack', x); }); }); shake = Math.max(shake, .2); } });
  add('shici', { tier: 3, name: '石刺', icon: '刺', color: '#c4b493', desc: '地面一排石刺依次往前突起', need: 190, beam: true, len: 190, wu: .6, rc: .4,
    cast() { const a = aim(); for (let i = 1; i <= 6; i++) { const x = hero.x + Math.cos(a) * i * 34, y = clampY(hero.y + Math.sin(a) * i * 17); later(i * .07, () => { blast(x, y, 28, 1.6, 30, '196,180,147'); for (const z of near(x, y, 28 * RM)) z.vx = (z.vx || 0); }); } sfx('crack', hero.x); shake = Math.max(shake, .15); } });
  add('raoshen', { tier: 3, name: '绕身石', icon: '绕', color: '#dcd3be', desc: '三颗石子绕身飞转五秒', need: 70, wu: .5, rc: .35,
    cast() { zones.push({ x: 0, y: 0, follow: 1, r: 62, t: 0, T: 5, tk: 0, dmg: .9, kind: 'orbit', col: '220,212,190', n: 3 }); sfx('swing_knife', hero.x); } });
  add('luanshi', { tier: 4, name: '乱石穿空', icon: '乱', color: '#e8dcc0', desc: '三秒内全屏乱石密集落下', need: 260, none: true, wu: .7, rc: .45,
    cast() { for (let i = 0; i < 20; i++) later(i * .15, () => { const [[x, y]] = pts(1, 280); fx.push({ k: 'mark', x, y, r: 26, t: 0, T: .3 }); later(.3, () => { blast(x, y, 30, 1.8, 24, '210,198,170'); sfx('crack', x); }); }); shake = Math.max(shake, .25); } });
  add('feihuang', { tier: 4, name: '飞蝗石', icon: '蝗', color: '#f0e6cc', desc: '连撒五波大扇形石雨', need: 150, wu: .6, rc: .45,
    cast() { for (let w = 0; w < 5; w++) later(w * .18, () => { const a0 = aim(); for (let i = 0; i < 9; i++) shot(a0 - .6 + i * .15, { dmg: 1.1, T: .55, col: STN }); sfx('swing_knife', hero.x); }); } });
  add('gunshi', { tier: 4, name: '滚石', icon: '滚', color: '#a99a7a', desc: '推出一块巨石往前碾压，滚到尽头碎成十块', need: 220, beam: true, len: 240, wu: .7, rc: .5,
    cast() { const a = aim(); let x = hero.x, y = hero.y;
      for (let i = 1; i <= 10; i++) later(i * .07, () => { x += Math.cos(a) * 26; y = clampY(y + Math.sin(a) * 13); blast(x, y, 36, 1.4, 50, '170,154,122'); if (i === 10) { for (let j = 0; j < 10; j++) shotAt(x, y, j * Math.PI / 5, { dmg: 1.0, T: .45, col: STN }); sfx('crack', x); shake = Math.max(shake, .3); } }); } });
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

  // ---------- 锤（2）：慢、重、砸地 ----------
  def('lunchui', 2, 1, 'sweep', { name: '抡锤', icon: '抡', color: '#e0b080', desc: '大半圈重扫，把人抡飞', need: 70, range: 60, half: 1.6, wu: .65,
    cast() { sweep(aim(), 1.6, 60, 2.4, 90, C.chui); sfx(SW, hero.x); shake = Math.max(shake, .15); } });
  def('zhidao', 2, 1, 'thrust', { name: '直捣', icon: '捣', color: '#d8a878', desc: '锤头往前一捅，前面一排人被撞飞', need: 90, beam: true, len: 90,
    cast() { lineHit(aim(), 90, 18, 2.2, 110, '230,190,140'); sfx(CR, hero.x); shake = Math.max(shake, .12); } });
  def('xuanchui', 2, 2, 'spin', { name: '旋锤', icon: '旋', color: '#e8c090', desc: '原地抡三圈，一圈比一圈大', need: 70, wu: .6,
    cast() { [0, 1, 2].forEach(i => later(i * .22, () => { sweep(i * 2, Math.PI, 46 + i * 16, 1.4, 60, C.chui); sfx(SW, hero.x); })); } });
  def('dizhen', 2, 2, 'chop', { name: '地震', icon: '震', color: '#d0a070', desc: '砸地后三道裂缝向外放射', need: 150, wu: .65,
    cast() { const a0 = aim(); [-.5, 0, .5].forEach(d => lineHit(a0 + d, 150, 14, 1.6, 40, '210,160,100')); fx.push({ k: 'ring', x: hero.x, y: hero.y, t: 0, T: .4, r: 40 }); sfx(CR, hero.x); shake = Math.max(shake, .25); } });
  def('tiaotian', 2, 2, 'up', { name: '挑天锤', icon: '天', color: '#f0c080', desc: '把前方的人全挑上天，落地再受一次伤', need: 70, range: 60, half: 1.1,
    cast() { const a = aim(); fx.push({ k: 'arc', x: hero.x, y: hero.y, a0: a, half: 1.1, r: 60 * RM, t: 0, T: .3, color: C.chui }); const zz = cone(a, 60, 1.1); for (const z of zz) HTU(z, 1.8, 10, Math.sign(z.x - hero.x)); later(.6, () => { for (const z of zz) if (!z.dead) blast(z.x, z.y, 22, 1.4, 0, '230,190,140'); }); sfx(CR, hero.x); } });
  def('wanjun', 2, 3, 'chop', { name: '万钧破', icon: '钧', color: '#e8a860', desc: '砸地后周围地面一圈圈接连爆裂', need: 120, wu: .7,
    cast() { blast(hero.x, hero.y, 50, 2.0, 60, '230,170,100'); for (let i = 0; i < 10; i++) { const a = i * .63, r = 70 + (i % 3) * 28, x = hero.x + Math.cos(a) * r, y = clampY(hero.y + Math.sin(a) * r * .5); later(.15 + i * .06, () => blast(x, y, 28, 1.3, 30, '220,160,90')); } sfx(CR, hero.x); shake = Math.max(shake, .35); } });
  def('kaishan', 2, 3, 'chop', { name: '开山', icon: '山', color: '#c89060', desc: '前方扇形地面整片塌陷，伤害大并震晕', need: 110, range: 110, half: .8, wu: .75,
    cast() { const a = aim(); fx.push({ k: 'arc', x: hero.x, y: hero.y, a0: a, half: .8, r: 110 * RM, t: 0, T: .4, color: C.chui }); for (const z of cone(a, 110, .8)) { HT(z, 3.6, 40); stunz(z, 1); } sfx(CR, hero.x); shake = Math.max(shake, .35); } });
  def('zhichui', 2, 3, 'thrust', { name: '掷锤', icon: '掷', color: '#d8b080', desc: '巨锤扔出去一路碾过，到尽头再滚回来', need: 200, beam: true, len: 200,
    cast() { const a = aim(), o = { dmg: 2.4, T: .7, shape: 'hammer', col: ['200,150,90', '255,220,170'], vx: Math.cos(a) * 320, vy: Math.sin(a) * 160 }; shot(a, o); later(.7, () => { const x = hero.x + Math.cos(a) * 224, y = clampY(hero.y + Math.sin(a) * 112); shotAt(x, y, a + Math.PI, Object.assign({}, o, { vx: -o.vx, vy: -o.vy })); }); sfx(SW, hero.x); } });
  def('bengshan', 2, 4, 'chop', { name: '崩山裂地', icon: '崩', color: '#ff9a50', desc: '连砸三下，每下冲击波覆盖半个屏幕', need: 130, wu: .8,
    cast() { [0, 1, 2].forEach(i => later(i * .35, () => { S.poseOverride = { f: SK.bengshan.pose[1], t: .25 }; fx.push({ k: 'ring', x: hero.x, y: hero.y, t: 0, T: .5, r: 150 }); for (const z of hittable()) if (dist(z, hero) < 150 * RM) HT(z, 2.4, 60); sfx(CR, hero.x); shake = Math.max(shake, .4); })); } });
  def('leiting', 2, 4, 'up', { name: '雷霆万钧', icon: '霆', color: '#ffd060', desc: '跳起砸下，落点巨大冲击，再震两圈余震', need: 200, none: true, wu: .8,
    cast() { const [[x, y]] = pts(1, 200); ghost(hero.x, hero.y, x, y, Math.atan2(y - hero.y, x - hero.x), SK.leiting.pose[1], .35);
      later(.3, () => { blast(x, y, 80, 4.0, 80, '255,210,110'); [1, 2].forEach(i => later(i * .25, () => blast(x, y, 80 + i * 40, 1.2, 30, '255,200,120'))); sfx(CR, x); shake = Math.max(shake, .5); }); } });
  def('pocheng', 2, 4, 'chop', { name: '破城锤', icon: '城', color: '#ffb070', desc: '巨锤虚影从天砸下，一锤砸出最大一坑', need: 260, none: true, wu: .8,
    cast() { const [[x, y]] = pts(1, 240); fx.push({ k: 'mark', x, y, r: 90, t: 0, T: .55 }); drop(x, y, 'hammer', .55, () => { blast(x, y, 100, 5.0, 100, '255,190,110'); for (const z of near(x, y, 100 * RM)) stunz(z, 1); ZN({ x, y, r: 70, T: 3, kind: 'pit', dmg: .3 }); sfx(CR, x); shake = Math.max(shake, .6); }); } });

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

  // ---------- 弓（5）：齐射、贯穿、火矢、天降 ----------
  def('qishe', 5, 1, 'sweep', { name: '齐射', icon: '齐', color: '#e8d8a8', desc: '扇形一次射出五箭', need: 200,
    cast() { fan(aim(), 5, .7, Object.assign({ dmg: 1.4, T: .7, sp: 360 }, ARW)); sfx(SW, hero.x); } });
  def('lianzhu', 5, 1, 'thrust', { name: '连珠箭', icon: '珠', color: '#f0e0b0', desc: '直线连射三箭', need: 220, beam: true, len: 220,
    cast() { [0, 1, 2].forEach(i => later(i * .1, () => { const a = aim(); shot(a, Object.assign({ dmg: 1.6, T: .7, vx: Math.cos(a) * 420, vy: Math.sin(a) * 210 }, ARW)); })); sfx(SW, hero.x); } });
  def('huoshi', 5, 1, 'chop', { name: '火矢', icon: '矢', color: '#ff9a50', desc: '火箭射地起火，火里的人走不动', need: 220, none: true,
    cast() { pts(2, 220).forEach(([x, y]) => { fx.push({ k: 'mark', x, y, r: 30, t: 0, T: .4 }); later(.4, () => { blast(x, y, 26, 1.4, 10, '255,150,60'); ZN({ x, y, r: 32, T: 2.5, dmg: .45, kind: 'fire', slow: 1 }); }); }); sfx(SW, hero.x); } });
  def('guanri', 5, 2, 'thrust', { name: '贯日', icon: '贯', color: '#fff0a0', desc: '一箭贯穿全屏', need: 320, beam: true, len: 320,
    cast() { const a = aim(); lineHit(a, 360, 10, 3.2, 30, '255,240,160'); sfx(CR, hero.x); shake = Math.max(shake, .15); } });
  def('liannu', 5, 2, 'thrust', { name: '连弩', icon: '弩', color: '#e0d0a0', desc: '快速连射十二箭，扎向最近的敌人', need: 220,
    cast() { for (let i = 0; i < 12; i++) later(i * .06, () => { const a = aim() + R(-.08, .08); shot(a, Object.assign({ dmg: .8, T: .7, vx: Math.cos(a) * 440, vy: Math.sin(a) * 220 }, ARW)); }); sfx(SW, hero.x); } });
  def('xuanshe', 5, 2, 'spin', { name: '旋射', icon: '旋', color: '#f0e0c0', desc: '转身一圈，环射十二箭', need: 120,
    cast() { ring(12, Object.assign({ dmg: 1.2, T: .6, sp: 330 }, ARW)); sfx(SW, hero.x); } });
  def('zhuihun', 5, 3, 'thrust', { name: '追魂箭', icon: '魂', color: '#c0a0ff', desc: '五支箭各自追最近的敌人', need: 260,
    cast() { const a0 = aim(); for (let i = 0; i < 5; i++) { const a = a0 - .8 + i * .4; shot(a, Object.assign({ dmg: 2.0, T: 1.5, home: 1, vx: Math.cos(a) * 260, vy: Math.sin(a) * 130 }, ARW, { col: ['190,160,255', '240,230,255'] })); } sfx(SW, hero.x); } });
  def('luoyue', 5, 3, 'up', { name: '落月', icon: '月', color: '#d0e0ff', desc: '一排箭沿直线依次落下', need: 260, beam: true, len: 260,
    cast() { const a = aim(); for (let i = 1; i <= 8; i++) { const x = hero.x + Math.cos(a) * i * 32, y = clampY(hero.y + Math.sin(a) * i * 16); fx.push({ k: 'mark', x, y, r: 24, t: 0, T: .35 + i * .05 }); later(.35 + i * .05, () => { drop(x, y, 'arrow', .01, () => {}); blast(x, y, 26, 1.6, 15, '220,230,255'); }); } sfx(SW, hero.x); } });
  def('wanjian', 5, 4, 'up', { name: '万箭齐发', icon: '万', color: '#fff0c0', desc: '三秒内全屏密集落箭', need: 300, none: true,
    cast() { for (let i = 0; i < 30; i++) later(i * .1, () => { const [[x, y]] = pts(1, 300); later(.2, () => blast(x, y, 22, 1.3, 10, '240,230,190')); fx.push({ k: 'mark', x, y, r: 20, t: 0, T: .2 }); }); sfx(SW, hero.x); } });
  def('dianguang', 5, 4, 'thrust', { name: '电光', icon: '电', color: '#c0e0ff', desc: '闪电箭在敌人之间连锁十次', need: 240,
    cast() { chain(10, 200, 2.0, '190,225,255', .05); sfx(CR, hero.x); shake = Math.max(shake, .15); } });
  def('luori', 5, 4, 'up', { name: '落日', icon: '日', color: '#ff7040', desc: '巨箭从天坠下，大爆炸后留下一片火地', need: 280, none: true,
    cast() { const [[x, y]] = pts(1, 260); fx.push({ k: 'mark', x, y, r: 90, t: 0, T: .6 }); drop(x, y, 'arrow', .6, () => { blast(x, y, 95, 4.5, 80, '255,140,60'); ZN({ x, y, r: 80, T: 3, dmg: .6, kind: 'fire' }); sfx(CR, x); shake = Math.max(shake, .5); }); } });

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
    R2('bainiao', { name: '暴雨', icon: '雨', desc: '枪如暴雨，扇面连出十八枪' }); R2('lihua', { name: '旋枪', icon: '旋', desc: '长枪回旋一圈，枪花四散' }); R2('shici', { name: '突石', desc: '石柱从地面一路破土而出' });
    R2('tianlei', { name: '天雷牢', icon: '牢', desc: '雷阵困住里面的人，出不去还挨雷', cast() { const [[x, y]] = pts(1, 200); ZN({ x, y, r: 80, T: 3.5, dmg: 1.6, kind: 'thunder', cage: 1 }); sfx(CR, x); } });
    R2('sixiang', { name: '八方剑光', icon: '八', desc: '八个方向各飞出一道剑气', cast() { ring(8, Object.assign({ dmg: 1.8, T: .7, sp: 330 }, SWD)); sfx(SW, hero.x); } });
    const TI = { hengsao: 1, tuodao: 1, tiaozhan: 1, daobo: 2, lianzhan: 2, huima: 2, feilunren: 3, wanren: 4, tianbeng: 4, zhendi: 1, qiang: 1, lianci: 1, lansao: 1, huimaq: 2, bainiao: 3, lihua: 3, qijin: 4, longyin: 4,
      feishi: 1, sashi: 1, zashi: 1, tiaoshi: 2, paoshi: 2, raoshen: 2, luoshi: 3, shici: 3, feihuang: 3, luanshi: 4, gunshi: 4, jianyu: 3, huogong: 1, pili: 1, huofu: 1, feifu: 1, dingshen: 2, zhangxin: 2, wulei: 2, sadou: 3, tianlei: 3, jiutian: 4, huangtian: 4, taiping: 4, sixiang: 2 };
    for (const k in TI) SK[k].tier = TI[k];
    for (const k of ['daolun', 'xuanfeng', 'liedihuan', 'dilie', 'shuanghuan', 'xuehe', 'chong', 'tiaoqiang', 'touqiang', 'qianglin', 'xuanshi', 'fuhuo']) SK[k].off = true; }
  // ---------- 出身（开局配置里选；起手只有 1 个武艺） ----------
  const ORIGINS = {
    nongfu: { name: '农夫', tag: '刀 · 锤', wep: 0, weps: [0, 2], skill: 'hengsao', desc: '庄稼汉，挨得住打。受到伤害 -20%；刀、锤武艺 ×1.2', take: .8, oa: [5, 4, 2, 1, 1, 2, 1, 3], at: [6, 4, 2, 2, 3, 2] },
    xiaozu: { name: '小卒', tag: '枪 · 关刀', wep: 3, weps: [3, 4], skill: 'qiang', desc: '行伍出身，出手利落。武艺前摇 -20%；枪、关刀武艺 ×1.2', wu: .8, oa: [4, 4, 5, 1, 1, 2, 1, 3], at: [4, 3, 4, 3, 2, 2] },
    liehu: { name: '猎户', tag: '石子 · 弓', wep: 7, weps: [7, 5], skill: 'feishi', desc: '山里跑惯了。移动速度 +12%；石子、弓武艺 ×1.2', move: 1.12, oa: [3, 4, 1, 5, 1, 4, 1, 3], at: [3, 3, 1, 5, 3, 2] },
    shusheng: { name: '书生', tag: '黄符 · 羽扇', wep: 8, weps: [8, 9], skill: 'huofu', desc: '手无缚鸡之力，却通术法。黄符、羽扇武艺 ×1.2', oa: [2, 1, 1, 1, 1, 2, 6, 4], at: [2, 1, 1, 2, 3, 6] },
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
  const heldPre = () => HELDP[OG().wep] || 'wd_';
  const motFr = k => (FRM[heldPre()] || FRM.wd_)[MOT[k] || 'chop'];
  for (const k of Object.keys(SK)) Object.defineProperties(SK[k], {
    pose: { get: () => motFr(k).slice(0, 2), set() {}, configurable: true },
    poseL: { get: () => motFr(k)[1], set() {}, configurable: true },
    pose2: { get: () => motFr(k)[2], set() {}, configurable: true } });
  // 出身六项属性（11/11 用户定 A：全部接上效果）：体魄 短兵 长兵 身法 运气 悟性
  const AT0 = () => OG().at || [3, 3, 3, 3, 3, 3];
  const AT = () => { const b = AT0(), d = S.atAdd || [], it = S.atAdd ? itemAt() : [0, 0, 0, 0, 0, 0]; return b.map((v, i) => v + (d[i] || 0) + it[i]); };   // 出身底子 + 本局修炼
  const profV = v => Math.max(.72, Math.min(1.35, .58 + .15 * v));
  const AFX = {
    hp: () => 1 + (AT()[0] - 3) * .07,          // 体魄：气血（以受伤减免折算）
    move: () => 1 + (AT()[3] - 3) * .04,        // 身法：移动速度
    crit: () => (AT()[4] - 3) * .03,            // 运气：暴击率
    xp: () => Math.max(.5, 1 + (AT()[5] - 3) * .1),   // 悟性：武艺/心法熟练度获取
  };
  // ---------- 修为（11/11 用户定，照群侠幸存者）：杀敌和打完节点涨修为，满了升级攒一次「修炼」，节点打完后统一修炼（属性三选一），战斗中不打断 ----------
  const ATN = ['体魄', '短兵', '长兵', '身法', '运气', '悟性'];
  const XIU_NEED = lv => 70 + lv * 25;
  function addXiu(n) {
    if (!RT.on || !S.atAdd) return;
    S.xiu += n * AFX.xp();
    while (S.xiu >= XIU_NEED(S.lv)) { S.xiu -= XIU_NEED(S.lv); S.lv++; S.bank++; S.lvFx = 1.6; if (window.SFX) SFX.play('j_lvup'); if (hero) floaters.push({ x: hero.x, y: hero.y - 100, t: 0, txt: '修为提升 LV.' + S.lv, color: '#ffd86e' }); }
  }
  const RAR = [['白', '#e8e0d0', 1], ['蓝', '#5aa8ff', 2], ['紫', '#c07cff', 3], ['橙', '#ff9a3a', 2]];
  function rollXiu() {   // 三个不重复的属性选项；运气越高越容易出高品阶
    const sh = (AT()[4] - 3) * .03, out = [], used = new Set();
    while (out.length < 3) {
      const r = Math.random(), q = r < .03 + sh / 3 ? 3 : r < .15 + sh * 2 / 3 ? 2 : r < .45 + sh ? 1 : 0;
      let a = Math.random() * 6 | 0; while (used.has(a)) a = (a + 1) % 6; used.add(a);
      const o = { q, adds: [[a, RAR[q][2]]] };
      if (q === 3) { let b = Math.random() * 6 | 0; while (b === a) b = Math.random() * 6 | 0; o.adds.push([b, 2]); }
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
  const wmul = k => { const w = wepOf(k); return w === 1 || w === 10 ? 1 : (OG().weps || [OG().wep]).includes(w) ? 1.2 : .85; };
  const growOf = c => c === 0 ? profV(AT()[1]) / profV(AT0()[1]) : c === 1 ? profV(AT()[2]) / profV(AT0()[2]) : 1;
  const profOf = c => c === 0 ? profV(AT()[1]) : c === 1 ? profV(AT()[2]) : profV((OG().oa || [3, 3, 3, 3, 3, 3, 3, 3])[CATA[c]]);   // 短兵/长兵：对应大类武艺伤害
  const RESD = [0, 0, .08, .16, .26, .40];   // 同类别 n 件：该类别武艺伤害加成
  function RES() {
    const cnt = WEPN.map(() => 0); for (const k of S.slots) if (SK[k]) cnt[wepOf(k)]++;   // 按具体兵器数
    const mx = Math.max(...cnt);
    return { cnt, take: mx >= 3 ? .95 : 1, cd: mx >= 5 ? .9 : mx >= 4 ? .95 : 1 };
  }
  const MAST_T = [0, 8, 20, 40, 70, 110, 160, 220, 300, 400];   // 施放次数 → 熟练度 LV1~10
  const lvOf = k => { const m = S.mast[k] || 0; let l = 1; while (l < 10 && m >= MAST_T[l]) l++; return l; };
  const mastMul = k => { const l = lvOf(k); return 1 + .06 * Math.min(3, l - 1) + (l >= 5 ? .12 : 0) + .05 * Math.max(0, Math.min(l, 9) - 5); };   // LV2-4、6-9 递增，LV5 质变
  function skillMul(k) {
    const c = catOf(k), n = RES().cnt[wepOf(k)], low = hero.hp / maxHp() < .3 ? 1 + .25 * GM.low : 1;
    return wmul(k) * growOf(c) * (1 + RESD[Math.min(5, n)]) * mastMul(k) * GM.all * GM.cat[c] * low * (1 + .06 * S.xy);
  }
  function critRoll() {   // 暴击：基础 5% + 心法；伤害 ×1.5 + 心诀
    if (!CK || !SK[CK]) return 1;
    const c = catOf(CK);
    if (S.lhjOn || Math.random() < .05 + AFX.crit() + IT('crit') + GM.crit + GM.critC[c]) { if (Math.random() < .35) floaters.push({ x: hero.x, y: hero.y - 54, t: 0, txt: '会心', color: '#ff9a4a' }); return 1.5 + GM.critD[c]; }
    return 1;
  }
  const CDM = () => RT.cd * RES().cd;
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
  const zqMax = () => Math.round(maxHp() * (1 + .06 * GM.qh) * 10) / 10;
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
  function stunGate(z, stun, knock) {
    if (!RT.on || !(stun > .05 || knock)) return null;
    if (z.stunCd > 0) return { stun: 0, knock: false };
    const t = z.survTier || 0, st = STUN[t]; z.stunCd = st[0];
    return { stun: st[1], knock: knock && t < 2 };
  }
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
      S.zq = Math.min(zqMax(), S.zq + zqMax() * (.005 + .004 * GM.hy) * (1 + IT('regen')) * dt);
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
    for (let i = S.later.length - 1; i >= 0; i--) { const q = S.later[i]; if ((q.t -= dt) <= 0) { S.later.splice(i, 1); if (!busy()) q.f(); } }
    if (S.poseOverride && (S.poseOverride.t -= dt) <= 0) S.poseOverride = null;
    if (W.retreat > 0 || W.between > 0) { S.wind = null; S.recov = null; return; }   // 鸣金后不再出手
    if (busy()) { if (S.wind && hero.st !== 'roll') { S.wind = null; } return; }
    if (S.wind) {
      S.wind.t += dt;
      if (!(Math.abs(hero.ix) > .1 || Math.abs(hero.iy) > .1)) { const t = nearest(200); if (t) hero.f = Math.sign(t.x - hero.x) || hero.f; }
      if (S.wind.t >= S.wind.dur) {
        const k = S.wind.k, i = S.wind.i, key = S.wind.key; S.flash[i] = .3;
        const t = nearest(200); if (t) hero.f = Math.sign(t.x - hero.x) || hero.f;
        CM = skillMul(key); if (RT.on && S.zq > zqMax() * .5) { CM *= 1.3; S.zq -= zqMax() * .05; } RM = lvOf(key) >= 5 ? 1.1 : 1; const ch = S.wind.ch; S.chain = ch; S.lastCat = wepOf(key); S.lastI = i;
        if (ch > 0) floaters.push({ x: hero.x, y: hero.y - 62, t: 0, txt: '连携 ×' + ch, color: '#9fe0ff' });
        S.lhjOn = S.lhjReady; S.lhjReady = false; if (S.lhjOn) S.noHitT = 0;
        CK = key; k.cast(); S.lhjOn = false;
        const l0 = lvOf(key); S.mast[key] = (S.mast[key] || 0) + AFX.xp(); if (lvOf(key) > l0) floaters.push({ x: hero.x, y: hero.y - 76, t: 0, txt: k.name + ' LV' + lvOf(key), color: '#ffd86e' });
        if (lvOf(key) >= 10) later(.2, () => { CM *= .6; k.cast(); });   // LV10 质变：多出一击
        CM = 1; RM = 1; CK = '';
        S.recov = { t: 0, dur: k.rc * CDM(), pose: k.pose[1], late: k.poseL }; S.wind = null;
        S.qi = (S.qi + 1) % 5; if (S.qi === 0) S.cycles++;
      }
      return;
    }
    if (S.recov) { if ((S.recov.t += dt) >= S.recov.dur) { S.recov = null; S.qt = -.2; } return; }   // 放完一招，隔 0.25 秒轮到下一招（没有各自冷却）
    if (!nearest(160)) { S.qt = 0; return; }
    for (let n = 0; n < 5 && !SK[S.slots[S.qi]]; n++) { S.qi = (S.qi + 1) % 5; if (S.qi === 0) S.cycles++; }
    if ((S.qt += dt) < .05) return;
    const k = SK[S.slots[S.qi]];
    if (k && nearest(k.need)) { const key = S.slots[S.qi], ch = S.lastCat === wepOf(key) && S.lastI === S.qi - 1 ? Math.min(4, S.chain + 1) : 0;   // 只算同一轮里紧挨着的前一槽；同一招重复、轮回到第 1 槽都不算
       S.wind = { i: S.qi, k, key, ch, t: 0, dur: k.wu * 1.2 * (OG().wu || 1) * CDM() * (1 - .2 * ch) }; S.hold = 0; return; }
    if (k && S.hold < 1.2) { S.hold += .05; S.qt = 0; return; }   // 这一招够不着人：等 1.2 秒，还不行就跳下一招
    S.skip[S.qi] = .2; S.qt = -.05; S.qi = (S.qi + 1) % 5; if (S.qi === 0) S.cycles++; S.hold = 0;
  }
  function onRoll() {
    hero.rollCd *= GM.dcd;
    if (S.qg === 'tiesha') for (const z of near(hero.x, hero.y, 64)) hit(z, .3 * RT.dmg, 110, Math.sign(z.x - hero.x) || hero.f, true, 0, .5, false, false, { secondary: true, survSkill: true });
    if (OG().roll) hero.rollCd *= OG().roll;   // 翻滚：前摇中 = 这一招作废、跳到下一招；后摇中 = 直接取消后摇
    if (S.wind) { S.skip[S.wind.i] = .35; S.wind = null; S.qi = (S.qi + 1) % 5; if (S.qi === 0) S.cycles++; S.qt = 0; floaters.push({ x: hero.x, y: hero.y - 50, t: 0, txt: '打断', color: '#9aa' }); }
    S.recov = null;
  }

  // ---------- 路线模式 ----------
  const maxHp = () => window.GEAR ? GEAR.maxHp() : 10;
  const heal = v => { hero.hp = Math.min(maxHp(), hero.hp + v); };
  // ---------- 节点结算：连选 n 次（武艺 / 强化 三选一）----------
  function rewardOptions(kind) {
    const owned = S.slots.filter(Boolean).concat(S.owned || []), free = true;   // 格子满了也能学（放进掌握武学）
    const sk = (free ? Object.keys(SK).filter(k => !owned.includes(k) && tierOk(k) && !SK[k].off && (!ONLY_DAO || wepOk(k))) : []).sort(() => Math.random() - .5).slice(0, kind === 'skill' ? 3 : 2).map(k => ({ kind: 'skill', k, q: Math.min(3, SK[k].tier || 0), name: SK[k].name, icon: SK[k].icon, color: SK[k].color, desc: (SK[k].tier ? TIERN[SK[k].tier] + '阶 · ' : '') + SK[k].desc }));
    const gp = Object.keys(GF).filter(id => { const g = GF[id]; return !g.off && (!ONLY_DAO || g.c < 2) && !S.gf.includes(id) && S.qg !== id && !(S.owned || []).includes(id) && W.n >= TMIN[g.t + 1]; });
    const pk = gp.sort(() => Math.random() - .5).map(id => { const g = GF[id]; return { kind: 'gf', id, q: g.t, name: g.n, icon: g.qg ? '轻' : g.n[0], color: GTC[g.t], desc: GTN[g.t] + '阶 · ' + (g.qg ? '轻功 · ' : g.c >= 0 ? g.cn + ' · ' : '内功 · ') + gfText(g) }; });
    if (pk.length < 3) pk.push({ kind: 'heal', name: '回春', icon: '春', color: '#ff9a9a', desc: '立刻回复 40% 血量' });
    if (kind === 'perk') return pk.slice(0, 3);
    return sk.concat(pk).slice(0, 3).sort(() => Math.random() - .5);
  }
  function offerReward(n, cb, i, kinds) {
    i = i || 1; if (i > n) { W.pick = false; if (cb) cb(); return; }
    const kind = kinds && kinds[Math.min(i, kinds.length) - 1], opts = rewardOptions(kind); W.pick = true;
    const old = document.getElementById('survPick'); if (old) old.remove();
    const box = document.createElement('div'); box.id = 'survPick';
    box.innerHTML = `<div class="p"><h3>战利 · ${kind === 'skill' ? '武艺 · ' : kind === 'perk' ? '心法 · ' : ''}${n > 1 ? '第 ' + i + '/' + n + ' 次 · ' : ''}三选一</h3><div class="row">${opts.map((o, j) => `<button data-j="${j}" class="q${o.q || 0}"><i style="font-style:normal;font-size:11px;opacity:.7">${o.kind === 'skill' ? '新武艺 · 主动' : o.kind === 'gf' ? '心法 · 被动' : '回血'}</i>${o.kind === 'skill' || o.kind === 'gf' ? `<div class="pkb">${bookOf(o)}</div>` : iconUrl(o.kind, o.k || o.id) ? `<em class="ic" style="background-image:url('${iconUrl(o.kind, o.k || o.id)}')"></em>` : `<b style="color:${o.color}">${o.icon}</b>`}<span>${o.name}</span><small>${o.desc}</small></button>`).join('')}</div>${S.slots.indexOf('') >= 0 ? '<p>新武艺放进空着的格子；格子满了就收进「掌握武学」，到整备屏「武学」页换上</p>' : ''}</div>`;
    box.querySelectorAll('button').forEach(b => b.onclick = () => {
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
    report(R);
    W.pick = true; setTimeout(() => prepOpen(nd), 1000);
  }
  function beginNode(nd) {
    if (!c2ok && typeof ensureAssets === 'function') ensureAssets('chapter2', { silent: true }).then(() => { c2ok = true; });
    GM = gfCalc(); S.zq = zqMax(); S.hp0 = hero.hp; S.noHitT = 0; S.xy = 0;
    S.k0 = typeof kills === 'number' ? kills : 0; S.coinGot = 0; S.taken = 0; S.hutiSum = 0; S.dps = {}; S.lastHp = hero.hp; S.coins = []; S.lvAt0 = S.lv; S.tutT = 0; S.stolen = 0; S.thiefCd = 8; S.catDone = false; TELE.length = 0; BOOM.length = 0;
    RT.node = nd; W.N = ROUTE.waves(nd); W.started = true; W.between = 0; W.pick = false; S.wind = null; S.recov = null; S.later = []; bolts.length = 0; zones.length = 0; fx.length = 0;
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
    const v = z.survTier >= 2 ? 15 : z.survTier === 1 && (z.T.elite || z.type === 'yellow-golem') ? 5 : 3 + (Math.random() * 3 | 0);
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
    const T = z.T, dx = hero.x - z.x, dy = hero.y - z.y, d = Math.hypot(dx, dy / YS) || 1, sp = T.spd * (z.survSlow > 0 ? .5 : 1) * dt;
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
    const sp = z.T.spd * (z.survSlow > 0 ? .5 : 1) * dt;
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
    hufu: { n: '护身符', d: '体魄 +1，护体 +5%', at: [1, 0, 0, 0, 0, 0], huti: .05 },
    modao: { n: '磨刀石', d: '短兵 +1', at: [0, 1, 0, 0, 0, 0] },
    qiangying: { n: '红枪缨', d: '长兵 +1，暴击 +2%', at: [0, 0, 1, 0, 0, 0], crit: .02 },
    bangtui: { n: '绑腿', d: '身法 +1，移速 +3%', at: [0, 0, 0, 1, 0, 0], move: .03 },
    pingan: { n: '平安符', d: '运气 +1', at: [0, 0, 0, 0, 1, 0] },
    bingshu: { n: '兵书残卷', d: '悟性 +1', at: [0, 0, 0, 0, 0, 1] },
    jiuhulu: { n: '酒葫芦', d: '调息效率 +15%（战后剩余真气化血更多）', tiao: .15 },
    huwan: { n: '铁护腕', d: '受到伤害 -4%', take: .04 },
    ganliang: { n: '干粮袋', d: '每打完一仗回复 6% 气血', after: .06 },
    chazhan: { n: '清茶盏', d: '真气回复 +25%', regen: .25 },
    yupei: { n: '玉佩', d: '暴击 +4%', crit: .04, q: 1 },
    yaoping: { n: '小药瓶', d: '立刻回复 40% 气血（用掉）', use: true },
  };
  const IT = k => (S.items || []).reduce((t, id) => t + ((ITEMS[id] && ITEMS[id][k]) || 0), 0);
  const itemAt = () => { const t = [0, 0, 0, 0, 0, 0]; for (const id of S.items || []) if (ITEMS[id] && ITEMS[id].at) ITEMS[id].at.forEach((v, i) => t[i] += v); return t; };
  const itemOf = id => ({ kind: 'item', id, q: ITEMS[id].q || 0, name: ITEMS[id].n, desc: ITEMS[id].d, price: ITEMS[id].use ? 12 : 22 + (ITEMS[id].q || 0) * 12, sell: 8 });

  // ---- 掉落与货品 ----
  const SELL = [6, 12, 20, 30, 40];
  function itemFrom(o) { return o.kind === 'heal' ? null : Object.assign({}, o, { price: (o.kind === 'skill' ? 24 : 18) + (o.q || 0) * 15, sell: SELL[o.q || 0] }); }
  const ownedAll = () => S.slots.filter(Boolean).concat(S.gf.filter(Boolean), S.qg ? [S.qg] : [], S.owned || []);
  function rollLoot(nd) {   // 拾取：普通战斗 1 本（四成 2 本），精锐 2 本 + 1 件道具，敌将 3 本 + 1 件道具
    const n = nd.type === 'boss' ? 3 : nd.type === 'elite' ? 2 : (Math.random() < .4 ? 2 : 1), out = [], seen = new Set(ownedAll());
    for (let i = 0; i < 6 && out.length < n; i++) for (const o of rewardOptions(i % 2 ? 'perk' : undefined)) { const it = itemFrom(o); const key = it && (it.k || it.id); if (it && !seen.has(key) && out.length < n) { seen.add(key); out.push(it); } }
    if (nd.type !== 'battle') { const ks = Object.keys(ITEMS).filter(k => !ITEMS[k].use); out.push(itemOf(ks[Math.random() * ks.length | 0])); }
    return out;
  }
  function rollShop(nd) {   // 行商：3 件道具 + 2 本秘籍（11/11 用户定 5 件），都能买，不能刷新；价格随层数涨（第 1 层 ×2，每 8 层再 +100%）
    const ks = Object.keys(ITEMS).sort(() => Math.random() - .5), out = ks.slice(0, 3).map(itemOf), seen = new Set(ownedAll().concat(S.loot.map(it => it.k || it.id)));
    let nb = 0; for (const o of rewardOptions(undefined).concat(rewardOptions('perk'), rewardOptions('skill'))) { const it = itemFrom(o); const key = it && (it.k || it.id); if (it && !seen.has(key) && nb < 2) { seen.add(key); out.push(it); nb++; } }
    const m = 2 * (1 + ((nd && nd.layer || 1) - 1) / 8); for (const it of out) it.price = Math.round(it.price * m);   // 11/11 用户定：整体 ×2，平均每关只买得起三件里的两件左右
    if (S.shopLock) { const L = S.shopLock; S.shopLock = null; const k = L.k || L.id; const j = out.findIndex(o => (o.k || o.id) === k); out.splice(j >= 0 ? j : 0, 1, Object.assign({}, L, { kept: 1 })); }   // 上一关锁定的货：原价留到这一关（只留一关）
    return out.sort((a, b) => (a.kind === 'item') - (b.kind === 'item') || (b.q || 0) - (a.q || 0));   // 秘籍在前，道具在后
  }
  function learn(it) {   // 格子满了也能学：先放进「掌握武学」，在武学页换上
    S.owned = S.owned || [];
    if (it.kind === 'skill') { const f = S.slots.indexOf(''); if (f >= 0) S.slots[f] = it.k; else S.owned.push(it.k); tut('learn'); }
    else if (it.kind === 'gf') { if (GF[it.id].qg) { if (!S.qg) S.qg = it.id; else S.owned.push(it.id); } else { const f = S.gf.indexOf(''); if (f >= 0) S.gf[f] = it.id; else S.owned.push(it.id); } GM = gfCalc(); }
    else if (it.kind === 'item') { if (ITEMS[it.id].use) heal(maxHp() * .4); else (S.items = S.items || []).push(it.id); GM = gfCalc(); }
    return true;
  }

  // ---- 整备屏（1:1 照群侠幸存者：结算 / 拾取 / 修炼 / 行商 / 武学）----
  let prepLastTab = '', prepNd = null, prepTab = 'jie', selLoot = 0, selWu = null, selShop = 0;
  const TABS = [['jie', '结算'], ['shi', '拾取'], ['xiu', '修炼'], ['shang', '行商'], ['wu', '武学']];
  const A = n => `art/ui/attr/${n}.webp`, PU = n => `art/ui/prep/${n}.webp`;
  const ATI = ['tipo', 'duan', 'chang', 'shen', 'yun', 'wu'];
  const ATD = ['提高气血，受到的伤害按比例减少', '提高刀、剑等短兵武艺伤害', '提高枪、关刀等长兵武艺伤害', '提高移动速度', '提高暴击率，修炼更容易出好品阶', '武艺、心法熟练度和修为涨得更快'];
  const icoOf = it => it.kind === 'item' ? `art/ui/item/${it.id}.webp` : iconUrl(it.kind, it.k || it.id) || '';
  const RQ = ['普通', '精良', '稀有', '绝世'], RQC = ['#e8e0d0', '#6fb8ff', '#c58cff', '#ffb347'];
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
    return `<div class="ab"><div class="md"><em style="background-image:url('${A('bag')}')"></em></div><div class="ar">${ai.map((r, i) => col(r[0], ATI[i], r[1], T(r[0], ATD[i] + '。3 为常人水平，修炼和道具可以提高。', '当前效果：' + r[2]))).join('')}<i class="sp"></i>`
      + col('气血', 'hp', Math.round(mh * 10), T('气血', '归零就倒下。打完一关不会自动回满，靠「调息」（剩余真气换成气血）和道具回血。', `当前 ${Math.ceil(hero.hp * 10)} / ${Math.round(mh * 10)}`))
      + col('真气', 'zq', Math.round(zqMax() * 10), T('真气', '护体：挨打时先扣真气，替你挡掉三成伤害。发劲：真气过半时出手自动加力，伤害 +30%。战斗中会慢慢回复，打完一关剩下的真气用来调息回血。', `当前 ${Math.round(S.zq * 10)} / ${Math.round(zqMax() * 10)}`))
      + col('会心', 'crit', Math.round(cr * 100) + '%', T('会心', '出手有几率打出会心一击，造成加倍伤害。运气、道具和心法都能提高。', `当前会心几率 ${Math.round(cr * 100)}%`))
      + col('修为', 'xiu', 'LV' + S.lv, T('修为', '杀敌和过关都会涨修为，每升一级攒一次「修炼」机会，在整备屏「修炼」页三选一提升属性。', `LV${S.lv}${need ? '，本级进度 ' + Math.round(S.xiu / need * 100) + '%' : ''}，待修炼 ${S.bank || 0} 次`))
      + `</div><div class="md"><em style="background-image:url('${A('wuxue')}')"></em></div></div>`;
  }
  function vitals() {
    const mh = maxHp(), zr = Math.max(0, S.zq / zqMax()), hr = hero.hp / mh;
    return `<div class="vt"><div class="vb"><em style="background-image:url('${A('zq')}')"></em><div class="vf zq"><u style="width:${zr * 100}%"></u><b>${Math.round(S.zq * 10)} / ${Math.round(zqMax() * 10)}</b></div></div><div class="vb"><em style="background-image:url('${A('hp')}')"></em><div class="vf hp"><u style="width:${hr * 100}%"></u><b>${Math.ceil(hero.hp * 10)} / ${Math.round(mh * 10)}</b></div></div></div>`;
  }
  // 武艺/心法一律画成线装秘籍（11/11 用户定：一眼和道具分开）：武艺红封面、心法青封面，包角/书脊是品质色，封面小窗放图标，右边竖题签写名字
  const BOOK_IMG = { wy0: 'art/ui/book/wy0.webp', wy1: 'art/ui/book/wy1.webp', wy2: 'art/ui/book/wy2.webp', wy3: 'art/ui/book/wy3.webp', xf0: 'art/ui/book/xf0.webp', xf1: 'art/ui/book/xf1.webp', xf2: 'art/ui/book/xf2.webp', xf3: 'art/ui/book/xf3.webp' };   // 用户的 Gemini 书封（art/gemini/秘籍书封.png 按连通区域切）：武艺红 / 心法青 × 白蓝紫橙
  function bookOf(it) {
    if (it.kind === 'item' || it.kind === 'heal') return `<em class="ico" style="background-image:url('${icoOf(it)}')"></em>`;
    const t = it.kind === 'skill' ? 'wy' : 'xf', q = Math.min(3, it.q || 0), im = BOOK_IMG[t + q];
    const sym = it.kind === 'skill' ? 'art/ui/attr/duan.webp' : GF[it.id] && GF[it.id].qg ? 'art/ui/attr/shen.webp' : 'art/ui/attr/tiaoxi.webp';   // 11/11 用户定 B：照群侠，书上不画各招的图，武艺统一画兵器（现在只开刀），心法画打坐，轻功画身法
    return `<div class="bk ${t}${im ? ' im' : ''}" style="--rc:${RQC[q]}${im ? `;background-image:url('${im}')` : ''}"><em style="background-image:url('${sym}')"></em><span>${it.name}</span></div>`;
  }
  function card(it, i, mode, onI, btns, extra) {   // 一张竖卡：秘籍/道具图 + 名字 + 品质 + 按钮；鼠标移上去（手机点一下）浮出详情
    const q = Math.min(3, it.q || 0), right = i >= 3;
    return `<div class="sc${extra || ''}" style="--rc:${RQC[q]}"><div class="ch2"><div class="ci">${bookOf(it)}</div><div><h3>${it.name}</h3><p class="rq" style="color:${RQC[q]}">${RQ[q]}</p><div class="tg">${tagsOf(it).map(t => `<span>${t}</span>`).join('')}</div></div></div>
      <h5>${it.kind === 'item' ? '道具属性' : it.kind === 'skill' ? '武艺效果' : '心法效果'}</h5><p class="ds">${it.desc}</p><div class="cb">${btns}</div></div>`;   // 11/11：照群侠，属性直接写在卡上，不用移上去看
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
          <h4>输出统计</h4>${outs}
          <h4>调息</h4><p class="ln">剩余 <em style="background-image:url('${A('zq')}')"></em> 真气 <b class="c1">${R.zqLeft || 0}</b> 点</p><p class="ln">转换为 <b class="c2">${R.tiao}</b> 点 <em style="background-image:url('${A('hp')}')"></em> 气血</p><p class="ln"><em style="background-image:url('${A('huti')}')"></em> 护体 总共免除了 <b>${Math.round((S.hutiSum || 0) * 10)}</b> 点伤害</p></div>
        <div class="pn"><h4>修为</h4>${bar(S.lv, Math.min(1, S.xiu / XIU_NEED(S.lv)), A('xiu'))}<h4>武艺</h4>${S.slots.filter(Boolean).map(k => bar(lvOf(k), mastR(k), IMGU[k])).join('')}<h4>心法</h4>${S.gf.concat([S.qg]).filter(Boolean).map(id => bar(gfLv(id), gfR(id), `art/ui/gf/${id}.webp`)).join('') || '<p class="em2" style="padding:6px 0">还没有心法</p>'}</div>`;
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
      const sel = selWu, o = sel && (isSk(sel) ? SK[sel] : GF[sel]);
      const det = o ? `<div class="dt"><div class="dh"><em style="background-image:url('${ic(sel)}')"></em><div><h3>${isSk(sel) ? o.name : o.n}</h3><p>${isSk(sel) ? (o.tier ? TIERN[o.tier] + '阶' : '基础') : GTN[o.t] + '阶'}</p><div class="tg">${(isSk(sel) ? ['武艺', '主动', '刀'] : [o.qg ? '轻功' : '心法', '被动']).map(t => `<span>${t}</span>`).join('')}</div></div></div>${isSk(sel) ? bar(lvOf(sel), mastR(sel)) : bar(gfLv(sel), gfR(sel))}<h5>效果</h5><p class="ds">${isSk(sel) ? o.desc : o.d}</p>${isSk(sel) ? `<p class="ds2">前摇 ${o.wu.toFixed(2)} 秒 · 收招 ${o.rc.toFixed(2)} 秒</p>` : ''}
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
    if (!RT.on || tutSeen[k] || !TUT[k]) return; tutSeen[k] = 1; try { localStorage.setItem(TUT_KEY, JSON.stringify(tutSeen)); } catch (e) {}
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
    S.lv = o.lv || 1; S.xiu = o.xiu || 0; S.bank = o.bank || 0; S.atAdd = o.atAdd || [0, 0, 0, 0, 0, 0];
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
    S.lv = 1; S.shopLock = null; S.xiu = 0; S.bank = 0; S.atAdd = [0, 0, 0, 0, 0, 0]; S.lvFx = 0; S.money = 0; S.coins = []; S.loot = []; S.shop = []; S.items = []; S.owned = []; S.hutiSum = 0; S.slots = [OG().skill || 'hengsao', '', '', '', '']; S.held = wepOf(S.slots[0]) < 7 ? wepOf(S.slots[0]) : null; S.mast = {}; S.dps = {}; S.gf = ['', '', '']; S.qg = ''; S.gfExp = {}; S.xy = 0; S.lhjReady = false; S.lhjOn = false; GM = GM0(); S.zq = zqMax(); S.hp0 = hero.hp; S.combo = 0; S.lk = typeof kills === 'number' ? kills : 0; S.chain = 0; S.lastCat = -1; S.lastI = -9; W.pick = false; const old = document.getElementById('survPick'); if (old) old.remove();
    W.started = true; W.between = 0; S.wind = null; S.recov = null; S.later = []; S.qi = 0; bolts.length = 0; zones.length = 0; S.cycles = 0; fx.length = 0;
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
    for (const z of zs) { if (z.stunCd > 0) z.stunCd -= dt; if (z.survSlow > 0) z.survSlow -= dt;
      if (z.dead || z.air) continue;
      if (z.rout > 0 || z.conf > 0) {   // 11/13 溃散：掉头逃；混乱：乱走、误伤旁人
        z.stun = Math.max(z.stun || 0, .06); const sp = (z.T.spd || 60) * dt;
        if (z.rout > 0) { z.rout -= dt; const a = Math.atan2(z.y - hero.y, z.x - hero.x); moveEnt(z, Math.cos(a) * sp * 1.2, Math.sin(a) * sp * .6); z.f = Math.sign(z.x - hero.x) || 1; }
        else { z.conf -= dt; if (!z.cdir || Math.random() < dt * 1.5) z.cdir = Math.random() * 7; moveEnt(z, Math.cos(z.cdir) * sp, Math.sin(z.cdir) * sp * .5); z.f = Math.cos(z.cdir) > 0 ? 1 : -1;
          if ((z.cbit = (z.cbit || 0) - dt) <= 0) { z.cbit = .6; const o = alive().find(q => q !== z && !q.air && Math.hypot(q.x - z.x, q.y - z.y) < 46); if (o) { CM = 1; CK = ''; HT(o, .5, 20, Math.sign(o.x - z.x) || 1); } } }
        z.moving = true; }
      if (S.windT > 0 && !tough(z)) moveEnt(z, Math.cos(S.windA) * 70 * dt, 0); }
    if (S.windT > 0) S.windT -= dt;
    skillTick(dt); bossTick(dt);
    for (const e of fx) e.t += dt;
    for (const b of bolts) {
      CM = b.cm || 1; CK = b.ck || ''; b.t += dt;
      if (b.home) { let t = null, bd = 260; for (const z of hittable()) { if (b.hitSet.includes(z)) continue; const d = Math.hypot(z.x - b.x, (z.y - b.y) * 2); if (d < bd) { bd = d; t = z; } }
        if (t) { const sp = Math.hypot(b.vx, b.vy * 2) || 200, ta = Math.atan2((t.y - b.y) * 2, t.x - b.x); let da = ta - b.a; while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2; b.a += Math.max(-5 * dt, Math.min(5 * dt, da)); b.vx = Math.cos(b.a) * sp; b.vy = Math.sin(b.a) * sp / 2; } }
      if (b.ret && !b.back && b.t > b.T / 2) { b.back = 1; b.vx = -b.vx; b.vy = -b.vy; b.a += Math.PI; b.hitSet = []; }
      b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.y < M.top - 4 || b.y > M.bot + 4) b.t = b.T;
      for (const z of hittable()) if (!b.hitSet.includes(z) && Math.abs(z.x - b.x) < (b.big ? 22 : 16) && Math.abs(z.y - b.y) < 16) { b.hitSet.push(z); if (b.big) { b.t = b.T; fx.push({ k: 'burst', x: b.x, y: b.y, r: 40, t: 0, T: .4, col: '242,201,76' }); for (const z2 of near(b.x, b.y, 40)) if (z2 !== z) HT(z2, b.dmg * .6, 30); } const f0 = freeze; rec((b.dmg || 1.8) * DM()); hit(z, (b.dmg || 1.8) * DM(), 40, Math.sign(b.vx) || hero.f, false, 0, .3, false, false, { secondary: true, survSkill: true }); freeze = Math.min(freeze, Math.max(f0, .03)); if (b.onHit) b.onHit(z, b); if (b.multi && b.hitSet.length >= b.multi) b.t = b.T; }
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
      const k = S.wind.k, p = S.wind.t / S.wind.dur, a = aim();
      ctx.save(); ctx.translate(hero.x, hero.y); ctx.scale(1, .5);
      ctx.fillStyle = `rgba(255,200,120,${.08 + .18 * p})`; ctx.strokeStyle = `rgba(255,220,150,${.3 + .5 * p})`; ctx.lineWidth = 1.5;
      if (k.beam) { ctx.rotate(a); ctx.fillRect(8, -14, (k.len || 180) * p, 28); ctx.strokeRect(8, -14, (k.len || 180) * p, 28); }   // 刀波：前方一条直线
      else if (k.ring) { ctx.beginPath(); ctx.arc(0, 0, k.range * (.4 + .6 * p), 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }   // 震地：脚下一整圈
      else { ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, k.range * (.4 + .6 * p), a - k.half, a + k.half); ctx.closePath(); ctx.fill(); ctx.stroke(); }
      ctx.restore();
    }
    for (const b of bolts) {   // 月牙刀波；石子、黄符、豆兵另画
      const p = b.t / b.T, al = 1 - p * p;
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
    for (const e of fx) {
      const p = e.t / e.T;
      if (e.k === 'drop') { const q = Math.min(1, p), y = e.y - 260 * (1 - q * q), x = e.x; ctx.save(); ctx.globalAlpha = .95; ctx.strokeStyle = 'rgba(20,20,30,.9)'; ctx.lineWidth = 2;
        if (e.what === 'sword') { ctx.fillStyle = '#eef6ff'; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 9, y - 80); ctx.lineTo(x, y - 96); ctx.lineTo(x + 9, y - 80); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#d8b050'; ctx.fillRect(x - 18, y - 100, 36, 8); ctx.fillRect(x - 4, y - 124, 8, 24); }
        else if (e.what === 'hammer') { ctx.fillStyle = '#7a5030'; ctx.fillRect(x - 4, y - 120, 8, 80); ctx.fillStyle = '#c08048'; ctx.beginPath(); ctx.ellipse(x, y - 30, 36, 30, 0, 0, 7); ctx.fill(); ctx.stroke(); }
        else if (e.what === 'arrow') { ctx.strokeStyle = '#fff0c0'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(x, y - 110); ctx.lineTo(x, y); ctx.stroke(); ctx.fillStyle = '#ff9a50'; ctx.beginPath(); ctx.moveTo(x, y + 6); ctx.lineTo(x - 10, y - 14); ctx.lineTo(x + 10, y - 14); ctx.closePath(); ctx.fill(); }
        else if (e.what === 'rock') { ctx.fillStyle = '#8a7a60'; ctx.beginPath(); ctx.arc(x, y - 20, 22, 0, 7); ctx.fill(); ctx.stroke(); ctx.fillStyle = 'rgba(255,140,60,.8)'; ctx.beginPath(); ctx.arc(x, y - 40, 16, 0, 7); ctx.fill(); }
        else if (e.what === 'palm') { ctx.fillStyle = 'rgba(255,210,100,.75)'; ctx.beginPath(); ctx.ellipse(x, y - 20, 50, 34, 0, 0, 7); ctx.fill(); for (let i = -2; i <= 2; i++) ctx.fillRect(x + i * 18 - 6, y - 80, 12, 40); }
        ctx.restore(); continue; }
      if (e.k === 'burst') { ctx.save(); ctx.translate(e.x, e.y); ctx.scale(1, .5); const r = e.r * (.4 + .6 * Math.min(1, p * 2)); ctx.fillStyle = `rgba(${e.col},${.28 * (1 - p)})`; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill(); ctx.strokeStyle = `rgba(255,250,230,${.9 * (1 - p)})`; ctx.lineWidth = 4 * (1 - p) + 1; ctx.stroke(); ctx.restore(); }
      else if (e.k === 'mark') { ctx.save(); ctx.translate(e.x, e.y); ctx.scale(1, .5); ctx.strokeStyle = `rgba(255,90,60,${.3 + .4 * p})`; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(0, 0, e.r, 0, 7); ctx.stroke(); ctx.restore(); ctx.strokeStyle = 'rgba(233,220,176,.9)'; ctx.lineWidth = 2; for (let i = 0; i < 4; i++) { const ox = (i - 1.5) * e.r * .4, yy = e.y * 1 - (1 - p) * 120; ctx.beginPath(); ctx.moveTo(e.x + ox, yy - 20); ctx.lineTo(e.x + ox, yy); ctx.stroke(); } }
      else if (e.k === 'bolt') { ctx.save(); ctx.strokeStyle = `rgba(235,240,255,${1 - p})`; ctx.lineWidth = 4 * (1 - p) + 1; ctx.beginPath(); let x = e.x, y = e.y - 170; ctx.moveTo(x, y); for (let i = 0; i < 6; i++) { x = e.x + R(-10, 10) * (i < 5); y += (e.y - (e.y - 170)) / 6; ctx.lineTo(x, y); } ctx.stroke(); ctx.restore(); }
      else if (e.k === 'line') { ctx.save(); ctx.translate(e.x, e.y - 14); ctx.scale(1, .5); ctx.rotate(e.a); const k = Math.min(1, p * 4); ctx.lineCap = 'round'; ctx.strokeStyle = `rgba(${e.col},${.55 * (1 - p)})`; ctx.lineWidth = e.w * 1.6 * (1 - p) + 4; ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(10 + e.L * k, 0); ctx.stroke(); ctx.strokeStyle = `rgba(255,255,255,${.95 * (1 - p)})`; ctx.lineWidth = 3; ctx.stroke(); ctx.restore(); }
    }
    for (const e of fx) {
      if (e.k === 'burst' || e.k === 'mark' || e.k === 'bolt' || e.k === 'line' || e.k === 'drop') continue;
      if (e.k === 'ghost') {   // 残影：半透明主角，带一道拖尾
        const q = Math.min(1, e.t / e.mt), x = e.x0 + (e.x1 - e.x0) * q, y = e.y0 + (e.y1 - e.y0) * q, al = .6 * (1 - Math.max(0, (e.t - e.mt) / (e.T - e.mt)));
        ctx.save(); ctx.strokeStyle = `rgba(200,225,255,${al * .5})`; ctx.lineWidth = 8; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(e.x0, e.y0 - 22); ctx.lineTo(x, y - 22); ctx.stroke(); ctx.restore();
        if (typeof drawChar === 'function') { ctx.save(); ctx.filter = 'brightness(1.6) saturate(.4)'; drawChar('hero', e.fr, x, y, e.flip, al); ctx.restore(); }
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
  himg('hengsao', 'art/ui/kaiju/sk_hengsao.webp'); himg('daobo', 'art/ui/kaiju/sk_daobo.webp'); himg('huima', 'art/ui/kaiju/sk_huima.webp'); himg('daolun', 'art/ui/kaiju/sk_daolun.webp');
  ['tuna','yangqi','tieyi','tayun','guanxing','taiping','hunyuan','gf00','gf01','gf02','gf03','gf30','gf31','gf32','gf33','qingshen','juqi','shixue','beishui','lhj','caoshang','xingyun','taxue','tiesha','yufeng'].forEach(id => himg('gf_' + id, 'art/ui/gf/' + id + '.webp'));
  const IMGU = { hengsao: 'art/ui/kaiju/sk_hengsao.webp', daobo: 'art/ui/kaiju/sk_daobo.webp', huima: 'art/ui/kaiju/sk_huima.webp', daolun: 'art/ui/kaiju/sk_daolun.webp' };
  const iconUrl = (kind, id) => kind === 'skill' ? IMGU[id] : kind === 'gf' && HIMG['gf_' + id] ? 'art/ui/gf/' + id + '.webp' : '';
  const hok = k => HIMG[k] && HIMG[k].complete && HIMG[k].naturalWidth;
  function waveBanner(title, sub) {   // 每个节点开打时的卷轴横幅（照群侠幸存者「第 1 波 · 迎战」）
    const old = document.getElementById('waveBan'); if (old) old.remove();
    const d = document.createElement('div'); d.id = 'waveBan';
    d.innerHTML = '<div class="t">' + title + '</div><div class="s">' + sub + '</div>';
    if (window.SFX) SFX.play('j_banner');
    document.body.appendChild(d); setTimeout(() => d.classList.add('out'), 1700); setTimeout(() => d.remove(), 2300);
  }
  function hud(HW) {
    hudT = performance.now(); buildUi();
    if (RT.on && RT.node && S.money != null) moneyHud();
    for (const id of ['bR', 'top']) { const e = document.getElementById(id); if (e && e.style.visibility) e.style.visibility = ''; }
    const HH = ctx.canvas.height / DPR, fine = !(window.matchMedia && matchMedia('(pointer:coarse)').matches), n = 5, sz = fine ? 44 : 38, sz0 = sz, gap = 6, w = n * sz + (n - 1) * gap;
    const lab = fine ? sz * .8 : 0, x0 = fine ? 16 + lab + 6 : (HW - w) / 2, y0 = fine ? HH - 16 - sz * 2 - 8 : (RT.on ? 60 : 44), labY = (fine ? 54 : y0 + sz + 4 + 26 + 18) + (RT.on ? 16 : 0);
    ctx.save();
    const slot = (x, y, k, cur, i, lbl, sz = sz0) => {
      ctx.fillStyle = 'rgba(8,7,6,.78)'; ctx.fillRect(x, y, sz, sz);   // 11/11：照群侠，格子近黑底 + 细暗金边，不再铺颜色
      if (k) {
        if (i >= 0 && S.flash[i] > 0) { ctx.fillStyle = k.color; ctx.globalAlpha = .45; ctx.fillRect(x, y, sz, sz); ctx.globalAlpha = 1; }
        if (i >= 0 && S.wind && S.wind.i === i) { ctx.fillStyle = 'rgba(255,230,140,.45)'; ctx.fillRect(x, y + sz * (1 - S.wind.t / S.wind.dur), sz, sz * S.wind.t / S.wind.dur); }   // 前摇进度
        if (k.ik && hok(k.ik)) ctx.drawImage(HIMG[k.ik], x, y, sz, sz); else { ctx.font = 'bold 20px "PingFang SC",sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = k.color; ctx.fillText(k.icon, x + sz / 2, y + sz / 2 + 1); }
        if (!cur) { ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(x, y, sz, sz); }   // 没轮到的格子压暗
        { const t = lbl != null ? lbl : 'LV' + lvOf(S.slots[i]); if (t) { ctx.font = '900 ' + (sz > 30 ? 9 : 8) + 'px "Arial Black",Impact,sans-serif'; ctx.textAlign = 'right'; ctx.textBaseline = 'alphabetic'; ctx.lineWidth = 2.5; ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(8,6,4,.95)'; ctx.strokeText(t, x + sz - 2, y + sz - 2); ctx.fillStyle = '#e6d3a4'; ctx.fillText(t, x + sz - 2, y + sz - 2); ctx.textAlign = 'left'; } }
      } else if (hok('empty')) { ctx.fillStyle = '#0b0705'; ctx.fillRect(x, y, sz, sz); ctx.globalAlpha = .3; ctx.drawImage(HIMG.empty, x, y, sz, sz); ctx.globalAlpha = 1; }   // 空格压暗，和有图标的格子拉开 else { ctx.font = 'bold 18px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#4a3a2a'; ctx.fillText('+', x + sz / 2, y + sz / 2 + 1); }
      if (i >= 0 && S.skip[i] > 0) { ctx.fillStyle = 'rgba(160,160,170,.5)'; ctx.fillRect(x, y, sz, sz); }
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
      const gg = ctx.createLinearGradient(0, y, 0, y + h); gg.addColorStop(0, c0); gg.addColorStop(.5, c1); gg.addColorStop(1, c2); ctx.fillStyle = gg; ctx.fillRect(bx, y, bw * rr, h);
      ctx.fillStyle = 'rgba(255,255,255,.16)'; ctx.fillRect(bx, y, bw * rr, h * .35);
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
      const bw = Math.min(HW * .42, 460), bx = (HW - bw) / 2, by = 6, bh = 13, r = Math.min(1, S.xiu / XIU_NEED(S.lv));
      ctx.save(); ctx.fillStyle = 'rgba(14,9,6,.82)'; ctx.fillRect(bx - 3, by - 2, bw + 6, bh + 4); ctx.strokeStyle = '#b08a4a'; ctx.lineWidth = 1; ctx.strokeRect(bx - 2.5, by - 1.5, bw + 5, bh + 3);
      const gx = ctx.createLinearGradient(0, by, 0, by + bh); gx.addColorStop(0, '#ffe08a'); gx.addColorStop(1, '#b8801e'); ctx.fillStyle = gx; ctx.fillRect(bx, by, bw * r, bh);
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
        if (hok('hourglass')) ctx.drawImage(HIMG.hourglass, x0, ty - ih / 2, ih, ih);
        ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(14,8,4,.95)'; ctx.fillStyle = urg && (performance.now() / 300 | 0) % 2 ? '#ff6a4a' : '#f3e6c8';
        ctx.strokeText(tt, x0 + ih + 4, ty + 1); ctx.fillText(tt, x0 + ih + 4, ty + 1);
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
        const g = ctx.createLinearGradient(0, iy, 0, iy + ih); g.addColorStop(0, '#f05a44'); g.addColorStop(.5, '#c02a22'); g.addColorStop(1, '#6c1210'); ctx.fillStyle = g; ctx.fillRect(ix, iy, iw * r, ih);
        ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(ix, iy, iw * r, ih * .35);
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
  function pose() {
    if (S.poseOverride) return S.poseOverride.f;
    if (S.recov) return S.recov.late && S.recov.t > S.recov.dur * .55 ? S.recov.late : S.recov.pose;
    if (S.wind && (hero.st !== 'walk' || S.wind.dur - S.wind.t < .16)) return S.wind.k.pose[0];   // 边走边打时，出手前 0.16 秒也露一下起手帧
    return null;
  }
  const rooted = () => !!S.recov;
  // 隐藏普攻和换武器按钮
  const st = document.createElement('style'); st.textContent = '#bA,#bWeapon,#wp button[data-w]{display:none!important}'
    + '#waveBan{position:fixed;left:50%;top:34%;transform:translate(-50%,-50%);width:min(70vw,620px);aspect-ratio:900/307;background:url(art/ui/hud/banner.webp) center/contain no-repeat;z-index:10010;pointer-events:none;display:flex;flex-direction:column;align-items:center;justify-content:center;padding-top:3%;animation:wbIn .35s ease-out;transition:opacity .5s}'
    + '#waveBan.out{opacity:0}#waveBan .t{font:900 clamp(24px,4.4vw,44px) "Songti SC","STSong","Noto Serif SC",serif;letter-spacing:.3em;text-indent:.3em;color:#f0c66a;text-shadow:0 2px 0 #3a2410,0 0 12px rgba(0,0,0,.8)}'
    + '#waveBan .s{margin-top:0;padding:0 22px;font:700 clamp(13px,1.8vw,18px) "PingFang SC",sans-serif;letter-spacing:.4em;color:#fff2d8;background:radial-gradient(ellipse,rgba(200,200,200,.35),transparent 70%)}@keyframes wbIn{from{opacity:0;transform:translate(-50%,-50%) scale(.85)}}'
    + '@media (pointer:fine){#joy{display:none!important}}'
    + '#bR{background:#241812 url(art/ui/hud/dodge.webp) center/cover no-repeat!important;border-radius:8px!important;border:1px solid #c9a24a!important;font-size:0!important;width:60px!important;height:60px!important}'
    + '@media (pointer:fine){#bR:after{content:"空格";position:absolute;left:0;right:0;bottom:-18px;font:700 12px "PingFang SC",sans-serif;color:#f3dc9a;text-shadow:0 1px 2px #000}}'
    + '#bPause{background:url(art/ui/hud/pause.webp) top center/100% auto no-repeat!important;border:0!important;width:44px!important;height:63px!important;box-shadow:none!important}#bPause .pause-icon-bar{display:none!important}'
    + '#survPick button.q0,#survPick button.q1,#survPick button.q2,#survPick button.q3{background:center/100% 100% no-repeat!important;border:0!important;width:156px!important;min-height:222px;padding:22px 14px 18px!important;justify-content:center;gap:4px;border-radius:0!important}'
    + '#survPick button.q0{background-image:url(art/ui/card/q0.webp)!important}#survPick button.q1{background-image:url(art/ui/card/q1.webp)!important}#survPick button.q2{background-image:url(art/ui/card/q2.webp)!important}#survPick button.q3{background-image:url(art/ui/card/q3.webp)!important}'
    + '#survPick button.q0:hover,#survPick button.q1:hover,#survPick button.q2:hover,#survPick button.q3:hover{transform:translateY(-4px);filter:brightness(1.15)}'
    + '#survPick em.ic{display:block;width:64px;height:64px;background:center/cover;border-radius:3px;box-shadow:0 0 0 1px rgba(216,176,96,.6);margin:4px 0}'
    + '@media (max-height:520px){#survPick button.q0,#survPick button.q1,#survPick button.q2,#survPick button.q3{width:130px!important;min-height:180px;padding:16px 10px 12px!important}#survPick em.ic{width:48px;height:48px}}'
    + '#survRep{position:fixed;left:14px;bottom:calc(120px + env(safe-area-inset-bottom));z-index:10011;display:flex;gap:12px;align-items:center;padding:8px 16px;background:linear-gradient(90deg,rgba(16,10,6,.92),rgba(16,10,6,.6));border-left:3px solid #d8b060;color:#f6e6c4;font:700 15px "PingFang SC",sans-serif;animation:repIn .35s ease-out;transition:opacity .5s;pointer-events:none}#survRep b{color:#ffd86e;font-family:"Songti SC","Noto Serif SC",serif;letter-spacing:.2em}#survRep.out{opacity:0}@keyframes repIn{from{transform:translateX(-30px);opacity:0}}'
    + PREP_CSS
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
    const res = R.cnt.map((n, c) => n >= 2 ? `<div class="r"><b>${WEPN[c]}共鸣 ${n} 件</b><span class="v">${WEPN[c]}武艺伤害 +${Math.round(RESD[Math.min(5, n)] * 100)}%</span></div>` : '').join('') || '<div class="r" style="opacity:.5">还没有（同一种兵器的武艺 2 件起）</div>';
    const gfRows = S.gf.map((id, i) => { const g = GF[id]; return !g ? `<div class="r" style="opacity:.4">内功 ${i + 1} · 空</div>` : `<div class="r"><b style="color:${GTC[g.t]}">${g.n}</b> <span class="t">${GTN[g.t]}阶 · ${g.c >= 0 ? g.cn + '心法' : '通用'} · LV${gfLv(id)} · 杀敌 ${S.gfExp[id] || 0}</span><span class="mv"><button data-gx="${i}">✕</button></span></div><div class="gd">${gfText(g)}</div>`; }).join('');
    const qgRow = GF[S.qg] ? `<div class="r"><b style="color:${GTC[GF[S.qg].t]}">${GF[S.qg].n}</b> <span class="t">${GTN[GF[S.qg].t]}阶</span><span class="mv"><button data-qx="1">✕</button></span></div><div class="gd">${GF[S.qg].d}</div>` : '<div class="r" style="opacity:.4">空（战利品里可能出现轻功）</div>';
    const mx = Math.max(...R.cnt), ex = [mx >= 3 ? '受伤 -5%' : '', mx >= 4 ? '出招 -5% 间隔' : '', mx >= 5 ? '出招再快（共 -10%）' : ''].filter(Boolean).join('，');
    return `<div class="bp"><h3>构筑总览 <button class="x">✕</button></h3>
      <h4>出身 · ${o.name}</h4><div style="font-size:12px">${cats}</div><div style="font-size:11px;opacity:.6">出身对各类武艺的熟练系数：跨类也能用，只是偏弱</div>
      <h4>武艺（按 1→5 顺序放，可用 ▲▼ 调顺序）</h4>${rows}
      <h4>兵器共鸣</h4>${res}${ex ? `<div style="font-size:11px;opacity:.7;margin-top:2px">额外：${ex}</div>` : ''}
      <h4>连携</h4><div style="font-size:12px">相邻两招用同一种兵器，后一招前摇缩短，逐次叠加最多 -80%；换兵器就断。当前：${S.chain > 0 ? '×' + S.chain : '无'}</div>
      <h4>内功（同类心法装得越多，专精越高、升级越快）</h4>${gfRows}
      <h4>轻功</h4>${qgRow}
      <h4>真气</h4><div style="font-size:12px">${Math.round(S.zq * 10)} / ${Math.round(zqMax() * 10)}　<span style="opacity:.65">护体：受伤时真气挡 30%；发劲：真气过半时武艺自动 +30% 伤害、每招耗 5% 真气；战后剩余的 30% 化成气血</span></div></div>`;
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
    const r = [['体魄', at[0], '气血 ' + pct(AFX.hp() - 1), '越高越扛打：受到的伤害按比例减少'], ['短兵', at[1], '刀锤武艺 ' + pct(growOf(0) - 1), '修炼提升短兵：刀、锤等武艺的伤害成长'], ['长兵', at[2], '枪刀武艺 ' + pct(growOf(1) - 1), '修炼提升长兵：枪、关刀等武艺的伤害成长'],
      ['身法', at[3], '移速 ' + pct(AFX.move() - 1), '移动速度'], ['运气', at[4], '暴击 ' + pct(AFX.crit()), '暴击率（基础 5%）'], ['悟性', at[5], '熟练 ' + pct(AFX.xp() - 1), '武艺、心法熟练度涨得更快']];
    origin = o0; S.atAdd = d0; return r; };
  const status = () => ({   // 路线长卷「兵籍牒」用：这一局的当前状态（11/11）
    origin: OG().name, money: S.money || 0, lv: S.lv || 1, pct: Math.floor(Math.min(1, (S.xiu || 0) / XIU_NEED(S.lv || 1)) * 100), bank: S.bank || 0,
    hp: hero ? [Math.ceil(hero.hp * 10), Math.round(maxHp() * 10)] : [0, 0], attrs: attrInfo(origin, true), base: AT0(), add: (S.atAdd || []).slice(),
    slots: S.slots.map(k => k && SK[k] ? { name: SK[k].name, icon: SK[k].icon, color: SK[k].color, desc: SK[k].desc, lv: lvOf(k) } : null),
    gf: S.gf.map(id => id && GF[id] ? { name: GF[id].n, desc: GF[id].d, lv: gfLv(id) } : null), qg: S.qg && GF[S.qg] ? { name: GF[S.qg].n, desc: GF[S.qg].d } : null,
    dmg: RT.dmg });
  window.SURV = { curNode: () => RT.on && W.started ? RT.node : null, status, attrInfo, addXiu: n => addXiu(n), heldPre: () => heldPre(), dbg: () => ({ gf: S.gf.slice(), qg: S.qg, zq: S.zq, zqMax: zqMax(), exp: S.gfExp, GM }), giveGf: id => { if (GF[id]) { if (GF[id].qg) S.qg = id; else { const f = S.gf.indexOf(""); if (f >= 0) S.gf[f] = id; } } }, newHud: () => RT.on && !!RT.node, stunGate, noStun: () => RT.on, get slots() { return S.slots; }, SK, beginNode, frozen: () => RT.on && (ROUTE.shown() || buildOpen), routeHp: () => [hero.hp, maxHp()], camp(k) { if (k === 'heal') heal(maxHp() * .3); else RT.dmg *= 1.1; }, ORIGINS, setOrigin(k) { if (ORIGINS[k] && !ORIGINS[k].locked) origin = k; }, origin: () => origin, takeMul: () => {
      if (RT.on && GM.block && Math.random() < GM.block) { floaters.push({ x: hero.x, y: hero.y - 50, t: 0, txt: '格挡', color: '#bfe0ff' }); return 0; }
      const mv = Math.abs(hero.ix) > .1 || Math.abs(hero.iy) > .1, low = hero.hp / maxHp() < .3 ? 1 - .10 * GM.low : 1;
      return (OG().take || 1) / AFX.hp() * (1 - IT('take')) * RT.take * RES().take * GM.take / GM.hp * low * (S.qg === 'taxue' && mv ? .85 : 1) * (GM.still && S.stillT > 1 ? 1 - GM.still : 1);
    },
    absorb: n => { if (!RT.on || S.zq <= 0) return n; const a = Math.min(S.zq, n * (.3 + IT('huti'))); S.zq -= a; S.hutiSum = (S.hutiSum || 0) + a; return n - a; },   // 护体（11/11 用户定，照群侠幸存者）：真气只挡 30% 伤害，其余直接扣血；真气空了全扣血
     moveMul: () => (OG().move || 1) * AFX.move() * (1 + IT('move')) * RT.move * GM.spd, left: () => RT.on && RT.node && W.started ? Math.max(0, WT() - W.t) : null, reward: (n, cb) => offerReward(n, cb), event(k, cb) { eventDo(k, cb); }, SK, tick, drawWorld, hud, thief: thiefAI, unitAI: (z, dt) => unitAI(z, dt), startRun, waveFlow, pose, rooted, onRoll, skipWave() { if (W.retreat <= 0 && W.between <= 0 && W.started) endWave(); }, state: () => ({ wave: W.n, t: W.t, slots: S.slots.slice() }) };
})();
