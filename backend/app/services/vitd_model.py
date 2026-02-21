from __future__ import annotations

from ..config import FITZPATRICK, K_MINUTES


def compute_estimate(
    h_d_month: float,
    f_cover: float,
    skin_type: int,
) -> dict:
    """Run the vitamin-D exposure model for a single point.

    Parameters
    ----------
    h_d_month : float
        Monthly mean daily erythemal dose (J/m²/day).
    f_cover : float
        Fraction of skin exposed (0–1).
    skin_type : int
        Fitzpatrick skin type (1–6).

    Returns
    -------
    dict with keys ``intermediate``, ``outputs``, ``constants_used``.
    """
    k_skin = FITZPATRICK[skin_type]

    is_infinite = h_d_month <= 0 or f_cover <= 0
    if is_infinite:
        minutes_required = None
    else:
        hd_kj = h_d_month / 1000.0
        minutes_required = (K_MINUTES * k_skin) / (hd_kj * f_cover)

    return {
        "intermediate": {
            "H_D_month": h_d_month,
        },
        "outputs": {
            "minutes_required": minutes_required,
            "is_infinite": is_infinite,
        },
        "constants_used": {
            "K_minutes": K_MINUTES,
            "k_skin": k_skin,
            "f_cover": f_cover,
        },
    }
