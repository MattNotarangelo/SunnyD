import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAppState } from './useAppState.ts';

beforeEach(() => {
  localStorage.clear();
  window.history.replaceState(null, '', '/');
});

describe('useAppState selected point', () => {
  it('defaults to no selected point', () => {
    const { result } = renderHook(() => useAppState());

    expect(result.current.selLat).toBeNull();
    expect(result.current.selLon).toBeNull();
  });

  it('restores a selected point from the URL', () => {
    window.history.replaceState(null, '', '/?lat=45.5&lon=-120.25');

    const { result } = renderHook(() => useAppState());

    expect(result.current.selLat).toBe(45.5);
    expect(result.current.selLon).toBe(-120.25);
  });

  it('ignores out-of-range coordinates', () => {
    window.history.replaceState(null, '', '/?lat=95&lon=200');

    const { result } = renderHook(() => useAppState());

    expect(result.current.selLat).toBeNull();
    expect(result.current.selLon).toBeNull();
  });

  it('writes the selected point to the URL', () => {
    const { result } = renderHook(() => useAppState());

    act(() => result.current.setSelected(-33.89, 151.27));

    const p = new URLSearchParams(window.location.search);
    expect(p.get('lat')).toBe('-33.89');
    expect(p.get('lon')).toBe('151.27');
  });

  it('removes the selected point from the URL when cleared', () => {
    window.history.replaceState(null, '', '/?lat=45&lon=10');
    const { result } = renderHook(() => useAppState());

    act(() => result.current.setSelected(null, null));

    const p = new URLSearchParams(window.location.search);
    expect(p.get('lat')).toBeNull();
    expect(p.get('lon')).toBeNull();
  });

  it('preserves the location hash when persisting state', () => {
    window.history.replaceState(null, '', '/#map=4/45/10');
    const { result } = renderHook(() => useAppState());

    act(() => result.current.setMonth(7));

    expect(window.location.hash).toBe('#map=4/45/10');
    expect(new URLSearchParams(window.location.search).get('month')).toBe('7');
  });

  it('restores cloud-adjusted mode from the URL and persists it', () => {
    window.history.replaceState(null, '', '/?sky=cloud');

    const { result } = renderHook(() => useAppState());

    expect(result.current.cloudAdjusted).toBe(true);

    act(() => result.current.setCloudAdjusted(false));

    expect(new URLSearchParams(window.location.search).get('sky')).toBeNull();
  });

  it('does not persist the selected point to localStorage', () => {
    const { result } = renderHook(() => useAppState());

    act(() => result.current.setSelected(-33.89, 151.27));

    const stored = JSON.parse(localStorage.getItem('sunnyd_state') ?? '{}');
    expect(stored.selLat).toBeUndefined();
    expect(stored.selLon).toBeUndefined();
  });
});
