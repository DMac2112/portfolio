import { describe, it, expect } from 'vitest';
import { CHART, PHRASES, noteTimes, judge, scoreOf, resultOf } from './minigame-bell.js';

const perfect = CHART.map((note) => ({ lane: note.lane, timeMs: note.timeMs }));

describe('Bell Rhythm', () => {
  it('uses fixed accelerating phrases and the repeated low-middle-high ending', () => {
    expect(PHRASES.map((phrase) => phrase.bpm)).toEqual([84, 96, 108]);
    expect(PHRASES.map((phrase) => noteTimes(phrase).length)).toEqual([14, 14, 14]);
    expect(CHART.slice(-6).map((note) => note.lane)).toEqual([0, 1, 2, 0, 1, 2]);
  });
  it('judges both timing windows and misses outside them', () => {
    const note = [CHART[0]];
    expect(judge(note, [{ lane: 0, timeMs: note[0].timeMs + 80 }])[0].grade).toBe('true');
    expect(judge(note, [{ lane: 0, timeMs: note[0].timeMs - 150 }])[0].grade).toBe('near');
    expect(judge(note, [{ lane: 0, timeMs: note[0].timeMs + 151 }])[0].grade).toBe('miss');
    expect(judge(note, [{ lane: 1, timeMs: note[0].timeMs }])[0].grade).toBe('miss');
  });
  it('wins a perfect run and caps its coins at 24', () => {
    const judged = judge(CHART, perfect);
    expect(scoreOf(judged)).toBe(24);
    expect(resultOf(judged)).toEqual({ won: true, coinsEarned: 24 });
  });
  it('loses if any final motif note is missed despite high accuracy', () => {
    const judged = judge(CHART, perfect.slice(0, -1));
    expect(resultOf(judged).won).toBe(false);
  });
});
