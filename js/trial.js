// 11/13 武学试炼（开发者模式）：进一场不会结束的战斗，主角无敌，点哪招就只放哪招，一招一招看；心法、轻功点一下就装上
(() => {
  const FRZ = { idle: '待机', walk1: '走路 1', walk2: '走路 2', walk3: '走路 3', roll1: '翻滚 1', roll2: '翻滚 2', roll3: '翻滚 3', roll4: '翻滚 4', hurt: '受击', down: '倒地', chop1: '劈·起手', chop2: '劈·出手', sweep1: '横扫·起手', sweep2: '横扫·出手', thrust1: '刺·起手', thrust2: '刺·出手', spin1: '转·起手', spin2: '转·出手', up1: '挑·起手', up2: '挑·出手' };   // 11/18 用户：动作帧显示中文
  const MOTN = { chop: '劈', sweep: '横扫', thrust: '刺', spin: '转', up: '挑' };
  const ORDER = [0, 2, 3, 4, 12, 7, 5, 8, 9, 1, 10, 11];   // 刀 锤 枪 关刀 长戟 石子 弓 黄符 羽扇 剑 拳 腿
  const TC = ['#c9b27a', '#c9b27a', '#6fb8ff', '#c58cff', '#ffb347'];
  let box = null, tab = 0, sel = null, godT = 0, rng = true, rngT = 0, show = 0, ng = 0, mini = false, dum = 'row', brk = 0, sol = 0, arena = false;   // 11/18 木人桩：'' 关 / one 单个 / row 一排 / ring 一圈
  const DUMN = { '': '关', one: '单个', row: '一排', ring: '一圈' }, DUMO = ['', 'one', 'row', 'ring'];   // 11/16 用户：试炼里常驻弓手、投石手（看乾坤屏挡箭等）
  const T = () => window.SURV && SURV.trial;
  const css = `#szzTrial{position:fixed;z-index:10040;left:8px;top:56px;width:min(330px,46vw);max-height:calc(100vh - 70px);display:flex;flex-direction:column;background:rgba(14,10,7,.93);border:1px solid #8a6a3a;color:#efe2c4;font-size:13px;box-shadow:0 6px 20px rgba(0,0,0,.6)}
#szzTrial .hd{display:flex;align-items:center;justify-content:space-between;padding:6px 8px;border-bottom:1px solid rgba(184,149,90,.35);color:#ffd86e}
#szzBoss{position:fixed;left:8px;top:100px;z-index:10041;max-height:calc(100vh - 110px);overflow:auto;width:300px;max-width:calc(100vw - 16px);background:rgba(24,16,10,.94);border:1px solid #8a6a3a;color:#ead9b6;font:13px/1.5 sans-serif;padding:6px 8px;border-radius:6px}#szzBoss .hd{display:flex;justify-content:space-between;align-items:center;color:#ffe08a;font-weight:700;margin-bottom:4px}#szzBoss button{background:#3a2a1a;border:1px solid #8a6a3a;color:#e6c98a;border-radius:4px;padding:2px 8px;cursor:pointer}#szzBoss .mv{display:flex;gap:4px;flex-wrap:wrap;margin:4px 0}#szzBoss .mv button.on{background:#7a5a2a;color:#fff}#szzBoss .ds{opacity:.75;font-size:12px;margin:3px 0}#szzBoss .row{display:flex;align-items:center;gap:6px;margin:3px 0}#szzBoss .row span{width:34px}#szzBoss .row input{flex:1}#szzBoss select{flex:1;background:#2a1d12;color:#ead9b6;border:1px solid #8a6a3a}#szzBoss .cp{margin-top:6px;width:100%}#szzBossKeys{position:fixed;right:14px;bottom:110px;z-index:10041;display:flex;gap:8px}#szzBossKeys button{width:74px;height:74px;border-radius:50%;background:rgba(60,36,18,.88);border:2px solid #c9a35a;color:#ffe9b0;font:700 14px/1.2 sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;touch-action:none}#szzBossKeys small{opacity:.6;font-size:11px}@media (max-height:500px){#szzBoss{top:56px;font-size:12px;line-height:1.35;width:270px}#szzBossKeys{bottom:90px}#szzBossKeys button{width:60px;height:60px;font-size:12px}}@media (max-width:560px){#szzBoss{top:auto;bottom:8px;right:8px;left:8px;width:auto}}
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
@media (max-aspect-ratio:1/1){#szzTrial{left:0;right:0;top:auto;bottom:0;width:auto;max-height:46vh}#szzTrial .ls{grid-template-columns:1fr 1fr 1fr}}`;
  // 11/18 用户：新画风（写实比例）的黄巾棍兵——演武场里打打看。图在 art/sprites/grunt_new/，帧尺寸按旧喽啰的精灵像素换算（站立高 85）
  const GN = {"idle": [44.1, 95.0, 23.9, 94.3], "walk1": [59.1, 93.8, 29.2, 93.1], "walk2": [58.6, 94.0, 27.7, 93.4], "wind": [60.1, 103.6, 30.7, 103.0], "strike": [102.7, 75.4, 49.1, 74.9], "hurt": [89.5, 91.8, 55.5, 91.2], "down": [101.4, 33.3, 52.4, 32.6], "fly1": [96.9, 77.1, 69.4, 76.4], "fly2": [76.4, 88.6, 53.3, 88.0], "land": [103.0, 48.6, 49.0, 47.9]};
  const CYN = {"idle": [87.6, 150.0, 43.1, 148.7], "walk1": [121.0, 126.8, 64.4, 125.5], "walk2": [116.5, 125.5, 62.4, 124.2], "walk3": [115.2, 126.2, 61.8, 124.9], "walk4": [115.9, 125.5, 62.4, 124.2], "wind": [137.1, 144.8, 81.4, 143.6], "strike": [191.8, 110.1, 65.4, 108.8], "throw1": [171.2, 117.2, 104.3, 115.9], "throw2": [157.7, 109.4, 49.5, 108.2], "bare": [114.6, 106.9, 43.8, 105.6], "catch": [153.2, 126.2, 92.9, 124.9], "sweep1": [153.2, 119.1, 94.3, 117.8], "sweep2": [207.9, 117.8, 61.8, 116.5], "sweep3": [173.2, 118.5, 55.1, 117.2], "hurt": [154.5, 128.1, 91.5, 126.8], "blade": [152.6, 81.1, 76.3, 40.6], "down": [189.3, 81.1, 94.6, 79.8], "fly1": [175.1, 112.7, 87.6, 111.4], "fly2": [130.0, 138.4, 65.0, 137.1], "land": [140.3, 156.4, 62.6, 155.2]};   // 11/18 新画风程远志（写实比例，站立 150）
  function regNewGrunt() {
    if (typeof CH === 'undefined') return; if (!CH.cheng_new) { CH.cheng_new = {}; for (const [f, [w, h, ax, ay]] of Object.entries(CYN)) { const img = new Image(), fr = { img, w, h, ax, ay, white: null, dark: null }; img.onload = () => { const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight; const g = c.getContext('2d'); g.drawImage(img, 0, 0); g.globalCompositeOperation = 'source-atop'; g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); fr.white = c; }; img.src = 'art/sprites/cheng_new/' + f + '.png'; CH.cheng_new[f] = fr; } }
    if (CH.grunt_new) return;
    CH.grunt_new = {};
    for (const [f, [w, h, ax, ay]] of Object.entries(GN)) { const img = new Image(), fr = { img, w, h, ax, ay, white: null, dark: null, skin: 0 };
      img.onload = () => { const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight; const g = c.getContext('2d'); g.drawImage(img, 0, 0); g.globalCompositeOperation = 'source-atop'; g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); fr.white = c; };
      img.src = 'art/sprites/grunt_new/s_' + f + '.png'; CH.grunt_new[f] = fr; }
  }

  // 11/18 用户：首领试炼——照武学试炼的样子调首领的每一招（起手/出手帧、范围、速度），复制发 Claude
  const BFR = { idle: '站立', walk1: '走路①', walk2: '走路②', walk3: '走路③', walk4: '走路④', wind: '举刀', strike: '劈下', throw1: '掷刀起手', throw2: '掷出', bare: '空手', catch: '接刀', sweep1: '横扫起手', sweep2: '转身横扫', sweep3: '横扫收势', hurt: '受击', down: '倒地', fly1: '被打飞①', fly2: '被打飞②', land: '落地' };
  const BMV = [['atk', '普攻', '靠近了举刀劈下（速度＝举刀多久）'], ['boomerang', '大刀回旋', '掷出大刀飞出再飞回，刀没回来前空手，收手＝接刀那一下（范围＝飞多远，速度＝预警多久）'], ['sweep', '横扫千军', '身周一圈横扫（范围＝圈多大，速度＝蓄力多久）']];
  let bbox = null, bsel = 'atk', bmini = false;
  function bossPanel(on) {
    if (!on) { if (bbox) bbox.remove(); bbox = null; const k = document.getElementById('szzBossKeys'); if (k) k.remove(); try { T().bossTr(false); T().pilot(false); } catch (e) {} if (box) render(); return; }
    regNewGrunt(); try { T().pilot(true); } catch (e) { console.error(e); }
    mini = true; if (box) render();
    if (!bbox) { bbox = document.createElement('div'); bbox.id = 'szzBoss'; document.body.appendChild(bbox);
      const k = document.createElement('div'); k.id = 'szzBossKeys'; k.innerHTML = BMV.map(([m, n], i) => `<button data-c="${m}">${n}<small>${'JKL'[i]}</small></button>`).join(''); document.body.appendChild(k);
      k.querySelectorAll('[data-c]').forEach(b => b.onpointerdown = e => { e.preventDefault(); e.stopPropagation(); T().pilotCast(b.dataset.c); }); }
    brender();
  }
  function brender() {
    const t = T(), C = t.bossCfg(bsel), op = v => Object.entries(BFR).map(([k, n]) => `<option value="${k}"${k === v ? ' selected' : ''}>${n}</option>`).join('');
    bbox.innerHTML = `<div class="hd"><span>首领试炼 · 程远志</span><span><button class="bm">${bmini ? '展开' : '缩小'}</button> <button class="bx">${bossMode ? '退出' : '关闭'}</button></span></div>${bmini ? '' : `
      <div class="mv">${BMV.map(([k, n]) => `<button data-m="${k}" class="${k === bsel ? 'on' : ''}">${n}</button>`).join('')}</div>
      <div class="ds">你就是程远志：移动照常，J/K/L 或右下角按钮出招。正在调：${BMV.find(m => m[0] === bsel)[1]}——${BMV.find(m => m[0] === bsel)[2]}</div>
      <div class="row"><span>起手</span><select data-f="a">${op(C.a)}</select></div>
      <div class="row"><span>出手</span><select data-f="b">${op(C.b)}</select></div>
      <div class="row"><span>收手</span><select data-f="c"><option value=""${C.c ? '' : ' selected'}>无</option>${op(C.c)}</select></div>
      ${bsel === 'atk' ? '' : `<div class="row"><span>范围</span><input type="range" min="0.4" max="2.5" step="0.05" value="${C.rs}" data-r="rs"><b>×${(+C.rs).toFixed(2)}</b></div>`}
      <div class="row"><span>速度</span><input type="range" min="0.4" max="2.5" step="0.05" value="${C.sp}" data-r="sp"><b>×${(+C.sp).toFixed(2)}</b></div>
      <div class="ds">速度越大越慢（预警、蓄力越久）。</div>
      <button class="cp">复制首领设置</button>`}`;
    bbox.querySelector('.bm').onclick = () => { bmini = !bmini; brender(); };
    if (bmini) { bbox.querySelector('.bx').onclick = () => bossMode ? close() : bossPanel(false); return; }
    bbox.querySelector('.bx').onclick = () => bossMode ? close() : bossPanel(false);
    bbox.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { bsel = b.dataset.m; brender(); });
    bbox.querySelectorAll('[data-f]').forEach(e => e.onchange = () => { t.setBossCfg(bsel, { [e.dataset.f]: e.value }); });
    bbox.querySelectorAll('[data-r]').forEach(e => e.oninput = () => { const v = Math.round(+e.value * 100) / 100; t.setBossCfg(bsel, { [e.dataset.r]: v }); e.nextElementSibling.textContent = '×' + v.toFixed(2); });
    bbox.querySelector('.cp').onclick = () => { const txt = '首领设置：' + t.bossCopy(); try { navigator.clipboard.writeText(txt); } catch (e) {} bbox.querySelector('.cp').textContent = '已复制'; };
  }
  function skills(w) { const t = T(); return Object.keys(t.SK).filter(k => !t.SK[k].off && t.wepOf(k) === w).sort((a, b) => (t.SK[a].tier || 0) - (t.SK[b].tier || 0)); }
  function render() {
    const t = T(); if (!t || !box) return;
    const tabs = ORDER.map((w, i) => `<button data-t="${i}" class="${tab === i ? 'on' : ''}">${t.WEPN[w]}</button>`).join('') + `<button data-t="gf" class="${tab === 'gf' ? 'on' : ''}">心法</button><button data-t="qg" class="${tab === 'qg' ? 'on' : ''}">轻功</button>`;
    let ls = '', dt = '<span style="opacity:.6">点一招，主角就只反复放这一招。</span>';
    if (typeof tab === 'number') {
      const w = ORDER[tab], ks = skills(w);
      ls = ks.map((k, i) => { const s = t.SK[k]; return `<button data-k="${k}" class="${sel === k ? 'on' : ''}"><span style="color:${TC[s.tier || 0]}">${t.TIERN[s.tier || 0]}</span> ${i + 1}. ${s.name}<small>${MOTN[t.MOT[k]] || '—'}</small></button>`; }).join('');
      if (sel && t.SK[sel]) { const s = t.SK[sel], i = ks.indexOf(sel); dt = `<b>${t.WEPN[w]} · 第 ${i + 1} 招 · ${s.name}</b>　${t.TIERN[s.tier || 0]}阶 · 动作：${MOTN[t.MOT[sel]] || '—'}<br>${s.desc}<br><span style="opacity:.65">当前伤害倍率 ×${t.mul(sel).toFixed(2)}（出身、属性、熟练都算在内）</span><br><span style="opacity:.8">${t.spd(sel)}</span><div class="lvr">等级：${[1, 3, 5, 7, 10].map(n => `<button data-lv="${n}" class="${t.lv(sel) === n ? 'on' : ''}">LV${n}</button>`).join('')}</div>${t.rs(sel) != null ? `<div class="sl"><span>范围</span><input type="range" min="0.3" max="1.5" step="0.01" value="${t.rs(sel)}" data-sl="rs"><b>×${t.rs(sel).toFixed(2)}</b></div><div class="sl"><span>速度</span><input type="range" min="0.5" max="3" step="0.01" value="${t.sp(sel)}" data-sl="sp"><b>×${t.sp(sel).toFixed(2)}</b></div><div class="lvr sp2">${t.spd(sel)}</div>${(() => { const o = t.getPose(sel), opt = (v, w0) => (w0 ? ['无'] : []).concat(t.FRN).map(n => `<option value="${n}"${n === v ? ' selected' : ''}>${FRZ[n] || n}</option>`).join(''); return `<div class="sl ps"><span>起手</span><select data-ps="a">${opt(o.a)}</select><label><input type="checkbox" data-pf="fa"${o.fa ? ' checked' : ''}>翻转</label></div><div class="sl ps"><span>出手</span><select data-ps="b">${opt(o.b, 1)}</select><label><input type="checkbox" data-pf="fb"${o.fb ? ' checked' : ''}>翻转</label></div><div class="sl ps">${(() => { const ao = t.getAnim ? t.getAnim(sel) : { mv: 0, gh: 1 }; return `<label><input type="checkbox" data-ao="mv"${ao.mv ? ' checked' : ''}>位移（前探、跳起、倾斜）</label><label><input type="checkbox" data-ao="gh"${ao.gh ? ' checked' : ''}>残影</label>`; })()}</div><div class="pv" style="display:flex;gap:6px;align-items:flex-end">${(o.b === '无' ? ['a'] : ['a', 'b']).map(x => `<img src="art/sprites/hero_skins/${window.HERO_SKIN ? HERO_SKIN.cur() : 'baiyi'}/${t.preDir ? t.preDir(sel) : 'dao'}/${o[x]}.png" style="height:72px;image-rendering:pixelated;${o['f' + x] ? 'transform:scaleX(-1)' : ''}">`).join('<span style="opacity:.6">→</span>')}</div>`; })()}<div class="lvr"><button data-spall="1">这个速度用到全部${t.WEPN[w]}招</button></div><div class="lvr"><button data-cp="1">复制新系统武艺设置</button></div>` : ''}`; }
    } else {
      const qg = tab === 'qg', on = qg ? [t.qg()] : t.gf();
      const ids = Object.keys(t.GF).filter(id => !t.GF[id].off && !!t.GF[id].qg === qg).sort((a, b) => t.GF[a].t - t.GF[b].t);
      ls = ids.map(id => { const g = t.GF[id]; return `<button data-g="${id}" class="${on.includes(id) ? 'on' : ''}"><span style="color:${TC[g.t + 1]}">${t.TIERN[g.t + 1]}</span> ${g.n}<small>${g.cn || (qg ? '轻功' : '内功')}</small></button>`; }).join('');
      const g = sel && t.GF[sel]; dt = g ? `<b>${g.n}</b>　${t.TIERN[g.t + 1]}阶<br>${g.d || ''}` : `<span style="opacity:.6">${qg ? '点一个轻功装上（只能装一个）' : '点心法装上（最多 3 个，再点取消）'}；武艺照常放。</span>`;
    }
    box.innerHTML = `<div class="hd"><span>武学试炼</span><span>${mini ? '' : `<button class="dm">木人桩：${DUMN[dum]}</button> `}<button class="mn">${mini ? '展开' : '缩小'}</button></span></div>${mini ? '' : `<div class="dms"><span><button class="tbk">${brk ? '会碎的木人' : '不碎的木人'}</button> <button class="tsol">士兵：${sol ? '开' : '关'}</button> <button class="tng">${ng ? '新棍兵：开' : '新画风棍兵'}</button> <button class="tcy">打新程远志</button> <button class="tbp">首领试炼</button> <button class="tshow">${show ? '收起首领美术' : '首领美术对比'}</button>${sol ? ` <button class="rg">远程兵：${rng ? '开' : '关'}</button>` : ''}</span></div>${dum ? '<div class="dms"><span class="dmv">—</span><button class="dmc">清零</button></div>' : ''}<div class="tabs">${tabs}</div><div class="ls">${ls}</div><div class="dt">${dt}</div>`}`;
    box.querySelector('.mn').onclick = () => { mini = !mini; render(); };
    if (mini) return;
    const rg = box.querySelector('.rg'); if (rg) rg.onclick = () => { rng = !rng; render(); };
    box.querySelector('.dm').onclick = () => { dum = DUMO[(DUMO.indexOf(dum) + 1) % DUMO.length]; try { T().dummy(dum); } catch (e) {} render(); };
    box.querySelector('.tbk').onclick = () => { brk = brk ? 0 : 1; try { T().dummyBrk(brk); } catch (e) {} render(); };
    box.querySelector('.tng').onclick = () => { ng = ng ? 0 : 1; window.NEW_GRUNT = !!ng; regNewGrunt(); try { if (ng) { sol = 1; T().soldiers(1); for (let i = 0; i < 4; i++) T().spawn('grunt'); } T().regrunt(ng); } catch (e) {} render(); };
    box.querySelector('.tcy').onclick = () => { regNewGrunt(); try { T().newBoss(); } catch (e) { console.error(e); } };
    box.querySelector('.tbp').onclick = () => bossPanel(!bbox);
    box.querySelector('.tshow').onclick = () => { show = show ? 0 : 1; try { T().showcase(show); } catch (e) {} render(); };
    box.querySelector('.tsol').onclick = () => { sol = sol ? 0 : 1; try { T().soldiers(sol); } catch (e) {} render(); };
    const dc = box.querySelector('.dmc'); if (dc) dc.onclick = () => { try { T().dummyClear(); } catch (e) {} };
    box.querySelectorAll('.tabs button').forEach(b => b.onclick = () => { const v = b.dataset.t; tab = v === 'gf' || v === 'qg' ? v : +v; sel = null; render(); });
    box.querySelectorAll('[data-k]').forEach(b => b.onclick = () => { sel = b.dataset.k; t.setLv(sel, 1); SURV.slots.splice(0, 5, sel, '', '', '', ''); render(); });
    box.querySelectorAll('[data-lv]').forEach(b => b.onclick = () => { t.setLv(sel, +b.dataset.lv); render(); });
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
  async function enterFight() {   // 11/18 用户：武学试炼专门一张演武场——先回主界面，再走「出征 → 开局」，开局后直接进演武场（不过路线图）
    window.TRIAL_ARENA = true;
    try { if (window.ARENA && ARENA.want) ARENA.want('camp'); } catch (e) {}   // 先把演武场的图载上
    if (window.TITLE && TITLE.mode && TITLE.mode() === 'game') { if (TITLE.show) TITLE.show(); await new Promise(r => setTimeout(r, 300)); }
    const nm = document.getElementById('tName'); if (nm && !nm.value) nm.value = '试炼';
    if (window.RUNSAVE) RUNSAVE.has = () => false;
    const vis = e => e && e.getClientRects().length > 0;
    const st = document.getElementById('tStart'); if (vis(st)) st.click();
    const ask = await wait(() => document.getElementById('tNameAsk'), 2500);
    if (ask) { const ip = ask.querySelector('input'); if (ip && !ip.value) ip.value = '试炼'; const y = ask.querySelector('.yes'); if (y) y.click(); }
    const go = await wait(() => { const b = document.querySelector('#kaiju .bot .go'); return vis(b) && b; }); if (go) go.click();
    const ok = !!(await wait(() => SURV.curNode && SURV.curNode()));
    await wait(() => !window.ARENA || !ARENA.shows || ARENA.shows('camp'), 8000);   // 11/18 用户：进试炼还会先闪一下别的地图——等营地图真的画上再撤黑幕
    return ok;
  }
  async function open() {
    window.TRIAL_ON = true;
    { const t0 = document.getElementById('survTut'); if (t0) t0.remove(); }
    if (!document.getElementById('szzTrialCss')) { const s = document.createElement('style'); s.id = 'szzTrialCss'; s.textContent = css; document.head.appendChild(s); }
    if (!box) { box = document.createElement('div'); box.id = 'szzTrial'; document.body.appendChild(box); }
    box.innerHTML = '<div class="hd"><span>武学试炼 · 进场中…</span></div>';
    // 11/18 用户：试炼借的是正常的一场仗（要先开一局、在路线图上点第一格），进场时用黑幕盖住，看不到标题、开局、路线图
    let cv = document.getElementById('szzTrialCover'); if (!cv) { cv = document.createElement('div'); cv.id = 'szzTrialCover'; cv.style.cssText = 'position:fixed;inset:0;z-index:10038;background:#0c0806;display:flex;align-items:center;justify-content:center;color:#e6c98a;font:600 18px sans-serif;letter-spacing:4px'; cv.textContent = '武学试炼 · 进场中…'; document.body.appendChild(cv); }
    try { await enterFight(); } finally { setTimeout(() => { const c = document.getElementById('szzTrialCover'); if (c) c.remove(); }, 250); }
    render(); clearTimeout(godT); keep();
  }
  function close() { try { T().setLv(null); } catch (e) {} bossPanel(false); bossMode = false; if (dum) { try { T().dummy(''); } catch (e) {} } dum = 'row'; brk = 0; sol = 0; show = 0; ng = 0; window.NEW_GRUNT = false; mini = false; const wasArena = window.TRIAL_ARENA; try { T().soldiers(1); T().dummyBrk(0); } catch (e) {}
    if (wasArena && window.TITLE && TITLE.mode && TITLE.mode() === 'game' && TITLE.show) { window.TRIAL_ON = false; TITLE.show(); } window.TRIAL_ARENA = false; window.TRIAL_ON = false; clearTimeout(godT); if (box) box.remove(); box = null; }   // 演武场关掉就回主界面
  // 11/18 用户：单独一个「首领试炼」——进去直接操控首领打木头人
  let bossMode = false;
  async function openBoss() { bossMode = true; await open(); if (box) box.style.display = 'none'; bossPanel(true); }
  window.TRIAL = { open, openBoss, close, regNew: regNewGrunt };
})();
