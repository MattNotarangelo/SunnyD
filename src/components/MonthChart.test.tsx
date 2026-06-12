import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MonthChart } from './MonthChart.tsx';
import { minutesToColor } from '../model/colorScale.ts';
import type { MonthMinutes } from '../api/estimate.ts';

afterEach(cleanup);

function profile(minutesByMonth: Array<number | null>): MonthMinutes[] {
  return minutesByMonth.map((minutes, i) => ({ month: i + 1, minutes }));
}

describe('MonthChart', () => {
  it('renders one bar per month', () => {
    render(<MonthChart monthly={profile(Array(12).fill(30))} currentMonth={6} />);

    for (let m = 1; m <= 12; m++) {
      expect(screen.getByTestId(`month-bar-${m}`)).toBeTruthy();
    }
  });

  it('marks only the current month as current', () => {
    render(<MonthChart monthly={profile(Array(12).fill(30))} currentMonth={3} />);

    expect(screen.getByTestId('month-bar-3').dataset.current).toBe('true');
    expect(screen.getByTestId('month-bar-4').dataset.current).toBe('false');
  });

  it('flags months over the cap and impossible months as hard', () => {
    const minutes: Array<number | null> = Array(12).fill(30);
    minutes[0] = 500; // Jan: over cap
    minutes[1] = null; // Feb: impossible

    render(<MonthChart monthly={profile(minutes)} currentMonth={6} />);

    expect(screen.getByTestId('month-bar-1').dataset.hard).toBe('true');
    expect(screen.getByTestId('month-bar-2').dataset.hard).toBe('true');
    expect(screen.getByTestId('month-bar-3').dataset.hard).toBe('false');
  });

  it('colors bars with the map color scale', () => {
    const minutes: Array<number | null> = Array(12).fill(30);
    minutes[1] = null;

    render(<MonthChart monthly={profile(minutes)} currentMonth={6} />);

    const [r, g, b] = minutesToColor(30, false, false);
    const bar = screen.getByTestId('month-bar-1').firstElementChild as HTMLElement;
    expect(bar.style.backgroundColor).toBe(`rgb(${r}, ${g}, ${b})`);

    const [dr, dg, db] = minutesToColor(null, true, false);
    const darkBar = screen.getByTestId('month-bar-2').firstElementChild as HTMLElement;
    expect(darkBar.style.backgroundColor).toBe(`rgb(${dr}, ${dg}, ${db})`);
  });

  it('describes each month in the bar title', () => {
    const minutes: Array<number | null> = Array(12).fill(30);
    minutes[1] = null;

    render(<MonthChart monthly={profile(minutes)} currentMonth={6} />);

    expect(screen.getByTestId('month-bar-1').title).toBe('January: 30 min');
    expect(screen.getByTestId('month-bar-2').title).toBe('February: not possible');
  });
});
