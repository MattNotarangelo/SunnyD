from __future__ import annotations

import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path
from typing import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import MODEL_VERSION, NETCDF_FILENAME
from .routers import estimate, health, methodology, tiles
from .services.provider_base import ProviderBase
from .services.provider_sample import ProviderSample
from .services.provider_temis import ProviderTEMIS
from .services.tile_service import TileService

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
log = logging.getLogger(__name__)

_backend_dir = Path(__file__).resolve().parent.parent
DATA_DIR = Path(os.environ.get("SUNNYD_DATA_DIR", str(_backend_dir.parent)))
CACHE_DIR = Path(os.environ.get("SUNNYD_CACHE_DIR", str(_backend_dir / "data_cache")))


def _select_provider() -> ProviderBase:
    nc_path = DATA_DIR / NETCDF_FILENAME
    if nc_path.exists():
        log.info("TEMIS NetCDF found at %s", nc_path)
        return ProviderTEMIS(nc_path)
    log.warning("TEMIS NetCDF not found at %s — falling back to sample provider", nc_path)
    return ProviderSample()


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    provider = _select_provider()
    estimate.init_provider(provider)
    tile_svc = TileService(provider, CACHE_DIR)
    tiles.init_tile_service(tile_svc)
    log.info("SunnyD backend v%s ready", MODEL_VERSION)
    yield


app = FastAPI(
    title="SunnyD API",
    description="Global Vitamin D Sun Exposure Estimator",
    version=MODEL_VERSION,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(methodology.router)
app.include_router(estimate.router)
app.include_router(tiles.router)
