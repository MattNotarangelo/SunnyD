/**
 * Per-month binary grid loader, tile sampler, and point sampler.
 *
 * Each file (e.g. /data/uv_3.bin) contains a 20-byte header followed by
 * one month of spatially delta-encoded nlat×nlon values.
 *
 * Header (little-endian):
 *   nlat(u16) nlon(u16) lat0(f32) latStep(f32) lon0(f32) lonStep(f32)
 *
 * Data: column 0 is absolute uint16 (stored as int16 on disk),
 *       columns 1+ are int16 deltas from the left neighbor.
 * 0xFFFF = no-data.
 */

const HEADER_BYTES = 20;
const NODATA_U16 = 0xffff;
const TILE_SIZE = 256;

interface GridHeader {
  nlat: number;
  nlon: number;
  lat0: number;
  latStep: number;
  lon0: number;
  lonStep: number;
}

interface MonthGrid {
  header: GridHeader;
  data: Uint16Array;
}

type Layer = "uv" | "temp";

function parseHeader(buf: ArrayBuffer): GridHeader {
  const view = new DataView(buf, 0, HEADER_BYTES);
  return {
    nlat: view.getUint16(0, true),
    nlon: view.getUint16(2, true),
    lat0: view.getFloat32(4, true),
    latStep: view.getFloat32(8, true),
    lon0: view.getFloat32(12, true),
    lonStep: view.getFloat32(16, true),
  };
}

// ── Progress tracking ────────────────────────────────────────────────

const TOTAL_GRIDS = 24; // 12 months × 2 layers

type LoadingCallback = (loaded: number, total: number) => void;
let onProgress: LoadingCallback | null = null;

/** Register a callback to observe grid loading progress (loaded out of 24). */
export function setProgressCallback(cb: LoadingCallback | null): void {
  onProgress = cb;
}

function notifyProgress(): void {
  if (!onProgress) return;
  let loaded = 0;
  for (let m = 1; m <= 12; m++) {
    if (cache.uv.has(m)) loaded++;
    if (cache.temp.has(m)) loaded++;
  }
  onProgress(loaded, TOTAL_GRIDS);
}

// ── Per-month cache ──────────────────────────────────────────────────

const cache: Record<Layer, Map<number, MonthGrid>> = {
  uv: new Map(),
  temp: new Map(),
};

const inflight: Record<Layer, Map<number, Promise<MonthGrid>>> = {
  uv: new Map(),
  temp: new Map(),
};

// ── Retry logic ─────────────────────────────────────────────────────

const MAX_RETRIES = 2;
const BASE_DELAY_MS = 1000;

function isRetryable(error: unknown): boolean {
  if (error instanceof Error) {
    // Retry on network errors (TypeError from fetch) or 5xx status codes
    if (error.message.includes("fetch") || error.message.includes("network")) {
      return true;
    }
    // Match our own "Grid fetch failed" messages with 5xx status
    const statusMatch = error.message.match(/\((\d+)\)$/);
    if (statusMatch) {
      const status = parseInt(statusMatch[1], 10);
      return status >= 500;
    }
  }
  return false;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Decode spatial delta encoding: column 0 is absolute (uint16 reinterpreted
 * as int16), columns 1+ are int16 deltas from the left neighbor.
 */
function decodeSpatialDelta(buf: ArrayBuffer, header: GridHeader): Uint16Array {
  const { nlat, nlon } = header;
  const i16 = new Int16Array(buf, HEADER_BYTES);
  const out = new Uint16Array(nlat * nlon);

  for (let row = 0; row < nlat; row++) {
    const base = row * nlon;
    let acc = i16[base] & 0xffff;
    out[base] = acc;
    for (let col = 1; col < nlon; col++) {
      acc = (acc + i16[base + col]) & 0xffff;
      out[base + col] = acc;
    }
  }
  return out;
}

async function fetchWithRetry(url: string, layer: Layer, month: number): Promise<MonthGrid> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const resp = await fetch(url);
      if (!resp.ok) {
        throw new Error(`Grid fetch failed: ${layer}_${month}.bin (${resp.status})`);
      }
      const buf = await resp.arrayBuffer();
      const header = parseHeader(buf);
      const data = decodeSpatialDelta(buf, header);
      return { header, data };
    } catch (err) {
      lastError = err;
      if (attempt < MAX_RETRIES && isRetryable(err)) {
        await delay(BASE_DELAY_MS * 2 ** attempt);
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

async function fetchMonthGrid(layer: Layer, month: number): Promise<MonthGrid> {
  const existing = cache[layer].get(month);
  if (existing) return existing;

  let promise = inflight[layer].get(month);
  if (!promise) {
    const url = `${import.meta.env.BASE_URL}data/${layer}_${month}.bin`;
    promise = fetchWithRetry(url, layer, month)
      .then((grid) => {
        cache[layer].set(month, grid);
        notifyProgress();
        return grid;
      })
      .finally(() => {
        inflight[layer].delete(month);
      });
    inflight[layer].set(month, promise);
  }
  return promise;
}

// ── Public loading API ───────────────────────────────────────────────

/** Load UV + temp grids for a specific month. */
export async function loadMonth(month: number): Promise<void> {
  await Promise.all([fetchMonthGrid("uv", month), fetchMonthGrid("temp", month)]);
}

/** Whether both UV and temp grids are loaded for a given month. */
export function monthReady(month: number): boolean {
  return cache.uv.has(month) && cache.temp.has(month);
}

/** Whether all 12 months are loaded for both layers. */
export function allMonthsReady(): boolean {
  for (let m = 1; m <= 12; m++) {
    if (!cache.uv.has(m) || !cache.temp.has(m)) return false;
  }
  return true;
}

/** Background-load all remaining months (non-blocking). */
export function prefetchAllMonths(): void {
  for (let m = 1; m <= 12; m++) {
    fetchMonthGrid("uv", m);
    fetchMonthGrid("temp", m);
  }
}

/** Load all 12 months for both layers. Returns when complete. */
export async function loadAllMonths(): Promise<void> {
  const promises: Promise<MonthGrid>[] = [];
  for (let m = 1; m <= 12; m++) {
    promises.push(fetchMonthGrid("uv", m));
    promises.push(fetchMonthGrid("temp", m));
  }
  await Promise.all(promises);
}

// ── Mercator helpers ─────────────────────────────────────────────────

function mercatorLatArray(z: number, y: number, height: number): Float32Array {
  const n = 2 ** z;
  const lats = new Float32Array(height);
  for (let row = 0; row < height; row++) {
    const yFrac = y + (row + 0.5) / height;
    const latRad = Math.atan(Math.sinh(Math.PI * (1 - (2 * yFrac) / n)));
    lats[row] = (latRad * 180) / Math.PI;
  }
  return lats;
}

function tileLonArray(z: number, x: number, width: number): Float32Array {
  const n = 2 ** z;
  const lonMin = (x / n) * 360 - 180;
  const lonMax = ((x + 1) / n) * 360 - 180;
  const lons = new Float32Array(width);
  const step = (lonMax - lonMin) / width;
  for (let col = 0; col < width; col++) {
    lons[col] = lonMin + (col + 0.5) * step;
  }
  return lons;
}

// ── Grid sampling ────────────────────────────────────────────────────

function nearestIndex(value: number, origin: number, step: number, count: number): number {
  const idx = Math.round((value - origin) / step);
  return idx < 0 ? 0 : idx >= count ? count - 1 : idx;
}

/**
 * Sample a 256×256 tile from the cached grid (must already be loaded).
 * Returns a Uint16Array of TILE_SIZE² raw encoded values.
 */
export function sampleTile(
  layer: Layer,
  month: number,
  z: number,
  x: number,
  y: number,
): Uint16Array {
  const grid = cache[layer].get(month);
  if (!grid) throw new Error(`Grid not loaded: ${layer} month ${month}`);

  const { nlat, nlon, lat0, latStep, lon0, lonStep } = grid.header;

  const lats = mercatorLatArray(z, y, TILE_SIZE);
  const lons = tileLonArray(z, x, TILE_SIZE);

  const rowIndices = new Int32Array(TILE_SIZE);
  for (let r = 0; r < TILE_SIZE; r++) {
    rowIndices[r] = nearestIndex(lats[r], lat0, latStep, nlat);
  }
  const colIndices = new Int32Array(TILE_SIZE);
  for (let c = 0; c < TILE_SIZE; c++) {
    colIndices[c] = nearestIndex(lons[c], lon0, lonStep, nlon);
  }

  const out = new Uint16Array(TILE_SIZE * TILE_SIZE);
  for (let r = 0; r < TILE_SIZE; r++) {
    const rowBase = rowIndices[r] * nlon;
    const outBase = r * TILE_SIZE;
    for (let c = 0; c < TILE_SIZE; c++) {
      out[outBase + c] = grid.data[rowBase + colIndices[c]];
    }
  }
  return out;
}

/**
 * Look up a single decoded value from the cached grid.
 * Returns the physical value (J/m²/day for UV, °C for temp) or NaN.
 */
export function samplePoint(
  layer: Layer,
  month: number,
  lat: number,
  lon: number,
  encodingScale: number,
  encodingOffset: number,
): number {
  const grid = cache[layer].get(month);
  if (!grid) return NaN;

  const { nlat, nlon, lat0, latStep, lon0, lonStep } = grid.header;
  const row = nearestIndex(lat, lat0, latStep, nlat);
  const col = nearestIndex(lon, lon0, lonStep, nlon);
  const raw = grid.data[row * nlon + col];
  if (raw === NODATA_U16) return NaN;
  return raw / encodingScale - encodingOffset;
}
