// Glasswind Court. Market square: lamp, notice board, cart and the fire-pit patio stand on the snow.
import { lamp } from '../helpers.mjs';

export default {
  seed: [720, 420],
  walk: [
    [40, 462, 110, 500],      // door-back: the west lane runs off the map edge
    [1262, 866, 1318, 920],   // door-docks: top of the plank ramp down to the harbour
  ],
  props: [
    lamp('lamp-north', { top: [600, 130], base: [604, 271], lantern: [604, 138, 626, 184] }),
    // Stands on two legs in front of the house: only the leg feet block, the snow under the panel is open.
    { id: 'notice-board', depth: 22, seed: [190, 420], box: [128, 362, 250, 506] },
    { id: 'court-cart', mode: 'column', depth: 30, seed: [500, 560], box: [415, 420, 600, 648] },
    { id: 'patio-chair-west', mode: 'column', depth: 14, seed: [620, 790], box: [585, 745, 670, 845] },
    { id: 'patio-table', mode: 'column', depth: 14, seed: [660, 830], box: [615, 795, 712, 885] },
    { id: 'patio-chair-south', mode: 'column', depth: 14, seed: [630, 880], box: [590, 840, 672, 920] },
    { id: 'patio-brazier', mode: 'column', depth: 16, seed: [760, 800], box: [715, 760, 805, 860] },
    { id: 'patio-chair-north', mode: 'column', depth: 14, seed: [830, 740], box: [795, 700, 865, 795] },
    { id: 'patio-chair-east', mode: 'column', depth: 14, seed: [860, 850], box: [820, 815, 895, 895] },
  ],
};
