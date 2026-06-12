import { useCallback, useState } from "react";
import type { AppState } from "../types";

const STORAGE_KEY = "sunnyd_state";

const DEFAULTS: AppState = {
  month: new Date().getMonth() + 1,
  skinType: 2,
  coverage: 0.25,
  coveragePreset: "weather_adjusted",
  colorblindMode: false,
  cloudAdjusted: false,
  selLat: null,
  selLon: null,
};

function clampInt(value: unknown, min: number, max: number): number | null {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  const i = Math.round(n);
  return Math.max(min, Math.min(max, i));
}

function clampFraction(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(1, n));
}

function clampCoord(value: unknown, limit: number): number | null {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  if (n < -limit || n > limit) return null;
  return n;
}

function parsePreset(value: unknown): string | null | undefined {
  if (value === null) return null;
  if (typeof value === "string") return value;
  return undefined;
}

function readURL(): Partial<AppState> {
  const p = new URLSearchParams(window.location.search);
  const result: Partial<AppState> = {};
  if (p.has("month")) {
    const month = clampInt(p.get("month"), 1, 12);
    if (month !== null) result.month = month;
  }
  if (p.has("skin")) {
    const skinType = clampInt(p.get("skin"), 1, 6);
    if (skinType !== null) result.skinType = skinType;
  }
  if (p.has("cov")) {
    const coverage = clampFraction(p.get("cov"));
    if (coverage !== null) result.coverage = coverage;
  }
  if (p.has("preset")) {
    const preset = parsePreset(p.get("preset"));
    if (preset !== undefined) result.coveragePreset = preset;
  }
  if (p.has("cb")) {
    result.colorblindMode = p.get("cb") === "1";
  }
  if (p.has("sky")) {
    result.cloudAdjusted = p.get("sky") === "cloud";
  }
  if (p.has("lat") && p.has("lon")) {
    const lat = clampCoord(p.get("lat"), 90);
    const lon = clampCoord(p.get("lon"), 180);
    if (lat !== null && lon !== null) {
      result.selLat = lat;
      result.selLon = lon;
    }
  }
  return result;
}

function readStorage(): Partial<AppState> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return {};
}

function writeURL(state: AppState) {
  const p = new URLSearchParams();
  p.set("month", String(state.month));
  p.set("skin", String(state.skinType));
  p.set("cov", String(state.coverage));
  if (state.coveragePreset) p.set("preset", state.coveragePreset);
  if (state.colorblindMode) p.set("cb", "1");
  if (state.cloudAdjusted) p.set("sky", "cloud");
  if (state.selLat !== null && state.selLon !== null) {
    p.set("lat", String(state.selLat));
    p.set("lon", String(state.selLon));
  }
  // Preserve the hash — the map viewport lives there (MapLibre hash option)
  window.history.replaceState(null, "", `?${p.toString()}${window.location.hash}`);
}

function writeStorage(state: AppState) {
  try {
    // The selected point is shareable URL state, not a stored preference
    const prefs = {
      month: state.month,
      skinType: state.skinType,
      coverage: state.coverage,
      coveragePreset: state.coveragePreset,
      colorblindMode: state.colorblindMode,
      cloudAdjusted: state.cloudAdjusted,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    /* ignore */
  }
}

function persist(state: AppState) {
  writeURL(state);
  writeStorage(state);
}

function initState(): AppState {
  const url = readURL();
  const stored = readStorage();
  const merged = { ...DEFAULTS, ...stored, ...url };
  const month = clampInt(merged.month, 1, 12) ?? DEFAULTS.month;
  const skinType = clampInt(merged.skinType, 1, 6) ?? DEFAULTS.skinType;
  const coverage = clampFraction(merged.coverage) ?? DEFAULTS.coverage;
  const parsedPreset = parsePreset(merged.coveragePreset);
  const coveragePreset = parsedPreset === undefined ? DEFAULTS.coveragePreset : parsedPreset;
  const colorblindMode = typeof merged.colorblindMode === "boolean" ? merged.colorblindMode : DEFAULTS.colorblindMode;
  const cloudAdjusted = typeof merged.cloudAdjusted === "boolean" ? merged.cloudAdjusted : DEFAULTS.cloudAdjusted;
  // The selected point only ever comes from the URL
  const selLat = clampCoord(url.selLat, 90);
  const selLon = clampCoord(url.selLon, 180);
  const hasPoint = selLat !== null && selLon !== null;
  return {
    month,
    skinType,
    coverage,
    coveragePreset,
    colorblindMode,
    cloudAdjusted,
    selLat: hasPoint ? selLat : null,
    selLon: hasPoint ? selLon : null,
  };
}

export function useAppState() {
  const [state, setStateRaw] = useState<AppState>(initState);

  const update = useCallback((patch: Partial<AppState>) => {
    setStateRaw((prev) => {
      const next = { ...prev, ...patch };
      persist(next);
      return next;
    });
  }, []);

  return {
    ...state,
    setMonth: (month: number) => update({ month }),
    setSkinType: (skinType: number) => update({ skinType }),
    setCoverage: (coverage: number, coveragePreset: string | null) =>
      update({ coverage, coveragePreset }),
    setColorblindMode: (colorblindMode: boolean) => update({ colorblindMode }),
    setCloudAdjusted: (cloudAdjusted: boolean) => update({ cloudAdjusted }),
    setSelected: (selLat: number | null, selLon: number | null) =>
      update({ selLat, selLon }),
  };
}
