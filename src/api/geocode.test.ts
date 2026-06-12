import { describe, it, expect } from 'vitest';
import { formatPhotonFeature, parsePhotonResponse } from './geocode.ts';

function feature(
  coordinates: unknown,
  properties: Record<string, unknown> = { name: 'Place' },
) {
  return { geometry: { coordinates }, properties };
}

describe('formatPhotonFeature', () => {
  it('joins name, city, state, and country', () => {
    const label = formatPhotonFeature(
      feature([0, 0], { name: 'Bondi Beach', city: 'Sydney', state: 'NSW', country: 'Australia' }),
    );

    expect(label).toBe('Bondi Beach, Sydney, NSW, Australia');
  });

  it('skips missing and duplicate parts', () => {
    const label = formatPhotonFeature(
      feature([0, 0], { name: 'Sydney', city: 'Sydney', country: 'Australia' }),
    );

    expect(label).toBe('Sydney, Australia');
  });

  it('returns null when nothing is usable', () => {
    expect(formatPhotonFeature(feature([0, 0], {}))).toBeNull();
    expect(formatPhotonFeature(feature([0, 0], { name: '  ' }))).toBeNull();
    expect(formatPhotonFeature(feature([0, 0], { name: 42 }))).toBeNull();
  });
});

describe('parsePhotonResponse', () => {
  it('extracts label, lat, and lon from features', () => {
    const results = parsePhotonResponse({
      features: [feature([151.27, -33.89], { name: 'Bondi Beach', country: 'Australia' })],
    });

    expect(results).toEqual([{ label: 'Bondi Beach, Australia', lat: -33.89, lon: 151.27 }]);
  });

  it('skips features with invalid or out-of-range coordinates', () => {
    const results = parsePhotonResponse({
      features: [
        feature('nonsense'),
        feature([151.27]),
        feature(['x', 'y']),
        feature([200, 0]),
        feature([0, 95]),
        feature([10, 20], { name: 'Valid' }),
      ],
    });

    expect(results).toEqual([{ label: 'Valid', lat: 20, lon: 10 }]);
  });

  it('skips features without a usable label', () => {
    const results = parsePhotonResponse({ features: [feature([10, 20], {})] });

    expect(results).toEqual([]);
  });

  it('returns empty for malformed payloads', () => {
    expect(parsePhotonResponse(null)).toEqual([]);
    expect(parsePhotonResponse({})).toEqual([]);
    expect(parsePhotonResponse({ features: 'no' })).toEqual([]);
  });

  it('caps the number of results', () => {
    const many = Array.from({ length: 20 }, (_, i) =>
      feature([10, 20], { name: `Place ${i}` }),
    );

    expect(parsePhotonResponse({ features: many })).toHaveLength(5);
  });
});
