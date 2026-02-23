/**
 * Log-scale color mapping for minutes of sun exposure.
 *
 * Range: ~5 min (green) to 240 min (red).  >240 or Infinity -> grey.
 */

const MAX_MINUTES = 240;
const LOG_MIN = Math.log10(5);
const LOG_MAX = Math.log10(MAX_MINUTES);
const LOG_RANGE = LOG_MAX - LOG_MIN;

const DARK_RED: [number, number, number, number] = [120, 10, 10, 255];
const TRANSPARENT: [number, number, number, number] = [0, 0, 0, 0];

interface ColorStop {
  t: number;
  r: number;
  g: number;
  b: number;
}

const STOPS: ColorStop[] = [
  { t: 0.0, r: 34, g: 139, b: 34 },   // forest green  — few minutes
  { t: 0.25, r: 50, g: 205, b: 50 },   // lime green
  { t: 0.5, r: 255, g: 215, b: 0 },    // gold/yellow
  { t: 0.75, r: 255, g: 120, b: 0 },   // orange
  { t: 1.0, r: 200, g: 30, b: 30 },    // red           — many minutes
];

function lerpStops(t: number): [number, number, number, number] {
  const clamped = Math.max(0, Math.min(1, t));
  for (let i = 1; i < STOPS.length; i++) {
    if (clamped <= STOPS[i].t) {
      const prev = STOPS[i - 1];
      const next = STOPS[i];
      const local = (clamped - prev.t) / (next.t - prev.t);
      return [
        Math.round(prev.r + (next.r - prev.r) * local),
        Math.round(prev.g + (next.g - prev.g) * local),
        Math.round(prev.b + (next.b - prev.b) * local),
        255,
      ];
    }
  }
  const last = STOPS[STOPS.length - 1];
  return [last.r, last.g, last.b, 255];
}

export function minutesToColor(
  minutes: number | null,
  isInfinite: boolean,
  isNoData: boolean,
): [number, number, number, number] {
  if (isNoData) return TRANSPARENT;
  if (isInfinite || minutes === null || minutes > MAX_MINUTES) return DARK_RED;
  const t = (Math.log10(minutes) - LOG_MIN) / LOG_RANGE;
  return lerpStops(t);
}

/** Generate a legend with N evenly-spaced entries. */
export function legendEntries(n: number): { minutes: number; color: string }[] {
  const entries: { minutes: number; color: string }[] = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const logVal = LOG_MIN + t * LOG_RANGE;
    const mins = Math.pow(10, logVal);
    const [r, g, b] = lerpStops(t);
    entries.push({ minutes: mins, color: `rgb(${r},${g},${b})` });
  }
  return entries;
}

// ── Pre-computed color LUT for fast tile rendering ──────────────────
// Maps a "minutes" value quantised to 0..LUT_SIZE-1 into packed RGBA.

const LUT_SIZE = 4096;
const LUT_MINUTES_MAX = MAX_MINUTES;

/** Packed RGBA LUT: index 0 = 0 min, index LUT_SIZE-1 = MAX_MINUTES */
const colorLUT = new Uint32Array(LUT_SIZE);
/** RGBA for infinite / >MAX_MINUTES */
let darkRedPacked: number;
/** RGBA for NaN / no-data */
let transparentPacked: number;

function packRGBA(r: number, g: number, b: number, a: number): number {
  return r | (g << 8) | (b << 16) | (a << 24);
}

function initLUT() {
  for (let i = 0; i < LUT_SIZE; i++) {
    const minutes = (i / (LUT_SIZE - 1)) * LUT_MINUTES_MAX;
    const t = (Math.log10(Math.max(minutes, 0.01)) - LOG_MIN) / LOG_RANGE;
    const [r, g, b, a] = lerpStops(t);
    colorLUT[i] = packRGBA(r, g, b, a);
  }
  darkRedPacked = packRGBA(...DARK_RED);
  transparentPacked = packRGBA(...TRANSPARENT);
}
initLUT();

/**
 * Look up color for a minutes value using the pre-computed LUT.
 * Returns a packed uint32 (little-endian ABGR for ImageData).
 */
export function minutesToColorPacked(
  minutes: number,
  isInfinite: boolean,
  isNoData: boolean,
): number {
  if (isNoData) return transparentPacked;
  if (isInfinite || minutes > LUT_MINUTES_MAX) return darkRedPacked;
  const idx = (minutes / LUT_MINUTES_MAX) * (LUT_SIZE - 1) | 0;
  return colorLUT[idx < 0 ? 0 : idx >= LUT_SIZE ? LUT_SIZE - 1 : idx];
}
