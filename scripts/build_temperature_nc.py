#!/usr/bin/env python3
"""Build temperature_monthly.nc from WorldClim 2.1 average temperature normals.

Downloads the 10-minute resolution (~18 km) monthly average temperature
GeoTIFFs from WorldClim, interpolates to the 0.25-degree grid matching
the UV dataset, and saves as a NetCDF for the SunnyD tile server.

Source: https://www.worldclim.org/data/worldclim21.html
Period: 1970–2000 climatological normals

Usage:
    python scripts/build_temperature_nc.py
"""

from __future__ import annotations

import io
import zipfile
from pathlib import Path

import httpx
import numpy as np
import tifffile
import xarray as xr
from scipy.interpolate import RegularGridInterpolator

PROJECT_ROOT = Path(__file__).resolve().parent.parent
UV_NC = PROJECT_ROOT / "uvdvcclim_world_monthly.nc"
OUTPUT_NC = PROJECT_ROOT / "temperature_monthly.nc"
ZIP_CACHE = PROJECT_ROOT / "wc2.1_10m_tavg.zip"

WORLDCLIM_URL = "https://geodata.ucdavis.edu/climate/worldclim/2_1/base/wc2.1_10m_tavg.zip"



def download(url: str, dest: Path) -> None:
    if dest.exists():
        print(f"  cached: {dest.name}")
        return
    print(f"  downloading {dest.name} ...")
    with httpx.Client(follow_redirects=True, timeout=300) as client:
        resp = client.get(url)
        resp.raise_for_status()
    dest.write_bytes(resp.content)
    size_mb = len(resp.content) / (1024 * 1024)
    print(f"  saved {size_mb:.1f} MB -> {dest.name}")


def read_worldclim_tiffs(zip_path: Path) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Read 12 monthly GeoTIFFs from the WorldClim zip.

    Returns (data, lats, lons) where data is (12, nlat, nlon) in deg C,
    lats is descending (90 -> -90), lons is ascending (-180 -> 180).
    """
    months: dict[int, np.ndarray] = {}
    with zipfile.ZipFile(zip_path) as zf:
        for name in sorted(zf.namelist()):
            if not name.endswith(".tif"):
                continue
            # filenames like wc2.1_10m_tavg_01.tif .. _12.tif
            month_num = int(name.split("_")[-1].replace(".tif", ""))
            with zf.open(name) as f:
                data = tifffile.imread(io.BytesIO(f.read()))
            months[month_num] = data.astype(np.float32)
            print(f"    month {month_num:2d}: shape {data.shape}")

    stack = np.stack([months[m] for m in range(1, 13)])

    # WorldClim 10-min: 1080 rows x 2160 cols
    # lat: 90 to -90 (top to bottom), lon: -180 to 180
    nlat, nlon = stack.shape[1], stack.shape[2]
    cell = 180.0 / nlat  # 10 arcmin = 1/6 degree
    lats = np.linspace(90 - cell / 2, -90 + cell / 2, nlat)
    lons = np.linspace(-180 + cell / 2, 180 - cell / 2, nlon)

    return stack, lats, lons


def build() -> None:
    print("1. Downloading WorldClim 2.1 tavg (10-min) ...")
    download(WORLDCLIM_URL, ZIP_CACHE)

    print("2. Reading GeoTIFFs ...")
    wc_data, wc_lats, wc_lons = read_worldclim_tiffs(ZIP_CACHE)

    # WorldClim uses a large negative value for ocean/nodata; mask it
    wc_data[wc_data < -100] = np.nan

    print("3. Reading target grid from UV dataset ...")
    uv_ds = xr.open_dataset(UV_NC, engine="h5netcdf")
    target_lats = uv_ds["latitude"].values.astype(np.float64)
    target_lons = uv_ds["longitude"].values.astype(np.float64)
    uv_ds.close()

    print(f"   WorldClim grid: {len(wc_lats)} lats x {len(wc_lons)} lons ({180/len(wc_lats)*60:.0f} arcmin)")
    print(f"   Target grid:    {len(target_lats)} lats x {len(target_lons)} lons (0.25 deg)")

    # WorldClim lats are descending; sort ascending for RegularGridInterpolator
    wc_lats_asc = wc_lats[::-1]
    wc_data_asc = wc_data[:, ::-1, :]

    print("4. Interpolating 12 months ...")
    n_months = 12
    out = np.full((n_months, len(target_lats), len(target_lons)), np.nan, dtype=np.float32)

    lat_grid, lon_grid = np.meshgrid(target_lats, target_lons, indexing="ij")
    pts = np.column_stack([lat_grid.ravel(), lon_grid.ravel()])

    # Build an ocean mask at source resolution, then interpolate it to
    # the target grid so we can re-stamp NaN on ocean pixels in the output.
    from scipy.ndimage import distance_transform_edt

    ocean_src = np.isnan(wc_data_asc[0]).astype(np.float64)  # 1=ocean, 0=land
    ocean_interp = RegularGridInterpolator(
        (wc_lats_asc, wc_lons), ocean_src,
        method="linear", bounds_error=False, fill_value=1.0,
    )
    ocean_mask = ocean_interp(pts).reshape(len(target_lats), len(target_lons)) > 0.5

    for m in range(n_months):
        data_m = wc_data_asc[m].astype(np.float64)

        # Nearest-fill NaN so the interpolator has valid data everywhere
        mask = np.isnan(data_m)
        if mask.any():
            _, nearest_idx = distance_transform_edt(mask, return_distances=True, return_indices=True)
            data_m = data_m[tuple(nearest_idx)]

        interp = RegularGridInterpolator(
            (wc_lats_asc, wc_lons),
            data_m,
            method="linear",
            bounds_error=False,
            fill_value=None,
        )
        result = interp(pts).reshape(len(target_lats), len(target_lons)).astype(np.float32)
        result[ocean_mask] = np.nan
        out[m] = result
        land_mean = np.nanmean(out[m])
        nan_pct = 100 * np.isnan(out[m]).sum() / out[m].size
        print(f"   month {m + 1:2d}: land mean {land_mean:+.1f} degC, ocean NaN {nan_pct:.0f}%")

    print("5. Saving NetCDF ...")
    ds = xr.Dataset(
        {"temperature_2m_mean": (["month", "latitude", "longitude"], out)},
        coords={
            "month": np.arange(1, 13),
            "latitude": target_lats.astype(np.float32),
            "longitude": target_lons.astype(np.float32),
        },
    )
    ds["temperature_2m_mean"].attrs = {
        "units": "degC",
        "long_name": "Monthly mean 2m air temperature",
        "source": "WorldClim 2.1 tavg 10-min (1970-2000 normals), bilinear to 0.25 deg",
    }
    ds.to_netcdf(OUTPUT_NC, engine="h5netcdf")
    size_mb = OUTPUT_NC.stat().st_size / (1024 * 1024)
    print(f"   saved: {OUTPUT_NC.name} ({size_mb:.1f} MB)")
    print("Done!")


if __name__ == "__main__":
    build()
