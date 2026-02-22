import type { MethodologyResponse } from "../types";

export async function fetchMethodology(): Promise<MethodologyResponse> {
  const resp = await fetch("/api/methodology");
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
