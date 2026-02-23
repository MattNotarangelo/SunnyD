/**
 * Minimal uncompressed PNG encoder.
 *
 * Produces a valid PNG with deflate "stored" blocks (no zlib compression),
 * avoiding the ~10ms zlib overhead of canvas.convertToBlob().
 * Output is ~262 KB per 256×256 RGBA tile — larger on the wire but never
 * leaves the browser (it's fed straight to MapLibre's image decoder).
 */

const SIG = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);

// CRC-32 table (ITU-T V.42 / PNG spec)
const CRC_T = /*@__PURE__*/ (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf: Uint8Array, off: number, len: number): number {
  let c = 0xffffffff;
  const end = off + len;
  for (let i = off; i < end; i++) c = CRC_T[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/**
 * Encode RGBA pixel bytes into an uncompressed PNG.
 * `rgba` must be w*h*4 bytes, row-major, top-to-bottom.
 */
export function buildRawPng(rgba: Uint8Array, w: number, h: number): ArrayBuffer {
  // ── 1. Build filtered row data (filter = None) ──
  const rowLen = 1 + w * 4;
  const filteredSize = h * rowLen;
  const filtered = new Uint8Array(filteredSize);
  for (let y = 0; y < h; y++) {
    filtered[y * rowLen] = 0; // filter byte
    filtered.set(rgba.subarray(y * w * 4, (y + 1) * w * 4), y * rowLen + 1);
  }

  // ── 2. Adler-32 of filtered data ──
  let s1 = 1, s2 = 0;
  for (let i = 0; i < filteredSize; i++) {
    s1 = (s1 + filtered[i]) % 65521;
    s2 = (s2 + s1) % 65521;
  }

  // ── 3. Compute sizes ──
  const MAX_BLK = 65535;
  const nBlocks = Math.ceil(filteredSize / MAX_BLK);
  const idatPayload = 2 + nBlocks * 5 + filteredSize + 4; // zlib hdr + blocks + adler
  const pngSize = 8 + 25 + 12 + idatPayload + 12;
  //               sig  IHDR  IDAT overhead    IEND

  const out = new Uint8Array(pngSize);
  const dv = new DataView(out.buffer);
  let p = 0;

  // ── Signature ──
  out.set(SIG, 0);
  p = 8;

  // ── IHDR (13 bytes data) ──
  dv.setUint32(p, 13); p += 4;
  const ihdrType = p;
  out[p++] = 0x49; out[p++] = 0x48; out[p++] = 0x44; out[p++] = 0x52; // IHDR
  dv.setUint32(p, w); p += 4;
  dv.setUint32(p, h); p += 4;
  out[p++] = 8; out[p++] = 6; out[p++] = 0; out[p++] = 0; out[p++] = 0;
  dv.setUint32(p, crc32(out, ihdrType, 17)); p += 4;

  // ── IDAT ──
  dv.setUint32(p, idatPayload); p += 4;
  const idatType = p;
  out[p++] = 0x49; out[p++] = 0x44; out[p++] = 0x41; out[p++] = 0x54; // IDAT
  out[p++] = 0x78; out[p++] = 0x01; // zlib header (CM=8, CINFO=7, FCHECK=1)

  let off = 0;
  for (let i = 0; i < nBlocks; i++) {
    const remain = filteredSize - off;
    const len = remain > MAX_BLK ? MAX_BLK : remain;
    out[p++] = i === nBlocks - 1 ? 1 : 0; // BFINAL | BTYPE=00
    out[p++] = len & 0xff;
    out[p++] = (len >>> 8) & 0xff;
    out[p++] = ~len & 0xff;
    out[p++] = (~len >>> 8) & 0xff;
    out.set(filtered.subarray(off, off + len), p);
    p += len;
    off += len;
  }

  dv.setUint32(p, (s2 << 16) | s1); p += 4; // adler-32 (big-endian)
  dv.setUint32(p, crc32(out, idatType, idatPayload + 4)); p += 4;

  // ── IEND ──
  dv.setUint32(p, 0); p += 4;
  const iendType = p;
  out[p++] = 0x49; out[p++] = 0x45; out[p++] = 0x4e; out[p++] = 0x44; // IEND
  dv.setUint32(p, crc32(out, iendType, 4));

  return out.buffer;
}
