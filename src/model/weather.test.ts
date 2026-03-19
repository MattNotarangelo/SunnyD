import { describe, it, expect } from 'vitest';
import { weatherExposure } from './weather.ts';

describe('weatherExposure', () => {
  const COLD = 0.05;
  const WARM = 0.25;

  it('returns COLD at T_MIN (0 C)', () => {
    const result = weatherExposure(0);

    expect(result).toBeCloseTo(COLD, 10);
  });

  it('returns WARM at T_MAX (25 C)', () => {
    const result = weatherExposure(25);

    expect(result).toBeCloseTo(WARM, 10);
  });

  it('returns COLD for temperatures below T_MIN', () => {
    expect(weatherExposure(-10)).toBeCloseTo(COLD, 10);
    expect(weatherExposure(-50)).toBeCloseTo(COLD, 10);
  });

  it('returns WARM for temperatures above T_MAX', () => {
    expect(weatherExposure(30)).toBeCloseTo(WARM, 10);
    expect(weatherExposure(50)).toBeCloseTo(WARM, 10);
  });

  it('returns a value between COLD and WARM at midpoint (12.5 C)', () => {
    const result = weatherExposure(12.5);

    expect(result).toBeGreaterThan(COLD);
    expect(result).toBeLessThan(WARM);
  });

  it('midpoint value is exactly halfway due to smoothstep symmetry', () => {
    // smoothstep(0.5) = 0.5 * 0.5 * (3 - 2 * 0.5) = 0.5
    // So at midpoint: COLD + (WARM - COLD) * 0.5 = 0.05 + 0.20 * 0.5 = 0.15
    const result = weatherExposure(12.5);

    expect(result).toBeCloseTo(0.15, 10);
  });

  it('is monotonically increasing between T_MIN and T_MAX', () => {
    let prev = weatherExposure(0);
    for (let t = 1; t <= 25; t++) {
      const current = weatherExposure(t);
      expect(current).toBeGreaterThanOrEqual(prev);
      prev = current;
    }
  });

  it('always returns a value within [COLD, WARM]', () => {
    const temps = [-100, -50, -10, 0, 5, 12.5, 20, 25, 30, 50, 100];
    for (const t of temps) {
      const result = weatherExposure(t);
      expect(result).toBeGreaterThanOrEqual(COLD - 1e-10);
      expect(result).toBeLessThanOrEqual(WARM + 1e-10);
    }
  });

  it('has the correct smoothstep shape at 25% of range (6.25 C)', () => {
    // t = 0.25, smoothstep(0.25) = 0.25^2 * (3 - 0.5) = 0.0625 * 2.5 = 0.15625
    // exposure = 0.05 + 0.20 * 0.15625 = 0.08125
    const result = weatherExposure(6.25);

    expect(result).toBeCloseTo(0.08125, 10);
  });

  it('has the correct smoothstep shape at 75% of range (18.75 C)', () => {
    // t = 0.75, smoothstep(0.75) = 0.75^2 * (3 - 1.5) = 0.5625 * 1.5 = 0.84375
    // exposure = 0.05 + 0.20 * 0.84375 = 0.21875
    const result = weatherExposure(18.75);

    expect(result).toBeCloseTo(0.21875, 10);
  });
});
