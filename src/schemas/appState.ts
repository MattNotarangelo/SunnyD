import { z } from "zod";
import type { AppState } from "../types.ts";

export const VALID_PRESETS = [
  "face_hands",
  "tshirt_shorts",
  "swimsuit",
  "weather_adjusted",
] as const;

export type CoveragePreset = (typeof VALID_PRESETS)[number];

const DEFAULT_PRESET: CoveragePreset = "weather_adjusted";

export const DEFAULTS: AppState = {
  month: 7,
  skinType: 2,
  coverage: 0.25,
  coveragePreset: DEFAULT_PRESET,
};

// --- Strict field schemas (no fallback, for partial parsing) ---

const strictMonthSchema = z.coerce
  .number()
  .transform(Math.round)
  .pipe(z.number().int().min(1).max(12));

const strictSkinTypeSchema = z.coerce
  .number()
  .transform(Math.round)
  .pipe(z.number().int().min(1).max(6));

const strictCoverageSchema = z.coerce.number().min(0).max(1);

const strictPresetSchema = z.enum(VALID_PRESETS).nullable();

// --- Full app state schema (all fields required, with per-field catch defaults) ---

export const appStateSchema = z.object({
  month: strictMonthSchema.catch(DEFAULTS.month).default(DEFAULTS.month),
  skinType: strictSkinTypeSchema
    .catch(DEFAULTS.skinType)
    .default(DEFAULTS.skinType),
  coverage: strictCoverageSchema
    .catch(DEFAULTS.coverage)
    .default(DEFAULTS.coverage),
  coveragePreset: strictPresetSchema
    .catch(DEFAULT_PRESET)
    .default(DEFAULT_PRESET),
});

// --- URL params schema (partial: only valid fields included in result) ---

// Each field catches to undefined on failure, so invalid fields are excluded
// while valid sibling fields are preserved.
const optionalMonthSchema = strictMonthSchema.optional().catch(undefined);
const optionalSkinTypeSchema = strictSkinTypeSchema.optional().catch(undefined);
const optionalCoverageSchema = strictCoverageSchema.optional().catch(undefined);
const optionalPresetSchema = strictPresetSchema.optional().catch(undefined);

export const urlParamsSchema = z
  .object({
    month: optionalMonthSchema,
    skin: optionalSkinTypeSchema,
    cov: optionalCoverageSchema,
    preset: optionalPresetSchema,
  })
  .catch({})
  .transform((raw) => {
    const result: Partial<AppState> = {};
    if (raw.month !== undefined) result.month = raw.month;
    if (raw.skin !== undefined) result.skinType = raw.skin;
    if (raw.cov !== undefined) result.coverage = raw.cov;
    if (raw.preset !== undefined) result.coveragePreset = raw.preset;
    return result;
  });

// --- Storage schema (partial: gracefully handles corrupt localStorage) ---

export const storageSchema = z
  .object({
    month: optionalMonthSchema,
    skinType: optionalSkinTypeSchema,
    coverage: optionalCoverageSchema,
    coveragePreset: optionalPresetSchema,
  })
  .catch({})
  .transform((raw) => {
    const result: Partial<AppState> = {};
    if (raw.month !== undefined) result.month = raw.month;
    if (raw.skinType !== undefined) result.skinType = raw.skinType;
    if (raw.coverage !== undefined) result.coverage = raw.coverage;
    if (raw.coveragePreset !== undefined)
      result.coveragePreset = raw.coveragePreset;
    return result;
  });

// --- Patch schema (for validating update() calls) ---

export const patchSchema = z.object({
  month: strictMonthSchema.optional(),
  skinType: strictSkinTypeSchema.optional(),
  coverage: strictCoverageSchema.optional(),
  coveragePreset: strictPresetSchema.optional(),
});
