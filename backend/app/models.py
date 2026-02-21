from __future__ import annotations

from pydantic import BaseModel, Field


# --- Estimate ---


class EstimateInputs(BaseModel):
    lat: float
    lon: float
    month: int
    skin_type: int
    iu_target: float
    coverage: float


class EstimateIntermediate(BaseModel):
    H_D_month: float = Field(description="Monthly mean daily dose (J/m²/day)")
    Hdot_D: float = Field(description="Per-minute effective rate (J/m²/min)")
    IU_per_min_ref: float = Field(description="Reference IU per minute")
    IU_per_min_user: float = Field(description="User-adjusted IU per minute")


class EstimateOutputs(BaseModel):
    minutes_required: float | None = Field(
        description="Minutes of midday sun required; null when infinite"
    )
    is_infinite: bool


class ConstantsUsed(BaseModel):
    T_window: int
    C_IU: float
    H_min: float
    k_skin: float
    f_cover: float


class EstimateResponse(BaseModel):
    inputs: EstimateInputs
    intermediate: EstimateIntermediate
    outputs: EstimateOutputs
    constants_used: ConstantsUsed
    model_version: str


# --- Methodology ---


class MethodologyResponse(BaseModel):
    model_version: str
    equations: dict[str, str]
    constants: dict[str, float | int]
    fitzpatrick_table: dict[int, float]
    exposure_presets: dict[str, float]
    encoding: dict[str, int | float]
    disclaimer: str
