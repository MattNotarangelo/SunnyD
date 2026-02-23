import { addProtocol } from "maplibre-gl";
import type { ModelParams } from "../types";
import { minutesToColorPacked } from "./colorScale";
import { sampleTile } from "./gridData";
import { buildRawPng } from "./rawPng";
import { weatherExposure } from "./weather";

const TILE_SIZE = 256;
const PIXEL_COUNT = TILE_SIZE * TILE_SIZE;
const NODATA_U16 = 0xffff;

let currentParams: ModelParams | null = null;

export function setModelParams(params: ModelParams) {
  currentParams = params;
}

/**
 * Single-pass colorize: reads raw uint16 grid samples, computes minutes inline,
 * looks up color from the pre-computed LUT, and writes packed RGBA via Uint32Array.
 */
function colorize(uvU16: Uint16Array, tempU16: Uint16Array | null, params: ModelParams): ArrayBuffer {
  const rgba = new Uint8Array(PIXEL_COUNT * 4);
  const rgba32 = new Uint32Array(rgba.buffer);

  const { kSkin, kMinutes, fCover, encodingScale, weatherAdjusted, tempEncodingScale, tempOffset } = params;
  const numerator = kMinutes * kSkin * 1000 * encodingScale;

  for (let i = 0; i < PIXEL_COUNT; i++) {
    const raw = uvU16[i];
    if (raw === NODATA_U16) {
      rgba32[i] = minutesToColorPacked(0, false, true);
      continue;
    }

    let fc = fCover;
    if (weatherAdjusted && tempU16) {
      const tRaw = tempU16[i];
      fc = tRaw === NODATA_U16 ? 0.25 : weatherExposure(tRaw / tempEncodingScale - tempOffset);
    }

    if (raw === 0 || fc <= 0) {
      rgba32[i] = minutesToColorPacked(Infinity, true, false);
    } else {
      rgba32[i] = minutesToColorPacked(numerator / (raw * fc), false, false);
    }
  }

  return buildRawPng(rgba, TILE_SIZE, TILE_SIZE);
}

function parseTileUrl(url: string): { month: number; z: number; x: number; y: number } {
  const stripped = url.replace("sunnyd://", "");
  const [path, query] = stripped.split("?");
  const [zStr, xStr, yStr] = path.split("/");
  const params = new URLSearchParams(query);
  return {
    z: parseInt(zStr),
    x: parseInt(xStr),
    y: parseInt(yStr),
    month: parseInt(params.get("month") || "1"),
  };
}

export function registerProtocol() {
  addProtocol("sunnyd", async (params) => {
    const { month, z, x, y } = parseTileUrl(params.url);
    if (!currentParams) throw new Error("Model params not yet initialized");

    const uvU16 = sampleTile("uv", month, z, x, y);
    const tempU16 = currentParams.weatherAdjusted
      ? sampleTile("temp", month, z, x, y)
      : null;

    return { data: colorize(uvU16, tempU16, currentParams) };
  });
}
