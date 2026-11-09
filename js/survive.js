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
  const RT = { on: false, node: null, dmg: 1 };   // 路线模式（?route）：当前节点、磨刀加成
const DM = () => RT.dmg;
const bossCount = () => RT.on ? (RT.node && W.k === W.N ? (RT.node.type === 'boss' ? 3 : RT.node.type === 'elite' ? 1 : 0) : (RT.node && RT.node.type === 'boss' && W.k === 1 ? 1 : 0)) : (BOSS_WAVES[W.n] || 0);
const W = { n: 0, k: 0, N: 0, t: 0, retreat: 0, spawnT: 0, batchT: 0, bossDone: false, between: 0, started: false };
  const WT = () => (WAVE_T[Math.min(W.n, WAVES) - 1] || 60) * (RT.on ? ROUTE.TIME_K : 1);
  const targetN = () => Math.max(8, Math.round((WAVE_N[W.n - 1] || 100) * N_SCALE));
  function pickType() {
    const pool = [];
    for (const s of SECTS) if (W.n >= s.from && W.n <= s.to) pool.push([s.u, W.n - s.from >= 1 ? 100 : 60]);
    if (W.n >= 4) pool.push(['elite', 4 + W.n]);   // 精英（老卒）随波次越来越常见
    let sum = pool.reduce((a, p) => a + p[1], 0), r = Math.random() * sum;
    for (const [u, w] of pool) if ((r -= w) <= 0) return u;
    return 'grunt';
  }
  function edgeSpawn(type, boss) {
    const vw = viewW(); let side = Math.random() < .5 ? -1 : 1, x, y;
    if (window.ARENA && ARENA.on()) { const p = ARENA.edge(); x = p.x; y = p.y; side = x < hero.x ? -1 : 1; }   // 俯视竞技场：四周都刷
    else { x = side < 0 ? cam.x + 6 : cam.x + vw - 6; x = Math.max(arenaL + 14, Math.min(lockR - 14, x)); y = R(M.top + 6, M.bot - 6); }
    spawn(type, x, y);
    const z = zs[zs.length - 1]; z.f = -side; z.survMul = 1 + HP_SCALE * (W.n - 1);
    z.hp *= z.survMul;
    if (boss) { z.hp *= 4; z.sc = (z.sc || 1) * 1.25; z.survBoss = true; floaters.push({ x: z.x, y: z.y - 60, t: 0, txt: '敌将出阵！', color: '#ff6a4a' }); }
    return z;
  }
  function startWave(n) {
    if (RT.on) {   // 路线模式：n 是本节点第几波，难度按「所在层 + 波数」折算成 1~20 级
      const nd = RT.node, L = ROUTE.layers(); W.k = n;
      W.n = Math.max(1, Math.min(WAVES, 1 + Math.floor(((nd.layer - 1 + (n - 1) / W.N) / L) * WAVES) + (nd.type === 'elite' ? 2 : 0) + (nd.type === 'boss' ? 2 : 0)));
      W.t = 0; W.retreat = 0; W.spawnT = 0; W.batchT = 0; W.bossDone = false;
      say(`${ROUTE.name(nd)} · 第 ${n}/${W.N} 波`, 1.6); return;
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
    if (bossCount() && !W.bossDone && W.t >= 1) { W.bossDone = true; for (let i = 0; i < bossCount(); i++) edgeSpawn('elite', true); }
    // 补兵：开场慢慢涌进来（前 60% 时间里目标人数从少爬到满）
    const ramp = Math.min(30, WT() * .6), rf = Math.min(1, .08 + .92 * W.t / ramp), tn = Math.ceil(targetN() * rf);
    const cnt = alive().filter(z => !z.survBoss).length;
    if (cnt < tn * .5) { if ((W.spawnT -= dt) <= 0) { edgeSpawn(pickType()); W.spawnT = rf < 1 ? .55 - .3 * rf : .2; } }
    else if ((W.batchT -= dt) <= 0 && cnt < tn) { const k = Math.min(tn - cnt, rf < 1 ? 1 + (Math.random() * 2 | 0) : 3 + (Math.random() * 3 | 0)); for (let i = 0; i < k; i++) edgeSpawn(pickType()); W.batchT = R(1.6, 2.4); }
    if (W.t >= WT()) endWave();
  }

  // ---------- 招式（代码画） ----------
  const fx = [];
  function sweep(a0, half, r, dmg, kb, color, opt = {}) {   // 扇形斩：a0 朝向，half 半角，r 半径（左右距离；上下按清版透视压一半）
    fx.push({ k: 'arc', x: hero.x, y: hero.y, a0, half, r, t: 0, T: .26, color, rev: !!opt.rev });
    for (const z of hittable()) {
      const dx = z.x - hero.x, dy = (z.y - hero.y) * 2, d = Math.hypot(dx, dy);
      if (d > r + 8) continue;
      let da = Math.abs(Math.atan2(dy, dx) - a0); if (da > Math.PI) da = Math.PI * 2 - da;
      if (d > 14 && da > half) continue;
      const f0 = freeze;
      hit(z, dmg * DM(), kb, Math.sign(dx) || hero.f, false, 0, .3, false, false, { secondary: true, survSkill: true });
      freeze = Math.min(freeze, Math.max(f0, .04));
    }
  }
  const aim = () => { const t = nearest(200); if (!t) return Math.atan2(0, hero.f); return Math.atan2((t.y - hero.y) * 2, t.x - hero.x); };
  function nearest(r) { let best = null, bd = r; for (const z of hittable()) { const d = dist(z, hero); if (d < bd) { bd = d; best = z; } } return best; }
  // 用户定 11/09：招式没有各自冷却，1→5 依次放（放完一招才轮到下一招）；前摇/后摇照三国幸存者
  const SK = {
    hengsao: { desc: '身前 270° 大横扫，击退', name: '横扫', icon: '扫', color: '#ffb45a', wu: .6, rc: .3, need: 70, pose: ['blade_4a', 'blade_2b'], range: 58, half: 2.356,
      cast() { const a = aim(); sweep(a, 2.356, 58, 2.4, 60, ['rgba(255,170,90,', 'rgba(255,230,160,']); sfx('swing_knife', hero.x); shake = Math.max(shake, .12); } },
    lianzhan: { desc: '180° 连砍两刀', name: '连斩', icon: '连', color: '#8fd0ff', wu: .5, rc: .4, need: 64, pose: ['blade_1a', 'blade_1b'], range: 50, half: 1.571,
      cast() {
        const a = aim(); sweep(a, 1.571, 50, 1.6, 30, ['rgba(120,200,255,', 'rgba(210,240,255,']); sfx('swing_knife', hero.x);
        S.later.push({ t: .25, f() { const b = aim(); S.poseOverride = { f: 'blade_2b', t: .25 }; sweep(b, 1.571, 50, 1.6, 45, ['rgba(255,120,120,', 'rgba(255,220,220,'], { rev: true }); sfx('swing_knife', hero.x); } });
      } },
  };
  SK.daobo = { desc: '向前劈出穿透刀波', name: '刀波', icon: '波', color: '#c8f0ff', wu: .5, rc: .3, need: 160, pose: ['blade_1a', 'blade_2b'], range: 0, half: 0, beam: true,
    cast() {   // 朝最近的敌人劈出一道月牙刀波，一路穿透
      const a = aim(), vx = Math.cos(a), vy = Math.sin(a) / 2;
      bolts.push({ x: hero.x + vx * 14, y: hero.y + vy * 14, vx: vx * 270, vy: vy * 270, a, t: 0, T: .85, hitSet: [] });
      sfx('swing_knife', hero.x); shake = Math.max(shake, .08);
    } };
  SK.zhendi = { desc: '砸地，脚下一圈震飞', name: '震地', icon: '震', color: '#ffd27a', wu: .7, rc: .35, need: 62, pose: ['blade_4a', 'blade_4b'], range: 66, half: Math.PI, ring: true,
    cast() {   // 一刀砸地，脚下一圈冲击波，把周围的人震飞
      fx.push({ k: 'ring', x: hero.x, y: hero.y, t: 0, T: .45, r: 66 });
      for (const z of hittable()) if (dist(z, hero) < 66) { const f0 = freeze; hit(z, 2.0 * DM(), 50, Math.sign(z.x - hero.x) || hero.f, true, 0, .4, false, false, { secondary: true, survSkill: true }); freeze = Math.min(freeze, Math.max(f0, .05)); }
      sfx('crack', hero.x); shake = Math.max(shake, .3);
    } };
  const bolts = [];
  // ---------- 出身（开局配置里选；起手只有 1 个招式） ----------
  const ORIGINS = {
    nongfu: { name: '农夫', tag: '短兵器', skill: 'hengsao', desc: '庄稼汉，挨得住打。受到伤害 -20%', take: .8 },
    xiaozu: { name: '小卒', tag: '长兵器', skill: 'lianzhan', desc: '行伍出身，出手利落。招式前摇 -20%', wu: .8 },
    liehu: { name: '猎户', tag: '远程', skill: 'daobo', desc: '山里跑惯了。移动速度 +12%', move: 1.12 },
    mafu: { name: '马夫', tag: '骑乘', skill: 'zhendi', desc: '身手灵活。翻滚冷却 -30%', roll: .7 },
    shusheng: { name: '书生', tag: '法术', skill: '', desc: '法术招式还没做，暂未开放', locked: true },
  };
  let origin = 'nongfu';
  const OG = () => ORIGINS[origin] || ORIGINS.nongfu;
  // 波间习得招式：从还没学会的招式里随机给最多 3 个，选一个放进空格
  function offerSkill(cb) {
    const owned = S.slots.filter(Boolean), free = S.slots.indexOf('');
    const pool = Object.keys(SK).filter(k => !owned.includes(k));
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
  const S = { slots: ['hengsao', '', '', '', ''], qi: 0, qt: 0, hold: 0, wind: null, recov: null, skip: [0, 0, 0, 0, 0], later: [], poseOverride: null, cycles: 0, flash: [0, 0, 0, 0, 0] };
  const busy = () => hero.st === 'roll' || hero.air || ['down', 'bounce', 'getup', 'hurt'].includes(hero.st) || hero.dazeT > 0;
  function skillTick(dt) {
    for (let i = 0; i < 5; i++) { S.skip[i] = Math.max(0, S.skip[i] - dt); S.flash[i] = Math.max(0, S.flash[i] - dt); }
    for (let i = S.later.length - 1; i >= 0; i--) { const q = S.later[i]; if ((q.t -= dt) <= 0) { S.later.splice(i, 1); if (!busy()) q.f(); } }
    if (S.poseOverride && (S.poseOverride.t -= dt) <= 0) S.poseOverride = null;
    if (W.retreat > 0 || W.between > 0) { S.wind = null; S.recov = null; return; }   // 鸣金后不再出手
    if (busy()) { if (S.wind && hero.st !== 'roll') { S.wind = null; } return; }
    if (S.wind) {
      S.wind.t += dt;
      if (!(Math.abs(hero.ix) > .1 || Math.abs(hero.iy) > .1)) { const t = nearest(200); if (t) hero.f = Math.sign(t.x - hero.x) || hero.f; }
      if (S.wind.t >= S.wind.dur) {
        const k = S.wind.k, i = S.wind.i; S.flash[i] = .3;
        const t = nearest(200); if (t) hero.f = Math.sign(t.x - hero.x) || hero.f;
        k.cast(); S.recov = { t: 0, dur: k.rc, pose: k.pose[1] }; S.wind = null;
        S.qi = (S.qi + 1) % 5; if (S.qi === 0) S.cycles++;
      }
      return;
    }
    if (S.recov) { if ((S.recov.t += dt) >= S.recov.dur) { S.recov = null; S.qt = -.2; } return; }   // 放完一招，隔 0.25 秒轮到下一招（没有各自冷却）
    if (!nearest(160)) { S.qt = 0; return; }
    for (let n = 0; n < 5 && !SK[S.slots[S.qi]]; n++) { S.qi = (S.qi + 1) % 5; if (S.qi === 0) S.cycles++; }
    if ((S.qt += dt) < .05) return;
    const k = SK[S.slots[S.qi]];
    if (k && nearest(k.need)) { S.wind = { i: S.qi, k, t: 0, dur: k.wu * 1.2 * (OG().wu || 1) }; S.hold = 0; return; }
    if (k && S.hold < 1.2) { S.hold += .05; S.qt = 0; return; }   // 这一招够不着人：等 1.2 秒，还不行就跳下一招
    S.skip[S.qi] = .2; S.qt = -.05; S.qi = (S.qi + 1) % 5; if (S.qi === 0) S.cycles++; S.hold = 0;
  }
  function onRoll() {
    if (OG().roll) hero.rollCd *= OG().roll;   // 翻滚：前摇中 = 这一招作废、跳到下一招；后摇中 = 直接取消后摇
    if (S.wind) { S.skip[S.wind.i] = .35; S.wind = null; S.qi = (S.qi + 1) % 5; if (S.qi === 0) S.cycles++; S.qt = 0; floaters.push({ x: hero.x, y: hero.y - 50, t: 0, txt: '打断', color: '#9aa' }); }
    S.recov = null;
  }

  // ---------- 路线模式 ----------
  const maxHp = () => window.GEAR ? GEAR.maxHp() : 10;
  const heal = v => { hero.hp = Math.min(maxHp(), hero.hp + v); };
  function nodeClear() {   // 一个节点打完：发奖励，回长卷
    const nd = RT.node; W.started = false; zs.length = 0; eshots.length = 0;
    if (nd.type === 'boss') { won = true; return; }
    const back = () => { W.pick = false; ROUTE.done(nd); };
    if (nd.type === 'elite') { say('精锐已破！', 1.4); if (!offerSkill(back)) { heal(maxHp()); back(); } }
    else { heal(2); if (!offerSkill(back)) { heal(3); back(); } }
  }
  function beginNode(nd) {
    RT.node = nd; W.N = ROUTE.waves(nd); W.started = true; W.between = 0; W.pick = false; S.wind = null; S.recov = null; S.later = []; bolts.length = 0; fx.length = 0;
    zs.length = 0; eshots.length = 0; if (window.ARENA) ARENA.start(ROUTE.mapOf(nd));
    startWave(1);
  }
  // ---------- 对外接口 ----------
  function forceBlade() { weapon = 'blade'; pendingWeapon = null; try { if (window.GEAR && GEAR.switch) GEAR.switch(); } catch (e) {} if (typeof ui === 'function') ui(); }
  function startRun() {
    S.slots = [OG().skill || 'hengsao', '', '', '', '']; W.pick = false; const old = document.getElementById('survPick'); if (old) old.remove();
    W.started = true; W.between = 0; S.wind = null; S.recov = null; S.later = []; S.qi = 0; bolts.length = 0; S.cycles = 0; fx.length = 0;
    forceBlade();
    const vw = viewW(); arenaL = M.gates[0] + 10; lockR = arenaL + vw * 1.5; gateI = 0;
    hero.x = arenaL + vw * .5; cam.x = arenaL;
    if (window.ARENA) ARENA.start();   // 竞技场试玩：重设边界、镜头和出生点
    RT.on = !!(window.ROUTE && ROUTE.on()); RT.dmg = 1; RT.node = null;
    if (RT.on) { W.started = false; ROUTE.start(); return; }
    startWave(1);
  }
  function tick(dt) {
    if (weapon !== 'blade') forceBlade();
    if (charging || atkHeldSince) cancelCharge();
    skillTick(dt);
    for (const e of fx) e.t += dt;
    for (const b of bolts) {
      b.t += dt; b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.y < M.top - 4 || b.y > M.bot + 4) b.t = b.T;
      for (const z of hittable()) if (!b.hitSet.includes(z) && Math.abs(z.x - b.x) < 16 && Math.abs(z.y - b.y) < 16) { b.hitSet.push(z); const f0 = freeze; hit(z, 1.8 * DM(), 40, Math.sign(b.vx) || hero.f, false, 0, .3, false, false, { secondary: true, survSkill: true }); freeze = Math.min(freeze, Math.max(f0, .03)); }
    }
    for (let i = bolts.length - 1; i >= 0; i--) if (bolts[i].t >= bolts[i].T) bolts.splice(i, 1);
    for (let i = fx.length - 1; i >= 0; i--) if (fx[i].t > fx[i].T) fx.splice(i, 1);
  }
  function drawWorld() {
    // 前摇：脚下画出这一招将要覆盖的范围，越接近出手越亮
    if (S.wind) {
      const k = S.wind.k, p = S.wind.t / S.wind.dur, a = aim();
      ctx.save(); ctx.translate(hero.x, hero.y); ctx.scale(1, .5);
      ctx.fillStyle = `rgba(255,200,120,${.08 + .18 * p})`; ctx.strokeStyle = `rgba(255,220,150,${.3 + .5 * p})`; ctx.lineWidth = 1.5;
      if (k.beam) { ctx.rotate(a); ctx.fillRect(8, -14, 180 * p, 28); ctx.strokeRect(8, -14, 180 * p, 28); }   // 刀波：前方一条直线
      else if (k.ring) { ctx.beginPath(); ctx.arc(0, 0, k.range * (.4 + .6 * p), 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }   // 震地：脚下一整圈
      else { ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, k.range * (.4 + .6 * p), a - k.half, a + k.half); ctx.closePath(); ctx.fill(); ctx.stroke(); }
      ctx.restore();
    }
    for (const b of bolts) {   // 月牙刀波
      const p = b.t / b.T, al = 1 - p * p;
      ctx.save(); ctx.translate(b.x, b.y - 14); ctx.scale(1, .5); ctx.rotate(b.a);
      ctx.strokeStyle = `rgba(160,225,255,${.5 * al})`; ctx.lineWidth = 9; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(-10, 0, 26, -1.1, 1.1); ctx.stroke();
      ctx.strokeStyle = `rgba(240,252,255,${.95 * al})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(-8, 0, 26, -1.0, 1.0); ctx.stroke();
      ctx.restore();
    }
    for (const e of fx) {
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
    const n = 5, sz = 38, gap = 6, w = n * sz + (n - 1) * gap, x0 = (HW - w) / 2, y0 = 44;
    ctx.save();
    ctx.fillStyle = 'rgba(20,12,8,.55)'; ctx.fillRect(x0 - 8, y0 - 6, w + 16, sz + 24);
    for (let i = 0; i < n; i++) {
      const k = SK[S.slots[i]], x = x0 + i * (sz + gap), cur = i === S.qi;
      ctx.fillStyle = '#2b1d14'; ctx.fillRect(x, y0, sz, sz);
      if (k) {
        ctx.fillStyle = k.color; ctx.globalAlpha = .22 + (S.flash[i] > 0 ? .5 : 0); ctx.fillRect(x, y0, sz, sz); ctx.globalAlpha = 1;
        if (S.wind && S.wind.i === i) { ctx.fillStyle = 'rgba(255,230,140,.45)'; ctx.fillRect(x, y0 + sz * (1 - S.wind.t / S.wind.dur), sz, sz * S.wind.t / S.wind.dur); }   // 前摇进度
        ctx.font = 'bold 20px "PingFang SC",sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = k.color; ctx.fillText(k.icon, x + sz / 2, y0 + sz / 2 + 1);
        if (!cur) { ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(x, y0, sz, sz); }   // 没轮到的格子压暗
        ctx.font = '10px "PingFang SC",sans-serif'; ctx.fillStyle = '#e8d6b0'; ctx.fillText(k.name, x + sz / 2, y0 + sz + 9);
      } else { ctx.font = '10px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#6b5a44'; ctx.fillText('空', x + sz / 2, y0 + sz / 2 + 3); }
      if (S.skip[i] > 0) { ctx.fillStyle = 'rgba(160,160,170,.5)'; ctx.fillRect(x, y0, sz, sz); }
      ctx.strokeStyle = cur ? '#ffe27a' : 'rgba(200,170,110,.6)'; ctx.lineWidth = cur ? 2.5 : 1; ctx.strokeRect(x + .5, y0 + .5, sz - 1, sz - 1);
    }
    // 波次与倒计时
    ctx.font = 'bold 14px "PingFang SC",sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#ffe9a0';
    const left = Math.max(0, Math.ceil(WT() - W.t));
    if (RT.on && !RT.node) { ctx.restore(); return; }   // 路线图还没选节点：不画波次文字
    ctx.fillText(W.retreat > 0 || W.between > 0 ? `${RT.on ? '第 ' + W.k + '/' + W.N : '第 ' + W.n + '/' + WAVES} 波 · 鸣金收兵` : `${RT.on ? ROUTE.name(RT.node) + ' · 第 ' + W.k + '/' + W.N : '第 ' + W.n + '/' + WAVES} 波 · 还剩 ${left} 秒${bossCount() ? ' · 敌将' : ''}`, HW / 2, y0 + sz + 28);
    ctx.restore();
  }
  // 主角姿势：前摇举刀，出手和后摇用挥刀帧
  function pose() {
    if (S.poseOverride) return S.poseOverride.f;
    if (S.recov) return S.recov.pose;
    if (S.wind && hero.st !== 'walk') return S.wind.k.pose[0];
    return null;
  }
  const rooted = () => !!S.recov;
  // 隐藏普攻和换武器按钮
  const st = document.createElement('style'); st.textContent = '#bA,#bWeapon,#wp button[data-w]{display:none!important}'
    + '#survPick{position:fixed;inset:0;z-index:10005;display:flex;align-items:center;justify-content:center;background:rgba(10,6,4,.6);font-family:"PingFang SC","Noto Sans CJK SC",sans-serif}'
    + '#survPick .p{background:linear-gradient(180deg,#2a1d13,#1a120c);border:2px solid #b08a4a;border-radius:10px;padding:14px 16px;color:#f2e4c8;text-align:center;max-width:94vw}'
    + '#survPick h3{margin:0 0 10px;color:#ffd86e;letter-spacing:4px}#survPick .row{display:flex;gap:10px;justify-content:center;flex-wrap:wrap}'
    + '#survPick button{width:140px;padding:12px 8px;background:#2e2118;border:1px solid #8a6a3a;border-radius:8px;color:#f2e4c8;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:4px}'
    + '#survPick button:hover{border-color:#ffd86e;background:#3a2a1c}#survPick b{font-size:30px}#survPick span{font-size:16px;font-weight:700}#survPick small{color:#cdb98e;font-size:12px}#survPick p{margin:10px 0 0;color:#a08d70;font-size:12px}'; document.head.appendChild(st);
  window.SURV = { beginNode, frozen: () => RT.on && ROUTE.shown(), routeHp: () => [hero.hp, maxHp()], camp(k) { if (k === 'heal') heal(maxHp() * .3); else RT.dmg *= 1.1; }, ORIGINS, setOrigin(k) { if (ORIGINS[k] && !ORIGINS[k].locked) origin = k; }, origin: () => origin, takeMul: () => OG().take || 1, moveMul: () => OG().move || 1, SK, tick, drawWorld, hud, startRun, waveFlow, pose, rooted, onRoll, skipWave() { if (W.retreat <= 0 && W.between <= 0 && W.started) endWave(); }, state: () => ({ wave: W.n, t: W.t, slots: S.slots.slice() }) };
})();
