import type { EstimateResponse } from "../types";
import { METHODOLOGY } from "./methodology";
import { samplePoint, allMonthsReady, loadAllMonths } from "../model/gridData";
import { computeMinutes } from "../model/vitd";
import { weatherExposure } from "../model/weather";

const { scale: ENC_SCALE, temp_encoding_scale: TEMP_ENC_SCALE, temp_offset: TEMP_OFFSET } =
  METHODOLOGY.encoding;
const SUPPLEMENT_THRESHOLD = 120;

const MONTH_ABBR = [
  "Jan", "Feb", "Mar", "Apr", "May", "June",
  "July", "Aug", "Sept", "Oct", "Nov", "Dec",
];

export function getEstimate(params: {
  lat: number;
  lon: number;
  month: number;
  skinType: number;
  coverage: number;
}): EstimateResponse {
  const { lat, lon, month, skinType, coverage } = params;
  const normLon = (((lon + 180) % 360) + 360) % 360 - 180;

  const hDMonth = samplePoint("uv", month, lat, normLon, ENC_SCALE, 0);
  const safeHD = isNaN(hDMonth) ? 0 : hDMonth;

  const temperature = samplePoint("temp", month, lat, normLon, TEMP_ENC_SCALE, TEMP_OFFSET);
  const safeTemp = isNaN(temperature) ? null : Math.round(temperature * 10) / 10;

  const kSkin = METHODOLOGY.fitzpatrick_table[String(skinType)] ?? 1;
  const result = computeMinutes(safeHD, kSkin, coverage, METHODOLOGY.constants.K_minutes);

  return {
    inputs: { lat, lon: normLon, month, skin_type: skinType, coverage },
    intermediate: { H_D_month: safeHD, temperature: safeTemp },
    outputs: {
      minutes_required: result.minutes,
      is_infinite: result.isInfinite,
    },
    constants_used: {
      K_minutes: METHODOLOGY.constants.K_minutes,
      k_skin: kSkin,
      f_cover: coverage,
    },
    model_version: METHODOLOGY.model_version,
  };
}

export interface SupplementResponse {
  months: number[];
  label: string | null;
}

function formatMonthRange(months: number[]): string | null {
  if (!months.length) return null;
  if (months.length === 12) return "the whole year";

  const s = new Set(months);
  let start: number | null = null;
  for (let m = 1; m <= 12; m++) {
    if (!s.has(m)) { start = m; break; }
  }
  if (start === null) return "the whole year";

  const ordered: number[] = [];
  for (let i = 0; i < 12; i++) {
    const m = ((start + i - 1) % 12) + 1;
    if (s.has(m)) ordered.push(m);
  }
  if (!ordered.length) return null;
  if (ordered.length === 1) return MONTH_ABBR[ordered[0] - 1];
  return `${MONTH_ABBR[ordered[0] - 1]}\u2013${MONTH_ABBR[ordered[ordered.length - 1] - 1]}`;
}

export interface MonthMinutes {
  month: number;
  /** Required midday minutes; null when synthesis is impossible (no UV or zero coverage). */
  minutes: number | null;
}

export interface MonthlyProfileResponse {
  monthly: MonthMinutes[];
  supplement: SupplementResponse;
}

function computeMonthlyMinutes(params: {
  lat: number;
  lon: number;
  skinType: number;
  coverage: number;
  weatherAdjusted?: boolean;
}): MonthMinutes[] {
  const { lat, lon, skinType, coverage, weatherAdjusted } = params;
  const normLon = (((lon + 180) % 360) + 360) % 360 - 180;
  const kSkin = METHODOLOGY.fitzpatrick_table[String(skinType)] ?? 1;
  const kMinutes = METHODOLOGY.constants.K_minutes;

  const monthly: MonthMinutes[] = [];
  for (let m = 1; m <= 12; m++) {
    let hD = samplePoint("uv", m, lat, normLon, ENC_SCALE, 0);
    if (isNaN(hD)) hD = 0;

    let fc = coverage;
    if (weatherAdjusted) {
      const temp = samplePoint("temp", m, lat, normLon, TEMP_ENC_SCALE, TEMP_OFFSET);
      fc = isNaN(temp) ? 0.25 : weatherExposure(temp);
    }

    const result = computeMinutes(hD, kSkin, fc, kMinutes);
    monthly.push({ month: m, minutes: result.minutes });
  }

  return monthly;
}

export function deriveSupplement(monthly: MonthMinutes[]): SupplementResponse {
  const hardMonths = monthly
    .filter((m) => m.minutes === null || m.minutes > SUPPLEMENT_THRESHOLD)
    .map((m) => m.month);
  return { months: hardMonths, label: formatMonthRange(hardMonths) };
}

/**
 * Async wrapper: loads all months if needed, then computes the per-month
 * minutes profile and the supplement advice derived from it.
 */
export async function getMonthlyProfile(params: {
  lat: number;
  lon: number;
  skinType: number;
  coverage: number;
  weatherAdjusted?: boolean;
}): Promise<MonthlyProfileResponse> {
  if (!allMonthsReady()) {
    await loadAllMonths();
  }
  const monthly = computeMonthlyMinutes(params);
  return { monthly, supplement: deriveSupplement(monthly) };
}
