export interface MethodologyResponse {
  model_version: string;
  equations: Record<string, string>;
  constants: {
    T_window: number;
    C_IU: number;
    H_min: number;
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
    iu_target: number;
    coverage: number;
  };
  intermediate: {
    H_D_month: number;
    Hdot_D: number;
    IU_per_min_ref: number;
    IU_per_min_user: number;
  };
  outputs: {
    minutes_required: number | null;
    is_infinite: boolean;
  };
  constants_used: {
    T_window: number;
    C_IU: number;
    H_min: number;
    k_skin: number;
    f_cover: number;
  };
  model_version: string;
}

export interface AppState {
  month: number;
  skinType: number;
  iu: number;
  coverage: number;
  coveragePreset: string | null;
}

export interface ModelParams {
  iuTarget: number;
  fCover: number;
  kSkin: number;
  tWindow: number;
  cIU: number;
  hMin: number;
  encodingScale: number;
}
