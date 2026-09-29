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

  it('does not persist the selected point to localStorage', () => {
    const { result } = renderHook(() => useAppState());

    act(() => result.current.setSelected(-33.89, 151.27));

    const stored = JSON.parse(localStorage.getItem('sunnyd_state') ?? '{}');
    expect(stored.selLat).toBeUndefined();
    expect(stored.selLon).toBeUndefined();
  });
});

describe('useAppState skin type from shared links', () => {
  it('keeps the visitor\'s saved skin type over the link\'s', () => {
    localStorage.setItem('sunnyd_state', JSON.stringify({ skinType: 6 }));
    window.history.replaceState(null, '', '/?skin=2&month=3&lat=59.9&lon=10.7');

    const { result } = renderHook(() => useAppState());

    expect(result.current.skinType).toBe(6);
    // The rest of the shared context still applies
    expect(result.current.month).toBe(3);
    expect(result.current.selLat).toBe(59.9);
  });

  it('uses the link\'s skin type for a first-time visitor', () => {
    window.history.replaceState(null, '', '/?skin=5');

    const { result } = renderHook(() => useAppState());

    expect(result.current.skinType).toBe(5);
  });

  it('does not overwrite the saved skin type when other settings change', () => {
    localStorage.setItem('sunnyd_state', JSON.stringify({ skinType: 6 }));
    window.history.replaceState(null, '', '/?skin=2');

    const { result } = renderHook(() => useAppState());
    act(() => result.current.setMonth(8));

    expect(JSON.parse(localStorage.getItem('sunnyd_state')!).skinType).toBe(6);
  });
});

describe('useAppState skinTypeChosen', () => {
  it('starts unchosen for a new visitor, even with a shared skin type', () => {
    window.history.replaceState(null, '', '/?skin=4');

    const { result } = renderHook(() => useAppState());

    expect(result.current.skinType).toBe(4);
    expect(result.current.skinTypeChosen).toBe(false);
  });

  it('marks the skin type chosen and persists it when the visitor picks one', () => {
    const { result } = renderHook(() => useAppState());
    act(() => result.current.setSkinType(2));

    expect(result.current.skinTypeChosen).toBe(true);
    expect(JSON.parse(localStorage.getItem('sunnyd_state')!)).toMatchObject({ skinType: 2, skinTypeChosen: true });
  });

  it('keeps a deliberately chosen default type over a shared link', () => {
    localStorage.setItem('sunnyd_state', JSON.stringify({ skinType: 2, skinTypeChosen: true }));
    window.history.replaceState(null, '', '/?skin=5');

    const { result } = renderHook(() => useAppState());

    expect(result.current.skinType).toBe(2);
  });

  it('lets a shared link override an auto-saved default from older versions', () => {
    localStorage.setItem('sunnyd_state', JSON.stringify({ skinType: 2 }));
    window.history.replaceState(null, '', '/?skin=5');

    const { result } = renderHook(() => useAppState());

    expect(result.current.skinType).toBe(5);
    expect(result.current.skinTypeChosen).toBe(false);
  });
});
