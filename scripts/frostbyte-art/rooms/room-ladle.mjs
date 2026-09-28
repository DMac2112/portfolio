// Lantern Ladle: broad central aisle; tables and stools occlude penguins behind them.
export default {
  seed: [740, 660],
  threshold: 0,
  area: [[425, 345], [810, 355], [830, 390], [1260, 450], [1380, 570],
    [1400, 750], [1325, 875], [965, 910], [960, 960], [590, 960],
    [585, 910], [250, 910], [60, 755], [65, 570], [270, 390]],
  block: [
    [[430, 235], [865, 235], [865, 390], [800, 405], [590, 385], [430, 350]], // hearth
    [[830, 300], [1290, 340], [1290, 510], [835, 465]], // serving counter
  ],
  walk: [[655, 870, 850, 960]], // painted doorway
  props: [
    { id: 'left-table-back', mode: 'column', exact: true, depth: 20,
      shape: [[[275, 395], [330, 362], [445, 355], [468, 385], [470, 485], [406, 525], [318, 495]]] },
    { id: 'left-stool-back', mode: 'column', exact: true, depth: 16,
      shape: [[[300, 475], [353, 467], [370, 490], [362, 548], [304, 550]]] },
    { id: 'left-table-middle', mode: 'column', exact: true, depth: 23,
      shape: [[[85, 620], [130, 555], [223, 540], [295, 565], [305, 690], [244, 735], [142, 710]]] },
    { id: 'left-stool-middle', mode: 'column', exact: true, depth: 17,
      shape: [[[103, 680], [158, 674], [183, 708], [164, 770], [110, 760]]] },
    { id: 'left-table-front', mode: 'column', exact: true, depth: 25,
      shape: [[[300, 715], [353, 645], [459, 640], [521, 677], [515, 793], [440, 847], [330, 820]]] },
    { id: 'left-stool-front', mode: 'column', exact: true, depth: 18,
      shape: [[[323, 792], [384, 785], [415, 818], [397, 875], [347, 870]]] },
    { id: 'right-table-back', mode: 'column', exact: true, depth: 22,
      shape: [[[1190, 550], [1245, 520], [1330, 530], [1395, 585], [1390, 690], [1310, 730], [1210, 690]]] },
    { id: 'right-stool-back', mode: 'column', exact: true, depth: 16,
      shape: [[[1325, 673], [1385, 666], [1390, 704], [1378, 755], [1330, 748]]] },
    { id: 'right-table-front', mode: 'column', exact: true, depth: 24,
      shape: [[[1010, 700], [1050, 645], [1160, 640], [1220, 675], [1215, 790], [1150, 840], [1040, 815]]] },
    { id: 'right-stool-front', mode: 'column', exact: true, depth: 18,
      shape: [[[1090, 790], [1150, 785], [1185, 818], [1175, 875], [1120, 870]]] },
  ],
};
