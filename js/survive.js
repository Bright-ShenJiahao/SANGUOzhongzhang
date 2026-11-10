// 三国终章：全自动出招 + 20 波限时（用户定 11/09）
// - 取消普攻/蓄力，只用大刀；身上 5 个招式格按 1→5 顺序自动放（周天），目前只有「横扫」「连斩」两招。
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
let CM = 1, RM = 1, CK = '';   // CK：当前出手的招式（统计输出用）   // CM：当前这一招的伤害倍率（出身熟练×共鸣×熟练度）；RM：范围倍率
  const DM = () => RT.dmg * CM * critRoll();
  const rec = d => { if (CK) S.dps[CK] = (S.dps[CK] || 0) + d; };
const bossCount = () => RT.on ? (RT.node ? (RT.node.type === 'boss' ? 2 : RT.node.type === 'elite' ? 1 : 0) : 0) : (BOSS_WAVES[W.n] || 0);
const W = { n: 0, k: 0, N: 0, t: 0, retreat: 0, spawnT: 0, batchT: 0, bossDone: false, between: 0, started: false };
  const WT = () => RT.on ? W.tot : (WAVE_T[Math.min(W.n, WAVES) - 1] || 60);   // 路线模式：一个节点是一整场连续的仗，时长 = 原来几波加起来
  const CNT_BASE = 28, CNT_STEP = 6.2, CNT_MAX = 180;   // 路线模式：场上同屏人数 = 28 + 6.2×(难度级-1)，1 级约 28 只，10 级约 84，20 级约 146；难度级随时间连续上升，所以人数是一路慢慢涨
  const targetN = () => RT.on ? Math.min(CNT_MAX, Math.round(CNT_BASE + CNT_STEP * ((W.lvF || 1) - 1))) : Math.max(8, Math.round((WAVE_N[W.n - 1] || 100) * N_SCALE));
  // ---------- 路线模式：按「段」和「节点标签」出兵 ----------
  // 单位简写：g 喽啰 b 刀手 s 投石 a 弓箭 p 方士 e 老卒 | 第二章兵（贴图没加载完时用刀手/老卒顶替）：h 大刀 d 盾 q 枪 l 力士
  const U = { g: ['grunt'], b: ['blade'], s: ['slinger'], a: ['archer'], p: ['priest'], e: ['elite'], h: ['yellow-heavy', 'blade'], d: ['yellow-shield', 'blade'], q: ['yellow-spear', 'blade'], l: ['yellow-golem', 'elite'] };
  const POOL = [   // [段][标签] = 单位:权重
    { melee: { g: 100, b: 20 }, raid: { b: 70, g: 40 }, range: { g: 50, s: 50 }, shield: { b: 50, g: 40, s: 15 }, patrol: { g: 60, b: 40, e: 5 } },
    { melee: { g: 60, b: 50, h: 20 }, raid: { b: 50, h: 50, g: 20 }, range: { b: 30, s: 40, a: 30 }, shield: { d: 50, h: 30, s: 20 }, patrol: { b: 50, h: 40, e: 8 } },
    { melee: { q: 60, b: 40, g: 30 }, raid: { b: 40, h: 40, q: 30 }, range: { q: 30, a: 60, s: 30 }, shield: { d: 40, q: 50, a: 20 }, patrol: { q: 50, h: 40, e: 8, l: 4 } },
    { melee: { h: 50, q: 50, g: 20 }, raid: { h: 60, q: 40, b: 20 }, range: { h: 25, a: 50, s: 30, p: 10 }, shield: { d: 50, q: 40, a: 20, p: 10 }, patrol: { h: 50, q: 40, e: 10, l: 6 } },
    { melee: { h: 50, q: 50, g: 20 }, raid: { h: 60, q: 40, b: 20 }, range: { h: 25, a: 50, s: 30, p: 10 }, shield: { d: 50, q: 40, a: 20, p: 10 }, patrol: { h: 50, q: 40, e: 10, l: 6 } },
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
  const BOSSES = [
    [{ t: 'yellow-golem', fb: 'elite', name: '程远志', hp: 70, sc: 1.3 }, { t: 'elite', name: '邓茂', hp: 40, sc: 1.15 }],
    [{ t: 'yellow-heavy', fb: 'elite', name: '波才', hp: 80, sc: 1.35 }, { t: 'yellow-spear', fb: 'elite', name: '何仪', hp: 50, sc: 1.15 }],
    [{ t: 'yellow-heavy', fb: 'elite', name: '管亥', hp: 95, sc: 1.4 }, { t: 'yellow-spear', fb: 'elite', name: '张曼成', hp: 55, sc: 1.2 }],
    [{ t: 'zhang_liang', fb: 'elite', name: '张梁', m: 1.4 }, { t: 'zhang_bao', fb: 'elite', name: '张宝', m: 1.5 }],
    [{ t: 'zhang_jiao', fb: 'elite', name: '张角', m: 1.0 }, { t: 'yellow-heavy', fb: 'elite', name: '马元义', hp: 90, sc: 1.4 }],
  ];
  function spawnNamed() {
    const nd = RT.node;
    if (nd.type === 'elite') {
      const sec = secOf(nd), t = sec >= 2 && c2ok ? 'yellow-golem' : 'elite';
      edgeSpawn(t, { name: '精锐头目', hp: 21, sc: 1.2, tier: 2 }); return;
    }
    const list = BOSSES[nd.final ? 4 : secOf(nd)];
    list.forEach((b, i) => edgeSpawn(c2ok || !b.fb ? b.t : b.fb, Object.assign({}, b, { tier: i === 0 ? 3 : 2, hp: i === 0 ? 54 : 21 })));   // 四档：小头目 ×7（21）、首领 ×18（54）
  }
  function edgeSpawn(type, boss) {   // boss：true = 老卒式 ×4 血；对象 = 命名首领 {name, hp 或 m, sc}
    const vw = viewW(); let side = Math.random() < .5 ? -1 : 1, x, y;
    if (window.ARENA && ARENA.on()) { const p = ARENA.edge(); x = p.x; y = p.y; side = x < hero.x ? -1 : 1; }   // 俯视竞技场：四周都刷
    else { x = side < 0 ? cam.x + 6 : cam.x + vw - 6; x = Math.max(arenaL + 14, Math.min(lockR - 14, x)); y = R(M.top + 6, M.bot - 6); }
    spawn(type, x, y);
    const z = zs[zs.length - 1]; z.f = -side; z.survMul = 1 + HP_SCALE * (W.n - 1);
    z.survTier = 0;
    if (!boss && (z.T.elite || ['yellow-heavy', 'yellow-shield', 'yellow-golem'].includes(type))) { z.survTier = 1; z.hp = 7.5; z.maxHp = z.hp * z.survMul; }   // 四档：杂兵 ×1（3）、精英 ×2.5（7.5）
    z.hp *= z.survMul;
    if (boss && boss !== true) { z.survTier = boss.tier || 2; const hb = boss.hp || 21; z.hp = hb * z.survMul; z.maxHp = z.hp; z.sc = (z.sc || 1) * (boss.sc || 1); z.survBoss = true; z.bossLabel = boss.name; floaters.push({ x: z.x, y: z.y - 60, t: 0, txt: boss.name + ' 出阵！', color: '#ff6a4a' }); }
    else if (boss) { z.hp *= 4; z.sc = (z.sc || 1) * 1.25; z.survBoss = true; floaters.push({ x: z.x, y: z.y - 60, t: 0, txt: '敌将出阵！', color: '#ff6a4a' }); }
    return z;
  }
  function startWave(n) {
    if (RT.on) {   // 路线模式：一个节点 = 一整场连续的仗（不分波、不鸣金）。难度从「本节点第 1 波」平滑爬到「最后一波」的级别
      const nd = RT.node, L = ROUTE.layers(), N0 = ROUTE.waves(nd);
      const lvOf = k => Math.max(1, Math.min(WAVES, 1 + Math.floor(((nd.layer - 1 + (k - 1) / N0) / L) * WAVES) + (nd.type === 'elite' ? 2 : 0) + (nd.type === 'boss' ? 2 : 0)));
      W.lv0 = lvOf(1); W.lv1 = lvOf(N0); W.tot = 0; for (let k = 1; k <= N0; k++) W.tot += (WAVE_T[lvOf(k) - 1] || 60) * ROUTE.TIME_K;
      W.tot = nd.type === 'boss' ? (nd.final ? 180 : 100) : nd.type === 'elite' ? 85 + 25 * nd.layer / L : 50 + 15 * nd.layer / L;   // 用户定 11/09：首领 3 分钟；精英约 1.5~2 分钟；普通战斗约 50~65 秒（18 层）
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
    if (W.pick) return;   // 正在选招式
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
        if (!offerSkill() && window.ROGUE) ROGUE.offer();   // 波间：还有没学会的招式就先选招式，否则选锦囊
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
    if (RT.on && RT.node && RT.node.type === 'boss' && W.bossDone && W.t > 3 && !alive().some(z => z.survBoss)) { say(RT.node.final ? '黄巾首领已破！' : '敌将已破！', 1.6); W.t = WT(); }   // 首领战：把场上的敌将都打倒就算赢
    if (W.t >= WT()) endWave();
  }

  // ---------- 招式（代码画） ----------
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
  // 用户定 11/09：招式没有各自冷却，1→5 依次放（放完一招才轮到下一招）；前摇/后摇照三国幸存者
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

  // ---------- 三国幸存者招式（黄玄地天；tier 0 基础 / 黄 / 玄 / 地 / 天） ----------
  const TIERN = ['基础', '黄', '玄', '地', '天'], TMIN = [0, 0, 2, 4, 6];
  const tierOk = k => W.n >= TMIN[SK[k].tier || 0];
  const HT = (z, dmg, kb, dir, fr) => { rec(dmg * DM()); const f0 = freeze; hit(z, dmg * DM(), kb, dir || hero.f, false, 0, .3, false, false, { secondary: true, survSkill: true }); freeze = Math.min(freeze, Math.max(f0, fr || .04)); };
  const near = (x, y, r) => hittable().filter(z => Math.hypot(z.x - x, (z.y - y) * 2) < r + 6);
  function blast(x, y, r, dmg, kb, col) { r *= RM; fx.push({ k: 'burst', x, y, r, t: 0, T: .4, col: col || '255,210,120' }); for (const z of near(x, y, r)) HT(z, dmg, kb, Math.sign(z.x - x) || hero.f); }
  function lineHit(a, L, w, dmg, kb, col) {
    L *= RM;   // 朝 a 方向一条宽 w 的直线（清版透视：y 压一半）
    const vx = Math.cos(a), vy = Math.sin(a) / 2, x0 = hero.x, y0 = hero.y;
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
  add('daolun', { name: '刀轮', icon: '轮', color: '#cfe8ff', desc: '身周刀轮旋转三秒', need: 90, wu: .5,
    cast() { S.poseOverride = { f: 'wd_hx2', t: .14 }; zones.push({ x: 0, y: 0, follow: 1, r: 40, t: 0, T: 3, tk: 0, dmg: .7, kind: 'wheel' }); sfx('swing_knife', hero.x); } });
  add('xuanfeng', { tier: 2, name: '回旋斩', icon: '旋', color: '#a0d0ff', desc: '周身 360° 回旋一斩', need: 80, range: 66, half: Math.PI,
    cast() { sweep(0, Math.PI, 66, 2.5, 55, ['rgba(160,210,255,', 'rgba(225,245,255,']); sfx('swing_knife', hero.x); shake = Math.max(shake, .15); } });
  add('dilie', { tier: 3, name: '地裂波', icon: '裂', color: '#d8a060', desc: '向前裂开长长一道地缝', need: 200, beam: true, len: 200, wu: .7, rc: .4,
    cast() { lineHit(aim(), 200, 18, 3.4, 60, '230,170,100'); sfx('crack', hero.x); shake = Math.max(shake, .3); } });
  add('shuanghuan', { tier: 3, name: '双环击飞', icon: '环', color: '#ffd27a', desc: '内外两环依次震飞', need: 90, range: 80, half: Math.PI, ring: true, wu: .7, rc: .4,
    cast() { blast(hero.x, hero.y, 46, 2.2, 70); later(.25, () => blast(hero.x, hero.y, 80, 2.6, 80)); sfx('crack', hero.x); shake = Math.max(shake, .3); } });
  add('xuehe', { tier: 3, name: '血河斩', icon: '血', color: '#ff5050', desc: '一道又宽又长的血色刀光', need: 180, beam: true, len: 180, wu: .7, rc: .4,
    cast() { lineHit(aim(), 180, 32, 3.8, 50, '255,70,70'); sfx('swing_knife', hero.x); shake = Math.max(shake, .3); } });
  add('sixiang', { tier: 4, name: '四象剑气', icon: '象', color: '#c8b0ff', desc: '四向射出穿透剑气', need: 200, wu: .7, rc: .4,
    cast() { S.poseOverride = { f: 'wj_hx2', t: .14 }; const a = aim(); for (let i = 0; i < 4; i++) shot(a + i * Math.PI / 2, { dmg: 2.6, T: 1, col: ['180,150,255', '245,235,255'] }); sfx('swing_knife', hero.x); shake = Math.max(shake, .2); } });
  add('tianbeng', { tier: 4, name: '天崩地裂', icon: '崩', color: '#ffae54', desc: '身周巨震，再引六处崩裂', need: 120, none: true, wu: .9, rc: .5,
    cast() { blast(hero.x, hero.y, 100, 3.8, 90); pts(6, 240).forEach(([x, y], i) => later(.2 + i * .12, () => blast(x, y, 44, 2.4, 50))); sfx('crack', hero.x); shake = Math.max(shake, .5); } });
  add('wanren', { tier: 4, name: '万刃归宗', icon: '万', color: '#b8f0ff', desc: '十四柄飞刃自四面八方袭来', need: 200, none: true, wu: .8, rc: .5,
    cast() { for (let i = 0; i < 14; i++) later(i * .05, () => { const a = i * Math.PI * 2 / 14 + R(-.1, .1); shot(a, { dmg: 1.6, T: .9, vx: Math.cos(a) * 300, vy: Math.sin(a) * 150, col: ['170,235,255', '255,255,255'] }); }); sfx('swing_knife', hero.x); shake = Math.max(shake, .2); } });
  // ---------- 出身（开局配置里选；起手只有 1 个招式） ----------
  const ORIGINS = {
    nongfu: { name: '农夫', tag: '短兵器', skill: 'hengsao', desc: '庄稼汉，挨得住打。受到伤害 -20%', take: .8, oa: [5, 4, 2, 1, 1, 2, 1, 3] },
    xiaozu: { name: '小卒', tag: '长兵器', skill: 'daolun', desc: '行伍出身，出手利落。招式前摇 -20%', wu: .8, oa: [4, 4, 5, 1, 1, 2, 1, 3] },
    liehu: { name: '猎户', tag: '远程', skill: 'daobo', desc: '山里跑惯了。移动速度 +12%', move: 1.12, oa: [3, 4, 1, 5, 1, 4, 1, 3] },
    shusheng: { name: '书生', tag: '术法', skill: 'huima', desc: '手无缚鸡之力，却通术法。术法招式最强，近战偏弱', oa: [2, 1, 1, 1, 1, 2, 6, 4] },
  };
  let origin = 'nongfu';
  const OG = () => ORIGINS[origin] || ORIGINS.nongfu;
  // ---------- 招式类别 / 出身熟练 / 类别共鸣 / 连携 / 熟练度 ----------
  // 大类（出身熟练、功法专精）→ 具体兵器（连携、共鸣、施法时手里拿什么）
  const CATN = ['短兵器', '长兵器', '远程', '法师'], CATA = [1, 2, 3, 6];   // 大类 → 出身属性下标
  const WEPN = ['刀', '剑', '锤', '枪', '关刀', '弓', '弩', '石子', '法术'], WEPCAT = [0, 0, 0, 1, 1, 2, 2, 2, 3];
  const WOF = { hengsao: 0, daobo: 0, huima: 0, daolun: 0, lianzhan: 1, sixiang: 1, wanren: 1, zhendi: 2, dilie: 2, shuanghuan: 2, tianbeng: 2, qiang: 3, chong: 3, xuanfeng: 4, xuehe: 4, jianyu: 5, huogong: 8, pili: 8 };
  const wepOf = k => WOF[k] != null ? WOF[k] : 0;
  const ONLY_DAO = true;   // 用户定 11/10：目前只有刀的美术，招式奖励只出刀系；其他武器等美术补齐再开
  const catOf = k => WEPCAT[wepOf(k)];
  // 招式姿势：主角固定空手，放招时按这一招的兵器举起对应的施招帧（第 1 帧蓄力，第 2 帧出手，更多帧给第二刀和收势）
  // FRW 下标同 WEPN：[帧名前缀, 帧数]；法术暂按招式配法器，之后改成按装备的法器
  const FRW = [['dao', 4], ['jian', 4], ['chui', 2], ['qiang', 4], ['guandao', 5], ['gong', 2], ['nu', 2], ['shi', 2], ['zhang', 3]];
  const MAGE_FR = { huogong: 'shan', pili: 'fu' }, RECOV_N = { hengsao: 3, xuanfeng: 3, xuehe: 4, pili: 3 };
  for (const k of Object.keys(SK)) {
    const w = wepOf(k), [pre, n] = w === 8 && MAGE_FR[k] ? [MAGE_FR[k], 3] : FRW[w], f = i => pre + '_' + Math.min(n, i);
    SK[k].pose = [f(1), f(RECOV_N[k] || 2)]; SK[k].pose2 = f(3); SK[k].poseL = w === 8 || n < 4 ? SK[k].pose[1] : f(n);
  }
  // 每个招式用自己的帧：[出招前摇帧, 出手帧, 收势帧, 第二击帧]。刀用白衣持刀帧 wd_*，剑用白衣持剑帧 wj_*
  const PAIR = { daobo: ['wd_1', 'wd_2', 'wd_2'], hengsao: ['wd_3', 'wd_4', 'wd_4'], huima: ['wd_1', 'wd_6', 'wd_6', 'wd_2'], daolun: ['wd_7', 'wd_4', 'wd_4'] };
  for (const k of Object.keys(PAIR)) { const q = PAIR[k]; SK[k].pose = [q[0], q[1]]; SK[k].poseL = q[2] || q[1]; SK[k].pose2 = q[3] || q[1]; }
  // 手里拿的兵器：放哪种近战/长兵招式就拿哪种，之后待机、行走都拿着；暗器、法术不换（空手施放）。目前只有刀有持械待机和行走帧
  const HELDP = { 0: 'wd_' };
  const heldPre = () => 'wd_';   // 目前只有刀的美术：主角始终拿刀
  const profOf = c => Math.max(.72, Math.min(1.35, .58 + .15 * ((OG().oa || [3, 3, 3, 3, 3, 3, 3, 3])[CATA[c]])));
  const RESD = [0, 0, .08, .16, .26, .40];   // 同类别 n 件：该类别招式伤害加成
  function RES() {
    const cnt = [0, 0, 0, 0, 0, 0, 0, 0, 0]; for (const k of S.slots) if (SK[k]) cnt[wepOf(k)]++;   // 按具体兵器数
    const mx = Math.max(...cnt);
    return { cnt, take: mx >= 3 ? .95 : 1, cd: mx >= 5 ? .9 : mx >= 4 ? .95 : 1 };
  }
  const MAST_T = [0, 8, 20, 40, 70, 110, 160, 220, 300, 400];   // 施放次数 → 熟练度 LV1~10
  const lvOf = k => { const m = S.mast[k] || 0; let l = 1; while (l < 10 && m >= MAST_T[l]) l++; return l; };
  const mastMul = k => { const l = lvOf(k); return 1 + .06 * Math.min(3, l - 1) + (l >= 5 ? .12 : 0) + .05 * Math.max(0, Math.min(l, 9) - 5); };   // LV2-4、6-9 递增，LV5 质变
  function skillMul(k) {
    const c = catOf(k), n = RES().cnt[wepOf(k)], low = hero.hp / maxHp() < .3 ? 1 + .25 * GM.low : 1;
    return profOf(c) * (1 + RESD[Math.min(5, n)]) * mastMul(k) * GM.all * GM.cat[c] * low * (1 + .06 * S.xy);
  }
  function critRoll() {   // 暴击：基础 5% + 功法；伤害 ×1.5 + 心诀
    if (!CK || !SK[CK]) return 1;
    const c = catOf(CK);
    if (S.lhjOn || Math.random() < .05 + GM.crit + GM.critC[c]) { if (Math.random() < .35) floaters.push({ x: hero.x, y: hero.y - 54, t: 0, txt: '会心', color: '#ff9a4a' }); return 1.5 + GM.critD[c]; }
    return 1;
  }
  const CDM = () => RT.cd * RES().cd;
  // ---------- 功法（三国幸存者 38 个：20 心法 + 8 通用 + 5 杂项 + 5 轻功） ----------
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
  gadd('gf30', '熊经诀', 0, { x: { take: .95 }, d: '受到伤害 -5%' });   // 原「体术」四本心法：体术取消，改成守御通用功法
  gadd('gf31', '金钟罩', 1, { x: { take: .92 }, d: '受到伤害 -8%' });
  gadd('gf32', '铁骨功', 2, { x: { take: .9 }, blk: .10, d: '受到伤害 -10%；心诀：10% 概率格挡一次伤害' });
  gadd('gf33', '不动明王功', 3, { x: { take: .88 }, blk: .10, stl: .4, d: '受到伤害 -12%；心诀：10% 格挡，站定 1 秒后受伤再 -40%' });
  gadd('qingshen', '轻身术', 0, { x: { dcd: .92 }, d: '翻滚冷却 -8%' });
  gadd('juqi', '聚气诀', 1, { x: { qh: 1, hy: 1 }, d: '气海 +1，回元 +1' });
  gadd('shixue', '嗜血功', 1, { x: {}, kh: .006, d: '每次击杀回复 0.6% 生命' });
  gadd('beishui', '背水一战', 2, { x: {}, low: 1, d: '生命低于 30% 时，招式伤害 +25%，受到伤害 -10%' });
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
    if (g.c >= 0) { const sm = SPECM[Math.max(1, gfSame(g.c))]; return `全部伤害 +${pc(GGEN[g.t] * f)}，${g.cn}招式伤害 +${pc(GSPEC[g.t] * f * sm)}（同类心法越多越专精）` + (g.t >= 2 ? '；心诀：该类暴击 +10%' + (g.t === 3 ? '，暴击伤害 +50%' : '') : ''); }
    return g.d + (g.xj ? '；心诀：' + g.xj : '');
  }
  // 波间习得招式：从还没学会的招式里随机给最多 3 个，选一个放进空格
  function offerSkill(cb) {
    const owned = S.slots.filter(Boolean), free = S.slots.indexOf('');
    const pool = Object.keys(SK).filter(k => !owned.includes(k) && tierOk(k));
    if (free < 0 || !pool.length) return false;
    const pick = pool.sort(() => Math.random() - .5).slice(0, 3);
    W.pick = true;
    const box = document.createElement('div'); box.id = 'survPick';
    box.innerHTML = `<div class="p"><h3>习得招式 · 三选一</h3><div class="row">${pick.map(k => `<button data-k="${k}"><b style="color:${SK[k].color}">${SK[k].icon}</b><span>${SK[k].name}</span><small>${SK[k].desc}</small></button>`).join('')}</div><p>新招式放进第 ${free + 1} 格，按 1→5 顺序轮流放</p></div>`;
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
        const d = kills - S.lk; S.combo += d; S.comboT = 3;
        if (RT.on) {
          S.gf.forEach(id => { if (id) { const l0 = gfLv(id); S.gfExp[id] = (S.gfExp[id] || 0) + d * (GF[id].c >= 0 ? XPM[Math.max(1, gfSame(GF[id].c))] : 1); if (gfLv(id) > l0) floaters.push({ x: hero.x, y: hero.y - 90, t: 0, txt: GF[id].n + ' LV' + gfLv(id), color: '#ffd86e' }); } });
          if (GM.kh) heal(maxHp() * GM.kh * d);
          S.zq = Math.min(zqMax(), S.zq + zqMax() * .006 * d);
        }
      }
      S.lk = kills;
    }
    if (RT.on) {
      S.zq = Math.min(zqMax(), S.zq + zqMax() * (.005 + .004 * GM.hy) * dt);
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
        CK = key; if (wepOf(key) < 7) S.held = wepOf(key); k.cast(); S.lhjOn = false;
        const l0 = lvOf(key); S.mast[key] = (S.mast[key] || 0) + 1; if (lvOf(key) > l0) floaters.push({ x: hero.x, y: hero.y - 76, t: 0, txt: k.name + ' LV' + lvOf(key), color: '#ffd86e' });
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
  // ---------- 节点结算：连选 n 次（招式 / 强化 三选一）----------
  function rewardOptions(kind) {
    const owned = S.slots.filter(Boolean), free = S.slots.indexOf('') >= 0;
    const sk = (free ? Object.keys(SK).filter(k => !owned.includes(k) && tierOk(k) && (!ONLY_DAO || wepOf(k) === 0)) : []).sort(() => Math.random() - .5).slice(0, kind === 'skill' ? 3 : 2).map(k => ({ kind: 'skill', k, name: SK[k].name, icon: SK[k].icon, color: SK[k].color, desc: (SK[k].tier ? TIERN[SK[k].tier] + '阶 · ' : '') + SK[k].desc }));
    const gp = Object.keys(GF).filter(id => { const g = GF[id]; return !g.off && !S.gf.includes(id) && S.qg !== id && W.n >= TMIN[g.t + 1] && (g.qg || S.gf.includes('')); });
    const pk = gp.sort(() => Math.random() - .5).map(id => { const g = GF[id]; return { kind: 'gf', id, name: g.n, icon: g.qg ? '轻' : g.n[0], color: GTC[g.t], desc: GTN[g.t] + '阶 · ' + (g.qg ? '轻功 · ' : g.c >= 0 ? g.cn + '心法 · ' : '内功 · ') + gfText(g) }; });
    if (pk.length < 3) pk.push({ kind: 'heal', name: '回春', icon: '春', color: '#ff9a9a', desc: '立刻回复 40% 血量' });
    if (kind === 'perk') return pk.slice(0, 3);
    return sk.concat(pk).slice(0, 3).sort(() => Math.random() - .5);
  }
  function offerReward(n, cb, i, kinds) {
    i = i || 1; if (i > n) { W.pick = false; if (cb) cb(); return; }
    const kind = kinds && kinds[Math.min(i, kinds.length) - 1], opts = rewardOptions(kind); W.pick = true;
    const old = document.getElementById('survPick'); if (old) old.remove();
    const box = document.createElement('div'); box.id = 'survPick';
    box.innerHTML = `<div class="p"><h3>战利 · ${kind === 'skill' ? '招式 · ' : kind === 'perk' ? '功法 · ' : ''}${n > 1 ? '第 ' + i + '/' + n + ' 次 · ' : ''}三选一</h3><div class="row">${opts.map((o, j) => `<button data-j="${j}"><i style="font-style:normal;font-size:11px;opacity:.7">${o.kind === 'skill' ? '新招式' : '强化'}</i><b style="color:${o.color}">${o.icon}</b><span>${o.name}</span><small>${o.desc}</small></button>`).join('')}</div>${S.slots.indexOf('') >= 0 ? '<p>新招式放进空着的格子，按 1→5 顺序轮流放</p>' : ''}</div>`;
    box.querySelectorAll('button').forEach(b => b.onclick = () => {
      const o = opts[+b.dataset.j];
      if (o.kind === 'skill') { const f = S.slots.indexOf(''); if (f >= 0) S.slots[f] = o.k; } else if (o.kind === 'gf') { if (GF[o.id].qg) S.qg = o.id; else { const f = S.gf.indexOf(''); if (f >= 0) S.gf[f] = o.id; } } else heal(maxHp() * .4);
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
  function nodeClear() {   // 一个节点打完：发奖励，回长卷
    const nd = RT.node; W.started = false; zs.length = 0; eshots.length = 0;
    { const c = S.zq * .3; if (c > .05) { heal(c); floaters.push({ x: hero.x, y: hero.y - 60, t: 0, txt: '真气化血 +' + Math.round(c * 10), color: '#7fd0ff' }); } S.zq = 0; }   // 战后：剩余真气 30% 转成气血
    if (nd.type === 'boss' && nd.final) { won = true; return; }
    const back = () => { W.pick = false; ROUTE.done(nd); };
    if (nd.type === 'boss') { say('敌将已破！', 1.4); heal(maxHp() * .3); offerReward(2, back, 1, ['skill', 'perk']); }   // 血量是资源：只有首领、营地、疗伤奖励、奇遇才回血
    else if (nd.type === 'elite') { say('精锐已破！', 1.4); offerReward(2, back, 1, ['skill', 'perk']); }
    else if (nd.rw === 'heal') { say('包扎伤口', 1.2); heal(maxHp() * .35); back(); }
    else offerReward(1, back, 1, [nd.rw || 'skill']);
  }
  function beginNode(nd) {
    if (!c2ok && typeof ensureAssets === 'function') ensureAssets('chapter2', { silent: true }).then(() => { c2ok = true; });
    GM = gfCalc(); S.zq = zqMax(); S.hp0 = hero.hp; S.noHitT = 0; S.xy = 0;
    RT.node = nd; W.N = ROUTE.waves(nd); W.started = true; W.between = 0; W.pick = false; S.wind = null; S.recov = null; S.later = []; bolts.length = 0; zones.length = 0; fx.length = 0;
    zs.length = 0; eshots.length = 0; if (window.ARENA) ARENA.start(ROUTE.mapOf(nd));
    startWave(1);
  }
  // ---------- 局内存档（11/11 用户定：回到长卷自动存；主界面「继续」读档） ----------
  const RUN_KEY = 'szz-run';
  const snap = () => ({ origin, slots: S.slots.slice(), held: S.held, mast: { ...S.mast }, gf: S.gf.slice(), qg: S.qg, gfExp: { ...S.gfExp }, xy: S.xy, rt: { dmg: RT.dmg, cd: RT.cd, move: RT.move, take: RT.take }, hp: hero ? hero.hp : null });
  function restore(o) {
    if (!o) return;
    if (ORIGINS[o.origin]) origin = o.origin;
    S.slots = o.slots || S.slots; S.held = o.held != null ? o.held : S.held; S.mast = o.mast || {}; S.gf = o.gf || ['', '', '']; S.qg = o.qg || ''; S.gfExp = o.gfExp || {}; S.xy = o.xy || 0;
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
    S.slots = [OG().skill || 'hengsao', '', '', '', '']; S.held = wepOf(S.slots[0]) < 7 ? wepOf(S.slots[0]) : null; S.mast = {}; S.dps = {}; S.gf = ['', '', '']; S.qg = ''; S.gfExp = {}; S.xy = 0; S.lhjReady = false; S.lhjOn = false; GM = GM0(); S.zq = zqMax(); S.hp0 = hero.hp; S.combo = 0; S.lk = typeof kills === 'number' ? kills : 0; S.chain = 0; S.lastCat = -1; S.lastI = -9; W.pick = false; const old = document.getElementById('survPick'); if (old) old.remove();
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
    if (weapon !== 'blade') forceBlade();
    if (charging || atkHeldSince) cancelCharge();
    for (const z of zs) { if (z.stunCd > 0) z.stunCd -= dt; if (z.survSlow > 0) z.survSlow -= dt; }
    skillTick(dt);
    for (const e of fx) e.t += dt;
    for (const b of bolts) {
      CM = b.cm || 1; CK = b.ck || ''; b.t += dt; b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.y < M.top - 4 || b.y > M.bot + 4) b.t = b.T;
      for (const z of hittable()) if (!b.hitSet.includes(z) && Math.abs(z.x - b.x) < 16 && Math.abs(z.y - b.y) < 16) { b.hitSet.push(z); const f0 = freeze; rec((b.dmg || 1.8) * DM()); hit(z, (b.dmg || 1.8) * DM(), 40, Math.sign(b.vx) || hero.f, false, 0, .3, false, false, { secondary: true, survSkill: true }); freeze = Math.min(freeze, Math.max(f0, .03)); }
    }
    CM = 1; CK = '';
    for (const zn of zones) {
      CM = zn.cm || 1; CK = zn.ck || ''; zn.t += dt; if (zn.follow) { zn.x = hero.x; zn.y = hero.y; }
      if ((zn.tk -= dt) <= 0) { zn.tk = .35; if (zn.kind === 'trail') { for (const z of near(zn.x, zn.y, zn.r)) z.survSlow = .6; } else for (const z of near(zn.x, zn.y, zn.r)) HT(z, zn.dmg, zn.kind === 'wheel' ? 25 : 4, Math.sign(z.x - zn.x) || hero.f, .02); }
    }
    CM = 1; CK = '';
    for (let i = zones.length - 1; i >= 0; i--) if (zones[i].t >= zones[i].T) zones.splice(i, 1);
    for (let i = bolts.length - 1; i >= 0; i--) if (bolts[i].t >= bolts[i].T) bolts.splice(i, 1);
    for (let i = fx.length - 1; i >= 0; i--) if (fx[i].t > fx[i].T) fx.splice(i, 1);
  }
  function drawWorld() {
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
    for (const b of bolts) {   // 月牙刀波
      const p = b.t / b.T, al = 1 - p * p;
      ctx.save(); ctx.translate(b.x, b.y - 14); ctx.scale(1, .5); ctx.rotate(b.a);
      ctx.strokeStyle = `rgba(${(b.col || ['160,225,255'])[0]},${.5 * al})`; ctx.lineWidth = 9; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(-10, 0, 26, -1.1, 1.1); ctx.stroke();
      ctx.strokeStyle = `rgba(${(b.col || [0, '240,252,255'])[1]},${.95 * al})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(-8, 0, 26, -1.0, 1.0); ctx.stroke();
      ctx.restore();
    }
    for (const zn of zones) {
      const al = Math.min(1, (zn.T - zn.t) / .4, zn.t / .15 + .2);
      ctx.save(); ctx.translate(zn.x, zn.y); ctx.scale(1, .5); ctx.globalAlpha = al;
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
      if (e.k === 'burst') { ctx.save(); ctx.translate(e.x, e.y); ctx.scale(1, .5); const r = e.r * (.4 + .6 * Math.min(1, p * 2)); ctx.fillStyle = `rgba(${e.col},${.28 * (1 - p)})`; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill(); ctx.strokeStyle = `rgba(255,250,230,${.9 * (1 - p)})`; ctx.lineWidth = 4 * (1 - p) + 1; ctx.stroke(); ctx.restore(); }
      else if (e.k === 'mark') { ctx.save(); ctx.translate(e.x, e.y); ctx.scale(1, .5); ctx.strokeStyle = `rgba(255,90,60,${.3 + .4 * p})`; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(0, 0, e.r, 0, 7); ctx.stroke(); ctx.restore(); ctx.strokeStyle = 'rgba(233,220,176,.9)'; ctx.lineWidth = 2; for (let i = 0; i < 4; i++) { const ox = (i - 1.5) * e.r * .4, yy = e.y * 1 - (1 - p) * 120; ctx.beginPath(); ctx.moveTo(e.x + ox, yy - 20); ctx.lineTo(e.x + ox, yy); ctx.stroke(); } }
      else if (e.k === 'bolt') { ctx.save(); ctx.strokeStyle = `rgba(235,240,255,${1 - p})`; ctx.lineWidth = 4 * (1 - p) + 1; ctx.beginPath(); let x = e.x, y = e.y - 170; ctx.moveTo(x, y); for (let i = 0; i < 6; i++) { x = e.x + R(-10, 10) * (i < 5); y += (e.y - (e.y - 170)) / 6; ctx.lineTo(x, y); } ctx.stroke(); ctx.restore(); }
      else if (e.k === 'line') { ctx.save(); ctx.translate(e.x, e.y - 14); ctx.scale(1, .5); ctx.rotate(e.a); const k = Math.min(1, p * 4); ctx.lineCap = 'round'; ctx.strokeStyle = `rgba(${e.col},${.55 * (1 - p)})`; ctx.lineWidth = e.w * 1.6 * (1 - p) + 4; ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(10 + e.L * k, 0); ctx.stroke(); ctx.strokeStyle = `rgba(255,255,255,${.95 * (1 - p)})`; ctx.lineWidth = 3; ctx.stroke(); ctx.restore(); }
    }
    for (const e of fx) {
      if (e.k === 'burst' || e.k === 'mark' || e.k === 'bolt' || e.k === 'line') continue;
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
  function hud(HW) {
    hudT = performance.now(); buildUi();
    const HH = ctx.canvas.height / DPR, fine = !(window.matchMedia && matchMedia('(pointer:coarse)').matches), n = 5, sz = fine ? 44 : 38, sz0 = sz, gap = 6, w = n * sz + (n - 1) * gap;
    const x0 = fine ? 16 : (HW - w) / 2, y0 = fine ? HH - 16 - sz * 2 - 8 : 44, labY = fine ? 54 : y0 + sz + 4 + 26 + 18;
    ctx.save();
    const slot = (x, y, k, cur, i, lbl, sz = sz0) => {
      ctx.fillStyle = '#241812'; ctx.fillRect(x, y, sz, sz);
      if (k) {
        ctx.fillStyle = k.color; ctx.globalAlpha = .22 + (i >= 0 && S.flash[i] > 0 ? .5 : 0); ctx.fillRect(x, y, sz, sz); ctx.globalAlpha = 1;
        if (i >= 0 && S.wind && S.wind.i === i) { ctx.fillStyle = 'rgba(255,230,140,.45)'; ctx.fillRect(x, y + sz * (1 - S.wind.t / S.wind.dur), sz, sz * S.wind.t / S.wind.dur); }   // 前摇进度
        ctx.font = 'bold 20px "PingFang SC",sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = k.color; ctx.fillText(k.icon, x + sz / 2, y + sz / 2 + 1);
        if (!cur) { ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(x, y, sz, sz); }   // 没轮到的格子压暗
        ctx.font = '10px "PingFang SC",sans-serif'; ctx.fillStyle = '#c9b58c'; ctx.textBaseline = 'alphabetic'; ctx.fillText(lbl != null ? lbl : 'LV' + lvOf(S.slots[i]), x + sz - 12, y + sz - 3);
      } else { ctx.font = 'bold 18px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#4a3a2a'; ctx.fillText('+', x + sz / 2, y + sz / 2 + 1); }
      if (i >= 0 && S.skip[i] > 0) { ctx.fillStyle = 'rgba(160,160,170,.5)'; ctx.fillRect(x, y, sz, sz); }
      ctx.strokeStyle = cur ? '#ffe27a' : 'rgba(176,138,74,.75)'; ctx.lineWidth = cur ? 2.5 : 1.2; ctx.strokeRect(x + .5, y + .5, sz - 1, sz - 1);
    };
    ctx.fillStyle = 'rgba(14,9,6,.55)'; ctx.fillRect(x0 - 6, y0 - 6, w + 12, fine ? sz * 2 + 8 + 12 : sz + 26 + 4 + 12);
    for (let i = 0; i < n; i++) slot(x0 + i * (sz + gap), y0, SK[S.slots[i]], i === S.qi, i);
    const gk = id => GF[id] ? { icon: GF[id].qg ? '轻' : GF[id].n[0], color: GTC[GF[id].t] } : null, sz2 = fine ? sz : 26, ry2 = y0 + sz + (fine ? 8 : 4);
    for (let i = 0; i < 3; i++) slot(x0 + i * (sz2 + gap), ry2, gk(S.gf[i]), true, -1, S.gf[i] ? 'LV' + gfLv(S.gf[i]) : '', sz2);   // 内功：主修 + 2 辅修
    slot(x0 + 3 * (sz2 + gap) + 8, ry2, gk(S.qg), true, -1, '', sz2);   // 轻功
    // 血条：屏幕底部正中（血量 ×10 显示成整数）
    const bw = fine ? Math.min(HW * .46, 520) : Math.min(HW * .44, 230), bh = fine ? 20 : 16, bx = (HW - bw) / 2, by = HH - (fine ? 18 : 12) - bh, mh = maxHp(), r = Math.max(0, Math.min(1, hero.hp / mh));
    ctx.fillStyle = 'rgba(14,9,6,.8)'; ctx.fillRect(bx - 3, by - 3, bw + 6, bh + 6); ctx.strokeStyle = '#8a6a3a'; ctx.lineWidth = 1.5; ctx.strokeRect(bx - 2.5, by - 2.5, bw + 5, bh + 5);
    const g = ctx.createLinearGradient(0, by, 0, by + bh); g.addColorStop(0, '#e0463a'); g.addColorStop(1, '#8c1c18'); ctx.fillStyle = g; ctx.fillRect(bx, by, bw * r, bh);
    ctx.font = 'bold ' + (fine ? 13 : 11) + 'px "PingFang SC",sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(20,8,6,.9)';
    const ht = Math.ceil(hero.hp * 10 - 1e-6) + ' / ' + Math.round(mh * 10); ctx.strokeText(ht, HW / 2, by + bh / 2 + 1); ctx.fillStyle = '#fff2d8'; ctx.fillText(ht, HW / 2, by + bh / 2 + 1);
    { const zh = fine ? 12 : 9, zy = by - 8 - zh, zr = Math.max(0, Math.min(1, S.zq / zqMax()));   // 真气：蓝条叠在血条上方
      ctx.fillStyle = 'rgba(14,9,6,.8)'; ctx.fillRect(bx - 3, zy - 2, bw + 6, zh + 4);
      const g2 = ctx.createLinearGradient(0, zy, 0, zy + zh); g2.addColorStop(0, '#5cc0ff'); g2.addColorStop(1, '#1f5fa8'); ctx.fillStyle = g2; ctx.fillRect(bx, zy, bw * zr, zh);
      ctx.strokeStyle = '#4a7aa8'; ctx.lineWidth = 1; ctx.strokeRect(bx - 2.5, zy - 1.5, bw + 5, zh + 3);
      if (fine) { ctx.font = 'bold 10px "PingFang SC",sans-serif'; ctx.textBaseline = 'middle'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(8,16,30,.9)'; const zt = '真气 ' + Math.round(S.zq * 10) + ' / ' + Math.round(zqMax() * 10); ctx.strokeText(zt, HW / 2, zy + zh / 2 + 1); ctx.fillStyle = '#e2f4ff'; ctx.fillText(zt, HW / 2, zy + zh / 2 + 1); } }
    // 右侧大字：击杀、连击
    const nf = fine ? 46 : 30, rx = HW - (fine ? 22 : 12), ry = HH * (fine ? .36 : .3);
    const big = (num, label, y, a) => { ctx.globalAlpha = a; ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.font = 'bold ' + nf + 'px "PingFang SC",sans-serif'; ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(30,18,10,.85)'; ctx.strokeText(num, rx, y); ctx.fillStyle = '#f4ead0'; ctx.fillText(num, rx, y); ctx.font = 'bold ' + (fine ? 20 : 14) + 'px "PingFang SC",sans-serif'; ctx.lineWidth = 4; ctx.strokeText(label, rx, y + nf * .72); ctx.fillStyle = '#d9a84a'; ctx.fillText(label, rx, y + nf * .72); ctx.globalAlpha = 1; };
    big(String(typeof kills === 'number' ? kills : 0), '击杀', ry, 1);
    if (S.combo > 1) big(String(S.combo), '连击', ry + nf * 1.7, Math.min(1, S.comboT / .6));
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
    + '#survPick{position:fixed;inset:0;z-index:10020;display:flex;align-items:center;justify-content:center;background:rgba(10,6,4,.6);font-family:"PingFang SC","Noto Sans CJK SC",sans-serif}'
    + '#survPick .p{background:linear-gradient(180deg,#2a1d13,#1a120c);border:2px solid #b08a4a;border-radius:10px;padding:14px 16px;color:#f2e4c8;text-align:center;max-width:94vw}'
    + '#survPick h3{margin:0 0 10px;color:#ffd86e;letter-spacing:4px}#survPick .row{display:flex;gap:10px;justify-content:center;flex-wrap:wrap}'
    + '#survPick button{width:140px;padding:12px 8px;background:#2e2118;border:1px solid #8a6a3a;border-radius:8px;color:#f2e4c8;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:4px}'
    + '#survPick button:hover{border-color:#ffd86e;background:#3a2a1c}#survPick b{font-size:30px}#survPick span{font-size:16px;font-weight:700}#survPick small{color:#cdb98e;font-size:12px}#survPick p{margin:10px 0 0;color:#a08d70;font-size:12px}'; document.head.appendChild(st);
  // ---------- 构筑总览（TAB / 右上「构」按钮；路线图和战斗里都能开，开着时战斗暂停） ----------
  let buildOpen = false, buildBtn = null, hudT = 0;
  function buildHtml() {
    const o = OG(), R = RES(), tot = Object.values(S.dps).reduce((a, b) => a + b, 0);
    const cats = CATN.map((n, c) => `<span style="display:inline-block;margin:2px 8px 2px 0">${n} <b style="color:${profOf(c) >= 1.15 ? '#9fe08a' : profOf(c) < .9 ? '#e08a8a' : '#ddd'}">×${profOf(c).toFixed(2)}</b></span>`).join('');
    const rows = S.slots.map((k, i) => !SK[k] ? `<div class="r" style="opacity:.4">${i + 1}. 空</div>` :
      `<div class="r"><b style="color:${SK[k].color}">${i + 1}. ${SK[k].name}</b> <span class="t">${WEPN[wepOf(k)]} · ${CATN[catOf(k)]}${SK[k].tier ? ' · ' + TIERN[SK[k].tier] + '阶' : ''}</span><span class="v">LV${lvOf(k)} · ×${skillMul(k).toFixed(2)}${tot ? ' · 输出 ' + Math.round((S.dps[k] || 0) / tot * 100) + '%' : ''}</span><span class="mv"><button data-mv="${i}:-1"${i < 1 ? ' disabled' : ''}>▲</button><button data-mv="${i}:1"${i > 3 || !SK[S.slots[i + 1]] ? ' disabled' : ''}>▼</button></span></div>`).join('');
    const res = R.cnt.map((n, c) => n >= 2 ? `<div class="r"><b>${WEPN[c]}共鸣 ${n} 件</b><span class="v">${WEPN[c]}招式伤害 +${Math.round(RESD[Math.min(5, n)] * 100)}%</span></div>` : '').join('') || '<div class="r" style="opacity:.5">还没有（同一种兵器的招式 2 件起）</div>';
    const gfRows = S.gf.map((id, i) => { const g = GF[id]; return !g ? `<div class="r" style="opacity:.4">内功 ${i + 1} · 空</div>` : `<div class="r"><b style="color:${GTC[g.t]}">${g.n}</b> <span class="t">${GTN[g.t]}阶 · ${g.c >= 0 ? g.cn + '心法' : '通用'} · LV${gfLv(id)} · 杀敌 ${S.gfExp[id] || 0}</span><span class="mv"><button data-gx="${i}">✕</button></span></div><div class="gd">${gfText(g)}</div>`; }).join('');
    const qgRow = GF[S.qg] ? `<div class="r"><b style="color:${GTC[GF[S.qg].t]}">${GF[S.qg].n}</b> <span class="t">${GTN[GF[S.qg].t]}阶</span><span class="mv"><button data-qx="1">✕</button></span></div><div class="gd">${GF[S.qg].d}</div>` : '<div class="r" style="opacity:.4">空（战利品里可能出现轻功）</div>';
    const mx = Math.max(...R.cnt), ex = [mx >= 3 ? '受伤 -5%' : '', mx >= 4 ? '出招 -5% 间隔' : '', mx >= 5 ? '出招再快（共 -10%）' : ''].filter(Boolean).join('，');
    return `<div class="bp"><h3>构筑总览 <button class="x">✕</button></h3>
      <h4>出身 · ${o.name}</h4><div style="font-size:12px">${cats}</div><div style="font-size:11px;opacity:.6">出身对各类招式的熟练系数：跨类也能用，只是偏弱</div>
      <h4>招式（按 1→5 顺序放，可用 ▲▼ 调顺序）</h4>${rows}
      <h4>兵器共鸣</h4>${res}${ex ? `<div style="font-size:11px;opacity:.7;margin-top:2px">额外：${ex}</div>` : ''}
      <h4>连携</h4><div style="font-size:12px">相邻两招用同一种兵器，后一招前摇缩短，逐次叠加最多 -80%；换兵器就断。当前：${S.chain > 0 ? '×' + S.chain : '无'}</div>
      <h4>内功（同类心法装得越多，专精越高、升级越快）</h4>${gfRows}
      <h4>轻功</h4>${qgRow}
      <h4>真气</h4><div style="font-size:12px">${Math.round(S.zq * 10)} / ${Math.round(zqMax() * 10)}　<span style="opacity:.65">护体：受伤时真气挡 30%；发劲：真气过半时招式自动 +30% 伤害、每招耗 5% 真气；战后剩余的 30% 化成气血</span></div></div>`;
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

  window.SURV = { heldPre: () => heldPre(), dbg: () => ({ gf: S.gf.slice(), qg: S.qg, zq: S.zq, zqMax: zqMax(), exp: S.gfExp, GM }), giveGf: id => { if (GF[id]) { if (GF[id].qg) S.qg = id; else { const f = S.gf.indexOf(""); if (f >= 0) S.gf[f] = id; } } }, newHud: () => RT.on && !!RT.node, stunGate, noStun: () => RT.on, get slots() { return S.slots; }, SK, beginNode, frozen: () => RT.on && (ROUTE.shown() || buildOpen), routeHp: () => [hero.hp, maxHp()], camp(k) { if (k === 'heal') heal(maxHp() * .3); else RT.dmg *= 1.1; }, ORIGINS, setOrigin(k) { if (ORIGINS[k] && !ORIGINS[k].locked) origin = k; }, origin: () => origin, takeMul: () => {
      if (RT.on && GM.block && Math.random() < GM.block) { floaters.push({ x: hero.x, y: hero.y - 50, t: 0, txt: '格挡', color: '#bfe0ff' }); return 0; }
      const mv = Math.abs(hero.ix) > .1 || Math.abs(hero.iy) > .1, low = hero.hp / maxHp() < .3 ? 1 - .10 * GM.low : 1;
      return (OG().take || 1) * RT.take * RES().take * GM.take / GM.hp * low * (S.qg === 'taxue' && mv ? .85 : 1) * (GM.still && S.stillT > 1 ? 1 - GM.still : 1);
    },
    absorb: n => { if (!RT.on || S.zq <= 0) return n; const a = Math.min(S.zq, n * .3); S.zq -= a; return n - a; },   // 护体（11/11 用户定，照群侠幸存者）：真气只挡 30% 伤害，其余直接扣血；真气空了全扣血
     moveMul: () => (OG().move || 1) * RT.move * GM.spd, left: () => RT.on && RT.node && W.started ? Math.max(0, WT() - W.t) : null, reward: (n, cb) => offerReward(n, cb), event(k, cb) { eventDo(k, cb); }, SK, tick, drawWorld, hud, startRun, waveFlow, pose, rooted, onRoll, skipWave() { if (W.retreat <= 0 && W.between <= 0 && W.started) endWave(); }, state: () => ({ wave: W.n, t: W.t, slots: S.slots.slice() }) };
})();
