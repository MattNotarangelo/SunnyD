import { useCallback, useState } from "react";
import type { AppState } from "../types";

const STORAGE_KEY = "sunnyd_state";

const DEFAULTS: AppState = {
  month: 7,
  skinType: 2,
  coverage: 0.25,
  coveragePreset: "weather_adjusted",
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
  window.history.replaceState(null, "", `?${p.toString()}`);
}

function writeStorage(state: AppState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
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
  return { month, skinType, coverage, coveragePreset };
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
  };
}
