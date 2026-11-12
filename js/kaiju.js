// 开局配置（三国终章，用户定 11/09）：照三国幸存者的三栏布局。
// 左：称号 / 势力 / 出身；中：所选战场；右：兵籍牒（属性 + 起手武艺）。整军备战不要了。
(() => {
  const WEP = [['dao', '刀', true], ['jian', '剑'], ['chui', '锤'], ['qiang', '枪'], ['guandao', '关刀'], ['gong', '弓']];   // 兵器路数（11/11）：只有刀有美术，其余上锁
  let axSel = -1;
  const FIELDS = [
    { name: '黄巾之乱', sub: '第一章 · 中平元年', note: '从涿郡一路杀到张角祭坛：18 层、4 位段首领、终战张角。', open: true, pic: 'art/ui/kaiju/field1.webp' },
    { name: '董卓乱京', sub: '第二章 · 中平六年', note: '西凉铁骑入洛阳，京城大乱。第二章 · 暂未开放', open: false, pic: 'art/ui/kaiju/field2.webp' },   // 11/11 用户定：先放出来，但不能选
  ];
  const K2 = n => 'art/ui/kaiju2/' + n + '.webp';   // 11/13 用户出的「汉代漆器」红黑零件
  const OGI = { nongfu: K2('og_nongfu'), xiaozu: K2('og_xiaozu'), liehu: K2('og_liehu'), shusheng: K2('og_shusheng') };
  const SKI = { hengsao: 'art/ui/kaiju/sk_hengsao.webp', daobo: 'art/ui/kaiju/sk_daobo.webp', huima: 'art/ui/kaiju/sk_huima.webp', daolun: 'art/ui/kaiju/sk_daolun.webp' };   // 武艺图标（11/11 Gemini）
  const PIC = { bg: 'art/ui/kaiju/bg.webp', field1: 'art/ui/kaiju/field1.webp', std: K2('diff_std'), hard: K2('diff_hard'), plate: 'art/ui/kaiju/plate.webp' };
  let el = null, field = 0, name = '无名';
  // 11/11 改版（用户给了美术）：宣纸水墨背景 + 深色木框面板压在纸上；出身/难度做成「图标 + 名字 + 一句话」卡片
  const CSS = `
  #kaiju{position:fixed;inset:0;z-index:10005;background:#ecd9c0 url('${PIC.bg}') center/cover no-repeat;color:#e8dcc0;
    font-family:"PingFang SC","Microsoft YaHei","Noto Sans CJK SC",sans-serif;font-weight:500;--k:1;--gd:#c9a45c;--gl:#f0d89a;--ink:#121110;--ink2:#1c1a17;--rd:#a8823f;--rdd:#4d3f27;display:flex;flex-direction:column;
    padding:0 calc(14px + env(safe-area-inset-right)) calc(10px + env(safe-area-inset-bottom)) calc(14px + env(safe-area-inset-left));box-sizing:border-box}
  #kaiju *{box-sizing:border-box}
  @media (pointer:coarse) and (orientation:landscape) and (max-height:520px){#kaiju{padding-bottom:calc(30px + env(safe-area-inset-bottom))}}   /* 11/11：iPhone 横屏最下面一排整体抬高 */
  @media (min-width:1400px) and (min-height:780px){#kaiju{--k:1.22}}
  @media (min-width:1900px) and (min-height:1000px){#kaiju{--k:1.4}}
  /* 11/13 用户：「不如群侠传高级」→ 墨黑底 + 暗金线，选项做成图标格，只有选中的展开；属性改九宫格 */
  #kaiju .top{display:flex;align-items:center;gap:12px;margin:0 calc(-14px - env(safe-area-inset-right)) 12px calc(-14px - env(safe-area-inset-left));padding:calc(6px + env(safe-area-inset-top)) 24px 6px;background:linear-gradient(180deg,#1b1916,#0f0e0c);position:relative;box-shadow:0 3px 10px rgba(0,0,0,.35)}
  #kaiju .top:after{content:"";position:absolute;left:0;right:0;bottom:-3px;height:3px;background:linear-gradient(90deg,transparent,var(--rd) 10%,var(--rd) 90%,transparent);border-bottom:1px solid var(--gd)}
  #kaiju .top:before{content:"";position:absolute;left:50%;bottom:-6px;width:9px;height:9px;margin-left:-5px;background:var(--ink);border:2px solid var(--gd);transform:rotate(45deg);z-index:1}
  #kaiju .seal{width:calc(34px*var(--k));height:calc(34px*var(--k));border:2px solid var(--gd);background:#2a231a;color:var(--gl);display:flex;align-items:center;justify-content:center;font-size:calc(17px*var(--k))}
  #kaiju .top h1{margin:0;font-size:calc(21px*var(--k));letter-spacing:6px;color:var(--gl);font-weight:400}#kaiju .top small{color:#8f826c;font-size:calc(12px*var(--k));letter-spacing:3px}
  #kaiju .cols{flex:1;min-height:0;display:grid;grid-template-columns:1.25fr 1fr 1fr;gap:14px}
  #kaiju .pan{position:relative;border:30px solid transparent;border-image:url('art/ui/kaiju2/panel.webp') 100 fill stretch;padding:0 2px 0;overflow:auto;min-height:0;filter:drop-shadow(0 8px 16px rgba(30,20,10,.35))}
  #kaiju h4{margin:2px 0 9px;color:var(--gl);font-size:calc(14px*var(--k));font-weight:400;letter-spacing:5px;display:flex;align-items:center;gap:8px}
  #kaiju h4:after{content:"";flex:1;height:2px;background:linear-gradient(90deg,var(--rd),rgba(168,130,63,.1));border-bottom:1px solid rgba(201,164,92,.35);margin-right:2px}
  #kaiju h4 i{width:calc(26px*var(--k));height:calc(26px*var(--k));flex:none;background:center/contain no-repeat}
  #kaiju .sec{margin-top:12px}
  #kaiju .ico{width:calc(44px*var(--k));height:calc(44px*var(--k));flex:none;background:#0d0c0a center/cover;box-shadow:0 0 0 1px #5d4b2c,inset 0 0 0 1px #000}
  #kaiju .namep{display:flex;align-items:center;gap:10px}#kaiju .namep b{font-size:calc(18px*var(--k));color:var(--gl);letter-spacing:2px;font-weight:400}#kaiju .namep small{display:block;font-size:calc(11px*var(--k));color:#8f826c}
  #kaiju select{width:100%;background:var(--ink);color:#d8ccb0;border:1px solid #5d4b2c;padding:6px;font-size:calc(13px*var(--k));font-family:inherit;margin-top:8px}
  /* 图标格：选中的展开成「图标 + 名字 + 一句话」，其余只露图标 */
  #kaiju .tiles{display:flex;gap:6px}
  #kaiju .tile{flex:none;width:calc(54px*var(--k));height:calc(54px*var(--k));padding:3px;display:flex;align-items:center;gap:8px;border:1px solid var(--rdd);background:var(--ink2);color:#cfc2a6;cursor:pointer;font-family:inherit;text-align:left;position:relative;transition:width .18s}
  #kaiju .tile .ico{width:100%;height:100%;box-shadow:none;opacity:.62;background-size:contain;background-color:transparent;background-repeat:no-repeat}
  #kaiju .tile span{display:none;min-width:0;overflow:hidden}#kaiju .tile b{overflow:hidden;text-overflow:ellipsis}
  #kaiju .tile.on{flex:1 1 0;min-width:0;width:auto;overflow:hidden;border:1px solid var(--gl);background:linear-gradient(180deg,#2c261c,#15130f);box-shadow:0 0 0 1px #000,0 0 0 2px var(--gd),0 0 12px rgba(240,200,110,.25)}
  #kaiju .tile.on .ico{width:calc(44px*var(--k));height:calc(44px*var(--k));opacity:1}
  #kaiju .tile.on span{display:block}
  #kaiju .tile:hover .ico{opacity:1}
  #kaiju .tile b{display:block;font-size:calc(15px*var(--k));letter-spacing:2px;color:var(--gl);font-weight:400;white-space:nowrap}#kaiju .tile small{display:block;font-size:calc(11px*var(--k));color:#8f826c;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  #kaiju .tile.wd{flex:1 1 0;min-width:0;width:auto}#kaiju .tile.wd span{display:block}#kaiju .tile.wd .ico{width:calc(44px*var(--k));height:calc(44px*var(--k))}#kaiju .tile.wd b{font-size:calc(16px*var(--k));letter-spacing:4px}
  #kaiju .tile.lock{opacity:.35;cursor:not-allowed}
  #kaiju .eff{margin-top:7px;padding:6px 10px;font-size:calc(12px*var(--k));color:#cdbd9e;text-align:center;background:linear-gradient(90deg,transparent,rgba(201,164,92,.12) 20%,rgba(201,164,92,.12) 80%,transparent);border-top:1px solid rgba(201,164,92,.3);border-bottom:1px solid rgba(201,164,92,.3);line-height:1.6}
  #kaiju .eff em{font-style:normal;color:var(--gl)}
  /* 左栏：战场 */
  #kaiju .field{display:flex;flex-direction:column;padding-top:16px}
  #kaiju .plaque{position:absolute;left:50%;top:-18px;transform:translateX(-50%);z-index:2;height:calc(36px*var(--k));display:flex;align-items:center;padding:0 6px;border-style:solid;border-width:0 calc(34px*var(--k));border-color:transparent;border-image:url('art/ui/kaiju2/slip.webp') 0 80 fill stretch;color:#f6e3bd;text-shadow:0 1px 0 #000;font-size:calc(15px*var(--k));letter-spacing:5px;white-space:nowrap}
  #kaiju .pic{flex:1;min-height:90px;border:1px solid #5d4b2c;box-shadow:inset 0 0 0 1px #000;background:#0d0c0a center/cover no-repeat;position:relative;overflow:hidden}
  #kaiju .pic.lock{filter:grayscale(.85) brightness(.62)}
  #kaiju .pic .lk{position:absolute;left:50%;top:42%;transform:translate(-50%,-50%);padding:8px 22px;border:1px solid var(--gd);background:rgba(12,10,8,.78);color:var(--gl);font-size:calc(17px*var(--k));letter-spacing:6px}
  #kaiju .pic .arr{position:absolute;top:46%;transform:translateY(-50%);width:calc(40px*var(--k));height:calc(40px*var(--k));border:0;background:center/contain no-repeat;color:transparent;font-size:0;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;font-family:inherit}
  #kaiju .pic .arr.l{left:10px;background-image:url('art/ui/kaiju2/arr_l.webp')}#kaiju .pic .arr.r{right:10px;background-image:url('art/ui/kaiju2/arr_r.webp')}
  #kaiju .pic .dots{display:flex;justify-content:center;gap:8px;margin-bottom:10px}
  #kaiju .pic .dots i{width:9px;height:9px;border:1px solid var(--gd);background:#1a1712;transform:rotate(45deg)}#kaiju .pic .dots i.on{background:var(--gl)}
  #kaiju .pic .ban{position:absolute;left:0;right:0;bottom:0;padding:30px 12px 12px;background:linear-gradient(180deg,transparent,rgba(10,9,7,.9) 45%);text-align:center}
  #kaiju .fname{display:inline-block;padding:2px 34px;font-size:calc(20px*var(--k));letter-spacing:8px;color:var(--gl);background:linear-gradient(90deg,transparent,rgba(201,164,92,.2) 25%,rgba(201,164,92,.2) 75%,transparent);border-top:1px solid rgba(201,164,92,.45);border-bottom:1px solid rgba(201,164,92,.45)}
  #kaiju .fsub{font-size:calc(11px*var(--k));color:#a99878;letter-spacing:3px;margin-top:5px}#kaiju .fnote{font-size:calc(12px*var(--k));color:#cfc2a6;margin-top:3px}
  #kaiju .shake{animation:kjShake .3s}@keyframes kjShake{25%{transform:translateX(-4px)}75%{transform:translateX(4px)}}
  /* 右栏：兵籍牒 */
  #kaiju .rows div{display:flex;justify-content:space-between;border-bottom:1px dashed rgba(201,164,92,.3);padding:4px 2px;font-size:calc(13px*var(--k));color:#e8dcc0}#kaiju .rows span{color:#8f826c}
  #kaiju .att{display:grid;grid-template-columns:repeat(3,1fr);gap:5px}
  #kaiju .att div{display:flex;justify-content:space-between;align-items:center;padding:5px 9px;border:1px solid var(--rdd);background:var(--ink2);cursor:pointer;font-size:calc(13px*var(--k))}
  #kaiju .att div span{color:#a99878}#kaiju .att div b{font-weight:400;color:#e8dcc0;font-size:calc(15px*var(--k))}
  #kaiju .att div.hi b{color:var(--gl)}#kaiju .att div.lo b{color:#8a7f6c}
  #kaiju .att div.sel{border-color:var(--gl);box-shadow:0 0 0 1px var(--gd)}
  #kaiju .axd{min-height:1.6em;margin:6px 0 0;font-size:calc(11px*var(--k));color:#8f826c;text-align:center}#kaiju .axd b{color:var(--gl);font-weight:400}
  #kaiju .slots{display:grid;grid-template-columns:repeat(5,1fr);gap:6px}
  #kaiju .slots div{aspect-ratio:1;max-width:calc(54px*var(--k));border:2px solid var(--rdd);background:var(--ink2) center/cover;position:relative;box-shadow:inset 0 0 0 2px #0b0a08;display:flex;align-items:center;justify-content:center;font-size:calc(18px*var(--k));color:var(--gl)}
  #kaiju .slots div:before,#kaiju .slots div:after{content:"";position:absolute;width:7px;height:7px;border:2px solid var(--rd);pointer-events:none}
  #kaiju .slots div:before{left:-2px;top:-2px;border-right:0;border-bottom:0}#kaiju .slots div:after{right:-2px;bottom:-2px;border-left:0;border-top:0}
  #kaiju .slots div.has{border-color:var(--gl);box-shadow:inset 0 0 0 2px #0b0a08,0 0 8px rgba(240,200,110,.3)}
  #kaiju .slots div i{position:absolute;right:3px;bottom:1px;font-style:normal;font-size:calc(10px*var(--k));color:var(--gl);text-shadow:0 1px 2px #000}
  #kaiju .skd{margin-top:7px;font-size:calc(12px*var(--k));color:#bfb196;line-height:1.6}#kaiju .skd b{font-weight:400;font-size:calc(14px*var(--k))}
  #kaiju .bot{display:flex;align-items:center;gap:10px;margin-top:10px}
  #kaiju .bot button{white-space:nowrap;color:#f5e8c8;font-size:calc(17px*var(--k));letter-spacing:6px;cursor:pointer;font-family:inherit;height:calc(50px*var(--k))}
  #kaiju .bot .back{width:calc(210px*var(--k))}#kaiju .bot .go{margin-left:auto;width:calc(260px*var(--k));font-size:calc(19px*var(--k));letter-spacing:12px}
  #kaiju .bot .dice{width:calc(50px*var(--k));padding:0!important;letter-spacing:0;border:2px solid var(--rd);background:var(--ink2);box-shadow:inset 0 0 0 2px #000}
  @media (max-height:560px){#kaiju .top{padding-top:calc(3px + env(safe-area-inset-top));padding-bottom:3px;margin-bottom:8px}#kaiju .top h1{font-size:calc(16px*var(--k))}#kaiju .top small{display:none}#kaiju .seal{width:26px;height:26px;font-size:14px}
    #kaiju .pan{border-width:20px}#kaiju h4{margin:0 0 5px;font-size:calc(12px*var(--k))}#kaiju .sec{margin-top:7px}#kaiju .ico{width:32px;height:32px}#kaiju .tile{width:34px;height:40px;padding:2px}#kaiju .tile small{display:none!important}#kaiju .tile.on .ico{width:32px;height:32px}#kaiju .tile.txt{height:32px}
    #kaiju .tile b{font-size:calc(13px*var(--k))}#kaiju .tile small{font-size:calc(10px*var(--k))}#kaiju .namep b{font-size:calc(15px*var(--k))}#kaiju select{padding:3px 6px;margin-top:5px}#kaiju .eff{margin-top:4px;padding:3px 6px;font-size:calc(11px*var(--k))}
    #kaiju .att div{padding:2px 6px}#kaiju .rows div{padding:1px 0;font-size:calc(12px*var(--k))}#kaiju .slots div{max-width:36px}#kaiju .bot{margin-top:5px}#kaiju .bot button{height:38px;font-size:calc(14px*var(--k))}#kaiju .bot .back{width:150px}#kaiju .bot .go{width:190px}#kaiju .bot .dice{width:38px}
    #kaiju .fname{font-size:calc(16px*var(--k))}#kaiju .fnote,#kaiju .pic .dots{display:none}#kaiju .plaque{font-size:13px;top:-10px}#kaiju .field{padding-top:10px}}
  @media (max-width:700px) and (orientation:portrait){#kaiju .cols{display:flex;flex-direction:column;overflow-y:auto;gap:12px;-webkit-overflow-scrolling:touch;padding-top:12px}#kaiju .pan{overflow:visible;flex:none;border-width:22px}#kaiju .pic{flex:none;height:min(58vw,250px)}#kaiju .pic .arr{width:28px;height:42px}
    #kaiju .bot .back{width:auto;flex:none;padding:0 14px!important;letter-spacing:2px}#kaiju .bot .go{flex:1;width:auto}#kaiju .tile{width:46px;height:46px}#kaiju .tile.on .ico{width:38px;height:38px}}`;
  function render() {
    const O = window.SURV ? SURV.ORIGINS : {}, cur = SURV.origin(), o = O[cur], ai = SURV.attrInfo ? SURV.attrInfo(cur) : [], SK = SURV.SK, sk = SK[SURV.startSk ? SURV.startSk() : o.skill], curW = SURV.wep ? SURV.wep() : o.wep;
    const F = FIELDS[field], hard = !!(window.TITLE && TITLE.hardMode && TITLE.hardMode());
    const ic = u => `style="background-image:url('${u}')"`;
    const AH = { 体魄: '体', 短兵: '短', 长兵: '长', 身法: '身', 运气: '运', 悟性: '悟', 射艺: '射', 术法: '术', 内力: '内' };
    void AH;
    el.innerHTML = `
      <div class="top"><div class="seal">卒</div><div><h1>开局配置</h1><small>选择你的出身与兵器</small></div></div>
      <div class="cols">
        <div class="pan field">
          <div class="plaque">所选战场</div>
          <div class="pic ${F.open ? '' : 'lock'}" style="background-image:url('${F.pic}')">${F.open ? '' : '<div class="lk">暂未开放</div>'}
            <button class="arr l" data-d="-1">‹</button><button class="arr r" data-d="1">›</button>
            <div class="ban"><div class="dots">${FIELDS.map((f, i) => `<i class="${i === field ? 'on' : ''}"></i>`).join('')}</div><div class="fname">${F.name}</div><div class="fsub">${F.sub}${F.open ? '' : ' · 未开放'}</div><div class="fnote">${F.note}</div></div></div>
        </div>
        <div class="pan">
          <h4><i style="background-image:url('${K2('h_yin')}')"></i>名号</h4>
          <div class="namep"><div class="ico" ${ic(PIC.plate)}></div><div><b>${esc(name)}</b><small>称号：无（通关或达成条件后获得）</small></div></div>
          <select disabled><option>势力：普通乡勇（无增减）</option></select>
          <div class="sec"><h4><i style="background-image:url('${K2('h_jian')}')"></i>出身</h4>
          <div class="tiles og">${Object.keys(O).map(k => `<button data-o="${k}" class="tile ${k === cur ? 'on' : ''} ${O[k].locked ? 'lock' : ''}" title="${O[k].name}"><div class="ico" ${ic(OGI[k] || '')}></div><span><b>${O[k].name}</b><small>${O[k].locked ? '暂未开放' : (O[k].desc || '').split('。')[0]}</small></span></button>`).join('')}</div>
          <div class="eff">${(o.desc || '').split('。').slice(1).join('。') || o.desc}</div></div>
          <div class="sec"><h4><i style="background-image:url('${K2('h_ge')}')"></i>兵器路数</h4>
          <div class="tiles wp">${(o.weps || [o.wep]).map(w => `<button data-w="${w}" class="tile wd ${w === curW ? 'on' : ''}"><div class="ico" ${ic(K2('w' + w))}></div><span><b>${SURV.WEPN[w]}</b><small>本门兵器 ×1.2</small></span></button>`).join('')}</div>
          <div class="eff">起手武艺：<em style="color:${sk ? sk.color : '#fff'}">${sk ? sk.name : '—'}</em>${sk ? '　' + sk.desc : ''}</div></div>
          <div class="sec"><h4><i style="background-image:url('${K2('h_gu')}')"></i>难度</h4>
          <div class="tiles diff"><button class="tile ${hard ? '' : 'on'}" data-h="0" title="标准"><div class="ico" ${ic(PIC.std)}></div><span><b>标准</b><small>小试牛刀，来去自如</small></span></button><button class="tile ${hard ? 'on' : ''}" data-h="1" title="困难"><div class="ico" ${ic(PIC.hard)}></div><span><b style="color:#e8826a">困难</b><small>敌人更强，积分×1.25</small></span></button></div></div>
        </div>
        <div class="pan">
          <h4><i style="background-image:url('${K2('h_hufu')}')"></i>兵籍牒</h4>
          <div class="rows"><div><span>姓名</span>${esc(name)}</div><div><span>出身</span>${o.name}</div><div><span>兵器</span>${SURV.WEPN ? SURV.WEPN[curW] : '刀'}</div><div><span>战场</span>${F.name}</div><div><span>难度</span>${hard ? '困难' : '标准'}</div></div>
          <div class="sec"><h4><i style="background-image:url('${K2('h_qi')}')"></i>属性</h4>
          <div class="att">${ai.map((r, i) => `<div class="${i === axSel ? 'sel' : ''} ${r[1] > 3 ? 'hi' : r[1] < 3 ? 'lo' : ''}" data-a="${i}" title="${r[3]}"><span>${r[0]}</span><b>${r[1]}</b></div>`).join('')}</div>
          <div class="axd">${axSel >= 0 && ai[axSel] ? '<b>' + ai[axSel][0] + '</b>　' + ai[axSel][2] + '　' + ai[axSel][3] : '点属性看效果（3 为常人水平）'}</div></div>
          <div class="sec"><h4><i style="background-image:url('${K2('w' + curW)}')"></i>起手武艺</h4>
          <div class="slots sk">${[0, 1, 2, 3, 4].map(i => i === 0 && sk ? (SKI[SURV.startSk ? SURV.startSk() : o.skill] ? `<div class="has" title="${sk.name}" ${ic(SKI[SURV.startSk ? SURV.startSk() : o.skill])}></div>` : `<div class="has" title="${sk.name}" style="color:${sk.color}">${sk.icon || sk.name[0]}</div>`) : '<div></div>').join('')}</div>
          <div class="skd">起手 1 个武艺，其余路上习得；5 格依次自动出手。</div></div>
          <div class="sec"><h4><i style="background-image:url('art/ui/kaiju/bag.webp')"></i>行囊</h4>
          <div class="slots bag"><div class="has" style="background-image:url('art/ui/kaiju/bag.webp')" title="盘缠"><i>0</i></div>${'<div></div>'.repeat(4)}</div></div>
        </div>
      </div>
      <div class="bot"><button class="back">返回主菜单</button><button class="dice" title="随机出身">🎲</button><button class="go" ${F.open ? '' : 'disabled style="opacity:.5"'}>出发</button></div>`;
    el.querySelectorAll('.pic .arr').forEach(b => b.onclick = () => { field = (field + +b.dataset.d + FIELDS.length) % FIELDS.length; render(); });
    el.querySelectorAll('.og .tile').forEach(b => b.onclick = () => { if (O[b.dataset.o].locked) return; SURV.setOrigin(b.dataset.o); render(); });
    el.querySelectorAll('.wp button').forEach(b => b.onclick = () => { SURV.setWep(+b.dataset.w); render(); });   // 11/13：出身的两种本门兵器选一种开局
    el.querySelectorAll('.att div').forEach(b => b.onclick = () => { axSel = +b.dataset.a === axSel ? -1 : +b.dataset.a; render(); });
    el.querySelectorAll('.diff .tile').forEach(b => b.onclick = () => { if (window.TITLE && TITLE.setHard) TITLE.setHard(b.dataset.h === '1'); render(); });
    el.querySelector('.dice').onclick = () => { const ks = Object.keys(O).filter(k => !O[k].locked); SURV.setOrigin(ks[Math.random() * ks.length | 0]); render(); };
    const tapBind = (b, fn) => {   // 手机：抬手就触发（不等 click，iOS 内置浏览器有时吞掉 click）；电脑照常 click
      let t = 0; b.addEventListener('pointerup', e => { if (e.pointerType === 'mouse') return; t = Date.now(); fn(); });
      b.onclick = () => { if (Date.now() - t > 700) fn(); };
    };
    tapBind(el.querySelector('.back'), () => { if (!el || !el.parentNode) return; close(); if (window.TITLE && TITLE.show) TITLE.show(); });
    tapBind(el.querySelector('.go'), () => { if (!el || !el.parentNode || !FIELDS[field].open) return; close(); if (window.TITLE && TITLE.beginRun) TITLE.beginRun(); });
  }
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function open(n) {
    name = n || '无名'; field = 0;
    if (!document.getElementById('kaijuCss')) { const s = document.createElement('style'); s.id = 'kaijuCss'; s.textContent = CSS; document.head.appendChild(s); }
    if (!el) { el = document.createElement('div'); el.id = 'kaiju'; el.addEventListener('pointerdown', e => e.stopPropagation()); el.addEventListener('touchmove', e => e.stopPropagation(), { passive: true }); }
    document.body.appendChild(el); render();
  }
  function close() { if (el) el.remove(); }
  window.KAIJU = { open, close, active: () => !!(el && el.parentNode) };
})();
