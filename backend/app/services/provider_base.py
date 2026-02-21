from __future__ import annotations

from abc import ABC, abstractmethod

import numpy as np
from numpy.typing import NDArray


class ProviderBase(ABC):
    """Abstract base for UV dose data providers.

    All dose values are returned in J/m²/day.
    """

    @abstractmethod
    def get_monthly_dose(self, month: int, lat: float, lon: float) -> float:
        """Return H_D_month (J/m²/day) for a single point.

        Returns NaN when no data is available.
        """

    @abstractmethod
    def get_tile_data(
        self,
        month: int,
        lat_min: float,
        lat_max: float,
        lon_min: float,
        lon_max: float,
        height: int,
        width: int,
    ) -> NDArray[np.float32]:
        """Return a (height, width) array of H_D_month (J/m²/day).

        Samples the grid over the given bounding box.  Pixels outside data
        coverage are NaN.
        """

    @abstractmethod
    def latitudes(self) -> NDArray[np.float32]:
        """Return the 1-D latitude coordinate array."""

    @abstractmethod
    def longitudes(self) -> NDArray[np.float32]:
        """Return the 1-D longitude coordinate array."""
