// Trace settings for assets/room-lighthouse-rest.jpg (see ../rooms.mjs for every option).
export default {
  seed: [720, 560],
  thinWalls: 3,
  area: [[35, 495], [105, 425], [210, 365], [310, 330], [420, 310],
    [545, 295], [610, 255], [825, 255], [915, 295], [900, 365],
    [960, 385], [1160, 365], [1250, 390], [1340, 465], [1380, 560],
    [1350, 670], [1280, 750], [1190, 800], [1060, 835], [900, 840],
    [840, 700], [755, 690], [755, 960], [685, 960], [685, 690],
    [605, 690], [570, 845], [420, 815], [260, 745], [100, 655],
    [25, 565]],
  carve: [
    [[60, 505], [125, 440], [220, 380], [320, 345], [440, 325],
      [550, 310], [620, 270], [815, 270], [890, 310], [875, 370],
      [950, 400], [1150, 380], [1240, 405], [1325, 475], [1360, 560],
      [1330, 655], [1270, 735], [1180, 785], [1050, 820], [905, 825],
      [830, 680], [595, 680], [550, 825], [425, 800], [270, 730],
      [115, 645], [45, 560]], // mortar on the exposed flagstone floor
  ],
  block: [
    [[900, 0], [1250, 0], [1250, 340], [1160, 420], [1010, 470],
      [900, 420], [890, 350]], // spiral stairs and the open shaft below
  ],
  walk: [
    [685, 600, 755, 960], // narrow open doorway threshold
    [[1240, 450], [1260, 390], [1290, 340], [1335, 305], [1350, 310],
      [1360, 360], [1340, 410], [1330, 465], [1290, 465]],
  ],
  // Footprints are each piece's floor area (its top face dropped by its height), not just the front
  // legs, so nobody walks through a table or bed. There is floor behind all four.
  props: [
    { id: 'logbook-table', mode: 'column', depth: 36, seed: [220, 460],
      box: [70, 340, 365, 630], footprint: [85, 430, 360, 615] },
    { id: 'keeper-cot', mode: 'column', depth: 55, seed: [1100, 690],
      box: [965, 550, 1380, 850], footprint: [975, 655, 1330, 845] },
    { id: 'lantern-table', mode: 'column', depth: 26, seed: [420, 800],
      box: [305, 710, 540, 875], footprint: [310, 790, 540, 875] },
    { id: 'gallery-cabinet', mode: 'column', depth: 28, seed: [1320, 540],
      box: [1260, 475, 1390, 605], footprint: [1270, 525, 1380, 600] },
  ],
};