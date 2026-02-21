import { useCallback, useState } from "react";
import type { AppState } from "../types";

const STORAGE_KEY = "sunnyd_state";

const DEFAULTS: AppState = {
  month: 7,
  skinType: 2,
  iu: 1000,
  coverage: 0.25,
  coveragePreset: "tshirt_shorts",
};

function readURL(): Partial<AppState> {
  const p = new URLSearchParams(window.location.search);
  const result: Partial<AppState> = {};
  if (p.has("month")) result.month = Number(p.get("month"));
  if (p.has("skin")) result.skinType = Number(p.get("skin"));
  if (p.has("iu")) result.iu = Number(p.get("iu"));
  if (p.has("cov")) result.coverage = Number(p.get("cov"));
  if (p.has("preset")) result.coveragePreset = p.get("preset");
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
  p.set("iu", String(state.iu));
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
  return { ...DEFAULTS, ...stored, ...url };
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
    setIU: (iu: number) => update({ iu }),
    setCoverage: (coverage: number, coveragePreset: string | null) =>
      update({ coverage, coveragePreset }),
  };
}
