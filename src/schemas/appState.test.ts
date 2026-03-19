import { describe, it, expect } from "vitest";
import {
  appStateSchema,
  urlParamsSchema,
  storageSchema,
  DEFAULTS,
  VALID_PRESETS,
} from "./appState.ts";

describe("DEFAULTS", () => {
  it("should have valid default values", () => {
    const result = appStateSchema.safeParse(DEFAULTS);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(DEFAULTS);
    }
  });
});

describe("appStateSchema", () => {
  describe("month", () => {
    it("should accept valid months 1-12", () => {
      for (const month of [1, 6, 12]) {
        const result = appStateSchema.safeParse({
          ...DEFAULTS,
          month,
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.month).toBe(month);
        }
      }
    });

    it("should reject month 0 and fall back to default", () => {
      const result = appStateSchema.safeParse({ ...DEFAULTS, month: 0 });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.month).toBe(DEFAULTS.month);
      }
    });

    it("should reject month 13 and fall back to default", () => {
      const result = appStateSchema.safeParse({ ...DEFAULTS, month: 13 });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.month).toBe(DEFAULTS.month);
      }
    });

    it("should reject non-numeric month and fall back to default", () => {
      const result = appStateSchema.safeParse({ ...DEFAULTS, month: "abc" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.month).toBe(DEFAULTS.month);
      }
    });

    it("should coerce string number to month", () => {
      const result = appStateSchema.safeParse({ ...DEFAULTS, month: "6" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.month).toBe(6);
      }
    });

    it("should round fractional months to nearest int", () => {
      const result = appStateSchema.safeParse({ ...DEFAULTS, month: 3.7 });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.month).toBe(4);
      }
    });

    it("should reject negative month and fall back to default", () => {
      const result = appStateSchema.safeParse({ ...DEFAULTS, month: -1 });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.month).toBe(DEFAULTS.month);
      }
    });
  });

  describe("skinType", () => {
    it("should accept valid skin types 1-6", () => {
      for (const skinType of [1, 3, 6]) {
        const result = appStateSchema.safeParse({
          ...DEFAULTS,
          skinType,
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.skinType).toBe(skinType);
        }
      }
    });

    it("should reject skinType 0 and fall back to default", () => {
      const result = appStateSchema.safeParse({ ...DEFAULTS, skinType: 0 });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.skinType).toBe(DEFAULTS.skinType);
      }
    });

    it("should reject skinType 7 and fall back to default", () => {
      const result = appStateSchema.safeParse({ ...DEFAULTS, skinType: 7 });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.skinType).toBe(DEFAULTS.skinType);
      }
    });

    it("should coerce string skinType", () => {
      const result = appStateSchema.safeParse({ ...DEFAULTS, skinType: "4" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.skinType).toBe(4);
      }
    });

    it("should reject non-numeric skinType and fall back to default", () => {
      const result = appStateSchema.safeParse({
        ...DEFAULTS,
        skinType: "abc",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.skinType).toBe(DEFAULTS.skinType);
      }
    });
  });

  describe("coverage", () => {
    it("should accept valid coverage 0 to 1", () => {
      for (const coverage of [0, 0.25, 0.5, 0.85, 1]) {
        const result = appStateSchema.safeParse({
          ...DEFAULTS,
          coverage,
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.coverage).toBe(coverage);
        }
      }
    });

    it("should reject negative coverage and fall back to default", () => {
      const result = appStateSchema.safeParse({
        ...DEFAULTS,
        coverage: -0.5,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.coverage).toBe(DEFAULTS.coverage);
      }
    });

    it("should reject coverage > 1 and fall back to default", () => {
      const result = appStateSchema.safeParse({
        ...DEFAULTS,
        coverage: 1.5,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.coverage).toBe(DEFAULTS.coverage);
      }
    });

    it("should coerce string coverage", () => {
      const result = appStateSchema.safeParse({
        ...DEFAULTS,
        coverage: "0.75",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.coverage).toBe(0.75);
      }
    });

    it("should reject non-numeric coverage and fall back to default", () => {
      const result = appStateSchema.safeParse({
        ...DEFAULTS,
        coverage: "abc",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.coverage).toBe(DEFAULTS.coverage);
      }
    });
  });

  describe("coveragePreset", () => {
    it("should accept all valid presets", () => {
      for (const preset of VALID_PRESETS) {
        const result = appStateSchema.safeParse({
          ...DEFAULTS,
          coveragePreset: preset,
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.coveragePreset).toBe(preset);
        }
      }
    });

    it("should accept null for custom coverage", () => {
      const result = appStateSchema.safeParse({
        ...DEFAULTS,
        coveragePreset: null,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.coveragePreset).toBeNull();
      }
    });

    it("should reject invalid preset string and fall back to default", () => {
      const result = appStateSchema.safeParse({
        ...DEFAULTS,
        coveragePreset: "invalid_preset",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.coveragePreset).toBe(DEFAULTS.coveragePreset);
      }
    });

    it("should reject numeric preset and fall back to default", () => {
      const result = appStateSchema.safeParse({
        ...DEFAULTS,
        coveragePreset: 42,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.coveragePreset).toBe(DEFAULTS.coveragePreset);
      }
    });
  });

  describe("full object validation", () => {
    it("should return all defaults when given empty object", () => {
      const result = appStateSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(DEFAULTS);
      }
    });

    it("should return all defaults when given completely invalid input", () => {
      const result = appStateSchema.safeParse({
        month: "garbage",
        skinType: "garbage",
        coverage: "garbage",
        coveragePreset: 999,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(DEFAULTS);
      }
    });

    it("should preserve valid fields and default invalid ones", () => {
      const result = appStateSchema.safeParse({
        month: 3,
        skinType: "invalid",
        coverage: 0.5,
        coveragePreset: null,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.month).toBe(3);
        expect(result.data.skinType).toBe(DEFAULTS.skinType);
        expect(result.data.coverage).toBe(0.5);
        expect(result.data.coveragePreset).toBeNull();
      }
    });
  });
});

describe("urlParamsSchema", () => {
  it("should parse valid URL params", () => {
    const result = urlParamsSchema.safeParse({
      month: "6",
      skin: "3",
      cov: "0.5",
      preset: "swimsuit",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        month: 6,
        skinType: 3,
        coverage: 0.5,
        coveragePreset: "swimsuit",
      });
    }
  });

  it("should return empty partial for missing params", () => {
    const result = urlParamsSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({});
    }
  });

  it("should return partial with only valid fields", () => {
    const result = urlParamsSchema.safeParse({
      month: "3",
      skin: "invalid",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.month).toBe(3);
      expect(result.data).not.toHaveProperty("skinType");
    }
  });

  it("should exclude out-of-range month", () => {
    const result = urlParamsSchema.safeParse({
      month: "0",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty("month");
    }
  });

  it("should exclude out-of-range coverage", () => {
    const result = urlParamsSchema.safeParse({
      cov: "1.5",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty("coverage");
    }
  });

  it("should handle null preset for custom coverage", () => {
    const result = urlParamsSchema.safeParse({
      preset: null,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.coveragePreset).toBeNull();
    }
  });

  it("should exclude invalid preset strings", () => {
    const result = urlParamsSchema.safeParse({
      preset: "bogus",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty("coveragePreset");
    }
  });
});

describe("storageSchema", () => {
  it("should parse valid stored state", () => {
    const stored = {
      month: 10,
      skinType: 4,
      coverage: 0.85,
      coveragePreset: "swimsuit",
    };
    const result = storageSchema.safeParse(stored);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(stored);
    }
  });

  it("should return empty partial for empty object", () => {
    const result = storageSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({});
    }
  });

  it("should strip invalid fields and keep valid ones", () => {
    const result = storageSchema.safeParse({
      month: 5,
      skinType: 99,
      coverage: 0.5,
      coveragePreset: "face_hands",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.month).toBe(5);
      expect(result.data).not.toHaveProperty("skinType");
      expect(result.data.coverage).toBe(0.5);
      expect(result.data.coveragePreset).toBe("face_hands");
    }
  });

  it("should handle non-object input gracefully", () => {
    const result = storageSchema.safeParse("not an object");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({});
    }
  });

  it("should handle null input gracefully", () => {
    const result = storageSchema.safeParse(null);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({});
    }
  });

  it("should handle array input gracefully", () => {
    const result = storageSchema.safeParse([1, 2, 3]);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({});
    }
  });
});
