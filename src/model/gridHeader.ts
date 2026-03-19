/**
 * Binary grid header parsing with version detection.
 *
 * Supports two formats:
 *   v1 (legacy): 20-byte header with no prefix
 *   v2+:        4-byte prefix (magic "SD", version, flags) + 20-byte grid fields
 *
 * The reader auto-detects the format by checking the first two bytes for
 * the magic number 0x5344 ("SD" little-endian).
 */

/** "SD" as a little-endian uint16: 0x44='D' in high byte, 0x53='S' in low byte. */
export const MAGIC = 0x4453;

export const SUPPORTED_VERSION = 2;
export const LEGACY_HEADER_BYTES = 20;
export const V2_PREFIX_BYTES = 4;
export const V2_HEADER_BYTES = V2_PREFIX_BYTES + LEGACY_HEADER_BYTES;

export interface GridHeader {
  nlat: number;
  nlon: number;
  lat0: number;
  latStep: number;
  lon0: number;
  lonStep: number;
}

export interface ParsedHeader {
  header: GridHeader;
  dataOffset: number;
  version: number;
}

function parseGridFields(view: DataView, offset: number): GridHeader {
  return {
    nlat: view.getUint16(offset, true),
    nlon: view.getUint16(offset + 2, true),
    lat0: view.getFloat32(offset + 4, true),
    latStep: view.getFloat32(offset + 8, true),
    lon0: view.getFloat32(offset + 12, true),
    lonStep: view.getFloat32(offset + 16, true),
  };
}

/**
 * Parse a grid header from the given buffer, auto-detecting v1 vs v2+ format.
 *
 * - If the first two bytes match the magic number, treat as v2+ and read the
 *   version byte from offset 2. Grid fields start at offset 4.
 * - Otherwise treat as legacy v1. Grid fields start at offset 0.
 */
export function parseHeader(buf: ArrayBuffer): ParsedHeader {
  const view = new DataView(buf);
  const magic = view.getUint16(0, true);

  if (magic === MAGIC) {
    const version = view.getUint8(2);
    if (version > SUPPORTED_VERSION) {
      console.warn(
        `Grid format version ${version} is newer than supported version ${SUPPORTED_VERSION}; attempting to parse anyway`,
      );
    }
    return {
      header: parseGridFields(view, V2_PREFIX_BYTES),
      dataOffset: V2_HEADER_BYTES,
      version,
    };
  }

  return {
    header: parseGridFields(view, 0),
    dataOffset: LEGACY_HEADER_BYTES,
    version: 1,
  };
}
