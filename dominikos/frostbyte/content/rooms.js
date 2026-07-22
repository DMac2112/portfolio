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
      { id: 'door-workshop', label: 'Emberlight Workshop', x: 72, y: 360, targetRoom: 'workshop', locked: true, lockedCopy: "The workshop lamps aren't lit yet." },
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
    ],
    doors: [
      { id: 'door-back', label: 'Chillmere Plaza', x: 72, y: 480, targetRoom: 'plaza', locked: false, targetSpawn: 'fromCourt' },
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
    ],
    npcSpawnAnchors: [],
  },
};
