// Bluehour Coffee: the plank floor and rug are open; furniture stands above the floor.
export default {
  seed: [720, 680],
  threshold: 0,
  area: [[450, 350], [1110, 350], [1150, 425], [1220, 425],
    [1330, 520], [1400, 650], [1400, 960], [245, 960],
    [245, 825], [300, 690], [355, 535], [450, 350]],
  carve: [
    [[450, 350], [1110, 350], [1150, 425], [1220, 425],
      [1330, 520], [1400, 650], [1400, 960], [245, 960],
      [245, 825], [300, 690], [355, 535]], // plank seams and rug pattern are floor
  ],
  walk: [[650, 880, 800, 960]], // bottom-centre doorway
  props: [
    { id: 'window-chair-left', mode: 'column', exact: true, depth: 15,
      shape: [[[585, 265], [620, 250], [655, 350], [690, 385], [615, 390]]] },
    { id: 'window-table', mode: 'column', exact: true, depth: 24,
      shape: [[[675, 275], [765, 265], [815, 290], [800, 325], [760, 335],
        [770, 380], [720, 390], [710, 335], [675, 320]]] },
    { id: 'window-chair-right', mode: 'column', exact: true, depth: 15,
      shape: [[[805, 345], [865, 250], [895, 275], [880, 385], [820, 390]]] },
    { id: 'right-chair-upper', mode: 'column', exact: true, depth: 18,
      shape: [[[1235, 385], [1300, 375], [1300, 515], [1250, 540]]] },
    { id: 'right-table-upper', mode: 'column', exact: true, depth: 22,
      shape: [[[1230, 455], [1300, 435], [1370, 460], [1390, 490],
        [1370, 520], [1310, 545], [1250, 520]]] },
    { id: 'right-chair-lower', mode: 'column', exact: true, depth: 18,
      shape: [[[1330, 520], [1415, 510], [1415, 630], [1365, 645]]] },
    { id: 'right-table-lower', mode: 'column', exact: true, depth: 20,
      shape: [[[1370, 630], [1439, 620], [1439, 835], [1375, 810]]] },
  ],
};
