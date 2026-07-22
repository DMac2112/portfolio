// content/favors.js — cross-room Favor definitions. W1 seeds Edda's story-tip threads; W2 makes
// the Workshop tip completable and adds Pat's three-part Weather Bell chain. Docks hooks remain
// deliberately unavailable until W3.

function freezeFavor(definition) {
  return Object.freeze({
    ...definition,
    requires: Object.freeze([...(definition.requires ?? [])]),
    steps: Object.freeze(definition.steps.map((step) => Object.freeze({ ...step }))),
    reward: Object.freeze({ ...definition.reward }),
  });
}

export const EDDA_STORY_TIP_FAVORS = Object.freeze([
  freezeFavor({
    id: 'edda-tip-trail-glint',
    ownerId: 'edda-quill',
    title: 'A Light on the Trail',
    steps: [
      { id: 'witness-trail-glint', label: 'Witness a glint on Frostline Trail' },
      { id: 'report-to-edda', label: 'Report the sighting to Edda' },
    ],
    reward: { coins: 8 },
  }),
  freezeFavor({
    id: 'edda-tip-workshop-test',
    ownerId: 'edda-quill',
    title: 'A Bell Before the Weather',
    steps: [
      { id: 'witness-workshop-test', label: 'Witness the Workshop test-firing' },
      { id: 'report-to-edda', label: 'Report the test to Edda' },
    ],
    reward: { coins: 12 },
  }),
  freezeFavor({
    id: 'edda-tip-barge-arrival',
    ownerId: 'edda-quill',
    title: 'Barge at the Breakwater',
    steps: [
      { id: 'witness-barge-in-port', label: 'See the trader barge in port' },
      { id: 'report-to-edda', label: 'Report the arrival to Edda' },
    ],
    reward: { coins: 12 },
  }),
]);

export const WEATHER_BELL_FAVOR = freezeFavor({
  id: 'pat-weather-bell-parts',
  ownerId: 'pat-hocket',
  title: 'Three Notes Missing',
  steps: [
    { id: 'recover-court-coil', label: 'Recover the resonator coil in Glasswind Court' },
    { id: 'recover-trail-vane', label: 'Recover the wind vane on Frostline Trail' },
    { id: 'recover-docks-clapper', label: 'Recover the brass clapper at Driftgate Docks' },
    { id: 'return-to-pat', label: 'Bring all three Weather Bell parts to Pat' },
  ],
  reward: { coins: 24 },
});

export const FAVOR_DEFINITIONS = Object.freeze([
  ...EDDA_STORY_TIP_FAVORS,
  WEATHER_BELL_FAVOR,
]);

export function favorById(id) {
  return FAVOR_DEFINITIONS.find((favor) => favor.id === id) ?? null;
}
