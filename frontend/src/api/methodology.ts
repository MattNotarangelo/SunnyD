import type { MethodologyResponse } from "../types";

export async function fetchMethodology(): Promise<MethodologyResponse> {
  const resp = await fetch("/api/methodology");
  if (!resp.ok) throw new Error(`Methodology fetch failed: ${resp.status}`);
  return resp.json();
}
