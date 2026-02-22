import { addProtocol } from "maplibre-gl";
import type { ModelParams } from "../types";
import { minutesToColor } from "./colorScale";
import { computeMinutes, decodeRGB } from "./vitd";
import { weatherExposure } from "./weather";

const TILE_SIZE = 256;
const uvCache = new Map<string, Float32Array>();
const tempCache = new Map<string, Float32Array>();

let currentParams: ModelParams | null = null;

export function setModelParams(params: ModelParams) {
  currentParams = params;
}

function cacheKey(month: number, z: number, x: number, y: number): string {
  return `${month}/${z}/${x}/${y}`;
}

async function decodeTilePng(
  url: string,
  encodingScale: number,
  encodingOffset: number,
): Promise<Float32Array> {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Tile fetch failed: ${resp.status}`);

  const blob = await resp.blob();
  const bitmap = await createImageBitmap(blob);

  const canvas = new OffscreenCanvas(TILE_SIZE, TILE_SIZE);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0);
  const imageData = ctx.getImageData(0, 0, TILE_SIZE, TILE_SIZE);
  const pixels = imageData.data;

  const count = TILE_SIZE * TILE_SIZE;
  const values = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const off = i * 4;
    const raw = decodeRGB(pixels[off], pixels[off + 1], pixels[off + 2], pixels[off + 3], encodingScale);
    values[i] = isNaN(raw) ? NaN : raw - encodingOffset;
  }
  return values;
}

async function fetchUV(
  month: number,
  z: number,
  x: number,
  y: number,
  encodingScale: number,
): Promise<Float32Array> {
  const key = cacheKey(month, z, x, y);
  const cached = uvCache.get(key);
  if (cached) return cached;

  const url = `/api/base_tiles/${z}/${x}/${y}.png?month=${month}`;
  const hd = await decodeTilePng(url, encodingScale, 0);
  uvCache.set(key, hd);
  return hd;
}

async function fetchTemp(
  month: number,
  z: number,
  x: number,
  y: number,
  encodingScale: number,
  encodingOffset: number,
): Promise<Float32Array> {
  const key = cacheKey(month, z, x, y);
  const cached = tempCache.get(key);
  if (cached) return cached;

  const url = `/api/temp_tiles/${z}/${x}/${y}.png?month=${month}`;
  const temps = await decodeTilePng(url, encodingScale, encodingOffset);
  tempCache.set(key, temps);
  return temps;
}

async function colorize(
  hd: Float32Array,
  temps: Float32Array | null,
  params: ModelParams,
): Promise<Blob> {
  const canvas = new OffscreenCanvas(TILE_SIZE, TILE_SIZE);
  const ctx = canvas.getContext("2d")!;
  const imageData = ctx.createImageData(TILE_SIZE, TILE_SIZE);
  const out = imageData.data;

  for (let i = 0; i < hd.length; i++) {
    const val = hd[i];
    const isNoData = isNaN(val);
    let minutes: number | null = null;
    let isInfinite = false;

    if (!isNoData) {
      let fCover = params.fCover;
      if (params.weatherAdjusted && temps) {
        const tempC = temps[i];
        if (!isNaN(tempC)) {
          fCover = weatherExposure(tempC);
        }
      }
      const result = computeMinutes(val, params.kSkin, fCover, params.kMinutes);
      minutes = result.minutes;
      isInfinite = result.isInfinite;
    }

    const [r, g, b, a] = minutesToColor(minutes, isInfinite, isNoData);
    const off = i * 4;
    out[off] = r;
    out[off + 1] = g;
    out[off + 2] = b;
    out[off + 3] = a;
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas.convertToBlob({ type: "image/png" });
}

function parseTileUrl(url: string): { month: number; z: number; x: number; y: number } {
  // sunnyd://{z}/{x}/{y}?month=M&_v=N
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

    if (!currentParams) {
      throw new Error("Model params not yet initialized");
    }

    const hd = await fetchUV(month, z, x, y, currentParams.encodingScale);

    let temps: Float32Array | null = null;
    if (currentParams.weatherAdjusted) {
      temps = await fetchTemp(
        month, z, x, y,
        currentParams.tempEncodingScale,
        currentParams.tempOffset,
      );
    }

    const blob = await colorize(hd, temps, currentParams);
    const arrayBuffer = await blob.arrayBuffer();
    return { data: arrayBuffer };
  });
}

export function clearCache() {
  uvCache.clear();
  tempCache.clear();
}
