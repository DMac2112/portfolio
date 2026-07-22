// content/favors.js — cross-room Favor definitions. W1 ships Edda's three story-tip threads;
// only the Trail thread is currently completable, while Workshop/Docks event hooks arrive with
// their own room phases.

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

export const FAVOR_DEFINITIONS = EDDA_STORY_TIP_FAVORS;

export function favorById(id) {
  return FAVOR_DEFINITIONS.find((favor) => favor.id === id) ?? null;
}
