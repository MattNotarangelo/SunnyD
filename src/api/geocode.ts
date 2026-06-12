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
