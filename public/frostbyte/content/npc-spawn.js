/**
 * @typedef {Object} RoomSpawnConfig
 * @property {{min:number,max:number}} capacity
 * @property {{x:number,y:number}[]} roamPoints
 * @property {{x:number,y:number,label:string}[]} gatherPoints
 * @property {string[]} rosterPoolIds
 * @property {number} maxConcurrentChat
 * @property {{x0:number,x1:number,y0:number,y1:number}} bounds
 */

export const ROOM_SPAWN = {
  plaza: {
    capacity: { min: 4, max: 6 },
    roamPoints: [
      { x: 200, y: 300 }, { x: 200, y: 600 }, { x: 350, y: 800 }, { x: 600, y: 850 },
      { x: 950, y: 800 }, { x: 1200, y: 700 }, { x: 1250, y: 400 }, { x: 1000, y: 250 },
    ],
    gatherPoints: [
      { x: 440, y: 300, label: 'bench-north' },
      { x: 520, y: 660, label: 'bench-south' },
    ],
    rosterPoolIds: ['bramble', 'pip', 'crinkle', 'marzi', 'blot', 'ferro', 'sable', 'dot'],
    maxConcurrentChat: 2,
    bounds: { x0: 72, x1: 1368, y0: 96, y1: 936 },
  },
};
