import { describe, it, expect, beforeEach } from 'vitest';
import { minutesToColor, legendEntries, minutesToColorPacked, setColorPalette, getColorPalette, getActiveDarkRgb } from './colorScale.ts';

// Reset to default palette before each test to prevent cross-test pollution
beforeEach(() => {
  setColorPalette("default");
});

describe('minutesToColor', () => {
  it('returns transparent for noData', () => {
    const color = minutesToColor(100, false, true);

    expect(color).toEqual([0, 0, 0, 0]);
  });

  it('returns dark red for isInfinite', () => {
    const color = minutesToColor(null, true, false);

    expect(color).toEqual([120, 10, 10, 255]);
  });

  it('returns dark red for null minutes', () => {
    const color = minutesToColor(null, false, false);

    expect(color).toEqual([120, 10, 10, 255]);
  });

  it('returns dark red for minutes exceeding 240', () => {
    const color = minutesToColor(300, false, false);

    expect(color).toEqual([120, 10, 10, 255]);
  });

  it('returns greenish color for 5 minutes (low end)', () => {
    const color = minutesToColor(5, false, false);

    // At 5 minutes, t = (log10(5) - log10(5)) / range = 0, so first stop: forest green
    expect(color).toEqual([34, 139, 34, 255]);
  });

  it('returns reddish color for 240 minutes (high end)', () => {
    const color = minutesToColor(240, false, false);

    // At 240 minutes, t = 1.0, so last stop: [200, 30, 30]
    expect(color).toEqual([200, 30, 30, 255]);
  });

  it('returns a color with full alpha for normal minutes', () => {
    const color = minutesToColor(60, false, false);

    expect(color[3]).toBe(255);
  });

  it('noData takes priority over isInfinite', () => {
    const color = minutesToColor(null, true, true);

    expect(color).toEqual([0, 0, 0, 0]);
  });

  it('returns yellowish/gold for mid-range minutes', () => {
    // At t=0.5, the stop is gold [255, 215, 0].
    // t = (log10(m) - log10(5)) / (log10(240) - log10(5)) = 0.5
    // log10(m) = log10(5) + 0.5 * (log10(240) - log10(5))
    const logMid = Math.log10(5) + 0.5 * (Math.log10(240) - Math.log10(5));
    const midMinutes = Math.pow(10, logMid);
    const color = minutesToColor(midMinutes, false, false);

    expect(color).toEqual([255, 215, 0, 255]);
  });
});

describe('legendEntries', () => {
  it('returns the requested number of entries', () => {
    const entries = legendEntries(5);

    expect(entries).toHaveLength(5);
  });

  it('returns correct number of entries for various sizes', () => {
    expect(legendEntries(3)).toHaveLength(3);
    expect(legendEntries(10)).toHaveLength(10);
  });

  it('first entry has minutes close to 5', () => {
    const entries = legendEntries(5);

    expect(entries[0].minutes).toBeCloseTo(5, 0);
  });

  it('last entry has minutes close to 240', () => {
    const entries = legendEntries(5);

    expect(entries[entries.length - 1].minutes).toBeCloseTo(240, 0);
  });

  it('entries are in ascending order of minutes', () => {
    const entries = legendEntries(10);

    for (let i = 1; i < entries.length; i++) {
      expect(entries[i].minutes).toBeGreaterThan(entries[i - 1].minutes);
    }
  });

  it('each entry has an rgb(...) color string', () => {
    const entries = legendEntries(5);

    for (const entry of entries) {
      expect(entry.color).toMatch(/^rgb\(\d+,\d+,\d+\)$/);
    }
  });

  it('first entry color corresponds to forest green', () => {
    const entries = legendEntries(5);

    // t=0 maps to first stop: [34, 139, 34]
    expect(entries[0].color).toBe('rgb(34,139,34)');
  });

  it('last entry color corresponds to red', () => {
    const entries = legendEntries(5);

    // t=1 maps to last stop: [200, 30, 30]
    expect(entries[entries.length - 1].color).toBe('rgb(200,30,30)');
  });
});

describe('minutesToColorPacked', () => {
  it('returns transparent packed value for noData', () => {
    const packed = minutesToColorPacked(100, false, true);

    // Transparent: packRGBA(0, 0, 0, 0) = 0
    expect(packed).toBe(0);
  });

  it('returns dark red packed value for isInfinite', () => {
    const packed = minutesToColorPacked(100, true, false);

    // DARK_RED: [120, 10, 10, 255]
    // packRGBA(120, 10, 10, 255) = 120 | (10 << 8) | (10 << 16) | (255 << 24)
    const expected = 120 | (10 << 8) | (10 << 16) | (255 << 24);
    expect(packed).toBe(expected);
  });

  it('returns dark red for minutes exceeding MAX_MINUTES', () => {
    const packed = minutesToColorPacked(300, false, false);
    const darkRedPacked = 120 | (10 << 8) | (10 << 16) | (255 << 24);

    expect(packed).toBe(darkRedPacked);
  });

  it('returns a non-zero packed value for normal minutes', () => {
    const packed = minutesToColorPacked(60, false, false);

    expect(packed).not.toBe(0);
  });

  it('noData takes priority over isInfinite in packed version', () => {
    const packed = minutesToColorPacked(100, true, true);

    expect(packed).toBe(0);
  });

  it('returns consistent values for same input', () => {
    const a = minutesToColorPacked(120, false, false);
    const b = minutesToColorPacked(120, false, false);

    expect(a).toBe(b);
  });
});

describe('setColorPalette / getColorPalette', () => {
  it('defaults to "default" palette', () => {
    expect(getColorPalette()).toBe("default");
  });

  it('switches to colorblind palette', () => {
    setColorPalette("colorblind");

    expect(getColorPalette()).toBe("colorblind");
  });

  it('switches back to default palette', () => {
    setColorPalette("colorblind");
    setColorPalette("default");

    expect(getColorPalette()).toBe("default");
  });
});

describe('getActiveDarkRgb', () => {
  it('returns dark red rgb string for default palette', () => {
    expect(getActiveDarkRgb()).toBe("rgb(120,10,10)");
  });

  it('returns dark purple rgb string for colorblind palette', () => {
    setColorPalette("colorblind");

    expect(getActiveDarkRgb()).toBe("rgb(30,0,50)");
  });
});

describe('colorblind palette', () => {
  it('minutesToColor returns yellow for 5 min (low end)', () => {
    setColorPalette("colorblind");
    const color = minutesToColor(5, false, false);

    // First colorblind stop: yellow [253, 231, 37]
    expect(color).toEqual([253, 231, 37, 255]);
  });

  it('minutesToColor returns dark purple for 240 min (high end)', () => {
    setColorPalette("colorblind");
    const color = minutesToColor(240, false, false);

    // Last colorblind stop: dark purple [68, 1, 84]
    expect(color).toEqual([68, 1, 84, 255]);
  });

  it('minutesToColor returns colorblind dark for infinite', () => {
    setColorPalette("colorblind");
    const color = minutesToColor(null, true, false);

    expect(color).toEqual([30, 0, 50, 255]);
  });

  it('minutesToColorPacked returns colorblind dark for infinite', () => {
    setColorPalette("colorblind");
    const packed = minutesToColorPacked(100, true, false);
    const expected = 30 | (0 << 8) | (50 << 16) | (255 << 24);

    expect(packed).toBe(expected);
  });

  it('legendEntries returns yellow for first entry in colorblind mode', () => {
    setColorPalette("colorblind");
    const entries = legendEntries(5);

    expect(entries[0].color).toBe('rgb(253,231,37)');
  });

  it('legendEntries returns dark purple for last entry in colorblind mode', () => {
    setColorPalette("colorblind");
    const entries = legendEntries(5);

    expect(entries[entries.length - 1].color).toBe('rgb(68,1,84)');
  });

  it('produces different colors than default palette for same input', () => {
    const defaultColor = minutesToColor(60, false, false);
    setColorPalette("colorblind");
    const cbColor = minutesToColor(60, false, false);

    expect(cbColor).not.toEqual(defaultColor);
  });
});
