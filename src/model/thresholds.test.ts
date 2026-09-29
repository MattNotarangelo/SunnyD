import { describe, it, expect } from 'vitest';
import { isAchievable, needsSupplement, MAX_ACHIEVABLE_MINUTES, SUPPLEMENT_MINUTES } from './thresholds.ts';

describe('thresholds', () => {
  it('orders the supplement threshold below the achievable limit', () => {
    expect(SUPPLEMENT_MINUTES).toBeLessThan(MAX_ACHIEVABLE_MINUTES);
  });

  it('treats null, infinite and over-limit minutes as not achievable', () => {
    expect(isAchievable(null)).toBe(false);
    expect(isAchievable(Infinity)).toBe(false);
    expect(isAchievable(MAX_ACHIEVABLE_MINUTES + 0.1)).toBe(false);
    expect(isAchievable(MAX_ACHIEVABLE_MINUTES)).toBe(true);
    expect(isAchievable(5)).toBe(true);
  });

  it('flags supplement months above the threshold and when not achievable', () => {
    expect(needsSupplement(SUPPLEMENT_MINUTES)).toBe(false);
    expect(needsSupplement(SUPPLEMENT_MINUTES + 1)).toBe(true);
    expect(needsSupplement(null)).toBe(true);
    expect(needsSupplement(1000)).toBe(true);
  });
});
