(() => {
  const { PAL } = SPR;
  // ---------- 低分辨率画布：内部按像素画，再整数倍放大（不模糊） ----------
  const cv = document.getElementById('cv'), ctx = cv.getContext('2d');
  let W = 320, H = 180, SC = 3;
  function fit() {
    const vw = innerWidth, vh = innerHeight;
    SC = Math.max(2, Math.round(Math.min(vw, vh) / 190));
    W = Math.ceil(vw / SC); H = Math.ceil(vh / SC);
    cv.width = W; cv.height = H; cv.style.width = W * SC + 'px'; cv.style.height = H * SC + 'px';
    ctx.imageSmoothingEnabled = false; bg = null;
  }
  addEventListener('resize', fit);

  // ---------- 精灵：文字图 → 小画布（含翻转、受击白闪版） ----------
  function mk(rows, tint) {
    const w = Math.max(...rows.map(r => r.length)), h = rows.length, c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d');
    rows.forEach((r, j) => { for (let i = 0; i < r.length; i++) { const k = r[i]; if (k !== '.' && PAL[k]) { x.fillStyle = tint ? (k === 'o' ? '#ffffff' : '#fff6e0') : PAL[k]; x.fillRect(i, j, 1, 1); } } });
    return c;
  }
  function flip(c) { const f = document.createElement('canvas'); f.width = c.width; f.height = c.height; const x = f.getContext('2d'); x.translate(c.width, 0); x.scale(-1, 1); x.drawImage(c, 0, 0); return f; }
  function set(rows, w2, legRow) {
    const a = rows, b = rows.slice(0, legRow).concat(w2);
    const out = {};
    for (const [n, r] of [['a', a], ['b', b]]) { const c = mk(r), wc = mk(r, 1); out[n] = [c, flip(c)]; out[n + 'w'] = [wc, flip(wc)]; }
    out.w = out.a[0].width; out.h = out.a[0].height; return out;
  }
  const S_HERO = set(SPR.HERO, SPR.HERO_W2, 17), S_SOL = set(SPR.SOL, SPR.SOL_W2, 15), S_BOSS = set(SPR.BOSS, SPR.BOSS_W2, 27);
  const I_SWORD = mk(SPR.SWORD), I_SPEAR = mk(SPR.SPEAR), I_GLAIVE = mk(SPR.GLAIVE);

  // ---------- 3×5 像素数字 ----------
  const DIG = { 0: '111101101101111', 1: '010110010010111', 2: '111001111100111', 3: '111001111001111', 4: '101101111001001', 5: '111100111001111', 6: '111100111101111', 7: '111001001010010', 8: '111101111101111', 9: '111101111001111' };
  function num(n, x, y, col) {
    const s = String(n); x = Math.round(x - s.length * 2); y = Math.round(y);
    for (const pass of [0, 1]) for (let k = 0; k < s.length; k++) { const g = DIG[s[k]]; for (let i = 0; i < 15; i++) if (g[i] === '1') { const px = x + k * 4 + (i % 3), py = y + ((i / 3) | 0); if (!pass) { ctx.fillStyle = '#2a160e'; ctx.fillRect(px - 1, py - 1, 3, 3); } else { ctx.fillStyle = col; ctx.fillRect(px, py, 1, 1); } } }
  }
  // 中文像素字：先画到小画布，再把半透明边去掉（变成硬边像素字）
  const TXT = {};
  function text(s, size, col, out) {
    const key = s + size + col + out; if (TXT[key]) return TXT[key];
    const c = document.createElement('canvas'), x = c.getContext('2d'); x.font = `${size}px "PingFang SC","Microsoft YaHei","Noto Sans CJK SC",sans-serif`;
    const w = Math.ceil(x.measureText(s).width) + 4, h = size + 6; c.width = w; c.height = h; x.font = `bold ${size}px "PingFang SC","Microsoft YaHei","Noto Sans CJK SC",sans-serif`; x.textBaseline = 'top'; x.fillStyle = '#fff'; x.fillText(s, 2, 2);
    const d = x.getImageData(0, 0, w, h), m = new Uint8Array(w * h); for (let i = 0; i < w * h; i++) m[i] = d.data[i * 4 + 3] > 110 ? 1 : 0;
    const o = x.createImageData(w, h), hex = v => [parseInt(v.slice(1, 3), 16), parseInt(v.slice(3, 5), 16), parseInt(v.slice(5, 7), 16)], C = hex(col), O = hex(out || '#2a160e');
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const k = j * w + i; let v = null; if (m[k]) v = C; else if (out !== 'none' && ((i > 0 && m[k - 1]) || (i < w - 1 && m[k + 1]) || (j > 0 && m[k - w]) || (j < h - 1 && m[k + w]))) v = O; if (v) { o.data[k * 4] = v[0]; o.data[k * 4 + 1] = v[1]; o.data[k * 4 + 2] = v[2]; o.data[k * 4 + 3] = 255; } }
    x.putImageData(o, 0, 0); return (TXT[key] = c);
  }
  const drawText = (s, x, y, size = 10, col = '#fff3d0', out, center = true) => { const c = text(s, size, col, out); ctx.drawImage(c, Math.round(center ? x - c.width / 2 : x), Math.round(y)); };

  // ---------- 背景：参考图一的草地牧场（只画一次） ----------
  let bg = null;
  function rnd(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
  function makeBg() {
    const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d'), r = rnd(7);
    x.fillStyle = '#9cc94e'; x.fillRect(0, 0, W, H);
    for (let i = 0; i < W * H / 9; i++) { const px = r() * W | 0, py = r() * H | 0; x.fillStyle = r() < .5 ? '#8aba45' : '#acd35a'; x.fillRect(px, py, 1 + (r() * 2 | 0), 1); }
    for (let i = 0; i < W * H / 260; i++) { const px = r() * W | 0, py = r() * H | 0; x.fillStyle = '#76a83c'; x.fillRect(px, py, 1, 2); x.fillRect(px + 2, py + 1, 1, 2); }   // 草丛
    for (let i = 0; i < W * H / 500; i++) { const px = r() * W | 0, py = 30 + r() * (H - 30) | 0, col = r() < .55 ? '#ffffff' : '#ffd84a'; x.fillStyle = col; x.fillRect(px, py, 1, 1); x.fillRect(px - 1, py + 1, 1, 1); x.fillRect(px + 1, py + 1, 1, 1); x.fillRect(px, py + 2, 1, 1); x.fillStyle = col === '#ffffff' ? '#f6d23c' : '#e08a2a'; x.fillRect(px, py + 1, 1, 1); }   // 小花
    // 远处山坡和木栅栏
    x.fillStyle = '#b7d86a'; x.fillRect(0, 0, W, 22); x.fillStyle = '#c8e27c'; for (let i = 0; i < W; i += 1) { const h = 10 + Math.sin(i * .05) * 4 + Math.sin(i * .013) * 5; x.fillRect(i, 0, 1, h | 0); }
    x.fillStyle = '#8fd0f0'; x.fillRect(0, 0, W, 4);
    for (let i = -4; i < W; i += 18) { x.fillStyle = '#3a2418'; x.fillRect(i, 16, 5, 14); x.fillStyle = '#8a5a32'; x.fillRect(i + 1, 17, 3, 12); x.fillStyle = '#a8703e'; x.fillRect(i + 1, 17, 1, 12); }
    for (const yy of [19, 25]) { x.fillStyle = '#3a2418'; x.fillRect(0, yy - 1, W, 4); x.fillStyle = '#9a6638'; x.fillRect(0, yy, W, 2); x.fillStyle = '#b8824a'; x.fillRect(0, yy, W, 1); }
    // 左下大树影、右边草垛
    const tree = (tx, ty) => { x.fillStyle = 'rgba(40,60,20,.25)'; for (let j = -10; j < 10; j++) for (let i = -22; i < 22; i++) if ((i * i) / 484 + (j * j) / 100 < 1) x.fillRect(tx + i, ty + j + 30, 1, 1);
      x.fillStyle = '#3a2418'; x.fillRect(tx - 4, ty, 9, 30); x.fillStyle = '#7a4a2a'; x.fillRect(tx - 3, ty, 7, 30); x.fillStyle = '#9a6238'; x.fillRect(tx - 2, ty, 2, 30);
      for (const [cx, cy, rr, col] of [[0, -6, 17, '#3a2418'], [0, -6, 16, '#4e8a34'], [-5, -9, 11, '#62a03e'], [5, -4, 10, '#5a9638'], [-3, -12, 6, '#7cb84c']]) { x.fillStyle = col; for (let j = -rr; j <= rr; j++) for (let i = -rr; i <= rr; i++) if (i * i + j * j <= rr * rr) x.fillRect(tx + cx + i, ty + cy + j, 1, 1); } };
    tree(14, 30); tree(W - 20, H - 40);
    const hay = (hx, hy) => { x.fillStyle = '#3a2418'; x.fillRect(hx - 1, hy - 1, 16, 12); x.fillStyle = '#e8c45a'; x.fillRect(hx, hy, 14, 10); x.fillStyle = '#c89a38'; for (let i = 0; i < 14; i += 3) x.fillRect(hx + i, hy, 1, 10); x.fillStyle = '#f6dc84'; x.fillRect(hx, hy, 14, 2); };
    hay(W - 60, 34); hay(W - 44, 38);
    return c;
  }

  // ---------- 状态 ----------
  const keys = {}; addEventListener('keydown', e => { keys[e.code] = 1; if (e.code === 'Space') { roll(); e.preventDefault(); } if (e.code === 'KeyR' && G.over) start(); }); addEventListener('keyup', e => keys[e.code] = 0);
  let G, hero, foes, fx, parts, nums, tele;
  function start() {
    G = { t: 0, kills: 0, spawn: 0, bossOut: false, bossDead: false, over: false, shake: 0, banner: null, lv: 1, xp: 0 };
    hero = { x: W / 2, y: H / 2 + 10, hp: 30, maxHp: 30, f: 1, walk: 0, moving: false, atk: .3, swing: 0, spin: 3, spinT: 0, roll: 0, rollCd: 0, inv: 0, vx: 0, vy: 0 };
    foes = []; fx = []; parts = []; nums = []; tele = [];
    banner('黄巾来袭！', 2);
  }
  const banner = (s, t) => { G.banner = { s, t, T: t }; };
  function roll() { if (!G || G.over || hero.roll > 0 || hero.rollCd > 0) return; const [dx, dy] = moveDir(); const d = Math.hypot(dx, dy); hero.rvx = d ? dx / d : hero.f; hero.rvy = d ? dy / d : 0; hero.roll = .28; hero.rollCd = .9; hero.inv = .38; }

  // ---------- 摇杆（手机） ----------
  const joy = { on: false, sx: 0, sy: 0, x: 0, y: 0, id: null };
  cv.addEventListener('pointerdown', e => { if (G.over) { start(); return; } if (e.clientX > innerWidth * .55 && e.pointerType !== 'mouse') { roll(); return; } joy.on = true; joy.id = e.pointerId; joy.sx = joy.x = e.clientX; joy.sy = joy.y = e.clientY; });
  addEventListener('pointermove', e => { if (joy.on && e.pointerId === joy.id) { joy.x = e.clientX; joy.y = e.clientY; } });
  const up = e => { if (e.pointerId === joy.id) joy.on = false; }; addEventListener('pointerup', up); addEventListener('pointercancel', up);
  function moveDir() {
    let dx = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0), dy = (keys.KeyS || keys.ArrowDown ? 1 : 0) - (keys.KeyW || keys.ArrowUp ? 1 : 0);
    if (joy.on) { const jx = joy.x - joy.sx, jy = joy.y - joy.sy, d = Math.hypot(jx, jy); if (d > 8) { dx = jx / Math.max(d, 40); dy = jy / Math.max(d, 40); } }
    return [dx, dy];
  }

  // ---------- 敌人 ----------
  const R = (a, b) => a + Math.random() * (b - a);
  function spawn(type) {
    const side = Math.random() * 4 | 0, x = side === 0 ? -10 : side === 1 ? W + 10 : R(0, W), y = side === 2 ? 24 : side === 3 ? H + 12 : R(30, H);
    if (type === 'boss') { foes.push({ boss: 1, x: W + 20, y: H / 2 + 10, hp: 160, maxHp: 160, sp: 14, f: -1, walk: 0, flash: 0, kb: 0, st: 'walk', t: 0, cd: 2 }); return; }
    const spear = Math.random() < .35; foes.push({ x, y, hp: spear ? 4 : 3, maxHp: spear ? 4 : 3, sp: R(16, 24), f: 1, walk: R(0, 1), flash: 0, kbx: 0, kby: 0, spear, hitCd: 0 });
  }
  const dist = (a, b) => Math.hypot(a.x - b.x, (a.y - b.y) * 1.4);
  function hurt(z, d, from) {
    z.hp -= d; z.flash = .12; nums.push({ x: z.x, y: z.y - (z.boss ? 34 : 22), v: d, t: 0, col: d >= 4 ? '#ffd84a' : '#ffffff' });
    const a = Math.atan2(z.y - from.y, z.x - from.x), k = z.boss ? 3 : 26; z.kbx = Math.cos(a) * k; z.kby = Math.sin(a) * k;
    for (let i = 0; i < 4; i++) parts.push({ x: z.x, y: z.y - 8, vx: R(-40, 40) + Math.cos(a) * 30, vy: R(-50, -10), t: 0, T: R(.25, .45), col: i % 2 ? '#ffffff' : '#ffe9a8', g: 160 });
    G.hitStop = Math.max(G.hitStop || 0, z.boss ? .05 : .025);
    if (z.hp <= 0 && !z.dead) {
      z.dead = 1; G.kills++; G.xp++;
      for (let i = 0; i < 10; i++) parts.push({ x: z.x, y: z.y - 6, vx: R(-50, 50), vy: R(-70, -10), t: 0, T: R(.4, .8), col: ['#f6d23c', '#b48a58', '#e8e0c8', '#c49a1c'][i % 4], g: 200, sz: i < 3 ? 2 : 1 });
      fx.push({ k: 'puff', x: z.x, y: z.y - 4, t: 0, T: .35 });
      if (z.boss) { G.bossDead = true; banner('斩！程远志', 2.5); G.shake = .4; for (const o of foes) if (!o.boss && !o.dead) hurt(o, 9, z); }
    }
  }

  // ---------- 主角招式：横扫（自动，打最近的敌人方向）+ 旋风斩（每 4 秒） ----------
  function heroAttack(dt) {
    hero.atk -= dt; hero.spin -= dt;
    let near = null, nd = 1e9; for (const z of foes) if (!z.dead) { const d = dist(z, hero); if (d < nd) { nd = d; near = z; } }
    if (hero.atk <= 0 && near && nd < 46) {
      hero.atk = .62; const a = Math.atan2((near.y - hero.y) * 1.4, near.x - hero.x); hero.f = Math.cos(a) < 0 ? -1 : 1; hero.swing = .22; hero.swA = a;
      fx.push({ k: 'slash', x: hero.x, y: hero.y - 8, a, t: 0, T: .2, r: 30 });
      for (const z of foes) if (!z.dead) { const d = dist(z, hero), b = Math.atan2((z.y - hero.y) * 1.4, z.x - hero.x); let da = Math.abs(((b - a + Math.PI * 3) % (Math.PI * 2)) - Math.PI); if (d < 40 && da < 1.2) hurt(z, 2 + (Math.random() < .2 ? 2 : 0), hero); }
    }
    if (hero.spin <= 0 && near && nd < 60) {
      hero.spin = 4; hero.spinT = .45; fx.push({ k: 'spin', x: hero.x, y: hero.y - 6, t: 0, T: .45, r: 44 });
      for (const z of foes) if (!z.dead && dist(z, hero) < 48) hurt(z, 3, hero);
    }
  }

  // ---------- 首领招式：拖刀冲锋 / 跳斩（先画地面预警） ----------
  function bossAI(z, dt) {
    z.t += dt;
    if (z.st === 'walk') {
      const dx = hero.x - z.x, dy = hero.y - z.y, d = Math.hypot(dx, dy); z.f = dx < 0 ? -1 : 1;
      if (d > 30) { z.x += dx / d * z.sp * dt; z.y += dy / d * z.sp * dt; z.walk += dt * 3; }
      z.cd -= dt;
      if (z.cd <= 0) {
        if (Math.random() < .5) { const a = Math.atan2(dy, dx); z.st = 'wind'; z.t = 0; z.mv = 'charge'; z.a = a; tele.push({ k: 'line', x: z.x, y: z.y, a, len: 120, w: 18, t: 0, T: .9, src: z }); }
        else { z.st = 'wind'; z.t = 0; z.mv = 'slam'; z.tx = hero.x; z.ty = hero.y; tele.push({ k: 'circle', x: hero.x, y: hero.y, r: 30, t: 0, T: 1.0, src: z }); }
      }
    } else if (z.st === 'wind') {
      if (z.mv === 'charge' && z.t > .9) { z.st = 'dash'; z.t = 0; z.dx0 = z.x; z.dy0 = z.y; }
      if (z.mv === 'slam' && z.t > .55) { z.st = 'jump'; z.t = 0; z.jx0 = z.x; z.jy0 = z.y; }
    } else if (z.st === 'dash') {
      const p = Math.min(1, z.t / .3); z.x = z.dx0 + Math.cos(z.a) * 120 * p; z.y = z.dy0 + Math.sin(z.a) * 120 * p;
      if (Math.random() < .8) parts.push({ x: z.x, y: z.y, vx: R(-20, 20), vy: R(-20, 0), t: 0, T: .4, col: '#d8c08a', g: 0, sz: 2 });
      if (p >= 1) { z.st = 'rec'; z.t = 0; }
    } else if (z.st === 'jump') {
      const p = Math.min(1, z.t / .45); z.x = z.jx0 + (z.tx - z.jx0) * p; z.y = z.jy0 + (z.ty - z.jy0) * p; z.z = Math.sin(p * Math.PI) * 26;
      if (p >= 1) { z.z = 0; z.st = 'rec'; z.t = 0; G.shake = .25; fx.push({ k: 'ring', x: z.x, y: z.y, t: 0, T: .4, r: 34 }); for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; parts.push({ x: z.x + Math.cos(a) * 20, y: z.y + Math.sin(a) * 12, vx: Math.cos(a) * 50, vy: Math.sin(a) * 30 - 30, t: 0, T: .5, col: '#c8a066', g: 120, sz: 2 }); } }
    } else if (z.st === 'rec') { if (z.t > .8) { z.st = 'walk'; z.cd = R(1.8, 2.6); } }
  }
  function teleTick(dt) {
    for (let i = tele.length - 1; i >= 0; i--) {
      const o = tele[i]; o.t += dt;
      if (o.t >= o.T) {
        let hit = false;
        if (o.k === 'circle') hit = Math.hypot(hero.x - o.x, (hero.y - o.y) * 1.6) < o.r;
        else { const dx = hero.x - o.x, dy = hero.y - o.y, al = dx * Math.cos(o.a) + dy * Math.sin(o.a), pp = Math.abs(-dx * Math.sin(o.a) + dy * Math.cos(o.a)); hit = al > 0 && al < o.len && pp < o.w / 2 + 3; }
        if (hit && hero.inv <= 0) damageHero(6);
        tele.splice(i, 1);
      }
    }
  }
  function damageHero(d) {
    if (hero.inv > 0 || G.over) return; hero.hp -= d; hero.inv = .6; G.shake = .15; nums.push({ x: hero.x, y: hero.y - 24, v: d, t: 0, col: '#ff6a5a' });
    if (hero.hp <= 0) { hero.hp = 0; G.over = 'lose'; banner('败走……', 99); }
  }

  // ---------- 主循环 ----------
  let last = performance.now();
  function frame(now) {
    let dt = Math.min(.033, (now - last) / 1000); last = now;
    if (G.hitStop > 0) { G.hitStop -= dt; dt *= .15; }
    update(dt); draw(); requestAnimationFrame(frame);
  }
  function update(dt) {
    if (!bg || bg.width !== W || bg.height !== H) bg = makeBg();
    G.t += dt; if (G.banner) { G.banner.t -= dt; if (G.banner.t <= 0) G.banner = null; } G.shake = Math.max(0, G.shake - dt);
    if (G.over) return;
    // 主角移动
    hero.rollCd -= dt; hero.inv -= dt;
    if (hero.roll > 0) { hero.roll -= dt; hero.x += hero.rvx * 170 * dt; hero.y += hero.rvy * 120 * dt; if (Math.random() < .7) parts.push({ x: hero.x, y: hero.y, vx: R(-10, 10), vy: R(-10, 0), t: 0, T: .3, col: '#e6dcb4', g: 0 }); }
    else { const [dx, dy] = moveDir(), d = Math.hypot(dx, dy); hero.moving = d > .1; if (hero.moving) { const k = Math.min(1, d); hero.x += dx / (d || 1) * k * 58 * dt; hero.y += dy / (d || 1) * k * 44 * dt; if (hero.swing <= 0) hero.f = dx < -.1 ? -1 : dx > .1 ? 1 : hero.f; hero.walk += dt * 7; } }
    hero.x = Math.max(8, Math.min(W - 8, hero.x)); hero.y = Math.max(40, Math.min(H - 4, hero.y));
    hero.swing -= dt; hero.spinT -= dt;
    heroAttack(dt);
    // 刷兵
    G.spawn -= dt; const want = Math.min(60, 8 + G.t * 1.2);
    if (G.spawn <= 0 && foes.filter(z => !z.dead && !z.boss).length < want && !G.bossDead) { for (let i = 0; i < 3; i++) spawn(); G.spawn = Math.max(.35, 1.4 - G.t * .02); }
    if (!G.bossOut && G.kills >= 30) { G.bossOut = true; spawn('boss'); banner('黄巾将 程远志 出阵！', 2.2); }
    if (G.bossDead && !G.over && !foes.some(z => !z.dead)) { G.over = 'win'; banner('大破黄巾！', 99); }
    // 敌人
    for (const z of foes) {
      if (z.dead) continue; z.flash -= dt;
      if (z.boss) bossAI(z, dt);
      else {
        const dx = hero.x - z.x, dy = hero.y - z.y, d = Math.hypot(dx, dy) || 1; z.f = dx < 0 ? -1 : 1;
        if (d > 10) { z.x += dx / d * z.sp * dt; z.y += dy / d * z.sp * dt; z.walk += dt * 5; }
        z.hitCd -= dt; if (d < 12 && z.hitCd <= 0) { z.hitCd = 1; z.poke = .2; damageHero(1); }
        z.poke = (z.poke || 0) - dt;
      }
      z.x += (z.kbx || 0) * dt * 8; z.y += (z.kby || 0) * dt * 8; z.kbx *= .8; z.kby *= .8;
    }
    // 兵之间互相推开
    const L = foes.filter(z => !z.dead);
    for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) { const a = L[i], b = L[j], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), m = a.boss || b.boss ? 18 : 9; if (d > 0 && d < m) { const p = (m - d) / 2 / d; if (!a.boss) { a.x -= dx * p; a.y -= dy * p; } if (!b.boss) { b.x += dx * p; b.y += dy * p; } } }
    for (let i = foes.length - 1; i >= 0; i--) if (foes[i].dead) foes.splice(i, 1);
    teleTick(dt);
    for (const a of [fx, parts, nums]) for (let i = a.length - 1; i >= 0; i--) { const o = a[i]; o.t += dt; if (o.vx != null) { o.x += o.vx * dt; o.y += o.vy * dt; o.vy += (o.g || 0) * dt; } if (o.t >= (o.T || .7)) a.splice(i, 1); }
  }

  // ---------- 绘制 ----------
  const rd = Math.round;
  function shadow(x, y, w) { ctx.fillStyle = 'rgba(40,50,20,.35)'; const hw = w / 2 | 0; for (let j = -1; j <= 1; j++) { const ww = j ? hw - 2 : hw; ctx.fillRect(rd(x - ww), rd(y + j), ww * 2, 1); } }
  function drawWeapon(img, x, y, a, len) { ctx.save(); ctx.translate(rd(x), rd(y)); ctx.rotate(a); ctx.drawImage(img, -Math.floor(img.width / 2), -img.height + 2); ctx.restore(); }
  function unit(S, z, wx) {
    const fi = z.f < 0 ? 1 : 0, step = (Math.floor(z.walk || 0) % 2) ? 'b' : 'a', fr = (z.flash > 0 ? S[step + 'w'] : S[step])[fi];
    const bob = (Math.floor((z.walk || 0) * 2) % 2), zz = z.z || 0;
    shadow(z.x, z.y, S.w * .8);
    const x = rd(z.x - S.w / 2), y = rd(z.y - S.h - zz) + (bob && z.moving !== false ? 0 : 0);
    if (wx && wx.back) wx.back();
    ctx.drawImage(fr, x, y);
    if (wx && wx.front) wx.front(x, y);
  }
  function draw() {
    if (!bg) return;
    const sh = G.shake > 0 ? rd(R(-2, 2)) : 0;
    ctx.setTransform(1, 0, 0, 1, sh, 0);
    ctx.drawImage(bg, 0, 0);
    // 地面预警（虚线框 + 慢慢填满）
    for (const o of tele) {
      const p = o.t / o.T, blink = p > .7 && (Math.floor(o.t * 16) % 2);
      ctx.save(); ctx.translate(rd(o.x), rd(o.y));
      if (o.k === 'circle') { ctx.scale(1, .62); for (let a = 0; a < Math.PI * 2; a += .12) { if (Math.floor(a / .12) % 2) continue; ctx.fillStyle = blink ? '#fff2c0' : '#d8402a'; ctx.fillRect(rd(Math.cos(a) * o.r), rd(Math.sin(a) * o.r), 2, 2); } ctx.fillStyle = 'rgba(216,64,42,.32)'; ctx.beginPath(); ctx.arc(0, 0, o.r * p, 0, 7); ctx.fill(); }
      else { ctx.rotate(o.a); ctx.fillStyle = 'rgba(216,64,42,.28)'; ctx.fillRect(0, -o.w / 2, o.len * p, o.w); ctx.fillStyle = blink ? '#fff2c0' : '#d8402a'; for (let i = 0; i < o.len; i += 6) { ctx.fillRect(i, -o.w / 2, 3, 1); ctx.fillRect(i, o.w / 2, 3, 1); } }
      ctx.restore();
    }
    // 人物按 y 排序
    const list = foes.map(z => ({ y: z.y, z })); list.push({ y: hero.y, hero: 1 }); list.sort((a, b) => a.y - b.y);
    for (const o of list) {
      if (o.hero) {
        if (hero.inv > 0 && hero.roll <= 0 && Math.floor(G.t * 20) % 2) continue;
        if (hero.roll > 0) { ctx.save(); ctx.globalAlpha = .9; }
        const sw = hero.swing > 0 ? 1 - hero.swing / .22 : -1;
        unit(S_HERO, { ...hero, walk: hero.moving ? hero.walk : 0 }, { front: (x, y) => {
          const hx = hero.x + hero.f * 5, hy = hero.y - 10;
          let a = hero.f > 0 ? .5 : -.5; if (sw >= 0) a = hero.swA + Math.PI / 2 + (-1.6 + sw * 3.2) * (hero.f > 0 ? 1 : -1) * -1; if (hero.spinT > 0) a = G.t * 30;
          drawWeapon(I_SWORD, hx, hy, a);
        } });
        if (hero.roll > 0) ctx.restore();
      } else {
        const z = o.z;
        if (z.boss) {
          const wind = z.st === 'wind', a = wind ? (z.f > 0 ? -1.2 : 1.2) : z.st === 'dash' || z.st === 'jump' ? (z.f > 0 ? 1.4 : -1.4) : (z.f > 0 ? .35 : -.35);
          unit(S_BOSS, z, { front: () => drawWeapon(I_GLAIVE, z.x + z.f * 10, z.y - 14 - (z.z || 0), a) });
          if (wind && Math.floor(z.t * 12) % 2) { ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(S_BOSS.aw[z.f < 0 ? 1 : 0], rd(z.x - S_BOSS.w / 2), rd(z.y - S_BOSS.h)); ctx.globalCompositeOperation = 'source-over'; }
        } else unit(S_SOL, z, { front: () => drawWeapon(z.spear ? I_SPEAR : I_SWORD, z.x + z.f * 4, z.y - 8, (z.f > 0 ? .9 : -.9) + (z.poke > 0 ? z.f * .6 : 0)) });
      }
    }
    // 招式特效（像素刀光：一圈圈像素点组成的弧）
    for (const o of fx) {
      const p = o.t / o.T;
      if (o.k === 'slash') {
        for (let k = 0; k < 3; k++) { const r = o.r - k * 4, w = 1.25; for (let a = -w; a <= w; a += .05) { const t = (a + w) / (2 * w); if (t > p * 1.6) continue; const aa = o.a + a, x = o.x + Math.cos(aa) * r, y = o.y + Math.sin(aa) * r * .7; ctx.fillStyle = k === 0 ? '#ffffff' : k === 1 ? '#fff2b0' : '#f0c04c'; if (p > .6 && (Math.floor(a * 40) % 2)) continue; ctx.fillRect(rd(x), rd(y), k === 0 ? 2 : 1, k === 0 ? 2 : 1); } }
      } else if (o.k === 'spin') {
        const r = o.r * (.5 + p * .6); for (let a = 0; a < Math.PI * 2; a += .06) { if (Math.floor(a * 10 + o.t * 40) % 3 === 0) continue; ctx.fillStyle = (Math.floor(a * 6) % 2) ? '#ffffff' : '#9fe0ff'; ctx.fillRect(rd(o.x + Math.cos(a) * r), rd(o.y + Math.sin(a) * r * .6), 2, 1); }
      } else if (o.k === 'ring') {
        const r = o.r * (.6 + p * .8); for (let a = 0; a < Math.PI * 2; a += .08) { ctx.fillStyle = p < .5 ? '#fff2c0' : '#c8a066'; ctx.fillRect(rd(o.x + Math.cos(a) * r), rd(o.y + Math.sin(a) * r * .55), 2, 2); }
      } else if (o.k === 'puff') {
        const r = 3 + p * 8; ctx.fillStyle = p < .5 ? '#ffffff' : '#e8e0c8'; for (let a = 0; a < Math.PI * 2; a += .5) ctx.fillRect(rd(o.x + Math.cos(a) * r), rd(o.y + Math.sin(a) * r * .7), 2, 2);
      }
    }
    for (const q of parts) { ctx.fillStyle = q.col; const s = q.sz || 1; ctx.fillRect(rd(q.x), rd(q.y), s, s); }
    for (const n of nums) num(n.v, n.x, n.y - n.t * 22, n.col);
    // 首领血条
    const b = foes.find(z => z.boss);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (b) { const bw = Math.min(160, W - 40), bx = rd(W / 2 - bw / 2), by = rd(16 * 10 / SC / 3 + 12); ctx.fillStyle = '#2a160e'; ctx.fillRect(bx - 1, by - 1, bw + 2, 6); ctx.fillStyle = '#5a1a12'; ctx.fillRect(bx, by, bw, 4); ctx.fillStyle = '#d8402a'; ctx.fillRect(bx, by, rd(bw * b.hp / b.maxHp), 4); ctx.fillStyle = '#ff8a6a'; ctx.fillRect(bx, by, rd(bw * b.hp / b.maxHp), 1); }
    hud('boss', b ? '黄巾将 · 程远志' : '');
    // 左上：主角血条、击杀
    ctx.fillStyle = '#2a160e'; ctx.fillRect(3, H - 11, 62, 8); ctx.fillStyle = '#5a1a12'; ctx.fillRect(4, H - 10, 60, 6); ctx.fillStyle = '#e0503a'; ctx.fillRect(4, H - 10, rd(60 * hero.hp / hero.maxHp), 6); ctx.fillStyle = '#ff9a7a'; ctx.fillRect(4, H - 10, rd(60 * hero.hp / hero.maxHp), 1);
    num(hero.hp, 34, H - 9, '#ffffff');
    hud('kill', '斩 ' + G.kills);
    // 旋风斩冷却
    { const x0 = 70, y0 = H - 12, p = Math.max(0, hero.spin) / 4; ctx.fillStyle = '#2a160e'; ctx.fillRect(x0, y0, 10, 10); ctx.fillStyle = p > 0 ? '#5a6a7a' : '#9fe0ff'; ctx.fillRect(x0 + 1, y0 + 1, 8, 8); ctx.fillStyle = '#2a3a4a'; ctx.fillRect(x0 + 1, y0 + 1, 8, rd(8 * p)); }
    hud('ban', G.banner ? G.banner.s : '');
    hud('tip', G.over ? (innerWidth > 700 ? '按 R 或点击重来' : '点一下重来') : G.t < 7 ? (innerWidth > 700 ? 'WASD 移动 · 空格翻滚 · 自动出招' : '左边拖动移动 · 右边点一下翻滚 · 自动出招') : '');
    // 摇杆
    if (joy.on) { const s = SC; ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.beginPath(); ctx.arc(rd(joy.sx / s), rd(joy.sy / s), 14, 0, 7); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.45)'; const jx = joy.x - joy.sx, jy = joy.y - joy.sy, d = Math.hypot(jx, jy), k = Math.min(1, 40 / (d || 1)); ctx.beginPath(); ctx.arc(rd((joy.sx + jx * k) / s), rd((joy.sy + jy * k) / s), 6, 0, 7); ctx.fill(); }
  }
  const HUD = {}; function hud(id, v) { if (HUD[id] === v) return; HUD[id] = v; const e = document.getElementById(id); e.textContent = v; e.style.display = v ? '' : 'none'; }
  fit(); start(); requestAnimationFrame(frame);
  window.__G = () => ({ G, hero, foes });
})();
