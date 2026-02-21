from __future__ import annotations

from fastapi.testclient import TestClient


class TestHealthEndpoint:
    def test_health_ok(self, client: TestClient) -> None:
        resp = client.get("/api/health")
        assert resp.status_code == 200
        body = resp.json()
        assert body["status"] == "ok"
        assert "model_version" in body


class TestMethodologyEndpoint:
    def test_returns_all_fields(self, client: TestClient) -> None:
        resp = client.get("/api/methodology")
        assert resp.status_code == 200
        body = resp.json()
        assert "model_version" in body
        assert "equations" in body
        assert "constants" in body
        assert "fitzpatrick_table" in body
        assert "exposure_presets" in body
        assert "encoding" in body
        assert "disclaimer" in body

    def test_fitzpatrick_has_six_types(self, client: TestClient) -> None:
        body = client.get("/api/methodology").json()
        assert len(body["fitzpatrick_table"]) == 6


class TestEstimateEndpoint:
    def test_basic_estimate(self, client: TestClient) -> None:
        resp = client.get(
            "/api/estimate",
            params={"lat": 0, "lon": 0, "month": 7, "skin_type": 2, "iu": 1000, "coverage": 0.25},
        )
        assert resp.status_code == 200
        body = resp.json()
        assert "inputs" in body
        assert "intermediate" in body
        assert "outputs" in body
        assert "constants_used" in body
        assert body["outputs"]["is_infinite"] is False
        assert body["outputs"]["minutes_required"] is not None

    def test_preset_coverage(self, client: TestClient) -> None:
        resp = client.get(
            "/api/estimate",
            params={"lat": 0, "lon": 0, "month": 1, "skin_type": 1, "coverage_preset": "swimsuit"},
        )
        assert resp.status_code == 200
        assert resp.json()["inputs"]["coverage"] == 0.85

    def test_invalid_preset(self, client: TestClient) -> None:
        resp = client.get(
            "/api/estimate",
            params={"lat": 0, "lon": 0, "month": 1, "skin_type": 1, "coverage_preset": "naked"},
        )
        assert resp.status_code == 400

    def test_high_latitude_winter_infinite(self, client: TestClient) -> None:
        resp = client.get(
            "/api/estimate",
            params={"lat": 89, "lon": 0, "month": 12, "skin_type": 6, "iu": 2000, "coverage": 0.05},
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["outputs"]["is_infinite"] is True

    def test_invalid_params(self, client: TestClient) -> None:
        resp = client.get("/api/estimate", params={"lat": 0, "lon": 0, "month": 13, "skin_type": 1})
        assert resp.status_code == 422


class TestBaseTileEndpoint:
    def test_returns_png(self, client: TestClient) -> None:
        resp = client.get("/api/base_tiles/0/0/0.png", params={"month": 1})
        assert resp.status_code == 200
        assert resp.headers["content-type"] == "image/png"
        assert resp.content[:8] == b"\x89PNG\r\n\x1a\n"

    def test_cache_header(self, client: TestClient) -> None:
        resp = client.get("/api/base_tiles/0/0/0.png", params={"month": 6})
        assert "max-age=86400" in resp.headers.get("cache-control", "")

    def test_invalid_zoom(self, client: TestClient) -> None:
        resp = client.get("/api/base_tiles/11/0/0.png", params={"month": 1})
        assert resp.status_code == 400

    def test_missing_month(self, client: TestClient) -> None:
        resp = client.get("/api/base_tiles/0/0/0.png")
        assert resp.status_code == 422

    def test_tile_out_of_range(self, client: TestClient) -> None:
        resp = client.get("/api/base_tiles/1/3/0.png", params={"month": 1})
        assert resp.status_code == 400
