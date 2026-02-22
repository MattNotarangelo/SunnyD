import type { EstimateResponse } from "../types";

export async function fetchEstimate(params: {
  lat: number;
  lon: number;
  month: number;
  skinType: number;
  coverage: number;
}): Promise<EstimateResponse> {
  const qs = new URLSearchParams({
    lat: String(params.lat),
    lon: String(params.lon),
    month: String(params.month),
    skin_type: String(params.skinType),
    coverage: String(params.coverage),
  });
  const resp = await fetch(`/api/estimate?${qs}`);
  if (!resp.ok) {
    let detail = `HTTP ${resp.status}`;
    try {
      const body = await resp.json();
      if (body.detail) detail = body.detail;
    } catch { /* ignore parse errors */ }
    throw new Error(detail);
  }
  return resp.json();
}
