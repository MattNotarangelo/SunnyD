from __future__ import annotations

import math

from ..config import C_IU, FITZPATRICK, H_MIN, T_WINDOW


def compute_estimate(
    h_d_month: float,
    iu_target: float,
    f_cover: float,
    skin_type: int,
) -> dict:
    """Run the full vitamin-D model for a single point.

    Parameters
    ----------
    h_d_month : float
        Monthly mean daily dose in J/m²/day.
    iu_target : float
        Desired IU (e.g. 600, 1000, 2000).
    f_cover : float
        Fraction of skin exposed (0–1).
    skin_type : int
        Fitzpatrick skin type (1–6).

    Returns
    -------
    dict with keys ``intermediate``, ``outputs``, ``constants_used``.
    """
    k_skin = FITZPATRICK[skin_type]

    hdot_d = h_d_month / T_WINDOW
    iu_per_min_ref = C_IU * hdot_d
    iu_per_min_user = iu_per_min_ref * f_cover / k_skin

    is_infinite = h_d_month < H_MIN or iu_per_min_user <= 0
    if is_infinite:
        minutes_required = None
    else:
        minutes_required = iu_target / iu_per_min_user
        if math.isinf(minutes_required):
            is_infinite = True
            minutes_required = None

    return {
        "intermediate": {
            "H_D_month": h_d_month,
            "Hdot_D": hdot_d,
            "IU_per_min_ref": iu_per_min_ref,
            "IU_per_min_user": iu_per_min_user,
        },
        "outputs": {
            "minutes_required": minutes_required,
            "is_infinite": is_infinite,
        },
        "constants_used": {
            "T_window": T_WINDOW,
            "C_IU": C_IU,
            "H_min": H_MIN,
            "k_skin": k_skin,
            "f_cover": f_cover,
        },
    }
