export interface MethodologyResponse {
  model_version: string;
  equations: Record<string, string>;
  constants: {
    K_minutes: number;
  };
  fitzpatrick_table: Record<string, number>;
  exposure_presets: Record<string, number>;
  encoding: {
    scale: number;
    H_D_max: number;
  };
  disclaimer: string;
}

export interface EstimateResponse {
  inputs: {
    lat: number;
    lon: number;
    month: number;
    skin_type: number;
    coverage: number;
  };
  intermediate: {
    H_D_month: number;
  };
  outputs: {
    minutes_required: number | null;
    is_infinite: boolean;
  };
  constants_used: {
    K_minutes: number;
    k_skin: number;
    f_cover: number;
  };
  model_version: string;
}

export interface AppState {
  month: number;
  skinType: number;
  coverage: number;
  coveragePreset: string | null;
}

export interface ModelParams {
  fCover: number;
  kSkin: number;
  kMinutes: number;
  encodingScale: number;
}
