import { METHODOLOGY } from "../api/methodology";
import type { MethodologyResponse } from "../types";

export function useMethodology(): { methodology: MethodologyResponse } {
  return { methodology: METHODOLOGY };
}
