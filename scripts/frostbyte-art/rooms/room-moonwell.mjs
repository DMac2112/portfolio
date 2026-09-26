// Trace settings for assets/room-moonwell.jpg (see ../rooms.mjs for every option).
export default {
  seed: [720, 770],
  block: [
    // The pool basin, traced along its dark painted outline (the lit inner wall under the far lip is
    // part of the basin); the surrounding painted snow stays open.
    [[475, 470], [490, 415], [520, 385], [560, 365], [610, 348], [660, 340], [720, 337],
      [780, 337], [840, 342], [890, 355], [930, 375], [960, 400], [978, 440], [975, 480],
      [955, 515], [915, 542], [860, 563], [790, 577], [720, 580], [650, 573], [580, 557],
      [530, 534], [495, 505]],
  ],
  holeNames: { 'moonwell-pool': [720, 450] },
  props: [
    { id: 'west-sign', mode: 'column', depth: 12, seed: [300, 320], box: [274, 275, 332, 378], footprint: [297, 358, 315, 370] },
    { id: 'north-sign', mode: 'column', depth: 12, seed: [1040, 205], box: [1000, 174, 1085, 270], footprint: [1039, 248, 1057, 260] },
    { id: 'east-sign', mode: 'column', depth: 12, seed: [1280, 374], box: [1250, 336, 1325, 432], footprint: [1283, 408, 1301, 420] },
    { id: 'south-sign', mode: 'column', depth: 12, seed: [1040, 700], box: [990, 645, 1095, 790], footprint: [1040, 764, 1058, 778] },
    { id: 'bench', mode: 'column', depth: 20, seed: [400, 675], box: [335, 615, 500, 735], footprint: [350, 700, 490, 730] },
  ],
};