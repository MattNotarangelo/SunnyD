from __future__ import annotations

from pydantic import BaseModel, Field


# --- Estimate ---


class EstimateInputs(BaseModel):
    lat: float
    lon: float
    month: int
    skin_type: int
    coverage: float


class EstimateIntermediate(BaseModel):
    H_D_month: float = Field(description="Monthly mean daily erythemal dose (J/m²/day)")
    temperature: float | None = Field(
        default=None,
        description="Monthly mean temperature at this location (°C), if available",
    )


class EstimateOutputs(BaseModel):
    minutes_required: float | None = Field(
        description="Minutes of midday sun required; null when infinite"
    )
    is_infinite: bool


class ConstantsUsed(BaseModel):
    K_minutes: float
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
