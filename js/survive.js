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
      if (n === 1) waveBanner(ROUTE.name(nd), nd.type === 'boss' ? '首领战 · 迎战' : nd.type === 'elite' ? '第 ' + nd.layer + ' 层 · 精锐 · 迎战' : '第 ' + nd.layer + ' 层 · 迎战');
      const lvOf = k => Math.max(1, Math.min(WAVES, 1 + Math.floor(((nd.layer - 1 + (k - 1) / N0) / L) * WAVES) + (nd.type === 'elite' ? 2 : 0) + (nd.type === 'boss' ? 2 : 0)));
      W.lv0 = lvOf(1); W.lv1 = lvOf(N0); W.tot = 0; for (let k = 1; k <= N0; k++) W.tot += (WAVE_T[lvOf(k) - 1] || 60) * ROUTE.TIME_K;
      W.tot = nd.type === 'boss' ? (nd.final ? 180 : 100) : nd.type === 'elite' ? 85 + 25 * nd.layer / L : ([0, 35, 42, 48][nd.layer] || 50 + 15 * nd.layer / L);   // 11/11：第一关太长太难 → 前三层 35/42/48 秒   // 用户定 11/09：首领 3 分钟；精英约 1.5~2 分钟；普通战斗约 50~65 秒（18 层）
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
    if (RT.on && RT.node && RT.node.type === 'boss' && W.bossDone && W.t > 3 && !alive().some(z => z.survBoss)) { say(RT.node.final ? '黄巾首领已破！' : '敌将已破！', 1.6); W.t = WT(); }   // 首领战：把场上的敌将都打倒就算赢
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
  add('daolun', { name: '刀轮', icon: '轮', color: '#cfe8ff', desc: '身周刀轮急转一圈（约 1 秒）', need: 90, wu: .5,
    cast() { S.poseOverride = { f: 'wd_hx2', t: .14 }; zones.push({ x: 0, y: 0, follow: 1, r: 44, t: 0, T: 1.05, tk: 0, dmg: 1.25, kind: 'wheel' }); /* 11/11：3 秒太长等于常驻，缩到约 1 秒 */ sfx('swing_knife', hero.x); } });
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
  // ---------- 出身（开局配置里选；起手只有 1 个武艺） ----------
  const ORIGINS = {
    nongfu: { name: '农夫', tag: '短兵器', skill: 'hengsao', desc: '庄稼汉，挨得住打。受到伤害 -20%', take: .8, oa: [5, 4, 2, 1, 1, 2, 1, 3], at: [6, 4, 2, 2, 3, 2] },
    xiaozu: { locked: true, name: '小卒', tag: '长兵器', skill: 'daolun', desc: '行伍出身，出手利落。武艺前摇 -20%', wu: .8, oa: [4, 4, 5, 1, 1, 2, 1, 3], at: [4, 3, 4, 3, 2, 2] },
    liehu: { locked: true, name: '猎户', tag: '远程', skill: 'daobo', desc: '山里跑惯了。移动速度 +12%', move: 1.12, oa: [3, 4, 1, 5, 1, 4, 1, 3], at: [3, 3, 1, 5, 3, 2] },
    shusheng: { locked: true, name: '书生', tag: '术法', skill: 'huima', desc: '手无缚鸡之力，却通术法。术法最强，近战偏弱', oa: [2, 1, 1, 1, 1, 2, 6, 4], at: [2, 1, 1, 2, 3, 6] },
  };
  let origin = 'nongfu';
  const OG = () => ORIGINS[origin] || ORIGINS.nongfu;
  // ---------- 武艺类别 / 出身熟练 / 类别共鸣 / 连携 / 熟练度 ----------
  // 大类（出身熟练、心法专精）→ 具体兵器（连携、共鸣、施法时手里拿什么）
  const CATN = ['短兵器', '长兵器', '远程', '法师'], CATA = [1, 2, 3, 6];   // 大类 → 出身属性下标
  const WEPN = ['刀', '剑', '锤', '枪', '关刀', '弓', '弩', '石子', '法术'], WEPCAT = [0, 0, 0, 1, 1, 2, 2, 2, 3];
  const WOF = { hengsao: 0, daobo: 0, huima: 0, daolun: 0, lianzhan: 1, sixiang: 1, wanren: 1, zhendi: 2, dilie: 2, shuanghuan: 2, tianbeng: 2, qiang: 3, chong: 3, xuanfeng: 4, xuehe: 4, jianyu: 5, huogong: 8, pili: 8 };
  const wepOf = k => WOF[k] != null ? WOF[k] : 0;
  const ONLY_DAO = true;   // 用户定 11/10：目前只有刀的美术，武艺奖励只出刀系；其他武器等美术补齐再开
  const catOf = k => WEPCAT[wepOf(k)];
  // 武艺姿势：主角固定空手，放招时按这一招的兵器举起对应的施招帧（第 1 帧蓄力，第 2 帧出手，更多帧给第二刀和收势）
  // FRW 下标同 WEPN：[帧名前缀, 帧数]；法术暂按武艺配法器，之后改成按装备的法器
  const FRW = [['dao', 4], ['jian', 4], ['chui', 2], ['qiang', 4], ['guandao', 5], ['gong', 2], ['nu', 2], ['shi', 2], ['zhang', 3]];
  const MAGE_FR = { huogong: 'shan', pili: 'fu' }, RECOV_N = { hengsao: 3, xuanfeng: 3, xuehe: 4, pili: 3 };
  for (const k of Object.keys(SK)) {
    const w = wepOf(k), [pre, n] = w === 8 && MAGE_FR[k] ? [MAGE_FR[k], 3] : FRW[w], f = i => pre + '_' + Math.min(n, i);
    SK[k].pose = [f(1), f(RECOV_N[k] || 2)]; SK[k].pose2 = f(3); SK[k].poseL = w === 8 || n < 4 ? SK[k].pose[1] : f(n);
  }
  // 每个武艺用自己的帧：[出招前摇帧, 出手帧, 收势帧, 第二击帧]。刀用白衣持刀帧 wd_*，剑用白衣持剑帧 wj_*
  const PAIR = { daobo: ['wd_1', 'wd_2', 'wd_2'], hengsao: ['wd_3', 'wd_4', 'wd_4'], huima: ['wd_1', 'wd_6', 'wd_6', 'wd_2'], daolun: ['wd_7', 'wd_4', 'wd_4'] };
  for (const k of Object.keys(PAIR)) { const q = PAIR[k]; SK[k].pose = [q[0], q[1]]; SK[k].poseL = q[2] || q[1]; SK[k].pose2 = q[3] || q[1]; }
  // 手里拿的兵器：放哪种近战/长兵武艺就拿哪种，之后待机、行走都拿着；暗器、法术不换（空手施放）。目前只有刀有持械待机和行走帧
  const HELDP = { 0: 'wd_' };
  const heldPre = () => 'wd_';   // 目前只有刀的美术：主角始终拿刀
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
  const profOf = c => c === 0 ? profV(AT()[1]) : c === 1 ? profV(AT()[2]) : profV((OG().oa || [3, 3, 3, 3, 3, 3, 3, 3])[CATA[c]]);   // 短兵/长兵：对应大类武艺伤害
  const RESD = [0, 0, .08, .16, .26, .40];   // 同类别 n 件：该类别武艺伤害加成
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
    const pool = Object.keys(SK).filter(k => !owned.includes(k) && tierOk(k));
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
        CK = key; if (wepOf(key) < 7) S.held = wepOf(key); k.cast(); S.lhjOn = false;
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
    const sk = (free ? Object.keys(SK).filter(k => !owned.includes(k) && tierOk(k) && (!ONLY_DAO || wepOf(k) === 0)) : []).sort(() => Math.random() - .5).slice(0, kind === 'skill' ? 3 : 2).map(k => ({ kind: 'skill', k, q: Math.min(3, SK[k].tier || 0), name: SK[k].name, icon: SK[k].icon, color: SK[k].color, desc: (SK[k].tier ? TIERN[SK[k].tier] + '阶 · ' : '') + SK[k].desc }));
    const gp = Object.keys(GF).filter(id => { const g = GF[id]; return !g.off && (!ONLY_DAO || g.c < 1) && !S.gf.includes(id) && S.qg !== id && !(S.owned || []).includes(id) && W.n >= TMIN[g.t + 1]; });
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
    box.innerHTML = `<div class="p"><h3>战利 · ${kind === 'skill' ? '武艺 · ' : kind === 'perk' ? '心法 · ' : ''}${n > 1 ? '第 ' + i + '/' + n + ' 次 · ' : ''}三选一</h3><div class="row">${opts.map((o, j) => `<button data-j="${j}" class="q${o.q || 0}"><i style="font-style:normal;font-size:11px;opacity:.7">${o.kind === 'skill' ? '新武艺 · 主动' : o.kind === 'gf' ? '心法 · 被动' : '回血'}</i>${iconUrl(o.kind, o.k || o.id) ? `<em class="ic" style="background-image:url('${iconUrl(o.kind, o.k || o.id)}')"></em>` : `<b style="color:${o.color}">${o.icon}</b>`}<span>${o.name}</span><small>${o.desc}</small></button>`).join('')}</div>${S.slots.indexOf('') >= 0 ? '<p>新武艺放进空着的格子，按 1→5 顺序轮流放</p>' : ''}</div>`;
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
  function nodeClear() {   // 一个节点打完：敌人站定淡出 → 左下战报 → 整备屏（结算/拾取/修炼/行商/武艺）→ 回长卷
    const nd = RT.node; W.started = false; eshots.length = 0;
    for (const z of zs) if (!z.dead) { z.endFade = .9; z.st = 'idle'; z.t = 0; z.enemySkill = null; z.air = false; z.stun = 0; z.daze = 0; }
    setTimeout(() => { zs.length = 0; }, 950);
    const R = S.rep = { kills: (typeof kills === 'number' ? kills : 0) - (S.k0 || 0), got: S.coinGot || 0, left: 0, taken: Math.round((S.taken || 0) * 10), tiao: 0, lv0: S.lvAt0 || S.lv, xiu: 0 };
    { let sum = 0; for (const c of S.coins) sum += c.v; R.left = Math.floor(sum * .9); S.money += R.left; S.coins.length = 0; }   // 地上没捡的铜钱：收回九成
    { R.zqLeft = Math.round(S.zq * 10); const c = S.zq * (.3 + IT('tiao')); if (c > .05) { heal(c); R.tiao = Math.round(c * 10); } S.zq = 0; if (IT('after')) heal(maxHp() * IT('after')); }   // 调息：剩余真气 30% 化成气血
    if (nd.type === 'boss' && nd.final) { won = true; return; }
    if (window.SFX) SFX.play('j_win');
    R.xiu = nd.type === 'boss' ? 60 : nd.type === 'elite' ? 40 : 25; addXiu(R.xiu);
    if (nd.type === 'boss') heal(maxHp() * .3);
    S.loot = rollLoot(nd); S.shop = rollShop(); S.bought = -1;
    report(R);
    W.pick = true; setTimeout(() => prepOpen(nd), 1000);
  }
  function beginNode(nd) {
    if (!c2ok && typeof ensureAssets === 'function') ensureAssets('chapter2', { silent: true }).then(() => { c2ok = true; });
    GM = gfCalc(); S.zq = zqMax(); S.hp0 = hero.hp; S.noHitT = 0; S.xy = 0;
    S.k0 = typeof kills === 'number' ? kills : 0; S.coinGot = 0; S.taken = 0; S.hutiSum = 0; S.dps = {}; S.lastHp = hero.hp; S.coins = []; S.lvAt0 = S.lv; S.tutT = 0;
    RT.node = nd; W.N = ROUTE.waves(nd); W.started = true; W.between = 0; W.pick = false; S.wind = null; S.recov = null; S.later = []; bolts.length = 0; zones.length = 0; fx.length = 0;
    zs.length = 0; eshots.length = 0; if (window.ARENA) ARENA.start(ROUTE.mapOf(nd));
    startWave(1);
  }

  // ================= 铜钱 / 战报 / 整备屏 / 刘备教学（11/11 用户定） =================
  const COIN_IMG = new Image(); COIN_IMG.src = 'art/ui/hud/coin.webp';
  const PORTRAIT = new Image(); PORTRAIT.src = 'art/ui/npc/liubei_face.webp';
  function dropCoins(z) {   // 敌人倒下掉铜钱：普通 1，精锐 3，敌将 15
    if (z.survTier < 1) { S.money += 1; S.coinGot += 1; if (Math.random() > .07) return; }   // 11/11 用户定：普通杀敌直接入账，只有多出来的钱掉在地上要捡
    const v = z.survTier >= 2 ? 15 : z.survTier === 1 ? 5 : 3 + (Math.random() * 3 | 0);
    const n = Math.min(5, v), each = Math.ceil(v / n);
    for (let i = 0; i < n; i++) S.coins.push({ x: z.x + R(-14, 14), y: z.y + R(-6, 6), z: 8 + R(0, 10), vz: R(60, 110), vx: R(-40, 40), v: each, t: 0 });
    tut('coin');
  }
  function coinTick(dt) {
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
    const ok = COIN_IMG.complete && COIN_IMG.naturalWidth;
    for (const c of S.coins) {
      const bob = Math.sin(c.t * 5 + c.x) * 1.2, sz = 11;
      ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(c.x, c.y + 2, 5, 2, 0, 0, 7); ctx.fill();
      if (ok) ctx.drawImage(COIN_IMG, 20, 20, 88, 88, c.x - sz / 2, c.y - sz - c.z + bob, sz, sz);
      else { ctx.fillStyle = '#e8b84a'; ctx.beginPath(); ctx.arc(c.x, c.y - 5 - c.z + bob, 4, 0, 7); ctx.fill(); }
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
    d.innerHTML = `<b>战报</b><span>击倒 ${R.kills}</span><span>铜钱 +${R.got + R.left}</span><span>受伤 ${R.taken}</span>`;
    document.body.appendChild(d); setTimeout(() => d.classList.add('out'), 2600); setTimeout(() => d.remove(), 3200);
  }

  // 整备屏样式（11/11：1:1 照群侠幸存者，框体/图标用用户给的 Gemini 素材）
  const uiK = () => Math.max(.5, Math.min(1.45, Math.min(innerHeight / 860, innerWidth / 1500)));   // 整备屏/提醒框的缩放系数（CSS 里 calc 不能把长度除成纯数字，只能 JS 算）
  addEventListener('resize', () => { for (const id of ['survPrep', 'survTut']) { const e = document.getElementById(id); if (e) e.style.setProperty('--k', uiK()); } });
  const PREP_CSS = `
#survPrep{position:fixed;inset:0;z-index:10025;background:radial-gradient(ellipse at 50% 40%,rgba(14,10,8,.72),rgba(6,4,3,.9));font-family:"PingFang SC","Microsoft YaHei",sans-serif;color:#efe2c6;user-select:none}
#survPrep em{display:inline-block;background:center/contain no-repeat;vertical-align:middle;font-style:normal}
#survPrep .mo{position:absolute;left:1.2vw;top:1.6vh;height:calc(56px*var(--k));min-width:calc(200px*var(--k));display:flex;align-items:center;gap:calc(14px*var(--k));padding:0 calc(22px*var(--k));border:calc(14px*var(--k)) solid transparent;border-image:url(art/ui/prep/btn.webp) 40 fill stretch;box-sizing:border-box}
#survPrep .mo em{width:calc(40px*var(--k));height:calc(40px*var(--k))}#survPrep .mo b{font:900 calc(30px*var(--k)) "PingFang SC",sans-serif;color:#fff2d4}
#survPrep .tb{position:absolute;left:50%;transform:translateX(-50%);top:1.5vh;display:flex;gap:calc(4px*var(--k))}
#survPrep .tb button{position:relative;width:calc(180px*var(--k));height:calc(66px*var(--k));border:0;background:url(art/ui/prep/tab.webp) center/100% 100% no-repeat;color:#cbb894;font:900 calc(26px*var(--k)) "Songti SC","STSong","Noto Serif SC",serif;letter-spacing:.3em;text-indent:.3em;cursor:pointer}
#survPrep .tb button.on{background-image:url(art/ui/prep/tab_on.webp);color:#3a1e08;text-shadow:0 1px 0 rgba(255,240,200,.6);filter:drop-shadow(0 0 calc(10px*var(--k)) rgba(255,190,80,.55))}
#survPrep .tb button i{position:absolute;right:calc(10px*var(--k));top:calc(-4px*var(--k));min-width:calc(22px*var(--k));height:calc(22px*var(--k));border-radius:11px;background:#b8281e;color:#fff;font:700 calc(13px*var(--k))/calc(22px*var(--k)) sans-serif;font-style:normal;letter-spacing:0;text-indent:0}
#survPrep .tl{position:absolute;left:30vw;right:30vw;top:calc(1.5vh + 74px*var(--k));height:1px;background:linear-gradient(90deg,transparent,#b08a4a 15%,#b08a4a 85%,transparent)}
#survPrep .bd{position:absolute;left:3vw;right:3vw;top:calc(1.5vh + 92px*var(--k));bottom:calc(250px*var(--k));display:flex;gap:calc(18px*var(--k));justify-content:center}
#survPrep .pn{position:relative;flex:1;max-width:calc(660px*var(--k));border:calc(34px*var(--k)) solid transparent;border-image:url(art/ui/prep/panel.webp) 90 fill stretch;padding:calc(4px*var(--k)) calc(8px*var(--k));overflow:auto;box-sizing:border-box;scrollbar-width:thin}
#survPrep .pn.wide{max-width:none;display:flex;align-items:center;justify-content:center}
#survPrep h4{margin:calc(4px*var(--k)) 0 calc(8px*var(--k));padding-bottom:calc(5px*var(--k));border-bottom:1px solid rgba(176,138,74,.5);font:700 calc(19px*var(--k)) "Songti SC","Noto Serif SC",serif;color:#cbb894;letter-spacing:.15em;display:flex;justify-content:space-between;align-items:flex-end}
#survPrep h4 small{font:400 calc(13px*var(--k)) sans-serif;color:#8f7c5e;letter-spacing:0}
#survPrep .sm{display:grid;grid-template-columns:auto 1fr auto 1fr;gap:calc(10px*var(--k));align-items:center;font-size:calc(19px*var(--k));color:#bfa98a}#survPrep .sm span{display:flex;align-items:center;gap:6px}#survPrep .sm em{width:calc(30px*var(--k));height:calc(30px*var(--k))}#survPrep .sm b{font:900 calc(26px*var(--k)) sans-serif;color:#fff2d4}
#survPrep .nt{margin:calc(6px*var(--k)) 0 0;font-size:calc(14px*var(--k));color:#8f7c5e}
#survPrep .ln{margin:calc(6px*var(--k)) 0;font-size:calc(18px*var(--k));color:#cbb894;display:flex;align-items:center;gap:calc(8px*var(--k))}#survPrep .ln em{width:calc(28px*var(--k));height:calc(28px*var(--k))}#survPrep .ln b{color:#fff;font-size:calc(21px*var(--k))}#survPrep .c1{color:#5cc8ff!important}#survPrep .c2{color:#ff5a5a!important}
#survPrep .pb{display:flex;align-items:center;gap:calc(10px*var(--k));margin:calc(6px*var(--k)) 0}#survPrep .pb>em{width:calc(42px*var(--k));height:calc(42px*var(--k));flex:none;border:1px solid #8a6a3a;background-size:cover}
#survPrep .pbf{position:relative;flex:1;height:calc(30px*var(--k));border:calc(10px*var(--k)) solid transparent;border-image:url(art/ui/prep/pbar.webp) 40 60 fill stretch;box-sizing:border-box;display:flex;align-items:center;justify-content:space-between;padding:0 calc(10px*var(--k));overflow:hidden}
#survPrep .pbf u{position:absolute;left:0;top:0;bottom:0;background:linear-gradient(90deg,#8a5a14,#e8b040 80%,#fff0a8);opacity:.9}#survPrep .pbf b,#survPrep .pbf i{position:relative;font:900 calc(15px*var(--k)) sans-serif;font-style:normal;color:#fff6dc;text-shadow:0 1px 2px #000}
#survPrep .em2{text-align:center;color:#8f7c5e;font-size:calc(20px*var(--k));line-height:1.8}#survPrep .em2 small{font-size:.7em}#survPrep .ov{position:absolute;left:0;right:0;top:45%}
#survPrep .gd{display:grid;grid-template-columns:repeat(4,1fr);gap:calc(10px*var(--k))}
#survPrep .sl{position:relative;aspect-ratio:1;background:url(art/ui/prep/slot.webp) center/100% 100% no-repeat;display:flex;align-items:center;justify-content:center;cursor:default}#survPrep .sl[data-a]{cursor:pointer}
#survPrep .sl em{width:80%;height:80%;background-size:cover}#survPrep .sl em.ghost{opacity:.5;background-size:contain}
#survPrep .sl.on{filter:drop-shadow(0 0 calc(8px*var(--k)) rgba(255,210,110,.9))}#survPrep .sl[style*="--rc"]{box-shadow:inset 0 0 0 2px var(--rc)}
#survPrep .sl .eq{position:absolute;right:2px;bottom:2px;padding:0 4px;background:rgba(10,6,4,.85);border:1px solid #b08a4a;font:700 calc(12px*var(--k)) sans-serif;font-style:normal;color:#ffe9b8}
#survPrep .dt{display:flex;flex-direction:column;height:100%}#survPrep .dh{display:flex;gap:calc(14px*var(--k));align-items:center}#survPrep .dh>em{width:calc(96px*var(--k));height:calc(96px*var(--k));flex:none;border:2px solid #8a6a3a;background-size:cover}
#survPrep .dh h3{margin:0;font:900 calc(30px*var(--k)) "Songti SC","Noto Serif SC",serif;color:#fff2d4}#survPrep .dh p{margin:calc(2px*var(--k)) 0;font-size:calc(17px*var(--k))}
#survPrep .tg{display:flex;gap:calc(5px*var(--k));flex-wrap:wrap}#survPrep .tg span{padding:0 calc(6px*var(--k));border:1px solid #b08a4a;border-radius:3px;font-size:calc(14px*var(--k));color:#e9cf98}
#survPrep h5{margin:calc(14px*var(--k)) 0 calc(4px*var(--k));font:400 calc(17px*var(--k)) sans-serif;color:#8f7c5e}#survPrep .ds{margin:0;font-size:calc(18px*var(--k));line-height:1.6;color:#efe2c6;flex:1}#survPrep .ds2{margin:calc(4px*var(--k)) 0;font-size:calc(14px*var(--k));color:#8f7c5e}
#survPrep .db{display:flex;gap:calc(10px*var(--k));justify-content:center;margin-top:calc(8px*var(--k));flex-wrap:wrap}
#survPrep .db button,#survPrep .bb{border:calc(12px*var(--k)) solid transparent;border-image:url(art/ui/prep/btn.webp) 40 fill stretch;background:none;color:#f6e6c4;font:900 calc(20px*var(--k)) "Songti SC","Noto Serif SC",serif;letter-spacing:.15em;padding:calc(2px*var(--k)) calc(18px*var(--k));cursor:pointer;display:inline-flex;align-items:center;gap:calc(6px*var(--k))}
#survPrep .db button em,#survPrep .bb em{width:calc(26px*var(--k));height:calc(26px*var(--k))}#survPrep button:disabled{opacity:.45;cursor:not-allowed}#survPrep .db button:hover:not(:disabled),#survPrep .bb:hover:not(:disabled){filter:brightness(1.25)}
#survPrep .cd{display:flex;flex-direction:column;align-items:center;text-align:center;max-width:calc(420px*var(--k))}#survPrep .cd .bi{width:calc(120px*var(--k));height:calc(120px*var(--k));padding:calc(12px*var(--k));box-sizing:border-box;background-color:rgba(0,0,0,.35);background-origin:content-box;border:calc(10px*var(--k)) solid transparent;border-image:url(art/ui/prep/pframe.webp) 50 stretch}
#survPrep .cd h3{margin:calc(10px*var(--k)) 0 0;font:900 calc(32px*var(--k)) "Songti SC","Noto Serif SC",serif;color:#fff2d4}#survPrep .cd>p{margin:calc(2px*var(--k)) 0;font-size:calc(18px*var(--k))}
#survPrep .dv{display:block;width:60%;height:1px;margin:calc(10px*var(--k)) 0;background:linear-gradient(90deg,transparent,#b08a4a,transparent)}#survPrep .up{font-size:calc(24px*var(--k))!important;color:#efe2c6}#survPrep .up b{color:#ffd86e;margin-right:6px}
#survPrep .sd{flex:1;font-size:calc(16px*var(--k))!important;color:#bfa98a}#survPrep .cd .bb{margin-top:auto;font-size:calc(26px*var(--k))}
#survPrep .cd.sh{align-items:stretch;text-align:left}#survPrep .cd.sh .buy{align-self:center;font-family:"PingFang SC",sans-serif}#survPrep .cd.sh .buy b{font-size:calc(26px*var(--k));color:#fff}
#survPrep .ch{display:flex;align-items:center;gap:calc(4px*var(--k))}#survPrep .ch .sl{width:calc(78px*var(--k))}#survPrep .ar2{width:calc(14px*var(--k));height:calc(18px*var(--k));background:url(art/ui/prep/arrow.webp) center/contain no-repeat;flex:none}
#survPrep .two{display:grid;grid-template-columns:3fr 1fr;gap:calc(16px*var(--k))}#survPrep .rw{display:flex;gap:calc(8px*var(--k))}#survPrep .rw .sl{width:calc(70px*var(--k))}
#survPrep .t-wu .pn:first-child{flex:1.35;max-width:calc(820px*var(--k))}
#survPrep .ab{position:absolute;left:1.5vw;right:1.5vw;bottom:calc(84px*var(--k));height:calc(140px*var(--k));display:flex;align-items:center}
#survPrep .ab .md{width:calc(150px*var(--k));height:calc(150px*var(--k));flex:none;background:url(art/ui/prep/medal.webp) center/contain no-repeat;display:flex;align-items:center;justify-content:center;z-index:1}#survPrep .ab .md em{width:58%;height:58%}
#survPrep .ar{flex:1;height:calc(124px*var(--k));margin:0 calc(-20px*var(--k));border:calc(22px*var(--k)) solid transparent;border-image:url(art/ui/prep/bar.webp) 60 90 fill stretch;display:flex;align-items:center;justify-content:space-around;padding:0 calc(26px*var(--k));box-sizing:border-box}
#survPrep .ac{display:flex;flex-direction:column;align-items:center;gap:calc(2px*var(--k));cursor:help}#survPrep .ac span{font:700 calc(17px*var(--k)) "Songti SC","Noto Serif SC",serif;color:#bfa98a}#survPrep .ac em{width:calc(36px*var(--k));height:calc(36px*var(--k))}#survPrep .ac b{font:900 calc(20px*var(--k)) sans-serif;color:#ffcf6a}
#survPrep .ar .sp{width:1px;align-self:stretch;margin:calc(8px*var(--k)) 0;background:linear-gradient(transparent,#b08a4a,transparent)}
#survPrep .vt{position:absolute;left:50%;transform:translateX(-50%);bottom:calc(8px*var(--k));width:min(46vw,calc(760px*var(--k)));display:flex;flex-direction:column;gap:calc(4px*var(--k))}
#survPrep .vb{display:flex;align-items:center;gap:calc(6px*var(--k))}#survPrep .vb>em{width:calc(34px*var(--k));height:calc(34px*var(--k))}
#survPrep .vf{position:relative;flex:1;height:calc(32px*var(--k));border:calc(10px*var(--k)) solid transparent;border-image:url(art/ui/prep/pbar.webp) 40 60 fill stretch;box-sizing:border-box;display:flex;align-items:center;justify-content:center;overflow:hidden}
#survPrep .vf u{position:absolute;left:0;top:0;bottom:0}#survPrep .vf.zq u{background:linear-gradient(180deg,#5cc0ff,#1f5fa8)}#survPrep .vf.hp u{background:linear-gradient(180deg,#e0463a,#8c1c18)}#survPrep .vf b{position:relative;font:900 calc(16px*var(--k)) sans-serif;color:#fff;text-shadow:0 1px 2px #000}
#survPrep .lf{position:absolute;left:1.5vw;bottom:calc(14px*var(--k))}#survPrep .rf{font-size:calc(24px*var(--k))!important;padding:calc(4px*var(--k)) calc(30px*var(--k))!important}#survPrep .rf span{margin-left:calc(20px*var(--k));font-family:sans-serif;color:#fff}
#survPrep .shn{margin:0;color:#8f7c5e;font-size:calc(15px*var(--k))}
#survPrep .go{position:absolute;right:1.5vw;bottom:calc(10px*var(--k));min-width:calc(250px*var(--k));justify-content:center;font-size:calc(30px*var(--k))!important;padding:calc(6px*var(--k)) calc(30px*var(--k))!important;letter-spacing:.4em!important}
#survPrep .ac b,#survPrep .mo b,#survPrep .sm b,#survPrep .pbf b,#survPrep .pbf i,#survPrep .vf b,#survPrep .ln b,#survPrep .rf span,#survPrep .buy b{font-family:"Arial Black","Impact","PingFang SC",sans-serif;letter-spacing:.04em;-webkit-text-stroke:calc(1px*var(--k)) rgba(20,10,4,.9);paint-order:stroke fill}
#survPrep .pn::-webkit-scrollbar{width:calc(8px*var(--k))}#survPrep .pn::-webkit-scrollbar-track{background:rgba(0,0,0,.35);border:1px solid #5a4226}#survPrep .pn::-webkit-scrollbar-thumb{background:linear-gradient(90deg,#8a6a3a,#d8b060,#8a6a3a);border-radius:4px}#survPrep .pn{scrollbar-color:#b08a4a rgba(0,0,0,.35)}
#survPrep h4 .so{padding:0 calc(10px*var(--k));height:calc(26px*var(--k));border:calc(6px*var(--k)) solid transparent;border-image:url(art/ui/prep/sbtn.webp) 30 fill stretch;background:none;color:#cbb894;font:600 calc(14px*var(--k)) sans-serif;letter-spacing:0;cursor:pointer;line-height:1}
#survTut .tskip{position:fixed;right:calc(20px*var(--k));top:calc(18px*var(--k));padding:calc(4px*var(--k)) calc(14px*var(--k));background:linear-gradient(90deg,transparent,rgba(0,0,0,.7) 30%);font:600 calc(22px*var(--k)) "PingFang SC",sans-serif;color:#9a8a70}#survTut .tskip b{color:#efe2c6}
@media (max-height:520px){#survPrep .ac span{display:none}}
#survTut{position:fixed;right:1vw;bottom:calc(16vh + 60px);z-index:10040;display:flex;align-items:stretch;width:min(820px,60vw);cursor:pointer;animation:tutIn .3s ease-out}
@keyframes tutIn{from{transform:translateY(16px);opacity:0}}
#survTut .bx{position:relative;flex:1;border:calc(18px*var(--k)) solid transparent;border-image:url(art/ui/prep/dialog.webp) 40 fill stretch;padding:calc(6px*var(--k)) calc(18px*var(--k));color:#f6ecd6;display:flex;flex-direction:column;justify-content:center}
#survTut .nm{position:absolute;left:calc(14px*var(--k));top:calc(-34px*var(--k));padding:calc(2px*var(--k)) calc(22px*var(--k));border:calc(10px*var(--k)) solid transparent;border-image:url(art/ui/prep/tab.webp) 30 fill stretch;font:900 calc(22px*var(--k)) "Songti SC","Noto Serif SC",serif;letter-spacing:.2em;color:#ffe9b8}
#survTut p{margin:calc(6px*var(--k)) 0;font:600 calc(21px*var(--k))/1.55 "PingFang SC",sans-serif}#survTut small{align-self:flex-end;font-size:calc(13px*var(--k));color:#8f7c5e}#survTut small b{color:#e9dcc0}
#survTut>em{width:calc(150px*var(--k));flex:none;background:center/cover no-repeat;border:calc(14px*var(--k)) solid transparent;border-image:url(art/ui/prep/pframe.webp) 50 stretch;background-clip:padding-box}
#survTut.big{left:0;right:0;bottom:3vh;width:auto;padding-left:22vw}#survTut.big .bx{min-height:calc(170px*var(--k))}#survTut .lh{position:fixed;left:0;bottom:0;width:34vw;height:88vh;background:left bottom/contain no-repeat;pointer-events:none;filter:drop-shadow(0 0 20px rgba(0,0,0,.6))}
body.prep-open #survTut:not(.big){bottom:calc(80px*var(--k));width:min(900px,58vw)}
@media (max-height:520px){#survTut{bottom:calc(30vh);width:min(620px,70vw)}#survTut.big{padding-left:26vw}}
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
  function rollShop() {   // 行商：两件道具 + 一本秘籍，三选一只能买一件，不能刷新
    const ks = Object.keys(ITEMS).sort(() => Math.random() - .5), out = [itemOf(ks[0]), itemOf(ks[1])], seen = new Set(ownedAll().concat(S.loot.map(it => it.k || it.id)));
    for (const o of rewardOptions(undefined).concat(rewardOptions('perk'))) { const it = itemFrom(o); const key = it && (it.k || it.id); if (it && !seen.has(key)) { out.push(it); break; } }
    return out.sort(() => Math.random() - .5);
  }
  function learn(it) {   // 格子满了也能学：先放进「掌握武学」，在武学页换上
    S.owned = S.owned || [];
    if (it.kind === 'skill') { const f = S.slots.indexOf(''); if (f >= 0) S.slots[f] = it.k; else S.owned.push(it.k); tut('learn'); }
    else if (it.kind === 'gf') { if (GF[it.id].qg) { if (!S.qg) S.qg = it.id; else S.owned.push(it.id); } else { const f = S.gf.indexOf(''); if (f >= 0) S.gf[f] = it.id; else S.owned.push(it.id); } GM = gfCalc(); }
    else if (it.kind === 'item') { if (ITEMS[it.id].use) heal(maxHp() * .4); else (S.items = S.items || []).push(it.id); GM = gfCalc(); }
    return true;
  }

  // ---- 整备屏（1:1 照群侠幸存者：结算 / 拾取 / 修炼 / 行商 / 武学）----
  let prepNd = null, prepTab = 'jie', selLoot = 0, selWu = null;
  const TABS = [['jie', '结算'], ['shi', '拾取'], ['xiu', '修炼'], ['shang', '行商'], ['wu', '武学']];
  const A = n => `art/ui/attr/${n}.webp`, PU = n => `art/ui/prep/${n}.webp`;
  const ATI = ['tipo', 'duan', 'chang', 'shen', 'yun', 'wu'];
  const ATD = ['提高气血，受到的伤害按比例减少', '提高刀、剑等短兵武艺伤害', '提高枪、关刀等长兵武艺伤害', '提高移动速度', '提高暴击率，修炼更容易出好品阶', '武艺、心法熟练度和修为涨得更快'];
  const icoOf = it => it.kind === 'item' ? `art/ui/item/${it.id}.webp` : iconUrl(it.kind, it.k || it.id) || '';
  const RQ = ['普通', '精良', '稀有', '绝世'], RQC = ['#e8e0d0', '#6fb8ff', '#c58cff', '#ffb347'];
  const tagsOf = it => it.kind === 'skill' ? ['武艺', '主动', '刀'] : it.kind === 'gf' ? (GF[it.id].qg ? ['轻功', '被动'] : ['心法', '被动']) : ITEMS[it.id].use ? ['道具', '消耗'] : ['道具', '永久'];
  function prepOpen(nd) { { const t = document.getElementById('survTut'); if (t) t.remove(); tutQ = []; }   // 战斗里没看完的提醒不带进整备屏
    prepNd = nd; prepTab = 'jie'; selLoot = 0; selWu = null; if (window.SFX) SFX.play('j_shop'); prepRender(); tut('prep'); }
  function prepClose() {
    for (const it of S.loot || []) S.money += it.sell;   // 没处理的战利品：按卖价自动换钱
    S.loot = []; const el = document.getElementById('survPrep'); if (el) el.remove(); document.body.classList.remove('prep-open'); { const t = document.getElementById('survTut'); if (t) t.remove(); tutQ = []; } W.pick = false; const nd = prepNd; prepNd = null; ROUTE.done(nd);
  }
  const bar = (lv, r, ic) => `<div class="pb">${ic ? `<em style="background-image:url('${ic}')"></em>` : ''}<div class="pbf"><u style="width:${Math.round(r * 100)}%"></u><b>LV. ${lv}</b><i>${(r * 100).toFixed(1)}%</i></div></div>`;
  const mastR = k => { const m = S.mast[k] || 0, l = lvOf(k); return l >= 10 ? 1 : Math.min(1, (m - MAST_T[l - 1]) / (MAST_T[l] - MAST_T[l - 1])); };
  const gfR = id => { const e = S.gfExp[id] || 0, l = gfLv(id); return l >= 3 ? 1 : Math.min(1, (e - (l === 1 ? 0 : GFTH[0])) / (GFTH[l - 1] - (l === 1 ? 0 : GFTH[0]))); };
  function attrBar() {   // 底部常驻属性栏
    const ai = attrInfo(origin, true), mh = maxHp(), cr = .05 + AFX.crit() + GM.crit + IT('crit');
    const col = (lab, ic, v, tip) => `<div class="ac" title="${tip}"><span>${lab}</span><em style="background-image:url('${A(ic)}')"></em><b>${v}</b></div>`;
    return `<div class="ab"><div class="md"><em style="background-image:url('${A('bag')}')"></em></div><div class="ar">${ai.map((r, i) => col(r[0], ATI[i], r[1], r[0] + '：' + ATD[i] + '（' + r[2] + '）')).join('')}<i class="sp"></i>${col('气血', 'hp', Math.round(mh * 10), '最大气血')}${col('真气', 'zq', Math.round(zqMax() * 10), '护体挡三成伤害；过半自动发劲')}${col('会心', 'crit', Math.round(cr * 100) + '%', '暴击率')}${col('修为', 'xiu', 'LV' + S.lv, '修为等级')}</div><div class="md"><em style="background-image:url('${A('wuxue')}')"></em></div></div>`;
  }
  function vitals() {
    const mh = maxHp(), zr = Math.max(0, S.zq / zqMax()), hr = hero.hp / mh;
    return `<div class="vt"><div class="vb"><em style="background-image:url('${A('zq')}')"></em><div class="vf zq"><u style="width:${zr * 100}%"></u><b>${Math.round(S.zq * 10)} / ${Math.round(zqMax() * 10)}</b></div></div><div class="vb"><em style="background-image:url('${A('hp')}')"></em><div class="vf hp"><u style="width:${hr * 100}%"></u><b>${Math.ceil(hero.hp * 10)} / ${Math.round(mh * 10)}</b></div></div></div>`;
  }
  function detail(it, btns) {
    if (!it) return '<p class="em2">选择一件战利品</p>';
    return `<div class="dt"><div class="dh"><em style="background-image:url('${icoOf(it)}')"></em><div><h3>${it.name}</h3><p style="color:${RQC[Math.min(3, it.q || 0)]}">${RQ[Math.min(3, it.q || 0)]}</p><div class="tg">${tagsOf(it).map(t => `<span>${t}</span>`).join('')}</div></div></div><h5>${it.kind === 'item' ? '道具属性' : it.kind === 'skill' ? '武艺效果' : '心法效果'}</h5><p class="ds">${it.desc}</p><div class="db">${btns}</div></div>`;
  }
  function prepRender() {
    let el = document.getElementById('survPrep');
    if (!el) { el = document.createElement('div'); el.id = 'survPrep'; document.body.appendChild(el); el.addEventListener('pointerdown', e => e.stopPropagation()); }
    el.style.setProperty('--k', uiK()); document.body.classList.add('prep-open');
    const R = S.rep || {};
    let body = '', left = '';
    if (prepTab === 'jie') {
      const tot = S.slots.filter(Boolean).reduce((t, k) => t + (S.dps[k] || 0), 0) || 1;
      const outs = S.slots.filter(Boolean).map(k => `<div class="pb"><em style="background-image:url('${IMGU[k] || ''}')"></em><div class="pbf"><u style="width:${(S.dps[k] || 0) / tot * 100}%"></u><b>${Math.round((S.dps[k] || 0) * 10)}</b><i>${((S.dps[k] || 0) / tot * 100).toFixed(1)}%</i></div></div>`).join('');
      body = `<div class="pn"><h4>总结</h4><div class="sm"><span><em style="background-image:url('${A('kill')}')"></em>斩敌</span><b>${R.kills}</b><span><em style="background-image:url('${A('coin')}')"></em>铜钱</span><b>${R.got + R.left}</b></div>${R.left ? `<p class="nt">地上没捡的钱袋，帮你收回了九成：+${R.left}</p>` : ''}
          <h4>输出统计</h4>${outs}
          <h4>调息</h4><p class="ln">剩余 <em style="background-image:url('${A('zq')}')"></em> 真气 <b class="c1">${R.zqLeft || 0}</b> 点</p><p class="ln">转换为 <b class="c2">${R.tiao}</b> 点 <em style="background-image:url('${A('hp')}')"></em> 气血</p><p class="ln"><em style="background-image:url('${A('huti')}')"></em> 护体 总共免除了 <b>${Math.round((S.hutiSum || 0) * 10)}</b> 点伤害</p></div>
        <div class="pn"><h4>修为</h4>${bar(S.lv, Math.min(1, S.xiu / XIU_NEED(S.lv)), A('xiu'))}<h4>武艺</h4>${S.slots.filter(Boolean).map(k => bar(lvOf(k), mastR(k), IMGU[k])).join('')}<h4>心法</h4>${S.gf.concat([S.qg]).filter(Boolean).map(id => bar(gfLv(id), gfR(id), `art/ui/gf/${id}.webp`)).join('') || '<p class="em2" style="padding:6px 0">还没有心法</p>'}</div>`;
    } else if (prepTab === 'shi') {
      const L = S.loot.slice().sort((a, b) => S.sortDn === false ? (a.q || 0) - (b.q || 0) : (b.q || 0) - (a.q || 0)); S.loot = L; selLoot = Math.min(selLoot, L.length - 1);
      const sel = L[selLoot];
      body = `<div class="pn"><h4>战利品<button class="so" data-a="sort">稀有度 ${S.sortDn === false ? '▲' : '▼'}</button></h4><div class="gd">${Array.from({ length: 16 }, (_, i) => L[i] ? `<div class="sl ${i === selLoot ? 'on' : ''}" data-a="sel" data-i="${i}" style="--rc:${RQC[Math.min(3, L[i].q || 0)]}"><em style="background-image:url('${icoOf(L[i])}')"></em></div>` : '<div class="sl"></div>').join('')}</div>${L.length ? '' : '<p class="em2 ov">暂无战利品</p>'}</div>
        <div class="pn">${sel ? detail(sel, `<button data-a="learn" data-i="${selLoot}">${sel.kind === 'item' ? '收下' : '学会'}</button><button data-a="sell" data-i="${selLoot}">卖掉 ${sel.sell}<em style="background-image:url('${A('coin')}')"></em></button>`) : detail(null)}</div>`;
    } else if (prepTab === 'xiu') {
      if (!S.bank) body = `<div class="pn wide"><p class="em2">修为 LV.${S.lv} · 暂无修炼机会<br><small>斩敌、打完仗都会攒修为，每升一层得一次修炼</small></p></div>`;
      else { S.xopts = S.xopts || rollXiu(); body = S.xopts.map((o, j) => { const [a0, v0] = o.adds[0]; return `<div class="pn cd"><em class="bi" style="background-image:url('${A(ATI[a0])}')"></em><h3>${ATN[a0]}修炼</h3><p style="color:${RAR[o.q][1]}">${['普通', '精良', '稀有', '绝世'][o.q]}</p><i class="dv"></i>${o.adds.map(([a, v]) => `<p class="up"><b>+${v}</b> ${ATN[a]}</p>`).join('')}<p class="sd">${ATD[a0]}</p><button class="bb" data-a="xiu" data-i="${j}">修 炼</button></div>`; }).join('');
        left = `<button class="bb rf" data-a="xrr" ${S.xrr ? 'disabled' : ''}>刷新<span>${S.xrr ? 0 : 1}/1</span></button>`; }
    } else if (prepTab === 'shang') {
      body = S.shop.map((it, i) => `<div class="pn cd sh"><div class="dh"><em style="background-image:url('${icoOf(it)}')"></em><div><h3>${it.name}</h3><p style="color:${RQC[Math.min(3, it.q || 0)]}">${RQ[Math.min(3, it.q || 0)]}</p><div class="tg">${tagsOf(it).map(t => `<span>${t}</span>`).join('')}</div></div></div><h5>${it.kind === 'item' ? '道具属性' : it.kind === 'skill' ? '武艺效果' : '心法效果'}</h5><p class="ds">${it.desc}</p><button class="bb buy" data-a="buy" data-i="${i}" ${S.bought >= 0 || S.money < it.price ? 'disabled' : ''}>${S.bought === i ? '已买下' : `购买 <b>${it.price}</b><em style="background-image:url('${A('coin')}')"></em>`}</button></div>`).join('');
      left = `<p class="shn">三件只能买一件 · 不能刷新</p>`;
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
      <div class="bd t-${prepTab}">${body}</div>
      ${attrBar()}${vitals()}<div class="lf">${left}</div><button class="bb go">${prepTab === 'wu' ? '出 发' : '继 续'}</button>`;
    el.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { prepTab = b.dataset.t; if (window.SFX) SFX.play('tick'); prepRender(); tut({ shi: 'loot', xiu: 'xiu', shang: 'shop', wu: 'wu' }[prepTab]); });
    el.querySelector('.go').onclick = () => { const i = TABS.findIndex(t => t[0] === prepTab); if (i < TABS.length - 1) { prepTab = TABS[i + 1][0]; prepRender(); tut({ shi: 'loot', xiu: 'xiu', shang: 'shop', wu: 'wu' }[prepTab]); } else prepClose(); };   // 照原作：继续 = 下一页，最后一页「出发」
    el.querySelectorAll('[data-a]').forEach(b => b.onclick = e => {
      e.preventDefault(); if (b.disabled) return; const a = b.dataset.a, i = +b.dataset.i, k = b.dataset.k;
      if (a === 'sel') selLoot = i;
      else if (a === 'sort') { S.sortDn = S.sortDn === false; selLoot = 0; }
      else if (a === 'learn') { learn(S.loot[i]); S.loot.splice(i, 1); if (window.SFX) SFX.play('j_pick1'); }
      else if (a === 'sell') { S.money += S.loot[i].sell; S.loot.splice(i, 1); if (window.SFX) SFX.play('coin'); }
      else if (a === 'buy') { const it = S.shop[i]; if (S.money >= it.price) { S.money -= it.price; learn(it); S.bought = i; if (window.SFX) SFX.play('j_shop'); } }
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
    prep: ['liu', '打完一仗先歇口气。从「结算」看起，再去「拾取」「修炼」「行商」，最后在「武学」排好出手顺序。'],
    loot: ['zhang', '这些都是从贼兵身上扒下来的！用得上就学，用不上就卖给行商换钱！'],
    xiu: ['liu', '你在阵上攒下的修为，每升一层就能修炼一次，三选一，挑你最缺的。'],
    shop: ['zhang', '行商那里三件货只能买一件，想好了再掏钱！'],
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
    const d = document.createElement('div'); d.id = 'survTut'; if (big) d.className = 'big'; d.style.setProperty('--k', uiK());
    d.innerHTML = (big ? `<div class="lh" style="background-image:url('art/ui/npc/liubei_full.webp')"></div>` : '') + `<div class="bx"><b class="nm">${nm}</b><p>${txt}</p><small>${document.getElementById('survPrep') ? '按 <b>空格键</b> 或点一下 继续' : '点一下关闭'}</small></div>${big ? '' : `<em style="background-image:url('${face}')"></em>`}`;
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
  const snap = () => ({ origin, slots: S.slots.slice(), held: S.held, mast: { ...S.mast }, gf: S.gf.slice(), qg: S.qg, gfExp: { ...S.gfExp }, xy: S.xy, rt: { dmg: RT.dmg, cd: RT.cd, move: RT.move, take: RT.take }, hp: hero ? hero.hp : null, lv: S.lv, xiu: S.xiu, bank: S.bank, atAdd: (S.atAdd || []).slice(), money: S.money || 0, items: (S.items || []).slice(), owned: (S.owned || []).slice() });
  function restore(o) {
    if (!o) return;
    if (ORIGINS[o.origin]) origin = o.origin;
    S.slots = o.slots || S.slots; S.held = o.held != null ? o.held : S.held; S.mast = o.mast || {}; S.gf = o.gf || ['', '', '']; S.qg = o.qg || ''; S.gfExp = o.gfExp || {}; S.xy = o.xy || 0;
    S.money = o.money || 0; S.coins = []; S.loot = []; S.shop = []; S.items = o.items || []; S.owned = o.owned || [];
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
    S.lv = 1; S.xiu = 0; S.bank = 0; S.atAdd = [0, 0, 0, 0, 0, 0]; S.lvFx = 0; S.money = 0; S.coins = []; S.loot = []; S.shop = []; S.items = []; S.owned = []; S.hutiSum = 0; S.slots = [OG().skill || 'hengsao', '', '', '', '']; S.held = wepOf(S.slots[0]) < 7 ? wepOf(S.slots[0]) : null; S.mast = {}; S.dps = {}; S.gf = ['', '', '']; S.qg = ''; S.gfExp = {}; S.xy = 0; S.lhjReady = false; S.lhjOn = false; GM = GM0(); S.zq = zqMax(); S.hp0 = hero.hp; S.combo = 0; S.lk = typeof kills === 'number' ? kills : 0; S.chain = 0; S.lastCat = -1; S.lastI = -9; W.pick = false; const old = document.getElementById('survPick'); if (old) old.remove();
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
  // HUD 美术（11/11 Gemini）：武艺图标、行标、空格、太极、血滴
  const HIMG = {}; const himg = (k, u) => { const i = new Image(); i.src = u; HIMG[k] = i; };
  himg('empty', 'art/ui/hud/empty.webp'); himg('waigong', 'art/ui/hud/waigong.webp'); himg('neigong', 'art/ui/hud/neigong.webp'); himg('qinggong', 'art/ui/hud/qinggong.webp');
  himg('taiji', 'art/ui/hud/taiji.webp'); himg('blood', 'art/ui/hud/blood.webp');
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
      ctx.fillStyle = '#241812'; ctx.fillRect(x, y, sz, sz);
      if (k) {
        ctx.fillStyle = k.color; ctx.globalAlpha = .22 + (i >= 0 && S.flash[i] > 0 ? .5 : 0); ctx.fillRect(x, y, sz, sz); ctx.globalAlpha = 1;
        if (i >= 0 && S.wind && S.wind.i === i) { ctx.fillStyle = 'rgba(255,230,140,.45)'; ctx.fillRect(x, y + sz * (1 - S.wind.t / S.wind.dur), sz, sz * S.wind.t / S.wind.dur); }   // 前摇进度
        if (k.ik && hok(k.ik)) ctx.drawImage(HIMG[k.ik], x, y, sz, sz); else { ctx.font = 'bold 20px "PingFang SC",sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = k.color; ctx.fillText(k.icon, x + sz / 2, y + sz / 2 + 1); }
        if (!cur) { ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(x, y, sz, sz); }   // 没轮到的格子压暗
        ctx.font = '10px "PingFang SC",sans-serif'; ctx.fillStyle = '#c9b58c'; ctx.textBaseline = 'alphabetic'; ctx.fillText(lbl != null ? lbl : 'LV' + lvOf(S.slots[i]), x + sz - 12, y + sz - 3);
      } else if (hok('empty')) { ctx.fillStyle = '#0b0705'; ctx.fillRect(x, y, sz, sz); ctx.globalAlpha = .3; ctx.drawImage(HIMG.empty, x, y, sz, sz); ctx.globalAlpha = 1; }   // 空格压暗，和有图标的格子拉开 else { ctx.font = 'bold 18px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#4a3a2a'; ctx.fillText('+', x + sz / 2, y + sz / 2 + 1); }
      if (i >= 0 && S.skip[i] > 0) { ctx.fillStyle = 'rgba(160,160,170,.5)'; ctx.fillRect(x, y, sz, sz); }
      if (!k) { ctx.strokeStyle = 'rgba(120,96,60,.5)'; ctx.lineWidth = 1; ctx.strokeRect(x + .5, y + .5, sz - 1, sz - 1); }
      else {   // 有东西的格子：亮金边；轮到出手的那格再加白色外发光
        if (cur && i >= 0) { ctx.save(); ctx.shadowColor = '#fff2b0'; ctx.shadowBlur = 10; ctx.strokeStyle = '#fff4c8'; ctx.lineWidth = 3; ctx.strokeRect(x - 1, y - 1, sz + 2, sz + 2); ctx.restore(); }
        ctx.strokeStyle = '#f0c860'; ctx.lineWidth = 2; ctx.strokeRect(x + 1, y + 1, sz - 2, sz - 2);
      }
    };
    ctx.fillStyle = 'rgba(14,9,6,.55)'; ctx.fillRect(x0 - 6 - (lab ? lab + 6 : 0), y0 - 6, w + 12 + (lab ? lab + 6 : 0), fine ? sz * 2 + 8 + 12 : sz + 26 + 4 + 12);
    if (lab && hok('waigong')) { ctx.drawImage(HIMG.waigong, 16, y0 + (sz - lab) / 2, lab, lab); if (hok('neigong')) ctx.drawImage(HIMG.neigong, 16, y0 + sz + 8 + (sz - lab) / 2, lab, lab); }
    for (let i = 0; i < n; i++) { const kk = S.slots[i], o = SK[kk]; if (o && !o.ik && HIMG[kk]) o.ik = kk; slot(x0 + i * (sz + gap), y0, o, i === S.qi, i); }
    const gk = id => GF[id] ? { icon: GF[id].qg ? '轻' : GF[id].n[0], color: GTC[GF[id].t], ik: HIMG['gf_' + id] ? 'gf_' + id : '' } : null, sz2 = fine ? sz : 26, ry2 = y0 + sz + (fine ? 8 : 4);
    for (let i = 0; i < 3; i++) slot(x0 + i * (sz2 + gap), ry2, gk(S.gf[i]), true, -1, S.gf[i] ? 'LV' + gfLv(S.gf[i]) : '', sz2);   // 内功：主修 + 2 辅修
    slot(x0 + 3 * (sz2 + gap) + 8, ry2, gk(S.qg), true, -1, '', sz2);   // 轻功
    if (lab && hok('qinggong') && !S.qg) { ctx.globalAlpha = .28; ctx.drawImage(HIMG.qinggong, x0 + 3 * (sz2 + gap) + 8, ry2, sz2, sz2); ctx.globalAlpha = 1; }
    // 血条：屏幕底部正中（血量 ×10 显示成整数）
    const bw = fine ? Math.min(HW * .46, 520) : Math.min(HW * .44, 230), bh = fine ? 20 : 16, bx = (HW - bw) / 2, by = HH - (fine ? 18 : 12) - bh, mh = maxHp(), r = Math.max(0, Math.min(1, hero.hp / mh));
    ctx.fillStyle = 'rgba(14,9,6,.8)'; ctx.fillRect(bx - 3, by - 3, bw + 6, bh + 6); ctx.strokeStyle = '#8a6a3a'; ctx.lineWidth = 1.5; ctx.strokeRect(bx - 2.5, by - 2.5, bw + 5, bh + 5);
    const g = ctx.createLinearGradient(0, by, 0, by + bh); g.addColorStop(0, '#e0463a'); g.addColorStop(1, '#8c1c18'); ctx.fillStyle = g; ctx.fillRect(bx, by, bw * r, bh);
    ctx.font = 'bold ' + (fine ? 13 : 11) + 'px "PingFang SC",sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(20,8,6,.9)';
    if (hok('blood')) { const s2 = bh + 14; ctx.drawImage(HIMG.blood, bx - s2 - 6, by + bh / 2 - s2 / 2, s2, s2); }
    const ht = Math.ceil(hero.hp * 10 - 1e-6) + ' / ' + Math.round(mh * 10); ctx.strokeText(ht, HW / 2, by + bh / 2 + 1); ctx.fillStyle = '#fff2d8'; ctx.fillText(ht, HW / 2, by + bh / 2 + 1);
    { const zh = fine ? 12 : 9, zy = by - 8 - zh, zr = Math.max(0, Math.min(1, S.zq / zqMax()));   // 真气：蓝条叠在血条上方
      ctx.fillStyle = 'rgba(14,9,6,.8)'; ctx.fillRect(bx - 3, zy - 2, bw + 6, zh + 4);
      if (hok('taiji')) { const s3 = zh + 12; ctx.drawImage(HIMG.taiji, bx - s3 - 6, zy + zh / 2 - s3 / 2, s3, s3); }
      const g2 = ctx.createLinearGradient(0, zy, 0, zy + zh); g2.addColorStop(0, '#5cc0ff'); g2.addColorStop(1, '#1f5fa8'); ctx.fillStyle = g2; ctx.fillRect(bx, zy, bw * zr, zh);
      ctx.strokeStyle = '#4a7aa8'; ctx.lineWidth = 1; ctx.strokeRect(bx - 2.5, zy - 1.5, bw + 5, zh + 3);
      if (fine) { ctx.font = 'bold 10px "PingFang SC",sans-serif'; ctx.textBaseline = 'middle'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(8,16,30,.9)'; const zt = '真气 ' + Math.round(S.zq * 10) + ' / ' + Math.round(zqMax() * 10); ctx.strokeText(zt, HW / 2, zy + zh / 2 + 1); ctx.fillStyle = '#e2f4ff'; ctx.fillText(zt, HW / 2, zy + zh / 2 + 1); } }
    // 右侧大字：击杀、连击
    const nf = fine ? 46 : 30, rx = HW - (fine ? 22 : 12), ry = HH * (fine ? .36 : .3);
    const big = (num, label, y, a) => { ctx.globalAlpha = a; ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.font = 'bold ' + nf + 'px "PingFang SC",sans-serif'; ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(30,18,10,.85)'; ctx.strokeText(num, rx, y); ctx.fillStyle = '#f4ead0'; ctx.fillText(num, rx, y); ctx.font = 'bold ' + (fine ? 20 : 14) + 'px "PingFang SC",sans-serif'; ctx.lineWidth = 4; ctx.strokeText(label, rx, y + nf * .72); ctx.fillStyle = '#d9a84a'; ctx.fillText(label, rx, y + nf * .72); ctx.globalAlpha = 1; };
    big(String(typeof kills === 'number' ? kills : 0), '击杀', ry, 1);
    if (S.combo > 1) big(String(S.combo), '连击', ry + nf * 1.7, Math.min(1, S.comboT / .6));
    // 修为条（11/11）：顶部正中，LV + 百分比；攒着的修炼次数写在右边
    if (RT.on && RT.node && S.atAdd) {
      const bw = Math.min(HW * .42, 460), bx = (HW - bw) / 2, by = 6, bh = 13, r = Math.min(1, S.xiu / XIU_NEED(S.lv));
      ctx.save(); ctx.fillStyle = 'rgba(14,9,6,.82)'; ctx.fillRect(bx - 3, by - 2, bw + 6, bh + 4); ctx.strokeStyle = '#b08a4a'; ctx.lineWidth = 1; ctx.strokeRect(bx - 2.5, by - 1.5, bw + 5, bh + 3);
      const gx = ctx.createLinearGradient(0, by, 0, by + bh); gx.addColorStop(0, '#ffe08a'); gx.addColorStop(1, '#b8801e'); ctx.fillStyle = gx; ctx.fillRect(bx, by, bw * r, bh);
      if (S.lvFx > 0) { ctx.globalAlpha = Math.min(1, S.lvFx) * .6; ctx.fillStyle = '#fff6c8'; ctx.fillRect(bx, by, bw, bh); ctx.globalAlpha = 1; S.lvFx = Math.max(0, S.lvFx - 1 / 60); }
      ctx.font = 'bold 11px "PingFang SC",sans-serif'; ctx.textBaseline = 'middle'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(20,10,4,.95)'; ctx.fillStyle = '#fff2d0';
      ctx.textAlign = 'left'; ctx.strokeText('修为 LV.' + S.lv, bx + 6, by + bh / 2 + .5); ctx.fillText('修为 LV.' + S.lv, bx + 6, by + bh / 2 + .5);
      ctx.textAlign = 'right'; const pc = Math.floor(r * 100) + '%'; ctx.strokeText(pc, bx + bw - 6, by + bh / 2 + .5); ctx.fillText(pc, bx + bw - 6, by + bh / 2 + .5);
      if (S.bank > 0) { ctx.textAlign = 'left'; ctx.fillStyle = '#ffd86e'; const t = '待修炼 ×' + S.bank; ctx.strokeText(t, bx + bw + 10, by + bh / 2 + .5); ctx.fillText(t, bx + bw + 10, by + bh / 2 + .5); }
      ctx.restore();
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
    const r = [['体魄', at[0], '气血 ' + pct(AFX.hp() - 1), '越高越扛打：受到的伤害按比例减少'], ['短兵', at[1], '刀剑武艺 ' + pct(profV(at[1]) - 1), '刀、剑等短兵器武艺的伤害'], ['长兵', at[2], '枪戟武艺 ' + pct(profV(at[2]) - 1), '枪、关刀等长兵器武艺的伤害'],
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
     moveMul: () => (OG().move || 1) * AFX.move() * (1 + IT('move')) * RT.move * GM.spd, left: () => RT.on && RT.node && W.started ? Math.max(0, WT() - W.t) : null, reward: (n, cb) => offerReward(n, cb), event(k, cb) { eventDo(k, cb); }, SK, tick, drawWorld, hud, startRun, waveFlow, pose, rooted, onRoll, skipWave() { if (W.retreat <= 0 && W.between <= 0 && W.started) endWave(); }, state: () => ({ wave: W.n, t: W.t, slots: S.slots.slice() }) };
})();
