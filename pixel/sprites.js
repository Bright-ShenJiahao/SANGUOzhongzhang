// 像素人物：每个字母是一种颜色，'.' 透明。全部朝右画，朝左时翻转。
const PAL = {
  o: '#3a2418', // 深褐描边（照参考图二：粗描边）
  s: '#f6c39a', S: '#d8946a', // 皮肤 / 暗部
  h: '#8a5530', H: '#5e3620', // 头发
  t: '#4f8a7a', T: '#36645a', // 青色上衣
  c: '#d0973c', C: '#9c6a24', // 土黄披风
  b: '#5a3a22', g: '#f0c04c', G: '#b8862a', // 腰带 / 金
  p: '#efe0bf', P: '#c8b48c', // 裤
  k: '#7a4a2a', K: '#4e2e1a', // 靴
  e: '#2a1a12', w: '#ffffff',
  y: '#f6d23c', Y: '#c49a1c', // 黄巾
  n: '#b48a58', N: '#86643c', // 黄巾兵布衣
  a: '#8c8682', A: '#5c5654', // 铁甲
  r: '#c8462e', R: '#8a2e1e', // 红披风
  d: '#3a2618', // 胡子
};

// 主角：农家少年（参考图一的少年），16×22
const HERO = [
  '.....ooooo......',
  '...oohhhhhoo.o..',
  '..ohhhhhhhhhoho.',
  '.ohhhhhhhhhhhho.',
  '.ohhhhHHhhhhhho.',
  '.ohhhHssshhshho.',
  '..ohHssssssssso.',
  '..ohsssssseseso.',
  '..ohssssssssso..',
  '...ossSssSsso...',
  '...occossssoo...',
  '..occcttgtttco..',
  '.occCtttttttsso.',
  '.ocCCtttttttsso.',
  '.oCCbbbgbbbboo..',
  '.oCCttttttTto...',
  '..ooTttttTTo....',
  '...oppppPPpo....',
  '...oppPoopPpo...',
  '...okkoo.okko...',
  '..okkKo..okkKo..',
  '..ooooo..ooooo..',
];
const HERO_W2 = [   // 走路第二帧：换腿
  '...oppppPPpo....',
  '...opPpoPppo....',
  '...okkopPko.....',
  '...okkKokkKo....',
  '...oooooooo.....',
];

// 黄巾兵，14×20
const SOL = [
  '....ooooo.....',
  '...ohhhhho....',
  '..oyyyyyyyo...',
  '.oYyyyyyyyyoy.',
  '..ohssssssoyy.',
  '..osssseseo.y.',
  '..ossssssso...',
  '...osSSsso....',
  '..onnnnnnno...',
  '.onnNnnnnnso..',
  '.onNnnnnnnso..',
  '.oNnbbbbbbo...',
  '.oNnnnnnnno...',
  '..ooNnnnNo....',
  '...oNnnnNo....',
  '...okkookko...',
  '...okko.okko..',
  '..okkKo.okkKo.',
  '..ooooo.ooooo.',
  '..............',
];
const SOL_W2 = [
  '...okkookko...',
  '...okkokkko...',
  '...okkKokKo...',
  '...oooooooo...',
  '..............',
];

// 首领：程远志（参考图二：重甲、金边、粗描边），26×32
const BOSS = [
  '.........ooooooo..........',
  '.......oodddddddoo........',
  '......oyyyyyyyyyyyo.yy....',
  '.....oYyyyygggyyyyyoyyy...',
  '.....oyyyyyyyyyyyyyo.yyy..',
  '.....odHhsssssssshdo...y..',
  '.....odhssssssssssdo......',
  '.....odssseesseesso.......',
  '.....odssssssssSsso.......',
  '......odssSSSSssddo.......',
  '......oddddwwwddddo.......',
  '.......oddddddddddo.......',
  '....ooooodddddddoooooo....',
  '...orrraagggggggaaarrro...',
  '..orrraaaaaaaaaaaaaarrro..',
  '..orraAaAaAaAaAaAaAarrsso.',
  '.orrraaaaaaaaaaaaaaarrsso.',
  '.orrRAaAaAaAaAaAaAaArRsso.',
  '.orRRaaaaaaaaaaaaaaaRRoo..',
  '.oRRRggggggGgggggggRRRo...',
  '.oRRRbbbbggYggbbbbbRRRo...',
  '.oRRRbbbbgYYYgbbbbbRRRo...',
  '..oRRaAaAarrraAaAaaRRo....',
  '..oRRaaaaarRraaaaaaRRo....',
  '...oRAaAaarRraAaAaARo.....',
  '...ooaaaaoRRoaaaaaoo......',
  '....oaaaao..oaaaao........',
  '....okkko....okkko........',
  '....okkko....okkko........',
  '...okkkKo...okkkKo........',
  '...oooooo...oooooo........',
  '..........................',
];
const BOSS_W2 = [
  '....okkko....okkko........',
  '....okkko...okkko.........',
  '...okkkKo..okkkKo.........',
  '...oooooo..oooooo.........',
  '..........................',
];

// 兵器（竖直向上画，握把在底部中间）
const SWORD = [
  '.o.',
  'owo',
  'owo',
  'owo',
  'owo',
  'owo',
  'owo',
  'owo',
  'owo',
  'ogo',
  'ogggo'.slice(0, 3),
  'obo',
  'obo',
  '.o.',
];
const SPEAR = [
  '.o.', 'owo', 'owo', 'oao', '.y.', '.b.', '.b.', '.b.', '.b.', '.b.', '.b.', '.b.', '.b.', '.b.',
];
const GLAIVE = [   // 首领大刀
  '..oo.', '.owwo', 'owwwo', 'owwo.', 'owwo.', 'owwo.', 'oaao.', '.gg..', '.bb..', '.bb..', '.bb..', '.bb..', '.bb..', '.bb..', '.bb..', '.bb..', '.bb..', '.bb..', '.gg..', '.rr..',
];

window.SPR = { PAL, HERO, HERO_W2, SOL, SOL_W2, BOSS, BOSS_W2, SWORD, SPEAR, GLAIVE };
