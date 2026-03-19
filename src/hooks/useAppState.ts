import { useCallback, useState } from "react";
import type { AppState } from "../types.ts";
import {
  appStateSchema,
  urlParamsSchema,
  storageSchema,
  patchSchema,
  DEFAULTS,
} from "../schemas/appState.ts";

const STORAGE_KEY = "sunnyd_state";

function readURL(): Partial<AppState> {
  const p = new URLSearchParams(window.location.search);
  const raw: Record<string, string | null> = {};
  if (p.has("month")) raw.month = p.get("month");
  if (p.has("skin")) raw.skin = p.get("skin");
  if (p.has("cov")) raw.cov = p.get("cov");
  if (p.has("preset")) raw.preset = p.get("preset");
  return urlParamsSchema.parse(raw);
}

function readStorage(): Partial<AppState> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      return storageSchema.parse(parsed);
    }
  } catch {
    /* corrupt or missing localStorage is fine */
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
    /* quota exceeded or private browsing is fine */
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
  return appStateSchema.parse(merged);
}

export function useAppState() {
  const [state, setStateRaw] = useState<AppState>(initState);

  const update = useCallback((patch: Partial<AppState>) => {
    setStateRaw((prev) => {
      const validated = patchSchema.safeParse(patch);
      const safePatch = validated.success ? validated.data : {};
      const next = appStateSchema.parse({ ...prev, ...safePatch });
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
