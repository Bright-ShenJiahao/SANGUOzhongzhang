(() => {
  // 两套风格：a = 帝国（两头身大头），b = 牧场（细一些的像素）。base = 画布内部高度，U = 尺寸倍数
  const STY = { a: { name: '帝国风', base: 240, int: 1, U: 1 }, b: { name: '牧场风', base: 480, U: 2 }, c: { name: '战至终章原版', base: 480, U: 2 }, d: { name: '帝国精进', base: 310, int: 1, U: 1 }, e: { name: '掌机像素风', base: 250, int: 1, U: 1 } };
  const MAPS = { pixe: { name: '掌机像素打谷场', horizon: .27, bottom: .84 }, pixd: { name: '帝国像素打谷场', horizon: .27, bottom: .84 }, pix: { name: '牧场像素打谷场', horizon: .29, bottom: .86 }, old: { name: '原版打谷场', horizon: .36, bottom: .9 } }; let mk = 'pixe', MP = MAPS.pixe;
  const NEXTM = { pixe: 'pixd', pixd: 'pix', pix: 'old', old: 'pixe' };   // 11/21 用户：人物和地图分开选
  const MIMG = {}; function loadMap(k) { return new Promise(res => { if (MIMG[k]) return res(); const i = new Image(); i.onload = () => { MIMG[k] = i; res(); }; i.src = ASSETS.maps[k]; }); }
  let sk = 'e', ST = STY.e, U = 1, ek = 'e';   // 11/21 用户：主角和敌人也能分开选（sk = 主角那套，ek = 敌人那套）
  const setOf = key => key.startsWith('hero:') ? sk : ek, eScale = () => STY[sk].base / STY[ek].base;
  const cv = document.getElementById('cv'), ctx = cv.getContext('2d');
  let W = 320, H = 180, SC = 4, bgC = null, yMin = 60, yMax = 170;
  const IMG = {};
  function load(s) { return new Promise(res => { if (IMG[s]) return res(); const A = ASSETS[s], at = new Image(); at.onload = () => { IMG[s] = prep(at, null, A.f); res(); }; at.src = A.atlas; }); }
  const mkc = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  function prep(at, bg, meta) {   // 11/21 精进②：纯黑描边换成深褐色，在写实地图上不扎眼
    const c = mkc(at.width, at.height), x = c.getContext('2d'); x.drawImage(at, 0, 0);
    const d = x.getImageData(0, 0, c.width, c.height), p = d.data;
    for (let i = 0; i < p.length; i += 4) if (p[i + 3] && p[i] < 56 && p[i + 1] < 50 && p[i + 2] < 50) { p[i] = 58; p[i + 1] = 34; p[i + 2] = 24; }
    x.putImageData(d, 0, 0);
    return { base: c, meta, AW: at.width, G: {} };
  }
  // 精进①③：按地图给人物调色（白天微调、黄昏偏暖偏暗），再做三种人群色（原色 / 深一点 / 偏黄旧一点）
  const GRADE = { pixe: 'saturate(1)', pixd: 'saturate(.95)', pix: 'saturate(.92) brightness(1)', old: 'saturate(.8) brightness(.9) sepia(.18) contrast(1.04)' };
  const VAR = ['', 'brightness(.86)', 'sepia(.25) saturate(.9)'];
  function graded(s) {
    const I = IMG[s]; if (I.G[mk]) return I.G[mk];
    const out = [], src = I.base;
    for (const v of VAR) {
      const c = mkc(src.width, src.height), x = c.getContext('2d'); x.filter = (GRADE[mk] + ' ' + v).trim() || 'none'; x.drawImage(src, 0, 0); x.filter = 'none';
      const fl = mkc(c.width, c.height), fx = fl.getContext('2d'); fx.translate(c.width, 0); fx.scale(-1, 1); fx.drawImage(c, 0, 0);
      out.push({ at: c, fl });
    }
    const wh = s => { const c = mkc(s.width, s.height), x = c.getContext('2d'); x.drawImage(s, 0, 0); x.globalCompositeOperation = 'source-atop'; x.fillStyle = '#fff8e8'; x.fillRect(0, 0, c.width, c.height); return c; };
    out.w = { at: wh(out[0].at), fl: wh(out[0].fl) };
    return (I.G[mk] = out);
  }
  function fit() {
    const vw = innerWidth, vh = innerHeight;
    // 11/21 用户：视角太近 → 人物缩小到和现在游戏差不多（主角约占屏幕高度的 13%）。粗像素那套用整数倍放大，细像素两套按比例放大
    const mm = Math.max(Math.min(vw, vh), vh * .6);   // 手机竖屏按高度算，人物别太小
    SC = ST.int ? Math.max(1, Math.round(mm / ST.base)) : Math.max(.5, mm / ST.base);
    W = Math.ceil(vw / SC); H = Math.ceil(vh / SC);
    cv.width = W; cv.height = H; cv.style.width = W * SC + 'px'; cv.style.height = H * SC + 'px';
    ctx.imageSmoothingEnabled = false; bgC = null;
  }
  const bgcv = document.getElementById('bgcv');
  function makeBg() {   // 11/21 用户：地图画质要高 → 背景单独一张全分辨率画布垫在底下，人物还是像素画布叠在上面
    const bg = MIMG[mk], ST2 = MP, s = Math.max(W / bg.width, H / bg.height), dw = bg.width * s, dh = bg.height * s, ox = (W - dw) / 2, oy = (H - dh) / 2;
    const dpr = Math.min(2, devicePixelRatio || 1), k = SC * dpr; bgcv.width = Math.round(W * k); bgcv.height = Math.round(H * k); bgcv.style.width = W * SC + 'px'; bgcv.style.height = H * SC + 'px';
    const x = bgcv.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(bg, ox * k, oy * k, dw * k, dh * k);
    yMin = Math.round(oy + dh * ST2.horizon) + 8 * U; yMax = Math.min(H - 3 * U, Math.round(oy + dh * ST2.bottom)); bgC = true;
  }
  // ---------- 画一帧：脚底中点对准 (x, y) ----------
  function frame(key, i) { const L = IMG[setOf(key)].meta[key]; return L[Math.max(0, Math.min(L.length - 1, i))]; }
  function drawF(key, i, x, y, f, white, alpha, v, sc) {
    const s0 = setOf(key), I = IMG[s0], m = frame(key, i); if (!m) return; const [sx, sy, w, h, ax, ay] = m, GG = graded(s0), S = white ? GG.w : GG[v || 0]; if (s0 !== sk) sc = (sc || 1) * eScale();
    const flip = f < 0, src = flip ? S.fl : S.at, fx = flip ? I.AW - sx - w : sx; sc = sc || 1;
    const dw = Math.round(w * sc), dh = Math.round(h * sc), dx = Math.round(x - (flip ? w - ax : ax) * sc), dy = Math.round(y - ay * sc);
    if (alpha != null) ctx.globalAlpha = alpha; ctx.drawImage(src, fx, sy, w, h, dx, dy, dw, dh); if (alpha != null) ctx.globalAlpha = 1;
  }
  const ks = key => setOf(key) === sk ? 1 : eScale(), fh = key => frame(key, 0)[3] * ks(key), fw = key => frame(key, 0)[2] * ks(key), nF = key => IMG[setOf(key)].meta[key].length;

  // ---------- 像素数字 ----------
  const DIG = { 0: '111101101101111', 1: '010110010010111', 2: '111001111100111', 3: '111001111001111', 4: '101101111001001', 5: '111100111001111', 6: '111100111101111', 7: '111001001010010', 8: '111101111101111', 9: '111101111001111' };
  function num(n, x, y, col, k) {
    k = k || U; const s = String(n); x = Math.round(x - s.length * 2 * k); y = Math.round(y);
    for (const pass of [0, 1]) for (let j = 0; j < s.length; j++) { const g = DIG[s[j]]; for (let i = 0; i < 15; i++) if (g[i] === '1') { const px = x + (j * 4 + (i % 3)) * k, py = y + ((i / 3) | 0) * k; if (!pass) { ctx.fillStyle = '#2a160e'; ctx.fillRect(px - k, py - k, 3 * k, 3 * k); } else { ctx.fillStyle = col; ctx.fillRect(px, py, k, k); } } }
  }

  // ---------- 输入 ----------
  const keys = {};
  addEventListener('keydown', e => { keys[e.code] = 1; if (e.code === 'Space') { roll(); e.preventDefault(); } if (e.code === 'KeyR' && G.over) start(); if (e.code === 'Digit1') setStyle('a'); if (e.code === 'Digit2') setStyle('b'); if (e.code === 'Digit3') setStyle('c'); if (e.code === 'Digit4') setStyle('d'); if (e.code === 'Digit5') setStyle('e'); if (e.code === 'KeyE') setEnemy(NEXTS[ek]); if (e.code === 'KeyM') setMap(NEXTM[mk]); });
  addEventListener('keyup', e => keys[e.code] = 0);
  const joy = { on: false, sx: 0, sy: 0, x: 0, y: 0, id: null };
  cv.addEventListener('pointerdown', e => { if (G.over) { start(); return; } if (e.clientX > innerWidth * .55 && e.pointerType !== 'mouse') { roll(); return; } joy.on = true; joy.id = e.pointerId; joy.sx = joy.x = e.clientX; joy.sy = joy.y = e.clientY; });
  addEventListener('pointermove', e => { if (joy.on && e.pointerId === joy.id) { joy.x = e.clientX; joy.y = e.clientY; } });
  const up = e => { if (e.pointerId === joy.id) joy.on = false; }; addEventListener('pointerup', up); addEventListener('pointercancel', up);
  function moveDir() {
    let dx = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0), dy = (keys.KeyS || keys.ArrowDown ? 1 : 0) - (keys.KeyW || keys.ArrowUp ? 1 : 0);
    if (joy.on) { const jx = joy.x - joy.sx, jy = joy.y - joy.sy, d = Math.hypot(jx, jy); if (d > 8) { dx = jx / Math.max(d, 40); dy = jy / Math.max(d, 40); } }
    return [dx, dy];
  }

  // ---------- 状态 ----------
  let G = { over: true, t: 0 }, hero, foes, fx, parts, nums, tele;
  const R = (a, b) => a + Math.random() * (b - a);
  function start() {
    G = { t: 0, kills: 0, spawn: 0, bossOut: false, bossDead: false, over: false, shake: 0, banner: null, hitStop: 0 };
    hero = { x: W / 2, y: (yMin + yMax) / 2, hp: 30, maxHp: 30, f: 1, t: 0, atk: .3, atkT: 0, spin: 3, roll: 0, rollCd: 0, inv: 0, hurtT: 0, moving: false, hitAt: -1 };
    foes = []; fx = []; parts = []; nums = []; tele = [];
    banner('黄巾来袭！', 2);
  }
  const banner = (s, t) => { G.banner = { s, t, T: t }; };
  function roll() { if (G.over || hero.roll > 0 || hero.rollCd > 0) return; const [dx, dy] = moveDir(); const d = Math.hypot(dx, dy); hero.rvx = d ? dx / d : hero.f; hero.rvy = d ? dy / d : 0; if (d) hero.f = dx < 0 ? -1 : dx > 0 ? 1 : hero.f; hero.roll = .3; hero.rollCd = .9; hero.inv = .4; }
  async function setStyle(s) { if (s === sk) return; await load(s); sk = s; ST = STY[s]; U = ST.U; fit(); start(); btns(); }
  async function setEnemy(s) { if (s === ek) return; await load(s); ek = s; start(); btns(); }
  async function setMap(k) { if (k === mk) return; await loadMap(k); mk = k; MP = MAPS[k]; fit(); start(); btns(); }
  function btns() { hud('sty', '主角：' + ST.name); hud('enb', '敌人：' + STY[ek].name); hud('mapb', '地图：' + MP.name); }

  function spawn(boss) {
    const side = Math.random() * 4 | 0, x = side === 0 ? -12 * U : side === 1 ? W + 12 * U : R(0, W), y = side === 2 ? yMin : side === 3 ? H + 30 * U : R(yMin, H);
    if (boss) { foes.push({ boss: 1, x: W + 30 * U, y: (yMin + H) / 2, hp: 160, maxHp: 160, f: -1, t: 0, st: 'walk', cd: 2, flash: 0, kbx: 0, kby: 0, z: 0 }); return; }
    const q = Math.random() < .4; foes.push({ q, v: Math.random() * 3 | 0, sc: R(.94, 1.06), as: R(.85, 1.15), x, y, hp: q ? 4 : 3, maxHp: q ? 4 : 3, sp: R(15, 22) * U, f: 1, t: R(0, 1), st: 'run', cd: R(.3, 1), flash: 0, kbx: 0, kby: 0 });
  }
  const dist = (a, b) => Math.hypot(a.x - b.x, (a.y - b.y) * 1.4);
  function hurt(z, d, from) {
    if (z.dead) return;
    z.hp -= d; z.flash = .14; nums.push({ x: z.x, y: z.y - (z.boss ? fh('boss:idle') : fh('soldiers:dao_run')) - 2 * U, v: d, t: 0, col: d >= 4 ? '#ffd84a' : '#ffffff' });
    const a = Math.atan2(z.y - from.y, z.x - from.x), k = (z.boss ? 3 : 24) * U; z.kbx = Math.cos(a) * k; z.kby = Math.sin(a) * k;
    if (!z.boss && z.st !== 'strike') { z.st = 'hurt'; z.t = 0; }
    for (let i = 0; i < 4; i++) parts.push({ x: z.x, y: z.y - 10 * U, vx: (R(-40, 40) + Math.cos(a) * 30) * U, vy: R(-50, -10) * U, t: 0, T: R(.25, .45), col: i % 2 ? '#ffffff' : '#ffe9a8', g: 160 * U });
    G.hitStop = Math.max(G.hitStop, z.boss ? .05 : .025);
    if (z.hp <= 0) {
      z.dead = 1; z.deadT = 0; G.kills++;
      for (let i = 0; i < 8; i++) parts.push({ x: z.x, y: z.y - 8 * U, vx: R(-50, 50) * U, vy: R(-70, -10) * U, t: 0, T: R(.4, .8), col: ['#f6d23c', '#b48a58', '#e8e0c8', '#c49a1c'][i % 4], g: 200 * U, sz: i < 3 ? 2 : 1 });
      if (z.boss) { G.bossDead = true; banner('斩！程远志', 2.5); G.shake = .4; for (const o of foes) if (!o.boss && !o.dead) hurt(o, 9, z); }
    }
  }
  function damageHero(d) {
    if (hero.inv > 0 || G.over) return; hero.hp -= d; hero.inv = .6; hero.hurtT = .25; G.shake = .15; nums.push({ x: hero.x, y: hero.y - fh('hero:idle') - 2 * U, v: d, t: 0, col: '#ff6a5a' });
    if (hero.hp <= 0) { hero.hp = 0; G.over = 'lose'; hero.deadT = 0; banner('败走……', 99); }
  }

  // ---------- 主角：自动横扫（先起手再砍）+ 每 4 秒旋风斩 ----------
  function heroAttack(dt) {
    hero.atk -= dt; hero.spin -= dt;
    let near = null, nd = 1e9; for (const z of foes) if (!z.dead) { const d = dist(z, hero); if (d < nd) { nd = d; near = z; } }
    if (hero.hitAt >= 0) { hero.hitAt -= dt; if (hero.hitAt < 0) {
      const a = hero.swA; fx.push({ k: 'slash', x: hero.x, y: hero.y - 10 * U, a, t: 0, T: .2, r: 30 * U });
      for (const z of foes) if (!z.dead) { const d = dist(z, hero), b = Math.atan2((z.y - hero.y) * 1.4, z.x - hero.x), da = Math.abs(((b - a + Math.PI * 3) % (Math.PI * 2)) - Math.PI); if (d < 42 * U && da < 1.25) hurt(z, 2 + (Math.random() < .2 ? 2 : 0), hero); }
    } }
    if (hero.atk <= 0 && near && nd < 48 * U && hero.roll <= 0) {
      hero.atk = .62; hero.swA = Math.atan2((near.y - hero.y) * 1.4, near.x - hero.x); hero.f = Math.cos(hero.swA) < 0 ? -1 : 1; hero.atkT = .3; hero.hitAt = .1;
    }
    if (hero.spin <= 0 && near && nd < 60 * U && hero.roll <= 0) {
      hero.spin = 4; hero.atkT = .3; fx.push({ k: 'spin', x: hero.x, y: hero.y - 8 * U, t: 0, T: .45, r: 46 * U });
      for (const z of foes) if (!z.dead && dist(z, hero) < 50 * U) hurt(z, 3, hero);
    }
  }
  // ---------- 小兵：跑过来 → 起手 → 出手 ----------
  function soldierAI(z, dt) {
    z.t += dt; z.cd -= dt;
    const dx = hero.x - z.x, dy = hero.y - z.y, d = Math.hypot(dx, dy) || 1, reach = (z.q ? 26 : 16) * U;
    if (z.st === 'hurt') { if (z.t > .18) { z.st = 'run'; z.t = 0; } return; }
    if (z.st === 'wind') { if (z.t > .4) { z.st = 'strike'; z.t = 0; if (dist(z, hero) < reach + 6 * U) damageHero(1); } return; }
    if (z.st === 'strike') { if (z.t > .22) { z.st = 'run'; z.t = 0; z.cd = R(1, 1.6); } return; }
    z.f = dx < 0 ? -1 : 1;
    if (d < reach && z.cd <= 0) { z.st = 'wind'; z.t = 0; return; }
    if (d > reach * .7) { z.x += dx / d * z.sp * dt; z.y += dy / d * z.sp * dt; }
  }
  // ---------- 首领：拖刀冲锋 / 跳斩（先画地面预警） ----------
  function bossAI(z, dt) {
    z.t += dt;
    if (z.st === 'walk') {
      const dx = hero.x - z.x, dy = hero.y - z.y, d = Math.hypot(dx, dy); z.f = dx < 0 ? -1 : 1; z.moving = d > 34 * U;
      if (z.moving) { z.x += dx / d * 14 * U * dt; z.y += dy / d * 14 * U * dt; }
      z.cd -= dt;
      if (z.cd <= 0) {
        if (Math.random() < .5) { const a = Math.atan2(dy, dx); z.st = 'wind'; z.t = 0; z.mv = 'charge'; z.a = a; z.f = Math.cos(a) < 0 ? -1 : 1; tele.push({ k: 'line', x: z.x, y: z.y, a, len: 130 * U, w: 20 * U, t: 0, T: .9 }); }
        else { z.st = 'wind'; z.t = 0; z.mv = 'slam'; z.tx = hero.x; z.ty = hero.y; tele.push({ k: 'circle', x: hero.x, y: hero.y, r: 32 * U, t: 0, T: 1.0 }); }
      }
    } else if (z.st === 'wind') {
      if (z.mv === 'charge' && z.t > .9) { z.st = 'dash'; z.t = 0; z.x0 = z.x; z.y0 = z.y; }
      if (z.mv === 'slam' && z.t > .55) { z.st = 'jump'; z.t = 0; z.x0 = z.x; z.y0 = z.y; }
    } else if (z.st === 'dash') {
      const p = Math.min(1, z.t / .3); z.x = z.x0 + Math.cos(z.a) * 130 * U * p; z.y = z.y0 + Math.sin(z.a) * 130 * U * p;
      if (Math.random() < .8) parts.push({ x: z.x, y: z.y, vx: R(-20, 20) * U, vy: R(-20, 0) * U, t: 0, T: .4, col: '#d8c08a', g: 0, sz: 2 });
      if (p >= 1) { z.st = 'rec'; z.t = 0; z.recF = 'charge1'; }
    } else if (z.st === 'jump') {
      const p = Math.min(1, z.t / .45); z.x = z.x0 + (z.tx - z.x0) * p; z.y = z.y0 + (z.ty - z.y0) * p; z.z = Math.sin(p * Math.PI) * 30 * U;
      if (p >= 1) { z.z = 0; z.st = 'rec'; z.t = 0; z.recF = 'jump2'; G.shake = .25; fx.push({ k: 'ring', x: z.x, y: z.y, t: 0, T: .4, r: 36 * U }); for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; parts.push({ x: z.x + Math.cos(a) * 20 * U, y: z.y + Math.sin(a) * 12 * U, vx: Math.cos(a) * 50 * U, vy: (Math.sin(a) * 30 - 30) * U, t: 0, T: .5, col: '#c8a066', g: 120 * U, sz: 2 }); } }
    } else if (z.st === 'rec') { if (z.t > .7) { z.st = 'walk'; z.cd = R(1.6, 2.4); } }
  }
  function teleTick(dt) {
    for (let i = tele.length - 1; i >= 0; i--) {
      const o = tele[i]; o.t += dt;
      if (o.t >= o.T) {
        let hit;
        if (o.k === 'circle') hit = Math.hypot(hero.x - o.x, (hero.y - o.y) * 1.6) < o.r;
        else { const dx = hero.x - o.x, dy = hero.y - o.y, al = dx * Math.cos(o.a) + dy * Math.sin(o.a), pp = Math.abs(-dx * Math.sin(o.a) + dy * Math.cos(o.a)); hit = al > 0 && al < o.len && pp < o.w / 2 + 3 * U; }
        if (hit) damageHero(6);
        tele.splice(i, 1);
      }
    }
  }

  // ---------- 更新 ----------
  let last = performance.now();
  function loop(now) {
    let dt = Math.min(.033, (now - last) / 1000); last = now;
    if (IMG[sk]) { if (G.hitStop > 0) { G.hitStop -= dt; dt *= .15; } update(dt); draw(); }
    requestAnimationFrame(loop);
  }
  function update(dt) {
    if (!bgC) makeBg();
    G.t += dt; if (G.banner) { G.banner.t -= dt; if (G.banner.t <= 0) G.banner = null; } G.shake = Math.max(0, G.shake - dt);
    hero.t += dt; if (G.over) { if (hero.deadT != null) hero.deadT += dt; return; }
    hero.rollCd -= dt; hero.inv -= dt; hero.hurtT -= dt; hero.atkT -= dt;
    if (hero.roll > 0) { hero.roll -= dt; hero.x += hero.rvx * 170 * U * dt; hero.y += hero.rvy * 120 * U * dt; if (Math.random() < .7) parts.push({ x: hero.x, y: hero.y, vx: R(-10, 10) * U, vy: R(-10, 0) * U, t: 0, T: .3, col: '#e6dcb4', g: 0 }); }
    else { const [dx, dy] = moveDir(), d = Math.hypot(dx, dy); hero.moving = d > .1; if (hero.moving) { const k = Math.min(1, d); hero.x += dx / (d || 1) * k * 60 * U * dt; hero.y += dy / (d || 1) * k * 46 * U * dt; if (hero.atkT <= 0) hero.f = dx < -.1 ? -1 : dx > .1 ? 1 : hero.f; } }
    hero.x = Math.max(10 * U, Math.min(W - 10 * U, hero.x)); hero.y = Math.max(yMin, Math.min(yMax, hero.y));
    heroAttack(dt);
    G.spawn -= dt; const alive = foes.filter(z => !z.dead && !z.boss).length, want = Math.min(45, 8 + G.t * 1.1);
    if (G.spawn <= 0 && alive < want && !G.bossDead) { for (let i = 0; i < 3; i++) spawn(); G.spawn = Math.max(.4, 1.4 - G.t * .02); }
    if (!G.bossOut && G.kills >= 30) { G.bossOut = true; spawn(true); banner('黄巾将 程远志 出阵！', 2.2); }
    if (G.bossDead && !foes.some(z => !z.dead)) { G.over = 'win'; banner('大破黄巾！', 99); }
    for (const z of foes) {
      if (z.dead) { z.deadT += dt; continue; }
      z.flash -= dt;
      if (z.boss) bossAI(z, dt); else soldierAI(z, dt);
      z.x += z.kbx * dt * 8; z.y += z.kby * dt * 8; z.kbx *= .8; z.kby *= .8; z.y = Math.max(yMin - 4 * U, z.y);
    }
    const L = foes.filter(z => !z.dead), m0 = 10 * U;
    for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) { const a = L[i], b = L[j], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), m = a.boss || b.boss ? m0 * 2 : m0; if (d > 0 && d < m) { const p = (m - d) / 2 / d; if (!a.boss) { a.x -= dx * p; a.y -= dy * p; } if (!b.boss) { b.x += dx * p; b.y += dy * p; } } }
    for (let i = foes.length - 1; i >= 0; i--) if (foes[i].dead && foes[i].deadT > (foes[i].boss ? 3 : 1.1)) foes.splice(i, 1);
    teleTick(dt);
    for (const a of [fx, parts, nums]) for (let i = a.length - 1; i >= 0; i--) { const o = a[i]; o.t += dt; if (o.vx != null) { o.x += o.vx * dt; o.y += o.vy * dt; o.vy += (o.g || 0) * dt; } if (o.t >= (o.T || .7)) a.splice(i, 1); }
  }

  // ---------- 绘制 ----------
  const rd = Math.round;
  function shadow(x, y, w) {
    const ox = 3 * U, hw0 = Math.max(3, w / 2 | 0);
    for (const [k, a] of [[1.25, .14], [.95, .2]]) { const hw = rd(hw0 * k), hh = Math.max(1, rd(hw * .3)); ctx.fillStyle = mk === 'old' ? `rgba(25,15,10,${a + .04})` : `rgba(30,40,10,${a})`; for (let j = -hh; j <= hh; j++) { const ww = rd(hw * Math.sqrt(1 - (j / (hh + .5)) ** 2)); ctx.fillRect(rd(x + ox * (j + hh) / (2 * hh) - ww + ox * .5), rd(y + j), ww * 2, 1); } }
  }
  function heroFrame() {
    if (G.over === 'lose') return ['hero:dead', 0];
    if (hero.roll > 0) return ['hero:roll', Math.floor((1 - hero.roll / .3) * nF('hero:roll'))];
    if (hero.atkT > 0) return ['hero:atk', Math.floor((1 - hero.atkT / .3) * nF('hero:atk'))];
    if (hero.hurtT > 0) return ['hero:hurt', 0];
    if (hero.moving) { const n = nF('hero:run'); return ['hero:run', n === 3 ? [0, 1, 2, 1][Math.floor(hero.t * (sk === 'c' ? 8 : 10)) % 4] : Math.floor(hero.t * 10) % n]; }   // 三帧的来回播（照原版 1-2-3-2）
    return ['hero:idle', Math.floor(hero.t * 2) % 2];
  }
  function solFrame(z) {
    const p = z.q ? 'soldiers:qiang_' : 'soldiers:dao_';
    if (z.dead) return [p + 'dead', 0];
    if (z.st === 'wind') return [p + 'atk', 0]; if (z.st === 'strike') return [p + 'atk', 1];
    if (z.st === 'hurt') return [p + 'hurt', 0];
    return [p + 'run', Math.floor(z.t * z.as * (ek === 'c' ? 6 : 8)) % nF(p + 'run')];
  }
  function bossFrame(z) {
    if (z.dead) return ['boss:dead', 0];
    if (z.st === 'wind') return z.mv === 'charge' ? ['boss:charge', 0] : ['boss:jump', 0];
    if (z.st === 'dash') return ['boss:charge', 1];
    if (z.st === 'jump') return ['boss:jump', 1];
    if (z.st === 'rec') return z.recF === 'jump2' ? ['boss:jump', 2] : z.t < .3 ? ['boss:charge', 1] : ['boss:idle', 0];
    if (z.flash > 0) return ['boss:hurt', 0];
    if (z.moving) return ['boss:walk', Math.floor(z.t * (ek === 'c' ? 5 : 6)) % nF('boss:walk')];
    return ['boss:idle', Math.floor(z.t * 2) % 2];
  }
  function draw() {
    if (!bgC) return;
    const sh = G.shake > 0 ? rd(R(-2, 2)) * U : 0;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, W, H); ctx.setTransform(1, 0, 0, 1, sh, 0); bgcv.style.transform = sh ? `translateX(${sh * SC}px)` : '';
    for (const o of tele) {   // 地面预警：虚线边 + 慢慢填满，最后闪
      const p = o.t / o.T, blink = p > .7 && (Math.floor(o.t * 16) % 2), col = blink ? '#fff2c0' : '#d8402a';
      ctx.save(); ctx.translate(rd(o.x), rd(o.y));
      if (o.k === 'circle') { ctx.fillStyle = 'rgba(216,64,42,.3)'; ctx.beginPath(); ctx.ellipse(0, 0, o.r * p, o.r * p * .62, 0, 0, 7); ctx.fill(); ctx.fillStyle = col; for (let a = 0; a < Math.PI * 2; a += .1) { if (Math.floor(a / .1) % 2) continue; ctx.fillRect(rd(Math.cos(a) * o.r), rd(Math.sin(a) * o.r * .62), 2 * U, 2 * U); } }
      else { ctx.rotate(o.a); ctx.fillStyle = 'rgba(216,64,42,.28)'; ctx.fillRect(0, -o.w / 2, o.len * p, o.w); ctx.fillStyle = col; for (let i = 0; i < o.len; i += 6 * U) { ctx.fillRect(i, -o.w / 2, 3 * U, U); ctx.fillRect(i, o.w / 2, 3 * U, U); } }
      ctx.restore();
    }
    const list = foes.map(z => ({ y: z.y, z })); list.push({ y: hero.y, h: 1 }); list.sort((a, b) => a.y - b.y);
    for (const o of list) {
      if (o.h) {
        shadow(hero.x, hero.y, fw('hero:idle') * .7);
        if (hero.inv > 0 && hero.roll <= 0 && hero.hurtT <= 0 && !G.over && Math.floor(G.t * 20) % 2) continue;
        const [k, i] = heroFrame(), bob = k === 'hero:run' && i % 2 ? -U : 0, lunge = k === 'hero:atk' && i > 0 ? hero.f * 3 * U : 0; drawF(k, i, hero.x + lunge, hero.y + bob, hero.f, false);
      } else {
        const z = o.z, B = z.boss, [k, i] = B ? bossFrame(z) : solFrame(z);
        const a = z.dead ? Math.max(0, 1 - Math.max(0, z.deadT - (B ? 2.4 : .7)) / .4) : null;
        if (!z.dead) shadow(z.x, z.y, fw(B ? 'boss:idle' : 'soldiers:dao_run') * .6);
        const bob = !B && z.st === 'run' && i % 2 ? -U : 0, lunge = !B && z.st === 'strike' ? z.f * 4 * U : !B && z.st === 'hurt' ? -z.f * 2 * U : 0;
        drawF(k, i, z.x + lunge, z.y - (z.z || 0) + bob, z.f, z.flash > 0 && !z.dead, a, B ? 0 : z.v, B ? 1 : z.sc);
        if (B && z.st === 'wind' && Math.floor(z.t * 12) % 2) { ctx.globalCompositeOperation = 'lighter'; drawF(k, i, z.x, z.y, z.f, true, .35); ctx.globalCompositeOperation = 'source-over'; }
      }
    }
    for (const o of fx) {   // 像素刀光
      const p = o.t / o.T, s = U;
      if (o.k === 'slash') {
        for (let k = 0; k < 3; k++) { const r = o.r - k * 4 * U, w = 1.25; for (let a = -w; a <= w; a += .05 / U) { const t = (a + w) / (2 * w); if (t > p * 1.6) continue; if (p > .6 && (Math.floor(a * 40) % 2)) continue; const aa = o.a + a; ctx.fillStyle = k === 0 ? '#ffffff' : k === 1 ? '#fff2b0' : '#f0c04c'; const q = k === 0 ? 2 * s : s; ctx.fillRect(rd(o.x + Math.cos(aa) * r), rd(o.y + Math.sin(aa) * r * .7), q, q); } }
      } else if (o.k === 'spin') {
        const r = o.r * (.5 + p * .6); for (let a = 0; a < Math.PI * 2; a += .05 / U) { if (Math.floor(a * 10 + o.t * 40) % 3 === 0) continue; ctx.fillStyle = (Math.floor(a * 6) % 2) ? '#ffffff' : '#9fe0ff'; ctx.fillRect(rd(o.x + Math.cos(a) * r), rd(o.y + Math.sin(a) * r * .6), 2 * s, s); }
      } else if (o.k === 'ring') {
        const r = o.r * (.6 + p * .8); for (let a = 0; a < Math.PI * 2; a += .07 / U) { ctx.fillStyle = p < .5 ? '#fff2c0' : '#c8a066'; ctx.fillRect(rd(o.x + Math.cos(a) * r), rd(o.y + Math.sin(a) * r * .55), 2 * s, 2 * s); }
      }
    }
    for (const q of parts) { ctx.fillStyle = q.col; const s = (q.sz || 1) * U; ctx.fillRect(rd(q.x), rd(q.y), s, s); }
    for (const n of nums) num(n.v, n.x, n.y - n.t * 22 * U, n.col);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    // 首领：头像 + 血条
    const b = foes.find(z => z.boss && !z.dead);
    if (b) { const bw = Math.min(170 * U, W - 60 * U), bx = rd(W / 2 - bw / 2 + 12 * U), by = 20 * U; portrait('boss:por', bx - 30 * U, 4 * U, 26 * U); ctx.fillStyle = '#2a160e'; ctx.fillRect(bx - U, by - U, bw + 2 * U, 6 * U); ctx.fillStyle = '#5a1a12'; ctx.fillRect(bx, by, bw, 4 * U); ctx.fillStyle = '#d8402a'; ctx.fillRect(bx, by, rd(bw * b.hp / b.maxHp), 4 * U); ctx.fillStyle = '#ff8a6a'; ctx.fillRect(bx, by, rd(bw * b.hp / b.maxHp), U); }
    hud('boss', b ? '黄巾将 · 程远志' : '');
    // 主角：头像 + 血条 + 旋风斩冷却
    { const px = 3 * U, py = H - 29 * U; portrait('hero:por', px, py, 26 * U); const bx = px + 29 * U, by = H - 12 * U, bw = 64 * U;
      ctx.fillStyle = '#2a160e'; ctx.fillRect(bx - U, by - U, bw + 2 * U, 8 * U); ctx.fillStyle = '#5a1a12'; ctx.fillRect(bx, by, bw, 6 * U); ctx.fillStyle = '#e0503a'; ctx.fillRect(bx, by, rd(bw * hero.hp / hero.maxHp), 6 * U); ctx.fillStyle = '#ff9a7a'; ctx.fillRect(bx, by, rd(bw * hero.hp / hero.maxHp), U);
      num(hero.hp, bx + bw / 2, by + U, '#ffffff', U);
      const cx = bx, cy = by - 11 * U, p = Math.max(0, hero.spin) / 4; ctx.fillStyle = '#2a160e'; ctx.fillRect(cx, cy, 9 * U, 9 * U); ctx.fillStyle = p > 0 ? '#3a4a5a' : '#9fe0ff'; ctx.fillRect(cx + U, cy + U, 7 * U, 7 * U); ctx.fillStyle = '#9fe0ff'; ctx.fillRect(cx + U, cy + U + rd(7 * U * p), 7 * U, 7 * U - rd(7 * U * p)); }
    hud('kill', '斩 ' + G.kills);
    hud('ban', G.banner ? G.banner.s : '');
    hud('tip', G.over ? (innerWidth > 700 ? '按 R 或点击重来' : '点一下重来') : G.t < 7 ? (innerWidth > 700 ? 'WASD 移动 · 空格翻滚 · 自动出招 · 1–5 换主角 · E 换敌人 · M 换地图' : '左边拖动移动 · 右边点一下翻滚 · 自动出招') : '');
    if (joy.on) { ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.beginPath(); ctx.arc(rd(joy.sx / SC), rd(joy.sy / SC), 16 * U, 0, 7); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.45)'; const jx = joy.x - joy.sx, jy = joy.y - joy.sy, d = Math.hypot(jx, jy), k = Math.min(1, 40 / (d || 1)); ctx.beginPath(); ctx.arc(rd((joy.sx + jx * k) / SC), rd((joy.sy + jy * k) / SC), 7 * U, 0, 7); ctx.fill(); }
  }
  function portrait(key, x, y, s) {   // 头像框：深色底 + 金边，头像缩放塞进去
    const I = IMG[setOf(key)], [sx, sy, w, h] = frame(key, 0); x = rd(x); y = rd(y);
    ctx.fillStyle = '#2a160e'; ctx.fillRect(x - U, y - U, s + 2 * U, s + 2 * U); ctx.fillStyle = '#e8b84a'; ctx.fillRect(x, y, s, s); ctx.fillStyle = '#4a3428'; ctx.fillRect(x + U, y + U, s - 2 * U, s - 2 * U);
    const k = Math.min((s - 2 * U) / w, (s - 2 * U) / h), dw = rd(w * k), dh = rd(h * k);   // 整张头像缩进框里，底边对齐
    ctx.drawImage(I.base, sx, sy, w, h, x + rd((s - dw) / 2), y + s - U - dh, dw, dh);
  }
  const HUD = {}; function hud(id, v) { if (HUD[id] === v) return; HUD[id] = v; const e = document.getElementById(id); e.textContent = v; e.style.display = v ? '' : 'none'; }
  addEventListener('resize', () => { fit(); });
  const NEXTS = { e: 'd', d: 'a', a: 'b', b: 'c', c: 'e' }; document.getElementById('sty').onclick = () => setStyle(NEXTS[sk]); document.getElementById('enb').onclick = () => setEnemy(NEXTS[ek]); document.getElementById('mapb').onclick = () => setMap(NEXTM[mk]);
  Promise.all([load('e'), loadMap('pixe')]).then(() => { fit(); start(); btns(); requestAnimationFrame(loop); load('d'); loadMap('pixd'); load('a'); load('b'); load('c'); loadMap('pix'); loadMap('old'); });
  window.__G = () => ({ G, hero, foes, sk });
})();
