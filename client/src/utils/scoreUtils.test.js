import { describe, it, expect } from 'vitest';
import {
  getScoreTier,
  getScoreColor,
  getScoreClassName,
  getDifficultyBadgeClass,
} from '../utils/scoreUtils';

describe('getScoreTier', () => {
  it('classifies scores >= 75 as high', () => {
    expect(getScoreTier(75)).toBe('high');
    expect(getScoreTier(100)).toBe('high');
  });

  it('classifies scores between 50 and 74 as medium', () => {
    expect(getScoreTier(50)).toBe('medium');
    expect(getScoreTier(74)).toBe('medium');
  });

  it('classifies scores below 50 as low', () => {
    expect(getScoreTier(0)).toBe('low');
    expect(getScoreTier(49)).toBe('low');
  });
});

describe('getScoreClassName', () => {
  it('prefixes the tier with "score-"', () => {
    expect(getScoreClassName(90)).toBe('score-high');
    expect(getScoreClassName(60)).toBe('score-medium');
    expect(getScoreClassName(10)).toBe('score-low');
  });
});

describe('getScoreColor', () => {
  it('returns a CSS variable reference for each tier', () => {
    expect(getScoreColor(90)).toBe('var(--success)');
    expect(getScoreColor(60)).toBe('var(--warning)');
    expect(getScoreColor(10)).toBe('var(--danger)');
  });
});

describe('getDifficultyBadgeClass', () => {
  it('maps known difficulties to badge classes', () => {
    expect(getDifficultyBadgeClass('Easy')).toBe('badge-success');
    expect(getDifficultyBadgeClass('Hard')).toBe('badge-danger');
    expect(getDifficultyBadgeClass('Medium')).toBe('badge-warning');
  });

  it('falls back to the medium badge for unknown values', () => {
    expect(getDifficultyBadgeClass('Unknown')).toBe('badge-warning');
  });
});
