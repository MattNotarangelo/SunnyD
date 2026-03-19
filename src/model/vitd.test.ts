import { describe, it, expect } from 'vitest';
import { computeMinutes } from './vitd.ts';
import type { VitDResult } from './vitd.ts';

describe('computeMinutes', () => {
  it('returns finite minutes for positive inputs', () => {
    const result: VitDResult = computeMinutes(5000, 1.0, 0.25, 20.2);

    expect(result.isInfinite).toBe(false);
    expect(result.minutes).not.toBeNull();
    expect(result.hDMonth).toBe(5000);
  });

  it('computes the correct known value', () => {
    // kMinutes * kSkin / (hdKj * fCover) = 20.2 * 1.0 / (5 * 0.25) = 16.16
    const result = computeMinutes(5000, 1.0, 0.25, 20.2);

    expect(result.minutes).toBeCloseTo(16.16, 2);
  });

  it('returns isInfinite when hDMonth is zero', () => {
    const result = computeMinutes(0, 1.0, 0.25, 20.2);

    expect(result.isInfinite).toBe(true);
    expect(result.minutes).toBeNull();
  });

  it('returns isInfinite when hDMonth is negative', () => {
    const result = computeMinutes(-100, 1.0, 0.25, 20.2);

    expect(result.isInfinite).toBe(true);
    expect(result.minutes).toBeNull();
  });

  it('returns isInfinite when fCover is zero', () => {
    const result = computeMinutes(5000, 1.0, 0, 20.2);

    expect(result.isInfinite).toBe(true);
    expect(result.minutes).toBeNull();
  });

  it('returns isInfinite when fCover is negative', () => {
    const result = computeMinutes(5000, 1.0, -0.1, 20.2);

    expect(result.isInfinite).toBe(true);
    expect(result.minutes).toBeNull();
  });

  it('scales linearly with kSkin', () => {
    const result1 = computeMinutes(5000, 1.0, 0.25, 20.2);
    const result2 = computeMinutes(5000, 2.0, 0.25, 20.2);

    expect(result2.minutes).toBeCloseTo(result1.minutes! * 2, 6);
  });

  it('scales inversely with hDMonth', () => {
    const result1 = computeMinutes(5000, 1.0, 0.25, 20.2);
    const result2 = computeMinutes(10000, 1.0, 0.25, 20.2);

    expect(result2.minutes).toBeCloseTo(result1.minutes! / 2, 6);
  });

  it('scales inversely with fCover', () => {
    const result1 = computeMinutes(5000, 1.0, 0.25, 20.2);
    const result2 = computeMinutes(5000, 1.0, 0.50, 20.2);

    expect(result2.minutes).toBeCloseTo(result1.minutes! / 2, 6);
  });

  it('preserves hDMonth in the result', () => {
    const result = computeMinutes(12345, 1.0, 0.25, 20.2);

    expect(result.hDMonth).toBe(12345);
  });
});
