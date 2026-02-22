from __future__ import annotations

import math

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from ..config import EXPOSURE_PRESETS, MODEL_VERSION
from ..models import (
    ConstantsUsed,
    EstimateInputs,
    EstimateIntermediate,
    EstimateOutputs,
    EstimateResponse,
)
from ..services.provider_base import ProviderBase
from ..services.vitd_model import compute_estimate

router = APIRouter(prefix="/api", tags=["estimate"])

_provider: ProviderBase | None = None
_temp_provider: ProviderBase | None = None


def init_provider(provider: ProviderBase) -> None:
    global _provider  # noqa: PLW0603
    _provider = provider


def init_temp_provider(provider: ProviderBase) -> None:
    global _temp_provider  # noqa: PLW0603
    _temp_provider = provider


@router.get("/estimate", response_model=EstimateResponse)
def estimate(
    lat: float = Query(..., ge=-90, le=90),
    lon: float = Query(..., ge=-360, le=360),
    month: int = Query(..., ge=1, le=12),
    skin_type: int = Query(..., ge=1, le=6),
    coverage: float | None = Query(None, ge=0, le=1),
    coverage_preset: str | None = Query(None),
) -> EstimateResponse:
    if _provider is None:
        raise HTTPException(status_code=503, detail="UV data provider not initialized")

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

    # Temperature lookup (optional — only available when temp dataset is loaded)
    temperature: float | None = None
    if _temp_provider is not None:
        temp_val = _temp_provider.get_monthly_dose(month, lat, norm_lon)
        if not math.isnan(temp_val):
            temperature = round(temp_val, 1)

    result = compute_estimate(h_d_month, f_cover, skin_type)

    inputs = EstimateInputs(
        lat=lat,
        lon=norm_lon,
        month=month,
        skin_type=skin_type,
        coverage=f_cover,
    )

    intermediate = EstimateIntermediate(
        H_D_month=result["intermediate"]["H_D_month"],
        temperature=temperature,
    )
    outputs = EstimateOutputs(
        minutes_required=result["outputs"]["minutes_required"],
        is_infinite=result["outputs"]["is_infinite"],
    )
    constants_used = ConstantsUsed(
        K_minutes=result["constants_used"]["K_minutes"],
        k_skin=result["constants_used"]["k_skin"],
        f_cover=result["constants_used"]["f_cover"],
    )

    return EstimateResponse(
        inputs=inputs,
        intermediate=intermediate,
        outputs=outputs,
        constants_used=constants_used,
        model_version=MODEL_VERSION,
    )


MONTH_ABBR = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "June",
    "July",
    "Aug",
    "Sept",
    "Oct",
    "Nov",
    "Dec",
]

SUPPLEMENT_THRESHOLD = 120.0  # minutes


class SupplementResponse(BaseModel):
    months: list[int]
    label: str | None


def _format_month_range(months: list[int]) -> str | None:
    """Format a list of 1-based months into a human-readable range like 'Oct–Mar'."""
    if not months or len(months) == 12:
        return "all year" if len(months) == 12 else None
    s = set(months)
    # Find the longest contiguous run (treating month 12→1 as contiguous)
    # by walking from the first gap
    start = None
    for m in range(1, 13):
        if m not in s:
            start = m
            break
    if start is None:
        return "all year"
    ordered: list[int] = []
    for i in range(12):
        m = (start + i - 1) % 12 + 1
        if m in s:
            ordered.append(m)
    if not ordered:
        return None
    return f"{MONTH_ABBR[ordered[0] - 1]}\u2013{MONTH_ABBR[ordered[-1] - 1]}"


_WEATHER_COLD = 0.05
_WEATHER_WARM = 0.25
_WEATHER_T_MIN = 0.0
_WEATHER_T_MAX = 25.0


def _weather_exposure(temp_c: float) -> float:
    """Mirror the frontend weatherExposure() smoothstep."""
    t = max(
        0.0, min(1.0, (temp_c - _WEATHER_T_MIN) / (_WEATHER_T_MAX - _WEATHER_T_MIN))
    )
    s = t * t * (3 - 2 * t)
    return _WEATHER_COLD + (_WEATHER_WARM - _WEATHER_COLD) * s


@router.get("/supplement", response_model=SupplementResponse)
def supplement(
    lat: float = Query(..., ge=-90, le=90),
    lon: float = Query(..., ge=-360, le=360),
    skin_type: int = Query(..., ge=1, le=6),
    coverage: float = Query(..., ge=0, le=1),
    weather_adjusted: bool = Query(False),
) -> SupplementResponse:
    if _provider is None:
        raise HTTPException(status_code=503, detail="UV data provider not initialized")

    norm_lon = (lon + 180) % 360 - 180
    hard_months: list[int] = []

    for m in range(1, 13):
        h_d = _provider.get_monthly_dose(m, lat, norm_lon)
        if math.isnan(h_d):
            h_d = 0.0

        f_cover = coverage
        if weather_adjusted and _temp_provider is not None:
            temp = _temp_provider.get_monthly_dose(m, lat, norm_lon)
            f_cover = 0.25 if math.isnan(temp) else _weather_exposure(temp)

        result = compute_estimate(h_d, f_cover, skin_type)
        mins = result["outputs"]["minutes_required"]
        if mins is None or mins > SUPPLEMENT_THRESHOLD:
            hard_months.append(m)

    return SupplementResponse(
        months=hard_months,
        label=_format_month_range(hard_months),
    )
