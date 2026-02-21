from __future__ import annotations

import numpy as np
import pytest

from app.config import ENCODING_SCALE
from app.services.tile_service import decode_rgb, encode_rgb, tile_to_bbox


class TestRGBEncoding:
    """Round-trip accuracy of the 24-bit encoding."""

    def test_roundtrip_simple_values(self) -> None:
        data = np.array([[0.0, 1.0, 100.0], [5000.0, 12000.0, 20000.0]], dtype=np.float32)
        rgba = encode_rgb(data)
        recovered = decode_rgb(rgba)
        np.testing.assert_allclose(recovered, data, atol=1.0 / ENCODING_SCALE)

    def test_nan_preserved(self) -> None:
        data = np.array([[np.nan, 500.0], [1000.0, np.nan]], dtype=np.float32)
        rgba = encode_rgb(data)
        recovered = decode_rgb(rgba)

        assert np.isnan(recovered[0, 0])
        assert np.isnan(recovered[1, 1])
        assert recovered[0, 1] == pytest.approx(500.0, abs=1.0 / ENCODING_SCALE)
        assert recovered[1, 0] == pytest.approx(1000.0, abs=1.0 / ENCODING_SCALE)

    def test_alpha_channel(self) -> None:
        data = np.array([[np.nan, 100.0]], dtype=np.float32)
        rgba = encode_rgb(data)
        assert rgba[0, 0, 3] == 0  # NaN → transparent
        assert rgba[0, 1, 3] == 255  # valid → opaque

    def test_zero_encoded_correctly(self) -> None:
        data = np.array([[0.0]], dtype=np.float32)
        rgba = encode_rgb(data)
        assert tuple(rgba[0, 0]) == (0, 0, 0, 255)
        recovered = decode_rgb(rgba)
        assert recovered[0, 0] == pytest.approx(0.0)

    def test_large_value_clipped(self) -> None:
        data = np.array([[200_000.0]], dtype=np.float32)
        rgba = encode_rgb(data)
        recovered = decode_rgb(rgba)
        assert recovered[0, 0] <= (0xFFFFFF / ENCODING_SCALE)


class TestTileBbox:
    """Web Mercator tile → bbox conversion."""

    def test_zoom_0_full_world(self) -> None:
        lat_min, lat_max, lon_min, lon_max = tile_to_bbox(0, 0, 0)
        assert lon_min == pytest.approx(-180.0)
        assert lon_max == pytest.approx(180.0)
        assert lat_max == pytest.approx(85.0511, abs=0.01)
        assert lat_min == pytest.approx(-85.0511, abs=0.01)

    def test_zoom_1_quadrants(self) -> None:
        _, lat_max, lon_min, _ = tile_to_bbox(1, 0, 0)
        assert lon_min == pytest.approx(-180.0)
        assert lat_max == pytest.approx(85.0511, abs=0.01)

        lat_min, _, _, lon_max = tile_to_bbox(1, 1, 1)
        assert lon_max == pytest.approx(180.0)
        assert lat_min == pytest.approx(-85.0511, abs=0.01)

    def test_tile_bounds_ordering(self) -> None:
        lat_min, lat_max, lon_min, lon_max = tile_to_bbox(3, 4, 2)
        assert lat_min < lat_max
        assert lon_min < lon_max
