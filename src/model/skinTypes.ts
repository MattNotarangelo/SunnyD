/** Fitzpatrick skin types, in plain language, shared by the selector and the tooltip. */
export interface SkinTypeInfo {
  type: number;
  numeral: string;
  /** Representative skin tone, used as a swatch (data, not decoration). */
  tone: string;
  description: string;
}

export const SKIN_TYPES: SkinTypeInfo[] = [
  { type: 1, numeral: "I", tone: "#f3d5c0", description: "Always burns, never tans" },
  { type: 2, numeral: "II", tone: "#e6bc98", description: "Usually burns, tans minimally" },
  { type: 3, numeral: "III", tone: "#d1a07a", description: "Sometimes burns, tans gradually" },
  { type: 4, numeral: "IV", tone: "#a97650", description: "Rarely burns, tans easily" },
  { type: 5, numeral: "V", tone: "#774d33", description: "Very rarely burns, tans very easily" },
  { type: 6, numeral: "VI", tone: "#4b2f20", description: "Never burns, deeply pigmented" },
];

export function skinTypeInfo(type: number): SkinTypeInfo {
  return SKIN_TYPES[Math.min(6, Math.max(1, Math.round(type))) - 1];
}
