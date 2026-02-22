from __future__ import annotations

import numpy as np
import pytest

from app.config import ENCODING_SCALE
from app.services.tile_service import (
    decode_rgb,
    encode_rgb,
    mercator_lat_array,
    tile_lon_array,
)


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
        assert rgba[0, 0, 3] == 0  # NaN -> transparent
        assert rgba[0, 1, 3] == 255  # valid -> opaque

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


class TestMercatorLatArray:
    """Mercator latitude array generation."""

    def test_zoom_0_full_world(self) -> None:
        lats = mercator_lat_array(0, 0, 256)
        assert lats[0] == pytest.approx(85.0511, abs=0.5)
        assert lats[-1] == pytest.approx(-85.0511, abs=0.5)

    def test_lats_descending(self) -> None:
        lats = mercator_lat_array(1, 0, 256)
        assert all(lats[i] > lats[i + 1] for i in range(len(lats) - 1))

    def test_zoom_1_north_south_split(self) -> None:
        north = mercator_lat_array(1, 0, 256)
        south = mercator_lat_array(1, 1, 256)
        assert north[0] > 0
        assert south[-1] < 0
        assert north[-1] == pytest.approx(south[0], abs=1.0)

    def test_output_length(self) -> None:
        lats = mercator_lat_array(3, 2, 128)
        assert len(lats) == 128


class TestTileLonArray:
    """Tile longitude array generation."""

    def test_zoom_0_full_world(self) -> None:
        lons = tile_lon_array(0, 0, 256)
        assert lons[0] == pytest.approx(-180.0, abs=1.0)
        assert lons[-1] == pytest.approx(180.0, abs=1.0)

    def test_lons_ascending(self) -> None:
        lons = tile_lon_array(2, 1, 256)
        assert all(lons[i] < lons[i + 1] for i in range(len(lons) - 1))

    def test_zoom_1_halves(self) -> None:
        west = tile_lon_array(1, 0, 256)
        east = tile_lon_array(1, 1, 256)
        assert west[0] == pytest.approx(-180.0)
        assert east[-1] == pytest.approx(180.0, abs=1.5)

    def test_output_length(self) -> None:
        lons = tile_lon_array(3, 4, 128)
        assert len(lons) == 128
