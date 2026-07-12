// Room registry — DATA, not code (Engine & World Architecture §3, World & Room Design).
// Only 'plaza' ships in the vignette; expansion rooms are added here later as data only.
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
      { id: 'door-trail', label: 'Frostline Trail', x: 720, y: 96, targetRoom: 'trail', locked: true, lockedCopy: "The trail's still snowed in — check back soon." },
      { id: 'door-court', label: 'Glasswind Court', x: 1368, y: 456, targetRoom: 'court', locked: true, lockedCopy: "They're still smoothing the ice out there." },
      { id: 'door-workshop', label: 'Emberlight Workshop', x: 72, y: 360, targetRoom: 'workshop', locked: true, lockedCopy: "The workshop lamps aren't lit yet." },
      { id: 'door-den', label: 'Your Den', x: 720, y: 936, targetRoom: 'den', locked: true, lockedCopy: 'Your den is still being built. Hang tight!' },
    ],
    // Rendered + collidable in the S1 spike: fountain/pond only (what room-plaza.png actually paints).
    // Bench/shop/minigame/noticeboard solids land once their art does (P2-P4), to avoid invisible walls.
    solids: [
      { id: 'fountain-driftback', x: 792, y: 264, w: 220, h: 160 },
    ],
    // Populated in P3 (NPC crowd) — empty for the S1 waddle spike.
    npcSpawnAnchors: [],
  },
};
