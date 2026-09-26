// Trace settings for assets/room-docks-away.jpg (see ../rooms.mjs for every option).
import { lamp } from '../helpers.mjs';

export default {
  seed: [330, 540],
  // Walkable: snow and the grey-blue pier planks. Warm building wood and the blue sea are not.
  walkColor: (r, g, b) => !(r > b + 8 && r - g > 38) && !(b - r > 55 && r < 100 && b < 190),
  dilate: 1,
  thinWalls: 3,
  block: [
    // Warehouse roof, walls, and door; the exterior steps remain outside the outline.
    [[65, 140], [148, 17], [188, 14], [390, 70], [494, 155], [485, 279],
      [439, 299], [437, 255], [352, 287], [350, 326], [303, 378],
      [280, 369], [279, 239], [83, 181]],
    // The foreground buildings extend beyond the bottom of the painting.
    [[0, 449], [37, 491], [90, 557], [91, 637], [49, 693], [0, 720]],
    [[0, 646], [50, 636], [136, 624], [163, 629], [262, 742],
      [265, 806], [149, 878], [0, 745]],
    [[167, 960], [218, 856], [272, 779], [347, 706], [370, 703],
      [457, 763], [532, 848], [534, 960]],
    [[939, 960], [944, 852], [1034, 738], [1074, 718], [1090, 718],
      [1188, 805], [1278, 858], [1281, 960]],
    [[1209, 960], [1214, 766], [1286, 707], [1310, 706], [1408, 798],
      [1440, 824], [1440, 960]],
    [[1440, 446], [1390, 497], [1351, 555], [1341, 722], [1440, 824]],
  ],
  carve: [
    [[824, 207], [909, 243], [1020, 0], [947, 0]], // tread outlines and plank joins
  ],
  walk: [
    [[834, 211], [903, 246], [1010, 0], [956, 0]], // lighthouse treads, inside both stringers
    [68, 476, 77, 486], // court lane reaches the west edge of the painted path
  ],
  props: [
    lamp('lamp-west', { top: [83, 477], base: [106, 625], lantern: [90, 487, 124, 534] }),
    lamp('lamp-warehouse', { top: [323, 264], base: [328, 394], lantern: [328, 274, 358, 328] }),
    lamp('lamp-southwest', { top: [204, 594], base: [213, 700], lantern: [208, 600, 248, 657], hidden: true, z: 700 }),
    lamp('lamp-south', { top: [532, 697], base: [541, 849], lantern: [535, 703, 569, 757] }),
    lamp('lamp-southeast', { top: [905, 690], base: [905, 851], lantern: [878, 698, 915, 752] }),
    lamp('lamp-east', { top: [1283, 664], base: [1278, 760], lantern: [1242, 672, 1276, 722], hidden: true, z: 760 }),
    { id: 'bell-frame', mode: 'base', depth: 12, seed: [602, 120], box: [590, 66, 689, 249],
      shape: [[593, 69, 686, 248]], footprint: [594, 227, 688, 249] },
    { id: 'warehouse-sign', mode: 'base', depth: 12, seed: [527, 219], box: [498, 181, 572, 290],
      shape: [[499, 182, 571, 289]], footprint: [499, 269, 569, 289] },
    { id: 'crane-sign', mode: 'base', depth: 12, seed: [1124, 276], box: [1089, 243, 1184, 357],
      shape: [[1090, 244, 1183, 356]], footprint: [1095, 339, 1176, 357] },
  ],
};