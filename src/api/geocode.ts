const PHOTON_ENDPOINT = "https://photon.komoot.io/api/";
const RESULT_LIMIT = 5;

export interface GeocodeResult {
  label: string;
  lat: number;
  lon: number;
}

interface PhotonFeature {
  geometry?: { coordinates?: unknown };
  properties?: {
    name?: unknown;
    city?: unknown;
    state?: unknown;
    country?: unknown;
  };
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function formatPhotonFeature(feature: PhotonFeature): string | null {
  const props = feature.properties ?? {};
  const parts: string[] = [];
  for (const value of [props.name, props.city, props.state, props.country]) {
    const s = asString(value);
    if (s && !parts.includes(s)) parts.push(s);
  }
  return parts.length ? parts.join(", ") : null;
}

export function parsePhotonResponse(data: unknown): GeocodeResult[] {
  const features = (data as { features?: unknown })?.features;
  if (!Array.isArray(features)) return [];

  const results: GeocodeResult[] = [];
  for (const feature of features as PhotonFeature[]) {
    const coords = feature?.geometry?.coordinates;
    if (!Array.isArray(coords) || coords.length < 2) continue;
    const lon = Number(coords[0]);
    const lat = Number(coords[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) continue;

    const label = formatPhotonFeature(feature);
    if (!label) continue;

    results.push({ label, lat, lon });
    if (results.length >= RESULT_LIMIT) break;
  }
  return results;
}

export async function searchPlaces(
  query: string,
  signal?: AbortSignal,
): Promise<GeocodeResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const url = `${PHOTON_ENDPOINT}?q=${encodeURIComponent(q)}&limit=${RESULT_LIMIT}`;
  const res = await fetch(url, { signal });
  if (!res.ok) {
    throw new Error(`Geocoding failed (${res.status})`);
  }
  return parsePhotonResponse(await res.json());
}

const PHOTON_REVERSE_ENDPOINT = "https://photon.komoot.io/reverse";
/** Settlement-level feature types whose own name is the place name. */
const SETTLEMENT_TYPES = new Set(["city", "town", "village", "hamlet", "locality", "district"]);

interface PhotonReverseProperties {
  name?: unknown;
  type?: unknown;
  city?: unknown;
  county?: unknown;
  state?: unknown;
  country?: unknown;
}

/**
 * Human place name for a reverse-geocoded point: the town or city, then the
 * region and country. Streets and buildings are skipped; a map click means
 * "around here", not a street address.
 */
export function formatReverseFeature(feature: { properties?: PhotonReverseProperties }): string | null {
  const props = feature.properties ?? {};
  const type = asString(props.type);
  const settlement =
    asString(props.city) ?? (type && SETTLEMENT_TYPES.has(type) ? asString(props.name) : null) ?? asString(props.county);
  const parts: string[] = [];
  for (const value of [settlement, asString(props.state), asString(props.country)]) {
    if (value && !parts.includes(value)) parts.push(value);
  }
  return parts.length ? parts.join(", ") : null;
}

const reverseCache = new Map<string, string | null>();

/** Place name near a point, or null (open sea, no data, or lookup failed). */
export async function reverseGeocode(
  lat: number,
  lon: number,
  signal?: AbortSignal,
): Promise<string | null> {
  // ~1 km grid: nearby clicks share a name and a request
  const key = `${lat.toFixed(2)},${lon.toFixed(2)}`;
  if (reverseCache.has(key)) return reverseCache.get(key)!;

  const url = `${PHOTON_REVERSE_ENDPOINT}?lat=${lat}&lon=${lon}`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Reverse geocoding failed (${res.status})`);
  const data = (await res.json()) as { features?: unknown };
  const first = Array.isArray(data.features) ? (data.features[0] as { properties?: PhotonReverseProperties }) : undefined;
  const label = first ? formatReverseFeature(first) : null;
  reverseCache.set(key, label);
  return label;
}
