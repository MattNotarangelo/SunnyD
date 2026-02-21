export interface VitDResult {
  hDMonth: number;
  hdotD: number;
  iuPerMinRef: number;
  iuPerMinUser: number;
  minutes: number | null;
  isInfinite: boolean;
}

export function computeMinutes(
  hDMonth: number,
  iuTarget: number,
  fCover: number,
  kSkin: number,
  tWindow: number,
  cIU: number,
  hMin: number,
): VitDResult {
  const hdotD = hDMonth / tWindow;
  const iuPerMinRef = cIU * hdotD;
  const iuPerMinUser = (iuPerMinRef * fCover) / kSkin;

  const isInfinite = hDMonth < hMin || iuPerMinUser <= 0;
  const minutes = isInfinite ? null : iuTarget / iuPerMinUser;

  return { hDMonth, hdotD, iuPerMinRef, iuPerMinUser, minutes, isInfinite };
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
