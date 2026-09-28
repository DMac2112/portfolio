// Fixed Bell Rhythm charts and timing rules. All times are caller-supplied milliseconds.
export const PHRASES = [
  { bpm: 84, lanes: [0, 1, 2, 1, 0, 0, 2, 1, 2, 0, 1, 2, 1, 0] },
  { bpm: 96, lanes: [0, 2, 1, 0, 1, 2, 2, 1, 0, 2, 0, 1, 2, 1] },
  { bpm: 108, lanes: [2, 1, 0, 2, 0, 1, 2, 0, 0, 1, 2, 0, 1, 2] },
];

export const TRUE_MS = 80;
export const NEAR_MS = 150;
export const MOTIF_NOTES = 6;

export function noteTimes(phrase) {
  return phrase.lanes.map((_, index) => Math.round(index * 60000 / phrase.bpm));
}

let phraseStart = 1000;
export const CHART = PHRASES.flatMap((phrase, phraseIndex) => {
  const times = noteTimes(phrase);
  const notes = phrase.lanes.map((lane, index) => ({
    lane, timeMs: phraseStart + times[index], phrase: phraseIndex,
    motif: phraseIndex === 2 && index >= phrase.lanes.length - MOTIF_NOTES,
  }));
  phraseStart += times[times.length - 1] + 1600;
  return notes;
});

export function judge(chart, laneHits) {
  const judged = chart.map((note) => ({ ...note, grade: 'miss', hitIndex: -1 }));
  laneHits.forEach((hit, hitIndex) => {
    let best = -1;
    let bestDelta = NEAR_MS + 1;
    judged.forEach((note, index) => {
      const delta = Math.abs(hit.timeMs - note.timeMs);
      if (note.lane === hit.lane && note.hitIndex < 0 && delta <= NEAR_MS && delta < bestDelta) {
        best = index;
        bestDelta = delta;
      }
    });
    if (best >= 0) {
      judged[best].grade = bestDelta <= TRUE_MS ? 'true' : 'near';
      judged[best].hitIndex = hitIndex;
    }
  });
  return judged;
}

export function scoreOf(judged) {
  const points = judged.reduce((total, note) => total + (note.grade === 'true' ? 1 : note.grade === 'near' ? 0.5 : 0), 0);
  return Math.min(24, Math.round(points));
}

export function resultOf(judged) {
  const hit = (note) => note.grade === 'true' || note.grade === 'near';
  const motif = judged.filter((note) => note.motif);
  return {
    won: judged.length > 0 && judged.filter(hit).length / judged.length >= 0.7
      && motif.length === MOTIF_NOTES && motif.every(hit),
    coinsEarned: scoreOf(judged),
  };
}
