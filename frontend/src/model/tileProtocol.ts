import { addProtocol } from "maplibre-gl";
import type { ModelParams } from "../types";
import { minutesToColor } from "./colorScale";
import { computeMinutes, decodeRGB } from "./vitd";

const TILE_SIZE = 256;
const rawCache = new Map<string, Float32Array>();

let currentParams: ModelParams | null = null;

export function setModelParams(params: ModelParams) {
  currentParams = params;
}

function cacheKey(month: number, z: number, x: number, y: number): string {
  return `${month}/${z}/${x}/${y}`;
}

async function fetchAndDecode(
  month: number,
  z: number,
  x: number,
  y: number,
  encodingScale: number,
): Promise<Float32Array> {
  const key = cacheKey(month, z, x, y);
  const cached = rawCache.get(key);
  if (cached) return cached;

  const url = `/api/base_tiles/${z}/${x}/${y}.png?month=${month}`;
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
  const hd = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const off = i * 4;
    hd[i] = decodeRGB(pixels[off], pixels[off + 1], pixels[off + 2], pixels[off + 3], encodingScale);
  }

  rawCache.set(key, hd);
  return hd;
}

async function colorize(hd: Float32Array, params: ModelParams): Promise<Blob> {
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
      const result = computeMinutes(
        val,
        params.iuTarget,
        params.fCover,
        params.kSkin,
        params.tWindow,
        params.cIU,
        params.hMin,
      );
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

    const hd = await fetchAndDecode(month, z, x, y, currentParams.encodingScale);
    const blob = await colorize(hd, currentParams);
    const arrayBuffer = await blob.arrayBuffer();
    return { data: arrayBuffer };
  });
}

export function clearCache() {
  rawCache.clear();
}
