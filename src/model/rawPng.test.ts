import { describe, it, expect } from 'vitest';
import { buildRawPng } from './rawPng.ts';

describe('buildRawPng', () => {
  const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];

  it('produces output with valid PNG signature', () => {
    const rgba = new Uint8Array(4); // 1x1 red pixel
    rgba[0] = 255; rgba[1] = 0; rgba[2] = 0; rgba[3] = 255;

    const buffer = buildRawPng(rgba, 1, 1);
    const bytes = new Uint8Array(buffer);

    expect(Array.from(bytes.slice(0, 8))).toEqual(PNG_SIGNATURE);
  });

  it('produces deterministic output for the same input', () => {
    const rgba = new Uint8Array(16); // 2x2 pixels
    for (let i = 0; i < 16; i++) rgba[i] = i * 17;

    const buffer1 = buildRawPng(rgba, 2, 2);
    const buffer2 = buildRawPng(rgba, 2, 2);

    expect(new Uint8Array(buffer1)).toEqual(new Uint8Array(buffer2));
  });

  it('output size is deterministic for given dimensions', () => {
    const rgba = new Uint8Array(4 * 10 * 10);
    rgba.fill(128);

    const buffer1 = buildRawPng(rgba, 10, 10);
    const buffer2 = buildRawPng(rgba, 10, 10);

    expect(buffer1.byteLength).toBe(buffer2.byteLength);
  });

  it('produces a valid ArrayBuffer for 1x1 pixel', () => {
    const rgba = new Uint8Array([0, 0, 0, 255]);
    const buffer = buildRawPng(rgba, 1, 1);

    expect(buffer).toBeInstanceOf(ArrayBuffer);
    expect(buffer.byteLength).toBeGreaterThan(8); // At least signature + some chunks
  });

  it('IHDR chunk follows signature and has correct dimensions', () => {
    const w = 4;
    const h = 3;
    const rgba = new Uint8Array(w * h * 4);
    rgba.fill(200);

    const buffer = buildRawPng(rgba, w, h);
    const dv = new DataView(buffer);

    // After 8-byte signature: 4-byte length, then "IHDR" (0x49484452)
    const ihdrLength = dv.getUint32(8);
    expect(ihdrLength).toBe(13); // IHDR data is always 13 bytes

    // IHDR type bytes
    const bytes = new Uint8Array(buffer);
    expect(bytes[12]).toBe(0x49); // I
    expect(bytes[13]).toBe(0x48); // H
    expect(bytes[14]).toBe(0x44); // D
    expect(bytes[15]).toBe(0x52); // R

    // Width and height (big-endian uint32 at offset 16 and 20)
    expect(dv.getUint32(16)).toBe(w);
    expect(dv.getUint32(20)).toBe(h);

    // Bit depth = 8, color type = 6 (RGBA)
    expect(bytes[24]).toBe(8);
    expect(bytes[25]).toBe(6);
  });

  it('contains IEND chunk at the end', () => {
    const rgba = new Uint8Array(4);
    rgba.fill(255);

    const buffer = buildRawPng(rgba, 1, 1);
    const bytes = new Uint8Array(buffer);

    // IEND should be near the end: 4-byte length (0), "IEND", 4-byte CRC
    // The "IEND" type bytes: 0x49 0x45 0x4E 0x44
    const iendOffset = buffer.byteLength - 12;
    const dv = new DataView(buffer);
    expect(dv.getUint32(iendOffset)).toBe(0); // IEND has 0 data bytes
    expect(bytes[iendOffset + 4]).toBe(0x49); // I
    expect(bytes[iendOffset + 5]).toBe(0x45); // E
    expect(bytes[iendOffset + 6]).toBe(0x4E); // N
    expect(bytes[iendOffset + 7]).toBe(0x44); // D
  });

  it('output grows with larger dimensions', () => {
    const small = new Uint8Array(4 * 2 * 2);
    const large = new Uint8Array(4 * 10 * 10);

    const smallBuf = buildRawPng(small, 2, 2);
    const largeBuf = buildRawPng(large, 10, 10);

    expect(largeBuf.byteLength).toBeGreaterThan(smallBuf.byteLength);
  });

  it('handles a 256x256 tile without error', () => {
    const w = 256;
    const h = 256;
    const rgba = new Uint8Array(w * h * 4);
    for (let i = 0; i < rgba.length; i++) rgba[i] = i & 0xff;

    const buffer = buildRawPng(rgba, w, h);
    const bytes = new Uint8Array(buffer);

    expect(Array.from(bytes.slice(0, 8))).toEqual(PNG_SIGNATURE);
    expect(buffer.byteLength).toBeGreaterThan(0);
  });
});
