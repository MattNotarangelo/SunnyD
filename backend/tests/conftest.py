from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.routers import estimate, tiles
from app.services.provider_sample import ProviderSample
from app.services.tile_service import TileService


@pytest.fixture(scope="session")
def sample_provider() -> ProviderSample:
    return ProviderSample()


@pytest.fixture(scope="session")
def client(sample_provider: ProviderSample, tmp_path_factory: pytest.TempPathFactory) -> TestClient:
    estimate.init_provider(sample_provider)
    cache_dir = tmp_path_factory.mktemp("tile_cache")
    tile_svc = TileService(sample_provider, cache_dir)
    tiles.init_tile_service(tile_svc)
    return TestClient(app)
