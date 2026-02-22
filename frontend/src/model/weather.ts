/**
 * Weather-adjusted exposure model.
 *
 * Maps a temperature (°C) to a skin exposure fraction using smoothstep
 * interpolation between winter clothing (0.05) and swimsuit (0.85).
 *
 * Thresholds are calibrated for ERA5 monthly-mean 2m temperature
 * (24-hour average), which runs ~5°C below midday highs.
 */

const COLD = 0.05;
const WARM = 0.85;
const T_MIN = 0;
const T_MAX = 25;

function smoothstep(t: number): number {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
}

export function weatherExposure(tempC: number): number {
  const t = smoothstep((tempC - T_MIN) / (T_MAX - T_MIN));
  return COLD + (WARM - COLD) * t;
}
