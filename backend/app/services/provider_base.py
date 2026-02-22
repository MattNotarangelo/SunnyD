from __future__ import annotations

from abc import ABC, abstractmethod

import numpy as np
from numpy.typing import NDArray


class ProviderBase(ABC):
    """Abstract base for gridded data providers."""

    @abstractmethod
    def get_monthly_dose(self, month: int, lat: float, lon: float) -> float:
        """Return a single-point value for the given location.

        Returns NaN when no data is available.
        """

    @abstractmethod
    def get_tile_data(
        self,
        month: int,
        target_lats: NDArray[np.float32],
        target_lons: NDArray[np.float32],
    ) -> NDArray[np.float32]:
        """Return a (height, width) array sampled at the given lat/lon arrays.

        target_lats has shape (height,), target_lons has shape (width,).
        Pixels outside data coverage are NaN.
        """

    @abstractmethod
    def latitudes(self) -> NDArray[np.float32]:
        """Return the 1-D latitude coordinate array."""

    @abstractmethod
    def longitudes(self) -> NDArray[np.float32]:
        """Return the 1-D longitude coordinate array."""
