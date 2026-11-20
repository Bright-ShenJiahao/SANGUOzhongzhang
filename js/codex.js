// 图鉴（11/12 用户定）：小兵、首领各一页；战斗里第一次遇到才解锁（存在 localStorage szz-codex），没遇到的显示黑剪影 + ？？？
// 入口：主界面右上角「图鉴」按钮、暂停菜单「图鉴」；开发者模式「图鉴全开」。
(() => {
  const KEY = 'szz-codex';
  let seen = {}; try { seen = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { seen = {}; }
  const stoneBaoAliases = { bunangshi: 'qingshizi', hetan: 'tiedan', feihuangnang: 'feihuang', tiejishi: 'yuhua', liuxingshi: 'yunxing' };
  for (const [old, current] of Object.entries(stoneBaoAliases)) {
    if (seen['bao:' + old]) seen['bao:' + current] = true;
  }
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
    ['slinger', '投石手', 'slinger', '第 1 段起', '放羊娃出身，甩石子百发百中。', ['投石：站在远处甩石块，看准落点就能躲。']],
    ['blade', '刀手', 'blade', '第 1 段起', '黄巾里最常见的步卒，一把环首刀砍人不眨眼。', ['劈砍：举刀蓄力后劈下，比喽啰打得重。']],
    ['thief', '黄巾窃贼', 'thief', '第 1 段起', '背着麻袋专捡地上的铜钱，打不过就跑。', ['偷钱：捡走地上的铜钱，跑掉就拿不回来。', '打倒他钱袋会破，连本带利吐出来。']],
    ['archer', '弓箭手', 'archer', '第 2 段起', '猎户入伙，箭头裹着浸了油的布。', ['火箭：抛射火箭，落地前地上有红圈预警。']],
    ['fire-jar', '火罐手', 'fire_jar', '第 2 段起', '背着一篓火油罐的纵火贼。', ['火油罐：扔向你脚下，落地烧出一片火，3 秒内站在里面持续掉血。']],
    ['yellow-spear', '枪兵', 'yellow_spear', '第 3 段起', '长枪比人还高，专戳冲得太近的人。', ['突刺：停在中距离，地上出现一条细长预警线，0.75 秒后往前突刺。']],
    ['yellow-shield', '盾兵', 'yellow_shield', '第 2 段起', '举着木盾顶在最前排。', ['举盾：远程打他只吃七成伤害。', '盾撞：地上出现一条预警线，随后举盾往前撞一段，把你推开。']],
    ['yellow-heavy', '大刀兵', 'yellow_heavy', '第 2 段起', '膀大腰圆的壮汉，抡着厚背大刀。', ['横劈：走到身边后蓄力约 1 秒，朝你横扫一片，劈完会喘口气。']],
    ['fanatic', '狂信徒', 'fanatic', '第 4 段起', '喝了符水、不知疼痛的信徒。', ['扑击：跑得最快，冲到身边扑打。', '自爆：倒下 0.45 秒后炸开一小圈，别贴着杀。']],
    ['drummer', '鼓手', 'drummer', '第 3 段起', '胸前挂着战鼓，鼓声一响，黄巾就红了眼。', ['擂鼓：附近黄巾 4 秒内动作快 30%（脚下发红光）。', '自己不打人，最好先杀。']],
    ['priest', '黄巾方士', 'priest', '第 4 段起', '太平道的小道士，摇铃念咒，能救人也能放火。', ['回春：附近有受伤的黄巾就给他们回血。', '符火：没人受伤时朝你丢一团符火，落地烧 2 秒。']],
    ['crossbow', '黄巾弩手', 'crossbow', '第 3 段起', '端着大弩的老兵，一箭能射穿两个人。', ['穿透弩：半蹲瞄准时地上出现一条细红线，0.8 秒后射出，线上的全中。']],
    ['cavalry', '黄巾骑兵', 'cavalry', '第 3 段起', '骑着抢来的土马，挺矛冲阵。', ['冲锋：绕着你兜圈，停下后出一条预警线，直线冲过去；冲过头会掉头再冲一次（预警更短）。', '血比步卒厚。']],
    ['elite', '老卒', 'elite', '第 1 段起', '打过几场硬仗的老兵，刀口都卷了。', ['刀气：蓄力后劈出一道扇形刀气，出手不会被打断。', '精英：打倒掉 5 枚铜钱。']],
    ['yellow-golem', '黄巾力士', 'yellow_golem', '第 3 段起', '喝了符水、力大无穷的巨汉。', ['重拳：一拳能把人打飞，血非常厚。', '精英：打倒掉 5 枚铜钱。']],
    ['yellow-catapult', '投石车', 'yellow_catapult', '投石车节点', '黄巾从官府抢来的守城器械。', ['砸石：远程抛大石，落点有预警圈。', '拆掉掉 5 枚铜钱。']],
  ];
  // [键, 名字, 贴图, 出现, 一句简介, 技能（11/20 按重做后的招式重写）, 生平（11/20 用户：每个人都要有故事，按史书和演义写）]
  const BOSSES = [
    ['deng_mao', '邓茂', 'deng_mao', '第 1 段副将', '程远志的副将，性情暴躁，使一口九环大刀。', ['九环冲斩：地上先出一条直线，随后拖刀猛冲过去，冲到头再往上一撩。', '掷环：三枚铁环沿三条细线扇形飞出，站到线外就躲得开。', '震地三刀：连劈三刀，三道地缝一道比一道远。'],
      '《三国演义》开篇的人物。他随渠帅程远志引五万黄巾进犯涿郡，在大兴山下与刘备的乡勇对阵。两军阵前他挺身出马，被张飞挺丈八蛇矛一矛刺中心窝，翻身落马——这是演义里张飞斩的第一员将。正史不见其名。'],
    ['cheng_yuanzhi', '程远志', 'cheng_yuanzhi', '第 1 段首领', '黄巾渠帅，率五万之众进犯涿郡。', ['大刀回旋：长柄大刀脱手飞出再飞回，去回都伤人；刀没回来前他空手站着。', '横扫千军：以自己为圆心大范围横扫。'],
      '演义里的黄巾渠帅。他率五万之众进犯涿郡，幽州太守刘焉急忙招募义兵，刘备由此领关羽、张飞出战。程远志见副将邓茂被张飞刺死，拍马舞刀直取张飞，被关羽迎上，一刀挥为两段，黄巾大溃。刘关张三兄弟的第一仗就打在他身上。正史无此人。'],
    ['he_yi', '何仪', 'he_yi', '第 2 段副将', '汝南黄巾头领，双戟在手，身法迅捷。', ['三连闪突：连冲三段，每段前地上先出一条线、并重新对准你；冲完喘口气。', '飞戟：把戟甩出去再飞回来，去回都伤人。', '旋身双戟：原地抡两圈双戟，贴身最危险。'],
      '汝南、颍川一带的黄巾头领，与刘辟、黄邵、何曼等人各拥部众数万。张角兵败后，他们仍在豫州活动了十多年，先响应袁术，后又依附孙坚。建安元年（196 年）曹操进兵讨伐，斩了刘辟、黄邵，何仪率部众投降。'],
    ['bo_cai', '波才', 'bo_cai', '第 2 段首领', '颍川黄巾大帅，背插令旗，号令千军。', ['旋斧突进：抡开山大斧原地起转，边转边追你；转完站不稳，晃两下。', '令旗箭雨：挥动令旗，你周围落下一片箭，落点先出红圈。', '火烧草营：举火把在身边烧起一圈火，烧完地上留一圈火，3 秒多才灭。', '半血暴怒：动作更快，箭雨更密。'],
      '颍川黄巾大帅。中平元年（184 年）他大败朱儁，把皇甫嵩围在长社。黄巾依草扎营，偏逢大风，皇甫嵩让士卒各束火把，派精兵潜出城外纵火呐喊，城上举火响应，趁乱杀出。恰逢曹操领兵赶到，汉军合力大破波才。他退到阳翟，又被追上击破。游戏里他学乖了——这回点火的是他。'],
    ['zhang_mancheng', '张曼成', 'zhang_mancheng', '第 3 段副将', '南阳黄巾首领，自称「神上使」。', ['神行符：化作黄烟顺着地上的线高速滑过来，身后留下残影。', '火符：一次甩出三张火符，落地烧起一小片火。', '符阵火环：插符起阵，在身边烧起一圈火环，只留一个缺口；起完阵喘口气。'],
      '南阳黄巾首领，自称「神上使」，聚众数万。中平元年三月，他攻杀南阳太守褚贡，屯兵宛城一百多天。六月，新任太守秦颉率军进击，把他斩杀。余部又推赵弘为帅，继续据守宛城。'],
    ['guanhai', '管亥', 'guanhai_m', '第 3 段首领', '北海黄巾猛将，马上使一杆长戟。', ['骑马：纵马冲阵（顺着地上的粗线冲过来）、马上掷戟、人立马踏（马前蹄扬起砸地，身边一圈）。', '半血被打下马，摔倒僵直一会儿，改成步战。', '步战：跃斩（跳起砸在你脚下）、掷戟（戟插进地里，他空手发愣，再跑过去拔）、旋戟。'],
      '北海黄巾头领。孔融任北海相时，管亥率众把他围在都昌。孔融派太史慈单骑突围，去向平原相刘备求救。刘备又惊又喜：「孔北海知世间有刘备邪！」当即派精兵三千随太史慈赶去，黄巾闻讯解围散走。演义把这一段写成关羽阵前斩管亥。'],
    ['ma_yuanyi', '马元义', 'ma_yuanyi', '最终副将', '潜入洛阳的黄巾大方首领，斗笠黑衣。', ['飞爪：朝你甩出飞爪钩住地面，把自己拉过去，落地横扫一圈。', '流星直击：流星锤甩出去再拉回来，去回都伤人，收锤后停一下。', '旋锤：原地抡三圈流星锤。'],
      '太平道「大方」首领。他先在荆州、扬州聚起数万人，约定在邺城会合；又多次往来京城洛阳，买通中常侍封谞、徐奉做内应，定下三月五日内外同时起事。还没动手，张角的弟子唐周就上书告密。马元义在洛阳被车裂，宫中和百姓里信奉太平道的被杀了一千多人，张角只得提前起兵。'],
    ['zhang_bao', '张宝', 'zhang_bao_q', '第 4 段首领', '地公将军，张角二弟，擅长妖术。', ['地遁：钻进地里，在你脚边破土而出，出土前地上先出圈。', '火雨：你周围依次砸下火球，落点先出圈。', '土墙：在你身后升起一排土墙堵退路，只留一个缺口，过一会儿倒塌。', '半血：召出两个分身，血少、伤害低，打掉就散。'],
      '张角二弟，号「地公将军」。演义里他会妖术，作起法来风雷大作，半空里杀出无数人马；刘备照朱儁的计策，在山头埋伏下猪羊狗血，一泼之下妖法尽破。正史里，中平元年十一月，皇甫嵩与巨鹿太守郭典在下曲阳攻破张宝，将他斩首，斩获十余万人。'],
    ['zhang_liang', '张梁', 'zhang_liang_q', '第 4 段首领', '人公将军，张角三弟，以勇猛著称。', ['双刀旋风：双刀抡开边转边追你两秒多，转完头晕——正是反击的时候。', '十字刀气：朝你劈出一道十字刀气，顺着地上的线飞过来。', '人公冲锋：地上出一条粗线，随后直线撞过来。', '半血狂怒：更快，出招几乎不停。'],
      '张角三弟，号「人公将军」。张角病死后，他统领黄巾主力据守广宗。他的部众精悍勇猛，皇甫嵩头一天攻不下，便闭营休兵、等黄巾松懈，再趁夜整军，鸡鸣时突袭，一直打到傍晚。张梁战死，黄巾被斩三万，投河而死的有五万多人。'],
    ['zhang_jiao', '张角', 'zhang_jiao_q', '最终首领', '天公将军，太平道大贤良师，以《太平要术》号令天下黄巾。', ['符遁：化符消失，过一会儿在你附近另一处现身。', '雷符：三张符追着你飘，随后在你脚下落雷；半血后多落两道。', '天雷：举杖召雷，全场随机落雷，其中一道必定劈在你脚下。', '黄天当立（半血）：浮空高呼「苍天已死，黄天当立」，身边召出八名黄巾，周围连落十道雷。'],
      '巨鹿人，自称「大贤良师」，奉事黄老之道，用符水咒语给人治病。十余年间信徒数十万，遍及青、徐、幽、冀、荆、扬、兖、豫八州。他把信徒编成三十六方，大方一万多人、小方六七千人，各立渠帅，传言「苍天已死，黄天当立，岁在甲子，天下大吉」。中平元年因马元义事泄而提前起事，自称天公将军。同年他病死在广宗，汉军破城后开棺戮尸，把首级送往京师。'],
  ];
  // 11/20 用户：图鉴加「人物」页——主角和刘关张（不用解锁）：[键, 名字, 格子图, 立绘, 身份, 一句简介, 生平, 在游戏里]
  const PEOPLE = [
    ['hero', '你', 'art/ui/npc/hero_lihui.webp', 'art/ui/npc/hero_lihui.webp', '穿越者', '深夜还开着一局三国游戏，眼前一黑，再睁眼已是中平元年的涿郡。',
      '穿越前是干什么的，开局由你来选：种过地、当过兵、打过猎、读过史，或者练过几年武。你没有名将的天赋，靠的是一招一式打出来的熟练，和一路捡来的秘籍、宝物。跟着刘关张，从涿郡一路杀到张角的祭坛——这段历史，也许能由你改写。',
      ['开局选的兵器是本门，伤害 +10%；其他兵器也能学，只是外门伤害 −15%。', '武艺按装备顺序自动出招，你只管走位和翻滚。']],
    ['liubei', '刘备', 'art/ui/npc/liubei_face.webp', 'art/ui/npc/liubei_lihui.webp', '大哥', '中山靖王之后，织席贩履的涿郡人。',
      '字玄德，涿郡涿县人，汉景帝之子中山靖王刘胜的后代。他少年丧父，和母亲靠卖鞋、织席过活。平日话不多，喜怒不形于色，最爱结交豪杰。黄巾起事那年，他在涿郡聚众起兵讨贼，关羽、张飞都追随他左右。后来一路从安喜县尉做到蜀汉昭烈帝。',
      ['出征前「桃园三赠」：送盘缠、宽厚（气血上限 +10%）或织席草鞋。', '每段首领出场前，他会先喊一句。']],
    ['guanyu', '关羽', 'art/ui/npc/guanyu_face.webp', 'art/ui/npc/guanyu_lihui.webp', '二哥', '红脸长髯，手提青龙偃月刀。',
      '字云长，本字长生，河东解县人。他因事亡命，逃到涿郡，结识了刘备。他和张飞一起护卫刘备，三人睡同一张床，情同兄弟。据说他好读《左氏春秋》，能大段背诵。演义里他使八十二斤青龙偃月刀，第一仗就把黄巾渠帅程远志一刀挥为两段。',
      ['出征前「桃园三赠」：指点刀法（起手的武艺直接 LV3）、赠书（学一门心法）或夜读春秋（修为 +60）。']],
    ['zhangfei', '张飞', 'art/ui/npc/zhangfei_face.webp', 'art/ui/npc/zhangfei_lihui.webp', '三弟', '豹头环眼，声若巨雷，丈八蛇矛。',
      '字益德（演义作翼德），涿郡人。他年少时就和关羽一同追随刘备；关羽比他大几岁，他便以兄长相待。演义里他是涿郡卖酒屠猪的庄户，使一杆丈八蛇矛，第一仗就一矛刺死邓茂。后来长坂兵败，他据水断桥，横矛大喝「身是张益德也，可来共决死！」，曹军竟无人敢上前。',
      ['出征前「桃园三赠」里他的礼最重，也最要命：痛饮、欠酒钱、拼命，都得拿东西去换。']],
  ];
  // 11/20 用户定：小兵用着甲新画风站立图；首领格子用新头像，点开看立绘
  const PXA = { grunt: 'grunt_pxa', blade: 'blade_pxa', slinger: 'slinger_pxa', archer: 'archer_pxa', elite: 'elite_pxa', priest: 'priest_pxa', yellow_heavy: 'heavy_pxa', yellow_shield: 'shield_pxa', yellow_spear: 'spear_pxa', yellow_golem: 'golem_pxa', fire_jar: 'firejar_pxa', drummer: 'drum_pxa', cavalry: 'cav_pxa', fanatic: 'fanatic_pxa', crossbow: 'xbow_pxa', thief: 'thief_pxa' };
  for (const e of UNITS) if (PXA[e[2]]) { e[2] = PXA[e[2]]; delete PIC[e[0]]; }
  const LH = { deng_mao: 'art/ui/npc/deng_mao_lihui.webp', cheng_yuanzhi: 'art/ui/npc/cheng_yuanzhi_lihui.webp', he_yi: 'art/ui/npc/he_yi_lihui.webp', bo_cai: 'art/ui/npc/bo_cai_lihui.webp', zhang_mancheng: 'art/ui/npc/zhang_mancheng_lihui.webp', guanhai: 'art/ui/npc/guanhai_lihui.webp', ma_yuanyi: 'art/ui/npc/ma_yuanyi_lihui.webp', zhang_bao: 'art/ui/npc/zhang_bao_lihui.webp', zhang_liang: 'art/ui/npc/zhang_liang_lihui.webp', zhang_jiao: 'art/ui/npc/zhangjiao_lihui.webp' };
  const ALL = UNITS.concat(BOSSES);
  // 11/13 用户定：按强弱排序编号；小兵格子按游戏里的真实大小统一比例显示（不再各自撑满格子）
  const no = e => { const L = UNITS.includes(e) ? UNITS : BOSSES; return 'No.' + String(L.indexOf(e) + 1).padStart(2, '0'); };
  const dim = e => { const f = typeof ASSETS !== 'undefined' && ASSETS.chars && ASSETS.chars[e[2]] && ASSETS.chars[e[2]].idle; const t = typeof TYPES !== 'undefined' && TYPES[e[0]]; return f ? [f[1], f[2], (t && t.scale) || 1] : null; };
  let UK = 0; const uk = () => { if (UK) return UK; UK = 9; for (const e of UNITS) { if (e[0] === 'yellow-catapult') continue; const d = dim(e); if (d) UK = Math.min(UK, 80 / (d[1] * d[2])); } return UK; };
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
#szzCodex .gw{flex:1;min-width:0;min-height:0;display:flex;flex-direction:column}#szzCodex .wf{display:none;flex-wrap:wrap;gap:6px;padding:10px 12px 0}#szzCodex .wf.on{display:flex}#szzCodex .wf button{padding:2px 10px;border:1px solid rgba(184,149,90,.35);background:transparent;color:#c9b48a;font:600 13px inherit;cursor:pointer}#szzCodex .wf button.on{background:rgba(184,149,90,.22);color:#ffe2a0;border-color:rgba(230,190,110,.8)}
#szzCodex .gr{flex:1;min-height:0;overflow:auto;padding:12px;display:grid;grid-template-columns:repeat(auto-fill,minmax(92px,1fr));gap:10px;align-content:start}
#szzCodex .cd{height:118px;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:4px;padding:6px 4px;border:1px solid rgba(184,149,90,.25);background:rgba(255,255,255,.03);cursor:pointer}
#szzCodex .cd:hover,#szzCodex .cd.sel{border-color:rgba(240,200,120,.85);background:rgba(184,149,90,.14)}
#szzCodex .cd{position:relative}#szzCodex .cd .nb{position:absolute;left:5px;top:3px;font-style:normal;font-size:11px;color:#b8955a;opacity:.85;font-family:monospace}#szzCodex .cd img{max-width:84px;max-height:82px;object-fit:contain;image-rendering:pixelated}
#szzCodex .cd span{font-size:13px;color:#e8dcc0;white-space:nowrap}
#szzCodex .si{width:74px;height:74px;flex:none;background:#241e17 center/cover no-repeat;border:1px solid rgba(184,149,90,.5);display:flex;align-items:center;justify-content:center;font:700 40px Pixel12,sans-serif}#szzCodex .lk .si{filter:grayscale(1) brightness(.38) contrast(1.1)}#szzCodex .dt .pic .si{width:150px;height:150px;font-size:80px}#szzCodex .tr{font-weight:700}
#szzCodex .gr,#szzCodex .dt{scrollbar-width:thin;scrollbar-color:rgba(184,149,90,.55) rgba(0,0,0,.25)}
#szzCodex ::-webkit-scrollbar{width:8px;height:8px}#szzCodex ::-webkit-scrollbar-track{background:rgba(0,0,0,.25)}#szzCodex ::-webkit-scrollbar-thumb{background:linear-gradient(180deg,#8a6a3a,#5c4524);border:1px solid rgba(230,190,110,.35);border-radius:4px}#szzCodex ::-webkit-scrollbar-thumb:hover{background:#b8955a}#szzCodex ::-webkit-scrollbar-button{display:none}
#szzCodex .cd.tm{height:auto;min-height:0;padding:12px 6px;justify-content:center}#szzCodex .cd.tm b{font:700 17px inherit;color:#f0d89a;letter-spacing:2px}#szzCodex .cd.tm i{font-style:normal;font-size:12px;color:#a8977a}
#szzCodex .lk img{filter:brightness(0) opacity(.55)}
#szzCodex .lk span{color:#7a6c58}
#szzCodex .dt{width:min(360px,40%);border-left:1px solid rgba(184,149,90,.3);padding:16px 18px;overflow:auto}
#szzCodex .dt .pic{height:190px;display:flex;align-items:center;justify-content:center;margin-bottom:10px;background:radial-gradient(ellipse at 50% 60%,rgba(184,149,90,.18),rgba(0,0,0,0) 70%)}
#szzCodex .dt .pic img{max-width:100%;max-height:100%;object-fit:contain;image-rendering:pixelated}#szzCodex .dt .pic.lh{height:300px;align-items:flex-end}#szzCodex .dt .pic.lh img{image-rendering:auto}
#szzCodex .dt h3{margin:0 0 4px;font:700 22px "Songti SC","Noto Serif SC",serif;letter-spacing:.2em;color:#ffe2a0}
#szzCodex .dt .tg{display:inline-block;margin-bottom:10px;padding:1px 8px;border:1px solid rgba(184,149,90,.5);font-size:12px;color:#c9b48a}
#szzCodex .dt p{margin:0 0 12px;line-height:1.6;color:#e8dcc0;font-size:14px}
#szzCodex .dt h4{margin:0 0 6px;font-size:13px;color:#c9a560;letter-spacing:.2em}
#szzCodex .dt ul{margin:0;padding-left:18px;font-size:13px;line-height:1.7;color:#ddd0b4}
#szzCodex .dt .no{color:#8a7a62;font-size:14px;line-height:1.7}
#szzCodex .tbs{display:flex;gap:10px;min-width:0;overflow-x:auto;scrollbar-width:none}#szzCodex .tbs::-webkit-scrollbar{display:none}#szzCodex .tb{flex:none}#szzCodex .x{flex:none}#szzCodex .bk{display:none}#szzCodex .dt p,#szzCodex .dt li{text-wrap:pretty}#szzCodex .cd img.pf{width:84px;height:82px;object-fit:cover;object-position:50% 12%;image-rendering:auto}@media (max-width:760px){#szzCodex .hd{flex-wrap:wrap;row-gap:8px}#szzCodex .tbs{order:5;flex:1 0 100%}#szzCodex .tbs .tb{padding:4px 12px!important}}@media (max-aspect-ratio:1/1){#szzCodex .cx{width:100vw;height:100%}#szzCodex .bd{position:relative}#szzCodex .dt{display:none;position:absolute;inset:0;width:auto;max-height:none;border-left:0!important;background:#0d0b09;padding:10px 14px 18px;z-index:2}#szzCodex .bd.sd .dt{display:block}#szzCodex .dt .bk{display:block;position:sticky;top:-10px;z-index:3;width:auto!important;height:auto!important;min-height:0!important;margin:-10px -14px 8px!important;padding:8px 14px!important;border:0!important;border-bottom:1px solid #4a3c25!important;background:#0d0b09!important;box-shadow:none!important;color:#f0d89a!important;font:400 16px Pixel12,sans-serif!important;text-align:left;cursor:pointer;border-image:none!important}#szzCodex .dt .bk:before,#szzCodex .dt .bk:after{display:none!important;content:none!important}#szzCodex .dt .pic{height:150px}#szzCodex .dt .pic.lh{height:min(46vh,360px)}#szzCodex .dt p{font-size:15px}#szzCodex .dt ul{font-size:14px}}
@media (max-height:500px){#szzCodex .cx{height:96vh}#szzCodex .cd{height:96px}#szzCodex .cd img{max-height:62px}#szzCodex .dt .pic{height:120px}#szzCodex .hd{padding:6px 12px}#szzCodex .gr{grid-template-columns:repeat(auto-fill,minmax(80px,1fr))}}`;
  const box = document.createElement('div'); box.id = 'szzCodex'; box.hidden = true;
  box.innerHTML = '<div class="cx"><div class="hd"><h2>图鉴</h2><div class="tbs"><button type="button" class="tb" data-t="u">小兵</button><button type="button" class="tb" data-t="b">首领</button><button type="button" class="tb" data-t="p">人物</button><button type="button" class="tb" data-t="w">武学</button><button type="button" class="tb" data-t="q">宝物</button><button type="button" class="tb" data-t="t">术语</button></div><span class="ct"></span><button type="button" class="x" aria-label="关闭">✕</button></div><div class="bd"><div class="gw"><div class="wf"></div><div class="gr"></div></div><div class="dt"><button type="button" class="bk">‹ 返回</button><div class="dc"></div></div></div></div>';
  let tab = 'u', sel = null, wf = -1;
  // 11/14 用户定：图鉴加「术语」页，游戏里出现的说法都能在这查（不用解锁）
  const TERMS = [
    ['出招', '起手', '一招打出去之前的准备时间。起手时翻滚，这一招作废，直接换下一招。'],
    ['出招', '收势', '一招打完之后收招的时间。收势时翻滚，立刻收招，接着出下一招。'],
    ['出招', '出手快慢', '起手 + 收势加起来的快慢，分 极快 / 快 / 中 / 慢 / 极慢。越强、范围越大的招式通常越慢。'],
    ['出招', '翻滚', '滚的时候刀枪不入。武艺按装备顺序一招接一招自动打出，翻滚可以打断或收招。'],
    ['属性', '气血', '你的血量，掉光就输。'],
    ['属性', '真气', '蓝条。挨打时先扣真气替你挡三成伤害（护体）；点亮发劲的武艺出手时也耗真气。每仗开打回满，见底就力竭。'],
    ['属性', '暴击', '出手有几率打出暴击，造成加倍伤害。运气、道具和心法都能提高暴击率。'],
    ['成长', '熟练', '同一招打得越多越熟练，从 LV1 升到 LV10。升级只涨伤害（LV10 约 1.75 倍），起手和收势也会快一点；LV3、LV5、LV7 各解锁一个新效果。'],
    ['成长', '兵器精通', '装备的武艺里同一种兵器有 2 招起就算精通：2 招 +8%、3 招 +16%、4 招 +26%、5 招 +40% 这种兵器的武艺伤害。'],
    ['成长', '本门 / 外门', '开局选的兵器是本门，它的武艺伤害 +10%；出身的另一种兵器不加不减；其他兵器是外门，照样能学能用，但伤害 −15%。'],
    ['成长', '品阶', '武艺和心法分 黄阶、玄阶、地阶、天阶，越往后越强，也越少见。'],
    ['成长', '心法', '被动功法，装上就一直生效，比如加暴击、加真气、加移速。'],
    ['状态', '破甲', '敌人被破甲后，每层多受 10% 伤害，最多 4 层，5 秒后消失。刀、关刀、枪的招式会挂。'],
    ['状态', '流血', '敌人每 0.5 秒掉一次血，层数越多掉得越快，最多 5 层，4 秒后消失。有的大招会把流血一口气引爆。'],
    ['状态', '浮空', '小兵被挑飞到空中约 1.8 秒，这段时间多受 25% 伤害，落地时再吃一下并晕 0.5 秒。精英和首领不会被挑飞，只吃一半的加成。同一个敌人 10 秒内挑飞越多次越短，第 4 次起免疫。'],
    ['状态', '迟缓', '普通敌人移速降低 20%，精锐降低 12%，均持续 2.5 秒；首领移速降低 8%，持续 2 秒。迟缓不叠层，命中时刷新，保留较长时长。迟缓只影响移动速度。'],
    ['状态', '眩晕', '敌人站着不动、不能出手，持续时间很短。'],
    ['状态', '灼烧', '敌人着火，每 0.5 秒掉一次血，最多 3 层，3 秒后熄灭；带灼烧的敌人死了会把火溅给身边的人。黄符的火系会挂。'],
    ['状态', '湿身', '敌人被雨淋湿 4 秒，移速降低 10%，受到黄符伤害 +12%。黄符的雨系会挂。'],
    ['联动', '导电', '黄符的雷打到湿身的敌人：这一下 ×1.5，并跳到附近所有湿身的敌人身上。'],
    ['联动', '蒸腾', '黄符的火打到湿身的敌人：照样着火，另外炸一团白雾，然后湿身消失。'],
    ['属性', '发劲', '在整备「武学」页点亮武艺右下角的小灯。这一路每次出手多耗 5% 真气上限，伤害 ×1.35、范围略大。真气不够或力竭时不发劲。'],
    ['属性', '力竭', '真气见底时进入力竭：护体不再挡伤害，发劲也停下。真气回到两成后自动恢复。'],
    ['属性', '调息', '每仗打完，剩下的真气按两成换成气血。内力属性越高转得越多。'],
    ['状态', '迷乱', '敌人原地乱走、不追你、不出手，持续 1.5 秒。精锐只迷乱一半时间，首领不受影响。羽扇的招式会挂。'],
    ['联动', '风撞', '被羽扇推开或吹飞的小兵，0.4 秒内撞上别的敌人，双方各受一下伤害。把人往人堆里吹最划算。'],
    ['联动', '剑痕', '同一个敌人 2 秒内被剑招打中 3 下，追加一道剑痕：多一下伤害并挂 1 层流血。'],
    ['联动', '爆劲', '拳每打中一下攒 1 点劲（最多 10 点，3 秒不打就清零）；劲满时，招式的收尾一击伤害翻倍、眩晕并把人震飞。'],
    ['联动', '碎甲', '关刀打中已有 3 层破甲的敌人，会多砍一下、清掉破甲并把人震开。'],
  ];
  // 11/14 用户定：图鉴加「武学」页——全部武艺按兵器、黄玄地天排好；学过才解锁（没学过黑剪影 + ？？？）
  const TCOL = ['#c9b27a', '#c9b27a', '#6fb8ff', '#c58cff', '#ffb347'];
  const T = () => window.SURV && SURV.trial;
  const SKL = () => { const t = T(); if (!t) return []; return Object.keys(t.SK).filter(k => !t.SK[k].off).map(k => ({ k, id: 'sk:' + k, o: t.SK[k], w: t.wepOf(k) })).sort((a, b) => a.w - b.w || (a.o.tier || 0) - (b.o.tier || 0)); };
  const list = () => tab === 'u' ? UNITS : tab === 'b' ? BOSSES : SKL().filter(e => wf < 0 || e.w === wf);
  const has = k => !!seen[k];
  const sIco = e => { const u = T().IMGU[e.k]; return u ? `<div class="si" style="background-image:url('${u}')"></div>` : `<div class="si" style="color:${e.o.color}">${e.o.icon}</div>`; };
  const tierTx = e => (e.o.tier ? T().TIERN[e.o.tier] + '阶' : '基础');
  function wDetail(e) {
    const dt = box.querySelector('.dc'); if (!e) { dt.innerHTML = '<p class="no">点左边的武艺看详情。</p>'; return; }
    const t = T(), wn = t.WEPN[e.w];
    if (!has(e.id)) { dt.innerHTML = `<div class="pic lk">${sIco(e)}</div><h3>？？？</h3><span class="tg">${wn} · ${tierTx(e)}</span><p class="no">尚未学会。拾取或在行商买下秘籍学会后解锁。</p>`; return; }
    dt.innerHTML = `<div class="pic">${sIco(e)}</div><h3>${e.o.name}</h3><span class="tg">武艺 · ${wn} · <b class="tr" style="color:${TCOL[e.o.tier || 0]}">${tierTx(e)}</b></span>${(() => { const p = SURV.wuParts ? SURV.wuParts(e.k) : null; if (!p) return `<h4>效 果</h4><p>${e.o.desc}</p>`; return `<h4>出招方式</h4><p>${p.shape}</p><h4>特殊效果</h4><p>${p.state}</p><h4>修炼效果</h4><ul class="lvl">${p.lv.filter(x => x.l === 1 || x.sp).map(x => `<li><b>LV${x.l}</b>　${x.sp || x.up}</li>`).join('')}</ul>`; })()}<h4>出 手</h4><p>${t.spdTxt(e.o)}</p>`;
  }
  function detail(e) {
    const dt = box.querySelector('.dc'); if (!e) { dt.innerHTML = '<p class="no">点左边的头像看详情。</p>'; return; }
    if (!has(e[0])) { dt.innerHTML = `<div class="pic lk"><img src="${img(e)}" alt="" style="filter:brightness(0) opacity(.55)"></div><h3>？？？</h3><span class="tg">${e[3]}</span><p class="no">尚未遇到。在战斗中第一次遇到后解锁。</p>`; return; }
    dt.innerHTML = `<div class="pic${LH[e[0]] ? ' lh' : ''}"><img src="${LH[e[0]] || img(e)}" alt=""></div><h3>${no(e)}　${e[1]}</h3><span class="tg">${e[3]}</span><p>${e[4]}</p><h4>技 能</h4><ul>${e[5].map(t => `<li>${t}</li>`).join('')}</ul>${e[6] ? `<h4>生 平</h4><p>${e[6]}</p>` : ''}`;
  }
  // 11/15 用户：图鉴加「宝物」页——兵器宝物按兵器分，其余算通用；拿到过才解锁
  const BQ = () => { const S2 = window.SURV; if (!S2 || !S2.BAO) return []; return Object.keys(S2.BAO).map(k => ({ k, id: 'bao:' + k, o: S2.BAO[k], w: S2.BAO[k].w != null ? S2.BAO[k].w : -2 })).sort((a, b) => (a.w === -2) - (b.w === -2) || a.w - b.w || a.o.q - b.o.q); };
  const bIco = e => `<div class="si" style="background-image:url('${e.o.image || `art/ui/bao/${e.k}.webp`}')"></div>`;
  function qDetail(e) {
    const dt = box.querySelector('.dc'); if (!e) { dt.innerHTML = '<p class="no">点左边的宝物看详情。</p>'; return; }
    const S2 = SURV, qn = S2.BQN[e.o.q], qc = S2.BQC[e.o.q], wn = e.w >= 0 ? T().WEPN[e.w] + '的兵器宝物' : '通用宝物';
    if (!has(e.id)) { dt.innerHTML = `<div class="pic lk">${bIco(e)}</div><h3>？？？</h3><span class="tg">${wn} · ${qn}</span><p class="no">尚未获得。打精锐、首领、开宝箱或在奇遇中获得后解锁。${e.w >= 0 ? '学过这种兵器的武艺才会刷出来。' : ''}</p>`; return; }
    dt.innerHTML = `<div class="pic">${bIco(e)}</div><h3>${e.o.n}</h3><span class="tg">${wn} · <b class="tr" style="color:${qc}">${qn}</b></span><h4>效 果</h4><p>${e.o.d}</p>${e.o.c ? `<h4>代 价</h4><p style="color:#ff8a7a">${e.o.c}</p>` : ''}`;
  }
  function pDetail(e) {
    const dt = box.querySelector('.dc'); if (!e) { dt.innerHTML = '<p class="no">点左边的头像看详情。</p>'; return; }
    dt.innerHTML = `<div class="pic lh"><img src="${e[3]}" alt=""></div><h3>${e[1]}</h3><span class="tg">${e[4]}</span><p>${e[5]}</p><h4>生 平</h4><p>${e[6]}</p><h4>在游戏里</h4><ul>${e[7].map(t => `<li>${t}</li>`).join('')}</ul>`;
  }
  function render() {
    box.querySelector('.bd').classList.toggle('sd', sel != null); if (sel !== render.ls) { render.ls = sel; box.querySelector('.dt').scrollTop = 0; }
    box.querySelectorAll('.tb').forEach(b => b.classList.toggle('on', b.dataset.t === tab));
    const wfb = box.querySelector('.wf'); wfb.classList.toggle('on', tab === 'w' || tab === 'q');
    if (tab === 'q') {
      const t = T(), all = BQ(), ws = [...new Set(all.map(e => e.w))];
      wfb.innerHTML = `<button data-w="-1" class="${wf === -1 ? 'on' : ''}">全部</button>` + ws.map(w => `<button data-w="${w}" class="${wf === w ? 'on' : ''}">${w === -2 ? '通用' : t.WEPN[w]}</button>`).join('');
      const L = all.filter(e => wf === -1 || e.w === wf); box.querySelector('.ct').textContent = `已获得 ${L.filter(e => has(e.id)).length} / ${L.length}`;
      const gr = box.querySelector('.gr'); gr.innerHTML = '';
      for (const e of L) {
        const c = document.createElement('div'); c.className = 'cd' + (has(e.id) ? '' : ' lk') + (sel === e.k ? ' sel' : '');
        c.innerHTML = `${bIco(e)}<span style="color:${has(e.id) ? SURV.BQC[e.o.q] : ''}">${has(e.id) ? e.o.n : '？？？'}</span>`;
        c.addEventListener('click', () => { sel = e.k; render(); }); gr.appendChild(c);
      }
      qDetail(L.find(e => e.k === sel) || null); return;
    }
    if (tab === 'p') {
      box.querySelector('.ct').textContent = `共 ${PEOPLE.length} 人`;
      const gr = box.querySelector('.gr'); gr.innerHTML = '';
      for (const e of PEOPLE) {
        const c = document.createElement('div'); c.className = 'cd' + (sel === e[0] ? ' sel' : '');
        c.innerHTML = `<img class="pf" src="${e[2]}" alt=""><span>${e[1]}</span>`;
        c.addEventListener('click', () => { sel = e[0]; render(); }); gr.appendChild(c);
      }
      pDetail(PEOPLE.find(e => e[0] === sel) || null); return;
    }
    if (tab === 't') {
      box.querySelector('.ct').textContent = `共 ${TERMS.length} 条`;
      const gr = box.querySelector('.gr'); gr.innerHTML = '';
      for (const [g, n, d] of TERMS) {
        const c = document.createElement('div'); c.className = 'cd tm' + (sel === n ? ' sel' : '');
        c.innerHTML = `<i>${g}</i><b>${n}</b>`; c.addEventListener('click', () => { sel = n; render(); }); gr.appendChild(c);
      }
      const e = TERMS.find(e => e[1] === sel), dt = box.querySelector('.dc');
      dt.innerHTML = e ? `<h3>${e[1]}</h3><span class="tg">术语 · ${e[0]}</span><p>${e[2]}</p>` : '<p class="no">点左边的词看解释。</p>';
      return;
    }
    if (tab === 'w') {
      const t = T(), all = SKL(), ws = [...new Set(all.map(e => e.w))];
      wfb.innerHTML = `<button data-w="-1" class="${wf < 0 ? 'on' : ''}">全部</button>` + ws.map(w => `<button data-w="${w}" class="${wf === w ? 'on' : ''}">${t.WEPN[w]}</button>`).join('');
      const L = list(); box.querySelector('.ct').textContent = `已学会 ${L.filter(e => has(e.id)).length} / ${L.length}`;
      const gr = box.querySelector('.gr'); gr.innerHTML = '';
      for (const e of L) {
        const c = document.createElement('div'); c.className = 'cd' + (has(e.id) ? '' : ' lk') + (sel === e.k ? ' sel' : '');
        c.innerHTML = `${sIco(e)}<span>${has(e.id) ? e.o.name : '？？？'}</span>`;
        c.addEventListener('click', () => { sel = e.k; render(); }); gr.appendChild(c);
      }
      wDetail(L.find(e => e.k === sel) || null); return;
    }
    const L = list(), n = L.filter(e => has(e[0])).length;
    box.querySelector('.ct').textContent = `已发现 ${n} / ${L.length}`;
    const gr = box.querySelector('.gr'); gr.innerHTML = '';
    for (const e of L) {
      const c = document.createElement('div'); c.className = 'cd' + (has(e[0]) ? '' : ' lk') + (sel === e ? ' sel' : '');
      const d = UNITS.includes(e) && dim(e), st = d ? ` style="width:${Math.round(d[0] * d[2] * uk())}px;height:${Math.round(d[1] * d[2] * uk())}px;max-width:86px;max-height:none;object-fit:contain"` : '';
      c.innerHTML = `<i class="nb">${no(e)}</i><img src="${card(e)}" alt=""${st}><span>${has(e[0]) ? e[1] : '？？？'}</span>`;
      c.addEventListener('click', () => { sel = e; render(); });
      gr.appendChild(c);
    }
    detail(sel && L.includes(sel) ? sel : null);
  }
  box.addEventListener('click', e => {
    if (e.target === box || e.target.closest('.x')) close();
    const t = e.target.closest('.tb'); if (t) { tab = t.dataset.t; sel = null; wf = -1; render(); }
    const w = e.target.closest('.wf button'); if (w) { wf = +w.dataset.w; sel = null; render(); }
    if (e.target.closest('.bk')) { sel = null; render(); }
  });
  function open() { const hp = document.getElementById('tHelpPanel'); if (hp) hp.style.display = 'none'; const st = document.getElementById('szzSet'); if (st) st.hidden = true; sel = null; render(); box.hidden = false; }
  function close() { box.hidden = true; }
  addEventListener('keydown', e => { if (!box.hidden && e.key === 'Escape') { e.stopPropagation(); close(); } }, true);
  const btn = document.createElement('button'); btn.id = 'szzCodexBtn'; btn.type = 'button'; btn.textContent = '图鉴';
  btn.addEventListener('click', open);
  const mount = () => { document.head.appendChild(css); document.body.append(box, btn); };
  if (document.body) mount(); else addEventListener('DOMContentLoaded', mount);
  setInterval(() => { const g = document.getElementById('szzSetBtn'); btn.style.display = g && g.style.display === 'block' ? 'block' : 'none'; }, 300);   // 跟着右上角齿轮：只在主界面显示
  window.CODEX = {
    see(type) { const k = ALIAS[type] || type; if (!seen[k] && ((k.startsWith('sk:') || k.startsWith('bao:')) || ALL.some(e => e[0] === k))) { seen[k] = 1; save(); } },
    unlockAll() { for (const e of ALL) seen[e[0]] = 1; for (const e of SKL()) seen[e.id] = 1; save(); if (!box.hidden) render(); },
    open, close,
  };
})();
