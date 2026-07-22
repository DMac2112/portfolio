import { describe, expect, it } from 'vitest';
import { CURIO_REGISTRY } from './curios.js';
import { CHIRPER_ISSUES, chirperIssueForDate, chirperWeekKey } from './chirper-issues.js';

describe('weekly Chirper rotation', () => {
  it('uses Monday as the stable weekly boundary', () => {
    expect(chirperWeekKey('2026-07-20')).toBe('2026-07-20');
    expect(chirperWeekKey('2026-07-26')).toBe('2026-07-20');
    expect(chirperWeekKey('2026-07-27')).toBe('2026-07-27');
    expect(chirperIssueForDate('2026-07-20')).toEqual(chirperIssueForDate('2026-07-26'));
  });

  it('rotates through different editions on following weeks', () => {
    const ids = ['2026-07-20', '2026-07-27', '2026-08-03', '2026-08-10']
      .map((date) => chirperIssueForDate(date).id);
    expect(new Set(ids).size).toBe(CHIRPER_ISSUES.length);
  });

  it('ships exactly three tiny articles and one valid discovery hint per edition', () => {
    const validTargets = new Set([...CURIO_REGISTRY.map((curio) => curio.id), 'court-loose-cobble']);
    for (const issue of CHIRPER_ISSUES) {
      expect(issue.articles).toHaveLength(3);
      expect(issue.articles.every((article) => article.title && article.body)).toBe(true);
      expect(validTargets.has(issue.hint.targetId)).toBe(true);
      expect(issue.hint.text).toBeTruthy();
    }
  });

  it('rejects malformed or impossible date keys', () => {
    for (const bad of ['', '2026-7-20', '2026-02-30', null]) {
      expect(chirperIssueForDate(bad)).toBe(null);
    }
  });
});
