from __future__ import annotations

import logging
from pathlib import Path

import numpy as np
import xarray as xr
from numpy.typing import NDArray

from .provider_base import ProviderBase

log = logging.getLogger(__name__)

KJ_TO_J = 1000.0


class ProviderTEMIS(ProviderBase):
    """Loads the preprocessed monthly TEMIS NetCDF and serves dose values."""

    def __init__(self, nc_path: Path) -> None:
        log.info("Loading TEMIS data from %s", nc_path)
        self._ds = xr.open_dataset(nc_path, engine="h5netcdf")
        # uvd_clear_mean is (month, latitude, longitude) in kJ/m²/day
        self._dose = self._ds["uvd_clear_mean"]
        self._lats: NDArray[np.float32] = self._ds["latitude"].values
        self._lons: NDArray[np.float32] = self._ds["longitude"].values
        log.info(
            "TEMIS data loaded: %d months, %d lats, %d lons",
            self._dose.sizes["month"],
            len(self._lats),
            len(self._lons),
        )

    # ------------------------------------------------------------------

    def get_monthly_dose(self, month: int, lat: float, lon: float) -> float:
        val = float(
            self._dose.sel(month=month, latitude=lat, longitude=lon, method="nearest")
        )
        if np.isnan(val):
            return float("nan")
        return val * KJ_TO_J

    # ------------------------------------------------------------------

    def get_tile_data(
        self,
        month: int,
        target_lats: NDArray[np.float32],
        target_lons: NDArray[np.float32],
    ) -> NDArray[np.float32]:
        slice_da = self._dose.sel(month=month)
        sampled = slice_da.sel(
            latitude=xr.DataArray(target_lats, dims="y"),
            longitude=xr.DataArray(target_lons, dims="x"),
            method="nearest",
        )
        arr: NDArray[np.float32] = sampled.values.astype(np.float32)
        arr *= KJ_TO_J
        return arr

    # ------------------------------------------------------------------

    def latitudes(self) -> NDArray[np.float32]:
        return self._lats

    def longitudes(self) -> NDArray[np.float32]:
        return self._lons
