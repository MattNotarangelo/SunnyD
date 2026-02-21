from __future__ import annotations

import math

from fastapi import APIRouter, HTTPException, Query

from ..config import EXPOSURE_PRESETS, MODEL_VERSION
from ..models import EstimateInputs, EstimateResponse
from ..services.provider_base import ProviderBase
from ..services.vitd_model import compute_estimate

router = APIRouter(prefix="/api", tags=["estimate"])

_provider: ProviderBase | None = None


def init_provider(provider: ProviderBase) -> None:
    global _provider  # noqa: PLW0603
    _provider = provider


@router.get("/estimate", response_model=EstimateResponse)
def estimate(
    lat: float = Query(..., ge=-90, le=90),
    lon: float = Query(...),
    month: int = Query(..., ge=1, le=12),
    skin_type: int = Query(..., ge=1, le=6),
    coverage: float | None = Query(None, ge=0, le=1),
    coverage_preset: str | None = Query(None),
) -> EstimateResponse:
    assert _provider is not None

    if coverage is not None:
        f_cover = coverage
    elif coverage_preset is not None:
        if coverage_preset not in EXPOSURE_PRESETS:
            raise HTTPException(
                status_code=400,
                detail=f"Unknown preset '{coverage_preset}'. "
                f"Choose from: {list(EXPOSURE_PRESETS)}",
            )
        f_cover = EXPOSURE_PRESETS[coverage_preset]
    else:
        f_cover = EXPOSURE_PRESETS["face_hands"]

    norm_lon = (lon + 180) % 360 - 180
    h_d_month = _provider.get_monthly_dose(month, lat, norm_lon)
    if math.isnan(h_d_month):
        h_d_month = 0.0

    result = compute_estimate(h_d_month, f_cover, skin_type)

    inputs = EstimateInputs(
        lat=lat,
        lon=norm_lon,
        month=month,
        skin_type=skin_type,
        coverage=f_cover,
    )

    return EstimateResponse(
        inputs=inputs,
        intermediate=result["intermediate"],
        outputs=result["outputs"],
        constants_used=result["constants_used"],
        model_version=MODEL_VERSION,
    )
