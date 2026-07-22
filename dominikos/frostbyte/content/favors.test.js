import { describe, expect, it } from 'vitest';
import {
  advanceFavor,
  currentFavorStep,
  offerFavor,
  startFavor,
  validateFavorDefinitions,
} from '../engine/favors.js';
import {
  EDDA_STORY_TIP_FAVORS,
  FAVOR_DEFINITIONS,
  WEATHER_BELL_FAVOR,
  favorById,
} from './favors.js';

describe('story-tip Favor content', () => {
  it('ships three valid, uniquely keyed Edda threads', () => {
    expect(validateFavorDefinitions(FAVOR_DEFINITIONS)).toEqual([]);
    expect(EDDA_STORY_TIP_FAVORS).toHaveLength(3);
    expect(new Set(EDDA_STORY_TIP_FAVORS.map((favor) => favor.id)).size).toBe(3);
    expect(EDDA_STORY_TIP_FAVORS.every((favor) => favor.ownerId === 'edda-quill')).toBe(true);
  });

  it('keeps every delivery as the final step', () => {
    for (const favor of EDDA_STORY_TIP_FAVORS) {
      expect(favor.steps.at(-1).id).toBe('report-to-edda');
      expect(favor.reward.coins).toBeGreaterThan(0);
      expect(favorById(favor.id)).toBe(favor);
    }
  });

  it('completes the shipped Trail loop and pays only after reporting to Edda', () => {
    const save = { coins: 0, favors: {} };
    const trailTip = favorById('edda-tip-trail-glint');
    expect(offerFavor(save, trailTip)).toBe(true);
    expect(startFavor(save, trailTip)).toBe(true);
    expect(advanceFavor(save, trailTip, 'witness-trail-glint')).toBe(true);
    expect(currentFavorStep(save, trailTip).id).toBe('report-to-edda');
    expect(save.coins).toBe(0);
    expect(advanceFavor(save, trailTip, 'report-to-edda')).toBe(true);
    expect(save.coins).toBe(8);
  });

  it('ships Pat’s W3-completable three-part Weather Bell chain', () => {
    const save = { coins: 0, favors: {} };
    expect(WEATHER_BELL_FAVOR.steps.map((step) => step.id)).toEqual([
      'recover-court-coil',
      'recover-trail-vane',
      'recover-docks-clapper',
      'return-to-pat',
    ]);
    expect(favorById(WEATHER_BELL_FAVOR.id)).toBe(WEATHER_BELL_FAVOR);
    expect(offerFavor(save, WEATHER_BELL_FAVOR)).toBe(true);
    expect(startFavor(save, WEATHER_BELL_FAVOR)).toBe(true);
    expect(advanceFavor(save, WEATHER_BELL_FAVOR, 'recover-court-coil')).toBe(true);
    expect(advanceFavor(save, WEATHER_BELL_FAVOR, 'recover-trail-vane')).toBe(true);
    expect(currentFavorStep(save, WEATHER_BELL_FAVOR).id).toBe('recover-docks-clapper');
    expect(save.coins).toBe(0);
    expect(advanceFavor(save, WEATHER_BELL_FAVOR, 'recover-docks-clapper')).toBe(true);
    expect(currentFavorStep(save, WEATHER_BELL_FAVOR).id).toBe('return-to-pat');
    expect(advanceFavor(save, WEATHER_BELL_FAVOR, 'return-to-pat')).toBe(true);
    expect(save.coins).toBe(24);
  });
});
