// 11/14 用户定：开局剧情 + 通用剧情对话框（照群侠：左边半身立绘、名字牌匾、底部长对话框；点击/空格下一句，▶ 跳一句，⏩ 跳整段，长按空格跳整段）
(function () {
  const POR = {
    hero: 'art/ui/npc/hero_lihui.webp', liubei: 'art/ui/npc/liubei_lihui.webp', guanyu: 'art/ui/npc/guanyu_lihui.webp', zhangfei: 'art/ui/npc/zhangfei_lihui.webp',
    zhangjiao: 'art/ui/npc/zhangjiao_lihui.webp', zhang_jiao: 'art/ui/npc/zhangjiao_lihui.webp', cheng_yuanzhi: 'art/ui/npc/cheng_yuanzhi_lihui.webp', bo_cai: 'art/ui/npc/bo_cai_lihui.webp', guanhai_m: 'art/ui/npc/guanhai_lihui.webp', zhang_liang: 'art/ui/npc/zhang_liang_lihui.webp', zhang_bao: 'art/ui/npc/zhang_bao_lihui.webp',
  };
  const NAME = { liubei: '刘备', guanyu: '关羽', zhangfei: '张飞', zhangjiao: '张角', zhang_jiao: '张角', cheng_yuanzhi: '程远志', bo_cai: '波才', guanhai_m: '管亥', zhang_liang: '张梁', zhang_bao: '张宝' };
  // 11/14 用户：只给大首领台词（登场一句、被打败一句），有立绘的才说
  const BLINES = {
    cheng_yuanzhi: ['涿郡的小子，敢挡黄天的路？老子这口大刀，正缺个磨刀石！', '这……这是哪来的狠角色……撤！快撤！'],
    bo_cai: ['颍川数万黄巾在此！小小乡勇，也敢来送死？', '令旗……我的令旗倒了……'],
    guanhai_m: ['北海管亥在此！谁敢上前，吃我一枪！', '好……好身手……管某认栽……'],
    zhang_liang: ['大哥的天下，谁也别想挡！给我上！', '大哥……我……撑不住了……'],
    zhang_bao: ['呵……区区凡夫，也敢窥探天道？', '妖法……竟然破了……大哥，快走……'],
    zhang_jiao: ['黄天当立！尔等蝼蚁，也敢登我祭台？', '苍天……竟不佑我黄天……'],
  };
  function boss(t, out, done) { const L = BLINES[t]; if (!L || !POR[t] || skipStory()) return false; play([{ who: t, t: L[out ? 1 : 0] }], done, 1); return true; }
  const HEAD = {};   // 只有头像的：缩小放进暗框
  const skipStory = () => { try { return localStorage.getItem('szz-skip-story') === '1'; } catch (e) { return false; } };
  const css = `
#szzStory{position:fixed;inset:0;z-index:12500;background:#0b0806;overflow:hidden;font-family:WenKai,"STKaiti","KaiTi",serif;user-select:none;-webkit-user-select:none}
#szzStory.see{background:rgba(6,4,2,.42)}#szzStory.see .sh{background:linear-gradient(180deg,transparent 40%,rgba(0,0,0,.55))}
#szzStory .bg{position:absolute;inset:0;background:center/cover no-repeat;opacity:0;transition:opacity .6s}
#szzStory .bg.on{opacity:1}
#szzStory .sh{position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.15),rgba(0,0,0,.05) 45%,rgba(0,0,0,.7))}
#szzStory .pt{position:absolute;left:2vw;bottom:14vh;height:76vh;max-width:46vw;object-fit:contain;object-position:bottom left;filter:drop-shadow(0 6px 18px rgba(0,0,0,.6));opacity:0;transform:translateX(-30px);transition:opacity .25s,transform .25s}
#szzStory .pt.on{opacity:1;transform:none}
#szzStory .pt.wd{max-width:66vw}
#szzStory .pt.hd{height:auto;width:min(30vw,360px);bottom:31vh;left:5vw;border:3px solid #8a6a32;background:#1a120c;box-shadow:0 0 0 2px #000,0 8px 24px rgba(0,0,0,.7)}
#szzStory .box{position:absolute;left:3vw;right:3vw;bottom:3vh;height:28vh;min-height:130px;background:url(art/ui/dlg/box.webp) center/100% 100% no-repeat;padding:calc(3.2vh + 18px) 4.5vw 2vh;box-sizing:border-box;color:#f3e8cf;font-size:clamp(17px,2.6vh,28px);line-height:1.7;letter-spacing:.06em;text-shadow:0 2px 0 #000}
#szzStory .nm{position:absolute;left:3.5vw;top:-3.2vh;height:clamp(40px,7vh,64px);min-width:clamp(150px,16vw,240px);padding:0 2.4vw;box-sizing:border-box;background:url(art/ui/dlg/name.webp) center/100% 100% no-repeat;display:flex;align-items:center;justify-content:center;color:#f3d08a;font-size:clamp(18px,3vh,30px);letter-spacing:.2em;text-indent:.2em}
#szzStory .nm:empty{display:none}
#szzStory .bt{position:absolute;right:2.4vw;top:-3.6vh;display:flex;gap:1vw}
#szzStory .bt button{width:clamp(40px,7vh,62px);height:clamp(40px,7vh,62px);border:0;background:center/contain no-repeat;cursor:pointer;padding:0}
#szzStory .bt .n{background-image:url(art/ui/dlg/next.webp)}#szzStory .bt .s{background-image:url(art/ui/dlg/skip.webp)}
#szzStory .bt button:hover{filter:brightness(1.3)}
#szzStory .tx b{color:#e8c47a;font-weight:400}#szzStory .tx i{color:#9fc7e8;font-style:normal}
#szzStory .hn{position:absolute;right:4vw;bottom:2.2vh;font-size:clamp(12px,1.8vh,17px);color:#a8977a;display:flex;align-items:center;gap:.6em}
#szzStory .hn em{width:clamp(16px,2.4vh,24px);height:clamp(16px,2.4vh,24px);background:url(art/ui/dlg/tri.webp) center/contain no-repeat;animation:szzTri 1s ease-in-out infinite}
@media (pointer:coarse){#szzStory .hn .k{display:none}}
@keyframes szzTri{50%{transform:translateY(4px)}}
#szzStory .nar{color:#e6d6b0}
#szzStory .hb{position:absolute;right:4vw;bottom:calc(2.2vh + 2.2em);display:flex;align-items:center;gap:8px;opacity:0;transition:opacity .15s;pointer-events:none;color:#f3d08a;font-size:clamp(12px,1.8vh,16px);letter-spacing:.2em;text-shadow:0 1px 0 #000}#szzStory .hb.on{opacity:1}#szzStory .hb b{display:block;width:clamp(120px,16vw,220px);height:clamp(12px,1.8vh,18px);padding:3px 5px;box-sizing:border-box;background:url(art/ui/hud2/barframe.webp) center/100% 100% no-repeat}#szzStory .hb i{display:block;height:100%;width:0;background:url(art/ui/hud2/bar_gold.webp) left center/100% 100% no-repeat;box-shadow:0 0 6px rgba(255,210,120,.6)}
@media (max-height:520px){#szzStory .box{height:34vh;min-height:0;font-size:15px;line-height:1.55;padding:calc(3vh + 22px) 5vw 1.5vh}#szzStory .pt{height:70vh;bottom:30vh}#szzStory .hn{font-size:11px}}
@media (orientation:portrait){#szzStory .pt{max-width:80vw;height:52vh;bottom:30vh}#szzStory .box{height:26vh}}`;
  let st = null, box = null;
  function ensure() {
    if (!document.getElementById('szzStoryCss')) { const s = document.createElement('style'); s.id = 'szzStoryCss'; s.textContent = css; document.head.appendChild(s); }
  }
  // lines: [{ who:'liubei'|'hero'|'zhangjiao'|''(旁白), name?, bg?, t:'台词' }]
  function play(lines, done, see) {
    ensure(); if (st && st.cleanup) st.cleanup(); if (box) box.remove();   // 上一段没放完就被新的一段顶掉：先把旧的键盘/点击监听拆掉
    box = document.createElement('div'); box.id = 'szzStory'; if (see) box.className = 'see';   // see：首领台词，战场半透明压暗露在后面
    box.innerHTML = '<div class="bg"></div><div class="bg"></div><div class="sh"></div><img class="pt" alt=""><div class="box"><div class="nm"></div><div class="bt"><button class="n" title="下一句"></button><button class="s" title="跳过剧情"></button></div><div class="tx"></div><div class="hb"><span>跳过</span><b><i></i></b></div><div class="hn">点击<span class="k"> / 空格</span> 继续<span class="k">　长按 跳过</span><em></em></div></div>';
    document.body.appendChild(box);
    const bgs = box.querySelectorAll('.bg'), pt = box.querySelector('.pt'), nm = box.querySelector('.nm'), tx = box.querySelector('.tx');
    st = { i: -1, lines, done, typing: 0, full: '', bgi: 0, bg: '' };
    for (const L of lines) { const u = L.who && POR[L.who]; if (u) { const im = new Image(); im.src = u; } if (L.bg) { const im = new Image(); im.src = L.bg; } }   // 一开始就把这段剧情要用的立绘、背景都预载
    const finish = () => { if (!st) return; const eat = e => { e.stopPropagation(); e.preventDefault(); }; addEventListener('click', eat, true); setTimeout(() => removeEventListener('click', eat, true), 350);   /* 11/17：点完最后一句的那一下 click 不要落到后面弹出的桃园三赠上 */ clearInterval(st.typing); holdEnd(); const d = st.done; st = null; removeEventListener('keydown', kd, true); removeEventListener('keyup', ku, true); removeEventListener('pointerdown', pd, true); box.style.transition = 'opacity .12s'; box.style.opacity = '0'; box.style.pointerEvents = 'none'; const b = box; setTimeout(() => { b.remove(); document.querySelectorAll('#szzStory').forEach(x => x.remove()); }, 130); /* 11/16 用户：最后一句到三赠有卡顿感，淡出缩到 0.12 秒 */ box = null; if (d) { try { d(); } catch (e) { console.error('story done', e); } } };   // 11/16 用户：最后一句不消失——收尾时把所有剧情层都清掉，回调出错也不卡
    const show = () => {
      st.i++; if (st.i >= st.lines.length) return finish();
      const L = st.lines[st.i];
      if (L.bg && L.bg !== st.bg) { st.bg = L.bg; const nb = bgs[st.bgi ^= 1], ob = bgs[st.bgi ^ 1]; nb.style.backgroundImage = 'url(' + L.bg + ')'; nb.classList.add('on'); ob.classList.remove('on'); }
      const src = L.who && POR[L.who];
      if (src) {   // 11/16 用户：人物和字对不上——新立绘没下载完时旧立绘会先亮出来；改成新图加载好才显示
        pt.classList.toggle('hd', !!HEAD[L.who]); pt.classList.toggle('wd', false);   // 11/17 张飞立绘带长蛇矛，是横长图，放宽
        if (pt.getAttribute('src') !== src) { pt.classList.remove('on'); pt.onload = () => { if (pt.getAttribute('src') === src) requestAnimationFrame(() => pt.classList.add('on')); }; pt.src = src; if (pt.complete && pt.naturalWidth) pt.onload(); }
        else requestAnimationFrame(() => pt.classList.add('on'));
      } else { pt.classList.remove('on'); pt.removeAttribute('src'); }
      nm.textContent = L.who ? (L.name || NAME[L.who] || '') : '';
      tx.className = 'tx' + (L.who ? '' : ' nar');
      st.full = L.t; let k = 0; clearInterval(st.typing);
      st.typing = setInterval(() => { k += 1; tx.innerHTML = st.full.slice(0, k); if (k >= st.full.length) { clearInterval(st.typing); st.typing = 0; } }, 28);
      if (window.SFX) SFX.play('j_pick0');
    };
    const next = () => { if (!st) return; if (st.typing) { clearInterval(st.typing); st.typing = 0; tx.innerHTML = st.full; return; } show(); };
    // 11/15 用户：最后一句常点不下去——改成在 window 捕获阶段收 pointerdown（游戏自己的触摸/鼠标处理会吞掉 click），点到剧情框里任何地方都算
    let lastP = 0;
    const pd = e => { if (!st || !box) return; if (!box.contains(e.target) && e.target.closest && e.target.closest('#dbg')) return;   /* 11/17 用户：最后一句一下下点又卡住——剧情是全屏的，点到哪里都算（之前只认剧情框里的元素，被别的层盖住就点不动） */ e.preventDefault(); e.stopPropagation(); const now = performance.now(); if (now - lastP < 120) return; lastP = now;
      if (e.target.closest('.s')) return finish();
      if (e.target.closest('.n')) { if (st.typing) { clearInterval(st.typing); st.typing = 0; } return show(); }
      next(); holdStart(); };
    addEventListener('pointerdown', pd, true);
    st.cleanup = () => { holdEnd(); removeEventListener('pointerup', pu, true); removeEventListener('pointercancel', pu, true); removeEventListener('keydown', kd, true); removeEventListener('keyup', ku, true); removeEventListener('pointerdown', pd, true); };
    // 11/16 用户：长按跳过加进度条——按住 0.15 秒后出现金色进度条，0.75 秒填满即跳过整段（空格或手指按住都算）
    let holdT0 = 0; const hb = box.querySelector('.hb'), hbi = hb && hb.querySelector('i');
    const holdTick = () => { if (!holdT0 || !st) return; const el = performance.now() - holdT0; if (el > 150 && hb) hb.classList.add('on'); const p = Math.max(0, (el - 150) / 600); if (hbi) hbi.style.width = Math.min(100, p * 100) + '%'; if (p >= 1) { holdEnd(); finish(); return; } requestAnimationFrame(holdTick); };
    const holdStart = () => { if (holdT0) return; holdT0 = performance.now(); requestAnimationFrame(holdTick); };
    const holdEnd = () => { holdT0 = 0; if (hb) hb.classList.remove('on'); if (hbi) hbi.style.width = '0'; };
    const pu = () => holdEnd(); addEventListener('pointerup', pu, true); addEventListener('pointercancel', pu, true);
    const isSp = e => e.code === 'Space' || e.key === ' ' || e.key === 'Spacebar' || e.keyCode === 32;   // 11/15 用户：中文输入法开着时空格的 key 是 Process，要看 code
    const kd = e => { if (!st) return; if (isSp(e) || e.key === 'Enter' || e.code === 'Enter' || e.code === 'NumpadEnter') { e.preventDefault(); e.stopImmediatePropagation(); if (e.repeat) return; next(); if (isSp(e)) holdStart(); } else if (e.key === 'Escape') { e.preventDefault(); finish(); } };
    const ku = e => { if (isSp(e)) { holdEnd(); if (st) { e.preventDefault(); e.stopImmediatePropagation(); } } };
    addEventListener('keydown', kd, true); addEventListener('keyup', ku, true);
    show();
  }
  const ORL = {   // 11/14 用户定：主角是穿越者，出身 = 穿越前是干什么的
    nongfu: '穿越前我就会种地……也罢，这条命，先跟你们走。',
    xiaozu: '退伍好几年了，没想到还得上战场……拼了！',
    liehu: '荒野求生我在行，打仗……就当打猎。算我一个。',
    shusheng: '这段历史我背得滚瓜烂熟……这一次，我要亲手改写！',
    youxia: '穿越前练过几年武术，本以为是强身健体……原来是为了今天。',
  };
  function intro(done) {
    if (skipStory()) return done && done();
    const og = window.SURV && SURV.origin ? SURV.origin() : 'nongfu', pn = (window.TITLE && TITLE.playerName && TITLE.playerName()) || '你';
    play([
      { t: '深夜，屏幕上还开着一局三国游戏……眼前忽然一黑。' },
      { bg: 'art/ui/story/bg1.webp', t: '再睁眼，是一片烧焦的田地。远处城头，飘着一面「汉」字大旗。' },
      { who: 'hero', name: pn, bg: 'art/ui/story/bg1.webp', t: '这是……哪儿？拍古装戏？' },
      { bg: 'art/ui/story/bg0.webp', t: '中平元年，巨鹿张角以「<b>苍天已死，黄天当立</b>」号令天下，三十六方同日而起，黄巾遍地。' },
      { who: 'zhangjiao', bg: 'art/ui/story/bg0.webp', t: '天公将军在此——岁在甲子，天下大吉！' },
      { bg: 'art/ui/story/bg1.webp', t: '黄巾渠帅<b>程远志</b>，引兵五万，直扑涿郡。' },
      { who: 'zhangfei', bg: 'art/ui/story/bg1.webp', t: '喂！穿得古里古怪的那个！还愣着干嘛，黄巾贼杀过来了！' },
      { who: 'liubei', bg: 'art/ui/story/bg1.webp', t: '壮士莫慌。我等三人正募乡勇讨贼，可愿同行？' },
      { who: 'hero', name: pn, bg: 'art/ui/story/bg1.webp', t: ORL[og] || ORL.nongfu },
      { who: 'guanyu', bg: 'art/ui/story/bg2.webp', t: '贼势正盛，先去村口，探探程远志的虚实。' },
      { who: 'liubei', bg: 'art/ui/story/bg2.webp', t: '出发之前，我兄弟三人，各有一份心意。' },
    ], done);
  }
  window.STORY = { play, intro, boss, active: () => !!st, skipStory };
})();
