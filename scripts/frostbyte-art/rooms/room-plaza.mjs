// Chillmere Plaza. The reference trace: lamps as measured templates, benches/fountain/fences as props.
import { lamp } from '../helpers.mjs';

export default {
  seed: [720, 560],
  barriers: [
    [350, 350, 420, 352],   // under the hanging shop sign
    [160, 501, 238, 484],   // under the Chronicle board, between its legs (it stands against a wall)
  ],
  carve: [
    [1112, 519, 1152, 560], // top of the rink's west post, so its ground-level gap stays open
  ],
  block: [
    // The den igloo: traced off the painted dome (apex ~720,723, widest x600..838 around y850,
    // snow tunnel down to y~918). Its lit mouth (x~688..755) stays open as a notch.
    [[720, 723], [740, 725], [760, 733], [778, 743], [795, 757], [810, 773],
      [822, 792], [832, 812], [838, 835], [836, 855], [828, 868], [818, 878],
      [802, 888], [784, 896], [766, 902], [760, 910], [755, 918],
      [755, 860], [688, 860], [688, 918],
      [680, 918], [676, 908], [668, 898], [652, 890], [638, 881], [626, 871],
      [614, 860], [604, 845], [600, 826], [604, 806], [612, 788], [622, 772],
      [636, 757], [652, 745], [670, 735], [692, 727]],
  ],
  walk: [
    [688, 860, 755, 960],   // the igloo mouth
  ],
  holeNames: { 'den-igloo': [720, 800] },
  props: [
    lamp('lamp-workshop', { top: [419, 207], base: [424, 356], lantern: [424, 217, 456, 268] }),
    lamp('lamp-trail-west', { top: [601, 124], base: [601, 276], lantern: [606, 134, 632, 188] }),
    lamp('lamp-trail-east', { top: [857, 124], base: [855, 276], lantern: [820, 134, 852, 188] }),
    lamp('lamp-northeast', { top: [1206, 212], base: [1205, 356], lantern: [1174, 222, 1204, 274] }),
    lamp('lamp-court', { top: [1340, 352], base: [1336, 494], lantern: [1303, 362, 1336, 412] }),
    lamp('lamp-west', { top: [83, 476], base: [106, 625], lantern: [90, 486, 124, 532] }),
    lamp('lamp-southwest', { top: [204, 594], base: [213, 700], lantern: [208, 600, 248, 657], hidden: true, z: 700 }),
    lamp('lamp-den-west', { top: [532, 697], base: [541, 850], lantern: [535, 703, 569, 757] }),
    lamp('lamp-den-east', { top: [905, 690], base: [905, 856], lantern: [878, 698, 915, 752] }),
    lamp('lamp-southeast', { top: [1283, 664], base: [1278, 760], lantern: [1242, 672, 1276, 722], hidden: true, z: 760 }),
    { id: 'north-bench', mode: 'column', depth: 22, seed: [530, 290], box: [470, 240, 595, 350] },
    { id: 'south-bench', mode: 'column', depth: 22, seed: [1010, 750], box: [935, 685, 1090, 800] },
    // The whole basin ellipse is its footprint; the ground behind the statue stays walkable.
    { id: 'fountain', mode: 'column', depth: 95, seed: [995, 330], box: [890, 200, 1100, 400] },
    { id: 'rink-north-fence', mode: 'ground', depth: 10, seed: [1100, 440], box: [1075, 415, 1420, 485] },
    { id: 'rink-south-fence', mode: 'ground', depth: 10, seed: [1200, 620], box: [1110, 560, 1360, 655] },
  ],
};
