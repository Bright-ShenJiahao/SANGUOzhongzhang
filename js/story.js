// 11/14 用户定：开局剧情 + 通用剧情对话框（照群侠：左边半身立绘、名字牌匾、底部长对话框；点击/空格下一句，▶ 跳一句，⏩ 跳整段，长按空格跳整段）
(function () {
  const POR = {
    hero: 'art/ui/npc/hero_lihui.webp', liubei: 'art/ui/npc/liubei_lihui.webp', guanyu: 'art/ui/npc/guanyu_lihui.webp', zhangfei: 'art/ui/npc/zhangfei_lihui.webp',
    zhangjiao: 'art/ui/npc/zhangjiao_lihui.webp',
  };
  const NAME = { liubei: '刘备', guanyu: '关羽', zhangfei: '张飞', zhangjiao: '张角' };
  const HEAD = {};   // 只有头像的：缩小放进暗框
  const skipStory = () => { try { return localStorage.getItem('szz-skip-story') === '1'; } catch (e) { return false; } };
  const css = `
#szzStory{position:fixed;inset:0;z-index:12500;background:#0b0806;overflow:hidden;font-family:WenKai,"STKaiti","KaiTi",serif;user-select:none;-webkit-user-select:none}
#szzStory .bg{position:absolute;inset:0;background:center/cover no-repeat;opacity:0;transition:opacity .6s}
#szzStory .bg.on{opacity:1}
#szzStory .sh{position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.15),rgba(0,0,0,.05) 45%,rgba(0,0,0,.7))}
#szzStory .pt{position:absolute;left:2vw;bottom:14vh;height:76vh;max-width:46vw;object-fit:contain;object-position:bottom left;filter:drop-shadow(0 6px 18px rgba(0,0,0,.6));opacity:0;transform:translateX(-30px);transition:opacity .25s,transform .25s}
#szzStory .pt.on{opacity:1;transform:none}
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
@media (max-height:520px){#szzStory .box{height:34vh;min-height:0;font-size:15px;line-height:1.55;padding:calc(3vh + 22px) 5vw 1.5vh}#szzStory .pt{height:70vh;bottom:30vh}#szzStory .hn{font-size:11px}}
@media (orientation:portrait){#szzStory .pt{max-width:80vw;height:52vh;bottom:30vh}#szzStory .box{height:26vh}}`;
  let st = null, box = null;
  function ensure() {
    if (!document.getElementById('szzStoryCss')) { const s = document.createElement('style'); s.id = 'szzStoryCss'; s.textContent = css; document.head.appendChild(s); }
  }
  // lines: [{ who:'liubei'|'hero'|'zhangjiao'|''(旁白), name?, bg?, t:'台词' }]
  function play(lines, done) {
    ensure(); if (box) box.remove();
    box = document.createElement('div'); box.id = 'szzStory';
    box.innerHTML = '<div class="bg"></div><div class="bg"></div><div class="sh"></div><img class="pt" alt=""><div class="box"><div class="nm"></div><div class="bt"><button class="n" title="下一句"></button><button class="s" title="跳过剧情"></button></div><div class="tx"></div><div class="hn">点击<span class="k"> / 空格</span> 继续<span class="k">　长按空格 跳过</span><em></em></div></div>';
    document.body.appendChild(box);
    const bgs = box.querySelectorAll('.bg'), pt = box.querySelector('.pt'), nm = box.querySelector('.nm'), tx = box.querySelector('.tx');
    st = { i: -1, lines, done, typing: 0, full: '', bgi: 0, bg: '' };
    const finish = () => { if (!st) return; const d = st.done; st = null; removeEventListener('keydown', kd, true); removeEventListener('keyup', ku, true); box.style.transition = 'opacity .3s'; box.style.opacity = '0'; const b = box; setTimeout(() => b.remove(), 320); box = null; if (d) d(); };
    const show = () => {
      st.i++; if (st.i >= st.lines.length) return finish();
      const L = st.lines[st.i];
      if (L.bg && L.bg !== st.bg) { st.bg = L.bg; const nb = bgs[st.bgi ^= 1], ob = bgs[st.bgi ^ 1]; nb.style.backgroundImage = 'url(' + L.bg + ')'; nb.classList.add('on'); ob.classList.remove('on'); }
      const src = L.who && POR[L.who];
      if (src) { if (pt.getAttribute('src') !== src) { pt.classList.remove('on'); pt.src = src; } pt.classList.toggle('hd', !!HEAD[L.who]); requestAnimationFrame(() => pt.classList.add('on')); } else pt.classList.remove('on');
      nm.textContent = L.who ? (L.name || NAME[L.who] || '') : '';
      tx.className = 'tx' + (L.who ? '' : ' nar');
      st.full = L.t; let k = 0; clearInterval(st.typing);
      st.typing = setInterval(() => { k += 1; tx.innerHTML = st.full.slice(0, k); if (k >= st.full.length) { clearInterval(st.typing); st.typing = 0; } }, 28);
      if (window.SFX) SFX.play('j_pick0');
    };
    const next = () => { if (!st) return; if (st.typing) { clearInterval(st.typing); st.typing = 0; tx.innerHTML = st.full; return; } show(); };
    box.querySelector('.n').onclick = e => { e.stopPropagation(); if (st && st.typing) { clearInterval(st.typing); st.typing = 0; } show(); };
    box.querySelector('.s').onclick = e => { e.stopPropagation(); finish(); };
    box.addEventListener('click', next);
    let hold = 0;
    const kd = e => { if (!st) return; if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); if (e.repeat) { if (++hold > 18) finish(); return; } hold = 0; next(); } else if (e.key === 'Escape') { e.preventDefault(); finish(); } };
    const ku = e => { if (e.key === ' ') hold = 0; };
    addEventListener('keydown', kd, true); addEventListener('keyup', ku, true);
    show();
  }
  const ORL = {   // 主角按出身说一句
    nongfu: '家里的地被烧了……这条命，跟你们走。',
    xiaozu: '小人原是营里的兵，营散了，正愁没处投奔。',
    liehu: '山里的野兽都比这帮贼人讲规矩。算我一个。',
    shusheng: '读了十年书，救不了一个人。今日便弃笔从戎！',
  };
  function intro(done) {
    if (skipStory()) return done && done();
    const og = window.SURV && SURV.origin ? SURV.origin() : 'nongfu', pn = (window.TITLE && TITLE.playerName && TITLE.playerName()) || '你';
    play([
      { bg: 'art/ui/story/bg0.webp', t: '中平元年，巨鹿张角以「<b>苍天已死，黄天当立</b>」号令天下，三十六方同日而起，黄巾遍地。' },
      { who: 'zhangjiao', bg: 'art/ui/story/bg0.webp', t: '天公将军在此——岁在甲子，天下大吉！' },
      { bg: 'art/ui/story/bg1.webp', t: '涿郡城外，流民四散。黄巾渠帅<b>程远志</b>引兵五万，直扑而来。' },
      { who: 'liubei', bg: 'art/ui/story/bg1.webp', t: '这位壮士，我等三人正募乡勇讨贼，可愿同行？' },
      { who: 'hero', name: pn, bg: 'art/ui/story/bg1.webp', t: ORL[og] || ORL.nongfu },
      { who: 'zhangfei', bg: 'art/ui/story/bg1.webp', t: '哈哈，好！又多一个能打的！' },
      { who: 'guanyu', bg: 'art/ui/story/bg2.webp', t: '贼势正盛，先去村口，探探程远志的虚实。' },
      { who: 'liubei', bg: 'art/ui/story/bg2.webp', t: '出发之前，我兄弟三人，各有一份心意。' },
    ], done);
  }
  window.STORY = { play, intro, active: () => !!st, skipStory };
})();
