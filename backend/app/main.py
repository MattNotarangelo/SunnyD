from __future__ import annotations

import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path
from typing import AsyncIterator

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .config import (
    ENCODING_SCALE_BIN,
    MODEL_VERSION,
    NETCDF_FILENAME,
    TEMP_ENCODING_SCALE_BIN,
    TEMP_NETCDF_FILENAME,
    TEMP_OFFSET,
)
from .routers import estimate, health, methodology, tiles
from .services.provider_temis import ProviderTEMIS
from .services.provider_temperature import ProviderTemperature
from .services.tile_service import TileService

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
log = logging.getLogger(__name__)

_backend_dir = Path(__file__).resolve().parent.parent
DATA_DIR = Path(os.environ.get("SUNNYD_DATA_DIR", str(_backend_dir.parent)))
CACHE_DIR = Path(os.environ.get("SUNNYD_CACHE_DIR", str(_backend_dir / "data_cache")))
CORS_ORIGINS = os.environ.get("SUNNYD_CORS_ORIGINS", "*")


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    # UV data
    nc_path = DATA_DIR / NETCDF_FILENAME
    if not nc_path.exists():
        raise FileNotFoundError(
            f"TEMIS NetCDF not found at {nc_path}. "
            "Run data.ipynb to generate uvdvcclim_world_monthly.nc."
        )
    provider = ProviderTEMIS(nc_path)
    estimate.init_provider(provider)
    tile_svc = TileService(provider, CACHE_DIR / "uv", encoding_scale=ENCODING_SCALE_BIN)
    tiles.init_tile_service(tile_svc)

    # Temperature data
    temp_path = DATA_DIR / TEMP_NETCDF_FILENAME
    if not temp_path.exists():
        log.warning(
            "Temperature NetCDF not found at %s — weather-adjusted mode will be unavailable. "
            "Run scripts/build_temperature_nc.py to generate it.",
            temp_path,
        )
    else:
        temp_provider = ProviderTemperature(temp_path)
        estimate.init_temp_provider(temp_provider)
        temp_tile_svc = TileService(
            temp_provider,
            CACHE_DIR / "temp",
            encoding_scale=TEMP_ENCODING_SCALE_BIN,
            encoding_offset=TEMP_OFFSET,
        )
        tiles.init_temp_tile_service(temp_tile_svc)

    log.info("SunnyD backend v%s ready", MODEL_VERSION)
    yield


_disable_docs = os.environ.get("SUNNYD_DISABLE_DOCS", "").lower() in ("1", "true", "yes")

app = FastAPI(
    title="SunnyD API",
    description="Global Vitamin D Sun Exposure Estimator",
    version=MODEL_VERSION,
    lifespan=lifespan,
    docs_url=None if _disable_docs else "/docs",
    redoc_url=None if _disable_docs else "/redoc",
    openapi_url=None if _disable_docs else "/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in CORS_ORIGINS.split(",")],
    allow_methods=["GET"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def _unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    log.exception("Unhandled exception on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )


app.include_router(health.router)
app.include_router(methodology.router)
app.include_router(estimate.router)
app.include_router(tiles.router)
