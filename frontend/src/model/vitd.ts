export interface VitDResult {
  hDMonth: number;
  minutes: number | null;
  isInfinite: boolean;
}

export function computeMinutes(
  hDMonth: number,
  kSkin: number,
  fCover: number,
  kMinutes: number,
): VitDResult {
  const isInfinite = hDMonth <= 0 || fCover <= 0;
  const hdKj = hDMonth / 1000;
  const minutes = isInfinite ? null : (kMinutes * kSkin) / (hdKj * fCover);

  return { hDMonth, minutes, isInfinite };
}

export function decodeRGB(
  r: number,
  g: number,
  b: number,
  a: number,
  encodingScale: number,
): number {
  if (a === 0) return NaN;
  return ((r << 16) | (g << 8) | b) / encodingScale;
}
