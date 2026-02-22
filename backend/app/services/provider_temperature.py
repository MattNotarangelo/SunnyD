from __future__ import annotations

import logging
from pathlib import Path

import numpy as np
import xarray as xr
from numpy.typing import NDArray

from .provider_base import ProviderBase

log = logging.getLogger(__name__)


class ProviderTemperature(ProviderBase):
    """Loads the preprocessed monthly temperature NetCDF and serves values in °C."""

    def __init__(self, nc_path: Path) -> None:
        log.info("Loading temperature data from %s", nc_path)
        self._ds = xr.open_dataset(nc_path, engine="h5netcdf")
        self._temp = self._ds["temperature_2m_mean"]
        self._lats: NDArray[np.float32] = self._ds["latitude"].values
        self._lons: NDArray[np.float32] = self._ds["longitude"].values
        log.info(
            "Temperature data loaded: %d months, %d lats, %d lons",
            self._temp.sizes["month"],
            len(self._lats),
            len(self._lons),
        )

    # ------------------------------------------------------------------

    def get_monthly_dose(self, month: int, lat: float, lon: float) -> float:
        """Return temperature in °C for a single point (reuses ProviderBase interface)."""
        val = float(
            self._temp.sel(month=month, latitude=lat, longitude=lon, method="nearest")
        )
        if np.isnan(val):
            return float("nan")
        return val

    # ------------------------------------------------------------------

    def get_tile_data(
        self,
        month: int,
        target_lats: NDArray[np.float32],
        target_lons: NDArray[np.float32],
    ) -> NDArray[np.float32]:
        slice_da = self._temp.sel(month=month)
        sampled = slice_da.sel(
            latitude=xr.DataArray(target_lats, dims="y"),
            longitude=xr.DataArray(target_lons, dims="x"),
            method="nearest",
        )
        return sampled.values.astype(np.float32)

    # ------------------------------------------------------------------

    def latitudes(self) -> NDArray[np.float32]:
        return self._lats

    def longitudes(self) -> NDArray[np.float32]:
        return self._lons
