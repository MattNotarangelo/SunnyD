from __future__ import annotations

import logging
import math

import numpy as np
from numpy.typing import NDArray

from .provider_base import ProviderBase

log = logging.getLogger(__name__)


class ProviderSample(ProviderBase):
    """Generates synthetic UV dose data so the app runs without a TEMIS file.

    Produces a latitude-and-season dependent cosine pattern that roughly
    mimics real-world vitamin-D UV dose distribution (J/m²/day).
    """

    PEAK_DOSE_J = 12_000.0  # peak at equator, summer solstice
    LAT_STEP = 0.25
    LON_STEP = 0.25

    def __init__(self) -> None:
        log.warning("Using SAMPLE data provider — results are synthetic")
        self._lats = np.arange(-89.875, 90.0, self.LAT_STEP, dtype=np.float32)
        self._lons = np.arange(-179.875, 180.0, self.LON_STEP, dtype=np.float32)

    def _dose_at(self, month: int, lat: float) -> float:
        """Simple cosine model: dose depends on latitude and month."""
        lat_factor = math.cos(math.radians(lat))
        # Month 1=Jan … 12=Dec.  Peak in northern hemisphere summer (month 7).
        season_angle = 2.0 * math.pi * (month - 1) / 12.0
        hemisphere_sign = 1.0 if lat >= 0 else -1.0
        season_factor = 0.5 + 0.5 * math.cos(season_angle - math.pi) * hemisphere_sign
        dose = self.PEAK_DOSE_J * lat_factor * season_factor
        return max(dose, 0.0)

    # ------------------------------------------------------------------

    def get_monthly_dose(self, month: int, lat: float, lon: float) -> float:
        return self._dose_at(month, lat)

    def get_tile_data(
        self,
        month: int,
        target_lats: NDArray[np.float32],
        target_lons: NDArray[np.float32],
    ) -> NDArray[np.float32]:
        height = len(target_lats)
        width = len(target_lons)
        out = np.empty((height, width), dtype=np.float32)
        for i, lat in enumerate(target_lats):
            out[i, :] = self._dose_at(month, float(lat))
        return out

    def latitudes(self) -> NDArray[np.float32]:
        return self._lats

    def longitudes(self) -> NDArray[np.float32]:
        return self._lons
