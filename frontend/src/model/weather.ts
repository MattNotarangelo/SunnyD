/**
 * Simple latitude/month temperature heuristic for weather-adjusted exposure.
 *
 * Uses a parametric model: temperature decreases with latitude,
 * seasonal amplitude increases with latitude, and hemispheres
 * have opposite seasons.
 *
 * Exposure is smoothly interpolated between winter clothing (0.05)
 * and swimsuit (0.85) based on estimated temperature.
 */

const COLD = 0.05;
const WARM = 0.85;
const T_MIN = 5;
const T_MAX = 30;

function smoothstep(t: number): number {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
}

export function estimateTemperature(lat: number, month: number): number {
  const absLat = Math.abs(lat);
  const annualMean = 28 - 0.55 * absLat;
  const amplitude = 0.3 * absLat;
  let season = Math.cos((2 * Math.PI * (month - 7)) / 12);
  if (lat < 0) season = -season;
  return annualMean + amplitude * season;
}

export function weatherExposure(lat: number, month: number): number {
  const temp = estimateTemperature(lat, month);
  const t = smoothstep((temp - T_MIN) / (T_MAX - T_MIN));
  return COLD + (WARM - COLD) * t;
}
