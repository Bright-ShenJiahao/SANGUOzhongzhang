// 俯视竞技场（试玩对比用，网址带 ?bg=arena 才启用）：
// 一张固定的俯视场地图，镜头不动，人物和敌人只能在围墙里面那块地面上走；敌人从四周（左右 + 上方城门 + 下方台阶）涌进来。
// 场地图在世界里放在 AX 附近，地面范围用图内比例 FL 量出来；改图后只需要改 FL。
(() => {
  // 每张地图都是一份「可走区域」配置（MAPS）；网址 ?bg=field|town|altar|arena2 试玩单张，?route 路线图里每个节点用 ARENA.start(地图名) 切换
  let MSEL = (location.search.match(/[?&]bg=(field|town|altar)(?:&|$)/) || [])[1] || 'yz';   // 11/11：俯视战场 + 路线图是唯一玩法（旧横版已删），默认黄巾营寨
  const ROUTE_ON = true;
  const FIELD = !!MSEL || ROUTE_ON;
  const ON_URL = FIELD;
  const Z0 = FIELD && !/[?&]bg=arena(?:&|$)/.test(location.search) ? 1.25 : 1; let Z = Z0;   // 11/16 用户：照群侠，新村口缩到约一屏，四周的屋子土墙一直看得见
  // 可走区域（都是占整张图的比例）：地面多边形 − 障碍（椭圆、土台整块）+ 土台台面 + 斜坡
  const MAPS = {
    field: { fc: {"ground":[[0.21,0.255],[0.78,0.255],[0.83,0.36],[0.9,0.52],[0.955,0.66],[0.97,0.79],[0.03,0.79],[0.03,0.6],[0.09,0.47],[0.15,0.36]],"block":[],"top":[],"ramp":[],"ell":[]}, z: 1.15, hero: [.5, .5], sp: [.5, .55], fx: [['sway', 0, 0, .3, .22, 'b', .7], ['fire', 0.054, 0.695, 0.035], ['fire', 0.372, 0.837, 0.051], ['fire', 0.913, 0.772, 0.034], ['leaf', 0, 0, .3, .32, '#d99a3a']] },   // 11/16 新村口（围合打谷场）
    sang: { fc: {"ground":[[0,0.47],[0.25,0.36],[0.5,0.21],[0.75,0.09],[0.96,0.03],[0.97,0.25],[0.92,0.45],[0.84,0.6],[0.78,0.72],[0.7,0.8],[0.5,0.86],[0.3,0.95],[0,0.97]],"block":[],"top":[],"ramp":[],"ell":[]}, z: 1.15, hero: [.45, .6], sp: [.45, .6], fx: [['fire', 0.123, 0.236, 0.036], ['fire', 0.319, 0.145, 0.029], ['leaf', 0, 0, .7, .2, '#b8a040'], ['leaf', .8, .3, 1, .9, '#b8a040'], ['shaft', .8, 0]] },   // 11/16 新图
    fushui: { fc: {"ground":[[0.25,0.25],[0.8,0.24],[0.88,0.32],[0.9,0.45],[0.91,0.62],[0.88,0.78],[0.8,0.88],[0.6,0.92],[0.3,0.9],[0.15,0.8],[0.08,0.62],[0.08,0.48],[0.14,0.36]],"block":[],"top":[],"ramp":[],"ell":[]}, z: 1.15, hero: [.5, .55], sp: [.5, .55], fx: [['flag','ban',.312,.022,.13], ['flag','ban',.394,.022,.13], ['flag','ban',.565,.018,.11], ['flag','ban',.691,.022,.13], ['flag','ban',.945,.022,.15], ['purple', 0.424, 0.115, 0.011], ['purple', 0.455, 0.115, 0.011], ['fire', 0.934, 0.313, 0.046], ['fire', 0.938, 0.577, 0.067], ['smoke', .58, .12], ['paper', .3, 0, 1, .2], ['fog', .5, 1]] },   // 11/16 新图
    guan: { fc: {"ground":[[0.02,0.37],[0.25,0.32],[0.5,0.31],[0.75,0.32],[0.98,0.36],[0.99,0.68],[0.8,0.75],[0.5,0.79],[0.25,0.77],[0.01,0.7]],"block":[],"top":[],"ramp":[],"ell":[]}, z: 1.15, hero: [.5, .55], sp: [.5, .55], fx: [['fire', 0.264, 0.283, 0.053], ['fire', 0.708, 0.303, 0.056], ['smoke', .263, .2], ['smoke', .707, .21], ['fog', .86, 1], ['leaf', 0, 0, .3, .3, '#c86a3a']] },   // 11/16 新图
    du: { fc: {"ground":[[0.12,0.2],[0.6,0.18],[0.85,0.2],[0.97,0.27],[0.98,0.55],[0.9,0.6],[0.78,0.66],[0.7,0.71],[0.5,0.74],[0.25,0.73],[0.04,0.7],[0.07,0.55],[0.08,0.35]],"block":[],"top":[],"ramp":[],"ell":[[0.842,0.535,0.018,0.035],[0.932,0.555,0.018,0.035]]}, z: 1.15, hero: [.45, .45], sp: [.45, .45], fx: [['water', .02, .77, .7, .98], ['leaf', 0, .05, .25, .6, '#d8c8a0'], ['lamp', .695, .1], ['lamp', .806, .1], ['fire', 0.843, 0.535, 0.034], ['fire', 0.933, 0.509, 0.033]] },   // 11/16 新图
    liang: { fc: {"ground":[[0.35,0.11],[0.64,0.11],[0.8,0.3],[0.88,0.5],[0.94,0.7],[0.93,0.78],[0.94,0.98],[0.06,0.98],[0.07,0.78],[0.05,0.7],[0.11,0.5],[0.2,0.3]],"block":[],"top":[],"ramp":[],"ell":[]}, z: 1, hero: [.5, .85], sp: [.5, .85], fx: [['flag','tri',.35,.035,.035], ['flag','tri',.655,.035,.035], ['fire', 0.236, 0.219, 0.010], ['fire', 0.776, 0.219, 0.016], ['fire', 0.049, 0.841, 0.026], ['fire', 0.952, 0.840, 0.023], ['fire', 0.842, 0.16, 0.09], ['smoke', .85, .03, '50,40,38'], ['smoke', .92, .05, '50,40,38']] },   // 11/16 新图
    shi: { fc: {"ground":[[0.01,0.365],[0.99,0.365],[0.99,0.82],[0.01,0.82]],"block":[],"top":[],"ramp":[],"ell":[]}, z: 1.15, hero: [.5, .55], sp: [.5, .55], fx: [['flag','cloth',.283,.125,.15], ['flag','cloth',.49,.125,.15], ['flag','cloth',.69,.125,.15], ['flag','cloth',.873,.125,.15], ['lamp', .022, .17], ['lamp', .104, .17], ['lamp', .147, .21], ['lamp', .258, .21], ['lamp', .338, .21], ['lamp', .462, .21], ['lamp', .528, .21], ['lamp', .662, .21], ['lamp', .71, .21], ['lamp', .848, .21], ['lamp', .897, .17], ['lamp', .98, .17], ['lamp', .1, .95], ['lamp', .405, .97], ['lamp', .648, .95], ['lamp', .91, .95], ['steam', .19, .22], ['fire', 0.182, 0.391, 0.000]] },   // 11/16 新图
    yuanmen: { fc: {"ground":[[0.22,0.27],[0.78,0.27],[0.85,0.36],[0.9,0.5],[0.96,0.62],[0.95,0.78],[0.7,0.84],[0.3,0.84],[0.06,0.78],[0.05,0.62],[0.08,0.47],[0.14,0.36]],"block":[],"top":[],"ramp":[],"ell":[]}, z: 1.15, hero: [.5, .55], sp: [.5, .55], fx: [['flag','tri',.273,.0,.055], ['flag','tri',.778,.0,.055], ['sway', 0, 0, .13, .13, 'b', .8], ['fire', 0.162, 0.144, 0.027], ['fire', 0.382, 0.135, 0.031], ['fire', 0.508, 0.047, 0.034], ['fire', 0.644, 0.135, 0.033], ['fire', 0.878, 0.144, 0.036], ['fire', 0.964, 0.451, 0.046], ['smoke', .9, .12, '70,55,50'], ['smoke', .3, .1, '70,55,50'], ['leaf', 0, 0, .15, .2, '#d9703a']] },   // 11/16 新图
    miao: { fc: {"ground":[[0.21,0.31],[0.8,0.31],[0.86,0.38],[0.92,0.5],[0.96,0.65],[0.95,0.76],[0.75,0.82],[0.3,0.82],[0.06,0.75],[0.04,0.62],[0.08,0.48],[0.15,0.37]],"block":[],"top":[],"ramp":[],"ell":[]}, z: 1.15, hero: [.5, .55], sp: [.5, .55], fx: [['fire', 0.066, 0.682, 0.043], ['fire', 0.932, 0.709, 0.049], ['smoke', .51, .22], ['lamp', .62, .2], ['fog', .85, 1], ['leaf', 0, 0, .25, .3, '#7a8a5a']] },   // 11/16 新图
    zhu: { fc: {"ground":[[0.25,0.25],[0.76,0.25],[0.84,0.33],[0.9,0.45],[0.91,0.62],[0.84,0.75],[0.65,0.82],[0.35,0.83],[0.15,0.8],[0.08,0.68],[0.07,0.48],[0.14,0.35]],"block":[],"top":[],"ramp":[],"ell":[]}, z: 1.15, hero: [.5, .55], sp: [.5, .55], fx: [['lamp', .06, .62], ['lamp', .94, .64], ['leaf', .05, 0, .95, .25, '#8aa856'], ['fly', .1, .3, .9, .8], ['fog', .72, .98], ['shaft', .18, .04]] },   // 11/16 新图
    weng: { fc: {"ground":[[0.24,0.33],[0.76,0.33],[0.86,0.42],[0.94,0.52],[0.97,0.66],[0.9,0.76],[0.7,0.84],[0.5,0.87],[0.3,0.84],[0.1,0.76],[0.03,0.66],[0.06,0.52],[0.14,0.42]],"block":[],"top":[],"ramp":[],"ell":[]}, z: 1.15, hero: [.5, .55], sp: [.5, .55], fx: [['sway', 0, 0, .2, .3, 'b', .7], ['fire', 0.424, 0.289, 0.035], ['fire', 0.635, 0.289, 0.039], ['fire', 0.258, 0.166, 0.033], ['fire', 0.360, 0.164, 0.033], ['fire', 0.692, 0.164, 0.033], ['fire', 0.799, 0.162, 0.029], ['leaf', 0, 0, .2, .3, '#d9a03a'], ['wind']] },   // 11/16 新图
    yamen: { fc: {"ground":[[0.21,0.34],[0.79,0.34],[0.88,0.45],[0.96,0.62],[0.97,0.78],[0.03,0.78],[0.04,0.62],[0.12,0.45]],"block":[],"top":[],"ramp":[],"ell":[[0.083,0.56,0.035,0.05],[0.917,0.56,0.035,0.05]]}, z: 1.15, hero: [.5, .55], sp: [.5, .55], fx: [['sway', 0, 0, .16, .13, 'b', .7], ['sway', .85, 0, 1, .13, 'b', .7], ['fire', 0.083, 0.541, 0.066], ['fire', 0.914, 0.541, 0.067], ['lamp', .4, .115], ['lamp', .603, .115], ['smoke', .51, .24], ['leaf', 0, 0, .2, .2, '#d99a3a'], ['leaf', .82, 0, 1, .2, '#d99a3a']] },   // 11/16 新图
    altar: { fc: {"ground":[[0.2,0.24],[0.8,0.24],[0.88,0.35],[0.95,0.5],[0.97,0.66],[0.93,0.78],[0.07,0.78],[0.03,0.66],[0.05,0.5],[0.12,0.35]],"block":[],"top":[],"ramp":[],"ell":[[0.087,0.69,0.04,0.05],[0.913,0.69,0.04,0.05],[0.514,0.45,0.025,0.035],[0.224,0.26,0.03,0.04],[0.787,0.26,0.03,0.04]]}, z: 1.15, hero: [.5, .55], sp: [.5, .55], fx: [['flag','big',.411,.0,.13], ['flag','ban',.118,.145,.14], ['flag','ban',.084,.175,.14], ['flag','ban',.882,.145,.14], ['flag','ban',.928,.175,.14], ['flag','ban',.962,.23,.14], ['flag','ban',.07,.78,.17], ['flag','ban',.938,.78,.17], ['sway', 0, 0, .3, .16, 'b', .8], ['purple', 0.505, 0.444, 0.043], ['fire', 0.223, 0.241, 0.033], ['fire', 0.789, 0.242, 0.033], ['fire', 0.087, 0.645, 0.054], ['fire', 0.916, 0.645, 0.052], ['paper', 0, 0, 1, .3], ['leaf', 0, 0, .25, .25, '#e0b040']] },   // 11/16 新图
    forest: { fc: {"ground": [[0.0233, 0.3865], [0.1165, 0.2899], [0.1825, 0.2277], [0.2717, 0.2277], [0.3882, 0.207], [0.5823, 0.207], [0.7376, 0.1967], [0.8346, 0.2277], [0.9123, 0.2899], [0.9433, 0.4831], [0.9394, 0.6901], [0.9045, 0.8144], [0.8346, 0.8765], [0.6988, 0.8972], [0.5047, 0.911], [0.3106, 0.911], [0.1553, 0.8903], [0.0582, 0.8075], [0.0233, 0.6901], [0.0116, 0.5521]], "block": [], "top": [], "ramp": [], "ell": [[0.132, 0.7177, 0.0699, 0.038], [0.823, 0.207, 0.0621, 0.0311]]}, hero: [.5, .45], sp: [.5, .5] },
    camp: { fc: {"ground": [[0.0116, 0.4279], [0.0776, 0.3451], [0.1281, 0.2968], [0.1708, 0.283], [0.3494, 0.2312], [0.4581, 0.2174], [0.6988, 0.2243], [0.7958, 0.2657], [0.854, 0.2968], [0.9123, 0.3451], [0.955, 0.4831], [0.9627, 0.6556], [0.9394, 0.7591], [0.8929, 0.8144], [0.757, 0.8523], [0.5823, 0.8489], [0.5047, 0.8972], [0.427, 0.8282], [0.2174, 0.8213], [0.1165, 0.8282], [0.0388, 0.7937], [0.0116, 0.6556]], "block": [], "top": [], "ramp": [], "ell": [[0.854, 0.2692, 0.0543, 0.0414], [0.9045, 0.3451, 0.0505, 0.0483], [0.1514, 0.8627, 0.0446, 0.0518], [0.0893, 0.766, 0.0543, 0.0345]]}, hero: [.5, .45], sp: [.5, .5] },
    yz: { fc: {"ground":[[0.105,0.18],[0.466,0.18],[0.466,0.14],[0.534,0.14],[0.534,0.18],[0.885,0.18],[0.885,0.86],[0.534,0.86],[0.534,0.945],[0.466,0.945],[0.466,0.86],[0.105,0.86]],"block":[],"top":[],"ramp":[],"ell":[]}, hero: [.5, .3], sp: [.5, .5] },
    town: { fc: {"ground":[[0.1914,0.2189],[0.4474,0.2189],[0.4456,0.1296],[0.4695,0.0638],[0.5413,0.0638],[0.5742,0.1296],[0.5754,0.2189],[0.7727,0.221],[0.7751,0.2253],[0.8266,0.2529],[0.8589,0.2465],[0.8762,0.3188],[0.9031,0.4251],[0.933,0.5313],[0.9569,0.6376],[0.9809,0.7439],[0.9809,0.7917],[0.933,0.8236],[0.8493,0.8448],[0.7476,0.8767],[0.6489,0.8874],[0.5772,0.898],[0.5772,0.9373],[0.6071,1.0],[0.3888,1.0],[0.4276,0.9373],[0.4276,0.898],[0.3589,0.898],[0.2572,0.8927],[0.1495,0.8661],[0.1268,0.8395],[0.1226,0.8098],[0.0395,0.6674],[0.0628,0.6376],[0.0957,0.5313],[0.1286,0.4251],[0.1585,0.3188]],"block":[],"top":[[[0.1926,0.1966],[0.1495,0.3188],[0.1166,0.4251],[0.0807,0.5313],[0.0419,0.6376],[0.0239,0.6589],[0.0,0.6695],[0.0,0.5739],[0.0179,0.5313],[0.0419,0.4251],[0.0778,0.3188],[0.1226,0.2019]],[[0.8612,0.1573],[0.8852,0.1573],[0.933,0.2657],[0.9689,0.4038],[0.9928,0.5101],[1.0,0.5526],[1.0,0.6482],[0.9868,0.5951],[0.9569,0.457],[0.9091,0.3188],[0.866,0.1753]]],"ramp":[[[0.0108,0.6801],[0.0377,0.6652],[0.1208,0.8055],[0.1226,0.8204],[0.067,0.8438],[0.0132,0.7067]],[[0.7751,0.2253],[0.8176,0.152],[0.8642,0.1573],[0.8594,0.1785],[0.8266,0.2508]]],"ell":[]}, hero: [.5, .5], sp: [.507, .5] },
  };
  let MAP = MAPS.field, FC = MAP.fc, FB, ST, FL, OCC = [];
  const inPoly = (pt, x, y) => { let c = false; for (let i = 0, j = pt.length - 1; i < pt.length; j = i++) { const a = pt[i], b = pt[j]; if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; };
  const inEll = (e, x, y) => ((x - e[0]) / e[2]) ** 2 + ((y - e[1]) / e[3]) ** 2 < 1;
  const walk = (x, y) => (inPoly(FC.ground, x, y) && !FC.block.some(b => inPoly(b, x, y)) && !FC.ell.some(e => inEll(e, x, y))) || FC.top.some(b => inPoly(b, x, y)) || FC.ramp.some(b => inPoly(b, x, y));
  let camTop = 0;
  const HAZE = !/[?&]look=plain(?:&|$)/.test(location.search);   // 11/16 用户：照群侠，氛围层（薄雾/暗角/飘尘/软阴影）默认打开，?look=plain 关掉   // 群侠传式氛围：薄雾 + 降饱和 + 暗角 + 飘尘 + 软阴影
  const DUST = Array.from({ length: 46 }, () => ({ x: Math.random(), y: Math.random(), r: .6 + Math.random() * 1.8, vx: .004 + Math.random() * .012, vy: (Math.random() - .5) * .004, a: .08 + Math.random() * .16 }));
  let dustT = 0;
  const AX = 1000;                                   // 场地中心的世界 x
  // 遮挡层：把草垛(含推车)、石井的轮廓从背景图里抠出来，按脚底线 base 和人物前后排序；人物走到它们后面时被盖住（并且变半透明）
  const OCCS = { field: [] };   // 11/16：新村口没有遮挡物
  for (const k in OCCS) for (const o of OCCS[k]) { const xs = o.poly.map(p => p[0]), ys = o.poly.map(p => p[1]); o.bx = Math.min(...xs); o.by = Math.min(...ys); o.bw = Math.max(...xs) - o.bx; o.bh = Math.max(...ys) - o.by; o.cv = null; }
  function occCanvas(o) {
    if (o.cv) return o.cv; const i = img(); if (!i) return null;
    const c = document.createElement('canvas'); c.width = Math.round(o.bw * i.width); c.height = Math.round(o.bh * i.height);
    const x = c.getContext('2d'); x.beginPath(); o.poly.forEach((p, k) => { const px = (p[0] - o.bx) * i.width, py = (p[1] - o.by) * i.height; k ? x.lineTo(px, py) : x.moveTo(px, py); }); x.closePath(); x.clip();
    x.drawImage(i, -o.bx * i.width, -o.by * i.height); return o.cv = c;
  }
  // 绕路：直线被挡住时，沿「到主角的最短可走路线」走（格子 96×54，主角换格子才重算）
  const GX = 96, GY = 54; let flow = null, flowKey = -1, flowCells = null;
  function cells() { if (flowCells) return flowCells; flowCells = new Uint8Array(GX * GY); for (let j = 0; j < GY; j++) for (let i = 0; i < GX; i++) flowCells[j * GX + i] = walk((i + .5) / GX, (j + .5) / GY) ? 1 : 0; return flowCells; }
  function field(hx, hy) {
    const ws = cells(); let hi = Math.max(0, Math.min(GX - 1, hx * GX | 0)), hj = Math.max(0, Math.min(GY - 1, hy * GY | 0));
    if (!ws[hj * GX + hi]) { let best = 1e9; for (let j = 0; j < GY; j++) for (let i = 0; i < GX; i++) if (ws[j * GX + i]) { const d = (i - hi) ** 2 + (j - hj) ** 2; if (d < best) { best = d; var bi = i, bj = j; } } hi = bi; hj = bj; }
    const key = hj * GX + hi; if (key === flowKey && flow) return flow; flowKey = key;
    const d = flow = new Float32Array(GX * GY).fill(1e9), q = [key]; d[key] = 0;
    for (let h = 0; h < q.length; h++) { const c = q[h], ci = c % GX, cj = c / GX | 0;
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) { if (!di && !dj) continue; const ni = ci + di, nj = cj + dj; if (ni < 0 || nj < 0 || ni >= GX || nj >= GY) continue; const n = nj * GX + ni; if (!ws[n]) continue; if (di && dj && (!ws[cj * GX + ni] || !ws[nj * GX + ci])) continue; const nd = d[c] + (di && dj ? 1.41 : 1); if (nd < d[n]) { d[n] = nd; q.push(n); } } }
    return d;
  }
  function setMap(key) {   // 换地图：重算范围、遮挡层、绕路格子，并把当前背景图指到这张图
    if (!MAPS[key]) key = 'field'; MSEL = key; MAP = MAPS[key]; FC = MAP.fc; Z = MAP.z || Z0;
    FB = FC.ground.reduce((r, p) => ({ x0: Math.min(r.x0, p[0]), x1: Math.max(r.x1, p[0]), y0: Math.min(r.y0, p[1]), y1: Math.max(r.y1, p[1]) }), { x0: 1, x1: 0, y0: 1, y1: 0 });
    ST = { x0: .44, x1: .56, top: FB.y0, bot: FB.y1 }; FL = { x0: FB.x0, x1: FB.x1, y0: FB.y0 + .1, y1: FB.y1 - .1 }; OCC = OCCS[key] || [];
    flowCells = null; flow = null; flowKey = -1;
    if (typeof IMG !== 'undefined' && IMG['map_' + key]) IMG.arena = IMG['map_' + key];
  }
  let active = false;
  const img = () => (typeof IMG !== 'undefined' ? IMG.arena : null);
  const ready = () => { const i = img(); return !!(i && i.complete && i.width); };
  function geo() {
    const vw = viewW(), i = img();
    const s = Math.max(vw / i.width, M.viewH / i.height) * Z, w = i.width * s, h = i.height * s;
    const ox = AX - w / 2, oy = M.viewH / 2 - h / 2;
    return { vw, s, w, h, ox, oy, L: ox + FL.x0 * w, R: ox + FL.x1 * w, T: oy + FL.y0 * h, B: oy + FL.y1 * h, TS: oy + ST.top * h, BS: oy + ST.bot * h, SL: ox + ST.x0 * w, SR: ox + ST.x1 * w };
  }
  function apply() {
    if (!ready()) return null;
    const g = geo();
    if (Z === 1) { M.top = Math.max(0, g.TS); M.bot = Math.min(M.viewH, g.BS); } else { M.top = g.TS; M.bot = g.BS; }
    arenaL = g.L - 12; lockR = g.R + 12;
    return g;
  }

  // 11/16 用户：每张地图都要有会动的东西，而且要合这张图——底图静止，下面这些按图内比例坐标叠上去
  // fx 写法：['fire',x,y] 火把/火盆 | ['lamp',x,y] 灯笼(摇晃光晕) | ['smoke',x,y] 炊烟/香烟 | ['steam',x,y] 蒸笼白汽 | ['purple',x,y] 紫火
  //          ['leaf',x0,y0,x1,y1,色] 落叶 | ['paper',x0,y0,x1,y1] 符纸 | ['fly',x0,y0,x1,y1] 萤火虫 | ['water',x0,y0,x1,y1] 水面波光 | ['fog',y0,y1] 地面流雾 | ['shaft',x,y] 光柱 | ['wind'] 风沙
  let fxP = [], fxKey = '', fxLast = 0;
  // 11/16 用户出的地图动画图：火把/火盆/紫火 各 8 帧（底部对齐的横条），落叶 枫/桑/竹/符纸 各 4 张
  const FXS = {}; for (const k of ['torch', 'fire', 'pfire']) { const i = new Image(); i.src = 'art/fx/map/' + k + '.webp'; FXS[k] = i; }
  const LI = n => { const i = new Image(); i.src = 'art/fx/map/' + n + '.webp'; return i; };
  const SP = { ember: [0, 1, 2, 3, 4, 5].map(n => LI('ember' + n)), fly: [0, 1, 2, 3].map(n => LI('fly' + n)), smoke: [0, 1, 2, 3].map(n => LI('smoke' + n)), glint: [0, 1, 2, 3].map(n => LI('glint' + n)), dust: [0, 1, 2, 3].map(n => LI('dust' + n)), shaft: LI('shaft') };
  const ok = i => i && i.complete && i.width, TC = new Map();
  const tint = (im, col, mode) => { const key = im.src + col + mode; let c = TC.get(key); if (c) return c; if (!ok(im)) return null; c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d'); x.drawImage(im, 0, 0); x.globalCompositeOperation = mode || 'source-in'; x.fillStyle = col; x.fillRect(0, 0, c.width, c.height); TC.set(key, c); return c; };   // 11/16：火星/萤火/烟/波光/风沙/光柱都换用户美术（黑底按亮度抠的），紫火星、黑烟用染色版
  const spr = (im, x, y, w, rot) => { if (!im) return; const h = w * im.height / im.width; if (rot) { ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.drawImage(im, -w / 2, -h / 2, w, h); ctx.restore(); } else ctx.drawImage(im, x - w / 2, y - h / 2, w, h); };
  const FLG = { big: [LI('flag_big'), 0], ban: [LI('flag_ban'), .343], tri: [LI('flag_tri'), 0], cloth: [LI('flag_cloth'), 0.413] };   // 11/16 用户出的旗子 8 帧（底图上的布已擦掉）：[图, 挂点横向位置]
  const LV = { lu: ['luhua0', 'luhua1', 'luhua2', 'luhua3', 'luye0', 'luye1', 'luye2', 'luye3'].map(LI) }; for (const k of ['maple', 'sang', 'zhu', 'fu']) LV[k] = [0, 1, 2, 3].map(n => { const i = new Image(); i.src = 'art/fx/map/' + k + n + '.webp'; return i; });
  const leafSet = c => ({ '#b8a040': 'sang', '#8aa856': 'zhu', '#7a8a5a': 'zhu', '#d8c8a0': 'lu' })[c] ?? 'maple';
  const flame = (kind, x, y, hh, k, now) => { const im = FXS[kind]; if (!(im && im.complete && im.width)) return; const fw = im.width / 8, f = Math.floor(now * 12 + k * 3) % 8, h = hh, w = h * fw / im.height; ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = .95; ctx.drawImage(im, f * fw, 0, fw, im.height, x - w / 2, y - h, w, h); };
  const FR = Math.random;
  function mapFx(g) {
    const now = performance.now() / 1000, dt = Math.min(.05, fxLast ? now - fxLast : .016); fxLast = now;
    if (fxKey !== MSEL) { fxKey = MSEL; fxP = []; }
    const X = x => g.ox + x * g.w, Y = y => g.oy + y * g.h, U = g.h / 1000;   // U：图高 1000 时的 1 像素
    const glow = (x, y, r, c0, c1) => { const gr = ctx.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, c0); gr.addColorStop(.4, c1); gr.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); };
    const add = o => { if (fxP.length < 260) fxP.push(o); };
    ctx.save();
    const bim = img();   // 11/16 用户：旗子/布幡/招牌/树冠——不另出图，直接让底图上那块像素按风轻轻扭动（只动一点点，盖住原图，不会对不上）
    if (bim && bim.width) for (const [k0, e] of MAP.fx.entries()) { if (e[0] !== 'sway') continue;
      const [, x0, y0, x1, y1, md, am] = e;
      let src = bim, sx = x0 * bim.width, sy = y0 * bim.height; const sw = (x1 - x0) * bim.width, sh = (y1 - y0) * bim.height;
      if (md !== 'b') {   // 11/16 用户：杆子不能跟着动——只把布（黄/白）抠出来扭动，旗杆、横木、墙都留在原图不动
        if (!e._c || e._c.k !== MSEL) { const c = document.createElement('canvas'); c.width = Math.ceil(sw); c.height = Math.ceil(sh); const x = c.getContext('2d'); x.drawImage(bim, sx, sy, sw, sh, 0, 0, c.width, c.height);
          const d = x.getImageData(0, 0, c.width, c.height), a = d.data, wh = MSEL === 'shi';
          for (let i = 0; i < a.length; i += 4) { const r = a[i], gg = a[i + 1], b = a[i + 2], mx = Math.max(r, gg, b), mn = Math.min(r, gg, b);
            const cloth = wh ? (mx > 120 && mx - mn < 70) : (r > 120 && gg > 80 && r - b > 70 && gg - b > 35); if (!cloth) a[i + 3] = 0; }
          x.putImageData(d, 0, 0); c.k = MSEL; e._c = c; }
        src = e._c; sx = 0; sy = 0; }
      const dx0 = X(x0), dy0 = Y(y0), dw = (x1 - x0) * g.w, dh = (y1 - y0) * g.h, A = (am || 1) * g.h * .004;
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
      if (md === 'l') { const n = Math.max(4, Math.ceil(dw / 2)); for (let i = 0; i < n; i++) { const f = i / n, o = Math.sin(now * 3.2 - f * 6 + k0) * A * f; ctx.drawImage(src, sx + sw * f, sy, sw / n + .5, sh, dx0 + dw * f, dy0 + o, dw / n + .6, dh); } }
      else { const n = Math.max(4, Math.ceil(dh / 2)); for (let i = 0; i < n; i++) { const f = i / n, w = md === 'b' ? 1 - f : f, o = (md === 'b' ? Math.sin(now * 1.1 + k0) + .35 * Math.sin(now * 2.7 + f * 3 + k0) : Math.sin(now * 2.4 + f * 4 + k0)) * A * w; ctx.drawImage(src, sx, sy + sh * f, sw, sh / n + .5, dx0 + o, dy0 + dh * f, dw, dh / n + .6); } } }
    for (const [k0, e] of MAP.fx.entries()) { if (e[0] !== 'flag') continue; const [im, ax] = FLG[e[1]]; if (!ok(im)) continue;
      const fw = im.width / 8, f = Math.floor(now * 9 + k0 * 3) % 8, h = e[4] * g.h, w = h * fw / im.height; ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
      ctx.drawImage(im, f * fw, 0, fw, im.height, X(e[2]) - w * ax, Y(e[3]), w, h); }
    MAP.fx.forEach((e, k) => {
      const [kind] = e, f = .75 + .15 * Math.sin(now * 9 + k * 2) + .1 * Math.sin(now * 23 + k * 5);
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 1;
      if (kind === 'fire') { const h = e[3] == null ? .05 : e[3]; if (h > 0) flame(h >= .045 ? 'fire' : 'torch', X(e[1]), Y(e[2] + .004), Math.max(.03, h * 1.7) * g.h, k, now); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 1; glow(X(e[1]), Y(e[2] - (h || .03) * .6), 70 * U * f * Math.max(1, (h || .035) / .035), 'rgba(255,170,70,.55)', 'rgba(255,120,40,.18)'); if (FR() < dt * 9) add({ k: 'ember', x: e[1] + (FR() - .5) * .006, y: e[2] - .01, vx: (FR() - .5) * .01, vy: -.05 - FR() * .05, t: 0, T: .8 + FR() * .9 }); }
      else if (kind === 'lamp') { const sw = Math.sin(now * 1.6 + k) * 4 * U; glow(X(e[1]) + sw, Y(e[2]), 55 * U * (.9 + .1 * f), 'rgba(255,190,110,.5)', 'rgba(255,120,60,.14)'); }
      else if (kind === 'purple') { const p = .75 + .25 * Math.sin(now * 2.4 + k), h = e[3] == null ? .04 : e[3]; flame('pfire', X(e[1]), Y(e[2] + .004), Math.max(.025, h * 1.6) * g.h, k, now); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 1; glow(X(e[1]), Y(e[2] - h * .6), 110 * U * p * Math.max(.5, h / .045), 'rgba(200,120,255,.55)', 'rgba(130,60,220,.2)'); if (FR() < dt * 7) add({ k: 'pember', x: e[1] + (FR() - .5) * .02, y: e[2] - .01, vx: (FR() - .5) * .01, vy: -.04 - FR() * .04, t: 0, T: 1 + FR() }); }
      else if (kind === 'smoke' && FR() < dt * 2.5) add({ k: 'smoke', x: e[1] + (FR() - .5) * .006, y: e[2], vx: .006 + FR() * .006, vy: -.025 - FR() * .015, t: 0, T: 3 + FR() * 2, c: e[3] || '150,140,130' });
      else if (kind === 'steam' && FR() < dt * 4) add({ k: 'smoke', x: e[1] + (FR() - .5) * .01, y: e[2], vx: (FR() - .5) * .008, vy: -.05 - FR() * .02, t: 0, T: 1.4 + FR(), c: '235,235,230' });
      else if (kind === 'leaf' && FR() < dt * 1.2) add({ k: 'leaf', x: e[1] + FR() * (e[3] - e[1]), y: e[2] + FR() * (e[4] - e[2]) * .5, vx: .012 + FR() * .015, vy: .025 + FR() * .02, t: 0, T: 6 + FR() * 3, c: e[5] || '#c98a3a', ph: FR() * 7, ls: leafSet(e[5] || ''), li: Math.floor(FR() * (leafSet(e[5] || '') === 'lu' ? 8 : 4)) });
      else if (kind === 'paper' && FR() < dt * .9) add({ k: 'leaf', x: e[1] + FR() * (e[3] - e[1]), y: e[2], vx: (FR() - .5) * .02, vy: .02 + FR() * .015, t: 0, T: 7 + FR() * 3, c: '#e8c25a', ph: FR() * 7, paper: 1, ls: 'fu', li: Math.floor(FR() * 4) });
      else if (kind === 'fly' && fxP.filter(p => p.k === 'fly').length < 14 && FR() < dt * 3) add({ k: 'fly', x: e[1] + FR() * (e[3] - e[1]), y: e[2] + FR() * (e[4] - e[2]), vx: 0, vy: 0, t: 0, T: 5 + FR() * 4, ph: FR() * 7 });
      else if (kind === 'water' && FR() < dt * 12) add({ k: 'glint', x: e[1] + FR() * (e[3] - e[1]), y: e[2] + FR() * (e[4] - e[2]), vx: .004, vy: 0, t: 0, T: .6 + FR() * .8, w: 6 + FR() * 14 });
      else if (kind === 'fog') { ctx.globalCompositeOperation = 'source-over'; for (let i = 0; i < 7; i++) { const x = ((i * .19 + now * .008) % 1.3) - .15, y = e[1] + (e[2] - e[1]) * ((i * .37) % 1); ctx.globalAlpha = .12; glow(X(x), Y(y), 260 * U, 'rgba(200,215,225,.9)', 'rgba(200,215,225,.4)'); } }
      else if (kind === 'shaft') { const a = .45 + .25 * Math.sin(now * .7 + k * 3), im = SP.shaft; if (ok(im)) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a; const w = 420 * U, h = w * im.height / im.width; ctx.drawImage(im, X(e[1]) - w * .3, Y(e[2]), w, h * 1.8); } }
      else if (kind === 'wind' && FR() < dt * 10) add({ k: 'dust', x: -.02, y: .25 + FR() * .6, vx: .12 + FR() * .1, vy: (FR() - .5) * .02, t: 0, T: 6 });
    });
    for (const p of fxP) {
      p.t += dt; let vx = p.vx;
      if (p.k === 'leaf') vx += Math.sin(p.t * 2.2 + p.ph) * .02;
      if (p.k === 'fly') { p.vx += (FR() - .5) * .02 * dt * 60 * .05; p.vy += (FR() - .5) * .02 * dt * 60 * .05; p.vx *= .98; p.vy *= .98; vx = p.vx; }
      p.x += vx * dt; p.y += p.vy * dt;
      const a = Math.min(1, p.t / .3, (p.T - p.t) / .6), x = X(p.x), y = Y(p.y);
      if (a <= 0) continue;
      if (p.k === 'ember' || p.k === 'pember') { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a * .95; const im = SP.ember[p.si ?? (p.si = Math.floor(FR() * 6))]; const ii = p.k === 'pember' ? tint(im, 'rgba(200,120,255,.85)', 'source-atop') : ok(im) && im; if (ii) spr(ii, x, y, (p.si > 2 ? 22 : 14) * U * 1.5, p.si === 3 || p.si === 5 ? Math.atan2(p.vy, p.vx) - Math.atan2(-1, 1) : 0); }
      else if (p.k === 'smoke') { ctx.globalCompositeOperation = 'source-over'; const r = (14 + p.t * 22) * U * 1.4, im = tint(SP.smoke[p.si ?? (p.si = Math.floor(FR() * 4))], `rgb(${p.c})`); ctx.globalAlpha = a * .5; if (im) spr(im, x, y, r * 3, Math.sin(p.ph || 0) * .3); }
      else if (p.k === 'leaf') { ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = a * .9; ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(p.t * 3 + p.ph) * 1.2); ctx.fillStyle = p.c; ctx.scale(1, Math.abs(Math.cos(p.t * 2.5 + p.ph)) * .8 + .2); const lim = p.ls && LV[p.ls] && LV[p.ls][p.li]; if (lim && lim.complete && lim.width) { const sz = (p.ls === 'fu' ? 22 : 20) * U * 1.5, sc = sz / Math.max(lim.width, lim.height); ctx.drawImage(lim, -lim.width * sc / 2, -lim.height * sc / 2, lim.width * sc, lim.height * sc); } else if (p.paper) ctx.fillRect(-5 * U * 1.5, -7 * U * 1.5, 10 * U * 1.5, 14 * U * 1.5); else { ctx.beginPath(); ctx.ellipse(0, 0, 7 * U * 1.5, 3.2 * U * 1.5, 0, 0, 7); ctx.fill(); } ctx.restore(); }
      else if (p.k === 'fly') { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a * (.5 + .5 * Math.sin(p.t * 3 + p.ph)); const im = SP.fly[p.si ?? (p.si = Math.floor(FR() * 4))]; if (ok(im)) spr(im, x, y, 40 * U * 1.5); }
      else if (p.k === 'glint') { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a * .8 * Math.sin(Math.PI * p.t / p.T); const im = SP.glint[p.si ?? (p.si = Math.floor(FR() * 4))]; if (ok(im)) spr(im, x, y, p.w * 3 * U * 1.5); }
      else if (p.k === 'dust') { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a * .55; const im = SP.dust[p.si ?? (p.si = Math.floor(FR() * 4))]; if (ok(im)) spr(im, x, y, 120 * U * 1.5); }
    }
    fxP = fxP.filter(p => p.t < p.T && p.y > -.1 && p.y < 1.1 && p.x < 1.1);
    ctx.restore();
  }
  // 地图池：每段 3 张，按节点挑一张（没出图的先跳过，用旧图顶上）
  const POOL = { field: ['field', 'sang', 'du'], town: ['yamen', 'shi', 'weng'], forest: ['zhu', 'miao', 'guan'], camp: ['yuanmen', 'liang', 'fushui'], altar: ['altar'] };
  const hasMap = k => typeof BG !== 'undefined' && !!BG[k] && !!MAPS[k];
  function pick(seg, seed) { const ok = (POOL[seg] || []).filter(hasMap); if (!ok.length) return seg; return ok[seed % ok.length]; }
  function want(k) { if (typeof IMG !== 'undefined' && !IMG['map_' + k] && typeof BG !== 'undefined' && BG[k]) { const i = new Image(); i.src = BG[k]; IMG['map_' + k] = i; } }   // 直接载，不排队（排队的话开发者模式跳关时图永远轮不到）
  let pendKey = null;
  window.ARENA = {
    available: () => ON_URL && typeof BG !== 'undefined' && !!(BG.arena || BG.field || BG.town || BG.altar),
    map: () => MSEL,
    shows: k => MSEL === k && ready() && typeof IMG !== 'undefined' && IMG.arena === IMG['map_' + k],   // 11/18：这张图已经真的画上了（试炼进场等它，免得先闪一下别的地图）
    pick, pool: POOL, want,
    preload(seg) { const segs = Object.keys(POOL), i = segs.indexOf(seg); [seg, segs[i + 1]].forEach(s2 => (POOL[s2] || []).filter(hasMap).forEach(want)); },
    on: () => active && ready(),
    start(key) {
      if (!this.available()) return;
      want(key); const im = typeof IMG !== 'undefined' && IMG['map_' + key]; pendKey = null; if (!(im && im.complete && im.width)) { pendKey = key; key = 'field'; }   // 图还没载完就先用村口，载好了马上换过去
      setMap(key || MSEL || 'field');
      active = true;
      const g = apply(); if (!g) return;
      props.length = 0;                               // 场地里不放草垛推车，地面保持干净
      if (FIELD) { hero.x = g.ox + MAP.hero[0] * g.w; hero.y = g.oy + MAP.hero[1] * g.h; hero._ax = null; } else { hero.x = AX; hero.y = M.top + (M.bot - M.top) * .2; }
      this.cam(true);   // 出生在城门前方（上中），不在正中间
    },
    stop() { active = false; },
    tick() { if (!this.on()) return; if (pendKey) { const im = IMG['map_' + pendKey]; if (im && im.complete && im.width) { setMap(pendKey); pendKey = null; const g = apply(); if (g) { hero.x = g.ox + MAP.hero[0] * g.w; hero.y = g.oy + MAP.hero[1] * g.h; hero._ax = null; this.cam(true); } } } apply(); this.clamp(hero); for (const z of zs) this.clamp(z); },
    camY: () => camTop,
    cam(snap) {   // 镜头：Z=1 固定居中；Z>1 跟随人物，被限制在场地图范围内
      if (!this.on()) return;
      const g = geo(), vw = g.vw;
      let tx = AX - vw / 2, ty = 0;
      if (Z > 1) {
        tx = Math.max(g.ox, Math.min(g.ox + g.w - vw, hero.x - vw / 2));
        ty = Math.max(g.oy, Math.min(g.oy + g.h - M.viewH, hero.y - M.viewH / 2));
      }
      const k = snap ? 1 : .1;
      cam.x += (tx - cam.x) * k; camTop += (ty - camTop) * k;
    },
    clamp(e) {   // 所有人物都只能待在围墙里面
      if (!this.on()) return;
      if (FIELD) {   // 不规则地形：新位置走不了就沿 x 或 y 单独滑，再不行就退回上一帧位置
        const g = geo(), fx = (x, y) => walk((x - g.ox) / g.w, (y - g.oy) / g.h);
        if (fx(e.x, e.y)) { e._ax = e.x; e._ay = e.y; return; }
        if (e._ax != null) {
          if (fx(e.x, e._ay)) { e.y = e._ay; e._ax = e.x; return; }
          if (fx(e._ax, e.y)) { e.x = e._ax; e._ay = e.y; return; }
          if (fx(e._ax, e._ay)) { e.x = e._ax; e.y = e._ay; return; }
        }
        for (let r = 6; r < 400; r += 6) for (let k = 0; k < 16; k++) { const a = k / 16 * 6.283, x = e.x + Math.cos(a) * r, y = e.y + Math.sin(a) * r; if (fx(x, y)) { e.x = x; e.y = y; e._ax = x; e._ay = y; return; } }
        return;
      }
      const g = geo(), m = e === hero ? 10 : 8;
      e.x = Math.max(g.L + m, Math.min(g.R - m, e.x));
      const yT = Math.max(g.TS, Z === 1 ? 0 : -1e9), yB = Math.min(g.BS, Z === 1 ? M.viewH : 1e9);
      e.y = Math.max(yT, Math.min(yB, e.y));
      if (e.y < g.T || e.y > g.B) e.x = Math.max(g.SL + m * .5, Math.min(g.SR - m * .5, e.x));   // 在台阶上时，不能偏出台阶宽度
    },
    edge() {     // 刷怪点：左右两侧随机高度，上方城门，下方台阶
      const g = geo(), r = Math.random();
      if (FIELD) {   // 不规则地形：上下两处石阶口 + 离主角够远的随机可走点
        if (r < .15) return { x: g.ox + MAP.sp[0] * g.w, y: g.TS + 4 };
        if (r < .3) return { x: g.ox + MAP.sp[1] * g.w, y: g.BS - 4 };
        for (let i = 0; i < 60; i++) { const x = g.ox + (FB.x0 + Math.random() * (FB.x1 - FB.x0)) * g.w, y = g.oy + (FB.y0 + Math.random() * (FB.y1 - FB.y0)) * g.h; if (walk((x - g.ox) / g.w, (y - g.oy) / g.h) && Math.hypot(x - hero.x, (y - hero.y) * 1.6) > 380) return { x, y }; }
        return { x: g.ox + MAP.sp[0] * g.w, y: g.TS + 4 };
      }
      if (r < .3) return { x: g.L + 8, y: g.T + 6 + Math.random() * (g.B - g.T - 12) };
      if (r < .6) return { x: g.R - 8, y: g.T + 6 + Math.random() * (g.B - g.T - 12) };
      if (r < .8) return { x: AX + (Math.random() - .5) * g.w * .06, y: Math.max(g.TS, Z === 1 ? 0 : -1e9) + 3 };
      return { x: AX + (Math.random() - .5) * g.w * .06, y: Math.min(g.BS, Z === 1 ? M.viewH : 1e9) - 3 };
    },
    dbg: { walk, cells, field, GX, GY },
    layers() {   // 草垛、石井的遮挡层：交给 game.js 的前后排序列表
      if (!FIELD || !this.on()) return [];
      return OCC.map(o => ({ y: geo().oy + o.base * geo().h, d: () => {
        const c = occCanvas(o); if (!c) return; const g = geo();
        const bx = g.ox + o.bx * g.w, by = g.oy + o.by * g.h, bw = o.bw * g.w, bh = o.bh * g.h;
        const hide = hero.y < g.oy + o.base * g.h && hero.x > bx - 10 && hero.x < bx + bw + 10 && hero.y > by - 10;   // 主角在它后面、位置重叠：半透明让人看得见
        ctx.save(); ctx.globalAlpha = hide ? .55 : 1; ctx.drawImage(c, bx, by, bw, bh); ctx.restore();
      } }));
    },
    steer(e, dx, dy) {   // 敌人和主角之间被挡住时，改走绕路方向（只改方向，不改步长）
      if (!FIELD || !this.on() || e === hero) return [dx, dy];
      const g = geo(), ex = (e.x - g.ox) / g.w, ey = (e.y - g.oy) / g.h, hx = (hero.x - g.ox) / g.w, hy = (hero.y - g.oy) / g.h;
      const mag = Math.hypot(dx, dy); if (mag < 1e-4) return [dx, dy];
      if (dx * (hero.x - e.x) + dy * (hero.y - e.y) <= 0) return [dx, dy];   // 不是朝主角走（后撤、绕圈）就不管
      if (Math.hypot(e.x - (e._lx ?? -1e9), e.y - (e._ly ?? -1e9)) < .05) e._stk = (e._stk || 0) + 1; else e._stk = 0;   // 位置几帧都没变 = 被卡住
      e._lx = e.x; e._ly = e.y;
      if (e._stk >= 90 && Math.hypot(e.x - hero.x, e.y - hero.y) > 70) {   // 卡死超过 1.5 秒（高台边、墙角）：直接挪到主角附近一个走得通的点
        for (let k = 0; k < 24; k++) { const an = Math.random() * 6.283, r = 90 + Math.random() * 70, nx = hero.x + Math.cos(an) * r, ny = hero.y + Math.sin(an) * r * .5; if (walk((nx - g.ox) / g.w, (ny - g.oy) / g.h)) { e.x = nx; e.y = ny; e._stk = 0; e._ax = nx; e._ay = ny; return [dx, dy]; } }
      }
      const n = Math.max(12, Math.ceil(Math.hypot(hero.x - e.x, hero.y - e.y) / 6));
      let clear = e._stk < 8; for (let k = 1; clear && k <= n; k++) if (!walk(ex + (hx - ex) * k / n, ey + (hy - ey) * k / n)) clear = false;
      if (clear) return [dx, dy];
      const d = field(hx, hy), ws = cells(), ci = Math.max(0, Math.min(GX - 1, ex * GX | 0)), cj = Math.max(0, Math.min(GY - 1, ey * GY | 0));
      const cur = d[cj * GX + ci], cand = [];
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) { const ni = ci + di, nj = cj + dj; if ((!di && !dj) || ni < 0 || nj < 0 || ni >= GX || nj >= GY) continue; const n = nj * GX + ni; if (ws[n] && d[n] < cur) cand.push([d[n], ni, nj]); }
      cand.sort((a, b) => a[0] - b[0]);
      for (const [, ni, nj] of cand) {   // 按「离主角更近」的顺序挑，挑第一个真能迈出去的方向（格子比墙边粗，不能只信格子中心）
        const tx = g.ox + (ni + .5) / GX * g.w - e.x, ty = g.oy + (nj + .5) / GY * g.h - e.y, tl = Math.hypot(tx, ty) || 1, ux = tx / tl, uy = ty / tl;
        if (walk((e.x + ux * 10 - g.ox) / g.w, (e.y + uy * 10 - g.oy) / g.h)) return [ux * mag, uy * mag];
      }
      return [dx, dy];
    },
    soft: HAZE ? (x, y, r) => {   // 更大更软的脚下阴影
      ctx.save(); ctx.translate(x, y); ctx.scale(1, .34);
      const gr = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 1.7); gr.addColorStop(0, 'rgba(25,20,22,.42)'); gr.addColorStop(.55, 'rgba(25,20,22,.2)'); gr.addColorStop(1, 'rgba(25,20,22,0)');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(0, 0, r * 1.7, 0, 7); ctx.fill(); ctx.restore();
    } : null,
    post(W, H) {   // 在人物之后、界面之前，整屏叠一层氛围（屏幕坐标）
      if (!HAZE || !this.on()) return;
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = 'saturation'; ctx.globalAlpha = .22; ctx.fillStyle = '#808080'; ctx.fillRect(0, 0, W, H);   // 降饱和
      ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = .38; ctx.fillStyle = '#e6dccd'; ctx.fillRect(0, 0, W, H);       // 暖褐色调
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = .1; ctx.fillStyle = '#9fb0c2'; ctx.fillRect(0, 0, W, H);      // 灰蓝薄雾
      const v = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .35, W / 2, H / 2, Math.max(W, H) * .75);
      v.addColorStop(0, 'rgba(10,8,10,0)'); v.addColorStop(1, 'rgba(10,8,10,.5)'); ctx.globalAlpha = 1; ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);   // 暗角
      dustT += 1 / 60;
      ctx.fillStyle = '#d9c7a6';
      for (const d of DUST) {   // 缓慢飘动的灰尘
        d.x = (d.x + d.vx / 60 + 1) % 1; d.y = (d.y + d.vy / 60 + 1) % 1;
        ctx.globalAlpha = d.a * (.6 + .4 * Math.sin(dustT * 1.3 + d.x * 9));
        ctx.beginPath(); ctx.arc(d.x * W, d.y * H, d.r * H / 300 * .5, 0, 7); ctx.fill();
      }
      ctx.restore();
    },
    drawBg() {
      if (!ready()) return;
      const g = geo(); ctx.imageSmoothingEnabled = true;
      ctx.drawImage(img(), g.ox, g.oy, g.w, g.h);
      if (MAP.fx) mapFx(g);
    },
  };
})();
