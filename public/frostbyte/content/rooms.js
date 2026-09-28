// Room registry — DATA, not code (Engine & World Architecture §3, World & Room Design).
// Playable rooms remain data-driven so new destinations share the same scene wiring.
//
// Bounds note: the plan's first-draft bounds {y0:120,y1:864} excluded the north/south door
// hotspots (720,96) and (720,936), which sit deliberately at the map's compass edges. Per the
// plan's own "verify empirically, tighten the inset if needed" guidance (World & Room Design,
// Camera bounds), the y-inset is relaxed to {y0:96,y1:936} so every door is reachable. Re-check
// visually once the camera is live (no blank canvas past the map edge at any corner) and tighten
// if needed.
// Avatar sizes measured against painted doors and furniture using the plaza as the baseline.
export const BASE_AVATAR_SCALE = 3;
export const bodyFactor = (room) => (room?.avatarScale ?? BASE_AVATAR_SCALE) / BASE_AVATAR_SCALE;

export const ROOM_REGISTRY = {
  plaza: {
    id: 'plaza',
    title: 'Chillmere Plaza',
    outdoors: true,
    mapAsset: 'room-plaza',                          // ./assets/room-plaza.png
    tile: 16, gridCols: 30, gridRows: 20,             // native map = 480x320px
    scale: 3,
    bounds: { x0: 72, x1: 1368, y0: 96, y1: 936 },
    spawnPoints: {
      default:      { x: 720, y: 600, facing: 'up' },
      // Beside the igloo mouth, not in it — every room keeps its arrival spawn clear of the
      // door's auto-enter radius so stepping out never re-triggers the door you just used.
      fromDen:      { x: 646, y: 928, facing: 'left' },
      // Inside the fenced lane that runs east to the court gate, between the painted rails.
      fromCourt:    { x: 1310, y: 540, facing: 'left' },
      // On the snow in front of the workshop's painted door, clear of its auto-enter radius.
      fromWorkshop: { x: 300, y: 492, facing: 'down' },
      fromTrail:    { x: 720, y: 200, facing: 'down' },
      fromMinigame: { x: 1050, y: 620, facing: 'down' },
      fromMap:      { x: 720, y: 560, facing: 'down' },
    },
    camera: { leadY: -50 },
    hotspots: [
      { id: 'fountain-driftback', label: "Driftback's Fountain", kind: 'landmark', x: 1000, y: 400, lore: 'Driftback heard three notes beneath the sea ice and founded Chillmere where they rang loudest.' },
      // On the painted door of the timber house just north-east of the fountain: walking up into
      // the door opens the shop, the same as its prompt.
      { id: 'shop-glimmerwool', label: 'Glimmer & Wool', kind: 'shop', x: 1148, y: 290, entryDirection: 'up' },
      { id: 'minigame-snowdrift', label: 'Snowdrift Toss', kind: 'minigame', x: 1128, y: 552 },
      { id: 'noticeboard-chronicle', label: 'The Chillmere Chirper', kind: 'noticeboard', x: 190, y: 430 },
      { id: 'bench-north', label: null, kind: 'sit', x: 530, y: 300 },
      { id: 'bench-south', label: null, kind: 'sit', x: 1010, y: 740 },
    ],
    doors: [
      // The top of the painted trail, where the path meets the tree line. A threshold across the
      // path's width, so every lane up the trail leaves (not just the centre line).
      {
        id: 'door-trail', label: 'Frostline Trail', x: 720, y: 132, targetRoom: 'trail', locked: false,
        targetSpawn: 'fromPlaza', autoEnterRadius: 34, autoEnterHalfWidth: 60,
      },
      // The snow wedge where the rink lane runs out east between the fence and the house roof.
      { id: 'door-court', label: 'Glasswind Court', x: 1368, y: 495, targetRoom: 'court', locked: false, targetSpawn: 'fromPlaza' },
      // The painted door under the hanging sign (NW house). Walk up into it to enter; the small
      // contact radius keeps players strolling along the snowbank from being pulled inside.
      {
        id: 'door-workshop', label: 'Emberlight Workshop', x: 300, y: 443, targetRoom: 'workshop', locked: false,
        targetSpawn: 'fromPlaza', enterDir: { x: 0, y: -1 }, autoEnterRadius: 34,
      },
      // Sits in the painted golden arch. enterDir opts this door into proximity auto-enter: it is
      // mid-room, so the room-edge rule the other doors use cannot reach it (see engine/travel.js).
      {
        id: 'door-den', label: 'Your Den', x: 722, y: 892, targetRoom: 'den', locked: false,
        targetSpawn: 'fromPlaza', enterDir: { x: 0, y: -1 },
      },
    ],
    // Rendered + collidable in the S1 spike: fountain/pond only (what room-plaza.png actually paints).
    // Bench/shop/minigame/noticeboard solids land once their art does (P2-P4), to avoid invisible walls.
    solids: [
      { id: 'fountain-driftback', x: 993, y: 330, w: 190, h: 110 },
    ],
    // Populated in P3 (NPC crowd) — empty for the S1 waddle spike.
    npcSpawnAnchors: [],
  },

  // H1: Your Den — the player's private igloo-dome home. Furniture & edit-mode layers land in H2.
  den: {
    id: 'den',
    avatarScale: 8,
    title: 'Your Den',
    mapAsset: 'room-den',                            // ./assets/room-den.png
    tile: 16, gridCols: 30, gridRows: 20,             // native 480x320, world 1440x960 — same as plaza
    scale: 3,
    bounds: { x0: 400, x1: 1040, y0: 240, y1: 800 },
    spawnPoints: {
      default:    { x: 720, y: 510, facing: 'down' },
      fromPlaza:  { x: 720, y: 510, facing: 'down' },
      fromMap:    { x: 720, y: 510, facing: 'down' },
    },
    camera: { leadY: -50 },
    hotspots: [
      { id: 'hearth-den', label: 'The Hearth', kind: 'landmark', x: 720, y: 280, lore: 'The hearth keeps a small, stubborn warmth against the sea ice.' },
      { id: 'door-sign-den', label: 'Door Sign', kind: 'sign', x: 900, y: 720 },
    ],
    doors: [
      {
        id: 'door-out', label: 'Chillmere Plaza', x: 720, y: 642,
        targetRoom: 'plaza', locked: false, targetSpawn: 'fromDen',
        enterDir: { x: 0, y: 1 }, promptRadius: 72, autoEnterRadius: 18, autoEnterHalfWidth: 52,
      },
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
    outdoors: true,
    mapAsset: 'room-trail',                          // ./assets/room-trail.png
    tile: 16, gridCols: 30, gridRows: 20,             // native map = 480x320px
    scale: 3,
    bounds: { x0: 120, x1: 1320, y0: 180, y1: 880 },
    spawnPoints: {
      default:    { x: 720, y: 760, facing: 'up' },
      fromPlaza:  { x: 720, y: 820, facing: 'up' },
      fromWhisperpine: { x: 1240, y: 480, facing: 'left' },
      fromMap:    { x: 720, y: 560, facing: 'down' },
    },
    camera: { leadY: -50 },
    hotspots: [
      { id: 'falls-frostline', label: 'The Frozen Falls', kind: 'landmark', x: 720, y: 220, lore: 'Under the frozen rush, something hums three low notes, then stops to listen.' },
      { id: 'signpost-trail', label: 'Old Signpost', kind: 'landmark', x: 1070, y: 380, lore: 'Driftback marked this route with old lighthouse lenses so ships could find home.' },
    ],
    doors: [
      { id: 'door-back', label: 'Chillmere Plaza', x: 720, y: 880, targetRoom: 'plaza', locked: false, targetSpawn: 'fromTrail' },
      { id: 'door-whisperpine', label: 'Whisperpine Hollow', x: 1320, y: 480, targetRoom: 'whisperpine', locked: false, targetSpawn: 'fromTrail' },
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
      { id: 'trail-glint-2', x: 720, y: 370 },
      { id: 'trail-glint-3', x: 1150, y: 500 },
      { id: 'trail-glint-4', x: 560, y: 390 },
    ],
    clickables: [
      {
        id: 'weather-bell-vane', reaction: 'chime', x: 1070, y: 380, w: 130, h: 130,
        line: 'A small brass vane has twisted itself around the old signpost.', reactionColor: '#ffb45e',
        favorStep: {
          favorId: 'pat-weather-bell-parts', stepId: 'recover-trail-vane',
          successText: 'Weather Bell part 2/3 — final part waits at Driftgate Docks',
        },
        onlyWhenFavorStep: true,
      },
      {
        id: 'palefire-trail-ribbon', reaction: 'wave', x: 1090, y: 470, w: 170, h: 100,
        line: 'A blue ribbon of light folds once between the old lenses, then returns toward Palefire.', reactionColor: '#7fd6ff',
        favorStep: {
          favorId: 'maren-sighting-trail', stepId: 'witness-trail-event',
          successText: 'Sighting witnessed — report the blue ribbon to Old Maren',
        },
        onlyWhenFavorStep: true,
      },
    ],
  },

  // Glasswind Court — a compact market square with three distinct, interactive storefronts.
  court: {
    id: 'court',
    title: 'Glasswind Court',
    outdoors: true,
    mapAsset: 'room-court',
    tile: 16, gridCols: 30, gridRows: 20,
    scale: 3,
    bounds: { x0: 72, x1: 1368, y0: 96, y1: 888 },
    spawnPoints: {
      default:    { x: 720, y: 420, facing: 'down' },
      fromPlaza:  { x: 168, y: 525, facing: 'right' },
      fromDocks:  { x: 1290, y: 858, facing: 'up' },
      fromMap:    { x: 720, y: 720, facing: 'up' },
    },
    camera: { leadY: -50 },
    hotspots: [
      {
        id: 'venue-snowtail-petshop', label: 'Snowtail Pet Shop', kind: 'venue', x: 360, y: 420,
        solidId: 'snowtail-petshop',
        entryDirection: 'up',
        prompt: 'Visit the pet shop',
        copy: 'Warm nests and tiny scarves fill the window, but the nests are empty. A card reads: ‘Snowtails arrive with the spring sailing.’',
      },
      {
        id: 'venue-bluehour-coffee', label: 'Bluehour Coffee', kind: 'venue', x: 840, y: 420,
        solidId: 'bluehour-coffee',
        entryDirection: 'up',
        prompt: 'Visit the coffee shop',
        copy: 'Today\'s Northlight Blend comes with cloudberry foam and a cinnamon snowflake on top.',
      },
      {
        id: 'venue-lantern-ladle', label: 'Lantern Ladle Restaurant', kind: 'venue', x: 1125, y: 620,
        solidId: 'lantern-ladle',
        entryDirection: 'right',
        prompt: 'Visit the restaurant',
        copy: 'Tonight\'s special is ember-roasted root stew with iceleaf rolls. A warm corner table is ready.',
      },
      {
        id: 'noticeboard-chirper', label: 'The Chillmere Chirper', kind: 'newspaper', x: 190, y: 430,
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
      { characterId: 'edda-quill', x: 930, y: 690 },
    ],
    clickables: [
      {
        id: 'window-wave', curioId: 'court-window-wave', reaction: 'wave',
        x: 465, y: 270, w: 165, h: 115,
        line: 'Two tiny silhouettes wave back from the warm window.', reactionColor: '#6fe0b2',
      },
      {
        id: 'fountain-glimmer', curioId: 'court-fountain-glimmer', reaction: 'glimmer',
        x: 755, y: 795, w: 85, h: 95,
        line: 'A bright ember glints beneath the patio brazier.', reactionColor: '#ffb45e',
      },
      {
        id: 'wind-chimes', curioId: 'court-wind-chimes', reaction: 'chime',
        x: 740, y: 245, w: 66, h: 100,
        line: 'The ice chimes answer in three bright notes.', reactionColor: '#7fd6ff',
      },
      {
        id: 'awning-snow', curioId: 'court-awning-snow', reaction: 'snow',
        x: 500, y: 485, w: 180, h: 115,
        line: 'Whump. The awning looks much lighter now.', reactionColor: '#cfe0f2',
      },
      {
        id: 'kettle-steam', curioId: 'court-kettle-steam', reaction: 'steam',
        x: 830, y: 305, w: 115, h: 150,
        line: 'The kettle answers with a determined puff.', reactionColor: '#f5fbff',
      },
      {
        id: 'postbox-rattle', curioId: 'court-postbox-rattle', reaction: 'rattle',
        x: 195, y: 430, w: 105, h: 125,
        line: 'The noticeboard rattles. No pinned notice takes responsibility.', reactionColor: '#ff784f',
      },
      {
        id: 'loose-cobble', reaction: 'hum', x: 850, y: 838, w: 80, h: 100,
        line: 'Three low notes hum beneath the patio chair, then slip deeper.', reactionColor: '#6fe0b2',
      },
      {
        id: 'weather-bell-coil', reaction: 'chime', x: 545, y: 585, w: 70, h: 70,
        line: 'A warm brass spiral rolled under the market cart by the pet shop.', reactionColor: '#ffb45e',
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
    avatarScale: 7.5,
    title: 'Emberlight Workshop',
    mapAsset: 'room-workshop',
    tile: 16, gridCols: 30, gridRows: 20,
    scale: 3,
    bounds: { x0: 120, x1: 1320, y0: 120, y1: 888 },
    spawnPoints: {
      default:   { x: 720, y: 690, facing: 'up' },
      fromPlaza: { x: 720, y: 820, facing: 'up' },
      fromMap:   { x: 780, y: 690, facing: 'up' },
      fromCaverns: { x: 390, y: 720, facing: 'down' },
    },
    camera: { leadY: -50 },
    hotspots: [
      { id: 'weather-bell', label: 'The Weather Bell', kind: 'landmark', x: 720, y: 390, lore: 'Driftback cast the Weather Bell to answer the song. It hasn’t rung true since.' },
    ],
    doors: [
      { id: 'door-back', label: 'Chillmere Plaza', x: 720, y: 888, targetRoom: 'plaza', locked: false, targetSpawn: 'fromWorkshop' },
      {
        id: 'door-cavern-dumbwaiter', label: 'Hollowfrost Dumbwaiter', x: 390, y: 795,
        targetRoom: 'caverns', targetSpawn: 'fromWorkshop', locked: true,
        lockedCopy: 'The hatch is locked. A draught below smells like cold stone.',
      },
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
      { characterId: 'pat-hocket', x: 1080, y: 520 },
    ],
    clickables: [
      {
        id: 'bellows-puff', curioId: 'workshop-bellows-puff', reaction: 'steam',
        x: 215, y: 650, w: 190, h: 170,
        line: 'The bellows sighs out one coal-scented cloud.', reactionColor: '#f5fbff',
      },
      {
        id: 'gizmo-chain', curioId: 'workshop-gizmo-chain', reaction: 'chain',
        x: 430, y: 335, w: 260, h: 240,
        line: 'Click. Zip. Bonk. Seven mechanisms celebrate doing almost nothing.', reactionColor: '#6fe0b2',
      },
      {
        id: 'tube-thunk', curioId: 'workshop-tube-thunk', reaction: 'rattle',
        x: 1120, y: 490, w: 95, h: 90,
        line: 'Thunk. A warm washer rattles across Pat\'s workbench.', reactionColor: '#ff784f',
      },
      {
        id: 'blueprint-cycle', curioId: 'workshop-blueprint-cycle', reaction: 'wave',
        x: 960, y: 300, w: 280, h: 360, reactionColor: '#7fd6ff',
        lines: [
          'A rotating sketch proposes an umbrella for the lighthouse.',
          'Next design: a kettle that whistles only when nobody is watching.',
          'Final sheet: a tiny wheeled shelf labelled entirely in arrows.',
        ],
      },
      {
        id: 'snowputer', curioId: 'workshop-snowputer', reaction: 'snow',
        x: 1170, y: 605, w: 300, h: 260,
        line: 'The snowputer calculates: “probably flurries.” A tiny fan applauds.', reactionColor: '#cfe0f2',
      },
      {
        id: 'weather-bell-test', reaction: 'chime', x: 705, y: 390, w: 250, h: 540,
        line: 'The half-built Bell answers with one brave note and two nervous rattles.', reactionColor: '#ffb45e',
        repairedLine: 'The repaired Bell rings three clear notes. Even the floor listens.',
        onlyWhenFavorStep: true,
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
    outdoors: true,
    mapAsset: 'room-docks-away',
    stateAssets: { inPort: 'room-docks-port', away: 'room-docks-away' },
    // The two backdrops are painted differently. Away: the lighthouse stairs sit further west, and
    // there is no ledge under the east pier, so its cache sits under the pier's edge, reached from the
    // planks. In port: the Glasswind boardwalk joins higher up the west edge, and Salka's stall is on
    // her deck (the old spot is the hull).
    statePositions: {
      away: {
        spawnPoints: { fromLighthouse: { x: 903 } },
        doors: { 'door-lighthouse': { x: 940 } },
        clickables: {
          'tidepool-duck': { x: 330, y: 660 },
          'bottle-post': { x: 520, y: 260 },
          'harbor-bell': { x: 640, y: 160 },
          'crane-swing': { x: 1230, y: 300 },
          'buoy-bob': { x: 900, y: 730 },
          'gull-scatter': { x: 1130, y: 300 },
          'underpier-cache': { x: 1110, y: 700 },
        },
      },
      inPort: {
        spawnPoints: { fromCourt: { y: 369 } },
        doors: { 'door-court': { y: 326 } },
        hotspots: { 'salka-trader-stall': { x: 850, y: 600 } },
        clickables: {
          'tidepool-duck': { x: 310, y: 450 },
          'bottle-post': { x: 530, y: 175 },
          'harbor-bell': { x: 660, y: 160 },
          'crane-swing': { x: 1280, y: 265 },
          'buoy-bob': { x: 1090, y: 210 },
          'gull-scatter': { x: 800, y: 415 },
          'underpier-cache': { x: 1180, y: 855 },
        },
      },
    },
    tile: 16, gridCols: 30, gridRows: 20,
    scale: 3,
    bounds: { x0: 72, x1: 1368, y0: 96, y1: 888 },
    spawnPoints: {
      default:        { x: 330, y: 540, facing: 'right' },
      fromCourt:      { x: 150, y: 480, facing: 'right' },
      fromLighthouse: { x: 990, y: 160, facing: 'down' },
      fromMap:        { x: 330, y: 540, facing: 'right' },
    },
    camera: { leadY: -50 },
    hotspots: [
      { id: 'floe-fishing', label: 'Floe Fishing', kind: 'minigame', x: 828, y: 720, bargeState: 'away' }, // in port, the Gull's deck covers this water
      {
        id: 'salka-trader-stall', label: 'Salka’s Cargo Stall', kind: 'trader',
        x: 1050, y: 670, prompt: 'Browse today’s two cargo finds', bargeState: 'in-port',
      },
    ],
    doors: [
      { id: 'door-court', label: 'Glasswind Court', x: 72, y: 480, targetRoom: 'court', locked: false, targetSpawn: 'fromDocks' },
      {
        id: 'door-lighthouse', label: 'Palefire Light', x: 990, y: 96,
        targetRoom: 'lighthouse-rest', locked: false, targetSpawn: 'fromDocks',
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
      { characterId: 'captain-salka', x: 900, y: 600, bargeState: 'in-port' },
    ],
    clickables: [
      {
        id: 'tidepool-duck', curioId: 'docks-tidepool-duck', reaction: 'wave',
        x: 330, y: 720, w: 180, h: 120,
        line: 'Three tiny tidepool shapes duck beneath the ice rim at once.', reactionColor: '#6fe0b2',
      },
      {
        id: 'bottle-post', curioId: 'docks-bottle-post', reaction: 'rattle',
        x: 520, y: 260, w: 105, h: 125,
        line: 'A cargo note carries this week’s short dispatch.', reactionColor: '#7fd6ff',
      },
      {
        id: 'harbor-bell', curioId: 'docks-harbor-bell', reaction: 'chime',
        x: 650, y: 160, w: 90, h: 128,
        line: 'The harbor bell sends one round note across the floes.', reactionColor: '#ffb45e',
      },
      {
        id: 'crane-swing', curioId: 'docks-crane-swing', reaction: 'swing',
        x: 1275, y: 265, w: 175, h: 330,
        line: 'The cargo crane swings seaward, pauses, then remembers its manners.', reactionColor: '#ff784f',
      },
      {
        id: 'buoy-bob', curioId: 'docks-buoy-bob', reaction: 'bob',
        x: 900, y: 730, w: 115, h: 170,
        line: 'The pier lantern gives the water a solemn little nod.', reactionColor: '#ff784f',
      },
      {
        id: 'gull-scatter', curioId: 'docks-gull-scatter', reaction: 'scatter',
        x: 1130, y: 300, w: 120, h: 100,
        line: 'The timber creaks once, then settles against its fittings.', reactionColor: '#f5fbff',
      },
      {
        id: 'underpier-cache', curioId: 'docks-underpier-cache', reaction: 'glimmer',
        x: 1180, y: 855, w: 120, h: 60, requiresProximity: true,
        line: 'At the end of the narrow ledge: a sea-glass knot tucked beneath the pier.', reactionColor: '#6fe0b2',
      },
      {
        id: 'weather-bell-clapper', reaction: 'chime', x: 850, y: 600, w: 150, h: 125,
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

  // Palefire Light — lower round keeper's room; the stairs lead to a separate gallery scene.
  'lighthouse-rest': {
    id: 'lighthouse-rest',
    avatarScale: 7.5,
    title: 'Palefire Light — Keeper’s Rest',
    mapAsset: 'room-lighthouse-rest',
    tile: 16, gridCols: 30, gridRows: 20,
    scale: 3,
    bounds: { x0: 120, x1: 1320, y0: 120, y1: 888 },
    spawnPoints: {
      default:     { x: 720, y: 720, facing: 'up' },
      fromDocks:   { x: 720, y: 820, facing: 'up' },
      fromGallery: { x: 960, y: 520, facing: 'left' },
      fromMap:     { x: 720, y: 720, facing: 'up' },
    },
    camera: { leadY: -50 },
    hotspots: [
      { id: 'keeper-logbook', label: 'Keeper’s Logbook', kind: 'logbook', x: 250, y: 470, prompt: 'Read the growing sighting log' },
    ],
    doors: [
      { id: 'door-docks', label: 'Driftgate Docks', x: 720, y: 888, targetRoom: 'docks', locked: false, targetSpawn: 'fromLighthouse' },
      // On the threshold of the east arch, whose stairs climb to the gallery (y480 is the cabinet top).
      { id: 'stairs-gallery', label: 'Lantern Gallery', x: 1300, y: 440, targetRoom: 'lighthouse-gallery', locked: false, targetSpawn: 'fromRest' },
    ],
    solids: [
      { id: 'keeper-stove', x: 360, y: 285, w: 220, h: 170 },
      { id: 'logbook-table', x: 390, y: 510, w: 190, h: 105 },
      { id: 'spiral-stair-core', x: 1110, y: 420, w: 210, h: 240 },
      { id: 'keeper-cot', x: 930, y: 720, w: 240, h: 105 },
    ],
    anchors: [
      { characterId: 'old-maren', x: 750, y: 590 },
    ],
    clickables: [
      {
        id: 'keeper-stove-sigh', curioId: 'lighthouse-rest-stove-sigh', reaction: 'steam',
        x: 500, y: 260, w: 190, h: 175,
        line: 'The little iron stove exhales cedar, salt, and one tiny spark.', reactionColor: '#ffb45e',
      },
      {
        id: 'keeper-kettle-tick', curioId: 'lighthouse-rest-kettle-tick', reaction: 'chime',
        x: 540, y: 220, w: 95, h: 145,
        line: 'The kettle lid counts three patient ticks against the wind.', reactionColor: '#ffe2a1',
      },
      {
        id: 'keeper-cot-quilt', curioId: 'lighthouse-rest-cot-quilt', reaction: 'snow',
        x: 1030, y: 650, w: 520, h: 300,
        line: 'A stitched map of old currents hides beneath the folded quilt.', reactionColor: '#a78bfa',
      },
      {
        id: 'spiral-stair-answer', curioId: 'lighthouse-rest-stair-answer', reaction: 'hum',
        x: 1110, y: 420, w: 210, h: 240,
        line: 'The iron stair returns your tap one full turn later.', reactionColor: '#7fd6ff',
      },
    ],
    npcSpawnAnchors: [],
  },

  // Palefire Light — upper gallery, telescope balcony, and the slowly sweeping great lamp.
  'lighthouse-gallery': {
    id: 'lighthouse-gallery',
    outdoors: true,
    avatarScale: 7.5,
    title: 'Palefire Light — Lantern Gallery',
    mapAsset: 'room-lighthouse-gallery',
    tile: 16, gridCols: 30, gridRows: 20,
    scale: 3,
    bounds: { x0: 120, x1: 1320, y0: 120, y1: 888 },
    spawnPoints: {
      default:  { x: 240, y: 480, facing: 'right' },
      fromRest: { x: 210, y: 480, facing: 'right' },
      fromMap:  { x: 720, y: 720, facing: 'up' },
    },
    camera: { leadY: -50 },
    hotspots: [
      { id: 'great-lamp', label: 'The Great Lamp', kind: 'landmark', x: 720, y: 330, lore: 'Driftback set an old lighthouse lens here. Maren says its Moon note is still listening.' },
      { id: 'palefire-telescope', label: 'Palefire Telescope', kind: 'telescope', x: 1140, y: 390, prompt: 'Look across the floes' },
    ],
    doors: [
      { id: 'stairs-rest', label: 'Keeper’s Rest', x: 120, y: 480, targetRoom: 'lighthouse-rest', locked: false, targetSpawn: 'fromGallery' },
    ],
    solids: [
      { id: 'great-lamp', x: 720, y: 330, w: 240, h: 200 },
      { id: 'palefire-telescope', x: 1140, y: 390, w: 180, h: 110 },
      { id: 'gallery-supply-chest', x: 390, y: 690, w: 210, h: 90 },
    ],
    anchors: [],
    clickables: [
      {
        id: 'gallery-lamp-prism', curioId: 'lighthouse-gallery-lamp-prism', reaction: 'glimmer',
        x: 720, y: 330, w: 250, h: 220,
        line: 'A loose prism throws a pocket-sized sunrise across the floor.', reactionColor: '#ffe2a1',
      },
      {
        id: 'gallery-pennant-snap', curioId: 'lighthouse-gallery-pennant', reaction: 'wave',
        x: 420, y: 355, w: 220, h: 470,
        line: 'The balcony pennant snaps once toward a wind you cannot feel.', reactionColor: '#ff784f',
      },
      {
        id: 'gallery-rail-crystals', curioId: 'lighthouse-gallery-rail-crystals', reaction: 'chime',
        x: 720, y: 790, w: 240, h: 80,
        line: 'Four rail crystals ring from low to high, like steps made of glass.', reactionColor: '#c8f4ff',
      },
      {
        id: 'balcony-wind-carving', curioId: 'lighthouse-gallery-wind-carving', reaction: 'hum',
        x: 1120, y: 810, w: 180, h: 72, requiresProximity: true,
        line: 'The wind-carved groove hums the same three notes as the loose Court cobble.', reactionColor: '#6fe0b2',
      },
    ],
    npcSpawnAnchors: [],
  },

  // Whisperpine Hollow — a deep forest branch off Frostline Trail. Vesper's one daily placement
  // and the hidden Moonwell door are resolved in content/whisperpine.js without mutating this data.
  whisperpine: {
    id: 'whisperpine',
    title: 'Whisperpine Hollow',
    outdoors: true,
    mapAsset: 'room-whisperpine',
    tile: 16, gridCols: 30, gridRows: 20,
    scale: 3,
    bounds: { x0: 120, x1: 1320, y0: 120, y1: 888 },
    spawnPoints: {
      default:      { x: 220, y: 540, facing: 'right' },
      fromTrail:    { x: 190, y: 540, facing: 'right' },
      fromMoonwell: { x: 720, y: 200, facing: 'down' },
      fromCaverns:  { x: 1290, y: 480, facing: 'left' },
      fromMap:      { x: 720, y: 760, facing: 'up' },
    },
    camera: { leadY: -50 },
    hotspots: [
      { id: 'whisperpine-heart', label: 'The Listening Pines', kind: 'landmark', x: 720, y: 480, lore: 'The pines hear the Echo: aurora light trapped in Hollowfrost crystals.' },
    ],
    doors: [
      { id: 'door-trail', label: 'Frostline Trail', x: 120, y: 540, targetRoom: 'trail', locked: false, targetSpawn: 'fromWhisperpine' },
      {
        id: 'door-moonwell', label: 'A Moonlit Gap', x: 720, y: 120,
        targetRoom: 'moonwell', targetSpawn: 'fromWhisperpine', locked: true, hidden: true,
        lockedCopy: 'Only an unbroken wall of pine shadows stands here.',
      },
      {
        id: 'door-cavern-crack', label: 'Root-bound Crack', x: 1320, y: 480,
        targetRoom: 'caverns', targetSpawn: 'fromWhisperpine', locked: true,
        lockedCopy: 'A cold note breathes through the stone, but the roots refuse to part.',
      },
    ],
    solids: [
      { id: 'root-den-bank', x: 330, y: 255, w: 260, h: 150 },
      { id: 'owl-den-pines', x: 900, y: 220, w: 220, h: 150 },
      { id: 'heart-pines', x: 720, y: 465, w: 220, h: 180 },
      { id: 'fallen-den-log', x: 1040, y: 650, w: 270, h: 100 },
      { id: 'berry-snowbank', x: 430, y: 790, w: 180, h: 80 },
    ],
    vesperDens: [
      { id: 'root-den', x: 230, y: 290 },
      { id: 'owl-den', x: 1120, y: 190 },
      { id: 'fallen-den', x: 1300, y: 790 },
    ],
    anchors: [],
    wisps: [
      { id: 'wisp-one', x: 720, y: 560, phase: 0.2 },
      { id: 'wisp-two', x: 780, y: 585, phase: 2.3 },
      { id: 'wisp-three', x: 745, y: 625, phase: 4.1 },
    ],
    clickables: [
      {
        id: 'whisperpine-hare', curioId: 'whisperpine-snow-hare', reaction: 'scatter',
        x: 200, y: 540, w: 155, h: 170,
        line: 'Snow slips from the western pine in three white bursts.', reactionColor: '#f7fbff',
      },
      {
        id: 'whisperpine-owl', curioId: 'whisperpine-ice-owl', reaction: 'glimmer',
        x: 1120, y: 195, w: 165, h: 150,
        line: 'The owl den glows. Snow falls from the root that moved second.', reactionColor: '#c8f4ff',
      },
      {
        id: 'whisperpine-icicle', curioId: 'whisperpine-icicle-drop', reaction: 'snow',
        x: 450, y: 190, w: 155, h: 140,
        line: 'One snowy bough shakes upward and leaves no gap behind.', reactionColor: '#7fd6ff',
      },
      {
        id: 'whisperpine-echo-log', curioId: 'whisperpine-echo-log', reaction: 'hum',
        x: 1220, y: 520, w: 200, h: 190,
        lines: [
          'The hollow stump repeats your tap in three notes.',
          'On the second tap, a fourth note answers from under the roots.',
        ],
        reactionColor: '#6fe0b2',
      },
      {
        id: 'whisperpine-berries', curioId: 'whisperpine-frozen-berries', reaction: 'rattle',
        x: 430, y: 790, w: 160, h: 90,
        line: 'The frozen berries rattle from blue to violet without leaving their stems.', reactionColor: '#a78bfa',
      },
      {
        id: 'whisperpine-wisps', curioId: 'whisperpine-will-o-glow', reaction: 'wave',
        x: 750, y: 590, w: 190, h: 150,
        line: 'The will-o-glows dodge your hand, then arrange themselves into a tiny fox grin.', reactionColor: '#6fe0b2',
      },
    ],
    npcSpawnAnchors: [],
  },

  // Moonwell Clearing never appears on the island map. Its only way in is the save-gated gap in
  // Whisperpine, and its only resident is the moon's reflection.
  moonwell: {
    id: 'moonwell',
    title: 'Moonwell Clearing',
    outdoors: true,
    mapAsset: 'room-moonwell',
    tile: 16, gridCols: 30, gridRows: 20,
    scale: 3,
    bounds: { x0: 180, x1: 1260, y0: 150, y1: 850 },
    spawnPoints: {
      default:         { x: 720, y: 770, facing: 'up' },
      fromWhisperpine: { x: 720, y: 800, facing: 'up' },
    },
    camera: { leadY: -50 },
    hotspots: [
      { id: 'moonwell-floor', label: 'The Still Pool', kind: 'landmark', x: 720, y: 450, lore: 'Aurora light waits in the pool as if the Hollowfrost crystals were looking up.' },
      { id: 'moonwell-bench', label: null, kind: 'sit', x: 350, y: 650 },
    ],
    doors: [
      { id: 'door-whisperpine', label: 'Whisperpine Hollow', x: 720, y: 850, targetRoom: 'whisperpine', locked: false, targetSpawn: 'fromMoonwell' },
    ],
    solids: [
      { id: 'moonwell-pool', x: 720, y: 450, w: 420, h: 250 },
      { id: 'moonwell-bench', x: 350, y: 650, w: 200, h: 70 },
    ],
    anchors: [],
    clickables: [
      {
        id: 'moonwell-reflection', curioId: 'moonwell-reflection', reaction: 'glimmer',
        x: 600, y: 400, w: 750, h: 400,
        line: 'Your reflection looks up a heartbeat before you look down.', reactionColor: '#c8f4ff',
      },
    ],
    npcSpawnAnchors: [],
  },

  // Hollowfrost Caverns — W6 capstone reached through both previously foreshadowed entrances.
  caverns: {
    id: 'caverns',
    avatarScale: 8,
    title: 'Hollowfrost Caverns',
    mapAsset: 'room-caverns',
    tile: 16, gridCols: 30, gridRows: 20,
    scale: 3,
    bounds: { x0: 120, x1: 1320, y0: 120, y1: 888 },
    spawnPoints: {
      default:         { x: 330, y: 525, facing: 'right' },
      fromWorkshop:    { x: 330, y: 525, facing: 'right' },
      fromWhisperpine: { x: 1290, y: 480, facing: 'left' },
    },
    camera: { leadY: -50 },
    hotspots: [
      {
        id: 'echo-resonance', label: 'A Returning Note', kind: 'echo', x: 720, y: 510,
        prompt: 'Listen for The Echo',
      },
    ],
    doors: [
      {
        id: 'door-workshop-lift', label: "Pat's Dumbwaiter", x: 270, y: 500,
        targetRoom: 'workshop', targetSpawn: 'fromCaverns', locked: false,
      },
      {
        id: 'door-whisperpine-crack', label: 'Whisperpine Root-Crack', x: 1320, y: 480,
        targetRoom: 'whisperpine', targetSpawn: 'fromCaverns', locked: false,
      },
    ],
    solids: [
      { id: 'crystal-pillar-west', x: 270, y: 390, w: 180, h: 220 },
      { id: 'crystal-arch-north', x: 720, y: 260, w: 220, h: 160 },
      { id: 'crystal-pillar-east', x: 1080, y: 330, w: 180, h: 260 },
      { id: 'underisle-pool', x: 720, y: 760, w: 420, h: 170 },
      { id: 'crystal-bank-southwest', x: 300, y: 730, w: 170, h: 160 },
    ],
    anchors: [],
    clickables: [
      {
        id: 'echo-shard-root', curioId: 'caverns-echo-shard-root', reaction: 'chime',
        x: 270, y: 390, w: 140, h: 180,
        line: 'A root-held shard answers low. Somewhere unseen, the note returns warm.', reactionColor: '#72e2bd',
      },
      {
        id: 'echo-shard-arch', curioId: 'caverns-echo-shard-arch', reaction: 'chime',
        x: 720, y: 260, w: 180, h: 130,
        line: 'The arch rings from both ends at once. The Echo supplies the middle note.', reactionColor: '#c8f4ff',
      },
      {
        id: 'echo-shard-prism', curioId: 'caverns-echo-shard-prism', reaction: 'chime',
        x: 1080, y: 330, w: 150, h: 200,
        line: 'One clear tap splits into violet, blue, and green voices.', reactionColor: '#a78bfa',
      },
      {
        id: 'echo-shard-bridge', curioId: 'caverns-echo-shard-bridge', reaction: 'chime',
        x: 910, y: 575, w: 130, h: 100,
        line: 'The bridge shard sings toward both entrances. Both answer.', reactionColor: '#7fd6ff',
      },
      {
        id: 'echo-shard-pool', curioId: 'caverns-echo-shard-pool', reaction: 'chime',
        x: 600, y: 760, w: 450, h: 200,
        line: 'The pool keeps the note below its surface, then gives it back brighter.', reactionColor: '#72e2bd',
      },
      {
        id: 'echo-shard-threshold', curioId: 'caverns-echo-shard-threshold', reaction: 'chime',
        x: 405, y: 570, w: 130, h: 110,
        line: 'This shard remembers the hatch and the roots as parts of one doorway.', reactionColor: '#ffe2a1',
      },
    ],
    npcSpawnAnchors: [],
  },
};
