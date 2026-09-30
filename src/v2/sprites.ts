// Pixel-art Dominik. Each frame is a grid of palette keys; '.' is transparent.
export const palette: Record<string, string> = {
  H: '#6E4F22', h: '#A67C3D', l: '#CFA35A',   // dark-blonde hair: outline, base, highlight
  s: '#F1C3A0', d: '#D99E7C', e: '#2F6FD6', m: '#D9907A',   // skin, shade, blue eyes, mouth
  w: '#FFFFFF', f: '#9CC8F4',                  // T-shirt, its shade
  n: '#2E4E94', j: '#1A2C5C', o: '#1E2230',    // jeans (near leg), jeans (far leg), shoes
  g: '#AEB4BE', G: '#7C838F', p: '#EEF1F5'     // laptop lid, lid edge + pear stem, pear logo
};

const headFront = [
  '.....HHHHHH.....',
  '....HhhlhhhH....',
  '...HhhhhlhhhH...',
  '...Hhhhhhhhh....',
  '...hhsssssshh...',
  '...hssessessh...',
  '...dssssssssd...',
  '....sssmmsss....',
  '......dddd......'
];
const headSide = [
  '....HHHHH.......',
  '...HhhlhhH......',
  '..HhhhhhhhH.....',
  '..Hhhhhhhhhh....',
  '..Hhhhhsssss....',
  '..Hhhhsssses....',
  '...Hhdsssssss...',
  '....Hssssssd....',
  '......ddd.......'
];
// Rows 9-15 of the side view; the two arm rows change per frame.
const torsoSide = (arm1: string, arm2: string) => [
  '.....fwwwwf.....',
  '.....wwwwww.....',
  arm1,
  arm2,
  '.....wwwwww.....',
  '.....fwwwwf.....',
  '.....nnnnnn.....'
];

// Standing, facing the viewer (at the end of DOMINIK on the landing).
export const stand = {
  width: 16, height: 24,
  frames: {
    idle: [
      ...headFront,
      '....fwwwwwwf....',
      '...fwwwwwwwwf...',
      '...fwwwwwwwwf...',
      '...s.wwwwww.s...',
      '...s.wwwwww.s...',
      '...d.wwwwww.d...',
      '.....ffffff.....',
      '.....nnnnnn.....',
      '.....nnnnnn.....',
      '.....nn..nn.....',
      '.....nn..nn.....',
      '.....nn..nn.....',
      '.....jn..nj.....',
      '....ooo..ooo....',
      '....ooo..ooo....'
    ]
  },
  eyes: [[6, 5], [9, 5]]
};

// Side-on run cycle, facing right: stride, pass, stride, pass. Arms swing against the legs.
export const run = {
  width: 16, height: 24,
  frames: {
    'run-1': [
      ...headSide,
      ...torsoSide('....fwwwwwwss...', '...d.wwwwww.....'),
      '.....nnnnnn.....',
      '....nnn..jjj....',
      '...nnn....jjj...',
      '..nnn......jj...',
      '.nnn.......jj...',
      'on.........jj...',
      'o..........jj...',
      '...........oooo.'
    ],
    'run-2': [
      ...headSide,
      ...torsoSide('.....wwwwwws....', '.....wwwwww.....'),
      '.....nnnnnn.....',
      '.....jj.nnnn....',
      '.....jj..nnn....',
      '.....jj..nn.....',
      '.....jj.ooo.....',
      '.....jj.........',
      '.....jj.........',
      '.....oooo.......'
    ],
    'run-3': [
      ...headSide,
      ...torsoSide('....wwwwwwwd....', '...s.wwwwww.....'),
      '.....nnnnnn.....',
      '....jjj..nnn....',
      '...jjj....nnn...',
      '..jjj......nn...',
      '.jjj.......nn...',
      'oj.........nn...',
      'o..........nn...',
      '...........oooo.'
    ],
    'run-4': [
      ...headSide,
      ...torsoSide('....swwwwww.....', '.....wwwwww.....'),
      '.....nnnnnn.....',
      '.....nn.jjjj....',
      '.....nn..jjj....',
      '.....nn..jj.....',
      '.....nn.ooo.....',
      '.....nn.........',
      '.....nn.........',
      '.....oooo.......'
    ]
  }
};

// Sitting cross-legged behind a grey laptop with a pear on the lid, typing. Cycle a, b, a, c.
const sitHead = headFront.map((row) => `..${row}..`);
const sitBody = (elbow1: string, elbow2: string) => [
  ...sitHead,
  '....fwwwwwwwwwwf....',
  '...fwGGGGGGGGGGwf...',
  '...fwgggggGpgggwf...',
  '...swggggppggggws...',
  elbow1,
  elbow2,
  '.....gggppppggg.....',
  '.nnnnGGGGGGGGGGnnnn.',
  'onnnnnjjjjjjjjnnnnno'
];
export const sit = {
  width: 20, height: 18,
  frames: {
    'type-a': sitBody('...ssggggppggggss...', '....sgggppppgggs....'),
    'type-b': sitBody('..sssggggppggggs....', '...ssgggppppggg.....'),
    'type-c': sitBody('....sggggppggggsss..', '.....gggppppgggss...')
  },
  eyes: [[8, 5], [11, 5]]
};
