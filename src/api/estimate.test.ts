import { describe, it, expect } from 'vitest';
import { deriveSupplement, type MonthMinutes } from './estimate.ts';

function profile(minutesByMonth: Array<number | null>): MonthMinutes[] {
  return minutesByMonth.map((minutes, i) => ({ month: i + 1, minutes }));
}

describe('deriveSupplement', () => {
  it('returns no months when every month is under the threshold', () => {
    const result = deriveSupplement(profile(Array(12).fill(30)));

    expect(result.months).toEqual([]);
    expect(result.label).toBeNull();
  });

  it('flags months over 120 minutes', () => {
    const minutes = Array(12).fill(30);
    minutes[0] = 200; // Jan
    minutes[11] = 150; // Dec

    const result = deriveSupplement(profile(minutes));

    expect(result.months).toEqual([1, 12]);
    expect(result.label).toBe('Dec–Jan');
  });

  it('flags impossible (null) months', () => {
    const minutes: Array<number | null> = Array(12).fill(30);
    minutes[5] = null; // June

    const result = deriveSupplement(profile(minutes));

    expect(result.months).toEqual([6]);
    expect(result.label).toBe('June');
  });

  it('labels a contiguous winter range crossing the year boundary', () => {
    const minutes = Array(12).fill(30);
    [10, 11, 12, 1, 2].forEach((m) => {
      minutes[m - 1] = 300;
    });

    const result = deriveSupplement(profile(minutes));

    expect(result.months).toEqual([1, 2, 10, 11, 12]);
    expect(result.label).toBe('Oct–Feb');
  });

  it('labels all twelve months as the whole year', () => {
    const result = deriveSupplement(profile(Array(12).fill(500)));

    expect(result.months).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(result.label).toBe('the whole year');
  });
});
