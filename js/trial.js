// 11/13 武学试炼（开发者模式）：进一场不会结束的战斗，主角无敌，点哪招就只放哪招，一招一招看；心法、轻功点一下就装上
(() => {
  const MOTN = { chop: '劈', sweep: '横扫', thrust: '刺', spin: '转', up: '挑' };
  const ORDER = [0, 2, 3, 4, 7, 5, 8, 9, 1, 10];   // 刀 锤 枪 关刀 石子 弓 黄符 羽扇 剑 拳
  const TC = ['#c9b27a', '#c9b27a', '#6fb8ff', '#c58cff', '#ffb347'];
  let box = null, tab = 0, sel = null, godT = 0;
  const T = () => window.SURV && SURV.trial;
  const css = `#szzTrial{position:fixed;z-index:10040;left:8px;top:56px;width:min(330px,46vw);max-height:calc(100vh - 70px);display:flex;flex-direction:column;background:rgba(14,10,7,.93);border:1px solid #8a6a3a;color:#efe2c4;font-size:13px;box-shadow:0 6px 20px rgba(0,0,0,.6)}
#szzTrial .hd{display:flex;align-items:center;justify-content:space-between;padding:6px 8px;border-bottom:1px solid rgba(184,149,90,.35);color:#ffd86e}
#szzTrial .hd button{background:none;border:1px solid #8a6a3a;color:#e6c98a;cursor:pointer;padding:1px 8px}
#szzTrial .tabs{display:flex;flex-wrap:wrap;gap:3px;padding:6px}
#szzTrial .tabs button{flex:1 0 17%;padding:4px 0;background:#2a1d12;border:1px solid #5a4226;color:#e9cf98;cursor:pointer}
#szzTrial .tabs button.on{border-color:#ffd86e;color:#fff2c8;background:#4a3218}
#szzTrial .ls{overflow:auto;padding:0 6px 6px;display:grid;grid-template-columns:1fr 1fr;gap:4px;align-content:start}
#szzTrial .ls button{text-align:left;padding:5px 6px;background:#1c140d;border:1px solid #3a2a18;color:#efe2c4;cursor:pointer;line-height:1.25}
#szzTrial .ls button.on{border-color:#ffd86e;background:#3a2814}
#szzTrial .ls small{display:block;opacity:.65;font-size:11px}
#szzTrial .dt{border-top:1px solid rgba(184,149,90,.35);padding:7px 9px;line-height:1.55;min-height:64px}
#szzTrial .dt b{color:#ffe08a}
#szzTrial .lvr{margin-top:5px;display:flex;gap:4px;flex-wrap:wrap}#szzTrial .lvr button{padding:2px 7px;font-size:12px;background:#1c140d;border:1px solid #3a2a18;color:#efe2c4;cursor:pointer}#szzTrial .lvr button.on{border-color:#ffd86e;background:#3a2814}
@media (max-aspect-ratio:1/1){#szzTrial{left:0;right:0;top:auto;bottom:0;width:auto;max-height:46vh}#szzTrial .ls{grid-template-columns:1fr 1fr 1fr}}`;
  function skills(w) { const t = T(); return Object.keys(t.SK).filter(k => !t.SK[k].off && t.wepOf(k) === w).sort((a, b) => (t.SK[a].tier || 0) - (t.SK[b].tier || 0)); }
  function render() {
    const t = T(); if (!t || !box) return;
    const tabs = ORDER.map((w, i) => `<button data-t="${i}" class="${tab === i ? 'on' : ''}">${t.WEPN[w]}</button>`).join('') + `<button data-t="gf" class="${tab === 'gf' ? 'on' : ''}">心法</button><button data-t="qg" class="${tab === 'qg' ? 'on' : ''}">轻功</button>`;
    let ls = '', dt = '<span style="opacity:.6">点一招，主角就只反复放这一招。</span>';
    if (typeof tab === 'number') {
      const w = ORDER[tab], ks = skills(w);
      ls = ks.map((k, i) => { const s = t.SK[k]; return `<button data-k="${k}" class="${sel === k ? 'on' : ''}"><span style="color:${TC[s.tier || 0]}">${t.TIERN[s.tier || 0]}</span> ${i + 1}. ${s.name}<small>${MOTN[t.MOT[k]] || '—'}</small></button>`; }).join('');
      if (sel && t.SK[sel]) { const s = t.SK[sel], i = ks.indexOf(sel); dt = `<b>${t.WEPN[w]} · 第 ${i + 1} 招 · ${s.name}</b>　${t.TIERN[s.tier || 0]}阶 · 动作：${MOTN[t.MOT[sel]] || '—'}<br>${s.desc}<br><span style="opacity:.65">当前伤害倍率 ×${t.mul(sel).toFixed(2)}（出身、属性、熟练都算在内）</span><br><span style="opacity:.8">${t.spd(sel)}</span><div class="lvr">等级：${[1, 3, 5, 7, 10].map(n => `<button data-lv="${n}" class="${t.lv(sel) === n ? 'on' : ''}">LV${n}</button>`).join('')}</div>${t.rs(sel) != null ? `<div class="lvr">范围：${[.4, .5, .6, .65, .7, .75, .8, .9, 1, 1.2].map(v => `<button data-rs="${v}" class="${t.rs(sel) === v ? 'on' : ''}">×${v}</button>`).join('')}</div><div class="lvr"><button data-cp="1">复制全部刀范围（发给 Claude）</button></div>` : ''}`; }
    } else {
      const qg = tab === 'qg', on = qg ? [t.qg()] : t.gf();
      const ids = Object.keys(t.GF).filter(id => !t.GF[id].off && !!t.GF[id].qg === qg).sort((a, b) => t.GF[a].t - t.GF[b].t);
      ls = ids.map(id => { const g = t.GF[id]; return `<button data-g="${id}" class="${on.includes(id) ? 'on' : ''}"><span style="color:${TC[g.t + 1]}">${t.TIERN[g.t + 1]}</span> ${g.n}<small>${g.cn || (qg ? '轻功' : '内功')}</small></button>`; }).join('');
      const g = sel && t.GF[sel]; dt = g ? `<b>${g.n}</b>　${t.TIERN[g.t + 1]}阶<br>${g.d || ''}` : `<span style="opacity:.6">${qg ? '点一个轻功装上（只能装一个）' : '点心法装上（最多 3 个，再点取消）'}；武艺照常放。</span>`;
    }
    box.innerHTML = `<div class="hd"><span>武学试炼</span><button class="x">关闭</button></div><div class="tabs">${tabs}</div><div class="ls">${ls}</div><div class="dt">${dt}</div>`;
    box.querySelector('.x').onclick = close;
    box.querySelectorAll('.tabs button').forEach(b => b.onclick = () => { const v = b.dataset.t; tab = v === 'gf' || v === 'qg' ? v : +v; sel = null; render(); });
    box.querySelectorAll('[data-k]').forEach(b => b.onclick = () => { sel = b.dataset.k; t.setLv(sel, 1); SURV.slots.splice(0, 5, sel, '', '', '', ''); render(); });
    box.querySelectorAll('[data-lv]').forEach(b => b.onclick = () => { t.setLv(sel, +b.dataset.lv); render(); });
    box.querySelectorAll('[data-rs]').forEach(b => b.onclick = () => { t.setRs(sel, +b.dataset.rs); render(); });   // 11/14：范围缩放，存本机
    box.querySelectorAll('[data-cp]').forEach(b => b.onclick = () => { const txt = '刀范围（武学试炼调好）：\n' + t.rsAll();
      const ta = document.createElement('textarea'); ta.value = txt; ta.readOnly = true; ta.style.cssText = 'width:100%;height:150px;margin-top:6px;font-size:12px;background:#120c07;color:#efe2c4;border:1px solid #6a4a28';
      b.parentNode.appendChild(ta); ta.select(); let ok = false; try { ok = document.execCommand('copy'); } catch (e) {} try { if (navigator.clipboard) navigator.clipboard.writeText(txt).then(() => { b.textContent = '已复制 ✓（下面也能手动全选复制）'; }).catch(() => {}); } catch (e) {} if (ok) b.textContent = '已复制 ✓（下面也能手动全选复制）'; });   // 11/14：看各等级的样子（锁定等级，放招不再涨）
    box.querySelectorAll('[data-g]').forEach(b => b.onclick = () => { const id = b.dataset.g; sel = id;
      if (tab === 'qg') t.setQg(t.qg() === id ? '' : id);
      else { let g = t.gf().filter(x => x); g = g.includes(id) ? g.filter(x => x !== id) : g.concat([id]).slice(-3); t.setGf(g); }
      render(); });
  }
  function keep() {   // 无敌 + 关卡不结束
    if (!box) return;
    try { if (typeof hero !== 'undefined' && hero && typeof maxHeroHp === 'function') hero.hp = maxHeroHp(); if (T()) T().long(); } catch (e) {}
    godT = setTimeout(keep, 400);
  }
  const wait = (f, ms = 6000) => new Promise(res => { const t0 = Date.now(); const k = () => { const v = f(); if (v) res(v); else if (Date.now() - t0 > ms) res(null); else setTimeout(k, 120); }; k(); });
  async function enterFight() {   // 不在战斗里：自动走 标题 → 开局 → 路线第一格
    if (window.TITLE && TITLE.mode && TITLE.mode() === 'game' && SURV.curNode && SURV.curNode() && !(ROUTE.shown && ROUTE.shown())) return true;
    const nm = document.getElementById('tName'); if (nm && !nm.value) nm.value = '试炼';
    if (window.RUNSAVE) RUNSAVE.has = () => false;
    const vis = e => e && e.getClientRects().length > 0;
    const st = document.getElementById('tStart'); if (vis(st)) st.click();
    const ask = await wait(() => document.getElementById('tNameAsk'), 2500);   // 11/14：「新的开始」之后要先报名号
    if (ask) { const ip = ask.querySelector('input'); if (ip && !ip.value) ip.value = '试炼'; const y = ask.querySelector('.yes'); if (y) y.click(); }
    const go = await wait(() => { const b = document.querySelector('#kaiju .bot .go'); return vis(b) && b; }); if (go) go.click();
    await wait(() => window.TITLE && TITLE.mode && TITLE.mode() === 'game'); await new Promise(r => setTimeout(r, 1200));
    try { const r = ROUTE.debug(), n = (r.nodes || []).flat().find(x => x && x.layer === 1); ROUTE.choose(n); } catch (e) {}
    return !!(await wait(() => SURV.curNode && SURV.curNode()));
  }
  async function open() {
    window.TRIAL_ON = true;
    if (!document.getElementById('szzTrialCss')) { const s = document.createElement('style'); s.id = 'szzTrialCss'; s.textContent = css; document.head.appendChild(s); }
    if (!box) { box = document.createElement('div'); box.id = 'szzTrial'; document.body.appendChild(box); }
    box.innerHTML = '<div class="hd"><span>武学试炼 · 进场中…</span></div>';
    await enterFight(); render(); clearTimeout(godT); keep();
  }
  function close() { try { T().setLv(null); } catch (e) {} window.TRIAL_ON = false; clearTimeout(godT); if (box) box.remove(); box = null; }
  window.TRIAL = { open, close };
})();
