// Trace settings for assets/room-trail.jpg (see ../rooms.mjs for every option).
import { lamp } from '../helpers.mjs';

export default {
  seed: [720, 760],
  block: [
    [[400, 0], [1040, 0], [1040, 298], [1000, 312], [950, 322], [900, 332],
      [850, 338], [800, 337], [750, 339], [710, 335], [670, 341], [630, 337],
      [590, 325], [550, 312], [500, 302], [450, 310], [400, 320]],
  ],
  walk: [
    [[1284, 462], [1336, 464], [1336, 496], [1284, 500]],   // door-whisperpine, the east exit
  ],
  props: [
    lamp('lamp-falls', { top: [969, 222], base: [965, 405], lantern: [928, 251, 963, 296] }),
    lamp('lamp-east', { top: [1214, 535], base: [1208, 739], lantern: [1172, 558, 1206, 611] }),
    { id: 'trail-sign', mode: 'column', depth: 14, seed: [1060, 350], box: [1009, 310, 1130, 439] },
  ],
};
