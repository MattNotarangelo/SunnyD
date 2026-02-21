from __future__ import annotations

from fastapi import APIRouter

from ..config import (
    C_IU,
    DISCLAIMER,
    ENCODING_SCALE,
    EXPOSURE_PRESETS,
    FITZPATRICK,
    H_D_MAX,
    H_MIN,
    MODEL_VERSION,
    T_WINDOW,
)
from ..models import MethodologyResponse

router = APIRouter(prefix="/api", tags=["methodology"])

EQUATIONS: dict[str, str] = {
    "Hdot_D": "H_D_month / T_window",
    "IU_per_min_ref": "C_IU * Hdot_D",
    "IU_per_min_user": "IU_per_min_ref * f_cover / k_skin",
    "t_minutes": "IU_target / IU_per_min_user",
    "infinity_rule": "H_D_month < H_min OR IU_per_min_user <= 0 → Infinity",
}


@router.get("/methodology", response_model=MethodologyResponse)
def methodology() -> MethodologyResponse:
    return MethodologyResponse(
        model_version=MODEL_VERSION,
        equations=EQUATIONS,
        constants={
            "T_window": T_WINDOW,
            "C_IU": C_IU,
            "H_min": H_MIN,
        },
        fitzpatrick_table=FITZPATRICK,
        exposure_presets=EXPOSURE_PRESETS,
        encoding={
            "scale": ENCODING_SCALE,
            "H_D_max": H_D_MAX,
        },
        disclaimer=DISCLAIMER,
    )
