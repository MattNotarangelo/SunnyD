from __future__ import annotations

import pytest

from app.config import FITZPATRICK, K_MINUTES
from app.services.vitd_model import compute_estimate


class TestComputeEstimate:
    """Core vitamin-D model math."""

    def test_basic_computation(self) -> None:
        h_d = 5000.0  # J/m²/day
        result = compute_estimate(h_d, f_cover=0.25, skin_type=1)

        k_skin = FITZPATRICK[1]
        hd_kj = h_d / 1000.0
        expected_mins = (K_MINUTES * k_skin) / (hd_kj * 0.25)

        assert result["intermediate"]["H_D_month"] == h_d
        assert result["outputs"]["minutes_required"] == pytest.approx(expected_mins)
        assert result["outputs"]["is_infinite"] is False

    def test_infinity_zero_dose(self) -> None:
        result = compute_estimate(0.0, f_cover=0.25, skin_type=1)
        assert result["outputs"]["is_infinite"] is True
        assert result["outputs"]["minutes_required"] is None

    def test_infinity_zero_coverage(self) -> None:
        result = compute_estimate(5000.0, f_cover=0.0, skin_type=1)
        assert result["outputs"]["is_infinite"] is True
        assert result["outputs"]["minutes_required"] is None

    def test_positive_dose_not_infinite(self) -> None:
        result = compute_estimate(100.0, f_cover=0.25, skin_type=1)
        assert result["outputs"]["is_infinite"] is False
        assert result["outputs"]["minutes_required"] is not None


class TestFitzpatrickScaling:
    """Skin type multipliers increase minutes proportionally."""

    @pytest.mark.parametrize("skin_type,k_skin", FITZPATRICK.items())
    def test_scaling(self, skin_type: int, k_skin: float) -> None:
        base = compute_estimate(5000.0, f_cover=0.25, skin_type=1)
        scaled = compute_estimate(5000.0, f_cover=0.25, skin_type=skin_type)

        base_mins = base["outputs"]["minutes_required"]
        scaled_mins = scaled["outputs"]["minutes_required"]
        assert base_mins is not None
        assert scaled_mins is not None
        assert scaled_mins == pytest.approx(base_mins * k_skin)

    def test_constants_reported(self) -> None:
        result = compute_estimate(5000.0, f_cover=0.25, skin_type=3)
        assert result["constants_used"]["k_skin"] == FITZPATRICK[3]
        assert result["constants_used"]["K_minutes"] == K_MINUTES
        assert result["constants_used"]["f_cover"] == 0.25
