#!/usr/bin/env python3
"""Build static binary grid files for the SunnyD frontend.

Reads the preprocessed NetCDF datasets and writes spatially delta-encoded,
Brotli-compressed uint16 binary grids that the React app loads lazily at runtime.

Output: public/data/uv_1.bin … uv_12.bin, temp_1.bin … temp_12.bin
        (24 Brotli-compressed files, served with Content-Encoding: br)

Binary format (little-endian):
  Header (20 bytes):
    uint16  nlat
    uint16  nlon
    float32 lat0      - latitude of first row (northernmost)
    float32 lat_step  - degrees per row (negative = north→south)
    float32 lon0      - longitude of first column (westernmost)
    float32 lon_step  - degrees per column (positive = west→east)
  Data (nlat × nlon × 2 bytes, spatially delta-encoded):
    Column 0: uint16 absolute values (0xFFFF = no-data / NaN)
    Columns 1…nlon-1: int16 deltas from the left neighbor (west→east)
    Rows 0…nlat-1: north→south

Encoding:
  UV:   value_J = kJ_value * 1000;  encoded = round(value_J * 3)
  Temp: encoded = round((celsius + 50) * 100)

Usage:
    python scripts/3_build_grids.py
"""

from __future__ import annotations

import struct
import sys
from pathlib import Path

import brotli

import numpy as np
import xarray as xr

PROJECT_ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = PROJECT_ROOT / "public" / "data"

UV_NC = PROJECT_ROOT / "uvdvcclim_world_monthly.nc"
TEMP_NC = PROJECT_ROOT / "temperature_monthly.nc"

NODATA = 0xFFFF
UV_SCALE = 3
TEMP_SCALE = 100
TEMP_OFFSET = 50.0
KJ_TO_J = 1000.0


def encode_uint16(data: np.ndarray, scale: float, offset: float = 0.0) -> np.ndarray:
    flat = data.ravel().astype(np.float64)
    out = np.full(flat.shape, NODATA, dtype=np.uint16)
    valid = ~np.isnan(flat)
    out[valid] = np.clip(
        np.round((flat[valid] + offset) * scale), 0, NODATA - 1
    ).astype(np.uint16)
    return out


def spatial_delta_encode(grid: np.ndarray, nlat: int, nlon: int) -> np.ndarray:
    """Row-wise delta encode: first column absolute, rest as int16 deltas."""
    grid_2d = grid.reshape(nlat, nlon)
    encoded = np.empty((nlat, nlon), dtype=np.int16)

    # First column stored as-is (reinterpreted as int16 on disk, decoded with & 0xFFFF)
    encoded[:, 0] = grid_2d[:, 0].view(np.int16)

    # Remaining columns: delta from left neighbor
    deltas = grid_2d[:, 1:].astype(np.int32) - grid_2d[:, :-1].astype(np.int32)

    if np.any((deltas < -32768) | (deltas > 32767)):
        overflow_count = int(np.sum((deltas < -32768) | (deltas > 32767)))
        print(f"    WARNING: {overflow_count} deltas overflow int16 range!")

    encoded[:, 1:] = deltas.astype(np.int16)
    return encoded.ravel()


def make_header(lats: np.ndarray, lons: np.ndarray) -> bytes:
    nlat = len(lats)
    nlon = len(lons)
    lat0 = float(lats[0])
    lat_step = float(lats[1] - lats[0]) if nlat > 1 else 0.0
    lon0 = float(lons[0])
    lon_step = float(lons[1] - lons[0]) if nlon > 1 else 0.0
    return struct.pack("<HH ffff", nlat, nlon, lat0, lat_step, lon0, lon_step)


def write_uv_grids(dose, lats: np.ndarray, lons: np.ndarray, prefix: str) -> None:
    if lats[-1] > lats[0]:
        lats = lats[::-1]
        flip_lat = True
    else:
        flip_lat = False

    header = make_header(lats, lons)
    nlat, nlon = len(lats), len(lons)

    for m in range(1, 13):
        arr = dose.sel(month=m).values.astype(np.float32)
        if flip_lat:
            arr = arr[::-1, :]
        arr *= KJ_TO_J
        u16 = encode_uint16(arr, UV_SCALE)
        valid_count = int(np.sum(u16 != NODATA))

        encoded = spatial_delta_encode(u16, nlat, nlon)
        raw = header + encoded.tobytes()
        compressed = brotli.compress(raw, quality=11)
        path = OUT_DIR / f"{prefix}_{m}.bin"
        path.write_bytes(compressed)

        print(
            f"  {prefix}_{m}.bin: {valid_count:,} valid px, {len(raw)/1024:.0f} KB → {len(compressed)/1024:.0f} KB"
        )


def build_uv() -> None:
    print(f"Loading UV data from {UV_NC.name} ...")
    ds = xr.open_dataset(UV_NC, engine="h5netcdf")
    lats = ds["latitude"].values.astype(np.float32)
    lons = ds["longitude"].values.astype(np.float32)
    write_uv_grids(ds["uvd_clear_mean"], lats, lons, "uv")
    ds.close()


def build_uv_cloud() -> None:
    """Cloud-modified dose where available (Meteosat disk: Europe/Africa/
    Atlantic), clear-sky elsewhere — blended at build time so the frontend
    can treat it as a single self-contained layer."""
    print(f"Loading cloud-modified UV data from {UV_NC.name} ...")
    ds = xr.open_dataset(UV_NC, engine="h5netcdf")
    lats = ds["latitude"].values.astype(np.float32)
    lons = ds["longitude"].values.astype(np.float32)
    cloudy = ds["uvd_cloudy_mean"]
    blended = cloudy.where(cloudy.notnull(), ds["uvd_clear_mean"])
    write_uv_grids(blended, lats, lons, "uvcloud")
    ds.close()


def build_temp() -> None:
    print(f"Loading temperature data from {TEMP_NC.name} ...")
    ds = xr.open_dataset(TEMP_NC, engine="h5netcdf")
    temp = ds["temperature_2m_mean"]
    lats = ds["latitude"].values.astype(np.float32)
    lons = ds["longitude"].values.astype(np.float32)

    if lats[-1] > lats[0]:
        lats = lats[::-1]
        flip_lat = True
    else:
        flip_lat = False

    header = make_header(lats, lons)
    nlat, nlon = len(lats), len(lons)

    for m in range(1, 13):
        arr = temp.sel(month=m).values.astype(np.float32)
        if flip_lat:
            arr = arr[::-1, :]
        u16 = encode_uint16(arr, TEMP_SCALE, TEMP_OFFSET)
        valid_count = int(np.sum(u16 != NODATA))

        encoded = spatial_delta_encode(u16, nlat, nlon)
        raw = header + encoded.tobytes()
        compressed = brotli.compress(raw, quality=11)
        path = OUT_DIR / f"temp_{m}.bin"
        path.write_bytes(compressed)

        print(
            f"  temp_{m}.bin: {valid_count:,} valid px, {len(raw)/1024:.0f} KB → {len(compressed)/1024:.0f} KB"
        )

    ds.close()


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    if not UV_NC.exists():
        print(f"ERROR: UV NetCDF not found at {UV_NC}", file=sys.stderr)
        sys.exit(1)
    if not TEMP_NC.exists():
        print(f"ERROR: Temperature NetCDF not found at {TEMP_NC}", file=sys.stderr)
        sys.exit(1)

    build_uv()
    print()
    build_uv_cloud()
    print()
    build_temp()
    print(f"\nDone! Grid files are in {OUT_DIR.relative_to(PROJECT_ROOT)}/")


if __name__ == "__main__":
    main()
