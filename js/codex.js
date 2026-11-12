// 图鉴（11/12 用户定）：小兵、首领各一页；战斗里第一次遇到才解锁（存在 localStorage szz-codex），没遇到的显示黑剪影 + ？？？
// 入口：主界面右上角「图鉴」按钮、暂停菜单「图鉴」；开发者模式「图鉴全开」。
(() => {
  const KEY = 'szz-codex';
  let seen = {}; try { seen = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { seen = {}; }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(seen)); } catch (e) {} };
  const ALIAS = { guanhai_m: 'guanhai', guanhai_b: 'guanhai' };
  // 首领和新兵种的高清头像：写死字面路径，打包时才会换成 pack/ 网址
  const PIC = {
    guanhai: 'art/ui/boss/guanhai.webp', cheng_yuanzhi: 'art/ui/boss/cheng_yuanzhi.webp', deng_mao: 'art/ui/boss/deng_mao.webp', bo_cai: 'art/ui/boss/bo_cai.webp', he_yi: 'art/ui/boss/he_yi.webp',
    zhang_mancheng: 'art/ui/boss/zhang_mancheng.webp', ma_yuanyi: 'art/ui/boss/ma_yuanyi.webp', zhang_liang: 'art/ui/boss/zhang_liang.webp', zhang_bao: 'art/ui/boss/zhang_bao.webp', zhang_jiao: 'art/ui/boss/zhang_jiao.webp',
    'fire-jar': 'art/ui/unit/fire_jar.webp', drummer: 'art/ui/unit/drummer.webp', cavalry: 'art/ui/unit/cavalry.webp', fanatic: 'art/ui/unit/fanatic.webp', crossbow: 'art/ui/unit/crossbow.webp',
  };
  // [键, 名字, 用哪张游戏贴图（没有高清头像时用站立帧）, 出现, 一句简介, 技能]
  const UNITS = [
    ['grunt', '喽啰', 'grunt', '第 1 段起', '被裹挟入伙的流民，拿根木棍就上了阵。', ['挥棍：贴身挥一棍，伤害低。']],
    ['blade', '刀手', 'blade', '第 1 段起', '黄巾里最常见的步卒，一把环首刀砍人不眨眼。', ['劈砍：举刀蓄力后劈下，比喽啰打得重。']],
    ['slinger', '投石手', 'slinger', '第 1 段起', '放羊娃出身，甩石子百发百中。', ['投石：站在远处甩石块，看准落点就能躲。']],
    ['elite', '老卒', 'elite', '第 1 段起', '打过几场硬仗的老兵，刀口都卷了。', ['刀气：蓄力后劈出一道扇形刀气，出手不会被打断。', '精英：打倒掉 5 枚铜钱。']],
    ['thief', '黄巾窃贼', 'thief', '第 1 段起', '背着麻袋专捡地上的铜钱，打不过就跑。', ['偷钱：捡走地上的铜钱，跑掉就拿不回来。', '打倒他钱袋会破，连本带利吐出来。']],
    ['archer', '弓箭手', 'archer', '第 2 段起', '猎户入伙，箭头裹着浸了油的布。', ['火箭：抛射火箭，落地前地上有红圈预警。']],
    ['yellow-heavy', '大刀兵', 'yellow_heavy', '第 2 段起', '膀大腰圆的壮汉，抡着厚背大刀。', ['重劈：出手慢但伤害高，挨打不容易被打断。']],
    ['yellow-shield', '盾兵', 'yellow_shield', '第 2 段起', '举着木盾顶在最前排。', ['举盾：挡掉大部分远程攻击，近身才好打。']],
    ['fire-jar', '火罐手', 'fire_jar', '第 2 段起', '背着一篓火油罐的纵火贼。', ['火油罐：扔向你脚下，落地烧出一片火，3 秒内站在里面持续掉血。']],
    ['yellow-spear', '枪兵', 'yellow_spear', '第 3 段起', '长枪比人还高，专戳冲得太近的人。', ['突刺：攻击距离远，别站在枪尖前面。']],
    ['cavalry', '黄巾骑兵', 'cavalry', '第 3 段起', '骑着抢来的土马，挺矛冲阵。', ['冲锋：绕着你兜圈，停下后出一条预警线，直线冲过去。', '血比步卒厚。']],
    ['drummer', '鼓手', 'drummer', '第 3 段起', '胸前挂着战鼓，鼓声一响，黄巾就红了眼。', ['擂鼓：附近黄巾 4 秒内动作快 30%（脚下发红光）。', '自己不打人，最好先杀。']],
    ['crossbow', '黄巾弩手', 'crossbow', '第 3 段起', '端着大弩的老兵，一箭能射穿两个人。', ['穿透弩：半蹲瞄准时地上出现一条细红线，0.8 秒后射出，线上的全中。']],
    ['yellow-golem', '黄巾力士', 'yellow_golem', '第 3 段起', '喝了符水、力大无穷的巨汉。', ['重拳：一拳能把人打飞，血非常厚。', '精英：打倒掉 5 枚铜钱。']],
    ['priest', '黄巾方士', 'priest', '第 4 段起', '太平道的小道士，摇铃念咒替同伙续命。', ['念咒：躲在后排给附近黄巾回血、加速；念咒时打他能打断。']],
    ['fanatic', '狂信徒', 'fanatic', '第 4 段起', '喝了符水、不知疼痛的信徒。', ['扑击：跑得最快，冲到身边扑打。', '自爆：倒下 0.45 秒后炸开一小圈，别贴着杀。']],
    ['yellow-catapult', '投石车', 'yellow_catapult', '投石车节点', '黄巾从官府抢来的守城器械。', ['砸石：远程抛大石，落点有预警圈。', '拆掉掉 5 枚铜钱。']],
  ];
  const BOSSES = [
    ['cheng_yuanzhi', '程远志', 'cheng_yuanzhi', '第 1 段首领', '黄巾渠帅，率五万之众进犯涿郡。', ['大刀回旋：长柄大刀脱手飞出再飞回，去回都伤人；刀没回来前他空手站着。', '横扫千军：以自己为圆心大范围横扫。']],
    ['deng_mao', '邓茂', 'deng_mao', '第 1 段副将', '程远志的副将，性情暴躁，使一口九环大刀。', ['九环震地：三道裂地波扇形冲出，劈完刀卡在地里 1 秒。', '开山劈：朝你劈出一道长条。']],
    ['bo_cai', '波才', 'bo_cai', '第 2 段首领', '颍川黄巾大帅，背插令旗，号令千军。', ['令旗点兵：插下令旗，旗边不停冒兵；站到旗边 0.8 秒就能拔掉。', '旋斩：开山大斧抡圆一圈。']],
    ['he_yi', '何仪', 'he_yi', '第 2 段副将', '汝南黄巾头领，双戟在手，身法迅捷。', ['双戟连突：三段冲刺，每段重新瞄准，第三段后喘口气。', '开山劈。']],
    ['guanhai', '管亥', 'guanhai_m', '第 3 段首领', '北海黄巾猛将，马上使一杆长戟。', ['骑马：冲锋、马踏飞燕（跃起砸在你的位置）。', '半血被打下马，改用掷戟：长戟插在地上，他空手发愣后冲过去捡；还有旋斩。']],
    ['zhang_mancheng', '张曼成', 'zhang_mancheng', '第 3 段副将', '南阳黄巾首领，自称「神上使」。', ['符火阵：在你周围画一圈火，1.4 秒后烧起，只留一个缺口。', '符火落雨：你周围依次落下火球。']],
    ['zhang_liang', '张梁', 'zhang_liang_q', '第 4 段首领', '人公将军，张角三弟，以勇猛著称。', ['双刀旋风：边转边追 2.2 秒，转完头晕。', '冲锋。', '半血狂怒：更快，出招几乎不停。']],
    ['zhang_bao', '张宝', 'zhang_bao_q', '第 4 段首领', '地公将军，张角二弟，擅长妖术。', ['地裂：一道裂缝一段段朝你冲过来。', '土墙：在你身后升墙堵路，留一个缺口，5 秒后倒塌。', '半血召出两个半透明分身。']],
    ['zhang_jiao', '张角', 'zhang_jiao_q', '最终首领', '天公将军，太平道大贤良师，以《太平要术》号令天下黄巾。', ['雷符：三张符追着你飘，随后在你脚下落雷。', '天雷滚滚：全场随机落雷，其中一道必定劈在你脚下。']],
    ['ma_yuanyi', '马元义', 'ma_yuanyi', '最终副将', '潜入洛阳的黄巾大方首领，斗笠黑衣。', ['流星锤：甩出去再拉回来，去回都伤人，收锤后硬直。', '旋斩。']],
  ];
  const ALL = UNITS.concat(BOSSES);
  const body = e => (typeof ASSETS !== 'undefined' && ASSETS.chars && ASSETS.chars[e[2]] && ASSETS.chars[e[2]].idle ? ASSETS.chars[e[2]].idle[0] : '');
  const card = e => UNITS.includes(e) ? body(e) || PIC[e[0]] : PIC[e[0]] || body(e);   // 小兵格子统一用全身站立图，首领格子用头像
  const img = (e) => PIC[e[0]] || (typeof ASSETS !== 'undefined' && ASSETS.chars && ASSETS.chars[e[2]] && ASSETS.chars[e[2]].idle ? ASSETS.chars[e[2]].idle[0] : '');

  const css = document.createElement('style'); css.textContent = `
#szzCodexBtn{position:fixed;right:132px;top:8px;z-index:30;height:36px;padding:0 12px;border:1px solid rgba(139,106,53,.7);border-radius:4px;background:rgba(246,234,210,.85);color:#4a3218;font:700 15px "Songti SC","Noto Serif SC",serif;letter-spacing:.15em;cursor:pointer;display:none;box-shadow:0 2px 6px rgba(40,25,10,.25)}
#szzCodexBtn:hover{background:#fff4dc}
#szzCodex{position:fixed;inset:0;z-index:10060;display:flex;align-items:center;justify-content:center;background:rgba(6,5,4,.78)}
#szzCodex[hidden]{display:none}
#szzCodex .cx{width:min(1100px,96vw);height:min(680px,92vh);display:flex;flex-direction:column;background:linear-gradient(180deg,rgba(22,18,14,.98),rgba(10,8,6,.98));border:1px solid rgba(184,149,90,.55);box-shadow:0 10px 40px rgba(0,0,0,.7);color:#efe4cc;font-family:"PingFang SC","Microsoft YaHei",sans-serif}
#szzCodex .hd{display:flex;align-items:center;gap:14px;padding:10px 16px;border-bottom:1px solid rgba(184,149,90,.35)}
#szzCodex .hd h2{margin:0;font:700 22px "Songti SC","Noto Serif SC",serif;letter-spacing:.3em;color:#e6c98a}
#szzCodex .tb{padding:4px 14px;border:1px solid rgba(184,149,90,.4);background:transparent;color:#c9b48a;font:600 14px inherit;cursor:pointer;letter-spacing:.15em}
#szzCodex .tb.on{background:rgba(184,149,90,.22);color:#ffe2a0;border-color:rgba(230,190,110,.8)}
#szzCodex .ct{margin-left:auto;font-size:13px;color:#a8977a}
#szzCodex .x{width:32px;height:32px;border:1px solid rgba(184,149,90,.4);background:transparent;color:#e6c98a;font-size:18px;cursor:pointer}
#szzCodex .bd{flex:1;min-height:0;display:flex}
#szzCodex .gr{flex:1;min-width:0;overflow:auto;padding:12px;display:grid;grid-template-columns:repeat(auto-fill,minmax(92px,1fr));gap:10px;align-content:start}
#szzCodex .cd{height:118px;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:4px;padding:6px 4px;border:1px solid rgba(184,149,90,.25);background:rgba(255,255,255,.03);cursor:pointer}
#szzCodex .cd:hover,#szzCodex .cd.sel{border-color:rgba(240,200,120,.85);background:rgba(184,149,90,.14)}
#szzCodex .cd img{max-width:84px;max-height:82px;object-fit:contain;image-rendering:pixelated}
#szzCodex .cd span{font-size:13px;color:#e8dcc0;white-space:nowrap}
#szzCodex .lk img{filter:brightness(0) opacity(.55)}
#szzCodex .lk span{color:#7a6c58}
#szzCodex .dt{width:min(360px,40%);border-left:1px solid rgba(184,149,90,.3);padding:16px 18px;overflow:auto}
#szzCodex .dt .pic{height:190px;display:flex;align-items:center;justify-content:center;margin-bottom:10px;background:radial-gradient(ellipse at 50% 60%,rgba(184,149,90,.18),rgba(0,0,0,0) 70%)}
#szzCodex .dt .pic img{max-width:100%;max-height:100%;object-fit:contain;image-rendering:pixelated}
#szzCodex .dt h3{margin:0 0 4px;font:700 22px "Songti SC","Noto Serif SC",serif;letter-spacing:.2em;color:#ffe2a0}
#szzCodex .dt .tg{display:inline-block;margin-bottom:10px;padding:1px 8px;border:1px solid rgba(184,149,90,.5);font-size:12px;color:#c9b48a}
#szzCodex .dt p{margin:0 0 12px;line-height:1.6;color:#e8dcc0;font-size:14px}
#szzCodex .dt h4{margin:0 0 6px;font-size:13px;color:#c9a560;letter-spacing:.2em}
#szzCodex .dt ul{margin:0;padding-left:18px;font-size:13px;line-height:1.7;color:#ddd0b4}
#szzCodex .dt .no{color:#8a7a62;font-size:14px;line-height:1.7}
@media (max-aspect-ratio:1/1){#szzCodex .bd{flex-direction:column}#szzCodex .dt{width:auto;max-height:45%;border-left:0;border-top:1px solid rgba(184,149,90,.3)}#szzCodex .dt .pic{height:120px}}
@media (max-height:500px){#szzCodex .cx{height:96vh}#szzCodex .cd{height:96px}#szzCodex .cd img{max-height:62px}#szzCodex .dt .pic{height:120px}#szzCodex .hd{padding:6px 12px}#szzCodex .gr{grid-template-columns:repeat(auto-fill,minmax(80px,1fr))}}`;
  const box = document.createElement('div'); box.id = 'szzCodex'; box.hidden = true;
  box.innerHTML = '<div class="cx"><div class="hd"><h2>图鉴</h2><button type="button" class="tb" data-t="u">小兵</button><button type="button" class="tb" data-t="b">首领</button><span class="ct"></span><button type="button" class="x" aria-label="关闭">✕</button></div><div class="bd"><div class="gr"></div><div class="dt"></div></div></div>';
  let tab = 'u', sel = null;
  const list = () => tab === 'u' ? UNITS : BOSSES;
  const has = k => !!seen[k];
  function detail(e) {
    const dt = box.querySelector('.dt'); if (!e) { dt.innerHTML = '<p class="no">点左边的头像看详情。</p>'; return; }
    if (!has(e[0])) { dt.innerHTML = `<div class="pic lk"><img src="${img(e)}" alt="" style="filter:brightness(0) opacity(.55)"></div><h3>？？？</h3><span class="tg">${e[3]}</span><p class="no">尚未遇到。在战斗中第一次遇到后解锁。</p>`; return; }
    dt.innerHTML = `<div class="pic"><img src="${img(e)}" alt=""></div><h3>${e[1]}</h3><span class="tg">${e[3]}</span><p>${e[4]}</p><h4>技 能</h4><ul>${e[5].map(t => `<li>${t}</li>`).join('')}</ul>`;
  }
  function render() {
    box.querySelectorAll('.tb').forEach(b => b.classList.toggle('on', b.dataset.t === tab));
    const L = list(), n = L.filter(e => has(e[0])).length;
    box.querySelector('.ct').textContent = `已发现 ${n} / ${L.length}`;
    const gr = box.querySelector('.gr'); gr.innerHTML = '';
    for (const e of L) {
      const c = document.createElement('div'); c.className = 'cd' + (has(e[0]) ? '' : ' lk') + (sel === e ? ' sel' : '');
      c.innerHTML = `<img src="${card(e)}" alt=""><span>${has(e[0]) ? e[1] : '？？？'}</span>`;
      c.addEventListener('click', () => { sel = e; render(); });
      gr.appendChild(c);
    }
    detail(sel && L.includes(sel) ? sel : null);
  }
  box.addEventListener('click', e => {
    if (e.target === box || e.target.closest('.x')) close();
    const t = e.target.closest('.tb'); if (t) { tab = t.dataset.t; sel = null; render(); }
  });
  function open() { sel = null; render(); box.hidden = false; }
  function close() { box.hidden = true; }
  addEventListener('keydown', e => { if (!box.hidden && e.key === 'Escape') { e.stopPropagation(); close(); } }, true);
  const btn = document.createElement('button'); btn.id = 'szzCodexBtn'; btn.type = 'button'; btn.textContent = '图鉴';
  btn.addEventListener('click', open);
  const mount = () => { document.head.appendChild(css); document.body.append(box, btn); };
  if (document.body) mount(); else addEventListener('DOMContentLoaded', mount);
  setInterval(() => { const g = document.getElementById('szzSetBtn'); btn.style.display = g && g.style.display === 'block' ? 'block' : 'none'; }, 300);   // 跟着右上角齿轮：只在主界面显示
  window.CODEX = {
    see(type) { const k = ALIAS[type] || type; if (!seen[k] && ALL.some(e => e[0] === k)) { seen[k] = 1; save(); } },
    unlockAll() { for (const e of ALL) seen[e[0]] = 1; save(); if (!box.hidden) render(); },
    open, close,
  };
})();
