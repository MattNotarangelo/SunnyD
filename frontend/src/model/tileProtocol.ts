import { addProtocol } from "maplibre-gl";
import type { ModelParams } from "../types";
import { minutesToColorPacked } from "./colorScale";
import { buildRawPng } from "./rawPng";
import { weatherExposure } from "./weather";

const TILE_SIZE = 256;
const PIXEL_COUNT = TILE_SIZE * TILE_SIZE;
const NODATA_U16 = 0xFFFF;

const uvCache = new Map<string, Uint16Array>();
const tempCache = new Map<string, Uint16Array>();

let currentParams: ModelParams | null = null;

export function setModelParams(params: ModelParams) {
  currentParams = params;
}

function cacheKey(month: number, z: number, x: number, y: number): string {
  return `${month}/${z}/${x}/${y}`;
}

async function fetchTileU16(url: string): Promise<Uint16Array> {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Tile fetch failed: ${resp.status}`);
  return new Uint16Array(await resp.arrayBuffer());
}

async function fetchUV(month: number, z: number, x: number, y: number): Promise<Uint16Array> {
  const key = cacheKey(month, z, x, y);
  const cached = uvCache.get(key);
  if (cached) return cached;
  const u16 = await fetchTileU16(`/api/base_tiles/${z}/${x}/${y}.bin?month=${month}`);
  uvCache.set(key, u16);
  return u16;
}

async function fetchTemp(month: number, z: number, x: number, y: number): Promise<Uint16Array> {
  const key = cacheKey(month, z, x, y);
  const cached = tempCache.get(key);
  if (cached) return cached;
  const u16 = await fetchTileU16(`/api/temp_tiles/${z}/${x}/${y}.bin?month=${month}`);
  tempCache.set(key, u16);
  return u16;
}

/**
 * Single-pass colorize: reads raw uint16 tiles, computes minutes inline,
 * looks up color from the pre-computed LUT, and writes packed RGBA via Uint32Array.
 */
function colorize(uvU16: Uint16Array, tempU16: Uint16Array | null, params: ModelParams): ArrayBuffer {
  const rgba = new Uint8Array(PIXEL_COUNT * 4);
  const rgba32 = new Uint32Array(rgba.buffer);

  const { kSkin, kMinutes, fCover, encodingScale, weatherAdjusted, tempEncodingScale, tempOffset } = params;
  // Pre-compute: minutes = (kMinutes * kSkin) / (hdKj * fc)
  //            = (kMinutes * kSkin * 1000) / (rawU16 / encodingScale * 1000 * fc)
  //            = (kMinutes * kSkin * 1000 * encodingScale) / (rawU16 * fc * 1000)
  //            = (kMinutes * kSkin * encodingScale) / (rawU16 * fc)
  // Wait — hDMonth (J/m²) = rawU16 / encodingScale, hdKj = hDMonth / 1000
  // minutes = (kMinutes * kSkin) / (hdKj * fc) = (kMinutes * kSkin * 1000 * encodingScale) / (rawU16 * fc)
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

    const uvU16 = await fetchUV(month, z, x, y);

    let tempU16: Uint16Array | null = null;
    if (currentParams.weatherAdjusted) {
      tempU16 = await fetchTemp(month, z, x, y);
    }

    return { data: colorize(uvU16, tempU16, currentParams) };
  });
}

export function clearCache() {
  uvCache.clear();
  tempCache.clear();
}
