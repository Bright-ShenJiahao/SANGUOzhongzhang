// 11/13 武学试炼（开发者模式）：进一场不会结束的战斗，主角无敌，点哪招就只放哪招，一招一招看；心法、轻功点一下就装上
(() => {
  const FRZ = { idle: '待机', walk1: '走路 1', walk2: '走路 2', walk3: '走路 3', roll1: '翻滚 1', roll2: '翻滚 2', roll3: '翻滚 3', roll4: '翻滚 4', hurt: '受击', down: '倒地', chop1: '劈·起手', chop2: '劈·出手', sweep1: '横扫·起手', sweep2: '横扫·出手', thrust1: '刺·起手', thrust2: '刺·出手', spin1: '转·起手', spin2: '转·出手', up1: '挑·起手', up2: '挑·出手' };   // 11/18 用户：动作帧显示中文
  const MOTN = { chop: '劈', sweep: '横扫', thrust: '刺', spin: '转', up: '挑' };
  const ORDER = [0, 2, 3, 4, 12, 7, 5, 6, 8, 9, 1, 10, 11];   // 刀 锤 枪 关刀 长戟 石子 弓 弩 黄符 羽扇 剑 拳 腿
  const TC = ['#c9b27a', '#c9b27a', '#6fb8ff', '#c58cff', '#ffb347'];
  let box = null, tab = 0, sel = null, godT = 0, rng = true, rngT = 0, show = 0, ng = 0, mini = false, dum = 'row', brk = 0, sol = 0, arena = false;   // 11/18 木人桩：'' 关 / one 单个 / row 一排 / ring 一圈
  const DUMN = { '': '关', one: '单个', row: '一排', ring: '一圈' }, DUMO = ['', 'one', 'row', 'ring'];   // 11/16 用户：试炼里常驻弓手、投石手（看乾坤屏挡箭等）
  const T = () => window.SURV && SURV.trial;
  const css = `#szzTrial{position:fixed;z-index:10040;left:8px;top:56px;width:min(330px,46vw);max-height:calc(100vh - 70px);display:flex;flex-direction:column;background:rgba(14,10,7,.93);border:1px solid #8a6a3a;color:#efe2c4;font-size:13px;box-shadow:0 6px 20px rgba(0,0,0,.6)}
#szzTrial .hd{display:flex;align-items:center;justify-content:space-between;padding:6px 8px;border-bottom:1px solid rgba(184,149,90,.35);color:#ffd86e}
@media (max-height:520px){#szzBoss{top:44px!important;max-height:calc(100vh - 52px)!important;width:250px!important;font-size:11px!important;-webkit-overflow-scrolling:touch}#szzBoss button{padding:1px 5px!important}}
#szzBoss{position:fixed;left:8px;top:100px;z-index:10041;max-height:calc(100vh - 110px);overflow:auto;width:300px;max-width:calc(100vw - 16px);background:rgba(24,16,10,.94);border:1px solid #8a6a3a;color:#ead9b6;font:13px/1.5 sans-serif;padding:6px 8px;border-radius:6px}#szzBoss .hd{display:flex;justify-content:space-between;align-items:center;color:#ffe08a;font-weight:700;margin-bottom:4px}#szzBoss button{background:#3a2a1a;border:1px solid #8a6a3a;color:#e6c98a;border-radius:4px;padding:2px 8px;cursor:pointer}#szzBoss .mv{display:flex;gap:4px;flex-wrap:wrap;margin:4px 0}#szzBoss .mv button.on{background:#7a5a2a;color:#fff}#szzBoss .ds{opacity:.75;font-size:12px;margin:3px 0}#szzBoss .row{display:flex;align-items:center;gap:6px;margin:3px 0}#szzBoss .row span{width:34px}#szzBoss .row input{flex:1}#szzBoss select{flex:1;background:#2a1d12;color:#ead9b6;border:1px solid #8a6a3a}#szzBoss .cp{margin-top:6px;width:100%}#szzBoss .fxr{margin-top:6px;display:flex;flex-wrap:wrap;gap:4px}#szzBossKeys{position:fixed;right:14px;bottom:110px;z-index:10041;display:flex;gap:8px}#szzBossKeys button{width:74px;height:74px;border-radius:50%;background:rgba(60,36,18,.88);border:2px solid #c9a35a;color:#ffe9b0;font:700 14px/1.2 sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;touch-action:none}#szzBossKeys small{opacity:.6;font-size:11px}@media (max-height:500px){#szzBoss{top:56px;font-size:12px;line-height:1.35;width:270px}#szzBossKeys{bottom:90px}#szzBossKeys button{width:60px;height:60px;font-size:12px}}@media (max-width:560px){#szzBoss{top:auto;bottom:8px;right:8px;left:8px;width:auto}}
#szzTrial .dms{display:flex;align-items:center;justify-content:space-between;gap:6px;padding:4px 8px;background:#2a1d12;color:#ffe08a;font-size:12px;border-bottom:1px solid rgba(184,149,90,.35)}#szzTrial .dms button{background:none;border:1px solid #8a6a3a;color:#e6c98a;cursor:pointer;padding:0 6px}
#szzTrial .hd button{background:none;border:1px solid #8a6a3a;color:#e6c98a;cursor:pointer;padding:1px 8px}
#szzTrial .tabs{display:flex;flex-wrap:wrap;gap:3px;padding:6px}
#szzTrial .tabs button{flex:1 0 17%;padding:4px 0;background:#2a1d12;border:1px solid #5a4226;color:#e9cf98;cursor:pointer}
#szzTrial .tabs button.on{border-color:#ffd86e;color:#fff2c8;background:#4a3218}
#szzTrial .ls{flex:1 1 auto;min-height:90px;overflow:auto;padding:0 6px 6px;display:grid;grid-template-columns:1fr 1fr;gap:4px;align-content:start}
#szzTrial .ls button{text-align:left;padding:5px 6px;background:#1c140d;border:1px solid #3a2a18;color:#efe2c4;cursor:pointer;line-height:1.25}
#szzTrial .ls button.on{border-color:#ffd86e;background:#3a2814}
#szzTrial .ls small{display:block;opacity:.65;font-size:11px}
#szzTrial .dt{border-top:1px solid rgba(184,149,90,.35);padding:7px 9px;line-height:1.55;min-height:64px;overflow:auto;flex:0 1 auto}
#szzTrial .dt b{color:#ffe08a}
#szzTrial .sl{display:flex;align-items:center;gap:6px;margin-top:5px}#szzTrial .sl input{flex:1;accent-color:#ffd86e}#szzTrial .sl b{min-width:44px;color:#ffe08a}
#szzTrial .ps select{background:#1c140d;color:#efe2c4;border:1px solid #3a2a18;font-size:12px;padding:1px 4px}#szzTrial .ps label{font-size:12px;display:flex;align-items:center;gap:3px;cursor:pointer}
#szzTrial .lvr{margin-top:5px;display:flex;gap:4px;flex-wrap:wrap}#szzTrial .lvr button{padding:2px 7px;font-size:12px;background:#1c140d;border:1px solid #3a2a18;color:#efe2c4;cursor:pointer}#szzTrial .lvr button.on{border-color:#ffd86e;background:#3a2814}
@media (max-height:560px){#szzTrial{top:40px;max-height:calc(100vh - 48px);overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;font-size:12px}#szzTrial .ls{flex:none;overflow:visible;min-height:0}#szzTrial .dt{overflow:visible}}
#szzTrial::-webkit-scrollbar,#szzBoss::-webkit-scrollbar,#szzTrial .ls::-webkit-scrollbar{width:12px}#szzTrial::-webkit-scrollbar-thumb,#szzBoss::-webkit-scrollbar-thumb,#szzTrial .ls::-webkit-scrollbar-thumb{background:#b8955a;border-radius:6px;border:2px solid #1c140d}#szzTrial::-webkit-scrollbar-track,#szzBoss::-webkit-scrollbar-track,#szzTrial .ls::-webkit-scrollbar-track{background:#2a1d12}
#szzTrial,#szzBoss{scrollbar-color:#b8955a #2a1d12}
@media (max-aspect-ratio:1/1){#szzTrial{left:0;right:0;top:auto;bottom:0;width:auto;max-height:46vh}#szzTrial .ls{grid-template-columns:1fr 1fr 1fr}}`;
  // 11/19 用户：手机上面板太长看不全——两个面板旁边各加一条看得见、能拖的滑条
  function sbar(id, onLeft) {
    const b = document.createElement('div'); b.id = id + 'Bar'; b.style.cssText = 'position:fixed;z-index:10045;width:16px;background:#2a1d12;border:1px solid #8a6a3a;border-radius:8px;display:none;touch-action:none';
    const th = document.createElement('div'); th.style.cssText = 'position:absolute;left:1px;right:1px;background:#d8b46a;border-radius:7px;min-height:24px'; b.appendChild(th); document.body.appendChild(b);
    let drag = null;
    const tgt = () => document.getElementById(id);
    b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); b.setPointerCapture(e.pointerId); drag = 1; mv(e); });
    b.addEventListener('pointermove', e => { if (drag) mv(e); });
    b.addEventListener('pointerup', () => drag = null); b.addEventListener('pointercancel', () => drag = null);
    function mv(e) { const el = tgt(); if (!el) return; const r = b.getBoundingClientRect(), q = Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)); el.scrollTop = q * (el.scrollHeight - el.clientHeight); }
    (function loop() {
      const el = tgt();
      if (!el || !el.isConnected || getComputedStyle(el).display === 'none' || el.scrollHeight <= el.clientHeight + 2) b.style.display = 'none';
      else { const r = el.getBoundingClientRect(); b.style.display = 'block'; b.style.left = (onLeft ? Math.max(0, r.left - 19) : Math.min(innerWidth - 18, r.right + 2)) + 'px'; b.style.top = r.top + 'px'; b.style.height = r.height + 'px';
        const h = r.height, t = Math.max(24, h * el.clientHeight / el.scrollHeight); th.style.height = t + 'px'; th.style.top = ((h - t) * el.scrollTop / (el.scrollHeight - el.clientHeight)) + 'px'; }
      requestAnimationFrame(loop);
    })();
  }
  setTimeout(() => { sbar('szzTrial'); sbar('szzBoss'); sbar('dbg', 1); }, 0);

  // 11/18 用户：新画风（写实比例）的黄巾棍兵——演武场里打打看。图在 art/sprites/grunt_new/，帧尺寸按旧喽啰的精灵像素换算（站立高 85）
  const GN = {"idle": [44.1, 95.0, 23.9, 94.3], "walk1": [59.1, 93.8, 29.2, 93.1], "walk2": [58.6, 94.0, 27.7, 93.4], "wind": [60.1, 103.6, 30.7, 103.0], "strike": [102.7, 75.4, 49.1, 74.9], "hurt": [89.5, 91.8, 55.5, 91.2], "down": [101.4, 33.3, 52.4, 32.6], "fly1": [96.9, 77.1, 69.4, 76.4], "fly2": [76.4, 88.6, 53.3, 88.0], "land": [103.0, 48.6, 49.0, 47.9]};
  const CYN = {"idle": [107.9, 150.0, 59.9, 148.0], "walk1": [141.4, 127.0, 73.0, 125.0], "walk2": [138.8, 127.0, 71.7, 125.0], "walk3": [137.5, 126.3, 71.7, 124.3], "walk4": [134.9, 125.0, 69.7, 123.0], "wind": [143.4, 149.3, 79.6, 147.4], "strike": [160.5, 117.8, 59.9, 115.8], "throw1": [148.7, 121.1, 78.9, 119.1], "throw2": [136.2, 123.0, 46.7, 121.1], "bare": [119.1, 121.7, 55.9, 119.7], "catch": [121.1, 151.3, 58.6, 149.3], "sweep1": [155.9, 121.7, 92.8, 119.7], "sweep2": [159.9, 109.9, 63.8, 107.9], "sweep3": [168.4, 106.6, 71.7, 104.6], "hurt": [154.6, 112.5, 73.0, 110.5], "blade": [155.9, 28.3, 88.2, 26.3], "down": [156.6, 69.1, 79.6, 67.1], "fly1": [152.0, 119.7, 73.7, 117.8], "fly2": [134.2, 125.0, 65.1, 123.0], "land": [119.7, 149.3, 71.7, 147.4]};   // 11/18 新画风程远志（写实比例，站立 150）
  function regNewGrunt() {
    if (typeof CH === 'undefined') return; if (!CH.cheng_new) { CH.cheng_new = {}; for (const [f, [w, h, ax, ay]] of Object.entries(CYN)) { const img = new Image(), fr = { img, w, h, ax, ay, white: null, dark: null }; img.onload = () => { const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight; const g = c.getContext('2d'); g.drawImage(img, 0, 0); g.globalCompositeOperation = 'source-atop'; g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); fr.white = c; }; img.src = 'art/sprites/cheng_new/' + f + '.png'; CH.cheng_new[f] = fr; } }
    if (BPX) setTimeout(() => bpx(true), 800);
    if (CH.grunt_new) return;
    CH.grunt_new = {};
    for (const [f, [w, h, ax, ay]] of Object.entries(GN)) { const img = new Image(), fr = { img, w, h, ax, ay, white: null, dark: null, skin: 0 };
      img.onload = () => { const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight; const g = c.getContext('2d'); g.drawImage(img, 0, 0); g.globalCompositeOperation = 'source-atop'; g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); fr.white = c; };
      img.src = 'art/sprites/grunt_new/s_' + f + '.png'; CH.grunt_new[f] = fr; }
  }


  // 11/18 用户：特效风格（写实/群侠）、地面压灰、纸片燃尽、首领像素化——两个试炼里都能切
  let BPX = false; try { BPX = localStorage.getItem('szz-bpx') === '1'; } catch (e) {}
  function bpx(on) {   // 首领像素化：降到和小兵一样的密度（1 像素 = 1 世界单位），放大不平滑，外描一圈深色
    BPX = !!on; try { localStorage.setItem('szz-bpx', on ? '1' : '0'); } catch (e) {}
    if (typeof CH === 'undefined' || !CH.cheng_new) return;
    for (const fr of Object.values(CH.cheng_new)) {
      if (!fr.img0) fr.img0 = fr.img;
      if (!on) { fr.img = fr.img0; fr.skin = 0; continue; }
      if (fr.px) { fr.img = fr.px; fr.skin = 1; continue; }
      const im = fr.img0; if (!(im.complete && im.naturalWidth)) continue;
      const W = Math.max(2, Math.round(fr.w)), H = Math.max(2, Math.round(fr.h)), c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
      x.imageSmoothingQuality = 'high'; x.drawImage(im, 0, 0, W, H); const d = x.getImageData(0, 0, W, H), a = d.data, solid = new Uint8Array(W * H);
      for (let i = 0; i < W * H; i++) { const al = a[i * 4 + 3]; solid[i] = al >= 110 ? 1 : 0; if (solid[i]) { a[i * 4 + 3] = 255; for (let k = 0; k < 3; k++) a[i * 4 + k] = Math.round(a[i * 4 + k] / 12) * 12; } else if (al < 40) a[i * 4 + 3] = 0; }
      for (let y = 0; y < H; y++) for (let X = 0; X < W; X++) { const i = y * W + X; if (solid[i] || a[i * 4 + 3] > 0) continue; if ((X > 0 && solid[i - 1]) || (X < W - 1 && solid[i + 1]) || (y > 0 && solid[i - W]) || (y < H - 1 && solid[i + W])) { a[i * 4] = 32; a[i * 4 + 1] = 20; a[i * 4 + 2] = 14; a[i * 4 + 3] = 255; } }
      x.putImageData(d, 0, 0); c.complete = true; c.naturalWidth = W; c.naturalHeight = H; c.src = 'px'; fr.px = c; fr.img = c; fr.skin = 1;
    }
  }
  // 11/18 用户：首领试炼——照武学试炼的样子调首领的每一招（起手/出手帧、范围、速度），复制发 Claude
  const BFR = { idle: '站立', walk1: '走路①', walk2: '走路②', walk3: '走路③', walk4: '走路④', wind: '举刀', strike: '劈下', throw1: '掷刀起手', throw2: '掷出', bare: '空手', catch: '接刀', sweep1: '横扫起手', sweep2: '转身横扫', sweep3: '横扫收势', hurt: '受击', down: '倒地', fly1: '被打飞①', fly2: '被打飞②', land: '落地' };
  const BMV = [['atk', '普攻', '身前 110° 扇形一刀（范围＝刀够多远，速度＝举刀多久）'], ['boomerang', '大刀回旋', '掷出大刀飞出再飞回，刀没回来前空手，收手＝接刀那一下（范围＝飞多远，速度＝预警多久）'], ['sweep', '横扫千军', '身周一圈横扫（范围＝圈多大，速度＝蓄力多久）'], ['chase', '掷刀追身', '大刀掷出插在远处地上，人冲到刀边拔刀砸地（范围＝掷多远，速度＝起手多久）；出手帧也用在冲刺途中']];
  let bbox = null, bsel = 'atk', bmini = false;
  function bossPanel(on) {
    if (!on) { if (bbox) bbox.remove(); bbox = null; const k = document.getElementById('szzBossKeys'); if (k) k.remove(); try { T().bossTr(false); T().pilot(false); } catch (e) {} if (box) render(); return; }
    regNewGrunt(); if (BPX) setTimeout(() => bpx(true), 600); try { T().pilot(true); } catch (e) { console.error(e); }
    mini = true; if (box) render();
    if (!bbox) { bbox = document.createElement('div'); bbox.id = 'szzBoss'; document.body.appendChild(bbox);
      const k = document.createElement('div'); k.id = 'szzBossKeys'; document.body.appendChild(k); }
    bkeys();
    brender();
  }
  // 11/19 首领重做：试炼里叫出新画风首领，点招式名让它马上放那一招
  const NBS = [['deng_mao', '邓茂'], ['bo_cai', '波才'], ['he_yi', '何仪'], ['zhang_mancheng', '张曼成'], ['guanhai_m', '管亥·骑马'], ['guanhai_b', '管亥·步战'], ['zhang_liang', '张梁'], ['zhang_bao', '张宝'], ['ma_yuanyi', '马元义'], ['zhang_jiao', '张角']];
  const NMN = { dm_dash: '九环冲斩', dm_rings: '掷环', dm_quake: '震地三刀', bc_spin: '旋斧突进', bc_arrows: '令旗箭雨', bc_fire: '火烧草营', hy_dash3: '三连闪突', hy_ji: '飞戟', hy_spin: '旋身双戟', zm_glide: '神行符', zm_fu: '火符', zm_ring: '符阵火环',
    gm_charge: '纵马冲阵', gm_ji: '马上掷戟', gm_rear: '人立马踏', gb_leap: '跃斩', gb_throw: '掷戟', gb_spin: '旋戟', zl_whirl: '双刀旋风', zl_cross: '十字刀气', zl_charge: '人公冲锋', zb_burrow: '地遁', zb_rain: '火雨', zb_wall: '土墙', my_claw: '飞爪', my_flail: '流星直击', my_spin: '旋锤', zj_blink: '符遁', zj_fu: '雷符', zj_storm: '天雷', zj_ht: '黄天当立' };
  let nbSel = '';
  function nbHtml() {
    const t = T(), mv = nbSel ? ((t.nmoves()[nbSel] || []).concat(nbSel === 'guanhai_m' ? t.nmoves().guanhai_b : []).concat(nbSel === 'zhang_jiao' ? ['zj_ht'] : [])) : [];
    return `<div class="ds" style="margin-top:6px;border-top:1px solid #5a4226;padding-top:4px">换成操控别的首领（右下角按钮 / J K L I U 出招）：</div><div class="mv"><button data-pl="cheng_yuanzhi" class="${T().pilotType() === 'cheng_yuanzhi' ? 'on' : ''}">程远志</button>${NBS.map(([k, n]) => `<button data-pl="${k}" class="${k === T().pilotType() ? 'on' : ''}">${n}</button>`).join('')}</div>
      <div class="ds" style="margin-top:6px;border-top:1px solid #5a4226;padding-top:4px">或者叫一个首领出来打你（主角无敌，AI 自己出招）：</div><div class="mv">${NBS.map(([k, n]) => `<button data-nb="${k}" class="${k === nbSel ? 'on' : ''}">${n}</button>`).join('')}</div>${mv.length ? `<div class="mv">${mv.map(m => `<button data-nm="${m}">${NMN[m] || m}</button>`).join('')}</div><div class="ds">点招式名＝马上放这一招；不点就按顺序自己放。管亥打到半血落马换步战。</div>` : ''}`;
  }
  function nbBind() {
    bbox.querySelectorAll('[data-nb]').forEach(b => b.onclick = () => { nbSel = b.dataset.nb; T().spawnNew(nbSel); const k = document.getElementById('szzBossKeys'); if (k) k.innerHTML = ''; brender(); });
    bindCute();
    const ts = bbox.querySelector('.tshow'); if (ts) ts.onclick = () => { show = show ? 0 : 1; try { T().showcase(show); } catch (e) {} brender(); };
    bbox.querySelectorAll('[data-pl]').forEach(b => b.onclick = () => { nbSel = ''; T().pilotAs(b.dataset.pl); setTimeout(() => { bkeys(); brender(); }, 400); });
    bbox.querySelectorAll('[data-nm]').forEach(b => b.onclick = () => T().forceMove(b.dataset.nm));
  }
  function bkeys() {   // 右下角出招键：跟着当前操控的首领换
    const k = document.getElementById('szzBossKeys'); if (!k) return; const ms = T().pilotMoves();
    k.innerHTML = ms.map((m, i) => `<button data-c="${m}">${m === 'atk' ? '普攻' : NMN[m] || (BMV.find(x => x[0] === m) || [0, m])[1]}<small>${'JKLIU'[i] || ''}</small></button>`).join('');
    k.querySelectorAll('[data-c]').forEach(b => b.onpointerdown = e => { e.preventDefault(); e.stopPropagation(); T().pilotCast(b.dataset.c); });
  }
  const isCh = () => T().pilotType() === 'cheng_yuanzhi', pName = () => isCh() ? '程远志' : ((NBS.find(x => x[0] === T().pilotType()) || [0, ''])[1]);
  // 11/19 新画风首领的帧中文名（调起手/出手/收手用）
  const FRN = { idle: '站立', walk1: '走路①', walk2: '走路②', walk3: '走路③', walk4: '走路④', run1: '奔跑①', run2: '奔跑②', run3: '奔跑③', run4: '奔跑④', wind: '普攻起手', strike: '普攻出手', hurt: '受击', down: '倒地', fly1: '被打飞①', fly2: '被打飞②', land: '起身', fall: '落马', horse: '空马', roar: '怒吼',
    dash1: '冲·起步', dash2: '冲·疾冲', dash3: '冲·急停', upcut: '上撩', ring1: '掷环·起手', ring2: '掷环·出手', quake1: '举刀', quake2: '劈地', quake3: '拔刀', spin0: '旋·起手', spin1: '旋①', spin2: '旋②', spin3: '旋③', dizzy: '头晕', flag1: '拔旗', flag2: '挥旗', flag3: '收旗', torch: '点火',
    throw1: '掷·起手', throw2: '掷·出手', catch: '接戟', cross: '交叉重斩', talis: '拍符', glide: '滑行', stop: '急停', plant1: '举剑', plant2: '插剑', chant: '念咒', rest: '喘息', charge1: '冲·蓄势', charge2: '冲·狂奔', charge3: '冲·收势', rear: '人立', stomp: '马踏',
    leap1: '跃·蓄力', leap2: '跃·腾空', leap3: '跃·落劈', run: '空手冲', pull: '拔戟/收锤', cross1: '十字·起手', cross2: '十字·出手', sink1: '下沉', sink2: '半身', rise: '破土', call1: '指天', call2: '挥下', seal: '结印', swing: '剑挥', sleeve: '拂袖',
    flail1: '抡锤', flail2: '直击', claw1: '飞爪·甩', claw2: '被拉飞', claw3: '落地', vanish: '化符', appear: '现身', talis1: '雷符·起手', talis2: '雷符·出手', raise: '举杖', stab: '杖戳地', read: '念经', float: '浮空' };
  function bindCute() {
    const tc = bbox.querySelector('.tcute'); if (tc) tc.onclick = () => { const t = T(); t.cute(1); const b = [...document.querySelectorAll('#dbg button')].find(b => b.textContent.includes('Q像素')); if (b) b.textContent = 'Q像素版：开';
      t.pilotAs('cheng_yuanzhi'); setTimeout(() => { try { t.pilot(false); } catch (e) {} nbSel = 'zhang_jiao'; t.spawnNew('zhang_jiao'); t.soldiers(1, 1); for (let i = 0; i < 6; i++) { const z = t.spawn('grunt'); if (z) { z.x = hero.x + 60 + (i % 3) * 45; z.y = hero.y - 40 + (i >> 1) * 28; } } t.soldiers(0, 1); const k = document.getElementById('szzBossKeys'); if (k) k.innerHTML = ''; brender(); }, 500); };   // 11/19 用户：Q版张角和Q版小兵放一起看
  }
  function brender() {
    const t = T(), ty = t.pilotType(), ch = isCh();
    const mvs = ch ? BMV : t.pilotMoves().map(m => [m, m === 'atk' ? '普攻' : NMN[m] || m, m === 'atk' ? '身前扇形一下（范围＝打多远，速度＝起手多久）' : '范围＝预警圈/线多大、飞多远；速度＝预警和动作多久（越大越慢）']);
    if (!mvs.find(m => m[0] === bsel)) bsel = mvs[0][0];
    const C = t.bossCfg(bsel, ty), FR = ch ? BFR : Object.fromEntries(t.frameNames(ty).map(k => [k, FRN[k] || k])), cur = mvs.find(m => m[0] === bsel);
    const op = v => Object.entries(FR).map(([k, n]) => `<option value="${k}"${k === v ? ' selected' : ''}>${n}</option>`).join('');
    const opd = v => `<option value=""${v ? '' : ' selected'}>${ch ? '无' : '默认'}</option>` + op(v);
    bbox.innerHTML = `<div class="hd"><span>首领试炼 · ${pName()}</span><span><button class="bfx" style="border-color:#7ad0ff;color:#bfe6ff">特效调试</button> <button class="bm">${bmini ? '展开' : '缩小'}</button> <button class="bx">${bossMode ? '退出' : '关闭'}</button></span></div>${bmini ? '' : `
      <div class="mv">${mvs.map(([k, n]) => `<button data-m="${k}" class="${k === bsel ? 'on' : ''}">${n}</button>`).join('')}</div>
      <div class="ds">你就是${pName()}：移动照常，右下角按钮或 J K L I U 出招，招式打士兵和木人。正在调：${cur[1]}——${cur[2]}</div>
      <div class="row"><span>起手</span><select data-f="a">${ch ? op(C.a) : opd(C.a)}</select></div>
      <div class="row"><span>出手</span><select data-f="b">${ch ? op(C.b) : opd(C.b)}</select></div>
      <div class="row"><span>收手</span><select data-f="c">${opd(C.c)}</select></div>
      <div class="row"><span>范围</span><input type="range" min="0.4" max="2.5" step="0.05" value="${C.rs}" data-r="rs"><b>×${(+C.rs).toFixed(2)}</b></div>
      <div class="row"><span>速度</span><input type="range" min="0.4" max="2.5" step="0.05" value="${C.sp}" data-r="sp"><b>×${(+C.sp).toFixed(2)}</b></div>
      <div class="ds">速度越大越慢（预警、蓄力越久）。${ch ? '' : '起手/出手选「默认」＝用这招原本的动作帧。'}</div>
      <button class="cp">复制首领设置（全部首领）</button>${nbHtml()}`}`;
    bbox.querySelector('.bm').onclick = () => { bmini = !bmini; brender(); };
    bbox.querySelector('.bfx').onclick = () => { if (innerHeight > innerWidth && !bmini) { bmini = true; brender(); } fxPanel(nbSel || (t.pilotType() !== 'cheng_yuanzhi' ? t.pilotType() : 'deng_mao')); };
    bbox.querySelector('.bx').onclick = () => bossMode ? close() : bossPanel(false);
    bindCute(); if (bmini) return;
    bbox.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { bsel = b.dataset.m; brender(); });
    bbox.querySelectorAll('[data-f]').forEach(e => e.onchange = () => { t.setBossCfg(bsel, { [e.dataset.f]: e.value }, ty); });
    bbox.querySelectorAll('[data-r]').forEach(e => e.oninput = () => { const v = Math.round(+e.value * 100) / 100; t.setBossCfg(bsel, { [e.dataset.r]: v }, ty); e.nextElementSibling.textContent = '×' + v.toFixed(2); });
    nbBind();
    bbox.querySelector('.cp').onclick = () => { const txt = '首领设置：' + t.bossCopy(); try { navigator.clipboard.writeText(txt); } catch (e) {} bbox.querySelector('.cp').textContent = '已复制'; };
  }
  // 11/20 用户：首领、小兵的出手特效也要能调（像主角那样）——选人、选招，调图/颜色/大小/位置/角度/时长，点「放这招」马上看；复制发 Claude 写死
  const FXIMG = [['auto', '默认'], ['none', '不要特效'], ['dg1', '月牙①'], ['dg2', '月牙·扁'], ['dg3', '月牙·竖'], ['dg4', '大月牙'], ['dg5', 'S形刀光'], ['dg6', '细刀光'], ['dh2', '刀光·横'], ['dd_xuehe', '血河刀光'], ['dd_feilun', '飞轮'], ['dd_liedi', '裂地'], ['dt_tianbeng', '天崩'], ['dt_wanren', '旋涡'], ['fx_lun', '旋风'], ['fx_ring', '光环'], ['fx_he', '光带']];
  const SOLN = { grunt: '棍兵', blade: '刀手', slinger: '投石手', archer: '弓手', elite: '老卒', priest: '方士', 'yellow-heavy': '大刀兵', 'yellow-shield': '盾兵', 'yellow-spear': '枪兵', 'yellow-golem': '力士', 'fire-jar': '火罐手', cavalry: '骑兵', fanatic: '狂信徒', crossbow: '弩手' };
  const FXB = [['cheng_yuanzhi', '程远志'], ['zhang_fei', '张飞']].concat(NBS);
  let fxT = '', fxM = 'any', fxBox = null;
  const hex = rgb => '#' + rgb.split(',').map(v => (+v).toString(16).padStart(2, '0')).join('');
  const rgbOf = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)).join(',');
  function fxPanel(tk) {
    if (tk) fxT = tk; if (!fxT) fxT = 'deng_mao';
    if (!fxBox) { fxBox = document.createElement('div'); fxBox.id = 'szzFx'; document.body.appendChild(fxBox); sbar('szzFx', 1);
      const st = document.createElement('style'); st.textContent = `#szzFx{position:fixed;right:8px;top:60px;z-index:10046;width:300px;max-width:calc(100vw - 16px);max-height:calc(100vh - 70px);overflow:auto;background:rgba(14,22,30,.95);border:1px solid #4a7a9a;color:#dbe8f2;font:13px/1.5 sans-serif;padding:6px 8px;border-radius:6px;scrollbar-color:#7ab0d0 #12202a}
#szzFx .hd{display:flex;justify-content:space-between;align-items:center;color:#bfe6ff;font-weight:700;margin-bottom:4px}#szzFx button{background:#12202a;border:1px solid #3a5a70;color:#dbe8f2;padding:2px 7px;margin:1px;cursor:pointer;font-size:12px;border-radius:3px}#szzFx button.on{border-color:#7ad0ff;background:#1f3a50;color:#fff}
#szzFx .row{display:flex;align-items:center;gap:6px;margin:3px 0}#szzFx .row span{width:52px;flex:none;color:#9cc4dc}#szzFx .row input[type=range]{flex:1;accent-color:#7ad0ff}#szzFx .row b{min-width:40px;text-align:right;color:#bfe6ff;font-weight:600}#szzFx select{background:#12202a;color:#dbe8f2;border:1px solid #3a5a70;font-size:12px;flex:1}#szzFx .sec{margin-top:6px;border-top:1px solid #2a4a60;padding-top:4px;color:#9cc4dc}#szzFx .ds{font-size:11px;opacity:.75}
@media (max-aspect-ratio:1/1){#szzFx{left:0;right:0;top:auto;bottom:0;width:auto;max-height:50vh}}`; document.head.appendChild(st); }
    fxRender();
  }
  function fxRender() {
    const t = T(); if (!fxBox || !t) return;
    const boss = fxT.slice(0, 2) !== 's:', nm = boss ? ((FXB.find(x => x[0] === fxT) || [0, fxT])[1]) : SOLN[fxT.slice(2)] || fxT;
    let mvs = boss ? (fxT === 'cheng_yuanzhi' ? ['atk', 'boomerang', 'sweep', 'chase'] : ['atk'].concat(t.nmoves()[fxT] || [], fxT === 'zhang_jiao' ? ['zj_ht'] : [])) : Object.keys((t.SOLMV || {})[fxT.slice(2)] || { atk: 1 }).concat(['slinger', 'archer', 'crossbow'].includes(fxT.slice(2)) ? ['shot'] : [], fxT === 's:fanatic' ? ['boom'] : []);
    { const EX = { zhang_bao: ['zb_wall_end'], guanhai_b: ['gb_throw_stuck'], cheng_yuanzhi: ['chase_stuck'] }; if (boss && EX[fxT]) mvs.push(...EX[fxT]); }
    const MN2 = { atk: '普攻', any: '技能', shot: '飞行物', boom: '自爆', boomerang: '大刀回旋', sweep: '横扫千军', chase: '拖刀追身', zb_wall: '土墙·升起', zb_wall_end: '土墙·倒塌', gb_throw_stuck: '掷戟·插地', boomerang_stuck: '大刀回旋·插地', chase_stuck: '拖刀·插地' };
    const SM = boss ? null : (t.SOLMV || {})[fxT.slice(2)];
    const L = mvs.map(m => [m, (SM && SM[m] && SM[m][0]) || MN2[m] || NMN[m] || m]); if (!L.find(x => x[0] === fxM)) fxM = L[0][0];
    const B = t.bfxGet(fxT), M0 = t.bfxGet(fxT + ':' + fxM), M = Object.assign({ beam: M0.beam }, M0.l1 || {}), col = B.col || t.bfxCol(fxT), sol = !boss;
    const sl = (lab, key, o, min, max, step, def, fmt) => { const v = o[key] != null ? o[key] : def; return `<div class="row"><span>${lab}</span><input type="range" min="${min}" max="${max}" step="${step}" value="${v}" data-${o === B ? 'b' : 'm'}="${key}"><b>${fmt(v)}</b></div>`; };
    fxBox.innerHTML = `<div class="hd"><span>特效调试 · ${nm}</span><button class="fxx">关闭</button></div>
      <div class="sec">首领：</div><div>${FXB.map(([k, n]) => `<button data-ft="${k}" class="${k === fxT ? 'on' : ''}">${n}</button>`).join('')}</div>
      <div class="sec">小兵：</div><div>${Object.entries(SOLN).map(([k, n]) => `<button data-ft="s:${k}" class="${'s:' + k === fxT ? 'on' : ''}">${n}</button>`).join('')}</div>
      <div class="sec">整体（这个人所有招一起改）</div>
      <div class="row"><span>开关</span><button class="fxo ${B.off ? '' : 'on'}">${B.off ? '已关' : '开'}</button><span style="width:auto">颜色</span><input type="color" class="fxc" value="${hex(col)}"></div>
      ${sl('大小', 'k', B, .2, 2.5, .05, sol ? .6 : 1, v => '×' + (+v).toFixed(2))}${sl('亮度', 'al', B, .1, 1, .05, sol ? .7 : 1, v => (+v).toFixed(2))}
      <div class="sec">单招</div><div>${L.map(([k, n]) => `<button data-fm="${k}" class="${k === fxM ? 'on' : ''}">${n}</button>`).join('')}</div>
      ${(() => { if (!SM || !SM[fxM]) return ''; const st = fxT.slice(2), PX = { grunt: 'grunt_pxa', blade: 'blade_pxa', slinger: 'slinger_pxa', archer: 'archer_pxa', elite: 'elite_pxa', priest: 'priest_pxa', 'yellow-heavy': 'heavy_pxa', 'yellow-shield': 'shield_pxa', 'yellow-spear': 'spear_pxa', 'yellow-golem': 'golem_pxa', 'fire-jar': 'firejar_pxa', drummer: 'drum_pxa', cavalry: 'cav_pxa', fanatic: 'fanatic_pxa', crossbow: 'xbow_pxa' }, ch = typeof CH !== 'undefined' && CH[PX[st]], frs = ch ? Object.keys(ch).filter(k => !['portrait', 'weapon', 'horse'].includes(k)) : [], C = t.bossCfg(fxM, fxT), D = SM[fxM][1];
        const sel = (r, i, lab) => `<div class="row"><span>${lab}</span><select data-scf="${r}"><option value="">默认（${D[i]}）</option>${frs.map(f => `<option value="${f}"${C[r] === f ? ' selected' : ''}>${f}</option>`).join('')}</select></div>`;
        return `<div class="sec">动作</div>${sel('a', 0, '起手')}${sel('b', 1, '出手')}${sel('c', 2, '收手')}<div class="row"><span>范围</span><input type="range" min=".4" max="2.5" step=".05" value="${C.rs}" data-scr="rs"><b>×${(+C.rs).toFixed(2)}</b></div><div class="row"><span>速度</span><input type="range" min=".4" max="2.5" step=".05" value="${C.sp}" data-scr="sp"><b>×${(+C.sp).toFixed(2)}</b></div><div class="ds">范围＝够多远、预警线/圈多大；速度越大越慢（起手、动作都变久）。</div><div class="sec">特效</div>`; })()}
      <div class="row"><span>特效图</span><select class="fxi">${FXIMG.concat(Object.entries(t.FX2N || {})).map(([k, n]) => `<option value="${k}"${(M.on === 0 ? 'none' : M.img || 'auto') === k ? ' selected' : ''}>${n}</option>`).join('')}</select></div>
      ${sl('大小', 'k', M, .2, 3, .05, 1, v => '×' + (+v).toFixed(2))}${sl('前后', 'x', M, -120, 120, 2, 0, v => v)}${sl('上下', 'y', M, -120, 120, 2, 0, v => v)}${sl('角度', 'r', M, -180, 180, 5, 0, v => v + '°')}${sl('时长', 'T', M, .3, 3, .05, 1, v => '×' + (+v).toFixed(2))}${sl('亮度', 'al', M, .1, 1, .05, 1, v => (+v).toFixed(2))}
      ${(() => { const n = M.img || ((t.bdef && t.bdef(fxT, fxM, 'l1')) || {}).n || '', raw = M.raw != null ? M.raw : n.startsWith('bc_'); return `<div class="row"><span>颜色</span><button class="fxraw ${raw ? 'on' : ''}">${raw ? '保留原色' : '按主色上色'}</button><span class="ds" style="width:auto">火、雷、符默认保留原色</span></div>`; })()}
      <div class="row"><span>光束</span><button class="fxbm ${M.beam === 0 ? '' : 'on'}">${M.beam === 0 ? '关' : '开'}</button><span class="ds" style="width:auto">直线招沿预警线的一道光</span></div>
      <div style="margin-top:6px"><button class="fxp" style="border-color:#ffd86e;color:#ffe08a">${boss ? (fxT === 'cheng_yuanzhi' ? '叫程远志出来' : '放这招') : '刷 2 个出来'}</button> <button class="fxr">重置这个人</button> <button class="fxcp">复制特效设置</button> <button class="fxin">粘贴工具设置</button></div>
      <div class="ds">${boss ? '「放这招」会叫这个首领出来对你放（主角无敌）。程远志的招不分开，统一调「全部招式」。' : '小兵刷出来会自己出招；只有地上有预警的招（劈、突刺、冲锋、砸地、火箭落点等）会有特效。'}改完马上生效，存在这台设备上；满意了点「复制特效设置」发给我。</div>`;
    const set = (k, o) => { t.bfxSet(k, o); };
    fxBox.querySelector('.fxx').onclick = () => { fxBox.remove(); fxBox = null; };
    fxBox.querySelectorAll('[data-ft]').forEach(b => b.onclick = () => { fxT = b.dataset.ft; fxM = ''; fxRender(); });
    fxBox.querySelectorAll('[data-fm]').forEach(b => b.onclick = () => { fxM = b.dataset.fm; fxRender(); });
    fxBox.querySelector('.fxo').onclick = () => { set(fxT, { off: B.off ? '' : 1 }); fxRender(); };
    fxBox.querySelector('.fxc').oninput = e => set(fxT, { col: rgbOf(e.target.value) });
    fxBox.querySelectorAll('[data-b]').forEach(e => e.oninput = () => { const v = +e.value; set(fxT, { [e.dataset.b]: v }); e.nextElementSibling.textContent = e.dataset.b === 'k' ? '×' + v.toFixed(2) : v.toFixed(2); });
    fxBox.querySelectorAll('[data-m]').forEach(e => e.oninput = () => { const v = +e.value, k = e.dataset.m; set(fxT + ':' + fxM, k === 'T' ? { T: v } : { l1: Object.assign({}, M0.l1 || {}, { [k]: v }) }); e.nextElementSibling.textContent = k === 'k' || k === 'T' ? '×' + v.toFixed(2) : k === 'al' ? v.toFixed(2) : k === 'r' ? v + '°' : v; });
    fxBox.querySelector('.fxi').onchange = e => { const v = e.target.value, l1 = Object.assign({}, M0.l1 || {}); if (v === 'auto') delete l1.img; else if (v === 'none') { l1.on = 0; } else { l1.img = v; l1.on = 1; } set(fxT + ':' + fxM, { l1 }); };
    fxBox.querySelectorAll('[data-scf]').forEach(e => e.onchange = () => t.setBossCfg(fxM, { [e.dataset.scf]: e.value }, fxT));
    fxBox.querySelectorAll('[data-scr]').forEach(e => e.oninput = () => { const v = Math.round(+e.value * 100) / 100; t.setBossCfg(fxM, { [e.dataset.scr]: v }, fxT); e.nextElementSibling.textContent = '×' + v.toFixed(2); });
    fxBox.querySelector('.fxraw').onclick = () => { const n = M.img || ((t.bdef && t.bdef(fxT, fxM, 'l1')) || {}).n || '', raw = M.raw != null ? M.raw : n.startsWith('bc_'); set(fxT + ':' + fxM, { l1: Object.assign({}, M0.l1 || {}, { raw: raw ? 0 : 1 }) }); fxRender(); };
    fxBox.querySelector('.fxbm').onclick = () => { set(fxT + ':' + fxM, { beam: M0.beam === 0 ? '' : 0 }); fxRender(); };
    fxBox.querySelector('.fxin').onclick = () => { const v = prompt('把「首领特效对齐工具」复制出来的设置粘贴到这里：'); if (!v) return; try { t.bfxImport(v.replace(/^[^{]*/, '')); fxRender(); } catch (e) { alert('格式不对：' + e.message); } };
    fxBox.querySelector('.fxr').onclick = () => { t.bfxReset(fxT); fxRender(); };
    fxBox.querySelector('.fxcp').onclick = () => { let cfg = {}; try { cfg = JSON.parse(localStorage.getItem('szz-boss-cfg') || '{}') || {}; } catch (e) {} const txt = '首领设置：' + JSON.stringify({ fx: JSON.parse(t.bfxCopy()), cfg }); /* 11/20：和场外工具一样，连动作设置一起复制 */ try { navigator.clipboard.writeText(txt); } catch (e) {} fxBox.querySelector('.fxcp').textContent = '已复制'; };
    fxBox.querySelector('.fxp').onclick = () => { try {
      if (!boss) { t.unitStyle(fxT.slice(2), 2); return; }
      const has = () => zs.find(z => z.survBoss && !z.dead && (fxT === 'zhang_fei' ? z.zf : z.type === fxT) && /_(new|px)$/.test(z.sprite || ''));
      const go = () => { if (fxM !== 'any') t.forceMove(fxM); };
      if (has()) go(); else { if (fxT === 'zhang_fei') t.zhangFei(); else if (fxT === 'cheng_yuanzhi') t.pilotAs('cheng_yuanzhi'); else t.spawnNew(fxT); setTimeout(go, 1500); }
    } catch (e) { console.error(e); } };
  }
  function skills(w) { const t = T(); return Object.keys(t.SK).filter(k => !t.SK[k].off && t.wepOf(k) === w).sort((a, b) => (t.SK[a].tier || 0) - (t.SK[b].tier || 0)); }
  function render() {
    const t = T(); if (!t || !box) return;
    const tabs = ORDER.map((w, i) => `<button data-t="${i}" class="${tab === i ? 'on' : ''}">${t.WEPN[w]}</button>`).join('') + `<button data-t="gf" class="${tab === 'gf' ? 'on' : ''}">心法</button><button data-t="qg" class="${tab === 'qg' ? 'on' : ''}">轻功</button>`;
    let ls = '', dt = '<span style="opacity:.6">点一招，主角就只反复放这一招。</span>';
    if (typeof tab === 'number') {
      const w = ORDER[tab], ks = skills(w);
      ls = ks.map((k, i) => { const s = t.SK[k]; return `<button data-k="${k}" class="${sel === k ? 'on' : ''}"><span style="color:${TC[s.tier || 0]}">${t.TIERN[s.tier || 0]}</span> ${i + 1}. ${s.name}<small>${MOTN[t.MOT[k]] || '—'}</small></button>`; }).join('');
      if (sel && t.SK[sel]) { const s = t.SK[sel], i = ks.indexOf(sel); dt = `<b>${t.WEPN[w]} · 第 ${i + 1} 招 · ${s.name}</b>　${t.TIERN[s.tier || 0]}阶 · 动作：${MOTN[t.MOT[sel]] || '—'}<br>${s.desc}<br><span style="opacity:.65">当前伤害倍率 ×${t.mul(sel).toFixed(2)}（出身、属性、熟练都算在内）</span><br><span style="opacity:.8">${t.spd(sel)}</span><div class="lvr">等级：${[1, 3, 5, 7, 10].map(n => `<button data-lv="${n}" class="${t.lv(sel) === n ? 'on' : ''}">LV${n}</button>`).join('')}</div>${t.rs(sel) != null ? `<div class="sl"><span>范围</span><input type="range" min="0.3" max="1.5" step="0.01" value="${t.rs(sel)}" data-sl="rs"><b>×${t.rs(sel).toFixed(2)}</b></div><div class="sl"><span>速度</span><input type="range" min="0.5" max="3" step="0.01" value="${t.sp(sel)}" data-sl="sp"><b>×${t.sp(sel).toFixed(2)}</b></div><div class="lvr sp2">${t.spd(sel)}</div>${(() => { const o = t.getPose(sel), opt = (v, w0) => (w0 ? ['无'] : []).concat(t.FRN).map(n => `<option value="${n}"${n === v ? ' selected' : ''}>${FRZ[n] || n}</option>`).join(''); return `<div class="sl ps"><span>起手</span><select data-ps="a">${opt(o.a)}</select><label><input type="checkbox" data-pf="fa"${o.fa ? ' checked' : ''}>翻转</label></div><div class="sl ps"><span>出手</span><select data-ps="b">${opt(o.b, 1)}</select><label><input type="checkbox" data-pf="fb"${o.fb ? ' checked' : ''}>翻转</label></div><div class="sl ps">${(() => { const ao = t.getAnim ? t.getAnim(sel) : { mv: 0, gh: 1 }; return `<label><input type="checkbox" data-ao="mv"${ao.mv ? ' checked' : ''}>位移（前探、跳起、倾斜）</label><label><input type="checkbox" data-ao="gh"${ao.gh ? ' checked' : ''}>残影</label>`; })()}</div><div class="pv" style="display:flex;gap:6px;align-items:flex-end">${(o.b === '无' ? ['a'] : ['a', 'b']).map(x => `<img src="art/sprites/hero_skins/${window.HERO_SKIN ? HERO_SKIN.cur() : 'baiyi'}/${t.preDir ? t.preDir(sel) : 'dao'}/${o[x]}.png" style="height:72px;image-rendering:pixelated;${o['f' + x] ? 'transform:scaleX(-1)' : ''}">`).join('<span style="opacity:.6">→</span>')}</div>`; })()}${(t.wepOf(sel) === 0 || t.wepOf(sel) === 2) ? (() => { const b = t.fxBaseOf(sel), h = t.fxBhOf(sel), bt = (v, n) => `<button data-fxb="${v}" class="${b === v ? 'on' : ''}">${n}</button>`; return `<div class="lvr" style="margin-top:6px;color:#ffd98a">这一招的特效（只改这一招，存本机）</div><div class="lvr">${bt('r', '写实')}${bt('g', '代码')}${bt('n', '无')}${t.wepOf(sel) === 0 ? ` <label><input type="checkbox" data-fxh="1"${h ? ' checked' : ''}>刀魂</label>` : ''}</div><div class="lvr"><button data-fxcp="1">复制全部招式特效选择</button></div>`; })() : ''}${t.hasDg && t.hasDg(sel) ? (() => { const g = t.dgAdj(sel), row = (k, n, mn, mx, st) => `<div class="sl"><span>${n}</span><input type="range" min="${mn}" max="${mx}" step="${st}" value="${g[k]}" data-dg="${k}"><b>${(+g[k]).toFixed(k === 's' ? 2 : 0)}</b></div>`; return `<div class="lvr" style="margin-top:6px;color:#9fe8ff">特效对齐（青色虚线 = 真实判定，把刀光拖到贴合它）</div><div class="lvr"><label><input type="checkbox" data-dgon="1"${window.FXALIGN ? ' checked' : ''}>显示判定线</label></div>${row('s', '大小', .4, 2.5, .01)}${row('dx', '前后', -80, 80, 1)}${row('dy', '上下', -60, 60, 1)}${row('r', '角度', -90, 90, 1)}<div class="lvr"><button data-dgcp="1">复制特效对齐</button></div>`; })() : ''}<div class="lvr"><button data-spall="1">这个速度用到全部${t.WEPN[w]}招</button></div><div class="lvr"><button data-cp="1">复制新系统武艺设置</button></div>` : ''}`; }
    } else {
      const qg = tab === 'qg', on = qg ? [t.qg()] : t.gf();
      const ids = Object.keys(t.GF).filter(id => !t.GF[id].off && !!t.GF[id].qg === qg).sort((a, b) => t.GF[a].t - t.GF[b].t);
      ls = ids.map(id => { const g = t.GF[id]; return `<button data-g="${id}" class="${on.includes(id) ? 'on' : ''}"><span style="color:${TC[g.t + 1]}">${t.TIERN[g.t + 1]}</span> ${g.n}<small>${g.cn || (qg ? '轻功' : '内功')}</small></button>`; }).join('');
      const g = sel && t.GF[sel]; dt = g ? `<b>${g.n}</b>　${t.TIERN[g.t + 1]}阶<br>${g.d || ''}` : `<span style="opacity:.6">${qg ? '点一个轻功装上（只能装一个）' : '点心法装上（最多 3 个，再点取消）'}；武艺照常放。</span>`;
    }
    box.innerHTML = `<div class="hd"><span>武学试炼</span><span>${mini ? '' : `<button class="dm">木人桩：${DUMN[dum]}</button> `}<button class="mn">${mini ? '展开' : '缩小'}</button></span></div>${mini ? '' : `<div class="dms"><span><button class="tbk">${brk ? '会碎的木人' : '不碎的木人'}</button> <button class="tsol">士兵：${sol ? '开' : '关'}</button>  <button class="trg">范围：${window.FXALIGN ? '开' : '关'}</button>${sol ? ` <button class="rg">远程兵：${rng ? '开' : '关'}</button>` : ''}</span></div><div class="dms" style="flex-wrap:wrap"><span>新画风：<button class="tzf" style="border-color:#ffd86e;color:#ffe08a">刷张飞＋新兵</button> <button class="tfx" style="border-color:#7ad0ff;color:#bfe6ff">小兵特效调试</button> 刷兵：<button data-ut="grunt">棍兵</button> <button data-ut="blade">刀手</button> <button data-ut="slinger">投石手</button> <button data-ut="archer">弓手</button> <button data-ut="elite">老卒</button> <button data-ut="priest">方士</button> <button data-ut="yellow-heavy">大刀兵</button> <button data-ut="yellow-shield">盾兵</button> <button data-ut="yellow-spear">枪兵</button> <button data-ut="yellow-golem">力士</button> <button data-ut="fire-jar">火罐</button> <button data-ut="drummer">鼓手</button> <button data-ut="cavalry">骑兵</button> <button data-ut="fanatic">狂信徒</button> <button data-ut="crossbow">弩手</button> <button data-ut="thief">窃贼</button></span></div>${dum ? '<div class="dms"><span class="dmv">—</span><button class="dmc">清零</button></div>' : ''}<div class="tabs">${tabs}</div><div class="ls">${ls}</div><div class="dt">${dt}</div>`}`;
    box.querySelector('.mn').onclick = () => { mini = !mini; render(); };
    if (mini) return;
    const rg = box.querySelector('.rg'); if (rg) rg.onclick = () => { rng = !rng; render(); };
    box.querySelector('.dm').onclick = () => { dum = DUMO[(DUMO.indexOf(dum) + 1) % DUMO.length]; try { T().dummy(dum); } catch (e) {} render(); };
    box.querySelector('.tbk').onclick = () => { brk = brk ? 0 : 1; try { T().dummyBrk(brk); } catch (e) {} render(); };
    { const b = box.querySelector('.tfx'); if (b) b.onclick = () => fxPanel('s:blade'); }
    box.querySelector('.tzf').onclick = () => { try { T().zhangFei(); } catch (e) { console.error(e); } };
    box.querySelectorAll('[data-ut]').forEach(b => b.onclick = () => { try { T().unitStyle(b.dataset.ut); } catch (e) { console.error(e); } });
    box.querySelectorAll('[data-gs]').forEach(b => b.onclick = () => { try { T().gruntStyle(b.dataset.gs); } catch (e) { console.error(e); } });
    box.querySelector('.trg').onclick = () => { window.FXALIGN = !window.FXALIGN; render(); };   // 11/18 用户：一键显示预警（出手前，招式颜色）和真实伤害范围（打中那一刻，青色）

    box.querySelector('.tsol').onclick = () => { sol = sol ? 0 : 1; try { T().soldiers(sol); } catch (e) {} render(); };
    const dc = box.querySelector('.dmc'); if (dc) dc.onclick = () => { try { T().dummyClear(); } catch (e) {} };
    box.querySelectorAll('.tabs button').forEach(b => b.onclick = () => { const v = b.dataset.t; tab = v === 'gf' || v === 'qg' ? v : +v; sel = null; render(); });
    box.querySelectorAll('[data-k]').forEach(b => b.onclick = () => { sel = b.dataset.k; t.setLv(sel, 1); SURV.slots.splice(0, 5, sel, '', '', '', ''); render(); });
    box.querySelectorAll('[data-lv]').forEach(b => b.onclick = () => { t.setLv(sel, +b.dataset.lv); render(); });
    box.querySelectorAll('[data-fxb]').forEach(b => b.onclick = () => { t.setFxSk(sel, { b: b.dataset.fxb }); render(); });
    box.querySelectorAll('[data-fxh]').forEach(c => c.onchange = () => { t.setFxSk(sel, { h: c.checked ? 1 : 0 }); });
    box.querySelectorAll('[data-fxcp]').forEach(b => b.onclick = () => { const txt = '招式特效选择：' + t.fxSkCopy(); try { navigator.clipboard.writeText(txt); } catch (e) {} b.textContent = '已复制'; });
    box.querySelectorAll('[data-dg]').forEach(r => r.oninput = () => { const k = r.dataset.dg, v = +r.value; t.setDgAdj(sel, { [k]: v }); r.nextElementSibling.textContent = v.toFixed(k === 's' ? 2 : 0); });
    box.querySelectorAll('[data-dgon]').forEach(c => c.onchange = () => { window.FXALIGN = c.checked; });
    box.querySelectorAll('[data-dgcp]').forEach(b => b.onclick = () => { const txt = '刀特效对齐：' + t.dgCopy(); try { navigator.clipboard.writeText(txt); } catch (e) {} b.textContent = '已复制'; });
    box.querySelectorAll('[data-sl]').forEach(r => r.oninput = () => { const v = Math.round(+r.value * 100) / 100; if (r.dataset.sl === 'rs') t.setRs(sel, v); else t.setSp(sel, v); r.nextElementSibling.textContent = '×' + v.toFixed(2); const q = box.querySelector('.sp2'); if (q) q.textContent = t.spd(sel); });   // 11/14：范围、速度拖动调（速度越大越慢），存本机
    const psSave = () => { const g = n => box.querySelector(n); const o = { a: g('[data-ps=a]').value, b: g('[data-ps=b]').value, fa: g('[data-pf=fa]').checked ? 1 : 0, fb: g('[data-pf=fb]').checked ? 1 : 0 }; t.setPose(sel, o); render(); };
    box.querySelectorAll('[data-ps],[data-pf]').forEach(e => e.onchange = psSave);
    box.querySelectorAll('[data-pss]').forEach(e => { const f = () => { const v = e.dataset.pss === 'ang' ? +e.value : e.value; t.setPs(sel, { [e.dataset.pss]: v }); if (e.dataset.pss === 'ang') e.nextElementSibling.textContent = v + '°'; }; if (e.tagName === 'SELECT') e.onchange = f; else e.oninput = f; });
    box.querySelectorAll('[data-pvall]').forEach(e => e.onchange = () => { window.PV_ALWAYS = e.checked; });
    box.querySelectorAll('[data-pv]').forEach(r => r.oninput = () => { const v = Math.round(+r.value * 100) / 100; if (t.setPv) t.setPv(sel, { [r.dataset.pv]: v }); r.nextElementSibling.textContent = '×' + v.toFixed(2); });
    box.querySelectorAll('[data-ao]').forEach(e => e.onchange = () => { if (t.setAnim) t.setAnim(sel, { [e.dataset.ao]: e.checked ? 1 : 0 }); });
    box.querySelectorAll('[data-spall]').forEach(b => b.onclick = () => { t.spAll(t.sp(sel), t.wepOf(sel)); b.textContent = '已用到全部' + t.WEPN[t.wepOf(sel)] + '招 ×' + t.sp(sel).toFixed(2); });
    box.querySelectorAll('[data-cp]').forEach(b => b.onclick = () => { const txt = '武艺范围、速度（武学试炼调好；速度越大越慢）：\n' + t.rsAll() + '\n\n武艺动作（起手帧 → 出手帧）：\n' + t.poseAll();
      const ta = document.createElement('textarea'); ta.value = txt; ta.readOnly = true; ta.style.cssText = 'width:100%;height:150px;margin-top:6px;font-size:12px;background:#120c07;color:#efe2c4;border:1px solid #6a4a28';
      b.parentNode.appendChild(ta); ta.select(); let ok = false; try { ok = document.execCommand('copy'); } catch (e) {} try { if (navigator.clipboard) navigator.clipboard.writeText(txt).then(() => { b.textContent = '已复制 ✓（下面也能手动全选复制）'; }).catch(() => {}); } catch (e) {} if (ok) b.textContent = '已复制 ✓（下面也能手动全选复制）'; });   // 11/14：看各等级的样子（锁定等级，放招不再涨）
    box.querySelectorAll('[data-g]').forEach(b => b.onclick = () => { const id = b.dataset.g; sel = id;
      if (tab === 'qg') t.setQg(t.qg() === id ? '' : id);
      else { let g = t.gf().filter(x => x); g = g.includes(id) ? g.filter(x => x !== id) : g.concat([id]).slice(-3); t.setGf(g); }
      render(); });
  }
  function keep() {   // 无敌 + 关卡不结束
    if (!box) return;
    try { if (typeof hero !== 'undefined' && hero && typeof maxHeroHp === 'function') hero.hp = maxHeroHp(); if (T()) T().long();
      if (box && sel && T() && T().pvReach) { const e = box.querySelector('.pvrc'), rc = T().pvReach(sel); if (e) e.textContent = `实际最远打到 ${rc ? Math.round(rc) : '—（先放一次）'}；提醒大小 ×1 = 这个距离`; }
      if (dum && box) { const v = box.querySelector('.dmv'), st = T() && T().dummyStat && T().dummyStat(); if (v && st) v.textContent = `总伤害 ${st.tot.toFixed(1)}　每秒 ${st.dps.toFixed(1)}　打中 ${st.n}/${st.all} 个${st.brk ? `　击碎 ${st.broke}` : ''}`; }
      if (rng && sol && T() && T().spawn && Date.now() - rngT > 3000) { rngT = Date.now(); for (const u of ['archer', 'slinger']) if (T().count(u) < 2) T().spawn(u); } } catch (e) {}
    godT = setTimeout(keep, 400);
  }
  const wait = (f, ms = 6000) => new Promise(res => { const t0 = Date.now(); const k = () => { const v = f(); if (v) res(v); else if (Date.now() - t0 > ms) res(null); else setTimeout(k, 120); }; k(); });
  async function enterFight() {   // 11/18 用户：进试炼卡——不再走「主界面 → 开局 → 出征」，直接清掉这一局、在演武场开一场（游戏里点也是原地切过去）
    window.TRIAL_ARENA = true;
    try { if (window.ARENA && ARENA.want) ARENA.want('camp'); } catch (e) {}
    if (window.RUNSAVE) RUNSAVE.has = () => false;
    for (const id of ['kaiju', 'tNameAsk']) { const e = document.getElementById(id); if (e) e.remove(); }
    document.querySelectorAll('.rtEv').forEach(e => e.remove()); try { if (window.ROUTE && ROUTE.hide) ROUTE.hide(); } catch (e) {}
    if (window.TITLE && TITLE.beginRun) TITLE.beginRun();
    const ok = !!(await wait(() => SURV.curNode && SURV.curNode(), 4000));
    await wait(() => !window.ARENA || !ARENA.shows || ARENA.shows('camp'), 8000);
    return ok;
  }
  // 11/18 用户：开发者面板一开、或主界面闲着，就把演武场的图和常用动作帧先在后台下好，点进试炼基本不用等
  function preload() { try { if (window.ARENA && ARENA.want) ARENA.want('camp'); if (window.HERO_SKIN && HERO_SKIN.preload) HERO_SKIN.preload(HERO_SKIN.cur(), 'wd_'); regNewGrunt(); } catch (e) {} }
  if (/[?&]debug/.test(location.search)) (window.requestIdleCallback || (f => setTimeout(f, 2500)))(() => setTimeout(preload, 1500));
  async function open() {
    window.TRIAL_ON = true; if (window.FXALIGN == null) window.FXALIGN = true;
    { const t0 = document.getElementById('survTut'); if (t0) t0.remove(); }
    if (!document.getElementById('szzTrialCss')) { const s = document.createElement('style'); s.id = 'szzTrialCss'; s.textContent = css; document.head.appendChild(s); }
    if (!box) { box = document.createElement('div'); box.id = 'szzTrial'; document.body.appendChild(box); }
    box.innerHTML = '<div class="hd"><span>武学试炼 · 进场中…</span></div>';
    // 11/18 用户：试炼借的是正常的一场仗（要先开一局、在路线图上点第一格），进场时用黑幕盖住，看不到标题、开局、路线图
    let cv = document.getElementById('szzTrialCover'); if (!cv) { cv = document.createElement('div'); cv.id = 'szzTrialCover'; cv.style.cssText = 'position:fixed;inset:0;z-index:10038;background:#0c0806;display:flex;align-items:center;justify-content:center;color:#e6c98a;font:600 18px sans-serif;letter-spacing:4px'; cv.textContent = '演武场准备中…'; document.body.appendChild(cv); }
    try { await enterFight(); } finally { setTimeout(() => { const c = document.getElementById('szzTrialCover'); if (c) c.remove(); }, 250); }
    render(); clearTimeout(godT); keep();
  }
  function close() { try { T().setLv(null); } catch (e) {} bossPanel(false); bossMode = false; if (dum) { try { T().dummy(''); } catch (e) {} } dum = 'row'; brk = 0; sol = 0; show = 0; ng = 0; window.NEW_GRUNT = false; mini = false; const wasArena = window.TRIAL_ARENA; try { T().soldiers(1); T().dummyBrk(0); } catch (e) {}
    if (wasArena && window.TITLE && TITLE.mode && TITLE.mode() === 'game' && TITLE.show) { window.TRIAL_ON = false; TITLE.show(); } window.TRIAL_ARENA = false; window.TRIAL_ON = false; clearTimeout(godT); if (box) box.remove(); box = null; }   // 演武场关掉就回主界面
  // 11/18 用户：单独一个「首领试炼」——进去直接操控首领打木头人
  let bossMode = false;
  async function openBoss() { bossMode = true; await open(); if (box) box.style.display = 'none'; bossPanel(true); }
  // 11/18 用户：这些开关挪到开发者面板
  function burnTry() { try { if (zs.filter(z => !z.dead && !z.dummy && !z.pilot).length < 4) { T().soldiers(1); for (let i = 0; i < 8; i++) { const z = T().spawn('grunt'); if (z) { z.x = hero.x + (i % 2 ? 1 : -1) * (70 + (i >> 1) * 40); z.y = hero.y + ((i * 37) % 60) - 30; } } T().soldiers(0, 1); setTimeout(() => SURV.burnTest(), 900); } else SURV.burnTest(); } catch (e) { console.error(e); } }
  window.TRIAL = { fxPanel, open, openBoss, close, regNew: regNewGrunt, bpx: on => bpx(on), bpxOn: () => BPX, burnTry };
})();
