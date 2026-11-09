// 三国终章：被暂时拿掉的旧模块（见 tools/build.py 的 DISABLED）在 game.js 里没有判空保护的调用，在这里补空壳。
const Boss = { start() {}, updateFx() {}, drawGround() {}, drawHorse() {}, hud() {}, wxDraw() {}, active: () => false, alive: () => false };
const BOARD = { submit() {}, show() {}, open() {} };
const XIAOCHANG = { drawBackground() {}, state: () => null, start() {}, on: () => false, active: () => false };
