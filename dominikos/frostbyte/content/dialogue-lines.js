/** @typedef {{ id:string, text:string, durMs:number }} Line */
export const LINE_POOLS = {
  AMBIENT: [
    { id: 'amb-01', text: "The snow's extra squeaky today.", durMs: 2200 },
    { id: 'amb-02', text: 'I keep losing my scarf in the wind.', durMs: 2600 },
    { id: 'amb-03', text: 'Did you see the icicles on the workshop cart?', durMs: 2800 },
    { id: 'amb-04', text: 'I could waddle around this plaza all day.', durMs: 2400 },
    { id: 'amb-05', text: 'Someone left a snowball fort half-built again.', durMs: 2800 },
    { id: 'amb-06', text: 'My flippers are cold. My flippers are always cold.', durMs: 2800 },
  ],
  WEATHER: [
    { id: 'wea-01', text: 'Back in my day the drifts came up to your beak.', durMs: 3000 },
    { id: 'wea-02', text: 'Feels like a three-scarf kind of afternoon.', durMs: 2400 },
    { id: 'wea-03', text: "The wind's changed direction — smell that?", durMs: 2400 },
  ],
  MINIGAME_HYPE: [
    { id: 'mgh-01', text: 'Bet I can beat your high score before supper.', durMs: 2600 },
    { id: 'mgh-02', text: "Coins today, hat tomorrow. That's the plan.", durMs: 2400 },
    { id: 'mgh-03', text: "I've been practicing my throw. Watch out.", durMs: 2400 },
  ],
  COSMETIC_COMPLIMENT: [
    { id: 'cos-01', text: 'Ooh, new scarf? Very sharp.', durMs: 2000 },
    { id: 'cos-02', text: "That hat suits you. Where'd you find it?", durMs: 2400 },
    { id: 'cos-03', text: "I'm still saving up for the good hats.", durMs: 2400 },
  ],
  GREETING: [
    { id: 'grt-01', text: 'Oh — hello there!', durMs: 1600 },
  ],
  // Open House den visitors (FROSTBYTE-HOME-PLAN §7). Lines must land whether the den is
  // empty or fully decorated — never reference a specific furniture item or count.
  VISITOR: [
    { id: 'visitor-0', text: "Ooh, it's so much warmer in here than out there!", durMs: 2600 },
    { id: 'visitor-1', text: 'Thanks for letting me in — my flippers were going numb.', durMs: 2800 },
    { id: 'visitor-2', text: 'Cosy! It already feels like a proper home.', durMs: 2400 },
    { id: 'visitor-3', text: 'Love the open floor plan. Very bold. Very you.', durMs: 2600 },
    { id: 'visitor-4', text: 'A den with a view of the snow — you picked a good spot.', durMs: 2800 },
    { id: 'visitor-5', text: "I'd best waddle home before the light goes. Lovely visit!", durMs: 3000 },
  ],
};

export const EMOTES = [
  { id: 'wave-flipper', durMs: 900 },
  { id: 'spin-hop', durMs: 1100 },
  { id: 'snow-flump', durMs: 1400 },
  { id: 'sparkle-clap', durMs: 1000 },
  { id: 'shiver-giggle', durMs: 800 },
];

export function linePoolIds() {
  return Object.keys(LINE_POOLS);
}

export function emoteById(id) {
  return EMOTES.find(e => e.id === id) ?? null;
}
