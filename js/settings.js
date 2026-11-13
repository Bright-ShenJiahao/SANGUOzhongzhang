// 设置（11/11 用户要）：音乐音量、音效音量、震屏开关。存在 localStorage，主界面右上角 ⚙ 和暂停菜单都能打开。
(() => {
  const KEY = 'szz-set';
  const DEF = { bgm: .8, sfx: .8, shake: true };
  let v = Object.assign({}, DEF);
  try { Object.assign(v, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) {}
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) {} };

  const st = document.createElement('style');
  st.textContent = `
#szzSetBtn{position:fixed;right:88px;top:8px;z-index:30;width:36px;height:36px;border:1px solid rgba(139,106,53,.7);border-radius:4px;background:rgba(246,234,210,.85);color:#4a3218;font:20px sans-serif;cursor:pointer;display:none;box-shadow:0 2px 6px rgba(40,25,10,.25)}
#szzSetBtn:hover{background:#fff4dc}
#szzSet{position:fixed;inset:0;z-index:12000;display:flex;align-items:center;justify-content:center;background:rgba(4,3,2,.62);font-family:"PingFang SC","Microsoft YaHei",sans-serif;color:#e6dccb}
#szzSet[hidden]{display:none}
#szzSet .p{position:relative;width:min(420px,90vw);box-sizing:border-box;padding:34px 28px 22px;border:1px solid rgba(184,149,90,.6);background:linear-gradient(180deg,rgba(22,19,16,.97),rgba(10,9,8,.97));box-shadow:inset 0 0 0 1px rgba(0,0,0,.7),0 10px 30px rgba(0,0,0,.6)}
#szzSet h3{position:absolute;left:50%;top:-17px;transform:translateX(-50%);margin:0;padding:3px 26px;border:1px solid rgba(184,149,90,.6);background:#140f0b;color:#e6c98a;font:700 19px "Songti SC","Noto Serif SC",serif;letter-spacing:.4em;text-indent:.4em;white-space:nowrap}
#szzSet .row{display:flex;align-items:center;gap:14px;margin:14px 0}
#szzSet .row label{flex:none;width:64px;font-weight:700;color:#cdb68a}
#szzSet input[type=range]{flex:1;accent-color:#c9a35a;height:28px}
#szzSet .row b{width:42px;text-align:right;font:900 15px "Arial Black",Impact,sans-serif;color:#efe4cc}
#szzSet .tg{flex:1;display:flex;gap:8px}
#szzSet .tg button,#szzSet .ok{flex:1;min-height:38px;border:1px solid rgba(184,149,90,.5);border-radius:2px;background:linear-gradient(180deg,rgba(44,36,27,.95),rgba(18,15,12,.95));color:#a8977a;font:700 15px inherit;cursor:pointer}
#szzSet .tg button.on{border-color:#e2c27a;color:#f6e6bd;background:linear-gradient(180deg,rgba(84,64,34,.95),rgba(36,27,16,.95))}
#szzSet .ok{display:block;width:60%;margin:20px auto 0;color:#e3cf9f;font-size:17px}
#szzSet small{display:block;margin-top:10px;color:#8f7c5e;font-size:12px;text-align:center}
`;
  document.head.appendChild(st);

  const box = document.createElement('div'); box.id = 'szzSet'; box.hidden = true;
  const pct = x => Math.round(x * 100);
  const hintOff = () => { try { return localStorage.getItem('szz-hint-off') === '1'; } catch (e) { return false; } };
  function render() {
    box.innerHTML = `<div class="p"><h3>设置</h3>
      <div class="row"><label>音乐</label><input type="range" min="0" max="100" step="5" value="${pct(v.bgm)}" data-k="bgm"><b>${pct(v.bgm)}</b></div>
      <div class="row"><label>音效</label><input type="range" min="0" max="100" step="5" value="${pct(v.sfx)}" data-k="sfx"><b>${pct(v.sfx)}</b></div>
      <div class="row"><label>静音</label><div class="tg tm"><button data-m="1" class="${window.SFX && SFX.isMuted() ? 'on' : ''}">开</button><button data-m="0" class="${window.SFX && SFX.isMuted() ? '' : 'on'}">关</button></div></div>
      <div class="row"><label>震屏</label><div class="tg"><button data-s="1" class="${v.shake ? 'on' : ''}">开</button><button data-s="0" class="${v.shake ? '' : 'on'}">关</button></div></div>
      <div class="row"><label>困难模式</label><div class="tg th"><button data-h="1" class="${window.TITLE && TITLE.hardMode && TITLE.hardMode() ? 'on' : ''}">开</button><button data-h="0" class="${window.TITLE && TITLE.hardMode && TITLE.hardMode() ? '' : 'on'}">关</button></div></div>
      <div class="row"><label>全屏提醒</label><div class="tg tp"><button data-p="1" class="${hintOff() ? '' : 'on'}">开</button><button data-p="0" class="${hintOff() ? 'on' : ''}">关</button></div></div>
      <small style="margin-top:2px">困难模式：敌人更强，积分 1.25 倍</small>
      <button class="ok">关闭</button><small>设置会自动保存</small></div>`;
    box.querySelectorAll('input[type=range]').forEach(r => r.addEventListener('input', () => {
      v[r.dataset.k] = +r.value / 100; r.nextElementSibling.textContent = r.value; save();
      if (r.dataset.k === 'sfx' && window.SFX && SFX.refreshVol) SFX.refreshVol();
      if (r.dataset.k === 'sfx' && window.SFX) SFX.play('j_pick0');
    }));
    box.querySelectorAll('.tm button').forEach(b => b.addEventListener('click', () => { if (window.SFX && SFX.isMuted() !== (b.dataset.m === '1')) SFX.toggleMute(); render(); }));   // 11/13：静音放进设置
    box.querySelectorAll('.th button').forEach(b => b.addEventListener('click', () => { if (window.TITLE && TITLE.setHard) TITLE.setHard(b.dataset.h === '1'); render(); }));   // 11/13：困难模式、关闭提醒从主界面挪进设置
    box.querySelectorAll('.tp button').forEach(b => b.addEventListener('click', () => { try { localStorage.setItem('szz-hint-off', b.dataset.p === '1' ? '0' : '1'); } catch (e) {} const i = document.querySelector('#tHintOff input'); if (i) i.checked = hintOff(); render(); }));
    box.querySelectorAll('.tg:not(.tm):not(.th):not(.tp) button').forEach(b => b.addEventListener('click', () => { v.shake = b.dataset.s === '1'; save(); render(); }));
    box.querySelector('.ok').addEventListener('click', close);
  }
  function open() { const hp = document.getElementById('tHelpPanel'); if (hp) hp.style.display = 'none'; const cx = document.getElementById('szzCodex'); if (cx) cx.hidden = true; render(); box.hidden = false; }   // 11/13：不和帮助、图鉴叠在一起
  function close() { box.hidden = true; }
  box.addEventListener('pointerdown', e => { if (e.target === box) close(); });

  const btn = document.createElement('button'); btn.id = 'szzSetBtn'; btn.type = 'button'; btn.title = '设置'; btn.textContent = '设置';
  btn.addEventListener('click', open);
  const mount = () => { document.body.append(box, btn); };
  if (document.body) mount(); else addEventListener('DOMContentLoaded', mount);
  // 主界面才显示右上角齿轮（「新的旅途」按钮看得见 = 在主界面）
  setInterval(() => { const s = document.getElementById('tStart'); const cs = s && getComputedStyle(s); const onT = !!(s && s.getClientRects().length && cs.display !== 'none' && cs.visibility !== 'hidden' && +cs.opacity > .05); btn.style.display = onT ? 'block' : 'none'; document.body.classList.toggle('ontitle', onT); /* tStart 是 fixed 定位，offsetParent 永远是 null，不能用 */ }, 250);

  window.SZZSET = { get: k => v[k], open, close };
})();
