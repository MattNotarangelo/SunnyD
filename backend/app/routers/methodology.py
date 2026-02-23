from __future__ import annotations

from fastapi import APIRouter

from ..config import (
    DISCLAIMER,
    ENCODING_SCALE_BIN,
    EXPOSURE_PRESETS,
    FITZPATRICK,
    H_D_MAX,
    K_MINUTES,
    MODEL_VERSION,
    TEMP_ENCODING_SCALE_BIN,
    TEMP_OFFSET,
)
from ..models import MethodologyResponse

router = APIRouter(prefix="/api", tags=["methodology"])

EQUATIONS: dict[str, str] = {
    "t_minutes": "(K_minutes * k_skin) / (H_D_month * f_cover)",
    "infinity_rule": "H_D_month <= 0 OR f_cover <= 0 → Infinity",
}


@router.get("/methodology", response_model=MethodologyResponse)
def methodology() -> MethodologyResponse:
    return MethodologyResponse(
        model_version=MODEL_VERSION,
        equations=EQUATIONS,
        constants={
            "K_minutes": K_MINUTES,
        },
        fitzpatrick_table=FITZPATRICK,
        exposure_presets=EXPOSURE_PRESETS,
        encoding={
            "scale": ENCODING_SCALE_BIN,
            "H_D_max": H_D_MAX,
            "temp_encoding_scale": TEMP_ENCODING_SCALE_BIN,
            "temp_offset": TEMP_OFFSET,
        },
        disclaimer=DISCLAIMER,
    )
