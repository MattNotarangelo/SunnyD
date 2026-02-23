import type { MethodologyResponse } from "../types";

export const METHODOLOGY: MethodologyResponse = {
  model_version: "2.0.0",
  equations: {
    t_minutes: "(K_minutes * k_skin) / (H_D_month * f_cover)",
    infinity_rule: "H_D_month <= 0 OR f_cover <= 0 → Infinity",
  },
  constants: {
    K_minutes: 20.2,
  },
  fitzpatrick_table: {
    "1": 1.0,
    "2": 1.2,
    "3": 1.5,
    "4": 2.0,
    "5": 2.8,
    "6": 3.8,
  },
  exposure_presets: {
    face_hands: 0.05,
    tshirt_shorts: 0.25,
    swimsuit: 0.85,
  },
  encoding: {
    scale: 3,
    H_D_max: 20_000,
    temp_encoding_scale: 100,
    temp_offset: 50,
  },
  disclaimer:
    "This is an EDUCATIONAL MODEL. " +
    "It is NOT medical advice. " +
    "It does NOT diagnose vitamin D deficiency.",
};
