#!/usr/bin/env python3
"""Download the TEMIS UV climatology and aggregate to monthly means.

Downloads the daily UV dose climatology NetCDF from the TEMIS/KNMI archive,
then groups the 365 daily records into 12 monthly means and saves the result.

Source: TEMIS UV radiation — Daily UV dose climatology (world)
        https://www.temis.nl/uvradiation/UVarchive/uvdose.html
Resolution: 0.25° x 0.25°, global (land only)
Licence: https://www.temis.nl/general/datapolicy.php

Output: uvdvcclim_world_monthly.nc  (12 months × 720 lat × 1440 lon)

Usage:
    python scripts/1_download_uv.py
"""

from __future__ import annotations

import urllib.request
from pathlib import Path

import xarray as xr

PROJECT_ROOT = Path(__file__).resolve().parent.parent

RAW_NC = PROJECT_ROOT / "uvdvcclim_world.nc"
OUT_NC = PROJECT_ROOT / "uvdvcclim_world_monthly.nc"

URL = "https://www.temis.nl/uvradiation/v2.0/nc/clim/uvdvcclim_world.nc"


def download() -> None:
    if RAW_NC.exists():
        size_mb = RAW_NC.stat().st_size / (1024 * 1024)
        print(f"1. Raw file already exists: {RAW_NC.name} ({size_mb:.0f} MB)")
    else:
        print(f"1. Downloading {RAW_NC.name} ...")
        print(f"   URL: {URL}")
        urllib.request.urlretrieve(URL, RAW_NC)
        size_mb = RAW_NC.stat().st_size / (1024 * 1024)
        print(f"   Downloaded ({size_mb:.0f} MB)")


def aggregate() -> None:
    print(f"2. Opening {RAW_NC.name} ...")
    ds = xr.open_dataset(RAW_NC, group="PRODUCT")
    print(f"   dims: {dict(ds.sizes)}")

    print("3. Aggregating daily → monthly means ...")
    ds_monthly = ds.groupby(ds["date_month"].rename("month")).mean(dim="days")
    print(f"   result dims: {dict(ds_monthly.sizes)}")

    print(f"4. Saving {OUT_NC.name} ...")
    ds_monthly.to_netcdf(OUT_NC)
    size_mb = OUT_NC.stat().st_size / (1024 * 1024)
    print(f"   Saved ({size_mb:.1f} MB)")

    ds.close()
    print("Done!")


def main() -> None:
    if OUT_NC.exists():
        size_mb = OUT_NC.stat().st_size / (1024 * 1024)
        print(f"Output already exists: {OUT_NC.name} ({size_mb:.1f} MB)")
        print("Delete it to regenerate.")
        return

    download()
    aggregate()


if __name__ == "__main__":
    main()
