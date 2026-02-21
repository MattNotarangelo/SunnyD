from __future__ import annotations

import pytest

from app.config import C_IU, FITZPATRICK, H_MIN, T_WINDOW
from app.services.vitd_model import compute_estimate


class TestComputeEstimate:
    """Core vitamin-D model math."""

    def test_basic_computation(self) -> None:
        h_d = 5000.0  # J/m²/day
        result = compute_estimate(h_d, iu_target=1000, f_cover=0.25, skin_type=1)

        hdot_d = h_d / T_WINDOW
        iu_ref = C_IU * hdot_d
        iu_user = iu_ref * 0.25 / 1.0
        expected_mins = 1000 / iu_user

        assert result["intermediate"]["H_D_month"] == h_d
        assert result["intermediate"]["Hdot_D"] == pytest.approx(hdot_d)
        assert result["intermediate"]["IU_per_min_ref"] == pytest.approx(iu_ref)
        assert result["intermediate"]["IU_per_min_user"] == pytest.approx(iu_user)
        assert result["outputs"]["minutes_required"] == pytest.approx(expected_mins)
        assert result["outputs"]["is_infinite"] is False

    def test_infinity_low_dose(self) -> None:
        result = compute_estimate(H_MIN - 1, iu_target=1000, f_cover=0.25, skin_type=1)
        assert result["outputs"]["is_infinite"] is True
        assert result["outputs"]["minutes_required"] is None

    def test_infinity_zero_coverage(self) -> None:
        result = compute_estimate(5000.0, iu_target=1000, f_cover=0.0, skin_type=1)
        assert result["outputs"]["is_infinite"] is True
        assert result["outputs"]["minutes_required"] is None

    def test_infinity_at_h_min_boundary(self) -> None:
        result = compute_estimate(H_MIN, iu_target=1000, f_cover=0.25, skin_type=1)
        assert result["outputs"]["is_infinite"] is False

        result_below = compute_estimate(H_MIN - 0.01, iu_target=1000, f_cover=0.25, skin_type=1)
        assert result_below["outputs"]["is_infinite"] is True


class TestFitzpatrickScaling:
    """Skin type multipliers increase minutes proportionally."""

    @pytest.mark.parametrize("skin_type,k_skin", FITZPATRICK.items())
    def test_scaling(self, skin_type: int, k_skin: float) -> None:
        base = compute_estimate(5000.0, iu_target=1000, f_cover=0.25, skin_type=1)
        scaled = compute_estimate(5000.0, iu_target=1000, f_cover=0.25, skin_type=skin_type)

        base_mins = base["outputs"]["minutes_required"]
        scaled_mins = scaled["outputs"]["minutes_required"]
        assert base_mins is not None
        assert scaled_mins is not None
        assert scaled_mins == pytest.approx(base_mins * k_skin)

    def test_constants_reported(self) -> None:
        result = compute_estimate(5000.0, iu_target=1000, f_cover=0.25, skin_type=3)
        assert result["constants_used"]["k_skin"] == FITZPATRICK[3]
        assert result["constants_used"]["T_window"] == T_WINDOW
        assert result["constants_used"]["C_IU"] == C_IU
        assert result["constants_used"]["H_min"] == H_MIN
        assert result["constants_used"]["f_cover"] == 0.25
