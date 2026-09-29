/**
 * The one threshold model every surface (map tiles, legend, month chart,
 * tooltip, supplement advice) reads from.
 */

/** Above this many daily midday minutes, sun alone probably isn't enough. */
export const SUPPLEMENT_MINUTES = 120;

/**
 * Above this, the target is not achievable from sun: the model assumes the
 * day's vitamin-D UV dose arrives over a 4-hour midday window (T_peak), so
 * needing longer than the window itself can't happen.
 */
export const MAX_ACHIEVABLE_MINUTES = 240;

/** True when `minutes` is a real, reachable daily requirement. */
export function isAchievable(minutes: number | null | undefined): minutes is number {
  return minutes != null && Number.isFinite(minutes) && minutes <= MAX_ACHIEVABLE_MINUTES;
}

/** True when sun alone probably won't cover this month (includes not achievable). */
export function needsSupplement(minutes: number | null | undefined): boolean {
  return !isAchievable(minutes) || minutes > SUPPLEMENT_MINUTES;
}
