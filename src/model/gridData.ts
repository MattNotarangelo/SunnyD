/**
 * Per-month binary grid loader, tile sampler, and point sampler.
 *
 * Each file (e.g. /data/uv_3.bin) contains a 20-byte header followed by
 * one month of nlat×nlon uint16 values.
 *
 * Header (little-endian):
 *   nlat(u16) nlon(u16) lat0(f32) latStep(f32) lon0(f32) lonStep(f32)
 *
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

// ── Per-month cache ──────────────────────────────────────────────────

const cache: Record<Layer, Map<number, MonthGrid>> = {
  uv: new Map(),
  temp: new Map(),
};

const inflight: Record<Layer, Map<number, Promise<MonthGrid>>> = {
  uv: new Map(),
  temp: new Map(),
};

async function fetchMonthGrid(layer: Layer, month: number): Promise<MonthGrid> {
  const existing = cache[layer].get(month);
  if (existing) return existing;

  let promise = inflight[layer].get(month);
  if (!promise) {
    promise = fetch(`${import.meta.env.BASE_URL}data/${layer}_${month}.bin`)
      .then(async (resp) => {
        if (!resp.ok) throw new Error(`Grid fetch failed: ${layer}_${month}.bin (${resp.status})`);
        const buf = await resp.arrayBuffer();
        const header = parseHeader(buf);
        const data = new Uint16Array(buf, HEADER_BYTES);
        const grid: MonthGrid = { header, data };
        cache[layer].set(month, grid);
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
