from __future__ import annotations

import io
import logging
import math
from pathlib import Path

import numpy as np
from numpy.typing import NDArray
from PIL import Image

from ..config import ENCODING_SCALE, MODEL_VERSION, TILE_SIZE
from .provider_base import ProviderBase

log = logging.getLogger(__name__)

# Web Mercator bounds (latitude clamped to ~±85.051°)
MAX_LAT = 85.0511287798


def tile_to_bbox(z: int, x: int, y: int) -> tuple[float, float, float, float]:
    """Convert tile coordinates to (lat_min, lat_max, lon_min, lon_max) in WGS-84."""
    n = 2.0**z
    lon_min = x / n * 360.0 - 180.0
    lon_max = (x + 1) / n * 360.0 - 180.0
    lat_max = math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * y / n))))
    lat_min = math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * (y + 1) / n))))
    return lat_min, lat_max, lon_min, lon_max


def encode_rgb(data: NDArray[np.float32]) -> NDArray[np.uint8]:
    """Encode a float32 (H, W) array of J/m²/day into an (H, W, 4) RGBA image.

    Encoding:
        value_encoded = round(H_D_month * ENCODING_SCALE)
        R = (value_encoded >> 16) & 0xFF
        G = (value_encoded >> 8)  & 0xFF
        B =  value_encoded        & 0xFF
        A = 255 for valid pixels, 0 for NaN / no-data
    """
    h, w = data.shape
    rgba = np.zeros((h, w, 4), dtype=np.uint8)

    valid = ~np.isnan(data)
    vals = np.clip(data[valid] * ENCODING_SCALE, 0, 0xFFFFFF).astype(np.uint32)

    rgba[valid, 0] = ((vals >> 16) & 0xFF).astype(np.uint8)
    rgba[valid, 1] = ((vals >> 8) & 0xFF).astype(np.uint8)
    rgba[valid, 2] = (vals & 0xFF).astype(np.uint8)
    rgba[valid, 3] = 255

    return rgba


def decode_rgb(rgba: NDArray[np.uint8]) -> NDArray[np.float32]:
    """Reverse of encode_rgb — used for testing round-trip accuracy."""
    r = rgba[..., 0].astype(np.uint32)
    g = rgba[..., 1].astype(np.uint32)
    b = rgba[..., 2].astype(np.uint32)
    a = rgba[..., 3]

    raw = (r << 16) | (g << 8) | b
    result = raw.astype(np.float32) / ENCODING_SCALE

    result[a == 0] = np.float32("nan")
    return result.astype(np.float32)


class TileService:
    """Generates and caches numeric base tiles."""

    def __init__(self, provider: ProviderBase, cache_dir: Path) -> None:
        self._provider = provider
        self._cache_root = cache_dir / MODEL_VERSION
        self._cache_root.mkdir(parents=True, exist_ok=True)
        log.info("Tile cache directory: %s", self._cache_root)

    def _cache_path(self, month: int, z: int, x: int, y: int) -> Path:
        return self._cache_root / str(month) / str(z) / str(x) / f"{y}.png"

    def get_tile_png(self, month: int, z: int, x: int, y: int) -> bytes:
        """Return PNG bytes for the requested tile, using disk cache."""
        cached = self._cache_path(month, z, x, y)
        if cached.exists():
            return cached.read_bytes()

        lat_min, lat_max, lon_min, lon_max = tile_to_bbox(z, x, y)
        data = self._provider.get_tile_data(
            month, lat_min, lat_max, lon_min, lon_max, TILE_SIZE, TILE_SIZE
        )
        rgba = encode_rgb(data)

        img = Image.fromarray(rgba)
        buf = io.BytesIO()
        img.save(buf, format="PNG", compress_level=6)
        png_bytes = buf.getvalue()

        cached.parent.mkdir(parents=True, exist_ok=True)
        cached.write_bytes(png_bytes)

        return png_bytes
