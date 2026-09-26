// Trace settings for assets/room-whisperpine.jpg (see ../rooms.mjs for every option).
export default {
  seed: [220, 540],
  walk: [
    // door-moonwell: the moonlit gap in the far pines (painted snow ends ~y100).
    [690, 96, 752, 140],
    // door-cavern-crack: the mouth of the root-bound crack, entered from the snow below its lip.
    [[1262, 458], [1334, 452], [1334, 540], [1300, 540], [1244, 516]],
    // Snow continuing behind the west pine canopy to the trail door.
    [96, 515, 195, 570],
  ],
  props: [
    // The west pines (a tall one with a shorter one in front) overhang the trail: the outline is
    // measured off the canopy (it has no closed ink line), only the tall pine's trunk foot blocks,
    // and they draw over anyone whose feet are above that foot.
    { id: 'west-pine', exact: true, z: 660, box: [25, 370, 200, 685],
      shape: [[[92, 377], [115, 425], [132, 460], [145, 490], [167, 540], [194, 603], [150, 622],
        [148, 657], [134, 663], [140, 672], [146, 680], [30, 680], [35, 640], [45, 585], [58, 540],
        [65, 485], [75, 450]]],
      footprint: [120, 646, 148, 664] },
    // The Listening Pines: five trunks carry the whole grove; the ground behind the canopy is open.
    { id: 'heart-pines', mode: 'column', seed: [720, 300], box: [550, 150, 900, 600],
      footprint: [596, 520, 846, 600] },
    // Frozen berry bush: only its stems block.
    { id: 'berry-bush', mode: 'ground', seed: [395, 800], box: [300, 720, 475, 845],
      footprint: [365, 815, 440, 845] },
  ],
};