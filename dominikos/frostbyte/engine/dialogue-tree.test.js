import { describe, expect, it } from 'vitest';
import {
  advanceDialogue,
  choiceAvailable,
  chooseDialogue,
  currentDialoguePage,
  dailyLine,
  resolveDialogueNode,
  startDialogue,
  validateDialogueTree,
} from './dialogue-tree.js';

const TREE = {
  id: 'fixture-tree',
  start: 'hello',
  nodes: {
    hello: {
      pages: [
        { daily: ['Clear skies.', 'Snow incoming.', 'The wind changed.'], salt: 'weather' },
        'What brings you here?',
      ],
      choices: [
        {
          id: 'accept', label: 'I can help.', next: 'task',
          when: { favorId: 'fixture-favor', status: 'offered' },
          effects: [{ type: 'favor-start', favorId: 'fixture-favor' }],
        },
        { id: 'leave', label: 'Not now.', next: null },
      ],
    },
    task: { pages: ['Bring back the brass cog.'] },
  },
};

describe('dailyLine', () => {
  it('is stable for the same date and salt and stays inside the supplied pool', () => {
    const pool = ['a', 'b', 'c'];
    const a = dailyLine(pool, '2026-07-22', 'greeting');
    expect(a).toBe(dailyLine(pool, '2026-07-22', 'greeting'));
    expect(pool).toContain(a);
  });

  it('rotates across a bounded run of dates', () => {
    const seen = new Set(Array.from({ length: 12 }, (_, i) =>
      dailyLine(['a', 'b', 'c'], `2026-08-${String(i + 1).padStart(2, '0')}`, 'greeting')));
    expect(seen.size).toBeGreaterThan(1);
  });
});

describe('favor hooks', () => {
  it('filters choices against favor state', () => {
    const choice = TREE.nodes.hello.choices[0];
    expect(choiceAvailable(choice, { 'fixture-favor': { status: 'offered' } })).toBe(true);
    expect(choiceAvailable(choice, { 'fixture-favor': { status: 'done' } })).toBe(false);
  });

  it('returns declared effects without mutating favor state', () => {
    const favors = { 'fixture-favor': { status: 'offered' } };
    let session = startDialogue(TREE, { todayKey: '2026-07-22', favors });
    session = advanceDialogue(session);
    const result = chooseDialogue(TREE, session, 'accept', { todayKey: '2026-07-22', favors });
    expect(result.effects).toEqual([{ type: 'favor-start', favorId: 'fixture-favor' }]);
    expect(result.session.nodeId).toBe('task');
    expect(favors['fixture-favor'].status).toBe('offered');
  });
});

describe('dialogue sessions', () => {
  it('resolves pages, advances, and closes a choice-less final node', () => {
    const context = { todayKey: '2026-07-22', favors: {} };
    const resolved = resolveDialogueNode(TREE, 'hello', context);
    expect(resolved.pages).toHaveLength(2);
    expect(resolved.choices.map((choice) => choice.id)).toEqual(['leave']);

    let session = startDialogue(TREE, context);
    expect(currentDialoguePage(session)).toBe(resolved.pages[0]);
    session = advanceDialogue(session);
    expect(currentDialoguePage(session)).toBe('What brings you here?');
    const exit = chooseDialogue(TREE, session, 'leave', context);
    expect(exit.session.complete).toBe(true);
  });

  it('rejects hidden, unknown, and premature choices', () => {
    const context = { todayKey: '2026-07-22', favors: {} };
    let session = startDialogue(TREE, context);
    expect(chooseDialogue(TREE, session, 'leave', context)).toBe(null);
    session = advanceDialogue(session);
    expect(chooseDialogue(TREE, session, 'accept', context)).toBe(null);
    expect(chooseDialogue(TREE, session, 'missing', context)).toBe(null);
  });
});

describe('validateDialogueTree', () => {
  it('accepts the fixture and reports broken links and over-wide choice sets', () => {
    expect(validateDialogueTree(TREE)).toEqual([]);
    const broken = {
      id: 'broken', start: 'a',
      nodes: { a: { pages: ['x'], choices: [1, 2, 3, 4].map((n) => ({ id: `c${n}`, label: 'x', next: 'missing' })) } },
    };
    expect(validateDialogueTree(broken)).toContain('a has more than 3 choices');
    expect(validateDialogueTree(broken).some((error) => error.includes('missing node'))).toBe(true);
  });
});
