/** Fitzpatrick skin types, in plain language, shared by the selector and the tooltip. */
export interface SkinTypeInfo {
  type: number;
  numeral: string;
  /** Representative skin tone, used as a swatch (data, not decoration). */
  tone: string;
  /** Emoji with the matching Unicode skin-tone modifier (types I and II share one). */
  emoji: string;
  description: string;
}

export const SKIN_TYPES: SkinTypeInfo[] = [
  { type: 1, numeral: "I", tone: "#f3d5c0", emoji: "\u{1F9D1}\u{1F3FB}", description: "Always burns, never tans" },
  { type: 2, numeral: "II", tone: "#e6bc98", emoji: "\u{1F9D1}\u{1F3FB}", description: "Usually burns, tans minimally" },
  { type: 3, numeral: "III", tone: "#d1a07a", emoji: "\u{1F9D1}\u{1F3FC}", description: "Sometimes burns, tans gradually" },
  { type: 4, numeral: "IV", tone: "#a97650", emoji: "\u{1F9D1}\u{1F3FD}", description: "Rarely burns, tans easily" },
  { type: 5, numeral: "V", tone: "#774d33", emoji: "\u{1F9D1}\u{1F3FE}", description: "Very rarely burns, tans very easily" },
  { type: 6, numeral: "VI", tone: "#4b2f20", emoji: "\u{1F9D1}\u{1F3FF}", description: "Never burns, deeply pigmented" },
];

export function skinTypeInfo(type: number): SkinTypeInfo {
  return SKIN_TYPES[Math.min(6, Math.max(1, Math.round(type))) - 1];
}
