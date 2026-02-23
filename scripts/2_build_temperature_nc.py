#!/usr/bin/env python3
"""Build temperature_monthly.nc from ERA5 monthly-averaged 2m temperature.

Processes a pre-downloaded ERA5 NetCDF file into a compact 12-month
climatology for SunnyD.

Source: Copernicus Climate Data Store — ERA5 monthly averaged reanalysis
        on single levels, variable "2m temperature".
        https://cds.climate.copernicus.eu/datasets/reanalysis-era5-single-levels-monthly-means
Resolution: 0.25° x 0.25°, global (land + ocean)
Licence: Copernicus licence (https://cds.climate.copernicus.eu/datasets/reanalysis-era5-single-levels-monthly-means?tab=overview)

Prerequisites:
    Download the ERA5 file manually from CDS (requires free registration)
    and place it in the repository root. See README for instructions.

Usage:
    python scripts/2_build_temperature_nc.py [input_file]
"""

from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import xarray as xr

PROJECT_ROOT = Path(__file__).resolve().parent.parent
OUTPUT_NC = PROJECT_ROOT / "temperature_monthly.nc"

DEFAULT_INPUT = "era5_monthly-avg-reanalysis_2m-temp_2016-2026.nc"


def build(input_path: Path) -> None:
    if not input_path.exists():
        print(
            f"ERROR: Input file not found: {input_path}\n\n"
            "Download ERA5 monthly-averaged 2m temperature from the Copernicus\n"
            "Climate Data Store and place the NetCDF in the repository root.\n"
            "See README.md for instructions.",
            file=sys.stderr,
        )
        sys.exit(1)

    size_mb = input_path.stat().st_size / (1024 * 1024)
    print(f"1. Opening {input_path.name} ({size_mb:.0f} MB) ...")
    ds = xr.open_dataset(input_path, engine="h5netcdf")

    t2m = ds["t2m"]
    print(f"   shape: {t2m.shape}, units: {t2m.attrs.get('units', '?')}")

    time_coord = "valid_time" if "valid_time" in ds.coords else "time"
    times = ds[time_coord].values
    print(f"   time range: {str(times[0])[:7]} to {str(times[-1])[:7]} ({len(times)} months)")

    print("2. Converting K -> °C and computing monthly climatology ...")
    temp_c = t2m.values - 273.15

    months = np.array([np.datetime64(t, "M").astype(int) % 12 + 1 for t in times])

    lats = ds["latitude"].values
    lons = ds["longitude"].values
    nlat, nlon = len(lats), len(lons)
    out = np.full((12, nlat, nlon), np.nan, dtype=np.float32)

    for m in range(1, 13):
        idx = months == m
        out[m - 1] = np.nanmean(temp_c[idx], axis=0).astype(np.float32)
        mean_val = float(np.nanmean(out[m - 1]))
        print(f"   month {m:2d}: {idx.sum():3d} years, global mean {mean_val:+.1f} °C")

    # ERA5 longitudes are 0..359.75 — shift to -180..179.75
    if lons[0] >= 0 and lons[-1] > 180:
        print("3. Shifting longitude from 0-360 to -180/180 ...")
        shift = nlon // 2  # 720 for 1440-point grid
        lons = np.where(lons >= 180, lons - 360, lons)
        lons = np.roll(lons, shift)
        out = np.roll(out, shift, axis=2)
    else:
        print("3. Longitude already in -180/180 range")

    print(f"   lat: {lats[0]:.2f} to {lats[-1]:.2f}")
    print(f"   lon: {lons[0]:.2f} to {lons[-1]:.2f}")

    ds.close()

    print("4. Saving NetCDF ...")
    out_ds = xr.Dataset(
        {"temperature_2m_mean": (["month", "latitude", "longitude"], out)},
        coords={
            "month": np.arange(1, 13),
            "latitude": lats.astype(np.float32),
            "longitude": lons.astype(np.float32),
        },
    )
    out_ds["temperature_2m_mean"].attrs = {
        "units": "degC",
        "long_name": "Monthly mean 2m air temperature",
        "source": "ERA5 monthly averaged reanalysis, 2m temperature, 0.25 deg",
    }
    out_ds.to_netcdf(OUTPUT_NC, engine="h5netcdf")
    size_mb = OUTPUT_NC.stat().st_size / (1024 * 1024)
    print(f"   saved: {OUTPUT_NC.name} ({size_mb:.1f} MB)")
    print("Done!")


if __name__ == "__main__":
    input_file = Path(sys.argv[1]) if len(sys.argv) > 1 else PROJECT_ROOT / DEFAULT_INPUT
    build(input_file)
