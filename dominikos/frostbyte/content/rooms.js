// Room registry — DATA, not code (Engine & World Architecture §3, World & Room Design).
// Playable rooms remain data-driven so new destinations share the same scene wiring.
//
// Bounds note: the plan's first-draft bounds {y0:120,y1:864} excluded the north/south door
// hotspots (720,96) and (720,936), which sit deliberately at the map's compass edges. Per the
// plan's own "verify empirically, tighten the inset if needed" guidance (World & Room Design,
// Camera bounds), the y-inset is relaxed to {y0:96,y1:936} so every door is reachable. Re-check
// visually once the camera is live (no blank canvas past the map edge at any corner) and tighten
// if needed.
export const ROOM_REGISTRY = {
  plaza: {
    id: 'plaza',
    title: 'Chillmere Plaza',
    mapAsset: 'room-plaza',                          // ./assets/room-plaza.png
    tile: 16, gridCols: 30, gridRows: 20,             // native map = 480x320px
    scale: 3,
    bounds: { x0: 72, x1: 1368, y0: 96, y1: 936 },
    spawnPoints: {
      default:      { x: 720, y: 800, facing: 'up' },
      fromDen:      { x: 620, y: 800, facing: 'up' },
      fromCourt:    { x: 1300, y: 500, facing: 'left' },
      fromWorkshop: { x: 130, y: 500, facing: 'right' },
      fromTrail:    { x: 720, y: 170, facing: 'down' },
      fromMinigame: { x: 1050, y: 620, facing: 'down' },
      fromMap:      { x: 720, y: 560, facing: 'down' },
    },
    camera: { leadY: -50 },
    hotspots: [
      { id: 'fountain-driftback', label: "Driftback's Fountain", kind: 'landmark', x: 792, y: 264 },
      { id: 'shop-glimmerwool', label: 'Glimmer & Wool', kind: 'shop', x: 96, y: 552 },
      { id: 'minigame-snowdrift', label: 'Snowdrift Toss', kind: 'minigame', x: 1128, y: 552 },
      { id: 'noticeboard-chronicle', label: 'The Chillmere Chronicle', kind: 'noticeboard', x: 168, y: 792 },
      { id: 'bench-north', label: null, kind: 'sit', x: 408, y: 264 },
      { id: 'bench-south', label: null, kind: 'sit', x: 552, y: 696 },
    ],
    doors: [
      { id: 'door-trail', label: 'Frostline Trail', x: 720, y: 96, targetRoom: 'trail', locked: false, targetSpawn: 'fromPlaza' },
      { id: 'door-court', label: 'Glasswind Court', x: 1368, y: 456, targetRoom: 'court', locked: false, targetSpawn: 'fromPlaza' },
      { id: 'door-workshop', label: 'Emberlight Workshop', x: 72, y: 360, targetRoom: 'workshop', locked: false, targetSpawn: 'fromPlaza' },
      { id: 'door-den', label: 'Your Den', x: 720, y: 936, targetRoom: 'den', locked: false, targetSpawn: 'fromPlaza' },
    ],
    // Rendered + collidable in the S1 spike: fountain/pond only (what room-plaza.png actually paints).
    // Bench/shop/minigame/noticeboard solids land once their art does (P2-P4), to avoid invisible walls.
    solids: [
      { id: 'fountain-driftback', x: 792, y: 264, w: 220, h: 160 },
    ],
    // Populated in P3 (NPC crowd) — empty for the S1 waddle spike.
    npcSpawnAnchors: [],
  },

  // H1: Your Den — the player's private igloo-dome home. Furniture & edit-mode layers land in H2.
  den: {
    id: 'den',
    title: 'Your Den',
    mapAsset: 'room-den',                            // ./assets/room-den.png
    tile: 16, gridCols: 30, gridRows: 20,             // native 480x320, world 1440x960 — same as plaza
    scale: 3,
    bounds: { x0: 400, x1: 1040, y0: 240, y1: 800 },
    spawnPoints: {
      default:    { x: 720, y: 560, facing: 'down' },
      fromPlaza:  { x: 720, y: 720, facing: 'up' },
      fromMap:    { x: 720, y: 560, facing: 'down' },
    },
    camera: { leadY: -50 },
    hotspots: [
      { id: 'hearth-den', label: 'The Hearth', kind: 'landmark', x: 720, y: 280 },
      { id: 'door-sign-den', label: 'Door Sign', kind: 'sign', x: 900, y: 720 },
    ],
    doors: [
      { id: 'door-out', label: 'Chillmere Plaza', x: 720, y: 800, targetRoom: 'plaza', locked: false, targetSpawn: 'fromDen' },
    ],
    solids: [
      { id: 'hearth-den', x: 720, y: 285, w: 120, h: 90 },
    ],
    npcSpawnAnchors: [],
  },

  // H4: Frostline Trail — outdoor snowy passage with frozen falls and ancient signpost.
  // Walk-over coin glints daily-gated via economy.collectPickup.
  trail: {
    id: 'trail',
    title: 'Frostline Trail',
    mapAsset: 'room-trail',                          // ./assets/room-trail.png
    tile: 16, gridCols: 30, gridRows: 20,             // native map = 480x320px
    scale: 3,
    bounds: { x0: 120, x1: 1320, y0: 180, y1: 880 },
    spawnPoints: {
      default:    { x: 720, y: 760, facing: 'up' },
      fromPlaza:  { x: 720, y: 820, facing: 'up' },
      fromMap:    { x: 720, y: 560, facing: 'down' },
    },
    camera: { leadY: -50 },
    hotspots: [
      { id: 'falls-frostline', label: 'The Frozen Falls', kind: 'landmark', x: 720, y: 220 },
      { id: 'signpost-trail', label: 'Old Signpost', kind: 'landmark', x: 1100, y: 760 },
    ],
    doors: [
      { id: 'door-back', label: 'Chillmere Plaza', x: 720, y: 880, targetRoom: 'plaza', locked: false, targetSpawn: 'fromTrail' },
    ],
    solids: [
      { id: 'pines-west', x: 300, y: 400, w: 120, h: 140 },
      { id: 'pines-east', x: 1100, y: 300, w: 120, h: 140 },
      { id: 'boulder-mid', x: 500, y: 700, w: 100, h: 80 },
    ],
    npcSpawnAnchors: [
      { x: 720, y: 350, roamRadius: 70 },
      { x: 250, y: 750, roamRadius: 70 },
      { x: 1050, y: 550, roamRadius: 70 },
    ],
    pickups: [
      { id: 'trail-glint-1', x: 300, y: 650 },
      { id: 'trail-glint-2', x: 720, y: 300 },
      { id: 'trail-glint-3', x: 1150, y: 500 },
      { id: 'trail-glint-4', x: 500, y: 250 },
    ],
    clickables: [
      {
        id: 'weather-bell-vane', reaction: 'chime', x: 1104, y: 747, w: 72, h: 72,
        line: 'A small brass vane has twisted itself around the old signpost.', reactionColor: '#ffb45e',
        favorStep: {
          favorId: 'pat-weather-bell-parts', stepId: 'recover-trail-vane',
          successText: 'Weather Bell part 2/3 — final part waits at Driftgate Docks',
        },
        onlyWhenFavorStep: true,
      },
    ],
  },

  // Glasswind Court — a compact market square with three distinct, interactive storefronts.
  court: {
    id: 'court',
    title: 'Glasswind Court',
    mapAsset: 'room-court',
    tile: 16, gridCols: 30, gridRows: 20,
    scale: 3,
    bounds: { x0: 72, x1: 1368, y0: 96, y1: 888 },
    spawnPoints: {
      default:    { x: 720, y: 420, facing: 'down' },
      fromPlaza:  { x: 168, y: 480, facing: 'right' },
      fromDocks:  { x: 1290, y: 858, facing: 'up' },
      fromMap:    { x: 720, y: 720, facing: 'up' },
    },
    camera: { leadY: -50 },
    hotspots: [
      {
        id: 'venue-snowtail-petshop', label: 'Snowtail Pet Shop', kind: 'venue', x: 426, y: 296,
        solidId: 'snowtail-petshop',
        entryDirection: 'up',
        prompt: 'Visit the pet shop',
        copy: 'Warm nests, tiny scarves, and three sleepy snowtails fill the window. The keeper says every companion chooses their own name.',
      },
      {
        id: 'venue-bluehour-coffee', label: 'Bluehour Coffee', kind: 'venue', x: 702, y: 324,
        solidId: 'bluehour-coffee',
        entryDirection: 'up',
        prompt: 'Visit the coffee shop',
        copy: 'Today\'s Northlight Blend comes with cloudberry foam and a cinnamon snowflake on top.',
      },
      {
        id: 'venue-lantern-ladle', label: 'Lantern Ladle Restaurant', kind: 'venue', x: 1116, y: 648,
        solidId: 'lantern-ladle',
        entryDirection: 'right',
        prompt: 'Visit the restaurant',
        copy: 'Tonight\'s special is ember-roasted root stew with iceleaf rolls. A warm corner table is ready.',
      },
      {
        id: 'noticeboard-chirper', label: 'The Chillmere Chirper', kind: 'newspaper', x: 1095, y: 822,
        prompt: 'Read this week’s Chirper',
      },
    ],
    doors: [
      { id: 'door-back', label: 'Chillmere Plaza', x: 72, y: 480, targetRoom: 'plaza', locked: false, targetSpawn: 'fromCourt' },
      { id: 'door-docks', label: 'Driftgate Docks', x: 1290, y: 888, targetRoom: 'docks', locked: false, targetSpawn: 'fromCourt' },
    ],
    solids: [
      { id: 'snowtail-petshop', x: 291, y: 190, w: 438, h: 188 },
      { id: 'bluehour-coffee', x: 840, y: 204, w: 420, h: 216 },
      { id: 'lantern-ladle', x: 1248, y: 600, w: 240, h: 456 },
      { id: 'court-cart', x: 705, y: 522, w: 114, h: 78 },
      { id: 'patio-table-a', x: 840, y: 744, w: 84, h: 54 },
      { id: 'patio-table-b', x: 1035, y: 810, w: 78, h: 54 },
      { id: 'patio-brazier', x: 735, y: 846, w: 54, h: 54 },
      { id: 'court-bench', x: 540, y: 822, w: 108, h: 30 },
      { id: 'menu-board', x: 1095, y: 822, w: 45, h: 66 },
      { id: 'edda-nook', x: 925, y: 790, w: 54, h: 70 },
    ],
    anchors: [
      { characterId: 'edda-quill', x: 925, y: 790 },
    ],
    clickables: [
      {
        id: 'window-wave', curioId: 'court-window-wave', reaction: 'wave',
        x: 219, y: 207, w: 228, h: 90,
        line: 'Two tiny silhouettes wave back from the warm window.', reactionColor: '#6fe0b2',
      },
      {
        id: 'fountain-glimmer', curioId: 'court-fountain-glimmer', reaction: 'glimmer',
        x: 579, y: 490, w: 300, h: 220,
        line: 'A coin glints once beneath the frozen court.', reactionColor: '#ffb45e',
      },
      {
        id: 'wind-chimes', curioId: 'court-wind-chimes', reaction: 'chime',
        x: 846, y: 120, w: 84, h: 48,
        line: 'The ice chimes answer in three bright notes.', reactionColor: '#7fd6ff',
      },
      {
        id: 'awning-snow', curioId: 'court-awning-snow', reaction: 'snow',
        x: 285, y: 132, w: 420, h: 48,
        line: 'Whump. The awning looks much lighter now.', reactionColor: '#cfe0f2',
      },
      {
        id: 'kettle-steam', curioId: 'court-kettle-steam', reaction: 'steam',
        x: 705, y: 520, w: 150, h: 96,
        line: 'The kettle answers with a determined puff.', reactionColor: '#f5fbff',
      },
      {
        id: 'postbox-rattle', curioId: 'court-postbox-rattle', reaction: 'rattle',
        x: 1095, y: 810, w: 54, h: 96,
        line: 'Rattle-rattle. No letter takes responsibility.', reactionColor: '#ff784f',
      },
      {
        id: 'loose-cobble', reaction: 'hum', x: 900, y: 861, w: 90, h: 42,
        line: 'A low note hums beneath the ice, then slips deeper.', reactionColor: '#6fe0b2',
      },
      {
        id: 'weather-bell-coil', reaction: 'chime', x: 411, y: 744, w: 60, h: 60,
        line: 'A warm brass spiral is hiding beneath the companion pen rail.', reactionColor: '#ffb45e',
        favorStep: {
          favorId: 'pat-weather-bell-parts', stepId: 'recover-court-coil',
          successText: 'Weather Bell part 1/3 — next: Frostline Trail',
        },
        onlyWhenFavorStep: true,
      },
    ],
    npcSpawnAnchors: [],
  },

  // Emberlight Workshop — Pat Hocket's forge-warm tinkering room and the Weather Bell project.
  workshop: {
    id: 'workshop',
    title: 'Emberlight Workshop',
    mapAsset: 'room-workshop',
    tile: 16, gridCols: 30, gridRows: 20,
    scale: 3,
    bounds: { x0: 120, x1: 1320, y0: 120, y1: 888 },
    spawnPoints: {
      default:   { x: 720, y: 690, facing: 'up' },
      fromPlaza: { x: 720, y: 820, facing: 'up' },
      fromMap:   { x: 780, y: 690, facing: 'up' },
    },
    camera: { leadY: -50 },
    hotspots: [
      { id: 'weather-bell', label: 'The Weather Bell', kind: 'landmark', x: 720, y: 390 },
    ],
    doors: [
      { id: 'door-back', label: 'Chillmere Plaza', x: 720, y: 888, targetRoom: 'plaza', locked: false, targetSpawn: 'fromWorkshop' },
    ],
    solids: [
      { id: 'weather-bell', x: 720, y: 390, w: 180, h: 170 },
      { id: 'pat-bench', x: 1080, y: 300, w: 300, h: 120 },
      { id: 'gizmo-shelf', x: 300, y: 270, w: 220, h: 130 },
      { id: 'forge-bellows', x: 270, y: 600, w: 190, h: 160 },
      { id: 'pneumatic-tube', x: 1170, y: 230, w: 84, h: 150 },
      { id: 'snowputer', x: 1140, y: 690, w: 120, h: 90 },
      { id: 'pat-station', x: 1080, y: 450, w: 60, h: 72 },
    ],
    anchors: [
      { characterId: 'pat-hocket', x: 1080, y: 480 },
    ],
    clickables: [
      {
        id: 'bellows-puff', curioId: 'workshop-bellows-puff', reaction: 'steam',
        x: 270, y: 600, w: 126, h: 120,
        line: 'The bellows sighs out one coal-scented cloud.', reactionColor: '#f5fbff',
      },
      {
        id: 'gizmo-chain', curioId: 'workshop-gizmo-chain', reaction: 'chain',
        x: 300, y: 270, w: 210, h: 120,
        line: 'Click. Zip. Bonk. Seven mechanisms celebrate doing almost nothing.', reactionColor: '#6fe0b2',
      },
      {
        id: 'tube-thunk', curioId: 'workshop-tube-thunk', reaction: 'rattle',
        x: 1170, y: 230, w: 84, h: 150,
        line: 'Thunk. The tube delivers a blank order slip and one warm washer.', reactionColor: '#ff784f',
      },
      {
        id: 'blueprint-cycle', curioId: 'workshop-blueprint-cycle', reaction: 'wave',
        x: 720, y: 195, w: 270, h: 102, reactionColor: '#7fd6ff',
        lines: [
          'A rotating sketch proposes an umbrella for the lighthouse.',
          'Next design: a kettle that whistles only when nobody is watching.',
          'Final sheet: a tiny wheeled shelf labelled entirely in arrows.',
        ],
      },
      {
        id: 'snowputer', curioId: 'workshop-snowputer', reaction: 'snow',
        x: 1140, y: 690, w: 120, h: 105,
        line: 'The snowputer calculates: “probably flurries.” A tiny fan applauds.', reactionColor: '#cfe0f2',
      },
      {
        id: 'weather-bell-test', reaction: 'chime', x: 720, y: 390, w: 210, h: 210,
        line: 'The half-built Bell answers with one brave note and two nervous rattles.', reactionColor: '#ffb45e',
        favorStep: {
          favorId: 'edda-tip-workshop-test', stepId: 'witness-workshop-test',
          successText: 'Story tip witnessed — report the test-firing to Edda!',
        },
      },
      {
        id: 'dumbwaiter-hatch', reaction: 'hum', x: 390, y: 795, w: 180, h: 90,
        line: 'The hatch is locked. A draught below smells like cold stone.', reactionColor: '#6fe0b2',
      },
    ],
    npcSpawnAnchors: [],
  },

  // Driftgate Docks — resolved to in-port/away art and content by content/docks.js.
  docks: {
    id: 'docks',
    title: 'Driftgate Docks',
    mapAsset: 'room-docks-away',
    stateAssets: { inPort: 'room-docks-port', away: 'room-docks-away' },
    tile: 16, gridCols: 30, gridRows: 20,
    scale: 3,
    bounds: { x0: 72, x1: 1368, y0: 96, y1: 888 },
    spawnPoints: {
      default:        { x: 420, y: 540, facing: 'right' },
      fromCourt:      { x: 150, y: 480, facing: 'right' },
      fromLighthouse: { x: 1150, y: 170, facing: 'down' },
      fromMap:        { x: 420, y: 600, facing: 'right' },
    },
    camera: { leadY: -50 },
    hotspots: [
      {
        id: 'salka-trader-stall', label: 'Salka’s Cargo Stall', kind: 'trader',
        x: 1050, y: 680, prompt: 'Browse today’s two cargo finds', bargeState: 'in-port',
      },
    ],
    doors: [
      { id: 'door-court', label: 'Glasswind Court', x: 72, y: 480, targetRoom: 'court', locked: false, targetSpawn: 'fromDocks' },
      {
        id: 'door-lighthouse', label: 'Palefire Light', x: 1150, y: 96,
        targetRoom: 'lighthouse-rest', locked: true,
        lockedCopy: 'The lighthouse trail is still buried past the marker posts.',
      },
    ],
    solids: [
      { id: 'water-north-west', x: 885, y: 220, w: 390, h: 220 },
      { id: 'water-north-east', x: 1294, y: 220, w: 148, h: 220 },
      { id: 'water-south-main', x: 840, y: 720, w: 540, h: 210 },
      { id: 'dock-warehouse', x: 270, y: 240, w: 270, h: 190 },
      { id: 'crane-base', x: 1110, y: 420, w: 120, h: 150 },
      { id: 'harbor-bell-post', x: 780, y: 300, w: 66, h: 120 },
    ],
    anchors: [
      { characterId: 'captain-salka', x: 870, y: 500, bargeState: 'in-port' },
    ],
    clickables: [
      {
        id: 'tidepool-duck', curioId: 'docks-tidepool-duck', reaction: 'wave',
        x: 330, y: 720, w: 180, h: 120,
        line: 'Three tiny tidepool shapes duck beneath the ice rim at once.', reactionColor: '#6fe0b2',
      },
      {
        id: 'bottle-post', curioId: 'docks-bottle-post', reaction: 'rattle',
        x: 480, y: 420, w: 80, h: 110,
        line: 'A salt-clouded bottle carries this week’s short dispatch.', reactionColor: '#7fd6ff',
      },
      {
        id: 'harbor-bell', curioId: 'docks-harbor-bell', reaction: 'chime',
        x: 780, y: 300, w: 96, h: 120,
        line: 'The harbor bell sends one round note across the floes.', reactionColor: '#ffb45e',
      },
      {
        id: 'crane-swing', curioId: 'docks-crane-swing', reaction: 'swing',
        x: 1110, y: 390, w: 210, h: 180,
        line: 'The cargo crane swings seaward, pauses, then remembers its manners.', reactionColor: '#ff784f',
      },
      {
        id: 'buoy-bob', curioId: 'docks-buoy-bob', reaction: 'bob',
        x: 1230, y: 630, w: 108, h: 120,
        line: 'The outer buoy gives the pier a solemn little nod.', reactionColor: '#ff784f',
      },
      {
        id: 'gull-scatter', curioId: 'docks-gull-scatter', reaction: 'scatter',
        x: 720, y: 180, w: 260, h: 90,
        line: 'A whitewing flock bursts apart and reforms one piling over.', reactionColor: '#f5fbff',
      },
      {
        id: 'underpier-cache', curioId: 'docks-underpier-cache', reaction: 'glimmer',
        x: 1180, y: 855, w: 120, h: 60, requiresProximity: true,
        line: 'At the end of the narrow ledge: a sea-glass knot tucked beneath the pier.', reactionColor: '#6fe0b2',
      },
      {
        id: 'weather-bell-clapper', reaction: 'chime', x: 1010, y: 555, w: 80, h: 80,
        line: 'A heavy brass clapper is tagged for Pat Hocket’s workshop.', reactionColor: '#ffb45e',
        bargeState: 'in-port', onlyWhenFavorStep: true,
        favorStep: {
          favorId: 'pat-weather-bell-parts', stepId: 'recover-docks-clapper',
          successText: 'Weather Bell part 3/3 — return all three pieces to Pat',
        },
      },
    ],
    npcSpawnAnchors: [],
  },
};
