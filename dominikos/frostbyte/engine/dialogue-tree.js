// engine/dialogue-tree.js — PURE branching dialogue state (World Plan W0).
// No DOM and no wall clock: callers inject a YYYY-MM-DD `todayKey`. Favor integration stays
// declarative through `when` conditions and returned `effects`, so this module never reaches into
// save or the favor engine itself.

function hashString(value) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** Deterministically picks one line for a date + pool salt. */
export function dailyLine(lines, todayKey, salt = '') {
  if (!Array.isArray(lines) || lines.length === 0) return '';
  const index = hashString(`${todayKey ?? ''}|${salt}`) % lines.length;
  return lines[index];
}

function favorStatus(favors, favorId) {
  return favors?.[favorId]?.status ?? null;
}

/** A choice is visible only when every declared favor condition matches. */
export function choiceAvailable(choice, favors = {}) {
  const conditions = choice?.when == null
    ? []
    : (Array.isArray(choice.when) ? choice.when : [choice.when]);

  return conditions.every((condition) => {
    if (!condition || typeof condition.favorId !== 'string') return false;
    const actual = favorStatus(favors, condition.favorId);
    const allowed = Array.isArray(condition.status) ? condition.status : [condition.status];
    return condition.not === true ? !allowed.includes(actual) : allowed.includes(actual);
  });
}

function resolvePage(page, todayKey, salt) {
  if (typeof page === 'string') return page;
  if (page && Array.isArray(page.daily)) return dailyLine(page.daily, todayKey, page.salt ?? salt);
  return '';
}

/** Resolve daily pages and favor-gated choices for one node. */
export function resolveDialogueNode(tree, nodeId, context = {}) {
  const node = tree?.nodes?.[nodeId];
  if (!node) return null;
  const pages = (node.pages ?? []).map((page, index) =>
    resolvePage(page, context.todayKey, `${tree.id}:${nodeId}:${index}`));
  const choices = (node.choices ?? [])
    .filter((choice) => choiceAvailable(choice, context.favors))
    .slice(0, 3)
    .map((choice) => ({ ...choice, effects: [...(choice.effects ?? [])] }));
  return { id: nodeId, pages, choices };
}

/** Start a dialogue session at the tree's start node (or an explicitly supplied node). */
export function startDialogue(tree, context = {}, nodeId = tree?.start) {
  const node = resolveDialogueNode(tree, nodeId, context);
  if (!node) return null;
  return {
    treeId: tree.id,
    nodeId,
    pageIndex: 0,
    pages: node.pages,
    choices: node.choices,
    complete: node.pages.length === 0 && node.choices.length === 0,
  };
}

export function currentDialoguePage(session) {
  if (!session || session.complete) return null;
  return session.pages[session.pageIndex] ?? null;
}

/** Advance one page. At the final page, a choice-less node closes. */
export function advanceDialogue(session) {
  if (!session || session.complete) return session;
  if (session.pageIndex < session.pages.length - 1) {
    return { ...session, pageIndex: session.pageIndex + 1 };
  }
  if (session.choices.length === 0) return { ...session, complete: true };
  return session;
}

/** Follow a visible choice and return its declarative effects for the integrator to apply. */
export function chooseDialogue(tree, session, choiceId, context = {}) {
  if (!session || session.complete || session.pageIndex < session.pages.length - 1) return null;
  const resolved = resolveDialogueNode(tree, session.nodeId, context);
  const choice = resolved?.choices.find((entry) => entry.id === choiceId);
  if (!choice) return null;

  const effects = [...(choice.effects ?? [])];
  if (!choice.next) return { session: { ...session, complete: true }, effects };
  const next = startDialogue(tree, context, choice.next);
  return next ? { session: next, effects } : null;
}

/** Returns human-readable schema errors without throwing. */
export function validateDialogueTree(tree) {
  const errors = [];
  if (!tree || typeof tree !== 'object') return ['tree must be an object'];
  if (!tree.id || typeof tree.id !== 'string') errors.push('tree.id must be a non-empty string');
  if (!tree.nodes || typeof tree.nodes !== 'object' || Array.isArray(tree.nodes)) {
    errors.push('tree.nodes must be an object');
    return errors;
  }
  if (!tree.start || !tree.nodes[tree.start]) errors.push(`start node "${tree.start ?? ''}" does not exist`);

  for (const [nodeId, node] of Object.entries(tree.nodes)) {
    if (!Array.isArray(node.pages) || node.pages.length === 0) errors.push(`${nodeId}.pages must not be empty`);
    for (const [pageIndex, page] of (node.pages ?? []).entries()) {
      const valid = typeof page === 'string' || (page && Array.isArray(page.daily) && page.daily.length > 0);
      if (!valid) errors.push(`${nodeId}.pages[${pageIndex}] must be text or a non-empty daily pool`);
    }
    if ((node.choices ?? []).length > 3) errors.push(`${nodeId} has more than 3 choices`);
    const choiceIds = new Set();
    for (const choice of node.choices ?? []) {
      if (!choice.id || choiceIds.has(choice.id)) errors.push(`${nodeId} has an invalid or duplicate choice id`);
      choiceIds.add(choice.id);
      if (!choice.label) errors.push(`${nodeId}.${choice.id ?? '?'} is missing a label`);
      if (choice.next && !tree.nodes[choice.next]) errors.push(`${nodeId}.${choice.id ?? '?'} points to missing node ${choice.next}`);
    }
  }
  return errors;
}
