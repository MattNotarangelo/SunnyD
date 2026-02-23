from __future__ import annotations

import logging
import math
from pathlib import Path

import numpy as np
from numpy.typing import NDArray

from ..config import ENCODING_SCALE_BIN, MODEL_VERSION, TILE_SIZE
from .provider_base import ProviderBase

DEFAULT_OFFSET = 0.0

NODATA_U16 = 0xFFFF

log = logging.getLogger(__name__)


def mercator_lat_array(z: int, y: int, height: int) -> NDArray[np.float32]:
    """Compute per-row latitudes that follow Web Mercator projection.

    Each row maps to the centre of the corresponding pixel in the global
    Mercator grid, ensuring the data aligns with the base-map tiles.
    """
    n = 2.0**z
    lats = np.empty(height, dtype=np.float32)
    for row in range(height):
        y_frac = y + (row + 0.5) / height
        lat_rad = math.atan(math.sinh(math.pi * (1 - 2 * y_frac / n)))
        lats[row] = math.degrees(lat_rad)
    return lats


def tile_lon_array(z: int, x: int, width: int) -> NDArray[np.float32]:
    """Compute per-column longitudes for a tile."""
    n = 2.0**z
    lon_min = x / n * 360.0 - 180.0
    lon_max = (x + 1) / n * 360.0 - 180.0
    return np.linspace(lon_min, lon_max, width, dtype=np.float32)


def encode_uint16(
    data: NDArray[np.float32],
    scale: int = ENCODING_SCALE_BIN,
    offset: float = DEFAULT_OFFSET,
) -> NDArray[np.uint16]:
    """Encode a float32 (H, W) array into a flat uint16 array.

    Encoding:
        value_encoded = round((value + offset) * scale)
        Clamped to [0, 65534].  65535 (0xFFFF) = NaN / no-data.
    """
    flat = data.ravel()
    out = np.full(flat.shape, NODATA_U16, dtype=np.uint16)
    valid = ~np.isnan(flat)
    out[valid] = np.clip(
        np.round((flat[valid] + offset) * scale), 0, NODATA_U16 - 1
    ).astype(np.uint16)
    return out


class TileService:
    """Generates and caches numeric base tiles."""

    def __init__(
        self,
        provider: ProviderBase,
        cache_dir: Path,
        encoding_scale: int = ENCODING_SCALE_BIN,
        encoding_offset: float = DEFAULT_OFFSET,
    ) -> None:
        self._provider = provider
        self._encoding_scale = encoding_scale
        self._encoding_offset = encoding_offset
        self._cache_root = cache_dir / MODEL_VERSION
        self._cache_root.mkdir(parents=True, exist_ok=True)
        log.info("Tile cache directory: %s", self._cache_root)

    def _cache_path(self, month: int, z: int, x: int, y: int) -> Path:
        return self._cache_root / str(month) / str(z) / str(x) / f"{y}.bin"

    def _get_tile_data(self, month: int, z: int, x: int, y: int) -> NDArray[np.float32]:
        target_lats = mercator_lat_array(z, y, TILE_SIZE)
        target_lons = tile_lon_array(z, x, TILE_SIZE)
        return self._provider.get_tile_data(month, target_lats, target_lons)

    def get_tile_bin(self, month: int, z: int, x: int, y: int) -> bytes:
        """Return raw uint16 little-endian bytes for the requested tile."""
        cached = self._cache_path(month, z, x, y)
        if cached.exists():
            return cached.read_bytes()

        data = self._get_tile_data(month, z, x, y)
        u16 = encode_uint16(data, self._encoding_scale, self._encoding_offset)
        raw_bytes = u16.tobytes()

        cached.parent.mkdir(parents=True, exist_ok=True)
        cached.write_bytes(raw_bytes)

        return raw_bytes
