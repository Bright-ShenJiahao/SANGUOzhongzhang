// 路线试玩机器人（用户定 11/10：只在 GitHub Actions 上跑）：node tools/routebot/bot.cjs <分钟> <输出目录>
// 自动：开局 → 长卷选路 → 战斗中走位躲怪（招式自动放）→ 选奖励/营地/奇遇 → 死了或通关就重开一局。记录每个节点、血量、耗时、报错。
const { chromium } = require('playwright'), fs = require('fs');
const MIN = +(process.argv[2] || 20), OUT = process.argv[3] || 'botreport', EXE = process.env.PW_EXE || undefined;
fs.mkdirSync(OUT, { recursive: true });
const BOT = () => {
  window.BOT = { log: [], t0: Date.now(), node: null, nodeT: 0, last: Date.now(), dead: false, won: false };
  const say = s => { BOT.log.push(Math.round((Date.now() - BOT.t0) / 1000) + 's ' + s); BOT.last = Date.now(); };
  let home = null, rollCd = 0;
  setInterval(() => { try {
    if (BOT.dead || BOT.won) return;
    if (over) { const hp = SURV.routeHp(); say('死亡 于 ' + (BOT.node ? ROUTE.name(BOT.node) + ' 第' + BOT.node.layer + '层' : '?') + ' 本节点 ' + Math.round((Date.now() - BOT.nodeT) / 1000) + 's'); BOT.dead = true; return; }
    if (won) { say('通关！'); BOT.won = true; return; }
    const vis = el => !!el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== "hidden";
    const sp = document.getElementById('survPick');
    if (vis(sp)) { const bs = [...sp.querySelectorAll('button')].filter(vis); if (bs.length) { const b = bs[Math.floor(Math.random() * bs.length)]; say('  奖励：' + b.textContent.replace(/\s+/g, ' ').slice(0, 30)); b.click(); } return; }
    const rm = document.getElementById('routeMap');
    if (ROUTE.shown() && rm && rm.style.display !== 'none') {
      for (const k of ['KeyA', 'KeyD', 'KeyW', 'KeyS']) key[k] = 0;
      const bs = [...rm.querySelectorAll('button')].filter(b => vis(b) && b.textContent !== '退出');
      if (bs.length) { const b = bs[0]; say('  弹窗选：' + b.textContent.replace(/\s+/g, ' ').slice(0, 30)); b.click(); return; }
      const r = ROUTE.debug(); if (r && r.cur.next.length) {
        if (BOT.node) { const [h, m] = SURV.routeHp(); say('  完成，用时 ' + Math.round((Date.now() - BOT.nodeT) / 1000) + 's，血 ' + Math.round(h * 10) + '/' + Math.round(m * 10) + '，招式 ' + SURV.slots.filter(Boolean).join(',')); }
        const n = r.cur.next[Math.floor(Math.random() * r.cur.next.length)]; BOT.node = n; BOT.nodeT = Date.now(); home = null;
        say('进入 第' + n.layer + '层 ' + ROUTE.name(n) + '（' + n.type + '）'); ROUTE.choose(n);
      }
      return;
    }
    if (!hero || hero.hp <= 0) return;
    if (!home) home = { x: hero.x, y: hero.y };
    let vx = (home.x - hero.x) * .004, vy = (home.y - hero.y) * .006, near = 1e9;
    for (const z of zs || []) { if (z.dead || z.hp <= 0) continue; const dx = hero.x - z.x, dy = hero.y - z.y, d = Math.hypot(dx, dy) || 1; near = Math.min(near, d); if (d < 260) { vx += dx / d * (260 - d) / 260; vy += dy / d * (260 - d) / 260 * 1.4; } }
    key.KeyD = vx > .15 ? 1 : 0; key.KeyA = vx < -.15 ? 1 : 0; key.KeyS = vy > .15 ? 1 : 0; key.KeyW = vy < -.15 ? 1 : 0;
    if (near < 45 && Date.now() > rollCd) { pressRoll = true; rollCd = Date.now() + 1200; }
  } catch (e) { BOT.err = e.message; } }, 120);
};
(async () => {
  const b = await chromium.launch(EXE ? { executablePath: EXE } : {}), errs = [], lines = [], T_END = Date.now() + MIN * 60e3;
  let run = 0, shot = 0;
  while (Date.now() < T_END) {
    run++; lines.push('', '===== 第 ' + run + ' 局 =====');
    const vp = run % 2 ? { width: 1280, height: 720 } : { width: 390, height: 844 };   // 单数局电脑，双数局手机竖屏
    lines.push('屏幕 ' + vp.width + 'x' + vp.height);
    const p = await b.newPage({ viewport: vp, hasTouch: vp.width < 600 });
    p.on('pageerror', e => errs.push('第' + run + '局: ' + e.message));
    await p.goto('http://localhost:8765/index.html?debug&route'); await p.waitForTimeout(3000);
    await p.fill('#tName', 'bot'); await p.click('#tStart'); await p.waitForTimeout(2500);
    await p.evaluate(() => { const o = ['农', '卒', '猎', '书'][Math.floor(Math.random() * 4)]; [...document.querySelectorAll('button')].find(b => b.textContent === o).click(); }).catch(() => {});
    await p.waitForTimeout(500); await p.click('text=出 发').catch(e => errs.push('出发按钮: ' + e.message)); await p.waitForTimeout(2500);
    await p.evaluate(BOT);
    let seen = 0, lastShot = Date.now();
    while (Date.now() < T_END) {
      await p.waitForTimeout(3000);
      const st = await p.evaluate(() => ({ log: BOT.log, dead: BOT.dead, won: BOT.won, idle: Date.now() - BOT.last, err: BOT.err })).catch(e => ({ log: [], dead: true, err: e.message }));
      lines.push(...st.log.slice(seen)); seen = st.log.length;
      if (st.err) { errs.push('机器人: ' + st.err); }
      if (Date.now() - lastShot > 120e3 && shot < 12) { lastShot = Date.now(); await p.screenshot({ path: `${OUT}/shot${String(++shot).padStart(2, '0')}_局${run}.png` }); }
      if (st.dead || st.won) { await p.screenshot({ path: `${OUT}/end_局${run}.png` }); break; }
      if (st.idle > 150e3) { lines.push('!! 卡住 150 秒没进展'); await p.screenshot({ path: `${OUT}/stuck_局${run}.png` }); break; }
    }
    await p.close();
  }
  await b.close();
  const rep = ['路线试玩报告　' + new Date().toISOString(), '时长 ' + MIN + ' 分钟，共 ' + run + ' 局', '', '报错（' + errs.length + '）：', ...[...new Set(errs)].slice(0, 40), ...lines].join('\n');
  fs.writeFileSync(OUT + '/report.txt', rep); console.log(rep);
})();
