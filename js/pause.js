// 战斗暂停与安全退出；战斗状态检查和重开/退出由 game.js 的窄接口提供。
(() => {
  let paused = false, elapsed = 0;
  const style = document.createElement('style');
  style.id = 'pauseStyle';
  style.textContent = `
    #bPause{width:40px;height:42px;min-width:40px;padding:0;display:flex;align-items:center;justify-content:center;gap:3px}
    #bPause .pause-icon-bar{display:block;width:4px;height:16px;border-radius:2px;background:currentColor}
    #bPause[hidden]{display:none!important}
    #pauseScreen{position:fixed;inset:0;z-index:40;display:flex;align-items:center;justify-content:center;padding:12px;box-sizing:border-box;background:rgba(8,6,5,.76);color:#f2dfb9;font-family:"PingFang SC","Microsoft YaHei",sans-serif}
    #pauseScreen[hidden],#pauseMenu[hidden],#pauseConfirm[hidden]{display:none!important}
    .pause-paper{box-sizing:border-box;width:min(390px,92vw);max-height:94dvh;overflow:auto;padding:clamp(22px,5vh,42px) clamp(26px,6vw,54px);background-position:center;background-size:100% 100%;filter:drop-shadow(0 12px 28px #000b);text-align:center}
    .pause-paper h2{margin:8px 0 18px;color:#583b20;font:700 clamp(25px,5vh,34px) MaShanZheng,"STKaiti",serif;text-shadow:0 1px #f5e2b4}
    .pause-actions{display:grid;gap:9px}
    .pause-action{box-sizing:border-box;width:100%;min-height:48px;padding:8px 14px;border:1px solid #9e7541;border-radius:6px;background-position:center;background-size:100% 100%;color:#f7e5bd;font:700 17px MaShanZheng,"STKaiti",serif;text-shadow:0 1px 2px #2d1b0e;cursor:pointer;touch-action:manipulation}
.pause-action.kb-sel{outline:2px solid #ffd86e;outline-offset:2px;filter:brightness(1.18)}
    .pause-action:active{transform:translateY(1px);filter:brightness(1.12)}
    .pause-volume{margin:13px 0 0;color:#593c21;font-size:14px}
    .pause-volume button{min-height:44px;margin-left:8px;padding:5px 12px;border:1px solid #8b673b;border-radius:5px;background:#513821;color:#f6e1b5;font-weight:700;touch-action:manipulation}
    #pauseConfirm .pause-paper{width:min(430px,92vw)}
    #pauseConfirm p{margin:8px 0 18px;color:#4d341e;font-size:16px;line-height:1.7}
    .pause-confirm-actions{display:flex;gap:10px;justify-content:center}
    .pause-confirm-actions .pause-action{flex:1;min-height:48px}
    /* 11/14 用户：暂停照开战牌匾 / 整备屏重做——金边云纹面板、牌匾标题、深色金边按钮、楷书 */
    #pauseScreen{background:rgba(6,4,3,.62)!important}
    #pauseScreen .pause-paper{overflow:visible!important;max-height:none!important;width:min(400px,90vw)!important;padding:clamp(30px,6vh,46px) clamp(26px,4vw,40px) clamp(20px,4vh,30px)!important;border:clamp(30px,5.5vh,46px) solid transparent;border-image:url(art/ui/prep/panel.webp) 72 fill stretch;background:none!important;filter:drop-shadow(0 14px 30px rgba(0,0,0,.7))!important;position:relative}
    #pauseScreen .pause-paper h2{position:absolute;left:50%;top:clamp(-62px,-9vh,-44px);transform:translateX(-50%);margin:0!important;white-space:nowrap;padding:0 clamp(44px,6vw,64px);height:clamp(48px,8vh,60px);display:flex;align-items:center;background:url(art/ui/hud/bian.webp) center/100% 100% no-repeat;font:400 clamp(22px,3.8vh,28px) WenKai,MaShanZheng,serif!important;letter-spacing:.3em;color:#f0d89a!important;text-shadow:0 2px 0 #1a0e05!important}
    #pauseScreen .pause-actions{display:grid!important;grid-template-columns:1fr!important;gap:10px!important;margin-top:6px}
    #pauseScreen .pause-action{min-height:46px;border:1px solid rgba(184,149,90,.65)!important;border-radius:2px!important;background:linear-gradient(180deg,rgba(44,36,27,.95),rgba(18,15,12,.95))!important;box-shadow:inset 0 0 0 1px rgba(0,0,0,.6)!important;color:#e3cf9f!important;font:400 clamp(18px,3vh,21px) WenKai,MaShanZheng,serif!important;letter-spacing:.25em}
    #pauseScreen .pause-action:hover,#pauseScreen .pause-action.kb-sel{border-color:#e2c27a!important;color:#fff0cc!important;filter:none!important;outline:none!important}
    #pauseScreen .pause-action.main{color:#ffe2a0!important;border-color:#c9a35e!important}#pauseScreen .pause-action.quit{color:#d9a59a!important}
    #pauseConfirm .pause-paper p{color:#e2d4b6!important;font:400 clamp(15px,2.5vh,18px)/1.7 WenKai,MaShanZheng,serif!important}
    #pauseScreen .pause-confirm-actions{display:flex;gap:10px}
    @media(pointer:coarse){#bPause{width:46px;height:46px;min-width:46px}}
    @media(max-height:430px){.pause-paper{padding:26px 30px 14px;max-height:96dvh}.pause-paper h2{margin:6px 0 8px;font-size:24px}.pause-actions{grid-template-columns:1fr 1fr;gap:6px}.pause-action{min-height:44px;padding:5px 9px;font-size:15px}.pause-volume{margin-top:7px}.pause-volume button{min-height:40px}}
  `;
  document.head.appendChild(style);

  const pauseButton = document.createElement('button');
  pauseButton.id = 'bPause'; pauseButton.type = 'button';
  pauseButton.innerHTML = '<span class="pause-icon-bar" aria-hidden="true"></span><span class="pause-icon-bar" aria-hidden="true"></span>';
  pauseButton.title = '暂停'; pauseButton.setAttribute('aria-label', '暂停'); pauseButton.hidden = true;
  const toolbar = document.getElementById('wp'), muteButton = document.getElementById('bMute');
  if (toolbar) muteButton ? muteButton.after(pauseButton) : toolbar.append(pauseButton);

  const screen = document.createElement('div'); screen.id = 'pauseScreen'; screen.hidden = true;
  const menu = document.createElement('section'); menu.id = 'pauseMenu'; menu.className = 'pause-paper'; menu.setAttribute('role', 'dialog'); menu.setAttribute('aria-modal', 'true'); menu.setAttribute('aria-labelledby', 'pauseTitle');
  const confirm = document.createElement('section'); confirm.id = 'pauseConfirm'; confirm.hidden = true;
  const scroll = typeof ASSETS !== 'undefined' && ASSETS.ui && ASSETS.ui.scroll;
  const btn = typeof ASSETS !== 'undefined' && ASSETS.ui && ASSETS.ui.btn;
  
  menu.innerHTML = '<h2 id="pauseTitle">暂 停</h2><div class="pause-actions"><button class="pause-action main" data-pause="resume">继续战斗</button><button class="pause-action" data-pause="codex">图鉴</button><button class="pause-action" data-pause="settings">设置</button><button class="pause-action quit" data-pause="home">返回主界面</button></div>';   // 11/14 用户：去掉无名之辈留下的「重新开始 / 返回整备 / 重新载入」
  menu.querySelectorAll('.pause-action').forEach(b => { b.type = 'button'; });
  const volumeButton = menu.querySelector('[data-pause="volume"]');
  confirm.innerHTML = '<section class="pause-paper"><h2>返回主界面</h2><p>确定退出这一局？已拾取的装备会保留。</p><div class="pause-confirm-actions"><button class="pause-action" data-confirm="yes">确定</button><button class="pause-action" data-confirm="no">取消</button></div></section>';
  
  
  screen.append(menu, confirm); document.body.appendChild(screen);

  const game = () => window.GAME_PAUSE;
  const allowed = () => !!(game() && game().canPause && game().canPause());
  function syncVolume() {
    const muted = !!(window.SFX && SFX.isMuted && SFX.isMuted());
    if (volumeButton) { volumeButton.textContent = muted ? '🔇 已静音' : '🔊 已开启'; volumeButton.setAttribute('aria-label', muted ? '开启音量' : '关闭音量'); }
  }
  function setPaused(value) {
    if (value && !allowed()) return false;
    paused = !!value;
    screen.hidden = !paused; confirm.hidden = true; menu.hidden = false;
    document.body.classList.toggle('szz-paused', paused);
    pauseButton.setAttribute('aria-label', paused ? '继续游戏' : '暂停');
    pauseButton.title = paused ? '继续游戏' : '暂停';
    if (paused) {
      elapsed = 0;
      if (game().clearInput) game().clearInput();
      if (window.SFX && SFX.setPauseDucked) SFX.setPauseDucked(true);
      if (window.BGM && BGM.setPauseDucked) BGM.setPauseDucked(true);
      syncVolume();
    } else {
      if (window.SFX && SFX.setPauseDucked) SFX.setPauseDucked(false);
      if (window.BGM && BGM.setPauseDucked) BGM.setPauseDucked(false);
    }
    return true;
  }
  function ask(action) {
    confirm.querySelector('p').textContent='回到主界面？这一仗打到一半的进度不会保存；上一次回到长卷时已经自动存档，从主界面可以接着玩。';
    confirm.dataset.action = action; menu.hidden = true; confirm.hidden = false;
  }
  function execute(action) {
    if(action==='reload'){location.reload();return;}
    const api = game(); setPaused(false);
    if (!api) return;
    if (action === 'restart' && api.restart) api.restart();
    else if (action === 'preparation' && api.returnPreparation) api.returnPreparation();
    else if (action === 'home' && api.returnHome) api.returnHome();
  }
  pauseButton.addEventListener('click', () => setPaused(!paused));
  menu.addEventListener('click', e => {
    const action = e.target.closest('[data-pause]')?.dataset.pause;
    if (action === 'resume') setPaused(false);
    else if (action === 'restart' || action === 'preparation' || action === 'home' || action === 'reload') ask(action);
    else if (action === 'settings') { if (window.SZZSET) SZZSET.open(); }
    else if (action === 'codex') { if (window.CODEX) CODEX.open(); }
    else if (action === 'volume') {
      if (window.SFX && SFX.toggleMute) SFX.toggleMute(); else if (muteButton) muteButton.click();
      syncVolume();
    }
  });
  confirm.addEventListener('click', e => {
    const yes = e.target.closest('[data-confirm]')?.dataset.confirm;
    if (yes === 'no') { confirm.hidden = true; menu.hidden = false; }
    if (yes === 'yes') execute(confirm.dataset.action);
  });
  // 键盘操作：方向键 / WASD 选择，J / 回车 / 空格 确认，Esc 返回或继续
  let sel = 0;
  const panel = () => confirm.hidden ? menu : confirm;
  const options = () => [...panel().querySelectorAll('.pause-action')].filter(b => b.offsetParent !== null);
  function mark() { const list = options(); sel = Math.max(0, Math.min(list.length - 1, sel)); document.querySelectorAll('#pauseScreen .kb-sel').forEach(b => b.classList.remove('kb-sel')); if (list[sel]) list[sel].classList.add('kb-sel'); }
  function cols() { const g = panel().querySelector('.pause-actions,.pause-confirm-actions'); if (!g) return 1; if (g.classList.contains('pause-confirm-actions')) return 99; return (getComputedStyle(g).gridTemplateColumns || '').split(' ').filter(Boolean).length || 1; }
  function onKey(e) {
    if (!allowed() || e.repeat && !/Arrow|Key[WASD]/.test(e.code)) return;
    if (!paused) { if (['Escape', 'KeyP'].includes(e.code)) { e.preventDefault(); e.stopImmediatePropagation(); setPaused(true); sel = 0; mark(); } return; }
    const k = e.code, list = options(), c = cols();
    let used = true;
    if (k === 'ArrowDown' || k === 'KeyS') sel = Math.min(list.length - 1, sel + Math.min(c, list.length));
    else if (k === 'ArrowUp' || k === 'KeyW') sel = Math.max(0, sel - Math.min(c, list.length));
    else if (k === 'ArrowRight' || k === 'KeyD') sel = Math.min(list.length - 1, sel + 1);
    else if (k === 'ArrowLeft' || k === 'KeyA') sel = Math.max(0, sel - 1);
    else if (k === 'Enter' || k === 'Space' || k === 'KeyJ' || k === 'NumpadEnter') { const b = list[sel]; if (b) { const back = confirm.hidden; b.click(); if (paused) { sel = back && !confirm.hidden ? 1 : 0; } } }
    else if (k === 'Escape' || k === 'KeyP' || k === 'KeyK') { if (!confirm.hidden) { confirm.hidden = true; menu.hidden = false; sel = 0; } else setPaused(false); }
    else used = false;
    if (used) { e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); if (paused) mark(); }
  }
  pauseButton.addEventListener('click', () => { if (paused) { sel = 0; mark(); } });
  window.addEventListener('keydown', onKey, true);
  // 11/11：去掉「窗口失焦就暂停」——在内嵌浏览器/分屏里一点别处就会误暂停（用户报一进游戏就是暂停）；切到后台（页面隐藏）仍会暂停
  document.addEventListener('visibilitychange', () => { if (document.hidden && allowed()) setPaused(true); });

  window.PAUSE = {
    paused: () => paused,
    update(dt) { if (paused) elapsed += dt; },
    syncButton() {
      const show = allowed(); pauseButton.hidden = !show;
      if (!show && paused) setPaused(false);
    },
  };
})();
