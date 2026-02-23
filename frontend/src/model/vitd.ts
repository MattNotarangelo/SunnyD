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

const NODATA_U16 = 0xFFFF;

/**
 * Decode a uint16 ArrayBuffer into Float32Array.
 * 0xFFFF = NaN (no-data), all other values are divided by encodingScale
 * then shifted by -encodingOffset.
 */
export function decodeUint16Tile(
  buffer: ArrayBuffer,
  encodingScale: number,
  encodingOffset: number,
): Float32Array {
  const u16 = new Uint16Array(buffer);
  const out = new Float32Array(u16.length);
  for (let i = 0; i < u16.length; i++) {
    out[i] = u16[i] === NODATA_U16 ? NaN : u16[i] / encodingScale - encodingOffset;
  }
  return out;
}
