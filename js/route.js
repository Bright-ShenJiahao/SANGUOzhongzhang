// 三国终章：杀戮尖塔式路线图（水墨长卷）。网址带 ?route 才启用（和现在「一路 20 波」对比用）。
// - 横向长卷：左边涿郡出发，右边张角祭坛；每一列是一层，每层 3~5 个节点，随机分叉。手机竖屏自动改成纵向。
// - 节点：战（普通战斗）/ 精（精英）/ 营（营地：回血或磨刀）/ 帅（Boss，暂用第 18~20 级敌人顶替）。
// - 战斗由 survive.js 负责：SURV.beginNode(节点) 开打，打完回到这里 ROUTE.done(节点)。
(() => {
  const ON = true;   // 11/11：路线图是唯一玩法
  const LAYERS = 18, LANES = 5;
  const WAVES_OF = { battle: 3, elite: 4, boss: 3 };   // 每种节点打几波（可调）
  const TIME_K = 1.1;                                   // 路线模式下每波时间缩放（20 波表 ≈21 分钟，12 层约合 30 分钟）
  const ICON = { battle: 0, elite: 1, camp: 2, boss: 3, start: 4, shop: 5, event: 6, chest: 7 };   // 图标表（art/ui/route_icons.webp，4×2，每格 256）
  const MAPN = { field: '村口', town: '县城街巷', yz: '黄巾营寨', forest: '林间空地', camp: '营寨腹地', altar: '张角祭坛' };
  const SECT = [['field', 1, 4, '120,140,80', .13], ['town', 5, 8, '160,115,70', .13], ['forest', 9, 12, '110,130,70', .12], ['camp', 13, 16, '165,70,45', .12], ['altar', 17, 18, '70,55,95', .2]];   // 分段：地图、起止层、淡墨色调
  const hov = { n: null };
  const LABEL = { battle: '黄巾游兵', elite: '黄巾精锐', camp: '营地', boss: '张角祭坛', start: '涿郡', event: '奇遇', chest: '宝箱' };
  const EVENTS = [   // 11/14 用户定：20 个三国奇遇。选项 [名字, 说明, 键, 要花的铜钱, 限定出身]
    { t: '隆中草庐', npc: ['关羽', 'art/ui/npc/guanyu_face.webp', '草庐里的书生，必是大才。等一等又何妨。'], d: '山坳里一间草庐，一个书生正在竹榻上午睡。', o: [['等他醒来', '修为 +60', 'e_wait'], ['留字离开', '学一门心法（三选一）', 'e_note']] },
    { t: '煮酒论英雄', npc: ['刘备', 'art/ui/npc/liubei_face.webp', '此人目光如炬……言多必失，小心应对。'], d: '一位相貌威严的人请你喝酒，问你天下谁是英雄。', o: [['直言：唯使君与操耳', '得一件良品宝物，带上伤势「心魔」', 'e_hero'], ['闻雷失箸，装傻', '修为 +30', 'e_drop']] },
    { t: '华佗行医', npc: ['关羽', 'art/ui/npc/guanyu_face.webp', '刮骨疗毒，某尚且谈笑自若。你也试试？'], d: '一位背着药箱的老医者在树下歇脚，自称姓华。', o: [['刮骨疗毒', '失去 15% 气血，气血上限 +10%，治好全部伤势', 'e_bone'], ['求麻沸散', '花 50 铜钱，回满气血', 'e_mafei', 50]] },
    { t: '草船借箭', npc: ['刘备', 'art/ui/npc/liubei_face.webp', '江上雾大，借几支箭回来，便是兵器。'], d: '江面浓雾弥漫，对岸箭如雨下，岸边还泊着几条草船。', o: [['冒雨借箭', '失去 20% 气血，学一招武艺（三选一）', 'e_arrow'], ['撤回', '什么也不发生', 'none']] },
    { t: '空城计', npc: ['张飞', 'art/ui/npc/zhangfei_face.webp', '城门大开？里面八成有诈！俺老张偏要进去看看！'], d: '一座小城城门大开，城头一位老者正在抚琴。', o: [['闯进城去', '一半机会得良品宝物，一半机会中伏打一仗', 'e_city'], ['退兵', '修为 +20', 'e_xiu20']] },
    { t: '单刀赴会', npc: ['关羽', 'art/ui/npc/guanyu_face.webp', '某当年单刀赴会，也不过如此。'], d: '对方送来请帖：设宴江边，只请你一人。', o: [['只身赴会', '打一场精锐战，赢了得一件传说宝物', 'e_dandao'], ['带兵同去', '对方没敢动手，送你 40 铜钱', 'e_coin40']] },
    { t: '落凤坡', npc: ['刘备', 'art/ui/npc/liubei_face.webp', '此地名叫落凤坡……总觉得不太吉利。'], d: '前面一条小路林深路窄，能少走半天路程。', o: [['走小路', '打一场伏击战，战后多得一倍铜钱', 'e_path'], ['走大路', '什么也不发生', 'none']] },
    { t: '酒肆结义', npc: ['张飞', 'art/ui/npc/zhangfei_face.webp', '好汉子！喝了这碗酒，就是兄弟了！'], d: '酒肆里一个豪爽的汉子拉着你，非要和你结拜。', o: [['结拜', '花 30 铜钱，得一件凡品宝物', 'e_brother', 30], ['婉拒', '什么也不发生', 'none']] },
    { t: '望梅止渴', npc: ['刘备', 'art/ui/npc/liubei_face.webp', '将士们又累又渴，得想个法子提提气。'], d: '大军走了一整天，水囊都空了，将士们嘴唇干裂。', o: [['「前有梅林！」', '回复 20% 气血', 'e_heal20'], ['找水源', '修为 +25', 'e_xiu25'], ['挖野菜', '回复 30% 气血（农夫）', 'e_herb', 0, 'nongfu']] },
    { t: '七擒孟获', npc: ['关羽', 'art/ui/npc/guanyu_face.webp', '攻心为上。放他回去，他日自有回报。'], d: '你抓到一个南蛮首领，他却梗着脖子不服。', o: [['放了他', '得传说宝物「藤甲」', 'e_meng'], ['押走领赏', '得 60 铜钱', 'e_coin60']] },
    { t: '辕门射戟', npc: ['张飞', 'art/ui/npc/zhangfei_face.webp', '射！射中了俺请你喝酒！'], d: '营门外，一位将军打赌你射不中辕门上画戟的小枝。', o: [['应赌', '一半机会得 100 铜钱，一半机会失去 10% 气血', 'e_bet'], ['不赌', '什么也不发生', 'none']] },
    { t: '夜袭敌营', npc: ['张飞', 'art/ui/npc/zhangfei_face.webp', '趁夜摸过去，一把火烧他个干净！'], d: '前方敌营灯火稀疏，守夜的哨兵在打瞌睡。', o: [['放火', '下一仗敌人血量 −20%', 'e_fire'], ['不冒险', '什么也不发生', 'none']] },
    { t: '割须弃袍', npc: ['刘备', 'art/ui/npc/liubei_face.webp', '此人虽然狼狈，看气度绝非常人。'], d: '一个割了胡须、丢了战袍的将军跌跌撞撞跑来，求你掩护。', o: [['掩护他', '失去 10% 气血，他赠你宝物「七星刀」', 'e_cover'], ['去报官', '得 50 铜钱', 'e_coin50']] },
    { t: '长坂坡', npc: ['张飞', 'art/ui/npc/zhangfei_face.webp', '有俺在，谁也伤不了这孩子！'], d: '乱军之中传来婴儿的哭声。', o: [['杀进去救人', '打一仗，赢了修为 +50、回复 20% 气血', 'e_baby'], ['绕开', '带上伤势「心魔」', 'e_flee']] },
    { t: '蒋干盗书', npc: ['关羽', 'art/ui/npc/guanyu_face.webp', '书信来得太巧，未必是真。'], d: '夜里你潜进敌营，在主帐案上发现一封密信。', o: [['偷走', '一半机会是真信（得良品宝物），一半机会是假信（中伏打一仗）', 'e_letter'], ['原样放回', '什么也不发生', 'none']] },
    { t: '铜雀台', npc: ['刘备', 'art/ui/npc/liubei_face.webp', '出点力气换些盘缠，也是好事。'], d: '一座高台正在修建，工头在路边招短工。', o: [['出力干活', '失去 15% 气血，得 80 铜钱', 'e_work'], ['路过', '什么也不发生', 'none']] },
    { t: '水镜先生', npc: ['关羽', 'art/ui/npc/guanyu_face.webp', '伏龙、凤雏，得一可安天下。此人知道他们在哪。'], d: '山中隐士请你坐下说话。', o: [['求教', '任选一招武艺，升一级', 'e_teach'], ['辩论', '修为 +80（书生）', 'e_debate', 0, 'shusheng'], ['喝茶听讲', '修为 +10', 'e_xiu10']] },
    { t: '卖草鞋的小贩', npc: ['张飞', 'art/ui/npc/zhangfei_face.webp', '这卖鞋的大耳朵，倒是面善。'], d: '路边一个大耳朵的年轻人一边织席，一边卖草鞋。', o: [['买一双', '花 20 铜钱，得宝物「织席草鞋」', 'e_shoe', 20], ['和他聊聊', '修为 +15，回复 10% 气血', 'e_chat']] },
    { t: '八阵图', npc: ['关羽', 'art/ui/npc/guanyu_face.webp', '此阵变化无穷，硬闯怕是要吃苦头。'], d: '江边乱石堆成一座迷阵，阵中隐约有光。', o: [['硬闯', '失去 20% 气血，得一件良品宝物', 'e_maze'], ['绕路', '修为 +10', 'e_xiu10']] },
    { t: '黄巾粮车', npc: ['张飞', 'art/ui/npc/zhangfei_face.webp', '粮车！抢了它，或者一把火烧了！'], d: '几辆黄巾的粮车停在路边，看守只有几个人。', o: [['劫粮', '得 60 铜钱，带上伤势「箭伤」', 'e_rob'], ['烧粮', '之后两仗敌人伤害 −15%', 'e_burn']] },
  ];
  const FONT = '"WenKai","MaShanZheng","STKaiti","KaiTi","Songti SC",serif';   // 11/14 用户：字不够大气 → 粗楷书
  const UI = '"PingFang SC","Microsoft YaHei","Noto Sans CJK SC",sans-serif';   // 小字用黑体加粗，毛笔字只用在标题和节点名（11/11：字太小太细）
  const BGH = new Image(), BGV = new Image(); BGH.src = 'art/route/bg_h.webp'; BGV.src = 'art/route/bg_v.webp'; BGH.onload = BGV.onload = () => { bgKey = ''; };
  const FONT_Q = FONT.replace(/"/g, "'"), UI_Q = UI.replace(/"/g, "'");
  const KS = () => Math.max(1, Math.min(1.45, Math.min(W / 1280, H / 720)));
  const INK = '#2a211a', CINNABAR = '#b3281e', PAPER = '#eadcc0';

  let run = null, pending = false, shown = false, root = null, cv = null, g = null, W = 0, H = 0, DPR = 1, scroll = 0, tScroll = 0, raf = 0, t0 = 0, drag = null, noise = null, campBox = null, bgC = null, bgKey = '';
  const rnd = () => Math.random();
  const seeded = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

  // ---------- 生成地图 ----------
  // 结构（用户定 11/09，仿杀戮尖塔 + 群侠传）：4 段 × 4 层。每段：3 层岔路（4 条路径）→ 汇聚到该段唯一的首领节点 → 下一段从首领再散开。
  // 第 17 层单个营地，第 18 层最终首领。段内节奏：第 1 层纯近战；第 2 层加远程/盾枪；第 3 层精锐或小营地；第 4 层段首领。
  const SEGS = 4, SEGLEN = 4;
  // 节点名按「这一段里这种仗实际出什么兵」来取（11/11 用户：前期叫刀盾队却没有盾兵，名不副实）——和 survive.js 的 POOL 一一对应
  const TAGNS = [
    { melee: '流民群', raid: '刀手队', range: '投石队', shield: '乱兵营', patrol: '老卒巡逻' },
    { melee: '流民群', raid: '大刀队', range: '弓手阵', shield: '盾兵阵', patrol: '老卒巡逻' },
    { melee: '枪兵队', raid: '大刀队', range: '弓手阵', shield: '盾枪阵', patrol: '力士巡逻' },
    { melee: '刀枪队', raid: '大刀队', range: '弓手阵', shield: '盾枪阵', patrol: '力士巡逻' },
  ];
  const TAGN = new Proxy({}, { get: () => undefined });   // 旧表不再用
  const RWN = { skill: '学一个新武艺', perk: '学一门心法', heal: '包扎回血', both: '武艺 + 心法' };
  const SECBOSS = [['程远志', '邓茂'], ['波才', '何仪'], ['管亥', '张曼成'], ['张梁', '张宝']];
  function gen() {
    const nodes = [], byLayer = [], cells = {};
    const mk = (l, c, type) => { const n = { id: nodes.length, layer: l, lane: c, type: type || 'battle', tag: '', rw: '', next: [], prev: [], jx: seeded(nodes.length + 1) - .5, jy: seeded(nodes.length + 9) - .5 }; nodes.push(n); (byLayer[l] = byLayer[l] || []).push(n); return n; };
    const cell = (l, c) => cells[l + ':' + c] || (cells[l + ':' + c] = mk(l, c));
    const start = mk(0, 2, 'start');
    const link = (a, b) => { if (!a.next.includes(b)) { a.next.push(b); b.prev.push(a); } };
    const crosses = (a, b) => nodes.some(o => o.layer === a.layer && o !== a && o.next.some(p => p !== b && p.layer === b.layer && (o.lane - a.lane) * (p.lane - b.lane) < 0));
    let from = start;
    const byLane = l => nodes.filter(n => n.layer === l && n.type !== 'boss');
    for (let s = 0; s < SEGS; s++) {
      const l0 = s * SEGLEN + 1, lb = l0 + SEGLEN - 1;
      const bossN = mk(lb, s === SEGS - 1 ? 1 : 2, 'boss'); bossN.sec = s + 1;
      // 11/12 用户定：第 4 段是二选一的分岔——左边打张梁、右边打张宝，两条路不能都走；没打的那个会出现在最后的张角战里当小头目
      const bossB = s === SEGS - 1 ? mk(lb, 3, 'boss') : null; if (bossB) { bossN.br = 'liang'; bossB.br = 'bao'; bossB.sec = s + 1; }
      const lanes = s === 0 ? [0, 1, 2, 3, 4].sort(() => rnd() - .5).slice(0, 3 + (rnd() < .5 ? 1 : 0)).sort() : [0, 1, 2, 3, 4];   // 11/14 用户：每局出发不要都一样——第一列随机 3~4 个节点   /* 11/12 用户：分支多一些 → 5 条路全开，下面再加横向岔路 */
      for (const ln of lanes) {
        let cur = cell(l0, ln); link(from, cur);
        for (let l = l0 + 1; l < lb; l++) {
          const opts = [-1, 0, 1].map(d => cur.lane + d).filter(c => c >= 0 && c < LANES).sort(() => rnd() - .5);
          let nx = null;
          for (const c of opts) { const n = cell(l, c); if (!crosses(cur, n)) { nx = n; break; } }
          if (!nx) nx = cell(l, cur.lane);
          link(cur, nx); cur = nx;
        }
        link(cur, !bossB || cur.lane < 2 ? bossN : cur.lane > 2 ? bossB : (bossN.prev.length <= bossB.prev.length ? bossN : bossB));
      }
      for (let l = l0; l < lb - 1; l++) for (const n of nodes.filter(x => x.layer === l && x.type !== 'boss')) {   // 横向岔路：每个节点约一半机率多连一条到隔壁路
        if (rnd() > .55) continue; const c = n.lane + (rnd() < .5 ? -1 : 1), m = cells[(l + 1) + ':' + c];
        if (m && !n.next.includes(m) && !crosses(n, m)) link(n, m);
      }
      if (bossB && !bossB.prev.length) { const c = byLane(lb - 1).sort((a, b2) => b2.lane - a.lane)[0]; if (c) { c.next = c.next.filter(x => x !== bossN); bossN.prev = bossN.prev.filter(x => x !== c); link(c, bossB); } }
      if (bossB && !bossN.prev.length) { const c = byLane(lb - 1).sort((a, b2) => a.lane - b2.lane)[0]; if (c) { c.next = c.next.filter(x => x !== bossB); bossB.prev = bossB.prev.filter(x => x !== c); link(c, bossN); } }
      from = bossB ? [bossN, bossB] : bossN;
    }
    const camp = mk(LAYERS - 1, 2, 'camp'); [].concat(from).forEach(f => link(f, camp));
    const fin = mk(LAYERS, 2, 'boss'); fin.final = true; fin.sec = 5; link(camp, fin);
    // 节点类型：按「段内第几层」定节奏
    const pickRw = () => { const r = rnd(); return r < .4 ? 'skill' : r < .72 ? 'perk' : 'heal'; };
    for (let l = 1; l < LAYERS - 1; l++) {
      const k = (l - 1) % SEGLEN + 1, sg = (l - 1) / SEGLEN | 0; if (k === SEGLEN) continue;
      for (const n of byLayer[l] || []) {
        const r = rnd(); let t = 'battle';
        if (k === 1) t = l > 1 ? (r > .84 ? 'event' : 'battle') : (r < .2 ? 'event' : 'battle');   // 第一列也可能出奇遇
        else if (k === 2) t = r < .14 && sg >= 1 ? 'elite' : r < .32 ? 'event' : 'battle';
        else t = r < .5 ? 'elite' : r < .7 ? 'event' : 'battle';
        if ((t === 'camp' || t === 'elite') && n.prev.some(p => p.type === t)) t = 'battle';
        n.type = t;
      }
      const lay = byLayer[l] || [];
      // 11/14 用户（参考杀戮尖塔）：每段第 3 层（打首领前一层）至少一个营地；每段第 2 层放一个宝箱
      if (k === 3 && lay.length && !lay.some(n => n.type === 'camp')) { const n = lay[(rnd() * lay.length) | 0]; n.type = 'camp'; }
      if (k === 3) for (const n of lay) if (n.type !== 'camp' && rnd() < .25) n.type = 'camp';
      if (k === 2 && lay.length >= 3) { const c = lay.filter(n => n.type === 'battle'); if (c.length) c[(rnd() * c.length) | 0].type = 'chest'; }
      if (lay.length >= 2 && new Set(lay.map(n => n.type)).size === 1) {   // 同层不能全是同一种
        const n = lay[lay.length - 1], cur = n.type;
        const alts = k === 1 ? (l > 1 ? ['event'] : []) : k === 2 ? ['event', 'elite'] : cur === 'elite' ? ['battle'] : ['elite'];
        const a = alts.filter(x => x !== cur && !(n.prev.some(p => p.type === x) && (x === 'camp' || x === 'elite')));
        if (a.length) n.type = a[(rnd() * a.length) | 0];
      }
      const bat = lay.filter(n => n.type === 'battle');
      const opt = k === 1 ? ['melee', 'raid'] : ['range', 'shield'];
      bat.forEach((n, i) => { n.tag = opt[(i + (rnd() < .5 ? 1 : 0)) % 2]; if (bat.length >= 2 && i > 0 && n.tag === bat[i - 1].tag) n.tag = opt.find(x => x !== n.tag); });
      for (const n of lay) { if (n.type === 'elite') { n.tag = 'patrol'; } }
      for (const n of lay) if (sg >= 1 && (n.type === 'elite' || n.tag === 'range' || n.tag === 'shield') && rnd() < .55) n.cat = sg >= 3 ? 2 : 1;   // 第二段起：部分远程/盾阵/精锐节点带投石车
    }
    // 11/14：生成时被「交叉」拒掉的格子会留下孤零零的节点（没有路连到它），画出来像在路线外——全部删掉
    const keep = nodes.filter(n => n === start || n.prev.length);
    for (const n of keep) n.next = n.next.filter(m => keep.includes(m));
    keep.forEach((n, i) => { n.id = i; }); for (const L of byLayer) if (L) L.splice(0, L.length, ...L.filter(n => keep.includes(n)));
    return { nodes: keep, byLayer, start };
  }

  // ---------- 界面 ----------
  const port = () => W < H * .9;
  const GAP = () => port() ? Math.max(104, H * .15) : Math.max(150, W * .125);
  const MARGIN = () => port() ? 110 : 150;
  const LEN = () => MARGIN() * 2 + LAYERS * GAP();
  const VIEW = () => port() ? H : W;
  const maxScroll = () => Math.max(0, LEN() - VIEW());
  function pos(n) {
    const m = MARGIN() + n.layer * GAP() - scroll, span = port() ? W : H;
    const sh = !port() && H < 560, lo = port() ? W * .18 : sh ? H * .34 : H * .24, hi = port() ? W * .82 : sh ? H * .84 : H * .8;   // 11/14：手机横屏矮，节点往下挪、避开抬头
    const c = lo + (n.lane + n.jx * .35) / (LANES - 1) * (hi - lo) + n.jy * 10;
    return port() ? { x: c, y: H - m } : { x: m, y: c };
  }
  const nlabel = n => !n ? '' : n.type === 'boss' ? (n.final ? '张角祭坛' : (n.br === 'bao' ? '张宝' : n.br === 'liang' ? '张梁' : SECBOSS[n.sec - 1][0]) + ' 营垒') : (n.tag && (n.type === 'battle' || n.type === 'elite') && (TAGNS[Math.min(3, ((n.layer - 1) / 4) | 0)] || TAGNS[0])[n.tag] + (n.cat ? '·投石车' : '')) || LABEL[n.type];
  const radius = n => (n.type === 'boss' ? 42 : n.type === 'elite' ? 30 : n.type === 'start' ? 28 : 26) * (!port() && H < 560 ? Math.max(.6, H / 620) : 1);
  const reachable = n => !!run && (window.ROUTE_ALL ? n !== run.cur : run.cur.next.includes(n));   /* 11/12 开发者模式「解锁全部关卡」：任意节点都能点进去 */
  const visited = n => !!run && run.visited.has(n);
  const branch = () => { if (!run) return null; for (const n of run.visited) if (n.br) return n.br; return null; };

  function ensureDom() {
    if (root) return;
    root = document.createElement('div'); root.id = 'routeMap';
    root.style.cssText = 'position:fixed;inset:0;z-index:10010;background:' + PAPER + ';touch-action:none;user-select:none;-webkit-user-select:none';
    cv = document.createElement('canvas'); cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block';
    root.appendChild(cv); document.body.appendChild(root); g = cv.getContext('2d');
    const exit = document.createElement('button'); exit.textContent = '退出';
    const bk = Math.max(1, Math.min(1.45, Math.min(innerWidth / 1280, innerHeight / 720)));
    const card = document.createElement('button'); card.textContent = '兵籍牒';   // 11/11：这一局的当前属性、修为、武艺
    card.style.cssText = 'position:absolute;right:' + (innerWidth < innerHeight * .9 ? 14 : Math.round(96 * bk)) + 'px;top:' + (innerWidth < innerHeight * .9 ? Math.round(56 * bk) : 12) + 'px;padding:6px 14px;font:700 ' + Math.round(16 * bk) + 'px ' + UI + ';letter-spacing:2px;color:#3b2a1c;background:#f3e6c8;border:1px solid #7a5a2c;border-radius:6px;cursor:pointer;z-index:2';
    card.onclick = () => sheet();
    root.appendChild(card);
    exit.style.cssText = 'position:absolute;right:14px;top:12px;padding:6px 14px;font:700 ' + Math.round(16 * Math.max(1, Math.min(1.45, Math.min(innerWidth / 1280, innerHeight / 720)))) + 'px ' + UI + ';letter-spacing:2px;color:#f3dc9a;background:rgba(40,28,18,.8);border:1px solid #c9a24a;border-radius:6px;cursor:pointer;z-index:2';
    exit.onclick = () => { if (!confirm('退出本局，回到主界面？')) return; close(); if (typeof returnFromPausedGame === 'function') returnFromPausedGame(true); else if (window.TITLE && TITLE.show) TITLE.show(); };
    root.appendChild(exit);
    cv.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, s: scroll, moved: false, id: e.pointerId }; try { cv.setPointerCapture(e.pointerId); } catch (_) {} });
    cv.addEventListener('pointermove', e => {
      if (!drag) { hov.n = null; if (run && e.pointerType !== 'touch') for (const n of run.nodes) { const p = pos(n); if (Math.hypot(p.x - e.clientX, p.y - e.clientY) < radius(n) + 6) { hov.n = n; break; } } cv.style.cursor = hov.n && reachable(hov.n) ? 'pointer' : 'default'; return; }
      if (e.pointerId !== drag.id) return;
      const d = port() ? e.clientY - drag.y : drag.x - e.clientX;
      if (Math.abs(e.clientX - drag.x) + Math.abs(e.clientY - drag.y) > 8) drag.moved = true;
      if (drag.moved) { scroll = Math.max(0, Math.min(maxScroll(), drag.s + (port() ? -d : d))); tScroll = scroll; }
    });
    cv.addEventListener('pointerup', e => { const d = drag; drag = null; if (d && !d.moved) tap(e.clientX, e.clientY); });
    cv.addEventListener('wheel', e => { e.preventDefault(); scroll = Math.max(0, Math.min(maxScroll(), scroll + (port() ? -e.deltaY : e.deltaY + e.deltaX))); tScroll = scroll; }, { passive: false });
    addEventListener('resize', () => { if (shown) fit(); });
  }
  function fit() {
    DPR = Math.min(2, window.devicePixelRatio || 1); W = innerWidth; H = innerHeight;
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    scroll = Math.max(0, Math.min(maxScroll(), scroll));
  }
  function focus(snap) {
    const m = MARGIN() + run.cur.layer * GAP();
    tScroll = Math.max(0, Math.min(maxScroll(), m - VIEW() * (port() ? .62 : .3)));
    if (snap) scroll = tScroll;
  }
  function open() {
    if (!run) return;
    ensureDom(); fit(); focus(true); shown = true; root.style.display = ''; t0 = performance.now();
    if (run.blessed === false && window.SURV && SURV.blessOpts) setTimeout(bless, 300);
    if (!raf) raf = requestAnimationFrame(frame);
  }
  function close() { shown = false; if (root) root.style.display = 'none'; if (campBox) { campBox.remove(); campBox = null; } cancelAnimationFrame(raf); raf = 0; }

  function tap(cx, cy) {
    if (campBox || !run) return;
    let best = null, bd = 1e9;
    for (const n of (window.ROUTE_ALL ? run.nodes.filter(x => x !== run.cur) : run.cur.next)) { const p = pos(n)   /* 11/12 修：解锁关卡开着时，点哪个节点都算 */, d = Math.hypot(p.x - cx, p.y - cy); if (d < radius(n) + 16 && d < bd) { bd = d; best = n; } }
    if (best) choose(best);
  }
  function choose(n, now) {
    if (!reachable(n)) return;
    if (!now) { if (run.circ) return; run.circ = { n, t: performance.now() }; if (window.SFX) SFX.play('j_banner'); setTimeout(() => { run.circ = null; choose(n, 1); }, 420); return; }
    if (n.type === 'camp') return camp(n);
    if (n.type === 'chest') return chest(n);
    if (n.type === 'event') return happen(n);
    close();
    if (window.SURV && SURV.beginNode) SURV.beginNode(n);
  }
  // 奇遇弹窗（11/11 改成整备屏那套：金框深色面板 + 名字牌 + 左边刘关张头像点评 + 金框按钮）
  const EV_CSS = '.rtEv{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:radial-gradient(ellipse at 50% 45%,rgba(14,10,8,.55),rgba(6,4,3,.82));z-index:3;font-family:' + UI_Q + ';color:#efe2c6}'
    + '.rtEv .pn{position:relative;width:min(720px,94vw);box-sizing:border-box;padding:clamp(26px,5vh,46px) clamp(26px,4vw,48px) clamp(20px,4vh,36px);border:clamp(26px,5vh,40px) solid transparent;border-image:url(art/ui/prep/panel.webp) 90 fill stretch;text-align:center}'
    + '.rtEv .tt{position:absolute;left:50%;top:clamp(-30px,-4.5vh,-18px);transform:translateX(-50%);padding:0 clamp(28px,4vw,46px);height:clamp(36px,7vh,52px);display:flex;align-items:center;white-space:nowrap;border:12px solid transparent;border-image:url(art/ui/prep/btn.webp) 40 fill stretch;font:900 clamp(20px,3.6vh,30px) ' + FONT_Q + ';letter-spacing:.3em;text-indent:.3em;color:#f3d08a;text-shadow:0 2px 0 #2a1608}'
    + '.rtEv.wi .pn{width:min(1060px,96vw);display:flex;gap:clamp(14px,2vw,26px);align-items:stretch;text-align:left}'
    + '.rtEv.wi .im{flex:0 0 46%;min-height:clamp(150px,34vh,330px);background:#1a120c center/cover no-repeat;border:2px solid #8a6a32;box-shadow:inset 0 0 30px rgba(0,0,0,.55),0 3px 10px rgba(0,0,0,.6);border-radius:3px;filter:sepia(.12)}'
    + '.rtEv.wi .rc{flex:1;min-width:0;display:flex;flex-direction:column;justify-content:center}'
    + '@media (pointer:fine){.rtEv.wi .op button{position:relative}.rtEv.wi .op button small{display:none!important;position:absolute;right:calc(100% + 14px);top:50%;transform:translateY(-50%);width:max-content;max-width:min(380px,38vw);min-height:0!important;padding:10px 16px;background:rgba(14,10,7,.96);border:1px solid #b08a4a;box-shadow:0 4px 14px rgba(0,0,0,.7);color:#efe2c6;font-size:15px;text-align:left!important;z-index:5;white-space:normal}.rtEv.wi .op button small::before{content:"得　";color:#e8c47a;font-weight:900}.rtEv.wi .op button:hover small{display:block!important}.rtEv.wi .op button small:empty{display:none!important}}'   // 11/14 照群侠：鼠标停在选项上，左边浮出结果；手机照旧写在按钮里
    + '.rtEv.wi .op{flex-direction:column;align-items:stretch}.rtEv.wi .op button{width:auto!important;max-width:none!important}'
    + '@media (max-height:520px){.rtEv.wi .pn{padding:10px 14px 8px;border-width:18px;max-height:96vh}.rtEv.wi .im{min-height:0;flex-basis:40%}.rtEv.wi .pf{display:none}.rtEv.wi .bd{margin:4px 0 6px}.rtEv.wi .ds,.rtEv.wi .sy{font-size:12px!important;line-height:1.45}.rtEv.wi .hp{font-size:11px!important;margin:2px 0!important}.rtEv.wi .op{gap:5px}.rtEv.wi .op button{padding:4px 8px!important;font-size:13px!important}.rtEv.wi .op button small{min-height:0!important;font-size:11px}.rtEv.wi .tt{height:30px;font-size:17px;top:-16px}}'
    + '.rtEv .bd{display:flex;gap:clamp(12px,2vw,22px);align-items:center;text-align:left;margin:clamp(6px,1.5vh,14px) 0 clamp(12px,2.6vh,22px)}'
    + '.rtEv .pf{flex:none;width:clamp(72px,15vh,112px);height:clamp(72px,15vh,112px);border:10px solid transparent;border-image:url(art/ui/prep/pframe.webp) 50 stretch;background:#1a120c center/cover no-repeat}'
    + '.rtEv .ds{font:700 clamp(15px,2.6vh,19px)/1.55 ' + UI_Q + ';color:#efe2c6}.rtEv .sy{margin-top:.5em;font:700 clamp(14px,2.4vh,17px)/1.5 ' + UI_Q + ';color:#e8c47a}.rtEv .sy b{color:#ffd86e;margin-right:.4em}'
    + '.rtEv .hp{margin-top:.4em;font:700 clamp(13px,2.2vh,15px) ' + UI_Q + ';color:#e88070}'
    + '.rtEv .op{display:flex;gap:clamp(10px,1.6vw,18px);justify-content:center;flex-wrap:wrap}'
    + '.rtEv button{min-width:clamp(150px,22vw,230px);padding:clamp(6px,1.4vh,12px) 14px;border:14px solid transparent;border-image:url(art/ui/prep/btn.webp) 40 fill stretch;background:none;color:#f3d08a;cursor:pointer;font:900 clamp(18px,3.2vh,24px) ' + FONT_Q + ';letter-spacing:.15em;transition:transform .12s,filter .12s}'
    + '.rtEv button:hover{transform:translateY(-3px);filter:brightness(1.25)}.rtEv button small{display:block;margin-top:.25em;font:700 clamp(12px,2.2vh,15px) ' + UI_Q + ';letter-spacing:0;color:#efe2c6}';
  const EV_THIN = '.rtEv .pn{padding:clamp(30px,6vh,48px) clamp(24px,3.4vw,44px) clamp(18px,3.4vh,30px)}'   // 11/11：跟整备屏一起换成细线暗底
    + '.rtEv .tt{border:1px solid rgba(184,149,90,.6);border-image:none;background:#140f0b;height:clamp(32px,6vh,44px);color:#e6c98a}'
    + '.rtEv .pf{border:1px solid rgba(184,149,90,.6);border-image:none}'
    + '.rtEv button{border:1px solid rgba(184,149,90,.6);border-image:none;background:linear-gradient(180deg,rgba(44,36,27,.95),rgba(18,15,12,.95));box-shadow:inset 0 0 0 1px rgba(0,0,0,.6);color:#e3cf9f;border-radius:2px}'
    + '.rtEv button:hover{filter:none;border-color:#e2c27a;color:#fff0cc}';
  const EV_KAI = '.rtEv,.rtEv .ds,.rtEv .sy,.rtEv .hp,.rtEv button small{font-family:WenKai,MaShanZheng,"STKaiti",serif!important}'   // 11/14 用户：弹窗字体照开战牌匾，粗楷书
    + '.rtEv .ds{font-size:clamp(17px,2.9vh,22px)!important;font-weight:400!important;line-height:1.6!important}.rtEv .sy{font-size:clamp(15px,2.6vh,19px)!important;font-weight:400!important}.rtEv .hp{font-weight:400!important}'
    + '.rtEv .tt{border:none!important;background:url(art/ui/hud/bian.webp) center/100% 100% no-repeat!important;height:clamp(48px,8.5vh,64px)!important;padding:0 clamp(48px,6vw,80px)!important;top:clamp(-38px,-6vh,-26px)!important;font:400 clamp(22px,3.8vh,30px) WenKai,MaShanZheng,serif!important;letter-spacing:.3em;color:#f0d89a!important;text-shadow:0 2px 0 #1a0e05}'
    + '.rtEv button{font-family:WenKai,MaShanZheng,"STKaiti",serif!important;font-weight:400!important}.rtEv button small{font-size:clamp(13px,2.3vh,16px)!important;color:#e2d4b6!important}'
    + '.rtEv .pn.thinp{border:clamp(34px,6vh,52px) solid transparent!important;border-image:url(art/ui/prep/panel.webp) 72 fill stretch!important;background:none!important;box-shadow:0 14px 40px rgba(0,0,0,.65)!important;padding:clamp(14px,2.6vh,24px) clamp(16px,2.4vw,30px) clamp(10px,2vh,18px)!important}.rtEv .pn.thinp::before,.rtEv .pn.thinp::after{display:none!important}'   // 11/14 用户：大框要有美术——用整备屏的金边云纹面板
    + '.rtEv .op{align-items:stretch}.rtEv button{display:flex;flex-direction:column;align-items:center;justify-content:flex-start;gap:4px}.rtEv button small{min-height:2.9em;display:flex;align-items:flex-start;justify-content:center;text-align:center;line-height:1.45}'   // 人物、名字、说明三行对齐
    + '.rtEv button img{border:1px solid rgba(184,149,90,.6);object-fit:cover}.rtEv.bl .op{flex-wrap:nowrap}.rtEv.bl button{min-width:0;flex:1}.rtEv.bl button img{width:clamp(72px,12vh,96px)!important;height:clamp(72px,12vh,96px)!important;margin-bottom:8px!important}';
  { const st = document.createElement('style'); st.textContent = EV_CSS + EV_THIN + EV_KAI; document.head.appendChild(st); }
  function popup(title, sub, desc, opts, pick, npc, img) {   // 通用选择弹窗（奇遇用）；img：奇遇插图，放左侧（11/14 参考群侠）
    const box = campBox = document.createElement('div'); box.className = 'rtEv' + (img ? ' wi' : '');
    const hp = window.SURV && SURV.routeHp ? SURV.routeHp() : null;
    box.innerHTML = '<div class="pn thinp"><div class="tt">' + title + '</div>' + (img ? '<div class="im" style="background-image:url(' + img + ')"></div><div class="rc">' : '') + '<div class="bd">'
      + (npc ? '<div class="pf" style="background-image:url(' + npc[1] + ')"></div>' : '')
      + '<div><div class="ds">' + desc + '</div>' + (npc ? '<div class="sy"><b>' + npc[0] + '</b>' + npc[2] + '</div>' : '')
      + (hp ? '<div class="hp">当前气血 ' + Math.ceil(hp[0] * 10) + ' / ' + Math.round(hp[1] * 10) + '</div>' : '') + '</div></div>'
      + (window.SURV && SURV.money ? '<div class="hp" style="color:#e8c47a;margin:-.4em 0 .8em">铜钱 ' + SURV.money() + '</div>' : '')
      + '<div class="op">' + opts.map((o, i) => { const poor = o[3] && window.SURV && SURV.money && SURV.money() < o[3]; return '<button data-i="' + i + '"' + (poor ? ' disabled style="opacity:.4;cursor:not-allowed"' : '') + '>' + (o[4] && /\//.test(o[4]) ? '<img src="' + o[4] + '" style="width:40px;height:40px;display:block;margin:0 auto 4px">' : '') + o[0] + '<small>' + (poor ? '铜钱不够' : o[1]) + '</small></button>'; }).join('') + '</div>' + (img ? '</div>' : '') + '</div>';
    box.querySelectorAll('button').forEach(b => b.onclick = () => { if (b.disabled) return; box.remove(); campBox = null; pick(opts[+b.dataset.i][2]); });
    root.appendChild(box);
  }
  function fightFrom(n, kind, msg, title) {   // 奇遇里打仗：节点就地变成战斗（或精锐），打完照常走整备屏
    n.type = kind === 'elite' ? 'elite' : 'battle'; n.tag = kind === 'elite' ? 'patrol' : 'melee';
    const go = () => { close(); if (window.SURV && SURV.beginNode) SURV.beginNode(n); };
    if (msg) popup(title || '遭 遇', '', msg, [['迎战', '', 'go']], go); else go();
  }
  function train(n, title) {
    const L = SURV.campSkills ? SURV.campSkills() : [];
    if (!L.length) return done(n, true);
    popup(title || '修 炼', '', '选一招武艺，静心苦练。', L.map(o => [o.name, o.lv >= 10 ? '已满级' : 'LV' + o.lv + ' → LV' + (o.lv + 1), o.k, 0, o.img]), k2 => { SURV.camp(k2); done(n, true); });
  }
  function happen(n) {   // 11/14：「?」节点进去才知道——七成奇遇、一成五伏击战、一成宝箱、半成无事
    if (window.SFX) SFX.play('j_event');
    const r = Math.random();
    if (r < .15) return fightFrom(n, 'battle', '林子里一声梆子响，黄巾伏兵四起！', '伏 击');
    if (r < .25) return chest(n);
    if (r < .30) return popup('一路无事', '', '这段路风平浪静，你停下来歇了口气。', [['继续赶路', '回复 5% 气血', 'ok']], () => SURV.event('e_heal5', () => done(n, true)));
    run.evSeen = run.evSeen || [];
    let pool = EVENTS.map((e, i) => i).filter(i => !run.evSeen.includes(i)); if (!pool.length) { run.evSeen = []; pool = EVENTS.map((e, i) => i); }
    const idx = pool[(Math.random() * pool.length) | 0], ev = EVENTS[idx]; run.evSeen.push(idx);
    const org = window.SURV && SURV.origin ? SURV.origin() : '', opts = ev.o.filter(o => !o[4] || o[4] === org).map(o => o.slice(0, 4));
    const evi = 'art/ui/ev/ev' + idx + '.webp';
    popup(ev.t, '', ev.d, opts, k => SURV.event(k, (msg, fight) => {
      if (fight === 'train') return train(n, ev.t);
      if (fight) return fightFrom(n, fight, msg, ev.t);
      if (typeof msg === 'string' && msg) popup(ev.t, '', msg, [['继续', '', 'ok']], () => done(n, true), null, evi); else done(n, true);
    }), ev.npc, evi);
  }
  function chest(n) { if (window.SFX) SFX.play('j_event'); const q = () => Math.random() < .3 ? 1 : 0; SURV.baoPick([q(), q(), q()], () => done(n, true), '宝 箱 · 选一件宝物'); }
  function bless() {   // 11/14 用户定：出征前·桃园三赠（刘备、关羽免费，张飞有代价），三选一
    run.blessed = true; const L = SURV.blessOpts();
    const FACE = { 刘备: 'liubei', 关羽: 'guanyu', 张飞: 'zhangfei' };
    popup('桃 园 三 赠', '', '涿郡城外，刘关张三兄弟为你送行。各有一份心意，只能收下一份。<br><span style="color:#e8c47a">张飞：大哥二哥给的都是好东西，俺老张这份……得拿点东西来换！</span>', L.map(o => [o[2], o[0] + '：' + o[3], o[1], 0, 'art/ui/npc/' + FACE[o[0]] + '_face.webp']), k => SURV.bless(k, () => { if (window.RUNSAVE) RUNSAVE.save(); }));
    if (campBox) campBox.classList.add('bl');
  }
  function camp(n) {   // 11/14 用户：营地二选一——休整回三成血，或修炼（任选一招武艺直接升一级）
    if (window.SFX) SFX.play('j_event');
    popup('营 地', '', '篝火噼啪作响，弟兄们围坐歇息。今夜做些什么？', [['休整', '回复 30% 血量，治好伤势', 'heal'], ['修炼', '任选一招武艺，熟练直接升一级', 'train']], k => {
      if (k === 'heal') { SURV.camp('heal'); return done(n, true); }
      const L = SURV.campSkills ? SURV.campSkills() : [];
      if (!L.length) { SURV.camp('heal'); return done(n, true); }
      popup('修 炼', '', '选一招武艺，静心苦练一夜。', L.map(o => [o.name, o.lv >= 10 ? '已满级' : 'LV' + o.lv + ' → LV' + (o.lv + 1), o.k, 0, o.img]), k2 => { SURV.camp(k2); done(n, true); });
    });
  }
  // 节点打完（或营地选完）：记下走过的路，回到长卷
  function sheet() {   // 兵籍牒：这一局当前的修为、属性、武艺、心法
    if (campBox || !window.SURV || !SURV.status) return;
    const FONT = FONT_Q, UI = UI_Q;   // 写进 style="..." 里，字体名要用单引号
    const kz = Math.max(1.15, Math.min(1.6, Math.min(innerWidth / 1100, innerHeight / 640))), px = n => Math.round(n * kz) + 'px';   // 11/11：字太小 → 整体放大
    const st = SURV.status(), box = campBox = document.createElement('div');
    box.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(30,20,12,.5);z-index:3;padding:10px';
    const row = (a, b, c) => '<div style="display:flex;justify-content:space-between;gap:10px;padding:' + px(4) + ' 0;border-bottom:1px dotted rgba(122,90,44,.4)"><span style="opacity:.75">' + a + '</span><span>' + b + (c ? '　<small style="opacity:.75;font-size:.85em">' + c + '</small>' : '') + '</span></div>';
    const h = t => '<div style="margin:10px 0 4px;font:900 ' + px(18) + ' ' + FONT + ';letter-spacing:4px;color:#7a2a1e">◆ ' + t + '</div>';
    box.innerHTML = '<div style="background:radial-gradient(ellipse at 50% 30%,#f6ead4,#e6d2b0);border:2px solid #7a5a2c;border-radius:8px;padding:16px 20px;width:min(94vw,' + px(470) + ');max-height:92vh;overflow:auto;font:600 ' + px(15) + ' ' + UI + ';color:' + INK + ';box-shadow:0 12px 40px rgba(0,0,0,.45)">'
      + '<div style="display:flex;justify-content:space-between;align-items:center"><div style="font:900 ' + px(28) + ' ' + FONT + ';letter-spacing:6px">兵籍牒</div><button class="x" style="font:700 ' + px(14) + ' ' + UI + ';padding:4px 12px;background:#2e2016;color:#f3dc9a;border:1px solid #7a5a2c;border-radius:5px;cursor:pointer">关闭</button></div>'
      + row('出身', st.origin) + row('铜钱', String(st.money)) + row('修为', 'LV.' + st.lv + '　' + st.pct + '%', st.bank ? '待修炼 ×' + st.bank : '') + row('气血', st.hp[0] + ' / ' + st.hp[1]) + (st.dmg > 1.001 ? row('武艺伤害', '+' + Math.round((st.dmg - 1) * 100) + '%', '磨刀/奇遇') : '')
      + h('属性') + st.attrs.map((r, i) => row(r[0], r[1] + (st.add[r[4]] ? ' <small style="color:#3f8a4a">(+' + st.add[r[4]] + ')</small>' : ''), r[2])).join('')
      + h('武艺') + (st.slots.filter(Boolean).map((k, i) => row((i + 1) + '. <i style="display:inline-block;width:9px;height:9px;border-radius:2px;background:' + k.color + ';box-shadow:0 0 0 1px rgba(0,0,0,.4);margin-right:4px"></i><b>' + k.name + '</b> LV' + k.lv, '', k.desc)).join('') || '<div style="opacity:.6">无</div>')
      + h('宝物') + ((st.bao || []).map(b => row('<img src="art/ui/bao/' + b.k + '.webp" style="width:26px;height:26px;vertical-align:middle;margin-right:4px"><span style="color:' + SURV.BQC[b.q] + '">' + b.n + '</span>', SURV.BQN[b.q], b.d + (b.c ? '（代价：' + b.c + '）' : ''))).join('') || '<div style="opacity:.6">无</div>')
      + ((st.shang || []).length ? h('伤势') + st.shang.map(x => row('<img src="art/ui/fx/sh_' + x.k + '.webp" style="height:26px;vertical-align:middle;margin-right:4px"><span style="color:#c0392b">' + x.n + '</span>', '', x.d + '（营地休整可治）')).join('') : '')
      + h('心法') + (st.gf.filter(Boolean).map(g => row(g.name + ' LV' + g.lv, '', g.desc)).join('') || '<div style="opacity:.6">无</div>')
      + (st.qg ? h('轻功') + row(st.qg.name, '', st.qg.desc) : '')
      + '</div>';
    const shut = () => { box.remove(); campBox = null; };
    box.querySelector('.x').onclick = shut; box.onclick = e => { if (e.target === box) shut(); };
    root.appendChild(box);
  }
  function done(n, keepOpen) {
    run.cur = n; run.visited.add(n);
    if (window.RUNSAVE) RUNSAVE.save();   // 自动存档（11/11 用户定）：每打完一个节点、回到长卷时存一次；战斗中途不存
    ensureDom(); fit(); focus(false); shown = true; root.style.display = ''; t0 = performance.now();
    if (!raf) raf = requestAnimationFrame(frame);
  }

  // ---------- 绘制 ----------
  function paperNoise() {
    if (noise) return noise;
    const c = document.createElement('canvas'); c.width = c.height = 220; const x = c.getContext('2d');
    for (let i = 0; i < 1400; i++) { x.fillStyle = `rgba(${90 + seeded(i) * 40 | 0},${70 + seeded(i + 5) * 30 | 0},40,${.02 + seeded(i + 11) * .05})`; x.fillRect(seeded(i + 2) * 220, seeded(i + 3) * 220, 1 + seeded(i + 4) * 2, 1 + seeded(i + 6) * 2); }
    return noise = g.createPattern(c, 'repeat');
  }
  function hills(par, alpha, h0, seed) {   // 远山：层层淡墨，随长卷慢慢错位
    g.beginPath(); const off = scroll * par;
    if (port()) {
      g.moveTo(0, H);
      for (let y = H; y >= 0; y -= 12) { const v = y + off; const x = W * .06 + Math.sin(v * .008 + seed) * 22 + Math.sin(v * .021 + seed * 2) * 12; g.lineTo(x * (h0 / 100), y); }
      g.lineTo(0, 0); g.closePath();
    } else {
      g.moveTo(0, H);
      for (let x = 0; x <= W; x += 12) { const v = x + off; const y = H - h0 - Math.abs(Math.sin(v * .004 + seed)) * H * .18 - Math.sin(v * .013 + seed * 3) * 14; g.lineTo(x, y); }
      g.lineTo(W, H); g.closePath();
    }
    g.fillStyle = `rgba(52,47,42,${alpha})`; g.fill();
  }
  function trail(a, b, na, nb, kind, seed) {   // 脚印虚线：沿略弯的曲线，左右脚交替的小墨点
    const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len, bend = (seeded(seed) - .5) * len * .22;
    const cx = (a.x + b.x) / 2 + nx * bend, cy = (a.y + b.y) / 2 + ny * bend;
    const pt = t => { const u = 1 - t; return [u * u * a.x + 2 * u * t * cx + t * t * b.x, u * u * a.y + 2 * u * t * cy + t * t * b.y]; };
    const t0_ = (radius(na) + 8) / len, t1_ = 1 - (radius(nb) + 8) / len, step = (kind === 2 ? 15 : 13) / len;
    const col = kind === 2 ? INK : kind === 1 ? '#6a3a1c' : '#4a3a2c', al = kind === 2 ? .85 : kind === 1 ? .85 : .3, rr = kind === 2 ? 3.6 : kind === 1 ? 3.2 : 2.2;
    g.fillStyle = col; let k = 0;
    for (let t = t0_; t < t1_; t += step, k++) {
      const [x, y] = pt(t), [x2, y2] = pt(Math.min(1, t + .01)), ang = Math.atan2(y2 - y, x2 - x), side = k % 2 ? 1 : -1;
      g.globalAlpha = al * (.75 + seeded(seed + k) * .25);
      g.beginPath(); g.ellipse(x + Math.cos(ang + 1.57) * side * 3.2, y + Math.sin(ang + 1.57) * side * 3.2, rr * 1.35, rr * .85, ang, 0, 7); g.fill();
    }
    g.globalAlpha = 1;
  }
  let sheetG = null;
  function sheets() {   // 图标表：彩色原图 + 水墨灰版（走过的节点用）
    const im = typeof IMG !== 'undefined' && IMG.ui_route_icons;
    if (!im || !im.complete || !im.naturalWidth) return null;
    if (sheetG !== null) return { c: im, g: sheetG || null };
    try {   // 灰版：逐像素去色；跨域图会读不出像素（抛安全错误），那就退回用滤镜
      const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; const x = c.getContext('2d'); x.drawImage(im, 0, 0);
      const d = x.getImageData(0, 0, c.width, c.height), a = d.data;
      for (let i = 0; i < a.length; i += 4) { const l = a[i] * .3 + a[i + 1] * .59 + a[i + 2] * .11, v = 40 + l * .5; a[i] = v * 1.03; a[i + 1] = v * .96; a[i + 2] = v * .88; }
      x.putImageData(d, 0, 0); sheetG = c;
    } catch (_) { sheetG = false; }
    return { c: im, g: sheetG || null };
  }
  const QIM = new Image(); QIM.src = 'art/ui/fx/node_q.webp';
  function icon(type, size, gray) {
    if (type === 'event' && QIM.complete && QIM.naturalWidth) { g.save(); if (gray) g.filter = 'grayscale(1) brightness(.85)'; const s2 = size * .86; g.drawImage(QIM, -s2 / 2, -s2 / 2, s2, s2); g.restore(); return; }
    const sh = sheets(); if (!sh) return;
    const k = ICON[type] || 0, sx = (k % 4) * 256, sy = (k >> 2) * 256;
    try {
      if (gray && !sh.g) { g.save(); g.filter = 'grayscale(1) brightness(.85)'; g.drawImage(sh.c, sx, sy, 256, 256, -size / 2, -size / 2, size, size); g.restore(); }
      else g.drawImage(gray ? sh.g : sh.c, sx, sy, 256, 256, -size / 2, -size / 2, size, size);
    } catch (_) {}
  }
  function seal(n, now) {
    if (n.type === 'start') return;
    const p = pos(n), R = radius(n), vis = visited(n), reach = reachable(n), cur = run.cur === n, t = (now - t0) / 1000;
    if (p.x < -80 || p.x > W + 80 || p.y < -80 || p.y > H + 80) return;
    const bob = reach ? Math.sin(t * 3 + n.id) * 1.6 : 0;
    g.save(); g.translate(p.x, p.y);
    // 不画圆底：图标直接落在地图上，靠柔和投影立住；可走的放大并发出朱红光晕，当前节点发金光
    const k = .5 + .5 * Math.sin(t * 3), sc = reach ? 1.12 + k * .05 : 1;
    g.translate(0, bob); g.scale(sc, sc);
    if (cur || reach) g.shadowColor = cur ? 'rgba(201,162,74,.95)' : reach ? `rgba(179,40,30,${.6 + .35 * k})` : 'rgba(40,28,18,.4)';
    if (cur || reach) { g.shadowBlur = cur ? 16 : 12 + k * 8; g.shadowOffsetY = 0; }
    g.globalAlpha = vis ? .75 : reach || cur ? 1 : .55;
    icon(n.type, R * 2.0, vis || (!reach && !cur));
    g.globalAlpha = 1; g.shadowBlur = 0; g.shadowColor = 'transparent'; g.shadowOffsetY = 0;
    if (vis || (run.circ && run.circ.n === n)) inkCircle(R, vis ? 1 : Math.min(1, (now - run.circ.t) / 380), n.id);   // 11/14 用户（照杀戮尖塔）：朱砂笔圈住走过/选中的节点
    if (false && n.rw && !vis) { const bc = { skill: ['招', '#3b6ea8'], perk: ['功', '#a8662a'], heal: ['疗', '#3f8a4a'], both: ['双', '#7a3a8a'] }[n.rw]; g.beginPath(); g.arc(R * .7, R * .7, 9, 0, 7); g.fillStyle = bc[1]; g.fill(); g.strokeStyle = PAPER; g.lineWidth = 1.5; g.stroke(); g.fillStyle = '#fff'; g.font = `bold 11px ${UI}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(bc[0], R * .7, R * .7 + 1); }
    g.restore();
    // 名字：可走的节点、当前、Boss 常显；其他鼠标悬停才显
    if (hov.n !== n && (cur || n.type === 'boss') && !(H < 560 && n.type !== 'boss')) tag(p, R, n, true);   // 11/14：可走节点不再常显名牌（并排时互相压住），移上去才显
  }
  function inkCircle(R, q, seed) {   // 手绘朱砂圈：起笔粗、收笔细，略歪，首尾交叠一点
    const r0 = R * 1.18, rot = seeded(seed + 3) * 6.28, N = 40, end = q * 6.28 * 1.08;
    g.save(); g.rotate(rot); g.strokeStyle = CINNABAR; g.lineCap = 'round'; g.globalAlpha = .9;
    for (let i = 0; i < N; i++) { const a0 = i / N * 6.28 * 1.08, a1 = (i + 1) / N * 6.28 * 1.08; if (a0 > end) break;
      const rr = a => r0 * (1 + .07 * Math.sin(a * 2 + seed) + .04 * Math.sin(a * 5 + seed * 2)) * (1 - .06 * a / 6.8);
      g.lineWidth = 4.2 - 3 * (i / N); g.beginPath(); g.moveTo(Math.cos(a0) * rr(a0), Math.sin(a0) * rr(a0) * .9); g.lineTo(Math.cos(Math.min(a1, end)) * rr(a1), Math.sin(Math.min(a1, end)) * rr(a1) * .9); g.stroke(); }
    g.restore();
  }
  function tag(p, R, n, full) {
    const RWS = { skill: '新武艺', perk: '心法', heal: '回血', both: '武艺+心法' }, sh = false;   // 没悬停时一行写完（相邻节点挤不下两行）
    const l1 = n.type === 'start' ? '涿郡' : nlabel(n) + (sh ? ' · ' + RWS[n.rw] : ''), l2 = sh || !full ? '' : n.type === 'start' ? '' : n.type === 'event' ? '奇遇：做个选择' : n.type === 'elite' ? '精锐 · 敌人更强，掉落更好' : n.type === 'camp' ? '营地 · 休整或修炼' : n.type === 'chest' ? '宝箱 · 开一件好东西' : full ? MAPN[MAP_OF(n.layer)] : '';
    const k = KS(), f1 = `bold ${Math.round(18 * k)}px ${FONT}`, f2 = `600 ${Math.round(13 * k)}px ${UI}`;
    g.save(); g.font = f1; const w1 = g.measureText(l1).width; g.font = f2; const w2 = l2 ? g.measureText(l2).width : 0;
    const bw = Math.max(w1, w2) + 20 * k, bh = (l2 ? 44 : 28) * k; let x = p.x - bw / 2, y = p.y + R + 10;
    if (y + bh > H - 6) y = p.y - R - 10 - bh; x = Math.max(6, Math.min(W - bw - 6, x));
    g.fillStyle = 'rgba(20,13,8,.88)'; g.fillRect(x, y, bw, bh); g.strokeStyle = 'rgba(201,163,94,.9)'; g.lineWidth = 1.5; g.strokeRect(x + .75, y + .75, bw - 1.5, bh - 1.5); g.strokeStyle = 'rgba(201,163,94,.35)'; g.lineWidth = 1; g.strokeRect(x + 3.5, y + 3.5, bw - 7, bh - 7);   // 11/14：深色金边小牌，跟开战牌匾一套
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#f3dc9a'; g.font = f1; g.fillText(l1, x + bw / 2, y + (l2 ? 15 : 14) * k);
    if (l2) { g.fillStyle = 'rgba(243,220,154,.85)'; g.font = f2; g.fillText(l2, x + bw / 2, y + 33 * k); }
    g.restore();
  }
  function tint() {   // 每一段（打谷场/县城/营寨/祭坛）一档淡墨色调，段名用大字淡淡写在背景上
    const ax = port() ? 'y' : 'x', at = l => pos({ layer: l, lane: 2, jx: 0, jy: 0 })[ax];
    for (const [k, l0, l1, rgb, al] of SECT) {
      const a = at(l0 - .5), b = at(l1 + .5), lo = Math.min(a, b), hi = Math.max(a, b), len = port() ? H : W;
      if (hi < 0 || lo > len) continue;
      const F = 110, gr = port() ? g.createLinearGradient(0, lo - F, 0, hi + F) : g.createLinearGradient(lo - F, 0, hi + F, 0), q = F / (hi - lo + 2 * F), c0 = `rgba(${rgb},0)`, c1 = `rgba(${rgb},${al})`;
      gr.addColorStop(0, c0); gr.addColorStop(q * 1.6, c1); gr.addColorStop(1 - q * 1.6, c1); gr.addColorStop(1, c0);
      g.fillStyle = gr; port() ? g.fillRect(0, lo - F, W, hi - lo + 2 * F) : g.fillRect(lo - F, 0, hi - lo + 2 * F, H);
      g.save(); g.fillStyle = `rgba(${rgb},.5)`; g.globalAlpha = .16; g.font = `${port() ? 56 : 84}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
      const c = (lo + hi) / 2; if (port()) g.fillText(MAPN[k], W * .5, c); else g.fillText(MAPN[k], c, H * .5);
      g.restore();
    }
  }
  function edge() {   // 卷轴边：内框双线、两端渐暗（还能滚就暗）、右下角印章落款
    g.save(); g.strokeStyle = 'rgba(42,33,26,.75)'; g.lineWidth = 3; g.strokeRect(9, 9, W - 18, H - 18); g.lineWidth = 1; g.strokeRect(15, 15, W - 30, H - 30);
    const fade = (x0, y0, x1, y1, a, r, gx, gy, gw, gh) => { if (a <= 0) return; const gr = g.createLinearGradient(x0, y0, x1, y1); gr.addColorStop(0, `rgba(60,42,24,${.32 * a})`); gr.addColorStop(1, 'rgba(60,42,24,0)'); g.fillStyle = gr; g.fillRect(gx, gy, gw, gh); };
    const m = maxScroll(), a0 = Math.min(1, scroll / 80), a1 = Math.min(1, (m - scroll) / 80), F = 56;
    if (port()) { fade(0, 0, 0, F, a1, 0, 0, 0, W, F); fade(0, H, 0, H - F, a0, 0, 0, H - F, W, F); } else { fade(0, 0, F, 0, a0, 0, 0, 0, F, H); fade(W, 0, W - F, 0, a1, 0, W - F, 0, F, H); }
    const s = 40, x = W - s - 26, y = H - s - 26; g.fillStyle = CINNABAR; g.globalAlpha = .9; g.fillRect(x, y, s, s); g.globalAlpha = 1; g.fillStyle = PAPER; g.font = `bold 17px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('战至', x + s / 2, y + s * .3); g.fillText('终章', x + s / 2, y + s * .72); g.restore();
  }
  function frame(now) {
    if (!shown) { raf = 0; return; }
    raf = requestAnimationFrame(frame);
    if (!drag || !drag.moved) scroll += (tScroll - scroll) * .1;
    // 静态底图（纸、淡墨分段、远山、路径）缓存成一张图：只在滚动/状态变化时重画，平时每帧只贴图 + 画发光的节点
    const key = W + 'x' + H + 'x' + DPR + '|' + scroll.toFixed(1) + '|' + (run.cur ? run.cur.id : -1) + '|' + run.visited.size + '|' + (port() ? 1 : 0);
    if (!bgC) bgC = document.createElement('canvas');
    if (key !== bgKey) {
      bgKey = key; if (bgC.width !== cv.width || bgC.height !== cv.height) { bgC.width = cv.width; bgC.height = cv.height; }
      const gMain = g; g = bgC.getContext('2d'); g.setTransform(DPR, 0, 0, DPR, 0, 0);
      g.fillStyle = PAPER; g.fillRect(0, 0, W, H);
    const bgI = port() ? BGV : BGH, bgOk = bgI.complete && bgI.naturalWidth;
    if (bgOk) {   // 11/11 Gemini 水墨长卷：随长卷慢慢平移（视差），从涿郡一路到张角祭坛
      const iw = bgI.naturalWidth, ih = bgI.naturalHeight, ms = Math.max(1, maxScroll()), t = Math.min(1, scroll / ms);
      if (port()) { const sc = Math.max(W / iw, H * 1.35 / ih), dw = iw * sc, dh = ih * sc; g.drawImage(bgI, (W - dw) / 2, -(dh - H) * (1 - t), dw, dh); }
      else { const sc = Math.max(H / ih, W * 1.35 / iw), dw = iw * sc, dh = ih * sc; g.drawImage(bgI, -(dw - W) * t, (H - dh) / 2, dw, dh); }
    } else { g.fillStyle = paperNoise(); g.fillRect(0, 0, W, H); }
    const wash = g.createRadialGradient(W * .5, H * .45, Math.min(W, H) * .2, W * .5, H * .5, Math.max(W, H) * .75);
    wash.addColorStop(0, 'rgba(255,248,230,.35)'); wash.addColorStop(1, 'rgba(120,90,50,.28)'); g.fillStyle = wash; g.fillRect(0, 0, W, H);
    tint();
    if (!bgOk) { hills(.12, .07, H * .16, 1.3); hills(.25, .11, H * .1, 4.1); hills(.45, .16, H * .045, 7.7); }
    // 路线
    for (const n of run.nodes) for (const m of n.next) {
      if (n.type === 'start') continue;   // 11/14 用户（照杀戮尖塔）：不显示固定起点，第一列直接选
      const a = pos(n), b = pos(m), seedE = n.id * 13 + m.id;
      const walked = visited(n) && visited(m), open = n === run.cur && reachable(m);
      trail(a, b, n, m, walked ? 2 : open ? 1 : 0, seedE);
    }
      g = gMain;
    }
    g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(bgC, 0, 0); g.setTransform(DPR, 0, 0, DPR, 0, 0);
    for (const n of run.nodes) { try { seal(n, now); } catch (e) { if (!window._rtErr) { window._rtErr = 1; console.error('route seal', e); } } }
    if (hov.n) tag(pos(hov.n), radius(hov.n), hov.n, true);   // 悬停的牌子最后画，不被旁边节点压住
    // 抬头：章节、血量、提示（手机竖屏先垫一层纸色渐隐，免得节点叠在字上）
    if (port()) { const hb = g.createLinearGradient(0, 0, 0, 132); hb.addColorStop(0, 'rgba(234,220,192,.97)'); hb.addColorStop(.75, 'rgba(234,220,192,.9)'); hb.addColorStop(1, 'rgba(234,220,192,0)'); g.fillStyle = hb; g.fillRect(0, 0, W, 132); }
    g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.fillStyle = INK;
    const k = H < 560 && !port() ? .7 : KS(); g.font = `bold ${Math.round((port() ? 36 : 48) * k)}px ${FONT}`; g.lineJoin = 'round'; g.lineWidth = 6; g.strokeStyle = 'rgba(234,220,192,.9)'; g.strokeText('第一章 · 黄巾之乱', 22, 58 * k); g.fillText('第一章 · 黄巾之乱', 22, 58 * k);
    g.font = `600 ${Math.round(15 * k)}px ${UI}`; g.globalAlpha = .78; g.fillText(port() ? '点选发亮的节点前进' : '涿郡 → 张角祭坛　点选发亮的节点前进，可拖动长卷', 24, 88 * k); g.globalAlpha = 1;
    if (window.SURV && SURV.routeHp) {
      const [hp, mx] = SURV.routeHp(), bw = Math.min(220 * k, W * .34), x = 24, y = 100 * k, bh = 16 * k;
      g.fillStyle = 'rgba(40,28,18,.6)'; g.fillRect(x, y, bw + 4, bh); g.fillStyle = CINNABAR; g.fillRect(x + 2, y + 2, bw * Math.max(0, Math.min(1, hp / mx)), bh - 4);
      g.fillStyle = INK; g.font = `bold ${Math.round(14 * k)}px ${UI}`; g.textBaseline = 'middle'; g.fillText('气血 ' + Math.ceil(hp * 10) + ' / ' + Math.round(mx * 10), x + bw + 12, y + bh / 2); g.textBaseline = 'alphabetic';
      // 11/14 用户：宝物、伤势不在地图上写，打完在结算页 / 兵籍牒看
    }
    // 图例（手机竖屏放右上，避开右下印章）
    const lg = [['battle', '普通'], ['elite', '精英'], ['event', '奇遇'], ['camp', '营地'], ['chest', '宝箱'], ['boss', '首领']]; g.font = `bold ${Math.round(14 * k)}px ${UI}`; g.fillStyle = INK; g.textAlign = 'left'; g.textBaseline = 'middle';
    let lx = 30; const ly = H - 36 * k;
    lg.forEach(([ty, t]) => { g.save(); g.translate(lx + 14 * k, ly); icon(ty, 32 * k); g.restore(); g.globalAlpha = .9; g.fillText(t, lx + 34 * k, ly + 1); g.globalAlpha = 1; lx += (port() ? 70 : 90) * k; });
    if (false) {   // 奖励角标说明（已取消：奖励统一在整备屏拿）（11/11：玩家看不懂「招/功/疗/双」）
      lx += 16 * k; const bc = [['招', '#3b6ea8', '新武艺'], ['功', '#a8662a', '心法'], ['疗', '#3f8a4a', '回血'], ['双', '#7a3a8a', '武艺+心法']];
      g.globalAlpha = .9; g.fillText('奖励：', lx, ly + 1); lx += g.measureText('奖励：').width + 6;
      for (const [c, col, t] of bc) { g.beginPath(); g.arc(lx + 9 * k, ly, 9 * k, 0, 7); g.fillStyle = col; g.fill(); g.fillStyle = '#fff'; g.font = `bold ${Math.round(11 * k)}px ${UI}`; g.textAlign = 'center'; g.fillText(c, lx + 9 * k, ly + 1); g.textAlign = 'left'; g.fillStyle = INK; g.font = `bold ${Math.round(14 * k)}px ${UI}`; g.fillText(t, lx + 22 * k, ly + 1); lx += 22 * k + g.measureText(t).width + 14 * k; }
      g.globalAlpha = 1;
    }
    edge();
  }

  if (ON) { const poll = () => { if (window.RUNSAVE && ((typeof over !== 'undefined' && over) || (typeof won !== 'undefined' && won))) RUNSAVE.clear(); if (pending && (!window.TITLE || TITLE.mode() === 'game')) { pending = false; open(); if (window.RUNSAVE) RUNSAVE.save(); } requestAnimationFrame(poll); }; requestAnimationFrame(poll); }   // 真正进游戏（不是在标题页）才打开长卷
  const MAP_OF = l => l <= 4 ? 'field' : l <= 8 ? 'town' : l <= 12 ? 'forest' : l <= 16 ? 'camp' : 'altar';   // 第 1~4 层打谷场，5~8 县城，9~12 林间空地，13~17 营寨腹地，18 张角祭坛
  window.ROUTE = {
    mapOf: n => MAP_OF(n.layer),
    on: () => ON, TIME_K, layers: () => LAYERS,
    waves: n => WAVES_OF[n.type] || 3,
    name: n => nlabel(n),
    secBoss: n => n && n.final ? [['张角', 'zhang_jiao'], [branch() === 'bao' ? '张梁' : '张宝', '']] : n && n.br ? [[n.br === 'bao' ? '张宝' : '张梁', ''], ['马元义', '']] : n && n.sec ? SECBOSS[n.sec - 1] : [],
    branch: () => branch(),   // 第 4 段走了哪边：'liang' / 'bao' / null
    tagOf: n => n.tag,
    shown: () => shown || pending,
    start() { run = { ...gen(), visited: new Set(), blessed: false }; run.cur = run.start; run.visited.add(run.start); pending = true; if (shown) close(); },
    snap() {   // 存档用：节点之间的连线存成编号
      if (!run) return null;
      return { nodes: run.nodes.map(n => ({ id: n.id, layer: n.layer, lane: n.lane, type: n.type, tag: n.tag, cat: n.cat, rw: n.rw, sec: n.sec, final: n.final, jx: n.jx, jy: n.jy, next: n.next.map(x => x.id) })), cur: run.cur.id, visited: [...run.visited].map(n => n.id), blessed: run.blessed !== false, evSeen: run.evSeen || [] };
    },
    resume(o) {
      const nodes = o.nodes.map(n => ({ ...n, next: [], prev: [] })), byLayer = [];
      o.nodes.forEach((n, i) => n.next.forEach(j => { nodes[i].next.push(nodes[j]); nodes[j].prev.push(nodes[i]); }));
      for (const n of nodes) (byLayer[n.layer] || (byLayer[n.layer] = [])).push(n);
      run = { nodes, byLayer, start: nodes.find(n => n.type === 'start') || nodes[0], visited: new Set(o.visited.map(i => nodes[i])), blessed: o.blessed !== false, evSeen: o.evSeen || [] };
      run.cur = nodes[o.cur]; pending = true; if (shown) close();
    },
    done, close, choose, posOf: n => pos(n),
    debug: () => run,
    open: () => open(),
    evTest(i) { const ev = EVENTS[i]; popup(ev.t, '', ev.d, ev.o.map(o => o.slice(0, 4)), () => {}, ev.npc, 'art/ui/ev/ev' + i + '.webp'); },   // 调试：直接弹第 i 个奇遇
  };
})();
