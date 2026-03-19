import { describe, it, expect } from "vitest";
import {
  parseHeader,
  MAGIC,
  SUPPORTED_VERSION,
  LEGACY_HEADER_BYTES,
  V2_HEADER_BYTES,
  type GridHeader,
} from "./gridHeader.ts";

/** Build a v2 binary buffer: 4-byte prefix + 20-byte grid fields + optional data. */
function buildV2Buffer(
  header: GridHeader,
  version: number = SUPPORTED_VERSION,
  flags: number = 0,
): ArrayBuffer {
  const buf = new ArrayBuffer(V2_HEADER_BYTES);
  const view = new DataView(buf);

  // prefix
  view.setUint16(0, MAGIC, true);
  view.setUint8(2, version);
  view.setUint8(3, flags);

  // grid fields at offset 4
  view.setUint16(4, header.nlat, true);
  view.setUint16(6, header.nlon, true);
  view.setFloat32(8, header.lat0, true);
  view.setFloat32(12, header.latStep, true);
  view.setFloat32(16, header.lon0, true);
  view.setFloat32(20, header.lonStep, true);

  return buf;
}

/** Build a legacy v1 binary buffer: 20-byte grid fields only. */
function buildV1Buffer(header: GridHeader): ArrayBuffer {
  const buf = new ArrayBuffer(LEGACY_HEADER_BYTES);
  const view = new DataView(buf);

  view.setUint16(0, header.nlat, true);
  view.setUint16(2, header.nlon, true);
  view.setFloat32(4, header.lat0, true);
  view.setFloat32(8, header.latStep, true);
  view.setFloat32(12, header.lon0, true);
  view.setFloat32(16, header.lonStep, true);

  return buf;
}

const sampleHeader: GridHeader = {
  nlat: 720,
  nlon: 1440,
  lat0: 89.875,
  latStep: -0.25,
  lon0: -179.875,
  lonStep: 0.25,
};

describe("parseHeader", () => {
  describe("v2 format (with magic prefix)", () => {
    it("should parse a v2 header and return correct grid fields", () => {
      const buf = buildV2Buffer(sampleHeader);
      const result = parseHeader(buf);

      expect(result.header.nlat).toBe(sampleHeader.nlat);
      expect(result.header.nlon).toBe(sampleHeader.nlon);
      expect(result.header.lat0).toBeCloseTo(sampleHeader.lat0, 2);
      expect(result.header.latStep).toBeCloseTo(sampleHeader.latStep, 2);
      expect(result.header.lon0).toBeCloseTo(sampleHeader.lon0, 2);
      expect(result.header.lonStep).toBeCloseTo(sampleHeader.lonStep, 2);
    });

    it("should return dataOffset equal to V2_HEADER_BYTES", () => {
      const buf = buildV2Buffer(sampleHeader);
      const result = parseHeader(buf);

      expect(result.dataOffset).toBe(V2_HEADER_BYTES);
    });

    it("should report version 2", () => {
      const buf = buildV2Buffer(sampleHeader, 2);
      const result = parseHeader(buf);

      expect(result.version).toBe(2);
    });
  });

  describe("legacy v1 format (no magic prefix)", () => {
    it("should parse a legacy header and return correct grid fields", () => {
      const buf = buildV1Buffer(sampleHeader);
      const result = parseHeader(buf);

      expect(result.header.nlat).toBe(sampleHeader.nlat);
      expect(result.header.nlon).toBe(sampleHeader.nlon);
      expect(result.header.lat0).toBeCloseTo(sampleHeader.lat0, 2);
      expect(result.header.latStep).toBeCloseTo(sampleHeader.latStep, 2);
      expect(result.header.lon0).toBeCloseTo(sampleHeader.lon0, 2);
      expect(result.header.lonStep).toBeCloseTo(sampleHeader.lonStep, 2);
    });

    it("should return dataOffset equal to LEGACY_HEADER_BYTES", () => {
      const buf = buildV1Buffer(sampleHeader);
      const result = parseHeader(buf);

      expect(result.dataOffset).toBe(LEGACY_HEADER_BYTES);
    });

    it("should report version 1", () => {
      const buf = buildV1Buffer(sampleHeader);
      const result = parseHeader(buf);

      expect(result.version).toBe(1);
    });
  });

  describe("forward compatibility", () => {
    it("should still parse a future version (v3) and warn", () => {
      const buf = buildV2Buffer(sampleHeader, 3);
      const result = parseHeader(buf);

      // Should still extract fields correctly
      expect(result.header.nlat).toBe(sampleHeader.nlat);
      expect(result.header.nlon).toBe(sampleHeader.nlon);
      expect(result.dataOffset).toBe(V2_HEADER_BYTES);
      expect(result.version).toBe(3);
    });
  });

  describe("edge cases", () => {
    it("should handle a 1x1 grid", () => {
      const tinyHeader: GridHeader = {
        nlat: 1,
        nlon: 1,
        lat0: 0,
        latStep: 0,
        lon0: 0,
        lonStep: 0,
      };
      const buf = buildV2Buffer(tinyHeader);
      const result = parseHeader(buf);

      expect(result.header.nlat).toBe(1);
      expect(result.header.nlon).toBe(1);
      expect(result.header.latStep).toBe(0);
      expect(result.header.lonStep).toBe(0);
    });

    it("should not misidentify a v1 buffer whose first two data bytes happen to differ from MAGIC", () => {
      // nlat=100, nlon=200 -- first 2 bytes are 0x0064, not 0x4453
      const header: GridHeader = {
        nlat: 100,
        nlon: 200,
        lat0: 50,
        latStep: -1,
        lon0: -100,
        lonStep: 1,
      };
      const buf = buildV1Buffer(header);
      const result = parseHeader(buf);

      expect(result.version).toBe(1);
      expect(result.dataOffset).toBe(LEGACY_HEADER_BYTES);
      expect(result.header.nlat).toBe(100);
      expect(result.header.nlon).toBe(200);
    });
  });
});
